// Test fizyki: node --test gry/owoce/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { FRUITS, createWorld, drop, step, overLine, nextTier, endlessStage, endlessPoints, BOTTOM, LINE } = require("./gra.js");

test("owoce zostają w słoju, a jednakowe się łączą", () => {
  const w = createWorld(80);
  let merged = 0;
  for (let k = 0; k < 40; k++) {
    drop(w, 20 + Math.random() * 60, rnd(3));
    for (let f = 0; f < 40; f++) step(w, 1 / 60);
    merged += w.events.splice(0).length;
    for (const f of w.fruits) {
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), "NaN w fizyce");
      assert.ok(f.x >= w.L + f.r - 0.01 && f.x <= w.R - f.r + 0.01, "owoc poza słojem");
      assert.ok(f.y <= BOTTOM - f.r + 0.01, "owoc pod dnem");
    }
  }
  assert.ok(merged > 5, `za mało połączeń: ${merged}`);
});

test("dwa jednakowe owoce zawsze tworzą większy", () => {
  const w = createWorld(80);
  drop(w, 50, 4);
  for (let f = 0; f < 120; f++) step(w, 1 / 60);
  drop(w, 50, 4);
  for (let f = 0; f < 120; f++) step(w, 1 / 60);
  assert.strictEqual(w.fruits.length, 1);
  assert.strictEqual(w.fruits[0].tier, 5);
});

// Gracz, który patrzy jeden owoc do przodu: wybiera miejsce z największym połączeniem i najniższą stertą.
function play(jar, target, maxDrops) {
  const clone = (w) => ({ ...w, events: [], fruits: w.fruits.map((f) => ({ ...f })) });
  const top = (w) => Math.min(BOTTOM, ...w.fruits.map((f) => f.y - f.r));
  const w = createWorld(jar);
  for (let k = 0; k < maxDrops; k++) {
    if (w.best >= target) return { won: true, drops: k };
    const tier = nextTier();
    let best = 50, bestV = -Infinity;
    for (let x = w.L + 2; x <= w.R - 2; x += 6) {
      const c = clone(w);
      drop(c, x, tier);
      for (let f = 0; f < 45; f++) step(c, 1 / 60);
      const v = c.events.reduce((a, e) => a + e.tier * e.tier * 10, 0) + top(c);
      if (v > bestV) { bestV = v; best = x; }
    }
    drop(w, best, tier);
    for (let f = 0; f < 30; f++) step(w, 1 / 60);
    w.events.length = 0;
    if (overLine(w)) {
      for (let f = 0; f < 120; f++) step(w, 1 / 60);
      w.events.length = 0;
      if (overLine(w)) return { won: false, drops: k, best: w.best };
    }
  }
  return { won: w.best >= target, drops: maxDrops, best: w.best };
}

test("łatwy poziom (gruszka) jest do wygrania prostą strategią", () => {
  let wins = 0;
  for (let t = 0; t < 4; t++) if (play(86, 6, 400).won) wins++;
  assert.ok(wins >= 3, `wygrane: ${wins} z 4`);
});

test("tęczowy owoc łączy się z pierwszym dotkniętym owocem", () => {
  const w = createWorld(80);
  drop(w, 50, 5);
  for (let f = 0; f < 120; f++) step(w, 1 / 60);
  drop(w, 50, -1);
  for (let f = 0; f < 120; f++) step(w, 1 / 60);
  assert.strictEqual(w.fruits.length, 1);
  assert.strictEqual(w.fruits[0].tier, 6);
});

test("tryb bez końca: trudność rośnie płynnie i ma granicę", () => {
  assert.deepStrictEqual(endlessStage(0), { jar: 86, line: LINE });
  assert.strictEqual(endlessStage(5).jar, 76);
  for (let k = 1; k < 40; k++) {
    const a = endlessStage(k - 1), b = endlessStage(k);
    assert.ok(b.jar <= a.jar && b.line >= a.line);
    assert.ok(a.jar - b.jar <= 2 && b.line - a.line <= 2, "skok trudności");
  }
  assert.deepStrictEqual(endlessStage(100), endlessStage(14));
  assert.ok(endlessStage(100).jar >= 70 && endlessStage(100).line <= LINE + 10);
});

test("tryb bez końca: punkty za bieg", () => {
  assert.strictEqual(endlessPoints(0), 0);
  assert.ok(endlessPoints(149) <= 5);
  assert.strictEqual(endlessPoints(150), 10);
  assert.strictEqual(endlessPoints(700), 25);
  assert.strictEqual(endlessPoints(1300), 50);
  assert.strictEqual(endlessPoints(1e6), 150);
  let prev = 0, step = 0;
  for (let s = 0; s <= 4000; s += 50) {
    const p = endlessPoints(s);
    assert.ok(p >= prev, `spadek przy ${s}`);
    if (s > 1300 && p < 150) { assert.ok(p - prev >= step - 1, `za ${s} punkty rosną wolniej`); step = p - prev; }
    prev = p;
  }
});
