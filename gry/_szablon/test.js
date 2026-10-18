// Test logiki gry: node --test gry/szablon/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, pairs } = require("./gra.js");

test("plansza zawsze da się wyczyścić", () => {
  for (let k = 0; k < 200; k++) {
    const cells = generate(36);
    while (cells.some(Boolean)) {
      const p = pairs(cells)[0];
      assert.ok(p, "brak pary na niepustej planszy");
      p.forEach((i) => (cells[i] = 0));
    }
  }
});
