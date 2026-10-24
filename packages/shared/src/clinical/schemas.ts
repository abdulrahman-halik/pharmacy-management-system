import { z } from 'zod';
import {
  LKPhoneSchema,
  LKNICSchema,
  LKSLMCRegSchema,
  normalizeLKPhone,
} from '../schemas/lk-validators.js';
import {
  PRESCRIPTION_STATUSES,
  PRESCRIPTION_ITEM_STATUSES,
  PRESCRIPTION_REJECTION_REASONS,
  CUSTOMER_CREDIT_LEDGER_TYPES,
  CUSTOMER_LOYALTY_LEDGER_TYPES,
} from './constants.js';

export const CreateCustomerSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  phone: LKPhoneSchema.transform(normalizeLKPhone),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  nicOrPassport: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  dob: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  gender: z
    .enum(['MALE', 'FEMALE', 'OTHER'])
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  address: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  allergies: z.array(z.string().trim().min(1)).default([]),
  medicalNotes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  creditLimit: z.coerce.number().min(0, 'Credit limit cannot be negative').default(0),
});
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const CustomerQuerySchema = z.object({
  search: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  nic: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type CustomerQueryInput = z.infer<typeof CustomerQuerySchema>;

export const RecordCustomerCreditTransactionSchema = z.object({
  entryType: z.enum(CUSTOMER_CREDIT_LEDGER_TYPES),
  amount: z.coerce.number().positive('Amount must be positive'),
  referenceType: z.string().trim().max(50).optional().nullable(),
  referenceId: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
});
export type RecordCustomerCreditTransactionInput = z.infer<typeof RecordCustomerCreditTransactionSchema>;

export const RecordCustomerLoyaltyTransactionSchema = z.object({
  entryType: z.enum(CUSTOMER_LOYALTY_LEDGER_TYPES),
  points: z.coerce.number().int().positive('Points must be a positive integer'),
  referenceType: z.string().trim().max(50).optional().nullable(),
  referenceId: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(255).optional().nullable(),
});
export type RecordCustomerLoyaltyTransactionInput = z.infer<typeof RecordCustomerLoyaltyTransactionSchema>;

export const CreateDoctorSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  registrationNumber: LKSLMCRegSchema,
  specialization: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  clinicName: z
    .string()
    .trim()
    .max(120)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  mobileNumber: z
    .string()
    .trim()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
  clinicAddress: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});
export type CreateDoctorInput = z.infer<typeof CreateDoctorSchema>;

export const UpdateDoctorSchema = CreateDoctorSchema.partial();
export type UpdateDoctorInput = z.infer<typeof UpdateDoctorSchema>;

export const DoctorQuerySchema = z.object({
  search: z.string().trim().optional(),
  registrationNumber: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type DoctorQueryInput = z.infer<typeof DoctorQuerySchema>;

export const CreatePrescriptionItemSchema = z.object({
  medicineId: z.string().trim().min(1, 'Medicine ID is required'),
  dosage: z.string().trim().min(1, 'Dosage instructions are required').max(80),
  durationDays: z.coerce.number().int().min(1, 'Duration must be at least 1 day').default(5),
  prescribedQuantityBaseUnits: z.coerce
    .number()
    .int()
    .min(1, 'Prescribed quantity must be at least 1 base unit'),
  refillAllowed: z.boolean().default(false),
  refillsAllowedCount: z.coerce.number().int().min(0).default(0),
  refillIntervalDays: z.coerce.number().int().min(1).default(30),
});
export type CreatePrescriptionItemInput = z.infer<typeof CreatePrescriptionItemSchema>;

export const CreatePrescriptionSchema = z
  .object({
    customerId: z.string().trim().min(1, 'Customer ID is required'),
    doctorId: z.string().trim().min(1, 'Doctor ID is required'),
    issuedDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Issued date must be YYYY-MM-DD'),
    validUntil: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}/, 'Valid until date must be YYYY-MM-DD'),
    imageUrls: z.array(z.string().trim().min(1)).min(1, 'At least one prescription image is required'),
    items: z.array(CreatePrescriptionItemSchema).min(1, 'At least one prescription line item is required'),
  })
  .refine((data) => new Date(data.validUntil) >= new Date(data.issuedDate), {
    message: 'Validity expiration date must be on or after the issued date',
    path: ['validUntil'],
  });
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;

export const VerifyPrescriptionItemDecisionSchema = z.object({
  itemId: z.string().trim().min(1, 'Prescription item ID is required'),
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().trim().max(255).optional(),
});
export type VerifyPrescriptionItemDecisionInput = z.infer<typeof VerifyPrescriptionItemDecisionSchema>;

export const VerifyPrescriptionSchema = z.object({
  itemDecisions: z
    .array(VerifyPrescriptionItemDecisionSchema)
    .min(1, 'Must provide decisions for prescription items'),
  rejectionReason: z.enum(PRESCRIPTION_REJECTION_REASONS).optional().nullable(),
  pharmacistNotes: z.string().trim().max(500).optional(),
});
export type VerifyPrescriptionInput = z.infer<typeof VerifyPrescriptionSchema>;

export const ClinicalCartItemSchema = z.object({
  medicineId: z.string().trim().min(1),
  quantityBaseUnits: z.coerce.number().int().positive('Quantity must be greater than zero'),
  batchId: z.string().trim().optional(),
  prescriptionItemId: z.string().trim().optional(),
});
export type ClinicalCartItemInput = z.infer<typeof ClinicalCartItemSchema>;

export const ValidateClinicalCartSchema = z.object({
  customerId: z.string().trim().optional().nullable(),
  prescriptionId: z.string().trim().optional().nullable(),
  doctorId: z.string().trim().optional().nullable(),
  items: z.array(ClinicalCartItemSchema).min(1, 'Cart items cannot be empty'),
  pharmacistOverrideCode: z.string().trim().optional(),
});
export type ValidateClinicalCartInput = z.infer<typeof ValidateClinicalCartSchema>;

export const ControlledSubstanceQuerySchema = z.object({
  medicineId: z.string().trim().optional(),
  customerId: z.string().trim().optional(),
  doctorId: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ControlledSubstanceQueryInput = z.infer<typeof ControlledSubstanceQuerySchema>;
