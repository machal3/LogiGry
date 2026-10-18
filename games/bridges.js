// Mosty (Hashiwokakero): wyspy łączone poziomymi i pionowymi mostami, najwyżej dwa między parą.
const Bridges = (() => {
  const rnd = (n) => Math.floor(Math.random() * n);
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  const key = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

  // Najbliższa wyspa w każdym kierunku: { j, cells (pola pomiędzy), o: 1 poziomo / 2 pionowo }.
  function neighbors(islands, w, h) {
    const at = new Array(w * h).fill(-1);
    islands.forEach(({ r, c }, i) => (at[r * w + c] = i));
    return islands.map(({ r, c }) => {
      const out = [];
      for (const [dr, dc] of DIRS) {
        const cells = [];
        for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < h && cc >= 0 && cc < w; rr += dr, cc += dc) {
          const j = at[rr * w + cc];
          if (j >= 0) { out.push({ j, cells, o: dr ? 2 : 1 }); break; }
          cells.push(rr * w + cc);
        }
      }
      return out;
    });
  }

  function build(w, h, target) {
    let best = null;
    for (let attempt = 0; attempt < 40 && !(best && best.islands.length >= target); attempt++) {
      const at = new Array(w * h).fill(-1);
      const occ = new Array(w * h).fill(0); // 0 wolne, 1 most poziomy, 2 most pionowy
      const islands = [];
      const bridges = new Map();
      const add = (r, c) => { at[r * w + c] = islands.length; islands.push({ r, c }); };
      const free = (r, c) => r >= 0 && r < h && c >= 0 && c < w && at[r * w + c] < 0 && !occ[r * w + c];
      const touches = (r, c) => DIRS.some(([dr, dc]) => {
        const rr = r + dr, cc = c + dc;
        return rr >= 0 && rr < h && cc >= 0 && cc < w && at[rr * w + cc] >= 0;
      });

      add(rnd(h), rnd(w));
      for (let t = 0; t < 4000 && islands.length < target; t++) {
        const a = rnd(islands.length), { r, c } = islands[a];
        const [dr, dc] = DIRS[rnd(4)];
        const len = 2 + rnd(Math.max(2, (Math.max(w, h) / 2) | 0));
        const path = [];
        let ok = true;
        for (let s = 1; s < len && ok; s++) {
          if (free(r + dr * s, c + dc * s)) path.push((r + dr * s) * w + c + dc * s);
          else ok = false;
        }
        const R = r + dr * len, C = c + dc * len;
        if (!ok || !free(R, C) || touches(R, C)) continue;
        add(R, C);
        path.forEach((i) => (occ[i] = dr ? 2 : 1));
        bridges.set(key(a, islands.length - 1), 1 + rnd(2));
      }

      // Dodatkowe mosty między sąsiadami, żeby powstały pętle, nie tylko drzewo.
      neighbors(islands, w, h).forEach((list, a) => list.forEach(({ j, cells, o }) => {
        if (j < a) return;
        const k = key(a, j);
        if (bridges.has(k)) { if (Math.random() < 0.25) bridges.set(k, 2); }
        else if (Math.random() < 0.2 && cells.every((i) => !occ[i])) {
          bridges.set(k, 1 + rnd(2));
          cells.forEach((i) => (occ[i] = o));
        }
      }));

      if (!best || islands.length > best.islands.length) best = { w, h, islands, bridges };
    }
    best.islands.forEach((isl) => (isl.n = 0));
    best.bridges.forEach((n, k) => k.split("-").forEach((i) => (best.islands[i].n += n)));
    return best;
  }

  // Rozwiązuje jak człowiek, bez zgadywania. Każde możliwe połączenie ma zakres [lo, hi] mostów, zawężany przez:
  // liczby na wyspach, krzyżowanie, zakaz zamknięcia grupy wysp odciętej od reszty i jedyne wyjście z grupy.
  // Zwraca mapę mostów, gdy wszystko wynika z logiki; null gdy trzeba by zgadywać.
  // basic: tylko liczby i krzyżowanie, bez rozumowania o spójności.
  function logical(islands, w, h, basic = false) {
    const nb = neighbors(islands, w, h);
    const edges = [];
    nb.forEach((list, a) => list.forEach(({ j, cells }) => {
      if (j > a) edges.push({ a, b: j, cells: new Set(cells), lo: 0, hi: Math.min(2, islands[a].n, islands[j].n) });
    }));
    const at = islands.map(() => []);
    edges.forEach((e) => { at[e.a].push(e); at[e.b].push(e); });
    const cross = edges.map((e) => edges.filter((f) => f !== e && [...f.cells].some((c) => e.cells.has(c))));
    const N = islands.length;

    // grupy wysp połączonych pewnymi mostami (lo > 0), opcjonalnie z jednym dodatkowym połączeniem
    const groups = (extra) => {
      const parent = [...Array(N).keys()];
      const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      for (const e of edges) if (e.lo > 0 || e === extra) parent[find(e.a)] = find(e.b);
      return find;
    };

    for (let changed = true; changed; ) {
      changed = false;
      const set = (e, lo, hi) => {
        if (lo > e.lo) { e.lo = lo; changed = true; }
        if (hi < e.hi) { e.hi = hi; changed = true; }
      };
      for (let i = 0; i < N; i++) {
        const sumLo = at[i].reduce((s, e) => s + e.lo, 0), sumHi = at[i].reduce((s, e) => s + e.hi, 0);
        if (sumLo > islands[i].n || sumHi < islands[i].n) return null;
        for (const e of at[i]) set(e, islands[i].n - (sumHi - e.hi), islands[i].n - (sumLo - e.lo));
      }
      edges.forEach((e, k) => { if (e.lo > 0) cross[k].forEach((f) => set(f, f.lo, 0)); });
      if (edges.some((e) => e.lo > e.hi)) return null;
      if (changed || basic) continue;

      // zamknięta grupa: most o wartości v nasyciłby wszystkie wyspy grupy, a grupa nie obejmuje całej planszy
      for (const e of edges) {
        if (e.lo === e.hi) continue;
        const find = groups(e);
        const root = find(e.a);
        const members = [...Array(N).keys()].filter((i) => find(i) === root);
        if (members.length === N) continue;
        const v = e.hi;
        const full = members.every((i) => at[i].reduce((s, f) => s + (f === e ? v : f.lo), 0) === islands[i].n);
        if (full) set(e, e.lo, v - 1);
      }
      if (changed) continue;

      // jedyne wyjście: grupa, z której prowadzi tylko jedno możliwe połączenie, musi go użyć
      const find = groups(null);
      const roots = new Set([...Array(N).keys()].map(find));
      if (roots.size > 1) for (const root of roots) {
        const out = edges.filter((e) => e.hi > 0 && (find(e.a) === root) !== (find(e.b) === root));
        if (!out.length) return null;
        if (out.length === 1) set(out[0], Math.max(1, out[0].lo), out[0].hi);
      }
    }
    if (edges.some((e) => e.lo !== e.hi)) return null;
    const bridges = new Map();
    edges.forEach((e) => e.lo && bridges.set(key(e.a, e.b), e.lo));
    return solved(islands, bridges) ? bridges : null;
  }

  // Plansza, którą da się rozwiązać samą logiką; rozwiązanie jest wtedy jedyne.
  // hard: odrzuca plansze, które rozwiązują same liczby, więc trzeba myśleć o spójności całej sieci.
  function generate(w, h, target, hard = false) {
    let easy = null;
    for (let t = 0; t < 400; t++) {
      const p = build(w, h, target);
      const sol = logical(p.islands, w, h);
      if (!sol) continue;
      const found = { w, h, islands: p.islands, bridges: sol };
      if (!hard || !logical(p.islands, w, h, true)) return (api.last = found);
      easy ||= found;
    }
    // shortcut: gdy przez 400 prób nie wypadła plansza wymagająca spójności, zostaje łatwiejsza (nadal bez zgadywania)
    if (easy) return (api.last = easy);
    return generate(w, h, target);
  }

  // Suma mostów na każdej wyspie i czy wszystkie wyspy tworzą jedną całość.
  function status(islands, bridges) {
    const sums = islands.map(() => 0);
    const adj = islands.map(() => []);
    bridges.forEach((n, k) => {
      if (!n) return;
      const [a, b] = k.split("-").map(Number);
      sums[a] += n; sums[b] += n;
      adj[a].push(b); adj[b].push(a);
    });
    const seen = new Set([0]);
    const stack = [0];
    while (stack.length) for (const j of adj[stack.pop()]) if (!seen.has(j)) { seen.add(j); stack.push(j); }
    return { sums, connected: seen.size === islands.length };
  }

  const solved = (islands, bridges) => {
    const { sums, connected } = status(islands, bridges);
    return connected && islands.every((isl, i) => sums[i] === isl.n);
  };

  const api = { generate, logical, neighbors, status, solved, key, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Bridges;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "mosty"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, size: 7, islands: 9 },
    { key: "medium", name: "Średni", points: 25, size: 9, islands: 15, hard: true },
    { key: "hard", name: "Trudny", points: 50, size: 11, islands: 24, hard: true },
  ],
  rules: [
    "Liczba na wyspie mówi, ile mostów z niej wychodzi. Między dwiema wyspami mogą być najwyżej dwa mosty, tylko w poziomie lub pionie.",
    "Mosty nie mogą się krzyżować, a wszystkie wyspy muszą tworzyć jedną całość.",
    "Każdą planszę da się rozwiązać bez zgadywania. Na wyższych poziomach trzeba pilnować, by żadna grupa wysp nie została odcięta od reszty.",
    "Przeciągnij od wyspy w stronę drugiej (nie trzeba trafiać dokładnie) albo kliknij obie po kolei; zaznaczenie przechodzi na drugą wyspę, więc można kreślić łańcuch.",
    "Kliknięcie w most dokłada drugi, a potem usuwa oba. Prawy przycisk myszy usuwa most od razu.",
  ],
  mount(board, ctx) {
    const { w, h, islands } = Bridges.generate(ctx.level.size, ctx.level.size, ctx.level.islands, ctx.level.hard);
    const nb = Bridges.neighbors(islands, w, h);
    const bridges = new Map();
    let sel = null, dragFrom = null;

    board.classList.add("br");
    board.style.setProperty("--cols", w);
    board.style.setProperty("--rows", h);

    const NS = "http://www.w3.org/2000/svg";
    const svg = (tag, attrs) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    };
    const S = 10, X = (c) => c * S + S / 2;
    const root = svg("svg", { viewBox: `0 0 ${w * S} ${h * S}`, class: "br-board", role: "group", "aria-label": "Plansza z wyspami" });
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) root.append(svg("circle", { cx: X(c), cy: X(r), r: 0.55, class: "br-dot" }));
    const guides = svg("g", { class: "br-guides" });
    const layer = svg("g", {});
    root.append(guides, layer);
    const lines = new Map();
    const nodes = islands.map((isl, i) => {
      const g = svg("g", { class: "br-island c", tabindex: 0, role: "button", "data-i": i, style: `--k:${isl.r + isl.c}` });
      g.append(svg("circle", { cx: X(isl.c), cy: X(isl.r), r: 3.8 }));
      const t = svg("text", { x: X(isl.c), y: X(isl.r), "dominant-baseline": "central", "text-anchor": "middle" });
      t.textContent = isl.n;
      g.append(t);
      root.append(g);
      return g;
    });
    board.append(root);

    const progress = el("p", "panel-stat");
    const bar = el("div", "meter");
    const fill = el("span");
    bar.append(fill);
    ctx.panel.append(panelBlock("Postęp", progress, bar));

    const save = ctx.undoable((snap) => {
      bridges.clear();
      snap.forEach(([k, n]) => bridges.set(k, n));
      sel = null;
      new Set([...lines.keys(), ...bridges.keys()]).forEach((k) => drawPair(k, false));
      render();
    });

    const pairOf = (a, b) => nb[a].find((x) => x.j === b);
    const crosses = (a, b) => {
      const p = pairOf(a, b);
      for (const [k, n] of bridges) {
        if (!n) continue;
        const [x, y] = k.split("-").map(Number);
        const q = pairOf(x, y);
        if (q.o !== p.o && q.cells.some((i) => p.cells.includes(i))) return true;
      }
      return false;
    };

    // Rysuje mosty jednej pary; nowy most „wyrasta” od wyspy.
    function drawPair(k, animate) {
      lines.get(k)?.remove();
      lines.delete(k);
      const n = bridges.get(k) || 0;
      if (!n) return;
      const [a, b] = k.split("-").map(Number);
      const A = islands[a], B = islands[b];
      const horiz = A.r === B.r;
      const g = svg("g", { class: "br-pair" });
      (n === 2 ? [-1.15, 1.15] : [0]).forEach((o, idx) => {
        const line = svg("line", {
          class: "br-line" + (animate && idx === n - 1 ? " grow" : ""),
          pathLength: 1,
          x1: X(A.c) + (horiz ? 0 : o), y1: X(A.r) + (horiz ? o : 0),
          x2: X(B.c) + (horiz ? 0 : o), y2: X(B.r) + (horiz ? o : 0),
        });
        g.append(line);
      });
      g.append(svg("line", { class: "br-hit", "data-a": a, "data-b": b, x1: X(A.c), y1: X(A.r), x2: X(B.c), y2: X(B.r) }));
      layer.append(g);
      lines.set(k, g);
    }

    const cycle = (a, b) => {
      const k = Bridges.key(a, b), cur = bridges.get(k) || 0;
      if (!cur && crosses(a, b)) {
        ctx.toast("Mosty nie mogą się krzyżować.");
        Sound.error();
        replay(nodes[a], "nope");
        replay(nodes[b], "nope");
        return;
      }
      const before = Bridges.status(islands, bridges).sums;
      save([...bridges]);
      bridges.set(k, (cur + 1) % 3);
      drawPair(k, cur < 2);
      render();
      if (Bridges.solved(islands, bridges)) return ctx.win();
      // wyspa, która właśnie dostała komplet mostów, „odbija”
      const { sums } = Bridges.status(islands, bridges);
      const fresh = [a, b].filter((i) => sums[i] === islands[i].n && before[i] !== islands[i].n);
      fresh.forEach((i) => replay(nodes[i], "pop"));
      if (fresh.length) Sound.line();
      else if (sums[a] > islands[a].n || sums[b] > islands[b].n) Sound.error();
      else if (cur < 2) Sound.place(cur + 3);
      else Sound.erase();
    };
    const pick = (i) => {
      if (ctx.done) return;
      if (sel === null || sel === i) sel = sel === i ? null : i;
      else if (pairOf(sel, i)) { const a = sel; sel = i; cycle(a, i); render(); return; }
      else sel = i;
      render();
    };

    // Cel przeciągnięcia: najbliższa wyspa w kierunku ruchu, nie trzeba trafiać dokładnie w kółko.
    const dragTarget = (e) => {
      const m = root.getScreenCTM().inverse();
      const dx = (e.clientX * m.a + e.clientY * m.c + m.e) - X(islands[dragFrom].c);
      const dy = (e.clientX * m.b + e.clientY * m.d + m.f) - X(islands[dragFrom].r);
      if (Math.hypot(dx, dy) < 4) return null;
      const dr = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0, dc = dr ? 0 : Math.sign(dx);
      const F = islands[dragFrom];
      return nb[dragFrom].find(({ j }) => Math.sign(islands[j].r - F.r) === dr && Math.sign(islands[j].c - F.c) === dc)?.j ?? null;
    };
    let drop = null;
    const setDrop = (j) => {
      if (drop === j) return;
      if (drop !== null) nodes[drop].classList.remove("drop");
      drop = j;
      if (j !== null) nodes[j].classList.add("drop");
    };
    root.addEventListener("pointerdown", (e) => {
      if (ctx.done || e.button === 2) return;
      const isl = e.target.closest(".br-island");
      if (isl) { e.preventDefault(); dragFrom = +isl.dataset.i; return; }
      const hit = e.target.closest(".br-hit");
      if (hit) { sel = null; cycle(+hit.dataset.a, +hit.dataset.b); }
      else if (sel !== null) { sel = null; render(); }
    });
    // prawy przycisk na moście usuwa go od razu
    root.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const hit = e.target.closest(".br-hit");
      if (ctx.done || !hit) return;
      const k = Bridges.key(+hit.dataset.a, +hit.dataset.b);
      save([...bridges]);
      bridges.set(k, 0);
      drawPair(k, false);
      render();
      Sound.erase();
    });
    ctx.on(document, "pointermove", (e) => { if (dragFrom !== null) setDrop(dragTarget(e)); });
    ctx.on(document, "pointerup", (e) => {
      if (dragFrom === null) return;
      const from = dragFrom, to = dragTarget(e);
      dragFrom = null;
      setDrop(null);
      if (to !== null) { sel = null; cycle(from, to); }
      else pick(from);
    });
    root.addEventListener("keydown", (e) => {
      const isl = e.target.closest(".br-island");
      if (isl && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(+isl.dataset.i); }
      if (e.key === "Escape" && sel !== null) { sel = null; render(); }
    });

    function render() {
      const { sums } = Bridges.status(islands, bridges);
      let done = 0;
      nodes.forEach((g, i) => {
        const full = sums[i] === islands[i].n;
        done += full;
        g.classList.toggle("done", full);
        g.classList.toggle("over", sums[i] > islands[i].n);
        g.classList.toggle("sel", sel === i);
        g.classList.toggle("cand", sel !== null && !!pairOf(sel, i));
        g.setAttribute("aria-label", `Wyspa ${islands[i].n}, mostów ${sums[i]}`);
      });
      guides.replaceChildren();
      if (sel !== null) nb[sel].forEach(({ j }) => {
        const A = islands[sel], B = islands[j];
        guides.append(svg("line", { class: "br-guide", x1: X(A.c), y1: X(A.r), x2: X(B.c), y2: X(B.r) }));
      });
      progress.textContent = `Wyspy z kompletem mostów: ${done} z ${islands.length}`;
      ctx.progress(done / islands.length);
      fill.style.width = `${(done / islands.length) * 100}%`;
    }
    render();
  },
});
