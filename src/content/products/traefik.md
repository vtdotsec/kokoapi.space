---
title: Traefik
category: reverse-proxy
tagline: A cloud-native reverse proxy that discovers services from Docker and Kubernetes labels.
website: https://traefik.io/traefik/
source: https://github.com/traefik/traefik
docs: https://doc.traefik.io/traefik/
license: MIT
language: Go
arch: [amd64, arm64, armv7]
ramMb: 150
cpu: low
docker: true
kubernetes: true
databases: []
sso: false
featured: false
alternatives: [caddy, nginx-proxy-manager]
tags: [proxy, docker, kubernetes, dynamic]
updated: 2026-07-27
---

Traefik is a reverse proxy designed for dynamic environments. Instead of a static config
file, it watches your container runtime or orchestrator and routes traffic based on
labels — start a container with the right labels and Traefik picks it up automatically,
certificate included.

That model makes it the natural front door for Docker Compose stacks and Kubernetes
clusters, where services appear and disappear. Middlewares add authentication, rate
limiting, headers and circuit breaking without touching the app.

It is written in Go, lightweight, and exposes a useful web dashboard. The dynamic-routing
concept takes a moment to learn, but it removes an entire class of config drift.
