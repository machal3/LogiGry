// Magnesy: plansza podzielona na prostokąty o dwóch polach. W każdym stoi magnes (plus i minus)
// albo oba pola są puste. Liczby z boku mówią, ile biegunów dodatnich jest w rzędzie i kolumnie.
{
  const UNKNOWN = 9;

  // Dzieli planszę na domino: bazowe kafelkowanie, potem losowe przestawienia w blokach 2 × 2.
  function partition(n, m) {
    const owner = new Int16Array(n * m).fill(-1);
    const doms = [];
    if (m % 2 === 0) {
      for (let r = 0; r < n; r++) for (let c = 0; c < m; c += 2) { owner[r * m + c] = owner[r * m + c + 1] = doms.length; doms.push([r * m + c, r * m + c + 1]); }
    } else {
      for (let c = 0; c < m; c++) for (let r = 0; r < n; r += 2) { owner[r * m + c] = owner[(r + 1) * m + c] = doms.length; doms.push([r * m + c, (r + 1) * m + c]); }
    }
    for (let t = 0; t < 500; t++) {
      const r = rnd(n - 1), c = rnd(m - 1);
      const a = r * m + c, b = a + 1, d = a + m, e = d + 1;
      if (owner[a] === owner[b] && owner[d] === owner[e] && owner[a] !== owner[d]) {
        const ia = owner[a], id = owner[d];
        owner[a] = owner[d] = ia;
        owner[b] = owner[e] = id;
        doms[ia] = [a, d];
        doms[id] = [b, e];
      } else if (owner[a] === owner[d] && owner[b] === owner[e] && owner[a] !== owner[b]) {
        const ia = owner[a], ib = owner[b];
        owner[a] = owner[b] = ia;
        owner[d] = owner[e] = ib;
        doms[ia] = [a, b];
        doms[ib] = [d, e];
      }
    }
    return { owner, doms };
  }

  const neighbours = (n, m, i) => {
    const r = (i / m) | 0, c = i % m, out = [];
    if (c > 0) out.push(i - 1);
    if (c < m - 1) out.push(i + 1);
    if (r > 0) out.push(i - m);
    if (r < n - 1) out.push(i + m);
    return out;
  };

  // Liczy rozwiązania (do `limit`). Pole puste to 0, plus 1, minus -1, nieznane 2.
  function solutions(p, limit) {
    const { n, m, doms, given, rowPlus, colPlus } = p;
    const val = new Int8Array(n * m).fill(2);
    for (let i = 0; i < n * m; i++) if (given[i] !== UNKNOWN) val[i] = given[i];
    const rowCnt = new Int8Array(n), colCnt = new Int8Array(m);
    for (let i = 0; i < n * m; i++) if (val[i] === 1) { rowCnt[(i / m) | 0]++; colCnt[i % m]++; }
    let found = 0, nodes = 0;
    const okN = (i, v, skip) => v === 0 || neighbours(n, m, i).every((k) => k === skip || val[k] === 2 || val[k] !== v);
    const put = (i, v) => {
      if (v === 1) {
        const r = (i / m) | 0, c = i % m;
        if (++rowCnt[r] > rowPlus[r]) { rowCnt[r]--; return false; }
        if (++colCnt[c] > colPlus[c]) { colCnt[c]--; rowCnt[r]--; return false; }
      }
      val[i] = v;
      return true;
    };
    const pop = (i, v) => { val[i] = 2; if (v === 1) { rowCnt[(i / m) | 0]--; colCnt[i % m]--; } };
    const rec = (k) => {
      if (found >= limit || nodes++ > 2000000) return;
      if (k === doms.length) {
        for (let r = 0; r < n; r++) if (rowCnt[r] !== rowPlus[r]) return;
        for (let c = 0; c < m; c++) if (colCnt[c] !== colPlus[c]) return;
        found++;
        return;
      }
      const [i, j] = doms[k];
      for (const [vi, vj] of [[0, 0], [1, -1], [-1, 1]]) {
        if (given[i] !== UNKNOWN && given[i] !== vi) continue;
        if (given[j] !== UNKNOWN && given[j] !== vj) continue;
        if (val[i] !== 2 && val[j] !== 2) { if (val[i] === vi && val[j] === vj) rec(k + 1); continue; }
        if (val[i] === 2 && val[j] === 2) {
          if (!okN(i, vi, j) || !okN(j, vj, i)) continue;
          if (!put(i, vi)) continue;
          if (!put(j, vj)) { pop(i, vi); continue; }
          rec(k + 1);
          pop(j, vj);
          pop(i, vi);
        } else if (val[i] === 2) {
          if (!okN(i, vi, j)) continue;
          if (!put(i, vi)) continue;
          rec(k + 1);
          pop(i, vi);
        } else {
          if (!okN(j, vj, i)) continue;
          if (!put(j, vj)) continue;
          rec(k + 1);
          pop(j, vj);
        }
      }
    };
    rec(0);
    return found;
  }

  const okAdj = (n, m, sol, i, v) => v === 0 || neighbours(n, m, i).every((k) => sol[k] !== v);

  // Nowa łamigłówka: najpierw układamy poprawne rozwiązanie, potem zostawiamy tyle podpowiedzi, ile trzeba.
  function build(n, m, magnetP, minHidden) {
    for (let t = 0; t < 60; t++) {
      const { owner, doms } = partition(n, m);
      const sol = new Int8Array(n * m);
      let magnets = 0;
      for (const k of shuffle([...doms.keys()])) {
        const [i, j] = doms[k];
        const opts = [];
        for (const s of [1, -1]) if (okAdj(n, m, sol, i, s) && okAdj(n, m, sol, j, -s)) opts.push([s, -s]);
        if (opts.length && Math.random() < magnetP) { const [a, b] = pick(opts); sol[i] = a; sol[j] = b; magnets++; }
      }
      if (magnets < Math.max(2, doms.length * 0.2)) continue;
      const rowPlus = new Int8Array(n), colPlus = new Int8Array(m);
      for (let i = 0; i < n * m; i++) if (sol[i] === 1) { rowPlus[(i / m) | 0]++; colPlus[i % m]++; }
      const given = new Int8Array(n * m).fill(UNKNOWN);
      const p = { n, m, owner, doms, solution: sol, rowPlus, colPlus, given };
      const order = shuffle([...Array(n * m).keys()]);
      for (const i of order) if (Math.random() < 0.25) given[i] = sol[i];
      if (solutions(p, 2) !== 1) {
        for (const i of order) {
          if (given[i] !== UNKNOWN) continue;
          given[i] = sol[i];
          if (solutions(p, 2) === 1) break;
        }
      }
      if (solutions(p, 2) === 1 && given.filter((v) => v === UNKNOWN).length >= minHidden) return p;
    }
    return null;
  }

  // Błędy gracza: złe sąsiedztwo, zła para w domino, przekroczony licznik w rzędzie lub kolumnie.
  function conflicts(p, val) {
    const { n, m, doms, rowPlus, colPlus } = p;
    const cell = new Set(), row = new Set(), col = new Set();
    const dom = new Map();
    doms.forEach(([i, j]) => { dom.set(i, j); dom.set(j, i); });
    for (let i = 0; i < n * m; i++) {
      const v = val[i];
      if (v === 2 || v === 0) continue;
      const r = (i / m) | 0, c = i % m;
      if (c < m - 1 && val[i + 1] === v) { cell.add(i); cell.add(i + 1); }
      if (r < n - 1 && val[i + m] === v) { cell.add(i); cell.add(i + m); }
      const j = dom.get(i);
      if (j != null && val[j] !== 2 && val[j] !== -v) { cell.add(i); cell.add(j); }
    }
    for (let r = 0; r < n; r++) {
      let s = 0;
      for (let c = 0; c < m; c++) if (val[r * m + c] === 1) s++;
      if (s > rowPlus[r]) { row.add(r); for (let c = 0; c < m; c++) if (val[r * m + c] === 1) cell.add(r * m + c); }
    }
    for (let c = 0; c < m; c++) {
      let s = 0;
      for (let r = 0; r < n; r++) if (val[r * m + c] === 1) s++;
      if (s > colPlus[c]) { col.add(c); for (let r = 0; r < n; r++) if (val[r * m + c] === 1) cell.add(r * m + c); }
    }
    return { cell, row, col };
  }
  const solved = (p, val) => val.every((v) => v !== 2) && (() => {
    const c = conflicts(p, val);
    if (c.cell.size || c.row.size || c.col.size) return false;
    for (let r = 0; r < p.n; r++) { let s = 0; for (let k = 0; k < p.m; k++) if (val[r * p.m + k] === 1) s++; if (s !== p.rowPlus[r]) return false; }
    for (let k = 0; k < p.m; k++) { let s = 0; for (let r = 0; r < p.n; r++) if (val[r * p.m + k] === 1) s++; if (s !== p.colPlus[k]) return false; }
    return true;
  })();

  if (typeof module !== "undefined") module.exports = { partition, solutions, build, conflicts, solved, neighbours, UNKNOWN };

  if (typeof registerGame !== "undefined") registerGame({
    id: "magnesy",
    cat: "logiczne",
    name: "Magnesy",
    author: "DeepSeek V4.1 Flash",
    desc: "Rozstaw magnesy w prostokątach. Liczby mówią, ile biegunów dodatnich jest w rzędzie.",
    color: "#8e2f6d",
    ink: "#ffffff",
    glyph: [".#.#.", ".#.#.", "..#..", ".#.#.", ".#.#."],
    levels: [
      { key: "easy", name: "4 × 4", points: 10, n: 4, m: 4, magnets: 0.55, hidden: 8 },
      { key: "medium", name: "5 × 6", points: 25, n: 5, m: 6, magnets: 0.5, hidden: 12 },
      { key: "hard", name: "6 × 6", points: 50, n: 6, m: 6, magnets: 0.55, hidden: 14 },
    ],
    rules: [
      "Plansza jest podzielona na prostokąty o dwóch polach. W każdym stoi magnes z plusem i minusem albo oba pola są puste.",
      "Pola stykające się bokiem nie mogą mieć tego samego bieguna.",
      "Liczby z boku mówią, ile biegunów dodatnich jest w danym rzędzie i kolumnie.",
      "Klikasz pole, aby zmieniać jego stan: puste, plus, minus. Podpowiedź odsłania jedno pole.",
    ],
    achievements: [
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Rozwiąż planszę bez podpowiedzi.", points: 10 },
      { id: "wprawny", name: "Wprawny", desc: "Rozwiąż planszę 5 × 6 bez podpowiedzi.", points: 25 },
      { id: "mistrz-biegunow", name: "Mistrz biegunów", desc: "Rozwiąż planszę 6 × 6 w mniej niż cztery minuty.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, m } = ctx.level;
      const p = build(n, m, ctx.level.magnets, ctx.level.hidden) || build(n, m, 0.5, 0);
      const val = new Int8Array(n * m).fill(2);
      let sel = 0, hinted = false;

      const cells = gridCells(board, m + 1, n + 1, "mg", { gap: 0.14, label: null });
      const clueRow = [], clueCol = [];
      cells.forEach((c, k) => {
        const r = (k / (m + 1)) | 0, cc = k % (m + 1);
        c.classList.add("clue");
        c.disabled = true;
        if (r === 0 && cc === 0) { c.classList.add("corner"); return; }
        if (r === 0) { c.classList.add("top"); c.replaceChildren(el("span", "mg-clue")); clueCol[cc - 1] = c.firstChild; c.setAttribute("aria-label", `Kolumna ${cc}: ile plusów`); return; }
        if (cc === 0) { c.classList.add("side"); c.replaceChildren(el("span", "mg-clue")); clueRow[r - 1] = c.firstChild; c.setAttribute("aria-label", `Wiersz ${r}: ile plusów`); return; }
        c.classList.remove("clue");
        c.disabled = false;
        c.dataset.cell = (r - 1) * m + (cc - 1);
        c.setAttribute("aria-label", `Wiersz ${r}, kolumna ${cc}`);
      });

      // obrysy prostokątów-magnesów rysowane pod polami
      const g = 0.14, W = (m + 1) + (m + 2) * g, H = (n + 1) + (n + 2) * g;
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("class", "mg-svg");
      svg.setAttribute("aria-hidden", "true");
      const cellAt = (i) => [g + ((i % m) + 1) * (1 + g), g + (((i / m) | 0) + 1) * (1 + g)];
      for (const [i, j] of p.doms) {
        const [x1, y1] = cellAt(i), [x2, y2] = cellAt(j);
        const rect = document.createElementNS(NS, "rect");
        const horiz = y1 === y2;
        rect.setAttribute("x", x1);
        rect.setAttribute("y", y1);
        rect.setAttribute("width", horiz ? 2 + g : 1);
        rect.setAttribute("height", horiz ? 1 : 2 + g);
        rect.setAttribute("rx", 0.18);
        svg.append(rect);
      }
      board.append(svg);

      const doneEl = statBlock(ctx, "Uzupełnione", { meter: true });
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      function cycle(i) {
        if (ctx.done || p.given[i] !== UNKNOWN) { if (p.given[i] !== UNKNOWN) Sound.error(); return; }
        val[i] = val[i] === 2 ? 1 : val[i] === 1 ? -1 : val[i] === -1 ? 0 : 2;
        sel = i;
        val[i] === 0 ? Sound.erase() : Sound.place(val[i] === 1 ? 8 : 3);
        render();
      }
      function hint() {
        if (ctx.done) return;
        const i = val.findIndex((v, k) => v !== p.solution[k]);
        if (i < 0) return;
        hinted = true;
        val[i] = p.solution[i];
        sel = i;
        Sound.place(5);
        render();
      }

      board.addEventListener("click", (e) => {
        const c = e.target.closest(".mg .gb-cell[data-cell]");
        if (c) cycle(+c.dataset.cell);
      });
      cellKeys(ctx, {
        cols: m, rows: n,
        get: () => sel,
        set: (i) => { sel = i; render(); },
        keys: { " ": () => cycle(sel), enter: () => cycle(sel) },
      });

      function render() {
        const bad = conflicts(p, val);
        cells.forEach((c, k) => {
          const i = c.dataset.cell;
          if (i == null) return;
          const idx = +c.dataset.cell;
          const v = val[idx];
          // treść pola zmieniamy tylko wtedy, gdy naprawdę się zmieniła,
          // dzięki temu animacja bieguna gra raz, na jednym polu
          if (c.dataset.v !== String(v)) {
            c.dataset.v = String(v);
            if (v === 2 || v === 0) c.replaceChildren(el("span", "mg-dot"));
            else { const pole = el("span", "mg-pole", v === 1 ? "+" : "–"); pole.dataset.sign = v === 1 ? "+" : "-"; c.replaceChildren(pole); }
          }
          c.classList.toggle("given", p.given[idx] !== UNKNOWN);
          c.classList.toggle("blank", v === 0);
          c.classList.toggle("sel", idx === sel);
          c.classList.toggle("bad", bad.cell.has(idx));
        });
        for (let r = 0; r < n; r++) {
          let s = 0;
          for (let c = 0; c < m; c++) if (val[r * m + c] === 1) s++;
          clueRow[r].textContent = p.rowPlus[r];
          clueRow[r].parentElement.classList.toggle("ok", s === p.rowPlus[r] && rowFull(r));
          clueRow[r].parentElement.classList.toggle("over", bad.row.has(r));
        }
        for (let c = 0; c < m; c++) {
          let s = 0;
          for (let r = 0; r < n; r++) if (val[r * m + c] === 1) s++;
          clueCol[c].textContent = p.colPlus[c];
          clueCol[c].parentElement.classList.toggle("ok", s === p.colPlus[c] && colFull(c));
          clueCol[c].parentElement.classList.toggle("over", bad.col.has(c));
        }
        const filled = val.filter((v) => v !== 2).length;
        doneEl.set(`${filled} / ${n * m}`, filled / (n * m), "");
        ctx.progress(filled / (n * m));
        if (solved(p, val)) finish();
      }
      const rowFull = (r) => { for (let c = 0; c < m; c++) if (val[r * m + c] === 2) return false; return true; };
      const colFull = (c) => { for (let r = 0; r < n; r++) if (val[r * m + c] === 2) return false; return true; };

      function finish() {
        if (ctx.done) return;
        if (!hinted) ctx.achieve("bez-podpowiedzi");
        if (!hinted && n === 5 && m === 6) ctx.achieve("wprawny");
        if (n === 6 && m === 6 && ctx.time < 240) ctx.achieve("mistrz-biegunow");
        ctx.win("Wszystkie bieguny na swoim miejscu.");
      }
      render();
    },
  });
}
