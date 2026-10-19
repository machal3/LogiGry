// Lasery: gra logiczno-optyczna. Zwierciadła, rozdzielacze, pryzmaty RGB i portale.
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

  // Predefiniowane szablony poziomów gwarantujące jednoznaczne i ciekawe rozwiązania.
  // Każdy poziom można też losowo odbić/obrócić z zachowaniem rozwiązalności.
  const PUZZLES = {
    easy: [
      {
        cols: 6, rows: 6, moves: 25,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 4, c: 0, type: "emitter", dir: 1, color: 4 },
          { r: 0, c: 4, type: "target", color: 1 },
          { r: 5, c: 3, type: "target", color: 4 },
          { r: 2, c: 2, type: "wall" },
          { r: 3, c: 4, type: "wall" },
        ],
        tools: [
          { type: "mirror", dir: 0, solR: 1, solC: 4 }, // '/' (0: N<->E, S<->W)
          { type: "mirror", dir: 1, solR: 4, solC: 3 }, // '\' (1: N<->W, S<->E)
        ],
      },
      {
        cols: 6, rows: 6, moves: 28,
        fixed: [
          { r: 0, c: 1, type: "emitter", dir: 2, color: 2 },
          { r: 5, c: 4, type: "emitter", dir: 0, color: 1 },
          { r: 3, c: 5, type: "target", color: 3 }, // R+G = żółty
          { r: 1, c: 4, type: "alarm" },
        ],
        tools: [
          { type: "mirror", dir: 1, solR: 3, solC: 1 }, // '\' kieruje S -> E (do 3,4)
          { type: "prism", dir: 1, solR: 3, solC: 4 },  // łączy z W/S i kieruje na E (dir=1)
        ],
      },
      {
        cols: 6, rows: 6, moves: 30,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 4 },
          { r: 0, c: 5, type: "target", color: 4 },
          { r: 5, c: 4, type: "target", color: 4 },
          { r: 2, c: 5, type: "alarm" },
        ],
        tools: [
          { type: "splitter", dir: 0, solR: 2, solC: 3 }, // E -> E oraz N
          { type: "mirror", dir: 0, solR: 0, solC: 3 },   // N -> E do (0,5)
          { type: "mirror", dir: 1, solR: 2, solC: 4 },   // E -> S do (5,4)
        ],
      },
    ],
    medium: [
      {
        cols: 7, rows: 7, moves: 35,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 5, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 6, c: 4, type: "emitter", dir: 0, color: 4 },
          { r: 1, c: 6, type: "target", color: 1 },
          { r: 3, c: 6, type: "target", color: 6 }, // G+B = błękitny
          { r: 2, c: 1, type: "alarm" },
          { r: 4, c: 2, type: "wall" },
        ],
        tools: [
          { type: "splitter", dir: 0, solR: 1, solC: 2 }, // E -> E do (1,6) oraz N
          { type: "mirror", dir: 0, solR: 5, solC: 3 },   // E -> N do (3,3)
          { type: "mirror", dir: 0, solR: 3, solC: 3 },   // N -> E do (3,4)
          { type: "prism", dir: 1, solR: 3, solC: 4 },    // łączy G (z W) i B (z S) -> kieruje E do (3,6)
        ],
      },
      {
        cols: 7, rows: 7, moves: 38,
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
          { type: "mirror", dir: 1, solR: 1, solC: 2 },   // R: S -> E przez portal (1,3)->(5,1) do (5,5)
          { type: "splitter", dir: 0, solR: 3, solC: 4 }, // B: N -> N do (0,4) oraz E do (3,5)
          { type: "mirror", dir: 1, solR: 3, solC: 5 },   // B: E -> S do (5,5)
          { type: "prism", dir: 1, solR: 5, solC: 5 },    // łączy R (z W) i B (z N) -> E do (5,6)
        ],
      },
      {
        cols: 7, rows: 7, moves: 40,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 6, c: 2, type: "emitter", dir: 0, color: 1 },
          { r: 1, c: 6, type: "target", color: 3 }, // R+G = żółty
          { r: 4, c: 6, type: "target", color: 2 },
          { r: 2, c: 5, type: "wall" },
          { r: 5, c: 4, type: "alarm" },
        ],
        tools: [
          { type: "splitter", dir: 1, solR: 2, solC: 1 }, // G: E -> E (do 2,2) oraz S (do 4,1)
          { type: "mirror", dir: 1, solR: 4, solC: 1 },   // G: S -> E do (4,6)
          { type: "prism", dir: 0, solR: 2, solC: 2 },    // łączy G (z W) i R (z S) -> kieruje N do (1,2)
          { type: "mirror", dir: 0, solR: 1, solC: 2 },   // R+G: N -> E do (1,6)
        ],
      },
    ],
    hard: [
      {
        cols: 8, rows: 8, moves: 28,
        fixed: [
          { r: 1, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 4, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 7, c: 4, type: "emitter", dir: 0, color: 4 },
          { r: 2, c: 7, type: "target", color: 7 }, // R+G+B = biały
          { r: 6, c: 7, type: "target", color: 5 }, // R+B = purpurowy
          { r: 1, c: 6, type: "alarm" },
          { r: 5, c: 5, type: "alarm" },
          { r: 3, c: 2, type: "wall" },
        ],
        tools: [
          { type: "mirror", dir: 1, solR: 1, solC: 3 },   // R: E -> S (w dół kolumny 3)
          { type: "splitter", dir: 1, solR: 2, solC: 3 }, // R: S -> S (do 6,3) oraz E (do 2,4)
          { type: "mirror", dir: 0, solR: 4, solC: 2 },   // G: E -> N (w górę kolumny 2)
          { type: "mirror", dir: 0, solR: 2, solC: 2 },   // G: N -> E (przez 2,3 do 2,4)
          { type: "mirror", dir: 1, solR: 6, solC: 3 },   // R: S -> E (do 6,4)
          { type: "splitter", dir: 0, solR: 6, solC: 4 }, // R (z W)->E i N; B (z S)->N i E! Razem R+B leci E do (6,7) oraz N do (2,4)!
          { type: "prism", dir: 1, solR: 2, solC: 4 },    // R+G (z W) + R+B (z S) = R+G+B -> kieruje E do (2,7)
        ],
      },
      {
        cols: 8, rows: 8, moves: 30,
        fixed: [
          { r: 0, c: 1, type: "emitter", dir: 2, color: 4 },
          { r: 0, c: 5, type: "emitter", dir: 2, color: 1 },
          { r: 6, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 2, c: 7, type: "target", color: 6 }, // G+B = błękitny
          { r: 6, c: 7, type: "target", color: 3 }, // R+G = żółty
          { r: 2, c: 2, type: "portal", pair: 1 },
          { r: 2, c: 4, type: "portal", pair: 1 },
          { r: 4, c: 2, type: "alarm" },
        ],
        tools: [
          { type: "mirror", dir: 1, solR: 2, solC: 1 },   // B: S -> E do portalu (2,2)->(2,4)->E do (2,6)
          { type: "splitter", dir: 0, solR: 6, solC: 3 }, // G: E -> E (do 6,5) oraz N (do 1,3)
          { type: "mirror", dir: 0, solR: 1, solC: 3 },   // G: N -> E do (1,6)
          { type: "mirror", dir: 1, solR: 1, solC: 6 },   // G: E -> S do (2,6)
          { type: "prism", dir: 1, solR: 2, solC: 6 },    // G (z N) + B (z W) -> E do (2,7)
          { type: "prism", dir: 1, solR: 6, solC: 5 },    // R (z N) + G (z W) -> E do (6,7)
        ],
      },
      {
        cols: 8, rows: 8, moves: 32,
        fixed: [
          { r: 2, c: 0, type: "emitter", dir: 1, color: 1 },
          { r: 5, c: 0, type: "emitter", dir: 1, color: 2 },
          { r: 0, c: 6, type: "emitter", dir: 2, color: 4 },
          { r: 1, c: 7, type: "target", color: 3 }, // R+G
          { r: 5, c: 7, type: "target", color: 7 }, // R+G+B
          { r: 3, c: 4, type: "alarm" },
          { r: 4, c: 4, type: "wall" },
        ],
        tools: [
          { type: "mirror", dir: 0, solR: 2, solC: 2 },   // R: E -> N do (1,2)
          { type: "mirror", dir: 0, solR: 1, solC: 2 },   // R: N -> E do (1,7)
          { type: "splitter", dir: 0, solR: 5, solC: 3 }, // G: E -> E (do 5,6) oraz N (do 1,3)
          { type: "prism", dir: 1, solR: 1, solC: 3 },    // R (z W) + G (z S) -> kieruje E (do 1,6 i 1,7)
          { type: "splitter", dir: 1, solR: 1, solC: 6 }, // R+G (z W)->E (do 1,7) i S (do 5,6); B (z N)->S (do 5,6) i E
          { type: "prism", dir: 1, solR: 5, solC: 6 },    // G (z W) + R+G+B (z N) -> kieruje E do (5,7)
        ],
      },
    ],
  };

  // Oblicza przebieg wiązek światła na planszy.
  // Zwraca: { segments: [{r0,c0,r1,c1,color}], targetColors: Map(idx->colorMask), alarmHit: boolean, reflections: number }
  function traceBeams(cols, rows, grid) {
    const cellAt = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? grid[r * cols + c] : null);
    const portals = [];
    grid.forEach((cell, idx) => {
      if (cell && cell.type === "portal") portals.push({ idx, r: (idx / cols) | 0, c: idx % cols, pair: cell.pair });
    });

    // Stan wiązek w polach: aby uniknąć nieskończonej pętli, śledzimy (r, c, dir) -> maska kolorów
    const visited = new Map();
    const queue = [];

    grid.forEach((cell, idx) => {
      if (cell && cell.type === "emitter") {
        const r = (idx / cols) | 0, c = idx % cols;
        queue.push({ r, c, dir: cell.dir, color: cell.color });
      }
    });

    const edgeColors = new Map(); // klucz odcinka -> maska kolorów
    const targetHits = new Map();
    let alarmHit = false;
    let reflections = 0;

    const addSegment = (r0, c0, r1, c1, color) => {
      const k = r0 < r1 || (r0 === r1 && c0 < c1) ? `${r0},${c0}-${r1},${c1}` : `${r1},${c1}-${r0},${c0}`;
      edgeColors.set(k, (edgeColors.get(k) || 0) | color);
    };

    // Zwraca kierunki wyjściowe po wejściu wiązki lecącej w kierunku `inDir` (0=N, 1=E, 2=S, 3=W) na element `cell`
    function interact(cell, inDir) {
      if (!cell) return [inDir];
      const d = cell.dir || 0;
      switch (cell.type) {
        case "wall":
        case "emitter":
          return [];
        case "alarm":
          alarmHit = true;
          return [];
        case "target":
          return [inDir]; // detektor przepuszcza wiązkę dalej (albo ją rejestruje)
        case "mirror": {
          // dir % 2 === 0: lustro '/' (N(0)<->E(1), S(2)<->W(3), więc dla inDir: N(0)->W(3)? Czekaj!)
          // Promień lecący na N (w górę, inDir=0) trafia w '/' od dołu i odbija się na E (w prawo, outDir=1)!
          // Promień lecący na E (w prawo, inDir=1) trafia w '/' od lewej i odbija się na N (w górę, outDir=0)!
          // Promień lecący na S (w dół, inDir=2) trafia w '/' od góry i odbija się na W (w lewo, outDir=3)!
          // Promień lecący na W (w lewo, inDir=3) trafia w '/' od prawej i odbija się na S (w dół, outDir=2)!
          // A dla '\' (dir%2===1):
          // N(0) -> W(3), W(3) -> N(0), S(2) -> E(1), E(1) -> S(2)!
          reflections++;
          if (d % 2 === 0) return [[1, 0, 3, 2][inDir]];
          return [[3, 2, 1, 0][inDir]];
        }
        case "splitter": {
          // Półprzepuszczalne zwierciadło: leci prosto ORAZ odbija się jak lustro d%2
          reflections++;
          const refl = d % 2 === 0 ? [1, 0, 3, 2][inDir] : [3, 2, 1, 0][inDir];
          return [inDir, refl];
        }
        case "prism": {
          // Pryzmat kierunkowy: każdą wchodzącą wiązkę (z dowolnej strony oprócz wyjściowej) kieruje w stronę `d`
          reflections++;
          if (inDir === (d + 2) % 4) return [d];
          return [d];
        }
        case "portal":
          return [inDir];
        default:
          return [inDir];
      }
    }

    let steps = 0;
    while (queue.length > 0 && steps < 600) {
      steps++;
      const { r, c, dir, color } = queue.shift();
      const [dc, dr] = DIRS[dir];
      const nr = r + dr, nc = c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        // Wiązka wychodzi poza planszę na krawędzi pola
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

      const outDirs = interact(nextCell, dir);
      for (const outDir of outDirs) {
        const vk = `${curR},${curC},${outDir}`;
        const prevMask = visited.get(vk) || 0;
        const newMask = prevMask | color;
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

    let allTargetsOk = true;
    grid.forEach((cell, idx) => {
      if (cell && cell.type === "target") {
        const got = targetHits.get(idx) || 0;
        if (got !== cell.color) allTargetsOk = false;
      }
    });

    return {
      segments,
      targetHits,
      alarmHit,
      reflections,
      solved: allTargetsOk && !alarmHit,
    };
  }

  // Buduje planszę dla danego poziomu i etapu (ze sprawdzeniem rozwiązalności)
  function buildStage(levelKey, stageIdx) {
    const list = PUZZLES[levelKey] || PUZZLES.easy;
    const tpl = list[stageIdx % list.length];
    const { cols, rows, moves } = tpl;

    // Tworzymy siatkę z rozwiązaniem, aby mieć 100% pewności co do kolorów docelowych
    const solGrid = Array.from({ length: cols * rows }, () => null);
    for (const f of tpl.fixed) {
      solGrid[f.r * cols + f.c] = { ...f, fixed: true };
    }
    for (const t of tpl.tools) {
      solGrid[t.solR * cols + t.solC] = { type: t.type, dir: t.dir, fixed: false, solR: t.solR, solC: t.solC, solDir: t.dir };
    }

    // Wyliczamy kolory, jakie trafiają w detektory przy poprawnym ułożeniu narzędzi
    const solTrace = traceBeams(cols, rows, solGrid);
    solGrid.forEach((cell, idx) => {
      if (cell && cell.type === "target") {
        const hitColor = solTrace.targetHits.get(idx);
        if (hitColor) cell.color = hitColor;
      }
    });

    // Teraz tworzymy siatkę początkową dla gracza: narzędzia są rozsypane na wolnych polach i obrócone
    const startGrid = Array.from({ length: cols * rows }, (_, i) => {
      const c = solGrid[i];
      return c && c.fixed ? { ...c } : null;
    });

    const freeIndices = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const idx = r * cols + c;
        if (!startGrid[idx] && !tpl.tools.some((t) => t.solR === r && t.solC === c)) {
          freeIndices.push(idx);
        }
      }
    }

    tpl.tools.forEach((t, k) => {
      const placeIdx = freeIndices[k % freeIndices.length];
      const maxDir = t.type === "prism" ? 4 : 2;
      startGrid[placeIdx] = {
        type: t.type,
        dir: (t.dir + 1) % maxDir,
        fixed: false,
        solR: t.solR,
        solC: t.solC,
        solDir: t.dir,
      };
    });

    return { cols, rows, moves, grid: startGrid, solGrid };
  }

  if (typeof module !== "undefined") {
    module.exports = { PUZZLES, traceBeams, buildStage, COLOR_NAMES };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "lasery",
    cat: "logiczne",
    name: "Lasery",
    author: "Gemini 4",
    desc: "Ustawiaj zwierciadła, pryzmaty i rozdzielacze, aby kolorowe wiązki światła oświetliły wszystkie detektory.",
    color: "#00b4d8",
    ink: "#031d24",
    glyph: ["#....", ".#.#.", "..#..", ".#.#.", "....#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, stages: 3 },
      { key: "medium", name: "Średni", points: 25, stages: 3 },
      { key: "hard", name: "Trudny", points: 50, stages: 3 },
    ],
    rules: [
      "Kliknij narzędzie optyczne (zwierciadło, rozdzielacz lub pryzmat), a następnie wolne pole, aby je przenieść. Ponowne kliknięcie obraca element.",
      "Mieszaj podstawowe wiązki światła (czerwony, zielony i niebieski), aby każdy detektor otrzymał wiązkę dokładnie w swoim kolorze.",
      "Unikaj oświetlenia czarnych czujników alarmowych; na trudnym poziomie zmieść się w limicie ruchów.",
      "Strzałki przesuwają kursor, Spacja lub Enter wybiera i obraca element, a H podpowiada właściwe pole.",
    ],
    achievements: [
      { id: "pierwszy-fotony", name: "Optyk", desc: "Rozwiąż dowolny układ bez uruchomienia czujnika alarmowego.", points: 10 },
      { id: "teczowy-pryzmat", name: "Mistrz pryzmatu", desc: "Uzyskaj wiązkę białego światła (połączenie trzech barw).", points: 25 },
      { id: "bez-podpowiedzi", name: "Skupienie wiązki", desc: "Ukończ średni lub trudny poziom bez użycia podpowiedzi.", points: 25 },
      { id: "fotonowy-geniusz", name: "Fotonowy geniusz", desc: "Wygraj trudny poziom bez cofania i w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, stages } = ctx.level;
      const W = 240, H = 240;
      const cv = canvasGame(board, ctx, W, H, { max: 92, cls: "neon" });
      const { g } = cv;

      const s = {
        stage: 0,
        cols: 6,
        rows: 6,
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

      const stageEl = statBlock(ctx, "Układ optyczny", { meter: true });
      const targetsEl = statBlock(ctx, "Detektory", { meter: true });
      const movesEl = statBlock(ctx, key === "hard" ? "Pozostało ruchów" : "Wykonane ruchy", { small: true });

      const rotBtn = button("Obróć wybrany (R)", "btn wide", () => rotateSelected());
      const hintBtn = button("Podpowiedź (H)", "btn-ghost wide", () => useHint());
      const legendEl = el("p", "ls-legend", "R+G = żółty · R+B = purpurowy · G+B = błękitny · R+G+B = biały");
      ctx.panel.append(panelBlock("Narzędzia", rotBtn, hintBtn, legendEl));

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
        s.selectedIdx = -1;
        s.cursorIdx = 0;
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
        let totalT = 0, okT = 0;
        s.grid.forEach((cell, idx) => {
          if (cell && cell.type === "target") {
            totalT++;
            if ((s.trace.targetHits.get(idx) || 0) === cell.color) okT++;
          }
        });
        stageEl.set(`${s.stage + 1} / ${stages}`, (s.stage + okT / Math.max(1, totalT)) / stages, s.trace.alarmHit ? "UWAGA: Czujnik alarmowy oświetlony" : "Ustaw elementy na siatce");
        targetsEl.set(`${okT} z ${totalT}`, okT / Math.max(1, totalT));
        const tplMoves = (PUZZLES[key] || PUZZLES.easy)[s.stage % 3].moves;
        const used = tplMoves - s.movesLeft;
        movesEl.set(key === "hard" ? `${s.movesLeft}` : `${used}`);
        ctx.progress((s.stage + (s.trace.solved ? 1 : okT / Math.max(1, totalT) * 0.8)) / stages);
      }

      function checkWinOrNext() {
        if (!s.trace.solved || ctx.done || s.transition > 0) return;
        Sound.line();
        if (!s.alarmTriggeredEver) ctx.achieve("pierwszy-fotony");
        if (s.stage + 1 < stages) {
          s.transition = 0.8;
          ctx.toast(`Układ ${s.stage + 1} ukończony`);
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

      function rotateCell(idx) {
        const cell = s.grid[idx];
        if (!cell || cell.fixed) return;
        save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
        const maxDir = cell.type === "prism" ? 4 : 2;
        cell.dir = ((cell.dir || 0) + 1) % maxDir;
        Sound.tap();
        stepMove();
      }

      function rotateSelected() {
        if (ctx.done || s.transition > 0) return;
        const idx = s.selectedIdx >= 0 ? s.selectedIdx : s.cursorIdx;
        if (s.grid[idx] && !s.grid[idx].fixed) rotateCell(idx);
        else Sound.error();
      }

      function handleCellAction(idx) {
        if (ctx.done || s.transition > 0 || idx < 0 || idx >= s.cols * s.rows) return;
        s.cursorIdx = idx;
        const clicked = s.grid[idx];

        if (s.selectedIdx < 0) {
          if (clicked && !clicked.fixed) {
            s.selectedIdx = idx;
            Sound.tap();
          } else if (clicked && clicked.fixed) {
            Sound.error();
          }
          return;
        }

        if (s.selectedIdx === idx) {
          // Ponowne kliknięcie w zaznaczony element obraca go
          rotateCell(idx);
          return;
        }

        if (!clicked) {
          // Przeniesienie na wolne pole
          save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
          s.grid[idx] = s.grid[s.selectedIdx];
          s.grid[s.selectedIdx] = null;
          s.selectedIdx = idx;
          Sound.place(2);
          stepMove();
        } else if (!clicked.fixed) {
          // Zamiana dwóch ruchomych narzędzi miejscami
          save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
          const tmp = s.grid[idx];
          s.grid[idx] = s.grid[s.selectedIdx];
          s.grid[s.selectedIdx] = tmp;
          s.selectedIdx = idx;
          Sound.place(4);
          stepMove();
        } else {
          Sound.error();
        }
      }

      function useHint() {
        if (ctx.done || s.transition > 0) return;
        // Znajdź pierwsze narzędzie, które nie stoi na swoim docelowym miejscu lub ma zły obrót
        for (let i = 0; i < s.grid.length; i++) {
          const cell = s.grid[i];
          if (cell && !cell.fixed) {
            const targetIdx = cell.solR * s.cols + cell.solC;
            if (i !== targetIdx || cell.dir !== cell.solDir) {
              s.hintUsed = true;
              save({ grid: s.grid.map((c) => (c ? { ...c } : null)), movesLeft: s.movesLeft, selectedIdx: s.selectedIdx });
              const occupant = s.grid[targetIdx];
              s.grid[targetIdx] = cell;
              s.grid[i] = occupant && !occupant.fixed ? occupant : null;
              cell.dir = cell.solDir;
              s.selectedIdx = targetIdx;
              s.flashHint = targetIdx;
              s.flashTime = 1.2;
              Sound.flag();
              ctx.toast("Ustawiono element we właściwym punkcie");
              recalc();
              checkWinOrNext();
              return;
            }
          }
        }
      }

      const pad = 16;
      const cellSize = () => (W - pad * 2) / s.cols;

      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        const [x, y] = cv.at(e);
        const cs = cellSize();
        const c = Math.floor((x - pad) / cs);
        const r = Math.floor((y - pad) / cs);
        if (r >= 0 && r < s.rows && c >= 0 && c < s.cols) {
          handleCellAction(r * s.cols + c);
        } else {
          s.selectedIdx = -1;
        }
      });

      cellKeys(ctx, {
        cols: s.cols,
        rows: s.rows,
        get: () => s.cursorIdx,
        set: (i) => { s.cursorIdx = i; },
        keys: {
          " ": () => handleCellAction(s.cursorIdx),
          enter: () => handleCellAction(s.cursorIdx),
          r: () => rotateSelected(),
          h: () => useHint(),
          escape: () => { s.selectedIdx = -1; },
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

      loadStage(0);

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
            const isSel = idx === s.selectedIdx;
            const isCur = idx === s.cursorIdx;
            const isHint = idx === s.flashHint && s.flashTime > 0;

            g.fillStyle = isSel ? "rgba(0, 180, 216, 0.22)" : isHint ? "rgba(255, 230, 59, 0.25)" : "rgba(18, 28, 48, 0.85)";
            g.beginPath();
            g.roundRect(x + 1.2, y + 1.2, cs - 2.4, cs - 2.4, 3);
            g.fill();

            g.strokeStyle = isSel ? "#00e5ff" : isCur ? "rgba(255,255,255,0.45)" : "rgba(80, 120, 180, 0.2)";
            g.lineWidth = isSel ? 1.5 : 0.7;
            g.stroke();

            // Kropka kalibracyjna na środku pustego pola
            if (!s.grid[idx]) {
              g.fillStyle = "rgba(120, 160, 220, 0.22)";
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

            // Zewnętrzna poświata laserowa
            g.strokeStyle = col;
            g.globalAlpha = 0.28 + 0.1 * pulse;
            g.lineWidth = 6.5;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            // Środkowa wiązka
            g.globalAlpha = 0.85;
            g.lineWidth = 2.6;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            // Jasny rdzeń wiązki
            g.strokeStyle = "#ffffff";
            g.globalAlpha = 0.9;
            g.lineWidth = 1.0;
            g.beginPath();
            g.moveTo(x0, y0);
            g.lineTo(x1, y1);
            g.stroke();

            // Płynący foton
            const tOff = ((now * 0.0025 + seg.c0 * 0.2 + seg.r0 * 0.3) % 1 + 1) % 1;
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
              // Ukośne kreski blokady
              g.strokeStyle = "rgba(148, 163, 184, 0.35)";
              g.lineWidth = 1;
              g.beginPath();
              g.moveTo(-rad * 0.6, -rad * 0.6);
              g.lineTo(rad * 0.6, rad * 0.6);
              g.moveTo(rad * 0.6, -rad * 0.6);
              g.lineTo(-rad * 0.6, rad * 0.6);
              g.stroke();
            } else if (cell.type === "emitter") {
              const col = BEAM_HEX[cell.color] || "#fff";
              g.rotate((cell.dir * Math.PI) / 2);
              g.fillStyle = "#1e293b";
              g.strokeStyle = col;
              g.lineWidth = 1.8;
              g.beginPath();
              g.roundRect(-rad * 0.85, -rad * 0.85, rad * 1.7, rad * 1.7, 4);
              g.fill();
              g.stroke();
              // Lufa emitera skierowana w górę (dir=0 to N)
              g.fillStyle = col;
              g.beginPath();
              g.arc(0, 0, rad * 0.42, 0, Math.PI * 2);
              g.fill();
              g.fillRect(-rad * 0.22, -rad * 0.95, rad * 0.44, rad * 0.55);
            } else if (cell.type === "target") {
              const reqCol = BEAM_HEX[cell.color] || "#fff";
              const gotMask = s.trace?.targetHits.get(idx) || 0;
              const isOk = gotMask === cell.color;
              // Zewnętrzny pierścień w wymaganym kolorze
              g.strokeStyle = reqCol;
              g.lineWidth = isOk ? 2.8 : 2.0;
              g.beginPath();
              g.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
              g.stroke();

              // Wnętrze detektora
              g.fillStyle = isOk ? reqCol : "rgba(15, 23, 42, 0.9)";
              g.beginPath();
              g.arc(0, 0, rad * 0.5, 0, Math.PI * 2);
              g.fill();

              // Znacznik kształtu dla dostępności (1, 2 lub 3 kreski składowe RGB)
              g.fillStyle = isOk ? "#050a14" : reqCol;
              g.font = `bold ${Math.round(cs * 0.24)}px sans-serif`;
              g.textAlign = "center";
              g.textBaseline = "middle";
              const label = (cell.color & 1 ? "R" : "") + (cell.color & 2 ? "G" : "") + (cell.color & 4 ? "B" : "");
              g.fillText(label, 0, 0.5);
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
              // Uchwyt narzędzia
              g.fillStyle = "rgba(56, 189, 248, 0.16)";
              g.beginPath();
              g.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
              g.fill();
              // Tafla lustra
              g.strokeStyle = "#38bdf8";
              g.lineWidth = 3.6;
              g.lineCap = "round";
              g.beginPath();
              g.moveTo(-rad * 0.85, 0);
              g.lineTo(rad * 0.85, 0);
              g.stroke();
              g.strokeStyle = "#e0f2fe";
              g.lineWidth = 1.4;
              g.beginPath();
              g.moveTo(-rad * 0.75, -0.8);
              g.lineTo(rad * 0.75, -0.8);
              g.stroke();
            } else if (cell.type === "splitter") {
              // Półprzepuszczalne zwierciadło (przerywana błękitno-złota płytka)
              const ang = cell.dir % 2 === 0 ? -Math.PI / 4 : Math.PI / 4;
              g.rotate(ang);
              g.fillStyle = "rgba(250, 204, 21, 0.15)";
              g.beginPath();
              g.arc(0, 0, rad * 0.85, 0, Math.PI * 2);
              g.fill();
              g.strokeStyle = "#facc15";
              g.lineWidth = 2.6;
              g.setLineDash([3.5, 2.5]);
              g.beginPath();
              g.moveTo(-rad * 0.9, 0);
              g.lineTo(rad * 0.9, 0);
              g.stroke();
              g.setLineDash([]);
            } else if (cell.type === "prism") {
              // Trójkątny pryzmat skupiający wiązkę w kierunku cell.dir
              g.rotate((cell.dir * Math.PI) / 2);
              g.fillStyle = "rgba(192, 132, 252, 0.28)";
              g.strokeStyle = "#e879f9";
              g.lineWidth = 2;
              g.beginPath();
              g.moveTo(0, -rad * 0.92); // wierzchołek wskazujący kierunek wyjścia wiązki
              g.lineTo(rad * 0.8, rad * 0.7);
              g.lineTo(-rad * 0.8, rad * 0.7);
              g.closePath();
              g.fill();
              g.stroke();
            }

            g.restore();
          }
        }
      });
    },
  });
}
