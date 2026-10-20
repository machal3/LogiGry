// Test logiki gry: node --test gry/trio/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { cardId, feature, allCards, isSet, sameFeatures, findSet, hasSet, setSeed, dealWithSet, refill, VALS } = require("./gra.js");

test("karty pokrywają cały zestaw i są różne", () => {
  assert.equal(allCards(3).length, 27);
  assert.equal(allCards(4).length, 81);
  for (const nf of [3, 4]) {
    const cards = allCards(nf);
    assert.equal(new Set(cards).size, cards.length);
    assert.ok(cards.every((c) => c >= 0 && c < VALS ** nf));
  }
  // zapis i odczyt cech
  for (let n = 0; n < 3; n++) for (let s = 0; s < 3; s++) for (let co = 0; co < 3; co++) for (let f = 0; f < 3; f++) {
    const id = cardId(n, s, co, f);
    assert.deepEqual([feature(id, 0), feature(id, 1), feature(id, 2), feature(id, 3)], [n, s, co, f]);
  }
});

test("trójka zgadza się z liczeniem sum (dwie niezależne zasady)", () => {
  // suma wartości każdej cechy dzieli się przez 3 dokładnie wtedy, gdy wartości są
  // wszystkie takie same albo wszystkie różne
  const bySum = (a, b, c, nf) => {
    for (let k = 0; k < nf; k++) if ((feature(a, k) + feature(b, k) + feature(c, k)) % 3 !== 0) return false;
    return true;
  };
  const cards = allCards(3);
  for (const a of cards) for (const b of cards) for (const c of cards) {
    assert.equal(isSet(a, b, c, 3), bySum(a, b, c, 3), `${a} ${b} ${c}`);
  }
  for (let t = 0; t < 20000; t++) {
    const [a, b, c] = [0, 0, 0].map(() => allCards(4)[Math.floor(Math.random() * 81)]);
    assert.equal(isSet(a, b, c, 4), bySum(a, b, c, 4), `${a} ${b} ${c}`);
  }
});

test("cały zestaw 81 kart ma 1080 trójek", () => {
  const cards = allCards(4);
  let n = 0;
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) for (let k = j + 1; k < cards.length; k++) {
    if (isSet(cards[i], cards[j], cards[k], 4)) n++;
  }
  // każdą trójkę wyznaczają dwie karty: C(81, 2) / 3 = 1080
  assert.equal(n, 1080);
});

test("trzy jednakowe cechy różnią się od zera wspólnych", () => {
  // karty różnią się wyłącznie liczbą kształtów
  assert.equal(sameFeatures(cardId(0, 1, 2, 0), cardId(1, 1, 2, 0), cardId(2, 1, 2, 0), 4), 3);
  // karty różnią się wszystkimi cechami
  assert.equal(sameFeatures(cardId(0, 0, 0, 0), cardId(1, 1, 1, 1), cardId(2, 2, 2, 2), 4), 0);
  assert.ok(isSet(...setSeed(), 4));
  assert.equal(sameFeatures(...setSeed(), 4), 3);
});

test("rozdanie zawsze daje stół z trójką, bez powtórzeń", () => {
  for (const nf of [3, 4]) {
    for (let t = 0; t < 400; t++) {
      const cards = dealWithSet(nf, 12);
      assert.equal(cards.length, 12);
      assert.equal(new Set(cards).size, 12);
      assert.ok(cards.every((c) => c >= 0 && c < VALS ** nf));
      assert.ok(hasSet(cards, nf), "stół bez trójki");
    }
  }
});

test("uzupełnienie stołu nie gubi trójki i nie powtarza kart", () => {
  for (const nf of [3, 4]) {
    for (let t = 0; t < 300; t++) {
      let cards = dealWithSet(nf, 12);
      const set = findSet(cards, nf);
      const next = cards.map((c, i) => (set.includes(i) ? null : c));
      cards = refill(next, nf);
      assert.equal(cards.length, 12);
      assert.equal(new Set(cards).size, 12);
      assert.ok(cards.every((c) => c != null && c >= 0 && c < VALS ** nf));
      assert.ok(hasSet(cards, nf), "stół bez trójki po uzupełnieniu");
    }
  }
});

test("partię da się rozegrać od początku do celu (16 trójek)", () => {
  for (const nf of [3, 4]) {
    for (let game = 0; game < 40; game++) {
      let cards = dealWithSet(nf, 12);
      for (let found = 0; found < 16; found++) {
        const set = findSet(cards, nf);
        assert.ok(set, `brak trójki w partii (${nf} cech, trójka ${found + 1})`);
        const next = cards.map((c, i) => (set.includes(i) ? null : c));
        cards = refill(next, nf);
      }
    }
  }
});
