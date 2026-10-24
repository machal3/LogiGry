// Talia (deckbuilder): wędrówka przez kolejne pola mapy z walkami kartami. Co turę 3 energii i 5 kart z talii.
// Statusy: blok (znika na początku tury), siła, osłabienie (−25% obrażeń), podatność (+50% otrzymanych), trucizna, kolce.
// Logika walki (Deck.*) nie dotyka strony: zmienia stan i zwraca zdarzenia, które widok zamienia na animacje.
const Deck = (() => {
  const R = (n) => Math.floor(Math.random() * n);
  const mix = (a) => {
    for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const any = (a) => a[R(a.length)];

  // karta: koszt, typ (atak/umiejętność), all = wszyscy wrogowie, exhaust = znika po użyciu, up = wersja ulepszona
  const BASE = {
    strike: { name: "Cios", cost: 1, type: "atak", fx: [["dmg", 6]], up: { fx: [["dmg", 9]] } },
    defend: { name: "Obrona", cost: 1, type: "skill", fx: [["block", 5]], up: { fx: [["block", 8]] } },
    twin: { name: "Dwa cięcia", cost: 1, type: "atak", fx: [["dmg", 4], ["dmg", 4]], up: { fx: [["dmg", 6], ["dmg", 6]] } },
    heavy: { name: "Młot", cost: 2, type: "atak", fx: [["dmg", 15]], up: { fx: [["dmg", 21]] } },
    whirl: { name: "Wir", cost: 1, type: "atak", all: true, fx: [["dmg", 5]], up: { fx: [["dmg", 8]] } },
    wall: { name: "Tarcza", cost: 2, type: "skill", fx: [["block", 13]], up: { fx: [["block", 18]] } },
    prep: { name: "Przygotowanie", cost: 0, type: "skill", fx: [["draw", 2]], up: { fx: [["draw", 3]] } },
    rage: { name: "Furia", cost: 1, type: "skill", fx: [["str", 2]], up: { fx: [["str", 3]] } },
    weaken: { name: "Podcięcie", cost: 1, type: "atak", fx: [["dmg", 4], ["weak", 2]], up: { fx: [["dmg", 6], ["weak", 3]] } },
    expose: { name: "Odsłonięcie", cost: 1, type: "atak", fx: [["dmg", 4], ["vuln", 2]], up: { fx: [["dmg", 6], ["vuln", 3]] } },
    poison: { name: "Jad", cost: 1, type: "skill", fx: [["poison", 6]], up: { fx: [["poison", 9]] } },
    burst: { name: "Zastrzyk", cost: 0, type: "skill", exhaust: true, fx: [["energy", 2]], up: { fx: [["energy", 3]] } },
    counter: { name: "Kontra", cost: 1, type: "atak", fx: [["dmg", 4], ["block", 6]], up: { fx: [["dmg", 6], ["block", 8]] } },
    blaze: { name: "Pożoga", cost: 2, type: "atak", all: true, fx: [["dmg", 10]], up: { fx: [["dmg", 14]] } },
    mend: { name: "Opatrunek", cost: 1, type: "skill", exhaust: true, fx: [["heal", 7]], up: { fx: [["heal", 11]] } },
    frenzy: { name: "Szał", cost: 0, type: "atak", fx: [["dmg", 3], ["draw", 1]], up: { fx: [["dmg", 5], ["draw", 1]] } },
    fortify: { name: "Mur", cost: 1, type: "skill", fx: [["block", 3], ["double", 1]], up: { cost: 0 } },
    execute: { name: "Egzekucja", cost: 2, type: "atak", fx: [["exec", 12]], up: { fx: [["exec", 16]] } },
    spikes: { name: "Kolce", cost: 1, type: "skill", fx: [["block", 4], ["thorns", 3]], up: { fx: [["block", 6], ["thorns", 5]] } },
    plague: { name: "Zaraza", cost: 2, type: "skill", all: true, fx: [["poison", 5]], up: { fx: [["poison", 8]] } },
  };
  // id ulepszonej karty kończy się plusem: "strike+"
  const memo = {};
  function card(id) {
    if (memo[id]) return memo[id];
    const up = id.endsWith("+"), base = up ? id.slice(0, -1) : id, b = BASE[base];
    return (memo[id] = { ...b, ...(up ? b.up : {}), id, base, up, name: b.name + (up ? "+" : "") });
  }
  const CARDS = new Proxy({}, { get: (_, id) => (typeof id === "string" && BASE[id.replace(/\+$/, "")] ? card(id) : undefined) });
  const REWARD_POOL = Object.keys(BASE).filter((k) => k !== "strike" && k !== "defend");
  const TARGETED = ["dmg", "exec", "weak", "vuln", "poison"];
  const needsTarget = (id) => !card(id).all && card(id).fx.some(([t]) => TARGETED.includes(t));

  // opis karty z bieżącymi liczbami: lista fragmentów, liczby jako { v, cls } ("up" / "down" przy zmianie)
  const forms = (n, one, few, many) => (n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many);
  function describe(id, mod = (v) => v) {
    const c = card(id), parts = [];
    const num = (v, shown = v) => ({ v: shown, cls: shown > v ? "up" : shown < v ? "down" : "" });
    for (let k = 0; k < c.fx.length; k++) {
      const [t, v] = c.fx[k];
      if (t === "dmg" || t === "exec") {
        let n = 1;
        while (c.fx[k + n] && c.fx[k + n][0] === t && c.fx[k + n][1] === v) n++;
        k += n - 1;
        const d = mod(v);
        parts.push([n > 1 ? `${["", "", "dwa", "trzy"][n]} razy po ` : "", num(v, d), ` ${forms(d, "obrażenie", "obrażenia", "obrażeń")}${t === "exec" ? ", podwójne przy wrogu poniżej połowy zdrowia" : ""}${c.all ? " wszystkim wrogom" : ""}`]);
      }
      if (t === "block") parts.push([num(v), " bloku"]);
      if (t === "double") parts.push(["potem podwój swój blok"]);
      if (t === "draw") parts.push([`dobierz `, num(v), ` ${forms(v, "kartę", "karty", "kart")}`]);
      if (t === "str") parts.push(["+", num(v), " siły do końca walki"]);
      if (t === "weak") parts.push(["osłabienie na ", num(v), ` ${forms(v, "turę", "tury", "tur")}`]);
      if (t === "vuln") parts.push(["podatność na ", num(v), ` ${forms(v, "turę", "tury", "tur")}`]);
      if (t === "poison") parts.push([num(v), ` trucizny${c.all ? " wszystkim wrogom" : ""}`]);
      if (t === "energy") parts.push(["+", num(v), " energii"]);
      if (t === "heal") parts.push(["odzyskaj ", num(v), " zdrowia"]);
      if (t === "thorns") parts.push([num(v), " kolców"]);
    }
    const out = [];
    parts.forEach((p, i) => { if (i) out.push(", "); out.push(...p); });
    if (typeof out[0] === "string") out[0] = out[0].charAt(0).toUpperCase() + out[0].slice(1);
    else if (out[0] === "") out.shift();
    out.push(c.exhaust ? ". Znika po użyciu." : ".");
    return out;
  }
  const plainText = (id, mod) => describe(id, mod).map((x) => (typeof x === "string" ? x : x.v)).join("");
  // krótki skrót karty na obrazek: najwyżej dwie pary [ikona, liczba]
  function summary(id, mod = (v) => v) {
    const c = card(id), out = [];
    for (let k = 0; k < c.fx.length; k++) {
      const [t, v] = c.fx[k];
      if (t === "dmg" || t === "exec") {
        let n = 1;
        while (c.fx[k + n] && c.fx[k + n][0] === t) n++;
        k += n - 1;
        out.push(["sword", n > 1 ? `${mod(v)}×${n}` : `${mod(v)}`]);
      } else out.push([{ block: "shield", double: "shield", draw: "cards", str: "up", weak: "down", vuln: "target", poison: "drop", energy: "bolt", heal: "heart", thorns: "spike" }[t], t === "double" ? "×2" : ["draw", "str", "energy", "heal"].includes(t) ? `+${v}` : `${v}`]);
    }
    return out.slice(0, 2);
  }

  // wrogowie: zdrowie, kolor z palety, cykl zamiarów [rodzaj, wartość, razy]
  const ENEMIES = {
    slime: { name: "Szlam", hp: [22, 28], color: "green", moves: [["atk", 7], ["atk", 5], ["weak", 2]] },
    spider: { name: "Pająk", hp: [18, 24], color: "teal", moves: [["poison", 3], ["atk", 6], ["atk", 3, 2]] },
    cultist: { name: "Kultysta", hp: [30, 36], color: "violet", moves: [["buff", 3], ["atk", 6], ["atk", 6]] },
    wolf: { name: "Wilk", hp: [20, 26], color: "gray", moves: [["atk", 4, 2], ["block", 6], ["atk", 9]] },
    bandit: { name: "Bandyta", hp: [28, 34], color: "orange", moves: [["atk", 10], ["block", 8], ["vuln", 2]] },
    golem: { name: "Golem", hp: [60, 70], elite: true, color: "brown", moves: [["block", 12], ["atk", 16], ["atk", 6, 2]] },
    witch: { name: "Wiedźma", hp: [48, 54], elite: true, color: "pink", moves: [["weak", 2], ["atk", 12], ["poison", 4]] },
    dragon: { name: "Smok", hp: [130, 130], boss: true, color: "red", moves: [["buff", 3], ["atk", 16], ["atk", 6, 3], ["block", 15], ["atk", 24]] },
  };
  const EARLY = [["slime"], ["wolf"], ["cultist"], ["spider"]];
  const LATER = [["slime", "wolf"], ["bandit"], ["slime", "slime"], ["wolf", "cultist"], ["spider", "slime"], ["spider", "spider"], ["cultist"]];
  const RELICS = {
    stone: { name: "Kamień siły", text: "Każda walka zaczyna się z +1 siły." },
    lantern: { name: "Latarnia", text: "+1 energii w pierwszej turze walki." },
    plate: { name: "Napierśnik", text: "8 bloku na początku walki." },
    thorn: { name: "Ciernista korona", text: "Zawsze masz 2 kolce." },
    vial: { name: "Fiolka krwi", text: "Po każdej walce odzyskujesz 6 zdrowia." },
    lens: { name: "Soczewka", text: "Dobierasz 2 karty więcej w pierwszej turze." },
  };
  // mapa: kolejne kroki z wyborem rodzaju pola; przed smokiem ognisko albo sklep, ostatnie pole to smok
  function map(len) {
    const out = [["fight"]];
    for (let k = 1; k < len - 2; k++) out.push(mix(["fight", "fight", "elite", "rest", "chest", "shop"]).slice(0, 3).filter((x, i, a) => a.indexOf(x) === i));
    out.push(["rest", "shop"]);
    out.push(["boss"]);
    return out;
  }

  // --- walka ---
  const STATUS = () => ({ block: 0, str: 0, weak: 0, vuln: 0, poison: 0, thorns: 0 });
  function fight(s, list, lv, big = false) {
    const enemies = list.map((id) => {
      const e = ENEMIES[id];
      // smok ma stałe zdrowie z poziomu, reszta rośnie z krokiem wyprawy
      const hp = e.boss ? lv.boss : Math.round((e.hp[0] + R(e.hp[1] - e.hp[0] + 1)) * lv.scale * (1 + s.step * 0.035));
      return { id, ...e, ...STATUS(), hp, max: hp, turn: e.boss ? 0 : R(e.moves.length) };
    });
    const f = { enemies, big, me: STATUS(), draw: mix(s.deck.slice()), hand: [], huid: [], discard: [], exhaust: [], energy: 3, turn: 0, uid: 0, kills: 0 };
    if (s.relics.includes("stone")) f.me.str = 1;
    if (s.relics.includes("plate")) f.me.block = 8;
    return f;
  }
  function drawCards(f, n, ev = []) {
    for (let k = 0; k < n; k++) {
      if (!f.draw.length) {
        if (!f.discard.length) break;
        f.draw = mix(f.discard);
        f.discard = [];
        ev.push({ t: "shuffle" });
      }
      f.hand.push(f.draw.pop());
      f.huid.push(++f.uid);
    }
    ev.push({ t: "draw" });
    return ev;
  }
  function startTurn(s, f) {
    const first = f.turn === 0;
    f.turn++;
    if (!first) f.me.block = 0;
    f.me.thorns = s.relics.includes("thorn") ? 2 : 0;
    f.energy = 3 + (first && s.relics.includes("lantern") ? 1 : 0);
    return drawCards(f, 5 + (first && s.relics.includes("lens") ? 2 : 0));
  }
  const dealt = (src, base, tgt) => {
    let d = base + src.str;
    if (src.weak) d *= 0.75;
    if (tgt && tgt.vuln) d *= 1.5;
    return Math.max(0, Math.floor(d));
  };
  // obrażenia po bloku; zdarzenie "hit" i ewentualnie "die"
  function hurt(f, who, n, ev, kind = "hit") {
    const tgt = who === "me" ? f.me : f.enemies[who];
    const blocked = Math.min(tgt.block, n);
    tgt.block -= blocked;
    const lost = n - blocked;
    if (who === "me") f.s.hp -= lost;
    else {
      const was = tgt.hp;
      tgt.hp -= lost;
      if (was > 0 && tgt.hp <= 0) { tgt.hp = 0; f.kills++; ev.push({ t: kind, to: who, n: lost, blocked }, { t: "die", to: who }); return; }
    }
    ev.push({ t: kind, to: who, n: lost, blocked });
  }
  const alive = (f) => f.enemies.filter((e) => e.hp > 0);
  const canPlay = (f, k) => k >= 0 && k < f.hand.length && card(f.hand[k]).cost <= f.energy;
  // zagranie karty k (cel: indeks wroga); null, gdy się nie da
  function play(s, f, k, target) {
    if (!canPlay(f, k)) return null;
    const id = f.hand[k], c = card(id), live = alive(f);
    if (needsTarget(id)) {
      if (target == null && live.length === 1) target = f.enemies.indexOf(live[0]);
      if (target == null || !f.enemies[target] || f.enemies[target].hp <= 0) return null;
    }
    f.s = s;
    const ev = [];
    f.energy -= c.cost;
    f.hand.splice(k, 1);
    f.huid.splice(k, 1);
    (c.exhaust ? f.exhaust : f.discard).push(id);
    const targets = c.all ? live.map((e) => f.enemies.indexOf(e)) : target != null ? [target] : [];
    for (const [t, v] of c.fx) {
      if (t === "dmg" || t === "exec") for (const i of targets) {
        const e = f.enemies[i];
        if (e.hp <= 0) continue;
        hurt(f, i, dealt(f.me, t === "exec" && e.hp < e.max / 2 ? v * 2 : v, e), ev);
      }
      if (t === "block") { f.me.block += v; ev.push({ t: "block", to: "me", n: v }); }
      if (t === "double") { ev.push({ t: "block", to: "me", n: f.me.block }); f.me.block *= 2; }
      if (t === "draw") drawCards(f, v, ev);
      if (t === "str") { f.me.str += v; ev.push({ t: "status", to: "me", k: "str", n: v }); }
      if (t === "energy") { f.energy += v; ev.push({ t: "energy", n: v }); }
      if (t === "heal") { const n = Math.min(s.max - s.hp, v); s.hp += n; ev.push({ t: "heal", n }); }
      if (t === "thorns") { f.me.thorns += v; ev.push({ t: "status", to: "me", k: "thorns", n: v }); }
      if (["weak", "vuln", "poison"].includes(t)) for (const i of targets) if (f.enemies[i].hp > 0) { f.enemies[i][t] += v; ev.push({ t: "status", to: i, k: t, n: v }); }
    }
    return { id, c, target, targets, ev };
  }
  function endPlayerTurn(f) {
    f.discard.push(...f.hand);
    f.hand = [];
    f.huid = [];
  }
  const intent = (e) => { const [kind, v, times = 1] = e.moves[e.turn % e.moves.length]; return { kind, v, times }; };
  // ruch jednego wroga: blok znika, trucizna rani, potem zamiar
  function enemyAct(s, f, i) {
    const e = f.enemies[i], ev = [];
    f.s = s;
    if (e.hp <= 0) return ev;
    e.block = 0;
    if (e.poison) { hurt(f, i, e.poison, ev, "poison"); e.poison--; if (e.hp <= 0) return ev; }
    const { kind, v, times } = intent(e);
    ev.push({ t: "act", to: i, kind });
    if (kind === "atk") for (let t = 0; t < times && s.hp > 0 && e.hp > 0; t++) {
      hurt(f, "me", dealt(e, v, f.me), ev);
      if (f.me.thorns) hurt(f, i, f.me.thorns, ev, "thorns");
    }
    if (kind === "block") { e.block += v; ev.push({ t: "block", to: i, n: v }); }
    if (kind === "buff") { e.str += v; ev.push({ t: "status", to: i, k: "str", n: v }); }
    if (["weak", "vuln", "poison"].includes(kind)) { f.me[kind] += v; ev.push({ t: "status", to: "me", k: kind, n: v }); }
    e.turn++;
    e.weak = Math.max(0, e.weak - 1);
    e.vuln = Math.max(0, e.vuln - 1);
    return ev;
  }
  // koniec rundy: trucizna gracza i słabnięcie statusów
  function endRound(s, f) {
    const ev = [];
    f.s = s;
    if (f.me.poison) { hurt(f, "me", f.me.poison, ev, "poison"); f.me.poison--; }
    f.me.weak = Math.max(0, f.me.weak - 1);
    f.me.vuln = Math.max(0, f.me.vuln - 1);
    return ev;
  }
  const outcome = (s, f) => (s.hp <= 0 ? "lose" : f.enemies.every((e) => e.hp <= 0) ? "win" : null);
  const encounter = (step) => any(step > 1 ? LATER : EARLY);
  const newRun = (lv) => ({ hp: lv.hp, max: lv.hp, gold: 40, deck: [...Array(5).fill("strike"), ...Array(4).fill("defend"), "twin"], relics: [], map: map(lv.len), step: 0, scene: "map", fight: null, path: [], kills: 0 });

  // poziomy: długość mapy, zdrowie gracza, siła zwykłych wrogów, zdrowie smoka (sprawdzone symulacją w tests/talia.test.js)
  const LEVELS = [
    { key: "easy", name: "Łatwy", points: 20, len: 7, hp: 80, scale: 0.85, boss: 100 },
    { key: "medium", name: "Średni", points: 50, len: 9, hp: 72, scale: 1, boss: 120 },
    { key: "hard", name: "Trudny", points: 100, len: 11, hp: 65, scale: 1.15, boss: 145 },
  ];

  const api = { LEVELS, CARDS, BASE, card, REWARD_POOL, ENEMIES, RELICS, map, describe, plainText, summary, needsTarget, fight, drawCards, startTurn, dealt, play, canPlay, endPlayerTurn, intent, enemyAct, endRound, outcome, alive, encounter, newRun, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Deck;

if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "talia"), {
  author: "Claude Opus 5.5",
  levels: Deck.LEVELS,
  rules: [
    "Wędruj po mapie, wybierając kolejne pola: walki, elity z artefaktami, ogniska, skarby i sklepy. Na końcu czeka smok.",
    "W walce masz co turę 3 energii i 5 kart. Kliknij kartę, a gdy wrogów jest kilku, także cel. Na telefonie pierwsze stuknięcie pokazuje opis karty, drugie ją zagrywa.",
    "Znak nad wrogiem zdradza, co zrobi w swojej turze: miecz to atak, tarcza to blok. Kliknij wroga, żeby przeczytać jego zamiar.",
    "Blok chroni do początku Twojej następnej tury. Siła zwiększa ataki, osłabienie je zmniejsza, podatność zwiększa otrzymane obrażenia, trucizna rani co turę, kolce oddają atakującemu.",
    "Po walce wybierasz jedną z trzech kart, przy ognisku możesz ulepszyć kartę. Mniejsza, mocna talia często jest lepsza od dużej.",
    "Klawiatura: cyfry 1–9 zagrywają karty, strzałki wybierają cel, E albo Enter kończy turę, Esc anuluje wybór.",
  ],
  achievements: [
    { id: "na-wlosku", name: "Na włosku", desc: "Pokonaj smoka, mając najwyżej 10 punktów zdrowia.", points: 10 },
    { id: "kowal", name: "Kowal", desc: "Ulepsz 3 karty w jednej wyprawie.", points: 10 },
    { id: "potezny-cios", name: "Potężny cios", desc: "Zadaj co najmniej 30 obrażeń jedną kartą.", points: 25 },
    { id: "bez-ran", name: "Bez zadrapania", desc: "Pokonaj elitę, nie tracąc ani punktu zdrowia.", points: 25 },
    { id: "kolekcjoner", name: "Kolekcjoner", desc: "Zbierz 4 artefakty w jednej wyprawie.", points: 25 },
    { id: "smukla-talia", name: "Smukła talia", desc: "Pokonaj smoka talią z najwyżej 15 kart.", points: 25 },
    { id: "pogromca-smokow", name: "Pogromca smoków", desc: "Pokonaj smoka na trudnym poziomie, mając co najmniej połowę zdrowia.", points: 50 },
  ],
  mount(board, ctx) {
    const { card, RELICS } = Deck;
    const lv = ctx.level;
    const s = Deck.newRun(lv);
    s.upgrades = 0;
    Deck.last = s;
    board.classList.add("dk");
    const media = (q) => typeof matchMedia !== "undefined" && matchMedia(q).matches;
    const still = () => media("(prefers-reduced-motion: reduce)");
    const touch = media("(hover: none)");
    const timers = new Set();
    const wait = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    ctx.onStop(() => timers.forEach(clearTimeout));
    // animacja z klasy; zdejmowana po czasie, nie po animationend (te bąbelkują od kart w środku)
    const flash = (node, cls, ms = 450) => { if (!node) return; node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); wait(() => node.classList.remove(cls), ms); };

    // --- ikony i rysunki ---
    const NS = "http://www.w3.org/2000/svg";
    const ICON = {
      sword: '<path d="M20.5 2.5h1v4L11 17l-4-4L17.5 2.5zM5.3 12.2l6.5 6.5-1.4 1.4-2.55-2.55-3 3-1.4-1.4 3-3-2.55-2.55z"/>',
      shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z"/>',
      drop: '<path d="M12 2.5C9 7.5 5.5 11 5.5 15a6.5 6.5 0 0 0 13 0c0-4-3.5-7.5-6.5-12.5z"/>',
      up: '<path d="M12 3l8 9h-5v9H9v-9H4z"/>',
      down: '<path d="M12 21l-8-9h5V3h6v9h5z"/>',
      bolt: '<path d="M13.5 2 4 14h7l-1.5 8L20 10h-7z"/>',
      cards: '<path d="M9 2h11v15H9zM5 6h2v13h10v2H5z"/>',
      heart: '<path d="M12 21s-8.5-5.3-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 3.2C20.5 15.7 12 21 12 21z"/>',
      spike: '<path d="M12 2l2.4 6.6L21 7l-4.4 5 4.4 5-6.6-1.6L12 22l-2.4-6.6L3 17l4.4-5L3 7l6.6 1.6z"/>',
      target: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>',
      skull: '<path fill-rule="evenodd" d="M12 2a8.5 8.5 0 0 0-8.5 8.5c0 3 1.5 5.4 4 6.8V21h9v-3.7c2.5-1.4 4-3.8 4-6.8A8.5 8.5 0 0 0 12 2zM8.5 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
      flame: '<path d="M12 2c.5 3.5 5.5 6 5.5 11.5A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.5c0-2.6 1.5-4.4 2.6-5.4-.1 2 .9 3.3 1.9 3.6C10.3 9 11 5.2 12 2zM4 20.5h16V22H4z"/>',
      chest: '<path d="M4 9a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1H4zM4 11.5h16V20H4z"/>',
      coin: '<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"/><path d="M11 8h2v8h-2z"/>',
      crown: '<path d="M3 7l5 4 4-7 4 7 5-4-2 12H5zM5 20.5h14V22H5z"/>',
    };
    const svg = (inner, box, cls) => {
      const n = document.createElementNS(NS, "svg");
      n.setAttribute("viewBox", box);
      n.setAttribute("class", cls);
      n.setAttribute("aria-hidden", "true");
      n.innerHTML = inner;
      return n;
    };
    const icon = (name) => svg(ICON[name], "0 0 24 24", "dk-ic");
    // postacie w polu 100 × 100: b kolor postaci, d ciemniejszy, l jaśniejszy, ey oczy, gl świecące oczy, pu źrenice i usta
    const SHADOW = '<ellipse class="sh" cx="50" cy="93" rx="34" ry="5"/>';
    const SPRITE = {
      hero: '<path class="b" d="M22 93c0-21 11-33 28-33s28 12 28 33z"/><path class="l" d="M44 62h12v31H44z"/><path class="mt" d="M50 10c-14 0-23 10-23 25v14c0 7 10 11 23 11s23-4 23-11V35c0-15-9-25-23-25z"/><path class="pu" d="M33 33h34v6H33zM48 39h4v14h-4z"/><path class="b" d="M51 10c3-6 10-8 17-5-5 2-9 6-11 11z"/><path class="mt" d="M84 34h4v38h-4zM78 70h16v4H78zM84 74h4v10h-4z"/>',
      slime: '<path class="b" d="M12 89C8 62 26 34 50 34s42 28 38 55c-8 3-18 2-25 0-6 2-20 2-26 0-8 2-17 2-25 0z"/><path class="ls" d="M27 52c6-8 14-11 20-11"/><circle class="ey" cx="38" cy="62" r="7.5"/><circle class="ey" cx="62" cy="62" r="7.5"/><circle class="pu" cx="39" cy="63.5" r="3.5"/><circle class="pu" cx="63" cy="63.5" r="3.5"/><path class="ps" d="M42 76q8 6 16 0"/>',
      spider: '<g class="ds"><path d="M38 60 22 44 8 68"/><path d="M38 66 16 62 6 84"/><path d="M62 60 78 44 92 68"/><path d="M62 66 84 62 94 84"/><path d="M41 74 27 80 20 92"/><path d="M59 74 73 80 80 92"/></g><ellipse class="b" cx="50" cy="52" rx="22" ry="19"/><path class="l" d="M42 40c4-3 12-3 16 0l-2 18h-12z"/><ellipse class="d" cx="50" cy="76" rx="15" ry="12"/><circle class="gl" cx="43" cy="75" r="3.6"/><circle class="gl" cx="57" cy="75" r="3.6"/><circle class="gl" cx="47" cy="68" r="2"/><circle class="gl" cx="53" cy="68" r="2"/>',
      cultist: '<path class="b" d="M50 8C30 8 22 31 22 52L14 93h72L78 52C78 31 70 8 50 8z"/><path class="d" d="M50 20c-11 0-18 10-18 23 0 10 8 17 18 17s18-7 18-17c0-13-7-23-18-23z"/><circle class="gl" cx="43" cy="44" r="3.2"/><circle class="gl" cx="57" cy="44" r="3.2"/><path class="l" d="M47 62h6v31h-6z"/><path class="d" d="M24 70l-8 20h14zM76 70l8 20H70z"/>',
      wolf: '<path class="d" d="M20 10l14 28-18 6zM80 10 66 38l18 6z"/><path class="b" d="M50 22c-21 0-33 15-33 33 0 9 4 15 10 19l23 19 23-19c6-4 10-10 10-19 0-18-12-33-33-33z"/><path class="l" d="M50 54c-9 0-15 8-15 17l15 15 15-15c0-9-6-17-15-17z"/><path class="pu" d="M44 64h12l-6 7z"/><path class="gl" d="M30 46l12 3-10 5zM70 46l-12 3 10 5z"/><path class="ps" d="M44 78q6 4 12 0"/>',
      bandit: '<path class="b" d="M16 93c2-21 15-31 34-31s32 10 34 31z"/><circle class="sk" cx="50" cy="42" r="22"/><path class="b" d="M26 37c1-15 11-22 24-22s23 7 24 22z"/><path class="d" d="M26 37h48v11H26z"/><circle class="ey" cx="41" cy="42.5" r="3.6"/><circle class="ey" cx="59" cy="42.5" r="3.6"/><circle class="pu" cx="41" cy="43" r="1.7"/><circle class="pu" cx="59" cy="43" r="1.7"/><path class="b" d="M30 52h40l-6 14H36z"/><path class="d" d="M74 30l14-8-4 14z"/>',
      golem: '<rect class="d" x="10" y="42" width="18" height="36" rx="6"/><rect class="d" x="72" y="42" width="18" height="36" rx="6"/><rect class="b" x="25" y="30" width="50" height="52" rx="9"/><rect class="l" x="34" y="10" width="32" height="25" rx="6"/><rect class="gl" x="39" y="19" width="22" height="5.5" rx="2.5"/><path class="ds" d="M36 44l10 8-4 10M64 40l-6 12 8 6"/><rect class="d" x="29" y="80" width="15" height="13" rx="3"/><rect class="d" x="56" y="80" width="15" height="13" rx="3"/>',
      witch: '<path class="b" d="M20 93c2-23 13-35 30-35s28 12 30 35z"/><circle class="fc" cx="50" cy="50" r="16"/><path class="d" d="M50 2 32 38h36z"/><ellipse class="d" cx="50" cy="38" rx="30" ry="6"/><path class="l" d="M38 30h24v4H38z"/><circle class="gl" cx="44" cy="50" r="2.8"/><circle class="gl" cx="56" cy="50" r="2.8"/><path class="ps" d="M44 59q6 4 12 0"/><path class="mt" d="M82 40h3v53h-3z"/><circle class="l" cx="83.5" cy="38" r="5"/>',
      dragon: '<path class="d" d="M32 48 2 20l7 32-7 7 25 4zM68 48l30-28-7 32 7 7-25 4z"/><path class="b" d="M27 93c0-23 9-37 23-37s23 14 23 37z"/><path class="l" d="M40 93c0-15 4-25 10-25s10 10 10 25z"/><path class="l" d="M34 26 22 4l20 15zM66 26 78 4 58 19z"/><path class="b" d="M50 14c-17 0-25 13-25 27 0 11 6 19 12 23h26c6-4 12-12 12-23 0-14-8-27-25-27z"/><path class="l" d="M37 51c4 7 22 7 26 0v9c-4 7-22 7-26 0z"/><path class="gl" d="M32 34l12 5-12 4zM68 34l-12 5 12 4z"/><circle class="pu" cx="45" cy="56" r="2"/><circle class="pu" cx="55" cy="56" r="2"/>',
    };
    const sprite = (id) => svg(SHADOW + SPRITE[id], "0 0 100 100", "dk-art-svg");
    const FIRE = '<ellipse class="sh" cx="50" cy="91" rx="36" ry="5"/><g class="fl"><path class="f1" d="M50 14c4 14 23 22 23 45a23 23 0 0 1-46 0c0-10 6-18 10-22 0 8 4 13 8 14-3-13 0-25 5-37z"/><path class="f2" d="M50 42c2 8 13 13 13 25a13 13 0 0 1-26 0c0-6 4-10 6-12 0 4 2 6 4 7-1-7 1-14 3-20z"/></g><path class="lg" d="M18 76l64 11-2 7-64-11zM82 76 18 87l2 7 64-11z"/>';
    const CHEST = '<ellipse class="sh" cx="50" cy="91" rx="38" ry="5"/><g class="rays"><path d="M50 46 30 4h40z"/><path d="M50 46 6 20l10-12z"/><path d="M50 46 94 20 84 8z"/></g><rect class="cb" x="14" y="48" width="72" height="41" rx="5"/><rect class="cm" x="14" y="58" width="72" height="5"/><g class="lid"><path class="cb" d="M14 48v-8a14 14 0 0 1 14-14h44a14 14 0 0 1 14 14v8z"/><rect class="cm" x="14" y="42" width="72" height="5"/></g><rect class="cm" x="45" y="44" width="10" height="16" rx="2"/>';

    // --- panel ---
    const hpStat = statBlock(ctx, "Zdrowie", { meter: true });
    const runStats = statsBlock(ctx, "Wyprawa", ["Złoto", "Karty", "Pokonani"]);
    const relEl = el("div", "dk-relics");
    const deckEl = el("div", "dk-decklist");
    ctx.panel.append(panelBlock("Artefakty", relEl), panelBlock("Talia", deckEl));
    function renderRun() {
      hpStat.set(`${Math.max(0, s.hp)} / ${s.max}`, Math.max(0, s.hp) / s.max, `Krok ${Math.min(s.step + 1, lv.len)} z ${lv.len}`);
      runStats.set("Złoto", `${s.gold} zł`);
      runStats.set("Karty", s.deck.length);
      runStats.set("Pokonani", s.kills);
      relEl.replaceChildren(...(s.relics.length ? s.relics.map((r) => { const p = el("p", "dk-relic"); p.append(el("b", "", RELICS[r].name), el("span", "", RELICS[r].text)); return p; }) : [el("p", "dk-none", "Jeszcze żadnych. Szukaj ich w skarbach i u elit.")]));
      const counts = {};
      s.deck.forEach((c) => (counts[c] = (counts[c] || 0) + 1));
      deckEl.replaceChildren(...Object.entries(counts).map(([c, n]) => {
        const d = el("span", `chip ${card(c).type === "atak" ? "atk" : "skl"}${card(c).up ? " up" : ""}`, n > 1 ? `${card(c).name} ×${n}` : card(c).name);
        d.title = Deck.plainText(c);
        return d;
      }));
      ctx.progress(s.step / lv.len);
    }
    function scene(cls, ...kids) {
      const w = el("div", `dk-scene ${cls}`);
      w.append(...kids);
      board.replaceChildren(w);
      renderRun();
      return w;
    }
    const title = (t) => el("h3", "dk-title", t);

    // karta: koszt, nazwa, obrazek ze skrótem, opis, typ; mod przelicza obrażenia
    function fillCard(b, id, mod) {
      const c = card(id);
      b.className = `dk-card ${c.type === "atak" ? "atk" : "skl"}${c.up ? " up" : ""}${b.dataset.extra ? ` ${b.dataset.extra}` : ""}`;
      const art = el("span", "dk-art");
      Deck.summary(id, mod).forEach(([ic, v]) => { const p = el("span", "dk-sum"); p.append(icon(ic), el("em", "", v)); art.append(p); });
      const txt = el("span", "dk-text");
      Deck.describe(id, mod).forEach((x) => txt.append(typeof x === "string" ? x : el("b", x.cls, x.v)));
      b.replaceChildren(el("span", "dk-cost", c.cost), el("span", "dk-name", c.name), art, txt, el("span", "dk-type", c.type === "atak" ? "Atak" : "Umiejętność"));
      b.setAttribute("aria-label", `${c.name}, koszt ${c.cost}. ${Deck.plainText(id, mod)}`);
      b.dataset.id = id;
    }
    function cardEl(id, extra = "", mod) {
      const b = button("", "dk-card");
      b.dataset.extra = extra;
      fillCard(b, id, mod);
      return b;
    }
    const deal = (nodes, start = 0) => nodes.forEach((n, j) => { n.classList.add("deal"); n.style.setProperty("--d", `${start + j * 70}ms`); });

    // --- mapa ---
    const NODE = { fight: ["Walka", "sword"], elite: ["Elita", "skull"], rest: ["Ognisko", "flame"], chest: ["Skarb", "chest"], shop: ["Sklep", "coin"], boss: ["Smok", "crown"] };
    function showMap() {
      s.scene = "map";
      s.fight = null;
      const wrap = el("div", "dk-map");
      s.map.forEach((opts, k) => {
        const row = el("div", `dk-row${k === s.step ? " now" : k < s.step ? " past" : ""}`);
        const nodes = el("div", "dk-nodes");
        opts.forEach((o, j) => {
          const b = button("", `dk-node ${o}${s.path[k] === o ? " taken" : ""}`, () => { if (k === s.step && !ctx.done) enterNode(o); });
          b.disabled = k !== s.step;
          b.setAttribute("aria-label", `${NODE[o][0]}, krok ${k + 1} z ${lv.len}`);
          if (k === s.step) b.style.setProperty("--d", `${j * 80}ms`);
          const ic = el("span", "dk-nic");
          ic.append(icon(NODE[o][1]));
          b.append(ic, el("span", "dk-nlab", NODE[o][0]));
          nodes.append(b);
        });
        row.append(el("span", "dk-step", k + 1), nodes);
        wrap.append(row);
      });
      scene(`dk-s-map${lv.len > 7 ? " long" : ""}`, title(s.step ? "Dokąd dalej?" : "Wyrusz na wyprawę"), wrap);
      // bieżący krok na środku mapy (mapa przewija się w sobie, nie strona)
      const now = wrap.querySelector(".dk-row.now");
      if (now) wrap.scrollTop = now.offsetTop - wrap.clientHeight / 2 + now.offsetHeight / 2;
    }
    function enterNode(o) {
      s.path[s.step] = o;
      Sound.tap();
      if (o === "fight") return startFight(Deck.encounter(s.step), "fight");
      if (o === "elite") return startFight([pick(["golem", "witch"])], "elite");
      if (o === "boss") return startFight(["dragon"], "boss");
      if (o === "rest") return showRest();
      if (o === "chest") return showChest();
      if (o === "shop") return showShop();
    }
    const advance = () => { s.step++; showMap(); };
    function gainRelic(r) {
      if (!r) return;
      s.relics.push(r);
      if (s.relics.length >= 4) ctx.achieve("kolekcjoner");
    }

    // --- ognisko, skarb, sklep, wybór karty ---
    function showRest() {
      s.scene = "rest";
      const heal = Math.min(Math.round(s.max * 0.3), s.max - s.hp);
      const box = el("div", "dk-choice");
      const a = button(heal ? `Odpocznij: +${heal} zdrowia` : "Odpocznij (masz pełne zdrowie)", "btn wide", () => { s.hp += heal; Sound.line(); advance(); });
      const up = s.deck.filter((id) => !id.endsWith("+"));
      const u = button("Ulepsz kartę", "btn-ghost wide", () => showPick("Którą kartę ulepszyć?", up, (k) => {
        s.deck[k] += "+";
        if (++s.upgrades >= 3) ctx.achieve("kowal");
        Sound.flag();
        advance();
      }, showRest, true));
      u.disabled = !up.length;
      const art = el("div", "dk-illu fire");
      art.append(svg(FIRE, "0 0 100 100", "dk-art-svg"));
      box.append(el("p", "", "Ogień trzaska. Odpocznij albo popracuj nad talią."), a, u);
      scene("dk-s-rest", title("Ognisko"), art, box);
    }
    // lista kart do wyboru (każda karta raz, z licznikiem); upgrade pokazuje kartę po ulepszeniu
    function showPick(head, ids, onPick, back, upgrade = false) {
      s.scene = "pick";
      const grid = el("div", "dk-grid");
      const uniq = [...new Set(ids)];
      uniq.forEach((id) => {
        const c = cardEl(upgrade ? `${id}+` : id);
        if (upgrade) { const t = c.querySelector(".dk-type"); t.className = "dk-type dk-was"; t.textContent = `Teraz: ${Deck.plainText(id)}`; }
        const n = ids.filter((x) => x === id).length;
        if (n > 1) c.append(el("span", "dk-count", `×${n}`));
        c.onclick = () => onPick(s.deck.indexOf(id));
        grid.append(c);
      });
      deal([...grid.children]);
      scene("dk-s-pick", title(head), grid, button("Wróć", "linkish", back));
    }
    function showChest() {
      s.scene = "chest";
      const left = Object.keys(RELICS).filter((r) => !s.relics.includes(r));
      const r = left.length ? pick(left) : null;
      const gold = 25 + rnd(20);
      const art = el("div", "dk-illu chest");
      art.append(svg(CHEST, "0 0 100 100", "dk-art-svg"));
      const box = el("div", "dk-choice");
      const open = () => {
        s.gold += gold;
        gainRelic(r);
        art.classList.add("open");
        Sound.win();
        const loot = el("p", "dk-loot");
        loot.append(el("b", "", `+${gold} zł`));
        if (r) loot.append(el("span", "", ` i artefakt: ${RELICS[r].name}. ${RELICS[r].text}`));
        const go = button("Dalej", "btn wide", advance);
        box.replaceChildren(loot, go);
        go.focus({ preventScroll: true });
        renderRun();
      };
      art.onclick = () => { if (!art.classList.contains("open")) open(); };
      box.append(el("p", "", "Stara skrzynia okuta żelazem."), button("Otwórz skrzynię", "btn wide", open));
      scene("dk-s-chest", title("Skarb"), art, box);
    }
    function showShop() {
      s.scene = "shop";
      const offer = shuffle(Deck.REWARD_POOL.slice()).slice(0, 5).map((id, j) => ({ id: j === 4 ? `${id}+` : id, price: 30 + card(id).cost * 15 + rnd(10) + (j === 4 ? 25 : 0) }));
      let removed = false, first = true;
      const draw = () => {
        s.scene = "shop";
        const grid = el("div", "dk-grid shop");
        offer.forEach((o) => {
          const c = cardEl(o.id, o.sold ? "sold" : s.gold < o.price ? "dim" : "");
          c.append(el("span", "dk-price", o.sold ? "Kupione" : `${o.price} zł`));
          c.onclick = () => {
            if (o.sold) return;
            if (s.gold < o.price) { flash(c, "dk-no", 400); return Sound.error(); }
            s.gold -= o.price;
            s.deck.push(o.id);
            o.sold = true;
            Sound.place(6);
            draw();
          };
          grid.append(c);
        });
        if (first) deal([...grid.children]);
        first = false;
        const rem = button(removed ? "Usunięto" : "Usuń kartę 40 zł", "btn-ghost", () => {
          if (s.gold < 40) { flash(rem, "dk-no", 400); return Sound.error(); }
          showPick("Którą kartę usunąć?", s.deck, (k) => { s.gold -= 40; s.deck.splice(k, 1); removed = true; Sound.erase(); draw(); }, draw);
        });
        rem.disabled = removed || s.deck.length <= 5;
        const row = el("div", "dk-actions");
        row.append(rem, button("Wyjdź", "btn", advance));
        scene("dk-s-shop", title(`Sklep · ${s.gold} zł`), grid, row);
      };
      draw();
    }
    function showReward(f, gold, relic) {
      s.scene = "reward";
      const opts = shuffle(Deck.REWARD_POOL.slice()).slice(0, 3).map((id, j) => (f.big && j === 0 ? `${id}+` : id));
      const grid = el("div", "dk-grid reward");
      opts.forEach((id) => {
        const c = cardEl(id);
        c.onclick = () => take(id);
        grid.append(c);
      });
      deal([...grid.children], 150);
      const loot = el("p", "dk-loot");
      loot.append(el("b", "", `+${gold} zł`));
      if (relic) loot.append(el("span", "", ` · artefakt: ${RELICS[relic].name}. ${RELICS[relic].text}`));
      s.reward = opts;
      scene("dk-s-reward", title("Wybierz kartę do talii"), loot, grid, button("Pomiń", "linkish", advance));
    }
    const take = (id) => { s.deck.push(id); s.reward = null; Sound.place(7); advance(); };

    // --- walka ---
    let F = null;
    const ST = { str: ["up", "Siła"], weak: ["down", "Osłabienie"], vuln: ["target", "Podatność"], poison: ["drop", "Trucizna"], thorns: ["spike", "Kolce"] };
    const INTENT = { atk: "sword", block: "shield", buff: "up", weak: "down", vuln: "target", poison: "drop" };
    function intentInfo(e) {
      const { kind, v, times } = Deck.intent(e);
      if (kind === "atk") {
        const d = Deck.dealt(e, v, s.fight.me);
        return [times > 1 ? `${d}×${times}` : `${d}`, times > 1 ? `zaatakuje ${times} razy po ${d}` : `zaatakuje za ${d}`];
      }
      return [`${v}`, { block: `zyska ${v} bloku`, buff: `zyska ${v} siły`, weak: `osłabi cię na ${v} tury`, vuln: `odsłoni cię na ${v} tury`, poison: `zatruje cię (${v})` }[kind]];
    }
    function hpBar(cls = "") {
      const b = el("span", `dk-hp ${cls}`), lag = el("i", "lag"), now = el("i", "now"), t = el("small");
      b.append(lag, now, t);
      return {
        el: b,
        set(hp, max, block) {
          const p = `${(Math.max(0, hp) / max) * 100}%`;
          now.style.width = p;
          lag.style.width = p;
          t.textContent = `${Math.max(0, hp)} / ${max}`;
          b.classList.toggle("shield", block > 0);
        },
      };
    }
    const chips = (node, o) => node.replaceChildren(...Object.keys(ST).filter((k) => o[k]).map((k) => {
      const c = el("span", `dk-st ${k}`);
      c.append(icon(ST[k][0]), el("span", "", o[k]));
      c.title = `${ST[k][1]}: ${o[k]}`;
      c.setAttribute("aria-label", `${ST[k][1]} ${o[k]}`);
      return c;
    }));
    const badge = (node, n) => { node.classList.toggle("on", n > 0); node.lastChild.textContent = n; };
    function fighter(spriteId, cls) {
      const box = el("div", cls);
      const body = el("span", "dk-body");
      const spr = el("span", "dk-spr");
      spr.append(sprite(spriteId));
      const blk = el("span", "dk-blk");
      blk.append(icon("shield"), el("span", "", "0"));
      body.append(spr, blk);
      const hp = hpBar();
      const st = el("span", "dk-stats");
      return { box, body, spr, blk, hp, st };
    }
    function startFight(list, kind) {
      const f = Deck.fight(s, list, lv, kind !== "fight");
      Object.assign(f, { kind, sel: -1, aim: -1, busy: false, over: false, taken: 0 });
      s.fight = f;
      s.scene = "fight";
      buildFight(f);
      const ev = Deck.startTurn(s, f);
      sync();
      animate(ev);
      banner(kind === "boss" ? "Smok" : kind === "elite" ? "Elita" : f.enemies.length > 1 ? "Zasadzka" : "Walka", kind === "fight" ? "" : "foe");
    }
    function buildFight(f) {
      const hero = fighter("hero", "dk-hero");
      hero.box.style.setProperty("--ec", "var(--p1)");
      hero.box.append(el("span", "dk-intent none"), hero.body, el("b", "dk-ename", "Ty"), hero.hp.el, hero.st);
      hero.hp.el.classList.add("mine");
      const foes = el("div", "dk-foes");
      const E = f.enemies.map((e, i) => {
        const v = fighter(e.id, `dk-enemy${e.boss ? " boss" : e.elite ? " elite" : ""}`);
        const b = button("", v.box.className, () => onEnemy(i));
        b.style.setProperty("--ec", `var(--${e.color})`);
        b.style.setProperty("--d", `${i * 120}ms`);
        b.addEventListener("pointerenter", () => { if (s.fight === f && f.sel >= 0 && e.hp > 0) { f.aim = i; sync(); } });
        v.intent = el("span", "dk-intent");
        b.append(v.intent, v.body, el("b", "dk-ename", e.name), v.hp.el, v.st);
        v.box = b;
        foes.append(b);
        return v;
      });
      const stage = el("div", "dk-stage");
      stage.append(hero.box, foes);
      const info = el("p", "dk-info");
      info.setAttribute("aria-live", "polite");
      const hand = el("div", "dk-hand");
      const orb = el("span", "dk-orb");
      orb.title = "Energia";
      const drawPile = el("span", "dk-pile draw");
      drawPile.title = "Karty do dobrania";
      const discPile = el("span", "dk-pile disc");
      discPile.title = "Odrzucone karty";
      const endBtn = button("Koniec tury", "btn dk-end", endTurn);
      const foot = el("div", "dk-foot");
      foot.append(orb, drawPile, endBtn, discPile);
      const fx = el("div", "dk-fx");
      const w = scene(`dk-s-fight ${f.kind}`, stage, info, hand, foot, fx);
      F = { w, hero, E, info, hand, orb, drawPile, discPile, endBtn, fx, cards: new Map(), stage };
    }
    // przelicznik obrażeń kart: siła i osłabienie gracza, podatność celu (gdy cel jest jasny)
    function modFor(f) {
      const live = Deck.alive(f);
      const tgt = f.aim >= 0 && f.enemies[f.aim]?.hp > 0 ? f.enemies[f.aim] : live.length === 1 ? live[0] : null;
      return (v) => Deck.dealt(f.me, v, tgt);
    }
    function sync() {
      const f = s.fight;
      if (!F || !f || s.scene !== "fight") return;
      const aiming = f.sel >= 0;
      F.hero.hp.set(s.hp, s.max, f.me.block);
      chips(F.hero.st, f.me);
      badge(F.hero.blk, f.me.block);
      f.enemies.forEach((e, i) => {
        const v = F.E[i];
        if (!v) return;
        const dead = e.hp <= 0;
        v.box.classList.toggle("dead", dead);
        v.box.classList.toggle("targetable", aiming && !dead);
        v.box.classList.toggle("aim", aiming && !dead && f.aim === i);
        v.box.disabled = dead;
        v.hp.set(e.hp, e.max, e.block);
        chips(v.st, e);
        badge(v.blk, e.block);
        const { kind } = Deck.intent(e);
        const [val, long] = intentInfo(e);
        v.intent.className = `dk-intent ${dead ? "none" : kind}`;
        v.intent.replaceChildren(icon(INTENT[kind]), el("span", "", val));
        v.box.setAttribute("aria-label", dead ? `${e.name}, pokonany` : `${e.name}, zdrowie ${e.hp} z ${e.max}${e.block ? `, blok ${e.block}` : ""}. Zamiar: ${long}.`);
      });
      syncHand(f);
      F.orb.textContent = f.energy;
      F.orb.classList.toggle("empty", f.energy === 0);
      F.drawPile.replaceChildren(icon("cards"), el("span", "", f.draw.length));
      F.discPile.replaceChildren(el("span", "", f.discard.length), icon("cards"));
      F.endBtn.disabled = f.busy;
      F.endBtn.classList.toggle("ready", !f.busy && !f.hand.some((_, k) => Deck.canPlay(f, k)));
      const selK = f.huid.indexOf(f.sel);
      F.info.replaceChildren();
      if (f.busy && !f.over) F.info.textContent = "Tura wrogów…";
      else if (selK >= 0) {
        F.info.append(el("b", "", `${card(f.hand[selK]).name}: `), Deck.plainText(f.hand[selK], modFor(f)), " ");
        F.info.append(el("span", "dk-ask", Deck.needsTarget(f.hand[selK]) && Deck.alive(f).length > 1 ? "Wybierz cel." : "Stuknij ponownie, aby zagrać."));
      } else if (!f.busy) F.info.textContent = f.hand.some((_, k) => Deck.canPlay(f, k)) ? `Tura ${f.turn}. ${touch ? "Stuknij kartę." : "Zagraj kartę albo zakończ turę."}` : `Tura ${f.turn}. Brak energii na kolejne karty.`;
      renderRun();
    }
    function syncHand(f) {
      const mod = modFor(f);
      const keep = new Set(f.huid);
      for (const [uid, c] of F.cards) if (!keep.has(uid)) { F.cards.delete(uid); c.remove(); }
      const before = new Map();
      if (!still()) for (const [uid, c] of F.cards) before.set(uid, c.getBoundingClientRect().left);
      const n = f.hand.length;
      F.hand.style.setProperty("--n", n);
      F.hand.style.setProperty("--n1", Math.max(1, n - 1));
      let fresh = 0;
      f.hand.forEach((id, k) => {
        const uid = f.huid[k];
        let c = F.cards.get(uid);
        if (!c) {
          c = cardEl(id, "", mod);
          c.onclick = () => onCard(uid);
          c.classList.add("drawn");
          c.style.setProperty("--d", `${fresh++ * 80}ms`);
          wait(() => c.classList.remove("drawn"), 900);
          F.cards.set(uid, c);
        } else {
          const drawn = c.classList.contains("drawn");
          fillCard(c, id, mod);
          if (drawn) c.classList.add("drawn");
        }
        c.classList.toggle("dim", !Deck.canPlay(f, k));
        c.classList.toggle("sel", f.sel === uid);
        c.classList.toggle("locked", f.busy);
        const off = k - (n - 1) / 2;
        c.style.setProperty("--r", `${off * Math.min(3, 14 / n)}deg`);
        c.style.setProperty("--y", `calc(var(--s) * ${(off * off * 0.035).toFixed(3)})`);
        if (k < 9) c.setAttribute("aria-keyshortcuts", String(k + 1));
        if (F.hand.children[k] !== c) F.hand.insertBefore(c, F.hand.children[k] || null);
      });
      // pozostałe karty płynnie przesuwają się na nowe miejsca
      for (const [uid, x0] of before) {
        const c = F.cards.get(uid);
        if (!c) continue;
        const dx = x0 - c.getBoundingClientRect().left;
        if (Math.abs(dx) > 1) c.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      }
    }
    // punkt na środku elementu w układzie warstwy efektów
    function center(node) {
      const box = F.w.getBoundingClientRect(), r = node.getBoundingClientRect();
      return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2, r];
    }
    // zagrana karta leci do celu (atak) albo do bohatera (umiejętność)
    function fly(node, r) {
      if (!node || still()) return;
      const [x0, y0] = center(node);
      const goal = r.c.type === "atak" ? (r.c.all ? F.stage.querySelector(".dk-foes") : F.E[r.target]?.body) : F.hero.body;
      if (!goal) return;
      const [x1, y1] = center(goal);
      const g = node.cloneNode(true);
      g.classList.remove("drawn", "sel", "dim", "locked");
      g.classList.add("ghost");
      g.removeAttribute("aria-label");
      g.style.left = `${x0}px`;
      g.style.top = `${y0}px`;
      F.fx.append(g);
      const dx = x1 - x0, dy = y1 - y0;
      g.animate([
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.35 - 30}px)) scale(1.08)`, opacity: 1, offset: 0.4 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25) rotate(${r.c.type === "atak" ? 25 : -10}deg)`, opacity: 0 },
      ], { duration: 360, easing: "cubic-bezier(0.5, 0, 0.6, 1)" }).onfinish = () => g.remove();
    }
    // ręka odjeżdża na stos odrzuconych
    function discardHand() {
      if (still()) return;
      const [x1, y1] = center(F.discPile);
      [...F.cards.values()].forEach((c, j) => {
        const [x0, y0] = center(c);
        const g = c.cloneNode(true);
        g.classList.remove("drawn", "sel", "dim", "locked");
        g.classList.add("ghost");
        g.style.left = `${x0}px`;
        g.style.top = `${y0}px`;
        F.fx.append(g);
        g.animate([
          { transform: "translate(-50%, -50%)", opacity: 1 },
          { transform: `translate(calc(-50% + ${x1 - x0}px), calc(-50% + ${y1 - y0}px)) scale(0.2) rotate(30deg)`, opacity: 0 },
        ], { duration: 320, delay: j * 45, easing: "cubic-bezier(0.5, 0, 0.75, 0)", fill: "backwards" }).onfinish = () => g.remove();
      });
    }
    function float(node, text, cls, ic) {
      if (!node || !F) return;
      const [x, y, r] = center(node);
      const p = el("span", `dk-float ${cls}`);
      if (ic) p.append(icon(ic));
      p.append(el("span", "", text));
      // kilka liczb naraz nad tą samą postacią układa się jedna nad drugą
      const n = (node.dkFloats = (node.dkFloats || 0) + 1);
      p.style.left = `${x + (Math.random() - 0.5) * r.width * 0.3}px`;
      p.style.top = `${y - r.height * (0.1 + 0.22 * (n - 1))}px`;
      F.fx.append(p);
      wait(() => { node.dkFloats--; }, 380);
      wait(() => p.remove(), 950);
    }
    function banner(text, cls = "") {
      if (!F) return;
      const b = el("div", `dk-banner ${cls}`);
      b.append(el("span", "", text));
      F.fx.querySelectorAll(".dk-banner").forEach((x) => x.remove());
      F.fx.append(b);
      wait(() => b.remove(), 1100);
    }
    // zdarzenia z logiki zamienione na efekty: liczby, drżenie, rozbłyski
    function animate(ev, delay = 0) {
      let at = delay;
      const who = (to) => (to === "me" ? F.hero : F.E[to]);
      for (const e of ev) {
        const v = e.to != null ? who(e.to) : null;
        if (e.t === "hit" || e.t === "poison" || e.t === "thorns") {
          wait(() => {
            if (!F || !v) return;
            if (e.blocked) { float(v.body, e.blocked, "blk", "shield"); flash(v.blk, "dk-clank", 320); }
            if (e.n || !e.blocked) float(v.body, `−${e.n}`, e.t === "poison" ? "psn" : e.t === "thorns" ? "thr" : "dmg");
            if (e.n) {
              flash(v.body, "dk-hit", 380);
              if (e.to === "me") { flash(F.w, "dk-hurt", 450); Sound.error(); } else Sound.erase();
            } else if (e.blocked) Sound.tap();
          }, at);
          at += 120;
        }
        if (e.t === "block") wait(() => { if (F && v) { float(v.body, `+${e.n}`, "blk", "shield"); flash(v.blk, "dk-clank", 320); } }, at);
        if (e.t === "status") wait(() => { if (F && v) float(v.body, `${ST[e.k][1]} ${e.n}`, `st ${e.k}`, ST[e.k][0]); }, at);
        if (e.t === "heal") wait(() => { if (F) { float(F.hero.body, `+${e.n}`, "heal", "heart"); flash(F.hero.body, "dk-glow", 500); } }, at);
        if (e.t === "energy") wait(() => F && flash(F.orb, "dk-boost", 400), at);
        if (e.t === "shuffle") wait(() => { if (F) { flash(F.drawPile, "dk-boost", 400); ctx.toast("Odrzucone karty wracają do talii"); } }, at);
        if (e.t === "die") wait(() => Sound.line(), at);
      }
    }
    function onCard(uid) {
      const f = s.fight;
      if (!f || f.busy || ctx.done || s.scene !== "fight") return;
      const k = f.huid.indexOf(uid);
      if (k < 0) return;
      if (f.sel === uid) {
        // drugie stuknięcie: zagraj (z celem, jeśli wybrany), w innym razie anuluj
        if (!Deck.needsTarget(f.hand[k]) || Deck.alive(f).length === 1) return tryPlay(k);
        if (f.aim >= 0 && f.enemies[f.aim].hp > 0) return tryPlay(k, f.aim);
        f.sel = -1;
        return sync();
      }
      tryPlay(k, undefined, touch);
    }
    function onEnemy(i) {
      const f = s.fight;
      if (!f || ctx.done || f.enemies[i].hp <= 0) return;
      const k = f.huid.indexOf(f.sel);
      if (k >= 0 && !f.busy) return tryPlay(k, i);
      ctx.toast(`${f.enemies[i].name} ${intentInfo(f.enemies[i])[1]}`);
    }
    // preview = najpierw pokaż opis (telefon); karta z jednym możliwym celem zagrywa się od razu
    function tryPlay(k, target, preview = false) {
      const f = s.fight;
      const id = f.hand[k], uid = f.huid[k];
      if (!Deck.canPlay(f, k)) {
        Sound.error();
        flash(F.cards.get(uid), "dk-no", 400);
        flash(F.orb, "dk-no", 400);
        return;
      }
      const choose = target == null && Deck.needsTarget(id) && Deck.alive(f).length > 1;
      if (preview || choose) {
        f.sel = uid;
        if (choose && !(f.aim >= 0 && f.enemies[f.aim].hp > 0)) f.aim = f.enemies.findIndex((e) => e.hp > 0);
        Sound.tap();
        return sync();
      }
      const node = F.cards.get(uid);
      const r = Deck.play(s, f, k, target);
      if (!r) return Sound.error();
      f.sel = -1;
      fly(node, r);
      F.cards.delete(uid);
      if (node) node.remove();
      Sound.place(r.c.type === "atak" ? 5 : 3);
      const total = r.ev.filter((e) => e.t === "hit").reduce((a, e) => a + e.n, 0);
      if (total >= 30) ctx.achieve("potezny-cios");
      sync();
      animate(r.ev, still() ? 0 : 260);
      checkEnd();
    }
    function endTurn() {
      const f = s.fight;
      if (!f || f.busy || ctx.done || s.scene !== "fight") return;
      f.busy = true;
      f.sel = -1;
      f.aim = -1;
      discardHand();
      Deck.endPlayerTurn(f);
      sync();
      banner("Tura wrogów", "foe");
      let delay = still() ? 300 : 800;
      f.enemies.forEach((e, i) => {
        if (e.hp <= 0) return;
        wait(() => {
          if (ctx.done || s.fight !== f || f.over) return;
          const hp0 = s.hp;
          const ev = Deck.enemyAct(s, f, i);
          f.taken += Math.max(0, hp0 - s.hp);
          const act = ev.find((x) => x.t === "act");
          if (act) flash(F.E[i].body, act.kind === "atk" ? "dk-lunge" : "dk-cast", 420);
          sync();
          animate(ev, act && act.kind === "atk" ? 160 : 0);
          checkEnd();
        }, delay);
        delay += 650;
      });
      wait(() => {
        if (ctx.done || s.fight !== f || f.over) return;
        const hp0 = s.hp;
        const ev = Deck.endRound(s, f);
        f.taken += Math.max(0, hp0 - s.hp);
        animate(ev);
        sync();
        if (checkEnd()) return;
        const ev2 = Deck.startTurn(s, f);
        f.busy = false;
        sync();
        animate(ev2);
        banner(`Tura ${f.turn}`, "me");
      }, delay + 150);
    }
    function checkEnd() {
      const f = s.fight, out = Deck.outcome(s, f);
      if (!out || f.over) return !!out;
      f.over = true;
      f.busy = true;
      if (out === "lose") {
        s.hp = 0;
        sync();
        F.hero.box.classList.add("dead");
        const foes = Deck.alive(f).map((e) => e.name).join(" i ");
        wait(() => ctx.lose("Porażka", `${foes} ${Deck.alive(f).length > 1 ? "okazali się silniejsi" : "okazał się silniejszy"}. Krok ${s.step + 1} z ${lv.len}.`), still() ? 0 : 900);
        return true;
      }
      s.kills += f.enemies.length;
      const boss = f.enemies.some((e) => e.boss);
      sync();
      banner(boss ? "Smok pokonany" : "Zwycięstwo", "win");
      if (f.kind === "elite" && f.taken === 0) ctx.achieve("bez-ran");
      wait(() => {
        if (ctx.done) return;
        if (boss) {
          if (s.hp <= 10) ctx.achieve("na-wlosku");
          if (s.deck.length <= 15) ctx.achieve("smukla-talia");
          if (lv.key === "hard" && s.hp * 2 >= s.max) ctx.achieve("pogromca-smokow");
          renderRun();
          return ctx.win(`Smok pokonany. Zdrowie ${s.hp} / ${s.max}, talia ${s.deck.length} kart.`);
        }
        if (s.relics.includes("vial")) s.hp = Math.min(s.max, s.hp + 6);
        const gold = f.big ? 35 + rnd(15) : 12 + rnd(10);
        s.gold += gold;
        let relic = null;
        if (f.big) { const left = Object.keys(RELICS).filter((r) => !s.relics.includes(r)); if (left.length) gainRelic((relic = pick(left))); }
        showReward(f, gold, relic);
      }, still() ? 200 : 1000);
      return true;
    }

    heldKeys(ctx, (k) => {
      if (ctx.done) return;
      if (s.scene === "fight") {
        const f = s.fight;
        if (f.busy) return;
        const selK = f.huid.indexOf(f.sel);
        if (/^[1-9]$/.test(k) && +k <= f.hand.length) {
          if (selK === +k - 1) { f.sel = -1; sync(); } else tryPlay(+k - 1);
        } else if (selK >= 0 && (k === "arrowleft" || k === "arrowright")) {
          const live = f.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0);
          const at = live.indexOf(f.aim);
          f.aim = live[(at + (k === "arrowright" ? 1 : live.length - 1)) % live.length];
          sync();
        } else if (selK >= 0 && (k === "enter" || k === " ")) tryPlay(selK, Deck.needsTarget(f.hand[selK]) ? f.aim : undefined);
        else if (k === "e" || k === "enter") endTurn();
        else if (k === "escape") { f.sel = -1; sync(); }
      } else if (s.scene === "map" && /^[1-3]$/.test(k)) {
        const o = s.map[s.step][+k - 1];
        if (o) enterNode(o);
      } else if (s.scene === "reward" && s.reward && /^[1-3]$/.test(k)) take(s.reward[+k - 1]);
    });
    showMap();
  },
});
