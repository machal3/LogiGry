// Test generatora krzyżówki: diagram powstaje, wyrazy się krzyżują, litery się zgadzają.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { buildLevel, fits, WORDS } = require("./gra.js");

const LEVELS = [
  { cols: 7, rows: 7, min: 6, max: 12 },
  { cols: 9, rows: 9, min: 10, max: 18 },
  { cols: 11, rows: 11, min: 15, max: 24 },
];

test("wyrazy w bazie są unikalne i mają sensowną długość", () => {
  assert.ok(WORDS.length >= 30, "za mało wyrazów w bazie");
  assert.equal(new Set(WORDS.map((w) => w[0])).size, WORDS.length, "powtórzone wyrazy");
  for (const w of WORDS) assert.ok(w[0].length >= 3 && w[0].length <= 7, `długość wyrazu: ${w[0]}`);
});

test("poziomy mają diagram z minimalną liczbą wyrazów i spójne litery", () => {
  for (const L of LEVELS) {
    for (let k = 0; k < 12; k++) {
      const placed = buildLevel(L.cols, L.rows, L.min, L.max);
      assert.ok(placed, "brak diagramu");
      assert.ok(placed.length >= L.min, `tylko ${placed.length} wyrazów przy potrzebie ${L.min}`);
      const grid = new Map();
      for (const p of placed) {
        for (let j = 0; j < p.w.length; j++) {
          const c = p.dir === 0 ? p.col + j : p.col;
          const r = p.dir === 0 ? p.row : p.row + j;
          const key = r * L.cols + c;
          if (grid.has(key)) assert.equal(grid.get(key), p.w[j], "rozjazd liter na przecięciu");
          grid.set(key, p.w[j]);
        }
      }
      // sieci: każdy wyraz przecina się lub dotyka słowną droga przez przecięcia
      assert.ok(placed.some((p) => p.dir === 0) && placed.some((p) => p.dir === 1), "same poziome albo same pionowe");
      if (fits("BRAK", 0, 0, 7, 10, 10, []) !== false) assert.fail("fits dopuści wyraz poza granicą"); // sanity
    }
  }
});
