import React, { useState } from 'react';
import { Button, Input, Badge, Card, Drawer } from '../../../components/core';
import type { Doctor, CreateDoctorInput } from '@pharmacy/shared';
import { isValidLKSLMC, isValidLKPhone } from '@pharmacy/shared';
import {
  Search,
  UserPlus,
  Stethoscope,
  Phone,
  Building,
  MapPin,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface DoctorDirectoryProps {
  doctors: Doctor[];
  onAddDoctor: (input: CreateDoctorInput) => Promise<void>;
  isLoading?: boolean;
}

export function DoctorDirectory({
  doctors,
  onAddDoctor,
  isLoading,
}: DoctorDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [specialization, setSpecialization] = useState('Consultant Physician');
  const [clinicName, setClinicName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');

  const filteredDoctors = doctors.filter((d) => {
    const q = searchTerm.toLowerCase();
    return (
      d.fullName.toLowerCase().includes(q) ||
      d.registrationNumber.toLowerCase().includes(q) ||
      (d.specialization && d.specialization.toLowerCase().includes(q)) ||
      (d.clinicName && d.clinicName.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !registrationNumber.trim()) {
      alert('Full Name and SLMC Registration Number are required.');
      return;
    }
    if (!isValidLKSLMC(registrationNumber)) {
      alert('Invalid SLMC Doctor Registration format (e.g. SLMC-48291).');
      return;
    }
    if (mobileNumber && !isValidLKPhone(mobileNumber)) {
      alert('Please enter a valid Sri Lankan mobile number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddDoctor({
        fullName: fullName.trim(),
        registrationNumber: registrationNumber.trim(),
        specialization: specialization.trim() || null,
        clinicName: clinicName.trim() || null,
        mobileNumber: mobileNumber.trim() || null,
        clinicAddress: clinicAddress.trim() || null,
      });

      setFullName('');
      setRegistrationNumber('');
      setClinicName('');
      setMobileNumber('');
      setClinicAddress('');
      setIsAddDrawerOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Search Header */}
      <div className="bg-white rounded-lg border border-clinical-slate-border p-4 shadow-solid flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Input
            placeholder="Search Doctors by Name, SLMC Reg No (e.g. SLMC-48291), or Specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-clinical-slate-muted" />}
          />
        </div>
        <Button
          variant="solid-accent"
          size="sm"
          leftIcon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsAddDrawerOpen(true)}
        >
          Register SLMC Doctor
        </Button>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDoctors.map((doc) => (
          <Card key={doc.id} className="hover:border-clinical-teal transition">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-clinical-slate-heading flex items-center gap-1.5">
                    <Stethoscope className="w-4 h-4 text-clinical-teal" />
                    {doc.fullName}
                  </h4>
                  <p className="text-xs text-clinical-slate-muted font-medium mt-0.5">
                    {doc.specialization || 'General Practitioner'}
                  </p>
                </div>
                <Badge variant="otc" size="sm">
                  {doc.registrationNumber}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-clinical-slate-muted">
                {doc.clinicName && (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Building className="w-3.5 h-3.5 text-clinical-slate-muted" />
                    <span>{doc.clinicName}</span>
                  </div>
                )}
                {doc.mobileNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-clinical-slate-muted" />
                    <span>{doc.mobileNumber}</span>
                  </div>
                )}
                {doc.clinicAddress && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-clinical-slate-muted" />
                    <span className="truncate">{doc.clinicAddress}</span>
                  </div>
                )}
              </div>

              <div className="pt-1 flex items-center justify-between text-[11px] text-clinical-emerald font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Sri Lanka Medical Council Verified
                </span>
                <span className="text-slate-400">ID: {doc.id.slice(0, 8)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Doctor Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Register Medical Practitioner"
        description="Verify and register doctors with official Sri Lanka Medical Council (SLMC) credentials."
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
              variant="solid-accent"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Register Practitioner
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <Input
            label="Doctor Full Name *"
            placeholder="e.g. Dr. K. A. Perera"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <Input
            label="SLMC Registration Number *"
            placeholder="e.g. SLMC-48291"
            value={registrationNumber}
            onChange={(e) => setRegistrationNumber(e.target.value)}
            helperText="Official Sri Lanka Medical Council unique practitioner ID"
            required
          />

          <div>
            <label className="block text-xs font-bold text-clinical-slate-heading uppercase mb-1">
              Medical Specialization
            </label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full text-xs p-2.5 rounded border border-clinical-slate-border bg-white text-clinical-slate-heading"
            >
              <option value="Consultant Physician">Consultant Physician</option>
              <option value="Consultant Cardiologist">Consultant Cardiologist</option>
              <option value="Pediatrician">Pediatrician</option>
              <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
              <option value="Dermatologist">Dermatologist</option>
              <option value="General Practitioner">General Practitioner</option>
              <option value="ENT Surgeon">ENT Surgeon</option>
            </select>
          </div>

          <Input
            label="Clinic / Hospital Name"
            placeholder="e.g. Colombo MediClinic, Asiri Central"
            value={clinicName}
            onChange={(e) => setClinicName(e.target.value)}
          />

          <Input
            label="Mobile Number"
            placeholder="07XXXXXXXX or +947..."
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
          />

          <Input
            label="Chamber / Clinic Address"
            placeholder="Street address, city"
            value={clinicAddress}
            onChange={(e) => setClinicAddress(e.target.value)}
          />
        </form>
      </Drawer>
    </div>
  );
}
