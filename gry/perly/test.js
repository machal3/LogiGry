const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, solve, rulesOk, growLoop, pearlsFrom, maskFromLoop, pearlStatus, traceD } = require("./gra.js");

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

test("status perły rozróżnia spełnioną, oczekującą i złą", () => {
  const n = 3;
  const pearls = new Int8Array(9);
  const mask = new Int8Array(9);
  pearls[4] = 1;
  mask[4] = 10;
  mask[3] = 10;
  mask[5] = 2;
  assert.equal(pearlStatus(n, pearls, mask, 4), "wait");
  mask[5] = 12;
  assert.equal(pearlStatus(n, pearls, mask, 4), "ok");
  mask[5] = 10;
  assert.equal(pearlStatus(n, pearls, mask, 4), "bad");
  pearls[4] = 2;
  mask[4] = 6;
  mask[5] = 10;
  mask[7] = 5;
  assert.equal(pearlStatus(n, pearls, mask, 4), "ok");
  mask[5] = 6;
  assert.equal(pearlStatus(n, pearls, mask, 4), "bad");
  mask[5] = 2;
  assert.equal(pearlStatus(n, pearls, mask, 4), "wait");
  assert.equal(pearlStatus(n, pearls, mask, 0), "");
});

test("ścieżka jest jedną łamaną, a zamknięta pętla jednym obwodem", () => {
  const n = 4;
  const mask = maskFromLoop(n, [0, 1, 5, 4]);
  const loop = traceD(n, mask);
  assert.equal(loop.split("M").length - 1, 1);
  assert.ok(loop.endsWith("Z"));
  const line = new Int8Array(n * n);
  line[0] = 2;
  line[1] = 10;
  line[2] = 8;
  const open = traceD(n, line);
  assert.equal(open.split("M").length - 1, 1);
  assert.equal(open.includes("Z"), false);
  assert.equal(open.split("L").length - 1, 2);
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
