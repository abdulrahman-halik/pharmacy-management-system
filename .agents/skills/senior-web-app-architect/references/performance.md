# Performance & Core Web Vitals Architecture Reference

Design frontend delivery, asset pipelines, and main-thread execution to meet or exceed Core Web Vitals at the 75th percentile (p75) of real user monitoring (RUM).

## 1. Core Web Vitals Targets & Architectural Levers

| Metric | Good Target (p75) | Primary Bottlenecks | Architectural Fixes |
| :--- | :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | **<= 2.5s** | High TTFB, render-blocking CSS/JS, unprioritized hero image, client-side fetch waterfalls | Edge caching/ISR, inline critical CSS, `fetchpriority="high"` on LCP image, eliminate lazy-loading on above-the-fold assets |
| **INP** (Interaction to Next Paint) | **<= 200ms** | Heavy hydration, long main-thread tasks (> 50ms), synchronous DOM thrashing, unthrottled third-party scripts | Islands/Server Components, yield to main thread (`scheduler.yield` / `setTimeout`), move heavy parsing to Web Workers, virtualize long lists |
| **CLS** (Cumulative Layout Shift) | **<= 0.1** | Unsized images/embeds, late-injected banners/skeletons, web font swap reflows | Explicit `width` & `height` or `aspect-ratio` on all media, `font-display: optional` or metric-matched fallback fonts (`size-adjust`) |

## 2. Critical Rendering Path & LCP Optimization

1. **TTFB Budget (< 200ms for static/cached, < 500ms for dynamic)**:
   - Serve static and semi-static documents from CDN edge nodes.
   - Deploy application servers and read replicas in regions close to users.
2. **Hero / LCP Image Rules**:
   - Never apply `loading="lazy"` or JS-driven fade-in animations to the LCP image.
   - Add `fetchpriority="high"` and `decoding="async"` to the LCP `<img>` element.
   - Serve modern formats (`AVIF`, `WebP`) with responsive `srcset` and `sizes` attributes so mobile devices do not download desktop-resolution assets.
   - If the LCP image is discovered late (e.g., CSS `background-image`), move it to an `<img>` tag or inject `<link rel="preload" as="image" href="..." fetchpriority="high">` in `<head>`.
3. **Eliminate Render-Blocking Resources**:
   - Inline critical above-the-fold CSS or keep initial CSS bundles under 15KB compressed.
   - Add `defer` or `async` to all non-critical `<script>` tags.
   - Use `<link rel="preconnect">` for critical cross-origin asset domains (max 2-4 origins).

## 3. Main-Thread Execution & INP Optimization

1. **JavaScript Bundle Budget**:
   - Target **< 100KB gzipped/brotli** for initial critical path JavaScript.
   - Enforce route-based and component-level code splitting (`import()`) for modals, rich text editors, charts, and below-the-fold interactive widgets.
2. **Yielding & Task Breakdown**:
   - Break tasks exceeding 50ms into smaller chunks. Prioritize immediate visual feedback on user interaction (e.g., toggle active state immediately, then defer heavy filtering or analytics dispatch to the next frame/idle callback).
3. **DOM Size & Virtualization**:
   - Keep total DOM nodes under **1,500** per page.
   - Virtualize any list or table exceeding 100 rows using windowed rendering.
4. **Third-Party Script Containment**:
   - Load analytics, chat widgets, and tag managers after hydration (`requestIdleCallback` or post-load trigger) or isolate them inside Web Workers (e.g., Partytown) and sandboxed iframes.

## 4. Layout Stability & CLS Prevention

- **Media & Embeds**: Always reserve exact bounding boxes for images, videos, ads, and iframes using `width`/`height` attributes or CSS `aspect-ratio`.
- **Skeletons & Dynamic Slots**: Match skeleton placeholder dimensions to the final hydrated component height. Never insert dynamic promotional bars above existing content after initial paint without reserving space in the static shell.
- **Web Fonts**: Self-host subsetted `WOFF2` fonts. Preload at most 1-2 critical heading/body font files and configure CSS fallback overrides (`ascent-override`, `descent-override`, `size-adjust`) to eliminate layout shift during font swap.