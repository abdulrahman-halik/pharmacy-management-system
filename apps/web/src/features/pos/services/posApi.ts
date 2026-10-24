import type {
  CheckoutInput,
  SaleDto,
  EscPosReceiptData,
} from '@pharmacy/shared';
import type { MedicineSearchItem } from '../types';

const API_BASE = 'http://localhost:4000';

const INITIAL_MOCK_MEDICINES: MedicineSearchItem[] = [
  {
    id: 'med-001',
    name: 'Panadol Extra 500mg/65mg',
    genericName: 'Paracetamol + Caffeine',
    brandManufacturer: 'GSK Sri Lanka',
    dosageForm: 'TABLET',
    strength: '500mg/65mg',
    barcode: '4792019001012',
    mrp: 18.0,
    requiresPrescription: false,
    isControlledSubstance: false,
    packagingHierarchy: {
      baseUnitName: 'Tablet',
      unitsPerPacket: 10,
      packetsPerBox: 10,
      boxesPerCarton: 12,
    },
    totalStockUnits: 450,
    earliestExpiry: '2028-09-30',
    earliestBatchNumber: 'B4490',
  },
  {
    id: 'med-002',
    name: 'Augmentin 625mg',
    genericName: 'Amoxicillin + Clavulanic Acid',
    brandManufacturer: 'GSK UK',
    dosageForm: 'TABLET',
    strength: '625mg',
    barcode: '5012345678901',
    mrp: 185.0,
    requiresPrescription: true,
    isControlledSubstance: false,
    packagingHierarchy: {
      baseUnitName: 'Tablet',
      unitsPerPacket: 7,
      packetsPerBox: 2,
      boxesPerCarton: 10,
    },
    totalStockUnits: 120,
    earliestExpiry: '2027-11-30',
    earliestBatchNumber: 'AUG-9102',
  },
  {
    id: 'med-003',
    name: 'Tramadol HCl 50mg',
    genericName: 'Tramadol Hydrochloride',
    brandManufacturer: 'State Pharmaceuticals Manufacturing',
    dosageForm: 'CAPSULE',
    strength: '50mg',
    barcode: '4791002003004',
    mrp: 45.0,
    requiresPrescription: true,
    isControlledSubstance: true,
    packagingHierarchy: {
      baseUnitName: 'Capsule',
      unitsPerPacket: 10,
      packetsPerBox: 10,
    },
    totalStockUnits: 80,
    earliestExpiry: '2027-04-15',
    earliestBatchNumber: 'TRAM-042',
  },
  {
    id: 'med-004',
    name: 'Lipitor 20mg',
    genericName: 'Atorvastatin Calcium',
    brandManufacturer: 'Pfizer',
    dosageForm: 'TABLET',
    strength: '20mg',
    barcode: '0071220033441',
    mrp: 110.0,
    requiresPrescription: true,
    isControlledSubstance: false,
    packagingHierarchy: {
      baseUnitName: 'Tablet',
      unitsPerPacket: 10,
      packetsPerBox: 3,
    },
    totalStockUnits: 250,
    earliestExpiry: '2028-01-31',
    earliestBatchNumber: 'LIP-881',
  },
  {
    id: 'med-005',
    name: 'Cetrizine 10mg',
    genericName: 'Cetirizine Hydrochloride',
    brandManufacturer: 'Cipla India',
    dosageForm: 'TABLET',
    strength: '10mg',
    barcode: '8901112223334',
    mrp: 15.0,
    requiresPrescription: false,
    isControlledSubstance: false,
    packagingHierarchy: {
      baseUnitName: 'Tablet',
      unitsPerPacket: 10,
      packetsPerBox: 10,
    },
    totalStockUnits: 600,
    earliestExpiry: '2029-06-30',
    earliestBatchNumber: 'CET-009',
  },
];

class PosApiService {
  private memoryMedicines: MedicineSearchItem[] = [...INITIAL_MOCK_MEDICINES];

  async searchMedicines(query: string): Promise<MedicineSearchItem[]> {
    try {
      const res = await fetch(`${API_BASE}/medicines?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.items && Array.isArray(json.items) && json.items.length > 0) {
          return json.items.map((m: any) => ({
            id: m.id,
            name: m.name,
            genericName: m.genericName,
            brandManufacturer: m.brandManufacturer,
            dosageForm: m.dosageForm,
            strength: m.strength,
            barcode: m.barcode,
            mrp: Number(m.mrp || 0),
            requiresPrescription: Boolean(m.requiresPrescription),
            isControlledSubstance: Boolean(m.isControlledSubstance),
            packagingHierarchy: m.packaging,
            totalStockUnits: 150, // default placeholder when stock sum not joined
            earliestExpiry: '2028-12-31',
            earliestBatchNumber: 'BATCH-DEF',
          }));
        }
      }
    } catch {
      // Fallback to local memory catalogue
    }

    const q = query.trim().toLowerCase();
    if (!q) return this.memoryMedicines;

    return this.memoryMedicines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q) ||
        m.brandManufacturer?.toLowerCase().includes(q) ||
        m.barcode === q,
    );
  }

  async previewFefo(medicineId: string, requestedUnits: number) {
    try {
      const res = await fetch(
        `${API_BASE}/pos/medicines/${medicineId}/fefo-preview?requestedUnits=${requestedUnits}`,
      );
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fallback
    }

    const med = this.memoryMedicines.find((m) => m.id === medicineId);
    return {
      medicineId,
      requestedUnits,
      allocatedUnits: Math.min(requestedUnits, med?.totalStockUnits || 100),
      shortfallUnits: Math.max(0, requestedUnits - (med?.totalStockUnits || 100)),
      allocations: [
        {
          batchId: 'mock-batch-01',
          batchNumber: med?.earliestBatchNumber || 'BATCH-001',
          expiryDate: med?.earliestExpiry || '2028-12-31',
          allocatedUnits: Math.min(requestedUnits, med?.totalStockUnits || 100),
          unitCostPrice: (med?.mrp || 10) * 0.6,
          batchMrp: med?.mrp || 10,
        },
      ],
    };
  }

  async checkout(input: CheckoutInput, idempotencyKey?: string): Promise<SaleDto> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (idempotencyKey) {
        headers['idempotency-key'] = idempotencyKey;
      }

      const res = await fetch(`${API_BASE}/pos/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (res.ok) {
        return res.json();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Checkout failed (${res.status})`);
      }
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }

      // Offline demonstration fallback
      const now = new Date();
      const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`;

      const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unitPriceLkr, 0);
      const discount = input.discountLkr || 0;
      const taxable = Math.max(0, subtotal - discount);
      const vat = input.isVatApplicable ? Math.round(taxable * 0.18 * 100) / 100 : 0;
      const sscl = input.isSsclApplicable ? Math.round(taxable * 0.025 * 100) / 100 : 0;
      const grandTotal = Math.round(taxable + vat + sscl - (input.loyaltyRedeemedLkr || 0));
      const totalPaid = input.splitPayments.reduce((s, p) => s + p.amount, 0);

      const mockSale: SaleDto = {
        id: `sale-sim-${Date.now()}`,
        invoiceNumber,
        customerId: input.customerId,
        cashierUserId: 'cashier-01',
        subtotalLkr: subtotal,
        discountLkr: discount,
        taxVatLkr: vat,
        taxSsclLkr: sscl,
        loyaltyRedeemedLkr: input.loyaltyRedeemedLkr || 0,
        roundOffLkr: grandTotal - (taxable + vat + sscl),
        grandTotalLkr: grandTotal,
        paidAmountLkr: totalPaid,
        changeGivenLkr: Math.max(0, totalPaid - grandTotal),
        splitPayments: input.splitPayments,
        status: 'COMPLETED',
        prescriptionId: input.prescriptionId,
        idempotencyKey: input.idempotencyKey,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        items: input.items.map((item) => ({
          medicineId: item.medicineId,
          packagingLevel: item.packagingLevel,
          quantitySold: item.quantity,
          totalBaseUnits: item.quantity,
          unitPriceLkr: item.unitPriceLkr,
          totalPriceLkr: item.quantity * item.unitPriceLkr,
          allocations: [
            {
              batchId: 'mock-batch-01',
              batchNumber: 'B4490',
              expiryDate: '2028-10-31',
              allocatedBaseUnits: item.quantity,
              unitCostAtSale: item.unitPriceLkr * 0.65,
            },
          ],
        })),
      };

      return mockSale;
    }
  }

  async getReceipt(saleId: string): Promise<EscPosReceiptData> {
    try {
      const res = await fetch(`${API_BASE}/pos/sales/${saleId}/receipt`);
      if (res.ok) {
        return res.json();
      }
    } catch {
      // Fallback
    }

    // Default formatted ESC/POS receipt
    const divider = '='.repeat(48);
    const subDivider = '-'.repeat(48);

    const rawEscPosText = [
      divider,
      '         APEX HEALTHCARE PHARMACY               ',
      '        Main Dispensary - Colombo 03           ',
      '    142 Galle Road, Colombo 03, Sri Lanka      ',
      '     Tel: +94 11 258 9900 | +94 77 123 4567     ',
      '    Pharmacy Reg: NMRA/RET/COL/2026-0881        ',
      '            VAT/TIN: TIN-10928374-7000         ',
      divider,
      `Invoice: INV-202610-00104     Date: ${new Date().toLocaleDateString('en-LK')}`,
      'Cashier: cashier-01           Customer: Walk-in Patient',
      subDivider,
      'Item               Qty   Batch/Exp        Price',
      subDivider,
      'Panadol Extra 500mg/65mg',
      '  10 Units (B4490 - 08/28)            Rs. 180.00',
      subDivider,
      'Subtotal:                             Rs. 180.00',
      'VAT (18%):                             Rs. 32.40',
      'TOTAL DUE:                            Rs. 212.00',
      subDivider,
      'Payment Breakdown:',
      '  CASH:                               Rs. 500.00',
      '  CHANGE GIVEN:                       Rs. 288.00',
      divider,
      '  Thank you! Wishing you a speedy recovery.     ',
      '  NMRA Notice: Sold medicines cannot be returned',
      divider,
    ].join('\n');

    return {
      header: {
        storeName: 'APEX HEALTHCARE PHARMACY',
        branchName: 'Main Dispensary - Colombo 03',
        address: '142 Galle Road, Colombo 03, Sri Lanka',
        phone: '+94 11 258 9900',
        nmraLicenseNo: 'NMRA/RET/COL/2026-0881',
        vatTinNo: 'TIN-10928374-7000',
      },
      invoiceNumber: 'INV-202610-00104',
      dateStr: new Date().toLocaleDateString('en-LK'),
      cashierName: 'cashier-01',
      customerName: 'Walk-in Patient',
      items: [
        {
          medicineName: 'Panadol Extra 500mg/65mg',
          packagingLevel: 'UNIT',
          quantity: 10,
          baseUnits: 10,
          batchNumber: 'B4490',
          expiryDate: '08/28',
          priceLkr: 180.0,
        },
      ],
      subtotalLkr: 180.0,
      discountLkr: 0,
      taxVatLkr: 32.4,
      taxSsclLkr: 0,
      roundOffLkr: 0,
      grandTotalLkr: 212.0,
      payments: [{ method: 'CASH', amount: 500 }],
      changeGivenLkr: 288.0,
      rawEscPosText,
    };
  }
}

export const posApi = new PosApiService();
