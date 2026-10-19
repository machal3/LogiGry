// Test fizyki stołu: node --test gry/flipery/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { makeTable, newBall, step, bot, W } = require("./gra.js");

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
