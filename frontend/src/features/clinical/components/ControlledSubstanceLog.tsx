import React, { useState } from 'react';
import { Button, Input, Badge, Card } from '../../../components/core';
import type { ControlledSubstanceRegister } from '@pharmacy/shared';
import {
  ShieldAlert,
  Search,
  Download,
  AlertOctagon,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';

interface ControlledSubstanceLogProps {
  entries: ControlledSubstanceRegister[];
  isLoading?: boolean;
}

export function ControlledSubstanceLog({ entries, isLoading }: ControlledSubstanceLogProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = entries.filter((e) => {
    const q = searchTerm.toLowerCase();
    return (
      (e.medicineName && e.medicineName.toLowerCase().includes(q)) ||
      e.customerNic.toLowerCase().includes(q) ||
      e.doctorSlmcRegNo.toLowerCase().includes(q) ||
      (e.batchNumber && e.batchNumber.toLowerCase().includes(q))
    );
  });

  const exportCsv = () => {
    const headers = [
      'Record ID',
      'Timestamp',
      'Medicine',
      'Batch Number',
      'Dispensed Units',
      'Running Balance',
      'Patient NIC',
      'Prescribing Doctor SLMC',
      'Dispensing Pharmacist',
      'Prescription ID',
    ];

    const rows = filteredEntries.map((e) => [
      e.id,
      e.createdAt,
      `"${e.medicineName || e.medicineId}"`,
      e.batchNumber || e.batchId,
      e.quantityBaseUnits,
      e.runningBalance,
      e.customerNic,
      e.doctorSlmcRegNo,
      e.pharmacistName || e.pharmacistUserId,
      e.prescriptionId,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NMRA_Controlled_Drugs_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Compliance Banner */}
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-solid-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-clinical-crimson text-white rounded-md mt-0.5 shadow-solid-sm">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-clinical-crimson-text">
                NMRA Controlled Substances & Dangerous Drugs Register (Schedule II)
              </h3>
              <Badge variant="controlled-ii" size="sm">
                Immutable Legal Ledger
              </Badge>
            </div>
            <p className="text-xs text-red-800 max-w-3xl">
              Sri Lankan Legal Mandate: Every narcotics or Schedule II dispensing transaction is permanently logged
              with verified patient NIC, prescribing practitioner's SLMC number, batch ID, and biometric pharmacist signature.
            </p>
          </div>
        </div>

        <Button
          variant="solid-danger"
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={exportCsv}
        >
          Export Regulatory CSV
        </Button>
      </div>

      {/* Filter and Table Card */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full sm:w-80">
              <Input
                placeholder="Search by Patient NIC, Doctor SLMC, Drug, or Batch..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-clinical-slate-muted" />}
              />
            </div>
            <span className="text-xs font-bold text-clinical-slate-muted font-mono">
              Total Logged Records: {filteredEntries.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-clinical-slate-border rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-clinical-slate-heading uppercase font-bold border-b border-clinical-slate-border">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Controlled Drug</th>
                  <th className="px-4 py-3">Batch Number</th>
                  <th className="px-4 py-3 text-right">Dispensed Qty</th>
                  <th className="px-4 py-3 text-right">Running Stock</th>
                  <th className="px-4 py-3">Patient NIC</th>
                  <th className="px-4 py-3">Doctor SLMC</th>
                  <th className="px-4 py-3">Dispensing Pharmacist</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-clinical-slate-muted font-mono whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' })}
                    </td>
                    <td className="px-4 py-3 font-bold text-clinical-slate-heading">
                      {row.medicineName || row.medicineId}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {row.batchNumber || row.batchId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-clinical-crimson">
                      -{row.quantityBaseUnits}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-clinical-emerald">
                      {row.runningBalance}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="rx" size="sm">
                        {row.customerNic}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="otc" size="sm">
                        {row.doctorSlmcRegNo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {row.pharmacistName || row.pharmacistUserId}
                    </td>
                  </tr>
                ))}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No controlled substance register entries match your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}
