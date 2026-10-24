import { ValueTransformer } from 'typeorm';

/**
 * mysql2 returns DECIMAL columns as strings to avoid precision loss. Money columns
 * are DECIMAL(12,2), well inside the exact range of a JS number, so we expose numbers.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? null : Number(value)),
};
