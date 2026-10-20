// Helisa: piłka skacze w miejscu, a gracz obraca wieżę z pierścieni, żeby trafiła w szczelinę.
// Wieża jest rysowana w rzucie perspektywicznym na płótnie, od dołu do góry (algorytm malarza).
{
  // --- Logika bez DOM ---
  const N = 12, TAU = Math.PI * 2, SEG = TAU / N;
  const GAP = 0, SOLID = 1, RED = 2, BASE = 3;
  const mod = (a, m) => ((a % m) + m) % m;

  // Najdłuższy ciąg czerwonych pól w pierścieniu (pierścień jest zamknięty).
  function maxRun(segs) {
    let best = 0;
    for (let k = 0; k < N; k++) {
      let r = 0;
      while (r < N && segs[(k + r) % N] === RED) r++;
      best = Math.max(best, r);
    }
    return best;
  }

  // Pierścienie od góry. Czerwone pola nigdy nie leżą pod szczeliną poprzedniego (nieruchomego) pierścienia,
  // więc piłka spadająca prosto w dół ląduje bezpiecznie. Najwyżej dwa czerwone pola obok siebie.
  function generate({ rings, gap, red, extra, chute, spin }) {
    const out = [];
    for (let j = 0; j < rings; j++) {
      const prev = out[j - 1];
      const segs = new Array(N).fill(SOLID);
      const gw = gap[0] + rnd(gap[1] - gap[0] + 1);
      let start = rnd(N);
      // „zjeżdżalnia”: szczelina zachodzi na poprzednią, można spaść przez kilka pierścieni naraz
      if (prev && Math.random() < chute) {
        const holes = prev.segs.map((t, k) => (t === GAP ? k : -1)).filter((k) => k >= 0);
        start = mod(pick(holes) - rnd(gw), N);
      }
      for (let k = 0; k < gw; k++) segs[(start + k) % N] = GAP;
      if (Math.random() < extra) { const k = rnd(N); if (segs[(k + 1) % N] && segs[(k + N - 1) % N]) segs[k] = GAP; }
      const sp = j >= 4 && Math.random() < spin ? (rnd(2) ? 1 : -1) * (0.35 + Math.random() * 0.45) : 0;
      const forb = segs.map((_, k) => !!prev && !prev.spin && !sp && prev.segs[k] === GAP);
      let reds = j < 2 ? 0 : red[0] + rnd(red[1] - red[0] + 1) - (sp ? 1 : 0);
      for (let tries = 0; reds > 0 && tries < 60; tries++) {
        const k = rnd(N);
        if (segs[k] !== SOLID || forb[k]) continue;
        segs[k] = RED;
        if (maxRun(segs) > 2 || segs.filter((t) => t === SOLID).length < 3) segs[k] = SOLID;
        else reds--;
      }
      out.push({ segs, off: 0, spin: sp });
    }
    out.push({ segs: new Array(N).fill(BASE), off: 0, spin: 0 });
    return out;
  }

  // Pole pierścienia pod piłką (piłka stoi na kącie 0, z przodu wieży).
  const segAt = (ring, rot) => Math.floor(mod(-(rot + ring.off), TAU) / SEG) % N;

  if (typeof module !== "undefined") module.exports = { generate, segAt, maxRun, N, SEG, GAP, SOLID, RED, BASE };

  // --- Kolory: płótno dostaje z motywu napisy #rrggbb, mieszamy je w liczbach ---
  const rgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec((h || "").trim());
    if (!m) return [128, 128, 128];
    const n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const css = (c, k = 1, al = 1) => {
    const f = (v) => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
    return `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${al})`;
  };

  if (typeof registerGame !== "undefined") registerGame({
    id: "helisa",
    cat: "zrecznosciowe",
    name: "Helisa",
    author: "Claude Opus 5.5",
    desc: "Obracaj wieżę z pierścieni, aby skacząca piłka spadała przez szczeliny. Omijaj czerwone pola i dotrzyj na dno.",
    color: "#5f3dc4",
    ink: "#ffffff",
    glyph: ["##.##", "..#..", "#.###", "..#..", "###.#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, rings: 18, gap: [3, 4], red: [0, 1], extra: 0.2, chute: 0.3, spin: 0, lives: 3 },
      { key: "medium", name: "Średni", points: 25, rings: 28, gap: [2, 3], red: [1, 3], extra: 0.15, chute: 0.25, spin: 0.15, lives: 3 },
      { key: "hard", name: "Trudny", points: 50, rings: 40, gap: [2, 2], red: [2, 4], extra: 0.1, chute: 0.2, spin: 0.35, lives: 2 },
    ],
    rules: [
      "Przeciągaj planszę w bok albo trzymaj strzałki (A i D), żeby obracać wieżę. Piłka skacze sama.",
      "Ustaw szczelinę pod piłką, a spadnie piętro niżej. Pierścień, przez który przeleci, rozpada się.",
      "Czerwone pola w paski zabierają życie. Bez żyć partia się kończy.",
      "Po trzech pierścieniach bez odbicia piłka płonie i rozbija następny pierścień, nawet czerwony.",
      "Wygrywasz, gdy piłka dotrze na złote dno. Na trudnym poziomie część pierścieni sama się obraca.",
    ],
    achievements: [
      { id: "ognista", name: "Ognista kula", desc: "Spadnij przez 3 pierścienie bez odbicia.", points: 10 },
      { id: "kometa", name: "Kometa", desc: "Spadnij przez 6 pierścieni bez odbicia.", points: 25 },
      { id: "burzyciel", name: "Burzyciel", desc: "Rozbij ognistą kulą 4 pierścienie w jednej partii.", points: 25 },
      { id: "bez-szwanku", name: "Bez szwanku", desc: "Ukończ średni lub trudny poziom bez utraty życia.", points: 25 },
      { id: "lekko", name: "Lekkim krokiem", desc: "Ukończ trudny poziom, odbijając się mniej niż 30 razy.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const W = 90, H = 120;
      const cv = canvasGame(board, ctx, W, H, { max: 72, cls: "hx-board" });
      const { g, theme } = cv;
      const rings = generate(L);
      const n = L.rings; // rings[n] to złote dno

      // wymiary świata
      const S = 3, T = 0.6, R = 4.3, RP = 1.2, BR = 0.45, BX = 2.75, GRAV = 36, JUMP = 12.4;
      // bez różu i pomarańczu: nie mogą przypominać czerwonych pól
      const PAL = ["teal", "green", "violet", "gray"];

      const first = rings[0].segs.findIndex((t) => t === SOLID);
      const s = {
        rot: -(first + 0.5) * SEG, vel: 0,
        y: 2.2, vy: 0, squash: 0,
        cam: 0, camT: 0,
        lives: L.lives, lost: 0, inv: 0, flash: 0,
        passed: 0, fall: 0, fire: false, smashed: 0, bounces: 0, score: 0,
        parts: [], pops: [], finished: 0, t: 0,
      };
      for (const r of rings) r.splats = [];

      const ringEl = statBlock(ctx, "Pierścienie", { meter: true });
      const statEl = statsBlock(ctx, "Wynik", ["Punkty", "Odbicia"]);
      const lifeEl = pipsBlock(ctx, "Życia", L.lives, { icon: "heart" });

      // sterowanie: przeciąganie (mysz i palec) oraz trzymane klawisze
      const keys = heldKeys(ctx);
      let drag = null;
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); cv.cv.setPointerCapture?.(e.pointerId); drag = cv.at(e)[0]; });
      ctx.on(cv.cv, "pointermove", (e) => {
        if (drag === null || ctx.done) return;
        const x = cv.at(e)[0];
        s.rot += (x - drag) * 0.075;
        drag = x;
      });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { drag = null; });

      cv.loop((dt) => {
        s.t += dt;
        for (const r of rings) r.off += r.spin * dt;
        if (!ctx.done) update(dt);
        draw(dt);
      });

      const top = (j) => -j * S;

      function update(dt) {
        const dir = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
        s.vel += (dir * 4.4 - s.vel) * Math.min(1, dt * 12);
        s.rot += s.vel * dt;
        s.inv = Math.max(0, s.inv - dt);
        s.squash *= Math.pow(0.0005, dt);

        s.vy = Math.max(-26, s.vy - GRAV * dt);
        const ny = s.y + s.vy * dt;
        // pierwszy cały pierścień pod piłką
        let j = Math.max(0, Math.ceil(-(s.y - BR) / S - 1e-6));
        while (j < n && rings[j].broke !== undefined) j++;
        const yt = top(j);
        if (s.vy < 0 && s.y - BR >= yt - 0.001 && ny - BR < yt) land(j);
        else s.y = ny;

        s.camT = Math.min(s.camT, s.y - 1);
        s.cam += (s.camT - s.cam) * Math.min(1, dt * 7);

        if (s.finished) {
          s.finished += dt;
          if (s.finished > 1) finish();
        }
      }

      function land(j) {
        const ring = rings[j], k = segAt(ring, s.rot), type = ring.segs[k];
        if (type === BASE) {
          if (!s.finished) { s.finished = 0.01; Sound.line(); burst(BX, top(j), 30, ["gold", "yellow", "orange"]); ctx.progress(1); }
          return bounce(j, k);
        }
        if (type === GAP) return pass(j);
        if (s.fire) {
          // ognista kula rozbija pierścień i się odbija
          s.fire = false;
          s.smashed++;
          if (s.smashed >= 4) ctx.achieve("burzyciel");
          Sound.line();
          burst(BX, top(j), 26, ["orange", "gold", "red"]);
          pass(j, true);
          return bounce(j, k, true);
        }
        if (type === RED && !s.inv) {
          s.lives--;
          s.lost++;
          s.inv = 1.4;
          s.flash = 0.45;
          Sound.error();
          burst(BX, top(j), 18, ["red"]);
          render();
          if (s.lives <= 0) {
            s.y = top(j) + BR;
            return ctx.lose("Czerwone pole", `Pokonano ${s.passed} z ${plural(n, "pierścień", "pierścienie", "pierścieni")}.`);
          }
        }
        bounce(j, k);
      }

      function bounce(j, k, quiet) {
        s.y = top(j) + BR;
        s.vy = JUMP;
        s.squash = 0.35;
        s.fall = 0;
        s.bounces++;
        const ring = rings[j];
        if (ring.broke === undefined) {
          ring.splats.push({ la: mod(-(s.rot + ring.off), TAU), r: 0.5 + Math.random() * 0.25, red: ring.segs[k] === RED });
          if (ring.splats.length > 5) ring.splats.shift();
        }
        if (!quiet) { Sound.tap(); burst(BX, top(j), 6, ["p1"]); }
        render();
      }

      function pass(j, smashed) {
        rings[j].broke = 0;
        s.passed++;
        s.fall++;
        const pts = smashed ? 5 : Math.min(5, s.fall);
        s.score += pts;
        s.pops.push({ y: top(j) + 1, text: `+${pts}`, life: 0.9 });
        if (!smashed) Sound.place(Math.min(9, s.fall + 1));
        if (s.fall >= 3 && !s.fire && !smashed) { s.fire = true; ctx.achieve("ognista"); ctx.toast("Ognista kula"); }
        if (s.fall >= 6) ctx.achieve("kometa");
        render();
      }

      function finish() {
        if (ctx.done) return;
        if (!s.lost && L.key !== "easy") ctx.achieve("bez-szwanku");
        if (L.key === "hard" && s.bounces < 30) ctx.achieve("lekko");
        ctx.win(`Punkty: ${s.score}. Odbicia: ${s.bounces}. Utracone życia: ${s.lost}.`);
      }

      // cząstki w świecie: x w bok, y w górę, z do widza
      function burst(x, y, cnt, cols) {
        for (let i = 0; i < cnt; i++) {
          const a = Math.random() * TAU, v = 2 + Math.random() * 6;
          s.parts.push({ x: 0, y: y + 0.1, z: x, vx: Math.cos(a) * v, vy: 3 + Math.random() * 6, vz: Math.sin(a) * v * 0.6, life: 0.5 + Math.random() * 0.5, c: pick(cols), sz: 0.12 + Math.random() * 0.14 });
        }
      }

      // --- Rzut perspektywiczny: kamera nad wieżą, patrzy lekko w dół ---
      const EH = 7.5, EZ = 15, F = 118, PITCH = Math.atan2(EH + 2, EZ), CP = Math.cos(PITCH), SP = Math.sin(PITCH);
      function proj(x, y, z) {
        const dy = y - (s.cam + EH), dz = z - EZ;
        // punkty tuż przy kamerze dawałyby olbrzymie współrzędne, które przeglądarka długo maluje
        const depth = Math.max(1, -dy * SP - dz * CP), yv = dy * CP - dz * SP;
        return [W / 2 + (x * F) / depth, H / 2 - (yv * F) / depth, depth];
      }
      const P = (a, r, y, ox = 0, oz = 0) => proj(r * Math.sin(a) + ox, y, r * Math.cos(a) + oz);
      function poly(pts, fill) {
        g.fillStyle = fill;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.closePath();
        g.fill();
      }

      let C = {};
      function colors() {
        const c = rgb(theme.c), surf = rgb(theme.surface), bg = rgb(theme.bg);
        C = {
          sky: mix(surf, c, 0.1), deep: mix(bg, c, 0.25),
          pole: mix(surf, c, 0.2), red: rgb(theme.red), gold: rgb(theme.gold),
          ball: rgb(theme.p1), fire: rgb(theme.orange), text: theme.text,
        };
        for (const k of PAL) C[k] = rgb(theme[k]);
        for (const k of ["p1", "orange", "gold", "red", "yellow"]) C["x" + k] = css(rgb(theme[k]));
      }

      const SUB = 4;
      function drawSeg(ring, j, k, o) {
        const type = ring.segs[k];
        const a0 = k * SEG + s.rot + ring.off + o.da, a1 = a0 + SEG, am = a0 + SEG / 2;
        const ox = Math.sin(am) * o.dr, oz = Math.cos(am) * o.dr, y = top(j) + o.dy;
        const base = type === RED ? C.red : type === BASE ? C.gold : C[PAL[Math.floor(j / 8) % PAL.length]];
        const col = mix(base, C.deep, o.fog);
        const light = (a) => Math.max(0, Math.cos(a - 0.7));
        const gapL = o.dr > 0 || ring.segs[(k + N - 1) % N] === GAP, gapR = o.dr > 0 || ring.segs[(k + 1) % N] === GAP;
        // końce pola przy szczelinie
        if (gapL && Math.sin(a0) > 0) poly([P(a0, RP, y, ox, oz), P(a0, R, y, ox, oz), P(a0, R, y - T, ox, oz), P(a0, RP, y - T, ox, oz)], css(col, 0.62));
        if (gapR && Math.sin(a1) < 0) poly([P(a1, RP, y, ox, oz), P(a1, R, y, ox, oz), P(a1, R, y - T, ox, oz), P(a1, RP, y - T, ox, oz)], css(col, 0.62));
        // ścianka zewnętrzna
        for (let i = 0; i < SUB; i++) {
          const b0 = a0 + (i * SEG) / SUB, b1 = b0 + SEG / SUB, bm = (b0 + b1) / 2;
          if (Math.cos(bm) * EZ <= R) continue;
          poly([P(b0, R, y, ox, oz), P(b1, R, y, ox, oz), P(b1, R, y - T, ox, oz), P(b0, R, y - T, ox, oz)], css(col, 0.58 + 0.3 * light(bm)));
        }
        // wierzch
        const pts = [];
        for (let i = 0; i <= SUB; i++) pts.push(P(a0 + (i * SEG) / SUB, R, y, ox, oz));
        for (let i = SUB; i >= 0; i--) pts.push(P(a0 + (i * SEG) / SUB, RP, y, ox, oz));
        poly(pts, css(col, 0.95 + 0.12 * light(am)));
        // czerwone pola mają paski, żeby nie rozpoznawać ich tylko po kolorze
        if (type === RED) {
          g.strokeStyle = css(col, 0.55);
          g.lineCap = "round";
          for (let i = 0; i < 3; i++) {
            const p = P(a0 + ((i + 0.25) * SEG) / 3, RP + 0.35, y, ox, oz), q = P(a0 + ((i + 0.85) * SEG) / 3, R - 0.25, y, ox, oz);
            g.lineWidth = Math.min(2.5, (0.3 * F) / p[2]);
            g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
          }
        }
        // plamki po odbiciach
        if (!o.dr) for (const sp of ring.splats) {
          if (Math.floor(sp.la / SEG) % N !== k) continue;
          const [x, yy, d] = P(sp.la + s.rot + ring.off, BX, y);
          const rr = (sp.r * F) / d;
          g.fillStyle = css(sp.red ? C.red : C.ball, sp.red ? 0.6 : 0.9, 0.45);
          g.beginPath(); g.ellipse(x, yy, rr, rr * 0.45, 0, 0, TAU); g.fill();
        }
      }

      function drawRing(j, highest) {
        const ring = rings[j];
        const fog = Math.max(0, Math.min(0.85, (s.cam - top(j) - 9) / 22));
        let o = { dr: 0, dy: 0, da: 0, fog };
        if (ring.broke !== undefined) {
          const t = ring.broke;
          if (t > 0.55) return false;
          o = { dr: 5 * t, dy: -6 * t * t + t, da: 0, fog };
          g.globalAlpha = Math.max(0, 1 - t / 0.55);
        }
        // od tyłu do przodu: tylne pola, kolumna, przednie pola
        const order = [...Array(N).keys()].filter((k) => ring.segs[k] !== GAP)
          .map((k) => ({ k, c: Math.cos((k + 0.5) * SEG + s.rot + ring.off) })).sort((a, b) => a.c - b.c);
        for (const { k, c } of order) if (c < 0) drawSeg(ring, j, k, { ...o, da: o.dr ? (k % 2 ? 0.3 : -0.3) * ring.broke : 0 });
        g.globalAlpha = 1;
        pole(top(j), j === highest ? s.cam + EH + 3 : top(j - 1) - T, fog);
        if (ring.broke !== undefined) g.globalAlpha = Math.max(0, 1 - ring.broke / 0.55);
        for (const { k, c } of order) if (c >= 0) drawSeg(ring, j, k, { ...o, da: o.dr ? (k % 2 ? 0.3 : -0.3) * ring.broke : 0 });
        g.globalAlpha = 1;
        return true;
      }

      function pole(yb, yt, fog) {
        const pts = [];
        for (let i = 0; i <= 8; i++) pts.push(P(-Math.PI / 2 + (i * Math.PI) / 8, RP * 0.98, yb));
        for (let i = 8; i >= 0; i--) pts.push(P(-Math.PI / 2 + (i * Math.PI) / 8, RP * 0.98, yt));
        const l = pts[0][0], r = pts[8][0];
        const col = mix(C.pole, C.deep, fog);
        const gr = g.createLinearGradient(l, 0, r, 0);
        gr.addColorStop(0, css(col, 0.72)); gr.addColorStop(0.4, css(col, 1.08)); gr.addColorStop(1, css(col, 0.8));
        poly(pts, gr);
      }

      function shadowOn(j) {
        const ring = rings[j];
        if (!ring || ring.broke !== undefined || ring.segs[segAt(ring, s.rot)] === GAP) return;
        const h = s.y - BR - top(j);
        const [x, y, d] = proj(0, top(j) + 0.01, BX);
        const rr = (BR * (1.1 - Math.min(0.5, h * 0.08)) * F) / d;
        g.fillStyle = `rgba(0,0,0,${Math.max(0.05, 0.28 - h * 0.03)})`;
        g.beginPath(); g.ellipse(x, y, rr, rr * 0.42, 0, 0, TAU); g.fill();
      }

      function ball() {
        if (s.inv > 0 && !ctx.done && Math.floor(s.inv * 10) % 2) return;
        const [x, y, d] = proj(0, s.y, BX);
        const r = (BR * F) / d, sq = s.squash * Math.max(0, 1 - (s.y - BR - Math.floor((s.y - BR) / S) * S) * 1.5);
        const col = s.fire ? C.fire : C.ball;
        if (s.fire) {
          const gl = g.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
          gl.addColorStop(0, css(C.gold, 1, 0.6)); gl.addColorStop(1, css(C.gold, 1, 0));
          g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill();
        }
        const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
        gr.addColorStop(0, css(col, 1.55)); gr.addColorStop(0.55, css(col)); gr.addColorStop(1, css(col, 0.62));
        g.fillStyle = gr;
        g.beginPath(); g.ellipse(x, y + r * sq * 0.5, r * (1 + sq * 0.6), r * (1 - sq * 0.5), 0, 0, TAU); g.fill();
      }

      function draw(dt) {
        colors();
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, css(C.sky)); sky.addColorStop(1, css(C.deep));
        g.fillStyle = sky; g.fillRect(0, 0, W, H);

        // ogon ognistej kuli
        if (s.fire && !ctx.done) for (let i = 0; i < 2; i++) s.parts.push({ x: (Math.random() - 0.5) * 0.5, y: s.y, z: BX + (Math.random() - 0.5) * 0.4, vx: 0, vy: 2 + Math.random() * 2, vz: 0, life: 0.35, c: pick(["orange", "gold"]), sz: 0.25, glow: 1 });

        const jb = Math.max(0, Math.ceil(-(s.y - BR) / S - 1e-6));
        let jShadow = jb;
        while (jShadow < n && rings[jShadow].broke !== undefined) jShadow++;
        const from = Math.min(n, jb + 10), to = Math.max(0, jb - 3);
        for (let j = from; j >= to; j--) {
          const r = rings[j];
          if (r.broke !== undefined) r.broke += dt;
          drawRing(j, to);
          if (j === jShadow) shadowOn(j);
          if (j === jb) ball();
        }
        if (jb > n) ball();

        for (const p of s.parts) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= 18 * dt; p.life -= dt;
          const [x, y, d] = proj(p.x, p.y, p.z);
          g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
          g.fillStyle = C["x" + p.c] || C.xp1;
          g.beginPath(); g.arc(x, y, (p.sz * F) / d, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        s.parts = s.parts.filter((p) => p.life > 0);
        for (const p of s.pops) {
          p.life -= dt; p.y += dt * 2.5;
          const [x, y] = proj(-2.6, p.y, BX);
          g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
          cv.text(p.text, x, y, { size: 5, weight: 800, color: "text" });
        }
        g.globalAlpha = 1;
        s.pops = s.pops.filter((p) => p.life > 0);

        if (s.flash > 0) { s.flash -= dt; g.fillStyle = css(C.red, 1, s.flash * 0.6); g.fillRect(0, 0, W, H); }
      }

      function render() {
        const f = s.passed / n;
        ringEl.set(`${s.passed} z ${n}`, f, s.fire ? "Ognista kula" : s.fall > 1 ? `Seria: ${s.fall}` : "");
        statEl.set("Punkty", s.score);
        statEl.set("Odbicia", s.bounces);
        lifeEl.set(s.lives);
        if (!s.finished) ctx.progress(f);
      }
      render();
    },
  });
}
