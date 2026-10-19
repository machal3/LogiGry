// Lodowisko: sanki ślizgają się po lodzie, aż zatrzyma je ściana albo krawędź planszy.
// Trzeba zebrać wszystkie kryształy i zatrzymać się na wyjściu, mieszcząc się w limicie ruchów.
{
  const VEC = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // góra, dół, lewo, prawo
  const DIRS = ["up", "down", "left", "right"];
  const DIRI = { up: 0, down: 1, left: 2, right: 3 };
  const KEYDIR = { arrowup: 0, w: 0, arrowdown: 1, s: 1, arrowleft: 2, a: 2, arrowright: 3, d: 3 };

  // Ślizg w kierunku `dir`: zwraca pole zatrzymania.
  function slide(n, m, wall, r, c, dir) {
    const [dr, dc] = VEC[dir];
    let nr = r, nc = c;
    for (;;) {
      const tr = nr + dr, tc = nc + dc;
      if (tr < 0 || tr >= n || tc < 0 || tc >= m || wall[tr * m + tc]) break;
      nr = tr; nc = tc;
    }
    return [nr, nc];
  }

  // Ślizg razem ze zbieraniem kryształów po drodze. Zwraca null, gdy nic się nie ruszy.
  function advance(n, m, wall, gemAt, r, c, dir, mask) {
    const [dr, dc] = VEC[dir];
    let nr = r, nc = c, got = 0;
    for (;;) {
      const tr = nr + dr, tc = nc + dc;
      if (tr < 0 || tr >= n || tc < 0 || tc >= m || wall[tr * m + tc]) break;
      nr = tr; nc = tc;
      const g = gemAt[nr * m + nc];
      if (g >= 0 && !(mask & (1 << g))) got |= 1 << g;
    }
    if (nr === r && nc === c) return null;
    return { r: nr, c: nc, got, mask: mask | got };
  }

  // Najkrótsze rozwiązanie metodą BFS po stanach (pole, zbiór kryształów).
  // Zwraca { dist, first } albo null, gdy z tego stanu nie da się wygrać.
  function search(n, m, wall, gems, startIdx, exitIdx, startMask = 0) {
    const gcount = gems.length, full = (1 << gcount) - 1;
    const gemAt = new Int8Array(n * m).fill(-1);
    gems.forEach((g, i) => { gemAt[g] = i; });
    const span = 1 << gcount;
    const total = n * m * span;
    const prev = new Int32Array(total).fill(-1);
    const pdir = new Int8Array(total);
    const startId = startIdx * span + startMask;
    const goalId = exitIdx * span + full;
    const seen = new Uint8Array(total);
    seen[startId] = 1;
    const q = new Int32Array(total);
    let head = 0, tail = 0;
    q[tail++] = startId;
    while (head < tail) {
      const id = q[head++];
      if (id === goalId) {
        const dirs = [];
        let cur = id;
        while (cur !== startId) { dirs.push(pdir[cur]); cur = prev[cur]; }
        dirs.reverse();
        return { dist: dirs.length, first: dirs[0] };
      }
      const mask = id % span, pos = (id - mask) / span;
      const r = (pos / m) | 0, c = pos % m;
      for (let d = 0; d < 4; d++) {
        const a = advance(n, m, wall, gemAt, r, c, d, mask);
        if (!a) continue;
        const nid = (a.r * m + a.c) * span + a.mask;
        if (seen[nid]) continue;
        seen[nid] = 1;
        prev[nid] = id;
        pdir[nid] = d;
        q[tail++] = nid;
      }
    }
    return null;
  }

  // Jedna losowa plansza: ściany, sanki, kryształy i wyjście. Null, gdy się nie ułoży.
  function attempt(n, m, gems) {
    const wall = new Uint8Array(n * m);
    const density = 14 + rnd(9);
    for (let r = 1; r < n - 1; r++) for (let c = 1; c < m - 1; c++) if (rnd(100) < density) wall[r * m + c] = 1;
    const free = [];
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < m; c++) {
        const i = r * m + c;
        if (wall[i]) continue;
        let open = 0;
        for (const [dr, dc] of VEC) {
          const tr = r + dr, tc = c + dc;
          if (tr >= 0 && tr < n && tc >= 0 && tc < m && !wall[tr * m + tc]) open++;
        }
        if (open > 0) free.push(i); // pole bez wolnego sąsiada jest nieosiągalne
      }
    }
    if (free.length < n * m * 0.7) return null;
    shuffle(free);
    const start = free[0], exit = free[1];
    const gs = free.slice(2, 2 + gems);
    if (gs.length < gems) return null;
    const res = search(n, m, wall, gs, start, exit);
    if (!res || res.dist < 4) return null;
    return { n, m, wall, start, exit, gems: gs, optimal: res.dist };
  }

  // Bezpieczna plansza na wypadek, gdyby losowania nie dały nic sensownego.
  function fallback(n, m, gems) {
    const gs = [];
    for (let i = 1; i <= gems; i++) gs.push(i * m + (m - 1));
    return { n, m, wall: new Uint8Array(n * m), start: 0, exit: (n - 1) * m + (m - 1), gems: gs, optimal: 2 };
  }

  // Plansza o najlepszym z losowań: im dłuższe rozwiązanie, tym ciekawsza łamigłówka.
  function puzzle(n, m, gems, want) {
    let best = null;
    for (let att = 0; att < 90; att++) {
      const c = attempt(n, m, gems);
      if (!c) continue;
      if (!best || c.optimal > best.optimal) best = c;
      if (best.optimal >= want) break;
    }
    return best || fallback(n, m, gems);
  }

  if (typeof module !== "undefined") module.exports = { puzzle, slide, advance, search, attempt, DIRS, DIRI };

  if (typeof registerGame !== "undefined") registerGame({
    id: "lodowisko",
    cat: "lamiglowki",
    name: "Lodowisko",
    author: "DeepSeek V4.1 Flash",
    desc: "Ślizgaj się po lodzie od ściany do ściany, zbierz wszystkie kryształy i zatrzymaj się na wyjściu.",
    color: "#5d4037",
    ink: "#ffffff",
    glyph: ["..#..", ".#.#.", "#####", ".#.#.", "..#.."],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, n: 6, m: 6, gems: 2, slack: 6, want: 7 },
      { key: "medium", name: "Średni", points: 25, n: 8, m: 8, gems: 3, slack: 6, want: 10 },
      { key: "hard", name: "Trudny", points: 50, n: 10, m: 10, gems: 4, slack: 6, want: 13 },
    ],
    rules: [
      "Sanki ruszają w wybranym kierunku i ślizgają się, aż zatrzyma je ściana albo krawędź planszy. W połowie drogi nie da się stanąć.",
      "Po drodze zbierasz kryształy. Zbierz wszystkie, a potem zatrzymaj się na wyjściu.",
      "Sterowanie: strzałki lub WASD, na telefonie przesunięcie palcem po planszy albo przyciski na dole panelu.",
      "Każdy poziom ma limit ruchów: najlepsze rozwiązanie plus zapas. Przekroczenie limitu kończy próbę.",
    ],
    achievements: [
      { id: "bez-cofania", name: "Bez cofania", desc: "Wygraj poziom bez cofnięcia ruchu.", points: 10 },
      { id: "jeden-slizg", name: "Podwójny łup", desc: "Zbierz dwa kryształy jednym ślizgiem.", points: 10 },
      { id: "potrojny", name: "Potrójny łup", desc: "Zbierz trzy kryształy jednym ślizgiem.", points: 25 },
      { id: "bez-zbednego", name: "Bez zbędnego ruchu", desc: "Wygraj poziom trudny w liczbie ruchów równej najlepszemu rozwiązaniu.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, m, slack } = ctx.level;
      const p = puzzle(n, m, ctx.level.gems, ctx.level.want);
      const limit = p.optimal + slack;
      const full = (1 << p.gems.length) - 1;
      const gemAt = new Int8Array(n * m).fill(-1);
      p.gems.forEach((g, i) => { gemAt[g] = i; });
      const sr = (p.start / m) | 0, sc = p.start % m;
      const state = { r: sr, c: sc, mask: 0, moves: 0, over: false, hinted: false, trail: [] };

      const cells = gridCells(board, m, n, "ld", { gap: 0.05 });
      cells.forEach((cell, i) => {
        if (p.wall[i]) { cell.classList.add("wall"); cell.tabIndex = -1; cell.setAttribute("aria-label", "Ściana"); }
      });
      cells[p.exit].classList.add("exit");
      cells[p.exit].setAttribute("aria-label", `Wyjście, wiersz ${((p.exit / m) | 0) + 1}, kolumna ${(p.exit % m) + 1}`);
      p.gems.forEach((g) => cells[g].setAttribute("aria-label", "Kryształ"));

      const movesEl = statBlock(ctx, "Ruchy", { meter: true });
      const gemsEl = statBlock(ctx, "Kryształy", { small: true });
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      const tkeys = { onTap: (k) => move(DIRI[k]) };
      touchPad(ctx, tkeys, [
        ["arrowup", "W górę", "i-up"],
        ["arrowdown", "W dół", "i-down"],
        ["arrowleft", "W lewo", "i-left"],
        ["arrowright", "W prawo", "i-right"],
      ]);

      const save = ctx.undoable((snap) => { Object.assign(state, snap); render(); });

      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (e.target.closest?.("input, textarea, select")) return;
        const dir = KEYDIR[e.key.toLowerCase()];
        if (dir == null) return;
        e.preventDefault();
        move(dir);
      });

      let from = null;
      ctx.on(board, "pointerdown", (e) => { from = [e.clientX, e.clientY]; });
      ctx.on(document, "pointerup", (e) => {
        if (!from) return;
        const dx = e.clientX - from[0], dy = e.clientY - from[1];
        from = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : dy > 0 ? 1 : 0);
      });

      function move(dir) {
        if (ctx.done || state.over) return;
        const a = advance(n, m, p.wall, gemAt, state.r, state.c, dir, state.mask);
        if (!a) { Sound.error(); replay(cells[state.r * m + state.c], "shake"); return; }
        save({ r: state.r, c: state.c, mask: state.mask, moves: state.moves, hinted: state.hinted, over: state.over });
        const gained = a.got ? a.got.toString(2).split("1").length - 1 : 0;
        state.trail = trailOf(state.r, state.c, a.r, a.c);
        state.r = a.r; state.c = a.c; state.mask = a.mask; state.moves++;
        if (gained) {
          Sound.place(gained + 2);
          if (gained >= 2) ctx.achieve("jeden-slizg");
          if (gained >= 3) ctx.achieve("potrojny");
        } else Sound.tap();
        render();
        if (state.r * m + state.c === p.exit && state.mask === full) return finish();
        if (state.moves >= limit) {
          state.over = true;
          return ctx.lose("Skończyły się ruchy", `Zebrane kryształy: ${count(state.mask)} z ${p.gems.length}.`);
        }
      }

      function trailOf(r0, c0, r1, c1) {
        const out = [];
        const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
        for (let r = r0 + dr, c = c0 + dc; r !== r1 || c !== c1; r += dr, c += dc) out.push(r * m + c);
        return out;
      }

      function count(mask) { let k = 0; for (let i = 0; i < p.gems.length; i++) k += (mask >> i) & 1; return k; }

      function hint() {
        if (ctx.done || state.over) return;
        const res = search(n, m, p.wall, p.gems, state.r * m + state.c, p.exit, state.mask);
        if (!res) return;
        state.hinted = true;
        const a = advance(n, m, p.wall, gemAt, state.r, state.c, res.first, state.mask);
        if (a) replay(cells[a.r * m + a.c], "hint");
        ctx.toast(`Podpowiedź: zostaje co najmniej ${res.dist} ${plural(res.dist, "ruch", "ruchy", "ruchów")}.`);
      }

      function finish() {
        if (!state.hinted && ctx.undos === 0) ctx.achieve("bez-cofania");
        if (ctx.level.key === "hard" && state.moves === p.optimal && ctx.undos === 0) ctx.achieve("bez-zbednego");
        ctx.win(`Ruchy: ${state.moves} z ${limit}.`);
      }

      function render() {
        const sled = state.r * m + state.c;
        cells.forEach((cell, i) => {
          cell.classList.toggle("sled", i === sled);
          cell.classList.toggle("gem", gemAt[i] >= 0 && !(state.mask & (1 << gemAt[i])));
          cell.classList.toggle("trail", state.trail.includes(i));
        });
        movesEl.set(`${state.moves} z ${limit}`, state.moves / limit, "");
        gemsEl.set(`${count(state.mask)} z ${p.gems.length}`, null, "");
        ctx.progress((count(state.mask) + (state.mask === full && sled === p.exit ? 1 : 0)) / (p.gems.length + 1));
      }
      render();
    },
  });
}
