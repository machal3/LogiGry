// Test logiki młynka: node --test gry/mlynek/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { LINES, COORDS, ADJ, moves, millsOf, removable, bestMove, count, formsMill } = require("./gra.js");

test("plansza ma 24 pola i 16 linii", () => {
  assert.equal(COORDS.length, 24);
  assert.equal(LINES.length, 16);
  assert.equal(new Set(COORDS.map(([r, c]) => r * 7 + c)).size, 24, "pola nie mogą się powtarzać");
  LINES.forEach((L) => assert.equal(L.length, 3));
});

test("każde sąsiedztwo należy do jakiejś linii", () => {
  const inLine = new Set();
  LINES.forEach((L) => { inLine.add(L[0] * 100 + L[1]); inLine.add(L[1] * 100 + L[0]); inLine.add(L[1] * 100 + L[2]); inLine.add(L[2] * 100 + L[1]); });
  for (let i = 0; i < 24; i++) {
    assert.ok(ADJ[i].length >= 2, `pole ${i} ma za mało sąsiadów`);
    ADJ[i].forEach((j) => {
      assert.ok(ADJ[j].includes(i), "sąsiedztwo musi być obustronne");
      assert.ok(inLine.has(i * 100 + j), `para ${i}-${j} nie leży na linii`);
    });
  }
});

test("rozstawianie daje 24 ruchy, potem pionki chodzą po liniach", () => {
  const empty = new Array(24).fill(0);
  assert.equal(moves(empty, 1, 9).length, 24);
  const b = new Array(24).fill(0);
  b[0] = 1;
  const m = moves(b, 1, 0);
  assert.equal(m.length, ADJ[0].length);
  assert.ok(m.every((x) => x.from === 0));
});

test("młyn rozpoznaje trzy pionki w linii", () => {
  const b = new Array(24).fill(0);
  assert.equal(millsOf(b, 1).length, 0);
  [0, 1, 2].forEach((i) => (b[i] = 1));
  assert.equal(millsOf(b, 1).length, 1);
  assert.ok(formsMill(b, 1, 1));
  assert.equal(millsOf(b, 2).length, 0);
});

test("zbija się pionki spoza młyna, a gdy wszystkie są w młynie, dowolny", () => {
  const b = new Array(24).fill(0);
  [0, 1, 2].forEach((i) => (b[i] = 2));
  assert.equal(removable(b, 2).length, 3, "same młyny: wolno zbić każdy");
  b[8] = 2;
  assert.deepEqual(removable(b, 2), [8]);
});

test("komputer gra do końca i zwraca legalne ruchy", () => {
  const b = new Array(24).fill(0);
  const hand = [9, 9];
  let turn = 1, plies = 0, last = null;
  while (plies++ < 400) {
    const mv = bestMove(b, hand, turn, 1);
    if (!mv) { assert.ok(!hand[turn - 1], "brak ruchu zdarza się tylko w fazie przesuwania"); break; }
    if (mv.from < 0) hand[turn - 1]--; else b[mv.from] = 0;
    assert.equal(b[mv.to], 0, "pole docelowe musi być wolne");
    b[mv.to] = turn;
    if (mv.rm >= 0) { assert.equal(b[mv.rm], 3 - turn, "zbijać wolno tylko pionki rywala"); b[mv.rm] = 0; }
    last = mv;
    turn = 3 - turn;
    if (!hand[0] && !hand[1]) {
      const next = 3 - turn;
      if (count(b, next) < 3 || !moves(b, next, 0).length) break;
    }
  }
  assert.ok(last, "partia powinna się skończyć");
  assert.ok(plies < 400, "partia musi się zakończyć");
});
