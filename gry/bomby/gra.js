// Bomby: chodzisz po labiryncie, podkładasz bomby i rozsadzasz skrzynie oraz wrogów.
// Pod jedną skrzynią ukryte jest wyjście; wygraj, gdy pozbędziesz się wrogów i staniesz na wyjściu.
{
  const R = 0.3;            // promień gracza i wrogów
  const FUSE = [2.6, 2.4, 2.2];
  const FLAME = 0.42;       // ile sekundy pali się wybuch

  // 1 = mur, 2 = skrzynia, 0 = wolne pole.
  function makeMaze(cols, rows, crates) {
    const g = new Uint8Array(cols * rows);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) g[r * cols + c] = 1;
        else if (r % 2 === 0 && c % 2 === 0) g[r * cols + c] = 1;
      }
    }
    const free = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        if (g[i]) continue;
        // pola wokół startu zostają wolne, żeby gracz nie utknął
        if ((r === 1 && (c === 1 || c === 2)) || (r === 2 && c === 1)) continue;
        free.push(i);
      }
    }
    for (const i of shuffle(free)) if (rnd(100) < crates) g[i] = 2;
    return g;
  }

  // Pola wolne (bez murów i skrzyń) — pojedynczy spójny korytarz labiryntu.
  function freeCells(g) {
    const out = [];
    for (let i = 0; i < g.length; i++) if (!g[i]) out.push(i);
    return out;
  }

  // Zasięg wybuchu: leci w cztery strony, mur go zatrzymuje, skrzynia ogarnia i sama płonie.
  function blast(g, cols, rows, r, c, range) {
    const out = [[r, c]];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (let k = 1; k <= range; k++) {
        const rr = r + dr * k, cc = c + dc * k;
        if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) break;
        const v = g[rr * cols + cc];
        if (v === 1) break;
        out.push([rr, cc]);
        if (v === 2) break;
      }
    }
    return out;
  }

  // Czy kwadrat o środku (x, y) i promieniu `rad` wchodzi na mur albo skrzynię.
  function solid(g, cols, rows, x, y, rad) {
    const c0 = Math.floor(x - rad), c1 = Math.floor(x + rad);
    const r0 = Math.floor(y - rad), r1 = Math.floor(y + rad);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r < 0 || c < 0 || r >= rows || c >= cols) return true;
        const v = g[r * cols + c];
        if (v === 1 || v === 2) return true;
      }
    }
    return false;
  }

  // Ruch po jednej osi z drobnym krokiem, żeby dało się ślizgać po ścianie.
  function slide(g, cols, rows, p, dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.08));
    for (let k = 0; k < steps; k++) {
      const sx = dx / steps, sy = dy / steps;
      if (!solid(g, cols, rows, p.x + sx, p.y, R)) p.x += sx; else break;
    }
    for (let k = 0; k < steps; k++) {
      const sx = dx / steps, sy = dy / steps;
      if (!solid(g, cols, rows, p.x, p.y + sy, R)) p.y += sy; else break;
    }
  }

  // Kierunek wroga: najpierw ten, który zmniejsza odległość do gracza, czasem losowy.
  function foeStep(g, cols, rows, e, tx, ty, random) {
    const opts = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!solid(g, cols, rows, e.x + dx * 0.55, e.y + dy * 0.55, R)) opts.push([dx, dy]);
    }
    if (!opts.length) return [0, 0];
    if (random < 0.3) return pick(opts);
    opts.sort((a, b) => {
      const da = Math.abs(e.x + a[0] * 2 - tx) + Math.abs(e.y + a[1] * 2 - ty);
      const db = Math.abs(e.x + b[0] * 2 - tx) + Math.abs(e.y + b[1] * 2 - ty);
      return da - db;
    });
    return opts[0];
  }

  if (typeof module !== "undefined") module.exports = { makeMaze, freeCells, blast, solid, slide, foeStep, R };

  if (typeof registerGame !== "undefined") registerGame({
    id: "bomby",
    cat: "akcja",
    name: "Bomby",
    author: "DeepSeek V4.1 Flash",
    desc: "Podkładaj bomby w labiryncie, rozsadzaj skrzynie, wytrop wszystkich wrogów i znajdź wyjście.",
    color: "#8b1e3f",
    ink: "#ffffff",
    glyph: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, cols: 11, rows: 9, crates: 62, foes: 2, lives: 3, fuse: 2.6, speed: 1.9 },
      { key: "medium", name: "Średni", points: 25, cols: 13, rows: 11, crates: 72, foes: 3, lives: 2, fuse: 2.4, speed: 2.4 },
      { key: "hard", name: "Trudny", points: 50, cols: 13, rows: 11, crates: 82, foes: 4, lives: 2, fuse: 2.2, speed: 2.9 },
    ],
    rules: [
      "Chodzisz po labiryncie strzałkami lub WASD, na telefonie przyciskami w panelu. Bomby podkładasz spacją albo przyciskiem.",
      "Wybuch niszczy skrzynie i wrogów, ale zabija także ciebie, gdy nie zdążysz uciec.",
      "Pod jedną ze skrzyń ukryte jest wyjście. Rozsadź tę skrzynię i pozbądź się wszystkich wrogów, a potem wejdź na wyjście.",
      "Ze zniszczonych skrzyń wypadają ulepszenia: dodatkowa bomba albo dłuższy zasięg wybuchu.",
      "Utrata życia odsyła cię na start poziomu. Po wyczerpaniu żyć poziom przepada.",
    ],
    achievements: [
      { id: "bez-szkody", name: "Bez szkody", desc: "Wygraj dowolny poziom bez utraty życia.", points: 10 },
      { id: "szybkie-sprzatanie", name: "Szybkie sprzątanie", desc: "Wygraj poziom łatwy w mniej niż 60 sekund.", points: 10 },
      { id: "podwojny-wybuch", name: "Podwójny wybuch", desc: "Zniszcz dwóch wrogów jednym wybuchem.", points: 25 },
      { id: "mistrz-korytarzy", name: "Mistrz korytarzy", desc: "Wygraj poziom trudny bez utraty życia.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cols = L.cols, rows = L.rows, TS = 14;
      const W = cols * TS, H = rows * TS;
      const cv = canvasGame(board, ctx, W, H, { max: 92, cls: "arcade" });
      const g = cv.g;
      const grid = makeMaze(cols, rows, L.crates);
      const crates = crateCells(grid);
      // Bez skrzyń nie ma czego rozsadzać, więc wyjście stawiamy na środku korytarza.
      const exitIdx = crates.length ? pick(crates) : freeCells(grid)[0] ?? 1 * cols + 1;
      grid[exitIdx] = 2;
      const exitC = exitIdx % cols, exitR = (exitIdx / cols) | 0;
      const P = { x: 1.5, y: 1.5 };
      const S = {
        lives: L.lives, bombs: 1, range: 2, placed: [], flames: [], items: [], sparks: [],
        foes: [], found: false, killed: 0, hurtT: 0, cause: "", done: false,
      };
      for (let k = 0; k < L.foes; k++) S.foes.push(spawnFoe(k));

      const progEl = statBlock(ctx, "Postęp", { meter: true });
      const lifeEl = statBlock(ctx, "Życia", { small: true });
      legend();
      const keys = heldKeys(ctx, (key) => { if (key === " ") drop(); });
      keys.onTap = (key) => { if (key === " ") drop(); };
      touchPad(ctx, keys, [
        ["arrowleft", "W lewo", "i-left"],
        ["arrowup", "W górę", "i-up"],
        ["arrowdown", "W dół", "i-down"],
        ["arrowright", "W prawo", "i-right"],
        [" ", "Postaw bombę"],
      ]);

      function crateCells(grid) {
        const out = [];
        for (let i = 0; i < grid.length; i++) if (grid[i] === 2) out.push(i);
        return out;
      }

      // Legenda kolorów z planszy; bez niej trudno rozpoznać wyjście wśród skrzyń.
      function legend() {
        const list = el("ul", "bo-legend");
        for (const [cls, text] of [["bo-sw bo-sw-crate", "skrzynia"], ["bo-sw bo-sw-exit", "wyjście"], ["bo-sw bo-sw-foe", "wróg"], ["bo-sw bo-sw-item", "ulepszenie"]]) {
          const li = el("li", "");
          li.append(el("span", cls), el("span", "", text));
          list.append(li);
        }
        ctx.panel.append(panelBlock("Oznaczenia", list));
      }

      function refresh() {
        progEl.set(`${S.killed} z ${L.foes}`, (S.killed + (S.found ? 1 : 0)) / (L.foes + 1), `Wyjście: ${S.found ? "odkryte" : "ukryte"}`);
        lifeEl.set(`${S.lives} z ${L.lives}`, null, `${S.bombs} ${plural(S.bombs, "bomba", "bomby", "bomb")} · zasięg ${S.range}`);
        ctx.progress((S.killed + (S.found ? 1 : 0)) / (L.foes + 1));
      }

      // Wrogowie ruszają z odległych wolnych pól, żeby nie stać na graczu.
      function spawnFoe(k) {
        const cells = freeCells(grid).filter((i) => i !== exitIdx && grid[i] === 0);
        const i = cells[cells.length - 1 - ((k * 7 + rnd(5)) % cells.length)] ?? 0;
        return { x: (i % cols) + 0.5, y: ((i / cols) | 0) + 0.5, dx: 0, dy: 0, timer: 0.4 * k };
      }

      function cellOf(o) { return ((o.y | 0) * cols) + (o.x | 0); }
      function tile(x, y) { return grid[(y | 0) * cols + (x | 0)]; }

      function drop() {
        if (ctx.done || S.done || S.hurtT > 0) return;
        const i = cellOf(P);
        if (S.placed.length >= S.bombs || S.placed.some((b) => b.i === i)) return;
        S.placed.push({ i, r: (i / cols) | 0, c: i % cols, t: L.fuse, range: S.range });
        Sound.place(2);
      }

      function boom(b) {
        const cells = blast(grid, cols, rows, b.r, b.c, b.range);
        let hits = 0;
        for (const [r, c] of cells) {
          const i = r * cols + c;
          if (grid[i] === 2) {
            grid[i] = 0;
            if (i === exitIdx) { S.found = true; ctx.toast("Odsłonięto wyjście"); Sound.line(); }
            else if (rnd(100) < 34) S.items.push({ r, c, kind: rnd(2) ? "range" : "bomb" });
          }
        }
        for (const f of S.foes.slice()) {
          if (cells.some(([r, c]) => (f.y | 0) === r && (f.x | 0) === c)) {
            S.foes.splice(S.foes.indexOf(f), 1);
            S.killed += 1;
            hits += 1;
            puff(f.x, f.y);
          }
        }
        if (hits >= 2) ctx.achieve("podwojny-wybuch");
        Sound.error();
        S.flames.push({ cells, t: FLAME });
        refresh();
      }

      function hit(cause) {
        if (S.hurtT > 0 || ctx.done || S.done) return;
        S.lives -= 1;
        S.hurtT = 1.1;
        S.cause = cause;
        Sound.error();
        refresh();
        ctx.toast(cause);
      }

      function respawn() {
        P.x = 1.5; P.y = 1.5;
        S.placed.length = 0;
        S.flames.length = 0;
        S.foes.forEach((f, k) => {
          const n = spawnFoe(k);
          f.x = n.x; f.y = n.y; f.dx = 0; f.dy = 0; f.timer = 0.4;
        });
      }

      function puff(x, y) {
        for (let k = 0; k < 14; k++) {
          const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3;
          S.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, c: pick(["#ffd43b", "#ff922b", "#fa5252"]) });
        }
      }

      cv.loop((dt) => {
        if (!ctx.done && !S.done) {
          if (S.hurtT > 0) {
            S.hurtT -= dt;
            if (S.hurtT <= 0) {
              if (S.lives <= 0) { S.done = true; ctx.lose("Koniec życia", `${S.cause}. Wrogowie: ${S.killed} z ${L.foes}.`); }
              else respawn();
            }
          } else {
            const dx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
            const dy = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
            if (dx || dy) {
              const len = Math.hypot(dx, dy);
              slide(grid, cols, rows, P, (dx / len) * 4 * dt, (dy / len) * 4 * dt);
            }
            // bomby
            for (const b of S.placed) b.t -= dt;
            for (const b of S.placed.slice()) {
              if (b.t > 0) continue;
              S.placed.splice(S.placed.indexOf(b), 1);
              boom(b);
            }
            // wybuchy
            for (const f of S.flames) f.t -= dt;
            S.flames = S.flames.filter((f) => f.t > 0);
            // przedmioty
            for (const it of S.items.slice()) {
              if (Math.abs(P.x - (it.c + 0.5)) < 0.55 && Math.abs(P.y - (it.r + 0.5)) < 0.55) {
                if (it.kind === "bomb") S.bombs += 1; else S.range += 1;
                S.items.splice(S.items.indexOf(it), 1);
                refresh();
                Sound.place(3);
              }
            }
            // wrogowie
            for (const f of S.foes) {
              if (f.dx === 0 && f.dy === 0) { const s = foeStep(grid, cols, rows, f, P.x, P.y, Math.random()); f.dx = s[0]; f.dy = s[1]; }
              f.timer -= dt;
              if (f.timer <= 0) {
                f.timer = 0.35 + Math.random() * 0.5;
                const s = foeStep(grid, cols, rows, f, P.x, P.y, Math.random());
                f.dx = s[0]; f.dy = s[1];
              }
              const before = [f.x, f.y];
              slide(grid, cols, rows, f, f.dx * L.speed * dt, f.dy * L.speed * dt);
              // Wróg, który nie drgnął, wybiera nowy kierunek od razu.
              if (Math.abs(f.x - before[0]) < 1e-6 && Math.abs(f.y - before[1]) < 1e-6) { f.dx = 0; f.dy = 0; f.timer = 0; }
            }
            // zderzenia
            if (S.flames.some((f) => f.cells.some(([r, c]) => (P.y | 0) === r && (P.x | 0) === c))) hit("Wybuch cię dopadł");
            else if (S.foes.some((f) => Math.hypot(f.x - P.x, f.y - P.y) < 0.62)) hit("Wróg cię dopadł");
            // wygrana
            if (S.found && S.foes.length === 0 && (P.x | 0) === exitC && (P.y | 0) === exitR) {
              S.done = true;
              refresh();
              if (S.lives === L.lives) ctx.achieve("bez-szkody");
              if (L.key === "easy" && ctx.time < 60) ctx.achieve("szybkie-sprzatanie");
              if (L.key === "hard" && S.lives === L.lives) ctx.achieve("mistrz-korytarzy");
              ctx.win(`Wrogowie: ${L.foes}, życia: ${S.lives} z ${L.lives}.`);
            }
          }
          // iskry
          for (const s of S.sparks) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
          if (S.sparks.length) S.sparks = S.sparks.filter((s) => s.life > 0);
        }
        draw();
      });

      function block(x, y, w, h, fill, edge) {
        g.fillStyle = fill;
        g.fillRect(x, y, w, h);
        if (edge) { g.strokeStyle = edge; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
      }

      function draw() {
        // podłoga: chłodna szachownica, po której czytelnie biegną korytarze
        g.fillStyle = "#101427";
        g.fillRect(0, 0, W, H);
        g.fillStyle = "rgba(255,255,255,0.022)";
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) if ((r + c) % 2) g.fillRect(c * TS, r * TS, TS, TS);
        }
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c, x = c * TS, y = r * TS;
            if (grid[i] === 1) {
              block(x, y, TS, TS, "#3b4256", "#242a3a");
              g.fillStyle = "rgba(255,255,255,0.10)";
              g.fillRect(x + 2, y + 2, TS - 4, 3);
              g.fillStyle = "rgba(0,0,0,0.22)";
              g.fillRect(x + 2, y + TS - 5, TS - 4, 3);
            } else if (grid[i] === 2) {
              block(x + 1, y + 1, TS - 2, TS - 2, "#a9662f", "#6d3f18");
              g.fillStyle = "rgba(255,255,255,0.16)";
              g.fillRect(x + 2, y + 2, TS - 4, 2.5);
              g.strokeStyle = "#6d3f18";
              g.lineWidth = 1;
              g.beginPath();
              g.moveTo(x + 3, y + 3); g.lineTo(x + TS - 3, y + TS - 3);
              g.moveTo(x + TS - 3, y + 3); g.lineTo(x + 3, y + TS - 3);
              g.stroke();
              g.fillStyle = "rgba(0,0,0,0.18)";
              g.fillRect(x + 1, y + TS - 3, TS - 2, 2);
            } else if (i === exitIdx && S.found) {
              const cx = x + TS / 2, cy = y + TS / 2;
              const glow = g.createRadialGradient(cx, cy, 1, cx, cy, TS * 0.7);
              glow.addColorStop(0, "rgba(80,220,180,0.5)");
              glow.addColorStop(1, "rgba(80,220,180,0)");
              g.fillStyle = glow;
              g.fillRect(x - 2, y - 2, TS + 4, TS + 4);
              g.strokeStyle = "#4ade80";
              g.lineWidth = 1.4;
              g.beginPath();
              g.moveTo(cx, y + 3); g.lineTo(x + TS - 3, cy);
              g.lineTo(cx, y + TS - 3); g.lineTo(x + 3, cy);
              g.closePath();
              g.stroke();
            }
          }
        }
        for (const it of S.items) {
          const x = it.c * TS + TS / 2, y = it.r * TS + TS / 2;
          g.fillStyle = "rgba(255,255,255,0.14)";
          g.beginPath(); g.arc(x, y, TS * 0.42, 0, Math.PI * 2); g.fill();
          if (it.kind === "bomb") {
            const grd = g.createRadialGradient(x - 2, y - 2, 0.5, x, y, TS * 0.24);
            grd.addColorStop(0, "#fff3bf");
            grd.addColorStop(1, "#f59f00");
            g.fillStyle = grd;
            g.beginPath(); g.arc(x, y, TS * 0.22, 0, Math.PI * 2); g.fill();
            g.strokeStyle = "#8a5200"; g.lineWidth = 1; g.stroke();
          } else {
            g.strokeStyle = "#74c0fc"; g.lineWidth = 2; g.lineCap = "round";
            g.beginPath();
            g.moveTo(x - 3, y); g.lineTo(x + 3, y);
            g.moveTo(x + 3, y); g.lineTo(x + 1, y - 2);
            g.moveTo(x + 3, y); g.lineTo(x + 1, y + 2);
            g.stroke();
          }
        }
        for (const b of S.placed) {
          const x = b.c * TS + TS / 2, y = b.r * TS + TS / 2;
          const k = 1 + Math.sin(b.t * 12) * 0.08;
          g.save();
          g.shadowColor = "rgba(255,120,0,0.5)";
          g.shadowBlur = 6;
          g.fillStyle = "#12151f";
          g.beginPath(); g.arc(x, y, TS * 0.32 * k, 0, Math.PI * 2); g.fill();
          g.restore();
          g.strokeStyle = "#6b7280"; g.lineWidth = 1; g.stroke();
          g.fillStyle = "rgba(255,255,255,0.35)";
          g.beginPath(); g.arc(x - 2, y - 2, 1.6, 0, Math.PI * 2); g.fill();
          g.strokeStyle = "#ffb703"; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x, y - TS * 0.3 * k); g.lineTo(x + 2, y - TS * 0.5); g.stroke();
        }
        for (const f of S.flames) {
          const a = Math.min(1, f.t / FLAME);
          for (const [r, c] of f.cells) {
            const x = c * TS + TS / 2, y = r * TS + TS / 2;
            const rad = TS * 0.5 * (0.7 + a * 0.35);
            const grd = g.createRadialGradient(x, y, 1, x, y, rad);
            grd.addColorStop(0, "rgba(255,247,210,0.95)");
            grd.addColorStop(0.45, "rgba(255,183,3,0.85)");
            grd.addColorStop(1, "rgba(225,70,20,0)");
            g.fillStyle = grd;
            g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
          }
        }
        for (const f of S.foes) blob(f.x * TS, f.y * TS, TS * R * 1.25);
        if (!(S.hurtT > 0 && ((S.hurtT * 10) | 0) % 2)) hero(P.x * TS, P.y * TS, TS * R * 1.2);
        for (const s of S.sparks) {
          g.globalAlpha = Math.max(0, s.life);
          g.fillStyle = s.c;
          g.beginPath(); g.arc(s.x * TS, s.y * TS, 1.6, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 1;
        }
        // winieta: światło w środku labiryntu, cień przy krawędziach
        const vig = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.64);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.42)");
        g.fillStyle = vig;
        g.fillRect(0, 0, W, H);
      }

      function hero(x, y, rad) {
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.beginPath(); g.ellipse(x, y + rad * 0.8, rad * 0.95, rad * 0.45, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#f1f3f5";
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#495057"; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = "#2f6fed";
        g.beginPath(); g.arc(x, y - rad * 0.15, rad, Math.PI, 0); g.fill();
        g.fillStyle = "#1c2333";
        g.fillRect(x - rad * 0.75, y - rad * 0.2, rad * 1.5, rad * 0.42);
        g.fillStyle = "#9be7ff";
        g.fillRect(x - rad * 0.55, y - rad * 0.12, rad * 1.1, rad * 0.2);
      }

      function blob(x, y, rad) {
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.beginPath(); g.ellipse(x, y + rad * 0.85, rad * 0.9, rad * 0.42, 0, 0, Math.PI * 2); g.fill();
        const body = g.createRadialGradient(x - rad * 0.3, y - rad * 0.38, rad * 0.15, x, y, rad * 1.15);
        body.addColorStop(0, "#d9a7ff");
        body.addColorStop(0.55, "#b23cff");
        body.addColorStop(1, "#66199f");
        g.save();
        g.shadowColor = "rgba(178,60,255,0.55)";
        g.shadowBlur = 8;
        g.fillStyle = body;
        g.beginPath(); g.ellipse(x, y, rad, rad * 1.05, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        g.strokeStyle = "#5b1a8f"; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x - rad * 0.34, y - rad * 0.15, rad * 0.26, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + rad * 0.34, y - rad * 0.15, rad * 0.26, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2b0b45";
        g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.12, rad * 0.12, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + rad * 0.38, y - rad * 0.12, rad * 0.12, 0, Math.PI * 2); g.fill();
      }

      refresh();
      ctx.progress(0);
    },
  });
}
