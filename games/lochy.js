// Lochy (roguelike): losowe piętra z pokojów i korytarzy, walka turowa, pole widzenia, przedmioty i rozwój postaci.
// Mapa MW × MH: t[i] = 0 ściana, 1 podłoga, 2 schody w dół. Każdy ruch gracza to jedna tura dla wszystkich potworów.
// Zasady działają od razu, a płynny ruch, światło i cząsteczki to tylko warstwa rysowania (obiekt v w mount).
const Dungeon = (() => {
  const MW = 44, MH = 28;
  const MONSTERS = [
    { id: "rat", name: "szczur", hp: 6, atk: 2, def: 0, xp: 3, color: "#a5673f", depth: 1 },
    { id: "bat", name: "nietoperz", hp: 5, atk: 3, def: 0, xp: 4, color: "#845ef7", depth: 1, erratic: true },
    { id: "goblin", name: "goblin", hp: 12, atk: 4, def: 1, xp: 8, color: "#40c057", depth: 2 },
    { id: "archer", name: "goblin łucznik", hp: 9, atk: 3, def: 0, xp: 8, color: "#94d82d", depth: 2, ranged: 5 },
    { id: "skeleton", name: "szkielet", hp: 16, atk: 6, def: 2, xp: 12, color: "#ced4da", depth: 3 },
    { id: "orc", name: "ork", hp: 24, atk: 7, def: 3, xp: 18, color: "#2b8a3e", depth: 3 },
    { id: "troll", name: "troll", hp: 40, atk: 9, def: 3, xp: 30, color: "#5c940d", depth: 4, regen: 1 },
    { id: "mimic", name: "mimik", hp: 20, atk: 6, def: 2, xp: 16, color: "#a0692f", depth: 99, still: true },
    { id: "dragon", name: "smok", hp: 90, atk: 13, def: 5, xp: 100, color: "#e03131", depth: 99, boss: true },
  ];
  const ITEMS = {
    potion: { name: "Mikstura zdrowia", color: "#e64980" },
    elixir: { name: "Eliksir siły", color: "#f59f00" },
    teleport: { name: "Zwój teleportacji", color: "#4dabf7" },
    fire: { name: "Zwój ognia", color: "#ff6b6b" },
    map: { name: "Zwój mapy", color: "#63e6be" },
    gold: { name: "złoto", color: "#fab005" },
    weapon: { name: "broń", color: "#adb5bd" },
    armor: { name: "zbroja", color: "#868e96" },
    amulet: { name: "Amulet Głębin", color: "#ffd43b" },
  };
  const WEAPONS = [["sztylet", 1], ["krótki miecz", 2], ["topór", 3], ["długi miecz", 4], ["młot bojowy", 6]];
  const ARMORS = [["skórzana kurtka", 1], ["kolczuga", 2], ["napierśnik", 3], ["zbroja płytowa", 5]];

  function generate(depth, last) {
    for (;;) {
      const t = new Uint8Array(MW * MH), rooms = [];
      for (let k = 0; k < 120 && rooms.length < 9; k++) {
        const w = 4 + rnd(7), h = 3 + rnd(5), x = 1 + rnd(MW - w - 2), y = 1 + rnd(MH - h - 2);
        if (rooms.some((r) => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
        for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) t[yy * MW + xx] = 1;
      }
      if (rooms.length < 6) continue;
      // korytarze w kształcie litery L między kolejnymi pokojami, plus jeden skrót
      const dig = (a, b) => {
        let { cx: x, cy: y } = a;
        const horizFirst = Math.random() < 0.5;
        const go = (tx, ty) => { while (x !== tx) { x += Math.sign(tx - x); t[y * MW + x] = t[y * MW + x] || 1; } while (y !== ty) { y += Math.sign(ty - y); t[y * MW + x] = t[y * MW + x] || 1; } };
        if (horizFirst) { go(b.cx, y); go(x, b.cy); } else { go(x, b.cy); go(b.cx, y); }
      };
      rooms.sort((a, b) => a.cx - b.cx);
      for (let k = 1; k < rooms.length; k++) dig(rooms[k - 1], rooms[k]);
      dig(rooms[0], rooms[rooms.length - 1]);
      const start = rooms[0], end = rooms[rooms.length - 1], goal = end.cy * MW + end.cx;
      if (!last) t[goal] = 2;
      // każde pole najwyżej jedna rzecz: potwór, przedmiot albo urządzenie
      const used = new Set([goal, goal - 1]);
      const free = () => {
        for (;;) {
          const r = rooms[1 + rnd(rooms.length - 1)];
          const i = (r.y + rnd(r.h)) * MW + r.x + rnd(r.w);
          if (t[i] === 1 && !used.has(i)) { used.add(i); return i; }
        }
      };
      const monsters = [], items = [], feats = [];
      const pool = MONSTERS.filter((m) => m.depth <= depth && !m.boss);
      for (let k = 0; k < 5 + depth * 2; k++) {
        const m = pick(pool.filter((x) => x.depth >= depth - 2));
        monsters.push({ ...m, i: free(), max: m.hp, awake: false });
      }
      const drops = ["potion", "potion", "gold", "gold", "gold", pick(["teleport", "fire", "map"]), pick(["weapon", "armor", "elixir", "potion"])];
      if (depth % 2 === 0) drops.push(pick(["weapon", "armor"]));
      for (const kind of drops) {
        const it = { kind, i: free() };
        if (kind === "gold") it.amount = 5 + rnd(10) * depth;
        if (kind === "weapon") { const [n, v] = WEAPONS[Math.min(WEAPONS.length - 1, depth - 1 + rnd(2))]; Object.assign(it, { label: n, value: v }); }
        if (kind === "armor") { const [n, v] = ARMORS[Math.min(ARMORS.length - 1, depth - 1 + rnd(2))]; Object.assign(it, { label: n, value: v }); }
        items.push(it);
      }
      // skrzynie (od drugiego piętra czasem mimik), fontanna, ołtarz i ukryte kolce
      for (let k = 0; k < 1 + (depth > 2); k++) feats.push({ kind: "chest", i: free(), mimic: depth >= 2 && Math.random() < 0.3 });
      feats.push({ kind: "fountain", i: free() });
      if (depth >= 2) feats.push({ kind: "altar", i: free() });
      for (let k = 0; k < depth + 1; k++) feats.push({ kind: "trap", i: free() });
      if (last) {
        const boss = MONSTERS.find((m) => m.boss);
        monsters.push({ ...boss, i: goal - 1, max: boss.hp, awake: false });
        items.push({ kind: "amulet", i: goal });
      }
      return { t, rooms, start: start.cy * MW + start.cx, monsters, items, feats };
    }
  }

  // pole widzenia: promienie od gracza, ściany zatrzymują wzrok
  function fov(t, from, radius) {
    const seen = new Set([from]);
    const fx = from % MW, fy = (from / MW) | 0;
    for (let a = 0; a < 360; a += 2) {
      const dx = Math.cos((a * Math.PI) / 180), dy = Math.sin((a * Math.PI) / 180);
      let x = fx + 0.5, y = fy + 0.5;
      for (let k = 0; k < radius; k++) {
        x += dx; y += dy;
        const i = (y | 0) * MW + (x | 0);
        if (x < 0 || y < 0 || x >= MW || y >= MH) break;
        seen.add(i);
        if (!t[i]) break;
      }
    }
    return seen;
  }
  const api = { MW, MH, MONSTERS, ITEMS, WEAPONS, ARMORS, generate, fov, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Dungeon;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "lochy"), {
  levels: [
    { key: "easy", name: "3 piętra", points: 20, depth: 3, hp: 34 },
    { key: "medium", name: "4 piętra", points: 50, depth: 4, hp: 30 },
    { key: "hard", name: "5 pięter", points: 100, depth: 5, hp: 26 },
  ],
  rules: [
    "Zejdź po schodach na najgłębsze piętro i zabierz Amulet Głębin strzeżony przez smoka. Każdy twój ruch to jedna tura dla potworów.",
    "Ruch: strzałki albo WASD (ukosy Q, E, Z, C), trzymany klawisz idzie dalej. Dotknięcie pola prowadzi tam bohatera. Wejście na potwora to atak, spacja to czekanie, M chowa mapę.",
    "Przedmioty podnosisz, wchodząc na nie, a używasz ich w plecaku (klawisze 1–9). Lepsza broń i zbroja zakładają się same.",
    "Skrzynie kryją łupy, ale czasem to mimik. Fontanna raz leczy do pełna, a ołtarz za złoto daje błogosławieństwo (Enter albo dotknięcie bohatera).",
    "Uważaj na ukryte kolce w podłodze i goblinów łuczników strzelających z daleka. Cios krytyczny zadaje podwójne obrażenia.",
  ],
  achievements: [
    { id: "bogacz", name: "Bogacz", desc: "Zbierz 100 sztuk złota w jednej wyprawie.", points: 10 },
    { id: "mimik", name: "Nie dam się", desc: "Pokonaj mimika udającego skrzynię.", points: 10 },
    { id: "smokobojca", name: "Smokobójca", desc: "Pokonaj smoka strzegącego amuletu.", points: 25 },
    { id: "pobozny", name: "Pobożny", desc: "Złóż trzy ofiary na ołtarzach w jednej wyprawie.", points: 25 },
    { id: "weteran", name: "Weteran głębin", desc: "Zdobądź amulet z 5 pięter, mając co najmniej połowę zdrowia.", points: 50 },
  ],
  mount(board, ctx) {
    const { MW, MH, ITEMS, MONSTERS } = Dungeon;
    const VW = 15, VH = 12, S = 10, W = VW * S, H = VH * S;
    const cv = canvasGame(board, ctx, W, H, { max: 90, cls: "space" });
    const { g, theme } = cv;
    const s = {
      depth: 1, map: null, seen: new Set(), known: new Set(), pos: 0, hp: ctx.level.hp, max: ctx.level.hp, atk: 3, def: 0,
      lvl: 1, xp: 0, gold: 0, weapon: ["pięści", 0], armor: ["ubranie", 0], bag: [], turn: 0, dead: false,
      path: [], alert: false, foes: 0, offers: 0, cost: 30, killer: "",
    };
    Dungeon.last = s;
    // stan animacji, bez wpływu na zasady
    const v = {
      camX: 0, camY: 0, rx: 0, ry: 0, face: 1, lunge: null, flash: 0, shake: 0, fade: 0, banner: "", bannerT: 0, lvlT: 0, deadT: 0,
      hold: 0, step: 0, mini: true, parts: [], texts: [], shots: [], corpses: [], light: new Float32Array(MW * MH),
    };
    const dark = el("canvas");
    dark.width = MW;
    dark.height = MH;
    const dg = dark.getContext("2d"), dimg = dg.createImageData(MW, MH);

    // panel: bohater, plecak, dziennik
    const lvlEl = el("strong"), floorEl = el("span");
    const head = el("div", "rl-head");
    head.append(lvlEl, floorEl);
    const meter = (label, cls) => {
      const row = el("div", "rl-row"), val = el("span"), m = el("div", `meter ${cls}`), fill = el("span");
      row.append(el("span", "", label), val);
      m.append(fill);
      return { nodes: [row, m], val, fill, m };
    };
    const hpM = meter("Zdrowie", "rl-hp"), xpM = meter("Doświadczenie", "rl-xp");
    const dl = el("dl", "ui-stats"), stat = {};
    for (const n of ["Atak", "Obrona", "Złoto"]) {
      const row = el("div");
      stat[n] = el("dd", "", "0");
      row.append(el("dt", "", n), stat[n]);
      dl.append(row);
    }
    const gear = el("p", "panel-note"), actionEl = el("div", "rl-action"), bagEl = el("div", "rl-bag");
    ctx.panel.append(panelBlock("Bohater", head, ...hpM.nodes, ...xpM.nodes, dl, gear, actionEl), panelBlock("Plecak", bagEl));
    const log = logBlock(ctx, "Dziennik", { max: 5 });
    const say = (text, tone = "") => log.add(text, tone);

    const xy = (i) => [i % MW, (i / MW) | 0];
    const cheb = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };
    const cap = (t) => t[0].toUpperCase() + t.slice(1);
    const xpNeed = () => 10 + s.lvl * 12;
    const monsterAt = (i) => s.map.monsters.find((m) => m.i === i && m.hp > 0);
    const featAt = (i) => s.map.feats.find((f) => f.i === i);
    const roll = (atk, def) => Math.max(1, atk + rnd(3) - def);
    const visibleFoes = () => s.map.monsters.filter((m) => m.hp > 0 && s.seen.has(m.i)).length;
    const float = (i, text, color, big = false) => { const [x, y] = xy(i); v.texts.push({ x: x + 0.5, y, text, color, big, t: 0.9 }); };
    // cząsteczki w jednostkach pola: prędkość w polach na sekundę
    function burst(i, color, n, { speed = 2.6, grav = 6, life = 0.55, size = 0.13, up = 1.2 } = {}) {
      const [x, y] = xy(i);
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, sp = speed * (0.35 + Math.random() * 0.65), l = life * (0.6 + Math.random() * 0.6);
        v.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, grav, life: l, max: l, color, size: size * (0.6 + Math.random() * 0.8) });
      }
    }

    function enter(depth) {
      const last = depth === ctx.level.depth;
      s.depth = depth;
      s.map = Dungeon.generate(depth, last);
      s.pos = s.map.start;
      s.path = [];
      s.known = new Set();
      for (const m of s.map.monsters) { [m.rx, m.ry] = xy(m.i); m.dhp = m.hp; }
      [v.rx, v.ry] = xy(s.pos);
      v.camX = v.rx;
      v.camY = v.ry;
      v.light.fill(0);
      v.parts = []; v.texts = []; v.shots = []; v.corpses = [];
      v.fade = 1;
      v.banner = last ? `Piętro ${depth} · leże smoka` : `Piętro ${depth}`;
      v.bannerT = 2.2;
      look();
      s.foes = visibleFoes();
      say(last ? `Piętro ${depth}. Czujesz gorący oddech smoka…` : `Schodzisz na piętro ${depth}.`, "warn");
      render();
    }
    function look() {
      s.seen = Dungeon.fov(s.map.t, s.pos, 8);
      s.seen.forEach((i) => s.known.add(i));
    }

    function hurt(dmg, by) {
      s.hp -= dmg;
      s.killer = by;
      s.path = [];
      v.flash = 0.3;
      v.shake = Math.min(0.55, Math.max(v.shake, 0.15 + dmg * 0.03));
      float(s.pos, `-${dmg}`, "#ff8787");
      burst(s.pos, "#c92a2a", 6);
      Sound.error();
    }
    function gainXp(n) {
      s.xp += n;
      while (s.xp >= xpNeed()) {
        s.xp -= xpNeed();
        s.lvl++;
        s.max += 6;
        s.hp = s.max;
        s.atk += 1;
        v.lvlT = 0.9;
        burst(s.pos, "#ffd43b", 22, { speed: 3.4, grav: -1, life: 0.9, up: 0.6 });
        float(s.pos, `Poziom ${s.lvl}`, "#ffd43b", true);
        say(`Nowy poziom ${s.lvl}. Więcej zdrowia i siły.`, "ok");
        Sound.line();
      }
    }
    function kill(m, how) {
      m.hp = 0;
      v.corpses.push({ m, t: 0.5 });
      burst(m.i, m.color, m.boss ? 40 : 14, { speed: m.boss ? 4.5 : 3.2 });
      say(`${how}: ${m.name}. +${m.xp} doświadczenia.`, "ok");
      if (m.boss) { ctx.achieve("smokobojca"); v.shake = 0.6; }
      if (m.id === "mimic") ctx.achieve("mimik");
      if (m.id === "mimic" || Math.random() < 0.25) s.map.items.push({ kind: "gold", i: m.i, amount: 3 + rnd(8) * s.depth });
      gainXp(m.xp);
    }
    function hit(m) {
      const crit = Math.random() < 0.12;
      const dmg = roll(s.atk + s.weapon[1], m.def) * (crit ? 2 : 1);
      const [mx, my] = xy(m.i), [px, py] = xy(s.pos);
      m.hp -= dmg;
      m.awake = true;
      m.flash = 0.22;
      v.lunge = { dx: mx - px, dy: my - py, t: 0.18 };
      if (mx !== px) v.face = Math.sign(mx - px);
      float(m.i, crit ? `${dmg}!` : `-${dmg}`, crit ? "#ffd43b" : "#ffffff", crit);
      burst(m.i, m.color, crit ? 12 : 6);
      if (crit) v.shake = Math.max(v.shake, 0.2);
      Sound.place(crit ? 7 : 4);
      if (m.hp <= 0) kill(m, crit ? "Cios krytyczny" : "Pokonujesz");
      else say(crit ? `Cios krytyczny: ${m.name} (${dmg}).` : `Trafiasz: ${m.name} (${dmg}).`);
    }
    function pickUp() {
      for (const it of s.map.items.filter((x) => x.i === s.pos)) {
        s.map.items = s.map.items.filter((x) => x !== it);
        if (it.kind === "gold") {
          s.gold += it.amount;
          if (s.gold >= 100) ctx.achieve("bogacz");
          say(`Zbierasz ${it.amount} sztuk złota.`);
          float(s.pos, `+${it.amount} zł`, "#ffd43b");
          burst(s.pos, "#ffd43b", 8, { speed: 1.6, grav: 3, up: 1.8 });
          Sound.place(7);
          continue;
        }
        if (it.kind === "amulet") {
          if (ctx.level.key === "hard" && s.hp * 2 >= s.max) ctx.achieve("weteran");
          s.bag.push(it);
          say("Masz Amulet Głębin.", "ok");
          burst(s.pos, "#ffd43b", 50, { speed: 5, grav: -0.5, life: 1.2 });
          render();
          return ctx.win(`Poziom postaci ${s.lvl}, złoto ${s.gold}, tury ${s.turn}.`);
        }
        if (it.kind === "weapon" && it.value > s.weapon[1]) { s.weapon = [it.label, it.value]; say(`Bierzesz do ręki: ${it.label} (+${it.value} ataku).`, "ok"); float(s.pos, `+${it.value} atak`, "#e9ecef"); Sound.flag(); continue; }
        if (it.kind === "armor" && it.value > s.armor[1]) { s.armor = [it.label, it.value]; say(`Zakładasz: ${it.label} (+${it.value} obrony).`, "ok"); float(s.pos, `+${it.value} obrona`, "#e9ecef"); Sound.flag(); continue; }
        if (it.kind === "weapon" || it.kind === "armor") { s.gold += 5 * it.value; say(`${cap(it.label)}: gorsze od twojego, sprzedajesz za ${5 * it.value} złota.`); continue; }
        s.bag.push(it);
        say(`Podnosisz: ${ITEMS[it.kind].name.toLowerCase()}.`);
        Sound.tap();
      }
    }
    // wejście na urządzenie: skrzynia, fontanna, ołtarz, pułapka
    function touch(f) {
      if (f.kind === "trap") {
        const dmg = 2 + s.depth * 2;
        f.seen = true;
        f.t = 0.5;
        hurt(dmg, "kolce");
        say(`Kolce wysuwają się z podłogi (${dmg}).`, "bad");
      } else if (f.kind === "chest" && !f.open) {
        f.open = true;
        f.t = 0.4;
        s.map.items.push({ kind: "gold", i: f.i, amount: 8 + rnd(8) * s.depth }, { kind: pick(["potion", "potion", "fire", "teleport", "map", "elixir"]), i: f.i });
        burst(f.i, "#ffd43b", 16, { speed: 2, grav: 2, up: 2.4 });
        say("Otwierasz skrzynię.", "ok");
        Sound.flag();
      } else if (f.kind === "fountain" && !f.used) {
        if (s.hp >= s.max) return say("Fontanna szumi. Wróć tu, gdy będziesz ranny.");
        float(s.pos, `+${s.max - s.hp}`, "#69db7c");
        s.hp = s.max;
        f.used = true;
        burst(f.i, "#74c0fc", 22, { speed: 1.6, grav: 4, up: 3 });
        say("Woda z fontanny leczy wszystkie rany.", "ok");
        Sound.line();
      } else if (f.kind === "altar") say(`Ołtarz. Ofiara ${s.cost} złota daje błogosławieństwo.`, "warn");
    }
    function wakeMimic(f) {
      const base = MONSTERS.find((m) => m.id === "mimic"), hp = base.hp + s.depth * 3;
      const [x, y] = xy(f.i);
      s.map.feats = s.map.feats.filter((q) => q !== f);
      s.map.monsters.push({ ...base, i: f.i, hp, max: hp, dhp: hp, awake: true, rx: x, ry: y, flash: 0.3 });
      v.shake = 0.35;
      float(f.i, "!", "#ff6b6b", true);
      say("Skrzynia ożywa. To mimik.", "bad");
      Sound.error();
    }
    function offer() {
      if (ctx.done || s.dead || featAt(s.pos)?.kind !== "altar") return;
      if (s.gold < s.cost) { ctx.toast(`Ofiara kosztuje ${s.cost} złota`); return Sound.error(); }
      s.gold -= s.cost;
      s.cost += 20;
      s.offers++;
      const k = rnd(3);
      if (k === 0) { s.atk += 2; say("Błogosławieństwo siły: +2 ataku.", "ok"); float(s.pos, "+2 atak", "#ffd43b", true); }
      if (k === 1) { s.def += 1; say("Błogosławieństwo tarczy: +1 obrony.", "ok"); float(s.pos, "+1 obrona", "#ffd43b", true); }
      if (k === 2) { s.max += 8; s.hp += 8; say("Błogosławieństwo życia: +8 zdrowia.", "ok"); float(s.pos, "+8 zdrowia", "#ffd43b", true); }
      if (s.offers >= 3) ctx.achieve("pobozny");
      v.lvlT = 0.9;
      burst(s.pos, "#ffe066", 26, { speed: 1.4, grav: -3, life: 1, up: 0.5 });
      Sound.line();
      render();
    }
    function use(kind) {
      if (ctx.done || s.dead) return;
      const k = s.bag.findIndex((it) => it.kind === kind);
      if (k < 0 || kind === "amulet") return;
      s.bag.splice(k, 1);
      s.path = [];
      if (kind === "potion") {
        const h = Math.min(s.max - s.hp, 14 + s.depth * 2);
        s.hp += h;
        float(s.pos, `+${h}`, "#69db7c");
        burst(s.pos, "#f783ac", 14, { speed: 1, grav: -2.5, life: 0.8, up: 0.4 });
        say(`Pijesz miksturę: +${h} zdrowia.`, "ok");
      }
      if (kind === "elixir") {
        s.atk += 2; s.max += 4; s.hp += 4;
        float(s.pos, "+2 atak", "#ffc078", true);
        burst(s.pos, "#ffa94d", 18, { speed: 1.4, grav: -2.5, life: 0.8, up: 0.4 });
        say("Eliksir siły: +2 ataku, +4 zdrowia na stałe.", "ok");
      }
      if (kind === "teleport") {
        const floor = [...s.map.t.keys()].filter((i) => s.map.t[i] === 1 && !monsterAt(i) && !featAt(i));
        burst(s.pos, "#74c0fc", 20, { speed: 2.4, grav: 0, life: 0.6, up: 0 });
        s.pos = pick(floor);
        [v.rx, v.ry] = xy(s.pos);
        v.fade = 0.5;
        burst(s.pos, "#74c0fc", 20, { speed: 2.4, grav: 0, life: 0.6, up: 0 });
        say("Zwój teleportacji przenosi cię w nieznane.", "warn");
      }
      if (kind === "fire") {
        look();
        const hitList = s.map.monsters.filter((m) => m.hp > 0 && s.seen.has(m.i));
        burst(s.pos, "#ff922b", 30, { speed: 4, grav: -1, life: 0.7, up: 0 });
        v.shake = 0.35;
        for (const m of hitList) {
          const dmg = 12 + s.depth * 2;
          m.hp -= dmg;
          m.awake = true;
          m.flash = 0.3;
          float(m.i, `-${dmg}`, "#ffa94d", true);
          burst(m.i, "#ff922b", 18, { speed: 2, grav: -3, life: 0.8, up: 0.5 });
          if (m.hp <= 0) kill(m, "Ogień pochłania");
        }
        if (!hitList.length) say("Płomienie trafiają w pustkę.");
      }
      if (kind === "map") {
        s.map.t.forEach((tile, i) => {
          if (!tile) return;
          for (let dy = -MW; dy <= MW; dy += MW) for (let dx = -1; dx <= 1; dx++) if (i + dy + dx >= 0 && i + dy + dx < MW * MH) s.known.add(i + dy + dx);
        });
        say("Zwój mapy odsłania całe piętro.", "warn");
      }
      Sound.place(8);
      endTurn();
    }
    function act(dx, dy) {
      if (ctx.done || s.dead) return;
      if (dx) v.face = Math.sign(dx);
      const [px, py] = xy(s.pos), x = px + dx, y = py + dy, i = y * MW + x;
      if (dx || dy) {
        if (x < 0 || y < 0 || x >= MW || y >= MH || !s.map.t[i]) { s.path = []; v.lunge = { dx: dx * 0.3, dy: dy * 0.3, t: 0.12 }; return Sound.tap(); }
        const m = monsterAt(i), f = featAt(i);
        if (m) hit(m);
        else if (f?.kind === "chest" && f.mimic) wakeMimic(f);
        else {
          s.pos = i;
          if (f) touch(f);
          pickUp();
          if (ctx.done) return;
          if (s.map.t[i] === 2) say("Schody w dół. Enter albo dotknięcie bohatera: zejście.", "warn");
        }
      } else if (!visibleFoes()) s.hp = Math.min(s.max, s.hp + 1);
      endTurn();
    }
    function descend() {
      if (ctx.done || s.dead || s.map.t[s.pos] !== 2) return;
      Sound.line();
      enter(s.depth + 1);
    }
    // Enter albo dotknięcie bohatera: schody, ołtarz, inaczej czekanie
    function interact() {
      if (s.map.t[s.pos] === 2) descend();
      else if (featAt(s.pos)?.kind === "altar") offer();
      else act(0, 0);
    }
    function endTurn() {
      s.turn++;
      if (s.turn % 6 === 0) s.hp = Math.min(s.max, s.hp + 1);
      look();
      const [px, py] = xy(s.pos);
      for (const m of s.map.monsters) {
        if (m.hp <= 0) continue;
        if (m.regen) m.hp = Math.min(m.max, m.hp + m.regen);
        if (s.seen.has(m.i) && !m.awake) { m.awake = true; float(m.i, "!", "#ffd43b"); }
        if (!m.awake) continue;
        const [mx, my] = xy(m.i), d = Math.max(Math.abs(mx - px), Math.abs(my - py));
        if (d === 1) {
          if (m.erratic && Math.random() < 0.4) continue;
          m.lunge = { dx: px - mx, dy: py - my, t: 0.18 };
          if (Math.random() < 0.08) { float(s.pos, "unik", "#adb5bd"); say(`${cap(m.name)} chybia.`); continue; }
          const dmg = roll(m.atk, s.def + s.armor[1]);
          hurt(dmg, m.name);
          say(`${cap(m.name)} trafia cię (${dmg}).`, "bad");
          continue;
        }
        if (m.ranged && d <= m.ranged && s.seen.has(m.i) && Math.random() < 0.6) {
          v.shots.push({ x0: mx, y0: my, x1: px, y1: py, t: 0 });
          const dmg = roll(m.atk, s.def + s.armor[1]);
          hurt(dmg, m.name);
          say(`${cap(m.name)} trafia cię strzałą (${dmg}).`, "bad");
          continue;
        }
        if (m.still) continue;
        // krok w stronę gracza, z alternatywą, gdy droga zajęta
        const steps = [[Math.sign(px - mx), Math.sign(py - my)], [Math.sign(px - mx), 0], [0, Math.sign(py - my)]];
        if (m.erratic && Math.random() < 0.5) steps.unshift([rnd(3) - 1, rnd(3) - 1]);
        for (const [sx, sy] of steps) {
          const ni = (my + sy) * MW + mx + sx;
          if ((sx || sy) && s.map.t[ni] && !monsterAt(ni) && ni !== s.pos && !(featAt(ni)?.mimic)) { m.i = ni; break; }
        }
      }
      for (const f of s.map.feats) {
        if (f.kind === "trap" && !f.seen && cheb(f.i, s.pos) === 1 && Math.random() < 0.35) { f.seen = true; float(f.i, "?", "#ffd43b"); say("Dostrzegasz pułapkę w podłodze.", "warn"); }
      }
      // nowy wróg w polu widzenia przerywa marsz i trzymany klawisz
      const foes = visibleFoes();
      if (foes > s.foes) { s.alert = true; s.path = []; }
      s.foes = foes;
      if (s.hp <= 0) {
        s.hp = 0;
        s.dead = true;
        render();
        return ctx.lose("Polegasz w lochach", `Piętro ${s.depth}, poziom postaci ${s.lvl}. Zabójca: ${s.killer}.`);
      }
      render();
    }

    // droga do wskazanego pola po znanych płytkach, z ominięciem widocznych wrogów i znanych pułapek
    function route(to) {
      const prev = new Map([[s.pos, -1]]), q = [s.pos];
      for (let k = 0; k < q.length && !prev.has(to); k++) {
        const [cx, cy] = xy(q[k]);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = cx + dx, y = cy + dy, n = y * MW + x;
          if (x < 0 || y < 0 || x >= MW || y >= MH || prev.has(n) || !s.map.t[n] || !s.known.has(n)) continue;
          const f = featAt(n);
          if (n !== to && ((monsterAt(n) && s.seen.has(n)) || (f?.kind === "trap" && f.seen))) continue;
          prev.set(n, q[k]);
          q.push(n);
        }
      }
      if (!prev.has(to)) return [];
      const path = [];
      for (let c = to; c !== s.pos; c = prev.get(c)) path.unshift(c);
      return path;
    }
    function travel() {
      const next = s.path.shift();
      const [px, py] = xy(s.pos), [nx, ny] = xy(next);
      if (Math.max(Math.abs(nx - px), Math.abs(ny - py)) !== 1 || (monsterAt(next) && s.path.length)) { s.path = []; return; }
      act(nx - px, ny - py);
    }

    const DIRS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1] };
    const keys = heldKeys(ctx, (k) => {
      s.path = [];
      if (DIRS[k]) { s.alert = false; v.hold = 0.26; act(...DIRS[k]); }
      else if (k === " " || k === ".") act(0, 0);
      else if (k === "enter" || k === ">") interact();
      else if (k === "m") v.mini = !v.mini;
      else if (/^[1-9]$/.test(k)) { const kinds = bagKinds(); if (kinds[+k - 1]) use(kinds[+k - 1][0]); }
    });
    ctx.on(cv.cv, "pointerdown", (e) => {
      e.preventDefault();
      if (ctx.done || s.dead) return;
      const [x, y] = cv.at(e);
      const tx = Math.floor(x / S + v.camX + 0.5 - VW / 2), ty = Math.floor(y / S + v.camY + 0.5 - VH / 2), i = ty * MW + tx;
      const [px, py] = xy(s.pos), dx = tx - px, dy = ty - py;
      s.path = [];
      s.alert = false;
      if (!dx && !dy) return interact();
      if (Math.max(Math.abs(dx), Math.abs(dy)) === 1) return act(dx, dy);
      if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && s.known.has(i) && s.map.t[i]) {
        s.path = route(i);
        v.step = 0;
        if (s.path.length) return;
      }
      const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
      const dirs = { 0: [1, 0], 1: [1, 1], 2: [0, 1], 3: [-1, 1], 4: [-1, 0], "-4": [-1, 0], "-3": [-1, -1], "-2": [0, -1], "-1": [1, -1] };
      act(...dirs[oct]);
    });

    // --- rysowanie ---
    const hash = (i) => (Math.imul(i + s.depth * 7919, 2654435761) >>> 16) & 1023;
    const ease = (k) => 1 - Math.exp(-k);
    const blob = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    const eyes = (x, y, dx, col = "#ffffff", r = 0.6) => { g.fillStyle = col; g.beginPath(); g.arc(x - dx, y, r, 0, 7); g.arc(x + dx, y, r, 0, 7); g.fill(); };
    const shadow = (x, y, r) => blob(x, y, r, r * 0.32, "rgba(0,0,0,0.38)");
    let torches = [];

    function tile(i, x, y, t) {
      const X = x * S, Y = y * S, T = s.map.t, h = hash(i);
      if (!T[i]) {
        if (y + 1 < MH && T[i + MW]) {
          // ściana widziana z przodu: górna krawędź i cegły
          g.fillStyle = "#3d352e"; g.fillRect(X, Y, S, 3);
          g.fillStyle = "#6e5f50"; g.fillRect(X, Y + 3, S, 7);
          g.fillStyle = "rgba(255,225,180,0.14)"; g.fillRect(X, Y + 3, S, 0.5);
          g.fillStyle = "rgba(0,0,0,0.3)";
          g.fillRect(X, Y + 6.4, S, 0.45);
          g.fillRect(X, Y + 9.6, S, 0.4);
          const o = (x % 2) * 5;
          g.fillRect(X + ((2 + o) % S), Y + 3, 0.45, 3.4);
          g.fillRect(X + ((7 + o) % S), Y + 6.4, 0.45, 3.2);
          if (h % 4 === 0) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(X + 1, Y + 7, 3, 1.6); }
          if (h % 9 === 0) torches.push([X + S / 2, Y + 5.6, h]);
        } else {
          g.fillStyle = "#2a2521"; g.fillRect(X, Y, S, S);
          g.fillStyle = "#4b4138";
          if (x > 0 && T[i - 1]) g.fillRect(X, Y, 0.7, S);
          if (x + 1 < MW && T[i + 1]) g.fillRect(X + S - 0.7, Y, 0.7, S);
          if (y > 0 && T[i - MW]) g.fillRect(X, Y, S, 0.7);
        }
        return;
      }
      g.fillStyle = ["#3a3e4a", "#363a45", "#3d414e", "#383c48"][h & 3];
      g.fillRect(X, Y, S, S);
      g.fillStyle = "rgba(255,255,255,0.045)"; g.fillRect(X, Y, S, 0.45);
      g.fillStyle = "rgba(0,0,0,0.24)"; g.fillRect(X, Y + S - 0.45, S, 0.45); g.fillRect(X + S - 0.45, Y, 0.45, S);
      if (h % 29 === 0) {
        g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 0.35;
        g.beginPath(); g.moveTo(X + 2, Y + 3); g.lineTo(X + 4.5, Y + 5); g.lineTo(X + 4, Y + 7.5); g.stroke();
      } else if (h % 17 === 5) {
        blob(X + 3, Y + 7, 1.6, 0.9, "rgba(100,150,80,0.32)"); blob(X + 4.6, Y + 7.6, 1, 0.6, "rgba(100,150,80,0.26)");
      } else if (h % 19 === 7) {
        blob(X + 6.5, Y + 6, 0.7, 0.5, "#555a66"); blob(X + 7.6, Y + 6.6, 0.45, 0.35, "#4c505b");
      }
      // cień rzucany przez ścianę powyżej
      if (y > 0 && !T[i - MW]) { g.fillStyle = "rgba(0,0,0,0.32)"; g.fillRect(X, Y, S, 1.3); g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(X, Y + 1.3, S, 1.6); }
      if (T[i] === 2) {
        g.fillStyle = "#0d0e12";
        g.beginPath(); g.roundRect(X + 1, Y + 1, 8, 8, 1.2); g.fill();
        for (let k = 0; k < 4; k++) {
          g.fillStyle = `rgba(214,184,132,${0.85 - k * 0.2})`;
          g.fillRect(X + 1.6 + k * 0.7, Y + 1.6 + k * 1.8, 6.8 - k * 1.4, 1.1);
        }
        g.strokeStyle = `rgba(255,212,59,${0.35 + 0.25 * Math.sin(t * 3)})`;
        g.lineWidth = 0.5;
        g.beginPath(); g.roundRect(X + 0.8, Y + 0.8, 8.4, 8.4, 1.4); g.stroke();
      }
    }
    function torch(X, Y, t, h) {
      g.fillStyle = "#3b2f25"; g.fillRect(X - 0.45, Y - 0.2, 0.9, 2.6);
      g.fillStyle = "#7a6048"; g.fillRect(X - 0.9, Y - 0.5, 1.8, 0.7);
      const f = Math.sin(t * 11 + h) * 0.3 + Math.sin(t * 27 + h * 2) * 0.18;
      const flame = (w, top, col) => {
        g.fillStyle = col;
        g.beginPath(); g.moveTo(X, Y - top - f);
        g.quadraticCurveTo(X + w, Y - 1.4, X, Y - 0.4);
        g.quadraticCurveTo(X - w, Y - 1.4, X, Y - top - f);
        g.fill();
      };
      flame(1.3, 3.4, "#ff922b");
      flame(0.7, 2.4, "#ffe066");
    }
    function feature(f, t) {
      const [x, y] = xy(f.i), X = x * S + S / 2, Y = y * S + S / 2;
      if (f.kind === "trap") {
        if (!f.seen) return;
        g.fillStyle = "#2c2f37"; g.beginPath(); g.roundRect(X - 3.2, Y - 3.2, 6.4, 6.4, 0.8); g.fill();
        const up = f.t > 0 ? 1 : 0.45;
        g.fillStyle = "#ced4da";
        for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
          const sx = X + c * 2, sy = Y + r * 2 + 0.7;
          g.beginPath(); g.moveTo(sx - 0.55, sy); g.lineTo(sx, sy - 1.9 * up); g.lineTo(sx + 0.55, sy); g.fill();
        }
      } else if (f.kind === "chest") {
        shadow(X, Y + 3.3, 3.8);
        // mimik oddycha: uważny gracz to zauważy
        const br = f.mimic ? Math.sin(t * 2.2) * 0.25 : 0;
        g.fillStyle = "#7a4a22"; g.fillRect(X - 3.4, Y - 0.8 + br, 6.8, 3.9 - br);
        if (f.open) {
          g.fillStyle = "#2b1a0c"; g.fillRect(X - 3, Y - 1.4, 6, 1.2);
          g.fillStyle = "#a0692f"; g.beginPath(); g.moveTo(X - 3.4, Y - 1.2); g.lineTo(X + 3.4, Y - 1.2); g.lineTo(X + 3, Y - 4.2); g.lineTo(X - 3, Y - 4.2); g.fill();
        } else {
          g.fillStyle = "#a0692f"; g.beginPath(); g.roundRect(X - 3.4, Y - 3.2 + br, 6.8, 2.6, [1.4, 1.4, 0, 0]); g.fill();
          g.fillStyle = "#e0b04a"; g.fillRect(X - 2.4, Y - 3.2 + br, 0.7, 6.3 - br); g.fillRect(X + 1.7, Y - 3.2 + br, 0.7, 6.3 - br);
          g.fillStyle = "#ffd43b"; g.fillRect(X - 0.7, Y - 1.2 + br, 1.4, 1.5);
          if ((t * 0.6 + f.i * 0.13) % 3 < 0.25) sparkle(X + 2.6, Y - 3, 1);
        }
      } else if (f.kind === "fountain") {
        shadow(X, Y + 3.2, 4);
        blob(X, Y + 0.8, 4, 2.9, "#868e96");
        blob(X, Y + 0.6, 3.2, 2.2, f.used ? "#1f3a52" : "#228be6");
        if (!f.used) {
          g.lineWidth = 0.3;
          for (let k = 0; k < 2; k++) {
            const p = (t * 0.7 + k * 0.5) % 1;
            g.strokeStyle = `rgba(255,255,255,${(1 - p) * 0.6})`;
            g.beginPath(); g.ellipse(X, Y + 0.6, 0.4 + p * 2.6, (0.4 + p * 2.6) * 0.65, 0, 0, 7); g.stroke();
          }
        }
        g.fillStyle = "#adb5bd"; g.fillRect(X - 0.5, Y - 2.6, 1, 3);
        blob(X, Y - 2.8, 1.1, 0.5, "#ced4da");
      } else if (f.kind === "altar") {
        shadow(X, Y + 3.4, 3.8);
        g.fillStyle = "#5c5f6b"; g.fillRect(X - 2.6, Y - 1, 5.2, 4.2);
        g.fillStyle = "#8f939e"; g.beginPath(); g.roundRect(X - 3.6, Y - 2.4, 7.2, 1.8, 0.5); g.fill();
        const glow = 0.45 + 0.3 * Math.sin(t * 2.4) + (s.gold >= s.cost ? 0.25 : 0);
        g.strokeStyle = `rgba(255,212,59,${Math.min(1, glow)})`; g.lineWidth = 0.4;
        g.beginPath(); g.arc(X, Y + 1.1, 1.2, 0, 7); g.moveTo(X, Y - 0.4); g.lineTo(X, Y + 2.6); g.stroke();
        blob(X, Y - 2.9, 0.7, 0.9, `rgba(255,224,102,${Math.min(1, glow)})`);
      }
    }
    function sparkle(x, y, a) {
      g.fillStyle = `rgba(255,255,255,${a})`;
      g.beginPath();
      g.moveTo(x, y - 1.2); g.lineTo(x + 0.25, y - 0.25); g.lineTo(x + 1.2, y); g.lineTo(x + 0.25, y + 0.25);
      g.lineTo(x, y + 1.2); g.lineTo(x - 0.25, y + 0.25); g.lineTo(x - 1.2, y); g.lineTo(x - 0.25, y - 0.25);
      g.fill();
    }
    function item(it, t) {
      const [x, y] = xy(it.i), c = ITEMS[it.kind].color, bob = Math.sin(t * 2.6 + it.i) * 0.5;
      const X = x * S + S / 2, Y = y * S + S / 2 + bob - 0.4;
      shadow(X, y * S + S / 2 + 3, 2.4 - bob * 0.3);
      if (it.kind === "potion" || it.kind === "elixir") {
        g.fillStyle = "rgba(230,240,255,0.7)"; g.fillRect(X - 0.8, Y - 3.2, 1.6, 2);
        g.fillStyle = "#8d5b34"; g.fillRect(X - 0.9, Y - 3.8, 1.8, 0.9);
        blob(X, Y + 0.8, 2.5, 2.5, c);
        blob(X - 0.8, Y, 0.7, 0.9, "rgba(255,255,255,0.55)");
      } else if (it.kind === "teleport" || it.kind === "fire" || it.kind === "map") {
        g.fillStyle = "#efe0bd"; g.fillRect(X - 2.8, Y - 2, 5.6, 4);
        g.fillStyle = "#cdb88f"; g.fillRect(X - 3.2, Y - 2.3, 0.9, 4.6); g.fillRect(X + 2.3, Y - 2.3, 0.9, 4.6);
        g.fillStyle = "rgba(90,70,40,0.45)"; g.fillRect(X - 1.8, Y - 1, 3.2, 0.35); g.fillRect(X - 1.8, Y, 2.4, 0.35);
        blob(X + 0.8, Y + 1.2, 0.9, 0.9, c);
      } else if (it.kind === "gold") {
        for (const [dx, dy] of [[-1.2, 1], [1.2, 1], [0, -0.2]]) {
          blob(X + dx, Y + dy + 0.4, 1.8, 0.9, "#c47f00");
          blob(X + dx, Y + dy, 1.8, 0.9, "#fcc419");
          blob(X + dx - 0.4, Y + dy - 0.2, 0.6, 0.3, "#fff3bf");
        }
      } else if (it.kind === "weapon") {
        g.save(); g.translate(X, Y); g.rotate(-0.78);
        g.fillStyle = "#e9ecef"; g.beginPath(); g.moveTo(-0.65, 1.2); g.lineTo(-0.65, -3.4); g.lineTo(0, -4.4); g.lineTo(0.65, -3.4); g.lineTo(0.65, 1.2); g.fill();
        g.fillStyle = "#adb5bd"; g.fillRect(0, -3.4, 0.65, 4.6);
        g.fillStyle = "#e0b04a"; g.fillRect(-2, 1.2, 4, 0.9);
        g.fillStyle = "#6b4423"; g.fillRect(-0.45, 2.1, 0.9, 1.8);
        g.restore();
      } else if (it.kind === "armor") {
        g.fillStyle = c; g.beginPath(); g.roundRect(X - 2.6, Y - 2.6, 5.2, 5.4, [1, 1, 2.6, 2.6]); g.fill();
        g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(X - 1.6, Y - 1.8, 1, 3);
        g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(X - 0.2, Y - 2.6, 0.4, 5.2);
      } else {
        g.globalCompositeOperation = "lighter";
        const ag = g.createRadialGradient(X, Y, 0, X, Y, 6);
        ag.addColorStop(0, `rgba(255,212,59,${0.45 + 0.2 * Math.sin(t * 3)})`); ag.addColorStop(1, "rgba(255,212,59,0)");
        g.fillStyle = ag; g.fillRect(X - 6, Y - 6, 12, 12);
        g.globalCompositeOperation = "source-over";
        g.strokeStyle = "#e0b04a"; g.lineWidth = 0.4; g.beginPath(); g.arc(X, Y - 2.2, 1.8, Math.PI, 0); g.stroke();
        g.fillStyle = "#fcc419"; g.beginPath(); g.moveTo(X, Y - 2.6); g.lineTo(X + 2.6, Y); g.lineTo(X, Y + 3); g.lineTo(X - 2.6, Y); g.fill();
        g.fillStyle = "#fff3bf"; g.beginPath(); g.moveTo(X, Y - 1.4); g.lineTo(X + 1.2, Y); g.lineTo(X, Y + 1.4); g.lineTo(X - 1.2, Y); g.fill();
      }
      const p = (t * 0.5 + it.i * 0.37) % 2.5;
      if (p < 0.35) sparkle(X + 1.8, Y - 2.2, Math.sin((p / 0.35) * Math.PI));
    }

    // Postaci rysowane wektorowo zamiast liter: łatwiej rozpoznać, kto stoi obok.
    function creature(id, x, y, col, t) {
      if (id === "rat") {
        g.strokeStyle = "#d8a7a0"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x + 2.4, y + 1.6); g.quadraticCurveTo(x + 4.6, y + 2.6 + Math.sin(t * 6) * 0.5, x + 4, y - 0.4); g.stroke();
        blob(x, y + 1, 3, 2.2, col); blob(x - 2.4, y + 0.2, 1.6, 1.3, col);
        blob(x - 2.6, y - 1.4, 0.8, 0.8, "#d8a7a0"); blob(x - 0.8, y - 1.4, 0.8, 0.8, "#d8a7a0");
        eyes(x - 2.4, y - 0.1, 0.55, "#111", 0.35); blob(x - 3.9, y + 0.4, 0.4, 0.4, "#f783ac");
      } else if (id === "bat") {
        const f = Math.sin(t * 14) * 1.2;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 3, y - 3 - f, x - 4.6, y - 0.6 + f); g.quadraticCurveTo(x - 2.6, y + 0.2, x, y + 1.2);
        g.quadraticCurveTo(x + 2.6, y + 0.2, x + 4.6, y - 0.6 + f); g.quadraticCurveTo(x + 3, y - 3 - f, x, y); g.fill();
        blob(x, y + 0.4, 1.5, 1.8, "#5f3dc4"); eyes(x, y, 0.6, "#ffd43b", 0.35);
      } else if (id === "goblin" || id === "orc" || id === "troll" || id === "archer") {
        const big = id === "troll" ? 1.25 : id === "orc" ? 1.1 : id === "archer" ? 0.85 : 0.95;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x - 3 * big, y - 1); g.lineTo(x - 4.6 * big, y - 2.6 * big); g.lineTo(x - 2.2 * big, y - 2); g.fill();
        g.beginPath(); g.moveTo(x + 3 * big, y - 1); g.lineTo(x + 4.6 * big, y - 2.6 * big); g.lineTo(x + 2.2 * big, y - 2); g.fill();
        const hg = g.createRadialGradient(x - 1, y - 1.2, 0.3, x, y, 3.6 * big);
        hg.addColorStop(0, "#d8f5a2"); hg.addColorStop(0.4, col); hg.addColorStop(1, "#1b4d1f");
        g.fillStyle = hg; g.beginPath(); g.ellipse(x, y, 3 * big, 3.2 * big, 0, 0, 7); g.fill();
        eyes(x, y - 0.6, 1.1, id === "orc" || id === "troll" ? "#ff6b6b" : "#ffd43b", 0.55);
        g.fillStyle = "#1a1a1a"; g.fillRect(x - 1.2, y + 1.1, 2.4, 0.5);
        if (id === "orc" || id === "troll") { g.fillStyle = "#fff9db"; g.beginPath(); g.moveTo(x - 1.1, y + 1.2); g.lineTo(x - 0.8, y + 0.1); g.lineTo(x - 0.5, y + 1.2); g.moveTo(x + 0.5, y + 1.2); g.lineTo(x + 0.8, y + 0.1); g.lineTo(x + 1.1, y + 1.2); g.fill(); }
        if (id === "troll") { g.fillStyle = "#e9ecef"; g.beginPath(); g.moveTo(x - 1.8, y - 3.4); g.lineTo(x - 1.2, y - 5.2); g.lineTo(x - 0.6, y - 3.6); g.moveTo(x + 0.6, y - 3.6); g.lineTo(x + 1.2, y - 5.2); g.lineTo(x + 1.8, y - 3.4); g.fill(); }
        if (id === "archer") {
          g.strokeStyle = "#8d5b34"; g.lineWidth = 0.55; g.beginPath(); g.arc(x + 3, y + 0.6, 3, -1.2, 1.2); g.stroke();
          g.strokeStyle = "#e9ecef"; g.lineWidth = 0.2; g.beginPath(); g.moveTo(x + 4.1, y - 2.2); g.lineTo(x + 4.1, y + 3.4); g.stroke();
          g.fillStyle = "#5c3d1e"; g.beginPath(); g.moveTo(x - 2.4, y - 2.2); g.lineTo(x, y - 4.2); g.lineTo(x + 2.4, y - 2.2); g.fill();
        }
      } else if (id === "skeleton") {
        blob(x, y - 0.6, 3, 2.8, "#f1f3f5");
        g.fillStyle = "#dee2e6"; g.fillRect(x - 1.8, y + 1.4, 3.6, 1.6);
        g.fillStyle = "#212529";
        g.beginPath(); g.arc(x - 1.1, y - 0.6, 0.85, 0, 7); g.arc(x + 1.1, y - 0.6, 0.85, 0, 7); g.fill();
        g.fillStyle = `rgba(116,192,252,${0.6 + 0.4 * Math.sin(t * 4)})`;
        g.beginPath(); g.arc(x - 1.1, y - 0.6, 0.3, 0, 7); g.arc(x + 1.1, y - 0.6, 0.3, 0, 7); g.fill();
        g.fillStyle = "#212529";
        g.beginPath(); g.moveTo(x, y + 0.2); g.lineTo(x - 0.4, y + 1); g.lineTo(x + 0.4, y + 1); g.fill();
        for (let k = -1; k <= 1; k++) g.fillRect(x + k * 0.9 - 0.15, y + 1.6, 0.3, 1.2);
      } else if (id === "mimic") {
        const jaw = 0.8 + Math.abs(Math.sin(t * 5)) * 1.2;
        g.fillStyle = "#7a4a22"; g.fillRect(x - 3.6, y + 0.2, 7.2, 3);
        g.fillStyle = "#3a0d0d"; g.fillRect(x - 3.2, y - jaw + 0.2, 6.4, jaw);
        g.fillStyle = "#f1f3f5";
        for (let k = 0; k < 5; k++) {
          const tx = x - 2.8 + k * 1.4;
          g.beginPath(); g.moveTo(tx, y + 0.2); g.lineTo(tx + 0.7, y + 0.2); g.lineTo(tx + 0.35, y - 0.7); g.fill();
          g.beginPath(); g.moveTo(tx, y - jaw + 0.2); g.lineTo(tx + 0.7, y - jaw + 0.2); g.lineTo(tx + 0.35, y - jaw + 1.1); g.fill();
        }
        g.fillStyle = "#a0692f"; g.beginPath(); g.roundRect(x - 3.6, y - jaw - 2.4, 7.2, 2.6, [1.4, 1.4, 0, 0]); g.fill();
        g.fillStyle = "#e0b04a"; g.fillRect(x - 2.6, y - jaw - 2.4, 0.7, 2.6); g.fillRect(x + 1.9, y - jaw - 2.4, 0.7, 2.6);
        eyes(x, y - jaw - 1.2, 1.1, "#ffd43b", 0.45);
        blob(x + 1.6, y + 0.4, 1.2, 0.5, "#e64980");
      } else {
        // smok: skrzydła, głowa z rogami, żar w oczach
        const f = Math.sin(t * 3) * 0.8;
        g.fillStyle = "#a51d1d";
        g.beginPath(); g.moveTo(x - 1, y - 1); g.lineTo(x - 6, y - 4.6 - f); g.lineTo(x - 5, y + 0.6); g.lineTo(x - 3.4, y - 0.2); g.fill();
        g.beginPath(); g.moveTo(x + 1, y - 1); g.lineTo(x + 6, y - 4.6 - f); g.lineTo(x + 5, y + 0.6); g.lineTo(x + 3.4, y - 0.2); g.fill();
        const dg2 = g.createRadialGradient(x - 1, y - 1, 0.3, x, y, 4.6);
        dg2.addColorStop(0, "#ffa8a8"); dg2.addColorStop(0.5, col); dg2.addColorStop(1, "#5c0b0b");
        g.fillStyle = dg2; g.beginPath(); g.ellipse(x, y, 3.8, 3.6, 0, 0, 7); g.fill();
        g.fillStyle = "#ffe066"; g.beginPath(); g.moveTo(x - 2, y - 2.8); g.lineTo(x - 2.8, y - 5); g.lineTo(x - 1, y - 3.2); g.moveTo(x + 2, y - 2.8); g.lineTo(x + 2.8, y - 5); g.lineTo(x + 1, y - 3.2); g.fill();
        eyes(x, y - 0.8, 1.4, "#ffd43b", 0.7);
        g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(x - 0.7, y + 1.6, 0.35, 0, 7); g.arc(x + 0.7, y + 1.6, 0.35, 0, 7); g.fill();
      }
    }
    function hero(x, y) {
      // płaszcz w kolorze gry, twarz, hełm z grzebieniem, miecz
      const cg = g.createLinearGradient(0, y - 1, 0, y + 3.6);
      cg.addColorStop(0, theme.c || "#6a4c93"); cg.addColorStop(1, "#2b1f45");
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(x - 3, y + 3.4); g.lineTo(x - 2.2, y - 0.6); g.lineTo(x + 2.2, y - 0.6); g.lineTo(x + 3, y + 3.4); g.fill();
      blob(x, y - 1.6, 2.2, 2.2, "#f1c9a5");
      g.fillStyle = "#adb5bd"; g.beginPath(); g.arc(x, y - 2, 2.4, Math.PI, 0); g.fill();
      g.fillStyle = "#dee2e6"; g.fillRect(x - 1.6, y - 3.6, 1, 0.5);
      g.fillStyle = "#e03131"; g.fillRect(x - 0.4, y - 5.2, 0.8, 1.6);
      eyes(x + 0.3, y - 1.3, 0.8, "#1a1a1a", 0.35);
      g.strokeStyle = "#dee2e6"; g.lineWidth = 0.7; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + 3, y + 1.2); g.lineTo(x + 4.6, y - 2.8); g.stroke();
      g.strokeStyle = "#ffd43b"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 2.4, y + 0.6); g.lineTo(x + 3.8, y + 1.4); g.stroke();
      g.lineCap = "butt";
    }
    // przesunięcie przy ataku: szybki wypad i powrót
    const lungeOff = (l, dt) => {
      if (!l || l.t <= 0) return [0, 0];
      l.t -= dt;
      const p = Math.sin(Math.max(0, l.t / 0.18) * Math.PI) * 0.38;
      return [l.dx * p, l.dy * p];
    };

    cv.loop((dt, now) => {
      const t = now / 1000;
      // sterowanie ciągłe: trzymany kierunek i marsz do wskazanego pola
      const held = Object.keys(DIRS).find((k) => keys[k]);
      if (!held) s.alert = false;
      else if (!s.alert && (v.hold -= dt) <= 0) { v.hold = 0.13; act(...DIRS[held]); }
      if (s.path.length && !held && (v.step -= dt) <= 0) { v.step = 0.1; travel(); }

      const [hx, hy] = xy(s.pos), k = ease(dt * 18);
      v.rx += (hx - v.rx) * k;
      v.ry += (hy - v.ry) * k;
      v.camX += (v.rx - v.camX) * ease(dt * 6);
      v.camY += (v.ry - v.camY) * ease(dt * 6);
      v.shake = Math.max(0, v.shake - dt);
      v.flash = Math.max(0, v.flash - dt);
      v.fade = Math.max(0, v.fade - dt * 1.8);
      v.bannerT -= dt;
      v.lvlT = Math.max(0, v.lvlT - dt);
      if (s.dead) v.deadT += dt;
      const sh = v.shake * 0.7;
      const ox = v.camX + 0.5 - VW / 2 + (Math.random() - 0.5) * sh, oy = v.camY + 0.5 - VH / 2 + (Math.random() - 0.5) * sh;

      g.fillStyle = "#08090c";
      g.fillRect(0, 0, W, H);
      g.save();
      g.translate(-ox * S, -oy * S);
      torches = [];
      const x0 = Math.max(0, Math.floor(ox)), y0 = Math.max(0, Math.floor(oy));
      const x1 = Math.min(MW - 1, Math.floor(ox) + VW + 1), y1 = Math.min(MH - 1, Math.floor(oy) + VH + 1);
      // jasność pól dąży do celu: widziane, zapamiętane, nieznane
      const kl = ease(dt * 8);
      for (let i = 0; i < MW * MH; i++) {
        // pola na granicy z nieznanym są ciemniejsze, żeby ciemność nie kończyła się ostrą krawędzią
        const kn = s.known, edge = !kn.has(i - 1) || !kn.has(i + 1) || !kn.has(i - MW) || !kn.has(i + MW);
        const target = (s.seen.has(i) ? 1 : kn.has(i) ? 0.3 : 0) * (edge ? 0.45 : 1);
        v.light[i] += (target - v.light[i]) * kl;
        dimg.data[i * 4 + 3] = (1 - v.light[i]) * 255;
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (v.light[y * MW + x] > 0.01) tile(y * MW + x, x, y, t);
      for (const [X, Y, h] of torches) torch(X, Y, t, h);
      for (const f of s.map.feats) if (v.light[f.i] > 0.2) feature(f, t);
      for (const it of s.map.items) if (s.seen.has(it.i)) item(it, t);

      v.corpses = v.corpses.filter((c) => (c.t -= dt) > 0);
      for (const { m, t: ct } of v.corpses) {
        const p = ct / 0.5, X = (m.rx + 0.5) * S, Y = (m.ry + 0.5) * S;
        g.save();
        g.globalAlpha = p;
        g.translate(X, Y + 3);
        g.rotate((1 - p) * 0.6);
        g.scale(1 + (1 - p) * 0.2, p);
        creature(m.id, 0, -3, m.color, t);
        g.restore();
      }
      for (const m of s.map.monsters) {
        const [mx, my] = xy(m.i);
        m.rx += (mx - m.rx) * k;
        m.ry += (my - m.ry) * k;
        if (m.hp <= 0 || !s.seen.has(m.i)) continue;
        const [lx, ly] = lungeOff(m.lunge, dt);
        const hop = Math.sin(Math.min(1, Math.hypot(mx - m.rx, my - m.ry)) * Math.PI) * 1.4;
        const X = (m.rx + 0.5 + lx) * S, Y = (m.ry + 0.5 + ly) * S - hop;
        shadow(X, (m.ry + 0.5) * S + 3.6, m.boss ? 4.6 : 3.2);
        const br = Math.sin(t * 3 + m.i) * 0.03;
        g.save();
        g.translate(X, Y + 3);
        g.scale(1 - br, 1 + br);
        creature(m.id, 0, -3, m.color, t + m.i);
        g.restore();
        if (m.flash > 0) {
          m.flash -= dt;
          g.globalAlpha = Math.max(0, m.flash / 0.22) * 0.75;
          blob(X, Y, m.boss ? 4.4 : 3.3, m.boss ? 4 : 3.2, "#ffffff");
          g.globalAlpha = 1;
        }
        if (!m.awake) cv.text("z", X + 3, Y - 4 - ((t * 0.7 + m.i * 0.3) % 1) * 2, { size: 3, weight: 700, color: "#a5d8ff" });
        m.dhp += (Math.max(0, m.hp) - m.dhp) * ease(dt * 4);
        if (m.hp < m.max) {
          const bw = m.boss ? 10 : 7, by = Y - (m.boss ? 7 : 6);
          g.fillStyle = "rgba(0,0,0,0.65)"; g.beginPath(); g.roundRect(X - bw / 2 - 0.3, by - 0.3, bw + 0.6, 1.6, 0.8); g.fill();
          g.fillStyle = "#ffe066"; g.fillRect(X - bw / 2, by, bw * (m.dhp / m.max), 1);
          const r = m.hp / m.max;
          g.fillStyle = r > 0.5 ? "#51cf66" : r > 0.25 ? "#fcc419" : "#fa5252";
          g.fillRect(X - bw / 2, by, bw * r, 1);
        }
      }

      // bohater: krok z podskokiem, wypad przy ataku, obrót w stronę ruchu
      {
        const [lx, ly] = lungeOff(v.lunge, dt);
        const hop = Math.sin(Math.min(1, Math.hypot(hx - v.rx, hy - v.ry)) * Math.PI) * 1.6;
        const X = (v.rx + 0.5 + lx) * S, Y = (v.ry + 0.5 + ly) * S - hop;
        shadow(X, (v.ry + 0.5) * S + 3.6, 3.2);
        g.save();
        g.translate(X, Y + 3);
        if (s.dead) { g.rotate(Math.min(1, v.deadT * 3) * Math.PI / 2 * v.face); g.globalAlpha = Math.max(0.45, 1 - v.deadT); }
        g.scale(v.face, 1 + Math.sin(t * 2.4) * 0.02);
        hero(0, -3);
        g.restore();
        if (v.flash > 0) { g.globalAlpha = (v.flash / 0.3) * 0.35; blob(X, Y, 3, 3.4, "#ff6b6b"); g.globalAlpha = 1; }
        if (v.lvlT > 0) {
          const p = 1 - v.lvlT / 0.9;
          g.strokeStyle = `rgba(255,212,59,${v.lvlT})`; g.lineWidth = 0.6;
          g.beginPath(); g.ellipse(X, Y + 2, 1 + p * 9, (1 + p * 9) * 0.45, 0, 0, 7); g.stroke();
        }
      }

      v.shots = v.shots.filter((q) => (q.t += dt / 0.16) < 1);
      for (const q of v.shots) {
        const X = (q.x0 + (q.x1 - q.x0) * q.t + 0.5) * S, Y = (q.y0 + (q.y1 - q.y0) * q.t + 0.5) * S - 1.5;
        g.save(); g.translate(X, Y); g.rotate(Math.atan2(q.y1 - q.y0, q.x1 - q.x0));
        g.fillStyle = "#e9ecef"; g.fillRect(-2.4, -0.15, 4, 0.3);
        g.fillStyle = "#adb5bd"; g.beginPath(); g.moveTo(2.4, 0); g.lineTo(1.4, -0.6); g.lineTo(1.4, 0.6); g.fill();
        g.fillStyle = "#e03131"; g.fillRect(-2.6, -0.5, 0.8, 1);
        g.restore();
      }

      // ciemność: mała mapa jasności rozciągnięta z wygładzaniem daje miękkie cienie
      dg.putImageData(dimg, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(dark, 0, 0, MW * S, MH * S);
      const HX = (v.rx + 0.5) * S, HY = (v.ry + 0.5) * S, fl = 1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.02;
      const vg = g.createRadialGradient(HX, HY, S * 1.6, HX, HY, S * 7.5 * fl);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)");
      g.fillStyle = vg; g.fillRect(ox * S - S, oy * S - S, W + 2 * S, H + 2 * S);
      g.globalCompositeOperation = "lighter";
      const wg = g.createRadialGradient(HX, HY, 0, HX, HY, S * 4.5 * fl);
      wg.addColorStop(0, "rgba(255,170,90,0.13)"); wg.addColorStop(1, "rgba(255,170,90,0)");
      g.fillStyle = wg; g.fillRect(HX - S * 5, HY - S * 5, S * 10, S * 10);
      for (const [X, Y, h] of torches) {
        const a = v.light[((Y / S) | 0) * MW + ((X / S) | 0)] * (0.2 + Math.sin(t * 13 + h) * 0.03);
        const tg = g.createRadialGradient(X, Y - 2, 0, X, Y - 2, S * 2.6);
        tg.addColorStop(0, `rgba(255,150,60,${a})`); tg.addColorStop(1, "rgba(255,150,60,0)");
        g.fillStyle = tg; g.fillRect(X - S * 3, Y - S * 3, S * 6, S * 6);
      }
      for (const p of v.parts) {
        p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        const a = Math.max(0, p.life / p.max);
        g.globalAlpha = a;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x * S, p.y * S, p.size * S * (0.4 + a * 0.6), 0, 7); g.fill();
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      v.parts = v.parts.filter((p) => p.life > 0);

      v.texts = v.texts.filter((q) => (q.t -= dt) > 0);
      for (const q of v.texts) {
        const pop = 1 + Math.max(0, q.t - 0.75) * 3, size = (q.big ? 4.6 : 3.8) * pop, Y = (q.y - (0.9 - q.t) * 1.1) * S - 0.5;
        g.globalAlpha = Math.min(1, q.t * 3);
        cv.text(q.text, q.x * S + 0.35, Y + 0.35, { size, weight: 800, color: "rgba(0,0,0,0.75)" });
        cv.text(q.text, q.x * S, Y, { size, weight: 800, color: q.color });
      }
      g.globalAlpha = 1;
      g.restore();

      // minimapa w rogu (M chowa)
      if (v.mini) {
        const mm = 0.55, mx0 = W - MW * mm - 3, my0 = 3;
        g.fillStyle = "rgba(8,9,12,0.62)";
        g.beginPath(); g.roundRect(mx0 - 1.2, my0 - 1.2, MW * mm + 2.4, MH * mm + 2.4, 1.6); g.fill();
        g.fillStyle = "rgba(160,166,184,0.55)";
        s.known.forEach((i) => { if (s.map.t[i] === 1) g.fillRect(mx0 + (i % MW) * mm, my0 + ((i / MW) | 0) * mm, mm, mm); });
        const dot = (i, col, r = mm) => { g.fillStyle = col; g.fillRect(mx0 + (i % MW) * mm - (r - mm) / 2, my0 + ((i / MW) | 0) * mm - (r - mm) / 2, r, r); };
        s.known.forEach((i) => { if (s.map.t[i] === 2) dot(i, "#ffd43b", mm * 2); });
        for (const f of s.map.feats) if (s.known.has(f.i) && f.kind !== "trap") dot(f.i, f.kind === "fountain" ? "#74c0fc" : f.kind === "altar" ? "#ffe066" : "#c9884a", mm * 1.6);
        for (const m of s.map.monsters) if (m.hp > 0 && s.seen.has(m.i)) dot(m.i, "#ff6b6b", mm * 1.6);
        if (Math.sin(t * 6) > -0.4) dot(s.pos, "#ffffff", mm * 2.2);
      }
      // mało zdrowia albo świeża rana: czerwona winieta
      const low = Math.max(0, 0.35 - s.hp / s.max) / 0.35;
      const red = Math.max(low * (0.55 + 0.2 * Math.sin(t * 4)), (v.flash / 0.3) * 0.5);
      if (red > 0.01) {
        const rg = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
        rg.addColorStop(0, "rgba(200,20,30,0)"); rg.addColorStop(1, `rgba(200,20,30,${red})`);
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
      }
      if (v.fade > 0) { g.fillStyle = `rgba(0,0,0,${Math.min(1, v.fade)})`; g.fillRect(0, 0, W, H); }
      if (v.bannerT > 0) {
        g.globalAlpha = Math.max(0, Math.min(1, v.bannerT * 1.5, (2.2 - v.bannerT) * 3));
        const y = H * 0.24 - (1 - Math.min(1, (2.2 - v.bannerT) * 2)) * 3;
        g.fillStyle = "rgba(8,9,12,0.55)"; g.fillRect(0, y - 7, W, 14);
        cv.text(v.banner, W / 2, y, { size: 7, weight: 800, color: "#f1e3c2" });
        g.globalAlpha = 1;
      }
    });

    // plecak: te same przedmioty w jednym przycisku z licznikiem
    const bagKinds = () => {
      const m = new Map();
      for (const it of s.bag) if (it.kind !== "amulet") m.set(it.kind, (m.get(it.kind) || 0) + 1);
      return [...m];
    };
    let bagSig = null;
    const setStat = (n, val) => {
      const dd = stat[n];
      if (dd.textContent === String(val)) return;
      dd.textContent = val;
      replay(dd, "tick");
    };
    function render() {
      lvlEl.textContent = `Poziom ${s.lvl}`;
      floorEl.textContent = `Piętro ${s.depth} z ${ctx.level.depth}`;
      const r = Math.max(0, s.hp) / s.max;
      hpM.val.textContent = `${Math.max(0, s.hp)} / ${s.max}`;
      hpM.fill.style.width = `${r * 100}%`;
      hpM.m.dataset.state = r < 0.3 ? "bad" : r < 0.6 ? "warn" : "ok";
      xpM.val.textContent = `${s.xp} / ${xpNeed()}`;
      xpM.fill.style.width = `${(s.xp / xpNeed()) * 100}%`;
      setStat("Atak", s.atk + s.weapon[1]);
      setStat("Obrona", s.def + s.armor[1]);
      setStat("Złoto", s.gold);
      gear.textContent = `${cap(s.weapon[0])} · ${s.armor[0]}`;
      const onAltar = featAt(s.pos)?.kind === "altar";
      actionEl.replaceChildren(
        ...(s.map.t[s.pos] === 2 ? [button("Zejdź po schodach", "btn wide", descend)] : []),
        ...(onAltar ? [button(`Złóż ofiarę (${s.cost} zł)`, `${s.gold >= s.cost ? "btn" : "btn-ghost"} wide`, offer)] : []),
      );
      const kinds = bagKinds(), sig = kinds.join("|");
      if (sig !== bagSig) {
        bagSig = sig;
        bagEl.replaceChildren(...(kinds.length ? kinds.map(([kind, n], k) => {
          const b = button("", `rl-item rl-${kind}`, () => use(kind));
          b.style.setProperty("--ic", ITEMS[kind].color);
          b.setAttribute("aria-label", `${ITEMS[kind].name}, ${n} szt., klawisz ${k + 1}`);
          b.append(el("i"), el("span", "", ITEMS[kind].name), el("b", "", n > 1 ? `× ${n}` : ""), el("kbd", "", k + 1));
          return b;
        }) : [el("p", "panel-note", "Pusto. Mikstury i zwoje pojawią się tutaj.")]));
      }
      ctx.progress((s.depth - 1) / ctx.level.depth + (s.lvl > 1 ? 0.02 : 0));
    }
    enter(1);
  },
});
