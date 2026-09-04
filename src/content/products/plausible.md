---
title: Plausible Analytics
category: analytics
tagline: Simple, privacy-friendly and open-source web analytics with no cookies.
website: https://plausible.io
source: https://github.com/plausible/analytics
docs: https://plausible.io/docs/
license: AGPL-3.0
language: Elixir
arch: [amd64, arm64]
ramMb: 1536
cpu: medium
docker: true
kubernetes: false
databases: [ClickHouse]
sso: false
featured: false
alternatives: [umami, matomo]
tags: [analytics, privacy, cookieless, elixir]
updated: 2026-06-30
---

Plausible is a cookieless analytics service built to be GDPR-friendly by default — no
consent dialogs required for most sites. The dashboard is deliberately minimal: today's
visitors, top pages, referrers, countries and a few more essential numbers.

Behind the simple UI is a serious stack: an Elixir/Phoenix application collecting data
into a ClickHouse database, which gives excellent query performance but is the main reason
Plausible is heavier than other options.

The community edition is free and AGPL-licensed and is deployed with its own Docker
Compose file. Budget roughly 1.5 GB of RAM; in exchange you get fast, low-latency
analytics for high-traffic sites.
