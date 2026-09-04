---
title: Netdata
category: monitoring
tagline: Real-time, per-second infrastructure monitoring with an instant dashboard.
website: https://www.netdata.cloud
source: https://github.com/netdata/netdata
docs: https://learn.netdata.cloud
license: GPL-3.0
language: C
arch: [amd64, arm64]
ramMb: 500
cpu: low
docker: true
kubernetes: true
databases: []
sso: false
featured: false
alternatives: [grafana]
tags: [metrics, realtime, agent, dashboards]
updated: 2026-06-26
---

Netdata is a monitoring agent that collects thousands of metrics per second — CPU, memory,
disk, network, containers, applications — and renders them in a rich, zero-config web
dashboard the moment it starts.

It runs one agent per host (or as a DaemonSet in Kubernetes) and keeps the per-second data
local. Several hosts can be aggregated into a parent/child setup for a single view.

Because it is written in C and uses its own lightweight storage, it is famous for a small
footprint relative to its data collection rate — though memory usage grows with retention.
It is an excellent complement to periodic uptime checks.
