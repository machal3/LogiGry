// Test logiki Wędkarstwa: pule brań, wartości i holowanie (pęknięcie / wyholowanie).
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { SPECIES, bitePool, reelStep } = require("./gra.js");

test("siedem gatunków, wartości i głębokości w granicach", () => {
  assert.ok(SPECIES.length >= 6);
  for (const sp of SPECIES) {
    assert.ok(sp.w >= 1, `wartość ${sp.n}`);
    assert.ok(sp.depth[0] < sp.depth[1], `zakres głębokości ${sp.n}`);
    assert.ok(sp.lure >= -1 && sp.lure <= 2);
  }
});

test("każdy gatunek da się złapać jakąś przynętą na jakiejś głębokości", () => {
  for (const sp of SPECIES) {
    let ok = false;
    for (let lure = 0; lure < 3 && !ok; lure++)
      for (let d = 0.02; d <= 1 && !ok; d += 0.02)
        if (bitePool(d, lure).some((x) => x.id === sp.id)) ok = true;
    assert.ok(ok, `gatunek nieosiągalny: ${sp.n}`);
  }
});

test("holowanie: bez trzymania żyłka się rozluźnia, przy trzymaniu rośnie", () => {
  const a = { len: 1, ten: 0.3, t: 0 };
  for (let k = 0; k < 30; k++) reelStep(a, false, 0.1, 0.6);
  assert.ok(a.ten < 0.3, `napięcie spada: ${a.ten}`);
  assert.ok(a.len < 1, "linka prawie się skraca");
  const b = { len: 1, ten: 0.3, t: 0 };
  for (let k = 0; k < 20; k++) {
    const ev = reelStep(b, true, 0.1, 1.4);
    if (ev.broke) break;
  }
  assert.equal(b.ten >= 1, true, "mocne holowanie pęka");
});

test("wyholowanie: wytrwałe, spokojne ściągnięcie łowi rybę", () => {
  const st = { len: 1, ten: 0.2, t: 0 };
  let caught = false;
  for (let k = 0; k < 400 && !caught; k++) {
    // rytm: chwila holu, chwila odpoczynku
    const pull = k % 4 < 2;
    const ev = reelStep(st, pull, 0.05, 0.9);
    if (ev.broke) assert.fail("przy spokojnym rytmie żyłka nie powinna pęknąć");
    if (ev.caught) caught = true;
  }
  assert.ok(caught, "ryba wyholowana");
});

test("byt wartości: sum jest najdroższy", () => {
  const sorted = [...SPECIES].sort((a, b) => b.w - a.w);
  assert.equal(sorted[0].id, "sum");
});
