// Reversi: postaw pion tak, by zamknąć linię pionów rywala między swoimi; zamknięte piony zmieniają kolor.
// b[i] dla i = r * 8 + c: 0 puste, 1 gracz (ciemne), 2 komputer (jasne). Kto nie ma ruchu, pauzuje.
const Reversi = (() => {
  const N = 8;
  const STEPS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  // piony rywala zamknięte przez postawienie piona `who` na polu i
  const flips = (b, i, who) => {
    if (b[i]) return [];
    const out = [], r = (i / N) | 0, c = i % N;
    for (const [sr, sc] of STEPS) {
      const line = [];
      for (let rr = r + sr, cc = c + sc; ; rr += sr, cc += sc) {
        if (rr < 0 || rr >= N || cc < 0 || cc >= N) { line.length = 0; break; }
        const v = b[rr * N + cc];
        if (v === 3 - who) line.push(rr * N + cc);
        else { if (v !== who) line.length = 0; break; }
      }
      out.push(...line);
    }
    return out;
  };
  const moves = (b, who) => b.map((_, i) => i).filter((i) => flips(b, i, who).length);
  function play(b, i, who) { const f = flips(b, i, who); b[i] = who; f.forEach((j) => (b[j] = who)); return f; }
  const WEIGHTS = [
    100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10, 5, -2, 1, 0, 0, 1, -2, 5,
    5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2, -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100,
  ];
  function evaluate(b) {
    let s = 0;
    for (let i = 0; i < 64; i++) s += b[i] === 2 ? WEIGHTS[i] : b[i] === 1 ? -WEIGHTS[i] : 0;
    return s + (moves(b, 2).length - moves(b, 1).length) * 5;
  }
  function search(b, depth, alpha, beta, who) {
    const my = moves(b, who);
    if (!depth || (!my.length && !moves(b, 3 - who).length)) {
      if (!my.length && !moves(b, 3 - who).length) {
        const d = b.filter((v) => v === 2).length - b.filter((v) => v === 1).length;
        return d * 1000;
      }
      return evaluate(b);
    }
    if (!my.length) return search(b, depth - 1, alpha, beta, 3 - who);
    let best = who === 2 ? -Infinity : Infinity;
    // najpierw pola o najwyższej wadze: szybsze odcięcia
    my.sort((x, y) => WEIGHTS[y] - WEIGHTS[x]);
    for (const i of my) {
      const nb = b.slice();
      play(nb, i, who);
      const v = search(nb, depth - 1, alpha, beta, 3 - who);
      if (who === 2) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(b, level) {
    const my = moves(b, 2);
    if (!my.length) return -1;
    if (level === 0) return my.sort((x, y) => flips(b, y, 2).length - flips(b, x, 2).length + (Math.random() - 0.5) * 3)[0];
    let best = my[0], bv = -Infinity;
    for (const i of my) {
      const nb = b.slice();
      play(nb, i, 2);
      const v = search(nb, level === 1 ? 1 : 3, -Infinity, Infinity, 1) + Math.random();
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }
  const start = () => { const b = new Array(64).fill(0); b[27] = b[36] = 2; b[28] = b[35] = 1; return b; };
  const api = { N, flips, moves, play, evaluate, search, bestMove, start, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Reversi;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "reversi"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, ai: 0 },
    { key: "medium", name: "Średni", points: 25, ai: 1 },
    { key: "hard", name: "Trudny", points: 50, ai: 2 },
  ],
  rules: [
    "Postaw pion tak, by między nim a twoim innym pionem znalazła się linia pionów komputera, poziomo, pionowo albo na ukos. Zamknięte piony stają się twoje.",
    "Ruch musi przejąć choć jeden pion. Kto nie ma ruchu, traci kolejkę. Gra kończy się, gdy nikt nie może się ruszyć.",
    "Wygrywa ten, kto ma więcej pionów. Narożniki są najcenniejsze, bo nie da się ich odebrać. Kropki pokazują możliwe ruchy.",
  ],
  achievements: [
    { id: "przewaga", name: "Miażdżąca przewaga", desc: "Wygraj z przewagą co najmniej 10 pionów.", points: 10 },
    { id: "bez-cofania", name: "Bez odwrotu", desc: "Pokonaj komputer na średnim poziomie bez cofania ruchu.", points: 25 },
    { id: "mistrz-reversi", name: "Mistrz reversi", desc: "Pokonaj komputer na trudnym poziomie bez cofania ruchu.", points: 50 },
  ],
  mount(board, ctx) {
    const b = Reversi.start();
    Reversi.last = { b };
    let thinking = false;
    const cells = gridCells(board, 8, 8, "rv", { gap: 0.05 });
    board.style.setProperty("--max", "80px");
    cells.forEach((d) => d.append(el("span", "rv-disc")));
    const turnEl = el("p", "turn");
    const countEl = el("div", "rv-count");
    ctx.panel.append(panelBlock("Ruch", turnEl), panelBlock("Piony", countEl));
    const save = ctx.undoable((s) => { s.forEach((v, i) => (b[i] = v)); render(); });
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

    function flipAnim(list, from) {
      list.forEach((j) => {
        const d = Math.abs(((j / 8) | 0) - ((from / 8) | 0)) + Math.abs((j % 8) - (from % 8));
        cells[j].style.setProperty("--fd", `${d * 60}ms`);
        replay(cells[j], "flip");
      });
      replay(cells[from], "put");
    }
    function end() {
      const me = b.filter((v) => v === 1).length, ai = b.filter((v) => v === 2).length;
      if (me > ai) {
        if (me - ai >= 10) ctx.achieve("przewaga");
        if (ctx.undos === 0 && ctx.level.key === "medium") ctx.achieve("bez-cofania");
        if (ctx.undos === 0 && ctx.level.key === "hard") ctx.achieve("mistrz-reversi");
      }
      if (me > ai) ctx.win(`${me} : ${ai}`);
      else ctx.lose(me === ai ? "Remis" : "Komputer wygrał", `${me} : ${ai}`);
    }
    function aiTurn() {
      if (ctx.done) return;
      if (!Reversi.moves(b, 2).length) {
        thinking = false;
        if (!Reversi.moves(b, 1).length) return end();
        ctx.toast("Komputer nie ma ruchu, grasz dalej");
        return render();
      }
      thinking = true;
      render();
      wait(() => {
        const i = Reversi.bestMove(b, ctx.level.ai);
        const f = Reversi.play(b, i, 2);
        flipAnim(f, i);
        Sound.place(3);
        thinking = false;
        render();
        if (!Reversi.moves(b, 1).length) {
          if (!Reversi.moves(b, 2).length) return end();
          ctx.toast("Nie masz ruchu, kolej komputera");
          wait(aiTurn, 700);
        }
      }, 450);
    }
    function move(i) {
      if (ctx.done || thinking) return;
      if (!Reversi.flips(b, i, 1).length) { replay(cells[i], "shake"); return Sound.error(); }
      save(b.slice());
      const f = Reversi.play(b, i, 1);
      flipAnim(f, i);
      Sound.place(6);
      render();
      if (!Reversi.moves(b, 1).length && !Reversi.moves(b, 2).length) return end();
      aiTurn();
    }
    board.addEventListener("click", (e) => { const d = e.target.closest(".gb-cell"); if (d) move(+d.dataset.i); });
    let cur = 19;
    cellKeys(ctx, { cols: 8, rows: 8, get: () => cur, set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); }, keys: { " ": () => move(cur), enter: () => move(cur) } });

    function render() {
      const legal = new Set(thinking || ctx.done ? [] : Reversi.moves(b, 1));
      cells.forEach((d, i) => { d.dataset.v = b[i]; d.classList.toggle("legal", legal.has(i)); });
      const me = b.filter((v) => v === 1).length, ai = b.filter((v) => v === 2).length;
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Komputer myśli…" : "Twój ruch");
      countEl.replaceChildren(el("span", "rv-me", me), el("span", "rv-ai", ai));
      ctx.progress((me + ai - 4) / 60);
    }
    render();
  },
});
