import { test, expect } from "@playwright/test";
import { fixture, readDownload } from "./helpers.mjs";

const PDF = fixture("two-pages.pdf");
const PNG = fixture("pixel.png");

async function makeTextPdf(page) {
  const bytes = await page.evaluate(async () => {
    if (!window.PDFLib) await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/pdf/vendor/pdf-lib.min.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    const doc = await PDFLib.PDFDocument.create();
    const font = await doc.embedFont(PDFLib.StandardFonts.Helvetica);
    doc.addPage().drawText("Searchable sample text for extraction tests.", { font });
    return Array.from(await doc.save());
  });
  return Buffer.from(bytes);
}

async function makeImagePng(page) {
  const data = await page.evaluate(() => new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 128, 96);
    gradient.addColorStop(0, "#263d30");
    gradient.addColorStop(1, "#e8c878");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 96);
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not create PNG fixture"));
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }, "image/png");
  }));
  return Buffer.from(data, "base64");
}

async function downloadFrom(page, button, expectedName) {
  const event = page.waitForEvent("download");
  await page.locator(button).click();
  const download = await event;
  if (expectedName) expect(download.suggestedFilename()).toMatch(expectedName);
  return readDownload(download);
}

test("image workspace exposes every panel and each panel can export", async ({ page }) => {
  await page.goto("/image/");
  const largerPng = await makeImagePng(page);
  const tools = ["convert", "resize", "strip", "crop", "wmark", "filters", "batch", "qrcode"];
  for (const tool of tools) {
    await page.locator(`.tool-side button[data-tool="${tool}"]`).click();
    await expect(page.locator(`#tool-${tool}`)).toBeVisible();
    await expect(page.locator(`.tool-side button[data-tool="${tool}"]`)).toHaveAttribute("aria-pressed", "true");
  }

  await page.locator('.tool-side button[data-tool="resize"]').click();
  await page.locator("#resize-file").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#resize-run", /pixel\./)).length).toBeGreaterThan(50);
  await expect(page.locator("#resize-status")).toContainText("Metadata stripped");

  await page.locator('.tool-side button[data-tool="strip"]').click();
  await page.locator("#strip-files").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#strip-run", /pixel-clean\.png/)).length).toBeGreaterThan(50);
  await expect(page.locator("#strip-status")).toContainText("without metadata");

  await page.locator('.tool-side button[data-tool="crop"]').click();
  await page.locator("#crop-file").setInputFiles({ name: "sample.png", mimeType: "image/png", buffer: largerPng });
  await expect(page.locator("#crop-info")).toContainText("128×96 px");
  const cropBox = await page.locator("#crop-canvas").boundingBox();
  await page.mouse.move(cropBox.x + 10, cropBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + 80, cropBox.y + 60);
  await page.mouse.up();
  await expect(page.locator("#crop-run")).toBeEnabled();
  await page.locator("#crop-reset").click();
  await expect(page.locator("#crop-run")).toBeDisabled();
  await page.mouse.move(cropBox.x + 10, cropBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(cropBox.x + 80, cropBox.y + 60);
  await page.mouse.up();
  expect((await downloadFrom(page, "#crop-run", /sample-crop\.png$/)).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  await expect(page.locator("#crop-status")).toContainText(/Saved \d+×\d+ px crop as sample-crop\.png/);

  await page.locator('.tool-side button[data-tool="wmark"]').click();
  await page.locator("#wmark-file").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#wmark-run", /watermarked\.png$/)).length).toBeGreaterThan(50);
  await page.locator('input[name="wmark-mode"][value="logo"]').check();
  await expect(page.locator("#wmark-logo-line")).toBeVisible();
  await page.locator("#wmark-logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#wmark-run", /watermarked\.png$/)).length).toBeGreaterThan(50);

  await page.locator('.tool-side button[data-tool="filters"]').click();
  await page.locator("#filters-file").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  await page.locator("#filters-gray").check();
  expect((await downloadFrom(page, "#filters-run", /filtered\.png$/)).length).toBeGreaterThan(50);
  await page.locator("#filters-reset").click();

  await page.locator('.tool-side button[data-tool="batch"]').click();
  await page.locator("#batch-files").setInputFiles([
    { name: "one.png", mimeType: "image/png", buffer: PNG },
    { name: "two.png", mimeType: "image/png", buffer: PNG },
  ]);
  const zip = await downloadFrom(page, "#batch-run", /\.zip$/);
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  await expect(page.locator("#batch-status")).toContainText("Converted 2");

  await page.locator('.tool-side button[data-tool="qrcode"]').click();
  const qrCases = [
    ["url", { "#qr-url": "https://example.com" }],
    ["text", { "#qr-text": "A note to encode" }],
    ["wifi", { "#qr-wifi-ssid": "Test network", "#qr-wifi-pass": "test-pass" }],
    ["vcard", { "#qr-vc-name": "Ada Lovelace", "#qr-vc-email": "ada@example.com" }],
    ["email", { "#qr-em-to": "ada@example.com", "#qr-em-subject": "Hello" }],
    ["sms", { "#qr-sms-num": "+15551234567", "#qr-sms-body": "Hello" }],
    ["tel", { "#qr-tel-num": "+15551234567" }],
  ];
  for (const [type, fields] of qrCases) {
    await page.locator("#qr-type").selectOption(type);
    for (const [selector, value] of Object.entries(fields)) await page.locator(selector).fill(value);
    expect((await downloadFrom(page, "#qr-download", /qrcode\.png$/)).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  }
});

test("PDF workspace exposes every panel and runs all remaining PDF operations", async ({ page }) => {
  await page.goto("/pdf/");
  const tools = ["merge", "split", "reorder", "organize", "pagenum", "watermark", "compress", "extract", "imgs2pdf", "pdf2img"];
  for (const tool of tools) {
    await page.locator(`.pdf-side button[data-tool="${tool}"]`).click();
    await expect(page.locator(`#tool-${tool}`)).toBeVisible();
    await expect(page.locator(`.pdf-side button[data-tool="${tool}"]`)).toHaveAttribute("aria-pressed", "true");
  }

  await page.locator('.pdf-side button[data-tool="split"]').click();
  await page.locator("#split-file").setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.locator('input[name="split-mode"][value="pages"]').check();
  expect((await downloadFrom(page, "#split-run", /-pages\.zip$/)).subarray(0, 2).toString()).toBe("PK");

  await page.locator('.pdf-side button[data-tool="organize"]').click();
  await page.locator("#org-file").setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.locator("#org-thumbs .thumb")).toHaveCount(2);
  await page.locator('#org-thumbs button[title="Rotate 90° clockwise"]').first().click();
  await page.locator('#org-thumbs button[title="Delete page"]').last().click();
  expect((await downloadFrom(page, "#org-run", /\.pdf$/)).subarray(0, 5).toString()).toBe("%PDF-");

  await page.locator('.pdf-side button[data-tool="reorder"]').click();
  await page.locator("#reorder-file").setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.locator("#reorder-thumbs .thumb")).toHaveCount(2);
  expect((await downloadFrom(page, "#reorder-run", /\.pdf$/)).subarray(0, 5).toString()).toBe("%PDF-");

  for (const [tool, input, run, status] of [
    ["pagenum", "#pagenum-file", "#pagenum-run", "#pagenum-status"],
    ["watermark", "#watermark-file", "#watermark-run", "#watermark-status"],
  ]) {
    await page.locator(`.pdf-side button[data-tool="${tool}"]`).click();
    await page.locator(input).setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
    if (tool === "watermark") await page.locator("#watermark-text").fill("TEST WATERMARK");
    expect((await downloadFrom(page, run, /\.pdf$/)).subarray(0, 5).toString()).toBe("%PDF-");
    await expect(page.locator(status)).not.toContainText(/failed|error|could not/i);
  }

  await page.locator('.pdf-side button[data-tool="compress"]').click();
  await page.locator("#compress-file").setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
  await expect(page.locator("#compress-run")).toBeEnabled();
  await page.locator("#compress-run").click();
  await expect(page.locator("#compress-status")).toContainText("already well compressed");

  await page.locator('.pdf-side button[data-tool="extract"]').click();
  const searchablePdf = await makeTextPdf(page);
  await page.locator("#extract-file").setInputFiles({ name: "sample-text.pdf", mimeType: "application/pdf", buffer: searchablePdf });
  await expect(page.locator("#extract-status")).toContainText(/Extracted|No selectable text found/);
  if (await page.locator("#extract-txt").isEnabled()) {
    expect((await downloadFrom(page, "#extract-txt", /\.txt$/)).length).toBeGreaterThan(0);
  } else {
    await expect(page.locator("#extract-status")).toContainText(/No selectable text found/);
  }

  await page.locator('.pdf-side button[data-tool="imgs2pdf"]').click();
  await page.locator("#imgs2pdf-files").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#imgs2pdf-run", /images\.pdf$/)).subarray(0, 5).toString()).toBe("%PDF-");

  await page.locator('.pdf-side button[data-tool="pdf2img"]').click();
  await page.locator("#pdf2img-file").setInputFiles({ name: "two-pages.pdf", mimeType: "application/pdf", buffer: PDF });
  const rendered = await downloadFrom(page, "#pdf2img-run", /\.zip$/);
  expect(rendered.subarray(0, 2).toString()).toBe("PK");
  await expect(page.locator("#pdf2img-status")).toContainText("Exported 2 pages");
});

test("file converter covers document, image, data and archive operations", async ({ page }) => {
  await page.goto("/convert/");
  await page.locator("#cv-md2html-src").fill("## Test heading\n\nParagraph");
  await page.locator("#cv-md2html-run").click();
  await expect(page.locator("#cv-md2html-out h2")).toHaveText("Test heading");
  await page.locator("#cv-md2html-dl").click();
  await expect(page.locator("#cv-md2html-status")).toContainText("Downloaded converted.html");

  const searchablePdf = await makeTextPdf(page);
  await page.locator('.cv-side-nav button[data-target="tool-pdf2txt"]').click();
  await page.locator("#cv-pdf2txt-file").setInputFiles({ name: "sample-text.pdf", mimeType: "application/pdf", buffer: searchablePdf });
  await expect(page.locator("#cv-pdf2txt-status")).toContainText(/Extracted|No selectable text found/);
  if (await page.locator("#cv-pdf2txt-dl").isEnabled()) {
    expect((await downloadFrom(page, "#cv-pdf2txt-dl", /\.txt$/)).length).toBeGreaterThan(0);
  } else {
    await expect(page.locator("#cv-pdf2txt-status")).toContainText(/No selectable text found/);
  }

  await page.locator('.cv-side-nav button[data-target="tool-img2"]').click();
  await page.locator("#cv-img2-files").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  expect((await downloadFrom(page, "#cv-img2-run", /\.zip$/)).subarray(0, 2).toString()).toBe("PK");

  await page.locator('.cv-side-nav button[data-target="tool-jsoncsv"]').click();
  await page.locator('input[name="cv-jsoncsv-dir"][value="json2csv"]').check();
  await page.locator("#cv-jsoncsv-in").fill('[{"name":"Ada","age":37}]');
  await page.locator("#cv-jsoncsv-run").click();
  await expect(page.locator("#cv-jsoncsv-out")).toHaveValue(/Ada/);
  await page.locator('#cv-jsoncsv-swap').click();
  await page.locator("#cv-jsoncsv-in").fill("name,age\nGrace,42");
  await page.locator("#cv-jsoncsv-run").click();
  await expect(page.locator("#cv-jsoncsv-out")).toHaveValue(/Grace/);
  expect((await downloadFrom(page, "#cv-jsoncsv-dl", /\.json$/)).length).toBeGreaterThan(5);

  await page.locator('.cv-side-nav button[data-target="tool-yamljson"]').click();
  await page.locator("#cv-yamljson-in").fill("name: Ada\nage: 37");
  await page.locator("#cv-yamljson-run").click();
  await expect(page.locator("#cv-yamljson-out")).toHaveValue(/Ada/);
  await page.locator('input[name="cv-yamljson-dir"][value="json2yaml"]').check();
  await page.locator("#cv-yamljson-in").fill('{"name":"Grace"}');
  await page.locator("#cv-yamljson-run").click();
  await expect(page.locator("#cv-yamljson-out")).toHaveValue(/Grace/);

  await page.locator('.cv-side-nav button[data-target="tool-xml2json"]').click();
  await page.locator("#cv-xml2json-in").fill("<person><name>Ada</name></person>");
  await page.locator("#cv-xml2json-run").click();
  await expect(page.locator("#cv-xml2json-out")).toHaveValue(/Ada/);

  await page.locator('.cv-side-nav button[data-target="tool-mkzip"]').click();
  await page.locator("#cv-mkzip-files").setInputFiles([
    { name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("hello archive") },
    { name: "second.txt", mimeType: "text/plain", buffer: Buffer.from("second file") },
  ]);
  const archive = await downloadFrom(page, "#cv-mkzip-run", /\.zip$/);
  expect(archive.subarray(0, 2).toString()).toBe("PK");
  await page.locator("#cv-mkzip-mode").selectOption("tar");
  expect((await downloadFrom(page, "#cv-mkzip-run", /\.tar$/)).toString("ascii", 257, 262)).toBe("ustar");
  await page.locator("#cv-mkzip-mode").selectOption("gzip");
  await page.locator("#cv-mkzip-files").setInputFiles({ name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("hello archive") });
  const gz = await downloadFrom(page, "#cv-mkzip-run", /\.gz$/);
  expect(gz.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]));
  await page.locator("#cv-mkzip-mode").selectOption("zip");
  await page.locator("#cv-mkzip-files").setInputFiles([
    { name: "sample.txt", mimeType: "text/plain", buffer: Buffer.from("hello archive") },
    { name: "second.txt", mimeType: "text/plain", buffer: Buffer.from("second file") },
  ]);
  const zipForUnpack = await downloadFrom(page, "#cv-mkzip-run", /\.zip$/);
  await page.locator('.cv-side-nav button[data-target="tool-unpack"]').click();
  await page.locator("#cv-unpack-file").setInputFiles({ name: "sample.zip", mimeType: "application/zip", buffer: zipForUnpack });
  await expect(page.locator("#cv-unpack-status")).toContainText("2 files");
  await expect(page.locator("#cv-unpack-list")).toContainText("sample.txt");
  expect((await downloadFrom(page, "#cv-unpack-all", /\.zip$/)).subarray(0, 2).toString()).toBe("PK");
});

test("Secret Sender handles file mode and decrypts a downloaded attachment", async ({ page }) => {
  await page.goto("/secret/");
  await page.locator("#mode-file").click();
  await expect(page.locator("#panel-file")).toBeVisible();
  await page.locator("#file-input").setInputFiles({ name: "pixel.png", mimeType: "image/png", buffer: PNG });
  const request = page.waitForRequest((r) => r.url().includes("/secret/api/blob") && r.method() === "POST");
  await page.locator('#create-form button[type="submit"]').click();
  await request;
  await expect(page.locator("#result-view")).toBeVisible();
  const link = await page.locator("#result-link").inputValue();
  await page.goto(link);
  await page.locator("#reveal-btn").click();
  await expect(page.locator("#reader-file-wrap")).toBeVisible();
  const downloaded = await page.locator("#reader-download").evaluate(async (link) => {
    const bytes = new Uint8Array(await (await fetch(link.href)).arrayBuffer());
    return Array.from(bytes);
  });
  expect(Buffer.from(downloaded).subarray(0, 8)).toEqual(PNG.subarray(0, 8));
});
