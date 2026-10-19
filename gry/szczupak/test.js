// Test logiki Szczupaka: klasyfikacja ryb (zjedz / unikaj), granice i wzrost.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { fish, collide, bounds, START, GROW_MAX } = require("./gra.js");

test("mniejsze ryby są kęsem, większe zabijają, równe są neutralne", () => {
  const me = { s: 3.0 };
  const small = fish(2.0, false), big = fish(6.0, true), same = fish(3.1, false);
  assert.equal(collide(me, small), "eat");
  assert.equal(collide(me, big), "die");
  assert.equal(collide(me, same), null);
});

test("ryby spawnują się w wodzie bez tafli", () => {
  for (let k = 0; k < 100; k++) {
    const f = fish(2 + Math.random() * 3, false);
    assert.ok(f.s >= 2 && f.s <= 5);
  }
});

test("granice przyciągają ryby do tafli", () => {
  const f = { x: -5, y: 80, s: 2 };
  bounds(f);
  assert.ok(f.x >= f.s);
  assert.ok(f.y <= 70 - f.s + 1e-9);
  assert.ok(f.y >= 4 + f.s);
});

test("maksymalny rozmiar osiągalny w docelowych kęsach", () => {
  let s = START, bites = 0;
  while (s < GROW_MAX && bites < 200) { s += 0.3; bites++; }
  assert.ok(bites < 190, `potrzeba ${bites} kęsów`);
});
