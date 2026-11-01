import { test, expect } from '@playwright/test';

test('catalog search stays local and exposes the complete tool index', async ({ page }) => {
  const remote = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4321/')) remote.push(request.url()); });
  await page.goto('/');
  await expect(page.locator('[data-catalog-item]')).toHaveCount(28);
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(13);
  await page.getByRole('searchbox').fill('JSON');
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(3);
  await expect(page.getByRole('status')).toHaveText('3 tools found');
  await page.getByRole('searchbox').fill('no-such-tool');
  await expect(page.locator('#catalog-empty')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await expect(page.locator('[data-catalog-item]:visible')).toHaveCount(13);
  expect(await page.evaluate(() => ({ cookies: document.cookie, storage: localStorage.length }))).toEqual({ cookies: '', storage: 0 });
  expect(remote).toEqual([]);
});

for (const route of ['/', '/pdf/', '/image/', '/convert/', '/secret/']) {
  test(`compact mobile layout and project links on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('footer a[href="https://github.com/sponsors/vtdotsec"]')).toBeVisible();
    await expect(page.locator('a.skip-link')).toHaveCount(1);
    await expect(page.locator('[src^="/analytics/"]')).toHaveCount(0);
  });
}
