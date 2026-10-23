# Authentication & Security Boundaries Reference

Establish defense-in-depth security boundaries across transport, authentication, authorization, multi-tenant data isolation, data serialization, and third-party integrations.

---

## 1. Authentication & Session Architecture

### Stateful Sessions vs. Stateless JWTs

- **Default for Web Applications (SSR / BFF)**: Prefer opaque session IDs stored in `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) cookies backed by Redis or a fast database table.
  - *Why*: Instant session revocation on compromise, zero token size bloat, immune to client-side JavaScript extraction via XSS.
- **When using JWTs**:
  - Never store raw access or refresh tokens in browser `localStorage` or `sessionStorage`.
  - Use the **Backend-for-Frontend (BFF)** pattern to keep tokens inside `HttpOnly` cookies, or use short-lived access tokens (5-15 min) with rotating refresh tokens bound to strict reuse detection.
  - Explicitly pin the verification algorithm (`alg: RS256` or `EdDSA`), validate `iss`, `aud`, and `exp`, and reject `alg: none`.

### Cookie Security Baseline

```http
Set-Cookie: __Host-session=<session_id>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=86400
```

- **`__Host-` Prefix**: Guarantees cookie is sent only to the host domain (no subdomains) and only over secure HTTPS with `Path=/`.
- **`HttpOnly`**: Blocks all document scripts (`document.cookie`), preventing XSS token theft.
- **`SameSite=Lax`**: Defends against CSRF for standard web navigations; use `SameSite=Strict` for sensitive banking/admin portals.

---

## 2. Multi-Tenant Authorization & Data Isolation

In multi-tenant SaaS (B2B & B2C), authorization failures lead to critical cross-tenant data leaks.

### The Tenant Isolation Golden Rules

1. **Never Trust Client-Supplied Tenant IDs**:
   Never trust `tenantId` passed in JSON request bodies or query parameters without verifying that the authenticated user belongs to that tenant with the required role.

   ```typescript
   // ❌ DANGEROUS: trusting user-supplied body
   async function updateProject(req: Request) {
     const { tenantId, projectId, name } = await req.json();
     await db.update(projects).set({ name }).where(eq(projects.id, projectId));
   }

   // ✅ SECURE: verifying authenticated session tenant membership
   async function updateProject(req: Request, session: Session) {
     const { projectId, name } = parseSchema(await req.json());
     
     // 1. Resolve authorized tenant from verified session
     const activeTenantId = session.activeTenantId;
     
     // 2. Query scoped strictly to the tenant
     const updated = await db
       .update(projects)
       .set({ name })
       .where(and(eq(projects.id, projectId), eq(projects.tenantId, activeTenantId)));
       
     if (!updated) throw new ForbiddenError('Resource not found or unauthorized');
   }
   ```

2. **Data Access Layer (DAL) Enforcement**:
   Enforce authorization in the Service or Data Access Layer, not in UI components or top-level route middleware alone. Middleware can be bypassed or misconfigured; the DAL is the final gatekeeper.

3. **Row-Level Security (RLS)**:
   In PostgreSQL, enable Row-Level Security on all tenant-owned tables and set `current_tenant_id` at the beginning of each database transaction:
   ```sql
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation_policy ON projects
     USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
   ```

---

## 3. Data Transfer Objects (DTO) & Secret Sanitization

Never return raw database models or ORM records directly to the client or hydrate them into SSR page props.

### The Serialization Boundary

```typescript
// ❌ DANGEROUS: Leaks password_hash, stripe_secret_key, internal_notes
export async function getUserProfile(userId: string) {
  const user = await db.users.findById(userId);
  return user; // Serializes internal columns directly into HTML or JSON response!
}

// ✅ SECURE: Explicit DTO mapping
export interface UserProfileDTO {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'admin' | 'member';
}

export function toUserProfileDTO(user: UserRecord): UserProfileDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}
```

---

## 4. Input Validation & Runtime Schemas

Validate every inbound parameter at the boundary (route params, query string, headers, request bodies) using runtime schemas (e.g., Zod, Valibot, ArkType):

```typescript
import { z } from 'zod';

export const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(64),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  billingEmail: z.string().email(),
  seats: z.number().int().min(1).max(500).default(5),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
```

---

## 5. Defense-in-Depth HTTP Headers

Ensure the server or edge proxy emits these security headers on every response:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```