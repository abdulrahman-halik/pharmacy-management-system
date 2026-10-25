import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell';

// Lazy-loaded feature modules for zero-bundle-leak code splitting
const PayrollWorkspace = lazy(() =>
  import('../features/payroll/PayrollWorkspace').then((m) => ({ default: m.PayrollWorkspace }))
);
const FinanceWorkspace = lazy(() =>
  import('../features/finance/FinanceWorkspace').then((m) => ({ default: m.FinanceWorkspace }))
);
const PosTerminalWorkspace = lazy(() =>
  import('../features/pos/PosTerminalWorkspace').then((m) => ({ default: m.PosTerminalWorkspace }))
);
const ClinicalWorkspace = lazy(() =>
  import('../features/clinical/ClinicalWorkspace').then((m) => ({ default: m.ClinicalWorkspace }))
);
const InventoryWorkspace = lazy(() =>
  import('../features/inventory/InventoryWorkspace').then((m) => ({ default: m.InventoryWorkspace }))
);
const FoundationWorkspace = lazy(() =>
  import('../features/foundation/FoundationWorkspace').then((m) => ({ default: m.FoundationWorkspace }))
);

const ModuleFallback: React.FC = () => (
  <div className="flex items-center justify-center p-12">
    <div className="flex items-center gap-3 bg-white border border-clinical-slate-border px-5 py-3 rounded-lg shadow-solid-sm">
      <div className="w-5 h-5 border-2 border-clinical-emerald border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-bold text-clinical-slate-heading">
        Loading Dispensary Module...
      </span>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/payroll" replace />} />
        <Route
          path="/payroll"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <PayrollWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/finance"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <FinanceWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/pos"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <PosTerminalWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/clinical"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <ClinicalWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/inventory"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <InventoryWorkspace />
            </Suspense>
          }
        />
        <Route
          path="/foundation"
          element={
            <Suspense fallback={<ModuleFallback />}>
              <FoundationWorkspace />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/payroll" replace />} />
      </Route>
    </Routes>
  );
};
