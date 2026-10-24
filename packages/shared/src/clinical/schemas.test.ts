import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateCustomerSchema,
  CreateDoctorSchema,
  CreatePrescriptionSchema,
  VerifyPrescriptionSchema,
  ValidateClinicalCartSchema,
} from './schemas.js';

test('CreateCustomerSchema normalizes Sri Lankan phone and sets defaults', () => {
  const result = CreateCustomerSchema.safeParse({
    fullName: 'Kamal Perera',
    phone: '0771234567',
    allergies: ['Penicillin', 'Sulfa'],
    nicOrPassport: '912345678V',
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.phone, '+94771234567');
    assert.equal(result.data.creditLimit, 0);
    assert.deepEqual(result.data.allergies, ['Penicillin', 'Sulfa']);
  }
});

test('CreateCustomerSchema rejects invalid Sri Lankan phone number', () => {
  const result = CreateCustomerSchema.safeParse({
    fullName: 'Kamal Perera',
    phone: '123456',
  });
  assert.equal(result.success, false);
});

test('CreateDoctorSchema validates SLMC doctor registration number', () => {
  const valid = CreateDoctorSchema.safeParse({
    fullName: 'Dr. N. Fernando',
    registrationNumber: 'SLMC-48291',
    specialization: 'Consultant Physician',
  });
  assert.equal(valid.success, true);

  const invalid = CreateDoctorSchema.safeParse({
    fullName: 'Dr. N. Fernando',
    registrationNumber: '!!', // Too short / invalid chars
  });
  assert.equal(invalid.success, false);
});

test('CreatePrescriptionSchema enforces validUntil >= issuedDate and min items', () => {
  const valid = CreatePrescriptionSchema.safeParse({
    customerId: 'cust-123',
    doctorId: 'doc-456',
    issuedDate: '2026-10-24',
    validUntil: '2026-11-24',
    imageUrls: ['s3/prescriptions/rx-01.jpg'],
    items: [
      {
        medicineId: 'med-001',
        dosage: '1 Tab tds',
        durationDays: 5,
        prescribedQuantityBaseUnits: 15,
      },
    ],
  });
  assert.equal(valid.success, true);

  const invalidDate = CreatePrescriptionSchema.safeParse({
    customerId: 'cust-123',
    doctorId: 'doc-456',
    issuedDate: '2026-10-24',
    validUntil: '2026-10-20', // Before issuedDate
    imageUrls: ['s3/prescriptions/rx-01.jpg'],
    items: [
      {
        medicineId: 'med-001',
        dosage: '1 Tab tds',
        durationDays: 5,
        prescribedQuantityBaseUnits: 15,
      },
    ],
  });
  assert.equal(invalidDate.success, false);

  const noItems = CreatePrescriptionSchema.safeParse({
    customerId: 'cust-123',
    doctorId: 'doc-456',
    issuedDate: '2026-10-24',
    validUntil: '2026-11-24',
    imageUrls: ['s3/prescriptions/rx-01.jpg'],
    items: [],
  });
  assert.equal(noItems.success, false);
});

test('VerifyPrescriptionSchema validates item decisions', () => {
  const valid = VerifyPrescriptionSchema.safeParse({
    itemDecisions: [
      { itemId: 'item-1', status: 'APPROVED' },
      { itemId: 'item-2', status: 'REJECTED', notes: 'Dosage unclear' },
    ],
    rejectionReason: 'INCORRECT_DOSAGE',
  });
  assert.equal(valid.success, true);

  const emptyDecisions = VerifyPrescriptionSchema.safeParse({
    itemDecisions: [],
  });
  assert.equal(emptyDecisions.success, false);
});

test('ValidateClinicalCartSchema requires non-empty items and positive quantities', () => {
  const valid = ValidateClinicalCartSchema.safeParse({
    customerId: 'cust-1',
    prescriptionId: 'rx-1',
    items: [
      { medicineId: 'med-1', quantityBaseUnits: 10 },
    ],
  });
  assert.equal(valid.success, true);

  const invalidQty = ValidateClinicalCartSchema.safeParse({
    items: [
      { medicineId: 'med-1', quantityBaseUnits: 0 },
    ],
  });
  assert.equal(invalidQty.success, false);
});
