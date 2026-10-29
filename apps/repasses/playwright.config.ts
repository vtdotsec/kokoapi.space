import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4325", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.REPASSES_EXTERNAL_SERVER === "1" ? undefined : {
    command: "node node_modules/astro/bin/astro.mjs dev --host 127.0.0.1 --port 4325",
    url: "http://127.0.0.1:4325",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGINT", timeout: 2_000 },
  },
});
