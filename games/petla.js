// Pętla (Slitherlink): krawędzie siatki n × n tworzą jedną zamkniętą pętlę; cyfra w polu = ile jego boków należy do pętli.
// Krawędzie: poziome h(r, c) = r * n + c dla r ≤ n, pionowe v(r, c) = H + r * (n + 1) + c dla c ≤ n, gdzie H = (n + 1) * n.
const Loop = (() => {
  const H = (n) => (n + 1) * n;
  const h = (n, r, c) => r * n + c;
  const v = (n, r, c) => H(n) + r * (n + 1) + c;
  const cellEdges = (n, i) => {
    const r = (i / n) | 0, c = i % n;
    return [h(n, r, c), h(n, r + 1, c), v(n, r, c), v(n, r, c + 1)];
  };
  // końce krawędzi jako numery wierzchołków r * (n + 1) + c
  const ends = (n, e) => {
    if (e < H(n)) { const r = (e / n) | 0, c = e % n; return [r * (n + 1) + c, r * (n + 1) + c + 1]; }
    const k = e - H(n), r = (k / (n + 1)) | 0, c = k % (n + 1);
    return [r * (n + 1) + c, (r + 1) * (n + 1) + c];
  };

  // Obszar bez dziur i bez styków po przekątnej, więc jego brzeg to jedna pętla.
  function region(n, frac) {
    for (;;) {
      const inR = new Uint8Array(n * n);
      inR[rnd(n * n)] = 1;
      let size = 1, fails = 0;
      const target = Math.round(n * n * frac);
      const at = (r, c) => (r < 0 || r >= n || c < 0 || c >= n ? 0 : inR[r * n + c]);
      const checker = (j) => {
        const r = (j / n) | 0, c = j % n;
        for (const [a, b] of [[r - 1, c - 1], [r - 1, c], [r, c - 1], [r, c]]) {
          const p = at(a, b), q = at(a, b + 1), s = at(a + 1, b), t = at(a + 1, b + 1);
          if (p === t && q === s && p !== q) return true;
        }
        return false;
      };
      const holes = () => {
        const seen = new Uint8Array(n * n), stack = [];
        for (let i = 0; i < n * n; i++) {
          const r = (i / n) | 0, c = i % n;
          if (!inR[i] && (r === 0 || c === 0 || r === n - 1 || c === n - 1)) { seen[i] = 1; stack.push(i); }
        }
        while (stack.length) {
          const i = stack.pop(), r = (i / n) | 0, c = i % n;
          for (const [a, b] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
            const j = a * n + b;
            if (a >= 0 && a < n && b >= 0 && b < n && !inR[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
          }
        }
        return inR.some((x, i) => !x && !seen[i]);
      };
      while (size < target && fails < 400) {
        const front = [];
        for (let i = 0; i < n * n; i++) {
          if (inR[i]) continue;
          const r = (i / n) | 0, c = i % n;
          if (at(r - 1, c) || at(r + 1, c) || at(r, c - 1) || at(r, c + 1)) front.push(i);
        }
        // z kilku kandydatów bierzemy ten z najmniejszą liczbą sąsiadów w obszarze, więc kształt jest kręty
        const near = (i) => [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1].filter((x) => x >= 0 && inR[x]).length;
        const j = [pick(front), pick(front), pick(front)].sort((a, b) => near(a) - near(b))[0];
        inR[j] = 1;
        if (checker(j) || holes()) { inR[j] = 0; fails++; } else size++;
      }
      if (size >= target * 0.9) return inR;
    }
  }

  function generate(n, frac, show) {
    const inR = region(n, frac);
    const edges = new Set();
    const at = (r, c) => (r < 0 || r >= n || c < 0 || c >= n ? 0 : inR[r * n + c]);
    for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++) if (at(r - 1, c) !== at(r, c)) edges.add(h(n, r, c));
    for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++) if (at(r, c - 1) !== at(r, c)) edges.add(v(n, r, c));
    const clues = Array.from({ length: n * n }, (_, i) => cellEdges(n, i).filter((e) => edges.has(e)).length);
    // część cyfr ukryta; zera i trójki pokazujemy chętniej, bo dają punkt zaczepienia
    const shown = clues.map((k) => (Math.random() < (k === 0 || k === 3 ? show + 0.1 : show) ? k : -1));
    return (api.last = { n, edges, clues: shown, full: clues });
  }

  // Stan gracza: line = Set krawędzi. Zwraca liczniki przy cyfrach i czy to jedna pętla spełniająca cyfry.
  function check(n, clues, line) {
    const count = clues.map((_, i) => cellEdges(n, i).filter((e) => line.has(e)).length);
    const deg = new Map();
    for (const e of line) for (const p of ends(n, e)) deg.set(p, (deg.get(p) || 0) + 1);
    const badPoints = [...deg].filter(([, d]) => d > 2).map(([p]) => p);
    let loop = line.size > 0 && [...deg.values()].every((d) => d === 2);
    if (loop) {
      // obchodzimy pętlę od jednej krawędzi; wszystkie muszą być odwiedzone
      const byPoint = new Map();
      for (const e of line) for (const p of ends(n, e)) byPoint.set(p, [...(byPoint.get(p) || []), e]);
      const first = line.values().next().value;
      let prev = first, p = ends(n, first)[1], seen = 1;
      while (p !== ends(n, first)[0]) {
        const next = byPoint.get(p).find((e) => e !== prev);
        prev = next;
        p = ends(n, next).find((q) => q !== p);
        seen++;
      }
      loop = seen === line.size;
    }
    const solved = loop && clues.every((k, i) => k < 0 || count[i] === k);
    return { count, solved, loop, badPoints };
  }

  const api = { H, h, v, ends, cellEdges, region, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Loop;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "petla"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, n: 5, frac: 0.5, show: 0.85 },
    { key: "medium", name: "7 × 7", points: 25, n: 7, frac: 0.5, show: 0.7 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, frac: 0.52, show: 0.6 },
  ],
  rules: [
    "Połącz kropki kreskami w jedną zamkniętą pętlę. Pętla nie może się rozgałęziać ani przecinać.",
    "Cyfra w polu mówi, ile z jego czterech boków należy do pętli. Pola bez cyfry mogą mieć dowolną liczbę.",
    "Kliknij albo przeciągnij po krawędziach, żeby rysować. Prawy przycisk stawia krzyżyk tam, gdzie kreski na pewno nie ma.",
  ],
  mount(board, ctx) {
    const { n, clues } = Loop.generate(ctx.level.n, ctx.level.frac, ctx.level.show);
    const E = Loop.H(n) + n * (n + 1);
    const state = new Uint8Array(E); // 0 nic, 1 kreska, 2 krzyżyk
    const S = 10, pad = 3;
    const NS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };
    board.classList.add("lp");
    board.style.setProperty("--cols", n + 0.6);
    board.style.setProperty("--rows", n + 0.6);
    const svg = svgEl("svg", { viewBox: `${-pad} ${-pad} ${n * S + 2 * pad} ${n * S + 2 * pad}`, class: "lp-svg", role: "group", "aria-label": "Plansza pętli" });
    board.append(svg);
    const xy = (e) => {
      const [a, b] = Loop.ends(n, e);
      return [(a % (n + 1)) * S, ((a / (n + 1)) | 0) * S, (b % (n + 1)) * S, ((b / (n + 1)) | 0) * S];
    };
    const gCells = svgEl("g", {}), gLines = svgEl("g", {}), gDots = svgEl("g", {}), gHits = svgEl("g", {});
    svg.append(gCells, gLines, gDots, gHits);
    const texts = clues.map((k, i) => {
      const r = (i / n) | 0, c = i % n;
      gCells.append(svgEl("rect", { x: c * S + 0.6, y: r * S + 0.6, width: S - 1.2, height: S - 1.2, rx: 1.6, class: "lp-cell" }));
      if (k < 0) return null;
      const t = svgEl("text", { x: c * S + S / 2, y: r * S + S / 2, class: "lp-clue" });
      t.textContent = k;
      t.style.setProperty("--k", r + c);
      gCells.append(t);
      return t;
    });
    const lines = [], marks = [];
    for (let e = 0; e < E; e++) {
      const [x1, y1, x2, y2] = xy(e);
      const ln = svgEl("line", { x1, y1, x2, y2, class: "lp-line", pathLength: 1 });
      ln.style.setProperty("--k", (x1 + y1) / S);
      gLines.append(ln);
      lines.push(ln);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const m = svgEl("path", { d: `M${mx - 1} ${my - 1}l2 2M${mx + 1} ${my - 1}l-2 2`, class: "lp-x" });
      gLines.append(m);
      marks.push(m);
      // pole trafienia: romb wokół krawędzi
      const horiz = y1 === y2;
      const d = horiz ? `M${x1} ${y1}L${mx} ${my - S / 2}L${x2} ${y2}L${mx} ${my + S / 2}Z` : `M${x1} ${y1}L${mx + S / 2} ${my}L${x2} ${y2}L${mx - S / 2} ${my}Z`;
      const hit = svgEl("path", { d, class: "lp-hit" });
      hit.dataset.e = e;
      gHits.append(hit);
    }
    const dots = [];
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) {
      const d = svgEl("circle", { cx: c * S, cy: r * S, r: 0.9, class: "lp-dot" });
      gDots.append(d);
      dots.push(d);
    }

    const save = ctx.undoable((s) => { state.set(s); render(); });
    const info = statBlock(ctx, "Pętla", { small: true });

    // przeciąganie: pierwsza krawędź ustala, czy rysujemy, czy wymazujemy
    let paint = -1, touched = null;
    const apply = (e) => {
      if (touched.has(e) || state[e] === paint) return;
      touched.add(e);
      state[e] = paint;
      if (paint === 1) { lines[e].classList.remove("grow"); void lines[e].getBBox(); lines[e].classList.add("grow"); }
      const res = render();
      if (res.solved) return ctx.win();
      if (paint === 1) Sound.place(1 + (state.filter((x) => x === 1).length % 9));
      else if (paint === 2) Sound.flag();
      else Sound.erase();
    };
    const edgeAt = (ev) => {
      const t = document.elementFromPoint(ev.clientX, ev.clientY);
      return t?.classList?.contains("lp-hit") ? +t.dataset.e : -1;
    };
    svg.addEventListener("contextmenu", (ev) => ev.preventDefault());
    svg.addEventListener("pointerdown", (ev) => {
      const t = ev.target.closest?.(".lp-hit");
      if (!t || ctx.done) return;
      ev.preventDefault();
      const e = +t.dataset.e;
      const want = ev.button === 2 ? 2 : 1;
      paint = state[e] === want ? 0 : want;
      touched = new Set();
      save(state.slice());
      apply(e);
    });
    ctx.on(document, "pointermove", (ev) => {
      if (paint < 0 || ctx.done) return;
      const e = edgeAt(ev);
      if (e >= 0) apply(e);
    });
    ctx.on(document, "pointerup", () => { paint = -1; });

    function render() {
      const line = new Set();
      state.forEach((s, e) => s === 1 && line.add(e));
      const res = Loop.check(n, clues, line);
      lines.forEach((ln, e) => ln.classList.toggle("on", state[e] === 1));
      marks.forEach((m, e) => m.classList.toggle("on", state[e] === 2));
      const bad = new Set(res.badPoints);
      dots.forEach((d, p) => d.classList.toggle("bad", bad.has(p)));
      let ok = 0, total = 0;
      texts.forEach((t, i) => {
        if (!t) return;
        total++;
        const k = clues[i], have = res.count[i];
        const full = Loop.cellEdges(n, i).every((e) => state[e] !== 0);
        t.classList.toggle("ok", have === k);
        t.classList.toggle("bad", have > k || (full && have !== k));
        if (have === k) ok++;
      });
      info.set(res.loop ? "Pętla zamknięta" : `${line.size} ${plural(line.size, "kreska", "kreski", "kresek")}`, null,
        res.loop && !res.solved ? "Pętla jest zamknięta, ale nie wszystkie cyfry się zgadzają." : `Spełnione cyfry: ${ok} z ${total}.`);
      ctx.progress((ok / total) * 0.9 + (res.solved ? 0.1 : 0));
      return res;
    }
    render();
  },
});
