// Asteroidy: statek obraca się, przyspiesza i strzela; leci siłą bezwładności, a krawędzie planszy się zawijają.
// Duża asteroida rozpada się na dwie średnie, średnia na dwie małe. Na wyższych poziomach przelatuje strzelający spodek.
const Asteroids = { last: null };

if (typeof module !== "undefined") module.exports = Asteroids;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "asteroidy"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, waves: 2, rocks: 3, speed: 9, ufo: 0 },
    { key: "medium", name: "Średni", points: 25, waves: 3, rocks: 4, speed: 12, ufo: 1.9 },
    { key: "hard", name: "Trudny", points: 50, waves: 5, rocks: 5, speed: 15, ufo: 1.15 },
  ],
  rules: [
    "Strzałki w lewo i w prawo obracają statek, w górę daje ciąg, spacja strzela. Statek leci dalej siłą rozpędu.",
    "Duże asteroidy rozpadają się na mniejsze. Wylot za krawędź przenosi na drugą stronę planszy.",
    "Zderzenie z asteroidą zabiera życie; po odrodzeniu statek przez chwilę jest nietykalny. Na telefonie użyj przycisków pod planszą.",
    "Na średnim i trudnym od drugiej fali przelatuje latający spodek, który strzela w statek. Zestrzelony daje 200 punktów.",
  ],
  achievements: [
    { id: "ostatni-oddech", name: "Ostatni oddech", desc: "Wygraj, mając już tylko jeden statek.", points: 10 },
    { id: "spodek", name: "Łowca spodków", desc: "Zestrzel latający spodek.", points: 10 },
    { id: "bez-zadrapania", name: "Bez zadrapania", desc: "Wygraj średni poziom bez utraty statku.", points: 25 },
    { id: "as-przestworzy", name: "As przestworzy", desc: "Wygraj trudny poziom bez utraty statku.", points: 50 },
  ],
  mount(board, ctx) {
    const { waves, rocks, speed, ufo } = ctx.level;
    const W = 120, H = 120;
    const cv = canvasGame(board, ctx, W, H, { max: 70, cls: "space" });
    const { g, theme } = cv;
    const s = { ship: null, shots: [], rocks: [], bits: [], rings: [], foe: null, foeShots: [], foeT: 8, wave: 0, lives: 3, score: 0, cool: 0, shake: 0, banner: 0 };
    Asteroids.last = s;
    const SIZES = [0, 3.4, 6.5, 11];
    const reset = () => (s.ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, safe: 2.2 });
    const rock = (x, y, size, sp) => {
      const a = Math.random() * Math.PI * 2;
      // nieregularny obrys i kratery, które obracają się razem z bryłą
      const shape = Array.from({ length: 11 }, () => 0.74 + Math.random() * 0.32);
      const craters = Array.from({ length: size + 1 }, () => [Math.random() * Math.PI * 2, Math.random() * 0.55, 0.12 + Math.random() * 0.14]);
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size, r: SIZES[size], rot: Math.random() * 6, spin: (Math.random() - 0.5) * 1.2, shape, craters, tint: Math.random() };
    };
    function nextWave() {
      s.wave++;
      s.rocks = [];
      s.banner = 1.6;
      s.foeT = 6 + Math.random() * 4;
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
    // najkrótsza odległość na zawijanej planszy
    const dist = (a, b) => { const dx = Math.abs(a.x - b.x), dy = Math.abs(a.y - b.y); return Math.hypot(Math.min(dx, W - dx), Math.min(dy, H - dy)); };
    const burst = (x, y, n, colors, sp = 50, life = 1) => {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, v = Math.random() * sp;
        s.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life * (0.6 + Math.random() * 0.6), c: pick(colors), r: 0.3 + Math.random() * 0.6 });
      }
    };

    function hurt() {
      const sh = s.ship;
      s.lives--;
      burst(sh.x, sh.y, 40, ["#ffd43b", "#ff922b", theme.c, "#ffffff"], 70, 1.4);
      s.rings.push({ x: sh.x, y: sh.y, r: 2, t: 1, c: "#ff922b" });
      s.shake = 0.5;
      Sound.lose();
      render();
      if (s.lives <= 0) return ctx.lose("Statek rozbity", `Fala ${s.wave} z ${waves}. Punkty: ${s.score}.`);
      reset();
    }

    cv.loop((dt) => {
      if (!ctx.done) {
        const sh = s.ship;
        const turn = (keys.arrowleft || keys.a || touch.l ? -1 : 0) + (keys.arrowright || keys.d || touch.r ? 1 : 0);
        sh.a += turn * 4.2 * dt;
        const thrust = keys.arrowup || keys.w || touch.t;
        if (thrust) {
          sh.vx += Math.cos(sh.a) * 60 * dt; sh.vy += Math.sin(sh.a) * 60 * dt;
          // smuga z dyszy
          if (Math.random() < 0.7) s.bits.push({ x: sh.x - Math.cos(sh.a) * 3.4, y: sh.y - Math.sin(sh.a) * 3.4, vx: -Math.cos(sh.a + (Math.random() - 0.5) * 0.6) * 30 + sh.vx, vy: -Math.sin(sh.a + (Math.random() - 0.5) * 0.6) * 30 + sh.vy, t: 0.35, c: pick(["#ffd43b", "#ff922b", "#ffe8cc"]), r: 0.5 });
        }
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
        for (const o of [...s.shots, ...s.rocks, ...s.foeShots]) { o.x += o.vx * dt; o.y += o.vy * dt; wrap(o); }
        for (const r of s.rocks) r.rot += r.spin * dt;
        s.shots.forEach((o) => (o.life -= dt));
        s.foeShots.forEach((o) => (o.life -= dt));
        updateFoe(dt);
        // trafienia: pocisk rozbija asteroidę na dwie mniejsze
        const born = [];
        for (const o of s.shots) {
          if (s.foe && dist(o, s.foe) < 4.2) {
            o.life = 0;
            s.score += 200;
            burst(s.foe.x, s.foe.y, 30, ["#69db7c", "#b2f2bb", "#ffffff", "#ffd43b"], 60);
            s.rings.push({ x: s.foe.x, y: s.foe.y, r: 2, t: 1, c: "#69db7c" });
            s.foe = null;
            ctx.achieve("spodek");
            Sound.line();
            continue;
          }
          const r = s.rocks.find((r) => !r.dead && dist(r, o) < r.r);
          if (!r) continue;
          o.life = 0;
          r.dead = true;
          s.score += [0, 100, 50, 20][r.size];
          burst(r.x, r.y, 8 + r.size * 5, ["#c8c2d9", "#9a93b3", "#ffe8cc", theme.c], 30 + r.size * 12);
          s.rings.push({ x: r.x, y: r.y, r: r.r * 0.6, t: 0.6, c: "rgba(255,255,255,0.8)" });
          s.shake = Math.max(s.shake, r.size * 0.08);
          if (r.size > 1) for (let k = 0; k < 2; k++) born.push(rock(r.x, r.y, r.size - 1, speed * (1.1 + Math.random() * 0.7) * (1 + (3 - r.size) * 0.3)));
          Sound.place(9 - r.size * 2);
        }
        s.rocks = s.rocks.filter((r) => !r.dead).concat(born);
        s.shots = s.shots.filter((o) => o.life > 0);
        s.foeShots = s.foeShots.filter((o) => o.life > 0);
        if (!sh.safe && (s.rocks.some((r) => dist(r, sh) < r.r + 2.4) || s.foeShots.some((o) => dist(o, sh) < 2.6) || (s.foe && dist(s.foe, sh) < 5))) {
          s.foeShots = [];
          hurt();
          if (ctx.done) return draw(dt);
        }
        if (!s.rocks.length) {
          s.foe = null;
          s.foeShots = [];
          if (s.wave >= waves) {
            if (s.lives === 1) ctx.achieve("ostatni-oddech");
            if (s.lives === 3 && ctx.level.key === "medium") ctx.achieve("bez-zadrapania");
            if (s.lives === 3 && ctx.level.key === "hard") ctx.achieve("as-przestworzy");
            render();
            return ctx.win(`Punkty: ${s.score}.`);
          }
          Sound.line();
          nextWave();
        }
        render();
      }
      draw(dt);
    });

    // Spodek: przelatuje w poprzek planszy i co chwilę strzela w statek (z rozrzutem).
    function updateFoe(dt) {
      if (!ufo || s.wave < 2) return;
      if (!s.foe) {
        s.foeT -= dt;
        if (s.foeT > 0) return;
        const left = Math.random() < 0.5;
        s.foe = { x: left ? 0 : W, y: 12 + Math.random() * (H - 24), vx: (left ? 1 : -1) * (14 + speed * 0.4), vy: 0, fire: ufo, t: 0 };
        Sound.flag();
        return;
      }
      const f = s.foe;
      f.t += dt;
      f.vy = Math.sin(f.t * 1.7) * 9;
      f.x += f.vx * dt;
      f.y = Math.max(6, Math.min(H - 6, f.y + f.vy * dt));
      // przelot przez całą szerokość i odlot
      if (f.t > W / Math.abs(f.vx)) { s.foe = null; s.foeT = 7 + Math.random() * 5; return; }
      f.fire -= dt;
      if (f.fire <= 0 && !s.ship.safe) {
        f.fire = ufo;
        const aim = Math.atan2(s.ship.y - f.y, s.ship.x - f.x) + (Math.random() - 0.5) * (ctx.level.key === "hard" ? 0.25 : 0.6);
        s.foeShots.push({ x: f.x, y: f.y, vx: Math.cos(aim) * 48, vy: Math.sin(aim) * 48, life: 2 });
        Sound.erase();
      }
    }

    function draw(dt) {
      g.save();
      if (s.shake > 0) { s.shake = Math.max(0, s.shake - dt); g.translate((Math.random() - 0.5) * s.shake * 4, (Math.random() - 0.5) * s.shake * 4); }
      g.lineJoin = "round";
      // asteroida na krawędzi widać też po drugiej stronie planszy
      const copies = (r) => [-W, 0, W].flatMap((dx) => [-H, 0, H].map((dy) => [r.x + dx, r.y + dy])).filter(([x, y]) => x > -r.r && x < W + r.r && y > -r.r && y < H + r.r);
      for (const r of s.rocks) for (const [x, y] of copies(r)) drawRock(r, x, y);
      // pociski: świecące smugi
      g.lineCap = "round";
      for (const o of s.shots) {
        const l = Math.hypot(o.vx, o.vy);
        g.strokeStyle = theme.c; g.lineWidth = 1.6; g.globalAlpha = 0.35;
        g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x - (o.vx / l) * 4, o.y - (o.vy / l) * 4); g.stroke();
        g.globalAlpha = 1; g.strokeStyle = "#ffffff"; g.lineWidth = 0.7;
        g.beginPath(); g.moveTo(o.x, o.y); g.lineTo(o.x - (o.vx / l) * 2.2, o.y - (o.vy / l) * 2.2); g.stroke();
      }
      for (const o of s.foeShots) {
        g.fillStyle = "rgba(105,219,124,0.35)"; g.beginPath(); g.arc(o.x, o.y, 1.8, 0, 7); g.fill();
        g.fillStyle = "#d3f9d8"; g.beginPath(); g.arc(o.x, o.y, 0.8, 0, 7); g.fill();
      }
      if (s.foe) drawFoe(s.foe);
      const sh = s.ship;
      // migający statek w czasie nietykalności
      if (!ctx.done && (!sh.safe || Math.floor(sh.safe * 8) % 2 === 0)) drawShip(sh);
      // fale uderzeniowe i odłamki
      for (const ring of s.rings) {
        ring.t -= dt * 1.6; ring.r += dt * 26;
        g.strokeStyle = ring.c; g.globalAlpha = Math.max(0, ring.t); g.lineWidth = 0.6;
        g.beginPath(); g.arc(ring.x, ring.y, ring.r, 0, 7); g.stroke();
      }
      s.rings = s.rings.filter((r) => r.t > 0);
      s.bits = s.bits.filter((p) => (p.t -= dt * 1.8) > 0);
      for (const p of s.bits) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.min(1, p.t * 1.5);
        g.fillStyle = p.c || theme.text;
        g.beginPath(); g.arc(p.x, p.y, p.r || 0.4, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      g.restore();
      // wynik i baner fali
      g.fillStyle = "rgba(238,241,255,0.75)";
      g.font = "600 5px Geist, system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(s.score.toLocaleString("pl-PL"), W - 4, 8);
      if (s.banner > 0 && !ctx.done) {
        s.banner -= dt;
        g.globalAlpha = Math.min(1, s.banner);
        g.textAlign = "center";
        g.font = "700 9px Geist, system-ui, sans-serif";
        g.fillStyle = "#ffffff";
        g.fillText(`Fala ${s.wave}`, W / 2, H / 2 - 14);
        g.font = "500 4px Geist, system-ui, sans-serif";
        g.fillStyle = "rgba(238,241,255,0.7)";
        g.fillText(s.wave === waves ? "ostatnia" : `z ${waves}`, W / 2, H / 2 - 8);
        g.globalAlpha = 1;
      }
    }

    function drawRock(r, x, y) {
      g.save();
      g.translate(x, y);
      g.rotate(r.rot);
      // cień rzucony w dół i w prawo (w układzie obróconej bryły przesunięty odwrotnie)
      const c = Math.cos(-r.rot), sn = Math.sin(-r.rot);
      g.fillStyle = "rgba(0,0,0,0.3)";
      outline(r, 0.9 * c - 1.2 * sn, 0.9 * sn + 1.2 * c);
      g.fill();
      const lx = -0.4 * c + 0.45 * sn, ly = -0.4 * sn - 0.45 * c;
      const lit = g.createRadialGradient(lx * r.r, ly * r.r, r.r * 0.1, 0, 0, r.r * 1.1);
      const hue = 250 + r.tint * 30;
      lit.addColorStop(0, `hsl(${hue}, 14%, 72%)`);
      lit.addColorStop(0.55, `hsl(${hue}, 13%, 46%)`);
      lit.addColorStop(1, `hsl(${hue}, 18%, 24%)`);
      g.fillStyle = lit;
      outline(r);
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.18)";
      g.lineWidth = 0.4;
      g.stroke();
      for (const [a, d, k] of r.craters) {
        const cx = Math.cos(a) * d * r.r, cy = Math.sin(a) * d * r.r, cr = k * r.r;
        g.fillStyle = "rgba(20,16,40,0.32)";
        g.beginPath(); g.arc(cx, cy, cr, 0, 7); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.16)"; g.lineWidth = 0.3;
        g.beginPath(); g.arc(cx, cy, cr, Math.atan2(-ly, -lx) - 1, Math.atan2(-ly, -lx) + 1); g.stroke();
      }
      g.restore();
    }
    function outline(r, dx = 0, dy = 0) {
      g.beginPath();
      r.shape.forEach((k, i) => {
        const a = (i / r.shape.length) * Math.PI * 2, px = Math.cos(a) * r.r * k + dx, py = Math.sin(a) * r.r * k + dy;
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      });
      g.closePath();
    }

    function drawShip(sh) {
      g.save();
      g.translate(sh.x, sh.y);
      if (sh.safe) {
        g.strokeStyle = `rgba(165,216,255,${0.25 + 0.2 * Math.sin(performance.now() / 90)})`; g.lineWidth = 0.5;
        g.beginPath(); g.arc(0, 0, 6, 0, 7); g.stroke();
      }
      g.rotate(sh.a);
      if (keys.arrowup || keys.w || touch.t) {
        const fl = 4 + Math.random() * 2.5;
        const fg = g.createLinearGradient(-3, 0, -3 - fl, 0);
        fg.addColorStop(0, "#ffffff"); fg.addColorStop(0.35, "#ffd43b"); fg.addColorStop(1, "rgba(255,120,30,0)");
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(-2.6, -1.5); g.quadraticCurveTo(-3 - fl, 0, -2.6, 1.5); g.fill();
      }
      const body = g.createLinearGradient(0, -3.2, 0, 3.2);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(0.5, theme.c);
      body.addColorStop(1, "#2b2160");
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(5, 0); g.lineTo(-3.4, -3.3); g.lineTo(-2.2, 0); g.lineTo(-3.4, 3.3);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 0.35; g.stroke();
      g.fillStyle = "#a5d8ff";
      g.beginPath(); g.ellipse(1.2, 0, 1.3, 0.75, 0, 0, 7); g.fill();
      g.restore();
    }

    function drawFoe(f) {
      g.save();
      g.translate(f.x, f.y);
      const glow = g.createRadialGradient(0, 0, 1, 0, 0, 9);
      glow.addColorStop(0, "rgba(105,219,124,0.35)"); glow.addColorStop(1, "rgba(105,219,124,0)");
      g.fillStyle = glow; g.beginPath(); g.arc(0, 0, 9, 0, 7); g.fill();
      g.fillStyle = "#a5d8ff";
      g.beginPath(); g.ellipse(0, -1.4, 2.2, 1.8, 0, Math.PI, 0); g.fill();
      const hull = g.createLinearGradient(0, -1.5, 0, 2);
      hull.addColorStop(0, "#dee2e6"); hull.addColorStop(1, "#495057");
      g.fillStyle = hull;
      g.beginPath(); g.ellipse(0, 0, 5, 1.7, 0, 0, 7); g.fill();
      for (let k = -2; k <= 2; k++) {
        g.fillStyle = Math.floor(f.t * 8 + k) % 2 ? "#69db7c" : "#ffd43b";
        g.beginPath(); g.arc(k * 1.8, 0.3, 0.35, 0, 7); g.fill();
      }
      g.restore();
    }

    function render() {
      waveEl.set(`${s.wave} / ${waves}`, (s.wave - 1 + (s.rocks.length ? 0 : 1)) / waves, `Asteroidy: ${s.rocks.length}. Punkty: ${s.score}`);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress((s.wave - 1) / waves);
    }
    render();
  },
});
