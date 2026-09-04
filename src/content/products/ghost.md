---
title: Ghost
category: blogging
tagline: A professional publishing platform with newsletters, memberships and a clean editor.
website: https://ghost.org
source: https://github.com/TryGhost/Ghost
docs: https://ghost.org/docs/
license: MIT
language: Node.js
arch: [amd64]
ramMb: 512
cpu: medium
docker: true
kubernetes: false
databases: [MySQL, MariaDB, SQLite]
sso: false
featured: false
alternatives: [writefreely]
tags: [blog, cms, newsletter, publishing]
updated: 2026-07-22
---

Ghost is a publishing platform built for professional bloggers and small media teams. Its
editor is distraction-free, themes are full-featured, and the same system that serves
posts can run memberships, paid subscriptions and email newsletters.

Everything is designed around growing an audience: built-in SEO, sitemaps, member
management and email sending (via providers like Mailgun or Postmark) are first-class.

Self-hosting Ghost requires a Node.js runtime plus MySQL or MariaDB for anything serious
(SQLite works for evaluation). Expect a few hundred MB of RAM; the platform rewards a
little hardware with a very polished writing experience.
