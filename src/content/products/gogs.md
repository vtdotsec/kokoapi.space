---
title: Gogs
category: git-hosting
tagline: The original lightweight Go Git service — minimal, fast, single binary.
website: https://gogs.io
source: https://github.com/gogs/gogs
docs: https://gogs.io/docs/
license: MIT
language: Go
arch: [amd64, arm64, armv7]
ramMb: 150
cpu: low
docker: true
kubernetes: false
databases: [SQLite, PostgreSQL, MySQL]
sso: false
featured: false
alternatives: [gitea]
tags: [git, code, forge, minimal]
updated: 2026-04-30
---

Gogs was the pioneer of lightweight self-hosted Git hosting in Go, and it remains one of
the smallest full forges available. A single binary provides repositories, issues, pull
requests and a web UI.

Where Gitea has grown into an all-in-one platform with actions and packages, Gogs stays
deliberately lean — great when you primarily need reliable repository hosting with the
smallest possible footprint.

It supports SQLite, PostgreSQL and MySQL backends and runs happily in under 200 MB of RAM.
Check the project's maintenance cadence if you need the newest forge features; for plain,
fast Git hosting it is still excellent.
