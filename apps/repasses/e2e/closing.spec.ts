import { test, expect } from "@playwright/test";
import path from "node:path";

const example = path.resolve("public/exemplo.csv");

test("importa, revisa, fecha e exporta CSV e PDF", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seu fechamento," })).toBeVisible();
  await page.locator("#csv-file").setInputFiles(example);
  await expect(page.getByRole("heading", { name: "Relacione as colunas." })).toBeVisible();
  await page.getByRole("button", { name: /Ver prévia do fechamento/ }).click();
  await expect(page.getByRole("heading", { name: "Revise antes de fechar." })).toBeVisible();
  await expect(page.locator("#review-flags")).toContainText("devolução");
  await page.getByRole("button", { name: /Confirmar fechamento/ }).click();
  await expect(page.getByRole("heading", { name: "Fechamento consolidado." })).toBeVisible();
  await expect(page.locator("#supplier-results")).toContainText("Ateliê Aurora");
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportar dados em CSV/ }).click();
  expect((await csv).suggestedFilename()).toMatch(/\.csv$/);
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: /Baixar relatório PDF/ }).click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  const supplierPdf = page.waitForEvent("download");
  await page.locator("[data-supplier-pdf]").first().click();
  expect((await supplierPdf).suggestedFilename()).toMatch(/repasse-.*\.pdf$/);
});

test("permanece navegável em celular sem overflow horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Seu fechamento," })).toBeVisible();
  await expect(page.locator("#drop-area")).toBeInViewport({ ratio: 0.9 });
  const sizes = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(sizes.body).toBeLessThanOrEqual(sizes.viewport + 1);
});

test("lê o CSV localmente sem enviar conteúdo em uma requisição", async ({ page }) => {
  const payloads: string[] = [];
  page.on("request", (request) => { if (request.postData()) payloads.push(request.url()); });
  await page.goto("/");
  await page.locator("#csv-file").setInputFiles(example);
  await expect(page.getByRole("heading", { name: "Relacione as colunas." })).toBeVisible();
  expect(payloads).toEqual([]);
});
