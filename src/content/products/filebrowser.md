---
title: FileBrowser
category: file-sync
tagline: A web file manager for a single folder or your whole disk, in one binary.
website: https://filebrowser.org
source: https://github.com/filebrowser/filebrowser
docs: https://filebrowser.org
license: Apache-2.0
language: Go
arch: [amd64, arm64, armv7]
ramMb: 60
cpu: low
docker: true
kubernetes: false
databases: [SQLite]
sso: false
featured: false
alternatives: [syncthing]
tags: [files, webdav, upload, manager]
updated: 2026-05-27
---

FileBrowser gives any folder a clean, responsive web interface: upload and download files,
create directories, share links, edit text files and manage permissions — all from a
browser or via its WebDAV endpoint.

It is a natural pairing for a NAS or a home server where people want a simple "dropbox"
experience without accounts on third-party services. Multiple users with per-path access
rules are supported, as is HTTPS in the container.

A single Go binary with a small SQLite database is the entire footprint, so it fits even
on routers and low-end single-board computers.
