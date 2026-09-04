---
title: Healthchecks
category: monitoring
tagline: Cron job monitoring that alerts you when scheduled tasks fail to run on time.
website: https://healthchecks.io
source: https://github.com/healthchecks/healthchecks
docs: https://healthchecks.io/docs/
license: BSD-3-Clause
language: Python
arch: [amd64, arm64]
ramMb: 100
cpu: low
docker: true
kubernetes: false
databases: [SQLite, PostgreSQL, MySQL]
sso: true
featured: false
alternatives: [uptime-kuma]
tags: [cron, healthchecks, alerts, jobs]
updated: 2026-07-20
---

Healthchecks solves a different monitoring problem than uptime checks: it watches your
*cron jobs and scheduled tasks*. Each job gets a unique ping URL; if a task does not ping
on time, Healthchecks raises the alarm.

Support for cron expressions lets it compute expected run schedules, and "grace periods"
distinguish a slightly-late job from a dead one. Alerts fan out to email, webhooks and
dozens of chat services.

It is a Django application that runs happily on SQLite for small deployments, and supports
a built-in OAuth/single sign-on layer for teams. This is the app to run *after* you have
set up your first few backup and maintenance scripts.
