// Układanka (jak 1010!): wstawiaj klocki z tacki na planszę N × N. Pełny wiersz albo kolumna znika.
// Klocek: lista pól [wiersz, kolumna] od lewego górnego rogu. Gra kończy się, gdy żaden klocek z tacki się nie mieści.
const BlockPuzzle = (() => {
  const N = 8;
  const P = (rows) => rows.flatMap((row, r) => [...row].map((ch, c) => (ch === "#" ? [r, c] : null)).filter(Boolean));
  const SHAPES = [
    ["#"], ["##"], ["#", "#"], ["###"], ["#", "#", "#"], ["####"], ["#", "#", "#", "#"], ["#####"], ["#", "#", "#", "#", "#"],
    ["##", "##"], ["###", "###", "###"],
    ["##", "#."], ["##", ".#"], ["#.", "##"], [".#", "##"],
    ["###", "#..", "#.."], ["###", "..#", "..#"], ["#..", "#..", "###"], ["..#", "..#", "###"],
    ["###", ".#."], [".#.", "###"], ["##.", ".##"], [".##", "##."],
  ].map(P);
  // częstsze małe i średnie klocki, rzadziej duże
  const WEIGHTS = [3, 3, 3, 3, 3, 2, 2, 1, 1, 3, 1, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 1, 1];
  const randomShape = () => {
    let k = Math.random() * WEIGHTS.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SHAPES.length; i++) if ((k -= WEIGHTS[i]) < 0) return i;
    return 0;
  };
  const fits = (g, shape, r, c) => SHAPES[shape].every(([dr, dc]) => r + dr >= 0 && r + dr < N && c + dc >= 0 && c + dc < N && g[(r + dr) * N + c + dc] < 0);
  const anyFit = (g, shape) => { for (let i = 0; i < N * N; i++) if (fits(g, shape, (i / N) | 0, i % N)) return i; return -1; };
  // wstawia klocek i czyści pełne linie; zwraca { cells, lines, cleared }
  function place(g, shape, r, c, color) {
    const cells = SHAPES[shape].map(([dr, dc]) => (r + dr) * N + c + dc);
    cells.forEach((i) => (g[i] = color));
    const full = [];
    for (let k = 0; k < N; k++) {
      const row = [...Array(N).keys()].map((x) => k * N + x), col = [...Array(N).keys()].map((x) => x * N + k);
      if (row.every((i) => g[i] >= 0)) full.push(row);
      if (col.every((i) => g[i] >= 0)) full.push(col);
    }
    const cleared = new Set(full.flat());
    cleared.forEach((i) => (g[i] = -1));
    return { cells, lines: full.length, cleared };
  }
  const points = (cells, lines) => cells + (lines * (lines + 1)) / 2 * 10;
  const api = { N, SHAPES, randomShape, fits, anyFit, place, points, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = BlockPuzzle;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "ukladanka"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 250 },
    { key: "medium", name: "Średni", points: 25, target: 500 },
    { key: "hard", name: "Trudny", points: 50, target: 900 },
  ],
  rules: [
    "Przeciągaj klocki z tacki pod planszą na wolne miejsca. Klocków nie da się obracać.",
    "Pełny wiersz albo kolumna znika. Kilka linii naraz daje premię.",
    "Gdy wstawisz wszystkie trzy klocki, pojawią się nowe. Zbierz wymagane punkty, zanim zabraknie miejsca. Zamiast przeciągać możesz kliknąć klocek, a potem pole planszy.",
  ],
  mount(board, ctx) {
    const { N, SHAPES } = BlockPuzzle;
    const target = ctx.level.target;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#15aabf", "#f76707", "#f06595"];
    const s = { g: new Array(N * N).fill(-1), tray: [], score: 0 };
    BlockPuzzle.last = s;
    const deal = () => { s.tray = Array.from({ length: 3 }, () => { const k = BlockPuzzle.randomShape(); return { shape: k, color: rnd(COLORS.length) }; }); };
    deal();
    let picked = -1;
    board.classList.add("bp");
    board.style.setProperty("--cols", N + 0.5);
    board.style.setProperty("--rows", N + 3.8);
    const grid = el("div", "bp-grid");
    const cells = Array.from({ length: N * N }, (_, i) => {
      const d = el("div", "bp-cell");
      d.dataset.i = i;
      grid.append(d);
      return d;
    });
    const tray = el("div", "bp-tray");
    board.append(grid, tray);
    const scoreEl = statBlock(ctx, "Punkty", { meter: true });
    const save = ctx.undoable(([g, t, sc]) => { s.g = g; s.tray = t; s.score = sc; picked = -1; render(); });

    // rysunek klocka jako siatka małych pól
    const pieceEl = (p, k) => {
      const shape = SHAPES[p.shape];
      const h = Math.max(...shape.map(([r]) => r)) + 1, w = Math.max(...shape.map(([, c]) => c)) + 1;
      const d = button("", "bp-piece");
      d.style.setProperty("--pw", w);
      d.style.setProperty("--ph", h);
      d.style.setProperty("--pc", COLORS[p.color]);
      d.dataset.k = k;
      d.setAttribute("aria-label", `Klocek ${k + 1}`);
      shape.forEach(([r, c]) => { const q = el("i"); q.style.gridArea = `${r + 1} / ${c + 1}`; d.append(q); });
      return d;
    };

    function drop(k, r, c) {
      const p = s.tray[k];
      if (!p || ctx.done || !BlockPuzzle.fits(s.g, p.shape, r, c)) return false;
      save([s.g.slice(), s.tray.slice(), s.score]);
      const res = BlockPuzzle.place(s.g, p.shape, r, c, p.color);
      s.score += BlockPuzzle.points(res.cells.length, res.lines);
      s.tray[k] = null;
      if (s.tray.every((x) => !x)) deal();
      picked = -1;
      render();
      res.cells.forEach((i) => { if (!res.cleared.has(i)) replay(cells[i], "drop"); });
      res.cleared.forEach((i) => replay(cells[i], "clear"));
      if (res.lines) { Sound.line(); if (res.lines > 1) ctx.toast(`${res.lines} linie naraz!`); } else Sound.place(4);
      if (s.score >= target) { ctx.win(); return true; }
      if (s.tray.every((x) => !x || BlockPuzzle.anyFit(s.g, x.shape) < 0)) ctx.lose("Brak miejsca", `Żaden klocek się nie mieści. Zabrakło ${target - s.score} punktów.`);
      return true;
    }

    // przeciąganie: duch klocka nad palcem, podgląd miejsca na planszy
    let drag = null;
    const anchor = (e) => {
      const c0 = cells[0].getBoundingClientRect(), cell = cells[1].getBoundingClientRect().left - c0.left;
      const gr = { left: c0.left, top: c0.top };
      const shape = SHAPES[s.tray[drag.k].shape];
      const h = Math.max(...shape.map(([r]) => r)) + 1, w = Math.max(...shape.map(([, c]) => c)) + 1;
      // na dotyku klocek jest nad palcem, żeby było go widać
      const lift = e.pointerType === "touch" ? cell * 1.6 : 0;
      const x = e.clientX - gr.left - (w * cell) / 2, y = e.clientY - lift - gr.top - (h * cell) / 2;
      return [Math.round(y / cell), Math.round(x / cell), cell, lift, w, h];
    };
    tray.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".bp-piece");
      if (!b || ctx.done) return;
      e.preventDefault();
      const k = +b.dataset.k;
      drag = { k, ghost: pieceEl(s.tray[k], k), moved: false, x: e.clientX, y: e.clientY };
      drag.ghost.classList.add("ghost");
      document.body.append(drag.ghost);
      b.classList.add("lifted");
      move(e);
    });
    const move = (e) => {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
      const [r, c, cell, lift, w, h] = anchor(e);
      drag.ghost.style.setProperty("--cell", `${cell / 1.08}px`); // rozstaw pól ducha = rozstaw planszy
      drag.ghost.style.left = `${e.clientX - (w * cell) / 2}px`;
      drag.ghost.style.top = `${e.clientY - lift - (h * cell) / 2}px`;
      preview(drag.k, r, c);
    };
    ctx.on(document, "pointermove", move);
    ctx.on(document, "pointerup", (e) => {
      if (!drag) return;
      const { k, ghost, moved } = drag;
      const [r, c] = anchor(e);
      drag = null;
      ghost.remove();
      preview(-1);
      if (!moved) { picked = picked === k ? -1 : k; Sound.tap(); return render(); }
      if (!drop(k, r, c)) { Sound.error(); render(); }
    });
    ctx.onStop(() => drag?.ghost.remove());
    // kliknięcie pola przy wybranym klocku: pole to lewy górny róg klocka
    grid.addEventListener("click", (e) => {
      const d = e.target.closest(".bp-cell");
      if (!d || picked < 0) return;
      const i = +d.dataset.i;
      if (!drop(picked, (i / N) | 0, i % N)) { Sound.error(); replay(grid, "shake"); }
    });
    grid.addEventListener("pointerover", (e) => {
      const d = e.target.closest(".bp-cell");
      if (d && picked >= 0 && !drag) preview(picked, (+d.dataset.i / N) | 0, +d.dataset.i % N);
    });
    grid.addEventListener("pointerleave", () => !drag && preview(-1));

    function preview(k, r, c) {
      cells.forEach((d) => d.classList.remove("ok", "no"));
      if (k < 0 || !s.tray[k]) return;
      const shape = SHAPES[s.tray[k].shape];
      const ok = BlockPuzzle.fits(s.g, s.tray[k].shape, r, c);
      shape.forEach(([dr, dc]) => {
        const a = r + dr, b = c + dc;
        if (a >= 0 && a < N && b >= 0 && b < N) cells[a * N + b].classList.add(ok ? "ok" : "no");
      });
      grid.style.setProperty("--pv", COLORS[s.tray[k].color]);
    }

    function render() {
      cells.forEach((d, i) => {
        d.classList.toggle("full", s.g[i] >= 0);
        d.style.setProperty("--bc", s.g[i] >= 0 ? COLORS[s.g[i]] : "");
      });
      tray.replaceChildren(...s.tray.map((p, k) => {
        const slot = el("div", "bp-slot");
        if (p) {
          const d = pieceEl(p, k);
          d.classList.toggle("picked", k === picked);
          d.classList.toggle("dead", BlockPuzzle.anyFit(s.g, p.shape) < 0);
          slot.append(d);
        }
        return slot;
      }));
      scoreEl.set(s.score, s.score / target, `Cel: ${target}`);
      ctx.progress(s.score / target);
    }
    render();
  },
});
