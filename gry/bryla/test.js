// Test generatora: node --test gry/bryla/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, step, roll, cells } = require("./gra.js");

const LEVELS = [
  { walk: 9, minOpt: 6, fragile: 0, bridge: false },
  { walk: 15, minOpt: 11, fragile: 0.18, bridge: false },
  { walk: 20, minOpt: 15, fragile: 0.2, bridge: true },
];

test("toczenie: cztery obroty w jedną stronę i z powrotem wracają na miejsce", () => {
  let st = { x: 5, y: 5, o: "S" };
  for (const d of ["right", "left"]) st = roll(st, d);
  assert.deepStrictEqual(st, { x: 5, y: 5, o: "S" });
  assert.strictEqual(cells(roll(st, "down")).length, 2);
});

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: każdy etap ma rozwiązanie o długości co najmniej ${L.minOpt}`, () => {
  for (let k = 0; k < 60; k++) {
    const lv = generate(L);
    assert.ok(lv, "generator nie znalazł etapu");
    assert.ok(lv.opt >= L.minOpt);
    // odtworzenie rozwiązania krok po kroku
    let st = lv.start;
    lv.sol.forEach((d, j) => {
      st = step(lv, st, d);
      assert.ok(!st.fall, "rozwiązanie spada");
      assert.strictEqual(!!st.win, j === lv.sol.length - 1);
    });
  }
}));
