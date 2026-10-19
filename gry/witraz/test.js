const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { COLORS, canPlaceInWindow, scoreWindow, setupPlates } = require("./gra.js");

test("Witraż: zasada sąsiedztwa kolorów w oknie katedralnym działa poprawnie", () => {
  const grid = Array.from({ length: 25 }, () => null);
  grid[0] = { color: "rubin" };

  // Pole obok (0, 1) nie może mieć koloru "rubin"
  assert.equal(canPlaceInWindow(grid, 0, 1, "rubin"), false);
  // Pole poniżej (1, 0) nie może mieć koloru "rubin"
  assert.equal(canPlaceInWindow(grid, 1, 0, "rubin"), false);
  // Ale inny kolor jest dozwolony
  assert.equal(canPlaceInWindow(grid, 0, 1, "szafir"), true);
  // I pole po skosie (1, 1) może mieć kolor "rubin"
  assert.equal(canPlaceInWindow(grid, 1, 1, "rubin"), true);
});

test("Witraż: podliczanie punktów i kar za potłuczone szkiełka", () => {
  const grid = Array.from({ length: 25 }, () => null);
  // Wypełniony wiersz 0 (5 szkiełek)
  for (let c = 0; c < 5; c++) grid[c] = { color: COLORS[c].id };

  const resClean = scoreWindow(grid, 0);
  assert.ok(resClean.total >= 10); // 5 za rząd + 5 za szkiełka

  const resFloor = scoreWindow(grid, 3);
  assert.ok(resFloor.total < resClean.total);
  assert.ok(resFloor.floorLoss > 0);
});
