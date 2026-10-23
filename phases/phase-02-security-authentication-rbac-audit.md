# Phase 2: Security, Authentication, RBAC & Audit Trails

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 2  
**Architecture Layer:** Application Security, Identity, Access Control & Compliance Auditing  
**Primary Tech Stack:** NestJS 10, TypeORM, Argon2id, JWT (Passport), Redis 7, React 18, Zustand  
**Compliance Standard:** CDDA / NMRA Staff Audit Compliance, OWASP ASVS Level 2

---

## 1. Executive Summary & Scope

Phase 2 engineers the security backbone of the enterprise pharmacy management system. In a clinical healthcare and retail environment handling controlled pharmaceuticals, cash registers, and confidential patient records, strict identity verification, role-based access control (RBAC), and tamper-evident audit logging are legally and operationally mandated.

### In-Scope Deliverables
1. **User Identity & Staff Registry (`users` table):** Secure profile storage with Argon2id password hashing, Sri Lankan mobile number validation, role assignment (`ADMIN`, `MANAGER`, `PHARMACIST`, `CASHIER`), and compensation security.
2. **Hardened Authentication Engine:**
   - Dual-token architecture: Short-lived access token (15 minutes) and rotating refresh token (7 days) delivered via secure, `httpOnly`, `sameSite: strict` cookies.
   - Refresh token rotation with automatic reuse detection that invalidates token families upon compromise.
   - Brute-force protection: Automatic account lockout after 5 consecutive failed login attempts.
3. **Dynamic Role & Action Permission Matrix (`role_permissions` table):**
   - 15 functional modules: `DASHBOARD`, `POS`, `INVENTORY`, `MEDICINES`, `SALES`, `PRESCRIPTIONS`, `CUSTOMERS`, `DOCTORS`, `PURCHASES`, `FINANCE`, `PAYROLL`, `REPORTS`, `SETTINGS`, `USERS`, `AI_ASSISTANT`.
   - CRUD gates (`can_view`, `can_add`, `can_edit`, `can_delete`).
   - Action-level overrides (`PRICE_OVERRIDE`, `APPROVE_ADJUSTMENT`, `REOPEN_DAY`, `VOID_SALE`, `VIEW_COST_PRICE`, `EXPORT_DATA`).
   - High-performance Redis caching of user permissions with real-time cache eviction upon matrix changes.
4. **Tamper-Evident Audit Trail (`audit_logs` table):** Automatic before/after state diff capture for all financial, stock, prescription, and user configuration changes.
5. **Frontend Security Shell:** Role-aware navigation sidebar, `<PermissionGate>` conditional UI renderers, secure login page, and an interactive Admin Permission Matrix manager.

### Prerequisites & Dependencies
- **Phase 1 Deliverables:** Monorepo scaffolding, BaseAppEntity, MySQL 8, Redis 7, and the Clinical Design System.

### Downstream Outputs
- `@CurrentUser()` and `@Permissions()` guards protecting **Phase 3 (Medicines)**, **Phase 4 (Inventory)**, **Phase 5 (Prescriptions)**, and **Phase 6 (POS)**.
- Secure user session state consumed by **Phase 8 (Cashbook)** and **Phase 9 (Payroll)**.

---

## 2. Database & Data Architecture

### 2.1 Entity Schemas

#### User Entity (`apps/api/src/modules/users/entities/user.entity.ts`)
```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  PHARMACIST = 'PHARMACIST',
  CASHIER = 'CASHIER',
}

@Entity('users')
export class User extends BaseAppEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName: string;

  @Index({ unique: true })
  @Column({ name: 'email', type: 'varchar', length: 150 })
  email: string;

  @Column({ name: 'phone', type: 'varchar', length: 20 })
  phone: string; // E.164 +94 format

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CASHIER })
  role: UserRole;

  @Column({ name: 'monthly_salary', type: 'decimal', precision: 12, scale: 2, default: 0.0 })
  monthlySalary: number; // In LKR - Restricted to ADMIN/MANAGER views

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'must_reset_password', type: 'boolean', default: false })
  mustResetPassword: boolean;

  @Column({ name: 'failed_login_count', type: 'int', default: 0 })
  failedLoginCount: number;

  @Column({ name: 'locked_until', type: 'datetime', nullable: true })
  lockedUntil?: Date;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true })
  lastLoginAt?: Date;
}
```

#### Role Permission Matrix Entity (`apps/api/src/modules/users/entities/role-permission.entity.ts`)
```typescript
import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';
import { UserRole } from './user.entity';

@Entity('role_permissions')
@Unique(['role', 'moduleName'])
export class RolePermission extends BaseAppEntity {
  @Index()
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ name: 'module_name', type: 'varchar', length: 50 })
  moduleName: string;

  @Column({ name: 'can_view', type: 'boolean', default: false })
  canView: boolean;

  @Column({ name: 'can_add', type: 'boolean', default: false })
  canAdd: boolean;

  @Column({ name: 'can_edit', type: 'boolean', default: false })
  canEdit: boolean;

  @Column({ name: 'can_delete', type: 'boolean', default: false })
  canDelete: boolean;
}
```

#### Audit Log Entity (`apps/api/src/modules/audit/entities/audit-log.entity.ts`)
```typescript
import { Entity, Column, Index } from 'typeorm';
import { BaseAppEntity } from '../../../database/base.entity';

@Entity('audit_logs')
export class AuditLog extends BaseAppEntity {
  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId: string;

  @Column({ name: 'user_email', type: 'varchar', length: 150 })
  userEmail: string;

  @Index()
  @Column({ name: 'action', type: 'varchar', length: 64 })
  action: string; // e.g., 'LOGIN', 'PRICE_OVERRIDE', 'UPDATE_PERMISSIONS', 'VOID_SALE'

  @Index()
  @Column({ name: 'entity_name', type: 'varchar', length: 64 })
  entityName: string; // e.g., 'Medicine', 'Sale', 'DayClose'

  @Column({ name: 'entity_id', type: 'varchar', length: 64, nullable: true })
  entityId?: string;

  @Column({ name: 'before_state_json', type: 'json', nullable: true })
  beforeStateJson?: Record<string, any>;

  @Column({ name: 'after_state_json', type: 'json', nullable: true })
  afterStateJson?: Record<string, any>;

  @Column({ name: 'ip_address', type: 'varchar', length: 45 })
  ipAddress: string;

  @Column({ name: 'user_agent', type: 'varchar', length: 255 })
  userAgent: string;
}
```

---

## 3. Authentication Engine & Security Implementation

### 3.1 Dual-Token Lifecycle & Rotation Strategy
1. **Access Token:**
   - Lifespan: 15 minutes.
   - Payload: `{ sub: user.id, email: user.email, role: user.role, storeId: user.storeId }`.
   - Delivered via `Set-Cookie: access_token=...; HttpOnly; SameSite=Strict; Path=/; Max-Age=900; Secure`.
2. **Refresh Token & Family Rotation:**
   - Lifespan: 7 days.
   - Managed via Redis set: `auth:refresh_family:{userId}:{familyId}`.
   - When a refresh token is used, it is revoked and a new replacement token is issued in the same family.
   - **Reuse Detection:** If an already-revoked refresh token is presented, the system flags a token replay attack, purges all active refresh tokens for that user family, and forces immediate re-authentication.

### 3.2 Account Lockout Guard
```typescript
// Failed attempts tracking in Redis:
const FAILED_KEY = `auth:failed_attempts:${email}`;
const attempts = await redis.incr(FAILED_KEY);
if (attempts === 1) {
  await redis.expire(FAILED_KEY, 1800); // 30 minutes window
}
if (attempts >= 5) {
  await userRepository.update({ email }, { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) });
  throw new UnauthorizedException('Account locked due to 5 consecutive failed attempts. Contact Admin.');
}
```

---

## 4. Granular RBAC & Decorator Architecture

### 4.1 RBAC Decorator & Guard

```typescript
// apps/api/src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  module: string;
  action: 'view' | 'add' | 'edit' | 'delete' | 'special';
  specialAction?: string; // e.g., 'PRICE_OVERRIDE', 'VIEW_COST_PRICE'
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (module: string, action: 'view' | 'add' | 'edit' | 'delete' | 'special', specialAction?: string) =>
  SetMetadata(PERMISSIONS_KEY, { module, action, specialAction });
```

```typescript
// apps/api/src/common/guards/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissionService: RolePermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;

    // ADMIN has full uninhibited access
    if (user.role === UserRole.ADMIN) return true;

    return this.permissionService.hasPermission(user.role, required);
  }
}
```

### 4.2 Seeded Role Permission Matrix
| Module | ADMIN | MANAGER | PHARMACIST | CASHIER |
|---|---|---|---|---|
| `DASHBOARD` | Full | Full | View | View (POS summary only) |
| `POS` | Full | Full | Full | Add / View (Sale only) |
| `INVENTORY` | Full | Full | Full | View (Stock qty only, no cost) |
| `MEDICINES` | Full | Full | Full | View only |
| `PRESCRIPTIONS`| Full | Full | Full (Approve/Reject) | View only (Blocked from approve) |
| `CUSTOMERS` | Full | Full | Full | View / Add |
| `DOCTORS` | Full | Full | Full | View only |
| `PURCHASES` | Full | Full | View only | None |
| `FINANCE` | Full | Full | None | None |
| `PAYROLL` | Full | Full | None | None |
| `REPORTS` | Full | Full | Operational only | None |
| `USERS` | Full | View only | None | None |
| `SETTINGS` | Full | View only | None | None |
| `AI_ASSISTANT` | Full | Full | Clinical mode only | Sales inquiry only |

---

## 5. API Endpoints Specification

### Authentication Endpoints (`/api/v1/auth`)
- `POST /auth/login`
  - Body: `{ email: string, password: string }`
  - Response: `200 OK` -> `{ user: { id, fullName, email, role }, mustResetPassword: boolean }` + Sets `httpOnly` cookies.
- `POST /auth/refresh`
  - Request: Carries refresh cookie.
  - Response: `200 OK` -> Rotates refresh token and returns new session metadata.
- `POST /auth/logout`
  - Request: Clears cookies and deletes Redis session keys.
- `POST /auth/reset-password`
  - Body: `{ currentPassword: string, newPassword: string }`
  - Requires active session. Enforces password complexity (min 8 chars, 1 uppercase, 1 symbol).

### User Management Endpoints (`/api/v1/users`)
- `GET /users` -> List staff members (Excludes `monthlySalary` unless caller is ADMIN/MANAGER).
- `POST /users` -> Create new staff member (Admin only).
- `PATCH /users/:id` -> Update user details / toggle active status.
- `POST /users/:id/unlock` -> Admin manual unlock of brute-force locked account.

### Permissions & Audit Endpoints (`/api/v1/permissions`, `/api/v1/audit`)
- `GET /permissions/matrix` -> Fetch entire role-to-module permission table.
- `PUT /permissions/matrix` -> Update permissions (Triggers Redis cache flush and writes audit log).
- `GET /audit/logs` -> Query audit trail with filters: `userId`, `action`, `entityName`, `startDate`, `endDate`.

---

## 6. Frontend Security Architecture (`apps/web`)

### 6.1 State Management (`apps/web/src/stores/authStore.ts`)
```typescript
interface AuthState {
  user: UserPayload | null;
  permissions: Record<string, ModulePermission> | null;
  isAuthenticated: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  can: (module: string, action: 'view' | 'add' | 'edit' | 'delete') => boolean;
}
```

### 6.2 `<PermissionGate>` Component (`apps/web/src/components/auth/PermissionGate.tsx`)
```tsx
interface PermissionGateProps {
  module: string;
  action: 'view' | 'add' | 'edit' | 'delete';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ module, action, fallback = null, children }) => {
  const { can, user } = useAuthStore();
  if (user?.role === 'ADMIN' || can(module, action)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
};
```

### 6.3 Admin Permission Matrix Screen
- Interactive matrix table with solid toggle switches for every module across the 4 roles.
- Before committing changes, displays a side-by-side diff modal summarizing all altered permissions.

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 2.1: Database Entities & Migrations**
  - Create `User`, `RolePermission`, and `AuditLog` entities inheriting from `BaseAppEntity`.
  - Generate and run TypeORM migration `001_create_auth_and_rbac_tables`.
- [ ] **Task 2.2: Master Seed Generation**
  - Implement seed script creating the default system administrator account (`admin@pharmacy.system` or configurable via environment variable) with `mustResetPassword: true`.
  - Seed default permission matrix for `ADMIN`, `MANAGER`, `PHARMACIST`, and `CASHIER`.
- [ ] **Task 2.3: Authentication & Passport Strategies**
  - Implement Argon2id password hashing utility.
  - Implement JWT access token and refresh token rotation with Redis family tracking.
  - Implement account lockout mechanism after 5 failed login attempts.
- [ ] **Task 2.4: RBAC Guards & Audit Interceptor**
  - Build `@RequirePermission()` decorator and `PermissionsGuard` with Redis caching.
  - Build `AuditLogInterceptor` that diffs entities on `POST`, `PUT`, `PATCH`, and `DELETE`.
- [ ] **Task 2.5: User Management & Profile API**
  - Implement CRUD endpoints for users with role-aware response serialization (masking salaries).
- [ ] **Task 2.6: Frontend Auth Shell & Route Guards**
  - Implement `authStore` with persistence and session recovery.
  - Build high-contrast, zero-transparency Login screen with clear error alerts.
  - Build `ProtectedRoute` and `<PermissionGate>` components.
  - Build Admin Permission Matrix editor with live toggles and diff preview.

---

## 8. Verification & Exit Criteria

1. **RBAC Isolation Test:**
   - Login as `CASHIER`. Attempt to call `GET /api/v1/finance/cashbook` and `GET /api/v1/payroll`.
   - Result: Response is strictly `403 Forbidden` with error code `FORBIDDEN_RESOURCE`.
2. **Salary Masking Test:**
   - Login as `PHARMACIST`. Call `GET /api/v1/users`.
   - Result: Every user object in response has `monthlySalary: undefined` or omitted from JSON payload.
3. **Token Rotation & Replay Attack Test:**
   - Request refresh using valid refresh token `RT-1`. New token `RT-2` is issued.
   - Re-attempt refresh with `RT-1`.
   - Result: Server detects replay attack, revokes entire family, and returns `401 Unauthorized`.
4. **Audit Diff Verification:**
   - Admin changes a Pharmacist's `can_delete` permission on `MEDICINES`.
   - Query `audit_logs` table: Verify record exists containing `before_state_json: { can_delete: false }` and `after_state_json: { can_delete: true }`.
