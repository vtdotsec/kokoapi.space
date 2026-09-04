---
title: Outline
category: notes-wiki
tagline: A fast, team-oriented knowledge base with a modern editor and Slack-style structure.
website: https://www.getoutline.com
source: https://github.com/outline/outline
docs: https://docs.getoutline.com
license: BUSL-1.1
language: TypeScript
arch: [amd64]
ramMb: 512
cpu: medium
docker: true
kubernetes: true
databases: [PostgreSQL, Redis]
sso: true
featured: true
alternatives: [trilium, silverbullet]
tags: [wiki, team, knowledge-base, docs]
updated: 2026-08-02
---

Outline is a wiki for teams that feel at home in modern writing tools: a block-based
editor, keyboard-driven navigation, nested collections, and real-time collaboration.
Documents are organized like a file tree inside workspaces, and search is fast and
full-text.

Authentication is built around SSO — OIDC and SAML are first-class — which makes Outline a
natural fit for organizations that already use Keycloak, Authelia or a similar identity
provider.

It needs PostgreSQL and Redis and runs as a Node.js service. The source is available under
the Business Source License; running it for internal company use is permitted, while
offering it as a hosted service to others is not.
