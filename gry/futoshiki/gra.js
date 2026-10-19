// Futoshiki: kwadrat łaciński z znakami nierówności między sąsiadami.
// Plansza jest zawsze generowana tak, aby miała dokładnie jedno rozwiązanie.
{
  const hIdx = (n, r, c) => r * (n - 1) + c;
  const vIdx = (n, r, c) => r * n + c;

  // Losowy kwadrat łaciński: cykliczny wzór, potem tasowanie wierszy, kolumn i symboli.
  function latin(n) {
    const base = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ((r + c) % n) + 1));
    const rows = shuffle([...Array(n).keys()]);
    const cols = shuffle([...Array(n).keys()]);
    const sym = shuffle([...Array(n).keys()]);
    return rows.map((r) => cols.map((c) => sym[base[r][c] - 1] + 1));
  }

  // Liczy rozwiązania (do `limit`), więc da się sprawdzić jednoznaczność.
  function solutions(p, limit) {
    const n = p.n, w = Int8Array.from(p.given);
    const rUsed = new Array(n).fill(0), cUsed = new Array(n).fill(0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (w[r * n + c]) { const m = 1 << w[r * n + c]; rUsed[r] |= m; cUsed[c] |= m; }
    let found = 0;
    const fits = (r, c, val) => {
      if (c > 0 && p.h[hIdx(n, r, c - 1)]) { const l = w[r * n + c - 1]; if (l && (p.h[hIdx(n, r, c - 1)] === 1 ? l > val : l < val)) return false; }
      if (c < n - 1 && p.h[hIdx(n, r, c)]) { const rr = w[r * n + c + 1]; if (rr && (p.h[hIdx(n, r, c)] === 1 ? val > rr : val < rr)) return false; }
      if (r > 0 && p.v[vIdx(n, r - 1, c)]) { const u = w[(r - 1) * n + c]; if (u && (p.v[vIdx(n, r - 1, c)] === 1 ? u > val : u < val)) return false; }
      if (r < n - 1 && p.v[vIdx(n, r, c)]) { const d = w[(r + 1) * n + c]; if (d && (p.v[vIdx(n, r, c)] === 1 ? val > d : val < d)) return false; }
      return true;
    };
    const rec = (k) => {
      if (found >= limit) return;
      if (k === n * n) { found++; return; }
      if (w[k]) return rec(k + 1);
      const r = (k / n) | 0, c = k % n;
      for (let val = 1; val <= n; val++) {
        const m = 1 << val;
        if (rUsed[r] & m || cUsed[c] & m) continue;
        w[k] = val;
        if (fits(r, c, val)) { rUsed[r] |= m; cUsed[c] |= m; rec(k + 1); rUsed[r] &= ~m; cUsed[c] &= ~m; }
        w[k] = 0;
      }
    };
    rec(0);
    return found;
  }

  // Generuje łamigłówkę: zaczyna od pełnego kwadratu i zabiera podpowiedzi, póki rozwiązanie zostaje jedno.
  function generate(n, keep, minGivens) {
    for (let t = 0; t < 40; t++) {
      const L = latin(n);
      const h = new Int8Array(n * (n - 1)), v = new Int8Array((n - 1) * n);
      for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) if (Math.random() < keep) h[hIdx(n, r, c)] = L[r][c] < L[r][c + 1] ? 1 : -1;
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) if (Math.random() < keep) v[vIdx(n, r, c)] = L[r][c] < L[r + 1][c] ? 1 : -1;
      const given = new Int8Array(n * n);
      for (let i = 0; i < n * n; i++) given[i] = L[(i / n) | 0][i % n];
      let left = n * n;
      for (const i of shuffle([...Array(n * n).keys()])) {
        if (left <= minGivens) break;
        const kept = given[i];
        given[i] = 0;
        if (solutions({ n, given, h, v }, 2) === 1) left--;
        else given[i] = kept;
      }
      const puzzle = { n, given, h, v, solution: L.flat() };
      if (solutions(puzzle, 2) === 1) return puzzle;
    }
    return null;
  }

  // Pola łamiące zasady: powtórka w wierszu lub kolumnie albo zła nierówność.
  function conflicts(p, grid) {
    const n = p.n, bad = new Set();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const val = grid[r * n + c];
      if (!val) continue;
      for (let k = 0; k < n; k++) {
        if (k !== c && grid[r * n + k] === val) { bad.add(r * n + c); bad.add(r * n + k); }
        if (k !== r && grid[k * n + c] === val) { bad.add(r * n + c); bad.add(k * n + c); }
      }
      if (c < n - 1 && p.h[hIdx(n, r, c)]) {
        const rr = grid[r * n + c + 1];
        if (rr && (p.h[hIdx(n, r, c)] === 1 ? val > rr : val < rr)) { bad.add(r * n + c); bad.add(r * n + c + 1); }
      }
      if (r < n - 1 && p.v[vIdx(n, r, c)]) {
        const d = grid[(r + 1) * n + c];
        if (d && (p.v[vIdx(n, r, c)] === 1 ? val > d : val < d)) { bad.add(r * n + c); bad.add((r + 1) * n + c); }
      }
    }
    return bad;
  }

  if (typeof module !== "undefined") module.exports = { latin, solutions, generate, conflicts, hIdx, vIdx };

  if (typeof registerGame !== "undefined") registerGame({
    id: "futoshiki",
    cat: "logiczne",
    name: "Futoshiki",
    author: "DeepSeek V4.1 Flash",
    desc: "Wypełnij kwadrat cyframi bez powtórzeń, a znaki nierówności mówią, gdzie liczba jest większa.",
    color: "#15616d",
    ink: "#ffffff",
    glyph: ["..#..", ".#...", "#....", ".#...", "..#.."],
    levels: [
      { key: "easy", name: "4 × 4", points: 10, n: 4, keep: 0.5, min: 7 },
      { key: "medium", name: "5 × 5", points: 25, n: 5, keep: 0.6, min: 7 },
      { key: "hard", name: "6 × 6", points: 50, n: 6, keep: 0.72, min: 9 },
    ],
    rules: [
      "W każdym wierszu i każdej kolumnie każda cyfra od 1 do rozmiaru planszy występuje dokładnie raz.",
      "Znaki między polami mówią, która z dwóch sąsiednich liczb jest większa.",
      "Klikasz pole i wpisujesz cyfrę z klawiatury albo z panelu. Strzałki przesuwają zaznaczenie.",
      "Pola łamiące zasady podświetlają się na czerwono. Wypełnij całą planszę poprawnie, aby wygrać.",
    ],
    achievements: [
      { id: "pierwsze-pola", name: "Pierwsze pola", desc: "Rozwiąż planszę 4 × 4 w mniej niż minutę.", points: 10 },
      { id: "bez-bledu", name: "Bez pomyłki", desc: "Rozwiąż planszę, nie wpisując cyfry łamiącej zasady.", points: 25 },
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Rozwiąż planszę 5 × 5 lub 6 × 6 bez podpowiedzi.", points: 25 },
      { id: "szybka-glowa", name: "Szybka głowa", desc: "Rozwiąż planszę 6 × 6 w mniej niż trzy minuty.", points: 50 },
    ],

    mount(board, ctx) {
      const { n } = ctx.level;
      const puzzle = generate(n, ctx.level.keep, ctx.level.min) || generate(n, 1, n * n);
      const grid = Int8Array.from(puzzle.given);
      let cursor = grid.indexOf(0) >= 0 ? grid.indexOf(0) : 0;
      let sel = cursor, hinted = false, mistaken = false;

      const cells = gridCells(board, n, n, "fs", { gap: 0.16, label: (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}` });
      // znaki nierówności w odstępach między polami (siatka ma padding równy odstępowi)
      const g = 0.16, W = n + (n + 1) * g;
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${W}`);
      svg.setAttribute("class", "fs-svg");
      svg.setAttribute("aria-hidden", "true");
      const chevron = (x, y, right) => {
        const el2 = document.createElementNS(NS, "polyline");
        const d = right ? 1 : -1;
        el2.setAttribute("points", `${x + d * 0.12} ${y - 0.17} ${x - d * 0.12} ${y} ${x + d * 0.12} ${y + 0.17}`);
        svg.append(el2);
        return el2;
      };
      const signs = [];
      for (let r = 0; r < n; r++) for (let c = 0; c < n - 1; c++) if (puzzle.h[hIdx(n, r, c)]) signs.push({ kind: "h", r, c, el: chevron(g + c * (1 + g) + 1 + g / 2, g + r * (1 + g) + 0.5, puzzle.h[hIdx(n, r, c)] === 1) });
      for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++) if (puzzle.v[vIdx(n, r, c)]) signs.push({ kind: "v", r, c, el: chevron(g + c * (1 + g) + 0.5, g + r * (1 + g) + 1 + g / 2, puzzle.v[vIdx(n, r, c)] === 1) });
      board.append(svg);

      const leftEl = statBlock(ctx, "Puste pola", { meter: true });
      const pad = el("div", "pad");
      pad.style.setProperty("--pad-cols", n > 4 ? 3 : n);
      for (let d = 1; d <= n; d++) {
        const b = button("", "pad-digit", () => put(d));
        b.append(el("span", "pad-num", d));
        b.setAttribute("aria-label", `Wpisz ${d}`);
        pad.append(b);
      }
      ctx.panel.append(panelBlock("Wpisz cyfrę", pad, button("Wyczyść pole", "btn-ghost wide", () => put(0))));
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      function put(d) {
        if (ctx.done) return;
        const i = sel;
        if (puzzle.given[i]) { Sound.error(); return; }
        if (d && !grid[i]) { /* wpis gracza, poniżej sprawdzamy konflikt */ }
        grid[i] = d;
        d ? Sound.place(d) : Sound.erase();
        if (d && conflicts(puzzle, grid).size) mistaken = true;
        render();
      }
      function hint() {
        if (ctx.done) return;
        let i = sel;
        if (grid[i] === puzzle.solution[i]) i = grid.findIndex((v, k) => !puzzle.given[k] && v !== puzzle.solution[k]);
        if (i < 0) return;
        hinted = true;
        sel = i;
        cursor = i;
        grid[i] = puzzle.solution[i];
        Sound.place(puzzle.solution[i]);
        render();
      }

      cellKeys(ctx, {
        cols: n, rows: n,
        get: () => cursor,
        set: (i) => { cursor = i; sel = i; render(); },
        max: n,
        onDigit: (d) => { sel = cursor; put(d); },
      });

      function render() {
        const bad = conflicts(puzzle, grid);
        cells.forEach((c, i) => {
          const v = grid[i];
          // cyfrę wstawiamy tylko przy zmianie, żeby animacja nie powtarzała się na całej planszy
          if (c.dataset.v !== String(v)) {
            c.dataset.v = String(v);
            c.replaceChildren(v ? el("span", "val", v) : "");
          }
          c.classList.toggle("given", !!puzzle.given[i]);
          c.classList.toggle("bad", bad.has(i));
          c.classList.toggle("sel", i === sel);
          c.classList.toggle("cursor", i === cursor);
        });
        signs.forEach((s) => {
          const a = grid[s.r * n + s.c];
          const b = s.kind === "h" ? grid[s.r * n + s.c + 1] : grid[(s.r + 1) * n + s.c];
          const rel = s.kind === "h" ? puzzle.h[hIdx(n, s.r, s.c)] : puzzle.v[vIdx(n, s.r, s.c)];
          s.el.classList.toggle("bad", !!a && !!b && (rel === 1 ? a > b : a < b));
        });
        const empty = grid.filter((v) => !v).length;
        leftEl.set(String(empty), 1 - empty / (n * n), bad.size ? "Coś się nie zgadza" : "");
        ctx.progress(1 - empty / (n * n));
        if (!empty && !bad.size) finish();
      }

      function finish() {
        if (ctx.done) return;
        if (!mistaken) ctx.achieve("bez-bledu");
        if (!hinted && n > 4) ctx.achieve("bez-podpowiedzi");
        if (n === 4 && ctx.time < 60) ctx.achieve("pierwsze-pola");
        if (n === 6 && ctx.time < 180) ctx.achieve("szybka-glowa");
        ctx.win(ctx.time < 120 ? "Szybko i bez błędu." : "Plansza wypełniona zgodnie z zasadami.");
      }
      render();
    },
  });
}
