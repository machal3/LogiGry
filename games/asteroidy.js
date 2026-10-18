// Asteroidy: statek obraca się, przyspiesza i strzela; leci siłą bezwładności, a krawędzie planszy się zawijają.
// Duża asteroida rozpada się na dwie średnie, średnia na dwie małe. Oczyść wymaganą liczbę fal.
const Asteroids = { last: null };

if (typeof module !== "undefined") module.exports = Asteroids;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "asteroidy"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, waves: 2, rocks: 3, speed: 9 },
    { key: "medium", name: "Średni", points: 25, waves: 3, rocks: 4, speed: 12 },
    { key: "hard", name: "Trudny", points: 50, waves: 4, rocks: 5, speed: 15 },
  ],
  rules: [
    "Strzałki w lewo i w prawo obracają statek, w górę daje ciąg, spacja strzela. Statek leci dalej siłą rozpędu.",
    "Duże asteroidy rozpadają się na mniejsze. Wylot za krawędź przenosi na drugą stronę planszy.",
    "Zderzenie z asteroidą zabiera życie; po odrodzeniu statek przez chwilę jest nietykalny. Na telefonie użyj przycisków pod planszą.",
  ],
  achievements: [
    { id: "ostatni-oddech", name: "Ostatni oddech", desc: "Wygraj, mając już tylko jeden statek.", points: 10 },
    { id: "bez-zadrapania", name: "Bez zadrapania", desc: "Wygraj średni poziom bez utraty statku.", points: 25 },
    { id: "as-przestworzy", name: "As przestworzy", desc: "Wygraj trudny poziom bez utraty statku.", points: 50 },
  ],
  mount(board, ctx) {
    const { waves, rocks, speed } = ctx.level;
    const W = 120, H = 120;
    const cv = canvasGame(board, ctx, W, H, { max: 70, cls: "space" });
    const { g, theme } = cv;
    const s = { ship: null, shots: [], rocks: [], bits: [], wave: 0, lives: 3, score: 0, cool: 0 };
    Asteroids.last = s;
    const SIZES = [0, 3.4, 6.5, 11];
    const reset = () => (s.ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, safe: 2.2 });
    const rock = (x, y, size, sp) => {
      const a = Math.random() * Math.PI * 2;
      // nieregularny obrys
      const shape = Array.from({ length: 10 }, () => 0.72 + Math.random() * 0.36);
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, r: SIZES[size], rot: Math.random() * 6, spin: (Math.random() - 0.5) * 1.2, shape };
    };
    function nextWave() {
      s.wave++;
      s.rocks = [];
      for (let k = 0; k < rocks + s.wave - 1; k++) {
        // asteroidy startują przy krawędzi, z dala od statku
        const edge = Math.random() < 0.5;
        s.rocks.push(rock(edge ? Math.random() * W : 0, edge ? 0 : Math.random() * H, 3, speed * (0.7 + Math.random() * 0.6)));
      }
    }
    reset();
    nextWave();
    const waveEl = statBlock(ctx, "Fala", { meter: true });
    const livesEl = el("p", "bk-lives");
    ctx.panel.append(panelBlock("Życia", livesEl));
    const keys = heldKeys(ctx);
    const touch = {};
    touchPad(ctx, touch, [["l", "Obrót w lewo", "i-ccw"], ["t", "Ciąg", "i-up"], ["r", "Obrót w prawo", "i-cw"], ["f", "Strzał", ""]]);
    const wrap = (o) => { o.x = (o.x + W) % W; o.y = (o.y + H) % H; };

    cv.loop((dt) => {
      if (!ctx.done) {
        const sh = s.ship;
        const turn = (keys.arrowleft || keys.a || touch.l ? -1 : 0) + (keys.arrowright || keys.d || touch.r ? 1 : 0);
        sh.a += turn * 4.2 * dt;
        const thrust = keys.arrowup || keys.w || touch.t;
        if (thrust) { sh.vx += Math.cos(sh.a) * 60 * dt; sh.vy += Math.sin(sh.a) * 60 * dt; }
        sh.vx *= Math.pow(0.6, dt);
        sh.vy *= Math.pow(0.6, dt);
        const sp = Math.hypot(sh.vx, sh.vy);
        if (sp > 55) { sh.vx *= 55 / sp; sh.vy *= 55 / sp; }
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        wrap(sh);
        sh.safe = Math.max(0, sh.safe - dt);
        s.cool -= dt;
        if ((keys[" "] || touch.f) && s.cool <= 0) {
          s.cool = 0.22;
          s.shots.push({ x: sh.x + Math.cos(sh.a) * 4, y: sh.y + Math.sin(sh.a) * 4, vx: Math.cos(sh.a) * 90 + sh.vx, vy: Math.sin(sh.a) * 90 + sh.vy, life: 0.9 });
          Sound.tap();
        }
        for (const o of [...s.shots, ...s.rocks]) { o.x += o.vx * dt; o.y += o.vy * dt; wrap(o); }
        for (const r of s.rocks) r.rot += r.spin * dt;
        s.shots.forEach((o) => (o.life -= dt));
        // trafienia: pocisk rozbija asteroidę na dwie mniejsze
        const born = [];
        for (const o of s.shots) {
          const r = s.rocks.find((r) => !r.dead && Math.hypot(r.x - o.x, r.y - o.y) < r.r);
          if (!r) continue;
          o.life = 0;
          r.dead = true;
          s.score += [0, 100, 50, 20][r.size];
          for (let k = 0; k < 8 + r.size * 4; k++) s.bits.push({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, t: 1 });
          if (r.size > 1) for (let k = 0; k < 2; k++) born.push(rock(r.x, r.y, r.size - 1, speed * (1.1 + Math.random() * 0.7) * (1 + (3 - r.size) * 0.3)));
          Sound.place(9 - r.size * 2);
        }
        s.rocks = s.rocks.filter((r) => !r.dead).concat(born);
        s.shots = s.shots.filter((o) => o.life > 0);
        if (!sh.safe && s.rocks.some((r) => Math.hypot(r.x - sh.x, r.y - sh.y) < r.r + 2.4)) {
          s.lives--;
          for (let k = 0; k < 24; k++) s.bits.push({ x: sh.x, y: sh.y, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 70, t: 1.4 });
          Sound.lose();
          render();
          if (s.lives <= 0) return ctx.lose("Statek rozbity", `Fala ${s.wave} z ${waves}.`);
          reset();
        }
        if (!s.rocks.length) {
          if (s.wave >= waves) {
            if (s.lives === 1) ctx.achieve("ostatni-oddech");
            if (s.lives === 3 && ctx.level.key === "medium") ctx.achieve("bez-zadrapania");
            if (s.lives === 3 && ctx.level.key === "hard") ctx.achieve("as-przestworzy");
            render(); return ctx.win(`Punkty: ${s.score}.`); }
          Sound.line();
          ctx.toast(`Fala ${s.wave + 1}`);
          nextWave();
        }
        render();
      }
      draw(dt);
    });

    function draw(dt) {
      g.lineJoin = "round";
      // asteroida na krawędzi widać też po drugiej stronie planszy
      const copies = (r) => [-W, 0, W].flatMap((dx) => [-H, 0, H].map((dy) => [r.x + dx, r.y + dy])).filter(([x, y]) => x > -r.r && x < W + r.r && y > -r.r && y < H + r.r);
      for (const r of s.rocks) for (const [x, y] of copies(r)) {
        g.save();
        g.translate(x, y);
        g.rotate(r.rot);
        g.fillStyle = theme.line;
        g.strokeStyle = theme.text;
        g.lineWidth = 0.7;
        g.beginPath();
        r.shape.forEach((k, i) => { const a = (i / r.shape.length) * Math.PI * 2; i ? g.lineTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k) : g.moveTo(Math.cos(a) * r.r * k, Math.sin(a) * r.r * k); });
        g.closePath();
        g.fill();
        g.stroke();
        g.restore();
      }
      g.fillStyle = theme.c;
      for (const o of s.shots) { g.beginPath(); g.arc(o.x, o.y, 0.8, 0, Math.PI * 2); g.fill(); }
      const sh = s.ship;
      // migający statek w czasie nietykalności
      if (!ctx.done && (!sh.safe || Math.floor(sh.safe * 8) % 2 === 0)) {
        g.save();
        g.translate(sh.x, sh.y);
        g.rotate(sh.a);
        if (keys.arrowup || keys.w || touch.t) {
          g.fillStyle = "#f76707";
          g.beginPath();
          g.moveTo(-3, -1.3); g.lineTo(-5.5 - Math.random() * 2, 0); g.lineTo(-3, 1.3);
          g.fill();
        }
        g.fillStyle = theme.c;
        g.beginPath();
        g.moveTo(4.5, 0); g.lineTo(-3.5, -3); g.lineTo(-2.2, 0); g.lineTo(-3.5, 3);
        g.closePath();
        g.fill();
        g.restore();
      }
      s.bits = s.bits.filter((p) => (p.t -= dt * 1.8) > 0);
      g.fillStyle = theme.text;
      for (const p of s.bits) { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = Math.min(1, p.t); g.fillRect(p.x - 0.4, p.y - 0.4, 0.8, 0.8); }
      g.globalAlpha = 1;
      g.fillStyle = theme.muted;
      g.font = "600 5px Geist, system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(s.score, W - 4, 7);
    }
    function render() {
      waveEl.set(`${s.wave} / ${waves}`, (s.wave - 1 + (s.rocks.length ? 0 : 1)) / waves, `Asteroidy: ${s.rocks.length}. Punkty: ${s.score}`);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress((s.wave - 1) / waves);
    }
    render();
  },
});
