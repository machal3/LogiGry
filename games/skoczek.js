// Skoczek: obejdź skoczkiem szachowym całą planszę n × n, stając na każdym polu dokładnie raz.
const Knight = (() => {
  const JUMPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const next = (n, i, used) => {
    const r = (i / n) | 0, c = i % n;
    return JUMPS.map(([dr, dc]) => [r + dr, c + dc]).filter(([a, b]) => a >= 0 && a < n && b >= 0 && b < n && !used[a * n + b]).map(([a, b]) => a * n + b);
  };
  // reguła Warnsdorffa: skacz tam, skąd jest najmniej dalszych ruchów (remisy losowo)
  function warnsdorff(n, i, used) {
    const opts = shuffle(next(n, i, used));
    let best = -1, bestDeg = 9;
    for (const j of opts) {
      used[j] = 1;
      const d = next(n, j, used).length;
      used[j] = 0;
      if (d < bestDeg) { bestDeg = d; best = j; }
    }
    return best;
  }
  // pełna trasa z danego pola (kilka prób Warnsdorffa); null, gdy się nie uda
  function tour(n, start, tries = 60) {
    for (let t = 0; t < tries; t++) {
      const used = new Uint8Array(n * n), path = [start];
      used[start] = 1;
      while (path.length < n * n) {
        const j = warnsdorff(n, path[path.length - 1], used);
        if (j < 0) break;
        used[j] = 1;
        path.push(j);
      }
      if (path.length === n * n) return path;
    }
    return null;
  }
  const api = { JUMPS, next, warnsdorff, tour };
  return api;
})();

if (typeof module !== "undefined") module.exports = Knight;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "skoczek"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, n: 5, hints: 5, fixed: true },
    { key: "medium", name: "6 × 6", points: 25, n: 6, hints: 3 },
    { key: "hard", name: "8 × 8", points: 50, n: 8, hints: 1 },
  ],
  rules: [
    "Skoczek porusza się jak w szachach: dwa pola w jedną stronę i jedno w bok.",
    "Odwiedź każde pole planszy dokładnie raz. Zacznij od dowolnego pola (na 5 × 5 od narożnika).",
    "Dobra rada: skacz najpierw tam, skąd jest najmniej dalszych ruchów, a pola przy brzegach odwiedzaj wcześnie. Na łatwym poziomie te liczby widać na polach.",
  ],
  achievements: [
    { id: "bez-podpowiedzi", name: "Bez podpowiedzi", desc: "Obejdź planszę, nie używając podpowiedzi.", points: 10 },
    { id: "szybki-skoczek", name: "Szybki skoczek", desc: "Obejdź planszę 6 × 6 w mniej niż 3 minuty.", points: 25 },
    { id: "mistrz-skoczka", name: "Mistrz skoczka", desc: "Obejdź planszę 8 × 8 bez podpowiedzi i bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, fixed } = ctx.level;
    let path = [], hints = ctx.level.hints;
    const cells = gridCells(board, n, n, "kn", { gap: 0 });
    board.classList.toggle("helper", !!fixed);
    board.style.setProperty("--max", "84px");
    cells.forEach((b, i) => {
      if ((((i / n) | 0) + (i % n)) % 2) b.classList.add("dark");
      b.append(el("span", "kn-num"));
    });
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
    svg.setAttribute("class", "kn-svg");
    svg.setAttribute("aria-hidden", "true");
    const trail = document.createElementNS(NS, "polyline");
    trail.setAttribute("class", "kn-trail");
    svg.append(trail);
    board.append(svg);
    const piece = el("span", "kn-piece");
    piece.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 21h11v-2.2c0-3.2-1.4-5.6-3.6-7.6l1.7-1.3c.7-.6.9-1.6.4-2.4L14.6 4.4c-.4-.6-1-1-1.8-1H11L9.7 2 9 4.2C6.5 5.3 5 7.6 5 10.6v1.6l2.3.7 2.4-2.2c.4 1.3-.1 2.5-1.4 3.6C6.5 16.1 6 17.5 7 19.3z"/></svg>`;
    board.append(piece);
    const info = statBlock(ctx, "Odwiedzone", { meter: true });
    const hintBtn = button("", "btn-ghost wide", () => hint());
    ctx.panel.append(panelBlock("", hintBtn));
    const save = ctx.undoable(([p, h]) => { path = p; hints = h; render(); });

    const visit = (i) => {
      if (ctx.done) return;
      const used = new Uint8Array(n * n);
      path.forEach((j) => (used[j] = 1));
      if (!path.length) {
        if (fixed && ![0, n - 1, n * (n - 1), n * n - 1].includes(i)) { ctx.toast("Na tej planszy zacznij od narożnika"); return Sound.error(); }
      } else if (!Knight.next(n, path[path.length - 1], used).includes(i)) {
        replay(cells[i], "shake");
        return Sound.error();
      }
      save([path.slice(), hints]);
      path = [...path, i];
      used[i] = 1;
      replay(cells[i], "land");
      Sound.place(1 + (path.length % 9));
      render();
      if (path.length === n * n) {
        const clean = hints === ctx.level.hints;
        if (clean) ctx.achieve("bez-podpowiedzi");
        if (ctx.level.key === "medium" && ctx.time < 180) ctx.achieve("szybki-skoczek");
        if (clean && ctx.undos === 0 && ctx.level.key === "hard") ctx.achieve("mistrz-skoczka");
      }
      if (path.length === n * n) return ctx.win(hints === ctx.level.hints ? "Bez żadnej podpowiedzi." : "");
      if (!Knight.next(n, i, used).length) { Sound.error(); ctx.toast("Skoczek utknął. Cofnij kilka ruchów"); }
    };
    function hint() {
      if (ctx.done || !hints) return;
      const used = new Uint8Array(n * n);
      path.forEach((j) => (used[j] = 1));
      let j;
      if (!path.length) j = fixed ? 0 : rnd(n * n);
      else j = Knight.warnsdorff(n, path[path.length - 1], used);
      if (j < 0) return;
      hints--;
      replay(cells[j], "hint");
      Sound.tap();
      render();
    }
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) visit(+b.dataset.i);
    });
    let cur = 0;
    cellKeys(ctx, {
      cols: n, rows: n,
      get: () => cur,
      set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); },
      keys: { " ": () => visit(cur), enter: () => visit(cur) },
    });

    function render() {
      const used = new Uint8Array(n * n);
      path.forEach((j) => (used[j] = 1));
      const last = path[path.length - 1];
      const opts = new Set(path.length ? Knight.next(n, last, used) : fixed ? [0, n - 1, n * (n - 1), n * n - 1] : []);
      cells.forEach((b, i) => {
        const k = path.indexOf(i);
        b.querySelector(".kn-num").textContent = k >= 0 && i !== last ? k + 1 : "";
        b.classList.toggle("seen", k >= 0);
        b.classList.toggle("opt", opts.has(i));
        // ile dalszych ruchów z tego pola: mniej = pilniej
        let deg = "";
        if (opts.has(i) && path.length) { used[i] = 1; deg = Knight.next(n, i, used).length; used[i] = 0; }
        b.dataset.deg = deg;
      });
      trail.setAttribute("points", path.map((i) => `${(i % n) + 0.5},${((i / n) | 0) + 0.5}`).join(" "));
      piece.hidden = !path.length;
      if (path.length) {
        piece.style.setProperty("--r", (last / n) | 0);
        piece.style.setProperty("--c0", last % n);
      }
      hintBtn.textContent = `Podpowiedź (${hints})`;
      hintBtn.disabled = !hints;
      info.set(`${path.length} / ${n * n}`, path.length / (n * n));
      ctx.progress(path.length / (n * n));
    }
    render();
    ctx.toast(fixed ? "Zacznij od dowolnego narożnika" : "Kliknij pole, od którego zaczniesz");
  },
});
