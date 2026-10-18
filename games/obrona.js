// Obrona (Missile Command): kliknij w niebo, żeby wystrzelić pocisk przechwytujący. Jego wybuch niszczy rakiety w zasięgu.
// Przetrwaj wszystkie fale, zanim rakiety zniszczą miasta.
const Defense = { last: null };

if (typeof module !== "undefined") module.exports = Defense;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "obrona"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, waves: 2, base: 7, speed: 10, split: 0 },
    { key: "medium", name: "Średni", points: 25, waves: 3, base: 9, speed: 13, split: 0.15 },
    { key: "hard", name: "Trudny", points: 50, waves: 4, base: 11, speed: 16, split: 0.3 },
  ],
  rules: [
    "Kliknij albo dotknij miejsca na niebie: wyrzutnia wystrzeli tam pocisk, który wybuchnie w tym punkcie.",
    "Wybuch niszczy wszystkie rakiety w swoim zasięgu, więc celuj nieco przed nie. Liczba pocisków w fali jest ograniczona.",
    "Przetrwaj wszystkie fale. Na trudniejszych poziomach niektóre rakiety rozdzielają się w locie.",
  ],
  achievements: [
    { id: "obronca", name: "Obrońca", desc: "Wygraj, ratując co najmniej 4 miasta.", points: 10 },
    { id: "tarcza", name: "Tarcza", desc: "Wygraj średni poziom, ratując wszystkie miasta.", points: 25 },
    { id: "nietykalni", name: "Nietykalni", desc: "Wygraj trudny poziom, ratując wszystkie miasta.", points: 50 },
  ],
  mount(board, ctx) {
    const { waves, base, speed, split } = ctx.level;
    const W = 120, H = 100, GROUND = 92, LX = 60, LY = 88;
    const cv = canvasGame(board, ctx, W, H, { max: 90 });
    const { g, theme } = cv;
    const s = { cities: [12, 26, 40, 80, 94, 108].map((x) => ({ x, alive: true })), wave: 0, queue: 0, missiles: [], shots: [], booms: [], ammo: 0, spawnT: 0, gap: 0, score: 0 };
    Defense.last = s;
    const waveEl = statBlock(ctx, "Fala", { meter: true });
    const ammoEl = statBlock(ctx, "Pociski", { small: true });
    function nextWave() {
      s.wave++;
      s.queue = base + s.wave * 3;
      s.ammo = Math.ceil(s.queue * 1.6) + 4;
      s.spawnT = 1.2;
      render();
    }
    const targets = () => [...s.cities.filter((c) => c.alive).map((c) => c.x), LX];
    function launch(x0, y0, tx) {
      const v = speed * (1 + s.wave * 0.12) * (0.8 + Math.random() * 0.4);
      const d = Math.hypot(tx - x0, GROUND - y0);
      s.missiles.push({ x0, y0, x: x0, y: y0, tx, vx: ((tx - x0) / d) * v, vy: ((GROUND - y0) / d) * v, splits: Math.random() < split });
    }
    ctx.on(cv.cv, "pointerdown", (e) => {
      e.preventDefault();
      if (ctx.done) return;
      const [x, y] = cv.at(e);
      if (y > GROUND - 6) return;
      if (s.ammo <= 0) { Sound.error(); return ctx.toast("Brak pocisków w tej fali"); }
      s.ammo--;
      const d = Math.hypot(x - LX, y - LY);
      s.shots.push({ x: LX, y: LY, tx: x, ty: y, vx: ((x - LX) / d) * 95, vy: ((y - LY) / d) * 95 });
      Sound.tap();
      render();
    });
    nextWave();

    cv.loop((dt) => {
      if (!ctx.done) {
        s.spawnT -= dt;
        if (s.queue > 0 && s.spawnT <= 0) {
          s.queue--;
          s.spawnT = Math.max(0.35, 1.5 - s.wave * 0.18) * (0.5 + Math.random());
          launch(Math.random() * W, 0, pick(targets()));
        }
        for (const m of s.missiles) {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          // rozdzielenie w połowie drogi na dwie rakiety
          if (m.splits && m.y > 35) { m.splits = false; launch(m.x, m.y, pick(targets())); launch(m.x, m.y, pick(targets())); m.dead = true; }
          if (m.y >= GROUND) {
            m.dead = true;
            s.booms.push({ x: m.x, y: GROUND, r: 0, max: 7, t: 0, enemy: true });
            const c = s.cities.find((c) => c.alive && Math.abs(c.x - m.x) < 6);
            if (c) { c.alive = false; Sound.lose(); render(); }
          }
        }
        for (const sh of s.shots) {
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          if (sh.y <= sh.ty) { sh.dead = true; s.booms.push({ x: sh.tx, y: sh.ty, r: 0, max: 10, t: 0 }); Sound.place(4); }
        }
        for (const b of s.booms) {
          b.t += dt;
          b.r = b.max * Math.sin(Math.min(1, b.t / 1.1) * Math.PI);
          if (b.enemy) continue;
          for (const m of s.missiles) if (!m.dead && Math.hypot(m.x - b.x, m.y - b.y) < b.r) { m.dead = true; s.score += 25; s.booms.push({ x: m.x, y: m.y, r: 0, max: 6, t: 0 }); Sound.place(8); }
        }
        s.missiles = s.missiles.filter((m) => !m.dead);
        s.shots = s.shots.filter((x) => !x.dead);
        s.booms = s.booms.filter((b) => b.t < 1.1);
        if (!s.cities.some((c) => c.alive)) return ctx.lose("Miasta zniszczone", `Fala ${s.wave} z ${waves}.`);
        if (!s.queue && !s.missiles.length && !s.booms.length) {
          s.score += s.cities.filter((c) => c.alive).length * 100;
          if (s.wave >= waves) {
            const saved = s.cities.filter((c) => c.alive).length;
            if (saved >= 4) ctx.achieve("obronca");
            if (saved === s.cities.length && ctx.level.key === "medium") ctx.achieve("tarcza");
            if (saved === s.cities.length && ctx.level.key === "hard") ctx.achieve("nietykalni");
            render(); return ctx.win(`Ocalałe miasta: ${s.cities.filter((c) => c.alive).length} z 6.`); }
          Sound.line();
          ctx.toast(`Fala ${s.wave + 1}`);
          nextWave();
        }
      }
      draw();
    });

    function draw() {
      g.fillStyle = "#2b2f3a";
      g.globalAlpha = 0.06;
      g.fillRect(0, 0, W, GROUND);
      g.globalAlpha = 1;
      g.fillStyle = "#c08a5c";
      g.fillRect(0, GROUND, W, H - GROUND);
      // miasta: kilka bloków różnej wysokości
      for (const c of s.cities) {
        if (!c.alive) { g.fillStyle = theme.muted; g.fillRect(c.x - 5, GROUND - 1.5, 10, 1.5); continue; }
        g.fillStyle = theme.c;
        [[-5, 4, 3], [-2, 7, 3], [1, 5, 2.5], [3.5, 3, 1.5]].forEach(([dx, h, w]) => g.fillRect(c.x + dx, GROUND - h, w, h));
        g.fillStyle = "rgba(255,255,255,0.7)";
        g.fillRect(c.x - 1.2, GROUND - 6, 0.8, 0.8);
        g.fillRect(c.x - 4, GROUND - 3, 0.8, 0.8);
      }
      // wyrzutnia
      g.fillStyle = theme.text;
      g.beginPath(); g.moveTo(LX - 6, GROUND); g.lineTo(LX, LY - 3); g.lineTo(LX + 6, GROUND); g.fill();
      g.lineWidth = 0.5;
      for (const m of s.missiles) {
        g.strokeStyle = "rgba(209,45,75,0.55)";
        g.beginPath(); g.moveTo(m.x0, m.y0); g.lineTo(m.x, m.y); g.stroke();
        g.fillStyle = "#e03131";
        g.fillRect(m.x - 0.7, m.y - 0.7, 1.4, 1.4);
      }
      for (const sh of s.shots) {
        g.strokeStyle = theme.c;
        g.beginPath(); g.moveTo(LX, LY - 3); g.lineTo(sh.x, sh.y); g.stroke();
        g.strokeStyle = theme.text;
        g.beginPath(); g.moveTo(sh.tx - 1.5, sh.ty - 1.5); g.lineTo(sh.tx + 1.5, sh.ty + 1.5); g.moveTo(sh.tx + 1.5, sh.ty - 1.5); g.lineTo(sh.tx - 1.5, sh.ty + 1.5); g.stroke();
      }
      for (const b of s.booms) {
        const grd = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.max(0.1, b.r));
        grd.addColorStop(0, "#fff");
        grd.addColorStop(0.4, b.enemy ? "#ff922b" : "#ffd43b");
        grd.addColorStop(1, b.enemy ? "rgba(224,49,49,0)" : "rgba(194,37,92,0)");
        g.fillStyle = grd;
        g.beginPath(); g.arc(b.x, b.y, Math.max(0.1, b.r), 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = theme.bg;
      g.font = "600 4px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(`${s.ammo}`, LX, GROUND + 5.5);
    }
    function render() {
      const alive = s.cities.filter((c) => c.alive).length;
      waveEl.set(`${s.wave} / ${waves}`, (s.wave - 1) / waves, `Miasta: ${alive} z 6. Punkty: ${s.score}`);
      ammoEl.set(s.ammo);
      ctx.progress((s.wave - 1) / waves);
    }
  },
});
