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
  integrations: [
    sitemap({
      // The tool apps under public/ are not Astro routes, so list them here.
      // /secret/ is proxied by nginx to the Node service at runtime.
      customPages: [
        "https://kokoapi.space/image/",
        "https://kokoapi.space/pdf/",
        "https://kokoapi.space/convert/",
        "https://kokoapi.space/secret/",
        "https://kokoapi.space/qrcode/",
      ],
      // The 404 page is an error document, not an indexable URL.
      filter: (page) => !page.includes("/404"),
    }),
  ],
});
