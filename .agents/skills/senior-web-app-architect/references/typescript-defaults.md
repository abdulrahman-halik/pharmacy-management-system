# TypeScript Architectural Defaults Reference

Enforce strict TypeScript configurations and domain modeling patterns that make invalid states unrepresentable at compile time and verified at runtime boundaries.

---

## 1. Non-Negotiable `tsconfig.json` Compiler Flags

Enable these flags across every package in a project or monorepo:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

---

## 2. Branded Types for Multi-Tenant Safety

In SaaS applications, mixing up IDs across entities or tenants causes disastrous data corruption or leaks. Use branded types to make accidental ID mismatches compile errors:

```typescript
// types/branded.ts
declare const brand: unique symbol;
export type Brand<K, T> = K & { readonly [brand]: T };

export type TenantId = Brand<string, 'TenantId'>;
export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type ProjectId = Brand<string, 'ProjectId'>;

// Type-safe constructors
export const asTenantId = (id: string): TenantId => id as TenantId;
export const asUserId = (id: string): UserId => id as UserId;

// Compiler enforces isolation:
function fetchProject(tenantId: TenantId, projectId: ProjectId) { /* ... */ }

const userId = asUserId('user_123');
const projectId = 'proj_456' as ProjectId;

// ❌ COMPILE ERROR: Argument of type 'UserId' is not assignable to parameter of type 'TenantId'
// fetchProject(userId, projectId);
```

---

## 3. Discriminated Unions over Boolean Soup

Never represent complex UI or async states using independent booleans (`isLoading`, `isError`, `isSuccess`, `data`). They allow impossible states (`isLoading: true` and `isSuccess: true` simultaneously).

```typescript
// ❌ ANTI-PATTERN: 16 possible state permutations, 12 of which are invalid
interface BadAsyncState<T> {
  isLoading: boolean;
  isError: boolean;
  error?: string;
  data?: T;
}

// ✅ DISCRIMINATED UNION: Exactly one valid state at a time
export type AsyncState<T, E = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: E };

// Exhaustiveness checking with assertNever
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${x}`);
}
```

---

## 4. Predictable Domain Error Handling with `Result<T, E>`

Do not throw exceptions for expected business failures (e.g., plan limit reached, invalid coupon, slug already taken). Reserve `throw` for unexpected system failures (database down, out of memory).

```typescript
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

// Usage in SaaS domain services:
export type UpgradeError =
  | { code: 'PAYMENT_FAILED'; message: string }
  | { code: 'SEAT_LIMIT_EXCEEDED'; currentSeats: number; maxAllowed: number }
  | { code: 'REQUIRES_ENTERPRISE_CONTRACT' };

export async function upgradePlan(
  tenantId: TenantId,
  targetPlan: 'pro' | 'enterprise'
): Promise<Result<{ subscriptionId: string }, UpgradeError>> {
  // Return explicit err(...) or ok(...)
}
```

---

## 5. Runtime Boundary Validation with Zod

Never cast unknown incoming data using `as MyType`. Validate at every I/O boundary:

```typescript
import { z } from 'zod';

export const TenantConfigSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(2),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  features: z.array(z.string()).default([]),
  maxSeats: z.number().int().positive(),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;

export function parseTenantConfig(raw: unknown): TenantConfig {
  return TenantConfigSchema.parse(raw);
}
```