const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { generate, hitsPlayer, project } = require("./gra.js");

describe("deska", () => {
  it("generuje tor z bramkami i metą", () => {
    const c = generate({ length: 520, dens: 0.75, gates: 8 });
    assert.ok(c.objs.length > 10);
    assert.equal(c.objs.filter((o) => o.type === "gate").length, 8);
    assert.ok(c.objs.some((o) => o.type === "finish"));
    assert.ok(c.objs.every((o, i) => i === 0 || o.z >= c.objs[i - 1].z));
  });

  it("projekcja oddala obiekty w górę ekranu", () => {
    const near = project(0, 0, 5, 0);
    const far = project(0, 0, 60, 0);
    assert.ok(near && far);
    assert.ok(far.sy < near.sy);
    assert.ok(far.sc < near.sc);
  });

  it("kolizje: bramka, skała i skok", () => {
    assert.equal(hitsPlayer({ type: "gate", x: 0, w: 0.3, hit: false }, 0, 0), "gate");
    assert.equal(hitsPlayer({ type: "rock", x: 0, hit: false }, 0, 0), "crash");
    assert.equal(hitsPlayer({ type: "rock", x: 0, hit: false }, 0, 0.5), null);
    assert.equal(hitsPlayer({ type: "crystal", x: 0.05, hit: false }, 0, 0), "crystal");
  });

  it("trudniejszy poziom ma więcej obiektów", () => {
    const easy = generate({ length: 520, dens: 0.75, gates: 8 });
    const hard = generate({ length: 920, dens: 1.35, gates: 16 });
    assert.ok(hard.objs.length > easy.objs.length);
  });
});
