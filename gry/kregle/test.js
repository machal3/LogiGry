// Test logiki Kręgli: ustawienie kręgli, łańcuch przewracania i punkty kręglarskie.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { pinLayout, resolveRoll, scoreFrames } = require("./gra.js");

test("dziesięć kręgli w trójkącie, pozycje wewnątrz toru", () => {
  const pins = pinLayout();
  assert.equal(pins.length, 10);
  for (const p of pins) {
    assert.ok(Math.abs(p.x) <= 0.3, "kręgi poza torem");
    assert.ok(p.z >= 0.8 && p.z <= 1.02);
    assert.equal(p.up, true);
  }
});

test("rzut w środek bij większość kręgów, rzut obok nic", () => {
  for (let k = 0; k < 60; k++) {
    const pins = pinLayout();
    const center = resolveRoll(pins, 0, 0, 0.9);
    assert.ok(center.length >= 4, `środek przy bił tylko ${center.length}`);
    const pins2 = pinLayout();
    const wide = resolveRoll(pins2, 0.78, 0, 0.9);
    assert.equal(wide.length, 0, "kręgi stoją daleko od kuli");
  }
});

test("rzut podochrome nie bije więcej niż 10", () => {
  const pins = pinLayout();
  const f = resolveRoll(pins, 0, 0.5, 1);
  assert.ok(f.length <= 10);
});

test("punkty kręglarskie: strike, spare i zwykłe ramy", () => {
  assert.equal(scoreFrames([]), 0);
  assert.equal(scoreFrames([10, 10, 10]), 60); // 30 + 20 + 10: ramy bez bonusów za pom?
  // 5 5 (spare) 5 5 (spare) 5: pierwsze dwa spare'y dostają bonus 5, trzecia rama 5
  assert.equal(scoreFrames([5, 5, 5, 5, 5]), 35);
  assert.equal(scoreFrames([2, 3, 2, 3]), 10);
});

test("pełne strike'y: długi ciąg daje 300", () => {
  const rolls = new Array(12).fill(10);
  assert.equal(scoreFrames(rolls), 300);
});
