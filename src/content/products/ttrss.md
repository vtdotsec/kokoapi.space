---
title: Tiny Tiny RSS
category: rss
tagline: A flexible, community-driven RSS reader with plugins and a plugin API.
website: https://tt-rss.org
source: https://gitlab.tt-rss.org/tt-rss/tt-rss
docs: https://tt-rss.org/wiki/
license: GPL-2.0
language: PHP
arch: [amd64]
ramMb: 300
cpu: low
docker: true
kubernetes: false
databases: [PostgreSQL]
sso: false
featured: false
alternatives: [miniflux, freshrss]
tags: [rss, feeds, reader, php]
updated: 2026-05-03
---

Tiny Tiny RSS (tt-rss) is one of the oldest self-hosted feed readers still actively
developed. It is designed to be always running and always updating in the background, with
read articles synced across browsers and mobile clients.

Its plugin system is central to the project: feed filters, content cleanup, article
sharing and mobile themes are all plugins, and third-party plugins are common.

tt-rss runs as a PHP application with a PostgreSQL backend and a daemon that refreshes
feeds. The classic web UI is dense and powerful, favored by long-time users who like
complete control.
