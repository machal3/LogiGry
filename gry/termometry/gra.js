// Termometry: napełnij termometry od bańki tak, by liczby przy wierszach i kolumnach się zgadzały.
{
  // --- Logika bez DOM (test.js) ---

  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // n, e, s, w

  // Dzieli planszę n × n na termometry (ścieżki od bańki). bend: czy mogą skręcać.
  function split(n, maxLen, bend) {
    const owner = new Array(n * n).fill(-1);
    const thermos = [];
    for (const start of shuffle([...Array(n * n).keys()])) {
      if (owner[start] >= 0) continue;
      const path = [start];
      owner[start] = thermos.length;
      const len = 2 + rnd(maxLen - 1);
      let dir = -1;
      while (path.length < len) {
        const cur = path[path.length - 1], r = (cur / n) | 0, c = cur % n;
        const free = [0, 1, 2, 3].filter((d) => {
          if (dir >= 0 && !bend && d !== dir) return false;
          const rr = r + DIRS[d][0], cc = c + DIRS[d][1];
          return rr >= 0 && rr < n && cc >= 0 && cc < n && owner[rr * n + cc] < 0;
        });
        if (!free.length) break;
        dir = dir >= 0 && free.includes(dir) && rnd(3) ? dir : pick(free);
        const next = (r + DIRS[dir][0]) * n + c + DIRS[dir][1];
        owner[next] = thermos.length;
        path.push(next);
      }
      thermos.push(path);
    }
    // samotną bańkę doklej na koniec sąsiedniego termometru (bez skrętu, jeśli skręty są wyłączone)
    const adj = (a, b) => Math.abs(a - b) === n || (Math.abs(a - b) === 1 && ((a / n) | 0) === ((b / n) | 0));
    for (const one of thermos.filter((t) => t.length === 1)) {
      const host = thermos.find((t) => {
        const end = t[t.length - 1];
        return t.length > 1 && t.length < maxLen + 1 && adj(end, one[0]) && (bend || end - t[t.length - 2] === one[0] - end);
      });
      if (host) { host.push(one[0]); one.pop(); }
    }
    return thermos.filter((t) => t.length);
  }

  const counts = (n, thermos, levels) => {
    const rows = new Array(n).fill(0), cols = new Array(n).fill(0);
    thermos.forEach((t, k) => t.slice(0, levels[k]).forEach((i) => { rows[(i / n) | 0]++; cols[i % n]++; }));
    return { rows, cols };
  };

  // Liczy rozwiązania (do limit). Termometry po kolei, odcinanie po sumach wierszy i kolumn.
  function solve(n, thermos, rows, cols, limit = 2) {
    const order = thermos.map((t, k) => k).sort((a, b) => Math.min(...thermos[a]) - Math.min(...thermos[b]));
    const rc = new Array(n).fill(0), cc = new Array(n).fill(0), rr = new Array(n).fill(n), cr = new Array(n).fill(n);
    const levels = new Array(thermos.length).fill(0);
    let found = 0, first = null;
    const ok = (t) => t.every((i) => {
      const r = (i / n) | 0, c = i % n;
      return rc[r] <= rows[r] && rc[r] + rr[r] >= rows[r] && cc[c] <= cols[c] && cc[c] + cr[c] >= cols[c];
    });
    (function rec(k) {
      if (found >= limit) return;
      if (k === order.length) { if (!found) first = levels.slice(); found++; return; }
      const t = thermos[order[k]];
      t.forEach((i) => { rr[(i / n) | 0]--; cr[i % n]--; });
      for (let l = 0; l <= t.length; l++) {
        if (l) { const i = t[l - 1]; rc[(i / n) | 0]++; cc[i % n]++; }
        levels[order[k]] = l;
        if (ok(t)) rec(k + 1);
      }
      t.forEach((i) => { rc[(i / n) | 0]--; cc[i % n]--; rr[(i / n) | 0]++; cr[i % n]++; });
    })(0);
    return { found, first };
  }

  // Losuje planszę z jednym rozwiązaniem.
  function generate(n, maxLen, bend) {
    for (;;) {
      const thermos = split(n, maxLen, bend);
      const sol = thermos.map((t) => rnd(t.length + 1));
      const { rows, cols } = counts(n, thermos, sol);
      if (rows.reduce((a, b) => a + b, 0) >= n && solve(n, thermos, rows, cols).found === 1) return { n, thermos, sol, rows, cols };
    }
  }

  if (typeof module !== "undefined") module.exports = { split, solve, generate, counts };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "termometry",
    cat: "logiczne",
    name: "Termometry",
    author: "Claude Opus 5.5",
    desc: "Napełnij termometry od bańki tak, by liczby przy wierszach i kolumnach zgadzały się z wypełnionymi polami.",
    color: "#c0392b",
    ink: "#ffffff",
    glyph: ["#.###", "#....", "#.#..", "..#.#", "###.#"],
    levels: [
      { key: "easy", name: "5 × 5", points: 10, n: 5, maxLen: 4, bend: false },
      { key: "medium", name: "6 × 6", points: 25, n: 6, maxLen: 5, bend: true },
      { key: "hard", name: "8 × 8", points: 50, n: 8, maxLen: 6, bend: true },
    ],
    rules: [
      "Termometr napełnia się od bańki bez przerw: pole jest pełne tylko razem ze wszystkimi polami bliżej bańki.",
      "Liczba przy wierszu i kolumnie mówi, ile pól w nim jest wypełnionych.",
      "Kliknij pole, by napełnić termometr do niego. Kliknięcie ostatniego pełnego pola obniża poziom o jedno.",
      "Strzałki przesuwają kursor, spacja działa jak kliknięcie.",
    ],
    achievements: [
      { id: "bez-cofania", name: "Pewna ręka", desc: "Rozwiąż planszę bez cofania i bez podpowiedzi.", points: 10 },
      { id: "sprint", name: "Szybki pomiar", desc: "Rozwiąż poziom 6 × 6 w mniej niż 90 sekund.", points: 25 },
      { id: "goraczka", name: "Gorączka", desc: "Rozwiąż poziom 8 × 8 w mniej niż 3 minuty bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const p = generate(ctx.level.n, ctx.level.maxLen, ctx.level.bend);
      const { n, thermos, sol, rows, cols } = p;
      const m = n + 1;
      const s = { levels: thermos.map(() => 0), cursor: 0, hints: 0 };
      const owner = [], pos = [];
      thermos.forEach((t, k) => t.forEach((i, j) => { owner[i] = k; pos[i] = j; }));

      const all = gridCells(board, m, m, "tm", { gap: 0.06, label: null });
      board.style.setProperty("--max", "72px");
      const cells = Array.from({ length: n * n }, (_, i) => all[(((i / n) | 0) + 1) * m + (i % n) + 1]);
      const rowClue = rows.map((_, r) => all[(r + 1) * m]);
      const colClue = cols.map((_, c) => all[c + 1]);
      all[0].classList.add("corner");
      all[0].setAttribute("aria-label", "Liczby pełnych pól w wierszach i kolumnach");
      [all[0], ...rowClue, ...colClue].forEach((b) => { b.disabled = true; b.tabIndex = -1; });
      rowClue.forEach((b, r) => { b.classList.add("clue"); b.textContent = rows[r]; b.setAttribute("aria-label", `Wiersz ${r + 1}: ${rows[r]} pełnych`); });
      colClue.forEach((b, c) => { b.classList.add("clue"); b.textContent = cols[c]; b.setAttribute("aria-label", `Kolumna ${c + 1}: ${cols[c]} pełnych`); });

      // kierunek z pola a do sąsiada b: n, e, s, w
      const side = (a, b) => (b === a - n ? "n" : b === a + 1 ? "e" : b === a + n ? "s" : "w");
      thermos.forEach((t) => t.forEach((i, j) => {
        const b = cells[i];
        b.dataset.t = i;
        b.style.setProperty("--k", ((i / n) | 0) + (i % n));
        if (j === 0) b.classList.add("bulb");
        else b.classList.add("p-" + side(i, t[j - 1]));
        if (j < t.length - 1) b.classList.add("x-" + side(i, t[j + 1]));
      }));

      const info = statBlock(ctx, "Pełne pola", { meter: true });
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));
      const save = ctx.undoable((snap) => { s.levels = snap; render(); });
      const goal = rows.reduce((a, b) => a + b, 0);

      function press(i) {
        if (ctx.done) return;
        s.cursor = i;
        const k = owner[i], want = s.levels[k] === pos[i] + 1 ? pos[i] : pos[i] + 1;
        save(s.levels.slice());
        s.levels[k] = want;
        want > pos[i] ? Sound.place(1 + pos[i]) : Sound.erase();
        after();
      }

      function hint() {
        if (ctx.done) return;
        const k = s.levels.findIndex((l, k) => l !== sol[k]);
        if (k < 0) return;
        s.hints++;
        save(s.levels.slice());
        s.levels[k] = sol[k];
        sweep(thermos[k].map((i) => cells[i]));
        ctx.toast("Ten termometr jest już dobrze");
        after();
      }

      function after() {
        if (!render()) return;
        if (!ctx.undos && !s.hints) ctx.achieve("bez-cofania");
        if (ctx.level.key === "medium" && ctx.time < 90) ctx.achieve("sprint");
        if (ctx.level.key === "hard" && ctx.time < 180 && !s.hints) ctx.achieve("goraczka");
        ctx.win(s.hints ? `Podpowiedzi: ${s.hints}.` : "Bez podpowiedzi.");
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.t != null) press(+b.dataset.t);
      });
      cellKeys(ctx, { cols: n, rows: n, get: () => s.cursor, set: (i) => { s.cursor = i; render(); }, keys: { " ": () => press(s.cursor) } });

      // zwraca true, gdy wszystkie liczby się zgadzają
      function render() {
        const full = (i) => pos[i] < s.levels[owner[i]];
        const have = counts(n, thermos, s.levels);
        cells.forEach((b, i) => {
          b.classList.toggle("full", full(i));
          b.classList.toggle("cut", s.levels[owner[i]] === pos[i] + 1);
          b.classList.toggle("cursor", i === s.cursor);
          b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}${pos[i] ? "" : ", bańka"}, ${full(i) ? "pełne" : "puste"}`);
        });
        const state = (b, h, w) => { b.classList.toggle("ok", h === w); b.classList.toggle("over", h > w); };
        rowClue.forEach((b, r) => state(b, have.rows[r], rows[r]));
        colClue.forEach((b, c) => state(b, have.cols[c], cols[c]));
        const filled = have.rows.reduce((a, b) => a + b, 0);
        info.set(`${filled} z ${goal}`, Math.min(1, filled / goal));
        const solved = have.rows.every((v, r) => v === rows[r]) && have.cols.every((v, c) => v === cols[c]);
        ctx.progress(solved ? 1 : Math.min(filled, goal) / goal * 0.95);
        return solved;
      }
      render();
    },
  });
}
