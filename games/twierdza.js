// Twierdza (tower defense): wrogowie idą drogą do bramy; wieże stawiane obok drogi strzelają do nich same.
// Mapa: siatka 16 × 11 pól po 10 jednostek, droga jako lista punktów zwrotnych (pola). Latający lecą prosto do bramy.
const TowerDefense = (() => {
  const COLS = 16, ROWS = 11, S = 10;
  const MAPS = {
    easy: [[0, 2], [5, 2], [5, 7], [10, 7], [10, 3], [15, 3]],
    medium: [[0, 1], [3, 1], [3, 8], [7, 8], [7, 2], [12, 2], [12, 8], [15, 8]],
    hard: [[0, 5], [2, 5], [2, 1], [6, 1], [6, 9], [9, 9], [9, 3], [13, 3], [13, 7], [15, 7]],
  };
  const TOWERS = {
    archer: { name: "Łucznik", cost: 50, range: 30, dmg: 7, rate: 0.55, color: "#2f9e44", desc: "Szybkie strzały, trafia też latających." },
    cannon: { name: "Armata", cost: 90, range: 26, dmg: 16, rate: 1.5, splash: 11, ground: true, color: "#495057", desc: "Pociski z rozpryskiem. Nie sięga latających." },
    frost: { name: "Mróz", cost: 70, range: 24, dmg: 2, rate: 0.9, slow: 0.45, splash: 8, color: "#4dabf7", desc: "Spowalnia wrogów wokół celu." },
    tesla: { name: "Tesla", cost: 120, range: 24, dmg: 11, rate: 1.1, chain: 3, color: "#ae3ec9", desc: "Piorun przeskakuje na kilku wrogów." },
    sniper: { name: "Snajper", cost: 150, range: 70, dmg: 48, rate: 2.4, color: "#e8590c", desc: "Daleki zasięg, celuje w najsilniejszych." },
  };
  const ENEMIES = {
    grunt: { hp: 32, sp: 12, gold: 5, color: "#e03131", r: 3 },
    fast: { hp: 18, sp: 23, gold: 4, color: "#fab005", r: 2.6 },
    tank: { hp: 95, sp: 8, gold: 10, armor: 4, color: "#5c636a", r: 4 },
    flyer: { hp: 30, sp: 14, gold: 7, fly: true, color: "#15aabf", r: 3 },
    healer: { hp: 55, sp: 11, gold: 8, regen: 4, color: "#40c057", r: 3.2 },
    boss: { hp: 1300, sp: 6.5, gold: 120, armor: 3, color: "#862e9c", r: 6 },
  };
  // pola drogi (do sprawdzania, gdzie wolno budować)
  function pathCells(map) {
    const cells = new Set();
    for (let k = 1; k < map.length; k++) {
      const [x0, y0] = map[k - 1], [x1, y1] = map[k];
      for (let t = 0; t <= Math.abs(x1 - x0) + Math.abs(y1 - y0); t++) {
        const x = x0 + Math.sign(x1 - x0) * Math.min(t, Math.abs(x1 - x0)), y = y0 + Math.sign(y1 - y0) * Math.max(0, t - Math.abs(x1 - x0));
        cells.add(y * COLS + x);
      }
    }
    return cells;
  }
  // skład fali: coraz więcej i coraz silniejszych wrogów
  function wave(w, total) {
    const list = [];
    const n = 6 + Math.floor(w * 1.6);
    for (let k = 0; k < n; k++) {
      let type = "grunt";
      if (w >= 2 && k % 4 === 1) type = "fast";
      if (w >= 3 && k % 5 === 2) type = "tank";
      if (w >= 4 && k % 6 === 3) type = "flyer";
      if (w >= 6 && k % 7 === 4) type = "healer";
      list.push(type);
    }
    if (w % 5 === 0) list.push("tank", "tank");
    if (w === total) list.push("boss");
    return list;
  }
  const stat = (t, key) => TOWERS[t.type][key] * (key === "dmg" ? [1, 1.6, 2.5][t.tier] : key === "range" ? [1, 1.12, 1.25][t.tier] : key === "rate" ? [1, 0.88, 0.75][t.tier] : 1);
  const upgradeCost = (t) => Math.round(TOWERS[t.type].cost * [0.7, 1.1][t.tier]);
  const api = { COLS, ROWS, S, MAPS, TOWERS, ENEMIES, pathCells, wave, stat, upgradeCost, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = TowerDefense;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "twierdza"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, map: "easy", waves: 10, gold: 220, lives: 20, hp: 1 },
    { key: "medium", name: "Średni", points: 50, map: "medium", waves: 15, gold: 180, lives: 15, hp: 1.15 },
    { key: "hard", name: "Trudny", points: 100, map: "hard", waves: 20, gold: 160, lives: 10, hp: 1.3 },
  ],
  rules: [
    "Wybierz wieżę w panelu i kliknij wolne pole obok drogi, żeby ją postawić. Wieże strzelają same do wrogów w zasięgu.",
    "Kliknij postawioną wieżę, żeby ją ulepszyć (dwa razy), zmienić cel albo sprzedać za część ceny.",
    "Armata nie sięga latających, mróz spowalnia, tesla razi kilku wrogów naraz, a snajper sięga daleko. Pancerni wrogowie odejmują część obrażeń każdego trafienia, więc lepiej bić ich mocnymi strzałami.",
    "Falę wzywasz przyciskiem. Wcześniejsze wezwanie daje premię złota. Ostatnia fala przyprowadza bossa. Wróg, który dojdzie do bramy, zabiera życia.",
  ],
  mount(board, ctx) {
    const { COLS, ROWS, S, TOWERS, ENEMIES } = TowerDefense;
    const lv = ctx.level;
    const map = TowerDefense.MAPS[lv.map];
    const road = TowerDefense.pathCells(map);
    const W = COLS * S, H = ROWS * S;
    const pts = map.map(([x, y]) => [x * S + S / 2, y * S + S / 2]);
    pts[0][0] -= S / 2; // wejście od krawędzi
    pts[pts.length - 1][0] += S / 2;
    const segLen = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
    const pathLen = segLen.reduce((a, b) => a + b, 0);
    const at = (d) => {
      for (let k = 0; k < segLen.length; k++) {
        if (d <= segLen[k]) { const f = d / segLen[k]; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f]; }
        d -= segLen[k];
      }
      return pts[pts.length - 1];
    };
    const cv = canvasGame(board, ctx, W, H, { max: 90 });
    const { g, theme } = cv;
    const s = { gold: lv.gold, lives: lv.lives, wave: 0, towers: [], enemies: [], shots: [], fx: [], queue: [], spawnT: 0, speed: 1, build: null, sel: null, hover: -1, kills: 0, waveDone: true };
    TowerDefense.last = s;

    // panel: złoto i życia, sklep, wybrana wieża, przycisk fali
    const statsEl = el("div", "td-stats");
    ctx.panel.append(panelBlock("", statsEl));
    const shop = el("div", "td-shop");
    const shopBtns = Object.entries(TOWERS).map(([type, t]) => {
      const b = button("", "td-buy", () => { s.build = s.build === type ? null : type; s.sel = null; Sound.tap(); render(); });
      b.style.setProperty("--tc", t.color);
      const label = el("b", "", t.name);
      label.append(el("small", "", t.desc));
      b.append(el("i"), label, el("span", "", `${t.cost}`));
      b.title = t.desc;
      shop.append(b);
      return [type, b];
    });
    ctx.panel.append(panelBlock("Wieże", shop));
    const selBox = el("div", "td-sel");
    const selBlock = panelBlock("Wybrana wieża", selBox);
    ctx.panel.append(selBlock);
    const waveBtn = button("", "btn wide", () => callWave());
    const speedSeg = segmented("Prędkość", ["×1", "×2"], (k) => { s.speed = k + 1; speedSeg.set(k); });
    speedSeg.set(0);
    ctx.panel.append(panelBlock("", waveBtn, speedSeg.el));

    function callWave() {
      if (ctx.done || s.wave >= lv.waves) return;
      // wcześniejsze wezwanie: premia za pozostałych wrogów w kolejce
      if (!s.waveDone) { s.gold += 10 + s.queue.length * 2; ctx.toast("Premia za szybkie wezwanie"); }
      s.wave++;
      s.queue.push(...TowerDefense.wave(s.wave, lv.waves));
      s.waveDone = false;
      Sound.line();
      render();
    }
    function spawn(type) {
      const e = ENEMIES[type];
      const hp = e.hp * lv.hp * Math.pow(1.11, s.wave - 1);
      s.enemies.push({ type, hp, max: hp, d: 0, x: pts[0][0], y: pts[0][1], slow: 0, ...e, sp0: e.sp });
    }
    const towerAt = (i) => s.towers.find((t) => t.i === i);
    function place(i) {
      const t = TOWERS[s.build];
      if (road.has(i) || towerAt(i)) { Sound.error(); return; }
      if (s.gold < t.cost) { Sound.error(); ctx.toast("Za mało złota"); return; }
      s.gold -= t.cost;
      s.towers.push({ i, type: s.build, tier: 0, cd: 0, aim: 0, mode: s.build === "sniper" ? "strong" : "first", spent: t.cost, kills: 0 });
      Sound.place(5);
      s.fx.push({ kind: "ring", x: (i % COLS) * S + S / 2, y: ((i / COLS) | 0) * S + S / 2, t: 0.5, color: t.color });
      render();
    }
    ctx.on(cv.cv, "pointermove", (e) => { const [x, y] = cv.at(e); s.hover = Math.min(ROWS - 1, (y / S) | 0) * COLS + Math.min(COLS - 1, (x / S) | 0); });
    ctx.on(cv.cv, "pointerleave", () => (s.hover = -1));
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done) return;
      const [x, y] = cv.at(e);
      const i = Math.min(ROWS - 1, (y / S) | 0) * COLS + Math.min(COLS - 1, (x / S) | 0);
      s.hover = i;
      const t = towerAt(i);
      if (t) { s.sel = t; s.build = null; Sound.tap(); return render(); }
      if (s.build) return place(i);
      s.sel = null;
      render();
    });
    heldKeys(ctx, (k) => {
      if (k === "escape") { s.build = null; s.sel = null; render(); }
      const types = Object.keys(TOWERS);
      if (/^[1-5]$/.test(k)) { s.build = types[+k - 1]; s.sel = null; render(); }
      if (k === " " || k === "enter") callWave();
    });

    // cel wieży według trybu: pierwszy na drodze, najsilniejszy, najbliższy
    function target(t, range) {
      const tx = (t.i % COLS) * S + S / 2, ty = ((t.i / COLS) | 0) * S + S / 2;
      const cand = s.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - tx, e.y - ty) <= range && !(TOWERS[t.type].ground && e.fly));
      if (!cand.length) return null;
      if (t.mode === "strong") return cand.reduce((a, b) => (b.hp > a.hp ? b : a));
      if (t.mode === "near") return cand.reduce((a, b) => (Math.hypot(b.x - tx, b.y - ty) < Math.hypot(a.x - tx, a.y - ty) ? b : a));
      return cand.reduce((a, b) => (b.prog > a.prog ? b : a));
    }
    function hurt(e, dmg) {
      const real = Math.max(dmg * 0.25, dmg - (e.armor || 0));
      e.hp -= real;
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        s.gold += e.gold;
        s.kills++;
        s.fx.push({ kind: "pop", x: e.x, y: e.y, t: 0.4, color: e.color, r: e.r });
        if (e.type === "boss") Sound.win(); else Sound.place(1 + (s.kills % 6));
      }
    }
    function step(dt) {
      s.spawnT -= dt;
      if (s.queue.length && s.spawnT <= 0) { spawn(s.queue.shift()); s.spawnT = Math.max(0.35, 1 - s.wave * 0.03); }
      for (const e of s.enemies) {
        if (e.regen) e.hp = Math.min(e.max, e.hp + e.regen * dt);
        e.slow = Math.max(0, e.slow - dt);
        const sp = e.sp0 * (e.slow > 0 ? 1 - e.slowK : 1);
        if (e.fly) {
          // latający: prosto do bramy
          const [gx, gy] = pts[pts.length - 1], d = Math.hypot(gx - e.x, gy - e.y);
          if (d < 1) e.d = pathLen + 1;
          else { e.x += ((gx - e.x) / d) * sp * dt; e.y += ((gy - e.y) / d) * sp * dt; e.prog = 1 - d / W; }
        } else {
          e.d += sp * dt;
          [e.x, e.y] = at(e.d);
          e.prog = e.d / pathLen;
        }
        if (e.d >= pathLen && !e.dead) {
          e.dead = true;
          s.lives -= e.type === "boss" ? 10 : 1;
          Sound.error();
          s.fx.push({ kind: "gate", t: 0.5 });
        }
      }
      for (const t of s.towers) {
        t.cd -= dt;
        const range = TowerDefense.stat(t, "range");
        const e = target(t, range);
        if (!e) continue;
        const tx = (t.i % COLS) * S + S / 2, ty = ((t.i / COLS) | 0) * S + S / 2;
        t.aim = Math.atan2(e.y - ty, e.x - tx);
        if (t.cd > 0) continue;
        t.cd = TowerDefense.stat(t, "rate");
        const T = TOWERS[t.type], dmg = TowerDefense.stat(t, "dmg");
        if (t.type === "tesla") {
          // łańcuch: z celu na najbliższych kolejnych wrogów
          const hit = [e];
          while (hit.length < T.chain + t.tier) {
            const last = hit[hit.length - 1];
            const nx = s.enemies.filter((q) => q.hp > 0 && !hit.includes(q) && Math.hypot(q.x - last.x, q.y - last.y) < 16).sort((a, b) => Math.hypot(a.x - last.x, a.y - last.y) - Math.hypot(b.x - last.x, b.y - last.y))[0];
            if (!nx) break;
            hit.push(nx);
          }
          s.fx.push({ kind: "bolt", pts: [[tx, ty], ...hit.map((q) => [q.x, q.y])], t: 0.18 });
          hit.forEach((q, k) => hurt(q, dmg * Math.pow(0.8, k)));
          Sound.tap();
        } else if (t.type === "sniper") {
          s.fx.push({ kind: "line", x1: tx, y1: ty, x2: e.x, y2: e.y, t: 0.15, color: T.color });
          hurt(e, dmg);
        } else {
          s.shots.push({ x: tx, y: ty, tgt: e, v: t.type === "cannon" ? 55 : 110, dmg, type: t.type, tier: t.tier });
        }
      }
      for (const p of s.shots) {
        const e = p.tgt, d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 2 || e.dead) {
          p.done = true;
          if (e.dead && !TOWERS[p.type].splash) continue;
          const T = TOWERS[p.type];
          if (T.splash) {
            s.enemies.filter((q) => q.hp > 0 && Math.hypot(q.x - e.x, q.y - e.y) < T.splash && !(T.ground && q.fly)).forEach((q) => {
              hurt(q, p.dmg);
              if (T.slow) { q.slow = 1.6; q.slowK = T.slow + p.tier * 0.08; }
            });
            s.fx.push({ kind: "blast", x: e.x, y: e.y, t: 0.3, r: T.splash, color: T.color });
          } else hurt(e, p.dmg);
          continue;
        }
        p.x += ((e.x - p.x) / d) * p.v * dt;
        p.y += ((e.y - p.y) / d) * p.v * dt;
      }
      s.shots = s.shots.filter((p) => !p.done);
      s.enemies = s.enemies.filter((e) => !e.dead);
      if (s.lives <= 0) { s.lives = 0; render(); return ctx.lose("Brama padła", `Przetrwane fale: ${s.wave - 1} z ${lv.waves}.`); }
      if (!s.queue.length && !s.enemies.length && !s.waveDone) {
        s.waveDone = true;
        s.gold += 20 + s.wave * 3;
        if (s.wave >= lv.waves) { render(); return ctx.win(`Zostało ${s.lives} ${plural(s.lives, "życie", "życia", "żyć")}, pokonani wrogowie: ${s.kills}.`); }
        ctx.toast(`Fala ${s.wave} odparta`);
      }
    }
    let uiT = 0;
    cv.loop((dt) => {
      if (!ctx.done) for (let k = 0; k < s.speed; k++) step(dt);
      uiT += dt;
      if (uiT > 0.2) { uiT = 0; renderStats(); }
      draw(dt);
    });

    function draw(dt) {
      // trawa w szachownicę
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        g.fillStyle = (x + y) % 2 ? "#c3e6cb" : "#b8e0c2";
        g.fillRect(x * S, y * S, S, S);
      }
      g.strokeStyle = "#c8a46e";
      g.lineWidth = S * 0.86;
      g.lineJoin = "round";
      g.lineCap = "butt";
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.stroke();
      g.strokeStyle = "#e2c792";
      g.lineWidth = S * 0.62;
      g.stroke();
      // brama
      const [gx, gy] = pts[pts.length - 1];
      g.fillStyle = "#5c3d24";
      g.fillRect(gx - 4, gy - 7, 4, 14);
      // podgląd budowy
      if (s.build && s.hover >= 0) {
        const x = (s.hover % COLS) * S, y = ((s.hover / COLS) | 0) * S;
        const okPlace = !road.has(s.hover) && !towerAt(s.hover) && s.gold >= TOWERS[s.build].cost;
        g.fillStyle = okPlace ? "rgba(255,255,255,0.5)" : "rgba(209,45,75,0.4)";
        g.fillRect(x, y, S, S);
        ring(x + S / 2, y + S / 2, TOWERS[s.build].range, okPlace ? "rgba(255,255,255,0.8)" : "rgba(209,45,75,0.6)");
      }
      if (s.sel) ring((s.sel.i % COLS) * S + S / 2, ((s.sel.i / COLS) | 0) * S + S / 2, TowerDefense.stat(s.sel, "range"), "rgba(255,255,255,0.9)");
      for (const t of s.towers) drawTower(t);
      for (const e of s.enemies) drawEnemy(e);
      for (const p of s.shots) {
        g.fillStyle = p.type === "cannon" ? "#212529" : p.type === "frost" ? "#a5d8ff" : "#5c3d24";
        g.beginPath(); g.arc(p.x, p.y, p.type === "cannon" ? 1.5 : 0.9, 0, Math.PI * 2); g.fill();
      }
      s.fx = s.fx.filter((f) => (f.t -= dt) > 0);
      for (const f of s.fx) {
        g.globalAlpha = Math.min(1, f.t * 4);
        if (f.kind === "blast") { g.fillStyle = f.color; g.globalAlpha *= 0.35; g.beginPath(); g.arc(f.x, f.y, f.r * (1.2 - f.t), 0, Math.PI * 2); g.fill(); }
        if (f.kind === "pop") { g.strokeStyle = f.color; g.lineWidth = 0.8; g.beginPath(); g.arc(f.x, f.y, f.r * (2 - f.t * 2), 0, Math.PI * 2); g.stroke(); }
        if (f.kind === "ring") { g.strokeStyle = f.color; g.lineWidth = 0.8; g.beginPath(); g.arc(f.x, f.y, 8 * (1 - f.t), 0, Math.PI * 2); g.stroke(); }
        if (f.kind === "line") { g.strokeStyle = f.color; g.lineWidth = 0.7; g.beginPath(); g.moveTo(f.x1, f.y1); g.lineTo(f.x2, f.y2); g.stroke(); }
        if (f.kind === "bolt") {
          g.strokeStyle = "#e599f7"; g.lineWidth = 0.9; g.beginPath();
          f.pts.forEach(([x, y], k) => { if (!k) return g.moveTo(x, y); const [px, py] = f.pts[k - 1]; g.lineTo((x + px) / 2 + (Math.random() - 0.5) * 3, (y + py) / 2 + (Math.random() - 0.5) * 3); g.lineTo(x, y); });
          g.stroke();
        }
        if (f.kind === "gate") { g.fillStyle = "rgba(209,45,75,0.25)"; g.fillRect(0, 0, W, H); }
        g.globalAlpha = 1;
      }
      if (!s.wave && !ctx.done) {
        g.fillStyle = "rgba(21,22,27,0.6)";
        g.font = "600 5px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("Postaw wieże i wezwij pierwszą falę", W / 2, H - 4);
      }
    }
    function ring(x, y, r, color) { g.strokeStyle = color; g.lineWidth = 0.5; g.setLineDash([1.5, 1.5]); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    function drawTower(t) {
      const x = (t.i % COLS) * S + S / 2, y = ((t.i / COLS) | 0) * S + S / 2, T = TOWERS[t.type];
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.beginPath(); g.ellipse(x + 0.6, y + 1.2, 4.2, 3.6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#e9ecef";
      g.beginPath(); g.roundRect(x - 4, y - 4, 8, 8, 2); g.fill();
      g.fillStyle = T.color;
      g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
      g.save();
      g.translate(x, y);
      g.rotate(t.aim);
      g.fillStyle = "#212529";
      if (t.type === "cannon") g.fillRect(0, -1.2, 4.5, 2.4);
      else if (t.type === "sniper") g.fillRect(0, -0.5, 6, 1);
      else if (t.type === "tesla") { g.fillStyle = "#f3d9fa"; g.beginPath(); g.arc(0, 0, 1.3, 0, Math.PI * 2); g.fill(); }
      else if (t.type === "frost") { g.fillStyle = "#fff"; g.beginPath(); g.moveTo(3, 0); g.lineTo(0, 1.4); g.lineTo(0, -1.4); g.fill(); }
      else g.fillRect(0, -0.6, 3.8, 1.2);
      g.restore();
      for (let k = 0; k < t.tier; k++) { g.fillStyle = "#fab005"; g.beginPath(); g.arc(x - 2.5 + k * 2.5, y - 4.6, 0.9, 0, Math.PI * 2); g.fill(); }
    }
    function drawEnemy(e) {
      g.fillStyle = e.fly ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.18)";
      g.beginPath(); g.ellipse(e.x + 0.5, e.y + (e.fly ? 4 : 1.2), e.r, e.r * 0.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = e.slow > 0 ? "#74c0fc" : e.color;
      g.beginPath();
      if (e.type === "tank" || e.type === "boss") g.roundRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2, e.r * 0.4);
      else if (e.fly) { g.moveTo(e.x, e.y - e.r); g.lineTo(e.x + e.r * 1.4, e.y + e.r * 0.6); g.lineTo(e.x - e.r * 1.4, e.y + e.r * 0.6); }
      else g.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      g.fill();
      if (e.regen) { g.fillStyle = "#fff"; g.fillRect(e.x - 0.4, e.y - 1.6, 0.8, 3.2); g.fillRect(e.x - 1.6, e.y - 0.4, 3.2, 0.8); }
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(e.x + e.r * 0.35, e.y - e.r * 0.25, e.r * 0.28, 0, Math.PI * 2); g.fill();
      if (e.hp < e.max) {
        g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(e.x - 4, e.y - e.r - 2.4, 8, 1.2);
        g.fillStyle = e.hp / e.max > 0.4 ? "#40c057" : "#fa5252"; g.fillRect(e.x - 4, e.y - e.r - 2.4, 8 * Math.max(0, e.hp / e.max), 1.2);
      }
    }

    let lastStats = "";
    function renderStats() {
      const key = `${s.gold}|${s.lives}|${s.wave}|${s.waveDone}|${s.queue.length}`;
      if (key === lastStats) return;
      lastStats = key;
      statsEl.replaceChildren(
        ...[["Złoto", s.gold, "gold"], ["Życia", s.lives, "lives"], ["Fala", `${s.wave} / ${lv.waves}`, "wave"]].map(([k, v, c]) => { const d = el("span", `td-stat ${c}`); d.append(el("small", "", k), el("b", "", v)); return d; }),
      );
      shopBtns.forEach(([type, b]) => { b.classList.toggle("on", s.build === type); b.disabled = s.gold < TOWERS[type].cost && s.build !== type; });
      waveBtn.textContent = s.wave >= lv.waves ? "Ostatnia fala w drodze" : s.waveDone ? (s.wave ? `Wezwij falę ${s.wave + 1}` : "Wezwij pierwszą falę") : `Wezwij falę ${s.wave + 1} wcześniej (+premia)`;
      waveBtn.disabled = s.wave >= lv.waves;
      ctx.progress((s.wave - (s.waveDone ? 0 : 0.5)) / lv.waves);
      renderSel();
    }
    function renderSel() {
      selBlock.hidden = !s.sel;
      if (!s.sel) return;
      const t = s.sel, T = TOWERS[t.type];
      const info = el("p", "", `${T.name}, poziom ${t.tier + 1} z 3. Obrażenia ${Math.round(TowerDefense.stat(t, "dmg"))}, zasięg ${Math.round(TowerDefense.stat(t, "range"))}.`);
      const up = button(t.tier < 2 ? `Ulepsz (${TowerDefense.upgradeCost(t)})` : "Najwyższy poziom", "btn-ghost", () => {
        if (t.tier >= 2 || s.gold < TowerDefense.upgradeCost(t)) return Sound.error();
        s.gold -= TowerDefense.upgradeCost(t);
        t.spent += TowerDefense.upgradeCost(t);
        t.tier++;
        Sound.line();
        lastStats = "";
        renderStats();
      });
      up.disabled = t.tier >= 2 || s.gold < TowerDefense.upgradeCost(t);
      const sell = button(`Sprzedaj (${Math.round(t.spent * 0.7)})`, "btn-ghost", () => {
        s.gold += Math.round(t.spent * 0.7);
        s.towers = s.towers.filter((x) => x !== t);
        s.sel = null;
        Sound.erase();
        lastStats = "";
        renderStats();
      });
      const mode = segmented("Cel", ["Pierwszy", "Najsilniejszy", "Najbliższy"], (k) => { t.mode = ["first", "strong", "near"][k]; mode.set(k); });
      mode.set(["first", "strong", "near"].indexOf(t.mode));
      const row = el("div", "panel-row");
      row.append(up, sell);
      selBox.replaceChildren(info, row, mode.el);
    }
    function render() { lastStats = ""; renderStats(); }
    render();
  },
});
