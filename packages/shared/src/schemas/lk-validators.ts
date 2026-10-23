import { z } from 'zod';

/**
 * Sri Lankan Identity & Phone Regex Standards
 */

// Supports mobile operators (Dialog, Mobitel, Airtel, Hutch): e.g. +94771234567, 0771234567
export const LK_PHONE_REGEX = /^(?:\+94|0)(?:7[01245678]\d{7})$/;

// Supports 9-digit old NIC (e.g. 912345678V) and 12-digit new NIC (e.g. 199123456789)
export const LK_NIC_REGEX = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;

// SLMC (Sri Lanka Medical Council) Doctor Registration Number
export const LK_SLMC_REG_REGEX = /^[A-Za-z0-9\/-]{3,20}$/;

export const LKPhoneSchema = z
  .string()
  .trim()
  .regex(LK_PHONE_REGEX, {
    message: 'Invalid Sri Lankan mobile phone number. Format should be +947XXXXXXXX or 07XXXXXXXX',
  });

export const LKNICSchema = z
  .string()
  .trim()
  .regex(LK_NIC_REGEX, {
    message: 'Invalid Sri Lankan NIC number. Must be 9 digits followed by V/X or 12 digits.',
  });

export const LKSLMCRegSchema = z
  .string()
  .trim()
  .regex(LK_SLMC_REG_REGEX, {
    message: 'Invalid SLMC Doctor Registration number format.',
  });

export function normalizeLKPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (cleaned.startsWith('0')) {
    return '+94' + cleaned.slice(1);
  }
  return cleaned;
}

export function isValidLKPhone(phone: string): boolean {
  return LK_PHONE_REGEX.test(phone.trim());
}

export function isValidLKNIC(nic: string): boolean {
  return LK_NIC_REGEX.test(nic.trim());
}

export function isValidLKSLMC(slmc: string): boolean {
  return LK_SLMC_REG_REGEX.test(slmc.trim());
}
