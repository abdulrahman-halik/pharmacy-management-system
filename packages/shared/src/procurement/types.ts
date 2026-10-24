import type { PackagingLevel } from '../utils/packaging.js';
import type {
  PurchaseOrderStatus,
  GrnPaymentStatus,
  SupplierPaymentMethod,
  PurchaseReturnReason,
} from './constants.js';

export interface SupplierDto {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  phone: string;
  email?: string | null;
  address?: string | null;
  taxTinNumber?: string | null;
  paymentTermsDays: number;
  outstandingPayableLkr: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemDto {
  id?: string;
  purchaseOrderId?: string;
  medicineId: string;
  medicineName?: string;
  genericName?: string;
  packagingLevel: PackagingLevel;
  quantity: number;
  unitCostLkr: number;
  lineTotalLkr: number;
  receivedQuantity: number;
}

export interface PurchaseOrderDto {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName?: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: PurchaseOrderStatus;
  totalAmountLkr: number;
  notes?: string | null;
  items: PurchaseOrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceivedNoteItemDto {
  id?: string;
  grnId?: string;
  medicineId: string;
  medicineName?: string;
  genericName?: string;
  batchNumber: string;
  mfdDate?: string | null;
  expiryDate: string;
  packagingLevel: PackagingLevel;
  purchasedQuantity: number;
  bonusQuantity: number;
  totalReceivedBaseUnits: number;
  purchasePriceLkr: number;
  lineTotalLkr: number;
  netLandedCostPerBaseUnit: number;
  batchMrpPerBaseUnit: number;
}

export interface GoodsReceivedNoteDto {
  id: string;
  grnNumber: string;
  supplierId: string;
  supplierName?: string;
  purchaseOrderId?: string | null;
  poNumber?: string | null;
  supplierInvoiceNumber: string;
  receivedDate: string;
  subtotalLkr: number;
  taxVatLkr: number;
  grandTotalLkr: number;
  paidAmountLkr: number;
  paymentStatus: GrnPaymentStatus;
  receivedByUserId: string;
  receivedByName?: string;
  notes?: string | null;
  items: GoodsReceivedNoteItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GrnAllocationDto {
  grnId: string;
  amount: number;
}

export interface SupplierPaymentDto {
  id: string;
  paymentNumber: string;
  supplierId: string;
  supplierName?: string;
  paymentDate: string;
  amountLkr: number;
  paymentMethod: SupplierPaymentMethod;
  reference?: string | null;
  bankAccountId?: string | null;
  notes?: string | null;
  grnAllocations?: GrnAllocationDto[];
  createdAt: string;
}

export interface PurchaseReturnItemDto {
  id?: string;
  returnId?: string;
  batchId: string;
  medicineId?: string;
  medicineName?: string;
  batchNumber?: string;
  quantityBaseUnits: number;
  unitCostPrice: number;
  lineTotalLkr: number;
  reason?: string | null;
}

export interface PurchaseReturnDto {
  id: string;
  returnNumber: string;
  supplierId: string;
  supplierName?: string;
  returnDate: string;
  totalRefundLkr: number;
  reason: PurchaseReturnReason;
  notes?: string | null;
  items: PurchaseReturnItemDto[];
  createdAt: string;
}

export interface StatementEntryDto {
  id: string;
  date: string;
  type: 'GRN_INVOICE' | 'PAYMENT' | 'PURCHASE_RETURN';
  referenceNumber: string;
  description: string;
  debitLkr: number; // Increases what we owe (GRN invoice)
  creditLkr: number; // Decreases what we owe (Payment, Return)
  runningBalanceLkr: number;
}

export interface SupplierStatementDto {
  supplier: SupplierDto;
  startDate?: string;
  endDate?: string;
  openingBalanceLkr: number;
  closingBalanceLkr: number;
  totalInvoicedLkr: number;
  totalPaidLkr: number;
  totalReturnedLkr: number;
  entries: StatementEntryDto[];
}
