import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'alert' | 'highlight';
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantBorder =
    variant === 'alert'
      ? 'border-clinical-amber'
      : variant === 'highlight'
        ? 'border-clinical-emerald'
        : 'border-clinical-slate-border';

  return (
    <div
      className={`bg-white rounded-lg border ${variantBorder} shadow-solid overflow-hidden text-left font-sans ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-3.5 bg-slate-50 border-b border-clinical-slate-border flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50 border-t border-clinical-slate-border flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
};
