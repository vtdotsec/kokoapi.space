---
title: Hoarder
category: bookmarks
tagline: A read-later and bookmarking app for links, notes and PDFs with AI tagging.
website: https://hoarder.app
source: https://github.com/hoarder-app/hoarder
docs: https://docs.hoarder.app
license: AGPL-3.0
language: TypeScript
arch: [amd64]
ramMb: 1024
cpu: medium
docker: true
kubernetes: false
databases: [PostgreSQL, Redis]
sso: false
featured: false
alternatives: [linkding]
tags: [bookmarks, read-later, pdf, tags]
updated: 2026-08-01
---

Hoarder is a read-later tool for the modern web: save links, notes, images and PDFs from a
browser extension, mobile share sheet or the API, then come back to them in a clean,
tagged feed.

Beyond saving, it extracts the full content of each link for offline reading and can
optionally run local models to auto-tag and summarize what you collect — entirely on your
own machine if you point it at a local inference server.

It requires PostgreSQL and Redis and uses a heavier Node/React stack than minimal bookmark
managers, but the polished web, mobile and extension experience is the trade-off.
