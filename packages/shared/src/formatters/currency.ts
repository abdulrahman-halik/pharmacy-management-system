/**
 * Currency & Formatting Engine for Sri Lankan Rupee (LKR)
 */

export function formatLKR(amount: number | string): string {
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

export function roundToNearestRupee(amount: number): number {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 0;
  }
  return Math.round(amount);
}

export function parseLKR(formattedText: string): number {
  if (!formattedText) return 0;
  const clean = formattedText.replace(/Rs\.|LKR|,|\s/g, '').trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}
