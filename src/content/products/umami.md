---
title: Umami
category: analytics
tagline: A privacy-first, cookieless website analytics tool with a friendly dashboard.
website: https://umami.is
source: https://github.com/umami-software/umami
docs: https://umami.is/docs/
license: MIT
language: TypeScript
arch: [amd64, arm64]
ramMb: 400
cpu: low
docker: true
kubernetes: false
databases: [PostgreSQL, MySQL]
sso: false
featured: true
alternatives: [plausible, matomo]
tags: [analytics, privacy, visitors, realtime]
updated: 2026-08-19
---

Umami gives you the analytics people actually want from Google Analytics — page views,
referrers, devices, countries, realtime visitors — without the cookie banners and without
sending visitor data anywhere.

A single, lightweight JavaScript snippet is all you add to your site; data is aggregated
server-side and is not shared with third parties. Multi-site support and role-based team
access make it useful beyond one blog.

It stores data in PostgreSQL or MySQL and provides a clean, fast dashboard that owners and
clients actually enjoy opening.
