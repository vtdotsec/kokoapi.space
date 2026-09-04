---
title: Syncthing
category: file-sync
tagline: Continuous, peer-to-peer file synchronization that keeps data only on your devices.
website: https://syncthing.net
source: https://github.com/syncthing/syncthing
docs: https://docs.syncthing.net
license: MPL-2.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 150
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: true
alternatives: []
tags: [sync, p2p, files, privacy]
updated: 2026-08-11
---

Syncthing replaces "cloud drive" synchronization with direct, encrypted transfer between
your own devices. Folders are shared peer-to-peer — no central server holds your files,
and data never passes through a third party.

Changes on any device propagate to the others over LAN or the internet, with
versioning (including a recycle-bin style trash) to protect against accidents. A web UI
shows sync status and per-device connections, and the protocol is open and audited.

Because it is a single Go binary per device, deployment is trivial: run it on your server,
NAS, laptop and phone, and pick which folders live where. Ideal as the plumbing under
file-based apps like notes or photo folders.
