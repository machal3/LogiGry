// Biegacz: postać biegnie sama; przeskakuj przeszkody na ziemi i schylaj się pod lecącymi. Tempo stale rośnie.
const Runner = { last: null };

if (typeof module !== "undefined") module.exports = Runner;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "biegacz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 600, speed: 55, birds: 0 },
    { key: "medium", name: "Średni", points: 25, target: 1000, speed: 62, birds: 0.25 },
    { key: "hard", name: "Trudny", points: 50, target: 1500, speed: 70, birds: 0.35 },
  ],
  rules: [
    "Spacja, strzałka w górę albo dotknięcie: skok. Dłuższe przytrzymanie daje wyższy skok.",
    "Strzałka w dół albo przesunięcie palcem w dół: schylanie, przydatne pod lecącymi ptakami.",
    "Przebiegnij wymagany dystans. Każda przeszkoda trafiona kończy bieg.",
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
      if (s.y === 0) { s.vy = 78; s.hold = 0.18; Sound.tap(); }
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
        if (s.y === 0) s.vy = 0;
        s.duck = keys.arrowdown || keys.s || (touch && s.duck);
        if (s.duck) s.ducked = true;
        s.next -= dt;
        if (s.next <= 0) {
          const bird = Math.random() < birds;
          s.obs.push(bird ? { x: W + 10, kind: "bird", h: pick([8, 14]), w: 8 } : { x: W + 10, kind: "box", w: pick([4, 7, 10]), h: pick([7, 9, 12]) });
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

    function draw() {
      g.fillStyle = theme.line;
      g.fillRect(0, GROUND, W, 1.2);
      g.fillStyle = theme.muted;
      for (let x = -((s.dist * 2) % 23); x < W; x += 23) g.fillRect(x, GROUND + 4, 3, 0.8);
      for (let x = -((s.dist * 1.3) % 37); x < W; x += 37) g.fillRect(x + 11, GROUND + 7, 5, 0.8);
      for (const o of s.obs) {
        if (o.kind === "box") {
          // kaktus: pień i ramiona
          const x = o.x, h = o.h, y = GROUND - h;
          g.fillStyle = "#2f9e44";
          g.beginPath();
          g.roundRect(x + o.w / 2 - 1.8, y, 3.6, h, 1.8);
          if (o.w > 6) { g.roundRect(x, y + h * 0.35, 2.4, h * 0.35, 1.2); g.roundRect(x, y + h * 0.6, o.w / 2, 1.8, 0.9); }
          if (o.h > 8) { g.roundRect(x + o.w - 2.4, y + h * 0.2, 2.4, h * 0.35, 1.2); g.roundRect(x + o.w / 2, y + h * 0.48, o.w / 2, 1.8, 0.9); }
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.3)";
          g.fillRect(x + o.w / 2 - 0.8, y + 1, 0.8, h - 2);
        } else {
          const wing = Math.sin(performance.now() / 90) * 2.5;
          const y = GROUND - o.h - 5;
          g.fillStyle = theme.text;
          g.beginPath();
          g.ellipse(o.x + 4, y + 2.5, 4, 2, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.moveTo(o.x + 2, y + 2); g.lineTo(o.x + 4, y + 2 - wing * 1.4); g.lineTo(o.x + 6, y + 2);
          g.fill();
          g.fillStyle = "#f76707";
          g.fillRect(o.x - 1.5, y + 2, 1.8, 0.9);
        }
      }
      // biegacz: zaokrąglone ciało z okiem, nogi w rytm biegu
      const px = 24, foot = GROUND - s.y, bodyH = s.duck ? 5 : 9, bodyW = s.duck ? 10 : 7;
      const step = s.y > 0 ? 0.6 : Math.sin(s.dist / 1.6);
      g.fillStyle = theme.text;
      g.beginPath();
      g.roundRect(px + 1, foot - 2.2 - Math.max(0, step) * 1.2, 2, 2.2, 0.8);
      g.roundRect(px + bodyW - 3, foot - 2.2 - Math.max(0, -step) * 1.2, 2, 2.2, 0.8);
      g.fill();
      g.fillStyle = theme.c;
      g.beginPath();
      g.roundRect(px, foot - 2 - bodyH, bodyW, bodyH, s.duck ? 2.5 : 3.2);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(px + bodyW - 2.2, foot - bodyH, 1.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(px + bodyW - 1.8, foot - bodyH, 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = theme.text;
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
