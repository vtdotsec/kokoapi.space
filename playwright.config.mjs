import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `node ${path.join(here, "secret", "server.mjs")}`,
      url: "http://127.0.0.1:8787/secret/api/health",
      reuseExistingServer: true,
      timeout: 15_000,
      env: {
        PORT: "8787",
        DATA_DIR: path.join(here, "e2e", ".tmp-data"),
      },
    },
    {
      command: `node ${path.join(here, "e2e", "serve.mjs")}`,
      url: "http://127.0.0.1:4321/",
      reuseExistingServer: true,
      timeout: 15_000,
    },
  ],
});
