import type {
  PackagingLevel,
  PaymentMethodType,
  SaleStatus,
  SplitPayment,
  Customer,
  Prescription,
  EscPosReceiptData,
} from '@pharmacy/shared';

export interface PosLineItem {
  id: string; // Unique line item key
  medicineId: string;
  medicineName: string;
  genericName?: string;
  brandManufacturer?: string;
  packagingLevel: PackagingLevel;
  quantity: number;
  unitPriceLkr: number;
  totalPriceLkr: number;
  availableStock: number;
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  fefoBatchNumber?: string;
  fefoExpiryDate?: string;
}

export interface PosBasket {
  id: string;
  name: string;
  items: PosLineItem[];
  customer: Customer | null;
  prescription: Prescription | null;
  discountLkr: number;
  isVatApplicable: boolean;
  isSsclApplicable: boolean;
  loyaltyRedeemedLkr: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineSearchItem {
  id: string;
  name: string;
  genericName?: string;
  brandManufacturer?: string;
  dosageForm: string;
  strength?: string;
  barcode?: string;
  mrp: number;
  requiresPrescription: boolean;
  isControlledSubstance: boolean;
  packagingHierarchy?: {
    baseUnitName: string;
    unitsPerPacket: number;
    packetsPerBox?: number;
    boxesPerCarton?: number;
  } | null;
  totalStockUnits: number;
  earliestExpiry?: string;
  earliestBatchNumber?: string;
}
