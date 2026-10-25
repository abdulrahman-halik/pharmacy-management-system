import React, { useState, useEffect } from 'react';
import { StockHealthOverview } from './components/StockHealthOverview';
import { BatchExplorer } from './components/BatchExplorer';
import { FefoSimulator } from './components/FefoSimulator';
import { StockAdjustmentForm } from './components/StockAdjustmentForm';
import { PhysicalAuditWizard } from './components/PhysicalAuditWizard';
import { BatchRecallModal } from './components/BatchRecallModal';
import { inventoryApi } from './services/inventoryApi';
import type {
  InventoryBatchDto,
  StockHealthSummary,
  LowStockAlertItem,
} from '@pharmacy/shared';
import {
  Layers,
  Table,
  Zap,
  Scale,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';

export type InventoryTab =
  | 'overview'
  | 'batches'
  | 'fefo'
  | 'adjustments'
  | 'audits';

export const InventoryWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('overview');
  const [batches, setBatches] = useState<InventoryBatchDto[]>([]);
  const [stockHealth, setStockHealth] = useState<StockHealthSummary | null>(null);
  const [lowStockItems, setLowStockItems] = useState<LowStockAlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Recall Modal State
  const [recallTargetBatch, setRecallTargetBatch] = useState<InventoryBatchDto | null>(null);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState<boolean>(false);

  // Stock Adjustment Prefill
  const [adjustmentTargetBatch, setAdjustmentTargetBatch] = useState<InventoryBatchDto | null>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [healthRes, batchesRes, lowStockRes] = await Promise.all([
        inventoryApi.getStockHealth(),
        inventoryApi.getBatches(),
        inventoryApi.getLowStockAlerts(),
      ]);
      setStockHealth(healthRes);
      setBatches(batchesRes.items);
      setLowStockItems(lowStockRes);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleOpenRecall = (batch: InventoryBatchDto) => {
    setRecallTargetBatch(batch);
    setIsRecallModalOpen(true);
  };

  const handleOpenAdjust = (batch: InventoryBatchDto) => {
    setAdjustmentTargetBatch(batch);
    setActiveTab('adjustments');
  };

  const tabs: Array<{ id: InventoryTab; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Stock Health & Risk', icon: <Layers className="w-4 h-4" /> },
    { id: 'batches', label: 'Batch Explorer', icon: <Table className="w-4 h-4" /> },
    { id: 'fefo', label: 'FEFO Simulator', icon: <Zap className="w-4 h-4" /> },
    { id: 'adjustments', label: 'Stock Adjustment', icon: <Scale className="w-4 h-4" /> },
    { id: 'audits', label: 'Physical Audit', icon: <ClipboardCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="border-b border-[#CBD5E1] bg-white rounded-md p-1 shadow-[0_2px_0_0_#0F172A]">
        <nav className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded text-sm font-bold transition-all duration-150 select-none ${
                  isActive
                    ? 'bg-[#047857] text-white shadow-[0_2px_0_0_#065F46] translate-y-[-1px]'
                    : 'text-[#334155] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <StockHealthOverview
          summary={stockHealth}
          lowStockItems={lowStockItems}
          loading={loading}
          onRefresh={loadAllData}
          onNavigateToTab={(t) => setActiveTab(t as InventoryTab)}
        />
      )}

      {activeTab === 'batches' && (
        <BatchExplorer
          batches={batches}
          loading={loading}
          onRefresh={loadAllData}
          onRecallBatch={handleOpenRecall}
          onAdjustBatch={handleOpenAdjust}
        />
      )}

      {activeTab === 'fefo' && <FefoSimulator batches={batches} />}

      {activeTab === 'adjustments' && (
        <StockAdjustmentForm
          batches={batches}
          initialBatch={adjustmentTargetBatch}
          onSuccess={loadAllData}
        />
      )}

      {activeTab === 'audits' && <PhysicalAuditWizard batches={batches} />}

      {/* Emergency Batch Recall Modal */}
      <BatchRecallModal
        batch={recallTargetBatch}
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        onSuccess={loadAllData}
      />
    </div>
  );
};
