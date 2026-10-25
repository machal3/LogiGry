const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const {
  MATERIAL_SPECS,
  STAGES,
  calcBridgeCost,
  findRoadPath,
  solveTrussStress,
  analyzeBridgeStability,
  planBeamConstruction,
  segmentHitsStageObstacles,
  buildSampleTruss,
} = require("./gra.js");

test("Architekt: koszt budowy, specyfikacje materiałów i ścieżka jezdni działają poprawnie", () => {
  assert.ok(MATERIAL_SPECS.cable.maxLen > MATERIAL_SPECS.steel.maxLen);
  const edges = [
    { i1: 0, i2: 1, type: "road", len: 44 },
    { i1: 1, i2: 2, type: "wood", len: 22 },
    { i1: 0, i2: 2, type: "cable", len: 44 },
  ];
  const cost = calcBridgeCost(edges);
  assert.equal(cost, Math.round(22 * 2) + Math.round(14 * 1) + Math.round(10 * 2));

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

test("Architekt: konstruktor przyciąga magnetycznie do węzłów i automatycznie dzieli długie przęsła", () => {
  const nodes = [
    { x: 70, y: 106, fixed: true, deck: true },
    { x: 130, y: 106, fixed: false, deck: true },
    { x: 230, y: 106, fixed: true, deck: true },
  ];

  // Przyciągnięcie do istniejącego węzła 1 (w promieniu 14 m)
  const snapPlan = planBeamConstruction(nodes, 0, 126, 108, MATERIAL_SPECS.wood);
  assert.equal(snapPlan.valid, true);
  assert.equal(snapPlan.snapKind, "node");
  assert.equal(snapPlan.snapNodeIdx, 1);
  assert.equal(snapPlan.segCount, 1);

  // Długie przeciągnięcie z 0 do 2 (160 m) automatycznie dzieli się na 3 równe segmenty jezdni
  const spanPlan = planBeamConstruction(nodes, 0, 230, 106, MATERIAL_SPECS.road);
  assert.equal(spanPlan.valid, true);
  assert.equal(spanPlan.snapKind, "node");
  assert.equal(spanPlan.snapNodeIdx, 2);
  assert.ok(spanPlan.segCount >= 2);
  assert.equal(spanPlan.segments.length, spanPlan.segCount);
});

test("Architekt: analiza statyczna w konstruktorze wykrywa niepodparte węzły i prognozuje pęknięcia", () => {
  const st = STAGES.easy[0];
  const unbracedNodes = [
    { ...st.anchors[0] },
    { ...st.anchors[1] },
    { x: 150, y: 110, fixed: false, deck: true },
  ];
  const unbracedEdges = [
    { i1: 0, i2: 2, type: "road", len: 60, stress: 0 },
    { i1: 2, i2: 1, type: "road", len: 60, stress: 0 },
  ];
  const badReport = analyzeBridgeStability(unbracedNodes, unbracedEdges, st.vehicleWeight);
  assert.equal(badReport.willBreak, true);
  assert.ok(badReport.unbracedNodeIndices.includes(2));
  assert.ok(badReport.brokenEdgeIndices.length > 0);

  const goodTruss = buildSampleTruss(st, "wood");
  const goodReport = analyzeBridgeStability(goodTruss.nodes, goodTruss.edges, st.vehicleWeight);
  assert.equal(goodReport.roadComplete, true);
  assert.equal(goodReport.willBreak, false);
  assert.equal(goodReport.unbracedNodeIndices.length, 0);
});

test("Architekt: liny stalowe (cable) utrzymują jezdnię zawieszoną do górnych pylonów", () => {
  const nodes = [
    { x: 70, y: 106, fixed: true, deck: true },
    { x: 230, y: 106, fixed: true, deck: true },
    { x: 70, y: 60, fixed: true, deck: false, pylon: true },
    { x: 230, y: 60, fixed: true, deck: false, pylon: true },
    { x: 150, y: 106, fixed: false, deck: true },
  ];
  const edges = [
    { i1: 0, i2: 4, type: "road", len: 80, stress: 0 },
    { i1: 4, i2: 1, type: "road", len: 80, stress: 0 },
    { i1: 2, i2: 4, type: "cable", len: Math.hypot(80, 46), stress: 0 },
    { i1: 3, i2: 4, type: "cable", len: Math.hypot(80, 46), stress: 0 },
  ];
  const res = solveTrussStress(nodes, edges, 150, 1.5);
  assert.equal(res.deckBroken, false);
  assert.ok(res.maxStress < 1.0);
});

test("Architekt: fizyka uwzględnia moment zginający w środku przęsła oraz wyboczenie przy ściskaniu", () => {
  const nodes = [
    { x: 70, y: 106, fixed: true, deck: true },
    { x: 230, y: 106, fixed: true, deck: true },
    { x: 150, y: 106, fixed: false, deck: true },
    { x: 150, y: 72, fixed: false, deck: false },
  ];
  const makeEdges = () => [
    { i1: 0, i2: 2, type: "road", len: 80, stress: 0 },
    { i1: 2, i2: 1, type: "road", len: 80, stress: 0 },
    { i1: 0, i2: 3, type: "steel", len: Math.hypot(80, 34), stress: 0 },
    { i1: 3, i2: 1, type: "steel", len: Math.hypot(80, 34), stress: 0 },
    { i1: 2, i2: 3, type: "steel", len: 34, stress: 0 },
  ];

  const edgesMid = makeEdges();
  solveTrussStress(nodes, edgesMid, 110, 2.0);
  assert.ok(edgesMid[0].midSag > 0, "Przęsło pod kołami powinno wykazywać lokalne ugięcie (midSag)");
  assert.equal(edgesMid[2].mode, "compression", "Górny zastrzał kratownicy powinien pracować na ściskanie");
  assert.equal(edgesMid[4].mode, "tension", "Pionowy wieszak środkowy powinien pracować na rozciąganie");
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

test("Architekt: poprawnie zbudowana kratownica utrzymuje pojazd w budżecie na każdym z 12 etapów z przeszkodami", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    assert.equal(STAGES[lv].length, 4);
    for (const st of STAGES[lv]) {
      const mat = lv === "easy" ? "wood" : "steel";
      const { nodes, edges } = buildSampleTruss(st, mat);
      const cost = calcBridgeCost(edges);
      assert.ok(cost <= st.budget, `Koszt kratownicy (${cost}) przekracza budżet (${st.budget}) w ${st.name}`);

      // Żaden pręt kratownicy nie może wchodzić w przeszkodę terenową lub szlak wodny
      for (const e of edges) {
        if (e.type === "road") continue;
        const hit = segmentHitsStageObstacles(nodes[e.i1].x, nodes[e.i1].y, nodes[e.i2].x, nodes[e.i2].y, st);
        assert.equal(hit, null, `Belka wchodzi w przeszkodę (${hit}) na etapie ${st.name}`);
      }

      const roadPath = findRoadPath(nodes, edges);
      assert.equal(roadPath.complete, true);

      const midX = (st.anchors[0].x + st.anchors[1].x) / 2;
      const res = solveTrussStress(nodes, edges, midX, st.vehicleWeight, st.wind || 0);
      assert.ok(res.maxStress < 1.0, `Kratownica powinna wytrzymać obciążenie w ${st.name} (stress=${res.maxStress})`);
      assert.equal(res.deckBroken, false);
    }
  }
});

test("Architekt: żelbet (arch) wzmacnia łuki ściskane, a tłumik (spring) redukuje drgania i napór wiatru", () => {
  const nodes = [
    { x: 70, y: 100, fixed: true, deck: true },
    { x: 230, y: 100, fixed: true, deck: true },
    { x: 70, y: 145, fixed: true, deck: false },
    { x: 230, y: 145, fixed: true, deck: false },
    { x: 150, y: 100, fixed: false, deck: true },
  ];
  const makeArchEdges = (archType, hangerType) => [
    { i1: 0, i2: 4, type: "road", len: 80, stress: 0 },
    { i1: 4, i2: 1, type: "road", len: 80, stress: 0 },
    { i1: 2, i2: 4, type: archType, len: Math.hypot(80, 45), stress: 0 },
    { i1: 3, i2: 4, type: archType, len: Math.hypot(80, 45), stress: 0 },
    { i1: 0, i2: 2, type: hangerType, len: 45, stress: 0 },
  ];

  const woodEdges = makeArchEdges("wood", "wood");
  const archEdges = makeArchEdges("arch", "spring");

  const resWood = solveTrussStress(nodes, woodEdges, 150, 2.2, 0.35);
  const resArch = solveTrussStress(nodes, archEdges, 150, 2.2, 0.35);

  assert.ok(archEdges[2].stress < woodEdges[2].stress, "Łuk żelbetowy powinien mieć mniejsze naprężenie ściskające niż drewno");
  assert.ok(resArch.maxStress < resWood.maxStress, "Konstrukcja z żelbetem i tłumikiem drgań powinna lepiej znosić obciążenie i wiatr");
});
