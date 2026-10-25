// Test logiki gry: node --test gry/termometry/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, solve, counts, stage, runPoints } = require("./gra.js");

for (const [n, maxLen, bend, runs] of [[5, 4, false, 100], [6, 5, true, 60], [8, 6, true, 15]]) {
  test(`${n} × ${n}: jedno rozwiązanie, zgodne z liczbami, szybko`, () => {
    for (let k = 0; k < runs; k++) {
      const t0 = Date.now();
      const p = generate(n, maxLen, bend);
      assert.ok(Date.now() - t0 < 2000, "generowanie trwa za długo");
      const cells = p.thermos.flat().sort((a, b) => a - b);
      assert.deepStrictEqual(cells, [...Array(n * n).keys()], "termometry nie pokrywają planszy");
      const c = counts(n, p.thermos, p.sol);
      assert.deepStrictEqual(c, { rows: p.rows, cols: p.cols });
      const r = solve(n, p.thermos, p.rows, p.cols);
      assert.strictEqual(r.found, 1);
      assert.deepStrictEqual(r.first, p.sol);
    }
  });
}

test("tryb bez końca: plansze rosną od 5 × 5 do 8 × 8, czas za planszę maleje do granicy", () => {
  const ns = Array.from({ length: 40 }, (_, k) => stage(k).n);
  assert.deepStrictEqual(ns.slice(0, 11), [5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 8]);
  for (let k = 1; k < 40; k++) assert.ok(ns[k] >= ns[k - 1]);
  assert.ok(stage(39).bonus >= 45);
  for (const k of [0, 3, 5, 9, 12, 20]) {
    const { n, maxLen, bend } = stage(k);
    assert.strictEqual(solve(n, ...(({ thermos, rows, cols }) => [thermos, rows, cols])(generate(n, maxLen, bend))).found, 1);
  }
});

test("tryb bez końca: punkty za bieg", () => {
  assert.deepStrictEqual([0, 1, 2, 5, 8, 11, 12, 15, 20].map(runPoints), [0, 5, 10, 25, 38, 50, 56, 80, 140]);
  assert.strictEqual(runPoints(40), 150);
  for (let k = 1; k < 40; k++) assert.ok(runPoints(k) >= runPoints(k - 1));
});
