const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { simulateCoaster, getDefaultNodes, computeNodeCurvatures } = require("./gra.js");

test("Kolejka: domyślny tor generuje węzły i pozwala na bezpieczny przejazd", () => {
  for (const count of [6, 8, 10]) {
    const nodes = getDefaultNodes(count);
    assert.equal(nodes.length, count);
    const sim = simulateCoaster(nodes);
    assert.equal(sim.success, true);
    assert.ok(sim.thrill > 40, `Thrill (${sim.thrill}) powinien przekraczać 40`);
    assert.ok(sim.maxV > 10);
    assert.ok(sim.maxG < 5.0);
  }
});

test("Kolejka: płaski tor ma zerową krzywiznę pionową i przeciążenie 1.0G niezależnie od prędkości", () => {
  const flatNodes = [
    { id: 0, x: 30, y: 120, h: 12 },
    { id: 1, x: 90, y: 120, h: 12 },
    { id: 2, x: 150, y: 120, h: 12 },
    { id: 3, x: 210, y: 120, h: 12 },
    { id: 4, x: 270, y: 120, h: 12 },
  ];
  const curvatures = computeNodeCurvatures(flatNodes);
  for (const k of curvatures) {
    assert.equal(k, 0);
  }
  const sim = simulateCoaster(flatNodes, 0.01);
  assert.equal(sim.success, true);
  assert.equal(sim.maxG, 1.0);
  assert.equal(sim.minG, 1.0);
});

test("Kolejka: w dolinie po stromym zjeździe występuje dodatnie przeciążenie G, a na grzbiecie mniejsze niż 1G", () => {
  const nodes = [
    { id: 0, x: 30, y: 120, h: 12 },
    { id: 1, x: 80, y: 120, h: 48 }, // wysoki szczyt
    { id: 2, x: 130, y: 120, h: 10 }, // głęboka dolina -> dodatnie G
    { id: 3, x: 180, y: 120, h: 34 }, // ostry grzbiet -> airtime (< 1G)
    { id: 4, x: 230, y: 120, h: 12 },
    { id: 5, x: 275, y: 120, h: 8 },
  ];
  const sim = simulateCoaster(nodes);
  assert.equal(sim.success, true);
  assert.ok(sim.maxG > 2.2, `Maksymalne przeciążenie w dolinie powinno być wyraźnie > 2.2G (było ${sim.maxG})`);
  assert.ok(sim.minG < 0.7, `Minimalne przeciążenie na grzbiecie powinno dawać nieważkość < 0.7G (było ${sim.minG})`);
});

test("Kolejka: zbyt wysokie wzniesienie powoduje utknięcie wagonika z braku energii", () => {
  const nodes = getDefaultNodes(6);
  nodes[1].h = 20;
  nodes[2].h = 50;
  const sim = simulateCoaster(nodes);
  assert.equal(sim.success, false);
});
