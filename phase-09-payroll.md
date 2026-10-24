# Phase 9: Human Resources, Employee Payroll & Salary Advances - Execution & Verification Summary

## 1. Context & Objectives
Phase 9 establishes the human resources, salary advance, and monthly payroll automation engine for the enterprise pharmacy management system. In accordance with Sri Lankan labor standards (Shop and Office Employees Act, Inland Revenue APIT, EPF, and ETF regulations), it introduces mid-month salary advance management, strict 50% salary advance caps, automated monthly payroll generation, mathematical advance carryover protection (guaranteeing that net pay can never drop below Rs. 0.00), double-entry cashbook postings, and branded PDF payslip streaming.

---

## 2. Implemented Architecture & Deliverables

### Task 9.1: Shared Payroll Domain Models (`packages/shared/src/payroll/`)
- **`constants.ts`**:
  - `AdvanceStatus`: `OUTSTANDING`, `PARTIALLY_RECOVERED`, `CLEARED`
  - `PayrollStatus`: `DRAFT`, `APPROVED`, `DISBURSED`
  - `DisbursementMethod`: `CASH`, `BANK_TRANSFER`
  - `STATUTORY_RATES`: EPF Employee 8%, EPF Employer 12%, ETF Employer 3%
  - `DEFAULT_ADVANCE_CAP_RATIO`: 50% of monthly base salary
- **`types.ts`**:
  - `StaffCompensationDto`, `SalaryAdvanceDto`, `EmployeePayrollDto`, `PayrollDeductionItemDto`, `PayrollMonthSummaryDto`, `AdvanceSettlementResult`
- **`schemas.ts`**:
  - Zod validation schemas: `CreateSalaryAdvanceSchema`, `SalaryAdvanceQuerySchema`, `GeneratePayrollSchema`, `PayrollQuerySchema`, `DisbursePayrollSchema`, `UpdateStaffCompensationSchema`, `AdjustPayrollItemSchema`
- **`schemas.test.ts`**:
  - Unit tests validating all validation rules and edge cases.
- **Exported via `packages/shared/src/index.ts`**.

### Task 9.2: Database Migration & Entities (`apps/api/src/`)
- **Migration**: `apps/api/src/database/migrations/1721000000000-CreatePayrollAndAdvancesTables.ts`
  - Checks/creates `users` table with compensation and banking fields (`monthly_salary`, `epf_number`, `bank_name`, `bank_account_number`, `bank_branch`).
  - Creates `salary_advances` table with indices on `[user_id, status]` and `advance_date`.
  - Creates `employee_payroll` table with unique constraint `uq_user_payroll_month` (`[user_id, month_year]`).
  - Creates `payroll_deduction_items` table with foreign key relations and cascade rules.
- **Entities**:
  - `SalaryAdvance` (`apps/api/src/modules/payroll/entities/salary-advance.entity.ts`)
  - `EmployeePayroll` (`apps/api/src/modules/payroll/entities/employee-payroll.entity.ts`)
  - `PayrollDeductionItem` (`apps/api/src/modules/payroll/entities/payroll-deduction-item.entity.ts`)
  - `User` entity updated with banking and EPF columns.

### Task 9.3: Mathematical Carryover & Backend Services (`apps/api/src/modules/payroll/services/`)
- **`PayrollCalculationService`**:
  - Statutory deduction computation (EPF 8%).
  - FIFO advance recovery with strict Negative Pay Invariant: Available capacity = `grossEarnings - statutory - otherDeductions`.
  - Net payable salary is mathematically guaranteed to never fall below `Rs. 0.00`.
  - Automatically calculates advance carry forward amount.
- **`SalaryAdvanceService`**:
  - Advance creation with 50% base salary cap validation (with Admin override flag).
  - Double-entry cashbook posting: Automatic `CASH_OUT` entry with source `ADVANCE` via `CashLedgerService`.
- **`PayrollService`**:
  - Idempotent monthly generation for `YYYY-MM`: never overwrites already disbursed payrolls; recalculates draft payrolls cleanly without duplicating deduction items.
  - Disbursement workflow: settles advances (updating `recoveredAmountLkr`, `remainingBalanceLkr`, and setting status to `CLEARED` or `PARTIALLY_RECOVERED`), records `SALARY` `CASH_OUT` transaction in cash ledger, and flags payroll as `DISBURSED`.
  - Staff compensation management restricted to `ADMIN` and `MANAGER` roles.
- **`PayslipPdfService`**:
  - Generates branded clinical PDF payslips matching the template from Phase 9 specification using `pdfkit`.
- **`ProfitLossService` Integration**:
  - Incorporates salary payouts (`SALARY` `CASH_OUT` entries) into `payrollCostsLkr` and net profit computation.

### Task 9.4: REST API & RBAC Protection (`apps/api/src/modules/payroll/controllers/payroll.controller.ts`)
- `GET /payroll/staff`: List staff compensation directory (restricted to Admin/Manager; blocked for Cashier/Pharmacist).
- `PUT /payroll/staff/:id/compensation`: Update base salary and banking details.
- `GET /payroll/advances`: Query advance requests with status and month filters.
- `POST /payroll/advances`: Disburse mid-month advance (writes to cash ledger).
- `POST /payroll/generate/:monthYear`: Generate/re-run monthly payroll.
- `GET /payroll/:monthYear`: Get monthly payroll breakdown and totals.
- `POST /payroll/:id/disburse`: Settle advances and post salary payout to cashbook.
- `GET /payroll/:id/payslip-pdf`: Streams PDF payslip binary (`Content-Type: application/pdf`).

### Task 9.5: Automated Integration Test Suite (`apps/api/src/modules/payroll/payroll-phase9.test.ts`)
- **Verification 1:** Mathematical Advance Carryover & Negative Pay Invariant (deduction strictly capped at available gross; net pay = Rs. 0.00; carryover preserved).
- **Verification 2:** FIFO Advance Allocation Across Multiple Requests (settles oldest unsettled advances first).
- **Verification 3:** 50% Advance Cap Validation & Cashbook Posting (rejects advances exceeding 50% of base salary without override; posts `ADVANCE` `CASH_OUT` to cash ledger).
- **Verification 4:** Idempotent Monthly Payroll Generation & Double-Deduction Prevention (re-runs do not duplicate deduction items).
- **Verification 5:** Payroll Disbursement & Double-Entry Cashbook Posting (updates advance to `CLEARED`, posts `SALARY` `CASH_OUT`, and prevents re-disbursement).
- **Verification 6:** Branded PDF Payslip Generation (verifies `%PDF-` header and valid binary buffer).
- **Verification 7:** RBAC Compensation Data Shielding (verifies `CASHIER` receives `403 Forbidden` with zero financial data leaked).

### Task 9.6: Frontend HR & Compensation Workspace (`apps/web/src/features/payroll/PayrollWorkspace.tsx`)
- **Monthly Payroll Wizard:** Month selector, 1-click Run Payroll, KPI cards, itemized employee table, disburse modal (Cash or Bank Transfer), and PDF payslip download.
- **Salary Advances Vault:** Real-time advance balance tracking, status badges (`CLEARED`, `PARTIAL`, `OUTSTANDING`).
- **"Give Advance" Drawer:** Staff selector, live 50% salary cap progress bar & warning indicator, Admin override checkbox, payment method selector.
- **Staff Compensation Master:** Protected employee directory, salary, EPF, and banking details editor.
- **Design Tokens Compliance:** Built strictly against `DESIGN.md` (Clinical Emerald, Clinical Teal, Clinical Amber, Solid fills, high-contrast typography, and no purple).
- **Integrated into `App.tsx`** as a primary navigation workspace (`Phase 9: HR & Payroll`).
