import React, { useState } from 'react';
import { Card, Button } from '../../../components/core';

export const ButtonPrimitivesSection: React.FC = () => {
  const [buttonLoading, setButtonLoading] = useState(false);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-clinical-slate-heading flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-clinical-teal rounded-full" />
          Core Button Primitives (150ms Tactile Ease-Out)
        </h2>
        <span className="text-xs text-clinical-slate-muted font-medium">
          Click buttons to test active:translate-y-0.5 tactile depression
        </span>
      </div>

      <Card>
        <div className="space-y-6">
          {/* Variants */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted mb-3">
              1. Color Variants
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="solid-primary">Primary Action</Button>
              <Button variant="solid-accent">Doctor / Clinical</Button>
              <Button variant="solid-warning">Near Expiry Warning</Button>
              <Button variant="solid-danger">Schedule II Lock</Button>
              <Button variant="solid-neutral">Neutral Cancel</Button>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted mb-3">
              2. Size Scale
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large POS Touch (lg)</Button>
            </div>
          </div>

          {/* Dynamic States */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-clinical-slate-muted mb-3">
              3. Dynamic States
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="solid-primary"
                isLoading={buttonLoading}
                onClick={() => {
                  setButtonLoading(true);
                  setTimeout(() => setButtonLoading(false), 1200);
                }}
              >
                {buttonLoading ? 'Processing...' : 'Click to Test Loading Spinner'}
              </Button>
              <Button variant="solid-accent" disabled>
                Disabled Control
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
};
