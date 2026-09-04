import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://kokoapi.space",
  output: "static",
  trailingSlash: "ignore",
  // Keep CSS/JS as external hashed files so a strict
  // Content-Security-Policy (style-src 'self') can be used in production.
  build: {
    inlineStylesheets: "never",
  },
  integrations: [sitemap()],
});
