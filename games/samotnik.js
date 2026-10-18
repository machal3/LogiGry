// Samotnik: pionek przeskakuje sąsiada na wolne pole za nim, a przeskoczony znika. Ma zostać jeden pionek.
// Plansza angielska: krzyż 7 × 7 (33 pola). peg[i] = 1 dla pionka; poza krzyżem pola nie istnieją.
const PegSolitaire = (() => {
  const N = 7;
  const inside = (r, c) => r >= 0 && r < N && c >= 0 && c < N && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
  const HOLES = [...Array(N * N).keys()].filter((i) => inside((i / N) | 0, i % N));
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // możliwe skoki: [skąd, przez, dokąd]
  function jumps(peg) {
    const out = [];
    for (const i of HOLES) {
      if (!peg[i]) continue;
      const r = (i / N) | 0, c = i % N;
      for (const [dr, dc] of DIRS) {
        if (!inside(r + 2 * dr, c + 2 * dc)) continue;
        const over = (r + dr) * N + c + dc, to = (r + 2 * dr) * N + c + 2 * dc;
        if (peg[over] && !peg[to]) out.push([i, over, to]);
      }
    }
    return out;
  }

  // Od jednego pionka wstecz: pionek w `to` cofa skok, zostawiając pionki w `from` i `over`.
  function generate(pegs) {
    if (pegs >= 32) {
      const peg = new Uint8Array(N * N);
      HOLES.forEach((i) => (peg[i] = 1));
      peg[3 * N + 3] = 0;
      return (api.last = { peg, solution: solve(peg) });
    }
    for (;;) {
      const peg = new Uint8Array(N * N);
      peg[pick(HOLES)] = 1;
      const back = [];
      for (let t = 0; t < 400 && back.length < pegs - 1; t++) {
        const opts = [];
        for (const to of HOLES) {
          if (!peg[to]) continue;
          const r = (to / N) | 0, c = to % N;
          for (const [dr, dc] of DIRS) {
            if (!inside(r + 2 * dr, c + 2 * dc)) continue;
            const over = (r + dr) * N + c + dc, from = (r + 2 * dr) * N + c + 2 * dc;
            if (!peg[over] && !peg[from]) opts.push([from, over, to]);
          }
        }
        if (!opts.length) break;
        const [from, over, to] = pick(opts);
        peg[to] = 0; peg[over] = 1; peg[from] = 1;
        back.push([from, over, to]);
      }
      if (back.length === pegs - 1) return (api.last = { peg, solution: back.reverse() });
    }
  }

  // Rozwiązanie od bieżącej pozycji (przeszukiwanie z pamięcią przegranych układów); null, gdy go nie ma albo limit minął.
  function solve(peg, cap = 300000) {
    const dead = new Set(), path = [], g = peg.slice();
    let nodes = 0;
    const go = (left) => {
      if (left === 1) return true;
      if (++nodes > cap) return false;
      const k = HOLES.map((i) => g[i]).join("");
      if (dead.has(k)) return false;
      for (const [f, o, t] of jumps(g)) {
        g[f] = 0; g[o] = 0; g[t] = 1; path.push([f, o, t]);
        if (go(left - 1)) return true;
        g[f] = 1; g[o] = 1; g[t] = 0; path.pop();
      }
      dead.add(k);
      return false;
    };
    return go(g.reduce((s, v) => s + v, 0)) ? path : null;
  }

  const api = { N, inside, HOLES, jumps, generate, solve, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = PegSolitaire;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "samotnik"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, pegs: 9 },
    { key: "medium", name: "Średni", points: 25, pegs: 16 },
    { key: "hard", name: "Pełna plansza", points: 50, pegs: 32 },
  ],
  rules: [
    "Pionek przeskakuje sąsiedni pionek w pionie albo poziomie i ląduje na wolnym polu tuż za nim. Przeskoczony pionek znika.",
    "Wygrywasz, gdy na planszy zostanie jeden pionek. Na pełnej planszy zaczyna się od pustego środka.",
    "Kliknij pionek, a potem podświetlone pole docelowe. Gdy zabraknie ruchów, cofnij kilka ostatnich.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez odwrotu", desc: "Zostaw jeden pionek bez cofania ruchu.", points: 10 },
    { id: "srodek", name: "W samym środku", desc: "Zostaw ostatni pionek na środku planszy.", points: 25 },
    { id: "mistrz-samotnika", name: "Mistrz samotnika", desc: "Na pełnej planszy zostaw ostatni pionek na środku.", points: 50 },
  ],
  mount(board, ctx) {
    const { N, HOLES } = PegSolitaire;
    const peg = PegSolitaire.generate(ctx.level.pegs).peg.slice();
    const start = peg.reduce((s, v) => s + v, 0);
    let sel = -1;
    const cells = gridCells(board, N, N, "pg", { gap: 0.1, label: null });
    board.style.setProperty("--max", "84px");
    cells.forEach((b, i) => {
      if (!HOLES.includes(i)) { b.classList.add("off"); b.disabled = true; b.tabIndex = -1; return; }
      b.append(el("span", "pg-peg"));
      b.setAttribute("aria-label", `Wiersz ${((i / N) | 0) + 1}, kolumna ${(i % N) + 1}`);
    });
    const leftEl = statBlock(ctx, "Pionki", { meter: true });
    const hint = button("Podpowiedź", "btn-ghost wide", () => {
      if (ctx.done) return;
      const path = PegSolitaire.solve(peg, 200000);
      if (!path) { Sound.error(); return ctx.toast("Z tej pozycji nie da się już wygrać. Cofnij kilka ruchów"); }
      const [f, , t] = path[0];
      sel = f;
      render();
      replay(cells[t], "hint");
      Sound.tap();
    });
    ctx.panel.append(panelBlock("", hint));
    const save = ctx.undoable(([p, s]) => { peg.set(p); sel = s; render(); });

    const choose = (i) => {
      if (ctx.done || !HOLES.includes(i)) return;
      if (peg[i]) {
        sel = sel === i ? -1 : i;
        Sound.tap();
        return render();
      }
      const jump = sel >= 0 && PegSolitaire.jumps(peg).find(([f, , t]) => f === sel && t === i);
      // kliknięcie pustego pola, do którego skacze tylko jeden pionek, wykonuje ten skok
      const only = PegSolitaire.jumps(peg).filter(([, , t]) => t === i);
      const j = jump || (only.length === 1 ? only[0] : null);
      if (!j) { replay(cells[i], "shake"); return Sound.error(); }
      save([peg.slice(), sel]);
      const [f, o, t] = j;
      peg[f] = 0; peg[o] = 0; peg[t] = 1;
      sel = -1;
      replay(cells[o], "gone");
      replay(cells[t], "land");
      const left = peg.reduce((s, v) => s + v, 0);
      Sound.place(1 + (left % 9));
      render();
      if (left === 1) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        if (peg[3 * N + 3]) ctx.achieve("srodek");
        if (peg[3 * N + 3] && ctx.level.key === "hard") ctx.achieve("mistrz-samotnika");
      }
      if (left === 1) return ctx.win(peg[3 * N + 3] ? "Ostatni pionek stoi na samym środku. Mistrzostwo." : "");
      if (!PegSolitaire.jumps(peg).length) { Sound.error(); ctx.toast(`Brak ruchów, zostało ${left}. Cofnij kilka ruchów`); }
    };
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) choose(+b.dataset.i);
    });
    let cur = 3 * N + 3;
    cellKeys(ctx, {
      cols: N, rows: N,
      get: () => cur,
      set: (i) => { cur = i; if (HOLES.includes(i)) cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => choose(cur), enter: () => choose(cur) },
    });

    function render() {
      const targets = new Set(PegSolitaire.jumps(peg).filter(([f]) => f === sel).map(([, , t]) => t));
      const movable = new Set(PegSolitaire.jumps(peg).map(([f]) => f));
      HOLES.forEach((i) => {
        cells[i].classList.toggle("on", !!peg[i]);
        cells[i].classList.toggle("sel", i === sel);
        cells[i].classList.toggle("target", targets.has(i));
        cells[i].classList.toggle("can", movable.has(i) && sel < 0);
      });
      const left = peg.reduce((s, v) => s + v, 0);
      leftEl.set(left, (start - left) / (start - 1), `Dostępne skoki: ${PegSolitaire.jumps(peg).length}`);
      ctx.progress((start - left) / (start - 1));
    }
    render();
  },
});
