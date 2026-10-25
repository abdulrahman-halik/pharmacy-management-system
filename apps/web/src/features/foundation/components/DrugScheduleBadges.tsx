import React from 'react';
import { Card, Badge } from '../../../components/core';

export const DrugScheduleBadges: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-clinical-slate-heading flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-clinical-crimson rounded-full" />
          Drug Schedule & Clinical Status Badges (Zero Transparency)
        </h2>
        <span className="text-xs text-clinical-slate-muted font-medium">
          High visual contrast for fast dispensing accuracy
        </span>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* OTC */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Category: Over-The-Counter</span>
              <Badge variant="otc" size="sm">
                OTC
              </Badge>
            </div>
            <p className="text-sm font-bold text-clinical-slate-heading">Paracetamol 500mg</p>
            <p className="text-xs text-clinical-slate-muted">No prescription required for dispensing.</p>
          </div>

          {/* Rx Only */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-2 bg-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">Category: Prescription Only</span>
              <Badge variant="rx" size="sm">
                Rx Only
              </Badge>
            </div>
            <p className="text-sm font-bold text-clinical-slate-heading">Amoxicillin / Clavulanate</p>
            <p className="text-xs text-clinical-slate-muted">Requires verified SLMC Doctor prescription.</p>
          </div>

          {/* Controlled Drug Schedule II */}
          <div className="border border-red-300 rounded-lg p-4 space-y-2 bg-red-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-800">Controlled Substance</span>
              <Badge variant="controlled-ii" size="sm">
                Schedule II Lock
              </Badge>
            </div>
            <p className="text-sm font-bold text-clinical-crimson-text">Morphine Sulfate 10mg</p>
            <p className="text-xs text-red-700">Strict registry log & biometric supervisor override.</p>
          </div>

          {/* Expiry Risk */}
          <div className="border border-amber-300 rounded-lg p-4 space-y-2 bg-amber-50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Inventory Alert</span>
              <Badge variant="near-expiry" size="sm">
                Expires in 28 Days
              </Badge>
            </div>
            <p className="text-sm font-bold text-amber-900">Salbutamol Inhaler 100mcg</p>
            <p className="text-xs text-amber-700">Batch B-2024-098 • Prioritize in FEFO queue.</p>
          </div>
        </div>
      </Card>
    </section>
  );
};
