const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, solve, rulesOk, growLoop, pearlsFrom, maskFromLoop } = require("./gra.js");

test("pętla na kratce ma parzystą długość i spójne boki", () => {
  for (let n = 4; n <= 8; n++) {
    const loop = growLoop(n);
    assert.ok(loop.length >= 4 && loop.length % 2 === 0);
    assert.equal(new Set(loop).size, loop.length);
    loop.forEach((a, i) => {
      const b = loop[(i + 1) % loop.length];
      const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
      assert.equal(Math.abs(ar - br) + Math.abs(ac - bc), 1);
    });
    const mask = maskFromLoop(n, loop);
    const pearls = pearlsFrom(n, loop);
    assert.ok(rulesOk(n, pearls, mask));
  }
});

test("pusta siatka nie jest rozwiązaniem, pełna pętla jest", () => {
  const p = generate(5, 7);
  assert.ok(p);
  const empty = new Int8Array(p.n * p.n);
  assert.equal(rulesOk(p.n, p.pearls, empty), false);
  assert.ok(rulesOk(p.n, p.pearls, p.mask));
});

test("wygenerowana plansza ma jedno rozwiązanie", () => {
  for (const [n, minP] of [[5, 7], [6, 6], [7, 5]]) {
    const p = generate(n, minP);
    assert.ok(p, `brak planszy ${n}×${n}`);
    const count = p.pearls.reduce((a, v) => a + (v ? 1 : 0), 0);
    assert.ok(count >= minP);
    assert.ok(rulesOk(n, p.pearls, p.mask));
    assert.equal(solve(n, p.pearls, 2).found, 1);
  }
});
