// Ptak (Flappy): grawitacja ciągnie ptaka w dół, każde machnięcie podrzuca go w górę. Przelatuj przez szczeliny między rurami.
const Flappy = { last: null };

if (typeof module !== "undefined") module.exports = Flappy;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "ptak"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 10, gap: 44, speed: 34, every: 1.9, sway: 0 },
    { key: "medium", name: "Średni", points: 25, target: 20, gap: 38, speed: 40, every: 1.7, sway: 0.3 },
    { key: "hard", name: "Trudny", points: 50, target: 30, gap: 34, speed: 46, every: 1.55, sway: 0.65 },
  ],
  rules: [
    "Kliknij, dotknij albo naciśnij spację, żeby ptak machnął skrzydłami i podskoczył.",
    "Przelatuj przez szczeliny między rurami. Uderzenie w rurę, ziemię albo sufit kończy lot.",
    "Przeleć przez wymaganą liczbę szczelin. Na trudniejszych poziomach szczeliny są węższe, rury szybsze, a część szczelin przesuwa się w górę i w dół.",
  ],
  achievements: [
    { id: "pietnascie", name: "Lot próbny", desc: "Przeleć przez 15 szczelin w jednej partii.", points: 10 },
    { id: "dwadziescia-piec", name: "Długi lot", desc: "Przeleć przez 25 szczelin w jednej partii.", points: 25 },
    { id: "szybowiec", name: "Szybowiec", desc: "Wygraj trudny poziom, machając skrzydłami najwyżej 90 razy.", points: 50 },
  ],
  mount(board, ctx) {
    const { target, gap, speed, every } = ctx.level;
    const W = 100, H = 140, GROUND = 128, R = 3.4;
    const cv = canvasGame(board, ctx, W, H, { max: 84, cls: "meadow" });
    const { g, theme } = cv;
    const s = { y: 60, vy: 0, pipes: [], passed: 0, started: false, t: 0, next: 0.6, dead: false };
    Flappy.last = s;
    const passEl = statBlock(ctx, "Szczeliny", { meter: true });
    ctx.toast("Kliknij albo naciśnij spację, żeby wystartować");
    const flap = () => {
      if (ctx.done || s.dead) return;
      s.started = true;
      s.vy = -52;
      s.flaps = (s.flaps || 0) + 1;
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
          // ruchoma szczelina: kołysze się w pionie, ale nie wychodzi poza planszę
          const amp = Math.random() < ctx.level.sway ? 6 + Math.random() * 8 : 0;
          const base = 22 + amp + Math.random() * (GROUND - 44 - gap - amp * 2);
          s.pipes.push({ x: W + 8, gy: base, base, amp, ph: Math.random() * 6, done: false });
        }
        for (const p of s.pipes) {
          p.x -= speed * dt;
          if (p.amp) p.gy = p.base + Math.sin(s.t * 1.8 + p.ph) * p.amp;
          if (!p.done && p.x + 7 < 28) {
            p.done = true;
            s.passed++;
            Sound.place(1 + (s.passed % 9));
            render();
            if (s.passed === 15) ctx.achieve("pietnascie");
            if (s.passed === 25) ctx.achieve("dwadziescia-piec");
            if (s.passed >= target && ctx.level.key === "hard" && s.flaps <= 90) ctx.achieve("szybowiec");
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
      for (let k = 0; k < 14; k++) feathers.push({ x: 28, y: s.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.9) * 40, r: Math.random() * 6, t: 1.4 });
      Sound.lose();
      ctx.lose("Bęc!", `Przelot przez ${s.passed} ${plural(s.passed, "szczelinę", "szczeliny", "szczelin")}.`);
    }
    const feathers = [];
    // dalekie wzgórza i drzewa przewijają się wolniej niż rury (paralaksa)
    const hills = Array.from({ length: 12 }, (_, i) => [i * 12, 6 + Math.random() * 8]);
    const trees = Array.from({ length: 10 }, (_, i) => [i * 11 + Math.random() * 5, 4 + Math.random() * 5]);
    function draw() {
      const run = s.started && !s.dead ? s.t : performance.now() / 4000;
      g.fillStyle = "#fff";
      for (const c of clouds) {
        c.x -= (s.started && !s.dead ? speed * 0.15 : 2) / 60;
        if (c.x < -15) c.x = W + 15;
        g.globalAlpha = 0.85;
        g.beginPath();
        g.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        g.arc(c.x + c.r, c.y + 1, c.r * 0.8, 0, Math.PI * 2);
        g.arc(c.x - c.r * 0.8, c.y + 1.5, c.r * 0.6, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      const off = (k, span) => -((run * speed * k) % span);
      g.fillStyle = "#a9dba0";
      for (const sh of [0, 144]) {
        g.beginPath(); g.moveTo(off(0.2, 144) + sh, GROUND);
        hills.forEach(([x, h]) => g.lineTo(off(0.2, 144) + sh + x, GROUND - 14 - h - Math.sin(x / 9) * 4));
        g.lineTo(off(0.2, 144) + sh + 144, GROUND); g.fill();
      }
      g.fillStyle = "#6fbf73";
      for (const sh of [0, 110]) for (const [x, h] of trees) {
        const tx = off(0.45, 110) + sh + x;
        g.beginPath(); g.ellipse(tx, GROUND - h - 3, 3.2, h, 0, 0, 7); g.fill();
      }
      for (const p of s.pipes) {
        for (const [y0, y1] of [[-2, p.gy], [p.gy + gap, GROUND]]) {
          // rura jak walec: światło z lewej, cień z prawej
          const body = g.createLinearGradient(p.x - 6, 0, p.x + 6, 0);
          body.addColorStop(0, "#5fd068"); body.addColorStop(0.3, "#9be59f"); body.addColorStop(0.55, "#40c057"); body.addColorStop(1, "#237a35");
          g.fillStyle = body;
          g.fillRect(p.x - 6, y0, 12, y1 - y0);
          const rim = g.createLinearGradient(p.x - 7.5, 0, p.x + 7.5, 0);
          rim.addColorStop(0, "#69db7c"); rim.addColorStop(0.3, "#b2f2bb"); rim.addColorStop(0.6, "#51cf66"); rim.addColorStop(1, "#2b8a3e");
          g.fillStyle = rim;
          const ry = y0 === -2 ? y1 - 5 : y0;
          g.beginPath(); g.roundRect(p.x - 7.5, ry, 15, 5, 1.2); g.fill();
          g.strokeStyle = "rgba(20,70,30,0.5)"; g.lineWidth = 0.4; g.stroke();
          if (p.amp) {
            // znaczek ruchomej szczeliny
            g.fillStyle = "rgba(255,255,255,0.75)";
            const ay = y0 === -2 ? y1 - 2.5 : y0 + 2.5;
            g.beginPath(); g.moveTo(p.x - 1.4, ay); g.lineTo(p.x, ay - 1.6); g.lineTo(p.x + 1.4, ay); g.lineTo(p.x, ay + 1.6); g.fill();
          }
        }
      }
      // ziemia: trawa i ziemia w pasy
      g.fillStyle = "#c9a26b";
      g.fillRect(0, GROUND, W, H - GROUND);
      g.fillStyle = "#b88d55";
      for (let x = off(1, 10); x < W; x += 10) { g.beginPath(); g.moveTo(x, H); g.lineTo(x + 6, GROUND + 3); g.lineTo(x + 10, GROUND + 3); g.lineTo(x + 4, H); g.fill(); }
      g.fillStyle = "#74c947";
      g.fillRect(0, GROUND - 0.5, W, 3.5);
      g.fillStyle = "#5aad33";
      for (let x = off(1, 4); x < W; x += 4) { g.beginPath(); g.moveTo(x, GROUND + 3); g.lineTo(x + 2, GROUND + 5); g.lineTo(x + 4, GROUND + 3); g.fill(); }
      // pióra po zderzeniu
      for (const f of feathers) {
        f.vy += 30 / 60; f.x += f.vx / 60; f.y += f.vy / 60; f.r += 0.1; f.t -= 1 / 60;
        g.save(); g.globalAlpha = Math.max(0, f.t); g.translate(f.x, f.y); g.rotate(f.r);
        g.fillStyle = "#ffe066"; g.beginPath(); g.ellipse(0, 0, 1.6, 0.6, 0, 0, 7); g.fill(); g.restore();
      }
      // ptak przechyla się zgodnie z prędkością
      g.save();
      g.translate(28, s.y);
      g.rotate(Math.max(-0.5, Math.min(1.1, s.vy / 90)));
      const body = g.createRadialGradient(-1, -1.5, 0.5, 0, 0, R * 1.4);
      body.addColorStop(0, "#fff3bf"); body.addColorStop(0.5, theme.c); body.addColorStop(1, "#e67700");
      g.fillStyle = body;
      g.beginPath();
      g.ellipse(0, 0, R * 1.25, R, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff9db";
      g.beginPath(); g.ellipse(0.6, 1.4, 2.4, 1.3, 0, 0, 7); g.fill();
      const flapT = Math.sin(performance.now() / (s.vy < 0 ? 40 : 110));
      g.fillStyle = "#fab005";
      g.beginPath();
      g.ellipse(-1.4, 0.2 + flapT * 1.3, 2.3, 1.2, -0.3 + flapT * 0.3, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "rgba(160,90,0,0.4)"; g.lineWidth = 0.25; g.stroke();
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(2, -1.2, 1.35, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(2.45, -1.15, 0.65, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#f76707";
      g.beginPath();
      g.moveTo(3.4, -0.2); g.lineTo(6.4, 0.7); g.lineTo(3.4, 1.8);
      g.fill();
      g.restore();
      g.lineWidth = 1.6;
      g.strokeStyle = "rgba(24,50,78,0.35)";
      g.fillStyle = "#ffffff";
      g.font = "700 12px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.strokeText(s.passed, W / 2, 20);
      g.fillText(s.passed, W / 2, 20);
    }
    function render() {
      passEl.set(`${s.passed} / ${target}`, s.passed / target);
      ctx.progress(s.passed / target);
    }
    render();
  },
});
