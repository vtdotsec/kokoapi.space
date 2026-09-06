import { test, expect } from "@playwright/test";
import { fixture, dropFile, readDownload } from "./helpers.mjs";

const PDF1 = fixture("two-pages.pdf");
const PDF2 = fixture("one-page.pdf");
const PNG = fixture("pixel.png");

test.describe("image tools", () => {
  test("convert upload and download", async ({ page }) => {
    await page.goto("/image/convert");
    await page.locator("#convert-file").setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: PNG,
    });
    await expect(page.locator("#convert-info")).toContainText("pixel.png");
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#convert-run").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.jpg$/i);
    await expect(page.locator("#convert-status")).toContainText("Converted");
  });

  test("drag & drop on a file-drop label processes the file", async ({ page }) => {
    await page.goto("/image/compress");
    await dropFile(page, "#resize-file", "dropped.png", PNG, "image/png");
    await expect(page.locator("#resize-info")).toContainText("dropped.png");
  });

  test("crop page renders the crop tool inline with a sidebar link", async ({ page }) => {
    await page.goto("/image/crop");
    await expect(page).toHaveTitle(/Crop/);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("#tool-crop")).toBeVisible();
    await expect(page.locator("#tool-convert")).toBeHidden();
    await expect(page.locator('.tool-side a[href="/image/crop/"]')).toHaveAttribute("aria-current", "page");
  });
});

test.describe("pdf tools", () => {
  test("merge two pdfs into one file", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator("#merge-files").setInputFiles([
      { name: "a.pdf", mimeType: "application/pdf", buffer: PDF1 },
      { name: "b.pdf", mimeType: "application/pdf", buffer: PDF2 },
    ]);
    await expect(page.locator("#merge-list .file-row")).toHaveCount(2);
    await expect(page.locator("#merge-run")).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#merge-run").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("merged.pdf");
    const bytes = await readDownload(download);
    expect(bytes.slice(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
    await expect(page.locator("#merge-status")).toContainText("Merged");
  });

  test("split keeps the selected page range", async ({ page }) => {
    await page.goto("/pdf/split");
    await page.locator("#split-file").setInputFiles({
      name: "two-pages.pdf",
      mimeType: "application/pdf",
      buffer: PDF1,
    });
    await expect(page.locator("#split-info")).toContainText("2 pages");
    await page.locator("#split-range").fill("2");
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#split-run").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("two-pages-split.pdf");
    const bytes = await readDownload(download);
    expect(bytes.slice(0, 5).toString()).toBe("%PDF-");
  });

  test("merge page renders the merge tool inline", async ({ page }) => {
    await page.goto("/pdf/merge");
    await expect(page).toHaveTitle(/Merge PDF/);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("#tool-merge")).toBeVisible();
    await expect(page.locator("#tool-compress")).toBeHidden();
    await expect(page.locator('.suite-side a[href="/pdf/merge/"]')).toHaveAttribute("aria-current", "page");
  });

  test("compress page renders the compress tool inline", async ({ page }) => {
    await page.goto("/pdf/compress");
    await expect(page).toHaveTitle(/Compress PDF/);
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("#tool-compress")).toBeVisible();
    await expect(page.locator("#tool-merge")).toBeHidden();
  });
});

test.describe("file converter", () => {
  test("markdown produces a non-empty PDF", async ({ page }) => {
    await page.goto("/convert/markdown-to-pdf");
    await page.locator("#cv-m2p-src").fill("## Heading\n\nHello world. This is a paragraph with several words for wrapping.");
    await expect(page.locator("#cv-m2p-run")).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#cv-m2p-run").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const bytes = await readDownload(download);
    expect(bytes.slice(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(500);
    await expect(page.locator("#cv-m2p-status")).not.toHaveClass(/is-error/);
  });

  test("json to csv", async ({ page }) => {
    await page.goto("/convert/json-to-csv");
    await page.locator('input[name="cv-jsoncsv-dir"][value="json2csv"]').check();
    await page
      .locator("#cv-jsoncsv-in")
      .fill('[{"name":"Ada","year":1815},{"name":"Grace","year":1906}]');
    await expect(page.locator("#cv-jsoncsv-run")).toBeEnabled();
    await page.locator("#cv-jsoncsv-run").click();
    await expect(page.locator("#cv-jsoncsv-status")).toContainText("Converted");
    await expect
      .poll(async () => page.locator("#cv-jsoncsv-out").inputValue())
      .toContain("Ada");
  });
});

test.describe("error handling edge cases", () => {
  test("image convert rejects a corrupt image without crashing", async ({ page }) => {
    await page.goto("/image/convert");
    await page.locator("#convert-file").setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]),
    });
    await expect(page.locator("#convert-status")).not.toHaveText("");
    await expect(page.locator("#convert-run")).toBeDisabled();
  });

  test("pdf split rejects a non-pdf upload", async ({ page }) => {
    await page.goto("/pdf/split");
    await page.locator("#split-file").setInputFiles({
      name: "fake.pdf",
      mimeType: "application/pdf",
      buffer: PNG,
    });
    await expect(page.locator("#split-status")).toContainText("could not be read as a PDF");
    await expect(page.locator("#split-run")).toBeDisabled();
    await expect(page.locator("h1").first()).toBeVisible();
  });
});
test.describe("qr code generator (image tools)", () => {
  test("generates a QR PNG on /image/qrcode", async ({ page }) => {
    await page.goto("/image/qrcode");
    await expect(page).toHaveTitle(/QR code/i);
    await expect(page.locator("#qr-url")).toBeVisible();
    await page.locator("#qr-url").fill("https://example.com");
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#qr-download").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("qrcode.png");
    const bytes = await readDownload(download);
    expect(bytes.length).toBeGreaterThan(100);
  });
});
