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
