import React from 'react';
import { Card, Badge, Button } from '../../../components/core';
import { formatLKR } from '@pharmacy/shared';
import type { StockHealthSummary, LowStockAlertItem } from '@pharmacy/shared';
import {
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  TrendingDown,
  Layers,
  ArrowRight,
  PackagePlus,
  RefreshCw,
} from 'lucide-react';

interface StockHealthOverviewProps {
  summary: StockHealthSummary | null;
  lowStockItems: LowStockAlertItem[];
  loading?: boolean;
  onRefresh?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const StockHealthOverview: React.FC<StockHealthOverviewProps> = ({
  summary,
  lowStockItems,
  loading = false,
  onRefresh,
  onNavigateToTab,
}) => {
  const totalValue = summary?.totalStockValueLkr || 0;
  const criticalTier = summary?.riskTiers.find((t) => t.riskTier === 'CRITICAL_2D');
  const urgentTier = summary?.riskTiers.find((t) => t.riskTier === 'EXPIRING_30D');
  const expiringSoonValue =
    (criticalTier?.totalCostValueLkr || 0) + (urgentTier?.totalCostValueLkr || 0);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'CRITICAL_2D':
        return <Badge variant="controlled-ii">Critical &lt; 2 Days</Badge>;
      case 'EXPIRING_30D':
        return <Badge variant="near-expiry">Urgent &lt; 30 Days</Badge>;
      case 'EXPIRING_60D':
        return <Badge variant="low-stock">Warning &lt; 60 Days</Badge>;
      case 'EXPIRING_90D':
        return <Badge variant="low-stock">Watch &lt; 90 Days</Badge>;
      case 'HEALTHY':
        return <Badge variant="in-stock">Healthy &gt; 90 Days</Badge>;
      case 'EXPIRED':
        return <Badge variant="expired">Expired</Badge>;
      default:
        return <Badge variant="neutral">{tier}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5E1] pb-4">
        <div>
          <h2 className="text-2xl font-bold font-sans text-[#0F172A] tracking-tight">
            Inventory Health & Expiry Risk Valuation
          </h2>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time financial risk aggregation and automated FEFO stock status in Sri Lankan Rupees (LKR)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="solid-neutral"
              size="sm"
              leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={onRefresh}
            >
              Refresh Valuations
            </Button>
          )}
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock Value */}
        <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
              Total Stock Valuation
            </span>
            <div className="w-8 h-8 rounded-md bg-[#D1FAE5] border border-[#047857] flex items-center justify-center text-[#065F46]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] font-mono">
              {formatLKR(totalValue)}
            </div>
            <div className="text-xs text-[#047857] font-semibold mt-1 flex items-center gap-1">
              <span>{summary?.totalActiveBatches || 0} Active Batches</span>
              <span>•</span>
              <span>{(summary?.totalStockUnits || 0).toLocaleString()} Base Units</span>
            </div>
          </div>
        </Card>

        {/* Expiring Soon Valuation */}
        <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#78350F] tracking-wider">
              At-Risk Expiry Valuation (&lt;30d)
            </span>
            <div className="w-8 h-8 rounded-md bg-[#FEF3C7] border border-[#D97706] flex items-center justify-center text-[#78350F]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#78350F] font-mono">
              {formatLKR(expiringSoonValue)}
            </div>
            <div className="text-xs text-[#B45309] font-semibold mt-1">
              Immediate FEFO priority clearance required
            </div>
          </div>
        </Card>

        {/* Low Stock Reorder Triggers */}
        <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
              Low Stock Alerts
            </span>
            <div className="w-8 h-8 rounded-md bg-[#FEE2E2] border border-[#DC2626] flex items-center justify-center text-[#7F1D1D]">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#DC2626] font-mono">
              {lowStockItems.length} Drugs
            </div>
            <div className="text-xs text-[#64748B] font-semibold mt-1">
              Active stock at or below configured reorder level
            </div>
          </div>
        </Card>

        {/* Quarantined Batches */}
        <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
              Quarantined Batches
            </span>
            <div className="w-8 h-8 rounded-md bg-[#F1F5F9] border border-[#0F172A] flex items-center justify-center text-[#0F172A]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#0F172A] font-mono">
              {summary?.quarantinedBatchCount || 0} Batches
            </div>
            <div className="text-xs text-[#DC2626] font-semibold mt-1">
              Blocked from POS sale via NMRA quarantine lock
            </div>
          </div>
        </Card>
      </div>

      {/* Expiry Risk Horizon Table */}
      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] overflow-hidden">
        <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h3 className="font-bold text-[#0F172A] text-base flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[#D97706]" />
              Expiry Risk Valuation Horizon (LKR)
            </h3>
            <p className="text-xs text-[#64748B]">
              Valuation of stock in dispensary shelves segmented by expiry urgency
            </p>
          </div>
          {onNavigateToTab && (
            <Button
              variant="solid-neutral"
              size="sm"
              onClick={() => onNavigateToTab('batches')}
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              View in Explorer
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-bold text-[#334155] uppercase border-b border-[#CBD5E1]">
              <tr>
                <th className="py-3 px-4">Risk Tier Window</th>
                <th className="py-3 px-4 text-center">Batch Count</th>
                <th className="py-3 px-4 text-right">Total Base Units</th>
                <th className="py-3 px-4 text-right">Landed Cost Value (LKR)</th>
                <th className="py-3 px-4 text-center">Operational Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {summary?.riskTiers.map((tier) => (
                <tr key={tier.riskTier} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3.5 px-4 font-semibold">{getTierBadge(tier.riskTier)}</td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-[#0F172A]">
                    {tier.batchCount}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#334155]">
                    {tier.totalUnits.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F172A]">
                    {formatLKR(tier.totalCostValueLkr)}
                  </td>
                  <td className="py-3.5 px-4 text-center text-xs">
                    {tier.riskTier === 'CRITICAL_2D' && (
                      <span className="text-[#DC2626] font-bold">Remove from Counter</span>
                    )}
                    {tier.riskTier === 'EXPIRING_30D' && (
                      <span className="text-[#D97706] font-semibold">Priority FEFO Dispense</span>
                    )}
                    {tier.riskTier === 'EXPIRING_60D' && (
                      <span className="text-[#64748B]">Procurement Alert</span>
                    )}
                    {tier.riskTier === 'EXPIRING_90D' && (
                      <span className="text-[#64748B]">Standard Reorder Freeze</span>
                    )}
                    {tier.riskTier === 'HEALTHY' && (
                      <span className="text-[#047857] font-semibold">Normal Dispensing</span>
                    )}
                    {tier.riskTier === 'EXPIRED' && (
                      <span className="text-[#7F1D1D] font-bold">Quarantine & Dispose</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Low Stock Alerts & Fast Purchase Order Linkage */}
      <Card className="bg-white border border-[#CBD5E1] shadow-[0_2px_0_0_#0F172A] overflow-hidden">
        <div className="p-4 border-b border-[#CBD5E1] flex items-center justify-between bg-[#F8FAFC]">
          <div>
            <h3 className="font-bold text-[#0F172A] text-base flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[#DC2626]" />
              Low Stock Reorder Triggers
            </h3>
            <p className="text-xs text-[#64748B]">
              Medicines depleted below designated reorder point with calculated procurement replenishment
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F1F5F9] text-xs font-bold text-[#334155] uppercase border-b border-[#CBD5E1]">
              <tr>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Form</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Reorder Point</th>
                <th className="py-3 px-4 text-center">Suggested PO Qty</th>
                <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                <th className="py-3 px-4 text-right">Est. PO Total (LKR)</th>
                <th className="py-3 px-4 text-center">Procurement Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {lowStockItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[#64748B]">
                    All medicine stocks are currently above their reorder thresholds.
                  </td>
                </tr>
              ) : (
                lowStockItems.map((item) => {
                  const estPoTotal = item.suggestedReorderQuantity * item.unitCostPrice;
                  return (
                    <tr key={item.medicineId} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F172A]">{item.medicineName}</div>
                        <div className="text-xs text-[#64748B] italic">{item.genericName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="neutral" size="sm">
                          {item.dosageForm}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#DC2626]">
                        {item.currentStockUnits}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[#64748B]">
                        {item.reorderLevel}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-[#047857]">
                        +{item.suggestedReorderQuantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#334155]">
                        {formatLKR(item.unitCostPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0F172A]">
                        {formatLKR(estPoTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="solid-primary"
                          size="sm"
                          leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
                          onClick={() => alert(`Generated Draft PO for ${item.medicineName} (+${item.suggestedReorderQuantity} units)`)}
                        >
                          Create PO
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
