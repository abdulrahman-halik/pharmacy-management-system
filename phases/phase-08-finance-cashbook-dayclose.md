# Phase 8: Financial Management, Cashbook & Day-Close Operations

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 8  
**Architecture Layer:** Cash Ledger, Banking, Expense Tracking, Real-Time P&L & Register Reconciliation  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8, React 18, TanStack Query, Recharts  
**Compliance Standard:** Sri Lankan Accounting Standards (LKAS / IFRS for SMEs), Inland Revenue Day Locking

---

## 1. Executive Summary & Scope

Phase 8 builds the financial accounting and daily reconciliation engine for the enterprise pharmacy management system. In pharmacy management, financial accuracy requires a single immutable ledger connecting counter sales, customer credit collections, supplier payouts, operational expenses, and staff salaries. This phase delivers a unified double-entry cashbook, exact Profit & Loss accounting based on batch-allocated Cost of Goods Sold (COGS), multi-bank tracking, and a 4-step Day-Close reconciliation wizard with automated register locking and printable Z-reports.

### In-Scope Deliverables
1. **Unified Cash Ledger (`cash_ledger_entries`):**
   - Single immutable ledger for all financial movements across all payment instruments.
   - Categorized tracking: `direction` (`IN`, `OUT`), `source_type` (`SALE`, `SALE_RETURN`, `CUSTOMER_COLLECTION`, `SUPPLIER_PAYMENT`, `EXPENSE`, `OTHER_INCOME`, `SALARY`, `ADVANCE`, `OPENING`, `TRANSFER`), and reference IDs.
   - Real-time balance calculations by date, shift, payment method, or bank account.
2. **Bank Account & Payment Method Management (`bank_accounts`, `payment_methods`):**
   - Commercial bank accounts (e.g., Commercial Bank, Hatton National Bank, Sampath Bank) with opening balance, current balance, and masked account formatting.
   - Payment method manager: Cash, Visa/MasterCard, LankaPay/QR, Customer Credit, and Loyalty Points.
3. **Operational Expenses & Receipts (`expenses`):**
   - Categorized expenses (Store Rent, CEB Electricity, Delivery, Packaging Materials, Staff Tea/Refreshments) with MinIO receipt attachment uploads.
4. **Exact Profit & Loss Engine (Sri Lankan Rupees):**
   - **Net Sales Revenue** = Gross Sales - Sales Returns - Bill Discounts (excluding VAT/SSCL).
   - **Accurate COGS** = Exact sum of `sale_item_allocations.allocated_base_units × unit_cost_at_sale` for all settled sales (adjusted for restocked returns).
   - **Gross Profit** = Net Sales Revenue - COGS.
   - **Net Profit** = Gross Profit - Operating Expenses - Payroll Costs + Other Income.
5. **Day-Close Reconciliation Wizard & Z-Report (`day_closes`):**
   - Step 1: System computes theoretical expected cash:  
     `Expected Cash = Opening Cash + Cash Sales + Customer Collections - Cash Refunds - Cash Expenses - Cash Advances`.
   - Step 2: Cashier/Manager inputs counted physical cash denominations (Rs. 5,000, Rs. 1,000, Rs. 500, Rs. 100, Rs. 50, Rs. 20, Rs. 10 coins).
   - Step 3: Real-time variance calculation (`Counted Cash - Expected Cash`). Any non-zero discrepancy mandates an explanation note.
   - Step 4: Submission permanently locks all sales invoices and cash transactions for that calendar day (`is_locked = true`).
   - Reopening a locked day requires elevated `MANAGER` credentials, logs an immutable audit event, and requires an explanation.
   - Printable 80mm / PDF End-of-Day Z-Report.

### Prerequisites & Dependencies
- **Phase 2 Deliverables:** Audit logging and managerial authorization.
- **Phase 6 Deliverables:** POS checkout transactions and batch allocation cost records.
- **Phase 7 Deliverables:** Supplier payments and GRN intake records.

### Downstream Outputs
- Net Profit and payroll deduction entries integrated with **Phase 9 (HR & Payroll)**.
- Financial metrics and tax collection summaries exported in **Phase 10 (Reports & BI)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Unified Cash Ledger Entity (`apps/api/src/modules/finance/entities/cash-ledger-entry.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { BankAccount } from './bank-account.entity';
import { PaymentMethod } from './payment-method.entity';

export enum CashDirection {
  IN = 'IN',
  OUT = 'OUT',
}

export enum CashSourceType {
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  CUSTOMER_COLLECTION = 'CUSTOMER_COLLECTION',
  SUPPLIER_PAYMENT = 'SUPPLIER_PAYMENT',
  PURCHASE_RETURN_REFUND = 'PURCHASE_RETURN_REFUND',
  EXPENSE = 'EXPENSE',
  OTHER_INCOME = 'OTHER_INCOME',
  SALARY = 'SALARY',
  ADVANCE = 'ADVANCE',
  OPENING = 'OPENING',
  TRANSFER = 'TRANSFER',
}

@Entity('cash_ledger_entries')
@Index('idx_cash_date_source', ['entryDate', 'sourceType'])
export class CashLedgerEntry extends BaseAppEntity {
  @Index()
  @Column({ name: 'entry_date', type: 'datetime' })
  entryDate: Date;

  @Column({ type: 'enum', enum: CashDirection })
  direction: CashDirection;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amountLkr: number;

  @ManyToOne(() => PaymentMethod, { nullable: false })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId: string;

  @ManyToOne(() => BankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: BankAccount;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 64, nullable: true })
  bankAccountId?: string;

  @Column({ name: 'source_type', type: 'enum', enum: CashSourceType })
  sourceType: CashSourceType;

  @Column({ name: 'source_id', type: 'varchar', length: 64, nullable: true })
  sourceId?: string; // Links to Sale ID, Expense ID, SupplierPayment ID

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;
}
```

#### Bank Account Entity (`apps/api/src/modules/finance/entities/bank-account.entity.ts`)
```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('bank_accounts')
export class BankAccount extends BaseAppEntity {
  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string; // e.g. "Commercial Bank of Ceylon"

  @Column({ name: 'branch_name', type: 'varchar', length: 80 })
  branchName: string; // e.g. "Kollupitiya Branch"

  @Index({ unique: true })
  @Column({ name: 'account_number', type: 'varchar', length: 40 })
  accountNumber: string;

  @Column({ name: 'account_name', type: 'varchar', length: 120 })
  accountName: string; // e.g. "Pharmacy Main Operating Account" or legal entity name

  @Column({ name: 'opening_balance_lkr', type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  openingBalanceLkr: number;

  @Column({ name: 'current_balance_lkr', type: 'decimal', precision: 14, scale: 2, default: 0.0 })
  currentBalanceLkr: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
```

#### Expense Entity (`apps/api/src/modules/finance/entities/expense.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { ExpenseCategory } from './expense-category.entity';

@Entity('expenses')
export class Expense extends BaseAppEntity {
  @Index()
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate: Date;

  @ManyToOne(() => ExpenseCategory)
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;

  @Column({ name: 'category_id', type: 'varchar', length: 64 })
  categoryId: string;

  @Column({ name: 'amount_lkr', type: 'decimal', precision: 12, scale: 2 })
  amountLkr: number;

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId: string;

  @Column({ name: 'bank_account_id', type: 'varchar', length: 64, nullable: true })
  bankAccountId?: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ name: 'receipt_image_url', type: 'varchar', length: 255, nullable: true })
  receiptImageUrl?: string; // MinIO storage link

  @Column({ name: 'created_by_user_id', type: 'varchar', length: 64 })
  createdByUserId: string;
}
```

#### Day-Close Reconciliation Entity (`apps/api/src/modules/finance/entities/day-close.entity.ts`)
```typescript
import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('day_closes')
@Unique(['closingDate', 'storeId'])
export class DayClose extends BaseAppEntity {
  @Index()
  @Column({ name: 'closing_date', type: 'date' })
  closingDate: Date;

  @Column({ name: 'opening_cash_lkr', type: 'decimal', precision: 12, scale: 2 })
  openingCashLkr: number;

  @Column({ name: 'cash_sales_lkr', type: 'decimal', precision: 12, scale: 2 })
  cashSalesLkr: number;

  @Column({ name: 'cash_collections_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  cashCollectionsLkr: number;

  @Column({ name: 'cash_refunds_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  cashRefundsLkr: number;

  @Column({ name: 'cash_expenses_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  cashExpensesLkr: number;

  @Column({ name: 'expected_cash_lkr', type: 'decimal', precision: 12, scale: 2 })
  expectedCashLkr: number;

  @Column({ name: 'counted_cash_lkr', type: 'decimal', precision: 12, scale: 2 })
  countedCashLkr: number;

  @Column({ name: 'cash_variance_lkr', type: 'decimal', precision: 12, scale: 2 })
  cashVarianceLkr: number; // countedCash - expectedCash

  @Column({ name: 'variance_reason', type: 'varchar', length: 255, nullable: true })
  varianceReason?: string;

  @Column({ type: 'json' })
  denominationsJson: Record<string, number>; // e.g. { "5000": 10, "1000": 25, "500": 12, "100": 40 }

  @Column({ name: 'is_locked', type: 'boolean', default: true })
  isLocked: boolean;

  @Column({ name: 'closed_by_user_id', type: 'varchar', length: 64 })
  closedByUserId: string;

  @Column({ name: 'reopened_by_user_id', type: 'varchar', length: 64, nullable: true })
  reopenedByUserId?: string;

  @Column({ name: 'reopen_reason', type: 'varchar', length: 255, nullable: true })
  reopenReason?: string;
}
```

---

## 3. High-Precision Profit & Loss Engine (LKR)

### 3.1 P&L Computation Logic (`apps/api/src/modules/finance/services/profit-loss.service.ts`)
Standard retail software often calculates profit using static medicine master costs. In a real pharmacy, prices change across batches. The system calculates exact COGS from the immutable batch allocations recorded during each sale.

```typescript
export interface ProfitAndLossSummary {
  period: { startDate: string; endDate: string };
  grossSalesLkr: number;
  discountsLkr: number;
  returnsLkr: number;
  netRevenueLkr: number;
  cogsLkr: number;
  grossProfitLkr: number;
  grossMarginPercentage: number;
  operatingExpensesLkr: number;
  payrollCostsLkr: number;
  otherIncomeLkr: number;
  netProfitLkr: number;
}

export async function computeProfitAndLoss(
  manager: EntityManager,
  startDate: Date,
  endDate: Date,
): Promise<ProfitAndLossSummary> {
  // 1. Sales & Revenue
  const salesResult = await manager
    .createQueryBuilder(Sale, 'sale')
    .select('SUM(sale.subtotalLkr)', 'grossSales')
    .addSelect('SUM(sale.discountLkr)', 'discounts')
    .where('sale.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .getRawOne();

  const grossSalesLkr = parseFloat(salesResult.grossSales) || 0;
  const discountsLkr = parseFloat(salesResult.discounts) || 0;
  const netRevenueLkr = grossSalesLkr - discountsLkr;

  // 2. Exact COGS from Batch Allocations
  const cogsResult = await manager
    .createQueryBuilder(SaleItemAllocation, 'alloc')
    .innerJoin('alloc.saleItem', 'item')
    .innerJoin('item.sale', 'sale')
    .select('SUM(alloc.allocatedBaseUnits * alloc.unitCostAtSale)', 'totalCogs')
    .where('sale.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
    .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
    .getRawOne();

  const cogsLkr = parseFloat(cogsResult.totalCogs) || 0;
  const grossProfitLkr = netRevenueLkr - cogsLkr;
  const grossMarginPercentage = netRevenueLkr > 0 ? (grossProfitLkr / netRevenueLkr) * 100 : 0;

  // 3. Operating Expenses
  const expResult = await manager
    .createQueryBuilder(Expense, 'exp')
    .select('SUM(exp.amountLkr)', 'totalExpenses')
    .where('exp.expenseDate BETWEEN :start AND :end', { start: startDate, end: endDate })
    .getRawOne();
  const operatingExpensesLkr = parseFloat(expResult.totalExpenses) || 0;

  // 4. Net Profit
  const netProfitLkr = grossProfitLkr - operatingExpensesLkr;

  return {
    period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    grossSalesLkr,
    discountsLkr,
    returnsLkr: 0,
    netRevenueLkr,
    cogsLkr,
    grossProfitLkr,
    grossMarginPercentage: parseFloat(grossMarginPercentage.toFixed(2)),
    operatingExpensesLkr,
    payrollCostsLkr: 0,
    otherIncomeLkr: 0,
    netProfitLkr,
  };
}
```

---

## 4. Day-Close Wizard & Locking Architecture

### 4.1 4-Step Reconciliation Wizard
1. **Summary Computation:** System calculates theoretical cash based on sales, customer collections, and cash expenses.
2. **Physical Denomination Input:**
   - 5,000 Notes: Count × 5,000
   - 1,000 Notes: Count × 1,000
   - 500 Notes: Count × 500
   - 100 Notes: Count × 100
   - 50 Notes: Count × 50
   - 20 Notes: Count × 20
   - Coins: Sum in LKR
3. **Variance Gate:**
   - `Variance = Counted Cash - Expected Cash`.
   - If `Variance !== 0`, the UI turns amber/red and mandates entering an explanatory note before unlocking the Submit button.
4. **Day Locking Guard:**
   - Calling `POST /day-close/commit` sets `is_locked = true` for that calendar day in `day_closes`.
   - An active interceptor/guard (`DayLockGuard`) rejects any attempt to create or modify sales, expenses, or adjustments dated on a locked date.

---

## 5. API Endpoints Specification

### Cashbook (`/api/v1/finance/cashbook`)
- `GET /finance/cashbook`
  - Query Params: `startDate`, `endDate`, `paymentMethodId`, `bankAccountId`, `sourceType`.
  - Returns paginated entries and live closing balance.
- `GET /finance/profit-loss`
  - Query Params: `startDate`, `endDate`.
  - Returns the exact financial P&L structure with batch-allocated COGS.

### Expenses & Bank Accounts (`/api/v1/finance/expenses`, `/api/v1/finance/banks`)
- `GET /finance/expenses` -> List expenses with category grouping.
- `POST /finance/expenses` -> Record expense (Uploads receipt image to MinIO and appends `CASH_OUT` entry).
- `GET /finance/banks` -> List bank accounts with current balances.
- `POST /finance/banks/transfer` -> Record internal transfer between cash register and bank.

### Day-Close Operations (`/api/v1/finance/day-close`)
- `GET /finance/day-close/preview` -> Calculates expected cash and theoretical balances for today's register.
- `POST /finance/day-close/commit`
  - Body: `{ countedCashLkr: number, denominations: Record<string, number>, varianceReason?: string }`
  - Locks the date, stores denominations, and creates Z-report record.
- `POST /finance/day-close/reopen`
  - Restricted to `MANAGER` / `ADMIN`.
  - Requires `{ date: string, reason: string }`. Unlocks the date and logs critical security audit.

---

## 6. Frontend Finance Workspace (`apps/web`)

### 6.1 Interactive Screens
- **Financial Dashboard:** Real-time KPI widgets for Today's Sales, Net Gross Profit (Rs.), Total Cash in Drawer, and Bank Balances.
- **Interactive P&L Explorer:** Visual waterfall chart (Recharts) illustrating Revenue -> COGS -> Gross Profit -> Expenses -> Net Profit.
- **Day-Close Reconciliation Wizard:** Multi-step wizard with high-contrast denomination calculators and instant variance calculation.
- **Printable Z-Report Preview:** 80mm ESC/POS layout preview ready for thermal counter printers.

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 8.1: Financial Entities & Schema**
  - Implement `CashLedgerEntry`, `BankAccount`, `PaymentMethod`, `ExpenseCategory`, `Expense`, and `DayClose`.
  - Run TypeORM migration `007_create_finance_and_cashbook_tables`.
- [ ] **Task 8.2: Unified Cashbook Service**
  - Implement service that records double-entry transactions from sales, supplier payments, and expenses.
  - Implement balance aggregation queries.
- [ ] **Task 8.3: Exact Profit & Loss Service**
  - Implement batch-allocated COGS query matching sales allocations.
  - Implement net profit computation.
- [ ] **Task 8.4: Day-Close Reconciliation & Locking Guard**
  - Build expected cash calculation service.
  - Build `DayLockGuard` preventing modifications to locked dates.
  - Implement manager-only unlock workflow with audit trail.
- [ ] **Task 8.5: Frontend Finance Workspace**
  - Build Cashbook table with search and payment filters.
  - Build P&L waterfall chart and metric cards.
  - Build 4-step Day Close wizard with cash denomination counter.

---

## 8. Verification & Exit Criteria

1. **COGS Accounting Precision Test:**
   - Sell 10 tablets from Batch A (unit cost Rs. 10) and 10 tablets from Batch B (unit cost Rs. 15).
   - Expected COGS: `(10 × 10) + (10 × 15) = Rs. 250.00`.
   - Query `GET /finance/profit-loss`: Verify that reported COGS is exactly `Rs. 250.00`.
2. **Day Locking Security Enforcement:**
   - Execute Day Close for `2026-10-23`.
   - Attempt to execute a new POS checkout backdated to `2026-10-23`.
   - Result: Request rejected with `400 Bad Request: Date is locked by Day-Close register`.
3. **Manager Reopening Audit Test:**
   - Manager reopens locked date with reason: `"Late prescription billing"`.
   - Query `audit_logs` table: Verify critical audit log entry created capturing manager ID, timestamp, and formal reason.
