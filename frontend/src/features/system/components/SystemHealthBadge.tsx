import React from 'react';
import { Badge, Button } from '../../../components/core';
import { Activity, RefreshCw } from 'lucide-react';
import { HealthData } from '../hooks/useSystemHealth';

interface SystemHealthBadgeProps {
  healthData: HealthData;
  isCheckingHealth: boolean;
  onRefresh: () => void;
}

export const SystemHealthBadge: React.FC<SystemHealthBadgeProps> = ({
  healthData,
  isCheckingHealth,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden md:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-clinical-slate-border">
        <Activity className="w-4 h-4 text-clinical-emerald" />
        <span className="text-xs font-bold text-clinical-slate-heading">API:</span>
        <Badge
          variant={healthData.status === 'READY' ? 'in-stock' : 'low-stock'}
          size="sm"
        >
          {healthData.status}
        </Badge>
      </div>

      <Button
        variant="solid-neutral"
        size="sm"
        leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />}
        onClick={onRefresh}
      >
        Verify System
      </Button>
    </div>
  );
};
