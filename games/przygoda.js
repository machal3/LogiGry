// Przygoda: platformówka na kafelkach 10 × 10. Każda partia składa etapy z losowych odcinków w losowych krainach.
// Kafle: "#" ziemia, "W" mur, "=" kładka jednostronna, "^" kolce, "L" lawa, "D" drzwi (klucz), "B" skrzynka z nagrodą, "b" pusta skrzynka.
const Platformer = (() => {
  const T = 10, ROWS = 15;
  const BIOMES = [
    { name: "Zielona łąka", foes: ["walker", "hopper", "walker"], extra: ["flat", "boxes", "gap"], weather: "petals", trees: "round", flowers: true, slime: "#40c057",
      sky: ["#7cc8f5", "#dff3ff"], far: "#b9dccd", near: "#8fc97c", tree: "#5aa152", grass: "#6cc24a", grassDark: "#4c9a34", dirt: "#a86b42", dirtDark: "#7f4f30", pebble: "#c9925f", sun: "#fff3b0" },
    { name: "Nocny las", foes: ["walker", "spiky", "flyer"], extra: ["foes", "wall"], weather: "fireflies", trees: "pine", night: 0.42, slime: "#94d82d", stars: true,
      sky: ["#0b1026", "#2a3563"], far: "#1d2648", near: "#1b3236", tree: "#11241b", grass: "#3f7a4a", grassDark: "#2b5a35", dirt: "#4a3a2e", dirtDark: "#33281f", pebble: "#5e4b3c", moon: "#f1f3f5" },
    { name: "Kryształowa jaskinia", cave: true, night: 0.6, foes: ["flyer", "walker", "spiky"], extra: ["planks", "crumble"], weather: "dust", trees: "none", slime: "#9775fa",
      sky: ["#1b1f30", "#2c3350"], far: "#262c44", near: "#323a58", tree: "#3e4870", grass: "#8a93b5", grassDark: "#5f678a", dirt: "#4b5170", dirtDark: "#363b55", pebble: "#6a7194" },
    { name: "Lodowe szczyty", ice: true, foes: ["hopper", "spiky", "walker"], extra: ["gap", "crumble"], weather: "snow", trees: "pine", snowcap: true, slime: "#4dabf7",
      sky: ["#8fc1e8", "#eef6fc"], far: "#c3d6e8", near: "#a3bfd8", tree: "#3d6b78", grass: "#f8f9fa", grassDark: "#c5d9ea", dirt: "#7f9bb5", dirtDark: "#5f7b95", pebble: "#b4c9dc", sun: "#ffffff" },
    { name: "Zachód słońca", foes: ["walker", "flyer", "shooter"], extra: ["mover", "planks"], weather: "leaves", trees: "round", flowers: true, slime: "#fab005", sunset: true,
      sky: ["#ff9e6d", "#ffe2b8"], far: "#c48bb0", near: "#d99a6c", tree: "#b0704f", grass: "#9cc84f", grassDark: "#6f9a33", dirt: "#9a5a3a", dirtDark: "#6e3d27", pebble: "#c08260", sun: "#fff1c2" },
    { name: "Ognista góra", lava: true, night: 0.25, foes: ["spiky", "shooter", "hopper", "flyer"], extra: ["spikes", "mover"], weather: "embers", trees: "dead", slime: "#ff6b6b", volcano: true,
      sky: ["#2b0f0e", "#8a3216"], far: "#3c1a17", near: "#4a211b", tree: "#241210", grass: "#5a4743", grassDark: "#3d302d", dirt: "#3a2826", dirtDark: "#26191a", pebble: "#ff7b39" },
  ];

  // etap z losowych odcinków; d (0..1) to trudność; każdy odcinek da się przejść zwykłym skokiem (sprawdza reach w testach)
  function generate(bi, d, rnd = Math.random) {
    const B = BIOMES[bi], MAX = 400;
    const tiles = Array.from({ length: ROWS }, () => new Array(MAX).fill(""));
    let things = [];
    const spots = [], boxes = {};
    const r = (k) => Math.floor(rnd() * k);
    const set = (x, y, v) => { if (x >= 0 && x < MAX && y >= 0 && y < ROWS) tiles[y][x] = v; };
    const fill = (x0, x1, y0, y1, v = "#") => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, v); };
    const ground = (x0, x1, top) => fill(x0, x1, top, ROWS - 1);
    const put = (kind, x, y, extra = {}) => things.push({ kind, x: x * T + 5, y: y * T + 5, ...extra });
    const coins = (x0, y, n) => { for (let k = 0; k < n; k++) put("coin", x0 + k, y); };
    const arc = (x0, y, n) => { for (let k = 0; k < n; k++) put("coin", x0 + k, y - Math.round(Math.sin(((k + 0.5) / n) * Math.PI) * 1.4)); };
    const pit = (x0, x1) => { const v = B.lava ? "L" : rnd() < 0.5 ? "^" : ""; if (v) fill(x0, x1, ROWS - 1, ROWS - 1, v); };
    const walkers = B.foes.filter((f) => f !== "shooter" && f !== "flyer");
    const foe = () => walkers[r(walkers.length)];
    const fly = B.foes.includes("flyer");
    let x = 0, h = 12;
    const land = (n = 3) => { ground(x, x + n - 1, h); x += n; };
    const CH = {
      flat() { const n = 5 + r(4); ground(x, x + n - 1, h); arc(x + 1, h - 2, n - 2); if (rnd() < 0.3 + d * 0.5) put(foe(), x + n - 2, h - 1); spots.push([x + 2 + r(n - 3), h - 3]); x += n; },
      gap() { const w = 2 + (rnd() < d ? 1 : 0); pit(x, x + w - 1); arc(x, h - 2, w); if (fly && d > 0.35 && rnd() < 0.5) put("flyer", x + (w >> 1), h - 5); spots.push([x + (w >> 1), h - 3]); x += w; land(); },
      step() { h = Math.max(8, Math.min(12, h + (rnd() < 0.5 || h >= 12 ? -1 : 1) * (1 + r(2)))); ground(x, x + 4, h); coins(x + 1, h - 2, 3); spots.push([x + 2, h - 3]); x += 5; },
      planks() { const w = 8; pit(x, x + w - 1); fill(x + 2, x + 3, h - 2, h - 2, "="); fill(x + 5, x + 6, h - 3, h - 3, "="); coins(x + 2, h - 4, 2); coins(x + 5, h - 5, 2); spots.push([x + 5 + r(2), h - 6]); x += w; land(); },
      mover() { const w = 6 + r(2), mw = d < 0.5 ? 3 : 2; pit(x, x + w - 1); put("mover", x, h - 2, { x0: x, x1: x + w - mw, w: mw, sp: 18 + d * 14 }); coins(x + 1, h - 4, w - 2); spots.push([x + (w >> 1), h - 5]); x += w; land(); },
      crumble() { const k = 2 + r(2); pit(x, x + 2 * k); for (let i = 0; i < k; i++) { put("crumble", x + 1 + 2 * i, h); put("coin", x + 1 + 2 * i, h - 2); } spots.push([x + 2, h - 3]); x += 2 * k + 1; land(); },
      spikes() { const n = 7, k = 1 + r(1 + Math.round(d * 2)); ground(x, x + n - 1, h); fill(x + 2, x + 1 + k, h - 1, h - 1, B.lava ? "L" : "^"); arc(x + 2, h - 2, k); spots.push([x + 2, h - 4]); x += n; },
      foes() { const n = 9; ground(x, x + n - 1, h); put(foe(), x + 3, h - 1); put(foe(), x + 7, h - 1); if (fly && rnd() < 0.5) put("flyer", x + 5, h - 6); fill(x + 4, x + 5, h - 3, h - 3, "="); coins(x + 4, h - 4, 2); spots.push([x + 4 + r(2), h - 6]); x += n; },
      wall() {
        ground(x, x + 7, h);
        if (d < 0.25 && rnd() < 0.5) { fill(x + 3, x + 4, h - 2, h - 1); coins(x + 3, h - 3, 2); }
        else { put("spring", x + 1, h - 1); fill(x + 3, x + 4, h - 5, h - 1); coins(x + 3, h - 6, 2); spots.push([x + 3 + r(2), h - 7]); }
        x += 8;
      },
      boxes() { const n = 7, k = 1 + r(3); ground(x, x + n - 1, h); for (let i = 0; i < k; i++) { set(x + 2 + i, h - 4, "B"); boxes[`${x + 2 + i},${h - 4}`] = "coin"; } if (rnd() < 0.4) put(foe(), x + n - 1, h - 1); x += n; },
      shooter() { const n = 9; ground(x, x + n - 1, h); put("shooter", x + 7, h - 1); coins(x + 1, h - 2, 3); spots.push([x + 4, h - 3]); x += n; },
      keyup() { h = Math.max(h, 11); const n = 8; ground(x, x + n - 1, h); fill(x + 2, x + 3, h - 3, h - 3, "="); fill(x + 5, x + 6, h - 6, h - 6, "="); put("key", x + 6, h - 8); coins(x + 2, h - 4, 2); x += n; },
      door() { ground(x, x + 5, h); fill(x + 3, x + 3, 0, h - 3, "W"); set(x + 3, h - 2, "D"); set(x + 3, h - 1, "D"); x += 6; },
      check() { ground(x, x + 4, h); put("check", x + 2, h - 1); x += 5; },
    };
    const n = 6 + Math.round(d * 5);
    const pool = ["flat", "gap", "step", "planks", "mover", "spikes", "foes", "wall", ...(d >= 0.2 ? ["crumble"] : []), ...(B.foes.includes("shooter") ? ["shooter", "shooter"] : []), ...B.extra];
    const seq = [];
    for (let i = 0; i < n; i++) { let c; do c = pool[r(pool.length)]; while (c === seq[i - 1]); seq.push(c); }
    seq[r(n)] = "boxes";
    if (d >= 0.3 || rnd() < 0.5) { const a = 1 + r(Math.max(1, (n >> 1) - 1)); seq.splice(a, 0, "keyup"); seq.splice(a + 2 + r(Math.max(1, seq.length - a - 2)), 0, "door"); }
    ground(0, 6, h); put("start", 2, h - 1); x = 7;
    seq.forEach((c, i) => { if (i && i % 3 === 0) CH.check(); CH[c](); });
    ground(x, x + 9, h); arc(x + 1, h - 2, 4); put("goal", x + 6, h - 1); while (spots.length < 3) spots.push([x + 1 + spots.length, h - 4]); x += 10;
    if (B.cave) fill(0, x - 1, 0, 1);
    const keys = Object.keys(boxes);
    boxes[keys[r(keys.length)]] = "bonus";
    // trzy klejnoty w trudniej dostępnych miejscach
    for (let i = spots.length - 1; i > 0; i--) { const j = r(i + 1); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    for (const [gx, gy] of spots.slice(0, 3)) {
      things = things.filter((t) => !(t.kind === "coin" && Math.floor(t.x / T) === gx && Math.floor(t.y / T) === gy));
      put("gem", gx, gy);
    }
    return { w: x, tiles: tiles.map((row) => row.slice(0, x)), things, boxes, biome: bi };
  }

  // osiągalne pola stania (uproszczony model skoku); open: drzwi otwarte
  function reach(L, open) {
    const at = (x, y) => (x < 0 || x >= L.w ? "#" : y < 0 || y >= ROWS ? "" : L.tiles[y][x]);
    const solid = (v) => v === "#" || v === "W" || v === "B" || v === "b" || (v === "D" && !open);
    const support = new Map(), springs = new Set();
    L.things.forEach((t, k) => {
      const tx = Math.floor(t.x / T), ty = Math.floor(t.y / T);
      if (t.kind === "crumble") support.set(`${tx},${ty}`, -1);
      if (t.kind === "mover") for (let c = t.x0; c < t.x1 + t.w; c++) support.set(`${c},${ty}`, k);
      if (t.kind === "spring") springs.add(`${tx},${ty}`);
    });
    const stand = (x, y) => {
      if (y < 0 || y >= ROWS - 1 || x < 0 || x >= L.w) return false;
      const v = at(x, y), u = at(x, y + 1);
      return !solid(v) && v !== "^" && v !== "L" && (solid(u) || u === "=" || support.has(`${x},${y + 1}`));
    };
    const clear = (x, y, x2, y2) => {
      const top = Math.min(y, y2) - 1, s = Math.sign(x2 - x);
      for (let r = top; r <= y; r++) if (solid(at(x, r))) return false;
      if (s) for (let c = x + s; c !== x2; c += s) for (let r = top; r <= top + 1; r++) if (solid(at(c, r))) return false;
      for (let r = top; r <= y2; r++) if (solid(at(x2, r))) return false;
      return true;
    };
    const st = L.things.find((t) => t.kind === "start");
    const s0 = [Math.floor(st.x / T), Math.floor(st.y / T)];
    const seen = new Set([s0.join()]), queue = [s0];
    for (let q = 0; q < queue.length; q++) {
      const [x, y] = queue[q], spring = springs.has(`${x},${y}`), ride = support.get(`${x},${y + 1}`);
      for (let dx = -6; dx <= 6; dx++) for (let dy = -9; dy <= 14; dy++) {
        const x2 = x + dx, y2 = y + dy, key = `${x2},${y2}`;
        if (seen.has(key) || !stand(x2, y2)) continue;
        const up = -dy, ax = Math.abs(dx);
        const same = ride >= 0 && ride === support.get(`${x2},${y2 + 1}`) && dy === 0;
        const jump = spring ? up <= 8 && ax <= 4 : up <= 3 && !(up === 3 && ax > 3) && ax <= (up < 0 ? 5 : 4);
        if (!same && !(jump && clear(x, y, x2, y2))) continue;
        seen.add(key);
        queue.push([x2, y2]);
      }
    }
    return seen;
  }

  return { T, ROWS, BIOMES, generate, reach, last: null };
})();

if (typeof module !== "undefined") module.exports = Platformer;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "przygoda"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, stages: 2, lives: 5, foe: 0.8, d: 0 },
    { key: "medium", name: "Średni", points: 50, stages: 3, lives: 4, foe: 1, d: 0.3 },
    { key: "hard", name: "Trudny", points: 100, stages: 4, lives: 3, foe: 1.3, d: 0.6 },
  ],
  rules: [
    "Dojdź do flagi na końcu każdego etapu. Strzałki albo A i D: bieg, spacja, W albo strzałka w górę: skok (dłuższe przytrzymanie, wyższy skok).",
    "Każda przygoda losuje krainy i etapy: łąkę, nocny las, jaskinię, lodowe szczyty (ślisko), zachód słońca albo ognistą górę z lawą.",
    "Wskocz wrogowi na głowę, żeby go pokonać, ale jeż ma kolce. Uważaj na pociski kwiatów. Kolce, lawa i przepaść zabierają życie; wracasz do flagi kontrolnej.",
    "Uderz głową w złotą skrzynkę: daje monety, a jedna w etapie moc: podwójny skok, tarczę na jedno trafienie albo magnes na monety.",
    "Drzwi w murze otwiera klucz z tego samego etapu. Kruche kładki spadają chwilę po wejściu. W każdym etapie ukryto 3 klejnoty; 50 monet to dodatkowe życie.",
  ],
  achievements: [
    { id: "skarbnik", name: "Skarbnik", desc: "Zbierz 25 monet w jednej przygodzie.", points: 10 },
    { id: "pogromca", name: "Pogromca", desc: "Pokonaj 12 wrogów w jednej przygodzie.", points: 10 },
    { id: "poszukiwacz", name: "Poszukiwacz", desc: "Znajdź wszystkie 3 klejnoty w jednym etapie.", points: 25 },
    { id: "dublet", name: "Dublet", desc: "Pokonaj dwóch wrogów w jednym skoku, bez lądowania.", points: 25 },
    { id: "bez-upadku", name: "Bez upadku", desc: "Ukończ średni poziom bez utraty życia.", points: 25 },
    { id: "legenda", name: "Legenda", desc: "Ukończ trudny poziom bez utraty życia.", points: 50 },
  ],
  mount(board, ctx) {
    const { T, ROWS, BIOMES } = Platformer;
    const lv = ctx.level;
    const VW = 22 * T, VH = ROWS * T;
    const cv = canvasGame(board, ctx, VW, VH, { max: 80 });
    const { g, theme } = cv;
    const s = { stage: 0, lives: lv.lives, coins: 0, gems: 0, gemsAll: 0, kills: 0, level: null, p: null, cam: 0, key: false, dbl: false, shield: false, magnet: 0, inv: 0,
      check: null, dead: 0, t: 0, clear: 0, banner: 0, parts: [], texts: [], rings: [], shots: [], amb: [], shake: 0 };
    Platformer.last = s;
    // kolejność krain: pierwsza spokojna, dalej losowe bez powtórzeń
    const first = pick([0, 1, 4]);
    const route = [first, ...shuffle([0, 1, 2, 3, 4, 5].filter((k) => k !== first))].slice(0, lv.stages);
    const stageEl = el("p", "pl-stage");
    const track = el("div", "pl-track");
    const meDot = el("i", "pl-me");
    const noteEl = el("p", "rl-small");
    ctx.panel.append(panelBlock("", stageEl, track, noteEl));
    const stats = statsBlock(ctx, "Wyprawa", ["Monety", "Klejnoty", "Życia"]);
    const keys = heldKeys(ctx, (k) => { if (k === " " || k === "arrowup" || k === "w") s.jumpBuf = 0.12; });
    const touch = {};
    touchPad(ctx, touch, [["l", "W lewo", "i-left"], ["r", "W prawo", "i-right"], ["j", "Skok", "i-up"]], "c3");
    touch.onTap = (k) => { if (k === "j") s.jumpBuf = 0.12; };
    const biome = () => BIOMES[s.level.biome];

    function load(k) {
      s.stage = k;
      s.level = Platformer.generate(route[k], Math.min(1, lv.d + k * 0.12));
      s.level.bump = {};
      s.key = false;
      s.gems = 0;
      s.clear = 0;
      s.shots = [];
      s.banner = s.t;
      const st = s.level.things.find((t) => t.kind === "start");
      s.check = { x: st.x, y: st.y };
      for (const t of s.level.things) {
        t.alive = true;
        if (t.kind === "walker") t.vx = -14 * lv.foe;
        if (t.kind === "spiky") t.vx = -9 * lv.foe;
        if (t.kind === "hopper") Object.assign(t, { vx: 0, vy: 0, wait: 0.5 + Math.random(), dir: -1, air: false });
        if (t.kind === "flyer") Object.assign(t, { y0: t.y, ph: Math.random() * 6, vx: 16 * lv.foe, x0: t.x });
        if (t.kind === "shooter") Object.assign(t, { cool: 1 + Math.random(), face: -1, fire: -9 });
        if (t.kind === "mover") Object.assign(t, { px: t.x - 5, dir: 1 });
        if (t.kind === "crumble") Object.assign(t, { trig: 0, fall: false, dy: 0, vy: 0 });
      }
      s.plats = s.level.things.filter((t) => t.kind === "mover" || t.kind === "crumble");
      s.amb = Array.from({ length: 28 }, () => ({ x: Math.random() * (VW + 20), y: Math.random() * VH, ph: Math.random() * 6, sp: 0.5 + Math.random() }));
      spawn();
      render();
    }
    function spawn() {
      s.p = { x: s.check.x - 3.5, y: s.check.y - 4, w: 7, h: 9, vx: 0, vy: 0, ground: false, coyote: 0, jumps: 0, face: 1, squash: 0, combo: 0, dust: 0 };
      s.dead = 0;
      s.ghost = null;
      s.inv = s.t + 1;
    }
    const tile = (x, y) => {
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || tx >= s.level.w) return "#";
      if (ty < 0 || ty >= ROWS) return "";
      const v = s.level.tiles[ty][tx];
      return v === "D" && s.key ? "" : v;
    };
    const solid = (v) => v === "#" || v === "D" || v === "W" || v === "B" || v === "b";
    const hazard = (v) => v === "^" || v === "L";
    function die(why) {
      if (s.dead) return;
      const p = s.p;
      s.dead = 1.1;
      s.lives--;
      s.hurt = true;
      s.shake = 1;
      s.ghost = { x: p.x + p.w / 2, y: p.y + p.h / 2, vy: -170, r: 0, face: p.face };
      burst(p.x + p.w / 2, p.y + p.h / 2, theme.c, 16, 60, 120, 1.4);
      Sound.lose();
      render();
      if (s.lives <= 0) return ctx.lose("Koniec przygody", why);
      ctx.toast(why);
    }
    // trafienie przez wroga albo pocisk: tarcza chroni raz, po trafieniu chwila nietykalności
    function hurt(why, fatal) {
      if (s.dead || s.clear) return;
      if (!fatal && s.t < s.inv) return;
      if (!fatal && s.shield) {
        s.shield = false;
        s.inv = s.t + 1.2;
        s.p.vy = -150;
        s.rings.push({ x: s.p.x + s.p.w / 2, y: s.p.y + s.p.h / 2, t: s.t, color: "#74c0fc", r: 16 });
        burst(s.p.x + s.p.w / 2, s.p.y + s.p.h / 2, "#a5d8ff", 14, 55, 30, 1.1);
        Sound.error();
        ctx.toast("Tarcza cię osłoniła");
        render();
        return;
      }
      die(why);
    }
    function hitBox(tx, ty) {
      const L = s.level, key = `${tx},${ty}`;
      L.tiles[ty][tx] = "b";
      L.bump[key] = s.t;
      const cx = tx * T + 5, cy = ty * T;
      if (L.boxes[key] === "bonus") {
        const opts = ["shield", "magnet", ...(s.dbl ? [] : ["power", "power"])];
        L.things.push({ kind: pick(opts), x: cx, y: cy - 6, alive: true, rise: s.t });
        burst(cx, cy, "#fff3bf", 10, 40, 40, 1);
        Sound.line();
      } else {
        addCoin(cx, cy - 4);
        s.parts.push({ x: cx, y: cy - 4, vx: 0, vy: -90, t: 0, life: 0.45, color: "#ffd43b", size: 2.6, grav: 260, coin: true });
      }
    }
    function addCoin(x, y) {
      s.coins++;
      if (s.coins === 25) ctx.achieve("skarbnik");
      burst(x, y, "#ffd43b", 7, 35, 40, 0.8);
      Sound.place(5 + (s.coins % 4));
      if (s.coins % 50 === 0) { s.lives++; pop(x, y - 6, "+1 życie"); ctx.toast("Dodatkowe życie"); }
      render();
    }
    function physics(dt) {
      const p = s.p;
      const dir = (keys.arrowright || keys.d || touch.r ? 1 : 0) - (keys.arrowleft || keys.a || touch.l ? 1 : 0);
      const ice = biome().ice && p.ground;
      const accel = p.ground ? (ice ? 240 : 620) : 380;
      if (dir) { p.vx += dir * accel * dt; p.face = dir; } else p.vx *= Math.pow(p.ground ? (ice ? 0.3 : 0.0005) : 0.2, dt);
      const top = ice ? 82 : 72;
      p.vx = Math.max(-top, Math.min(top, p.vx));
      const holding = keys[" "] || keys.arrowup || keys.w || touch.j;
      s.jumpBuf = Math.max(0, (s.jumpBuf || 0) - dt);
      p.coyote = p.ground ? 0.1 : Math.max(0, p.coyote - dt);
      if (s.jumpBuf > 0 && (p.coyote > 0 || (s.dbl && p.jumps < 2))) {
        const second = p.coyote <= 0;
        p.vy = -205;
        p.jumps = second ? 2 : 1;
        p.coyote = 0;
        s.jumpBuf = 0;
        p.squash = -0.3;
        if (second) s.rings.push({ x: p.x + p.w / 2, y: p.y + p.h, t: s.t, color: "#74c0fc", r: 9 });
        burst(p.x + p.w / 2, p.y + p.h, second ? "#a5d8ff" : "rgba(255,255,255,0.8)", 6, 25, 40, 1);
        Sound.tap();
      }
      // krótkie wciśnięcie: niższy skok
      p.vy += (p.vy < 0 && !holding ? 1100 : 540) * dt;
      p.vy = Math.min(p.vy, 260);
      p.x += p.vx * dt;
      for (const yy of [p.y + 1, p.y + p.h - 1]) {
        if (solid(tile(p.x, yy))) { p.x = Math.floor(p.x / T) * T + T; p.vx = 0; }
        if (solid(tile(p.x + p.w, yy))) { p.x = Math.floor((p.x + p.w) / T) * T - p.w - 0.01; p.vx = 0; }
      }
      const prevBottom = p.y + p.h, fallV = p.vy, was = p.ground;
      p.y += p.vy * dt;
      p.ground = false;
      const feet = [p.x + 1, p.x + p.w - 1];
      if (p.vy >= 0) {
        for (const fx of feet) {
          const v = tile(fx, p.y + p.h), top = Math.floor((p.y + p.h) / T) * T;
          // kładka „=” trzyma tylko od góry
          if (solid(v) || (v === "=" && prevBottom <= top + 0.5)) { p.y = top - p.h; p.vy = 0; p.ground = true; }
        }
      } else for (const fx of feet) {
        if (!solid(tile(fx, p.y))) continue;
        const tx = Math.floor(fx / T), ty = Math.floor(p.y / T);
        if (s.level.tiles[ty]?.[tx] === "B") hitBox(tx, ty);
        else if (fallV < -120) burst(fx, p.y, "rgba(255,255,255,0.6)", 3, 15, 30, 0.7);
        p.y = (ty + 1) * T;
        p.vy = 0;
        break;
      }
      // ruchome i kruche platformy
      for (const m of s.plats) {
        if (m.kind === "crumble" && m.fall) continue;
        const mx = m.kind === "mover" ? m.px : m.x - 5, my = m.y - 5, w = m.kind === "mover" ? m.w * T : T;
        if (p.vy >= 0 && prevBottom <= my + 1 && p.y + p.h >= my && p.x + p.w > mx && p.x < mx + w) {
          p.y = my - p.h; p.vy = 0; p.ground = true;
          if (m.kind === "mover") p.x += m.dir * m.sp * dt;
          else if (!m.trig) { m.trig = s.t; Sound.erase(); }
        }
      }
      if (p.ground) {
        p.jumps = 0;
        p.combo = 0;
        if (!was) { p.squash = 0.25; if (fallV > 140) burst(p.x + p.w / 2, p.y + p.h, ice ? "#e7f5ff" : "rgba(255,255,255,0.7)", 6, 22, 30, 0.9); }
        // kurz spod butów przy biegu
        p.dust -= dt;
        if (Math.abs(p.vx) > 45 && p.dust <= 0) { p.dust = ice ? 0.06 : 0.12; burst(p.x + p.w / 2 - p.face * 3, p.y + p.h, ice ? "#e7f5ff" : "rgba(230,220,200,0.7)", 2, 12, -10, 0.8); }
      }
      p.squash *= Math.pow(0.001, dt);
      const under = tile(p.x + p.w / 2, p.y + p.h - 1);
      if (hazard(under)) hurt(under === "L" ? "Lawa parzy" : "Kolce", true);
      if (p.y > ROWS * T + 10) die("Upadek w przepaść");
    }
    function stomp(t) {
      const p = s.p;
      t.alive = false;
      t.deadT = s.t;
      p.vy = -170;
      p.combo++;
      s.kills++;
      burst(t.x, t.y, t.kind === "hopper" ? biome().slime : t.kind === "flyer" ? "#7950f2" : "#c2410c", 12, 50, 60, 1.3);
      burst(t.x, t.y, "#fff", 6, 30, 0, 1.6);
      Sound.place(8 + Math.min(4, p.combo));
      if (p.combo >= 2) { pop(t.x, t.y - 8, `× ${p.combo}`); ctx.achieve("dublet"); }
      if (s.kills >= 12) ctx.achieve("pogromca");
    }
    function things(dt) {
      const p = s.p, L = s.level, pc = p.x + p.w / 2;
      for (const t of L.things) {
        if (t.kind === "mover") {
          t.px += t.dir * t.sp * dt;
          if (t.px > t.x1 * T || t.px < t.x0 * T) { t.dir *= -1; t.px = Math.max(t.x0 * T, Math.min(t.x1 * T, t.px)); }
          continue;
        }
        if (t.kind === "crumble") {
          if (t.trig && !t.fall && s.t - t.trig > 0.45) t.fall = true;
          if (t.fall) { t.vy += 420 * dt; t.dy += t.vy * dt; }
          if (t.trig && s.t - t.trig > 3.2) Object.assign(t, { trig: 0, fall: false, dy: 0, vy: 0, back: s.t });
          continue;
        }
        if (!t.alive) continue;
        if (t.kind === "walker" || t.kind === "spiky") {
          t.x += t.vx * dt;
          // zawracanie na krawędzi, przy ścianie i przed kolcami
          const ahead = t.x + Math.sign(t.vx) * 5, here = tile(ahead, t.y), below = tile(ahead, t.y + 6);
          if (solid(here) || hazard(here) || !(solid(below) || below === "=")) t.vx *= -1;
        }
        if (t.kind === "hopper") {
          if (!t.air) {
            t.wait -= dt;
            if (t.wait <= 0) {
              if (Math.abs(pc - t.x) < 70) t.dir = Math.sign(pc - t.x) || t.dir;
              const ahead = t.x + t.dir * 14, below = tile(ahead, t.y + 6);
              if (!(solid(below) || below === "=") || hazard(tile(ahead, t.y))) t.dir *= -1;
              Object.assign(t, { air: true, vy: -150, vx: t.dir * 24 * lv.foe });
            }
          } else {
            t.vy += 500 * dt;
            t.x += t.vx * dt;
            if (solid(tile(t.x + Math.sign(t.vx) * 4, t.y))) { t.vx *= -1; t.dir *= -1; }
            t.y += t.vy * dt;
            const v = tile(t.x, t.y + 5);
            if (t.vy > 0 && (solid(v) || v === "=")) { t.y = Math.floor((t.y + 5) / T) * T - 5; Object.assign(t, { air: false, vy: 0, vx: 0, wait: (0.8 + Math.random() * 0.6) / lv.foe, land: s.t }); }
            if (t.y > ROWS * T + 20) t.alive = false;
          }
        }
        if (t.kind === "flyer") {
          t.ph += dt * 2.4;
          t.y = t.y0 + Math.sin(t.ph) * 14;
          t.x += t.vx * dt;
          if (Math.abs(t.x - t.x0) > 30) t.vx *= -1;
        }
        if (t.kind === "shooter") {
          const dx = pc - t.x;
          t.face = Math.sign(dx) || -1;
          t.cool -= dt;
          if (t.cool <= 0 && Math.abs(dx) < 130) {
            t.cool = 2.6 / lv.foe;
            t.fire = s.t;
            s.shots.push({ x: t.x + t.face * 4, y: t.y - 0.5, vx: t.face * 48 * lv.foe, t: 0 });
            Sound.flag();
          }
        }
        if (t.kind === "coin" && !t.got && s.t < s.magnet) {
          const dx = pc - t.x, dy = p.y + p.h / 2 - t.y, dd = Math.hypot(dx, dy);
          if (dd < 45) { t.x += (dx / dd) * 130 * dt; t.y += (dy / dd) * 130 * dt; }
        }
        const hit = Math.abs(pc - t.x) < p.w / 2 + 4 && Math.abs(p.y + p.h / 2 - t.y) < p.h / 2 + 4;
        if (!hit || t.got) continue;
        if (["walker", "spiky", "hopper", "flyer", "shooter"].includes(t.kind)) {
          // deptanie: gracz spada na wroga z góry
          const fromTop = p.vy > 30 && p.y + p.h - t.y < 2;
          if (fromTop && t.kind !== "spiky") stomp(t);
          else if (fromTop) { p.vy = -150; hurt("Jeż ma kolce"); }
          else hurt(t.kind === "shooter" ? "Kwiat cię ugryzł" : "Auć, wróg cię dopadł");
          continue;
        }
        if (t.kind === "coin") { t.got = true; addCoin(t.x, t.y); s.parts.push({ x: t.x, y: t.y, vx: 0, vy: -60, t: 0, life: 0.35, color: "#ffd43b", size: 2.6, grav: 200, coin: true }); }
        if (t.kind === "gem") {
          t.got = true;
          s.gems++;
          s.gemsAll++;
          s.rings.push({ x: t.x, y: t.y, t: s.t, color: "#f783ac", r: 18 });
          burst(t.x, t.y, "#f783ac", 18, 60, 30, 1.2);
          Sound.line();
          pop(t.x, t.y - 8, `${s.gems} z 3`);
          if (s.gems === 3) { ctx.achieve("poszukiwacz"); ctx.toast("Wszystkie klejnoty etapu"); }
          render();
        }
        if (t.kind === "key") { t.got = true; s.key = true; burst(t.x, t.y, "#ffd43b", 14, 45, 20, 1); s.rings.push({ x: t.x, y: t.y, t: s.t, color: "#ffd43b", r: 14 }); Sound.line(); ctx.toast("Masz klucz: drzwi się otworzą"); render(); }
        if (t.kind === "power" || t.kind === "shield" || t.kind === "magnet") {
          t.got = true;
          if (t.kind === "power") { s.dbl = true; ctx.toast("Podwójny skok: skocz drugi raz w powietrzu"); }
          if (t.kind === "shield") { s.shield = true; ctx.toast("Tarcza: wytrzyma jedno trafienie"); }
          if (t.kind === "magnet") { s.magnet = s.t + 20; ctx.toast("Magnes przyciąga monety przez 20 s"); }
          s.rings.push({ x: t.x, y: t.y, t: s.t, color: "#74c0fc", r: 20 });
          burst(t.x, t.y, "#74c0fc", 16, 50, 10, 1.1);
          Sound.win();
          render();
        }
        if (t.kind === "spring" && p.vy > 0) { t.hit = s.t + 0.15; p.vy = -330; p.squash = -0.4; p.combo = 0; Sound.place(9); burst(t.x, t.y - 2, "rgba(255,255,255,0.8)", 5, 30, 40, 0.8); }
        if (t.kind === "check" && s.check.x !== t.x) { s.check = { x: t.x, y: t.y }; t.onT = s.t; burst(t.x + 3, t.y - 4, "#69db7c", 12, 40, 30, 0.9); Sound.line(); ctx.toast("Flaga kontrolna"); }
        if (t.kind === "goal") { t.got = true; s.clear = s.t; p.vx = 0; Sound.win(); return; }
      }
      // pociski kwiatów
      for (const b of s.shots) {
        b.t += dt;
        b.x += b.vx * dt;
        if (solid(tile(b.x, b.y)) || b.t > 4) { b.t = 9; burst(b.x, b.y, "#ffa94d", 4, 20, 30, 0.7); continue; }
        if (Math.abs(pc - b.x) < p.w / 2 + 1.5 && Math.abs(p.y + p.h / 2 - b.y) < p.h / 2 + 1.5) { b.t = 9; hurt("Trafił cię pocisk"); }
      }
      s.shots = s.shots.filter((b) => b.t < 9);
    }
    function nextStage() {
      if (s.stage + 1 >= lv.stages) {
        if (!s.hurt && lv.key === "medium") ctx.achieve("bez-upadku");
        if (!s.hurt && lv.key === "hard") ctx.achieve("legenda");
        render();
        return ctx.win(`Monety: ${s.coins}, klejnoty: ${s.gemsAll}, zostało żyć: ${s.lives}.`);
      }
      load(s.stage + 1);
    }
    s.skip = nextStage; // dla testu e2e: przeglądarka bez okna potrafi wstrzymać klatki

    // --- grafika ---
    const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;
    const SC = 4;
    let terrain = null;
    // statyczny teren etapu rysowany raz do bufora w 4× większej rozdzielczości
    function bakeTerrain() {
      const L = s.level, th = biome();
      terrain = document.createElement("canvas");
      terrain.width = L.w * T * SC;
      terrain.height = VH * SC;
      const b = terrain.getContext("2d");
      b.scale(SC, SC);
      const at = (x, y) => (x < 0 || x >= L.w || y < 0 || y >= ROWS ? "" : L.tiles[y][x]);
      const tufts = !th.ice && !th.lava;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < L.w; x++) {
        const v = L.tiles[y][x], px = x * T, py = y * T;
        if (v === "#") {
          let depth = 0;
          while (depth < 4 && at(x, y - depth - 1) === "#") depth++;
          b.fillStyle = depth > 1 ? th.dirtDark : th.dirt;
          b.fillRect(px - 0.05, py - 0.05, T + 0.1, T + 0.1);
          if (depth === 1) { const gr = b.createLinearGradient(0, py, 0, py + T); gr.addColorStop(0, th.dirt); gr.addColorStop(1, th.dirtDark); b.fillStyle = gr; b.fillRect(px - 0.05, py - 0.05, T + 0.1, T + 0.1); }
          for (let k = 0; k < 2; k++) {
            const h1 = hash(x * 3 + k, y * 7), h2 = hash(y * 5 + k, x * 11);
            b.fillStyle = th.pebble;
            b.globalAlpha = th.lava ? (h2 > 0.6 ? 0.6 : 0.12) : 0.55;
            b.beginPath(); b.ellipse(px + 1.5 + h1 * 7, py + 2 + h2 * 6, 0.8 + h2 * 0.7, 0.55 + h1 * 0.4, 0, 0, Math.PI * 2); b.fill();
            b.globalAlpha = 1;
          }
          if (at(x - 1, y) !== "#") { b.fillStyle = "rgba(0,0,0,0.18)"; b.fillRect(px, py, 0.9, T); }
          if (at(x + 1, y) !== "#") { b.fillStyle = "rgba(255,255,255,0.08)"; b.fillRect(px + T - 0.9, py, 0.9, T); }
          if (at(x, y - 1) !== "#" && y > 0) {
            // czapa z trawy, śniegu albo popiołu z zaokrąglonymi końcami
            const left = at(x - 1, y) !== "#", right = at(x + 1, y) !== "#";
            const ex = (left ? 0.6 : 0) + (right ? 0.6 : 0);
            b.fillStyle = th.grassDark;
            b.beginPath(); b.roundRect(px - (left ? 0.6 : 0), py - 0.4, T + ex, 4, [left ? 2 : 0, right ? 2 : 0, right ? 2 : 0, left ? 2 : 0]); b.fill();
            b.fillStyle = th.grass;
            b.beginPath(); b.roundRect(px - (left ? 0.6 : 0), py - 0.6, T + ex, 3, [left ? 1.6 : 0, right ? 1.6 : 0, right ? 1.6 : 0, left ? 1.6 : 0]); b.fill();
            b.fillStyle = "rgba(255,255,255,0.22)";
            b.fillRect(px, py - 0.4, T, 0.6);
            if (th.ice) {
              // lód: połysk i sople pod krawędzią
              b.fillStyle = "rgba(165,216,255,0.55)"; b.fillRect(px, py + 2.1, T, 0.7);
              b.fillStyle = "rgba(255,255,255,0.9)"; b.fillRect(px + 1 + hash(x, y) * 5, py + 0.4, 2.2, 0.4);
              if (right || left) { b.fillStyle = "#d0ebff"; const ix = right ? px + T - 1.4 : px + 0.4; b.beginPath(); b.moveTo(ix, py + 3); b.lineTo(ix + 0.5, py + 6 + hash(x, y) * 2); b.lineTo(ix + 1, py + 3); b.fill(); }
            }
            if (th.lava) { b.fillStyle = "rgba(255,123,57,0.55)"; for (let k = 0; k < 2; k++) b.fillRect(px + 1 + hash(x * 5 + k, y) * 7, py + 2.4, 1.6, 0.4); }
            if (tufts) for (let k = 0; k < 3; k++) {
              const hh = hash(x * 13 + k, y), bx = px + 1 + hh * 8;
              b.fillStyle = th.grass;
              b.beginPath(); b.moveTo(bx - 0.8, py); b.lineTo(bx, py - 1.6 - hh * 1.2); b.lineTo(bx + 0.8, py); b.fill();
            }
            if (th.flowers && hash(x, y * 3) > 0.78) { const fx = px + 2 + hash(y, x) * 6; b.fillStyle = hash(x, y) > 0.5 ? "#fff" : "#ffd43b"; b.beginPath(); b.arc(fx, py - 1.8, 0.75, 0, Math.PI * 2); b.fill(); b.fillStyle = th.grassDark; b.fillRect(fx - 0.15, py - 1.2, 0.3, 1.2); }
            if (th.cave && hash(x, y * 5) > 0.82) { const fx = px + 2 + hash(y, x) * 6; b.fillStyle = "#a5d8ff"; b.beginPath(); b.moveTo(fx, py - 3); b.lineTo(fx + 1, py); b.lineTo(fx - 1, py); b.fill(); }
          }
        } else if (v === "W") {
          // mur z cegieł nad drzwiami
          b.fillStyle = "#6b6f80"; b.fillRect(px - 0.05, py - 0.05, T + 0.1, T + 0.1);
          b.fillStyle = "#4f5262";
          for (let k = 0; k < 2; k++) { b.fillRect(px, py + k * 5 + 4.6, T, 0.5); b.fillRect(px + (k + y) % 2 * 5 + 2.3, py + k * 5, 0.5, 5); }
          b.fillStyle = "rgba(255,255,255,0.12)"; b.fillRect(px, py, 0.7, T);
        } else if (v === "=") {
          const left = at(x - 1, y) !== "=", right = at(x + 1, y) !== "=";
          b.fillStyle = "#7a4a2c";
          if (left) b.fillRect(px + 1, py + 2.6, 1.1, 3.5);
          if (right) b.fillRect(px + T - 2.1, py + 2.6, 1.1, 3.5);
          b.fillStyle = th.ice ? "#a8c6de" : "#c7895a";
          b.beginPath(); b.roundRect(px - (left ? 0.3 : 0), py, T + (left ? 0.3 : 0) + (right ? 0.3 : 0), 3, [left ? 1.3 : 0, right ? 1.3 : 0, right ? 1.3 : 0, left ? 1.3 : 0]); b.fill();
          b.fillStyle = th.ice ? "#e7f5ff" : "#e2a676";
          b.fillRect(px, py + 0.2, T, 0.7);
          b.fillStyle = "#8d5a3b";
          b.fillRect(px + T - 0.25, py + 0.4, 0.5, 2.4);
        } else if (v === "^") {
          for (let k = 0; k < 3; k++) {
            const sx = px + k * 3.33;
            const gr = b.createLinearGradient(sx, 0, sx + 3.33, 0);
            gr.addColorStop(0, "#f1f3f5"); gr.addColorStop(0.5, "#ced4da"); gr.addColorStop(1, "#868e96");
            b.fillStyle = gr;
            b.beginPath(); b.moveTo(sx + 0.15, py + T); b.lineTo(sx + 1.66, py + T - 6.2); b.lineTo(sx + 3.18, py + T); b.fill();
          }
          b.fillStyle = "#495057";
          b.fillRect(px, py + T - 1, T, 1);
        }
      }
    }
    // pasy tła z paralaksą: daleki i bliski
    const farY = (wx, th) => 78 + Math.sin(wx * 0.035) * 14 + Math.sin(wx * 0.11) * 5 + (th.cave ? -50 + Math.abs(Math.sin(wx * 0.07)) * 30 : 0);
    const nearY = (wx) => 104 + Math.sin(wx * 0.05) * 9 + Math.sin(wx * 0.017) * 6;
    const wrap = (v, span) => ((v % span) + span) % span;
    function drawTree(kind, x, y, k, th) {
      const sz = 4 + hash(k, 1) * 2;
      if (kind === "round") {
        g.fillStyle = th.dirtDark; g.fillRect(x - 0.6, y - 5, 1.2, 5);
        g.fillStyle = th.tree; g.beginPath(); g.arc(x, y - 7, sz, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.arc(x - 1.2, y - 8.2, sz * 0.5, 0, Math.PI * 2); g.fill();
      } else if (kind === "pine") {
        g.fillStyle = th.tree;
        for (let i = 0; i < 3; i++) { const w = sz * (1.2 - i * 0.3), yy = y - 2 - i * 3.4; g.beginPath(); g.moveTo(x - w, yy); g.lineTo(x, yy - 5); g.lineTo(x + w, yy); g.fill(); }
        if (th.snowcap) { g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.moveTo(x - 1.6, y - 10.6); g.lineTo(x, y - 13.2); g.lineTo(x + 1.6, y - 10.6); g.fill(); }
      } else if (kind === "dead") {
        g.strokeStyle = th.tree; g.lineWidth = 1; g.lineCap = "round";
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 11); g.moveTo(x, y - 6); g.lineTo(x - 3, y - 9); g.moveTo(x, y - 8); g.lineTo(x + 3.4, y - 11.5); g.stroke();
      }
    }
    function drawBackdrop() {
      const th = biome();
      const sky = g.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, th.sky[0]);
      sky.addColorStop(1, th.sky[1]);
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, VH);
      if (th.stars) for (let k = 0; k < 40; k++) {
        const x = wrap(hash(k, 2) * VW * 1.5 - s.cam * 0.03, VW), y = hash(k, 5) * 70, a = 0.4 + Math.sin(s.t * 2 + k) * 0.35;
        g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x, y, 0.8, 0.8);
      }
      if (th.sun || th.moon) {
        const sx = th.sunset ? VW * 0.68 : VW * 0.8, sy = th.sunset ? VH * 0.55 : 26;
        const glow = g.createRadialGradient(sx, sy, 2, sx, sy, 40);
        glow.addColorStop(0, th.moon ? "rgba(220,230,255,0.5)" : "rgba(255,248,214,0.9)");
        glow.addColorStop(1, "rgba(255,248,214,0)");
        g.fillStyle = glow;
        g.fillRect(sx - 40, sy - 40, 80, 80);
        g.fillStyle = th.sun || th.moon;
        g.beginPath(); g.arc(sx, sy, th.sunset ? 16 : 9, 0, Math.PI * 2); g.fill();
        if (th.moon) { g.fillStyle = "rgba(160,170,200,0.4)"; g.beginPath(); g.arc(sx - 2.5, sy - 2, 1.8, 0, Math.PI * 2); g.arc(sx + 3, sy + 2.5, 1.2, 0, Math.PI * 2); g.fill(); }
      }
      if (th.volcano) {
        // wulkan w oddali z dymem
        const vx = VW * 0.62 - s.cam * 0.05;
        g.fillStyle = "#2a1210";
        g.beginPath(); g.moveTo(vx - 70, 112); g.lineTo(vx - 14, 44); g.lineTo(vx + 14, 44); g.lineTo(vx + 70, 112); g.fill();
        const gl = g.createRadialGradient(vx, 44, 1, vx, 44, 26);
        gl.addColorStop(0, "rgba(255,146,76,0.9)"); gl.addColorStop(1, "rgba(255,80,40,0)");
        g.fillStyle = gl; g.fillRect(vx - 26, 18, 52, 52);
        for (let k = 0; k < 5; k++) {
          const f = (s.t * 0.12 + k / 5) % 1;
          g.fillStyle = `rgba(60,40,40,${0.5 * (1 - f)})`;
          g.beginPath(); g.arc(vx + Math.sin(f * 4 + k) * 6 + f * 18, 40 - f * 40, 5 + f * 10, 0, Math.PI * 2); g.fill();
        }
      }
      if (!th.cave && !th.stars) {
        g.fillStyle = th.volcano ? "rgba(70,40,36,0.6)" : th.sunset ? "rgba(255,236,214,0.75)" : "rgba(255,255,255,0.85)";
        for (let k = 0; k < 6; k++) {
          const span = VW + 80, x = wrap(k * 97 - s.cam * 0.08 - s.t * 2.5, span) - 40, y = 14 + (k % 3) * 13;
          g.beginPath(); g.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2); g.ellipse(x - 6, y + 1, 7, 3.4, 0, 0, Math.PI * 2); g.ellipse(x + 5, y - 2, 7, 4.4, 0, 0, Math.PI * 2); g.fill();
        }
      }
      // daleki pas gór
      const far = () => { g.beginPath(); g.moveTo(0, VH); for (let x = -20; x <= VW + 20; x += 4) g.lineTo(x, farY(x + s.cam * 0.2, th)); g.lineTo(VW, VH); };
      g.fillStyle = th.far; far(); g.fill();
      if (th.snowcap) { g.save(); g.beginPath(); g.rect(0, 0, VW, 74); g.clip(); g.fillStyle = "rgba(255,255,255,0.9)"; far(); g.fill(); g.restore(); }
      if (th.cave) {
        // stalaktyty i świecące kryształy
        g.fillStyle = th.far;
        for (let k = 0; k < 14; k++) { const x = wrap(k * 41 - s.cam * 0.35, VW + 40) - 20, h = 10 + hash(k, 3) * 22; g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x, h); g.lineTo(x + 5, 0); g.fill(); }
        for (let k = 0; k < 10; k++) {
          const x = wrap(k * 67 - s.cam * 0.45, VW + 40) - 20, y = 40 + hash(k, 9) * 60, a = 0.5 + Math.sin(s.t * 2 + k) * 0.3;
          g.fillStyle = `rgba(116,192,252,${a * 0.35})`;
          g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = `rgba(165,216,255,${a})`;
          g.beginPath(); g.moveTo(x, y - 2.6); g.lineTo(x + 1.4, y); g.lineTo(x, y + 2.6); g.lineTo(x - 1.4, y); g.fill();
        }
      }
      // bliższe wzgórza z drzewami
      g.fillStyle = th.near;
      g.beginPath(); g.moveTo(0, VH);
      for (let x = -20; x <= VW + 20; x += 4) g.lineTo(x, nearY(x + s.cam * 0.45));
      g.lineTo(VW, VH); g.fill();
      if (th.trees !== "none") for (let k = 0; k < 12; k++) {
        const span = VW + 60, x = wrap(k * 53 - s.cam * 0.45, span) - 30;
        drawTree(th.trees, x, nearY(x + s.cam * 0.45), k, th);
      }
    }
    // pyłki w powietrzu zależne od krainy: płatki, świetliki, śnieg, liście, iskry
    function drawWeather(dt) {
      const th = biome(), w = th.weather;
      for (const a of s.amb) {
        if (w === "snow") { a.y += (8 + a.sp * 10) * dt; a.x += Math.sin(s.t + a.ph) * 6 * dt; }
        else if (w === "embers") { a.y -= (10 + a.sp * 14) * dt; a.x += Math.sin(s.t * 2 + a.ph) * 5 * dt; }
        else if (w === "fireflies" || w === "dust") { a.x += Math.sin(s.t * 0.7 + a.ph) * 5 * dt; a.y += Math.cos(s.t * 0.9 + a.ph) * 4 * dt; }
        else { a.y += 6 * a.sp * dt; a.x += (8 + Math.sin(s.t + a.ph) * 6) * dt; }
        if (a.y > VH + 4) a.y = -4;
        if (a.y < -4) a.y = VH + 4;
        const x = wrap(a.x - s.cam * 0.7, VW + 20) - 10;
        if (w === "snow") { g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(x, a.y, 0.5 + a.sp * 0.5, 0, Math.PI * 2); g.fill(); }
        else if (w === "embers") { g.fillStyle = `rgba(255,${120 + a.sp * 60 | 0},50,${0.5 + Math.sin(s.t * 6 + a.ph) * 0.3})`; g.fillRect(x, a.y, 0.9, 0.9); }
        else if (w === "fireflies") { const al = 0.35 + Math.sin(s.t * 3 + a.ph * 3) * 0.35; g.fillStyle = `rgba(255,236,120,${al * 0.3})`; g.beginPath(); g.arc(x, a.y, 2.4, 0, Math.PI * 2); g.fill(); g.fillStyle = `rgba(255,246,170,${al})`; g.beginPath(); g.arc(x, a.y, 0.7, 0, Math.PI * 2); g.fill(); }
        else if (w === "dust") { g.fillStyle = "rgba(200,210,255,0.25)"; g.fillRect(x, a.y, 0.6, 0.6); }
        else {
          g.save(); g.translate(x, a.y); g.rotate(s.t * a.sp * 2 + a.ph);
          g.fillStyle = w === "leaves" ? (a.sp > 1 ? "#e8590c" : "#f08c00") : (a.sp > 1 ? "#ffdeeb" : "#ffffff");
          g.beginPath(); g.ellipse(0, 0, 1.3, 0.6, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
    }
    function burst(x, y, color, n, spd = 40, grav = 120, size = 1.2) {
      for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.6); s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, t: 0, life: 0.35 + Math.random() * 0.35, color, size: size * (0.6 + Math.random() * 0.8), grav }); }
    }
    const pop = (x, y, str) => s.texts.push({ x, y, str, t: 0 });
    function firework() {
      const gl = s.level.things.find((t) => t.kind === "goal");
      burst(gl.x - 10 + Math.random() * 40, 20 + Math.random() * 40, pick(["#ffd43b", "#ff8787", "#74c0fc", "#b2f2bb", "#e599f7"]), 22, 70, 50, 1.2);
      Sound.place(3 + rnd(6));
    }

    cv.loop((dt) => {
      s.t += dt;
      if (!ctx.done) {
        if (s.clear) { if (s.t - s.clear > 1.7) nextStage(); else if (Math.random() < dt * 5) firework(); }
        else if (s.dead) { s.dead -= dt; if (s.dead <= 0) spawn(); }
        else { physics(dt); if (!s.dead) things(dt); }
        if (s.magnet && s.t > s.magnet) { s.magnet = 0; render(); }
      }
      if (s.ghost) { s.ghost.vy += 520 * dt; s.ghost.y += s.ghost.vy * dt; s.ghost.r += dt * 9; }
      const look = s.p.face * 14;
      s.cam += (Math.max(0, Math.min(s.level.w * T - VW, s.p.x + look - VW * 0.42)) - s.cam) * Math.min(1, dt * 5);
      s.parts = s.parts.filter((q) => (q.t += dt) < q.life);
      for (const q of s.parts) { q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      s.texts = s.texts.filter((q) => (q.t += dt) < 0.9);
      s.rings = s.rings.filter((q) => s.t - q.t < 0.45);
      s.shake = Math.max(0, s.shake - dt * 3);
      renderTrack(dt);
      draw(dt);
    });

    function drawThing(t) {
      const bob = Math.sin(s.t * 4 + t.x) * 1;
      const rise = t.rise ? Math.max(0, 1 - (s.t - t.rise) / 0.35) * 6 : 0;
      if (t.kind === "coin") {
        const w = Math.abs(Math.cos(s.t * 3 + t.x * 0.1)) * 3 + 0.4;
        g.fillStyle = "#e8890c";
        g.beginPath(); g.ellipse(t.x, t.y + bob, w, 3.4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffd43b";
        g.beginPath(); g.ellipse(t.x, t.y + bob, Math.max(0.2, w - 0.7), 2.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.fillRect(t.x - w * 0.35, t.y - 1.6 + bob, Math.max(0.3, w * 0.3), 2);
      }
      if (t.kind === "gem") {
        const y = t.y + bob * 1.5, k = 1 + Math.sin(s.t * 4) * 0.08;
        g.fillStyle = "rgba(247,131,172,0.25)"; g.beginPath(); g.arc(t.x, y, 7 * k, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#c2255c"; g.beginPath(); g.moveTo(t.x - 3.6, y - 1.2); g.lineTo(t.x - 2, y - 3.4); g.lineTo(t.x + 2, y - 3.4); g.lineTo(t.x + 3.6, y - 1.2); g.lineTo(t.x, y + 3.8); g.fill();
        g.fillStyle = "#f783ac"; g.beginPath(); g.moveTo(t.x - 3.6, y - 1.2); g.lineTo(t.x - 2, y - 3.4); g.lineTo(t.x + 0.4, y - 3.4); g.lineTo(t.x - 0.6, y - 1.2); g.lineTo(t.x, y + 3.8); g.fill();
        g.fillStyle = "#fff"; g.fillRect(t.x - 1.8, y - 2.8, 1.2, 0.5);
        const sp = (s.t * 1.3 + t.x) % 2;
        if (sp < 0.4) { const a = Math.sin((sp / 0.4) * Math.PI); g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.moveTo(t.x + 3, y - 5.5); g.lineTo(t.x + 3.4, y - 4.4); g.lineTo(t.x + 4.5, y - 4); g.lineTo(t.x + 3.4, y - 3.6); g.lineTo(t.x + 3, y - 2.5); g.lineTo(t.x + 2.6, y - 3.6); g.lineTo(t.x + 1.5, y - 4); g.lineTo(t.x + 2.6, y - 4.4); g.fill(); }
      }
      if (t.kind === "key") {
        g.save(); g.translate(t.x, t.y + bob); g.rotate(Math.sin(s.t * 2) * 0.15);
        g.fillStyle = "rgba(255,212,59,0.3)"; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#f59f00"; g.lineWidth = 1.3; g.beginPath(); g.arc(-2.2, 0, 2, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#f59f00"; g.fillRect(-0.3, -0.6, 5, 1.3); g.fillRect(3, 0.4, 1.1, 1.8); g.fillRect(1.4, 0.4, 1, 1.3);
        g.restore();
      }
      if (t.kind === "power" || t.kind === "shield" || t.kind === "magnet") {
        const y = t.y + bob + rise, pulse = 1 + Math.sin(s.t * 5) * 0.12;
        g.fillStyle = "rgba(77,171,247,0.25)"; g.beginPath(); g.arc(t.x, y, 7 * pulse, 0, Math.PI * 2); g.fill();
        if (t.kind === "power") {
          g.fillStyle = "#1c7ed6"; g.beginPath(); g.moveTo(t.x, y - 4.5); g.lineTo(t.x + 3.2, y); g.lineTo(t.x, y + 4.5); g.lineTo(t.x - 3.2, y); g.fill();
          g.fillStyle = "#a5d8ff"; g.beginPath(); g.moveTo(t.x, y - 4.5); g.lineTo(t.x + 1, y); g.lineTo(t.x, y + 1.5); g.lineTo(t.x - 3.2, y); g.fill();
        } else if (t.kind === "shield") {
          g.fillStyle = "#1971c2"; g.beginPath(); g.moveTo(t.x - 3.6, y - 3.6); g.lineTo(t.x + 3.6, y - 3.6); g.lineTo(t.x + 3.4, y + 0.5); g.quadraticCurveTo(t.x + 2, y + 3.4, t.x, y + 4.4); g.quadraticCurveTo(t.x - 2, y + 3.4, t.x - 3.4, y + 0.5); g.fill();
          g.fillStyle = "#e7f5ff"; g.fillRect(t.x - 0.5, y - 2.8, 1, 5.6); g.fillRect(t.x - 2.6, y - 1, 5.2, 1);
        } else {
          g.strokeStyle = "#e03131"; g.lineWidth = 2; g.beginPath(); g.arc(t.x, y - 0.5, 2.6, Math.PI, 0, true); g.stroke();
          g.fillStyle = "#dee2e6"; g.fillRect(t.x - 3.6, y - 1, 2, 1.6); g.fillRect(t.x + 1.6, y - 1, 2, 1.6);
        }
      }
      if (t.kind === "spring") {
        const c = Math.max(0, (t.hit || 0) - s.t) * 6;
        g.fillStyle = "#495057"; g.beginPath(); g.roundRect(t.x - 4.5, t.y + 3.4, 9, 1.8, 0.8); g.fill();
        g.strokeStyle = "#adb5bd"; g.lineWidth = 0.8; g.beginPath(); g.moveTo(t.x - 3, t.y + 3.4);
        for (let k = 1; k <= 4; k++) g.lineTo(t.x + (k % 2 ? 3 : -3), t.y + 3.4 - k * (1.1 - c * 0.15));
        g.stroke();
        g.fillStyle = "#e03131"; g.beginPath(); g.roundRect(t.x - 4.5, t.y - 1.4 + c * 0.6, 9, 2, 1); g.fill();
        g.fillStyle = "#ff8787"; g.fillRect(t.x - 3.8, t.y - 1.2 + c * 0.6, 7.6, 0.6);
      }
      if (t.kind === "check") {
        const on = s.check.x === t.x, raise = on ? Math.min(1, (s.t - (t.onT || -9)) / 0.4) : 0;
        const fy = t.y - 6 + (1 - raise) * 6;
        g.fillStyle = "#495057"; g.fillRect(t.x - 0.5, t.y - 6, 1, 11);
        g.fillStyle = "#343a40"; g.beginPath(); g.roundRect(t.x - 2, t.y + 4.4, 4, 1.4, 0.6); g.fill();
        g.fillStyle = on ? "#40c057" : "#ced4da";
        g.beginPath(); g.moveTo(t.x + 0.5, fy);
        for (let k = 0; k <= 6; k++) g.lineTo(t.x + 0.5 + k, fy + Math.sin(s.t * 6 + k * 0.8) * (on ? 0.5 : 0.15));
        g.lineTo(t.x + 0.5, fy + 3.8); g.fill();
      }
      if (t.kind === "goal") {
        g.fillStyle = "#343a40"; g.fillRect(t.x - 0.7, t.y - 18, 1.4, 23);
        g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(t.x, t.y - 18.5, 1.6, 0, Math.PI * 2); g.fill();
        const glow = 0.25 + Math.sin(s.t * 3) * 0.12;
        g.fillStyle = `rgba(255,212,59,${glow})`; g.beginPath(); g.arc(t.x, t.y - 18.5, 4, 0, Math.PI * 2); g.fill();
        g.fillStyle = theme.c;
        g.beginPath(); g.moveTo(t.x + 0.7, t.y - 17);
        for (let k = 0; k <= 11; k++) g.lineTo(t.x + 0.7 + k, t.y - 17 + Math.sin(s.t * 5 + k * 0.6) * 0.8);
        for (let k = 11; k >= 0; k--) g.lineTo(t.x + 0.7 + k, t.y - 10.5 + Math.sin(s.t * 5 + k * 0.6) * 0.8);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(t.x + 6, t.y - 13.7 + Math.sin(s.t * 5 + 3) * 0.8, 1.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#495057"; g.beginPath(); g.roundRect(t.x - 3, t.y + 4, 6, 1.6, 0.6); g.fill();
      }
      if (t.kind === "mover") {
        const gr = g.createLinearGradient(0, t.y - 5, 0, t.y - 1);
        gr.addColorStop(0, "#9775fa"); gr.addColorStop(1, "#6741d9");
        g.fillStyle = gr; g.beginPath(); g.roundRect(t.px, t.y - 5, t.w * T, 4, 1.6); g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(t.px + 1, t.y - 4.6, t.w * T - 2, 0.6);
        g.fillStyle = "rgba(255,255,255,0.5)";
        for (let k = 0; k < t.w; k++) { g.beginPath(); g.arc(t.px + k * T + T / 2, t.y - 3, 0.6, 0, Math.PI * 2); g.fill(); }
        // śmigiełko pod spodem
        const sp = Math.abs(Math.sin(s.t * 20)) * 3;
        g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(t.px + t.w * T / 2 - sp, t.y, sp * 2, 0.6);
      }
      if (t.kind === "crumble") {
        if (t.fall && t.dy > 60) return;
        const shake = t.trig && !t.fall ? Math.sin(s.t * 70) * 0.5 : 0, back = t.back ? Math.min(1, (s.t - t.back) / 0.3) : 1;
        const x = t.x - 5 + shake, y = t.y - 5 + t.dy;
        g.globalAlpha = (t.fall ? Math.max(0, 1 - t.dy / 60) : 1) * back;
        g.fillStyle = "#9c7a5b"; g.beginPath(); g.roundRect(x + 0.3, y, T - 0.6, 4.4, 1); g.fill();
        g.fillStyle = "#c4a07a"; g.fillRect(x + 0.8, y + 0.3, T - 1.6, 0.8);
        g.strokeStyle = "#5c4330"; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x + 3, y + 1); g.lineTo(x + 4.4, y + 2.6); g.lineTo(x + 3.6, y + 4.2); g.moveTo(x + 7, y + 0.8); g.lineTo(x + 6.2, y + 2.8); g.stroke();
        g.globalAlpha = 1;
      }
      if (t.kind === "walker") {
        // grzybek na nóżkach
        const step = Math.sin(s.t * 14 + t.x) * 0.9, dir = Math.sign(t.vx) || 1;
        g.fillStyle = "#5c3d2e"; g.beginPath(); g.ellipse(t.x - 2 + step, t.y + 4.2, 1.6, 1, 0, 0, Math.PI * 2); g.ellipse(t.x + 2 - step, t.y + 4.2, 1.6, 1, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f1d3b3"; g.beginPath(); g.roundRect(t.x - 3, t.y - 0.5, 6, 4.6, 1.6); g.fill();
        g.fillStyle = "#c2410c"; g.beginPath(); g.ellipse(t.x, t.y - 0.6 + Math.abs(step) * 0.3, 5.2, 4.2, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(t.x - 2.4, t.y - 2.4, 0.9, 0, Math.PI * 2); g.arc(t.x + 1.6, t.y - 3.3, 0.7, 0, Math.PI * 2); g.arc(t.x + 3.2, t.y - 1.4, 0.55, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.fillRect(t.x - 1.6 + dir * 0.6, t.y + 0.6, 0.9, 1.6); g.fillRect(t.x + 0.7 + dir * 0.6, t.y + 0.6, 0.9, 1.6);
        g.fillRect(t.x - 2 + dir * 0.4, t.y + 0.1, 1.6, 0.4); g.fillRect(t.x + 0.6 + dir * 0.4, t.y + 0.1, 1.6, 0.4);
      }
      if (t.kind === "spiky") {
        // jeż: kolce na grzbiecie, nie da się go zdeptać
        const dir = Math.sign(t.vx) || 1, step = Math.sin(s.t * 12 + t.x) * 0.7;
        g.fillStyle = "#3b2a20";
        for (let k = -3; k <= 3; k++) { const a = -Math.PI / 2 + k * 0.38 - dir * 0.2, bx = t.x + Math.cos(a) * 3.4, by = t.y + 1.2 + Math.sin(a) * 3.4; g.beginPath(); g.moveTo(bx - Math.sin(a) * 1.1, by + Math.cos(a) * 1.1); g.lineTo(t.x + Math.cos(a) * 6.2, t.y + 1.2 + Math.sin(a) * 6.2); g.lineTo(bx + Math.sin(a) * 1.1, by - Math.cos(a) * 1.1); g.fill(); }
        g.fillStyle = "#8d6748"; g.beginPath(); g.ellipse(t.x, t.y + 1.6, 4.4, 3.4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#e9c9a5"; g.beginPath(); g.ellipse(t.x + dir * 3.4, t.y + 2.4, 2, 1.6, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.beginPath(); g.arc(t.x + dir * 2.8, t.y + 1.6, 0.55, 0, Math.PI * 2); g.arc(t.x + dir * 5.2, t.y + 2.6, 0.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#5c3d2e"; g.fillRect(t.x - 2.4 + step, t.y + 4.4, 1.4, 0.9); g.fillRect(t.x + 1.2 - step, t.y + 4.4, 1.4, 0.9);
      }
      if (t.kind === "hopper") {
        // galaretka: kuli się przed skokiem, rozciąga w locie
        const pre = !t.air && t.wait < 0.3 ? (0.3 - t.wait) * 1.2 : 0;
        const land = t.land ? Math.max(0, 0.2 - (s.t - t.land)) * 2 : 0;
        const sx = 1 + pre + land - (t.air ? 0.12 : 0), sy = 1 - pre - land + (t.air ? 0.18 : 0);
        g.save(); g.translate(t.x, t.y + 5); g.scale(sx, sy);
        g.fillStyle = biome().slime; g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-5.4, -8.4, 0, -8.6); g.quadraticCurveTo(5.4, -8.4, 5, 0); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(-2, -6, 1.4, 0.9, -0.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(-1.6 + t.dir * 0.8, -4.4, 1.2, 0, Math.PI * 2); g.arc(1.6 + t.dir * 0.8, -4.4, 1.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.beginPath(); g.arc(-1.4 + t.dir * 1.1, -4.3, 0.55, 0, Math.PI * 2); g.arc(1.8 + t.dir * 1.1, -4.3, 0.55, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      if (t.kind === "flyer") {
        // nietoperz
        const fl = Math.sin(s.t * 18 + t.x) * 2.4;
        g.fillStyle = "#5f3dc4";
        g.beginPath(); g.moveTo(t.x - 2, t.y); g.quadraticCurveTo(t.x - 6, t.y - 3 + fl, t.x - 8, t.y - 1 + fl); g.lineTo(t.x - 6, t.y + 1); g.lineTo(t.x - 4.5, t.y + 0.4); g.lineTo(t.x - 3, t.y + 1.6); g.fill();
        g.beginPath(); g.moveTo(t.x + 2, t.y); g.quadraticCurveTo(t.x + 6, t.y - 3 + fl, t.x + 8, t.y - 1 + fl); g.lineTo(t.x + 6, t.y + 1); g.lineTo(t.x + 4.5, t.y + 0.4); g.lineTo(t.x + 3, t.y + 1.6); g.fill();
        g.fillStyle = "#7950f2"; g.beginPath(); g.ellipse(t.x, t.y, 3, 3.3, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.moveTo(t.x - 2.4, t.y - 2); g.lineTo(t.x - 1.6, t.y - 4.4); g.lineTo(t.x - 0.8, t.y - 2.6); g.moveTo(t.x + 2.4, t.y - 2); g.lineTo(t.x + 1.6, t.y - 4.4); g.lineTo(t.x + 0.8, t.y - 2.6); g.fill();
        g.fillStyle = "#ffe066"; g.beginPath(); g.arc(t.x - 1.1, t.y - 0.4, 0.8, 0, Math.PI * 2); g.arc(t.x + 1.1, t.y - 0.4, 0.8, 0, Math.PI * 2); g.fill();
      }
      if (t.kind === "shooter") {
        // kwiat plujący nasionami; paszcza otwiera się przy strzale
        const open = Math.max(0, 1 - (s.t - t.fire) / 0.3), f = t.face, sway = Math.sin(s.t * 2 + t.x) * 0.6;
        g.fillStyle = "#2b8a3e"; g.fillRect(t.x - 0.5, t.y, 1, 5);
        g.beginPath(); g.ellipse(t.x - 2, t.y + 3.4, 2, 0.9, 0.5, 0, Math.PI * 2); g.ellipse(t.x + 2, t.y + 3.2, 2, 0.9, -0.5, 0, Math.PI * 2); g.fill();
        const hx = t.x + sway, hy = t.y - 0.8;
        g.fillStyle = "#e64980";
        for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + s.t * 0.5; g.beginPath(); g.arc(hx + Math.cos(a) * 3, hy + Math.sin(a) * 3, 1.7, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(hx, hy, 2.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#862e2e"; g.beginPath(); g.ellipse(hx + f * 1.2, hy + 0.4, 1.1 + open * 0.6, 0.5 + open * 1.2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.fillRect(hx + f * 0.6 - 0.3, hy - 1.6, 0.6, 0.9);
      }
    }
    function drawDoors(x0, x1) {
      const L = s.level;
      for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1 && x < L.w; x++) {
        if (L.tiles[y][x] !== "D" || L.tiles[y - 1]?.[x] === "D") continue;
        const px = x * T, py = y * T, h = T * 2;
        if (s.key) { g.fillStyle = "rgba(20,16,30,0.55)"; g.beginPath(); g.roundRect(px + 1, py, T - 2, h, [4, 4, 0, 0]); g.fill(); continue; }
        g.fillStyle = "#8d5a3b"; g.beginPath(); g.roundRect(px + 0.5, py, T - 1, h, [4.5, 4.5, 0, 0]); g.fill();
        g.fillStyle = "#a9714b"; for (let k = 0; k < 3; k++) g.fillRect(px + 1.3 + k * 2.6, py + 1.2, 1.8, h - 1.4);
        g.fillStyle = "#495057"; g.fillRect(px + 0.5, py + 5, T - 1, 1.1); g.fillRect(px + 0.5, py + 14, T - 1, 1.1);
        g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(px + T / 2, py + 10, 1.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.fillRect(px + T / 2 - 0.35, py + 10, 0.7, 1.8);
      }
    }
    // skrzynki i lawa zmieniają się w czasie, więc nie ma ich w buforze terenu
    function drawLive(x0, x1) {
      const L = s.level;
      for (let y = 0; y < ROWS; y++) for (let x = Math.max(0, x0); x <= x1 && x < L.w; x++) {
        const v = L.tiles[y][x], px = x * T, py = y * T;
        if (v === "B" || v === "b") {
          const bt = L.bump[`${x},${y}`], by = py - (bt != null ? Math.max(0, Math.sin(Math.min(1, (s.t - bt) / 0.2) * Math.PI)) * 3 : 0);
          g.fillStyle = v === "B" ? "#e8890c" : "#7f5539"; g.beginPath(); g.roundRect(px + 0.3, by + 0.3, T - 0.6, T - 0.6, 1.4); g.fill();
          g.fillStyle = v === "B" ? "#ffc53d" : "#9c6b4a"; g.beginPath(); g.roundRect(px + 1, by + 1, T - 2, T - 2.4, 1); g.fill();
          g.fillStyle = v === "B" ? "#a35a00" : "#5c3d2e";
          for (const [cx, cy] of [[1.8, 1.8], [8.2, 1.8], [1.8, 7.6], [8.2, 7.6]]) g.fillRect(px + cx - 0.4, by + cy - 0.4, 0.8, 0.8);
          if (v === "B") {
            // pulsująca gwiazdka
            const k = 1 + Math.sin(s.t * 5 + x) * 0.12, cx = px + 5, cy = by + 4.8;
            g.fillStyle = "#fff8db"; g.beginPath();
            for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = (i % 2 ? 1.1 : 2.6) * k; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
            g.fill();
          }
        } else if (v === "L") {
          const gr = g.createLinearGradient(0, py, 0, py + T);
          gr.addColorStop(0, "#ffd43b"); gr.addColorStop(0.3, "#ff922b"); gr.addColorStop(1, "#c92a2a");
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(px - 0.3, py + T);
          for (let k = 0; k <= 5; k++) g.lineTo(px + k * 2 + (k ? (k === 5 ? 0.3 : 0) : -0.3), py + 2 + Math.sin(s.t * 3 + (px + k * 2) * 0.4) * 1.2);
          g.lineTo(px + T + 0.3, py + T); g.fill();
          g.fillStyle = "rgba(255,146,43,0.18)"; g.fillRect(px, py - 6, T, 7);
          if (hash(x, Math.floor(s.t * 1.5)) > 0.93) { const f = (s.t * 1.5) % 1; g.fillStyle = `rgba(255,212,59,${1 - f})`; g.beginPath(); g.arc(px + 5, py + 2 - f * 6, 0.9, 0, Math.PI * 2); g.fill(); }
        }
      }
    }
    function drawBody(x, y, w, h, face, dead) {
      const cx = x + w / 2;
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, theme.c); gr.addColorStop(1, "#d9480f");
      g.fillStyle = gr;
      g.beginPath(); g.roundRect(x, y, w, h - 0.8, [3.4, 3.4, 2.4, 2.4]); g.fill();
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.beginPath(); g.ellipse(cx - face * 1.4, y + 2, 1.2, 0.8, -0.4, 0, Math.PI * 2); g.fill();
      const ex = cx + face * 1.3;
      if (dead) {
        g.strokeStyle = "#1d1f27"; g.lineWidth = 0.5;
        for (const ox of [-1.5, 1.5]) { g.beginPath(); g.moveTo(ex + ox - 0.8, y + 2.8); g.lineTo(ex + ox + 0.8, y + 4.4); g.moveTo(ex + ox + 0.8, y + 2.8); g.lineTo(ex + ox - 0.8, y + 4.4); g.stroke(); }
        return;
      }
      const blink = (s.t % 3.2) < 0.12;
      g.fillStyle = "#fff";
      g.beginPath(); g.ellipse(ex - 1.5, y + 3.6, 1.15, blink ? 0.2 : 1.45, 0, 0, Math.PI * 2); g.ellipse(ex + 1.5, y + 3.6, 1.15, blink ? 0.2 : 1.45, 0, 0, Math.PI * 2); g.fill();
      if (!blink) { g.fillStyle = "#1d1f27"; g.beginPath(); g.arc(ex - 1.5 + face * 0.45, y + 3.8, 0.65, 0, Math.PI * 2); g.arc(ex + 1.5 + face * 0.45, y + 3.8, 0.65, 0, Math.PI * 2); g.fill(); }
    }
    function drawPlayer() {
      const p = s.p;
      if (s.dead) {
        // bohater podskakuje i spada, obracając się
        const gh = s.ghost;
        if (!gh) return;
        g.save(); g.translate(gh.x, gh.y); g.rotate(gh.r); drawBody(-p.w / 2, -p.h / 2, p.w, p.h, gh.face, true); g.restore();
        return;
      }
      if (s.t < s.inv && Math.floor(s.t * 14) % 2 === 0) g.globalAlpha = 0.45;
      const hop = s.clear ? Math.abs(Math.sin((s.t - s.clear) * 8)) * 3 : 0;
      const sq = p.squash, w = p.w * (1 + sq), h = p.h * (1 - sq);
      const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h - hop, cx = x + w / 2;
      const run = p.ground && Math.abs(p.vx) > 8 ? Math.sin(s.t * 22) : 0;
      // szalik powiewający za bohaterem
      const nx = cx - p.face * 1.5, ny = y + 5.6, wave = Math.sin(s.t * 14) * (0.6 + Math.min(1, Math.abs(p.vx) / 60));
      const tx = nx - p.face * (3 + Math.min(4, Math.abs(p.vx) * 0.06)), ty = ny + 1 + wave - Math.min(3, p.vy * 0.012);
      g.strokeStyle = "#e03131"; g.lineWidth = 1.3; g.lineCap = "round";
      g.beginPath(); g.moveTo(nx, ny); g.quadraticCurveTo((nx + tx) / 2, ny + wave * 0.5, tx, ty); g.stroke();
      // nogi
      g.fillStyle = "#3d2a1e";
      const fy = p.y + p.h - hop;
      if (p.ground || s.clear) { g.beginPath(); g.ellipse(cx - 1.8 + run * 1.1, fy - 0.4 - Math.max(0, run) * 0.6, 1.5, 0.9, 0, 0, Math.PI * 2); g.ellipse(cx + 1.8 - run * 1.1, fy - 0.4 - Math.max(0, -run) * 0.6, 1.5, 0.9, 0, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.ellipse(cx - 1.6, fy + 0.2, 1.3, 1, 0, 0, Math.PI * 2); g.ellipse(cx + 1.8, fy - 0.6, 1.3, 1, 0, 0, Math.PI * 2); g.fill(); }
      drawBody(x, y, w, h, p.face, false);
      g.fillStyle = "#e03131"; g.beginPath(); g.roundRect(x + 0.4, y + 5, w - 0.8, 1.2, 0.6); g.fill();
      // listek na głowie
      const sway = Math.sin(s.t * 6) * 0.3 - p.vx * 0.006;
      g.save(); g.translate(cx, y); g.rotate(sway);
      g.fillStyle = "#40c057"; g.beginPath(); g.ellipse(1.4, -1.6, 1.8, 0.9, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2b8a3e"; g.fillRect(-0.25, -1.6, 0.5, 1.8);
      g.restore();
      g.globalAlpha = 1;
      if (s.shield) {
        const r = 8 + Math.sin(s.t * 4) * 0.5;
        g.fillStyle = "rgba(116,192,252,0.18)"; g.strokeStyle = "rgba(165,216,255,0.85)"; g.lineWidth = 0.6;
        g.beginPath(); g.arc(cx, p.y + p.h / 2, r, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.ellipse(cx - 3.4, p.y + p.h / 2 - 4, 1.6, 0.8, -0.7, 0, Math.PI * 2); g.fill();
      }
      if (s.t < s.magnet) {
        const f = (s.t * 1.5) % 1;
        g.strokeStyle = `rgba(255,135,135,${0.5 * (1 - f)})`; g.lineWidth = 0.5;
        g.beginPath(); g.arc(cx, p.y + p.h / 2, 6 + f * 30, 0, Math.PI * 2); g.stroke();
      }
    }
    function draw(dt) {
      if (!terrain || terrain.stage !== s.level) { bakeTerrain(); terrain.stage = s.level; }
      const th = biome();
      const shake = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 3 : 0;
      drawBackdrop();
      g.save();
      g.translate(-Math.round(s.cam * SC) / SC + shake, shake * 0.5);
      const L = s.level, x0 = Math.floor(s.cam / T) - 1, x1 = x0 + 27;
      const sx = Math.max(0, Math.floor(s.cam * SC));
      g.drawImage(terrain, sx, 0, Math.min(terrain.width - sx, (VW + T) * SC), VH * SC, sx / SC, 0, Math.min(terrain.width - sx, (VW + T) * SC) / SC, VH);
      drawDoors(x0, x1);
      drawLive(x0, x1);
      for (const t of L.things) {
        if (t.got || t.kind === "start") continue;
        if (t.x < s.cam - 20 || t.x > s.cam + VW + 40) continue;
        if (!t.alive && t.kind !== "coin") {
          // zdeptany wróg spłaszcza się i znika
          const k = t.deadT ? (s.t - t.deadT) / 0.35 : 1;
          if (k >= 1) continue;
          g.save(); g.globalAlpha = 1 - k; g.translate(t.x, t.y + 5); g.scale(1 + k * 0.5, 1 - k * 0.8); g.translate(-t.x, -t.y - 5); drawThing(t); g.restore();
          continue;
        }
        drawThing(t);
      }
      for (const b of s.shots) {
        g.fillStyle = "rgba(255,169,77,0.35)"; g.beginPath(); g.ellipse(b.x - Math.sign(b.vx) * 2.4, b.y, 3, 1, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#5c3d2e"; g.beginPath(); g.arc(b.x, b.y, 1.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffa94d"; g.beginPath(); g.arc(b.x - 0.4, b.y - 0.4, 0.6, 0, Math.PI * 2); g.fill();
      }
      drawPlayer();
      for (const q of s.parts) {
        g.globalAlpha = 1 - q.t / q.life;
        g.fillStyle = q.color;
        g.beginPath();
        if (q.coin) g.ellipse(q.x, q.y, Math.abs(Math.cos(q.t * 20)) * q.size + 0.3, q.size * 1.2, 0, 0, Math.PI * 2);
        else g.arc(q.x, q.y, q.size, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const q of s.rings) {
        const f = (s.t - q.t) / 0.45;
        g.strokeStyle = q.color; g.globalAlpha = 1 - f; g.lineWidth = 1.2 * (1 - f) + 0.2;
        g.beginPath(); g.arc(q.x, q.y, 2 + f * q.r, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;
      for (const q of s.texts) {
        const y = q.y - q.t * 14;
        g.globalAlpha = Math.min(1, (0.9 - q.t) * 3);
        cv.text(q.str, q.x + 0.4, y + 0.4, { size: 5, weight: 800, color: "rgba(0,0,0,0.5)" });
        cv.text(q.str, q.x, y, { size: 5, weight: 800, color: "#fff" });
      }
      g.globalAlpha = 1;
      g.restore();
      drawWeather(dt);
      if (th.night) {
        // ciemność z kręgiem światła wokół bohatera
        const px = s.p.x + s.p.w / 2 - s.cam, py = s.p.y + s.p.h / 2;
        const v = g.createRadialGradient(px, py, 20, px, py, 150);
        v.addColorStop(0, "rgba(10,12,22,0)");
        v.addColorStop(1, `rgba(10,12,22,${th.night})`);
        g.fillStyle = v;
        g.fillRect(0, 0, VW, VH);
      }
      if (th.lava) { const gl = g.createLinearGradient(0, VH - 30, 0, VH); gl.addColorStop(0, "rgba(255,100,40,0)"); gl.addColorStop(1, `rgba(255,100,40,${0.22 + Math.sin(s.t * 2) * 0.06})`); g.fillStyle = gl; g.fillRect(0, VH - 30, VW, 30); }
      // plansza z nazwą etapu na początku
      const bt = s.t - s.banner;
      if (bt < 2.4) {
        const a = Math.min(1, bt * 4, (2.4 - bt) * 3), y = 30 - (1 - Math.min(1, bt * 4)) * 8;
        g.globalAlpha = a;
        g.fillStyle = "rgba(15,17,26,0.6)"; g.beginPath(); g.roundRect(VW / 2 - 52, y - 14, 104, 26, 13); g.fill();
        cv.text(`Etap ${s.stage + 1} z ${lv.stages}`, VW / 2, y - 6, { size: 5, weight: 600, color: "rgba(255,255,255,0.75)" });
        cv.text(th.name, VW / 2, y + 3.5, { size: 8.5, weight: 800, color: "#fff" });
        g.globalAlpha = 1;
      }
      if (s.clear) {
        const a = Math.min(1, (s.t - s.clear) * 4);
        g.globalAlpha = a;
        cv.text(s.stage + 1 >= lv.stages ? "Przygoda ukończona" : "Etap ukończony", VW / 2 + 0.6, 40.6, { size: 10, weight: 800, color: "rgba(0,0,0,0.45)" });
        cv.text(s.stage + 1 >= lv.stages ? "Przygoda ukończona" : "Etap ukończony", VW / 2, 40, { size: 10, weight: 800, color: "#fff" });
        g.globalAlpha = 1;
      }
    }
    // mini-mapa etapu: flagi kontrolne, klucz, drzwi i meta
    function buildTrack() {
      const L = s.level, W = L.w * T;
      const marks = L.things.filter((t) => ["check", "key", "goal"].includes(t.kind)).map((t) => [t.kind, t.x / W]);
      for (let x = 0; x < L.w; x++) for (let y = 0; y < ROWS; y++) if (L.tiles[y][x] === "D" && L.tiles[y - 1]?.[x] !== "D") marks.push(["door", (x * T + T / 2) / W]);
      track.replaceChildren(...marks.map(([k, f]) => { const m = el("span", `pl-mark ${k}`); m.style.left = `${f * 100}%`; return m; }), meDot);
    }
    let trackT = 0;
    function renderTrack(dt) {
      trackT += dt;
      if (trackT < 0.1) return;
      trackT = 0;
      meDot.style.left = `${Math.max(0, Math.min(1, s.p.x / (s.level.w * T))) * 100}%`;
      track.querySelectorAll(".pl-mark.check").forEach((m) => m.classList.toggle("on", parseFloat(m.style.left) <= (s.check.x / (s.level.w * T)) * 100 + 0.01));
      track.querySelector(".pl-mark.key")?.classList.toggle("got", s.key);
      ctx.progress((s.stage + s.p.x / (s.level.w * T)) / lv.stages);
    }
    function render() {
      if (track.level !== s.level) { track.level = s.level; buildTrack(); }
      stageEl.replaceChildren(el("small", "", `Etap ${s.stage + 1} z ${lv.stages}`), el("b", "", biome().name));
      stats.set("Monety", s.coins);
      stats.set("Klejnoty", `${s.gems} z 3`);
      stats.set("Życia", s.lives);
      const powers = [s.dbl && "podwójny skok", s.shield && "tarcza", s.t < s.magnet && "magnes"].filter(Boolean);
      noteEl.textContent = `Moc: ${powers.join(", ") || "brak"}.${s.key ? " Masz klucz: drzwi są otwarte." : ""}`;
    }
    load(0);
  },
});
