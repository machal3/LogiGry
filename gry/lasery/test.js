const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { PUZZLES, traceBeams, buildStage } = require("./gra.js");

test("Lasery: każdy predefiniowany układ na każdym poziomie ma poprawne rozwiązanie", () => {
  for (const [levelKey, stages] of Object.entries(PUZZLES)) {
    stages.forEach((_, idx) => {
      const st = buildStage(levelKey, idx);
      assert.equal(st.grid.length, st.cols * st.rows);

      // Sprawdź, że rozwiązanie zapisane w solGrid przechodzi bez alarmu i oświetla wszystkie detektory
      const solRes = traceBeams(st.cols, st.rows, st.solGrid);
      assert.equal(solRes.alarmHit, false, `Alarm na poziomie ${levelKey}, etap ${idx}`);
      assert.equal(solRes.solved, true, `Nierozwiązany układ wzorcowy na poziomie ${levelKey}, etap ${idx}`);

      // Sprawdź, że plansza początkowa zawiera dokładnie tyle samo ruchomych elementów co rozwiązanie
      const startTools = st.grid.filter((c) => c && !c.fixed).length;
      const solTools = st.solGrid.filter((c) => c && !c.fixed).length;
      assert.equal(startTools, solTools);
    });
  }
});
