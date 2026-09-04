# kokoapi.space — Self-Hosting Catalog

A curated, **static-first catalog of self-hostable software**: searchable, filterable,
comparison-ready, and maintained as **plain Markdown in Git**. No database, no build-time
server, no analytics, no AI-generated content.

## Stack

| Concern       | Choice                                  |
| ------------- | --------------------------------------- |
| Framework     | [Astro](https://astro.build) (static)   |
| Content       | Markdown content collections + Zod schema |
| Styling       | Hand-written CSS (no framework)         |
| Client JS     | One dependency-free script for /apps/ filtering (progressive enhancement) |
| SEO           | Per-page meta, canonical, Open Graph, JSON-LD, `@astrojs/sitemap` |
| Deployment    | Docker Compose → multi-stage build → hardened nginx |

## Quick start

```sh
npm ci
npm run dev        # http://localhost:4321
npm run build      # static site -> dist/
npm run preview    # serve the build locally
npm run check      # astro check (types + content schema)
```

### Docker Compose

```sh
docker compose up -d --build   # serves https-ready static files on :8080
```

TLS is intentionally terminated by a reverse proxy in front of the container. The bundled
`nginx.conf` is hardened for static hosting: security headers (incl. a strict CSP that only
allows same-origin scripts/styles), gzip, immutable caching for hashed assets, and no
directory listing.

## Content model

All data lives in `src/content/` and is validated at build time.

### Products — `src/content/products/<slug>.md`

One file per app. The file name is the URL slug (`/apps/<slug>/`). Frontmatter fields:

| Field          | Type / values                                 | Notes                          |
| -------------- | --------------------------------------------- | ------------------------------ |
| `title`        | string                                        | Display name                   |
| `category`     | category slug                                 | Must match a category file     |
| `tagline`      | string                                        | One-sentence pitch             |
| `website`      | URL                                           |                                |
| `source/docs/demo` | URL (optional)                            |                                |
| `license`      | string                                        | SPDX-style identifier          |
| `language`     | string                                        | Primary language               |
| `arch`         | `[amd64, arm64, armv7]`                       | Supported CPU architectures    |
| `ramMb`        | int                                           | Typical baseline RAM in MB     |
| `cpu`          | `low | medium | high`                         | Typical footprint              |
| `docker`       | boolean (default `true`)                      | Official/community image       |
| `kubernetes`   | boolean (default `false`)                     | Helm charts / manifests        |
| `databases`    | `[]` string list                              | `[]` = self-contained          |
| `sso`          | boolean (default `false`)                     | OIDC / SAML / LDAP out of box  |
| `featured`     | boolean (default `false`)                     | Shows on the homepage          |
| `alternatives` | `[]` product slugs                            | Manual peer override           |
| `tags`         | `[]` string list                              | Search + tag links             |
| `updated`      | `YYYY-MM-DD`                                  | Last review date               |

Markdown body = the "About" prose on the product page.

### Categories — `src/content/categories/<slug>.md`

`title`, `emoji`, `tagline`, optional `order`, plus Markdown body for the category page.

Adding an app = adding one Markdown file. `npm run check` fails the build on any schema
mismatch or unknown category reference.

## Pages

- `/` — homepage: stats, featured picks, categories, recently reviewed
- `/apps/` — full catalog: live search + filters (category, license, database,
  architecture, language, CPU, RAM, Docker, Kubernetes, SSO), sortable, shareable URLs
- `/apps/<slug>/` — product page with specs and an auto-generated alternatives comparison
- `/categories/` and `/categories/<slug>/` — SEO-friendly taxonomy pages
- `/about/`, `/404.html`

Search/filters are **progressive enhancement**: the server renders every card, so the page
works without JavaScript; `public/catalog.js` (external, CSP-friendly) filters it client-side.

## Scripts & routing conventions

Links are written with trailing slashes (`/apps/ghost/`). `nginx.conf` resolves both
`$uri`, `$uri.html` and `$uri/index.html`. Internal links from product bodies should use
Markdown links as written; page URLs are generated from file names.

## Repository layout

```
src/
  content.config.ts     # schemas for products + categories
  content/              # the actual catalog (Markdown)
  lib/catalog.ts        # query helpers, format helpers, peer resolution
  layouts/ components/  # UI layer
  pages/                # routes
  styles/global.css     # design system (no framework)
public/
  catalog.js            # /apps/ filtering (plain JS)
  favicon.svg og.svg robots.txt
Dockerfile nginx.conf docker-compose.yml
```

## Editing guidelines

- Keep `ramMb`/`cpu` to *typical baseline* values and document any big assumptions in the
  prose.
- Reuse category slugs; inventing a new category without its Markdown file breaks the build.
- Run `npm run check` and `npm run build` before opening a pull request.
