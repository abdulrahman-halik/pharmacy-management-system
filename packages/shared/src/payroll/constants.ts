export const ADVANCE_STATUSES = [
  'OUTSTANDING',
  'PARTIALLY_RECOVERED',
  'CLEARED',
] as const;
export type AdvanceStatus = (typeof ADVANCE_STATUSES)[number];

export const PAYROLL_STATUSES = ['DRAFT', 'APPROVED', 'DISBURSED'] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const DISBURSEMENT_METHODS = ['CASH', 'BANK_TRANSFER'] as const;
export type DisbursementMethod = (typeof DISBURSEMENT_METHODS)[number];

/**
 * Sri Lanka Statutory Payroll Rates
 * - EPF Employee Contribution: 8% of base salary
 * - EPF Employer Contribution: 12% of base salary
 * - ETF Employer Contribution: 3% of base salary
 */
export const STATUTORY_RATES = {
  EPF_EMPLOYEE_PERCENT: 0.08,
  EPF_EMPLOYER_PERCENT: 0.12,
  ETF_EMPLOYER_PERCENT: 0.03,
} as const;

/**
 * Maximum mid-month advance limit (default: 50% of monthly base salary).
 * Any advance exceeding this threshold requires ADMIN approval.
 */
export const DEFAULT_ADVANCE_CAP_RATIO = 0.5;
