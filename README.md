# kokoapi.space

kokoapi.space is a set of open-source web tools. Every tool runs in the browser: files,
images, QR codes and short encrypted notes stay on the user's device unless a tool says
otherwise. There are no accounts, no telemetry, no ads and no cookies. Source:
https://github.com/vtdotsec/kokoapi.space

## Tools

| Path       | Tool             | What it does                                                                                          |
| ---------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `/image/`  | Image tools      | Convert (PNG/JPEG/WebP/AVIF), resize with aspect ratio, interactive crop, rotate/flip, compress, strip EXIF/GPS metadata, color filters, batch processing. |
| `/pdf/`    | PDF tools        | Merge, split, visual reorder, rotate/delete pages, page numbers, watermark, compress, protect/unlock, extract text, images ⇄ PDF. |
| `/convert/`| File converter   | Markdown → HTML/PDF, HTML → PDF, PDF → TXT, image conversions, JSON ⇄ CSV, JSON ⇄ YAML, XML → JSON, ZIP/TAR/GZIP create & extract. |
| `/secret/` | Secret Sender    | Share a note, password or small file (≤10 MB) with a link that expires after 1 hour/24h/7 days or burns after one read. AES-GCM encrypted in the browser; the key stays in the URL fragment (`#key`); content is only revealed after an explicit click and the expiry clock starts at that reveal. |
| `/qrcode/` | QR toolkit       | Generate QR codes (URL, text, Wi-Fi, vCard, e-mail, SMS, phone) and scan with the camera or an uploaded image (jsQR). Camera frames never leave the device. |

The site also serves dark/light themes (persisted in `localStorage`) and an EN/PT-BR
language switch that translates the interface labels.

## Architecture

Everything is static-first and client-side:

- Processing happens with the browser's Canvas/Blob APIs, `pdf-lib`, `pdf.js`, `fflate`,
  `marked`, `js-yaml`, `qrcode-generator` and `jsQR`.
- All third-party libraries are vendored locally under each app's `vendor/` folder
  (`/image/vendor`, `/pdf/vendor`, `/convert/vendor`, `/qrcode/vendor`) to satisfy the
  strict `script-src 'self'` CSP. No CDN calls at runtime.
- Shared UI (`/_ui/app.css`, `/_ui/theme.css`, `/_ui/ui.js`, `/_ui/i18n-pages.js`)
  provides the identical header, footer, container width, theme toggle and language
  toggle across every page.
- The only server-side component is the tiny Node service behind `/secret/`, which stores
  ciphertext + IV as flat files and never sees keys or plaintext. It has no database, no
  logging of content and runs a periodic sweep that deletes expired/read blobs.
- No processing backend: the nginx container only serves static files and proxies
  `/secret/` to the Node service. Zero cookies, zero analytics.

## Repository layout

```
.
├── nginx.conf / docker-compose.yml   # static nginx + the /secret/ node service
├── src/                              # Astro site: the / front page and /404
├── public/
│   ├── _ui/                          # shared header/theme/i18n assets
│   ├── image/  pdf/  convert/  qrcode/   # static tool apps (+ local vendor/)
├── secret/                           # Secret Sender node service + its public UI
└── README.md
```

## Running locally

```sh
npm ci
npm run dev         # front page + static apps at http://localhost:4321
npm run check       # astro check
npm run build       # builds the site into dist/
```

The secret service (not needed for the static tools):

```sh
cd secret && node server.mjs          # DATA_DIR defaults to /data
```

## Docker Compose

```sh
docker compose up -d --build
```

- `catalog` builds the Astro site and serves it with the hardened nginx config (CSP,
  gzip, caching) on port 8080; it also maps `/secret/` to the node service.
- `secret` runs the ephemeral sharing service with a `128m` memory limit, read-only
  root, dropped capabilities and a volume for encrypted blobs at `/data`.

## Adding or editing content

- Tool UI: static HTML/CSS/JS under `public/<tool>/`; copy new libraries into that
  tool's `vendor/` and keep the CSP in mind.
- Translations: page labels live in `public/_ui/i18n-pages.js` (shared keys) plus
  `data-i18n` attributes on the HTML elements they translate. Add the EN and PT-BR
  values for every new key.
- Themes: tokens in `public/_ui/theme.css` (default dark, `[data-theme="light"]`
  override). `ui.js` persists the choice in `localStorage`.

## License

MIT — see LICENSE. Third-party libraries under `vendor/` keep their own licenses
(documented in each `vendor/README.md`).
