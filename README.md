# kokoapi.space

kokoapi.space is a small collection of open-source web tools. Every tool runs in the
browser: documents, images, QR codes and short encrypted notes stay on the user's device
unless the tool says otherwise. There are no accounts, no telemetry, no ads and no
cookies. Source: <https://github.com/vtdotsec/kokoapi.space>.

## Tools

| Path        | Tool             | What it does |
| ----------- | ---------------- | ------------ |
| `/image/`   | Image tools      | Convert between PNG/JPEG/WebP/AVIF, resize keeping the aspect ratio, crop, rotate/flip, compress (quality slider), strip EXIF/GPS metadata, color filters, image palette, base64, favicon and social presets. |
| `/pdf/`     | PDF tools        | Merge, split, visual reorder, rotate/delete pages, page numbers, watermark, compress, protect with a password / unlock, extract text, and images ⇄ PDF. |
| `/convert/` | File converter   | Markdown → HTML/PDF, HTML → PDF, PDF → TXT, batch image conversion, JSON ⇄ CSV, JSON ⇄ YAML, XML → JSON, and ZIP / TAR / GZIP creation and extraction. |
| `/secret/`  | Secret Sender    | Share a note, password or small file (≤ 10 MB) through a link that expires after 1 hour / 24 hours / 7 days or burns after the first read. AES-GCM encryption happens in the browser and the key stays in the URL fragment (`/secret/…#key`); content is only decrypted after an explicit click and the countdown starts on that reveal. Share links are served with a `noindex` robots tag, so ephemeral pages never accumulate in search results. |
| `/qrcode/`  | QR code          | Generate QR codes for URLs, plain text, Wi-Fi networks, vCards, e-mails, SMS and phone numbers, and scan them with the camera or an uploaded image (jsQR). Camera frames never leave the device. |

The interface has dark and light themes; the choice is saved in `localStorage`. The site
is written in English.

## Stack

Everything is static-first and client-side. The only code that runs outside the browser
is the tiny Node service that stores encrypted blobs for `/secret/`.

**Front-end**

- **Astro** (static output) for the `/` home page and `/404`; TypeScript for the Astro
  components and `astro check` for validation. `@astrojs/sitemap` generates the sitemap.
- The tools under `/image/`, `/pdf/`, `/convert/` and `/qrcode/` are plain HTML/CSS/JS
  pages (no front-end framework). Astro copies `public/` into the build output as-is.
- **CSS is hand-written** (no Tailwind and no CSS framework): `public/_ui/app.css` holds
  the shared layout/header/footer, `public/_ui/theme.css` the color tokens (dark
  default, `[data-theme="light"]` override), and each tool has its own stylesheet.
- `public/_ui/ui.js` is the only shared script: theme toggle (persisted), drag & drop
  file handling with accept/size validation, and toasts.

**Libraries** (all vendored locally under each app's `vendor/`, never loaded from a CDN,
so the strict `script-src 'self'` CSP holds):

| App        | Vendor libraries |
| ---------- | ---------------- |
| `/image/`  | `fflate` (batch ZIP download); image codecs are the native Canvas/Blob APIs |
| `/pdf/`    | `pdf-lib`, `pdf.js` (+ worker), `fflate` |
| `/convert/`| `marked`, `js-yaml`, `pdf-lib`, `pdf.js` (+ worker), `fflate` |
| `/qrcode/` | `qrcode` (generator), `jsQR` (scanner) |

**Runtime / infra**

- **Nginx** serves the static build with hardened headers (CSP, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`), gzip and long-lived caching for hashed
  assets. It proxies `/secret/` to the Node service over the Compose network.
- **Secret Sender service**: plain Node (zero dependencies). It stores ciphertext + IV
  as flat files on disk (`DATA_DIR`, mounted at `/data`) and never sees keys or
  plaintext; a periodic sweep deletes expired or already-read blobs.
- **Docker / Compose**: a multi-stage `Dockerfile` builds the Astro site into the nginx
  image; the `secret` service runs with a `128m` memory limit, read-only root and
  dropped capabilities. No database, no Redis, no external services.
- **CI/CD**: `.github/workflows/deploy.yml` runs on every push to `main` — it installs
  dependencies with `npm ci`, runs `npm audit`, `npm run build` and `npm run check`,
  then SSHes into the production VM (Appleboy action) to `git pull` and
  `docker compose up -d --build`.

## Repository layout

```
.
├── .github/workflows/deploy.yml   # CI + deploy to the production VM
├── Dockerfile                     # multi-stage: Astro build → hardened nginx image
├── docker-compose.yml             # nginx site + the /secret/ node service
├── nginx.conf                     # static server, CSP, gzip, /secret/ proxy
├── src/                           # Astro site: home, 404, layouts, focused landing pages
│   ├── pages/pdf/[tool].astro     # generates /pdf/merge-pdf/, /pdf/compress-pdf/, ...
│   ├── data/toolLandings.ts       # copy, steps, FAQ and Schema data for those pages
│   ├── components/                # Header, Footer, ToolLanding
├── public/
│   ├── _ui/                       # shared CSS/JS (base, theme tokens, ui.js, landing.js)
│   ├── image/  pdf/  convert/  qrcode/   # static tool apps (+ own vendor/)
├── secret/                        # Secret Sender: node service, UI, Dockerfile
├── e2e/                           # Playwright specs, fixtures and serve helper
└── README.md
```

## Running locally

Requires Node.js ≥ 20 (Astro 7 wants ≥ 22; the CI pipeline uses Node 22).

```sh
npm ci
npm run dev          # http://localhost:4321 (home + static tools)
npm run check        # astro check (types/content)
npm run build        # static build into dist/
npm run test:e2e     # builds the site, then runs the Playwright suite
```

The Secret Sender service (only needed to exercise `/secret/` end to end):

```sh
cd secret
node server.mjs      # DATA_DIR defaults to /data — set it for local runs
node test.mjs        # API lifecycle tests (create, read, burn, expiry)
```

## Docker Compose

```sh
docker compose up -d --build
```

- `kokoapi-tools-web` — builds the site and serves it with the hardened nginx config
  on port 8080; also routes `/secret/` to the Node service. Read-only root, tmpfs for
  nginx runtime files, all capabilities dropped except `NET_BIND_SERVICE`.
- `kokoapi-tools-secret` — the ephemeral sharing service with a `128m` memory limit,
  read-only root, dropped capabilities and a named volume for the encrypted blobs at
  `/data`.

Two services on purpose, not one: the static nginx front end and the Node service have
different runtimes, security contexts and resource limits, and only the secret service
touches the encrypted-blob volume. Merging them into one container would require a
process supervisor (or dropping the per-service hardening) for no practical gain.

## Adding or editing content

- **Tool pages**: each app is a folder under `public/<tool>/` with `index.html` plus a
  `<tool>.css` / `<tool>.js`. New third-party libraries must be copied into that app's
  `vendor/` (each folder documents its licenses in `vendor/README.md`) and referenced
  with relative or site-absolute paths so the CSP (`script-src 'self'`) keeps working.
- **Focused landing pages** (`/pdf/merge-pdf`, `/pdf/compress-pdf`, …): add an entry in
  `src/data/toolLandings.ts`; the route is generated by `src/pages/<tool>/[tool].astro`.
  Each page embeds the matching `public/<tool>/` app pre-selected with
  `?tool=<name>&embed=1` — the app hides its chrome and reports its height to
  `/_ui/landing.js`. Keep each page's copy unique; do not reuse the toolbox blurbs.
- **Home page / header / footer copy**: `src/pages/index.astro`,
  `src/components/Header.astro`, `src/components/Footer.astro`. Adding a tool means a
  link in the header/footer nav and a card on the home page.
- **New route**: static apps under `public/` are served from the build automatically;
  add an explicit `location /<tool>/` block in `nginx.conf` when a tool needs a
  dedicated mapping.
- **Themes**: color tokens live in `public/_ui/theme.css` (dark default + light
  override); the toggle logic is in `public/_ui/ui.js`.
- **Nginx / deploy config**: edit `nginx.conf` and rebuild the image
  (`docker compose up -d --build`); the CI workflow deploys automatically on push to
  `main`.

## License

MIT — see [LICENSE](LICENSE). Third-party libraries under `vendor/` keep their own
licenses (documented in each `vendor/README.md`).
