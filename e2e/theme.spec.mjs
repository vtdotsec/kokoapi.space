import { test, expect } from "@playwright/test";
import { ROUTES, NAV_LABELS, assertThemeToggle } from "./helpers.mjs";

for (const route of ROUTES) {
  test(`theme toggle on ${route}`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    await assertThemeToggle(page);
  });
}

test("root navigation lists every tool in order", async ({ page }) => {
  await page.goto("/");
  const labels = await page.locator(".main-nav-link").allTextContents();
  expect(labels.map((l) => l.trim())).toEqual(NAV_LABELS);
  for (const href of ["/image/", "/pdf/", "/convert/", "/secret/"]) {
    await expect(page.locator(`.main-nav-link[href="${href}"]`)).toHaveCount(1);
  }
});
