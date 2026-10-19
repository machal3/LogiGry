const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { generateCity, project3D, checkDroneBuilding } = require("./gra.js");

test("Kurier: generowanie miasta tworzy wieżowce oraz stacje ładowania", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const { buildings, worldRadius } = generateCity(lv);
    assert.ok(buildings.length >= 16);
    assert.ok(worldRadius > 50);
    assert.ok(buildings.some((b) => b.isStation));
  }
});

test("Kurier: projekcja 3D i detekcja lądowania na dachu wieżowca działają poprawnie", () => {
  const cam = { x: 0, y: 20, z: -40, yaw: 0, pitch: 0 };
  const p = project3D(0, 20, 0, cam, 260, 185);
  assert.ok(p);
  assert.equal(Math.round(p[0]), 130);
  assert.equal(Math.round(p[1]), 93);

  const { buildings } = generateCity("easy");
  const b0 = buildings[0];
  const roofCheck = checkDroneBuilding({ x: b0.x, y: b0.h + 1, z: b0.z, vy: 0 }, buildings);
  assert.equal(roofCheck.state, "roof");

  const hitCheck = checkDroneBuilding({ x: b0.x, y: b0.h - 5, z: b0.z, vy: 0 }, buildings);
  assert.equal(hitCheck.state, "hit");
});
