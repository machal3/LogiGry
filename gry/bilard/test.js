// Test fizyki i podpowiedzi: node --test gry/bilard/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { rack, simulate, bestShot, R, X0, X1, Y0, Y1 } = require("./gra.js");

test("trójkąt bez nakładania, ósemka w grze", () => {
  for (const [n, e] of [[6, false], [10, true], [15, true]]) {
    const b = rack(n, e);
    assert.strictEqual(b.length, n + 1);
    assert.strictEqual(b.some((x) => x.n === 8), e);
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) assert.ok(Math.hypot(b[i].x - b[j].x, b[i].y - b[j].y) >= 2 * R - 0.01);
    for (const x of b) assert.ok(x.x > X0 + R && x.x < X1 - R && x.y > Y0 + R && x.y < Y1 - R);
  }
});

test("rozbicie: bile się zatrzymują i zostają na stole albo w łuzach", () => {
  const b = rack(15, true);
  const r = simulate(b, 0, 230);
  for (const x of r.balls) {
    assert.ok(!x.vx && !x.vy);
    assert.ok(x.in || (x.x >= X0 && x.x <= X1 && x.y >= Y0 && x.y <= Y1));
  }
});

test("łatwy poziom: podpowiedzi czyszczą stół w limicie pudeł", () => {
  let wins = 0;
  for (let game = 0; game < 4; game++) {
    let balls = rack(6, false), misses = 0;
    for (let k = 0; k < 40 && balls.some((x) => x.n && !x.in) && misses <= 12; k++) {
      const s = bestShot(balls, false);
      const r = simulate(balls, s.ang, s.power);
      balls = r.balls;
      if (balls[0].in) Object.assign(balls[0], { in: false, x: 55, y: 55 });
      if (!r.potted.some((n) => n)) misses++;
    }
    if (!balls.some((x) => x.n && !x.in)) wins++;
  }
  assert.ok(wins >= 3, `wygrane: ${wins} z 4`);
});

test("bez końca: stoły trudnieją płynnie, bez ściany", () => {
  const { stageCfg } = require("./gra.js");
  let prev = stageCfg(1);
  assert.strictEqual(prev.balls, 5);
  assert.strictEqual(prev.guide, 2);
  for (let k = 2; k <= 40; k++) {
    const c = stageCfg(k);
    assert.ok(c.balls >= prev.balls && c.balls - prev.balls <= 2 && c.balls <= 15);
    assert.ok(c.guide <= prev.guide && c.refill <= prev.refill && c.refill >= 2);
    prev = c;
  }
  assert.strictEqual(stageCfg(6).guide, 0);
  assert.strictEqual(stageCfg(9).balls, 15);
});

test("bez końca: punkty za bieg", () => {
  const { runPoints } = require("./gra.js");
  assert.ok(runPoints(5) <= 5);
  assert.strictEqual(runPoints(6), 10);
  assert.strictEqual(runPoints(18), 25);
  assert.strictEqual(runPoints(36), 50);
  for (let n = 1; n < 300; n++) assert.ok(runPoints(n) >= runPoints(n - 1) && runPoints(n) <= 150);
  // po trudnym przyrost rośnie
  assert.ok(runPoints(60) - runPoints(50) > runPoints(46) - runPoints(36));
});
