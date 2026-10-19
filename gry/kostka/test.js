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
