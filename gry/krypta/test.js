// Test generatora krypt: node --test gry/krypta/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, solvable, bfs } = require("./gra.js");

const LEVELS = [
  { n: 6, loops: 0.1, relics: 3, gate: false },
  { n: 8, loops: 0.12, relics: 4, gate: true },
  { n: 10, loops: 0.14, relics: 5, gate: true },
];

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: każda krypta jest do przejścia`, () => {
  for (let k = 0; k < 80; k++) {
    const c = generate(L);
    assert.ok(c, "brak krypty");
    assert.strictEqual(c.relics.length, L.relics);
    assert.ok(solvable(c));
    if (L.gate) {
      // krata naprawdę zamyka drogę do wyjścia
      const closed = c.grid.map((r) => r.map((v) => (v === 2 ? 1 : v)));
      assert.ok(bfs(closed, ...c.start).dist[c.exit[1]][c.exit[0]] < 0);
    }
    // obrzeże to ściany
    const S = c.grid.length;
    for (let j = 0; j < S; j++) assert.ok(c.grid[0][j] === 1 && c.grid[S - 1][j] === 1 && c.grid[j][0] === 1 && c.grid[j][S - 1] === 1);
  }
}));

const { floorParams, endlessPoints } = require("./gra.js");

test("bez końca: każde piętro 1–30 daje kryptę do przejścia, trudność rośnie do granic", () => {
  let prev = null;
  for (let d = 1; d <= 30; d++) {
    const P = floorParams(d);
    assert.ok(P.n <= 12 && P.ghosts <= 7 && P.ghostSpeed <= 2.1 && P.regen >= 4);
    if (prev) for (const k of ["n", "relics", "ghosts", "ghostSpeed", "chase"]) assert.ok(P[k] >= prev[k], `${k} maleje na piętrze ${d}`);
    for (let k = 0; k < 15; k++) {
      const c = generate(P);
      assert.ok(c, `brak krypty na piętrze ${d}`);
      assert.ok(solvable(c));
    }
    prev = P;
  }
});

test("bez końca: punkty za bieg", () => {
  assert.strictEqual(endlessPoints(0), 0);
  assert.ok(endlessPoints(1) <= 5);
  assert.strictEqual(endlessPoints(2), 20); // jak łatwy poziom
  assert.ok(Math.abs(endlessPoints(4) - 50) <= 15); // jak średni
  assert.ok(Math.abs(endlessPoints(5) - 100) <= 5); // jak trudny
  for (let c = 2; c < 40; c++) {
    assert.ok(endlessPoints(c + 1) >= endlessPoints(c));
    assert.ok(endlessPoints(c) <= 300);
  }
  assert.strictEqual(endlessPoints(40), 300);
});
