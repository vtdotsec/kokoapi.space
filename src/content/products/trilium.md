---
title: TriliumNext
category: notes-wiki
tagline: Hierarchical note-taking with a powerful outline tree, encryption and scripts.
website: https://triliumnext.github.io/Docs/
source: https://github.com/TriliumNext/Trilium
docs: https://triliumnext.github.io/Docs/
license: AGPL-3.0
language: TypeScript
arch: [amd64, arm64]
ramMb: 256
cpu: low
docker: true
kubernetes: false
databases: []
sso: false
featured: false
alternatives: [outline, silverbullet]
tags: [notes, tree, markdown, personal]
updated: 2026-08-20
---

TriliumNext is the maintained fork of Trilium Notes, a personal knowledge base built
around one powerful idea: notes are nodes in a hierarchy you can reorganize freely, clone
into multiple places, and relate to each other.

Each note can contain rich text or Markdown, and power users can script the entire app with
JavaScript — custom views, automated captures, and template systems are common.

Data is stored in a single SQLite-style database file, and note encryption is available
per-subtree. It is a personal tool rather than a team wiki, though HTTP API and
synchronization between devices are included.
