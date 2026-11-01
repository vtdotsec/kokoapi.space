# koko tools

Free, open-source tools for PDFs, images, file conversion, checksums and text cleanup. No account or ads. Use them at **[tools.kokoapi.space](https://tools.kokoapi.space)**; browse the source at **[github.com/vtdotsec/kokoapi.space](https://github.com/vtdotsec/kokoapi.space)**.

## What is included

- **Images** (`/image/`): convert, resize, crop, compress, watermark, edit and remove metadata; create QR codes.
- **PDF** (`/pdf/`): merge, split, reorder, rotate, watermark, compress, protect, unlock, extract text and convert to/from images.
- **Convert** (`/convert/`): convert common document, image, JSON, CSV, YAML and XML formats; create and extract archives.
- **Utilities** (`/utilities/`): calculate SHA-256 checksums, identify file signatures and clean text.
- **Workflows** (`/workflows/`): practical paths for preparing photos, submitting PDFs, checking downloads and converting data, with focused guides at `/guides/`.
- **Secret Sender** (`/secret/`): share an encrypted note or file through a one-read or expiring link.
- **Repasses** ([repasses.kokoapi.space](https://repasses.kokoapi.space)): a separate browser-based tool for calculating consignment payouts from CSV.

## Privacy

PDF, image, conversion, utility and Repasses operations run in the browser; those tools do not upload the files they process. The Tools app sends no analytics events, sets no tracking cookies and saves no browser preferences. Cloudflare separately provides aggregate network traffic metrics to the site owner; its approximate visitor counts use IP addresses and may include bots. Secret Sender is different: it temporarily stores encrypted content and delivery metadata so recipients can retrieve it. Its encryption key stays in the link fragment and is not sent to the server. See the [privacy notice](https://tools.kokoapi.space/privacy/) and [`docs/privacy/tools-audit.md`](docs/privacy/tools-audit.md).

## Production stack

- **DNS and edge:** Cloudflare proxied DNS records for `tools.kokoapi.space` and `repasses.kokoapi.space`.
- **Host:** an Oracle Cloud Infrastructure (OCI) Linux VM.
- **Ingress:** Caddy on the VM handles public host routing and reverse-proxies requests to the app stack.
- **Containers:** Docker Engine and Docker Compose run the static web service, Secret Sender, Repasses and the separate first-party analytics service used by Repasses. The web container runs Nginx; Repasses and analytics are reachable only inside the Compose network.
- **Site build:** Astro generates the static site. HTML, CSS and browser-side JavaScript serve the tools; local libraries are included in the repository rather than loaded from a CDN.
- **Secret Sender:** a small Node.js service stores encrypted payloads and delivery metadata temporarily in a Docker volume. It does not use a database.
- **Repasses metrics:** a separate service stores aggregate metrics in SQLite on its own Docker volume. It is not used by Tools.
- **Deploy:** GitHub Actions checks and builds changes pushed to `main`, then connects to the OCI VM over SSH to pull the commit and rebuild the Compose services.

## Search discovery

The Tools app has no analytics scripts, beacons or pageview event collection. Use Cloudflare's separate aggregate traffic dashboard for broad delivery totals and Google Search Console for organic search queries, impressions, clicks and pages. The Search Console setup and content rules are in [`docs/SEO.md`](docs/SEO.md).

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev       # http://localhost:4321
npm run check     # Astro diagnostics
npm run build     # static output in dist/
npm run test:e2e  # production build + Playwright browser tests
node secret/test.mjs
```

Playwright requires Chromium (`npx playwright install chromium`).

## Repository map

```text
src/                         Astro pages, guides, workflows and site shell
public/_ui/                  Shared styles, UI helpers and local fonts
public/image/                Image and QR tools
public/pdf/                  PDF tools
public/convert/              File conversion tools
secret/                      Secret Sender Node service and browser UI
apps/repasses/               Separate Repasses app
apps/analytics/              Repasses-only metrics service
docker-compose.yml           Production app services and data volumes
nginx.conf                   Static routing, headers and internal proxies
.github/workflows/deploy.yml CI and OCI deployment
docs/SEO.md                  Search Console setup and SEO content rules
```
