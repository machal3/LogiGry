// Ping-pong: twoja paletka na dole, komputer na górze. Miejsce odbicia na paletce ustala kąt lotu piłki.
const Pong = { last: null };

if (typeof module !== "undefined") module.exports = Pong;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "ping-pong"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, to: 5, ai: 38, err: 9, ball: 62 },
    { key: "medium", name: "Średni", points: 25, to: 7, ai: 52, err: 6, ball: 72 },
    { key: "hard", name: "Trudny", points: 50, to: 7, ai: 66, err: 3.5, ball: 82 },
  ],
  rules: [
    "Steruj dolną paletką myszą, palcem albo strzałkami. Odbijaj piłkę na stronę komputera.",
    "Odbicie brzegiem paletki posyła piłkę pod ostrym kątem. Każde odbicie trochę ją przyspiesza.",
    "Kto pierwszy zdobędzie wymaganą liczbę punktów, wygrywa mecz. Serwuje ten, kto stracił punkt.",
  ],
  mount(board, ctx) {
    const { to, ai, err, ball } = ctx.level;
    const W = 100, H = 140, PW = 18, PH = 2.6, R = 1.8;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    const s = { me: W / 2, cpu: W / 2, b: null, score: [0, 0], serve: 1, wait: 1, aimErr: 0, hits: 0, trail: [] };
    Pong.last = s;
    const scoreEl = statBlock(ctx, "Wynik", { meter: true });
    const keys = heldKeys(ctx);
    ctx.on(cv.cv, "pointermove", (e) => { s.me = cv.at(e)[0]; });
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); s.me = cv.at(e)[0]; });
    function serve() {
      const dir = s.serve; // 1 = w dół, do gracza
      const a = (Math.random() - 0.5) * 0.8;
      s.b = { x: W / 2, y: H / 2, vx: Math.sin(a) * ball, vy: Math.cos(a) * ball * dir, sp: ball };
      s.hits = 0;
      s.aimErr = (Math.random() - 0.5) * err * 2;
    }
    // komputer przewiduje, gdzie piłka dotrze do jego linii (z odbiciami od ścian)
    function predict(b) {
      if (b.vy >= 0) return W / 2;
      const t = (8 - b.y) / b.vy;
      let x = b.x + b.vx * t;
      const span = W - 2 * R;
      x = ((x - R) % (2 * span) + 2 * span) % (2 * span);
      return R + (x > span ? 2 * span - x : x);
    }
    function point(who) {
      s.score[who]++;
      s.serve = who === 0 ? -1 : 1;
      s.b = null;
      s.wait = 1;
      who === 0 ? Sound.line() : Sound.erase();
      render();
      if (s.score[0] >= to) ctx.win(`Wynik ${s.score[0]} : ${s.score[1]}.`);
      else if (s.score[1] >= to) ctx.lose("Mecz przegrany", `Wynik ${s.score[0]} : ${s.score[1]}.`);
    }
    cv.loop((dt) => {
      if (!ctx.done) {
        s.me += ((keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0)) * 90 * dt;
        s.me = Math.max(PW / 2, Math.min(W - PW / 2, s.me));
        if (!s.b) { s.wait -= dt; if (s.wait <= 0) serve(); }
        const b = s.b;
        if (b) {
          const target = b.vy < 0 ? predict(b) + s.aimErr : W / 2;
          s.cpu += Math.max(-ai * dt, Math.min(ai * dt, target - s.cpu));
          s.cpu = Math.max(PW / 2, Math.min(W - PW / 2, s.cpu));
          const n = 4;
          for (let k = 0; k < n && s.b; k++) {
            b.x += (b.vx * dt) / n;
            b.y += (b.vy * dt) / n;
            if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); Sound.tap(); }
            if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); Sound.tap(); }
            // odbicia od paletek: kąt zależy od miejsca trafienia
            for (const [px, py, dir] of [[s.me, H - 8, -1], [s.cpu, 8, 1]]) {
              if (Math.sign(b.vy) === dir || Math.abs(b.y - py) > R + PH / 2 || Math.abs(b.x - px) > PW / 2 + R) continue;
              const rel = Math.max(-1, Math.min(1, (b.x - px) / (PW / 2)));
              b.sp = Math.min(ball * 1.9, b.sp * 1.05);
              const a = rel * 1.05;
              b.vx = Math.sin(a) * b.sp;
              b.vy = Math.cos(a) * b.sp * dir;
              b.y = py + dir * (R + PH / 2);
              s.hits++;
              if (dir === 1) s.aimErr = (Math.random() - 0.5) * err * 2;
              Sound.place(dir === -1 ? 5 : 3);
            }
            if (b.y > H + 4) point(1);
            else if (b.y < -4) point(0);
          }
          if (s.b) { s.trail.push([b.x, b.y]); if (s.trail.length > 8) s.trail.shift(); }
        } else s.trail = [];
      }
      draw();
    });
    function draw() {
      g.strokeStyle = theme.line;
      g.lineWidth = 0.6;
      g.setLineDash([2, 2]);
      g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
      g.setLineDash([]);
      g.fillStyle = theme.line;
      g.font = "700 18px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.fillText(s.score[1], W / 2, H / 2 - 8);
      g.fillText(s.score[0], W / 2, H / 2 + 22);
      g.fillStyle = theme.text;
      g.beginPath(); g.roundRect(s.cpu - PW / 2, 8 - PH / 2, PW, PH, PH / 2); g.fill();
      g.fillStyle = theme.c;
      g.beginPath(); g.roundRect(s.me - PW / 2, H - 8 - PH / 2, PW, PH, PH / 2); g.fill();
      s.trail.forEach(([x, y], k) => { g.globalAlpha = (k / s.trail.length) * 0.35; g.fillStyle = theme.c; g.beginPath(); g.arc(x, y, R * 0.8, 0, Math.PI * 2); g.fill(); });
      g.globalAlpha = 1;
      if (s.b) { g.fillStyle = theme.text; g.beginPath(); g.arc(s.b.x, s.b.y, R, 0, Math.PI * 2); g.fill(); }
    }
    function render() {
      scoreEl.set(`${s.score[0]} : ${s.score[1]}`, s.score[0] / to, `Gra do ${to} punktów`);
      ctx.progress(s.score[0] / to);
    }
    render();
  },
});
