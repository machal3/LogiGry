const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { simulateCoaster, getDefaultNodes } = require("./gra.js");

test("Kolejka: domyślny tor generuje węzły i pozwala na bezpieczny przejazd", () => {
  for (const count of [6, 8, 10]) {
    const nodes = getDefaultNodes(count);
    assert.equal(nodes.length, count);
    const sim = simulateCoaster(nodes);
    assert.equal(sim.success, true);
    assert.ok(sim.thrill > 40);
    assert.ok(sim.maxV > 10);
    assert.ok(sim.maxG < 5.0);
  }
});

test("Kolejka: zbyt wysokie wzniesienie powoduje utknięcie wagonika z braku energii", () => {
  const nodes = getDefaultNodes(6);
  // Drugie wzniesienie wyższe niż pierwsze -> brak energii kinetycznej
  nodes[1].h = 20;
  nodes[2].h = 50;
  const sim = simulateCoaster(nodes);
  assert.equal(sim.success, false);
});
