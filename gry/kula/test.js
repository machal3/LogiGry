// Test: każda wygenerowana plansza daje się przejechać do wyjścia bez wpadnięcia w dziurę,
// gdy kula podąża za trasą BFS. Symulacja uruchamia tę samą fizykę, co przeglądarka.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { build, physics, EXIT } = require("./gra.js");

const LEVELS = [
  { cols: 8, rows: 8, holes: 4, gems: 3 },
  { cols: 10, rows: 10, holes: 6, gems: 4 },
  { cols: 12, rows: 12, holes: 10, gems: 5 },
];

function simulate(L) {
  const lv = build(L);
  const wp = lv.path.map((i) => [i % L.cols + 0.5, ((i / L.cols) | 0) + 0.5]);
  const st = { x: 0.5, y: 0.5, vx: 0, vy: 0 };
  let target = 1;
  for (let t = 0; t < 240; t += 1 / 60) {
    const [tx0, ty0] = wp[Math.min(target, wp.length - 1)];
    let dx = tx0 - st.x, dy = ty0 - st.y;
    const d = Math.hypot(dx, dy) || 1;
    let tiltX = (dx / d) * 0.5, tiltY = (dy / d) * 0.5;
    const ev = physics(st, tiltX, tiltY, 1 / 60, lv);
    assert.ok(!ev.hole, `kula wpadła w dziurę (dystans od trasy minął, t=${t.toFixed(1)})`);
    assert.ok(st.x > -0.01 && st.y > -0.01 && st.x < L.cols + 0.01 && st.y < L.rows + 0.01, "kula poza planszą");
    if (d < 0.5 && target < wp.length - 1) target++;
    if (Math.hypot(st.x - wp[wp.length - 1][0], st.y - wp[wp.length - 1][1]) < EXIT - 0.05) return lv;
  }
  assert.ok(false, `nie dotarto do wyjścia w 240 s symulacji (${L.cols}×${L.rows})`);
  return lv;
}

test("dojście do wyjścia jest zawsze możliwe", () => {
  for (const L of LEVELS) for (let k = 0; k < 25; k++) simulate(L);
});

test("dziury i kryształy nie leżą na trasie", () => {
  for (const L of LEVELS) for (let k = 0; k < 50; k++) {
    const lv = build(L);
    const onPath = new Set(lv.path);
    lv.holes.forEach((h) => assert.ok(!onPath.has(h.r * L.cols + h.c), "dziura na trasie"));
    lv.gems.forEach((g) => assert.ok(onPath.has(g.r * L.cols + g.c), "kryształ poza trasą"));
    assert.ok(lv.holes.length > 0, "bez dziur poziom jest za łatwy");
  }
});
