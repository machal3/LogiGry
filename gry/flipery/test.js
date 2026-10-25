// Test fizyki stołu: node --test gry/flipery/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { makeTable, newBall, step, bot, W, endlessStage, endlessG, endlessSave, endlessExtraBall, endlessPoints } = require("./gra.js");

// wystrzał jak w grze: kulka, która wróciła na sprężynę, leci jeszcze raz
function run(g, useBot, seconds) {
  const t = makeTable();
  const ball = newBall();
  let still = 0, drained = false;
  for (let k = 0; k < 60 * seconds && !drained; k++) {
    if (ball.inLane && ball.y > 140 && Math.abs(ball.vy) < 25) Object.assign(ball, { x: 92, y: 144, vx: 0, vy: -(200 + 100 * Math.random()) });
    const ev = [];
    step(t, ball, useBot ? bot(t, ball) : { left: false, right: false }, 1 / 60, { g }, ev);
    if (t.targets.every((x) => !x.up)) t.targets.forEach((x) => (x.up = true));
    assert.ok(ball.x > 0 && ball.x < W && ball.y > 0, `kulka poza stołem: ${ball.x}, ${ball.y}`);
    // kulka nie może utknąć (poza dołkiem, który trzyma ją celowo)
    still = Math.hypot(ball.vx, ball.vy) < 1 && !ball.held && !ball.inLane ? still + 1 : 0;
    assert.ok(still < 60 * 4, `kulka utknęła w ${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}`);
    drained = ev.some((e) => e.kind === "drain");
  }
  return drained;
}

test("bez flipperów kulka zawsze w końcu spada (nigdzie się nie zatrzymuje)", () => {
  for (const g of [120, 140, 160]) for (let k = 0; k < 15; k++) assert.ok(run(g, false, 120));
});

test("z automatem kulka nie wylatuje ze stołu ani nie utyka", () => {
  for (const g of [120, 160]) for (let k = 0; k < 10; k++) run(g, true, 120);
});

test("tryb bez końca: punkty za bieg odpowiadają celom poziomów i rosną coraz szybciej", () => {
  assert.strictEqual(endlessPoints(0), 0);
  assert.ok(endlessPoints(9999) <= 5);
  assert.strictEqual(endlessPoints(10000), 10);
  assert.strictEqual(endlessPoints(25000), 25);
  assert.strictEqual(endlessPoints(50000), 50);
  assert.strictEqual(endlessPoints(1e7), 150);
  let prev = 0, prevGain = 0;
  for (let sc = 50000; sc <= 100000; sc += 10000) {
    const p = endlessPoints(sc);
    assert.ok(p >= prev);
    if (sc > 50000) { assert.ok(p - prev >= prevGain - 1); prevGain = p - prev; }
    prev = p;
  }
});

test("tryb bez końca: etapy i trudność rosną płynnie bez ściany", () => {
  assert.deepStrictEqual(endlessStage(0), { n: 1, from: 0, to: 5000 });
  assert.strictEqual(endlessStage(5000).n, 2);
  assert.strictEqual(endlessStage(32000).n, 5);
  assert.strictEqual(endlessStage(117000).n, 10);
  assert.strictEqual(endlessG(1), 120);
  assert.ok(Math.abs(endlessG(endlessStage(25000).n) - 140) <= 8);
  assert.ok(Math.abs(endlessG(endlessStage(50000).n) - 160) <= 8);
  assert.ok(endlessG(100) <= 210);
  assert.strictEqual(endlessSave(1), 8);
  assert.strictEqual(endlessSave(20), 0);
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7].filter(endlessExtraBall), [4, 7]);
});

test("przy największej grawitacji trybu ∞ kulka nie wylatuje ani nie utyka", () => {
  for (let k = 0; k < 10; k++) run(210, true, 60);
});
