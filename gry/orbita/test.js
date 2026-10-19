const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { calculateGravity, simulateTrajectory, STAGES, STEP_DT, MAX_STEPS } = require("./gra.js");

test("Orbita: grawitacja przyciąga sondę w stronę planety", () => {
  const planets = [{ x: 100, y: 100, r: 20, mass: 1.0 }];
  const [ax, ay] = calculateGravity(50, 100, planets);
  assert.ok(ax > 0);
  assert.equal(Math.round(ay), 0);
});

test("Orbita: symulacja trajektorii generuje punkty i wykrywa kolizje", () => {
  const planets = [{ x: 100, y: 100, r: 20, mass: 1.0 }];
  const res = simulateTrajectory(0, 100, 30, 0, planets, 100, 0.05);
  assert.ok(res.pts.length > 0);
  assert.equal(res.hitPlanet, planets[0]);
});

test("Orbita: wszystkie 9 układów na 3 poziomach da się przejść symulacją fizyczną ze zebraniem pomiarów", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const list = STAGES[lv];
    assert.equal(list.length, 3, `Poziom ${lv} musi mieć 3 układy`);
    list.forEach((st, idx) => {
      assert.ok(st.start && st.station && st.sol, `Brak danych w ${lv}[${idx}]`);
      assert.ok(st.planets.length >= 1, `Brak planet w ${lv}[${idx}]`);
      assert.ok(st.beacons.length >= 2, `Za mało boi pomiarowych w ${lv}[${idx}]`);
      assert.ok(st.station.x >= 20 && st.station.x <= 285 && st.station.y >= 18 && st.station.y <= 185, `Stacja poza ekranem w ${lv}[${idx}]: (${st.station.x}, ${st.station.y})`);

      const vx = Math.cos(st.sol.angle) * st.sol.power;
      const vy = Math.sin(st.sol.angle) * st.sol.power;
      const res = simulateTrajectory(st.start.x, st.start.y, vx, vy, st.planets, MAX_STEPS, STEP_DT, st);

      assert.equal(res.hitPlanet, null, `Rozwiązanie ${lv}[${idx}] uderza w planetę`);
      assert.equal(res.hitBeacons.size, st.beacons.length, `Rozwiązanie ${lv}[${idx}] nie zbiera wszystkich boi (${res.hitBeacons.size}/${st.beacons.length})`);
      assert.equal(res.hitStation, true, `Rozwiązanie ${lv}[${idx}] nie trafia w stację badawczą`);
    });
  }
});

test("Orbita: stacja badawcza wymaga zebrania pomiarów przed otwarciem doku", () => {
  const st = STAGES.easy[0];
  const fakeStage = {
    ...st,
    beacons: [{ x: 290, y: 190, r: 5 }],
    reqBeacons: 1,
  };
  const vx = Math.cos(st.sol.angle) * st.sol.power;
  const vy = Math.sin(st.sol.angle) * st.sol.power;
  const res = simulateTrajectory(st.start.x, st.start.y, vx, vy, st.planets, MAX_STEPS, STEP_DT, fakeStage);
  assert.equal(res.hitStation, false, "Stacja nie powinna zadokować bez zebranych pomiarów");
  assert.equal(res.touchedLockedStation, true, "Symulacja powinna odnotować przelot przez zamknięty dok");
});
