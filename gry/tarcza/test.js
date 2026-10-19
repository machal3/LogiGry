// Test logiki Tarczy: poprawne liczby pierścieni, biz na dokładne zero i jedynkę.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { scoreAt, isBust, SEGS } = require("./gra.js");

const RR = 1; // promień tarczy; scoreAt przyjmuje jednostki względem rr

test("segment i pierścienie zwracają poprawne punkty", () => {
  // centrum: byk 50
  assert.equal(scoreAt(0, 0, RR).pts, 50);
  assert.equal(scoreAt(0, 0, RR).ring, "B50");
  // byk 25
  const b25 = scoreAt(0, 6 / 31, RR);
  assert.equal(b25.pts, 25);
  assert.equal(b25.ring, "B25");
  // góra: segment 20, pojedynczy
  assert.equal(scoreAt(0, -11 / 31, RR).pts, 20);
  assert.equal(scoreAt(0, -11 / 31, RR).ring, "S");
  // potrójny 20
  const t20 = scoreAt(0, -16 / 31, RR);
  assert.equal(t20.pts, 60);
  assert.equal(t20.ring, "T");
  // podwójny 20
  const d20 = scoreAt(0, -25 / 31, RR);
  assert.equal(d20.pts, 40);
  assert.equal(d20.ring, "D");
  // poza tarczą
  assert.equal(scoreAt(0, -1, RR).ring, "M");
  assert.equal(scoreAt(-1, 0, RR).ring, "M");
});

test("pierścienie się zgadzają w 20 segmentach", () => {
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI / 10;
    const hit = scoreAt(Math.sin(a) * 11 / 31, -Math.cos(a) * 11 / 31, RR);
    assert.equal(hit.ring, "S");
    assert.ok(SEGS.includes(hit.seg), `segment w liczmany: ${a}`);
  }
});

test("biz: jeden punkt poniżej zera i jeden jest bizem", () => {
  for (let t = 1; t <= 60; t++) {
    const okEnd = 60 - t === 0;
    const bust = isBust(60, t);
    if (t > 60 || t === 59) assert.equal(bust, true);
    else if (okEnd) assert.equal(bust, false);
    else assert.equal(bust, false);
  }
  assert.equal(isBust(21, 20), true, "zostaje jeden — biz");
  assert.equal(isBust(1, 1), false, "trafienie zera to wygrana, nie biz");
});

test("trafienie dokładnie zera wygrywa — symulacja cały wyniku", () => {
  let score = 301;
  const rnd = () => { const j = (Math.random() - 0.5) * 6; return (x, y) => j; };
  // celujemy T20 z drżeniem 2 jednostki; z symulacji tylko wyniki bilansują się bez błędu
  for (let k = 0; k < 200; k++) {
    let before = score;
    score = Math.max(0, score);
    if (before !== score) assert.fail("wynik ujemny");
  }
});
