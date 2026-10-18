// Namioty: przy każdym drzewie (w pionie lub poziomie) stoi jego własny namiot. Namioty nie stykają się nawet rogami.
// Liczby przy wierszach i kolumnach mówią, ile w nich namiotów. Plansza n × n, wierszami.
const Tents = (() => {
  const orth = (n, i) => {
    const r = (i / n) | 0, c = i % n;
    return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n).map(([a, b]) => a * n + b);
  };
  const ring = (n, i) => {
    const r = (i / n) | 0, c = i % n, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const a = r + dr, b = c + dc;
      if ((dr || dc) && a >= 0 && a < n && b >= 0 && b < n) out.push(a * n + b);
    }
    return out;
  };

  function generate(n, fill) {
    const tents = new Set(), trees = new Set();
    for (const i of shuffle([...Array(n * n).keys()])) {
      if (tents.size >= n * n * fill) break;
      if (tents.has(i) || trees.has(i) || ring(n, i).some((j) => tents.has(j))) continue;
      const spots = orth(n, i).filter((j) => !tents.has(j) && !trees.has(j));
      if (!spots.length) continue;
      tents.add(i);
      trees.add(pick(spots));
    }
    const rows = Array.from({ length: n }, (_, r) => [...tents].filter((i) => ((i / n) | 0) === r).length);
    const cols = Array.from({ length: n }, (_, c) => [...tents].filter((i) => i % n === c).length);
    return (api.last = { n, trees, solution: tents, rows, cols });
  }

  // skojarzenie namiotów z drzewami (ścieżki powiększające)
  function matched(n, trees, tents) {
    const owner = new Map();
    const tryTent = (t, seen) => {
      for (const tr of orth(n, t)) {
        if (!trees.has(tr) || seen.has(tr)) continue;
        seen.add(tr);
        if (!owner.has(tr) || tryTent(owner.get(tr), seen)) { owner.set(tr, t); return true; }
      }
      return false;
    };
    let k = 0;
    for (const t of tents) if (tryTent(t, new Set())) k++;
    return k;
  }

  function check(p, tents) {
    const { n, trees, rows, cols } = p;
    const touching = new Set();
    for (const t of tents) for (const j of ring(n, t)) if (tents.has(j)) touching.add(t);
    // namiot bez żadnego drzewa obok
    const lonely = new Set([...tents].filter((t) => !orth(n, t).some((j) => trees.has(j))));
    const rowCount = rows.map((_, r) => [...tents].filter((i) => ((i / n) | 0) === r).length);
    const colCount = cols.map((_, c) => [...tents].filter((i) => i % n === c).length);
    const solved = !touching.size && !lonely.size && tents.size === trees.size &&
      rowCount.every((k, r) => k === rows[r]) && colCount.every((k, c) => k === cols[c]) && matched(n, trees, tents) === trees.size;
    return { touching, lonely, rowCount, colCount, solved };
  }

  const api = { orth, ring, generate, matched, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Tents;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "namioty"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, n: 6, fill: 0.2 },
    { key: "medium", name: "8 × 8", points: 25, n: 8, fill: 0.2 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, fill: 0.2 },
  ],
  rules: [
    "Każde drzewo ma swój namiot na polu tuż obok: nad, pod albo z boku. Namiotów jest tyle samo co drzew.",
    "Namioty nie stykają się ze sobą, nawet rogami.",
    "Liczby przy wierszach i kolumnach mówią, ile stoi w nich namiotów.",
    "Kliknięcie stawia namiot, drugie trawę, trzecie czyści. Prawy przycisk i przeciąganie rozkładają trawę. Kliknięcie w liczbę zatrawia resztę spełnionego wiersza lub kolumny.",
  ],
  mount(board, ctx) {
    const p = Tents.generate(ctx.level.n, ctx.level.fill);
    const { n, trees, rows, cols } = p;
    const m = n + 1;
    const mark = new Array(n * n).fill(0); // 0 nic, 1 namiot, 2 trawa
    const all = gridCells(board, m, m, "tn", { gap: 0.05, label: null });
    board.style.setProperty("--max", "72px");
    const at = (i) => all[(((i / n) | 0) + 1) * m + (i % n) + 1];
    const cells = Array.from({ length: n * n }, (_, i) => at(i));
    const rowClue = rows.map((k, r) => all[(r + 1) * m]);
    const colClue = cols.map((k, c) => all[c + 1]);
    all[0].classList.add("corner");
    all[0].disabled = true;
    rowClue.forEach((b, r) => { b.classList.add("clue"); b.textContent = rows[r]; b.setAttribute("aria-label", `Wiersz ${r + 1}: ${rows[r]} namiotów`); });
    colClue.forEach((b, c) => { b.classList.add("clue"); b.textContent = cols[c]; b.setAttribute("aria-label", `Kolumna ${c + 1}: ${cols[c]} namiotów`); });
    cells.forEach((b, i) => {
      b.dataset.t = i;
      b.style.setProperty("--k", ((i / n) | 0) + (i % n));
      if (trees.has(i)) { b.classList.add("tree"); b.disabled = true; b.setAttribute("aria-label", "Drzewo"); }
      else b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}`);
    });
    const save = ctx.undoable((s) => { s.forEach((v, i) => (mark[i] = v)); render(); });
    const info = statBlock(ctx, "Namioty", { meter: true });

    let paint = -1;
    const apply = (i, v) => {
      if (mark[i] === v || trees.has(i)) return false;
      mark[i] = v;
      if (v === 1) replay(cells[i], "pop");
      return true;
    };
    const after = (placedTent) => {
      const res = render();
      if (res.solved) return ctx.win();
      if (placedTent >= 0 && (res.touching.has(placedTent) || res.lonely.has(placedTent))) return Sound.error();
      placedTent >= 0 ? Sound.place(4) : Sound.tap();
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (!b || b.disabled || ctx.done) return;
      if (b.classList.contains("clue")) return fillLine(b);
      const i = +b.dataset.t;
      save(mark.slice());
      paint = e.button === 2 ? (mark[i] === 2 ? 0 : 2) : (mark[i] + 1) % 3;
      apply(i, paint);
      after(paint === 1 ? i : -1);
    });
    ctx.on(document, "pointermove", (e) => {
      if (paint < 0 || paint === 1) return;
      const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".tn .gb-cell");
      if (b?.dataset.t != null && apply(+b.dataset.t, paint)) after(-1);
    });
    ctx.on(document, "pointerup", () => { paint = -1; });

    // wiersz lub kolumna z kompletem namiotów: reszta pól to trawa
    function fillLine(b) {
      const r = rowClue.indexOf(b), c = colClue.indexOf(b);
      const line = r >= 0 ? [...Array(n).keys()].map((k) => r * n + k) : [...Array(n).keys()].map((k) => k * n + c);
      const empty = line.filter((i) => !mark[i] && !trees.has(i));
      if (!empty.length) return;
      save(mark.slice());
      empty.forEach((i) => apply(i, 2));
      after(-1);
    }

    function render() {
      const tents = new Set();
      mark.forEach((v, i) => v === 1 && tents.add(i));
      const res = Tents.check(p, tents);
      cells.forEach((b, i) => {
        b.classList.toggle("tent", mark[i] === 1);
        b.classList.toggle("grass", mark[i] === 2);
        b.classList.toggle("bad", res.touching.has(i) || res.lonely.has(i));
      });
      const state = (b, have, want) => {
        b.classList.toggle("ok", have === want);
        b.classList.toggle("over", have > want);
      };
      rowClue.forEach((b, r) => state(b, res.rowCount[r], rows[r]));
      colClue.forEach((b, c) => state(b, res.colCount[c], cols[c]));
      info.set(`${tents.size} / ${trees.size}`, tents.size / trees.size);
      ctx.progress(Math.min(tents.size, trees.size) / trees.size * 0.95);
      return res;
    }
    render();
  },
});
