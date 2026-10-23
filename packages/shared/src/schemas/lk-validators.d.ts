import { z } from 'zod';
/**
 * Sri Lankan Identity & Phone Regex Standards
 */
export declare const LK_PHONE_REGEX: RegExp;
export declare const LK_NIC_REGEX: RegExp;
export declare const LK_SLMC_REG_REGEX: RegExp;
export declare const LKPhoneSchema: z.ZodString;
export declare const LKNICSchema: z.ZodString;
export declare const LKSLMCRegSchema: z.ZodString;
export declare function normalizeLKPhone(phone: string): string;
export declare function isValidLKPhone(phone: string): boolean;
export declare function isValidLKNIC(nic: string): boolean;
export declare function isValidLKSLMC(slmc: string): boolean;
//# sourceMappingURL=lk-validators.d.ts.map