import React from 'react';
import { Pill, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../components/core';
import { SystemHealthBadge } from '../features/system/components/SystemHealthBadge';
import { HealthData } from '../features/system/hooks/useSystemHealth';

interface AppHeaderProps {
  healthData: HealthData;
  isCheckingHealth: boolean;
  onRefreshHealth: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  healthData,
  isCheckingHealth,
  onRefreshHealth,
}) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-clinical-slate-border shadow-solid-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-clinical-emerald p-2 rounded-md shadow-solid-sm">
            <Pill className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-clinical-slate-heading tracking-tight">
                Universal Pharmacy Enterprise
              </span>
              <Badge variant="rx" size="sm">
                Clinical POS
              </Badge>
            </div>
            <p className="text-xs text-clinical-slate-muted">
              Store #01 • Colombo Central Dispensary • Timezone: Asia/Colombo (+05:30)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/clinical')}
            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-md transition shadow-solid-sm cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-clinical-amber" />
            <span className="text-xs font-bold text-amber-900">2 Pending Rx</span>
            <span className="w-2 h-2 rounded-full bg-clinical-amber animate-pulse" />
          </button>

          <SystemHealthBadge
            healthData={healthData}
            isCheckingHealth={isCheckingHealth}
            onRefresh={onRefreshHealth}
          />
        </div>
      </div>
    </header>
  );
};
