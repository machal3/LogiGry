// Test logiki: node --test gry/artyleria/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { makeTerrain, ground, crater, flight, blast, aim, flatten, W } = require("./gra.js");

test("krater obniża teren i nie tworzy nawisów", () => {
  const h = makeTerrain();
  const y0 = ground(h, 100);
  crater(h, 100, y0, 10);
  assert.ok(ground(h, 100) > y0 + 9);
});

test("wybuch rani bliżej mocniej", () => {
  const a = { x: 50, y: 60, hp: 100 }, b = { x: 58, y: 60, hp: 100 };
  blast([a, b], 50, 59, 7, 40);
  assert.ok(a.hp < b.hp);
});

test("rywal jest zawsze w zasięgu: celowanie bez błędu trafia", () => {
  let ok = 0;
  for (let k = 0; k < 25; k++) {
    const h = makeTerrain();
    const place = (x) => { flatten(h, x, 4.5); return { x, y: ground(h, x), hp: 100 }; };
    const tanks = [place(14 + Math.random() * 26), place(160 + Math.random() * 26)];
    const wind = (Math.random() * 2 - 1) * 11;
    // gracz strzela w rywala i odwrotnie
    for (const [me, target] of [[0, 1], [1, 0]]) {
      const best = aim(h, tanks, me, tanks[target], wind);
      if (best && best.d < 4) ok++;
    }
  }
  assert.ok(ok >= 48, `trafienia: ${ok} z 50`);
});

const { waveParams, runPoints, levelParams } = require("./gra.js");

test("punkty za bieg: 1 czołg ≈ łatwy, 2 ≈ średni, 4 ≈ trudny, rosną coraz szybciej do limitu", () => {
  assert.strictEqual(runPoints(0), 0);
  assert.strictEqual(runPoints(1), 10);
  assert.ok(Math.abs(runPoints(2) - 25) <= 5);
  assert.ok(Math.abs(runPoints(4) - 50) <= 5);
  for (let k = 1; k < 8; k++) assert.ok(runPoints(k + 1) - runPoints(k) >= runPoints(k) - runPoints(k - 1));
  assert.strictEqual(runPoints(30), 150);
});

test("fale: start jak łatwy, fala 5 jak trudny, dalej trudniej, ale z granicą", () => {
  const lv = (key, enemies, wind, err, learn) => levelParams({ key, enemies, wind, err, errP: err, learn });
  const easy = lv("easy", 1, 3, 0.16, 0.75), hard = lv("hard", 2, 11, 0.07, 0.55);
  const w1 = waveParams(1), w5 = waveParams(5);
  assert.deepStrictEqual([w1.enemies, w1.wind, w1.err, w1.floor, w1.heavy], [easy.enemies, easy.wind, easy.err, easy.floor, easy.heavy]);
  assert.ok(Math.abs(w5.err - hard.err) < 1e-9 && w5.wind === hard.wind && w5.heavy === hard.heavy);
  for (let w = 1; w < 30; w++) {
    const a = waveParams(w), b = waveParams(w + 1);
    assert.ok(b.err <= a.err && b.wind >= a.wind && b.learn <= a.learn);
    assert.ok(b.err >= 0.04 && b.wind <= 15 && b.enemies <= 2);
  }
});
