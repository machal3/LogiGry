const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { generate, groundAt, canDrop } = require("./gra.js");

describe("balon", () => {
  it("generuje doliny pod wsiami", () => {
    const w = generate({ villages: 4, wind: 15, peaks: 12 });
    assert.equal(w.drops.length, 4);
    assert.ok(w.terrain.length > 50);
    for (const d of w.drops) {
      const g = groundAt(w.terrain, d.x, w.worldW);
      assert.ok(g < 50, "wieś powinna leżeć w dolinie");
    }
  });

  it("groundAt interpoluje w zakresie", () => {
    const w = generate({ villages: 3, wind: 10, peaks: 8 });
    const a = groundAt(w.terrain, 0, w.worldW);
    const b = groundAt(w.terrain, w.worldW, w.worldW);
    assert.ok(a > 0 && b > 0);
    assert.ok(a < 100 && b < 100);
  });

  it("canDrop wymaga bliskości", () => {
    const drop = { x: 100, y: 40, done: false };
    assert.equal(canDrop({ x: 100, y: 40 }, drop, 28), true);
    assert.equal(canDrop({ x: 200, y: 40 }, drop, 28), false);
    drop.done = true;
    assert.equal(canDrop({ x: 100, y: 40 }, drop, 28), false);
  });

  it("trudniejszy poziom ma więcej wsi i ptaków", () => {
    const easy = generate({ villages: 3, wind: 12, peaks: 10 });
    const hard = generate({ villages: 7, wind: 28, peaks: 22 });
    assert.ok(hard.drops.length > easy.drops.length);
    assert.ok(hard.birds.length >= easy.birds.length);
  });
});
