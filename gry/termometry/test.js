// Test logiki gry: node --test gry/termometry/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, solve, counts } = require("./gra.js");

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
