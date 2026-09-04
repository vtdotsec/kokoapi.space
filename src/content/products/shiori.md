---
title: Shiori
category: bookmarks
tagline: A tiny, single-binary bookmark manager that keeps a readable copy of every page.
website: https://github.com/go-shiori/shiori
source: https://github.com/go-shiori/shiori
docs: https://github.com/go-shiori/shiori#readme
license: MIT
language: Go
arch: [amd64, arm64, armv7]
ramMb: 80
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [linkding, hoarder]
tags: [bookmarks, archive, offline, pocket]
updated: 2026-05-11
---

Shiori is a simple, self-contained Pocket alternative. Save any link and Shiori fetches a
readable copy of the page so it stays accessible even if the original disappears.

The web interface supports tags, filtering and full-text search over archived content, and
import from the usual bookmark formats makes migration easy. An API and browser
extensions round out the workflow.

A single Go binary plus a SQLite file is the whole deployment — under 100 MB of RAM even
with thousands of bookmarks — which makes it a favorite for low-power servers.
