"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LKSLMCRegSchema = exports.LKNICSchema = exports.LKPhoneSchema = exports.LK_SLMC_REG_REGEX = exports.LK_NIC_REGEX = exports.LK_PHONE_REGEX = void 0;
exports.normalizeLKPhone = normalizeLKPhone;
exports.isValidLKPhone = isValidLKPhone;
exports.isValidLKNIC = isValidLKNIC;
exports.isValidLKSLMC = isValidLKSLMC;
const zod_1 = require("zod");
/**
 * Sri Lankan Identity & Phone Regex Standards
 */
// Supports mobile operators (Dialog, Mobitel, Airtel, Hutch): e.g. +94771234567, 0771234567
exports.LK_PHONE_REGEX = /^(?:\+94|0)(?:7[01245678]\d{7})$/;
// Supports 9-digit old NIC (e.g. 912345678V) and 12-digit new NIC (e.g. 199123456789)
exports.LK_NIC_REGEX = /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/;
// SLMC (Sri Lanka Medical Council) Doctor Registration Number
exports.LK_SLMC_REG_REGEX = /^[A-Za-z0-9\/-]{3,20}$/;
exports.LKPhoneSchema = zod_1.z
    .string()
    .trim()
    .regex(exports.LK_PHONE_REGEX, {
    message: 'Invalid Sri Lankan mobile phone number. Format should be +947XXXXXXXX or 07XXXXXXXX',
});
exports.LKNICSchema = zod_1.z
    .string()
    .trim()
    .regex(exports.LK_NIC_REGEX, {
    message: 'Invalid Sri Lankan NIC number. Must be 9 digits followed by V/X or 12 digits.',
});
exports.LKSLMCRegSchema = zod_1.z
    .string()
    .trim()
    .regex(exports.LK_SLMC_REG_REGEX, {
    message: 'Invalid SLMC Doctor Registration number format.',
});
function normalizeLKPhone(phone) {
    const cleaned = phone.replace(/[\s\-]/g, '');
    if (cleaned.startsWith('0')) {
        return '+94' + cleaned.slice(1);
    }
    return cleaned;
}
function isValidLKPhone(phone) {
    return exports.LK_PHONE_REGEX.test(phone.trim());
}
function isValidLKNIC(nic) {
    return exports.LK_NIC_REGEX.test(nic.trim());
}
function isValidLKSLMC(slmc) {
    return exports.LK_SLMC_REG_REGEX.test(slmc.trim());
}
//# sourceMappingURL=lk-validators.js.map