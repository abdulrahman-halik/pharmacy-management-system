import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import AppDataSource from '../../database/data-source';
import { Sale } from './entities/sale.entity';
import { SaleItem } from './entities/sale-item.entity';
import { SaleItemAllocation } from './entities/sale-item-allocation.entity';
import { Medicine } from '../medicines/entities/medicine.entity';
import { MedicinePackaging } from '../medicines/entities/medicine-packaging.entity';
import { InventoryBatch } from '../inventory/entities/inventory-batch.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CustomerCreditLedger } from '../customers/entities/customer-credit-ledger.entity';
import { CustomerLoyaltyLedger } from '../customers/entities/customer-loyalty-ledger.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Prescription } from '../prescriptions/entities/prescription.entity';
import { PrescriptionItem } from '../prescriptions/entities/prescription-item.entity';
import { ControlledSubstanceRegister } from '../prescriptions/entities/controlled-substance-register.entity';
import { PosCheckoutService } from './services/pos-checkout.service';
import { SequenceService } from './services/sequence.service';
import { ReceiptGeneratorService } from './services/receipt-generator.service';
import { ReceiptQueueService } from './services/receipt-queue.service';
import { FefoAllocationService } from '../inventory/services/fefo-allocation.service';
import { CustomerService } from '../customers/services/customer.service';
import { DoctorService } from '../doctors/services/doctor.service';
import { PrescriptionService } from '../prescriptions/services/prescription.service';
import { BadRequestException } from '@nestjs/common';

let checkoutService: PosCheckoutService;
let receiptService: ReceiptGeneratorService;
let sequenceService: SequenceService;
let fefoService: FefoAllocationService;
let customerService: CustomerService;
let doctorService: DoctorService;
let prescriptionService: PrescriptionService;

let medicineRepo: any;
let batchRepo: any;
let saleRepo: any;
let customerRepo: any;

before(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  medicineRepo = AppDataSource.getRepository(Medicine);
  batchRepo = AppDataSource.getRepository(InventoryBatch);
  saleRepo = AppDataSource.getRepository(Sale);
  customerRepo = AppDataSource.getRepository(Customer);
  const creditRepo = AppDataSource.getRepository(CustomerCreditLedger);
  const loyaltyRepo = AppDataSource.getRepository(CustomerLoyaltyLedger);
  const doctorRepo = AppDataSource.getRepository(Doctor);
  const prescriptionRepo = AppDataSource.getRepository(Prescription);
  const itemRepo = AppDataSource.getRepository(PrescriptionItem);

  const minioMock: any = {
    ensureBucketExists: async () => {},
    uploadPrescriptionImage: async () => 'prescriptions/2026/10/mock-rx.jpg',
    getPresignedViewUrl: async (key: string) => `http://localhost:9000/rx/${key}`,
  };

  customerService = new CustomerService(customerRepo, creditRepo, loyaltyRepo, AppDataSource);
  doctorService = new DoctorService(doctorRepo);
  prescriptionService = new PrescriptionService(
    prescriptionRepo,
    itemRepo,
    customerRepo,
    doctorRepo,
    minioMock,
    AppDataSource,
  );
  fefoService = new FefoAllocationService(batchRepo);
  sequenceService = new SequenceService();
  receiptService = new ReceiptGeneratorService();
  const queueService = new ReceiptQueueService();

  checkoutService = new PosCheckoutService(
    AppDataSource,
    sequenceService,
    fefoService,
    receiptService,
    queueService,
    saleRepo,
  );
});

test('Sequential Invoice Number Generation is atomic and formatted', async () => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const inv1 = await sequenceService.getNextInvoiceNumber(queryRunner.manager);
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    assert.ok(inv1.startsWith(`INV-${ym}-`));
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
  }
});

test('Heavy Concurrency Load Test: Zero overselling across 25 simultaneous checkouts', async () => {
  // 1. Create medicine
  const med = await medicineRepo.save(
    medicineRepo.create({
      name: `Paracetamol Concurrency ${Date.now()}`,
      genericName: 'Paracetamol',
      strength: '500mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'GSK',
      reorderLevel: 10,
      requiresPrescription: false,
      isControlledSubstance: false,
    }),
  );

  // 2. Create batch with exactly 25 base units
  const batch = await batchRepo.save(
    batchRepo.create({
      medicineId: med.id,
      batchNumber: `BATCH-CONCUR-${Date.now()}`,
      expiryDate: '2028-12-31',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 25,
      unitCostPrice: 5.0,
      batchMrp: 12.0,
      status: 'ACTIVE',
    }),
  );

  // 3. Dispatch 25 simultaneous parallel checkout requests for 1 unit each
  const parallelCheckouts = Array.from({ length: 25 }, (_, idx) =>
    checkoutService.checkout(
      {
        items: [
          {
            medicineId: med.id,
            packagingLevel: 'UNIT',
            quantity: 1,
            unitPriceLkr: 12.0,
          },
        ],
        splitPayments: [{ method: 'CASH', amount: 12.0 }],
        idempotencyKey: `idemp-concur-${idx}-${Date.now()}`,
      },
      `cashier-${idx}`,
    ),
  );

  const results = await Promise.allSettled(parallelCheckouts);
  const successes = results.filter((r) => r.status === 'fulfilled');
  const failures = results.filter((r) => r.status === 'rejected');

  assert.equal(successes.length, 25, 'All 25 parallel checkouts must succeed');
  assert.equal(failures.length, 0, 'No transactions should fail or deadlock');

  // Verify batch balance is exactly 0
  const refreshedBatch = await batchRepo.findOneOrFail({ where: { id: batch.id } });
  assert.equal(refreshedBatch.quantityBaseUnits, 0, 'Batch quantity must be exactly 0');

  // 4. 26th checkout attempt must fail gracefully with Insufficient Stock
  await assert.rejects(
    async () => {
      await checkoutService.checkout(
        {
          items: [
            {
              medicineId: med.id,
              packagingLevel: 'UNIT',
              quantity: 1,
              unitPriceLkr: 12.0,
            },
          ],
          splitPayments: [{ method: 'CASH', amount: 12.0 }],
        },
        'cashier-26',
      );
    },
    /Insufficient stock/,
    '26th checkout must be rejected due to zero stock',
  );
});

test('Idempotency Prevention: Duplicate request returns original sale without double deduction', async () => {
  const med = await medicineRepo.save(
    medicineRepo.create({
      name: `Amoxicillin Idempotent ${Date.now()}`,
      genericName: 'Amoxicillin',
      strength: '250mg',
      dosageForm: 'CAPSULE',
      brandManufacturer: 'Astron',
      reorderLevel: 5,
      requiresPrescription: false,
    }),
  );

  const batch = await batchRepo.save(
    batchRepo.create({
      medicineId: med.id,
      batchNumber: `BATCH-IDEMP-${Date.now()}`,
      expiryDate: '2028-06-30',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 50,
      unitCostPrice: 10.0,
      batchMrp: 20.0,
      status: 'ACTIVE',
    }),
  );

  const testKey = `unique_idemp_key_${Date.now()}`;
  const checkoutPayload = {
    items: [
      {
        medicineId: med.id,
        packagingLevel: 'UNIT' as const,
        quantity: 5,
        unitPriceLkr: 20.0,
      },
    ],
    splitPayments: [{ method: 'CASH' as const, amount: 100.0 }],
    idempotencyKey: testKey,
  };

  const sale1 = await checkoutService.checkout(checkoutPayload, 'cashier-01');
  assert.ok(sale1.id);
  assert.equal(sale1.grandTotalLkr, 100);

  // Send exact identical request with same idempotency key
  const sale2 = await checkoutService.checkout(checkoutPayload, 'cashier-01');
  assert.equal(sale2.id, sale1.id, 'Idempotent request must return identical sale record');
  assert.equal(sale2.invoiceNumber, sale1.invoiceNumber);

  // Verify stock was decremented ONLY ONCE (50 - 5 = 45)
  const batchAfter = await batchRepo.findOneOrFail({ where: { id: batch.id } });
  assert.equal(batchAfter.quantityBaseUnits, 45, 'Batch must only be decremented once');
});

test('Split Payment & Change Calculation: Cash + Card and cash rounding', async () => {
  const med = await medicineRepo.save(
    medicineRepo.create({
      name: `Vitamin C Split ${Date.now()}`,
      genericName: 'Ascorbic Acid',
      strength: '500mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'Cipla',
      reorderLevel: 10,
      requiresPrescription: false,
    }),
  );

  await batchRepo.save(
    batchRepo.create({
      medicineId: med.id,
      batchNumber: `BATCH-SPLIT-${Date.now()}`,
      expiryDate: '2029-01-01',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 100,
      unitCostPrice: 15.0,
      batchMrp: 30.0,
      status: 'ACTIVE',
    }),
  );

  // Total: 10 units * Rs. 30 = Rs. 300
  // Discount: Rs. 20 -> Subtotal Rs. 280
  // Split payment: Card Rs. 200 + Cash Rs. 100 (Total paid Rs. 300) -> Change Rs. 20
  const sale = await checkoutService.checkout(
    {
      items: [
        {
          medicineId: med.id,
          packagingLevel: 'UNIT',
          quantity: 10,
          unitPriceLkr: 30.0,
        },
      ],
      discountLkr: 20,
      splitPayments: [
        { method: 'CARD', amount: 200 },
        { method: 'CASH', amount: 100 },
      ],
    },
    'cashier-02',
  );

  assert.equal(sale.subtotalLkr, 300);
  assert.equal(sale.discountLkr, 20);
  assert.equal(sale.grandTotalLkr, 280);
  assert.equal(sale.paidAmountLkr, 300);
  assert.equal(sale.changeGivenLkr, 20);
});

test('Customer Credit Limit: Transactions exceeding credit limit are rejected', async () => {
  const customer = await customerService.create({
    fullName: 'Kamal Perera',
    phone: '0772223344',
    allergies: [],
    creditLimit: 1000,
  });

  const med = await medicineRepo.save(
    medicineRepo.create({
      name: `Ibuprofen Credit ${Date.now()}`,
      genericName: 'Ibuprofen',
      strength: '400mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'State Pharma',
      reorderLevel: 10,
      requiresPrescription: false,
    }),
  );

  await batchRepo.save(
    batchRepo.create({
      medicineId: med.id,
      batchNumber: `BATCH-CREDIT-${Date.now()}`,
      expiryDate: '2028-10-10',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 200,
      unitCostPrice: 10.0,
      batchMrp: 25.0,
      status: 'ACTIVE',
    }),
  );

  // Attempt purchase of Rs. 1500 on store credit when limit is Rs. 1000
  await assert.rejects(
    async () => {
      await checkoutService.checkout(
        {
          customerId: customer.id,
          items: [
            {
              medicineId: med.id,
              packagingLevel: 'UNIT',
              quantity: 60,
              unitPriceLkr: 25.0,
            },
          ],
          splitPayments: [{ method: 'CREDIT', amount: 1500 }],
        },
        'cashier-credit',
      );
    },
    /exceeds customer credit limit of Rs. 1000/,
  );

  // Purchase of Rs. 500 on credit succeeds
  const validSale = await checkoutService.checkout(
    {
      customerId: customer.id,
      items: [
        {
          medicineId: med.id,
          packagingLevel: 'UNIT',
          quantity: 20,
          unitPriceLkr: 25.0,
        },
      ],
      splitPayments: [{ method: 'CREDIT', amount: 500 }],
    },
    'cashier-credit',
  );

  assert.equal(validSale.grandTotalLkr, 500);

  const updatedCustomer = await customerRepo.findOneOrFail({ where: { id: customer.id } });
  assert.equal(Number(updatedCustomer.creditBalance), 500);
});

test('Clinical Prescription Gate: POM medicine requires verified prescription', async () => {
  const pomMed = await medicineRepo.save(
    medicineRepo.create({
      name: `Ciprofloxacin POM ${Date.now()}`,
      genericName: 'Ciprofloxacin',
      strength: '500mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'Bayer',
      reorderLevel: 10,
      requiresPrescription: true, // POM
      isControlledSubstance: false,
    }),
  );

  await batchRepo.save(
    batchRepo.create({
      medicineId: pomMed.id,
      batchNumber: `BATCH-POM-${Date.now()}`,
      expiryDate: '2029-05-15',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 50,
      unitCostPrice: 30.0,
      batchMrp: 60.0,
      status: 'ACTIVE',
    }),
  );

  // 1. Checkout POM medicine without prescription -> Hard Block
  await assert.rejects(
    async () => {
      await checkoutService.checkout(
        {
          items: [
            {
              medicineId: pomMed.id,
              packagingLevel: 'UNIT',
              quantity: 10,
              unitPriceLkr: 60.0,
            },
          ],
          splitPayments: [{ method: 'CASH', amount: 600.0 }],
        },
        'cashier-rx',
      );
    },
    /is Prescription-Only \(POM\)/,
  );

  // 2. Create customer, doctor and prescription with APPROVED item
  const patient = await customerService.create({
    fullName: 'Nimali Silva',
    phone: '0714455667',
    allergies: [],
    creditLimit: 0,
  });

  const doctor = await doctorService.create({
    fullName: 'Dr. Anura Bandara',
    registrationNumber: `SLMC-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const rx = await prescriptionService.create({
    customerId: patient.id,
    doctorId: doctor.id,
    issuedDate: '2026-10-01',
    validUntil: '2027-04-01',
    imageUrls: ['prescriptions/cipro.jpg'],
    items: [
      {
        medicineId: pomMed.id,
        dosage: '1 tab BD for 5 days',
        durationDays: 5,
        prescribedQuantityBaseUnits: 10,
        refillAllowed: false,
        refillsAllowedCount: 0,
        refillIntervalDays: 0,
      },
    ],
  });

  // Verify prescription
  await prescriptionService.verify(
    rx.id,
    {
      itemDecisions: [{ itemId: rx.items[0].id, status: 'APPROVED' }],
    },
    'pharmacist-lead',
    'PHARMACIST',
  );

  // 3. Checkout with valid verified prescription attached -> Succeeds
  const rxSale = await checkoutService.checkout(
    {
      customerId: patient.id,
      prescriptionId: rx.id,
      items: [
        {
          medicineId: pomMed.id,
          packagingLevel: 'UNIT',
          quantity: 10,
          unitPriceLkr: 60.0,
        },
      ],
      splitPayments: [{ method: 'CASH', amount: 600.0 }],
    },
    'cashier-rx',
  );

  assert.ok(rxSale.id);
  assert.equal(rxSale.grandTotalLkr, 600);
  assert.equal(rxSale.prescriptionId, rx.id);
});

test('ESC/POS Thermal Receipt Generation meets NMRA Batch and Expiry requirements', async () => {
  const med = await medicineRepo.save(
    medicineRepo.create({
      name: 'Augmentin 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      strength: '625mg',
      dosageForm: 'TABLET',
      brandManufacturer: 'GSK',
      reorderLevel: 10,
      requiresPrescription: false,
    }),
  );

  await batchRepo.save(
    batchRepo.create({
      medicineId: med.id,
      batchNumber: 'AUG-B9102',
      expiryDate: '2027-11-30',
      manufacturingDate: '2024-01-01',
      quantityBaseUnits: 100,
      unitCostPrice: 80.0,
      batchMrp: 150.0,
      status: 'ACTIVE',
    }),
  );

  const sale = await checkoutService.checkout(
    {
      items: [
        {
          medicineId: med.id,
          packagingLevel: 'UNIT',
          quantity: 5,
          unitPriceLkr: 150.0,
        },
      ],
      isVatApplicable: true,
      splitPayments: [{ method: 'CASH', amount: 1000 }],
    },
    'cashier-nmra',
  );

  const receipt = receiptService.generateReceipt(sale);

  assert.ok(receipt.invoiceNumber.startsWith('INV-'));
  assert.ok(receipt.rawEscPosText.includes('Augmentin 625mg'));
  assert.ok(receipt.rawEscPosText.includes('AUG-B9102'));
  assert.ok(receipt.rawEscPosText.includes('11/27')); // MM/YY format
  assert.ok(receipt.rawEscPosText.includes('NMRA/RET/COL/2026-0881'));
  assert.ok(receipt.rawEscPosText.includes('VAT (18%):'));
  assert.ok(receipt.rawEscPosText.includes('CHANGE GIVEN:'));
});

after(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
});
