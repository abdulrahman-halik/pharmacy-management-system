import React, { useState } from 'react';
import { Card, Input } from '../../../components/core';
import { HardDrive, Smartphone, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  formatLKR,
  roundToNearestRupee,
  isValidLKPhone,
  isValidLKNIC,
  isValidLKSLMC,
} from '@pharmacy/shared';

export const SriLankanIdentityEngine: React.FC = () => {
  // Live Currency Calculator
  const [calcInput, setCalcInput] = useState<number>(1450.5);

  // Sri Lankan Identity Form
  const [phoneInput, setPhoneInput] = useState('0771234567');
  const [nicInput, setNicInput] = useState('912345678V');
  const [slmcInput, setSlmcInput] = useState('SLMC-48291');

  const phoneValid = isValidLKPhone(phoneInput);
  const nicValid = isValidLKNIC(nicInput);
  const slmcValid = isValidLKSLMC(slmcInput);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LKR Currency Engine */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-clinical-emerald" />
            <h3 className="font-bold text-sm text-clinical-slate-heading">
              Sri Lankan Rupee (LKR) Engine
            </h3>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-clinical-slate-muted">
            Standardized Sri Lankan currency formatting conforming to Central Bank guidelines:
            Rs. prefix, thousands separators, and 2 decimal points.
          </p>

          <div>
            <Input
              label="Enter Raw Numeric Amount"
              type="number"
              step="0.25"
              value={calcInput}
              onChange={(e) => setCalcInput(parseFloat(e.target.value) || 0)}
              helperText="Live test input for @pharmacy/shared formatLKR() and roundToNearestRupee()"
            />
          </div>

          <div className="bg-slate-50 border border-clinical-slate-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-clinical-slate-muted font-bold uppercase">
                Formatted Currency:
              </span>
              <span className="text-2xl font-bold font-mono text-clinical-emerald">
                {formatLKR(calcInput)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-xs text-clinical-slate-muted font-bold uppercase">
                Nearest Rupee Rounding:
              </span>
              <span className="text-lg font-bold font-mono text-clinical-slate-heading">
                {formatLKR(roundToNearestRupee(calcInput))}
              </span>
            </div>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs font-bold text-clinical-slate-muted">Presets:</span>
            <button
              type="button"
              onClick={() => setCalcInput(120)}
              className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 cursor-pointer"
            >
              Paracetamol 500mg (120)
            </button>
            <button
              type="button"
              onClick={() => setCalcInput(1450.75)}
              className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 cursor-pointer"
            >
              Amoxicillin 500mg (1450.75)
            </button>
            <button
              type="button"
              onClick={() => setCalcInput(8950.0)}
              className="px-2.5 py-1 text-xs bg-slate-100 border border-slate-300 rounded hover:bg-slate-200 cursor-pointer"
            >
              Insulin Glargine (8950)
            </button>
          </div>
        </div>
      </Card>

      {/* Sri Lankan Identity & Phone Validators */}
      <Card
        header={
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-clinical-teal" />
            <h3 className="font-bold text-sm text-clinical-slate-heading">
              Sri Lankan Identity & Phone Validation
            </h3>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-clinical-slate-muted">
            Universal Zod schemas for Sri Lankan mobile operators (Dialog, Mobitel, Airtel, Hutch),
            both 9-digit old and 12-digit new NICs, and SLMC Doctor Registration numbers.
          </p>

          <div>
            <Input
              label="Sri Lankan Mobile Phone"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              error={!phoneValid ? 'Must be valid SL mobile (+947XXXXXXXX or 07XXXXXXXX)' : undefined}
              rightIcon={
                phoneValid ? (
                  <CheckCircle2 className="w-4 h-4 text-clinical-emerald" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-clinical-crimson" />
                )
              }
            />
          </div>

          <div>
            <Input
              label="Sri Lankan National Identity Card (NIC)"
              value={nicInput}
              onChange={(e) => setNicInput(e.target.value)}
              error={!nicValid ? 'Must be 9 digits with V/X or 12 digits' : undefined}
              rightIcon={
                nicValid ? (
                  <CheckCircle2 className="w-4 h-4 text-clinical-emerald" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-clinical-crimson" />
                )
              }
            />
          </div>

          <div>
            <Input
              label="SLMC Doctor Registration No"
              value={slmcInput}
              onChange={(e) => setSlmcInput(e.target.value)}
              error={!slmcValid ? 'Must be valid alphanumeric SLMC format' : undefined}
              rightIcon={
                slmcValid ? (
                  <CheckCircle2 className="w-4 h-4 text-clinical-emerald" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-clinical-crimson" />
                )
              }
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
