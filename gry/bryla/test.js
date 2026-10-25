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

const { endlessParams, runPoints } = require("./gra.js");

test("bez końca: punkty za bieg pasują do poziomów i rosną coraz szybciej", () => {
  assert.ok(runPoints(0) === 0 && runPoints(2) <= 5);
  assert.strictEqual(runPoints(3), 10);
  assert.strictEqual(runPoints(6), 25);
  assert.strictEqual(runPoints(9), 50);
  for (let n = 1; n < 40; n++) assert.ok(runPoints(n) >= runPoints(n - 1));
  assert.ok(runPoints(12) - runPoints(11) > runPoints(10) - runPoints(9));
  assert.strictEqual(runPoints(100), 150);
});

test("bez końca: trudność rośnie, a każda plansza ma rozwiązanie", () => {
  for (let n = 1; n < 30; n++) {
    const a = endlessParams(n - 1), b = endlessParams(n);
    assert.ok(b.walk >= a.walk && b.minOpt >= a.minOpt && b.fragile >= a.fragile);
  }
  for (const n of [0, 3, 6, 9, 12, 20]) for (let k = 0; k < 15; k++) {
    // jak w grze: generator rzadko (ok. 0,5% na etapie 20) nie trafia i wtedy skraca wymaganą trasę
    const p = endlessParams(n), need = p.minOpt;
    let lv;
    do { lv = generate(p); p.minOpt -= 2; } while (!lv);
    assert.ok(lv.opt >= need - 4, `etap ${n}: za krótka plansza`);
    let st = lv.start;
    for (const d of lv.sol) { st = step(lv, st, d); assert.ok(!st.fall); }
    assert.ok(st.win);
  }
});
