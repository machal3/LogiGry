// Test uczciwości tunelu: node --test gry/tunel/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, hits, N, LANE, TURN, endlessParams, endlessRow, runPoints } = require("./gra.js");

const LEVELS = [
  { length: 800, spacing: 8, gap: 4, maxSpeed: 17, extra: 0.15 },
  { length: 1200, spacing: 7, gap: 3, maxSpeed: 21, extra: 0.1 },
  { length: 1600, spacing: 6.2, gap: 2, maxSpeed: 25, extra: 0.06 },
];

// programowanie dynamiczne po kątach (krok 1/8 pasa): które pozycje da się osiągnąć bez zderzenia; speed(z) = prędkość przy rzędzie
function passable(rows, speed) {
    const STEPS = N * 8, unit = (Math.PI * 2) / STEPS;
    let ok = new Array(STEPS).fill(false).map((_, a) => !hits(rows[0], a * unit, 0.12));
    for (let r = 1; r < rows.length; r++) {
      const time = (rows[r].z - rows[r - 1].z) / speed(rows[r].z);
      const reach = Math.floor((TURN * time) / unit);
      const next = new Array(STEPS).fill(false);
      for (let a = 0; a < STEPS; a++) {
        if (hits(rows[r], a * unit, 0.12)) continue;
        for (let d = -reach; d <= reach && !next[a]; d++) if (ok[(a + d + STEPS) % STEPS]) next[a] = true;
      }
      ok = next;
      assert.ok(ok.some(Boolean), `rząd ${r} (z = ${Math.round(rows[r].z)}) nie do przejścia`);
    }
}

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: istnieje przelot bez zderzenia przy najwyższej prędkości`, () => {
  for (let k = 0; k < 40; k++) passable(generate(L), () => L.maxSpeed);
}));

test("bez końca: 10 km tunelu da się przelecieć przy prędkości etapu", () => {
  for (let k = 0; k < 10; k++) {
    const rows = [endlessRow()];
    while (rows.at(-1).z < 10000) rows.push(endlessRow(rows.at(-1)));
    passable(rows, (z) => endlessParams(z).speed + 1);
  }
});

test("bez końca: trudność rośnie od łatwego do trudnego i dalej, potem stoi", () => {
  const p0 = endlessParams(0), p3 = endlessParams(3000), p7 = endlessParams(7000), p20 = endlessParams(20000);
  assert.deepStrictEqual([p0.speed, p0.spacing, p0.gap], [10, 8, 4]);
  assert.ok(Math.abs(p3.speed - 25) < 1e-9 && p3.gap === 2);
  assert.ok(p7.speed > p3.speed && p7.spacing < p3.spacing && p7.gap === 1);
  assert.deepStrictEqual(p20, p7);
  let prev = endlessParams(0);
  for (let z = 100; z <= 8000; z += 100) {
    const p = endlessParams(z);
    assert.ok(p.speed >= prev.speed && p.spacing <= prev.spacing && p.gap <= prev.gap);
    prev = p;
  }
});

test("punkty za bieg: 800 m = 10, ok. 1800 m = 25, 3000 m = 50, krótszy bieg 0–5, limit 150", () => {
  assert.strictEqual(runPoints(0), 0);
  assert.ok(runPoints(799) <= 5);
  assert.strictEqual(runPoints(800), 10);
  assert.ok(Math.abs(runPoints(1800) - 25) <= 3);
  assert.strictEqual(runPoints(3000), 50);
  assert.strictEqual(runPoints(100000), 150);
  // przyrost coraz szybszy
  assert.ok(runPoints(5000) - runPoints(4000) > runPoints(2000) - runPoints(1000));
});

test("bezpieczny pas jest wolny", () => {
  const rows = generate(LEVELS[2]);
  for (const r of rows) assert.ok(!hits(r, (r.safe + 0.5) * LANE, 0.12));
});
