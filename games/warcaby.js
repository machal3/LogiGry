// Warcaby (zasady międzynarodowe na planszy 8 × 8): bicie obowiązkowe i maksymalne, pionki biją też do tyłu, damki latają.
// b[i] dla i = r * 8 + c: 1 pionek gracza, 2 damka gracza, -1 pionek komputera, -2 damka komputera, 0 puste.
// Gracz gra od dołu (pionki idą w górę). Ruch: { from, to, path, caps }.
const Checkers = (() => {
  const N = 8, DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
  const mine = (v, side) => v * side > 0;
  function start() {
    const b = new Array(64).fill(0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) b[r * N + c] = -1;
    for (let r = 5; r < 8; r++) for (let c = 0; c < N; c++) if ((r + c) % 2) b[r * N + c] = 1;
    return b;
  }
  // wszystkie serie bić od pola `from`; zbite piony zostają na planszy do końca serii (nie można ich przeskoczyć drugi raz)
  function captures(b, from, side) {
    const king = Math.abs(b[from]) === 2, out = [];
    const go = (at, path, caps) => {
      const r = (at / N) | 0, c = at % N;
      let any = false;
      for (const [dr, dc] of DIAG) {
        let rr = r + dr, cc = c + dc;
        if (king) while (inside(rr, cc) && b[rr * N + cc] === 0) { rr += dr; cc += dc; }
        if (!inside(rr, cc)) continue;
        const mid = rr * N + cc;
        if (!mine(b[mid], -side) || caps.includes(mid)) continue;
        for (let lr = rr + dr, lc = cc + dc; inside(lr, lc) && (b[lr * N + lc] === 0 || lr * N + lc === from); lr += dr, lc += dc) {
          any = true;
          go(lr * N + lc, [...path, lr * N + lc], [...caps, mid]);
          if (!king) break;
        }
      }
      if (!any && caps.length) out.push({ from, to: at, path, caps });
    };
    go(from, [], []);
    return out;
  }
  function moves(b, side) {
    let caps = [];
    for (let i = 0; i < 64; i++) if (mine(b[i], side)) caps.push(...captures(b, i, side));
    if (caps.length) {
      const max = Math.max(...caps.map((m) => m.caps.length));
      return caps.filter((m) => m.caps.length === max);
    }
    const out = [];
    for (let i = 0; i < 64; i++) {
      if (!mine(b[i], side)) continue;
      const r = (i / N) | 0, c = i % N, king = Math.abs(b[i]) === 2;
      for (const [dr, dc] of DIAG) {
        if (!king && dr !== -side) continue; // pionek gracza (side 1) idzie w górę
        for (let rr = r + dr, cc = c + dc; inside(rr, cc) && b[rr * N + cc] === 0; rr += dr, cc += dc) {
          out.push({ from: i, to: rr * N + cc, path: [rr * N + cc], caps: [] });
          if (!king) break;
        }
      }
    }
    return out;
  }
  function apply(b, m) {
    const v = b[m.from];
    b[m.from] = 0;
    m.caps.forEach((i) => (b[i] = 0));
    const r = (m.to / N) | 0;
    // promocja tylko na końcu ruchu
    b[m.to] = Math.abs(v) === 1 && ((v > 0 && r === 0) || (v < 0 && r === N - 1)) ? v * 2 : v;
    return b;
  }
  function evaluate(b) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const v = b[i];
      if (!v) continue;
      const r = (i / N) | 0, c = i % N;
      const val = Math.abs(v) === 2 ? 300 : 100 + (v > 0 ? 7 - r : r) * 4;
      const centre = c > 1 && c < 6 && r > 1 && r < 6 ? 6 : 0;
      s += v > 0 ? -(val + centre) : val + centre;
    }
    return s;
  }
  function search(b, depth, alpha, beta, side) {
    const ms = moves(b, side);
    if (!ms.length) return side === -1 ? -100000 - depth : 100000 + depth;
    if (!depth) return evaluate(b);
    let best = side === -1 ? -Infinity : Infinity;
    for (const m of ms) {
      const v = search(apply(b.slice(), m), depth - 1, alpha, beta, -side);
      if (side === -1) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, depth) {
    const ms = moves(b, -1);
    let best = ms[0], bv = -Infinity;
    for (const m of shuffle(ms.slice())) {
      const v = search(apply(b.slice(), m), depth - 1, -Infinity, Infinity, 1);
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  const api = { N, start, captures, moves, apply, evaluate, search, bestMove, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Checkers;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "warcaby"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, depth: 1 },
    { key: "medium", name: "Średni", points: 25, depth: 4 },
    { key: "hard", name: "Trudny", points: 50, depth: 6 },
  ],
  rules: [
    "Pionki chodzą o jedno pole po skosie do przodu. Bicie jest obowiązkowe, może być wielokrotne i odbywa się także do tyłu. Trzeba wybrać bicie zabierające najwięcej pionów.",
    "Pionek, który kończy ruch na ostatnim rzędzie, staje się damką. Damka chodzi i bije po skosie na dowolną odległość.",
    "Kliknij swój pionek, a potem podświetlone pole docelowe. Wygrywasz, gdy komputer nie ma pionów albo ruchu.",
  ],
  mount(board, ctx) {
    const { N } = Checkers;
    const b = Checkers.start();
    Checkers.last = { b };
    let sel = -1, thinking = false, plies = 0;
    const cells = gridCells(board, N, N, "ck", { gap: 0 });
    board.style.setProperty("--max", "84px");
    cells.forEach((d, i) => d.classList.toggle("dark", (((i / N) | 0) + (i % N)) % 2 === 1));
    const layer = el("div", "ck-layer");
    board.append(layer);
    const pieces = new Map(); // pole → element
    const turnEl = el("p", "turn");
    const countEl = el("div", "rv-count");
    ctx.panel.append(panelBlock("Ruch", turnEl), panelBlock("Pionki", countEl));
    const save = ctx.undoable(([s, p]) => { s.forEach((v, i) => (b[i] = v)); plies = p; sel = -1; build(); render(); });
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

    function build() {
      layer.replaceChildren();
      pieces.clear();
      b.forEach((v, i) => {
        if (!v) return;
        const p = el("span", `ck-piece ${v > 0 ? "me" : "ai"}`);
        place(p, i);
        layer.append(p);
        pieces.set(i, p);
      });
    }
    const place = (p, i) => { p.style.setProperty("--r", (i / N) | 0); p.style.setProperty("--c0", i % N); };
    // przesuwa pionek po kolejnych polach serii, zbite znikają na końcu
    function animate(m, done) {
      const p = pieces.get(m.from);
      pieces.delete(m.from);
      const steps = m.path.slice();
      const next = () => {
        if (!steps.length) {
          m.caps.forEach((i) => { const q = pieces.get(i); if (q) { q.classList.add("taken"); setTimeout(() => q.remove(), 300); pieces.delete(i); } });
          pieces.set(m.to, p);
          return done();
        }
        place(p, steps.shift());
        Sound.place(m.caps.length ? 6 : 3);
        wait(next, 190);
      };
      next();
    }
    function finish(side) {
      const me = b.filter((v) => v > 0).length, ai = b.filter((v) => v < 0).length;
      if (!Checkers.moves(b, -side).length) {
        if (side === 1) ctx.win(`Zostało ci ${me} ${plural(me, "pionek", "pionki", "pionków")}.`);
        else ctx.lose("Komputer wygrał", "Nie masz już ruchu.");
        return true;
      }
      if (plies > 160) { ctx.lose("Remis", `Za długa partia. Pionki ${me} : ${ai}.`); return true; }
      return false;
    }
    function aiTurn() {
      thinking = true;
      render();
      wait(() => {
        const m = Checkers.bestMove(b, ctx.level.depth);
        Checkers.apply(b, m);
        plies++;
        animate(m, () => {
          thinking = false;
          build();
          render();
          finish(-1);
        });
      }, 350);
    }
    function click(i) {
      if (ctx.done || thinking) return;
      const legal = Checkers.moves(b, 1);
      if (b[i] > 0) {
        if (!legal.some((m) => m.from === i)) {
          replay(cells[i], "shake");
          Sound.error();
          if (legal[0]?.caps.length) ctx.toast("Bicie jest obowiązkowe");
          return;
        }
        sel = i;
        Sound.tap();
        return render();
      }
      const m = legal.find((x) => x.from === sel && x.to === i);
      if (!m) return;
      save([b.slice(), plies]);
      Checkers.apply(b, m);
      plies++;
      sel = -1;
      thinking = true;
      render();
      animate(m, () => {
        thinking = false;
        build();
        if (finish(1)) return render();
        aiTurn();
      });
    }
    board.addEventListener("click", (e) => { const d = e.target.closest(".gb-cell"); if (d) click(+d.dataset.i); });
    let cur = 40;
    cellKeys(ctx, { cols: N, rows: N, get: () => cur, set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); }, keys: { " ": () => click(cur), enter: () => click(cur) } });

    function render() {
      const legal = thinking || ctx.done ? [] : Checkers.moves(b, 1);
      const from = new Set(legal.map((m) => m.from)), to = new Set(legal.filter((m) => m.from === sel).map((m) => m.to));
      cells.forEach((d, i) => { d.classList.toggle("can", from.has(i)); d.classList.toggle("sel", i === sel); d.classList.toggle("dest", to.has(i)); });
      pieces.forEach((p, i) => { p.classList.toggle("king", Math.abs(b[i]) === 2); p.classList.toggle("sel", i === sel); });
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Ruch komputera…" : legal[0]?.caps.length ? "Twój ruch: musisz bić" : "Twój ruch");
      const me = b.filter((v) => v > 0).length, ai = b.filter((v) => v < 0).length;
      countEl.replaceChildren(el("span", "ck-me", me), el("span", "ck-ai", ai));
      ctx.progress((12 - ai) / 12);
    }
    build();
    render();
  },
});
