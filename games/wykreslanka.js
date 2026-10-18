// Wykreślanka: słowa z jednej kategorii ukryte w siatce liter (poziomo, pionowo, na ukos, na trudnym także wspak).
const WordSearch = (() => {
  const FILL = "aaaaabcccdddeeeeegghiiiiijjkkklllłłmmmnnnnoooooopppprrrrsssssttttuuwwwyyyzzzząćęńóśźż";
  function generate(source, n, count, dirs) {
    for (;;) {
      const [category, list] = pick(Object.entries(source));
      const pool = shuffle(list.split(" ").filter((w) => [...w].length >= 3 && [...w].length <= n));
      if (pool.length < count) continue;
      const g = new Array(n * n).fill("");
      const placed = [];
      for (const word of pool) {
        if (placed.length >= count) break;
        const ch = [...word];
        for (let t = 0; t < 200; t++) {
          const [dr, dc] = pick(dirs), r = rnd(n), c = rnd(n);
          const er = r + dr * (ch.length - 1), ec = c + dc * (ch.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
          const cells = ch.map((_, k) => (r + dr * k) * n + c + dc * k);
          if (cells.some((i, k) => g[i] && g[i] !== ch[k])) continue;
          cells.forEach((i, k) => (g[i] = ch[k]));
          placed.push({ word, cells });
          break;
        }
      }
      if (placed.length < count) continue;
      for (let i = 0; i < n * n; i++) if (!g[i]) g[i] = FILL[rnd(FILL.length)];
      return (api.last = { category, grid: g, words: placed });
    }
  }
  // pola na odcinku od a do b, jeśli to linia pozioma, pionowa albo ukośna
  function line(n, a, b) {
    const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
    const dr = Math.sign(br - ar), dc = Math.sign(bc - ac), len = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
    if (ar !== br && ac !== bc && Math.abs(br - ar) !== Math.abs(bc - ac)) return null;
    return Array.from({ length: len + 1 }, (_, k) => (ar + dr * k) * n + ac + dc * k);
  }
  const api = { generate, line, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = WordSearch;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wykreslanka"), {
  levels: [
    { key: "easy", name: "8 × 8", points: 10, n: 8, count: 6, dirs: [[0, 1], [1, 0]] },
    { key: "medium", name: "10 × 10", points: 25, n: 10, count: 8, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1]] },
    { key: "hard", name: "12 × 12", points: 50, n: 12, count: 11, dirs: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] },
  ],
  rules: [
    "Znajdź w siatce wszystkie słowa z listy. Przeciągnij od pierwszej do ostatniej litery słowa.",
    "Na łatwym słowa biegną w prawo albo w dół, na średnim także po skosie, a na trudnym również wspak.",
    "Słowa mogą się krzyżować i dzielić litery.",
  ],
  achievements: [
    { id: "bystre-oko", name: "Bystre oko", desc: "Znajdź wszystkie słowa na planszy 8 × 8 w mniej niż minutę.", points: 10 },
    { id: "tropiciel", name: "Tropiciel słów", desc: "Znajdź wszystkie słowa na planszy 10 × 10 w mniej niż 2 minuty.", points: 25 },
    { id: "mistrz-wykreslanki", name: "Mistrz wykreślanki", desc: "Znajdź wszystkie słowa na planszy 12 × 12 w mniej niż 4 minuty.", points: 50 },
  ],
  mount(board, ctx) {
    const { n } = ctx.level;
    const { category, grid, words } = WordSearch.generate(WORDS_PL, n, ctx.level.count, ctx.level.dirs);
    const found = new Set();
    const PAL = ["#e03131", "#1c7ed6", "#2f9e44", "#f59f00", "#ae3ec9", "#0c8599", "#f76707", "#f06595", "#5c940d", "#364fc7", "#c2255c"];
    const cells = gridCells(board, n, n, "wsr", { gap: 0, tag: "div", label: null });
    board.style.setProperty("--max", "60px");
    cells.forEach((d, i) => (d.textContent = grid[i]));
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
    svg.setAttribute("class", "wsr-svg");
    svg.setAttribute("aria-hidden", "true");
    const live = document.createElementNS(NS, "line");
    live.setAttribute("class", "wsr-live");
    svg.append(live);
    board.append(svg);
    const list = el("div", "chips");
    const chips = words.map((w) => { const c = el("span", "chip", w.word); list.append(c); return c; });
    ctx.panel.append(panelBlock(`Kategoria: ${category}`, list));
    const info = statBlock(ctx, "Znalezione", { meter: true, small: true });

    const at = (i) => [(i % n) + 0.5, ((i / n) | 0) + 0.5];
    const stroke = (ln, a, b) => {
      const [x1, y1] = at(a), [x2, y2] = at(b);
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1); ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
    };
    let from = -1, to = -1;
    const cellAt = (e) => {
      const r = board.getBoundingClientRect();
      const c = Math.floor(((e.clientX - r.left) / r.width) * n), w = Math.floor(((e.clientY - r.top) / r.height) * n);
      return c >= 0 && c < n && w >= 0 && w < n ? w * n + c : -1;
    };
    board.addEventListener("pointerdown", (e) => {
      if (ctx.done) return;
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      from = to = i;
      stroke(live, i, i);
      live.classList.add("on");
      Sound.tap();
    });
    ctx.on(document, "pointermove", (e) => {
      if (from < 0) return;
      const i = cellAt(e);
      if (i < 0 || i === to || !WordSearch.line(n, from, i)) return;
      to = i;
      stroke(live, from, to);
    });
    ctx.on(document, "pointerup", () => {
      if (from < 0) return;
      live.classList.remove("on");
      const path = WordSearch.line(n, from, to);
      from = -1;
      if (!path || path.length < 2) return;
      const k = words.findIndex((w, j) => !found.has(j) && w.cells.length === path.length && (w.cells.every((c, x) => c === path[x]) || w.cells.every((c, x) => c === path[path.length - 1 - x])));
      if (k < 0) return Sound.error();
      found.add(k);
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("class", "wsr-hit");
      ln.style.setProperty("--wc", PAL[k % PAL.length]);
      stroke(ln, words[k].cells[0], words[k].cells[words[k].cells.length - 1]);
      svg.insertBefore(ln, live);
      words[k].cells.forEach((c, x) => { cells[c].style.setProperty("--si", x); replay(cells[c], "sweep"); });
      replay(chips[k], "pop");
      Sound.line();
      render();
      if (found.size === words.length) {
        if (ctx.level.key === "easy" && ctx.time < 60) ctx.achieve("bystre-oko");
        if (ctx.level.key === "medium" && ctx.time < 120) ctx.achieve("tropiciel");
        if (ctx.level.key === "hard" && ctx.time < 240) ctx.achieve("mistrz-wykreslanki");
        ctx.win();
      }
    });

    function render() {
      chips.forEach((c, k) => c.classList.toggle("done", found.has(k)));
      info.set(`${found.size} / ${words.length}`, found.size / words.length);
      ctx.progress(found.size / words.length);
    }
    render();
  },
});
