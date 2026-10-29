import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateClosing, commissionCents, formatBRL, normalizeRows, parseMoneyToCents, parsePercentToBps } from "../src/scripts/core.ts";

describe("parsing BRL values and rates", () => {
  it("reads Brazilian and international decimal spellings into cents", () => {
    assert.equal(parseMoneyToCents("R$ 1.234,56"), 123456);
    assert.equal(parseMoneyToCents("1,234.56"), 123456);
    assert.equal(parseMoneyToCents("12,5"), 1250);
    assert.equal(parseMoneyToCents("-R$ 2,00"), -200);
    assert.equal(parseMoneyToCents("lixo"), null);
  });
  it("accepts rates through 100 percent with two decimals", () => {
    assert.equal(parsePercentToBps("30,5%"), 3050);
    assert.equal(parsePercentToBps("100"), 10000);
    assert.equal(parsePercentToBps("100,01"), null);
    assert.equal(parsePercentToBps("-1"), null);
  });
  it("formats cent values in Brazilian currency", () => assert.equal(formatBRL(123456), "R$ 1.234,56"));
});

describe("CSV row validation and closing rules", () => {
  const map = { supplier: 0, item: 1, amount: 2, status: 3, discount: 4, commission: 5, id: 6 };
  it("excludes returns, unsold items, invalid sales, and repeated IDs", () => {
    const { sales, invalid } = normalizeRows([
      ["Ana", "Vaso", "100,00", "Vendido", "10,00", "30", "A1"],
      ["Ana", "Prato", "40,00", "Devolvido", "0,00", "", "A2"],
      ["Bia", "Bolsa", "50,00", "Não vendido", "0,00", "", "A3"],
      ["Bia", "Carteira", "inválido", "Vendido", "0,00", "", "A4"],
      ["Ana", "Vaso 2", "20,00", "Vendido", "0,00", "", "A1"],
    ], map);
    assert.equal(invalid.length, 1);
    assert.equal(sales[3].possibleDuplicate, true);
    const closing = calculateClosing(sales, 3000);
    assert.equal(closing.soldCount, 1);
    assert.equal(closing.excludedCount, 3);
    assert.equal(closing.netCents, 9000);
    assert.equal(closing.commissionCents, 2700);
    assert.equal(closing.payoutCents, 6300);
    assert.equal(closing.suppliers[0].supplier, "Ana");
  });
  it("uses item override before supplier override, then rounds commission in cents", () => {
    const { sales } = normalizeRows([["Ana", "Item", "0,05", "Vendido", "0", "", "x"]], map);
    assert.equal(commissionCents(5, 3000), 2);
    const closing = calculateClosing(sales, 3000, { Ana: 5000 });
    assert.equal(closing.commissionCents, 3);
    assert.equal(closing.payoutCents, 2);
  });
  it("flags duplicates without an explicit sale id by matching business fields", () => {
    const { sales } = normalizeRows([["Ana", "Vaso", "10,00", "Vendido", "0"], ["Ana", "Vaso", "10,00", "Vendido", "0"]], { supplier: 0, item: 1, amount: 2, status: 3, discount: 4 });
    assert.equal(sales[1].possibleDuplicate, true);
    assert.equal(calculateClosing(sales, 0).soldCount, 1);
    assert.equal(calculateClosing(sales, 0, {}, true).soldCount, 2);
  });
});
