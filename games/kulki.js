// Kulki (Lines): przestawiaj kulki po wolnej drodze; pięć lub więcej w jednym kolorze w linii (także ukośnej) znika.
// Ruch bez zbicia dokłada trzy nowe kulki. Plansza N × N, g[i] = kolor albo -1.
const Lines = (() => {
  const N = 9;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  // linie ≥ 5 przechodzące przez pole i
  function linesAt(g, i) {
    const out = new Set();
    const r = (i / N) | 0, c = i % N, col = g[i];
    if (col < 0) return out;
    for (const [dr, dc] of DIRS) {
      const run = [i];
      for (const s of [1, -1]) {
        for (let a = r + dr * s, b = c + dc * s; a >= 0 && a < N && b >= 0 && b < N && g[a * N + b] === col; a += dr * s, b += dc * s) run.push(a * N + b);
      }
      if (run.length >= 5) run.forEach((j) => out.add(j));
    }
    return out;
  }
  function path(g, from, to) {
    const prev = new Map([[from, -1]]), queue = [from];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      if (i === to) break;
      const r = (i / N) | 0, c = i % N;
      for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        const j = a * N + b;
        if (a < 0 || a >= N || b < 0 || b >= N || g[j] >= 0 || prev.has(j)) continue;
        prev.set(j, i);
        queue.push(j);
      }
    }
    if (!prev.has(to)) return null;
    const out = [];
    for (let i = to; i !== -1; i = prev.get(i)) out.unshift(i);
    return out;
  }
  const points = (k) => k * 2 + (k - 5) * 2;
  function spawn(g, colors) {
    const free = [...g.keys()].filter((i) => g[i] < 0);
    return shuffle(free).slice(0, colors.length).map((i, k) => { g[i] = colors[k]; return i; });
  }
  const api = { N, linesAt, path, points, spawn, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Lines;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "kulki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, colors: 5, target: 60 },
    { key: "medium", name: "Średni", points: 25, colors: 6, target: 110 },
    { key: "hard", name: "Trudny", points: 50, colors: 7, target: 160 },
  ],
  rules: [
    "Kliknij kulkę, a potem wolne pole. Kulka przejedzie tam, jeśli prowadzi do niego wolna droga (bez skosów).",
    "Pięć albo więcej kulek w jednym kolorze w linii, także ukośnej, znika i daje punkty. Dłuższe linie dają więcej.",
    "Każdy ruch bez zbicia dokłada trzy nowe kulki, widoczne wcześniej w panelu. Zbierz wymagane punkty, zanim plansza się zapełni.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez odwrotu", desc: "Wygraj bez cofania ruchu.", points: 10 },
    { id: "szybkie-kulki", name: "Szybkie kulki", desc: "Wygraj średni poziom w mniej niż 5 minut.", points: 25 },
    { id: "mistrz-kulek", name: "Mistrz kulek", desc: "Wygraj trudny poziom bez cofania ruchu.", points: 50 },
  ],
  mount(board, ctx) {
    const { N } = Lines;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#15aabf", "#f76707"];
    const K = ctx.level.colors, target = ctx.level.target;
    const s = { g: new Array(N * N).fill(-1), score: 0, next: [] };
    Lines.last = s;
    const roll = () => Array.from({ length: 3 }, () => rnd(K));
    Lines.spawn(s.g, roll().concat(rnd(K), rnd(K)));
    s.next = roll();
    let sel = -1, busy = false, cur = 40;
    const cells = gridCells(board, N, N, "ln", { gap: 0.06 });
    board.style.setProperty("--max", "70px");
    cells.forEach((b) => b.append(el("span", "ln-ball")));
    const nextEl = el("div", "ln-next");
    const scoreEl = statBlock(ctx, "Punkty", { meter: true });
    ctx.panel.append(panelBlock("Następne", nextEl));
    const save = ctx.undoable(([g, sc, nx]) => { s.g = g; s.score = sc; s.next = nx; sel = -1; render(); });
    const wait = (ms) => new Promise((r) => { const t = setTimeout(r, ms); ctx.onStop(() => clearTimeout(t)); });

    async function move(from, to) {
      const p = Lines.path(s.g, from, to);
      if (!p) { replay(cells[to], "shake"); return Sound.error(); }
      busy = true;
      save([s.g.slice(), s.score, s.next.slice()]);
      const col = s.g[from];
      sel = -1;
      for (let k = 1; k < p.length; k++) {
        s.g[p[k - 1]] = -1;
        s.g[p[k]] = col;
        render();
        await wait(32);
      }
      Sound.tap();
      if (!clear([to])) {
        const added = Lines.spawn(s.g, s.next);
        s.next = roll();
        added.forEach((i) => replay(cells[i], "drop"));
        clear(added);
        render();
        if (s.g.every((v) => v >= 0)) { busy = false; return ctx.lose("Plansza pełna", `Zabrakło ${target - s.score} punktów.`); }
      }
      busy = false;
      render();
      if (s.score >= target) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        if (ctx.level.key === "medium" && ctx.time < 300) ctx.achieve("szybkie-kulki");
        if (ctx.level.key === "hard" && ctx.undos === 0) ctx.achieve("mistrz-kulek");
        ctx.win();
      }
    }
    function clear(at) {
      const gone = new Set();
      at.forEach((i) => Lines.linesAt(s.g, i).forEach((j) => gone.add(j)));
      if (!gone.size) return false;
      s.score += Lines.points(gone.size);
      gone.forEach((j) => { s.g[j] = -1; replay(cells[j], "burst"); });
      Sound.line();
      render();
      return true;
    }
    const choose = (i) => {
      if (busy || ctx.done) return;
      if (s.g[i] >= 0) { sel = sel === i ? -1 : i; Sound.tap(); return render(); }
      if (sel >= 0) move(sel, i);
    };
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) choose(+b.dataset.i);
    });
    cellKeys(ctx, {
      cols: N, rows: N,
      get: () => cur,
      set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => choose(cur), enter: () => choose(cur) },
    });

    function render() {
      cells.forEach((b, i) => {
        const v = s.g[i];
        b.classList.toggle("has", v >= 0);
        b.style.setProperty("--bc", v >= 0 ? COLORS[v] : "transparent");
        b.classList.toggle("sel", i === sel);
      });
      nextEl.replaceChildren(...s.next.map((v) => { const d = el("span"); d.style.setProperty("--bc", COLORS[v]); return d; }));
      const free = s.g.filter((v) => v < 0).length;
      scoreEl.set(s.score, s.score / target, `Cel: ${target}. Wolne pola: ${free}`);
      ctx.progress(s.score / target);
    }
    render();
  },
});
