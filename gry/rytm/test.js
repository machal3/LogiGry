// Test logiki gry: node --test gry/rytm/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { judgeDelta, makeChart, findHit, nextLane, WIN, LANES, KEY_LANE } = require("./gra.js");

const LEVELS = [
  { key: "easy", bpm: 96, stepDiv: 1, density: 80, chord: 0, duration: 36 },
  { key: "medium", bpm: 116, stepDiv: 2, density: 48, chord: 0, duration: 42 },
  { key: "hard", bpm: 138, stepDiv: 2, density: 52, chord: 18, duration: 44 },
];

const stepOf = (lv) => 60 / lv.bpm / lv.stepDiv;

test("ocena uderzenia: środek, blisko, pudło", () => {
  assert.strictEqual(judgeDelta(0).kind, "perfect");
  assert.strictEqual(judgeDelta(-WIN.perfect).kind, "perfect");
  assert.strictEqual(judgeDelta(WIN.good).kind, "good");
  assert.strictEqual(judgeDelta(-0.1).kind, "good");
  assert.strictEqual(judgeDelta(0.25), null);
  assert.strictEqual(judgeDelta(-0.4), null);
  assert.ok(judgeDelta(0).points > judgeDelta(0.12).points, "środek musi dawać więcej punktów");
});

test("każdy poziom dostaje nuty na siatce, posortowane i w granicach torów", () => {
  for (const lv of LEVELS) {
    const notes = makeChart(lv);
    assert.ok(notes.length > 20, `${lv.key}: za mało nut`);
    assert.ok(notes.length < 200, `${lv.key}: za dużo nut`);
    for (let i = 0; i < notes.length; i++) {
      const n = notes[i];
      assert.ok(n.lane >= 0 && n.lane < LANES, `${lv.key}: tor poza zakresem`);
      assert.ok(n.t >= 0 && n.t < lv.duration, `${lv.key}: nuta poza utworem`);
      if (i) {
        const p = notes[i - 1];
        assert.ok(p.t < n.t || (p.t === n.t && p.lane < n.lane), `${lv.key}: nuty nie są posortowane`);
      }
    }
  }
});

test("na jednym torze nuty nie nachodzą na siebie, a akord to najwyżej dwie nuty", () => {
  for (const lv of LEVELS) {
    const notes = makeChart(lv);
    const step = stepOf(lv);
    const last = new Array(LANES).fill(-1);
    const perTime = new Map();
    for (const n of notes) {
      assert.ok(last[n.lane] < 0 || n.t - last[n.lane] >= step - 1e-9, `${lv.key}: nuty na jednym torze są za blisko`);
      last[n.lane] = n.t;
      const lanes = perTime.get(n.t) || [];
      assert.ok(!lanes.includes(n.lane), `${lv.key}: dwie nuty w tym samym torze i czasie`);
      lanes.push(n.lane);
      perTime.set(n.t, lanes);
    }
    for (const lanes of perTime.values()) {
      assert.ok(lanes.length <= 2, `${lv.key}: akord z więcej niż dwóch nut`);
      if (lv.chord === 0) assert.strictEqual(lanes.length, 1, `${lv.key}: akord, którego nie powinno być`);
    }
  }
});

test("trudny poziom ma akordy, a nuty obu rąk trafiają na różne strony", () => {
  const notes = makeChart(LEVELS[2]);
  const at = new Map();
  for (const n of notes) at.set(n.t, [...(at.get(n.t) || []), n.lane]);
  const chords = [...at.values()].filter((l) => l.length === 2);
  assert.ok(chords.length > 0, "brak akordów");
  for (const [a, b] of chords) assert.strictEqual(Math.abs(a - b), 2, "akord nie jest na przeciwległych torach");
});

test("kolejna nuta nigdy nie wypada na tym samym torze", () => {
  for (let k = 0; k < 200; k++) {
    for (let prev = 0; prev < LANES; prev++) {
      const n = nextLane(prev);
      assert.ok(n >= 0 && n < LANES && n !== prev, "tor się powtórzył");
    }
  }
});

test("trafienie trafia w najbliższą nutę w oknie, a oceniona już nie liczy się dwa razy", () => {
  const notes = [{ t: 1, lane: 0 }, { t: 1.05, lane: 0 }, { t: 2, lane: 1 }, { t: 5, lane: 0 }];
  assert.strictEqual(findHit(notes, 0, 1.06).t, 1.05, "nie wybrano najbliższej nuty");
  assert.strictEqual(findHit(notes, 0, 1.0).t, 1);
  assert.strictEqual(findHit(notes, 1, 2.1).t, 2);
  assert.strictEqual(findHit(notes, 1, 1.0), null, "zły tor został zaliczony");
  assert.strictEqual(findHit(notes, 0, 4.0), null, "nuta poza oknem została zaliczona");
  notes[3].done = true;
  assert.strictEqual(findHit(notes, 0, 5.0), null, "oceniona nuta liczy się drugi raz");
});

test("klawiatura i strzałki obsługują wszystkie cztery tory", () => {
  const lanes = new Set(Object.values(KEY_LANE));
  assert.strictEqual(lanes.size, LANES);
  assert.deepStrictEqual([...lanes].sort(), [0, 1, 2, 3]);
});
