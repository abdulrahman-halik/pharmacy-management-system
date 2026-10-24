import test from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutSchema, SplitPaymentSchema, SaleQuerySchema } from './schemas.js';

test('CheckoutSchema validates valid checkout payload', () => {
  const payload = {
    customerId: '11111111-1111-1111-1111-111111111111',
    items: [
      {
        medicineId: '22222222-2222-2222-2222-222222222222',
        packagingLevel: 'UNIT',
        quantity: 10,
        unitPriceLkr: 15.5,
      },
    ],
    discountLkr: 5,
    isVatApplicable: true,
    isSsclApplicable: true,
    splitPayments: [
      {
        method: 'CASH',
        amount: 200,
      },
    ],
    idempotencyKey: 'idemp-pos-checkout-001',
  };

  const parsed = CheckoutSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test('CheckoutSchema enforces customerId when credit is selected', () => {
  const payload = {
    items: [
      {
        medicineId: '22222222-2222-2222-2222-222222222222',
        packagingLevel: 'BOX',
        quantity: 1,
        unitPriceLkr: 500,
      },
    ],
    splitPayments: [
      {
        method: 'CREDIT',
        amount: 500,
      },
    ],
  };

  const parsed = CheckoutSchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const custErr = parsed.error.issues.find((i) => i.path.includes('customerId'));
    assert.ok(custErr, 'Should error on missing customerId for store credit');
  }
});

test('CheckoutSchema rejects duplicate items with same medicine and packaging level', () => {
  const payload = {
    items: [
      {
        medicineId: '22222222-2222-2222-2222-222222222222',
        packagingLevel: 'PACKET',
        quantity: 2,
        unitPriceLkr: 100,
      },
      {
        medicineId: '22222222-2222-2222-2222-222222222222',
        packagingLevel: 'PACKET',
        quantity: 3,
        unitPriceLkr: 100,
      },
    ],
    splitPayments: [
      {
        method: 'CASH',
        amount: 500,
      },
    ],
  };

  const parsed = CheckoutSchema.safeParse(payload);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.error.issues.some((i) => i.message.includes('Duplicate item')));
  }
});

test('SplitPaymentSchema rejects negative or zero amount', () => {
  assert.equal(SplitPaymentSchema.safeParse({ method: 'CASH', amount: 0 }).success, false);
  assert.equal(SplitPaymentSchema.safeParse({ method: 'CARD', amount: -50 }).success, false);
  assert.equal(SplitPaymentSchema.safeParse({ method: 'CARD', amount: 150 }).success, true);
});

test('SaleQuerySchema parses date filters and limits safely', () => {
  const parsed = SaleQuerySchema.safeParse({
    startDate: '2026-10-01',
    endDate: '2026-10-24',
    limit: '25',
    offset: '50',
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.limit, 25);
    assert.equal(parsed.data.offset, 50);
  }
});
