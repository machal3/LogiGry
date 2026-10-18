// Kalkudoku (KenKen): kwadrat łaciński n × n podzielony na klatki; cyfry w klatce dają wynik działania.
// Klatka: { cells, op: "" | "+" | "−" | "×" | "÷", target }. Odejmowanie i dzielenie tylko w klatkach dwupolowych.
const Kalkudoku = (() => {
  const apply = (op, vals) => {
    if (op === "+" || op === "") return vals.reduce((a, b) => a + b, 0);
    if (op === "×") return vals.reduce((a, b) => a * b, 1);
    const [a, b] = vals[0] > vals[1] ? vals : [vals[1], vals[0]];
    return op === "−" ? a - b : a / b;
  };

  function latin(n) {
    const rp = shuffle([...Array(n).keys()]), cp = shuffle([...Array(n).keys()]), sp = shuffle([...Array(n).keys()]);
    return Array.from({ length: n * n }, (_, i) => sp[(rp[(i / n) | 0] + cp[i % n]) % n] + 1);
  }

  function cages(grid, n, ops) {
    const owner = new Int16Array(n * n).fill(-1), list = [];
    for (const start of shuffle([...Array(n * n).keys()])) {
      if (owner[start] >= 0) continue;
      const roll = Math.random();
      const size = roll < 0.05 ? 1 : roll < 0.5 ? 2 : roll < 0.85 ? 3 : 4;
      const cells = [start];
      owner[start] = list.length;
      while (cells.length < size) {
        const opts = cells.flatMap((i) => {
          const r = (i / n) | 0, c = i % n;
          return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n).map(([a, b]) => a * n + b);
        }).filter((j) => owner[j] < 0);
        if (!opts.length) break;
        const j = pick(opts);
        owner[j] = list.length;
        cells.push(j);
      }
      const vals = cells.map((i) => grid[i]);
      let op;
      if (cells.length === 1) op = "";
      else if (cells.length === 2) {
        const [a, b] = vals[0] > vals[1] ? vals : [vals[1], vals[0]];
        const choice = shuffle(ops.slice()).find((o) => o !== "÷" || a % b === 0);
        op = choice;
      } else op = ops.includes("×") && Math.random() < 0.45 && apply("×", vals) <= 300 ? "×" : "+";
      list.push({ cells: cells.sort((a, b) => a - b), op, target: apply(op, vals) });
    }
    return list;
  }

  // Liczba rozwiązań (do 2): przegląd klatek z gotowymi listami pasujących wypełnień.
  function count(cageList, n, limit = 2) {
    const tuples = cageList.map(({ cells, op, target }) => {
      const out = [];
      const vals = new Array(cells.length);
      const go = (k) => {
        if (k === cells.length) { if (apply(op, vals) === target) out.push(vals.slice()); return; }
        for (let d = 1; d <= n; d++) {
          // w obrębie klatki nie ma dwóch takich samych cyfr w jednym wierszu ani kolumnie
          if (cells.slice(0, k).some((j, t) => vals[t] === d && (((j / n) | 0) === ((cells[k] / n) | 0) || j % n === cells[k] % n))) continue;
          vals[k] = d;
          go(k + 1);
        }
      };
      go(0);
      return out;
    });
    const rows = new Uint16Array(n), cols = new Uint16Array(n), done = new Uint8Array(cageList.length);
    let sols = 0;
    const fits = (k, t) => cageList[k].cells.every((i, j) => !((rows[(i / n) | 0] | cols[i % n]) & (1 << t[j])));
    const go = () => {
      if (sols >= limit) return;
      let best = -1, bestList = null;
      for (let k = 0; k < cageList.length; k++) {
        if (done[k]) continue;
        const ok = tuples[k].filter((t) => fits(k, t));
        if (!ok.length) return;
        if (!bestList || ok.length < bestList.length) { best = k; bestList = ok; if (ok.length === 1) break; }
      }
      if (best < 0) { sols++; return; }
      done[best] = 1;
      for (const t of bestList) {
        cageList[best].cells.forEach((i, j) => { rows[(i / n) | 0] |= 1 << t[j]; cols[i % n] |= 1 << t[j]; });
        go();
        cageList[best].cells.forEach((i, j) => { rows[(i / n) | 0] &= ~(1 << t[j]); cols[i % n] &= ~(1 << t[j]); });
      }
      done[best] = 0;
    };
    go();
    return sols;
  }

  function generate(n, ops) {
    for (;;) {
      const solution = latin(n);
      for (let t = 0; t < 20; t++) {
        const list = cages(solution, n, ops);
        if (count(list, n) === 1) return (api.last = { n, solution, cages: list });
      }
    }
  }

  // Konflikty w wierszach i kolumnach oraz klatki pełne ze złym wynikiem / dobrym wynikiem.
  function check(g, n, cageList) {
    const bad = new Set();
    for (let a = 0; a < n * n; a++) {
      if (!g[a]) continue;
      for (let b = a + 1; b < n * n; b++) {
        if (g[a] === g[b] && (((a / n) | 0) === ((b / n) | 0) || a % n === b % n)) { bad.add(a); bad.add(b); }
      }
    }
    const wrong = new Set(), right = new Set();
    cageList.forEach(({ cells, op, target }, k) => {
      if (cells.some((i) => !g[i])) return;
      (apply(op, cells.map((i) => g[i])) === target ? right : wrong).add(k);
    });
    return { bad, wrong, right };
  }

  const api = { apply, cages, count, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Kalkudoku;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "kalkudoku"), {
  levels: [
    { key: "easy", name: "4 × 4", points: 10, n: 4, ops: ["+", "−"] },
    { key: "medium", name: "5 × 5", points: 25, n: 5, ops: ["+", "−", "×", "÷"] },
    { key: "hard", name: "6 × 6", points: 50, n: 6, ops: ["+", "−", "×", "÷"] },
  ],
  rules: [
    "Wpisz cyfry od 1 do rozmiaru planszy. W każdym wierszu i kolumnie każda cyfra występuje dokładnie raz.",
    "Pogrubione ramki wyznaczają klatki. Liczba w rogu to wynik działania na cyfrach klatki, np. 12+ to suma 12, a 2÷ to iloraz większej przez mniejszą.",
    "W jednej klatce cyfra może się powtórzyć, jeśli nie leży w tym samym wierszu ani kolumnie.",
  ],
  achievements: [
    { id: "bez-bledu", name: "Bez skreśleń", desc: "Rozwiąż planszę, nie wpisując ani jednej błędnej cyfry.", points: 10 },
    { id: "sprint", name: "Szybkie rachunki", desc: "Rozwiąż średni poziom w mniej niż 5 min.", points: 25 },
    { id: "mistrz", name: "Mistrz klatek", desc: "Rozwiąż trudny poziom w mniej niż 8 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, cages } = Kalkudoku.generate(ctx.level.n, ctx.level.ops);
    const g = new Array(n * n).fill(0), notes = new Array(n * n).fill(0);
    const owner = new Array(n * n);
    cages.forEach((cg, k) => cg.cells.forEach((i) => (owner[i] = k)));
    let sel = 0;

    board.classList.add("kd");
    board.style.setProperty("--cols", n);
    board.style.setProperty("--rows", n);
    board.style.setProperty("--n", n);
    const cells = Array.from({ length: n * n }, (_, i) => {
      const r = (i / n) | 0, c = i % n;
      const b = button("", "cell kd-cell");
      b.dataset.i = i;
      b.style.setProperty("--k", r + c);
      if (c < n - 1 && owner[i + 1] !== owner[i]) b.classList.add("cb-r");
      if (r < n - 1 && owner[i + n] !== owner[i]) b.classList.add("cb-b");
      b.setAttribute("aria-label", `Wiersz ${r + 1}, kolumna ${c + 1}`);
      board.append(b);
      return b;
    });
    roundCorners(cells, n);
    const labels = cages.map((cg) => {
      const lab = el("span", "kd-lab", `${cg.target}${cg.op}`);
      return lab;
    });

    let mistakes = 0;
    const save = ctx.undoable(([gs, ns, s]) => { gs.forEach((v, i) => (g[i] = v)); ns.forEach((v, i) => (notes[i] = v)); sel = s; render(); });
    const controls = digitControls(ctx, n, { put, remaining: () => Array.from({ length: n + 1 }, (_, d) => n - g.filter((v) => v === d).length) });
    const cageInfo = el("p", "");
    ctx.panel.append(panelBlock("Klatka", cageInfo));

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".kd-cell");
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
      if (asNote && d) {
        if (g[sel]) return;
        save([g.slice(), notes.slice(), sel]);
        notes[sel] ^= 1 << d;
        Sound.tap();
        return render();
      }
      if (g[sel] === d && !notes[sel]) return;
      save([g.slice(), notes.slice(), sel]);
      g[sel] = d;
      notes[sel] = 0;
      const r = (sel / n) | 0, c = sel % n;
      if (d) for (let k = 0; k < n; k++) { notes[r * n + k] &= ~(1 << d); notes[k * n + c] &= ~(1 << d); }
      const res = render();
      ctx.progress(g.filter(Boolean).length / (n * n));
      if (!d) return Sound.erase();
      if (res.bad.has(sel) || res.wrong.has(owner[sel])) { mistakes++; Sound.error(); return replay(cells[sel], "shake"); }
      if (!g.includes(0) && !res.bad.size && res.right.size === cages.length) {
        if (!mistakes) ctx.achieve("bez-bledu");
      if (ctx.level.key === "medium" && ctx.time < 300) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 480 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      if (res.right.has(owner[sel])) { Sound.line(); return sweep(cages[owner[sel]].cells.map((j) => cells[j])); }
      Sound.place(d);
    }

    const ring = selectionRing(board);
    function render() {
      ring(cells[sel]);
      const res = Kalkudoku.check(g, n, cages);
      const r = (sel / n) | 0, c = sel % n;
      cells.forEach((b, i) => {
        drawDigit(b, g[i], notes[i], n);
        const cg = cages[owner[i]];
        if (cg.cells[0] === i) b.prepend(labels[owner[i]]);
        b.classList.toggle("peer", i !== sel && (((i / n) | 0) === r || i % n === c));
        b.classList.toggle("mine", owner[i] === owner[sel]);
        b.classList.toggle("bad", res.bad.has(i));
      });
      labels.forEach((lab, k) => {
        lab.classList.toggle("ok", res.right.has(k));
        lab.classList.toggle("wrong", res.wrong.has(k));
      });
      const cg = cages[owner[sel]];
      const opName = { "": "pojedyncze pole", "+": "suma", "−": "różnica", "×": "iloczyn", "÷": "iloraz" }[cg.op];
      cageInfo.textContent = `${cg.target}${cg.op}: ${opName}, ${cg.cells.length} ${plural(cg.cells.length, "pole", "pola", "pól")}.`;
      controls.update();
      return res;
    }
    render();
  },
});
