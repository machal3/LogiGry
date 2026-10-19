// Lądownik: grawitacja, ciąg i obrót. Kolejne lądowiska odwiedza się po kolei, paliwo jest wspólne na cały etap.
{
  // --- Logika bez DOM: świat 160 × 100 ---
  const W = 160, H = 100, STEP = 2, FOOT = 3, SAFE_VY = 9, SAFE_VX = 5, SAFE_A = 0.3, THRUST = 24, TURN = 2.6;

  // Teren: losowe góry (przesunięcie środka) i płaskie lądowiska w kolejności odwiedzania.
  function terrain(count, padW) {
    const n = W / STEP + 1;
    const ys = new Array(n).fill(0);
    ys[0] = 60 + rnd(30);
    ys[n - 1] = 60 + rnd(30);
    const split = (a, b, amp) => {
      if (b - a < 2) return;
      const m = (a + b) >> 1;
      ys[m] = (ys[a] + ys[b]) / 2 + (Math.random() - 0.5) * amp;
      split(a, m, amp * 0.55);
      split(m, b, amp * 0.55);
    };
    split(0, n - 1, 70);
    for (let i = 0; i < n; i++) ys[i] = Math.max(38, Math.min(94, ys[i]));
    // lądowiska w osobnych pasach, kolejność przeplatana (lewo, prawo, środek...)
    const lanes = shuffle(Array.from({ length: count }, (_, k) => k));
    const laneW = (W - 20) / count;
    const pads = lanes.map((lane) => {
      const cx = 10 + laneW * lane + laneW / 2 + (Math.random() - 0.5) * (laneW - padW - 4);
      const x0 = Math.round((cx - padW / 2) / STEP) * STEP, x1 = x0 + Math.ceil(padW / STEP) * STEP;
      const i0 = x0 / STEP, i1 = x1 / STEP;
      // wysokość lądowiska bliska terenowi; brzegi łagodnie schodzą do niego, bez pionowych ścian
      const y = Math.round(Math.max(48, Math.min(90, (ys[i0] + ys[i1] + ys[(i0 + i1) >> 1]) / 3 + (Math.random() - 0.5) * 10)));
      for (let i = i0; i <= i1; i++) ys[i] = y;
      for (let k = 1; k <= 4; k++) {
        const f = k / 5;
        if (i0 - k >= 0) ys[i0 - k] = y + (ys[i0 - k] - y) * f;
        if (i1 + k < n) ys[i1 + k] = y + (ys[i1 + k] - y) * f;
      }
      return { x0, x1, y };
    });
    return { ys, pads };
  }
  const groundAt = (t, x) => {
    const i = Math.max(0, Math.min(t.ys.length - 2, Math.floor(x / STEP)));
    const f = Math.max(0, Math.min(1, x / STEP - i));
    return t.ys[i] * (1 - f) + t.ys[i + 1] * f;
  };
  // Stopy i rogi kadłuba w świecie (kąt 0 = pionowo).
  function points(s) {
    const c = Math.cos(s.a), sn = Math.sin(s.a);
    const rot = ([x, y]) => [s.x + x * c - y * sn, s.y + x * sn + y * c];
    return { feet: [rot([-FOOT, 3]), rot([FOOT, 3])], hull: [rot([-2, -2.5]), rot([2, -2.5]), rot([-2.2, 1.2]), rot([2.2, 1.2])] };
  }

  // Krok lotu. input: { thrust, left, right }. Zwraca "landed" (z lądowiskiem), "crash" albo null.
  function fly(s, t, input, env, dt) {
    if (input.left) s.a -= TURN * dt;
    if (input.right) s.a += TURN * dt;
    s.a = Math.max(-1.6, Math.min(1.6, s.a));
    let ax = env.wind || 0, ay = env.g;
    s.burn = input.thrust && s.fuel > 0;
    if (s.burn) {
      ax += Math.sin(s.a) * THRUST;
      ay -= Math.cos(s.a) * THRUST;
      s.fuel = Math.max(0, s.fuel - dt);
    }
    s.vx += ax * dt; s.vy += ay * dt;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.x < 3 || s.x > W - 3) { s.x = Math.max(3, Math.min(W - 3, s.x)); s.vx *= -0.3; }
    if (s.y < -20) { s.y = -20; s.vy = Math.max(0, s.vy); }
    const { feet, hull } = points(s);
    if (hull.some(([x, y]) => y >= groundAt(t, x))) return { result: "crash" };
    const touch = feet.filter(([x, y]) => y >= groundAt(t, x));
    if (!touch.length) return null;
    // start z lądowiska: stopy jeszcze dotykają, ale lądownik się wznosi
    if (s.vy < 0) { s.y -= Math.max(...touch.map(([x, y]) => y - groundAt(t, x))); return null; }
    const pad = t.pads.findIndex((p) => feet.every(([x]) => x >= p.x0 && x <= p.x1));
    const soft = s.vy <= SAFE_VY && Math.abs(s.vx) <= SAFE_VX && Math.abs(s.a) <= SAFE_A;
    if (pad < 0 || !soft) return { result: "crash" };
    const vy = s.vy, vx = s.vx;
    s.y = t.pads[pad].y - 3;
    s.vx = s.vy = 0;
    s.a = 0;
    return { result: "landed", pad, vy, vx };
  }

  // Autopilot (do testów uczciwości): leci nad lądowisko i siada łagodnie.
  function autopilot(s, t, pad, env) {
    const p = t.pads[pad], cx = (p.x0 + p.x1) / 2, dx = cx - s.x, half = (p.x1 - p.x0) / 2 - FOOT;
    let peak = Infinity;
    for (let x = Math.min(s.x, cx) - 8; x <= Math.max(s.x, cx) + 8; x += 1) peak = Math.min(peak, groundAt(t, x));
    const cruise = peak - 12;
    // zejście nad lądowiskiem z histerezą, żeby nie wracać na wysokość przelotu
    if (Math.abs(dx) < half * 0.6 && Math.abs(s.vx) < 2) s.desc = pad;
    if (s.desc === pad && Math.abs(dx) > half) s.desc = -1;
    let wantVx, wantVy;
    if (s.desc === pad) { wantVx = dx * 0.9; wantVy = Math.min(6, Math.max(1.5, (p.y - 3 - s.y) * 0.35)); }
    else if (s.y > cruise + 2) { wantVx = Math.max(-2, Math.min(2, dx)); wantVy = -7; }
    else { wantVx = Math.max(-12, Math.min(12, dx * 0.5)); wantVy = Math.max(-6, Math.min(6, (cruise - s.y) * 0.8)); }
    const lim = s.desc === pad ? 0.26 : 0.5;
    const wantA = Math.max(-lim, Math.min(lim, (wantVx - s.vx) * 0.12 - (env.wind || 0) / THRUST));
    return { left: s.a > wantA + 0.03, right: s.a < wantA - 0.03, thrust: s.vy > wantVy };
  }

  if (typeof module !== "undefined") module.exports = { terrain, fly, groundAt, autopilot, points, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "ladownik",
    cat: "zrecznosciowe",
    name: "Lądownik",
    author: "Claude Opus 5.5",
    desc: "Steruj silnikami lądownika i osiadaj łagodnie na lądowiskach, zanim skończy się paliwo.",
    color: "#4263eb",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", ".###.", "#...#", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, g: 7, wind: 0, pads: 2, padW: 18, fuel: 40, lives: 3 },
      { key: "medium", name: "Średni", points: 25, g: 9, wind: 0, pads: 3, padW: 13, fuel: 50, lives: 3 },
      { key: "hard", name: "Trudny", points: 50, g: 11, wind: 3, pads: 4, padW: 11, fuel: 56, lives: 2 },
    ],
    rules: [
      "Strzałka w górę (albo W) włącza silnik, strzałki w lewo i w prawo obracają lądownik.",
      "Myszą albo palcem: przytrzymaj na planszy, a silnik zacznie pracować i lądownik pochyli się w stronę wskaźnika.",
      "Siadaj na wskazanym lądowisku prosto i powoli. Wskaźniki prędkości robią się zielone, gdy lądowanie będzie bezpieczne.",
      "Po wylądowaniu startujesz do kolejnego lądowiska. Paliwo jest wspólne na cały lot.",
      "Rozbicie kosztuje życie i wraca lądownik na ostatnie lądowisko. Na trudnym poziomie wieje wiatr.",
    ],
    achievements: [
      { id: "piorko", name: "Piórko", desc: "Wyląduj z prędkością opadania mniejszą niż 3.", points: 10 },
      { id: "w-punkt", name: "W punkt", desc: "Wyląduj nie dalej niż metr od środka lądowiska.", points: 25 },
      { id: "oszczednie", name: "Oszczędny pilot", desc: "Wygraj, zostawiając co najmniej 40% paliwa.", points: 25 },
      { id: "bez-strat", name: "Bez strat", desc: "Wygraj średni lub trudny poziom bez rozbicia.", points: 25 },
      { id: "as", name: "As pilotażu", desc: "Wygraj trudny poziom bez rozbicia, mając co najmniej 30% paliwa.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, W, H, { max: 90, cls: "space" });
      const { g } = cv;
      const t = terrain(L.pads, L.padW);
      const env = { g: L.g, wind: 0 };
      const ship = { x: 40, y: 10, vx: 7, vy: 0, a: 0.4, fuel: L.fuel, burn: false };
      const s = { target: 0, lives: L.lives, crashes: 0, landed: -1, from: null, boom: null, parts: [], wind: 0, windT: 0, msgT: 0, done: false };
      const stars = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H * 0.7, Math.random()]);
      const craters = Array.from({ length: 26 }, () => [Math.random() * W, Math.random(), 1 + Math.random() * 3.5]);

      const fuelEl = statBlock(ctx, "Paliwo", { meter: true });
      const padEl = statBlock(ctx, "Lądowania", { small: true });
      const liveEl = statBlock(ctx, "Życia", { small: true });
      const keys = heldKeys(ctx);
      touchPad(ctx, keys, [["arrowleft", "Obróć w lewo", "i-ccw"], ["arrowup", "Silnik", "i-up"], ["arrowright", "Obróć w prawo", "i-cw"]]);

      // palec albo mysz na planszy: silnik pracuje, a lądownik przechyla się w stronę wskaźnika
      const cam = { z: 1, x0: 0, y0: 0 };
      let alive = true;
      ctx.onStop(() => { alive = false; });
      let ptr = null;
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); cv.cv.setPointerCapture?.(e.pointerId); ptr = cv.at(e); });
      ctx.on(cv.cv, "pointermove", (e) => { if (ptr) ptr = cv.at(e); });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { ptr = null; });
      const input = () => {
        if (ptr) {
          const wx = cam.x0 + ptr[0] / cam.z;
          const ta = Math.max(-0.6, Math.min(0.6, (wx - ship.x) * 0.05));
          return { thrust: true, left: ship.a > ta + 0.04, right: ship.a < ta - 0.04 };
        }
        return { thrust: keys.arrowup || keys.w || keys[" "], left: keys.arrowleft || keys.a, right: keys.arrowright || keys.d };
      };

      function crash() {
        s.crashes++;
        s.lives--;
        Sound.lose();
        s.boom = { x: ship.x, y: ship.y, t: 0 };
        for (let k = 0; k < 60; k++) {
          const a = Math.random() * Math.PI * 2, v = 5 + Math.random() * 30;
          s.parts.push({ x: ship.x, y: ship.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10, life: 0.6 + Math.random() * 0.9, c: pick(["#ffd43b", "#ff922b", "#fa5252", "#adb5bd"]), r: 0.3 + Math.random() * 0.8, grav: 1 });
        }
        render();
        if (s.lives <= 0 || ship.fuel <= 0) { setTimeout(() => !ctx.done && alive && ctx.lose(ship.fuel <= 0 ? "Brak paliwa" : "Lądownik rozbity", `Wylądowano ${s.target} z ${L.pads} razy.`), 900); return; }
        ctx.toast(`Rozbicie. ${s.lives === 1 ? "Zostało ostatnie życie" : `Zostały ${s.lives} życia`}`);
      }
      function respawn() {
        s.boom = null;
        if (s.from != null) {
          const p = t.pads[s.from];
          Object.assign(ship, { x: (p.x0 + p.x1) / 2, y: p.y - 3, vx: 0, vy: 0, a: 0 });
          s.landed = s.from;
        } else Object.assign(ship, { x: 40, y: 10, vx: 7, vy: 0, a: 0.4 });
      }

      cv.loop((dt) => {
        if (!ctx.done && !s.boom) {
          // wiatr zmienia się powoli
          if (L.wind) {
            s.windT -= dt;
            if (s.windT <= 0) { s.windTarget = (Math.random() * 2 - 1) * L.wind; s.windT = 3 + Math.random() * 3; }
            env.wind += ((s.windTarget || 0) - env.wind) * dt * 0.6;
          }
          const inp = input();
          if (s.landed >= 0) {
            // stoi na lądowisku, dopóki nie dostanie ciągu
            ship.burn = false;
            if (inp.thrust && ship.fuel > 0) { s.landed = -1; ship.vy = -3; }
          }
          if (s.landed < 0) {
            const r = fly(ship, t, inp, env, dt);
            if (r?.result === "crash") crash();
            else if (r?.result === "landed") land(r);
          }
          if (ship.burn) {
            for (let k = 0; k < 3; k++) {
              const sp = (Math.random() - 0.5) * 0.5;
              const a = ship.a + Math.PI / 2 + sp;
              s.parts.push({ x: ship.x - Math.sin(ship.a) * 2.8, y: ship.y + Math.cos(ship.a) * 2.8, vx: Math.cos(a) * 30 + ship.vx, vy: Math.sin(a) * 30 + ship.vy, life: 0.25 + Math.random() * 0.25, c: pick(["#fff3bf", "#ffd43b", "#ff922b"]), r: 0.4 + Math.random() * 0.5, grav: 0 });
            }
            // kurz z ziemi pod silnikiem
            const gy = groundAt(t, ship.x);
            if (gy - ship.y < 18 && Math.random() < 0.6) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              s.parts.push({ x: ship.x, y: gy - 0.3, vx: dir * (8 + Math.random() * 14), vy: -2 - Math.random() * 3, life: 0.6, c: "#9aa0ac", r: 0.5 + Math.random() * 0.6, grav: 0.2 });
            }
          }
          render();
        } else if (s.boom) {
          s.boom.t += dt;
          if (s.boom.t > 1.4 && s.lives > 0 && !ctx.done) respawn();
        }
        draw(dt);
      });

      function land(r) {
        s.landed = r.pad;
        const p = t.pads[r.pad];
        if (r.pad !== s.target) { if (s.wrong === r.pad) return; s.wrong = r.pad; ctx.toast(`To lądowisko ${r.pad + 1}. Cel: ${s.target + 1}`); Sound.tap(); return; }
        Sound.line();
        if (r.vy < 3) ctx.achieve("piorko");
        if (Math.abs(ship.x - (p.x0 + p.x1) / 2) <= 1) ctx.achieve("w-punkt");
        s.from = r.pad;
        s.wrong = r.pad;
        s.target++;
        render();
        if (s.target >= L.pads) {
          const left = ship.fuel / L.fuel;
          if (left >= 0.4) ctx.achieve("oszczednie");
          if (L.key !== "easy" && !s.crashes) ctx.achieve("bez-strat");
          if (L.key === "hard" && !s.crashes && left >= 0.3) ctx.achieve("as");
          return ctx.win(`Paliwa zostało ${Math.round(left * 100)}%.`);
        }
        ctx.toast(r.vy < 3 ? "Miękkie lądowanie" : "Lądowanie udane");
        if (ship.fuel <= 0) ctx.lose("Brak paliwa", "Nie da się wystartować do kolejnego lądowiska.");
      }

      // --- Rysowanie ---
      function draw(dt) {
        const now = performance.now() / 1000;
        for (const [x, y, b] of stars) { g.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * b * (0.7 + 0.3 * Math.sin(now * 2 + x))})`; g.fillRect(x, y, 0.35, 0.35); }
        // kamera: przy ziemi przybliża się do lądownika, jak w starych automatach
        const alt = groundAt(t, ship.x) - ship.y;
        const zt = !s.boom && alt < 24 && !ctx.done ? 2 : 1;
        cam.z += (zt - cam.z) * Math.min(1, dt * 2.5);
        cam.x0 = Math.max(0, Math.min(W - W / cam.z, ship.x - W / cam.z / 2));
        cam.y0 = Math.max(0, Math.min(H - H / cam.z, ship.y - H / cam.z / 2));
        g.save();
        g.scale(cam.z, cam.z);
        g.translate(-cam.x0, -cam.y0);
        // Ziemia na niebie
        const ex = 132, ey = 16;
        const eg = g.createRadialGradient(ex - 2, ey - 2, 0.5, ex, ey, 7);
        eg.addColorStop(0, "#9bd4ff"); eg.addColorStop(0.6, "#3b7dd8"); eg.addColorStop(1, "#173a75");
        g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 7, 0, 7); g.fill();
        g.fillStyle = "rgba(90,170,90,0.7)";
        g.beginPath(); g.ellipse(ex - 2, ey - 1, 2.5, 1.6, 0.4, 0, 7); g.ellipse(ex + 2.5, ey + 2, 1.8, 1.2, -0.3, 0, 7); g.fill();
        g.fillStyle = "rgba(0,0,20,0.45)"; g.beginPath(); g.arc(ex + 3, ey + 1, 7, -1.2, 1.9); g.fill();
        // teren
        g.beginPath();
        g.moveTo(0, H);
        t.ys.forEach((y, i) => g.lineTo(i * STEP, y));
        g.lineTo(W, H);
        g.closePath();
        const tg = g.createLinearGradient(0, 40, 0, H);
        tg.addColorStop(0, "#6b7183"); tg.addColorStop(1, "#2c303b");
        g.fillStyle = tg;
        g.fill();
        g.save();
        g.clip();
        for (const [cx, k, r] of craters) {
          const cy = groundAt(t, cx) + 3 + k * 20;
          g.fillStyle = "rgba(20,22,30,0.35)"; g.beginPath(); g.ellipse(cx, cy, r, r * 0.45, 0, 0, 7); g.fill();
          g.strokeStyle = "rgba(200,205,220,0.25)"; g.lineWidth = 0.3; g.beginPath(); g.ellipse(cx, cy + 0.2, r, r * 0.45, 0, 0.1, Math.PI - 0.1); g.stroke();
        }
        g.restore();
        g.strokeStyle = "#c4c9d6"; g.lineWidth = 0.5;
        g.beginPath(); t.ys.forEach((y, i) => (i ? g.lineTo(i * STEP, y) : g.moveTo(0, y))); g.stroke();
        // lądowiska
        t.pads.forEach((p, i) => {
          const target = i === s.target && !ctx.done;
          const done = i < s.target;
          g.fillStyle = done ? "#51cf66" : target ? "#ffd43b" : "#868e96";
          g.fillRect(p.x0, p.y - 0.6, p.x1 - p.x0, 1.2);
          const blink = target && Math.sin(now * 6) > 0;
          for (const x of [p.x0 + 0.6, p.x1 - 0.6]) { g.fillStyle = blink ? "#ff6b6b" : "rgba(255,107,107,0.35)"; g.beginPath(); g.arc(x, p.y - 1.2, 0.5, 0, 7); g.fill(); }
          g.fillStyle = target ? "#ffd43b" : done ? "#51cf66" : "rgba(255,255,255,0.55)";
          g.font = "700 3.4px Geist, system-ui, sans-serif";
          g.textAlign = "center";
          g.fillText(done ? "✓" : i + 1, (p.x0 + p.x1) / 2, p.y + 4.4);
          if (target) {
            // strzałka nad celem
            const yy = p.y - 9 - Math.sin(now * 4) * 1.2;
            g.beginPath(); g.moveTo((p.x0 + p.x1) / 2, yy + 3); g.lineTo((p.x0 + p.x1) / 2 - 1.6, yy); g.lineTo((p.x0 + p.x1) / 2 + 1.6, yy); g.fill();
          }
        });
        // cząstki
        for (const q of s.parts) {
          q.vy += 14 * q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
          g.globalAlpha = Math.max(0, Math.min(1, q.life * 2));
          g.fillStyle = q.c;
          g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill();
        }
        g.globalAlpha = 1;
        s.parts = s.parts.filter((q) => q.life > 0);
        if (!s.boom) drawShip();
        else if (s.boom.t < 0.5) {
          const k = s.boom.t / 0.5;
          g.fillStyle = `rgba(255,220,120,${1 - k})`;
          g.beginPath(); g.arc(s.boom.x, s.boom.y, 2 + k * 12, 0, 7); g.fill();
        }
        g.restore();
        hud();
      }

      function drawShip() {
        g.save();
        g.translate(ship.x, ship.y);
        g.rotate(ship.a);
        // nogi
        g.strokeStyle = "#ced4da"; g.lineWidth = 0.45; g.lineCap = "round";
        g.beginPath(); g.moveTo(-1.6, 0.8); g.lineTo(-FOOT, 3); g.moveTo(1.6, 0.8); g.lineTo(FOOT, 3); g.moveTo(-FOOT - 0.7, 3); g.lineTo(-FOOT + 0.7, 3); g.moveTo(FOOT - 0.7, 3); g.lineTo(FOOT + 0.7, 3); g.stroke();
        // dysza
        g.fillStyle = "#495057";
        g.beginPath(); g.moveTo(-0.9, 1.2); g.lineTo(0.9, 1.2); g.lineTo(1.3, 2.6); g.lineTo(-1.3, 2.6); g.fill();
        // kadłub: złota folia na dole, kabina u góry
        const fg = g.createLinearGradient(-2.2, 0, 2.2, 0);
        fg.addColorStop(0, "#b8860b"); fg.addColorStop(0.5, "#ffd76a"); fg.addColorStop(1, "#a07208");
        g.fillStyle = fg;
        g.beginPath(); g.roundRect(-2.3, -0.4, 4.6, 1.8, 0.4); g.fill();
        const hg = g.createLinearGradient(-2, -3, 2, 0);
        hg.addColorStop(0, "#f1f3f5"); hg.addColorStop(1, "#adb5bd");
        g.fillStyle = hg;
        g.beginPath(); g.moveTo(-2, -0.4); g.lineTo(-1.4, -2.8); g.lineTo(1.4, -2.8); g.lineTo(2, -0.4); g.fill();
        g.fillStyle = "#4dabf7"; g.beginPath(); g.moveTo(-0.9, -1); g.lineTo(-0.6, -2.3); g.lineTo(0.6, -2.3); g.lineTo(0.9, -1); g.fill();
        g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(-0.5, -2.1, 0.3, 0.8);
        if (ship.burn) {
          const fl = 3 + Math.random() * 2.5;
          const fgr = g.createLinearGradient(0, 2.6, 0, 2.6 + fl);
          fgr.addColorStop(0, "#ffffff"); fgr.addColorStop(0.3, "#ffd43b"); fgr.addColorStop(1, "rgba(255,120,30,0)");
          g.fillStyle = fgr;
          g.beginPath(); g.moveTo(-1.1, 2.6); g.quadraticCurveTo(0, 2.6 + fl * 1.3, 1.1, 2.6); g.fill();
        }
        g.restore();
      }

      // Wskaźniki prędkości i kąta przy lądowniku: zielone, gdy lądowanie byłoby bezpieczne.
      function hud() {
        const ok = (v) => (v ? "#69db7c" : "#ff8787");
        const vyOk = ship.vy <= SAFE_VY, vxOk = Math.abs(ship.vx) <= SAFE_VX, aOk = Math.abs(ship.a) <= SAFE_A;
        g.font = "600 3px Geist, system-ui, sans-serif";
        g.textAlign = "left";
        const rows = [["Opadanie", ship.vy.toFixed(1), vyOk], ["Poziomo", Math.abs(ship.vx).toFixed(1), vxOk], ["Przechył", `${Math.round((ship.a * 180) / Math.PI)}°`, aOk]];
        g.fillStyle = "rgba(10,14,30,0.55)";
        g.beginPath(); g.roundRect(2, 2, 30, 14, 1.5); g.fill();
        rows.forEach(([k, v, good], i) => {
          g.fillStyle = "rgba(220,225,240,0.8)"; g.fillText(k, 4, 6 + i * 4);
          g.fillStyle = ok(good); g.textAlign = "right"; g.fillText(v, 30, 6 + i * 4); g.textAlign = "left";
        });
        if (L.wind) {
          g.fillStyle = "rgba(220,225,240,0.8)";
          g.fillText("Wiatr", 4, 20);
          const wx = 22, len = env.wind * 2.4;
          g.strokeStyle = "#74c0fc"; g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(wx, 19); g.lineTo(wx + len, 19); g.lineTo(wx + len - Math.sign(len) * 1.2, 18); g.moveTo(wx + len, 19); g.lineTo(wx + len - Math.sign(len) * 1.2, 20); g.stroke();
        }
        // wysokość nad gruntem
        const alt = groundAt(t, ship.x) - ship.y - 3;
        if (alt < 25 && !s.boom && s.landed < 0) {
          g.fillStyle = "rgba(220,225,240,0.7)";
          g.textAlign = "center";
          g.fillText(alt.toFixed(0), ship.x + 6, ship.y - 3);
        }
      }

      function render() {
        fuelEl.set(`${Math.round((ship.fuel / L.fuel) * 100)}%`, ship.fuel / L.fuel, ship.burn ? "Silnik pracuje" : "");
        padEl.set(`${s.target} z ${L.pads}`);
        liveEl.set(`${s.lives} z ${L.lives}`);
        ctx.progress(s.target / L.pads);
      }
      render();
    },
  });
}
