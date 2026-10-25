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

const { endlessParams, endlessRing, endlessPoints, STAGE } = require("./gra.js");

test("tryb bez końca: punkty za bieg", () => {
  assert.equal(endlessPoints(0), 0);
  assert.ok(endlessPoints(17) <= 5, "krótszy niż łatwy poziom: najwyżej 5");
  assert.equal(endlessPoints(18), 10);
  assert.equal(endlessPoints(45), 25);
  assert.equal(endlessPoints(90), 50);
  assert.equal(endlessPoints(1000), 150);
  for (let r = 1; r < 400; r++) assert.ok(endlessPoints(r) >= endlessPoints(r - 1), `punkty maleją przy ${r}`);
  // dalej rosną coraz szybciej
  assert.ok(endlessPoints(150) - endlessPoints(120) > endlessPoints(120) - endlessPoints(90));
});

test("tryb bez końca: trudność rośnie i każdy pierścień da się przejść", () => {
  const a = endlessParams(0), b = endlessParams(100), c = endlessParams(500);
  assert.deepEqual(a.gapF, [3, 4]);
  assert.deepEqual(b.gapF, [2, 2]);
  assert.ok(a.redF[1] < b.redF[1] && b.redF[1] < c.redF[1] && c.redF[1] <= 5);
  assert.ok(a.spin < b.spin && b.spin < c.spin);
  for (let k = 0; k < 20; k++) {
    const rings = [];
    for (let j = 0; j < 300; j++) rings.push(endlessRing(rings[j - 1], j));
    rings.forEach((r, j) => {
      assert.ok(r.segs.includes(GAP), `pierścień ${j} bez szczeliny`);
      assert.ok(r.segs.filter((t) => t === SOLID).length >= 3, `pierścień ${j}: za mało bezpiecznych pól`);
      assert.ok(maxRun(r.segs) <= 2, `pierścień ${j}: za długi czerwony ciąg`);
      if (j > 0 && j % STAGE === 0) assert.ok(!r.segs.includes(RED) && !r.spin, `pierścień ${j}: oddech bez czerwieni`);
      const prev = rings[j - 1];
      if (prev && !prev.spin && !r.spin) r.segs.forEach((t, s) => assert.ok(!(t === RED && prev.segs[s] === GAP), `pierścień ${j}: czerwień pod szczeliną`));
    });
  }
});
