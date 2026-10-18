// Hitori: zamaluj część pól tak, by w żadnym wierszu i kolumnie nie powtarzała się cyfra wśród białych pól.
// Zamalowane pola nie stykają się bokami, a białe tworzą jeden spójny obszar. Plansza n × n, wierszami.
const Hitori = (() => {
  const nbrs = (i, n) => {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  };

  // czy pola nie-zamalowane (shade[i] != 1) są spójne
  function connected(shade, n) {
    const start = [...shade.keys()].find((i) => shade[i] !== 1);
    const seen = new Uint8Array(n * n), stack = [start];
    seen[start] = 1;
    let count = 1;
    while (stack.length) {
      for (const j of nbrs(stack.pop(), n)) if (!seen[j] && shade[j] !== 1) { seen[j] = 1; count++; stack.push(j); }
    }
    return count === shade.filter((v) => v !== 1).length;
  }

  // Sprawdzenie zasad: zwraca pola w konflikcie i informację, czy plansza jest rozwiązana.
  function check(grid, shade, n) {
    const bad = new Set();
    for (let i = 0; i < n * n; i++) {
      if (shade[i] === 1) for (const j of nbrs(i, n)) if (shade[j] === 1) { bad.add(i); bad.add(j); }
    }
    const lines = [];
    for (let k = 0; k < n; k++) {
      lines.push([...Array(n).keys()].map((c) => k * n + c), [...Array(n).keys()].map((r) => r * n + k));
    }
    let dupes = 0;
    for (const line of lines) {
      const by = new Map();
      for (const i of line) if (shade[i] !== 1) by.set(grid[i], [...(by.get(grid[i]) || []), i]);
      for (const group of by.values()) if (group.length > 1) {
        dupes++;
        // na czerwono tylko pola oznaczone jako pewne białe
        const sure = group.filter((i) => shade[i] === 2);
        if (sure.length > 1) sure.forEach((i) => bad.add(i));
      }
    }
    const linked = connected(shade, n);
    return { bad, solved: !bad.size && !dupes && linked, linked };
  }

  // Liczba rozwiązań (do 2), gdy zamalować można tylko pola z powtarzającą się cyfrą.
  function count(grid, n) {
    const peers = Array.from({ length: n * n }, (_, i) => {
      const r = (i / n) | 0, c = i % n, out = [];
      for (let k = 0; k < n; k++) {
        if (k !== c && grid[r * n + k] === grid[i]) out.push(r * n + k);
        if (k !== r && grid[k * n + c] === grid[i]) out.push(k * n + c);
      }
      return out;
    });
    const st = new Int8Array(n * n).fill(-1); // -1 nieznane, 0 białe, 1 zamalowane
    peers.forEach((p, i) => { if (!p.length) st[i] = 0; });
    let sols = 0;
    const assign = (s, i, v, trail) => {
      const queue = [[i, v]];
      while (queue.length) {
        const [a, x] = queue.pop();
        if (s[a] === x) continue;
        if (s[a] !== -1) return false;
        s[a] = x;
        trail.push(a);
        if (x === 1) { for (const j of nbrs(a, n)) queue.push([j, 0]); }
        else for (const j of peers[a]) queue.push([j, 1]);
      }
      return true;
    };
    const go = () => {
      if (sols > 1) return;
      const i = st.indexOf(-1);
      if (!connected(Array.from(st, (v) => (v === 1 ? 1 : 0)), n)) return;
      if (i < 0) { sols++; return; }
      for (const v of [1, 0]) {
        const trail = [];
        if (assign(st, i, v, trail)) go();
        trail.forEach((a) => (st[a] = -1));
      }
    };
    go();
    return sols;
  }

  function generate(n, density) {
    for (;;) {
      const rp = shuffle([...Array(n).keys()]), cp = shuffle([...Array(n).keys()]), sp = shuffle([...Array(n).keys()]);
      const grid = Array.from({ length: n * n }, (_, i) => sp[(rp[(i / n) | 0] + cp[i % n]) % n] + 1);
      const shade = new Array(n * n).fill(0);
      let k = 0;
      for (const i of shuffle([...Array(n * n).keys()])) {
        if (k >= n * n * density) break;
        if (nbrs(i, n).some((j) => shade[j])) continue;
        shade[i] = 1;
        if (!connected(shade, n)) { shade[i] = 0; continue; }
        k++;
      }
      // zamalowane pole dostaje cyfrę, która już jest wśród białych w jego wierszu albo kolumnie
      const puzzle = grid.slice();
      for (let i = 0; i < n * n; i++) {
        if (!shade[i]) continue;
        const r = (i / n) | 0, c = i % n, opts = [];
        for (let t = 0; t < n; t++) {
          if (!shade[r * n + t]) opts.push(grid[r * n + t]);
          if (!shade[t * n + c]) opts.push(grid[t * n + c]);
        }
        puzzle[i] = pick(opts);
      }
      if (count(puzzle, n) === 1) return (api.last = { n, grid: puzzle, solution: shade });
    }
  }

  const api = { check, count, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Hitori;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "hitori"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, n: 5, density: 0.3 },
    { key: "medium", name: "7 × 7", points: 25, n: 7, density: 0.3 },
    { key: "hard", name: "9 × 9", points: 50, n: 9, density: 0.32 },
  ],
  rules: [
    "Zamaluj część pól tak, by w każdym wierszu i kolumnie żadna cyfra nie powtarzała się na białych polach.",
    "Zamalowane pola nie mogą stykać się bokami. Wszystkie białe pola muszą łączyć się ze sobą w jeden obszar.",
    "Kliknięcie zamalowuje pole, drugie oznacza je kółkiem jako na pewno białe, trzecie czyści. Prawy przycisk od razu stawia kółko.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Czysty pędzel", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybkie oko", desc: "Rozwiąż średni poziom w mniej niż 4 min.", points: 25 },
    { id: "mistrz", name: "Mistrz cieni", desc: "Rozwiąż trudny poziom w mniej niż 6 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, grid, solution } = Hitori.generate(ctx.level.n, ctx.level.density);
    const shade = new Array(n * n).fill(0); // 0 puste, 1 zamalowane, 2 kółko
    let cur = 0;
    const cells = gridCells(board, n, n, "ht", { gap: 0.07 });
    board.style.setProperty("--max", "76px");
    cells.forEach((b, i) => b.append(el("span", "ht-num", grid[i])));
    const save = ctx.undoable((s) => { s.forEach((v, i) => (shade[i] = v)); render(); });
    const info = statBlock(ctx, "Zamalowane", { small: true });

    const set = (i, v) => {
      if (ctx.done || shade[i] === v) return;
      save(shade.slice());
      shade[i] = v;
      replay(cells[i], v === 1 ? "ink" : "pop");
      const res = render();
      if (res.solved) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 240) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 360 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      if (res.bad.has(i)) return Sound.error();
      v === 1 ? Sound.place(grid[i]) : v === 2 ? Sound.tap() : Sound.erase();
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (!b) return;
      const i = +b.dataset.i;
      cur = i;
      set(i, e.button === 2 ? (shade[i] === 2 ? 0 : 2) : (shade[i] + 1) % 3);
    });
    cellKeys(ctx, {
      cols: n, rows: n,
      get: () => cur,
      set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => set(cur, (shade[cur] + 1) % 3), enter: () => set(cur, (shade[cur] + 1) % 3), x: () => set(cur, 1), o: () => set(cur, 2) },
    });

    function render() {
      const res = Hitori.check(grid, shade, n);
      cells.forEach((b, i) => {
        b.classList.toggle("on", shade[i] === 1);
        b.classList.toggle("ring", shade[i] === 2);
        b.classList.toggle("bad", res.bad.has(i));
        b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}, cyfra ${grid[i]}${shade[i] === 1 ? ", zamalowane" : shade[i] === 2 ? ", białe" : ""}`);
      });
      board.classList.toggle("split", !res.linked);
      const k = shade.filter((v) => v === 1).length;
      info.set(`${k} ${plural(k, "pole", "pola", "pól")}`, null, res.linked ? "Białe pola są połączone." : "Uwaga: białe pola rozpadły się na części.");
      ctx.progress(Math.min(1, k / solution.filter(Boolean).length) * 0.95);
      return res;
    }
    render();
  },
});
