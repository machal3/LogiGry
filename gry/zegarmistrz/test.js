const test = require("node:test");
const assert = require("node:assert");
const { createPuzzle, move, solve } = require("./gra.js");

test("każdy wygenerowany zegarmistrz ma rozwiązanie", () => {
  for (const level of [[3, 1, 7], [4, 2, 11], [5, 3, 15]]) {
    const puzzle = createPuzzle(...level);
    const path = solve(puzzle.start, puzzle.target, level[1]);
    let state = puzzle.start;
    path.forEach(({ index, direction }) => { state = move(state, index, direction, level[1]); });
    assert.deepEqual(state, puzzle.target);
  }
});

test("ruch zawija wskazówkę i porusza sąsiadem przez przekładnię", () => {
  assert.deepEqual(move([11, 0, 4], 0, 1, 2), [0, 2, 4]);
});
