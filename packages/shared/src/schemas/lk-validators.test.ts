import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidLKPhone,
  isValidLKNIC,
  isValidLKSLMC,
  normalizeLKPhone,
  LKPhoneSchema,
  LKNICSchema,
} from './lk-validators.js';

test('Sri Lankan phone validation', () => {
  // Valid Dialog, Mobitel, Airtel, Hutch formats
  assert.equal(isValidLKPhone('0771234567'), true);
  assert.equal(isValidLKPhone('+94712345678'), true);
  assert.equal(isValidLKPhone('0701234567'), true);
  assert.equal(isValidLKPhone('0781234567'), true);

  // Invalid numbers
  assert.equal(isValidLKPhone('0112345678'), false); // Landline, not mobile
  assert.equal(isValidLKPhone('077123456'), false);  // Too short
  assert.equal(isValidLKPhone('+14155552671'), false); // US number
});

test('normalizeLKPhone standardizes 07X to +947X', () => {
  assert.equal(normalizeLKPhone('0771234567'), '+94771234567');
  assert.equal(normalizeLKPhone('+94771234567'), '+94771234567');
});

test('Sri Lankan NIC validation (old and new)', () => {
  // Old 9-digit format + V or X
  assert.equal(isValidLKNIC('912345678V'), true);
  assert.equal(isValidLKNIC('851234567X'), true);
  assert.equal(isValidLKNIC('912345678v'), true);

  // New 12-digit format
  assert.equal(isValidLKNIC('199123456789'), true);
  assert.equal(isValidLKNIC('200012345678'), true);

  // Invalid NICs
  assert.equal(isValidLKNIC('12345'), false);
  assert.equal(isValidLKNIC('912345678A'), false);
  assert.equal(isValidLKNIC('1991234567890'), false); // 13 digits
});

test('SLMC Doctor Registration validation', () => {
  assert.equal(isValidLKSLMC('SLMC-12345'), true);
  assert.equal(isValidLKSLMC('DOC/9876'), true);
  assert.equal(isValidLKSLMC('23456'), true);
  assert.equal(isValidLKSLMC('ab'), false); // Too short (< 3)
});
