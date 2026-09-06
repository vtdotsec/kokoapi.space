import { test, expect } from "@playwright/test";
import { fixture, dropFile, readDownload } from "./helpers.mjs";

const PDF1 = fixture("two-pages.pdf");
const PDF2 = fixture("one-page.pdf");
const PNG = fixture("pixel.png");

test.describe("image tools", () => {
  test("convert upload and download", async ({ page }) => {
    await page.goto("/image/");
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
    await page.goto("/image/");
    await dropFile(page, "#resize-file", "dropped.png", PNG, "image/png");
    await expect(page.locator("#resize-info")).toContainText("dropped.png");
  });

  test("crop landing page embeds the crop tool pre-selected", async ({ page }) => {
    await page.goto("/image/crop");
    await expect(page).toHaveTitle(/Crop/);
    const frame = page.frameLocator("iframe[data-koko-widget]");
    await expect(frame.locator("#tool-crop")).toBeVisible();
    await expect(frame.locator("#tool-convert")).toBeHidden();
  });
});

test.describe("pdf tools", () => {
  test("merge two pdfs into one file", async ({ page }) => {
    await page.goto("/pdf/");
    await page.locator(".seg-btn[data-tool='merge']").click();
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
    await page.goto("/pdf/");
    await page.locator(".seg-btn[data-tool='split']").click();
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

  test("merge-pdf landing page embeds the merge tool pre-selected", async ({ page }) => {
    await page.goto("/pdf/merge-pdf");
    await expect(page).toHaveTitle(/Merge PDF/);
    await expect(page.locator("h1")).toContainText("Merge PDF");
    const frame = page.frameLocator("iframe[data-koko-widget]");
    await expect(frame.locator("#tool-merge")).toBeVisible();
    await expect(frame.locator("#tool-compress")).toBeHidden();
  });

  test("compress-pdf landing page embeds the compress tool pre-selected", async ({ page }) => {
    await page.goto("/pdf/compress-pdf");
    await expect(page).toHaveTitle(/Compress PDF/);
    const frame = page.frameLocator("iframe[data-koko-widget]");
    await expect(frame.locator("#tool-compress")).toBeVisible();
    await expect(frame.locator("#tool-merge")).toBeHidden();
  });
});

test.describe("file converter", () => {
  test("markdown produces a non-empty PDF", async ({ page }) => {
    await page.goto("/convert/");
    await page.locator('.cv-side-nav [data-target="tool-m2p"]').click();
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
    await page.goto("/convert/");
    await page.locator('.cv-side-nav [data-target="tool-jsoncsv"]').click();
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
    await page.goto("/image/");
    await page.locator("#convert-file").setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]),
    });
    await expect(page.locator("#convert-status")).not.toHaveText("");
    await expect(page.locator("#convert-run")).toBeDisabled();
  });

  test("pdf split rejects a non-pdf upload", async ({ page }) => {
    await page.goto("/pdf/");
    await page.locator(".seg-btn[data-tool='split']").click();
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
    const frame = page.frameLocator("iframe[data-koko-widget]");
    await frame.locator("#qr-url").fill("https://example.com");
    await expect(frame.locator("#qr-canvas")).not.toHaveJSProperty("width", 0);
    const downloadPromise = page.waitForEvent("download");
    await frame.locator("#qr-download").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("qrcode.png");
    const bytes = await readDownload(download);
    expect(bytes.length).toBeGreaterThan(100);
  });
});
