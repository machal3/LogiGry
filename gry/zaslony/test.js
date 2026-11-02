// Test logiki Zasłon: node --test gry/zaslony/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const {
  build, cluesFrom, conflicts, countSolutions, makeSolution, neighbours,
  solve, solved, visibleCount, whiteAreas, whiteConnected,
} = require("./gra.js");

const noTouch = (black, n, m) => {
  for (let i = 0; i < n * m; i++) {
    if (!black[i]) continue;
    for (const k of neighbours(n, m, i)) if (black[k]) return false;
  }
  return true;
};

test("losowe rozwiązanie spełnia zasady", () => {
  for (const [n, m] of [[5, 5], [7, 7], [9, 9]]) {
    for (let k = 0; k < 8; k++) {
      const black = makeSolution(n, m);
      assert.ok(black, `rozwiązanie ${n} × ${m}`);
      assert.ok(noTouch(black, n, m), "czarne pola nie mogą się stykać");
      assert.ok(whiteConnected(black, n, m), "białe pola muszą tworzyć całość");
      const p = { n, m, clue: cluesFrom(black, n, m) };
      assert.ok(solved(p, black), "zapisane rozwiązanie musi spełniać liczby");
    }
  }
});

test("generowana łamigłówka ma dokładnie jedno rozwiązanie", () => {
  const levels = [
    { n: 5, m: 5, hide: 7, budget: 2500 },
    { n: 7, m: 7, hide: 16, budget: 2500 },
    { n: 9, m: 9, hide: 30, budget: 3000 },
  ];
  for (const { n, m, hide, budget } of levels) {
    const p = build(n, m, hide, budget);
    assert.ok(p, `generowanie ${n} × ${m}`);
    assert.ok(p.hidden > 0, "część liczb musi być ukryta");
    assert.ok(p.hidden >= Math.min(hide, 3), `ukryte liczby: ${p.hidden}`);
    assert.ok(solved(p, p.solution), "rozwiązanie musi spełniać zasady");
    const again = countSolutions(p.clue, n, m, 2, Date.now() + 5000);
    assert.equal(again.found, 1, `dokładnie jedno rozwiązanie ${n} × ${m}`);
    const found = solve(p.clue, n, m, Date.now() + 5000);
    assert.deepEqual([...found], [...p.solution], "solver musi odtworzyć zapisane rozwiązanie");
  }
});

test("widoczność liczy białe pola do pierwszej zasłony", () => {
  const n = 3, m = 3;
  const black = new Uint8Array(9);
  black[1] = 1;
  // z lewego górnego rogu widać: siebie, pola pod sobą (3, 6); w prawo zasłania pole 1
  assert.equal(visibleCount(black, n, m, 0), 3);
  // z prawego dolnego rogu widać cały rząd i całą kolumnę bez zasłony
  assert.equal(visibleCount(black, n, m, 8), 5);
  assert.equal(visibleCount(black, n, m, 1), 0);
});

test("conflicts wskazuje za mały widok i stykające się zasłony", () => {
  const n = 3, m = 3;
  const clue = new Int16Array(9);
  clue[4] = 9; // w środku nie da się zobaczyć dziewięciu pól
  const p = { n, m, clue };
  const black = new Uint8Array(9);
  black[0] = black[1] = 1;
  const { bad, counts } = conflicts(p, black);
  assert.ok(bad.has(4), "liczba w środku jest niemożliwa");
  assert.equal(counts[4], 4, "widok z środka przy zasłonach 0 i 1");
  assert.ok(bad.has(0) && bad.has(1), "stykające się zasłony to błąd");
});

test("obszary białych pól i wygrana", () => {
  const n = 3, m = 3;
  const clue = new Int16Array(9).fill(0);
  // zasłony układają się w skos i odcinają prawy górny róg
  const black = new Uint8Array(9);
  black[1] = black[5] = black[7] = 1;
  assert.ok(whiteAreas(black, n, m) > 1);
  assert.equal(whiteConnected(black, n, m), false);
  assert.equal(whiteAreas(new Uint8Array(9), n, m), 1);
});

test("solved przyjmuje tylko pełne rozwiązanie", () => {
  const n = 5, m = 5;
  const black = makeSolution(n, m);
  const p = { n, m, clue: cluesFrom(black, n, m) };
  assert.ok(solved(p, black));

  // odsłonięcie prawdziwej zasłony psuje liczby
  const wrong = black.slice();
  const k = wrong.indexOf(1);
  wrong[k] = 0;
  assert.equal(solved(p, wrong), false);

  // dodatkowa zasłona na białym polu też jest błędem
  const extra = black.slice();
  const j = extra.indexOf(0);
  extra[j] = 1;
  assert.equal(solved(p, extra), false);
});
