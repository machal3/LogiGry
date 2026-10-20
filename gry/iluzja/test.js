// Test logiki gry Iluzja: node --test gry/iluzja/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const {
  LEVEL_SPECS,
  rotateXY,
  projectApparent,
  getAdjacency,
  findShortestTilePath,
  solveMonument,
} = require("./gra.js");

test("obrót o 360 stopni przywraca współrzędne (x, y)", () => {
  for (const [x, y] of [[2, -3], [-1, 4], [0, 0], [3, 1]]) {
    assert.deepStrictEqual(rotateXY(x, y, 4, 0, 0), [x, y]);
    const r1 = rotateXY(x, y, 1, 0, 0);
    const r4 = rotateXY(r1[0], r1[1], 3, 0, 0);
    assert.deepStrictEqual(r4, [x, y]);
  }
});

test("przesunięcie wzdłuż promienia izometrycznego (1, 1, 1) w camDir=0 daje te same współrzędne pozorne (appU, appV)", () => {
  const [u1, v1] = projectApparent(1, 2, 0, 0);
  const [u2, v2] = projectApparent(1 + 3, 2 + 3, 3, 0);
  assert.strictEqual(u1, u2);
  assert.strictEqual(v1, v2);
});

test("każdy poziom (easy, medium, hard) jest rozwiązywalny z zapasem co najmniej 6 ruchów i wymaga złudzeń perspektywy", () => {
  for (const [key, spec] of Object.entries(LEVEL_SPECS)) {
    const sol = solveMonument(spec);
    assert.ok(sol.solvable, `poziom ${key} musi być rozwiązywalny`);
    assert.ok(sol.illusionUsed, `poziom ${key} musi wykorzystywać most iluzji perspektywicznej`);
    assert.ok(
      spec.maxMoves - sol.moveCost >= 6,
      `poziom ${key}: za mały zapas ruchów (koszt=${sol.moveCost}, limit=${spec.maxMoves})`
    );

    // W początkowym stanie bez obrotu kamery i mostu nie da się od razu dojść do portalu
    const goalIdx = spec.blocks.findIndex((b) => b.kind === "goal");
    const startIdx = spec.blocks.findIndex((b) => b.kind === "start");
    const initialPath = findShortestTilePath(
      spec,
      { camDir: spec.startCam, bridgeDir: spec.startBridge, pillarUp: false },
      startIdx,
      goalIdx
    );
    assert.strictEqual(initialPath, null, `poziom ${key} nie powinien mieć bezpośredniej ścieżki na starcie`);
  }
});

test("złudzenia perspektywy łączą gzymsy na różnych wysokościach tylko przy właściwym kącie kamery", () => {
  const easy = LEVEL_SPECS.easy;
  const adjCam0 = getAdjacency(easy, { camDir: 0, bridgeDir: 1, pillarUp: false });
  const adjCam1 = getAdjacency(easy, { camDir: 1, bridgeDir: 1, pillarUp: false });
  assert.strictEqual(adjCam0.illusions.length, 0, "w camDir=0 most iluzji na poziomie łatwym jest rozłączony");
  assert.ok(adjCam1.illusions.length > 0, "w camDir=1 most iluzji na poziomie łatwym łączy wieże");
});
