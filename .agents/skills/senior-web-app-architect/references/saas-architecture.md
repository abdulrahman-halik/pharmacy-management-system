# SaaS Architecture Reference: B2B, B2C & Product-Led Growth

Design multi-tenant, scalable, and secure SaaS web applications across both Business-to-Business (B2B) and Business-to-Consumer (B2C) business models.

---

## 1. B2B vs. B2C Architectural Matrix

| Dimension | B2B SaaS | B2C SaaS | Product-Led Growth (PLG / Hybrid) |
| :--- | :--- | :--- | :--- |
| **Tenancy Hierarchy** | `Organization -> Workspace / Project -> Team -> User` | `User -> Profile -> Subscriptions` | Individual user who can create or join multiple Organizations |
| **Identity & Access** | SAML 2.0 / OIDC Enterprise SSO, SCIM 2.0, Directory Sync, RBAC / ABAC | Social Auth (Google, Apple), Passkeys, Magic Links, MFA | Social/Passkey initially; escalates to SAML/SSO when joining corporate org |
| **Routing & Tenancy** | Path (`/org-slug/projects`), Subdomain (`acme.app.com`), or Custom Domain | Clean unified paths (`/app/dashboard`, `/profile`) | Path-based with dynamic tenant context resolver |
| **Monetization Model** | Per-seat, annual contracts, invoicing, POs, tiered feature bundles | Monthly/annual self-serve recurring, freemium, micro-transactions | Freemium self-serve with in-app paywalls, transitioning to sales-assisted enterprise tiers |
| **Data Isolation** | Strict tenant boundary (Row-Level Security, tenant-scoped cache keys) | User boundary (`user_id` scoping) | Hybrid: personal workspace vs. shared organizational workspaces |
| **Checkout & Billing** | Stripe Customer Portal, invoicing, net-30 terms, seat-allocation controls | Stripe Checkout / Elements, Apple In-App Purchase, 1-click upgrades | In-app self-serve upgrade modals, usage meters, seat expansion prompts |
| **Critical KPI** | ACV (Annual Contract Value), Net Revenue Retention (NRR), Security Compliance (SOC2) | Churn rate, CAC payback, LTV, conversion rate, viral coefficient | Time-to-Value (TTV), Product-Qualified Leads (PQLs), self-serve upgrade rate |

---

## 2. Multi-Tenant Frontend Context & State Management

### A. Tenant Context Isolation
In B2B SaaS, a user frequently belongs to multiple organizations or workspaces. The frontend must isolate all cached queries, local state, and permissions to the active tenant.

```typescript
// types/tenant.ts
export type TenantId = string & { readonly __brand: unique_symbol };
export type WorkspaceId = string & { readonly __brand: unique_symbol };

export interface ActiveTenantContext {
  tenantId: TenantId;
  tenantSlug: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  capabilities: readonly string[];
}
```

### B. Cache Partitioning & Invalidation on Switch
**Critical Rule**: When a user switches workspaces or organizations, you MUST reset client-side cache stores (TanStack Query, SWR, Apollo, Redux, Zustand) to eliminate cross-tenant data leaks.

```typescript
import { useQueryClient } from '@tanstack/react-query';

export function useTenantSwitcher() {
  const queryClient = useQueryClient();

  const switchTenant = async (nextTenantSlug: string) => {
    // 1. Cancel in-flight queries
    await queryClient.cancelQueries();
    
    // 2. Clear query cache completely to prevent cross-tenant memory leakage
    queryClient.clear();
    
    // 3. Clear tenant-scoped browser storage (sessionStorage/localStorage)
    sessionStorage.removeItem('last_active_project');
    
    // 4. Hard or soft navigate to next tenant boundary
    window.location.href = `/${nextTenantSlug}/dashboard`;
  };

  return { switchTenant };
}
```

### C. Multi-Tenant URL Strategies

1. **Path-Based (`app.com/:tenantSlug/dashboard`) - Recommended for most B2B SaaS**:
   - *Pros*: Easiest routing, shared SSL certificate, simple cookie domain handling (`app.com`), seamless workspace switching without full domain reload.
   - *Cons*: Slug must be validated on every request; URLs are slightly longer.

2. **Subdomain-Based (`:tenantSlug.app.com`)**:
   - *Pros*: Clear visual branding, isolated local storage per subdomain if needed.
   - *Cons*: Wildcard SSL certificates required, cookie sharing across subdomains requires `Domain=.app.com`, CORS complexity.

3. **Custom Domain (`portal.customer.com`)**:
   - *Pros*: White-label enterprise requirement.
   - *Cons*: Dynamic SSL termination (Cloudflare for SaaS / Caddy), routing via edge middleware / reverse proxy.

---

## 3. B2B Enterprise Capabilities & Governance

### A. Enterprise Single Sign-On (SSO) & SCIM
- **Domain Auto-Discovery**: On the login page, when a user types `alex@acme.com`, detect the `@acme.com` corporate domain and redirect directly to Acme's IdP (Okta, Azure AD, Ping) via SAML 2.0 / OIDC.
- **SCIM 2.0 (System for Cross-domain Identity Management)**: Provision and de-provision users automatically. When an employee is de-activated in Okta, the frontend session must be invalidated immediately via server-sent event (SSE) or short session TTL.

### B. Audit Logging & Compliance
- Every state mutation must log:
  `{ timestamp, tenantId, actorId, action, targetResource, ipAddress, userAgent }`
- In the UI, provide an enterprise "Audit Log Viewer" with search, filter, and CSV/JSON export capabilities.

### C. Role-Based & Attribute-Based Access Control (RBAC / ABAC)
- Do not hardcode role names in UI components (`if (user.role === 'admin')`).
- Define permissions as declarative actions: `can('members:invite')`, `can('billing:update')`, `can('project:delete')`.
- Roles are simply collections of permissions that can be customized in enterprise tiers.

---

## 4. B2C & Product-Led Growth (PLG) Mechanics

### A. Frictionless Onboarding & Time-to-Value (TTV)
- **Zero-Friction Sign-Up**: Never require credit cards or complex organization forms upfront in B2C or PLG. Allow instant sign-in with Google, Apple, or email magic links.
- **Progressive Profiling**: Gather tenant/user metadata gradually as they use the product, not in a 10-step wizard.
- **Pre-Hydrated Templates**: Give users immediate sample data or starter templates so the initial dashboard is never empty or intimidating.

### B. Paywalls & In-App Upgrade Architecture
In B2C and PLG apps, the paywall is a first-class UI component, not an afterthought:
1. **Contextual Upgrade Triggers**: Show upgrade triggers at the exact point of intent (e.g., trying to add a 6th team member, attempting to export high-res PDF, reaching the 100-item limit).
2. **Feature Comparison Table**: Transparent tier breakdown with monthly vs. annual pricing toggles (highlighting annual discount, e.g. "Save 20%").
3. **Optimistic Plan Updates**: When a checkout webhook fires, update the user's entitlement state via WebSocket or SSE so the UI unlocks instantly without requiring a page refresh.

### C. Quotas & Metered Usage UX
- Provide visible progress bars for metered resources (e.g., "750 / 1,000 AI credits used this month").
- **Soft Limit**: Notify at 80% usage ("You are approaching your plan limit. Upgrade now to avoid interruptions.").
- **Hard Limit**: Gracefully disable create actions when 100% is reached, providing a direct 1-click upgrade button. Never crash or silently fail.
