// Test logiki Kuchni: zgodność zamówienia z patelnią i okna usmażenia.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { ING, matches, assess } = require("./gra.js");

const pan = (...ids) => ({ add: ids });
const order = (...ids) => ({ req: ids });

test("składniki: pięć, wszystkie unikalne z kolorem", () => {
  assert.equal(ING.length, 5);
  assert.equal(new Set(ING.map((i) => i.id)).size, 5);
  assert.equal(new Set(ING.map((i) => i.col)).size, 5);
});

test("zgodność niezależna od kolejności, puste zbiory różne", () => {
  assert.equal(matches(order("jajko", "ser"), pan("ser", "jajko")), true);
  assert.equal(matches(order("jajko"), pan("jajko", "ser")), false);
  assert.equal(matches(order("ser", "ser"), pan("ser")), false, "dwa razy ten sam składnik");
  assert.equal(matches(order(), pan()), true);
  assert.equal(matches(order("jajko"), pan("kotlet")), false);
});

test("okno usmażenia: surowe przed, dobre w środku, przypale po", () => {
  const W = [3, 5];
  assert.equal(assess(0.5, W), "raw");
  assert.equal(assess(3, W), "ok");
  assert.equal(assess(4.7, W), "ok");
  assert.equal(assess(5.4, W), "burnt");
  // prawie spalone: ciągła oś
  let t = 0;
  let stages = 0;
  for (; t < 10; t += 0.1) {
    const e = assess(t, W);
    if (stages === 0 && e === "ok") stages = 1;
    if (stages === 1 && e === "burnt") stages = 2;
  }
  assert.equal(stages, 2, "faza przechodzi raw → ok → burnt");
});
