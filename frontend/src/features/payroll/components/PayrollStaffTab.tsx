import React from 'react';
import { Card, Badge, Button } from '../../../components/core';
import { Users, Edit } from 'lucide-react';
import { formatLKR, StaffCompensationDto } from '@pharmacy/shared';

interface PayrollStaffTabProps {
  staffList: StaffCompensationDto[];
  onOpenCompensationModal: (staff: StaffCompensationDto) => void;
}

export const PayrollStaffTab: React.FC<PayrollStaffTabProps> = ({
  staffList,
  onOpenCompensationModal,
}) => {
  return (
    <Card>
      <div className="flex items-center justify-between pb-4 border-b border-clinical-slate-border">
        <div>
          <h3 className="font-bold text-sm text-clinical-slate-heading">Employee Compensation & Bank Registry</h3>
          <p className="text-xs text-clinical-slate-muted">Base salary contracts, EPF/ETF registration numbers, and banking details</p>
        </div>
        <Badge variant="rx" size="sm">{staffList.length} Employees</Badge>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-clinical-slate-muted font-semibold uppercase border-y border-clinical-slate-border">
            <tr>
              <th className="py-3 px-4">Employee Name</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4 text-right">Base Salary (LKR)</th>
              <th className="py-3 px-4">EPF / ETF Number</th>
              <th className="py-3 px-4">Banking Account</th>
              <th className="py-3 px-4 text-right">Active Advances</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffList.map((s) => (
              <tr key={s.userId} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-clinical-emerald-light/40 flex items-center justify-center text-clinical-emerald-dark font-bold">
                      {s.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-clinical-slate-heading">{s.fullName}</p>
                      <p className="text-[11px] text-clinical-slate-muted">{s.email || s.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-clinical-slate-heading">{s.role}</span>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-clinical-slate-heading">
                  {formatLKR(s.monthlySalaryLkr)}
                </td>
                <td className="py-3 px-4 font-mono text-clinical-teal-text">
                  {s.epfNumber || <span className="text-slate-400">Not Assigned</span>}
                </td>
                <td className="py-3 px-4 text-clinical-slate-body">
                  {s.bankName ? (
                    <div>
                      <p className="font-medium">{s.bankName}</p>
                      <p className="text-[11px] text-clinical-slate-muted font-mono">{s.bankAccountNumber}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">Cash in Hand</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-amber-800">
                  {formatLKR(s.activeAdvanceTotalLkr)}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={s.isActive ? 'in-stock' : 'expired'} size="sm">
                    {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Button
                    size="sm"
                    variant="solid-neutral"
                    onClick={() => onOpenCompensationModal(s)}
                    className="text-xs py-1 px-2.5 flex items-center gap-1 mx-auto"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
