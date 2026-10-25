import React, { useState, useEffect } from 'react';
import { Search, UserCheck, X, ShieldAlert, CreditCard, Award, FileText, CheckCircle2 } from 'lucide-react';
import type { Customer, Prescription } from '@pharmacy/shared';
import { clinicalApi } from '../../clinical/services/clinicalApi';

interface CustomerLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCustomer: Customer | null;
  selectedPrescription: Prescription | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onSelectPrescription: (prescription: Prescription | null) => void;
  requiresPrescription: boolean;
}

export const CustomerLookupModal: React.FC<CustomerLookupModalProps> = ({
  isOpen,
  onClose,
  selectedCustomer,
  selectedPrescription,
  onSelectCustomer,
  onSelectPrescription,
  requiresPrescription,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'customer' | 'prescription'>('customer');

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [custList, rxList] = await Promise.all([
        clinicalApi.getCustomers(searchTerm),
        clinicalApi.getAllPrescriptions(),
      ]);
      setCustomers(custList);
      setPrescriptions(rxList);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter verified prescriptions for active customer if selected
  const eligiblePrescriptions = prescriptions.filter((rx) => {
    if (rx.status !== 'VERIFIED') return false;
    if (selectedCustomer) {
      return rx.customerId === selectedCustomer.id;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[620px] w-full max-w-3xl flex-col rounded-xl border border-slate-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Customer & Clinical Prescription Lookup (F4)
              </h2>
              <p className="text-xs text-slate-500">
                Identify registered patient profiles, review allergy contraindications, credit limits & verified Rxs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2">
          <button
            onClick={() => setActiveTab('customer')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'customer'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Registered Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('prescription')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === 'prescription'
                ? 'border-emerald-700 text-emerald-800 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Verified Prescriptions ({eligiblePrescriptions.length})
            {requiresPrescription && !selectedPrescription && (
              <span className="ml-1.5 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                Required
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'customer'
                  ? 'Search customer by name, phone (+94 7X ...), or NIC...'
                  : 'Search by prescription token, doctor name, or diagnosis...'
              }
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'customer' ? (
            customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-sm font-medium text-slate-500">No customers found matching &quot;{searchTerm}&quot;</p>
                <p className="text-xs text-slate-400 mt-1">Try another phone number or clear search</p>
              </div>
            ) : (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const availableCredit = Math.max(0, c.creditLimit - c.creditBalance);

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (isSelected) {
                        onSelectCustomer(null);
                      } else {
                        onSelectCustomer(c);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-700'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-base">{c.fullName}</span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                              <CheckCircle2 className="h-3 w-3" /> Attached
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          <span>Phone: <strong className="text-slate-800">{c.phone}</strong></span>
                          {c.nicOrPassport && <span>NIC: <strong className="text-slate-800">{c.nicOrPassport}</strong></span>}
                          {c.email && <span>Email: {c.email}</span>}
                        </div>
                      </div>

                      {/* Loyalty & Credit Badges */}
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                          <Award className="h-3.5 w-3.5" />
                          <span>{c.loyaltyPoints} Points</span>
                        </div>
                      </div>
                    </div>

                    {/* Allergies and Credit Summary */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2.5 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {c.allergies && c.allergies.length > 0 ? (
                          <>
                            <span className="flex items-center gap-1 font-semibold text-rose-700">
                              <ShieldAlert className="h-3.5 w-3.5" /> Allergies:
                            </span>
                            {c.allergies.map((all, idx) => (
                              <span
                                key={idx}
                                className="rounded bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200"
                              >
                                {all}
                              </span>
                            ))}
                          </>
                        ) : (
                          <span className="text-slate-400 italic">No recorded allergies</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-slate-700">
                        <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                        <span>Credit Balance: <strong className="text-slate-900">Rs. {c.creditBalance.toLocaleString('en-LK')}</strong></span>
                        <span className="text-slate-400">/ Limit: Rs. {c.creditLimit.toLocaleString('en-LK')}</span>
                        <span className="font-semibold text-emerald-700">
                          (Avail: Rs. {availableCredit.toLocaleString('en-LK')})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : eligiblePrescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <p className="text-sm font-medium text-slate-500">
                {selectedCustomer
                  ? `No verified prescriptions found for customer "${selectedCustomer.fullName}".`
                  : 'No verified prescriptions currently available.'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Please verify prescriptions via Clinical Module (Phase 5) first.
              </p>
            </div>
          ) : (
            eligiblePrescriptions.map((rx) => {
              const isSelected = selectedPrescription?.id === rx.id;

              return (
                <div
                  key={rx.id}
                  onClick={() => {
                    if (isSelected) {
                      onSelectPrescription(null);
                    } else {
                      onSelectPrescription(rx);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-700'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm font-mono">
                          Rx #{rx.rxNumber || rx.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          VERIFIED
                        </span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
                            <CheckCircle2 className="h-3 w-3" /> Attached
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        Patient: <strong className="text-slate-800">{rx.customerName || 'Registered Patient'}</strong> | Doctor:{' '}
                        <strong className="text-slate-800">{rx.doctorName || 'SLMC Registered'}</strong>
                      </p>
                    </div>

                    <div className="text-right text-xs text-slate-500">
                      <span>Refills Allowed: {rx.items[0]?.refillsAllowedCount || 0}</span>
                      <div className="font-semibold text-slate-700">Refills Used: {rx.items[0]?.refillsUsed || 0}</div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200/80 pt-2 text-xs">
                    <p className="font-semibold text-slate-700 mb-1">Prescribed Items:</p>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                      {rx.items.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium text-slate-800">{item.medicineName || 'Prescribed Medicine'}</span> &mdash; Qty:{' '}
                          {item.prescribedQuantityBaseUnits} ({item.dosage} for {item.durationDays} days)
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="text-xs text-slate-500">
            {selectedCustomer && (
              <span>
                Active Patient: <strong className="text-slate-800">{selectedCustomer.fullName}</strong>
              </span>
            )}
            {selectedPrescription && (
              <span className="ml-3">
                Active Rx: <strong className="text-slate-800 font-mono">{selectedPrescription.rxNumber || selectedPrescription.id.slice(0, 8)}</strong>
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {(selectedCustomer || selectedPrescription) && (
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  onSelectPrescription(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Clear Attached Patient
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition"
            >
              Done (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
