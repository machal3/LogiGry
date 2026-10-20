// Test logiki gry Domino: node --test gry/domino/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { pairId, randomTiling, solutions, grade, generate, analyze, solved } = require("./gra.js");

test("randomTiling dzieli planszę (N+1) × (N+2) na poprawne dwupolowe kostki", () => {
  for (const maxN of [3, 4, 5]) {
    const rows = maxN + 1, cols = maxN + 2;
    const { owner, doms } = randomTiling(rows, cols);
    const D = ((maxN + 1) * (maxN + 2)) >> 1;
    assert.strictEqual(doms.length, D);
    const seen = new Set();
    doms.forEach(([u, v], k) => {
      assert.strictEqual(owner[u], k);
      assert.strictEqual(owner[v], k);
      const dist = Math.abs(((u / cols) | 0) - ((v / cols) | 0)) + Math.abs((u % cols) - (v % cols));
      assert.strictEqual(dist, 1, "pola kostki muszą sąsiadować bokiem");
      seen.add(u);
      seen.add(v);
    });
    assert.strictEqual(seen.size, rows * cols);
  }
});

test("każdy poziom generuje łamigłówkę z dokładnie jednym rozwiązaniem i bez zgadywania", () => {
  const levels = [
    [3, 1],
    [4, 2],
    [5, 2],
  ];
  for (const [maxN, tier] of levels) {
    for (let k = 0; k < 15; k++) {
      const p = generate(maxN, tier);
      assert.ok(p, `nie udało się wygenerować planszy dla maxN=${maxN}`);
      assert.strictEqual(solutions(p, 2), 1, `plansza maxN=${maxN} nie ma unikalnego rozwiązania`);
      const g = grade(p);
      assert.ok(g >= 1 && g <= tier, `plansza maxN=${maxN} ma niewłaściwy poziom trudności: ${g}`);

      // Sprawdź, że rozwiązanie wzorcowe przechodzi walidację solved().
      const partner = new Int16Array(p.rows * p.cols).fill(-1);
      for (const [u, v] of p.doms) {
        partner[u] = v;
        partner[v] = u;
      }
      assert.ok(solved(p, partner), "wzorcowy układ kostek nie przechodzi walidacji solved()");
    }
  }
});

test("analyze poprawnie wykrywa powtórzone pary kostek", () => {
  const p = generate(3, 1);
  const N = p.rows * p.cols;
  const partner = new Int16Array(N).fill(-1);
  // Znajdź dwie rozłączne krawędzie o tej samej parze cyfr.
  let foundDup = false;
  for (let pid = 0; pid < p.graph.D; pid++) {
    const list = p.graph.pairEdges[pid];
    for (let i = 0; i < list.length && !foundDup; i++) {
      for (let j = i + 1; j < list.length && !foundDup; j++) {
        const e1 = p.graph.edges[list[i]];
        const e2 = p.graph.edges[list[j]];
        if (e1.u !== e2.u && e1.u !== e2.v && e1.v !== e2.u && e1.v !== e2.v) {
          partner[e1.u] = e1.v;
          partner[e1.v] = e1.u;
          partner[e2.u] = e2.v;
          partner[e2.v] = e2.u;
          foundDup = true;
          const res = analyze(p, partner);
          assert.ok(res.badPairs.has(pid), "nie wykryto zduplikowanej pary");
          assert.ok(res.badCells.has(e1.u) && res.badCells.has(e2.u), "nie oznaczono błędnych pól");
        }
      }
    }
  }
  assert.ok(foundDup, "powinna istnieć co najmniej jedna para o dwóch rozłącznych położeniach");
});
