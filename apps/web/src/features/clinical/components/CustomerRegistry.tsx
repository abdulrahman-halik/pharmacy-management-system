import React, { useState } from 'react';
import { Button, Input, Badge, Card, Drawer } from '../../../components/core';
import type { Customer, CreateCustomerInput } from '@pharmacy/shared';
import { formatLKR, isValidLKPhone, isValidLKNIC, normalizeLKPhone } from '@pharmacy/shared';
import {
  Search,
  UserPlus,
  User,
  Phone,
  CreditCard,
  Award,
  AlertTriangle,
  Calendar,
  MapPin,
  FileText,
  ShieldCheck,
} from 'lucide-react';

interface CustomerRegistryProps {
  customers: Customer[];
  onAddCustomer: (input: CreateCustomerInput) => Promise<void>;
  isLoading?: boolean;
}

export function CustomerRegistry({
  customers,
  onAddCustomer,
  isLoading,
}: CustomerRegistryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Customer Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nicOrPassport, setNicOrPassport] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [address, setAddress] = useState('');
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [creditLimit, setCreditLimit] = useState(10000);
  const [medicalNotes, setMedicalNotes] = useState('');

  const filteredCustomers = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.nicOrPassport && c.nicOrPassport.toLowerCase().includes(q))
    );
  });

  const handleAddAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (allergyToRemove: string) => {
    setAllergies(allergies.filter((a) => a !== allergyToRemove));
  };

  const handleSubmitNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Full Name and Phone are required');
      return;
    }
    if (!isValidLKPhone(phone)) {
      alert('Please enter a valid Sri Lankan mobile phone number (+947... or 07...)');
      return;
    }
    if (nicOrPassport && !isValidLKNIC(nicOrPassport)) {
      alert('Please enter a valid Sri Lankan NIC (9 digits + V/X or 12 digits)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        fullName: fullName.trim(),
        phone: normalizeLKPhone(phone),
        email: email.trim() || null,
        nicOrPassport: nicOrPassport.trim() || null,
        dob: dob || null,
        gender,
        address: address.trim() || null,
        allergies,
        creditLimit: Number(creditLimit) || 0,
        medicalNotes: medicalNotes.trim() || null,
      });

      // Reset form
      setFullName('');
      setPhone('');
      setEmail('');
      setNicOrPassport('');
      setDob('');
      setAddress('');
      setAllergies([]);
      setCreditLimit(10000);
      setMedicalNotes('');
      setIsAddDrawerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Top Header & Search Controls */}
      <div className="bg-white rounded-lg border border-clinical-slate-border p-4 shadow-solid flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Input
            placeholder="Search by Patient Name, Phone (+94...), or Sri Lankan NIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-clinical-slate-muted" />}
          />
        </div>
        <Button
          variant="solid-primary"
          size="sm"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddDrawerOpen(true)}
        >
          Register Patient 360
        </Button>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const hasAllergies = cust.allergies && cust.allergies.length > 0;
          const creditUsedRatio =
            cust.creditLimit > 0 ? (cust.creditBalance / cust.creditLimit) * 100 : 0;

          return (
            <Card
              key={cust.id}
              className="hover:border-clinical-emerald transition cursor-pointer"
              onClick={() => setSelectedCustomer(cust)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-clinical-slate-heading">
                      {cust.fullName}
                    </h4>
                    <p className="text-xs text-clinical-slate-muted flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-clinical-teal" /> {cust.phone}
                    </p>
                  </div>
                  {cust.nicOrPassport ? (
                    <Badge variant="rx" size="sm">
                      NIC: {cust.nicOrPassport}
                    </Badge>
                  ) : (
                    <Badge variant="otc" size="sm">
                      Walk-in
                    </Badge>
                  )}
                </div>

                {/* Allergies Pill Tags */}
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-clinical-slate-muted mb-1 flex items-center gap-1">
                    {hasAllergies ? (
                      <AlertTriangle className="w-3 h-3 text-clinical-crimson" />
                    ) : (
                      <ShieldCheck className="w-3 h-3 text-clinical-emerald" />
                    )}
                    Contraindication Allergy Tags
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {hasAllergies ? (
                      cust.allergies!.map((allergy, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-clinical-crimson-text border border-red-200"
                        >
                          {allergy}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">No drug allergies</span>
                    )}
                  </div>
                </div>

                {/* Credit Limit & Balance Status */}
                <div className="pt-2 border-t border-slate-100 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-clinical-emerald" /> Credit Used:
                    </span>
                    <span className="font-bold font-mono text-clinical-slate-heading">
                      {formatLKR(cust.creditBalance)} / {formatLKR(cust.creditLimit)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        creditUsedRatio > 80 ? 'bg-clinical-crimson' : 'bg-clinical-emerald'
                      }`}
                      style={{ width: `${Math.min(100, creditUsedRatio)}%` }}
                    />
                  </div>
                </div>

                {/* Loyalty Points */}
                <div className="flex items-center justify-between text-xs pt-1 text-clinical-slate-muted">
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-clinical-amber" /> Loyalty Points:
                  </span>
                  <span className="font-bold text-clinical-slate-heading font-mono">
                    {cust.loyaltyPoints} pts
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Customer 360 Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.fullName || 'Customer Profile 360'}
        description="Comprehensive clinical demographics, verified Sri Lankan identity, and credit ledger."
        footer={
          <Button variant="solid-neutral" size="sm" onClick={() => setSelectedCustomer(null)}>
            Close (Esc)
          </Button>
        }
      >
        {selectedCustomer && (
          <div className="space-y-5 text-left text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-clinical-slate-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-clinical-slate-heading text-sm">
                  {selectedCustomer.fullName}
                </span>
                <Badge variant="rx" size="sm">
                  {selectedCustomer.nicOrPassport || 'No NIC'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-clinical-slate-muted">
                <div>
                  <span className="font-bold text-slate-700">Phone: </span>
                  {selectedCustomer.phone}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Email: </span>
                  {selectedCustomer.email || 'None'}
                </div>
                <div>
                  <span className="font-bold text-slate-700">DOB: </span>
                  {selectedCustomer.dob || 'N/A'}
                </div>
                <div>
                  <span className="font-bold text-slate-700">Gender: </span>
                  {selectedCustomer.gender || 'N/A'}
                </div>
              </div>
              <div>
                <span className="font-bold text-slate-700">Address: </span>
                <span>{selectedCustomer.address || 'Colombo, Sri Lanka'}</span>
              </div>
            </div>

            {/* Documented Allergies */}
            <div className="space-y-1.5">
              <span className="font-bold uppercase tracking-wider text-clinical-slate-muted">
                Documented Drug Allergies
              </span>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {selectedCustomer.allergies && selectedCustomer.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCustomer.allergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded bg-clinical-crimson text-white font-bold text-xs"
                      >
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-600">No active drug allergies reported.</p>
                )}
              </div>
            </div>

            {/* Financial Credit & Loyalty */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-1">
                <span className="font-bold text-emerald-900 block">Credit Account</span>
                <p className="text-lg font-bold font-mono text-clinical-emerald">
                  {formatLKR(selectedCustomer.creditBalance)}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Limit: {formatLKR(selectedCustomer.creditLimit)}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg space-y-1">
                <span className="font-bold text-amber-900 block">Loyalty Balance</span>
                <p className="text-lg font-bold font-mono text-clinical-amber">
                  {selectedCustomer.loyaltyPoints} pts
                </p>
                <p className="text-[11px] text-amber-700">Available for POS redemption</p>
              </div>
            </div>

            {/* Medical Notes */}
            <div className="space-y-1">
              <span className="font-bold uppercase tracking-wider text-clinical-slate-muted">
                Clinical Notes
              </span>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-700">
                {selectedCustomer.medicalNotes || 'No special clinical notes recorded.'}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Register New Patient Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Register New Patient (Customer 360)"
        description="Record patient demographics, Sri Lankan NIC/Passport, and documented allergies."
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="solid-neutral"
              size="sm"
              onClick={() => setIsAddDrawerOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="solid-primary"
              size="sm"
              onClick={handleSubmitNewCustomer}
              isLoading={isSubmitting}
            >
              Save Patient Profile
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitNewCustomer} className="space-y-4 text-left">
          <Input
            label="Full Name *"
            placeholder="e.g. K. D. Samarakoon"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sri Lankan Phone *"
              placeholder="07XXXXXXXX or +947..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Dialog, Mobitel, Airtel, Hutch"
              required
            />
            <Input
              label="Sri Lankan NIC / Passport"
              placeholder="e.g. 912345678V"
              value={nicOrPassport}
              onChange={(e) => setNicOrPassport(e.target.value)}
              helperText="9 digits + V/X or 12 digits"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date of Birth"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
            <div>
              <label className="block text-xs font-bold text-clinical-slate-heading uppercase mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded border border-clinical-slate-border bg-white text-clinical-slate-heading"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <Input
            label="Address"
            placeholder="Street address, city"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          {/* Allergy Tag Multi-Entry */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-clinical-slate-heading uppercase">
              Documented Drug Allergies (Generic Names)
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Penicillin, Amoxicillin, Sulfa"
                value={allergyInput}
                onChange={(e) => setAllergyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddAllergy();
                  }
                }}
              />
              <Button type="button" variant="solid-accent" size="sm" onClick={handleAddAllergy}>
                Add
              </Button>
            </div>
            {allergies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {allergies.map((allergy) => (
                  <span
                    key={allergy}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-clinical-crimson-text border border-red-200"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => handleRemoveAllergy(allergy)}
                      className="hover:text-red-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Credit Limit (LKR)"
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            helperText="Maximum allowed outstanding credit limit in Rupees"
          />

          <div>
            <label className="block text-xs font-bold text-clinical-slate-heading uppercase mb-1">
              Clinical Medical Notes
            </label>
            <textarea
              rows={3}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Chronic conditions, surgical history, contraindication alerts..."
              className="w-full text-xs p-2 rounded border border-clinical-slate-border text-clinical-slate-heading"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
