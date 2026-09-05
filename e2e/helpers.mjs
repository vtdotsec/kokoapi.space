import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const ROUTES = ["/", "/image/", "/pdf/", "/convert/", "/secret/", "/qrcode/"];

export const NAV_LABELS = [
  "Image tools",
  "PDF tools",
  "File converter",
  "Secret Sender",
  "QR toolkit",
];

export function fixture(name) {
  return fs.readFileSync(path.join(here, "fixtures", name));
}

// Asserts the page has exactly one theme button and that clicking it toggles
// data-theme, the sun/moon icons and localStorage.
export async function assertThemeToggle(page) {
  const toggle = page.locator("#theme-toggle");
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeVisible();
  await expect(toggle).not.toHaveText(/EN|PT|flag/i);
  await expect(page.locator("#lang-toggle")).toHaveCount(0);

  await page.evaluate(() => localStorage.removeItem("koko-theme"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".theme-ico-dark")).toBeVisible();
  await expect(page.locator(".theme-ico-light")).toBeHidden();

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator(".theme-ico-light")).toBeVisible();
  await expect(page.locator(".theme-ico-dark")).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem("koko-theme"))).toBe("light");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("koko-theme"))).toBe("dark");
}

// Simulates dropping a file onto a label.file-drop (drag & drop path).
export async function dropFile(page, inputSelector, fileName, buffer, mimeType) {
  const b64 = buffer.toString("base64");
  await page.evaluate(
    ({ sel, name, data, mime }) => {
      const bin = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const file = new File([bin], name, { type: mime });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector(sel);
      const label = input ? input.closest("label") : null;
      if (!label) throw new Error("drop target not found");
      label.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
      // Headless engines do not always construct DragEvent.dataTransfer; fall
      // back to setting the input directly (same processing path).
      if (!input.files || input.files.length === 0) {
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    { sel: inputSelector, name: fileName, data: b64, mime: mimeType },
  );
}

export async function readDownload(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}
