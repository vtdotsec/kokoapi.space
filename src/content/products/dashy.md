---
title: Dashy
category: dashboard
tagline: A feature-rich startpage with sections, theming, status checks and per-user auth.
website: https://dashy.to
source: https://github.com/Lissy93/dashy
docs: https://dashy.to/docs/
license: MIT
language: Node.js
arch: [amd64, arm64, armv7]
ramMb: 300
cpu: medium
docker: true
kubernetes: false
databases: []
sso: true
featured: false
alternatives: [homepage, homer]
tags: [dashboard, startpage, monitoring, widgets]
updated: 2026-05-30
---

Dashy is one of the most configurable self-hosted startpages. Services are organized in
sections, each with icons, tags, custom status indicators and live health checks, and the
whole UI can be restyled through an extensive theming system.

Beyond links it offers user authentication with optional SSO/OIDC and LDAP, multiple user
views, workspaces for quick app switching, and even a cloud-synced config editor.

Its configuration lives in a single `conf.yml`, which can be edited through the UI and
exported for backup. It is heavier than minimal dashboards but stays well under 1 GB.
