---
title: Jellyfin
category: media
tagline: The free, open-source media server for movies, TV shows, music and photos.
website: https://jellyfin.org
source: https://github.com/jellyfin/jellyfin
docs: https://jellyfin.org/docs/
license: GPL-2.0
language: C#
arch: [amd64, arm64, armv7]
ramMb: 1024
cpu: medium
docker: true
kubernetes: true
databases: [SQLite]
sso: false
featured: true
alternatives: []
tags: [media, video, streaming, transcoding]
updated: 2026-08-10
---

Jellyfin is the fully free and open-source successor to Emby. It organizes your movies,
series, music and photos, downloads rich metadata, and streams everything to phones,
tablets, TVs and web browsers — with per-user libraries, parental controls and
playback progress.

Client support is broad: official apps for Android, iOS, Android TV, web, and community
players for almost every platform. The server includes a hardware-transcoding pipeline
(QSV, NVENC, VAAPI) so weak clients can watch even high-bitrate files.

RAM and CPU needs scale with your library and transcoding workload; a device with
hardware acceleration keeps the footprint far lower than a software-only transcode
workstation. Jellyfin works on x86-64 and ARM, including SBCs.
