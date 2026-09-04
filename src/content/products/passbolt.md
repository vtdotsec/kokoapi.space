---
title: Passbolt
category: password-manager
tagline: Open-source team password manager built for collaboration and accountability.
website: https://www.passbolt.com
source: https://github.com/passbolt/passbolt_api
docs: https://help.passbolt.com
license: AGPL-3.0
language: PHP
arch: [amd64, arm64]
ramMb: 512
cpu: low
docker: true
kubernetes: false
databases: [MySQL, MariaDB]
sso: false
featured: false
alternatives: [vaultwarden, bitwarden]
tags: [password, team, gpg, audit]
updated: 2026-07-18
---

Passbolt is a password manager designed around team use from day one. Secrets are
encrypted in the browser with OpenPGP keys, and the server stores only ciphertext, so a
server compromise does not expose passwords.

Its collaboration model is its strongest feature: passwords can be shared with fine-grained
permissions, and every access is logged for audit. That makes it popular with small
organizations and self-hosters who want accountability.

It expects a MariaDB/MySQL backend and a mail server for invitations. The free community
edition covers core sharing; SSO and advanced policies are sold separately.
