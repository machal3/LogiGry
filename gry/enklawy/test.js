// Test logiki gry Enklawy: node --test gry/enklawy/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { partition, solutions, grade, generate, conflicts, solved } = require("./gra.js");

test("podział na enklawy tworzy spójne regiony o rozmiarach 2..5", () => {
  for (const n of [5, 6, 7]) {
    for (let k = 0; k < 25; k++) {
      const p = partition(n);
      assert.ok(p, `brak podziału dla n=${n}`);
      const seen = new Set();
      for (let r = 0; r < p.regions.length; r++) {
        const reg = p.regions[r];
        assert.ok(reg.length >= 2 && reg.length <= 5, `zły rozmiar enklawy: ${reg.length}`);
        for (const cell of reg) {
          assert.strictEqual(p.owner[cell], r);
          seen.add(cell);
        }
      }
      assert.strictEqual(seen.size, n * n);
    }
  }
});

test("każdy poziom generuje łamigłówkę z dokładnie jednym rozwiązaniem i bez zgadywania", () => {
  const levels = [
    [5, 1, 9],
    [6, 2, 11],
    [7, 2, 13],
  ];
  for (const [n, tier, minGivens] of levels) {
    for (let k = 0; k < 20; k++) {
      const p = generate(n, tier, minGivens);
      assert.ok(p, `nie udało się wygenerować planszy ${n}x${n}`);
      assert.strictEqual(solutions(p, 2), 1, `plansza ${n}x${n} nie ma unikalnego rozwiązania`);
      const g = grade(p);
      assert.ok(g >= 1 && g <= tier, `plansza ${n}x${n} ma zły poziom trudności: ${g}`);
      assert.ok(solved(p, p.solution), "rozwiązanie nie przechodzi walidacji solved()");
      assert.strictEqual(conflicts(p, p.solution).size, 0, "rozwiązanie zawiera konflikty");
    }
  }
});

test("wykrywanie konfliktów poprawnie znajduje błędy sąsiedztwa i enklawy", () => {
  const p = generate(5, 1, 9);
  const g = Int8Array.from(p.solution);
  assert.strictEqual(conflicts(p, g).size, 0);
  // Wpisanie tej samej cyfry w dwa sąsiednie pola musi zgłosić konflikt.
  g[0] = g[1];
  const bad = conflicts(p, g);
  assert.ok(bad.has(0) && bad.has(1), "nie wykryto konfliktu sąsiednich pól");
});
