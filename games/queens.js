// Królowe: N×N, N kolorowych regionów. Jedna królowa w każdym wierszu, kolumnie i regionie; królowe się nie stykają.
// Plansza: regions[i] = numer regionu pola i (wierszami).
const Queens = (() => {
  const rnd = (n) => Math.floor(Math.random() * n);

  // Losowe ustawienie N królowych: po jednej w wierszu i kolumnie, sąsiednie wiersze nie na skos obok siebie.
  function placement(n) {
    const cols = [], used = new Array(n).fill(false);
    const rec = (r) => {
      if (r === n) return true;
      const order = [...Array(n).keys()].sort(() => Math.random() - 0.5);
      for (const c of order) {
        if (used[c] || (r && Math.abs(cols[r - 1] - c) < 2)) continue;
        used[c] = true;
        cols.push(c);
        if (rec(r + 1)) return true;
        cols.pop();
        used[c] = false;
      }
      return false;
    };
    rec(0);
    return cols;
  }

  // Liczba rozwiązań (do `limit`). Znalezione rozwiązania trafiają do `out` (kolumna w każdym wierszu).
  function count(n, regions, limit = 2, out = []) {
    const colUsed = new Array(n).fill(false), regUsed = new Array(n).fill(false);
    const cols = [];
    let found = 0;
    const rec = (r, prev) => {
      if (r === n) { found++; out.push(cols.slice()); return; }
      for (let c = 0; c < n && found < limit; c++) {
        const g = regions[r * n + c];
        if (colUsed[c] || regUsed[g] || (r && Math.abs(prev - c) < 2)) continue;
        colUsed[c] = regUsed[g] = true;
        cols[r] = c;
        rec(r + 1, c);
        colUsed[c] = regUsed[g] = false;
      }
    };
    rec(0, -9);
    return found;
  }

  // Regiony rosną od pól królowych; pole dołącza do losowego sąsiedniego regionu.
  function grow(n, cols) {
    const regions = new Array(n * n).fill(-1);
    cols.forEach((c, r) => (regions[r * n + c] = r));
    let left = n * n - n;
    while (left) {
      const i = rnd(n * n);
      if (regions[i] >= 0) continue;
      const r = (i / n) | 0, c = i % n;
      const nb = [];
      if (r > 0 && regions[i - n] >= 0) nb.push(regions[i - n]);
      if (r < n - 1 && regions[i + n] >= 0) nb.push(regions[i + n]);
      if (c > 0 && regions[i - 1] >= 0) nb.push(regions[i - 1]);
      if (c < n - 1 && regions[i + 1] >= 0) nb.push(regions[i + 1]);
      if (!nb.length) continue;
      regions[i] = nb[rnd(nb.length)];
      left--;
    }
    return regions;
  }

  // Region jest spójny, jeśli z jednego pola dojdziemy do wszystkich jego pól.
  function connected(n, regions, g) {
    const cells = regions.flatMap((v, i) => (v === g ? [i] : []));
    const seen = new Set([cells[0]]), stack = [cells[0]];
    while (stack.length) {
      const i = stack.pop(), r = (i / n) | 0, c = i % n;
      for (const j of [r > 0 && i - n, r < n - 1 && i + n, c > 0 && i - 1, c < n - 1 && i + 1]) {
        if (j !== false && regions[j] === g && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
    }
    return seen.size === cells.length;
  }

  // Gdy rozwiązań jest wiele, pole z królową drugiego rozwiązania przechodzi do sąsiedniego regionu,
  // przez co to rozwiązanie ma dwie królowe w jednym regionie, a nasze nadal pasuje.
  // Do gry trafia tylko plansza rozwiązywalna logiką, wymagająca technik z poziomów od `minTier` do `maxTier`.
  function generate(n, minTier = 1, maxTier = 3) {
    for (;;) {
      const solution = placement(n);
      const regions = grow(n, solution);
      const queen = new Set(solution.map((c, r) => r * n + c));
      for (let step = 0; step < 300; step++) {
        const found = [];
        if (count(n, regions, 2, found) === 1) {
          const tier = grade(n, regions);
          if (tier >= minTier && tier <= maxTier) return (api.last = { n, regions, solution, tier });
          break;
        }
        const other = found.find((s) => s.some((c, r) => c !== solution[r]));
        const moves = [];
        other.forEach((c, r) => {
          const i = r * n + c;
          if (queen.has(i)) return;
          for (const j of [r > 0 && i - n, r < n - 1 && i + n, c > 0 && i - 1, c < n - 1 && i + 1]) {
            if (j !== false && regions[j] !== regions[i]) moves.push([i, regions[j]]);
          }
        });
        if (!moves.length) break;
        const [i, g] = moves[rnd(moves.length)];
        const was = regions[i];
        regions[i] = g;
        if (!connected(n, regions, was)) regions[i] = was;
      }
    }
  }

  // Rozwiązuje jak człowiek. Zwraca najtrudniejszy potrzebny poziom: 1 jedyne pole w wierszu, kolumnie lub regionie;
  // 2 region zamknięty w jednej linii (albo linia w jednym regionie) i „królowa tutaj opróżniłaby inny region”;
  // 3 zasada szufladkowa: k regionów mieszczących się w k wierszach (kolumnach) zajmuje je w całości. 0 gdy to nie wystarcza.
  function grade(n, regions) {
    const can = new Array(n * n).fill(true), queen = new Array(n * n).fill(false);
    const units = [
      ...Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => r * n + c)),
      ...Array.from({ length: n }, (_, c) => Array.from({ length: n }, (_, r) => r * n + c)),
      ...Array.from({ length: n }, (_, g) => regions.flatMap((v, i) => (v === g ? [i] : []))),
    ];
    const rows = units.slice(0, n), cols = units.slice(n, 2 * n), regs = units.slice(2 * n);
    // pola wykluczone przez królową w polu i
    const blocked = (i) => {
      const r = (i / n) | 0, c = i % n;
      return [...Array(n * n).keys()].filter((j) => j !== i && (((j / n) | 0) === r || j % n === c || regions[j] === regions[i] ||
        (Math.abs(((j / n) | 0) - r) < 2 && Math.abs((j % n) - c) < 2)));
    };
    const B = Array.from({ length: n * n }, (_, i) => blocked(i));
    const cand = (u) => u.filter((i) => can[i] && !queen[i]);
    const open = (u) => !u.some((i) => queen[i]);
    const place = (i) => { queen[i] = true; can[i] = false; B[i].forEach((j) => (can[j] = false)); };
    const drop = (cells) => { let hit = false; for (const j of cells) if (can[j] && !queen[j]) { can[j] = false; hit = true; } return hit; };
    const combos = (a, k) => (k === 0 ? [[]] : a.flatMap((x, i) => combos(a.slice(i + 1), k - 1).map((c) => [x, ...c])));

    let level = 1;
    for (;;) {
      if (units.every((u) => !open(u))) return level;
      if (units.some((u) => open(u) && !cand(u).length)) return 0;
      const one = units.find((u) => open(u) && cand(u).length === 1);
      if (one) { place(cand(one)[0]); continue; }

      let hit = false;
      // zbiór pól jednej jednostki mieszczący się w innej jednostce zajmuje ją: reszta tej drugiej odpada
      for (const u of units) {
        if (!open(u)) continue;
        const cs = cand(u);
        for (const v of units) if (v !== u && cs.every((i) => v.includes(i)) && drop(v.filter((i) => !cs.includes(i)))) hit = true;
        if (hit) break;
      }
      // królowa tutaj zabrałaby wszystkie pola jakiejś jednostki
      if (!hit) for (let i = 0; i < n * n && !hit; i++) {
        if (!can[i] || queen[i]) continue;
        const gone = new Set(B[i]);
        if (units.some((u) => open(u) && !u.includes(i) && cand(u).every((j) => gone.has(j)))) { can[i] = false; hit = true; }
      }
      if (hit) { level = Math.max(level, 2); continue; }

      // k regionów w k wierszach (kolumnach) albo k wierszy (kolumn) w k regionach
      for (let k = 2; k < n && !hit; k++) {
        for (const [from, into] of [[regs, rows], [regs, cols], [rows, regs], [cols, regs]]) {
          const live = from.filter(open);
          for (const set of combos(live, k)) {
            const cells = set.flatMap(cand);
            const cover = into.filter((v) => cells.some((i) => v.includes(i)));
            if (cover.length !== k) continue;
            const inside = new Set(cells);
            if (drop(cover.flat().filter((i) => !inside.has(i)))) { hit = true; break; }
          }
          if (hit) break;
        }
      }
      if (!hit) return 0;
      level = 3;
    }
  }

  // Stan gracza: queens = zbiór pól z królową. Zwraca pola w konflikcie i czy plansza jest rozwiązana.
  function check(n, regions, queens) {
    const bad = new Set();
    const list = [...queens];
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      const i = list[a], j = list[b];
      const ri = (i / n) | 0, ci = i % n, rj = (j / n) | 0, cj = j % n;
      if (ri === rj || ci === cj || regions[i] === regions[j] || (Math.abs(ri - rj) < 2 && Math.abs(ci - cj) < 2)) bad.add(i).add(j);
    }
    return { bad, solved: list.length === n && !bad.size };
  }

  const api = { placement, count, grade, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Queens;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "krolowe"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, size: 6, tiers: [1, 2] },
    { key: "medium", name: "8 × 8", points: 25, size: 8, tiers: [2, 3] },
    { key: "hard", name: "9 × 9", points: 50, size: 9, tiers: [3, 3] },
  ],
  rules: [
    "Postaw po jednej królowej w każdym wierszu, kolumnie i kolorowym regionie.",
    "Królowe nie mogą się stykać, także po skosie.",
    "Każdą planszę da się rozwiązać bez zgadywania. Na trudnym przydaje się zasada: jeśli dwa regiony mieszczą się w dwóch wierszach, inne regiony nie mają tam królowych.",
    "Kliknięcie stawia krzyżyk, drugie królową. Przeciągnij, żeby oznaczyć wiele pól krzyżykami. Klawiatura: strzałki, Spacja, Q, X.",
  ],
  mount(board, ctx) {
    const { n, regions } = Queens.generate(ctx.level.size, ...ctx.level.tiers);
    const s = new Array(n * n).fill(0); // 0 puste, 1 krzyżyk, 2 królowa
    let cursor = 0, paint = null, hot = -1;

    board.classList.add("qn");
    board.tabIndex = 0;
    board.setAttribute("aria-label", "Plansza. Strzałki wybierają pole, Spacja zmienia stan, Q stawia królową, X krzyżyk.");
    board.style.setProperty("--cols", n);
    board.style.setProperty("--rows", n);
    const cells = regions.map((g, i) => {
      const r = (i / n) | 0, c = i % n;
      const cell = el("div", "cell qn-cell");
      cell.dataset.i = i;
      cell.style.setProperty("--k", r + c);
      cell.style.setProperty("--rc", `var(--q${g})`);
      // grube linie tam, gdzie zmienia się region
      if (c < n - 1 && regions[i + 1] !== g) cell.classList.add("edge-r");
      if (r < n - 1 && regions[i + n] !== g) cell.classList.add("edge-b");
      board.append(cell);
      return cell;
    });
    roundCorners(cells, n);

    const count = el("p", "panel-big");
    ctx.panel.append(panelBlock("Królowe", count, el("p", "panel-note", "Krzyżyk oznacza pole, na którym królowej na pewno nie ma. Nie wpływa na wynik.")));

    const save = ctx.undoable((snap) => { snap.forEach((v, i) => (s[i] = v)); render(); });
    const queens = () => new Set(s.flatMap((v, i) => (v === 2 ? [i] : [])));

    const apply = (i, v) => {
      if (ctx.done || s[i] === v) return;
      s[i] = v;
      const state = render();
      const q = queens();
      ctx.progress((q.size - state.bad.size) / n);
      if (v !== 2) return v ? Sound.tap() : Sound.erase();
      if (state.solved) return ctx.win();
      if (state.bad.has(i)) {
        Sound.error();
        state.bad.forEach((j) => replay(cells[j], "shake"));
        return;
      }
      // królowa bez konfliktu: błysk przez jej region
      Sound.place(q.size);
      const ri = (i / n) | 0, ci = i % n;
      const dist = (j) => Math.abs(((j / n) | 0) - ri) + Math.abs((j % n) - ci);
      sweep(cells.filter((_, j) => regions[j] === regions[i]).sort((a, b) => dist(+a.dataset.i) - dist(+b.dataset.i)));
    };

    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const cell = e.target.closest(".qn-cell");
      if (!cell || ctx.done) return;
      e.preventDefault();
      board.focus({ preventScroll: true });
      const i = +cell.dataset.i;
      save(s.slice());
      cursor = i;
      // prawy przycisk: krzyżyk albo czyszczenie; lewy: puste → krzyżyk → królowa → puste
      const next = e.button === 2 ? (s[i] === 1 ? 0 : 1) : (s[i] + 1) % 3;
      // przeciąganie maluje krzyżyki (albo je zdejmuje) na kolejnych polach
      paint = next === 1 ? 1 : next === 0 && s[i] === 1 ? 0 : null;
      apply(i, next);
    });
    ctx.on(document, "pointermove", (e) => {
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".qn-cell");
      const i = cell && board.contains(cell) ? +cell.dataset.i : -1;
      if (i !== hot) { hot = i; render(); }
      if (paint !== null && i >= 0 && s[i] !== 2) apply(i, paint);
    });
    ctx.on(document, "pointerup", () => (paint = null));

    const key = (f) => () => {
      if (ctx.done) return;
      const v = f(s[cursor]);
      if (v === s[cursor]) return;
      save(s.slice());
      apply(cursor, v);
    };
    cellKeys(ctx, {
      cols: n, rows: n, scope: board,
      get: () => cursor, set: (i) => { cursor = i; render(); },
      keys: { " ": key((v) => (v + 1) % 3), enter: key((v) => (v + 1) % 3), q: key((v) => (v === 2 ? 0 : 2)), x: key((v) => (v === 1 ? 0 : 1)), backspace: key(() => 0), delete: key(() => 0) },
    });
    board.addEventListener("focus", () => render());
    board.addEventListener("blur", () => render());

    function render() {
      const q = queens();
      const state = Queens.check(n, regions, q);
      const showCursor = document.activeElement === board;
      const hr = hot >= 0 ? (hot / n) | 0 : -1, hc = hot >= 0 ? hot % n : -1;
      cells.forEach((cell, i) => {
        cell.classList.toggle("x", s[i] === 1);
        cell.classList.toggle("queen", s[i] === 2);
        cell.classList.toggle("bad", state.bad.has(i));
        cell.classList.toggle("hot", ((i / n) | 0) === hr || i % n === hc);
        cell.classList.toggle("cursor", showCursor && i === cursor);
      });
      count.textContent = `${q.size} / ${n}`;
      return state;
    }
    render();
  },
});
