// Wspinacz: postać sama odbija się od chmurek; sterujesz nią w lewo i w prawo. Wyjście za krawędź przenosi na drugą stronę.
const Climber = { last: null };

if (typeof module !== "undefined") module.exports = Climber;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wspinacz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 1500, moving: 0.1, weak: 0, gapMax: 26 },
    { key: "medium", name: "Średni", points: 25, target: 2500, moving: 0.25, weak: 0.12, gapMax: 30 },
    { key: "hard", name: "Trudny", points: 50, target: 3500, moving: 0.35, weak: 0.22, gapMax: 33 },
  ],
  rules: [
    "Postać odbija się sama. Strzałki albo A i D przesuwają ją na boki; na telefonie przytrzymaj lewą albo prawą połowę planszy.",
    "Chmurki przesuwające się na boki są ruchome, szare kruszą się po pierwszym skoku, a sprężyna wystrzeliwuje wysoko.",
    "Wespnij się na wymaganą wysokość. Upadek poniżej ekranu kończy grę.",
  ],
  mount(board, ctx) {
    const { target, moving, weak, gapMax } = ctx.level;
    const W = 100, H = 150;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    const s = { x: 50, y: 140, vx: 0, vy: -100, cam: 0, best: 0, plats: [] };
    Climber.last = s;
    const hEl = statBlock(ctx, "Wysokość", { meter: true });
    // świat: y rośnie w dół jak na ekranie, wysokość = −y
    let topY = 140;
    const addPlat = (y) => {
      const roll = Math.random();
      const kind = roll < weak ? "weak" : roll < weak + moving ? "move" : "norm";
      s.plats.push({ x: 8 + Math.random() * (W - 24), y, w: 16, kind, dir: Math.random() < 0.5 ? -1 : 1, spring: kind === "norm" && Math.random() < 0.08, gone: false });
    };
    s.plats.push({ x: 42, y: 140, w: 16, kind: "norm", dir: 1, spring: false, gone: false });
    while (topY > -40) { topY -= 14 + Math.random() * 10; addPlat(topY); }
    const keys = heldKeys(ctx);
    let touchDir = 0;
    ctx.on(cv.cv, "pointerdown", (e) => { const [x] = cv.at(e); touchDir = x < W / 2 ? -1 : 1; });
    ctx.on(document, "pointerup", () => (touchDir = 0));
    ctx.toast("Strzałki albo dotknięcie boków sterują postacią");

    cv.loop((dt) => {
      const dir = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0) || touchDir;
      if (!ctx.done) {
        s.vx += (dir * 220 - s.vx * 6) * dt;
        s.x = (s.x + s.vx * dt + W) % W;
        s.vy += 170 * dt;
        const prevY = s.y;
        s.y += s.vy * dt;
        for (const p of s.plats) {
          if (p.kind === "move") { p.x += p.dir * 18 * dt; if (p.x < 2 || p.x + p.w > W - 2) p.dir *= -1; }
          // lądowanie tylko przy opadaniu, gdy stopy przecięły górę chmurki
          if (!p.gone && s.vy > 0 && prevY <= p.y && s.y >= p.y && s.x > p.x - 3 && s.x < p.x + p.w + 3) {
            s.vy = p.spring ? -165 : -100;
            if (p.kind === "weak") { p.gone = true; Sound.erase(); } else Sound.place(p.spring ? 9 : 3);
          }
        }
        // kamera idzie w górę, nigdy w dół
        s.cam = Math.min(s.cam, s.y - 60);
        while (topY > s.cam - 20) {
          const height = -s.cam;
          topY -= 14 + Math.random() * Math.min(gapMax - 14, 6 + height / 120);
          addPlat(topY);
        }
        s.plats = s.plats.filter((p) => p.y < s.cam + H + 10);
        s.best = Math.max(s.best, Math.floor((140 - s.y) * 2));
        render();
        if (s.best >= target) ctx.win();
        if (s.y > s.cam + H + 10) { Sound.lose(); ctx.lose("Upadek", `Wysokość: ${s.best}.`); }
      }
      draw();
    });

    function draw() {
      g.save();
      g.translate(0, -s.cam);
      for (const p of s.plats) {
        if (p.gone) continue;
        g.fillStyle = p.kind === "weak" ? theme.muted : p.kind === "move" ? theme.c : theme.line;
        g.globalAlpha = p.kind === "weak" ? 0.55 : 1;
        g.beginPath();
        g.ellipse(p.x + p.w * 0.3, p.y + 1.5, p.w * 0.32, 2.6, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(p.x + p.w * 0.62, p.y + 1, p.w * 0.36, 3.2, 0, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        if (p.spring) {
          g.strokeStyle = "#e03131";
          g.lineWidth = 1.1;
          g.beginPath();
          g.moveTo(p.x + 6, p.y - 0.5); g.lineTo(p.x + 8, p.y - 2); g.lineTo(p.x + 6, p.y - 3.5); g.lineTo(p.x + 8, p.y - 5);
          g.stroke();
        }
      }
      // postać: kulka z oczami, rozciąga się w locie
      const stretch = Math.max(-0.25, Math.min(0.25, -s.vy / 400));
      g.fillStyle = theme.c;
      g.beginPath();
      g.ellipse(s.x, s.y - 4.5, 4.2 * (1 - stretch * 0.5), 4.5 * (1 + stretch), 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#fff";
      const look = Math.sign(s.vx) * 0.8;
      g.beginPath();
      g.arc(s.x - 1.4 + look, s.y - 5.5, 1.2, 0, Math.PI * 2);
      g.arc(s.x + 1.4 + look, s.y - 5.5, 1.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(s.x - 1.2 + look * 1.3, s.y - 5.4, 0.55, 0, Math.PI * 2);
      g.arc(s.x + 1.6 + look * 1.3, s.y - 5.4, 0.55, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.fillStyle = theme.text;
      g.font = "700 9px Geist, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText(s.best, 5, 12);
    }
    function render() {
      hEl.set(s.best, s.best / target, `Cel: ${target}`);
      ctx.progress(s.best / target);
    }
    render();
  },
});
