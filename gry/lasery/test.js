const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { PUZZLES, traceBeams, buildStage } = require("./gra.js");

test("Lasery: każdy z 9 predefiniowanych układów jest nierozwiązany na starcie i rozwiązuje się po ustawieniu solRot", () => {
  let totalCount = 0;
  for (const [levelKey, stages] of Object.entries(PUZZLES)) {
    assert.equal(stages.length, 3, `Poziom ${levelKey} powinien mieć 3 etapy`);
    stages.forEach((_, idx) => {
      totalCount++;
      const st = buildStage(levelKey, idx);
      assert.equal(st.grid.length, st.cols * st.rows);

      // Plansza początkowa nie może być od razu rozwiązana
      const startRes = traceBeams(st.cols, st.rows, st.grid);
      assert.equal(startRes.solved, false, `Układ ${levelKey}[${idx}] nie powinien być rozwiązany na starcie`);

      // Sprawdź, że ustawienie solRot na każdym ruchomym elemencie rozwiązuje układ bez alarmu
      for (const cell of st.grid) {
        if (cell && !cell.fixed) cell.dir = cell.solRot;
      }
      const solRes = traceBeams(st.cols, st.rows, st.grid);
      assert.equal(solRes.alarmHit, false, `Alarm na poziomie ${levelKey}, etap ${idx}`);
      assert.equal(solRes.solved, true, `Nierozwiązany układ wzorcowy na poziomie ${levelKey}, etap ${idx}`);
      assert.ok(solRes.totalTargets >= 2, `Co najmniej 2 detektory na poziomie ${levelKey}, etap ${idx}`);
      assert.equal(solRes.activeTargets, solRes.totalTargets, `Wszystkie detektory zasilone na poziomie ${levelKey}, etap ${idx}`);
    });
  }
  assert.equal(totalCount, 9);
});

test("Lasery: pryzmat łączy wiązki z 3 stron i blokuje wiązkę wpadającą od strony wylotu", () => {
  const grid = new Array(9).fill(null);
  // Siatka 3x3: pryzmat na środku (1,1) skierowany w prawo (dir = 1, wylot na E)
  grid[1 * 3 + 0] = { type: "emitter", dir: 1, color: 1, fixed: true }; // z W -> wpada z dir=1
  grid[2 * 3 + 1] = { type: "emitter", dir: 0, color: 2, fixed: true }; // z S -> wpada z dir=0
  grid[1 * 3 + 1] = { type: "prism", dir: 1, fixed: false };            // wylot na E (1,2)
  grid[1 * 3 + 2] = { type: "target", color: 3, fixed: true };          // oczekuje R+G = 3

  const resOk = traceBeams(3, 3, grid);
  assert.equal(resOk.solved, true);
  assert.equal(resOk.activeTargets, 1);

  // Gdy obrócimy pryzmat w lewo (dir = 3, wylot na W), wiązka z (1,0) wpada od strony wylotu i zostaje zablokowana
  grid[1 * 3 + 1].dir = 3;
  const resBlocked = traceBeams(3, 3, grid);
  assert.equal(resBlocked.solved, false);
});

