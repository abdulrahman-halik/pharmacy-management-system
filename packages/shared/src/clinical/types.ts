import {
  PrescriptionStatus,
  PrescriptionItemStatus,
  CustomerCreditLedgerType,
  CustomerLoyaltyLedgerType,
} from './constants.js';

export interface Customer {
  id: string;
  storeId: number;
  fullName: string;
  phone: string;
  email?: string | null;
  nicOrPassport?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  allergies?: string[] | null;
  medicalNotes?: string | null;
  creditLimit: number;
  creditBalance: number;
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreditLedger {
  id: string;
  storeId: number;
  customerId: string;
  entryType: CustomerCreditLedgerType;
  amount: number;
  runningBalance: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface CustomerLoyaltyLedger {
  id: string;
  storeId: number;
  customerId: string;
  entryType: CustomerLoyaltyLedgerType;
  points: number;
  runningPoints: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  recordedBy: string;
  createdAt: string;
}

export interface Doctor {
  id: string;
  storeId: number;
  fullName: string;
  registrationNumber: string; // SLMC Registration No
  specialization?: string | null;
  clinicName?: string | null;
  mobileNumber?: string | null;
  clinicAddress?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  storeId: number;
  prescriptionId: string;
  medicineId: string;
  medicineName?: string;
  genericName?: string;
  dosage: string;
  durationDays: number;
  prescribedQuantityBaseUnits: number;
  dispensedQuantityBaseUnits: number;
  refillAllowed: boolean;
  refillsAllowedCount: number;
  refillsUsed: number;
  refillIntervalDays: number;
  lastDispensedAt?: string | null;
  itemStatus: PrescriptionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  storeId: number;
  rxNumber: string;
  customerId: string;
  customerName?: string;
  customerNic?: string | null;
  customerPhone?: string;
  customerAllergies?: string[];
  doctorId: string;
  doctorName?: string;
  doctorSlmc?: string;
  issuedDate: string;
  validUntil: string;
  status: PrescriptionStatus;
  imageUrls: string[];
  verifiedBy?: string | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ControlledSubstanceRegister {
  id: string;
  storeId: number;
  medicineId: string;
  medicineName?: string;
  batchId: string;
  batchNumber?: string;
  quantityBaseUnits: number;
  runningBalance: number;
  customerId: string;
  customerName?: string;
  customerNic: string;
  doctorId: string;
  doctorName?: string;
  doctorSlmcRegNo: string;
  prescriptionId: string;
  pharmacistUserId: string;
  pharmacistName?: string;
  createdAt: string;
}

export interface ClinicalCartValidationItem {
  medicineId: string;
  quantityBaseUnits: number;
  batchId?: string;
  prescriptionItemId?: string;
}

export interface ClinicalGateValidationPayload {
  customerId?: string | null;
  prescriptionId?: string | null;
  doctorId?: string | null;
  items: ClinicalCartValidationItem[];
  pharmacistOverrideCode?: string;
}

export interface ClinicalGateValidationResult {
  allowed: boolean;
  requiresPharmacistOverride: boolean;
  contraindications: Array<{
    medicineId: string;
    medicineName: string;
    genericName: string;
    matchedAllergy: string;
    message: string;
  }>;
  prescriptionErrors: Array<{
    medicineId: string;
    medicineName: string;
    reason: string;
  }>;
  controlledDrugViolations: Array<{
    medicineId: string;
    medicineName: string;
    reason: string;
  }>;
  refillViolations: Array<{
    itemId?: string;
    medicineId: string;
    medicineName: string;
    reason: string;
    daysRemaining?: number;
  }>;
}
