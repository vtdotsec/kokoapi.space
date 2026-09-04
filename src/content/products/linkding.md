---
title: Linkding
category: bookmarks
tagline: Minimal, self-hosted bookmark manager that favors keyboard use and speed.
website: https://github.com/sissbruecker/linkding
source: https://github.com/sissbruecker/linkding
docs: https://github.com/sissbruecker/linkding#readme
license: MIT
language: Python
arch: [amd64, arm64]
ramMb: 200
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [hoarder]
tags: [bookmarks, links, archive, reader]
updated: 2026-06-09
---

Linkding is a bookmark manager in the mold of pinboard: fast, text-focused and pleasantly
minimal. Bookmarks can be tagged, marked as unread, shared publicly, and browsed with a
keyboard-first interface.

A built-in archiver can save a snapshot of each page, and full-text search over titles,
descriptions, tags and archived content makes old links findable.

Browser extensions and a bookmarklet make saving trivial from any device. It stores
everything in a single SQLite database and comfortably runs in under 256 MB of RAM.
