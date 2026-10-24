import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Medicine } from '../../medicines/entities/medicine.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { Prescription } from '../entities/prescription.entity';
import { PrescriptionItem } from '../entities/prescription-item.entity';
import {
  ClinicalGateValidationPayload,
  ClinicalGateValidationResult,
  PrescriptionStatus,
  PrescriptionItemStatus,
  isValidLKNIC,
  isValidLKSLMC,
} from '@pharmacy/shared';

@Injectable()
export class PrescriptionGateService {
  constructor(
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly prescriptionItemRepo: Repository<PrescriptionItem>,
  ) {}

  async validateCart(
    payload: ClinicalGateValidationPayload,
  ): Promise<ClinicalGateValidationResult> {
    const result: ClinicalGateValidationResult = {
      allowed: true,
      requiresPharmacistOverride: false,
      contraindications: [],
      prescriptionErrors: [],
      controlledDrugViolations: [],
      refillViolations: [],
    };

    if (!payload.items || payload.items.length === 0) {
      throw new BadRequestException('Validation requires at least one cart item');
    }

    // 1. Fetch all medicines in cart
    const medicineIds = payload.items.map((i) => i.medicineId);
    const medicines = await this.medicineRepo.findByIds(medicineIds);
    const medicineMap = new Map(medicines.map((m) => [m.id, m]));

    // 2. Fetch Customer if provided
    let customer: Customer | null = null;
    if (payload.customerId) {
      customer = await this.customerRepo.findOne({
        where: { id: payload.customerId },
      });
    }

    // 3. Fetch Doctor if provided
    let doctor: Doctor | null = null;
    if (payload.doctorId) {
      doctor = await this.doctorRepo.findOne({
        where: { id: payload.doctorId },
      });
    }

    // 4. Fetch Prescription if provided
    let prescription: Prescription | null = null;
    if (payload.prescriptionId) {
      prescription = await this.prescriptionRepo.findOne({
        where: { id: payload.prescriptionId },
        relations: ['items', 'doctor', 'customer'],
      });
      if (prescription) {
        if (!doctor && prescription.doctor) {
          doctor = prescription.doctor;
        }
        if (!customer && prescription.customer) {
          customer = prescription.customer;
        }
      }
    }

    // --- GATE 1: Allergy Contraindication Check ---
    if (customer && customer.allergies && customer.allergies.length > 0) {
      const patientAllergies = customer.allergies.map((a) => a.trim().toLowerCase());

      for (const item of payload.items) {
        const med = medicineMap.get(item.medicineId);
        if (!med || !med.genericName) continue;

        const medGeneric = med.genericName.trim().toLowerCase();
        const matched = patientAllergies.find((allergy) =>
          medGeneric.includes(allergy) || allergy.includes(medGeneric)
        );

        if (matched) {
          result.contraindications.push({
            medicineId: med.id,
            medicineName: med.name,
            genericName: med.genericName,
            matchedAllergy: matched,
            message: `CONTRAINDICATION: Patient has documented allergy to [${matched}]. Pharmacist override code required.`,
          });
          result.requiresPharmacistOverride = true;
          // If valid pharmacist override code is provided, allowed can be overridden
          if (!payload.pharmacistOverrideCode || payload.pharmacistOverrideCode.trim() !== 'OVERRIDE-RX') {
            result.allowed = false;
          }
        }
      }
    }

    // --- GATE 2: Prescription Requirement & Refill Guards ---
    for (const item of payload.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) continue;

      if (med.requiresPrescription) {
        if (!prescription) {
          result.prescriptionErrors.push({
            medicineId: med.id,
            medicineName: med.name,
            reason: `Medicine "${med.name}" is Prescription-Only (POM) but no prescription was attached.`,
          });
          result.allowed = false;
        } else if (prescription.status !== PrescriptionStatus.VERIFIED) {
          result.prescriptionErrors.push({
            medicineId: med.id,
            medicineName: med.name,
            reason: `Prescription ${prescription.rxNumber} is not verified (Status: ${prescription.status}).`,
          });
          result.allowed = false;
        } else {
          // Check prescription expiration
          const todayStr = new Date().toISOString().split('T')[0];
          if (prescription.validUntil && prescription.validUntil < todayStr) {
            result.prescriptionErrors.push({
              medicineId: med.id,
              medicineName: med.name,
              reason: `Prescription ${prescription.rxNumber} has expired on ${prescription.validUntil}.`,
            });
            result.allowed = false;
          }

          // Match prescription line item
          const rxItem = prescription.items?.find((pItem) => pItem.medicineId === med.id);
          if (!rxItem) {
            result.prescriptionErrors.push({
              medicineId: med.id,
              medicineName: med.name,
              reason: `Medicine "${med.name}" is not listed in Prescription ${prescription.rxNumber}.`,
            });
            result.allowed = false;
          } else if (rxItem.itemStatus !== PrescriptionItemStatus.APPROVED) {
            result.prescriptionErrors.push({
              medicineId: med.id,
              medicineName: med.name,
              reason: `Prescription line for "${med.name}" was not approved by pharmacist (Status: ${rxItem.itemStatus}).`,
            });
            result.allowed = false;
          } else {
            // Check Refill & Quantity limit: total allowed = prescribed * (1 + refills_allowed_count)
            const maxAllowed = rxItem.prescribedQuantityBaseUnits * (1 + (rxItem.refillAllowed ? rxItem.refillsAllowedCount : 0));
            const newTotalDispensed = rxItem.dispensedQuantityBaseUnits + item.quantityBaseUnits;

            if (newTotalDispensed > maxAllowed) {
              result.refillViolations.push({
                itemId: rxItem.id,
                medicineId: med.id,
                medicineName: med.name,
                reason: `Requested ${item.quantityBaseUnits} units exceeds remaining prescription quota (${maxAllowed - rxItem.dispensedQuantityBaseUnits} units remaining).`,
              });
              result.allowed = false;
            }

            // Check Refill Interval if this is a subsequent dispense (refill)
            if (rxItem.dispensedQuantityBaseUnits > 0 && rxItem.lastDispensedAt) {
              const lastDispensed = new Date(rxItem.lastDispensedAt);
              const now = new Date();
              const diffMs = now.getTime() - lastDispensed.getTime();
              const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

              if (elapsedDays < rxItem.refillIntervalDays) {
                const daysRemaining = rxItem.refillIntervalDays - elapsedDays;
                result.refillViolations.push({
                  itemId: rxItem.id,
                  medicineId: med.id,
                  medicineName: med.name,
                  reason: `Refill interval not met (${daysRemaining} days remaining).`,
                  daysRemaining,
                });
                result.allowed = false;
              }
            }
          }
        }
      }

      // --- GATE 3: Controlled Substance (Schedule II / Narcotics) Legal Mandate ---
      if (med.isControlledSubstance) {
        if (!customer || !customer.nicOrPassport || !isValidLKNIC(customer.nicOrPassport)) {
          result.controlledDrugViolations.push({
            medicineId: med.id,
            medicineName: med.name,
            reason: `Schedule II Controlled Drug "${med.name}" requires patient with verified Sri Lankan NIC/Passport.`,
          });
          result.allowed = false;
        }

        if (!doctor || !doctor.registrationNumber || !isValidLKSLMC(doctor.registrationNumber)) {
          result.controlledDrugViolations.push({
            medicineId: med.id,
            medicineName: med.name,
            reason: `Schedule II Controlled Drug "${med.name}" requires prescribing doctor with verified SLMC registration number.`,
          });
          result.allowed = false;
        }
      }
    }

    return result;
  }
}
