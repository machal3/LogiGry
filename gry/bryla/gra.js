// Bryła: prostopadłościan 1 × 1 × 2 toczy się po kafelkach. Plansze losowe, każdą sprawdza BFS (rozwiązywalna, z najkrótszą trasą).
// Stan bryły: x, y (pierwsza kostka) i o: "S" stoi, "X" leży wzdłuż x, "Y" leży wzdłuż y.
{
  // --- Logika bez DOM ---
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  function roll({ x, y, o }, dir) {
    if (o === "S") return { left: { x: x - 2, y, o: "X" }, right: { x: x + 1, y, o: "X" }, up: { x, y: y - 2, o: "Y" }, down: { x, y: y + 1, o: "Y" } }[dir];
    if (o === "X") return { left: { x: x - 1, y, o: "S" }, right: { x: x + 2, y, o: "S" }, up: { x, y: y - 1, o: "X" }, down: { x, y: y + 1, o: "X" } }[dir];
    return { left: { x: x - 1, y, o: "Y" }, right: { x: x + 1, y, o: "Y" }, up: { x, y: y - 1, o: "S" }, down: { x, y: y + 2, o: "S" } }[dir];
  }
  const cells = ({ x, y, o }) => (o === "S" ? [[x, y]] : o === "X" ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]]);

  // Plansza: grid[y][x] = "" | "#" kafel | "o" kruchy | "G" cel | "s" przełącznik | "b" most (włączany przełącznikiem).
  const tileAt = (lv, x, y, on) => {
    const t = lv.grid[y]?.[x] || "";
    return t === "b" ? (on ? "b" : "") : t;
  };
  // Ruch z regułami: upadek, kruchy kafel, przełącznik. Zwraca nowy stan albo { fall }.
  function step(lv, st, dir) {
    const nb = roll(st, dir);
    const cs = cells(nb);
    const tiles = cs.map(([x, y]) => tileAt(lv, x, y, st.on));
    if (tiles.some((t) => !t)) return { ...nb, on: st.on, fall: true };
    if (nb.o === "S" && tiles[0] === "o") return { ...nb, on: st.on, fall: true, broke: true };
    const on = tiles.includes("s") ? !st.on : st.on;
    return { ...nb, on, win: nb.o === "S" && tiles[0] === "G" };
  }
  const key = (s) => `${s.x},${s.y},${s.o},${s.on ? 1 : 0}`;
  // Najkrótsza trasa (BFS); null, gdy się nie da.
  function solve(lv, from = lv.start) {
    const q = [{ ...from, path: [] }], seen = new Set([key(from)]);
    while (q.length) {
      const cur = q.shift();
      for (const d of Object.keys(DIRS)) {
        const nx = step(lv, cur, d);
        if (nx.fall) continue;
        if (nx.win) return [...cur.path, d];
        const k = key(nx);
        if (seen.has(k)) continue;
        seen.add(k);
        q.push({ ...nx, path: [...cur.path, d] });
      }
    }
    return null;
  }

  // Etap: losowy spacer bryły wyrzeźbia ścieżkę, potem dodatki (kruche kafle, most) i sprawdzenie BFS.
  function generate({ walk, minOpt, fragile, bridge, W = 12, H = 9 }) {
    for (let tries = 0; tries < 400; tries++) {
      const grid = Array.from({ length: H }, () => new Array(W).fill(""));
      let st = { x: 1 + rnd(3), y: 1 + rnd(H - 2), o: "S" };
      const start = { ...st };
      const visited = [cells(st)];
      grid[st.y][st.x] = "#";
      let last = null, ok = true;
      for (let k = 0; k < walk || st.o !== "S"; k++) {
        if (k > walk + 12) { ok = false; break; }
        const opts = Object.keys(DIRS).filter((d) => {
          if (last && DIRS[d][0] === -DIRS[last][0] && DIRS[d][1] === -DIRS[last][1]) return false;
          return cells(roll(st, d)).every(([x, y]) => x >= 0 && y >= 0 && x < W && y < H);
        });
        // spacer ciągnie w prawo, żeby etap miał kierunek
        const d = Math.random() < 0.35 && opts.includes("right") ? "right" : pick(opts);
        if (!d) { ok = false; break; }
        st = roll(st, d);
        last = d;
        for (const [x, y] of cells(st)) grid[y][x] = "#";
        visited.push(cells(st));
      }
      if (!ok || (Math.abs(st.x - start.x) + Math.abs(st.y - start.y) < 4)) continue;
      grid[st.y][st.x] = "G";
      // dodatkowe kafle wokół ścieżki: zmylenie i skróty
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (grid[y][x] || Math.random() > 0.22) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy]?.[x + dx] === "#")) grid[y][x] = "+";
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === "+") grid[y][x] = "#";
      const lv = { grid, start, W, H };
      if (fragile) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (grid[y][x] === "#" && !(x === start.x && y === start.y) && Math.random() < fragile) grid[y][x] = "o";
      }
      if (bridge) {
        // most: dwa kafle ze środka ścieżki znikają, przełącznik na kafelku odwiedzonym wcześniej
        const mid = visited.slice(Math.floor(visited.length * 0.45), Math.floor(visited.length * 0.75)).flat();
        const pickCell = pick(mid);
        if (!pickCell) continue;
        const [bx, by] = pickCell;
        if (grid[by][bx] === "G") continue;
        const brid = [[bx, by], ...[[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [bx + dx, by + dy]).filter(([x, y]) => grid[y]?.[x] === "#" || grid[y]?.[x] === "o").slice(0, 1)];
        brid.forEach(([x, y]) => (grid[y][x] = "b"));
        const early = visited.slice(1, Math.floor(visited.length * 0.4)).flat().filter(([x, y]) => grid[y][x] === "#" && !(x === start.x && y === start.y));
        if (!early.length) continue;
        const [sx, sy] = pick(early);
        grid[sy][sx] = "s";
        // bez przełącznika most musi być potrzebny
        if (solve({ ...lv, grid: grid.map((r) => r.map((t) => (t === "s" ? "#" : t))) })) continue;
      }
      lv.start = { ...start, on: false };
      const sol = solve(lv);
      if (!sol || sol.length < minOpt) continue;
      lv.opt = sol.length;
      lv.sol = sol;
      return lv;
    }
    return null;
  }

  if (typeof module !== "undefined") module.exports = { roll, cells, step, solve, generate, DIRS };

  if (typeof registerGame !== "undefined") registerGame({
    id: "bryla",
    cat: "lamiglowki",
    name: "Bryła",
    author: "Claude Opus 5.5",
    desc: "Przetaczaj prostopadłościan po kafelkach zawieszonych w przestrzeni i wstaw go pionowo w otwór.",
    color: "#7b4fd6",
    ink: "#ffffff",
    glyph: [".....", "..#..", "..#..", "####.", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, stages: 3, walk: 9, minOpt: 6, fragile: 0, bridge: false, falls: 12 },
      { key: "medium", name: "Średni", points: 25, stages: 3, walk: 15, minOpt: 11, fragile: 0.18, bridge: false, falls: 10 },
      { key: "hard", name: "Trudny", points: 50, stages: 3, walk: 20, minOpt: 15, fragile: 0.2, bridge: true, falls: 6 },
    ],
    rules: [
      "Strzałki albo WASD toczą bryłę. Myszą lub palcem kliknij obok bryły, po stronie, w którą ma się przetoczyć.",
      "Bryła stojąca zajmuje jedno pole, leżąca dwa. Nie może wystawać poza kafelki, bo spadnie.",
      "Etap kończy się, gdy bryła stanie pionowo nad otworem. Przejdź trzy etapy.",
      "Pomarańczowe kafle nie utrzymają stojącej bryły. Fioletowy przełącznik wysuwa i chowa most.",
      "Każdy poziom ma limit upadków.",
    ],
    achievements: [
      { id: "trasa", name: "Najkrótsza trasa", desc: "Przejdź etap w najmniejszej możliwej liczbie ruchów.", points: 10 },
      { id: "pewny-krok", name: "Pewny krok", desc: "Przejdź średni lub trudny poziom bez upadku.", points: 25 },
      { id: "bez-cofania", name: "Bez cofania", desc: "Przejdź średni lub trudny poziom bez cofania ruchów.", points: 10 },
      { id: "szybko", name: "Wartki nurt", desc: "Przejdź trudny poziom w mniej niż 4 minuty.", points: 25 },
      { id: "mistrz", name: "Geometra", desc: "Przejdź każdy etap trudnego poziomu najkrótszą trasą.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 120, 90, { max: 90, cls: "space" });
      const { g } = cv;
      const s = { stage: 0, lv: null, st: null, moves: 0, falls: 0, allOpt: true, anim: null, fx: [], pulse: 0 };

      const stageEl = statBlock(ctx, "Etap", { meter: true });
      const movesEl = statBlock(ctx, "Ruchy", { small: true });
      const fallEl = statBlock(ctx, "Upadki", { small: true });
      const save = ctx.undoable((snap) => { if (s.anim) return; s.st = snap.st; s.moves = snap.moves; render(); });

      function loadStage() {
        s.lv = generate({ walk: L.walk, minOpt: L.minOpt, fragile: L.fragile, bridge: L.bridge });
        s.st = { ...s.lv.start };
        s.moves = 0;
        s.anim = { kind: "drop", t: 0 };
        // rozmiar rzutu: plansza mieści się w płótnie
        const pts = [];
        s.lv.grid.forEach((row, y) => row.forEach((t, x) => t && pts.push([x, y], [x + 1, y + 1], [x + 1, y], [x, y + 1])));
        const xs = pts.map(([x, y]) => x - y), ys = pts.map(([x, y]) => (x + y) / 2);
        // w pionie miejsce na stojącą bryłę (2 pola nad kafelkami) i grubość kafli
        const w = Math.max(...xs) - Math.min(...xs), y0 = Math.min(...ys) - 2.1, y1 = Math.max(...ys) + 0.3;
        s.S = Math.min(110 / (w * 0.866), 82 / (y1 - y0));
        s.ox = 60 - ((Math.max(...xs) + Math.min(...xs)) / 2) * 0.866 * s.S;
        s.oy = 45 - ((y0 + y1) / 2) * s.S;
        render();
      }

      // izometria: x w prawo-dół, y w lewo-dół, z w górę
      const P = (x, y, z) => [s.ox + (x - y) * 0.866 * s.S, s.oy + (x + y) * 0.5 * s.S - z * s.S];

      function move(dir) {
        if (ctx.done || s.anim) return;
        const prev = s.st;
        const nx = step(s.lv, prev, dir);
        save({ st: prev, moves: s.moves });
        s.moves++;
        s.anim = { kind: "roll", from: prev, to: nx, dir, t: 0 };
        Sound.tap();
        render();
      }
      function afterRoll(nx) {
        s.st = nx;
        if (nx.fall) {
          s.falls++;
          s.anim = { kind: "fall", st: nx, t: 0, vz: 0, z: 0, tilt: 0 };
          Sound.error();
          if (nx.broke) ctx.toast("Kruchy kafel nie wytrzymał");
          render();
          return;
        }
        if (nx.on !== (s.prevOn ?? false)) { Sound.flag(); ctx.toast(nx.on ? "Most wysunięty" : "Most schowany"); }
        s.prevOn = nx.on;
        if (nx.win) {
          Sound.line();
          if (s.moves <= s.lv.opt) ctx.achieve("trasa");
          else s.allOpt = false;
          s.anim = { kind: "sink", t: 0 };
        }
        render();
      }
      function stageDone() {
        s.stage++;
        if (s.stage >= L.stages) {
          if (L.key !== "easy" && !s.falls) ctx.achieve("pewny-krok");
          if (L.key !== "easy" && !ctx.undos) ctx.achieve("bez-cofania");
          if (L.key === "hard" && ctx.time < 240) ctx.achieve("szybko");
          if (L.key === "hard" && s.allOpt) ctx.achieve("mistrz");
          return ctx.win(`Upadki: ${s.falls}.`);
        }
        ctx.toast(`Etap ${s.stage + 1} z ${L.stages}`);
        s.prevOn = false;
        loadStage();
      }

      directionInput(ctx, cv.cv, move);
      // klik obok bryły: kierunek wybrany po rzucie
      ctx.on(cv.cv, "click", (e) => {
        if (!s.st || s.anim) return;
        const [px, py] = cv.at(e);
        const [cx, cy] = blockCenter();
        const v = [px - cx, py - cy], len = Math.hypot(...v);
        if (len < 2) return;
        let best = null;
        for (const [d, [dx, dy]] of Object.entries(DIRS)) {
          const a = P(dx, dy, 0), o = P(0, 0, 0), sv = [a[0] - o[0], a[1] - o[1]], sl = Math.hypot(...sv);
          const dot = (sv[0] * v[0] + sv[1] * v[1]) / sl / len;
          if (!best || dot > best.dot) best = { d, dot };
        }
        move(best.d);
      });
      const blockCenter = () => {
        const cs = cells(s.st);
        const mx = cs.reduce((a, [x]) => a + x + 0.5, 0) / cs.length, my = cs.reduce((a, [, y]) => a + y + 0.5, 0) / cs.length;
        return P(mx, my, s.st.o === "S" ? 1 : 0.5);
      };

      // --- Pętla i rysowanie ---
      cv.loop((dt) => {
        s.pulse += dt;
        const a = s.anim;
        if (a) {
          a.t += dt;
          if (a.kind === "roll" && a.t >= 0.17) { s.anim = null; afterRoll(a.to); }
          else if (a.kind === "fall") {
            a.vz += 30 * dt; a.z -= a.vz * dt; a.tilt += dt * 3;
            if (a.t > 1.1) {
              s.anim = null;
              if (s.falls >= L.falls) return ctx.lose("Za dużo upadków", `Etap ${s.stage + 1} z ${L.stages}.`);
              ctx.toast(`Upadek. Zostało prób: ${L.falls - s.falls}`);
              s.st = { ...s.lv.start };
              s.prevOn = false;
              s.anim = { kind: "drop", t: 0 };
              render();
            }
          } else if (a.kind === "sink" && a.t > 0.9) { s.anim = null; stageDone(); }
          else if (a.kind === "drop" && a.t > 0.45) s.anim = null;
        }
        draw();
      });

      // wierzchołki prostopadłościanu dla stanu i kąta obrotu przy toczeniu
      function boxVerts(st, rollAng = 0, dir = null, dz = 0) {
        const cs = cells(st);
        const x0 = Math.min(...cs.map((c) => c[0])), y0 = Math.min(...cs.map((c) => c[1]));
        const sx = st.o === "X" ? 2 : 1, sy = st.o === "Y" ? 2 : 1, sz = st.o === "S" ? 2 : 1;
        let v = [];
        for (const a of [0, 1]) for (const b of [0, 1]) for (const c of [0, 1]) v.push([x0 + a * sx, y0 + b * sy, c * sz + dz]);
        if (dir) {
          // oś obrotu: dolna krawędź po stronie ruchu
          const [dx, dy] = DIRS[dir];
          const px = dx > 0 ? x0 + sx : dx < 0 ? x0 : 0, py = dy > 0 ? y0 + sy : dy < 0 ? y0 : 0;
          const c = Math.cos(rollAng), sn = Math.sin(rollAng);
          v = v.map(([x, y, z]) => {
            if (dx) { const rx = (x - px) * dx; return [px + (rx * c + z * sn) * dx, y, -rx * sn + z * c]; }
            const ry = (y - py) * dy; return [x, py + (ry * c + z * sn) * dy, -ry * sn + z * c];
          });
        }
        return v;
      }
      const FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
      function drawBox(v, base, alpha = 1) {
        const mid = [0, 1, 2].map((i) => v.reduce((a, q) => a + q[i], 0) / 8);
        // widz patrzy z kierunku (1, 1, 1): widać ściany, których normalna (od środka bryły) ma z nim dodatni iloczyn
        const faces = FACES.map((f) => {
          const p = f.map((i) => v[i]);
          const c = [0, 1, 2].map((i) => p.reduce((a, q) => a + q[i], 0) / 4);
          const n = c.map((q, i) => q - mid[i]);
          return { p, n, depth: c[0] + c[1] + c[2] };
        }).filter((f) => f.n[0] + f.n[1] + f.n[2] > 0.01);
        faces.sort((a, b) => a.depth - b.depth);
        g.globalAlpha = alpha;
        for (const f of faces) {
          const nl = Math.hypot(...f.n);
          const light = 0.55 + 0.45 * Math.max(0, (f.n[2] * 0.9 + f.n[0] * 0.35 - f.n[1] * 0.1) / nl);
          const pts = f.p.map(([x, y, z]) => P(x, y, z));
          const gr = g.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
          gr.addColorStop(0, shade(base, light * 1.08)); gr.addColorStop(1, shade(base, light * 0.85));
          g.fillStyle = gr;
          g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
          g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 0.25; g.stroke();
        }
        g.globalAlpha = 1;
      }
      function shade([r, gg, b], k) { return `rgb(${Math.min(255, r * k) | 0},${Math.min(255, gg * k) | 0},${Math.min(255, b * k) | 0})`; }

      function drawTile(x, y, t, alpha) {
        const top = [P(x, y, 0), P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x, y + 1, 0)];
        const th = 0.28;
        const col = t === "o" ? [236, 132, 52] : t === "b" ? [140, 150, 175] : t === "s" ? [150, 156, 178] : [176, 182, 200];
        g.globalAlpha = alpha;
        // boki
        g.fillStyle = shade(col, 0.55);
        g.beginPath(); for (const [px, py] of [P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -th), P(x + 1, y, -th)]) g.lineTo(px, py); g.fill();
        g.fillStyle = shade(col, 0.4);
        g.beginPath(); for (const [px, py] of [P(x, y + 1, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -th), P(x, y + 1, -th)]) g.lineTo(px, py); g.fill();
        // wierzch
        if (t === "G") {
          g.fillStyle = "#0a0c18";
          g.beginPath(); top.forEach(([px, py]) => g.lineTo(px, py)); g.fill();
          const glow = 0.5 + 0.3 * Math.sin(s.pulse * 3);
          const c = P(x + 0.5, y + 0.5, 0);
          const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], s.S * 0.9);
          gr.addColorStop(0, `rgba(170,120,255,${glow})`); gr.addColorStop(1, "rgba(170,120,255,0)");
          g.fillStyle = gr; g.beginPath(); top.forEach(([px, py]) => g.lineTo(px, py)); g.fill();
        } else {
          const gr = g.createLinearGradient(top[0][0], top[0][1], top[2][0], top[2][1]);
          gr.addColorStop(0, shade(col, 1.12)); gr.addColorStop(1, shade(col, 0.92));
          g.fillStyle = gr;
          g.beginPath(); top.forEach(([px, py]) => g.lineTo(px, py)); g.closePath(); g.fill();
          g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.2; g.stroke();
          if (t === "o") {
            // rysy na kruchym kaflu
            g.strokeStyle = "rgba(90,40,0,0.5)"; g.lineWidth = 0.3;
            const a = P(x + 0.3, y + 0.2, 0), b = P(x + 0.5, y + 0.55, 0), c = P(x + 0.8, y + 0.6, 0);
            g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.stroke();
          }
          if (t === "s") {
            const c = P(x + 0.5, y + 0.5, 0);
            g.fillStyle = s.st?.on ? "#b197fc" : "#7048e8";
            g.beginPath(); g.ellipse(c[0], c[1], s.S * 0.3, s.S * 0.17, 0, 0, 7); g.fill();
            g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 0.3; g.stroke();
          }
        }
        g.globalAlpha = 1;
      }

      function draw() {
        if (!s.lv) return;
        const a = s.anim;
        const tiles = [];
        s.lv.grid.forEach((row, y) => row.forEach((t, x) => {
          if (!t) return;
          if (t === "b") tiles.push([x, y, t, s.st.on ? 1 : 0.12]);
          else tiles.push([x, y, t, 1]);
        }));
        const drop = a?.kind === "drop" ? 1 - Math.min(1, a.t / 0.45) : 0;
        // kafle od tyłu do przodu; bryła po kaflach (spadająca bryła: między nimi)
        tiles.sort((p, q) => p[0] + p[1] - (q[0] + q[1]));
        const cs = cells(s.st);
        const blockDepth = a?.kind === "fall" ? Math.max(...cs.map(([x, y]) => x + y)) + 0.5 : Infinity;
        let pending = true;
        for (const t of tiles) {
          if (pending && t[0] + t[1] > blockDepth) { drawBlock(drop); pending = false; }
          drawTile(...t);
        }
        if (pending) drawBlock(drop);
        // podpowiedź klawiszy wokół bryły
        if (!a && !ctx.done) {
          const [cx, cy] = blockCenter();
          g.fillStyle = "rgba(255,255,255,0.22)";
          for (const [dx, dy] of Object.values(DIRS)) {
            const o = P(0, 0, 0), d = P(dx, dy, 0), vx = d[0] - o[0], vy = d[1] - o[1], l = Math.hypot(vx, vy);
            const r = s.S * (s.st.o === "S" ? 1.3 : 1.7);
            const tx = cx + (vx / l) * r, ty = cy + (vy / l) * r * 0.9 + s.S * 0.4;
            const an = Math.atan2(vy, vx);
            g.beginPath();
            g.moveTo(tx + Math.cos(an) * 1.6, ty + Math.sin(an) * 1.6);
            g.lineTo(tx + Math.cos(an + 2.4) * 1.6, ty + Math.sin(an + 2.4) * 1.6);
            g.lineTo(tx + Math.cos(an - 2.4) * 1.6, ty + Math.sin(an - 2.4) * 1.6);
            g.fill();
          }
        }
      }
      function drawBlock(drop = 0) {
        const a = s.anim, col = [214, 112, 64];
        if (a?.kind === "roll") {
          const k = Math.min(1, a.t / 0.17);
          drawBox(boxVerts(a.from, (Math.PI / 2) * k * k * (3 - 2 * k), a.dir), col);
        } else if (a?.kind === "fall") {
          drawBox(boxVerts(a.st, 0, null, a.z), col, Math.max(0, 1 - a.t / 1.1));
        } else if (a?.kind === "sink") {
          drawBox(boxVerts(s.st, 0, null, -a.t * 2.4), col, Math.max(0, 1 - a.t / 0.9));
        } else drawBox(boxVerts(s.st, 0, null, drop * 6), col, 1 - drop * 0.7);
      }

      function render() {
        stageEl.set(`${s.stage + 1} z ${L.stages}`, s.stage / L.stages);
        movesEl.set(s.moves, null, s.lv ? `Najkrótsza trasa: ${s.lv.opt}` : "");
        fallEl.set(`${s.falls} z ${L.falls}`);
        ctx.progress(s.stage / L.stages);
      }
      loadStage();
    },
  });
}
