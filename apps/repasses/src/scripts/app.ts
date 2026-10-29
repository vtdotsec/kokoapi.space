import Papa from "papaparse";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { calculateClosing, formatBRL, normalizeRows, parsePercentToBps, type ColumnMap, type ImportedRows, type Sale, type ClosingSummary, type SettledSale } from "./core";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ROWS = 50_000;
const $ = (id: string) => document.getElementById(id) as HTMLElement & Pick<HTMLInputElement, "value" | "checked">;
const fileInput = $("csv-file") as HTMLInputElement;
const statusBox = $("app-status");
const workflowSections = ["step-import", "step-map", "step-review", "step-result"];
const mappingFields: { key: keyof ColumnMap; label: string; required: boolean; aliases: string[] }[] = [
  { key: "supplier", label: "Consignante", required: true, aliases: ["consignante", "fornecedor", "parceiro", "supplier"] },
  { key: "item", label: "Item ou produto", required: true, aliases: ["item", "produto", "descricao", "descrição", "product"] },
  { key: "amount", label: "Valor bruto da venda", required: true, aliases: ["valor_bruto", "valor", "total", "preco", "preço", "amount"] },
  { key: "date", label: "Data", required: false, aliases: ["data", "date"] },
  { key: "status", label: "Status", required: false, aliases: ["status", "situacao", "situação"] },
  { key: "discount", label: "Desconto", required: false, aliases: ["desconto", "discount"] },
  { key: "commission", label: "Comissão do item (%)", required: false, aliases: ["comissao", "comissão", "taxa", "commission"] },
  { key: "id", label: "ID da venda", required: false, aliases: ["id_venda", "id", "codigo", "código", "pedido"] },
];

let headers: string[] = [];
let rows: string[][] = [];
let filename = "fechamento.csv";
let imported: ImportedRows = { sales: [], invalid: [] };
let closing: ClosingSummary | null = null;
let supplierRates: Record<string, number> = {};
let dateRange: [string, string] = ["", ""];
let filteredRows: Sale[] = [];
let mapping: ColumnMap = { supplier: 0, item: 0, amount: 0 };
let mappingSelects: Partial<Record<keyof ColumnMap, HTMLSelectElement>> = {};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
function announce(message: string, error = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("is-error", error);
  if (error) statusBox.dataset.kind = "error"; else delete statusBox.dataset.kind;
  statusBox.hidden = false;
  statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideStatus() { statusBox.hidden = true; statusBox.textContent = ""; }
function showStep(id: string) {
  workflowSections.forEach((section) => { $(section).hidden = section !== id; });
  document.querySelectorAll<HTMLElement>("[data-step-indicator]").forEach((node) => {
    node.classList.toggle("step-current", node.dataset.stepIndicator === String(workflowSections.indexOf(id) + 1));
  });
  hideStatus();
  $(id).scrollIntoView({ behavior: "smooth", block: "start" });
}
function sniffDelimiter(text: string): string {
  const line = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (delimiter: string) => line.split(delimiter).length - 1;
  return count(";") > count(",") ? ";" : ",";
}
function guessColumn(header: string, index: number): number | undefined {
  const normalized = header.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  for (const field of mappingFields) {
    const aliases = field.aliases.map((alias) => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
    if (aliases.some((alias) => normalized === alias || (alias.length > 3 && normalized.includes(alias)))) mapping[field.key] = index;
  }
  return undefined;
}
function readCsv(file: File) {
  if (file.size > MAX_BYTES) { announce("O arquivo ultrapassa o limite de 10 MB.", true); return; }
  filename = file.name;
  file.text().then((text) => {
    const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), { delimiter: sniffDelimiter(text), skipEmptyLines: "greedy", dynamicTyping: false });
    if (parsed.errors.length) { announce(`Não foi possível ler o CSV: ${parsed.errors[0].message}`, true); return; }
    const table = parsed.data.filter((line) => line.some((cell) => String(cell ?? "").trim()));
    if (table.length < 2) { announce("O CSV precisa ter uma linha de cabeçalho e pelo menos uma venda.", true); return; }
    if (table.length - 1 > MAX_ROWS) { announce(`O arquivo ultrapassa o limite de ${MAX_ROWS.toLocaleString("pt-BR")} linhas.`, true); return; }
    headers = table[0].map((value, i) => String(value || `Coluna ${i + 1}`).trim());
    rows = table.slice(1).map((line) => headers.map((_, i) => String(line[i] ?? "")));
    mapping = {} as ColumnMap;
    headers.forEach(guessColumn);
    $("map-file-name").textContent = `${filename} · ${rows.length.toLocaleString("pt-BR")} linhas`;
    $("file-detail").textContent = `${filename} · ${(file.size / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB`;
    renderMapping();
    showStep("step-map");
  }).catch(() => announce("Falha ao ler o arquivo selecionado.", true));
}
function renderMapping() {
  const grid = $("mapping-grid");
  mappingSelects = {};
  grid.innerHTML = mappingFields.map((field) => {
    const guessed = mapping[field.key];
    const value = guessed === undefined ? "" : String(guessed);
    return `<label class="mapping-field"><span>${escapeHtml(field.label)}${field.required ? " <b>*</b>" : ""}</span><select data-map="${field.key}" aria-label="Coluna: ${escapeHtml(field.label)}"><option value="">${field.required ? "Selecione uma coluna" : "Não usar"}</option>${headers.map((header, index) => `<option value="${index}" ${value === String(index) ? "selected" : ""}>${escapeHtml(header)}</option>`).join("")}</select></label>`;
  }).join("");
  grid.querySelectorAll<HTMLSelectElement>("select[data-map]").forEach((select) => {
    const key = select.dataset.map as keyof ColumnMap;
    mappingSelects[key] = select;
    select.addEventListener("change", () => { const val = select.value; if (val === "") delete mapping[key]; else (mapping as Record<string, number>)[key] = Number(val); renderMappingPreview(); });
  });
  renderMappingPreview();
}
function renderMappingPreview() {
  const sample = rows.slice(0, 4);
  $("mapping-preview").innerHTML = `<table><thead><tr>${headers.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead><tbody>${sample.map((row) => `<tr>${headers.map((_, i) => `<td>${escapeHtml(row[i])}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function getMapping(): ColumnMap | null {
  const selected: Record<string, number> = {};
  mappingSelects && Object.entries(mappingSelects).forEach(([key, select]) => { if (select?.value !== "") selected[key] = Number(select!.value); });
  if (["supplier", "item", "amount"].some((key) => selected[key] === undefined)) return null;
  return selected as ColumnMap;
}
function withinDateRange(sale: Sale) {
  if (!sale.date) return true;
  const date = normalizeDate(sale.date);
  return (!dateRange[0] || !date || date >= dateRange[0]) && (!dateRange[1] || !date || date <= dateRange[1]);
}
function normalizeDate(value: string): string {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const br = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  return br ? `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}` : "";
}
function currentCommission() {
  return parsePercentToBps($("default-commission").value) ?? 3000;
}
function currentClosing() {
  const duplicates = ($("include-duplicates") as HTMLInputElement).checked;
  return calculateClosing(filteredRows, currentCommission(), supplierRates, duplicates);
}
function summaryCards(data: ClosingSummary) {
  return `<article class="summary-cell"><span class="summary-label">Vendas consideradas</span><strong class="summary-value">${data.soldCount}</strong></article><article class="summary-cell"><span class="summary-label">Valor das vendas</span><strong class="summary-value">${formatBRL(data.grossCents)}</strong></article><article class="summary-cell"><span class="summary-label">Comissão da loja</span><strong class="summary-value">${formatBRL(data.commissionCents)}</strong></article><article class="summary-cell emphasis"><span class="summary-label">Repasses</span><strong class="summary-value">${formatBRL(data.payoutCents)}</strong></article>`;
}
function renderReview() {
  filteredRows = imported.sales.filter(withinDateRange);
  const duplicates = filteredRows.filter((sale) => sale.possibleDuplicate).length;
  const returned = filteredRows.filter((sale) => sale.status === "returned").length;
  const unsold = filteredRows.filter((sale) => sale.status === "unsold").length;
  $("review-file-name").textContent = `${filename} · ${filteredRows.length.toLocaleString("pt-BR")} linhas válidas`;
  const firstAndLast = imported.sales.map((sale) => normalizeDate(sale.date)).filter(Boolean).sort();
  if (firstAndLast.length && !$("period-start").value) { $("period-start").value = firstAndLast[0]; $("period-end").value = firstAndLast.at(-1)!; }
  dateRange = [$("period-start").value, $("period-end").value];
  $("review-summary").innerHTML = summaryCards(calculateClosing(filteredRows, currentCommission(), supplierRates, false));
  const suppliers = [...new Set(filteredRows.map((sale) => sale.supplier))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  $("supplier-rates").innerHTML = suppliers.length ? suppliers.map((supplier) => `<label class="supplier-rate-row"><span>${escapeHtml(supplier)}</span><span class="percent-input"><input type="text" inputmode="decimal" data-supplier-rate="${escapeHtml(supplier)}" placeholder="${(currentCommission() / 100).toLocaleString("pt-BR")}" value="${supplierRates[supplier] === undefined ? "" : (supplierRates[supplier] / 100).toLocaleString("pt-BR")}" aria-label="Comissão para ${escapeHtml(supplier)}" /><b>%</b></span></label>`).join("") : "<p>Nenhum consignante no período selecionado.</p>";
  $("supplier-rates").querySelectorAll<HTMLInputElement>("[data-supplier-rate]").forEach((input) => input.addEventListener("input", () => {
    const supplier = input.dataset.supplierRate!;
    const rate = input.value.trim() ? parsePercentToBps(input.value) : null;
    if (rate === null) {
      if (input.value.trim()) { input.setAttribute("aria-invalid", "true"); input.title = "Informe uma taxa entre 0% e 100%."; return; }
      delete supplierRates[supplier];
    } else { input.removeAttribute("aria-invalid"); input.removeAttribute("title"); supplierRates[supplier] = rate; }
    updateReviewSummary();
  }));
  const flags: string[] = [];
  if (imported.invalid.length) flags.push(`<p class="flag-item invalid">${imported.invalid.length} linha(s) com dados inválidos foram retiradas do cálculo.</p>`);
  if (duplicates) flags.push(`<p class="flag-item">${duplicates} possível(is) duplicata(s): a segunda linha em diante fica fora por padrão.</p>`);
  if (returned) flags.push(`<p class="flag-item">${returned} devolução(ões) fora do repasse.</p>`);
  if (unsold) flags.push(`<p class="flag-item">${unsold} item(ns) não vendido(s) fora do repasse.</p>`);
  if (!flags.length) flags.push("<p class=\"flag-item\">Nenhuma inconsistência identificada.</p>");
  $("review-flags").classList.add("flags-list");
  $("review-flags").innerHTML = `${flags.join("")}${imported.invalid.slice(0, 5).map((invalid) => `<details class="invalid-row"><summary>Linha ${invalid.rowNumber}: ${escapeHtml(invalid.reasons.join(" "))}</summary><code>${escapeHtml(invalid.raw.join(" · "))}</code></details>`).join("")}`;
  $("duplicate-choice").hidden = duplicates === 0;
  renderSalesPreview();
}
function updateReviewSummary() { $("review-summary").innerHTML = summaryCards(calculateClosing(filteredRows, currentCommission(), supplierRates, $("include-duplicates").checked)); }
function renderSalesPreview() {
  const data = calculateClosing(filteredRows, currentCommission(), supplierRates, ($("include-duplicates") as HTMLInputElement).checked);
  $("sales-preview").innerHTML = `<table><thead><tr><th>Item</th><th>Consignante</th><th>Status</th><th>Venda</th><th>Comissão</th><th>Repasse</th></tr></thead><tbody>${data.rows.slice(0, 100).map((item) => `<tr class="${item.included ? "" : "row-muted"}"><td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.supplier)}</td><td><span class="status-tag ${item.status === "returned" ? "returned" : item.status === "unsold" ? "unsold" : item.possibleDuplicate ? "duplicate" : ""}">${item.included ? "Vendida" : escapeHtml(item.excludedReason)}</span></td><td>${formatBRL(item.grossCents)}</td><td>${item.included ? formatBRL(item.commissionCents) : "—"}</td><td>${item.included ? formatBRL(item.payoutCents) : "—"}</td></tr>`).join("")}</tbody></table>${data.rows.length > 100 ? `<p class="table-note">Mostrando 100 de ${data.rows.length} linhas.</p>` : ""}`;
  updateReviewSummary();
}
function renderResults(data: ClosingSummary) {
  $("final-summary").innerHTML = summaryCards(data);
  const periodStart = $("period-start").value;
  const periodEnd = $("period-end").value;
  $("result-period").textContent = periodStart || periodEnd ? `Período: ${periodStart || "início"} a ${periodEnd || "hoje"}` : `${filename} · ${data.soldCount} venda(s) incluída(s)`;
  $("supplier-results").innerHTML = `<table class="final-table"><thead><tr><th>Consignante</th><th>Itens</th><th>Vendas líquidas</th><th>Comissão</th><th>Repasse</th><th>Demonstrativo</th></tr></thead><tbody>${data.suppliers.map((supplier) => `<tr><td class="supplier-name">${escapeHtml(supplier.supplier)}</td><td>${supplier.itemCount}</td><td>${formatBRL(supplier.netCents)}</td><td>${formatBRL(supplier.commissionCents)}</td><td class="money-strong">${formatBRL(supplier.payoutCents)}</td><td><button class="row-pdf" type="button" data-supplier-pdf="${escapeHtml(supplier.supplier)}">PDF ↓</button></td></tr>`).join("")}</tbody></table>`;
  const excluded = data.rows.filter((sale) => !sale.included);
  $("excluded-details").hidden = excluded.length === 0;
  $("excluded-count").textContent = `· ${excluded.length}`;
  $("excluded-results").innerHTML = `<ul>${excluded.map((sale) => `<li>${escapeHtml(sale.supplier)} — ${escapeHtml(sale.item)}: ${escapeHtml(sale.excludedReason)}</li>`).join("")}</ul>`;
  $("supplier-results").querySelectorAll<HTMLButtonElement>("[data-supplier-pdf]").forEach((button) => button.addEventListener("click", () => {
    const supplier = data.suppliers.find((entry) => entry.supplier === button.dataset.supplierPdf);
    if (supplier) void exportPdf(supplier.supplier, supplier.items.filter((item) => item.included));
  }));
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function exportCsv() {
  if (!closing) return;
  const csvRows = [["consignante", "item", "data", "status", "valor_bruto", "desconto", "venda_liquida", "comissao_percentual", "comissao_valor", "repasse", "incluido", "motivo_exclusao"], ...closing.rows.map((sale) => [sale.supplier, sale.item, sale.date, sale.status, (sale.grossCents / 100).toFixed(2).replace(".", ","), (sale.discountCents / 100).toFixed(2).replace(".", ","), (sale.netCents / 100).toFixed(2).replace(".", ","), (sale.commissionBps / 100).toFixed(2).replace(".", ","), (sale.commissionCents / 100).toFixed(2).replace(".", ","), (sale.payoutCents / 100).toFixed(2).replace(".", ","), sale.included ? "sim" : "não", sale.excludedReason ?? ""]), ["RESUMO", "", "", "", (closing.grossCents / 100).toFixed(2).replace(".", ","), (closing.discountCents / 100).toFixed(2).replace(".", ","), (closing.netCents / 100).toFixed(2).replace(".", ","), "", (closing.commissionCents / 100).toFixed(2).replace(".", ","), (closing.payoutCents / 100).toFixed(2).replace(".", ","), "", ""]];
  const csv = "\uFEFF" + Papa.unparse(csvRows, { delimiter: ";", newline: "\r\n" });
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `repasses-${dateStamp()}.csv`);
}
function dateStamp() { return new Date().toISOString().slice(0, 10); }
function safeFilename(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "consignante"; }
function pdfText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?"); }
async function exportPdf(supplierName?: string, items?: SettledSale[]) {
  if (!closing) return;
  try {
    const doc = await PDFDocument.create();
    doc.setTitle(supplierName ? `Demonstrativo — ${supplierName}` : "Fechamento de consignação");
    doc.setAuthor("Repasses · kokoapi.space");
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const rowsToPrint = (items ?? closing.rows.filter((sale) => sale.included)).filter((sale) => sale.included);
    const summary = supplierName ? closing.suppliers.find((entry) => entry.supplier === supplierName) : undefined;
    let page = doc.addPage([595, 842]); let y = 790;
    const addPage = () => { page = doc.addPage([595, 842]); y = 790; };
    const write = (text: string, size = 10, strong = false, x = 48) => { if (y < 55) addPage(); page.drawText(pdfText(text), { x, y, size, font: strong ? bold : font, color: rgb(0.12, 0.2, 0.17), maxWidth: 500 }); y -= size + 8; };
    write(supplierName ? "DEMONSTRATIVO DE REPASSE" : "FECHAMENTO DE CONSIGNACAO", 10, true);
    write(supplierName ?? "Relatorio consolidado", 23, true); write("Repasses · kokoapi.space", 10);
    const period = $("period-start").value || $("period-end").value ? `${$("period-start").value || "inicio"} a ${$("period-end").value || "hoje"}` : filename;
    write(`Periodo: ${period}`, 10); y -= 10;
    if (supplierName && summary) {
      write(`Itens incluidos: ${summary.itemCount}`, 11, true);
      write(`Vendas liquidas: ${formatBRL(summary.netCents)}   |   Comissao: ${formatBRL(summary.commissionCents)}   |   Repasse: ${formatBRL(summary.payoutCents)}`, 11, true);
    } else {
      write(`Vendas: ${closing.soldCount}   |   Bruto: ${formatBRL(closing.grossCents)}   |   Descontos: ${formatBRL(closing.discountCents)}`, 10, true);
      write(`Comissao: ${formatBRL(closing.commissionCents)}   |   Total a repassar: ${formatBRL(closing.payoutCents)}`, 12, true);
    }
    y -= 15; write("ITEM / CONSIGNANTE                         VENDA        COMISSAO         REPASSE", 8, true);
    page.drawLine({ start: { x: 48, y: y + 2 }, end: { x: 547, y: y + 2 }, thickness: 0.7, color: rgb(0.75, 0.76, 0.71) }); y -= 8;
    for (const item of rowsToPrint) {
      if (y < 65) { addPage(); write("ITEM / CONSIGNANTE                         VENDA        COMISSAO         REPASSE", 8, true); y -= 8; }
      const label = supplierName ? item.item : `${item.supplier} · ${item.item}`;
      page.drawText(pdfText(label.slice(0, 38)), { x: 48, y, size: 8, font, color: rgb(0.12, 0.2, 0.17) });
      page.drawText(pdfText(formatBRL(item.netCents)), { x: 337, y, size: 8, font, color: rgb(0.12, 0.2, 0.17) });
      page.drawText(pdfText(formatBRL(item.commissionCents)), { x: 421, y, size: 8, font, color: rgb(0.12, 0.2, 0.17) });
      page.drawText(pdfText(formatBRL(item.payoutCents)), { x: 494, y, size: 8, font, color: rgb(0.12, 0.2, 0.17) });
      y -= 17;
    }
    for (const pdfPage of doc.getPages()) pdfPage.drawText("Gerado localmente no navegador · Repasses · kokoapi.space", { x: 48, y: 28, size: 8, font, color: rgb(0.42, 0.45, 0.41) });
    const bytes = await doc.save();
    const pdfBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(pdfBuffer).set(bytes);
    downloadBlob(new Blob([pdfBuffer], { type: "application/pdf" }), supplierName ? `repasse-${safeFilename(supplierName)}-${dateStamp()}.pdf` : `fechamento-repasses-${dateStamp()}.pdf`);
  } catch { announce("Não foi possível gerar o PDF. Tente novamente.", true); }
}

fileInput.addEventListener("change", () => { const file = fileInput.files?.[0]; if (file) readCsv(file); });
const dropArea = $("drop-area");
dropArea.addEventListener("dragover", (event) => { event.preventDefault(); dropArea.classList.add("is-dragging"); });
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("is-dragging"));
dropArea.addEventListener("drop", (event) => { event.preventDefault(); dropArea.classList.remove("is-dragging"); const file = (event as DragEvent).dataTransfer?.files[0]; if (file) readCsv(file); });
$("preview-closing").addEventListener("click", () => {
  const selected = getMapping();
  if (!selected) { announce("Relacione as três colunas obrigatórias: consignante, item e valor bruto.", true); return; }
  mapping = selected;
  imported = normalizeRows(rows, mapping);
  supplierRates = {};
  dateRange = ["", ""];
  $("period-start").value = ""; $("period-end").value = "";
  $("include-duplicates").checked = false;
  renderReview(); showStep("step-review");
});
$("back-import").addEventListener("click", () => showStep("step-import"));
$("back-map").addEventListener("click", () => showStep("step-map"));
$("default-commission").addEventListener("input", () => { if (parsePercentToBps($("default-commission").value) !== null) renderReview(); });
$("period-start").addEventListener("change", () => { dateRange = [$("period-start").value, $("period-end").value]; renderReview(); });
$("period-end").addEventListener("change", () => { dateRange = [$("period-start").value, $("period-end").value]; renderReview(); });
$("include-duplicates").addEventListener("change", renderSalesPreview);
$("confirm-closing").addEventListener("click", () => { closing = currentClosing(); renderResults(closing); showStep("step-result"); });
$("export-csv").addEventListener("click", exportCsv);
$("export-all-pdf").addEventListener("click", () => void exportPdf());
$("new-closing").addEventListener("click", () => { fileInput.value = ""; rows = []; imported = { sales: [], invalid: [] }; closing = null; supplierRates = {}; showStep("step-import"); });

if (import.meta.env.DEV) {
  Object.assign(window, { __repassesTest: { normalizeRows, calculateClosing, parsePercentToBps } });
}
