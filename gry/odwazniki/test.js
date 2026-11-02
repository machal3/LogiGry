// Testy logiki gry Odważniki (node --test gry/odwazniki/test.js).
const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { sums, solve, generate, stage, runPoints } = require("./gra.js");

test("sums i solve znajdują jednoznaczne rozwiązanie wygenerowanej planszy", () => {
  for (const n of [4, 5, 6]) {
    for (let k = 0; k < 5; k++) {
      const p = generate(n);
      assert.equal(p.sol.length, n * n);
      const s = sums(n, p.sol);
      assert.deepEqual(s.rows, p.rows);
      assert.deepEqual(s.cols, p.cols);
      const res = solve(n, p.rows, p.cols, 2);
      assert.equal(res.found, 1, `plansza ${n}x${n} musi mieć dokładnie 1 rozwiązanie`);
      assert.deepEqual(res.first, p.sol);
    }
  }
});

test("stage i runPoints rosną wraz z postępem w trybie bez końca", () => {
  assert.equal(stage(0).n, 4);
  assert.equal(stage(3).n, 5);
  assert.equal(stage(6).n, 6);
  assert.equal(stage(10).n, 7);
  assert.equal(runPoints(0), 0);
  assert.ok(runPoints(4) < runPoints(10));
  assert.ok(runPoints(10) <= 150);
});
