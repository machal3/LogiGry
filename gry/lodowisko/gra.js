// Lodowisko: sanki ślizgają się po lodzie, aż zatrzyma je ściana, zaspa albo krawędź planszy.
// Po drodze zbierają kryształy, a lodowe bramy przenoszą je w inne miejsce bez utraty pędu.
{
  const VEC = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // góra, dół, lewo, prawo
  const DIRS = ["up", "down", "left", "right"];
  const DIRI = { up: 0, down: 1, left: 2, right: 3 };
  const KEYDIR = { arrowup: 0, w: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, arrowright: 3, d: 3 };

  // Parametry poziomów. `want` to minimalna długość najlepszego rozwiązania,
  // `needDrift` i `needGate` pilnują, żeby nowe przeszkody naprawdę brały udział w rozwiązaniu.
  const LEVELS = [
    { key: "easy", name: "Łatwy", points: 10, n: 6, gems: 2, drifts: 0, gates: 0, density: 15, want: 5, slack: 8, needDrift: 0, needGate: 0, tries: 200 },
    { key: "medium", name: "Średni", points: 25, n: 8, gems: 3, drifts: 3, gates: 0, density: 17, want: 6, slack: 6, needDrift: 1, needGate: 0, tries: 220 },
    { key: "hard", name: "Trudny", points: 50, n: 10, gems: 4, drifts: 4, gates: 1, density: 18, want: 11, slack: 4, needDrift: 1, needGate: 1, tries: 240 },
  ];

  // --- Logika bez DOM: da się ją sprawdzić w node (test.js) ---

  // Plansza z wygodnymi indeksami: ściany, zaspy, bramy i kryształy.
  function pack(o) {
    const b = {
      n: o.n, m: o.n,
      wall: o.wall, drift: o.drift, portal: o.portal,
      gems: o.gems, start: o.start, exit: o.exit,
      gemAt: new Int8Array(o.n * o.n).fill(-1),
    };
    b.gems.forEach((g, i) => { b.gemAt[g] = i; });
    return b;
  }

  // Jeden ślizg. Zwraca null, gdy sanki stoją pod ścianą; inaczej pole zatrzymania,
  // zdobyte kryształy (maska), liczbę użytych bram i odcinki przebytej drogi.
  // Bramy są statyczne, więc trasa nie zależy od tego, które kryształy już zebrano.
  function glide(b, r, c, dir) {
    const [dr, dc] = VEC[dir];
    const segs = [[r * b.m + c]];
    let nr = r, nc = c, got = 0, gates = 0, guard = 0;
    const limit = b.n * b.m * 3;
    while (guard++ < limit) {
      const tr = nr + dr, tc = nc + dc;
      if (tr < 0 || tr >= b.n || tc < 0 || tc >= b.m) break;
      const ti = tr * b.m + tc;
      if (b.wall[ti]) break;
      nr = tr; nc = tc;
      segs[segs.length - 1].push(ti);
      const g = b.gemAt[ti];
      if (g >= 0) got |= 1 << g;
      if (b.drift[ti]) break; // zaspa łapie płozy
      const p = b.portal[ti];
      if (p >= 0) {
        gates++;
        nr = (p / b.m) | 0;
        nc = p % b.m;
        segs.push([nr * b.m + nc]); // brama przenosi w inne miejsce, pęd trwa
        const pg = b.gemAt[p];
        if (pg >= 0) got |= 1 << pg;
        if (gates > 6) break;
      }
    }
    if (nr === r && nc === c) return null;
    return { r: nr, c: nc, got, gates, segs };
  }

  // Możliwe przejścia dla każdego pola i kierunku (liczone raz na planszę).
  function edges(b) {
    const area = b.n * b.m;
    const to = new Int32Array(4 * area).fill(-1);
    const got = new Int8Array(4 * area);
    for (let i = 0; i < area; i++) {
      if (b.wall[i]) continue;
      const r = (i / b.m) | 0, c = i % b.m;
      for (let d = 0; d < 4; d++) {
        const a = glide(b, r, c, d);
        if (!a) continue;
        to[d * area + i] = a.r * b.m + a.c;
        got[d * area + i] = a.got;
      }
    }
    return { to, got };
  }

  // Najkrótsze rozwiązanie: BFS po stanach (pole, zbiór kryształów).
  // Zwraca { dist, first, dirs, gates, drifts } albo null, gdy stąd nie da się wygrać.
  function solve(b, r0, c0, mask0 = 0) {
    const area = b.n * b.m, span = 1 << b.gems.length, full = span - 1;
    const { to, got } = edges(b);
    const total = area * span;
    const prev = new Int32Array(total).fill(-1);
    const pdir = new Int8Array(total);
    const start = (r0 * b.m + c0) * span + mask0;
    const goal = b.exit * span + full;
    const seen = new Uint8Array(total);
    const q = new Int32Array(total);
    let head = 0, tail = 0;
    seen[start] = 1;
    q[tail++] = start;
    while (head < tail) {
      const id = q[head++];
      if (id === goal) return describe(b, r0, c0, prev, pdir, start, goal);
      const mask = id % span, pos = (id - mask) / span;
      for (let d = 0; d < 4; d++) {
        const t = to[d * area + pos];
        if (t < 0) continue;
        const nid = t * span + (mask | got[d * area + pos]);
        if (seen[nid]) continue;
        seen[nid] = 1;
        prev[nid] = id;
        pdir[nid] = d;
        q[tail++] = nid;
      }
    }
    return null;
  }

  // Odtwarza trasę z BFS i liczy, ile razy sanki korzystały z zasp i bram.
  function describe(b, r0, c0, prev, pdir, start, goal) {
    const dirs = [];
    let cur = goal;
    while (cur !== start) { dirs.push(pdir[cur]); cur = prev[cur]; }
    dirs.reverse();
    let r = r0, c = c0, gates = 0, drifts = 0;
    for (const d of dirs) {
      const a = glide(b, r, c, d);
      gates += a.gates;
      r = a.r; c = a.c;
      if (b.drift[r * b.m + c]) drifts++;
    }
    return { dist: dirs.length, first: dirs[0], dirs, gates, drifts };
  }

  // Pola, na których sanki zatrzymają się bez pomocy zasp (obok ściany albo krawędzi).
  function stopping(b) {
    const set = new Set();
    for (let i = 0; i < b.n * b.m; i++) {
      if (b.wall[i]) continue;
      const r = (i / b.m) | 0, c = i % b.m;
      for (const [dr, dc] of VEC) {
        const tr = r + dr, tc = c + dc;
        if (tr < 0 || tr >= b.n || tc < 0 || tc >= b.m || b.wall[tr * b.m + tc]) { set.add(i); break; }
      }
    }
    return set;
  }

  // Pola osiągalne z `start` i długość drogi w ślizgach (bez zbierania kryształów).
  function field(b, start) {
    const area = b.n * b.m;
    const { to } = edges(b);
    const dist = new Int16Array(area).fill(-1);
    const cells = [start];
    dist[start] = 0;
    for (let h = 0; h < cells.length; h++) {
      const p = cells[h];
      for (let d = 0; d < 4; d++) {
        const t = to[d * area + p];
        if (t < 0 || dist[t] >= 0) continue;
        dist[t] = dist[p] + 1;
        cells.push(t);
      }
    }
    return { dist, cells };
  }

  // Jedna losowa plansza. Start, wyjście i kryształy trafiają tylko na pola,
  // do których sanki naprawdę dojadą, więc losowanie prawie nigdy nie ginie.
  function attempt(cfg) {
    const n = cfg.n, area = n * n;
    const wall = new Uint8Array(area);
    for (let r = 1; r < n - 1; r++) {
      for (let c = 1; c < n - 1; c++) if (rnd(100) < cfg.density) wall[r * n + c] = 1;
    }
    const free = [];
    for (let i = 0; i < area; i++) if (!wall[i]) free.push(i);
    const need = cfg.gems + cfg.drifts + cfg.gates * 2 + 3;
    if (free.length < need || free.length < area * 0.65) return null;

    const empty = { drift: new Uint8Array(area), portal: new Int32Array(area).fill(-1) };
    const stop = stopping(pack({ n, wall, ...empty, gems: [], start: 0, exit: 0 }));

    shuffle(free);
    const start = free[0];

    // Zaspy stawiamy tylko tam, gdzie bez nich sanki by się nie zatrzymały.
    const drift = new Uint8Array(area);
    const driftCells = [];
    for (const i of free) {
      if (driftCells.length >= cfg.drifts) break;
      if (i === start || stop.has(i)) continue;
      drift[i] = 1;
      driftCells.push(i);
    }
    if (driftCells.length < cfg.drifts) return null;

    // Bramy w dowolnych wolnych miejscach, byle nie na starcie i nie na zaspie.
    const gateCells = [];
    for (const i of free) {
      if (gateCells.length >= cfg.gates * 2) break;
      if (i === start || drift[i] || gateCells.includes(i)) continue;
      gateCells.push(i);
    }
    if (gateCells.length < cfg.gates * 2) return null;
    const portal = empty.portal;
    for (let k = 0; k < cfg.gates; k++) {
      const a = gateCells[k * 2], b = gateCells[k * 2 + 1];
      portal[a] = b;
      portal[b] = a;
    }

    const base = pack({ n, wall, drift, portal, gems: [], start, exit: start });
    const f = field(base, start);
    if (f.cells.length < cfg.gems + 6) return null;

    // Wyjście: osiągalne i raczej daleko, żeby pierwszy ruch nie kończył partii.
    const stops = f.cells.filter((i) => i !== start && f.dist[i] >= 2);
    if (stops.length < cfg.gems + 2) return null;
    const far = Math.max(...stops.map((i) => f.dist[i]));
    if (far < Math.min(3, cfg.n - 4)) return null;
    const exits = stops.filter((i) => f.dist[i] >= Math.ceil(far * 0.5));
    const exit = pick(exits);

    // Kryształy rozkładamy na pozostałych przystankach, z dala od siebie.
    const gems = [];
    const pool = shuffle(f.cells.filter((i) => i !== start && i !== exit && f.dist[i] > 0 && !drift[i] && portal[i] < 0));
    for (const i of pool) {
      if (gems.length >= cfg.gems) break;
      if (gems.some((g) => Math.abs(((g / n) | 0) - ((i / n) | 0)) + Math.abs((g % n) - (i % n)) < 2)) continue;
      gems.push(i);
    }
    if (gems.length < cfg.gems) return null;

    const board = pack({ n, wall, drift, portal, gems, start, exit });
    const res = solve(board, (start / n) | 0, start % n);
    if (!res || res.dist < cfg.want) return null;
    if (res.drifts < cfg.needDrift || res.gates < cfg.needGate) return null;
    board.optimal = res.dist;
    return board;
  }

  // Prosta, zawsze rozwiązalna plansza: kryształy i wyjście w jednej kolumnie.
  function fallback(cfg) {
    const n = cfg.n, area = n * n;
    const gems = [];
    for (let k = 1; k <= cfg.gems; k++) gems.push((n - 1 - k) * n + (n - 1));
    const b = pack({ n, wall: new Uint8Array(area), drift: new Uint8Array(area), portal: new Int32Array(area).fill(-1), gems, start: 0, exit: (n - 1) * n + (n - 1) });
    b.optimal = 2;
    return b;
  }

  // Pierwsza plansza spełniająca wymagania; w razie pecha łagodzimy próg,
  // a dopiero na końcu bierzemy planszę zapasową.
  function puzzle(cfg) {
    const rounds = [
      { want: cfg.want, slackTries: cfg.tries },
      { want: Math.max(2, cfg.want - 2), slackTries: 40 },
      { want: 2, slackTries: 40 },
    ];
    let best = null;
    for (let p = 0; p < rounds.length; p++) {
      const r = rounds[p];
      for (let k = 0; k < r.slackTries; k++) {
        const b = attempt({
          ...cfg,
          want: r.want,
          needDrift: p === 0 ? cfg.needDrift : 0,
          needGate: p === 0 ? cfg.needGate : 0,
        });
        if (!b) continue;
        if (p === 0) return b;
        if (!best || b.optimal > best.optimal) best = b;
      }
      if (best) return best;
    }
    return best || fallback(cfg);
  }

  if (typeof module !== "undefined") module.exports = { LEVELS, pack, glide, edges, solve, attempt, fallback, puzzle, DIRS, DIRI };

  if (typeof registerGame !== "undefined") registerGame({
    id: "lodowisko",
    cat: "lamiglowki",
    name: "Lodowisko",
    author: "DeepSeek V4.1 Flash",
    desc: "Prowadź sanki po lodzie: zbierz kryształy, wykorzystaj zaspy i lodowe bramy i zdąż na wyjście.",
    color: "#0e6b8c",
    ink: "#ffffff",
    glyph: ["..#..", "#.#.#", ".###.", "#.#.#", "..#.."],
    levels: LEVELS,
    rules: [
      "Sanki ruszają w wybranym kierunku i ślizgają się, aż zatrzyma je ściana, zaspa albo krawędź lodu.",
      "Zbierz wszystkie kryształy, a potem zatrzymaj się na świecącym wyjściu. Wyjście otwiera się po ostatnim krysztale.",
      "Zaspy łapią płozy, a lodowa brama przenosi sanki na drugą stronę planszy — pęd trwa dalej.",
      "Sterowanie: strzałki lub WASD, przesunięcie palcem, przyciski kierunkowe w panelu albo kliknięcie pola w tym samym wierszu lub kolumnie.",
      "Każdy poziom ma limit ruchów równy najlepszemu rozwiązaniu plus zapas. Podpowiedź pokazuje pierwszy ruch.",
    ],
    achievements: [
      { id: "bez-cofania", name: "Bez cofania", desc: "Wygraj poziom bez cofnięcia ruchu.", points: 10 },
      { id: "podwojny-lup", name: "Podwójny łup", desc: "Zbierz dwa kryształy jednym ślizgiem.", points: 10 },
      { id: "potrojny-lup", name: "Potrójny łup", desc: "Zbierz trzy kryształy jednym ślizgiem.", points: 25 },
      { id: "samodzielnie", name: "Samodzielnie", desc: "Wygraj średni lub trudny poziom bez podpowiedzi.", points: 10 },
      { id: "bramny-slizg", name: "Przez bramę", desc: "Przeleć przez lodową bramę i zbierz kryształ w tym samym ruchu.", points: 25 },
      { id: "bez-zbednego", name: "Bez zbędnego ruchu", desc: "Wygraj poziom trudny w liczbie ruchów równej najlepszemu rozwiązaniu.", points: 50 },
      { id: "lodowy-mistrz", name: "Lodowy mistrz", desc: "Wygraj poziom trudny w mniej niż 100 sekund bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const lv = ctx.level;
      const p = puzzle(lv);
      const { n, m } = p;
      const area = n * m;
      const full = (1 << p.gems.length) - 1;
      const limit = p.optimal + lv.slack;
      const calm = typeof reducedMotion === "function" ? reducedMotion() : false;
      const rowOf = (i) => (i / m) | 0;
      const colOf = (i) => i % m;
      const state = {
        r: rowOf(p.start), c: colOf(p.start), mask: 0, shown: 0,
        moves: 0, over: false, busy: false, hinted: false, queue: null,
        trail: [], gates: 0,
      };

      // --- Plansza: pola-przyciski, krysztaly, zaspy i bramy ---
      const cells = gridCells(board, m, n, "ld", { gap: 0.06 });
      board.classList.add(`ld-${lv.key}`);

      const gemEl = new Array(p.gems.length);
      p.gems.forEach((g, gi) => {
        const cell = cells[g];
        cell.classList.add("gem-cell");
        cell.style.setProperty("--v", (rnd(100) / 100).toFixed(2));
        cell.setAttribute("aria-label", `Kryształ ${gi + 1} z ${p.gems.length}, wiersz ${rowOf(g) + 1}, kolumna ${colOf(g) + 1}`);
        gemEl[gi] = el("i", "ld-gem");
        cell.append(gemEl[gi]);
      });
      p.wall.forEach((w, i) => {
        if (!w) return;
        const cell = cells[i];
        cell.classList.add("wall");
        cell.style.setProperty("--v", (rnd(100) / 100).toFixed(2));
        cell.tabIndex = -1;
        cell.setAttribute("aria-label", "Ściana");
      });
      p.drift.forEach((d, i) => {
        if (!d) return;
        const cell = cells[i];
        cell.classList.add("drift");
        cell.style.setProperty("--v", (rnd(100) / 100).toFixed(2));
        cell.setAttribute("aria-label", `Zaspa, wiersz ${rowOf(i) + 1}, kolumna ${colOf(i) + 1}`);
        cell.append(el("i", "ld-drift"));
      });
      // Bramy łączymy w pary: oba końce mają ten sam kolor i ten sam znaczek.
      const pairs = [];
      p.portal.forEach((to, i) => { if (to > i) pairs.push([i, to]); });
      const tones = ["#22d3ee", "#a78bfa", "#34d399"];
      pairs.forEach(([a, b], k) => {
        const tone = tones[k % tones.length];
        for (const i of [a, b]) {
          const cell = cells[i];
          cell.classList.add("gate");
          cell.style.setProperty("--gc", tone);
          cell.dataset.pair = String(k);
          cell.setAttribute("aria-label", `Lodowa brama ${k + 1} z ${pairs.length}, wiersz ${rowOf(i) + 1}, kolumna ${colOf(i) + 1}`);
          const gate = el("i", "ld-gate");
          gate.append(el("i", "ld-gate-core"));
          cell.append(gate);
        }
      });
      const exitCell = cells[p.exit];
      exitCell.classList.add("exit");
      exitCell.setAttribute("aria-label", `Wyjście, wiersz ${rowOf(p.exit) + 1}, kolumna ${colOf(p.exit) + 1}`);
      exitCell.append(el("i", "ld-exit"));

      // Sonda: kolor płatków śniegu trzeba odczytać jako gotowy kolor dla płótna.
      const probe = el("i", "ld-probe");
      board.append(probe);

      // Aurora pod lodem i delikatny rąbek ramy nad polami.
      board.append(el("i", "ld-aurora"), el("i", "ld-rim"));

      // Ślad sanek leży pod kryształami, więc groovki to osobne elementy w polach.
      const grooves = new Map();
      const fx = el("div", "ld-fx");
      const sled = el("div", "ld-sled");
      const rot = el("div", "ld-rot");
      const art = el("div", "ld-art");
      art.append(
        el("i", "ld-scarf"),
        el("i", "ld-run ld-run-a"),
        el("i", "ld-run ld-run-b"),
        el("i", "ld-deck"),
        el("i", "ld-seat"),
        el("i", "ld-grip"),
        el("i", "ld-lamp"),
        el("i", "ld-glint"),
      );
      rot.append(art);
      sled.append(el("i", "ld-shadow"), rot);
      const snow = el("canvas", "ld-snow");
      snow.width = 640;
      snow.height = 640;
      board.append(fx, sled, snow);

      // --- Panel ---
      const movesEl = statBlock(ctx, "Ruchy", { meter: true });
      const movesNote = movesEl.block.querySelector(".panel-note");
      movesNote.classList.add("ld-note");
      const gemsEl = pipsBlock(ctx, "Kryształy", p.gems.length, { icon: "star" });
      const legend = el("p", "panel-note ld-legend");
      legend.textContent = lv.gates
        ? "Zaspa łapie płozy, brama przenosi sanki na drugą stronę."
        : lv.drifts ? "Zaspa łapie płozy i zatrzymuje sanki." : "Lód trzyma pęd aż do ściany.";
      gemsEl.block.append(legend);

      const pad = { onTap: (k) => move(DIRI[k]) };
      touchPad(ctx, pad, [
        ["up", "W górę", "i-up"],
        ["down", "W dół", "i-down"],
        ["left", "W lewo", "i-left"],
        ["right", "W prawo", "i-right"],
      ]);
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      // --- Czas i sprzątanie ---
      const timers = new Set();
      function later(fn, ms) {
        const id = setTimeout(() => { timers.delete(id); if (!ctx.done) fn(); }, Math.max(0, ms));
        timers.add(id);
        return id;
      }
      function clearTimers() {
        for (const id of timers) clearTimeout(id);
        timers.clear();
      }
      ctx.onStop(clearTimers);

      // --- Położenie sanek ---
      function posCss(r, c) {
        return `translate(calc(var(--g) + ${c} * (var(--s) + var(--g)) + var(--s) * 0.08), calc(var(--g) + ${r} * (var(--s) + var(--g)) + var(--s) * 0.08))`;
      }
      function setPos(r, c, dur) {
        sled.style.transitionDuration = `${calm ? 0 : dur}ms`;
        sled.style.transform = posCss(r, c);
      }

      let artAngle = 0;
      function turn(dir) {
        const target = [0, 90, 180, 270][dir];
        let t = target;
        while (t - artAngle > 180) t -= 360;
        while (t - artAngle < -180) t += 360;
        artAngle = t;
        rot.style.transitionDuration = calm ? "0ms" : "190ms";
        rot.style.transform = `rotate(${artAngle}deg)`;
      }

      // --- Ślad przejazdu ---
      function paintTrail(fresh) {
        for (const g of grooves.values()) g.remove();
        grooves.clear();
        for (const t of state.trail) {
          addGroove(t.i, t.d, 0, fresh ? fresh.has(t.i) : false);
        }
      }
      function addGroove(i, d, delay, animate = true) {
        if (grooves.has(i)) return;
        const g = el("i", `ld-groove${animate && !calm ? " ld-groove-new" : ""}`);
        g.style.setProperty("--td", d < 2 ? "90deg" : "0deg");
        if (animate && !calm) g.style.animationDelay = `${delay}ms`;
        cells[i].append(g);
        grooves.set(i, g);
      }

      // --- Drobne efekty: tumany śniegu i iskry ---
      function bits(cellIdx, cls, count, spread, tone) {
        if (calm) return;
        const r = rowOf(cellIdx), c = colOf(cellIdx);
        for (let k = 0; k < count; k++) {
          const b = el("i", `ld-bit ${cls}`);
          b.style.left = `calc(var(--g) + (${c} + 0.5) * (var(--s) + var(--g)) - var(--s) * 0.07)`;
          b.style.top = `calc(var(--g) + (${r} + 0.5) * (var(--s) + var(--g)) - var(--s) * 0.07)`;
          b.style.setProperty("--dx", (Math.random() * 2 - 1) * spread);
          b.style.setProperty("--dy", (Math.random() * 2 - 1) * spread - spread * 0.12);
          b.style.setProperty("--rot", `${rnd(360)}deg`);
          if (tone) b.style.setProperty("--bc", tone);
          b.addEventListener("animationend", () => b.remove(), { once: true });
          fx.append(b);
        }
      }

      function stopPuff(i) {
        bits(i, "ld-puff", 5, 0.32);
      }
      function warpPuff(i) {
        bits(i, "ld-puff ld-puff-cool", 7, 0.4);
        bits(i, "ld-spark", 4, 0.34, "var(--ld-gem-2)");
      }

      // Fala uderzeniowa wokół pola: rozpływa się i znika.
      function shock(i, tone, big = false) {
        if (calm) return;
        const e = el("i", `ld-shock${big ? " ld-shock-big" : ""}`);
        e.style.left = `calc(var(--g) + ${colOf(i) + 0.5} * (var(--s) + var(--g)))`;
        e.style.top = `calc(var(--g) + ${rowOf(i) + 0.5} * (var(--s) + var(--g)))`;
        if (tone) e.style.setProperty("--rc", tone);
        e.addEventListener("animationend", () => e.remove(), { once: true });
        fx.append(e);
      }

      // --- Kryształy ---
      function collect(gi) {
        const cell = cells[p.gems[gi]];
        cell.classList.add("taken");
        state.shown |= 1 << gi;
        Sound.place(gi + 2);
        bits(p.gems[gi], "ld-spark", 6, 0.34, "var(--ld-gem-2)");
        if (state.shown === full) {
          exitCell.classList.add("open");
          ctx.toast("Wyjście otwarte");
          Sound.line();
        }
        refresh();
      }

      function paintGems() {
        p.gems.forEach((_, gi) => cells[p.gems[gi]].classList.toggle("taken", !!(state.shown & (1 << gi))));
        exitCell.classList.toggle("open", state.shown === full);
      }

      // --- Ruch ---
      function move(dir) {
        if (ctx.done || state.over) return;
        if (state.busy) { state.queue = dir; return; }
        const a = glide(p, state.r, state.c, dir);
        if (!a) {
          Sound.error();
          const cell = cells[state.r * m + state.c];
          replay(cell, "shake");
          return;
        }
        save(snapshot());
        clearHints();
        clearAim();
        aimLast = -1;
        state.busy = true;
        state.moves++;
        state.gates += a.gates;
        const before = state.mask;
        const gained = a.got & ~before;
        state.mask |= a.got;
        state.queue = null;

        const newGems = [];
        for (let gi = 0; gi < p.gems.length; gi++) if (gained & (1 << gi)) newGems.push(gi);
        if (newGems.length >= 2) ctx.achieve("podwojny-lup");
        if (newGems.length >= 3) ctx.achieve("potrojny-lup");
        if (newGems.length >= 2) ctx.toast(newGems.length >= 3 ? "Trzy kryształy jednym ślizgiem" : "Dwa kryształy jednym ślizgiem");
        if (a.gates && newGems.length) ctx.achieve("bramny-slizg");
        if (a.gates) Sound.flag();

        animate(a, dir, newGems);
        refresh();
      }

      // Płynny przejazd odcinkami; brama w połowie drogi przenosi sanki z błyskiem.
      function animate(a, dir, newGems) {
        const lens = a.segs.map((s) => s.length - 1);
        const sum = Math.max(1, lens.reduce((x, y) => x + y, 0));
        const total = calm ? 0 : Math.min(620, 170 + sum * 46);
        const parts = [];
        let t = 0;
        a.segs.forEach((seg, k) => {
          const dur = calm ? 0 : Math.max(90, total * (lens[k] / sum));
          parts.push({ seg, start: t, dur });
          t += dur + (k < a.segs.length - 1 ? (calm ? 0 : 170) : 0);
        });
        const timeOf = (cell) => {
          for (const part of parts) {
            const j = part.seg.indexOf(cell);
            if (j >= 0) return part.start + part.dur * (j / Math.max(1, part.seg.length - 1));
          }
          return 0;
        };

        turn(dir);
        sled.classList.add("ld-move");
        parts.forEach((part, k) => {
          const to = part.seg[part.seg.length - 1];
          // rysa po lodzie pojawia się wraz z przejazdem sanek
          part.seg.forEach((cell, j) => {
            if (j === 0) return;
            const at = part.start + part.dur * (j / Math.max(1, part.seg.length - 1));
            later(() => {
              if (!state.trail.some((x) => x.i === cell)) state.trail.push({ i: cell, d: dir });
              addGroove(cell, dir, 0);
            }, at);
          });
          later(() => setPos(rowOf(to), colOf(to), part.dur), part.start);
          if (k < parts.length - 1) {
            later(() => {
              warpPuff(to);
              sled.classList.add("ld-warp");
              const partner = p.portal[to];
              const tone = cells[to].style.getPropertyValue("--gc").trim();
              cells[to].classList.add("ld-gate-live");
              shock(to, tone);
              if (partner >= 0) {
                cells[partner].classList.add("ld-gate-live");
                shock(partner, tone);
              }
              later(() => {
                cells[to].classList.remove("ld-gate-live");
                if (partner >= 0) cells[partner].classList.remove("ld-gate-live");
              }, 640);
            }, part.start + part.dur - 30);
            later(() => {
              setPos(rowOf(parts[k + 1].seg[0]), colOf(parts[k + 1].seg[0]), 0);
              sled.classList.remove("ld-warp");
            }, part.start + part.dur + 90);
          }
        });

        newGems.forEach((gi) => later(() => collect(gi), timeOf(p.gems[gi])));
        later(() => arrive(a), t + (calm ? 0 : 40));
      }

      function arrive(a) {
        if (state.over || ctx.done) return;
        state.r = a.r;
        state.c = a.c;
        state.busy = false;
        state.shown = state.mask;
        sled.classList.remove("ld-move");
        paintGems();
        sled.classList.add("ld-stop");
        later(() => sled.classList.remove("ld-stop"), 260);
        if (p.drift[a.r * m + a.c]) { Sound.flag(); stopPuff(a.r * m + a.c); }
        else Sound.tap();
        refresh();
        if (a.r * m + a.c === p.exit && state.mask === full) return finish();
        if (state.moves >= limit) {
          state.over = true;
          return ctx.lose("Skończyły się ruchy", `Zebrane kryształy: ${count(state.mask)} z ${p.gems.length}.`);
        }
        const next = state.queue;
        state.queue = null;
        if (next != null) move(next);
      }

      const save = ctx.undoable((snap) => {
        clearTimers();
        clearHints();
        state.busy = false;
        state.queue = null;
        Object.assign(state, snap);
        sled.classList.remove("ld-warp", "ld-stop", "ld-move");
        board.classList.remove("ld-win");
        paintTrail(null);
        paintGems();
        setPos(state.r, state.c, 0);
        refresh();
      });

      function snapshot() {
        return {
          r: state.r, c: state.c, mask: state.mask, shown: state.shown,
          moves: state.moves, hinted: state.hinted, gates: state.gates,
          trail: state.trail.slice(),
        };
      }

      function count(mask) {
        let k = 0;
        for (let i = 0; i < p.gems.length; i++) k += (mask >> i) & 1;
        return k;
      }

      function refresh() {
        const got = count(state.mask);
        const left = Math.max(0, limit - state.moves);
        movesEl.set(`${state.moves} / ${limit}`, state.moves / limit, left > 0 ? `Zostało ${left} ${plural(left, "ruch", "ruchy", "ruchów")}` : "Wykorzystany limit");
        movesNote.classList.toggle("ld-low", left <= 2);
        gemsEl.set(got, got === p.gems.length ? "Wszystkie kryształy zebrane" : `Zebrane ${got} z ${p.gems.length}`);
        ctx.progress((got + (state.mask === full && state.r === rowOf(p.exit) && state.c === colOf(p.exit) ? 1 : 0)) / (p.gems.length + 1));
      }

      // --- Podpowiedź: pierwszy ruch najlepszego rozwiązania ---
      let hintCells = [];
      function clearHints() {
        hintCells.forEach((c) => c.classList.remove("ld-hintpath"));
        hintCells = [];
      }
      function hint() {
        if (ctx.done || state.over || state.busy) return;
        const res = solve(p, state.r, state.c, state.mask);
        if (!res) return;
        state.hinted = true;
        clearHints();
        const a = glide(p, state.r, state.c, res.first);
        const path = a.segs.flat().filter((i, k, arr) => k > 0 && arr.indexOf(i) === k);
        path.forEach((i, k) => {
          cells[i].style.setProperty("--hi", k);
          cells[i].classList.add("ld-hintpath");
          hintCells.push(cells[i]);
        });
        replay(cells[a.r * m + a.c], "ui-pop");
        Sound.flag();
        ctx.toast(`Podpowiedź: zostaje ${res.dist} ${plural(res.dist, "ruch", "ruchy", "ruchów")}.`);
        later(clearHints, 1500 + path.length * 70);
      }

      function finish() {
        if (!state.hinted && ctx.undos === 0) ctx.achieve("bez-cofania");
        if (!state.hinted && lv.key !== "easy") ctx.achieve("samodzielnie");
        if (lv.key === "hard" && state.moves === p.optimal && ctx.undos === 0) ctx.achieve("bez-zbednego");
        if (lv.key === "hard" && ctx.time < 100 && !state.hinted) ctx.achieve("lodowy-mistrz");
        state.over = true;
        sled.classList.remove("ld-move");
        sled.classList.add("ld-enter");
        exitCell.classList.add("ld-done");
        board.classList.add("ld-win");
        shock(p.exit, "var(--ld-gold)", true);
        bits(p.exit, "ld-spark", 8, 0.36, "var(--ld-gold)");
        bits(p.exit, "ld-spark", 5, 0.28, "var(--ld-gold)");
        later(() => ctx.win(`Ruchy: ${state.moves} z ${limit}.`), calm ? 0 : 320);
      }

      // --- Podświetlenie drogi pod kursorem ---
      let aimCells = [];
      let aimLast = -1;
      function clearAim() {
        for (const c of aimCells) c.classList.remove("ld-aim", "ld-aim-stop");
        aimCells = [];
      }
      function aimAt(i) {
        clearAim();
        if (ctx.done || state.over || state.busy) return;
        const r = rowOf(i), c = colOf(i);
        if (r === state.r && c === state.c) return;
        if (r !== state.r && c !== state.c) return;
        const dir = r === state.r ? (c > state.c ? 3 : 2) : (r > state.r ? 1 : 0);
        const a = glide(p, state.r, state.c, dir);
        if (!a) return;
        const seen = new Set();
        for (const seg of a.segs) {
          for (let k = 1; k < seg.length; k++) {
            const idx = seg[k];
            if (seen.has(idx)) continue;
            seen.add(idx);
            const cell = cells[idx];
            cell.classList.add("ld-aim");
            aimCells.push(cell);
          }
        }
        const dest = cells[a.r * m + a.c];
        dest.classList.add("ld-aim-stop");
        if (!seen.has(a.r * m + a.c)) aimCells.push(dest);
      }

      // --- Sterowanie ---
      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (e.target.closest?.("input, textarea, select")) return;
        const dir = KEYDIR[e.key.toLowerCase()];
        if (dir == null) return;
        e.preventDefault();
        move(dir);
      });

      function moveToCell(i) {
        if (ctx.done || state.over) return;
        const r = rowOf(i), c = colOf(i);
        if (r === state.r && c === state.c) return;
        if (r === state.r) return move(c > state.c ? 3 : 2);
        if (c === state.c) return move(r > state.r ? 1 : 0);
        Sound.error();
        replay(cells[i], "shake");
        ctx.toast("Sanki jadą w linii z polem");
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b || b.classList.contains("wall")) return;
        if (performance.now() - (board.dataset.swipeAt || 0) < 350) return;
        moveToCell(+b.dataset.i);
      });

      ctx.on(board, "pointermove", (e) => {
        const b = e.target.closest?.(".gb-cell");
        const i = b ? +b.dataset.i : -1;
        if (i === aimLast) return;
        aimLast = i;
        if (i < 0) clearAim(); else aimAt(i);
      });
      ctx.on(board, "pointerleave", () => { aimLast = -1; clearAim(); });

      let from = null;
      ctx.on(board, "pointerdown", (e) => { from = [e.clientX, e.clientY]; });
      ctx.on(document, "pointerup", (e) => {
        if (!from) return;
        const dx = e.clientX - from[0], dy = e.clientY - from[1];
        from = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
        board.dataset.swipeAt = String(performance.now());
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 1 : 0);
      });

      // --- Śnieg i połysk lodu na płótnie nad planszą ---
      function snowfall() {
        if (calm) return;
        const g = snow.getContext("2d");
        const flakes = Array.from({ length: 42 }, () => ({
          x: Math.random(), y: Math.random(),
          r: 0.6 + Math.random() * 1.9,
          v: 0.035 + Math.random() * 0.07,
          p: Math.random() * 6.283,
          a: 0.14 + Math.random() * 0.42,
        }));
        const glints = [];
        let last = 0, spawn = 0, raf = 0;
        const color = () => ({
          flake: getComputedStyle(probe).backgroundColor,
          shine: getComputedStyle(board).getPropertyValue("--ld-shine").trim() || "#ffffff",
        });
        let c = color();
        ctx.on(matchMedia("(prefers-color-scheme: dark)"), "change", () => { c = color(); });
        const tick = (ts) => {
          const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
          last = ts;
          g.clearRect(0, 0, 640, 640);
          for (const f of flakes) {
            f.y += f.v * dt;
            f.x += Math.sin(ts / 2800 + f.p) * 0.03 * dt + 0.012 * dt;
            if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
            if (f.x > 1.02) f.x = -0.02;
            g.globalAlpha = f.a;
            g.fillStyle = c.flake;
            g.beginPath();
            g.arc(f.x * 640, f.y * 640, f.r, 0, 6.283);
            g.fill();
          }
          spawn -= dt;
          if (spawn <= 0) {
            spawn = 0.28 + Math.random() * 0.4;
            glints.push({ x: Math.random(), y: Math.random(), life: 0, max: 0.8 + Math.random() * 0.5, s: 3 + Math.random() * 5 });
          }
          for (let i = glints.length - 1; i >= 0; i--) {
            const gl = glints[i];
            gl.life += dt;
            const k = gl.life / gl.max;
            if (k >= 1) { glints.splice(i, 1); continue; }
            const a = Math.sin(k * Math.PI) * 0.5;
            g.globalAlpha = a;
            g.strokeStyle = c.shine;
            g.lineWidth = 1.4;
            const x = gl.x * 640, y = gl.y * 640, s = gl.s * Math.sin(k * Math.PI);
            g.beginPath();
            g.moveTo(x - s, y); g.lineTo(x + s, y);
            g.moveTo(x, y - s); g.lineTo(x, y + s);
            g.stroke();
          }
          g.globalAlpha = 1;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        ctx.onStop(() => cancelAnimationFrame(raf));
      }

      paintTrail(null);
      paintGems();
      setPos(state.r, state.c, 0);
      turn(0);
      refresh();
      snowfall();
    },
  });
}
