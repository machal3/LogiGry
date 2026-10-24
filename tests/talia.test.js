// Testy logiki Talii: opisy kart, walka, mapa i symulacja wypraw prostym botem (każdy poziom da się przejść).
const test = require("node:test");
const assert = require("node:assert");
const D = require("../games/talia.js");

test("talia: opisy kart z liczbami i odmianą", () => {
  assert.equal(D.plainText("strike"), "6 obrażeń.");
  assert.equal(D.plainText("twin"), "Dwa razy po 4 obrażenia.");
  assert.equal(D.plainText("burst"), "+2 energii. Znika po użyciu.");
  assert.equal(D.plainText("strike+"), "9 obrażeń.");
  assert.equal(D.card("fortify+").cost, 0);
  assert.equal(D.plainText("strike", (v) => v + 2), "8 obrażeń.");
  for (const id of Object.keys(D.BASE)) for (const v of [id, `${id}+`]) {
    assert.match(D.plainText(v), /^[A-ZĄĆĘŁŃÓŚŹŻ0-9+]/, v);
    assert.ok(D.summary(v).length >= 1, v);
  }
});

test("talia: mapa kończy się ogniskiem albo sklepem i smokiem", () => {
  for (const lv of D.LEVELS) {
    const m = D.map(lv.len);
    assert.equal(m.length, lv.len);
    assert.deepEqual(m[0], ["fight"]);
    assert.deepEqual(m[lv.len - 1], ["boss"]);
    assert.deepEqual(m[lv.len - 2], ["rest", "shop"]);
    m.forEach((opts) => assert.equal(new Set(opts).size, opts.length));
  }
});

test("talia: blok, podatność, trucizna i kolce", () => {
  const lv = D.LEVELS[1], s = D.newRun(lv);
  const f = D.fight(s, ["slime"], lv);
  D.startTurn(s, f);
  const e = f.enemies[0];
  e.hp = e.max = 40;
  f.hand = ["expose", "strike", "poison", "spikes"];
  f.huid = [1, 2, 3, 4];
  f.energy = 4;
  D.play(s, f, 0, 0); // 4 obrażenia, podatność
  assert.equal(e.hp, 36);
  D.play(s, f, 0, 0); // 6 × 1,5 = 9
  assert.equal(e.hp, 27);
  D.play(s, f, 0, 0);
  assert.equal(e.poison, 6);
  D.play(s, f, 0);
  assert.equal(f.me.block, 4);
  assert.equal(f.energy, 0);
  assert.equal(D.play(s, f, 0, 0), null);
  e.moves = [["atk", 10]];
  e.turn = 0;
  D.endPlayerTurn(f);
  const ev = D.enemyAct(s, f, 0);
  assert.equal(e.hp, 27 - 6 - 3); // trucizna i kolce
  assert.equal(s.hp, lv.hp - 6); // 10 minus 4 bloku
  assert.ok(ev.some((x) => x.t === "thorns"));
  assert.equal(e.poison, 5);
});

// prosty bot: blokuje, gdy wróg atakuje, w innym razie bije najsłabszego
function botTurn(s, f) {
  for (let guard = 0; guard < 30; guard++) {
    const live = D.alive(f);
    if (!live.length) return;
    let inc = 0;
    for (const e of live) { const it = D.intent(e); if (it.kind === "atk") inc += D.dealt(e, it.v, f.me) * it.times; }
    const need = Math.max(0, inc - f.me.block);
    const tgt = live.slice().sort((a, b) => a.hp + a.block - b.hp - b.block)[0];
    let best = -1, bs = 0;
    f.hand.forEach((id, k) => {
      if (!D.canPlay(f, k)) return;
      const c = D.card(id);
      let sc = 0;
      for (const [t, v] of c.fx) {
        if (t === "dmg" || t === "exec") { const n = D.dealt(f.me, t === "exec" && tgt.hp < tgt.max / 2 ? 2 * v : v, tgt) * (c.all ? live.length : 1); sc += Math.min(n, tgt.hp + tgt.block + (c.all ? 99 : 0)) + (n >= tgt.hp + tgt.block ? 8 : 0); }
        if (t === "block") sc += Math.min(v, need) * 1.3 + 0.3;
        if (t === "double") sc += Math.min(f.me.block, need) * 1.3;
        if (t === "draw") sc += 5 * v;
        if (t === "energy") sc += 7 * v;
        if (t === "str") sc += f.turn < 4 ? 10 : 2;
        if (t === "weak") sc += inc > 6 ? 6 : 1;
        if (t === "vuln") sc += 4;
        if (t === "poison") sc += v * (c.all ? live.length : 1) * 1.5;
        if (t === "heal") sc += s.max - s.hp > 10 ? 6 : 0;
        if (t === "thorns") sc += inc > 0 ? 3 : 0;
      }
      sc /= Math.max(c.cost, 0.6);
      if (sc > bs) { bs = sc; best = k; }
    });
    if (best < 0 || !D.play(s, f, best, f.enemies.indexOf(tgt))) return;
  }
}
function battle(s, list, lv, big) {
  const f = D.fight(s, list, lv, big);
  for (let r = 0; r < 80 && !D.outcome(s, f); r++) {
    D.startTurn(s, f);
    botTurn(s, f);
    if (D.outcome(s, f)) break;
    D.endPlayerTurn(f);
    for (let i = 0; i < f.enemies.length && !D.outcome(s, f); i++) D.enemyAct(s, f, i);
    if (!D.outcome(s, f)) D.endRound(s, f);
  }
  return D.outcome(s, f);
}
const PRI = ["blaze", "heavy", "wall", "execute", "counter", "rage", "weaken", "whirl", "poison", "plague", "expose", "frenzy"];
function run(lv) {
  const s = D.newRun(lv);
  for (s.step = 0; s.step < lv.len; s.step++) {
    const opts = s.map[s.step];
    const o = opts.includes("boss") ? "boss" : s.hp < s.max * 0.5 && opts.includes("rest") ? "rest" : opts.includes("chest") ? "chest" : s.hp > s.max * 0.7 && opts.includes("elite") ? "elite" : opts.includes("fight") ? "fight" : opts.includes("rest") ? "rest" : opts[0];
    if (["fight", "elite", "boss"].includes(o)) {
      const list = o === "fight" ? D.encounter(s.step) : o === "elite" ? [Math.random() < 0.5 ? "golem" : "witch"] : ["dragon"];
      if (battle(s, list, lv, o !== "fight") !== "win") return false;
      if (o === "boss") return true;
      if (s.relics.includes("vial")) s.hp = Math.min(s.max, s.hp + 6);
      if (o === "elite") { const left = Object.keys(D.RELICS).filter((r) => !s.relics.includes(r)); if (left.length) s.relics.push(left[0]); }
      const offer = D.REWARD_POOL.slice().sort(() => Math.random() - 0.5).slice(0, 3);
      const pick = PRI.find((p) => offer.includes(p));
      if (pick && s.deck.length < 18) s.deck.push(pick);
    } else if (o === "rest") {
      if (s.hp < s.max * 0.7) s.hp = Math.min(s.max, s.hp + Math.round(s.max * 0.3));
      else { const k = s.deck.findIndex((c) => !c.endsWith("+")); if (k >= 0) s.deck[k] += "+"; }
    } else if (o === "chest") {
      const left = Object.keys(D.RELICS).filter((r) => !s.relics.includes(r));
      if (left.length) s.relics.push(left[Math.floor(Math.random() * left.length)]);
    }
  }
  return false;
}

test("talia: każdy poziom da się przejść, a trudniejszy jest trudniejszy", () => {
  const N = 300;
  const rate = D.LEVELS.map((lv) => { let w = 0; for (let k = 0; k < N; k++) w += run(lv) ? 1 : 0; return w / N; });
  // bot gra słabiej od człowieka; progi z dużym zapasem na losowość
  assert.ok(rate[0] > 0.6, `łatwy: ${rate[0]}`);
  assert.ok(rate[1] > 0.2 && rate[1] < rate[0], `średni: ${rate[1]}`);
  assert.ok(rate[2] > 0.02 && rate[2] < rate[1], `trudny: ${rate[2]}`);
});
