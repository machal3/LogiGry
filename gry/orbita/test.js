const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { calculateGravity, simulateTrajectory, STAGES } = require("./gra.js");

test("Orbita: grawitacja przyciąga sondę w stronę planety", () => {
  const planets = [{ x: 100, y: 100, r: 20, mass: 1.0 }];
  // Sonda na lewo od planety (x: 50, y: 100) powinna mieć przyspieszenie w prawo (+X)
  const [ax, ay] = calculateGravity(50, 100, planets);
  assert.ok(ax > 0);
  assert.equal(Math.round(ay), 0);
});

test("Orbita: symulacja trajektorii generuje punkty i wykrywa kolizje", () => {
  const planets = [{ x: 100, y: 100, r: 20, mass: 1.0 }];
  // Strzał prosto w planetę
  const res = simulateTrajectory(0, 100, 30, 0, planets, 100, 0.05);
  assert.ok(res.pts.length > 0);
  assert.equal(res.hitPlanet, planets[0]);
});

test("Orbita: wszystkie etapy na wszystkich poziomach mają prawidłowe obiekty", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const list = STAGES[lv];
    assert.ok(list.length >= 3);
    for (const st of list) {
      assert.ok(st.start);
      assert.ok(st.station);
      assert.ok(st.planets.length >= 1);
      assert.ok(st.beacons.length >= 1);
    }
  }
});
