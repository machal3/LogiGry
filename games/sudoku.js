// Sudoku: generator łamigłówek z jednym rozwiązaniem. Plansza to tablica 81 liczb, 0 = puste.
const Sudoku = (() => {
  const rnd = (n) => Math.floor(Math.random() * n);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const bits = (m) => { let n = 0; for (; m; m &= m - 1) n++; return n; };

  // Bitmaska cyfr, które można wpisać w pole i (bit d = cyfra d).
  function allowed(g, i) {
    const r = (i / 9) | 0, c = i % 9, br = r - (r % 3), bc = c - (c % 3);
    let used = 0;
    for (let k = 0; k < 9; k++) {
      used |= 1 << g[r * 9 + k];
      used |= 1 << g[k * 9 + c];
      used |= 1 << g[(br + ((k / 3) | 0)) * 9 + bc + (k % 3)];
    }
    return ~used & 0x3fe;
  }

  // Puste pole z najmniejszą liczbą możliwości; -1 gdy plansza pełna.
  function pickCell(g) {
    let best = -1, bestMask = 0, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (g[i]) continue;
      const m = allowed(g, i), n = bits(m);
      if (n < bestN) {
        best = i; bestMask = m; bestN = n;
        if (n <= 1) break;
      }
    }
    return [best, bestMask];
  }

  // Liczba rozwiązań, liczona najwyżej do `limit`.
  function count(g, limit = 2) {
    const [i, mask] = pickCell(g);
    if (i < 0) return 1;
    let n = 0;
    for (let d = 1; d <= 9 && n < limit; d++) {
      if (mask & (1 << d)) { g[i] = d; n += count(g, limit - n); }
    }
    g[i] = 0;
    return n;
  }

  // Wypełnia planszę w miejscu (losowa kolejność cyfr); false gdy się nie da.
  function fill(g) {
    const [i, mask] = pickCell(g);
    if (i < 0) return true;
    for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (mask & (1 << d)) { g[i] = d; if (fill(g)) return true; }
    }
    g[i] = 0;
    return false;
  }

  function solve(g) {
    const s = g.slice();
    return fill(s) ? s : null;
  }

  // Wiersze, kolumny i kwadraty jako listy pól.
  const UNITS = [
    ...Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => r * 9 + c)),
    ...Array.from({ length: 9 }, (_, c) => Array.from({ length: 9 }, (_, r) => r * 9 + c)),
    ...Array.from({ length: 9 }, (_, b) => Array.from({ length: 9 }, (_, k) => (((b / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + (b % 3) * 3 + (k % 3))),
  ];
  const PEERS = Array.from({ length: 81 }, (_, i) => [...new Set(UNITS.filter((u) => u.includes(i)).flat())].filter((j) => j !== i));
  const digitsOf = (m) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => m & (1 << d));
  const combos = (a, k) => (k === 0 ? [[]] : a.flatMap((x, i) => combos(a.slice(i + 1), k - 1).map((c) => [x, ...c])));

  // Rozwiązuje technikami, których używa człowiek. Zwraca najtrudniejszy potrzebny poziom:
  // 1 pojedyncze kandydaty, 2 pary i kandydaci zablokowani, 3 trójki, X-wing i Y-wing; 0 gdy to nie wystarcza.
  function grade(puzzle) {
    const g = puzzle.slice();
    const cand = g.map((v, i) => (v ? 0 : allowed(g, i)));
    let level = 1;
    const place = (i, d) => {
      g[i] = d;
      cand[i] = 0;
      for (const j of PEERS[i]) cand[j] &= ~(1 << d);
    };
    const remove = (cells, mask) => {
      let hit = false;
      for (const j of cells) if (!g[j] && cand[j] & mask) { cand[j] &= ~mask; hit = true; }
      return hit;
    };

    const singles = () => {
      for (let i = 0; i < 81; i++) if (!g[i] && bits(cand[i]) === 1) { place(i, digitsOf(cand[i])[0]); return true; }
      for (const u of UNITS) for (let d = 1; d <= 9; d++) {
        const where = u.filter((i) => !g[i] && cand[i] & (1 << d));
        if (where.length === 1) { place(where[0], d); return true; }
      }
      return false;
    };
    const locked = () => {
      // cyfra w kwadracie tylko w jednej linii (albo w linii tylko w jednym kwadracie) znika z reszty
      for (const u of UNITS) for (let d = 1; d <= 9; d++) {
        const where = u.filter((i) => !g[i] && cand[i] & (1 << d));
        if (where.length < 2) continue;
        for (const v of UNITS) {
          if (v === u || !where.every((i) => v.includes(i))) continue;
          if (remove(v.filter((i) => !where.includes(i)), 1 << d)) return true;
        }
      }
      return false;
    };
    const subsets = (k) => {
      for (const u of UNITS) {
        const open = u.filter((i) => !g[i]);
        // k pól z łącznie k cyframi: te cyfry znikają z reszty linii
        for (const cs of combos(open.filter((i) => bits(cand[i]) <= k), k)) {
          const m = cs.reduce((s, i) => s | cand[i], 0);
          if (bits(m) === k && remove(open.filter((i) => !cs.includes(i)), m)) return true;
        }
        // k cyfr mieszczących się w k polach: z tych pól znikają inne cyfry
        const ds = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => open.some((i) => cand[i] & (1 << d)));
        for (const dc of combos(ds, k)) {
          const m = dc.reduce((s, d) => s | (1 << d), 0);
          const cells = open.filter((i) => cand[i] & m);
          if (cells.length !== k) continue;
          let hit = false;
          for (const i of cells) if (cand[i] & ~m) { cand[i] &= m; hit = true; }
          if (hit) return true;
        }
      }
      return false;
    };
    const xwing = () => {
      for (const [lines, cross] of [[UNITS.slice(0, 9), UNITS.slice(9, 18)], [UNITS.slice(9, 18), UNITS.slice(0, 9)]]) {
        for (let d = 1; d <= 9; d++) {
          const pos = lines.map((u) => u.map((i, k) => (!g[i] && cand[i] & (1 << d) ? k : -1)).filter((k) => k >= 0));
          for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) {
            if (pos[a].length !== 2 || pos[b].length !== 2 || pos[a][0] !== pos[b][0] || pos[a][1] !== pos[b][1]) continue;
            const keep = new Set([...lines[a], ...lines[b]]);
            const cells = [...cross[pos[a][0]], ...cross[pos[a][1]]].filter((i) => !keep.has(i));
            if (remove(cells, 1 << d)) return true;
          }
        }
      }
      return false;
    };
    const ywing = () => {
      const pairs = [...Array(81).keys()].filter((i) => !g[i] && bits(cand[i]) === 2);
      for (const p of pairs) {
        const wings = pairs.filter((q) => q !== p && PEERS[p].includes(q) && bits(cand[p] & cand[q]) === 1);
        for (const a of wings) for (const b of wings) {
          if (a >= b || (cand[a] & cand[b] & cand[p])) continue;
          const z = cand[a] & cand[b];
          if (bits(z) !== 1 || (cand[a] | cand[b] | cand[p]) !== (cand[p] | z)) continue;
          if (remove(PEERS[a].filter((j) => j !== b && j !== p && PEERS[b].includes(j)), z)) return true;
        }
      }
      return false;
    };

    for (;;) {
      if (!g.includes(0)) return level;
      if (cand.some((m, i) => !g[i] && !m)) return 0;
      if (singles()) continue;
      if (locked() || subsets(2)) { level = Math.max(level, 2); continue; }
      if (subsets(3) || xwing() || ywing()) { level = 3; continue; }
      return 0;
    }
  }

  // Usuwa cyfry, dopóki rozwiązanie zostaje jedno, a plansza da się rozwiązać technikami do poziomu `tier`.
  // Plansza trafia do gry tylko wtedy, gdy wymaga dokładnie tego poziomu technik.
  function generate(tier, minGivens = 17) {
    for (;;) {
      const solution = new Array(81).fill(0);
      fill(solution);
      const puzzle = solution.slice();
      let left = 81;
      for (const i of shuffle([...Array(81).keys()])) {
        if (left <= minGivens) break;
        puzzle[i] = 0;
        const t = grade(puzzle);
        if (t && t <= tier) left--;
        else puzzle[i] = solution[i];
      }
      if (grade(puzzle) === tier) return (api.last = { puzzle, solution, tier });
    }
  }

  // Pola, których cyfra powtarza się w wierszu, kolumnie lub kwadracie.
  function conflicts(g) {
    const bad = new Set();
    for (let i = 0; i < 81; i++) {
      if (!g[i]) continue;
      for (let j = i + 1; j < 81; j++) {
        if (g[i] !== g[j]) continue;
        const same = ((i / 9) | 0) === ((j / 9) | 0) || i % 9 === j % 9 ||
          (((i / 27) | 0) === ((j / 27) | 0) && (((i % 9) / 3) | 0) === (((j % 9) / 3) | 0));
        if (same) bad.add(i).add(j);
      }
    }
    return bad;
  }

  const api = { generate, grade, count, solve, conflicts, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Sudoku;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "sudoku"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, tier: 1, minGivens: 30 },
    { key: "medium", name: "Średni", points: 25, tier: 2, minGivens: 24 },
    { key: "hard", name: "Trudny", points: 50, tier: 3, minGivens: 17 },
  ],
  rules: [
    "Wpisz cyfry od 1 do 9 tak, by każda wystąpiła raz w każdym wierszu, kolumnie i kwadracie 3 × 3.",
    "Każdą planszę da się rozwiązać bez zgadywania. Łatwy wymaga tylko szukania jedynego miejsca dla cyfry, średni par i blokad w kwadratach, trudny technik takich jak X-wing.",
    "Klawiatura: strzałki, cyfry, Backspace. N przełącza notatki, Ctrl+Z cofa.",
  ],
  achievements: [
    { id: "bez-bledu", name: "Bez skreśleń", desc: "Rozwiąż planszę, nie wpisując ani jednej błędnej cyfry.", points: 10 },
    { id: "sprint", name: "Szybkie sudoku", desc: "Rozwiąż średni poziom w mniej niż 8 min.", points: 25 },
    { id: "mistrz", name: "Mistrz sudoku", desc: "Rozwiąż trudny poziom w mniej niż 15 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { puzzle } = Sudoku.generate(ctx.level.tier, ctx.level.minGivens);
    const g = puzzle.slice(), notes = new Array(81).fill(0);
    let sel = puzzle.indexOf(0);
    const peersOf = (i) => {
      const r = (i / 9) | 0, c = i % 9, b = ((r / 3) | 0) * 3 + ((c / 3) | 0);
      return [...Array(81).keys()].filter((j) => j !== i && (((j / 9) | 0) === r || j % 9 === c || ((((j / 9) | 0) / 3) | 0) * 3 + (((j % 9) / 3) | 0) === b));
    };

    board.classList.add("sd");
    board.style.setProperty("--cols", 9);
    board.style.setProperty("--rows", 9);
    const cells = g.map((_, i) => {
      const r = (i / 9) | 0, c = i % 9;
      const b = button("", "cell sd-cell");
      b.dataset.i = i;
      b.style.setProperty("--k", r + c);
      if (c === 2 || c === 5) b.classList.add("box-r");
      if (r === 2 || r === 5) b.classList.add("box-b");
      b.setAttribute("aria-label", `Wiersz ${r + 1}, kolumna ${c + 1}`);
      board.append(b);
      return b;
    });
    roundCorners(cells, 9);

    let mistakes = 0;
    const save = ctx.undoable(([gs, ns, s]) => {
      gs.forEach((v, i) => (g[i] = v));
      ns.forEach((v, i) => (notes[i] = v));
      sel = s;
      render();
    });
    const snapshot = () => [g.slice(), notes.slice(), sel];

    const controls = digitControls(ctx, 9, {
      put,
      remaining: () => Array.from({ length: 10 }, (_, d) => 9 - g.filter((v) => v === d).length),
    });

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".sd-cell");
      if (b) { sel = +b.dataset.i; render(); }
    });
    cellKeys(ctx, {
      cols: 9, rows: 9, max: 9,
      get: () => sel,
      set: (i) => { sel = i; render(); cells[i].focus({ preventScroll: true }); },
      onDigit: (d) => put(d, controls.isNotes()),
      keys: controls.keys,
    });

    const empties = puzzle.filter((v) => !v).length;
    const r0 = (i) => (i / 9) | 0, c0 = (i) => i % 9, b0 = (i) => ((r0(i) / 3) | 0) * 3 + ((c0(i) / 3) | 0);
    const units = (i) => [
      [...Array(81).keys()].filter((j) => r0(j) === r0(i)),
      [...Array(81).keys()].filter((j) => c0(j) === c0(i)),
      [...Array(81).keys()].filter((j) => b0(j) === b0(i)),
    ];

    function put(d, asNote) {
      if (ctx.done || sel < 0) return;
      if (puzzle[sel]) { replay(cells[sel], "shake"); return; }
      if (asNote && d) {
        if (g[sel]) return;
        save(snapshot());
        notes[sel] ^= 1 << d;
        Sound.tap();
      } else {
        if (g[sel] === d && !notes[sel]) return;
        save(snapshot());
        g[sel] = d;
        notes[sel] = 0;
        // wpisana cyfra znika z notatek w tym samym wierszu, kolumnie i kwadracie
        if (d) peersOf(sel).forEach((j) => (notes[j] &= ~(1 << d)));
      }
      render();
      ctx.progress((g.filter(Boolean).length - (81 - empties)) / empties);
      if (asNote) return;
      if (!d) return Sound.erase();
      const bad = Sudoku.conflicts(g);
      if (bad.has(sel)) {
        mistakes++;
        Sound.error();
        replay(cells[sel], "shake");
        return;
      }
      if (!g.includes(0) && bad.size === 0) {
        if (!mistakes) ctx.achieve("bez-bledu");
      if (ctx.level.key === "medium" && ctx.time < 480) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 900 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      // ukończony wiersz, kolumna lub kwadrat: błysk rozchodzi się od wpisanego pola
      const done = units(sel).filter((u) => u.every((j) => g[j] && !bad.has(j)));
      if (!done.length) return Sound.place(d);
      Sound.line();
      const dist = (j) => Math.abs(r0(j) - r0(sel)) + Math.abs(c0(j) - c0(sel));
      done.forEach((u) => sweep(u.sort((a, b) => dist(a) - dist(b)).map((j) => cells[j])));
    }

    const ring = selectionRing(board);
    function render() {
      if (sel >= 0) ring(cells[sel]);
      const bad = Sudoku.conflicts(g);
      const peers = new Set(sel >= 0 ? peersOf(sel) : []);
      const v = g[sel];
      cells.forEach((b, i) => {
        drawDigit(b, g[i], notes[i], 9);
        b.classList.toggle("given", !!puzzle[i]);
        b.classList.toggle("sel", i === sel);
        b.classList.toggle("peer", peers.has(i));
        b.classList.toggle("same", i !== sel && !!v && g[i] === v);
        b.classList.toggle("bad", bad.has(i) && !puzzle[i]);
        b.classList.toggle("clash", bad.has(i) && !!puzzle[i]);
      });
      controls.update();
    }
    render();
  },
});
