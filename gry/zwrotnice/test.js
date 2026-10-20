// Test logiki gry: node --test gry/zwrotnice/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { puzzle, ride, score, RIGHT, DOWN } = require("./gra.js");

const CFG = [
  { n: 5, m: 5, rowRail: 2, colRail: 2, trains: 2 },
  { n: 6, m: 6, rowRail: 2, colRail: 3, trains: 3 },
  { n: 7, m: 7, rowRail: 3, colRail: 3, trains: 4 },
];

function solutions(p) {
  const count = 1 << p.sw.length;
  let found = 0;
  for (let mask = 0; mask < count; mask++) {
    const state = Int8Array.from({ length: p.sw.length }, (_, i) => (mask >> i) & 1);
    if (score(p, state) === p.trains.length) found++;
  }
  return found;
}

test("zwrotnica o drugiej osi skręca pociąg w prawo", () => {
  const idx = new Int8Array(25).fill(-1);
  idx[2 * 5 + 2] = 0; // jedna zwrotnica w środku planszy 5 x 5
  const prosto = ride(5, 5, idx, Int8Array.from([0]), 2, 0, RIGHT);
  assert.deepStrictEqual(prosto.exit, [2, 4]); // oś pozioma: przejazd prosto
  const skret = ride(5, 5, idx, Int8Array.from([1]), 2, 0, RIGHT);
  assert.deepStrictEqual(skret.exit, [4, 2]); // oś pionowa: skręt w prawo, w dół
  assert.strictEqual(skret.dir, DOWN);
});

test("pociąg może wjechać w pętlę i wtedy nie ma stacji", () => {
  const idx = new Int8Array(9).fill(-1);
  idx[1 * 3 + 1] = 0;
  idx[1 * 3 + 2] = 1;
  idx[2 * 3 + 2] = 2;
  idx[2 * 3 + 1] = 3;
  const res = ride(3, 3, idx, Int8Array.from([0, 1, 0, 1]), 1, 1, RIGHT);
  assert.strictEqual(res.exit, null);
  assert.ok(res.loop && res.loop.length > 1);
  assert.deepStrictEqual(res.path[res.path.length - 1], res.path[res.path.indexOf(res.loop[0])]);
});

test("każdy poziom da się ułożyć, ma jedno rozwiązanie i żadnej zbędnej zwrotnicy", () => {
  for (const cfg of CFG) {
    for (let k = 0; k < 20; k++) {
      const p = puzzle(cfg.n, cfg.m, cfg.rowRail, cfg.colRail, cfg.trains);
      assert.ok(p, "brak planszy");
      assert.strictEqual(p.unique, true, "plansza nie ma jednego rozwiązania");
      assert.strictEqual(p.trains.length, cfg.trains);
      assert.strictEqual(p.sw.length, cfg.rowRail * cfg.colRail);
      assert.strictEqual(score(p, p.state), cfg.trains, "rozwiązanie nie prowadzi wszystkich do stacji");
      assert.strictEqual(score(p, p.start), 0, "partia zaczyna się od rozwiązania");
      assert.ok(score(p, p.start) < cfg.trains);
      assert.strictEqual(solutions(p), 1, "rozwiązanie nie jest jednoznaczne");

      const key = (a) => a[0] * p.m + a[1];
      const ins = p.trains.map((t) => key(t.from));
      const outs = p.trains.map((t) => key(t.to));
      assert.strictEqual(new Set(ins).size, cfg.trains, "powtórzone wejścia");
      assert.strictEqual(new Set(outs).size, cfg.trains, "powtórzone stacje");
      for (const i of ins) assert.ok(!outs.includes(i), "stacja na wejściu pociągu");

      let distance = 0;
      for (let i = 0; i < p.sw.length; i++) if (p.start[i] !== p.state[i]) distance++;
      assert.ok(distance >= 2, `start zbyt blisko rozwiązania: ${distance}`);

      const used = new Set();
      const routes = [];
      for (const t of p.trains) {
        const r = ride(p.n, p.m, p.idx, p.state, t.from[0], t.from[1], t.from[2]);
        routes.push(r);
        assert.ok(r && r.exit, "pociąg nie wyjechał z planszy");
        assert.ok(r.uses > 0, "pociąg mija za mało zwrotnic");
        assert.ok(r.path.length > 1);
        assert.deepStrictEqual(r.exit, t.to);
        for (const [rr, cc] of r.path) {
          const s = p.idx[rr * p.m + cc];
          if (s >= 0) used.add(s);
        }
      }
      assert.strictEqual(used.size, p.sw.length, "któraś zwrotnica nie jest używana");

      // trasa żadnego pociągu nie przechodzi przez wjazd ani stację innego pociągu
      for (let i = 0; i < routes.length; i++) {
        const pathKeys = new Set(routes[i].path.map(([rr, cc]) => rr * p.m + cc));
        for (let j = 0; j < p.trains.length; j++) {
          if (i === j) continue;
          assert.ok(!pathKeys.has(key(p.trains[j].from)), "trasa przechodzi przez wjazd innego pociągu");
          assert.ok(!pathKeys.has(key(p.trains[j].to)), "trasa przechodzi przez stację innego pociągu");
        }
      }

      // przełączenie dowolnej zwrotnicy musi zepsuć co najmniej jedną trasę
      for (let i = 0; i < p.sw.length; i++) {
        const wrong = Int8Array.from(p.state);
        wrong[i] ^= 1;
        assert.ok(score(p, wrong) < cfg.trains, `zwrotnica ${i + 1} nie ma znaczenia`);
      }
    }
  }
});
