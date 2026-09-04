---
title: Uptime Kuma
category: monitoring
tagline: A self-hosted monitoring tool with a beautiful status page and 90+ notification methods.
website: https://github.com/louislam/uptime-kuma
source: https://github.com/louislam/uptime-kuma
docs: https://github.com/louislam/uptime-kuma/wiki
license: MIT
language: Node.js
arch: [amd64, arm64, armv7]
ramMb: 300
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: true
alternatives: [healthchecks]
tags: [uptime, monitoring, status-page, alerts]
updated: 2026-08-08
---

Uptime Kuma monitors your websites, services and game servers with HTTP(S), TCP, ping,
DNS and keyword checks, then tells you the moment something breaks — via Telegram,
Discord, Slack, email or one of 90+ other channels.

Each monitor gets its own public or private status page with incident history, and the
"maintenance mode" suppresses alerts during planned downtime.

It runs as a single Node.js service with a SQLite database and is designed to be simple
enough for a first-time homelabber to deploy. Realistic alerts, groups and proxy support
cover more advanced setups too.
