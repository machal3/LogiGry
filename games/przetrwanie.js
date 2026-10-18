// Przetrwanie (w stylu Vampire Survivors): broń atakuje sama, gracz tylko chodzi. Kryształy dają doświadczenie,
// każdy poziom to wybór jednego z trzech ulepszeń. Broń na 5. poziomie z pasującym ulepszeniem biernym ewoluuje po otwarciu skrzyni.
const Survivors = (() => {
  const WEAPONS = {
    knife: { name: "Nóż", text: "Rzuca ostrza w kierunku ruchu.", pair: "haste", evo: "Tysiąc ostrzy", color: "#ced4da" },
    aura: { name: "Czosnek", text: "Rani wrogów tuż wokół ciebie.", pair: "armor", evo: "Święta ziemia", color: "#b2f2bb" },
    wand: { name: "Różdżka", text: "Pocisk leci w najbliższego wroga.", pair: "might", evo: "Kostur burzy", color: "#74c0fc" },
    axe: { name: "Topór", text: "Ciężki topór leci łukiem w górę.", pair: "vigor", evo: "Rzeźnik", color: "#ffa94d" },
    bolt: { name: "Błyskawica", text: "Piorun trafia losowych wrogów.", pair: "magnet", evo: "Burza", color: "#ffe066" },
    orbit: { name: "Księgi", text: "Księgi krążą wokół ciebie.", pair: "speed", evo: "Wir ksiąg", color: "#e599f7" },
  };
  const PASSIVES = {
    haste: { name: "Szybkostrzelność", text: "Broń atakuje o 10% częściej." },
    armor: { name: "Pancerz", text: "Otrzymujesz o 1 mniej obrażeń." },
    might: { name: "Moc", text: "Obrażenia +12%." },
    vigor: { name: "Wigor", text: "+20 maksymalnego zdrowia i leczenie." },
    magnet: { name: "Magnes", text: "Większy zasięg zbierania kryształów." },
    speed: { name: "Szybkość", text: "Chodzisz o 10% szybciej." },
  };
  const FOES = {
    zombie: { hp: 10, sp: 9, dmg: 6, r: 2.6, xp: 1, color: "#69db7c" },
    bat: { hp: 5, sp: 17, dmg: 4, r: 2, xp: 1, color: "#9775fa" },
    brute: { hp: 45, sp: 7, dmg: 12, r: 4, xp: 4, color: "#e8590c" },
    ghost: { hp: 16, sp: 12, dmg: 8, r: 2.8, xp: 2, color: "#dee2e6" },
    boss: { hp: 900, sp: 8, dmg: 22, r: 8, xp: 50, color: "#c92a2a", boss: true },
  };
  // trzy losowe propozycje: nowa broń, ulepszenie broni albo ulepszenie bierne (najwyżej 5 poziomów, 4 bronie, 4 bierne)
  function offers(s) {
    const opts = [];
    for (const k in WEAPONS) {
      const lv = s.weapons[k] || 0;
      if (lv && lv < 5) opts.push({ kind: "w", id: k, lv: lv + 1 });
      if (!lv && Object.keys(s.weapons).length < 4) opts.push({ kind: "w", id: k, lv: 1 });
    }
    for (const k in PASSIVES) {
      const lv = s.passives[k] || 0;
      if (lv < 5 && (lv || Object.keys(s.passives).length < 4)) opts.push({ kind: "p", id: k, lv: lv + 1 });
    }
    const out = shuffle(opts).slice(0, 3);
    return out.length ? out : [{ kind: "heal" }];
  }
  const api = { WEAPONS, PASSIVES, FOES, offers, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Survivors;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "przetrwanie"), {
  levels: [
    { key: "easy", name: "2 minuty", points: 20, time: 120, rate: 0.8 },
    { key: "medium", name: "3 minuty", points: 50, time: 180, rate: 1 },
    { key: "hard", name: "4 minuty", points: 100, time: 240, rate: 1.25 },
  ],
  rules: [
    "Przetrwaj do końca czasu. Chodzisz strzałkami albo WASD, na telefonie przeciągając palcem po planszy. Broń atakuje sama.",
    "Pokonani wrogowie zostawiają kryształy. Zbierz ich dość, a awansujesz i wybierzesz jedno z trzech ulepszeń: nową broń, mocniejszą broń albo ulepszenie bierne.",
    "Broń na 5. poziomie i pasujące do niej ulepszenie bierne łączą się w ewolucję po otwarciu skrzyni, którą zostawia boss. Opis ulepszenia mówi, z czym się łączy.",
  ],
  achievements: [
    { id: "setka", name: "Setka", desc: "Przetrwaj, pokonując co najmniej 100 wrogów.", points: 10 },
    { id: "poziom-10", name: "Weteran", desc: "Przetrwaj, mając postać na poziomie co najmniej 10.", points: 25 },
    { id: "nietkniety", name: "Ledwo draśnięty", desc: "Przetrwaj 4 minuty, mając co najmniej połowę zdrowia.", points: 50 },
  ],
  mount(board, ctx) {
    const { WEAPONS, PASSIVES, FOES } = Survivors;
    const lv = ctx.level;
    const W = 140, H = 96;
    const cv = canvasGame(board, ctx, W, H, { max: 90 });
    const { g, theme } = cv;
    const s = {
      x: 0, y: 0, hp: 100, max: 100, lvl: 1, xp: 0, t: 0, kills: 0, dir: [1, 0], weapons: { knife: 1 }, passives: {}, evolved: {},
      foes: [], shots: [], gems: [], fx: [], chest: null, paused: false, cd: {}, bossDone: false, hurtT: 0, orbitA: 0,
    };
    Survivors.last = s;
    const need = () => 5 + s.lvl * 4;
    const P = (k) => s.passives[k] || 0;
    const dmgMul = () => 1 + P("might") * 0.12;
    const rateMul = () => 1 - P("haste") * 0.1;
    const statsEl = el("div", "rl-stats");
    const kitEl = el("div", "sv-kit");
    ctx.panel.append(panelBlock("", statsEl), panelBlock("Wyposażenie", kitEl));
    const keys = heldKeys(ctx);
    let stick = null;
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); stick = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 }; });
    ctx.on(document, "pointermove", (e) => { if (stick) { stick.dx = e.clientX - stick.x; stick.dy = e.clientY - stick.y; } });
    ctx.on(document, "pointerup", () => (stick = null));
    const choiceBox = el("div", "sv-levelup");
    choiceBox.hidden = true;
    board.append(choiceBox);

    function levelUp() {
      s.paused = true;
      const opts = Survivors.offers(s);
      Sound.line();
      choiceBox.replaceChildren(el("h3", "", `Poziom ${s.lvl}! Wybierz ulepszenie`));
      opts.forEach((o, k) => {
        const b = button("", "sv-opt", () => choose(o));
        if (o.kind === "heal") { b.append(el("b", "", "Posiłek"), el("p", "", "Odzyskaj 30 zdrowia.")); }
        else {
          const def = o.kind === "w" ? WEAPONS[o.id] : PASSIVES[o.id];
          b.style.setProperty("--oc", o.kind === "w" ? def.color : "#adb5bd");
          const pairText = o.kind === "w" ? `Ewolucja z: ${PASSIVES[def.pair].name}.` : `Wzmacnia: ${Object.values(WEAPONS).find((w) => w.pair === o.id).name}.`;
          b.append(el("small", "", o.kind === "w" ? (o.lv === 1 ? "Nowa broń" : `Broń, poziom ${o.lv}`) : `Ulepszenie, poziom ${o.lv}`), el("b", "", def.name), el("p", "", def.text), el("em", "", pairText), el("kbd", "", k + 1));
        }
        choiceBox.append(b);
      });
      choiceBox.hidden = false;
      choiceBox.querySelector("button").focus({ preventScroll: true });
    }
    function choose(o) {
      if (o.kind === "w") s.weapons[o.id] = o.lv;
      else if (o.kind === "p") {
        s.passives[o.id] = o.lv;
        if (o.id === "vigor") { s.max += 20; s.hp = Math.min(s.max, s.hp + 30); }
      } else s.hp = Math.min(s.max, s.hp + 30);
      choiceBox.hidden = true;
      s.paused = false;
      Sound.place(8);
      render();
    }
    heldKeys(ctx, (k) => {
      if (!choiceBox.hidden && /^[1-3]$/.test(k)) choiceBox.querySelectorAll(".sv-opt")[+k - 1]?.click();
    });

    function spawn(type, near) {
      const a = Math.random() * Math.PI * 2, d = near ? 40 : 86;
      const f = FOES[type];
      const scale = 1 + s.t / 90;
      s.foes.push({ type, ...f, hp: f.hp * scale * lv.rate, max: f.hp * scale * lv.rate, x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, kb: 0 });
    }
    function hurt(f, dmg, kx = 0, ky = 0) {
      const real = dmg * dmgMul();
      f.hp -= real;
      if (s.nums.length < 40) s.nums.push({ x: f.x + (Math.random() - 0.5) * 2, y: f.y - f.r, v: Math.round(real), t: 0, big: real >= 30 });
      f.vx = kx; f.vy = ky; f.kb = 0.12;
      if (f.hp <= 0 && !f.dead) {
        f.dead = true;
        s.kills++;
        burst(f.x, f.y, f.color, f.boss ? 40 : 7, f.boss ? 50 : 26, f.boss ? 1.4 : 0.8);
        if (f.boss) { s.chest = { x: f.x, y: f.y }; Sound.win(); }
        s.gems.push({ x: f.x, y: f.y, v: f.xp });
        if (s.kills % 3 === 0) Sound.place(1 + (s.kills % 5));
      }
    }
    const nearest = () => s.foes.reduce((b, f) => (!f.dead && (!b || Math.hypot(f.x - s.x, f.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y)) ? f : b), null);
    let tick = 0; // czas bieżącego kroku
    const ready = (k, base) => { s.cd[k] = (s.cd[k] || 0) - tick; if (s.cd[k] > 0) return false; s.cd[k] = base * rateMul(); return true; };

    function weapons(dt) {
      tick = dt;
      const W_ = s.weapons, E = s.evolved;
      if (W_.knife && ready("knife", E.knife ? 0.12 : 0.9 - W_.knife * 0.08)) {
        const n = E.knife ? 1 : 1 + Math.floor(W_.knife / 2);
        for (let k = 0; k < n; k++) {
          const sp = (k - (n - 1) / 2) * 0.15, [dx, dy] = s.dir, a = Math.atan2(dy, dx) + sp;
          s.shots.push({ kind: "knife", x: s.x, y: s.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: 6 + W_.knife * 2, life: 0.8, pierce: 1 + (E.knife ? 1 : 0) });
        }
      }
      if (W_.aura) {
        const r = 10 + W_.aura * 1.5 + (E.aura ? 8 : 0);
        if (ready("aura", 0.5)) s.foes.forEach((f) => { if (!f.dead && Math.hypot(f.x - s.x, f.y - s.y) < r + f.r) hurt(f, 3 + W_.aura * 1.5 + (E.aura ? 6 : 0), (f.x - s.x) * 0.5, (f.y - s.y) * 0.5); });
        s.auraR = r;
      }
      if (W_.wand && ready("wand", E.wand ? 0.35 : 1.2 - W_.wand * 0.12)) {
        const t = nearest();
        if (t) {
          const d = Math.hypot(t.x - s.x, t.y - s.y) || 1;
          for (let k = 0; k < (E.wand ? 3 : 1 + (W_.wand >= 4 ? 1 : 0)); k++) s.shots.push({ kind: "wand", x: s.x, y: s.y, vx: ((t.x - s.x) / d) * 90 + (k - 1) * 12, vy: ((t.y - s.y) / d) * 90 + (k - 1) * 12, dmg: 10 + W_.wand * 3 + (E.wand ? 8 : 0), life: 1.4, pierce: E.wand ? 3 : 1 });
        }
      }
      if (W_.axe && ready("axe", E.axe ? 0.6 : 1.6 - W_.axe * 0.12)) {
        for (let k = 0; k < (E.axe ? 4 : 1 + Math.floor(W_.axe / 3)); k++) s.shots.push({ kind: "axe", x: s.x, y: s.y, vx: (Math.random() - 0.5) * 60, vy: -95, g: 160, dmg: 20 + W_.axe * 6, life: 1.6, pierce: 99, spin: 0 });
      }
      if (W_.bolt && ready("bolt", E.bolt ? 0.4 : 2 - W_.bolt * 0.2)) {
        const pool = s.foes.filter((f) => !f.dead && Math.abs(f.x - s.x) < W / 2 && Math.abs(f.y - s.y) < H / 2);
        for (let k = 0; k < Math.min(pool.length, 1 + Math.floor(W_.bolt / 2) + (E.bolt ? 3 : 0)); k++) {
          const f = pool.splice(rnd(pool.length), 1)[0];
          hurt(f, 18 + W_.bolt * 6);
          s.fx.push({ kind: "bolt", x: f.x, y: f.y, t: 0.25 });
        }
        if (pool.length || E.bolt) Sound.tap();
      }
      if (W_.orbit) {
        s.orbitA += dt * (2.4 + (E.orbit ? 2 : 0));
        const n = 1 + W_.orbit + (E.orbit ? 2 : 0), r = 16 + (E.orbit ? 6 : 0);
        s.books = Array.from({ length: n }, (_, k) => [s.x + Math.cos(s.orbitA + (k / n) * Math.PI * 2) * r, s.y + Math.sin(s.orbitA + (k / n) * Math.PI * 2) * r]);
        if (ready("orbit", 0.25)) for (const [bx, by] of s.books) s.foes.forEach((f) => { if (!f.dead && Math.hypot(f.x - bx, f.y - by) < f.r + 3) hurt(f, 8 + W_.orbit * 2, (f.x - s.x) * 2, (f.y - s.y) * 2); });
      } else s.books = null;
    }

    let spawnT = 0, uiT = 0;
    cv.loop((dt) => {
      if (!ctx.done && !s.paused) step(dt);
      draw(dt);
    });
    function step(dt) {
      s.t += dt;
      let mx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
      let my = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
      if (stick && Math.hypot(stick.dx, stick.dy) > 8) { mx = stick.dx; my = stick.dy; }
      const m = Math.hypot(mx, my);
      if (m) {
        const sp = 32 * (1 + P("speed") * 0.1);
        s.x += (mx / m) * sp * dt;
        s.y += (my / m) * sp * dt;
        s.dir = [mx / m, my / m];
      }
      // wrogowie: coraz liczniejsi i silniejsi, boss w 3/4 czasu
      spawnT -= dt;
      const intensity = (1 + s.t / 25) * lv.rate;
      if (spawnT <= 0 && s.foes.length < 160) {
        spawnT = 0.6 / intensity;
        const r = Math.random();
        const type = s.t > 60 && r < 0.12 ? "brute" : s.t > 30 && r < 0.35 ? "bat" : s.t > 90 && r < 0.5 ? "ghost" : "zombie";
        for (let k = 0; k < 1 + Math.floor(s.t / 50); k++) spawn(type);
      }
      if (!s.bossDone && s.t > lv.time * 0.72) { s.bossDone = true; spawn("boss", true); ctx.toast("Nadchodzi boss!"); Sound.lose(); }
      const armor = P("armor");
      for (const f of s.foes) {
        if (f.dead) continue;
        if (f.kb > 0) { f.kb -= dt; f.x += f.vx * dt; f.y += f.vy * dt; continue; }
        const d = Math.hypot(s.x - f.x, s.y - f.y) || 1;
        f.x += ((s.x - f.x) / d) * f.sp * dt;
        f.y += ((s.y - f.y) / d) * f.sp * dt;
        if (d < f.r + 3 && s.hurtT <= 0) {
          s.hp -= Math.max(1, f.dmg - armor);
          s.hurtT = 0.5;
          Sound.error();
        }
      }
      s.hurtT -= dt;
      // proste rozpychanie wrogów, żeby nie zlewali się w jeden punkt
      for (let k = 0; k < s.foes.length; k += 2) {
        const a = s.foes[k], b = s.foes[(k + 7) % s.foes.length];
        if (a === b || a.dead || b.dead) continue;
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d && d < a.r + b.r) { const push = (a.r + b.r - d) / 2; a.x += (dx / d) * push; a.y += (dy / d) * push; b.x -= (dx / d) * push; b.y -= (dy / d) * push; }
      }
      weapons(dt);
      for (const p of s.shots) {
        p.life -= dt;
        if (p.g) p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.kind === "axe") p.spin += dt * 12;
        for (const f of s.foes) {
          if (f.dead || p.pierce <= 0 || (p.hit && p.hit.has(f))) continue;
          if (Math.hypot(f.x - p.x, f.y - p.y) < f.r + 2) { hurt(f, p.dmg, p.vx * 0.3, p.vy * 0.3); p.pierce--; (p.hit ||= new Set()).add(f); }
        }
      }
      s.shots = s.shots.filter((p) => p.life > 0 && p.pierce > 0);
      s.foes = s.foes.filter((f) => !f.dead && Math.hypot(f.x - s.x, f.y - s.y) < 200);
      // kryształy przyciąga magnes
      const reach = 10 + P("magnet") * 8 + (s.evolved.bolt ? 20 : 0);
      for (const gm of s.gems) {
        const d = Math.hypot(gm.x - s.x, gm.y - s.y);
        if (d < reach) { gm.x += ((s.x - gm.x) / d) * 90 * dt; gm.y += ((s.y - gm.y) / d) * 90 * dt; }
        if (d < 3) { gm.got = true; s.xp += gm.v; Sound.tap(); burst(gm.x, gm.y, "#a5d8ff", 3, 14, 0.5); }
      }
      s.gems = s.gems.filter((gm) => !gm.got);
      if (s.chest && Math.hypot(s.chest.x - s.x, s.chest.y - s.y) < 5) openChest();
      while (s.xp >= need()) { s.xp -= need(); s.lvl++; levelUp(); break; }
      if (s.hp <= 0) { s.hp = 0; render(); return ctx.lose("Pokonany", `Przetrwałeś ${fmt(Math.floor(s.t))}, pokonani wrogowie: ${s.kills}.`); }
      if (s.t >= lv.time) {
        if (s.kills >= 100) ctx.achieve("setka");
        if (s.lvl >= 10) ctx.achieve("poziom-10");
        if (ctx.level.key === "hard" && s.hp * 2 >= s.max) ctx.achieve("nietkniety");
      }
      if (s.t >= lv.time) { render(); return ctx.win(`Poziom ${s.lvl}, pokonani wrogowie: ${s.kills}.`); }
      uiT += dt;
      if (uiT > 0.25) { uiT = 0; render(); }
    }
    function openChest() {
      s.chest = null;
      // ewolucja: broń na 5. poziomie z pasującym ulepszeniem
      const evo = Object.keys(s.weapons).find((k) => s.weapons[k] >= 5 && P(WEAPONS[k].pair) && !s.evolved[k]);
      if (evo) { s.evolved[evo] = true; ctx.toast(`Ewolucja: ${WEAPONS[evo].evo}!`); Sound.win(); }
      else { s.hp = Math.min(s.max, s.hp + 40); s.xp += need(); ctx.toast("Skrzynia: zdrowie i doświadczenie"); }
      render();
    }

    // --- grafika ---
    const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;
    s.parts = [];
    s.nums = [];
    function burst(x, y, color, n, spd = 30, size = 0.8) {
      for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7); s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.3 + Math.random() * 0.3, color, size: size * (0.6 + Math.random() * 0.8) }); }
      if (s.parts.length > 300) s.parts.splice(0, s.parts.length - 300);
    }
    // podłoże: ciemna polana z trawą, kamieniami, nagrobkami i kwiatami w stałych miejscach świata
    function drawGround(ox, oy) {
      const bg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.75);
      bg.addColorStop(0, "#34432f");
      bg.addColorStop(1, "#1f2a22");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const C = 16, cx0 = Math.floor(ox / C) - 1, cy0 = Math.floor(oy / C) - 1;
      for (let cx = cx0; cx < cx0 + W / C + 3; cx++) for (let cy = cy0; cy < cy0 + H / C + 3; cy++) {
        const h = hash(cx, cy), h2 = hash(cy * 7, cx * 3), x = cx * C + h * C - ox, y = cy * C + h2 * C - oy;
        // ciemniejsze plamy ziemi
        if (h > 0.7) { g.fillStyle = "rgba(20,26,18,0.2)"; g.beginPath(); g.ellipse(x, y, 6 + h2 * 6, 3 + h * 3, h * 3, 0, Math.PI * 2); g.fill(); }
        // kępki trawy
        g.strokeStyle = "rgba(120,160,90,0.45)";
        g.lineWidth = 0.4;
        for (let k = 0; k < 3; k++) { const gx = x + (k - 1) * 1.1, gy = y + 3; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (k - 1) * 0.6, gy - 1.6 - hash(cx + k, cy) * 1.2); g.stroke(); }
        if (h2 > 0.86) { g.fillStyle = "#5c6370"; g.beginPath(); g.ellipse(x + 5, y - 3, 1.8, 1.2, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#7a818e"; g.beginPath(); g.ellipse(x + 4.6, y - 3.4, 1, 0.6, 0, 0, Math.PI * 2); g.fill(); }
        if (h > 0.93) {
          // nagrobek
          g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(x - 4, y + 2.6, 3, 0.9, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = "#6b7280"; g.beginPath(); g.roundRect(x - 6, y - 2.4, 4, 5, [2, 2, 0.3, 0.3]); g.fill();
          g.fillStyle = "#4b5260"; g.fillRect(x - 4.3, y - 1.4, 0.6, 2.4); g.fillRect(x - 5, y - 0.8, 2, 0.6);
        }
        if (h2 < 0.08) { g.fillStyle = h > 0.5 ? "#e599f7" : "#ffe066"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x - 3 + k * 1.6, y + 1 + (k % 2) * 0.8, 0.45, 0, Math.PI * 2); g.fill(); } }
      }
    }
    function shadow(x, y, r) { g.fillStyle = "rgba(0,0,0,0.32)"; g.beginPath(); g.ellipse(x, y + r * 0.9, r * 0.95, r * 0.35, 0, 0, Math.PI * 2); g.fill(); }
    function drawFoe(f, x, y) {
      const flash = f.kb > 0, r = f.r, wob = Math.sin(s.t * 8 + f.x) * 0.3, face = s.x > f.x ? 1 : -1;
      shadow(x, y, r);
      if (f.type === "ghost") {
        g.globalAlpha = 0.75;
        g.fillStyle = flash ? "#fff" : "#e9ecef";
        g.beginPath(); g.arc(x, y - 0.4, r, Math.PI, 0);
        for (let k = 0; k <= 4; k++) g.lineTo(x + r - (k * r) / 2, y + r * 0.9 + (k % 2 ? -0.8 : 0.4) + Math.sin(s.t * 10 + k) * 0.3);
        g.fill();
        g.globalAlpha = 1;
        g.fillStyle = "#343a40"; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.2, r * 0.18, r * 0.28, 0, 0, Math.PI * 2); g.ellipse(x + r * 0.35, y - r * 0.2, r * 0.18, r * 0.28, 0, 0, Math.PI * 2); g.fill();
        return;
      }
      if (f.type === "bat") {
        const fl = Math.sin(s.t * 22 + f.x) * r * 0.6;
        g.fillStyle = flash ? "#fff" : "#6741d9";
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - r * 1.4, y - r - fl, x - r * 2.2, y - fl * 0.5); g.lineTo(x - r * 1.2, y + r * 0.3); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + r * 1.4, y - r - fl, x + r * 2.2, y - fl * 0.5); g.lineTo(x + r * 1.2, y + r * 0.3); g.closePath(); g.fill();
        g.fillStyle = flash ? "#fff" : "#845ef7"; g.beginPath(); g.arc(x, y, r * 0.75, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#ffe066"; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.1, r * 0.17, 0, Math.PI * 2); g.arc(x + r * 0.3, y - r * 0.1, r * 0.17, 0, Math.PI * 2); g.fill();
        return;
      }
      const body = flash ? "#fff" : f.color;
      const dark = { zombie: "#2f9e44", brute: "#a8461a", boss: "#7a1414" }[f.type];
      if (f.type === "zombie") {
        // ręce wyciągnięte w stronę gracza
        g.fillStyle = flash ? "#fff" : "#8ce99a";
        g.beginPath(); g.roundRect(x + face * r * 0.4, y - r * 0.15 + wob, face * r * 1.1, r * 0.4, r * 0.2); g.fill();
        g.beginPath(); g.roundRect(x + face * r * 0.4, y + r * 0.35 - wob, face * r * 0.95, r * 0.36, r * 0.2); g.fill();
      }
      const gr = g.createLinearGradient(0, y - r, 0, y + r);
      gr.addColorStop(0, body); gr.addColorStop(1, flash ? "#fff" : dark);
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y + wob * 0.3, r, r * 1.05, 0, 0, Math.PI * 2); g.fill();
      if (f.type === "brute" || f.type === "boss") {
        // rogi
        g.fillStyle = "#f1f3f5";
        g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.7); g.lineTo(x - r * 0.95, y - r * 1.5); g.lineTo(x - r * 0.25, y - r * 0.95); g.fill();
        g.beginPath(); g.moveTo(x + r * 0.6, y - r * 0.7); g.lineTo(x + r * 0.95, y - r * 1.5); g.lineTo(x + r * 0.25, y - r * 0.95); g.fill();
      }
      if (f.type === "boss") {
        g.fillStyle = "#ffd43b";
        g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.85); g.lineTo(x - r * 0.5, y - r * 1.35); g.lineTo(x - r * 0.25, y - r * 1.1); g.lineTo(x, y - r * 1.45); g.lineTo(x + r * 0.25, y - r * 1.1); g.lineTo(x + r * 0.5, y - r * 1.35); g.lineTo(x + r * 0.5, y - r * 0.85); g.fill();
        const glow = g.createRadialGradient(x, y, r, x, y, r * 2.2);
        glow.addColorStop(0, "rgba(250,82,82,0.25)"); glow.addColorStop(1, "rgba(250,82,82,0)");
        g.fillStyle = glow; g.beginPath(); g.arc(x, y, r * 2.2, 0, Math.PI * 2); g.fill();
      }
      // oczy patrzą na gracza
      const ex = face * r * 0.18, eye = f.type === "zombie" ? "#fff3bf" : f.type === "boss" ? "#ffe066" : "#fff";
      g.fillStyle = eye;
      g.beginPath(); g.arc(x - r * 0.32 + ex, y - r * 0.2, r * 0.2, 0, Math.PI * 2); g.arc(x + r * 0.32 + ex, y - r * 0.2, r * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1d1f27";
      g.beginPath(); g.arc(x - r * 0.32 + ex * 1.6, y - r * 0.18, r * 0.1, 0, Math.PI * 2); g.arc(x + r * 0.32 + ex * 1.6, y - r * 0.18, r * 0.1, 0, Math.PI * 2); g.fill();
      if (f.type !== "zombie") { g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(x - r * 0.35, y + r * 0.3, r * 0.7, r * 0.14); }
      if (f.boss) {
        g.fillStyle = "rgba(0,0,0,0.55)"; g.beginPath(); g.roundRect(x - 12, y - r - 7, 24, 2.4, 1.2); g.fill();
        g.fillStyle = "#fa5252"; g.beginPath(); g.roundRect(x - 12, y - r - 7, 24 * Math.max(0, f.hp / f.max), 2.4, 1.2); g.fill();
      }
    }
    function drawHero(px, py) {
      const moving = s.moving, step = moving ? Math.sin(s.t * 16) : 0, face = s.dir[0] >= 0 ? 1 : -1;
      shadow(px, py, 3.4);
      if (s.hurtT > 0 && Math.floor(s.hurtT * 20) % 2 === 0) return;
      // nogi
      g.fillStyle = "#3d2a1e";
      g.beginPath(); g.roundRect(px - 1.8, py + 1.4 + step * 0.5, 1.4, 2.2, 0.6); g.roundRect(px + 0.4, py + 1.4 - step * 0.5, 1.4, 2.2, 0.6); g.fill();
      // płaszcz
      const gr = g.createLinearGradient(0, py - 4, 0, py + 3);
      gr.addColorStop(0, theme.c); gr.addColorStop(1, "#7a0000");
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(px - 2.8, py + 2.4); g.quadraticCurveTo(px - 3.2, py - 2.5, px, py - 4.6); g.quadraticCurveTo(px + 3.2, py - 2.5, px + 2.8, py + 2.4); g.closePath(); g.fill();
      // twarz w kapturze
      g.fillStyle = "#f8d7b5";
      g.beginPath(); g.ellipse(px + face * 0.4, py - 1.6, 1.5, 1.4, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#1d1f27";
      g.fillRect(px + face * 0.4 - 0.75 + face * 0.3, py - 1.9, 0.45, 0.6); g.fillRect(px + face * 0.4 + 0.3 + face * 0.3, py - 1.9, 0.45, 0.6);
      // pas i miecz na plecach
      g.fillStyle = "#ffd43b"; g.fillRect(px - 2.2, py + 0.6, 4.4, 0.5);
      g.fillStyle = "#ced4da"; g.save(); g.translate(px - face * 2.2, py - 1); g.rotate(face * 0.5); g.fillRect(-0.3, -3.5, 0.6, 4.2); g.fillStyle = "#8d5a3b"; g.fillRect(-0.9, 0.4, 1.8, 0.5); g.restore();
    }
    let lastPos = [0, 0];
    function draw(dt) {
      s.moving = Math.hypot(s.x - lastPos[0], s.y - lastPos[1]) > 0.01;
      lastPos = [s.x, s.y];
      const ox = s.x - W / 2, oy = s.y - H / 2;
      const V = (x, y) => [x - ox, y - oy];
      drawGround(ox, oy);
      if (s.weapons.aura) {
        const [x, y] = V(s.x, s.y), pulse = 1 + Math.sin(s.t * 4) * 0.04, r = s.auraR * pulse;
        const ag = g.createRadialGradient(x, y, r * 0.2, x, y, r);
        ag.addColorStop(0, s.evolved.aura ? "rgba(255,236,153,0.05)" : "rgba(178,242,187,0.03)");
        ag.addColorStop(0.85, s.evolved.aura ? "rgba(255,236,153,0.22)" : "rgba(178,242,187,0.2)");
        ag.addColorStop(1, "rgba(178,242,187,0)");
        g.fillStyle = ag; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = s.evolved.aura ? "rgba(255,236,153,0.5)" : "rgba(178,242,187,0.4)"; g.lineWidth = 0.4; g.setLineDash([1.2, 1.6]); g.lineDashOffset = -s.t * 6;
        g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      for (const gm of s.gems) {
        const [x, y] = V(gm.x, gm.y);
        if (x < -4 || y < -4 || x > W + 4 || y > H + 4) continue;
        const c = gm.v >= 4 ? ["#ff8787", "#e03131"] : gm.v >= 2 ? ["#8ce99a", "#2f9e44"] : ["#a5d8ff", "#1c7ed6"], b = Math.sin(s.t * 5 + gm.x) * 0.4;
        g.fillStyle = c[1]; g.globalAlpha = 0.25; g.beginPath(); g.arc(x, y + b, 2.6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
        g.fillStyle = c[1]; g.beginPath(); g.moveTo(x, y - 2 + b); g.lineTo(x + 1.4, y + b); g.lineTo(x, y + 2 + b); g.lineTo(x - 1.4, y + b); g.fill();
        g.fillStyle = c[0]; g.beginPath(); g.moveTo(x, y - 2 + b); g.lineTo(x + 0.5, y + b); g.lineTo(x, y + 0.6 + b); g.lineTo(x - 1.4, y + b); g.fill();
      }
      if (s.chest) {
        const [x, y] = V(s.chest.x, s.chest.y);
        const beam = g.createLinearGradient(0, y - 30, 0, y);
        beam.addColorStop(0, "rgba(255,212,59,0)"); beam.addColorStop(1, "rgba(255,212,59,0.35)");
        g.fillStyle = beam; g.fillRect(x - 3, y - 30, 6, 30);
        shadow(x, y, 3.6);
        g.fillStyle = "#a0522d"; g.beginPath(); g.roundRect(x - 3.6, y - 1.6, 7.2, 4, 0.6); g.fill();
        g.fillStyle = "#c0703a"; g.beginPath(); g.roundRect(x - 3.6, y - 3.6, 7.2, 2.4, [1.6, 1.6, 0, 0]); g.fill();
        g.fillStyle = "#ffd43b"; g.fillRect(x - 3.6, y - 1.4, 7.2, 0.6); g.fillRect(x - 0.6, y - 2, 1.2, 1.8);
      }
      // wrogowie od najdalszych w górze ekranu, żeby nakładali się naturalnie
      const vis = s.foes.filter((f) => { const [x, y] = V(f.x, f.y); return x > -12 && y > -12 && x < W + 12 && y < H + 12; }).sort((a, b) => a.y - b.y);
      for (const f of vis) { const [x, y] = V(f.x, f.y); drawFoe(f, x, y); }
      for (const p of s.shots) {
        const [x, y] = V(p.x, p.y);
        if (p.kind === "knife") {
          const a = Math.atan2(p.vy, p.vx);
          g.save(); g.translate(x, y); g.rotate(a);
          g.fillStyle = "rgba(233,236,239,0.25)"; g.beginPath(); g.moveTo(-7, 0); g.lineTo(-1, -0.5); g.lineTo(-1, 0.5); g.fill();
          g.fillStyle = "#f8f9fa"; g.beginPath(); g.moveTo(2.6, 0); g.lineTo(-0.6, -0.7); g.lineTo(-0.6, 0.7); g.fill();
          g.fillStyle = "#8d5a3b"; g.fillRect(-2, -0.45, 1.5, 0.9);
          g.restore();
        } else if (p.kind === "wand") {
          const c = s.evolved.wand ? "255,212,59" : "116,192,252";
          g.strokeStyle = `rgba(${c},0.35)`; g.lineWidth = 1.6; g.lineCap = "round";
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * 0.05, y - p.vy * 0.05); g.stroke();
          g.fillStyle = `rgba(${c},0.35)`; g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill();
          g.fillStyle = "#fff"; g.beginPath(); g.arc(x, y, 1, 0, Math.PI * 2); g.fill();
        } else {
          g.save(); g.translate(x, y); g.rotate(p.spin);
          g.fillStyle = "#8d5a3b"; g.fillRect(-3, -0.45, 5.6, 0.9);
          g.fillStyle = "#dee2e6"; g.beginPath(); g.moveTo(1.6, -0.4); g.quadraticCurveTo(4.2, -2.8, 2.2, -3.4); g.lineTo(1.2, -0.4); g.fill();
          g.beginPath(); g.moveTo(1.6, 0.4); g.quadraticCurveTo(4.2, 2.8, 2.2, 3.4); g.lineTo(1.2, 0.4); g.fill();
          g.restore();
        }
      }
      if (s.books) for (const [bx, by] of s.books) {
        const [x, y] = V(bx, by);
        g.fillStyle = s.evolved.orbit ? "rgba(255,212,59,0.3)" : "rgba(229,153,247,0.3)"; g.beginPath(); g.arc(x, y, 3.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = s.evolved.orbit ? "#fab005" : "#be4bdb"; g.beginPath(); g.roundRect(x - 1.8, y - 2.2, 3.6, 4.4, 0.5); g.fill();
        g.fillStyle = "#fff"; g.fillRect(x - 1.3, y - 1.9, 0.5, 3.8); g.fillStyle = "#ffe066"; g.fillRect(x - 0.3, y - 0.8, 1.4, 0.4);
      }
      s.fx = s.fx.filter((f) => (f.t -= dt) > 0);
      for (const f of s.fx) {
        f.path ||= Array.from({ length: 6 }, (_, k) => [f.x + (Math.random() - 0.5) * 7, f.y - 44 + k * 8.8]);
        const [x, y] = V(f.x, f.y);
        g.globalAlpha = Math.min(1, f.t * 5);
        for (const [w, c] of [[2.4, "rgba(255,224,102,0.35)"], [0.8, "#fff9db"]]) {
          g.strokeStyle = c; g.lineWidth = w; g.lineJoin = "round";
          g.beginPath();
          f.path.forEach(([wx, wy], k) => { const [a, b] = V(wx, wy); g[k ? "lineTo" : "moveTo"](a, b); });
          g.lineTo(x, y); g.stroke();
        }
        g.fillStyle = "rgba(255,249,219,0.5)"; g.beginPath(); g.arc(x, y, 3 * f.t * 4, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
      // cząsteczki i liczby obrażeń
      s.parts = s.parts.filter((q) => (q.t += dt) < q.life);
      for (const q of s.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.92; q.vy *= 0.92; const [x, y] = V(q.x, q.y); g.globalAlpha = 1 - q.t / q.life; g.fillStyle = q.color; g.beginPath(); g.arc(x, y, q.size, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      const [px, py] = V(s.x, s.y);
      drawHero(px, py);
      g.fillStyle = "rgba(0,0,0,0.5)"; g.beginPath(); g.roundRect(px - 5, py + 5, 10, 1.4, 0.7); g.fill();
      g.fillStyle = s.hp / s.max < 0.3 ? "#ff6b6b" : "#51cf66"; g.beginPath(); g.roundRect(px - 5, py + 5, 10 * Math.max(0, s.hp / s.max), 1.4, 0.7); g.fill();
      s.nums = s.nums.filter((n) => (n.t += dt) < 0.6);
      g.textAlign = "center";
      g.font = "700 3.6px Geist, system-ui, sans-serif";
      for (const n of s.nums) { const [x, y] = V(n.x, n.y - n.t * 10); g.globalAlpha = 1 - n.t / 0.6; g.fillStyle = "#1d1f27"; g.fillText(n.v, x + 0.25, y + 0.25); g.fillStyle = n.big ? "#ffd43b" : "#fff"; g.fillText(n.v, x, y); }
      g.globalAlpha = 1;
      // winieta nocy, jaśniej wokół bohatera
      const vg = g.createRadialGradient(px, py, 18, W / 2, H / 2, W * 0.7);
      vg.addColorStop(0, "rgba(8,10,16,0)");
      vg.addColorStop(1, s.hurtT > 0.3 ? "rgba(120,0,0,0.5)" : "rgba(8,10,16,0.55)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
      // pasek doświadczenia, poziom, czas i licznik pokonanych
      g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.roundRect(4, 3, W - 8, 3, 1.5); g.fill();
      g.fillStyle = "#4dabf7"; g.beginPath(); g.roundRect(4, 3, (W - 8) * Math.min(1, s.xp / need()), 3, 1.5); g.fill();
      g.fillStyle = "#1c7ed6"; g.beginPath(); g.arc(6, 4.5, 3.6, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.font = "700 3.8px Geist, system-ui, sans-serif"; g.fillText(s.lvl, 6, 5.9);
      g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.roundRect(W / 2 - 11, 8, 22, 7.5, 3.75); g.fill();
      g.fillStyle = lv.time - s.t < 10 ? "#ffd43b" : "#fff"; g.font = "700 5.4px Geist, system-ui, sans-serif"; g.fillText(fmt(Math.max(0, Math.ceil(lv.time - s.t))), W / 2, 13.8);
      g.textAlign = "right"; g.font = "600 4px Geist, system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,0.85)"; g.fillText(`${s.kills} pokonanych`, W - 5, 13);
      g.textAlign = "center";
    }
    function render() {
      const bar = (v, m, cls) => { const b = el("span", `rl-bar ${cls}`); const f = el("i"); f.style.width = `${Math.max(0, v / m) * 100}%`; b.append(f); return b; };
      statsEl.replaceChildren(
        el("p", "rl-line", `Poziom ${s.lvl} · zostało ${fmt(Math.max(0, Math.ceil(lv.time - s.t)))}`),
        el("p", "rl-small", `Zdrowie ${Math.ceil(s.hp)} / ${s.max}`), bar(s.hp, s.max, "hp"),
        el("p", "rl-small", `Doświadczenie ${s.xp} / ${need()} · pokonani ${s.kills}`), bar(s.xp, need(), "xp"),
      );
      const item = (name, lvl, color, evo, sub) => {
        const r = el("div", `sv-item${evo ? " evo" : ""}`);
        r.style.setProperty("--oc", color);
        const pips = el("span", "sv-pips");
        for (let k = 1; k <= 5; k++) pips.append(el("i", k <= lvl ? "on" : ""));
        const t = el("span", "sv-name");
        t.append(el("b", "", name), el("small", "", sub));
        r.append(el("i", "sv-ico"), t, evo ? el("em", "", "ewolucja") : pips);
        return r;
      };
      const kitKey = JSON.stringify([s.weapons, s.passives, s.evolved]);
      if (kitEl.dataset.key !== kitKey) {
        kitEl.dataset.key = kitKey;
        kitEl.replaceChildren(
          ...Object.entries(s.weapons).map(([k, v]) => item(s.evolved[k] ? WEAPONS[k].evo : WEAPONS[k].name, v, WEAPONS[k].color, s.evolved[k], s.evolved[k] ? WEAPONS[k].name : `łączy się z: ${PASSIVES[WEAPONS[k].pair].name.toLowerCase()}`)),
          ...Object.entries(s.passives).map(([k, v]) => item(PASSIVES[k].name, v, "#adb5bd", false, PASSIVES[k].text)),
        );
      }
      ctx.progress(s.t / lv.time);
    }
    render();
  },
});
