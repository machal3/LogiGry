// Architekt: symulacja inżynieryjna mostów kratownicowych, łukowych i wantowych.
// Rozbudowany konstruktor CAD z przyciąganiem magnetycznym, dzieleniem przęseł i analizą statyczną na żywo.
{
  const MATERIAL_COSTS = {
    road: 22,   // jezdnia kompozytowa (za odcinek bazowy 22 m)
    wood: 14,   // drewniana belka klejona
    steel: 28,  // stalowy dźwigar dwuteowy
    cable: 10,  // stalowa lina wantowa
    arch: 24,   // żelbetowy segment łukowy (odporny na ściskanie)
    spring: 20, // tłumik hydrauliczny (pochłania drgania i wiatr)
  };

  const MATERIAL_SPECS = {
    road: {
      name: "Droga",
      cost: 22,
      maxLen: 75,
      mass: 0.11,
      stiffness: 0.36,
      maxStrain: 0.145,
      desc: "Nawierzchnia dla pojazdów. Sama pęka od zginania — podeprzyj węzły.",
      badge: "22 zł / 22 m · zasięg 75 m",
    },
    wood: {
      name: "Drewno",
      cost: 14,
      maxLen: 72,
      mass: 0.05,
      stiffness: 0.42,
      maxStrain: 0.165,
      desc: "Belka z drewna klejonego. Lekka i tania, dobra na krótkie kratownice.",
      badge: "14 zł / 22 m · zasięg 72 m",
    },
    steel: {
      name: "Stal",
      cost: 28,
      maxLen: 90,
      mass: 0.09,
      stiffness: 0.52,
      maxStrain: 0.245,
      desc: "Stalowy dźwigar dwuteowy. Wysoka wytrzymałość na ściskanie i rozciąganie.",
      badge: "28 zł / 22 m · zasięg 90 m",
    },
    cable: {
      name: "Lina",
      cost: 10,
      maxLen: 120,
      mass: 0.025,
      stiffness: 0.48,
      maxStrain: 0.225,
      desc: "Lina wantowa dalekiego zasięgu. Przenosi wyłącznie rozciąganie.",
      badge: "10 zł / 22 m · zasięg 120 m",
    },
    arch: {
      name: "Żelbet",
      cost: 24,
      maxLen: 85,
      mass: 0.11,
      stiffness: 0.55,
      maxStrain: 0.26,
      desc: "Zbrojony beton łukowy. Potężna odporność na ściskanie w łukach i podporach.",
      badge: "24 zł / 22 m · zasięg 85 m",
    },
    spring: {
      name: "Tłumik",
      cost: 20,
      maxLen: 78,
      mass: 0.06,
      stiffness: 0.35,
      maxStrain: 0.32,
      desc: "Amortyzator hydrauliczny. Elastyczny, tłumi uderzenia kół i porywy wiatru.",
      badge: "20 zł / 22 m · zasięg 78 m",
    },
  };

  const STAGES = {
    easy: [
      {
        name: "Wąska dolina",
        bridgeType: "Most kratownicowy",
        gap: 120,
        budget: 720,
        env: "valley",
        anchors: [
          { x: 90, y: 110, fixed: true, deck: true },
          { x: 210, y: 110, fixed: true, deck: true },
          { x: 90, y: 155, fixed: true, deck: false },
          { x: 210, y: 155, fixed: true, deck: false },
        ],
        vehicleWeight: 1.0,
        vehicleName: "Auto osobowe",
        vehicleType: "car",
      },
      {
        name: "Skalny uskok",
        bridgeType: "Most pochyły nad rurociągiem",
        gap: 140,
        budget: 880,
        env: "gorge",
        obstacles: [
          { x: 122, y: 125, w: 56, h: 32, kind: "pipe", label: "Gazociąg (zakaz)" },
        ],
        anchors: [
          { x: 80, y: 114, fixed: true, deck: true },
          { x: 220, y: 98, fixed: true, deck: true },
          { x: 80, y: 158, fixed: true, deck: false },
          { x: 220, y: 152, fixed: true, deck: false },
        ],
        vehicleWeight: 1.3,
        vehicleName: "Furgonetka",
        vehicleType: "van",
      },
      {
        name: "Przełom rzeki",
        bridgeType: "Most wantowy (podwieszany)",
        gap: 160,
        budget: 1020,
        env: "river",
        ship: { x: 115, y: 120, w: 70, h: 58, label: "Wysoki żaglowiec" },
        anchors: [
          { x: 70, y: 106, fixed: true, deck: true },
          { x: 230, y: 106, fixed: true, deck: true },
          { x: 150, y: 162, fixed: true, deck: false },
          { x: 70, y: 56, fixed: true, deck: false, pylon: true },
          { x: 230, y: 56, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 1.5,
        vehicleName: "Autobus",
        vehicleType: "bus",
      },
      {
        name: "Słoneczny kanion",
        bridgeType: "Most łukowy (dolny)",
        gap: 150,
        budget: 960,
        env: "canyon",
        obstacles: [
          { x: 96, y: 42, w: 108, h: 52, kind: "air", label: "Korytarz balonów" },
        ],
        anchors: [
          { x: 75, y: 104, fixed: true, deck: true },
          { x: 225, y: 104, fixed: true, deck: true },
          { x: 75, y: 148, fixed: true, deck: false },
          { x: 225, y: 148, fixed: true, deck: false },
          { x: 150, y: 156, fixed: true, deck: false },
        ],
        vehicleWeight: 1.6,
        vehicleName: "Autobus górski",
        vehicleType: "bus",
      },
    ],
    medium: [
      {
        name: "Kanion skalny",
        bridgeType: "Most kratownicowo-łukowy",
        gap: 160,
        budget: 1180,
        env: "canyon",
        ship: { x: 122, y: 142, w: 56, h: 36, label: "Szlak barki" },
        obstacles: [
          { x: 88, y: 122, w: 24, h: 30, kind: "boulder", label: "Głaz" },
        ],
        anchors: [
          { x: 70, y: 105, fixed: true, deck: true },
          { x: 230, y: 105, fixed: true, deck: true },
          { x: 70, y: 158, fixed: true, deck: false },
          { x: 230, y: 158, fixed: true, deck: false },
        ],
        vehicleWeight: 2.0,
        vehicleName: "Ciężarówka",
        vehicleType: "truck",
      },
      {
        name: "Wietrzna przełęcz",
        bridgeType: "Most wantowy na wietrze",
        gap: 180,
        budget: 1360,
        env: "peaks",
        wind: 0.28,
        weather: "snow",
        obstacles: [
          { x: 118, y: 122, w: 64, h: 46, kind: "spire", label: "Iglica skalna" },
        ],
        anchors: [
          { x: 60, y: 106, fixed: true, deck: true },
          { x: 240, y: 96, fixed: true, deck: true },
          { x: 60, y: 156, fixed: true, deck: false },
          { x: 240, y: 152, fixed: true, deck: false },
          { x: 60, y: 52, fixed: true, deck: false, pylon: true },
          { x: 240, y: 48, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 2.3,
        vehicleName: "Wywrotka z kruszywem",
        vehicleType: "dump",
      },
      {
        name: "Estakada nad wodospadem",
        bridgeType: "Most wspornikowy z filarem",
        gap: 190,
        budget: 1480,
        env: "falls",
        wind: 0.18,
        weather: "rain",
        convoyCount: 2,
        anchors: [
          { x: 55, y: 100, fixed: true, deck: true },
          { x: 245, y: 100, fixed: true, deck: true },
          { x: 150, y: 162, fixed: true, deck: false },
          { x: 150, y: 52, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 2.5,
        vehicleName: "Konwój dźwigowy",
        vehicleType: "crane",
      },
      {
        name: "Grota krasowa",
        bridgeType: "Most łukowy pod stalaktytami",
        gap: 180,
        budget: 1420,
        env: "chasm",
        obstacles: [
          { x: 82, y: 34, w: 136, h: 54, kind: "stalactite", label: "Stalaktyty jaskini" },
        ],
        anchors: [
          { x: 60, y: 100, fixed: true, deck: true },
          { x: 240, y: 100, fixed: true, deck: true },
          { x: 60, y: 150, fixed: true, deck: false },
          { x: 240, y: 150, fixed: true, deck: false },
          { x: 115, y: 156, fixed: true, deck: false },
          { x: 185, y: 156, fixed: true, deck: false },
        ],
        vehicleWeight: 2.6,
        vehicleName: "Ciężarówka górnicza",
        vehicleType: "dump",
      },
    ],
    hard: [
      {
        name: "Wielka rozpadlina",
        bridgeType: "Most hybrydowy z torem wodnym",
        gap: 200,
        budget: 1640,
        env: "chasm",
        wind: 0.32,
        weather: "rain",
        ship: { x: 118, y: 140, w: 64, h: 38, label: "Tor żeglugowy" },
        obstacles: [
          { x: 74, y: 118, w: 28, h: 28, kind: "boulder", label: "Ostańce" },
        ],
        anchors: [
          { x: 50, y: 98, fixed: true, deck: true },
          { x: 250, y: 98, fixed: true, deck: true },
          { x: 50, y: 158, fixed: true, deck: false },
          { x: 250, y: 158, fixed: true, deck: false },
          { x: 50, y: 50, fixed: true, deck: false, pylon: true },
          { x: 250, y: 50, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 3.0,
        vehicleName: "Konwój budowlany",
        vehicleType: "convoy",
      },
      {
        name: "Czeluść bazaltowa",
        bridgeType: "Most żelbetowy nad lawą",
        gap: 210,
        budget: 1780,
        env: "basalt",
        wind: 0.25,
        weather: "embers",
        obstacles: [
          { x: 75, y: 34, w: 150, h: 50, kind: "stalactite", label: "Nawis bazaltowy" },
          { x: 136, y: 132, w: 28, h: 38, kind: "spire", label: "Kolumna" },
        ],
        anchors: [
          { x: 45, y: 96, fixed: true, deck: true },
          { x: 255, y: 96, fixed: true, deck: true },
          { x: 45, y: 150, fixed: true, deck: false },
          { x: 255, y: 150, fixed: true, deck: false },
          { x: 105, y: 158, fixed: true, deck: false },
          { x: 195, y: 158, fixed: true, deck: false },
        ],
        vehicleWeight: 3.3,
        vehicleName: "Ciężki pociąg drogowy",
        vehicleType: "train",
      },
      {
        name: "Stroma przełęcz",
        bridgeType: "Most pochyły z przeszkodami",
        gap: 200,
        budget: 1760,
        env: "peaks",
        wind: 0.4,
        weather: "snow",
        obstacles: [
          { x: 126, y: 120, w: 48, h: 48, kind: "pipe", label: "Magistrala" },
          { x: 84, y: 42, w: 48, h: 36, kind: "boulder", label: "Zwis skalny" },
        ],
        anchors: [
          { x: 50, y: 112, fixed: true, deck: true },
          { x: 250, y: 88, fixed: true, deck: true },
          { x: 50, y: 158, fixed: true, deck: false },
          { x: 250, y: 148, fixed: true, deck: false },
          { x: 50, y: 56, fixed: true, deck: false, pylon: true },
          { x: 250, y: 44, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 3.5,
        vehicleName: "Ciężki dźwig górski",
        vehicleType: "crane",
      },
      {
        name: "Most nad otchłanią",
        bridgeType: "Wielki most wantowy w sztormie",
        gap: 220,
        budget: 1950,
        env: "abyss",
        wind: 0.45,
        weather: "rain",
        convoyCount: 2,
        ship: { x: 86, y: 128, w: 48, h: 48, label: "Kanał lewy" },
        obstacles: [
          { x: 172, y: 124, w: 42, h: 44, kind: "spire", label: "Rafa skalna" },
        ],
        anchors: [
          { x: 40, y: 95, fixed: true, deck: true },
          { x: 260, y: 95, fixed: true, deck: true },
          { x: 150, y: 165, fixed: true, deck: false },
          { x: 40, y: 46, fixed: true, deck: false, pylon: true },
          { x: 260, y: 46, fixed: true, deck: false, pylon: true },
        ],
        vehicleWeight: 3.8,
        vehicleName: "Megatransportowiec",
        vehicleType: "mega",
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

  // Solwer fizyki kratownicy: równowaga sił węzłowych, masa własna, obciążenie dwuosiowe, wiatr,
  // rozciąganie/ściskanie (z wyboczeniem długich prętów) oraz zginanie niepodpartych przęseł jezdni.
  function solveTrussStress(nodes, edges, vehicleX, vehicleWeight, windSpeed = 0) {
    let maxStress = 0;
    let deckBroken = false;

    const simNodes = nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));
    const activeEdges = edges.filter((e) => !e.broken);

    const adj = Array.from({ length: simNodes.length }, () => []);
    const hasSpringDamping = new Array(simNodes.length).fill(false);
    for (const e of activeEdges) {
      adj[e.i1]?.push({ to: e.i2, e });
      adj[e.i2]?.push({ to: e.i1, e });
      if (e.type === "spring") {
        hasSpringDamping[e.i1] = true;
        hasSpringDamping[e.i2] = true;
      }
    }

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

    const hasVerticalBrace = simNodes.map((n, idx) => {
      if (n.fixed) return true;
      if (anchorDist[idx] === Infinity) return false;
      let verticalLinks = 0;
      for (const nb of adj[idx]) {
        const other = simNodes[nb.to];
        const len = Math.max(1, Math.hypot(other.x - n.x, other.y - n.y));
        const vertRatio = Math.abs(other.y - n.y) / len;
        const validCable = nb.e.type !== "cable" || other.y < n.y - 4;
        if (vertRatio > 0.18 && anchorDist[nb.to] < Infinity && validCable) {
          verticalLinks++;
        }
      }
      return verticalLinks > 0 && adj[idx].length >= 3;
    });

    const roadInfo = findRoadPath(simNodes, activeEdges);
    const onDeckSet = new Set(roadInfo.nodePath);

    const deadLoadY = new Array(simNodes.length).fill(0);
    for (const e of activeEdges) {
      const spec = MATERIAL_SPECS[e.type] || MATERIAL_SPECS.wood;
      const len = e.len || Math.hypot(simNodes[e.i2].x - simNodes[e.i1].x, simNodes[e.i2].y - simNodes[e.i1].y) || 22;
      const beamWeight = spec.mass * (len / 40);
      deadLoadY[e.i1] += beamWeight * 0.5;
      deadLoadY[e.i2] += beamWeight * 0.5;
    }

    const axleHalf = 7.5;
    const axles = [vehicleX - axleHalf, vehicleX + axleHalf];
    const liveLoadY = new Array(simNodes.length).fill(0);
    const edgeMidBending = new Map();

    for (const ax of axles) {
      let placedOnSpan = false;
      for (const edgeIdx of roadInfo.edgePath) {
        const e = edges[edgeIdx];
        if (!e || e.broken) continue;
        const n1 = simNodes[e.i1], n2 = simNodes[e.i2];
        const minX = Math.min(n1.x, n2.x);
        const maxX = Math.max(n1.x, n2.x);
        if (ax >= minX && ax <= maxX) {
          const span = Math.max(1, maxX - minX);
          const t = Math.max(0, Math.min(1, (ax - n1.x) / (n2.x - n1.x || 1)));
          const dampMul = (hasSpringDamping[e.i1] || hasSpringDamping[e.i2]) ? 0.78 : 1.0;
          const axleW = vehicleWeight * 0.5 * dampMul;
          liveLoadY[e.i1] += axleW * (1 - t);
          liveLoadY[e.i2] += axleW * t;
          const bendFactor = 4 * t * (1 - t) * (span / 42) * axleW;
          edgeMidBending.set(e, (edgeMidBending.get(e) || 0) + bendFactor);
          placedOnSpan = true;
          break;
        }
      }
      if (!placedOnSpan) {
        simNodes.forEach((n, idx) => {
          const isRoadNode = n.deck || onDeckSet.has(idx);
          if (isRoadNode && Math.abs(n.x - ax) < 34) {
            const w = Math.max(0, 1 - Math.abs(n.x - ax) / 34) * 0.5;
            liveLoadY[idx] += w * vehicleWeight;
          }
        });
      }
    }

    const nodeForcesY = simNodes.map((n, idx) => {
      if (n.fixed) return 0;
      if (anchorDist[idx] === Infinity) return 2.2;
      const braced = hasVerticalBrace[idx];
      const isRoadNode = n.deck || onDeckSet.has(idx);
      const damp = hasSpringDamping[idx] ? 0.76 : 1.0;
      const windFlutter = windSpeed > 0 ? windSpeed * (braced ? 0.04 : 0.16) * damp : 0;
      const baseGravity = (braced ? (isRoadNode ? 0.08 : 0.025) : 0.40) + deadLoadY[idx] * (braced ? 0.25 : 0.9);
      const vehicleForce = liveLoadY[idx] * (braced ? 0.36 : 1.78);
      return baseGravity + vehicleForce + windFlutter;
    });

    const nodeForcesX = simNodes.map((n, idx) => {
      if (n.fixed || windSpeed <= 0) return 0;
      const damp = hasSpringDamping[idx] ? 0.65 : 1.0;
      return windSpeed * 0.075 * damp;
    });

    const iterations = 28;
    const subSteps = 3;
    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < simNodes.length; i++) {
        if (!simNodes[i].fixed) {
          simNodes[i].curX += nodeForcesX[i];
          simNodes[i].curY += nodeForcesY[i];
        }
      }

      for (let sub = 0; sub < subSteps; sub++) {
        for (const e of activeEdges) {
          const n1 = simNodes[e.i1];
          const n2 = simNodes[e.i2];
          const dx = n2.curX - n1.curX;
          const dy = n2.curY - n1.curY;
          const curLen = Math.hypot(dx, dy) || 1;
          const baseLen = e.len || Math.hypot(n2.x - n1.x, n2.y - n1.y) || 1;
          const diff = (curLen - baseLen) / curLen;

          const spec = MATERIAL_SPECS[e.type] || MATERIAL_SPECS.wood;
          const rawK = e.type === "cable" ? (curLen >= baseLen ? spec.stiffness : 0.02) : spec.stiffness;
          const k = rawK * 0.42;

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
    }

    for (const e of edges) {
      if (e.broken) {
        e.stress = 1.5;
        e.mode = "tension";
        maxStress = Math.max(maxStress, 1.5);
        if (e.type === "road") deckBroken = true;
        continue;
      }
      const n1 = simNodes[e.i1];
      const n2 = simNodes[e.i2];
      const baseLen = Math.max(1, e.len || Math.hypot(n2.x - n1.x, n2.y - n1.y));
      const curLen = Math.hypot(n2.curX - n1.curX, n2.curY - n1.curY);
      const rawDelta = (curLen - baseLen) / baseLen;
      e.mode = rawDelta >= 0 ? "tension" : "compression";

      // Żelbet ("arch") jest odporny na ściskanie i wyboczenie; zwykłe pręty mają karę wyboczenia
      const bucklingPenalty = e.mode === "compression" && e.type !== "cable"
        ? (e.type === "arch" ? 0.68 : 1 + Math.max(0, (baseLen - 45) / 95) * 0.28)
        : 1.0;

      const axialStrain = e.type === "cable"
        ? Math.max(0, rawDelta)
        : Math.abs(rawDelta) * bucklingPenalty;

      const sag1 = Math.max(0, n1.curY - n1.y);
      const sag2 = Math.max(0, n2.curY - n2.y);
      const maxSag = Math.max(sag1, sag2);
      const unbracedNode = (!n1.fixed && !hasVerticalBrace[e.i1]) || (!n2.fixed && !hasVerticalBrace[e.i2]);

      const midBend = e.type === "road" ? (edgeMidBending.get(e) || 0) * (unbracedNode ? 0.045 : 0.005) : 0;
      const bendingStrain = e.type === "cable" ? 0 : (unbracedNode ? maxSag * 0.028 : maxSag * 0.0045) + midBend;
      const totalStrain = axialStrain + bendingStrain;

      const spec = MATERIAL_SPECS[e.type] || MATERIAL_SPECS.wood;
      const stress = Math.min(1.5, totalStrain / spec.maxStrain);
      e.stress = stress;
      e.midSag = e.type === "road" ? (edgeMidBending.get(e) || 0) * (unbracedNode ? 3.2 : 0.65) : 0;
      maxStress = Math.max(maxStress, stress);
      if (stress >= 1.0) {
        e.broken = true;
        if (e.type === "road") deckBroken = true;
      }
    }

    return { maxStress, deckBroken, simNodes, hasVerticalBrace };
  }

  // Analiza statyczna w konstruktorze: oblicza prognozowane maksymalne naprężenie każdej belki
  // podczas pełnego przejazdu pojazdu oraz wskazuje niepodparte węzły i elementy zagrożone pęknięciem.
  function analyzeBridgeStability(nodes, edges, vehicleWeight, windSpeed = 0) {
    if (!nodes || nodes.length < 2) {
      return {
        roadComplete: false,
        maxPredictedStress: 0,
        willBreak: false,
        brokenEdgeIndices: [],
        unbracedNodeIndices: [],
        edgeForecasts: [],
      };
    }

    const roadInfo = findRoadPath(nodes, edges);
    const leftX = nodes[0].x;
    const rightX = nodes[1].x;
    const sampleFractions = roadInfo.complete ? [0.22, 0.38, 0.5, 0.62, 0.78] : [0.5];

    const peakStress = new Array(edges.length).fill(0);
    const peakMode = new Array(edges.length).fill("tension");
    let unbracedNodeIndices = [];

    for (const frac of sampleFractions) {
      const testX = leftX + (rightX - leftX) * frac;
      const clonedEdges = edges.map((e) => ({ ...e, broken: false, stress: 0 }));
      const res = solveTrussStress(nodes, clonedEdges, testX, vehicleWeight, windSpeed);
      if (frac === 0.5 && res.hasVerticalBrace) {
        unbracedNodeIndices = nodes
          .map((n, idx) => (!n.fixed && !res.hasVerticalBrace[idx] ? idx : -1))
          .filter((idx) => idx >= 0);
      }
      clonedEdges.forEach((ce, idx) => {
        if (ce.stress >= peakStress[idx]) {
          peakStress[idx] = ce.stress;
          peakMode[idx] = ce.mode || "tension";
        }
      });
    }

    const brokenEdgeIndices = [];
    let maxPredictedStress = 0;
    const edgeForecasts = edges.map((_, idx) => {
      const st = peakStress[idx];
      if (st > maxPredictedStress) maxPredictedStress = st;
      if (st >= 1.0) brokenEdgeIndices.push(idx);
      return { stress: st, mode: peakMode[idx], willBreak: st >= 1.0 };
    });

    return {
      roadComplete: roadInfo.complete,
      maxPredictedStress,
      willBreak: brokenEdgeIndices.length > 0 || !roadInfo.complete,
      brokenEdgeIndices,
      unbracedNodeIndices,
      edgeForecasts,
    };
  }

  // Wyznacza w konstruktorze punkt docelowy z przyciąganiem magnetycznym oraz auto-podział długich przęseł
  function planBeamConstruction(nodes, startIdx, rawX, rawY, toolSpec, maxSnapDist = 14) {
    const startNode = nodes[startIdx];
    if (!startNode) return { valid: false };

    // 1. Sprawdź przyciąganie magnetyczne do istniejącego węzła
    let snapNodeIdx = -1;
    let bestDist = maxSnapDist;
    nodes.forEach((n, idx) => {
      if (idx === startIdx) return;
      const d = Math.hypot(n.x - rawX, n.y - rawY);
      if (d < bestDist) {
        bestDist = d;
        snapNodeIdx = idx;
      }
    });

    let targetX = Math.max(20, Math.min(280, Math.round(rawX / 5) * 5));
    let targetY = Math.max(35, Math.min(175, Math.round(rawY / 5) * 5));
    let snapKind = "grid";

    if (snapNodeIdx >= 0) {
      targetX = nodes[snapNodeIdx].x;
      targetY = nodes[snapNodeIdx].y;
      snapKind = "node";
    } else {
      // Sprawdź, czy punkt siatki pokrywa się z istniejącym węzłem
      const gridMatch = nodes.findIndex((n, idx) => idx !== startIdx && Math.hypot(n.x - targetX, n.y - targetY) < 6);
      if (gridMatch >= 0) {
        snapNodeIdx = gridMatch;
        targetX = nodes[gridMatch].x;
        targetY = nodes[gridMatch].y;
        snapKind = "node";
      }
    }

    const dx = targetX - startNode.x;
    const dy = targetY - startNode.y;
    const totalDist = Math.hypot(dx, dy);
    const angleDeg = Math.round((Math.atan2(-dy, dx) * 180) / Math.PI);
    const maxLen = toolSpec?.maxLen || 75;

    if (totalDist < 12) {
      return {
        valid: false,
        tooShort: true,
        snapKind,
        snapNodeIdx,
        targetX,
        targetY,
        totalDist,
        angleDeg,
        segments: [],
        totalCost: 0,
      };
    }

    // Automatyczny podział długiego przeciągnięcia na równe odcinki mieszczące się w zasięgu materiału
    const segCount = totalDist <= maxLen ? 1 : Math.ceil(totalDist / (maxLen * 0.92));
    const tooLong = segCount > 4;
    const segments = [];
    let prevX = startNode.x;
    let prevY = startNode.y;
    let totalCost = 0;
    const baseCost = toolSpec?.cost || 15;

    for (let s = 1; s <= segCount; s++) {
      const t = s / segCount;
      const nx = s === segCount ? targetX : Math.round((startNode.x + dx * t) / 5) * 5;
      const ny = s === segCount ? targetY : Math.round((startNode.y + dy * t) / 5) * 5;
      const segLen = Math.hypot(nx - prevX, ny - prevY);
      const segCost = Math.round(baseCost * (segLen / 22));
      totalCost += segCost;
      segments.push({ x1: prevX, y1: prevY, x2: nx, y2: ny, len: segLen, cost: segCost });
      prevX = nx;
      prevY = ny;
    }

    return {
      valid: !tooLong,
      tooLong,
      snapKind,
      snapNodeIdx,
      targetX,
      targetY,
      totalDist,
      angleDeg,
      segCount,
      segments,
      totalCost,
    };
  }

  // Sprawdza, czy odcinek (x1,y1)-(x2,y2) przecina przeszkodę terenową lub szlak żeglugowy
  function segmentHitsZone(x1, y1, x2, y2, zone) {
    if (!zone) return false;
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (px >= zone.x && px <= zone.x + zone.w && py >= zone.y && py <= zone.y + zone.h) {
        return true;
      }
    }
    return false;
  }

  function segmentHitsStageObstacles(x1, y1, x2, y2, stage) {
    if (!stage) return null;
    if (stage.ship && segmentHitsZone(x1, y1, x2, y2, stage.ship)) return stage.ship.label || "Szlak żeglugowy";
    if (stage.obstacles) {
      for (const ob of stage.obstacles) {
        if (segmentHitsZone(x1, y1, x2, y2, ob)) return ob.label || "Przeszkoda terenowa";
      }
    }
    return null;
  }

  // Generator wzorcowej konstrukcji dopasowanej do typu mostu i przeszkód etapu
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
      const nA = nodes[a], nB = nodes[b];
      if (type !== "road" && segmentHitsStageObstacles(nA.x, nA.y, nB.x, nB.y, stage)) return;
      const len = Math.hypot(nB.x - nA.x, nB.y - nA.y);
      edges.push({ i1: a, i2: b, type, len, stress: 0 });
    };

    for (let i = 0; i < deckIdx.length - 1; i++) {
      addEdge(deckIdx[i], deckIdx[i + 1], "road");
    }

    // Jeśli nad jezdnią jest niski strop / korytarz balonów, budujemy dolny łuk podporowy zamiast górnej kratownicy!
    const topBlocked = (stage.obstacles || []).some((ob) => ob.y < Math.min(left.y, right.y));
    const chordDir = topBlocked ? 1 : -1;
    const chordOffset = topBlocked ? 28 : 30;

    const chordIdx = [];
    for (let i = 0; i < deckIdx.length - 1; i++) {
      const n1 = nodes[deckIdx[i]];
      const n2 = nodes[deckIdx[i + 1]];
      nodes.push({
        x: Math.round((n1.x + n2.x) / 2),
        y: Math.round((n1.y + n2.y) / 2 + chordDir * chordOffset),
        fixed: false,
        deck: false,
      });
      const cIdx = nodes.length - 1;
      chordIdx.push(cIdx);
      addEdge(deckIdx[i], cIdx, material);
      addEdge(deckIdx[i + 1], cIdx, material);
    }
    for (let i = 0; i < chordIdx.length - 1; i++) {
      addEdge(chordIdx[i], chordIdx[i + 1], material);
    }

    // Zastrzały do dolnych kotwic (najbliższy węzeł pasu jezdni dla każdej kotwicy)
    for (let aIdx = 2; aIdx < stage.anchors.length; aIdx++) {
      const anc = stage.anchors[aIdx];
      if (anc.pylon) continue;
      for (const dIdx of deckIdx) {
        const dist = Math.hypot(nodes[dIdx].x - anc.x, nodes[dIdx].y - anc.y);
        if (dist <= 76) {
          addEdge(dIdx, aIdx, material);
        }
      }
    }

    return { nodes, edges };
  }

  if (typeof module !== "undefined") {
    module.exports = {
      MATERIAL_COSTS,
      MATERIAL_SPECS,
      STAGES,
      calcBridgeCost,
      findRoadPath,
      sampleVehicleOnRoad,
      solveTrussStress,
      analyzeBridgeStability,
      planBeamConstruction,
      segmentHitsStageObstacles,
      buildSampleTruss,
    };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "architekt",
    cat: "strategia",
    name: "Architekt",
    author: "Gemini 4 Argon",
    desc: "Buduj kratownicowe i podwieszane mosty nad przepaścią w budżecie, analizuj naprężenia i przeprowadzaj pojazdy.",
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
      { key: "easy", name: "Łatwy", points: 10, stagesCount: 4 },
      { key: "medium", name: "Średni", points: 25, stagesCount: 4 },
      { key: "hard", name: "Trudny", points: 50, stagesCount: 4 },
    ],
    rules: [
      "Kliknij węzeł (lub przeciągnij z niego), aby wyprowadzić belkę: celownik magnetyczny pokazuje, kiedy złapiesz istniejące złącze, a kiedy powstanie nowy węzeł na siatce.",
      "Dobieraj spośród 6 materiałów: Droga, Drewno, Stal, Lina nośna, Żelbet (łuki odporne na ściskanie) i Tłumik drgań (tłumi wiatr i uderzenia osi).",
      "Omijaj przeszkody terenowe (skały, stalaktyty, iglice, rurociągi, szlaki żeglugowe) i analizuj na żywo prognozę naprężeń w %.",
      "Przeprowadź bezpiecznie pojazdy na prawy brzeg na wszystkich czterech etapach w ramach budżetu.",
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

      const ENV_THEMES = {
        valley: {
          skyTop: "#0c4a6e", skyMid: "#0284c7", skyBot: "#bae6fd", horizon: "#fef3c7",
          sunCol: "#fde047", sunX: 235, sunY: 46,
          mtFar: "rgba(12, 74, 110, 0.35)", mtNear: "rgba(15, 23, 42, 0.48)",
          rockMain: "#334155", rockLight: "#64748b", rockDark: "#1e293b",
          turfTop: "#22c55e", turfSide: "#15803d",
          waterTop: "#0ea5e9", waterBot: "#0369a1",
        },
        gorge: {
          skyTop: "#1e1b4b", skyMid: "#4338ca", skyBot: "#f472b6", horizon: "#fde68a",
          sunCol: "#fb923c", sunX: 72, sunY: 52,
          mtFar: "rgba(49, 46, 129, 0.45)", mtNear: "rgba(30, 27, 75, 0.6)",
          rockMain: "#57534e", rockLight: "#78716c", rockDark: "#292524",
          turfTop: "#16a34a", turfSide: "#14532d",
          waterTop: "#0284c7", waterBot: "#1e3a8a",
        },
        river: {
          skyTop: "#0f172a", skyMid: "#1d4ed8", skyBot: "#7dd3fc", horizon: "#e0f2fe",
          sunCol: "#fef08a", sunX: 220, sunY: 44,
          mtFar: "rgba(30, 58, 138, 0.35)", mtNear: "rgba(15, 23, 42, 0.52)",
          rockMain: "#3f3f46", rockLight: "#71717a", rockDark: "#18181b",
          turfTop: "#10b981", turfSide: "#047857",
          waterTop: "#06b6d4", waterBot: "#0e7490",
        },
        canyon: {
          skyTop: "#451a03", skyMid: "#b45309", skyBot: "#fb923c", horizon: "#fef08a",
          sunCol: "#fef08a", sunX: 150, sunY: 48,
          mtFar: "rgba(120, 53, 15, 0.45)", mtNear: "rgba(69, 26, 3, 0.65)",
          rockMain: "#7c2d12", rockLight: "#b45309", rockDark: "#431407",
          turfTop: "#ca8a04", turfSide: "#854d0e",
          waterTop: "#0d9488", waterBot: "#115e59",
        },
        peaks: {
          skyTop: "#090d16", skyMid: "#1e293b", skyBot: "#64748b", horizon: "#cbd5e1",
          sunCol: "#f8fafc", sunX: 240, sunY: 42,
          mtFar: "rgba(51, 65, 85, 0.5)", mtNear: "rgba(15, 23, 42, 0.7)",
          rockMain: "#334155", rockLight: "#94a3b8", rockDark: "#0f172a",
          turfTop: "#38bdf8", turfSide: "#0284c7",
          waterTop: "#0284c7", waterBot: "#0f172a",
        },
        falls: {
          skyTop: "#064e3b", skyMid: "#0d9488", skyBot: "#99f6e4", horizon: "#f0fdfa",
          sunCol: "#fef9c3", sunX: 65, sunY: 44,
          mtFar: "rgba(6, 78, 59, 0.4)", mtNear: "rgba(19, 78, 74, 0.6)",
          rockMain: "#334155", rockLight: "#64748b", rockDark: "#0f172a",
          turfTop: "#22c55e", turfSide: "#15803d",
          waterTop: "#2dd4bf", waterBot: "#0f766e",
        },
        chasm: {
          skyTop: "#1e1b4b", skyMid: "#581c87", skyBot: "#c084fc", horizon: "#fae8ff",
          sunCol: "#f5d0fe", sunX: 150, sunY: 45,
          mtFar: "rgba(59, 7, 100, 0.5)", mtNear: "rgba(30, 27, 75, 0.72)",
          rockMain: "#312e81", rockLight: "#6366f1", rockDark: "#1e1b4b",
          turfTop: "#a855f7", turfSide: "#6b21a8",
          waterTop: "#38bdf8", waterBot: "#1e3a8a",
        },
        basalt: {
          skyTop: "#18181b", skyMid: "#3f3f46", skyBot: "#ea580c", horizon: "#fdba74",
          sunCol: "#fb923c", sunX: 85, sunY: 54,
          mtFar: "rgba(39, 39, 42, 0.6)", mtNear: "rgba(24, 24, 27, 0.8)",
          rockMain: "#27272a", rockLight: "#52525b", rockDark: "#09090b",
          turfTop: "#f97316", turfSide: "#9a3412",
          waterTop: "#ea580c", waterBot: "#9a3412",
        },
        abyss: {
          skyTop: "#020617", skyMid: "#0f172a", skyBot: "#0d9488", horizon: "#5eead4",
          sunCol: "#99f6e4", sunX: 150, sunY: 44,
          mtFar: "rgba(15, 23, 42, 0.65)", mtNear: "rgba(2, 6, 23, 0.85)",
          rockMain: "#1e293b", rockLight: "#475569", rockDark: "#020617",
          turfTop: "#14b8a6", turfSide: "#0f766e",
          waterTop: "#0891b2", waterBot: "#164e63",
        },
      };

      const stageList = STAGES[key] || STAGES.easy;
      const s = {
        stageIdx: 0,
        nodes: [],
        edges: [],
        simNodes: [],
        blueprint: null,
        analysis: null,
        fractureMarks: [], // ślady pęknięć z ostatniej nieudanej próby
        tool: "wood",      // "road", "wood", "steel", "cable", "move", "erase"
        symmetry: true,
        showAnalysis: true,
        showBlueprint: false,
        simSpeed: 1,
        simulating: false,
        falling: false,
        splashed: false,
        gridAlpha: 1,
        vehicleX: 0,
        vehicleY: 100,
        vehicleVy: 0,
        vehicleAngle: 0,
        vehicleV: 38,
        wheelRot: 0,
        chassisBounce: 0,
        maxStressEver: 0,
        dragStartNode: -1,
        pointerDownPos: null,
        movingNode: -1,
        hoverNode: -1,
        hoverEdge: -1,
        cursorX: 150,
        cursorY: 100,
        shake: 0,
        bannerTime: 0,
        bannerText: "",
        gateOpen: 0,
        dust: [],
        sparks: [],
        debris: [],
        ripples: [],
        smoke: [],
        clouds: [
          { x: 40, y: 34, scale: 1.0, speed: 3.2 },
          { x: 145, y: 27, scale: 0.82, speed: 2.3 },
          { x: 245, y: 39, scale: 1.15, speed: 3.9 },
        ],
        birds: [
          { x: 60, y: 48, speed: 7.5, phase: 0 },
          { x: 68, y: 51, speed: 7.5, phase: 1.2 },
          { x: 190, y: 38, speed: 6.2, phase: 2.5 },
        ],
        boatX: 140,
        boatDir: 1,
      };

      const cloneState = () => ({
        nodes: s.nodes.map((n) => ({ ...n })),
        edges: s.edges.map((e) => ({ ...e, broken: false, stress: 0 })),
      });

      const saveUndo = ctx.undoable((prev) => {
        if (!prev) return;
        s.simulating = false;
        s.falling = false;
        s.dragStartNode = -1;
        s.nodes = prev.nodes.map((n) => ({ ...n, bornAt: 0 }));
        s.edges = prev.edges.map((e) => ({ ...e, broken: false, stress: 0, bornAt: 0 }));
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
        s.maxStressEver = 0;
        Sound.erase();
        refreshAnalysisAndPanel();
      });

      function spawnConstructionFx(x, y, color) {
        for (let i = 0; i < 8; i++) {
          const ang = (Math.PI * 2 * i) / 8 + Math.random() * 0.4;
          const spd = 14 + Math.random() * 24;
          s.sparks.push({
            x,
            y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 6,
            r: 1.2 + Math.random() * 1.2,
            c: color || theme.c,
            life: 0.35 + Math.random() * 0.2,
            maxLife: 0.55,
          });
        }
      }

      function spawnBreakFx(x1, y1, x2, y2, type) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        s.shake = Math.min(5.5, s.shake + 3.4);
        s.ripples.push({ x: mx, y: my, r: 2, maxR: 30, life: 0.48, maxLife: 0.48, c: theme.bad });
        s.fractureMarks.push({ x: mx, y: my, type });

        const ang = Math.atan2(y2 - y1, x2 - x1);
        const halfLen = Math.hypot(x2 - x1, y2 - y1) * 0.44;
        for (const side of [-1, 1]) {
          s.debris.push({
            x: mx + Math.cos(ang) * halfLen * 0.5 * side,
            y: my + Math.sin(ang) * halfLen * 0.5 * side,
            vx: (Math.random() - 0.5) * 30 + side * 16,
            vy: -20 - Math.random() * 22,
            ang,
            vang: (Math.random() - 0.5) * 9 + side * 3.5,
            len: halfLen,
            type,
            life: 1.35,
          });
        }

        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 20 + Math.random() * 46;
          s.sparks.push({
            x: mx,
            y: my,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 14,
            r: 1.3 + Math.random() * 1.5,
            c: i % 2 === 0 ? "#ef4444" : "#fbbf24",
            life: 0.45 + Math.random() * 0.35,
            maxLife: 0.8,
          });
        }
      }

      function spawnWaterSplash(x, y) {
        s.shake = 4.2;
        for (let i = 0; i < 26; i++) {
          const a = -Math.PI * (0.12 + Math.random() * 0.76);
          const sp = 30 + Math.random() * 58;
          s.sparks.push({
            x: x + (Math.random() - 0.5) * 14,
            y,
            vx: Math.cos(a) * sp * 0.65,
            vy: Math.sin(a) * sp,
            r: 1.5 + Math.random() * 2.0,
            c: "#e0f2fe",
            gravity: 135,
            life: 0.7 + Math.random() * 0.35,
            maxLife: 1.05,
          });
        }
        s.ripples.push({ x, y, r: 3, maxR: 38, life: 0.75, maxLife: 0.75, c: "#bae6fd", flat: true });
      }

      function initStage(idx) {
        const st = stageList[idx % stageList.length];
        const now = performance.now();
        s.nodes = st.anchors.map((a) => ({ ...a, bornAt: now }));
        s.edges = [];
        s.fractureMarks = [];
        s.simulating = false;
        s.falling = false;
        s.splashed = false;
        s.vehicleX = st.anchors[0].x - 18;
        s.vehicleY = st.anchors[0].y;
        s.vehicleVy = 0;
        s.vehicleAngle = 0;
        s.maxStressEver = 0;
        s.dragStartNode = -1;
        s.movingNode = -1;
        s.hoverEdge = -1;
        s.hoverNode = -1;
        s.gateOpen = 0;
        s.debris = [];
        s.sparks = [];
        s.ripples = [];
        s.smoke = [];
        s.bannerText = `Etap ${idx + 1}: ${st.name}`;
        s.bannerTime = idx > 0 ? 1.8 : 0;

        const left = st.anchors[0];
        const right = st.anchors[1];
        const segs = Math.max(4, Math.round((right.x - left.x) / 42));
        const deckIndices = [0];

        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          const nx = Math.round(left.x + (right.x - left.x) * t);
          const ny = Math.round(left.y + (right.y - left.y) * t);
          s.nodes.push({ x: nx, y: ny, fixed: false, deck: true, bornAt: now + i * 35 });
          deckIndices.push(s.nodes.length - 1);
        }
        deckIndices.push(1);

        for (let i = 0; i < deckIndices.length - 1; i++) {
          const i1 = deckIndices[i], i2 = deckIndices[i + 1];
          const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
          s.edges.push({ i1, i2, type: "road", len, stress: 0, broken: false, bornAt: now + i * 40 });
        }
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
        s.blueprint = buildSampleTruss(st, key === "easy" ? "wood" : "steel");
        s.analysis = analyzeBridgeStability(s.nodes, s.edges, st.vehicleWeight, st.wind || 0);
      }

      initStage(0);

      // --- BLOKI PANELU (4 własne bloki) ---
      const budgetEl = statBlock(ctx, "Budżet budowy", { meter: true });
      const statsEl = statsBlock(ctx, "Analiza projektu", ["Etap", "Prognoza", "Diagnoza"]);

      const matKeys = ["road", "wood", "steel", "cable", "arch", "spring"];
      const matLabels = ["Droga", "Drewno", "Stal", "Lina", "Żelbet", "Tłumik"];
      const matInfoDesc = el("span", "", MATERIAL_SPECS.wood.desc);
      const matInfoBadge = el("span", "arch-mat-badge", MATERIAL_SPECS.wood.badge);
      const matInfoBox = el("div", "arch-mat-info");
      matInfoBox.append(matInfoDesc, matInfoBadge);

      const matGrid = el("div", "arch-mat-grid");
      const matBtns = matKeys.map((k, idx) => {
        const b = button(matLabels[idx], "btn-ghost arch-mat-btn", () => {
          selectMaterial(k);
          Sound.tap();
        });
        matGrid.append(b);
        return b;
      });

      function selectMaterial(matKey) {
        s.tool = matKey;
        s.dragStartNode = -1;
        const spec = MATERIAL_SPECS[matKey] || MATERIAL_SPECS.wood;
        matInfoDesc.textContent = spec.desc;
        matInfoBadge.textContent = spec.badge;
        updateToolButtons();
      }

      ctx.panel.append(panelBlock("Konstruktor elementów", matGrid, matInfoBox));

      const testBtn = button("Przejazd próbny (Spacja)", "btn wide", () => toggleTest());
      const moveBtn = button("Przesuń węzeł", "btn-ghost", () => {
        s.dragStartNode = -1;
        if (s.tool === "move") {
          selectMaterial("wood");
        } else {
          s.tool = "move";
          matInfoDesc.textContent = "Chwyć dowolny węzeł kratownicy i przeciągnij go po siatce, aby dostroić kształt mostu.";
          matInfoBadge.textContent = "Korekta siatki";
          updateToolButtons();
        }
        Sound.tap();
      });
      const eraseBtn = button("Usuń element", "btn-ghost", () => {
        s.dragStartNode = -1;
        if (s.tool === "erase") {
          selectMaterial("wood");
        } else {
          s.tool = "erase";
          matInfoDesc.textContent = "Kliknij dowolną belkę lub węzeł na planszy (albo użyj prawego przycisku myszy), by je usunąć.";
          matInfoBadge.textContent = "Zwrot 100%";
          updateToolButtons();
        }
        Sound.tap();
      });
      const symBtn = button("Symetria: Wł.", "btn-ghost", () => {
        s.symmetry = !s.symmetry;
        symBtn.textContent = s.symmetry ? "Symetria: Wł." : "Symetria: Wył.";
        Sound.tap();
        ctx.toast(s.symmetry ? "Symetria włączona: elementy odbijają się lustrzanie." : "Symetria wyłączona.");
      });
      const hintBtn = button("Szkic: Wył.", "btn-ghost", () => {
        s.showBlueprint = !s.showBlueprint;
        hintBtn.textContent = s.showBlueprint ? "Szkic: Wł." : "Szkic: Wył.";
        Sound.tap();
      });

      function updateToolButtons() {
        matBtns.forEach((b, idx) => {
          b.classList.toggle("is-on", s.tool === matKeys[idx]);
        });
        moveBtn.textContent = s.tool === "move" ? "Przesuwanie: Wł." : "Przesuń węzeł";
        eraseBtn.textContent = s.tool === "erase" ? "Usuwanie: Wł." : "Usuń element";
      }
      updateToolButtons();

      const actionsGrid = el("div", "arch-actions-grid");
      actionsGrid.append(moveBtn, eraseBtn, symBtn, hintBtn);
      ctx.panel.append(panelBlock("Narzędzia i próba", testBtn, actionsGrid));

      function cleanOrphanNodes() {
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
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
      }

      function refreshAnalysisAndPanel() {
        const st = stageList[s.stageIdx % stageList.length];
        s.analysis = analyzeBridgeStability(s.nodes, s.edges, st.vehicleWeight, st.wind || 0);
        updatePanel();
      }

      function removeEdgeAt(edgeIdx) {
        if (edgeIdx < 0 || edgeIdx >= s.edges.length) return false;
        const rem = s.edges[edgeIdx];
        const n1 = s.nodes[rem.i1], n2 = s.nodes[rem.i2];
        saveUndo(cloneState());
        s.edges.splice(edgeIdx, 1);
        s.fractureMarks = [];

        if (s.symmetry && n1 && n2) {
          const mx1 = W - n1.x, my1 = n1.y;
          const mx2 = W - n2.x, my2 = n2.y;
          const mirrorIdx = s.edges.findIndex((e) => {
            const a = s.nodes[e.i1], b = s.nodes[e.i2];
            if (!a || !b) return false;
            const d1 = Math.hypot(a.x - mx1, a.y - my1) + Math.hypot(b.x - mx2, b.y - my2);
            const d2 = Math.hypot(a.x - mx2, a.y - my2) + Math.hypot(b.x - mx1, b.y - my1);
            return Math.min(d1, d2) < 4;
          });
          if (mirrorIdx >= 0) s.edges.splice(mirrorIdx, 1);
        }

        cleanOrphanNodes();
        Sound.erase();
        refreshAnalysisAndPanel();
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

      function segmentHitsShip(x1, y1, x2, y2, ship) {
        if (!ship) return false;
        for (let k = 0; k <= 8; k++) {
          const t = k / 8;
          const px = x1 + (x2 - x1) * t;
          const py = y1 + (y2 - y1) * t;
          if (px >= ship.x && px <= ship.x + ship.w && py >= ship.y && py <= ship.y + ship.h) {
            return true;
          }
        }
        return false;
      }

      function findOrCreateNode(x, y, isDeck) {
        for (let i = 0; i < s.nodes.length; i++) {
          if (Math.hypot(s.nodes[i].x - x, s.nodes[i].y - y) < 8) {
            if (isDeck) s.nodes[i].deck = true;
            return i;
          }
        }
        s.nodes.push({ x, y, fixed: false, deck: !!isDeck, bornAt: performance.now() });
        return s.nodes.length - 1;
      }

      function addBeamWithSymmetry(idx1, idx2, type) {
        const st = stageList[s.stageIdx % stageList.length];
        const i1 = Math.min(idx1, idx2);
        const i2 = Math.max(idx1, idx2);
        if (i1 === i2) return false;

        const n1 = s.nodes[i1], n2 = s.nodes[i2];
        const hitObstacle = segmentHitsStageObstacles(n1.x, n1.y, n2.x, n2.y, st);
        if (hitObstacle) {
          Sound.error();
          ctx.toast(`Kolizja z przeszkodą: ${hitObstacle}. Obejdź tę strefę.`);
          return false;
        }

        const now = performance.now();
        const upsertEdge = (aIdx, bIdx) => {
          const a = Math.min(aIdx, bIdx);
          const b = Math.max(aIdx, bIdx);
          if (a === b) return;
          const existingIdx = s.edges.findIndex((ed) => ed.i1 === a && ed.i2 === b);
          const len = Math.hypot(s.nodes[b].x - s.nodes[a].x, s.nodes[b].y - s.nodes[a].y);
          if (existingIdx >= 0) {
            s.edges[existingIdx].type = type;
            s.edges[existingIdx].bornAt = now;
          } else {
            s.edges.push({ i1: a, i2: b, type, len, stress: 0, broken: false, bornAt: now });
          }
          if (type === "road") {
            s.nodes[a].deck = true;
            s.nodes[b].deck = true;
          }
          spawnConstructionFx(s.nodes[a].x, s.nodes[a].y, theme.c);
          spawnConstructionFx(s.nodes[b].x, s.nodes[b].y, theme.c);
        };

        upsertEdge(i1, i2);

        if (s.symmetry && Math.abs(leftA_Y(st) - rightA_Y(st)) < 4) {
          const mx1 = W - n1.x, my1 = n1.y;
          const mx2 = W - n2.x, my2 = n2.y;
          const isSelfMirror = Math.hypot(mx1 - n2.x, my1 - n2.y) < 6 && Math.hypot(mx2 - n1.x, my2 - n1.y) < 6;
          if (!isSelfMirror && !segmentHitsStageObstacles(mx1, my1, mx2, my2, st)) {
            const mi1 = findOrCreateNode(mx1, my1, type === "road" || n1.deck);
            const mi2 = findOrCreateNode(mx2, my2, type === "road" || n2.deck);
            upsertEdge(mi1, mi2);
          }
        }

        s.fractureMarks = [];
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
        return true;
      }

      function leftA_Y(st) { return st.anchors[0]?.y || 100; }
      function rightA_Y(st) { return st.anchors[1]?.y || 100; }

      // Realizuje plan budowy pojedynczej belki lub wielosegmentowego ciągu z konstruktora
      function executeBeamPlan(startIdx, plan, type) {
        if (!plan || !plan.valid || plan.segments.length === 0) return false;
        saveUndo(cloneState());
        let curIdx = startIdx;
        let anyAdded = false;
        for (let k = 0; k < plan.segments.length; k++) {
          const seg = plan.segments[k];
          const isLast = k === plan.segments.length - 1;
          const nextIdx = isLast && plan.snapKind === "node" && plan.snapNodeIdx >= 0
            ? plan.snapNodeIdx
            : findOrCreateNode(seg.x2, seg.y2, type === "road");
          if (addBeamWithSymmetry(curIdx, nextIdx, type)) {
            anyAdded = true;
          }
          curIdx = nextIdx;
        }
        if (anyAdded) {
          Sound.place(3);
          refreshAnalysisAndPanel();
        } else {
          cleanOrphanNodes();
        }
        return anyAdded;
      }

      function updatePanel() {
        const st = stageList[s.stageIdx % stageList.length];
        const cost = calcBridgeCost(s.edges);
        const ecoLimit = Math.round(st.budget * 0.7);
        budgetEl.set(
          `${cost} / ${st.budget} zł`,
          cost / st.budget,
          cost > st.budget
            ? "Przekroczono budżet — usuń część elementów"
            : cost <= ecoLimit
            ? `Pozostało: ${st.budget - cost} zł (Premia oszczędności ≤ ${ecoLimit} zł)`
            : `Pozostało: ${st.budget - cost} zł`
        );

        const an = s.analysis || analyzeBridgeStability(s.nodes, s.edges, st.vehicleWeight, st.wind || 0);
        const shownStress = s.simulating ? s.maxStressEver : an.maxPredictedStress;

        statsEl.set("Etap", `${s.stageIdx + 1} z ${stagesCount}`);
        statsEl.set("Prognoza", `${Math.round(shownStress * 100)}%`);
        statsEl.set(
          "Diagnoza",
          !an.roadComplete
            ? "Brak drogi"
            : an.unbracedNodeIndices.length > 0
            ? `Chwiejny (${an.unbracedNodeIndices.length})`
            : an.willBreak
            ? "Pęknie!"
            : "Stabilny"
        );

        testBtn.textContent = s.simulating ? "Zatrzymaj próbę (Spacja)" : "Przejazd próbny (Spacja)";
        ctx.progress(s.stageIdx / stagesCount);
      }

      function toggleTest() {
        if (ctx.done) return;
        const st = stageList[s.stageIdx % stageList.length];
        s.dragStartNode = -1;

        if (s.simulating) {
          s.simulating = false;
          s.falling = false;
          s.splashed = false;
          s.vehicleX = st.anchors[0].x - 18;
          s.vehicleY = st.anchors[0].y;
          s.vehicleAngle = 0;
          s.gateOpen = 0;
          s.edges.forEach((e) => {
            e.broken = false;
            e.stress = 0;
          });
          s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
          Sound.tap();
          ctx.toast("Zatrzymano próbę i przywrócono projekt mostu.");
          refreshAnalysisAndPanel();
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
          ctx.toast("Połącz oba brzegi ciągłą jezdnią przed próbą.");
          return;
        }

        s.simulating = true;
        s.falling = false;
        s.splashed = false;
        s.fractureMarks = [];
        s.vehicleX = st.anchors[0].x - 18;
        s.vehicleY = st.anchors[0].y;
        s.vehicleVy = 0;
        s.vehicleAngle = 0;
        s.maxStressEver = 0;
        s.gateOpen = 0;
        s.debris = [];
        s.edges.forEach((e) => {
          e.broken = false;
          e.stress = 0;
        });
        s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
        Sound.line();
        ctx.toast("Rozpoczęto próbę obciążeniową mostu.");
        updatePanel();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "Escape") {
          if (s.dragStartNode >= 0) {
            s.dragStartNode = -1;
            Sound.tap();
          }
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          toggleTest();
        } else if (e.key === "1") {
          selectMaterial("road");
        } else if (e.key === "2") {
          selectMaterial("wood");
        } else if (e.key === "3") {
          selectMaterial("steel");
        } else if (e.key === "4") {
          selectMaterial("cable");
        } else if (e.key === "5") {
          selectMaterial("arch");
        } else if (e.key === "6") {
          selectMaterial("spring");
        } else if (e.key === "m" || e.key === "M") {
          moveBtn.click();
        } else if (e.key === "Delete" || e.key === "Backspace") {
          eraseBtn.click();
        } else if (e.key === "s" || e.key === "S") {
          symBtn.click();
        } else if (e.key === "h" || e.key === "H") {
          hintBtn.click();
        }
      });

      ctx.on(cv.cv, "contextmenu", (e) => {
        e.preventDefault();
        if (ctx.done || s.simulating) return;
        // Jeśli trwa rysowanie belki, prawy przycisk przerywa rysowanie
        if (s.dragStartNode >= 0) {
          s.dragStartNode = -1;
          Sound.tap();
          return;
        }
        const [x, y] = cv.at(e);
        const edgeIdx = findEdgeNear(x, y, 8);
        if (edgeIdx >= 0) {
          removeEdgeAt(edgeIdx);
          return;
        }
        const nodeIdx = s.nodes.findIndex((n) => !n.fixed && Math.hypot(n.x - x, n.y - y) < 10);
        if (nodeIdx >= 0) {
          saveUndo(cloneState());
          s.edges = s.edges.filter((ed) => ed.i1 !== nodeIdx && ed.i2 !== nodeIdx);
          cleanOrphanNodes();
          Sound.erase();
          refreshAnalysisAndPanel();
        }
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;
        if (s.simulating) {
          s.hoverEdge = -1;
          s.hoverNode = -1;
          return;
        }

        // Przesuwanie węzła po siatce (w trybie "move" lub z klawiszem Shift)
        if (s.movingNode >= 0 && s.nodes[s.movingNode] && !s.nodes[s.movingNode].fixed) {
          const gx = Math.max(25, Math.min(W - 25, Math.round(x / 5) * 5));
          const gy = Math.max(36, Math.min(176, Math.round(y / 5) * 5));
          const nd = s.nodes[s.movingNode];
          const oldX = nd.x, oldY = nd.y;
          if (gx !== oldX || gy !== oldY) {
            nd.x = gx;
            nd.y = gy;
            // Jeśli symetria włączona, przesuń również odpowiadający węzeł lustrzany
            if (s.symmetry) {
              const mirrorIdx = s.nodes.findIndex(
                (mn, idx) => idx !== s.movingNode && !mn.fixed && Math.hypot(mn.x - (W - oldX), mn.y - oldY) < 6
              );
              if (mirrorIdx >= 0) {
                s.nodes[mirrorIdx].x = W - gx;
                s.nodes[mirrorIdx].y = gy;
              }
            }
            for (const ed of s.edges) {
              const a = s.nodes[ed.i1], b = s.nodes[ed.i2];
              ed.len = Math.hypot(b.x - a.x, b.y - a.y);
            }
            s.simNodes = s.nodes.map((n) => ({ ...n, curX: n.x, curY: n.y, vx: 0, vy: 0 }));
            refreshAnalysisAndPanel();
          }
          return;
        }

        let nearN = -1;
        let bestND = 14;
        s.nodes.forEach((n, idx) => {
          const d = Math.hypot(n.x - x, n.y - y);
          if (d < bestND) {
            bestND = d;
            nearN = idx;
          }
        });
        s.hoverNode = nearN;
        s.hoverEdge = nearN < 0 ? findEdgeNear(x, y, 7) : -1;
      });

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;

        if (y <= 20 && x >= W - 125 && x <= W - 75) {
          s.simSpeed = s.simSpeed === 1 ? 2 : s.simSpeed === 2 ? 0.5 : 1;
          Sound.tap();
          ctx.toast(`Prędkość symulacji: ${s.simSpeed}×`);
          return;
        }
        if (s.simulating || e.button === 2) return;

        if (s.tool === "erase") {
          const edgeIdx = findEdgeNear(x, y, 8);
          if (edgeIdx >= 0) {
            removeEdgeAt(edgeIdx);
            return;
          }
          const nodeIdx = s.nodes.findIndex((n) => !n.fixed && Math.hypot(n.x - x, n.y - y) < 12);
          if (nodeIdx >= 0) {
            saveUndo(cloneState());
            s.edges = s.edges.filter((ed) => ed.i1 !== nodeIdx && ed.i2 !== nodeIdx);
            cleanOrphanNodes();
            Sound.erase();
            refreshAnalysisAndPanel();
          }
          return;
        }

        // Znajdź węzeł w zasięgu magnetycznym (14 jednostek)
        let nearIdx = -1;
        let bestDist = 14;
        s.nodes.forEach((n, i) => {
          const d = Math.hypot(n.x - x, n.y - y);
          if (d < bestDist) {
            bestDist = d;
            nearIdx = i;
          }
        });

        // Tryb przesuwania węzła ("move" albo Shift + przeciągnięcie)
        if (nearIdx >= 0 && (s.tool === "move" || e.shiftKey)) {
          if (s.nodes[nearIdx].fixed) {
            Sound.error();
            ctx.toast("Stałych punktów kotwiczenia w skale nie można przesuwać.");
            return;
          }
          saveUndo(cloneState());
          s.movingNode = nearIdx;
          s.dragStartNode = -1;
          Sound.tap();
          return;
        }

        if (s.tool === "move") return;

        // Jeśli jesteśmy już w trybie klik-klik (dragStartNode >= 0), drugie kliknięcie zatwierdza belkę!
        if (s.dragStartNode >= 0) {
          if (nearIdx === s.dragStartNode) {
            s.dragStartNode = -1;
            Sound.tap();
            return;
          }
          const spec = MATERIAL_SPECS[s.tool] || MATERIAL_SPECS.wood;
          const plan = planBeamConstruction(s.nodes, s.dragStartNode, x, y, spec);
          if (plan.valid) {
            executeBeamPlan(s.dragStartNode, plan, s.tool);
          } else if (plan.tooLong) {
            Sound.error();
            ctx.toast("Zbyt dalekie przeciągnięcie.");
          }
          s.dragStartNode = -1;
          s.pointerDownPos = null;
          return;
        }

        // Rozpoczynamy budowę wyłącznie z istniejącego węzła (zero przypadkowych luźnych węzłów w powietrzu!)
        if (nearIdx >= 0) {
          s.dragStartNode = nearIdx;
          s.pointerDownPos = { x, y };
          Sound.tap();
        } else {
          // Kliknięcie w istniejącą belkę pozwala szybko zmienić jej materiał (np. Drewno <-> Stal)
          const hitEdge = findEdgeNear(x, y, 6.5);
          if (hitEdge >= 0) {
            if (s.edges[hitEdge].type !== s.tool) {
              saveUndo(cloneState());
              addBeamWithSymmetry(s.edges[hitEdge].i1, s.edges[hitEdge].i2, s.tool);
              Sound.place(2);
              refreshAnalysisAndPanel();
            } else {
              ctx.toast("Zacznij ciągnąć od węzła (kółka lub kotwicy), aby zbudować nową belkę.");
            }
          } else {
            ctx.toast("Najedź na węzeł (złapie się magnetycznie) i wyciągnij z niego belkę.");
          }
        }
      });

      ctx.on(document, "pointerup", (e) => {
        if (s.movingNode >= 0) {
          s.movingNode = -1;
          return;
        }
        if (s.dragStartNode >= 0 && s.pointerDownPos) {
          const [x, y] = cv.at(e);
          const dragMoved = Math.hypot(x - s.pointerDownPos.x, y - s.pointerDownPos.y);
          // Jeśli gracz tylko kliknął węzeł (dragMoved < 10), pozostawiamy aktywne łączenie klik-klik!
          if (dragMoved < 10) {
            s.pointerDownPos = null;
            return;
          }

          const spec = MATERIAL_SPECS[s.tool] || MATERIAL_SPECS.wood;
          const plan = planBeamConstruction(s.nodes, s.dragStartNode, x, y, spec);
          if (plan.valid) {
            executeBeamPlan(s.dragStartNode, plan, s.tool);
          } else if (plan.tooLong) {
            Sound.error();
            ctx.toast("Zbyt duża odległość — skróć odcinek.");
          }
          s.dragStartNode = -1;
          s.pointerDownPos = null;
        }
      });

      refreshAnalysisAndPanel();

      // --- RYSOWANIE POJAZDÓW WYSOKIEJ SZCZEGÓŁOWOŚCI ---
      function drawVehicle(st, vehX, vehY, vehAng, now) {
        g.save();
        const bounce = s.simulating && !s.falling ? Math.sin(now * 0.03) * 0.42 + s.chassisBounce : 0;
        g.translate(vehX, vehY - 5.5 + bounce);
        g.rotate(vehAng);

        g.fillStyle = "rgba(2, 6, 23, 0.35)";
        g.beginPath();
        g.ellipse(0, 5.2 - bounce, 12.5, 1.5, 0, 0, Math.PI * 2);
        g.fill();

        const beamGrad = g.createLinearGradient(10, -2, 42, -2);
        beamGrad.addColorStop(0, "rgba(254, 240, 138, 0.28)");
        beamGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        g.fillStyle = beamGrad;
        g.beginPath();
        g.moveTo(11, -2);
        g.lineTo(42, -9);
        g.lineTo(42, 4.5);
        g.closePath();
        g.fill();

        const vType = st.vehicleType || (st.vehicleWeight < 1.2 ? "car" : st.vehicleWeight < 1.8 ? "bus" : "truck");

        if (vType === "car") {
          const bodyG = g.createLinearGradient(0, -9, 0, 3);
          bodyG.addColorStop(0, "#38bdf8");
          bodyG.addColorStop(1, "#0284c7");
          g.fillStyle = bodyG;
          g.beginPath();
          g.roundRect(-11, -4.4, 22, 7.0, 2.5);
          g.fill();
          g.beginPath();
          g.roundRect(-7, -8.8, 13, 5.0, 2.2);
          g.fill();
          g.fillStyle = "#e0f2fe";
          g.fillRect(-1.0, -7.8, 5.8, 3.4);
          g.fillRect(-5.8, -7.8, 3.8, 3.4);
        } else if (vType === "van") {
          const bodyG = g.createLinearGradient(0, -9, 0, 3);
          bodyG.addColorStop(0, "#14b8a6");
          bodyG.addColorStop(1, "#0f766e");
          g.fillStyle = bodyG;
          g.beginPath();
          g.roundRect(-12, -8.6, 24, 11.0, 2.2);
          g.fill();
          g.fillStyle = "#ccfbf1";
          g.fillRect(4.5, -7.2, 6.0, 4.4);
          g.fillStyle = "#5eead4";
          g.fillRect(-10, -3.5, 13, 1.5);
        } else if (vType === "bus") {
          const bodyG = g.createLinearGradient(0, -10, 0, 3);
          bodyG.addColorStop(0, "#fbbf24");
          bodyG.addColorStop(1, "#d97706");
          g.fillStyle = bodyG;
          g.beginPath();
          g.roundRect(-14, -9.2, 28, 11.6, 2.4);
          g.fill();
          g.fillStyle = "#fef3c7";
          for (const wx of [-11.2, -5.2, 0.8, 6.8]) {
            g.fillRect(wx, -7.6, 4.6, 4.2);
          }
          g.fillStyle = "#92400e";
          g.fillRect(-13.5, -2.2, 27, 1.2);
        } else if (vType === "crane") {
          g.strokeStyle = "#facc15";
          g.lineWidth = 2.4;
          g.beginPath();
          g.moveTo(-9, -6.5);
          g.lineTo(14, -14.5);
          g.stroke();
          g.fillStyle = "#eab308";
          g.beginPath();
          g.roundRect(-13.5, -7.0, 26, 9.5, 1.8);
          g.fill();
          g.fillStyle = "#fef08a";
          g.fillRect(5.5, -5.8, 5.8, 4.2);
        } else if (vType === "dump" || vType === "truck") {
          g.fillStyle = "#d97706";
          g.beginPath();
          g.moveTo(-14.5, -10.0);
          g.lineTo(2.0, -10.0);
          g.lineTo(2.0, -0.8);
          g.lineTo(-12.5, -0.8);
          g.closePath();
          g.fill();
          g.strokeStyle = "#92400e";
          g.lineWidth = 0.8;
          for (const rx of [-10, -6, -2]) {
            g.beginPath();
            g.moveTo(rx, -9.5);
            g.lineTo(rx, -1.2);
            g.stroke();
          }
          g.fillStyle = "#ef4444";
          g.beginPath();
          g.roundRect(2.5, -8.2, 9.8, 10.4, 1.8);
          g.fill();
          g.fillStyle = "#bae6fd";
          g.fillRect(6.2, -6.8, 5.0, 4.2);
        } else {
          const trG = g.createLinearGradient(0, -11, 0, 2);
          trG.addColorStop(0, "#8b5cf6");
          trG.addColorStop(1, "#5b21b6");
          g.fillStyle = trG;
          g.beginPath();
          g.roundRect(-16.5, -10.6, 20.5, 12.6, 1.8);
          g.fill();
          g.fillStyle = "#c4b5fd";
          g.fillRect(-14.5, -7.8, 16.5, 2.6);
          g.fillStyle = "#dc2626";
          g.beginPath();
          g.roundRect(4.5, -8.6, 10.2, 10.6, 1.8);
          g.fill();
          g.fillStyle = "#e0f2fe";
          g.fillRect(8.4, -7.0, 5.2, 4.4);
        }

        g.fillStyle = "#fef08a";
        g.fillRect(10.8, -1.6, 1.6, 2.2);
        g.fillStyle = "#ef4444";
        g.fillRect(-13.8, -1.6, 1.5, 2.0);

        const wheelXs = st.vehicleWeight >= 2.8 ? [-10.8, -2.5, 8.2] : [-8.0, 8.0];
        for (const wx of wheelXs) {
          const wy = 3.2 - bounce * 0.55;
          g.fillStyle = "#090d16";
          g.beginPath();
          g.arc(wx, wy, 3.3, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = "#64748b";
          g.beginPath();
          g.arc(wx, wy, 1.8, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "#f8fafc";
          g.lineWidth = 0.75;
          g.beginPath();
          g.moveTo(wx + Math.cos(s.wheelRot) * 1.7, wy + Math.sin(s.wheelRot) * 1.7);
          g.lineTo(wx - Math.cos(s.wheelRot) * 1.7, wy - Math.sin(s.wheelRot) * 1.7);
          g.stroke();
        }
        g.restore();
      }

      // Rysuje fasetowane zbocze klifu 2.5D wraz z przyczółkiem betonowym, murawą i barierkami
      function drawSculptedCliff(side, ax, ay, envTheme, now) {
        const isLeft = side === "left";
        const edgeX = ax;
        const botBreakX = isLeft ? ax + 14 : ax - 14;
        const midBreakX = isLeft ? ax + 7 : ax - 7;

        g.fillStyle = envTheme.rockMain;
        g.beginPath();
        if (isLeft) {
          g.moveTo(0, ay);
          g.lineTo(edgeX, ay);
          g.lineTo(midBreakX, ay + 42);
          g.lineTo(botBreakX, H);
          g.lineTo(0, H);
        } else {
          g.moveTo(edgeX, ay);
          g.lineTo(W, ay);
          g.lineTo(W, H);
          g.lineTo(botBreakX, H);
          g.lineTo(midBreakX, ay + 42);
        }
        g.closePath();
        g.fill();

        g.fillStyle = envTheme.rockLight;
        g.beginPath();
        if (isLeft) {
          g.moveTo(0, ay + 8);
          g.lineTo(edgeX - 4, ay + 14);
          g.lineTo(midBreakX - 2, ay + 42);
          g.lineTo(0, ay + 34);
        } else {
          g.moveTo(edgeX + 4, ay + 14);
          g.lineTo(W, ay + 8);
          g.lineTo(W, ay + 34);
          g.lineTo(midBreakX + 2, ay + 42);
        }
        g.closePath();
        g.fill();

        g.fillStyle = envTheme.rockDark;
        g.beginPath();
        if (isLeft) {
          g.moveTo(edgeX - 6, ay + 14);
          g.lineTo(edgeX, ay);
          g.lineTo(midBreakX, ay + 42);
          g.lineTo(botBreakX, H);
          g.lineTo(botBreakX - 14, H);
        } else {
          g.moveTo(edgeX, ay);
          g.lineTo(edgeX + 6, ay + 14);
          g.lineTo(botBreakX + 14, H);
          g.lineTo(botBreakX, H);
          g.lineTo(midBreakX, ay + 42);
        }
        g.closePath();
        g.fill();

        const abX = isLeft ? ax - 13 : ax;
        g.fillStyle = "#64748b";
        g.fillRect(abX, ay - 1, 13, 22);
        g.fillStyle = "#94a3b8";
        g.fillRect(abX - (isLeft ? 1 : -1), ay - 1, 13, 3.5);
        g.strokeStyle = "#1e293b";
        g.lineWidth = 0.8;
        g.strokeRect(abX, ay - 1, 13, 22);

        g.fillStyle = envTheme.turfSide;
        if (isLeft) g.fillRect(0, ay - 3.5, ax - 11, 4);
        else g.fillRect(ax + 11, ay - 3.5, W - ax - 11, 4);

        g.fillStyle = envTheme.turfTop;
        if (isLeft) g.fillRect(0, ay - 4.8, ax - 11, 2.2);
        else g.fillRect(ax + 11, ay - 4.8, W - ax - 11, 2.2);

        g.fillStyle = "#0f172a";
        if (isLeft) g.fillRect(0, ay - 2.2, ax + 1, 4.6);
        else g.fillRect(ax - 1, ay - 2.2, W - ax + 1, 4.6);

        g.strokeStyle = "rgba(248, 250, 252, 0.55)";
        g.lineWidth = 0.7;
        g.setLineDash([3, 3]);
        g.beginPath();
        if (isLeft) {
          g.moveTo(2, ay);
          g.lineTo(ax - 2, ay);
        } else {
          g.moveTo(ax + 2, ay);
          g.lineTo(W - 2, ay);
        }
        g.stroke();
        g.setLineDash([]);

        const sway = Math.sin(now * 0.0025) * 0.9;
        const treeXs = isLeft ? [11, 23, 36] : [W - 36, W - 23, W - 11];
        for (const tx of treeXs) {
          if ((isLeft && tx < ax - 24) || (!isLeft && tx > ax + 24)) {
            const ty = ay - 3.5;
            g.fillStyle = "#451a03";
            g.fillRect(tx - 1, ty - 4.5, 2, 4.5);
            g.fillStyle = envTheme.turfSide;
            g.beginPath();
            g.moveTo(tx + sway, ty - 16);
            g.lineTo(tx + 5, ty - 4);
            g.lineTo(tx - 5, ty - 4);
            g.closePath();
            g.fill();
            g.fillStyle = envTheme.turfTop;
            g.beginPath();
            g.moveTo(tx + sway * 1.2, ty - 19);
            g.lineTo(tx + 4, ty - 9);
            g.lineTo(tx - 4, ty - 9);
            g.closePath();
            g.fill();
          }
        }
      }

      // Rysuje celownik magnetyczny wokół węzła (pokazuje wyraźnie, że kursor złapał złącze)
      function drawMagneticReticle(x, y, radius, color, now) {
        const pulse = Math.sin(now * 0.012) * 0.9;
        const r = radius + pulse;
        g.save();
        g.strokeStyle = color;
        g.lineWidth = 1.3;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.stroke();

        // Cztery narożniki celownika CAD
        const cLen = 3.2;
        const off = r + 1.8;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          g.beginPath();
          g.moveTo(x + sx * off, y + sy * (off - cLen));
          g.lineTo(x + sx * off, y + sy * off);
          g.lineTo(x + sx * (off - cLen), y + sy * off);
          g.stroke();
        }
        g.restore();
      }

      cv.loop((rawDt, now) => {
        const dt = rawDt * (s.simulating ? s.simSpeed : 1);
        const st = stageList[s.stageIdx % stageList.length];
        const envTheme = ENV_THEMES[st.env] || ENV_THEMES.valley;
        const leftA = st.anchors[0];
        const rightA = st.anchors[1];

        if (s.shake > 0) s.shake = Math.max(0, s.shake - rawDt * 10);
        if (s.bannerTime > 0) s.bannerTime = Math.max(0, s.bannerTime - rawDt);
        s.chassisBounce *= Math.pow(0.05, rawDt);

        const targetGridAlpha = s.simulating ? 0.0 : 1.0;
        s.gridAlpha += (targetGridAlpha - s.gridAlpha) * Math.min(1, rawDt * 8);

        s.boatX += s.boatDir * 9 * dt;
        if (s.boatX > rightA.x - 32) s.boatDir = -1;
        if (s.boatX < leftA.x + 32) s.boatDir = 1;

        // Symulacja przejazdu pojazdu i dynamiki kratownicy
        if (s.simulating) {
          if (s.falling) {
            s.vehicleVy += 180 * dt;
            s.vehicleY += s.vehicleVy * dt;
            s.vehicleX += s.vehicleV * 0.35 * dt;
            s.vehicleAngle += 1.8 * dt;
            if (!s.splashed && s.vehicleY >= H - 22) {
              s.splashed = true;
              spawnWaterSplash(s.vehicleX, H - 18);
              Sound.erase();
            }
            if (s.vehicleY > H + 8) {
              s.simulating = false;
              s.falling = false;
              refreshAnalysisAndPanel();
            }
          } else {
            const prevX = s.vehicleX;
            s.vehicleX += s.vehicleV * dt;
            s.wheelRot += s.vehicleV * dt * 0.25;

            if (Math.random() < 0.45) {
              s.smoke.push({
                x: s.vehicleX - 12,
                y: s.vehicleY - 4,
                vx: -8 - Math.random() * 6,
                vy: -6 - Math.random() * 8,
                r: 1.6,
                life: 0.55,
              });
            }

            const prevBroken = s.edges.map((e) => !!e.broken);
            const prevSim = s.simNodes.map((n) => ({
              curX: n.curX,
              curY: n.curY,
              vx: n.vx || 0,
              vy: n.vy || 0,
            }));

            const res = solveTrussStress(s.nodes, s.edges, s.vehicleX, st.vehicleWeight, st.wind || 0);

            s.simNodes = res.simNodes.map((n, idx) => {
              if (n.fixed || !prevSim[idx]) return { ...n, vx: 0, vy: 0 };
              const p = prevSim[idx];
              const ax = (n.curX - p.curX) * 190 - p.vx * 16;
              const ay = (n.curY - p.curY) * 190 - p.vy * 16;
              const vx = (p.vx + ax * dt) * 0.92;
              const vy = (p.vy + ay * dt) * 0.92;
              return {
                ...n,
                curX: p.curX + vx * dt + (n.curX - p.curX) * Math.min(1, dt * 18),
                curY: p.curY + vy * dt + (n.curY - p.curY) * Math.min(1, dt * 18),
                vx,
                vy,
              };
            });

            for (const n of s.simNodes) {
              if (n.deck && prevX < n.curX && s.vehicleX >= n.curX) {
                s.chassisBounce = -1.15;
              }
            }

            s.edges.forEach((e, idx) => {
              if (e.broken && !prevBroken[idx]) {
                const n1 = s.simNodes[e.i1], n2 = s.simNodes[e.i2];
                if (n1 && n2) {
                  spawnBreakFx(n1.curX, n1.curY, n2.curX, n2.curY, e.type);
                  Sound.error();
                }
              }
            });

            s.maxStressEver = Math.max(s.maxStressEver, res.maxStress);

            const roadPath = findRoadPath(s.simNodes, s.edges);
            const vehSample = sampleVehicleOnRoad(s.simNodes, roadPath.nodePath, s.vehicleX);
            s.vehicleY = vehSample.y;
            s.vehicleAngle = vehSample.angle;

            if (s.vehicleX > rightA.x - 36) {
              s.gateOpen = Math.min(1, s.gateOpen + dt * 3.5);
            }

            for (const e of s.edges) {
              if (!e.broken && e.stress > 0.65 && Math.random() < 0.34) {
                const n1 = s.simNodes[e.i1], n2 = s.simNodes[e.i2];
                const t = Math.random();
                s.dust.push({
                  x: n1.curX + (n2.curX - n1.curX) * t,
                  y: n1.curY + (n2.curY - n1.curY) * t,
                  vx: (Math.random() - 0.5) * 10,
                  vy: 10 + Math.random() * 20,
                  c: e.stress > 0.85 ? "#ef4444" : "#f59e0b",
                  life: 0.55,
                });
              }
            }

            if (res.deckBroken || (!roadPath.complete && s.vehicleX > leftA.x + 4)) {
              s.falling = true;
              s.vehicleVy = 25;
              Sound.error();
              ctx.toast("Element konstrukcyjny pękł (100% naprężenia). Zobacz ślad ✕ na planszy.");
              updatePanel();
            } else if (s.vehicleX > rightA.x + 18) {
              s.simulating = false;
              spawnConstructionFx(rightA.x + 10, rightA.y - 10, "#fbbf24");
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
                refreshAnalysisAndPanel();
              }
            } else {
              updatePanel();
            }
          }
        }

        // --- RYSOWANIE SCENERII 2.5D ---
        g.save();
        if (s.shake > 0) {
          g.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
        }

        const skyGrad = g.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, envTheme.skyTop);
        skyGrad.addColorStop(0.52, envTheme.skyMid);
        skyGrad.addColorStop(0.84, envTheme.skyBot);
        skyGrad.addColorStop(1, envTheme.horizon);
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, H);

        const sunGlow = g.createRadialGradient(
          envTheme.sunX, envTheme.sunY, 2,
          envTheme.sunX, envTheme.sunY, 34
        );
        sunGlow.addColorStop(0, envTheme.sunCol);
        sunGlow.addColorStop(0.35, "rgba(254, 240, 138, 0.25)");
        sunGlow.addColorStop(1, "rgba(254, 240, 138, 0)");
        g.fillStyle = sunGlow;
        g.beginPath();
        g.arc(envTheme.sunX, envTheme.sunY, 34, 0, Math.PI * 2);
        g.fill();

        g.fillStyle = envTheme.mtFar;
        g.beginPath();
        g.moveTo(0, H);
        g.lineTo(0, 86);
        g.lineTo(42, 56);
        g.lineTo(88, 82);
        g.lineTo(148, 48);
        g.lineTo(205, 79);
        g.lineTo(255, 54);
        g.lineTo(W, 82);
        g.lineTo(W, H);
        g.closePath();
        g.fill();

        g.fillStyle = envTheme.mtNear;
        g.beginPath();
        g.moveTo(0, H);
        g.lineTo(0, 102);
        g.lineTo(68, 72);
        g.lineTo(122, 98);
        g.lineTo(188, 68);
        g.lineTo(242, 96);
        g.lineTo(W, 78);
        g.lineTo(W, H);
        g.closePath();
        g.fill();

        if (st.env === "falls") {
          const wfGrad = g.createLinearGradient(135, 55, 165, H - 18);
          wfGrad.addColorStop(0, "rgba(240, 253, 250, 0.35)");
          wfGrad.addColorStop(1, "rgba(45, 212, 191, 0.12)");
          g.fillStyle = wfGrad;
          g.fillRect(138, 56, 24, H - 74);

          g.strokeStyle = "rgba(255, 255, 255, 0.32)";
          g.lineWidth = 1.0;
          const fallOffset = (now * 0.04) % 16;
          for (let fx = 141; fx <= 159; fx += 4.5) {
            g.beginPath();
            g.moveTo(fx, 58 + fallOffset);
            g.lineTo(fx, H - 24);
            g.stroke();
          }
        }

        g.strokeStyle = "rgba(248, 250, 252, 0.45)";
        g.lineWidth = 0.8;
        for (const b of s.birds) {
          const bx = ((b.x + now * 0.001 * b.speed) % (W + 40)) - 20;
          const by = b.y + Math.sin(now * 0.003 + b.phase) * 2.5;
          const flap = Math.sin(now * 0.012 + b.phase) * 1.8;
          g.beginPath();
          g.moveTo(bx - 3, by - flap);
          g.quadraticCurveTo(bx - 1, by - 1.5, bx, by);
          g.quadraticCurveTo(bx + 1, by - 1.5, bx + 3, by - flap);
          g.stroke();
        }

        g.fillStyle = "rgba(255, 255, 255, 0.14)";
        for (const c of s.clouds) {
          const cx = ((c.x + now * 0.001 * c.speed) % (W + 60)) - 30;
          const cy = c.y;
          const r = 8 * c.scale;
          g.beginPath();
          g.arc(cx, cy, r, 0, Math.PI * 2);
          g.arc(cx + r * 0.85, cy - r * 0.22, r * 0.82, 0, Math.PI * 2);
          g.arc(cx + r * 1.65, cy, r * 0.9, 0, Math.PI * 2);
          g.fill();
        }

        // Siatka inżynieryjna (blueprint CAD) z węzłami siatki co 10 m
        if (s.gridAlpha > 0.02) {
          g.save();
          g.globalAlpha = s.gridAlpha;
          g.strokeStyle = "rgba(226, 232, 240, 0.11)";
          g.lineWidth = 0.35;
          for (let gx = 10; gx < W; gx += 10) {
            g.beginPath();
            g.moveTo(gx, 22);
            g.lineTo(gx, H - 18);
            g.stroke();
          }
          for (let gy = 25; gy < H - 18; gy += 10) {
            g.beginPath();
            g.moveTo(0, gy);
            g.lineTo(W, gy);
            g.stroke();
          }

          if (s.symmetry) {
            g.strokeStyle = "rgba(56, 189, 248, 0.32)";
            g.lineWidth = 0.75;
            g.setLineDash([3, 3]);
            g.beginPath();
            g.moveTo(W / 2, 24);
            g.lineTo(W / 2, H - 22);
            g.stroke();
            g.setLineDash([]);
          }

          const dimY = 30;
          g.strokeStyle = "rgba(248, 250, 252, 0.48)";
          g.lineWidth = 0.65;
          g.beginPath();
          g.moveTo(leftA.x, dimY - 3);
          g.lineTo(leftA.x, dimY + 3);
          g.moveTo(rightA.x, dimY - 3);
          g.lineTo(rightA.x, dimY + 3);
          g.moveTo(leftA.x, dimY);
          g.lineTo(rightA.x, dimY);
          g.stroke();
          const typeLabel = st.bridgeType ? ` · ${st.bridgeType}` : "";
          const windLabel = st.wind ? ` · Wiatr ${Math.round(st.wind * 40)} m/s` : "";
          cv.text(`Rozpiętość: ${rightA.x - leftA.x} m${typeLabel}${windLabel}`, (leftA.x + rightA.x) / 2, dimY - 4.2, {
            size: 4.0,
            weight: 600,
            color: "rgba(248, 250, 252, 0.88)",
            align: "center",
          });
          g.restore();
        }

        if (st.ship) {
          g.strokeStyle = "rgba(251, 191, 36, 0.55)";
          g.fillStyle = "rgba(251, 191, 36, 0.09)";
          g.lineWidth = 0.85;
          g.setLineDash([2.5, 2.5]);
          g.fillRect(st.ship.x, st.ship.y, st.ship.w, st.ship.h);
          g.strokeRect(st.ship.x, st.ship.y, st.ship.w, st.ship.h);
          g.setLineDash([]);
          cv.text(st.ship.label, st.ship.x + st.ship.w / 2, st.ship.y + 6, {
            size: 3.8,
            weight: 600,
            color: "#fef08a",
            align: "center",
          });
        }

        // Różnorodne przeszkody inżynieryjne: gazociągi, głazy, stalaktyty, iglice skalne i korytarze balonów
        if (st.obstacles) {
          for (const ob of st.obstacles) {
            g.save();
            if (ob.kind === "pipe") {
              // Rurociąg przemysłowy nad przepaścią
              g.fillStyle = "rgba(239, 68, 68, 0.12)";
              g.strokeStyle = "rgba(248, 113, 113, 0.65)";
              g.lineWidth = 0.8;
              g.setLineDash([2, 2]);
              g.fillRect(ob.x, ob.y, ob.w, ob.h);
              g.strokeRect(ob.x, ob.y, ob.w, ob.h);
              g.setLineDash([]);
              const py = ob.y + ob.h / 2;
              g.fillStyle = "#dc2626";
              g.beginPath();
              g.roundRect(ob.x + 4, py - 5, ob.w - 8, 10, 4);
              g.fill();
              g.fillStyle = "#fca5a5";
              g.fillRect(ob.x + 8, py - 3, ob.w - 16, 2.2);
              // Kołnierze rurociągu
              g.fillStyle = "#991b1b";
              g.fillRect(ob.x + ob.w * 0.32, py - 6.2, 3, 12.4);
              g.fillRect(ob.x + ob.w * 0.68, py - 6.2, 3, 12.4);
            } else if (ob.kind === "air") {
              // Korytarz powietrzny z balonem obserwacyjnym
              g.fillStyle = "rgba(56, 189, 248, 0.10)";
              g.strokeStyle = "rgba(56, 189, 248, 0.55)";
              g.lineWidth = 0.8;
              g.setLineDash([3, 2.5]);
              g.fillRect(ob.x, ob.y, ob.w, ob.h);
              g.strokeRect(ob.x, ob.y, ob.w, ob.h);
              g.setLineDash([]);
              const balX = ob.x + ob.w / 2 + Math.sin(now * 0.0018) * 12;
              const balY = ob.y + ob.h / 2 + Math.cos(now * 0.0025) * 3;
              g.fillStyle = "#f97316";
              g.beginPath();
              g.arc(balX, balY - 3, 8.5, 0, Math.PI * 2);
              g.fill();
              g.fillStyle = "#fde047";
              g.beginPath();
              g.arc(balX, balY - 3, 4.5, 0, Math.PI * 2);
              g.fill();
              g.fillStyle = "#78350f";
              g.fillRect(balX - 2.5, balY + 7, 5, 3.5);
            } else if (ob.kind === "stalactite") {
              // Stalaktyty jaskiniowe zwisające ze stropu
              g.fillStyle = "rgba(15, 23, 42, 0.25)";
              g.strokeStyle = "rgba(248, 113, 113, 0.55)";
              g.lineWidth = 0.8;
              g.setLineDash([2.5, 2]);
              g.fillRect(ob.x, ob.y, ob.w, ob.h);
              g.strokeRect(ob.x, ob.y, ob.w, ob.h);
              g.setLineDash([]);

              const spikes = Math.max(4, Math.floor(ob.w / 18));
              const sw = ob.w / spikes;
              for (let k = 0; k < spikes; k++) {
                const sx = ob.x + k * sw;
                const sh = ob.h * (0.68 + ((k * 37) % 32) / 100);
                g.fillStyle = envTheme.rockDark;
                g.beginPath();
                g.moveTo(sx, ob.y);
                g.lineTo(sx + sw, ob.y);
                g.lineTo(sx + sw * 0.5, ob.y + sh);
                g.closePath();
                g.fill();

                g.fillStyle = envTheme.rockLight;
                g.beginPath();
                g.moveTo(sx + sw * 0.15, ob.y);
                g.lineTo(sx + sw * 0.5, ob.y);
                g.lineTo(sx + sw * 0.5, ob.y + sh * 0.88);
                g.closePath();
                g.fill();
              }
            } else if (ob.kind === "spire") {
              // Ostra iglica skalna wyrastająca z dna przepaści
              g.fillStyle = "rgba(15, 23, 42, 0.22)";
              g.strokeStyle = "rgba(248, 113, 113, 0.55)";
              g.lineWidth = 0.8;
              g.setLineDash([2.5, 2]);
              g.fillRect(ob.x, ob.y, ob.w, ob.h);
              g.strokeRect(ob.x, ob.y, ob.w, ob.h);
              g.setLineDash([]);

              const cx = ob.x + ob.w / 2;
              g.fillStyle = envTheme.rockMain;
              g.beginPath();
              g.moveTo(ob.x + 2, ob.y + ob.h);
              g.lineTo(cx - 5, ob.y + 3);
              g.lineTo(cx + 2, ob.y + 1);
              g.lineTo(ob.x + ob.w - 2, ob.y + ob.h);
              g.closePath();
              g.fill();

              g.fillStyle = envTheme.rockLight;
              g.beginPath();
              g.moveTo(ob.x + 4, ob.y + ob.h);
              g.lineTo(cx - 5, ob.y + 3);
              g.lineTo(cx, ob.y + ob.h);
              g.closePath();
              g.fill();
            } else {
              // Fasetowany głaz / występ skalny ("boulder")
              g.fillStyle = "rgba(15, 23, 42, 0.22)";
              g.strokeStyle = "rgba(248, 113, 113, 0.65)";
              g.lineWidth = 0.85;
              g.setLineDash([2.5, 2]);
              g.fillRect(ob.x, ob.y, ob.w, ob.h);
              g.strokeRect(ob.x, ob.y, ob.w, ob.h);
              g.setLineDash([]);

              g.fillStyle = envTheme.rockMain;
              g.beginPath();
              g.moveTo(ob.x + 5, ob.y + 2);
              g.lineTo(ob.x + ob.w - 4, ob.y + 3);
              g.lineTo(ob.x + ob.w - 1, ob.y + ob.h * 0.65);
              g.lineTo(ob.x + ob.w - 6, ob.y + ob.h - 2);
              g.lineTo(ob.x + 6, ob.y + ob.h - 1);
              g.lineTo(ob.x + 1, ob.y + ob.h * 0.5);
              g.closePath();
              g.fill();

              g.fillStyle = envTheme.rockLight;
              g.beginPath();
              g.moveTo(ob.x + 5, ob.y + 2);
              g.lineTo(ob.x + ob.w * 0.65, ob.y + 3);
              g.lineTo(ob.x + ob.w * 0.5, ob.y + ob.h * 0.55);
              g.lineTo(ob.x + 2, ob.y + ob.h * 0.5);
              g.closePath();
              g.fill();
            }
            cv.text(ob.label, ob.x + ob.w / 2, ob.y + 6.5, {
              size: 3.7,
              weight: 700,
              color: "#fef08a",
              align: "center",
            });
            g.restore();
          }
        }

        // Smugi wiatru kanionowego + wskaźnik rękawa wiatrowego na etapach wietrznych
        if (st.wind) {
          g.strokeStyle = "rgba(226, 232, 240, 0.28)";
          g.lineWidth = 0.8;
          for (let wIdx = 0; wIdx < 6; wIdx++) {
            const wx = ((now * (0.045 + st.wind * 0.09) + wIdx * 54) % (W + 40)) - 20;
            const wy = 44 + wIdx * 20 + Math.sin(now * 0.004 + wIdx) * 2;
            g.beginPath();
            g.moveTo(wx, wy);
            g.lineTo(wx + 20 + st.wind * 18, wy);
            g.stroke();
          }

          // Rękaw wiatrowy na lewym klifie
          const wsX = leftA.x - 20;
          const wsY = leftA.y - 2;
          g.strokeStyle = "#cbd5e1";
          g.lineWidth = 1.1;
          g.beginPath();
          g.moveTo(wsX, wsY);
          g.lineTo(wsX, wsY - 14);
          g.stroke();
          const flutter = Math.sin(now * 0.018) * 1.4;
          g.fillStyle = "#f97316";
          g.beginPath();
          g.moveTo(wsX, wsY - 14);
          g.lineTo(wsX + 9, wsY - 12.5 + flutter);
          g.lineTo(wsX + 9, wsY - 10 + flutter);
          g.lineTo(wsX, wsY - 10.5);
          g.closePath();
          g.fill();
        }

        // Efekty pogodowe: śnieżyca, ulewa lub żar wulkaniczny
        if (st.weather === "snow") {
          g.fillStyle = "rgba(248, 250, 252, 0.75)";
          for (let i = 0; i < 24; i++) {
            const sx = ((i * 37 + now * (0.025 + (st.wind || 0.1) * 0.06)) % W);
            const sy = ((i * 29 + now * 0.022) % (H - 22)) + 20;
            g.beginPath();
            g.arc(sx, sy, (i % 2) * 0.5 + 0.9, 0, Math.PI * 2);
            g.fill();
          }
        } else if (st.weather === "rain") {
          g.strokeStyle = "rgba(186, 230, 253, 0.42)";
          g.lineWidth = 0.75;
          for (let i = 0; i < 26; i++) {
            const rx = ((i * 41 + now * (0.05 + (st.wind || 0.15) * 0.08)) % W);
            const ry = ((i * 31 + now * 0.09) % (H - 24)) + 20;
            g.beginPath();
            g.moveTo(rx, ry);
            g.lineTo(rx + 2.5, ry + 6.5);
            g.stroke();
          }
        } else if (st.weather === "embers") {
          for (let i = 0; i < 20; i++) {
            const ex = ((i * 43 + now * 0.02 + Math.sin(now * 0.003 + i) * 8) % W);
            const ey = H - 18 - ((i * 23 + now * 0.028) % (H - 42));
            g.fillStyle = i % 2 === 0 ? "rgba(251, 146, 60, 0.8)" : "rgba(253, 224, 71, 0.75)";
            g.beginPath();
            g.arc(ex, ey, 1.1, 0, Math.PI * 2);
            g.fill();
          }
        }

        const waterGrad = g.createLinearGradient(0, H - 22, 0, H);
        waterGrad.addColorStop(0, envTheme.waterTop);
        waterGrad.addColorStop(1, envTheme.waterBot);
        g.fillStyle = waterGrad;
        g.fillRect(leftA.x - 14, H - 20, rightA.x - leftA.x + 28, 20);

        const bx = st.ship ? st.ship.x + st.ship.w / 2 + Math.sin(now * 0.0015) * 10 : s.boatX;
        const by = H - 20 + Math.sin(now * 0.004) * 0.7;
        g.save();
        g.translate(bx, by);
        if (s.boatDir < 0) g.scale(-1, 1);
        g.fillStyle = "#78350f";
        g.beginPath();
        g.moveTo(-11.5, 0);
        g.lineTo(11.5, 0);
        g.lineTo(8.5, 3.6);
        g.lineTo(-9.5, 3.6);
        g.closePath();
        g.fill();
        g.fillStyle = "#f8fafc";
        g.fillRect(-5, -4.6, 7.2, 4.6);
        g.fillStyle = "#38bdf8";
        g.fillRect(-3.5, -3.6, 4.2, 2.0);
        if (st.ship) {
          g.strokeStyle = "#fde047";
          g.lineWidth = 1.0;
          g.beginPath();
          g.moveTo(0, -4.6);
          g.lineTo(0, -16);
          g.stroke();
        }
        g.restore();

        g.strokeStyle = "rgba(255, 255, 255, 0.38)";
        g.lineWidth = 0.85;
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

        drawSculptedCliff("left", leftA.x, leftA.y, envTheme, now);
        drawSculptedCliff("right", rightA.x, rightA.y, envTheme, now);

        const flagX = rightA.x + 18;
        const flagY = rightA.y - 2;
        g.strokeStyle = "#e2e8f0";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(flagX, flagY);
        g.lineTo(flagX, flagY - 19);
        g.stroke();

        const wave = Math.sin(now * 0.008) * 1.6;
        g.fillStyle = "#10b981";
        g.beginPath();
        g.moveTo(flagX, flagY - 19);
        g.lineTo(flagX + 10.5, flagY - 15.5 + wave);
        g.lineTo(flagX, flagY - 11.5);
        g.closePath();
        g.fill();

        for (let aIdx = 2; aIdx < st.anchors.length; aIdx++) {
          const anc = st.anchors[aIdx];
          if (anc.pylon) {
            const baseY = anc.x > leftA.x + 15 && anc.x < rightA.x - 15 ? H : leftA.y;
            const pGrad = g.createLinearGradient(anc.x - 4, 0, anc.x + 4, 0);
            pGrad.addColorStop(0, "#334155");
            pGrad.addColorStop(0.5, "#94a3b8");
            pGrad.addColorStop(1, "#1e293b");
            g.fillStyle = pGrad;
            g.fillRect(anc.x - 3.8, anc.y, 7.6, baseY - anc.y);
            g.fillStyle = "#c4b5fd";
            g.fillRect(anc.x - 5, anc.y - 2.5, 10, 3);
          } else if (anc.x > leftA.x + 10 && anc.x < rightA.x - 10) {
            const pierGrad = g.createLinearGradient(anc.x - 10, 0, anc.x + 10, 0);
            pierGrad.addColorStop(0, "#64748b");
            pierGrad.addColorStop(0.45, "#94a3b8");
            pierGrad.addColorStop(1, "#334155");
            g.fillStyle = pierGrad;
            g.beginPath();
            g.moveTo(anc.x - 7.5, anc.y);
            g.lineTo(anc.x + 7.5, anc.y);
            g.lineTo(anc.x + 11.5, H);
            g.lineTo(anc.x - 11.5, H);
            g.closePath();
            g.fill();
            g.fillStyle = "rgba(255, 255, 255, 0.55)";
            g.fillRect(anc.x - 12.5, H - 20, 25, 2.2);
          }
        }

        // Szkic pomocniczy kratownicy (Blueprint Ghost)
        if (s.showBlueprint && s.blueprint && !s.simulating) {
          const pulse = 0.28 + 0.12 * Math.sin(now * 0.005);
          g.strokeStyle = `rgba(56, 189, 248, ${pulse})`;
          g.lineWidth = 1.6;
          g.setLineDash([3, 2.5]);
          for (const be of s.blueprint.edges) {
            if (be.type === "road") continue;
            const bn1 = s.blueprint.nodes[be.i1];
            const bn2 = s.blueprint.nodes[be.i2];
            if (!bn1 || !bn2) continue;
            g.beginPath();
            g.moveTo(bn1.x, bn1.y);
            g.lineTo(bn2.x, bn2.y);
            g.stroke();
          }
          g.setLineDash([]);
          for (const bn of s.blueprint.nodes) {
            if (bn.fixed || bn.deck) continue;
            g.fillStyle = `rgba(56, 189, 248, ${pulse + 0.12})`;
            g.beginPath();
            g.arc(bn.x, bn.y, 2.5, 0, Math.PI * 2);
            g.fill();
          }
        }

        // --- RYSOWANIE ELEMENTÓW KONSTRUKCYJNYCH MOSTU + PROGNOZA PĘKNIĘĆ ---
        const drawNodes = s.simulating && s.simNodes.length === s.nodes.length ? s.simNodes : s.nodes;
        const forecasts = s.analysis?.edgeForecasts || [];

        s.edges.forEach((e, idx) => {
          if (e.broken) return;
          const n1 = drawNodes[e.i1];
          const n2 = drawNodes[e.i2];
          if (!n1 || !n2) return;
          let x1 = n1.curX ?? n1.x, y1 = n1.curY ?? n1.y;
          let x2 = n2.curX ?? n2.x, y2 = n2.curY ?? n2.y;

          if (e.bornAt && !s.simulating) {
            const age = Math.min(1, (now - e.bornAt) / 180);
            if (age < 1) {
              x2 = x1 + (x2 - x1) * age;
              y2 = y1 + (y2 - y1) * age;
            }
          }

          const fc = forecasts[idx];
          const predStress = fc ? fc.stress : 0;
          const activeStress = s.simulating ? e.stress : 0;

          if (s.simulating && activeStress > 0.72) {
            const jitter = (activeStress - 0.7) * 1.6;
            x1 += Math.sin(now * 0.08 + idx) * jitter;
            y1 += Math.cos(now * 0.09 + idx) * jitter;
          }

          let col = "#10b981";
          if (s.simulating) {
            if (activeStress > 0.75) col = "#ef4444";
            else if (activeStress > 0.42) col = "#f59e0b";
            else col = "#10b981";
          } else {
            col =
              e.type === "road" ? "#94a3b8" :
              e.type === "wood" ? "#d97706" :
              e.type === "cable" ? "#c4b5fd" :
              e.type === "arch" ? "#f59e0b" :
              e.type === "spring" ? "#f472b6" : "#38bdf8";
          }

          if (!s.simulating && idx === s.hoverEdge) {
            col = s.tool === "erase" ? "#ef4444" : "#f8fafc";
          }

          const dx = x2 - x1, dy = y2 - y1;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;

          const hasTrussBeams = s.edges.some((ed) => ed.type !== "road");
          // W konstruktorze: pulsująca czerwona poświata ostrzegawcza na belkach zagrożonych pęknięciem (prognoza >= 100%)
          if (!s.simulating && s.showAnalysis && predStress >= 1.0 && (hasTrussBeams || idx === s.hoverEdge)) {
            const warnAlpha = 0.35 + 0.25 * Math.sin(now * 0.01);
            g.strokeStyle = `rgba(239, 68, 68, ${warnAlpha})`;
            g.lineWidth = 6.8;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
          }

          g.lineCap = "round";
          if (e.type === "road") {
            const sag = s.simulating ? (e.midSag || 0) : 0;
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2 + sag;

            g.strokeStyle = "#0f172a";
            g.lineWidth = 6.0;
            g.beginPath();
            g.moveTo(x1, y1 + 0.6);
            g.quadraticCurveTo(cx, cy + 0.6, x2, y2 + 0.6);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 3.4;
            g.beginPath();
            g.moveTo(x1, y1);
            g.quadraticCurveTo(cx, cy, x2, y2);
            g.stroke();

            g.strokeStyle = "rgba(226, 232, 240, 0.5)";
            g.lineWidth = 0.65;
            g.beginPath();
            g.moveTo(x1, y1 - 2.6);
            g.quadraticCurveTo(cx, cy - 2.6, x2, y2 - 2.6);
            g.stroke();

            g.strokeStyle = "rgba(255, 255, 255, 0.6)";
            g.lineWidth = 0.7;
            g.setLineDash([3, 3]);
            g.beginPath();
            g.moveTo(x1, y1 - 0.4);
            g.quadraticCurveTo(cx, cy - 0.4, x2, y2 - 0.4);
            g.stroke();
            g.setLineDash([]);
          } else if (e.type === "steel") {
            g.strokeStyle = "#0f172a";
            g.lineWidth = 4.2;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 2.9;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = "rgba(255, 255, 255, 0.32)";
            g.lineWidth = 0.7;
            g.beginPath();
            g.moveTo(x1 + nx * 0.9, y1 + ny * 0.9);
            g.lineTo(x2 + nx * 0.9, y2 + ny * 0.9);
            g.stroke();

            g.strokeStyle = "rgba(15, 23, 42, 0.62)";
            g.lineWidth = 1.0;
            g.setLineDash([2, 3]);
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
            g.setLineDash([]);
          } else if (e.type === "arch") {
            // Żelbetowy łuk podporowy (lekko wygięty ku górze profil betonowy ze zbrojeniem)
            const archLift = -3.2;
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2 + archLift;

            g.strokeStyle = "#1e293b";
            g.lineWidth = 4.8;
            g.beginPath();
            g.moveTo(x1, y1);
            g.quadraticCurveTo(cx, cy, x2, y2);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 3.2;
            g.beginPath();
            g.moveTo(x1, y1);
            g.quadraticCurveTo(cx, cy, x2, y2);
            g.stroke();

            g.strokeStyle = "rgba(254, 243, 199, 0.55)";
            g.lineWidth = 0.9;
            g.setLineDash([2.5, 2.5]);
            g.beginPath();
            g.moveTo(x1, y1);
            g.quadraticCurveTo(cx, cy, x2, y2);
            g.stroke();
            g.setLineDash([]);
          } else if (e.type === "spring") {
            // Tłumik drgań / amortyzator hydrauliczny ze sprężyną
            g.strokeStyle = "#0f172a";
            g.lineWidth = 3.8;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 2.2;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            // Środkowy cylinder tłumika ze zwojami
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            g.strokeStyle = "#fdf2f8";
            g.lineWidth = 3.2;
            g.setLineDash([1.6, 1.8]);
            g.beginPath();
            g.moveTo(mx - (dx / len) * 7, my - (dy / len) * 7);
            g.lineTo(mx + (dx / len) * 7, my + (dy / len) * 7);
            g.stroke();
            g.setLineDash([]);
          } else if (e.type === "cable") {
            g.strokeStyle = col;
            g.lineWidth = 1.6;
            g.beginPath();
            if (s.simulating && e.mode === "compression") {
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 4.5;
              g.moveTo(x1, y1);
              g.quadraticCurveTo(mx, my, x2, y2);
            } else {
              g.moveTo(x1, y1);
              g.lineTo(x2, y2);
            }
            g.stroke();

            g.strokeStyle = "#f8fafc";
            g.lineWidth = 2.3;
            g.beginPath();
            g.moveTo(x1 + (dx / len) * 3, y1 + (dy / len) * 3);
            g.lineTo(x1 + (dx / len) * 6.5, y1 + (dy / len) * 6.5);
            g.moveTo(x2 - (dx / len) * 3, y2 - (dy / len) * 3);
            g.lineTo(x2 - (dx / len) * 6.5, y2 - (dy / len) * 6.5);
            g.stroke();
          } else {
            g.strokeStyle = "#451a03";
            g.lineWidth = 3.6;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = col;
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();

            g.strokeStyle = "rgba(254, 243, 199, 0.35)";
            g.lineWidth = 0.65;
            g.beginPath();
            g.moveTo(x1 + nx * 0.7, y1 + ny * 0.7);
            g.lineTo(x2 + nx * 0.7, y2 + ny * 0.7);
            g.stroke();
          }

          // Etykieta % naprężenia podczas symulacji (dla mocno obciążonych belek >= 55%)
          if (s.simulating && activeStress >= 0.55) {
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 4.5;
            cv.text(`${Math.round(activeStress * 100)}%`, mx, my, {
              size: 3.7,
              weight: 700,
              color: activeStress >= 0.8 ? "#fca5a5" : "#fde68a",
              align: "center",
            });
          }
        });

        // Ślady pękniętych belek z ostatniej nieudanej próby (✕ Pękło)
        if (!s.simulating && s.fractureMarks.length > 0) {
          for (const fm of s.fractureMarks) {
            g.strokeStyle = "#ef4444";
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(fm.x - 3.5, fm.y - 3.5);
            g.lineTo(fm.x + 3.5, fm.y + 3.5);
            g.moveTo(fm.x + 3.5, fm.y - 3.5);
            g.lineTo(fm.x - 3.5, fm.y + 3.5);
            g.stroke();
            cv.text("Pękło!", fm.x, fm.y - 6.5, {
              size: 3.8,
              weight: 700,
              color: "#fca5a5",
              align: "center",
            });
          }
        }

        // --- ROZBUDOWANY WIZUALNY KONSTRUKTOR ELEMENTÓW (PODGLĄD BUDOWY, ZASIĘGU I PRZYCIĄGANIA) ---
        if (s.dragStartNode >= 0 && s.nodes[s.dragStartNode] && !s.simulating) {
          const sn = s.nodes[s.dragStartNode];
          const spec = MATERIAL_SPECS[s.tool] || MATERIAL_SPECS.wood;
          const plan = planBeamConstruction(s.nodes, s.dragStartNode, s.cursorX, s.cursorY, spec);

          // 1. Okrąg maksymalnego zasięgu pojedynczej belki wybranego materiału
          g.save();
          g.strokeStyle = "rgba(148, 163, 184, 0.25)";
          g.lineWidth = 0.7;
          g.setLineDash([2.5, 2.5]);
          g.beginPath();
          g.arc(sn.x, sn.y, spec.maxLen, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);
          g.restore();

          // 2. Linie pomocnicze wyrównania poziomego/pionowego (0° / 90°), gdy cel jest blisko osi
          if (Math.abs(plan.targetY - sn.y) <= 2 || Math.abs(plan.targetX - sn.x) <= 2) {
            g.strokeStyle = "rgba(52, 211, 153, 0.35)";
            g.lineWidth = 0.6;
            g.setLineDash([2, 2]);
            g.beginPath();
            g.moveTo(sn.x, sn.y);
            g.lineTo(plan.targetX, plan.targetY);
            g.stroke();
            g.setLineDash([]);
          }

          // 3. Rysowanie wszystkich segmentów planu (oraz ich lustrzanego odbicia)
          const previewCol = !plan.valid
            ? "#ef4444"
            : s.tool === "wood" || s.tool === "arch"
            ? "#fbbf24"
            : s.tool === "road"
            ? "#e2e8f0"
            : s.tool === "cable"
            ? "#c4b5fd"
            : s.tool === "spring"
            ? "#f472b6"
            : "#38bdf8";

          for (const seg of plan.segments) {
            if (s.symmetry && plan.valid) {
              g.strokeStyle = "rgba(56, 189, 248, 0.35)";
              g.lineWidth = 1.6;
              g.setLineDash([2, 2.5]);
              g.beginPath();
              g.moveTo(W - seg.x1, seg.y1);
              g.lineTo(W - seg.x2, seg.y2);
              g.stroke();
              g.setLineDash([]);
            }

            g.strokeStyle = previewCol;
            g.lineWidth = s.tool === "road" ? 3.5 : s.tool === "cable" ? 1.7 : 2.5;
            g.setLineDash([3.5, 2.5]);
            g.beginPath();
            g.moveTo(seg.x1, seg.y1);
            g.lineTo(seg.x2, seg.y2);
            g.stroke();
            g.setLineDash([]);

            // Pośrednie i końcowe węzły podglądu
            g.fillStyle = plan.snapKind === "node" ? "#10b981" : "#38bdf8";
            g.strokeStyle = "#0f172a";
            g.lineWidth = 1.0;
            g.beginPath();
            g.arc(seg.x2, seg.y2, 3.2, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }

          // 4. Celownik magnetyczny w punkcie docelowym (wyraźnie rozróżnia złapanie węzła od nowego punktu siatki)
          if (plan.snapKind === "node" && plan.snapNodeIdx >= 0) {
            drawMagneticReticle(plan.targetX, plan.targetY, 6.2, "#10b981", now);
          } else {
            drawMagneticReticle(plan.targetX, plan.targetY, 4.8, "#38bdf8", now);
          }

          // 5. Etykieta techniczna nad budowanym elementem
          if (!plan.tooShort) {
            const midX = Math.max(48, Math.min(W - 48, (sn.x + plan.targetX) / 2));
            const midY = Math.max(28, (sn.y + plan.targetY) / 2 - 10);
            const segLabel = plan.segCount > 1 ? `${plan.segCount}× · ` : "";
            const snapLabel = plan.snapKind === "node" ? "Złapano węzeł" : "Nowy węzeł";
            const infoText = `${segLabel}${Math.round(plan.totalDist)} m · ${plan.totalCost} zł (${snapLabel})`;

            g.save();
            g.fillStyle = "rgba(15, 23, 42, 0.86)";
            g.beginPath();
            g.roundRect(midX - 58, midY - 6.5, 116, 12, 3);
            g.fill();
            g.strokeStyle = plan.snapKind === "node" ? "#10b981" : "#38bdf8";
            g.lineWidth = 0.8;
            g.stroke();
            cv.text(infoText, midX, midY, {
              size: 3.9,
              weight: 700,
              color: !plan.valid ? "bad" : "#f8fafc",
              align: "center",
            });
            g.restore();
          }
        }

        // --- WĘZŁY KRATOWNICY, CELOWNIK MAGNETYCZNY I OSTRZEŻENIA O BRAKU PODPARCIA ---
        const unbracedSet = new Set(s.analysis?.unbracedNodeIndices || []);

        drawNodes.forEach((n, idx) => {
          const nx = n.curX ?? n.x;
          const ny = n.curY ?? n.y;
          const isHovered = !s.simulating && (idx === s.hoverNode || idx === s.dragStartNode || idx === s.movingNode);
          const isUnbraced = !s.simulating && unbracedSet.has(idx);

          if (isHovered) {
            drawMagneticReticle(nx, ny, 6.2, s.tool === "erase" ? "#ef4444" : "#10b981", now);
          } else if (isUnbraced) {
            // Pulsująca bursztynowa obwódka wokół węzła jezdni, któremu brakuje trójkąta kratownicy
            const p = 0.45 + 0.35 * Math.sin(now * 0.008);
            g.strokeStyle = `rgba(251, 191, 36, ${p})`;
            g.lineWidth = 1.3;
            g.beginPath();
            g.arc(nx, ny, 5.6, 0, Math.PI * 2);
            g.stroke();
          }

          g.fillStyle = n.fixed ? (n.pylon ? "#a78bfa" : "#f59e0b") : n.deck ? "#38bdf8" : "#e2e8f0";
          g.strokeStyle = "#0f172a";
          g.lineWidth = 1.2;
          g.beginPath();
          if (n.fixed) {
            g.roundRect(nx - 4.4, ny - 4.4, 8.8, 8.8, 1.5);
          } else {
            g.arc(nx, ny, 3.6, 0, Math.PI * 2);
          }
          g.fill();
          g.stroke();

          g.fillStyle = "#0f172a";
          g.beginPath();
          g.arc(nx, ny, 1.1, 0, Math.PI * 2);
          g.fill();

          // Mały znacznik "!" nad niepodpartym węzłem jezdni
          if (isUnbraced && s.dragStartNode < 0) {
            cv.text("!", nx, ny - 7.5, {
              size: 4.5,
              weight: 700,
              color: "#fbbf24",
              align: "center",
            });
          }
        });

        // Rysowanie pojazdu (oraz drugiego pojazdu w konwoju na etapach z convoyCount === 2)
        const vehX = s.simulating ? s.vehicleX : leftA.x - 18;
        const vehY = s.simulating ? s.vehicleY : leftA.y;
        const vehAng = s.simulating ? s.vehicleAngle : 0;
        drawVehicle(st, vehX, vehY, vehAng, now);

        if (st.convoyCount === 2) {
          const v2X = vehX - 34;
          if (s.simulating && !s.falling) {
            const roadPath2 = findRoadPath(s.simNodes, s.edges);
            const sample2 = sampleVehicleOnRoad(s.simNodes, roadPath2.nodePath, v2X);
            drawVehicle({ ...st, vehicleType: "van", vehicleWeight: st.vehicleWeight * 0.6 }, v2X, sample2.y, sample2.angle, now);
          } else if (!s.simulating) {
            drawVehicle({ ...st, vehicleType: "van", vehicleWeight: st.vehicleWeight * 0.6 }, leftA.x - 46, leftA.y, 0, now);
          }
        }

        // Odłamki pękniętych belek (debris)
        for (let i = s.debris.length - 1; i >= 0; i--) {
          const db = s.debris[i];
          db.vy += 150 * dt;
          db.x += db.vx * dt;
          db.y += db.vy * dt;
          db.ang += db.vang * dt;
          db.life -= dt;
          if (db.life <= 0 || db.y > H + 10) {
            s.debris.splice(i, 1);
            continue;
          }
          g.save();
          g.translate(db.x, db.y);
          g.rotate(db.ang);
          g.strokeStyle = db.type === "wood" ? "#d97706" : db.type === "road" ? "#94a3b8" : "#38bdf8";
          g.lineWidth = 2.6;
          g.beginPath();
          g.moveTo(-db.len / 2, 0);
          g.lineTo(db.len / 2, 0);
          g.stroke();
          g.restore();
        }

        // Fale uderzeniowe i kręgi na wodzie
        for (let i = s.ripples.length - 1; i >= 0; i--) {
          const rp = s.ripples[i];
          rp.life -= dt;
          if (rp.life <= 0) {
            s.ripples.splice(i, 1);
            continue;
          }
          const p = 1 - rp.life / rp.maxLife;
          const curR = rp.r + (rp.maxR - rp.r) * p;
          g.save();
          g.globalAlpha = Math.max(0, 1 - p);
          g.strokeStyle = rp.c;
          g.lineWidth = 1.4;
          g.beginPath();
          if (rp.flat) {
            g.ellipse(rp.x, rp.y, curR, curR * 0.28, 0, 0, Math.PI * 2);
          } else {
            g.arc(rp.x, rp.y, curR, 0, Math.PI * 2);
          }
          g.stroke();
          g.restore();
        }

        // Dym z wydechu pojazdu
        for (let i = s.smoke.length - 1; i >= 0; i--) {
          const sm = s.smoke[i];
          sm.x += sm.vx * dt;
          sm.y += sm.vy * dt;
          sm.r += dt * 3.5;
          sm.life -= dt;
          if (sm.life <= 0) {
            s.smoke.splice(i, 1);
            continue;
          }
          g.fillStyle = `rgba(226, 232, 240, ${sm.life * 0.45})`;
          g.beginPath();
          g.arc(sm.x, sm.y, sm.r, 0, Math.PI * 2);
          g.fill();
        }

        // Iskry konstrukcyjne i krople wody
        for (let i = s.sparks.length - 1; i >= 0; i--) {
          const sp = s.sparks[i];
          sp.vy += (sp.gravity || 65) * dt;
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.life -= dt;
          if (sp.life <= 0) {
            s.sparks.splice(i, 1);
            continue;
          }
          g.fillStyle = sp.c;
          g.beginPath();
          g.arc(sp.x, sp.y, sp.r * (sp.life / sp.maxLife), 0, Math.PI * 2);
          g.fill();
        }

        // Cząsteczki pyłu z naprężonych belek
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

        // Górny pasek informacyjny na płótnie
        g.fillStyle = "rgba(15, 23, 42, 0.82)";
        g.fillRect(0, 0, W, 20);
        const curCost = calcBridgeCost(s.edges);
        cv.text(`${st.name} · ${st.vehicleName} (${st.vehicleWeight.toFixed(1)} t)`, 8, 10, {
          size: 4.8,
          weight: 700,
          color: "#f8fafc",
          align: "left",
        });
        cv.text(`[${s.simSpeed}×]`, W - 98, 10, {
          size: 4.5,
          weight: 700,
          color: "#38bdf8",
          align: "center",
        });
        cv.text(`Koszt: ${curCost} / ${st.budget} zł`, W - 8, 10, {
          size: 4.8,
          weight: 700,
          color: curCost > st.budget ? "bad" : "#a7f3d0",
          align: "right",
        });

        // Podpowiedź diagnostyczna nad najechanym węzłem lub belką w konstruktorze
        if (!s.simulating && s.dragStartNode < 0) {
          if (s.hoverNode >= 0 && s.nodes[s.hoverNode]) {
            const hn = s.nodes[s.hoverNode];
            const hmx = Math.max(55, Math.min(W - 55, hn.x));
            const hmy = Math.max(28, hn.y - 11);
            const nodeStatus = hn.fixed
              ? "Kotwica stała (kliknij, by wyprowadzić belkę)"
              : unbracedSet.has(s.hoverNode)
              ? "Węzeł niestabilny — podeprzyj trójkątem!"
              : "Węzeł stabilny (kliknij i ciągnij belkę)";
            g.save();
            g.fillStyle = "rgba(15, 23, 42, 0.85)";
            g.beginPath();
            g.roundRect(hmx - 62, hmy - 6, 124, 11.5, 3);
            g.fill();
            cv.text(nodeStatus, hmx, hmy, {
              size: 3.7,
              weight: 700,
              color: unbracedSet.has(s.hoverNode) ? "#fde047" : "#a7f3d0",
              align: "center",
            });
            g.restore();
          } else if (s.hoverEdge >= 0 && s.edges[s.hoverEdge]) {
            const he = s.edges[s.hoverEdge];
            const hn1 = s.nodes[he.i1], hn2 = s.nodes[he.i2];
            if (hn1 && hn2) {
              const hmx = Math.max(60, Math.min(W - 60, (hn1.x + hn2.x) / 2));
              const hmy = Math.max(28, (hn1.y + hn2.y) / 2 - 10);
              const hSpec = MATERIAL_SPECS[he.type] || MATERIAL_SPECS.wood;
              const hCost = Math.round((MATERIAL_COSTS[he.type] || 15) * ((he.len || 22) / 22));
              const fc = forecasts[s.hoverEdge];
              const stressPct = fc ? Math.round(fc.stress * 100) : 0;
              const modeTxt = fc?.mode === "compression" ? "Ściskanie" : "Rozciąganie";
              const statusTxt = stressPct >= 100 ? `PĘKNIE (${stressPct}%)` : `${modeTxt}: ${stressPct}%`;

              g.save();
              g.fillStyle = "rgba(15, 23, 42, 0.86)";
              g.beginPath();
              g.roundRect(hmx - 64, hmy - 6, 128, 11.5, 3);
              g.fill();
              cv.text(`${hSpec.name} ${Math.round(he.len || 0)} m (${hCost} zł) · ${statusTxt}`, hmx, hmy, {
                size: 3.7,
                weight: 700,
                color: s.tool === "erase" || stressPct >= 100 ? "bad" : stressPct > 75 ? "#fde047" : "#f8fafc",
                align: "center",
              });
              g.restore();
            }
          }
        }

        // Animowana wizytówka nowego etapu
        if (s.bannerTime > 0 && !s.simulating) {
          const alpha = Math.min(1, s.bannerTime * 2);
          g.save();
          g.globalAlpha = alpha * 0.92;
          g.fillStyle = "#0f172a";
          g.beginPath();
          g.roundRect(W / 2 - 70, 42, 140, 22, 4);
          g.fill();
          g.strokeStyle = "#10b981";
          g.lineWidth = 0.9;
          g.stroke();
          cv.text(s.bannerText, W / 2, 53, {
            size: 5.1,
            weight: 700,
            color: "#f8fafc",
            align: "center",
          });
          g.restore();
        }

        g.restore();
      });
    },
  });
}
