---
title: Homer
category: dashboard
tagline: A dead-simple, static dashboard generated from a YAML file — nothing more.
website: https://github.com/bastienwirtz/homer
source: https://github.com/bastienwirtz/homer
docs: https://github.com/bastienwirtz/homer/blob/main/docs/configuration.md
license: Apache-2.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 25
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: false
alternatives: [homepage, dashy]
tags: [dashboard, startpage, static]
updated: 2026-04-22
---

Homer takes the opposite approach to big dashboards: configure once in a YAML file, and it
renders a clean static page that requires no backend at all after build. You can even run
the output on any static file server.

Service groups, icons, subtext and simple health indicators are all supported, along with
light and dark themes. Because there is no runtime API, there are no widgets pulling live
data — just honest links with an optional ping check.

It is an ideal "set and forget" startpage for routers, old Pis, or people who simply want
the most reliable dashboard in the stack.
