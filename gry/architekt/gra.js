// Architekt: symulacja inżynieryjna mostów kratownicowych.
// Projektowanie węzłów i belek nad przepaścią, analiza naprężeń i przejazdy ciężkich pojazdów.
{
  const MATERIAL_COSTS = {
    road: 22,  // jezdnia (za odcinek)
    wood: 14,  // drewniana belka kratownicy
    steel: 28, // stalowy dźwigar
    cable: 10, // lina stalowa
  };

  const STAGES = {
    easy: [
      {
        name: "Wąska dolina",
        gap: 120,
        budget: 720,
        anchors: [
          { x: 90, y: 110, fixed: true, deck: true },
          { x: 210, y: 110, fixed: true, deck: true },
          { x: 90, y: 155, fixed: true, deck: false },
          { x: 210, y: 155, fixed: true, deck: false },
        ],
        vehicleWeight: 1.0,
        vehicleName: "Auto osobowe",
      },
      {
        name: "Głęboki wąwóz",
        gap: 140,
        budget: 860,
        anchors: [
          { x: 80, y: 108, fixed: true, deck: true },
          { x: 220, y: 108, fixed: true, deck: true },
          { x: 80, y: 158, fixed: true, deck: false },
          { x: 220, y: 158, fixed: true, deck: false },
        ],
        vehicleWeight: 1.3,
        vehicleName: "Furgonetka",
      },
      {
        name: "Przełom rzeki",
        gap: 160,
        budget: 980,
        anchors: [
          { x: 70, y: 106, fixed: true, deck: true },
          { x: 230, y: 106, fixed: true, deck: true },
          { x: 150, y: 162, fixed: true, deck: false },
        ],
        vehicleWeight: 1.5,
        vehicleName: "Autobus",
      },
    ],
    medium: [
      {
        name: "Kanion skalny",
        gap: 160,
        budget: 1150,
        anchors: [
          { x: 70, y: 105, fixed: true, deck: true },
          { x: 230, y: 105, fixed: true, deck: true },
          { x: 70, y: 158, fixed: true, deck: false },
          { x: 230, y: 158, fixed: true, deck: false },
        ],
        vehicleWeight: 2.0,
        vehicleName: "Ciężarówka",
      },
      {
        name: "Przepaść górska",
        gap: 180,
        budget: 1320,
        anchors: [
          { x: 60, y: 102, fixed: true, deck: true },
          { x: 240, y: 102, fixed: true, deck: true },
          { x: 60, y: 156, fixed: true, deck: false },
          { x: 240, y: 156, fixed: true, deck: false },
        ],
        vehicleWeight: 2.4,
        vehicleName: "Wywrotka z kruszywem",
      },
      {
        name: "Estakada nad wodospadem",
        gap: 190,
        budget: 1450,
        anchors: [
          { x: 55, y: 100, fixed: true, deck: true },
          { x: 245, y: 100, fixed: true, deck: true },
          { x: 150, y: 162, fixed: true, deck: false },
        ],
        vehicleWeight: 2.6,
        vehicleName: "Ciężki dźwig",
      },
    ],
    hard: [
      {
        name: "Wielka rozpadlina",
        gap: 200,
        budget: 1600,
        anchors: [
          { x: 50, y: 98, fixed: true, deck: true },
          { x: 250, y: 98, fixed: true, deck: true },
          { x: 50, y: 158, fixed: true, deck: false },
          { x: 250, y: 158, fixed: true, deck: false },
        ],
        vehicleWeight: 3.0,
        vehicleName: "Konwój budowlany",
      },
      {
        name: "Czeluść bazaltowa",
        gap: 210,
        budget: 1750,
        anchors: [
          { x: 45, y: 96, fixed: true, deck: true },
          { x: 255, y: 96, fixed: true, deck: true },
          { x: 45, y: 156, fixed: true, deck: false },
          { x: 255, y: 156, fixed: true, deck: false },
        ],
        vehicleWeight: 3.4,
        vehicleName: "Ciężki pociąg drogowy",
      },
      {
        name: "Most nad otchłanią",
        gap: 220,
        budget: 1900,
        anchors: [
          { x: 40, y: 95, fixed: true, deck: true },
          { x: 260, y: 95, fixed: true, deck: true },
          { x: 150, y: 165, fixed: true, deck: false },
        ],
        vehicleWeight: 3.8,
        vehicleName: "Megatransportowiec",
      },
    ],
  };

  function calcBridgeCost(edges) {
    let cost = 0;
    for (const e of edges) {
      const base = MATERIAL_COSTS[e.type] || 15;
      const len = e.len || 22;
      cost += Math.round(base * (len / 22));
    }
    return cost;
  }

  // Wyznacza ciągłą ścieżkę jezdni (type === "road") od lewego przyczółka (0) do prawego (1)
  function findRoadPath(nodes, edges, startIdx = 0, endIdx = 1) {
    if (!nodes || nodes.length < 2) return { complete: false, nodePath: [], edgePath: [] };
    const adj = Array.from({ length: nodes.length }, () => []);
    edges.forEach((e, idx) => {
      if (e.type !== "road" || e.broken) return;
      adj[e.i1]?.push({ to: e.i2, edgeIdx: idx });
      adj[e.i2]?.push({ to: e.i1, edgeIdx: idx });
    });

    // Sortujemy sąsiadów w prawo (rosnące x), aby wybierać najprostszą trasę
    for (let i = 0; i < adj.length; i++) {
      adj[i].sort((a, b) => nodes[a.to].x - nodes[b.to].x);
    }

    const visited = new Array(nodes.length).fill(false);
    const parentNode = new Array(nodes.length).fill(-1);
    const parentEdge = new Array(nodes.length).fill(-1);
    const queue = [startIdx];
    visited[startIdx] = true;
    let farthestIdx = startIdx;

    while (queue.length > 0) {
      const cur = queue.shift();
      if (nodes[cur].x > nodes[farthestIdx].x) farthestIdx = cur;
      if (cur === endIdx) break;
      for (const nb of adj[cur]) {
        if (!visited[nb.to] && nodes[nb.to].x >= nodes[cur].x - 8) {
          visited[nb.to] = true;
          parentNode[nb.to] = cur;
          parentEdge[nb.to] = nb.edgeIdx;
          queue.push(nb.to);
        }
      }
    }

    const target = visited[endIdx] ? endIdx : farthestIdx;
    const nodePath = [];
    const edgePath = [];
    let curr = target;
    while (curr !== -1) {
      nodePath.push(curr);
      if (parentEdge[curr] !== -1) edgePath.push(parentEdge[curr]);
      curr = parentNode[curr];
    }
    nodePath.reverse();
    edgePath.reverse();

    return {
      complete: visited[endIdx],
      nodePath,
      edgePath,
    };
  }

  // Oblicza pozycję (x, y) oraz kąt nachylenia pojazdu na ugiętej ścieżce jezdni
  function sampleVehicleOnRoad(simNodes, nodePath, vehicleX) {
    if (!nodePath || nodePath.length === 0) return { x: vehicleX, y: 110, angle: 0, onRoad: false };
    const first = simNodes[nodePath[0]];
    const last = simNodes[nodePath[nodePath.length - 1]];

    if (vehicleX <= first.curX) {
      return { x: vehicleX, y: first.curY, angle: 0, onRoad: true };
    }
    if (vehicleX >= last.curX) {
      return { x: vehicleX, y: last.curY, angle: 0, onRoad: nodePath.length > 1 };
    }

    for (let i = 0; i < nodePath.length - 1; i++) {
      const n1 = simNodes[nodePath[i]];
      const n2 = simNodes[nodePath[i + 1]];
      const minX = Math.min(n1.curX, n2.curX);
      const maxX = Math.max(n1.curX, n2.curX);
      if (vehicleX >= minX && vehicleX <= maxX) {
        const span = Math.max(0.001, n2.curX - n1.curX);
        const t = Math.max(0, Math.min(1, (vehicleX - n1.curX) / span));
        const y = n1.curY + (n2.curY - n1.curY) * t;
        const angle = Math.atan2(n2.curY - n1.curY, span);
        return { x: vehicleX, y, angle, onRoad: true };
      }
    }
    return { x: vehicleX, y: last.curY, angle: 0, onRoad: false };
  }

  // Solwer fizyki kratownicy i ugięcia węzłów pod obciążeniem pojazdu
  function solveTrussStress(nodes, edges, vehicleX, vehicleWeight) {
    let maxStress = 0;
    let deckBroken = false;

    const simNodes = nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
    const activeEdges = edges.filter((e) => !e.broken);

    // Sprawdzamy, które węzły mają podparcie kratownicą (ukośne/pionowe belki lub połączenie z kotwicami)
    // oraz które należą do spójnej składowej połączonej ze stałymi podporami (fixed).
    const adj = Array.from({ length: simNodes.length }, () => []);
    for (const e of activeEdges) {
      adj[e.i1]?.push({ to: e.i2, e });
      adj[e.i2]?.push({ to: e.i1, e });
    }

    // Odległość krawędziowa od dowolnej stałej kotwicy
    const anchorDist = new Array(simNodes.length).fill(Infinity);
    const q = [];
    simNodes.forEach((n, idx) => {
      if (n.fixed) {
        anchorDist[idx] = 0;
        q.push(idx);
      }
    });
    while (q.length > 0) {
      const u = q.shift();
      for (const nb of adj[u]) {
        if (anchorDist[nb.to] > anchorDist[u] + 1) {
          anchorDist[nb.to] = anchorDist[u] + 1;
          q.push(nb.to);
        }
      }
    }

    // Sprawdzenie, czy węzeł ma podparcie kratownicowe (element o składowej pionowej |dy/len| > 0.18)
    const hasVerticalBrace = simNodes.map((n, idx) => {
      if (n.fixed) return true;
      if (anchorDist[idx] === Infinity) return false;
      let verticalLinks = 0;
      for (const nb of adj[idx]) {
        const other = simNodes[nb.to];
        const len = Math.max(1, Math.hypot(other.x - n.x, other.y - n.y));
        const vertRatio = Math.abs(other.y - n.y) / len;
        if (vertRatio > 0.18 && anchorDist[nb.to] < Infinity) {
          verticalLinks++;
        }
      }
      return verticalLinks > 0 && adj[idx].length >= 3;
    });

    // Wyznaczamy węzły jezdni, po których jedzie pojazd
    const roadInfo = findRoadPath(simNodes, activeEdges);
    const onDeckSet = new Set(roadInfo.nodePath);

    // Obliczamy siłę obciążenia dla każdego węzła w jednej iteracji
    const nodeForcesY = simNodes.map((n, idx) => {
      if (n.fixed) return 0;
      if (anchorDist[idx] === Infinity) return 2.2;
      const braced = hasVerticalBrace[idx];
      // Masa własna węzła (większa, jeśli wisi swobodnie bez trójkąta kratownicy)
      let fy = braced ? 0.08 : 0.42;

      const isRoadNode = n.deck || onDeckSet.has(idx);
      if (isRoadNode && Math.abs(n.x - vehicleX) < 38) {
        const loadDist = Math.max(0, 1 - Math.abs(n.x - vehicleX) / 38);
        // Węzeł podparty kratownicą przenosi obciążenie sprężyście, a niepodparty ugina się silnie
        fy += loadDist * vehicleWeight * (braced ? 0.34 : 1.75);
      }
      return fy;
    });

    // Relaksacja sprężysta układu (równowaga sił grawitacji i sztywności prętów)
    const iterations = 28;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < simNodes.length; i++) {
        if (!simNodes[i].fixed) {
          simNodes[i].curY += nodeForcesY[i];
        }
      }

      for (const e of activeEdges) {
        const n1 = simNodes[e.i1];
        const n2 = simNodes[e.i2];
        const dx = n2.curX - n1.curX;
        const dy = n2.curY - n1.curY;
        const curLen = Math.hypot(dx, dy) || 1;
        const baseLen = e.len || Math.hypot(n2.x - n1.x, n2.y - n1.y) || 1;
        const diff = (curLen - baseLen) / curLen;

        // Sztywność materiału
        const k = e.type === "steel" ? 0.48 : e.type === "wood" ? 0.40 : 0.30;
        if (!n1.fixed && !n2.fixed) {
          n1.curX += dx * diff * k;
          n1.curY += dy * diff * k;
          n2.curX -= dx * diff * k;
          n2.curY -= dy * diff * k;
        } else if (!n1.fixed) {
          n1.curX += dx * diff * (k * 1.65);
          n1.curY += dy * diff * (k * 1.65);
        } else if (!n2.fixed) {
          n2.curX -= dx * diff * (k * 1.65);
          n2.curY -= dy * diff * (k * 1.65);
        }
      }
    }

    // Obliczenie naprężenia (odkształcenie osiowe + zginanie niepodpartego przęsła jezdni)
    for (const e of edges) {
      if (e.broken) {
        e.stress = 1.5;
        maxStress = Math.max(maxStress, 1.5);
        if (e.type === "road") deckBroken = true;
        continue;
      }
      const n1 = simNodes[e.i1];
      const n2 = simNodes[e.i2];
      const baseLen = Math.max(1, e.len || Math.hypot(n2.x - n1.x, n2.y - n1.y));
      const curLen = Math.hypot(n2.curX - n1.curX, n2.curY - n1.curY);
      const axialStrain = Math.abs(curLen - baseLen) / baseLen;

      // Ugięcie pionowe węzłów względem stanu spoczynkowego
      const sag1 = Math.max(0, n1.curY - n1.y);
      const sag2 = Math.max(0, n2.curY - n2.y);
      const maxSag = Math.max(sag1, sag2);
      const unbracedNode = (!n1.fixed && !hasVerticalBrace[e.i1]) || (!n2.fixed && !hasVerticalBrace[e.i2]);

      // Przęsło bez kratownicy ulega silnemu zginaniu pod kołami pojazdu
      const bendingStrain = (unbracedNode ? maxSag * 0.028 : maxSag * 0.0045);
      const totalStrain = axialStrain + bendingStrain;

      const maxAllowed = e.type === "steel" ? 0.24 : e.type === "wood" ? 0.16 : 0.14;
      const stress = Math.min(1.5, totalStrain / maxAllowed);
      e.stress = stress;
      maxStress = Math.max(maxStress, stress);
      if (stress >= 1.0) {
        e.broken = true;
        if (e.type === "road") deckBroken = true;
      }
    }

    return { maxStress, deckBroken, simNodes };
  }

  // Pomocniczy generator poprawnej kratownicy do testów i weryfikacji etapów
  function buildSampleTruss(stage, material = "steel") {
    const nodes = stage.anchors.map((a) => ({ ...a }));
    const edges = [];
    const left = nodes[0];
    const right = nodes[1];
    const segs = Math.max(3, Math.round((right.x - left.x) / 42));
    const deckIdx = [0];

    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      nodes.push({
        x: Math.round(left.x + (right.x - left.x) * t),
        y: Math.round(left.y + (right.y - left.y) * t),
        fixed: false,
        deck: true,
      });
      deckIdx.push(nodes.length - 1);
    }
    deckIdx.push(1);

    const addEdge = (i1, i2, type) => {
      const a = Math.min(i1, i2);
      const b = Math.max(i1, i2);
      if (a === b || edges.some((e) => e.i1 === a && e.i2 === b)) return;
      const len = Math.hypot(nodes[b].x - nodes[a].x, nodes[b].y - nodes[a].y);
      edges.push({ i1: a, i2: b, type, len, stress: 0 });
    };

    // Ciągła jezdnia
    for (let i = 0; i < deckIdx.length - 1; i++) {
      addEdge(deckIdx[i], deckIdx[i + 1], "road");
    }

    // Górny pas kratownicy (trójkąty Warrena nad jezdnią)
    const topIdx = [];
    for (let i = 0; i < deckIdx.length - 1; i++) {
      const n1 = nodes[deckIdx[i]];
      const n2 = nodes[deckIdx[i + 1]];
      nodes.push({
        x: Math.round((n1.x + n2.x) / 2),
        y: Math.round(Math.min(n1.y, n2.y) - 32),
        fixed: false,
        deck: false,
      });
      const tIdx = nodes.length - 1;
      topIdx.push(tIdx);
      addEdge(deckIdx[i], tIdx, material);
      addEdge(deckIdx[i + 1], tIdx, material);
    }
    for (let i = 0; i < topIdx.length - 1; i++) {
      addEdge(topIdx[i], topIdx[i + 1], material);
    }

    // Zastrzały do dolnych kotwic, jeśli są w zasięgu
    for (let aIdx = 2; aIdx < stage.anchors.length; aIdx++) {
      for (const dIdx of deckIdx) {
        const dist = Math.hypot(nodes[dIdx].x - nodes[aIdx].x, nodes[dIdx].y - nodes[aIdx].y);
        if (dist <= 84) {
          addEdge(dIdx, aIdx, material);
        }
      }
    }

    return { nodes, edges };
  }

  if (typeof module !== "undefined") {
    module.exports = {
      MATERIAL_COSTS,
      STAGES,
      calcBridgeCost,
      findRoadPath,
      sampleVehicleOnRoad,
      solveTrussStress,
      buildSampleTruss,
    };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "architekt",
    cat: "strategia",
    name: "Architekt",
    author: "Gemini 4",
    desc: "Buduj kratownicowe mosty nad przepaścią w ramach budżetu i sprawdzaj, czy wytrzymają przejazd ciężarówki.",
    color: "#059669",
    ink: "#ffffff",
    glyph: [
      ".....",
      "#####",
      "#.#.#",
      ".#.#.",
      "#...#",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, stagesCount: 3 },
      { key: "medium", name: "Średni", points: 25, stagesCount: 3 },
      { key: "hard", name: "Trudny", points: 50, stagesCount: 3 },
    ],
    rules: [
      "Przeciągaj między węzłami, aby budować jezdnię, drewniane belki kratownicy oraz stalowe dźwigary.",
      "Sama pozioma jezdnia ugnie się i pęknie pod ciężarem pojazdu — podeprzyj ją trójkątną kratownicą od dołu lub od góry.",
      "Wybierz narzędzie Usuń (albo kliknij prawym przyciskiem myszy na belkę), aby skasować wybrany element i odzyskać budżet.",
      "Uruchom przejazd próbny (Spacja) i przeprowadź bezpiecznie pojazd na prawy brzeg na wszystkich etapach.",
    ],
    achievements: [
      { id: "pierwszy-most", name: "Pierwszy most", desc: "Zbuduj most, który utrzyma przejazd pierwszego pojazdu.", points: 10 },
      { id: "oszczedny-inzynier", name: "Oszczędny inżynier", desc: "Ukończ dowolny etap, zużywając mniej niż 70% budżetu.", points: 25 },
      { id: "stalowa-konstrukcja", name: "Konstrukcja ze stali", desc: "Przeprowadź pojazd z naprężeniem belek poniżej 65%.", points: 25 },
      { id: "mistrz-architekt", name: "Mistrz architektury", desc: "Ukończ wszystkie etapy trudnego poziomu w ramach budżetu.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, stagesCount } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96 });
      const { g, theme } = cv;

      const stageList = STAGES[key] || STAGES.easy;
      const s = {
        stageIdx: 0,
        nodes: [],
        edges: [],
        simNodes: [],
        tool: "wood", // "road", "wood", "steel", "erase"
        simulating: false,
        falling: false,
        vehicleX: 0,
        vehicleY: 100,
        vehicleVy: 0,
        vehicleAngle: 0,
        vehicleV: 38,
        wheelRot: 0,
        maxStressEver: 0,
        dragStartNode: -1,
        hoverEdge: -1,
        cursorX: 0,
        cursorY: 0,
        dust: [],
      };

      const cloneState = () => ({
        nodes: s.nodes.map((n) => ({ ...n })),
        edges: s.edges.map((e) => ({ ...e, broken: false, stress: 0 })),
      });

      const saveUndo = ctx.undoable((prev) => {
        if (!prev) return;
        s.simulating = false;
        s.falling = false;
        s.nodes = prev.nodes.map((n) => ({ ...n }));
        s.edges = prev.edges.map((e) => ({ ...e, broken: false, stress: 0 }));
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
        s.maxStressEver = 0;
        Sound.erase();
        updatePanel();
      });

      function initStage(idx) {
        const st = stageList[idx % stageList.length];
        s.nodes = st.anchors.map((a) => ({ ...a }));
        s.edges = [];
        s.simulating = false;
        s.falling = false;
        s.vehicleX = st.anchors[0].x - 18;
        s.vehicleY = st.anchors[0].y;
        s.vehicleVy = 0;
        s.vehicleAngle = 0;
        s.maxStressEver = 0;
        s.dragStartNode = -1;
        s.hoverEdge = -1;

        // Domyślne przęsła jezdni między lewym a prawym przyczółkiem (wymagają podparcia kratownicą)
        const left = st.anchors[0];
        const right = st.anchors[1];
        const segs = Math.max(4, Math.round((right.x - left.x) / 42));
        const deckIndices = [0];

        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          const nx = Math.round(left.x + (right.x - left.x) * t);
          const ny = Math.round(left.y + (right.y - left.y) * t);
          s.nodes.push({ x: nx, y: ny, fixed: false, deck: true });
          deckIndices.push(s.nodes.length - 1);
        }
        deckIndices.push(1);

        for (let i = 0; i < deckIndices.length - 1; i++) {
          const i1 = deckIndices[i], i2 = deckIndices[i + 1];
          const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
          s.edges.push({ i1, i2, type: "road", len, stress: 0, broken: false });
        }
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
      }

      initStage(0);

      const budgetEl = statBlock(ctx, "Budżet budowy", { meter: true });
      const stressEl = statBlock(ctx, "Naprężenie", { meter: true });
      const stageEl = statBlock(ctx, "Etap budowy", { small: true });

      const matSeg = segmented("Materiał", ["Jezdnia", "Drewno", "Stal"], (k) => {
        s.tool = ["road", "wood", "steel"][k];
        matSeg.set(k);
        if (eraseBtn) eraseBtn.textContent = "Tryb usuwania belek";
      });
      matSeg.set(1);

      const testBtn = button("Przejazd próbny (Spacja)", "btn wide", () => toggleTest());
      const eraseBtn = button("Tryb usuwania belek", "btn-ghost wide", () => {
        if (s.tool === "erase") {
          s.tool = "wood";
          matSeg.set(1);
          eraseBtn.textContent = "Tryb usuwania belek";
        } else {
          s.tool = "erase";
          eraseBtn.textContent = "Aktywne: kliknij belkę, by usunąć";
        }
        Sound.tap();
      });
      const clearBtn = button("Resetuj konstrukcję", "btn-ghost wide", () => {
        if (s.simulating) s.simulating = false;
        saveUndo(cloneState());
        initStage(s.stageIdx);
        Sound.erase();
        updatePanel();
      });
      ctx.panel.append(panelBlock("Plac budowy", matSeg.el, testBtn, eraseBtn, clearBtn));

      function cleanOrphanNodes() {
        // Usuwamy luźne węzły kratownicy, które nie mają już żadnej belki
        for (let idx = s.nodes.length - 1; idx >= 0; idx--) {
          const n = s.nodes[idx];
          if (n.fixed || n.deck) continue;
          const used = s.edges.some((e) => e.i1 === idx || e.i2 === idx);
          if (!used) {
            s.nodes.splice(idx, 1);
            for (const e of s.edges) {
              if (e.i1 > idx) e.i1--;
              if (e.i2 > idx) e.i2--;
            }
          }
        }
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
      }

      function removeEdgeAt(edgeIdx) {
        if (edgeIdx < 0 || edgeIdx >= s.edges.length) return false;
        saveUndo(cloneState());
        s.edges.splice(edgeIdx, 1);
        cleanOrphanNodes();
        Sound.erase();
        updatePanel();
        return true;
      }

      function findEdgeNear(x, y, maxDist = 7) {
        let bestIdx = -1;
        let bestD = maxDist;
        const nodesRef = s.simulating && s.simNodes.length === s.nodes.length ? s.simNodes : s.nodes;
        s.edges.forEach((e, idx) => {
          const n1 = nodesRef[e.i1];
          const n2 = nodesRef[e.i2];
          if (!n1 || !n2) return;
          const x1 = n1.curX ?? n1.x, y1 = n1.curY ?? n1.y;
          const x2 = n2.curX ?? n2.x, y2 = n2.curY ?? n2.y;
          const dx = x2 - x1, dy = y2 - y1;
          const len2 = dx * dx + dy * dy || 1;
          const t = Math.max(0.08, Math.min(0.92, ((x - x1) * dx + (y - y1) * dy) / len2));
          const px = x1 + dx * t, py = y1 + dy * t;
          const d = Math.hypot(x - px, y - py);
          if (d < bestD) {
            bestD = d;
            bestIdx = idx;
          }
        });
        return bestIdx;
      }

      function updatePanel() {
        const st = stageList[s.stageIdx % stageList.length];
        const cost = calcBridgeCost(s.edges);
        const roadCheck = findRoadPath(s.nodes, s.edges);
        budgetEl.set(
          `${cost} / ${st.budget} zł`,
          cost / st.budget,
          cost > st.budget ? "Przekroczono budżet, usuń część belek" : `Pozostało: ${st.budget - cost} zł`
        );
        stressEl.set(
          `${Math.round(s.maxStressEver * 100)}%`,
          s.maxStressEver,
          s.maxStressEver >= 1.0
            ? "Konstrukcja przeciążona, belka pękła"
            : s.maxStressEver > 0.75
            ? "Wysokie naprężenie kratownicy"
            : roadCheck.complete
            ? "Jezdnia ciągła, gotowa do próby"
            : "Brak ciągłej jezdni między brzegami"
        );
        stageEl.set(
          `${s.stageIdx + 1} z ${stagesCount}: ${st.name}`,
          null,
          `Pojazd: ${st.vehicleName} (${st.vehicleWeight.toFixed(1)} t)`
        );
        testBtn.textContent = s.simulating ? "Zatrzymaj próbę (Spacja)" : "Przejazd próbny (Spacja)";
        ctx.progress(s.stageIdx / stagesCount);
      }

      function toggleTest() {
        if (ctx.done) return;
        const st = stageList[s.stageIdx % stageList.length];

        if (s.simulating) {
          s.simulating = false;
          s.falling = false;
          s.vehicleX = st.anchors[0].x - 18;
          s.vehicleY = st.anchors[0].y;
          s.vehicleAngle = 0;
          s.edges.forEach((e) => {
            e.broken = false;
            e.stress = 0;
          });
          s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
          Sound.tap();
          ctx.toast("Zatrzymano symulację i przywrócono most.");
          updatePanel();
          return;
        }

        const cost = calcBridgeCost(s.edges);
        if (cost > st.budget) {
          Sound.error();
          ctx.toast("Most przekracza dostępny budżet inwestycji.");
          return;
        }

        const roadCheck = findRoadPath(s.nodes, s.edges);
        if (!roadCheck.complete) {
          Sound.error();
          ctx.toast("Połącz oba brzegi ciągłą jezdnią przed testem.");
          return;
        }

        s.simulating = true;
        s.falling = false;
        s.vehicleX = st.anchors[0].x - 18;
        s.vehicleY = st.anchors[0].y;
        s.vehicleVy = 0;
        s.vehicleAngle = 0;
        s.maxStressEver = 0;
        s.edges.forEach((e) => {
          e.broken = false;
          e.stress = 0;
        });
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
        Sound.line();
        ctx.toast("Rozpoczęto próbę obciążeniową mostu.");
        updatePanel();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === " ") {
          e.preventDefault();
          toggleTest();
        } else if (e.key === "1") {
          s.tool = "road";
          matSeg.set(0);
        } else if (e.key === "2") {
          s.tool = "wood";
          matSeg.set(1);
          eraseBtn.textContent = "Tryb usuwania belek";
        } else if (e.key === "3") {
          s.tool = "steel";
          matSeg.set(2);
          eraseBtn.textContent = "Tryb usuwania belek";
        } else if (e.key === "4" || e.key === "Delete" || e.key === "Backspace") {
          s.tool = "erase";
          eraseBtn.textContent = "Aktywne: kliknij belkę, by usunąć";
        }
      });

      ctx.on(cv.cv, "contextmenu", (e) => {
        e.preventDefault();
        if (ctx.done || s.simulating) return;
        const [x, y] = cv.at(e);
        const edgeIdx = findEdgeNear(x, y, 8);
        if (edgeIdx >= 0) removeEdgeAt(edgeIdx);
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;
        s.hoverEdge = !s.simulating ? findEdgeNear(x, y, 7) : -1;
      });

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.simulating) return;
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;

        // Prawy przycisk myszy lub tryb "Usuń" kasuje belkę
        if (e.button === 2 || s.tool === "erase") {
          const edgeIdx = findEdgeNear(x, y, 8);
          if (edgeIdx >= 0) {
            removeEdgeAt(edgeIdx);
            return;
          }
          // Kliknięcie w nieużywany węzeł w trybie usuwania
          const nodeIdx = s.nodes.findIndex((n) => !n.fixed && Math.hypot(n.x - x, n.y - y) < 10);
          if (nodeIdx >= 0) {
            saveUndo(cloneState());
            s.edges = s.edges.filter((ed) => ed.i1 !== nodeIdx && ed.i2 !== nodeIdx);
            cleanOrphanNodes();
            Sound.erase();
            updatePanel();
          }
          return;
        }

        // Znajdź najbliższy istniejący węzeł
        let nearIdx = -1;
        let bestDist = 13;
        s.nodes.forEach((n, i) => {
          const d = Math.hypot(n.x - x, n.y - y);
          if (d < bestDist) {
            bestDist = d;
            nearIdx = i;
          }
        });

        if (nearIdx >= 0) {
          s.dragStartNode = nearIdx;
        } else if (y > 42 && y < 178 && x > 20 && x < W - 20) {
          // Jeśli kliknięto dokładnie w istniejącą belkę tym samym narzędziem, usuń ją
          const hitEdge = findEdgeNear(x, y, 5.5);
          if (hitEdge >= 0 && s.edges[hitEdge].type === s.tool) {
            removeEdgeAt(hitEdge);
            return;
          }
          // Dodanie nowego węzła kratownicy (przyciąganie do siatki co 5 jednostek)
          saveUndo(cloneState());
          const gx = Math.round(x / 5) * 5;
          const gy = Math.round(y / 5) * 5;
          s.nodes.push({ x: gx, y: gy, fixed: false, deck: s.tool === "road" });
          s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
          s.dragStartNode = s.nodes.length - 1;
          Sound.tap();
        }
      });

      ctx.on(document, "pointerup", (e) => {
        if (s.dragStartNode >= 0) {
          const [x, y] = cv.at(e);
          const sn = s.nodes[s.dragStartNode];
          if (!sn) {
            s.dragStartNode = -1;
            return;
          }

          let targetIdx = -1;
          let bestDist = 15;
          s.nodes.forEach((n, i) => {
            if (i !== s.dragStartNode) {
              const d = Math.hypot(n.x - x, n.y - y);
              if (d < bestDist) {
                bestDist = d;
                targetIdx = i;
              }
            }
          });

          // Jeśli przeciągnięto w puste miejsce, utwórz nowy węzeł docelowy i połącz belką
          const dragDist = Math.hypot(x - sn.x, y - sn.y);
          if (targetIdx < 0 && dragDist >= 18 && dragDist <= 85 && y > 42 && y < 178 && x > 20 && x < W - 20) {
            saveUndo(cloneState());
            const gx = Math.round(x / 5) * 5;
            const gy = Math.round(y / 5) * 5;
            s.nodes.push({ x: gx, y: gy, fixed: false, deck: s.tool === "road" });
            targetIdx = s.nodes.length - 1;
            const i1 = Math.min(s.dragStartNode, targetIdx);
            const i2 = Math.max(s.dragStartNode, targetIdx);
            const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
            s.edges.push({ i1, i2, type: s.tool, len, stress: 0, broken: false });
            s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
            Sound.place(3);
            updatePanel();
            s.dragStartNode = -1;
            return;
          }

          if (targetIdx >= 0) {
            const i1 = Math.min(s.dragStartNode, targetIdx);
            const i2 = Math.max(s.dragStartNode, targetIdx);
            const existingIdx = s.edges.findIndex((ed) => ed.i1 === i1 && ed.i2 === i2);
            if (existingIdx >= 0) {
              // Jeśli ten sam materiał — usuń belkę; jeśli inny — zmień materiał
              saveUndo(cloneState());
              if (s.edges[existingIdx].type === s.tool) {
                s.edges.splice(existingIdx, 1);
                cleanOrphanNodes();
                Sound.erase();
              } else {
                s.edges[existingIdx].type = s.tool;
                if (s.tool === "road") {
                  s.nodes[i1].deck = true;
                  s.nodes[i2].deck = true;
                }
                Sound.place(2);
              }
              updatePanel();
            } else {
              const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
              if (len <= 85) {
                saveUndo(cloneState());
                if (s.tool === "road") {
                  s.nodes[i1].deck = true;
                  s.nodes[i2].deck = true;
                }
                s.edges.push({ i1, i2, type: s.tool, len, stress: 0, broken: false });
                s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
                Sound.place(3);
                updatePanel();
              } else {
                ctx.toast("Zbyt długa belka, maksymalny zasięg to 85 m.");
              }
            }
          } else {
            cleanOrphanNodes();
          }
          s.dragStartNode = -1;
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        const st = stageList[s.stageIdx % stageList.length];
        const leftA = st.anchors[0];
        const rightA = st.anchors[1];

        // Symulacja przejazdu pojazdu po ugiętej jezdni
        if (s.simulating) {
          if (s.falling) {
            s.vehicleVy += 180 * dt;
            s.vehicleY += s.vehicleVy * dt;
            s.vehicleX += s.vehicleV * 0.35 * dt;
            s.vehicleAngle += 1.8 * dt;
            if (s.vehicleY > H - 12) {
              s.simulating = false;
              s.falling = false;
              updatePanel();
            }
          } else {
            s.vehicleX += s.vehicleV * dt;
            s.wheelRot += s.vehicleV * dt * 0.25;

            const res = solveTrussStress(s.nodes, s.edges, s.vehicleX, st.vehicleWeight);
            s.simNodes = res.simNodes;
            s.maxStressEver = Math.max(s.maxStressEver, res.maxStress);

            const roadPath = findRoadPath(s.simNodes, s.edges);
            const vehSample = sampleVehicleOnRoad(s.simNodes, roadPath.nodePath, s.vehicleX);
            s.vehicleY = vehSample.y;
            s.vehicleAngle = vehSample.angle;

            // Cząsteczki z silnie naprężonych lub pękających belek
            for (const e of s.edges) {
              if (e.stress > 0.65 && Math.random() < 0.3) {
                const n1 = s.simNodes[e.i1], n2 = s.simNodes[e.i2];
                const t = Math.random();
                s.dust.push({
                  x: n1.curX + (n2.curX - n1.curX) * t,
                  y: n1.curY + (n2.curY - n1.curY) * t,
                  vx: (Math.random() - 0.5) * 10,
                  vy: 10 + Math.random() * 20,
                  c: e.stress > 0.85 ? theme.bad : theme.warn,
                  life: 0.55,
                });
              }
            }

            if (res.deckBroken || (!roadPath.complete && s.vehicleX > leftA.x + 4)) {
              s.falling = true;
              s.vehicleVy = 25;
              Sound.error();
              ctx.toast("Jezdnia załamała się pod ciężarem pojazdu. Wzmocnij kratownicę.");
              updatePanel();
            } else if (s.vehicleX > rightA.x + 18) {
              // Pojazd dotarł bezpiecznie na drugi brzeg
              s.simulating = false;
              ctx.achieve("pierwszy-most");

              const cost = calcBridgeCost(s.edges);
              if (cost <= st.budget * 0.7) {
                ctx.achieve("oszczedny-inzynier");
              }
              if (s.maxStressEver < 0.65) {
                ctx.achieve("stalowa-konstrukcja");
              }

              if (s.stageIdx + 1 >= stagesCount) {
                if (key === "hard") ctx.achieve("mistrz-architekt");
                ctx.win(`Mosty ukończone. Wszystkie ${stagesCount} przeprawy wytrzymały obciążenie.`);
                return;
              } else {
                s.stageIdx++;
                initStage(s.stageIdx);
                Sound.line();
                ctx.toast(`Etap ${s.stageIdx} zaliczony. Czas na kolejną przeprawę.`);
                updatePanel();
              }
            }
          }
        }

        // --- RYSOWANIE KRAJOBRAZU INŻYNIERYJNEGO I MOSTU ---
        const skyGrad = g.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#172554");
        skyGrad.addColorStop(0.55, "#1e3a5f");
        skyGrad.addColorStop(1, "#0f172a");
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, H);

        // Siatka inżynieryjna (blueprint) ułatwiająca symetryczne projektowanie kratownicy
        g.strokeStyle = "rgba(148, 163, 184, 0.12)";
        g.lineWidth = 0.4;
        for (let gx = 15; gx < W; gx += 15) {
          g.beginPath();
          g.moveTo(gx, 24);
          g.lineTo(gx, H - 18);
          g.stroke();
        }
        for (let gy = 30; gy < H - 18; gy += 15) {
          g.beginPath();
          g.moveTo(0, gy);
          g.lineTo(W, gy);
          g.stroke();
        }

        // Chmury w tle
        g.fillStyle = "rgba(255, 255, 255, 0.08)";
        for (let c = 0; c < 3; c++) {
          const cx = ((now * 0.005 + c * 105) % (W + 50)) - 25;
          const cy = 36 + c * 11;
          g.beginPath();
          g.arc(cx, cy, 10, 0, Math.PI * 2);
          g.arc(cx + 8, cy - 2, 8, 0, Math.PI * 2);
          g.arc(cx + 15, cy, 9, 0, Math.PI * 2);
          g.fill();
        }

        // Rzeka na dnie kanionu z falami
        const waterGrad = g.createLinearGradient(0, H - 22, 0, H);
        waterGrad.addColorStop(0, "#0284c7");
        waterGrad.addColorStop(1, "#0369a1");
        g.fillStyle = waterGrad;
        g.fillRect(leftA.x - 10, H - 20, rightA.x - leftA.x + 20, 20);

        g.strokeStyle = "rgba(255, 255, 255, 0.35)";
        g.lineWidth = 0.9;
        const waveShift = (now * 0.015) % 22;
        for (let wx = leftA.x - 15; wx < rightA.x + 5; wx += 22) {
          const rx = wx + waveShift;
          if (rx >= leftA.x - 6 && rx + 12 <= rightA.x + 6) {
            g.beginPath();
            g.moveTo(rx, H - 11);
            g.quadraticCurveTo(rx + 6, H - 14, rx + 12, H - 11);
            g.stroke();
          }
        }

        // Skarpy skalne po lewej i prawej stronie z warstwami geologicznymi
        g.fillStyle = "#334155";
        g.beginPath();
        g.moveTo(0, leftA.y);
        g.lineTo(leftA.x, leftA.y);
        g.lineTo(leftA.x + 6, leftA.y + 42);
        g.lineTo(leftA.x + 12, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        g.beginPath();
        g.moveTo(rightA.x, rightA.y);
        g.lineTo(W, rightA.y);
        g.lineTo(W, H);
        g.lineTo(rightA.x - 12, H);
        g.lineTo(rightA.x - 6, rightA.y + 42);
        g.closePath();
        g.fill();

        // Warstwy geologiczne na skarpach
        g.fillStyle = "#475569";
        g.fillRect(0, leftA.y + 12, leftA.x + 1, 10);
        g.fillRect(0, leftA.y + 34, leftA.x + 4, 12);
        g.fillRect(rightA.x - 1, rightA.y + 12, W - rightA.x + 1, 10);
        g.fillRect(rightA.x - 4, rightA.y + 34, W - rightA.x + 4, 12);

        // Zielona murawa i drogi dojazdowe na szczycie klifów
        g.fillStyle = "#15803d";
        g.fillRect(0, leftA.y - 3, leftA.x, 4);
        g.fillRect(rightA.x, rightA.y - 3, W - rightA.x, 4);

        g.fillStyle = "#1e293b";
        g.fillRect(0, leftA.y - 2, leftA.x + 2, 5);
        g.fillRect(rightA.x - 2, rightA.y - 2, W - rightA.x + 2, 5);

        // Betonowe filary dla dolnych kotwic w nurcie rzeki
        for (let aIdx = 2; aIdx < st.anchors.length; aIdx++) {
          const anc = st.anchors[aIdx];
          if (anc.x > leftA.x + 10 && anc.x < rightA.x - 10) {
            g.fillStyle = "#64748b";
            g.beginPath();
            g.moveTo(anc.x - 7, anc.y);
            g.lineTo(anc.x + 7, anc.y);
            g.lineTo(anc.x + 11, H);
            g.lineTo(anc.x - 11, H);
            g.closePath();
            g.fill();
            g.strokeStyle = "#94a3b8";
            g.lineWidth = 0.8;
            g.stroke();
          }
        }

        // Górny pasek informacyjny (bez użycia g.font bezpośrednio)
        g.fillStyle = "rgba(15, 23, 42, 0.72)";
        g.fillRect(0, 0, W, 20);
        const curCost = calcBridgeCost(s.edges);
        cv.text(`${st.name} · ${st.vehicleName} (${st.vehicleWeight.toFixed(1)} t)`, 8, 10, {
          size: 5.2,
          weight: 700,
          color: "#f8fafc",
          align: "left",
        });
        cv.text(`Koszt: ${curCost} / ${st.budget} zł`, W - 8, 10, {
          size: 5.2,
          weight: 700,
          color: curCost > st.budget ? "bad" : "#a7f3d0",
          align: "right",
        });

        // Cząsteczki pyłu
        for (let i = s.dust.length - 1; i >= 0; i--) {
          const d = s.dust[i];
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.life -= dt * 1.8;
          if (d.life <= 0) {
            s.dust.splice(i, 1);
            continue;
          }
          g.fillStyle = d.c;
          g.fillRect(d.x, d.y, 1.8, 1.8);
        }

        // Belki mostu (rysowane na aktualnie ugiętych pozycjach simNodes podczas symulacji)
        const drawNodes = s.simulating && s.simNodes.length === s.nodes.length ? s.simNodes : s.nodes;
        s.edges.forEach((e, idx) => {
          if (e.broken) return;
          const n1 = drawNodes[e.i1];
          const n2 = drawNodes[e.i2];
          if (!n1 || !n2) return;
          const x1 = n1.curX ?? n1.x, y1 = n1.curY ?? n1.y;
          const x2 = n2.curX ?? n2.x, y2 = n2.curY ?? n2.y;

          let col = "#10b981";
          if (s.simulating || e.stress > 0) {
            if (e.stress > 0.75) col = "#ef4444";
            else if (e.stress > 0.42) col = "#f59e0b";
            else col = "#10b981";
          } else {
            col = e.type === "road" ? "#94a3b8" : e.type === "wood" ? "#d97706" : "#38bdf8";
          }

          if (!s.simulating && idx === s.hoverEdge && s.tool === "erase") {
            col = "#ef4444";
          }

          g.lineCap = "round";
          if (e.type === "road") {
            // Jezdnia: ciemny podkład + jasna nawierzchnia
            g.strokeStyle = "#1e293b";
            g.lineWidth = 5.4;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 3.2;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
          } else if (e.type === "steel") {
            // Stalowy dźwigar z nitami
            g.strokeStyle = col;
            g.lineWidth = 3.0;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = "rgba(15, 23, 42, 0.55)";
            g.lineWidth = 1.0;
            g.setLineDash([2, 3]);
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
            g.setLineDash([]);
          } else {
            // Drewniana belka kratownicy
            g.strokeStyle = col;
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
          }
        });

        // Podgląd ciągniętej belki podczas projektowania
        if (s.dragStartNode >= 0 && s.nodes[s.dragStartNode] && !s.simulating) {
          const sn = s.nodes[s.dragStartNode];
          const dist = Math.hypot(s.cursorX - sn.x, s.cursorY - sn.y);
          const tooLong = dist > 85;
          const base = MATERIAL_COSTS[s.tool] || 15;
          const segCost = Math.round(base * (dist / 22));

          g.strokeStyle = tooLong ? "#ef4444" : s.tool === "wood" ? "#f59e0b" : s.tool === "road" ? "#cbd5e1" : "#38bdf8";
          g.lineWidth = s.tool === "road" ? 3.5 : 2.2;
          g.setLineDash([3, 2.5]);
          g.beginPath();
          g.moveTo(sn.x, sn.y);
          g.lineTo(s.cursorX, s.cursorY);
          g.stroke();
          g.setLineDash([]);

          const midX = (sn.x + s.cursorX) / 2;
          const midY = (sn.y + s.cursorY) / 2 - 7;
          cv.text(`${Math.round(dist)} m (${segCost} zł)`, midX, midY, {
            size: 5,
            weight: 700,
            color: tooLong ? "bad" : "#f8fafc",
            align: "center",
          });
        }

        // Węzły i punkty kotwiczenia mostu
        drawNodes.forEach((n) => {
          const nx = n.curX ?? n.x;
          const ny = n.curY ?? n.y;
          g.fillStyle = n.fixed ? "#f59e0b" : n.deck ? "#38bdf8" : "#e2e8f0";
          g.strokeStyle = "#0f172a";
          g.lineWidth = 1.2;
          g.beginPath();
          if (n.fixed) {
            g.rect(nx - 4.2, ny - 4.2, 8.4, 8.4);
          } else {
            g.arc(nx, ny, 3.3, 0, Math.PI * 2);
          }
          g.fill();
          g.stroke();
        });

        // Rysowanie pojazdu (na starcie przed mostem albo w trakcie jazdy po jezdni)
        const vehX = s.simulating ? s.vehicleX : leftA.x - 18;
        const vehY = s.simulating ? s.vehicleY : leftA.y;
        const vehAng = s.simulating ? s.vehicleAngle : 0;

        g.save();
        g.translate(vehX, vehY - 5.5);
        g.rotate(vehAng);

        if (st.vehicleWeight < 1.2) {
          // Auto osobowe
          g.fillStyle = "#38bdf8";
          g.beginPath();
          g.roundRect(-10, -4, 20, 6.5, 2);
          g.fill();
          g.fillStyle = "#0284c7";
          g.beginPath();
          g.roundRect(-6, -8, 11, 4.5, 1.5);
          g.fill();
          g.fillStyle = "#e0f2fe";
          g.fillRect(-1, -7.2, 5, 3.2);
        } else if (st.vehicleWeight < 1.8) {
          // Furgonetka / Autobus
          g.fillStyle = "#f59e0b";
          g.beginPath();
          g.roundRect(-12, -8, 24, 10.5, 2);
          g.fill();
          g.fillStyle = "#fef3c7";
          g.fillRect(-9, -6.5, 5, 4);
          g.fillRect(-2, -6.5, 5, 4);
          g.fillRect(5, -6.5, 5.5, 4.5);
        } else {
          // Ciężarówka budowlana
          g.fillStyle = "#ef4444";
          g.fillRect(-14, -9.5, 17, 11.5); // skrzynia ładunkowa
          g.fillStyle = "#dc2626";
          g.beginPath();
          g.roundRect(3, -7.5, 9, 9.5, 1.5); // kabina
          g.fill();
          g.fillStyle = "#bae6fd";
          g.fillRect(6.5, -6.5, 4.5, 4);
        }

        // Koła z obracającymi się szprychami
        for (const wx of [-7.5, 7.5]) {
          g.fillStyle = "#0f172a";
          g.beginPath();
          g.arc(wx, 3.2, 3.0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "#cbd5e1";
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(wx + Math.cos(s.wheelRot) * 2, 3.2 + Math.sin(s.wheelRot) * 2);
          g.lineTo(wx - Math.cos(s.wheelRot) * 2, 3.2 - Math.sin(s.wheelRot) * 2);
          g.stroke();
        }
        g.restore();
      });
    },
  });
}
