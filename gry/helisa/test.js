// Test uczciwości wieży: node --test gry/helisa/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { generate, segAt, maxRun, N, SEG, GAP, SOLID, RED, BASE } = require("./gra.js");

const LEVELS = [
  { rings: 18, gap: [3, 4], red: [0, 1], extra: 0.2, chute: 0.3, spin: 0 },
  { rings: 28, gap: [2, 3], red: [1, 3], extra: 0.15, chute: 0.25, spin: 0.15 },
  { rings: 40, gap: [2, 2], red: [2, 4], extra: 0.1, chute: 0.2, spin: 0.35 },
];

LEVELS.forEach((L, i) => test(`poziom ${i + 1}: każdy pierścień da się przejść`, () => {
  for (let k = 0; k < 300; k++) {
    const rings = generate(L);
    assert.equal(rings.length, L.rings + 1);
    assert.ok(rings[L.rings].segs.every((t) => t === BASE), "dno jest pełne");
    rings.slice(0, L.rings).forEach((r, j) => {
      assert.ok(r.segs.includes(GAP), `pierścień ${j} bez szczeliny`);
      assert.ok(r.segs.filter((t) => t === SOLID).length >= 3, `pierścień ${j}: za mało bezpiecznych pól`);
      assert.ok(maxRun(r.segs) <= 2, `pierścień ${j}: za długi czerwony ciąg`);
      if (j < 2) assert.ok(!r.segs.includes(RED), "pierwsze pierścienie bez czerwieni");
      const prev = rings[j - 1];
      // piłka spadająca prosto przez szczelinę nie ląduje na czerwieni
      if (prev && !prev.spin && !r.spin) r.segs.forEach((t, s) => assert.ok(!(t === RED && prev.segs[s] === GAP), `pierścień ${j}: czerwień pod szczeliną`));
    });
  }
}));

test("pole pod piłką liczy się z obrotu", () => {
  const ring = { off: 0 };
  for (let k = 0; k < N; k++) assert.equal(segAt(ring, -(k + 0.5) * SEG), k);
  assert.equal(segAt({ off: SEG }, -(3 + 0.5) * SEG), 2);
});
