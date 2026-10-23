---
name: senior-web-app-architect
description: Production-grade web application architecture decision framework specialized for B2B and B2C SaaS platforms. Covers feature-based development (Vertical Slices / Feature-Sliced Design), commercial entitlement engines and licensing vs. operational feature flags, multi-tenant state isolation and cache partitioning, rendering strategies (SSR, SSG, ISR, CSR, Streaming), security boundaries and DAL authorization, Core Web Vitals performance budgets, strict TypeScript domain modeling, and pre-launch failure drills across modern stacks like Next.js, Remix, Vite, Nuxt, SvelteKit, and Astro.
when_to_use: "Use when architecting SaaS web applications, B2B/B2C multi-tenant systems, feature-based architectures (Vertical Slices / Feature-Sliced Design), commercial entitlement gating, rendering strategies (SSR, SSG, ISR, CSR, Streaming), security boundaries/DAL authorization, Core Web Vitals budgets, or pre-launch failure drills."
allowed-tools: Read, Write, Edit, Glob, Grep
version: 1.0.0
---
# Senior Web App Architect

Provide a production-first, framework-agnostic architectural decision framework specialized for **B2B and B2C SaaS web applications**, frontend feature-based development, commercial feature entitlement systems, and enterprise-grade reliability.

## When to Use

- Architecting a new SaaS web application across **B2B**, **B2C**, or **Product-Led Growth (PLG)** business models
- Structuring frontend codebases using **Feature-Based Architecture (Vertical Slices / Feature-Sliced Design)**
- Designing **Feature Delivery, Entitlement Gating & Licensing** (decoupling operational feature flags from commercial subscription plans)
- Implementing multi-tenant context, workspace switching, and eliminating cross-tenant cache contamination
- Preventing client bundle bloat by dynamically splitting enterprise-only features behind entitlement gates
- Selecting rendering strategies (SSR, SSG, ISR, CSR, Streaming) and multi-tier caching topologies
- Defining authentication, session management, and Data Access Layer (DAL) security boundaries
- Enforcing strict TypeScript defaults (branded IDs, discriminated unions, `Result` types) and Core Web Vitals budgets
- Auditing an existing or AI-generated SaaS codebase before production deployment

---

## Steps

### Step 1: Classify SaaS Business Model & Tenancy Hierarchy

Consult `references/saas-architecture.md` to establish the tenancy and identity foundation:

- **B2B SaaS**:
  - Model tenancy as `Organization -> Workspace / Project -> Team -> Member`.
  - Support Enterprise Single Sign-On (SAML 2.0 / OIDC), SCIM 2.0 automated provisioning, and domain discovery (`@company.com`).
  - Choose URL routing strategy: Path-based (`app.com/:tenantSlug/dashboard` - recommended), Subdomain (`:tenant.app.com`), or Custom Domain.
- **B2C SaaS**:
  - Model tenancy as `User -> Profile -> Subscriptions`.
  - Provide zero-friction onboarding (Google/Apple OAuth, Passkeys, Magic Links) and instant time-to-value.
- **Product-Led Growth (PLG / Hybrid)**:
  - Users sign up individually with immediate self-serve utility, then seamlessly create or join corporate organizations as team adoption grows.

### Step 2: Organize Codebase with Feature-Based Architecture (Vertical Slices)

Consult `references/feature-based-development.md` to avoid the technical-layer anti-pattern (`components/`, `hooks/`, `services/`):

1. **Slice Structure**: Group code by business domain under `src/features/<feature-name>/`:
   - `api/` (TanStack Query / SWR hooks, mutations, server actions)
   - `components/` (UI components private to this feature)
   - `hooks/` (Domain-specific state and logic)
   - `types/` (Zod schemas, DTOs, and domain models)
   - `utils/` (Domain-specific pure helper functions)
   - `index.ts` (⚠️ **Mandatory Public API Barrel**)
2. **Enforce Boundary Rules**:
   - Features **never** import from another feature's internal directories. They communicate strictly through the public `index.ts` barrel.
   - `shared/` contains only domain-agnostic UI primitives (design system) and utilities. `shared/` must **never** import from `features/`.
   - Feature retirement is clean: deleting `src/features/<feature-name>/` should produce zero orphaned dead code across the repository.

### Step 3: Architect Feature Delivery & Monetization Entitlements

Consult `references/feature-flags-and-entitlements.md` to design feature rollout and customer gating:

1. **Decouple Flags from Entitlements**:
   - **Feature Flags (Toggles)**: Use ONLY for operational engineering risk (canary rollouts, dark launches, kill switches, trunk-based development). Retire within 30 days of 100% rollout.
   - **Business Entitlements (Licensing)**: Use for permanent commercial monetization (Free vs. Pro vs. Enterprise plans, purchased add-on modules, usage limits).
2. **Implement Superior Alternatives to Raw Feature Flag Tokens**:
   - **Capability-Based Access Control (CBAC)**: Map subscription plans to fine-grained capabilities (`analytics:custom_dashboards`, `security:saml_sso`). Gate UI using `<EntitlementGate capability="...">`.
   - **Server-Driven Bootstrap Manifest (`/api/bootstrap`)**: Provide a single cached payload on app startup containing authorized navigation items, capabilities, and active tenant settings.
   - **Database-Backed Tenant Settings**: Store enterprise customizations and pilot opt-ins in a `tenant_features` table, manageable via the Tenant Admin dashboard.
3. **Enforce Zero-Bundle-Leak Dynamic Code Splitting**:
   - Never put enterprise features in main client chunks behind static `if (hasFeature)` blocks.
   - Use `React.lazy` or framework dynamic imports so free users never download enterprise JavaScript bundles over the wire.
4. **Product-Led Growth (PLG) Paywalls**:
   - Present contextual upgrade modals and clear feature comparison tables at the exact point of user intent.
   - Track quota consumption (AI credits, seats, storage) with soft limit warnings (80%) and graceful hard limits (100%).

### Step 4: Select Rendering and Caching Architecture with Tenant Isolation

Consult `references/rendering.md` and `references/data-and-caching.md`:

- **Public Static Content (Marketing, Docs, Legal)**: Static Site Generation (SSG) at edge CDN nodes.
- **Public Dynamic Content (Catalogs, Directories, Blog)**: Incremental Static Regeneration (ISR) with `stale-while-revalidate`.
- **Authenticated SaaS Dashboards**: Server-rendered app shell with CSR for stateful interactions, or SSR Streaming with strict private headers:
  `Cache-Control: private, no-store, no-cache, must-revalidate`
- **Tenant Cache Partitioning**: Every cached Redis/application key must be prefixed with `TenantId` (e.g., `v1:tenant:${tenantId}:resource:${id}`).
- **Client Cache Isolation on Workspace Switch**: When a user switches organizations, synchronously clear client query caches (`queryClient.clear()`) and tenant-scoped storage to prevent cross-tenant data leaks.

### Step 5: Establish Security and Data Access Layer (DAL) Boundaries

Consult `references/auth-and-security.md`:

- **Never Trust Client-Supplied Tenant IDs**: Always verify that the authenticated session owns and is authorized for the target `tenantId`. Enforce Row-Level Security (RLS) in PostgreSQL.
- **DAL Authorization**: Enforce RBAC/ABAC in the Data Access Layer, not merely in UI components or route middleware.
- **Session Hygiene**: Store session tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies prefixed with `__Host-`.
- **DTO Serialization**: Map database records to explicit Data Transfer Objects before returning JSON or hydrating SSR props to prevent password hashes, secret keys, or PII from leaking.

### Step 6: Enforce Strict TypeScript Defaults, Performance Budgets, and SEO

Consult `references/typescript-defaults.md`, `references/performance.md`, and `references/seo.md`:

- **Strict TypeScript**: Enable `strict: true`, `noUncheckedIndexedAccess: true`, and `verbatimModuleSyntax: true`.
- **Branded Types**: Use branded types (`TenantId`, `UserId`, `ProjectId`) to eliminate accidental entity mixups at compile time.
- **Discriminated Unions**: Represent UI and async states using discriminated unions instead of independent boolean flags (`isLoading`, `isError`).
- **Core Web Vitals Budgets (p75)**:
  - **LCP <= 2.5s**: Fast edge TTFB (< 200ms), `fetchpriority="high"` on hero images, no lazy-loading above the fold.
  - **INP <= 200ms**: Critical client JS < 100KB, code-split enterprise modules, yield tasks over 50ms.
  - **CLS <= 0.1**: Explicit aspect ratios on all dynamic slots, media, and skeleton loaders.

### Step 7: Execute Production Validation Drills and Audits

Consult `references/production-drills.md` before deploying:

1. Run the **Production Failure Drills**: Cross-Tenant Cache Poisoning, Double-Click/Billing Retry Idempotency, Downstream Dependency Timeouts, Unbounded Query Limits, Expand-and-Contract Migrations, Secret/PII Leak Audits, and Graceful `SIGTERM` Shutdowns.
2. Group audit findings into **Critical (Production Blockers)**, **High (Performance & Reliability)**, and **Medium (Maintainability)** with actionable remediation code.

---

## Reference Guides

- `references/saas-architecture.md` - B2B vs B2C matrix, multi-tenant context, workspace switching, SSO/SCIM, and billing models.
- `references/feature-flags-and-entitlements.md` - Operational flags vs. commercial entitlements, CBAC engines, bootstrap manifests, zero-bundle-leak code splitting, and PLG paywalls.
- `references/feature-based-development.md` - Vertical Slices / Feature-Sliced Design, boundary rules, public `index.ts` exports, and monorepo scaling.
- `references/auth-and-security.md` - Stateful sessions vs BFF, multi-tenant isolation, DAL authorization, DTO serialization, and CSP headers.
- `references/data-and-caching.md` - Multi-tier caching, tenant-partitioned keys, tag invalidation, stampede prevention, and N+1 elimination.
- `references/performance.md` - Core Web Vitals (LCP, INP, CLS) budgets, critical path optimization, and bundle splitting.
- `references/production-drills.md` - Pre-launch failure drills, idempotency keys, expand-and-contract migrations, and observability baselines.
- `references/rendering.md` - Route decision matrix for SSG, ISR, SSR Streaming, Islands, and CSR.
- `references/seo.md` - Crawler architecture, HTTP status hygiene, canonicalization, OpenGraph, JSON-LD, and i18n routing.
- `references/typescript-defaults.md` - Strict compiler flags, branded tenant IDs, discriminated unions, `Result<T, E>`, and Zod boundary parsing.

---

## Gotchas

- **Treating subscription entitlements as feature flags**: Managing long-term pricing tiers inside LaunchDarkly or Unleash causes immense flag sprawl, vendor lock-in, and security vulnerabilities. Use an Entitlement Engine (CBAC) for pricing and keep feature flags for short-lived engineering rollouts.
- **Enterprise bundle leakage**: Gating enterprise features behind standard client conditionals without `React.lazy` or dynamic imports forces free users to download megabytes of unentitled code, degrading LCP/INP.
- **Cross-tenant cache contamination**: Forgetting to prefix application/Redis cache keys with `tenantId`, or failing to clear client query stores (TanStack Query/SWR) during workspace switches, leaks confidential tenant data.
- **Trusting client-supplied tenant identifiers**: Accepting `tenantId` in API request bodies or query params without verifying authenticated session membership opens critical IDOR / privilege escalation vulnerabilities.
- **Accidental dynamic rendering bailout**: Reading cookies or headers in a shared root layout forces static marketing and catalog pages out of CDN edge caching into per-request SSR.