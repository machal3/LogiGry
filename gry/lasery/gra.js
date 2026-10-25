// Lasery: gra logiczno-optyczna. Zwierciadła, rozszczepiacze, pryzmaty kierunkowe, filtry i portale.
{
  const DIRS = [
    [0, -1], // 0: góra (N)
    [1, 0],  // 1: prawo (E)
    [0, 1],  // 2: dół (S)
    [-1, 0], // 3: lewo (W)
  ];

  // Kolory jako maska bitowa: 1 = R (czerwony), 2 = G (zielony), 4 = B (niebieski)
  const COLOR_NAMES = {
    1: "czerwony",
    2: "zielony",
    3: "żółty",
    4: "niebieski",
    5: "purpurowy",
    6: "błękitny",
    7: "biały",
  };

  // Predefiniowane układy optyczne dla każdego poziomu trudności (po 3 etapy na poziom).
  // Każdy element ruchomy posiada współrzędne (r, c), kąt początkowy startRot oraz kąt docelowy solRot.
  const PUZZLES = {
    easy: [
      {
        cols: 6, rows: 6, moves: 22,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 4, c: 0, type: "emitter", dir: 1, color: 4 },
          { r: 0, c: 4, type: "target", color: 1 },
          { r: 5, c: 3, type: "target", color: 4 },
          { r: 2, c: 2, type: "wall" },
          { r: 5, c: 5, type: "alarm" },
        ],
        tools: [
          { r: 1, c: 2, type: "filter", filterColor: 1, startRot: 0, solRot: 1 },
          { r: 1, c: 4, type: "mirror", startRot: 1, solRot: 0 }, // '/' kieruje E -> N do (0,4)
          { r: 4, c: 3, type: "mirror", startRot: 0, solRot: 1 }, // '\' kieruje E -> S do (5,3)
          { r: 3, c: 4, type: "prism", startRot: 3, solRot: 0 },
        ],
      },
      {
        cols: 6, rows: 6, moves: 24,
        fixed: [
          { r: 0, c: 1, type: "emitter", dir: 2, color: 2 },
          { r: 5, c: 4, type: "emitter", dir: 0, color: 1 },
          { r: 2, c: 5, type: "target", color: 3 }, // R+G = żółty
          { r: 5, c: 1, type: "target", color: 2 }, // G = zielony
          { r: 0, c: 4, type: "alarm" },
        ],
        tools: [
          { r: 2, c: 1, type: "splitter", startRot: 0, solRot: 1 }, // '\' dzieli S -> S (do 5,1) oraz E (do 2,4)
          { r: 4, c: 4, type: "filter", filterColor: 1, startRot: 1, solRot: 0 }, // przepuszcza R w osi N/S
          { r: 2, c: 4, type: "prism", startRot: 3, solRot: 1 },    // łączy G (z W) i R (z S) -> kieruje E do (2,5)
          { r: 3, c: 2, type: "mirror", startRot: 1, solRot: 0 },
        ],
      },
      {
        cols: 6, rows: 6, moves: 26,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 4 },
          { r: 5, c: 3, type: "emitter", dir: 0, color: 2 },
          { r: 0, c: 2, type: "target", color: 4 },
          { r: 4, c: 5, type: "target", color: 6 }, // G+B = błękitny
          { r: 2, c: 5, type: "alarm" },
        ],
        tools: [
          { r: 2, c: 2, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli E -> E (do 2,4) oraz N (do 0,2)
          { r: 2, c: 4, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje E -> S do (4,4)
          { r: 4, c: 3, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje N -> E do (4,4)
          { r: 4, c: 4, type: "prism", startRot: 2, solRot: 1 },    // łączy B (z N) i G (z W) -> kieruje E do (4,5)
        ],
      },
    ],
    medium: [
      {
        cols: 7, rows: 7, moves: 30,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 5, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 6, c: 4, type: "emitter", dir: 0, color: 4 },
          { r: 0, c: 2, type: "target", color: 1 },
          { r: 1, c: 6, type: "target", color: 3 }, // R+G = żółty
          { r: 3, c: 6, type: "target", color: 6 }, // G+B = błękitny
          { r: 5, c: 6, type: "alarm" },
        ],
        tools: [
          { r: 1, c: 2, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli R: E -> N (do 0,2) i E (do 1,3)
          { r: 5, c: 1, type: "filter", filterColor: 2, startRot: 0, solRot: 1 }, // przepuszcza G w osi E/W
          { r: 5, c: 3, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje G: E -> N do (3,3)
          { r: 3, c: 3, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli G: N -> N (do 1,3) i E (do 3,4)
          { r: 1, c: 3, type: "prism", startRot: 2, solRot: 1 },    // łączy R (z W) i G (z S) -> E do (1,6)
          { r: 3, c: 4, type: "prism", startRot: 3, solRot: 1 },    // łączy G (z W) i B (z S) -> E do (3,6)
        ],
      },
      {
        cols: 7, rows: 7, moves: 32,
        fixed: [
          { r: 0, c: 2, type: "emitter", dir: 2, color: 1 },
          { r: 6, c: 4, type: "emitter", dir: 0, color: 4 },
          { r: 5, c: 6, type: "target", color: 5 }, // R+B = purpurowy
          { r: 0, c: 4, type: "target", color: 4 },
          { r: 4, c: 2, type: "alarm" },
          { r: 1, c: 3, type: "portal", pair: 1 },
          { r: 5, c: 1, type: "portal", pair: 1 },
        ],
        tools: [
          { r: 1, c: 2, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje R: S -> E przez portal (1,3)->(5,1)
          { r: 5, c: 3, type: "filter", filterColor: 1, startRot: 0, solRot: 1 }, // przepuszcza R w osi E/W do (5,5)
          { r: 3, c: 4, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli B: N -> N (do 0,4) oraz E (do 3,5)
          { r: 1, c: 4, type: "filter", filterColor: 4, startRot: 1, solRot: 0 }, // przepuszcza B w osi N/S do (0,4)
          { r: 3, c: 5, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje B: E -> S do (5,5)
          { r: 5, c: 5, type: "prism", startRot: 0, solRot: 1 },    // łączy R (z W) i B (z N) -> E do (5,6)
        ],
      },
      {
        cols: 7, rows: 7, moves: 34,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 6, c: 2, type: "emitter", dir: 0, color: 1 },
          { r: 1, c: 6, type: "target", color: 3 }, // R+G = żółty
          { r: 4, c: 6, type: "target", color: 2 },
          { r: 2, c: 5, type: "wall" },
          { r: 5, c: 4, type: "alarm" },
        ],
        tools: [
          { r: 2, c: 1, type: "splitter", startRot: 0, solRot: 1 }, // '\' dzieli G: E -> E (do 2,2) oraz S (do 4,1)
          { r: 4, c: 1, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje G: S -> E do (4,6)
          { r: 5, c: 2, type: "filter", filterColor: 1, startRot: 1, solRot: 0 }, // przepuszcza R w osi N/S do (2,2)
          { r: 2, c: 2, type: "prism", startRot: 3, solRot: 0 },    // łączy G (z W) i R (z S) -> kieruje N do (1,2)
          { r: 1, c: 2, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje R+G: N -> E do (1,6)
        ],
      },
    ],
    hard: [
      {
        cols: 8, rows: 8, moves: 24,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 4, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 7, c: 4, type: "emitter", dir: 0, color: 4 },
          { r: 2, c: 7, type: "target", color: 7 }, // R+G+B = biały
          { r: 6, c: 7, type: "target", color: 5 }, // R+B = purpurowy
          { r: 1, c: 6, type: "alarm" },
          { r: 5, c: 5, type: "alarm" },
          { r: 3, c: 1, type: "wall" },
        ],
        tools: [
          { r: 1, c: 3, type: "splitter", startRot: 0, solRot: 1 }, // '\' dzieli R: E -> E (do 1,4) oraz S (do 6,3)
          { r: 1, c: 4, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje R: E -> S do (2,4)
          { r: 4, c: 2, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje G: E -> N do (2,2)
          { r: 2, c: 2, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje G: N -> E do (2,4)
          { r: 6, c: 3, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje R: S -> E do (6,4)
          { r: 6, c: 4, type: "splitter", startRot: 1, solRot: 0 }, // '/' łączy R (z W) i B (z S) -> wysyła R+B na E (do 6,7) i N (do 2,4)
          { r: 2, c: 4, type: "prism", startRot: 3, solRot: 1 },    // łączy R (z N), G (z W) i R+B (z S) -> E do (2,7)
        ],
      },
      {
        cols: 8, rows: 8, moves: 26,
        fixed: [
          { r: 0, c: 1, type: "emitter", dir: 2, color: 4 },
          { r: 0, c: 5, type: "emitter", dir: 2, color: 1 },
          { r: 6, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 2, c: 7, type: "target", color: 6 }, // G+B = błękitny
          { r: 6, c: 7, type: "target", color: 3 }, // R+G = żółty
          { r: 2, c: 2, type: "portal", pair: 1 },
          { r: 2, c: 4, type: "portal", pair: 1 },
          { r: 4, c: 1, type: "alarm" },
        ],
        tools: [
          { r: 2, c: 1, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje B: S -> E do portalu (2,2)->(2,4)->(2,6)
          { r: 6, c: 3, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli G: E -> E (do 6,5) oraz N (do 1,3)
          { r: 1, c: 3, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje G: N -> E do (1,6)
          { r: 1, c: 6, type: "mirror", startRot: 0, solRot: 1 },   // '\' kieruje G: E -> S do (2,6)
          { r: 2, c: 6, type: "prism", startRot: 2, solRot: 1 },    // łączy G (z N) i B (z W) -> E do (2,7)
          { r: 3, c: 5, type: "filter", filterColor: 1, startRot: 1, solRot: 0 }, // przepuszcza R w osi N/S do (6,5)
          { r: 6, c: 5, type: "prism", startRot: 3, solRot: 1 },    // łączy R (z N) i G (z W) -> E do (6,7)
        ],
      },
      {
        cols: 8, rows: 8, moves: 28,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 5, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 7, c: 6, type: "emitter", dir: 0, color: 4 },
          { r: 1, c: 7, type: "target", color: 3 }, // R+G = żółty
          { r: 5, c: 7, type: "target", color: 7 }, // R+G+B = biały
          { r: 3, c: 4, type: "alarm" },
          { r: 4, c: 4, type: "wall" },
        ],
        tools: [
          { r: 2, c: 2, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje R: E -> N do (1,2)
          { r: 1, c: 2, type: "mirror", startRot: 1, solRot: 0 },   // '/' kieruje R: N -> E do (1,3)
          { r: 5, c: 3, type: "splitter", startRot: 1, solRot: 0 }, // '/' dzieli G: E -> E (do 5,6) oraz N (do 1,3)
          { r: 1, c: 3, type: "prism", startRot: 2, solRot: 1 },    // łączy R (z W) i G (z S) -> kieruje E do (1,6)
          { r: 1, c: 6, type: "splitter", startRot: 0, solRot: 1 }, // '\' dzieli R+G: E -> E (do 1,7) oraz S (do 5,6)
          { r: 6, c: 6, type: "filter", filterColor: 4, startRot: 1, solRot: 0 }, // przepuszcza B w osi N/S do (5,6)
          { r: 5, c: 6, type: "prism", startRot: 3, solRot: 1 },    // łączy R+G (z N), G (z W) i B (z S) -> E do (5,7)
        ],
      },
    ],
  };

  // Oblicza przebieg wiązek światła na planszy.
  function traceBeams(cols, rows, grid) {
    const cellAt = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? grid[r * cols + c] : null);
    const portals = [];
    grid.forEach((cell, idx) => {
      if (cell && cell.type === "portal") portals.push({ idx, r: (idx / cols) | 0, c: idx % cols, pair: cell.pair });
    });

    const visited = new Map();
    const queue = [];

    grid.forEach((cell, idx) => {
      if (cell && cell.type === "emitter") {
        const r = (idx / cols) | 0, c = idx % cols;
        queue.push({ r, c, dir: cell.dir, color: cell.color });
      }
    });

    const edgeColors = new Map();
    const targetHits = new Map();
    let alarmHit = false;
    let reflections = 0;

    const addSegment = (r0, c0, r1, c1, color) => {
      const k = r0 < r1 || (r0 === r1 && c0 < c1) ? `${r0},${c0}-${r1},${c1}` : `${r1},${c1}-${r0},${c0}`;
      edgeColors.set(k, (edgeColors.get(k) || 0) | color);
    };

    // Zwraca tablicę par [outDir, outColor] po wejściu wiązki o kierunku `inDir` (0=N, 1=E, 2=S, 3=W) i barwie `inColor`
    function interact(cell, inDir, inColor) {
      if (!cell) return [[inDir, inColor]];
      const d = cell.dir || 0;
      switch (cell.type) {
        case "wall":
        case "emitter":
          return [];
        case "alarm":
          alarmHit = true;
          return [];
        case "target":
          return [[inDir, inColor]];
        case "mirror": {
          // d % 2 === 0: zwierciadło '/' (N<->E, S<->W)
          // d % 2 === 1: zwierciadło '\' (N<->W, S<->E)
          reflections++;
          const outDir = d % 2 === 0 ? [1, 0, 3, 2][inDir] : [3, 2, 1, 0][inDir];
          return [[outDir, inColor]];
        }
        case "splitter": {
          // Półprzepuszczalna płytka: przepuszcza wiązkę prosto ORAZ odbija kopię o 90 stopni
          reflections++;
          const refl = d % 2 === 0 ? [1, 0, 3, 2][inDir] : [3, 2, 1, 0][inDir];
          return [[inDir, inColor], [refl, inColor]];
        }
        case "prism": {
          // Pryzmat kierunkowy: blokuje wiązkę wpadającą od przodu w wierzchołek wyjściowy,
          // natomiast wiązki z pozostałych 3 stron skupia i kieruje w stronę wierzchołka `d`
          const outDir = d % 4;
          if (inDir === (outDir + 2) % 4) return [];
          reflections++;
          return [[outDir, inColor]];
        }
        case "filter": {
          // Bramka / filtr barwny: przepuszcza tylko wzdłuż osi `d % 2` (0 = pionowo N/S, 1 = poziomo E/W)
          // oraz filtruje składową koloru przez `cell.filterColor`
          if (inDir % 2 !== d % 2) return [];
          const filtered = inColor & (cell.filterColor || 7);
          return filtered ? [[inDir, filtered]] : [];
        }
        case "portal":
          return [[inDir, inColor]];
        default:
          return [[inDir, inColor]];
      }
    }

    let steps = 0;
    while (queue.length > 0 && steps < 600) {
      steps++;
      const { r, c, dir, color } = queue.shift();
      const [dc, dr] = DIRS[dir];
      const nr = r + dr, nc = c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        addSegment(r, c, r + dr * 0.48, c + dc * 0.48, color);
        continue;
      }

      addSegment(r, c, nr, nc, color);
      const nextIdx = nr * cols + nc;
      const nextCell = cellAt(nr, nc);

      if (nextCell && nextCell.type === "target") {
        targetHits.set(nextIdx, (targetHits.get(nextIdx) || 0) | color);
      }

      let curR = nr, curC = nc;
      if (nextCell && nextCell.type === "portal") {
        const other = portals.find((p) => p.pair === nextCell.pair && (p.r !== nr || p.c !== nc));
        if (other) {
          curR = other.r;
          curC = other.c;
          reflections++;
        }
      }

      const outs = interact(nextCell, dir, color);
      for (const [outDir, outColor] of outs) {
        const vk = `${curR},${curC},${outDir}`;
        const prevMask = visited.get(vk) || 0;
        const newMask = prevMask | outColor;
        if (newMask !== prevMask) {
          visited.set(vk, newMask);
          queue.push({ r: curR, c: curC, dir: outDir, color: newMask });
        }
      }
    }

    const segments = [];
    for (const [k, color] of edgeColors.entries()) {
      const [p0, p1] = k.split("-");
      const [r0, c0] = p0.split(",").map(Number);
      const [r1, c1] = p1.split(",").map(Number);
      segments.push({ r0, c0, r1, c1, color });
    }

    let totalTargets = 0;
    let activeTargets = 0;
    grid.forEach((cell, idx) => {
      if (cell && cell.type === "target") {
        totalTargets++;
        const got = targetHits.get(idx) || 0;
        if (got === cell.color) activeTargets++;
      }
    });

    return {
      segments,
      targetHits,
      totalTargets,
      activeTargets,
      alarmHit,
      reflections,
      solved: totalTargets > 0 && activeTargets === totalTargets && !alarmHit,
    };
  }

  // Buduje planszę dla danego poziomu i etapu
  function buildStage(levelKey, stageIdx) {
    const list = PUZZLES[levelKey] || PUZZLES.easy;
    const tpl = list[stageIdx % list.length];
    const { cols, rows, moves } = tpl;

    const solGrid = Array.from({ length: cols * rows }, () => null);
    const startGrid = Array.from({ length: cols * rows }, () => null);

    for (const f of tpl.fixed) {
      const idx = f.r * cols + f.c;
      solGrid[idx] = { ...f, fixed: true };
      startGrid[idx] = { ...f, fixed: true };
    }

    for (const t of tpl.tools) {
      const r = t.r ?? t.solR;
      const c = t.c ?? t.solC;
      const solRot = t.solRot ?? t.dir ?? 0;
      const maxDir = t.type === "prism" ? 4 : 2;
      const startRot = t.startRot ?? ((solRot + 1) % maxDir);
      const idx = r * cols + c;

      solGrid[idx] = {
        type: t.type,
        filterColor: t.filterColor,
        dir: solRot,
        fixed: false,
        r,
        c,
        solR: r,
        solC: c,
        solRot,
        solDir: solRot,
      };
      startGrid[idx] = {
        type: t.type,
        filterColor: t.filterColor,
        dir: startRot,
        fixed: false,
        r,
        c,
        solR: r,
        solC: c,
        solRot,
        solDir: solRot,
      };
    }

    return { cols, rows, moves, grid: startGrid, solGrid };
  }

  if (typeof module !== "undefined") {
    module.exports = { PUZZLES, traceBeams, buildStage, COLOR_NAMES };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "lasery",
    cat: "logiczne",
    name: "Lasery",
    author: "Gemini 4 Argon",
    desc: "Ustawiaj zwierciadła, pryzmaty i rozdzielacze, aby kolorowe wiązki światła oświetliły wszystkie detektory.",
    color: "#00b4d8",
    ink: "#031d24",
    glyph: ["#....", ".#.#.", "..#..", ".#.#.", "....#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, stages: 3, cols: 6, rows: 6 },
      { key: "medium", name: "Średni", points: 25, stages: 3, cols: 7, rows: 7 },
      { key: "hard", name: "Trudny", points: 50, stages: 3, cols: 8, rows: 8 },
    ],
    rules: [
      "Kliknij dowolny element optyczny (zwierciadło, rozszczepiacz, pryzmat lub filtr), aby od razu obrócić go o 90 stopni w prawo; prawy przycisk myszy obraca w lewo.",
      "Mieszaj podstawowe wiązki światła (czerwony, zielony i niebieski), aby każdy detektor otrzymał wiązkę dokładnie w swoim kolorze.",
      "Unikaj oświetlenia czerwonych czujników alarmowych; na trudnym poziomie zmieść się w limicie ruchów.",
      "Strzałki przesuwają kursor, Spacja lub Enter obraca element, Q i R obracają w lewo lub w prawo, a H podpowiada właściwy kąt.",
    ],
    achievements: [
      { id: "pierwszy-fotony", name: "Optyk", desc: "Rozwiąż dowolny układ bez uruchomienia czujnika alarmowego.", points: 10 },
      { id: "teczowy-pryzmat", name: "Mistrz pryzmatu", desc: "Uzyskaj wiązkę białego światła (połączenie trzech barw).", points: 25 },
      { id: "bez-podpowiedzi", name: "Skupienie wiązki", desc: "Ukończ średni lub trudny poziom bez użycia podpowiedzi.", points: 25 },
      { id: "fotonowy-geniusz", name: "Fotonowy geniusz", desc: "Wygraj trudny poziom bez cofania i w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, stages, cols: lvCols, rows: lvRows } = ctx.level;
      const defaultSize = lvCols || (key === "easy" ? 6 : key === "medium" ? 7 : 8);
      const W = 240, H = 240;
      const cv = canvasGame(board, ctx, W, H, { max: 92, cls: "neon" });
      const { g } = cv;

      const s = {
        stage: 0,
        cols: defaultSize,
        rows: lvRows || defaultSize,
        grid: [],
        movesLeft: 30,
        selectedIdx: -1,
        cursorIdx: 0,
        alarmTriggeredEver: false,
        hintUsed: false,
        whiteAchieved: false,
        trace: null,
        flashHint: -1,
        flashTime: 0,
        transition: 0,
      };

      // Maksymalnie 4 własne bloki w panelu bocznym
      const stageEl = statBlock(ctx, "Układ optyczny", { meter: true });
      const targetsEl = statBlock(ctx, "Detektory", { meter: true });
      const movesEl = statBlock(ctx, key === "hard" ? "Pozostało ruchów" : "Wykonane ruchy", { small: true });

      const rotRow = el("div", "panel-row");
      const rotLeftBtn = button("W lewo (Q)", "btn-ghost", () => rotateSelected(-1));
      const rotRightBtn = button("Obróć (R)", "btn", () => rotateSelected(1));
      rotRow.append(rotLeftBtn, rotRightBtn);
      const hintBtn = button("Podpowiedź (H)", "btn-ghost wide", () => useHint());
      const legendEl = el("p", "ls-legend", "R+G = żółty · R+B = purpurowy · G+B = błękitny · R+G+B = biały");
      ctx.panel.append(panelBlock("Narzędzia", rotRow, hintBtn, legendEl));

      const save = ctx.undoable((snap) => {
        s.grid = snap.grid.map((c) => (c ? { ...c } : null));
        s.movesLeft = snap.movesLeft;
        s.selectedIdx = snap.selectedIdx;
        recalc();
      });

      function loadStage(idx) {
        const st = buildStage(key, idx);
        s.stage = idx;
        s.cols = st.cols;
        s.rows = st.rows;
        s.grid = st.grid;
        s.movesLeft = st.moves;
        const firstTool = s.grid.findIndex((c) => c && !c.fixed);
        s.selectedIdx = firstTool >= 0 ? firstTool : -1;
        s.cursorIdx = firstTool >= 0 ? firstTool : 0;
        s.flashHint = -1;
        recalc();
      }

      function recalc() {
        s.trace = traceBeams(s.cols, s.rows, s.grid);
        if (s.trace.alarmHit) s.alarmTriggeredEver = true;
        if (!s.whiteAchieved && s.trace.segments.some((seg) => seg.color === 7)) {
          s.whiteAchieved = true;
          ctx.achieve("teczowy-pryzmat");
        }
        updatePanel();
      }

      function updatePanel() {
        const totalT = s.trace.totalTargets;
        const okT = s.trace.activeTargets;
        stageEl.set(
          `${s.stage + 1} z ${stages}`,
          (s.stage + okT / Math.max(1, totalT)) / stages,
          s.trace.alarmHit ? "Uwaga: czujnik alarmowy oświetlony" : "Kliknij element, aby go obrócić"
        );
        targetsEl.set(`${okT} z ${totalT}`, okT / Math.max(1, totalT));
        const tplMoves = (PUZZLES[key] || PUZZLES.easy)[s.stage % 3].moves;
        const used = tplMoves - s.movesLeft;
        movesEl.set(key === "hard" ? `${s.movesLeft}` : `${used}`);
        ctx.progress((s.stage + (s.trace.solved ? 1 : (okT / Math.max(1, totalT)) * 0.8)) / stages);
      }

      function checkWinOrNext() {
        if (!s.trace.solved || ctx.done || s.transition > 0) return;
        Sound.line();
        if (!s.alarmTriggeredEver) ctx.achieve("pierwszy-fotony");
        if (s.stage + 1 < stages) {
          s.transition = 0.8;
          ctx.toast(`Układ ${s.stage + 1} ukończony.`);
          setTimeout(() => {
            if (ctx.done) return;
            s.transition = 0;
            loadStage(s.stage + 1);
          }, 750);
        } else {
          if (!s.hintUsed && key !== "easy") ctx.achieve("bez-podpowiedzi");
          if (key === "hard" && ctx.undos === 0 && ctx.time < 90) ctx.achieve("fotonowy-geniusz");
          ctx.win(`Wszystkie detektory (${stages} układy) zostały prawidłowo oświetlone.`);
        }
      }

      function stepMove() {
        s.movesLeft--;
        recalc();
        checkWinOrNext();
        if (!ctx.done && !s.trace.solved && key === "hard" && s.movesLeft <= 0) {
          ctx.lose("Brak ruchów", "Wyczerpałeś limit korekt optycznych na trudnym poziomie.");
        }
      }

      function rotateCell(idx, delta = 1) {
        const cell = s.grid[idx];
        if (!cell || cell.fixed) return;
        save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
        const maxDir = cell.type === "prism" ? 4 : 2;
        cell.dir = ((cell.dir || 0) + delta + maxDir * 4) % maxDir;
        s.selectedIdx = idx;
        s.cursorIdx = idx;
        Sound.tap();
        stepMove();
      }

      function rotateSelected(delta = 1) {
        if (ctx.done || s.transition > 0) return;
        const idx = s.grid[s.cursorIdx] && !s.grid[s.cursorIdx].fixed ? s.cursorIdx : s.selectedIdx;
        if (idx >= 0 && s.grid[idx] && !s.grid[idx].fixed) rotateCell(idx, delta);
        else Sound.error();
      }

      // Kliknięcie w obracalny element od razu go zaznacza i obraca o 90 stopni
      function handleCellAction(idx, delta = 1) {
        if (ctx.done || s.transition > 0 || idx < 0 || idx >= s.cols * s.rows) return;
        s.cursorIdx = idx;
        const clicked = s.grid[idx];
        if (clicked && !clicked.fixed) {
          rotateCell(idx, delta);
        } else if (clicked && clicked.fixed) {
          Sound.error();
        }
      }

      function useHint() {
        if (ctx.done || s.transition > 0) return;
        for (let i = 0; i < s.grid.length; i++) {
          const cell = s.grid[i];
          if (cell && !cell.fixed) {
            const targetIdx = cell.solR * s.cols + cell.solC;
            if (i !== targetIdx || cell.dir !== cell.solRot) {
              s.hintUsed = true;
              save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
              if (i !== targetIdx) {
                const occupant = s.grid[targetIdx];
                s.grid[targetIdx] = cell;
                s.grid[i] = occupant && !occupant.fixed ? occupant : null;
              }
              cell.dir = cell.solRot;
              s.selectedIdx = targetIdx;
              s.cursorIdx = targetIdx;
              s.flashHint = targetIdx;
              s.flashTime = 1.2;
              Sound.flag();
              ctx.toast("Skalibrowano kąt elementu optycznego.");
              recalc();
              checkWinOrNext();
              return;
            }
          }
        }
      }

      const pad = 16;
      const cellSize = () => (W - pad * 2) / s.cols;

      loadStage(0);

      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        const [x, y] = cv.at(e);
        const cs = cellSize();
        const c = Math.floor((x - pad) / cs);
        const r = Math.floor((y - pad) / cs);
        if (r >= 0 && r < s.rows && c >= 0 && c < s.cols) {
          const delta = e.button === 2 ? -1 : 1;
          handleCellAction(r * s.cols + c, delta);
        }
      });

      ctx.on(cv.cv, "contextmenu", (e) => {
        e.preventDefault();
      });

      cellKeys(ctx, {
        cols: s.cols,
        rows: s.rows,
        get: () => s.cursorIdx,
        set: (i) => {
          s.cursorIdx = i;
          if (s.grid[i] && !s.grid[i].fixed) s.selectedIdx = i;
        },
        keys: {
          " ": () => handleCellAction(s.cursorIdx, 1),
          enter: () => handleCellAction(s.cursorIdx, 1),
          r: () => rotateSelected(1),
          q: () => rotateSelected(-1),
          h: () => useHint(),
        },
      });

      const BEAM_HEX = {
        1: "#ff3b5c", // R
        2: "#2ee66b", // G
        3: "#ffe63b", // R+G = Żółty
        4: "#3898ff", // B
        5: "#e048ff", // R+B = Purpurowy
        6: "#2cf2f2", // G+B = Błękitny
        7: "#ffffff", // R+G+B = Biały
      };

      cv.loop((dt, now) => {
        if (s.flashTime > 0) s.flashTime = Math.max(0, s.flashTime - dt);
        const cs = cellSize();
        const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);

        // Tło laboratoryjne
        g.fillStyle = "#080d18";
        g.fillRect(0, 0, W, H);

        // Siatka optyczna
        for (let r = 0; r < s.rows; r++) {
          for (let c = 0; c < s.cols; c++) {
            const idx = r * s.cols + c;
            const x = pad + c * cs, y = pad + r * cs;
            const cell = s.grid[idx];
            const isMovable = cell && !cell.fixed;
            const isSel = idx === s.selectedIdx;
            const isCur = idx === s.cursorIdx;
            const isHint = idx === s.flashHint && s.flashTime > 0;

            g.fillStyle = isSel
              ? "rgba(0, 180, 216, 0.22)"
              : isHint
              ? "rgba(255, 230, 59, 0.25)"
              : isMovable
              ? "rgba(24, 38, 64, 0.92)"
              : "rgba(16, 25, 44, 0.82)";
            g.beginPath();
            g.roundRect(x + 1.2, y + 1.2, cs - 2.4, cs - 2.4, 3);
            g.fill();

            g.strokeStyle = isSel
              ? "#00e5ff"
              : isCur
              ? "rgba(255, 255, 255, 0.55)"
              : isMovable
              ? "rgba(56, 189, 248, 0.35)"
              : "rgba(80, 120, 180, 0.18)";
            g.lineWidth = isSel || isCur ? 1.5 : 0.7;
            g.stroke();

            if (!cell) {
              g.fillStyle = "rgba(120, 160, 220, 0.2)";
              g.beginPath();
              g.arc(x + cs / 2, y + cs / 2, 1.1, 0, Math.PI * 2);
              g.fill();
            }
          }
        }

        // Rysowanie wiązek laserowych z poświatą
        if (s.trace) {
          g.save();
          g.lineCap = "round";
          for (const seg of s.trace.segments) {
            const x0 = pad + (seg.c0 + 0.5) * cs;
            const y0 = pad + (seg.r0 + 0.5) * cs;
            const x1 = pad + (seg.c1 + 0.5) * cs;
            const y1 = pad + (seg.r1 + 0.5) * cs;
            const col = BEAM_HEX[seg.color] || "#ffffff";

            g.strokeStyle = col;
            g.globalAlpha = 0.28 + 0.1 * pulse;
            g.lineWidth = 6.5;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            g.globalAlpha = 0.85;
            g.lineWidth = 2.6;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            g.strokeStyle = "#ffffff";
            g.globalAlpha = 0.9;
            g.lineWidth = 1.0;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            const tOff = (((now * 0.0025 + seg.c0 * 0.2 + seg.r0 * 0.3) % 1) + 1) % 1;
            const px = x0 + (x1 - x0) * tOff;
            const py = y0 + (y1 - y0) * tOff;
            g.fillStyle = "#ffffff";
            g.globalAlpha = 0.95;
            g.beginPath();
            g.arc(px, py, 1.6, 0, Math.PI * 2);
            g.fill();
          }
          g.restore();
        }

        // Rysowanie elementów na polach
        for (let r = 0; r < s.rows; r++) {
          for (let c = 0; c < s.cols; c++) {
            const idx = r * s.cols + c;
            const cell = s.grid[idx];
            if (!cell) continue;
            const cx = pad + (c + 0.5) * cs;
            const cy = pad + (r + 0.5) * cs;
            const rad = cs * 0.36;

            g.save();
            g.translate(cx, cy);

            if (cell.type === "wall") {
              g.fillStyle = "#1e293b";
              g.strokeStyle = "#475569";
              g.lineWidth = 1.4;
              g.beginPath();
              g.roundRect(-rad, -rad, rad * 2, rad * 2, 3);
              g.fill();
              g.stroke();
              g.strokeStyle = "rgba(148, 163, 184, 0.35)";
              g.lineWidth = 1;
              g.beginPath();
              g.moveTo(-rad * 0.6, -rad * 0.6);
              g.lineTo(rad * 0.6, rad * 0.6);
              g.moveTo(rad * 0.6, -rad * 0.6);
              g.lineTo(-rad * 0.6, rad * 0.6);
              g.stroke();
            } else if (cell.type === "emitter") {
              const col = BEAM_HEX[cell.color] || "#ffffff";
              g.rotate((cell.dir * Math.PI) / 2);
              g.fillStyle = "#1e293b";
              g.strokeStyle = col;
              g.lineWidth = 1.8;
              g.beginPath();
              g.roundRect(-rad * 0.85, -rad * 0.85, rad * 1.7, rad * 1.7, 4);
              g.fill();
              g.stroke();
              g.fillStyle = col;
              g.beginPath();
              g.arc(0, 0, rad * 0.42, 0, Math.PI * 2);
              g.fill();
              g.fillRect(-rad * 0.22, -rad * 0.95, rad * 0.44, rad * 0.55);
            } else if (cell.type === "target") {
              const reqCol = BEAM_HEX[cell.color] || "#ffffff";
              const gotMask = s.trace?.targetHits.get(idx) || 0;
              const isOk = gotMask === cell.color;
              g.strokeStyle = reqCol;
              g.lineWidth = isOk ? 2.8 : 2.0;
              g.beginPath();
              g.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
              g.stroke();

              g.fillStyle = isOk ? reqCol : "rgba(15, 23, 42, 0.92)";
              g.beginPath();
              g.arc(0, 0, rad * 0.54, 0, Math.PI * 2);
              g.fill();

              const label = (cell.color & 1 ? "R" : "") + (cell.color & 2 ? "G" : "") + (cell.color & 4 ? "B" : "");
              cv.text(label, 0, 0.4, {
                size: Math.max(4.2, cs * 0.22),
                weight: 700,
                color: isOk ? "#050a14" : reqCol,
              });
            } else if (cell.type === "alarm") {
              const hit = s.trace?.alarmHit;
              g.fillStyle = hit ? "#ef4444" : "#1e1b2e";
              g.strokeStyle = "#ef4444";
              g.lineWidth = 1.6;
              g.beginPath();
              for (let k = 0; k < 8; k++) {
                const a = (k * Math.PI) / 4;
                const rr = k % 2 === 0 ? rad * 0.9 : rad * 0.5;
                if (k === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
                else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
              }
              g.closePath();
              g.fill();
              g.stroke();
            } else if (cell.type === "portal") {
              g.strokeStyle = "#a855f7";
              g.lineWidth = 2;
              g.beginPath();
              g.arc(0, 0, rad * (0.7 + 0.1 * pulse), 0, Math.PI * 2);
              g.stroke();
              g.strokeStyle = "#ec4899";
              g.lineWidth = 1.2;
              g.beginPath();
              g.arc(0, 0, rad * 0.4, 0, Math.PI * 2);
              g.stroke();
            } else if (cell.type === "mirror") {
              // Zwierciadło: '/' dla dir%2===0, '\' dla dir%2===1
              const ang = cell.dir % 2 === 0 ? -Math.PI / 4 : Math.PI / 4;
              g.rotate(ang);
              g.fillStyle = "rgba(56, 189, 248, 0.16)";
              g.beginPath();
              g.arc(0, 0, rad * 0.86, 0, Math.PI * 2);
              g.fill();
              g.strokeStyle = "#38bdf8";
              g.lineWidth = 3.8;
              g.lineCap = "round";
              g.beginPath();
              g.moveTo(-rad * 0.85, 0);
              g.lineTo(rad * 0.85, 0);
              g.stroke();
              g.strokeStyle = "#e0f2fe";
              g.lineWidth = 1.4;
              g.beginPath();
              g.moveTo(-rad * 0.72, -0.9);
              g.lineTo(rad * 0.72, -0.9);
              g.stroke();
            } else if (cell.type === "splitter") {
              // Rozszczepiacz: półprzezroczysta płytka z przerywanym rdzeniem
              const ang = cell.dir % 2 === 0 ? -Math.PI / 4 : Math.PI / 4;
              g.rotate(ang);
              g.fillStyle = "rgba(250, 204, 21, 0.16)";
              g.beginPath();
              g.arc(0, 0, rad * 0.86, 0, Math.PI * 2);
              g.fill();
              // Półprzezroczysta tafla szkła
              g.fillStyle = "rgba(253, 224, 71, 0.28)";
              g.fillRect(-rad * 0.88, -2.2, rad * 1.76, 4.4);
              g.strokeStyle = "#facc15";
              g.lineWidth = 2.4;
              g.setLineDash([3.2, 2.2]);
              g.beginPath();
              g.moveTo(-rad * 0.88, 0);
              g.lineTo(rad * 0.88, 0);
              g.stroke();
              g.setLineDash([]);
            } else if (cell.type === "prism") {
              // Pryzmat kierunkowy: trójkąt ze strzałką pokazującą kierunek skupionej wiązki
              g.rotate(((cell.dir % 4) * Math.PI) / 2);
              g.fillStyle = "rgba(192, 132, 252, 0.28)";
              g.strokeStyle = "#e879f9";
              g.lineWidth = 1.9;
              g.beginPath();
              g.moveTo(0, -rad * 0.94);
              g.lineTo(rad * 0.82, rad * 0.7);
              g.lineTo(-rad * 0.82, rad * 0.7);
              g.closePath();
              g.fill();
              g.stroke();

              // Strzałka kierunkowa wewnątrz pryzmatu
              g.strokeStyle = "#fae8ff";
              g.lineWidth = 1.3;
              g.beginPath();
              g.moveTo(0, rad * 0.42);
              g.lineTo(0, -rad * 0.42);
              g.lineTo(-rad * 0.26, -rad * 0.12);
              g.moveTo(0, -rad * 0.42);
              g.lineTo(rad * 0.26, -rad * 0.12);
              g.stroke();
            } else if (cell.type === "filter") {
              // Filtr / bramka kierunkowa
              const fCol = BEAM_HEX[cell.filterColor] || "#38bdf8";
              g.rotate(((cell.dir % 2) * Math.PI) / 2);
              g.fillStyle = "rgba(15, 23, 42, 0.85)";
              g.strokeStyle = "#64748b";
              g.lineWidth = 1.4;
              g.beginPath();
              g.arc(0, 0, rad * 0.84, 0, Math.PI * 2);
              g.fill();
              g.stroke();

              // Boczne ścianki bramki (oś przepuszczania to góra-dół po obrocie)
              g.fillStyle = "#475569";
              g.fillRect(-rad * 0.75, -rad * 0.55, rad * 0.32, rad * 1.1);
              g.fillRect(rad * 0.43, -rad * 0.55, rad * 0.32, rad * 1.1);

              // Kolorowa soczewka filtra w środku
              g.strokeStyle = fCol;
              g.lineWidth = 2.6;
              g.beginPath();
              g.moveTo(-rad * 0.38, 0);
              g.lineTo(rad * 0.38, 0);
              g.stroke();
            }

            g.restore();
          }
        }
      });
    },
  });
}
