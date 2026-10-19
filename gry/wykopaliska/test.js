const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { MINERALS, UPGRADES, upgradeCost, calculateSellValue, generateMine, digBlock } = require("./gra.js");

test("Wykopaliska: wycena minerałów i koszty ulepszeń działają poprawnie", () => {
  const cargo = ["wegiel", "miedz", "zloto"];
  const val = calculateSellValue(cargo);
  assert.equal(val, 8 + 15 + 52);

  const cost0 = upgradeCost("drill", 0);
  const cost1 = upgradeCost("drill", 1);
  assert.ok(cost1 > cost0);
});

test("Wykopaliska: generowanie kopalni tworzy złoża i pradawne skamieliny", () => {
  const { cols, rows, grid, fossilSpots } = generateMine(15, 30, 2);
  assert.equal(grid.length, 15 * 30);
  assert.equal(fossilSpots.length, 2);
  for (const f of fossilSpots) {
    assert.equal(grid[f.idx].mineral, "skamielina");
  }

  // Wiercenie bloku
  const blockIdx = fossilSpots[0].idx;
  const r = Math.floor(blockIdx / cols);
  const c = blockIdx % cols;
  const res = digBlock(grid, cols, r, c, 100);
  assert.equal(res.dug, true);
  assert.equal(res.mineral, "skamielina");
  assert.equal(grid[blockIdx], null);
});
