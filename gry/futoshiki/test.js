// Test logiki futoshiki: node --test gry/futoshiki/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { latin, solutions, generate, conflicts, hIdx, vIdx } = require("./gra.js");

const valid = (p, grid) => {
  const n = p.n;
  for (let r = 0; r < n; r++) {
    const row = new Set(), col = new Set();
    for (let c = 0; c < n; c++) { row.add(grid[r * n + c]); col.add(grid[c * n + r]); }
    assert.equal(row.size, n, "wiersz bez powtórzeń");
    assert.equal(col.size, n, "kolumna bez powtórzeń");
  }
  for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) if (p.h[hIdx(n, r, c)]) {
    const a = grid[r * n + c], b = grid[r * n + c + 1];
    assert.ok(p.h[hIdx(n, r, c)] === 1 ? a < b : a > b, "nierówność w wierszu");
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) if (p.v[vIdx(n, r, c)]) {
    const a = grid[r * n + c], b = grid[(r + 1) * n + c];
    assert.ok(p.v[vIdx(n, r, c)] === 1 ? a < b : a > b, "nierówność w kolumnie");
  }
};

test("losowy kwadrat łaciński jest poprawny", () => {
  for (let k = 0; k < 50; k++) {
    const n = 2 + (k % 5);
    const g = latin(n);
    for (let r = 0; r < n; r++) assert.equal(new Set(g[r]).size, n);
    for (let c = 0; c < n; c++) assert.equal(new Set(g.map((row) => row[c])).size, n);
  }
});

test("generowana łamigłówka ma dokładnie jedno rozwiązanie", () => {
  for (const [n, keep, min] of [[4, 0.5, 7], [5, 0.6, 7], [6, 0.72, 9]]) {
    const p = generate(n, keep, min);
    assert.ok(p, `generowanie planszy ${n} × ${n}`);
    valid(p, p.solution);
    assert.equal(solutions(p, 2), 1, "rozwiązanie musi być jedno");
    assert.ok(p.given.filter(Boolean).length < n * n, "część pól musi zostać pusta");
  }
});

test("conflicts wskazuje powtórki i złe nierówności", () => {
  const n = 3;
  const p = { n, given: new Int8Array(9), h: new Int8Array(6), v: new Int8Array(6), solution: [] };
  p.h[hIdx(n, 0, 0)] = 1; // (0,0) < (0,1)
  const g = [2, 2, 3, 1, 3, 2, 3, 1, 2];
  const bad = conflicts(p, g);
  assert.ok(bad.has(0) && bad.has(1), "powtórka w wierszu");
  assert.ok(bad.has(0), "zła nierówność 2 < 2");
  assert.equal(conflicts({ n: 3, given: new Int8Array(9), h: new Int8Array(6), v: new Int8Array(6) }, [1, 2, 3, 2, 3, 1, 3, 1, 2]).size, 0);
});
