const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { MATERIAL_COSTS, STAGES, calcBridgeCost, solveTrussStress } = require("./gra.js");

test("Architekt: koszt budowy i analiza naprężeń mostu działają poprawnie", () => {
  const edges = [
    { type: "road", len: 44 },
    { type: "wood", len: 22 },
  ];
  const cost = calcBridgeCost(edges);
  assert.equal(cost, Math.round(22 * 2) + Math.round(14 * 1));
});

test("Architekt: ugięcie kratownicy i naprężenia pod pojazdem", () => {
  const nodes = [
    { x: 0, y: 100, fixed: true, deck: true },
    { x: 50, y: 100, fixed: false, deck: true },
    { x: 100, y: 100, fixed: true, deck: true },
  ];
  const edges = [
    { i1: 0, i2: 1, type: "road", len: 50, stress: 0 },
    { i1: 1, i2: 2, type: "road", len: 50, stress: 0 },
  ];

  // Pojazd nad środkowym węzłem
  const res = solveTrussStress(nodes, edges, 50, 2.0);
  assert.ok(res.maxStress > 0);
  assert.ok(res.simNodes[1].curY > nodes[1].y); // ugięcie w dół
});

test("Architekt: wszystkie etapy na wszystkich poziomach mają poprawne kotwice i budżety", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const list = STAGES[lv];
    assert.ok(list.length >= 3);
    for (const st of list) {
      assert.ok(st.budget >= 500);
      assert.ok(st.anchors.length >= 2);
    }
  }
});
