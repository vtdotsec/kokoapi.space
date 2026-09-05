# Vendored client-side libraries (used only by /qrcode/)

Copied verbatim from upstream; not part of the MIT-licensed kokoapi.space code. Served
from this same origin because the site runs a strict `script-src 'self'` CSP.

| File      | Upstream package      | Version | License |
| --------- | --------------------- | ------- | ------- |
| `qrcode.js` | `qrcode-generator`    | 1.4.4   | MIT     |
| `jsQR.js` | `jsqr`                | 1.4.0   | Apache-2.0 |

Sources:
- https://github.com/kazuhikoarase/qrcode-generator
- https://github.com/cozmo/jsQR

`qrcode.js` is used for generation; `jsQR` decodes frames from the camera or from an
uploaded image. Neither file nor camera frame ever leaves the browser.
