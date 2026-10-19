// Test logiki magnesów: node --test gry/magnesy/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { partition, solutions, build, conflicts, solved, UNKNOWN } = require("./gra.js");

test("kafelkowanie pokrywa planszę dwoma polami", () => {
  for (const [n, m] of [[4, 4], [5, 6], [6, 6], [6, 8]]) {
    const { owner, doms } = partition(n, m);
    assert.equal(doms.length, (n * m) / 2);
    const seen = new Set();
    doms.forEach(([i, j]) => {
      assert.ok(!seen.has(i) && !seen.has(j), "pola nie mogą się powtarzać");
      seen.add(i);
      seen.add(j);
      const d = Math.abs(i - j);
      assert.ok(d === 1 || d === m, `pola domino muszą się stykać bokiem (${i}, ${j})`);
      assert.equal(owner[i], owner[j]);
    });
    assert.equal(seen.size, n * m, "wszystkie pola pokryte");
  }
});

test("generowana łamigłówka ma jedno rozwiązanie i jest do rozwiązania", () => {
  for (const [n, m, keep, hidden] of [[4, 4, 0.55, 8], [5, 6, 0.5, 12], [6, 6, 0.55, 14]]) {
    const p = build(n, m, keep, hidden);
    assert.ok(p, `generowanie ${n} × ${m}`);
    assert.equal(solutions(p, 2), 1, "rozwiązanie musi być jedno");
    assert.ok(p.given.filter((v) => v === UNKNOWN).length >= hidden, "część pól musi zostać ukryta");
    assert.ok(solved(p, p.solution), "zapisane rozwiązanie spełnia zasady");
  }
});

test("conflicts wykrywa złe sąsiedztwo, złe domino i przekroczony licznik", () => {
  const n = 2, m = 4;
  const owner = new Int16Array(8);
  const doms = [[0, 1], [2, 3], [4, 5], [6, 7]];
  doms.forEach(([a, b], k) => { owner[a] = owner[b] = k; });
  const p = { n, m, owner, doms, rowPlus: new Int8Array([1, 1]), colPlus: new Int8Array([1, 1, 0, 0]), given: new Int8Array(8).fill(UNKNOWN), solution: new Int8Array(8) };
  // plusy obok siebie w pierwszym wierszu: (0,0) i (0,1)
  const val = new Int8Array([1, 1, -1, 1, -1, -1, 0, 0]);
  const c = conflicts(p, val);
  assert.ok(c.cell.has(0) && c.cell.has(1), "sąsiednie plusy to błąd");
  assert.ok(c.cell.has(0) && c.cell.has(2) === false, "bez fałszywych alarmów");
  assert.ok(c.cell.has(1), "złe domino (1, 3) też jest błędem");
});
