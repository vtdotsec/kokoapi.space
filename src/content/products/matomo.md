---
title: Matomo
category: analytics
tagline: The full Google Analytics alternative with funnels, heatmaps and session recording.
website: https://matomo.org
source: https://github.com/matomo-org/matomo
docs: https://matomo.org/docs/
license: GPL-3.0
language: PHP
arch: [amd64]
ramMb: 600
cpu: medium
docker: true
kubernetes: false
databases: [MySQL, MariaDB]
sso: false
featured: false
alternatives: [umami, plausible]
tags: [analytics, marketing, funnels, heatmaps]
updated: 2026-07-05
---

Matomo is the most complete open-source analytics platform — the project explicitly aims
to replace Google Analytics for businesses, and it shows: goals, funnels, ecommerce
tracking, custom reports, heatmaps, session recordings and A/B testing are all available.

The trade-off is complexity. A production Matomo needs MySQL/MariaDB plus a web server and
PHP, and heavier features (rolling visits, media analytics) add their own requirements.
Privacy tools such as cookieless tracking and GDPR-friendly consent integration are
included.

For a blog or small site, the lighter analytics tools are easier; Matomo shines when you
need marketing-grade reporting on your own infrastructure.
