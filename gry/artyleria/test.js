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
