// Pięć w rzędzie (gomoku): krzyżyki (gracz) i kółka (komputer) na planszy n × n. Pięć lub więcej w linii wygrywa.
// Komputer ocenia każde wolne pole: ile daje jemu (atak) i ile odbiera graczowi (obrona), według długości i otwartości linii.
const Gomoku = (() => {
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  function lineAt(b, n, i, p, dr, dc) {
    const r = (i / n) | 0, c = i % n;
    let len = 1, open = 0;
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = c + dc * s;
      while (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc] === p) { len++; rr += dr * s; cc += dc * s; }
      if (rr >= 0 && rr < n && cc >= 0 && cc < n && !b[rr * n + cc]) open++;
    }
    return [len, open];
  }
  const VALUE = (len, open) => (len >= 5 ? 1e6 : !open ? 0 : len === 4 ? (open === 2 ? 50000 : 6000) : len === 3 ? (open === 2 ? 5000 : 400) : len === 2 ? (open === 2 ? 300 : 40) : open === 2 ? 10 : 2);
  // wartość postawienia kamienia p na pustym polu i
  function score(b, n, i, p) {
    b[i] = p;
    let s = 0, threes = 0;
    for (const [dr, dc] of DIRS) {
      const [len, open] = lineAt(b, n, i, p, dr, dc);
      s += VALUE(len, open);
      if ((len === 3 && open === 2) || len === 4) threes++;
    }
    b[i] = 0;
    // dwa zagrożenia naraz są prawie nie do obrony
    return threes >= 2 ? s + 20000 : s;
  }
  function winLine(b, n, i) {
    const p = b[i];
    for (const [dr, dc] of DIRS) {
      const cells = [i];
      const r = (i / n) | 0, c = i % n;
      for (const s of [1, -1]) for (let k = 1; ; k++) {
        const rr = r + dr * s * k, cc = c + dc * s * k;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n || b[rr * n + cc] !== p) break;
        cells.push(rr * n + cc);
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }
  function bestMove(b, n, attack, defend, noise) {
    let best = -1, bv = -Infinity;
    const any = b.some(Boolean);
    for (let i = 0; i < n * n; i++) {
      if (b[i]) continue;
      // tylko pola w pobliżu kamieni (pierwszy ruch: środek)
      const r = (i / n) | 0, c = i % n;
      let near = !any && r === (n >> 1) && c === (n >> 1);
      for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2 && !near; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr * n + cc]) near = true;
      }
      if (!near) continue;
      const v = score(b, n, i, 2) * attack + score(b, n, i, 1) * defend + Math.random() * noise;
      if (v > bv) { bv = v; best = i; }
    }
    return best;
  }
  const api = { DIRS, lineAt, score, winLine, bestMove, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Gomoku;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "gomoku"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, n: 11, attack: 1, defend: 0.55, noise: 300 },
    { key: "medium", name: "Średni", points: 25, n: 13, attack: 1.05, defend: 0.9, noise: 40 },
    { key: "hard", name: "Trudny", points: 50, n: 15, attack: 1.15, defend: 1, noise: 2 },
  ],
  rules: [
    "Stawiaj krzyżyki na zmianę z komputerem, który stawia kółka. Zaczynasz ty.",
    "Wygrywa ten, kto pierwszy ułoży pięć swoich znaków w linii: poziomo, pionowo albo na ukos.",
    "Pilnuj otwartych trójek komputera, czyli trzech znaków z wolnymi końcami: jeśli ich nie zablokujesz, zrobią się z nich czwórki nie do zatrzymania.",
  ],
  mount(board, ctx) {
    const { n } = ctx.level;
    const b = new Array(n * n).fill(0);
    Gomoku.last = { b, n };
    let thinking = false, lastMove = -1;
    const cells = gridCells(board, n, n, "gk", { gap: 0 });
    board.style.setProperty("--max", "52px");
    // margines planszy (pół pola z każdej strony) liczy się do jej rozmiaru
    board.style.setProperty("--cols", n + 1);
    board.style.setProperty("--rows", n + 1);
    // punkty orientacyjne jak na prawdziwej planszy
    const stars = [3, (n / 2) | 0, n - 4];
    for (const r of stars) for (const c of stars) cells[r * n + c].classList.add("star");
    const turnEl = el("p", "turn");
    ctx.panel.append(panelBlock("Ruch", turnEl));
    const save = ctx.undoable(([s, l]) => { s.forEach((v, i) => (b[i] = v)); lastMove = l; render(); });
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

    function put(i, p) {
      b[i] = p;
      lastMove = i;
      replay(cells[i], "pop");
      Sound.place(p === 1 ? 5 : 2);
      const line = Gomoku.winLine(b, n, i);
      render();
      if (line) {
        line.forEach((j) => cells[j].classList.add("win"));
        p === 1 ? ctx.win("Pięć w rzędzie!") : ctx.lose("Komputer wygrał", "Komputer ułożył pięć w linii.");
        return true;
      }
      if (b.every(Boolean)) { ctx.lose("Remis", "Plansza się zapełniła."); return true; }
      return false;
    }
    function play(i) {
      if (ctx.done || thinking || b[i]) return;
      save([b.slice(), lastMove]);
      if (put(i, 1)) return;
      thinking = true;
      render();
      wait(() => {
        const { attack, defend, noise } = ctx.level;
        thinking = false;
        put(Gomoku.bestMove(b, n, attack, defend, noise), 2);
      }, 300);
    }
    board.addEventListener("click", (e) => { const d = e.target.closest(".gb-cell"); if (d) play(+d.dataset.i); });
    let cur = ((n / 2) | 0) * n + ((n / 2) | 0);
    cellKeys(ctx, { cols: n, rows: n, get: () => cur, set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); }, keys: { " ": () => play(cur), enter: () => play(cur) } });

    function render() {
      cells.forEach((d, i) => {
        d.dataset.v = b[i];
        d.classList.toggle("last", i === lastMove);
        d.classList.toggle("edge-t", i < n);
        d.classList.toggle("edge-b", i >= n * (n - 1));
        d.classList.toggle("edge-l", i % n === 0);
        d.classList.toggle("edge-r", i % n === n - 1);
      });
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Komputer myśli…" : "Twój ruch");
      ctx.progress(Math.min(0.9, b.filter(Boolean).length / 40));
    }
    render();
  },
});
