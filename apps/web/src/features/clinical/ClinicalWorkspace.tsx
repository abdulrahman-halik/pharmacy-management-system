import React, { useState, useEffect } from 'react';
import { Button, Badge, Card } from '../../components/core';
import type { Customer, Doctor, Prescription, ControlledSubstanceRegister } from '@pharmacy/shared';
import { clinicalApi } from './services/clinicalApi';
import { PrescriptionVerifyModal } from './components/PrescriptionVerifyModal';
import { CustomerRegistry } from './components/CustomerRegistry';
import { DoctorDirectory } from './components/DoctorDirectory';
import { ControlledSubstanceLog } from './components/ControlledSubstanceLog';
import { GatekeeperSimulator } from './components/GatekeeperSimulator';
import {
  FileText,
  Users,
  Stethoscope,
  ShieldAlert,
  PlayCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export function ClinicalWorkspace() {
  const [activeTab, setActiveTab] = useState<
    'queue' | 'customers' | 'doctors' | 'controlled' | 'simulator'
  >('queue');

  // Role Simulator (Test Pharmacist vs Cashier 403 gating)
  const [activeRole, setActiveRole] = useState<'PHARMACIST' | 'CASHIER'>('PHARMACIST');

  // Data State
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [controlledEntries, setControlledEntries] = useState<ControlledSubstanceRegister[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Verification Modal State
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [rxData, custList, docList, ctrlList] = await Promise.all([
        clinicalApi.getAllPrescriptions(),
        clinicalApi.getCustomers(),
        clinicalApi.getDoctors(),
        clinicalApi.getControlledRegister(),
      ]);
      setPrescriptions(rxData);
      setCustomers(custList);
      setDoctors(docList);
      setControlledEntries(ctrlList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const pendingPrescriptions = prescriptions.filter((r) => r.status === 'PENDING');

  const handleOpenVerifyModal = (rx: Prescription) => {
    setSelectedRx(rx);
    setIsVerifyModalOpen(true);
  };

  const handleVerify = async (
    prescriptionId: string,
    decisions: Array<{ itemId: string; status: 'APPROVED' | 'REJECTED' }>,
    rejectionReason?: string,
  ) => {
    try {
      const updated = await clinicalApi.verifyPrescription(
        prescriptionId,
        {
          itemDecisions: decisions,
          rejectionReason: (rejectionReason as any) || null,
        },
        activeRole,
      );

      setPrescriptions((prev) =>
        prev.map((r) => (r.id === prescriptionId ? updated : r)),
      );
      alert(
        updated.status === 'VERIFIED'
          ? `Prescription ${updated.rxNumber} successfully verified by Pharmacist!`
          : `Prescription ${updated.rxNumber} has been rejected.`,
      );
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Clinical Workspace Header */}
      <div className="bg-white rounded-lg border border-clinical-slate-border p-6 shadow-solid flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-clinical-slate-heading tracking-tight font-sans">
              Phase 5: Clinical Governance & Prescription Gatekeeper
            </h1>
            <Badge variant="rx" size="md">
              SLMC & NMRA Compliant
            </Badge>
          </div>
          <p className="text-sm text-clinical-slate-muted max-w-3xl">
            Sri Lanka Medical Council practitioner validation, Patient 360 with allergy tracking, high-resolution digital prescription verification, and Schedule II Controlled Substance Register.
          </p>
        </div>

        {/* Role Switcher Toolbar */}
        <div className="flex items-center gap-3 bg-slate-50 border border-clinical-slate-border p-2 rounded-lg">
          <div className="text-xs">
            <span className="text-clinical-slate-muted block font-medium">Session Role:</span>
            <span className="font-bold text-clinical-slate-heading">{activeRole}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveRole('PHARMACIST')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                activeRole === 'PHARMACIST'
                  ? 'bg-clinical-emerald text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Pharmacist
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('CASHIER')}
              className={`px-2.5 py-1 text-xs font-bold rounded transition ${
                activeRole === 'CASHIER'
                  ? 'bg-clinical-crimson text-white'
                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Cashier (Test 403)
            </button>
          </div>
          <Button
            variant="solid-neutral"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white border-b border-clinical-slate-border px-4 py-2 shadow-solid-sm flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'queue'
                ? 'bg-clinical-emerald text-white shadow-solid-sm'
                : 'text-clinical-slate-heading hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Verification Queue
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-clinical-emerald font-black">
              {pendingPrescriptions.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-clinical-emerald text-white shadow-solid-sm'
                : 'text-clinical-slate-heading hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Patient 360 Registry ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'doctors'
                ? 'bg-clinical-emerald text-white shadow-solid-sm'
                : 'text-clinical-slate-heading hover:bg-slate-100'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            SLMC Doctor Directory ({doctors.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('controlled')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'controlled'
                ? 'bg-clinical-emerald text-white shadow-solid-sm'
                : 'text-clinical-slate-heading hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Controlled Substance Register
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-md text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-clinical-emerald text-white shadow-solid-sm'
                : 'text-clinical-slate-heading hover:bg-slate-100'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Gatekeeper Simulator
          </button>
        </div>
      </div>

      {/* Tab 1: Prescription Verification Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prescriptions.map((rx) => {
              const isPending = rx.status === 'PENDING';
              const isVerified = rx.status === 'VERIFIED';

              return (
                <Card
                  key={rx.id}
                  className={`hover:border-clinical-emerald transition ${
                    isPending ? 'border-amber-300 bg-amber-50/20' : ''
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-clinical-slate-heading font-mono">
                          {rx.rxNumber}
                        </h4>
                        <p className="text-xs text-clinical-slate-muted">
                          Issued: {rx.issuedDate} • Valid: {rx.validUntil}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isPending ? 'low-stock' : isVerified ? 'in-stock' : 'expired'
                        }
                        size="sm"
                      >
                        {rx.status}
                      </Badge>
                    </div>

                    {/* Patient & Doctor Brief */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Patient:</span>
                        <span className="font-bold text-clinical-slate-heading">
                          {rx.customerName || 'Patient Details'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Prescriber:</span>
                        <span className="font-bold text-clinical-teal">
                          {rx.doctorName || 'Dr. Practitioner'}
                        </span>
                      </div>
                    </div>

                    {/* Line Items Count */}
                    <div className="text-xs text-clinical-slate-muted flex items-center justify-between">
                      <span>Prescribed Drugs:</span>
                      <span className="font-bold font-mono text-clinical-slate-heading">
                        {rx.items.length} Lines
                      </span>
                    </div>

                    {/* Action */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-500">
                        {rx.imageUrls?.length || 1} Photo Attached
                      </span>
                      <Button
                        variant={isPending ? 'solid-primary' : 'solid-neutral'}
                        size="sm"
                        leftIcon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenVerifyModal(rx)}
                      >
                        {isPending ? 'Review & Verify' : 'View Prescription'}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Patient 360 Registry */}
      {activeTab === 'customers' && (
        <CustomerRegistry
          customers={customers}
          onAddCustomer={async (input) => {
            const newCust = await clinicalApi.createCustomer(input);
            setCustomers((prev) => [newCust, ...prev]);
          }}
          isLoading={isLoading}
        />
      )}

      {/* Tab 3: SLMC Doctor Directory */}
      {activeTab === 'doctors' && (
        <DoctorDirectory
          doctors={doctors}
          onAddDoctor={async (input) => {
            const newDoc = await clinicalApi.createDoctor(input);
            setDoctors((prev) => [newDoc, ...prev]);
          }}
          isLoading={isLoading}
        />
      )}

      {/* Tab 4: Controlled Substance Register */}
      {activeTab === 'controlled' && (
        <ControlledSubstanceLog entries={controlledEntries} isLoading={isLoading} />
      )}

      {/* Tab 5: Gatekeeper Simulator */}
      {activeTab === 'simulator' && (
        <GatekeeperSimulator
          customers={customers}
          doctors={doctors}
          prescriptions={prescriptions}
        />
      )}

      {/* Prescription Review Modal */}
      <PrescriptionVerifyModal
        prescription={selectedRx}
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        onVerify={handleVerify}
        userRole={activeRole}
      />
    </div>
  );
}
