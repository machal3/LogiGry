const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const { calcSailEfficiency, generateCourse, updateBoatPhysics, applyHazards, steerBoatAI, RIVAL_SPEEDS } = require("./gra.js");

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
    if (lv !== "easy") assert.ok(whirlpools.length >= 1);
  }
});

test("Regaty: skały i wiry oddziałują na jacht gracza i rywali AI", () => {
  const rocks = [{ x: 100, y: 100, r: 8 }];
  const whirlpools = [{ x: 200, y: 150, r: 16 }];

  // Kolizja ze skałą odbija łódź i obniża prędkość
  const boatRock = { x: 103, y: 100, v: 12, a: 0 };
  const resRock = applyHazards(boatRock, rocks, whirlpools, 0.1);
  assert.equal(resRock.hitRock, true);
  assert.ok(boatRock.v < 6);

  // Wir wodny spowalnia łódź
  const boatWhirl = { x: 205, y: 150, v: 15, a: 0 };
  const resWhirl = applyHazards(boatWhirl, rocks, whirlpools, 0.2);
  assert.equal(resWhirl.hitVortex, true);
  assert.ok(boatWhirl.v < 15);
});

test("Regaty: balans prędkości pozwala graczowi wygrać na każdym poziomie trudności", () => {
  for (const lv of ["easy", "medium", "hard"]) {
    const speeds = RIVAL_SPEEDS[lv];
    assert.ok(speeds.every((s) => s < 1.0), `Prędkość kadłuba rywali na poziomie ${lv} musi być mniejsza od 1.0`);

    const { buoys, rocks, whirlpools, W, H } = generateCourse(lv);
    const startB = buoys[0];
    const wind = { angle: Math.PI * 0.45, speed: 36 };

    const player = {
      x: startB.x,
      y: startB.y,
      a: -Math.PI / 2,
      v: 0,
      hullSpeed: 1.16,
      nextBuoy: 1,
      finished: false,
      finishTime: 0,
      tackSide: null,
    };

    const rivals = speeds.map((hs, idx) => ({
      x: startB.x + (idx + 1) * 10 * (idx % 2 === 0 ? 1 : -1),
      y: startB.y + 4,
      a: -Math.PI / 2,
      v: 0,
      hullSpeed: hs,
      nextBuoy: 1,
      finished: false,
      finishTime: 0,
      tackSide: null,
    }));

    const allBoats = [player, ...rivals];
    const dt = 0.05;
    for (let step = 1; step <= 4000; step++) {
      const t = step * dt;
      for (const b of allBoats) {
        if (b.finished) continue;
        const target = buoys[b.nextBuoy];
        steerBoatAI(b, target, wind.angle, rocks, whirlpools, dt, b === player ? 2.5 : 1.9);
        updateBoatPhysics(b, wind.angle, wind.speed, dt);
        applyHazards(b, rocks, whirlpools, dt, W, H);
        if (Math.hypot(target.x - b.x, target.y - b.y) < target.r + 3.2) {
          b.nextBuoy++;
          if (b.nextBuoy >= buoys.length) {
            b.finished = true;
            b.finishTime = t;
          }
        }
      }
      if (player.finished) break;
    }

    assert.equal(player.finished, true, `Gracz powinien ukończyć wyścig na poziomie ${lv}`);
    for (const r of rivals) {
      assert.ok(
        !r.finished || r.finishTime >= player.finishTime,
        `Gracz powinien wyprzedzić rywali na poziomie ${lv}`
      );
    }
  }
});

