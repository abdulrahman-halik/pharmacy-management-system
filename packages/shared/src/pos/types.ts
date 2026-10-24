import type { PackagingLevel } from '../utils/packaging.js';
import type { PaymentMethodType, SaleStatus } from './constants.js';

export interface SplitPayment {
  method: PaymentMethodType;
  amount: number;
  reference?: string;
}

export interface CheckoutItemInput {
  medicineId: string;
  packagingLevel: PackagingLevel;
  quantity: number;
  unitPriceLkr: number;
}

export interface CheckoutInput {
  customerId?: string | null;
  prescriptionId?: string | null;
  items: CheckoutItemInput[];
  discountLkr?: number;
  isVatApplicable?: boolean;
  isSsclApplicable?: boolean;
  loyaltyRedeemedLkr?: number;
  splitPayments: SplitPayment[];
  idempotencyKey?: string | null;
  notes?: string | null;
}

export interface SaleItemAllocationDto {
  id?: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  allocatedBaseUnits: number;
  unitCostAtSale: number;
}

export interface SaleItemDto {
  id?: string;
  medicineId: string;
  medicineName?: string;
  genericName?: string;
  packagingLevel: PackagingLevel;
  quantitySold: number;
  totalBaseUnits: number;
  unitPriceLkr: number;
  totalPriceLkr: number;
  allocations: SaleItemAllocationDto[];
}

export interface SaleDto {
  id: string;
  storeId?: number;
  invoiceNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  cashierUserId: string;
  cashierName?: string | null;
  subtotalLkr: number;
  discountLkr: number;
  taxVatLkr: number;
  taxSsclLkr: number;
  loyaltyRedeemedLkr: number;
  roundOffLkr: number;
  grandTotalLkr: number;
  paidAmountLkr: number;
  changeGivenLkr: number;
  splitPayments: SplitPayment[];
  status: SaleStatus;
  prescriptionId?: string | null;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  items: SaleItemDto[];
}

export interface SaleQueryInput {
  search?: string;
  customerId?: string;
  cashierUserId?: string;
  status?: SaleStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ReceiptPharmacyHeader {
  storeName: string;
  branchName: string;
  address: string;
  phone: string;
  mobile?: string;
  nmraLicenseNo: string;
  vatTinNo?: string;
  ssclNo?: string;
}

export interface EscPosReceiptData {
  header: ReceiptPharmacyHeader;
  invoiceNumber: string;
  dateStr: string;
  cashierName: string;
  customerName: string;
  items: Array<{
    medicineName: string;
    packagingLevel: string;
    quantity: number;
    baseUnits: number;
    batchNumber: string;
    expiryDate: string; // MM/YY
    priceLkr: number;
  }>;
  subtotalLkr: number;
  discountLkr: number;
  taxVatLkr: number;
  taxSsclLkr: number;
  roundOffLkr: number;
  grandTotalLkr: number;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  changeGivenLkr: number;
  loyaltyEarnedPoints?: number;
  footerNotes?: string[];
  rawEscPosText: string;
}
