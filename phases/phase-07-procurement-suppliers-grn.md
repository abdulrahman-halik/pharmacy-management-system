# Phase 7: Procurement, Suppliers & Goods Received Notes (GRN)

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 7  
**Architecture Layer:** Supply Chain, Purchase Orders, Batch Intake, Accounts Payable & Landed Cost Math  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8, React 18, TanStack Table  
**Compliance Standard:** NMRA Good Distribution Practice (GDP), Sri Lanka Inland Revenue Supplier Invoicing

---

## 1. Executive Summary & Scope

Phase 7 implements the procurement and supply chain pipeline for modern retail and institutional pharmacies. Retail pharmacies depend on authorized distributors (e.g., State Pharmaceuticals Corporation, multinational and local distributors) for continuous medicine replenishments. This phase automates purchase order (PO) generation, goods intake through Goods Received Notes (GRN) with batch and expiry tracking, free/bonus stock cost calculations, supplier credit management (Accounts Payable in LKR / local currency), and purchase returns.

### In-Scope Deliverables
1. **Supplier Master Registry (`suppliers`):**
   - Distributor profiles with tax IDs (TIN/VAT), Sri Lankan contact phone (+94), credit terms (e.g., 30 days net), and running outstanding payable balances in LKR.
2. **Purchase Order (PO) Lifecycle Engine (`purchase_orders`):**
   - Multi-state progression: `QUOTATION` -> `ORDERED` -> `PARTIALLY_RECEIVED` -> `RECEIVED` -> `CANCELLED`.
   - PO line items supporting supplier-specific packaging tiers (Cartons, Boxes) and agreed purchase costs.
   - Low-stock reorder automation: 1-click PO generation directly from inventory alerts.
3. **Goods Received Note (GRN) Intake Engine (`goods_received_notes`):**
   - Multi-item intake supporting PO-linked delivery or direct off-invoice purchase.
   - Per-line batch verification capturing: `batch_number`, `mfd_date`, `expiry_date`, packaging level, received count, bonus/free units, landed purchase cost, and batch MRP.
   - Duplicate invoice guard: `unique(supplier_id, supplier_invoice_number)` preventing duplicate payments.
   - Automatic batch creation or quantity incrementing in `inventory_batches` and append-only `PURCHASE` movement logging in `stock_movements`.
4. **Landed Net Unit Cost Math (Bonus Stock Absorption):**
   - When suppliers provide free units (e.g., "Buy 10 Boxes, Get 2 Free"), the net unit cost per base unit is recomputed across the total volume:  
     `Net Unit Cost = (Invoiced Price × Purchased Units) / (Purchased Units + Free Units)`.
5. **Accounts Payable & Supplier Payments:**
   - Real-time supplier statement reconciliation: `Payable Balance = Sum(GRNs) - Sum(Payments) - Sum(Return Credits)`.
   - Partial or full bill settlements allocated against specific GRN invoices with double-entry cash/bank ledger integration.
6. **Purchase Returns Workflow (`purchase_returns`):**
   - Formal returns for near-expiry, damaged, or recalled batches, debiting supplier payables and writing `PURCHASE_RETURN` stock ledger rows.
7. **Frontend Procurement Workspace:**
   - Visual Kanban pipeline for PO status tracking, rapid barcode-assisted GRN entry modal, and supplier ledger statement viewer.

### Prerequisites & Dependencies
- **Phase 3 Deliverables:** Medicine master catalogue and packaging conversion math.
- **Phase 4 Deliverables:** Batch creation service and immutable `stock_movements` ledger.

### Downstream Outputs
- Stock injected by GRN directly feeds **Phase 4 & 6 (Inventory & POS)**.
- Landed cost per batch provides the exact cost base for COGS in **Phase 8 (Profit & Loss)**.
- Supplier payments record `CASH_OUT` transactions in **Phase 8 (Cashbook)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Supplier Entity (`apps/api/src/modules/procurement/entities/supplier.entity.ts`)
```typescript
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceivedNote } from './goods-received-note.entity';

@Entity('suppliers')
export class Supplier extends BaseAppEntity {
  @Index()
  @Column({ name: 'company_name', type: 'varchar', length: 150 })
  companyName: string; // e.g., "Hemas Pharmaceuticals (Pvt) Ltd"

  @Column({ name: 'contact_person', type: 'varchar', length: 100, nullable: true })
  contactPerson?: string;

  @Column({ type: 'varchar', length: 20 })
  phone: string; // +94 format

  @Column({ type: 'varchar', length: 150, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'tax_tin_number', type: 'varchar', length: 50, nullable: true })
  taxTinNumber?: string; // Sri Lankan Tax Identification Number

  @Column({ name: 'payment_terms_days', type: 'int', default: 30 })
  paymentTermsDays: number; // e.g. 30 days credit

  @Column({ name: 'outstanding_payable_lkr', type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  outstandingPayableLkr: number; // Running balance owed in LKR

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
```

#### Purchase Order & Item Entities (`apps/api/src/modules/procurement/entities/purchase-order.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_orders')
export class PurchaseOrder extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'po_number', type: 'varchar', length: 40 })
  poNumber: string; // e.g. "PO-202610-0042"

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 64 })
  supplierId: string;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: Date;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: Date;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ name: 'total_amount_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalAmountLkr: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, { cascade: true })
  items: PurchaseOrderItem[];
}
```

#### Goods Received Note (GRN) Entity (`apps/api/src/modules/procurement/entities/goods-received-note.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceivedNoteItem } from './goods-received-note-item.entity';

export enum GrnPaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

@Entity('goods_received_notes')
@Unique('uq_supplier_invoice', ['supplierId', 'supplierInvoiceNumber'])
export class GoodsReceivedNote extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'grn_number', type: 'varchar', length: 40 })
  grnNumber: string; // e.g. "GRN-202610-0089"

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'supplier_id', type: 'varchar', length: 64 })
  supplierId: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder?: PurchaseOrder;

  @Column({ name: 'purchase_order_id', type: 'varchar', length: 64, nullable: true })
  purchaseOrderId?: string;

  @Index()
  @Column({ name: 'supplier_invoice_number', type: 'varchar', length: 80 })
  supplierInvoiceNumber: string; // Distributor's physical tax invoice number

  @Column({ name: 'received_date', type: 'date' })
  receivedDate: Date;

  @Column({ name: 'subtotal_lkr', type: 'decimal', precision: 12, scale: 2 })
  subtotalLkr: number;

  @Column({ name: 'tax_vat_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  taxVatLkr: number;

  @Column({ name: 'grand_total_lkr', type: 'decimal', precision: 12, scale: 2 })
  grandTotalLkr: number;

  @Column({ name: 'paid_amount_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  paidAmountLkr: number;

  @Column({ type: 'enum', enum: GrnPaymentStatus, default: GrnPaymentStatus.UNPAID })
  paymentStatus: GrnPaymentStatus;

  @Column({ name: 'received_by_user_id', type: 'varchar', length: 64 })
  receivedByUserId: string;

  @OneToMany(() => GoodsReceivedNoteItem, (item) => item.grn, { cascade: true })
  items: GoodsReceivedNoteItem[];
}
```

#### GRN Item Entity (`apps/api/src/modules/procurement/entities/goods-received-note-item.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { GoodsReceivedNote } from './goods-received-note.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { PackagingLevel } from '../../medicines/entities/medicine-price-override.entity';

@Entity('goods_received_note_items')
export class GoodsReceivedNoteItem extends BaseAppEntity {
  @ManyToOne(() => GoodsReceivedNote, (grn) => grn.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grn_id' })
  grn: GoodsReceivedNote;

  @Column({ name: 'grn_id', type: 'varchar', length: 64 })
  grnId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber: string;

  @Column({ name: 'mfd_date', type: 'date', nullable: true })
  mfdDate?: Date;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date;

  @Column({ name: 'packaging_level', type: 'enum', enum: PackagingLevel, default: PackagingLevel.BOX })
  packagingLevel: PackagingLevel;

  @Column({ name: 'purchased_quantity', type: 'int' })
  purchasedQuantity: number;

  @Column({ name: 'bonus_quantity', type: 'int', default: 0 })
  bonusQuantity: number; // Free units provided on promotion

  @Column({ name: 'total_received_base_units', type: 'int' })
  totalReceivedBaseUnits: number; // Total base units added to stock: (Purchased + Bonus) * Multiplier

  @Column({ name: 'purchase_price_lkr', type: 'decimal', precision: 12, scale: 2 })
  purchasePriceLkr: number; // Invoiced unit price for the chosen packaging level

  @Column({ name: 'line_total_lkr', type: 'decimal', precision: 12, scale: 2 })
  lineTotalLkr: number; // purchased_quantity * purchase_price_lkr

  @Column({ name: 'net_landed_cost_per_base_unit', type: 'decimal', precision: 14, scale: 4 })
  netLandedCostPerBaseUnit: number; // lineTotalLkr / totalReceivedBaseUnits

  @Column({ name: 'batch_mrp_per_base_unit', type: 'decimal', precision: 12, scale: 2 })
  batchMrpPerBaseUnit: number; // Maximum Retail Price in LKR
}
```

---

## 3. Landed Cost Math & Automatic Stock Intake Engine

### 3.1 Net Cost Calculation & Inventory Batch Upsert
When a GRN is committed within an atomic TypeORM transaction:
1. **Expiry Validation:** Rejects any item where `expiry_date <= received_date`.
2. **Net Unit Cost Math:**
   ```typescript
   // Example: Purchased 10 Boxes of 100 tablets @ Rs. 1,000 per Box = Rs. 10,000.
   // Bonus: 2 Free Boxes = 200 free tablets.
   // Total Base Units = (10 + 2) * 100 = 1,200 tablets.
   // Net Landed Cost = Rs. 10,000 / 1,200 = Rs. 8.3333 per tablet.
   const lineCost = itemDto.purchasePriceLkr * itemDto.purchasedQuantity;
   const totalUnits = convertToUnits(
     itemDto.purchasedQuantity + itemDto.bonusQuantity,
     itemDto.packagingLevel,
     medicine.packaging,
   );
   const netLandedCostPerBaseUnit = lineCost / totalUnits;
   ```
3. **Batch Upsert:**
   - Checks if a batch with `(medicine_id, batch_number, expiry_date)` exists.
   - If found: Increments `quantity_base_units` and re-weights unit cost via Moving Average Cost.
   - If not found: Creates new `InventoryBatch` with `status: ACTIVE`.
4. **Append Movement:** Writes `MovementType.PURCHASE` to `stock_movements` with `referenceType = 'GRN'` and `referenceId = grnNumber`.
5. **Supplier Ledger Update:** Increments `supplier.outstanding_payable_lkr` by `grn.grandTotalLkr`.

---

## 4. API Endpoints Specification

### Suppliers & Payables (`/api/v1/procurement/suppliers`)
- `GET /suppliers` -> List suppliers with search, filter, and outstanding balance summary in LKR.
- `POST /suppliers` -> Register new supplier (Validates phone and tax numbers).
- `GET /suppliers/:id/statement` -> Generates itemized account statement listing GRNs, payments, and returns.
- `POST /suppliers/:id/pay`
  - Body: `{ amountLkr: number, paymentMethod: 'BANK_TRANSFER' | 'CASH', bankAccountId?: string, reference: string, grnAllocations?: [{ grnId: string, amount: number }] }`
  - Decrements supplier outstanding payables and logs transaction to `cash_ledger_entries`.

### Purchase Orders (`/api/v1/procurement/orders`)
- `GET /procurement/orders` -> List POs with status filters (`DRAFT`, `ORDERED`, `RECEIVED`).
- `POST /procurement/orders` -> Create new PO.
- `POST /procurement/orders/from-low-stock` -> Auto-generates a draft PO containing all medicines below their reorder levels.
- `PATCH /procurement/orders/:id/status` -> Progress status (e.g. from `DRAFT` to `ORDERED`).

### Goods Received Notes (`/api/v1/procurement/grn`)
- `POST /procurement/grn`
  - Body: Validated via `CreateGrnSchema`.
  - Atomically creates GRN, validates duplicate invoice, increments batch stock, writes movement ledger, and updates payables.
- `GET /procurement/grn/:id` -> Detailed view of GRN with received batches, MRP, and landed costs.

### Purchase Returns (`/api/v1/procurement/returns`)
- `POST /procurement/returns`
  - Body: `{ supplierId: string, items: [{ batchId: string, quantityBaseUnits: number, reason: string }] }`
  - Decrements batch quantity, writes `PURCHASE_RETURN` movement, and debits supplier's payable balance.

---

## 5. Frontend Procurement Workspace (`apps/web`)

### 5.1 Components & Architecture
- **Procurement Pipeline Board (`PoKanbanBoard.tsx`):** Drag-and-drop or column view showing PO progression from Draft -> Ordered -> Partially Received -> Completed.
- **Fast GRN Entry Screen (`GrnIntakeModal.tsx`):**
  - Designed for high-speed counter intake with barcode scanner support.
  - Tabular line item entry: Search Drug -> Pick Packaging Tier -> Input Qty & Free Qty -> Input Batch & Expiry -> Live Net Unit Cost display.
- **Supplier Ledger View (`SupplierStatementModal.tsx`):** Clean statement showing all invoices, payment vouchers, and running balance in Rs.

---

## 6. Step-by-Step Implementation Task Checklist

- [ ] **Task 7.1: Entities & Relations**
  - Implement `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `GoodsReceivedNote`, `GoodsReceivedNoteItem`, and `PurchaseReturn`.
  - Add unique constraint `unique(supplier_id, supplier_invoice_number)`.
  - Run TypeORM migration `006_create_procurement_and_grn_tables`.
- [ ] **Task 7.2: Landed Cost & Stock Intake Engine**
  - Implement `GrnIntakeService` computing net landed unit costs with bonus units.
  - Integrate with `InventoryBatch` and `StockMovement` services inside single transaction.
- [ ] **Task 7.3: Purchase Order Automation**
  - Implement low-stock to PO generation service grouping medicines by primary supplier.
- [ ] **Task 7.4: Accounts Payable & Payment Allocation**
  - Implement supplier payment processing with specific GRN bill clearance and cash ledger postings.
  - Implement Purchase Return workflow for damaged or expired batches.
- [ ] **Task 7.5: Frontend Procurement Workspace**
  - Build PO Kanban view and Supplier statement viewer.
  - Build high-speed GRN entry modal with live net cost calculation.

---

## 7. Verification & Exit Criteria

1. **Landed Net Cost Calculation Test:**
   - Receive 10 Boxes of 100 tablets at Rs. 2,000 per Box (Rs. 20,000 total).
   - Add 2 Bonus Boxes (200 free tablets).
   - Total base units: 1,200 tablets.
   - Result: Net cost per base unit is stored as exactly `Rs. 16.6667` per tablet, and inventory increases by 1,200 units.
2. **Duplicate Invoice Prevention Test:**
   - Submit GRN with `supplierId = S-01` and `supplierInvoiceNumber = INV-9901`.
   - Submit second GRN with same supplier and same invoice number.
   - Result: Transaction fails with `409 Conflict: Supplier invoice number already registered`.
3. **Expired Goods Intake Gate:**
   - Attempt to intake a batch with `expiry_date` older than today.
   - Result: Request rejected with `400 Bad Request: Cannot receive expired pharmaceuticals`.
