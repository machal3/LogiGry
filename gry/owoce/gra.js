// Owocowa wieża: owoce spadają do słoja z fizyką (Verlet), dwa jednakowe łączą się w większy.
{
  // --- Logika bez DOM ---
  const FRUITS = [
    { name: "Wiśnia", r: 4.1, c1: "#ff6b81", c2: "#c81d3c", kind: "cherry" },
    { name: "Truskawka", r: 5.5, c1: "#ff8787", c2: "#e03131", kind: "straw" },
    { name: "Winogrono", r: 7.0, c1: "#c08cff", c2: "#7340c9", kind: "grape" },
    { name: "Mandarynka", r: 8.3, c1: "#ffc078", c2: "#f76707", kind: "citrus" },
    { name: "Pomarańcza", r: 10.0, c1: "#ffa94d", c2: "#e8590c", kind: "citrus" },
    { name: "Jabłko", r: 11.7, c1: "#ff8a8a", c2: "#c92a2a", kind: "apple" },
    { name: "Gruszka", r: 13.4, c1: "#e9f5a0", c2: "#a9c23f", kind: "pear" },
    { name: "Brzoskwinia", r: 15.3, c1: "#ffd8c2", c2: "#ff8f70", kind: "peach" },
    { name: "Ananas", r: 17.3, c1: "#ffe066", c2: "#e0a800", kind: "pine" },
    { name: "Melon", r: 19.5, c1: "#d8f5a2", c2: "#82c91e", kind: "melon" },
    { name: "Arbuz", r: 22.2, c1: "#69db7c", c2: "#2b8a3e", kind: "water" },
  ];
  const W = 100, H = 150, BOTTOM = 143, LINE = 38, DROP_Y = 20, G = 260, SUB = 8;
  const score = (tier) => (tier * (tier + 1)) / 2;

  function createWorld(jarW) {
    return { fruits: [], L: 50 - jarW / 2, R: 50 + jarW / 2, events: [], id: 0, best: 0 };
  }
  function drop(w, x, tier) {
    const r = FRUITS[tier].r;
    x = Math.max(w.L + r, Math.min(w.R - r, x));
    const f = { id: ++w.id, tier, r, full: r, x: x + (Math.random() - 0.5) * 0.1, y: DROP_Y, px: x, py: DROP_Y - 0.4, a: 0, age: 0, dead: false };
    w.fruits.push(f);
    return f;
  }
  // Krok fizyki o dt sekund; połączenia trafiają do w.events.
  function step(w, dt) {
    const h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      for (const f of w.fruits) {
        let vx = (f.x - f.px) * 0.998, vy = (f.y - f.py) * 0.998;
        const cap = 0.7; // ograniczenie prędkości: rozpychanie nakładających się owoców nie wystrzeliwuje ich w górę
        const sp = Math.hypot(vx, vy);
        if (sp > cap) { vx *= cap / sp; vy *= cap / sp; }
        f.px = f.x; f.py = f.y;
        f.x += vx; f.y += vy + G * h * h;
        // nowy owoc rośnie płynnie, żeby nie rozepchnąć sąsiadów naraz
        if (f.r < f.full) f.r = Math.min(f.full, f.r + f.full * h * 6);
      }
      for (let it = 0; it < 2; it++) {
        const fr = w.fruits;
        for (let i = 0; i < fr.length; i++) {
          const a = fr[i];
          if (a.dead) continue;
          for (let j = i + 1; j < fr.length; j++) {
            const b = fr[j];
            if (b.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
            if (Math.abs(dx) >= min || Math.abs(dy) >= min) continue;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            if (a.tier === b.tier) { merge(w, a, b); break; }
            const d = Math.sqrt(d2) || 0.001, over = (min - d) * 0.8;
            const nx = dx / d, ny = dy / d, ma = a.r * a.r, mb = b.r * b.r, k = over / (ma + mb);
            a.x -= nx * k * mb; a.y -= ny * k * mb;
            b.x += nx * k * ma; b.y += ny * k * ma;
            // część korekty przesuwa też poprzednią pozycję: rozpychanie nie zamienia się w wystrzał
            a.px -= nx * k * mb * 0.6; a.py -= ny * k * mb * 0.6;
            b.px += nx * k * ma * 0.6; b.py += ny * k * ma * 0.6;
          }
        }
        for (const f of fr) {
          if (f.dead) continue;
          if (f.x < w.L + f.r) { f.x = w.L + f.r; }
          if (f.x > w.R - f.r) { f.x = w.R - f.r; }
          if (f.y > BOTTOM - f.r) {
            f.y = BOTTOM - f.r;
            f.px = f.x - (f.x - f.px) * 0.92; // tarcie o dno
          }
        }
      }
      w.fruits = w.fruits.filter((f) => !f.dead);
      for (const f of w.fruits) f.a += (f.x - f.px) / f.r;
    }
    for (const f of w.fruits) f.age += dt;
  }
  function merge(w, a, b) {
    a.dead = b.dead = true;
    const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
    if (a.tier === FRUITS.length - 1) { w.events.push({ x, y, tier: a.tier + 1, gone: true }); return; }
    const t = a.tier + 1, r = FRUITS[t].r;
    const vx = (a.x - a.px + b.x - b.px) / 2, vy = (a.y - a.py + b.y - b.py) / 2;
    const n = { id: ++w.id, tier: t, r: a.r, full: r, x, y, px: x - vx * 0.3, py: y - vy * 0.3, a: (a.a + b.a) / 2, age: 2, dead: false, pop: 1 };
    w.fruits.push(n);
    w.best = Math.max(w.best, t);
    w.events.push({ x, y, tier: t });
  }
  // Najwyższy punkt owoców, które już leżą (świeżo upuszczone się nie liczą).
  const overLine = (w) => w.fruits.some((f) => f.age > 1.4 && f.y - f.r < LINE);
  const nextTier = () => [0, 0, 0, 1, 1, 1, 2, 2, 3, 4][rnd(10)];

  if (typeof module !== "undefined") module.exports = { FRUITS, createWorld, drop, step, overLine, nextTier, W, H, BOTTOM, LINE };

  if (typeof registerGame !== "undefined") registerGame({
    id: "owoce",
    cat: "lamiglowki",
    name: "Owocowa wieża",
    author: "Claude Opus 5.5",
    desc: "Upuszczaj owoce do słoja. Dwa jednakowe po zetknięciu łączą się w większy. Nie przepełnij słoja.",
    color: "#e8436a",
    ink: "#ffffff",
    glyph: [".....", ".#...", "##.#.", "#####", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, jar: 86, target: 6 },
      { key: "medium", name: "Średni", points: 25, jar: 82, target: 8 },
      { key: "hard", name: "Trudny", points: 50, jar: 76, target: 9 },
    ],
    rules: [
      "Przesuń owoc nad słojem myszą albo palcem i puść, żeby go upuścić. Klawiatura: strzałki przesuwają, spacja upuszcza.",
      "Dwa jednakowe owoce po zetknięciu łączą się w kolejny, większy. Kolejność widać w panelu.",
      "Wygrywasz, gdy powstanie owoc docelowy. Przegrywasz, gdy owoce zbyt długo wystają ponad przerywaną linię.",
      "Duże owoce trzymaj na bokach, a małe łącz od razu, zanim się zakopią.",
    ],
    achievements: [
      { id: "ananas", name: "Ananas", desc: "Połącz dwie brzoskwinie w ananasa.", points: 10 },
      { id: "lancuch", name: "Reakcja łańcuchowa", desc: "Wykonaj cztery połączenia w ciągu dwóch sekund.", points: 25 },
      { id: "spokoj", name: "Zimna krew", desc: "Wygraj średni lub trudny poziom, nie przekraczając ani razu linii.", points: 25 },
      { id: "punkty", name: "Sadownik", desc: "Zdobądź 600 punktów w jednej partii.", points: 25 },
      { id: "arbuz", name: "Arbuz", desc: "Wyhoduj arbuza, największy owoc.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, W, H, { max: 72 });
      const { g } = cv;
      const w = createWorld(L.jar);
      const s = { x: 50, cur: nextTier(), next: nextTier(), cool: 0, score: 0, danger: 0, warned: false, parts: [], floats: [], shake: 0, ending: 0 };

      const scoreEl = statBlock(ctx, "Wynik", { meter: true });
      const chain = el("div", "ow-chain");
      FRUITS.forEach((f, i) => {
        const dot = el("span", "ow-dot");
        dot.style.setProperty("--d", `${8 + f.r * 0.95}px`);
        dot.style.setProperty("--f1", f.c1);
        dot.style.setProperty("--f2", f.c2);
        dot.title = f.name;
        dot.setAttribute("aria-label", f.name);
        if (i === L.target) dot.classList.add("goal");
        chain.append(dot);
      });
      const goalNote = el("p", "panel-note", `Cel: ${FRUITS[L.target].name.toLowerCase()}. Kolejność owoców od najmniejszego:`);
      ctx.panel.append(panelBlock("Cel", goalNote, chain));

      function dropNow() {
        if (ctx.done || s.cool > 0 || s.ending) return;
        drop(w, s.x, s.cur);
        Sound.tap();
        s.cur = s.next;
        s.next = nextTier();
        s.cool = 0.5;
      }
      const moveTo = (e) => { s.x = cv.at(e)[0]; };
      let down = false;
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); down = true; moveTo(e); });
      ctx.on(cv.cv, "pointermove", moveTo);
      ctx.on(document, "pointerup", () => { if (down) { down = false; dropNow(); } });
      const keys = heldKeys(ctx, (k) => { if (k === " " || k === "enter" || k === "arrowdown") dropNow(); });

      function onMerge(ev) {
        const f = FRUITS[Math.min(ev.tier, FRUITS.length - 1)];
        const pts = ev.gone ? 100 : score(ev.tier);
        s.score += pts;
        Sound.place(Math.min(9, ev.tier + 1));
        for (let k = 0; k < 10 + ev.tier * 2; k++) {
          const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 40;
          s.parts.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: 0.6 + Math.random() * 0.4, c: Math.random() < 0.5 ? f.c1 : f.c2, r: 0.6 + Math.random() * 1.2 });
        }
        s.floats.push({ x: ev.x, y: ev.y, t: 1, text: `+${pts}` });
        if (ev.tier >= 7) s.shake = 0.25;
        if (ev.tier === 8) ctx.achieve("ananas");
        if (ev.tier === 10 || ev.gone) ctx.achieve("arbuz");
        if (s.score >= 600) ctx.achieve("punkty");
        const now = performance.now();
        s.chainT = (s.chainT || []).filter((t) => now - t < 2000);
        s.chainT.push(now);
        if (s.chainT.length >= 4) ctx.achieve("lancuch");
        if (ev.tier >= L.target && !s.ending && !ctx.done) {
          s.ending = 1.4;
          ctx.toast(`Cel osiągnięty: ${FRUITS[L.target].name.toLowerCase()}`);
        }
      }

      cv.loop((dt) => {
        if (!ctx.done) {
          if (keys.arrowleft || keys.a) s.x -= 70 * dt;
          if (keys.arrowright || keys.d) s.x += 70 * dt;
          const r = FRUITS[s.cur].r;
          s.x = Math.max(w.L + r, Math.min(w.R - r, s.x));
          s.cool -= dt;
          step(w, dt);
          for (const ev of w.events.splice(0)) onMerge(ev);
          if (overLine(w) && !s.ending) {
            s.danger += dt;
            if (!s.warned) { s.warned = true; Sound.error(); ctx.toast("Uwaga, owoce nad linią"); }
            if (s.danger > 3) {
              const best = FRUITS[w.best]?.name.toLowerCase() || "wiśnia";
              ctx.lose("Słoik pełny", `Największy owoc: ${best}. Wynik: ${s.score}.`);
            }
          } else s.danger = Math.max(0, s.danger - dt * 2);
          if (s.ending) {
            s.ending -= dt;
            if (s.ending <= 0) {
              if (L.key !== "easy" && !s.warned) ctx.achieve("spokoj");
              ctx.win(`Wynik: ${s.score}.`);
            }
          }
          scoreEl.set(s.score, w.best / L.target, `Największy owoc: ${FRUITS[w.best].name.toLowerCase()}`);
          [...chain.children].forEach((d, i) => d.classList.toggle("on", i <= w.best));
          ctx.progress(w.best / L.target);
        }
        draw(dt);
      });

      // --- Rysowanie ---
      function draw(dt) {
        g.save();
        if (s.shake > 0) { s.shake -= dt; g.translate((Math.random() - 0.5) * s.shake * 6, (Math.random() - 0.5) * s.shake * 6); }
        // tło: kuchenne okno z ciepłym światłem
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#fff1e0");
        bg.addColorStop(1, "#ffd9c0");
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(255,255,255,0.35)";
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(12 + i * 17, 8 + (i % 2) * 4, 9, 0, 7); g.fill(); }
        // blat
        g.fillStyle = "#b07a4f";
        g.fillRect(0, BOTTOM + 2, W, H - BOTTOM);
        g.fillStyle = "#8c5a35";
        g.fillRect(0, BOTTOM + 2, W, 1.2);
        // wnętrze słoja
        const { L: jl, R: jr } = w;
        g.fillStyle = "rgba(255,255,255,0.45)";
        g.beginPath();
        g.roundRect(jl - 1.5, LINE - 10, jr - jl + 3, BOTTOM - LINE + 11.5, [2, 2, 7, 7]);
        g.fill();
        // linia ostrzegawcza
        const warn = s.danger > 0;
        g.setLineDash([2.2, 2.2]);
        g.strokeStyle = warn ? `rgba(224,49,49,${0.5 + 0.5 * Math.sin(performance.now() / 80)})` : "rgba(140,90,60,0.45)";
        g.lineWidth = 0.6;
        g.beginPath(); g.moveTo(jl, LINE); g.lineTo(jr, LINE); g.stroke();
        g.setLineDash([]);
        // celownik i owoc do upuszczenia
        if (!ctx.done && !s.ending) {
          const r = FRUITS[s.cur].r;
          g.strokeStyle = "rgba(140,90,60,0.25)";
          g.lineWidth = 0.5;
          g.beginPath(); g.moveTo(s.x, DROP_Y + r); g.lineTo(s.x, BOTTOM); g.stroke();
          drawFruit({ tier: s.cur, r, x: s.x, y: DROP_Y, a: 0 }, s.cool > 0 ? 0.5 : 1);
        }
        for (const f of w.fruits) {
          if (f.pop) f.pop = Math.max(0, f.pop - dt * 5);
          drawFruit(f, 1, 1 + (f.pop || 0) * 0.25);
        }
        // szkło: odblaski i krawędzie
        g.strokeStyle = "rgba(120,160,190,0.7)";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(jl - 1.5, LINE - 12);
        g.lineTo(jl - 1.5, BOTTOM - 5);
        g.quadraticCurveTo(jl - 1.5, BOTTOM + 1.5, jl + 5, BOTTOM + 1.5);
        g.lineTo(jr - 5, BOTTOM + 1.5);
        g.quadraticCurveTo(jr + 1.5, BOTTOM + 1.5, jr + 1.5, BOTTOM - 5);
        g.lineTo(jr + 1.5, LINE - 12);
        g.stroke();
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(jl + 1.5, LINE - 6, 2, BOTTOM - LINE);
        g.fillRect(jr - 6, LINE + 10, 1, BOTTOM - LINE - 30);
        g.fillStyle = "#9cc3dc";
        g.beginPath(); g.roundRect(jl - 3, LINE - 13, jr - jl + 6, 3, 1.5); g.fill();
        // cząstki soku i napisy
        for (const p of s.parts) {
          p.vy += 90 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          g.globalAlpha = Math.max(0, p.life);
          g.fillStyle = p.c;
          g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill();
        }
        s.parts = s.parts.filter((p) => p.life > 0);
        g.textAlign = "center";
        g.font = "700 5px Geist, system-ui, sans-serif";
        for (const t of s.floats) {
          t.t -= dt; t.y -= 12 * dt;
          g.globalAlpha = Math.max(0, t.t);
          g.fillStyle = "#7a3b12";
          g.fillText(t.text, t.x, t.y);
        }
        s.floats = s.floats.filter((t) => t.t > 0);
        g.globalAlpha = 1;
        // podgląd następnego owocu
        g.fillStyle = "rgba(122,59,18,0.75)";
        g.font = "600 3.6px Geist, system-ui, sans-serif";
        g.textAlign = "right";
        g.fillText("Następny", 96, 6);
        drawFruit({ tier: s.next, r: Math.min(5, FRUITS[s.next].r), x: 90, y: 12.5, a: 0 }, 1, 1, true);
        g.restore();
      }

      // Owoc z buzią; rysunek obraca się razem z toczeniem.
      function drawFruit(f, alpha = 1, scale = 1, mini = false) {
        const spec = FRUITS[f.tier], r = f.r * scale;
        g.save();
        g.globalAlpha = alpha;
        g.translate(f.x, f.y);
        // cień
        if (!mini) { g.fillStyle = "rgba(90,40,10,0.12)"; g.beginPath(); g.ellipse(0, r * 0.9, r * 0.8, r * 0.18, 0, 0, 7); g.fill(); }
        g.rotate(f.a);
        const grad = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        grad.addColorStop(0, spec.c1);
        grad.addColorStop(1, spec.c2);
        g.fillStyle = grad;
        g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
        g.lineWidth = r * 0.06;
        g.strokeStyle = "rgba(60,20,10,0.18)";
        g.stroke();
        details(spec.kind, r);
        if (!mini) face(r);
        // połysk
        g.fillStyle = "rgba(255,255,255,0.45)";
        g.beginPath(); g.ellipse(-r * 0.42, -r * 0.45, r * 0.22, r * 0.13, -0.7, 0, 7); g.fill();
        g.restore();
      }
      function details(kind, r) {
        g.lineCap = "round";
        if (kind === "cherry" || kind === "apple" || kind === "pear") {
          g.strokeStyle = "#6b3e1e"; g.lineWidth = r * 0.12;
          g.beginPath(); g.moveTo(0, -r * 0.85); g.quadraticCurveTo(r * 0.1, -r * 1.25, r * 0.3, -r * 1.35); g.stroke();
          g.fillStyle = "#51a33a";
          g.beginPath(); g.ellipse(r * 0.35, -r * 1.05, r * 0.3, r * 0.14, -0.5, 0, 7); g.fill();
        }
        if (kind === "straw") {
          g.fillStyle = "rgba(255,240,180,0.9)";
          for (let k = 0; k < 9; k++) { const a = k * 2.4, d = r * (0.3 + (k % 3) * 0.2); g.beginPath(); g.ellipse(Math.cos(a) * d, Math.sin(a) * d + r * 0.1, r * 0.05, r * 0.08, a, 0, 7); g.fill(); }
          g.fillStyle = "#40a33a";
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.ellipse(k * r * 0.22, -r * 0.88, r * 0.25, r * 0.1, k * 0.5, 0, 7); g.fill(); }
        }
        if (kind === "grape") {
          g.fillStyle = "rgba(255,255,255,0.18)";
          for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.28, 0, 7); g.fill(); }
          g.strokeStyle = "#5c7a2a"; g.lineWidth = r * 0.1;
          g.beginPath(); g.moveTo(0, -r * 0.9); g.lineTo(0, -r * 1.2); g.stroke();
        }
        if (kind === "citrus") {
          g.fillStyle = "rgba(180,70,0,0.18)";
          for (let k = 0; k < 14; k++) { const a = k * 2.4, d = r * (0.2 + (k % 4) * 0.18); g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.035, 0, 7); g.fill(); }
          g.fillStyle = "#3f9a3a";
          g.beginPath(); g.ellipse(r * 0.18, -r * 0.92, r * 0.28, r * 0.12, -0.3, 0, 7); g.fill();
        }
        if (kind === "peach") {
          g.strokeStyle = "rgba(200,80,60,0.35)"; g.lineWidth = r * 0.06;
          g.beginPath(); g.moveTo(0, -r * 0.95); g.quadraticCurveTo(-r * 0.35, 0, 0, r * 0.95); g.stroke();
          g.fillStyle = "#58a83b";
          g.beginPath(); g.ellipse(r * 0.25, -r * 0.95, r * 0.28, r * 0.11, -0.4, 0, 7); g.fill();
        }
        if (kind === "pine") {
          g.strokeStyle = "rgba(150,90,0,0.35)"; g.lineWidth = r * 0.04;
          for (let k = -3; k <= 3; k++) {
            g.beginPath(); g.moveTo(k * r * 0.3 - r, -r); g.lineTo(k * r * 0.3 + r, r); g.stroke();
            g.beginPath(); g.moveTo(k * r * 0.3 + r, -r); g.lineTo(k * r * 0.3 - r, r); g.stroke();
          }
          g.fillStyle = "#2f9e44";
          for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(k * r * 0.15 - r * 0.1, -r * 0.85); g.lineTo(k * r * 0.25, -r * 1.35 + Math.abs(k) * r * 0.12); g.lineTo(k * r * 0.15 + r * 0.1, -r * 0.85); g.fill(); }
        }
        if (kind === "melon") {
          g.strokeStyle = "rgba(255,255,230,0.55)"; g.lineWidth = r * 0.035;
          for (let k = -3; k <= 3; k++) {
            g.beginPath(); g.ellipse(0, 0, Math.abs(k) * r * 0.3 + 0.01, r * 0.98, 0, 0, 7); g.stroke();
          }
          g.beginPath(); g.moveTo(-r, -r * 0.3); g.quadraticCurveTo(0, -r * 0.1, r, -r * 0.35); g.stroke();
          g.beginPath(); g.moveTo(-r, r * 0.35); g.quadraticCurveTo(0, r * 0.5, r, r * 0.3); g.stroke();
        }
        if (kind === "water") {
          g.fillStyle = "#1b5e2a";
          for (let k = -3; k <= 3; k++) {
            g.beginPath();
            g.ellipse(k * r * 0.3, 0, r * 0.07, r * Math.sqrt(1 - Math.pow(k * 0.3, 2)) * 0.97, 0, 0, 7);
            g.fill();
          }
        }
      }
      function face(r) {
        const e = r * 0.1;
        g.fillStyle = "#2b1a12";
        g.beginPath(); g.arc(-r * 0.3, -r * 0.05, e, 0, 7); g.arc(r * 0.3, -r * 0.05, e, 0, 7); g.fill();
        g.fillStyle = "#ffffff";
        g.beginPath(); g.arc(-r * 0.27, -r * 0.09, e * 0.4, 0, 7); g.arc(r * 0.33, -r * 0.09, e * 0.4, 0, 7); g.fill();
        g.strokeStyle = "#2b1a12"; g.lineWidth = r * 0.06;
        g.beginPath(); g.arc(0, r * 0.1, r * 0.14, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = "rgba(255,120,140,0.35)";
        g.beginPath(); g.ellipse(-r * 0.48, r * 0.15, r * 0.12, r * 0.07, 0, 0, 7); g.ellipse(r * 0.48, r * 0.15, r * 0.12, r * 0.07, 0, 0, 7); g.fill();
      }
    },
  });
}
