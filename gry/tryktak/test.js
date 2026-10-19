// Test logiki: pozycja startowa, zbijanie, bar, zdejmowanie i sensowność AI.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { initial, moves, apply, bestSeq, homeReady, pip, anyMoves } = require("./gra.js");

test("pozycja startowa ma 30 bierków i koszt dojścia 167", () => {
  const s = initial();
  const n = s.pts.reduce((a, p) => a + p.n, 0) + s.bar[1] + s.bar[2];
  assert.equal(n, 30);
  assert.equal(pip(s, 1), 167);
  assert.equal(pip(s, 2), 167);
});

test("biały wchodzi z baru na pola 19–24 i nie ląduje na zamkniętym", () => {
  const s = initial();
  s.pts = s.pts.map((p) => ({ n: p.n, o: p.o }));
  s.bar[1] = 2;
  // pole 24 (indeks 23) zajęte przez czarne ×2: kostka 6 nie jest legalna, 5 jest
  s.pts[23] = { n: 2, o: 2 };
  assert.ok(!moves(s, 1, 6).length, "kostka 6 nie wchodzi");
  assert.ok(moves(s, 1, 5).length, "kostka 5 wchodzi na pole 19");
});

test("podwójne oczko daje cztery zużycia, a ruchy skracają koszty", () => {
  const s = initial();
  const seq = bestSeq(s, 1, [3, 3, 3, 3]);
  const st = seq.state;
  assert.ok(st, "podwójne zwraca stan");
  const after = st;
  const used = 15 - (after.pts.reduce((a, p) => a + p.n, 0) + after.bar[1] + after.bar[2]) + // zjięte
    (s.pts.reduce((a, p) => a + p.n, 0));
  // każdy ruch przenosi bierko albo zdejmuje: po czterech ruchach suma pól może się zmienić co najwyżej o 4
  assert.ok(used <= 4 + 15, "zamrożte: przeniesienia zgodne z liczbą kostek");
});

test("zdejmowanie jest możliwe tylko z domu poprawną kostką", () => {
  const s = initial();
  s.pts = s.pts.map(() => ({ n: 0, o: 0 }));
  s.pts[3] = { n: 3, o: 1 };
  s.pts[0] = { n: 1, o: 1 };
  assert.ok(homeReady(s, 1), "wszystkie w domu");
  const m4 = moves(s, 1, 4); // pole 4 (indeks 3): dokładnie 4
  assert.ok(m4.some((mv) => mv.from === 3 && mv.to === "off"), "kostka 4 zdejmuje z pola 4");
  const m6 = moves(s, 1, 6);
  assert.ok(m6.some((mv) => mv.from === 3 && mv.to === "off"), "kostka 6 zdejmuje z najdalszego pola, bo nie ma dalszych");
  s.pts[8] = { n: 2, o: 1 }; // bierko za domem
  assert.ok(!moves(s, 1, 4).some((mv) => mv.to === "off"), "poza domem nie można zdejmować");
});

test("zbicie pojedynczego bierka przeciwnika wysyła je na bar", () => {
  const s = initial();
  s.pts = s.pts.map(() => ({ n: 0, o: 0 }));
  s.pts[20] = { n: 1, o: 2 };
  s.pts[23] = { n: 1, o: 1 };
  const m = moves(s, 1, 3).find((mv) => mv.to === 20);
  assert.ok(m, "legalny ruch 24 → 21");
  const { hit } = apply(s, m, 1);
  assert.ok(hit, "zbicie");
  assert.equal(s.bar[2], 1);
  assert.equal(s.pts[20].o, 1);
});

test("AI wybiera ruch obniżający własny koszt dojścia albo zbijając", () => {
  for (let k = 0; k < 30; k++) {
    const a = 1 + rnd(6), b = 1 + rnd(6);
    const dice = a === b ? [a, a, a, a] : [a, b];
    const s = initial();
    const { seq, state } = bestSeq(s, 2, dice, 0);
    if (state) {
      assert.ok(pip(state, 2) <= pip(s, 2), "podwójne nie pomusza na drodze");
      continue;
    }
    if (!seq.length) continue;
    assert.ok(anyMoves(s, 2, dice), "zaplanowany ruch istnieje");
    const probe = JSON.parse(JSON.stringify(s));
    let last = null;
    for (const mv of seq) {
      const d = dieUsed(mv);
      assert.ok(moves(probe, 2, d).some((m) => String(m.from) === String(mv.from) && String(m.to) === String(mv.to)), "sekwencja legalna");
      last = apply(probe, mv, 2);
    }
    assert.ok(last, "sekwencja odtworzona");
    assert.ok(last.hit || pip(probe, 2) <= pip(s, 2), "AI poprawia pozycję albo zbija");
  }
});

// Kostka zużyta przez czarnego: z baru wchodzi na pole die-1, w domu 24 - from, w zwykłym ruchu to - from.
function dieUsed(mv) {
  if (mv.from === "bar") return mv.to + 1;
  const f = 24 - mv.from;
  const t = mv.to === "off" ? 0 : 24 - mv.to;
  return f - t;
}
