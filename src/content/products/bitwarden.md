---
title: Bitwarden (official server)
category: password-manager
tagline: The full-featured, official Bitwarden self-hosted server with a SQL Server backend.
website: https://bitwarden.com/help/install-on-premise/
docs: https://bitwarden.com/help/install-on-premise/
source: https://github.com/bitwarden/server
license: GPL-3.0
language: C#
arch: [amd64]
ramMb: 2048
cpu: medium
docker: true
databases: [SQL Server]
sso: true
featured: false
alternatives: [vaultwarden, passbolt]
tags: [password, bitwarden, team, enterprise]
updated: 2026-06-02
---

Bitwarden's official self-hosted server is the exact software that powers the Bitwarden
cloud — same code, same clients, deployed into your own Docker Compose stack. It is the
right choice when you want zero behavioral differences from the hosted product and are
willing to pay for that fidelity with hardware.

The stack is large: a dozen containers including a SQL Server database, so plan for at
least 2 GB of RAM and a couple of GB of disk. Some capabilities (SSO, directory sync,
families plans) are gated behind a paid license even when self-hosted.

If you want the same clients and features on a fraction of the hardware, most homelabs
reach for Vaultwarden instead.
