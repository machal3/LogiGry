// Test logiki gry: node --test gry/lodowisko/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { puzzle, slide, advance, search } = require("./gra.js");

test("sanki ślizgają się, aż zatrzyma je ściana albo krawędź", () => {
  // plansza 5 x 5 ze ścianą w środku kolumny 3
  const wall = new Uint8Array(25);
  wall[2 * 5 + 3] = 1;
  // z pola (2,0) ruch w prawo zatrzymuje się przed ścianą
  assert.deepStrictEqual(slide(5, 5, wall, 2, 0, 3), [2, 2]);
  // z pola (0,0) ruch w prawo dochodzi do krawędzi
  assert.deepStrictEqual(slide(5, 5, wall, 0, 0, 3), [0, 4]);
  // z pola (0,0) ruch w górę od razu jest zablokowany
  assert.deepStrictEqual(slide(5, 5, wall, 0, 0, 0), [0, 0]);
  const gemAt = new Int8Array(25).fill(-1);
  gemAt[2 * 5 + 1] = 0;
  const a = advance(5, 5, wall, gemAt, 2, 0, 3, 0);
  assert.strictEqual(a.r, 2);
  assert.strictEqual(a.c, 2);
  assert.strictEqual(a.mask, 1);
  assert.strictEqual(advance(5, 5, wall, gemAt, 0, 0, 0, 0), null);
});

test("każda wylosowana plansza da się rozwiązać", () => {
  const cases = [
    { n: 6, m: 6, gems: 2, want: 7 },
    { n: 8, m: 8, gems: 3, want: 10 },
  ];
  for (const cfg of cases) {
    for (let k = 0; k < 8; k++) {
      const p = puzzle(cfg.n, cfg.m, cfg.gems, cfg.want);
      assert.ok(p, "brak planszy");
      assert.strictEqual(p.wall.length, cfg.n * cfg.m);
      assert.strictEqual(p.gems.length, cfg.gems);
      assert.strictEqual(p.wall[p.start], 0, "sanki w ścianie");
      assert.strictEqual(p.wall[p.exit], 0, "wyjście w ścianie");
      const all = new Set([p.start, p.exit, ...p.gems]);
      assert.strictEqual(all.size, cfg.gems + 2, "powtórzone pola");
      const res = search(cfg.n, cfg.m, p.wall, p.gems, p.start, p.exit);
      assert.ok(res, "plansza bez rozwiązania");
      assert.strictEqual(res.dist, p.optimal, "zapisane rozwiązanie się nie zgadza");
      assert.ok(res.dist >= 1 && res.dist < 200);
      // pierwszy ruch naprawdę jest legalny
      const a = advance(cfg.n, cfg.m, p.wall, gemIndex(p), (p.start / cfg.m) | 0, p.start % cfg.m, res.first, 0);
      assert.ok(a, "pierwszy ruch nic nie zmienia");
    }
  }
});

test("szukanie rozwiązania respektuje już zebrane kryształy", () => {
  const p = puzzle(6, 6, 2, 4);
  const withNone = search(6, 6, p.wall, p.gems, p.start, p.exit);
  const r0 = (p.start / 6) | 0, c0 = p.start % 6;
  const first = advance(6, 6, p.wall, gemIndex(p), r0, c0, withNone.first, 0);
  const after = search(6, 6, p.wall, p.gems, first.r * 6 + first.c, p.exit, first.mask);
  assert.strictEqual(after.dist, withNone.dist - 1);
});

function gemIndex(p) {
  const g = new Int8Array(p.n * p.m).fill(-1);
  p.gems.forEach((cell, i) => { g[cell] = i; });
  return g;
}
