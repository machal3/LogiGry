const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const {
  STAGES,
  calcBridgeCost,
  findRoadPath,
  solveTrussStress,
  buildSampleTruss,
} = require("./gra.js");

test("Architekt: koszt budowy i ścieżka jezdni działają poprawnie", () => {
  const edges = [
    { i1: 0, i2: 1, type: "road", len: 44 },
    { i1: 1, i2: 2, type: "wood", len: 22 },
  ];
  const cost = calcBridgeCost(edges);
  assert.equal(cost, Math.round(22 * 2) + Math.round(14 * 1));

  const nodes = [
    { x: 40, y: 110, fixed: true, deck: true },
    { x: 240, y: 110, fixed: true, deck: true },
    { x: 140, y: 110, fixed: false, deck: true },
  ];
  const incomplete = findRoadPath(nodes, [{ i1: 0, i2: 2, type: "road", len: 100 }]);
  assert.equal(incomplete.complete, false);

  const complete = findRoadPath(nodes, [
    { i1: 0, i2: 2, type: "road", len: 100 },
    { i1: 2, i2: 1, type: "road", len: 100 },
  ]);
  assert.equal(complete.complete, true);
  assert.deepEqual(complete.nodePath, [0, 2, 1]);
});

test("Architekt: sama pozioma jezdnia bez kratownicy zawsze pęka pod pojazdem", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    for (const st of STAGES[lv]) {
      const left = st.anchors[0];
      const right = st.anchors[1];
      const midX = (left.x + right.x) / 2;
      const nodes = [
        { ...left },
        { ...right },
        { x: midX, y: left.y, fixed: false, deck: true },
      ];
      const edges = [
        { i1: 0, i2: 2, type: "road", len: midX - left.x, stress: 0 },
        { i1: 2, i2: 1, type: "road", len: right.x - midX, stress: 0 },
      ];
      const res = solveTrussStress(nodes, edges, midX, st.vehicleWeight);
      assert.ok(res.maxStress >= 1.0, `Niepodparta jezdnia powinna pęknąć na etapie ${st.name}`);
      assert.equal(res.deckBroken, true);
    }
  }
});

test("Architekt: poprawnie zbudowana kratownica utrzymuje pojazd w budżecie na każdym etapie", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    for (const st of STAGES[lv]) {
      const mat = lv === "easy" ? "wood" : "steel";
      const { nodes, edges } = buildSampleTruss(st, mat);
      const cost = calcBridgeCost(edges);
      assert.ok(cost <= st.budget, `Koszt kratownicy (${cost}) przekracza budżet (${st.budget}) w ${st.name}`);

      const roadPath = findRoadPath(nodes, edges);
      assert.equal(roadPath.complete, true);

      const midX = (st.anchors[0].x + st.anchors[1].x) / 2;
      const res = solveTrussStress(nodes, edges, midX, st.vehicleWeight);
      assert.ok(res.maxStress < 1.0, `Kratownica powinna wytrzymać obciążenie w ${st.name} (stress=${res.maxStress})`);
      assert.equal(res.deckBroken, false);
    }
  }
});
