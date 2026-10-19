// Witraż: logiczno-planszowa gra inspirowana układaniem katedralnych rozet.
// Wybór szkiełek z warsztatu, zapełnianie linii wzorów i montaż w gotyckim oknie zgodnie z szablonem.
{
  const COLORS = [
    { id: "rubin", name: "Rubin", hex: "#ef4444", border: "#fca5a5", mark: "◆" },
    { id: "szafir", name: "Szafir", hex: "#3b82f6", border: "#93c5fd", mark: "●" },
    { id: "bursztyn", name: "Bursztyn", hex: "#f59e0b", border: "#fde68a", mark: "▲" },
    { id: "szmaragd", name: "Szmaragd", hex: "#10b981", border: "#6ee7b7", mark: "■" },
    { id: "ametyst", name: "Ametyst", hex: "#a855f7", border: "#d8b4fe", mark: "★" },
  ];

  const FLOOR_SLOT_PENALTIES = [1, 1, 2, 2, 2, 3, 3];

  // Zwraca docelowy kolor szablonu witrażowego dla pola (r, c)
  function getWindowPatternColor(r, c, colorsCount = COLORS.length) {
    const idx = ((r + c) % colorsCount + colorsCount) % colorsCount;
    return COLORS[idx].id;
  }

  // Sprawdza, czy w rzędzie r okna znajduje się już szkiełko danego koloru
  function rowHasColor(grid, r, colorId) {
    for (let c = 0; c < 5; c++) {
      const cell = grid[r * 5 + c];
      if (cell && cell.color === colorId) return true;
    }
    return false;
  }

  // Sprawdza, czy szkiełko o danym kolorze może trafić na pole (r, c) w gotyckim oknie 5x5
  function canPlaceInWindow(grid, r, c, colorId) {
    if (r < 0 || r >= 5 || c < 0 || c >= 5) return false;
    if (grid[r * 5 + c]) return false;
    if (rowHasColor(grid, r, colorId)) return false;

    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5) {
        const neighbor = grid[nr * 5 + nc];
        if (neighbor && neighbor.color === colorId) {
          return false;
        }
      }
    }
    return true;
  }

  // Znajduje docelową kolumnę w wierszu r dla danego koloru zgodnie ze wzorem okna
  function findWindowColumnForRow(grid, r, colorId, colorsCount = COLORS.length) {
    for (let c = 0; c < 5; c++) {
      if (getWindowPatternColor(r, c, colorsCount) === colorId && canPlaceInWindow(grid, r, c, colorId)) {
        return c;
      }
    }
    for (let c = 0; c < 5; c++) {
      if (canPlaceInWindow(grid, r, c, colorId)) return c;
    }
    return -1;
  }

  // Punkty za nowo dołożone szkiełko na pole (r, c) z uwzględnieniem sąsiednich łańcuchów w wierszu i kolumnie
  function scoreTilePlacement(grid, r, c) {
    let horiz = 1;
    for (let cc = c - 1; cc >= 0 && grid[r * 5 + cc]; cc--) horiz++;
    for (let cc = c + 1; cc < 5 && grid[r * 5 + cc]; cc++) horiz++;

    let vert = 1;
    for (let rr = r - 1; rr >= 0 && grid[rr * 5 + c]; rr--) vert++;
    for (let rr = r + 1; rr < 5 && grid[rr * 5 + c]; rr++) vert++;

    if (horiz === 1 && vert === 1) return 1;
    return (horiz > 1 ? horiz : 0) + (vert > 1 ? vert : 0);
  }

  function calcFloorPenalty(floorCount) {
    let loss = 0;
    for (let k = 0; k < floorCount; k++) {
      loss += FLOOR_SLOT_PENALTIES[Math.min(k, FLOOR_SLOT_PENALTIES.length - 1)];
    }
    return loss;
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
    // Punkty za komplet 5 szkiełek tego samego koloru (po 10 pkt)
    for (const col of COLORS) {
      let cnt = 0;
      for (let i = 0; i < 25; i++) {
        if (grid[i] && grid[i].color === col.id) cnt++;
      }
      if (cnt === 5) pts += 10;
    }
    // Punkty za osadzone szkiełka i ich połączenia
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (grid[r * 5 + c]) {
          pts += 1;
          if (c > 0 && grid[r * 5 + (c - 1)]) pts += 1;
          if (r > 0 && grid[(r - 1) * 5 + c]) pts += 1;
        }
      }
    }
    const floorLoss = calcFloorPenalty(floorCount);
    return { total: Math.max(0, pts - floorLoss), rawPoints: pts, floorLoss };
  }

  function setupPlates(platesCount, colorsCount = COLORS.length) {
    const pool = COLORS.slice(0, colorsCount);
    const plates = [];
    for (let p = 0; p < platesCount; p++) {
      const pieces = [];
      for (let k = 0; k < 4; k++) {
        pieces.push(pick(pool).id);
      }
      plates.push(pieces);
    }
    return plates;
  }

  if (typeof module !== "undefined") {
    module.exports = {
      COLORS,
      FLOOR_SLOT_PENALTIES,
      getWindowPatternColor,
      canPlaceInWindow,
      findWindowColumnForRow,
      scoreTilePlacement,
      calcFloorPenalty,
      scoreWindow,
      setupPlates,
    };
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
      { key: "easy", name: "Łatwy", points: 10, targetScore: 28, plates: 3, rounds: 4, colorsCount: 5 },
      { key: "medium", name: "Średni", points: 25, targetScore: 42, plates: 4, rounds: 5, colorsCount: 5 },
      { key: "hard", name: "Trudny", points: 50, targetScore: 58, plates: 5, rounds: 5, colorsCount: 5 },
    ],
    rules: [
      "Kliknij wybrane szkiełko na paterze lub na środku warsztatu, aby pobrać wszystkie szkiełka tego koloru z danego miejsca.",
      "Wskaż jedną z 5 linii wzoru (1–5), do której pasuje wybrany kolor. Nadmiar szkiełek spada na podłogę i odejmuje punkty.",
      "Po opróżnieniu warsztatu pełne linie wzoru przesuwają prawe szkiełko na odpowiednie pole szablonu w oknie katedralnym.",
      "W jednym rzędzie okna każdy kolor może wystąpić tylko raz. Zdobądź wymagany kunszt i wygraj z mistrzem katedralnym.",
    ],
    achievements: [
      { id: "pierwszy-rzad", name: "Szklarz", desc: "Ukończ pierwszy pełny rząd kolorowych szkiełek w oknie.", points: 10 },
      { id: "czysta-podloga", name: "Czysty warsztat", desc: "Wygraj partię bez stłuczenia ani jednego szkiełka (pusta linia podłogi).", points: 25 },
      { id: "katedralna-rozeta", name: "Mistrz katedry", desc: "Zdobądź co najmniej 65 punktów i pokonaj mistrza katedralnego.", points: 25 },
      { id: "dzielo-zycia", name: "Dzieło życia", desc: "Wygraj trudny poziom z wynikiem co najmniej 80 punktów.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, targetScore, plates: platesCount, rounds: totalRounds, colorsCount = 5 } = ctx.level;
      const W = 280, H = 195;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      let aiTimer = 0;
      ctx.onStop(() => clearTimeout(aiTimer));

      const s = {
        round: 1,
        colorsCount,
        plates: setupPlates(platesCount, colorsCount),
        center: [],
        lines: [[], [], [], [], []],
        aiLines: [[], [], [], [], []],
        windowGrid: Array.from({ length: 25 }, () => null),
        aiGrid: Array.from({ length: 25 }, () => null),
        floor: 0,
        aiFloor: 0,
        playerTurn: true,
        selectedPlate: -1, // 0..N-1 = patera, -2 = środek warsztatu
        selectedColor: null,
        selectedPiecesCount: 0,
        score: 0,
        aiScore: 0,
        everBrokeGlass: false,
        completedRowEver: false,
        scoredRows: [false, false, false, false, false],
        scoredCols: [false, false, false, false, false],
        scoredColors: {},
        aiScoredRows: [false, false, false, false, false],
        aiScoredCols: [false, false, false, false, false],
        aiScoredColors: {},
      };

      const cloneState = () => JSON.parse(JSON.stringify(s));
      const saveUndo = ctx.undoable((snap) => {
        clearTimeout(aiTimer);
        Object.assign(s, snap);
        s.playerTurn = true;
        Sound.erase();
        updatePanel();
      });

      const scoreEl = statBlock(ctx, "Ocena kunsztu", { meter: true });
      const roundEl = statBlock(ctx, "Runda", { meter: true });
      const promptEl = statBlock(ctx, "Stan warsztatu", { small: true });

      // Pomocnicze wyliczenie pozycji patery (x: 10..105, y: 12..135)
      function getPlatePos(i, total) {
        if (total === 5) {
          const coords = [
            [34, 42],
            [79, 42],
            [56.5, 76],
            [34, 110],
            [79, 110],
          ];
          return coords[i] || [34, 42];
        }
        const col = i % 2;
        const row = Math.floor(i / 2);
        return [34 + col * 45, 48 + row * 48];
      }

      const TILE_OFFSETS = [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]];

      // Sprawdza, czy linia wzoru r może przyjąć dany kolor
      function canLineAcceptColor(r, colorId) {
        if (!colorId || r < 0 || r >= 5) return false;
        const cap = r + 1;
        const line = s.lines[r];
        if (line.length >= cap) return false;
        if (line.length > 0 && line[0] !== colorId) return false;
        if (rowHasColor(s.windowGrid, r, colorId)) return false;
        return findWindowColumnForRow(s.windowGrid, r, colorId, s.colorsCount) !== -1;
      }

      function getColorName(colorId) {
        return (COLORS.find((c) => c.id === colorId) || COLORS[0]).name;
      }

      function updatePanel() {
        scoreEl.set(
          `${s.score} pkt`,
          Math.min(1, s.score / targetScore),
          `Cel: ${targetScore} pkt · Mistrz: ${s.aiScore} pkt`
        );
        roundEl.set(
          `${s.round} z ${totalRounds}`,
          s.round / totalRounds,
          s.floor > 0 ? `Podłoga: ${s.floor} szt. (-${calcFloorPenalty(s.floor)} pkt)` : "Podłoga czysta (0 kar)"
        );
        if (s.selectedColor) {
          const cName = getColorName(s.selectedColor);
          promptEl.set(
            `Wybrano: ${s.selectedPiecesCount}× ${cName}`,
            null,
            "Kliknij linię wzoru 1–5 lub podłogę"
          );
        } else {
          promptEl.set(
            "Wybierz szkiełko z patery lub środka",
            null,
            "Kliknij konkretny kolor lub użyj Tab i 1–5"
          );
        }
        ctx.progress((s.round - 1) / totalRounds);
      }

      function settleGridRound(grid, lines, floorCount, scoredRows, scoredCols, scoredColors) {
        let roundGain = 0;

        for (let r = 0; r < 5; r++) {
          const cap = r + 1;
          if (lines[r].length === cap) {
            const colId = lines[r][0];
            const targetCol = findWindowColumnForRow(grid, r, colId, s.colorsCount);
            if (targetCol !== -1) {
              grid[r * 5 + targetCol] = { color: colId };
              roundGain += scoreTilePlacement(grid, r, targetCol);
            } else {
              floorCount++;
              if (grid === s.windowGrid) s.everBrokeGlass = true;
            }
            lines[r] = [];
          }
        }

        // Premie za nowo ukończone wiersze (+5 pkt)
        for (let r = 0; r < 5; r++) {
          if (!scoredRows[r]) {
            let full = true;
            for (let c = 0; c < 5; c++) if (!grid[r * 5 + c]) full = false;
            if (full) {
              scoredRows[r] = true;
              roundGain += 5;
            }
          }
        }

        // Premie za nowo ukończone kolumny (+7 pkt)
        for (let c = 0; c < 5; c++) {
          if (!scoredCols[c]) {
            let full = true;
            for (let r = 0; r < 5; r++) if (!grid[r * 5 + c]) full = false;
            if (full) {
              scoredCols[c] = true;
              roundGain += 7;
            }
          }
        }

        // Premie za zebranie wszystkich 5 szkiełek danego koloru (+10 pkt)
        for (const col of COLORS) {
          if (!scoredColors[col.id]) {
            let cnt = 0;
            for (let i = 0; i < 25; i++) {
              if (grid[i] && grid[i].color === col.id) cnt++;
            }
            if (cnt === 5) {
              scoredColors[col.id] = true;
              roundGain += 10;
            }
          }
        }

        const penalty = calcFloorPenalty(floorCount);
        return { roundGain, penalty, finalFloor: floorCount };
      }

      function finishRound() {
        const pRes = settleGridRound(
          s.windowGrid,
          s.lines,
          s.floor,
          s.scoredRows,
          s.scoredCols,
          s.scoredColors
        );
        s.score = Math.max(0, s.score + pRes.roundGain - pRes.penalty);

        const aiRes = settleGridRound(
          s.aiGrid,
          s.aiLines,
          s.aiFloor,
          s.aiScoredRows,
          s.aiScoredCols,
          s.aiScoredColors
        );
        s.aiScore = Math.max(0, s.aiScore + aiRes.roundGain - aiRes.penalty);

        // Sprawdź ukończony wiersz do osiągnięcia
        if (s.scoredRows.some(Boolean) && !s.completedRowEver) {
          s.completedRowEver = true;
          ctx.achieve("pierwszy-rzad");
        }

        if (s.round >= totalRounds) {
          updatePanel();
          if (s.score >= targetScore && s.score >= s.aiScore) {
            if (!s.everBrokeGlass && pRes.finalFloor === 0) ctx.achieve("czysta-podloga");
            if (s.score >= 65) ctx.achieve("katedralna-rozeta");
            if (key === "hard" && s.score >= 80) ctx.achieve("dzielo-zycia");
            ctx.win(`Ukończono witraż z wynikiem ${s.score} pkt wobec ${s.aiScore} pkt mistrza katedralnego.`);
          } else {
            ctx.lose(
              "Za mały kunszt",
              `Zdobyłeś ${s.score} z wymaganych ${targetScore} pkt (mistrz katedralny: ${s.aiScore} pkt).`
            );
          }
          return;
        }

        // Nowa runda
        s.round++;
        s.plates = setupPlates(platesCount, s.colorsCount);
        s.center = [];
        s.floor = 0;
        s.aiFloor = 0;
        s.playerTurn = true;
        s.selectedPlate = -1;
        s.selectedColor = null;
        s.selectedPiecesCount = 0;
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

        const pieces = [];
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

        for (let r = 0; r < 5; r++) {
          const cap = r + 1;
          const canWindow = findWindowColumnForRow(s.aiGrid, r, chosenColor, s.colorsCount) !== -1;
          if (
            canWindow &&
            s.aiLines[r].length < cap &&
            (s.aiLines[r].length === 0 || s.aiLines[r][0] === chosenColor)
          ) {
            while (pieces.length > 0 && s.aiLines[r].length < cap) {
              s.aiLines[r].push(pieces.pop());
            }
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

      function takeSelectedFromWorkshop() {
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
        return count;
      }

      function dropSelectedToFloor() {
        if (ctx.done || !s.playerTurn || !s.selectedColor) return;
        saveUndo(cloneState());
        const count = takeSelectedFromWorkshop();
        s.floor += count;
        s.everBrokeGlass = true;
        Sound.error();
        ctx.toast(`Odłożono ${count} szt. na podłogę warsztatu`);

        s.selectedPlate = -1;
        s.selectedColor = null;
        s.selectedPiecesCount = 0;
        s.playerTurn = false;
        updatePanel();

        if (checkPlatesEmpty()) {
          finishRound();
        } else {
          aiTimer = setTimeout(aiTurn, 420);
        }
      }

      function placeSelectedInLine(lineIdx) {
        if (ctx.done || !s.playerTurn || !s.selectedColor || lineIdx < 0 || lineIdx >= 5) return;
        const cap = lineIdx + 1;
        const line = s.lines[lineIdx];

        if (line.length >= cap) {
          Sound.error();
          ctx.toast("Ta linia wzoru jest już pełna");
          return;
        }
        if (line.length > 0 && line[0] !== s.selectedColor) {
          Sound.error();
          ctx.toast("W tej linii znajdują się już szkiełka innego koloru");
          return;
        }
        if (rowHasColor(s.windowGrid, lineIdx, s.selectedColor)) {
          Sound.error();
          ctx.toast("Ten kolor jest już osadzony w tym rzędzie okna");
          return;
        }
        if (findWindowColumnForRow(s.windowGrid, lineIdx, s.selectedColor, s.colorsCount) === -1) {
          Sound.error();
          ctx.toast("Tego koloru nie można osadzić w tym rzędzie okna");
          return;
        }

        saveUndo(cloneState());
        let count = takeSelectedFromWorkshop();

        while (count > 0 && line.length < cap) {
          line.push(s.selectedColor);
          count--;
        }

        if (count > 0) {
          s.floor += count;
          s.everBrokeGlass = true;
          Sound.error();
          ctx.toast(`Nadmiar szkiełek (${count} szt.) spadł na podłogę`);
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
          aiTimer = setTimeout(aiTurn, 420);
        }
      }

      function selectFromSource(sourceIdx, colorId) {
        const list = sourceIdx === -2 ? s.center : s.plates[sourceIdx];
        if (!list || list.length === 0) return;
        const uniqueColors = [...new Set(list)];
        let chosen = colorId;
        if (!chosen) {
          if (s.selectedPlate === sourceIdx && s.selectedColor) {
            const curIdx = uniqueColors.indexOf(s.selectedColor);
            chosen = uniqueColors[(curIdx + 1) % uniqueColors.length];
          } else {
            chosen = uniqueColors[0];
          }
        }
        s.selectedPlate = sourceIdx;
        s.selectedColor = chosen;
        s.selectedPiecesCount = list.filter((c) => c === chosen).length;
        Sound.tap();
        updatePanel();
      }

      function cycleSelection() {
        const options = [];
        for (let i = 0; i < s.plates.length; i++) {
          const uniq = [...new Set(s.plates[i])];
          for (const col of uniq) options.push({ plate: i, color: col });
        }
        const centerUniq = [...new Set(s.center)];
        for (const col of centerUniq) options.push({ plate: -2, color: col });
        if (options.length === 0) return;

        const curIdx = options.findIndex((o) => o.plate === s.selectedPlate && o.color === s.selectedColor);
        const next = options[(curIdx + 1) % options.length];
        selectFromSource(next.plate, next.color);
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || !s.playerTurn || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key >= "1" && e.key <= "5") {
          e.preventDefault();
          placeSelectedInLine(+e.key - 1);
        } else if (e.key === "0" || e.key === "6") {
          e.preventDefault();
          dropSelectedToFloor();
        } else if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          cycleSelection();
        }
      });

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || !s.playerTurn) return;
        const [x, y] = cv.at(e);

        // 1. Kliknięcie na paterach warsztatowych (x: 10..105, y: 12..135)
        for (let i = 0; i < s.plates.length; i++) {
          const [px, py] = getPlatePos(i, s.plates.length);
          const p = s.plates[i];
          if (p.length === 0) continue;

          if (Math.hypot(x - px, y - py) <= 20) {
            // Sprawdź, w które konkretnie szkiełko na paterze kliknął gracz
            let bestTile = -1;
            let bestDist = Infinity;
            for (let k = 0; k < p.length; k++) {
              const [ox, oy] = TILE_OFFSETS[k];
              const d = Math.hypot(x - (px + ox), y - (py + oy));
              if (d < bestDist) {
                bestDist = d;
                bestTile = k;
              }
            }
            const clickedColor = bestTile >= 0 && bestDist <= 10 ? p[bestTile] : null;
            if (clickedColor && s.selectedPlate === i && s.selectedColor === clickedColor) {
              // Ponowne kliknięcie w ten sam kolor na paterze przełącza na kolejny kolor na tej paterze
              selectFromSource(i, null);
            } else {
              selectFromSource(i, clickedColor);
            }
            return;
          }
        }

        // 2. Kliknięcie w Środek warsztatu (x: 10..165, y: 142..188)
        if (x >= 10 && x <= 165 && y >= 142 && y <= 188 && s.center.length > 0) {
          let clickedColor = null;
          for (let k = 0; k < Math.min(18, s.center.length); k++) {
            const cx = 22 + (k % 9) * 15;
            const cy = 163 + Math.floor(k / 9) * 13;
            if (Math.abs(x - cx) <= 6.5 && Math.abs(y - cy) <= 6.5) {
              clickedColor = s.center[k];
              break;
            }
          }
          selectFromSource(-2, clickedColor);
          return;
        }

        // 3. Kliknięcie na linie wzorów (x: 112..184, y: 20..135)
        if (x >= 112 && x <= 184 && y >= 25 && y <= 135 && s.selectedColor) {
          for (let r = 0; r < 5; r++) {
            const ly = 45 + r * 16;
            if (y >= ly - 8 && y <= ly + 8) {
              placeSelectedInLine(r);
              return;
            }
          }
        }

        // 4. Kliknięcie w Podłogę warsztatu (x: 172..272, y: 142..188)
        if (x >= 172 && x <= 272 && y >= 142 && y <= 188 && s.selectedColor) {
          dropSelectedToFloor();
        }
      });

      updatePanel();

      function drawStainedTile(x, y, sz, colObj, { highlighted = false, alpha = 1 } = {}) {
        g.save();
        g.globalAlpha = alpha;
        g.fillStyle = colObj.hex;
        g.strokeStyle = highlighted ? "#fde047" : colObj.border;
        g.lineWidth = highlighted ? 1.5 : 0.9;
        g.beginPath();
        g.roundRect(x, y, sz, sz, 2);
        g.fill();
        g.stroke();

        // Odblask szkiełka witrażowego
        g.fillStyle = "rgba(255, 255, 255, 0.35)";
        g.beginPath();
        g.moveTo(x + 1.2, y + 1.2);
        g.lineTo(x + sz * 0.55, y + 1.2);
        g.lineTo(x + 1.2, y + sz * 0.55);
        g.closePath();
        g.fill();
        g.restore();
      }

      cv.loop((dt, now) => {
        // Tło pracowni witrażu
        g.fillStyle = "#17153b";
        g.fillRect(0, 0, W, H);

        // --- 1. PATERY WARSZTATOWE (x: 10..105, y: 12..135) ---
        cv.text("Patery warsztatu", 56, 15, { size: 4.8, weight: 700, color: "#c7d2fe", align: "center" });

        const plateRadius = s.plates.length === 5 ? 15.5 : 17.5;
        for (let i = 0; i < s.plates.length; i++) {
          const [px, py] = getPlatePos(i, s.plates.length);
          const isSel = s.selectedPlate === i;

          g.fillStyle = isSel ? "#3730a3" : "#26235c";
          g.strokeStyle = isSel ? "#fbbf24" : "#6366f1";
          g.lineWidth = isSel ? 1.6 : 1;
          g.beginPath();
          g.arc(px, py, plateRadius, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Wewnętrzny pierścień patery
          g.strokeStyle = "rgba(199, 210, 254, 0.2)";
          g.lineWidth = 0.6;
          g.beginPath();
          g.arc(px, py, plateRadius - 3, 0, Math.PI * 2);
          g.stroke();

          const p = s.plates[i];
          for (let k = 0; k < p.length; k++) {
            const colObj = COLORS.find((c) => c.id === p[k]) || COLORS[0];
            const [ox, oy] = TILE_OFFSETS[k];
            const isColorSel = isSel && s.selectedColor === p[k];
            const sz = isColorSel ? 9.6 : 8.6;
            drawStainedTile(px + ox - sz / 2, py + oy - sz / 2, sz, colObj, {
              highlighted: isColorSel,
            });
          }
        }

        // --- 2. ŚRODEK WARSZTATU (x: 10..165, y: 142..188) ---
        const isCenterSel = s.selectedPlate === -2;
        g.fillStyle = "rgba(38, 35, 92, 0.7)";
        g.strokeStyle = isCenterSel ? "#fbbf24" : "rgba(129, 140, 248, 0.45)";
        g.lineWidth = isCenterSel ? 1.5 : 1;
        g.beginPath();
        g.roundRect(10, 142, 155, 46, 5);
        g.fill();
        g.stroke();

        cv.text("Środek warsztatu", 16, 150, {
          size: 4.5,
          weight: 700,
          color: "#c7d2fe",
          align: "left",
        });

        if (s.center.length === 0) {
          cv.text("Brak zsuniętych szkiełek", 87, 169, {
            size: 4.2,
            weight: 500,
            color: "rgba(199, 210, 254, 0.45)",
            align: "center",
          });
        } else {
          for (let k = 0; k < Math.min(18, s.center.length); k++) {
            const colId = s.center[k];
            const colObj = COLORS.find((c) => c.id === colId) || COLORS[0];
            const cx = 22 + (k % 9) * 15;
            const cy = 163 + Math.floor(k / 9) * 13;
            const isColorSel = isCenterSel && s.selectedColor === colId;
            const sz = isColorSel ? 10 : 8.8;
            drawStainedTile(cx - sz / 2, cy - sz / 2, sz, colObj, {
              highlighted: isColorSel,
            });
          }
        }

        // --- 3. LINIE WZORÓW 1..5 (x: 112..178, y: 20..135) ---
        cv.text("Linie wzoru", 148, 15, { size: 4.8, weight: 700, color: "#c7d2fe", align: "center" });

        for (let r = 0; r < 5; r++) {
          const ly = 45 + r * 16;
          const cap = r + 1;
          const line = s.lines[r];
          const accepts = canLineAcceptColor(r, s.selectedColor);

          cv.text(`${r + 1}.`, 115, ly, {
            size: 4.6,
            weight: 700,
            color: accepts ? "#fde047" : "#a5b4fc",
            align: "left",
          });

          // Podświetlenie linii, które mogą przyjąć wybrany kolor
          if (accepts) {
            g.fillStyle = "rgba(34, 197, 94, 0.14)";
            g.strokeStyle = "#4ade80";
            g.lineWidth = 1.2;
            g.beginPath();
            g.roundRect(121, ly - 6.8, 57, 13.6, 3);
            g.fill();
            g.stroke();
          }

          for (let c = 0; c < cap; c++) {
            const sx = 171 - (cap - 1 - c) * 10.5;
            const piece = line[c];
            if (piece) {
              const colObj = COLORS.find((col) => col.id === piece) || COLORS[0];
              drawStainedTile(sx - 4.5, ly - 4.5, 9, colObj);
            } else {
              g.fillStyle = "rgba(17, 24, 39, 0.55)";
              g.strokeStyle = accepts ? "rgba(74, 222, 128, 0.65)" : "rgba(165, 180, 252, 0.35)";
              g.lineWidth = 0.8;
              g.beginPath();
              g.roundRect(sx - 4.5, ly - 4.5, 9, 9, 1.5);
              g.fill();
              g.stroke();
            }
          }

          // Strzałka prowadząca z linii wzoru do rzędu okna
          cv.text("›", 182, ly, {
            size: 5.5,
            weight: 700,
            color: line.length === cap ? "#fbbf24" : "rgba(165, 180, 252, 0.45)",
            align: "center",
          });
        }

        // --- 4. GOTYCKIE OKNO WITRAŻOWE 5x5 (x: 185..272, y: 20..135) ---
        const ox = 188, oy = 37;
        const cellSz = 16;
        const winW = 5 * cellSz;

        // Gotycki szczyt okna (ostrołuk z rozetą)
        g.fillStyle = "#0f172a";
        g.strokeStyle = "#6366f1";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(ox - 2, oy);
        g.quadraticCurveTo(ox + winW / 2, oy - 26, ox + winW + 2, oy);
        g.closePath();
        g.fill();
        g.stroke();

        // Ozdobna rozeta w ostrołuku
        const rx = ox + winW / 2, ry = oy - 9.5;
        g.fillStyle = "rgba(251, 191, 36, 0.22)";
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 0.9;
        g.beginPath();
        g.arc(rx, ry, 5.5, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        for (let a = 0; a < 6; a++) {
          const ang = (a * Math.PI) / 3;
          g.beginPath();
          g.moveTo(rx, ry);
          g.lineTo(rx + Math.cos(ang) * 5.2, ry + Math.sin(ang) * 5.2);
          g.stroke();
        }

        // Rama okna 5x5
        g.fillStyle = "#0f172a";
        g.strokeStyle = "#64748b";
        g.lineWidth = 1.8;
        g.beginPath();
        g.roundRect(ox - 2, oy - 2, winW + 4, winW + 4, 3);
        g.fill();
        g.stroke();

        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const bx = ox + c * cellSz;
            const by = oy + r * cellSz;
            const cell = s.windowGrid[r * 5 + c];
            const patColorId = getWindowPatternColor(r, c, s.colorsCount);
            const patObj = COLORS.find((col) => col.id === patColorId) || COLORS[0];

            if (cell) {
              const colObj = COLORS.find((col) => col.id === cell.color) || COLORS[0];
              drawStainedTile(bx + 0.8, by + 0.8, cellSz - 1.6, colObj, {
                highlighted: s.selectedColor === cell.color,
              });
            } else {
              // Szablon witrażowy: półprzezroczysty docelowy kolor z obwódką i kropką wzoru
              const isTargetForSel =
                s.selectedColor === patColorId && canLineAcceptColor(r, s.selectedColor);
              g.fillStyle = "#111827";
              g.fillRect(bx + 0.5, by + 0.5, cellSz - 1, cellSz - 1);

              g.save();
              g.globalAlpha = isTargetForSel ? 0.42 : 0.22;
              g.fillStyle = patObj.hex;
              g.beginPath();
              g.roundRect(bx + 1.5, by + 1.5, cellSz - 3, cellSz - 3, 2);
              g.fill();
              g.restore();

              g.strokeStyle = isTargetForSel ? "#fde047" : patObj.border;
              g.lineWidth = isTargetForSel ? 1.2 : 0.6;
              g.beginPath();
              g.roundRect(bx + 1.5, by + 1.5, cellSz - 3, cellSz - 3, 2);
              g.stroke();

              // Mały znacznik koloru w środku szablonu
              g.fillStyle = patObj.hex;
              g.beginPath();
              g.arc(bx + cellSz / 2, by + cellSz / 2, 2.2, 0, Math.PI * 2);
              g.fill();
            }
          }
        }

        // Promień światła padający ukośnie przez witraż
        const sunX = ox - 12 + ((now * 0.015) % (winW + 40));
        const sunGrad = g.createLinearGradient(sunX, oy, sunX + 18, oy + winW);
        sunGrad.addColorStop(0, "rgba(254, 240, 138, 0)");
        sunGrad.addColorStop(0.5, "rgba(254, 240, 138, 0.14)");
        sunGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        g.fillStyle = sunGrad;
        g.fillRect(ox, oy, winW, winW);

        cv.text("Okno katedralne", ox + winW / 2, oy + winW + 10, {
          size: 4.5,
          weight: 700,
          color: "#e0e7ff",
          align: "center",
        });

        // --- 5. PODŁOGA WARSZTATU (x: 172..272, y: 142..188) ---
        g.fillStyle = "rgba(69, 10, 10, 0.45)";
        g.strokeStyle = s.selectedColor ? "rgba(248, 113, 113, 0.75)" : "rgba(239, 68, 68, 0.45)";
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(172, 142, 100, 46, 5);
        g.fill();
        g.stroke();

        cv.text("Podłoga (kary)", 222, 150, {
          size: 4.5,
          weight: 700,
          color: "#fca5a5",
          align: "center",
        });

        const slotLabels = ["-1", "-1", "-2", "-2", "-2"];
        for (let k = 0; k < 5; k++) {
          const sx = 177 + k * 18.5;
          const sy = 157;
          const broken = k < s.floor;

          g.fillStyle = broken ? "rgba(239, 68, 68, 0.35)" : "rgba(17, 24, 39, 0.6)";
          g.strokeStyle = broken ? "#f87171" : "rgba(252, 165, 165, 0.35)";
          g.lineWidth = 0.9;
          g.beginPath();
          g.roundRect(sx, sy, 15, 16, 2);
          g.fill();
          g.stroke();

          if (broken) {
            // Odłamek stłuczonego szkła
            g.fillStyle = "#fca5a5";
            g.beginPath();
            g.moveTo(sx + 3, sy + 12);
            g.lineTo(sx + 7, sy + 4);
            g.lineTo(sx + 12, sy + 11);
            g.closePath();
            g.fill();
          }

          cv.text(slotLabels[k], sx + 7.5, sy + 23, {
            size: 3.8,
            weight: 700,
            color: broken ? "#f87171" : "rgba(252, 165, 165, 0.65)",
            align: "center",
          });
        }
      });
    },
  });
}
