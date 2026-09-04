---
title: Grafana
category: monitoring
tagline: The standard open-source dashboard for metrics, logs and alerts.
website: https://grafana.com/oss/grafana/
source: https://github.com/grafana/grafana
docs: https://grafana.com/docs/
license: AGPL-3.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 512
cpu: medium
docker: true
kubernetes: true
databases: [SQLite, PostgreSQL, MySQL]
sso: true
featured: false
alternatives: [netdata]
tags: [dashboards, metrics, prometheus, alerting]
updated: 2026-07-31
---

Grafana is the de-facto dashboard layer for observability stacks. It queries time-series
data from Prometheus, InfluxDB, Loki, Graphite and dozens of other sources, and turns them
into polished, shareable dashboards with alerting.

It also provisions users via OAuth, LDAP and SAML, which makes it the natural front door
when several people share a monitoring setup.

Grafana itself stores only configuration and dashboards (SQLite is fine for small
installations); the data volumes live in whatever datasources you connect. Expect a few
hundred MB of RAM — cheap compared to the visibility it buys.
