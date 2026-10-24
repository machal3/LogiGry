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
      "Gwiazdka": ["..#..", "#####", ".###.", ".#.#.", "#...#"],
      "Drzewko": ["..#..", ".###.", "#####", "..#..", "..#.."],
      "Księżyc": [".###.", "##...", "#....", "##...", ".###."],
      "Robot": ["#####", "#.#.#", "#####", ".#.#.", "##.##"],
      "Rybka": [".....", ".##.#", "#####", ".##.#", "....."],
      "Parasolka": [".###.", "#####", "..#..", "..#..", ".##.."],
      "Zamek": ["#.#.#", "#####", "#...#", "#.#.#", "#####"],
      "Ludzik": ["..#..", "#####", "..#..", ".###.", ".#.#."],
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
      "Kot": [
        "#........#",
        "##......##",
        "###....###",
        "##########",
        "#.##..##.#",
        "##########",
        "###.##.###",
        "####..####",
        ".########.",
        "..######..",
      ],
      "Gwiazda": [
        "....##....",
        "....##....",
        "...####...",
        "##########",
        ".########.",
        "..######..",
        "..######..",
        ".###..###.",
        ".##....##.",
        "##......##",
      ],
      "Żaba": [
        ".##....##.",
        "#..#..#..#",
        "#.##..##.#",
        ".########.",
        "##########",
        "#.######.#",
        "#..####..#",
        ".########.",
        "##.####.##",
        "#........#",
      ],
      "Motyl": [
        "##......##",
        "###.##.###",
        "####..####",
        "##########",
        ".########.",
        "..##..##..",
        ".###..###.",
        "####..####",
        "###....###",
        ".#......#.",
      ],
      "Jabłko": [
        ".....#....",
        "....#.....",
        "..##.###..",
        ".########.",
        "##########",
        "##########",
        "##########",
        ".########.",
        ".########.",
        "..##..##..",
      ],
      "Pies": [
        "##......##",
        "###.##.###",
        "..######..",
        ".#.####.#.",
        ".########.",
        "..##..##..",
        "..######..",
        "...####...",
        "...#..#...",
        "..........",
      ],
      "Nuta": [
        "...#######",
        "...#######",
        "...#.....#",
        "...#.....#",
        "...#.....#",
        ".###...###",
        "####..####",
        "####..####",
        ".##....##.",
        "..........",
      ],
      "Słońce": [
        "....#.....",
        ".#..#..#..",
        "..#####...",
        ".#######..",
        "########.#",
        "#########.",
        ".#######..",
        "..#####...",
        ".#..#..#..",
        "....#.....",
      ],
      "Liść": [
        ".....#####",
        "...#######",
        "..########",
        ".####.####",
        ".###.#####",
        "####.####.",
        "###.####..",
        "##.####...",
        ".#........",
        "#.........",
      ],
      "Ślimak": [
        "....####..",
        "...#....#.",
        "..#.##..#.",
        "..#.#.#.#.",
        "..#.#..#..",
        "#..#..#...",
        "##..##....",
        "##########",
        "##########",
        ".########.",
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
      "Zamek": [
        "#.#.........#.#",
        "###..#.#.#..###",
        "###..#####..###",
        "###..#####..###",
        "###############",
        "###############",
        "###.#######.###",
        "###############",
        "#######.#######",
        "######...######",
        "######...######",
        "######...######",
        "###############",
        "...............",
        "###############",
      ],
      "Drzewo": [
        ".....#####.....",
        "...#########...",
        "..###########..",
        ".#############.",
        ".#############.",
        "###############",
        "###############",
        ".#############.",
        "..###########..",
        "...####.####...",
        "......###......",
        "......###......",
        "......###......",
        ".....#####.....",
        "...#########...",
      ],
      "Słoń": [
        "...............",
        "....######.....",
        "..##########...",
        ".############..",
        ".##.#########..",
        ".############..",
        ".###########...",
        "..##.########..",
        "..##.#########.",
        "..##.#########.",
        "..#..####.####.",
        "..#..###...###.",
        ".##..###...###.",
        ".....###...###.",
        "...............",
      ],
      "Latarnia": [
        "......###......",
        ".....#####.....",
        ".....#...#.....",
        ".....#####.....",
        "......###......",
        "......#.#......",
        "......###......",
        ".....#.#.#.....",
        ".....#####.....",
        ".....##.##.....",
        "....#######....",
        "....##...##....",
        "....#######....",
        ".#############.",
        "###############",
      ],
      "Lis": [
        "#.............#",
        "##...........##",
        "###.........###",
        "####.#####.####",
        "###############",
        "##.#########.##",
        "#...#######...#",
        "##.##.###.##.##",
        "###############",
        ".#############.",
        "..#####.#####..",
        "...####.####...",
        "....#######....",
        "......###......",
        ".......#.......",
      ],
      "Dynia": [
        ".......#.......",
        "......##.......",
        ".....##........",
        "...#########...",
        ".#############.",
        ".###.#####.###.",
        "###...###...###",
        "###############",
        "######.#.######",
        "###############",
        "##.#########.##",
        "###.#.#.#.#.###",
        ".###.#.#.#.###.",
        "..###########..",
        "....#######....",
      ],
      "Ptak": [
        "...............",
        "....####.......",
        "...######......",
        "..##.#####.....",
        "#####.######...",
        "..##########...",
        "...#########.##",
        "...############",
        "....##########.",
        ".....########..",
        "......#######..",
        "........#..#...",
        "........#..#...",
        ".......##.##...",
        "...............",
      ],
      "Grzybki": [
        "...............",
        "....#####......",
        "..#########....",
        ".###.###.###...",
        "#############..",
        "..#..#..#.##...",
        "....##..#####..",
        "....##.#######.",
        "....##.##.#.##.",
        "....##.#######.",
        "....##...###...",
        "...####..###...",
        "..######.###...",
        "........#####..",
        "...............",
      ],
      "Żółw": [
        "...............",
        "....#######....",
        "...#.#.#.#.#...",
        "..###########..",
        ".#.#.#.#.#.#.#.",
        "###############",
        "#.#.#.#.#.#.#.#",
        ".#############.",
        "..###.....###..",
        "..##.......##..",
        "...............",
        "...............",
        "...............",
        "...............",
        "...............",
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

  // Krzyżyki automatyczne (3): każde puste pole linii zgodnej ze wskazówkami. Gdy linia przestaje się zgadzać, jej
  // krzyżyki automatyczne znikają, chyba że trzyma je druga, ułożona linia. Krzyżyki gracza (2) zostają.
  function autoCross(s, rows, cols, n) {
    const g = s.map((v) => (v === 1 ? 1 : 0));
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const keep = new Array(n * n).fill(false);
    rows.forEach((cl, r) => { if (same(runs(rowOf(g, n, r)), cl)) for (let c = 0; c < n; c++) keep[r * n + c] = true; });
    cols.forEach((cl, c) => { if (same(runs(colOf(g, n, n, c)), cl)) for (let r = 0; r < n; r++) keep[r * n + c] = true; });
    return s.map((v, i) => (v === 0 && keep[i] ? 3 : v === 3 && !keep[i] ? 0 : v));
  }
  // Linia sprzeczna ze wskazówką: zamalowań i krzyżyków nie da się już pogodzić z liczbami.
  const lineBad = (clue, line) => solveLine(clue, line.map((v) => (v === 1 ? 1 : v ? 0 : -1))) === null;

  // Kolor odsłoniętego obrazka (z palety strony)
  const COLORS = {
    "Serce": "red", "Buźka": "yellow", "Strzałka": "blue", "Grzybek": "red", "Dzwonek": "yellow", "Łódka": "blue", "Kot": "orange",
    "Klepsydra": "brown", "Kielich": "yellow", "Domek": "brown", "Grzyb": "red", "Kubek": "brown", "Rakieta": "violet", "Choinka": "green",
    "Dom": "orange", "Ryba": "teal", "Klucz": "yellow", "Parasol": "violet", "Kaczka": "yellow", "Sowa": "brown", "Statek": "blue",
    "Kotwica": "teal", "Kaktus": "green", "Gwiazdka": "yellow", "Drzewko": "green", "Księżyc": "yellow", "Robot": "gray",
    "Rybka": "blue", "Parasolka": "pink", "Zamek": "gray", "Ludzik": "blue", "Gwiazda": "yellow", "Żaba": "green", "Motyl": "violet",
    "Jabłko": "red", "Pies": "brown", "Nuta": "violet", "Słońce": "orange", "Liść": "green", "Ślimak": "brown", "Drzewo": "green",
    "Słoń": "gray", "Latarnia": "red", "Lis": "orange", "Dynia": "orange", "Ptak": "blue", "Grzybki": "red", "Żółw": "green",
  };

  const api = { PICTURES, COLORS, runs, clues, solveLine, solvable, generate, matches, autoCross, lineBad, rowOf, colOf, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Nonogram;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "obrazki"), {
  author: "Claude, Claude Opus 5.5",
  levels: [
    { key: "easy", name: "5 × 5", points: 10, size: 5 },
    { key: "medium", name: "10 × 10", points: 25, size: 10 },
    { key: "hard", name: "15 × 15", points: 50, size: 15 },
  ],
  rules: [
    "Liczby przy wierszu i kolumnie to długości kolejnych bloków zamalowanych pól, w tej kolejności. Między blokami jest co najmniej jedno puste pole.",
    "Każdy obrazek da się odkryć linia po linii, bez zgadywania.",
    "Przeciągaj, żeby malować całą linię; pędzel trzyma się wiersza albo kolumny, a dymek pokazuje długość. Prawy przycisk stawia krzyżyk.",
    "Gdy linia zgadza się z liczbami, jej puste pola same dostają jasne krzyżyki. Można to wyłączyć w panelu.",
    "Klawiatura: strzałki przesuwają kursor, spacja zamalowuje, X stawia krzyżyk.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez gumki", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "czysta-kartka", name: "Czysta kartka", desc: "Rozwiąż planszę 10 × 10 albo większą bez stawiania krzyżyków ręcznie.", points: 25 },
    { id: "sprint", name: "Szybki rysownik", desc: "Rozwiąż średni poziom w mniej niż 5 min.", points: 25 },
    { id: "kolekcjoner", name: "Mały album", desc: "Odkryj w albumie wszystkie obrazki 5 × 5.", points: 25 },
    { id: "mistrz", name: "Mistrz obrazków", desc: "Rozwiąż trudny poziom w mniej niż 12 min, bez cofania.", points: 50 },
    { id: "album", name: "Pełny album", desc: "Odkryj w albumie wszystkie obrazki ze wszystkich rozmiarów.", points: 50 },
  ],
  mount(board, ctx) {
    const { size: n, rows, cols, name } = Nonogram.generate(ctx.level.size);
    const s = new Array(n * n).fill(0); // 0 puste, 1 zamalowane, 2 krzyżyk, 3 krzyżyk automatyczny
    const store = (k, v) => {
      try {
        if (v === undefined) return localStorage.getItem(`logigra.obrazki.${k}`);
        localStorage.setItem(`logigra.obrazki.${k}`, v);
      } catch {}
      return null;
    };
    const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    ctx.onStop(() => timers.forEach(clearTimeout));
    let autoX = store("autox") !== "off";
    let tool = 1, drag = null, cursor = 0, hot = -1, finished = false, manualX = false;
    const rowText = rows.map((cl) => (cl.length ? cl : [0]));
    const colText = cols.map((cl) => (cl.length ? cl : [0]));
    const cw = Math.max(...rowText.map((cl) => cl.length)) * 0.62 + 0.5;
    const ch = Math.max(...colText.map((cl) => cl.length)) * 0.62 + 0.4;
    const need = rows.flat().reduce((a, b) => a + b, 0);

    board.classList.add("ng", "ng-in");
    later(() => board.classList.remove("ng-in"), still() ? 0 : 1400);
    board.style.setProperty("--n", n);
    board.style.setProperty("--cw", cw);
    board.style.setProperty("--ch", ch);
    board.style.setProperty("--cols", n + cw);
    board.style.setProperty("--rows", n + ch);
    board.style.setProperty("--pc", `var(--${Nonogram.COLORS[name] || "pink"})`);
    board.tabIndex = 0;
    board.setAttribute("aria-label", "Plansza. Strzałki przesuwają kursor, spacja zamalowuje, X stawia krzyżyk.");

    board.append(el("div", "ng-corner"));
    const colClues = colText.map((cl, c) => {
      const d = el("div", `ng-clue col${c % 2 ? " alt" : ""}`);
      cl.forEach((v) => d.append(el("span", "", v)));
      board.append(d);
      return d;
    });
    const rowClues = [], cells = [];
    for (let r = 0; r < n; r++) {
      const d = el("div", `ng-clue row${r % 2 ? " alt" : ""}`);
      rowText[r].forEach((v) => d.append(el("span", "", v)));
      board.append(d);
      rowClues.push(d);
      for (let c = 0; c < n; c++) {
        const cell = el("div", "cell ng-cell");
        cell.dataset.i = r * n + c;
        cell.style.setProperty("--k", r + c);
        cell.style.setProperty("--x", c);
        cell.style.setProperty("--y", r);
        if (c % 5 === 4 && c < n - 1) cell.classList.add("edge-r");
        if (r % 5 === 4 && r < n - 1) cell.classList.add("edge-b");
        board.append(cell);
        cells.push(cell);
      }
    }
    roundCorners(cells, n);
    // dymek z długością przeciąganego odcinka
    const bubble = el("div", "ng-count");
    board.append(bubble);

    // --- panel ---
    const stats = statsBlock(ctx, "Postęp", ["Linie", "Pola"]);
    const toolSeg = segmented("Narzędzie", ["Zamaluj", "Krzyżyk"], (k) => { tool = k + 1; toolSeg.set(k); Sound.tap(); });
    toolSeg.set(0);
    const autoSeg = segmented("Krzyżyki w ułożonych liniach", ["Same", "Ręcznie"], (k) => {
      autoX = k === 0;
      autoSeg.set(k);
      store("autox", autoX ? "on" : "off");
      if (finished) return;
      save(s.slice());
      if (autoX) commit(cursor, true);
      else { s.forEach((v, i) => v === 3 && (s[i] = 0)); render(); }
    });
    autoSeg.set(autoX ? 0 : 1);
    ctx.panel.append(panelBlock("Narzędzie", toolSeg.el, el("p", "panel-note", "Krzyżyk oznacza pole, które na pewno jest puste. Nie wpływa na wynik."), el("p", "ng-label", "Krzyżyki w ułożonych liniach"), autoSeg.el));
    const albumEl = el("div", "ng-album");
    const albumNote = el("p", "panel-note");
    ctx.panel.append(panelBlock("Album", albumEl, albumNote));

    const readAlbum = () => { try { return JSON.parse(store("album") || "{}"); } catch { return {}; } };
    function renderAlbum(fresh) {
      const album = readAlbum(), set = Nonogram.PICTURES[n];
      if (!set) { albumNote.textContent = "W tym rozmiarze obrazki są losowe."; return; }
      const got = album[n] || [];
      albumEl.replaceChildren(...Object.entries(set).map(([nm, pic]) => {
        const t = el("span", `ng-thumb${got.includes(nm) ? "" : " locked"}${fresh === nm ? " fresh" : ""}`);
        t.style.setProperty("--tn", n);
        t.style.setProperty("--pc", `var(--${Nonogram.COLORS[nm] || "pink"})`);
        if (got.includes(nm)) {
          t.title = nm;
          t.setAttribute("aria-label", nm);
          pic.join("").split("").forEach((ch) => t.append(el("i", ch === "#" ? "on" : "")));
        } else {
          t.setAttribute("aria-label", "Jeszcze nieodkryty");
          t.append(el("b", "", "?"));
        }
        return t;
      }));
      albumNote.textContent = `Odkryte: ${got.length} z ${Object.keys(set).length}.`;
    }
    renderAlbum();

    const save = ctx.undoable((snap) => { snap.forEach((v, i) => (s[i] = v)); render(); okBefore = lineOk(); });

    const eq = (a, b) => a.length === b.length && a.every((x, k) => x === b[k]);
    const rowLine = (r) => s.slice(r * n, r * n + n);
    const colLine = (c) => s.filter((_, i) => i % n === c);
    const filled = (line) => line.map((v) => (v === 1 ? 1 : 0));
    // Które linie zgadzają się ze wskazówkami; nowo ułożone dostają błysk i dźwięk.
    const lineOk = () => [
      ...rows.map((cl, r) => eq(Nonogram.runs(filled(rowLine(r))), cl)),
      ...cols.map((cl, c) => eq(Nonogram.runs(filled(colLine(c))), cl)),
    ];
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
    // po każdej zmianie: krzyżyki automatyczne (rozchodzą się falą od ostatniego pola), wygląd, dźwięk ułożonej linii
    function commit(from, quiet = false) {
      if (autoX) {
        const next = Nonogram.autoCross(s, rows, cols, n);
        const fr = (from / n) | 0, fc = from % n;
        next.forEach((v, i) => {
          if (v === 3 && s[i] !== 3) cells[i].style.setProperty("--ad", `${(Math.abs(((i / n) | 0) - fr) + Math.abs((i % n) - fc)) * 28 + 60}ms`);
          else if (v !== 3) cells[i].style.removeProperty("--ad");
          s[i] = v;
        });
      }
      render();
      return lines(from) || quiet;
    }
    // jedno pole według bieżącego pociągnięcia; przy przeciąganiu nie nadpisuje innych znaków
    function paintCell(j, first) {
      const v = s[j], p = drag.paint;
      let to = v;
      if (p === 1) to = first || v === 0 ? 1 : v;
      else if (p === 2) to = first || v === 0 || v === 3 ? 2 : v;
      else to = v === drag.erase || (drag.erase === 2 && v === 3) ? 0 : v;
      if (to === v) return false;
      s[j] = to;
      if (to === 2) manualX = true;
      cells[j].style.removeProperty("--ad");
      return true;
    }
    function sound(i) {
      const p = drag ? drag.paint : 1;
      if (p === 1) Sound.place(1 + ((i % n) % 5));
      else if (p === 2) Sound.tap();
      else Sound.erase();
    }
    function start(i, want) {
      const v = s[i];
      save(s.slice());
      // krzyżyk automatyczny pod krzyżykiem zostaje krzyżykiem gracza
      const paint = want === 1 ? (v === 1 ? 0 : 1) : v === 2 ? 0 : 2;
      drag = { start: i, end: i, paint, erase: paint === 0 ? v : null, axis: null };
      cursor = i;
      const changed = paintCell(i, true);
      if (changed && !commit(i)) sound(i);
      showCount();
    }
    // pędzel trzyma się wiersza albo kolumny pierwszego ruchu i maluje cały odcinek od pola startowego
    function dragTo(i) {
      const d = drag;
      if (i === d.end) return;
      const r0 = (d.start / n) | 0, c0 = d.start % n, r = (i / n) | 0, c = i % n;
      if (!d.axis && i !== d.start) d.axis = Math.abs(c - c0) >= Math.abs(r - r0) ? "row" : "col";
      const end = d.axis === "col" ? r * n + c0 : r0 * n + c;
      const step = end === d.start ? 0 : d.axis === "col" ? (end > d.start ? n : -n) : end > d.start ? 1 : -1;
      let changed = false;
      for (let j = d.start; ; j += step) {
        if (paintCell(j, false)) changed = true;
        if (j === end || !step) break;
      }
      d.end = end;
      cursor = end;
      if (changed && !commit(end)) sound(end);
      else if (!changed) render();
      showCount();
    }
    function showCount() {
      const d = drag;
      const len = d ? Math.abs(d.axis === "col" ? ((d.end / n) | 0) - ((d.start / n) | 0) : (d.end % n) - (d.start % n)) + 1 : 0;
      bubble.classList.toggle("show", !!d && d.paint !== 0 && len > 1);
      if (!d) return;
      bubble.textContent = len;
      bubble.style.setProperty("--x", d.end % n);
      bubble.style.setProperty("--y", (d.end / n) | 0);
    }
    const blocked = () => ctx.done || finished;
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const cell = e.target.closest(".ng-cell");
      if (!cell || blocked()) return;
      e.preventDefault();
      board.focus({ preventScroll: true });
      start(+cell.dataset.i, e.button === 2 ? 2 : tool);
    });
    ctx.on(document, "pointermove", (e) => {
      const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ng-cell");
      const i = cell && board.contains(cell) ? +cell.dataset.i : -1;
      if (drag && i >= 0 && !blocked()) dragTo(i);
      if (i !== hot) { hot = i; render(); }
    });
    ctx.on(document, "pointerup", () => {
      if (!drag) return;
      drag = null;
      showCount();
      check();
    });

    const keyMark = (v) => () => {
      if (blocked()) return;
      start(cursor, v);
      drag = null;
      showCount();
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
      if (finished || !Nonogram.matches(s, rows, cols, n, n)) return;
      finished = true;
      if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (n >= 10 && !manualX) ctx.achieve("czysta-kartka");
      if (ctx.level.key === "medium" && ctx.time < 300) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 720 && ctx.undos === 0) ctx.achieve("mistrz");
      if (name && Nonogram.PICTURES[n]?.[name]) {
        const album = readAlbum();
        album[n] = [...new Set([...(album[n] || []), name])];
        store("album", JSON.stringify(album));
        if (album[5]?.length >= Object.keys(Nonogram.PICTURES[5]).length) ctx.achieve("kolekcjoner");
        const all = Object.values(Nonogram.PICTURES).reduce((a, p) => a + Object.keys(p).length, 0);
        if (Object.values(album).reduce((a, l) => a + l.length, 0) >= all) ctx.achieve("album");
        renderAlbum(name);
      }
      // odsłonięcie: krzyżyki i linie gasną, pola zlewają się w obrazek w jego kolorze
      hot = -1;
      render();
      board.classList.add("reveal");
      later(() => ctx.win(name ? `Wyszedł obrazek: ${name.toLowerCase()}.` : undefined), still() ? 0 : 1300);
    }

    function render() {
      const hr = hot >= 0 ? (hot / n) | 0 : -1, hc = hot >= 0 ? hot % n : -1;
      const showCursor = document.activeElement === board && !finished;
      let count = 0;
      cells.forEach((cell, i) => {
        if (s[i] === 1) count++;
        cell.classList.toggle("on", s[i] === 1);
        cell.classList.toggle("x", s[i] === 2 || s[i] === 3);
        cell.classList.toggle("auto", s[i] === 3);
        cell.classList.toggle("hot", ((i / n) | 0) === hr || i % n === hc);
        cell.classList.toggle("cursor", showCursor && i === cursor);
        cell.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}: ${["puste", "zamalowane", "krzyżyk", "krzyżyk"][s[i]]}`);
      });
      let done = 0;
      rowClues.forEach((d, r) => {
        const line = rowLine(r), ok = eq(Nonogram.runs(filled(line)), rows[r]);
        done += ok;
        d.classList.toggle("ok", ok);
        d.classList.toggle("bad", !ok && Nonogram.lineBad(rows[r], line));
        d.classList.toggle("hot", r === hr || (showCursor && r === ((cursor / n) | 0)));
      });
      colClues.forEach((d, c) => {
        const line = colLine(c), ok = eq(Nonogram.runs(filled(line)), cols[c]);
        done += ok;
        d.classList.toggle("ok", ok);
        d.classList.toggle("bad", !ok && Nonogram.lineBad(cols[c], line));
        d.classList.toggle("hot", c === hc || (showCursor && c === cursor % n));
      });
      stats.set("Linie", `${done} z ${2 * n}`);
      stats.set("Pola", `${count} z ${need}`);
    }
    if (autoX) commit(0, true);
    else render();
  },
});
