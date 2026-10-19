const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { INGREDIENTS, POTIONS, createVortices, evaluateBrew, stepAlongQueue } = require("./gra.js");

test("Alchemia: każdy węzeł eliksiru daje poprawną wycenę i gwiazdki jakości", () => {
  assert.ok(INGREDIENTS.length >= 5);
  assert.ok(POTIONS.length >= 8);

  for (const p of POTIONS) {
    // Dokładny środek daje 3 gwiazdki
    const centerEval = evaluateBrew(p.x, p.y);
    assert.ok(centerEval);
    assert.equal(centerEval.potion.id, p.id);
    assert.equal(centerEval.stars, 3);
    assert.ok(centerEval.value > p.basePrice);

    // Krawędź węzła daje 1 gwiazdkę
    const edgeEval = evaluateBrew(p.x + p.r - 0.5, p.y);
    assert.ok(edgeEval);
    assert.equal(edgeEval.stars, 1);
  }
});

test("Alchemia: przesuwanie esencji wzdłuż ścieżki działa i wykrywa wiry", () => {
  const vortices = createVortices("medium");
  const q = [[0, -20], [0, -40]];
  const step1 = stepAlongQueue(0, 0, q, 15, vortices);
  assert.equal(step1.hitVortex, false);
  assert.equal(step1.y, -15);
  assert.equal(step1.queue.length, 2);

  // Wejście prosto w wir
  const v = vortices[0];
  const stepVortex = stepAlongQueue(v.x, v.y, [[v.x + 1, v.y + 1]], 5, vortices);
  assert.equal(stepVortex.hitVortex, true);
});
