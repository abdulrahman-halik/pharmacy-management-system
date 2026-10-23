# Phase 6: High-Speed POS Terminal & Smart Checkout Engine

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 6  
**Architecture Layer:** Counter Dispensing, Real-Time Checkout, Thermal Printing & WhatsApp Delivery  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8 (Pessimistic Locks), Redis 7, React 18, Zustand, BullMQ  
**Compliance Standard:** NMRA Receipt Batch & Expiry Printing Mandate, ESC/POS Thermal Standards

---

## 1. Executive Summary & Scope

Phase 6 delivers the point-of-sale (POS) terminal for the enterprise pharmacy management system. In high-volume retail and hospital pharmacies, speed and clinical accuracy are equally critical. Cashiers and dispensers process hundreds of patient queues daily, requiring a keyboard-driven interface, instant barcode scanning, multi-tier packaging selection, automated FEFO allocation, and split payments. Crucially, the checkout transaction is completely atomic: under heavy concurrency, multiple cashiers drawing down the same medicine batch will never oversell or create negative balances.

### In-Scope Deliverables
1. **Keyboard-First POS Terminal UI:**
   - Fullscreen layout optimized for standard 1080p and 1366x768 retail displays.
   - Dedicated physical keyboard shortcut hooks: `F2` (Search Medicine), `F4` (Patient Lookup), `F8` (Checkout/Pay), `F9` (Hold Cart), `Esc` (Clear).
   - USB Barcode Scanner wedge listener automatically incrementing cart items upon continuous scans.
   - Parked cart engine storing up to 10 held customer baskets in memory.
2. **Dynamic Multi-Tier Pricing & Packaging Engine:**
   - On-the-fly packaging tier selector per line item: Carton, Box, Packet, or Unit.
   - Real-time FEFO batch preview displaying the exact batch number and expiration date that will be dispensed.
   - Deterministic financial calculation pipeline: Gross Price -> Line Discount -> Proportional Bill Discount -> Tax (VAT/SSCL) -> Loyalty Points Deduction -> Cash Rounding (`round_off` to nearest rupee).
3. **Atomic Concurrency-Safe Checkout (`POST /pos/checkout`):**
   - Single TypeORM transaction with ordered pessimistic write locking (`SELECT ... FOR UPDATE ORDER BY batch_id ASC`) preventing database deadlocks.
   - Atomically decrements batch quantities, writes `sale_item_allocations`, appends immutable `stock_movements`, logs tender entries in `cash_ledger_entries`, and credits loyalty points.
   - Idempotency-Key header support preventing accidental double-charges during network re-transmissions.
4. **Split Payments & Customer Credit:**
   - Multi-tender split capability: Cash (with exact Sri Lankan Rupee change calculation), Card, Bank Transfer, and Customer Store Credit (capped at customer's credit limit).
5. **ESC/POS Thermal Receipt & WhatsApp Dispatch:**
   - 80mm ESC/POS thermal receipt formatting featuring configurable Pharmacy store header, invoice number, cashier ID, itemized batch numbers and expiry dates (statutory legal requirement), tax breakdown, and change.
   - Asynchronous WhatsApp Cloud API / Twilio worker dispatching digital receipts via BullMQ.

### Prerequisites & Dependencies
- **Phase 3 Deliverables:** Medicine master data and packaging conversion math.
- **Phase 4 Deliverables:** Batch tracking, immutable ledger, and `allocateFefo()` service.
- **Phase 5 Deliverables:** Customer credit limits, loyalty points, and prescription approval checks.

### Downstream Outputs
- Real-time sales transactions feeding the **Phase 8 (Cashbook & Day Close)**.
- Historical sales data powering **Phase 10 (Reports & Analytics)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Sale Invoice Entity (`apps/api/src/modules/sales/entities/sale.entity.ts`)
```typescript
import { Entity, Column, Index, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { SaleItem } from './sale-item.entity';

export enum PaymentMethodType {
  CASH = 'CASH',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
  LOYALTY_POINTS = 'LOYALTY_POINTS',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  REFUNDED_PARTIAL = 'REFUNDED_PARTIAL',
  REFUNDED_FULL = 'REFUNDED_FULL',
  VOIDED = 'VOIDED',
}

@Entity('sales')
export class Sale extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'invoice_number', type: 'varchar', length: 40 })
  invoiceNumber: string; // e.g. "INV-202610-00104"

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'customer_id', type: 'varchar', length: 64, nullable: true })
  customerId?: string;

  @Column({ name: 'cashier_user_id', type: 'varchar', length: 64 })
  cashierUserId: string;

  @Column({ name: 'subtotal_lkr', type: 'decimal', precision: 12, scale: 2 })
  subtotalLkr: number;

  @Column({ name: 'discount_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  discountLkr: number;

  @Column({ name: 'tax_vat_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxVatLkr: number;

  @Column({ name: 'tax_sscl_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxSsclLkr: number;

  @Column({ name: 'loyalty_redeemed_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  loyaltyRedeemedLkr: number;

  @Column({ name: 'round_off_lkr', type: 'decimal', precision: 6, scale: 2, default: 0.0 })
  roundOffLkr: number; // Sri Lankan Rupee cash rounding adjustment

  @Column({ name: 'grand_total_lkr', type: 'decimal', precision: 12, scale: 2 })
  grandTotalLkr: number;

  @Column({ name: 'paid_amount_lkr', type: 'decimal', precision: 12, scale: 2 })
  paidAmountLkr: number;

  @Column({ name: 'change_given_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  changeGivenLkr: number;

  @Column({ type: 'json' })
  splitPayments: Array<{ method: PaymentMethodType; amount: number; reference?: string }>;

  @Column({ type: 'enum', enum: SaleStatus, default: SaleStatus.COMPLETED })
  status: SaleStatus;

  @Column({ name: 'prescription_id', type: 'varchar', length: 64, nullable: true })
  prescriptionId?: string;

  @Index({ unique: true })
  @Column({ name: 'idempotency_key', type: 'varchar', length: 128, nullable: true })
  idempotencyKey?: string;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];
}
```

#### Sale Item & Batch Allocation Entities (`apps/api/src/modules/sales/entities/sale-item.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Sale } from './sale.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PackagingLevel } from '../../medicines/entities/medicine-price-override.entity';
import { SaleItemAllocation } from './sale-item-allocation.entity';

@Entity('sale_items')
export class SaleItem extends BaseAppEntity {
  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'sale_id', type: 'varchar', length: 64 })
  saleId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ name: 'packaging_level', type: 'enum', enum: PackagingLevel, default: PackagingLevel.UNIT })
  packagingLevel: PackagingLevel;

  @Column({ name: 'quantity_sold', type: 'int' })
  quantitySold: number; // In the chosen packaging tier

  @Column({ name: 'total_base_units', type: 'int' })
  totalBaseUnits: number; // Converted to integer base units (tablets)

  @Column({ name: 'unit_price_lkr', type: 'decimal', precision: 12, scale: 2 })
  unitPriceLkr: number;

  @Column({ name: 'total_price_lkr', type: 'decimal', precision: 12, scale: 2 })
  totalPriceLkr: number;

  @OneToMany(() => SaleItemAllocation, (alloc) => alloc.saleItem, { cascade: true })
  allocations: SaleItemAllocation[];
}
```

#### Batch Allocation Entity (`apps/api/src/modules/sales/entities/sale-item-allocation.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { SaleItem } from './sale-item.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';

@Entity('sale_item_allocations')
export class SaleItemAllocation extends BaseAppEntity {
  @ManyToOne(() => SaleItem, (item) => item.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_item_id' })
  saleItem: SaleItem;

  @Column({ name: 'sale_item_id', type: 'varchar', length: 64 })
  saleItemId: string;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber: string; // Snapshot for fast receipt generation

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date; // Snapshot for NMRA receipt compliance

  @Column({ name: 'allocated_base_units', type: 'int' })
  allocatedBaseUnits: number;

  @Column({ name: 'unit_cost_at_sale', type: 'decimal', precision: 14, scale: 4 })
  unitCostAtSale: number; // Snapshot of batch unit cost price for exact P&L accounting
}
```

---

## 3. High-Concurrency Atomic Checkout Pipeline

### 3.1 Checkout Service Architecture (`apps/api/src/modules/pos/services/pos-checkout.service.ts`)

```typescript
@Injectable()
export class PosCheckoutService {
  constructor(private dataSource: DataSource, private sequenceService: SequenceService) {}

  async checkout(dto: CheckoutDto, cashierId: string): Promise<Sale> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Idempotency Check
      if (dto.idempotencyKey) {
        const existing = await queryRunner.manager.findOne(Sale, {
          where: { idempotencyKey: dto.idempotencyKey },
          relations: ['items', 'items.allocations'],
        });
        if (existing) {
          await queryRunner.rollbackTransaction();
          return existing; // Return existing without duplicate processing
        }
      }

      // 2. Clinical Prescription Gatekeeper Check
      // If any item requires prescription, verify that prescription is approved and active
      await this.validateClinicalRequirements(queryRunner.manager, dto);

      // 3. Generate Sequential Invoice Number (e.g. INV-202610-00104)
      const invoiceNumber = await this.sequenceService.getNextInvoiceNumber(queryRunner.manager);

      // 4. Batch Allocation via FEFO with Pessimistic Write Locks
      // To prevent deadlocks, sort items by medicine ID before acquiring locks
      const sortedItems = [...dto.items].sort((a, b) => a.medicineId.localeCompare(b.medicineId));

      const saleItems: SaleItem[] = [];
      let calculatedSubtotal = 0;

      for (const itemDto of sortedItems) {
        const medicine = await queryRunner.manager.findOneOrFail(Medicine, {
          where: { id: itemDto.medicineId },
          relations: ['packaging'],
        });

        const totalBaseUnits = convertToUnits(itemDto.quantity, itemDto.packagingLevel, medicine.packaging);
        const allocations = await allocateFefo(queryRunner.manager, medicine.id, totalBaseUnits);

        // Deduct from batches and write to stock_movements
        for (const alloc of allocations) {
          await queryRunner.manager.decrement(InventoryBatch, { id: alloc.batchId }, 'quantityBaseUnits', alloc.allocatedUnits);

          // Get batch balance after deduction
          const updatedBatch = await queryRunner.manager.findOneOrFail(InventoryBatch, { where: { id: alloc.batchId } });

          // Write immutable stock movement
          const movement = queryRunner.manager.create(StockMovement, {
            medicineId: medicine.id,
            batchId: alloc.batchId,
            movementType: MovementType.SALE,
            quantityBaseUnits: -alloc.allocatedUnits,
            balanceAfter: updatedBatch.quantityBaseUnits,
            unitCostPrice: alloc.unitCostPrice,
            referenceType: 'SALE_INVOICE',
            referenceId: invoiceNumber,
            reason: `POS Dispense - Invoice ${invoiceNumber}`,
            userId: cashierId,
          });
          await queryRunner.manager.save(movement);
        }

        // Create SaleItem and Allocations
        const linePrice = itemDto.unitPriceLkr * itemDto.quantity;
        calculatedSubtotal += linePrice;

        const saleItem = queryRunner.manager.create(SaleItem, {
          medicineId: medicine.id,
          packagingLevel: itemDto.packagingLevel,
          quantitySold: itemDto.quantity,
          totalBaseUnits,
          unitPriceLkr: itemDto.unitPriceLkr,
          totalPriceLkr: linePrice,
          allocations: allocations.map((a) =>
            queryRunner.manager.create(SaleItemAllocation, {
              batchId: a.batchId,
              batchNumber: a.batchNumber,
              expiryDate: a.expiryDate,
              allocatedBaseUnits: a.allocatedUnits,
              unitCostAtSale: a.unitCostPrice,
            }),
          ),
        });
        saleItems.push(saleItem);
      }

      // 5. Financial & Tax Calculations
      const discount = dto.discountLkr || 0;
      const taxable = calculatedSubtotal - discount;
      const vat = dto.isVatApplicable ? taxable * 0.18 : 0; // 18% Sri Lankan VAT
      const sscl = dto.isSsclApplicable ? taxable * 0.025 : 0; // 2.5% SSCL
      const rawGrandTotal = taxable + vat + sscl - (dto.loyaltyRedeemedLkr || 0);
      const roundedTotal = Math.round(rawGrandTotal);
      const roundOff = roundedTotal - rawGrandTotal;

      // 6. Split Tender Validation & Cash Ledger Postings
      const totalPaid = dto.splitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid < roundedTotal) {
        throw new BadRequestException(`Insufficient payment. Total due: Rs. ${roundedTotal}, Paid: Rs. ${totalPaid}`);
      }
      const changeGiven = totalPaid - roundedTotal;

      // Record in cash ledger
      for (const payment of dto.splitPayments) {
        if (payment.method === PaymentMethodType.CREDIT) {
          if (!dto.customerId) throw new BadRequestException('Customer required for credit sales');
          await this.applyCustomerCredit(queryRunner.manager, dto.customerId, payment.amount, invoiceNumber);
        } else {
          await this.recordCashEntry(queryRunner.manager, payment, invoiceNumber, cashierId);
        }
      }

      // 7. Persist Master Sale
      const sale = queryRunner.manager.create(Sale, {
        invoiceNumber,
        customerId: dto.customerId,
        cashierUserId: cashierId,
        subtotalLkr: calculatedSubtotal,
        discountLkr: discount,
        taxVatLkr: vat,
        taxSsclLkr: sscl,
        loyaltyRedeemedLkr: dto.loyaltyRedeemedLkr || 0,
        roundOffLkr: roundOff,
        grandTotalLkr: roundedTotal,
        paidAmountLkr: totalPaid,
        changeGivenLkr: changeGiven,
        splitPayments: dto.splitPayments,
        idempotencyKey: dto.idempotencyKey,
        prescriptionId: dto.prescriptionId,
        items: saleItems,
      });

      const savedSale = await queryRunner.manager.save(sale);
      await queryRunner.commitTransaction();

      // Trigger asynchronous receipt printing and WhatsApp message
      this.dispatchBackgroundReceipts(savedSale);

      return savedSale;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
```

---

## 4. ESC/POS Thermal Receipt & WhatsApp Integration

### 4.1 80mm ESC/POS Thermal Layout Standards (Sri Lankan NMRA Requirement)
Sri Lankan law mandates that patient pharmacy bills show:
1. Pharmacy Trading Name, Registered Address, Phone Number, and NMRA Pharmacy License Number.
2. Official Tax Registration (VAT / TIN / SSCL).
3. Itemized List with: **Medicine Name**, **Packaging Level**, **Dispensed Quantity**, **Batch Number**, and **Expiry Date (MM/YY)**.
4. Financial Breakdown: Subtotal, Discount, Tax, Cash Rounding, and Change Given in LKR.

```
================================================
           [PHARMACY / STORE NAME]
       [Store Address / Branch Location]
      Tel: [Store Phone] / [Mobile Phone]
         Pharmacy License: [LIC-XXXXXX]
================================================
Invoice: INV-202610-00104     Date: 23/10/2026 18:45
Cashier: N. Perera            Customer: Walk-in
------------------------------------------------
Item                Qty   Batch/Exp        Price
------------------------------------------------
Panadol 500mg (Tab)
  10 Tablets        1 Pkt B4490 (08/28)    Rs. 150.00
Augmentin 625mg
  14 Tablets        1 Box A9102 (11/27)  Rs. 1,850.00
------------------------------------------------
Subtotal:                                Rs. 2,000.00
Bill Discount (5%):                       -Rs. 100.00
Round Off:                                   Rs. 0.00
------------------------------------------------
TOTAL DUE:                               Rs. 1,900.00
------------------------------------------------
Payment Method:
  CASH:                                  Rs. 2,000.00
  CHANGE GIVEN:                            Rs. 100.00
------------------------------------------------
         Thank you! Get well soon.
   Medicines once sold cannot be returned.
================================================
```

---

## 5. Frontend POS Terminal Workspace (`apps/web`)

### 5.1 Keyboard Shortcuts & Counter Ergonomics
- `F2`: Instant focus on Medicine Barcode/Typeahead search.
- `F4`: Opens Customer lookup / quick-add modal.
- `F8`: Focuses split-payment tender modal.
- `F9`: Parks active cart to memory shelf; creates clean basket.
- `1` to `9` (NumPad): Fast quantity multipliers.
- `Esc`: Closes modals / dismisses active prompt.

### 5.2 Parked Cart Manager (`apps/web/src/stores/posStore.ts`)
Cashiers can switch between up to 10 paused customer carts without losing entered items or selected unit tiers when a customer leaves the counter to consult a doctor.

---

## 6. Step-by-Step Implementation Task Checklist

- [ ] **Task 6.1: Database Schema & Relations**
  - Implement `Sale`, `SaleItem`, and `SaleItemAllocation` entities.
  - Add unique constraint on `idempotency_key` and index on `invoice_number`.
  - Run TypeORM migration `005_create_pos_sales_and_allocations`.
- [ ] **Task 6.2: Sequential Numbering Generator**
  - Implement atomic invoice numbering service (`INV-YYYYMM-XXXXX`).
- [ ] **Task 6.3: Concurrency-Safe Checkout Engine**
  - Implement `PosCheckoutService` with pessimistic write locks and deadlock prevention.
  - Support multi-tier packaging deductions and immutable ledger logging.
- [ ] **Task 6.4: Split Payment & Credit Validation**
  - Implement Cash, Card, Bank Transfer, and Store Credit handling with customer credit limit checks.
- [ ] **Task 6.5: ESC/POS & WhatsApp Workers**
  - Build 80mm ESC/POS thermal text generator with NMRA batch and expiry lines.
  - Implement BullMQ worker for WhatsApp digital receipt delivery.
- [ ] **Task 6.6: Keyboard-First POS Frontend Shell**
  - Build keyboard listener hooks (`usePosHotkeys`, `useBarcodeScanner`).
  - Implement Parked Carts state in Zustand (`posStore`).
  - Build High-Contrast Split Payment Modal with real-time change calculator.

---

## 7. Verification & Exit Criteria

1. **Heavy Concurrency Load Test:**
   - Setup: Single medicine batch with remaining quantity = 25 tablets.
   - Dispatch 25 simultaneous checkout requests, each purchasing 1 tablet.
   - Result: All 25 transactions succeed without deadlocks; final batch quantity is exactly `0`.
   - Dispatch 26th checkout: Fails gracefully with `400 Bad Request: Insufficient stock`.
2. **NMRA Thermal Receipt Verification:**
   - Render receipt preview for a prescription sale.
   - Check: Receipt strictly displays batch numbers and expiry dates for all line items.
3. **Idempotency Prevention:**
   - Send checkout request with `Idempotency-Key: test_key_999`.
   - Re-send exact identical request within 10 seconds.
   - Result: Second request returns original invoice payload immediately without creating duplicate sales or double-decrementing stock.
