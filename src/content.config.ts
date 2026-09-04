import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/**
 * Software products in the catalog.
 * One Markdown file per product, stored in `src/content/products`.
 * The file name (without extension) is the canonical slug used for URLs.
 */
const products = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/products" }),
  schema: z.object({
    /** Display name */
    title: z.string(),
    /** Slug of a category from src/content/categories */
    category: z.string(),
    /** One-sentence pitch, used on cards and in <meta name="description"> */
    tagline: z.string(),
    /** Primary homepage */
    website: z.url(),
    /** Source code repository (optional) */
    source: z.url().optional(),
    /** Documentation URL (optional) */
    docs: z.url().optional(),
    /** Public demo (optional) */
    demo: z.url().optional(),
    /** SPDX-style license identifier of the self-hosted edition */
    license: z.string(),
    /** Primary implementation language */
    language: z.string(),
    /** Supported CPU architectures (amd64 = x86-64, arm64 = aarch64, armv7 = 32-bit ARM) */
    arch: z.array(z.enum(["amd64", "arm64", "armv7"])),
    /** Typical baseline RAM usage in megabytes */
    ramMb: z.number().int().positive(),
    /** Typical CPU footprint under normal (non-transcoding) use */
    cpu: z.enum(["low", "medium", "high"]),
    /** Official or widely maintained Docker image / compose file */
    docker: z.boolean().default(true),
    /** Official or widely maintained Kubernetes manifests / Helm chart */
    kubernetes: z.boolean().default(false),
    /** Backend databases it can store its data in ([] = self-contained / file based) */
    databases: z.array(z.string()).default([]),
    /** Supports external single-sign-on (OIDC / SAML / LDAP) out of the box */
    sso: z.boolean().default(false),
    /** Shown in the featured section on the homepage */
    featured: z.boolean().default(false),
    /** Manual list of alternative product slugs (same category peers are added automatically) */
    alternatives: z.array(z.string()).default([]),
    /** Free-form tags, also used for search and quick filtering */
    tags: z.array(z.string()).default([]),
    /** Date the entry was last reviewed, YYYY-MM-DD. Unquoted YAML dates are also accepted. */
    updated: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"), z.date()])
      .transform((v) => (typeof v === "string" ? v : v.toISOString().slice(0, 10))),
  }),
});

/** Category taxonomy pages. File name (without extension) is the slug. */
const categories = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/categories" }),
  schema: z.object({
    title: z.string(),
    /** Short label for cards/chips */
    emoji: z.string(),
    /** One-sentence description, used in <meta name="description"> */
    tagline: z.string(),
    /** Manual ordering weight for listings (lower = first). Optional. */
    order: z.number().int().optional(),
  }),
});

export const collections = { products, categories };
