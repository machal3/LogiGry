const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { generate, angleDiff, inBeam, hitRock, inHarbor } = require("./gra.js");

describe("latarnia", () => {
  it("generuje skały i port", () => {
    const w = generate({ ships: 5, rocks: 5, beam: 0.4 });
    assert.ok(w.reef.length >= 5);
    assert.equal(w.goal, 5);
    assert.ok(w.harbor.w > 10);
  });

  it("inBeam wykrywa kąt wiązki", () => {
    const light = { x: 150, y: 160 };
    const ship = { x: 150, y: 40 };
    assert.equal(inBeam(ship, light, -Math.PI / 2, 0.4), true);
    assert.equal(inBeam(ship, light, 0, 0.2), false);
  });

  it("angleDiff jest w (-pi, pi]", () => {
    assert.ok(Math.abs(angleDiff(0.1, -0.1) - 0.2) < 1e-9);
    assert.ok(Math.abs(angleDiff(Math.PI - 0.1, -Math.PI + 0.1)) < 0.3);
  });

  it("port i skały", () => {
    const harbor = { x: 150, y: 180, w: 36 };
    assert.equal(inHarbor({ x: 150, y: 175 }, harbor), true);
    assert.equal(inHarbor({ x: 50, y: 175 }, harbor), false);
    const rock = { x: 100, y: 100, r: 8 };
    assert.ok(hitRock({ x: 102, y: 100 }, [rock]));
    assert.equal(hitRock({ x: 200, y: 100 }, [rock]), null);
  });
});
