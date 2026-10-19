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

test("Kurier: projekcja 3D, kąt kamery oraz detekcja lądowania na dachu działają poprawnie", () => {
  const W = 260, H = 185;
  const cam = { x: 0, y: 20, z: -40, yaw: 0, pitch: 0 };
  const p = project3D(0, 20, 0, cam, W, H);
  assert.ok(p);
  assert.equal(Math.round(p[0]), 130);
  assert.equal(Math.round(p[1]), 93);

  // Sprawdzenie, że przy pochyleniu kamery w dół (pitch = 0.24) dron jest w dolnej/środkowej części ekranu (~65-70% H)
  const dronePos = { x: 0, y: 23.4, z: 0 };
  const gameCam = {
    x: dronePos.x,
    y: dronePos.y + 11.5,
    z: dronePos.z - 25,
    yaw: 0,
    pitch: 0.24,
  };
  const pDrone = project3D(dronePos.x, dronePos.y, dronePos.z, gameCam, W, H);
  assert.ok(pDrone);
  assert.ok(pDrone[1] >= H * 0.62 && pDrone[1] <= H * 0.74, `Pozycja Y drona na ekranie (${pDrone[1]}) poza zakresem 62-74% H`);

  const { buildings } = generateCity("easy");
  const b0 = buildings[0];
  const roofCheck = checkDroneBuilding({ x: b0.x, y: b0.h + 1, z: b0.z, vy: 0 }, buildings);
  assert.equal(roofCheck.state, "roof");

  const hitCheck = checkDroneBuilding({ x: b0.x, y: b0.h - 5, z: b0.z, vy: 0 }, buildings);
  assert.equal(hitCheck.state, "hit");
});
