// Zalewanie (Flood-it): plama z lewego górnego rogu przejmuje wybrany kolor i wchłania sąsiednie pola tego koloru.
// Cel: jedna barwa na całej planszy w limicie ruchów. Limit = wynik prostego solvera + zapas poziomu.
const Flood = (() => {
  // pola plamy z rogu (BFS po tym samym kolorze); zwraca też odległość od rogu do animacji
  function region(g, n) {
    const c = g[0], seen = new Map([[0, 0]]), queue = [0];
    while (queue.length) {
      const i = queue.shift(), r = (i / n) | 0, k = i % n, d = seen.get(i);
      for (const j of [r > 0 ? i - n : -1, r < n - 1 ? i + n : -1, k > 0 ? i - 1 : -1, k < n - 1 ? i + 1 : -1]) {
        if (j >= 0 && !seen.has(j) && g[j] === c) { seen.set(j, d + 1); queue.push(j); }
      }
    }
    return seen;
  }
  function fill(g, n, color) {
    for (const i of region(g, n).keys()) g[i] = color;
    return region(g, n);
  }
  // zachłannie z podglądem dwóch ruchów: wybór koloru, po którym plama urośnie najbardziej
  function greedy(g0, n, colors) {
    const g = g0.slice();
    const plan = [];
    while (region(g, n).size < n * n && plan.length < 200) {
      let best = -1, bestSize = -1;
      for (let a = 0; a < colors; a++) {
        if (a === g[0]) continue;
        const h = g.slice();
        let size = fill(h, n, a).size;
        for (let b = 0; b < colors; b++) {
          if (b === a) continue;
          const h2 = h.slice();
          size = Math.max(size, fill(h2, n, b).size - 0.5);
        }
        if (size > bestSize) { bestSize = size; best = a; }
      }
      fill(g, n, best);
      plan.push(best);
    }
    return plan;
  }
  function generate(n, colors) {
    const grid = Array.from({ length: n * n }, () => rnd(colors));
    const plan = greedy(grid, n, colors);
    return (api.last = { grid, best: plan.length, plan });
  }
  const api = { region, fill, greedy, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Flood;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "zalewanie"), {
  levels: [
    { key: "easy", name: "10 × 10", points: 10, n: 10, colors: 5, slack: 5 },
    { key: "medium", name: "14 × 14", points: 25, n: 14, colors: 6, slack: 2 },
    { key: "hard", name: "18 × 18", points: 50, n: 18, colors: 6, slack: 0 },
  ],
  rules: [
    "Plama zaczyna się w lewym górnym rogu. Wybierz kolor: plama go przyjmie i wchłonie wszystkie sąsiednie pola w tym kolorze.",
    "Zalej całą planszę jednym kolorem, zanim skończą się ruchy.",
    "Kolor wybierasz przyciskiem w panelu, klawiszem 1–6 albo kliknięciem dowolnego pola w tym kolorze.",
  ],
  mount(board, ctx) {
    const { n, colors, slack } = ctx.level;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#0c8599"];
    const { grid, best } = Flood.generate(n, colors);
    const g = grid.slice();
    const limit = best + slack;
    let moves = 0;
    const cells = gridCells(board, n, n, "fd", { gap: 0, tag: "div", label: null });
    board.style.setProperty("--max", "44px");
    board.setAttribute("aria-label", "Plansza kolorów");
    const pad = el("div", "fd-pad");
    const swatches = COLORS.slice(0, colors).map((c, k) => {
      const b = button("", "fd-swatch", () => play(k));
      b.style.setProperty("--fc", c);
      b.setAttribute("aria-label", `Kolor ${k + 1}`);
      b.append(el("span", "", k + 1));
      pad.append(b);
      return b;
    });
    ctx.panel.append(panelBlock("Kolor", pad));
    const movesEl = statBlock(ctx, "Ruchy", { meter: true });
    const save = ctx.undoable(([s, m]) => { s.forEach((v, i) => (g[i] = v)); moves = m; render(); });

    function play(k) {
      if (ctx.done || k === g[0]) return;
      if (moves >= limit) return;
      const before = Flood.region(g, n);
      save([g.slice(), moves]);
      const after = Flood.fill(g, n, k);
      moves++;
      // nowe pola zalewają się falą od rogu
      after.forEach((d, i) => {
        if (before.has(i)) return;
        cells[i].style.setProperty("--d", `${Math.min(d, 30) * 22}ms`);
        replay(cells[i], "soak");
      });
      Sound.place(1 + k);
      render();
      if (after.size === n * n) return ctx.win(moves < best ? "Lepiej niż komputer!" : "");
      if (moves >= limit) ctx.lose("Koniec ruchów", `Zostało ${n * n - after.size} ${plural(n * n - after.size, "pole", "pola", "pól")} do zalania.`);
    }
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) play(g[+b.dataset.i]);
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      const k = +e.key;
      if (k >= 1 && k <= colors) { e.preventDefault(); play(k - 1); }
    });

    function render() {
      const reg = Flood.region(g, n);
      cells.forEach((b, i) => {
        b.style.setProperty("--fc", COLORS[g[i]]);
        b.classList.toggle("mine", reg.has(i));
      });
      swatches.forEach((b, k) => b.classList.toggle("now", k === g[0]));
      movesEl.set(`${moves} / ${limit}`, moves / limit, slack ? `Komputer potrzebował ${best}. Masz zapas ${slack}.` : `Komputer potrzebował ${best}. Zmieść się w tym samym.`);
      ctx.progress(reg.size / (n * n));
    }
    render();
  },
});
