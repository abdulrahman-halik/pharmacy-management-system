import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppNavBar } from './AppNavBar';
import { AppFooter } from './AppFooter';
import { useSystemHealth } from '../features/system/hooks/useSystemHealth';

export const AppShell: React.FC = () => {
  const { healthData, isCheckingHealth, fetchHealth } = useSystemHealth();
  const location = useLocation();
  const isPos = location.pathname.startsWith('/pos');

  return (
    <div className="min-h-screen bg-clinical-slate-canvas text-clinical-slate-text flex flex-col font-sans">
      <AppHeader
        healthData={healthData}
        isCheckingHealth={isCheckingHealth}
        onRefreshHealth={fetchHealth}
      />
      <AppNavBar />

      {isPos ? (
        <main className="flex-1 w-full">
          <Outlet />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <Outlet />
        </main>
      )}

      <AppFooter />
    </div>
  );
};
