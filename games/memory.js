// Pamięć: odkrywaj po dwie karty i szukaj par. Na kartach ikony gier Logigry (plus kilka dodatkowych).
const Memory = (() => {
  // talia: każdy numer motywu dwa razy, potasowana
  function deal(pairs) {
    const deck = [...Array(pairs).keys()].flatMap((k) => [k, k]);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return (api.last = { deck });
  }
  const api = { deal, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Memory;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "pamiec"), {
  levels: [
    { key: "easy", name: "4 × 4", points: 10, cols: 4, rows: 4, peek: 2000 },
    { key: "medium", name: "5 × 4", points: 25, cols: 5, rows: 4, peek: 1000 },
    { key: "hard", name: "6 × 6", points: 50, cols: 6, rows: 6, peek: 0 },
  ],
  rules: [
    "Odkrywaj po dwie karty. Takie same zostają odkryte, różne zakrywają się z powrotem.",
    "Znajdź wszystkie pary jak najszybciej. Na łatwiejszych poziomach karty pokazują się na chwilę na starcie.",
  ],
  achievements: [
    { id: "dobra-pamiec", name: "Dobra pamięć", desc: "Wygraj 4 × 4 w najwyżej 12 ruchach.", points: 10 },
    { id: "fotograficzna", name: "Pamięć fotograficzna", desc: "Wygraj 5 × 4 w najwyżej 16 ruchach.", points: 25 },
    { id: "mistrz-pamieci", name: "Mistrz pamięci", desc: "Wygraj 6 × 6 w najwyżej 36 ruchach.", points: 50 },
  ],
  mount(board, ctx) {
    const { cols, rows, peek } = ctx.level;
    const pairs = (cols * rows) / 2;
    // motywy: gry Logigry, a gdy ich zabraknie, dodatkowe symbole
    const EXTRA = [
      ["#ef8a17", ["..#..", ".###.", "#####", ".###.", "#.#.#"]],
      ["#2f9e9e", [".###.", "#...#", "#...#", "#...#", ".###."]],
      ["#b5179e", ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"]],
      ["#5c7cfa", ["..##.", ".##..", "##...", ".##..", "..##."]],
      ["#d9480f", ["#.#.#", ".....", "#.#.#", ".....", "#.#.#"]],
      ["#495057", ["#####", "#...#", "#.#.#", "#...#", "#####"]],
    ].map(([color, g]) => ({ color, ink: "#fff", glyph: g }));
    const motifs = [...GAMES, ...EXTRA].slice(0, pairs);
    const { deck } = Memory.deal(pairs);
    const matched = new Array(deck.length).fill(false);
    let open = [], moves = 0, found = 0, hideTimer = 0, locked = !!peek;

    board.classList.add("mm");
    board.style.setProperty("--cols", cols + 0.1 * (cols - 1));
    board.style.setProperty("--rows", rows + 0.1 * (rows - 1));
    board.style.setProperty("--mc", cols);
    const cards = deck.map((m, i) => {
      const b = button("", "cell mm-card");
      b.dataset.i = i;
      b.style.setProperty("--k", ((i / cols) | 0) + (i % cols));
      b.setAttribute("aria-label", `Karta ${i + 1}, zakryta`);
      const inner = el("span", "mm-inner");
      const face = el("span", "mm-face");
      paint(face, motifs[m]);
      face.append(glyph(motifs[m].glyph));
      inner.append(el("span", "mm-back"), face);
      b.append(inner);
      board.append(b);
      return b;
    });

    const pairsEl = el("p", "panel-big");
    const movesEl = el("p", "panel-stat");
    ctx.panel.append(panelBlock("Pary", pairsEl, movesEl));

    const flip = (i, up) => {
      cards[i].classList.toggle("up", up);
      cards[i].setAttribute("aria-label", up ? `Karta ${i + 1}, ${motifs[deck[i]].name || "symbol"}` : `Karta ${i + 1}, zakryta`);
    };
    const hide = () => {
      clearTimeout(hideTimer);
      open.forEach((i) => flip(i, false));
      open = [];
    };
    if (peek) {
      cards.forEach((_, i) => flip(i, true));
      ctx.toast("Zapamiętaj karty");
      const t = setTimeout(() => { cards.forEach((_, i) => flip(i, false)); locked = false; }, peek + 600);
      ctx.onStop(() => clearTimeout(t));
    }
    ctx.onStop(() => clearTimeout(hideTimer));

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".mm-card");
      if (!b || ctx.done || locked) return;
      const i = +b.dataset.i;
      if (matched[i] || open.includes(i)) return;
      if (open.length === 2) hide(); // trzecia karta od razu zakrywa nietrafioną parę
      flip(i, true);
      open.push(i);
      if (open.length < 2) return Sound.tap();
      moves++;
      const [a, c] = open;
      if (deck[a] === deck[c]) {
        matched[a] = matched[c] = true;
        open = [];
        found++;
        [a, c].forEach((j) => { cards[j].classList.add("done"); replay(cards[j], "match"); });
        render();
        if (found === pairs) {
          const k = ctx.level.key;
          if (k === "easy" && moves <= 12) ctx.achieve("dobra-pamiec");
          if (k === "medium" && moves <= 16) ctx.achieve("fotograficzna");
          if (k === "hard" && moves <= 36) ctx.achieve("mistrz-pamieci");
          return ctx.win();
        }
        return Sound.line();
      }
      Sound.erase();
      [a, c].forEach((j) => replay(cards[j], "miss"));
      hideTimer = setTimeout(hide, 850);
      render();
    });

    function render() {
      pairsEl.textContent = `${found} / ${pairs}`;
      movesEl.textContent = `Ruchy: ${moves}`;
      ctx.progress(found / pairs);
    }
    render();
  },
});
