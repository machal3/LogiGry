// 2048: przesuwaj kafle, takie same łączą się w jeden o podwójnej wartości. Cel: kafel o zadanej wartości.
// Kafel: { id, v, r, c }. Plansza n×n.
const G2048 = (() => {
  let nextId = 1;
  const VEC = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  function spawn(tiles, n) {
    const taken = new Set(tiles.map((t) => t.r * n + t.c));
    const free = [...Array(n * n).keys()].filter((i) => !taken.has(i));
    if (!free.length) return null;
    const i = free[Math.floor(Math.random() * free.length)];
    const t = { id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r: (i / n) | 0, c: i % n };
    tiles.push(t);
    return t;
  }

  // Ruch w kierunku dir. Zwraca nowe kafle, kafle znikające po połączeniu (gone: przesuwają się i znikają),
  // nowe kafle z połączeń (merged), zdobyte punkty i czy cokolwiek się ruszyło.
  function move(tiles, n, dir) {
    const [dr, dc] = VEC[dir];
    const at = new Map(tiles.map((t) => [t.r * n + t.c, t]));
    const out = [], gone = [], merged = [];
    let score = 0, moved = false;
    for (let line = 0; line < n; line++) {
      // pola linii od krawędzi, do której przesuwamy
      const cells = Array.from({ length: n }, (_, k) => {
        const p = dr === 1 || dc === 1 ? n - 1 - k : k;
        return dr ? [p, line] : [line, p];
      });
      let slot = 0, last = null;
      for (const [r, c] of cells) {
        const t = at.get(r * n + c);
        if (!t) continue;
        if (last && last.v === t.v && !last.fresh) {
          const m = { id: nextId++, v: t.v * 2, r: last.r, c: last.c, fresh: true };
          gone.push({ ...t, r: last.r, c: last.c }, last);
          out.splice(out.indexOf(last), 1, m);
          merged.push(m);
          score += m.v;
          last = m;
          moved = true;
          continue;
        }
        const [tr, tc] = cells[slot++];
        if (tr !== r || tc !== c) moved = true;
        last = { ...t, r: tr, c: tc };
        out.push(last);
      }
    }
    out.forEach((t) => delete t.fresh);
    return { tiles: out, gone, merged, score, moved };
  }

  const canMove = (tiles, n) => tiles.length < n * n || Object.keys(VEC).some((d) => move(tiles, n, d).moved);

  function create(n) {
    const tiles = [];
    spawn(tiles, n);
    spawn(tiles, n);
    return (api.last = { n, tiles, score: 0 });
  }

  const api = { spawn, move, canMove, create, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = G2048;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "2048"), {
  levels: [
    { key: "easy", name: "256", points: 10, goal: 256 },
    { key: "medium", name: "512", points: 25, goal: 512 },
    { key: "hard", name: "1024", points: 50, goal: 1024 },
  ],
  rules: [
    "Przesuwaj wszystkie kafle naraz. Dwa kafle z tą samą liczbą łączą się w jeden o podwójnej wartości.",
    "Po każdym ruchu pojawia się nowy kafel. Wygrywasz, gdy powstanie kafel z liczbą docelową; przegrywasz, gdy zabraknie ruchów.",
    "Sterowanie: strzałki albo WASD, na telefonie przesunięcie palcem.",
  ],
  mount(board, ctx) {
    const n = 4, goal = ctx.level.goal;
    const s = G2048.create(n);
    const els = new Map();
    let busy = false;

    board.classList.add("tf");
    board.style.setProperty("--cols", n + 0.12 * (n + 1));
    board.style.setProperty("--rows", n + 0.12 * (n + 1));
    board.style.setProperty("--n", n);
    for (let i = 0; i < n * n; i++) board.append(el("span", "tf-slot"));

    const scoreEl = el("p", "panel-big", "0");
    const best = el("p", "");
    const meter = el("div", "meter");
    const fill = el("span");
    meter.append(fill);
    ctx.panel.append(panelBlock("Wynik", scoreEl), panelBlock(`Cel: ${goal}`, meter, best));

    // poziom wartości 2 → 1, 4 → 2 … określa odcień kafla
    const lvl = (v) => Math.log2(v);
    const tileEl = (t, cls) => {
      const d = el("div", `tf-tile ${cls || ""}`);
      d.append(el("span", "", t.v));
      place(d, t);
      board.append(d);
      els.set(t.id, d);
      return d;
    };
    function place(d, t) {
      d.style.setProperty("--tr", t.r);
      d.style.setProperty("--tc", t.c);
      d.style.setProperty("--l", Math.min(1, lvl(t.v) / lvl(goal)));
      d.classList.toggle("dark", lvl(t.v) / lvl(goal) > 0.45);
      d.dataset.digits = String(t.v).length;
    }
    s.tiles.forEach((t) => tileEl(t, "new"));

    function go(dir) {
      if (ctx.done || busy) return;
      const res = G2048.move(s.tiles, n, dir);
      if (!res.moved) {
        // szturchnięcie planszy: ruch w tę stronę nic nie zmienia
        const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[dir];
        board.style.translate = `${dc * 6}px ${dr * 6}px`;
        setTimeout(() => (board.style.translate = ""), 90);
        return;
      }
      busy = true;
      s.tiles = res.tiles;
      s.score += res.score;
      // przesunięcie: istniejące kafle jadą na nowe miejsca, połączone jadą i znikają
      res.gone.forEach((t) => { const d = els.get(t.id); if (d) { place(d, t); d.classList.add("gone"); els.delete(t.id); setTimeout(() => d.remove(), 130); } });
      res.tiles.forEach((t) => { const d = els.get(t.id); if (d) place(d, t); });
      setTimeout(() => {
        res.merged.forEach((t) => tileEl(t, "merged"));
        const fresh = G2048.spawn(s.tiles, n);
        if (fresh) tileEl(fresh, "new");
        busy = false;
        render();
        const top = Math.max(...s.tiles.map((t) => t.v));
        if (res.merged.length) Sound.place(Math.min(9, lvl(Math.max(...res.merged.map((t) => t.v)))));
        else Sound.tap();
        if (top >= goal) return ctx.win();
        if (!G2048.canMove(s.tiles, n)) ctx.lose("Brak ruchów", "Plansza się zapełniła.");
      }, 110);
    }
    directionInput(ctx, board, go);

    function render() {
      const top = Math.max(...s.tiles.map((t) => t.v));
      scoreEl.textContent = s.score;
      fill.style.width = `${(lvl(top) / lvl(goal)) * 100}%`;
      best.textContent = `Największy kafel: ${top}`;
      ctx.progress((lvl(top) - 1) / (lvl(goal) - 1));
    }
    render();
  },
});
