import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateBankAccountSchema,
  BankTransferSchema,
  CreateExpenseSchema,
  DayCloseCommitSchema,
  DayCloseReopenSchema,
  calculateDenominationsTotal,
  maskBankAccountNumber,
} from './schemas.js';

test('maskBankAccountNumber masks all but the last 4 digits', () => {
  assert.equal(maskBankAccountNumber('1234567890'), '•••••• 7890');
  assert.equal(maskBankAccountNumber('8844'), '8844');
  assert.equal(maskBankAccountNumber(''), '');
});

test('calculateDenominationsTotal sums denomination map correctly', () => {
  const denoms = {
    '5000': 2, // 10000
    '1000': 5, // 5000
    '500': 4,  // 2000
    '100': 10, // 1000
    '50': 6,   // 300
    '20': 5,   // 100
    '10': 8,   // 80
  };
  const total = calculateDenominationsTotal(denoms);
  assert.equal(total, 18480);
});

test('CreateBankAccountSchema validates correct bank input', () => {
  const valid = {
    bankName: 'Commercial Bank of Ceylon',
    branchName: 'Kollupitiya',
    accountNumber: '1000293847',
    accountName: 'Pharmacy Main Account',
    openingBalanceLkr: 50000,
  };
  const parsed = CreateBankAccountSchema.parse(valid);
  assert.equal(parsed.bankName, 'Commercial Bank of Ceylon');
  assert.equal(parsed.openingBalanceLkr, 50000);

  // Negative balance fails
  assert.throws(() => {
    CreateBankAccountSchema.parse({ ...valid, openingBalanceLkr: -100 });
  });
});

test('BankTransferSchema rejects transfer to same account', () => {
  const sameId = 'd827f3c6-69d4-4c81-85da-059a9bfd79b6';
  assert.throws(() => {
    BankTransferSchema.parse({
      fromBankAccountId: sameId,
      toBankAccountId: sameId,
      amountLkr: 5000,
      feeLkr: 50,
      description: 'Internal transfer',
    });
  });
});

test('DayCloseCommitSchema enforces variance reason if discrepancy exists', () => {
  // Discrepancy without reason fails
  assert.throws(() => {
    DayCloseCommitSchema.parse({
      closingDate: '2026-10-24',
      expectedCashLkr: 15000,
      countedCashLkr: 14800,
      denominations: { '5000': 2, '1000': 4, '500': 1, '100': 3 },
      varianceReason: '',
    });
  });

  // Discrepancy with valid reason passes
  const valid = DayCloseCommitSchema.parse({
    closingDate: '2026-10-24',
    expectedCashLkr: 15000,
    countedCashLkr: 14800,
    denominations: { '5000': 2, '1000': 4, '500': 1, '100': 3 },
    varianceReason: 'Rs. 200 cashier change shortage under investigation',
  });
  assert.equal(valid.countedCashLkr, 14800);
});

test('DayCloseReopenSchema requires at least 5 character reason', () => {
  assert.throws(() => {
    DayCloseReopenSchema.parse({
      closingDate: '2026-10-24',
      reason: 'test',
    });
  });

  const parsed = DayCloseReopenSchema.parse({
    closingDate: '2026-10-24',
    reason: 'Emergency audit and late invoice adjustment',
  });
  assert.equal(parsed.reason, 'Emergency audit and late invoice adjustment');
});
