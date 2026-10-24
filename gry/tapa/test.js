// Test logiki gry Tapa: node --test gry/tapa/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { getNeighborInfo, getRuns, validateSolution, PUZZLES } = require("./gra.js");

test("sąsiedzi komórki w narożniku, na brzegu i wewnątrz", () => {
  // Lewy górny róg w 6x6: 3 sąsiadów
  const c0 = getNeighborInfo(0, 0, 6, 6);
  assert.strictEqual(c0.cyclic, false);
  assert.strictEqual(c0.coords.length, 3);
  assert.deepStrictEqual(c0.coords, [1, 7, 6]);

  // Brzeg górny w 6x6: 5 sąsiadów
  const edge = getNeighborInfo(0, 2, 6, 6);
  assert.strictEqual(edge.cyclic, false);
  assert.strictEqual(edge.coords.length, 5);

  // Wnętrze w 6x6: 8 sąsiadów cyklicznie
  const inner = getNeighborInfo(2, 2, 6, 6);
  assert.strictEqual(inner.cyclic, true);
  assert.strictEqual(inner.coords.length, 8);
});

test("obliczanie biegów (getRuns) z zawijaniem i liniowych", () => {
  // Zawijanie w 8 sąsiadach: [1, 1, 0, 1, 0, 0, 0, 1] daje bieg 1 i bieg 3
  assert.deepStrictEqual(getRuns([1, 1, 0, 1, 0, 0, 0, 1], true), [1, 3]);

  // Pełne 8
  assert.deepStrictEqual(getRuns([1, 1, 1, 1, 1, 1, 1, 1], true), [8]);

  // Puste
  assert.deepStrictEqual(getRuns([0, 0, 0, 0, 0, 0, 0, 0], true), []);

  // Na przemian: 1, 1, 1, 1
  assert.deepStrictEqual(getRuns([1, 0, 1, 0, 1, 0, 1, 0], true), [1, 1, 1, 1]);

  // Liniowe na brzegu
  assert.deepStrictEqual(getRuns([1, 1, 1, 0, 0], false), [3]);
  assert.deepStrictEqual(getRuns([1, 0, 0, 1, 1], false), [1, 2]);
});

test("walidacja kwadratów 2x2 i spójności muru", () => {
  const cluesEmpty = new Array(16).fill(null);
  // Kwadrat 2x2 na planszy 4x4
  const board2x2 = [
    1, 1, 0, 0,
    1, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  const res2x2 = validateSolution(4, 4, cluesEmpty, board2x2);
  assert.strictEqual(res2x2.ok, false);
  assert.strictEqual(res2x2.reason, "2x2 violation");

  // Niespójny mur
  const boardSplit = [
    1, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ];
  const resSplit = validateSolution(4, 4, cluesEmpty, boardSplit);
  assert.strictEqual(resSplit.ok, false);
  assert.strictEqual(resSplit.reason, "disconnected black cells");
});

test("wszystkie 18 plansz w PUZZLES są w 100% poprawne i rozwiązane", () => {
  for (const n of [6, 7, 8]) {
    const list = PUZZLES[n];
    assert.ok(Array.isArray(list) && list.length >= 6, `Poziom ${n}x${n} musi mieć co najmniej 6 plansz`);

    list.forEach((p, idx) => {
      const clues = new Array(n * n).fill(null);
      for (const [k, v] of Object.entries(p.c)) clues[+k] = v;
      const board = p.s.split("").map(Number);
      const res = validateSolution(n, n, clues, board);
      assert.ok(res.ok, `Plansza ${n}x${n} nr ${idx + 1} nie przeszła walidacji: ${res.reason}`);
    });
  }
});
