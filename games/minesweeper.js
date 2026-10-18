// Saper. Miny losowane dopiero po pierwszym kliknięciu: pierwszy ruch jest bezpieczny, a reszta rozwiązywalna bez zgadywania.
const Minesweeper = (() => {
  function around(i, w, h) {
    const r = (i / w) | 0, c = i % w, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < h && cc >= 0 && cc < w) out.push(rr * w + cc);
    }
    return out;
  }

  // Miny omijają pierwsze pole i jego sąsiadów (o ile zostaje dość miejsca).
  function scatter(w, h, count, safe) {
    const banned = new Set([safe, ...around(safe, w, h)]);
    let pool = [...Array(w * h).keys()].filter((i) => !banned.has(i));
    if (pool.length < count) pool = [...Array(w * h).keys()].filter((i) => i !== safe);
    const mines = new Uint8Array(w * h);
    for (let k = 0; k < count; k++) {
      const j = k + Math.floor(Math.random() * (pool.length - k));
      [pool[k], pool[j]] = [pool[j], pool[k]];
      mines[pool[k]] = 1;
    }
    const nums = Array.from({ length: w * h }, (_, i) => around(i, w, h).reduce((s, j) => s + mines[j], 0));
    return { mines, nums };
  }

  // Rozwiązuje planszę tak jak człowiek, od pierwszego kliknięcia: cyfra z kompletem min/pól,
  // porównanie dwóch cyfr (zbiory sąsiadów jeden w drugim) i licznik min na końcu.
  // Zwraca true, gdy wszystkie bezpieczne pola dało się odkryć bez zgadywania.
  function logical(w, h, count, safe, mines, nums) {
    const open = new Uint8Array(w * h), flag = new Uint8Array(w * h);
    const nb = Array.from({ length: w * h }, (_, i) => around(i, w, h));
    let opened = 0;
    const reveal = (i) => {
      const stack = [i];
      while (stack.length) {
        const j = stack.pop();
        if (open[j]) continue;
        open[j] = 1;
        opened++;
        if (nums[j] === 0) stack.push(...nb[j]);
      }
    };
    if (mines[safe]) return false;
    reveal(safe);
    const goal = w * h - count;
    for (let progress = true; progress && opened < goal; ) {
      progress = false;
      // ograniczenia: zakryte pola wokół cyfry i ile min jeszcze wśród nich
      const cons = [];
      for (let i = 0; i < w * h; i++) {
        if (!open[i] || !nums[i]) continue;
        const cells = nb[i].filter((j) => !open[j] && !flag[j]);
        if (!cells.length) continue;
        cons.push({ cells, n: nums[i] - nb[i].filter((j) => flag[j]).length });
      }
      const act = (cells, mine) => cells.forEach((j) => {
        if (mine) { if (!flag[j]) { flag[j] = 1; progress = true; } }
        else if (!open[j]) { reveal(j); progress = true; }
      });
      for (const c of cons) {
        if (c.n === 0) act(c.cells, false);
        else if (c.n === c.cells.length) act(c.cells, true);
      }
      if (progress) continue;
      // A ⊂ B: w różnicy B − A jest dokładnie nB - nA min
      for (const a of cons) for (const b of cons) {
        if (a === b || a.cells.length >= b.cells.length || !a.cells.every((j) => b.cells.includes(j))) continue;
        const rest = b.cells.filter((j) => !a.cells.includes(j)), n = b.n - a.n;
        if (n === 0) act(rest, false);
        else if (n === rest.length) act(rest, true);
      }
      if (progress) continue;
      // licznik min: gdy zostało tyle min co zakrytych pól (albo zero)
      const hidden = [...open.keys()].filter((j) => !open[j] && !flag[j]);
      const left = count - flag.reduce((s, v) => s + v, 0);
      if (left === 0) act(hidden, false);
      else if (left === hidden.length) act(hidden, true);
    }
    return opened === goal;
  }

  // Losuje rozkład min, który da się rozwiązać samą logiką od pierwszego kliknięcia.
  function layMines(w, h, count, safe) {
    let board;
    for (let t = 0; t < 3000; t++) {
      board = scatter(w, h, count, safe);
      if (logical(w, h, count, safe, board.mines, board.nums)) break;
    }
    // shortcut: po 3000 próbach zostaje plansza, która może wymagać zgadywania; przy obecnych poziomach to się nie zdarza
    return (api.last = board);
  }

  // Odkrywa pole; puste pola (0) odkrywają sąsiadów. Zwraca listę nowo odkrytych.
  function flood(start, w, h, nums, mines, open, flags) {
    const out = [];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (open[i] || flags[i] || mines[i]) continue;
      open[i] = 1;
      out.push(i);
      if (nums[i] === 0) stack.push(...around(i, w, h));
    }
    return out;
  }

  const api = { around, scatter, logical, layMines, flood, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Minesweeper;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "saper"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, w: 9, h: 9, mines: 10 },
    { key: "medium", name: "Średni", points: 25, w: 12, h: 12, mines: 28 },
    { key: "hard", name: "Trudny", points: 50, w: 16, h: 16, mines: 52 },
  ],
  rules: [
    "Odkryj wszystkie pola bez min. Cyfra mówi, ile min leży na sąsiednich ośmiu polach.",
    "Prawy przycisk stawia flagę. Kliknięcie w cyfrę z kompletem flag dookoła odkrywa resztę sąsiadów.",
    "Pierwsze kliknięcie jest zawsze bezpieczne, a całą planszę da się rozwiązać samą logiką, bez zgadywania.",
  ],
  mount(board, ctx) {
    const { w, h, mines: count } = ctx.level;
    const open = new Uint8Array(w * h), flags = new Uint8Array(w * h);
    let mines = null, nums = null, flagMode = false, opened = 0;

    board.classList.add("ms");
    board.style.setProperty("--cols", w);
    board.style.setProperty("--rows", h);
    const cells = Array.from({ length: w * h }, (_, i) => {
      const b = button("", "cell ms-cell");
      b.dataset.i = i;
      b.style.setProperty("--k", ((i / w) | 0) + (i % w));
      board.append(b);
      return b;
    });

    const left = el("p", "panel-big");
    const modeSeg = segmented("Tryb kliknięcia", ["Odkrywaj", "Flaguj"], (k) => { flagMode = k === 1; modeSeg.set(k); });
    modeSeg.set(0);
    ctx.panel.append(panelBlock("Miny do oznaczenia", left), panelBlock("", modeSeg.el, el("p", "panel-note", "Na telefonie przełącz na flagi, żeby oznaczać miny.")));

    // Opóźnienie animacji rośnie z odległością od klikniętego pola, więc odkrycie rozchodzi się falą.
    const wave = (list, from) => {
      const fr = (from / w) | 0, fc = from % w;
      list.forEach((i) => cells[i].style.setProperty("--d", `${Math.min(Math.max(Math.abs(((i / w) | 0) - fr), Math.abs((i % w) - fc)) * 28, 420)}ms`));
    };

    const toggleFlag = (i) => {
      if (open[i]) return;
      flags[i] ^= 1;
      flags[i] ? Sound.flag() : Sound.erase();
      render();
    };
    const reveal = (i) => {
      if (flags[i] || open[i] || ctx.done) return;
      if (!mines) ({ mines, nums } = Minesweeper.layMines(w, h, count, i));
      if (mines[i]) {
        cells[i].classList.add("boom");
        const all = [...mines.keys()].filter((j) => mines[j] && !flags[j]);
        all.forEach((j) => (open[j] = 1));
        wave(all, i);
        ctx.lose("Mina", "Ta partia przepadła. Każda kolejna plansza jest losowana od nowa.");
        render();
        return;
      }
      const got = Minesweeper.flood(i, w, h, nums, mines, open, flags);
      wave(got, i);
      opened += got.length;
      ctx.progress(opened / (w * h - count));
      if (got.length > 8) Sound.line();
      else if (got.length) Sound.place(Math.min(nums[i] + 1, 9));
      if (opened === w * h - count) {
        mines.forEach((m, j) => { if (m) flags[j] = 1; });
        render();
        ctx.win();
      }
    };
    // Kliknięcie w odkrytą cyfrę z kompletem flag dookoła odkrywa resztę sąsiadów.
    const chord = (i) => {
      const nbs = Minesweeper.around(i, w, h);
      if (!nums[i] || nbs.filter((j) => flags[j]).length !== nums[i]) {
        // podpowiedź: krótko podświetl zakrytych sąsiadów
        nbs.forEach((j) => !open[j] && !flags[j] && replay(cells[j], "peek"));
        return;
      }
      nbs.forEach((j) => reveal(j));
    };

    board.addEventListener("click", (e) => {
      const b = e.target.closest(".ms-cell");
      if (!b || ctx.done) return;
      const i = +b.dataset.i;
      if (open[i]) chord(i);
      else if (flagMode) toggleFlag(i);
      else reveal(i);
      render();
    });
    board.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      const b = e.target.closest(".ms-cell");
      if (b && !ctx.done) toggleFlag(+b.dataset.i);
    });

    function render() {
      let flagged = 0;
      cells.forEach((b, i) => {
        const isOpen = !!open[i], isMine = isOpen && !!mines?.[i];
        flagged += flags[i];
        b.classList.toggle("open", isOpen);
        b.classList.toggle("flag", !isOpen && !!flags[i]);
        b.classList.toggle("mine", isMine);
        b.classList.toggle("wrong", ctx.done && !!flags[i] && !!mines && !mines[i]);
        const n = isOpen && !isMine ? nums[i] : 0;
        if (b.dataset.n !== String(n)) {
          b.dataset.n = n;
          b.textContent = n || "";
        }
        b.setAttribute("aria-label", !isOpen ? (flags[i] ? "Flaga" : "Zakryte pole") : isMine ? "Mina" : n ? `${n}` : "Puste");
      });
      left.textContent = count - flagged;
    }
    render();
  },
});
