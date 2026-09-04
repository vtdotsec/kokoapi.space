---
title: Caddy
category: reverse-proxy
tagline: A web server and reverse proxy with automatic HTTPS — configured by intent.
website: https://caddyserver.com
source: https://github.com/caddyserver/caddy
docs: https://caddyserver.com/docs/
license: Apache-2.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 50
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: true
alternatives: [traefik, nginx-proxy-manager]
tags: [proxy, https, tls, auto-cert]
updated: 2026-08-03
---

Caddy's defining feature is automatic HTTPS: give it a domain and it obtains, renews and
installs certificates from Let's Encrypt or ZeroSSL with zero configuration, including
internal or self-signed certs for local use.

Configuration is declarative and readable — a few lines of Caddyfile describe a host,
its backend and its options. JSON config and a public API cover more complex automation,
and plugins add features without forking.

Written in Go, Caddy is a single static binary that idles at tens of MB of RAM. If you
enjoy clean configs and dislike certificate chores, Caddy is the most pleasant way to
front your homelab.
