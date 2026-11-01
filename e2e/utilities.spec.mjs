import { test, expect } from '@playwright/test';

test('checksum is local, compares expected values and clears the result', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await page.goto('/files/checksum/');
  await page.locator('#utility-file').setInputFiles({ name: 'abc.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') });
  await page.locator('#utility-run').click();
  const hash = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  await expect(page.locator('#utility-output')).toHaveValue(hash);
  await page.locator('#expected-hash').fill(hash.toUpperCase());
  await expect(page.getByRole('status')).toContainText('Match');
  await page.locator('#expected-hash').fill('0'.repeat(64));
  await expect(page.getByRole('status')).toContainText('No match');
  await page.locator('#expected-hash').fill('invalid');
  await expect(page.getByRole('status')).toContainText('64 hexadecimal');
  await page.locator('#utility-clear').click();
  await expect(page.locator('#utility-output')).toHaveValue('');
  await expect(page.locator('#utility-copy')).toBeDisabled();
  expect(requests.every(request => request.method === 'GET' && request.url.startsWith('http://127.0.0.1:4321/'))).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test('inspector reports file signature independently of filename and declared MIME', async ({ page }) => {
  await page.goto('/files/inspect/');
  await page.locator('#utility-file').setInputFiles({ name: 'misleading.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('%PDF-1.7 example') });
  await expect(page.locator('#fact-detected')).toHaveText('PDF');
  await expect(page.locator('#fact-declared')).toHaveText('image/jpeg');
  await page.locator('#utility-clear').click();
  await expect(page.locator('#file-facts')).toBeHidden();
  await expect(page.locator('#fact-name')).toHaveText('');
});

test('text cleanup removes duplicates, exports content and clears stale results', async ({ page }) => {
  await page.goto('/text/clean/');
  await page.locator('#text-input').fill(' apple \n\napple\npear\nPear');
  await page.locator('#utility-run').click();
  await expect(page.locator('#utility-output')).toHaveValue('apple\npear\nPear');
  const download = page.waitForEvent('download');
  await page.locator('#utility-download').click();
  expect((await download).suggestedFilename()).toBe('cleaned-text.txt');
  await page.locator('#deduplicate').uncheck();
  await expect(page.locator('#utility-output')).toHaveValue('');
  await expect(page.locator('#utility-download')).toBeDisabled();
  await page.locator('#utility-run').click();
  await expect(page.locator('#utility-output')).toHaveValue('apple\napple\npear\nPear');
  await page.locator('#utility-clear').click();
  await expect(page.locator('#text-input')).toHaveValue('');
});

for (const route of ['/utilities/', '/files/checksum/', '/files/inspect/', '/text/clean/']) {
  test(`utility mobile layout and privacy on ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => ({ cookies: document.cookie, storage: localStorage.length }))).toEqual({ cookies: '', storage: 0 });
  });
}
