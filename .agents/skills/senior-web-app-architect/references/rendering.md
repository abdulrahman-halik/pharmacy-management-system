# Rendering Architecture Reference

Choose rendering strategies per route or component boundary based on data freshness, personalization, SEO requirements, and compute cost.

## 1. Route-Level Decision Matrix

| Route Profile | SEO Needed | Personalization | Data Freshness | Recommended Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Marketing, Docs, Legal | High | None | Build-time / Rare | **SSG (Static Site Generation)** |
| Product Catalog, Articles, Directory | High | Low (Geo/Currency) | Seconds to Minutes | **ISR / Edge SWR (`stale-while-revalidate`)** |
| E-Commerce Product Page + Cart/User Header | High | Mixed (Public body, Private nav) | Real-time stock/user | **Hybrid / Streaming / Islands (Static Shell + Dynamic Slots)** |
| Social Feed, Search Results | Medium/High | High | Real-time | **SSR with Streaming** |
| B2B SaaS Dashboard, Admin Portal, Canvas App | None | High (Per-user) | Real-time | **CSR SPA or App Shell + Client Fetching** |

## 2. Rendering Patterns & Trade-Offs

### Static Site Generation (SSG)

- **Mechanism**: HTML is generated at build time and served directly from CDN edge nodes.
- **Pros**: Lowest TTFB (< 50ms), zero origin compute per request, maximum availability even if origin DB is down.
- **Cons**: Build times scale linearly with page count (`O(N)`). Content updates require a rebuild.
- **Rule**: Use SSG for pages under 5,000 routes where data changes less frequently than deployments.

### Incremental Static Regeneration (ISR) / Stale-While-Revalidate (SWR)

- **Mechanism**: Pages are generated on-demand or at build time, cached at the CDN/server layer, and regenerated asynchronously in the background after a TTL expires or via on-demand webhook purge.
- **HTTP Equivalent**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=86400`
- **Pros**: Near-SSG speed (`O(1)` build time) with fresh content for large catalogs (10k to 10M+ pages).
- **Cons**: First visitor to an uncached route experiences cold-start SSR latency; stale data is served briefly during background revalidation.
- **Rule**: Pair time-based revalidation with on-demand event/webhook revalidation (e.g., CMS publish or inventory update) so critical edits reflect immediately.

### Server-Side Rendering (SSR) with Streaming

- **Mechanism**: HTML is generated per request on the server. Using HTTP chunked transfer encoding, the server flushes the static document shell (`<head>`, layout, navigation) immediately and streams slow data dependencies in parallel as they resolve.
- **Pros**: Always fresh, supports per-request authentication/personalization, avoids blocking TTFB on the slowest backend query.
- **Cons**: Higher server compute cost, requires connection pooling and resilient backend databases, cannot set HTTP status codes (`404`, `500`) after the initial shell flush has started.
- **Rule**: Resolve critical route existence and auth checks *before* flushing the initial HTTP headers so accurate `404`/`401`/`403` status codes are returned. Stream secondary widgets (recommendations, comments, analytics) after the initial flush.

### Islands Architecture & Partial Prerendering

- **Mechanism**: The page defaults to zero-JavaScript static HTML rendered on the server. Interactive components ("islands") are isolated and hydrated independently on the client (on load, on idle, or when scrolled into viewport).
- **Pros**: Eliminates full-page hydration overhead, drastically improving Interaction to Next Paint (INP) and Total Blocking Time (TBT).
- **Rule**: Keep interactive state pushed down to the leaves of the component tree. Never wrap an entire page layout in a client-side state provider if only a child widget requires interactivity.

### Client-Side Rendering (CSR)

- **Mechanism**: Server sends a minimal HTML shell and JavaScript bundle; browser fetches data via APIs and renders UI locally.
- **Pros**: Rich, immediate stateful transitions after initial load; offloads rendering compute to client devices; clean separation between static frontend hosting and backend APIs.
- **Cons**: Poor initial LCP due to network waterfall (HTML -> JS -> API -> Render), unreliable for non-JS social crawlers and secondary search engines.
- **Rule**: Use CSR for authenticated behind-login tools, heavy canvas/editor apps, or offline-first PWAs where SEO is irrelevant.

## 3. Anti-Patterns to Prevent

1. **Sequential Server-Client Waterfalls**: Rendering a page via SSR, hydrating the client, and immediately firing a `useEffect`/`onMounted` fetch for data that was already known at request time. Fetch initial route data on the server or prefetch in parallel inside the route loader.
2. **Accidental Dynamic Bailout**: Reading request-specific headers, cookies, or search parameters inside a shared root layout, forcing the entire application out of static/cached rendering into per-request SSR.
3. **Hydration Mismatches**: Rendering output dependent on `Date.now()`, `Math.random()`, `window`, or user timezone/locale during initial SSR without synchronizing state or deferring to post-mount rendering.
4. **Over-Serializing Props**: Passing megabytes of JSON state into the inline SSR hydration payload (`__NEXT_DATA__`, `__NUXT__`, etc.), which doubles payload size (once in HTML, once in inline script) and blocks main-thread parsing. Only serialize fields strictly consumed by client components.