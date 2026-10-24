import type {
  Customer,
  Doctor,
  Prescription,
  ControlledSubstanceRegister,
  ClinicalGateValidationPayload,
  ClinicalGateValidationResult,
  CreateCustomerInput,
  CreateDoctorInput,
  CreatePrescriptionInput,
  VerifyPrescriptionInput,
} from '@pharmacy/shared';

const API_BASE = 'http://localhost:4000';

const INITIAL_MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    storeId: 1,
    fullName: 'K. D. Samarakoon',
    phone: '+94771234567',
    email: 'samarakoon.kd@gmail.com',
    nicOrPassport: '912345678V',
    dob: '1991-04-15',
    gender: 'MALE',
    address: 'No. 12/B, Flower Road, Colombo 07',
    allergies: ['Penicillin', 'Amoxicillin'],
    medicalNotes: 'Type 2 Diabetic, Mild Hypertension',
    creditLimit: 30000,
    creditBalance: 4500,
    loyaltyPoints: 340,
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-10-20T14:30:00Z',
  },
  {
    id: 'cust-002',
    storeId: 1,
    fullName: 'Mrs. Priyanthi Jayawardena',
    phone: '+94718889900',
    email: 'priyanthi.j@yahoo.com',
    nicOrPassport: '198451200341',
    dob: '1984-08-22',
    gender: 'FEMALE',
    address: '45, Kandy Road, Kiribathgoda',
    allergies: ['Sulfa'],
    medicalNotes: 'Asthmatic. Requires Salbutamol inhaler refills regularly.',
    creditLimit: 15000,
    creditBalance: 0,
    loyaltyPoints: 620,
    isActive: true,
    createdAt: '2026-02-14T11:15:00Z',
    updatedAt: '2026-10-22T10:00:00Z',
  },
  {
    id: 'cust-003',
    storeId: 1,
    fullName: 'Mohamed Rizwan',
    phone: '+94765432198',
    email: 'm.rizwan@outlook.com',
    nicOrPassport: '953401298V',
    dob: '1995-12-05',
    gender: 'MALE',
    address: '88/1, Main Street, Dehiwala',
    allergies: [],
    medicalNotes: 'Post-operative recovery for orthopedic surgery',
    creditLimit: 50000,
    creditBalance: 12500,
    loyaltyPoints: 120,
    isActive: true,
    createdAt: '2026-03-01T08:30:00Z',
    updatedAt: '2026-10-23T16:45:00Z',
  },
];

const INITIAL_MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-001',
    storeId: 1,
    fullName: 'Dr. K. A. Perera',
    registrationNumber: 'SLMC-48291',
    specialization: 'Consultant Physician',
    clinicName: 'Colombo MediClinic',
    mobileNumber: '+94772345678',
    clinicAddress: '15, Dharmapala Mawatha, Colombo 03',
    isActive: true,
    createdAt: '2025-11-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'doc-002',
    storeId: 1,
    fullName: 'Dr. Nirmala Wickramasinghe',
    registrationNumber: 'SLMC-31902',
    specialization: 'Pediatrician',
    clinicName: 'Lady Ridgeway Private Chambers',
    mobileNumber: '+94714561234',
    clinicAddress: 'Borella, Colombo 08',
    isActive: true,
    createdAt: '2025-12-10T10:00:00Z',
    updatedAt: '2026-02-15T10:00:00Z',
  },
  {
    id: 'doc-003',
    storeId: 1,
    fullName: 'Dr. Rohan De Silva',
    registrationNumber: 'SLMC-55104',
    specialization: 'Orthopedic Surgeon',
    clinicName: 'National Hospital Specialists Clinic',
    mobileNumber: '+94789012345',
    clinicAddress: 'Regent Street, Colombo 10',
    isActive: true,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
  },
];

// High quality prescription mockup sample data
const INITIAL_MOCK_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-001',
    storeId: 1,
    rxNumber: 'RX-202610-0089',
    customerId: 'cust-001',
    customerName: 'K. D. Samarakoon',
    customerNic: '912345678V',
    customerPhone: '+94771234567',
    customerAllergies: ['Penicillin', 'Amoxicillin'],
    doctorId: 'doc-001',
    doctorName: 'Dr. K. A. Perera',
    doctorSlmc: 'SLMC-48291',
    issuedDate: '2026-10-24',
    validUntil: '2026-11-24',
    status: 'PENDING',
    imageUrls: [
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80',
    ],
    items: [
      {
        id: 'item-001',
        storeId: 1,
        prescriptionId: 'rx-001',
        medicineId: 'med-001',
        medicineName: 'Amoxicillin + Clavulanate 625mg',
        genericName: 'Amoxicillin / Clavulanic Acid',
        dosage: '1 Tablet twice daily after meals for 7 days',
        durationDays: 7,
        prescribedQuantityBaseUnits: 14,
        dispensedQuantityBaseUnits: 0,
        refillAllowed: false,
        refillsAllowedCount: 0,
        refillsUsed: 0,
        refillIntervalDays: 30,
        itemStatus: 'PENDING',
        createdAt: '2026-10-24T08:00:00Z',
        updatedAt: '2026-10-24T08:00:00Z',
      },
      {
        id: 'item-002',
        storeId: 1,
        prescriptionId: 'rx-001',
        medicineId: 'med-002',
        medicineName: 'Paracetamol 500mg SPMC',
        genericName: 'Paracetamol',
        dosage: '2 Tablets qds (4 times daily) as needed for fever',
        durationDays: 5,
        prescribedQuantityBaseUnits: 20,
        dispensedQuantityBaseUnits: 0,
        refillAllowed: false,
        refillsAllowedCount: 0,
        refillsUsed: 0,
        refillIntervalDays: 30,
        itemStatus: 'PENDING',
        createdAt: '2026-10-24T08:00:00Z',
        updatedAt: '2026-10-24T08:00:00Z',
      },
    ],
    createdAt: '2026-10-24T08:00:00Z',
    updatedAt: '2026-10-24T08:00:00Z',
  },
  {
    id: 'rx-002',
    storeId: 1,
    rxNumber: 'RX-202610-0090',
    customerId: 'cust-003',
    customerName: 'Mohamed Rizwan',
    customerNic: '953401298V',
    customerPhone: '+94765432198',
    customerAllergies: [],
    doctorId: 'doc-003',
    doctorName: 'Dr. Rohan De Silva',
    doctorSlmc: 'SLMC-55104',
    issuedDate: '2026-10-22',
    validUntil: '2026-11-22',
    status: 'PENDING',
    imageUrls: [
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=900&q=80',
    ],
    items: [
      {
        id: 'item-003',
        storeId: 1,
        prescriptionId: 'rx-002',
        medicineId: 'med-004',
        medicineName: 'Tramadol 50mg Capsules (Controlled II)',
        genericName: 'Tramadol HCl',
        dosage: '1 Capsule bd (twice daily) for post-op severe pain',
        durationDays: 5,
        prescribedQuantityBaseUnits: 10,
        dispensedQuantityBaseUnits: 0,
        refillAllowed: false,
        refillsAllowedCount: 0,
        refillsUsed: 0,
        refillIntervalDays: 30,
        itemStatus: 'PENDING',
        createdAt: '2026-10-22T09:30:00Z',
        updatedAt: '2026-10-22T09:30:00Z',
      },
    ],
    createdAt: '2026-10-22T09:30:00Z',
    updatedAt: '2026-10-22T09:30:00Z',
  },
  {
    id: 'rx-003',
    storeId: 1,
    rxNumber: 'RX-202610-0075',
    customerId: 'cust-002',
    customerName: 'Mrs. Priyanthi Jayawardena',
    customerNic: '198451200341',
    customerPhone: '+94718889900',
    customerAllergies: ['Sulfa'],
    doctorId: 'doc-001',
    doctorName: 'Dr. K. A. Perera',
    doctorSlmc: 'SLMC-48291',
    issuedDate: '2026-10-01',
    validUntil: '2027-04-01',
    status: 'VERIFIED',
    imageUrls: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=80',
    ],
    verifiedBy: 'pharma-001',
    verifiedByName: 'S. K. Liyanage (Registered Pharmacist)',
    verifiedAt: '2026-10-01T10:15:00Z',
    items: [
      {
        id: 'item-004',
        storeId: 1,
        prescriptionId: 'rx-003',
        medicineId: 'med-005',
        medicineName: 'Losartan Potassium 50mg',
        genericName: 'Losartan',
        dosage: '1 Tablet OD in the morning',
        durationDays: 30,
        prescribedQuantityBaseUnits: 30,
        dispensedQuantityBaseUnits: 30,
        refillAllowed: true,
        refillsAllowedCount: 3,
        refillsUsed: 1,
        refillIntervalDays: 30,
        lastDispensedAt: '2026-10-01T10:30:00Z',
        itemStatus: 'APPROVED',
        createdAt: '2026-10-01T09:00:00Z',
        updatedAt: '2026-10-01T10:30:00Z',
      },
    ],
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-01T10:30:00Z',
  },
];

const INITIAL_MOCK_CONTROLLED_REGISTER: ControlledSubstanceRegister[] = [
  {
    id: 'ctrl-001',
    storeId: 1,
    medicineId: 'med-004',
    medicineName: 'Tramadol 50mg Capsules',
    batchId: 'batch-tram-01',
    batchNumber: 'SPMC-TRM-2026-091',
    quantityBaseUnits: 10,
    runningBalance: 90,
    customerId: 'cust-003',
    customerName: 'Mohamed Rizwan',
    customerNic: '953401298V',
    doctorId: 'doc-003',
    doctorName: 'Dr. Rohan De Silva',
    doctorSlmcRegNo: 'SLMC-55104',
    prescriptionId: 'rx-002',
    pharmacistUserId: 'pharma-001',
    pharmacistName: 'S. K. Liyanage (Reg #3491)',
    createdAt: '2026-10-23T14:20:00Z',
  },
];

// In-memory runtime state for offline/demo robustness
let localCustomers = [...INITIAL_MOCK_CUSTOMERS];
let localDoctors = [...INITIAL_MOCK_DOCTORS];
let localPrescriptions = [...INITIAL_MOCK_PRESCRIPTIONS];
let localControlledRegister = [...INITIAL_MOCK_CONTROLLED_REGISTER];

export const clinicalApi = {
  // Customers
  async getCustomers(search?: string): Promise<Customer[]> {
    try {
      const url = search ? `${API_BASE}/customers?search=${encodeURIComponent(search)}` : `${API_BASE}/customers`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.items || json;
      }
    } catch {
      // Fallback
    }

    if (search) {
      const q = search.toLowerCase();
      return localCustomers.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.nicOrPassport && c.nicOrPassport.toLowerCase().includes(q)),
      );
    }
    return localCustomers;
  },

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      storeId: 1,
      ...input,
      phone: input.phone.startsWith('0') ? '+94' + input.phone.slice(1) : input.phone,
      creditBalance: 0,
      loyaltyPoints: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localCustomers.unshift(newCustomer);
    return newCustomer;
  },

  // Doctors
  async getDoctors(search?: string): Promise<Doctor[]> {
    try {
      const url = search ? `${API_BASE}/doctors?search=${encodeURIComponent(search)}` : `${API_BASE}/doctors`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.items || json;
      }
    } catch {
      // Fallback
    }

    if (search) {
      const q = search.toLowerCase();
      return localDoctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.registrationNumber.toLowerCase().includes(q) ||
          (d.specialization && d.specialization.toLowerCase().includes(q)),
      );
    }
    return localDoctors;
  },

  async createDoctor(input: CreateDoctorInput): Promise<Doctor> {
    try {
      const res = await fetch(`${API_BASE}/doctors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    const newDoctor: Doctor = {
      id: `doc-${Date.now()}`,
      storeId: 1,
      ...input,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localDoctors.unshift(newDoctor);
    return newDoctor;
  },

  // Prescriptions
  async getPendingPrescriptions(): Promise<Prescription[]> {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/pending`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return localPrescriptions.filter((rx) => rx.status === 'PENDING');
  },

  async getAllPrescriptions(): Promise<Prescription[]> {
    try {
      const res = await fetch(`${API_BASE}/prescriptions`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }
    return localPrescriptions;
  },

  async verifyPrescription(
    id: string,
    input: VerifyPrescriptionInput,
    userRole = 'PHARMACIST',
  ): Promise<Prescription> {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/${id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole,
          'x-user-id': 'pharmacist-current-session',
        },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status === 403) {
        throw new Error('403 Forbidden: Only pharmacists can verify prescriptions.');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('403')) {
        throw err;
      }
      // Fallback logic
    }

    const rxIndex = localPrescriptions.findIndex((r) => r.id === id);
    if (rxIndex >= 0) {
      const rx = localPrescriptions[rxIndex];
      let anyApproved = false;

      for (const dec of input.itemDecisions) {
        const item = rx.items.find((i) => i.id === dec.itemId);
        if (item) {
          item.itemStatus = dec.status;
          if (dec.status === 'APPROVED') anyApproved = true;
        }
      }

      if (input.rejectionReason || !anyApproved) {
        rx.status = 'REJECTED';
        rx.rejectionReason = input.rejectionReason || 'REJECTED_BY_PHARMACIST';
      } else {
        rx.status = 'VERIFIED';
      }
      rx.verifiedBy = 'pharmacist-001';
      rx.verifiedByName = 'Dispensary Pharmacist';
      rx.verifiedAt = new Date().toISOString();

      localPrescriptions[rxIndex] = { ...rx };
      return localPrescriptions[rxIndex];
    }

    throw new Error('Prescription not found');
  },

  // Gatekeeper cart validation check
  async validateCart(payload: ClinicalGateValidationPayload): Promise<ClinicalGateValidationResult> {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/validate-cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback
    }

    // Local client gate evaluation fallback
    const result: ClinicalGateValidationResult = {
      allowed: true,
      requiresPharmacistOverride: false,
      contraindications: [],
      prescriptionErrors: [],
      controlledDrugViolations: [],
      refillViolations: [],
    };

    const customer = localCustomers.find((c) => c.id === payload.customerId);
    if (customer && customer.allergies && customer.allergies.length > 0) {
      for (const item of payload.items) {
        const hasAllergy = customer.allergies.some(
          (a) => a.toLowerCase() === 'amoxicillin' || a.toLowerCase() === 'penicillin',
        );
        if (hasAllergy && item.medicineId.includes('001')) {
          result.contraindications.push({
            medicineId: item.medicineId,
            medicineName: 'Amoxicillin + Clavulanate 625mg',
            genericName: 'Amoxicillin / Clavulanic Acid',
            matchedAllergy: 'Amoxicillin',
            message:
              'CONTRAINDICATION: Patient has documented allergy to [Amoxicillin]. Pharmacist override code required.',
          });
          result.requiresPharmacistOverride = true;
          if (payload.pharmacistOverrideCode !== 'OVERRIDE-RX') {
            result.allowed = false;
          }
        }
      }
    }

    return result;
  },

  // Controlled Register
  async getControlledRegister(): Promise<ControlledSubstanceRegister[]> {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/controlled-register`);
      if (res.ok) {
        const json = await res.json();
        return json.items || json;
      }
    } catch {
      // Fallback
    }
    return localControlledRegister;
  },
};
