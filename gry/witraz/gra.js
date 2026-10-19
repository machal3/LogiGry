// Witraż: logiczno-planszowa gra inspirowana układaniem katedralnych rozet.
// Wybór szkiełek z warsztatu, zapełnianie linii przygotowawczych i montaż w gotyckim oknie bez powtórzeń w sąsiedztwie.
{
  const COLORS = [
    { id: "rubin", name: "Rubin", hex: "#ef4444", border: "#f87171" },
    { id: "szafir", name: "Szafir", hex: "#3b82f6", border: "#60a5fa" },
    { id: "bursztyn", name: "Bursztyn", hex: "#f59e0b", border: "#fbbf24" },
    { id: "szmaragd", name: "Szmaragd", hex: "#10b981", border: "#34d399" },
    { id: "ametyst", name: "Ametyst", hex: "#a855f7", border: "#c084fc" },
  ];

  // Sprawdza, czy szkiełko o danym kolorze może trafić na pole (r, c) w gotyckim oknie 5x5
  function canPlaceInWindow(grid, r, c, colorId) {
    if (r < 0 || r >= 5 || c < 0 || c >= 5) return false;
    if (grid[r * 5 + c]) return false; // pole zajęte

    // Sprawdzenie sąsiadów ortogonalnych (góra, dół, lewo, prawo)
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        const neighbor = grid[nr * 5 + nc];
        if (neighbor && neighbor.color === colorId) {
          return false; // sąsiad ma ten sam kolor!
        }
      }
    }
    return true;
  }

  // Oblicza punkty za ułożenie w oknie oraz odejmuje kary za potłuczone szkiełka na podłodze
  function scoreWindow(grid, floorCount) {
    let pts = 0;
    // Punkty za ukończone wiersze (po 5 pkt)
    for (let r = 0; r < 5; r++) {
      let full = true;
      for (let c = 0; c < 5; c++) {
        if (!grid[r * 5 + c]) full = false;
      }
      if (full) pts += 5;
    }
    // Punkty za ukończone kolumny (po 7 pkt)
    for (let c = 0; c < 5; c++) {
      let full = true;
      for (let r = 0; r < 5; r++) {
        if (!grid[r * 5 + c]) full = false;
      }
      if (full) pts += 7;
    }
    // Punkty za połączone grupy szkiełek (każde ułożone szkiełko daje 1 pkt bazowy + sąsiedzi)
    for (let i = 0; i < 25; i++) {
      if (grid[i]) pts += 1;
    }
    // Kary za podłogę: [-1, -1, -2, -2, -3, -3, ...]
    const penalties = [1, 1, 2, 2, 3, 3, 4, 4];
    let floorLoss = 0;
    for (let k = 0; k < floorCount; k++) {
      floorLoss += penalties[Math.min(k, penalties.length - 1)];
    }
    return { total: Math.max(0, pts - floorLoss), rawPoints: pts, floorLoss };
  }

  function setupPlates(platesCount) {
    const plates = [];
    for (let p = 0; p < platesCount; p++) {
      const pieces = [];
      for (let k = 0; k < 4; k++) {
        pieces.push(pick(COLORS).id);
      }
      plates.push(pieces);
    }
    return plates;
  }

  if (typeof module !== "undefined") {
    module.exports = { COLORS, canPlaceInWindow, scoreWindow, setupPlates };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "witraz",
    cat: "planszowe",
    name: "Witraż",
    author: "Gemini 4",
    desc: "Dobieraj kolorowe szkiełka z warsztatu i układaj mozaikę w oknie katedry zgodnie ze wzorami i sąsiedztwem.",
    color: "#4338ca",
    ink: "#ffffff",
    glyph: [
      "#.#.#",
      ".###.",
      "##.##",
      ".###.",
      "#.#.#",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, targetScore: 36, plates: 3, rounds: 4 },
      { key: "medium", name: "Średni", points: 25, targetScore: 50, plates: 4, rounds: 5 },
      { key: "hard", name: "Trudny", points: 50, targetScore: 70, plates: 5, rounds: 5 },
    ],
    rules: [
      "Wybierz paterę warsztatową i kliknij szkiełko wybranego koloru: zabierasz wszystkie szkiełka tego koloru z patery.",
      "Umieść pobrane szkiełka w jednej z 5 linii przygotowawczych (o pojemności od 1 do 5 szkiełek). Nadmiar trafia na podłogę i daje punkty karne.",
      "Gdy linia przygotowawcza jest pełna, po zakończeniu rundy szkiełko trafia do gotyckiego okna katedralnego.",
      "W oknie szkiełka tego samego koloru nie mogą stykać się bokami. Zdobądź wymagany kunszt i wygraj z mistrzem katedralnym.",
    ],
    achievements: [
      { id: "pierwszy-rzad", name: "Szklarz", desc: "Ukończ pierwszy pełny rząd kolorowych szkiełek w oknie.", points: 10 },
      { id: "czysta-podloga", name: "Czysty warsztat", desc: "Wygraj partię bez stłuczenia ani jednego szkiełka (pusta linia podłogi).", points: 25 },
      { id: "katedralna-rozeta", name: "Mistrz katedry", desc: "Zdobądź ponad 65 punktów i pokonaj mistrza katedralnego.", points: 25 },
      { id: "dzielo-zycia", name: "Dzieło życia", desc: "Wygraj trudny poziom z wynikiem co najmniej 80 punktów.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, targetScore, plates: platesCount, rounds: totalRounds } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const s = {
        round: 1,
        plates: setupPlates(platesCount),
        center: [],
        lines: [[], [], [], [], []], // 5 linii przygotowawczych gracza
        aiLines: [[], [], [], [], []],
        windowGrid: Array.from({ length: 25 }, () => null),
        aiGrid: Array.from({ length: 25 }, () => null),
        floor: 0,
        aiFloor: 0,
        playerTurn: true,
        selectedPlate: -1,
        selectedColor: null,
        selectedPiecesCount: 0,
        score: 0,
        aiScore: 0,
        everBrokeGlass: false,
        completedRowEver: false,
      };

      const scoreEl = statBlock(ctx, "Ocena kunsztu", { meter: true });
      const roundEl = statBlock(ctx, "Runda", { meter: true });
      const promptEl = statBlock(ctx, "Stan warsztatu", { small: true });

      function updatePanel() {
        scoreEl.set(
          `${s.score} pkt`,
          s.score / targetScore,
          `Cel: ${targetScore} pkt · Rywal: ${s.aiScore} pkt`
        );
        roundEl.set(
          `${s.round} / ${totalRounds}`,
          s.round / totalRounds,
          s.floor > 0 ? `Potłuczone szkło: ${s.floor} szt.` : "Warsztat w idealnym porządku"
        );
        promptEl.set(
          s.selectedColor ? `Wybrano: ${s.selectedPiecesCount}x ${s.selectedColor}. Kliknij linię (1–5)` : "Wybierz szkiełka z patery lub ze środka",
          null,
          "Klawisze 1–5 wybierają linię docelową"
        );
        ctx.progress(s.round / totalRounds);
      }

      function finishRound() {
        // Przenoszenie pełnych linii do okna katedralnego gracza
        for (let r = 0; r < 5; r++) {
          const cap = r + 1;
          if (s.lines[r].length === cap) {
            const colId = s.lines[r][0];
            // Szukamy wolnego pasującego pola w rzędzie r
            let placed = false;
            for (let c = 0; c < 5; c++) {
              if (canPlaceInWindow(s.windowGrid, r, c, colId)) {
                s.windowGrid[r * 5 + c] = { color: colId };
                placed = true;
                break;
              }
            }
            if (!placed) {
              // Jeśli nie ma gdzie postawić zgodnie z zasadami, szkiełko spada na podłogę
              s.floor++;
              s.everBrokeGlass = true;
            }
            s.lines[r] = [];
          }
        }

        // SI również rozlicza swoje linie
        for (let r = 0; r < 5; r++) {
          const cap = r + 1;
          if (s.aiLines[r].length === cap) {
            const colId = s.aiLines[r][0];
            for (let c = 0; c < 5; c++) {
              if (canPlaceInWindow(s.aiGrid, r, c, colId)) {
                s.aiGrid[r * 5 + c] = { color: colId };
                break;
              }
            }
            s.aiLines[r] = [];
          }
        }

        // Podliczenie punktów
        const pSc = scoreWindow(s.windowGrid, s.floor);
        const aSc = scoreWindow(s.aiGrid, s.aiFloor);
        s.score = pSc.total;
        s.aiScore = aSc.total;

        // Sprawdź ukończony wiersz do osiągnięcia
        for (let r = 0; r < 5; r++) {
          let full = true;
          for (let c = 0; c < 5; c++) if (!s.windowGrid[r * 5 + c]) full = false;
          if (full) {
            s.completedRowEver = true;
            ctx.achieve("pierwszy-rzad");
          }
        }

        if (s.round >= totalRounds) {
          // Koniec partii
          if (s.score >= targetScore && s.score >= s.aiScore) {
            if (!s.everBrokeGlass && s.floor === 0) ctx.achieve("czysta-podloga");
            if (s.score >= 65) ctx.achieve("katedralna-rozeta");
            if (key === "hard" && s.score >= 80) ctx.achieve("dzielo-zycia");
            ctx.win(`Wspaniała rozeta! Zdobyłeś ${s.score} pkt, pokonując mistrza katedralnego (${s.aiScore} pkt).`);
          } else {
            ctx.lose("Za mały kunszt", `Zdobyłeś ${s.score} z wymaganych ${targetScore} pkt (mistrz: ${s.aiScore} pkt).`);
          }
          return;
        }

        // Nowa runda
        s.round++;
        s.plates = setupPlates(platesCount);
        s.center = [];
        s.floor = 0;
        s.aiFloor = 0;
        Sound.line();
        ctx.toast(`Początek rundy ${s.round} z ${totalRounds}`);
        updatePanel();
      }

      function checkPlatesEmpty() {
        const platesEmpty = s.plates.every((p) => p.length === 0);
        return platesEmpty && s.center.length === 0;
      }

      function aiTurn() {
        if (ctx.done || checkPlatesEmpty()) return;

        // SI wybiera pierwszą niepustą paterę i dominujący kolor
        let chosenPlate = -1;
        let chosenColor = null;

        for (let i = 0; i < s.plates.length; i++) {
          if (s.plates[i].length > 0) {
            chosenPlate = i;
            chosenColor = s.plates[i][0];
            break;
          }
        }
        if (!chosenColor && s.center.length > 0) {
          chosenPlate = -2;
          chosenColor = s.center[0];
        }
        if (!chosenColor) return;

        let pieces = [];
        if (chosenPlate >= 0) {
          const rem = [];
          for (const c of s.plates[chosenPlate]) {
            if (c === chosenColor) pieces.push(c);
            else rem.push(c);
          }
          s.plates[chosenPlate] = [];
          s.center.push(...rem);
        } else {
          const rem = [];
          for (const c of s.center) {
            if (c === chosenColor) pieces.push(c);
            else rem.push(c);
          }
          s.center = rem;
        }

        // SI dopasowuje do pierwszej pasującej linii
        let placed = false;
        for (let r = 0; r < 5; r++) {
          const cap = r + 1;
          if (s.aiLines[r].length < cap && (s.aiLines[r].length === 0 || s.aiLines[r][0] === chosenColor)) {
            while (pieces.length > 0 && s.aiLines[r].length < cap) {
              s.aiLines[r].push(pieces.pop());
            }
            placed = true;
            break;
          }
        }
        if (pieces.length > 0) {
          s.aiFloor += pieces.length;
        }

        s.playerTurn = true;
        if (checkPlatesEmpty()) finishRound();
        else updatePanel();
      }

      function placeSelectedInLine(lineIdx) {
        if (ctx.done || !s.selectedColor || lineIdx < 0 || lineIdx >= 5) return;
        const cap = lineIdx + 1;
        const line = s.lines[lineIdx];

        if (line.length > 0 && line[0] !== s.selectedColor) {
          Sound.error();
          ctx.toast("W tej linii znajdują się już szkiełka innego koloru");
          return;
        }

        // Pobranie szkiełek z patery lub centrum
        let count = s.selectedPiecesCount;
        if (s.selectedPlate >= 0) {
          const rem = [];
          for (const c of s.plates[s.selectedPlate]) {
            if (c !== s.selectedColor) rem.push(c);
          }
          s.plates[s.selectedPlate] = [];
          s.center.push(...rem);
        } else if (s.selectedPlate === -2) {
          const rem = [];
          for (const c of s.center) {
            if (c !== s.selectedColor) rem.push(c);
          }
          s.center = rem;
        }

        // Wstawianie do linii gracza
        while (count > 0 && line.length < cap) {
          line.push(s.selectedColor);
          count--;
        }

        // Nadmiar spada na podłogę
        if (count > 0) {
          s.floor += count;
          s.everBrokeGlass = true;
          Sound.error();
          ctx.toast(`Nadmiar ${count} szkiełek spadł na podłogę (-punkty)!`);
        } else {
          Sound.place(lineIdx + 1);
        }

        s.selectedPlate = -1;
        s.selectedColor = null;
        s.selectedPiecesCount = 0;

        s.playerTurn = false;
        updatePanel();

        if (checkPlatesEmpty()) {
          finishRound();
        } else {
          setTimeout(aiTurn, 650);
        }
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || !s.playerTurn || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key >= "1" && e.key <= "5") {
          e.preventDefault();
          placeSelectedInLine(+e.key - 1);
        }
      });

      // Obsługa kliknięć na paterach i liniach
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || !s.playerTurn) return;
        const [x, y] = cv.at(e);

        // Sprawdź kliknięcie na paterach (lewa strona, x: 20..140)
        for (let i = 0; i < s.plates.length; i++) {
          const px = 32 + (i % 2) * 55;
          const py = 35 + Math.floor(i / 2) * 52;
          if (Math.hypot(x - px, y - py) < 22) {
            const p = s.plates[i];
            if (p.length > 0) {
              s.selectedPlate = i;
              s.selectedColor = p[0];
              s.selectedPiecesCount = p.filter((c) => c === s.selectedColor).length;
              Sound.tap();
              updatePanel();
              return;
            }
          }
        }

        // Sprawdź kliknięcie na środku (pula centralna)
        if (x > 25 && x < 140 && y > 140 && y < 190 && s.center.length > 0) {
          s.selectedPlate = -2;
          s.selectedColor = s.center[0];
          s.selectedPiecesCount = s.center.filter((c) => c === s.selectedColor).length;
          Sound.tap();
          updatePanel();
          return;
        }

        // Sprawdź kliknięcie na liniach przygotowawczych (środek, x: 145..195)
        if (x > 140 && x < 205 && s.selectedColor) {
          for (let r = 0; r < 5; r++) {
            const ly = 32 + r * 24;
            if (y >= ly - 10 && y <= ly + 14) {
              placeSelectedInLine(r);
              return;
            }
          }
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        // Tło pracowni witrażu
        g.fillStyle = "#1e1b4b";
        g.fillRect(0, 0, W, H);

        // --- PATER WARSZTATOWE (LEWA STRONA) ---
        for (let i = 0; i < s.plates.length; i++) {
          const px = 32 + (i % 2) * 55;
          const py = 35 + Math.floor(i / 2) * 52;
          const isSel = s.selectedPlate === i;

          // Patera porcelanowa
          g.fillStyle = isSel ? "#4338ca" : "#312e81";
          g.strokeStyle = isSel ? "#fbbf24" : "#6366f1";
          g.lineWidth = isSel ? 2 : 1;
          g.beginPath();
          g.arc(px, py, 21, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Szkiełka na paterze
          const p = s.plates[i];
          const offsets = [[-7, -7], [7, -7], [-7, 7], [7, 7]];
          for (let k = 0; k < p.length; k++) {
            const colObj = COLORS.find((c) => c.id === p[k]) || COLORS[0];
            const [ox, oy] = offsets[k];
            g.fillStyle = colObj.hex;
            g.strokeStyle = colObj.border;
            g.lineWidth = 1;
            g.beginPath();
            g.roundRect(px + ox - 5, py + oy - 5, 10, 10, 2);
            g.fill();
            g.stroke();
          }
        }

        // Pula centralna (odpadki z pater)
        g.fillStyle = "rgba(49, 46, 129, 0.45)";
        g.strokeStyle = s.selectedPlate === -2 ? "#fbbf24" : "rgba(99, 102, 241, 0.35)";
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(22, 148, 110, 36, 6);
        g.fill();
        g.stroke();

        g.fillStyle = "#a5b4fc";
        g.font = "6px sans-serif";
        g.fillText("Środek warsztatu:", 28, 158);

        for (let k = 0; k < Math.min(14, s.center.length); k++) {
          const colObj = COLORS.find((c) => c.id === s.center[k]) || COLORS[0];
          const cx = 32 + (k % 7) * 14;
          const cy = 168 + Math.floor(k / 7) * 12;
          g.fillStyle = colObj.hex;
          g.fillRect(cx - 4, cy - 4, 8, 8);
        }

        // --- LINIE PRZYGOTOWAWCZE (ŚRODEK) ---
        for (let r = 0; r < 5; r++) {
          const ly = 32 + r * 24;
          const cap = r + 1;
          const line = s.lines[r];

          g.fillStyle = "#a5b4fc";
          g.font = "bold 7px sans-serif";
          g.fillText(`${r + 1}.`, 146, ly + 4);

          // Podświetlenie linii jeśli pasuje do wybranego koloru
          if (s.selectedColor && line.length < cap && (!line[0] || line[0] === s.selectedColor)) {
            g.strokeStyle = "#fbbf24";
            g.lineWidth = 1.2;
            g.setLineDash([2, 2]);
            g.strokeRect(144, ly - 7, 58, 14);
            g.setLineDash([]);
          }

          for (let c = 0; c < cap; c++) {
            const sx = 195 - (cap - 1 - c) * 12;
            const piece = line[c];
            if (piece) {
              const colObj = COLORS.find((col) => col.id === piece) || COLORS[0];
              g.fillStyle = colObj.hex;
              g.strokeStyle = colObj.border;
              g.lineWidth = 1;
              g.beginPath();
              g.roundRect(sx - 5, ly - 5, 10, 10, 2);
              g.fill();
              g.stroke();
            } else {
              g.strokeStyle = "rgba(165, 180, 252, 0.3)";
              g.lineWidth = 1;
              g.strokeRect(sx - 5, ly - 5, 10, 10);
            }
          }
        }

        // Linia podłogi (potłuczone szkło)
        g.fillStyle = "rgba(239, 68, 68, 0.15)";
        g.strokeStyle = "#ef4444";
        g.lineWidth = 0.8;
        g.beginPath();
        g.roundRect(144, 156, 60, 22, 4);
        g.fill();
        g.stroke();
        g.fillStyle = "#fca5a5";
        g.font = "6px sans-serif";
        g.fillText(`Podłoga: ${s.floor} potłuczonych`, 148, 169);

        // --- OKNO KATEDRALNE 5x5 (PRAWA STRONA) ---
        const ox = 215, oy = 28;
        const cellSz = 14;

        // Gotycki szczyt okna (ostrołuk katedralny)
        g.fillStyle = "#111827";
        g.strokeStyle = "#4f46e5";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(ox - 3, oy - 3);
        g.quadraticCurveTo(ox + 2.5 * cellSz, oy - 22, ox + 5 * cellSz + 3, oy - 3);
        g.closePath();
        g.fill();
        g.stroke();

        // Mała ozdobna mini-rozeta w ostrołuku
        g.fillStyle = "rgba(250, 204, 21, 0.35)";
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 1;
        g.beginPath();
        g.arc(ox + 2.5 * cellSz, oy - 10, 5.5, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Gotycka rama okienna 5x5
        g.fillStyle = "#111827";
        g.strokeStyle = "#4b5563";
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(ox - 3, oy - 3, 5 * cellSz + 6, 5 * cellSz + 6, 4);
        g.fill();
        g.stroke();

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const bx = ox + c * cellSz;
            const by = oy + r * cellSz;
            const cell = s.windowGrid[r * 5 + c];

            if (cell) {
              const colObj = COLORS.find((col) => col.id === cell.color) || COLORS[0];
              g.fillStyle = colObj.hex;
              g.fillRect(bx, by, cellSz - 1, cellSz - 1);

              // Połysk gotyckiego szkła
              g.fillStyle = "rgba(255, 255, 255, 0.4)";
              g.beginPath();
              g.moveTo(bx + 1, by + 1);
              g.lineTo(bx + 5, by + 1);
              g.lineTo(bx + 1, by + 5);
              g.closePath();
              g.fill();
            } else {
              // Pusta kwatera witraża z ołowianą listwą
              g.fillStyle = "rgba(17, 24, 39, 0.9)";
              g.fillRect(bx, by, cellSz - 1, cellSz - 1);
              g.strokeStyle = "rgba(75, 85, 99, 0.5)";
              g.lineWidth = 0.6;
              g.strokeRect(bx, by, cellSz - 1, cellSz - 1);
            }
          }
        }

        // Promień słońca padający ukośnie przez witraż
        const sunX = ox - 15 + ((now * 0.02) % (5 * cellSz + 50));
        const sunGrad = g.createLinearGradient(sunX, oy - 15, sunX + 22, oy + 5 * cellSz + 15);
        sunGrad.addColorStop(0, "rgba(254, 240, 138, 0)");
        sunGrad.addColorStop(0.5, "rgba(254, 240, 138, 0.16)");
        sunGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        g.fillStyle = sunGrad;
        g.fillRect(ox - 3, oy - 15, 5 * cellSz + 6, 5 * cellSz + 20);

        // Tytuł okna
        g.fillStyle = "#e0e7ff";
        g.font = "bold 6.8px sans-serif";
        g.textAlign = "center";
        g.fillText("Rozeta Katedralna", ox + 2.5 * cellSz, oy + 5 * cellSz + 14);
      });
    },
  });
}
