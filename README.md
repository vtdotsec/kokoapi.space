# kokoapi.space

**Live tools:** https://tools.kokoapi.space
**Source:** https://github.com/vtdotsec/kokoapi.space

A small, free, open-source suite for working with PDFs, images and common file formats. No account is required and the site does not use analytics or advertising.

## Tools

| Path | Workspace | What it does |
| --- | --- | --- |
| `/image/` | Image tools | Convert, compress, resize, crop, watermark and filter images; remove EXIF/GPS metadata; generate QR codes. |
| `/pdf/` | PDF tools | Merge, split, reorder, rotate, add page numbers or watermarks, compress, protect/unlock, extract text and convert images to/from PDF. |
| `/convert/` | File converter | Convert Markdown/HTML/PDF, images, JSON/CSV/YAML/XML; create and extract ZIP, TAR and GZIP archives. |
| `/secret/` | Secret Sender | Share a note or file up to 10 MB through an expiring or one-read link. The browser encrypts content with AES-GCM; the server temporarily stores ciphertext. The key stays in the URL fragment. |
| `https://repasses.kokoapi.space` | Repasses | Calculate consignor commissions and payouts from a CSV; review invalid rows and possible duplicates; export consolidated and per-supplier reports. CSV processing stays in the browser. |

PDF, image and conversion work runs locally in the browser. Secret Sender is the exception: the service stores encrypted content until it is read or expires. Reader links are returned with `noindex, nofollow` so private tokens are not indexed.

## Design and accessibility

The site uses a self-hosted Newsreader and IBM Plex type system, a shared color and spacing system across all workspaces, visible keyboard focus, reduced-motion support and responsive layouts. It makes no third-party font or analytics requests.

## Stack and hosting

- Astro generates the site shell and static 404 page. The tool workspaces are small HTML/CSS/JavaScript applications under `public/`.
- `public/_ui/` contains the shared app shell, theme toggle, self-hosted fonts, tokens, and common interaction helpers.
- PDF and conversion tools use locally vendored libraries; image operations use browser APIs. No application code is loaded from a CDN.
- Secret Sender is a dependency-free Node service. It stores ciphertext in flat files under `DATA_DIR`, with expiry/read-once cleanup; there is no database or Redis.
- Nginx serves static assets, applies security headers and gzip, and proxies `/secret/` to the Node service.
- Docker Compose runs the static web app, Secret Sender and Repasses in separate containers. The web Nginx routes `repasses.kokoapi.space` to the Repasses service over the private Compose network.
- GitHub Actions runs dependency installation, audit, build and Astro checks on pushes to `main`, then deploys to the OCI VM over SSH.

## SEO and routes

Astro generates the canonical homepage, 404 response and sitemap. The four tool entry points are included as sitemap custom pages because they live under `public/`. Client-side operation URLs such as `/pdf/merge` load their workspace shell; the tool script updates the active panel, heading and browser title. Their canonical remains the workspace entry point, so these state URLs are not listed as separate pages. The Secret Sender applies `noindex, nofollow` to individual token links.

`robots.txt` allows public pages and points crawlers to the generated sitemap index. The legacy apex domain redirects to `https://tools.kokoapi.space/`.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev       # http://localhost:4321
npm run check     # Astro diagnostics
npm run build     # static output in dist/
npm run test      # Astro diagnostics + production build
npm run test:e2e  # production build + Playwright suite
node secret/test.mjs # Secret Sender API lifecycle tests
```

Playwright needs its Chromium browser installed (`npx playwright install chromium`). The E2E suite covers image conversion, PDF operations, file conversion, QR generation, theme behavior and Secret Sender flows.

## Deployment

The workflow expects repository secrets `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, and `DEPLOY_PATH`; `DEPLOY_PORT` is optional. It fetches the latest `main` commit on the VM and rebuilds all Compose services, including Repasses. Caddy on the VM routes `repasses.kokoapi.space` to the suite Nginx, which forwards to the private Repasses container. DNS must contain a proxied `A` record named `repasses` pointing to the VM's public IP.

## Repository layout

```text
.github/workflows/deploy.yml   CI and production deployment
src/                           Astro homepage and 404
public/_ui/                    Shared UI shell, styles, theme and local fonts
public/image/                  Image and QR workspace
public/pdf/                    PDF workspace
public/convert/                File conversion workspace
secret/                        Secret Sender service and browser UI
e2e/                           Playwright browser tests
nginx.conf                     Static routing, headers and app proxy
Dockerfile                     Static site image
docker-compose.yml             Web, Secret Sender and Repasses services
```
