// Test logiki gry: node --test gry/lodowisko/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { LEVELS, pack, glide, solve, attempt, puzzle, fallback } = require("./gra.js");

// Pusta plansza n × n z podanymi elementami.
function board(n, { gems = [], drift = [], portal = {}, start = 0, exit = n * n - 1 } = {}) {
  const wall = new Uint8Array(n * n);
  const dr = new Uint8Array(n * n);
  drift.forEach((i) => { dr[i] = 1; });
  const por = new Int32Array(n * n).fill(-1);
  for (const [a, b] of Object.entries(portal)) { por[+a] = +b; }
  return pack({ n, wall, drift: dr, portal: por, gems, start, exit });
}

test("sanki ślizgają się, aż zatrzyma je ściana albo krawędź", () => {
  const b = board(5);
  b.wall[2 * 5 + 3] = 1;
  assert.deepStrictEqual([glide(b, 2, 0, 3).r, glide(b, 2, 0, 3).c], [2, 2]);
  assert.deepStrictEqual([glide(b, 0, 0, 3).r, glide(b, 0, 0, 3).c], [0, 4]);
  assert.strictEqual(glide(b, 0, 0, 0), null, "ściana tuż obok ma blokować ruch");
});

test("zaspa łapie płozy, a potem można z niej ruszyć dalej", () => {
  const b = board(5, { drift: [2 * 5 + 1] });
  const a = glide(b, 2, 0, 3);
  assert.deepStrictEqual([a.r, a.c], [2, 1]);
  assert.deepStrictEqual(a.segs, [[2 * 5 + 0, 2 * 5 + 1]]);
  const next = glide(b, 2, 1, 3);
  assert.deepStrictEqual([next.r, next.c], [2, 4], "z zaspy sanki suną dalej");
});

test("lodowa brama przenosi sanki i nie traci pędu", () => {
  const b = board(5, { portal: { [2 * 5 + 2]: 2, [2]: 2 * 5 + 2 } });
  const a = glide(b, 2, 0, 3);
  assert.deepStrictEqual([a.r, a.c], [0, 4]);
  assert.strictEqual(a.gates, 1);
  assert.strictEqual(a.segs.length, 2, "trasa ma dwa odcinki");
});

test("kryształ po drodze wchodzi do maski", () => {
  const b = board(5, { gems: [2 * 5 + 2, 0 * 5 + 1] });
  const a = glide(b, 2, 0, 3);
  assert.strictEqual(a.got, 1, "kryształ z tego samego wiersza");
  const c = glide(b, 0, 0, 3);
  assert.strictEqual(c.got, 2);
});

test("BFS znajduje najkrótsze rozwiązanie i liczy użyte bramy", () => {
  const b = board(5, { gems: [0 * 5 + 2], portal: { [2 * 5 + 2]: 2, [2]: 2 * 5 + 2 } });
  const res = solve(b, 2, 0);
  assert.ok(res, "plansza musi mieć rozwiązanie");
  assert.strictEqual(res.dist, 2);
  const viaGate = glide(b, 2, 0, 3);
  assert.strictEqual(viaGate.gates, 1);
  assert.strictEqual(viaGate.got, 1);
});

test("każdy poziom generuje rozwiązalną planszę z wymaganymi przeszkodami", () => {
  for (const cfg of LEVELS) {
    for (let k = 0; k < 5; k++) {
      const p = puzzle(cfg);
      assert.strictEqual(p.wall.length, cfg.n * cfg.n);
      assert.strictEqual(p.gems.length, cfg.gems);
      assert.strictEqual(p.wall[p.start], 0, "sanki w ścianie");
      assert.strictEqual(p.wall[p.exit], 0, "wyjście w ścianie");
      const unique = new Set([p.start, p.exit, ...p.gems]);
      assert.strictEqual(unique.size, cfg.gems + 2, "powtórzone pola");
      const res = solve(p, (p.start / cfg.n) | 0, p.start % cfg.n);
      assert.ok(res, "plansza bez rozwiązania");
      assert.strictEqual(res.dist, p.optimal, "zapisane rozwiązanie się nie zgadza");
      assert.ok(res.dist >= 2 && res.dist < 60);
      // pierwszy ruch naprawdę jest legalny
      const a = glide(p, (p.start / cfg.n) | 0, p.start % cfg.n, res.first);
      assert.ok(a, "pierwszy ruch nic nie zmienia");
    }
  }
});

test("plansza zapasowa też jest do przejścia", () => {
  for (const cfg of LEVELS) {
    const p = fallback(cfg);
    const res = solve(p, 0, 0);
    assert.ok(res, "zapasowa plansza musi mieć rozwiązanie");
    assert.ok(res.dist <= 2, "zapasowa plansza jest krótka");
  }
});
