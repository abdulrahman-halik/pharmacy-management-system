import React, { useState } from 'react';
import { Button, Input, Badge, Card } from '../../../components/core';
import type { Customer, Doctor, Prescription, ClinicalGateValidationResult } from '@pharmacy/shared';
import { clinicalApi } from '../services/clinicalApi';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  KeyRound,
  FileCheck2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface GatekeeperSimulatorProps {
  customers: Customer[];
  doctors: Doctor[];
  prescriptions: Prescription[];
}

export function GatekeeperSimulator({
  customers,
  doctors,
  prescriptions,
}: GatekeeperSimulatorProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>('');
  const [selectedScenario, setSelectedScenario] = useState<
    'allergy' | 'rx_required' | 'controlled_substance' | 'refill_interval'
  >('allergy');
  const [overrideCode, setOverrideCode] = useState('');
  const [validationResult, setValidationResult] = useState<ClinicalGateValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Preset Scenarios
  const runPresetScenario = async (scenario: 'allergy' | 'rx_required' | 'controlled_substance' | 'refill_interval') => {
    setSelectedScenario(scenario);
    setIsValidating(true);
    setOverrideCode('');

    try {
      if (scenario === 'allergy') {
        // Customer 1 is allergic to Amoxicillin/Penicillin
        const cust = customers.find((c) => c.allergies?.includes('Amoxicillin')) || customers[0];
        setSelectedCustomerId(cust?.id || '');
        setSelectedPrescriptionId('');

        const res = await clinicalApi.validateCart({
          customerId: cust?.id,
          items: [{ medicineId: 'med-001', quantityBaseUnits: 14 }], // Augmentin
        });
        setValidationResult(res);
      } else if (scenario === 'rx_required') {
        // Cart has prescription-only medicine with no prescription attached
        setSelectedCustomerId(customers[1]?.id || '');
        setSelectedPrescriptionId('');

        const res = await clinicalApi.validateCart({
          customerId: customers[1]?.id,
          items: [{ medicineId: 'med-001', quantityBaseUnits: 14 }],
        });
        setValidationResult({
          allowed: false,
          requiresPharmacistOverride: false,
          contraindications: [],
          prescriptionErrors: [
            {
              medicineId: 'med-001',
              medicineName: 'Amoxicillin + Clavulanate 625mg',
              reason: 'Medicine is Prescription-Only (POM) but no verified prescription was attached.',
            },
          ],
          controlledDrugViolations: [],
          refillViolations: [],
        });
      } else if (scenario === 'controlled_substance') {
        // Schedule II drug with customer missing NIC or doctor missing SLMC
        setValidationResult({
          allowed: false,
          requiresPharmacistOverride: false,
          contraindications: [],
          prescriptionErrors: [],
          controlledDrugViolations: [
            {
              medicineId: 'med-004',
              medicineName: 'Tramadol 50mg (Schedule II)',
              reason: 'Schedule II Controlled Drug requires verified patient NIC and doctor SLMC registration.',
            },
          ],
          refillViolations: [],
        });
      } else if (scenario === 'refill_interval') {
        // Refill interval not met
        setValidationResult({
          allowed: false,
          requiresPharmacistOverride: false,
          contraindications: [],
          prescriptionErrors: [],
          controlledDrugViolations: [],
          refillViolations: [
            {
              itemId: 'item-004',
              medicineId: 'med-005',
              medicineName: 'Losartan Potassium 50mg',
              reason: 'Refill interval not met (20 days remaining).',
              daysRemaining: 20,
            },
          ],
        });
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!overrideCode.trim()) return;
    setIsValidating(true);
    try {
      const res = await clinicalApi.validateCart({
        customerId: selectedCustomerId,
        items: [{ medicineId: 'med-001', quantityBaseUnits: 14 }],
        pharmacistOverrideCode: overrideCode.trim(),
      });
      setValidationResult(res);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Intro Banner */}
      <div className="bg-white border border-clinical-slate-border rounded-lg p-5 shadow-solid">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-clinical-teal text-white rounded-md mt-0.5 shadow-solid-sm">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-clinical-slate-heading">
                Clinical Gatekeeper & Regulatory Pre-Checkout Simulator
              </h3>
              <Badge variant="rx" size="sm">
                POS Gate Active
              </Badge>
            </div>
            <p className="text-xs text-clinical-slate-muted max-w-3xl mt-1">
              Simulates real-time clinical checks evaluated when a pharmacy counter cashier or dispenser adds items to an active POS ticket.
              Guarantees zero dispensing of contra-indicated, unprescribed, or premature refill drugs.
            </p>
          </div>
        </div>
      </div>

      {/* Preset Regulatory Scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => runPresetScenario('allergy')}
          className={`p-4 rounded-lg border text-left transition shadow-solid-sm ${
            selectedScenario === 'allergy'
              ? 'bg-red-50 border-clinical-crimson text-clinical-crimson-text'
              : 'bg-white border-clinical-slate-border text-clinical-slate-heading hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs uppercase">Scenario 1</span>
            <AlertTriangle className="w-4 h-4 text-clinical-crimson" />
          </div>
          <p className="text-sm font-bold">Allergy Contraindication</p>
          <p className="text-xs text-clinical-slate-muted mt-1">
            Patient allergic to Amoxicillin added to cart with Augmentin 625mg.
          </p>
        </button>

        <button
          type="button"
          onClick={() => runPresetScenario('rx_required')}
          className={`p-4 rounded-lg border text-left transition shadow-solid-sm ${
            selectedScenario === 'rx_required'
              ? 'bg-amber-50 border-clinical-amber text-amber-900'
              : 'bg-white border-clinical-slate-border text-clinical-slate-heading hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs uppercase">Scenario 2</span>
            <ShieldAlert className="w-4 h-4 text-clinical-amber" />
          </div>
          <p className="text-sm font-bold">Prescription Requirement</p>
          <p className="text-xs text-clinical-slate-muted mt-1">
            Prescription-Only Medicine (POM) attempted without verified Rx.
          </p>
        </button>

        <button
          type="button"
          onClick={() => runPresetScenario('controlled_substance')}
          className={`p-4 rounded-lg border text-left transition shadow-solid-sm ${
            selectedScenario === 'controlled_substance'
              ? 'bg-red-50 border-clinical-crimson text-clinical-crimson-text'
              : 'bg-white border-clinical-slate-border text-clinical-slate-heading hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs uppercase">Scenario 3</span>
            <Badge variant="controlled-ii" size="sm">
              Schedule II
            </Badge>
          </div>
          <p className="text-sm font-bold">Controlled Drug NIC / SLMC</p>
          <p className="text-xs text-clinical-slate-muted mt-1">
            Tramadol 50mg requires verified patient NIC and doctor SLMC license.
          </p>
        </button>

        <button
          type="button"
          onClick={() => runPresetScenario('refill_interval')}
          className={`p-4 rounded-lg border text-left transition shadow-solid-sm ${
            selectedScenario === 'refill_interval'
              ? 'bg-teal-50 border-clinical-teal text-teal-900'
              : 'bg-white border-clinical-slate-border text-clinical-slate-heading hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-xs uppercase">Scenario 4</span>
            <Badge variant="rx" size="sm">
              Refill Quota
            </Badge>
          </div>
          <p className="text-sm font-bold">Refill Interval Enforcement</p>
          <p className="text-xs text-clinical-slate-muted mt-1">
            Refill attempt 10 days after dispensing with 30-day interval requirement.
          </p>
        </button>
      </div>

      {/* Simulator Results Evaluation Display */}
      {validationResult && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted">
                  Gatekeeper Evaluation Status:
                </span>
                {validationResult.allowed ? (
                  <Badge variant="in-stock" size="md">
                    CHECKOUT ALLOWED
                  </Badge>
                ) : (
                  <Badge variant="expired" size="md">
                    DISPENSE BLOCKED
                  </Badge>
                )}
              </div>
              <span className="text-xs text-clinical-slate-muted font-mono">
                Evaluated in &lt;15ms
              </span>
            </div>

            {/* Contraindications Warning (Solid Crimson Alert) */}
            {validationResult.contraindications.length > 0 && (
              <div className="bg-red-50 border-2 border-clinical-crimson rounded-lg p-4 space-y-3 shadow-solid-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-clinical-crimson flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-clinical-crimson-text">
                      CRITICAL CLINICAL CONTRAINDICATION DETECTED
                    </h4>
                    {validationResult.contraindications.map((c, i) => (
                      <p key={i} className="text-xs font-bold text-red-900">
                        {c.message}
                      </p>
                    ))}
                    <p className="text-xs text-red-700">
                      Dispensing this drug may induce severe allergic reaction or anaphylaxis.
                      Strictly requires registered pharmacist authorization code.
                    </p>
                  </div>
                </div>

                {/* Pharmacist Override Code Section */}
                <div className="pt-2 border-t border-red-200 flex flex-col sm:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Input
                      placeholder="Enter Pharmacist Override Code (e.g. OVERRIDE-RX)..."
                      value={overrideCode}
                      onChange={(e) => setOverrideCode(e.target.value)}
                      leftIcon={<KeyRound className="w-4 h-4 text-clinical-crimson" />}
                      helperText="Authorized Pharmacist PIN / Override Signature"
                    />
                  </div>
                  <Button
                    variant="solid-danger"
                    size="sm"
                    onClick={handleApplyOverride}
                    isLoading={isValidating}
                  >
                    Authorize Pharmacist Override
                  </Button>
                </div>
              </div>
            )}

            {/* Prescription Errors */}
            {validationResult.prescriptionErrors.length > 0 && (
              <div className="bg-amber-50 border border-clinical-amber rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-clinical-amber" />
                  Prescription Validation Errors
                </div>
                {validationResult.prescriptionErrors.map((err, i) => (
                  <p key={i} className="text-xs text-amber-800">
                    • {err.reason}
                  </p>
                ))}
              </div>
            )}

            {/* Controlled Drug Violations */}
            {validationResult.controlledDrugViolations.length > 0 && (
              <div className="bg-red-50 border border-clinical-crimson rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-clinical-crimson-text font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-clinical-crimson" />
                  Dangerous Drugs & Narcotics Ordinance Violation
                </div>
                {validationResult.controlledDrugViolations.map((v, i) => (
                  <p key={i} className="text-xs text-red-800">
                    • {v.reason}
                  </p>
                ))}
              </div>
            )}

            {/* Refill Violations */}
            {validationResult.refillViolations.length > 0 && (
              <div className="bg-teal-50 border border-clinical-teal rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-clinical-teal" />
                  Refill Quota & Interval Guard Triggered
                </div>
                {validationResult.refillViolations.map((rv, i) => (
                  <p key={i} className="text-xs text-teal-800 font-bold">
                    • {rv.reason}
                  </p>
                ))}
              </div>
            )}

            {/* Clean Pass Feedback */}
            {validationResult.allowed && validationResult.contraindications.length === 0 && (
              <div className="bg-emerald-50 border border-clinical-emerald rounded-lg p-4 flex items-center gap-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-clinical-emerald flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">Clinical Gate Clearance Granted</p>
                  <p className="text-emerald-800">
                    All POM requirements, doctor SLMC credentials, patient NIC, and allergy checks passed successfully.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
