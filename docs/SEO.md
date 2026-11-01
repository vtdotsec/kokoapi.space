# Search discovery

Tools is a static Astro site with client-side PDF, image and conversion workspaces. Keep search pages useful without adding visitor tracking.

## Current approach

- The site and tool interface are in English. Keep one consistent language per page. Check Search Console country and query data before investing in a second language; if Brazilian Portuguese becomes a priority, localize the full task page and its tool interface rather than publishing a translated teaser that leads to an English-only workflow.
- Astro generates the sitemap index. The static workspaces under `public/` are explicitly added in `astro.config.mjs`; Astro pages, including `/workflows/` and `/guides/*/`, are included from their routes.
- Operation URLs such as `/pdf/merge/` activate a panel in a client-side workspace and canonicalize to that workspace. The separate `/guides/*/` pages provide indexable, task-focused instructions with unique titles, descriptions, canonical URLs and direct links into the tool.
- Do not add tracking pixels, analytics beacons, user IDs or search-term tracking to Tools. Cloudflare provides separate, aggregate zone traffic metrics; Search Console reports aggregated search impressions, clicks, queries and pages without installing a browser analytics script.

## Search Console setup

1. Add or verify a **URL-prefix property** for `https://tools.kokoapi.space/`. If the parent `kokoapi.space` domain is already verified in Cloudflare DNS, a Domain property can also cover subdomains; use the URL-prefix property when you want a clear Tools-only report.
2. Submit `https://tools.kokoapi.space/sitemap-index.xml` in the Sitemaps report.
3. Inspect the homepage, `/workflows/`, each `/guides/*/` page and the three `/files/` and `/text/` utility pages. Check that Google sees the expected canonical and rendered text.
4. Review Search results by query, page, country and device. Compare impressions, clicks and CTR over a meaningful period before changing titles or expanding content. Use actual query data to decide whether to translate for Brazil or develop additional guides.
5. Recheck the sitemap after releases and review Core Web Vitals in Search Console. Request indexing for a small number of genuinely new or substantially updated pages; sitemap submission does not guarantee indexing.

## Editorial rules

- Build a page only when it answers a distinct task. State accepted formats, limits, steps, likely failure cases and what happens to the user's file.
- Use concise titles and unique descriptions that agree with the page heading and visible content. Avoid keyword lists and repeated boilerplate.
- Keep static HTML content and links available before client-side scripts run. Keep app operations usable without a third-party CDN.
- Keep canonical URLs, sitemap entries and internal links consistent. Do not submit Secret Sender token URLs, analytics administration routes or error pages for indexing.
- Use structured data only for facts visible on the page. Do not invent reviews or ratings; structured data does not guarantee a rich result or higher rankings.

## Initial topic set

The current guides cover common intent clusters: merge/compress/split PDFs, remove photo metadata before sharing, convert JSON records to CSV, and compare a downloaded file's signature and SHA-256 checksum. Treat these as a starting set, then use Search Console queries and Cloudflare's aggregated traffic totals to choose what to maintain next.
