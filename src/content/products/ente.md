---
title: Ente
category: photos
tagline: End-to-end encrypted photo backup whose server you can run yourself.
website: https://ente.io
source: https://github.com/ente-io/ente
docs: https://ente.io/self-hosting/
license: AGPL-3.0
language: Go
arch: [amd64, arm64]
ramMb: 400
cpu: low
docker: true
kubernetes: false
databases: [PostgreSQL]
sso: false
featured: false
alternatives: [immich, photoprism]
tags: [photos, e2ee, backup, privacy]
updated: 2026-07-29
---

Ente is best known for its hosted end-to-end encrypted photo service — and its server is
open source, so you can run the entire product on your own hardware while keeping the same
zero-knowledge architecture.

Photos are encrypted on-device before upload; even your own server only stores ciphertext.
The official mobile and desktop apps work with a self-hosted backend by pointing them at
your instance.

The default deployment is a Docker Compose stack (server, minio-compatible storage,
PostgreSQL) that runs comfortably on modest hardware. You trade some conveniences of the
managed service — automatic updates and multi-region redundancy — for full control.
