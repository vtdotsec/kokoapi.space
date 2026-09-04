---
title: Gitea
category: git-hosting
tagline: A painless, self-hosted Git service with issues, PRs, actions and packages.
website: https://gitea.com
source: https://github.com/go-gitea/gitea
docs: https://docs.gitea.com
license: MIT
language: Go
arch: [amd64, arm64, armv7]
ramMb: 300
cpu: low
docker: true
kubernetes: true
databases: [SQLite, PostgreSQL, MySQL]
sso: true
featured: true
alternatives: [gogs]
tags: [git, code, forge, ci]
updated: 2026-08-16
---

Gitea is a community-driven Git forge designed to run on any hardware you own. In one Go
binary you get repository hosting, issue tracking, pull requests, a wiki, releases,
package registry and built-in CI/CD actions.

It speaks the same Git protocol as GitHub or GitLab, so migration is painless, and it can
authenticate users with built-in accounts, OAuth providers or LDAP.

A single-user or small-team instance is comfortable on SQLite and a few hundred MB of RAM;
larger teams can move to PostgreSQL. Gitea's low requirements and active release cadence
make it the default self-hosted Git server for most homelabs.
