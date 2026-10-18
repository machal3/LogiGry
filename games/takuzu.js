// Zero-jeden (Takuzu): plansza N×N (N parzyste), pola 1 lub 2 (0 = puste).
// Bez trzech takich samych obok siebie, w każdym wierszu i kolumnie po równo, wiersze i kolumny niepowtarzalne.
const Takuzu = (() => {
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Czy wpis w polu i łamie zasady (patrzy tylko na jego wiersz i kolumnę).
  function okAt(g, n, i) {
    const r = (i / n) | 0, c = i % n, v = g[i];
    for (const [step, pos, base, line] of [[1, c, r * n, r], [n, r, c, c]]) {
      // trzy pod rząd z udziałem tego pola
      for (let s = Math.max(0, pos - 2); s <= Math.min(n - 3, pos); s++) {
        const a = base + s * step;
        if (g[a] === v && g[a + step] === v && g[a + 2 * step] === v) return false;
      }
      let same = 0, empty = 0;
      for (let k = 0; k < n; k++) {
        const x = g[base + k * step];
        if (x === v) same++;
        else if (!x) empty++;
      }
      if (same > n / 2) return false;
      // pełna linia nie może powtarzać innej pełnej linii
      if (!empty) {
        for (let o = 0; o < n; o++) {
          if (o === line) continue;
          let same2 = true;
          for (let k = 0; k < n && same2; k++) {
            const a = step === 1 ? base + k : k * n + c, b = step === 1 ? o * n + k : k * n + o;
            if (!g[b] || g[a] !== g[b]) same2 = false;
          }
          if (same2) return false;
        }
      }
    }
    return true;
  }

  // Wypełnia puste pola (losowo, gdy random); liczy rozwiązania do `limit`.
  // Najpierw pola z jedną możliwą wartością, więc drzewo poszukiwań zostaje małe.
  function solve(g, n, limit = 2, random = false) {
    g = g.slice();
    let found = 0, first = null;
    const empty = new Set(g.flatMap((v, i) => (v ? [] : [i])));
    const options = (i) => [1, 2].filter((v) => { g[i] = v; const ok = okAt(g, n, i); g[i] = 0; return ok; });
    const rec = () => {
      if (!empty.size) { found++; first ||= g.slice(); return; }
      let best = null, bestOpts = null;
      for (const i of empty) {
        const o = options(i);
        if (!best || o.length < bestOpts.length) { best = i; bestOpts = o; }
        if (o.length < 2) break;
      }
      empty.delete(best);
      for (const v of random ? shuffle(bestOpts) : bestOpts) {
        g[best] = v;
        rec();
        if (found >= limit) break;
      }
      g[best] = 0;
      empty.add(best);
    };
    rec();
    return { count: found, grid: first };
  }

  // Wszystkie poprawne linie długości n: po równo, bez trzech takich samych obok siebie.
  const patterns = {};
  const linesOf = (n) => (patterns[n] ||= (function rec(p) {
    if (p.length === n) return p.filter((v) => v === 1).length === n / 2 ? [p] : [];
    const out = [];
    for (const v of [1, 2]) if (!(p.length >= 2 && p[p.length - 1] === v && p[p.length - 2] === v)) out.push(...rec([...p, v]));
    return out;
  })([]));

  // Rozwiązuje jak człowiek. Zwraca potrzebny poziom: 1 pary, „kanapki” i komplet jednej cyfry w linii;
  // 2 analiza całej linii (które ułożenia pasują, łącznie z zakazem powtórzenia innej pełnej linii); 0 gdy to nie wystarcza.
  function grade(puzzle, n) {
    const g = puzzle.slice();
    const lines = [];
    for (let k = 0; k < n; k++) {
      lines.push(Array.from({ length: n }, (_, j) => k * n + j));
      lines.push(Array.from({ length: n }, (_, j) => j * n + k));
    }
    let level = 1;
    for (;;) {
      if (!g.includes(0)) return check(g, n).solved ? level : 0;
      let changed = false;
      const set = (i, v) => { if (!g[i]) { g[i] = v; changed = true; } };
      for (const l of lines) {
        for (let k = 0; k + 2 < n; k++) {
          const [a, b, c] = [g[l[k]], g[l[k + 1]], g[l[k + 2]]];
          if (a && a === b) set(l[k + 2], 3 - a);
          if (b && b === c) set(l[k], 3 - b);
          if (a && a === c) set(l[k + 1], 3 - a);
        }
        for (const v of [1, 2]) if (l.filter((i) => g[i] === v).length === n / 2) l.forEach((i) => set(i, 3 - v));
      }
      if (changed) continue;
      for (const l of lines) {
        const isRow = l[1] - l[0] === 1;
        const done = lines.filter((m) => (m[1] - m[0] === 1) === isRow && m !== l && m.every((i) => g[i])).map((m) => m.map((i) => g[i]).join());
        const fit = linesOf(n).filter((p) => p.every((v, k) => !g[l[k]] || g[l[k]] === v) && !done.includes(p.join()));
        if (!fit.length) return 0;
        l.forEach((i, k) => { if (!g[i] && fit.every((p) => p[k] === fit[0][k])) set(i, fit[0][k]); });
      }
      if (!changed) return 0;
      level = 2;
    }
  }

  // Usuwa wpisy, dopóki plansza zostaje rozwiązywalna technikami do poziomu `tier` (co najmniej `keep` pól zostaje);
  // do gry trafia plansza wymagająca dokładnie tego poziomu.
  function generate(n, keep, tier = 2) {
    for (;;) {
      const solution = solve(new Array(n * n).fill(0), n, 1, true).grid;
      const puzzle = solution.slice();
      let shown = n * n;
      for (const i of shuffle([...puzzle.keys()])) {
        if (shown <= Math.ceil(n * n * keep)) break;
        puzzle[i] = 0;
        const t = grade(puzzle, n);
        if (t && t <= tier) shown--;
        else puzzle[i] = solution[i];
      }
      if (grade(puzzle, n) === tier) return (api.last = { n, puzzle, solution });
    }
  }

  // Stan gracza: pola łamiące zasady i czy plansza jest rozwiązana.
  function check(g, n) {
    const bad = new Set();
    g.forEach((v, i) => v && !okAt(g, n, i) && bad.add(i));
    return { bad, solved: !g.includes(0) && !bad.size };
  }

  const api = { okAt, solve, grade, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Takuzu;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "zero-jeden"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, size: 6, keep: 0.3, tier: 1 },
    { key: "medium", name: "8 × 8", points: 25, size: 8, keep: 0, tier: 2 },
    { key: "hard", name: "10 × 10", points: 50, size: 10, keep: 0, tier: 2 },
  ],
  rules: [
    "Wypełnij planszę zerami i jedynkami. Obok siebie mogą stać najwyżej dwie takie same cyfry.",
    "W każdym wierszu i kolumnie jest tyle samo zer co jedynek.",
    "Żadne dwa wiersze ani dwie kolumny nie są identyczne.",
    "Każdą planszę da się rozwiązać bez zgadywania.",
    "Kliknięcie: puste, 0, 1. Prawy przycisk w drugą stronę. Klawiatura: strzałki, 0, 1, Backspace.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Zero błędów", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybki bit", desc: "Rozwiąż średni poziom w mniej niż 4 min.", points: 25 },
    { id: "mistrz", name: "Mistrz zer i jedynek", desc: "Rozwiąż trudny poziom w mniej niż 8 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, puzzle } = Takuzu.generate(ctx.level.size, ctx.level.keep, ctx.level.tier);
    const g = puzzle.slice(); // 0 puste, 1 = cyfra 0, 2 = cyfra 1
    const LABEL = ["", "0", "1"];
    let cursor = puzzle.indexOf(0);

    board.classList.add("tz");
    board.tabIndex = 0;
    board.setAttribute("aria-label", "Plansza. Strzałki wybierają pole, 0 i 1 wpisują cyfrę.");
    board.style.setProperty("--n", n);
    board.style.setProperty("--cols", n + 0.08 * (n - 1));
    board.style.setProperty("--rows", n + 0.08 * (n - 1));
    const cells = puzzle.map((v, i) => {
      const cell = el("div", `cell tz-cell${v ? " given" : ""}`);
      cell.dataset.i = i;
      cell.style.setProperty("--k", ((i / n) | 0) + (i % n));
      board.append(cell);
      return cell;
    });

    const counts = el("div", "tz-counts");
    const zeros = el("span"), ones = el("span");
    counts.append(zeros, ones);
    ctx.panel.append(panelBlock("Do wpisania", counts));

    const save = ctx.undoable((snap) => { snap.forEach((v, i) => (g[i] = v)); render(); });
    const line = (k) => [...Array(n).keys()].map((j) => (k < n ? k * n + j : j * n + (k - n)));

    const put = (i, v) => {
      if (ctx.done || puzzle[i] || g[i] === v) return;
      save(g.slice());
      g[i] = v;
      const state = render();
      ctx.progress(g.filter(Boolean).length / (n * n));
      if (!v) return Sound.erase();
      if (state.solved) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 240) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 480 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      if (state.bad.has(i)) {
        Sound.error();
        replay(cells[i], "shake");
        return;
      }
      // pełny i poprawny wiersz lub kolumna: błysk od wpisanego pola
      const done = [(i / n) | 0, n + (i % n)].map(line).filter((l) => l.every((j) => g[j] && !state.bad.has(j)));
      if (!done.length) return Sound.place(v * 2);
      Sound.line();
      done.forEach((l) => sweep(l.sort((a, b) => Math.abs(a - i) - Math.abs(b - i)).map((j) => cells[j])));
    };

    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const cell = e.target.closest(".tz-cell");
      if (!cell || ctx.done) return;
      e.preventDefault();
      board.focus({ preventScroll: true });
      const i = +cell.dataset.i;
      cursor = i;
      if (puzzle[i]) return render();
      put(i, (g[i] + (e.button === 2 ? 2 : 1)) % 3);
      render();
    });

    const key = (f) => () => put(cursor, f(g[cursor]));
    cellKeys(ctx, {
      cols: n, rows: n, scope: board,
      get: () => cursor, set: (i) => { cursor = i; render(); },
      keys: { 0: key(() => 1), 1: key(() => 2), " ": key((v) => (v + 1) % 3), enter: key((v) => (v + 1) % 3), backspace: key(() => 0), delete: key(() => 0) },
    });
    board.addEventListener("focus", () => render());
    board.addEventListener("blur", () => render());

    function render() {
      const state = Takuzu.check(g, n);
      const showCursor = document.activeElement === board;
      const cr = (cursor / n) | 0, cc = cursor % n;
      cells.forEach((cell, i) => {
        if (cell.dataset.v !== String(g[i])) {
          cell.dataset.v = g[i];
          cell.replaceChildren(...(g[i] ? [el("span", "val", LABEL[g[i]])] : []));
        }
        cell.classList.toggle("bad", state.bad.has(i));
        cell.classList.toggle("peer", showCursor && i !== cursor && (((i / n) | 0) === cr || i % n === cc));
        cell.classList.toggle("cursor", showCursor && i === cursor);
      });
      const left = (v) => (n * n) / 2 - g.filter((x) => x === v).length;
      zeros.textContent = `0 × ${left(1)}`;
      ones.textContent = `1 × ${left(2)}`;
      return state;
    }
    render();
  },
});
