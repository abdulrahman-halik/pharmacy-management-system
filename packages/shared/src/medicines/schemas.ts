import { z } from 'zod';
import {
  CSV_IMPORT_COLUMNS,
  DOSAGE_FORMS,
  MEDICINE_SORT_FIELDS,
  SCHEDULE_CLASSES,
  STORAGE_CONDITIONS,
  TYPEAHEAD_MIN_CHARS,
  type CsvImportColumn,
  type ScheduleClass,
} from './constants.js';
import {
  PACKAGING_LEVELS,
  computePackagingMultipliers,
  maxPriceCentsForLevel,
  toCents,
  type PackagingLevel,
} from '../utils/packaging.js';

const MAX_MONEY = 10_000_000;
const MAX_PACK_FACTOR = 10_000;

const blankToNull = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? null : value);

const nullableText = (max: number, pattern?: RegExp, patternMessage?: string) => {
  const base = z.string().trim().max(max);
  const text = pattern ? base.regex(pattern, patternMessage) : base;
  return z.preprocess(blankToNull, text.nullish()).transform((value) => value ?? null);
};

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const MoneySchema = z
  .number({ invalid_type_error: 'Must be a number' })
  .finite()
  .positive('Must be greater than zero')
  .max(MAX_MONEY)
  .refine(hasAtMostTwoDecimals, 'Must have at most 2 decimal places');

const packFactor = z.number().int('Must be a whole number').min(1, 'Must be at least 1').max(MAX_PACK_FACTOR);

export const PackagingSchema = z
  .object({
    baseUnitName: z.string().trim().min(1).max(32),
    unitsPerPacket: packFactor,
    packetsPerBox: packFactor.nullish().transform((v) => v ?? null),
    boxesPerCarton: packFactor.nullish().transform((v) => v ?? null),
  })
  .refine((p) => p.boxesPerCarton == null || p.packetsPerBox != null, {
    path: ['boxesPerCarton'],
    message: 'Configure packets per box before boxes per carton',
  });

export const PriceOverrideSchema = z.object({
  packagingLevel: z.enum(PACKAGING_LEVELS),
  sellingPrice: MoneySchema,
});

export const BARCODE_REGEX = /^[A-Za-z0-9-]{4,64}$/;
export const NSQU_CODE_REGEX = /^[A-Za-z0-9/\- ]{3,64}$/;

const MedicineFieldsSchema = z.object({
  name: z.string().trim().min(2).max(180),
  genericName: z.string().trim().min(2).max(180),
  brandManufacturer: z.string().trim().min(1).max(120),
  categoryId: z.preprocess(blankToNull, z.string().uuid().nullish()).transform((v) => v ?? null),
  strength: z.string().trim().min(1).max(60),
  dosageForm: z.enum(DOSAGE_FORMS).default('TABLET'),
  barcode: nullableText(64, BARCODE_REGEX, 'Barcode must be 4-64 letters, digits or dashes'),
  qrCode: nullableText(128),
  nsquCode: nullableText(64, NSQU_CODE_REGEX, 'Invalid NMRA registration code format'),
  hsnCode: nullableText(32),
  vatPercentage: z.number().min(0).max(100).refine(hasAtMostTwoDecimals, 'At most 2 decimals').default(0),
  isVatExempt: z.boolean().default(true),
  reorderLevel: z.number().int().min(0).max(10_000_000).default(50),
  rackLocation: nullableText(40),
  scheduleClass: z.enum(SCHEDULE_CLASSES).default('OTC'),
  storageCondition: z.enum(STORAGE_CONDITIONS).default('ROOM_TEMPERATURE'),
  requiresPrescription: z.boolean().default(false),
  mrp: MoneySchema.nullish().transform((v) => v ?? null),
  packaging: PackagingSchema,
  priceOverrides: z.array(PriceOverrideSchema).max(PACKAGING_LEVELS.length).default([]),
});

type MedicineFields = z.output<typeof MedicineFieldsSchema>;

function validatePriceOverrides(m: MedicineFields, ctx: z.RefinementCtx): void {
  if (!m.priceOverrides?.length || !m.packaging) return;

  if (m.mrp == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mrp'], message: 'MRP is required when price overrides are set' });
    return;
  }
  try {
    computePackagingMultipliers(m.packaging);
  } catch {
    return; // Packaging issues are already reported by PackagingSchema.
  }

  const seen = new Set<PackagingLevel>();
  m.priceOverrides.forEach((override, index) => {
    const path = ['priceOverrides', index, 'sellingPrice'];
    if (seen.has(override.packagingLevel)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `Duplicate price for ${override.packagingLevel}` });
      return;
    }
    seen.add(override.packagingLevel);

    const ceiling = maxPriceCentsForLevel(m.mrp as number, override.packagingLevel, m.packaging);
    if (ceiling == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `${override.packagingLevel} tier is not configured` });
    } else if (toCents(override.sellingPrice) > ceiling) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Selling price exceeds MRP ceiling of ${(ceiling / 100).toFixed(2)} for ${override.packagingLevel}`,
      });
    }
  });
}

function validateMedicineRules(m: MedicineFields, ctx: z.RefinementCtx): void {
  if (m.isVatExempt && m.vatPercentage > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vatPercentage'], message: 'VAT-exempt medicines must have 0% VAT' });
  }
  validatePriceOverrides(m, ctx);
}

export const CreateMedicineSchema = MedicineFieldsSchema.superRefine(validateMedicineRules);

/** PUT is a full replacement guarded by optimistic locking on `version`. */
export const UpdateMedicineSchema = MedicineFieldsSchema.extend({
  version: z.number().int().min(1),
}).superRefine(validateMedicineRules);

export type CreateMedicineInput = z.output<typeof CreateMedicineSchema>;
export type UpdateMedicineInput = z.output<typeof UpdateMedicineSchema>;
export type PackagingInput = z.output<typeof PackagingSchema>;
export type PriceOverrideInput = z.output<typeof PriceOverrideSchema>;

export interface RegulatoryFlags {
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  /** True when the requested prescription flag was overridden by regulation. */
  wasOverridden: boolean;
}

/** Prescription-only and Schedule II drugs can never be dispensed without a prescription. */
export function deriveRegulatoryFlags(scheduleClass: ScheduleClass, requestedRequiresPrescription: boolean): RegulatoryFlags {
  const isPrescriptionMandatory = scheduleClass !== 'OTC';
  return {
    requiresPrescription: isPrescriptionMandatory || requestedRequiresPrescription,
    isControlledSubstance: scheduleClass === 'CONTROLLED_II',
    wasOverridden: isPrescriptionMandatory && !requestedRequiresPrescription,
  };
}

const optionalQueryText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

export const MedicineListQuerySchema = z.object({
  search: optionalQueryText(100),
  categoryId: z.preprocess(blankToNull, z.string().uuid().nullish()).transform((v) => v ?? undefined),
  scheduleClass: z.enum(SCHEDULE_CLASSES).optional(),
  isColdChain: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(MEDICINE_SORT_FIELDS).default('name'),
  sortOrder: z.enum(['ASC', 'DESC']).default('ASC'),
});
export type MedicineListQuery = z.output<typeof MedicineListQuerySchema>;

export const TypeaheadQuerySchema = z.object({
  q: z.string().trim().min(TYPEAHEAD_MIN_CHARS, `Search term must be at least ${TYPEAHEAD_MIN_CHARS} characters`).max(100),
});

export const CategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: nullableText(255),
});
export type CategoryInput = z.output<typeof CategorySchema>;

export const CsvImportOptionsSchema = z.object({
  dryRun: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

/* ----------------------------- CSV row parsing ----------------------------- */

const csvText = z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined), z.string().optional());

const csvNumber = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() !== '' ? Number(v.trim()) : undefined),
  z.number({ invalid_type_error: 'Must be a number' }).optional(),
);

const csvBoolean = z.preprocess((v) => {
  if (typeof v !== 'string' || v.trim() === '') return undefined;
  if (/^(true|yes|y|1)$/i.test(v.trim())) return true;
  if (/^(false|no|n|0)$/i.test(v.trim())) return false;
  return v;
}, z.boolean({ invalid_type_error: 'Must be true/false' }).optional());

const csvEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : undefined),
    z.enum(values).optional(),
  );

const CsvRawRowSchema = z.object({
  name: csvText,
  generic_name: csvText,
  brand_manufacturer: csvText,
  category: csvText,
  strength: csvText,
  dosage_form: csvEnum(DOSAGE_FORMS),
  barcode: csvText.refine((v) => v !== undefined, 'Barcode is required for CSV import'),
  qr_code: csvText,
  nsqu_code: csvText,
  hsn_code: csvText,
  vat_percentage: csvNumber,
  is_vat_exempt: csvBoolean,
  reorder_level: csvNumber,
  rack_location: csvText,
  schedule_class: csvEnum(SCHEDULE_CLASSES),
  storage_condition: csvEnum(STORAGE_CONDITIONS),
  requires_prescription: csvBoolean,
  mrp: csvNumber,
  base_unit_name: csvText,
  units_per_packet: csvNumber,
  packets_per_box: csvNumber,
  boxes_per_carton: csvNumber,
  price_unit: csvNumber,
  price_packet: csvNumber,
  price_box: csvNumber,
  price_carton: csvNumber,
});
type CsvRawRow = z.output<typeof CsvRawRowSchema>;

export interface CsvFieldError {
  column: CsvImportColumn | 'row';
  message: string;
}

export type CsvRowParseResult =
  | { success: true; categoryName: string | null; medicine: CreateMedicineInput }
  | { success: false; errors: CsvFieldError[] };

const PRICE_COLUMNS: Record<PackagingLevel, keyof CsvRawRow> = {
  UNIT: 'price_unit',
  PACKET: 'price_packet',
  BOX: 'price_box',
  CARTON: 'price_carton',
};

function mapCsvRowToMedicine(row: CsvRawRow) {
  const priceOverrides = PACKAGING_LEVELS.filter((level) => row[PRICE_COLUMNS[level]] !== undefined).map((level) => ({
    packagingLevel: level,
    sellingPrice: row[PRICE_COLUMNS[level]],
  }));

  return {
    name: row.name,
    genericName: row.generic_name,
    brandManufacturer: row.brand_manufacturer,
    strength: row.strength,
    dosageForm: row.dosage_form,
    barcode: row.barcode,
    qrCode: row.qr_code,
    nsquCode: row.nsqu_code,
    hsnCode: row.hsn_code,
    vatPercentage: row.vat_percentage,
    isVatExempt: row.is_vat_exempt,
    reorderLevel: row.reorder_level,
    rackLocation: row.rack_location,
    scheduleClass: row.schedule_class,
    storageCondition: row.storage_condition,
    requiresPrescription: row.requires_prescription,
    mrp: row.mrp,
    packaging: {
      baseUnitName: row.base_unit_name ?? 'Unit',
      unitsPerPacket: row.units_per_packet ?? 1,
      packetsPerBox: row.packets_per_box,
      boxesPerCarton: row.boxes_per_carton,
    },
    priceOverrides,
  };
}

const camelToSnake = (value: string) => value.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function toCsvColumn(path: (string | number)[], overrides: { packagingLevel: PackagingLevel }[]): CsvFieldError['column'] {
  if (path[0] === 'priceOverrides' && typeof path[1] === 'number') {
    const level = overrides[path[1]]?.packagingLevel;
    return level ? (PRICE_COLUMNS[level] as CsvImportColumn) : 'row';
  }
  const column = camelToSnake(String(path[path.length - 1] ?? ''));
  return (CSV_IMPORT_COLUMNS as readonly string[]).includes(column) ? (column as CsvImportColumn) : 'row';
}

/** Validates one CSV record through the same CreateMedicineSchema used by the REST API. */
export function parseCsvMedicineRow(raw: Record<string, unknown>): CsvRowParseResult {
  const rawResult = CsvRawRowSchema.safeParse(raw);
  if (!rawResult.success) {
    return {
      success: false,
      errors: rawResult.error.issues.map((i) => ({ column: String(i.path[0]) as CsvImportColumn, message: i.message })),
    };
  }

  const mapped = mapCsvRowToMedicine(rawResult.data);
  const result = CreateMedicineSchema.safeParse(mapped);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((i) => ({ column: toCsvColumn(i.path, mapped.priceOverrides), message: i.message })),
    };
  }

  const categoryName = rawResult.data.category ?? null;
  if (categoryName && categoryName.length > 80) {
    return { success: false, errors: [{ column: 'category', message: 'Category name must be at most 80 characters' }] };
  }
  return { success: true, categoryName, medicine: result.data };
}
