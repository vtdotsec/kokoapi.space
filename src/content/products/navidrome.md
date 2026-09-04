---
title: Navidrome
category: media
tagline: A modern, lightweight music server that speaks the Subsonic API.
website: https://www.navidrome.org
source: https://github.com/navidrome/navidrome
docs: https://www.navidrome.org/docs/
license: GPL-3.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 100
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [audiobookshelf]
tags: [music, audio, subsonic, streaming]
updated: 2026-07-25
---

Navidrome is a music server for people who own their files: point it at your music folder,
it scans and tags everything, and streams it through a clean web player or any Subsonic
client.

That compatibility matters — Subsonic has decades of mature clients across every platform,
so you can keep your favorite player while dropping the commercial server.

Navidrome is written in Go with a SQLite database and typically uses only about 100 MB of
RAM even with large libraries. It keeps per-user play counts, favorites and playlists in
sync across all connected devices.
