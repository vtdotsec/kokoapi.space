---
title: Silverbullet
category: notes-wiki
tagline: A markdown-based extensible note tool where your notes are plain files on disk.
website: https://silverbullet.md
source: https://github.com/silverbulletmd/silverbullet
docs: https://silverbullet.md
license: MIT
language: TypeScript
arch: [amd64, arm64]
ramMb: 150
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: false
alternatives: [trilium, outline]
tags: [notes, markdown, files, deno]
updated: 2026-07-01
---

Silverbullet stores your notes as ordinary Markdown files in a folder of your choice — no
proprietary database, no lock-in. Point it at a directory you already sync with Syncthing
or a git repository and it simply indexes what it finds.

The web interface is an editor that feels like a desktop app, with slash-commands, live
templates, queries over your notes, and a plug-in system for custom features.

Because notes are files, you can always fall back to any Markdown editor, script your
notes with plain tools, and version them with git. Silverbullet runs as a single small
process written in TypeScript on Deno.
