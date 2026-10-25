import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Sale } from '../entities/sale.entity';
import { SaleItem } from '../entities/sale-item.entity';
import { SaleItemAllocation } from '../entities/sale-item-allocation.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../../inventory/entities/stock-movement.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { CustomerCreditLedger } from '../../customers/entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from '../../customers/entities/customer-loyalty-ledger.entity';
import { Prescription } from '../../prescriptions/entities/prescription.entity';
import { PrescriptionItem } from '../../prescriptions/entities/prescription-item.entity';
import { ControlledSubstanceRegister } from '../../prescriptions/entities/controlled-substance-register.entity';
import { SequenceService } from './sequence.service';
import { FefoAllocationService } from '../../inventory/services/fefo-allocation.service';
import { ReceiptGeneratorService } from './receipt-generator.service';
import { ReceiptQueueService } from './receipt-queue.service';
import {
  CheckoutInput,
  SaleQueryInput,
  convertToUnits,
  DEFAULT_VAT_RATE,
  DEFAULT_SSCL_RATE,
  PaymentMethodType,
  PrescriptionStatus,
  PrescriptionItemStatus,
  CashDirection,
  CashSourceType,
} from '@pharmacy/shared';
import { DayClose } from '../../finance/entities/day-close.entity';
import { CashLedgerEntry } from '../../finance/entities/cash-ledger-entry.entity';
import { PaymentMethod } from '../../finance/entities/payment-method.entity';

@Injectable()
export class PosCheckoutService {
  private readonly logger = new Logger(PosCheckoutService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sequenceService: SequenceService,
    private readonly fefoAllocationService: FefoAllocationService,
    private readonly receiptGeneratorService: ReceiptGeneratorService,
    private readonly receiptQueueService: ReceiptQueueService,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
  ) {}

  /**
   * High-Concurrency Atomic Checkout Transaction.
   * Acquires pessimistic locks on inventory batches via deterministic FEFO ordering.
   * Enforces zero overselling, strict clinical prescription validation, multi-tender split payment,
   * immutable ledger writes, and customer credit limits.
   */
  async checkout(dto: CheckoutInput, cashierId: string): Promise<Sale> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Day Locking Enforcement (Reject sales on locked calendar dates)
      const todayStr = new Date().toISOString().split('T')[0];
      const dayClose = await queryRunner.manager.findOne(DayClose, {
        where: { closingDate: todayStr as unknown as Date, storeId: 1 },
      });
      if (dayClose && dayClose.isLocked) {
        throw new BadRequestException(
          `Date ${todayStr} is locked by Day-Close register`,
        );
      }

      // 1. Idempotency Check
      if (dto.idempotencyKey) {
        const existing = await queryRunner.manager.findOne(Sale, {
          where: { idempotencyKey: dto.idempotencyKey },
          relations: ['items', 'items.allocations', 'customer'],
        });
        if (existing) {
          await queryRunner.rollbackTransaction();
          return existing;
        }
      }

      // 2. Fetch Prescription if attached
      let prescription: Prescription | null = null;
      if (dto.prescriptionId) {
        prescription = await queryRunner.manager.findOne(Prescription, {
          where: { id: dto.prescriptionId },
          relations: ['items', 'doctor', 'customer'],
        });
        if (!prescription) {
          throw new NotFoundException(`Prescription with ID "${dto.prescriptionId}" not found`);
        }
        if (prescription.status !== PrescriptionStatus.VERIFIED) {
          throw new BadRequestException(
            `Prescription ${prescription.rxNumber} is not verified (Status: ${prescription.status}).`,
          );
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (prescription.validUntil && prescription.validUntil < todayStr) {
          throw new BadRequestException(
            `Prescription ${prescription.rxNumber} has expired on ${prescription.validUntil}.`,
          );
        }
      }

      // 3. Sequential Invoice Number
      const invoiceNumber = await this.sequenceService.getNextInvoiceNumber(queryRunner.manager);

      // 4. Deadlock Prevention: Sort items by medicineId before acquiring pessimistic locks
      const sortedItems = [...dto.items].sort((a, b) => a.medicineId.localeCompare(b.medicineId));

      const saleItems: SaleItem[] = [];
      let calculatedSubtotal = 0;

      for (const itemDto of sortedItems) {
        const medicine = await queryRunner.manager.findOne(Medicine, {
          where: { id: itemDto.medicineId },
          relations: ['packaging'],
        });

        if (!medicine) {
          throw new NotFoundException(`Medicine with ID "${itemDto.medicineId}" not found`);
        }

        // Convert chosen packaging level to integer base units (e.g. tablets)
        let totalBaseUnits = itemDto.quantity;
        if (itemDto.packagingLevel === 'UNIT') {
          totalBaseUnits = itemDto.quantity;
        } else if (medicine.packaging) {
          totalBaseUnits = convertToUnits(
            itemDto.quantity,
            itemDto.packagingLevel,
            medicine.packaging,
          );
        } else {
          throw new BadRequestException(
            `Packaging tier "${itemDto.packagingLevel}" is not configured for medicine "${medicine.name}".`,
          );
        }

        // Clinical Prescription Gatekeeper Check
        if (medicine.requiresPrescription) {
          if (!prescription) {
            throw new BadRequestException(
              `Medicine "${medicine.name}" is Prescription-Only (POM). A verified prescription is strictly required.`,
            );
          }

          const rxItem = prescription.items?.find((pItem) => pItem.medicineId === medicine.id);
          if (!rxItem) {
            throw new BadRequestException(
              `Medicine "${medicine.name}" is not listed in Prescription ${prescription.rxNumber}.`,
            );
          }
          if (rxItem.itemStatus !== PrescriptionItemStatus.APPROVED) {
            throw new BadRequestException(
              `Prescription line for "${medicine.name}" was not approved by pharmacist (Status: ${rxItem.itemStatus}).`,
            );
          }

          // Check Refill & Quantity limit
          const maxAllowed =
            rxItem.prescribedQuantityBaseUnits *
            (1 + (rxItem.refillAllowed ? rxItem.refillsAllowedCount : 0));
          const newTotalDispensed = rxItem.dispensedQuantityBaseUnits + totalBaseUnits;

          if (newTotalDispensed > maxAllowed) {
            const remaining = maxAllowed - rxItem.dispensedQuantityBaseUnits;
            throw new BadRequestException(
              `Requested ${totalBaseUnits} units of "${medicine.name}" exceeds remaining prescription quota (${remaining} units remaining).`,
            );
          }

          // Check Refill Interval if this is a subsequent dispense
          if (rxItem.dispensedQuantityBaseUnits > 0 && rxItem.lastDispensedAt) {
            const lastDispensed = new Date(rxItem.lastDispensedAt);
            const now = new Date();
            const diffMs = now.getTime() - lastDispensed.getTime();
            const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (elapsedDays < rxItem.refillIntervalDays) {
              const daysRemaining = rxItem.refillIntervalDays - elapsedDays;
              throw new BadRequestException(
                `Refill interval for "${medicine.name}" not met (${daysRemaining} days remaining).`,
              );
            }
          }

          // Record dispensation in prescription item
          rxItem.dispensedQuantityBaseUnits += totalBaseUnits;
          if (rxItem.dispensedQuantityBaseUnits > totalBaseUnits) {
            rxItem.refillsUsed += 1;
          }
          rxItem.lastDispensedAt = new Date();
          await queryRunner.manager.save(PrescriptionItem, rxItem);
        }

        // FEFO Allocation with pessimistic write locking
        const allocations = await this.fefoAllocationService.allocateFefo(
          queryRunner.manager,
          medicine.id,
          totalBaseUnits,
        );

        // Deduct from batches and write immutable stock_movements
        const allocationEntities: SaleItemAllocation[] = [];

        for (const alloc of allocations) {
          await queryRunner.manager.decrement(
            InventoryBatch,
            { id: alloc.batchId },
            'quantityBaseUnits',
            alloc.allocatedUnits,
          );

          const updatedBatch = await queryRunner.manager.findOneOrFail(InventoryBatch, {
            where: { id: alloc.batchId },
          });

          // Write immutable stock movement
          const movement = queryRunner.manager.create(StockMovement, {
            medicineId: medicine.id,
            batchId: alloc.batchId,
            movementType: 'SALE',
            quantityBaseUnits: -alloc.allocatedUnits,
            balanceAfter: updatedBatch.quantityBaseUnits,
            unitCostPrice: alloc.unitCostPrice,
            referenceType: 'SALE_INVOICE',
            referenceId: invoiceNumber,
            reason: `POS Dispense - Invoice ${invoiceNumber}`,
            userId: cashierId,
          });
          await queryRunner.manager.save(StockMovement, movement);

          // If Controlled Substance (Schedule II / Narcotics), record into statutory register
          if (medicine.isControlledSubstance) {
            const batchSumResult = await queryRunner.manager
              .createQueryBuilder(InventoryBatch, 'b')
              .select('COALESCE(SUM(b.quantity_base_units), 0)', 'totalStock')
              .where('b.medicine_id = :medId', { medId: medicine.id })
              .andWhere('b.status = :status', { status: 'ACTIVE' })
              .getRawOne();

            const currentTotalStock = parseInt(batchSumResult?.totalStock || '0', 10);

            const regEntry = queryRunner.manager.create(ControlledSubstanceRegister, {
              medicineId: medicine.id,
              batchId: alloc.batchId,
              quantityBaseUnits: alloc.allocatedUnits,
              runningBalance: currentTotalStock,
              customerId: dto.customerId || prescription?.customerId || 'WALK-IN',
              customerNic: prescription?.customer?.nicOrPassport || 'N/A',
              doctorId: prescription?.doctorId || 'N/A',
              doctorSlmcRegNo: prescription?.doctor?.registrationNumber || 'N/A',
              prescriptionId: prescription?.id || 'N/A',
              pharmacistUserId: cashierId,
            });
            await queryRunner.manager.save(ControlledSubstanceRegister, regEntry);
          }

          allocationEntities.push(
            queryRunner.manager.create(SaleItemAllocation, {
              batchId: alloc.batchId,
              batchNumber: alloc.batchNumber,
              expiryDate: alloc.expiryDate,
              allocatedBaseUnits: alloc.allocatedUnits,
              unitCostAtSale: alloc.unitCostPrice,
            }),
          );
        }

        const linePrice = Math.round(itemDto.unitPriceLkr * itemDto.quantity * 100) / 100;
        calculatedSubtotal += linePrice;

        const saleItem = queryRunner.manager.create(SaleItem, {
          medicineId: medicine.id,
          medicine,
          packagingLevel: itemDto.packagingLevel,
          quantitySold: itemDto.quantity,
          totalBaseUnits,
          unitPriceLkr: itemDto.unitPriceLkr,
          totalPriceLkr: linePrice,
          allocations: allocationEntities,
        });

        saleItems.push(saleItem);
      }

      // 5. Financial & Tax Pipeline
      const discount = dto.discountLkr || 0;
      const taxable = Math.max(0, calculatedSubtotal - discount);
      const vat = dto.isVatApplicable ? Math.round(taxable * DEFAULT_VAT_RATE * 100) / 100 : 0;
      const sscl = dto.isSsclApplicable ? Math.round(taxable * DEFAULT_SSCL_RATE * 100) / 100 : 0;

      const loyaltyRedeemed = Math.min(
        dto.loyaltyRedeemedLkr || 0,
        taxable + vat + sscl,
      );

      const rawGrandTotal = taxable + vat + sscl - loyaltyRedeemed;
      const roundedTotal = Math.round(rawGrandTotal);
      const roundOff = Math.round((roundedTotal - rawGrandTotal) * 100) / 100;

      // 6. Split Tender & Payment Validation
      const totalPaid = Math.round(
        dto.splitPayments.reduce((sum, p) => sum + p.amount, 0) * 100,
      ) / 100;

      if (totalPaid < roundedTotal) {
        throw new BadRequestException(
          `Insufficient payment. Total due: Rs. ${roundedTotal}, Paid: Rs. ${totalPaid}`,
        );
      }

      const changeGiven = Math.max(0, Math.round((totalPaid - roundedTotal) * 100) / 100);

      // Customer Processing (Credit & Loyalty)
      let customer: Customer | null = null;
      if (dto.customerId) {
        customer = await queryRunner.manager.findOne(Customer, {
          where: { id: dto.customerId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!customer) {
          throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
        }

        // Handle Credit payment
        const creditPayment = dto.splitPayments.find((p) => p.method === 'CREDIT');
        if (creditPayment && creditPayment.amount > 0) {
          const currentCredit = Number(customer.creditBalance || 0);
          const creditLimit = Number(customer.creditLimit || 0);
          const newCreditBalance = currentCredit + creditPayment.amount;

          if (creditLimit > 0 && newCreditBalance > creditLimit) {
            throw new BadRequestException(
              `Credit transaction exceeds customer credit limit of Rs. ${creditLimit} (Current: Rs. ${currentCredit}, New: Rs. ${newCreditBalance})`,
            );
          }

          customer.creditBalance = newCreditBalance;

          const creditEntry = queryRunner.manager.create(CustomerCreditLedger, {
            customerId: customer.id,
            entryType: 'CREDIT_PURCHASE',
            amount: creditPayment.amount,
            runningBalance: newCreditBalance,
            referenceType: 'SALE_INVOICE',
            referenceId: invoiceNumber,
            notes: `POS Credit Purchase - Invoice ${invoiceNumber}`,
            recordedBy: cashierId,
          });
          await queryRunner.manager.save(CustomerCreditLedger, creditEntry);
        }

        // Handle Loyalty Redemption
        if (loyaltyRedeemed > 0) {
          customer.loyaltyPoints = Math.max(
            0,
            (customer.loyaltyPoints || 0) - Math.floor(loyaltyRedeemed),
          );

          const loyaltyEntry = queryRunner.manager.create(CustomerLoyaltyLedger, {
            customerId: customer.id,
            entryType: 'REDEEMED',
            points: -Math.floor(loyaltyRedeemed),
            runningPoints: customer.loyaltyPoints,
            referenceType: 'SALE_INVOICE',
            referenceId: invoiceNumber,
            notes: `POS Loyalty Redemption - Invoice ${invoiceNumber}`,
            recordedBy: cashierId,
          });
          await queryRunner.manager.save(CustomerLoyaltyLedger, loyaltyEntry);
        }

        // Award Loyalty Points for cash/card purchases (1 point per 100 LKR spent)
        const earnedPoints = Math.floor(roundedTotal / 100);
        if (earnedPoints > 0) {
          customer.loyaltyPoints = (customer.loyaltyPoints || 0) + earnedPoints;

          const earnedEntry = queryRunner.manager.create(CustomerLoyaltyLedger, {
            customerId: customer.id,
            entryType: 'EARNED',
            points: earnedPoints,
            runningPoints: customer.loyaltyPoints,
            referenceType: 'SALE_INVOICE',
            referenceId: invoiceNumber,
            notes: `POS Loyalty Earned - Invoice ${invoiceNumber}`,
            recordedBy: cashierId,
          });
          await queryRunner.manager.save(CustomerLoyaltyLedger, earnedEntry);
        }

        await queryRunner.manager.save(Customer, customer);
      }

      // 7. Persist Master Sale
      const sale = queryRunner.manager.create(Sale, {
        invoiceNumber,
        customerId: dto.customerId || null,
        customer: customer || undefined,
        cashierUserId: cashierId,
        subtotalLkr: calculatedSubtotal,
        discountLkr: discount,
        taxVatLkr: vat,
        taxSsclLkr: sscl,
        loyaltyRedeemedLkr: loyaltyRedeemed,
        roundOffLkr: roundOff,
        grandTotalLkr: roundedTotal,
        paidAmountLkr: totalPaid,
        changeGivenLkr: changeGiven,
        splitPayments: dto.splitPayments,
        idempotencyKey: dto.idempotencyKey || null,
        prescriptionId: dto.prescriptionId || null,
        notes: dto.notes || null,
        items: saleItems,
      });

      const savedSale = await queryRunner.manager.save(Sale, sale);

      // Record tenders in Unified Cash Ledger
      for (const split of dto.splitPayments) {
        if (split.amount > 0) {
          let pmCode = 'CASH';
          if (split.method === 'CARD') pmCode = 'VISA_MASTER';
          else if (split.method === 'BANK_TRANSFER') pmCode = 'BANK_TRANSFER';
          else if (split.method === 'CREDIT') pmCode = 'CUSTOMER_CREDIT';
          else if (split.method === 'LOYALTY_POINTS') pmCode = 'LOYALTY_POINTS';

          const pm = await queryRunner.manager.findOne(PaymentMethod, {
            where: { code: pmCode },
          });

          const ledgerEntry = queryRunner.manager.create(CashLedgerEntry, {
            storeId: 1,
            entryDate: savedSale.createdAt,
            direction: 'IN' as CashDirection,
            amountLkr: split.amount,
            paymentMethodId: pm?.id || 'pm-cash',
            sourceType: 'SALE' as CashSourceType,
            sourceId: savedSale.id,
            description: `POS Sale Receipt #${savedSale.invoiceNumber} (${split.method})`,
            userId: cashierId,
          });
          await queryRunner.manager.save(CashLedgerEntry, ledgerEntry);
        }
      }

      await queryRunner.commitTransaction();

      // 8. Trigger asynchronous background receipt generation and digital dispatch
      try {
        const receiptData = this.receiptGeneratorService.generateReceipt(savedSale);
        this.receiptQueueService.dispatchDigitalReceipt(savedSale, receiptData);
      } catch (receiptErr) {
        this.logger.error(`Failed to format background receipt: ${receiptErr}`);
      }

      return savedSale;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Queries historical sales with filters and pagination.
   */
  async findAll(query: SaleQueryInput) {
    const qb = this.saleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.customer', 'c')
      .leftJoinAndSelect('s.items', 'item')
      .leftJoinAndSelect('item.medicine', 'med')
      .leftJoinAndSelect('item.allocations', 'alloc')
      .orderBy('s.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere(
        '(s.invoiceNumber LIKE :search OR c.fullName LIKE :search OR c.phone LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.customerId) {
      qb.andWhere('s.customerId = :customerId', { customerId: query.customerId });
    }
    if (query.cashierUserId) {
      qb.andWhere('s.cashierUserId = :cashierUserId', { cashierUserId: query.cashierUserId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.startDate) {
      qb.andWhere('s.createdAt >= :startDate', { startDate: `${query.startDate} 00:00:00` });
    }
    if (query.endDate) {
      qb.andWhere('s.createdAt <= :endDate', { endDate: `${query.endDate} 23:59:59` });
    }

    qb.take(query.limit || 50).skip(query.offset || 0);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Find single sale invoice by ID or invoice number with complete line item allocations.
   */
  async findById(id: string): Promise<Sale> {
    const sale = await this.saleRepo.findOne({
      where: [{ id }, { invoiceNumber: id }],
      relations: ['customer', 'items', 'items.medicine', 'items.allocations'],
    });

    if (!sale) {
      throw new NotFoundException(`Sale transaction with ID "${id}" not found`);
    }

    return sale;
  }
}
