import React, { useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Button, Badge, Card, Modal } from '../../../components/core';
import type { Prescription, PrescriptionItem } from '@pharmacy/shared';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Stethoscope,
  ShieldCheck,
  FileText,
  Clock,
} from 'lucide-react';

interface PrescriptionVerifyModalProps {
  prescription: Prescription | null;
  isOpen: boolean;
  onClose: () => void;
  onVerify: (
    prescriptionId: string,
    decisions: Array<{ itemId: string; status: 'APPROVED' | 'REJECTED' }>,
    rejectionReason?: string,
  ) => Promise<void>;
  userRole?: string;
}

export function PrescriptionVerifyModal({
  prescription,
  isOpen,
  onClose,
  onVerify,
  userRole = 'PHARMACIST',
}: PrescriptionVerifyModalProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [itemStatuses, setItemStatuses] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});

  if (!prescription) return null;

  // Initialize line item decisions default to APPROVED
  const getItemStatus = (itemId: string) => {
    return itemStatuses[itemId] || 'APPROVED';
  };

  const setItemStatus = (itemId: string, status: 'APPROVED' | 'REJECTED') => {
    setItemStatuses((prev) => ({ ...prev, [itemId]: status }));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApproveAll = async () => {
    setIsSubmitting(true);
    try {
      const decisions = prescription.items.map((item) => ({
        itemId: item.id,
        status: getItemStatus(item.id),
      }));
      await onVerify(prescription.id, decisions);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectEntireRx = async () => {
    if (!rejectionReason) {
      alert('Please select a mandatory clinical rejection reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const decisions = prescription.items.map((item) => ({
        itemId: item.id,
        status: 'REJECTED' as const,
      }));
      await onVerify(prescription.id, decisions, rejectionReason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentImage =
    prescription.imageUrls && prescription.imageUrls.length > 0
      ? prescription.imageUrls[0]
      : 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=80';

  const isCashier = userRole.toUpperCase() === 'CASHIER';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Clinical Prescription Verification: ${prescription.rxNumber}`}
      description="Inspect high-resolution doctor prescription photo and confirm itemized clinical dosages."
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="rx" size="sm">
              Role: {userRole}
            </Badge>
            {isCashier && (
              <span className="text-xs text-clinical-crimson font-bold">
                Cashiers hard-blocked from approving Rx
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="solid-neutral" size="sm" onClick={onClose} disabled={isSubmitting}>
              Close (Esc)
            </Button>
            <Button
              variant="solid-danger"
              size="sm"
              leftIcon={<XCircle className="w-4 h-4" />}
              onClick={handleRejectEntireRx}
              disabled={isSubmitting || isCashier}
            >
              Reject Prescription
            </Button>
            <Button
              variant="solid-primary"
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleApproveAll}
              isLoading={isSubmitting}
              disabled={isCashier}
            >
              Approve Selected Items
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 h-[72vh] text-left">
        {/* Left 60%: High Resolution Image Pan/Zoom/Rotate Canvas */}
        <div className="lg:w-3/5 flex flex-col bg-slate-900 rounded-lg overflow-hidden border border-clinical-slate-border relative shadow-solid">
          {/* Viewer Toolbar */}
          <div className="bg-slate-800 text-slate-200 px-4 py-2 flex items-center justify-between z-10 border-b border-slate-700">
            <div className="flex items-center gap-2 text-xs font-mono">
              <FileText className="w-4 h-4 text-clinical-teal" />
              <span>Prescription Photo (1x to 5x Smooth Zoom)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90 degrees"
                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-xs transition flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-mono">{rotation}°</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title="Toggle Fullscreen"
                className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 text-xs transition"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Interactive Zoom Canvas */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-950">
            <TransformWrapper
              initialScale={1}
              minScale={0.8}
              maxScale={5}
              centerOnInit
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 p-1 rounded-md shadow-solid">
                    <button
                      type="button"
                      onClick={() => zoomIn(0.4)}
                      className="p-1.5 hover:bg-slate-800 text-slate-200 rounded"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => zoomOut(0.4)}
                      className="p-1.5 hover:bg-slate-800 text-slate-200 rounded"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetTransform();
                        setRotation(0);
                      }}
                      className="px-2 py-1 text-[11px] font-mono hover:bg-slate-800 text-slate-200 rounded"
                    >
                      Reset
                    </button>
                  </div>

                  <TransformComponent
                    wrapperClass="w-full h-full flex items-center justify-center"
                    contentClass="w-full h-full flex items-center justify-center"
                  >
                    <img
                      src={currentImage}
                      alt="Prescription Scan"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        transition: 'transform 150ms ease-out',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                      }}
                      className="rounded shadow-lg select-none"
                    />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>

        {/* Right 40%: Patient, Doctor & Line Item Approval Checklist */}
        <div className="lg:w-2/5 flex flex-col space-y-4 overflow-y-auto pr-1">
          {/* Patient Card */}
          <div className="bg-slate-50 border border-clinical-slate-border rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-clinical-emerald" /> Patient 360
              </span>
              <Badge variant="rx" size="sm">
                NIC: {prescription.customerNic || 'Not Verified'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-bold text-clinical-slate-heading">
                {prescription.customerName || 'Patient Details'}
              </p>
              <p className="text-xs text-clinical-slate-muted">
                Phone: {prescription.customerPhone || 'N/A'} • Issued: {prescription.issuedDate}
              </p>
            </div>

            {/* Allergies Alert */}
            {prescription.customerAllergies && prescription.customerAllergies.length > 0 ? (
              <div className="bg-red-50 border border-red-300 rounded p-2 text-xs flex items-start gap-2 text-red-900 mt-1">
                <AlertTriangle className="w-4 h-4 text-clinical-crimson flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Patient Documented Allergies: </span>
                  {prescription.customerAllergies.join(', ')}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-clinical-emerald font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> No documented drug allergies on record
              </div>
            )}
          </div>

          {/* Doctor Card */}
          <div className="bg-slate-50 border border-clinical-slate-border rounded-lg p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-clinical-teal" /> Prescribing Practitioner
              </span>
              <Badge variant="otc" size="sm">
                {prescription.doctorSlmc || 'SLMC-VERIFIED'}
              </Badge>
            </div>
            <p className="text-sm font-bold text-clinical-slate-heading">
              {prescription.doctorName || 'Dr. Registered Practitioner'}
            </p>
            <p className="text-xs text-clinical-slate-muted">
              Valid Until: {prescription.validUntil}
            </p>
          </div>

          {/* Prescribed Items Checklist */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-slate-heading">
                Prescription Items ({prescription.items.length})
              </h4>
              <span className="text-[11px] text-clinical-slate-muted">
                Approve or Reject per Line
              </span>
            </div>

            <div className="space-y-2.5">
              {prescription.items.map((item: PrescriptionItem) => {
                const status = getItemStatus(item.id);
                const isApproved = status === 'APPROVED';

                return (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-3 transition-all ${
                      isApproved
                        ? 'bg-white border-clinical-emerald/40 shadow-solid-sm'
                        : 'bg-red-50/50 border-red-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-clinical-slate-heading">
                          {item.medicineName || `Medicine #${item.medicineId.slice(0, 8)}`}
                        </p>
                        <p className="text-xs text-clinical-slate-muted font-mono">
                          Generic: {item.genericName || 'Active Pharmaceutical Ingredient'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setItemStatus(item.id, 'APPROVED')}
                          className={`px-2 py-1 text-xs font-bold rounded transition ${
                            isApproved
                              ? 'bg-clinical-emerald text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemStatus(item.id, 'REJECTED')}
                          className={`px-2 py-1 text-xs font-bold rounded transition ${
                            !isApproved
                              ? 'bg-clinical-crimson text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Reject
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-clinical-slate-muted">
                      <div>
                        <span className="font-bold text-slate-700">Dosage: </span>
                        <span>{item.dosage}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Quantity: </span>
                        <span className="font-mono text-clinical-slate-heading font-bold">
                          {item.prescribedQuantityBaseUnits} Base Units
                        </span>
                      </div>
                    </div>

                    {item.refillAllowed && (
                      <div className="mt-1 text-[11px] text-clinical-teal flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        Refills Allowed: {item.refillsAllowedCount} (Interval: {item.refillIntervalDays} days)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rejection Reason Selector (Mandatory if Rejecting) */}
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Rejection Reason (Required if Rejecting):
            </label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full text-xs p-2 rounded border border-clinical-slate-border bg-white text-clinical-slate-heading focus:ring-1 focus:ring-clinical-crimson"
            >
              <option value="">-- Select Clinical Reason --</option>
              <option value="ILLEGIBLE_HANDWRITING">Illegible Doctor Handwriting</option>
              <option value="EXPIRED_PRESCRIPTION">Expired Prescription Validity</option>
              <option value="DOCTOR_UNVERIFIED">Doctor SLMC Not Verified</option>
              <option value="INCORRECT_DOSAGE">Dosage Exceeds Therapeutic Range</option>
              <option value="SUSPECTED_FORGERY">Suspected Alteration / Forgery</option>
              <option value="OTHER">Other Clinical Reason</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
