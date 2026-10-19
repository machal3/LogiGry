// Test logiki Pięciu kart: talia, układy, rozstrzyganie i rezerwacja wymiany komputera.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { newDeck, deal, hand, beats, aiDiscard, SUITS } = require("./gra.js");

const C = (r, s) => ({ r, s });

test("talia: 52 karty, po 13 każdej barwy", () => {
  const d = newDeck();
  assert.equal(d.length, 52);
  for (let s = 0; s < 4; s++) assert.equal(d.filter((c) => c.s === s).length, 13);
});

test("rozdaie pięć i pięć bez powtórek", () => {
  for (let k = 0; k < 50; k++) {
    const [mine, ai, rest] = deal();
    assert.equal(mine.length + ai.length, 10);
    assert.equal(rest.length, 42);
    const keys = new Set();
    for (const c of [...mine, ...ai]) {
      const key = c.r * 4 + c.s;
      assert.ok(!keys.has(key));
      keys.add(key);
    }
  }
});

test("układy: kareta bije ful, ful bije kolor? prawidłowy szereg", () => {
  // para asów
  const pair = hand([C(14, 0), C(14, 1), C(5, 2), C(3, 3), C(7, 0)]);
  assert.equal(pair.cat, 1);
  assert.equal(pair.tie[0], 14);

  // dwie pary
  const two = hand([C(14, 0), C(14, 3), C(9, 1), C(9, 2), C(4, 0)]);
  assert.equal(two.cat, 2);

  // trójka
  const trips = hand([C(8, 0), C(8, 1), C(8, 2), C(4, 3), C(12, 0)]);
  assert.equal(trips.cat, 3);

  // strit
  const straight = hand([C(10, 0), C(11, 1), C(12, 2), C(13, 3), C(14, 0)]);
  assert.equal(straight.cat, 5);

  // kolor
  const flush = hand([C(2, 1), C(6, 1), C(9, 1), C(12, 1), C(5, 1)]);
  assert.equal(flush.cat, 4);

  // ą cou: pełne kareta i poker
  const quads = hand([C(7, 0), C(7, 1), C(7, 2), C(7, 3), C(2, 0)]);
  assert.equal(quads.cat, 7);
  const sf = hand([C(9, 0), C(10, 0), C(11, 0), C(12, 0), C(13, 0)]);
  assert.equal(sf.cat, 8);

  // hierarchia kategorii jest absolutna
  assert.ok(beats(sf, quads));
  assert.ok(beats(quads, flush));
  assert.ok(beats(flush, trips));
  assert.ok(beats(trips, two));
  assert.ok(beats(two, pair));
  assert.ok(!beats(pair, pair), "remis nie rozstrzyga");
  assert.ok(beats(hand([C(14,0),C(14,1),C(5,2),C(4,3),C(3,0)]), hand([C(9,0),C(9,1),C(5,2),C(4,3),C(3,0)])));
});

test("wymiana komputera: nie odrzuca ak grup, zostaje częste normalizację", () => {
  const cards = [C(14, 0), C(14, 1), C(4, 2), C(5, 3), C(7, 0)];
  const out = aiDiscard(cards);
  assert.ok(out.length <= 3);
  for (const i of out) assert.ok(cards[i].r !== 14, "nie wyrzuca wartościowej");
  // trójka: odrzuca tylko pojedyncze
  const trips3 = [C(6, 0), C(6, 1), C(6, 2), C(3, 3), C(11, 0)];
  const out2 = aiDiscard(trips3);
  assert.equal(out2.length, 2);
  // strit: bez wymiany
  assert.equal(aiDiscard([C(9, 0), C(10, 1), C(11, 2), C(12, 3), C(13, 0)]).length, 0);
});

test("barwy cztery, różne kolory znaków poprawne", () => {
  assert.equal(SUITS.length, 4);
});
