// Lampy (Akari): żarówka oświetla swój wiersz i kolumnę aż do ściany. Oświetl wszystkie białe pola.
// Żarówki nie mogą się oświetlać nawzajem; cyfra na ścianie = liczba żarówek tuż obok niej.
// wall[i]: -1 białe pole, -2 ściana bez cyfry, 0–4 ściana z cyfrą.
const Akari = (() => {
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // pola oświetlone przez żarówkę w `i` (bez niej samej), z odległością
  function rays(wall, n, i) {
    const out = [];
    const r0 = (i / n) | 0, c0 = i % n;
    for (const [dr, dc] of DIRS) {
      for (let r = r0 + dr, c = c0 + dc, d = 1; r >= 0 && r < n && c >= 0 && c < n && wall[r * n + c] === -1; r += dr, c += dc, d++) out.push([r * n + c, d]);
    }
    return out;
  }
  const around = (n, i) => {
    const r = (i / n) | 0, c = i % n;
    return DIRS.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n).map(([a, b]) => a * n + b);
  };

  function generate(n, density, show) {
    const wall = new Array(n * n).fill(-1);
    for (let i = 0; i < n * n; i++) {
      if (Math.random() < density / 2) { wall[i] = -2; wall[n * n - 1 - i] = -2; }
    }
    const bulbs = new Set(), lit = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) if (wall[i] !== -1) lit[i] = 1;
    for (;;) {
      const dark = [...lit.keys()].filter((i) => !lit[i]);
      if (!dark.length) break;
      const i = pick(dark);
      bulbs.add(i);
      lit[i] = 1;
      for (const [j] of rays(wall, n, i)) lit[j] = 1;
    }
    for (let i = 0; i < n * n; i++) {
      if (wall[i] === -1) continue;
      const k = around(n, i).filter((j) => bulbs.has(j)).length;
      // ściany przy żarówkach pokazują cyfrę chętniej, zera rzadziej
      if (Math.random() < (k ? show : show * 0.6)) wall[i] = k;
    }
    return (api.last = { n, wall, solution: bulbs });
  }

  function check(wall, n, bulbs) {
    const lit = new Map();
    const clash = new Set();
    for (const b of bulbs) {
      lit.set(b, 0);
      for (const [j, d] of rays(wall, n, b)) {
        if (bulbs.has(j)) clash.add(b);
        if (!lit.has(j) || lit.get(j) > d) lit.set(j, d);
      }
    }
    const numbers = new Map();
    let ok = true;
    for (let i = 0; i < n * n; i++) {
      if (wall[i] < 0) continue;
      const k = around(n, i).filter((j) => bulbs.has(j)).length;
      numbers.set(i, k);
      if (k !== wall[i]) ok = false;
    }
    const whites = wall.filter((w) => w === -1).length;
    return { lit, clash, numbers, solved: ok && !clash.size && lit.size === whites };
  }

  const api = { rays, around, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Akari;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "lampy"), {
  levels: [
    { key: "easy", name: "7 × 7", points: 10, n: 7, density: 0.24, show: 1 },
    { key: "medium", name: "9 × 9", points: 25, n: 9, density: 0.22, show: 0.85 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, density: 0.2, show: 0.7 },
  ],
  rules: [
    "Postaw żarówki tak, by oświetlić każde białe pole. Żarówka świeci w swoim wierszu i kolumnie, aż do ściany.",
    "Żarówki nie mogą oświetlać siebie nawzajem.",
    "Cyfra na ścianie mówi, ile żarówek stoi tuż obok niej (nad, pod i po bokach). Ściany bez cyfry mogą mieć dowolną liczbę.",
    "Kliknięcie stawia żarówkę, drugie kropkę (tu na pewno nie ma żarówki), trzecie czyści. Prawy przycisk od razu stawia kropkę.",
  ],
  mount(board, ctx) {
    const { n, wall } = Akari.generate(ctx.level.n, ctx.level.density, ctx.level.show);
    const mark = new Array(n * n).fill(0); // 0 nic, 1 żarówka, 2 kropka
    let cur = wall.indexOf(-1);
    const cells = gridCells(board, n, n, "ak", { gap: 0.06, label: null });
    board.style.setProperty("--max", "78px");
    cells.forEach((b, i) => {
      if (wall[i] === -1) { b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}`); return; }
      b.classList.add("wall");
      b.disabled = true;
      if (wall[i] >= 0) b.append(el("span", "", wall[i]));
    });
    const save = ctx.undoable((s) => { s.forEach((v, i) => (mark[i] = v)); render(); });
    const info = statBlock(ctx, "Oświetlone", { meter: true });

    const set = (i, v) => {
      if (ctx.done || wall[i] !== -1 || mark[i] === v) return;
      save(mark.slice());
      mark[i] = v;
      const res = render(v === 1 ? i : -1);
      if (res.solved) return ctx.win();
      if (v === 1 && res.clash.has(i)) return Sound.error();
      v === 1 ? Sound.place(5) : v === 2 ? Sound.tap() : Sound.erase();
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (!b || b.disabled) return;
      const i = +b.dataset.i;
      cur = i;
      set(i, e.button === 2 ? (mark[i] === 2 ? 0 : 2) : (mark[i] + 1) % 3);
    });
    cellKeys(ctx, {
      cols: n, rows: n,
      get: () => cur,
      set: (i) => { cur = i; if (wall[i] === -1) cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => set(cur, (mark[cur] + 1) % 3), enter: () => set(cur, (mark[cur] + 1) % 3), l: () => set(cur, 1), x: () => set(cur, 2) },
    });

    const whites = wall.filter((w) => w === -1).length;
    // from: świeżo postawiona żarówka; światło rozchodzi się od niej po kolei
    function render(from = -1) {
      const bulbs = new Set();
      mark.forEach((m, i) => m === 1 && bulbs.add(i));
      const res = Akari.check(wall, n, bulbs);
      const spread = new Map(from >= 0 ? Akari.rays(wall, n, from) : []);
      cells.forEach((b, i) => {
        if (wall[i] !== -1) {
          if (wall[i] >= 0) {
            const k = res.numbers.get(i);
            b.classList.toggle("ok", k === wall[i]);
            b.classList.toggle("bad", k > wall[i] || (k < wall[i] && Akari.around(n, i).every((j) => wall[j] !== -1 || mark[j])));
          }
          return;
        }
        const was = b.classList.contains("lit");
        b.classList.toggle("lit", res.lit.has(i));
        b.style.setProperty("--d", `${(spread.get(i) || 0) * 35}ms`);
        if (!was && res.lit.has(i) && spread.has(i)) replay(b, "wave");
        b.classList.toggle("bulb", mark[i] === 1);
        b.classList.toggle("dot", mark[i] === 2);
        b.classList.toggle("bad", res.clash.has(i));
      });
      info.set(`${res.lit.size} / ${whites}`, res.lit.size / whites, `Żarówki: ${bulbs.size}`);
      ctx.progress((res.lit.size / whites) * 0.95);
      return res;
    }
    render();
  },
});
