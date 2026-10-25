import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* 
        Solid High-Contrast Backdrop Overlay:
        Explicitly zero blur filter (no backdrop-blur), high opacity solid slate overlay
      */}
      <div
        className="fixed inset-0 bg-[#0F172A] opacity-80 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Solid Opaque Modal Dialog Surface */}
      <div
        className={`relative z-10 w-full ${maxWidthMap[maxWidth]} bg-white rounded-lg border border-clinical-slate-border shadow-solid-lg overflow-hidden transform transition-all duration-150 ease-out`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-clinical-slate-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-clinical-slate-heading tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-clinical-slate-muted mt-0.5">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-clinical-slate-muted hover:text-clinical-slate-heading hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-clinical-emerald transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer ? (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-clinical-slate-border flex items-center justify-end gap-3">
            {footer}
          </div>
        ) : (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-clinical-slate-border flex items-center justify-end">
            <Button variant="solid-neutral" size="sm" onClick={onClose}>
              Dismiss (Esc)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
