# Production Validation Drills & Pre-Launch Audit Reference

Execute these production drills and verification checks before shipping a new application or signing off on an AI-generated codebase.

## 1. The 7 Production Failure Drills

Run through these scenarios against your architecture before deployment:

### Drill 1: The Cross-User Cache Poisoning Test

- **Scenario**: User A logs in and visits `/dashboard` or `/account`, then User B requests the same URL from a different device via the same CDN edge node.
- **Verification**:
  - Inspect response headers on every route that reads `Cookie` or `Authorization`.
  - Confirm `Cache-Control: private, no-store, no-cache, must-revalidate` is emitted whenever personalized data is rendered.
  - Ensure global/singleton variables on the server never store request-scoped user state.

### Drill 2: The Double-Click / Retry Idempotency Drill

- **Scenario**: A user on a flaky mobile connection double-clicks "Pay Now" or "Create Order", or the client retries a timed-out `POST` request.
- **Verification**:
  - Require an `Idempotency-Key` header or client-generated UUID on all state-mutating / billing endpoints.
  - Enforce unique database constraints (`UNIQUE (tenant_id, idempotency_key)`) and atomic transactions (`SELECT ... FOR UPDATE` or optimistic concurrency version checks) so duplicate requests return the cached first result instead of double-charging.

### Drill 3: The Slow/Dead Downstream Dependency Drill

- **Scenario**: A third-party payment, email, or AI API hangs for 60 seconds or returns `503`.
- **Verification**:
  - Every outbound `fetch`/HTTP client and database query has an explicit `AbortSignal.timeout(ms)` (typically 3,000ms to 10,000ms).
  - Non-critical side effects (sending welcome emails, syncing CRM, analytics webhooks) are offloaded to an asynchronous background queue with exponential backoff + jitter and a Dead Letter Queue (DLQ), never blocking the synchronous user HTTP response.

### Drill 4: The Unbounded Dataset & Traffic Spike Drill

- **Scenario**: A tenant accumulates 250,000 records, or a link goes viral on social media.
- **Verification**:
  - Every list endpoint enforces a hard maximum page size (`Math.min(requestedLimit, 100)`).
  - All foreign keys and `WHERE` / `ORDER BY` columns have verified composite database indexes (`EXPLAIN ANALYZE`).
  - Database connections pass through a connection pooler with bounded pool limits to prevent `FATAL: sorry, too many clients already`.

### Drill 5: The Zero-Downtime Database Migration Drill

- **Scenario**: A new release renames or drops a database column while old application containers are still serving active requests during rolling deployment.
- **Verification**:
  - Enforce **Expand-and-Contract** migrations:
    1. *Expand*: Add nullable new column / table; deploy code that writes to both old and new columns.
    2. *Backfill*: Migrate historical rows in batched background jobs.
    3. *Switch*: Update reads to use the new column.
    4. *Contract*: Remove old column references in code first, then drop the column in a subsequent migration.

### Drill 6: The Secret & PII Exposure Audit

- **Scenario**: Inspect the browser DevTools Network tab, page source (`View Source`), and serialized SSR state (`__NEXT_DATA__`, RSC payload, `__NUXT__`).
- **Verification**:
  - Zero private API keys or internal URLs appear in client JS bundles.
  - Serialized user objects do not include password hashes, internal role flags, other users' emails, or raw database rows.
  - Error responses in production return generic messages + a correlation `requestId`, never raw stack traces or SQL query errors.

### Drill 7: Cold-Start & Graceful Shutdown Drill

- **Scenario**: A container receives `SIGTERM` during autoscaling down or deployment.
- **Verification**:
  - Health check endpoint (`/healthz` or `/api/health`) immediately returns `503` on `SIGTERM` so the load balancer stops routing new traffic.
  - Server stops accepting new connections, waits for in-flight HTTP requests and active DB transactions to finish (up to a 15-30s grace timeout), closes DB pools cleanly, and exits with code `0`.

## 2. Observability & Operations Baseline

Before declaring a system production-ready, verify:

1. **Structured JSON Logging**: Every log entry includes `timestamp`, `level`, `requestId` / `traceId`, `userId` (if authenticated), `route`, `durationMs`, and `status`. Never log raw passwords, session tokens, or credit card numbers.
2. **Error Tracking & Source Maps**: Unhandled client error boundaries and server exceptions report to an error tracker with uploaded private source maps (deleted from public static hosting after upload).
3. **Health Checks**: Separate liveness (`/health/live` - process is running) from readiness (`/health/ready` - DB and critical caches are reachable).