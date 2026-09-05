# Vendored client-side libraries (used only by /pdf/)

These files are copied verbatim from their upstream packages and are **not** part of the
MIT-licensed kokoapi.space code. They are served from this same origin because the site
runs a strict `script-src 'self'` CSP, so external CDNs cannot be used.

| File                         | Upstream package    | Version   | License        |
| ---------------------------- | ------------------- | --------- | -------------- |
| `pdf-lib.min.js`             | `pdf-lib`           | 1.17.1    | MIT            |
| `pdf.min.js`                 | `pdfjs-dist` (legacy build) | 3.11.174 | Apache-2.0 |
| `pdf.worker.min.js`          | `pdfjs-dist` (legacy build) | 3.11.174 | Apache-2.0 |
| `standard_fonts/`            | `pdfjs-dist`        | 3.11.174  | Apache-2.0    |
| `fflate.js`                  | `fflate`            | 0.8.2     | MIT            |

Sources:

- pdf-lib: https://github.com/Hopding/pdf-lib
- PDF.js: https://github.com/mozilla/pdf.js
- fflate: https://github.com/101arrowz/fflate

To update, download the matching files from the upstream packages and replace them here.
