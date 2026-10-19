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
        budget: 650,
        anchors: [
          { x: 40, y: 110, fixed: true, deck: true },
          { x: 160, y: 110, fixed: true, deck: true },
          { x: 40, y: 155, fixed: true, deck: false },
          { x: 160, y: 155, fixed: true, deck: false },
        ],
        vehicleWeight: 1.0,
        vehicleName: "Auto osobowe",
      },
      {
        name: "Głęboki wąwóz",
        gap: 140,
        budget: 800,
        anchors: [
          { x: 35, y: 105, fixed: true, deck: true },
          { x: 175, y: 105, fixed: true, deck: true },
          { x: 35, y: 160, fixed: true, deck: false },
          { x: 175, y: 160, fixed: true, deck: false },
        ],
        vehicleWeight: 1.3,
        vehicleName: "Furgonetka",
      },
      {
        name: "Przełom rzeki",
        gap: 150,
        budget: 900,
        anchors: [
          { x: 30, y: 105, fixed: true, deck: true },
          { x: 180, y: 105, fixed: true, deck: true },
          { x: 105, y: 170, fixed: true, deck: false }, // podpora w wodzie
        ],
        vehicleWeight: 1.5,
        vehicleName: "Autobus",
      },
    ],
    medium: [
      {
        name: "Kanion skalny",
        gap: 160,
        budget: 980,
        anchors: [
          { x: 30, y: 105, fixed: true, deck: true },
          { x: 190, y: 105, fixed: true, deck: true },
          { x: 30, y: 160, fixed: true, deck: false },
          { x: 190, y: 160, fixed: true, deck: false },
        ],
        vehicleWeight: 2.0,
        vehicleName: "Ciężarówka",
      },
      {
        name: "Przepaść górska",
        gap: 170,
        budget: 1100,
        anchors: [
          { x: 25, y: 100, fixed: true, deck: true },
          { x: 195, y: 100, fixed: true, deck: true },
          { x: 25, y: 155, fixed: true, deck: false },
          { x: 195, y: 155, fixed: true, deck: false },
        ],
        vehicleWeight: 2.4,
        vehicleName: "Wywrotka z kruszywem",
      },
      {
        name: "Estakada nad wodospadem",
        gap: 180,
        budget: 1250,
        anchors: [
          { x: 20, y: 100, fixed: true, deck: true },
          { x: 200, y: 100, fixed: true, deck: true },
          { x: 110, y: 165, fixed: true, deck: false },
        ],
        vehicleWeight: 2.6,
        vehicleName: "Ciężki dźwig",
      },
    ],
    hard: [
      {
        name: "Wielka rozpadlina",
        gap: 190,
        budget: 1350,
        anchors: [
          { x: 20, y: 95, fixed: true, deck: true },
          { x: 210, y: 95, fixed: true, deck: true },
          { x: 20, y: 160, fixed: true, deck: false },
          { x: 210, y: 160, fixed: true, deck: false },
        ],
        vehicleWeight: 3.0,
        vehicleName: "Konwój budowlany",
      },
      {
        name: "Czeluść bazaltowa",
        gap: 200,
        budget: 1450,
        anchors: [
          { x: 15, y: 95, fixed: true, deck: true },
          { x: 215, y: 95, fixed: true, deck: true },
          { x: 15, y: 155, fixed: true, deck: false },
          { x: 215, y: 155, fixed: true, deck: false },
        ],
        vehicleWeight: 3.4,
        vehicleName: "Ciężki pociąg drogowy",
      },
      {
        name: "Most nad otchłanią",
        gap: 210,
        budget: 1550,
        anchors: [
          { x: 15, y: 95, fixed: true, deck: true },
          { x: 225, y: 95, fixed: true, deck: true },
          { x: 120, y: 175, fixed: true, deck: false },
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
      cost += Math.round(base * (e.len / 22));
    }
    return cost;
  }

  // Uproszczony relaksacyjny solwer fizyki kratownicy i ugięcia węzłów pod obciążeniem
  function solveTrussStress(nodes, edges, vehicleX, vehicleWeight) {
    let maxStress = 0;
    let deckBroken = false;

    // Klonujemy pozycje węzłów do symulacji ugięcia
    const simNodes = nodes.map((n) => ({ ...n, curX: n.x, curY: n.y }));

    // Obciążenie grawitacyjne z pojazdu na węzły jezdni
    for (const n of simNodes) {
      if (!n.fixed) {
        n.curY += 0.8; // masa własna belek
        if (n.deck && Math.abs(n.x - vehicleX) < 28) {
          const loadDist = Math.max(0, 1 - Math.abs(n.x - vehicleX) / 28);
          n.curY += loadDist * vehicleWeight * 4.2;
        }
      }
    }

    // Kilka iteracji relaksacji sprężystości belek
    for (let iter = 0; iter < 12; iter++) {
      for (const e of edges) {
        const n1 = simNodes[e.i1];
        const n2 = simNodes[e.i2];
        const dx = n2.curX - n1.curX;
        const dy = n2.curY - n1.curY;
        const curLen = Math.hypot(dx, dy);
        const diff = (curLen - e.len) / (curLen || 1);

        if (!n1.fixed) {
          n1.curX += dx * diff * 0.45;
          n1.curY += dy * diff * 0.45;
        }
        if (!n2.fixed) {
          n2.curX -= dx * diff * 0.45;
          n2.curY -= dy * diff * 0.45;
        }
      }
    }

    // Obliczenie naprężenia każdego elementu
    for (const e of edges) {
      const n1 = simNodes[e.i1];
      const n2 = simNodes[e.i2];
      const curLen = Math.hypot(n2.curX - n1.curX, n2.curY - n1.curY);
      const strain = Math.abs(curLen - e.len) / e.len;
      // Progi pęknięcia
      const maxStrain = e.type === "steel" ? 0.28 : e.type === "road" ? 0.22 : 0.18;
      const stress = Math.min(1.5, strain / maxStrain);
      e.stress = stress;
      maxStress = Math.max(maxStress, stress);
      if (stress >= 1.0) {
        e.broken = true;
        if (e.type === "road") deckBroken = true;
      }
    }

    return { maxStress, deckBroken, simNodes };
  }

  if (typeof module !== "undefined") {
    module.exports = { MATERIAL_COSTS, STAGES, calcBridgeCost, solveTrussStress };
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
      "Kliknij i przeciągnij między węzłami, aby stawiać jezdnię (szary pas), drewniane belki kratownicy (brąz) lub stalowe dźwigary.",
      "Przełączaj materiał w panelu: jezdnia tworzy ciągłą drogę dla pojazdów, a kratownice rozpraszają naprężenia na filary i skały.",
      "Sprawdź konstrukcję przyciskiem „Przejazd próbny” (Spacja): kolor belek sygnalizuje naprężenie (zielony < żółty < czerwony).",
      "Zmieść się w budżecie i bezpiecznie przeprowadź pojazd na drugi brzeg przepaści bez pęknięcia mostu.",
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
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const stageList = STAGES[key] || STAGES.easy;
      const s = {
        stageIdx: 0,
        nodes: [],
        edges: [],
        tool: "road", // "road", "wood", "steel"
        simulating: false,
        vehicleX: 0,
        vehicleV: 35,
        maxStressEver: 0,
        cheapWinEver: false,
        dragStartNode: -1,
        cursorX: 0,
        cursorY: 0,
        dust: [],
      };

      function initStage(idx) {
        const st = stageList[idx % stageList.length];
        s.nodes = st.anchors.map((a) => ({ ...a }));
        s.edges = [];
        s.simulating = false;
        s.vehicleX = st.anchors[0].x - 20;
        s.maxStressEver = 0;
        s.dragStartNode = -1;

        // Domyślna prosta jezdnia między pierwszym a drugim brzegiem (przęsła pośrednie)
        const left = st.anchors[0];
        const right = st.anchors[1];
        const segs = Math.max(3, Math.round((right.x - left.x) / 35));
        const deckIndices = [0];

        for (let i = 1; i < segs; i++) {
          const t = i / segs;
          const nx = left.x + (right.x - left.x) * t;
          const ny = left.y;
          s.nodes.push({ x: nx, y: ny, fixed: false, deck: true });
          deckIndices.push(s.nodes.length - 1);
        }
        deckIndices.push(1);

        for (let i = 0; i < deckIndices.length - 1; i++) {
          const i1 = deckIndices[i], i2 = deckIndices[i + 1];
          const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
          s.edges.push({ i1, i2, type: "road", len, stress: 0 });
        }
      }

      initStage(0);

      const budgetEl = statBlock(ctx, "Budżet budowy", { meter: true });
      const stressEl = statBlock(ctx, "Naprężenie konstrukcji", { meter: true });
      const stageEl = statBlock(ctx, "Przeszkoda terenowa", { small: true });

      const matSeg = segmented("Materiał", ["Jezdnia", "Drewno", "Stal"], (k) => {
        s.tool = ["road", "wood", "steel"][k];
        matSeg.set(k);
      });
      matSeg.set(0);

      const testBtn = button("Przejazd próbny (Spacja)", "btn wide", () => toggleTest());
      const clearBtn = button("Wyczyść belki", "btn-ghost wide", () => {
        initStage(s.stageIdx);
        Sound.erase();
        updatePanel();
      });
      ctx.panel.append(panelBlock("Plac budowy", matSeg.el, testBtn, clearBtn));

      function updatePanel() {
        const st = stageList[s.stageIdx % stageList.length];
        const cost = calcBridgeCost(s.edges);
        budgetEl.set(
          `${cost} / ${st.budget} zł`,
          cost / st.budget,
          cost > st.budget ? "Przekroczono budżet! Zmień konstrukcję" : `Pozostało: ${st.budget - cost} zł`
        );
        stressEl.set(
          `${Math.round(s.maxStressEver * 100)}%`,
          s.maxStressEver,
          s.maxStressEver >= 1.0 ? "Katastrofa! Belka pękła" : s.maxStressEver > 0.75 ? "Wysokie naprężenie" : "Stabilna kratownica"
        );
        stageEl.set(
          `${s.stageIdx + 1} / ${stagesCount}: ${st.name}`,
          null,
          `Pojazd: ${st.vehicleName}`
        );
        ctx.progress(s.stageIdx / stagesCount);
      }

      function toggleTest() {
        if (ctx.done) return;
        const st = stageList[s.stageIdx % stageList.length];
        const cost = calcBridgeCost(s.edges);
        if (cost > st.budget) {
          Sound.error();
          ctx.toast("Most przekracza dostępny budżet inwestycji!");
          return;
        }
        s.simulating = !s.simulating;
        s.vehicleX = st.anchors[0].x - 20;
        s.maxStressEver = 0;
        s.edges.forEach((e) => (e.broken = false));
        Sound.line();
        ctx.toast(s.simulating ? "Rozpoczęto przejazd pojazdu!" : "Zatrzymano symulację.");
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
        } else if (e.key === "3") {
          s.tool = "steel";
          matSeg.set(2);
        }
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;
      });

      // Rysowanie belek między węzłami
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.simulating) return;
        const [x, y] = cv.at(e);
        s.cursorX = x;
        s.cursorY = y;

        // Znajdź najbliższy węzeł
        let nearIdx = -1;
        s.nodes.forEach((n, i) => {
          if (Math.hypot(n.x - x, n.y - y) < 14) nearIdx = i;
        });

        if (nearIdx >= 0) {
          s.dragStartNode = nearIdx;
        } else {
          // Dodanie nowego węzła kratownicy jeśli kliknięto w przestrzeń
          if (y > 70 && y < 175) {
            s.nodes.push({ x: Math.round(x), y: Math.round(y), fixed: false, deck: false });
            s.dragStartNode = s.nodes.length - 1;
            Sound.tap();
          }
        }
      });

      ctx.on(document, "pointerup", (e) => {
        if (s.dragStartNode >= 0) {
          const [x, y] = cv.at(e);
          let targetIdx = -1;
          s.nodes.forEach((n, i) => {
            if (i !== s.dragStartNode && Math.hypot(n.x - x, n.y - y) < 16) {
              targetIdx = i;
            }
          });

          if (targetIdx >= 0) {
            // Dodanie belki między s.dragStartNode a targetIdx
            const i1 = Math.min(s.dragStartNode, targetIdx);
            const i2 = Math.max(s.dragStartNode, targetIdx);
            const exists = s.edges.some((ed) => ed.i1 === i1 && ed.i2 === i2);
            if (!exists) {
              const len = Math.hypot(s.nodes[i2].x - s.nodes[i1].x, s.nodes[i2].y - s.nodes[i1].y);
              if (len < 85) {
                s.edges.push({ i1, i2, type: s.tool, len, stress: 0 });
                Sound.place(3);
                updatePanel();
              } else {
                ctx.toast("Zbyt długa belka (maks. 85m)");
              }
            }
          }
          s.dragStartNode = -1;
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        const st = stageList[s.stageIdx % stageList.length];

        // Symulacja przejazdu
        if (s.simulating) {
          s.vehicleX += s.vehicleV * dt;

          const res = solveTrussStress(s.nodes, s.edges, s.vehicleX, st.vehicleWeight);
          s.maxStressEver = Math.max(s.maxStressEver, res.maxStress);

          // Cząsteczki kurzu z naprężonych belek
          for (const e of s.edges) {
            if (e.stress > 0.65 && Math.random() < 0.25) {
              const n1 = s.nodes[e.i1], n2 = s.nodes[e.i2];
              const t = Math.random();
              s.dust.push({
                x: n1.x + (n2.x - n1.x) * t,
                y: n1.y + (n2.y - n1.y) * t,
                vx: (Math.random() - 0.5) * 6,
                vy: 8 + Math.random() * 18,
                c: e.stress > 0.85 ? "#ef4444" : "#f59e0b",
                life: 0.5,
              });
            }
          }

          if (res.deckBroken) {
            s.simulating = false;
            Sound.error();
            ctx.toast("Jezdnia zerwała się pod ciężarem pojazdu!");
            updatePanel();
            return;
          }

          // Pojazd dotarł bezpiecznie na drugi brzeg
          if (s.vehicleX > st.anchors[1].x + 25) {
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
              ctx.win(`Mosty ukończone! Wszystkie ${stagesCount} przeprawy wytrzymały obciążenie.`);
              return;
            } else {
              s.stageIdx++;
              initStage(s.stageIdx);
              Sound.line();
              ctx.toast(`Etap ${s.stageIdx} zaliczony! Nowa przeszkoda terenowa.`);
              updatePanel();
            }
          }
        }

        // --- RYSOWANIE KRAJOBRAZU I MOSTU ---
        // Tło kanionu
        g.fillStyle = "#0c1322";
        g.fillRect(0, 0, W, H);

        // Klify skalne po lewej i prawej stronie
        const leftA = st.anchors[0];
        const rightA = st.anchors[1];

        g.fillStyle = "#334155";
        g.beginPath();
        g.moveTo(0, leftA.y);
        g.lineTo(leftA.x, leftA.y);
        g.lineTo(leftA.x, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        g.beginPath();
        g.moveTo(rightA.x, rightA.y);
        g.lineTo(W, rightA.y);
        g.lineTo(W, H);
        g.lineTo(rightA.x, H);
        g.closePath();
        g.fill();

        // Droga dojazdowa na klifach
        g.fillStyle = "#1e293b";
        g.fillRect(0, leftA.y - 2, leftA.x, 6);
        g.fillRect(rightA.x, rightA.y - 2, W - rightA.x, 6);

        // Rzeka / przepaść na dnie z animowanymi falami
        g.fillStyle = "#0284c7";
        g.fillRect(leftA.x, H - 18, rightA.x - leftA.x, 18);
        g.strokeStyle = "rgba(255, 255, 255, 0.35)";
        g.lineWidth = 1;
        const waveShift = (now * 0.02) % 20;
        for (let wx = leftA.x - 20; wx < rightA.x; wx += 20) {
          const rx = wx + waveShift;
          if (rx >= leftA.x && rx + 12 <= rightA.x) {
            g.beginPath();
            g.moveTo(rx, H - 10);
            g.quadraticCurveTo(rx + 6, H - 13, rx + 12, H - 10);
            g.stroke();
          }
        }

        // Cząsteczki kurzu z naprężonych belek
        for (let i = s.dust.length - 1; i >= 0; i--) {
          const d = s.dust[i];
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          d.life -= dt * 2.0;
          if (d.life <= 0) {
            s.dust.splice(i, 1);
            continue;
          }
          g.fillStyle = d.c;
          g.fillRect(d.x, d.y, 1.6, 1.6);
        }

        // Belki mostu
        for (const e of s.edges) {
          if (e.broken) continue;
          const n1 = s.nodes[e.i1];
          const n2 = s.nodes[e.i2];

          // Kolor w zależności od naprężenia (zielony -> żółty -> czerwony)
          let col = "#10b981";
          if (e.stress > 0.75) col = "#ef4444";
          else if (e.stress > 0.45) col = "#f59e0b";

          if (!s.simulating) {
            col = e.type === "road" ? "#64748b" : e.type === "wood" ? "#b45309" : "#38bdf8";
          }

          g.strokeStyle = col;
          g.lineWidth = e.type === "road" ? 4.5 : e.type === "steel" ? 2.8 : 2.0;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(n1.x, n1.y);
          g.lineTo(n2.x, n2.y);
          g.stroke();
        }

        // Ciągnięta belka podczas projektowania (interaktywny podgląd z odległością)
        if (s.dragStartNode >= 0 && s.nodes[s.dragStartNode]) {
          const sn = s.nodes[s.dragStartNode];
          const dist = Math.hypot(s.cursorX - sn.x, s.cursorY - sn.y);
          const tooLong = dist > 85;

          g.strokeStyle = tooLong ? "#ef4444" : s.tool === "wood" ? "#b45309" : s.tool === "road" ? "#64748b" : "#38bdf8";
          g.lineWidth = s.tool === "road" ? 3.5 : 2.2;
          g.setLineDash([3, 2.5]);
          g.beginPath();
          g.moveTo(sn.x, sn.y);
          g.lineTo(s.cursorX, s.cursorY);
          g.stroke();
          g.setLineDash([]);

          // Etykieta długości
          const midX = (sn.x + s.cursorX) / 2;
          const midY = (sn.y + s.cursorY) / 2 - 6;
          g.fillStyle = tooLong ? "#ef4444" : "#f8fafc";
          g.font = "bold 6px sans-serif";
          g.textAlign = "center";
          g.fillText(`${Math.round(dist)}m`, midX, midY);
        }

        // Węzły mostu
        s.nodes.forEach((n, i) => {
          g.fillStyle = n.fixed ? "#f59e0b" : "#e2e8f0";
          g.strokeStyle = "#0f172a";
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(n.x, n.y, n.fixed ? 4.5 : 3.2, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        });

        // Pojazd testowy
        if (s.simulating) {
          const bounce = Math.sin(s.vehicleX * 0.4) * 0.8;
          g.save();
          g.translate(s.vehicleX, leftA.y - 8 + bounce);

          // Karoseria ciężarówki
          g.fillStyle = "#ef4444";
          g.fillRect(-12, -7, 24, 11);
          g.fillStyle = "#38bdf8";
          g.fillRect(5, -6, 6, 5); // szyba

          // Koła
          g.fillStyle = "#0f172a";
          g.beginPath();
          g.arc(-7, 5, 2.8, 0, Math.PI * 2);
          g.arc(7, 5, 2.8, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }
      });
    },
  });
}
