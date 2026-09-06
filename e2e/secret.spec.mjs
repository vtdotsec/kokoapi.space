import { test, expect } from "@playwright/test";

test.describe("secret sender", () => {
  async function createSecret(page, text, expiry) {
    await page.goto("/secret/");
    await page.locator("#text-input").fill(text);
    if (expiry) {
      await page.locator(`input[name="expires"][value="${expiry}"]`).check();
    }
    const downloadRequest = page.waitForRequest((r) => r.url().includes("/secret/api/blob") && r.method() === "POST");
    await page.locator("#create-form button[type=submit]").click();
    await downloadRequest;
    await expect(page.locator("#result-view")).toBeVisible();
    const link = await page.locator("#result-link").inputValue();
    expect(link).toMatch(/\/secret\/[A-Za-z0-9_-]{16,}#/);
    return link;
  }

  test("timed secret stays locked until Reveal and then decrypts", async ({ page }) => {
    const link = await createSecret(page, "e2e hello secret", "1h");

    const apiCalls = [];
    page.on("request", (r) => {
      if (r.url().includes("/secret/api/")) apiCalls.push(r.url());
    });

    await page.goto(link);
    await expect(page.locator("#reader-locked")).toBeVisible();
    await expect(page.locator("#reader-text-wrap")).toBeHidden();
    expect(apiCalls.filter((u) => u.includes("/api/"))).toHaveLength(0);

    await page.locator("#reveal-btn").click();
    await expect(page.locator("#reader-text")).toContainText("e2e hello secret");
    expect(apiCalls.filter((u) => u.includes("/meta"))).toHaveLength(1);
    expect(apiCalls.filter((u) => u.includes("/cipher"))).toHaveLength(1);
  });

  test("burn-after-read is consumed once and gone on reload", async ({ page }) => {
    const link = await createSecret(page, "burn me now", "read");
    await page.goto(link);
    await expect(page.locator("#reader-locked")).toBeVisible();
    await page.locator("#reveal-btn").click();
    await expect(page.locator("#reader-text")).toContainText("burn me now");

    await page.reload();
    await expect(page.locator("#reader-locked")).toBeVisible();
    await page.locator("#reveal-btn").click();
    await expect(page.locator("#reader-error")).toBeVisible();
    await expect(page.locator("#reader-error-title")).toHaveText("Secret not found");
  });

  test("nonexistent secret shows a clean 404 error screen", async ({ page }) => {
    await page.goto("/secret/qqqqqqqqqqqqqqqqqqqqqqqq#AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    await expect(page.locator("#reader-locked")).toBeVisible();
    await page.locator("#reveal-btn").click();
    await expect(page.locator("#reader-error")).toBeVisible();
    await expect(page.locator("#reader-error-title")).toHaveText("Secret not found");
    await expect(page.locator("#reader-text-wrap")).toBeHidden();
  });

  test("wrong key fails decryption cleanly", async ({ page }) => {
    const link = await createSecret(page, "decrypt guard", "1h");
    const wrong = link.slice(0, link.indexOf("#")) + "#" + "A".repeat(43);
    await page.goto(wrong);
    await page.locator("#reveal-btn").click();
    await expect(page.locator("#reader-error")).toBeVisible();
    await expect(page.locator("#reader-error-title")).toHaveText("Decryption failed");
  });

  test("share pages are noindex while the composer page stays indexable", async ({ request }) => {
    const share = await request.get("/secret/qqqqqqqqqqqqqqqqqqqqqqqq");
    expect(share.status()).toBe(200);
    expect(share.headers()["x-robots-tag"] || "").toContain("noindex");
    expect(await share.text()).toContain('name="robots" content="noindex, nofollow"');

    const home = await request.get("/secret/");
    expect(home.status()).toBe(200);
    expect(home.headers()["x-robots-tag"] || "").not.toContain("noindex");
  });
});
