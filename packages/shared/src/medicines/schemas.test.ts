import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CreateMedicineSchema,
  MedicineListQuerySchema,
  deriveRegulatoryFlags,
  parseCsvMedicineRow,
} from './schemas.js';

const validMedicine = {
  name: 'Panadol 500mg',
  genericName: 'Paracetamol',
  brandManufacturer: 'GSK',
  strength: '500mg',
  barcode: '2000000000015',
  mrp: 4.5,
  packaging: { baseUnitName: 'Tablet', unitsPerPacket: 10, packetsPerBox: 10, boxesPerCarton: 20 },
  priceOverrides: [{ packagingLevel: 'BOX', sellingPrice: 420 }],
};

test('CreateMedicineSchema accepts a valid medicine and applies defaults', () => {
  const result = CreateMedicineSchema.parse(validMedicine);
  assert.equal(result.scheduleClass, 'OTC');
  assert.equal(result.dosageForm, 'TABLET');
  assert.equal(result.categoryId, null);
  assert.equal(result.packaging.boxesPerCarton, 20);
});

test('CreateMedicineSchema normalises blank optional text to null', () => {
  const result = CreateMedicineSchema.parse({ ...validMedicine, barcode: '  ', nsquCode: '' });
  assert.equal(result.barcode, null);
  assert.equal(result.nsquCode, null);
});

test('CreateMedicineSchema caps tier selling price at MRP x multiplier', () => {
  const result = CreateMedicineSchema.safeParse({
    ...validMedicine,
    priceOverrides: [{ packagingLevel: 'BOX', sellingPrice: 450.01 }],
  });
  assert.equal(result.success, false);
  assert.match(result.error!.issues[0].message, /exceeds MRP ceiling of 450.00/);
});

test('CreateMedicineSchema accepts price exactly at the MRP ceiling', () => {
  const result = CreateMedicineSchema.safeParse({
    ...validMedicine,
    mrp: 0.1,
    packaging: { baseUnitName: 'Tablet', unitsPerPacket: 3 },
    priceOverrides: [{ packagingLevel: 'PACKET', sellingPrice: 0.3 }],
  });
  assert.equal(result.success, true);
});

test('CreateMedicineSchema rejects overrides without MRP, duplicates and unconfigured tiers', () => {
  const noMrp = CreateMedicineSchema.safeParse({ ...validMedicine, mrp: null });
  assert.equal(noMrp.success, false);

  const duplicate = CreateMedicineSchema.safeParse({
    ...validMedicine,
    priceOverrides: [
      { packagingLevel: 'UNIT', sellingPrice: 4 },
      { packagingLevel: 'UNIT', sellingPrice: 3 },
    ],
  });
  assert.equal(duplicate.success, false);

  const unconfigured = CreateMedicineSchema.safeParse({
    ...validMedicine,
    packaging: { baseUnitName: 'Tablet', unitsPerPacket: 10 },
    priceOverrides: [{ packagingLevel: 'CARTON', sellingPrice: 1 }],
  });
  assert.equal(unconfigured.success, false);
});

test('CreateMedicineSchema rejects invalid packaging and VAT combinations', () => {
  assert.equal(
    CreateMedicineSchema.safeParse({ ...validMedicine, packaging: { baseUnitName: 'Tab', unitsPerPacket: -5 } }).success,
    false,
  );
  assert.equal(
    CreateMedicineSchema.safeParse({
      ...validMedicine,
      priceOverrides: [],
      packaging: { baseUnitName: 'Tab', unitsPerPacket: 10, boxesPerCarton: 4 },
    }).success,
    false,
  );
  assert.equal(CreateMedicineSchema.safeParse({ ...validMedicine, isVatExempt: true, vatPercentage: 18 }).success, false);
});

test('deriveRegulatoryFlags forces prescription for Schedule II and Rx-only drugs', () => {
  assert.deepEqual(deriveRegulatoryFlags('CONTROLLED_II', false), {
    requiresPrescription: true,
    isControlledSubstance: true,
    wasOverridden: true,
  });
  assert.equal(deriveRegulatoryFlags('PRESCRIPTION_ONLY', false).requiresPrescription, true);
  assert.deepEqual(deriveRegulatoryFlags('OTC', false), {
    requiresPrescription: false,
    isControlledSubstance: false,
    wasOverridden: false,
  });
  assert.equal(deriveRegulatoryFlags('OTC', true).requiresPrescription, true);
});

test('MedicineListQuerySchema coerces query strings with safe defaults', () => {
  const result = MedicineListQuerySchema.parse({ page: '2', isColdChain: 'true', search: '  ' });
  assert.equal(result.page, 2);
  assert.equal(result.limit, 20);
  assert.equal(result.isColdChain, true);
  assert.equal(result.search, undefined);
  assert.equal(MedicineListQuerySchema.safeParse({ limit: '500' }).success, false);
  assert.equal(MedicineListQuerySchema.safeParse({ sortBy: 'password' }).success, false);
});

const csvRow = {
  name: 'Augmentin 625mg',
  generic_name: 'Amoxicillin / Clavulanic Acid',
  brand_manufacturer: 'GSK',
  category: 'Antibiotics',
  strength: '625mg',
  dosage_form: 'tablet',
  barcode: '2000000000022',
  schedule_class: 'prescription only',
  requires_prescription: 'no',
  mrp: '95.00',
  base_unit_name: 'Tablet',
  units_per_packet: '7',
  packets_per_box: '2',
  price_box: '1300',
};

test('parseCsvMedicineRow maps and validates a CSV record', () => {
  const result = parseCsvMedicineRow(csvRow);
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.categoryName, 'Antibiotics');
  assert.equal(result.medicine.scheduleClass, 'PRESCRIPTION_ONLY');
  assert.equal(result.medicine.dosageForm, 'TABLET');
  assert.deepEqual(result.medicine.priceOverrides, [{ packagingLevel: 'BOX', sellingPrice: 1300 }]);
});

test('parseCsvMedicineRow reports field-specific CSV column errors', () => {
  const missingBarcode = parseCsvMedicineRow({ ...csvRow, barcode: '' });
  assert.equal(missingBarcode.success, false);
  if (!missingBarcode.success) assert.equal(missingBarcode.errors[0].column, 'barcode');

  const negativePack = parseCsvMedicineRow({ ...csvRow, units_per_packet: '-3' });
  assert.equal(negativePack.success, false);
  if (!negativePack.success) assert.equal(negativePack.errors[0].column, 'units_per_packet');

  const overMrp = parseCsvMedicineRow({ ...csvRow, price_box: '1400' });
  assert.equal(overMrp.success, false);
  if (!overMrp.success) assert.equal(overMrp.errors[0].column, 'price_box');

  const badNumber = parseCsvMedicineRow({ ...csvRow, mrp: 'abc' });
  assert.equal(badNumber.success, false);
  if (!badNumber.success) assert.equal(badNumber.errors[0].column, 'mrp');
});
