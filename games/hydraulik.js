// Hydraulik: każdy kafel to kawałek rury; obracaj je, aż woda ze źródła dotrze wszędzie.
// Połączenia jako bity: 1 góra, 2 prawo, 4 dół, 8 lewo. Rozwiązanie to losowe drzewo rozpinające siatki n × n.
const Pipes = (() => {
  const DIR = [[1, -1, 0], [2, 0, 1], [4, 1, 0], [8, 0, -1]]; // bit, dr, dc
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };
  const rot = (m, k) => {
    for (let t = 0; t < ((k % 4) + 4) % 4; t++) m = ((m << 1) | (m >> 3)) & 15;
    return m;
  };

  function tree(n) {
    for (;;) {
      const mask = new Uint8Array(n * n), seen = new Uint8Array(n * n);
      const src = ((n / 2) | 0) * n + ((n / 2) | 0);
      seen[src] = 1;
      // losowy Prim: krawędzie z odwiedzonych pól do nowych
      const front = [];
      const add = (i) => {
        const r = (i / n) | 0, c = i % n;
        for (const [b, dr, dc] of DIR) {
          const a = r + dr, d = c + dc;
          if (a >= 0 && a < n && d >= 0 && d < n && !seen[a * n + d]) front.push([i, a * n + d, b]);
        }
      };
      add(src);
      let count = 1;
      while (front.length) {
        const [i, j, b] = front.splice(rnd(front.length), 1)[0];
        // bez skrzyżowań czteroramiennych, żeby kafle były czytelne
        if (seen[j] || (mask[i] | b) === 15) continue;
        seen[j] = 1;
        count++;
        mask[i] |= b;
        mask[j] |= OPP[b];
        add(j);
      }
      if (count === n * n) return { mask, src };
    }
  }

  // pola zasilone ze źródła (połączenia muszą pasować z obu stron)
  function flow(cur, n, src) {
    const on = new Uint8Array(n * n), stack = [src];
    on[src] = 1;
    while (stack.length) {
      const i = stack.pop(), r = (i / n) | 0, c = i % n;
      for (const [b, dr, dc] of DIR) {
        if (!(cur[i] & b)) continue;
        const a = r + dr, d = c + dc;
        if (a < 0 || a >= n || d < 0 || d >= n) continue;
        const j = a * n + d;
        if (!on[j] && cur[j] & OPP[b]) { on[j] = 1; stack.push(j); }
      }
    }
    return on;
  }

  function generate(n) {
    const { mask, src } = tree(n);
    const turns = Array.from({ length: n * n }, () => rnd(4));
    const cur = Array.from(mask, (m, i) => rot(m, turns[i]));
    if (flow(cur, n, src).every(Boolean)) return generate(n);
    return (api.last = { n, src, base: Array.from(mask), turns });
  }

  const api = { DIR, OPP, rot, tree, flow, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Pipes;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "hydraulik"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, n: 5 },
    { key: "medium", name: "7 × 7", points: 25, n: 7 },
    { key: "hard", name: "9 × 9", points: 50, n: 9 },
  ],
  rules: [
    "Obracaj kafle z rurami, aż woda ze źródła na środku dotrze do każdego kafla.",
    "Kliknięcie obraca kafel w prawo, prawy przycisk w lewo. Na klawiaturze: strzałki wybierają kafel, spacja obraca, L blokuje.",
    "Kafel, którego ustawienia jesteś pewien, zablokuj w trybie „Blokuj” albo klawiszem L, żeby go przypadkiem nie obrócić.",
  ],
  mount(board, ctx) {
    const { n, src, base } = Pipes.generate(ctx.level.n);
    const turns = Pipes.last.turns.slice();
    const locked = new Uint8Array(n * n);
    let moves = 0, cur = 0;
    const cells = gridCells(board, n, n, "pp", { gap: 0.04 });
    board.style.setProperty("--max", "86px");
    const NS = "http://www.w3.org/2000/svg";
    const pipes = base.map((m, i) => {
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 10 10");
      svg.setAttribute("class", "pp-svg");
      svg.setAttribute("aria-hidden", "true");
      const arms = [[1, "M5 5V-0.5"], [2, "M5 5H10.5"], [4, "M5 5V10.5"], [8, "M5 5H-0.5"]].filter(([b]) => m & b);
      const d = arms.map(([, p]) => p).join("");
      const path = (cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); p.setAttribute("class", cls); return p; };
      svg.append(path("pp-wall"), path("pp-water"));
      const hub = document.createElementNS(NS, "circle");
      hub.setAttribute("cx", 5); hub.setAttribute("cy", 5);
      hub.setAttribute("r", i === src ? 3 : arms.length === 1 ? 2.1 : 1.55);
      hub.setAttribute("class", i === src ? "pp-src" : arms.length === 1 ? "pp-end" : "pp-hub");
      svg.append(hub);
      cells[i].append(svg);
      return svg;
    });
    cells[src].classList.add("source");
    const movesEl = statBlock(ctx, "Obroty", { small: true });
    const litEl = statBlock(ctx, "Z wodą", { meter: true });
    const save = ctx.undoable(([t, l, m]) => { t.forEach((v, i) => (turns[i] = v)); locked.set(l); moves = m; render(); });

    const turn = (i, k) => {
      if (ctx.done) return;
      if (locked[i]) { replay(cells[i], "shake"); return Sound.error(); }
      save([turns.slice(), locked.slice(), moves]);
      turns[i] += k;
      moves++;
      const before = Pipes.flow(base.map((m, j) => Pipes.rot(m, turns[j] - (j === i ? k : 0))), n, src);
      const on = render();
      if (on.every(Boolean)) return ctx.win();
      const gained = on.reduce((s, v, j) => s + (v && !before[j]), 0);
      if (gained) { Sound.place(Math.min(9, 1 + gained)); [...on.keys()].filter((j) => on[j] && !before[j]).forEach((j) => replay(cells[j], "fill")); }
      else Sound.tap();
    };
    const lock = (i) => {
      if (ctx.done) return;
      save([turns.slice(), locked.slice(), moves]);
      locked[i] ^= 1;
      Sound.flag();
      render();
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    let lockMode = false;
    const mode = segmented("Tryb", ["Obracaj", "Blokuj"], (k) => { lockMode = k === 1; mode.set(k); });
    mode.set(0);
    ctx.panel.append(panelBlock("", mode.el));
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (!b) return;
      cur = +b.dataset.i;
      if (lockMode) return lock(cur);
      turn(cur, e.button === 2 ? -1 : 1);
    });
    cellKeys(ctx, {
      cols: n, rows: n,
      get: () => cur,
      set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => turn(cur, 1), enter: () => turn(cur, 1), q: () => turn(cur, -1), e: () => turn(cur, 1), l: () => lock(cur) },
    });

    function render() {
      const now = base.map((m, i) => Pipes.rot(m, turns[i]));
      const on = Pipes.flow(now, n, src);
      cells.forEach((b, i) => {
        pipes[i].style.transform = `rotate(${turns[i] * 90}deg)`;
        b.classList.toggle("on", !!on[i]);
        b.classList.toggle("locked", !!locked[i]);
      });
      const k = on.reduce((s, v) => s + v, 0);
      movesEl.set(moves);
      litEl.set(`${k} / ${n * n}`, k / (n * n));
      ctx.progress(k / (n * n));
      return on;
    }
    render();
  },
});
