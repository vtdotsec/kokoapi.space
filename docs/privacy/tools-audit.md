# Tools privacy review

Scope: browser entry points, application scripts, vendored browser libraries, sharing server, web proxy, deployment and shared Repasses collector.

- Removed analytics scripts/styles from Tools and Secret Sender. Tools /analytics/ routes return 410, including collection and dashboard. The shared collector accepts only Repasses and deletes existing Tools aggregates at startup, with secure deletion and database compaction.
- Removed persistent theme settings. Every page starts light and the toggle switches the current page to dark. UI code only removes legacy theme/analytics localStorage keys; it does not save new preferences.
- Searched application code and vendored browser JavaScript for cookies, localStorage/sessionStorage, IndexedDB, beacons and network APIs. No other persistent visitor storage was found in Tools. PDF/image/conversion entry scripts do not upload files. PDF.js receives local file bytes and uses locally shipped workers/fonts; its network-capable library code is not itself evidence of document upload.
- Browser libraries and fonts are served locally. CSP restricts scripts and connections to the same origin; images are restricted to the same origin and data URLs. Web access logs are disabled.
- Secret Sender intentionally uploads ciphertext and readable filename/MIME/size plus expiry metadata when creating a share. The key stays in the URL fragment. IP abuse counters are held in process memory. This is a functional storage exception and is disclosed rather than described as an entirely local tool.
- Browser downloads and public-asset caches are controlled by the browser. Cloudflare and OCI networking still process technical connection details. Repository review cannot establish provider-side logging/backup retention.
- Repasses metrics remain isolated to its own host. No claim is made that the entire monorepo lacks analytics: it contains the separate Repasses collector.

Validation: scripts/check-tools-privacy.mjs checks every Tools HTML entry point, absence of analytics imports/persistent writes, light/dark behavior in a DOM stub, the blocked Tools endpoint and collector host exclusion. CI also builds both Astro applications and the collector. This is source and configuration review, not a provider-side audit or an exhaustive penetration test.