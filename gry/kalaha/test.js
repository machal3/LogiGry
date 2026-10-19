// Test logiki: node --test gry/kalaha/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { sow, legal, bestMove, fresh, sideSum } = require("./gra.js");

test("rozsiewanie, dodatkowy ruch i bicie", () => {
  const b = fresh(4);
  const r = sow(b, 0, 2); // 4 kamienie z dołka 2: 3,4,5,magazyn
  assert.deepStrictEqual(r.path, [3, 4, 5, 6]);
  assert.ok(r.extra);
  assert.strictEqual(r.next, 0);
  const c = [0, 0, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0];
  c[12] = 1; // żeby strona komputera nie była pusta po biciu
  const r2 = sow(c, 0, 2); // ostatni kamień w pustym dołku 3, naprzeciw 9 (5 kamieni)
  assert.strictEqual(r2.captured, 6);
  assert.strictEqual(r2.b[6], 6);
});

test("magazyn rywala jest pomijany", () => {
  const b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 14, 0];
  b[0] = 1;
  const r = sow(b, 1, 12);
  assert.ok(!r.path.includes(6));
});

test("partie komputer kontra komputer kończą się i liczba kamieni się zgadza", () => {
  for (let g = 0; g < 30; g++) {
    let b = fresh(4), turn = 0, n = 0;
    for (;;) {
      const m = bestMove(b, turn, 2, 0.3);
      assert.ok(legal(b, turn).includes(m));
      const r = sow(b, turn, m);
      b = r.b;
      turn = r.next;
      assert.strictEqual(b.reduce((a, x) => a + x, 0), 48);
      if (r.over) break;
      assert.ok(++n < 500);
    }
    assert.strictEqual(sideSum(b, 0) + sideSum(b, 1), 0);
  }
});

test("trudny komputer odpowiada w rozsądnym czasie", () => {
  const t = Date.now();
  bestMove(fresh(4), 1, 6);
  assert.ok(Date.now() - t < 1500);
});
