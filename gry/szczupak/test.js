// Test logiki Szczupaka: klasyfikacja ryb (zjedz / unikaj), granice, wzrost i punkty biegu.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { fish, collide, bounds, START, GROWTH, GROW_MAX, DASH_CD, endlessPoints } = require("./gra.js");

test("mniejsze ryby są kęsem, większe zabijają, równe są neutralne", () => {
  const me = { s: 3.0 };
  const small = fish(2.0, false), big = fish(6.0, true), same = fish(3.1, false);
  assert.equal(collide(me, small), "eat");
  assert.equal(collide(me, big), "die");
  assert.equal(collide(me, same), null);
});

test("drapieżnik przegrywa z małym graczem, wyrośnięty gracz robi z niego kęs", () => {
  const me = { s: 2.2 };
  assert.equal(collide(me, fish(2.2 * 1.25, true)), "die");
  assert.equal(collide(me, { s: me.s * 0.85 }), "eat");
});

test("wzrost od START do GROW_MAX jest osiągalny w rozsądnej liczbie kęsów", () => {
  for (const k of [START, ...Object.values(GROWTH)]) assert.ok(k > 0);
  let s = START, bites = 0;
  while (s < GROW_MAX && bites < 200) { s += GROWTH.fish; bites++; }
  assert.ok(bites < 60, `potrzeba ${bites} kęsów`);
});

test("granice przyciągają ryby pod taflę i nad dno", () => {
  const f = { x: -5, y: 80, s: 2 };
  bounds(f);
  assert.ok(f.x >= f.s);
  assert.ok(f.y <= 66 - f.s + 1e-9);
  assert.ok(f.y >= 4 + f.s);
});

test("odzysk impulsu trwa kilka sekund", () => {
  assert.ok(DASH_CD < 5 && DASH_CD > 1);
});

test("punkty biegu rosną, nie spadają i rosną od poziomu trudnego ponad 50", () => {
  assert.ok(endlessPoints(5) <= 5);
  assert.ok(endlessPoints(12) >= 10 && endlessPoints(12) <= 25);
  assert.ok(endlessPoints(18) >= 20 && endlessPoints(18) <= 50);
  assert.ok(endlessPoints(24) >= 50);
  assert.equal(endlessPoints(400), 150);
  for (let n = 1; n < 60; n++) assert.ok(endlessPoints(n + 1) >= endlessPoints(n), `spadek przy ${n}`);
});
