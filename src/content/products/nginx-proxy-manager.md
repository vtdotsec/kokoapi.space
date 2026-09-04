---
title: Nginx Proxy Manager
category: reverse-proxy
tagline: Expose and secure your services with a friendly nginx UI and free SSL certificates.
website: https://nginxproxymanager.com
source: https://github.com/NginxProxyManager/nginx-proxy-manager
docs: https://nginxproxymanager.com/guide/
license: MIT
language: TypeScript
arch: [amd64, arm64]
ramMb: 200
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [traefik, caddy]
tags: [proxy, ssl, letsencrypt, web-ui]
updated: 2026-06-14
---

Nginx Proxy Manager wraps nginx in a clean web UI so you never have to edit a proxy config
by hand. Add a domain, point it at a container, and it requests a free Let's Encrypt
certificate and wires up HTTPS automatically.

It supports access lists (IP allow/deny), basic authentication, custom locations,
websocket proxying and per-host advanced nginx settings — enough for almost any homelab
service.

Underneath it is the battle-tested nginx engine, so performance is not sacrificed for the
convenience. It stores its config in SQLite and is the usual recommendation for people who
want SSL without learning a new routing syntax.
