// Fabryka: na hali stoi źródło surowca i cele. Gracz stawia taśmy i kieruje nimi tak,
// aby surowiec przejechał przez wszystkie cele, nie przekraczając budżetu taśm.
{
  const VEC = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // prawo, dół, lewo, góra
  const ARROW = ["▶", "▼", "◀", "▲"];

  // Kierunek, w którym ścieżka wychodzi z pola `a` do sąsiada `b`.
  function dirOf(m, a, b) {
    if (b === a + 1) return 0;
    if (b === a + m) return 1;
    if (b === a - 1) return 2;
    return 3;
  }

  // Samo-unikająca się ścieżka o zadanej długości (z powrotami, więc znajduje ją szybko).
  function walk(n, m, start, len) {
    const taken = new Uint8Array(n * m);
    const path = [start];
    taken[start] = 1;
    const go = () => {
      if (path.length === len) return true;
      const cur = path[path.length - 1];
      const r = (cur / m) | 0, c = cur % m;
      const opts = shuffle([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .filter(([rr, cc]) => rr >= 0 && rr < n && cc >= 0 && cc < m)
        .map(([rr, cc]) => rr * m + cc));
      for (const idx of opts) {
        if (taken[idx]) continue;
        taken[idx] = 1;
        path.push(idx);
        if (go()) return true;
        path.pop();
        taken[idx] = 0;
      }
      return false;
    };
    return go() ? path : null;
  }

  // Rozwiązanie dla danych taśm: zwraca przebieg surowca i wynik.
  function simulate(n, m, wall, source, sdir, targets, dirs) {
    const isT = new Set(targets);
    const seen = new Set();
    let cur = source, dir = sdir;
    const path = [cur];
    if (isT.has(cur)) seen.add(cur);
    for (let step = 0; step <= n * m * 4; step++) {
      const [dr, dc] = VEC[dir];
      const r = ((cur / m) | 0) + dr, c = (cur % m) + dc;
      if (r < 0 || r >= n || c < 0 || c >= m) return { path, ok: false, reason: "Surowiec wypadł z hali", visited: seen.size };
      const nxt = r * m + c;
      if (wall[nxt]) return { path, ok: false, reason: "Surowiec uderzył w ścianę", visited: seen.size };
      const special = isT.has(nxt) || nxt === source;
      if (!special && dirs[nxt] < 0) return { path, ok: false, reason: "Surowiec zjechał z taśmy", visited: seen.size };
      cur = nxt;
      path.push(cur);
      if (isT.has(cur)) {
        seen.add(cur);
        if (seen.size === targets.length) return { path, ok: true, reason: "", visited: seen.size };
      }
      dir = nxt === source ? sdir : special ? dir : dirs[cur];
    }
    return { path, ok: false, reason: "Surowiec krąży w kółko", visited: seen.size };
  }

  // Prosty przejazd w pierwszym rzędzie: pewna hala na wypadek nieudanych losowań.
  function straight(n, m, targets) {
    const idx = [];
    for (let i = 0; i < targets - 1; i++) idx.push(1 + Math.round((i + 1) * (m - 2) / targets));
    const tIdx = [...new Set([...idx, m - 1])].sort((a, b) => a - b).slice(-targets);
    const tSet = new Set(tIdx);
    const belts = [];
    for (let i = 1; i <= m - 1; i++) if (!tSet.has(i)) belts.push([i, 0]);
    return {
      n, m, wall: new Uint8Array(n * m), source: 0, sdir: 0,
      targets: tIdx.slice().sort((a, b) => a - b), belts, need: belts.length,
    };
  }

  // Hala: źródło, cele i przejazd, który na pewno działa. Reszta pól to placek pod ściany i taśmy.
  function generate(n, m, len, targets) {
    for (let att = 0; att < 400; att++) {
      const path = walk(n, m, rnd(n * m), len + rnd(3));
      if (!path) continue;
      // cel musi leżeć na prostym odcinku (cel przepuszcza surowiec prosto)
      const cand = [path.length - 1];
      for (let i = 1; i < path.length - 1; i++) {
        if (dirOf(m, path[i - 1], path[i]) === dirOf(m, path[i], path[i + 1])) cand.push(i);
      }
      if (cand.length < targets) continue;
      const last = cand.shift();
      const rest = shuffle(cand).slice(0, targets - 1);
      const tIdx = [last, ...rest].sort((a, b) => a - b);
      const tSet = new Set(tIdx);
      const belts = [];
      for (let i = 1; i < path.length; i++) {
        if (tSet.has(i)) continue;
        belts.push([path[i], dirOf(m, path[i], path[i + 1])]);
      }
      if (!belts.length) continue;
      const onPath = new Set(path);
      const wall = new Uint8Array(n * m);
      for (let i = 0; i < n * m; i++) if (!onPath.has(i) && rnd(100) < 15) wall[i] = 1;
      const dirs = new Int8Array(n * m).fill(-1);
      belts.forEach(([cell, d]) => { dirs[cell] = d; });
      const fit = simulate(n, m, wall, path[0], dirOf(m, path[0], path[1]), tIdx.map((i) => path[i]), dirs);
      if (!fit.ok) continue;
      return {
        n, m, wall, source: path[0], sdir: dirOf(m, path[0], path[1]),
        targets: tIdx.map((i) => path[i]), belts, need: belts.length,
      };
    }
    return straight(n, m, targets);
  }

  if (typeof module !== "undefined") module.exports = { generate, simulate, walk, dirOf, straight, VEC };

  if (typeof registerGame !== "undefined") registerGame({
    id: "fabryka",
    cat: "strategia",
    name: "Fabryka",
    author: "DeepSeek V4.1 Flash",
    desc: "Stawiaj taśmy i kieruj nimi surowiec od źródła przez wszystkie cele, mieszcząc się w budżecie.",
    color: "#455a64",
    ink: "#ffffff",
    glyph: ["#.#.#", ".###.", "#####", ".#.#.", "#.#.#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, n: 5, m: 5, len: 8, targets: 2, slack: 4, tries: 5 },
      { key: "medium", name: "Średni", points: 25, n: 6, m: 6, len: 11, targets: 3, slack: 3, tries: 4 },
      { key: "hard", name: "Trudny", points: 50, n: 7, m: 7, len: 14, targets: 4, slack: 3, tries: 3 },
    ],
    rules: [
      "Surowiec wyjeżdża ze źródła i jedzie w stronę, którą wskazuje. Taśma kieruje go w swoją stronę, a cele przepuszczają prosto.",
      "Kliknięcie pustego pola stawia taśmę, a kliknięcie taśmy obraca ją w prawo. Prawy przycisk myszy albo klawisz X usuwa taśmę.",
      "Strzałki przesuwają kursor, R obraca taśmę pod kursorem, a przycisk „Uruchom taśmę” puszcza surowiec i pokazuje, dokąd dojechał.",
      "Cele przepuszczają surowiec prosto, ściany go zatrzymują, a budżet ogranicza liczbę taśm.",
      "Wygraj, zanim skończą się próby. Surowiec musi przejechać przez wszystkie cele.",
    ],
    achievements: [
      { id: "pierwsza-proba", name: "Pierwsza próba", desc: "Wygraj poziom łatwy za pierwszym uruchomieniem taśmy.", points: 10 },
      { id: "bez-cofania", name: "Bez cofania", desc: "Wygraj dowolny poziom bez cofnięcia ruchu.", points: 10 },
      { id: "maszynista", name: "Maszynista", desc: "Wygraj poziom średni za pierwszym uruchomieniem taśmy.", points: 25 },
      { id: "mistrz-linii", name: "Mistrz linii", desc: "Wygraj poziom trudny za pierwszym uruchomieniem taśmy.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, m, tries, slack } = ctx.level;
      const p = generate(n, m, ctx.level.len, ctx.level.targets);
      const budget = p.need + slack;
      const dirs = new Int8Array(n * m).fill(-1);
      const isT = new Set(p.targets);
      let sel = p.source, runs = 0, failed = 0, busy = false, seen = 0;

      const cells = gridCells(board, m, n, "fb", { gap: 0.06 });
      cells.forEach((cell, i) => {
        if (p.wall[i]) { cell.classList.add("wall"); cell.tabIndex = -1; cell.setAttribute("aria-label", "Ściana"); }
        else if (i === p.source) { cell.classList.add("src"); cell.setAttribute("aria-label", "Źródło surowca"); }
        else if (isT.has(i)) { cell.classList.add("cel"); cell.setAttribute("aria-label", `Cel ${p.targets.indexOf(i) + 1}`); }
      });

      const tapeEl = statBlock(ctx, "Taśmy", { meter: true });
      const celEl = statBlock(ctx, "Cele w trasie", { small: true });
      ctx.panel.append(panelBlock("", button("Uruchom taśmę", "btn wide", run)));
      ctx.panel.append(panelBlock("",
        button("Obróć taśmę", "btn-ghost wide", () => turn(sel)),
        button("Usuń taśmę", "btn-ghost wide", () => clear(sel)),
        button("Wyczyść hale", "btn-ghost wide", clearAll)));

      const save = ctx.undoable((snap) => { dirs.set(snap.dirs); sel = snap.sel; seen = snap.seen; runs = snap.runs; failed = snap.failed; render(); });

      const keep = () => ({ dirs: Int8Array.from(dirs), sel, seen, runs, failed });

      function used() { let k = 0; for (const d of dirs) if (d >= 0) k++; return k; }

      function place(i) {
        if (ctx.done || busy || p.wall[i] || i === p.source || isT.has(i)) return;
        if (dirs[i] < 0 && used() >= budget) { ctx.toast("Budżet taśm już się skończył"); Sound.error(); return; }
        save(keep());
        if (dirs[i] < 0) dirs[i] = 0;
        else dirs[i] = (dirs[i] + 1) % 4;
        Sound.place(1 + (used() % 4));
        render();
      }

      function turn(i) {
        if (ctx.done || busy || dirs[i] < 0) return;
        save(keep());
        dirs[i] = (dirs[i] + 1) % 4;
        Sound.tap();
        render();
      }

      function clear(i) {
        if (ctx.done || busy || dirs[i] < 0) return;
        save(keep());
        dirs[i] = -1;
        Sound.erase();
        render();
      }

      function clearAll() {
        if (ctx.done || busy) return;
        save(keep());
        dirs.fill(-1);
        Sound.erase();
        render();
      }

      function run() {
        if (ctx.done || busy) return;
        busy = true;
        const sim = simulate(n, m, p.wall, p.source, p.sdir, p.targets, dirs);
        runs += 1;
        if (!sim.ok) failed += 1;
        cells.forEach((cell) => cell.classList.remove("flow", "cargo", "bad", "done"));
        cells[sim.path[0]].classList.add("flow", "cargo");
        let k = 1;
        const tick = () => {
          if (k >= sim.path.length) {
            cells[sim.path[sim.path.length - 1]].classList.remove("cargo");
            return arrive(sim);
          }
          cells[sim.path[k - 1]].classList.remove("cargo");
          cells[sim.path[k]].classList.add("flow", "cargo");
          if (isT.has(sim.path[k])) Sound.tap();
          k++;
        };
        const iv = setInterval(tick, 140);
        ctx.onStop(() => clearInterval(iv));
      }

      function arrive(sim) {
        busy = false;
        seen = sim.visited;
        celEl.set(`${seen} z ${p.targets.length}`, null, "");
        ctx.progress(seen / p.targets.length);
        if (sim.ok) {
          p.targets.forEach((t) => cells[t].classList.add("done"));
          return finish();
        }
        const last = sim.path[sim.path.length - 1];
        cells[last].classList.add("bad");
        replay(cells[last], "shake");
        Sound.error();
        render();
        if (failed >= tries) ctx.lose("Linia stanęła", `${sim.reason}. Cele w trasie: ${seen} z ${p.targets.length}.`);
        else ctx.toast(`${sim.reason}. Popraw taśmy i spróbuj ponownie`);
      }

      function finish() {
        if (runs === 1 && ctx.level.key === "easy") ctx.achieve("pierwsza-proba");
        if (runs === 1 && ctx.level.key === "medium") ctx.achieve("maszynista");
        if (runs === 1 && ctx.level.key === "hard") ctx.achieve("mistrz-linii");
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        ctx.win(`Taśmy: ${used()} z ${budget}.`);
      }

      board.addEventListener("click", (e) => {
        const cell = e.target.closest(".fb .gb-cell");
        if (!cell) return;
        sel = +cell.dataset.i;
        place(sel);
        render();
      });
      ctx.on(board, "contextmenu", (e) => {
        e.preventDefault();
        const cell = e.target.closest(".fb .gb-cell");
        if (cell) clear(+cell.dataset.i);
      });
      cellKeys(ctx, {
        cols: m, rows: n,
        get: () => sel,
        set: (i) => { sel = i; render(); },
        keys: { r: () => turn(sel), x: () => clear(sel), backspace: () => clear(sel) },
      });

      function render() {
        cells.forEach((cell, i) => {
          cell.textContent = "";
          cell.classList.toggle("tape", dirs[i] >= 0);
          cell.classList.toggle("cursor", i === sel);
          if (i === p.source) cell.textContent = ARROW[p.sdir];
          else if (isT.has(i)) cell.textContent = String(p.targets.indexOf(i) + 1);
          else if (dirs[i] >= 0) cell.textContent = ARROW[dirs[i]];
        });
        tapeEl.set(`${used()} z ${budget}`, used() / budget, "");
        celEl.set(`${seen} z ${p.targets.length}`, null, "");
      }
      render();
    },
  });
}
