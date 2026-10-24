import type { DosageForm, ScheduleClass, StorageCondition } from './constants.js';
import type { PackagingLevel, PackagingMultipliers } from '../utils/packaging.js';

export interface CategoryDto {
  id: string;
  name: string;
  description: string | null;
  medicineCount?: number;
}

export interface MedicinePackagingDto {
  baseUnitName: string;
  unitsPerPacket: number;
  packetsPerBox: number | null;
  boxesPerCarton: number | null;
  multipliers: PackagingMultipliers;
}

export interface MedicinePriceOverrideDto {
  packagingLevel: PackagingLevel;
  sellingPrice: number;
}

export interface MedicineDto {
  id: string;
  version: number;
  name: string;
  genericName: string;
  brandManufacturer: string;
  category: Pick<CategoryDto, 'id' | 'name'> | null;
  strength: string;
  dosageForm: DosageForm;
  barcode: string | null;
  qrCode: string | null;
  nsquCode: string | null;
  hsnCode: string | null;
  vatPercentage: number;
  isVatExempt: boolean;
  reorderLevel: number;
  rackLocation: string | null;
  scheduleClass: ScheduleClass;
  storageCondition: StorageCondition;
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  mrp: number | null;
  packaging: MedicinePackagingDto;
  priceOverrides: MedicinePriceOverrideDto[];
  createdAt: string;
  updatedAt: string;
}

export type MedicineTypeaheadItem = Pick<
  MedicineDto,
  | 'id'
  | 'name'
  | 'genericName'
  | 'strength'
  | 'dosageForm'
  | 'barcode'
  | 'scheduleClass'
  | 'storageCondition'
  | 'requiresPrescription'
>;

export type CsvImportStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CsvImportRowError {
  line: number;
  column: string;
  message: string;
}

export interface CsvImportJobStatusDto {
  jobId: string;
  status: CsvImportStatus;
  dryRun: boolean;
  totalRows: number;
  processedRows: number;
  insertedRows: number;
  errorCount: number;
  errors: CsvImportRowError[];
  errorReportUrl: string | null;
  failureReason: string | null;
}
