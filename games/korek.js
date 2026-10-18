// Korek (Rush Hour): parking 6 × 6, wyjazd po prawej w trzecim rzędzie. Auta jeżdżą tylko wzdłuż swojej osi.
// Pojazd: { r, c, len, h } (h = poziomy). Pojazd 0 to auto gracza w rzędzie 2. Ruch = przesunięcie o dowolną liczbę pól.
const RushHour = (() => {
  const N = 6, EXIT_ROW = 2;

  function grid(cars) {
    const g = new Int8Array(N * N).fill(-1);
    cars.forEach((v, k) => { for (let t = 0; t < v.len; t++) g[(v.r + (v.h ? 0 : t)) * N + v.c + (v.h ? t : 0)] = k; });
    return g;
  }
  // zakres położeń pojazdu k (pierwsze pole) przy obecnym ustawieniu reszty
  function range(cars, k, g = grid(cars)) {
    const v = cars[k];
    let lo = v.h ? v.c : v.r, hi = lo;
    const free = (p) => { const i = v.h ? v.r * N + p : p * N + v.c; return g[i] === -1 || g[i] === k; };
    while (lo > 0 && free(lo - 1)) lo--;
    while (hi + v.len < N && free(hi + v.len)) hi++;
    return [lo, hi];
  }
  const apply = (cars, k, p) => cars.map((v, j) => (j !== k ? v : v.h ? { ...v, c: p } : { ...v, r: p }));
  const solved = (cars) => cars[0].c === N - 2;

  function random(count) {
    for (;;) {
      const cars = [{ r: EXIT_ROW, c: rnd(3), len: 2, h: true }];
      let g = grid(cars);
      for (let t = 0; t < 300 && cars.length < count; t++) {
        const len = Math.random() < 0.3 ? 3 : 2, h = Math.random() < 0.5;
        const r = rnd(h ? N : N - len + 1), c = rnd(h ? N - len + 1 : N);
        if (h && r === EXIT_ROW) continue; // poziome auto w rzędzie wyjazdu zablokowałoby wyjazd na zawsze
        const v = { r, c, len, h };
        const cells = Array.from({ length: len }, (_, s) => (r + (h ? 0 : s)) * N + c + (h ? s : 0));
        if (cells.some((i) => g[i] !== -1)) continue;
        cars.push(v);
        g = grid(cars);
      }
      if (cars.length === count) return cars;
    }
  }

  // Szybki przegląd składowej stanów: stan to napis z położeń aut (znak 48 + pozycja), dane stałe w tablicach.
  function explore(cars, cap) {
    const K = cars.length, H = cars.map((v) => v.h), L = cars.map((v) => v.len), F = cars.map((v) => (v.h ? v.r : v.c));
    const next = (st) => {
      const occ = new Int8Array(N * N).fill(-1);
      for (let k = 0; k < K; k++) {
        const p = st.charCodeAt(k) - 48;
        for (let t = 0; t < L[k]; t++) occ[H[k] ? F[k] * N + p + t : (p + t) * N + F[k]] = k;
      }
      const out = [];
      for (let k = 0; k < K; k++) {
        const p = st.charCodeAt(k) - 48;
        const at = (q) => occ[H[k] ? F[k] * N + q : q * N + F[k]];
        for (let q = p - 1; q >= 0 && at(q) === -1; q--) out.push(st.slice(0, k) + String.fromCharCode(48 + q) + st.slice(k + 1));
        for (let q = p + 1; q + L[k] <= N && at(q + L[k] - 1) === -1; q++) out.push(st.slice(0, k) + String.fromCharCode(48 + q) + st.slice(k + 1));
      }
      return out;
    };
    const start = cars.map((v) => String.fromCharCode(48 + (v.h ? v.c : v.r))).join("");
    const seen = new Set([start]), order = [start];
    for (let q = 0; q < order.length; q++) {
      for (const nx of next(order[q])) if (!seen.has(nx)) { seen.add(nx); order.push(nx); }
      if (order.length > cap) return null;
    }
    const dist = new Map();
    const bfs = order.filter((st) => st.charCodeAt(0) - 48 === N - 2);
    if (!bfs.length) return null;
    bfs.forEach((st) => dist.set(st, 0));
    for (let q = 0; q < bfs.length; q++) {
      const d = dist.get(bfs[q]);
      for (const nx of next(bfs[q])) if (!dist.has(nx)) { dist.set(nx, d + 1); bfs.push(nx); }
    }
    const decode = (st) => cars.map((v, k) => (v.h ? { ...v, c: st.charCodeAt(k) - 48 } : { ...v, r: st.charCodeAt(k) - 48 }));
    return { dist, next, decode };
  }

  // Szuka układu o najkrótszym rozwiązaniu w [lo, hi]; po upływie czasu bierze najtrudniejszy znaleziony.
  function generate(count, lo, hi, budget = 700) {
    const t0 = Date.now();
    let best = null;
    while (!best || (best.d < lo && Date.now() - t0 < budget)) {
      const res = explore(random(count), 30000);
      if (!res) continue;
      for (const [st, d] of res.dist) if (d <= hi && (!best || d > best.d)) best = { st, d, res };
    }
    const { st, d, res } = best;
    // ruchy najkrótszego rozwiązania jako [auto, nowe położenie]
    const steps = [];
    for (let cur = st, k = d; k > 0; k--) {
      const nx = res.next(cur).find((x) => res.dist.get(x) === k - 1);
      const car = [...nx].findIndex((ch, j) => ch !== cur[j]);
      steps.push([car, nx.charCodeAt(car) - 48]);
      cur = nx;
    }
    const cars = res.decode(st);
    return (api.last = { cars, moves: d, solution: steps });
  }

  const api = { N, EXIT_ROW, grid, range, apply, solved, random, explore, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = RushHour;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "korek"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, cars: 8, lo: 5, hi: 9, budget: 400 },
    { key: "medium", name: "Średni", points: 25, cars: 10, lo: 10, hi: 16, budget: 600 },
    { key: "hard", name: "Trudny", points: 50, cars: 12, lo: 15, hi: 60, budget: 1100 },
  ],
  rules: [
    "Wyprowadź czerwone auto przez wyjazd po prawej stronie.",
    "Pojazdy jeżdżą tylko przód–tył, wzdłuż swojej osi. Przeciągnij pojazd albo zaznacz go i użyj strzałek.",
    "Każde przesunięcie, o dowolną liczbę pól, to jeden ruch. Spróbuj zmieścić się w najkrótszym rozwiązaniu.",
  ],
  mount(board, ctx) {
    const { N } = RushHour;
    const level = RushHour.generate(ctx.level.cars, ctx.level.lo, ctx.level.hi, ctx.level.budget);
    let cars = level.cars.map((v) => ({ ...v }));
    let moves = 0, sel = 0;
    board.classList.add("rh");
    board.style.setProperty("--cols", N + 0.9);
    board.style.setProperty("--rows", N + 0.4);
    const lot = el("div", "rh-lot");
    board.append(lot);
    for (let i = 0; i < N * N; i++) lot.append(el("span", "rh-slot"));
    const exit = el("span", "rh-exit");
    lot.append(exit);
    const PALETTE = ["#1c7ed6", "#0ca678", "#f59f00", "#7048e8", "#e64980", "#2f9e44", "#e8590c", "#1098ad", "#5c940d", "#ae3ec9", "#364fc7", "#d9480f"];
    const els = cars.map((v, k) => {
      const b = button("", `rh-car${k === 0 ? " mine" : ""}${v.len === 3 ? " truck" : ""}${v.h ? " h" : " v"}`);
      b.style.setProperty("--len", v.len);
      b.style.setProperty("--vc", k === 0 ? "var(--c)" : PALETTE[(k - 1) % PALETTE.length]);
      b.setAttribute("aria-label", k === 0 ? "Twoje auto" : `${v.len === 3 ? "Ciężarówka" : "Auto"} ${k}`);
      b.dataset.k = k;
      lot.append(b);
      return b;
    });
    const movesEl = statBlock(ctx, "Ruchy", {});
    const save = ctx.undoable(([c, m]) => { cars = c; moves = m; render(); });

    const moveTo = (k, p) => {
      const now = cars[k].h ? cars[k].c : cars[k].r;
      if (p === now || ctx.done) return render();
      save([cars, moves]);
      cars = RushHour.apply(cars, k, p);
      moves++;
      Sound.place(1 + (moves % 9));
      render();
      if (RushHour.solved(cars)) {
        els[0].classList.add("leave");
        Sound.line();
        setTimeout(() => ctx.win(moves <= level.moves ? "Najkrótszą możliwą drogą." : `Najkrótsze rozwiązanie miało ${level.moves} ${plural(level.moves, "ruch", "ruchy", "ruchów")}.`), 450);
      }
    };

    // przeciąganie wzdłuż osi, z ograniczeniem do wolnych pól
    let drag = null;
    lot.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".rh-car");
      if (!b || ctx.done) return;
      e.preventDefault();
      const k = +b.dataset.k, v = cars[k];
      sel = k;
      const cell = lot.querySelector(".rh-slot").getBoundingClientRect().width * 1.08;
      drag = { k, start: v.h ? v.c : v.r, from: v.h ? e.clientX : e.clientY, cell, range: RushHour.range(cars, k), pos: v.h ? v.c : v.r };
      b.classList.add("drag");
      render();
    });
    ctx.on(document, "pointermove", (e) => {
      if (!drag) return;
      const v = cars[drag.k];
      const delta = ((v.h ? e.clientX : e.clientY) - drag.from) / drag.cell;
      drag.pos = Math.max(drag.range[0], Math.min(drag.range[1], drag.start + delta));
      els[drag.k].style.setProperty(v.h ? "--x" : "--y", drag.pos);
    });
    ctx.on(document, "pointerup", () => {
      if (!drag) return;
      const { k, pos } = drag;
      els[k].classList.remove("drag");
      drag = null;
      moveTo(k, Math.round(pos));
    });
    ctx.on(document, "keydown", (e) => {
      if (ctx.done || e.target.closest?.("input, textarea, select")) return;
      const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
      if (!d) return;
      const v = cars[sel];
      if (v.h !== (e.key === "ArrowLeft" || e.key === "ArrowRight")) return;
      e.preventDefault();
      const [lo, hi] = RushHour.range(cars, sel), now = v.h ? v.c : v.r;
      const p = Math.max(lo, Math.min(hi, now + d));
      if (p === now) { replay(els[sel], "shake"); return Sound.error(); }
      moveTo(sel, p);
    });
    lot.addEventListener("focusin", (e) => { const b = e.target.closest(".rh-car"); if (b) { sel = +b.dataset.k; render(); } });

    function render() {
      cars.forEach((v, k) => {
        els[k].style.setProperty("--x", v.c);
        els[k].style.setProperty("--y", v.r);
        els[k].classList.toggle("sel", k === sel);
      });
      movesEl.set(moves, null, `Najkrótsze rozwiązanie: ${level.moves} ${plural(level.moves, "ruch", "ruchy", "ruchów")}.`);
      // postęp: ile pól do wyjazdu jest już wolnych
      const g = RushHour.grid(cars);
      let clear = 0;
      for (let c = cars[0].c + 2; c < N; c++) if (g[RushHour.EXIT_ROW * N + c] === -1) clear++;
      ctx.progress(Math.min(0.95, (moves ? 0.1 : 0) + (clear / Math.max(1, N - 2 - cars[0].c)) * 0.5 + (cars[0].c / (N - 2)) * 0.35));
    }
    render();
  },
});
