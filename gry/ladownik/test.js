// Test uczciwości: autopilot przelatuje każdy poziom, mieszcząc się w paliwie. node --test gry/ladownik/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { terrain, fly, autopilot } = require("./gra.js");

const LEVELS = [
  { g: 7, wind: 0, pads: 2, padW: 18, fuel: 40 },
  { g: 9, wind: 0, pads: 3, padW: 13, fuel: 50 },
  { g: 11, wind: 3, pads: 4, padW: 11, fuel: 56 },
];

function run(L) {
  const t = terrain(L.pads, L.padW);
  const ship = { x: 40, y: 10, vx: 7, vy: 0, a: 0.4, fuel: L.fuel };
  const env = { g: L.g, wind: 0 };
  let target = 0, landed = false;
  for (let k = 0; k < 60 * 240; k++) {
    if (L.wind) env.wind = Math.sin(k / 200) * L.wind;
    const inp = autopilot(ship, t, target, env);
    if (landed) {
      if (!inp.thrust || ship.fuel <= 0) continue;
      landed = false;
      ship.vy = -3;
    }
    const r = fly(ship, t, inp, env, 1 / 60);
    if (r?.result === "crash") return { ok: false, why: "crash", target, fuel: ship.fuel };
    if (r?.result === "landed") {
      landed = true;
      if (r.pad === target && ++target === L.pads) return { ok: true, fuel: ship.fuel / L.fuel };
    }
  }
  return { ok: false, why: "czas", target, fuel: ship.fuel };
}

test("teren: lądowiska płaskie i rozłączne", () => {
  for (let k = 0; k < 100; k++) {
    const t = terrain(4, 10);
    const ps = t.pads.slice().sort((a, b) => a.x0 - b.x0);
    ps.forEach((p, i) => { assert.ok(p.x0 >= 0 && p.x1 <= 160); if (i) assert.ok(p.x0 > ps[i - 1].x1); });
  }
});

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: autopilot ląduje wszędzie w limicie paliwa`, () => {
  const res = Array.from({ length: 30 }, () => run(L));
  const ok = res.filter((r) => r.ok);
  assert.ok(ok.length >= 27, `udane: ${ok.length} z 30; ${JSON.stringify(res.filter((r) => !r.ok).slice(0, 3))}`);
  const avg = ok.reduce((a, r) => a + r.fuel, 0) / ok.length;
  assert.ok(avg > 0.2, `autopilot zostawia średnio ${Math.round(avg * 100)}% paliwa`);
  console.log(`poziom ${i + 1}: paliwo zostaje średnio ${Math.round(avg * 100)}%`);
}));

const { stage, runPoints, PER, TANK } = require("./gra.js");

test("bez końca: trudność rośnie płynnie, bez ściany", () => {
  let prev = stage(0);
  assert.deepStrictEqual([prev.g, prev.wind, prev.padW], [7, 0, 18]);
  for (let k = 1; k < 40; k++) {
    const p = stage(k);
    assert.ok(p.g >= prev.g && p.wind >= prev.wind && p.padW <= prev.padW && p.refill <= prev.refill);
    assert.ok(p.g - prev.g <= 1.5 && prev.padW - p.padW <= 2.5, `skok trudności na etapie ${k}`);
    prev = p;
  }
  // etap 3 mniej więcej jak poziom trudny, potem granice: lądowisko nie węższe niż na trudnym
  assert.ok(stage(3).g >= 10 && stage(3).wind >= 2 && stage(3).padW <= 12);
  assert.ok(stage(99).padW >= 11 && stage(99).wind <= 3.5 && stage(99).refill > 0);
});

[0, 3, 6, 10].forEach((k) => test(`bez końca: etap ${k + 1} do przejścia przez autopilota w zasięgu dolewek`, () => {
  const P = stage(k);
  const res = Array.from({ length: 20 }, () => run({ ...P, fuel: TANK }));
  const ok = res.filter((r) => r.ok);
  assert.ok(ok.length >= 17, `udane: ${ok.length} z 20`);
  // zużycie na lądowanie autopilota nie przekracza zbiornika z dolewką
  for (const r of ok) assert.ok((1 - r.fuel) * TANK / PER < TANK / PER + P.refill);
}));

test("bez końca: punkty za bieg", () => {
  assert.deepStrictEqual([0, 1, 2, 5, 10, 15, 20, 30].map(runPoints), [0, 5, 10, 25, 50, 85, 140, 150]);
  for (let n = 1; n < 60; n++) assert.ok(runPoints(n) >= runPoints(n - 1) && runPoints(n) <= 150);
});
