import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePackagingMultipliers,
  convertToUnits,
  maxPriceCentsForLevel,
  toCents,
  unpackUnitsToHierarchy,
  type PackagingHierarchy,
} from './packaging.js';

const fullTier: PackagingHierarchy = { baseUnitName: 'Tablets', unitsPerPacket: 10, packetsPerBox: 10, boxesPerCarton: 40 };
const packetOnly: PackagingHierarchy = { baseUnitName: 'Vials', unitsPerPacket: 5 };

test('computePackagingMultipliers resolves all four tiers', () => {
  assert.deepEqual(computePackagingMultipliers(fullTier), { UNIT: 1, PACKET: 10, BOX: 100, CARTON: 4000 });
});

test('computePackagingMultipliers leaves unconfigured tiers null', () => {
  assert.deepEqual(computePackagingMultipliers(packetOnly), { UNIT: 1, PACKET: 5, BOX: null, CARTON: null });
});

test('computePackagingMultipliers rejects invalid hierarchies', () => {
  assert.throws(() => computePackagingMultipliers({ ...fullTier, unitsPerPacket: 0 }), RangeError);
  assert.throws(() => computePackagingMultipliers({ ...fullTier, unitsPerPacket: 2.5 }), RangeError);
  assert.throws(() => computePackagingMultipliers({ ...fullTier, packetsPerBox: -1 }), RangeError);
  assert.throws(() => computePackagingMultipliers({ baseUnitName: 'x', unitsPerPacket: 1, boxesPerCarton: 2 }), RangeError);
});

test('convertToUnits multiplies by the tier factor', () => {
  assert.equal(convertToUnits(3, 'CARTON', fullTier), 12000);
  assert.equal(convertToUnits(7, 'UNIT', fullTier), 7);
  assert.equal(convertToUnits(0, 'BOX', fullTier), 0);
});

test('convertToUnits rejects unconfigured tiers and invalid quantities', () => {
  assert.throws(() => convertToUnits(1, 'BOX', packetOnly), /not configured/);
  assert.throws(() => convertToUnits(-1, 'UNIT', fullTier), RangeError);
  assert.throws(() => convertToUnits(1.5, 'PACKET', fullTier), RangeError);
});

test('Phase 3 invariant: 4,452 units unpack to 1 carton, 4 boxes, 5 packets, 2 units', () => {
  const result = unpackUnitsToHierarchy(4452, fullTier);
  assert.equal(result.cartons, 1);
  assert.equal(result.boxes, 4);
  assert.equal(result.packets, 5);
  assert.equal(result.looseUnits, 2);
  assert.equal(result.cartons * 4000 + result.boxes * 100 + result.packets * 10 + result.looseUnits, 4452);
  assert.equal(result.summary, '1 Carton 4 Boxes 5 Packets 2 Tablets');
});

test('unpackUnitsToHierarchy round-trips every quantity without loss', () => {
  for (let units = 0; units <= 9000; units += 37) {
    const r = unpackUnitsToHierarchy(units, fullTier);
    assert.equal(r.cartons * 4000 + r.boxes * 100 + r.packets * 10 + r.looseUnits, units);
  }
});

test('unpackUnitsToHierarchy handles zero and single-unit packets', () => {
  assert.equal(unpackUnitsToHierarchy(0, fullTier).summary, '0 Tablets');
  const single = unpackUnitsToHierarchy(7, { baseUnitName: 'Pcs', unitsPerPacket: 1 });
  assert.equal(single.packets, 0);
  assert.equal(single.looseUnits, 7);
});

test('price ceilings use integer cents', () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(maxPriceCentsForLevel(4.35, 'BOX', fullTier), 43500);
  assert.equal(maxPriceCentsForLevel(4.35, 'CARTON', packetOnly), null);
});
