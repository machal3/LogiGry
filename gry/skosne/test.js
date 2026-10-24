// Test logiki: node --test gry/skosne/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, hasLoop, solutions, solved, randomFill, faults } = require("./gra.js");

test("losowe wypełnienie nie ma pętli", () => {
  for (let n = 4; n <= 6; n++) {
    for (let k = 0; k < 20; k++) {
      const g = randomFill(n);
      assert.ok(g, "wypełnienie się udało");
      assert.equal(hasLoop(n, g), false);
    }
  }
});

test("plansza 4 × 4 ma jedno rozwiązanie", () => {
  for (let k = 0; k < 12; k++) {
    const p = generate(4, 8);
    assert.ok(p, "generator zwrócił planszę");
    assert.equal(hasLoop(4, p.sol), false);
    const { found } = solutions(4, p.clues, 2);
    assert.equal(found, 1, "dokładnie jedno rozwiązanie");
    assert.ok(solved(4, p.clues, p.sol));
  }
});

test("plansza 5 × 5 ma jedno rozwiązanie", () => {
  const p = generate(5, 12);
  assert.ok(p);
  assert.equal(solutions(5, p.clues, 2).found, 1);
  assert.ok(solved(5, p.clues, p.sol));
});

test("puste rozwiązanie nie jest ukończone, pełne nie ma wad", () => {
  const p = generate(4, 6);
  const empty = new Int8Array(16);
  const f0 = faults(4, p.clues, empty);
  assert.equal(f0.over, 0);
  assert.equal(solved(4, p.clues, empty), false);
  const f1 = faults(4, p.clues, p.sol);
  assert.equal(f1.loop.length, 0);
  assert.equal(f1.over, 0);
  assert.equal(f1.ok, f1.total);
});
