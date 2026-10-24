import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import AppDataSource from '../../database/data-source';
import { PaymentMethod } from './entities/payment-method.entity';
import { BankAccount } from './entities/bank-account.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { Expense } from './entities/expense.entity';
import { CashLedgerEntry } from './entities/cash-ledger-entry.entity';
import { DayClose } from './entities/day-close.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { CashLedgerService } from './services/cash-ledger.service';
import { BankAccountService } from './services/bank-account.service';
import { ExpenseService } from './services/expense.service';
import { ProfitLossService } from './services/profit-loss.service';
import { DayCloseService } from './services/day-close.service';
import { Medicine } from '../medicines/entities/medicine.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { PosCheckoutService } from '../pos/services/pos-checkout.service';
import { SequenceService } from '../pos/services/sequence.service';
import { FefoAllocationService } from '../inventory/services/fefo-allocation.service';
import { ReceiptGeneratorService } from '../pos/services/receipt-generator.service';
import { ReceiptQueueService } from '../pos/services/receipt-queue.service';
import { Sale } from '../pos/entities/sale.entity';

let cashLedgerService: CashLedgerService;
let bankAccountService: BankAccountService;
let expenseService: ExpenseService;
let profitLossService: ProfitLossService;
let dayCloseService: DayCloseService;
let posCheckoutService: PosCheckoutService;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const ledgerRepo = AppDataSource.getRepository(CashLedgerEntry);
  const paymentMethodRepo = AppDataSource.getRepository(PaymentMethod);
  const bankRepo = AppDataSource.getRepository(BankAccount);
  const categoryRepo = AppDataSource.getRepository(ExpenseCategory);
  const expenseRepo = AppDataSource.getRepository(Expense);
  const dayCloseRepo = AppDataSource.getRepository(DayClose);
  const auditRepo = AppDataSource.getRepository(AuditLog);
  const saleRepo = AppDataSource.getRepository(Sale);
  const batchRepo = AppDataSource.getRepository(InventoryBatch);

  cashLedgerService = new CashLedgerService(
    ledgerRepo,
    paymentMethodRepo,
    bankRepo,
    saleRepo,
    AppDataSource.getRepository('SupplierPayment') as any,
  );

  bankAccountService = new BankAccountService(
    bankRepo,
    paymentMethodRepo,
    cashLedgerService,
    AppDataSource,
  );

  expenseService = new ExpenseService(
    expenseRepo,
    categoryRepo,
    paymentMethodRepo,
    dayCloseRepo,
    cashLedgerService,
    AppDataSource,
  );

  profitLossService = new ProfitLossService(AppDataSource);

  dayCloseService = new DayCloseService(
    dayCloseRepo,
    paymentMethodRepo,
    ledgerRepo,
    auditRepo,
    AppDataSource,
  );

  const seqService = new SequenceService();
  const fefoService = new FefoAllocationService(batchRepo);
  const receiptGenService = new ReceiptGeneratorService();
  const receiptQueueService = new ReceiptQueueService();

  posCheckoutService = new PosCheckoutService(
    AppDataSource,
    seqService,
    fefoService,
    receiptGenService,
    receiptQueueService,
    saleRepo,
  );
});

after(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

test('Verification 1: Financial Master Entities & Seeded Defaults', async () => {
  const pmRepo = AppDataSource.getRepository(PaymentMethod);
  const pms = await pmRepo.find();
  assert(pms.length >= 7, 'Expected at least 7 default payment methods');
  const cashPm = pms.find((p) => p.code === 'CASH');
  assert(cashPm, 'Default CASH payment method should exist');

  const catRepo = AppDataSource.getRepository(ExpenseCategory);
  const cats = await catRepo.find();
  assert(cats.length >= 10, 'Expected at least 10 default expense categories');
  const rentCat = cats.find((c) => c.code === 'RENT');
  assert(rentCat, 'Default RENT expense category should exist');

  const bankRepo = AppDataSource.getRepository(BankAccount);
  const banks = await bankRepo.find();
  assert(banks.length >= 1, 'Expected at least 1 default bank account');
});

test('Verification 2: Double-Entry Cash Ledger Recording & Running Balances', async () => {
  const entry1 = await cashLedgerService.recordEntry({
    direction: 'IN',
    amountLkr: 15000.0,
    paymentMethodId: 'pm-cash',
    sourceType: 'SALE',
    description: 'Counter Cash Sale #INV-1001',
    userId: 'cashier-1',
  });
  assert(entry1.id, 'Entry 1 should have generated ID');

  const entry2 = await cashLedgerService.recordEntry({
    direction: 'OUT',
    amountLkr: 2500.0,
    paymentMethodId: 'pm-cash',
    sourceType: 'EXPENSE',
    description: 'Tea & Refreshments expense',
    userId: 'cashier-1',
  });
  assert(entry2.id, 'Entry 2 should have generated ID');

  const cashbook = await cashLedgerService.getCashbook({});
  assert(cashbook.entries.length >= 2, 'Should return recorded entries');
  assert(cashbook.summary.totalInLkr >= 15000, 'Total In should reflect entry');
  assert(cashbook.summary.totalOutLkr >= 2500, 'Total Out should reflect entry');
});

test('Verification 3: Batch-Allocated COGS Accounting Precision & P&L Engine', async () => {
  const medRepo = AppDataSource.getRepository(Medicine);
  const batchRepo = AppDataSource.getRepository(InventoryBatch);

  // 1. Create a test medicine
  const med = medRepo.create({
    name: 'Amoxicillin COGS Test',
    genericName: 'Amoxicillin 500mg',
    brandManufacturer: 'State Pharmaceuticals Manufacturing Corporation',
    dosageForm: 'CAPSULE',
    strength: '500mg',
    scheduleClass: 'OTC',
    storageCondition: 'ROOM_TEMPERATURE',
    requiresPrescription: false,
    mrp: 25.0,
    reorderLevel: 10,
  });
  const savedMed = await medRepo.save(med);

  // 2. Create Batch A with unit cost Rs. 10.00
  const futureExpiry1 = new Date();
  futureExpiry1.setFullYear(futureExpiry1.getFullYear() + 1);

  const batchA = batchRepo.create({
    medicineId: savedMed.id,
    batchNumber: 'COGS-BAT-A',
    mfdDate: new Date('2025-01-01'),
    expiryDate: futureExpiry1,
    quantityBaseUnits: 10,
    unitCostPrice: 10.0, // Rs. 10.00
    batchMrp: 25.0,
    status: 'ACTIVE',
  });
  await batchRepo.save(batchA);

  // 3. Create Batch B with unit cost Rs. 15.00
  const futureExpiry2 = new Date();
  futureExpiry2.setFullYear(futureExpiry2.getFullYear() + 2);

  const batchB = batchRepo.create({
    medicineId: savedMed.id,
    batchNumber: 'COGS-BAT-B',
    mfdDate: new Date('2025-01-01'),
    expiryDate: futureExpiry2,
    quantityBaseUnits: 15,
    unitCostPrice: 15.0, // Rs. 15.00
    batchMrp: 25.0,
    status: 'ACTIVE',
  });
  await batchRepo.save(batchB);

  // 4. Checkout 20 units via POS: FEFO will consume 10 from Batch A and 10 from Batch B
  // Expected COGS: (10 * 10) + (10 * 15) = Rs. 250.00
  const checkoutPayload = {
    items: [
      {
        medicineId: savedMed.id,
        packagingLevel: 'UNIT' as any,
        quantity: 20,
        unitPriceLkr: 25.0,
        discountPercentage: 0,
      },
    ],
    splitPayments: [
      {
        method: 'CASH' as any,
        amount: 500.0,
      },
    ],
  };

  const sale = await posCheckoutService.checkout(checkoutPayload, 'cashier-test');
  assert.equal(sale.status, 'COMPLETED');

  // Verify allocations sum to exact COGS
  let computedAllocCogs = 0;
  for (const item of sale.items) {
    if (item.allocations) {
      for (const alloc of item.allocations) {
        computedAllocCogs += alloc.allocatedBaseUnits * Number(alloc.unitCostAtSale);
      }
    }
  }
  assert.equal(
    computedAllocCogs,
    250.0,
    'Allocated COGS must be exactly Rs. 250.00 ((10x10) + (10x15))',
  );

  // 5. Query Profit & Loss for today
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const pnl = await profitLossService.computeProfitAndLoss(startOfDay, endOfDay, 1);
  assert(pnl.cogsLkr >= 250.0, `P&L COGS (${pnl.cogsLkr}) should include the Rs. 250.00`);
  assert(pnl.netRevenueLkr > 0, 'Net revenue should be positive');
  assert(pnl.grossProfitLkr === Number((pnl.netRevenueLkr - pnl.cogsLkr).toFixed(2)));
});

test('Verification 4: Expense Recording with Day-Lock Protection', async () => {
  const expenseDate = new Date().toISOString().split('T')[0];

  const recorded = await expenseService.recordExpense(
    {
      expenseDate,
      categoryId: 'ec-electricity',
      amountLkr: 3200.0,
      paymentMethodId: 'pm-cash',
      description: 'CEB Air Conditioning bill payment',
    },
    'manager-1',
  );

  assert(recorded.id, 'Expense should be created');
  assert.equal(recorded.amountLkr, 3200.0);

  // Verify recorded in Cash Ledger as OUT
  const cashbook = await cashLedgerService.getCashbook({
    startDate: `${expenseDate}T00:00:00.000Z`,
    endDate: `${expenseDate}T23:59:59.999Z`,
    sourceType: 'EXPENSE',
  });
  const found = cashbook.entries.find((e) => e.sourceId === recorded.id);
  assert(found, 'Cash ledger entry should exist for the recorded expense');
  assert.equal(found.direction, 'OUT');
  assert.equal(Number(found.amountLkr), 3200.0);
});

test('Verification 5: Day-Close Reconciliation, Variance Gate & Date Locking', async () => {
  const testCloseDate = '2026-10-23'; // Target previous date for clean test isolation

  // Ensure any previous test record is cleared
  await AppDataSource.query('DELETE FROM `day_closes` WHERE `closing_date` = ?', [testCloseDate]);

  const preview = await dayCloseService.getPreview(testCloseDate, 1);
  assert.equal(preview.closingDate, testCloseDate);
  assert.equal(preview.isAlreadyClosed, false);

  // 1. Submit with non-zero variance and missing explanation -> MUST REJECT
  await assert.rejects(
    async () => {
      await dayCloseService.commit(
        {
          closingDate: testCloseDate,
          countedCashLkr: preview.expectedCashLkr + 500, // Rs. 500 surplus
          denominations: { '5000': 1 },
          varianceReason: '', // Empty reason
        },
        'cashier-1',
      );
    },
    (err: any) => {
      assert(err.message.includes('mandates an explanatory note'));
      return true;
    },
  );

  // 2. Submit with valid explanation -> MUST SUCCEED
  const committed = await dayCloseService.commit(
    {
      closingDate: testCloseDate,
      countedCashLkr: preview.expectedCashLkr + 500,
      denominations: { '5000': 1 },
      varianceReason: 'Customer uncollected change surplus verified by supervisor',
    },
    'cashier-1',
  );

  assert.equal(committed.isLocked, true);
  assert.equal(Number(committed.cashVarianceLkr), 500.0);

  // 3. Verify date is locked
  const isLocked = await dayCloseService.isDateLocked(testCloseDate);
  assert.equal(isLocked, true, 'Date should now be marked locked');

  // 4. Attempting an expense on locked date MUST FAIL
  await assert.rejects(
    async () => {
      await expenseService.recordExpense(
        {
          expenseDate: testCloseDate,
          categoryId: 'ec-rent',
          amountLkr: 50000,
          paymentMethodId: 'pm-cash',
          description: 'Backdated rent payment',
        },
        'cashier-1',
      );
    },
    (err: any) => {
      assert(err.message.includes('is locked by Day-Close register'));
      return true;
    },
  );
});

test('Verification 6: Manager Reopening Workflow & Immutable Security Audit Log', async () => {
  const testCloseDate = '2026-10-23';

  // Manager reopens day close with reason
  const reopened = await dayCloseService.reopen(
    {
      closingDate: testCloseDate,
      reason: 'Late emergency prescription billing audit adjustment',
    },
    'manager-auth-user',
  );

  assert.equal(reopened.isLocked, false);
  assert.equal(reopened.reopenedByUserId, 'manager-auth-user');
  assert.equal(reopened.reopenReason, 'Late emergency prescription billing audit adjustment');

  // Verify immutable AuditLog created
  const auditRepo = AppDataSource.getRepository(AuditLog);
  const audit = await auditRepo.findOne({
    where: {
      action: 'DAY_CLOSE_REOPEN',
      entityId: reopened.id,
    },
  });

  assert(audit, 'Audit log entry must be created on reopen');
  assert.equal(audit.userId, 'manager-auth-user');
  assert(audit.integrityHash && audit.integrityHash.length === 64, 'Integrity SHA256 hash must be present');
});

test('Verification 7: Multi-Bank Account Management & Internal Transfer', async () => {
  // 1. Create a secondary bank account (Hatton National Bank)
  const randomAccNo = `2000${Math.floor(100000 + Math.random() * 900000)}`;
  const bankB = await bankAccountService.create(
    {
      bankName: 'Hatton National Bank',
      branchName: 'Bambalapitiya Branch',
      accountNumber: randomAccNo,
      accountName: 'Pharmacy Reserve Account',
      openingBalanceLkr: 20000.0,
    },
    'admin-1',
  );

  assert(bankB.id, 'Bank B should be created');
  assert.equal(bankB.maskedAccountNumber.slice(-4), randomAccNo.slice(-4));

  // 2. Perform internal transfer from Commercial Bank (ba-comb-main) to Bank B
  const sourceBank = await bankAccountService.getById('ba-comb-main');
  const sourceInitialBal = sourceBank.currentBalanceLkr;

  const transferRes = await bankAccountService.recordTransfer(
    {
      fromBankAccountId: 'ba-comb-main',
      toBankAccountId: bankB.id,
      amountLkr: 5000.0,
      feeLkr: 50.0,
      description: 'Transfer to reserve account for supplier payout',
    },
    'admin-1',
  );

  assert.equal(transferRes.success, true);
  assert.equal(transferRes.destBank.currentBalanceLkr, 25000.0);
  assert.equal(
    transferRes.sourceBank.currentBalanceLkr,
    Number((sourceInitialBal - 5050.0).toFixed(2)),
  );
});
