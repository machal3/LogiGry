// Przygoda: platformówka na kafelkach 10 × 10. Etapy budowane poleceniami (ziemia, platformy, kolce, wrogowie…).
// Kafel: "#" ziemia, "=" platforma jednostronna, "^" kolce, "D" drzwi (klucz), puste "". Obiekty osobno.
const Platformer = (() => {
  const T = 10, ROWS = 15;
  // budowniczy etapu: zwraca { w, tiles, things }
  function build(len, ops) {
    const tiles = Array.from({ length: ROWS }, () => new Array(len).fill(""));
    const things = [];
    const set = (x, y, v) => { if (x >= 0 && x < len && y >= 0 && y < ROWS) tiles[y][x] = v; };
    const api = {
      ground: (x0, x1, top) => { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, "#"); },
      block: (x0, x1, y0, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) set(x, y, "#"); },
      plat: (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, "="); },
      spikes: (x0, x1, y) => { for (let x = x0; x <= x1; x++) set(x, y, "^"); },
      door: (x, y) => { set(x, y, "D"); set(x, y - 1, "D"); },
      coins: (x, y, n, dx = 1) => { for (let k = 0; k < n; k++) things.push({ kind: "coin", x: (x + k * dx) * T + 5, y: y * T + 5 }); },
      thing: (kind, x, y, extra = {}) => things.push({ kind, x: x * T + 5, y: y * T + 5, ...extra }),
    };
    ops(api);
    return { w: len, tiles, things };
  }
  const STAGES = [
    () => build(84, (b) => {
      b.ground(0, 12, 12); b.spikes(13, 15, 14); b.ground(16, 31, 12); b.plat(18, 22, 9); b.coins(18, 8, 5);
      b.thing("walker", 26, 11); b.thing("start", 2, 11);
      b.ground(34, 47, 11); b.coins(32, 10, 2); b.thing("check", 37, 10); b.thing("spring", 46, 10);
      b.plat(44, 51, 5); b.thing("key", 50, 4); b.coins(44, 4, 4);
      b.ground(50, 62, 12); b.thing("walker", 55, 11); b.door(60, 11);
      b.spikes(63, 70, 14); b.thing("mover", 63, 10, { x0: 63, x1: 68, w: 3 });
      b.ground(71, 83, 12); b.coins(72, 11, 4); b.thing("goal", 80, 11);
    }),
    () => build(96, (b) => {
      b.block(0, 95, 0, 1); b.ground(0, 10, 12); b.thing("start", 2, 11); b.coins(5, 11, 3);
      b.ground(14, 22, 10); b.spikes(11, 13, 14); b.thing("walker", 18, 9);
      b.thing("power", 21, 9); b.plat(24, 27, 7); b.coins(24, 6, 4); b.spikes(23, 32, 14);
      b.ground(30, 40, 11); b.thing("flyer", 35, 7); b.thing("check", 32, 10);
      b.block(41, 43, 5, 14); b.plat(38, 40, 7); b.coins(41, 4, 3);
      b.ground(44, 56, 12); b.thing("walker", 48, 11); b.thing("walker", 53, 11); b.spikes(50, 51, 11);
      b.plat(57, 60, 9); b.plat(62, 65, 6); b.thing("key", 64, 5); b.spikes(57, 66, 14);
      b.ground(67, 80, 12); b.thing("flyer", 72, 8); b.door(78, 11); b.thing("check", 69, 11);
      b.thing("mover", 81, 10, { x0: 81, x1: 86, w: 3 }); b.spikes(81, 89, 14);
      b.ground(90, 95, 12); b.thing("goal", 93, 11);
    }),
    () => build(104, (b) => {
      b.ground(0, 8, 12); b.thing("start", 2, 11); b.thing("power", 6, 11);
      b.thing("mover", 10, 11, { x0: 10, x1: 15, w: 2 }); b.spikes(9, 19, 14);
      b.ground(20, 30, 12); b.spikes(24, 26, 11); b.thing("walker", 28, 11); b.coins(23, 8, 5);
      b.block(31, 33, 8, 14); b.thing("spring", 30, 11); b.plat(34, 38, 4); b.coins(34, 3, 5);
      b.ground(39, 52, 12); b.thing("check", 40, 11); b.thing("flyer", 46, 8); b.thing("walker", 50, 11);
      b.plat(53, 55, 9); b.thing("mover", 57, 7, { x0: 57, x1: 63, w: 2 }); b.spikes(53, 66, 14); b.plat(64, 66, 9);
      b.ground(67, 78, 12); b.thing("key", 72, 6); b.plat(70, 74, 7); b.thing("walker", 75, 11); b.thing("flyer", 69, 5);
      b.spikes(79, 82, 14); b.ground(83, 92, 11); b.door(90, 10); b.thing("check", 84, 10); b.thing("walker", 87, 10);
      b.thing("mover", 93, 10, { x0: 93, x1: 97, w: 2 }); b.spikes(93, 99, 14);
      b.ground(100, 103, 12); b.thing("goal", 102, 11);
    }),
  ];
  const api = { T, ROWS, STAGES, build, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Platformer;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "przygoda"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, stages: 2, lives: 5, foe: 0.8 },
    { key: "medium", name: "Średni", points: 50, stages: 3, lives: 4, foe: 1 },
    { key: "hard", name: "Trudny", points: 100, stages: 3, lives: 2, foe: 1.35 },
  ],
  rules: [
    "Dojdź do flagi na końcu każdego etapu. Strzałki albo A i D: bieg, spacja, W albo strzałka w górę: skok (dłuższe przytrzymanie, wyższy skok).",
    "Wskocz wrogowi na głowę, żeby go pokonać. Dotknięcie z boku, kolce i upadek w przepaść zabierają życie; wracasz do ostatniej flagi kontrolnej.",
    "Drzwi otwiera klucz z tego samego etapu. Sprężyna wybija wysoko, ruchome platformy wożą, a niebieski kryształ daje podwójny skok. 50 monet to dodatkowe życie.",
  ],
  mount(board, ctx) {
    const { T, ROWS } = Platformer;
    const lv = ctx.level;
    const VW = 22 * T, VH = ROWS * T;
    const cv = canvasGame(board, ctx, VW, VH, { max: 80 });
    const { g, theme } = cv;
    const s = { stage: 0, lives: lv.lives, coins: 0, level: null, p: null, cam: 0, key: false, dbl: false, check: null, dead: 0, t: 0 };
    Platformer.last = s;
    const STAGE_NAMES = ["Zielona łąka", "Kryształowa jaskinia", "Zachód słońca"];
    const statEl = el("div", "td-stats");
    const stageEl = el("p", "pl-stage");
    const track = el("div", "pl-track");
    const meDot = el("i", "pl-me");
    ctx.panel.append(panelBlock("", stageEl, track, statEl));
    const keys = heldKeys(ctx, (k) => { if (k === " " || k === "arrowup" || k === "w") s.jumpBuf = 0.12; });
    const touch = {};
    touchPad(ctx, touch, [["l", "W lewo", "i-left"], ["r", "W prawo", "i-right"], ["j", "Skok", "i-up"]], "c3");
    touch.onTap = (k) => { if (k === "j") s.jumpBuf = 0.12; };

    function load(k) {
      s.stage = k;
      s.level = Platformer.STAGES[k]();
      s.key = false;
      const st = s.level.things.find((t) => t.kind === "start");
      s.check = { x: st.x, y: st.y };
      s.level.things.forEach((t) => { if (t.kind === "walker") Object.assign(t, { vx: -14 * lv.foe, alive: true }); if (t.kind === "flyer") Object.assign(t, { y0: t.y, ph: Math.random() * 6, vx: 16 * lv.foe, x0: t.x, alive: true }); if (t.kind === "mover") Object.assign(t, { px: t.x - 5, dir: 1 }); });
      spawn();
      render();
    }
    function spawn() {
      s.p = { x: s.check.x - 3.5, y: s.check.y - 4, w: 7, h: 9, vx: 0, vy: 0, ground: false, coyote: 0, jumps: 0, face: 1, squash: 0 };
      s.dead = 0;
    }
    const tile = (x, y) => {
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (tx < 0 || tx >= s.level.w) return "#";
      if (ty < 0 || ty >= ROWS) return "";
      const v = s.level.tiles[ty][tx];
      return v === "D" && s.key ? "" : v;
    };
    const solid = (v) => v === "#" || v === "D";
    function die(why) {
      if (s.dead) return;
      s.dead = 1;
      s.lives--;
      s.shake = 1;
      burst(s.p.x + s.p.w / 2, s.p.y + s.p.h / 2, theme.c, 16, 60, 120, 1.4);
      Sound.lose();
      render();
      if (s.lives <= 0) return ctx.lose("Koniec przygody", why);
      ctx.toast(why);
    }
    function physics(dt) {
      const p = s.p, L = s.level;
      const dir = (keys.arrowright || keys.d || touch.r ? 1 : 0) - (keys.arrowleft || keys.a || touch.l ? 1 : 0);
      const accel = p.ground ? 620 : 380;
      if (dir) { p.vx += dir * accel * dt; p.face = dir; } else p.vx *= Math.pow(p.ground ? 0.0005 : 0.2, dt);
      p.vx = Math.max(-72, Math.min(72, p.vx));
      const holding = keys[" "] || keys.arrowup || keys.w || touch.j;
      s.jumpBuf = Math.max(0, (s.jumpBuf || 0) - dt);
      p.coyote = p.ground ? 0.1 : Math.max(0, p.coyote - dt);
      if (s.jumpBuf > 0 && (p.coyote > 0 || (s.dbl && p.jumps < 2))) {
        p.vy = -205;
        p.jumps = p.coyote > 0 ? 1 : 2;
        p.coyote = 0;
        s.jumpBuf = 0;
        p.squash = -0.3;
        burst(p.x + p.w / 2, p.y + p.h, "rgba(255,255,255,0.8)", 6, 25, 40, 1);
        Sound.tap();
      }
      // krótkie wciśnięcie: niższy skok
      p.vy += (p.vy < 0 && !holding ? 1100 : 540) * dt;
      p.vy = Math.min(p.vy, 260);
      // ruch w osi X z kolizjami z kaflami
      p.x += p.vx * dt;
      for (const yy of [p.y + 1, p.y + p.h - 1]) {
        if (solid(tile(p.x, yy))) { p.x = Math.floor(p.x / T) * T + T; p.vx = 0; }
        if (solid(tile(p.x + p.w, yy))) { p.x = Math.floor((p.x + p.w) / T) * T - p.w - 0.01; p.vx = 0; }
      }
      const prevBottom = p.y + p.h;
      p.vyLand = p.vy;
      p.y += p.vy * dt;
      p.ground = false;
      const feet = [p.x + 1, p.x + p.w - 1];
      if (p.vy >= 0) for (const fx of feet) {
        const v = tile(fx, p.y + p.h), top = Math.floor((p.y + p.h) / T) * T;
        // platforma „=” trzyma tylko od góry
        if (solid(v) || (v === "=" && prevBottom <= top + 0.5)) { p.y = top - p.h; p.vy = 0; if (!p.ground) { p.squash = 0.25; if (p.vyLand > 140) burst(p.x + p.w / 2, p.y + p.h, "rgba(255,255,255,0.7)", 5, 20, 30, 0.9); } p.ground = true; p.jumps = 0; }
      } else for (const fx of feet) if (solid(tile(fx, p.y))) { p.y = Math.floor(p.y / T) * T + T; p.vy = 0; }
      // ruchome platformy
      for (const m of L.things.filter((t) => t.kind === "mover")) {
        const mx = m.px, my = m.y - 5, w = m.w * T;
        if (p.vy >= 0 && prevBottom <= my + 1 && p.y + p.h >= my && p.x + p.w > mx && p.x < mx + w) { p.y = my - p.h; p.vy = 0; p.ground = true; p.jumps = 0; p.x += m.dir * 22 * dt; }
      }
      p.squash *= Math.pow(0.001, dt);
      if (tile(p.x + p.w / 2, p.y + p.h - 1) === "^" || tile(p.x + p.w / 2, p.y + p.h + 1) === "^" && p.ground) die("Kolce!");
      if (p.y > ROWS * T + 10) die("Upadek w przepaść");
    }
    function things(dt) {
      const p = s.p, L = s.level;
      for (const t of L.things) {
        if (t.kind === "mover") {
          t.px += t.dir * 22 * dt;
          if (t.px > t.x1 * T || t.px < t.x0 * T) { t.dir *= -1; t.px = Math.max(t.x0 * T, Math.min(t.x1 * T, t.px)); }
          continue;
        }
        if (t.kind === "walker" && t.alive) {
          t.x += t.vx * dt;
          // zawracanie na krawędzi i przy ścianie
          const ahead = t.x + Math.sign(t.vx) * 5;
          if (solid(tile(ahead, t.y)) || (!solid(tile(ahead, t.y + 6)) && tile(ahead, t.y + 6) !== "=")) t.vx *= -1;
        }
        if (t.kind === "flyer" && t.alive) {
          t.ph += dt * 2.4;
          t.y = t.y0 + Math.sin(t.ph) * 14;
          t.x += t.vx * dt;
          if (Math.abs(t.x - t.x0) > 30) t.vx *= -1;
        }
        const hit = Math.abs(p.x + p.w / 2 - t.x) < p.w / 2 + 4 && Math.abs(p.y + p.h / 2 - t.y) < p.h / 2 + 4;
        if (!hit || t.got) continue;
        if ((t.kind === "walker" || t.kind === "flyer") && t.alive) {
          // deptanie: gracz spada na wroga z góry
          if (p.vy > 30 && p.y + p.h - t.y < 2) { t.alive = false; p.vy = -150; burst(t.x, t.y, t.kind === "walker" ? "#c2410c" : "#7950f2", 12, 50, 60, 1.3); burst(t.x, t.y, "#fff", 6, 30, 0, 1.6); Sound.place(8); s.score = (s.score || 0) + 50; }
          else die("Auć! Wróg cię dopadł");
          continue;
        }
        if (t.kind === "coin") { t.got = true; s.coins++; burst(t.x, t.y, "#ffd43b", 7, 35, 40, 0.8); Sound.place(5 + (s.coins % 4)); if (s.coins % 50 === 0) { s.lives++; ctx.toast("Dodatkowe życie!"); } render(); }
        if (t.kind === "key") { t.got = true; s.key = true; burst(t.x, t.y, "#ffd43b", 14, 45, 20, 1); Sound.line(); ctx.toast("Masz klucz: drzwi się otworzą"); render(); }
        if (t.kind === "power") { t.got = true; s.dbl = true; burst(t.x, t.y, "#74c0fc", 16, 50, 10, 1.1); Sound.win(); ctx.toast("Podwójny skok! Skocz drugi raz w powietrzu"); render(); }
        if (t.kind === "spring" && p.vy > 0) { t.hit = s.t + 0.15; p.vy = -330; p.squash = -0.4; Sound.place(9); }
        if (t.kind === "check" && s.check.x !== t.x) { s.check = { x: t.x, y: t.y }; t.on = true; burst(t.x + 3, t.y - 4, "#69db7c", 10, 35, 30, 0.9); Sound.line(); }
        if (t.kind === "goal") {
          t.got = true;
          Sound.win();
          if (s.stage + 1 >= lv.stages) { render(); return ctx.win(`Monety: ${s.coins}, zostało żyć: ${s.lives}.`); }
          ctx.toast(`Etap ${s.stage + 2}!`);
          load(s.stage + 1);
          return;
        }
      }
    }
    // --- grafika ---
    // motywy etapów: łąka, jaskinia, zachód słońca
    const THEMES = [
      { sky: ["#7cc8f5", "#dff3ff"], far: "#b9dccd", near: "#8fc97c", tree: "#5aa152", grass: "#6cc24a", grassDark: "#4c9a34", dirt: "#a86b42", dirtDark: "#7f4f30", pebble: "#c9925f", sun: "#fff3b0" },
      { sky: ["#1b1f30", "#2c3350"], far: "#262c44", near: "#323a58", tree: "#3e4870", grass: "#8a93b5", grassDark: "#5f678a", dirt: "#4b5170", dirtDark: "#363b55", pebble: "#6a7194", cave: true },
      { sky: ["#ff9e6d", "#ffe2b8"], far: "#c48bb0", near: "#d99a6c", tree: "#b0704f", grass: "#9cc84f", grassDark: "#6f9a33", dirt: "#9a5a3a", dirtDark: "#6e3d27", pebble: "#c08260", sun: "#fff1c2" },
    ];
    const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;
    const SC = 4;
    let terrain = null;
    // statyczny teren etapu rysowany raz do bufora w 4× większej rozdzielczości
    function bakeTerrain() {
      const L = s.level, th = THEMES[s.stage];
      terrain = document.createElement("canvas");
      terrain.width = L.w * T * SC;
      terrain.height = VH * SC;
      const b = terrain.getContext("2d");
      b.scale(SC, SC);
      const at = (x, y) => (x < 0 || x >= L.w || y < 0 || y >= ROWS ? "" : L.tiles[y][x]);
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
            b.globalAlpha = 0.55;
            b.beginPath(); b.ellipse(px + 1.5 + h1 * 7, py + 2 + h2 * 6, 0.8 + h2 * 0.7, 0.55 + h1 * 0.4, 0, 0, Math.PI * 2); b.fill();
            b.globalAlpha = 1;
          }
          if (at(x - 1, y) !== "#") { b.fillStyle = "rgba(0,0,0,0.18)"; b.fillRect(px, py, 0.9, T); }
          if (at(x + 1, y) !== "#") { b.fillStyle = "rgba(255,255,255,0.08)"; b.fillRect(px + T - 0.9, py, 0.9, T); }
          if (at(x, y - 1) !== "#") {
            // trawiasta czapa z zaokrąglonymi końcami i kępkami
            const left = at(x - 1, y) !== "#", right = at(x + 1, y) !== "#";
            b.fillStyle = th.grassDark;
            b.beginPath(); b.roundRect(px - (left ? 0.6 : 0), py - 0.4, T + (left ? 0.6 : 0) + (right ? 0.6 : 0), 4, [left ? 2 : 0, right ? 2 : 0, right ? 2 : 0, left ? 2 : 0]); b.fill();
            b.fillStyle = th.grass;
            b.beginPath(); b.roundRect(px - (left ? 0.6 : 0), py - 0.6, T + (left ? 0.6 : 0) + (right ? 0.6 : 0), 3, [left ? 1.6 : 0, right ? 1.6 : 0, right ? 1.6 : 0, left ? 1.6 : 0]); b.fill();
            b.fillStyle = "rgba(255,255,255,0.22)";
            b.fillRect(px, py - 0.4, T, 0.6);
            // kępki trawy i kwiatki
            for (let k = 0; k < 3; k++) {
              const h = hash(x * 13 + k, y), bx = px + 1 + h * 8;
              b.fillStyle = th.grass;
              b.beginPath(); b.moveTo(bx - 0.8, py); b.lineTo(bx, py - 1.6 - h * 1.2); b.lineTo(bx + 0.8, py); b.fill();
            }
            if (!th.cave && hash(x, y * 3) > 0.78) { const fx = px + 2 + hash(y, x) * 6; b.fillStyle = hash(x, y) > 0.5 ? "#fff" : "#ffd43b"; b.beginPath(); b.arc(fx, py - 1.8, 0.75, 0, Math.PI * 2); b.fill(); b.fillStyle = th.grassDark; b.fillRect(fx - 0.15, py - 1.2, 0.3, 1.2); }
          }
        } else if (v === "=") {
          const left = at(x - 1, y) !== "=", right = at(x + 1, y) !== "=";
          b.fillStyle = "#7a4a2c";
          if (left) b.fillRect(px + 1, py + 2.6, 1.1, 3.5);
          if (right) b.fillRect(px + T - 2.1, py + 2.6, 1.1, 3.5);
          b.fillStyle = "#c7895a";
          b.beginPath(); b.roundRect(px - (left ? 0.3 : 0), py, T + (left ? 0.3 : 0) + (right ? 0.3 : 0), 3, [left ? 1.3 : 0, right ? 1.3 : 0, right ? 1.3 : 0, left ? 1.3 : 0]); b.fill();
          b.fillStyle = "#e2a676";
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
    // tło z paralaksą: góry i wzgórza przesuwają się wolniej niż teren
    function drawBackdrop() {
      const th = THEMES[s.stage];
      const sky = g.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, th.sky[0]);
      sky.addColorStop(1, th.sky[1]);
      g.fillStyle = sky;
      g.fillRect(0, 0, VW, VH);
      if (th.sun) {
        const sx = s.stage === 2 ? VW * 0.68 : VW * 0.8, sy = s.stage === 2 ? VH * 0.55 : 26;
        const glow = g.createRadialGradient(sx, sy, 2, sx, sy, 40);
        glow.addColorStop(0, "rgba(255,248,214,0.9)");
        glow.addColorStop(1, "rgba(255,248,214,0)");
        g.fillStyle = glow;
        g.fillRect(sx - 40, sy - 40, 80, 80);
        g.fillStyle = th.sun;
        g.beginPath(); g.arc(sx, sy, s.stage === 2 ? 16 : 9, 0, Math.PI * 2); g.fill();
      }
      if (!th.cave) {
        // chmury
        g.fillStyle = s.stage === 2 ? "rgba(255,236,214,0.75)" : "rgba(255,255,255,0.85)";
        for (let k = 0; k < 6; k++) {
          const span = VW + 80, x = ((k * 97 - s.cam * 0.08 - s.t * 2.5) % span + span) % span - 40, y = 14 + (k % 3) * 13;
          g.beginPath(); g.ellipse(x, y, 12, 4, 0, 0, Math.PI * 2); g.ellipse(x - 6, y + 1, 7, 3.4, 0, 0, Math.PI * 2); g.ellipse(x + 5, y - 2, 7, 4.4, 0, 0, Math.PI * 2); g.fill();
        }
      }
      // daleki pas gór
      g.fillStyle = th.far;
      g.beginPath(); g.moveTo(0, VH);
      for (let x = -20; x <= VW + 20; x += 4) { const wx = x + s.cam * 0.2; g.lineTo(x, 78 + Math.sin(wx * 0.035) * 14 + Math.sin(wx * 0.11) * 5 + (th.cave ? -50 + Math.abs(Math.sin(wx * 0.07)) * 30 : 0)); }
      g.lineTo(VW, VH); g.fill();
      if (th.cave) {
        // stalaktyty i świecące kryształy
        g.fillStyle = th.far;
        for (let k = 0; k < 14; k++) { const x = ((k * 41 - s.cam * 0.35) % (VW + 40) + VW + 40) % (VW + 40) - 20, h = 10 + hash(k, 3) * 22; g.beginPath(); g.moveTo(x - 5, 0); g.lineTo(x, h); g.lineTo(x + 5, 0); g.fill(); }
        for (let k = 0; k < 10; k++) {
          const x = ((k * 67 - s.cam * 0.45) % (VW + 40) + VW + 40) % (VW + 40) - 20, y = 40 + hash(k, 9) * 60, a = 0.5 + Math.sin(s.t * 2 + k) * 0.3;
          g.fillStyle = `rgba(116,192,252,${a * 0.35})`;
          g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
          g.fillStyle = `rgba(165,216,255,${a})`;
          g.beginPath(); g.moveTo(x, y - 2.6); g.lineTo(x + 1.4, y); g.lineTo(x, y + 2.6); g.lineTo(x - 1.4, y); g.fill();
        }
      }
      // bliższe wzgórza z drzewami
      g.fillStyle = th.near;
      g.beginPath(); g.moveTo(0, VH);
      for (let x = -20; x <= VW + 20; x += 4) { const wx = x + s.cam * 0.45; g.lineTo(x, 104 + Math.sin(wx * 0.05) * 9 + Math.sin(wx * 0.017) * 6); }
      g.lineTo(VW, VH); g.fill();
      for (let k = 0; k < 12; k++) {
        const span = VW + 60, x = ((k * 53 - s.cam * 0.45) % span + span) % span - 30, wx = x + s.cam * 0.45, y = 104 + Math.sin(wx * 0.05) * 9 + Math.sin(wx * 0.017) * 6;
        g.fillStyle = th.dirtDark;
        g.fillRect(x - 0.6, y - 5, 1.2, 5);
        g.fillStyle = th.tree;
        g.beginPath(); g.arc(x, y - 7, 4 + hash(k, 1) * 2, 0, Math.PI * 2); g.fill();
      }
    }
    // cząsteczki: kurz, iskry z monet, puf po wrogu
    s.parts = [];
    function burst(x, y, color, n, spd = 40, grav = 120, size = 1.2) {
      for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.6); s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3, t: 0, life: 0.35 + Math.random() * 0.35, color, size: size * (0.6 + Math.random() * 0.8), grav }); }
    }
    s.shake = 0;
    cv.loop((dt) => {
      s.t += dt;
      if (!ctx.done) {
        if (s.dead) { s.dead -= dt * 1.4; if (s.dead <= 0) spawn(); }
        else { physics(dt); if (!s.dead) things(dt); }
      }
      s.cam += (Math.max(0, Math.min(s.level.w * T - VW, s.p.x - VW * 0.4)) - s.cam) * Math.min(1, dt * 6);
      s.parts = s.parts.filter((q) => (q.t += dt) < q.life);
      for (const q of s.parts) { q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      s.shake = Math.max(0, s.shake - dt * 3);
      renderTrack(dt);
      draw();
    });

    function drawThing(t) {
      const bob = Math.sin(s.t * 4 + t.x) * 1;
      if (t.kind === "coin") {
        const w = Math.abs(Math.cos(s.t * 3 + t.x * 0.1)) * 3 + 0.4;
        g.fillStyle = "#e8890c";
        g.beginPath(); g.ellipse(t.x, t.y + bob, w, 3.4, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffd43b";
        g.beginPath(); g.ellipse(t.x, t.y + bob, Math.max(0.2, w - 0.7), 2.7, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.fillRect(t.x - w * 0.35, t.y - 1.6 + bob, Math.max(0.3, w * 0.3), 2);
      }
      if (t.kind === "key") {
        g.save(); g.translate(t.x, t.y + bob); g.rotate(Math.sin(s.t * 2) * 0.15);
        g.fillStyle = "rgba(255,212,59,0.3)"; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#f59f00"; g.lineWidth = 1.3; g.beginPath(); g.arc(-2.2, 0, 2, 0, Math.PI * 2); g.stroke();
        g.fillStyle = "#f59f00"; g.fillRect(-0.3, -0.6, 5, 1.3); g.fillRect(3, 0.4, 1.1, 1.8); g.fillRect(1.4, 0.4, 1, 1.3);
        g.restore();
      }
      if (t.kind === "power") {
        const pulse = 1 + Math.sin(s.t * 5) * 0.12;
        g.fillStyle = "rgba(77,171,247,0.25)"; g.beginPath(); g.arc(t.x, t.y + bob, 7 * pulse, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1c7ed6"; g.beginPath(); g.moveTo(t.x, t.y - 4.5 + bob); g.lineTo(t.x + 3.2, t.y + bob); g.lineTo(t.x, t.y + 4.5 + bob); g.lineTo(t.x - 3.2, t.y + bob); g.fill();
        g.fillStyle = "#a5d8ff"; g.beginPath(); g.moveTo(t.x, t.y - 4.5 + bob); g.lineTo(t.x + 1, t.y + bob); g.lineTo(t.x, t.y + 1.5 + bob); g.lineTo(t.x - 3.2, t.y + bob); g.fill();
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
        const on = s.check.x === t.x;
        g.fillStyle = "#495057"; g.fillRect(t.x - 0.5, t.y - 6, 1, 11);
        g.fillStyle = "#343a40"; g.beginPath(); g.roundRect(t.x - 2, t.y + 4.4, 4, 1.4, 0.6); g.fill();
        g.fillStyle = on ? "#40c057" : "#ced4da";
        g.beginPath(); g.moveTo(t.x + 0.5, t.y - 6);
        for (let k = 0; k <= 6; k++) g.lineTo(t.x + 0.5 + k, t.y - 6 + Math.sin(s.t * 6 + k * 0.8) * (on ? 0.5 : 0.15));
        g.lineTo(t.x + 0.5, t.y - 2.2); g.fill();
      }
      if (t.kind === "goal") {
        g.fillStyle = "#343a40"; g.fillRect(t.x - 0.7, t.y - 18, 1.4, 23);
        g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(t.x, t.y - 18.5, 1.6, 0, Math.PI * 2); g.fill();
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
      }
      if (t.kind === "walker") {
        // grzybek na nóżkach
        const step = Math.sin(s.t * 14 + t.x) * 0.9, dir = Math.sign(t.vx) || 1;
        g.fillStyle = "#5c3d2e"; g.beginPath(); g.ellipse(t.x - 2 + step, t.y + 4.2, 1.6, 1, 0, 0, Math.PI * 2); g.ellipse(t.x + 2 - step, t.y + 4.2, 1.6, 1, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f1d3b3"; g.beginPath(); g.roundRect(t.x - 3, t.y - 0.5, 6, 4.6, 1.6); g.fill();
        g.fillStyle = "#c2410c"; g.beginPath(); g.ellipse(t.x, t.y - 0.6, 5.2, 4.2, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(t.x - 2.4, t.y - 2.4, 0.9, 0, Math.PI * 2); g.arc(t.x + 1.6, t.y - 3.3, 0.7, 0, Math.PI * 2); g.arc(t.x + 3.2, t.y - 1.4, 0.55, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1d1f27"; g.fillRect(t.x - 1.6 + dir * 0.6, t.y + 0.6, 0.9, 1.6); g.fillRect(t.x + 0.7 + dir * 0.6, t.y + 0.6, 0.9, 1.6);
        g.fillRect(t.x - 2 + dir * 0.4, t.y + 0.1, 1.6, 0.4); g.fillRect(t.x + 0.6 + dir * 0.4, t.y + 0.1, 1.6, 0.4);
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
    function drawPlayer() {
      const p = s.p;
      if (s.dead && Math.floor(s.dead * 12) % 2 === 0) return;
      const sq = p.squash, w = p.w * (1 + sq), h = p.h * (1 - sq);
      const x = p.x + p.w / 2 - w / 2, y = p.y + p.h - h, cx = x + w / 2;
      const run = p.ground && Math.abs(p.vx) > 8 ? Math.sin(s.t * 22) : 0;
      // nogi
      g.fillStyle = "#3d2a1e";
      if (p.ground) { g.beginPath(); g.ellipse(cx - 1.8 + run * 1.1, p.y + p.h - 0.4, 1.5, 0.9, 0, 0, Math.PI * 2); g.ellipse(cx + 1.8 - run * 1.1, p.y + p.h - 0.4, 1.5, 0.9, 0, 0, Math.PI * 2); g.fill(); }
      else { g.beginPath(); g.ellipse(cx - 1.6, p.y + p.h + 0.2, 1.3, 1, 0, 0, Math.PI * 2); g.ellipse(cx + 1.8, p.y + p.h - 0.6, 1.3, 1, 0, 0, Math.PI * 2); g.fill(); }
      // ciało z cieniowaniem
      const gr = g.createLinearGradient(0, y, 0, y + h);
      gr.addColorStop(0, theme.c); gr.addColorStop(1, "#d9480f");
      g.fillStyle = gr;
      g.beginPath(); g.roundRect(x, y, w, h - 0.8, [3.4, 3.4, 2.4, 2.4]); g.fill();
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.beginPath(); g.ellipse(cx - p.face * 1.4, y + 2, 1.2, 0.8, -0.4, 0, Math.PI * 2); g.fill();
      // listek na głowie
      const sway = Math.sin(s.t * 6) * 0.3 - p.vx * 0.006;
      g.save(); g.translate(cx, y); g.rotate(sway);
      g.fillStyle = "#40c057"; g.beginPath(); g.ellipse(1.4, -1.6, 1.8, 0.9, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2b8a3e"; g.fillRect(-0.25, -1.6, 0.5, 1.8);
      g.restore();
      // oczy z mrugnięciem
      const blink = (s.t % 3.2) < 0.12;
      const ex = cx + p.face * 1.3;
      g.fillStyle = "#fff";
      g.beginPath(); g.ellipse(ex - 1.5, y + 3.6, 1.15, blink ? 0.2 : 1.45, 0, 0, Math.PI * 2); g.ellipse(ex + 1.5, y + 3.6, 1.15, blink ? 0.2 : 1.45, 0, 0, Math.PI * 2); g.fill();
      if (!blink) { g.fillStyle = "#1d1f27"; g.beginPath(); g.arc(ex - 1.5 + p.face * 0.45, y + 3.8, 0.65, 0, Math.PI * 2); g.arc(ex + 1.5 + p.face * 0.45, y + 3.8, 0.65, 0, Math.PI * 2); g.fill(); }
      if (s.dbl) { g.fillStyle = "#4dabf7"; g.beginPath(); g.roundRect(x + 0.6, y + h - 3.6, w - 1.2, 1.1, 0.5); g.fill(); }
    }
    function drawHud() {
      // monety, życia i klucz w rogu ekranu
      g.fillStyle = "rgba(21,22,27,0.35)";
      g.beginPath(); g.roundRect(4, 4, 26 + Math.min(6, s.lives) * 5.6, 12, 6); g.fill();
      g.fillStyle = "#ffd43b"; g.beginPath(); g.arc(11, 10, 3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e8890c"; g.fillRect(10.6, 8.4, 0.8, 3.2);
      g.fillStyle = "#fff"; g.font = "700 6.5px Geist, system-ui, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText(s.coins, 16, 10.4);
      for (let k = 0; k < Math.min(6, s.lives); k++) {
        const hx = 27 + k * 5.6, hy = 9;
        g.fillStyle = "#ff6b6b"; g.beginPath(); g.moveTo(hx, hy + 3.2); g.bezierCurveTo(hx - 3.4, hy + 0.6, hx - 2, hy - 2.6, hx, hy - 0.6); g.bezierCurveTo(hx + 2, hy - 2.6, hx + 3.4, hy + 0.6, hx, hy + 3.2); g.fill();
      }
      if (s.key) { const kx = 34 + Math.min(6, s.lives) * 5.6; g.fillStyle = "rgba(21,22,27,0.35)"; g.beginPath(); g.roundRect(kx, 4, 14, 12, 6); g.fill(); g.strokeStyle = "#ffd43b"; g.lineWidth = 1; g.beginPath(); g.arc(kx + 5, 10, 1.6, 0, Math.PI * 2); g.stroke(); g.fillStyle = "#ffd43b"; g.fillRect(kx + 6.4, 9.5, 4, 1); g.fillRect(kx + 9, 10, 0.9, 1.6); }
      g.textBaseline = "alphabetic";
    }
    function draw() {
      if (!terrain || terrain.stage !== s.level) { bakeTerrain(); terrain.stage = s.level; }
      const shake = s.shake > 0 ? (Math.random() - 0.5) * s.shake * 3 : 0;
      drawBackdrop();
      g.save();
      g.translate(-Math.round(s.cam * SC) / SC + shake, shake * 0.5);
      const L = s.level, x0 = Math.floor(s.cam / T), x1 = x0 + 27;
      const sx = Math.max(0, Math.floor(s.cam * SC));
      g.drawImage(terrain, sx, 0, Math.min(terrain.width - sx, (VW + T) * SC), VH * SC, sx / SC, 0, Math.min(terrain.width - sx, (VW + T) * SC) / SC, VH);
      drawDoors(x0, x1);
      for (const t of L.things) {
        if (t.got || t.kind === "start") continue;
        if ((t.kind === "walker" || t.kind === "flyer") && !t.alive) continue;
        if (t.x < s.cam - 20 || t.x > s.cam + VW + 40) continue;
        drawThing(t);
      }
      drawPlayer();
      for (const q of s.parts) { g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      g.restore();
      if (THEMES[s.stage].cave) {
        // w jaskini światło tylko wokół bohatera
        const px = s.p.x + s.p.w / 2 - s.cam, py = s.p.y + s.p.h / 2;
        const v = g.createRadialGradient(px, py, 20, px, py, 150);
        v.addColorStop(0, "rgba(10,12,22,0)");
        v.addColorStop(1, "rgba(10,12,22,0.6)");
        g.fillStyle = v;
        g.fillRect(0, 0, VW, VH);
      }
      drawHud();
    }
    // mini-mapa etapu: flagi kontrolne, klucz, drzwi i meta
    function buildTrack() {
      const L = s.level, W = L.w * T;
      const marks = L.things.filter((t) => ["check", "key", "goal", "power"].includes(t.kind)).map((t) => [t.kind, t.x / W]);
      for (let x = 0; x < L.w; x++) for (let y = 0; y < ROWS; y++) if (L.tiles[y][x] === "D" && L.tiles[y - 1]?.[x] !== "D") marks.push(["door", (x * T + T / 2) / W]);
      track.replaceChildren(...marks.map(([k, f]) => { const m = el("span", `pl-mark ${k}`); m.style.left = `${f * 100}%`; m.dataset.kind = k; return m; }), meDot);
    }
    let trackT = 0;
    function renderTrack(dt) {
      trackT += dt;
      if (trackT < 0.1) return;
      trackT = 0;
      meDot.style.left = `${Math.max(0, Math.min(1, s.p.x / (s.level.w * T))) * 100}%`;
      track.querySelectorAll(".pl-mark.check").forEach((m, k) => m.classList.toggle("on", parseFloat(m.style.left) <= (s.check.x / (s.level.w * T)) * 100 + 0.01));
      track.querySelector(".pl-mark.key")?.classList.toggle("got", s.key);
      track.querySelector(".pl-mark.power")?.classList.toggle("got", s.dbl);
      ctx.progress((s.stage + s.p.x / (s.level.w * T)) / lv.stages);
    }
    function render() {
      if (track.dataset.level !== String(s.stage) + s.level.w) { track.dataset.level = String(s.stage) + s.level.w; buildTrack(); }
      stageEl.replaceChildren(el("small", "", `Etap ${s.stage + 1} z ${lv.stages}`), el("b", "", STAGE_NAMES[s.stage]));
      statEl.replaceChildren(...[["Monety", s.coins, "gold"], ["Życia", s.lives, "lives"], ["Skok", s.dbl ? "podwójny" : "zwykły", ""]].map(([k, v, c]) => { const d = el("span", `td-stat ${c}`); d.append(el("small", "", k), el("b", "", v)); return d; }));
      if (s.key) statEl.append(el("p", "rl-small fm-goal", "Masz klucz: drzwi są otwarte."));
    }
    load(0);
  },
});
