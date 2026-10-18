// Talia (deckbuilder): wędrówka przez kolejne pola mapy z walkami kartami. Co turę 3 energii i 5 kart z talii.
// Statusy: blok (znika na początku tury), siła, osłabienie (−25% obrażeń), podatność (+50% otrzymanych), trucizna, kolce.
const Deck = (() => {
  // karta: koszt, typ (atak/umiejętność), cel (jeden/wszyscy/ja), efekt
  const CARDS = {
    strike: { name: "Cios", cost: 1, type: "atak", text: "6 obrażeń.", fx: [["dmg", 6]] },
    defend: { name: "Obrona", cost: 1, type: "skill", text: "5 bloku.", fx: [["block", 5]] },
    twin: { name: "Dwa cięcia", cost: 1, type: "atak", text: "Dwa razy 4 obrażenia.", fx: [["dmg", 4], ["dmg", 4]] },
    heavy: { name: "Ciężkie uderzenie", cost: 2, type: "atak", text: "15 obrażeń.", fx: [["dmg", 15]] },
    whirl: { name: "Wir", cost: 1, type: "atak", all: true, text: "5 obrażeń wszystkim wrogom.", fx: [["dmg", 5]] },
    wall: { name: "Tarcza", cost: 2, type: "skill", text: "13 bloku.", fx: [["block", 13]] },
    prep: { name: "Przygotowanie", cost: 0, type: "skill", text: "Dobierz 2 karty.", fx: [["draw", 2]] },
    rage: { name: "Furia", cost: 1, type: "skill", text: "Na stałe w tej walce +2 siły.", fx: [["str", 2]] },
    weaken: { name: "Podcięcie", cost: 1, type: "atak", text: "3 obrażenia, osłabienie na 2 tury.", fx: [["dmg", 3], ["weak", 2]] },
    expose: { name: "Odsłonięcie", cost: 1, type: "atak", text: "4 obrażenia, podatność na 2 tury.", fx: [["dmg", 4], ["vuln", 2]] },
    poison: { name: "Jad", cost: 1, type: "skill", text: "6 trucizny. Trucizna rani co turę i słabnie.", fx: [["poison", 6]] },
    burst: { name: "Zastrzyk", cost: 0, type: "skill", exhaust: true, text: "+2 energii. Znika po użyciu.", fx: [["energy", 2]] },
    counter: { name: "Kontra", cost: 1, type: "atak", text: "7 bloku i 4 obrażenia.", fx: [["block", 7], ["dmg", 4]] },
    blaze: { name: "Pożoga", cost: 2, type: "atak", all: true, text: "10 obrażeń wszystkim wrogom.", fx: [["dmg", 10]] },
    mend: { name: "Opatrunek", cost: 1, type: "skill", exhaust: true, text: "Odzyskaj 6 zdrowia. Znika.", fx: [["heal", 6]] },
    frenzy: { name: "Szał", cost: 0, type: "atak", text: "3 obrażenia, dobierz kartę.", fx: [["dmg", 3], ["draw", 1]] },
    fortify: { name: "Mur", cost: 1, type: "skill", text: "Podwój swój blok.", fx: [["double", 1]] },
    execute: { name: "Egzekucja", cost: 2, type: "atak", text: "12 obrażeń, podwójne przy wrogu poniżej połowy zdrowia.", fx: [["exec", 12]] },
    spikes: { name: "Kolce", cost: 1, type: "skill", text: "4 bloku, 3 kolców (oddają atakującemu).", fx: [["block", 4], ["thorns", 3]] },
    plague: { name: "Zaraza", cost: 2, type: "skill", all: true, text: "5 trucizny wszystkim wrogom.", fx: [["poison", 5]] },
  };
  const REWARD_POOL = Object.keys(CARDS).filter((k) => k !== "strike" && k !== "defend");
  // wrogowie: zdrowie i cykl zamiarów [rodzaj, wartość]
  const ENEMIES = {
    slime: { name: "Szlam", hp: [24, 30], color: "#40c057", moves: [["atk", 7], ["atk", 5], ["weak", 2]] },
    cultist: { name: "Kultysta", hp: [30, 36], color: "#ae3ec9", moves: [["buff", 3], ["atk", 6], ["atk", 6]] },
    wolf: { name: "Wilk", hp: [20, 26], color: "#868e96", moves: [["atk", 4, 2], ["block", 6], ["atk", 9]] },
    bandit: { name: "Bandyta", hp: [28, 34], color: "#e8590c", moves: [["atk", 10], ["block", 8], ["vuln", 2]] },
    golem: { name: "Golem", hp: [60, 70], elite: true, color: "#495057", moves: [["block", 12], ["atk", 16], ["atk", 6, 2]] },
    witch: { name: "Wiedźma", hp: [48, 54], elite: true, color: "#c2255c", moves: [["weak", 2], ["atk", 12], ["poison", 4]] },
    dragon: { name: "Smok", hp: [140, 140], boss: true, color: "#e03131", moves: [["buff", 3], ["atk", 18], ["atk", 7, 3], ["block", 15], ["atk", 26]] },
  };
  const RELICS = {
    stone: { name: "Kamień siły", text: "Każda walka zaczyna się z +1 siły." },
    lantern: { name: "Latarnia", text: "+1 energii w pierwszej turze walki." },
    plate: { name: "Napierśnik", text: "6 bloku na początku walki." },
    thorn: { name: "Ciernista korona", text: "Zawsze masz 2 kolce." },
    vial: { name: "Fiolka krwi", text: "Po każdej walce odzyskujesz 5 zdrowia." },
    lens: { name: "Soczewka", text: "Dobierasz 1 kartę więcej w pierwszej turze." },
  };
  // mapa: kolejne kroki z wyborem rodzaju pola; ostatnie pole to boss
  function map(len) {
    const out = [];
    for (let k = 0; k < len - 1; k++) {
      const opts = k === 0 ? ["fight", "fight"] : shuffle(["fight", "fight", "elite", "rest", "chest", "shop"]).slice(0, 3);
      out.push([...new Set(opts)]);
    }
    out.push(["boss"]);
    return out;
  }
  const api = { CARDS, REWARD_POOL, ENEMIES, RELICS, map, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Deck;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "talia"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, len: 6, hp: 75, scale: 0.85 },
    { key: "medium", name: "Średni", points: 50, len: 8, hp: 65, scale: 1 },
    { key: "hard", name: "Trudny", points: 100, len: 10, hp: 58, scale: 1.15 },
  ],
  rules: [
    "Wędruj po mapie, wybierając kolejne pola: walki, elity z artefaktami, ogniska do odpoczynku, skarby i sklepy. Na końcu czeka smok.",
    "W walce masz co turę 3 energii i 5 kart. Kliknij kartę, a potem wroga, którego chcesz zaatakować. Ikona nad wrogiem zdradza, co zrobi w swojej turze.",
    "Blok chroni przed obrażeniami do końca tury. Siła zwiększa ataki, osłabienie je zmniejsza, podatność zwiększa otrzymane obrażenia, trucizna rani co turę, kolce oddają atakującemu.",
    "Po wygranej walce wybierasz jedną z trzech nowych kart. Mniejsza, mocna talia często jest lepsza od dużej.",
  ],
  achievements: [
    { id: "na-wlosku", name: "Na włosku", desc: "Pokonaj smoka, mając najwyżej 10 punktów zdrowia.", points: 10 },
    { id: "smukla-talia", name: "Smukła talia", desc: "Pokonaj smoka talią z najwyżej 15 kart.", points: 25 },
    { id: "pogromca-smokow", name: "Pogromca smoków", desc: "Pokonaj smoka na trudnym poziomie, mając co najmniej połowę zdrowia.", points: 50 },
  ],
  mount(board, ctx) {
    const { CARDS, ENEMIES, RELICS } = Deck;
    const lv = ctx.level;
    const s = { hp: lv.hp, max: lv.hp, gold: 30, deck: [...Array(5).fill("strike"), ...Array(4).fill("defend"), "twin"], relics: [], map: Deck.map(lv.len), step: 0, scene: "map", fight: null };
    Deck.last = s;
    board.classList.add("dk");
    board.style.setProperty("--cols", 12);
    board.style.setProperty("--rows", 8.6);
    const runEl = el("div", "dk-run");
    const deckEl = el("div", "dk-decklist");
    ctx.panel.append(panelBlock("Wyprawa", runEl), panelBlock("Talia", deckEl));
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };
    const NODE = { fight: ["Walka", "⚔"], elite: ["Elita", "☠"], rest: ["Ognisko", "♨"], chest: ["Skarb", "◆"], shop: ["Sklep", "$"], boss: ["Smok", "♛"] };

    function cardEl(id, extra = "") {
      const c = CARDS[id];
      const d = button("", `dk-card ${c.type === "atak" ? "atk" : "skl"} ${extra}`);
      d.append(el("span", "dk-cost", c.cost), el("b", "", c.name), el("small", "", c.type === "atak" ? "Atak" : "Umiejętność"), el("p", "", c.text));
      return d;
    }
    function renderRun() {
      const rel = s.relics.map((r) => { const d = el("span", "chip", RELICS[r].name); d.title = RELICS[r].text; return d; });
      const hp = el("div", "rl-bar hp"); const f = el("i"); f.style.width = `${(s.hp / s.max) * 100}%`; hp.append(f);
      runEl.replaceChildren(el("p", "rl-small", `Zdrowie ${s.hp} / ${s.max} · złoto ${s.gold} · krok ${Math.min(s.step + 1, lv.len)} z ${lv.len}`), hp, ...(rel.length ? [el("div", "chips", "")] : []));
      if (rel.length) runEl.lastChild.append(...rel);
      const counts = {};
      s.deck.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
      deckEl.replaceChildren(...Object.entries(counts).map(([c, n]) => el("span", "chip", `${CARDS[c].name} ×${n}`)));
      ctx.progress(s.step / lv.len);
    }

    // --- mapa ---
    function showMap() {
      s.scene = "map";
      const wrap = el("div", "dk-map");
      s.map.forEach((opts, k) => {
        const row = el("div", `dk-row${k === s.step ? " now" : k < s.step ? " past" : ""}`);
        row.append(el("span", "dk-step", k + 1));
        opts.forEach((o) => {
          const b = button("", `dk-node ${o}`, () => { if (k === s.step) enterNode(o); });
          b.disabled = k !== s.step;
          b.append(el("i", "", NODE[o][1]), el("span", "", NODE[o][0]));
          row.append(b);
        });
        wrap.append(row);
      });
      board.replaceChildren(el("h3", "dk-title", "Wybierz następne pole"), wrap);
      renderRun();
    }
    function enterNode(o) {
      Sound.tap();
      if (o === "fight") return startFight(pick([["slime", "wolf"], ["cultist"], ["bandit"], ["slime", "slime"], ["wolf", "cultist"]].filter((x) => s.step > 1 || x.length === 1 || x[0] === "slime")));
      if (o === "elite") return startFight([pick(["golem", "witch"])], true);
      if (o === "boss") return startFight(["dragon"], true);
      if (o === "rest") return showRest();
      if (o === "chest") return showChest();
      if (o === "shop") return showShop();
    }
    const advance = () => { s.step++; showMap(); };

    function showRest() {
      const heal = Math.round(s.max * 0.3);
      const box = el("div", "dk-choice");
      const a = button(`Odpocznij: +${heal} zdrowia`, "btn", () => { s.hp = Math.min(s.max, s.hp + heal); Sound.line(); advance(); });
      const b = button("Przemyśl talię: usuń jedną kartę", "btn-ghost", () => showRemove(advance));
      box.append(el("p", "", "Ogień trzaska, można chwilę złapać oddech."), a, b);
      board.replaceChildren(el("h3", "dk-title", "Ognisko"), box);
      renderRun();
    }
    function showRemove(then) {
      const box = el("div", "dk-hand pick");
      s.deck.forEach((id, k) => { const c = cardEl(id); c.onclick = () => { s.deck.splice(k, 1); Sound.erase(); then(); }; box.append(c); });
      board.replaceChildren(el("h3", "dk-title", "Którą kartę usunąć?"), box, button("Anuluj", "linkish", then));
      renderRun();
    }
    function showChest() {
      const left = Object.keys(RELICS).filter((r) => !s.relics.includes(r));
      const r = left.length ? pick(left) : null;
      const gold = 25 + rnd(20);
      s.gold += gold;
      if (r) s.relics.push(r);
      Sound.win();
      const box = el("div", "dk-choice");
      box.append(el("p", "", r ? `Znajdujesz ${gold} złota i artefakt: ${RELICS[r].name}. ${RELICS[r].text}` : `Znajdujesz ${gold} złota.`), button("Dalej", "btn", advance));
      board.replaceChildren(el("h3", "dk-title", "Skarb"), box);
      renderRun();
    }
    function showShop() {
      const offer = shuffle(Deck.REWARD_POOL.slice()).slice(0, 4).map((id) => [id, 30 + CARDS[id].cost * 15 + rnd(10)]);
      const draw = () => {
        const box = el("div", "dk-hand pick");
        offer.forEach(([id, price], k) => {
          const c = cardEl(id, s.gold < price ? "dim" : "");
          c.append(el("span", "dk-price", `${price} zł`));
          c.onclick = () => { if (s.gold < price) return Sound.error(); s.gold -= price; s.deck.push(id); offer.splice(k, 1); Sound.place(6); draw(); };
          box.append(c);
        });
        const remove = button("Usuń kartę z talii (50 zł)", "btn-ghost", () => { if (s.gold < 50) return Sound.error(); s.gold -= 50; showRemove(draw); });
        board.replaceChildren(el("h3", "dk-title", "Sklep"), box, el("div", "dk-choice row", ""), button("Wyjdź ze sklepu", "btn", advance));
        board.querySelector(".dk-choice.row").append(remove);
        renderRun();
      };
      draw();
    }

    // --- walka ---
    function startFight(list, big = false) {
      const enemies = list.map((id) => {
        const e = ENEMIES[id];
        const hp = Math.round((e.hp[0] + rnd(e.hp[1] - e.hp[0] + 1)) * lv.scale * (1 + s.step * 0.04));
        return { id, ...e, hp, max: hp, block: 0, str: 0, weak: 0, vuln: 0, poison: 0, turn: rnd(e.moves.length) * (e.boss ? 0 : 1) };
      });
      const f = { enemies, big, me: { block: 0, str: 0, weak: 0, vuln: 0, poison: 0, thorns: 0 }, draw: shuffle(s.deck.slice()), hand: [], discard: [], exhaust: [], energy: 3, turn: 0, sel: -1, busy: false };
      s.fight = f;
      s.scene = "fight";
      if (s.relics.includes("stone")) f.me.str = 1;
      if (s.relics.includes("plate")) f.me.block = 6;
      startTurn(true);
    }
    function drawCards(n) {
      const f = s.fight;
      for (let k = 0; k < n; k++) {
        if (!f.draw.length) { f.draw = shuffle(f.discard); f.discard = []; }
        if (!f.draw.length) break;
        f.hand.push(f.draw.pop());
      }
    }
    function startTurn(first = false) {
      const f = s.fight;
      f.turn++;
      if (!first || !s.relics.includes("plate")) f.me.block = 0;
      f.me.thorns = s.relics.includes("thorn") ? 2 : 0;
      f.energy = 3 + (first && s.relics.includes("lantern") ? 1 : 0);
      drawCards(5 + (first && s.relics.includes("lens") ? 1 : 0));
      f.busy = false;
      renderFight();
    }
    const dealt = (src, base, tgt) => {
      let d = base + src.str;
      if (src.weak) d *= 0.75;
      if (tgt.vuln) d *= 1.5;
      return Math.max(0, Math.floor(d));
    };
    function damage(tgt, n) {
      const absorbed = Math.min(tgt.block, n);
      tgt.block -= absorbed;
      tgt.hp -= n - absorbed;
      return n - absorbed;
    }
    function playCard(k, target) {
      const f = s.fight, id = f.hand[k], c = CARDS[id];
      if (f.busy || c.cost > f.energy) { Sound.error(); return; }
      const alive = f.enemies.filter((e) => e.hp > 0);
      const needs = c.fx.some(([t]) => ["dmg", "weak", "vuln", "poison", "exec"].includes(t)) && !c.all;
      if (needs && target == null) {
        if (alive.length === 1) target = f.enemies.indexOf(alive[0]);
        else { f.sel = k; renderFight(); return; }
      }
      f.energy -= c.cost;
      f.hand.splice(k, 1);
      (c.exhaust ? f.exhaust : f.discard).push(id);
      f.sel = -1;
      const targets = c.all ? alive : target != null ? [f.enemies[target]] : [];
      for (const [t, v] of c.fx) {
        if (t === "dmg" || t === "exec") for (const e of targets) {
          const base = t === "exec" && e.hp < e.max / 2 ? v * 2 : v;
          const lost = damage(e, dealt(f.me, base, e));
          pop(f.enemies.indexOf(e), `-${lost}`);
        }
        if (t === "block") f.me.block += v;
        if (t === "double") f.me.block *= 2;
        if (t === "draw") drawCards(v);
        if (t === "str") f.me.str += v;
        if (t === "energy") f.energy += v;
        if (t === "heal") s.hp = Math.min(s.max, s.hp + v);
        if (t === "thorns") f.me.thorns += v;
        if (["weak", "vuln", "poison"].includes(t)) for (const e of targets) e[t] += v;
      }
      Sound.place(c.type === "atak" ? 5 : 3);
      renderFight();
      checkEnd();
    }
    function pop(i, text) {
      const e = board.querySelectorAll(".dk-enemy")[i];
      if (!e) return;
      const p = el("span", "dk-pop", text);
      e.append(p);
      replay(e, "shake");
      setTimeout(() => p.remove(), 700);
    }
    function checkEnd() {
      const f = s.fight;
      if (f.enemies.every((e) => e.hp <= 0)) {
        f.busy = true;
        const boss = f.enemies.some((e) => e.boss);
        wait(() => {
          if (boss) {
            if (s.hp <= 10) ctx.achieve("na-wlosku");
            if (s.deck.length <= 15) ctx.achieve("smukla-talia");
            if (ctx.level.key === "hard" && s.hp * 2 >= s.max) ctx.achieve("pogromca-smokow");
          }
          if (boss) { renderRun(); return ctx.win(`Smok pokonany! Zdrowie ${s.hp} / ${s.max}, talia ${s.deck.length} kart.`); }
          if (s.relics.includes("vial")) s.hp = Math.min(s.max, s.hp + 5);
          s.gold += f.big ? 35 + rnd(15) : 12 + rnd(10);
          if (f.big) { const left = Object.keys(RELICS).filter((r) => !s.relics.includes(r)); if (left.length) s.relics.push(pick(left)); }
          showReward();
        }, 500);
        Sound.line();
        return true;
      }
      if (s.hp <= 0) { s.hp = 0; renderRun(); ctx.lose("Porażka", `Krok ${s.step + 1} z ${lv.len}.`); return true; }
      return false;
    }
    function endTurn() {
      const f = s.fight;
      if (f.busy || ctx.done) return;
      f.busy = true;
      f.discard.push(...f.hand);
      f.hand = [];
      renderFight();
      // tura wrogów: trucizna, potem zamiary po kolei
      let delay = 300;
      for (const e of f.enemies) {
        if (e.hp <= 0) continue;
        wait(() => {
          if (ctx.done || e.hp <= 0) return;
          e.block = 0;
          if (e.poison) { e.hp -= e.poison; e.poison--; if (e.hp <= 0) { renderFight(); return checkEnd(); } }
          const [kind, v, times = 1] = e.moves[e.turn % e.moves.length];
          if (kind === "atk") for (let t = 0; t < times; t++) {
            const n = dealt(e, v, f.me), absorbed = Math.min(f.me.block, n), lost = n - absorbed;
            f.me.block -= absorbed;
            s.hp -= lost;
            if (lost) Sound.error(); else Sound.tap();
            if (f.me.thorns) { e.hp -= f.me.thorns; }
          }
          if (kind === "block") e.block += v;
          if (kind === "buff") e.str += v;
          if (kind === "weak") f.me.weak += v;
          if (kind === "vuln") f.me.vuln += v;
          if (kind === "poison") f.me.poison += v;
          e.turn++;
          e.weak = Math.max(0, e.weak - 1);
          e.vuln = Math.max(0, e.vuln - 1);
          replay(board.querySelectorAll(".dk-enemy")[f.enemies.indexOf(e)], "lunge");
          renderFight();
          checkEnd();
        }, delay);
        delay += 520;
      }
      wait(() => {
        if (ctx.done || s.scene !== "fight" || f.enemies.every((e) => e.hp <= 0)) return;
        if (f.me.poison) { s.hp -= f.me.poison; f.me.poison--; if (checkEnd()) return; }
        f.me.weak = Math.max(0, f.me.weak - 1);
        f.me.vuln = Math.max(0, f.me.vuln - 1);
        startTurn();
      }, delay + 100);
    }
    const statusChips = (o) => [["block", "Blok"], ["str", "Siła"], ["weak", "Osłabienie"], ["vuln", "Podatność"], ["poison", "Trucizna"], ["thorns", "Kolce"]]
      .filter(([k]) => o[k]).map(([k, n]) => { const c = el("span", `dk-st ${k}`, `${n} ${o[k]}`); return c; });
    function intentText(e) {
      const [kind, v, times = 1] = e.moves[e.turn % e.moves.length];
      if (kind === "atk") { const d = dealt(e, v, s.fight.me); return ["atk", times > 1 ? `${d}×${times}` : `${d}`, "Atak"]; }
      return [kind, v, { block: "Blok", buff: "Siła", weak: "Osłabi cię", vuln: "Odsłoni cię", poison: "Trucizna" }[kind]];
    }
    function renderFight() {
      const f = s.fight;
      const foes = el("div", "dk-foes");
      f.enemies.forEach((e, i) => {
        const d = button("", `dk-enemy${e.hp <= 0 ? " dead" : ""}${e.boss ? " boss" : e.elite ? " elite" : ""}${f.sel >= 0 && e.hp > 0 ? " targetable" : ""}`, () => { if (f.sel >= 0 && e.hp > 0) playCard(f.sel, i); });
        d.style.setProperty("--ec", e.color);
        const [kind, val, label] = intentText(e);
        const intent = el("span", `dk-intent ${kind}`, `${label} ${val}`);
        const hp = el("span", "dk-hp"); const fill = el("i"); fill.style.width = `${Math.max(0, e.hp / e.max) * 100}%`; hp.append(fill, el("small", "", `${Math.max(0, e.hp)} / ${e.max}`));
        const st = el("span", "dk-stats"); st.append(...statusChips(e));
        d.append(e.hp > 0 ? intent : el("span"), el("span", "dk-body"), el("b", "", e.name), hp, st);
        foes.append(d);
      });
      const me = el("div", "dk-me");
      const hp = el("span", "dk-hp mine"); const fill = el("i"); fill.style.width = `${(s.hp / s.max) * 100}%`; hp.append(fill, el("small", "", `${s.hp} / ${s.max}`));
      const st = el("span", "dk-stats"); st.append(...statusChips(f.me));
      me.append(el("span", "dk-energy", `${f.energy}`), hp, st);
      const hand = el("div", "dk-hand");
      f.hand.forEach((id, k) => {
        const c = cardEl(id, `${CARDS[id].cost > f.energy ? "dim" : ""}${k === f.sel ? " sel" : ""}`);
        c.style.setProperty("--k", k);
        c.style.setProperty("--n", f.hand.length);
        c.onclick = () => (f.sel === k ? ((f.sel = -1), renderFight()) : playCard(k));
        hand.append(c);
      });
      const foot = el("div", "dk-foot");
      const endBtn = button("Koniec tury", "btn", endTurn);
      endBtn.disabled = f.busy;
      foot.append(el("span", "dk-pile", `Talia ${f.draw.length}`), endBtn, el("span", "dk-pile", `Odrzucone ${f.discard.length}`));
      board.replaceChildren(foes, me, hand, foot);
      if (f.sel >= 0) board.append(el("p", "dk-hint", "Wybierz cel ataku"));
      renderRun();
    }
    function showReward() {
      s.scene = "reward";
      const opts = shuffle(Deck.REWARD_POOL.slice()).slice(0, 3);
      const box = el("div", "dk-hand pick");
      opts.forEach((id) => { const c = cardEl(id); c.onclick = () => { s.deck.push(id); Sound.place(7); advance(); }; box.append(c); });
      board.replaceChildren(el("h3", "dk-title", "Zwycięstwo! Wybierz kartę do talii"), box, button("Pomiń", "linkish", advance));
      renderRun();
    }
    heldKeys(ctx, (k) => {
      if (s.scene !== "fight" || ctx.done) return;
      if (k === "e" || k === "enter") endTurn();
      if (/^[1-9]$/.test(k) && +k <= s.fight.hand.length) playCard(+k - 1);
      if (k === "escape") { s.fight.sel = -1; renderFight(); }
    });
    showMap();
  },
});
