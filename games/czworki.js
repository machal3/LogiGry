// Czwórki (Connect Four): plansza 7 × 6, krążki spadają na dno kolumny. Cztery w linii wygrywają.
// b[i] dla i = r * 7 + c (r = 0 na górze): 0 puste, 1 gracz, 2 komputer.
const Connect4 = (() => {
  const C = 7, R = 6;
  const LINES = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
      if (cells.every(([a, b]) => a >= 0 && a < R && b >= 0 && b < C)) LINES.push(cells.map(([a, b]) => a * C + b));
    }
  }
  const drop = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r * C + c]) return r * C + c; return -1; };
  const winner = (b) => { for (const l of LINES) { const v = b[l[0]]; if (v && l.every((i) => b[i] === v)) return { v, line: l }; } return null; };
  // ocena pozycji z punktu widzenia komputera: otwarte trójki i dwójki, środek planszy
  function evaluate(b) {
    let s = 0;
    for (const l of LINES) {
      let ai = 0, me = 0;
      for (const i of l) { if (b[i] === 2) ai++; else if (b[i] === 1) me++; }
      if (ai && me) continue;
      if (ai === 3) s += 50; else if (ai === 2) s += 6;
      if (me === 3) s -= 60; else if (me === 2) s -= 6;
    }
    for (let r = 0; r < R; r++) { if (b[r * C + 3] === 2) s += 4; else if (b[r * C + 3] === 1) s -= 4; }
    return s;
  }
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  function search(b, depth, alpha, beta, who) {
    const w = winner(b);
    if (w) return w.v === 2 ? 100000 + depth : -100000 - depth;
    if (!depth || b.every(Boolean)) return evaluate(b);
    let best = who === 2 ? -Infinity : Infinity;
    for (const c of ORDER) {
      const i = drop(b, c);
      if (i < 0) continue;
      b[i] = who;
      const v = search(b, depth - 1, alpha, beta, 3 - who);
      b[i] = 0;
      if (who === 2) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
      else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, depth, noise = 0) {
    let best = -1, bv = -Infinity;
    for (const c of ORDER) {
      const i = drop(b, c);
      if (i < 0) continue;
      b[i] = 2;
      const v = search(b, depth - 1, -Infinity, Infinity, 1) + (Math.random() - 0.5) * noise;
      b[i] = 0;
      if (v > bv) { bv = v; best = c; }
    }
    return best;
  }
  const api = { C, R, LINES, drop, winner, evaluate, search, bestMove, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Connect4;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "czworki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, depth: 2, noise: 60 },
    { key: "medium", name: "Średni", points: 25, depth: 4, noise: 8 },
    { key: "hard", name: "Trudny", points: 50, depth: 8, noise: 0 },
  ],
  rules: [
    "Wrzucaj krążki do kolumn na zmianę z komputerem. Krążek spada na najniższe wolne pole.",
    "Wygrywa ten, kto pierwszy ułoży cztery swoje krążki w linii: poziomo, pionowo albo na ukos.",
    "Kliknij kolumnę albo naciśnij klawisz 1–7. Zaczynasz ty. Remis, gdy plansza się zapełni.",
  ],
  mount(board, ctx) {
    const { C, R } = Connect4;
    const b = new Array(C * R).fill(0);
    Connect4.last = { b };
    let thinking = false, hover = -1;
    board.classList.add("c4");
    board.style.setProperty("--cols", C + 0.6);
    board.style.setProperty("--rows", R + 1.4);
    const ghost = el("div", "c4-ghost");
    const grid = el("div", "c4-grid");
    const holes = b.map((_, i) => { const d = el("div", "c4-hole"); d.dataset.c = i % C; grid.append(d); return d; });
    board.append(ghost, grid);
    const turnEl = el("p", "turn");
    ctx.panel.append(panelBlock("Ruch", turnEl));
    const save = ctx.undoable((s) => { s.forEach((v, i) => (b[i] = v)); render(); });

    function place(c, who) {
      const i = Connect4.drop(b, c);
      if (i < 0) return false;
      b[i] = who;
      const disc = holes[i];
      disc.style.setProperty("--fall", ((i / C) | 0) + 1);
      disc.classList.remove("drop");
      void disc.offsetWidth;
      disc.classList.add("drop");
      Sound.place(who === 1 ? 4 : 2);
      render();
      return true;
    }
    function check() {
      const w = Connect4.winner(b);
      if (w) {
        w.line.forEach((i) => holes[i].classList.add("win"));
        if (w.v === 1) ctx.win("Cztery w linii!");
        else ctx.lose("Komputer wygrał", "Cztery krążki komputera w linii.");
        return true;
      }
      if (b.every(Boolean)) { ctx.lose("Remis", "Plansza pełna, nikt nie ułożył czwórki."); return true; }
      return false;
    }
    function play(c) {
      if (ctx.done || thinking || Connect4.drop(b, c) < 0) return;
      save(b.slice());
      place(c, 1);
      if (check()) return;
      thinking = true;
      render();
      // chwila „namysłu”, żeby ruch komputera był widoczny
      const t = setTimeout(() => {
        place(Connect4.bestMove(b, ctx.level.depth, ctx.level.noise), 2);
        thinking = false;
        render();
        check();
      }, 380);
      ctx.onStop(() => clearTimeout(t));
    }
    grid.addEventListener("click", (e) => { const h = e.target.closest(".c4-hole"); if (h) play(+h.dataset.c); });
    grid.addEventListener("pointermove", (e) => { const h = e.target.closest(".c4-hole"); hover = h ? +h.dataset.c : -1; render(); });
    grid.addEventListener("pointerleave", () => { hover = -1; render(); });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      if (/^[1-7]$/.test(e.key)) { e.preventDefault(); play(+e.key - 1); }
    });

    function render() {
      holes.forEach((d, i) => {
        d.dataset.v = b[i];
        d.classList.toggle("col", (i % C) === hover && !thinking && !ctx.done);
      });
      ghost.style.setProperty("--gc", hover);
      ghost.classList.toggle("on", hover >= 0 && !thinking && !ctx.done && Connect4.drop(b, hover) >= 0);
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Komputer myśli…" : "Twój ruch");
      ctx.progress(b.filter(Boolean).length / b.length);
    }
    render();
  },
});
