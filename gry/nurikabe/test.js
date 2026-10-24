const test = require("node:test");
const assert = require("node:assert/strict");
const { PUZZLES, validate, ortho } = require("./gra.js");

test("PUZZLES: wszystkie poziomy zawierają poprawne plansze", () => {
  assert.ok(PUZZLES[5] && PUZZLES[5].length >= 5, "Poziom 5x5 ma co najmniej 5 plansz");
  assert.ok(PUZZLES[6] && PUZZLES[6].length >= 5, "Poziom 6x6 ma co najmniej 5 plansz");
  assert.ok(PUZZLES[7] && PUZZLES[7].length >= 5, "Poziom 7x7 ma co najmniej 5 plansz");

  for (const size of [5, 6, 7]) {
    PUZZLES[size].forEach((p, idx) => {
      assert.equal(p.c.length, size * size, `Rozmiar clues planszy ${size}x${size} #${idx}`);
      assert.equal(p.s.length, size * size, `Rozmiar solution planszy ${size}x${size} #${idx}`);

      // Sprawdź, czy zapisane rozwiązanie jest w pełni poprawne według walidatora
      const res = validate(size, size, p.c, p.s);
      assert.equal(res.isSolved, true, `Plansza ${size}x${size} #${idx} musi być w pełni poprawna`);
      assert.equal(res.pools2x2.length, 0, `Brak jezior 2x2 w ${size}x${size} #${idx}`);
      assert.equal(res.waterConnected, true, `Woda spójna w ${size}x${size} #${idx}`);
      assert.equal(res.islandErrors.size, 0, `Brak błędów wysp w ${size}x${size} #${idx}`);
    });
  }
});

test("validate: wykrywanie jeziora 2x2 z wody", () => {
  const p = PUZZLES[5][0];
  const state = p.s.slice();
  // Zrób kwadrat 2x2 z wody na polach 0, 1, 5, 6
  state[0] = 1;
  state[1] = 1;
  state[5] = 1;
  state[6] = 1;
  const res = validate(5, 5, p.c, state);
  assert.equal(res.isSolved, false);
  assert.ok(res.pools2x2.length >= 4, "Wykryto pola jeziora 2x2");
});

test("validate: wykrywanie niespójnej wody", () => {
  // Plansza 3x3 z rozciętą wodą
  const clues = [1, 0, 1, 0, 0, 0, 0, 0, 0];
  // Woda rozdzielona ścianą ziemi
  const state = [
    2, 1, 2,
    2, 2, 2,
    1, 1, 1
  ];
  const res = validate(3, 3, clues, state);
  assert.equal(res.isSolved, false);
  assert.equal(res.waterConnected, false, "Woda rozdzielona ziemią nie jest spójna");
});

test("validate: wykrywanie za dużej wyspy", () => {
  const p = PUZZLES[5][0];
  const state = p.s.slice();
  // Znajdź pole z clue 1 i dodaj mu sąsiada jako ziemię (powiększając wyspę do 2)
  const clue1Idx = p.c.indexOf(1);
  const nxt = ortho(5, 5, clue1Idx)[0];
  state[nxt] = 2;
  const res = validate(5, 5, p.c, state);
  assert.equal(res.isSolved, false);
  assert.ok(res.islandErrors.size > 0, "Wyspa większa niż liczba musi zgłaszać błąd");
});

test("validate: niekompletna plansza nie jest wygrana", () => {
  const p = PUZZLES[5][0];
  const state = p.s.slice();
  // Skasuj jedno pole (zostaw puste 0)
  for (let i = 0; i < state.length; i++) {
    if (p.c[i] === 0) {
      state[i] = 0;
      break;
    }
  }
  const res = validate(5, 5, p.c, state);
  assert.equal(res.isSolved, false, "Niepełna plansza nie może być rozwiązana");
  assert.ok(res.emptyCount > 0);
});
