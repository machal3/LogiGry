// Prostokąty (Shikaku): podziel planszę n × n na prostokąty; każdy zawiera dokładnie jedną liczbę równą swojemu polu.
// Prostokąt: { r, c, h, w } (wiersz, kolumna, wysokość, szerokość).
const Shikaku = (() => {
  const cellsOf = ({ r, c, h, w }, n) => {
    const out = [];
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) out.push(y * n + x);
    return out;
  };

  // losowy podział na prostokąty o polu 2..maxA
  function split(n, maxA) {
    const done = [], todo = [{ r: 0, c: 0, h: n, w: n }];
    while (todo.length) {
      const q = todo.pop(), a = q.h * q.w;
      const want = a > maxA || (a > 3 && Math.random() < 0.55);
      const cuts = [];
      if (want) {
        for (let k = 1; k < q.h; k++) if (k * q.w >= 2 && (q.h - k) * q.w >= 2) cuts.push(["h", k]);
        for (let k = 1; k < q.w; k++) if (k * q.h >= 2 && (q.w - k) * q.h >= 2) cuts.push(["v", k]);
      }
      if (!cuts.length) { done.push(q); continue; }
      const [dir, k] = pick(cuts);
      if (dir === "h") todo.push({ ...q, h: k }, { ...q, r: q.r + k, h: q.h - k });
      else todo.push({ ...q, w: k }, { ...q, c: q.c + k, w: q.w - k });
    }
    return done;
  }

  // Liczba rozwiązań (do 2): każda liczba wybiera prostokąt, pola pokryte dokładnie raz.
  function count(n, clues, limit = 2) {
    const list = [...clues.entries()];
    const cand = list.map(([i, a]) => {
      const out = [], r0 = (i / n) | 0, c0 = i % n;
      for (let h = 1; h <= a; h++) {
        if (a % h) continue;
        const w = a / h;
        for (let r = r0 - h + 1; r <= r0; r++) for (let c = c0 - w + 1; c <= c0; c++) {
          if (r < 0 || c < 0 || r + h > n || c + w > n) continue;
          const cells = cellsOf({ r, c, h, w }, n);
          if (cells.some((j) => j !== i && clues.has(j))) continue;
          out.push(cells);
        }
      }
      return out;
    });
    const used = new Uint8Array(n * n), done = new Uint8Array(list.length);
    let sols = 0;
    const go = () => {
      if (sols >= limit) return;
      let best = -1, bestList = null;
      for (let k = 0; k < list.length; k++) {
        if (done[k]) continue;
        const ok = cand[k].filter((cs) => cs.every((j) => !used[j]));
        if (!ok.length) return;
        if (!bestList || ok.length < bestList.length) { best = k; bestList = ok; if (ok.length === 1) break; }
      }
      if (best < 0) { if (used.every(Boolean)) sols++; return; }
      done[best] = 1;
      for (const cs of bestList) {
        cs.forEach((j) => (used[j] = 1));
        go();
        cs.forEach((j) => (used[j] = 0));
      }
      done[best] = 0;
    };
    go();
    return sols;
  }

  function generate(n, maxA) {
    for (;;) {
      const rects = split(n, maxA);
      const clues = new Map();
      for (const q of rects) clues.set(pick(cellsOf(q, n)), q.h * q.w);
      if (count(n, clues) === 1) return (api.last = { n, rects, clues });
    }
  }

  // prostokąt gracza jest dobry, gdy ma dokładnie jedną liczbę równą polu
  const good = (q, n, clues) => {
    const inside = cellsOf(q, n).filter((j) => clues.has(j));
    return inside.length === 1 && clues.get(inside[0]) === q.h * q.w;
  };

  const api = { cellsOf, split, count, generate, good, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Shikaku;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "prostokaty"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, n: 6, maxA: 8 },
    { key: "medium", name: "8 × 8", points: 25, n: 8, maxA: 10 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, maxA: 12 },
  ],
  rules: [
    "Podziel całą planszę na prostokąty (kwadraty też się liczą).",
    "W każdym prostokącie jest dokładnie jedna liczba i równa się ona liczbie jego pól.",
    "Przeciągnij od rogu do rogu, żeby narysować prostokąt. Kliknięcie w narysowany prostokąt go usuwa.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Pewne cięcie", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybki geometra", desc: "Rozwiąż średni poziom w mniej niż 4 min.", points: 25 },
    { id: "mistrz", name: "Mistrz prostokątów", desc: "Rozwiąż trudny poziom w mniej niż 8 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, clues } = Shikaku.generate(ctx.level.n, ctx.level.maxA);
    let rects = []; // prostokąty gracza
    const cells = gridCells(board, n, n, "sk", { gap: 0.06 });
    board.style.setProperty("--max", "78px");
    clues.forEach((a, i) => cells[i].append(el("span", "sk-num", a)));
    const layer = el("div", "sk-layer");
    board.append(layer);
    const ghost = el("div", "sk-rect ghost");
    ghost.hidden = true;
    layer.append(ghost);
    const palette = ["#3550e6", "#d63864", "#0b8478", "#ffb020", "#6e52e8", "#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#15aabf", "#f06595", "#82c91e"];
    const save = ctx.undoable((s) => { rects = s; render(); });
    const info = statBlock(ctx, "Pokryte pola", { meter: true });

    const place = (node, q) => {
      node.style.setProperty("--r", q.r);
      node.style.setProperty("--c0", q.c);
      node.style.setProperty("--h", q.h);
      node.style.setProperty("--w", q.w);
    };
    const span = (a, b) => {
      const r = Math.min((a / n) | 0, (b / n) | 0), c = Math.min(a % n, b % n);
      return { r, c, h: Math.abs(((a / n) | 0) - ((b / n) | 0)) + 1, w: Math.abs((a % n) - (b % n)) + 1 };
    };

    let from = -1, to = -1;
    const cellAt = (e) => {
      const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".sk .gb-cell");
      return b ? +b.dataset.i : -1;
    };
    board.addEventListener("pointerdown", (e) => {
      if (ctx.done) return;
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      from = to = i;
      showGhost();
    });
    ctx.on(document, "pointermove", (e) => {
      if (from < 0) return;
      const i = cellAt(e);
      if (i >= 0 && i !== to) { to = i; showGhost(); Sound.tap(); }
    });
    ctx.on(document, "pointerup", () => {
      if (from < 0) return;
      const q = span(from, to);
      const single = from === to;
      from = -1;
      ghost.hidden = true;
      const hitIdx = rects.findIndex((x) => Shikaku.cellsOf(x, n).includes(to));
      // kliknięcie bez przeciągania w istniejący prostokąt usuwa go
      if (single && hitIdx >= 0) {
        save(rects.slice());
        rects.splice(hitIdx, 1);
        Sound.erase();
        return render();
      }
      const mine = new Set(Shikaku.cellsOf(q, n));
      save(rects.slice());
      rects = rects.filter((x) => !Shikaku.cellsOf(x, n).some((j) => mine.has(j)));
      rects.push(q);
      const res = render(rects.length - 1);
      if (res.solved) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 240) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 480 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      Shikaku.good(q, n, clues) ? Sound.place(Math.min(9, q.h * q.w)) : Sound.error();
    });
    function showGhost() {
      const q = span(from, to);
      ghost.hidden = false;
      place(ghost, q);
      ghost.dataset.size = q.h * q.w;
      ghost.classList.toggle("good", Shikaku.good(q, n, clues));
    }

    // fresh: indeks świeżo narysowanego prostokąta (animacja wejścia)
    function render(fresh = -1) {
      layer.querySelectorAll(".sk-rect:not(.ghost)").forEach((x) => x.remove());
      const covered = new Set();
      let allGood = true;
      rects.forEach((q, k) => {
        const d = el("div", "sk-rect");
        place(d, q);
        const ok = Shikaku.good(q, n, clues);
        if (!ok) allGood = false;
        d.classList.toggle("good", ok);
        d.classList.toggle("bad", !ok);
        // kolor według pozycji, żeby nie zmieniał się po usunięciu sąsiada
        d.style.setProperty("--rc", palette[(q.r * 7 + q.c * 3 + q.w) % palette.length]);
        if (k === fresh) d.classList.add("fresh");
        Shikaku.cellsOf(q, n).forEach((j) => covered.add(j));
        layer.append(d);
      });
      cells.forEach((b, i) => b.classList.toggle("covered", covered.has(i)));
      info.set(`${covered.size} / ${n * n}`, covered.size / (n * n), `Prostokąty: ${rects.length} z ${clues.size}`);
      ctx.progress((covered.size / (n * n)) * 0.95);
      return { solved: allGood && covered.size === n * n };
    }
    render();
  },
});
