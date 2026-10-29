export type SaleStatus = "sold" | "unsold" | "returned";

export type ColumnMap = {
  supplier: number;
  item: number;
  amount: number;
  date?: number;
  status?: number;
  discount?: number;
  commission?: number;
  id?: number;
};

export type Sale = {
  id: string;
  supplier: string;
  item: string;
  date: string;
  status: SaleStatus;
  grossCents: number;
  discountCents: number;
  commissionBps?: number;
  rowNumber: number;
  possibleDuplicate: boolean;
  duplicateOf?: string;
};

export type InvalidSale = {
  rowNumber: number;
  raw: string[];
  reasons: string[];
};

export type ImportedRows = {
  sales: Sale[];
  invalid: InvalidSale[];
};

export type SettledSale = Sale & {
  netCents: number;
  commissionBps: number;
  commissionCents: number;
  payoutCents: number;
  included: boolean;
  excludedReason?: string;
};

export type SupplierSummary = {
  supplier: string;
  itemCount: number;
  grossCents: number;
  discountCents: number;
  netCents: number;
  commissionCents: number;
  payoutCents: number;
  defaultCommissionBps: number;
  items: SettledSale[];
};

export type ClosingSummary = {
  rows: SettledSale[];
  suppliers: SupplierSummary[];
  soldCount: number;
  excludedCount: number;
  duplicateCount: number;
  grossCents: number;
  discountCents: number;
  netCents: number;
  commissionCents: number;
  payoutCents: number;
};

/** Parse common Brazilian and international currency spellings into exact cents. */
export function parseMoneyToCents(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  let value = String(input).trim();
  if (!value) return null;

  value = value.replace(/R\$/gi, "").replace(/[\s\u00a0]/g, "").replace(/[^\d.,+-]/g, "");
  if (!value || !/[\d]/.test(value)) return null;

  const negative = value.startsWith("-");
  value = value.replace(/[+-]/g, "");
  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  let decimalIndex = -1;

  if (comma >= 0 && dot >= 0) {
    decimalIndex = Math.max(comma, dot);
  } else if (comma >= 0) {
    decimalIndex = comma;
  } else if (dot >= 0) {
    const trailing = value.length - dot - 1;
    const dots = (value.match(/\./g) || []).length;
    if (trailing > 0 && trailing < 3) decimalIndex = dot;
    else if (dots > 1 && trailing > 0 && trailing < 3) decimalIndex = dot;
  }

  const wholeText = (decimalIndex >= 0 ? value.slice(0, decimalIndex) : value).replace(/[.,]/g, "") || "0";
  const fractionText = decimalIndex >= 0 ? value.slice(decimalIndex + 1).replace(/[.,]/g, "") : "";
  if (!/^\d+$/.test(wholeText) || (fractionText && !/^\d+$/.test(fractionText))) return null;

  let cents = BigInt(wholeText) * 100n;
  const fraction = (fractionText + "00").slice(0, 2);
  cents += BigInt(fraction || "0");
  if ((fractionText[2] || "0") >= "5") cents += 1n;
  if (negative) cents *= -1n;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) return null;
  return Number(cents);
}

/** Convert 0–100 percentage text with up to two decimal places into basis points. */
export function parsePercentToBps(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  let value = String(input).trim().replace(/%/g, "").replace(/[\s\u00a0]/g, "");
  if (!value) return null;
  const negative = value.startsWith("-");
  value = value.replace(/[+-]/g, "");
  if (!/[\d]/.test(value)) return null;

  const comma = value.lastIndexOf(",");
  const dot = value.lastIndexOf(".");
  let decimalIndex = -1;
  if (comma >= 0 && dot >= 0) decimalIndex = Math.max(comma, dot);
  else if (comma >= 0) decimalIndex = comma;
  else if (dot >= 0) decimalIndex = dot;

  const wholeText = (decimalIndex >= 0 ? value.slice(0, decimalIndex) : value).replace(/[.,]/g, "") || "0";
  const fractionText = decimalIndex >= 0 ? value.slice(decimalIndex + 1).replace(/[.,]/g, "") : "";
  if (!/^\d+$/.test(wholeText) || (fractionText && !/^\d+$/.test(fractionText))) return null;

  let bps = BigInt(wholeText) * 100n + BigInt((fractionText + "00").slice(0, 2) || "0");
  if ((fractionText[2] || "0") >= "5") bps += 1n;
  if (negative) bps *= -1n;
  if (bps < 0n || bps > 10_000n) return null;
  return Number(bps);
}

export function statusFromText(input: unknown): SaleStatus | null {
  const value = String(input ?? "").trim().toLocaleLowerCase("pt-BR");
  if (!value) return "sold";
  if (["vendido", "vendida", "venda", "sold", "pago", "ok", "sim", "yes"].includes(value)) return "sold";
  if (["devolvido", "devolvida", "devolução", "devolucao", "returned", "estornado", "estornada", "refund"].includes(value)) return "returned";
  if (["não vendido", "nao vendido", "não vendida", "nao vendida", "unsold", "estoque", "disponível", "disponivel", "cancelado", "cancelada"].includes(value)) return "unsold";
  return null;
}

function cell(row: unknown[], index: number | undefined): string {
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

export function normalizeRows(rows: unknown[][], columns: ColumnMap): ImportedRows {
  const sales: Sale[] = [];
  const invalid: InvalidSale[] = [];

  rows.forEach((unknownRow, index) => {
    const raw = Array.isArray(unknownRow) ? unknownRow.map((value) => String(value ?? "")) : [];
    if (raw.every((value) => !value.trim())) return;

    const rowNumber = index + 2;
    const supplier = cell(raw, columns.supplier);
    const item = cell(raw, columns.item);
    const amountText = cell(raw, columns.amount);
    const grossCents = parseMoneyToCents(amountText);
    const discountText = cell(raw, columns.discount);
    const discountCents = discountText ? parseMoneyToCents(discountText) : 0;
    const statusText = cell(raw, columns.status);
    const status = statusFromText(statusText);
    const commissionText = cell(raw, columns.commission);
    const commissionBps = commissionText ? parsePercentToBps(commissionText) : undefined;

    const reasons: string[] = [];
    if (!supplier) reasons.push("Informe o consignante.");
    if (!item) reasons.push("Informe o item vendido.");
    if (grossCents === null || grossCents <= 0) reasons.push("Valor da venda inválido ou zerado.");
    if (discountCents === null || discountCents < 0) reasons.push("Desconto inválido.");
    if (grossCents !== null && discountCents !== null && discountCents > grossCents) reasons.push("Desconto maior que o valor da venda.");
    if (!status) reasons.push("Status não reconhecido.");
    if (commissionText && commissionBps === null) reasons.push("Comissão deve ficar entre 0% e 100%.");

    if (reasons.length || grossCents === null || discountCents === null || !status) {
      invalid.push({ rowNumber, raw, reasons });
      return;
    }

    const id = cell(raw, columns.id) || `linha-${rowNumber}`;
    sales.push({
      id,
      supplier,
      item,
      date: cell(raw, columns.date),
      status,
      grossCents,
      discountCents,
      commissionBps: commissionText ? commissionBps ?? undefined : undefined,
      rowNumber,
      possibleDuplicate: false,
    });
  });

  const seen = new Map<string, string>();
  for (const sale of sales) {
    const key = sale.id.startsWith("linha-")
      ? [sale.supplier, sale.item, sale.date, sale.status, sale.grossCents, sale.discountCents].join("\u001f")
      : `id:${sale.id}`;
    const original = seen.get(key);
    if (original) {
      sale.possibleDuplicate = true;
      sale.duplicateOf = original;
    } else {
      seen.set(key, sale.id);
    }
  }

  return { sales, invalid };
}

export function commissionCents(baseCents: number, bps: number): number {
  const value = BigInt(baseCents) * BigInt(bps);
  const rounded = (value + 5_000n) / 10_000n;
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("Comissão excede o limite seguro.");
  return Number(rounded);
}

export function calculateClosing(
  sales: Sale[],
  defaultCommissionBps: number,
  supplierRates: Record<string, number> = {},
  includeDuplicates = false,
): ClosingSummary {
  if (!Number.isInteger(defaultCommissionBps) || defaultCommissionBps < 0 || defaultCommissionBps > 10_000) {
    throw new RangeError("A comissão padrão deve ficar entre 0% e 100%.");
  }

  const groups = new Map<string, SupplierSummary>();
  const rows: SettledSale[] = sales.map((sale) => {
    const isSold = sale.status === "sold";
    const commissionBps = sale.commissionBps ?? supplierRates[sale.supplier] ?? defaultCommissionBps;
    const netCents = sale.grossCents - sale.discountCents;
    const duplicateExcluded = sale.possibleDuplicate && !includeDuplicates;
    const included = isSold && !duplicateExcluded;
    const commission = included ? commissionCents(netCents, commissionBps) : 0;
    const settled: SettledSale = {
      ...sale,
      netCents,
      commissionBps,
      commissionCents: commission,
      payoutCents: included ? netCents - commission : 0,
      included,
      excludedReason: duplicateExcluded ? "Possível duplicidade" : isSold ? undefined : sale.status === "returned" ? "Devolvido" : "Não vendido",
    };

    if (!groups.has(sale.supplier)) {
      groups.set(sale.supplier, {
        supplier: sale.supplier,
        itemCount: 0,
        grossCents: 0,
        discountCents: 0,
        netCents: 0,
        commissionCents: 0,
        payoutCents: 0,
        defaultCommissionBps: supplierRates[sale.supplier] ?? defaultCommissionBps,
        items: [],
      });
    }
    const group = groups.get(sale.supplier)!;
    group.items.push(settled);
    if (included) {
      group.itemCount += 1;
      group.grossCents += sale.grossCents;
      group.discountCents += sale.discountCents;
      group.netCents += netCents;
      group.commissionCents += commission;
      group.payoutCents += settled.payoutCents;
    }
    return settled;
  });

  const suppliers = Array.from(groups.values()).sort((a, b) => a.supplier.localeCompare(b.supplier, "pt-BR"));
  const includedRows = rows.filter((row) => row.included);
  return {
    rows,
    suppliers,
    soldCount: includedRows.length,
    excludedCount: rows.length - includedRows.length,
    duplicateCount: rows.filter((row) => row.possibleDuplicate).length,
    grossCents: includedRows.reduce((total, row) => total + row.grossCents, 0),
    discountCents: includedRows.reduce((total, row) => total + row.discountCents, 0),
    netCents: includedRows.reduce((total, row) => total + row.netCents, 0),
    commissionCents: includedRows.reduce((total, row) => total + row.commissionCents, 0),
    payoutCents: includedRows.reduce((total, row) => total + row.payoutCents, 0),
  };
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
