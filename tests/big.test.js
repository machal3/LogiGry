// Testy logiki rozbudowanych gier: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../lib.js"));
const g = (name) => require(`../games/${name}.js`);

test("szachy: perft z pozycji startowej", () => {
  const C = g("szachy");
  const perft = (st, d) => (d ? C.moves(st).reduce((n, m) => n + perft(C.play(st, m), d - 1), 0) : 1);
  assert.deepEqual([1, 2, 3].map((d) => perft(C.start(), d)), [20, 400, 8902]);
});

test("lochy: amulet osiągalny z wejścia na ostatnim piętrze", () => {
  const D = g("lochy");
  for (let k = 0; k < 20; k++) {
    const m = D.generate(5, true);
    const amulet = m.items.find((it) => it.kind === "amulet");
    assert.ok(amulet);
    const seen = new Set([m.start]), queue = [m.start];
    for (let q = 0; q < queue.length; q++) for (const d of [1, -1, D.MW, -D.MW]) { const n = queue[q] + d; if (m.t[n] && !seen.has(n)) { seen.add(n); queue.push(n); } }
    assert.ok(seen.has(amulet.i));
  }
});

test("podbój: spójna mapa, posiłki i rzuty", () => {
  const C = g("podboj");
  for (const [n, p] of [[16, 3], [24, 4]]) {
    const m = C.generate(n, p);
    assert.equal(m.regions.length, n);
    const seen = new Set([0]), queue = [0];
    for (let q = 0; q < queue.length; q++) for (const a of m.regions[queue[q]].adj) if (!seen.has(a)) { seen.add(a); queue.push(a); }
    assert.equal(seen.size, n);
    assert.ok(C.reinforcements(m, 0) >= 3);
  }
  const r = C.battle(10, 5, () => 0.99);
  assert.deepEqual([r.a.length, r.d.length, r.la, r.ld], [3, 2, 2, 0]); // remis broni obrońca
});

test("metro: odległości do kształtu z przesiadkami", () => {
  const M = g("metro");
  const st = [{ id: 1, shape: "circle" }, { id: 2, shape: "square" }, { id: 3, shape: "triangle" }, { id: 4, shape: "star" }];
  const d = M.distances(st, [{ stops: [1, 2] }, { stops: [2, 3] }], "triangle");
  assert.deepEqual([d.get(1), d.get(2), d.get(3), d.has(4)], [2, 1, 0, false]);
});

test("metro: odcinki pod kątem 45° i przystanki przed pociągiem", () => {
  const M = g("metro");
  for (const [a, b] of [[{ x: 0, y: 0 }, { x: 10, y: 4 }], [{ x: 5, y: 9 }, { x: 2, y: -3 }]]) {
    const [p, m, q] = M.route(a, b);
    assert.deepEqual([p, q], [a, b]);
    const dx = Math.abs(q.x - m.x), dy = Math.abs(q.y - m.y);
    assert.ok(Math.abs(dx - dy) < 1e-9); // druga część zawsze po przekątnej
    assert.ok(m.x === a.x || m.y === a.y); // pierwsza część prosto
  }
  assert.deepEqual(M.ahead([1, 2, 3, 4], 1, 1), [3, 4]);
  assert.deepEqual(M.ahead([1, 2, 3, 4], 2, -1), [2, 1]);
});

test("farma: podlana roślina rośnie, sucha nie", () => {
  const F = g("farma");
  const s = { plots: [{ crop: "radish", age: 0, water: true }, { crop: "radish", age: 0, water: false }], items: [null, null], stock: {}, prices: {}, chickens: 0, feed: 0 };
  F.grow(s, 2, () => 0.99);
  F.grow(s, 2, () => 0.99);
  assert.equal(s.plots[0].age, 1);
  assert.equal(s.plots[1].age, 0);
});

test("wyścig: tor zamknięty, najbliższy punkt", () => {
  const R = g("wyscig");
  for (const t of R.TRACKS) {
    const P = R.path(t);
    assert.equal(P.length, t.length * 14);
    assert.deepEqual(R.nearest(P, P[5][0], P[5][1]), [5, 0]);
  }
});

test("przygoda: każdy etap ma start i metę", () => {
  const P = g("przygoda");
  for (const make of P.STAGES) {
    const L = make();
    assert.ok(L.things.some((t) => t.kind === "start") && L.things.some((t) => t.kind === "goal"));
  }
});
