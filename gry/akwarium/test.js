const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { FISH_TYPES, spawnFish, updateFishGrowth, calculateAquariumHealth } = require("./gra.js");

test("Akwarium: narybek rośnie po zjedzeniu pokarmu", () => {
  const f = spawnFish("blazenek", 50, 50);
  assert.equal(f.size, 1);
  updateFishGrowth(f, true);
  assert.equal(f.size, 2);
  updateFishGrowth(f, true);
  assert.equal(f.size, 3);
  // Rozmiar 3 to maksimum
  updateFishGrowth(f, true);
  assert.equal(f.size, 3);
});

test("Akwarium: filtr biologiczny utrzymuje natlenienie wody", () => {
  // Bez filtra woda traci tlen przy dużej ławicy
  const hNoFilter = calculateAquariumHealth(10, 0, 100);
  assert.ok(hNoFilter.oxygen < 100);

  // Z mocnym filtrem woda regeneruje tlen
  const hWithFilter = calculateAquariumHealth(2, 5, 50);
  assert.ok(hWithFilter.oxygen > 50);
});

test("Akwarium: wszystkie 4 gatunki okazów mają określone koszty i tempo generowania monet", () => {
  const keys = Object.keys(FISH_TYPES);
  assert.deepEqual(keys, ["blazenek", "pokolec", "skalar", "zolw"]);
  for (const v of Object.values(FISH_TYPES)) {
    assert.ok(v.cost > 0);
    assert.ok(v.coinVal > 0);
    assert.ok(v.color);
  }
});
