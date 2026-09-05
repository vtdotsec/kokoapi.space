# Vendored client-side library (used only by /image/)

Copied verbatim from upstream; not part of the MIT-licensed kokoapi.space code. Served
from this same origin because the site runs a strict `script-src 'self'` CSP.

| File       | Upstream package | Version | License |
| ---------- | ---------------- | ------- | ------- |
| `fflate.js` | `fflate`         | 0.8.2   | MIT     |

Source: https://github.com/101arrowz/fflate

Used only to package multiple processed images into a ZIP. Everything else (decode,
resize, re-encode) uses the browser’s native Canvas/Blob APIs.
