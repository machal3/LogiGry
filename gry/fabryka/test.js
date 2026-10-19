// Test logiki gry: node --test gry/fabryka/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, simulate, walk, dirOf } = require("./gra.js");

const LEVELS = [
  { n: 5, m: 5, len: 8, targets: 2 },
  { n: 6, m: 6, len: 11, targets: 3 },
  { n: 7, m: 7, len: 14, targets: 4 },
];

test("kierunek wynika z sąsiedztwa pól", () => {
  assert.strictEqual(dirOf(5, 7, 8), 0); // w prawo
  assert.strictEqual(dirOf(5, 7, 12), 1); // w dół
  assert.strictEqual(dirOf(5, 7, 6), 2); // w lewo
  assert.strictEqual(dirOf(5, 7, 2), 3); // w górę
});

test("ścieżka nie powtarza pól", () => {
  for (let k = 0; k < 30; k++) {
    const path = walk(6, 6, rnd(36), 12);
    assert.ok(path, "brak ścieżki");
    assert.strictEqual(path.length, 12);
    assert.strictEqual(new Set(path).size, 12, "pole powtórzone");
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const d = Math.abs(((a / 6) | 0) - ((b / 6) | 0)) + Math.abs((a % 6) - (b % 6));
      assert.strictEqual(d, 1, "pola nie stykają się bokiem");
    }
  }
});

test("wylosowana hala ma gotowy przejazd w budżecie", () => {
  for (const cfg of LEVELS) {
    for (let k = 0; k < 12; k++) {
      const p = generate(cfg.n, cfg.m, cfg.len, cfg.targets);
      assert.ok(p, "brak hali");
      assert.strictEqual(p.targets.length, cfg.targets, "zła liczba celów");
      assert.strictEqual(new Set(p.targets).size, cfg.targets, "cele się powtarzają");
      assert.ok(!p.targets.includes(p.source), "cel na źródle");
      assert.strictEqual(p.wall[p.source], 0, "źródło w ścianie");
      for (const t of p.targets) assert.strictEqual(p.wall[t], 0, "cel w ścianie");
      for (const [cell] of p.belts) {
        assert.strictEqual(p.wall[cell], 0, "taśma w ścianie");
        assert.ok(!p.targets.includes(cell) && cell !== p.source, "taśma na polu specjalnym");
      }
      // gotowy przejazd naprawdę przejeżdża przez wszystkie cele
      const dirs = new Int8Array(cfg.n * cfg.m).fill(-1);
      p.belts.forEach(([cell, d]) => { dirs[cell] = d; });
      const sim = simulate(cfg.n, cfg.m, p.wall, p.source, p.sdir, p.targets, dirs);
      assert.ok(sim.ok, `przejazd nie działa: ${sim.reason}`);
      assert.strictEqual(sim.visited, cfg.targets);
      assert.strictEqual(p.need, p.belts.length);
      assert.ok(p.need >= 1 && p.need < cfg.n * cfg.m);
      // pola przejazdu tworzą ciąg stykających się bokiem pól
      for (let i = 1; i < sim.path.length; i++) {
        const a = sim.path[i - 1], b = sim.path[i];
        const d = Math.abs(((a / cfg.m) | 0) - ((b / cfg.m) | 0)) + Math.abs((a % cfg.m) - (b % cfg.m));
        assert.strictEqual(d, 1, "surowiec przeskoczył pole");
      }
    }
  }
});

test("bez taśm surowiec nie dojeżdża do wszystkich celów", () => {
  for (let k = 0; k < 20; k++) {
    const p = generate(5, 5, 8, 2);
    const empty = new Int8Array(25).fill(-1);
    const sim = simulate(5, 5, p.wall, p.source, p.sdir, p.targets, empty);
    assert.strictEqual(sim.ok, false, "hala rozwiązuje się sama");
  }
});
