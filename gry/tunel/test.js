// Test uczciwości tunelu: node --test gry/tunel/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, hits, N, LANE, TURN } = require("./gra.js");

const LEVELS = [
  { length: 800, spacing: 8, gap: 4, maxSpeed: 17, extra: 0.15 },
  { length: 1200, spacing: 7, gap: 3, maxSpeed: 21, extra: 0.1 },
  { length: 1600, spacing: 6.2, gap: 2, maxSpeed: 25, extra: 0.06 },
];

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: istnieje przelot bez zderzenia przy najwyższej prędkości`, () => {
  for (let k = 0; k < 40; k++) {
    const rows = generate(L);
    // programowanie dynamiczne po kątach (krok 1/8 pasa): które pozycje da się osiągnąć bez zderzenia
    const STEPS = N * 8, unit = (Math.PI * 2) / STEPS;
    let ok = new Array(STEPS).fill(false).map((_, a) => !hits(rows[0], a * unit, 0.12));
    for (let r = 1; r < rows.length; r++) {
      const time = (rows[r].z - rows[r - 1].z) / L.maxSpeed;
      const reach = Math.floor((TURN * time) / unit);
      const next = new Array(STEPS).fill(false);
      for (let a = 0; a < STEPS; a++) {
        if (hits(rows[r], a * unit, 0.12)) continue;
        for (let d = -reach; d <= reach && !next[a]; d++) if (ok[(a + d + STEPS) % STEPS]) next[a] = true;
      }
      ok = next;
      assert.ok(ok.some(Boolean), `rząd ${r} nie do przejścia`);
    }
  }
}));

test("bezpieczny pas jest wolny", () => {
  const rows = generate(LEVELS[2]);
  for (const r of rows) assert.ok(!hits(r, (r.safe + 0.5) * LANE, 0.12));
});
