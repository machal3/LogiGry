// Piętnastka: kafle 1..n²−1 i jedno wolne miejsce (0). Tasowanie losowymi ruchami, więc układ zawsze da się ułożyć.
const Fifteen = (() => {
  const solved = (n) => [...Array(n * n - 1).keys()].map((k) => k + 1).concat(0);
  // przesunięcie kafla z pola i na wolne miejsce (także całego rzędu kafli w linii z wolnym polem)
  function slide(t, n, i) {
    const z = t.indexOf(0);
    const zr = (z / n) | 0, zc = z % n, r = (i / n) | 0, c = i % n;
    if (i === z || (zr !== r && zc !== c)) return null;
    const step = zr === r ? Math.sign(c - zc) : Math.sign(r - zr) * n;
    const moved = [];
    for (let p = z; p !== i; p += step) { t[p] = t[p + step]; moved.push(t[p]); }
    t[i] = 0;
    return moved;
  }
  function scramble(n, steps) {
    const t = solved(n);
    let prev = -1;
    const back = []; // wolne pola po kolei; kliknięte od końca cofają tasowanie
    for (let k = 0; k < steps; k++) {
      const z = t.indexOf(0), r = (z / n) | 0, c = z % n;
      const opts = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n).map(([a, b]) => a * n + b).filter((j) => j !== prev);
      const j = pick(opts);
      slide(t, n, j);
      back.push(z);
      prev = z;
    }
    if (t.every((v, i) => v === solved(n)[i])) return scramble(n, steps);
    return (api.last = { n, tiles: t, solution: back.reverse() });
  }
  // suma odległości kafli od ich miejsc: miara postępu
  const distance = (t, n) => t.reduce((s, v, i) => s + (v ? Math.abs(((v - 1) / n | 0) - ((i / n) | 0)) + Math.abs(((v - 1) % n) - (i % n)) : 0), 0);
  const api = { solved, slide, scramble, distance, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Fifteen;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "pietnastka"), {
  levels: [
    { key: "easy", name: "3 × 3", points: 10, n: 3, steps: 120 },
    { key: "medium", name: "4 × 4", points: 25, n: 4, steps: 400 },
    { key: "hard", name: "5 × 5", points: 50, n: 5, steps: 900 },
  ],
  rules: [
    "Ułóż kafle po kolei od 1 w lewym górnym rogu, wolne miejsce zostaw na końcu.",
    "Kliknij kafel w tym samym wierszu albo kolumnie co wolne miejsce: przesunie się razem z kaflami po drodze.",
    "Strzałki i przesunięcia palcem wsuwają kafel na wolne miejsce z danej strony.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez cofania", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybkie palce", desc: "Rozwiąż średni poziom w mniej niż 2 min.", points: 25 },
    { id: "mistrz", name: "Mistrz piętnastki", desc: "Rozwiąż trudny poziom w mniej niż 5 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n } = ctx.level;
    const { tiles } = Fifteen.scramble(n, ctx.level.steps);
    const start = Fifteen.distance(tiles, n);
    let moves = 0;
    board.classList.add("ft");
    board.style.setProperty("--n", n);
    board.style.setProperty("--cols", n + 0.08 * (n + 1));
    board.style.setProperty("--rows", n + 0.08 * (n + 1));
    const nodes = new Map();
    for (let v = 1; v < n * n; v++) {
      const b = button("", "ft-tile");
      b.dataset.v = v;
      const tr = ((v - 1) / n) | 0, tc = (v - 1) % n;
      // kolor kafla zależy od jego docelowego miejsca: ułożone rzędy tworzą gradient
      b.style.setProperty("--dk", `${((tr + tc) / (2 * n - 2)) * 30}%`);
      b.append(el("span", "", v));
      board.append(b);
      nodes.set(v, b);
    }
    const movesEl = statBlock(ctx, "Ruchy", { small: false });
    const placedEl = statBlock(ctx, "Na miejscu", { meter: true, small: true });
    const save = ctx.undoable(([t, m]) => { t.forEach((v, i) => (tiles[i] = v)); moves = m; render(); });

    const go = (i) => {
      if (ctx.done) return;
      const before = tiles.slice();
      const moved = Fifteen.slide(tiles, n, i);
      if (!moved) return Sound.tap();
      save([before, moves]);
      moves++;
      render();
      Sound.place(1 + (moved[moved.length - 1] % 9));
      if (tiles.every((v, k) => v === (k === n * n - 1 ? 0 : k + 1))) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 120) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 300 && ctx.undos === 0) ctx.achieve("mistrz");
      ctx.win();
      }
    };
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".ft-tile");
      if (b) go(tiles.indexOf(+b.dataset.v));
    });
    // kierunek = w którą stronę jedzie kafel
    directionInput(ctx, board, (dir) => {
      const z = tiles.indexOf(0), r = (z / n) | 0, c = z % n;
      const from = { up: [r + 1, c], down: [r - 1, c], left: [r, c + 1], right: [r, c - 1] }[dir];
      if (from[0] >= 0 && from[0] < n && from[1] >= 0 && from[1] < n) go(from[0] * n + from[1]);
    });

    function render() {
      tiles.forEach((v, i) => {
        if (!v) return;
        const b = nodes.get(v);
        b.style.setProperty("--r", (i / n) | 0);
        b.style.setProperty("--c0", i % n);
        b.classList.toggle("home", v === i + 1);
        b.setAttribute("aria-label", `Kafel ${v}`);
      });
      const home = tiles.filter((v, i) => v === i + 1).length;
      movesEl.set(moves);
      placedEl.set(`${home} / ${n * n - 1}`, home / (n * n - 1));
      ctx.progress(1 - Fifteen.distance(tiles, n) / start);
    }
    render();
  },
});
