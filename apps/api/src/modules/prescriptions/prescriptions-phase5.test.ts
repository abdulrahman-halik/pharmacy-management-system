import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import AppDataSource from '../../database/data-source';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerCreditLedger } from '../customers/entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from '../customers/entities/customer-loyalty-ledger.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { ControlledSubstanceRegister } from './entities/controlled-substance-register.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { CustomerService } from '../customers/services/customer.service';
import { DoctorService } from '../doctors/services/doctor.service';
import { PrescriptionService } from './services/prescription.service';
import { PrescriptionGateService } from './services/prescription-gate.service';
import { ControlledSubstanceService } from './services/controlled-substance.service';
import { MinioStorageService } from './services/minio-storage.service';
import { PrescriptionStatus, PrescriptionItemStatus } from '@pharmacy/shared';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

let customerService: CustomerService;
let doctorService: DoctorService;
let prescriptionService: PrescriptionService;
let gateService: PrescriptionGateService;
let controlledService: ControlledSubstanceService;
let medicineRepo: any;
let batchRepo: any;
let customerRepo: any;
let doctorRepo: any;
let prescriptionRepo: any;
let registerRepo: any;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  customerRepo = AppDataSource.getRepository(Customer);
  const creditRepo = AppDataSource.getRepository(CustomerCreditLedger);
  const loyaltyRepo = AppDataSource.getRepository(CustomerLoyaltyLedger);
  doctorRepo = AppDataSource.getRepository(Doctor);
  prescriptionRepo = AppDataSource.getRepository(Prescription);
  const itemRepo = AppDataSource.getRepository(PrescriptionItem);
  registerRepo = AppDataSource.getRepository(ControlledSubstanceRegister);
  medicineRepo = AppDataSource.getRepository(Medicine);
  batchRepo = AppDataSource.getRepository(InventoryBatch);

  const minioMock: any = {
    ensureBucketExists: async () => {},
    uploadPrescriptionImage: async () => 'prescriptions/2026/10/mock-rx.jpg',
    getPresignedViewUrl: async (key: string) => `http://localhost:9000/pharmacy-prescriptions/${key}?token=mock`,
  };

  customerService = new CustomerService(customerRepo, creditRepo, loyaltyRepo, AppDataSource);
  doctorService = new DoctorService(doctorRepo);
  prescriptionService = new PrescriptionService(prescriptionRepo, itemRepo, customerRepo, doctorRepo, minioMock, AppDataSource);
  gateService = new PrescriptionGateService(medicineRepo, customerRepo, doctorRepo, prescriptionRepo, itemRepo);
  controlledService = new ControlledSubstanceService(registerRepo, batchRepo, medicineRepo, AppDataSource);
});

after(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});

test('Customer 360: Creation, phone normalization, allergy tagging, and credit limits', async () => {
  const customer = await customerService.create({
    fullName: 'Sunil Weerakkody',
    phone: '0714567890',
    email: 'sunil@gmail.com',
    nicOrPassport: '852341234V',
    dob: '1985-05-12',
    gender: 'MALE',
    address: 'No 45, Galle Road, Colombo 03',
    allergies: ['Amoxicillin', 'Penicillin'],
    medicalNotes: 'Asthmatic, hypertensive',
    creditLimit: 20000,
  });

  assert.equal(customer.fullName, 'Sunil Weerakkody');
  assert.equal(customer.phone, '+94714567890');
  assert.equal(customer.creditLimit, 20000);
  assert.equal(customer.creditBalance, 0);
  assert.deepEqual(customer.allergies, ['Amoxicillin', 'Penicillin']);

  // Record credit purchase
  const creditTx = await customerService.recordCreditTransaction(
    customer.id,
    {
      entryType: 'CREDIT_PURCHASE',
      amount: 5000,
      notes: 'Initial credit dispensation',
    },
    'cashier-001',
  );
  assert.equal(creditTx.amount, 5000);
  assert.equal(creditTx.runningBalance, 5000);

  // Credit limit violation check: trying to exceed 20,000 limit
  await assert.rejects(
    async () => {
      await customerService.recordCreditTransaction(
        customer.id,
        {
          entryType: 'CREDIT_PURCHASE',
          amount: 20000, // 5000 + 20000 = 25000 > 20000 limit
        },
        'cashier-001',
      );
    },
    (err: any) => err instanceof BadRequestException && err.message.includes('credit limit'),
  );
});

test('Doctor Registry: Enforce valid SLMC registration number and uniqueness', async () => {
  const slmcReg = `SLMC-${Math.floor(10000 + Math.random() * 90000)}`;
  const doctor = await doctorService.create({
    fullName: 'Dr. Anura Bandara',
    registrationNumber: slmcReg,
    specialization: 'Consultant Neurologist',
    clinicName: 'National Hospital Colombo',
    mobileNumber: '+94772345678',
  });

  assert.equal(doctor.fullName, 'Dr. Anura Bandara');
  assert.equal(doctor.registrationNumber, slmcReg);

  // Reject duplicate SLMC
  await assert.rejects(async () => {
    await doctorService.create({
      fullName: 'Dr. Duplicate',
      registrationNumber: slmcReg,
    });
  });
});

test('Role Gating Test: Cashiers cannot approve prescriptions (403 Forbidden)', async () => {
  // Create customer & doctor
  const customer = await customerService.create({
    fullName: 'Nimali Fernando',
    phone: '0779998888',
    nicOrPassport: '199512345678',
    allergies: [],
    creditLimit: 0,
  });

  const doctor = await doctorService.create({
    fullName: 'Dr. K. A. Perera',
    registrationNumber: `SLMC-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const med = await medicineRepo.save(
    medicineRepo.create({
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      strength: '500mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'SPMC',
      reorderLevel: 20,
      requiresPrescription: true,
      isControlledSubstance: false,
    }),
  );

  const rx = await prescriptionService.create({
    customerId: customer.id,
    doctorId: doctor.id,
    issuedDate: '2026-10-24',
    validUntil: '2026-11-24',
    imageUrls: ['prescriptions/mock-rx-photo.jpg'],
    items: [
      {
        medicineId: med.id,
        dosage: '1 OD for 3 days',
        durationDays: 3,
        prescribedQuantityBaseUnits: 3,
        refillAllowed: false,
        refillsAllowedCount: 0,
        refillIntervalDays: 30,
      },
    ],
  });

  assert.equal(rx.status, PrescriptionStatus.PENDING);
  assert.equal(rx.items.length, 1);

  // Cashier attempt -> Throws 403 Forbidden
  await assert.rejects(
    async () => {
      await prescriptionService.verify(
        rx.id,
        {
          itemDecisions: [{ itemId: rx.items[0].id, status: 'APPROVED' }],
        },
        'user-cashier-01',
        'CASHIER',
      );
    },
    (err: any) => err instanceof ForbiddenException && err.message.includes('not authorized'),
  );

  // Pharmacist attempt -> 200 OK
  const verifiedRx = await prescriptionService.verify(
    rx.id,
    {
      itemDecisions: [{ itemId: rx.items[0].id, status: 'APPROVED' }],
    },
    'user-pharmacist-01',
    'PHARMACIST',
  );

  assert.equal(verifiedRx.status, PrescriptionStatus.VERIFIED);
  assert.equal(verifiedRx.verifiedBy, 'user-pharmacist-01');
  assert.ok(verifiedRx.verifiedAt);
});

test('Allergy Contraindication Test: Patient allergic to Amoxicillin halts checkout', async () => {
  const allergicCustomer = await customerService.create({
    fullName: 'Dilshan Silva',
    phone: '0773332211',
    allergies: ['Amoxicillin'],
    creditLimit: 0,
  });

  const augmentin = await medicineRepo.save(
    medicineRepo.create({
      name: 'Augmentin 625mg',
      genericName: 'Amoxicillin / Clavulanic Acid',
      strength: '625mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'GSK',
      reorderLevel: 10,
      requiresPrescription: false,
      isControlledSubstance: false,
    }),
  );

  // 1. Without pharmacist override code -> Blocked
  const checkWithoutOverride = await gateService.validateCart({
    customerId: allergicCustomer.id,
    items: [{ medicineId: augmentin.id, quantityBaseUnits: 14 }],
  });

  assert.equal(checkWithoutOverride.allowed, false);
  assert.equal(checkWithoutOverride.requiresPharmacistOverride, true);
  assert.equal(checkWithoutOverride.contraindications.length, 1);
  assert.ok(
    checkWithoutOverride.contraindications[0].message.includes('CONTRAINDICATION: Patient has documented allergy to [amoxicillin]'),
  );

  // 2. With pharmacist override code -> Allowed with warning
  const checkWithOverride = await gateService.validateCart({
    customerId: allergicCustomer.id,
    items: [{ medicineId: augmentin.id, quantityBaseUnits: 14 }],
    pharmacistOverrideCode: 'OVERRIDE-RX',
  });

  assert.equal(checkWithOverride.allowed, true);
  assert.equal(checkWithOverride.requiresPharmacistOverride, true);
  assert.equal(checkWithOverride.contraindications.length, 1);
});

test('Controlled Substance Dispense Test: Schedule II logs patient NIC, doctor SLMC, batch, running balance', async () => {
  const patient = await customerService.create({
    fullName: 'Kasun Wickramasinghe',
    phone: '0774445566',
    nicOrPassport: '921112223V',
    allergies: [],
    creditLimit: 0,
  });

  const doctor = await doctorService.create({
    fullName: 'Dr. Gamini Senanayake',
    registrationNumber: `SLMC-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const tramadol = await medicineRepo.save(
    medicineRepo.create({
      name: 'Tramadol 50mg',
      genericName: 'Tramadol HCl',
      strength: '50mg',
      dosageForm: 'CAPSULE',
      brandManufacturer: 'State Pharmaceuticals',
      reorderLevel: 50,
      requiresPrescription: true,
      isControlledSubstance: true,
      controlledSubstanceSchedule: 'SCHEDULE_II',
    }),
  );

  const batch = await batchRepo.save(
    batchRepo.create({
      medicineId: tramadol.id,
      batchNumber: `TRAM-B-${Math.floor(1000 + Math.random() * 9000)}`,
      mfdDate: '2026-01-01',
      expiryDate: '2027-06-30',
      quantityBaseUnits: 100,
      unitCostPrice: 25.5,
      batchMrp: 45.0,
      status: 'ACTIVE',
    }),
  );

  const entry = await controlledService.recordDispense({
    medicineId: tramadol.id,
    batchId: batch.id,
    quantityBaseUnits: 10,
    customerId: patient.id,
    customerNic: patient.nicOrPassport!,
    doctorId: doctor.id,
    doctorSlmcRegNo: doctor.registrationNumber,
    prescriptionId: 'mock-rx-id-001',
    pharmacistUserId: 'pharmacist-super-01',
  });

  assert.ok(entry.id);
  assert.equal(entry.medicineId, tramadol.id);
  assert.equal(entry.batchId, batch.id);
  assert.equal(entry.quantityBaseUnits, 10);
  assert.equal(entry.customerNic, '921112223V');
  assert.equal(entry.doctorSlmcRegNo, doctor.registrationNumber);
  assert.equal(entry.pharmacistUserId, 'pharmacist-super-01');
  assert.equal(entry.runningBalance, 90); // 100 - 10 = 90
});

test('Refill Interval Enforcement: System blocks dispensing before interval days elapse', async () => {
  const patient = await customerService.create({
    fullName: 'Lalith Jayasuriya',
    phone: '0718889900',
    allergies: [],
    creditLimit: 0,
  });

  const doctor = await doctorService.create({
    fullName: 'Dr. Rohitha Pathirana',
    registrationNumber: `SLMC-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const bpMed = await medicineRepo.save(
    medicineRepo.create({
      name: 'Losartan Potassium 50mg',
      genericName: 'Losartan',
      strength: '50mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'SPMC',
      reorderLevel: 100,
      requiresPrescription: true,
      isControlledSubstance: false,
    }),
  );

  const rx = await prescriptionService.create({
    customerId: patient.id,
    doctorId: doctor.id,
    issuedDate: '2026-10-01',
    validUntil: '2027-04-01',
    imageUrls: ['prescriptions/losartan-rx.jpg'],
    items: [
      {
        medicineId: bpMed.id,
        dosage: '1 Tab daily',
        durationDays: 30,
        prescribedQuantityBaseUnits: 30,
        refillAllowed: true,
        refillsAllowedCount: 3,
        refillIntervalDays: 30,
      },
    ],
  });

  // Verify by pharmacist
  await prescriptionService.verify(
    rx.id,
    {
      itemDecisions: [{ itemId: rx.items[0].id, status: 'APPROVED' }],
    },
    'pharma-01',
    'PHARMACIST',
  );

  // Simulate first dispensation done 10 days ago
  const itemRepo = AppDataSource.getRepository(PrescriptionItem);
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  await itemRepo.update(rx.items[0].id, {
    dispensedQuantityBaseUnits: 30,
    lastDispensedAt: tenDaysAgo,
  });

  // Refill attempt 10 days later when refillIntervalDays = 30 -> Blocked with 20 days remaining
  const refillCheck = await gateService.validateCart({
    customerId: patient.id,
    prescriptionId: rx.id,
    items: [{ medicineId: bpMed.id, quantityBaseUnits: 30 }],
  });

  assert.equal(refillCheck.allowed, false);
  assert.equal(refillCheck.refillViolations.length, 1);
  assert.ok(
    refillCheck.refillViolations[0].reason.includes('Refill interval not met (20 days remaining)'),
  );
  assert.equal(refillCheck.refillViolations[0].daysRemaining, 20);
});
