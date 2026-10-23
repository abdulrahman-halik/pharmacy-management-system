# Phase 3: Medicine Catalogue, 4-Tier Packaging & Regulatory Master Data

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 3  
**Architecture Layer:** Product Catalog, Drug Master Data, Packaging Math & Async Import  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8 (Full-Text Search), BullMQ, Redis 7, React 18, TanStack Table  
**Regulatory Standards:** National Medicines Regulatory Authority (NMRA) Act No. 7 of 2015, CDDA Schedules

---

## 1. Executive Summary & Scope

Phase 3 builds the clinical medicine catalogue for modern retail and institutional pharmacies. In pharmaceutical distribution, simple single-quantity inventory fails because medicines are purchased in bulk cartons, stored in boxes, dispensed in blister packets, and occasionally broken down into loose tablets or units. This phase introduces an integer-based 4-tier packaging hierarchy, complete regulatory classification (NMRA/regulatory registration, Schedule II/Narcotics, Cold Chain), full-text search indexing, and a background CSV intake pipeline.

### In-Scope Deliverables
1. **Medicine Master Entity (`medicines`):** Comprehensive clinical metadata including generic and brand names, dosage form, strength, barcode/QR, Sri Lankan NMRA registration code (`nsqu_code`), schedule class, and cold-chain flags.
2. **True 4-Tier Packaging Engine (`medicine_packaging` & `@packages/shared`):**
   - 4 hierarchical tiers: Base Unit (Tablet/Vial/Pouch), Blister/Packet, Box, and Outer Carton.
   - Strict integer math conversion engine preventing floating-point rounding errors.
   - Packaging level price overrides allowing bulk discounts while strictly capping `selling_price <= MRP`.
3. **High-Performance Full-Text Drug Search:** Typeahead search across brand names, generic formulations, and barcodes achieving sub-50ms query response times.
4. **Asynchronous CSV Import Pipeline (BullMQ):** Background worker processing bulk pharmaceutical imports with dry-run verification and itemized error reporting.
5. **Sri Lankan Master Drug Seed Dataset:** 50+ pre-configured common Sri Lankan pharmaceuticals (e.g., Paracetamol, Amoxicillin, Omeprazole, Metformin, Insulin, Tramadol, Diazepam).
6. **Frontend Medicine Workspace:** Modern responsive DataTable with high-contrast schedule badges, cold-chain indicators, and an interactive packaging multiplier visualizer.

### Prerequisites & Dependencies
- **Phase 1 Deliverables:** Monorepo workspace, BaseAppEntity, Redis queue infrastructure, and Tailwind clinical tokens.
- **Phase 2 Deliverables:** RBAC `@RequirePermission('MEDICINES', 'add' | 'edit')` and AuditLogInterceptor.

### Downstream Outputs
- Medicine entity and packaging math powering **Phase 4 (Inventory & Batches)**.
- Schedule classification and generic allergy indexing consumed by **Phase 5 (Prescriptions)**.
- Fast product search and packaging conversion engine powering **Phase 6 (POS Terminal)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### Medicine Entity (`apps/api/src/modules/medicines/entities/medicine.entity.ts`)
```typescript
import { Entity, Column, Index, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Category } from './category.entity';
import { MedicinePackaging } from './medicine-packaging.entity';
import { MedicinePriceOverride } from './medicine-price-override.entity';

export enum ScheduleClass {
  OTC = 'OTC', // Over the Counter
  PRESCRIPTION_ONLY = 'PRESCRIPTION_ONLY', // Schedule I / Prescription required
  CONTROLLED_II = 'CONTROLLED_II', // Dangerous Drugs / Narcotics / Psychotropics (NMRA Regulated)
}

export enum StorageCondition {
  ROOM_TEMPERATURE = 'ROOM_TEMPERATURE', // 15°C - 25°C
  COLD_CHAIN = 'COLD_CHAIN', // 2°C - 8°C (Insulin, Vaccines)
  DEEP_FREEZE = 'DEEP_FREEZE', // Below -20°C
}

export enum DosageForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  CREAM = 'CREAM',
  DROPS = 'DROPS',
  INHALER = 'INHALER',
  SUPPOSITORY = 'SUPPOSITORY',
  POWDER = 'POWDER',
}

@Entity('medicines')
@Index('idx_med_fulltext', ['name', 'genericName'], { fulltext: true })
export class Medicine extends BaseAppEntity {
  @Column({ type: 'varchar', length: 180 })
  name: string; // e.g. "Panadol 500mg" or "Augmentin 625mg"

  @Index()
  @Column({ name: 'generic_name', type: 'varchar', length: 180 })
  genericName: string; // e.g. "Paracetamol" or "Amoxicillin / Clavulanic Acid"

  @Column({ name: 'brand_manufacturer', type: 'varchar', length: 120 })
  brandManufacturer: string; // e.g. "GSK", "Cipla", "State Pharmaceuticals"

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'varchar', length: 64, nullable: true })
  categoryId: string;

  @Column({ type: 'varchar', length: 60 })
  strength: string; // e.g. "500mg", "625mg", "100IU/ml"

  @Column({ name: 'dosage_form', type: 'enum', enum: DosageForm, default: DosageForm.TABLET })
  dosageForm: DosageForm;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, nullable: true })
  barcode?: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 128, nullable: true })
  qrCode?: string;

  @Column({ name: 'nsqu_code', type: 'varchar', length: 64, nullable: true })
  nsquCode?: string; // Sri Lanka NMRA Registration Certificate Number

  @Column({ name: 'hsn_code', type: 'varchar', length: 32, nullable: true })
  hsnCode?: string;

  @Column({ name: 'vat_percentage', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  vatPercentage: number; // 0% for essential medicines; 18% standard VAT if non-exempt

  @Column({ name: 'is_vat_exempt', type: 'boolean', default: true })
  isVatExempt: boolean; // Governed by Sri Lankan gazette exemptions

  @Column({ name: 'reorder_level', type: 'int', default: 50 })
  reorderLevel: number; // In Base Units

  @Column({ name: 'rack_location', type: 'varchar', length: 40, nullable: true })
  rackLocation?: string; // e.g. "Shelf A-3, Cold Box 1"

  @Column({ name: 'schedule_class', type: 'enum', enum: ScheduleClass, default: ScheduleClass.OTC })
  scheduleClass: ScheduleClass;

  @Column({ name: 'storage_condition', type: 'enum', enum: StorageCondition, default: StorageCondition.ROOM_TEMPERATURE })
  storageCondition: StorageCondition;

  @Column({ name: 'requires_prescription', type: 'boolean', default: false })
  requiresPrescription: boolean;

  @Column({ name: 'is_controlled_substance', type: 'boolean', default: false })
  isControlledSubstance: boolean;

  @OneToOne(() => MedicinePackaging, (packaging) => packaging.medicine, { cascade: true })
  packaging: MedicinePackaging;

  @OneToMany(() => MedicinePriceOverride, (override) => override.medicine, { cascade: true })
  priceOverrides: MedicinePriceOverride[];
}
```

#### 4-Tier Packaging Entity (`apps/api/src/modules/medicines/entities/medicine-packaging.entity.ts`)
```typescript
import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from './medicine.entity';

@Entity('medicine_packaging')
export class MedicinePackaging extends BaseAppEntity {
  @OneToOne(() => Medicine, (medicine) => medicine.packaging, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ name: 'base_unit_name', type: 'varchar', length: 32, default: 'Unit' })
  baseUnitName: string; // e.g. "Tablet", "Capsule", "Vial", "Pcs"

  @Column({ name: 'units_per_packet', type: 'int', default: 1 })
  unitsPerPacket: number; // e.g. 10 tablets per blister packet

  @Column({ name: 'packets_per_box', type: 'int', nullable: true })
  packetsPerBox?: number; // e.g. 10 blister strips per box

  @Column({ name: 'boxes_per_carton', type: 'int', nullable: true })
  boxesPerCarton?: number; // e.g. 20 boxes per outer carton
}
```

#### Packaging Price Override Entity (`apps/api/src/modules/medicines/entities/medicine-price-override.entity.ts`)
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { Medicine } from './medicine.entity';

export enum PackagingLevel {
  UNIT = 'UNIT',
  PACKET = 'PACKET',
  BOX = 'BOX',
  CARTON = 'CARTON',
}

@Entity('medicine_price_overrides')
@Unique(['medicineId', 'packagingLevel'])
export class MedicinePriceOverride extends BaseAppEntity {
  @ManyToOne(() => Medicine, (med) => med.priceOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medicine_id' })
  medicine: Medicine;

  @Column({ name: 'medicine_id', type: 'varchar', length: 64 })
  medicineId: string;

  @Column({ name: 'packaging_level', type: 'enum', enum: PackagingLevel })
  packagingLevel: PackagingLevel;

  @Column({ name: 'selling_price', type: 'decimal', precision: 12, scale: 2 })
  sellingPrice: number; // Selling price in LKR for this specific package level
}
```

---

## 3. Mathematical Packaging Multiplier Engine (`packages/shared`)

### 3.1 Strict Integer Conversion Math (`packages/shared/src/utils/packaging.ts`)
To prevent precision issues inherent in floating-point operations, all inventory balances are stored in base units (integer count of tablets/vials).

```typescript
export interface PackagingHierarchy {
  baseUnitName: string;
  unitsPerPacket: number;
  packetsPerBox?: number | null;
  boxesPerCarton?: number | null;
}

export function computePackagingMultipliers(pkg: PackagingHierarchy) {
  const unitsPerPacket = Math.max(1, pkg.unitsPerPacket || 1);
  const unitsPerBox = pkg.packetsPerBox ? unitsPerPacket * pkg.packetsPerBox : null;
  const unitsPerCarton = unitsPerBox && pkg.boxesPerCarton ? unitsPerBox * pkg.boxesPerCarton : null;

  return {
    UNIT: 1,
    PACKET: unitsPerPacket,
    BOX: unitsPerBox,
    CARTON: unitsPerCarton,
  };
}

export function convertToUnits(quantity: number, level: 'UNIT' | 'PACKET' | 'BOX' | 'CARTON', pkg: PackagingHierarchy): number {
  const multipliers = computePackagingMultipliers(pkg);
  const factor = multipliers[level];
  if (!factor) {
    throw new Error(`Packaging level ${level} is not configured for this medicine.`);
  }
  return quantity * factor;
}

export function unpackUnitsToHierarchy(totalUnits: number, pkg: PackagingHierarchy) {
  const { UNIT, PACKET, BOX, CARTON } = computePackagingMultipliers(pkg);
  let remaining = totalUnits;

  const cartons = CARTON ? Math.floor(remaining / CARTON) : 0;
  if (CARTON) remaining %= CARTON;

  const boxes = BOX ? Math.floor(remaining / BOX) : 0;
  if (BOX) remaining %= BOX;

  const packets = PACKET > 1 ? Math.floor(remaining / PACKET) : 0;
  if (PACKET > 1) remaining %= PACKET;

  const looseUnits = remaining;

  return {
    cartons,
    boxes,
    packets,
    looseUnits,
    summary: `${cartons ? `${cartons} Cartons ` : ''}${boxes ? `${boxes} Boxes ` : ''}${packets ? `${packets} Packets ` : ''}${looseUnits ? `${looseUnits} ${pkg.baseUnitName}` : ''}`.trim() || `0 ${pkg.baseUnitName}`,
  };
}
```

---

## 4. API Endpoints Specification

### Master Medicine Endpoints (`/api/v1/medicines`)
- `GET /medicines`
  - Query Params: `search`, `categoryId`, `scheduleClass`, `isColdChain`, `page`, `limit`.
  - Response: Server-paginated medicine list with packaging breakdown and active batch count.
- `GET /medicines/typeahead`
  - Query Param: `q` (minimum 2 chars).
  - Uses full-text indexed MySQL query: `MATCH(name, generic_name) AGAINST (+q* IN BOOLEAN MODE)` with 50ms latency.
- `GET /medicines/:id`
  - Returns complete medicine details, packaging configuration, price overrides, and rack location.
- `POST /medicines`
  - Body: Validated via `CreateMedicineSchema`.
  - Enforces: If `scheduleClass === 'CONTROLLED_II'`, automatically sets `isControlledSubstance = true` and `requiresPrescription = true`.
- `PUT /medicines/:id` -> Updates medicine specifications (Protected by `MEDICINES.can_edit`).
- `DELETE /medicines/:id` -> Soft-deletes medicine (Protected by `MEDICINES.can_delete`).

### Asynchronous CSV Pipeline (`/api/v1/medicines/import`)
- `POST /medicines/import/upload`
  - Multipart form upload of `.csv` file.
  - Optional flag: `dryRun=true` (validates without committing to DB).
  - Pushes job to BullMQ queue: `medicine-csv-import-queue`.
- `GET /medicines/import/status/:jobId`
  - Polls job progress: `{ status: 'PROCESSING' | 'COMPLETED' | 'FAILED', totalRows, processedRows, errorCount, errorReportUrl }`.

---

## 5. Seed Dataset: Essential Sri Lankan Pharmaceuticals

The seed runner (`apps/api/src/database/seeds/medicines.seed.ts`) populates 50+ common drugs, including:
1. **Panadol 500mg (Paracetamol):** OTC, Tablet, 1 Packet = 10 Tablets, 1 Box = 100 Tablets, 1 Carton = 2,000 Tablets. NMRA Reg: `NMRA/DR-2019/332`.
2. **Augmentin 625mg (Amoxicillin + Clavulanic Acid):** Prescription-Only, Tablet, 1 Packet = 7 Tablets, 1 Box = 14 Tablets. Cold storage alert.
3. **Omeprazole 20mg (Omeprazole):** Prescription-Only, Capsule, 1 Packet = 10 Capsules, 1 Box = 100 Capsules.
4. **Metformin 500mg (Metformin HCl):** Prescription-Only, Tablet, 1 Packet = 10 Tablets, 1 Box = 100 Tablets.
5. **Insulin Mixtard 30/70 100IU/ml:** Prescription-Only, Injection/Vial, Cold Chain (2°C - 8°C mandatory), 1 Box = 5 Vials.
6. **Tramadol 50mg (Tramadol HCl):** Controlled Schedule II (Narcotic), Capsule, Prescription mandatory, NMRA Dangerous Drug Reg.
7. **Diazepam 5mg (Diazepam):** Controlled Schedule II (Psychotropic), Tablet, Prescription mandatory, NMRA Dangerous Drug Reg.

---

## 6. Frontend Catalogue Workspace (`apps/web`)

### 6.1 Components & Architecture
- **Medicine Table (`apps/web/src/features/medicines/components/MedicineTable.tsx`):**
  - Columns: Product Name, Generic Name, Schedule Badge (Solid Emerald for OTC, Medical Teal for Rx, Solid Crimson for Controlled II), Cold Chain Badge, Packaging Ratio, Actions.
  - Zero-transparency solid badges.
- **Packaging Ratio Visualizer (`PackagingVisualizer.tsx`):**
  - Interactive diagram displaying hierarchical multipliers in real time:  
    `[ 1 Carton ] ── (×20) ──> [ 20 Boxes ] ── (×10) ──> [ 200 Packets ] ── (×10) ──> [ 2,000 Tablets ]`
- **CSV Import Modal (`CsvImportModal.tsx`):**
  - Drag-and-drop file upload with progress bar, row error table, and downloadable error report.

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 3.1: Entities & Relations**
  - Create `Category`, `Medicine`, `MedicinePackaging`, and `MedicinePriceOverride` entities.
  - Add Full-Text index on `medicines(name, generic_name)`.
  - Run TypeORM migration `002_create_medicine_catalog_tables`.
- [ ] **Task 3.2: Shared Packaging Calculation Engine**
  - Implement and unit test `computePackagingMultipliers`, `convertToUnits`, and `unpackUnitsToHierarchy` in `packages/shared`.
- [ ] **Task 3.3: NestJS Medicine Module**
  - Implement `MedicinesController`, `MedicinesService`, and `CategoriesService`.
  - Enforce regulatory auto-flags: `scheduleClass === 'CONTROLLED_II'` forces prescription requirement.
  - Implement full-text typeahead endpoint (< 50ms latency).
- [ ] **Task 3.4: BullMQ CSV Import Queue**
  - Set up Redis BullMQ worker in NestJS.
  - Build CSV stream parser with row-by-row Zod validation.
  - Support dry-run mode and generate CSV error logs.
- [ ] **Task 3.5: Master Sri Lankan Drug Seed**
  - Create seed script with 50+ real Sri Lankan drugs, NMRA codes, and packaging hierarchies.
- [ ] **Task 3.6: Frontend Medicine Workspace**
  - Build responsive DataTable with column sorting, category filters, and high-contrast badges.
  - Build Medicine Editor drawer with live packaging ratio visualizer.
  - Build CSV upload modal with real-time BullMQ progress polling.

---

## 8. Verification & Exit Criteria

1. **Packaging Unit Math Invariant:**
   - Unit test passes: Unpacking 4,452 units with packaging (10 units/packet, 10 packets/box, 40 boxes/carton) results in exactly: 1 Carton, 4 Boxes, 5 Packets, 2 Units (Total: 4,000 + 400 + 50 + 2 = 4,452). Zero rounding error.
2. **Typeahead Response Performance:**
   - Execute 50 concurrent searches on `GET /medicines/typeahead?q=para`.
   - Verify p95 latency is under 50ms.
3. **Regulatory Safety Enforcement:**
   - Attempt to create a drug with `scheduleClass: 'CONTROLLED_II'` and `requiresPrescription: false`.
   - Result: Service overrides flag to `requiresPrescription: true` and logs regulatory event.
4. **CSV Bulk Import Test:**
   - Upload a test CSV containing 500 valid medicine rows and 5 invalid rows (missing barcodes or negative packaging units).
   - Result: 500 rows inserted; 5 rows captured in error report CSV with line numbers and field-specific error messages.
