# Phase 9: Human Resources, Employee Payroll & Salary Advances

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 9  
**Architecture Layer:** Staff Compensation, Mid-Month Advances, Carryover Logic & Payslip Generation  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8, React 18, PDFKit / Puppeteer, TanStack Query  
**Regulatory Standards:** Sri Lanka Shop and Office Employees Act, Inland Revenue APIT / EPF / ETF Readiness

---

## 1. Executive Summary & Scope

Phase 9 establishes the human resources, salary advance, and monthly payroll automation engine for the enterprise pharmacy management system. Retail and institutional pharmacies employ a team of pharmacists, cashier assistants, inventory clerks, and delivery staff. In practice, staff frequently request mid-month salary advances for personal or medical emergencies. Phase 9 implements strict salary advance caps, automated monthly payroll generation, mathematical advance carryover protection (guaranteeing that net pay can never drop below Rs. 0.00), and PDF payslip delivery.

### In-Scope Deliverables
1. **Staff Profile & Compensation Master:**
   - Secure employee salary attributes (`monthly_salary` in LKR, designated bank account details, EPF/ETF employee numbers).
   - Strict RBAC protection: Compensation endpoints are restricted strictly to `ADMIN` and `MANAGER` roles; completely obscured from standard cashiers and dispensary staff.
2. **Salary Advance Management (`salary_advances`):**
   - Advance request and approval workflow with configurable issuance limits (default: maximum 50% of base salary).
   - Instant double-entry cashbook integration: Disbursing an advance automatically writes a `CASH_OUT` transaction (Source: `ADVANCE`) in `cash_ledger_entries`.
   - Real-time tracking of `advance_amount`, `deducted_so_far`, `remaining_balance`, and status (`OUTSTANDING`, `PARTIALLY_RECOVERED`, `CLEARED`).
3. **Automated Monthly Payroll Engine (`employee_payroll`):**
   - Idempotent generation: Composite unique constraint `unique(user_id, month_year)` (e.g. `'2026-10'`) preventing duplicate monthly runs.
   - Core Earnings & Deductions: Base Salary, Overtime/Holiday allowance, Performance Bonuses, Statutory Deductions, and Advance Recovery.
4. **Mathematical Advance Partial Carryover Logic:**
   - FIFO Advance Allocation: Recovers outstanding advances starting from the oldest unsettled request.
   - **Negative Pay Invariant:** Deductions are strictly capped such that:  
     `Maximum Advance Deduction = Base Salary + Bonuses - Other Deductions`.  
     Net payable salary can never fall below **Rs. 0.00**.
   - Any unrecovered advance portion remains active and automatically carries forward to the subsequent month's payroll.
5. **PDF Payslip Generation & Disbursement:**
   - Branded downloadable PDF payslips formatted with configurable pharmacy details, detailing gross earnings, itemized deductions, remaining advance balance, and net pay in LKR / local currency.
   - Bulk disbursement options via Cash Register or Bank Transfer CSV export.
6. **Frontend HR Workspace:**
   - Staff compensation directory, "Give Advance" drawer with real-time limit validation, 1-click monthly payroll wizard, and historical payslip vault.

### Prerequisites & Dependencies
- **Phase 2 Deliverables:** User entities, RBAC guards (`@RequirePermission('PAYROLL', ...)`), and audit trail.
- **Phase 8 Deliverables:** Double-entry cashbook (`cash_ledger_entries`) and bank accounts.

### Downstream Outputs
- Payroll salary and advance disbursements directly posted to the **Phase 8 (Cashbook)**.
- Staff labor costs integrated into the overall P&L statement in **Phase 8 & 10 (Reports)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Salary Advance Entity (`apps/api/src/modules/payroll/entities/salary-advance.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';

export enum AdvanceStatus {
  OUTSTANDING = 'OUTSTANDING',
  PARTIALLY_RECOVERED = 'PARTIALLY_RECOVERED',
  CLEARED = 'CLEARED',
}

@Entity('salary_advances')
@Index('idx_user_advance_status', ['userId', 'status'])
export class SalaryAdvance extends BaseAppEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Column({ name: 'advance_date', type: 'date' })
  advanceDate: Date;

  @Column({ name: 'amount_lkr', type: 'decimal', precision: 12, scale: 2 })
  amountLkr: number; // Requested advance amount

  @Column({ name: 'recovered_amount_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  recoveredAmountLkr: number;

  @Column({ name: 'remaining_balance_lkr', type: 'decimal', precision: 12, scale: 2 })
  remainingBalanceLkr: number; // amountLkr - recoveredAmountLkr

  @Column({ type: 'varchar', length: 255 })
  reason: string; // e.g., "Family medical emergency", "House repair"

  @Column({ name: 'payment_method_id', type: 'varchar', length: 64 })
  paymentMethodId: string; // Cash or Bank Transfer

  @Column({ type: 'enum', enum: AdvanceStatus, default: AdvanceStatus.OUTSTANDING })
  status: AdvanceStatus;

  @Column({ name: 'approved_by_user_id', type: 'varchar', length: 64 })
  approvedByUserId: string;
}
```

#### Monthly Employee Payroll Entity (`apps/api/src/modules/payroll/entities/employee-payroll.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { User } from '../../users/entities/user.entity';
import { PayrollDeductionItem } from './payroll-deduction-item.entity';

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  DISBURSED = 'DISBURSED',
}

@Entity('employee_payroll')
@Unique('uq_user_payroll_month', ['userId', 'monthYear'])
export class EmployeePayroll extends BaseAppEntity {
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Index()
  @Column({ name: 'month_year', type: 'varchar', length: 7 })
  monthYear: string; // e.g. "2026-10"

  @Column({ name: 'base_salary_lkr', type: 'decimal', precision: 12, scale: 2 })
  baseSalaryLkr: number;

  @Column({ name: 'bonus_allowance_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  bonusAllowanceLkr: number;

  @Column({ name: 'overtime_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  overtimeLkr: number;

  @Column({ name: 'gross_earnings_lkr', type: 'decimal', precision: 12, scale: 2 })
  grossEarningsLkr: number; // baseSalary + bonusAllowance + overtime

  @Column({ name: 'statutory_deductions_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  statutoryDeductionsLkr: number; // EPF 8% employee contribution

  @Column({ name: 'advance_deducted_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  advanceDeductedLkr: number;

  @Column({ name: 'other_deductions_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  otherDeductionsLkr: number;

  @Column({ name: 'net_payable_lkr', type: 'decimal', precision: 12, scale: 2 })
  netPayableLkr: number; // grossEarnings - statutory - advanceDeducted - otherDeductions (Strictly >= 0)

  @Column({ name: 'advance_carried_forward_lkr', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  advanceCarriedForwardLkr: number; // Unrecovered advance carried to following month

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Column({ name: 'disbursed_at', type: 'datetime', nullable: true })
  disbursedAt?: Date;

  @Column({ name: 'disbursement_method', type: 'varchar', length: 32, nullable: true })
  disbursementMethod?: string; // 'CASH', 'BANK_TRANSFER'

  @OneToMany(() => PayrollDeductionItem, (item) => item.payroll, { cascade: true })
  deductionItems: PayrollDeductionItem[];
}
```

#### Payroll Deduction Item Entity (`apps/api/src/modules/payroll/entities/payroll-deduction-item.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { EmployeePayroll } from './employee-payroll.entity';
import { SalaryAdvance } from './salary-advance.entity';

@Entity('payroll_deduction_items')
export class PayrollDeductionItem extends BaseAppEntity {
  @ManyToOne(() => EmployeePayroll, (p) => p.deductionItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_id' })
  payroll: EmployeePayroll;

  @Column({ name: 'payroll_id', type: 'varchar', length: 64 })
  payrollId: string;

  @ManyToOne(() => SalaryAdvance, { nullable: true })
  @JoinColumn({ name: 'salary_advance_id' })
  salaryAdvance?: SalaryAdvance;

  @Column({ name: 'salary_advance_id', type: 'varchar', length: 64, nullable: true })
  salaryAdvanceId?: string;

  @Column({ type: 'varchar', length: 100 })
  description: string; // e.g. "Recovery for advance ADV-012"

  @Column({ name: 'amount_lkr', type: 'decimal', precision: 12, scale: 2 })
  amountLkr: number;
}
```

---

## 3. Mathematical Advance Carryover & Deduction Algorithm

### 3.1 Payroll Calculation Logic (`apps/api/src/modules/payroll/services/payroll-calculation.service.ts`)

```typescript
export interface AdvanceSettlementResult {
  totalDeducted: number;
  remainingCarryForward: number;
  settledAdvances: Array<{ advanceId: string; deductedFromThis: number; remainingAfter: number }>;
}

export function computeAdvanceRecovery(
  grossPayable: number,
  activeAdvances: SalaryAdvance[],
): AdvanceSettlementResult {
  let availableDeductionCapacity = grossPayable; // Net salary cannot drop below 0
  let totalDeducted = 0;
  let remainingCarryForward = 0;
  const settledAdvances = [];

  for (const advance of activeAdvances) {
    const currentRemaining = Number(advance.remainingBalanceLkr);

    if (availableDeductionCapacity <= 0) {
      // No capacity remaining in this month's salary; full advance carries forward
      remainingCarryForward += currentRemaining;
      settledAdvances.push({
        advanceId: advance.id,
        deductedFromThis: 0,
        remainingAfter: currentRemaining,
      });
      continue;
    }

    const deduction = Math.min(availableDeductionCapacity, currentRemaining);
    const remainder = currentRemaining - deduction;

    totalDeducted += deduction;
    availableDeductionCapacity -= deduction;
    remainingCarryForward += remainder;

    settledAdvances.push({
      advanceId: advance.id,
      deductedFromThis: deduction,
      remainingAfter: remainder,
    });
  }

  return {
    totalDeducted,
    remainingCarryForward,
    settledAdvances,
  };
}
```

### 3.2 Concrete Scenario Demonstration
- **Employee:** Assistant Pharmacist.
- **Monthly Base Salary:** Rs. 50,000.00.
- **Outstanding Advance:** Rs. 65,000.00 (from previous emergency).
- **October 2026 Payroll Run:**
  - Gross Earnings: Rs. 50,000.00.
  - Advance Deducted: Rs. 50,000.00.
  - **Net Payable:** **Rs. 0.00** (Negative pay prevented).
  - **Carry Forward to November 2026:** **Rs. 15,000.00**.
  - System automatically updates advance record `recovered_amount_lkr = 50000` and `remaining_balance_lkr = 15000`.

---

## 4. API Endpoints Specification

### Salary Advances (`/api/v1/payroll/advances`)
- `GET /payroll/advances`
  - Restricted to `ADMIN` / `MANAGER`.
  - Query Params: `userId`, `status` (`OUTSTANDING`, `CLEARED`), `monthYear`.
- `POST /payroll/advances`
  - Body: `{ userId: string, amountLkr: number, paymentMethodId: string, reason: string }`
  - Validation: Amount cannot exceed 50% of the employee's `monthlySalary` unless approved by `ADMIN`.
  - Appends `CASH_OUT` transaction to `cash_ledger_entries`.

### Monthly Payroll (`/api/v1/payroll`)
- `POST /payroll/generate/:monthYear`
  - Idempotent generation for all active staff for that month.
  - Applies automated advance recovery and carryover logic.
- `GET /payroll/:monthYear` -> Lists all payslips for the month with total payroll cost summary.
- `POST /payroll/:id/disburse`
  - Body: `{ disbursementMethod: 'CASH' | 'BANK_TRANSFER', bankAccountId?: string }`
  - Updates payroll status to `DISBURSED` and writes `SALARY` payout entries to cash ledger.
- `GET /payroll/:id/payslip-pdf` -> Streams branded PDF payslip for download or printing.

---

## 5. Branded PDF Payslip Layout Template

```
========================================================================
                     [PHARMACY / ORGANIZATION NAME]
               [Store Address / Registered Business Location]
                         MONTHLY SALARY PAYSLIP
========================================================================
Employee: Samantha Silva               Designation: Dispensary Pharmacist
EPF No: 1420                          Payroll Month: October 2026
Bank: Commercial Bank (Acct: ...9012)  Disbursement: Bank Transfer
------------------------------------------------------------------------
EARNINGS (LKR)                         DEDUCTIONS (LKR)
------------------------------------------------------------------------
Basic Salary:           Rs. 75,000.00  EPF (Employee 8%):   Rs. 6,000.00
Holiday Allowance:       Rs. 5,000.00  Salary Advance Rec: Rs. 30,000.00
Performance Bonus:       Rs. 5,000.00  Other Deductions:        Rs. 0.00
------------------------------------------------------------------------
Gross Earnings:         Rs. 85,000.00  Total Deductions:   Rs. 36,000.00
------------------------------------------------------------------------
NET PAYABLE SALARY:                                        Rs. 49,000.00
------------------------------------------------------------------------
Advance Status:
  Total Advance Issued: Rs. 30,000.00
  Recovered This Month: Rs. 30,000.00
  Remaining Balance:          Rs. 0.00 (Fully Cleared)
========================================================================
```

---

## 6. Frontend HR & Payroll Workspace (`apps/web`)

### 6.1 Screens & Ergonomics
- **Staff Compensation Table:** Secure view displaying employee names, roles, base salaries (Rs.), active advances, and employment status. Restricted by `<PermissionGate module="PAYROLL" action="view">`.
- **"Give Advance" Drawer:** Slide-over modal with employee selector, live 50% cap warning indicator, reason field, and payment method selector.
- **Monthly Payroll Wizard:** Step 1: Select Month (`YYYY-MM`) -> Step 2: Review pre-calculated earnings, advance deductions, and net pay -> Step 3: 1-Click "Approve & Disburse".

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 9.1: Database Entities & Schema**
  - Implement `SalaryAdvance`, `EmployeePayroll`, and `PayrollDeductionItem`.
  - Add unique constraint `unique(user_id, month_year)` on payroll.
  - Run TypeORM migration `008_create_payroll_and_advances_tables`.
- [ ] **Task 9.2: Salary Advance Management Service**
  - Implement advance issuance with salary ratio caps and cashbook postings.
- [ ] **Task 9.3: Payroll Generation & Carryover Engine**
  - Implement `computeAdvanceRecovery()` with negative pay prevention.
  - Build monthly batch generation service with idempotent re-run safeguards.
- [ ] **Task 9.4: PDF Payslip Generator**
  - Build PDFKit / Puppeteer service generating branded pharmacy payslips in LKR / configured currency.
- [ ] **Task 9.5: Frontend HR & Compensation Workspace**
  - Build staff payroll dashboard in `apps/web/src/features/payroll/`.
  - Build "Give Advance" drawer and payslip preview modal.

---

## 8. Verification & Exit Criteria

1. **Negative Pay Invariant Unit Test:**
   - Base Salary: Rs. 50,000. Outstanding Advance: Rs. 70,000.
   - Run payroll calculation.
   - Result: Advance deducted is exactly `Rs. 50,000.00`, Net payable is `Rs. 0.00`, and Advance carried forward is `Rs. 20,000.00`.
2. **Double-Deduction Prevention Test:**
   - Run monthly payroll generation for `2026-10`.
   - Attempt to re-run generation for the same employee in `2026-10`.
   - Result: System returns existing draft/approved record without creating duplicate deduction entries.
3. **RBAC Compensation Data Leak Test:**
   - Authenticate as `CASHIER`.
   - Attempt to access `GET /api/v1/payroll` or `GET /api/v1/payroll/advances`.
   - Result: Response is strictly `403 Forbidden` with zero financial compensation fields leaked in network responses.
