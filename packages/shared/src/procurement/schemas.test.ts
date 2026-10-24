import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateSupplierSchema,
  CreatePurchaseOrderSchema,
  CreateGrnSchema,
  RecordSupplierPaymentSchema,
  CreatePurchaseReturnSchema,
} from './schemas.js';

test('CreateSupplierSchema normalizes Sri Lankan business phone and validates fields', () => {
  const result = CreateSupplierSchema.safeParse({
    companyName: 'Hemas Pharmaceuticals (Pvt) Ltd',
    phone: '0112345678',
    email: 'info@hemas.lk',
    taxTinNumber: 'TIN-987654321',
    paymentTermsDays: 45,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.companyName, 'Hemas Pharmaceuticals (Pvt) Ltd');
    assert.equal(result.data.phone, '+94112345678');
    assert.equal(result.data.paymentTermsDays, 45);
  }
});

test('CreateSupplierSchema rejects invalid phone numbers', () => {
  const result = CreateSupplierSchema.safeParse({
    companyName: 'Sunshine Healthcare',
    phone: '12345',
  });

  assert.equal(result.success, false);
});

test('CreatePurchaseOrderSchema validates item requirements and packaging', () => {
  const validPo = {
    supplierId: '00000000-0000-0000-0000-000000000001',
    orderDate: '2026-10-24',
    expectedDeliveryDate: '2026-10-30',
    items: [
      {
        medicineId: '00000000-0000-0000-0000-000000000002',
        packagingLevel: 'BOX',
        quantity: 10,
        unitCostLkr: 1500,
      },
    ],
  };

  const result = CreatePurchaseOrderSchema.safeParse(validPo);
  assert.equal(result.success, true);

  const emptyItems = { ...validPo, items: [] };
  assert.equal(CreatePurchaseOrderSchema.safeParse(emptyItems).success, false);
});

test('CreateGrnSchema validates batch items and non-negative bonus quantity', () => {
  const validGrn = {
    supplierId: '00000000-0000-0000-0000-000000000001',
    supplierInvoiceNumber: 'INV-2026-889',
    receivedDate: '2026-10-24',
    taxVatLkr: 3600,
    items: [
      {
        medicineId: '00000000-0000-0000-0000-000000000002',
        batchNumber: 'BATCH-X100',
        mfdDate: '2026-01-01',
        expiryDate: '2028-01-01',
        packagingLevel: 'BOX',
        purchasedQuantity: 10,
        bonusQuantity: 2,
        purchasePriceLkr: 2000,
        batchMrpPerBaseUnit: 25.0,
      },
    ],
  };

  const result = CreateGrnSchema.safeParse(validGrn);
  assert.equal(result.success, true);

  // Negative bonus quantity must fail
  const negativeBonus = {
    ...validGrn,
    items: [{ ...validGrn.items[0], bonusQuantity: -1 }],
  };
  assert.equal(CreateGrnSchema.safeParse(negativeBonus).success, false);

  // Non-positive price must fail
  const zeroPrice = {
    ...validGrn,
    items: [{ ...validGrn.items[0], purchasePriceLkr: 0 }],
  };
  assert.equal(CreateGrnSchema.safeParse(zeroPrice).success, false);
});

test('RecordSupplierPaymentSchema validates positive amounts and payment methods', () => {
  const validPayment = {
    amountLkr: 20000,
    paymentMethod: 'BANK_TRANSFER',
    reference: 'TXN-998811',
    grnAllocations: [{ grnId: '00000000-0000-0000-0000-000000000003', amount: 20000 }],
  };

  const result = RecordSupplierPaymentSchema.safeParse(validPayment);
  assert.equal(result.success, true);

  const zeroAmount = { ...validPayment, amountLkr: 0 };
  assert.equal(RecordSupplierPaymentSchema.safeParse(zeroAmount).success, false);
});

test('CreatePurchaseReturnSchema enforces valid reason and positive return quantity', () => {
  const validReturn = {
    supplierId: '00000000-0000-0000-0000-000000000001',
    reason: 'EXPIRED',
    items: [
      {
        batchId: '00000000-0000-0000-0000-000000000004',
        quantityBaseUnits: 50,
        reason: 'Passed manufacturer recall window',
      },
    ],
  };

  const result = CreatePurchaseReturnSchema.safeParse(validReturn);
  assert.equal(result.success, true);

  const invalidReason = { ...validReturn, reason: 'JUST_BECAUSE' };
  assert.equal(CreatePurchaseReturnSchema.safeParse(invalidReason).success, false);
});
