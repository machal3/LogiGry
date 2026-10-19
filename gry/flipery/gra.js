// Flipery: stół 100 × 150 (oś y w dół). Fizyka kulki: odcinki ścian, koła odbijaczy, flippery jako obracające się kapsuły.
{
  // --- Logika bez DOM ---
  const W = 100, H = 150, R = 2.2;
  // górny łuk spłaszczony (elipsa), żeby stół był niższy i większy na ekranie
  const ARC = { x: 50, y: 28, rx: 46, ry: 26 };
  const LEFT_PIVOT = [29, 130], RIGHT_PIVOT = [63, 130], FLEN = 13.5, FR = 1.7;
  // procy: [tył-góra, tył-dół, wierzchołek], prawa to odbicie lewej względem x = 46
  const SLINGS = [[[[14.5, 102.6], [25.5, 116], [15, 89]], 0], [[[77.5, 102.6], [66.5, 116], [77, 89]], 1]];

  function makeTable() {
    const segs = [];
    // body: ściana jest krawędzią bryły rysowanej w całości (obudowa, procy), nie osobną szyną
    const seg = (a, b, o = {}) => segs.push({ a, b, e: 0.45, kick: 0, ...o });
    // łuk górny
    const n = 28;
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI + (k / n) * Math.PI, a1 = Math.PI + ((k + 1) / n) * Math.PI;
      seg([ARC.x + Math.cos(a0) * ARC.rx, ARC.y + Math.sin(a0) * ARC.ry], [ARC.x + Math.cos(a1) * ARC.rx, ARC.y + Math.sin(a1) * ARC.ry], { e: 0.25, body: true });
    }
    seg([4, 28], [4, 100], { body: true });
    seg([96, 28], [96, 148], { body: true });
    seg([88, 44], [88, 148], { lane: true });
    seg([88, 148], [96, 148], { body: true });
    // prowadnice do flipperów
    // prowadnice kończą się nad osią flippera: kulka zjeżdża prosto na flipper
    seg([4, 100], [LEFT_PIVOT[0], LEFT_PIVOT[1] - 2], { body: true });
    seg([88, 100], [RIGHT_PIVOT[0], RIGHT_PIVOT[1] - 2], { body: true });
    // fartuch pod flipperami: kulka spod flippera spada do środka
    seg([LEFT_PIVOT[0] - 2, LEFT_PIVOT[1] + 1], [38, 156], { body: true });
    seg([RIGHT_PIVOT[0] + 2, RIGHT_PIVOT[1] + 1], [54, 156], { body: true });
    // procy: tylna krawędź równoległa do prowadnicy, między nimi tor szerszy niż kulka
    for (const [pts, side] of SLINGS) {
      const [a, b, c] = pts;
      seg(a, b, { e: 0.4, body: true });
      seg(c, a, { e: 0.5, body: true });
      seg(c, b, { kick: 75, kind: "sling", side });
    }
    // słupki torów u góry
    for (const x of [34, 46, 58]) seg([x, 10], [x, 20], { e: 0.4 });
    // ściana za celami, pochyła: kulka nie zatrzyma się na niej
    seg([56, 77.6], [80, 82.4], { e: 0.3 });
    // bramka wyrzutni: zamyka tor, gdy kulka już z niego wyjechała
    const gate = { a: [88, 44], b: [96, 36], e: 0.3, kick: 0, gate: true };
    segs.push(gate);
    const bumpers = [
      { x: 30, y: 38, r: 5.5, kick: 70 },
      { x: 57, y: 36, r: 5.5, kick: 70 },
      { x: 43, y: 56, r: 5.5, kick: 70 },
    ];
    const targets = [58, 63.5, 69, 74.5].map((x) => ({ a: [x, 73 + (x - 58) * 0.2], b: [x + 4.5, 73 + (x + 4.5 - 58) * 0.2], up: true }));
    const flippers = [
      { p: LEFT_PIVOT, rest: 0.5, upA: -0.45, ang: 0.5, w: 0, side: 0 },
      { p: RIGHT_PIVOT, rest: Math.PI - 0.5, upA: Math.PI + 0.45, ang: Math.PI - 0.5, w: 0, side: 1 },
    ];
    return { segs, bumpers, targets, flippers, saucer: { x: 15, y: 54, r: 3.2 } };
  }

  function newBall() { return { x: 92, y: 144, vx: 0, vy: 0, inLane: true, held: 0 }; }

  const closest = (p, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby)));
    return [a[0] + abx * t, a[1] + aby * t];
  };
  // odbicie od punktu kontaktu c (z prędkością powierzchni vs)
  function bounce(ball, c, rad, e, kick, vs = [0, 0]) {
    const dx = ball.x - c[0], dy = ball.y - c[1], d = Math.hypot(dx, dy);
    if (d >= R + rad || d === 0) return 0;
    const nx = dx / d, ny = dy / d;
    ball.x = c[0] + nx * (R + rad);
    ball.y = c[1] + ny * (R + rad);
    const vn = (ball.vx - vs[0]) * nx + (ball.vy - vs[1]) * ny;
    if (vn >= 0) return 0;
    ball.vx -= (1 + e) * vn * nx;
    ball.vy -= (1 + e) * vn * ny;
    if (kick && -vn > 15) { ball.vx += nx * kick; ball.vy += ny * kick; }
    return -vn;
  }

  // Krok fizyki. input: { left, right }. Zdarzenia (punkty, dźwięki) trafiają do ev.
  function step(t, ball, input, dt, opts, ev) {
    const SUB = 10, h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      for (const f of t.flippers) {
        const held = f.side ? input.right : input.left;
        const target = held ? f.upA : f.rest;
        const sp = held ? 24 : 15, dir = Math.sign(target - f.ang);
        const prev = f.ang;
        f.ang = dir > 0 ? Math.min(target, f.ang + sp * h) : Math.max(target, f.ang - sp * h);
        f.w = (f.ang - prev) / h;
      }
      if (ball.held > 0) continue;
      ball.vy += opts.g * h;
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > 320) { ball.vx *= 320 / sp; ball.vy *= 320 / sp; }
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      if (ball.inLane && ball.y < 32) ball.inLane = false;
      for (const sg of t.segs) {
        if (sg.gate && ball.inLane) continue;
        const v = bounce(ball, closest([ball.x, ball.y], sg.a, sg.b), 0, sg.e, sg.kick);
        if (v && sg.kind === "sling") ev.push({ kind: "sling", side: sg.side });
        else if (v > 40) ev.push({ kind: "wall", v });
      }
      for (const b of t.bumpers) if (bounce(ball, [b.x, b.y], b.r, 0.6, b.kick)) { b.lit = 0.25; ev.push({ kind: "bumper" }); }
      for (const tg of t.targets) {
        if (!tg.up) continue;
        if (bounce(ball, closest([ball.x, ball.y], tg.a, tg.b), 0.6, 0.4, 0)) { tg.up = false; ev.push({ kind: "target" }); }
      }
      for (const f of t.flippers) {
        const tip = [f.p[0] + Math.cos(f.ang) * FLEN, f.p[1] + Math.sin(f.ang) * FLEN];
        const c = closest([ball.x, ball.y], f.p, tip);
        const vs = [-(c[1] - f.p[1]) * f.w, (c[0] - f.p[0]) * f.w];
        // kapsuła zwęża się ku końcowi
        const k = Math.hypot(c[0] - f.p[0], c[1] - f.p[1]) / FLEN;
        if (bounce(ball, c, FR * (1.25 - 0.45 * k), 0.25, 0, vs) > 60) ev.push({ kind: "flip" });
      }
      // ściany jeszcze raz: flipper nie może przepchnąć kulki przez prowadnicę
      for (const sg of t.segs) if (!(sg.gate && ball.inLane)) bounce(ball, closest([ball.x, ball.y], sg.a, sg.b), 0, sg.e, 0);
      // dołek: łapie kulkę i po chwili wyrzuca
      const sc = t.saucer;
      if (ball.cool > 0) ball.cool -= h;
      else if (!ball.inLane && Math.hypot(ball.x - sc.x, ball.y - sc.y) < sc.r && Math.hypot(ball.vx, ball.vy) < 180) {
        ball.x = sc.x; ball.y = sc.y; ball.vx = ball.vy = 0; ball.held = 0.9;
        ev.push({ kind: "saucer" });
      }
      // tory u góry
      if (ball.vy < 0 && ball.y < 18 && ball.y - ball.vy * h >= 18) {
        const lane = ball.x > 22 && ball.x < 34 ? 0 : ball.x > 34 && ball.x < 46 ? 1 : ball.x > 46 && ball.x < 58 ? 2 : -1;
        if (lane >= 0) ev.push({ kind: "lane", lane });
      }
      if (ball.y > H + 4) { ev.push({ kind: "drain" }); return; }
    }
    if (ball.held > 0) {
      ball.held -= dt;
      if (ball.held <= 0) { ball.vx = 55 + Math.random() * 15; ball.vy = 35; ball.cool = 0.5; ev.push({ kind: "eject" }); }
    }
  }

  // Prosty automat do testów: unosi flipper, gdy kulka nadlatuje w jego zasięg.
  function bot(t, ball) {
    const near = (f) => {
      const tip = [f.p[0] + Math.cos(f.rest) * FLEN, f.p[1] + Math.sin(f.rest) * FLEN];
      const c = closest([ball.x + ball.vx * 0.03, ball.y + ball.vy * 0.03], f.p, tip);
      return Math.hypot(ball.x + ball.vx * 0.03 - c[0], ball.y + ball.vy * 0.03 - c[1]) < 7 && ball.vy > 8;
    };
    return { left: near(t.flippers[0]), right: near(t.flippers[1]) };
  }

  if (typeof module !== "undefined") module.exports = { makeTable, newBall, step, bot, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "flipery",
    cat: "zrecznosciowe",
    name: "Flipery",
    author: "Claude Opus 5.5",
    desc: "Utrzymuj kulkę na stole flipperami, trafiaj w odbijacze, cele i dołek, by zdobyć wymagany wynik.",
    color: "#d6336c",
    ink: "#ffffff",
    glyph: ["..#..", ".#.#.", "..#..", ".....", "##.##"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, goal: 10000, g: 120, save: 8 },
      { key: "medium", name: "Średni", points: 25, goal: 25000, g: 140, save: 4 },
      { key: "hard", name: "Trudny", points: 50, goal: 50000, g: 160, save: 0 },
    ],
    rules: [
      "Z albo strzałka w lewo porusza lewym flipperem, M albo strzałka w prawo prawym. Na ekranie dotykowym dotknij lewej lub prawej połowy stołu.",
      "Kulkę wystrzeliwuje sprężyna: przytrzymaj spację (albo dotknij stołu) i puść. Dłużej trzymana mocniej strzela.",
      "Odbijacze, procy, cele i dołek dają punkty. Trzy zapalone tory u góry albo komplet celów podnoszą mnożnik.",
      "Masz trzy kulki. Zdobądź wymagany wynik, zanim wszystkie wpadną między flippery.",
    ],
    achievements: [
      { id: "cele", name: "Komplet celów", desc: "Zbij wszystkie cztery cele.", points: 10 },
      { id: "mnoznik", name: "Mnożnik ×3", desc: "Podnieś mnożnik do co najmniej ×3.", points: 25 },
      { id: "jedna-kulka", name: "Jedna kulka", desc: "Zdobądź wymagany wynik pierwszą kulką.", points: 25 },
      { id: "dolek", name: "Dołek", desc: "Trafiaj do dołka trzy razy podczas jednej kulki.", points: 10 },
      { id: "czarodziej", name: "Czarodziej flipperów", desc: "Zdobądź 100 000 punktów w jednej grze.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, W, H, { max: 64 });
      const { g } = cv;
      const t = makeTable();
      const s = { ball: newBall(), balls: 3, score: 0, mult: 1, lanes: [0, 0, 0], plunge: 0, launchT: 0, saucers: 0, hit: [], floats: [], lit: { sling: [0, 0] }, over: false, ballNo: 1, drainT: 0, targetsReset: 0 };
      const input = { left: false, right: false };

      const scoreEl = statBlock(ctx, "Wynik", { meter: true });
      const ballEl = statBlock(ctx, "Kulki", { small: true });
      const multEl = statBlock(ctx, "Mnożnik", { small: true });

      const keys = heldKeys(ctx);
      let touch = { left: 0, right: 0, plunge: false };
      const ptrs = new Map();
      const updTouch = () => {
        touch = { left: 0, right: 0, plunge: false };
        for (const [x] of ptrs.values()) {
          if (s.ball.inLane && !s.ball.vy) touch.plunge = true;
          else if (x < W / 2) touch.left = 1; else touch.right = 1;
        }
      };
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); cv.cv.setPointerCapture?.(e.pointerId); ptrs.set(e.pointerId, cv.at(e)); updTouch(); });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, (e) => { ptrs.delete(e.pointerId); const was = touch.plunge; updTouch(); if (was && !touch.plunge) release(); });

      let plungeHeld = false;
      function release() {
        if (!s.ball.inLane || s.ball.vy || ctx.done) return;
        s.ball.vy = -(150 + 150 * Math.max(0.35, s.plunge));
        s.plunge = 0;
        s.launchT = 0;
        Sound.flag();
      }
      const add = (pts, x, y) => {
        const v = pts * s.mult;
        s.score += v;
        if (x != null) s.floats.push({ x, y, t: 0.9, text: v });
        if (s.score >= L.goal && !s.won) {
          s.won = true;
          if (s.ballNo === 1) ctx.achieve("jedna-kulka");
          ctx.toast("Wynik osiągnięty");
          Sound.line();
          setTimeout(() => alive && finish(), 700);
        }
        if (s.score >= 100000) ctx.achieve("czarodziej");
      };
      let alive = true;
      ctx.onStop(() => { alive = false; });
      function finish() { if (!ctx.done) ctx.win(`Wynik: ${s.score.toLocaleString("pl-PL")}.`); }

      const events = [];
      cv.loop((dt) => {
        if (!ctx.done) {
          input.left = !!(keys.z || keys.arrowleft || keys.shift || touch.left);
          input.right = !!(keys.m || keys.arrowright || keys["/"] || touch.right);
          const pull = keys[" "] || keys.arrowdown || keys.enter || touch.plunge;
          if (pull && s.ball.inLane && !s.ball.vy) { s.plunge = Math.min(1, s.plunge + dt * 1.2); plungeHeld = true; }
          else if (plungeHeld) { plungeHeld = false; release(); }
          // kulka, która wróciła na sprężynę (albo jeszcze na niej leży), czeka na wystrzał
          if (s.ball.inLane && s.ball.y > 140 && Math.abs(s.ball.vy) < 25) Object.assign(s.ball, { x: 92, y: 144, vx: 0, vy: 0 });
          if (!(s.ball.inLane && !s.ball.vy)) step(t, s.ball, input, dt, { g: L.g }, events);
          s.launchT += dt;
          handle(events.splice(0));
        }
        draw(dt);
      });

      function handle(evs) {
        for (const e of evs) {
          if (e.kind === "bumper") { add(100); Sound.place(5 + rnd(3)); }
          else if (e.kind === "sling") { add(50); s.lit.sling[e.side] = 0.2; Sound.tap(); }
          else if (e.kind === "flip") Sound.tap();
          else if (e.kind === "wall" && e.v > 80) Sound.tap();
          else if (e.kind === "target") {
            add(250, 66, 72);
            Sound.place(8);
            if (t.targets.every((x) => !x.up)) {
              add(2000, 66, 66);
              ctx.achieve("cele");
              raiseMult();
              ctx.toast("Komplet celów");
              setTimeout(() => t.targets.forEach((x) => (x.up = true)), 1200);
            }
          } else if (e.kind === "saucer") {
            add(750, 15, 48);
            s.saucers++;
            if (s.saucers >= 3) ctx.achieve("dolek");
            Sound.line();
          } else if (e.kind === "eject") Sound.erase();
          else if (e.kind === "lane") {
            if (!s.lanes[e.lane]) { s.lanes[e.lane] = 1; add(300, 28 + e.lane * 12, 26); Sound.place(3 + e.lane); }
            else add(100);
            if (s.lanes.every(Boolean)) { add(1500, 40, 26); raiseMult(); s.lanes = [0, 0, 0]; ctx.toast("Tory zapalone"); }
          } else if (e.kind === "drain") drain();
        }
        render();
      }
      function raiseMult() {
        s.mult = Math.min(5, s.mult + 1);
        if (s.mult >= 3) ctx.achieve("mnoznik");
        Sound.line();
      }
      function drain() {
        if (L.save && s.launchT < L.save) {
          ctx.toast("Kulka uratowana");
          s.ball = newBall();
          return;
        }
        s.balls--;
        Sound.error();
        if (s.balls <= 0) {
          s.ball = newBall();
          s.ball.gone = true;
          if (!s.won) ctx.lose("Koniec kulek", `Wynik: ${s.score.toLocaleString("pl-PL")} z ${L.goal.toLocaleString("pl-PL")}.`);
          return;
        }
        s.ballNo++;
        s.mult = 1;
        s.saucers = 0;
        s.ball = newBall();
        ctx.toast(`Kulka ${s.ballNo} z 3`);
      }

      // --- Rysowanie ---
      // pole gry: wnętrze obudowy, po którym toczy się kulka (od lewej prowadnicy w górę, łukiem, w dół toru wyrzutni)
      const field = new Path2D();
      field.moveTo(4, 100); field.lineTo(4, ARC.y);
      field.ellipse(ARC.x, ARC.y, ARC.rx, ARC.ry, 0, Math.PI, 0);
      for (const p of [[96, 148], [88, 148], [88, 100], [RIGHT_PIVOT[0], RIGHT_PIVOT[1] - 2], [RIGHT_PIVOT[0] + 2, RIGHT_PIVOT[1] + 1], [56.6, H], [35.4, H], [LEFT_PIVOT[0] - 2, LEFT_PIVOT[1] + 1], [LEFT_PIVOT[0], LEFT_PIVOT[1] - 2]]) field.lineTo(...p);
      field.closePath();
      const FONT = "Geist, system-ui, sans-serif";

      function draw(dt) {
        // tylko kolory motywu: obudowa = --surface, pole = --bg, elementy punktowane = kolor gry
        const { text, muted, line, surface, bg, c, on } = cv.theme;
        const label = (txt, x, y, size = 2.1, color = muted) => {
          g.fillStyle = color; g.font = `600 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
          g.fillText(txt, x, y);
        };
        const lamp = (x, y, r, lit) => {
          if (lit) { g.fillStyle = c; g.globalAlpha = 0.22; g.beginPath(); g.arc(x, y, r + 0.9, 0, 7); g.fill(); g.globalAlpha = 1; }
          g.fillStyle = lit ? c : line; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        };
        g.lineCap = "round"; g.lineJoin = "round";

        // obudowa i pole
        g.fillStyle = surface; g.fillRect(0, 0, W, H);
        g.fillStyle = bg; g.fill(field);
        g.strokeStyle = muted; g.lineWidth = 0.7; g.stroke(field);

        // lampki: tory u góry, cele, mnożnik
        s.lanes.forEach((lit, k) => lamp(28 + k * 12, 25, 1.3, !!lit));
        t.targets.forEach((tg) => lamp((tg.a[0] + tg.b[0]) / 2, 86.5, 1.1, !tg.up));
        for (let k = 0; k < 5; k++) {
          lamp(38 + k * 4, 103, 1.3, s.mult > k);
          label(`×${k + 1}`, 38 + k * 4, 106.6, 1.9, s.mult > k ? text : muted);
        }

        // dołek
        const sc = t.saucer;
        g.fillStyle = text; g.globalAlpha = 0.14; g.beginPath(); g.arc(sc.x, sc.y, sc.r + 0.6, 0, 7); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = s.ball.held > 0 ? c : line; g.lineWidth = 0.9; g.stroke();
        label("750", sc.x, sc.y + sc.r + 3.2);

        // procy: plastikowa bryła, gumka na krawędzi odbijającej
        s.lit.sling = s.lit.sling.map((v) => Math.max(0, v - dt));
        for (const [pts, side] of SLINGS) {
          const hit = s.lit.sling[side] > 0;
          g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.closePath();
          g.fillStyle = surface; g.fill();
          g.fillStyle = c; g.globalAlpha = hit ? 0.55 : 0.14; g.fill(); g.globalAlpha = 1;
          g.strokeStyle = muted; g.lineWidth = 0.5; g.stroke();
          const [, b2, tipP] = pts;
          g.strokeStyle = hit ? text : c; g.lineWidth = 1.4;
          g.beginPath(); g.moveTo(...tipP); g.lineTo(...b2); g.stroke();
        }

        // szyny wewnątrz pola: słupki torów, ściana toru wyrzutni, ściana za celami, bramka
        for (const sg of t.segs) {
          if (sg.body || sg.kind || (sg.gate && s.ball.inLane)) continue;
          g.strokeStyle = sg.gate ? c : muted; g.lineWidth = sg.gate ? 0.9 : 1.1;
          g.beginPath(); g.moveTo(...sg.a); g.lineTo(...sg.b); g.stroke();
        }

        // cele do zbicia: stojące to pełne klocki, zbite zostawiają szczelinę
        for (const tg of t.targets) {
          g.lineCap = "butt";
          g.strokeStyle = tg.up ? c : line; g.lineWidth = tg.up ? 2.2 : 0.8;
          g.beginPath(); g.moveTo(tg.a[0] + 0.5, tg.a[1]); g.lineTo(tg.b[0] - 0.5, tg.b[1]); g.stroke();
          g.lineCap = "round";
        }

        // odbijacze: pierścień w kolorze gry, nakładka z wartością
        for (const b of t.bumpers) {
          b.lit = Math.max(0, (b.lit || 0) - dt);
          const hit = b.lit > 0;
          if (hit) {
            g.strokeStyle = c; g.globalAlpha = b.lit * 4; g.lineWidth = 0.8;
            g.beginPath(); g.arc(b.x, b.y, b.r + 2.2 * (1 - b.lit * 4), 0, 7); g.stroke(); g.globalAlpha = 1;
          }
          g.fillStyle = hit ? text : c; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill();
          g.fillStyle = hit ? c : surface; g.beginPath(); g.arc(b.x, b.y, b.r * 0.66, 0, 7); g.fill();
          label("100", b.x, b.y + 0.15, 2.3, hit ? on : c);
        }

        // flippery: jasna łopatka zwężająca się ku końcowi, gumka w kolorze gry
        for (const f of t.flippers) {
          const r0 = FR * 1.25, r1 = FR * 0.8;
          g.save(); g.translate(...f.p); g.rotate(f.ang);
          g.beginPath(); g.arc(0, 0, r0, Math.PI / 2, Math.PI * 1.5); g.lineTo(FLEN, -r1); g.arc(FLEN, 0, r1, -Math.PI / 2, Math.PI / 2); g.closePath();
          g.fillStyle = surface; g.fill();
          g.strokeStyle = c; g.lineWidth = 0.9; g.stroke();
          g.fillStyle = muted; g.beginPath(); g.arc(0, 0, 0.7, 0, 7); g.fill();
          g.restore();
        }

        // wyrzutnia: tłok i sprężyna
        const py = 146.5 + s.plunge * 3;
        g.strokeStyle = muted; g.lineWidth = 0.5;
        g.beginPath(); for (let k = 0; k <= 6; k++) g.lineTo(90 + (k % 2) * 4, py + 1 + (k * (H - py - 1)) / 6); g.stroke();
        g.fillStyle = s.plunge > 0 ? c : text; g.beginPath(); g.roundRect(89.4, py - 0.6, 5.2, 1.6, 0.6); g.fill();

        // kulka z cieniem
        if (!s.ball.gone) {
          const b = s.ball;
          g.fillStyle = text; g.globalAlpha = 0.16; g.beginPath(); g.ellipse(b.x + 0.6, b.y + 1, R, R * 0.9, 0, 0, 7); g.fill(); g.globalAlpha = 1;
          g.beginPath(); g.arc(b.x, b.y, R, 0, 7); g.fill();
          g.fillStyle = surface; g.globalAlpha = 0.55; g.beginPath(); g.arc(b.x - 0.75, b.y - 0.75, R * 0.32, 0, 7); g.fill(); g.globalAlpha = 1;
        }

        // punkty unoszące się nad trafionym elementem
        for (const f of s.floats) {
          f.t -= dt; f.y -= 10 * dt;
          g.globalAlpha = Math.min(1, Math.max(0, f.t * 2));
          label(`+${f.text}`, f.x, f.y, 2.8, c);
        }
        g.globalAlpha = 1;
        s.floats = s.floats.filter((f) => f.t > 0);

        if (s.ball.inLane && !s.ball.vy && !ctx.done) label("Przytrzymaj i puść", 46, 93, 2.4);
      }

      function render() {
        scoreEl.set(s.score.toLocaleString("pl-PL"), s.score / L.goal, `Cel: ${L.goal.toLocaleString("pl-PL")}`);
        ballEl.set(`${s.ballNo > 3 ? 3 : s.ballNo} z 3`);
        multEl.set(`×${s.mult}`);
        ctx.progress(s.score / L.goal);
      }
      render();
    },
  });
}
