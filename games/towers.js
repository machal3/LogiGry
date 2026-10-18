// Wieże (Skyscrapers): kwadrat łaciński N×N, liczby na krawędziach mówią, ile wież widać z danej strony.
// Wskazówki: tablica 4N, kolejno góra, dół, lewo, prawo; null = ukryta.
const Towers = (() => {
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const visible = (line) => {
    let max = 0, n = 0;
    for (const v of line) if (v > max) { max = v; n++; }
    return n;
  };

  // Linia widziana od strony wskazówki k (zawsze od krawędzi do środka).
  function lineOf(g, n, k) {
    const side = (k / n) | 0, i = k % n;
    const col = Array.from({ length: n }, (_, r) => g[r][i]);
    return [col, col.slice().reverse(), g[i].slice(), g[i].slice().reverse()][side];
  }

  function perms(n) {
    if (n === 1) return [[1]];
    return perms(n - 1).flatMap((p) => Array.from({ length: n }, (_, k) => [...p.slice(0, k), n, ...p.slice(k)]));
  }

  // Liczba rozwiązań (do `limit`); -1 gdy przekroczono budżet obliczeń.
  function countSolutions(n, clues, limit = 2, budget = 400000) {
    const rowCands = Array.from({ length: n }, (_, r) => perms(n).filter((p) =>
      (clues[2 * n + r] == null || visible(p) === clues[2 * n + r]) &&
      (clues[3 * n + r] == null || visible(p.slice().reverse()) === clues[3 * n + r])));
    const used = new Array(n).fill(0), max = new Array(n).fill(0), vis = new Array(n).fill(0);
    const rows = [];
    let found = 0, nodes = 0;

    function rec(r) {
      if (found >= limit || nodes > budget) return;
      if (r === n) {
        for (let c = 0; c < n; c++) {
          if (clues[n + c] != null && visible(rows.map((row) => row[c]).reverse()) !== clues[n + c]) return;
        }
        found++;
        return;
      }
      next: for (const p of rowCands[r]) {
        nodes++;
        for (let c = 0; c < n; c++) {
          if (used[c] & (1 << p[c])) continue next;
          const t = clues[c];
          if (t == null) continue;
          const v = vis[c] + (p[c] > max[c] ? 1 : 0);
          if (v > t || (Math.max(max[c], p[c]) === n && v !== t) || v + (n - r - 1) < t) continue next;
        }
        const saved = [max.slice(), vis.slice()];
        for (let c = 0; c < n; c++) {
          used[c] |= 1 << p[c];
          if (p[c] > max[c]) { max[c] = p[c]; vis[c]++; }
        }
        rows.push(p);
        rec(r + 1);
        rows.pop();
        for (let c = 0; c < n; c++) used[c] &= ~(1 << p[c]);
        saved[0].forEach((v, c) => (max[c] = v));
        saved[1].forEach((v, c) => (vis[c] = v));
      }
    }
    rec(0);
    return nodes > budget ? -1 : found;
  }

  // Losowy kwadrat łaciński (cykliczny z pomieszanymi wierszami, kolumnami i cyframi).
  function latin(n) {
    const rowOrder = shuffle([...Array(n).keys()]), colOrder = shuffle([...Array(n).keys()]);
    const symbols = shuffle(Array.from({ length: n }, (_, i) => i + 1));
    return rowOrder.map((r) => colOrder.map((c) => symbols[(r + c) % n]));
  }

  // Rozwiązuje jak człowiek. Zwraca potrzebny poziom: 1 reguły krawędzi i jedyne miejsce dla cyfry,
  // 2 analiza całych linii (które ułożenia wierszy i kolumn zgadzają się z obiema wskazówkami); 0 gdy to nie wystarcza.
  function grade(n, clues) {
    const full = (1 << (n + 1)) - 2;
    const cand = new Array(n * n).fill(full);
    const lines = [];
    for (let k = 0; k < n; k++) {
      lines.push({ cells: Array.from({ length: n }, (_, r) => r * n + k), a: clues[k], b: clues[n + k] });
      lines.push({ cells: Array.from({ length: n }, (_, c) => k * n + c), a: clues[2 * n + k], b: clues[3 * n + k] });
    }
    // wskazówka t: pole w odległości d od brzegu ma najwyżej n - t + 1 + d
    for (const { cells, a, b } of lines) {
      cells.forEach((i, d) => {
        if (a != null) cand[i] &= (1 << (n - a + 2 + d)) - 2;
        if (b != null) cand[i] &= (1 << (n - b + 2 + (n - 1 - d))) - 2;
      });
      if (a === n) cells.forEach((i, d) => (cand[i] &= 1 << (d + 1)));
      if (b === n) cells.forEach((i, d) => (cand[i] &= 1 << (n - d)));
    }
    const bit = (m) => { let k = 0; while (!(m & (1 << k))) k++; return k; };
    const single = (m) => m && !(m & (m - 1));
    const all = perms(n);
    let level = 1;
    for (;;) {
      if (cand.some((m) => !m)) return 0;
      if (cand.every(single)) return level;
      let changed = false;
      // cyfra wpisana znika z linii; cyfra z jednym miejscem w linii trafia tam
      for (const { cells } of lines) {
        for (const i of cells) if (single(cand[i])) for (const j of cells) if (j !== i && cand[j] & cand[i]) { cand[j] &= ~cand[i]; changed = true; }
        for (let d = 1; d <= n; d++) {
          const where = cells.filter((i) => cand[i] & (1 << d));
          if (where.length === 1 && cand[where[0]] !== 1 << d) { cand[where[0]] = 1 << d; changed = true; }
        }
      }
      if (changed) continue;
      for (const { cells, a, b } of lines) {
        const fit = new Array(n).fill(0);
        for (const p of all) {
          if (!p.every((v, d) => cand[cells[d]] & (1 << v))) continue;
          if ((a != null && visible(p) !== a) || (b != null && visible(p.slice().reverse()) !== b)) continue;
          p.forEach((v, d) => (fit[d] |= 1 << v));
        }
        cells.forEach((i, d) => { if (cand[i] !== (cand[i] & fit[d])) { cand[i] &= fit[d]; changed = true; } });
      }
      if (!changed) return 0;
      level = 2;
    }
  }

  // Usuwa wskazówki, dopóki plansza zostaje rozwiązywalna technikami do poziomu `tier`
  // (co najmniej `keep` wskazówek zostaje); do gry trafia plansza wymagająca dokładnie tego poziomu.
  function generate(n, keep, tier = 2) {
    for (;;) {
      const solution = latin(n);
      const clues = Array.from({ length: 4 * n }, (_, k) => visible(lineOf(solution, n, k)));
      if (!grade(n, clues)) continue;
      let shown = 4 * n;
      for (const k of shuffle([...Array(4 * n).keys()])) {
        if (shown <= Math.ceil(4 * n * keep)) break;
        const saved = clues[k];
        clues[k] = null;
        const t = grade(n, clues);
        if (t && t <= tier) shown--;
        else clues[k] = saved;
      }
      if (grade(n, clues) === tier) return (api.last = { n, solution, clues });
    }
  }

  // Stan planszy gracza (0 = puste): powtórzenia i to, które wskazówki są spełnione / złamane.
  function check(n, g, clues) {
    const dupes = new Set();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const v = g[r][c];
      if (!v) continue;
      for (let k = 0; k < n; k++) {
        if (k !== c && g[r][k] === v) dupes.add(r * n + c);
        if (k !== r && g[k][c] === v) dupes.add(r * n + c);
      }
    }
    const clueState = clues.map((t, k) => {
      const line = lineOf(g, n, k);
      if (t == null || line.includes(0)) return null;
      return visible(line) === t;
    });
    const full = g.every((row) => !row.includes(0));
    return { dupes, clueState, solved: full && !dupes.size && clueState.every((s) => s !== false) };
  }

  const api = { visible, lineOf, countSolutions, grade, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Towers;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wieze"), {
  levels: [
    { key: "easy", name: "4 × 4", points: 10, size: 4, keep: 0.5, tier: 1 },
    { key: "medium", name: "5 × 5", points: 25, size: 5, keep: 0.4, tier: 2 },
    { key: "hard", name: "6 × 6", points: 50, size: 6, keep: 0, tier: 2 },
  ],
  rules: [
    "W każdym wierszu i kolumnie stoją wieże o wysokościach od 1 do N, każda wysokość raz.",
    "Liczba na brzegu mówi, ile wież widać z tego miejsca. Wyższa wieża zasłania wszystkie niższe za nią.",
    "Każdą planszę da się rozwiązać bez zgadywania. Na wyższych poziomach trzeba rozważać, które ułożenia całego wiersza pasują do obu wskazówek.",
    "Klawiatura: strzałki, cyfry, Backspace. N przełącza notatki.",
  ],
  mount(board, ctx) {
    const { n, clues } = Towers.generate(ctx.level.size, ctx.level.keep, ctx.level.tier);
    const g = Array.from({ length: n }, () => new Array(n).fill(0));
    const notes = new Array(n * n).fill(0);
    let sel = 0;

    board.classList.add("tw");
    board.style.setProperty("--n", n);
    board.style.setProperty("--cols", n + 1.5 + 0.06 * (n + 1)); // pola, wskazówki i odstępy
    board.style.setProperty("--rows", n + 1.5 + 0.06 * (n + 1));
    const cells = [], clueEls = new Array(4 * n);
    const clue = (k) => {
      const d = el("div", "tw-clue", clues[k] ?? "");
      d.classList.add(["top", "bottom", "left", "right"][(k / n) | 0]);
      clueEls[k] = d;
      return d;
    };
    board.append(el("span"));
    for (let c = 0; c < n; c++) board.append(clue(c));
    board.append(el("span"));
    for (let r = 0; r < n; r++) {
      board.append(clue(2 * n + r));
      for (let c = 0; c < n; c++) {
        const b = button("", "cell tw-cell");
        b.dataset.i = r * n + c;
        b.style.setProperty("--k", r + c);
        b.setAttribute("aria-label", `Wiersz ${r + 1}, kolumna ${c + 1}`);
        board.append(b);
        cells.push(b);
      }
      board.append(clue(3 * n + r));
    }
    board.append(el("span"));
    for (let c = 0; c < n; c++) board.append(clue(n + c));
    board.append(el("span"));

    const save = ctx.undoable(([gs, ns, s]) => {
      gs.forEach((row, r) => row.forEach((v, c) => (g[r][c] = v)));
      ns.forEach((v, i) => (notes[i] = v));
      sel = s;
      render();
    });
    const snapshot = () => [g.map((row) => row.slice()), notes.slice(), sel];
    const controls = digitControls(ctx, n, {
      put,
      remaining: () => Array.from({ length: n + 1 }, (_, d) => n - g.flat().filter((v) => v === d).length),
    });

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".tw-cell");
      if (b) { sel = +b.dataset.i; render(); }
    });
    cellKeys(ctx, {
      cols: n, rows: n, max: n,
      get: () => sel,
      set: (i) => { sel = i; render(); cells[i].focus({ preventScroll: true }); },
      onDigit: (d) => put(d, controls.isNotes()),
      keys: controls.keys,
    });

    function put(d, asNote) {
      if (ctx.done) return;
      const r = (sel / n) | 0, c = sel % n;
      if (asNote && d) {
        if (g[r][c]) return;
        save(snapshot());
        notes[sel] ^= 1 << d;
      } else {
        if (g[r][c] === d && !notes[sel]) return;
        save(snapshot());
        g[r][c] = d;
        notes[sel] = 0;
        if (d) for (let k = 0; k < n; k++) {
          notes[r * n + k] &= ~(1 << d);
          notes[k * n + c] &= ~(1 << d);
        }
      }
      const state = render();
      ctx.progress(g.flat().filter(Boolean).length / (n * n));
      if (asNote) return Sound.tap();
      if (!d) return Sound.erase();
      if (state.solved) return ctx.win();
      // błąd: powtórzona wysokość albo złamana wskazówka w tej linii
      const lineClues = [c, n + c, 2 * n + r, 3 * n + r];
      if (state.dupes.has(sel) || lineClues.some((k) => state.clueState[k] === false)) {
        Sound.error();
        replay(cells[sel], "shake");
        lineClues.forEach((k) => state.clueState[k] === false && replay(clueEls[k], "shake"));
        return;
      }
      // pełny i poprawny wiersz lub kolumna: błysk od wpisanego pola
      const row = [...Array(n).keys()].map((k) => r * n + k), col = [...Array(n).keys()].map((k) => k * n + c);
      const done = [row, col].filter((line) => line.every((i) => g[(i / n) | 0][i % n] && !state.dupes.has(i)));
      if (!done.length) return Sound.place(d);
      Sound.line();
      done.forEach((line) => sweep(line.sort((a, b) => Math.abs(a - sel) - Math.abs(b - sel)).map((i) => cells[i])));
    }

    const ring = selectionRing(board);
    function render() {
      const state = Towers.check(n, g, clues);
      const sr = (sel / n) | 0, sc = sel % n;
      ring(cells[sel]);
      cells.forEach((b, i) => {
        const r = (i / n) | 0, c = i % n;
        drawDigit(b, g[r][c], notes[i], n);
        b.style.setProperty("--h", g[r][c] / n);
        b.classList.toggle("filled", !!g[r][c]);
        b.classList.toggle("sel", i === sel);
        b.classList.toggle("peer", i !== sel && (r === sr || c === sc));
        b.classList.toggle("bad", state.dupes.has(i));
      });
      clueEls.forEach((d, k) => {
        d.classList.toggle("ok", state.clueState[k] === true);
        d.classList.toggle("bad", state.clueState[k] === false);
        const side = (k / n) | 0, i = k % n;
        d.classList.toggle("hot", side < 2 ? i === sc : i === sr);
      });
      controls.update();
      return state;
    }
    render();
  },
});
