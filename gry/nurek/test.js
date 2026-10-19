const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { generate, nearBoat, hitsRock, hitsJelly } = require("./gra.js");

describe("nurek", () => {
  it("generuje skarby i zagrożenia", () => {
    const w = generate({ depth: 140, treasures: 4, hazards: 3 });
    assert.equal(w.loot.length, 4);
    assert.equal(w.jellies.length, 3);
    assert.ok(w.rocks.length >= 6);
    assert.ok(w.loot.every((t) => t.y > 40 && t.y < w.depth));
  });

  it("nearBoat tylko przy powierzchni koło łodzi", () => {
    const w = generate({ depth: 140, treasures: 4, hazards: 3 });
    assert.equal(nearBoat({ x: w.boatX, y: 10 }, w), true);
    assert.equal(nearBoat({ x: w.boatX, y: 50 }, w), false);
    assert.equal(nearBoat({ x: w.boatX + 80, y: 10 }, w), false);
  });

  it("kolizje ze skałą i meduzą", () => {
    const rock = { x: 100, y: 80, w: 20, h: 16 };
    assert.ok(hitsRock({ x: 100, y: 74 }, [rock]));
    assert.equal(hitsRock({ x: 200, y: 74 }, [rock]), null);
    const j = { x: 50, y: 50, phase: 0, r: 8, amp: 0 };
    assert.equal(hitsJelly({ x: 50, y: 50 }, j, 0), true);
    assert.equal(hitsJelly({ x: 120, y: 50 }, j, 0), false);
  });

  it("trudniejszy poziom ma więcej skarbów", () => {
    const easy = generate({ depth: 140, treasures: 4, hazards: 3 });
    const hard = generate({ depth: 210, treasures: 8, hazards: 8 });
    assert.ok(hard.loot.length > easy.loot.length);
    assert.ok(hard.jellies.length > easy.jellies.length);
  });
});
