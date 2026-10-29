import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://repasses.kokoapi.space",
  integrations: [sitemap()],
  output: "static",
});
