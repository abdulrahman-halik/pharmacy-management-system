# Technical SEO & Discoverability Reference

Architect public-facing web applications so search engines, social graph parsers, and AI crawlers index content accurately without wasting crawl budget.

## 1. Crawlability & Rendering Architecture

- **Initial HTML Completeness**: Serve primary content, `<title>`, meta descriptions, canonical links, and primary internal `<a href="...">` navigation in the initial server-rendered HTML payload. Do not rely on client-side JavaScript execution for critical metadata or link discovery.
- **Accurate HTTP Status Codes**:
  - Return true `404 Not Found` or `410 Gone` HTTP status codes for missing entities. Never return `200 OK` with a client-rendered "Not Found" UI ("Soft 404").
  - Use `301 Moved Permanently` (or `308 Permanent Redirect`) for permanent slug changes; avoid redirect chains (`A -> B -> C`).
- **Streaming & Bot Handling**: If using SSR Streaming, ensure `<head>` metadata (`title`, `canonical`, `meta robots`, `og:*`) is resolved and flushed in the initial chunk before streaming body Suspense boundaries.

## 2. Canonicalization & URL Hygiene

Duplicate content splits ranking signals and drains crawl budget. Enforce strict URL canonicalization:

- Every indexable page must emit a self-referencing `<link rel="canonical" href="https://example.com/clean-path" />` using absolute HTTPS URLs.
- Enforce consistent trailing-slash and lowercase URL policies via `301` redirects.
- Strip tracking and filter parameters (`utm_*`, `fbclid`, `sort=price_asc`) from the canonical URL.
- For faceted search / filter pages, block combinatorial parameter explosions in `robots.txt` or apply `<meta name="robots" content="noindex, follow" />` unless a specific filter combination represents a curated landing page with search demand.

## 3. Metadata & Social Graph (`<head>`) Checklist

Every public route must dynamically generate:

1. **`<title>`**: Unique, 50-60 characters, primary keyword front-loaded (`Product Name - Category | Brand`).
2. **`<meta name="description">`**: Actionable summary, 120-155 characters.
3. **OpenGraph & Social Cards**:
   - `og:title`, `og:description`, `og:url` (matching canonical), `og:type` (`website`, `article`, `product`).
   - `og:image`: Absolute URL, 1200x630px (`1.91:1` aspect ratio), `< 500KB`, accompanied by `og:image:width`, `og:image:height`, and `og:image:alt`.
   - `twitter:card`: `summary_large_image`.

## 4. Structured Data (JSON-LD)

Embed schema.org `<script type="application/ld+json">` blocks in the server-rendered HTML to unlock rich results:

- **E-Commerce**: `Product` with nested `Offer` (`price`, `priceCurrency`, `availability`) and `AggregateRating`.
- **Publishing / Blogs**: `Article` or `NewsArticle` with `author`, `datePublished`, `dateModified`, and `headline`.
- **Hierarchy**: `BreadcrumbList` on all nested routes.
- **SaaS / Corporate**: `Organization`, `WebSite`, and `SoftwareApplication`.
- **Rule**: Validate that every field in JSON-LD matches visible page content; never inject fake ratings or hidden schema properties.

## 5. Sitemaps, Robots & Internationalization (i18n)

- **`robots.txt`**: Allow crawling of static JS/CSS assets so search engines can render layout properly. Disallow `/api/`, `/admin/`, `/checkout/`, and internal search result URLs. Point to the sitemap index (`Sitemap: https://example.com/sitemap.xml`).
- **XML Sitemaps**: Shard sitemaps at 50,000 URLs max per file using a `<sitemapindex>`. Only include `200 OK`, canonical, indexable URLs with accurate `<lastmod>` timestamps.
- **Internationalization (`hreflang`)**: Use dedicated locale paths (`/en/`, `/de/`) or domains - never rely on cookies or `Accept-Language` headers to change content on the same URL. Include bidirectional `rel="alternate" hreflang="x"` links plus an `x-default` fallback.