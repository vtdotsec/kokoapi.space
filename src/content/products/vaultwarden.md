---
title: Vaultwarden
category: password-manager
tagline: A lightweight, compatible Bitwarden server that runs in under 20 MB of RAM.
website: https://github.com/dani-garcia/vaultwarden
source: https://github.com/dani-garcia/vaultwarden
docs: https://github.com/dani-garcia/vaultwarden/wiki
license: GPL-3.0
language: Rust
arch: [amd64, arm64]
ramMb: 20
cpu: low
docker: true
kubernetes: true
databases: [SQLite, PostgreSQL, MySQL]
sso: true
featured: true
alternatives: [passbolt, bitwarden]
tags: [password, bitwarden, secrets, team]
updated: 2026-08-12
---

Vaultwarden is an independently written implementation of the Bitwarden server API in
Rust. It speaks the same protocol, so the official Bitwarden browser extensions, desktop
apps and mobile clients work against it without modification.

The big win over the official server is resource usage: a typical single-user deployment
sits around 20 MB of RAM with SQLite storage, which makes it comfortable on a Raspberry Pi
or a small VPS.

It also adds team-friendly features that used to be paid-only upstream: organizational
sharing works well, and OIDC, LDAP and SAML login are supported for member access.
