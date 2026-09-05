# Vendored client-side libraries (used only by /convert/)

These files are copied verbatim from their upstream packages and are **not** part of the
MIT-licensed kokoapi.space code. They are served from this same origin because the site
runs a strict `script-src 'self'` CSP, so external CDNs cannot be used.

| File                    | Upstream package           | Version   | License     |
| ----------------------- | -------------------------- | --------- | ----------- |
| `pdf-lib.min.js`        | `pdf-lib`                  | 1.17.1    | MIT         |
| `pdf.min.js`            | `pdfjs-dist` (legacy build) | 3.11.174 | Apache-2.0  |
| `pdf.worker.min.js`     | `pdfjs-dist` (legacy build) | 3.11.174 | Apache-2.0  |
| `fflate.js`             | `fflate` (UMD build)       | 0.8.2     | MIT         |
| `marked.umd.js`         | `marked` (UMD build)       | 4.3.0     | MIT         |
| `js-yaml.min.js`        | `js-yaml`                  | 4.1.0     | MIT         |

Sources:

- pdf-lib: https://github.com/Hopding/pdf-lib
- PDF.js: https://github.com/mozilla/pdf.js
- fflate: https://github.com/101arrowz/fflate
- marked: https://github.com/markedjs/marked
- js-yaml: https://github.com/nodeca/js-yaml

Notes:

- The vendored `fflate` UMD build (0.8.2) exposes `zipSync` / `unzipSync` /
  `gzipSync` / `gunzipSync`, but **not** `tarSync` / `untarSync`. TAR (ustar)
  create and extract are therefore implemented by a small reader/writer inside
  `convert.js`.
- Only `pdf.min.js` + `pdf.worker.min.js` are vendored from PDF.js; the PDF → TXT
  tool extracts text only, so no `standard_fonts` data files are needed.
- Only the dist/UMD files listed above are copied; nothing else from the packages
  is used or served.

To update, download the matching files from the upstream packages and replace them here.
