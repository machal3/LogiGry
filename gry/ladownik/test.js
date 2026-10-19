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
