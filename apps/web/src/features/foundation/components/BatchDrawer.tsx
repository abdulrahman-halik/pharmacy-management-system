import React from 'react';
import { Drawer, Button } from '../../../components/core';

interface BatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchDrawer: React.FC<BatchDrawerProps> = ({ isOpen, onClose }) => {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Inventory Batch Detail"
      description="Batch inspection and FEFO (First-Expired, First-Out) shelf records."
      footer={
        <>
          <Button variant="solid-neutral" size="sm" onClick={onClose}>
            Close (Esc)
          </Button>
          <Button
            variant="solid-accent"
            size="sm"
            onClick={() => {
              alert('Batch status updated!');
              onClose();
            }}
          >
            Update Batch Log
          </Button>
        </>
      }
    >
      <div className="space-y-5 text-left">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase text-clinical-slate-muted">Batch Number</span>
          <p className="text-lg font-mono font-bold text-clinical-slate-heading">LOT-SL-2026-4481</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-3 rounded border border-slate-200">
            <span className="text-slate-500 font-bold block mb-1">MANUFACTURING</span>
            <span className="font-bold text-clinical-slate-heading">2026-01-15</span>
          </div>
          <div className="bg-amber-50 p-3 rounded border border-amber-200">
            <span className="text-amber-700 font-bold block mb-1">EXPIRY DATE</span>
            <span className="font-bold text-amber-900">2026-11-20 (Near)</span>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-xs font-bold uppercase text-clinical-slate-muted">Storage Protocol</span>
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Required Temperature:</span>
              <span className="font-bold text-slate-800">15°C - 25°C (Controlled Room)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Dispensary Location:</span>
              <span className="font-bold text-slate-800">Shelf A-04, Bay 2</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Current Stock:</span>
              <span className="font-bold text-clinical-emerald">480 Strips Available</span>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};
