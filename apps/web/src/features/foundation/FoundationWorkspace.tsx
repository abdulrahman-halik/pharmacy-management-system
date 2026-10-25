import React, { useState } from 'react';
import { DesignSystemBanner } from './components/DesignSystemBanner';
import { SolidPaletteMatrix } from './components/SolidPaletteMatrix';
import { ButtonPrimitivesSection } from './components/ButtonPrimitivesSection';
import { SriLankanIdentityEngine } from './components/SriLankanIdentityEngine';
import { DrugScheduleBadges } from './components/DrugScheduleBadges';
import { InfrastructureHealthSection } from './components/InfrastructureHealthSection';
import { PrescriptionReviewModal } from './components/PrescriptionReviewModal';
import { BatchDrawer } from './components/BatchDrawer';
import { useSystemHealth } from '../system/hooks/useSystemHealth';

export const FoundationWorkspace: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { healthData } = useSystemHealth();

  return (
    <div className="space-y-8">
      <DesignSystemBanner
        onOpenModal={() => setIsModalOpen(true)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      <SolidPaletteMatrix />

      <ButtonPrimitivesSection />

      <SriLankanIdentityEngine />

      <DrugScheduleBadges />

      <InfrastructureHealthSection healthData={healthData} />

      <PrescriptionReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <BatchDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
