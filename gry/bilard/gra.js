// Bilard: wbij wszystkie bile w limicie uderzeń. Fizyka zderzeń sprężystych, bandy, łuzy, podpowiedź z symulacji.
{
  // --- Logika bez DOM: stół 200 × 110, pole gry 180 × 90 ---
  const TW = 200, TH = 110, X0 = 10, X1 = 190, Y0 = 10, Y1 = 100, R = 2.75;
  const POCKETS = [[X0, Y0, 5.4], [100, Y0 - 1.4, 4.8], [X1, Y0, 5.4], [X0, Y1, 5.4], [100, Y1 + 1.4, 4.8], [X1, Y1, 5.4]];
  const HEAD = [55, 55];
  const COLORS = ["#f5f0e6", "#f0b400", "#1c4fd6", "#d62828", "#5b2a86", "#f07800", "#1b7a3a", "#7a1f1f", "#151515"];

  // Bile w trójkącie; ósemka w środku, gdy jest w grze.
  function rack(n, eight) {
    const balls = [{ n: 0, x: HEAD[0], y: HEAD[1], vx: 0, vy: 0, in: false }];
    const nums = shuffle(Array.from({ length: 15 }, (_, i) => i + 1).filter((k) => k !== 8)).slice(0, eight ? n - 1 : n);
    const spots = [];
    for (let row = 0; spots.length < n; row++) for (let k = 0; k <= row && spots.length < n; k++) spots.push([row, k]);
    const mid = eight ? Math.min(4, n - 1) : -1;
    spots.forEach(([row, k], i) => {
      const num = i === mid ? 8 : nums.pop();
      balls.push({ n: num, x: 140 + row * R * 1.75, y: 55 + (k - row / 2) * R * 2.02, vx: 0, vy: 0, in: false });
    });
    return balls;
  }

  // Symulacja do zatrzymania. hooks: zdarzenia do dźwięków i osiągnięć.
  function step(balls, dt, ev) {
    const SUB = 6, h = dt / SUB;
    for (let s = 0; s < SUB; s++) {
      for (const b of balls) {
        if (b.in) continue;
        const sp = Math.hypot(b.vx, b.vy);
        if (!sp) continue;
        // tarcie toczenia (stałe) i lekki opór
        const ns = Math.max(0, sp - (14 + sp * 0.35) * h);
        b.vx *= ns / sp; b.vy *= ns / sp;
        b.x += b.vx * h; b.y += b.vy * h;
      }
      for (let i = 0; i < balls.length; i++) {
        const a = balls[i];
        if (a.in) continue;
        for (let j = i + 1; j < balls.length; j++) {
          const b = balls[j];
          if (b.in) continue;
          const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
          if (d2 >= 4 * R * R || !d2) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const over = 2 * R - d;
          a.x -= (nx * over) / 2; a.y -= (ny * over) / 2;
          b.x += (nx * over) / 2; b.y += (ny * over) / 2;
          const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (rel <= 0) continue;
          const imp = rel * 0.97;
          a.vx -= imp * nx; a.vy -= imp * ny;
          b.vx += imp * nx; b.vy += imp * ny;
          ev?.hit?.(a, b, rel);
        }
      }
      for (const b of balls) {
        if (b.in) continue;
        // łuza: środek bili blisko środka łuzy
        const p = POCKETS.find(([px, py, pr]) => (b.x - px) ** 2 + (b.y - py) ** 2 < pr * pr);
        if (p) { b.in = true; b.vx = b.vy = 0; b.px = p[0]; b.py = p[1]; ev?.pocket?.(b); continue; }
        // w wylocie łuzy band nie ma
        const nearPocket = POCKETS.some(([px, py, pr]) => (b.x - px) ** 2 + (b.y - py) ** 2 < (pr + R * 1.3) ** 2);
        if (nearPocket) continue;
        let hit = 0;
        if (b.x < X0 + R) { b.x = X0 + R; if (b.vx < 0) { hit = -b.vx; b.vx *= -0.78; } }
        if (b.x > X1 - R) { b.x = X1 - R; if (b.vx > 0) { hit = b.vx; b.vx *= -0.78; } }
        if (b.y < Y0 + R) { b.y = Y0 + R; if (b.vy < 0) { hit = -b.vy; b.vy *= -0.78; } }
        if (b.y > Y1 - R) { b.y = Y1 - R; if (b.vy > 0) { hit = b.vy; b.vy *= -0.78; } }
        if (hit) ev?.cushion?.(b, hit);
      }
      // bile poza stołem (przez wylot łuzy obok) wpadają do najbliższej łuzy
      for (const b of balls) if (!b.in && (b.x < X0 - 3 || b.x > X1 + 3 || b.y < Y0 - 3 || b.y > Y1 + 3)) { b.in = true; ev?.pocket?.(b); }
    }
  }
  const moving = (balls) => balls.some((b) => !b.in && (b.vx || b.vy));

  // Cała symulacja uderzenia na kopii stołu: co wpadło, czy biała.
  function simulate(balls, ang, power) {
    const c = balls.map((b) => ({ ...b }));
    c[0].vx = Math.cos(ang) * power;
    c[0].vy = Math.sin(ang) * power;
    const potted = [];
    let first = null;
    for (let t = 0; t < 900 && moving(c); t++) step(c, 1 / 60, { pocket: (b) => potted.push(b.n), hit: (a, b) => { if (first == null && (a.n === 0 || b.n === 0)) first = a.n === 0 ? b.n : a.n; } });
    return { balls: c, potted, first };
  }

  // Podpowiedź: przegląd uderzeń na wirtualną bilę przy każdej bili i każdej łuzie.
  function bestShot(balls, eightLast) {
    const cue = balls[0];
    const left = balls.filter((b) => b.n && !b.in);
    let best = null;
    const tryShot = (ang, power) => {
      const r = simulate(balls, ang, power);
      const scratch = r.potted.includes(0);
      const early8 = eightLast && r.potted.includes(8) && left.length > r.potted.filter((n) => n).length;
      const score = r.potted.filter((n) => n).length * 10 - (scratch ? 15 : 0) - (early8 ? 100 : 0) + Math.random() * 0.1;
      if (!best || score > best.score) best = { ang, power, score, potted: r.potted };
    };
    for (const b of left) {
      if (eightLast && b.n === 8 && left.length > 1) continue;
      for (const [px, py] of POCKETS) {
        const dx = px - b.x, dy = py - b.y, d = Math.hypot(dx, dy);
        const gx = b.x - (dx / d) * 2 * R, gy = b.y - (dy / d) * 2 * R;
        const ang = Math.atan2(gy - cue.y, gx - cue.x);
        // kąt cięcia większy niż ~80° nie wbije bili
        const cut = Math.abs(((ang - Math.atan2(dy, dx) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (cut > 1.4) continue;
        for (const p of [70, 120, 180]) tryShot(ang, p);
      }
    }
    if (!best || best.score <= 0) for (let k = 0; k < 24; k++) tryShot((k / 24) * Math.PI * 2, 140);
    return best;
  }

  // Tryb bez końca: stół k (od 1). Start jak łatwy (5 bil, pełny celownik), od 6. stołu bez linii pomocniczych,
  // od 9. pełny trójkąt; dalej maleje tylko uzupełnienie pudeł, więc bieg trudnieje bez ściany.
  function stageCfg(k) {
    return {
      balls: Math.min(15, 4 + k + Math.floor(k / 4)),
      eight: k >= 3,
      guide: k <= 2 ? 2 : k <= 5 ? 1 : 0,
      refill: Math.max(2, 7 - Math.floor((k - 1) / 2)),
      hints: k <= 2 ? 2 : k <= 5 ? 1 : k % 3 === 0 ? 1 : 0,
      back: k <= 5 ? 3 : 4,
    };
  }
  const POOL0 = 12, POOL_MAX = 20;

  // Punkty za bieg z liczby wbitych bil. Łatwy poziom to 6 bil (10 pkt), średni ≈ 3 stoły, 18 bil (25 pkt),
  // trudny ≈ 5 stołów, 36 bil (50 pkt); potem przyrost rośnie. Platforma obcina do 150.
  function runPoints(score) {
    if (score < 6) return Math.max(0, score);
    if (score < 18) return Math.round(10 + ((score - 6) * 15) / 12);
    if (score < 36) return Math.round(25 + ((score - 18) * 25) / 18);
    const d = score - 36;
    return Math.min(150, Math.round(50 + d * 1.4 + d * d * 0.01));
  }

  if (typeof module !== "undefined") module.exports = { rack, step, moving, simulate, bestShot, stageCfg, runPoints, POOL0, POOL_MAX, POCKETS, R, X0, X1, Y0, Y1 };

  if (typeof registerGame !== "undefined") registerGame({
    id: "bilard",
    cat: "zrecznosciowe",
    name: "Bilard",
    author: "Claude Opus 5.5",
    desc: "Wbijaj bile do łuz białą bilą, zanim skończy się zapas pudeł. Ustawiaj pozycję do kolejnego strzału.",
    color: "#13734a",
    ink: "#ffffff",
    glyph: ["#...#", ".....", "..#..", ".##..", "#.#.#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, balls: 6, shots: 12, eight: false, guide: 2, hints: 99 },
      { key: "medium", name: "Średni", points: 25, balls: 10, shots: 12, eight: true, guide: 1, hints: 3 },
      { key: "hard", name: "Trudny", points: 50, balls: 15, shots: 10, eight: true, guide: 0, hints: 1 },
    ],
    endless: { unit: ["bila", "bile", "bil"] },
    rules: [
      "Naciśnij na stole i odciągnij jak procę w stronę przeciwną do strzału. Im dalej, tym mocniej. Puść, żeby uderzyć.",
      "Wbij wszystkie bile. Masz zapas pudeł: uderzenie, po którym nic nie wpadło, zabiera jedno z zapasu.",
      "Wpadnięcie białej bili kosztuje dodatkowe uderzenie. Na średnim i trudnym czarna ósemka musi wpaść ostatnia.",
      "Klawiatura: strzałki w lewo i w prawo celują (z Shift dokładniej), w górę i w dół ustawiają siłę, spacja uderza.",
      "Tryb ∞: stoły bez końca, z każdym więcej bil i krótszy celownik. Co kilka wbitych bil i każdy nowy stół oddają pudła, wynik to wbite bile.",
    ],
    achievements: [
      { id: "dublet", name: "Dublet", desc: "Wbij dwie bile jednym uderzeniem.", points: 10 },
      { id: "banda", name: "Od bandy", desc: "Wbij bilę, która przed wpadnięciem odbiła się od bandy.", points: 25 },
      { id: "seria", name: "Seria", desc: "Wbij bile w pięciu uderzeniach z rzędu.", points: 25 },
      { id: "czysto", name: "Czysta gra", desc: "Wygraj średni lub trudny poziom, ani razu nie wbijając białej.", points: 25 },
      { id: "zapas", name: "Profesor", desc: "Wygraj trudny poziom, pudłując najwyżej trzy razy.", points: 50 },
      { id: "maraton", name: "Maraton", desc: "W trybie bez końca wyczyść pięć stołów w jednym biegu.", points: 25 },
      { id: "mistrz-sali", name: "Mistrz sali", desc: "W trybie bez końca wbij 75 bil w jednym biegu.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const E = !!L.endless;
      // cfg: parametry bieżącego stołu (w trybie bez końca zmieniają się co stół)
      const cfg = E ? stageCfg(1) : L;
      const portrait = board.parentElement.clientWidth < 640;
      const cv = canvasGame(board, ctx, portrait ? TH : TW, portrait ? TW : TH, { max: portrait ? 60 : 110 });
      const { g } = cv;
      const balls = rack(cfg.balls, cfg.eight);
      const s = { hints: cfg.hints, ang: 0, power: 0.5, aiming: null, shots: E ? POOL0 : L.shots, stage: 1, score: 0, pots: 0, misses: 0, streak: 0, scratches: 0, rolling: false, potted: [], cushioned: new Set(), cueHit: false, flash: [], hint: null };
      s.ang = Math.atan2(balls[1].y - balls[0].y, balls[1].x - balls[0].x);
      const MAXP = 230;

      const leftEl = statBlock(ctx, "Bile na stole", { meter: true });
      const shotsEl = E ? null : statBlock(ctx, "Zapas pudeł", { small: true });
      const runEl = E ? statsBlock(ctx, "Bieg", ["Wbite", "Stół", "Pudła", "Za bieg"]) : null;
      const rackEl = el("div", "bl-rack");
      ctx.panel.append(panelBlock("Wbite", rackEl));
      const hintBtn = button("Podpowiedź", "btn-ghost wide", hint);
      ctx.panel.append(panelBlock("", hintBtn));

      // współrzędne stołu ↔ płótna (na wąskim ekranie stół stoi pionowo)
      const toTable = ([x, y]) => (portrait ? [y, TH - x] : [x, y]);
      const still = () => !s.rolling && !ctx.done;

      function shoot(ang, power) {
        if (!still() || power < 8) return;
        s.hint = null;
        balls[0].vx = Math.cos(ang) * power;
        balls[0].vy = Math.sin(ang) * power;
        s.rolling = true;
        s.potted = [];
        s.cushioned = new Set();
        s.cueHit = false;
        s.strike = 0.25;
        Sound.tap();
        render();
      }

      let drag = null;
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (!still()) return;
        e.preventDefault();
        drag = toTable(cv.at(e));
        s.aiming = drag;
      });
      ctx.on(document, "pointermove", (e) => {
        if (!drag) return;
        const [x, y] = toTable(cv.at(e));
        const dx = drag[0] - x, dy = drag[1] - y, len = Math.hypot(dx, dy);
        if (len > 2) { s.ang = Math.atan2(dy, dx); s.power = Math.min(1, len / 45); }
        else s.power = 0;
      });
      ctx.on(document, "pointerup", () => {
        if (!drag) return;
        drag = null;
        s.aiming = null;
        if (s.power > 0.04) shoot(s.ang, s.power * MAXP);
      });
      heldKeys(ctx, (k, e) => {
        const fine = e.shiftKey ? 0.003 : 0.025;
        if (k === "arrowleft") s.ang -= fine;
        else if (k === "arrowright") s.ang += fine;
        else if (k === "arrowup") s.power = Math.min(1, s.power + 0.05);
        else if (k === "arrowdown") s.power = Math.max(0.05, s.power - 0.05);
        else if (k === " " || k === "enter") shoot(s.ang, s.power * MAXP);
      });

      function hint() {
        if (!still() || !s.hints) return;
        s.hints--;
        const b = bestShot(balls, cfg.eight);
        if (!b) return;
        s.ang = b.ang;
        s.power = Math.min(1, b.power / MAXP);
        s.hint = 1.6;
        render();
        ctx.toast(b.score > 0 ? "Spróbuj tak: spacja albo odciągnij w tej linii" : "Trudna pozycja, to najlepsze, co widać");
      }

      // Koniec uderzenia: rozliczenie.
      function settle() {
        s.rolling = false;
        const objs = s.potted.filter((n) => n);
        const scratch = s.potted.includes(0);
        const left = balls.filter((b) => b.n && !b.in);
        if (scratch) {
          s.scratches++;
          s.shots--;
          ctx.toast("Biała w łuzie: dodatkowe uderzenie");
          Sound.error();
          const cue = balls[0];
          Object.assign(cue, { in: false, vx: 0, vy: 0, x: HEAD[0], y: HEAD[1] });
          // biała wraca na punkt startowy; gdy zajęty, przesuwa się w bok
          for (let k = 0; balls.some((b) => b !== cue && !b.in && Math.hypot(b.x - cue.x, b.y - cue.y) < 2 * R + 0.5); k++) cue.y = HEAD[1] + ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * R * 2.2);
        }
        if (cfg.eight && objs.includes(8) && left.length) {
          if (!E) return ctx.lose("Ósemka za wcześnie", "Czarna bila musiała wpaść jako ostatnia.");
          // w biegu: ósemka wraca na stół, kara dwóch pudeł
          const b8 = balls.find((b) => b.n === 8);
          Object.assign(b8, { in: false, vx: 0, vy: 0, x: 140, y: 55 });
          for (let k = 0; balls.some((b) => b !== b8 && !b.in && Math.hypot(b.x - b8.x, b.y - b8.y) < 2 * R + 0.5); k++) b8.x = 140 + Math.ceil(k / 2) * R * 2.2 * (k % 2 ? 1 : -1);
          objs.splice(objs.indexOf(8), 1);
          left.push(b8);
          s.shots -= 2;
          ctx.toast("Ósemka za wcześnie: wraca, minus 2 pudła");
          Sound.error();
        }
        if (E && objs.length) {
          s.score += objs.length;
          for (let k = 0; k < objs.length; k++) if (++s.pots % cfg.back === 0 && s.shots < POOL_MAX) s.shots++;
          if (s.score >= 75) ctx.achieve("mistrz-sali");
        }
        if (objs.length) {
          s.streak++;
          if (objs.length >= 2) ctx.achieve("dublet");
          if (s.streak >= 5) ctx.achieve("seria");
          if (objs.length >= 2) ctx.toast(`${objs.length} bile jednym uderzeniem`);
        } else {
          s.streak = 0;
          s.shots--;
          s.misses++;
        }
        render();
        if (E && !left.length) return nextTable();
        if (E && s.shots <= 0) return endRun();
        if (!left.length) {
          if (L.key !== "easy" && !s.scratches) ctx.achieve("czysto");
          if (L.key === "hard" && s.misses <= 3) ctx.achieve("zapas");
          return ctx.win(`Pudła: ${s.misses}, w zapasie ${s.shots}.`);
        }
        if (s.shots <= 0) ctx.lose("Koniec zapasu", `Na stole ${plural(left.length, "została", "zostały", "zostało")} ${left.length} ${plural(left.length, "bila", "bile", "bil")}.`);
      }

      // Bieg: nowy stół po wyczyszczeniu poprzedniego.
      function nextTable() {
        if (s.stage >= 5) ctx.achieve("maraton");
        s.stage++;
        Object.assign(cfg, stageCfg(s.stage));
        balls.splice(0, balls.length, ...rack(cfg.balls, cfg.eight));
        const before = s.shots;
        s.shots = Math.min(POOL_MAX, s.shots + cfg.refill);
        s.hints = Math.min(3, s.hints + cfg.hints);
        s.ang = Math.atan2(balls[1].y - balls[0].y, balls[1].x - balls[0].x);
        Sound.line();
        const add = s.shots - before;
        ctx.toast(`Stół ${s.stage}: ${cfg.balls} bil, +${add} ${plural(add, "pudło", "pudła", "pudeł")}`);
        render();
      }
      function endRun() {
        const done = s.stage - 1;
        ctx.over(s.score, runPoints(s.score), `Wyczyszczone stoły: ${done}, koniec na stole ${s.stage}.`);
      }

      const events = {
        hit: (a, b, rel) => {
          if (a.n === 0 || b.n === 0) s.cueHit = true;
          s.cushioned.delete(a.n); s.cushioned.delete(b.n);
          if (rel > 12) Sound.place(Math.min(9, 1 + Math.round(rel / 25)));
        },
        cushion: (b, v) => { if (b.n && s.cueHit) s.cushioned.add(b.n); if (v > 20) Sound.erase(); },
        pocket: (b) => {
          s.potted.push(b.n);
          if (b.n) {
            Sound.line();
            if (s.cushioned.has(b.n)) ctx.achieve("banda");
            s.flash.push({ x: b.px ?? b.x, y: b.py ?? b.y, t: 1, c: COLORS[b.n % 8 || 8] });
          }
        },
      };

      cv.loop((dt) => {
        if (s.rolling) {
          step(balls, dt, events);
          if (!moving(balls)) settle();
        }
        draw(dt);
      });

      // --- Rysowanie (we współrzędnych stołu) ---
      function draw(dt) {
        g.save();
        if (portrait) { g.translate(TH, 0); g.rotate(Math.PI / 2); }
        // rama i sukno
        const wood = g.createLinearGradient(0, 0, 0, TH);
        wood.addColorStop(0, "#7a4a24"); wood.addColorStop(0.5, "#5a3214"); wood.addColorStop(1, "#4a280f");
        g.fillStyle = wood;
        g.beginPath(); g.roundRect(0, 0, TW, TH, 7); g.fill();
        g.strokeStyle = "rgba(255,220,170,0.25)"; g.lineWidth = 0.6;
        g.beginPath(); g.roundRect(1.2, 1.2, TW - 2.4, TH - 2.4, 6); g.stroke();
        const felt = g.createRadialGradient(100, 55, 10, 100, 55, 110);
        felt.addColorStop(0, "#1f9a5e"); felt.addColorStop(1, "#0d5c35");
        g.fillStyle = felt;
        g.fillRect(X0 - 3, Y0 - 3, X1 - X0 + 6, Y1 - Y0 + 6);
        // bandy (gumowe krawędzie)
        g.fillStyle = "#0b4d2c";
        g.fillRect(X0 - 3, Y0 - 3, X1 - X0 + 6, 3); g.fillRect(X0 - 3, Y1, X1 - X0 + 6, 3);
        g.fillRect(X0 - 3, Y0 - 3, 3, Y1 - Y0 + 6); g.fillRect(X1, Y0 - 3, 3, Y1 - Y0 + 6);
        // diamenty na ramie
        g.fillStyle = "#f1e3c2";
        for (let k = 1; k < 8; k++) if (k !== 4) { const x = X0 + (k * (X1 - X0)) / 8; dia(x, 4.3); dia(x, TH - 4.3); }
        for (let k = 1; k < 4; k++) { const y = Y0 + (k * (Y1 - Y0)) / 4; dia(4.3, y); dia(TW - 4.3, y); }
        // linia startowa i punkt
        g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 0.4;
        g.beginPath(); g.moveTo(HEAD[0], Y0); g.lineTo(HEAD[0], Y1); g.stroke();
        g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(140, 55, 0.6, 0, 7); g.fill();
        // łuzy
        for (const [px, py, pr] of POCKETS) {
          g.fillStyle = "#2a1608"; g.beginPath(); g.arc(px, py, pr + 1.2, 0, 7); g.fill();
          const pg = g.createRadialGradient(px, py, 0, px, py, pr);
          pg.addColorStop(0, "#000"); pg.addColorStop(1, "#1a1a1a");
          g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, 7); g.fill();
        }
        for (const f of s.flash) {
          f.t -= dt * 1.5;
          g.strokeStyle = f.c; g.globalAlpha = Math.max(0, f.t); g.lineWidth = 0.8;
          g.beginPath(); g.arc(f.x, f.y, 5 + (1 - f.t) * 8, 0, 7); g.stroke();
          g.globalAlpha = 1;
        }
        s.flash = s.flash.filter((f) => f.t > 0);
        // cienie bil, potem bile
        for (const b of balls) if (!b.in) { g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(b.x + 0.6, b.y + 0.8, R, R * 0.9, 0, 0, 7); g.fill(); }
        if (still()) guide();
        for (const b of balls) if (!b.in) ball(b.n, b.x, b.y, R);
        if (still()) cue();
        if (s.strike > 0) s.strike -= dt;
        g.restore();
      }
      function dia(x, y) { g.beginPath(); g.moveTo(x, y - 1); g.lineTo(x + 0.7, y); g.lineTo(x, y + 1); g.lineTo(x - 0.7, y); g.fill(); }

      function ball(n, x, y, r) {
        const base = COLORS[n % 8 || (n === 8 ? 8 : 0)];
        const stripe = n > 8;
        g.save();
        g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
        g.fillStyle = stripe ? "#f5f0e6" : base;
        g.fillRect(x - r, y - r, r * 2, r * 2);
        if (stripe) { g.fillStyle = base; g.fillRect(x - r, y - r * 0.55, r * 2, r * 1.1); }
        if (n) { g.fillStyle = "#fbf8f0"; g.beginPath(); g.arc(x, y, r * 0.48, 0, 7); g.fill(); g.fillStyle = "#111"; g.font = `700 ${r * 0.62}px Geist, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, x, y + r * 0.04); }
        const sh = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
        sh.addColorStop(0, "rgba(255,255,255,0.55)"); sh.addColorStop(0.35, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(0,0,0,0.45)");
        g.fillStyle = sh; g.fillRect(x - r, y - r, r * 2, r * 2);
        g.restore();
      }

      // Linia celownika: do pierwszej bili albo bandy; na łatwym także dalszy tor bili.
      function guide() {
        const c = balls[0], dx = Math.cos(s.ang), dy = Math.sin(s.ang);
        let tHit = Infinity, target = null;
        for (const b of balls) {
          if (b.in || !b.n) continue;
          const fx = b.x - c.x, fy = b.y - c.y, proj = fx * dx + fy * dy;
          if (proj <= 0) continue;
          const perp2 = fx * fx + fy * fy - proj * proj;
          if (perp2 > 4 * R * R) continue;
          const t = proj - Math.sqrt(4 * R * R - perp2);
          if (t < tHit) { tHit = t; target = b; }
        }
        const wallT = Math.min(dx > 0 ? (X1 - R - c.x) / dx : dx < 0 ? (X0 + R - c.x) / dx : Infinity, dy > 0 ? (Y1 - R - c.y) / dy : dy < 0 ? (Y0 + R - c.y) / dy : Infinity);
        const t = Math.min(tHit, wallT);
        const gx = c.x + dx * t, gy = c.y + dy * t;
        const hl = s.hint > 0;
        if (hl) s.hint -= 1 / 60;
        g.setLineDash([1.6, 1.4]);
        g.strokeStyle = hl ? "rgba(255,214,90,0.95)" : "rgba(255,255,255,0.55)";
        g.lineWidth = 0.45;
        g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(gx, gy); g.stroke();
        g.setLineDash([]);
        g.strokeStyle = "rgba(255,255,255,0.7)";
        g.beginPath(); g.arc(gx, gy, R, 0, 7); g.stroke();
        if (target && cfg.guide) {
          // kierunek bili po zderzeniu: wzdłuż linii środków
          const nx = target.x - gx, ny = target.y - gy, nl = Math.hypot(nx, ny);
          const len = cfg.guide === 2 ? 40 : 14;
          g.strokeStyle = "rgba(255,230,150,0.75)";
          g.beginPath(); g.moveTo(target.x, target.y); g.lineTo(target.x + (nx / nl) * len, target.y + (ny / nl) * len); g.stroke();
          if (cfg.guide === 2) {
            // biała odbija się prostopadle
            const px = dx - (nx / nl) * (dx * nx + dy * ny) / nl, py = dy - (ny / nl) * (dx * nx + dy * ny) / nl, pl = Math.hypot(px, py);
            if (pl > 0.05) { g.strokeStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + (px / pl) * 18, gy + (py / pl) * 18); g.stroke(); }
          }
        }
      }

      function cue() {
        const c = balls[0], dx = Math.cos(s.ang), dy = Math.sin(s.ang);
        const back = 2.2 + R + s.power * 14;
        const x0 = c.x - dx * back, y0 = c.y - dy * back, x1 = x0 - dx * 95, y1 = y0 - dy * 95;
        g.lineCap = "round";
        g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x0 + 1, y0 + 1.5); g.lineTo(x1 + 1, y1 + 1.5); g.stroke();
        const cg = g.createLinearGradient(x0, y0, x1, y1);
        cg.addColorStop(0, "#e9e3d6"); cg.addColorStop(0.02, "#e9e3d6"); cg.addColorStop(0.021, "#d8b27a"); cg.addColorStop(0.6, "#b7834a"); cg.addColorStop(0.61, "#2b1a10"); cg.addColorStop(1, "#1a0f08");
        g.strokeStyle = cg; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
        g.lineWidth = 1.9;
        g.beginPath(); g.moveTo(x0 - dx * 60, y0 - dy * 60); g.lineTo(x1, y1); g.stroke();
        // pasek siły przy kiju
        if (s.aiming || s.power) {
          g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.roundRect(X0 + 2, Y1 + 4.2, 40, 2.4, 1.2); g.fill();
          g.fillStyle = s.power > 0.8 ? "#ff6b6b" : "#ffd43b"; g.beginPath(); g.roundRect(X0 + 2, Y1 + 4.2, 40 * s.power, 2.4, 1.2); g.fill();
        }
      }

      function render() {
        const left = balls.filter((b) => b.n && !b.in);
        leftEl.set(left.length, 1 - left.length / cfg.balls, s.streak > 1 ? `Seria: ${s.streak}` : cfg.eight ? "Ósemka na końcu" : "");
        if (E) {
          runEl.set("Wbite", s.score);
          runEl.set("Stół", s.stage);
          runEl.set("Pudła", Math.max(0, s.shots));
          runEl.set("Za bieg", `${runPoints(s.score)} pkt`);
        } else shotsEl.set(`${Math.max(0, s.shots)} z ${L.shots}`);
        hintBtn.disabled = !still() || !s.hints;
        hintBtn.textContent = cfg.hints < 99 ? `Podpowiedź (${s.hints})` : "Podpowiedź";
        rackEl.replaceChildren(...balls.filter((b) => b.n && b.in).map((b) => {
          const d = el("span", `bl-ball${b.n > 8 ? " stripe" : ""}`, b.n);
          d.style.setProperty("--bc", COLORS[b.n % 8 || 8]);
          return d;
        }));
        if (!rackEl.children.length) rackEl.append(el("p", "bl-empty", "Jeszcze nic."));
        ctx.progress(1 - left.length / cfg.balls);
      }
      render();
    },
  });
}
