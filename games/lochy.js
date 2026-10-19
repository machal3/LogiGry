// Lochy (roguelike): losowe piętra z pokojów i korytarzy, walka turowa, pole widzenia, przedmioty i rozwój postaci.
// Mapa MW × MH: t[i] = 0 ściana, 1 podłoga, 2 schody w dół. Każdy ruch gracza to jedna tura dla wszystkich potworów.
const Dungeon = (() => {
  const MW = 44, MH = 28;
  const MONSTERS = [
    { id: "rat", name: "szczur", ch: "s", hp: 6, atk: 2, def: 0, xp: 3, color: "#a5673f", depth: 1 },
    { id: "bat", name: "nietoperz", ch: "n", hp: 5, atk: 3, def: 0, xp: 4, color: "#845ef7", depth: 1, erratic: true },
    { id: "goblin", name: "goblin", ch: "g", hp: 12, atk: 4, def: 1, xp: 8, color: "#40c057", depth: 2 },
    { id: "skeleton", name: "szkielet", ch: "z", hp: 16, atk: 6, def: 2, xp: 12, color: "#ced4da", depth: 3 },
    { id: "orc", name: "ork", ch: "o", hp: 24, atk: 7, def: 3, xp: 18, color: "#2b8a3e", depth: 3 },
    { id: "troll", name: "troll", ch: "T", hp: 40, atk: 9, def: 3, xp: 30, color: "#5c940d", depth: 4, regen: 1 },
    { id: "dragon", name: "smok", ch: "D", hp: 90, atk: 13, def: 5, xp: 100, color: "#e03131", depth: 99, boss: true },
  ];
  const ITEMS = {
    potion: { name: "mikstura zdrowia", color: "#e64980" },
    elixir: { name: "eliksir siły", color: "#f59f00" },
    teleport: { name: "zwój teleportacji", color: "#4dabf7" },
    fire: { name: "zwój ognia", color: "#ff6b6b" },
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
      const start = rooms[0], end = rooms[rooms.length - 1];
      if (!last) t[end.cy * MW + end.cx] = 2;
      const free = () => {
        for (;;) {
          const r = rooms[1 + rnd(rooms.length - 1)];
          const i = (r.y + rnd(r.h)) * MW + r.x + rnd(r.w);
          if (t[i] === 1) return i;
        }
      };
      const monsters = [], items = [];
      const pool = MONSTERS.filter((m) => m.depth <= depth && !m.boss);
      for (let k = 0; k < 5 + depth * 2; k++) {
        const m = pick(pool.filter((x) => x.depth >= depth - 2));
        const i = free();
        if (monsters.some((q) => q.i === i)) continue;
        monsters.push({ ...m, i, max: m.hp, awake: false });
      }
      const drops = ["potion", "potion", "gold", "gold", "gold", pick(["teleport", "fire"]), pick(["weapon", "armor", "elixir", "potion"])];
      if (depth % 2 === 0) drops.push(pick(["weapon", "armor"]));
      for (const kind of drops) {
        const it = { kind, i: free() };
        if (kind === "gold") it.amount = 5 + rnd(10) * depth;
        if (kind === "weapon") { const [n, v] = WEAPONS[Math.min(WEAPONS.length - 1, depth - 1 + rnd(2))]; Object.assign(it, { label: n, value: v }); }
        if (kind === "armor") { const [n, v] = ARMORS[Math.min(ARMORS.length - 1, depth - 1 + rnd(2))]; Object.assign(it, { label: n, value: v }); }
        items.push(it);
      }
      if (last) {
        const boss = MONSTERS.find((m) => m.boss);
        monsters.push({ ...boss, i: end.cy * MW + end.cx - 1, max: boss.hp, awake: false });
        items.push({ kind: "amulet", i: end.cy * MW + end.cx });
      }
      return { t, rooms, start: start.cy * MW + start.cx, monsters, items };
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
    "Strzałki, WASD albo dotknięcie planszy w danym kierunku: ruch. Wejście na potwora to atak. Spacja albo kropka: czekanie w miejscu.",
    "Przedmioty podnosisz, wchodząc na nie. Używasz ich w panelu: mikstury leczą, zwoje teleportują albo palą widocznych wrogów, lepsza broń i zbroja zakładają się same.",
    "Za pokonanych wrogów dostajesz doświadczenie. Nowy poziom daje więcej zdrowia i siły. Odpoczynek na pustym korytarzu powoli leczy.",
  ],
  achievements: [
    { id: "bogacz", name: "Bogacz", desc: "Zbierz 100 sztuk złota w jednej wyprawie.", points: 10 },
    { id: "smokobojca", name: "Smokobójca", desc: "Pokonaj smoka strzegącego amuletu.", points: 25 },
    { id: "weteran", name: "Weteran głębin", desc: "Zdobądź amulet z 5 pięter, mając co najmniej połowę zdrowia.", points: 50 },
  ],
  mount(board, ctx) {
    const { MW, MH, ITEMS } = Dungeon;
    const VW = 21, VH = 15, S = 10;
    const cv = canvasGame(board, ctx, VW * S, VH * S, { max: 70 });
    const { g, theme } = cv;
    const s = {
      depth: 1, map: null, seen: new Set(), known: new Set(), pos: 0, hp: ctx.level.hp, max: ctx.level.hp, atk: 3, def: 0,
      lvl: 1, xp: 0, gold: 0, weapon: ["pięści", 0], armor: ["ubranie", 0], bag: [], log: [], turn: 0, fx: [], dead: false,
    };
    Dungeon.last = s;
    const statsEl = el("div", "rl-stats");
    const bagEl = el("div", "rl-bag");
    const logEl = el("ol", "rl-log");
    ctx.panel.append(panelBlock("", statsEl), panelBlock("Plecak", bagEl), panelBlock("Dziennik", logEl));
    const say = (text, kind = "") => { s.log.unshift([text, kind]); s.log.length = Math.min(s.log.length, 7); };

    function enter(depth) {
      s.depth = depth;
      s.map = Dungeon.generate(depth, depth === ctx.level.depth);
      s.pos = s.map.start;
      s.known = new Set();
      look();
      say(depth === ctx.level.depth ? `Piętro ${depth}. Czujesz gorący oddech smoka…` : `Schodzisz na piętro ${depth}.`, "info");
      render();
    }
    function look() {
      s.seen = Dungeon.fov(s.map.t, s.pos, 8);
      s.seen.forEach((i) => s.known.add(i));
    }
    const xpNeed = () => 10 + s.lvl * 12;
    const monsterAt = (i) => s.map.monsters.find((m) => m.i === i && m.hp > 0);
    const roll = (atk, def) => Math.max(1, atk + rnd(3) - def);

    function hit(m) {
      const dmg = roll(s.atk + s.weapon[1], m.def);
      m.hp -= dmg;
      m.awake = true;
      s.fx.push({ i: m.i, text: `-${dmg}`, t: 0.7, color: "#fff" });
      Sound.place(4);
      if (m.hp <= 0) {
        say(`Pokonujesz: ${m.name}. +${m.xp} doświadczenia.`, "good");
        if (m.boss) ctx.achieve("smokobojca");
        s.xp += m.xp;
        if (Math.random() < 0.25) s.map.items.push({ kind: "gold", i: m.i, amount: 3 + rnd(8) * s.depth });
        while (s.xp >= xpNeed()) {
          s.xp -= xpNeed();
          s.lvl++;
          s.max += 6;
          s.hp = s.max;
          s.atk += 1;
          say(`Nowy poziom ${s.lvl}! Więcej zdrowia i siły.`, "good");
          Sound.line();
        }
      } else say(`Trafiasz: ${m.name} (${dmg}).`);
    }
    function pickUp() {
      for (const it of s.map.items.filter((x) => x.i === s.pos)) {
        s.map.items = s.map.items.filter((x) => x !== it);
        if (it.kind === "gold") { s.gold += it.amount; if (s.gold >= 100) ctx.achieve("bogacz"); say(`Zbierasz ${it.amount} sztuk złota.`); Sound.place(7); continue; }
        if (it.kind === "amulet") { if (ctx.level.key === "hard" && s.hp * 2 >= s.max) ctx.achieve("weteran"); s.bag.push(it); say("Masz Amulet Głębin!", "good"); Sound.win(); render(); return ctx.win(`Poziom postaci ${s.lvl}, złoto ${s.gold}, tury ${s.turn}.`); }
        if (it.kind === "weapon" && it.value > s.weapon[1]) { s.weapon = [it.label, it.value]; say(`Bierzesz do ręki: ${it.label} (+${it.value} ataku).`, "good"); Sound.flag(); continue; }
        if (it.kind === "armor" && it.value > s.armor[1]) { s.armor = [it.label, it.value]; say(`Zakładasz: ${it.label} (+${it.value} obrony).`, "good"); Sound.flag(); continue; }
        if (it.kind === "weapon" || it.kind === "armor") { s.gold += 5 * it.value; say(`${it.label} jest gorszy od twojego, sprzedajesz za ${5 * it.value} złota.`); continue; }
        s.bag.push(it);
        say(`Podnosisz: ${ITEMS[it.kind].name}.`);
        Sound.tap();
      }
    }
    function use(k) {
      if (ctx.done || s.dead) return;
      const it = s.bag[k];
      if (!it || it.kind === "amulet") return;
      s.bag.splice(k, 1);
      if (it.kind === "potion") { const h = Math.min(s.max - s.hp, 14 + s.depth * 2); s.hp += h; say(`Pijesz miksturę: +${h} zdrowia.`, "good"); }
      if (it.kind === "elixir") { s.atk += 2; s.max += 4; s.hp += 4; say("Eliksir siły: +2 ataku, +4 zdrowia na stałe.", "good"); }
      if (it.kind === "teleport") {
        const floor = [...s.map.t.keys()].filter((i) => s.map.t[i] === 1 && !monsterAt(i));
        s.pos = pick(floor);
        say("Zwój teleportacji przenosi cię w nieznane.", "info");
      }
      if (it.kind === "fire") {
        const hitList = s.map.monsters.filter((m) => m.hp > 0 && s.seen.has(m.i));
        hitList.forEach((m) => { m.hp -= 12 + s.depth * 2; m.awake = true; s.fx.push({ i: m.i, text: "ogień", t: 0.8, color: "#ff922b" }); if (m.hp <= 0) { if (m.boss) ctx.achieve("smokobojca"); s.xp += m.xp; say(`Ogień pochłania: ${m.name}.`, "good"); } });
        if (!hitList.length) say("Płomienie trafiają w pustkę.");
      }
      Sound.place(8);
      endTurn();
    }
    function act(dx, dy) {
      if (ctx.done || s.dead) return;
      const x = (s.pos % MW) + dx, y = ((s.pos / MW) | 0) + dy, i = y * MW + x;
      if (dx || dy) {
        if (x < 0 || y < 0 || x >= MW || y >= MH || !s.map.t[i]) return Sound.tap();
        const m = monsterAt(i);
        if (m) hit(m);
        else {
          s.pos = i;
          pickUp();
          if (ctx.done) return;
          if (s.map.t[i] === 2) { say("Schody w dół. Naciśnij Enter albo przycisk w panelu, żeby zejść."); }
        }
      } else if (!s.map.monsters.some((m) => m.hp > 0 && s.seen.has(m.i))) s.hp = Math.min(s.max, s.hp + 1);
      endTurn();
    }
    function descend() {
      if (ctx.done || s.map.t[s.pos] !== 2) return;
      Sound.line();
      enter(s.depth + 1);
    }
    function endTurn() {
      s.turn++;
      if (s.turn % 6 === 0) s.hp = Math.min(s.max, s.hp + 1);
      look();
      const px = s.pos % MW, py = (s.pos / MW) | 0;
      for (const m of s.map.monsters) {
        if (m.hp <= 0) continue;
        if (m.regen) m.hp = Math.min(m.max, m.hp + m.regen);
        if (s.seen.has(m.i)) m.awake = true;
        if (!m.awake) continue;
        const mx = m.i % MW, my = (m.i / MW) | 0;
        if (Math.max(Math.abs(mx - px), Math.abs(my - py)) === 1) {
          if (m.erratic && Math.random() < 0.4) continue;
          const dmg = roll(m.atk, s.def + s.armor[1]);
          s.hp -= dmg;
          s.fx.push({ i: s.pos, text: `-${dmg}`, t: 0.7, color: "#ff6b6b" });
          say(`${m.name[0].toUpperCase() + m.name.slice(1)} trafia cię (${dmg}).`, "bad");
          Sound.error();
          continue;
        }
        // krok w stronę gracza, z alternatywą, gdy droga zajęta
        const steps = [[Math.sign(px - mx), Math.sign(py - my)], [Math.sign(px - mx), 0], [0, Math.sign(py - my)]];
        if (m.erratic && Math.random() < 0.5) steps.unshift([rnd(3) - 1, rnd(3) - 1]);
        for (const [sx, sy] of steps) {
          const ni = (my + sy) * MW + mx + sx;
          if ((sx || sy) && s.map.t[ni] && !monsterAt(ni) && ni !== s.pos) { m.i = ni; break; }
        }
      }
      if (s.hp <= 0) {
        s.hp = 0;
        s.dead = true;
        render();
        return ctx.lose("Polegasz w lochach", `Piętro ${s.depth}, poziom postaci ${s.lvl}.`);
      }
      render();
    }
    heldKeys(ctx, (k) => {
      const d = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0], q: [-1, -1], e: [1, -1], z: [-1, 1], c: [1, 1] }[k];
      if (d) act(...d);
      else if (k === " " || k === ".") act(0, 0);
      else if (k === "enter" || k === ">") descend();
      else if (/^[1-9]$/.test(k)) use(+k - 1);
    });
    // dotknięcie: krok w stronę wskazanego miejsca względem gracza (środek widoku)
    ctx.on(cv.cv, "pointerdown", (e) => {
      e.preventDefault();
      const [x, y] = cv.at(e);
      const dx = x - (VW * S) / 2, dy = y - (VH * S) / 2;
      if (Math.hypot(dx, dy) < S * 0.6) return s.map.t[s.pos] === 2 ? descend() : act(0, 0);
      const a = Math.atan2(dy, dx), oct = Math.round(a / (Math.PI / 4));
      const dirs = { 0: [1, 0], 1: [1, 1], 2: [0, 1], 3: [-1, 1], 4: [-1, 0], "-4": [-1, 0], "-3": [-1, -1], "-2": [0, -1], "-1": [1, -1] };
      act(...dirs[oct]);
    });

    cv.loop((dt) => draw(dt));
    // Postaci rysowane wektorowo zamiast liter: łatwiej rozpoznać, kto stoi obok.
    const blob = (x, y, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
    const eyes = (x, y, dx, col = "#ffffff", r = 0.6) => { g.fillStyle = col; g.beginPath(); g.arc(x - dx, y, r, 0, 7); g.arc(x + dx, y, r, 0, 7); g.fill(); };
    function creature(id, x, y, col, boss) {
      const t = performance.now() / 1000;
      if (id === "rat") {
        g.strokeStyle = "#d8a7a0"; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x + 2.4, y + 1.6); g.quadraticCurveTo(x + 4.6, y + 2.6, x + 4, y - 0.4); g.stroke();
        blob(x, y + 1, 3, 2.2, col); blob(x - 2.4, y + 0.2, 1.6, 1.3, col);
        blob(x - 2.6, y - 1.4, 0.8, 0.8, "#d8a7a0"); blob(x - 0.8, y - 1.4, 0.8, 0.8, "#d8a7a0");
        eyes(x - 2.4, y - 0.1, 0.55, "#111", 0.35); blob(x - 3.9, y + 0.4, 0.4, 0.4, "#f783ac");
      } else if (id === "bat") {
        const f = Math.sin(t * 14) * 1.2;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 3, y - 3 - f, x - 4.6, y - 0.6 + f); g.quadraticCurveTo(x - 2.6, y + 0.2, x, y + 1.2);
        g.quadraticCurveTo(x + 2.6, y + 0.2, x + 4.6, y - 0.6 + f); g.quadraticCurveTo(x + 3, y - 3 - f, x, y); g.fill();
        blob(x, y + 0.4, 1.5, 1.8, "#5f3dc4"); eyes(x, y, 0.6, "#ffd43b", 0.35);
      } else if (id === "goblin" || id === "orc" || id === "troll") {
        const big = id === "troll" ? 1.25 : id === "orc" ? 1.1 : 0.95;
        g.fillStyle = col;
        g.beginPath(); g.moveTo(x - 3 * big, y - 1); g.lineTo(x - 4.6 * big, y - 2.6 * big); g.lineTo(x - 2.2 * big, y - 2); g.fill();
        g.beginPath(); g.moveTo(x + 3 * big, y - 1); g.lineTo(x + 4.6 * big, y - 2.6 * big); g.lineTo(x + 2.2 * big, y - 2); g.fill();
        const hg = g.createRadialGradient(x - 1, y - 1.2, 0.3, x, y, 3.6 * big);
        hg.addColorStop(0, "#d8f5a2"); hg.addColorStop(0.4, col); hg.addColorStop(1, "#1b4d1f");
        g.fillStyle = hg; g.beginPath(); g.ellipse(x, y, 3 * big, 3.2 * big, 0, 0, 7); g.fill();
        eyes(x, y - 0.6, 1.1, id === "goblin" ? "#ffd43b" : "#ff6b6b", 0.55);
        g.fillStyle = "#1a1a1a"; g.fillRect(x - 1.2, y + 1.1, 2.4, 0.5);
        if (id !== "goblin") { g.fillStyle = "#fff9db"; g.beginPath(); g.moveTo(x - 1.1, y + 1.2); g.lineTo(x - 0.8, y + 0.1); g.lineTo(x - 0.5, y + 1.2); g.moveTo(x + 0.5, y + 1.2); g.lineTo(x + 0.8, y + 0.1); g.lineTo(x + 1.1, y + 1.2); g.fill(); }
        if (id === "troll") { g.fillStyle = "#e9ecef"; g.beginPath(); g.moveTo(x - 1.8, y - 3.4); g.lineTo(x - 1.2, y - 5.2); g.lineTo(x - 0.6, y - 3.6); g.moveTo(x + 0.6, y - 3.6); g.lineTo(x + 1.2, y - 5.2); g.lineTo(x + 1.8, y - 3.4); g.fill(); }
      } else if (id === "skeleton") {
        blob(x, y - 0.6, 3, 2.8, "#f1f3f5");
        g.fillStyle = "#dee2e6"; g.fillRect(x - 1.8, y + 1.4, 3.6, 1.6);
        g.fillStyle = "#212529";
        g.beginPath(); g.arc(x - 1.1, y - 0.6, 0.85, 0, 7); g.arc(x + 1.1, y - 0.6, 0.85, 0, 7); g.fill();
        g.beginPath(); g.moveTo(x, y + 0.2); g.lineTo(x - 0.4, y + 1); g.lineTo(x + 0.4, y + 1); g.fill();
        for (let k = -1; k <= 1; k++) g.fillRect(x + k * 0.9 - 0.15, y + 1.6, 0.3, 1.2);
      } else {
        // smok: skrzydła, głowa z rogami, żar w oczach
        const f = Math.sin(t * 3) * 0.8;
        g.fillStyle = "#a51d1d";
        g.beginPath(); g.moveTo(x - 1, y - 1); g.lineTo(x - 6, y - 4.6 - f); g.lineTo(x - 5, y + 0.6); g.lineTo(x - 3.4, y - 0.2); g.fill();
        g.beginPath(); g.moveTo(x + 1, y - 1); g.lineTo(x + 6, y - 4.6 - f); g.lineTo(x + 5, y + 0.6); g.lineTo(x + 3.4, y - 0.2); g.fill();
        const dg = g.createRadialGradient(x - 1, y - 1, 0.3, x, y, 4.6);
        dg.addColorStop(0, "#ffa8a8"); dg.addColorStop(0.5, col); dg.addColorStop(1, "#5c0b0b");
        g.fillStyle = dg; g.beginPath(); g.ellipse(x, y, 3.8, 3.6, 0, 0, 7); g.fill();
        g.fillStyle = "#ffe066"; g.beginPath(); g.moveTo(x - 2, y - 2.8); g.lineTo(x - 2.8, y - 5); g.lineTo(x - 1, y - 3.2); g.moveTo(x + 2, y - 2.8); g.lineTo(x + 2.8, y - 5); g.lineTo(x + 1, y - 3.2); g.fill();
        eyes(x, y - 0.8, 1.4, "#ffd43b", 0.7);
        g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(x - 0.7, y + 1.6, 0.35, 0, 7); g.arc(x + 0.7, y + 1.6, 0.35, 0, 7); g.fill();
      }
    }
    function hero(x, y) {
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath(); g.ellipse(x, y + 3.6, 3.2, 1, 0, 0, Math.PI * 2); g.fill();
      // płaszcz w kolorze gry, twarz, hełm z grzebieniem, miecz
      const cg = g.createLinearGradient(0, y - 1, 0, y + 3.6);
      cg.addColorStop(0, theme.c); cg.addColorStop(1, "#3b2a5c");
      g.fillStyle = cg;
      g.beginPath(); g.moveTo(x - 3, y + 3.4); g.lineTo(x - 2.2, y - 0.6); g.lineTo(x + 2.2, y - 0.6); g.lineTo(x + 3, y + 3.4); g.fill();
      blob(x, y - 1.6, 2.2, 2.2, "#f1c9a5");
      g.fillStyle = "#adb5bd"; g.beginPath(); g.arc(x, y - 2, 2.4, Math.PI, 0); g.fill();
      g.fillStyle = "#e03131"; g.fillRect(x - 0.4, y - 5.2, 0.8, 1.6);
      eyes(x, y - 1.3, 0.8, "#1a1a1a", 0.35);
      g.strokeStyle = "#dee2e6"; g.lineWidth = 0.7; g.lineCap = "round";
      g.beginPath(); g.moveTo(x + 3, y + 1.2); g.lineTo(x + 4.6, y - 2.8); g.stroke();
      g.strokeStyle = "#ffd43b"; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 2.4, y + 0.6); g.lineTo(x + 3.8, y + 1.4); g.stroke();
    }
    function draw(dt) {
      const px = s.pos % MW, py = (s.pos / MW) | 0;
      const ox = px - (VW >> 1), oy = py - (VH >> 1);
      g.fillStyle = "#14161c";
      g.fillRect(0, 0, VW * S, VH * S);
      for (let vy = 0; vy < VH; vy++) for (let vx = 0; vx < VW; vx++) {
        const x = ox + vx, y = oy + vy;
        if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
        const i = y * MW + x;
        if (!s.known.has(i)) continue;
        const vis = s.seen.has(i), tile = s.map.t[i];
        g.globalAlpha = vis ? 1 : 0.28;
        if (!tile) {
          g.fillStyle = "#6b6156";
          g.fillRect(vx * S, vy * S, S, S);
          g.fillStyle = "#857a6c";
          g.fillRect(vx * S, vy * S, S, S * 0.3);
          g.fillStyle = "rgba(0,0,0,0.18)";
          g.fillRect(vx * S + (y % 2 ? 5 : 0), vy * S + S * 0.3, 0.5, S * 0.7);
        } else {
          g.fillStyle = (x + y) % 2 ? "#4d5260" : "#484c59";
          g.fillRect(vx * S, vy * S, S, S);
          if (tile === 2) {
            g.fillStyle = "#c8a46e";
            for (let k = 0; k < 3; k++) g.fillRect(vx * S + 2 + k, vy * S + 2 + k * 2.2, S - 4 - k * 2, 1.4);
          }
        }
      }
      g.globalAlpha = 1;
      // światło pochodni wokół postaci
      const light = g.createRadialGradient((VW * S) / 2, (VH * S) / 2, S, (VW * S) / 2, (VH * S) / 2, S * 8);
      light.addColorStop(0, "rgba(255,200,120,0.16)");
      light.addColorStop(1, "rgba(0,0,0,0.35)");
      g.fillStyle = light;
      g.fillRect(0, 0, VW * S, VH * S);
      const toV = (i) => [(i % MW - ox) * S + S / 2, (((i / MW) | 0) - oy) * S + S / 2];
      for (const it of s.map.items) {
        if (!s.seen.has(it.i)) continue;
        const [x, y] = toV(it.i), c = ITEMS[it.kind].color;
        g.fillStyle = c;
        g.beginPath();
        if (it.kind === "potion" || it.kind === "elixir") { g.arc(x, y + 1, 2.4, 0, Math.PI * 2); g.fill(); g.fillRect(x - 0.8, y - 3, 1.6, 2.4); }
        else if (it.kind === "teleport" || it.kind === "fire") { g.roundRect(x - 3, y - 2, 6, 4, 1); g.fill(); }
        else if (it.kind === "gold") { g.arc(x, y, 1.8, 0, Math.PI * 2); g.arc(x + 1.8, y + 1.2, 1.5, 0, Math.PI * 2); g.fill(); }
        else if (it.kind === "weapon") { g.save(); g.translate(x, y); g.rotate(-0.8); g.fillRect(-0.6, -3.6, 1.2, 6); g.fillRect(-2, 1.2, 4, 1); g.restore(); }
        else if (it.kind === "armor") { g.roundRect(x - 2.6, y - 2.6, 5.2, 5.4, [1, 1, 2.6, 2.6]); g.fill(); }
        else { g.moveTo(x, y - 3.5); g.lineTo(x + 3, y); g.lineTo(x, y + 3.5); g.lineTo(x - 3, y); g.fill(); }
      }
      g.font = "700 6.4px Geist, ui-monospace, monospace";
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const m of s.map.monsters) {
        if (m.hp <= 0 || !s.seen.has(m.i)) continue;
        const [x, y] = toV(m.i);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.beginPath(); g.ellipse(x, y + 3.6, m.boss ? 4.6 : 3.2, 1, 0, 0, Math.PI * 2); g.fill();
        creature(m.id, x, y, m.color, m.boss);
        if (m.hp < m.max) { g.fillStyle = "#fa5252"; g.fillRect(x - 3.5, y - 5, 7 * (m.hp / m.max), 0.9); }
      }
      const [x, y] = toV(s.pos);
      hero(x, y);
      s.fx = s.fx.filter((f) => (f.t -= dt) > 0);
      for (const f of s.fx) {
        const [fx, fy] = toV(f.i);
        g.globalAlpha = Math.min(1, f.t * 2);
        g.fillStyle = f.color;
        g.font = "700 4.5px Geist, system-ui, sans-serif";
        g.fillText(f.text, fx, fy - 6 - (0.7 - f.t) * 6);
        g.font = "700 6.4px Geist, ui-monospace, monospace";
      }
      g.globalAlpha = 1;
      g.textBaseline = "alphabetic";
    }

    function render() {
      const bar = (v, m, cls) => { const b = el("span", `rl-bar ${cls}`); const f = el("i"); f.style.width = `${(v / m) * 100}%`; b.append(f); return b; };
      statsEl.replaceChildren(
        el("p", "rl-line", `Piętro ${s.depth} z ${ctx.level.depth} · poziom ${s.lvl}`),
        el("p", "rl-small", `Zdrowie ${s.hp} / ${s.max}`), bar(s.hp, s.max, "hp"),
        el("p", "rl-small", `Doświadczenie ${s.xp} / ${xpNeed()}`), bar(s.xp, xpNeed(), "xp"),
        el("p", "rl-small", `Atak ${s.atk + s.weapon[1]} (${s.weapon[0]}) · obrona ${s.def + s.armor[1]} (${s.armor[0]}) · złoto ${s.gold}`),
      );
      if (s.map?.t[s.pos] === 2) statsEl.append(button("Zejdź po schodach", "btn wide", descend));
      bagEl.replaceChildren(...(s.bag.length ? s.bag.map((it, k) => {
        const b = button("", "rl-item", () => use(k));
        b.style.setProperty("--ic", ITEMS[it.kind].color);
        b.append(el("i"), el("span", "", ITEMS[it.kind].name), el("kbd", "", k + 1));
        return b;
      }) : [el("p", "", "Pusto. Mikstury i zwoje pojawią się tutaj.")]));
      logEl.replaceChildren(...s.log.map(([t, k]) => el("li", k, t)));
      ctx.progress((s.depth - 1) / ctx.level.depth + (s.lvl > 1 ? 0.02 : 0));
    }
    enter(1);
  },
});
