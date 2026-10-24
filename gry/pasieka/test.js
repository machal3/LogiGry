const test = require("node:test");
const assert = require("node:assert/strict");
Object.assign(globalThis, require("../../lib.js"));
const {
  startState, tickHive, extractHoney, plantFlower, addFrame, treatMites, feedSyrup, playSeason, beginDay, hiveNote,
} = require("./gra.js");

const easy = { key: "easy", days: 26, goal: 32, mite: 0.45, rain: 0.12, heat: 0.08, dayLen: 2.8, bees: 24, flowers: 4, frames: 3, coins: 14 };
const medium = { key: "medium", days: 24, goal: 52, mite: 0.75, rain: 0.2, heat: 0.12, dayLen: 2.8, bees: 20, flowers: 3, frames: 2, coins: 12 };
const hard = { key: "hard", days: 22, goal: 62, mite: 1, rain: 0.24, heat: 0.16, dayLen: 2.8, bees: 20, flowers: 4, frames: 3, coins: 14 };

test("zbiór miodu zostawia zapas w ulu", () => {
  const s = startState(easy);
  s.honey = 20;
  const take = extractHoney(s);
  assert.ok(take > 0);
  assert.ok(s.honey >= 3);
  assert.equal(s.harvested, take);
  assert.ok(s.coins > easy.coins);
});

test("leczenie obniża roztocza", () => {
  const s = startState(easy);
  s.mites = 10;
  s.coins = 20;
  treatMites(s);
  tickHive(s, 2, easy);
  assert.ok(s.mites < 10);
});

test("przepełniony ul się roi", () => {
  const s = startState(easy);
  s.frames = 1;
  s.bees = 40;
  s.nectar = 20;
  s.honey = 10;
  tickHive(s, 0.05, easy);
  assert.ok(s.swarmed >= 1);
  assert.ok(s.bees < 40);
});

test("sadzenie i ramka zużywają monety", () => {
  const s = startState(easy);
  s.coins = 40;
  const flowers = s.flowers.length;
  const frames = s.frames;
  assert.equal(plantFlower(s), true);
  assert.equal(s.flowers.length, flowers + 1);
  assert.equal(addFrame(s), true);
  assert.equal(s.frames, frames + 1);
});

test("syrop podnosi nektar", () => {
  const s = startState(easy);
  s.nectar = 0;
  s.coins = 20;
  const n = s.nectar;
  assert.equal(feedSyrup(s), true);
  assert.ok(s.nectar > n);
});

test("status mówi dlaczego jest głód albo ciasno", () => {
  const s = startState(easy);
  s.nectar = 0;
  s.honey = 0;
  assert.match(hiveNote(s), /Głód/);
  s.nectar = 8;
  s.honey = 8;
  s.frames = 1;
  s.bees = 20;
  assert.match(hiveNote(s), /ciasny|ramk/i);
});

test("wyższa cena daje więcej złotówek przy zbiorze", () => {
  const low = startState(easy);
  const high = startState(easy);
  low.honey = high.honey = 20;
  low.price = 1.2;
  high.price = 2.4;
  extractHoney(low);
  extractHoney(high);
  assert.ok(high.coins > low.coins);
});

test("nowy dzień ustawia jutrzejszą pogodę", () => {
  const s = startState(easy);
  s.day = 1;
  beginDay(s, easy, () => 0.5);
  assert.ok(s.nextWx);
  assert.ok(["slonce", "deszcz", "upal", "mroz"].includes(s.weather));
});

test("bot zbiera cel na każdym poziomie", () => {
  for (const lv of [easy, medium, hard]) {
    const s = playSeason(lv, () => 0.41);
    assert.ok(s.harvested >= lv.goal, `${lv.key}: ${s.harvested.toFixed(1)} / ${lv.goal}`);
    assert.ok(s.bees >= 2, `${lv.key}: rodzina padła`);
  }
});
