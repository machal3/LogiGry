// Światła (Lights Out): kliknięcie przełącza pole i jego czterech sąsiadów. Cel: zgasić wszystkie.
// Plansza: lit[i] = 1 gdy pole świeci (wierszami, n×n).
const Lights = (() => {
  function press(lit, n, i) {
    const r = (i / n) | 0, c = i % n;
    const out = [i];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    out.forEach((j) => (lit[j] ^= 1));
    return out;
  }

  // Najkrótsze rozwiązanie: układ równań nad GF(2), potem przegląd wolnych zmiennych (dla 5×5 są dwie).
  function solve(lit, n) {
    const N = n * n;
    const rows = Array.from({ length: N }, (_, i) => {
      const row = new Uint8Array(N + 1);
      press(row, n, i);
      row[N] = lit[i];
      return row;
    });
    const pivots = [];
    let r = 0;
    for (let c = 0; c < N && r < N; c++) {
      const p = rows.findIndex((row, k) => k >= r && row[c]);
      if (p < 0) continue;
      [rows[r], rows[p]] = [rows[p], rows[r]];
      for (let k = 0; k < N; k++) if (k !== r && rows[k][c]) for (let j = c; j <= N; j++) rows[k][j] ^= rows[r][j];
      pivots.push(c);
      r++;
    }
    if (rows.slice(r).some((row) => row[N])) return null;
    const free = [...Array(N).keys()].filter((c) => !pivots.includes(c));
    let best = null;
    for (let m = 0; m < 1 << free.length; m++) {
      const x = new Uint8Array(N);
      free.forEach((c, k) => (x[c] = (m >> k) & 1));
      pivots.forEach((c, k) => {
        let v = rows[k][N];
        for (const f of free) v ^= rows[k][f] & x[f];
        x[c] = v;
      });
      if (!best || x.reduce((s, v) => s + v, 0) < best.reduce((s, v) => s + v, 0)) best = x;
    }
    return best;
  }

  // Plansza z losowych kliknięć, więc zawsze da się ją zgasić; najkrótsza droga ma co najmniej `minMoves` ruchów.
  function generate(n, minMoves) {
    for (;;) {
      const lit = new Uint8Array(n * n);
      for (let k = 0; k < minMoves + 3; k++) press(lit, n, Math.floor(Math.random() * n * n));
      const sol = solve(lit, n);
      const moves = sol.reduce((s, v) => s + v, 0);
      if (moves >= minMoves) return (api.last = { n, lit, solution: sol, moves });
    }
  }

  const api = { press, solve, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Lights;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "swiatla"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, size: 5, min: 6, slack: 4 },
    { key: "medium", name: "6 × 6", points: 25, size: 6, min: 10, slack: 2 },
    { key: "hard", name: "7 × 7", points: 50, size: 7, min: 15, slack: 0 },
  ],
  rules: [
    "Zgaś wszystkie światła.",
    "Kliknięcie przełącza pole i jego czterech sąsiadów: zapalone gasną, zgaszone się zapalają.",
    "Kolejność kliknięć nie ma znaczenia, a dwa kliknięcia w to samo pole się znoszą, więc każde pole klikasz najwyżej raz.",
    "Liczba ruchów jest ograniczona. Na trudnym poziomie masz ich dokładnie tyle, ile wymaga najkrótsze rozwiązanie, więc każdy ruch trzeba przemyśleć. Po wyczerpaniu limitu cofnij ruchy.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Pewny włącznik", desc: "Zgaś planszę bez cofania ruchu.", points: 10 },
    { id: "najkrotsza", name: "Najkrótsza droga", desc: "Zgaś planszę 5 × 5 lub 6 × 6 w najmniejszej możliwej liczbie ruchów.", points: 25 },
    { id: "mistrz-swiatel", name: "Mistrz świateł", desc: "Zgaś planszę 7 × 7 bez cofania ruchu.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, lit, moves: best } = Lights.generate(ctx.level.size, ctx.level.min);
    let moves = 0, sel = 0;

    board.classList.add("lo");
    board.style.setProperty("--cols", n + 0.1 * (n - 1));
    board.style.setProperty("--rows", n + 0.1 * (n - 1));
    board.style.setProperty("--n", n);
    const cells = Array.from({ length: n * n }, (_, i) => {
      const b = button("", "cell lo-cell");
      b.dataset.i = i;
      b.style.setProperty("--k", ((i / n) | 0) + (i % n));
      b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}`);
      board.append(b);
      return b;
    });

    const movesEl = el("p", "panel-big", "0");
    const limit = best + ctx.level.slack;
    const few = (k) => k % 10 >= 2 && k % 10 <= 4 && (k % 100 < 12 || k % 100 > 14);
    const bestEl = el("p", "", ctx.level.slack
      ? `Najkrótsze rozwiązanie: ${best} ${few(best) ? "ruchy" : "ruchów"}. Masz zapas ${ctx.level.slack}.`
      : "Limit równa się najkrótszemu rozwiązaniu. Bez zbędnych ruchów.");
    const hint = button("Podpowiedź", "btn-ghost wide", () => {
      if (ctx.done) return;
      const sol = Lights.solve(lit, n);
      const i = sol.indexOf(1);
      if (i < 0) return;
      replay(cells[i], "hint");
      Sound.tap();
    });
    const meter = el("div", "meter");
    const meterFill = el("span");
    meter.append(meterFill);
    ctx.panel.append(panelBlock("Ruchy", movesEl, meter, bestEl), panelBlock("", hint));

    const save = ctx.undoable(([l, m]) => { l.forEach((v, i) => (lit[i] = v)); moves = m; render(); });

    // podgląd: które pola przełączy kliknięcie
    const aim = (i) => {
      const cross = i >= 0 ? Lights.press(new Uint8Array(n * n), n, i) : [];
      cells.forEach((b, j) => b.classList.toggle("aim", cross.includes(j)));
    };
    board.addEventListener("pointerover", (e) => { const b = e.target.closest(".lo-cell"); if (b) aim(+b.dataset.i); });
    board.addEventListener("pointerleave", () => aim(-1));
    board.addEventListener("focusin", (e) => { const b = e.target.closest(".lo-cell"); if (b) { sel = +b.dataset.i; aim(sel); } });
    board.addEventListener("focusout", () => aim(-1));

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".lo-cell");
      if (!b || ctx.done) return;
      const i = +b.dataset.i;
      sel = i;
      if (moves >= limit) {
        Sound.error();
        replay(movesEl, "shake");
        ctx.toast("Limit ruchów wyczerpany. Cofnij ruch albo zacznij od nowa.");
        return;
      }
      save([lit.slice(), moves]);
      moves++;
      const changed = Lights.press(lit, n, i);
      changed.forEach((j) => {
        cells[j].style.setProperty("--d", j === i ? "0ms" : "70ms");
        replay(cells[j], "flip");
      });
      const left = render();
      if (!left) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        if (moves <= best && ctx.level.key !== "hard") ctx.achieve("najkrotsza");
        if (ctx.level.key === "hard" && ctx.undos === 0) ctx.achieve("mistrz-swiatel");
        return ctx.win();
      }
      Sound.place(1 + (left % 9));
    });
    cellKeys(ctx, {
      cols: n, rows: n,
      get: () => sel,
      set: (i) => { sel = i; cells[i].focus({ preventScroll: true }); },
    });

    function render() {
      cells.forEach((b, i) => {
        b.classList.toggle("on", !!lit[i]);
        b.setAttribute("aria-pressed", String(!!lit[i]));
      });
      movesEl.textContent = `${moves} / ${limit}`;
      meterFill.style.width = `${(moves / limit) * 100}%`;
      const left = Lights.solve(lit, n).reduce((s, v) => s + v, 0);
      ctx.progress(1 - left / best);
      return lit.reduce((s, v) => s + v, 0);
    }
    render();
  },
});
