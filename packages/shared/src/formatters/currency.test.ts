import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLKR, roundToNearestRupee, parseLKR } from './currency.js';

test('formatLKR formats valid amounts as Sri Lankan Rupee', () => {
  assert.equal(formatLKR(1250), 'Rs. 1,250.00');
  assert.equal(formatLKR(0), 'Rs. 0.00');
  assert.equal(formatLKR('450.5'), 'Rs. 450.50');
  assert.equal(formatLKR('1500000.75'), 'Rs. 1,500,000.75');
});

test('formatLKR handles invalid or NaN gracefully', () => {
  assert.equal(formatLKR('abc'), 'Rs. 0.00');
  assert.equal(formatLKR(NaN), 'Rs. 0.00');
});

test('roundToNearestRupee rounds correctly', () => {
  assert.equal(roundToNearestRupee(1250.49), 1250);
  assert.equal(roundToNearestRupee(1250.5), 1251);
  assert.equal(roundToNearestRupee(0), 0);
});

test('parseLKR parses formatted string back to number', () => {
  assert.equal(parseLKR('Rs. 1,250.50'), 1250.5);
  assert.equal(parseLKR('Rs. 0.00'), 0);
});
