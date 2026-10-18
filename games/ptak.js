// Ptak (Flappy): grawitacja ciągnie ptaka w dół, każde machnięcie podrzuca go w górę. Przelatuj przez szczeliny między rurami.
const Flappy = { last: null };

if (typeof module !== "undefined") module.exports = Flappy;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "ptak"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 10, gap: 44, speed: 34, every: 1.9 },
    { key: "medium", name: "Średni", points: 25, target: 20, gap: 38, speed: 40, every: 1.7 },
    { key: "hard", name: "Trudny", points: 50, target: 30, gap: 33, speed: 46, every: 1.55 },
  ],
  rules: [
    "Kliknij, dotknij albo naciśnij spację, żeby ptak machnął skrzydłami i podskoczył.",
    "Przelatuj przez szczeliny między rurami. Uderzenie w rurę, ziemię albo sufit kończy lot.",
    "Przeleć przez wymaganą liczbę szczelin. Na trudniejszych poziomach szczeliny są węższe, a rury szybsze.",
  ],
  mount(board, ctx) {
    const { target, gap, speed, every } = ctx.level;
    const W = 100, H = 140, GROUND = 128, R = 3.4;
    const cv = canvasGame(board, ctx, W, H, { max: 84 });
    const { g, theme } = cv;
    const s = { y: 60, vy: 0, pipes: [], passed: 0, started: false, t: 0, next: 0.6, dead: false };
    Flappy.last = s;
    const passEl = statBlock(ctx, "Szczeliny", { meter: true });
    ctx.toast("Kliknij albo naciśnij spację, żeby wystartować");
    const flap = () => {
      if (ctx.done || s.dead) return;
      s.started = true;
      s.vy = -52;
      Sound.tap();
    };
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); flap(); });
    heldKeys(ctx, (k) => { if (k === " " || k === "arrowup" || k === "w") flap(); });
    // chmurki w tle
    const clouds = Array.from({ length: 5 }, () => ({ x: Math.random() * W, y: 10 + Math.random() * 60, r: 5 + Math.random() * 6 }));

    cv.loop((dt) => {
      if (s.started && !ctx.done) {
        s.t += dt;
        s.vy += 150 * dt;
        s.y += s.vy * dt;
        s.next -= dt;
        if (s.next <= 0) {
          s.next = every;
          s.pipes.push({ x: W + 8, gy: 22 + Math.random() * (GROUND - 44 - gap), done: false });
        }
        for (const p of s.pipes) {
          p.x -= speed * dt;
          if (!p.done && p.x + 7 < 28) {
            p.done = true;
            s.passed++;
            Sound.place(1 + (s.passed % 9));
            render();
            if (s.passed >= target) { ctx.win(); }
          }
          // zderzenie: okrąg ptaka z prostokątem górnej i dolnej rury
          for (const [y0, y1] of [[-10, p.gy], [p.gy + gap, GROUND]]) {
            const nx = Math.max(p.x - 7, Math.min(28, p.x + 7)), ny = Math.max(y0, Math.min(s.y, y1));
            if (Math.hypot(28 - nx, s.y - ny) < R * 0.9) crash();
          }
        }
        s.pipes = s.pipes.filter((p) => p.x > -12);
        if (s.y + R > GROUND || s.y - R < 0) crash();
      } else if (!s.started) s.y = 60 + Math.sin(performance.now() / 300) * 2;
      draw();
    });
    function crash() {
      if (s.dead) return;
      s.dead = true;
      Sound.lose();
      ctx.lose("Bęc!", `Przelot przez ${s.passed} ${plural(s.passed, "szczelinę", "szczeliny", "szczelin")}.`);
    }
    function draw() {
      g.fillStyle = theme.c;
      g.globalAlpha = 0.12;
      for (const c of clouds) {
        c.x -= (s.started && !s.dead ? speed * 0.15 : 2) / 60;
        if (c.x < -15) c.x = W + 15;
        g.beginPath();
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        g.arc(c.x + c.r, c.y + 1, c.r * 0.8, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      for (const p of s.pipes) {
        for (const [y0, y1] of [[-2, p.gy], [p.gy + gap, GROUND]]) {
          g.fillStyle = "#2f9e44";
          g.beginPath();
          g.roundRect(p.x - 6, y0, 12, y1 - y0, 1.5);
          g.fill();
          g.fillStyle = "#40c057";
          g.beginPath();
          g.roundRect(p.x - 7.5, y0 === -2 ? y1 - 5 : y0, 15, 5, 1.5);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.25)";
          g.fillRect(p.x - 4, y0, 2, y1 - y0);
        }
      }
      g.fillStyle = theme.line;
      g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = theme.muted;
      for (let x = -((s.t * speed) % 8); x < W; x += 8) g.fillRect(x, GROUND, 4, 1.4);
      // ptak przechyla się zgodnie z prędkością
      g.save();
      g.translate(28, s.y);
      g.rotate(Math.max(-0.5, Math.min(1.1, s.vy / 90)));
      g.fillStyle = theme.c;
      g.beginPath();
      g.ellipse(0, 0, R * 1.25, R, 0, 0, Math.PI * 2);
      g.fill();
      const flapT = Math.sin(performance.now() / (s.vy < 0 ? 40 : 110));
      g.fillStyle = "rgba(255,255,255,0.7)";
      g.beginPath();
      g.ellipse(-1, 0.5 + flapT, 2, 1.1, -0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(2, -1.2, 1.25, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(2.4, -1.2, 0.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f76707";
      g.beginPath();
      g.moveTo(3.6, 0); g.lineTo(6.4, 0.8); g.lineTo(3.6, 1.8);
      g.fill();
      g.restore();
      g.fillStyle = theme.text;
      g.font = "700 12px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(s.passed, W / 2, 20);
    }
    function render() {
      passEl.set(`${s.passed} / ${target}`, s.passed / target);
      ctx.progress(s.passed / target);
    }
    render();
  },
});
