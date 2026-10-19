// Biegacz: postać biegnie sama; przeskakuj przeszkody na ziemi i schylaj się pod lecącymi. Tempo stale rośnie.
const Runner = { last: null };

if (typeof module !== "undefined") module.exports = Runner;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "biegacz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 600, speed: 55, birds: 0, pairs: 0 },
    { key: "medium", name: "Średni", points: 25, target: 1000, speed: 62, birds: 0.25, pairs: 0.12 },
    { key: "hard", name: "Trudny", points: 50, target: 1500, speed: 72, birds: 0.35, pairs: 0.25 },
  ],
  rules: [
    "Spacja, strzałka w górę albo dotknięcie: skok. Dłuższe przytrzymanie daje wyższy skok.",
    "Strzałka w dół albo przesunięcie palcem w dół: schylanie, przydatne pod lecącymi ptakami.",
    "Przebiegnij wymagany dystans. Każda przeszkoda trafiona kończy bieg. Na trudniejszych poziomach kaktusy stoją też parami.",
  ],
  achievements: [
    { id: "rozbieg", name: "Rozbieg", desc: "Przebiegnij 300 metrów w jednej partii.", points: 10 },
    { id: "kilometr", name: "Kilometr", desc: "Przebiegnij kilometr w jednej partii.", points: 25 },
    { id: "bez-schylania", name: "Wyprostowany", desc: "Wygraj trudny poziom, ani razu się nie schylając.", points: 50 },
  ],
  mount(board, ctx) {
    const { target, speed, birds } = ctx.level;
    const W = 120, H = 60, GROUND = 50;
    const cv = canvasGame(board, ctx, W, H, { max: 120, cls: "dusk" });
    const { g, theme } = cv;
    const s = { y: 0, vy: 0, duck: false, dist: 0, obs: [], next: 1.2, started: false, hold: 0, t: 0 };
    Runner.last = s;
    const distEl = statBlock(ctx, "Dystans", { meter: true });
    ctx.toast("Spacja albo dotknięcie: start i skok");
    const keys = heldKeys(ctx, (k) => {
      if (k === " " || k === "arrowup" || k === "w") jump();
    });
    const jump = () => {
      if (ctx.done) return;
      s.started = true;
      if (s.y === 0) { s.vy = 78; s.hold = 0.18; Sound.tap(); puff(3); }
    };
    let touch = null;
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); touch = [e.clientY, true]; jump(); });
    ctx.on(document, "pointermove", (e) => { if (touch && e.clientY - touch[0] > 20) s.duck = true; });
    ctx.on(document, "pointerup", () => { touch = null; s.duck = false; });

    cv.loop((dt) => {
      const holding = keys[" "] || keys.arrowup || keys.w || (touch && touch[1]);
      if (s.started && !ctx.done) {
        s.t += dt;
        const v = speed * (1 + s.t / 60);
        s.dist += v * dt * 0.5;
        // przytrzymanie przedłuża wybicie
        if (holding && s.hold > 0) { s.vy += 160 * dt; s.hold -= dt; } else s.hold = 0;
        s.vy -= 300 * dt;
        s.y = Math.max(0, s.y + s.vy * dt);
        if (s.y === 0) { if (s.vy < -40) puff(4); s.vy = 0; }
        s.duck = keys.arrowdown || keys.s || (touch && s.duck);
        if (s.duck) s.ducked = true;
        s.next -= dt;
        if (s.next <= 0) {
          const bird = Math.random() < birds;
          s.obs.push(bird ? { x: W + 10, kind: "bird", h: pick([8, 14]), w: 8 } : { x: W + 10, kind: "box", w: pick([4, 7, 10]), h: pick([7, 9, 12]) });
          // para kaktusów tuż za sobą: trzeba skoczyć daleko i wysoko
          if (!bird && Math.random() < ctx.level.pairs) s.obs.push({ x: W + 10 + s.obs[s.obs.length - 1].w + 3, kind: "box", w: 4, h: pick([7, 9]) });
          s.next = (0.8 + Math.random() * 0.9) * Math.max(0.6, 1 - s.t / 120);
        }
        const px = 24, pw = s.duck ? 10 : 7, ph = s.duck ? 7 : 11;
        for (const o of s.obs) {
          o.x -= v * dt;
          const oy0 = o.kind === "bird" ? o.h : 0, oy1 = o.kind === "bird" ? o.h + 5 : o.h;
          // prostokąty z małym marginesem, żeby otarcie nie kończyło gry
          if (o.x < px + pw - 1 && o.x + o.w > px + 1 && s.y < oy1 - 1 && s.y + ph > oy0 + 1) {
            Sound.lose();
            ctx.lose("Potknięcie", `Dystans: ${Math.floor(s.dist)} m.`);
          }
        }
        s.obs = s.obs.filter((o) => o.x > -20);
        render();
        if (!s.got300 && s.dist >= 300) { s.got300 = true; ctx.achieve("rozbieg"); }
        if (!s.got1000 && s.dist >= 1000) { s.got1000 = true; ctx.achieve("kilometr"); }
        if (s.dist >= target && !s.ducked && ctx.level.key === "hard") ctx.achieve("bez-schylania");
        if (s.dist >= target) ctx.win();
      }
      draw();
    });

    const dust = [];
    function puff(n) { for (let k = 0; k < n; k++) dust.push({ x: 25, y: GROUND - 0.5, vx: -10 - Math.random() * 15, vy: -Math.random() * 6, t: 0.6 }); }
    const stars = Array.from({ length: 40 }, () => [Math.random() * W, Math.random() * 30, Math.random()]);
    const mesas = Array.from({ length: 6 }, (_, i) => [i * 40 + Math.random() * 15, 8 + Math.random() * 10, 10 + Math.random() * 14]);
    // niebo od zmierzchu do nocy: im dalej, tym ciemniej (trzy palety, płynne przejście)
    const tint = (pal, k) => {
      const f = Math.min(1.999, k * 2), i = Math.floor(f), r = f - i;
      return `rgb(${pal[i].map((v, j) => Math.round(v + (pal[i + 1][j] - v) * r))})`;
    };
    function draw() {
      const k = Math.min(1, s.dist / target);
      const sky = g.createLinearGradient(0, 0, 0, GROUND);
      sky.addColorStop(0, tint([[255, 184, 119], [107, 92, 165], [27, 35, 71]], k));
      sky.addColorStop(1, tint([[255, 226, 189], [247, 160, 122], [75, 61, 110]], k));
      g.fillStyle = sky;
      g.fillRect(0, 0, W, GROUND);
      if (k > 0.45) for (const [x, y, b] of stars) { g.fillStyle = `rgba(255,255,255,${(k - 0.45) * 1.6 * b})`; g.fillRect(x, y, 0.4, 0.4); }
      // słońce zachodzi
      const sy = 22 + k * 30;
      const sun = g.createRadialGradient(84, sy, 1, 84, sy, 14);
      sun.addColorStop(0, "rgba(255,246,214,1)"); sun.addColorStop(0.35, "rgba(255,210,140,0.85)"); sun.addColorStop(1, "rgba(255,180,120,0)");
      g.fillStyle = sun; g.beginPath(); g.arc(84, sy, 14, 0, 7); g.fill();
      // płaskowyże w oddali
      g.fillStyle = tint([[214, 120, 92], [120, 72, 110], [40, 36, 70]], k);
      for (const [x0, h, w] of mesas) {
        const x = ((x0 - s.dist * 0.4) % 240 + 240) % 240 - 20;
        g.beginPath(); g.moveTo(x, GROUND); g.lineTo(x + 3, GROUND - h); g.lineTo(x + w - 3, GROUND - h); g.lineTo(x + w, GROUND); g.fill();
      }
      g.fillStyle = tint([[238, 196, 140], [190, 130, 110], [70, 58, 80]], k);
      g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = "rgba(120,70,30,0.5)";
      g.fillRect(0, GROUND, W, 0.8);
      g.fillStyle = "rgba(120,70,30,0.35)";
      for (let x = -((s.dist * 2) % 23); x < W; x += 23) { g.beginPath(); g.ellipse(x, GROUND + 4, 1.6, 0.6, 0, 0, 7); g.fill(); }
      for (let x = -((s.dist * 2) % 37); x < W; x += 37) { g.beginPath(); g.ellipse(x + 11, GROUND + 7.5, 2.4, 0.7, 0, 0, 7); g.fill(); }
      for (const o of s.obs) {
        if (o.kind === "box") {
          // kaktus: pień i ramiona, cieniowany jak walec
          const x = o.x, h = o.h, y = GROUND - h;
          const cg = g.createLinearGradient(x, 0, x + o.w, 0);
          cg.addColorStop(0, "#2b8a3e"); cg.addColorStop(0.45, "#51cf66"); cg.addColorStop(1, "#1e6b2e");
          g.fillStyle = cg;
          g.beginPath();
          g.roundRect(x + o.w / 2 - 1.8, y, 3.6, h, 1.8);
          if (o.w > 6) { g.roundRect(x, y + h * 0.35, 2.4, h * 0.35, 1.2); g.roundRect(x, y + h * 0.6, o.w / 2, 1.8, 0.9); }
          if (o.h > 8) { g.roundRect(x + o.w - 2.4, y + h * 0.2, 2.4, h * 0.35, 1.2); g.roundRect(x + o.w / 2, y + h * 0.48, o.w / 2, 1.8, 0.9); }
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.35)";
          for (let yy = y + 1.5; yy < GROUND - 1; yy += 2) g.fillRect(x + o.w / 2 - 0.3, yy, 0.6, 0.6);
          g.fillStyle = "rgba(0,0,0,0.18)";
          g.beginPath(); g.ellipse(x + o.w / 2, GROUND + 0.6, o.w * 0.6, 0.6, 0, 0, 7); g.fill();
        } else {
          const wing = Math.sin(performance.now() / 90) * 2.5;
          const y = GROUND - o.h - 5;
          g.fillStyle = "#5c3d2e";
          g.beginPath();
          g.ellipse(o.x + 4, y + 2.5, 4, 2, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#3d2a20";
          g.beginPath();
          g.moveTo(o.x + 1.5, y + 2); g.quadraticCurveTo(o.x + 4, y + 2 - wing * 1.8, o.x + 7, y + 2 - wing * 0.6); g.lineTo(o.x + 5.5, y + 2.6);
          g.fill();
          g.fillStyle = "#f2d0a4"; g.beginPath(); g.arc(o.x + 0.5, y + 1.8, 1.3, 0, 7); g.fill();
          g.fillStyle = "#f76707";
          g.beginPath(); g.moveTo(o.x - 0.6, y + 1.6); g.lineTo(o.x - 2.4, y + 2.3); g.lineTo(o.x - 0.6, y + 2.6); g.fill();
        }
      }
      for (const d of dust) {
        d.x += d.vx / 60; d.y += d.vy / 60; d.t -= 1 / 60;
        g.fillStyle = `rgba(200,160,110,${Math.max(0, d.t)})`;
        g.beginPath(); g.arc(d.x, d.y, 1.2 + (0.6 - d.t) * 2, 0, 7); g.fill();
      }
      for (let i = dust.length - 1; i >= 0; i--) if (dust[i].t <= 0) dust.splice(i, 1);
      if (s.started && s.y === 0 && !ctx.done && Math.random() < 0.15) puff(1);
      // biegacz: zaokrąglone ciało z okiem, nogi w rytm biegu
      const px = 24, foot = GROUND - s.y, bodyH = s.duck ? 5 : 9, bodyW = s.duck ? 10 : 7;
      const step = s.y > 0 ? 0.6 : Math.sin(s.dist / 1.6);
      g.fillStyle = "rgba(0,0,0,0.15)";
      g.beginPath(); g.ellipse(px + bodyW / 2, GROUND + 0.4, bodyW * 0.6 * (1 - Math.min(0.6, s.y / 40)), 0.7, 0, 0, 7); g.fill();
      g.fillStyle = "#3b5e0f";
      g.beginPath();
      g.roundRect(px + 1, foot - 2.2 - Math.max(0, step) * 1.2, 2.2, 2.2, 0.9);
      g.roundRect(px + bodyW - 3.2, foot - 2.2 - Math.max(0, -step) * 1.2, 2.2, 2.2, 0.9);
      g.fill();
      const bg = g.createLinearGradient(0, foot - 2 - bodyH, 0, foot - 2);
      bg.addColorStop(0, "#a3e05c"); bg.addColorStop(1, theme.c);
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(px, foot - 2 - bodyH, bodyW, bodyH, s.duck ? 2.5 : 3.2);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(px + bodyW - 2.2, foot - bodyH, 1.4, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(px + bodyW - 1.7, foot - bodyH, 0.65, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,120,120,0.5)";
      g.beginPath(); g.ellipse(px + bodyW - 1.6, foot - bodyH + 2, 0.9, 0.5, 0, 0, 7); g.fill();
      g.fillStyle = k > 0.6 ? "#ffffff" : theme.text;
      g.font = "600 6px Geist, system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(`${Math.floor(s.dist)} m`, W - 6, 10);
    }
    function render() {
      distEl.set(`${Math.floor(s.dist)} m`, s.dist / target, `Cel: ${target} m`);
      ctx.progress(s.dist / target);
    }
    render();
  },
});
