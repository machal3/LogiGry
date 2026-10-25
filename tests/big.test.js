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
    // urządzenia stoją na podłodze, nie na sobie nawzajem i nie na przedmiotach
    const spots = [...m.feats, ...m.items].map((x) => x.i);
    assert.equal(new Set(spots).size, spots.length);
    for (const f of m.feats) assert.equal(m.t[f.i], 1);
    assert.ok(m.feats.some((f) => f.kind === "fountain") && m.feats.some((f) => f.kind === "altar"));
  }
});

test("podbój: spójna mapa, posiłki, rzuty i szanse", () => {
  const C = g("podboj");
  for (const [n, p, GW, GH] of [[16, 3, 32, 20], [24, 4, 32, 20], [24, 4, 24, 24]]) {
    const G = C.newGame({ regions: n, players: p }, { GW, GH, RP: 8 });
    const R = G.R;
    assert.equal(R.length, n);
    const seen = new Set([0]), queue = [0];
    for (let q = 0; q < queue.length; q++) for (const a of R[queue[q]].adj) if (!seen.has(a)) { seen.add(a); queue.push(a); }
    assert.equal(seen.size, n);
    for (const r of R) for (const a of r.adj) assert.ok(R[a].adj.has(r.id)); // sąsiedztwo symetryczne
    for (const r of R) assert.equal(G.map.lab[Math.floor(r.ly / 5 * 8) * G.map.MW + Math.floor(r.lx / 5 * 8)], r.id); // znacznik leży w swoim regionie
    assert.equal(R.filter((r) => r.capital).length, p);
    assert.equal(new Set(R.filter((r) => r.capital).map((r) => r.owner)).size, p);
    assert.ok(C.reinforcements(G, 0).total >= 3 + 2);
  }
  const r = C.battle(10, 5, () => 0.99);
  assert.deepEqual([r.a.length, r.d.length, r.la, r.ld], [3, 2, 2, 0]); // remis broni obrońca
  const m = C.battle(10, 5, () => 0.5, { def3: true, wall: true });
  assert.deepEqual([m.d.length, m.la, m.ld], [3, 3, 0]); // góry: trzy kości obrony
  assert.ok(Math.abs(C.odds(2, 1) - 15 / 36) < 1e-9); // jedna kość na jedną
  assert.ok(C.odds(2, 1, { wall: true }) < C.odds(2, 1));
  assert.ok(C.odds(10, 3) > 0.9 && C.odds(3, 10) < 0.05);
  // szansa zgadza się z rzutami
  let won = 0;
  for (let k = 0; k < 4000; k++) {
    const a = { armies: 6 }, d = { armies: 4 };
    while (a.armies > 1 && d.armies > 0) { const b = C.battle(a.armies, d.armies); a.armies -= b.la; d.armies -= b.ld; }
    if (d.armies <= 0) won++;
  }
  assert.ok(Math.abs(won / 4000 - C.odds(6, 4)) < 0.035);
});

test("podbój: partie komputerów się kończą, medale i wymiany", () => {
  const C = g("podboj");
  const lv = { regions: 16, players: 3, aggr: 1, smart: true, focus: 0, extra: 0 };
  for (let k = 0; k < 4; k++) {
    const G = C.newGame(lv, { RP: 6 });
    let alive = 3;
    for (let turn = 0; turn < 300 && alive > 1; turn++) {
      for (let p = 0; p < 3; p++) {
        if (!G.alive[p]) continue;
        for (const ev of C.aiTurn(G, p, lv)) if (ev.t === "attack") assert.ok(ev.rolls.length > 0);
        C.endTurn(G, p);
        assert.ok(G.R.every((r) => r.armies >= 1 && r.owner >= 0));
        assert.ok(G.medals.every((m) => m <= C.MAX_MEDALS));
      }
      alive = G.alive.filter(Boolean).length;
    }
    assert.equal(alive, 1);
  }
  const G = C.newGame({ regions: 16, players: 3 }, { RP: 6 });
  G.medals[0] = 4;
  assert.deepEqual([C.trade(G, 0), C.trade(G, 0), G.medals[0]], [4, 0, 1]);
  assert.deepEqual([4, 6, 8, 10, 12, 15, 18].map((v, k) => C.tradeValue(k)), [4, 6, 8, 10, 12, 15, 18]);
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

test("metro: pętla w jedną stronę i wybór pociągu najkrótszą drogą", () => {
  const M = g("metro");
  const st = [{ id: 1, shape: "circle" }, { id: 2, shape: "square" }, { id: 3, shape: "square" }, { id: 4, shape: "triangle" }];
  // pętla 1-2-3-4, pociągi tylko "do przodu": z 1 do trójkąta (4) trzeba objechać pętlę (3 przystanki)
  const one = M.distances(st, [{ stops: [1, 2, 3, 4], loop: true, dirs: new Set([1]) }], "triangle");
  assert.equal(one.get(1), 3);
  const both = M.distances(st, [{ stops: [1, 2, 3, 4], loop: true, dirs: new Set([1, -1]) }], "triangle");
  assert.equal(both.get(1), 1);
  // wsiada tylko pociąg, którego następny przystanek przybliża do celu
  assert.ok(M.rides(both, 1, 4));
  assert.ok(!M.rides(both, 1, 2));
  assert.ok(M.rides(one, 1, 2));
  // pasażer, który nie ma drogi, nie wsiada
  assert.ok(!M.rides(M.distances(st, [{ stops: [1, 2] }], "triangle"), 1, 2));
});

test("metro: układ sieci omija stacje, łagodzi skręty i rozdziela linie", () => {
  const M = g("metro");
  // obcy przystanek leży na trasie "najpierw prosto", więc odcinek zaczyna się skosem
  const st = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 30, y: 10 }, { id: 3, x: 20, y: 0 }];
  assert.equal(M.layout(st, [{ stops: [1, 2] }]).get("1-2"), 1);
  // wjazd skosem i wyjazd w dół to skręt o 45°, lepszy niż o 90°
  const st2 = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 30, y: 10 }, { id: 3, x: 30, y: 40 }];
  assert.equal(M.layout(st2, [{ stops: [1, 2, 3] }]).get("1-2"), 0);
  // dwie linie wychodzące z tej samej stacji nie jadą po sobie
  const st3 = [{ id: 1, x: 0, y: 0 }, { id: 2, x: 40, y: 10 }, { id: 3, x: 40, y: 25 }];
  const m = M.layout(st3, [{ stops: [1, 2] }, { stops: [1, 3] }]);
  const out = (b) => M.route(st3[0], b, m.get("1-" + b.id))[1];
  const a = out(st3[1]), b = out(st3[2]);
  assert.ok(Math.abs(Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x)) > 0.1);
  // linie obok siebie: przesunięte równolegle, łuk wewnętrzny ciaśniejszy
  const inner = M.bend({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 10 }, 2), outer = M.bend({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 10 }, -2);
  assert.deepEqual([inner[0].y, outer[0].y], [2, -2]);
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

test("twierdza: budowa, ulepszenia, czary i wygrana prostą obroną na łatwym", () => {
  const TD = g("twierdza");
  const lv = { key: "easy", map: "easy", waves: 10, gold: 230, lives: 20, hp: 0.75, grow: 1.09 };
  const s = TD.create(lv, { events: false });
  const road = [...s.road][0];
  assert.equal(TD.build(s, "archer", road), null);
  const t = TD.build(s, "archer", 1 * TD.COLS + 3);
  assert.ok(t);
  assert.equal(TD.build(s, "cannon", t.i), null);
  s.gold = 1000;
  assert.ok(TD.upgrade(s, t) && TD.upgrade(s, t, 1));
  assert.equal(t.tier, 2);
  assert.equal(TD.spec(t).key, "kusza");
  assert.equal(TD.upgrade(s, t), false);
  TD.sell(s, t);
  assert.equal(s.towers.length, 0);
  // fale rosną, ostatnia ma bossa; podgląd zgadza się z liczebnością
  assert.ok(TD.wave(10, 10).some((q) => q.type === "boss"));
  assert.equal(TD.waveSummary(TD.wave(7, 15)).reduce((a, [, n]) => a + n, 0), TD.wave(7, 15).length);
  assert.ok(TD.wave(3, 20, 2).some((q) => q.path === 1));
  // 6 łuczników na najlepszych polach i czary wystarczają do wygranej
  const s2 = TD.create(lv, { events: false });
  s2.gold = 2000;
  for (const i of [3 * 16 + 5, 3 * 16 + 7, 7 * 16 + 7, 7 * 16 + 10, 4 * 16 + 10, 2 * 16 + 12]) { const a = TD.build(s2, "archer", i); TD.upgrade(s2, a); TD.upgrade(s2, a, 0); }
  for (let k = 0; k < 60 * 60 * 15 && !s2.over; k++) {
    if (s2.waveDone) TD.callWave(s2);
    if (s2.enemies.length > 5 && s2.cd.meteor <= 0) TD.cast(s2, "meteor", s2.enemies[0].x, s2.enemies[0].y);
    TD.step(s2, 1 / 60);
  }
  assert.equal(s2.over, "win");
  assert.ok(s2.lives > 0);
});
