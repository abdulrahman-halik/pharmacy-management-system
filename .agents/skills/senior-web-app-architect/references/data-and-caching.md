# Data Fetching & Caching Architecture Reference

Design data access and multi-layer caching so read latency is predictable, write mutations invalidate stale state deterministically, and origin databases are protected from traffic spikes.

---

## 1. Multi-Tier Caching Topology

Architect caching across four distinct layers, ensuring inner layers do not contradict outer layers:

1. **Browser Cache (Client HTTP & Memory)**:
   - Immutable Fingerprinted Assets (`/assets/app.8f9a2b.js`): `Cache-Control: public, max-age=31536000, immutable`
   - HTML Documents: `Cache-Control: public, max-age=0, must-revalidate` (allow CDN to cache via `s-maxage`, but force browser to check CDN).
   - Client In-Memory State (TanStack Query / SWR): Short `staleTime` (30s to 5m) for instant back-navigation without redundant API calls.

2. **CDN / Edge Cache**:
   - Control separately from browsers using `s-maxage` or `CDN-Cache-Control`.
   - Use `stale-while-revalidate` and `stale-if-error` to mask origin slowness and outages:
     `Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400`
   - Keep `Vary` headers minimal (`Vary: Accept-Encoding`). Never use `Vary: Cookie` or `Vary: User-Agent` on public CDN routes, as it destroys cache hit ratios.

3. **Application / Distributed Cache (Redis / Memcached / In-Memory)**:
   - Cache expensive computed views, external third-party API responses, session lookups, and rate-limit counters.
   - Always serialize using versioned and tenant-scoped keys (e.g., `v2:tenant:42:product:99`) so schema changes do not cause deserialization crashes and cross-tenant data leaks are mathematically impossible.

4. **Database Layer**:
   - Rely on covering indexes, connection pooling (PgBouncer / ProxySQL), and read replicas before adding complex application-level Redis layers for simple queries.

---

## 2. Multi-Tenant Cache Key Isolation

In multi-tenant SaaS applications, an unpartitioned cache key is a severe security vulnerability that causes cross-tenant data exposure.

### The Tenant Cache Key Rule
Every cache key for private or organization-scoped data MUST prefix the active `TenantId`:

```typescript
// ❌ DANGEROUS: Tenant A and Tenant B both fetch key 'user_list'
const cacheKey = `users:list?page=${page}`;

// ✅ SECURE: Isolated per tenant boundary
const cacheKey = `v1:tenant:${tenantId}:users:list?page=${page}`;
```

---

## 3. Cache Invalidation Strategies

### Tag-Based / Surrogate-Key Invalidation (Preferred)
- Associate cached responses or data fragments with domain tags (`Surrogate-Key` or `Cache-Tag`: `tenant-42`, `product-123`, `category-shoes`, `billing`).
- When a mutation occurs (e.g., a subscription plan upgrade), emit an invalidation event for tag `tenant-42:billing` to purge every cached page, API route, and fragment displaying billing information for that tenant.

### Event-Driven Write-Through / Invalidate-on-Mutation
- Never leave users looking at stale state after their own mutation (Read-Your-Own-Writes consistency).
- On mutation success:
  1. Invalidate server/edge cache tags synchronously or via fast queue.
  2. Update client cache optimistically or return the mutated entity directly in the mutation response payload.

### Hard TTL Ceiling
- Even with event-driven tag invalidation, always configure a finite TTL ceiling (e.g., 1 hour to 24 hours) so missed webhook events self-heal automatically.

---

## 4. Stampede (Thundering Herd) Prevention

When a high-traffic cache key expires, thousands of concurrent requests can hit the database simultaneously. Prevent stampedes using:

1. **Request Coalescing / Singleflight**: Ensure only one in-flight worker computes/fetches the missing key while concurrent requests wait on the same promise/lock.
2. **Stale-While-Revalidate (Soft TTL + Hard TTL)**: Serve slightly stale cached data immediately while a single background thread refreshes the value before the hard TTL expires.
3. **Jittered TTLs**: Add random jitter (`TTL = base_ttl + random(0, 0.15 * base_ttl)`) when batch-populating keys so thousands of items do not expire at the exact same millisecond.

---

## 5. Data Fetching Patterns & N+1 Prevention

- **Parallelize Independent Queries**: Use `Promise.all` (or language equivalent) for independent queries within a request handler. Sequential `await` statements on unrelated queries sum their network latencies unnecessarily.
- **Batching & DataLoader Pattern**: When resolving nested relations or component-level queries, batch individual ID lookups within the same event-loop tick into a single `WHERE id IN (...)` query.
- **Cursor over Offset Pagination**: For tables exceeding 50,000 rows or infinite feeds, enforce keyset/cursor pagination (`WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT 25`). `OFFSET 100000` forces the database to scan and discard 100,000 rows on every request.
- **Explicit Column Selection**: Select only required columns (`SELECT id, title, slug`) rather than `SELECT *`, especially when tables contain large `TEXT` or `JSONB` columns.