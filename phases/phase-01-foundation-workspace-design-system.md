# Phase 1: Foundation, Workspace & Clinical Design System

**Target Organization:** Universal / Configurable Pharmacy (Multi-Store & Single-Store Template)  
**System Name:** Enterprise Pharmacy Management & POS System (Standard Template)  
**Timeline:** Week 1  
**Architecture Layer:** Monorepo Infrastructure, DevOps & Frontend Foundation  
**Primary Tech Stack:** NestJS 10, TypeORM, MySQL 8, Redis 7, MinIO, React 18, Vite, TypeScript, Tailwind CSS  
**Design Standard:** Clinical Pharmacy Solid Palette (Zero Transparency, Accessible, Micro-interactions)

---

## 1. Executive Summary & Scope

Phase 1 establishes the production-grade workspace, containerized services, and core design system for any modern retail, hospital, or chain pharmacy. It builds the foundational substrate upon which all clinical, financial, inventory, and POS modules will reside.

### In-Scope Deliverables
1. **Monorepo Architecture (`pnpm workspaces`):** Isolated, typed packages for API, Web, and Shared logic.
2. **Containerized Infrastructure (`infra/docker-compose.yml`):** Production-mirrored local development environment hosting MySQL 8 (configured for Sri Lankan collation and timezones), Redis 7 (sessions and queues), and MinIO (prescription document storage).
3. **Backend Base Framework (`apps/api`):** NestJS 10 enterprise scaffolding with custom UUIDv7 base entity, unified error handling filter, request-scoped correlation IDs, and migration-first TypeORM.
4. **Shared Type & Validation Library (`packages/shared`):** Universal Zod validation schemas, TypeScript interfaces, Sri Lankan Rupee (LKR) currency formatters, and packaging math utilities.
5. **Frontend Application & Clinical Design System (`apps/web`):** React 18 SPA configured with Vite, React Router v6, TanStack Query v5, Zustand, and a customized solid Tailwind CSS design system tailored for high-contrast pharmacy counter environments.
6. **Health Monitoring & Developer Tooling:** Structured logging, pre-commit quality gates (Husky, ESLint, Prettier), and health check endpoints (`/health/liveness`, `/health/readiness`).

### Prerequisites & Dependencies
- Docker Engine >= 24.0 and Docker Compose v2.
- Node.js >= 20.x LTS and `pnpm` >= 9.x.

### Downstream Outputs
- Base entities and DB connection consumed by **Phase 2 (Auth & RBAC)**.
- Shared unit calculation and money helpers consumed by **Phase 3 (Medicines)** and **Phase 6 (POS)**.
- Reusable UI component library (Button, Modal, Input, Badge, Card, Drawer) used by all subsequent frontend screens.

---

## 2. Infrastructure & Environment Specifications

### 2.1 Docker Services (`infra/docker-compose.yml`)

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0.36
    container_name: pharmacy_mysql
    restart: unless-stopped
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --default-time-zone='+05:30'
      --sql_mode=STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION
    environment:
      MYSQL_ROOT_PASSWORD: pharmacy_root_secret_2026
      MYSQL_DATABASE: pharmacy_db
      MYSQL_USER: pharmacy_user
      MYSQL_PASSWORD: pharmacy_password_2026
    ports:
      - '3306:3306'
    volumes:
      - mysql_data:/var/lib/mysql
      - ./mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'pharmacy_user', '-ppharmacy_password_2026']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7.2-alpine
    container_name: pharmacy_redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass pharmacy_redis_secret_2026
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', 'pharmacy_redis_secret_2026', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:RELEASE.2024-03-30T09-41-56Z
    container_name: pharmacy_minio
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: pharmacy_minio_admin
      MINIO_ROOT_PASSWORD: pharmacy_minio_secret_2026
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 15s
      timeout: 5s
      retries: 3

volumes:
  mysql_data:
  redis_data:
  minio_data:
```

### 2.2 Sri Lankan Localization Configuration
- **Database Collation:** `utf8mb4_unicode_ci` supporting English, Sinhala Unicode, and Tamil Unicode character sets.
- **Server Timezone:** Asia/Colombo (`+05:30` IST/SLST). All timestamp logs stored as UTC with automatic conversion on display.
- **Default Currency:** Sri Lankan Rupee (`LKR`), formatted as `Rs. 1,250.00` with 2 decimal places.

---

## 3. Backend Architecture Base (`apps/api`)

### 3.1 Base Entity Pattern (`apps/api/src/database/base.entity.ts`)
All domain entities inherit from `BaseEntity` to guarantee consistent auditing, multi-store readiness, and soft-delete compliance.

```typescript
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  BeforeInsert,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

export abstract class BaseAppEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'store_id', type: 'int', default: 1 })
  storeId: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 64, nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64, nullable: true })
  updatedBy?: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
```

### 3.2 Global Exception Filter (`apps/api/src/common/filters/http-exception.filter.ts`)
Ensures that all client errors follow an unambiguous, machine-readable JSON structure.

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, any> | Array<any>;
  requestId: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) || 'req_unknown';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred. Please contact IT support.';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        code = (res as any).code || exception.name;
        message = (res as any).message || exception.message;
        details = (res as any).details || (res as any).errors;
      } else {
        message = String(res);
      }
    } else {
      this.logger.error(`Unhandled Exception on [${request.method}] ${request.url}`, exception);
    }

    const payload: ApiErrorResponse = {
      statusCode: status,
      code,
      message,
      details,
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(payload);
  }
}
```

### 3.3 Core API Endpoints
- `GET /health/liveness` -> Returns `{ status: 'UP', timestamp }`.
- `GET /health/readiness` -> Verifies MySQL connection, Redis connection, and MinIO storage availability. Returns `{ status: 'READY', services: { mysql: 'UP', redis: 'UP', minio: 'UP' } }`.

---

## 4. Shared Library Specifications (`packages/shared`)

### 4.1 Currency & Formatting Engine (`packages/shared/src/formatters/currency.ts`)

```typescript
export function formatLKR(amount: number | string): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numeric)) {
    return 'Rs. 0.00';
  }
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(numeric)
    .replace('LKR', 'Rs.')
    .trim();
}

export function roundToNearestRupee(amount: number): number {
  return Math.round(amount);
}
```

### 4.2 Sri Lankan Identity & Phone Validators (`packages/shared/src/schemas/lk-validators.ts`)
- **SL Phone Regex:** `^(?:\+94|0)(?:7[01245678]\d{7})$` (Supports mobile operators Dialog, Mobitel, Airtel, Hutch).
- **SL NIC Regex:** `^(?:[0-9]{9}[vVxX]|[0-9]{12})$` (Supports both 9-digit old format with check letter and 12-digit new format).
- **SLMC Doctor Reg No:** `^[A-Za-z0-9\/-]{3,20}$`.

---

## 5. Frontend & Clinical Design System (`apps/web`)

### 5.1 Design System Principles (Zero Transparency)
In busy dispensary and billing environments with harsh LED or natural fluorescent lighting, subtle transparency, glassmorphism, and blurred drop-downs result in optical fatigue and misread dosages.
1. **Solid Colors Only:** No `bg-opacity-*` or `backdrop-blur-*`. All cards, modal dialogs, flyouts, and badges utilize 100% opaque solid fills.
2. **High-Contrast Typography:** High-readability sans-serif (Inter / Outfit) with strict font weight distinctions (`font-semibold` / `font-bold` for prices and medication strengths).
3. **Hardware-Accelerated Micro-Animations:** Fast 150ms ease-out transitions (`transition-all duration-150 ease-out`) for instant tactile feedback without distracting dispensary flow.

### 5.2 Color Tokens & Tailwind Configuration (`apps/web/tailwind.config.ts`)

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clinical: {
          emerald: {
            DEFAULT: '#047857', // Primary brand action
            hover: '#059669',
            dark: '#065F46',
            light: '#D1FAE5',
            text: '#064E3B',
          },
          teal: {
            DEFAULT: '#0D9488', // Clinical Rx / Doctor actions
            hover: '#0F766E',
            light: '#CCFBF1',
            text: '#115E59',
          },
          amber: {
            DEFAULT: '#D97706', // Low stock / Near expiry alerts
            hover: '#B45309',
            light: '#FEF3C7',
            text: '#78350F',
          },
          crimson: {
            DEFAULT: '#DC2626', // Out of stock / Controlled drug locks
            hover: '#B91C1C',
            light: '#FEE2E2',
            text: '#7F1D1D',
          },
          slate: {
            canvas: '#F1F5F9', // Page background
            surface: '#FFFFFF', // Card/Modal surface
            border: '#CBD5E1', // Solid input/card borders
            text: '#334155', // Body text
            heading: '#0F172A', // Primary headers
            muted: '#64748B', // Subtext & captions
          },
        },
      },
      boxShadow: {
        solid: '0 2px 0 0 #0F172A',
        'solid-sm': '0 1px 0 0 #CBD5E1',
        'solid-lg': '0 4px 0 0 #0F172A',
      },
    },
  },
  plugins: [],
};

export default config;
```

### 5.3 Core UI Component Primitives
Located in `apps/web/src/components/core/`:
- **Button (`Button.tsx`):**
  - Variants: `solid-primary` (Emerald), `solid-accent` (Teal), `solid-danger` (Crimson), `solid-warning` (Amber), `solid-neutral` (Slate).
  - States: `active:translate-y-0.5 active:scale-[0.99]`, accessible focus ring (`focus:ring-2 focus:ring-clinical-emerald focus:ring-offset-2`).
- **Input (`Input.tsx`):**
  - Solid 1px border (`border-clinical-slate-border`), opaque white fill, bold placeholder, focus border (`border-clinical-emerald`).
- **Badge (`Badge.tsx`):**
  - Solid high-contrast badges for Schedule classes (OTC, Rx, Controlled II) and Expiry risk.
- **Modal (`Modal.tsx`) & Drawer (`Drawer.tsx`):**
  - Solid opaque background with solid high-contrast backdrop overlay (`bg-slate-900/80` without blur) and crisp keyboard escape binding.

---

## 6. Monorepo Directory Blueprint

```
pharmacy-management-system/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── filters/http-exception.filter.ts
│   │   │   │   ├── middleware/request-id.middleware.ts
│   │   │   │   └── health/health.controller.ts
│   │   │   ├── database/
│   │   │   │   ├── base.entity.ts
│   │   │   │   └── data-source.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── components/core/
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Select.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Modal.tsx
│       │   │   └── Drawer.tsx
│       │   ├── layouts/
│       │   ├── theme/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── formatters/currency.ts
│       │   ├── schemas/lk-validators.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── infra/
│   ├── docker-compose.yml
│   └── mysql/init.sql
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## 7. Step-by-Step Implementation Task Checklist

- [ ] **Task 1.1: Root Workspace Initialization**
  - Initialize root `package.json` and configure `pnpm-workspace.yaml` with `apps/*` and `packages/*`.
  - Create base `tsconfig.base.json` with strict type checking enabled.
- [ ] **Task 1.2: Infrastructure Scaffolding**
  - Author `infra/docker-compose.yml` with MySQL 8 (`utf8mb4`, `+05:30`), Redis 7, and MinIO.
  - Create `infra/mysql/init.sql` ensuring DB initialization and timezone verification.
  - Launch services with `docker compose up -d` and verify health status.
- [ ] **Task 1.3: Shared Contract Package (`packages/shared`)**
  - Implement LKR money formatting functions with test cases.
  - Implement Sri Lankan NIC, phone, and SLMC regex validation schemas with Zod.
  - Build package and verify export barrel.
- [ ] **Task 1.4: Backend Foundation (`apps/api`)**
  - Initialize NestJS 10 application with Fastify or Express adapter.
  - Implement `BaseAppEntity` with UUIDv7, `store_id`, and audit timestamps.
  - Implement `GlobalHttpExceptionFilter` and `RequestIdMiddleware`.
  - Set up TypeORM CLI configuration and migration pipeline (`synchronize: false`).
  - Configure Health module (`@nestjs/terminus`) with DB, Redis, and disk checks.
- [ ] **Task 1.5: Frontend Setup & Tailwind Design System (`apps/web`)**
  - Scaffold Vite React 18 TypeScript application.
  - Configure `tailwind.config.ts` with the solid Clinical Pharmacy palette (Zero transparency).
  - Create core UI components (`Button`, `Input`, `Select`, `Badge`, `Card`, `Modal`, `Drawer`).
  - Implement interactive Storybook or test playground page demonstrating buttons, active states, and alert banners at 375px, 768px, and 1440px.

---

## 8. Verification & Exit Criteria

1. **Docker Cluster Verification:**
   - Command: `docker compose ps` shows `pharmacy_mysql`, `pharmacy_redis`, and `pharmacy_minio` in healthy state.
   - MySQL responds to `SELECT NOW();` with the correct Asia/Colombo timestamp.
2. **Backend Health Verification:**
   - Request: `curl -s http://localhost:4000/health/readiness`
   - Response: `200 OK` with JSON payload confirming active connectivity to MySQL, Redis, and MinIO.
3. **Design System & Visual Verification:**
   - UI testing page confirms zero semi-transparent elements (`bg-opacity` or `backdrop-blur` absent).
   - Solid buttons respond to click with `active:translate-y-0.5` micro-animation and keyboard focus outlines.
   - All forms and responsive layouts render without horizontal scrollbars on mobile, tablet, and desktop screens.
