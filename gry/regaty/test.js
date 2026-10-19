const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { calcSailEfficiency, generateCourse, updateBoatPhysics } = require("./gra.js");

test("Regaty: fizyka żagla prawidłowo rozpoznaje kąt martwy, bajdewind i półwiatr", () => {
  const windAngle = Math.PI / 2; // wiatr wieje z północy na południe (kierunek +Y)
  // Kurs prosto na północ (-PI/2, pod wiatr) powinien być w kącie martwym
  const dead = calcSailEfficiency(-Math.PI / 2, windAngle);
  assert.equal(dead.zone, "martwy");
  assert.ok(dead.eff <= 0.1);

  // Kurs pod kątem 48 stopni do wiatru (bajdewind)
  const close = calcSailEfficiency(-Math.PI / 2 + 0.85, windAngle);
  assert.equal(close.zone, "bajdewind");
  assert.ok(close.eff >= 0.65);

  // Kurs w poprzek wiatru (półwiatr)
  const beam = calcSailEfficiency(0, windAngle);
  assert.equal(beam.zone, "polwiatr");
  assert.equal(beam.eff, 1.0);
});

test("Regaty: trasa zawiera boje, skały oraz metę na każdym poziomie", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const { buoys, rocks, whirlpools } = generateCourse(lv);
    assert.ok(buoys.length >= 4);
    assert.equal(buoys[0].type, "start");
    assert.equal(buoys[buoys.length - 1].type, "meta");
    assert.ok(rocks.length >= 1);
  }
});
