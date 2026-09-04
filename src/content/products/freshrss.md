---
title: FreshRSS
category: rss
tagline: A self-hosted feed reader with extensions, web scraping and Google Reader roots.
website: https://freshrss.org
source: https://github.com/FreshRSS/FreshRSS
docs: https://freshrss.github.io/FreshRSS/en/
license: AGPL-3.0
language: PHP
arch: [amd64, arm64]
ramMb: 300
cpu: low
docker: true
kubernetes: false
databases: [MySQL, MariaDB, PostgreSQL, SQLite]
sso: false
featured: false
alternatives: [miniflux, ttrss]
tags: [rss, feeds, reader, php]
updated: 2026-07-12
---

FreshRSS is a mature, feature-rich feed reader with a long history and a large extension
ecosystem. It supports many database backends and works with both its own web interface and
dozens of compatible mobile apps via the Fever or Google Reader APIs.

Extensions can add web scraping for sites without feeds, custom CSS, OPML import tweaks
and more. Rules let you filter, tag and forward articles automatically.

Because it is PHP with optional SQLite, it runs on very small hardware or even shared
hosting — though a real database backend scales better for heavy feed loads.
