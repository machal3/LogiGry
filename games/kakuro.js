// Kakuro: białe pola tworzą ciągi poziome i pionowe; cyfry w ciągu są różne i sumują się do wskazówki.
// Plansza n × n, pierwszy wiersz i kolumna to zawsze pola ze wskazówkami. white[i] = 1 dla pola do wpisania.
const Kakuro = (() => {
  // maski cyfr 1–9 według liczby cyfr i sumy
  const SUBSETS = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
  for (let m = 0; m < 512; m++) {
    let k = 0, s = 0;
    for (let d = 0; d < 9; d++) if (m & (1 << d)) { k++; s += d + 1; }
    SUBSETS[k][s].push(m << 1); // bit d = cyfra d
  }

  // ciągi białych pól: { cells, dir, clue } gdzie clue to pole wskazówki tuż przed ciągiem
  function runs(white, n) {
    const out = [];
    for (const dir of ["a", "d"]) {
      for (let x = 0; x < n; x++) {
        let cur = null;
        for (let y = 0; y <= n; y++) {
          const i = dir === "a" ? x * n + y : y * n + x;
          if (y < n && white[i]) {
            if (!cur) cur = { dir, cells: [], clue: dir === "a" ? i - 1 : i - n };
            cur.cells.push(i);
          } else if (cur) { out.push(cur); cur = null; }
        }
      }
    }
    return out;
  }

  // Wzór: czarne pola (symetrycznie) dokładane po jednym, o ile nie powstaje ciąg długości 1 i białe pola są spójne.
  function pattern(n, density, maxRun) {
    const white = new Uint8Array(n * n);
    const inner = [];
    for (let r = 1; r < n; r++) for (let c = 1; c < n; c++) { white[r * n + c] = 1; inner.push(r * n + c); }
    const mirror = (i) => (n - ((i / n) | 0)) * n + (n - (i % n));
    const connected = () => {
      const start = white.indexOf(1), seen = new Set([start]), stack = [start];
      while (stack.length) {
        const i = stack.pop();
        for (const j of [i - 1, i + 1, i - n, i + n]) if (j >= 0 && j < n * n && white[j] && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
      return seen.size === white.reduce((s, v) => s + v, 0);
    };
    const tryBlack = (i) => {
      const j = mirror(i);
      if (!white[i] || !white[j]) return false;
      white[i] = white[j] = 0;
      if (runs(white, n).every((r) => r.cells.length >= 2) && connected()) return true;
      white[i] = white[j] = 1;
      return false;
    };
    for (let t = 0; t < 300; t++) {
      const long = runs(white, n).filter((r) => r.cells.length > maxRun);
      if (!long.length) break;
      tryBlack(pick(pick(long).cells));
    }
    const target = inner.length * density;
    for (const i of shuffle(inner)) {
      if (inner.filter((j) => !white[j]).length >= target) break;
      tryBlack(i);
    }
    return runs(white, n).some((r) => r.cells.length > maxRun) ? null : white;
  }

  // Każde pole w dwóch ciągach: [poziomy, pionowy].
  function index(white, n) {
    const rs = runs(white, n);
    const of = new Map();
    rs.forEach((run, k) => run.cells.forEach((i) => { if (!of.has(i)) of.set(i, []); of.get(i).push(k); }));
    return { rs, of };
  }

  // Wypełnienie cyframi bez powtórzeń w ciągach (losowe przeszukiwanie z nawrotami).
  function fill(white, n) {
    const { rs, of } = index(white, n);
    const cells = [...of.keys()];
    const g = new Uint8Array(n * n);
    const used = new Uint16Array(rs.length);
    let steps = 0;
    const go = (k) => {
      if (k === cells.length) return true;
      if (++steps > 20000) return false;
      const i = cells[k], [a, b] = of.get(i);
      for (const d of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
        const bit = 1 << d;
        if ((used[a] | used[b]) & bit) continue;
        g[i] = d; used[a] |= bit; used[b] |= bit;
        if (go(k + 1)) return true;
        used[a] &= ~bit; used[b] &= ~bit;
      }
      g[i] = 0;
      return false;
    };
    return go(0) ? g : null;
  }

  // Szuka do `limit` rozwiązań; zwraca listę znalezionych (puste pola w g = 0, wpisane traktowane jako stałe).
  function solve(white, n, sums, given, limit = 2) {
    const { rs, of } = index(white, n);
    const g = Uint8Array.from(given);
    const used = new Uint16Array(rs.length), left = new Uint8Array(rs.length), sumLeft = rs.map((r, k) => sums[k]);
    rs.forEach((r, k) => { left[k] = r.cells.length; });
    for (const [i, [a, b]] of of) if (g[i]) {
      for (const k of [a, b]) { used[k] |= 1 << g[i]; left[k]--; sumLeft[k] -= g[i]; }
    }
    const allowed = (k) => {
      if (left[k] === 0) return 0;
      if (sumLeft[k] < 0 || sumLeft[k] > 45) return 0;
      let m = 0;
      for (const s of SUBSETS[left[k]][sumLeft[k]]) if (!(s & used[k])) m |= s;
      return m;
    };
    const found = [];
    let nodes = 0;
    const go = () => {
      if (found.length >= limit || ++nodes > 40000) return;
      let best = -1, bestMask = 0, bestCount = 10;
      for (const [i, [a, b]] of of) {
        if (g[i]) continue;
        const m = allowed(a) & allowed(b);
        let c = 0;
        for (let d = 1; d <= 9; d++) if (m & (1 << d)) c++;
        if (c === 0) return;
        if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c === 1) break; }
      }
      if (best < 0) { found.push(g.slice()); return; }
      const [a, b] = of.get(best);
      for (let d = 1; d <= 9; d++) {
        if (!(bestMask & (1 << d))) continue;
        g[best] = d;
        for (const k of [a, b]) { used[k] |= 1 << d; left[k]--; sumLeft[k] -= d; }
        go();
        for (const k of [a, b]) { used[k] &= ~(1 << d); left[k]++; sumLeft[k] += d; }
        g[best] = 0;
        if (found.length >= limit) return;
      }
    };
    go();
    return { found, complete: nodes <= 40000 };
  }

  // Zagadka z jednym rozwiązaniem: tam, gdzie solver znajdzie drugie, odsłaniamy cyfrę.
  function generate(n, density, maxRun) {
    for (;;) {
      const white = pattern(n, density, maxRun);
      if (!white) continue;
      const solution = fill(white, n);
      if (!solution) continue;
      const { rs } = index(white, n);
      const sums = rs.map((r) => r.cells.reduce((s, i) => s + solution[i], 0));
      const given = new Uint8Array(n * n);
      let ok = false;
      for (let t = 0; t < 12; t++) {
        const { found, complete } = solve(white, n, sums, given);
        if (!complete) break;
        if (found.length === 1) { ok = true; break; }
        const other = found.find((f) => f.some((v, i) => v !== solution[i]));
        const diff = [...Array(n * n).keys()].filter((i) => white[i] && other[i] !== solution[i]);
        const i = diff[rnd(diff.length)];
        given[i] = solution[i];
      }
      if (ok) return (api.last = { n, white, solution, given, runs: rs, sums });
    }
  }

  // Błędy: powtórzone cyfry w ciągu oraz pełne ciągi o złej sumie.
  function check(g, runList, sums) {
    const dup = new Set(), badRun = new Set(), goodRun = new Set();
    runList.forEach((run, k) => {
      const seen = new Map();
      let sum = 0, full = true;
      for (const i of run.cells) {
        if (!g[i]) { full = false; continue; }
        sum += g[i];
        if (seen.has(g[i])) { dup.add(i); dup.add(seen.get(g[i])); }
        seen.set(g[i], i);
      }
      if (full && sum !== sums[k]) badRun.add(k);
      else if (full && !run.cells.some((i) => dup.has(i))) goodRun.add(k);
      if (!full && sum >= sums[k]) badRun.add(k);
    });
    return { dup, badRun, goodRun };
  }

  const api = { runs, pattern, fill, solve, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Kakuro;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "kakuro"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, n: 6, density: 0.16, maxRun: 4 },
    { key: "medium", name: "8 × 8", points: 25, n: 8, density: 0.2, maxRun: 5 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, density: 0.22, maxRun: 6 },
  ],
  rules: [
    "Wpisz cyfry od 1 do 9 w białe pola.",
    "Liczba nad przekątną to suma ciągu w prawo, liczba pod nią to suma ciągu w dół.",
    "W jednym ciągu cyfry nie mogą się powtarzać. Pomaga znajomość rozkładów: 3 w dwóch polach to zawsze 1 i 2, a 17 to 8 i 9.",
    "Strzałki przesuwają zaznaczenie, cyfry wpisują wartość, N przełącza notatki.",
  ],
  mount(board, ctx) {
    const { n, white, given, runs, sums } = Kakuro.generate(ctx.level.n, ctx.level.density, ctx.level.maxRun);
    const g = Uint8Array.from(given), notes = new Uint16Array(n * n);
    const whites = [...white.keys()].filter((i) => white[i]);
    let sel = whites.find((i) => !given[i]);
    const runOf = new Map();
    runs.forEach((run, k) => run.cells.forEach((i) => runOf.set(i, [...(runOf.get(i) || []), k])));
    const clueAt = new Map();
    runs.forEach((run, k) => {
      const c = clueAt.get(run.clue) || {};
      c[run.dir] = k;
      clueAt.set(run.clue, c);
    });

    board.classList.add("kk");
    board.style.setProperty("--cols", n);
    board.style.setProperty("--rows", n);
    board.style.setProperty("--n", n);
    const cells = Array.from({ length: n * n }, (_, i) => {
      const r = (i / n) | 0, c = i % n;
      if (!white[i]) {
        const d = el("div", "kk-clue");
        const cl = clueAt.get(i);
        if (cl) {
          d.classList.add("has");
          if (cl.a != null) d.append(el("span", "kk-a", sums[cl.a]));
          if (cl.d != null) d.append(el("span", "kk-d", sums[cl.d]));
        }
        board.append(d);
        return d;
      }
      const b = button("", "cell kk-cell");
      b.dataset.i = i;
      b.style.setProperty("--k", r + c);
      b.setAttribute("aria-label", `Wiersz ${r + 1}, kolumna ${c + 1}`);
      board.append(b);
      return b;
    });

    const save = ctx.undoable(([gs, ns, s]) => { g.set(gs); notes.set(ns); sel = s; render(); });
    const controls = digitControls(ctx, 9, { put });
    const sumInfo = el("p", "");
    ctx.panel.append(panelBlock("Zaznaczone ciągi", sumInfo));

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".kk-cell");
      if (b) { sel = +b.dataset.i; render(); }
    });
    cellKeys(ctx, {
      cols: n, rows: n, max: 9,
      get: () => sel,
      // strzałka przeskakuje pola ze wskazówkami
      set: (i) => {
        const dr = Math.sign(((i / n) | 0) - ((sel / n) | 0)), dc = Math.sign((i % n) - (sel % n));
        let j = i;
        while (j >= 0 && j < n * n && !white[j]) {
          const r = ((j / n) | 0) + dr, c = (j % n) + dc;
          if (r < 0 || r >= n || c < 0 || c >= n || (!dr && !dc)) { j = -1; break; }
          j = r * n + c;
        }
        if (j < 0 || !white[j]) return;
        sel = j;
        render();
        cells[j].focus({ preventScroll: true });
      },
      onDigit: (d) => put(d, controls.isNotes()),
      keys: controls.keys,
    });

    const open = whites.filter((i) => !given[i]).length;
    function put(d, asNote) {
      if (ctx.done || sel == null) return;
      if (given[sel]) { replay(cells[sel], "shake"); return; }
      if (asNote && d) {
        if (g[sel]) return;
        save([g.slice(), notes.slice(), sel]);
        notes[sel] ^= 1 << d;
        Sound.tap();
        return render();
      }
      if (g[sel] === d && !notes[sel]) return;
      save([g.slice(), notes.slice(), sel]);
      g[sel] = d;
      notes[sel] = 0;
      if (d) for (const k of runOf.get(sel)) for (const j of runs[k].cells) notes[j] &= ~(1 << d);
      const { dup, badRun, goodRun } = render();
      ctx.progress(whites.filter((i) => g[i] && !given[i]).length / open);
      if (!d) return Sound.erase();
      if (dup.has(sel) || runOf.get(sel).some((k) => badRun.has(k))) { Sound.error(); return replay(cells[sel], "shake"); }
      if (goodRun.size === runs.length) return ctx.win();
      const done = runOf.get(sel).filter((k) => goodRun.has(k));
      if (!done.length) return Sound.place(d);
      Sound.line();
      done.forEach((k) => sweep(runs[k].cells.map((j) => cells[j])));
    }

    const ring = selectionRing(board);
    function render() {
      ring(cells[sel]);
      const res = Kakuro.check(g, runs, sums);
      const mine = new Set(runOf.get(sel));
      const peers = new Set([...mine].flatMap((k) => runs[k].cells));
      whites.forEach((i) => {
        const b = cells[i];
        drawDigit(b, g[i], notes[i], 9);
        b.classList.toggle("given", !!given[i]);
        b.classList.toggle("peer", peers.has(i) && i !== sel);
        b.classList.toggle("bad", res.dup.has(i) && !given[i]);
      });
      clueAt.forEach((cl, i) => {
        for (const dir of ["a", "d"]) {
          if (cl[dir] == null) continue;
          const span = cells[i].querySelector(`.kk-${dir}`);
          span.classList.toggle("ok", res.goodRun.has(cl[dir]));
          span.classList.toggle("bad", res.badRun.has(cl[dir]));
          span.classList.toggle("hot", mine.has(cl[dir]));
        }
      });
      sumInfo.textContent = [...mine].map((k) => {
        const run = runs[k], s = run.cells.reduce((t, j) => t + g[j], 0);
        return `${run.dir === "a" ? "Poziomo" : "Pionowo"}: ${s} z ${sums[k]} w ${run.cells.length} ${plural(run.cells.length, "polu", "polach", "polach")}`;
      }).join(". ");
      return res;
    }
    render();
  },
});
