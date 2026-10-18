// Probówki: przelewaj warstwy kolorów, aż w każdej probówce zostanie jeden kolor (albo będzie pusta).
// Probówka to tablica kolorów od dna (0..colors-1), pojemność CAP. Przelać można na pusty albo ten sam kolor.
const WaterSort = (() => {
  const CAP = 4;
  const top = (t) => t[t.length - 1];
  // ile warstw wyleje się z a do b
  function amount(a, b) {
    if (!a.length || b.length >= CAP || (b.length && top(b) !== top(a))) return 0;
    let k = 1;
    while (k < a.length && a[a.length - 1 - k] === top(a)) k++;
    return Math.min(k, CAP - b.length);
  }
  function pour(tubes, i, j) {
    const k = amount(tubes[i], tubes[j]);
    for (let t = 0; t < k; t++) tubes[j].push(tubes[i].pop());
    return k;
  }
  const done = (tubes) => tubes.every((t) => !t.length || (t.length === CAP && t.every((c) => c === t[0])));
  const id = (tubes) => tubes.map((t) => t.join(",")).sort().join("|");

  // przeszukiwanie w głąb ze zbiorem odwiedzonych stanów; zwraca listę ruchów albo null
  function solve(start, limit = 60000) {
    const seen = new Set();
    const path = [];
    let nodes = 0;
    const go = (tubes) => {
      if (done(tubes)) return true;
      if (++nodes > limit) return false;
      const key = id(tubes);
      if (seen.has(key)) return false;
      seen.add(key);
      for (let i = 0; i < tubes.length; i++) {
        const a = tubes[i];
        if (!a.length) continue;
        // jednolita probówka nie ma po co iść do pustej
        const uniform = a.every((c) => c === a[0]);
        for (let j = 0; j < tubes.length; j++) {
          if (i === j || !amount(a, tubes[j])) continue;
          if (uniform && !tubes[j].length) continue;
          const next = tubes.map((t) => t.slice());
          pour(next, i, j);
          path.push([i, j]);
          if (go(next)) return true;
          path.pop();
        }
      }
      return false;
    };
    return go(start.map((t) => t.slice())) ? path.slice() : null;
  }

  function generate(colors, empty) {
    for (;;) {
      const balls = shuffle([...Array(colors * CAP).keys()].map((k) => k % colors));
      const tubes = Array.from({ length: colors }, (_, k) => balls.slice(k * CAP, k * CAP + CAP));
      for (let e = 0; e < empty; e++) tubes.push([]);
      if (tubes.some((t) => t.length && t.every((c) => c === t[0]))) continue;
      const solution = solve(tubes);
      if (solution) return (api.last = { tubes, solution });
    }
  }

  const api = { CAP, amount, pour, done, solve, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = WaterSort;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "probowki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, colors: 4, empty: 2 },
    { key: "medium", name: "Średni", points: 25, colors: 7, empty: 2 },
    { key: "hard", name: "Trudny", points: 50, colors: 10, empty: 2 },
  ],
  rules: [
    "Przelewaj kolory, aż każda probówka będzie wypełniona jednym kolorem albo pusta.",
    "Kliknij probówkę, z której chcesz przelać, a potem docelową. Przelać można tylko do pustej albo na taki sam kolor na wierzchu, o ile jest miejsce.",
    "Przelewa się cała górna warstwa jednego koloru, ile się zmieści. Cofanie ruchów jest bez limitu.",
  ],
  mount(board, ctx) {
    const { CAP } = WaterSort;
    const COLORS = ["#e03131", "#1c7ed6", "#f59f00", "#2f9e44", "#ae3ec9", "#0c8599", "#f06595", "#e8590c", "#82c91e", "#364fc7"];
    let tubes = WaterSort.generate(ctx.level.colors, ctx.level.empty).tubes.map((t) => t.slice());
    let sel = -1, moves = 0;
    board.classList.add("ws");
    const per = Math.min(tubes.length, 7);
    const rowsN = Math.ceil(tubes.length / per);
    board.style.setProperty("--per", per);
    board.style.setProperty("--cols", per * 1.25);
    board.style.setProperty("--rows", rowsN * 4.4);
    const els = tubes.map((_, i) => {
      const b = button("", "ws-tube");
      b.dataset.i = i;
      b.setAttribute("aria-label", `Probówka ${i + 1}`);
      for (let k = 0; k < CAP; k++) b.append(el("span", "ws-layer"));
      board.append(b);
      return b;
    });
    const movesEl = statBlock(ctx, "Ruchy", {});
    const doneEl = statBlock(ctx, "Ułożone kolory", { meter: true, small: true });
    const save = ctx.undoable(([t, m]) => { tubes = t; moves = m; sel = -1; render(); });

    const choose = (i) => {
      if (ctx.done) return;
      if (sel < 0) {
        if (!tubes[i].length) return Sound.error();
        sel = i;
        Sound.tap();
        return render();
      }
      if (sel === i) { sel = -1; return render(); }
      const before = tubes.map((t) => t.slice());
      const k = WaterSort.amount(tubes[sel], tubes[i]);
      if (!k) {
        replay(els[i], "shake");
        Sound.error();
        // klik w inną probówkę bez możliwego ruchu: zaznaczamy ją zamiast poprzedniej
        sel = tubes[i].length ? i : -1;
        return render();
      }
      save([before, moves]);
      WaterSort.pour(tubes, sel, i);
      moves++;
      const from = sel;
      sel = -1;
      els[i].style.setProperty("--pour", k);
      replay(els[from], "tilt");
      const full = tubes[i].length === CAP && tubes[i].every((c) => c === tubes[i][0]);
      if (full) { Sound.line(); replay(els[i], "corked"); } else Sound.place(1 + (tubes[i][0] % 9));
      render(i, k);
      if (WaterSort.done(tubes)) ctx.win();
      else if (!tubes.some((a, x) => tubes.some((b, y) => x !== y && WaterSort.amount(a, b)))) ctx.toast("Brak ruchów. Cofnij kilka ruchów");
    };
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".ws-tube");
      if (b) choose(+b.dataset.i);
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      const d = e.key === "0" ? 10 : +e.key;
      if (d >= 1 && d <= tubes.length && /^[0-9]$/.test(e.key)) { e.preventDefault(); choose(d - 1); }
    });

    // fresh/k: probówka, do której właśnie dolano k warstw (te warstwy wpadają z animacją)
    function render(fresh = -1, k = 0) {
      tubes.forEach((t, i) => {
        const layers = els[i].children;
        for (let s = 0; s < CAP; s++) {
          const L = layers[s];
          L.style.setProperty("--wc", s < t.length ? COLORS[t[s]] : "transparent");
          L.classList.toggle("full", s < t.length);
          L.classList.toggle("in", i === fresh && s >= t.length - k && s < t.length);
        }
        const solved = t.length === CAP && t.every((c) => c === t[0]);
        els[i].classList.toggle("sel", i === sel);
        els[i].classList.toggle("solved", solved);
      });
      const solved = tubes.filter((t) => t.length === CAP && t.every((c) => c === t[0])).length;
      movesEl.set(moves);
      doneEl.set(`${solved} / ${ctx.level.colors}`, solved / ctx.level.colors);
      ctx.progress(solved / ctx.level.colors);
    }
    render();
  },
});
