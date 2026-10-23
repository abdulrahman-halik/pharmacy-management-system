# Phase 5: Doctors, Customers & Prescription Gatekeeper

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 5  
**Architecture Layer:** Patient 360, Prescriber Registry, Digital Rx Verification & Regulatory Controlled Drugs Log  
**Primary Tech Stack:** NestJS 10, TypeORM, MinIO (S3 SDK), React 18, React-Zoom-Pan-Pinch, TanStack Table  
**Regulatory Standards:** Sri Lanka Medical Council (SLMC) Registration, NMRA Controlled Substances & Dangerous Drugs Ordinance

---

## 1. Executive Summary & Scope

Phase 5 implements the clinical governance and legal compliance layer for the pharmacy management system. In pharmaceutical practice, dispensing prescription-only medicines (POM) and Schedule II/Narcotics requires strict traceability to registered medical practitioners with valid medical council licenses and verified patient identification (NIC/Passport) details. Phase 5 introduces a Customer 360 registry with credit and loyalty ledgers, a validated doctor directory, a digital prescription verification workspace with high-resolution image inspection, and an immutable Controlled Substance Register.

### In-Scope Deliverables
1. **Customer 360 Registry (`customers`):**
   - Full demographic, contact (+94 format), and Sri Lankan NIC/Passport tracking.
   - Structured generic allergy tagging (linked to `medicines.generic_name`) with automated drug-allergy contraindication checks.
   - Financial customer ledgers: `customer_credit_ledger` (with credit limits in LKR) and `customer_loyalty_ledger` (points earn and redemption).
2. **Sri Lanka Medical Council (SLMC) Doctor Registry (`doctors`):**
   - Doctor directory enforcing unique SLMC registration codes, medical specializations, and clinic contact data.
3. **Digital Prescription Verification Workflow (`prescriptions` & `prescription_items`):**
   - Multi-image prescription intake stored securely in MinIO object storage.
   - Line-item prescription approval tracking prescribed vs. dispensed quantities, refill quotas (`refills_allowed_count`, `refill_interval_days`), and validity expiration.
   - Strict Clinical Gatekeeper: Only users with `PHARMACIST`, `MANAGER`, or `ADMIN` roles can approve prescriptions. `CASHIER` accounts are hard-blocked from approving prescription line items.
4. **Legally Mandated Controlled Substance Register (`controlled_substance_register`):**
   - Immutable dangerous drugs and narcotics log recording every dispensed Schedule II drug, linking patient NIC, prescribing doctor's SLMC number, batch number, and dispensing pharmacist.
5. **Frontend Clinical Verification Workspace:**
   - High-performance side-by-side inspection layout: Left panel features full-screen zoom, pan, and rotation for prescription photos; right panel provides itemized drug matching, dosage validation, and approval checkboxes.

### Prerequisites & Dependencies
- **Phase 1 Deliverables:** MinIO S3 container and Tailwind clinical theme.
- **Phase 2 Deliverables:** Role-based permissions (`PRESCRIPTIONS.can_edit`).
- **Phase 3 Deliverables:** Medicine master records, generic drug indexing, and `requires_prescription` flags.

### Downstream Outputs
- Approved prescription linkage required for checkout in **Phase 6 (POS Terminal)**.
- Customer credit balance updates consumed by **Phase 8 (Cashbook & Finance)**.
- Controlled substance register exports provided in **Phase 10 (Reports & Audit)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Customer Entity (`apps/api/src/modules/customers/entities/customer.entity.ts`)
```typescript
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { CustomerCreditLedger } from './customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from './customer-loyalty-ledger.entity';

@Entity('customers')
export class Customer extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Index()
  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string; // +94 format

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string;

  @Index()
  @Column({ name: 'nic_or_passport', type: 'varchar', length: 32, nullable: true })
  nicOrPassport?: string; // Sri Lankan NIC (9 digits + V/X or 12 digits)

  @Column({ name: 'dob', type: 'date', nullable: true })
  dob?: Date;

  @Column({ type: 'varchar', length: 16, nullable: true })
  gender?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'json', nullable: true })
  allergies?: string[]; // Array of generic drug names, e.g., ["Penicillin", "Sulfa", "Aspirin"]

  @Column({ name: 'medical_notes', type: 'text', nullable: true })
  medicalNotes?: string;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  creditLimit: number; // In LKR

  @Column({ name: 'credit_balance', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  creditBalance: number; // Current outstanding credit balance in LKR

  @Column({ name: 'loyalty_points', type: 'int', default: 0 })
  loyaltyPoints: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
```

#### Doctor Entity (`apps/api/src/modules/doctors/entities/doctor.entity.ts`)
```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('doctors')
export class Doctor extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string; // e.g. "Dr. K. A. Perera"

  @Index({ unique: true })
  @Column({ name: 'registration_number', type: 'varchar', length: 40 })
  registrationNumber: string; // Sri Lanka Medical Council (SLMC) Registration No

  @Column({ type: 'varchar', length: 80, nullable: true })
  specialization?: string; // e.g., "Consultant Physician", "Pediatrician", "Cardiologist"

  @Column({ name: 'clinic_name', type: 'varchar', length: 120, nullable: true })
  clinicName?: string;

  @Column({ name: 'mobile_number', type: 'varchar', length: 20, nullable: true })
  mobileNumber?: string;

  @Column({ name: 'clinic_address', type: 'text', nullable: true })
  clinicAddress?: string;
}
```

#### Prescription & Line Item Entities (`apps/api/src/modules/prescriptions/entities/prescription.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { PrescriptionItem } from './prescription-item.entity';

export enum PrescriptionStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  FULLY_DISPENSED = 'FULLY_DISPENSED',
}

@Entity('prescriptions')
export class Prescription extends BaseAppEntity {
  @Index({ unique: true })
  @Column({ name: 'rx_number', type: 'varchar', length: 40 })
  rxNumber: string; // e.g., "RX-202610-0089"

  @ManyToOne(() => Customer, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId: string;

  @ManyToOne(() => Doctor, { nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id', type: 'varchar', length: 64 })
  doctorId: string;

  @Column({ name: 'issued_date', type: 'date' })
  issuedDate: Date;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil: Date;

  @Column({ type: 'enum', enum: PrescriptionStatus, default: PrescriptionStatus.PENDING })
  status: PrescriptionStatus;

  @Column({ name: 'image_urls', type: 'json' })
  imageUrls: string[]; // MinIO S3 object keys

  @Column({ name: 'verified_by', type: 'varchar', length: 64, nullable: true })
  verifiedBy?: string; // Pharmacist user ID

  @Column({ name: 'verified_at', type: 'datetime', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 255, nullable: true })
  rejectionReason?: string;

  @OneToMany(() => PrescriptionItem, (item) => item.prescription, { cascade: true })
  items: PrescriptionItem[];
}
```

#### Prescription Item Entity (`apps/api/src/modules/prescriptions/entities/prescription-item.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Prescription } from './prescription.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';

export enum PrescriptionItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('prescription_items')
export class PrescriptionItem extends BaseAppEntity {
  @ManyToOne(() => Prescription, (rx) => rx.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'prescription_id' })
  prescription: Prescription;

  @Column({ name: 'prescription_id', type: 'varchar', length: 64 })
  prescriptionId: string;

  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ type: 'varchar', length: 80 })
  dosage: string; // e.g., "1 Tablet tds (three times a day) after meals"

  @Column({ name: 'duration_days', type: 'int', default: 5 })
  durationDays: number;

  @Column({ name: 'prescribed_quantity_base_units', type: 'int' })
  prescribedQuantityBaseUnits: number;

  @Column({ name: 'dispensed_quantity_base_units', type: 'int', default: 0 })
  dispensedQuantityBaseUnits: number;

  @Column({ name: 'refill_allowed', type: 'boolean', default: false })
  refillAllowed: boolean;

  @Column({ name: 'refills_allowed_count', type: 'int', default: 0 })
  refillsAllowedCount: number;

  @Column({ name: 'refills_used', type: 'int', default: 0 })
  refillsUsed: number;

  @Column({ name: 'refill_interval_days', type: 'int', default: 30 })
  refillIntervalDays: number;

  @Column({ name: 'last_dispensed_at', type: 'datetime', nullable: true })
  lastDispensedAt?: Date;

  @Column({ type: 'enum', enum: PrescriptionItemStatus, default: PrescriptionItemStatus.PENDING })
  itemStatus: PrescriptionItemStatus;
}
```

#### Controlled Substance Register Entity (`apps/api/src/modules/prescriptions/entities/controlled-substance-register.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { InventoryBatch } from '../../inventory/entities/inventory-batch.entity';

@Entity('controlled_substance_register')
@Index('idx_controlled_audit', ['medicineId', 'createdAt'])
export class ControlledSubstanceRegister extends BaseAppEntity {
  @ManyToOne(() => Medicine)
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @ManyToOne(() => InventoryBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: InventoryBatch;

  @Column({ name: 'batch_id', type: 'varchar', length: 64 })
  batchId: string;

  @Column({ name: 'quantity_base_units', type: 'int' })
  quantityBaseUnits: number;

  @Column({ name: 'running_balance', type: 'int' })
  runningBalance: number;

  @Column({ name: 'customer_id', type: 'varchar', length: 64 })
  customerId: string;

  @Column({ name: 'customer_nic', type: 'varchar', length: 32 })
  customerNic: string; // Patient NIC (Sri Lankan Legal Mandate)

  @Column({ name: 'doctor_id', type: 'varchar', length: 64 })
  doctorId: string;

  @Column({ name: 'doctor_slmc_reg_no', type: 'varchar', length: 40 })
  doctorSlmcRegNo: string; // Prescribing Doctor's SLMC Registration

  @Column({ name: 'prescription_id', type: 'varchar', length: 64 })
  prescriptionId: string;

  @Column({ name: 'pharmacist_user_id', type: 'varchar', length: 64 })
  pharmacistUserId: string; // Dispensing Pharmacist ID
}
```

---

## 3. Server-Side Clinical Gatekeeper Logic

### 3.1 Verification & Validation Gate (`apps/api/src/modules/prescriptions/services/prescription-gate.service.ts`)
When a cashier or pharmacist attempts to ring up items in POS:

1. **Prescription Requirement Check:** If any cart line contains `requires_prescription = true`, the checkout payload must provide a valid `prescriptionId`.
2. **Controlled Substance Rule:** If `is_controlled_substance = true`, the system verifies that the customer record has a verified Sri Lankan `nic_or_passport` and that the prescribing doctor has a valid `registrationNumber` (SLMC).
3. **Refill & Quantity Guard:** The total dispensed quantity cannot exceed `(prescribed_quantity × (1 + refills_allowed_count))`. If refilling, the elapsed days since `last_dispensed_at` must be `>= refill_interval_days`.
4. **Allergy Check:** The server cross-checks the customer's `allergies` array with the `generic_name` of all items in the cart. If a match is detected, the checkout is halted with an unskippable clinical warning:
   `CONTRAINDICATION: Patient has documented allergy to [Penicillin]. Pharmacist override code required.`

---

## 4. API Endpoints Specification

### Customers & Ledgers (`/api/v1/customers`)
- `GET /customers` -> Search by name, phone (+94), or NIC.
- `POST /customers` -> Register customer with allergy tags and credit limit.
- `GET /customers/:id/credit-ledger` -> Returns historical credit purchases, collections, and outstanding balance.
- `GET /customers/:id/loyalty` -> Returns loyalty points balance and redemption history.

### Doctors (`/api/v1/doctors`)
- `GET /doctors` -> List/search registered doctors by name or SLMC registration number.
- `POST /doctors` -> Register doctor (Validates SLMC format).

### Prescriptions & Verification (`/api/v1/prescriptions`)
- `POST /prescriptions/upload` -> Multipart upload of prescription image(s) to MinIO; returns secure S3 keys.
- `POST /prescriptions` -> Creates pending prescription linked to customer, doctor, and line items.
- `POST /prescriptions/:id/verify`
  - Restricted to `PHARMACIST`, `MANAGER`, `ADMIN`.
  - Body: `{ itemDecisions: [{ itemId: string, status: 'APPROVED' | 'REJECTED' }] }`
  - Updates prescription status to `VERIFIED` and sets `verifiedBy` and `verifiedAt`.
- `GET /prescriptions/pending` -> Live queue of pending prescriptions awaiting pharmacist review.

---

## 5. Frontend Clinical Verification Workspace (`apps/web`)

### 5.1 Verification Screen (`PrescriptionVerifyModal.tsx`)
- **Split-Screen Ergonomics:**
  - **Left Viewer (60%):** High-resolution image canvas with pan, zoom (1x to 5x), 90-degree rotate buttons, and full-screen toggle.
  - **Right Checklist (40%):** Patient details, NIC badge, prescribing doctor SLMC badge, and table of prescribed items with dosage notes.
- **Dispensing Action Controls:** Solid Emerald "Approve Selected" button, Solid Alert Crimson "Reject Prescription" button with mandatory rejection reason picker (Illegible, Expired, Doctor Unverified).
- **Global Header Badge:** Top navigation bar displays a live indicator: `[ 3 Pending Rx ]` with real-time updates via TanStack Query polling.

---

## 6. Step-by-Step Implementation Task Checklist

- [ ] **Task 5.1: Database Schema & Migrations**
  - Create `Customer`, `CustomerCreditLedger`, `CustomerLoyaltyLedger`, `Doctor`, `Prescription`, `PrescriptionItem`, and `ControlledSubstanceRegister` entities.
  - Run TypeORM migration `004_create_patients_doctors_and_prescriptions`.
- [ ] **Task 5.2: MinIO S3 File Upload Pipeline**
  - Implement NestJS storage adapter for MinIO (Bucket: `pharmacy-prescriptions`).
  - Generate pre-signed secure image URLs with 60-minute expiration.
- [ ] **Task 5.3: Clinical Gatekeeper Service**
  - Build validation service enforcing Rx requirements, doctor SLMC numbers, patient NIC, and refill intervals.
  - Implement generic drug allergy matching logic.
- [ ] **Task 5.4: Controlled Substance Register Engine**
  - Build append-only audit logger for Schedule II drugs ensuring running stock balance computation.
- [ ] **Task 5.5: Frontend Verification Workspace**
  - Implement high-resolution image zoom viewer using `react-zoom-pan-pinch`.
  - Build side-by-side verification interface and unskippable allergy alert dialogs.

---

## 7. Verification & Exit Criteria

1. **Role Gating Test:**
   - Login as `CASHIER`. Attempt to call `POST /api/v1/prescriptions/:id/verify`.
   - Result: Response is strictly `403 Forbidden`. Cashiers cannot approve prescriptions.
2. **Controlled Substance Dispense Test:**
   - Dispense 10 tablets of Tramadol 50mg (Controlled II).
   - Verify that `controlled_substance_register` table contains a new record with exact patient NIC, doctor SLMC number, batch ID, and pharmacist user ID.
3. **Allergy Contraindication Test:**
   - Seed customer with allergy: `["Amoxicillin"]`. Add Augmentin 625mg to active cart.
   - Result: POS checkout fails with HTTP 422 containing allergy warning payload and requiring logged pharmacist sign-off.
4. **Refill Interval Enforcement:**
   - Attempt to refill a prescription 10 days after first dispensing when `refill_interval_days = 30`.
   - Result: System blocks checkout with `Refill interval not met (20 days remaining)`.
