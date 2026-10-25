import React from 'react';
import { Card, Badge } from '../../../components/core';
import { Server, Database, Layers, HardDrive } from 'lucide-react';
import { HealthData } from '../../system/hooks/useSystemHealth';

interface InfrastructureHealthSectionProps {
  healthData: HealthData;
}

export const InfrastructureHealthSection: React.FC<InfrastructureHealthSectionProps> = ({
  healthData,
}) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-clinical-slate-heading flex items-center gap-2">
          <Server className="w-5 h-5 text-clinical-emerald" />
          Infrastructure & Backend Verification (Local Cluster)
        </h2>
        <span className="text-xs text-clinical-slate-muted font-medium">
          MySQL 8 • Redis 7 • MinIO Object Store
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* MySQL */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 rounded-lg border border-clinical-emerald">
                <Database className="w-5 h-5 text-clinical-emerald" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-clinical-slate-heading">MySQL 8.0</h4>
                <p className="text-xs text-clinical-slate-muted">Port 3307 • Asia/Colombo (+05:30)</p>
              </div>
            </div>
            <Badge variant={healthData.services.mysql === 'UP' ? 'in-stock' : 'expired'} size="sm">
              {healthData.services.mysql}
            </Badge>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-600 space-y-1">
            <div>Collation: <span className="font-bold">utf8mb4_unicode_ci</span></div>
            <div>Database: <span className="font-bold">pharmacy_db</span></div>
          </div>
        </Card>

        {/* Redis */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-100 rounded-lg border border-clinical-teal">
                <Layers className="w-5 h-5 text-clinical-teal" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-clinical-slate-heading">Redis 7</h4>
                <p className="text-xs text-clinical-slate-muted">Port 6379 • Session & Cache</p>
              </div>
            </div>
            <Badge variant={healthData.services.redis === 'UP' ? 'in-stock' : 'expired'} size="sm">
              {healthData.services.redis}
            </Badge>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-600 space-y-1">
            <div>Mode: <span className="font-bold">Append-Only File (AOF)</span></div>
            <div>Auth: <span className="font-bold">Password Protected</span></div>
          </div>
        </Card>

        {/* MinIO */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 rounded-lg border border-clinical-amber">
                <HardDrive className="w-5 h-5 text-clinical-amber" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-clinical-slate-heading">MinIO Storage</h4>
                <p className="text-xs text-clinical-slate-muted">Port 9000 • S3 Prescription Vault</p>
              </div>
            </div>
            <Badge variant={healthData.services.minio === 'UP' ? 'in-stock' : 'expired'} size="sm">
              {healthData.services.minio}
            </Badge>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-600 space-y-1">
            <div>Console: <span className="font-bold">:9001</span></div>
            <div>Health: <span className="font-bold">/minio/health/live (200 OK)</span></div>
          </div>
        </Card>
      </div>
    </section>
  );
};
