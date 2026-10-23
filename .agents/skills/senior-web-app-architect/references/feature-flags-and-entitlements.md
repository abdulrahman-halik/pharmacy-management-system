# Feature Delivery, Entitlements & Licensing Reference

Design scalable feature rollout, monetization gating, and enterprise licensing for SaaS web applications. Understand the critical distinction between operational feature flags and commercial business entitlements.

---

## 1. Feature Flags vs. Business Entitlements: The Fundamental Distinction

A common anti-pattern in growing SaaS applications is treating **monetization & licensing** as **feature flags**. Conflating these concepts creates unmaintainable codebases, bloated client bundles, and security vulnerabilities.

| Characteristic | Feature Flags (Operational Toggles) | Business Entitlements (Commercial Licensing) |
| :--- | :--- | :--- |
| **Primary Owner** | Engineering & DevOps | Product Management, Sales & Finance |
| **Purpose** | Operational risk mitigation, canary releases, dark launches, kill switches | Monetization, pricing tiers (Free, Pro, Enterprise), contract terms, packaging |
| **Lifespan** | **Temporary** (days to weeks); deleted once feature is 100% rolled out | **Permanent**; evolves with pricing plans, addons, and contracts |
| **Evaluation Context**| Per-request, percentage cohort, device type, environment | Tenant subscription, plan tier, billing status, purchased add-on modules |
| **Source of Truth** | Feature flag service (LaunchDarkly, Unleash, PostHog, OpenFeature) | Billing & Subscription system (Stripe, Chargebee, database `tenants` table) |
| **Client Bundle Rule** | Both code branches often exist in the build temporarily | **Unlicensed code must be dynamically split** so free users never download enterprise code |

> [!WARNING]
> **The Anti-Pattern**: Creating a feature flag `flag_custom_domain_v1` in LaunchDarkly, leaving it permanently in the codebase, and manually flipping it on for customer after customer as they pay for the Enterprise plan.
>
> **The Solution**: Feature flags should ONLY control the engineering release of the feature. Once the feature is stable, remove the flag and gate the feature behind the **Entitlement Engine** (`hasCapability('custom_domains')`).

---

## 2. Alternatives to Feature Flags for SaaS Feature Enablement

When enabling features for customers based on your SaaS business model, use these robust architectural alternatives:

### Pattern 1: Capability-Based Entitlement Engine (CBAC)
Instead of checking raw plan names (`if (tenant.plan === 'enterprise')`) or feature flags, decompose subscription plans into granular, atomic **capabilities**.

```typescript
// types/entitlements.ts
export type Capability =
  | 'analytics:export_csv'
  | 'analytics:custom_dashboards'
  | 'team:unlimited_members'
  | 'security:audit_logs'
  | 'security:saml_sso'
  | 'branding:custom_domain'
  | 'ai:unlimited_prompts';

// Map plans to capabilities in a centralized matrix
export const PLAN_CAPABILITIES: Record<'free' | 'starter' | 'pro' | 'enterprise', readonly Capability[]> = {
  free: ['analytics:export_csv'],
  starter: ['analytics:export_csv', 'team:unlimited_members'],
  pro: ['analytics:export_csv', 'analytics:custom_dashboards', 'team:unlimited_members', 'branding:custom_domain'],
  enterprise: [
    'analytics:export_csv',
    'analytics:custom_dashboards',
    'team:unlimited_members',
    'branding:custom_domain',
    'security:audit_logs',
    'security:saml_sso',
    'ai:unlimited_prompts',
  ],
};
```

#### Why this is superior to feature flag tokens:
- **Zero Flag Debt**: When pricing packaging changes, you update the `PLAN_CAPABILITIES` matrix without touching application code or UI conditionals.
- **Contract Overrides**: Enterprise customers can purchase custom add-ons (e.g., Pro plan + `security:saml_sso` add-on) simply by appending capabilities to their tenant record.

---

### Pattern 2: Server-Driven Bootstrap Manifest (`/api/bootstrap`)
Instead of shipping client-side flag evaluation SDKs that make network roundtrips or evaluate complex rules in the browser, provide a single server-rendered or fast API bootstrap payload during app initialization.

```typescript
// GET /api/bootstrap -> Response Payload
export interface BootstrapManifest {
  user: {
    id: string;
    email: string;
    name: string;
  };
  activeTenant: {
    id: string;
    slug: string;
    name: string;
    plan: 'free' | 'pro' | 'enterprise';
    capabilities: Capability[];
    quotas: Record<string, { used: number; limit: number }>;
  };
  navigation: Array<{
    id: string;
    label: string;
    path: string;
    icon: string;
    isEntitled: boolean;
    requiredCapability?: Capability;
  }>;
}
```

#### Benefits:
- **Instant UI Rendering**: No layout shifts while client SDKs initialize.
- **Security**: The server filters navigation and action manifests. If a tenant doesn't have access to "Audit Logs", the link simply does not exist in their navigation payload.
- **Unified Cache**: Cache the bootstrap payload at the edge or Redis, invalidating immediately on subscription webhooks (`customer.subscription.updated`).

---

### Pattern 3: Entitlement-Gated Dynamic Code Splitting (Zero Enterprise Bundle Leak)
If you place enterprise-only code behind standard conditionals without dynamic imports, **every free-tier user downloads all enterprise JavaScript**, hurting Core Web Vitals (LCP/INP) and leaking proprietary client-side logic.

```tsx
// components/analytics/AnalyticsView.tsx
import React, { Suspense } from 'react';
import { useEntitlement } from '@/features/entitlements';
import { UpgradePaywall } from '@/features/billing/components/UpgradePaywall';
import { LoadingSpinner } from '@/shared/ui';

// Lazy-load the heavy enterprise component only when entitled
const EnterpriseCustomDashboards = React.lazy(
  () => import('./EnterpriseCustomDashboards')
);

export function AnalyticsView() {
  const { hasCapability } = useEntitlement();

  if (!hasCapability('analytics:custom_dashboards')) {
    return (
      <UpgradePaywall
        requiredPlan="pro"
        title="Custom Analytics Dashboards"
        description="Build custom dashboards, track cross-team metrics, and automate daily digests."
        feature="analytics:custom_dashboards"
      />
    );
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EnterpriseCustomDashboards />
    </Suspense>
  );
}
```

---

### Pattern 4: Database-Backed Tenant Settings & Self-Serve Add-Ons
For B2B SaaS, allow tenant administrators to enable/disable features or opt into beta modules directly via the database and tenant admin settings UI:

```sql
-- Schema for tenant feature allocations
CREATE TABLE tenant_features (
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  feature_key VARCHAR(64) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  granted_by VARCHAR(32) NOT NULL, -- 'plan', 'addon_purchase', 'beta_opt_in', 'sales_pilot'
  expires_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, feature_key)
);
```

#### Use Cases:
- **Customer Opt-In**: A tenant admin toggles "Enable New Workflow Builder (Beta)" in their workspace settings.
- **Time-Limited Pilots**: Sales grants 30 days of "Advanced Security" to a prospective customer with an automatic `expires_at` timestamp.
- **A/B Testing within Tenant**: Tenant admin chooses whether to roll out an interface change to all members or just managers.

---

### Pattern 5: Signed Capability Tokens (For Offline, Edge & Hybrid SaaS)
For B2B on-premise installations, air-gapped environments, or micro-frontends operating at the edge without a central database roundtrip:

- The licensing service issues an EdDSA-signed JSON Web Token (JWT) or license token during subscription activation.
- The token payload contains:
  ```json
  {
    "sub": "tenant_99812",
    "plan": "enterprise",
    "seats": 150,
    "capabilities": ["sso", "audit_logs", "custom_domain"],
    "valid_until": 1798761600
  }
  ```
- The frontend or edge gateway verifies the signature using a public key (`Ed25519`) and grants immediate access without calling a third-party server.

---

## 3. Frontend Architecture: The Declarative Entitlement Gate

Build a declarative gate component and hook in your shared library:

```tsx
// shared/components/EntitlementGate.tsx
import React, { ReactNode } from 'react';
import { Capability } from '@/types/entitlements';
import { useEntitlement } from '@/features/entitlements/hooks/useEntitlement';

interface EntitlementGateProps {
  capability: Capability;
  children: ReactNode;
  fallback?: ReactNode;
}

export function EntitlementGate({ capability, children, fallback = null }: EntitlementGateProps) {
  const { hasCapability } = useEntitlement();

  if (!hasCapability(capability)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Usage Examples:

```tsx
// Example 1: Hiding secondary actions gracefully
<EntitlementGate capability="analytics:export_csv">
  <Button onClick={exportCSV}>Export to CSV</Button>
</EntitlementGate>

// Example 2: In-line Product-Led Growth (PLG) Paywall
<EntitlementGate
  capability="security:audit_logs"
  fallback={<UpgradeBanner plan="enterprise" featureName="Audit Logs" />}
>
  <AuditLogTable />
</EntitlementGate>
```

---

## 4. When to Use Feature Flags (and How to Retire Them)

Feature flags remain vital for **operational engineering safety**. Follow these rules:

1. **Use Feature Flags For**:
   - Trunk-based development (merging unfinished code safely into `main`).
   - Canary rollouts (e.g., releasing a new billing checkout engine to 5% of users first).
   - Kill switches (disabling a flaky third-party AI integration under heavy load).
   - A/B experiments (testing whether Button Color A converts better than Button Color B).

2. **The 30-Day Flag Retirement Rule**:
   - Every feature flag must have an assigned owner and an expiration ticket created at the moment of flag creation.
   - Once a feature flag reaches 100% rollout, schedule immediate cleanup within 1 sprint.
   - Do NOT use feature flags to maintain long-term pricing tiers or client-specific forks.

3. **Vendor-Agnostic Abstraction (OpenFeature)**:
   - Always wrap third-party SDKs behind an abstraction layer (such as the OpenFeature standard).
   - Never import vendor-specific SDKs (`import { ldClient } from 'launchdarkly-react-client-sdk'`) directly into business or feature components.
