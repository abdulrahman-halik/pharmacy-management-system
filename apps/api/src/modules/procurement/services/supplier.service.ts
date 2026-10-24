import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { GoodsReceivedNote } from '../entities/goods-received-note.entity';
import { SupplierPayment } from '../entities/supplier-payment.entity';
import { PurchaseReturn } from '../entities/purchase-return.entity';
import {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierStatementDto,
  StatementEntryDto,
} from '@pharmacy/shared';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(GoodsReceivedNote)
    private readonly grnRepo: Repository<GoodsReceivedNote>,
    @InjectRepository(SupplierPayment)
    private readonly paymentRepo: Repository<SupplierPayment>,
    @InjectRepository(PurchaseReturn)
    private readonly returnRepo: Repository<PurchaseReturn>,
  ) {}

  async createSupplier(input: CreateSupplierInput, userId: string): Promise<Supplier> {
    const supplier = this.supplierRepo.create({
      companyName: input.companyName,
      contactPerson: input.contactPerson || null,
      phone: input.phone,
      email: input.email || null,
      address: input.address || null,
      taxTinNumber: input.taxTinNumber || null,
      paymentTermsDays: input.paymentTermsDays ?? 30,
      outstandingPayableLkr: 0.0,
      isActive: true,
      createdBy: userId,
    });

    return this.supplierRepo.save(supplier);
  }

  async getSuppliers(search?: string, isActive?: boolean): Promise<{
    suppliers: Supplier[];
    totalOutstandingPayableLkr: number;
    activeCount: number;
  }> {
    const qb = this.supplierRepo.createQueryBuilder('s');

    if (search) {
      qb.where(
        '(s.companyName LIKE :search OR s.phone LIKE :search OR s.taxTinNumber LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      qb.andWhere('s.isActive = :isActive', { isActive });
    }

    qb.orderBy('s.companyName', 'ASC');

    const suppliers = await qb.getMany();
    const totalOutstandingPayableLkr = suppliers.reduce(
      (sum, s) => sum + Number(s.outstandingPayableLkr || 0),
      0,
    );
    const activeCount = suppliers.filter((s) => s.isActive).length;

    return {
      suppliers,
      totalOutstandingPayableLkr,
      activeCount,
    };
  }

  async getSupplierById(id: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({ where: { id } });
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }
    return supplier;
  }

  async updateSupplier(id: string, input: UpdateSupplierInput, userId: string): Promise<Supplier> {
    const supplier = await this.getSupplierById(id);

    if (input.companyName !== undefined) supplier.companyName = input.companyName;
    if (input.contactPerson !== undefined) supplier.contactPerson = input.contactPerson;
    if (input.phone !== undefined) supplier.phone = input.phone;
    if (input.email !== undefined) supplier.email = input.email;
    if (input.address !== undefined) supplier.address = input.address;
    if (input.taxTinNumber !== undefined) supplier.taxTinNumber = input.taxTinNumber;
    if (input.paymentTermsDays !== undefined) supplier.paymentTermsDays = input.paymentTermsDays;
    if (input.isActive !== undefined) supplier.isActive = input.isActive;
    supplier.updatedBy = userId;

    return this.supplierRepo.save(supplier);
  }

  /**
   * Generates a comprehensive supplier ledger statement, itemizing all GRN invoices (debits),
   * payments (credits), and purchase returns (credits) with accurate running balance.
   */
  async getStatement(
    supplierId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SupplierStatementDto> {
    const supplier = await this.getSupplierById(supplierId);

    const [grns, payments, returns] = await Promise.all([
      this.grnRepo.find({
        where: { supplierId },
        order: { receivedDate: 'ASC', createdAt: 'ASC' },
      }),
      this.paymentRepo.find({
        where: { supplierId },
        order: { paymentDate: 'ASC', createdAt: 'ASC' },
      }),
      this.returnRepo.find({
        where: { supplierId },
        order: { returnDate: 'ASC', createdAt: 'ASC' },
      }),
    ]);

    type UnifiedTx = {
      id: string;
      date: string;
      createdAt: Date;
      type: 'GRN_INVOICE' | 'PAYMENT' | 'PURCHASE_RETURN';
      referenceNumber: string;
      description: string;
      debitLkr: number;
      creditLkr: number;
    };

    const allTx: UnifiedTx[] = [];

    for (const g of grns) {
      allTx.push({
        id: g.id,
        date: typeof g.receivedDate === 'string' ? g.receivedDate : g.receivedDate.toISOString().slice(0, 10),
        createdAt: g.createdAt,
        type: 'GRN_INVOICE',
        referenceNumber: g.grnNumber,
        description: `GRN Intake (Inv #${g.supplierInvoiceNumber})`,
        debitLkr: Number(g.grandTotalLkr),
        creditLkr: 0,
      });
    }

    for (const p of payments) {
      allTx.push({
        id: p.id,
        date: typeof p.paymentDate === 'string' ? p.paymentDate : p.paymentDate.toISOString().slice(0, 10),
        createdAt: p.createdAt,
        type: 'PAYMENT',
        referenceNumber: p.paymentNumber,
        description: `Payment (${p.paymentMethod} - ${p.reference || 'N/A'})`,
        debitLkr: 0,
        creditLkr: Number(p.amountLkr),
      });
    }

    for (const r of returns) {
      allTx.push({
        id: r.id,
        date: typeof r.returnDate === 'string' ? r.returnDate : r.returnDate.toISOString().slice(0, 10),
        createdAt: r.createdAt,
        type: 'PURCHASE_RETURN',
        referenceNumber: r.returnNumber,
        description: `Purchase Return (${r.reason})`,
        debitLkr: 0,
        creditLkr: Number(r.totalRefundLkr),
      });
    }

    // Sort chronologically
    allTx.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    let running = 0;
    let openingBalanceLkr = 0;
    const entries: StatementEntryDto[] = [];

    for (const tx of allTx) {
      const isBeforeStart = startDate && tx.date < startDate;
      const isAfterEnd = endDate && tx.date > endDate;

      running += tx.debitLkr - tx.creditLkr;

      if (isBeforeStart) {
        openingBalanceLkr = running;
      } else if (!isAfterEnd) {
        entries.push({
          id: tx.id,
          date: tx.date,
          type: tx.type,
          referenceNumber: tx.referenceNumber,
          description: tx.description,
          debitLkr: tx.debitLkr,
          creditLkr: tx.creditLkr,
          runningBalanceLkr: Math.round(running * 100) / 100,
        });
      }
    }

    const totalInvoicedLkr = entries.reduce((s, e) => s + e.debitLkr, 0);
    const totalPaidLkr = entries.filter((e) => e.type === 'PAYMENT').reduce((s, e) => s + e.creditLkr, 0);
    const totalReturnedLkr = entries.filter((e) => e.type === 'PURCHASE_RETURN').reduce((s, e) => s + e.creditLkr, 0);
    const closingBalanceLkr = Math.round(running * 100) / 100;

    return {
      supplier: {
        id: supplier.id,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        taxTinNumber: supplier.taxTinNumber,
        paymentTermsDays: supplier.paymentTermsDays,
        outstandingPayableLkr: Number(supplier.outstandingPayableLkr),
        isActive: supplier.isActive,
        createdAt: supplier.createdAt.toISOString(),
        updatedAt: supplier.updatedAt.toISOString(),
      },
      startDate,
      endDate,
      openingBalanceLkr: Math.round(openingBalanceLkr * 100) / 100,
      closingBalanceLkr,
      totalInvoicedLkr: Math.round(totalInvoicedLkr * 100) / 100,
      totalPaidLkr: Math.round(totalPaidLkr * 100) / 100,
      totalReturnedLkr: Math.round(totalReturnedLkr * 100) / 100,
      entries,
    };
  }
}
