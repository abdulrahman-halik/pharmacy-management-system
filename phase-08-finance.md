# Phase 8: Financial Management, Cashbook & Day-Close Operations - Execution Plan

## 1. Context & Objectives
Phase 8 establishes the immutable financial backbone of the pharmacy management system. In accordance with Sri Lankan Accounting Standards (LKAS/IFRS for SMEs) and retail pharmacy best practices, it introduces a unified double-entry cashbook, exact Profit & Loss accounting based on batch-allocated Cost of Goods Sold (COGS), multi-bank tracking, operational expense tracking, and a 4-step Day-Close reconciliation wizard with automated register locking and printable Z-reports.

### User Decisions from Socratic Gate
1. **DayLockGuard Enforcement Scope:** Strictly blocks new sales, returns, and cash expenses on locked dates; allows customer collections/credit allocations with an audit warning.
2. **Variance Authorization:** Allows cashier submission with a mandatory variance reason note for any non-zero difference between counted and theoretical cash; flags variance in manager dashboards.
3. **Ledger Retroactivity:** Records new transactions moving forward, plus provides an idempotent backfill script to populate ledger entries for existing Phase 6 sales and Phase 7 supplier payments.

---

## 2. Implementation Tasks

### Task 1: Shared Finance Domain Models (`packages/shared/src/finance/`)
- `constants.ts`: `CashDirection`, `CashSourceType`, `ExpenseCategoryCode`, `PaymentMethodCode`, Sri Lankan Rupee denomination list (5000, 1000, 500, 100, 50, 20, 10).
- `types.ts`: DTOs & interfaces for `CashLedgerEntry`, `BankAccount`, `PaymentMethod`, `ExpenseCategory`, `Expense`, `DayClose`, `ProfitAndLossSummary`, `DayClosePreview`, `DenominationCounts`.
- `schemas.ts`: Zod validation schemas with denomination count validations, non-zero variance reason enforcement, and transfer limits.
- `schemas.test.ts`: Unit tests validating all shared finance schemas and edge cases.
- Export definitions from `packages/shared/src/index.ts`.

### Task 2: TypeORM Entities & Database Migration (`apps/api/src/`)
- Entities in `apps/api/src/modules/finance/entities/`:
  - `CashLedgerEntry` (`cash_ledger_entries`)
  - `BankAccount` (`bank_accounts`)
  - `PaymentMethod` (`payment_methods`)
  - `ExpenseCategory` (`expense_categories`)
  - `Expense` (`expenses`)
  - `DayClose` (`day_closes`)
- Migration: `1720000000000-CreateFinanceAndCashbookTables.ts` with default payment methods and expense categories seeded.

### Task 3: Backend Services & Atomic Operations (`apps/api/src/modules/finance/services/`)
- `CashLedgerService`:
  - Double-entry recording for sales, collections, payouts, expenses, and bank transfers.
  - Aggregation queries for running balances and cash-in-drawer.
  - Idempotent backfill from historical sales and procurement payments.
- `BankAccountService`:
  - Bank management with account masking and internal transfer tracking.
- `ExpenseService`:
  - Recording categorized expenses and automatic cashbook posting.
- `ProfitLossService`:
  - Querying exact COGS via `SaleItemAllocation` batch unit costs.
  - Computing net sales revenue, gross profit, margin %, and net profit in LKR.
- `DayCloseService`:
  - Step 1: Theoretical expected cash computation.
  - Step 2: Denomination summation.
  - Step 3: Variance validation.
  - Step 4: Atomic commit with calendar date locking (`is_locked = true`).
  - Step 5: Manager unlock workflow with reason and audit log creation.
- `DayLockGuard`:
  - Guard intercepting mutations on closed calendar dates.

### Task 4: Module Integration (`apps/api/src/`)
- Integrate Cash Ledger hooks into `PosCheckoutService` (on sale completion) and `SupplierPaymentService`.
- Expose REST API in `FinanceController` (`/finance/cashbook`, `/finance/profit-loss`, `/finance/banks`, `/finance/expenses`, `/finance/day-close`).
- Register `FinanceModule` in `AppModule`.

### Task 5: Backend Automated Verification (`apps/api/src/modules/finance/finance-phase8.test.ts`)
- Multi-scenario end-to-end integration tests:
  1. Ledger insertion and balance calculation.
  2. Batch-allocated exact COGS verification.
  3. Day-Close preview, denomination math, and mandatory variance reason.
  4. Day locking guard preventing backdated sales.
  5. Manager unlock workflow and security audit trail.
  6. Multi-bank account transfers and masked display.

### Task 6: Frontend Clinical Finance Workspace (`apps/web/src/features/finance/`)
- Interactive dashboard: KPI metric widgets, P&L explorer, live cashbook table, 4-step Day-Close wizard with denomination counter, and 80mm Z-report preview.
- Integrate into main app navigation tab in `App.tsx`.
