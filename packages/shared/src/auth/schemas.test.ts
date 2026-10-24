import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateUserSchema,
  PasswordSchema,
  UpdatePermissionMatrixSchema,
  UpdateUserSchema,
} from '../index.js';

test('PasswordSchema enforces length, uppercase and symbol', () => {
  assert.equal(PasswordSchema.safeParse('Short1!').success, false);
  assert.equal(PasswordSchema.safeParse('nouppercase1!').success, false);
  assert.equal(PasswordSchema.safeParse('NoSymbol123').success, false);
  assert.equal(PasswordSchema.safeParse('Valid-Pass1').success, true);
});

test('CreateUserSchema normalizes email and phone to canonical form', () => {
  const parsed = CreateUserSchema.parse({
    fullName: 'Nimali Perera',
    email: '  Nimali@Pharmacy.LK ',
    phone: '0771234567',
    role: 'CASHIER',
    initialPassword: 'Temp-Pass1',
  });
  assert.equal(parsed.email, 'nimali@pharmacy.lk');
  assert.equal(parsed.phone, '+94771234567');
  assert.equal(parsed.monthlySalary, 0);
});

test('UpdateUserSchema rejects empty payloads', () => {
  assert.equal(UpdateUserSchema.safeParse({}).success, false);
  assert.equal(UpdateUserSchema.safeParse({ isActive: false }).success, true);
});

test('UpdatePermissionMatrixSchema rejects ADMIN edits, orphan write access and duplicates', () => {
  const base = {
    moduleName: 'MEDICINES',
    canView: true,
    canAdd: false,
    canEdit: false,
    canDelete: true,
  };
  assert.equal(
    UpdatePermissionMatrixSchema.safeParse({ entries: [{ ...base, role: 'ADMIN' }] }).success,
    false,
  );
  assert.equal(
    UpdatePermissionMatrixSchema.safeParse({ entries: [{ ...base, role: 'PHARMACIST', canView: false }] }).success,
    false,
  );
  assert.equal(
    UpdatePermissionMatrixSchema.safeParse({
      entries: [
        { ...base, role: 'PHARMACIST' },
        { ...base, role: 'PHARMACIST' },
      ],
    }).success,
    false,
  );
  assert.equal(
    UpdatePermissionMatrixSchema.safeParse({ entries: [{ ...base, role: 'PHARMACIST' }] }).success,
    true,
  );
});
