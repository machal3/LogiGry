// Artyleria: turowy pojedynek czołgów na niszczonym terenie. Wiatr, cztery rodzaje pocisków, komputer wstrzeliwuje się z każdą turą.
{
  // --- Logika bez DOM: świat 200 × 110, oś y w dół ---
  const W = 200, H = 110, RES = 0.5, G = 60, MAXP = 115;
  const AMMO = {
    zwykly: { name: "Zwykły", r: 7, dmg: 34, note: "Bez limitu. Średni wybuch." },
    ciezki: { name: "Ciężki", r: 12, dmg: 55, note: "Duży wybuch i mocne obrażenia." },
    rozprysk: { name: "Rozprysk", r: 5.5, dmg: 22, split: 3, note: "Na szczycie lotu dzieli się na trzy." },
    kopacz: { name: "Kopacz", r: 15, dmg: 6, note: "Drąży głęboki dół, rywal w nim spada." },
  };

  function makeTerrain() {
    const n = W / RES + 1, h = new Array(n);
    const a = [Math.random() * 6, Math.random() * 6, Math.random() * 6], base = 70 + Math.random() * 8;
    for (let i = 0; i < n; i++) {
      const x = i * RES;
      h[i] = base + Math.sin(x / 31 + a[0]) * 11 + Math.sin(x / 13 + a[1]) * 5 + Math.sin(x / 6 + a[2]) * 0.6;
      // wzgórze pośrodku: nie da się strzelać po płaskim
      h[i] -= Math.exp(-((x - 100) ** 2) / 900) * (10 + Math.random() * 6);
      h[i] = Math.max(32, Math.min(100, h[i]));
    }
    return h;
  }
  const ground = (h, x) => {
    if (x < 0 || x > W) return H + 50;
    const i = Math.min(h.length - 2, Math.floor(x / RES)), f = x / RES - i;
    return h[i] * (1 - f) + h[i + 1] * f;
  };
  // Wyrównanie terenu pod czołgiem.
  function flatten(h, x, w) {
    const y = ground(h, x);
    for (let i = Math.max(0, Math.floor((x - w) / RES)); i <= Math.min(h.length - 1, Math.ceil((x + w) / RES)); i++) h[i] = y;
  }
  // Krater: ziemia w kole znika, a to, co było nad nim, osuwa się w dół.
  function crater(h, cx, cy, r) {
    for (let i = Math.max(0, Math.floor((cx - r) / RES)); i <= Math.min(h.length - 1, Math.ceil((cx + r) / RES)); i++) {
      const dx = i * RES - cx, d = Math.sqrt(Math.max(0, r * r - dx * dx));
      const top = cy - d, bot = cy + d;
      if (h[i] >= bot) continue;
      const removed = bot - Math.max(h[i], top);
      h[i] = Math.min(H + 5, h[i] + removed);
    }
  }
  // Lot pocisku krok po kroku; zwraca tor i miejsce trafienia.
  function flight(h, tanks, x, y, ang, pow, wind, shooter, maxT = 12) {
    let vx = Math.cos(ang) * pow, vy = -Math.sin(ang) * pow;
    const path = [[x, y]];
    const dt = 1 / 120;
    for (let t = 0; t < maxT; t += dt) {
      vx += wind * dt; vy += G * dt;
      x += vx * dt; y += vy * dt;
      path.push([x, y]);
      if (x < -20 || x > W + 20 || y > H + 20) return { path, x, y, out: true, vx, vy, t };
      const hit = tanks.find((tk, k) => tk.hp > 0 && (k !== shooter || t > 0.15) && Math.abs(x - tk.x) < 4.2 && y > tk.y - 4 && y < tk.y + 0.5);
      if (hit) return { path, x, y, tank: hit, vx, vy, t };
      if (y >= ground(h, x)) return { path, x, y, vx, vy, t };
    }
    return { path, x, y, out: true };
  }
  // Obrażenia od wybuchu: maleją z odległością.
  function blast(tanks, x, y, r, dmg) {
    const out = [];
    for (const tk of tanks) {
      if (tk.hp <= 0) continue;
      const d = Math.hypot(tk.x - x, tk.y - 2 - y);
      if (d < r + 3) {
        const v = Math.round(dmg * Math.max(0.15, 1 - d / (r + 3)));
        tk.hp = Math.max(0, tk.hp - v);
        out.push([tk, v]);
      }
    }
    return out;
  }
  // Komputer: przegląd kątów i sił; wybiera najbliższe trafienie, potem psuje je o swój błąd.
  function aim(h, tanks, me, target, wind) {
    const tk = tanks[me], dir = target.x < tk.x ? -1 : 1;
    let best = null;
    for (let deg = 20; deg <= 80; deg += 2) {
      const ang = dir < 0 ? Math.PI - (deg * Math.PI) / 180 : (deg * Math.PI) / 180;
      for (let p = 30; p <= MAXP; p += 3) {
        const [bx, by] = barrel(tk, ang);
        const r = flight(h, tanks, bx, by, ang, p, wind, me, 8);
        const d = r.tank === target ? 0 : Math.hypot(r.x - target.x, r.y - target.y);
        if (r.tank && r.tank !== target) continue;
        if (!best || d < best.d) best = { ang, p, d };
      }
    }
    return best;
  }
  const barrel = (tk, ang) => [tk.x + Math.cos(ang) * 5, tk.y - 3.2 - Math.sin(ang) * 5];

  if (typeof module !== "undefined") module.exports = { makeTerrain, ground, crater, flight, blast, aim, barrel, flatten, AMMO, W, H, MAXP };

  if (typeof registerGame !== "undefined") registerGame({
    id: "artyleria",
    cat: "strategia",
    name: "Artyleria",
    author: "Claude Opus 5.5",
    desc: "Pojedynek czołgów na niszczonym terenie. Ustaw kąt i siłę strzału, uwzględnij wiatr i pokonaj rywala.",
    color: "#5c6f2b",
    ink: "#ffffff",
    glyph: [".....", "...#.", "..#..", ".###.", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, enemies: 1, wind: 3, err: 0.16, errP: 0.16, learn: 0.75 },
      { key: "medium", name: "Średni", points: 25, enemies: 1, wind: 7, err: 0.1, errP: 0.1, learn: 0.6 },
      { key: "hard", name: "Trudny", points: 50, enemies: 2, wind: 11, err: 0.07, errP: 0.07, learn: 0.55 },
    ],
    rules: [
      "Przeciągnij po planszy, żeby wycelować: kierunek od czołgu to kąt, odległość to siła. Strzelasz przyciskiem Ognia albo spacją. Klawisze 1–4 wybierają pocisk.",
      "Klawiatura: strzałki w lewo i w prawo zmieniają kąt, w górę i w dół siłę. Linia przerywana pokazuje tor poprzedniego strzału.",
      "Wiatr (strzałka u góry) znosi pociski. Wybuchy drążą teren, a czołg spada w powstałe doły i traci pancerz.",
      "Pociski: zwykły bez limitu, ciężki z dużym wybuchem, rozprysk dzielący się na trzy i kopacz, który podkopuje rywala.",
      "Wygrywasz, gdy pancerz wszystkich rywali spadnie do zera. Komputer z każdą turą strzela celniej.",
    ],
    achievements: [
      { id: "w-cel", name: "Prosto w cel", desc: "Traf czołg rywala bezpośrednio pociskiem.", points: 10 },
      { id: "pierwszy", name: "Pierwsza salwa", desc: "Traf rywala już pierwszym strzałem partii.", points: 25 },
      { id: "grawitacja", name: "Grawitacja", desc: "Pokonaj rywala obrażeniami od upadku.", points: 25 },
      { id: "nietkniety", name: "Nietknięty", desc: "Wygraj średni lub trudny poziom bez utraty pancerza.", points: 25 },
      { id: "artylerzysta", name: "Artylerzysta", desc: "Wygraj trudny poziom, oddając najwyżej 8 strzałów.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, W, H, { max: 100 });
      const { g } = cv;
      const h = makeTerrain();
      const place = (x) => { flatten(h, x, 4.5); return { x, y: ground(h, x), hp: 100, fall: 0 }; };
      const tanks = [place(14 + Math.random() * 26)];
      tanks[0].color = "#3b82c4"; tanks[0].name = "Ty"; tanks[0].ang = Math.PI / 4; tanks[0].pow = 70;
      const spots = L.enemies === 1 ? [160 + Math.random() * 26] : [120 + Math.random() * 18, 168 + Math.random() * 20];
      spots.forEach((x, k) => {
        const tk = place(x);
        Object.assign(tk, { color: ["#c0392b", "#d68910"][k], name: ["Rywal", "Drugi rywal"][k], ang: (Math.PI * 3) / 4, pow: 70, err: L.err, errP: L.errP });
        tanks.push(tk);
      });
      const s = { turn: 0, busy: false, wind: 0, ammo: "zwykly", left: { ciezki: 2, rozprysk: 3, kopacz: 2 }, shots: 0, firstHit: null, hurt: 0, shells: [], parts: [], smoke: [], booms: [], trail: null, shake: 0, msg: "" };
      const newWind = () => { s.wind = Math.round((Math.random() * 2 - 1) * L.wind * 10) / 10; };
      newWind();
      const clouds = Array.from({ length: 6 }, (_, k) => ({ x: Math.random() * W, y: 6 + Math.random() * 22, s: 0.6 + Math.random() * 0.8, k }));
      const hills = [0, 1].map((layer) => Array.from({ length: 41 }, (_, i) => 50 + layer * 8 - Math.sin(i * 0.5 + layer * 2 + Math.random() * 0.3) * (6 - layer * 2) - Math.random() * 3));

      // --- Panel ---
      const youEl = statBlock(ctx, "Twój pancerz", { meter: true });
      const foeEl = statBlock(ctx, L.enemies > 1 ? "Rywale" : "Rywal", { meter: true });
      const ammoKeys = Object.keys(AMMO);
      const ammoName = el("p", "panel-stat");
      const ammoNote = el("p", "panel-note");
      // kolejny dostępny pocisk; klawisze 1–4 wybierają wprost
      const cycle = () => {
        const i = ammoKeys.indexOf(s.ammo);
        for (let k = 1; k <= 4; k++) {
          const next = ammoKeys[(i + k) % 4];
          if (next === "zwykly" || s.left[next]) return pickAmmo(next);
        }
      };
      ctx.panel.append(panelBlock("Pocisk", ammoName, ammoNote, button("Zmień pocisk", "btn-ghost wide", cycle)));
      const aimNote = el("p", "ar-aim");
      const fireBtn = button("Ognia", "btn wide", () => fire());
      ctx.panel.append(panelBlock("Strzał", aimNote, fireBtn));

      function pickAmmo(k) {
        if (k !== "zwykly" && !s.left[k]) { ctx.toast("Ten pocisk się skończył"); return; }
        s.ammo = k;
        render();
      }

      // celowanie: przeciąganie od czołgu
      const me = tanks[0];
      let dragging = false;
      const aimAt = (e) => {
        const [x, y] = cv.at(e);
        const dx = x - me.x, dy = me.y - 3 - y;
        me.ang = Math.max(0.02, Math.min(Math.PI - 0.02, Math.atan2(Math.max(0.1, dy), dx)));
        me.pow = Math.round(Math.max(15, Math.min(MAXP, Math.hypot(dx, dy) * 1.5)));
        render();
      };
      ctx.on(cv.cv, "pointerdown", (e) => { if (!myTurn()) return; e.preventDefault(); dragging = true; aimAt(e); });
      ctx.on(document, "pointermove", (e) => { if (dragging) aimAt(e); });
      ctx.on(document, "pointerup", () => { dragging = false; });
      const keys = heldKeys(ctx, (k) => {
        if (k === " " || k === "enter") fire();
        else if (k >= "1" && k <= "4") pickAmmo(ammoKeys[+k - 1]);
      });
      let alive = true;
      ctx.onStop(() => { alive = false; });
      const myTurn = () => !ctx.done && !s.busy && s.turn === 0;

      // --- Strzał ---
      function fire() {
        if (!myTurn()) return;
        s.shots++;
        launch(0, me.ang, me.pow, s.ammo);
        if (s.ammo !== "zwykly") { s.left[s.ammo]--; if (!s.left[s.ammo]) pickAmmo("zwykly"); }
      }
      function launch(k, ang, pow, ammo) {
        const tk = tanks[k];
        tk.ang = ang; tk.pow = pow;
        const [bx, by] = barrel(tk, ang);
        s.busy = true;
        s.recoil = { k, t: 0.25 };
        s.shells.push({ x: bx, y: by, vx: Math.cos(ang) * pow, vy: -Math.sin(ang) * pow, ammo, from: k, t: 0, path: [[bx, by]], split: !!AMMO[ammo].split });
        Sound.place(2);
        for (let i = 0; i < 8; i++) s.smoke.push({ x: bx, y: by, vx: Math.cos(ang) * 8 + (Math.random() - 0.5) * 6, vy: -Math.sin(ang) * 8 - Math.random() * 4, r: 1 + Math.random(), life: 1 });
        render();
      }

      function explode(sh, x, y, direct) {
        const A = AMMO[sh.ammo];
        crater(h, x, y, A.r);
        const hits = blast(tanks, x, y, A.r, A.dmg);
        if (direct && direct.hp > 0 && sh.ammo !== "kopacz") {
          const extra = Math.round(A.dmg * 0.35);
          direct.hp = Math.max(0, direct.hp - extra);
          if (!hits.some(([t]) => t === direct)) hits.push([direct, extra]);
          else hits.find(([t]) => t === direct)[1] += extra;
        }
        s.booms.push({ x, y, r: A.r, t: 0 });
        s.shake = Math.min(0.5, A.r / 25);
        Sound.erase();
        if (A.r > 9) Sound.lose();
        for (let i = 0; i < 18 + A.r * 2; i++) {
          const a = -Math.random() * Math.PI, v = 15 + Math.random() * 35;
          s.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.8 + Math.random() * 0.8, c: pick(["#7a5230", "#5e3d22", "#8f6a3f", "#4f7a2a"]), r: 0.35 + Math.random() * 0.6 });
        }
        for (let i = 0; i < 6; i++) s.smoke.push({ x: x + (Math.random() - 0.5) * A.r, y: y - Math.random() * A.r * 0.5, vx: (Math.random() - 0.5) * 4 + s.wind * 0.5, vy: -3 - Math.random() * 4, r: 2 + Math.random() * 2.5, life: 1.6 });
        for (const [tk, v] of hits) {
          s.floats.push({ x: tk.x, y: tk.y - 9, t: 1.4, text: `−${v}`, c: tk === me ? "#ff6b6b" : "#ffd43b" });
          if (tk === me) s.hurt += v;
          else if (sh.from === 0) {
            if (s.firstHit == null) s.firstHit = s.shots;
            if (direct === tk) ctx.achieve("w-cel");
          }
        }
        if (sh.from === 0 && s.shots === 1 && hits.some(([tk]) => tk !== me)) ctx.achieve("pierwszy");
      }
      s.floats = [];

      // Po zakończeniu lotu: czołgi spadają, potem kolejna tura.
      function settle() {
        let falling = false;
        for (const tk of tanks) {
          if (tk.hp <= 0 && tk.dead) continue;
          const gy = ground(h, tk.x);
          if (gy > tk.y + 0.05) { tk.vy = (tk.vy || 0) + G * (1 / 60); tk.y = Math.min(gy, tk.y + tk.vy / 60); tk.fall += tk.vy / 60; falling = true; }
          else if (tk.fall > 0) {
            const dmg = Math.round(Math.max(0, tk.fall - 3) * 2.2);
            if (dmg && tk.hp > 0) {
              tk.hp = Math.max(0, tk.hp - dmg);
              s.floats.push({ x: tk.x, y: tk.y - 9, t: 1.4, text: `−${dmg}`, c: tk === me ? "#ff6b6b" : "#ffd43b" });
              if (tk === me) s.hurt += dmg;
              else if (tk.hp <= 0) ctx.achieve("grawitacja");
            }
            tk.fall = 0; tk.vy = 0;
          }
          if (tk.y > H + 2 && tk.hp > 0) { tk.hp = 0; if (tk !== me) ctx.achieve("grawitacja"); }
        }
        return falling;
      }

      function nextTurn() {
        for (const tk of tanks) if (tk.hp <= 0 && !tk.dead) { tk.dead = true; s.booms.push({ x: tk.x, y: tk.y - 2, r: 9, t: 0 }); Sound.lose(); }
        render();
        if (me.hp <= 0) return setTimeout(() => alive && ctx.lose("Czołg zniszczony", `Strzały: ${s.shots}.`), 900);
        if (tanks.slice(1).every((t) => t.hp <= 0)) {
          if (L.key !== "easy" && !s.hurt) ctx.achieve("nietkniety");
          if (L.key === "hard" && s.shots <= 8) ctx.achieve("artylerzysta");
          return setTimeout(() => alive && ctx.win(`Strzały: ${s.shots}. Utracony pancerz: ${s.hurt}.`), 900);
        }
        // kolejny żywy czołg
        do s.turn = (s.turn + 1) % tanks.length; while (tanks[s.turn].hp <= 0);
        if (s.turn === 0) newWind();
        s.busy = false;
        render();
        if (s.turn !== 0) {
          s.busy = true;
          s.waitAi = true;
          setTimeout(aiShot, 900);
        }
      }

      function aiShot() {
        s.waitAi = false;
        if (ctx.done || !alive) return;
        const k = s.turn, tk = tanks[k];
        const best = aim(h, tanks, k, me, s.wind) || { ang: (Math.PI * 3) / 4, p: 70 };
        // błąd celowania maleje z każdą turą: komputer się wstrzeliwuje
        const ang = best.ang + (Math.random() * 2 - 1) * tk.err;
        const pow = Math.max(20, Math.min(MAXP, best.p * (1 + (Math.random() * 2 - 1) * tk.errP)));
        tk.err *= L.learn; tk.errP *= L.learn;
        tk.err = Math.max(tk.err, L.key === "easy" ? 0.04 : 0.015);
        tk.errP = Math.max(tk.errP, L.key === "easy" ? 0.04 : 0.015);
        const ammo = L.key === "hard" && Math.random() < 0.3 ? "ciezki" : L.key !== "easy" && Math.random() < 0.2 ? "rozprysk" : "zwykly";
        // obrót lufy przed strzałem
        s.aiTurn = { k, from: tk.ang, to: ang, t: 0, pow, ammo };
      }

      // --- Pętla ---
      cv.loop((dt) => {
        if (s.aiTurn) {
          s.aiTurn.t += dt * 1.6;
          const a = s.aiTurn, f = Math.min(1, a.t);
          tanks[a.k].ang = a.from + (a.to - a.from) * (1 - Math.pow(1 - f, 3));
          if (f >= 1) { s.aiTurn = null; launch(a.k, a.to, a.pow, a.ammo); }
        }
        if (myTurn()) {
          let ch = false;
          if (keys.arrowleft) { me.ang = Math.min(Math.PI - 0.02, me.ang + dt * 0.8); ch = true; }
          if (keys.arrowright) { me.ang = Math.max(0.02, me.ang - dt * 0.8); ch = true; }
          if (keys.arrowup) { me.pow = Math.min(MAXP, me.pow + dt * 30); ch = true; }
          if (keys.arrowdown) { me.pow = Math.max(15, me.pow - dt * 30); ch = true; }
          if (ch) render();
        }
        for (const sh of s.shells) {
          const sub = 4;
          for (let i = 0; i < sub && !sh.done; i++) {
            const d = dt / sub;
            sh.vx += s.wind * d; sh.vy += G * d;
            sh.x += sh.vx * d; sh.y += sh.vy * d;
            sh.t += d;
            if (sh.split && sh.vy > 0) {
              // rozprysk na szczycie lotu
              sh.done = true;
              for (const dv of [-14, 0, 14]) s.shells.push({ ...sh, vx: sh.vx + dv, split: false, done: false, path: [[sh.x, sh.y]] });
              Sound.flag();
              break;
            }
            if (sh.x < -20 || sh.x > W + 20 || sh.y > H + 20) { sh.done = true; break; }
            const hit = tanks.find((tk, k) => tk.hp > 0 && (k !== sh.from || sh.t > 0.15) && Math.abs(sh.x - tk.x) < 4.2 && sh.y > tk.y - 4 && sh.y < tk.y + 0.5);
            if (hit || sh.y >= ground(h, sh.x)) { sh.done = true; explode(sh, sh.x, Math.min(sh.y, ground(h, sh.x) + 1), hit); }
          }
          sh.path.push([sh.x, sh.y]);
          if (sh.from === 0 && !sh.split) s.trail = sh.path;
        }
        s.shells = s.shells.filter((sh) => !sh.done);
        if (s.busy && !s.shells.length && !s.aiTurn && !s.waitAi) {
          if (!settle() && !s.booms.length) { s.busy = false; s.busyTurn = true; }
        }
        if (s.busyTurn) { s.busyTurn = false; s.busy = true; nextTurn(); }
        draw(dt);
      });

      // --- Rysowanie ---
      function draw(dt) {
        g.save();
        if (s.shake > 0) { s.shake -= dt; g.translate((Math.random() - 0.5) * s.shake * 5, (Math.random() - 0.5) * s.shake * 5); }
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#3a5f9e"); sky.addColorStop(0.55, "#f0a86a"); sky.addColorStop(1, "#f7d59c");
        g.fillStyle = sky; g.fillRect(-5, -5, W + 10, H + 10);
        // słońce
        const sun = g.createRadialGradient(150, 52, 1, 150, 52, 22);
        sun.addColorStop(0, "rgba(255,250,220,1)"); sun.addColorStop(0.25, "rgba(255,220,150,0.8)"); sun.addColorStop(1, "rgba(255,200,120,0)");
        g.fillStyle = sun; g.beginPath(); g.arc(150, 52, 22, 0, 7); g.fill();
        // chmury płyną z wiatrem
        for (const c of clouds) {
          c.x += s.wind * dt * 0.8 * c.s;
          if (c.x > W + 20) c.x = -20; if (c.x < -20) c.x = W + 20;
          g.fillStyle = "rgba(255,255,255,0.55)";
          g.beginPath(); g.ellipse(c.x, c.y, 9 * c.s, 2.6 * c.s, 0, 0, 7); g.ellipse(c.x + 4 * c.s, c.y - 1.6 * c.s, 5 * c.s, 2.6 * c.s, 0, 0, 7); g.fill();
        }
        // dalekie góry
        hills.forEach((hl, layer) => {
          g.fillStyle = layer ? "rgba(120,90,110,0.55)" : "rgba(150,120,150,0.4)";
          g.beginPath(); g.moveTo(0, H); hl.forEach((y, i) => g.lineTo(i * 5, y)); g.lineTo(W, H); g.fill();
        });
        // teren
        g.beginPath(); g.moveTo(0, H + 5);
        for (let i = 0; i < h.length; i += 2) g.lineTo(i * RES, h[i]);
        g.lineTo(W, h[h.length - 1]); g.lineTo(W, H + 5); g.closePath();
        const soil = g.createLinearGradient(0, 40, 0, H);
        soil.addColorStop(0, "#8a6038"); soil.addColorStop(1, "#4a3020");
        g.fillStyle = soil; g.fill();
        g.save(); g.clip();
        g.fillStyle = "rgba(0,0,0,0.08)";
        for (let k = 0; k < 60; k++) { const x = (k * 37) % W, y = 50 + ((k * 53) % 60); g.beginPath(); g.ellipse(x, y, 2.5, 1, 0, 0, 7); g.fill(); }
        g.restore();
        g.strokeStyle = "#5f9e32"; g.lineWidth = 1.4; g.lineJoin = "round";
        g.beginPath(); for (let i = 0; i < h.length; i += 2) (i ? g.lineTo(i * RES, h[i]) : g.moveTo(0, h[0])); g.stroke();
        g.strokeStyle = "#86c34a"; g.lineWidth = 0.4;
        g.beginPath(); for (let i = 0; i < h.length; i += 2) (i ? g.lineTo(i * RES, h[i] - 0.5) : g.moveTo(0, h[0] - 0.5)); g.stroke();
        // tor poprzedniego strzału
        if (s.trail && myTurn()) {
          g.setLineDash([0.8, 1.6]); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 0.4;
          g.beginPath(); s.trail.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]);
        }
        // celownik gracza: łuk siły
        if (myTurn()) {
          const [bx, by] = barrel(me, me.ang);
          const len = 6 + (me.pow / MAXP) * 22;
          g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 0.5;
          g.setLineDash([1.2, 1]);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(me.ang) * len, by - Math.sin(me.ang) * len); g.stroke();
          g.setLineDash([]);
          g.fillStyle = "#fff"; g.beginPath(); g.arc(bx + Math.cos(me.ang) * len, by - Math.sin(me.ang) * len, 0.9, 0, 7); g.fill();
        }
        tanks.forEach((tk, k) => tank(tk, k, dt));
        // pociski z poświatą
        for (const sh of s.shells) {
          g.strokeStyle = "rgba(255,240,200,0.5)"; g.lineWidth = 0.6;
          const p = sh.path, n = p.length;
          g.beginPath(); for (let i = Math.max(0, n - 25); i < n; i++) (i === Math.max(0, n - 25) ? g.moveTo(p[i][0], p[i][1]) : g.lineTo(p[i][0], p[i][1])); g.stroke();
          g.fillStyle = sh.ammo === "ciezki" ? "#ff8a3d" : sh.ammo === "kopacz" ? "#74c0fc" : "#fff3bf";
          g.beginPath(); g.arc(sh.x, sh.y, sh.ammo === "ciezki" ? 1.3 : 0.9, 0, 7); g.fill();
        }
        // wybuchy, cząstki, dym
        for (const b of s.booms) {
          b.t += dt;
          const k = Math.min(1, b.t / 0.45);
          const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * (0.6 + k));
          gr.addColorStop(0, `rgba(255,255,220,${1 - k})`); gr.addColorStop(0.4, `rgba(255,170,60,${0.9 * (1 - k)})`); gr.addColorStop(1, "rgba(200,60,20,0)");
          g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r * (0.6 + k), 0, 7); g.fill();
        }
        s.booms = s.booms.filter((b) => b.t < 0.45);
        for (const q of s.parts) {
          q.vy += G * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
          if (q.y > ground(h, q.x)) { q.vy *= -0.3; q.vx *= 0.5; q.y = ground(h, q.x); }
          g.globalAlpha = Math.max(0, Math.min(1, q.life)); g.fillStyle = q.c; g.fillRect(q.x, q.y, q.r, q.r);
        }
        s.parts = s.parts.filter((q) => q.life > 0);
        for (const m of s.smoke) {
          m.x += m.vx * dt; m.y += m.vy * dt; m.r += dt * 2; m.life -= dt * 0.7;
          g.globalAlpha = Math.max(0, m.life * 0.35); g.fillStyle = "#555"; g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
        }
        s.smoke = s.smoke.filter((m) => m.life > 0);
        g.globalAlpha = 1;
        g.textAlign = "center";
        g.font = "700 4px Geist, system-ui, sans-serif";
        for (const f of s.floats) {
          f.t -= dt; f.y -= 6 * dt;
          g.globalAlpha = Math.max(0, Math.min(1, f.t)); g.fillStyle = "rgba(0,0,0,0.5)"; g.fillText(f.text, f.x + 0.3, f.y + 0.3); g.fillStyle = f.c; g.fillText(f.text, f.x, f.y);
        }
        s.floats = s.floats.filter((f) => f.t > 0);
        g.globalAlpha = 1;
        windGauge();
        g.restore();
      }

      function tank(tk, k, dt) {
        if (tk.dead) {
          g.fillStyle = "#2b2b2b"; g.beginPath(); g.roundRect(tk.x - 4, tk.y - 2, 8, 2, 0.8); g.fill();
          if (Math.random() < 0.15) s.smoke.push({ x: tk.x, y: tk.y - 2, vx: s.wind * 0.4, vy: -4, r: 1, life: 1.2 });
          return;
        }
        const rc = s.recoil && s.recoil.k === k ? (s.recoil.t -= dt) > 0 ? s.recoil.t * 4 : 0 : 0;
        g.save();
        g.translate(tk.x, tk.y);
        // lufa
        g.strokeStyle = "#2d2d2d"; g.lineWidth = 1.1; g.lineCap = "round";
        g.beginPath(); g.moveTo(0, -3.2); g.lineTo(Math.cos(tk.ang) * (5 - rc), -3.2 - Math.sin(tk.ang) * (5 - rc)); g.stroke();
        // gąsienice
        g.fillStyle = "#2f2f2f"; g.beginPath(); g.roundRect(-4.4, -1.6, 8.8, 1.9, 0.95); g.fill();
        g.fillStyle = "#6b6b6b"; for (let i = -3.5; i <= 3.6; i += 1.75) { g.beginPath(); g.arc(i, -0.65, 0.5, 0, 7); g.fill(); }
        // kadłub i wieża
        const body = g.createLinearGradient(0, -4.5, 0, -1.5);
        body.addColorStop(0, tk.color); body.addColorStop(1, "#1e2a35");
        g.fillStyle = body;
        g.beginPath(); g.moveTo(-4, -1.5); g.lineTo(-3.4, -3); g.lineTo(3.4, -3); g.lineTo(4, -1.5); g.fill();
        g.beginPath(); g.arc(0, -3, 1.9, Math.PI, 0); g.fill();
        g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(-3, -2.9, 6, 0.35);
        // znacznik tury
        if (s.turn === k && !ctx.done) {
          g.fillStyle = "#fff";
          const yy = -9 - Math.sin(performance.now() / 200) * 0.6;
          g.beginPath(); g.moveTo(0, yy + 2); g.lineTo(-1.3, yy); g.lineTo(1.3, yy); g.fill();
        }
        // pasek pancerza
        g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(-4, -6.4, 8, 1.1);
        g.fillStyle = tk.hp > 50 ? "#69db7c" : tk.hp > 25 ? "#ffd43b" : "#ff6b6b"; g.fillRect(-4, -6.4, (8 * tk.hp) / 100, 1.1);
        g.restore();
      }

      function windGauge() {
        g.fillStyle = "rgba(15,20,40,0.45)"; g.beginPath(); g.roundRect(84, 2, 32, 8, 2); g.fill();
        g.fillStyle = "#fff"; g.font = "600 3.2px Geist, system-ui, sans-serif"; g.textAlign = "center";
        g.fillText(s.wind ? `Wiatr ${Math.abs(s.wind).toFixed(1)}` : "Bez wiatru", 100, 5.6);
        if (s.wind) {
          const len = Math.min(12, Math.abs(s.wind) * 1.1), d = Math.sign(s.wind);
          g.strokeStyle = "#a5d8ff"; g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(100 - (len / 2) * d, 8); g.lineTo(100 + (len / 2) * d, 8); g.lineTo(100 + (len / 2) * d - d * 1.3, 7); g.moveTo(100 + (len / 2) * d, 8); g.lineTo(100 + (len / 2) * d - d * 1.3, 9); g.stroke();
        }
      }

      function render() {
        youEl.set(`${me.hp}`, me.hp / 100, myTurn() ? "Twoja tura" : s.turn ? `Strzela: ${tanks[s.turn].name.toLowerCase()}` : "Pocisk w powietrzu");
        const foes = tanks.slice(1);
        const sum = foes.reduce((a, t) => a + t.hp, 0);
        foeEl.set(foes.map((t) => t.hp).join(" · "), sum / (100 * foes.length));
        const deg = Math.round((me.ang * 180) / Math.PI);
        aimNote.textContent = `Kąt ${deg > 90 ? 180 - deg : deg}° ${deg > 90 ? "w lewo" : "w prawo"}, siła ${Math.round(me.pow)}`;
        fireBtn.disabled = !myTurn();
        ammoName.textContent = AMMO[s.ammo].name + (s.ammo === "zwykly" ? "" : ` (${s.left[s.ammo]})`);
        ammoNote.textContent = AMMO[s.ammo].note;
        ctx.progress(1 - sum / (100 * foes.length));
      }
      render();
    },
  });
}
