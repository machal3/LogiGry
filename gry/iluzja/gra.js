// Iluzja: trójwymiarowa łamigłówka architektoniczna inspirowana rycinami M.C. Eschera.
// Obracaj budowlę w rzucie izometrycznym, łącz odległe ścieżki złudzeniem perspektywy i prowadź wędrowca do portalu.
{
  // --- Logika bez DOM: geometria izometryczna, złudzenia perspektywy i solver BFS (test.js) ---

  // Obrót współrzędnych poziomych (x, y) o wielokrotność 90 stopni (dir = 0, 1, 2, 3)
  function rotateXY(x, y, dir, cx = 0, cy = 0) {
    const dx = x - cx;
    const dy = y - cy;
    const d = ((dir % 4) + 4) % 4;
    if (d === 0) return [cx + dx, cy + dy];
    if (d === 1) return [cx - dy, cy + dx];
    if (d === 2) return [cx - dx, cy - dy];
    return [cx + dy, cy - dx];
  }

  // Wyznacza aktualne współrzędne 3D (x, y, z) kafelka przy danym stanie mostu i kolumny
  function getBlockWorldPos(block, spec, state) {
    let x = block.bx;
    let y = block.by;
    let z = block.bz;
    if (block.kind === "bridge" && spec.pivot) {
      [x, y] = rotateXY(x, y, state.bridgeDir || 0, spec.pivot.cx, spec.pivot.cy);
    }
    if (block.kind === "pillar" && state.pillarUp) {
      z += block.liftZ || 2;
    }
    return [x, y, z];
  }

  // Współrzędne pozorne (appU, appV) górnej ściany kafelka w rzucie izometrycznym dla kamery camDir (0..3).
  // Dwa kafelki o (x1,y1,z1) i (x2,y2,z2) stykają się krawędzią na ekranie dokładnie wtedy, gdy |dU| + |dV| === 1.
  function projectApparent(x, y, z, camDir) {
    const [xr, yr] = rotateXY(x, y, camDir, 0, 0);
    return [xr - z, yr - z, xr + yr + z];
  }

  // Zwraca listę połączeń w bieżącym stanie: fizycznych (z1 === z2) oraz złudzeń optycznych (z1 !== z2)
  function getAdjacency(spec, state) {
    const n = spec.blocks.length;
    const coords = spec.blocks.map((b) => getBlockWorldPos(b, spec, state));
    const app = coords.map(([x, y, z]) => projectApparent(x, y, z, state.camDir || 0));
    const adj = Array.from({ length: n }, () => []);
    const illusions = [];

    // Sprawdzenie, czy górna powierzchnia kafelka i jest zasłonięta przez inny kafelek o tym samym (appU, appV) i większym z
    const occluded = new Array(n).fill(false);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (app[i][0] === app[j][0] && app[i][1] === app[j][1] && coords[j][2] > coords[i][2]) {
          occluded[i] = true;
          break;
        }
      }
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const [x1, y1, z1] = coords[i];
        const [x2, y2, z2] = coords[j];

        // 1. Połączenie fizyczne na tym samym piętrze
        if (z1 === z2 && Math.abs(x1 - x2) + Math.abs(y1 - y2) === 1) {
          adj[i].push({ to: j, illusion: false });
          adj[j].push({ to: i, illusion: false });
          continue;
        }

        // 2. Złudzenie perspektywy (most Eschera): dwa gzymsy iluzji (ledge) na różnych wysokościach
        // stykające się krawędzią w aktualnym rzucie izometrycznym
        if (z1 !== z2 && spec.blocks[i].ledge && spec.blocks[j].ledge && !occluded[i] && !occluded[j]) {
          const du = Math.abs(app[i][0] - app[j][0]);
          const dv = Math.abs(app[i][1] - app[j][1]);
          if (du + dv === 1) {
            adj[i].push({ to: j, illusion: true });
            adj[j].push({ to: i, illusion: true });
            illusions.push([i, j]);
          }
        }
      }
    }
    return { adj, illusions, coords, app };
  }

  // Najkrótsza ścieżka po kafelkach (BFS) w bieżącym widoku kamery i układzie mostu
  function findShortestTilePath(spec, state, fromIdx, toIdx) {
    if (fromIdx === toIdx) return [];
    const { adj } = getAdjacency(spec, state);
    const queue = [fromIdx];
    const prev = new Map([[fromIdx, null]]);
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === toIdx) {
        const path = [];
        let node = toIdx;
        while (node !== fromIdx) {
          const info = prev.get(node);
          path.push({ idx: node, illusion: info.illusion });
          node = info.from;
        }
        return path.reverse();
      }
      for (const edge of adj[cur]) {
        if (!prev.has(edge.to)) {
          prev.set(edge.to, { from: cur, illusion: edge.illusion });
          queue.push(edge.to);
        }
      }
    }
    return null;
  }

  // Definicje trzech monumentów (Łatwy, Średni, Trudny)
  const LEVEL_SPECS = {
    easy: {
      title: "Łuk Penrose'a",
      maxMoves: 18,
      pivot: { cx: 0, cy: 0, z: 0 },
      startCam: 0,
      startBridge: 0,
      blocks: [
        // Dolny taras startowy (z = 0)
        { id: 0, bx: -2, by: 2, bz: 0, kind: "start", arch: "pillar" },
        { id: 1, bx: -1, by: 2, bz: 0, kind: "normal", arch: "arch" },
        { id: 2, bx: 0, by: 2, bz: 0, kind: "star", starId: 0, arch: "pillar" },
        // Obrotowy most centralny (oś w (0, 0, 0))
        { id: 3, bx: 0, by: 1, bz: 0, kind: "bridge" },
        { id: 4, bx: 0, by: 0, bz: 0, kind: "bridge", isHub: true, arch: "pillar" },
        { id: 5, bx: 0, by: -1, bz: 0, kind: "bridge" },
        // Zachodni gzyms iluzji (z = 0) -> łączy się w camDir = 1 z B7 (-1, -2, 2)
        { id: 6, bx: -2, by: 0, bz: 0, kind: "normal", ledge: true, arch: "pillar" },
        // Górna wieża portalu (z = 2)
        { id: 7, bx: -1, by: -2, bz: 2, kind: "normal", ledge: true, arch: "pillar" },
        { id: 8, bx: -2, by: -2, bz: 2, kind: "star", starId: 1, arch: "arch" },
        { id: 9, bx: -2, by: -3, bz: 2, kind: "goal", arch: "spire" },
      ],
    },

    medium: {
      title: "Akwedukt Złudzeń",
      maxMoves: 26,
      pivot: { cx: 0, cy: 0, z: 0 },
      startCam: 0,
      startBridge: 0,
      blocks: [
        // Południowy pomost startowy (z = 0)
        { id: 0, bx: 0, by: 3, bz: 0, kind: "start", arch: "pillar" },
        { id: 1, bx: 0, by: 2, bz: 0, kind: "star", starId: 0, arch: "arch" },
        // Obrotowy most centralny (startuje wzdłuż osi X: (-1,0)..(1,0))
        { id: 2, bx: -1, by: 0, bz: 0, kind: "bridge" },
        { id: 3, bx: 0, by: 0, bz: 0, kind: "bridge", isHub: true, arch: "pillar" },
        { id: 4, bx: 1, by: 0, bz: 0, kind: "bridge" },
        // Zachodni gzyms iluzji (z = 0) -> w camDir = 1 łączy się z B6 (-1, -2, 2)
        { id: 5, bx: -2, by: 0, bz: 0, kind: "normal", ledge: true, arch: "pillar" },
        // Środkowy taras (z = 2) z przyciskiem podłogowym
        { id: 6, bx: -1, by: -2, bz: 2, kind: "normal", ledge: true, arch: "pillar" },
        { id: 7, bx: -2, by: -2, bz: 2, kind: "star", starId: 1, arch: "arch" },
        { id: 8, bx: -2, by: -1, bz: 2, kind: "switch", arch: "pillar" },
        // Ruchoma kolumna obelisku: podnosi się z z=0 na z=2 i w camDir=0 łączy z B10 (2, -1, 4)
        { id: 9, bx: -1, by: -3, bz: 0, liftZ: 2, kind: "pillar", ledge: true, arch: "pillar" },
        // Wysokie sanktuarium (z = 4)
        { id: 10, bx: 2, by: -1, bz: 4, kind: "normal", ledge: true, arch: "pillar" },
        { id: 11, bx: 2, by: 0, bz: 4, kind: "star", starId: 2, arch: "arch" },
        { id: 12, bx: 2, by: 1, bz: 4, kind: "goal", arch: "spire" },
      ],
    },

    hard: {
      title: "Katedra Eschera",
      maxMoves: 34,
      pivot: { cx: 0, cy: 0, z: 0 },
      startCam: 0,
      startBridge: 0,
      blocks: [
        // Skrzydło południowe (z = 0)
        { id: 0, bx: -2, by: 2, bz: 0, kind: "start", arch: "pillar" },
        { id: 1, bx: -1, by: 2, bz: 0, kind: "star", starId: 0, arch: "arch" },
        { id: 2, bx: 0, by: 2, bz: 0, kind: "normal", arch: "pillar" },
        // Obrotowy most z gzymsami iluzji na końcach
        { id: 3, bx: -1, by: 0, bz: 0, kind: "bridge", ledge: true },
        { id: 4, bx: 0, by: 0, bz: 0, kind: "bridge", isHub: true, arch: "pillar" },
        { id: 5, bx: 1, by: 0, bz: 0, kind: "bridge", ledge: true },
        // Zachodnia galeria (z = 2): w camDir = 1 łączy się z końcówką mostu (-1, 0, 0)
        { id: 6, bx: 0, by: -2, bz: 2, kind: "normal", ledge: true, arch: "pillar" },
        { id: 7, bx: -1, by: -2, bz: 2, kind: "star", starId: 1, arch: "arch" },
        { id: 8, bx: -2, by: -2, bz: 2, kind: "switch", arch: "pillar" },
        // Wschodni balkon (z = 0)
        { id: 9, bx: 2, by: 0, bz: 0, kind: "normal", arch: "arch" },
        { id: 10, bx: 2, by: -1, bz: 0, kind: "star", starId: 2, arch: "pillar" },
        // Kolumna północna: podnosi się z z=0 na z=2 i w camDir = 0 łączy się z iglicą B12 (3, -1, 4)
        { id: 11, bx: 0, by: -3, bz: 0, liftZ: 2, kind: "pillar", ledge: true, arch: "pillar" },
        // Iglica katedry (z = 4)
        { id: 12, bx: 3, by: -1, bz: 4, kind: "normal", ledge: true, arch: "pillar" },
        { id: 13, bx: 3, by: 0, bz: 4, kind: "star", starId: 3, arch: "arch" },
        { id: 14, bx: 3, by: 1, bz: 4, kind: "goal", arch: "spire" },
      ],
    },
  };

  // Solver BFS przeszukujący przestrzeń stanów (pozycja, camDir, bridgeDir, pillarUp, maska gwiazdek).
  // Używany w test.js do weryfikacji rozwiązywalności oraz w grze do inteligentnych podpowiedzi.
  function solveMonument(spec, startState = null) {
    const starBlocks = spec.blocks.filter((b) => b.kind === "star");
    const totalStars = starBlocks.length;
    const allStarsMask = (1 << totalStars) - 1;
    const goalIdx = spec.blocks.findIndex((b) => b.kind === "goal");
    const startIdx = spec.blocks.findIndex((b) => b.kind === "start");

    const init = startState || {
      playerIdx: startIdx,
      camDir: spec.startCam || 0,
      bridgeDir: spec.startBridge || 0,
      pillarUp: false,
      starsMask: 0,
    };

    const encode = (st) => `${st.playerIdx}|${st.camDir}|${st.bridgeDir % 4}|${st.pillarUp ? 1 : 0}|${st.starsMask}`;
    const queue = [{ ...init, actions: [], moveCost: 0, illusionUsed: false }];
    const visited = new Set([encode(init)]);

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur.playerIdx === goalIdx && cur.starsMask === allStarsMask) {
        return {
          solvable: true,
          actions: cur.actions,
          moveCost: cur.moveCost,
          illusionUsed: cur.illusionUsed,
        };
      }

      // 1. Kroki na sąsiednie kafelki (fizyczne lub przez złudzenie perspektywy)
      const { adj } = getAdjacency(spec, cur);
      for (const edge of adj[cur.playerIdx]) {
        const nextBlock = spec.blocks[edge.to];
        let nextStars = cur.starsMask;
        if (nextBlock.kind === "star") nextStars |= 1 << nextBlock.starId;
        const nextPillar = nextBlock.kind === "switch" ? !cur.pillarUp : cur.pillarUp;
        const nextSt = {
          playerIdx: edge.to,
          camDir: cur.camDir,
          bridgeDir: cur.bridgeDir,
          pillarUp: nextPillar,
          starsMask: nextStars,
        };
        const key = encode(nextSt);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            ...nextSt,
            actions: [...cur.actions, { type: "step", to: edge.to, illusion: edge.illusion }],
            moveCost: cur.moveCost + 1,
            illusionUsed: cur.illusionUsed || edge.illusion,
          });
        }
      }

      // 2. Obrót kamery o 90 stopni (w prawo lub w lewo)
      for (const dCam of [1, 3]) {
        const nextCam = (cur.camDir + dCam) % 4;
        const nextSt = { ...cur, camDir: nextCam };
        const key = encode(nextSt);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            ...nextSt,
            actions: [...cur.actions, { type: "cam", dir: dCam === 1 ? 1 : -1, toCam: nextCam }],
            moveCost: cur.moveCost,
            illusionUsed: cur.illusionUsed,
          });
        }
      }

      // 3. Obrót ruchomego mostu o 90 stopni
      const nextBridge = (cur.bridgeDir + 1) % 4;
      const nextSt = { ...cur, bridgeDir: nextBridge };
      const key = encode(nextSt);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          ...nextSt,
          actions: [...cur.actions, { type: "bridge", toBridge: nextBridge }],
          moveCost: cur.moveCost + 1,
          illusionUsed: cur.illusionUsed,
        });
      }
    }

    return { solvable: false, actions: [], moveCost: Infinity, illusionUsed: false };
  }

  if (typeof module !== "undefined") {
    module.exports = {
      LEVEL_SPECS,
      rotateXY,
      getBlockWorldPos,
      projectApparent,
      getAdjacency,
      findShortestTilePath,
      solveMonument,
    };
  }

  // --- Rejestracja gry w platformie Logigra ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "iluzja",
    cat: "lamiglowki",
    name: "Iluzja",
    author: "Gemini 4 Argon",
    desc: "Obracaj niemożliwe budowle, łącz ścieżki złudzeniem perspektywy i prowadź wędrowca do portalu.",
    color: "#0e7490",
    ink: "#ffffff",
    glyph: [
      ".###.",
      "#.#.#",
      "##.##",
      "#.#.#",
      ".###.",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10 },
      { key: "medium", name: "Średni", points: 25 },
      { key: "hard", name: "Trudny", points: 50 },
    ],
    rules: [
      "Kliknij dowolny osiągalny kafelek (lub użyj strzałek / W, A, S, D), aby poprowadzić wędrowca po budowli.",
      "Obracaj widok kamery o 90 stopni (Q i E, przeciągnięcie lub przyciski), aby odległe gzymsy zeszły się w jedną ścieżkę.",
      "Przekręcaj obrotowy most (R lub kliknięcie koła zębatego) i aktywuj przyciski podłogowe podnoszące kolumny.",
      "Zbierz wszystkie gwiezdne odłamki i wejdź w przebudzony portal przed wyczerpaniem limitu ruchów.",
    ],
    achievements: [
      { id: "pierwszy-most", name: "Architekt złudzeń", desc: "Przejdź po moście utworzonym przez złudzenie perspektywy.", points: 10 },
      { id: "bez-podpowiedzi", name: "Oko mistrza", desc: "Ukończ dowolny poziom bez korzystania z podpowiedzi.", points: 10 },
      { id: "oszczedny-krok", name: "Geometryczna precyzja", desc: "Wygraj poziom, zachowując w zapasie co najmniej 6 ruchów.", points: 25 },
      { id: "mistrz-eschera", name: "Mistrz Eschera", desc: "Wygraj trudny poziom bez cofania ruchów i bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const { key } = ctx.level;
      const spec = LEVEL_SPECS[key] || LEVEL_SPECS.easy;
      const totalStars = spec.blocks.filter((b) => b.kind === "star").length;
      const allStarsMask = (1 << totalStars) - 1;
      const startIdx = spec.blocks.findIndex((b) => b.kind === "start");
      const goalIdx = spec.blocks.findIndex((b) => b.kind === "goal");

      const W = 320, H = 210;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "slate" });
      const { g, theme } = cv;

      const s = {
        playerIdx: startIdx,
        camDir: spec.startCam || 0,
        bridgeDir: spec.startBridge || 0,
        pillarUp: false,
        starsMask: 0,
        moves: 0,
        hinted: false,
        gotIllusionAch: false,

        // Płynna interpolacja kątów i wysokości 3D
        camAngle: (spec.startCam || 0) * (Math.PI / 2),
        camTargetAngle: (spec.startCam || 0) * (Math.PI / 2),
        bridgeAngle: (spec.startBridge || 0) * (Math.PI / 2),
        bridgeTargetAngle: (spec.startBridge || 0) * (Math.PI / 2),
        pillarAnim: 0,

        // Kolejka kroków wędrowca po kliknięciu odległego kafelka
        walkQueue: [],
        walkStepT: 0,
        walkFromPos: null,
        walkToPos: null,
        walkTargetIdx: -1,
        walkIsIllusion: false,

        // Podświetlenie i podpowiedzi
        hoverIdx: -1,
        hoverPath: null,
        hintAction: null,
        hintTimer: 0,
        illusionFlash: 0,

        // Przeciąganie kamery
        dragStart: null,
        dragMoved: false,

        // Cząsteczki świetlne
        particles: [],
      };

      // --- Panel boczny (dokładnie 4 własne bloki zgodnie z AGENTS.md) ---
      const movesBlock = statBlock(ctx, "Zostało ruchów", { meter: true });
      const starsBlock = pipsBlock(ctx, "Gwiezdne odłamki", totalStars, { icon: "star" });
      const infoBlock = statsBlock(ctx, "Budowla", ["Kąt widoku", "Złudzenia", "Most"]);

      const camRow = el("div", "panel-row");
      const btnCamL = button("Widok ⟲", "btn-ghost", () => rotateCamera(-1));
      const btnCamR = button("Widok ⟳", "btn-ghost", () => rotateCamera(1));
      camRow.append(btnCamL, btnCamR);
      const btnBridge = button("Obróć most", "btn wide", () => rotateBridge());
      const btnHint = button("Podpowiedź", "btn-ghost wide", () => triggerHint());
      ctx.panel.append(panelBlock("Sterowanie", camRow, btnBridge, btnHint));

      // Obsługa cofania ruchów
      const saveUndo = ctx.undoable((snap) => {
        s.playerIdx = snap.playerIdx;
        s.camDir = snap.camDir;
        s.bridgeDir = snap.bridgeDir;
        s.pillarUp = snap.pillarUp;
        s.starsMask = snap.starsMask;
        s.moves = snap.moves;
        s.camTargetAngle = s.camDir * (Math.PI / 2);
        s.camAngle = s.camTargetAngle;
        s.bridgeTargetAngle = s.bridgeDir * (Math.PI / 2);
        s.bridgeAngle = s.bridgeTargetAngle;
        s.pillarAnim = s.pillarUp ? 1 : 0;
        s.walkQueue = [];
        s.walkFromPos = null;
        s.hintAction = null;
        updateUI();
      });

      function snapshot() {
        return {
          playerIdx: s.playerIdx,
          camDir: s.camDir,
          bridgeDir: s.bridgeDir,
          pillarUp: s.pillarUp,
          starsMask: s.starsMask,
          moves: s.moves,
        };
      }

      function countBits(mask) {
        let c = 0, m = mask;
        while (m) { c += m & 1; m >>= 1; }
        return c;
      }

      function spawnParticles(wx, wy, wz, colorKey, count = 14) {
        const [sx, sy] = projectContinuous(wx, wy, wz);
        for (let i = 0; i < count; i++) {
          const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
          const spd = 12 + Math.random() * 26;
          s.particles.push({
            x: sx,
            y: sy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 10,
            life: 1,
            colorKey,
            r: 1.4 + Math.random() * 1.6,
          });
        }
      }

      function updateUI() {
        const left = Math.max(0, spec.maxMoves - s.moves);
        movesBlock.set(left, left / spec.maxMoves, `${spec.title} • limit ${spec.maxMoves}`);
        const gotStars = countBits(s.starsMask);
        starsBlock.set(gotStars, gotStars === totalStars ? "Portal jest otwarty" : `Zbierz jeszcze ${totalStars - gotStars}`);

        const { illusions } = getAdjacency(spec, s);
        const angles = ["45° NE", "135° NW", "225° SW", "315° SE"];
        infoBlock.set("Kąt widoku", angles[s.camDir]);
        infoBlock.set("Złudzenia", illusions.length ? `${illusions.length} aktywne` : "Brak");
        infoBlock.set("Most", s.bridgeDir % 2 === 0 ? "Wschód–Zachód" : "Północ–Południe");

        // Postęp: gwiazdki dają 80% paska, dotarcie do portalu 100%
        const prog = (gotStars / totalStars) * 0.85 + (s.playerIdx === goalIdx && gotStars === totalStars ? 0.15 : 0);
        ctx.progress(prog);
      }

      function isAnimating() {
        return (
          s.walkQueue.length > 0 ||
          s.walkFromPos !== null ||
          Math.abs(s.camTargetAngle - s.camAngle) > 0.04 ||
          Math.abs(s.bridgeTargetAngle - s.bridgeAngle) > 0.04
        );
      }

      function rotateCamera(delta) {
        if (ctx.done || s.walkQueue.length > 0 || s.walkFromPos !== null) return;
        const prevIllusions = getAdjacency(spec, s).illusions.length;
        s.camDir = (s.camDir + delta + 4) % 4;
        s.camTargetAngle += delta * (Math.PI / 2);
        s.hintAction = null;
        s.hoverPath = null;
        Sound.tap();
        const nowIllusions = getAdjacency(spec, s).illusions;
        if (nowIllusions.length > prevIllusions) {
          s.illusionFlash = 1;
          Sound.flag();
          for (const [ia, ib] of nowIllusions) {
            const [ax, ay, az] = getBlockWorldPos(spec.blocks[ia], spec, s);
            const [bx, by, bz] = getBlockWorldPos(spec.blocks[ib], spec, s);
            spawnParticles((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5, "gold", 10);
          }
        }
        updateUI();
      }

      function rotateBridge() {
        if (ctx.done || isAnimating()) return;
        saveUndo(snapshot());
        s.bridgeDir = (s.bridgeDir + 1) % 4;
        s.bridgeTargetAngle += Math.PI / 2;
        s.moves++;
        s.hintAction = null;
        s.hoverPath = null;
        Sound.place(3);
        const nowIllusions = getAdjacency(spec, s).illusions;
        if (nowIllusions.length > 0) s.illusionFlash = 1;
        updateUI();
        checkMoveLimit();
      }

      function checkMoveLimit() {
        if (ctx.done) return;
        const onGoalWithStars = s.playerIdx === goalIdx && s.starsMask === allStarsMask;
        if (onGoalWithStars) {
          if (!s.hinted) ctx.achieve("bez-podpowiedzi");
          if (spec.maxMoves - s.moves >= 6) ctx.achieve("oszczedny-krok");
          if (key === "hard" && ctx.undos === 0 && !s.hinted) ctx.achieve("mistrz-eschera");
          ctx.win(`Ukończono budowlę „${spec.title}” w ${plural(s.moves, "ruchu", "ruchach", "ruchach")}.`);
          return;
        }
        if (s.moves >= spec.maxMoves && s.walkQueue.length === 0 && !s.walkFromPos) {
          ctx.lose("Wyczerpano limit ruchów", `Zabrakło kroków przed dotarciem do aktywnego portalu (${s.moves} z ${spec.maxMoves}).`);
        }
      }

      function walkToTile(targetIdx) {
        if (ctx.done || isAnimating() || targetIdx === s.playerIdx || targetIdx < 0) return;
        const path = findShortestTilePath(spec, s, s.playerIdx, targetIdx);
        if (!path || path.length === 0) {
          Sound.error();
          ctx.toast("Ścieżka przerwana: obróć widok lub most");
          return;
        }
        saveUndo(snapshot());
        s.walkQueue = path.slice();
        s.hintAction = null;
        s.hoverPath = null;
        startNextWalkStep();
      }

      function startNextWalkStep() {
        if (s.walkQueue.length === 0) {
          s.walkFromPos = null;
          s.walkToPos = null;
          checkMoveLimit();
          return;
        }
        if (s.moves >= spec.maxMoves) {
          s.walkQueue = [];
          s.walkFromPos = null;
          checkMoveLimit();
          return;
        }
        const step = s.walkQueue.shift();
        s.walkFromPos = getBlockWorldPos(spec.blocks[s.playerIdx], spec, s);
        s.walkToPos = getBlockWorldPos(spec.blocks[step.idx], spec, s);
        s.walkTargetIdx = step.idx;
        s.walkIsIllusion = step.illusion;
        s.walkStepT = 0;
        Sound.tap();
      }

      function completeWalkStep() {
        s.playerIdx = s.walkTargetIdx;
        s.moves++;
        if (s.walkIsIllusion && !s.gotIllusionAch) {
          s.gotIllusionAch = true;
          ctx.achieve("pierwszy-most");
        }
        const blk = spec.blocks[s.playerIdx];
        const [wx, wy, wz] = getBlockWorldPos(blk, spec, s);

        if (blk.kind === "star") {
          const bit = 1 << blk.starId;
          if (!(s.starsMask & bit)) {
            s.starsMask |= bit;
            Sound.line();
            spawnParticles(wx, wy, wz + 0.6, "gold", 18);
            if (s.starsMask === allStarsMask) {
              ctx.toast("Portal przebudzony: udaj się do ołtarza");
              const [gx, gy, gz] = getBlockWorldPos(spec.blocks[goalIdx], spec, s);
              spawnParticles(gx, gy, gz + 0.6, "ok", 20);
            } else {
              ctx.toast("Zebrano gwiezdny odłamek");
            }
          }
        } else if (blk.kind === "switch") {
          s.pillarUp = !s.pillarUp;
          Sound.flag();
          ctx.toast(s.pillarUp ? "Kolumna obelisku uniesiona" : "Kolumna obelisku opuszczona");
          const pBlk = spec.blocks.find((b) => b.kind === "pillar");
          if (pBlk) {
            const [px, py, pz] = getBlockWorldPos(pBlk, spec, s);
            spawnParticles(px, py, pz, "teal", 16);
          }
        }

        updateUI();
        if (s.playerIdx === goalIdx && s.starsMask === allStarsMask) {
          s.walkQueue = [];
          s.walkFromPos = null;
          checkMoveLimit();
          return;
        }
        startNextWalkStep();
      }

      function triggerHint() {
        if (ctx.done || isAnimating()) return;
        s.hinted = true;
        const sol = solveMonument(spec, s);
        if (!sol.solvable || sol.actions.length === 0) {
          ctx.toast("Użyj przycisku Cofnij");
          return;
        }
        const act = sol.actions[0];
        s.hintAction = act;
        s.hintTimer = 3.5;
        Sound.flag();
        if (act.type === "cam") {
          ctx.toast(act.dir > 0 ? "Podpowiedź: obróć widok w prawo (E)" : "Podpowiedź: obróć widok w lewo (Q)");
        } else if (act.type === "bridge") {
          ctx.toast("Podpowiedź: obróć ruchomy most (R)");
        } else if (act.type === "step") {
          ctx.toast(act.illusion ? "Podpowiedź: przejdź przez most iluzji" : "Podpowiedź: idź na wskazane pole");
        }
      }

      // Krok klawiaturą w jednym z 4 kierunków ekranowych (góra-prawo, dół-prawo, dół-lewo, góra-lewo)
      function stepByScreenDir(du, dv) {
        if (ctx.done || isAnimating()) return;
        const { adj, app } = getAdjacency(spec, s);
        const [curU, curV] = app[s.playerIdx];
        for (const edge of adj[s.playerIdx]) {
          const [nu, nv] = app[edge.to];
          if (nu - curU === du && nv - curV === dv) {
            walkToTile(edge.to);
            return;
          }
        }
        Sound.error();
      }

      // --- Projekcja 3D na płótno W × H ---
      const SCALE = 16.5;
      const ORIGIN_X = W * 0.5;
      const ORIGIN_Y = H * 0.56;

      // Ciągłe współrzędne świata dla kafelka podczas animacji mostu i kolumny
      function getAnimatedBlockPos(block) {
        let x = block.bx;
        let y = block.by;
        let z = block.bz;
        if (block.kind === "bridge" && spec.pivot) {
          const dAngle = s.bridgeAngle - (spec.startBridge || 0) * (Math.PI / 2);
          const base = rotateXY(x, y, spec.startBridge || 0, spec.pivot.cx, spec.pivot.cy);
          const dx = base[0] - spec.pivot.cx;
          const dy = base[1] - spec.pivot.cy;
          const c = Math.cos(dAngle), sn = Math.sin(dAngle);
          x = spec.pivot.cx + dx * c - dy * sn;
          y = spec.pivot.cy + dx * sn + dy * c;
        }
        if (block.kind === "pillar") {
          z += (block.liftZ || 2) * s.pillarAnim;
        }
        return [x, y, z];
      }

      function projectContinuous(wx, wy, wz) {
        const c = Math.cos(s.camAngle);
        const sn = Math.sin(s.camAngle);
        const xr = wx * c - wy * sn;
        const yr = wx * sn + wy * c;
        const sx = ORIGIN_X + (xr - yr) * SCALE;
        const sy = ORIGIN_Y + (xr + yr - 2 * wz) * (SCALE * 0.5);
        const depth = xr + yr + wz * 0.92;
        return [sx, sy, depth, xr, yr];
      }

      // Sprawdzenie, czy punkt (px, py) leży wewnątrz wielokąta 2D
      function pointInPoly(px, py, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0], yi = pts[i][1];
          const xj = pts[j][0], yj = pts[j][1];
          const intersect = ((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      }

      function getTopFacePoly(wx, wy, wz, localRot = 0, half = 0.5) {
        const corners = [
          [-half, -half],
          [half, -half],
          [half, half],
          [-half, half],
        ];
        const c = Math.cos(localRot), sn = Math.sin(localRot);
        return corners.map(([lx, ly]) => {
          const rx = wx + lx * c - ly * sn;
          const ry = wy + lx * sn + ly * c;
          return projectContinuous(rx, ry, wz);
        });
      }

      // Przyciski HUD na płótnie (dostępne dotykiem i myszą)
      const HUD_BTNS = [
        { id: "camL", x: 10, y: H - 28, w: 84, h: 21, label: "⟲ Widok (Q)", action: () => rotateCamera(-1) },
        { id: "bridge", x: W * 0.5 - 55, y: H - 28, w: 110, h: 21, label: "⚙ Obróć most (R)", action: () => rotateBridge() },
        { id: "camR", x: W - 94, y: H - 28, w: 84, h: 21, label: "Widok (E) ⟳", action: () => rotateCamera(1) },
      ];

      function hitTestTile(mx, my) {
        // Najpierw sprawdzamy od kafelków najbliższych kamerze
        const items = spec.blocks.map((b, idx) => {
          const [wx, wy, wz] = getAnimatedBlockPos(b);
          const localRot = b.kind === "bridge" ? s.bridgeAngle : 0;
          const poly = getTopFacePoly(wx, wy, wz, localRot, 0.52);
          const [, , depth] = projectContinuous(wx, wy, wz);
          return { idx, poly, depth };
        });
        items.sort((a, b) => b.depth - a.depth);
        for (const it of items) {
          if (pointInPoly(mx, my, it.poly)) return it.idx;
        }
        return -1;
      }

      // --- Zdarzenia myszy, dotyku i klawiatury ---
      cv.cv.addEventListener("pointerdown", (e) => {
        if (ctx.done) return;
        const [mx, my] = cv.at(e);
        s.dragStart = [mx, my];
        s.dragMoved = false;
      });

      cv.cv.addEventListener("pointermove", (e) => {
        const [mx, my] = cv.at(e);
        if (s.dragStart) {
          const dx = mx - s.dragStart[0];
          if (Math.abs(dx) > 22 && !s.dragMoved) {
            s.dragMoved = true;
            rotateCamera(dx > 0 ? 1 : -1);
            s.dragStart = [mx, my];
          }
          return;
        }
        const hit = hitTestTile(mx, my);
        if (hit !== s.hoverIdx) {
          s.hoverIdx = hit;
          s.hoverPath = hit >= 0 && hit !== s.playerIdx && !isAnimating()
            ? findShortestTilePath(spec, s, s.playerIdx, hit)
            : null;
        }
      });

      ctx.on(window, "pointerup", (e) => {
        if (!s.dragStart) return;
        const wasDragged = s.dragMoved;
        s.dragStart = null;
        s.dragMoved = false;
        if (wasDragged || ctx.done) return;

        const r = cv.cv.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
        const [mx, my] = cv.at(e);

        // 1. Kliknięcie przycisków HUD na dole płótna
        for (const hb of HUD_BTNS) {
          if (mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) {
            hb.action();
            return;
          }
        }

        // 2. Kliknięcie kafelka na budowli 3D
        const hit = hitTestTile(mx, my);
        if (hit >= 0) {
          if (hit === s.playerIdx && spec.blocks[hit].kind === "bridge") {
            rotateBridge();
          } else {
            walkToTile(hit);
          }
        }
      });

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
        const k = e.key.toLowerCase();
        if (k === "q" || k === "[") { e.preventDefault(); rotateCamera(-1); }
        else if (k === "e" || k === "]") { e.preventDefault(); rotateCamera(1); }
        else if (k === "r" || (k === " " && !e.target.closest?.("button, a"))) { e.preventDefault(); rotateBridge(); }
        else if (k === "h") { e.preventDefault(); triggerHint(); }
        else if (k === "w" || k === "arrowup") { e.preventDefault(); stepByScreenDir(0, -1); }
        else if (k === "s" || k === "arrowdown") { e.preventDefault(); stepByScreenDir(0, 1); }
        else if (k === "a" || k === "arrowleft") { e.preventDefault(); stepByScreenDir(-1, 0); }
        else if (k === "d" || k === "arrowright") { e.preventDefault(); stepByScreenDir(1, 0); }
      });

      // --- Rysowanie wielokątów i brył 3D ---
      function fillPoly(pts, fill, stroke = null, lineW = 0.8) {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        if (fill) {
          g.fillStyle = fill;
          g.fill();
        }
        if (stroke) {
          g.strokeStyle = stroke;
          g.lineWidth = lineW;
          g.lineJoin = "round";
          g.stroke();
        }
      }

      // Rysuje prostopadłościan 3D z dynamicznym cieniowaniem ścian bocznych przy dowolnym kącie obrotu
      function drawPrism3D(wx, wy, zTop, zBot, localRot, colors, half = 0.5) {
        const corners = [
          [-half, -half],
          [half, -half],
          [half, half],
          [-half, half],
        ];
        const c = Math.cos(localRot), sn = Math.sin(localRot);
        const topPts = [];
        const botPts = [];
        for (const [lx, ly] of corners) {
          const rx = wx + lx * c - ly * sn;
          const ry = wy + lx * sn + ly * c;
          topPts.push(projectContinuous(rx, ry, zTop));
          botPts.push(projectContinuous(rx, ry, zBot));
        }

        // 4 ściany boczne: rysujemy te, których normalna skierowana jest do kamery (w prawo-dół ekranu)
        const totalAngle = s.camAngle + localRot;
        const faceNormals = [
          [0, -1], // krawędź 0->1 (-Y)
          [1, 0],  // krawędź 1->2 (+X)
          [0, 1],  // krawędź 2->3 (+Y)
          [-1, 0], // krawędź 3->0 (-X)
        ];
        const tc = Math.cos(totalAngle), tsn = Math.sin(totalAngle);

        for (let f = 0; f < 4; f++) {
          const [nx0, ny0] = faceNormals[f];
          const nx = nx0 * tc - ny0 * tsn;
          const ny = nx0 * tsn + ny0 * tc;
          // Kamera patrzy z kierunku (+xr, +yr), więc ściana jest widoczna, gdy nx + ny > 0
          if (nx + ny > 0.001) {
            const nxt = (f + 1) % 4;
            const quad = [topPts[f], topPts[nxt], botPts[nxt], botPts[f]];
            const sideColor = nx - ny > 0 ? colors.right : colors.left;
            fillPoly(quad, sideColor, colors.stroke, 0.7);
          }
        }

        // Górna ściana
        if (colors.top) {
          fillPoly(topPts, colors.top, colors.stroke, 0.85);
        }
        return { topPts, botPts };
      }

      // Rysuje detale górnej powierzchni kafelka (używane także w drugim przebiegu dla mostów iluzji Eschera)
      function drawBlockTopSurface(idx, reachableSet, pathSet, timeSec) {
        const b = spec.blocks[idx];
        const [wx, wy, wz] = getAnimatedBlockPos(b);
        const localRot = b.kind === "bridge" ? s.bridgeAngle : 0;
        const topPts = getTopFacePoly(wx, wy, wz, localRot, 0.5);

        let topFill = theme.surface;
        if (b.kind === "bridge") {
          topFill = `color-mix(in srgb, ${theme.orange} 42%, ${theme.surface})`;
        } else if (b.kind === "pillar") {
          topFill = `color-mix(in srgb, ${theme.teal} 42%, ${theme.surface})`;
        } else if (b.kind === "goal") {
          topFill = `color-mix(in srgb, ${s.starsMask === allStarsMask ? theme.ok : theme.c} 40%, ${theme.surface})`;
        } else if (b.kind === "start") {
          topFill = `color-mix(in srgb, ${theme.c} 32%, ${theme.surface})`;
        } else {
          const tierTint = Math.min(48, 16 + wz * 8);
          topFill = `color-mix(in srgb, ${theme.c} ${tierTint}%, ${theme.surface})`;
        }

        if (idx === s.hoverIdx && reachableSet.has(idx)) {
          topFill = `color-mix(in srgb, ${theme.gold} 55%, ${theme.surface})`;
        } else if (pathSet.has(idx)) {
          topFill = `color-mix(in srgb, ${theme.gold} 35%, ${topFill})`;
        }

        fillPoly(topPts, topFill, theme.line, 0.85);

        // Wewnętrzna fazowana płytka kamienna
        const innerPts = getTopFacePoly(wx, wy, wz, localRot, 0.36);
        fillPoly(innerPts, `color-mix(in srgb, ${theme.text} 6%, transparent)`, theme.line, 0.5);

        // Złoty / turkusowy ornament gzymsu iluzji (ledge)
        if (b.ledge) {
          const rimPts = getTopFacePoly(wx, wy, wz, localRot, 0.44);
          fillPoly(rimPts, null, theme.gold, 1.1);
        }

        // Koło zębate na centralnej osi obrotowego mostu
        if (b.isHub) {
          const [cx, cy] = projectContinuous(wx, wy, wz);
          g.save();
          g.strokeStyle = theme.orange;
          g.lineWidth = 1.4;
          g.beginPath();
          g.ellipse(cx, cy, 5.2, 2.8, 0, 0, Math.PI * 2);
          g.stroke();
          g.fillStyle = theme.orange;
          g.beginPath();
          g.arc(cx, cy, 1.7, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        // Przycisk podłogowy (switch)
        if (b.kind === "switch") {
          const swPts = getTopFacePoly(wx, wy, wz + (s.pillarUp ? 0.02 : 0.08), localRot, 0.28);
          fillPoly(swPts, s.pillarUp ? theme.ok : theme.warn, theme.bg, 0.8);
        }

        // Subtelny znacznik osiągalnego pola
        if (reachableSet.has(idx) && idx !== s.playerIdx) {
          const [cx, cy] = projectContinuous(wx, wy, wz);
          g.fillStyle = pathSet.has(idx) ? theme.gold : theme.text;
          g.globalAlpha = pathSet.has(idx) ? 0.95 : 0.35;
          g.beginPath();
          g.arc(cx, cy, pathSet.has(idx) ? 2.1 : 1.3, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }

        // Pulsowanie podpowiedzi na docelowym kafelku
        if (s.hintAction && s.hintAction.type === "step" && s.hintAction.to === idx) {
          const pulse = 0.38 + 0.08 * Math.sin(timeSec * 8);
          const hPts = getTopFacePoly(wx, wy, wz, localRot, pulse);
          fillPoly(hPts, null, theme.gold, 2.0);
        }
      }

      // Rysuje gwiezdny odłamek (obracający się ośmiościan 3D) nad kafelkiem
      function drawStarShard(wx, wy, wz, timeSec) {
        const hoverZ = wz + 0.68 + Math.sin(timeSec * 3.2 + wx) * 0.08;
        const [cx, cy] = projectContinuous(wx, wy, hoverZ);
        const [sx, sy] = projectContinuous(wx, wy, wz + 0.02);

        // Cień na posadzce
        g.fillStyle = "rgba(0, 0, 0, 0.28)";
        g.beginPath();
        g.ellipse(sx, sy, 3.8, 1.9, 0, 0, Math.PI * 2);
        g.fill();

        // Kryształ (ośmiościan)
        const w = 3.6 + Math.sin(timeSec * 4) * 0.6;
        const h = 6.2;
        g.save();
        fillPoly(
          [[cx, cy - h], [cx + w, cy], [cx, cy + h], [cx - w, cy]],
          theme.gold,
          theme.text,
          0.7
        );
        // Wewnętrzny blask
        fillPoly(
          [[cx, cy - h * 0.6], [cx + w * 0.5, cy], [cx, cy + h * 0.6], [cx - w * 0.5, cy]],
          "#ffffff",
          null
        );
        g.restore();
      }

      // Rysuje Portal Ołtarza na kafelku docelowym
      function drawPortalAltar(wx, wy, wz, active, timeSec) {
        const [bx, by] = projectContinuous(wx, wy, wz);
        const [tx, ty] = projectContinuous(wx, wy, wz + 1.15);

        g.save();
        // Kamienne filary bramy portalu
        g.strokeStyle = active ? theme.ok : theme.muted;
        g.lineWidth = 2.4;
        g.beginPath();
        g.ellipse(bx, (by + ty) * 0.5, 6.8, 9.5, 0, Math.PI * 0.85, Math.PI * 2.15);
        g.stroke();

        // Wir świetlny wewnątrz bramy
        const col = active ? theme.ok : theme.c;
        for (let r = 0; r < 3; r++) {
          const rad = 2.2 + r * 1.6 + Math.sin(timeSec * 4 + r) * 0.4;
          g.strokeStyle = r === 0 && active ? theme.gold : col;
          g.lineWidth = 1.2;
          g.globalAlpha = active ? 0.9 - r * 0.2 : 0.45 - r * 0.1;
          g.beginPath();
          g.arc(bx, (by + ty) * 0.52, rad, timeSec * (r % 2 ? -3 : 3), timeSec * (r % 2 ? -3 : 3) + Math.PI * 1.4);
          g.stroke();
        }
        g.restore();
      }

      // Rysuje wędrowca (geometryczna postać w szacie z aureolą/laską)
      function drawTraveler(wx, wy, wz, timeSec) {
        const [px, py] = projectContinuous(wx, wy, wz);
        const bob = s.walkFromPos ? Math.abs(Math.sin(s.walkStepT * Math.PI)) * 3.5 : Math.sin(timeSec * 3) * 0.6;

        g.save();
        // Cień pod stopami
        g.fillStyle = "rgba(0, 0, 0, 0.35)";
        g.beginPath();
        g.ellipse(px, py, 4.4, 2.2, 0, 0, Math.PI * 2);
        g.fill();

        const yBase = py - bob;
        // Szata (stożek izometryczny)
        fillPoly(
          [
            [px, yBase - 13.5],
            [px + 4.6, yBase - 1.2],
            [px, yBase + 1.0],
            [px - 4.6, yBase - 1.2],
          ],
          theme.c,
          theme.on,
          0.9
        );
        // Jasna poła szaty z prawej strony (efekt 3D)
        fillPoly(
          [
            [px, yBase - 13.5],
            [px + 4.6, yBase - 1.2],
            [px, yBase + 1.0],
          ],
          `color-mix(in srgb, ${theme.on} 28%, ${theme.c})`,
          null
        );

        // Głowa i spiczasty kaptur (styl Monument Valley)
        g.fillStyle = theme.on;
        g.beginPath();
        g.arc(px, yBase - 15.2, 2.7, 0, Math.PI * 2);
        g.fill();

        fillPoly(
          [
            [px - 2.4, yBase - 16.2],
            [px + 0.5, yBase - 21.0],
            [px + 2.6, yBase - 15.6],
          ],
          theme.gold,
          theme.on,
          0.6
        );
        g.restore();
      }

      updateUI();

      // --- Główna pętla animacji i renderowania 3D ---
      cv.loop((dt, nowMs) => {
        const timeSec = nowMs * 0.001;

        // 1. Płynne obracanie kamery i mostu oraz podnoszenie kolumny
        s.camAngle += (s.camTargetAngle - s.camAngle) * Math.min(1, dt * 11);
        if (Math.abs(s.camTargetAngle - s.camAngle) < 0.002) s.camAngle = s.camTargetAngle;

        s.bridgeAngle += (s.bridgeTargetAngle - s.bridgeAngle) * Math.min(1, dt * 11);
        if (Math.abs(s.bridgeTargetAngle - s.bridgeAngle) < 0.002) s.bridgeAngle = s.bridgeTargetAngle;

        const targetPillar = s.pillarUp ? 1 : 0;
        s.pillarAnim += (targetPillar - s.pillarAnim) * Math.min(1, dt * 8);

        if (s.illusionFlash > 0) s.illusionFlash = Math.max(0, s.illusionFlash - dt * 1.6);
        if (s.hintTimer > 0) {
          s.hintTimer = Math.max(0, s.hintTimer - dt);
          if (s.hintTimer === 0) s.hintAction = null;
        }

        // 2. Aktualizacja ruchu wędrowca po ścieżce
        if (s.walkFromPos && s.walkToPos) {
          s.walkStepT += dt * 5.2;
          if (s.walkStepT >= 1) {
            completeWalkStep();
          }
        }

        // 3. Tło architektonicznego nieba z subtelną siatką astrolabium
        g.save();
        g.strokeStyle = theme.line;
        g.lineWidth = 0.5;
        g.globalAlpha = 0.35;
        for (const rad of [58, 86, 114]) {
          g.beginPath();
          g.ellipse(ORIGIN_X, ORIGIN_Y - 12, rad, rad * 0.52, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.restore();

        // Wyznaczenie osiągalnych pól i aktywnych złudzeń optycznych
        const cameraAligned =
          Math.abs(s.camTargetAngle - s.camAngle) < 0.06 &&
          Math.abs(s.bridgeTargetAngle - s.bridgeAngle) < 0.06;
        const { illusions } = cameraAligned ? getAdjacency(spec, s) : { illusions: [] };

        const reachableSet = new Set();
        if (cameraAligned && !s.walkFromPos) {
          for (let i = 0; i < spec.blocks.length; i++) {
            if (findShortestTilePath(spec, s, s.playerIdx, i) !== null) reachableSet.add(i);
          }
        }
        const pathSet = new Set((s.hoverPath || []).map((p) => p.idx));

        // 4. Sortowanie brył od najdalszych do najbliższych (algorytm malarza)
        const renderOrder = spec.blocks.map((b, idx) => {
          const [wx, wy, wz] = getAnimatedBlockPos(b);
          const [, , depth] = projectContinuous(wx, wy, wz);
          return { idx, b, wx, wy, wz, depth };
        });
        renderOrder.sort((a, b) => a.depth - b.depth);

        // 5. Pierwszy przebieg: rysowanie kolumn nośnych, ścian bocznych i górnych powierzchni kafelków
        for (const item of renderOrder) {
          const { idx, b, wx, wy, wz } = item;
          const localRot = b.kind === "bridge" ? s.bridgeAngle : 0;

          // Filary i arkady pod blokiem (nadają budowli monumentalny wygląd)
          if (b.arch === "pillar" || b.arch === "spire" || b.kind === "pillar") {
            const pDepth = b.kind === "pillar" ? 2.4 : 1.9;
            drawPrism3D(wx, wy, wz - 0.65, wz - pDepth, localRot, {
              top: null,
              right: `color-mix(in srgb, ${theme.bg} 55%, ${theme.surface})`,
              left: `color-mix(in srgb, ${theme.bg} 72%, ${theme.surface})`,
              stroke: theme.line,
            }, 0.28);
          }

          // Główna bryła kafelka (grubość 0.68 jednostki)
          let baseCol = theme.c;
          if (b.kind === "bridge") baseCol = theme.orange;
          else if (b.kind === "pillar") baseCol = theme.teal;
          else if (b.kind === "goal" && s.starsMask === allStarsMask) baseCol = theme.ok;

          drawPrism3D(wx, wy, wz, wz - 0.68, localRot, {
            top: null,
            right: `color-mix(in srgb, ${baseCol} 32%, ${theme.surface})`,
            left: `color-mix(in srgb, ${baseCol} 16%, ${theme.bg})`,
            stroke: theme.line,
          }, 0.5);

          drawBlockTopSurface(idx, reachableSet, pathSet, timeSec);
        }

        // 6. Drugi przebieg (Escher Top-Face Fusion Pass):
        // Gdy dwa gzymsy na różnych wysokościach tworzą złudzenie perspektywy, przerysowujemy ich górne ściany
        // ponad wszystkimi pionowymi filarami i rysujemy świetliste złącze iluzji, tworząc niemożliwe przejście!
        if (illusions.length > 0) {
          for (const [ia, ib] of illusions) {
            drawBlockTopSurface(ia, reachableSet, pathSet, timeSec);
            drawBlockTopSurface(ib, reachableSet, pathSet, timeSec);

            const [ax, ay, az] = getAnimatedBlockPos(spec.blocks[ia]);
            const [bx, by, bz] = getAnimatedBlockPos(spec.blocks[ib]);
            const [sax, say] = projectContinuous(ax, ay, az);
            const [sbx, sby] = projectContinuous(bx, by, bz);
            const mx = (sax + sbx) * 0.5;
            const my = (say + sby) * 0.5;

            // Świetlisty pomost na styku dwóch poziomów
            g.save();
            g.strokeStyle = theme.gold;
            g.lineWidth = 2.0 + Math.sin(timeSec * 6) * 0.5;
            g.globalAlpha = 0.85;
            g.beginPath();
            g.moveTo(sax, say);
            g.lineTo(sbx, sby);
            g.stroke();

            g.fillStyle = theme.gold;
            g.beginPath();
            g.arc(mx, my, 2.4 + Math.sin(timeSec * 7) * 0.5, 0, Math.PI * 2);
            g.fill();
            g.restore();
          }
        }

        // 7. Podgląd ścieżki do wskazanego kursorem kafelka
        if (s.hoverPath && s.hoverPath.length > 0 && cameraAligned) {
          g.save();
          let prevIdx = s.playerIdx;
          for (const step of s.hoverPath) {
            const [x1, y1, z1] = getAnimatedBlockPos(spec.blocks[prevIdx]);
            const [x2, y2, z2] = getAnimatedBlockPos(spec.blocks[step.idx]);
            const [sx1, sy1] = projectContinuous(x1, y1, z1);
            const [sx2, sy2] = projectContinuous(x2, y2, z2);
            g.strokeStyle = step.illusion ? theme.gold : theme.on;
            g.lineWidth = 1.8;
            g.setLineDash(step.illusion ? [2.5, 2] : []);
            g.beginPath();
            g.moveTo(sx1, sy1);
            g.lineTo(sx2, sy2);
            g.stroke();
            prevIdx = step.idx;
          }
          g.restore();
        }

        // 8. Obiekty ponad posadzką: Gwiezdne Odłamki, Portal i Wędrowiec (posortowane wg głębi)
        const entities = [];
        for (const item of renderOrder) {
          const { b, wx, wy, wz, depth } = item;
          if (b.kind === "star" && !(s.starsMask & (1 << b.starId))) {
            entities.push({ depth: depth + 0.4, draw: () => drawStarShard(wx, wy, wz, timeSec) });
          } else if (b.kind === "goal") {
            entities.push({ depth: depth + 0.5, draw: () => drawPortalAltar(wx, wy, wz, s.starsMask === allStarsMask, timeSec) });
          }
        }

        // Pozycja wędrowca (interpolowana na ekranie, aby płynnie przechodził również przez mosty iluzji!)
        if (s.walkFromPos && s.walkToPos) {
          const t = Math.min(1, s.walkStepT);
          const [sx1, sy1, d1] = projectContinuous(s.walkFromPos[0], s.walkFromPos[1], s.walkFromPos[2]);
          const [sx2, sy2, d2] = projectContinuous(s.walkToPos[0], s.walkToPos[1], s.walkToPos[2]);
          const px = sx1 + (sx2 - sx1) * t;
          const py = sy1 + (sy2 - sy1) * t;
          const pDepth = Math.max(d1, d2) + 0.6;
          entities.push({
            depth: pDepth,
            draw: () => {
              // Rysowanie wędrowca bezpośrednio we współrzędnych ekranu podczas kroku
              const bob = Math.abs(Math.sin(t * Math.PI)) * 3.8;
              g.save();
              g.fillStyle = "rgba(0, 0, 0, 0.32)";
              g.beginPath();
              g.ellipse(px, py, 4.2, 2.1, 0, 0, Math.PI * 2);
              g.fill();
              const yBase = py - bob;
              fillPoly(
                [[px, yBase - 13.5], [px + 4.6, yBase - 1.2], [px, yBase + 1.0], [px - 4.6, yBase - 1.2]],
                theme.c,
                theme.on,
                0.9
              );
              g.fillStyle = theme.on;
              g.beginPath();
              g.arc(px, yBase - 15.2, 2.7, 0, Math.PI * 2);
              g.fill();
              fillPoly(
                [[px - 2.4, yBase - 16.2], [px + 0.5, yBase - 21.0], [px + 2.6, yBase - 15.6]],
                theme.gold,
                theme.on,
                0.6
              );
              g.restore();
            },
          });
        } else {
          const [pwx, pwy, pwz] = getAnimatedBlockPos(spec.blocks[s.playerIdx]);
          const [, , pDepth] = projectContinuous(pwx, pwy, pwz);
          entities.push({
            depth: pDepth + 0.6,
            draw: () => drawTraveler(pwx, pwy, pwz, timeSec),
          });
        }

        entities.sort((a, b) => a.depth - b.depth);
        for (const ent of entities) ent.draw();

        // 9. Cząsteczki świetlne
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt * 1.5;
          if (p.life <= 0) {
            s.particles.splice(i, 1);
            continue;
          }
          g.save();
          g.globalAlpha = Math.max(0, p.life);
          g.fillStyle = theme[p.colorKey] || theme.gold;
          g.beginPath();
          g.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        // 10. Nagłówek budowli i kontrolki HUD na płótnie
        cv.text(spec.title, W * 0.5, 11.5, { size: 8.2, weight: 700, color: "text" });
        const statusTxt = illusions.length > 0
          ? "Złudzenie perspektywy aktywne — ścieżki połączone"
          : "Obracaj widok (Q/E) lub most (R), by łączyć gzymsy";
        cv.text(statusTxt, W * 0.5, 22, {
          size: 5.5,
          weight: 500,
          color: illusions.length > 0 ? "gold" : "muted",
        });

        for (const hb of HUD_BTNS) {
          const isHinted =
            (s.hintAction?.type === "cam" && ((hb.id === "camL" && s.hintAction.dir < 0) || (hb.id === "camR" && s.hintAction.dir > 0))) ||
            (s.hintAction?.type === "bridge" && hb.id === "bridge");

          g.save();
          g.fillStyle = isHinted
            ? `color-mix(in srgb, ${theme.gold} 35%, ${theme.surface})`
            : `color-mix(in srgb, ${theme.surface} 85%, ${theme.bg})`;
          g.strokeStyle = isHinted ? theme.gold : theme.line;
          g.lineWidth = isHinted ? 1.4 : 0.9;
          g.beginPath();
          g.roundRect(hb.x, hb.y, hb.w, hb.h, 6);
          g.fill();
          g.stroke();
          g.restore();

          cv.text(hb.label, hb.x + hb.w * 0.5, hb.y + hb.h * 0.52, {
            size: 6.0,
            weight: 600,
            color: isHinted ? "gold" : "text",
          });
        }
      });
    },
  });
}
