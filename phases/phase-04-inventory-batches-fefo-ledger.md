# Phase 4: Inventory, Batches & Immutable FEFO Ledger

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 4  
**Architecture Layer:** Batch Engine, FEFO Allocation, Stock Ledger & Physical Auditing  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8 (Pessimistic Locking), Redis 7, React 18, TanStack Query  
**Regulatory Standards:** NMRA Drug Batch Traceability, CDDA Good Pharmacy Practice (GPP)

---

## 1. Executive Summary & Scope

Phase 4 engineers the heart of the pharmacy inventory engine: batch-level tracking with First-Expired, First-Out (FEFO) allocation, real-time expiry risk valuation in Sri Lankan Rupees (LKR / local currency), and an immutable append-only stock movement ledger (`stock_movements`). In retail pharmacy operations, generic inventory counters that allow direct numeric editing are forbidden; every tablet increase or reduction must be tracked to an exact batch number, manufacturing date, expiry date, user ID, and movement reason.

### In-Scope Deliverables
1. **Batch Tracking System (`inventory_batches`):**
   - Precise batch accounting with manufacturing date, expiry date, landed unit cost price, retail MRP, and batch status (`ACTIVE`, `QUARANTINED`, `EXPIRED`, `DEPLETED`).
   - Composite unique constraint `(medicine_id, batch_number, expiry_date)` preventing duplicate batch registrations.
   - High-performance compound index on `(medicine_id, expiry_date ASC, status)` for instant FEFO resolution.
2. **Immutable Stock Movement Ledger (`stock_movements`):**
   - Append-only financial-grade ledger capturing every stock transition. In-place updates and deletions are strictly prohibited at the database schema and ORM levels.
   - Core Ledger Invariant: `inventory_batches.quantity_base_units == SUM(stock_movements.quantity_base_units)`.
3. **Stock Health & Expiry Risk Engine:**
   - Configurable multi-tier alert buckets: default 2-day critical expiry, 30-day, 60-day, and 90-day warning tiers.
   - Live financial cost valuation (Total LKR inventory at risk) for each expiry tier.
4. **Pharmaceutical Stock Operations:**
   - Controlled multi-item stock adjustments with mandatory audit reasons; adjustments with cost value exceeding Rs. 25,000 require Manager sign-off.
   - Physical audit sessions: Barcode-assisted counted vs. system stock comparison generating signed `AUDIT_CORRECTION` ledger entries upon reconciliation.
   - Emergency batch recall workflow: Instantly quarantine an entire batch across the system and generate a traceability report of all patients/sales who received items from that batch.
5. **Frontend Clinical Inventory Dashboard:**
   - Real-time stock health metrics, expiry watchlist, low-stock reorder triggers (with 1-click "Create PO" action), and physical audit interface.

### Prerequisites & Dependencies
- **Phase 1 Deliverables:** Monorepo architecture, base entities, and Tailwind clinical palette.
- **Phase 3 Deliverables:** Medicine master records, 4-tier packaging multiplier engine, and Sri Lankan drug seeds.

### Downstream Outputs
- FEFO batch allocation query consumed by **Phase 6 (POS Terminal)**.
- Purchase batch intake written by **Phase 7 (Procurement & GRN)**.
- Batch-specific landed cost valuation feeding COGS into **Phase 8 (Profit & Loss Engine)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Inventory Batch Entity (`apps/api/src/modules/inventory/entities/inventory-batch.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, Check } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';

export enum BatchStatus {
  ACTIVE = 'ACTIVE',
  QUARANTINED = 'QUARANTINED', // Recalled or damaged - blocked from sale
  EXPIRED = 'EXPIRED', // Past expiration date - blocked from sale
  DEPLETED = 'DEPLETED', // Zero quantity remaining
}

@Entity('inventory_batches')
@Unique('uq_med_batch_expiry', ['medicineId', 'batchNumber', 'expiryDate'])
@Check('chk_batch_qty_positive', 'quantity_base_units >= 0')
@Index('idx_fefo_lookup', ['medicineId', 'status', 'expiryDate'])
export class InventoryBatch extends BaseAppEntity {
  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber: string;

  @Column({ name: 'mfd_date', type: 'date', nullable: true })
  mfdDate?: Date;

  @Index()
  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: Date;

  @Column({ name: 'quantity_base_units', type: 'int', default: 0 })
  quantityBaseUnits: number; // Stored strictly in integer base units (tablets/vials)

  @Column({ name: 'unit_cost_price', type: 'decimal', precision: 14, scale: 4 })
  unitCostPrice: number; // In LKR per base unit (landed cost from GRN)

  @Column({ name: 'batch_mrp', type: 'decimal', precision: 12, scale: 2 })
  batchMrp: number; // Maximum Retail Price per base unit in LKR

  @Column({ name: 'supplier_id', type: 'varchar', length: 64, nullable: true })
  supplierId?: string;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.ACTIVE })
  status: BatchStatus;
}
```

#### Immutable Stock Movement Ledger Entity (`apps/api/src/modules/inventory/entities/stock-movement.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from './inventory-batch.entity';

export enum MovementType {
  OPENING = 'OPENING',
  PURCHASE = 'PURCHASE', // Inward from GRN
  SALE = 'SALE', // Outward from POS checkout
  SALE_RETURN_RESTOCK = 'SALE_RETURN_RESTOCK', // Customer return put back to inventory
  PURCHASE_RETURN = 'PURCHASE_RETURN', // Returned to supplier
  ADJUST_ADD = 'ADJUST_ADD', // Manual count correction (positive)
  ADJUST_REDUCE = 'ADJUST_REDUCE', // Manual count correction (negative)
  DAMAGE = 'DAMAGE', // Broken vial, spilled syrup
  EXPIRED_WRITEOFF = 'EXPIRED_WRITEOFF', // Disposed expired stock
  AUDIT_CORRECTION = 'AUDIT_CORRECTION', // Physical audit session reconciliation
}

@Entity('stock_movements')
@Index('idx_movement_history', ['medicineId', 'batchId', 'createdAt'])
export class StockMovement extends BaseAppEntity {
  @ManyToOne(() => Medicine, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @ManyToOne(() => InventoryBatch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId: string;

  @Column({ name: 'movement_type', type: 'enum', enum: MovementType })
  movementType: MovementType;

  @Column({ name: 'quantity_base_units', type: 'int' })
  quantityBaseUnits: number; // Signed: Positive for inward, Negative for outward

  @Column({ name: 'balance_after', type: 'int' })
  balanceAfter: number; // Snapshot of batch quantity immediately following this transaction

  @Column({ name: 'unit_cost_price', type: 'decimal', precision: 14, scale: 4 })
  unitCostPrice: number; // Valuation at time of movement

  @Column({ name: 'reference_type', type: 'varchar', length: 50, nullable: true })
  referenceType?: string; // 'SALE_INVOICE', 'GRN', 'AUDIT_SESSION', 'ADJUSTMENT'

  @Column({ name: 'reference_id', type: 'varchar', length: 64, nullable: true })
  referenceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason?: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;
}
```

#### Physical Audit Session Entity (`apps/api/src/modules/inventory/entities/stock-audit-session.entity.ts`)
```typescript
import { Entity, Column, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { StockAuditItem } from './stock-audit-item.entity';

export enum AuditStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('stock_audit_sessions')
export class StockAuditSession extends BaseAppEntity {
  @Column({ name: 'session_code', type: 'varchar', length: 32, unique: true })
  sessionCode: string; // e.g. "AUD-202610-001"

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.IN_PROGRESS })
  status: AuditStatus;

  @Column({ name: 'total_variance_cost_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  totalVarianceCostLkr: number;

  @Column({ name: 'approved_by', type: 'varchar', length: 64, nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt?: Date;

  @OneToMany(() => StockAuditItem, (item) => item.session, { cascade: true })
  items: StockAuditItem[];
}
```

---

## 3. High-Performance FEFO Allocation Algorithm

### 3.1 Allocation Logic (`apps/api/src/modules/inventory/services/fefo-allocation.service.ts`)
When POS or dispensing requires `N` base units of a medicine, FEFO automatically selects batches ordered by earliest `expiryDate`.

```typescript
export interface AllocatedBatchItem {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  allocatedUnits: number;
  unitCostPrice: number;
  batchMrp: number;
}

export async function allocateFefo(
  entityManager: EntityManager,
  medicineId: string,
  requestedUnits: number,
): Promise<AllocatedBatchItem[]> {
  // Query active, non-expired batches ordered by earliest expiry date with pessimistic lock
  const batches = await entityManager
    .createQueryBuilder(InventoryBatch, 'batch')
    .setLock('pessimistic_write')
    .where('batch.medicineId = :medicineId', { medicineId })
    .andWhere('batch.status = :status', { status: BatchStatus.ACTIVE })
    .andWhere('batch.expiryDate > CURRENT_DATE()')
    .andWhere('batch.quantityBaseUnits > 0')
    .orderBy('batch.expiryDate', 'ASC')
    .addOrderBy('batch.createdAt', 'ASC')
    .getMany();

  const totalAvailable = batches.reduce((sum, b) => sum + b.quantityBaseUnits, 0);
  if (totalAvailable < requestedUnits) {
    throw new BadRequestException(
      `Insufficient stock for medicine ID ${medicineId}. Requested: ${requestedUnits}, Available: ${totalAvailable}`,
    );
  }

  let remainingToAllocate = requestedUnits;
  const allocations: AllocatedBatchItem[] = [];

  for (const batch of batches) {
    if (remainingToAllocate <= 0) break;

    const allocQuantity = Math.min(batch.quantityBaseUnits, remainingToAllocate);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      allocatedUnits: allocQuantity,
      unitCostPrice: batch.unitCostPrice,
      batchMrp: batch.batchMrp,
    });

    remainingToAllocate -= allocQuantity;
  }

  return allocations;
}
```

---

## 4. Stock Health & Expiry Risk Valuation

### 4.1 Real-Time Risk Aggregation
The inventory service calculates stock risk across dynamic windows:
- **Critical Expiry (< 2 Days):** Immediate removal from dispensary counter; marked for return or disposal.
- **Urgent Expiry (< 30 Days):** Counter warning; priority dispensing or discount clearance.
- **Medium Expiry (< 90 Days):** Procurement freeze on reorders.
- **Healthy Stock (> 90 Days):** Standard operational stock.

```sql
-- Expiry Valuation Aggregation Query (LKR)
SELECT 
  CASE 
    WHEN expiry_date < CURRENT_DATE() THEN 'EXPIRED'
    WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 30 DAY) THEN 'EXPIRING_30'
    WHEN expiry_date <= DATE_ADD(CURRENT_DATE(), INTERVAL 90 DAY) THEN 'EXPIRING_90'
    ELSE 'HEALTHY'
  END AS risk_tier,
  COUNT(id) AS batch_count,
  SUM(quantity_base_units) AS total_units,
  SUM(quantity_base_units * unit_cost_price) AS total_cost_value_lkr
FROM inventory_batches
WHERE status = 'ACTIVE' AND quantity_base_units > 0
GROUP BY risk_tier;
```

---

## 5. API Endpoints Specification

### Batches & Stock Queries (`/api/v1/inventory`)
- `GET /inventory/batches`
  - Query Params: `medicineId`, `status`, `expiryFilter` (`all`, `30days`, `90days`, `expired`), `page`, `limit`.
- `GET /inventory/fefo-preview/:medicineId`
  - Query Param: `requestedUnits`.
  - Simulates FEFO allocation without taking locks, displaying which batches would be consumed.
- `GET /inventory/stock-health`
  - Returns count and total LKR valuation for `HEALTHY`, `EXPIRING_30`, `EXPIRING_90`, `EXPIRED`, and `OUT_OF_STOCK`.
- `GET /inventory/low-stock`
  - Lists medicines whose total active base units fall below `reorder_level`.

### Adjustments & Recalls (`/api/v1/inventory/adjustments`, `/api/v1/inventory/recall`)
- `POST /inventory/adjustments`
  - Body: `{ batchId: string, adjustmentType: 'ADD' | 'REDUCE', quantityBaseUnits: number, reason: string }`
  - Rule: If total absolute value > Rs. 25,000, requires `MANAGER` approval.
- `POST /inventory/recall`
  - Body: `{ batchId: string, reason: string }`
  - Immediately updates batch status to `QUARANTINED` and returns an audit list of all POS sales invoices containing that batch.

### Physical Audit Sessions (`/api/v1/inventory/audits`)
- `POST /inventory/audits/start` -> Opens a new stocktake session.
- `POST /inventory/audits/:id/record-count` -> Records scanned barcode and physically counted quantity.
- `POST /inventory/audits/:id/approve`
  - Restricted to `MANAGER` / `ADMIN`.
  - Reconciles variances by writing signed `AUDIT_CORRECTION` rows to `stock_movements`.

---

## 6. Frontend Inventory Workspace (`apps/web`)

### 6.1 Layout & Tabs
- **Stock Overview Tab:** Visual metric cards showing Total Stock Value (Rs.), Expiring Soon Value (Rs.), Low Stock Count, and Quarantined Batches.
- **Batch Explorer Tab:** High-contrast table with expiration countdown badges (Solid Emerald: >90d, Solid Amber: <30d, Solid Crimson: Expired).
- **Physical Audit Wizard Tab:** Split view: left side barcode scanner input; right side live variance table highlighting cost discrepancies in LKR.
- **Batch Recall Drawer:** Search by batch number, review affected customers/prescriptions, and trigger 1-click quarantine lock.

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 4.1: Database Entities & Invariant Constraints**
  - Implement `InventoryBatch`, `StockMovement`, `StockAuditSession`, and `StockAuditItem`.
  - Enforce DB constraints: `quantity_base_units >= 0` check on batches.
  - Run TypeORM migration `003_create_inventory_and_ledger_tables`.
- [ ] **Task 4.2: Immutable Stock Movement Service**
  - Build service ensuring every batch write occurs strictly within a transaction that appends a `StockMovement` entry.
  - Implement nightly reconciliation cron validating `Batch Quantity == SUM(Movements)`.
- [ ] **Task 4.3: High-Speed FEFO Allocation Engine**
  - Build `allocateFefo()` service using pessimistic write locks (`SELECT ... FOR UPDATE`).
  - Write concurrency tests verifying zero overselling when multiple threads draw down a single batch.
- [ ] **Task 4.4: Stock Health & Expiry Valuation API**
  - Implement endpoints for expiry risk tiers and LKR valuation summaries.
  - Build low-stock query with direct PO creation linkage.
- [ ] **Task 4.5: Audit & Recall Workflows**
  - Implement Physical Audit session lifecycle with manager approval gates.
  - Build Batch Recall service with customer traceability lookup.
- [ ] **Task 4.6: Frontend Inventory Dashboard**
  - Build multi-tab inventory dashboard in `apps/web/src/features/inventory/`.
  - Implement barcode scanner integration for rapid physical stocktake.

---

## 8. Verification & Exit Criteria

1. **Stock Movement Ledger Invariant Verification:**
   - Execute a multi-step sequence: Opening stock (+100) -> Sale (-20) -> Adjustment (+5) -> Sale Return (+2).
   - Invariant Check: Query `inventory_batches.quantity_base_units` and compare with `SELECT SUM(quantity_base_units) FROM stock_movements WHERE batch_id = :id`.
   - Result: Both values match exactly (`87 units`). Discrepancy = 0.
2. **Pessimistic Locking Concurrency Test:**
   - Seed batch `B-001` with `quantity_base_units = 10`.
   - Dispatch 15 simultaneous checkout threads, each requesting 1 unit.
   - Result: Exactly 10 requests succeed; 5 requests fail with `Insufficient Stock`. Remaining batch balance is strictly `0` (never negative).
3. **Quarantine Enforcement:**
   - Quarantine batch `B-002`.
   - Query FEFO allocation for that medicine.
   - Result: Batch `B-002` is completely skipped, ensuring quarantined stock cannot be dispensed at checkout.
