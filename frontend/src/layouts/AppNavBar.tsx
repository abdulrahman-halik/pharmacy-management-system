import React from 'react';
import { NavLink } from 'react-router-dom';
import { Badge } from '../components/core';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/payroll', label: 'Phase 9: HR & Payroll' },
  { to: '/finance', label: 'Phase 8: Finance & Day-Close' },
  { to: '/pos', label: 'Phase 6: POS Terminal & Smart Checkout' },
  { to: '/clinical', label: 'Phase 5: Clinical Prescriptions & Patient 360' },
  { to: '/inventory', label: 'Phase 4: Clinical Inventory & FEFO Ledger' },
  { to: '/foundation', label: 'Phase 1: Foundation Showcase' },
];

export const AppNavBar: React.FC = () => {
  return (
    <div className="bg-white border-b border-clinical-slate-border py-2.5 px-4 shadow-solid-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <nav className="flex items-center gap-2 flex-wrap" aria-label="Modules">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3.5 py-1.5 rounded-md text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-clinical-emerald text-white shadow-solid-sm border border-clinical-emerald-dark'
                    : 'text-clinical-slate-heading hover:bg-slate-100 border border-transparent'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Badge variant="rx" size="sm">
            Clinical Gatekeeper Active
          </Badge>
        </div>
      </div>
    </div>
  );
};
