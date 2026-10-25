import React from 'react';
import { Button, Badge } from '../../../components/core';
import { FileText, Layers } from 'lucide-react';

interface DesignSystemBannerProps {
  onOpenModal: () => void;
  onOpenDrawer: () => void;
}

export const DesignSystemBanner: React.FC<DesignSystemBannerProps> = ({
  onOpenModal,
  onOpenDrawer,
}) => {
  return (
    <div className="bg-white rounded-lg border border-clinical-slate-border p-6 shadow-solid flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-clinical-slate-heading tracking-tight font-sans">
            Phase 1: Foundation & Clinical Design System
          </h1>
          <Badge variant="otc" size="md">
            Solid Zero-Transparency
          </Badge>
        </div>
        <p className="text-sm text-clinical-slate-muted max-w-3xl">
          Engineered specifically for high-throughput pharmacy counters and bright dispensary environments.
          Strictly zero glassmorphism, zero blurred backdrops, 100% solid color fills, and 150ms tactile micro-animations.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="solid-primary"
          size="sm"
          leftIcon={<FileText className="w-4 h-4" />}
          onClick={onOpenModal}
        >
          Rx Review Modal
        </Button>
        <Button
          variant="solid-accent"
          size="sm"
          leftIcon={<Layers className="w-4 h-4" />}
          onClick={onOpenDrawer}
        >
          Batch Drawer
        </Button>
      </div>
    </div>
  );
};
