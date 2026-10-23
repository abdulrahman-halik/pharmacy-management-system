"use strict";
/**
 * Currency & Formatting Engine for Sri Lankan Rupee (LKR)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLKR = formatLKR;
exports.roundToNearestRupee = roundToNearestRupee;
exports.parseLKR = parseLKR;
function formatLKR(amount) {
    const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numeric) || numeric === null || numeric === undefined) {
        return 'Rs. 0.00';
    }
    return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })
        .format(numeric)
        .replace('LKR', 'Rs.')
        .replace(/\u00A0/g, ' ')
        .trim();
}
function roundToNearestRupee(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
        return 0;
    }
    return Math.round(amount);
}
function parseLKR(formattedText) {
    if (!formattedText)
        return 0;
    const clean = formattedText.replace(/Rs\.|LKR|,|\s/g, '').trim();
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}
//# sourceMappingURL=currency.js.map