import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import AppDataSource from '../../database/data-source';
import { User, UserRole } from '../users/entities/user.entity';
import { PaymentMethod } from '../finance/entities/payment-method.entity';
import { BankAccount } from '../finance/entities/bank-account.entity';
import { CashLedgerEntry } from '../finance/entities/cash-ledger-entry.entity';
import { SalaryAdvance, AdvanceStatus } from './entities/salary-advance.entity';
import { EmployeePayroll } from './entities/employee-payroll.entity';
import { PayrollDeductionItem } from './entities/payroll-deduction-item.entity';

import { PayrollCalculationService } from './services/payroll-calculation.service';
import { SalaryAdvanceService } from './services/salary-advance.service';
import { PayrollService } from './services/payroll.service';
import { PayslipPdfService } from './services/payslip-pdf.service';
import { PayrollController } from './controllers/payroll.controller';
import { CashLedgerService } from '../finance/services/cash-ledger.service';
import { Sale } from '../pos/entities/sale.entity';

let calcService: PayrollCalculationService;
let advanceService: SalaryAdvanceService;
let payrollService: PayrollService;
let pdfService: PayslipPdfService;
let controller: PayrollController;
let cashLedgerService: CashLedgerService;

let testEmployeeUser: User;
let testAdminUser: User;
let testCashierUser: User;
let cashPaymentMethod: PaymentMethod;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  // Ensure migrations have executed
  await AppDataSource.runMigrations();

  const userRepo = AppDataSource.getRepository(User);
  const pmRepo = AppDataSource.getRepository(PaymentMethod);
  const bankRepo = AppDataSource.getRepository(BankAccount);
  const ledgerRepo = AppDataSource.getRepository(CashLedgerEntry);
  const saleRepo = AppDataSource.getRepository(Sale);
  const advanceRepo = AppDataSource.getRepository(SalaryAdvance);
  const payrollRepo = AppDataSource.getRepository(EmployeePayroll);
  const deductionRepo = AppDataSource.getRepository(PayrollDeductionItem);

  // Clean up any test records from prior runs to ensure test isolation
  await deductionRepo.createQueryBuilder().delete().execute();
  await payrollRepo.createQueryBuilder().delete().execute();
  await advanceRepo.createQueryBuilder().delete().execute();
  await ledgerRepo.createQueryBuilder().delete().where("source_type IN ('ADVANCE', 'SALARY')").execute();

  cashLedgerService = new CashLedgerService(
    ledgerRepo,
    pmRepo,
    bankRepo,
    saleRepo,
    AppDataSource.getRepository('SupplierPayment') as any,
  );

  calcService = new PayrollCalculationService();
  advanceService = new SalaryAdvanceService(
    advanceRepo,
    userRepo,
    pmRepo,
    cashLedgerService,
    AppDataSource,
  );
  payrollService = new PayrollService(
    payrollRepo,
    deductionRepo,
    advanceRepo,
    userRepo,
    pmRepo,
    calcService,
    advanceService,
    cashLedgerService,
    AppDataSource,
  );
  pdfService = new PayslipPdfService();
  controller = new PayrollController(payrollService, advanceService, pdfService);

  // Seed or fetch Cash Payment Method
  cashPaymentMethod = (await pmRepo.findOne({ where: { code: 'CASH' } }))!;
  if (!cashPaymentMethod) {
    cashPaymentMethod = await pmRepo.save(
      pmRepo.create({
        id: 'pm-cash-test',
        code: 'CASH',
        name: 'Cash In Drawer',
        requiresReference: false,
        isActive: true,
      }),
    );
  }

  // Seed Admin User
  let admin = await userRepo.findOne({
    where: { email: 'admin-payroll-test@pharmacy.lk' },
  });
  if (!admin) {
    admin = await userRepo.save(
      userRepo.create({
        id: 'usr-admin-payroll',
        fullName: 'Dr. Rohan Fernando (Admin)',
        email: 'admin-payroll-test@pharmacy.lk',
        phone: '+94771234567',
        passwordHash: 'argon2-dummy-hash',
        role: UserRole.ADMIN,
        monthlySalary: 150000.0,
        isActive: true,
      }),
    );
  }
  testAdminUser = admin;

  // Seed Staff Employee User (Pharmacist)
  let employee = await userRepo.findOne({
    where: { email: 'samantha-payroll-test@pharmacy.lk' },
  });
  if (!employee) {
    employee = await userRepo.save(
      userRepo.create({
        id: 'usr-pharmacist-payroll',
        fullName: 'Samantha Silva',
        email: 'samantha-payroll-test@pharmacy.lk',
        phone: '+94777654321',
        passwordHash: 'argon2-dummy-hash',
        role: UserRole.PHARMACIST,
        monthlySalary: 60000.0,
        epfNumber: 'EPF-8821',
        bankName: 'Commercial Bank of Ceylon',
        bankAccountNumber: '8009123456',
        bankBranch: 'Kollupitiya',
        isActive: true,
      }),
    );
  }
  testEmployeeUser = employee;

  // Seed Cashier User
  let cashier = await userRepo.findOne({
    where: { email: 'cashier-payroll-test@pharmacy.lk' },
  });
  if (!cashier) {
    cashier = await userRepo.save(
      userRepo.create({
        id: 'usr-cashier-payroll',
        fullName: 'Nimal Perera (Cashier)',
        email: 'cashier-payroll-test@pharmacy.lk',
        phone: '+94711122334',
        passwordHash: 'argon2-dummy-hash',
        role: UserRole.CASHIER,
        monthlySalary: 45000.0,
        isActive: true,
      }),
    );
  }
  testCashierUser = cashier;
});

after(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

// ----------------------------------------------------------------------------
// Test 1: Negative Pay Invariant Unit Test
// ----------------------------------------------------------------------------
test('Verification 1: Mathematical Advance Carryover & Negative Pay Invariant', () => {
  const dummyAdvance = {
    id: 'adv-001',
    amountLkr: 70000.0,
    recoveredAmountLkr: 0.0,
    remainingBalanceLkr: 70000.0,
    advanceDate: new Date('2026-10-01'),
    createdAt: new Date('2026-10-01'),
  } as SalaryAdvance;

  // Case A: Pure calculation (gross = 50,000, advance = 70,000)
  const recoveryPure = calcService.computeAdvanceRecovery(50000.0, [
    dummyAdvance,
  ]);
  assert.equal(
    recoveryPure.totalDeducted,
    50000.0,
    'Advance deducted must cap exactly at gross available',
  );
  assert.equal(
    recoveryPure.remainingCarryForward,
    20000.0,
    'Unsettled balance (Rs. 20,000) must carry forward',
  );

  // Case B: Full Line with EPF Statutory Deductions (Base Rs. 50,000, EPF 8% = Rs. 4,000)
  const line = calcService.calculatePayrollLine({
    baseSalaryLkr: 50000.0,
    activeAdvances: [dummyAdvance],
  });

  assert.equal(line.grossEarningsLkr, 50000.0);
  assert.equal(line.statutoryDeductionsLkr, 4000.0); // 8% of 50,000
  assert.equal(line.advanceDeductedLkr, 46000.0); // Capped so net pay cannot drop below 0
  assert.equal(line.netPayableLkr, 0.0, 'Strict invariant: net pay is exactly Rs. 0.00');
  assert.equal(line.advanceCarriedForwardLkr, 24000.0); // 70,000 - 46,000
});

// ----------------------------------------------------------------------------
// Test 2: FIFO Advance Allocation Across Multiple Requests
// ----------------------------------------------------------------------------
test('Verification 2: FIFO Advance Allocation Across Multiple Requests', () => {
  const advOlder = {
    id: 'adv-old',
    amountLkr: 20000.0,
    remainingBalanceLkr: 20000.0,
    advanceDate: new Date('2026-09-10'),
    createdAt: new Date('2026-09-10'),
  } as SalaryAdvance;

  const advNewer = {
    id: 'adv-new',
    amountLkr: 30000.0,
    remainingBalanceLkr: 30000.0,
    advanceDate: new Date('2026-10-05'),
    createdAt: new Date('2026-10-05'),
  } as SalaryAdvance;

  // Available capacity: Rs. 35,000
  const result = calcService.computeAdvanceRecovery(35000.0, [
    advNewer,
    advOlder,
  ]); // Given in reverse order to test sorting

  assert.equal(result.totalDeducted, 35000.0);
  assert.equal(result.remainingCarryForward, 15000.0);

  // Oldest advance should be fully cleared first (Rs. 20,000)
  const settledOld = result.settledAdvances.find((s) => s.advanceId === 'adv-old');
  assert.equal(settledOld?.deductedFromThis, 20000.0);
  assert.equal(settledOld?.remainingAfter, 0.0);

  // Newer advance should be partially settled (Rs. 15,000)
  const settledNew = result.settledAdvances.find((s) => s.advanceId === 'adv-new');
  assert.equal(settledNew?.deductedFromThis, 15000.0);
  assert.equal(settledNew?.remainingAfter, 15000.0);
});

// ----------------------------------------------------------------------------
// Test 3: 50% Advance Cap Validation & Cashbook Posting
// ----------------------------------------------------------------------------
test('Verification 3: 50% Advance Cap Validation & Cashbook Posting', async () => {
  // Test Employee has base salary Rs. 60,000. 50% cap = Rs. 30,000.
  // 1. Exceeds cap without override -> Rejects
  await assert.rejects(
    async () => {
      await advanceService.createAdvance(
        {
          userId: testEmployeeUser.id,
          amountLkr: 35000.0,
          paymentMethodId: cashPaymentMethod.id,
          reason: 'Excessive advance request',
          overrideCap: false,
        },
        testAdminUser.id,
      );
    },
    (err: BadRequestException) => {
      assert(err.message.includes('exceeds 50% salary cap'));
      return true;
    },
  );

  // 2. Advance exactly at cap (Rs. 25,000) -> Allowed
  const advance = await advanceService.createAdvance(
    {
      userId: testEmployeeUser.id,
      amountLkr: 25000.0,
      paymentMethodId: cashPaymentMethod.id,
      reason: 'Home plumbing emergency',
      overrideCap: false,
    },
    testAdminUser.id,
  );

  assert(advance.id, 'Advance must be saved with generated ID');
  assert.equal(advance.amountLkr, 25000.0);
  assert.equal(advance.remainingBalanceLkr, 25000.0);
  assert.equal(advance.status, 'OUTSTANDING');

  // Verify double-entry cashbook entry created automatically
  const ledgerRepo = AppDataSource.getRepository(CashLedgerEntry);
  const ledgerEntry = await ledgerRepo.findOne({
    where: { sourceId: advance.id, sourceType: 'ADVANCE' as any },
  });

  assert(ledgerEntry, 'Double-entry cashbook entry for ADVANCE must exist');
  assert.equal(ledgerEntry.direction, 'OUT');
  assert.equal(Number(ledgerEntry.amountLkr), 25000.0);
  assert.equal(ledgerEntry.paymentMethodId, cashPaymentMethod.id);
});

// ----------------------------------------------------------------------------
// Test 4: Idempotent Monthly Payroll Generation & Double-Deduction Prevention
// ----------------------------------------------------------------------------
test('Verification 4: Idempotent Monthly Payroll Generation & Double-Deduction Prevention', async () => {
  const monthYear = '2026-10';

  // Run 1: First generation
  const run1 = await payrollService.generateMonthlyPayroll(monthYear, [
    testEmployeeUser.id,
  ]);
  assert.equal(run1.length, 1);
  const payroll1 = run1[0];

  assert.equal(payroll1.monthYear, monthYear);
  assert.equal(payroll1.baseSalaryLkr, 60000.0);
  assert.equal(payroll1.statutoryDeductionsLkr, 4800.0); // 8% of 60,000
  assert.equal(payroll1.advanceDeductedLkr, 25000.0); // Recovers the Rs. 25,000 advance
  assert.equal(payroll1.netPayableLkr, 30200.0); // 60,000 - 4,800 - 25,000 = 30,200
  assert.equal(payroll1.advanceCarriedForwardLkr, 0.0);

  // Check deduction items count
  const deductionRepo = AppDataSource.getRepository(PayrollDeductionItem);
  const items1 = await deductionRepo.find({ where: { payrollId: payroll1.id } });
  assert.equal(items1.length, 2, 'Should have 1 EPF item and 1 Advance recovery item');

  // Run 2: Re-run generation for the same employee and month
  const run2 = await payrollService.generateMonthlyPayroll(monthYear, [
    testEmployeeUser.id,
  ]);
  assert.equal(run2.length, 1);
  const payroll2 = run2[0];
  assert.equal(payroll2.id, payroll1.id, 'Must update existing payroll without creating duplicate');

  // Verify deduction items were NOT duplicated
  const items2 = await deductionRepo.find({ where: { payrollId: payroll2.id } });
  assert.equal(items2.length, 2, 'Must not duplicate deduction items on re-run');
});

// ----------------------------------------------------------------------------
// Test 5: Payroll Disbursement & Double-Entry Cashbook Posting
// ----------------------------------------------------------------------------
test('Verification 5: Payroll Disbursement & Double-Entry Cashbook Posting', async () => {
  const monthYear = '2026-10';
  const payrolls = await payrollService.getMonthlyPayroll(monthYear);
  const empPayroll = payrolls.payrolls.find((p) => p.userId === testEmployeeUser.id);
  assert(empPayroll, 'Generated payroll must exist');

  // Disburse the payroll
  const disbursed = await payrollService.disbursePayroll(
    empPayroll.id,
    { disbursementMethod: 'CASH' },
    testAdminUser.id,
  );

  assert.equal(disbursed.status, 'DISBURSED');
  assert(disbursed.disbursedAt, 'disbursedAt timestamp must be set');

  // Verify advance was marked CLEARED
  const advanceRepo = AppDataSource.getRepository(SalaryAdvance);
  const advance = await advanceRepo.findOne({
    where: { userId: testEmployeeUser.id },
  });
  assert(advance);
  assert.equal(advance.status, 'CLEARED');
  assert.equal(advance.remainingBalanceLkr, 0.0);
  assert.equal(advance.recoveredAmountLkr, 25000.0);

  // Verify SALARY CASH_OUT entry in cashbook
  const ledgerRepo = AppDataSource.getRepository(CashLedgerEntry);
  const salaryEntry = await ledgerRepo.findOne({
    where: { sourceId: empPayroll.id, sourceType: 'SALARY' as any },
  });

  assert(salaryEntry, 'Double-entry cashbook entry for SALARY must exist');
  assert.equal(salaryEntry.direction, 'OUT');
  assert.equal(Number(salaryEntry.amountLkr), 30200.0);

  // Re-disbursing must fail
  await assert.rejects(
    async () => {
      await payrollService.disbursePayroll(
        empPayroll.id,
        { disbursementMethod: 'CASH' },
        testAdminUser.id,
      );
    },
    (err: BadRequestException) => {
      assert(err.message.includes('already been disbursed'));
      return true;
    },
  );
});

// ----------------------------------------------------------------------------
// Test 6: Branded PDF Payslip Generation
// ----------------------------------------------------------------------------
test('Verification 6: Branded PDF Payslip Generation', async () => {
  const monthYear = '2026-10';
  const payrollRepo = AppDataSource.getRepository(EmployeePayroll);
  const payroll = await payrollRepo.findOne({
    where: { userId: testEmployeeUser.id, monthYear },
    relations: ['user', 'deductionItems'],
  });

  assert(payroll);
  const pdfBuffer = await pdfService.generatePayslipPdf(payroll);

  assert(Buffer.isBuffer(pdfBuffer), 'Result must be a binary Buffer');
  assert(pdfBuffer.length > 1000, `PDF size (${pdfBuffer.length} bytes) must be substantial`);

  // Verify PDF magic bytes '%PDF-'
  const header = pdfBuffer.subarray(0, 5).toString('ascii');
  assert.equal(header, '%PDF-', 'PDF file must start with valid %PDF- magic signature');
});

// ----------------------------------------------------------------------------
// Test 7: RBAC Compensation Data Shielding for Cashier
// ----------------------------------------------------------------------------
test('Verification 7: RBAC Compensation Data Shielding for Cashier', async () => {
  const cashierReq = {
    headers: {
      'x-user-role': 'CASHIER',
      'x-user-id': testCashierUser.id,
    },
  } as any;

  // 1. Cashier attempting to view staff compensation
  await assert.rejects(
    async () => {
      await controller.getStaffCompensation(undefined as any, cashierReq);
    },
    (err: ForbiddenException) => {
      assert(err instanceof ForbiddenException);
      assert(err.message.includes('CASHIER is not permitted'));
      return true;
    },
  );

  // 2. Cashier attempting to view salary advances
  await assert.rejects(
    async () => {
      await controller.getAdvances({}, undefined as any, cashierReq);
    },
    (err: ForbiddenException) => {
      assert(err instanceof ForbiddenException);
      assert(err.message.includes('CASHIER is not permitted'));
      return true;
    },
  );
});
