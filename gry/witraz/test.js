const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const {
  COLORS,
  getWindowPatternColor,
  canPlaceInWindow,
  findWindowColumnForRow,
  scoreTilePlacement,
  calcFloorPenalty,
  scoreWindow,
  setupPlates,
} = require("./gra.js");

test("Witraż: zasada sąsiedztwa kolorów i unikalności w wierszu okna katedralnego działa poprawnie", () => {
  const grid = Array.from({ length: 25 }, () => null);
  grid[0] = { color: "rubin" };

  // Pole obok (0, 1) nie może mieć koloru "rubin"
  assert.equal(canPlaceInWindow(grid, 0, 1, "rubin"), false);
  // Żadne pole w tym samym wierszu (np. 0, 3) nie może mieć powtórzonego koloru "rubin"
  assert.equal(canPlaceInWindow(grid, 0, 3, "rubin"), false);
  // Pole poniżej (1, 0) nie może mieć koloru "rubin"
  assert.equal(canPlaceInWindow(grid, 1, 0, "rubin"), false);
  // Ale inny kolor jest dozwolony
  assert.equal(canPlaceInWindow(grid, 0, 1, "szafir"), true);
  // I pole po skosie (1, 1) może mieć kolor "rubin"
  assert.equal(canPlaceInWindow(grid, 1, 1, "rubin"), true);
});

test("Witraż: wzór katedralny (r + c) % 5 przypisuje każdemu kolorowi właściwą kolumnę w rzędzie", () => {
  const grid = Array.from({ length: 25 }, () => null);
  for (let r = 0; r < 5; r++) {
    const seen = new Set();
    for (let c = 0; c < 5; c++) {
      const colId = getWindowPatternColor(r, c, 5);
      seen.add(colId);
      assert.equal(findWindowColumnForRow(grid, r, colId, 5), c);
    }
    assert.equal(seen.size, 5);
  }
});

test("Witraż: punktacja dokładanych szkiełek, pełnych rzędów i kar z podłogi", () => {
  const grid = Array.from({ length: 25 }, () => null);
  // Pierwsze szkiełko daje 1 pkt
  grid[0] = { color: COLORS[0].id };
  assert.equal(scoreTilePlacement(grid, 0, 0), 1);

  // Drugie obok tworzy łańcuch poziomy o długości 2 -> 2 pkt
  grid[1] = { color: COLORS[1].id };
  assert.equal(scoreTilePlacement(grid, 0, 1), 2);

  // Wypełnienie reszty wiersza 0
  for (let c = 2; c < 5; c++) grid[c] = { color: COLORS[c].id };

  const resClean = scoreWindow(grid, 0);
  assert.ok(resClean.total >= 10);

  const resFloor = scoreWindow(grid, 3);
  assert.equal(calcFloorPenalty(3), 4); // -1, -1, -2
  assert.ok(resFloor.total < resClean.total);
  assert.equal(resFloor.floorLoss, 4);

  const plates = setupPlates(4, 5);
  assert.equal(plates.length, 4);
  assert.equal(plates[0].length, 4);
});
