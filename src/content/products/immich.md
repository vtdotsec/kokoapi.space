---
title: Immich
category: photos
tagline: A high-performance self-hosted photo and video backup with Google Photos features.
website: https://immich.app
source: https://github.com/immich-app/immich
docs: https://immich.app/docs/
license: AGPL-3.0
language: TypeScript
arch: [amd64, arm64]
ramMb: 2048
cpu: high
docker: true
kubernetes: false
databases: [PostgreSQL, Redis]
sso: false
featured: true
alternatives: [photoprism]
tags: [photos, video, backup, face-recognition, ml]
updated: 2026-08-15
---

Immich is the most active open-source effort to replace Google Photos. The mobile app
backs up photos and videos in the background, and the server organizes them into albums,
memories and shared libraries with a fast, pleasant web and mobile experience.

It pairs a TypeScript/Node server with a Rust-based machine-learning service for face
recognition, object/OCR-based search and duplicate detection. The ML models run on CPU or
GPU; on CPU they push memory usage up, so budget at least 2 GB for the stack.

A reliable PostgreSQL database is required, and the whole thing is operated through its
official Docker Compose setup. The project moves quickly — weekly releases are normal.
