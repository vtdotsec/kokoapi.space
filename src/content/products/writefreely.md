---
title: WriteFreely
category: blogging
tagline: A federated, minimalist blogging platform for distraction-free writing.
website: https://writefreely.org
source: https://github.com/writefreely/writefreely
docs: https://writefreely.org/docs/
license: AGPL-3.0
language: Go
arch: [amd64]
ramMb: 120
cpu: low
docker: true
kubernetes: false
databases: [SQLite, MySQL]
sso: false
featured: false
alternatives: [ghost]
tags: [blog, federation, activitypub, minimal]
updated: 2026-05-16
---

WriteFreely is a writing tool first: a clean, fast, type-focused editor for long-form
posts with none of the dashboard sprawl of a big CMS. Collections let you run multiple
publications from one instance.

It speaks ActivityPub, so posts and comments federate with the open social web (Mastodon,
Pleroma and friends) — your writing can reach readers without a proprietary platform in
between.

A single Go binary and SQLite keep the whole thing light, and there is an official
container image. If your goal is a personal blog that respects readers and stays fast,
WriteFreely is hard to beat.
