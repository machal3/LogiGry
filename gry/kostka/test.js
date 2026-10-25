// Test logiki kostki: node --test gry/kostka/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { makeCube, applyMove, solved, scramble, pushMove, inverse } = require("./gra.js");

test("nowa kostka jest ułożona; 54 i 24 naklejki", () => {
  const c3 = makeCube(3), c2 = makeCube(2);
  assert.ok(solved(c3) && solved(c2));
  assert.strictEqual(c3.cubies.reduce((a, c) => a + c.stickers.length, 0), 54);
  assert.strictEqual(c2.cubies.reduce((a, c) => a + c.stickers.length, 0), 24);
});

test("cztery takie same ruchy wracają do ułożenia, jeden psuje", () => {
  for (const n of [2, 3]) for (let axis = 0; axis < 3; axis++) {
    const c = makeCube(n), m = { axis, layer: (n - 1) / 2, dir: 1 };
    applyMove(c, m);
    assert.ok(!solved(c));
    for (let k = 0; k < 3; k++) applyMove(c, m);
    assert.ok(solved(c));
  }
});

test("odwrócenie stosu ruchów zawsze układa kostkę (to robi podpowiedź)", () => {
  for (let k = 0; k < 200; k++) {
    const n = k % 2 ? 3 : 2, c = makeCube(n), stack = [];
    for (const m of scramble(c, 3 + (k % 20))) pushMove(stack, m);
    // gracz robi losowe ruchy, czasem cofa
    for (let i = 0; i < 15; i++) {
      const m = { axis: rnd(3), layer: pick(n === 3 ? [-1, 0, 1] : [-0.5, 0.5]), dir: pick([1, -1]) };
      applyMove(c, m);
      pushMove(stack, m);
    }
    while (stack.length) applyMove(c, inverse(stack.pop()));
    assert.ok(solved(c));
  }
});

test("pomieszana kostka nigdy nie jest od razu ułożona", () => {
  for (let k = 0; k < 100; k++) { const c = makeCube(2); scramble(c, 3); assert.ok(!solved(c)); }
});

const { cubeSpec, cubeBonus, runPoints, END } = require("./gra.js");

test("tryb bez końca: mieszanie rośnie, nie przekracza 20, a dodany czas nie spada poniżej 120 s przy pełnym", () => {
  assert.deepStrictEqual(cubeSpec(0), { size: 2, mix: 2 });
  assert.deepStrictEqual(cubeSpec(3), { size: 3, mix: 3 });
  let prev = 0;
  for (let i = 0; i < 60; i++) {
    const sp = cubeSpec(i);
    if (i !== 3) assert.ok(sp.mix >= prev, `mieszanie nie maleje (${i})`);
    assert.ok(sp.mix <= 20);
    assert.ok(cubeBonus(i) >= 46 && cubeBonus(i) <= 180);
    if (sp.mix >= 15) assert.ok(cubeBonus(i) >= 120);
    prev = sp.mix;
  }
  // podpowiedź nie może się opłacać: od 4 ruchów mieszania same podpowiedzi kosztują więcej niż premia
  for (let i = 0; i < 60; i++) if (cubeSpec(i).mix >= 4) assert.ok(cubeSpec(i).mix * (END.hintCost + 1.5) > cubeBonus(i));
});

test("tryb bez końca: punkty jak poziomy, rosną coraz szybciej, do limitu 150", () => {
  assert.strictEqual(runPoints(0), 0);
  assert.ok(runPoints(2) <= 5);
  assert.strictEqual(runPoints(3), 10);
  assert.strictEqual(runPoints(6), 25);
  assert.strictEqual(runPoints(10), 50);
  for (let n = 1; n < 40; n++) assert.ok(runPoints(n) >= runPoints(n - 1) && runPoints(n) <= 150);
  assert.ok(runPoints(12) - runPoints(11) > runPoints(11) - runPoints(10));
  assert.strictEqual(runPoints(30), 150);
});
