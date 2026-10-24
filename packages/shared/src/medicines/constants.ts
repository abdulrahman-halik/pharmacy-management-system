export const SCHEDULE_CLASSES = ['OTC', 'PRESCRIPTION_ONLY', 'CONTROLLED_II'] as const;
export type ScheduleClass = (typeof SCHEDULE_CLASSES)[number];

export const STORAGE_CONDITIONS = ['ROOM_TEMPERATURE', 'COLD_CHAIN', 'DEEP_FREEZE'] as const;
export type StorageCondition = (typeof STORAGE_CONDITIONS)[number];

/** Storage conditions that require a monitored cold chain. */
export const COLD_CHAIN_CONDITIONS: readonly StorageCondition[] = ['COLD_CHAIN', 'DEEP_FREEZE'];

export const DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'INJECTION',
  'CREAM',
  'DROPS',
  'INHALER',
  'SUPPOSITORY',
  'POWDER',
] as const;
export type DosageForm = (typeof DOSAGE_FORMS)[number];

export const MEDICINE_SORT_FIELDS = ['name', 'genericName', 'createdAt', 'scheduleClass'] as const;
export type MedicineSortField = (typeof MEDICINE_SORT_FIELDS)[number];

export const TYPEAHEAD_MIN_CHARS = 2;
export const TYPEAHEAD_MAX_RESULTS = 15;

export const CSV_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const CSV_IMPORT_MAX_ROWS = 10_000;

export const CSV_IMPORT_COLUMNS = [
  'name',
  'generic_name',
  'brand_manufacturer',
  'category',
  'strength',
  'dosage_form',
  'barcode',
  'qr_code',
  'nsqu_code',
  'hsn_code',
  'vat_percentage',
  'is_vat_exempt',
  'reorder_level',
  'rack_location',
  'schedule_class',
  'storage_condition',
  'requires_prescription',
  'mrp',
  'base_unit_name',
  'units_per_packet',
  'packets_per_box',
  'boxes_per_carton',
  'price_unit',
  'price_packet',
  'price_box',
  'price_carton',
] as const;
export type CsvImportColumn = (typeof CSV_IMPORT_COLUMNS)[number];
