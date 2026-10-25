// Krypta: labirynt w widoku z pierwszej osoby (raycasting jak w dawnych strzelankach), tekstury generowane w kodzie.
// Relikwie, klucz do kraty, upiory ścigające gracza i latarnia z błyskiem, który je odpędza.
{
  // --- Logika bez DOM: plansza (2n+1) × (2n+1), 0 podłoga, 1 ściana, 2 krata ---
  function maze(n, loops) {
    const S = 2 * n + 1;
    const grid = Array.from({ length: S }, () => new Array(S).fill(1));
    const stack = [[0, 0]], seen = new Set(["0,0"]);
    grid[1][1] = 0;
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !seen.has(`${x},${y}`));
      if (!nb.length) { stack.pop(); continue; }
      const [x, y, dx, dy] = pick(nb);
      seen.add(`${x},${y}`);
      grid[2 * cy + 1 + dy][2 * cx + 1 + dx] = 0;
      grid[2 * y + 1][2 * x + 1] = 0;
      stack.push([x, y]);
    }
    // pętle: dodatkowe przejścia, żeby dało się uciec upiorom
    for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
      if (grid[y][x] !== 1 || (x % 2) === (y % 2)) continue;
      const horiz = grid[y][x - 1] === 0 && grid[y][x + 1] === 0, vert = grid[y - 1][x] === 0 && grid[y + 1][x] === 0;
      if ((horiz || vert) && Math.random() < loops) grid[y][x] = 0;
    }
    return grid;
  }
  // Odległości BFS od punktu; `block` to komórki traktowane jak ściana.
  function bfs(grid, sx, sy, block = null) {
    const S = grid.length, dist = Array.from({ length: S }, () => new Array(S).fill(-1)), par = {};
    dist[sy][sx] = 0;
    const q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (grid[ny]?.[nx] !== 0 || dist[ny][nx] >= 0 || (block && block(nx, ny))) continue;
        dist[ny][nx] = dist[y][x] + 1;
        par[`${nx},${ny}`] = [x, y];
        q.push([nx, ny]);
      }
    }
    return { dist, par };
  }

  function generate({ n, loops, relics, gate }) {
    for (let tries = 0; tries < 200; tries++) {
      const grid = maze(n, loops), S = grid.length;
      const start = [1, 1];
      const { dist, par } = bfs(grid, 1, 1);
      const floors = [];
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (!grid[y][x]) floors.push([x, y]);
      const exit = floors.reduce((a, b) => (dist[b[1]][b[0]] > dist[a[1]][a[0]] ? b : a));
      let gateCell = null, key = null;
      if (gate) {
        const path = [];
        for (let c = exit; c; c = par[`${c[0]},${c[1]}`]) path.unshift(c);
        const cand = shuffle(path.slice(Math.floor(path.length * 0.4), Math.floor(path.length * 0.7)));
        for (const [x, y] of cand) {
          if ((x % 2) === (y % 2)) continue; // tylko przejścia między komnatami
          const cut = bfs(grid, 1, 1, (a, b) => a === x && b === y);
          if (cut.dist[exit[1]][exit[0]] >= 0) continue; // krata musi odcinać wyjście
          const before = floors.filter(([a, b]) => cut.dist[b][a] > 2).sort((p, q) => cut.dist[q[1]][q[0]] - cut.dist[p[1]][p[0]]);
          if (before.length < 4) continue;
          gateCell = [x, y];
          key = pick(before.slice(0, Math.max(1, Math.floor(before.length * 0.3))));
          break;
        }
        if (!gateCell) continue;
      }
      // relikwie w ślepych zaułkach, rozrzucone daleko od siebie
      const deadEnds = floors.filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => grid[y + dy][x + dx]).length === 3);
      const taken = [start, exit, ...(key ? [key] : [])];
      const pool = shuffle(deadEnds.filter((c) => !taken.some((t) => t[0] === c[0] && t[1] === c[1]) && dist[c[1]][c[0]] > 3));
      const chosen = [];
      for (const c of pool) {
        if (chosen.length >= relics) break;
        if (chosen.every((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) > 4)) chosen.push(c);
      }
      if (chosen.length < relics) continue;
      if (gateCell) grid[gateCell[1]][gateCell[0]] = 2;
      return { grid, start, exit, relics: chosen, key, gate: gateCell };
    }
    return null;
  }

  // Czy krypta jest do przejścia: klucz osiągalny przy zamkniętej kracie, potem wszystko.
  function solvable(c) {
    const open = c.grid.map((r) => r.map((v) => (v === 2 ? 1 : v)));
    const d1 = bfs(open, ...c.start).dist;
    if (c.key && d1[c.key[1]][c.key[0]] < 0) return false;
    const all = c.grid.map((r) => r.map((v) => (v === 2 ? 0 : v)));
    const d2 = bfs(all, ...c.start).dist;
    return [...c.relics, c.exit].every(([x, y]) => d2[y][x] >= 0);
  }

  // Tryb bez końca: parametry piętra d (1, 2, ...). Piętro 1 jest lżejsze od łatwego poziomu,
  // około 5. piętra upiory są jak na średnim, około 7. jak na trudnym; dalej rośnie do górnych granic.
  function floorParams(d) {
    const k = d - 1;
    return {
      n: Math.min(12, 5 + Math.floor(d / 2)),
      loops: Math.min(0.16, 0.1 + 0.005 * k),
      relics: Math.min(5, 2 + Math.floor(k / 3)),
      gate: d >= 3,
      ghosts: Math.min(7, 1 + Math.floor((k * 2) / 3)),
      ghostSpeed: Math.min(2.1, 0.95 + 0.1 * k),
      chase: Math.min(14, 6 + k),
      regen: Math.max(4, 7 - 0.4 * k),
    };
  }
  // Punkty za bieg z liczby ukończonych pięter. Piętra 1–2 trwają tyle co łatwy poziom (≈ 20 pkt),
  // 3–4 tyle co średni (≈ 50), 5 tyle co trudny (≈ 100); dalej przyrosty rosną aż do limitu 300.
  function endlessPoints(cleared) {
    if (cleared <= 0) return 0;
    if (cleared === 1) return 5;
    const k = cleared - 2;
    return Math.min(300, Math.round(20 + 13 * k + 4.5 * k * k));
  }

  if (typeof module !== "undefined") module.exports = { generate, solvable, bfs, maze, floorParams, endlessPoints };

  if (typeof registerGame !== "undefined") registerGame({
    id: "krypta",
    cat: "przygodowe",
    name: "Krypta",
    author: "Claude Opus 5.5",
    desc: "Przemierzaj krypty w widoku z pierwszej osoby, zbieraj klucze i relikwie, odpędzaj upiory światłem.",
    color: "#7c5c2e",
    ink: "#ffffff",
    glyph: ["#####", "#...#", "#.#.#", "#.#.#", "#####"],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, n: 6, loops: 0.1, relics: 3, gate: false, ghosts: 1, ghostSpeed: 1.0, chase: 6, regen: 7, lives: 3 },
      { key: "medium", name: "Średni", points: 50, n: 8, loops: 0.12, relics: 4, gate: true, ghosts: 3, ghostSpeed: 1.3, chase: 9, regen: 5.5, lives: 3 },
      { key: "hard", name: "Trudny", points: 100, n: 10, loops: 0.14, relics: 5, gate: true, ghosts: 5, ghostSpeed: 1.6, chase: 12, regen: 4.5, lives: 3 },
    ],
    endless: { unit: ["piętro", "piętra", "pięter"], lives: 3, lifeEvery: 3 },
    rules: [
      "Chodzisz strzałkami albo WASD (A i D to krok w bok, strzałki w lewo i w prawo obracają). Myszą lub palcem przeciągnij po obrazie: w bok obraca, w górę idzie naprzód.",
      "Zbierz wszystkie złote relikwie. Wtedy portal na końcu krypty zaczyna świecić i można przez niego wyjść.",
      "Na średnim i trudnym poziomie drogę zamyka krata. Otwiera ją klucz ukryty w krypcie.",
      "Upiory krążą po korytarzach i gonią cię, gdy poczują. Dotyk upiora zabiera życie.",
      "Spacja albo przycisk Błysk wypuszcza błysk latarni: upiór przed tobą znika. Błysk zużywa światło, które powoli wraca.",
      "Mapa w rogu pokazuje odkryte korytarze. Po utracie trzech żyć wyprawa się kończy. W trybie ∞ portal prowadzi niżej: krypty rosną, upiorów przybywa, co trzy piętra wraca życie.",
    ],
    achievements: [
      { id: "relikwia", name: "Pierwsza relikwia", desc: "Podnieś pierwszą relikwię.", points: 10 },
      { id: "egzorcysta", name: "Egzorcysta", desc: "Odpędź błyskiem pięć upiorów w jednej wyprawie.", points: 25 },
      { id: "kartograf", name: "Kartograf", desc: "Odkryj 90% korytarzy krypty.", points: 25 },
      { id: "nietkniety", name: "Nietknięty", desc: "Wyjdź ze średniej lub trudnej krypty bez utraty życia.", points: 25 },
      { id: "w-ciemnosci", name: "W ciemności", desc: "Wyjdź ze średniej lub trudnej krypty bez użycia błysku.", points: 25 },
      { id: "sprint", name: "Sprint w mroku", desc: "Wyjdź z trudnej krypty w mniej niż 6 minut.", points: 50 },
      { id: "glebia", name: "Głębia", desc: "Dotrzyj do 6. piętra w trybie bez końca.", points: 25 },
      { id: "otchlan", name: "Otchłań", desc: "Dotrzyj do 12. piętra w trybie bez końca.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level, endless = !!L.endless;
      const W = 160, H = 90, RW = 320, RH = 180, TEX = 64;
      const cv = canvasGame(board, ctx, W, H, { max: 120, cls: "space" });
      const { g } = cv;
      // P: parametry bieżącej krypty (zwykły poziom albo piętro trybu bez końca)
      let depth = 1, P = endless ? { ...floorParams(1), lives: L.lives } : L;
      const s = {
        x: 0, y: 0, a: 0, lives: P.lives, energy: 100, inv: 0, hurt: 0, flash: 0,
        relics: 0, key: false, banished: 0, flashes: 0, bob: 0, seen: new Set(), msg: 0, ending: 0, fade: 0,
      };
      let crypt, grid, S, items, floors, startDist, ghosts;
      function buildFloor() {
        crypt = generate(P);
        grid = crypt.grid;
        S = grid.length;
        s.x = crypt.start[0] + 0.5; s.y = crypt.start[1] + 0.5;
        // pierwszy krok w stronę otwartego korytarza
        s.a = grid[1][2] === 0 ? 0 : Math.PI / 2;
        items = [
          ...crypt.relics.map(([x, y]) => ({ kind: "relic", x: x + 0.5, y: y + 0.5 })),
          ...(crypt.key ? [{ kind: "key", x: crypt.key[0] + 0.5, y: crypt.key[1] + 0.5 }] : []),
          { kind: "portal", x: crypt.exit[0] + 0.5, y: crypt.exit[1] + 0.5 },
        ];
        // ozdoby: świece i czaszki na podłodze
        floors = [];
        grid.forEach((row, y) => row.forEach((v, x) => !v && floors.push([x, y])));
        shuffle(floors.slice()).slice(0, Math.floor(floors.length / 9)).forEach(([x, y]) => {
          if (items.some((it) => Math.floor(it.x) === x && Math.floor(it.y) === y) || (x === 1 && y === 1)) return;
          items.push({ kind: Math.random() < 0.6 ? "candle" : "skull", x: x + 0.3 + Math.random() * 0.4, y: y + 0.3 + Math.random() * 0.4, deco: true });
        });
        startDist = bfs(grid.map((r) => r.map((v) => (v === 2 ? 0 : v))), 1, 1).dist;
        // małe krypty: gdy nic nie leży daleko, upiory startują w najdalszej trzeciej części
        const far = floors.filter(([x, y]) => startDist[y][x] > 14 && Math.hypot(x - 1, y - 1) > 6);
        const spawn = far.length ? far : floors.slice().sort((a, b) => startDist[b[1]][b[0]] - startDist[a[1]][a[0]]).slice(0, Math.max(1, Math.floor(floors.length / 3)));
        ghosts = Array.from({ length: P.ghosts }, () => {
          const [x, y] = pick(spawn);
          return { x: x + 0.5, y: y + 0.5, tx: x, ty: y, prev: null, away: 0, chasing: false, ph: Math.random() * 6 };
        });
      }
      buildFloor();
      const farCells = () => floors.filter(([x, y]) => Math.hypot(x + 0.5 - s.x, y + 0.5 - s.y) > 7);

      // --- Tekstury generowane w kodzie (64 × 64, piksele ABGR) ---
      const noise = () => Math.random();
      const rgb = (r, g2, b) => (255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g2 | 0)) << 8) | Math.max(0, Math.min(255, r | 0));
      function texture(fn) {
        const t = new Uint32Array(TEX * TEX);
        for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) t[y * TEX + x] = fn(x, y);
        return t;
      }
      const stone = texture((x, y) => {
        const row = Math.floor(y / 16), off = row % 2 ? 16 : 0;
        const mortar = y % 16 < 2 || (x + off) % 32 < 2;
        const k = 0.75 + noise() * 0.3 + (((x + off) >> 5) * 7 + row * 13) % 5 * 0.04;
        return mortar ? rgb(38, 34, 32) : rgb(112 * k, 100 * k, 88 * k);
      });
      const mossy = texture((x, y) => {
        const c = stone[y * TEX + x];
        const moss = y > 40 && noise() < (y - 40) / 40;
        return moss ? rgb(60 + noise() * 30, 90 + noise() * 30, 50) : c;
      });
      const bars = texture((x, y) => {
        const frame = x < 4 || x > 59 || y < 4 || y > 59;
        if (frame) return rgb(70, 60, 50);
        const bar = x % 12 < 4 || y % 22 < 3;
        if (bar) { const h = x % 12 === 1 ? 1.4 : 1; return rgb(150 * h, 120 * h, 50 * h); }
        return rgb(8, 6, 10);
      });
      const floorT = texture((x, y) => {
        const edge = x % 32 < 1 || y % 32 < 1;
        const k = 0.7 + noise() * 0.25 + ((x >> 5) + (y >> 5)) % 2 * 0.08;
        return edge ? rgb(30, 26, 24) : rgb(80 * k, 72 * k, 66 * k);
      });
      const ceilT = texture(() => { const k = 0.6 + noise() * 0.4; return rgb(38 * k, 34 * k, 40 * k); });

      // sprity rysowane na małych płótnach
      function sprite(draw) {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        draw(c.getContext("2d"));
        return c;
      }
      const SPR = {
        relic: sprite((q) => {
          const gr = q.createLinearGradient(20, 0, 44, 0);
          gr.addColorStop(0, "#a8740c"); gr.addColorStop(0.5, "#ffe08a"); gr.addColorStop(1, "#a8740c");
          q.fillStyle = gr;
          q.beginPath(); q.moveTo(20, 30); q.quadraticCurveTo(22, 46, 32, 47); q.quadraticCurveTo(42, 46, 44, 30); q.closePath(); q.fill();
          q.fillRect(30, 46, 4, 8); q.fillRect(24, 54, 16, 4);
          q.fillStyle = "#e03131"; q.beginPath(); q.arc(32, 38, 2.5, 0, 7); q.fill();
          q.fillStyle = "rgba(255,240,180,0.9)"; q.fillRect(24, 32, 2, 8);
        }),
        key: sprite((q) => {
          q.strokeStyle = "#ffd43b"; q.lineWidth = 4;
          q.beginPath(); q.arc(24, 40, 7, 0, 7); q.stroke();
          q.beginPath(); q.moveTo(31, 40); q.lineTo(50, 40); q.moveTo(46, 40); q.lineTo(46, 47); q.moveTo(41, 40); q.lineTo(41, 46); q.stroke();
        }),
        portal: sprite((q) => {
          const gr = q.createRadialGradient(32, 34, 2, 32, 34, 30);
          gr.addColorStop(0, "rgba(220,255,255,1)"); gr.addColorStop(0.35, "rgba(90,200,255,0.85)"); gr.addColorStop(0.7, "rgba(120,60,220,0.5)"); gr.addColorStop(1, "rgba(60,0,120,0)");
          q.fillStyle = gr; q.beginPath(); q.ellipse(32, 36, 20, 28, 0, 0, 7); q.fill();
        }),
        candle: sprite((q) => {
          q.fillStyle = "#e9e1cc"; q.fillRect(29, 46, 6, 14);
          const gr = q.createRadialGradient(32, 42, 0, 32, 42, 6);
          gr.addColorStop(0, "#fffbe0"); gr.addColorStop(0.5, "#ffb52e"); gr.addColorStop(1, "rgba(255,120,0,0)");
          q.fillStyle = gr; q.beginPath(); q.ellipse(32, 41, 3, 6, 0, 0, 7); q.fill();
        }),
        skull: sprite((q) => {
          q.fillStyle = "#d8d0bc"; q.beginPath(); q.arc(32, 52, 8, Math.PI, 0); q.fill(); q.fillRect(26, 52, 12, 6);
          q.fillStyle = "#1a1612"; q.beginPath(); q.arc(29, 52, 2, 0, 7); q.arc(35, 52, 2, 0, 7); q.fill();
        }),
        ghost: sprite((q) => {
          const gr = q.createLinearGradient(0, 6, 0, 60);
          gr.addColorStop(0, "rgba(230,240,255,0.95)"); gr.addColorStop(1, "rgba(150,180,255,0.05)");
          q.fillStyle = gr;
          q.beginPath(); q.moveTo(14, 60); q.lineTo(14, 26); q.quadraticCurveTo(14, 6, 32, 6); q.quadraticCurveTo(50, 6, 50, 26); q.lineTo(50, 60);
          for (let k = 0; k < 4; k++) q.quadraticCurveTo(46 - k * 9, 50, 41 - k * 9, 60);
          q.fill();
          q.fillStyle = "#14102a"; q.beginPath(); q.ellipse(25, 26, 4, 6, 0, 0, 7); q.ellipse(39, 26, 4, 6, 0, 0, 7); q.ellipse(32, 40, 4, 5, 0, 0, 7); q.fill();
        }),
      };
      const off = document.createElement("canvas");
      off.width = RW; off.height = RH;
      const og = off.getContext("2d");
      const img = og.createImageData(RW, RH);
      const buf = new Uint32Array(img.data.buffer);
      const zbuf = new Float32Array(RW);

      // --- Panel ---
      const keys = heldKeys(ctx, (k) => { if (k === " " || k === "f") flash(); if (k === "m") s.bigMap = !s.bigMap; });
      touchPad(ctx, keys, [["arrowleft", "Obróć w lewo", "i-ccw"], ["arrowup", "Naprzód", "i-up"], ["arrowdown", "Wstecz", "i-down"], ["arrowright", "Obróć w prawo", "i-cw"]]);
      const relicEl = statBlock(ctx, "Relikwie", { meter: true });
      const lifeEl = endless ? null : statBlock(ctx, "Życia", { small: true });
      const runEl = endless ? statsBlock(ctx, "Wyprawa", ["Piętro", "Życia", "Za bieg"]) : null;
      const flashBtn = button("Błysk", "btn wide", () => flash());
      const lightNote = el("p", "panel-note");
      ctx.panel.append(panelBlock("Latarnia", lightNote, flashBtn));

      // przeciąganie po obrazie: w bok obraca, w górę i w dół idzie
      let joy = null;
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); cv.cv.setPointerCapture?.(e.pointerId); joy = { o: cv.at(e), p: cv.at(e) }; });
      ctx.on(cv.cv, "pointermove", (e) => { if (joy) joy.p = cv.at(e); });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { joy = null; });

      const solid = (x, y) => {
        const v = grid[Math.floor(y)]?.[Math.floor(x)];
        return v === undefined || v === 1 || (v === 2 && !s.key);
      };
      function flash() {
        if (ctx.done || s.energy < 30) { if (!ctx.done) ctx.toast("Za mało światła"); return; }
        s.energy -= 30;
        s.flash = 0.35;
        s.flashes++;
        Sound.flag();
        for (const gh of ghosts) {
          if (gh.away > 0) continue;
          const dx = gh.x - s.x, dy = gh.y - s.y, d = Math.hypot(dx, dy);
          const diff = Math.abs(((Math.atan2(dy, dx) - s.a) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
          if (d < 5 && diff < 0.6 && clear(gh.x, gh.y)) {
            gh.away = 8;
            s.banished++;
            Sound.line();
            if (s.banished >= 5) ctx.achieve("egzorcysta");
          }
        }
        render();
      }
      // czy z gracza widać punkt (bez ścian po drodze)
      function clear(x, y) {
        const d = Math.hypot(x - s.x, y - s.y), n = Math.ceil(d * 6);
        for (let k = 1; k < n; k++) if (solid(s.x + ((x - s.x) * k) / n, s.y + ((y - s.y) * k) / n)) return false;
        return true;
      }

      // --- Pętla ---
      cv.loop((dt, now) => {
        if (!ctx.done && !s.ending) update(dt);
        else if (s.ending) { s.ending += dt; if (s.ending > 1.1 && !ctx.done) { if (endless) nextFloor(); else win(); } }
        renderScene(now / 1000);
        draw(dt, now / 1000);
      });

      function update(dt) {
        let turn = (keys.arrowleft ? -1 : 0) + (keys.arrowright ? 1 : 0);
        let fwd = (keys.arrowup || keys.w ? 1 : 0) - (keys.arrowdown || keys.s ? 1 : 0);
        let side = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        if (joy) {
          const dx = joy.p[0] - joy.o[0], dy = joy.p[1] - joy.o[1];
          turn += Math.max(-1.4, Math.min(1.4, dx / 14));
          fwd += Math.max(-1, Math.min(1, -dy / 12));
        }
        s.a += turn * 2.4 * dt;
        const sp = 2.6 * dt;
        const mx = (Math.cos(s.a) * fwd - Math.sin(s.a) * side) * sp, my = (Math.sin(s.a) * fwd + Math.cos(s.a) * side) * sp;
        const r = 0.22;
        if (!solid(s.x + mx + Math.sign(mx) * r, s.y)) s.x += mx;
        if (!solid(s.x, s.y + my + Math.sign(my) * r)) s.y += my;
        if (mx || my) s.bob += dt * 9;
        s.energy = Math.min(100, s.energy + P.regen * dt);
        s.inv = Math.max(0, s.inv - dt);
        // przedmioty pod nogami
        for (const it of items) {
          if (it.deco || it.gone || Math.hypot(it.x - s.x, it.y - s.y) > 0.5) continue;
          if (it.kind === "relic") {
            it.gone = true;
            s.relics++;
            Sound.line();
            ctx.achieve("relikwia");
            ctx.toast(s.relics === crypt.relics.length ? "Wszystkie relikwie. Portal się otworzył" : `Relikwia ${s.relics} z ${crypt.relics.length}`);
          } else if (it.kind === "key") {
            it.gone = true;
            s.key = true;
            Sound.line();
            ctx.toast("Klucz zdobyty: krata się otworzy");
          } else if (it.kind === "portal") {
            if (s.relics < crypt.relics.length) {
              if (!s.portalMsg || performance.now() - s.portalMsg > 3000) { ctx.toast(`Portal śpi. Brakuje relikwii: ${crypt.relics.length - s.relics}`); s.portalMsg = performance.now(); }
            } else { s.ending = 0.01; if (endless) Sound.line(); else Sound.win(); }
          }
        }
        moveGhosts(dt);
        render();
      }

      function moveGhosts(dt) {
        const pc = [Math.floor(s.x), Math.floor(s.y)];
        for (const gh of ghosts) {
          if (gh.away > 0) {
            gh.away -= dt;
            if (gh.away <= 0) { const [x, y] = pick(farCells().length ? farCells() : floors); Object.assign(gh, { x: x + 0.5, y: y + 0.5, tx: x, ty: y, prev: null }); }
            continue;
          }
          gh.ph += dt;
          const tx = gh.tx + 0.5, ty = gh.ty + 0.5, d = Math.hypot(tx - gh.x, ty - gh.y);
          const speed = P.ghostSpeed * (gh.chasing ? 1 : 0.7);
          if (d < 0.05) {
            // nowy cel: krok w stronę gracza (gdy go czuje) albo błądzenie
            const cur = [gh.tx, gh.ty];
            const route = bfs(grid.map((r) => r.map((v) => (v === 2 ? 0 : v))), pc[0], pc[1]).dist;
            const dd = route[cur[1]][cur[0]];
            gh.chasing = dd >= 0 && dd <= P.chase;
            const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cur[0] + dx, cur[1] + dy]).filter(([x, y]) => grid[y][x] !== 1);
            let next;
            const closer = opts.filter(([x, y]) => route[y][x] >= 0).sort((a, b) => route[a[1]][a[0]] - route[b[1]][b[0]]);
            if (gh.chasing && closer.length) next = closer[0];
            else {
              const fwd = opts.filter(([x, y]) => !gh.prev || x !== gh.prev[0] || y !== gh.prev[1]);
              next = pick(fwd.length ? fwd : opts);
            }
            gh.prev = cur;
            [gh.tx, gh.ty] = next;
          } else {
            const st = Math.min(d, speed * dt);
            gh.x += ((tx - gh.x) / d) * st;
            gh.y += ((ty - gh.y) / d) * st;
          }
          if (!s.inv && Math.hypot(gh.x - s.x, gh.y - s.y) < 0.45) {
            s.lives--;
            s.inv = 2;
            s.hurt = 0.6;
            Sound.error();
            gh.away = 4;
            if (s.lives <= 0) {
              if (endless) return ctx.over(depth, endlessPoints(depth - 1), `Osiągnięte piętro: ${depth}. Odpędzone upiory: ${s.banished}.`);
              return ctx.lose("Upiory cię dopadły", `Relikwie: ${s.relics} z ${crypt.relics.length}.`);
            }
            ctx.toast(s.lives === 1 ? "Ostatnie życie" : `Zostały ${s.lives} życia`);
          }
        }
      }

      // tryb bez końca: portal prowadzi na kolejne, trudniejsze piętro
      function nextFloor() {
        depth++;
        P = { ...floorParams(depth), lives: L.lives };
        buildFloor();
        Object.assign(s, { relics: 0, key: false, seen: new Set(), energy: 100, ending: 0, fade: 1, inv: 1.5, portalMsg: 0 });
        let msg = `Piętro ${depth}`;
        if ((depth - 1) % L.lifeEvery === 0 && s.lives < L.lives) { s.lives++; msg += ". Wraca jedno życie"; }
        if (depth >= 6) ctx.achieve("glebia");
        if (depth >= 12) ctx.achieve("otchlan");
        ctx.toast(msg);
        render();
      }

      function win() {
        const tough = L.key !== "easy";
        if (tough && s.lives === L.lives) ctx.achieve("nietkniety");
        if (tough && !s.flashes) ctx.achieve("w-ciemnosci");
        if (L.key === "hard" && ctx.time < 360) ctx.achieve("sprint");
        ctx.win(`Relikwie: ${s.relics}. Odpędzone upiory: ${s.banished}.`);
      }

      // --- Raycasting do bufora RW × RH ---
      function renderScene(t) {
        const dirX = Math.cos(s.a), dirY = Math.sin(s.a), plX = -dirY * 0.66, plY = dirX * 0.66;
        const lamp = (0.5 + 0.5 * (s.energy / 100)) * (0.94 + 0.06 * Math.sin(t * 13) * Math.sin(t * 7.3));
        const fall = 0.09 / (lamp * lamp);
        const half = RH / 2;
        // podłoga i sufit
        const rx0 = dirX - plX, ry0 = dirY - plY, rx1 = dirX + plX, ry1 = dirY + plY;
        for (let y = half + 1; y < RH; y++) {
          const rowD = half / (y - half);
          const lit = Math.min(1, lamp / (1 + rowD * rowD * fall));
          let fx = s.x + rowD * rx0, fy = s.y + rowD * ry0;
          const stx = (rowD * (rx1 - rx0)) / RW, sty = (rowD * (ry1 - ry0)) / RW;
          const yo = y * RW, yc = (RH - y - 1) * RW;
          for (let x = 0; x < RW; x++) {
            const tx = (fx * TEX) & 63, ty = (fy * TEX) & 63;
            buf[yo + x] = shade(floorT[ty * TEX + tx], lit);
            buf[yc + x] = shade(ceilT[ty * TEX + tx], lit * 0.8);
            fx += stx; fy += sty;
          }
        }
        // ściany
        for (let x = 0; x < RW; x++) {
          const cam = (2 * x) / RW - 1;
          const rdx = dirX + plX * cam, rdy = dirY + plY * cam;
          let mx = Math.floor(s.x), my = Math.floor(s.y);
          const ddx = Math.abs(1 / rdx), ddy = Math.abs(1 / rdy);
          const stepX = rdx < 0 ? -1 : 1, stepY = rdy < 0 ? -1 : 1;
          let sdx = rdx < 0 ? (s.x - mx) * ddx : (mx + 1 - s.x) * ddx;
          let sdy = rdy < 0 ? (s.y - my) * ddy : (my + 1 - s.y) * ddy;
          let side = 0, cell = 0;
          for (let k = 0; k < 64; k++) {
            if (sdx < sdy) { sdx += ddx; mx += stepX; side = 0; } else { sdy += ddy; my += stepY; side = 1; }
            cell = grid[my]?.[mx];
            if (cell === undefined) { cell = 1; break; }
            s.seen.add(my * S + mx);
            if (cell === 1 || (cell === 2 && !s.key)) break;
          }
          const perp = side ? sdy - ddy : sdx - ddx;
          zbuf[x] = perp;
          const lh = RH / perp;
          const y0 = Math.max(0, Math.floor(half - lh / 2)), y1 = Math.min(RH - 1, Math.floor(half + lh / 2));
          let wx = side ? s.x + perp * rdx : s.y + perp * rdy;
          wx -= Math.floor(wx);
          let tx = Math.floor(wx * TEX);
          if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) tx = TEX - tx - 1;
          const tex = cell === 2 ? bars : (mx * 7 + my * 13) % 5 === 0 ? mossy : stone;
          const lit = Math.min(1, lamp / (1 + perp * perp * fall)) * (side ? 0.78 : 1);
          const stepT = TEX / lh;
          let tpos = (y0 - half + lh / 2) * stepT;
          for (let y = y0; y <= y1; y++) {
            buf[y * RW + x] = shade(tex[(tpos & 63) * TEX + tx], lit);
            tpos += stepT;
          }
        }
        og.putImageData(img, 0, 0);
      }
      function shade(c, k) {
        const r = (c & 255) * k, gg = ((c >> 8) & 255) * k, b = ((c >> 16) & 255) * k;
        return (255 << 24) | (b << 16) | (gg << 8) | r;
      }

      // --- Obraz na płótnie: scena, sprity, latarnia, mapa ---
      function draw(dt, t) {
        g.imageSmoothingEnabled = false;
        g.drawImage(off, 0, 0, W, H);
        g.imageSmoothingEnabled = true;
        const dirX = Math.cos(s.a), dirY = Math.sin(s.a), plX = -dirY * 0.66, plY = dirX * 0.66;
        const inv = 1 / (plX * dirY - dirX * plY);
        const list = [
          ...items.filter((it) => !it.gone).map((it) => ({ ...it, spr: SPR[it.kind] })),
          ...ghosts.filter((gh) => gh.away <= 0).map((gh) => ({ kind: "ghost", x: gh.x, y: gh.y, spr: SPR.ghost, gh })),
        ].map((o) => ({ ...o, d: (o.x - s.x) ** 2 + (o.y - s.y) ** 2 })).sort((a, b) => b.d - a.d);
        const lamp = 0.5 + 0.5 * (s.energy / 100);
        for (const o of list) {
          const rx = o.x - s.x, ry = o.y - s.y;
          const tX = inv * (dirY * rx - dirX * ry), tY = inv * (-plY * rx + plX * ry);
          if (tY <= 0.15) continue;
          const sx = (RW / 2) * (1 + tX / tY);
          let size = Math.abs(RH / tY);
          let lift = 0;
          if (o.kind === "ghost") lift = Math.sin(o.gh.ph * 3) * size * 0.05 - size * 0.05;
          if (o.kind === "relic" || o.kind === "key") lift = Math.sin(t * 3 + o.x) * size * 0.04;
          const x0 = Math.floor(sx - size / 2), x1 = Math.floor(sx + size / 2);
          const yTop = RH / 2 - size / 2 + lift;
          const glow = o.kind === "ghost" || o.kind === "portal" || o.kind === "candle";
          let alpha = glow ? 1 : Math.min(1, lamp / (1 + o.d * 0.09 / (lamp * lamp)));
          if (o.kind === "ghost") alpha = 0.55 + 0.25 * Math.sin(o.gh.ph * 5);
          if (o.kind === "portal") alpha = s.relics >= crypt.relics.length ? 0.95 : 0.25 + 0.1 * Math.sin(t * 2);
          g.globalAlpha = alpha;
          const k = W / RW;
          for (let x = Math.max(0, x0); x < Math.min(RW, x1); x++) {
            if (tY >= zbuf[x]) continue;
            const texX = Math.floor(((x - x0) / size) * 64);
            g.drawImage(o.spr, texX, 0, 1, 64, x * k, yTop * k, k + 0.05, size * k);
          }
          g.globalAlpha = 1;
          // czerwone oczy upiora, gdy goni
          if (o.kind === "ghost" && o.gh.chasing && tY < 8 && tY < zbuf[Math.max(0, Math.min(RW - 1, Math.floor(sx)))]) {
            g.fillStyle = "rgba(255,40,40,0.9)";
            const e = size * k * 0.05;
            g.beginPath(); g.arc((sx - size * 0.11) * k, (yTop + size * 0.4) * k, e, 0, 7); g.arc((sx + size * 0.11) * k, (yTop + size * 0.4) * k, e, 0, 7); g.fill();
          }
        }
        hand(t);
        if (s.flash > 0) {
          s.flash -= dt;
          const gr = g.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, 90);
          gr.addColorStop(0, `rgba(255,250,220,${s.flash * 2.4})`); gr.addColorStop(1, `rgba(255,250,220,${s.flash * 0.6})`);
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
        }
        if (s.hurt > 0) { s.hurt -= dt; g.fillStyle = `rgba(200,0,30,${s.hurt * 0.6})`; g.fillRect(0, 0, W, H); }
        // winieta
        const vg = g.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, 95);
        vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        minimap();
        if (s.ending) { g.fillStyle = `rgba(200,240,255,${Math.min(1, s.ending)})`; g.fillRect(0, 0, W, H); }
        else if (s.fade > 0) { s.fade -= dt; g.fillStyle = `rgba(200,240,255,${Math.max(0, s.fade)})`; g.fillRect(0, 0, W, H); }
      }

      function hand(t) {
        const bx = 128 + Math.sin(s.bob) * 2, by = 82 + Math.abs(Math.cos(s.bob)) * 2;
        const lamp = 0.5 + 0.5 * (s.energy / 100);
        const glow = g.createRadialGradient(bx, by - 10, 1, bx, by - 10, 22 * lamp);
        glow.addColorStop(0, `rgba(255,210,120,${0.45 * lamp})`); glow.addColorStop(1, "rgba(255,180,80,0)");
        g.fillStyle = glow; g.beginPath(); g.arc(bx, by - 10, 22 * lamp, 0, 7); g.fill();
        // latarnia: rączka, szkło z płomieniem, oprawa
        g.strokeStyle = "#3a2c1c"; g.lineWidth = 1.2;
        g.beginPath(); g.arc(bx, by - 20, 4, Math.PI, 0); g.stroke();
        g.fillStyle = "#4a3824"; g.fillRect(bx - 6, by - 20, 12, 2.5); g.fillRect(bx - 6, by - 4, 12, 3);
        const fl = 0.8 + 0.2 * Math.sin(t * 17);
        const gl = g.createRadialGradient(bx, by - 11, 0.5, bx, by - 11, 6);
        gl.addColorStop(0, "#fffbe6"); gl.addColorStop(0.4, `rgba(255,190,70,${0.9 * lamp})`); gl.addColorStop(1, "rgba(255,140,40,0.25)");
        g.fillStyle = gl; g.fillRect(bx - 5, by - 17.5, 10, 13.5);
        g.fillStyle = "#fff6d5"; g.beginPath(); g.ellipse(bx, by - 10, 1.2 * fl, 2.6 * fl, 0, 0, 7); g.fill();
        g.strokeStyle = "#2c2116"; g.lineWidth = 0.8;
        for (const x of [bx - 5, bx, bx + 5]) { g.beginPath(); g.moveTo(x, by - 17.5); g.lineTo(x, by - 4); g.stroke(); }
        // rękawica trzymająca kabłąk
        g.fillStyle = "#3b2a1d";
        g.beginPath(); g.roundRect(bx - 3, by - 27, 7, 6, 2); g.fill();
        // rękaw: od dłoni do prawego dolnego rogu
        const sl = g.createLinearGradient(bx, by - 24, W, H);
        sl.addColorStop(0, "#4e3826"); sl.addColorStop(1, "#22180f");
        g.fillStyle = sl;
        g.beginPath(); g.moveTo(bx + 2, by - 26); g.lineTo(bx + 5, by - 21); g.lineTo(W + 4, H + 6); g.lineTo(W + 4, H - 14); g.fill();
      }

      function minimap() {
        const big = s.bigMap, cell = big ? 3.4 : 1.6, R0 = big ? 12 : 7;
        const cx = Math.floor(s.x), cy = Math.floor(s.y);
        const ox = big ? W / 2 - (S * cell) / 2 : W - (2 * R0 + 1) * cell - 3, oy = big ? H / 2 - (S * cell) / 2 : 3;
        const x0 = big ? 0 : cx - R0, y0 = big ? 0 : cy - R0, n = big ? S : 2 * R0 + 1;
        g.fillStyle = "rgba(10,8,14,0.6)";
        g.fillRect(ox - 1, oy - 1, n * cell + 2, n * cell + 2);
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          const gx = x0 + x, gy = y0 + y;
          if (!s.seen.has(gy * S + gx)) continue;
          const v = grid[gy]?.[gx];
          if (v === undefined) continue;
          g.fillStyle = v === 1 ? "rgba(150,130,110,0.85)" : v === 2 ? (s.key ? "rgba(90,80,70,0.5)" : "#ffd43b") : "rgba(40,34,30,0.8)";
          g.fillRect(ox + x * cell, oy + y * cell, cell, cell);
        }
        const dot = (wx, wy, c, r) => {
          const x = ox + (wx - x0) * cell, y = oy + (wy - y0) * cell;
          if (x < ox || y < oy || x > ox + n * cell || y > oy + n * cell) return;
          g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        };
        for (const it of items) if (!it.gone && !it.deco && s.seen.has(Math.floor(it.y) * S + Math.floor(it.x))) dot(it.x, it.y, it.kind === "relic" ? "#ffd43b" : it.kind === "key" ? "#ffe8a3" : "#74c0fc", cell * 0.45);
        for (const gh of ghosts) if (gh.away <= 0 && Math.hypot(gh.x - s.x, gh.y - s.y) < 5) dot(gh.x, gh.y, "#e8f0ff", cell * 0.4);
        // gracz ze strzałką kierunku
        const px = ox + (s.x - x0) * cell, py = oy + (s.y - y0) * cell;
        g.fillStyle = "#ff8787";
        g.beginPath();
        g.moveTo(px + Math.cos(s.a) * cell * 1.2, py + Math.sin(s.a) * cell * 1.2);
        g.lineTo(px + Math.cos(s.a + 2.5) * cell * 0.8, py + Math.sin(s.a + 2.5) * cell * 0.8);
        g.lineTo(px + Math.cos(s.a - 2.5) * cell * 0.8, py + Math.sin(s.a - 2.5) * cell * 0.8);
        g.fill();
      }

      function render() {
        const total = crypt.relics.length;
        relicEl.set(`${s.relics} z ${total}`, s.relics / total, crypt.gate ? (s.key ? "Klucz masz przy sobie." : "Krata zamknięta, szukaj klucza.") : "Potem idź do portalu.");
        if (endless) {
          runEl.set("Piętro", depth);
          runEl.set("Życia", `${s.lives} z ${L.lives}`);
          runEl.set("Za bieg", `${endlessPoints(depth - 1)} pkt`);
        } else lifeEl.set(`${s.lives} z ${L.lives}`);
        lightNote.textContent = `Światło ${Math.round(s.energy)}%. Błysk kosztuje 30%. Klawisz M pokazuje całą mapę.`;
        flashBtn.disabled = s.energy < 30 || ctx.done;
        ctx.progress((s.relics + (s.ending ? 1 : 0)) / (total + 1));
        const floorsN = floors.length;
        if (!s.carto) {
          let seen = 0;
          for (const [x, y] of floors) if (s.seen.has(y * S + x)) seen++;
          if (seen / floorsN >= 0.9) { s.carto = true; ctx.achieve("kartograf"); }
        }
      }
      render();
      if (endless) ctx.toast("Piętro 1");
    },
  });
}
