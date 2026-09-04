---
title: PhotoPrism
category: photos
tagline: AI-powered photo organizer that runs offline on your own hardware.
website: https://photoprism.app
source: https://github.com/photoprism/photoprism
docs: https://docs.photoprism.app
license: AGPL-3.0
language: Go
arch: [amd64, arm64]
ramMb: 1536
cpu: medium
docker: true
kubernetes: false
databases: [SQLite, MariaDB]
sso: false
featured: false
alternatives: [immich]
tags: [photos, ai, organizer, geotag]
updated: 2026-06-18
---

PhotoPrism indexes your existing photo folders in place — it does not need to import or
move anything. It extracts EXIF, geotags, faces and objects, and makes everything
searchable from a polished web interface.

All analysis runs locally: face recognition and classification are powered by TensorFlow
and never leave your machine. Files stay untouched and organized by your own folder scheme.

The community edition targets individuals and uses SQLite, while the paid "Plus" tier adds
MariaDB clustering, library sync and advanced search. Indexing a large library is the main
resource driver; daily use afterwards is light.
