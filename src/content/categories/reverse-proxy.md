---
title: Reverse proxies
emoji: 🔀
order: 13
tagline: The front door to your homelab — TLS termination, routing, and secure access to every service.
---

A reverse proxy is the single most important piece of homelab plumbing. One entry point
terminates TLS, routes hostnames to the right containers, adds security headers, and lets
you expose many services through just ports 80/443.

Modern proxies are configured either through dynamic configuration or simple labels on
containers, and several are designed to run *in front of* Kubernetes itself.
