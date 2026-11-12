// Test logiki gry Yin-Yang: node --test gry/yinyang/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, generateFull, checkBoard, countSolutions, isConnected } = require("./gra.js");

test("generateFull tworzy poprawną planszę bez 2x2 i ze spójnymi kolorami", () => {
  for (const n of [6, 8, 10]) {
    for (let k = 0; k < 20; k++) {
      const grid = generateFull(n);
      assert.strictEqual(grid.length, n * n);
      const res = checkBoard(grid, n);
      assert.strictEqual(res.solved, true, `Plansza ${n}x${n} powinna być poprawna`);
      assert.strictEqual(res.bad.size, 0);
      assert.strictEqual(res.connW, true);
      assert.strictEqual(res.connB, true);
    }
  }
});

test("generate tworzy rozwiązywalne plansze z dokładnie jednym rozwiązaniem", () => {
  const configs = [
    { n: 6, clues: 14, count: 15 },
    { n: 8, clues: 22, count: 10 },
    { n: 10, clues: 34, count: 5 },
  ];
  for (const { n, clues, count } of configs) {
    for (let k = 0; k < count; k++) {
      const { puzzle, solution } = generate(n, clues);
      assert.strictEqual(checkBoard(solution, n).solved, true);
      for (let i = 0; i < n * n; i++) {
        if (puzzle[i] !== 0) assert.strictEqual(puzzle[i], solution[i]);
      }
      assert.strictEqual(countSolutions(puzzle, n, 2), 1, `Zagadka ${n}x${n} musi mieć unikalne rozwiązanie`);
    }
  }
});

test("checkBoard wykrywa kwadrat 2x2 oraz rozłączne obszary", () => {
  const n = 4;
  // Kwadrat 2x2 z samych 1
  const bad2x2 = [
    1, 1, 2, 2,
    1, 1, 2, 2,
    2, 2, 2, 1,
    1, 1, 1, 1,
  ];
  const r1 = checkBoard(bad2x2, n);
  assert.strictEqual(r1.solved, false);
  assert.ok(r1.bad.size >= 4);

  // Rozłączne białe bez 2x2
  const split = [
    1, 2, 2, 2,
    2, 2, 2, 1,
    2, 1, 1, 2,
    2, 2, 2, 2,
  ];
  assert.strictEqual(isConnected(split, n, 1, false), false);
  assert.strictEqual(checkBoard(split, n).solved, false);
});
