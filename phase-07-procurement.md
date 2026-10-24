# Phase 7: Procurement, Suppliers & Goods Received Notes (GRN) - Execution Plan

## 1. Context & Objectives
Phase 7 implements the end-to-end pharmaceutical supply chain, purchase order lifecycle, Goods Received Notes (GRN) with batch intake and moving-average landed cost calculations, accounts payable ledger with double-entry settlements, and purchase return workflows.

### Strict Invariants & Review of Previous Phases
1. **Phase 1 (Monorepo & Clinical Design System):** All UI components adhere strictly to the Clinical Pharmacy Palette (Solid Opaque Emerald/Teal/Slate, zero semi-transparency, accessible focus states, micro-animations, keyboard shortcuts).
2. **Phase 2 (Auth & RBAC):** Endpoints and actions require appropriate roles (PHARMACIST, INVENTORY_MANAGER, CASHIER, ADMIN).
3. **Phase 3 (Medicines & 4-Tier Packaging Engine):** Intake uses `convertToUnits(qty + bonus, packagingLevel, medicine.packaging)` to calculate exact integer base units and net landed cost per unit.
4. **Phase 4 (Inventory & Immutable Ledger):** GRN intake atomically upserts `inventory_batches` and writes append-only `MovementType.PURCHASE` rows to `stock_movements`. If batch exists, updates quantity and computes weighted Moving Average Cost.
5. **Phase 5 (Clinical Gatekeeper & Controlled Substances):** Intake captures batch number, manufacturing date, and expiry date. Enforces that expired pharmaceuticals (`expiryDate <= receivedDate`) are rejected immediately.
6. **Phase 6 (POS Terminal & FEFO Allocation):** The stock replenished via Phase 7 GRN intake seamlessly feeds FEFO allocation and point-of-sale sales.

---

## 2. Implementation Tasks

### Task 1: Shared Procurement Domain Models (`packages/shared/src/procurement/`)
- `constants.ts`:
  - `PurchaseOrderStatus`: `DRAFT`, `ORDERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`
  - `GrnPaymentStatus`: `UNPAID`, `PARTIALLY_PAID`, `PAID`
  - `SupplierPaymentMethod`: `CASH`, `BANK_TRANSFER`, `CHEQUE`
  - `PurchaseReturnReason`: `EXPIRED`, `DAMAGED`, `RECALLED`, `OVERSTOCK`, `OTHER`
- `types.ts`:
  - DTOs and interfaces for Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceivedNote, GoodsReceivedNoteItem, PurchaseReturn, SupplierPayment, SupplierStatement.
- `schemas.ts`:
  - Zod validation schemas for Supplier, PurchaseOrder, GRN (with item array and date checks), SupplierPayment, and PurchaseReturn.
- `schemas.test.ts`:
  - Tests covering schema validations, Sri Lankan phone formatting, bonus unit calculations, negative amount rejections, and expiry date invariants.
- Export all procurement definitions from `packages/shared/src/index.ts`.

### Task 2: TypeORM Entities & Database Migration (`apps/api/src/`)
- Entities in `apps/api/src/modules/procurement/entities/`:
  - `Supplier` (`suppliers`)
  - `PurchaseOrder` (`purchase_orders`)
  - `PurchaseOrderItem` (`purchase_order_items`)
  - `GoodsReceivedNote` (`goods_received_notes`) with `unique(supplier_id, supplier_invoice_number)`
  - `GoodsReceivedNoteItem` (`goods_received_note_items`)
  - `PurchaseReturn` (`purchase_returns`)
  - `PurchaseReturnItem` (`purchase_return_items`)
  - `SupplierPayment` (`supplier_payments`)
- Migration in `apps/api/src/database/migrations/1719000000000-CreateProcurementTables.ts`.

### Task 3: Backend Services & Atomic Operations (`apps/api/src/modules/procurement/services/`)
- `SequenceService` extension for PO (`PO-YYYYMM-XXXX`), GRN (`GRN-YYYYMM-XXXX`), PR (`PR-YYYYMM-XXXX`), and PAY (`PAY-YYYYMM-XXXX`).
- `SupplierService`:
  - Supplier CRUD with Sri Lankan tax and phone validation.
  - Supplier Statement generation: calculates itemized chronological ledger with debits (GRNs), credits (Payments, Returns), and running balance in LKR.
- `SupplierPaymentService`:
  - Payment settlement against supplier, decrementing `outstandingPayableLkr`, and allocating against individual GRNs (`paidAmountLkr`, `paymentStatus`).
- `PurchaseOrderService`:
  - PO creation, status transitions, and low-stock reorder automation (`generateFromLowStock`).
- `GrnIntakeService`:
  - Atomic TypeORM transaction:
    1. Rejects expired drugs (`expiryDate <= receivedDate`).
    2. Rejects duplicate supplier invoices (`409 Conflict`).
    3. Calculates `netLandedCostPerBaseUnit = (purchasePriceLkr * purchasedQuantity) / totalReceivedBaseUnits`.
    4. Upserts batch in `inventory_batches` (increments stock, re-weights moving average cost if existing).
    5. Appends `MovementType.PURCHASE` in `stock_movements`.
    6. Updates PO line `receivedQuantity` and status if PO-linked.
    7. Updates supplier `outstandingPayableLkr`.
- `PurchaseReturnService`:
  - Atomic transaction: decrements batch quantity, writes `PURCHASE_RETURN` movement, debits supplier `outstandingPayableLkr`.

### Task 4: API Controllers & NestJS Module Integration
- `ProcurementController` with full REST routes.
- `ProcurementModule` registered in `AppModule`.

### Task 5: Comprehensive Backend Tests (`apps/api/src/modules/procurement/procurement-phase7.test.ts`)
- Unit and integration tests verifying all 6 exit criteria from `phase-07-procurement-suppliers-grn.md`:
  1. Landed net cost computation with free/bonus stock.
  2. Duplicate invoice prevention (409 Conflict).
  3. Expired goods intake rejection (400 Bad Request).
  4. Moving average cost re-weighting on existing batch.
  5. Supplier statement & payment allocation.
  6. Purchase returns & inventory decrement.
  7. Low-stock PO generation.

### Task 6: Frontend Procurement Workspace (`apps/web/src/features/procurement/`)
- API Client (`procurementApi.ts`) with full REST methods and robust fallback demo data.
- Components:
  - `PoKanbanBoard.tsx`: Visual Kanban pipeline for PO progression.
  - `GrnIntakeModal.tsx`: High-speed intake modal with live net landed cost calculation and barcode support.
  - `SupplierStatementModal.tsx`: Itemized statement with payment settlement modal.
  - `LowStockReorderModal.tsx`: 1-click PO generator previewing medicines below reorder level.
  - `ProcurementWorkspace.tsx`: Multi-tab workspace with KPI summary cards.
- Integrated into `App.tsx` navigation bar.

### Task 7: Full Test Suite & Quality Verification
- Run all monorepo test suites (`npm run test`) to prove zero regressions on Phases 1–6 and 100% pass rate on Phase 7.
