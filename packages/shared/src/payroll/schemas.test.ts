import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateSalaryAdvanceSchema,
  GeneratePayrollSchema,
  DisbursePayrollSchema,
  UpdateStaffCompensationSchema,
} from './schemas.js';

test('CreateSalaryAdvanceSchema validates correct input', () => {
  const valid = {
    userId: 'user-123',
    amountLkr: 25000,
    paymentMethodId: 'pm-cash',
    reason: 'Medical expense for family member',
  };
  const result = CreateSalaryAdvanceSchema.safeParse(valid);
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.amountLkr, 25000);
    assert.equal(result.data.overrideCap, false);
  }
});

test('CreateSalaryAdvanceSchema rejects negative or zero amount', () => {
  const invalid = {
    userId: 'user-123',
    amountLkr: -500,
    paymentMethodId: 'pm-cash',
    reason: 'Emergency',
  };
  const result = CreateSalaryAdvanceSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test('CreateSalaryAdvanceSchema rejects short reason', () => {
  const invalid = {
    userId: 'user-123',
    amountLkr: 5000,
    paymentMethodId: 'pm-cash',
    reason: 'ab',
  };
  const result = CreateSalaryAdvanceSchema.safeParse(invalid);
  assert.equal(result.success, false);
});

test('GeneratePayrollSchema validates YYYY-MM format', () => {
  const valid = { monthYear: '2026-10' };
  const result = GeneratePayrollSchema.safeParse(valid);
  assert.equal(result.success, true);

  const invalid = { monthYear: '2026-1' };
  const invalidResult = GeneratePayrollSchema.safeParse(invalid);
  assert.equal(invalidResult.success, false);
});

test('DisbursePayrollSchema validates disbursement method', () => {
  const validCash = { disbursementMethod: 'CASH' };
  assert.equal(DisbursePayrollSchema.safeParse(validCash).success, true);

  const validBank = {
    disbursementMethod: 'BANK_TRANSFER',
    bankAccountId: 'bank-1',
  };
  assert.equal(DisbursePayrollSchema.safeParse(validBank).success, true);

  const invalidMethod = { disbursementMethod: 'CRYPTO' };
  assert.equal(DisbursePayrollSchema.safeParse(invalidMethod).success, false);
});

test('UpdateStaffCompensationSchema validates non-negative salary', () => {
  const valid = {
    monthlySalary: 75000,
    epfNumber: 'EPF-1234',
    bankName: 'Commercial Bank',
    bankAccountNumber: '8001234567',
  };
  assert.equal(UpdateStaffCompensationSchema.safeParse(valid).success, true);

  const negative = { monthlySalary: -1000 };
  assert.equal(UpdateStaffCompensationSchema.safeParse(negative).success, false);
});
