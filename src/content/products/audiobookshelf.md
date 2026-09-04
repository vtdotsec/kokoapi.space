---
title: Audiobookshelf
category: media
tagline: Self-hosted audiobook and podcast server with progress sync and apps.
website: https://www.audiobookshelf.org
source: https://github.com/advplyr/audiobookshelf
docs: https://www.audiobookshelf.org/docs/
license: GPL-3.0
language: Node.js
arch: [amd64, arm64, armv7]
ramMb: 300
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [navidrome]
tags: [audiobooks, podcasts, media, streaming]
updated: "2026-07-08"
---

Audiobookshelf is the dedicated home for audiobooks and podcasts. It organizes your
audiobook files with proper metadata and covers, supports chapter navigation, and
remembers exactly where you stopped — on any device.

Podcast support includes subscriptions, downloads and per-user playback state, so the
whole family can share one server with independent progress.

The web player works well, and there are official apps for Android and iOS. With a SQLite
database and no transcoding, it stays light enough for a Raspberry Pi, scaling smoothly as
your library grows.
