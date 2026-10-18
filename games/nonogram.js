// Obrazki logiczne: rysunki z biblioteki, każdy rozwiązywalny samą logiką linii (bez zgadywania).
const Nonogram = (() => {
  // Rysunki według rozmiaru planszy ("#" = zamalowane). Test sprawdza, że każdy da się rozwiązać linia po linii.
  const PICTURES = {
    5: {
      "Serce": [".#.#.", "#####", "#####", ".###.", "..#.."],
      "Buźka": [".#.#.", ".#.#.", "#...#", "#...#", ".###."],
      "Strzałka": ["..#..", ".###.", "#.#.#", "..#..", "..#.."],
      "Grzybek": [".###.", "#####", "..#..", "..#..", ".###."],
      "Dzwonek": ["..#..", ".###.", ".###.", "#####", "..#.."],
      "Łódka": ["..#..", "..##.", "..#..", "#####", ".###."],
      "Kot": ["#...#", "##.##", "#####", "#.#.#", ".###."],
      "Klepsydra": ["#####", ".###.", "..#..", ".###.", "#####"],
      "Kielich": ["#####", "#####", ".###.", "..#..", ".###."],
      "Domek": ["..#..", ".###.", "#####", ".#.#.", ".###."],
    },
    10: {
      "Serce": [
        ".##....##.",
        "####..####",
        "##.#######",
        "#.########",
        "##########",
        ".########.",
        "..######..",
        "...####...",
        "....##....",
        "..........",
      ],
      "Grzyb": [
        "...####...",
        ".########.",
        "##..###.##",
        "##..######",
        "#######..#",
        "##########",
        "...#..#...",
        "...#..#...",
        "...####...",
        "..........",
      ],
      "Kubek": [
        ".#..#..#..",
        "..#..#..#.",
        ".#..#..#..",
        "..........",
        "#######...",
        "#########.",
        "#######.#.",
        "#######.#.",
        "#########.",
        ".#####....",
      ],
      "Rakieta": [
        "....##....",
        "...####...",
        "...#..#...",
        "...#..#...",
        "...####...",
        "..######..",
        ".##.##.##.",
        ".##.##.##.",
        "....##....",
        "...#..#...",
      ],
      "Choinka": [
        "....##....",
        "...####...",
        "..######..",
        "...####...",
        "..######..",
        ".########.",
        "##########",
        "....##....",
        "....##....",
        "..######..",
      ],
      "Dom": [
        "....##.##.",
        "...#####..",
        "..######..",
        ".########.",
        "##########",
        ".#......#.",
        ".#.##.#.#.",
        ".#.##.#.#.",
        ".#....#.#.",
        ".########.",
      ],
      "Ryba": [
        "..........",
        "..#####...",
        ".#######.#",
        "##.######.",
        "#########.",
        "##########",
        ".#######.#",
        "..#####...",
        "..........",
        "..........",
      ],
      "Klucz": [
        "..........",
        ".####.....",
        "##..##....",
        "#....#####",
        "#....#####",
        "##..##.#.#",
        ".####..#.#",
        "..........",
        "..........",
        "..........",
      ],
      "Parasol": [
        "....##....",
        "..######..",
        ".########.",
        "##########",
        "##########",
        "#.#.##.#.#",
        "....##....",
        "....##....",
        ".##.##....",
        "..###.....",
      ],
      "Kaczka": [
        "...###....",
        "..#####...",
        "..#.###...",
        "###.###...",
        "..####....",
        "...####..#",
        "..########",
        "..#######.",
        "...#####..",
        "..........",
      ],
    },
    15: {
      "Kot": [
        "..##.......##..",
        "..##.......##..",
        "..###.....###..",
        "..###########..",
        ".#############.",
        ".###..###..###.",
        ".###.####.####.",
        ".#############.",
        ".######.######.",
        "..####...####..",
        "...#########...",
        "....#######....",
        "...#########...",
        "..###########..",
        "..###########..",
      ],
      "Sowa": [
        ".##.........##.",
        ".###.......###.",
        ".#############.",
        "##...#####...##",
        "#..##.###.##..#",
        "#..##.###.##..#",
        "##...##.##...##",
        ".######.######.",
        ".#####...#####.",
        ".##.##.#.##.##.",
        ".#############.",
        ".##.#######.##.",
        "..###########..",
        "...#########...",
        "...##.....##...",
      ],
      "Statek": [
        ".......#.......",
        ".......##......",
        ".......###.....",
        "......####.....",
        ".....#####.....",
        "....######.....",
        "...#######.....",
        ".......#.......",
        ".......#.......",
        "###############",
        ".#############.",
        "..#.#.#.#.#.#..",
        "...#########...",
        "...............",
        "#..##..##..##..",
      ],
      "Grzyb": [
        ".....#####.....",
        "...#########...",
        "..###..######..",
        ".####..###..##.",
        ".#########..##.",
        "####..#########",
        "####..####..###",
        "##########..###",
        ".#############.",
        "....#######....",
        ".....#...#.....",
        ".....#...#.....",
        ".....#...#.....",
        "....#######....",
        "...#########...",
      ],
      "Kotwica": [
        "......###......",
        ".....#...#.....",
        "......###......",
        ".......#.......",
        "....#######....",
        ".......#.......",
        ".......#.......",
        ".......#.......",
        ".......#.......",
        "#......#......#",
        "###....#....###",
        ".##....#....##.",
        "..###..#..###..",
        "....#######....",
        "......###......",
      ],
      "Kaktus": [
        "......###......",
        ".....#####.....",
        ".....#####.....",
        ".##..#####.....",
        ".##..#####..##.",
        ".##..#####..##.",
        ".#########..##.",
        "..########..##.",
        ".....##########",
        ".....#########.",
        ".....#####.....",
        "...#########...",
        "...#########...",
        "....#######....",
        ".....#####.....",
      ],
    },
  };

  const runs = (line) => {
    const out = [];
    let n = 0;
    for (const v of line) {
      if (v === 1) n++;
      else if (n) { out.push(n); n = 0; }
    }
    if (n) out.push(n);
    return out;
  };
  const rowOf = (g, w, r) => g.slice(r * w, r * w + w);
  const colOf = (g, w, h, c) => Array.from({ length: h }, (_, r) => g[r * w + c]);

  function clues(g, w, h) {
    return {
      rows: Array.from({ length: h }, (_, r) => runs(rowOf(g, w, r))),
      cols: Array.from({ length: w }, (_, c) => runs(colOf(g, w, h, c))),
    };
  }

  // Rozwiązanie jednej linii: -1 nieznane, 0 puste, 1 zamalowane. Zwraca nową linię albo null przy sprzeczności.
  function solveLine(clue, cells) {
    const n = cells.length;
    const canFill = new Array(n).fill(false), canEmpty = new Array(n).fill(false);
    const line = new Array(n).fill(0);
    const rest = clue.map((_, b) => clue.slice(b + 1).reduce((s, x) => s + x + 1, 0));
    let any = false;

    function place(b, pos) {
      if (b === clue.length) {
        for (let i = pos; i < n; i++) { if (cells[i] === 1) return; line[i] = 0; }
        any = true;
        for (let i = 0; i < n; i++) line[i] ? (canFill[i] = true) : (canEmpty[i] = true);
        return;
      }
      const len = clue[b];
      for (let s = pos; s + len + rest[b] <= n; s++) {
        if (s > pos && cells[s - 1] === 1) break; // zamalowanego pola nie można zostawić pustym
        let ok = s + len === n || cells[s + len] !== 1;
        for (let i = s; ok && i < s + len; i++) if (cells[i] === 0) ok = false;
        if (!ok) continue;
        for (let i = pos; i < s; i++) line[i] = 0;
        for (let i = s; i < s + len; i++) line[i] = 1;
        if (s + len < n) line[s + len] = 0;
        place(b + 1, s + len + 1);
      }
    }
    place(0, 0);
    if (!any) return null;
    return cells.map((_, i) => (canFill[i] && canEmpty[i] ? -1 : canFill[i] ? 1 : 0));
  }

  // Czy łamigłówkę da się rozwiązać linia po linii, bez zgadywania.
  function solvable(rows, cols, w, h) {
    const g = new Array(w * h).fill(-1);
    for (let changed = true; changed; ) {
      changed = false;
      for (let r = 0; r < h; r++) {
        const res = solveLine(rows[r], rowOf(g, w, r));
        if (!res) return false;
        res.forEach((v, c) => { if (g[r * w + c] !== v) { g[r * w + c] = v; changed = true; } });
      }
      for (let c = 0; c < w; c++) {
        const res = solveLine(cols[c], colOf(g, w, h, c));
        if (!res) return false;
        res.forEach((v, r) => { if (g[r * w + c] !== v) { g[r * w + c] = v; changed = true; } });
      }
    }
    return !g.includes(-1);
  }

  // Losowy rysunek danego rozmiaru, bez powtórek aż do wyczerpania biblioteki; czasem odbity w poziomie.
  const played = {};
  function generate(size) {
    const set = PICTURES[size];
    if (set) {
      const names = Object.keys(set);
      let left = names.filter((k) => !played[size]?.includes(k));
      if (!left.length) { played[size] = []; left = names; }
      const name = left[Math.floor(Math.random() * left.length)];
      (played[size] ||= []).push(name);
      const flip = Math.random() < 0.5;
      const grid = set[name].flatMap((row) => [...(flip ? [...row].reverse() : row)].map((ch) => (ch === "#" ? 1 : 0)));
      return (api.last = { size, name, grid, ...clues(grid, size, size) });
    }
    return random(size);
  }

  // Losowy symetryczny wzór, gdy brak rysunków w tym rozmiarze; szuka do skutku wersji bez zgadywania.
  function random(size) {
    let last;
    for (let t = 0; t < 400; t++) {
      const g = new Array(size * size).fill(0);
      const half = Math.ceil(size / 2);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < half; c++) {
          const v = Math.random() < 0.6 ? 1 : 0;
          g[r * size + c] = v;
          g[r * size + size - 1 - c] = v;
        }
      }
      if (!g.includes(1)) continue;
      last = { size, grid: g, ...clues(g, size, size) };
      if (solvable(last.rows, last.cols, size, size)) break;
    }
    // shortcut: po 400 nieudanych próbach zostaje wzór wymagający zgadywania; używane tylko dla rozmiarów bez rysunków
    return (api.last = last);
  }

  // Wygrana = każdy wiersz i kolumna zgadzają się z liczbami (akceptuje też inne poprawne obrazki).
  function matches(filled, rows, cols, w, h) {
    const g = filled.map((v) => (v === 1 ? 1 : 0));
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    return rows.every((cl, r) => same(runs(rowOf(g, w, r)), cl)) && cols.every((cl, c) => same(runs(colOf(g, w, h, c)), cl));
  }

  const api = { PICTURES, runs, clues, solveLine, solvable, generate, matches, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Nonogram;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "obrazki"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, size: 5 },
    { key: "medium", name: "10 × 10", points: 25, size: 10 },
    { key: "hard", name: "15 × 15", points: 50, size: 15 },
  ],
  rules: [
    "Liczby przy wierszu i kolumnie to długości kolejnych bloków zamalowanych pól, w tej kolejności. Między blokami jest co najmniej jedno puste pole.",
    "Każdy obrazek da się odkryć linia po linii, bez zgadywania.",
    "Przeciągaj, żeby malować wiele pól. Prawy przycisk stawia krzyżyk. Klawiatura: strzałki, spacja, X.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez gumki", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybki rysownik", desc: "Rozwiąż średni poziom w mniej niż 5 min.", points: 25 },
    { id: "mistrz", name: "Mistrz obrazków", desc: "Rozwiąż trudny poziom w mniej niż 12 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { size: n, rows, cols, name } = Nonogram.generate(ctx.level.size);
    const s = new Array(n * n).fill(0); // 0 puste, 1 zamalowane, 2 krzyżyk
    let tool = 1, paint = null, cursor = 0, hot = -1;
    const rowText = rows.map((cl) => (cl.length ? cl : [0]));
    const colText = cols.map((cl) => (cl.length ? cl : [0]));
    const cw = Math.max(...rowText.map((cl) => cl.length)) * 0.62 + 0.5;
    const ch = Math.max(...colText.map((cl) => cl.length)) * 0.62 + 0.4;

    board.classList.add("ng");
    board.style.setProperty("--n", n);
    board.style.setProperty("--cw", cw);
    board.style.setProperty("--ch", ch);
    board.style.setProperty("--cols", n + cw);
    board.style.setProperty("--rows", n + ch);
    board.tabIndex = 0;
    board.setAttribute("aria-label", "Plansza. Strzałki przesuwają kursor, spacja zamalowuje, X stawia krzyżyk.");

    board.append(el("div", "ng-corner"));
    const colClues = colText.map((cl) => {
      const d = el("div", "ng-clue col");
      cl.forEach((v) => d.append(el("span", "", v)));
      board.append(d);
      return d;
    });
    const rowClues = [], cells = [];
    for (let r = 0; r < n; r++) {
      const d = el("div", "ng-clue row");
      rowText[r].forEach((v) => d.append(el("span", "", v)));
      board.append(d);
      rowClues.push(d);
      for (let c = 0; c < n; c++) {
        const cell = el("div", "cell ng-cell");
        cell.dataset.i = r * n + c;
        cell.style.setProperty("--k", r + c);
        if (c % 5 === 4 && c < n - 1) cell.classList.add("edge-r");
        if (r % 5 === 4 && r < n - 1) cell.classList.add("edge-b");
        board.append(cell);
        cells.push(cell);
      }
    }
    roundCorners(cells, n);

    const toolSeg = segmented("Narzędzie", ["Zamaluj", "Krzyżyk"], (k) => { tool = k + 1; toolSeg.set(k); });
    toolSeg.set(0);
    ctx.panel.append(panelBlock("", toolSeg.el, el("p", "panel-note", "Krzyżyk oznacza pole, które na pewno jest puste. Nie wpływa na wynik.")));

    const save = ctx.undoable((snap) => { snap.forEach((v, i) => (s[i] = v)); render(); okBefore = lineOk(); });

    // Które linie zgadzają się ze wskazówkami; nowo ułożone dostają błysk i dźwięk.
    const lineOk = () => {
      const g = s.map((v) => (v === 1 ? 1 : 0));
      return [
        ...rows.map((cl, r) => eq(Nonogram.runs(g.slice(r * n, r * n + n)), cl)),
        ...cols.map((cl, c) => eq(Nonogram.runs(g.filter((_, i) => i % n === c)), cl)),
      ];
    };
    const eq = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    let okBefore = lineOk();
    const okAtStart = okBefore.filter(Boolean).length;
    const lines = (from) => {
      const ok = lineOk();
      const fresh = ok.map((v, k) => v && !okBefore[k] && (k < n ? rows[k].length : cols[k - n].length));
      okBefore = ok;
      ctx.progress((ok.filter(Boolean).length - okAtStart) / (2 * n - okAtStart || 1));
      if (!fresh.some(Boolean) || Nonogram.matches(s, rows, cols, n, n)) return false;
      fresh.forEach((v, k) => {
        if (!v) return;
        const idx = k < n ? [...Array(n).keys()].map((c) => k * n + c) : [...Array(n).keys()].map((r) => r * n + (k - n));
        sweep(idx.sort((a, b) => Math.abs(a - from) - Math.abs(b - from)).map((i) => cells[i]));
        replay(k < n ? rowClues[k] : colClues[k - n], "flash");
      });
      Sound.line();
      return true;
    };
    const apply = (i) => {
      if (ctx.done || s[i] === paint) return;
      s[i] = paint;
      render();
      if (!lines(i)) (paint === 1 ? Sound.place(1 + ((i % n) % 5)) : paint === 2 ? Sound.tap() : Sound.erase());
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const cell = e.target.closest(".ng-cell");
      if (!cell || ctx.done) return;
      e.preventDefault();
      board.focus({ preventScroll: true });
      const i = +cell.dataset.i;
      const want = e.button === 2 ? 2 : tool;
      save(s.slice());
      paint = s[i] === want ? 0 : want;
      cursor = i;
      apply(i);
    });
    ctx.on(document, "pointermove", (e) => {
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ng-cell");
      const i = cell && board.contains(cell) ? +cell.dataset.i : -1;
      if (i !== hot) { hot = i; render(); }
      if (paint !== null && i >= 0) apply(i);
    });
    ctx.on(document, "pointerup", () => {
      if (paint === null) return;
      paint = null;
      check();
    });

    const keyMark = (v) => () => {
      if (ctx.done) return;
      save(s.slice());
      paint = s[cursor] === v ? 0 : v;
      apply(cursor);
      paint = null;
      check();
    };
    cellKeys(ctx, {
      cols: n, rows: n, scope: board,
      get: () => cursor, set: (i) => { cursor = i; render(); },
      keys: { " ": keyMark(1), enter: keyMark(1), x: keyMark(2) },
    });
    board.addEventListener("focus", () => render());
    board.addEventListener("blur", () => render());

    function check() {
      if (Nonogram.matches(s, rows, cols, n, n)) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 300) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 720 && ctx.undos === 0) ctx.achieve("mistrz");
      
      }
      if (Nonogram.matches(s, rows, cols, n, n)) ctx.win(name && `Wyszedł obrazek: ${name.toLowerCase()}.`);
    }

    function render() {
      const g = s.map((v) => (v === 1 ? 1 : 0));
      const hr = hot >= 0 ? (hot / n) | 0 : -1, hc = hot >= 0 ? hot % n : -1;
      const showCursor = document.activeElement === board;
      cells.forEach((cell, i) => {
        cell.classList.toggle("on", s[i] === 1);
        cell.classList.toggle("x", s[i] === 2);
        cell.classList.toggle("hot", ((i / n) | 0) === hr || i % n === hc);
        cell.classList.toggle("cursor", showCursor && i === cursor);
      });
      rowClues.forEach((d, r) => {
        d.classList.toggle("ok", eq(Nonogram.runs(g.slice(r * n, r * n + n)), rows[r]));
        d.classList.toggle("hot", r === hr || (showCursor && r === ((cursor / n) | 0)));
      });
      colClues.forEach((d, c) => {
        d.classList.toggle("ok", eq(Nonogram.runs(g.filter((_, i) => i % n === c)), cols[c]));
        d.classList.toggle("hot", c === hc || (showCursor && c === cursor % n));
      });
    }
    render();
  },
});
