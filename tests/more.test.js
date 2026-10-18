// Testy logiki nowych gier: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../lib.js"));
const g = (name) => require(`../games/${name}.js`);
const timed = (fn) => { const t = performance.now(); const r = fn(); return [r, performance.now() - t]; };

test("kakuro: jedno rozwiązanie, sumy się zgadzają", () => {
  const K = g("kakuro");
  for (const [n, d, m] of [[6, 0.16, 4], [8, 0.2, 5], [10, 0.22, 6]]) {
    const [p, ms] = timed(() => K.generate(n, d, m));
    assert.ok(ms < 3000, `generowanie ${ms}ms`);
    assert.equal(K.solve(p.white, n, p.sums, p.given, 2).found.length, 1);
    assert.equal(K.check(p.solution, p.runs, p.sums).goodRun.size, p.runs.length);
  }
});

test("hitori: jedno rozwiązanie spełniające zasady", () => {
  const H = g("hitori");
  for (const n of [5, 7, 9]) {
    const p = H.generate(n, 0.3);
    assert.equal(H.count(p.grid, n), 1);
    assert.ok(H.check(p.grid, p.solution, n).solved);
    const broken = p.solution.slice();
    broken[broken.indexOf(1)] = 0;
    assert.ok(!H.check(p.grid, broken, n).solved);
  }
});

test("kalkudoku: jedno rozwiązanie, klatki się zgadzają", () => {
  const K = g("kalkudoku");
  for (const [n, ops] of [[4, ["+", "−"]], [6, ["+", "−", "×", "÷"]]]) {
    const p = K.generate(n, ops);
    assert.equal(K.count(p.cages, n), 1);
    const c = K.check(p.solution, n, p.cages);
    assert.equal(c.bad.size, 0);
    assert.equal(c.right.size, p.cages.length);
  }
});

test("pętla: rozwiązanie to jedna zamknięta pętla", () => {
  const L = g("petla");
  for (const n of [5, 7, 10]) {
    const p = L.generate(n, 0.5, 0.7);
    assert.ok(L.check(n, p.clues, p.edges).solved);
    const open = new Set(p.edges);
    open.delete(open.values().next().value);
    assert.ok(!L.check(n, p.clues, open).loop);
  }
});

test("lampy, namioty, statki, prostokąty: rozwiązanie spełnia zasady", () => {
  const A = g("lampy"), T = g("namioty"), S = g("statki"), K = g("prostokaty");
  const a = A.generate(9, 0.22, 0.85);
  assert.ok(A.check(a.wall, 9, a.solution).solved);
  const t = T.generate(8, 0.2);
  assert.ok(T.check(t, t.solution).solved);
  const s = S.generate(8, [4, 3, 2, 2, 1, 1, 1], 2);
  assert.equal(S.solve(8, s.fleet, s.rows, s.cols, s.hint).found.length, 1);
  const k = K.generate(8, 10);
  assert.equal(K.count(8, k.clues), 1);
  assert.ok(k.rects.every((q) => K.good(q, 8, k.clues)));
});

test("połączenia i hydraulik: rozwiązanie wypełnia planszę", () => {
  const F = g("polaczenia"), P = g("hydraulik");
  const f = F.generate(7, 6);
  assert.ok(F.check(7, f.ends, f.pairs).solved);
  const p = P.generate(7);
  assert.ok(P.flow(p.base, 7, p.src).every(Boolean));
});

test("piętnastka, magazynier, korek, probówki, samotnik: zapisane rozwiązanie działa", () => {
  const F = g("pietnastka");
  const f = F.scramble(4, 300);
  const t = f.tiles.slice();
  f.solution.forEach((i) => F.slide(t, 4, i));
  assert.deepEqual(t, F.solved(4));

  const S = g("magazynier");
  const s = S.generate(11, 8, 3, 0.8);
  const st = { ...s, boxes: s.boxes.slice() };
  let ok = false;
  for (const d of s.solution) { assert.ok(S.move(st, d)); if (S.solved(st)) { ok = true; break; } }
  assert.ok(ok);

  const R = g("korek");
  const r = R.generate(10, 8, 16, 600);
  let cars = r.cars;
  for (const [k, p] of r.solution) cars = R.apply(cars, k, p);
  assert.ok(R.solved(cars));
  assert.equal(r.solution.length, r.moves);

  const W = g("probowki");
  const w = W.generate(7, 2);
  const tubes = w.tubes.map((x) => x.slice());
  w.solution.forEach(([i, j]) => assert.ok(W.pour(tubes, i, j)));
  assert.ok(W.done(tubes));

  const P = g("samotnik");
  for (const pegs of [9, 32]) {
    const p = P.generate(pegs);
    const b = p.peg.slice();
    p.solution.forEach(([f, o, to]) => { assert.ok(P.jumps(b).some((j) => j[0] === f && j[2] === to)); b[f] = 0; b[o] = 0; b[to] = 1; });
    assert.equal(b.reduce((x, y) => x + y, 0), 1);
  }
});

test("zalewanie, skoczek, mahjong, pasjans: plan zawsze kończy grę", () => {
  const F = g("zalewanie");
  const f = F.generate(14, 6);
  const grid = f.grid.slice();
  f.plan.forEach((c) => F.fill(grid, 14, c));
  assert.equal(F.region(grid, 14).size, 14 * 14);

  const K = g("skoczek");
  for (const n of [5, 6, 8]) assert.equal(new Set(K.tour(n, 0)).size, n * n);

  const M = g("mahjong");
  const m = M.generate("big", 28);
  const live = new Set(m.tiles);
  for (const [a, b] of m.order) { assert.ok(M.isFree(a, live) && M.isFree(b, live) && a.s === b.s); live.delete(a); live.delete(b); }

  const T = g("pasjans");
  const p = T.generate(false);
  let gone = 0, pos = 1, top = p.stock[0];
  for (const i of p.solution) {
    if (i < 0) top = p.stock[pos++];
    else { assert.ok(T.exposed(gone, i) && T.fits(p.peaks[i], top, false)); gone |= 1 << i; top = p.peaks[i]; }
  }
  assert.equal(gone, (1 << 28) - 1);
});

test("słowo, 24, wykreślanka: zasady i słownik", () => {
  const W = g("slowo");
  assert.equal(W.score("kasza", "zakas").join(""), "12111");
  assert.equal(W.score("abca", "aaaa").join(""), "2002");
  const words = g("slowa-pl");
  for (const len of [4, 5, 6]) assert.ok(W.words(len, words).length >= 40);
  const M = g("g24");
  assert.ok(M.analyze([3, 3, 8, 8]).any);
  assert.ok(!M.analyze([3, 3, 8, 8]).intOnly);
  assert.equal(M.analyze([1, 1, 1, 1]).any, null);
  const S = g("wykreslanka");
  const p = S.generate(words, 10, 8, [[0, 1], [1, 0], [1, 1], [-1, 1]]);
  p.words.forEach((w) => assert.equal(w.cells.map((i) => p.grid[i]).join(""), w.word));
});

test("gry z komputerem: AI blokuje i wygrywa, zasady warcabów", () => {
  const C = g("czworki");
  const b = new Array(42).fill(0);
  [35, 36, 37].forEach((i) => (b[i] = 1));
  assert.equal(C.bestMove(b, 4), 3);
  const R = g("reversi");
  assert.deepEqual(R.moves(R.start(), 1), [19, 26, 37, 44]);
  const K = g("warcaby");
  const w = new Array(64).fill(0);
  w[42] = 1; w[35] = -1; w[19] = -1; w[33] = -1;
  const ms = K.moves(w, 1);
  assert.equal(ms.length, 1, "bicie maksymalne");
  assert.deepEqual(ms[0].caps, [35, 19]);
  const G = g("gomoku");
  const gb = new Array(225).fill(0);
  [3, 4, 5, 6].forEach((c) => (gb[30 + c] = 2));
  assert.ok([32, 37].includes(G.bestMove(gb, 15, 1.15, 1, 0)));
  const D = g("kropki");
  const lines = new Array(D.H(3) + 12).fill(0);
  D.sides(3, 0).slice(0, 3).forEach((e) => (lines[e] = 1));
  assert.equal(D.aiMove(3, lines, 2), D.sides(3, 0)[3]);
});
