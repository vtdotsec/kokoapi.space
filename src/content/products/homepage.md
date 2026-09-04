---
title: Homepage
category: dashboard
tagline: A modern, highly configurable application dashboard with service widgets and light resources.
website: https://gethomepage.dev
source: https://github.com/gethomepage/homepage
docs: https://gethomepage.dev/configs/services/
license: GPL-3.0
language: Go
arch: [amd64, arm64]
ramMb: 100
cpu: low
docker: true
kubernetes: true
databases: []
sso: false
featured: true
alternatives: [dashy, homer]
tags: [dashboard, startpage, widgets, homelab]
updated: 2026-08-05
---

Homepage is a dashboard whose whole job is to look great while using almost nothing. It is
configured with YAML files that define services, bookmark groups and a long list of
"widgets" that talk to your services' APIs — uptime, disk usage, Docker containers, weather,
Sonarr/Radarr activity and more.

Docker discovery means you can populate the dashboard from container labels instead of
hand-editing the config, and there is built-in Kubernetes support for people running
clusters.

At roughly 100 MB of RAM it is one of the lightest full-featured dashboards available, and
works well as a shared startpage for the whole family.
