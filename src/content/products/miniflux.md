---
title: Miniflux
category: rss
tagline: A minimalist, opinionated RSS reader in a single Go binary.
website: https://miniflux.app
source: https://github.com/miniflux/v2
docs: https://miniflux.app/docs/
license: Apache-2.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 80
cpu: low
docker: true
kubernetes: false
databases: [PostgreSQL]
sso: false
featured: true
alternatives: [freshrss, ttrss]
tags: [rss, feeds, reader, go]
updated: 2026-08-18
---

Miniflux is a reader for people who want RSS to just work: fast, keyboard-driven, with a
clean uncluttered interface and no JavaScript-heavy surprises. It fetches feeds on your
server, so read state stays in sync across all your devices.

Beyond the basics it offers rules-based automation (mark as read, tag, or ignore based on
content), scraping rules, read-later integration, and filters to tame noisy feeds.
Themes and a well-documented API are included.

A single static binary and a PostgreSQL database keep the footprint tiny — typically under
100 MB of RAM — making it an easy addition to any server or Raspberry Pi.
