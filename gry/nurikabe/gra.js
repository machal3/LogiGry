// Nurikabe: japońska łamigłówka logiczna.
// Wyznacz morze i wyspy: każda wyspa ma rozmiar podany liczbą, wyspy nie stykają się bokami,
// woda tworzy jeden spójny obszar bez pełnych kwadratów 2x2.
{
  // --- Baza gotowych, zweryfikowanych plansz z dokładnie jednym rozwiązaniem ---
  const PUZZLES = {
    5: [
      { c: [0,0,2,0,1,0,0,0,0,0,0,0,0,3,0,3,0,0,0,1,0,0,0,0,0], s: [1,2,2,1,2,1,1,1,1,1,2,1,2,2,1,2,1,2,1,2,2,1,1,1,1] },
      { c: [0,0,3,0,0,0,0,0,0,0,3,0,1,0,3,0,0,0,0,0,0,0,0,0,2], s: [2,2,2,1,2,1,1,1,1,2,2,1,2,1,2,2,2,1,1,1,1,1,1,2,2] },
      { c: [1,0,0,0,1,0,0,0,0,0,0,3,0,1,0,0,0,0,0,0,0,0,3,0,0], s: [2,1,1,1,2,1,2,2,1,1,1,2,1,2,1,1,1,1,1,1,1,2,2,2,1] },
      { c: [0,3,0,0,0,0,0,0,0,0,0,2,0,0,1,0,0,0,1,0,0,1,0,0,0], s: [1,2,2,2,1,1,1,1,1,1,1,2,2,1,2,1,1,1,2,1,1,2,1,1,1] },
      { c: [0,0,0,0,0,2,0,0,0,1,0,3,0,0,0,0,0,0,1,0,0,2,0,0,0], s: [2,1,1,1,1,2,1,2,1,2,1,2,2,1,1,1,1,1,2,1,2,2,1,1,1] },
      { c: [0,0,0,0,1,0,2,0,0,0,3,0,0,0,0,0,0,0,0,2,0,0,2,0,0], s: [1,1,1,1,2,1,2,2,1,1,2,1,1,1,2,2,1,2,1,2,2,1,2,1,1] },
      { c: [0,0,0,0,0,0,0,0,0,2,0,3,0,0,0,0,0,1,0,0,1,0,0,1,0], s: [1,1,1,1,1,1,2,2,1,2,1,2,1,1,2,1,1,2,1,1,2,1,1,2,1] },
      { c: [0,0,0,0,0,0,3,0,0,0,0,0,1,0,2,0,0,0,0,0,2,0,3,0,0], s: [1,2,2,1,1,1,2,1,1,2,1,1,2,1,2,2,1,1,1,1,2,1,2,2,2] },
    ],
    6: [
      { c: [0,0,0,4,0,0,1,0,1,0,0,0,0,0,0,0,0,0,2,0,1,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0], s: [1,1,1,2,2,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1,1,2,1,1,2,2,1,1,1,2,2,1,1] },
      { c: [0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,1,0,2,0,0,0,0,1,0,4,0,4,0,0,0,0,0,0,0,0,0], s: [2,2,2,2,1,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,1,1,2,1,2,1,2,1,1,1,1,1,2,2,2,1] },
      { c: [0,0,0,0,0,4,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,0,3,0,0,2,0,0,0,0,0,0,0,0,1,0], s: [2,2,2,1,2,2,1,1,2,1,2,2,2,1,1,1,1,1,1,2,1,2,2,1,1,2,1,2,1,1,1,1,1,1,2,1] },
      { c: [0,0,2,0,0,0,2,0,0,0,4,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,4,0,0,2,0,0,0], s: [1,1,2,2,1,1,2,1,1,1,2,1,2,1,2,2,2,1,1,1,1,1,1,1,2,1,2,1,2,2,1,1,2,1,2,2] },
      { c: [0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,2,0,0,0,1,0,0,4,0,1,0,0,0,0,0,0,0,1,0], s: [1,1,1,1,1,1,1,2,2,2,2,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,2,1,1,1,2,1,1,1,2,1] },
      { c: [0,0,0,0,0,0,4,0,0,0,1,0,0,0,0,0,0,2,0,0,0,0,0,0,0,1,0,3,0,0,0,0,0,0,2,0], s: [1,1,1,1,1,1,2,2,2,1,2,1,2,1,1,1,1,2,1,1,2,2,1,2,1,2,1,2,1,1,1,1,1,1,2,2] },
      { c: [0,0,0,0,0,1,0,0,0,0,0,0,0,2,0,3,0,0,0,0,0,0,0,0,0,0,0,0,4,0,2,0,3,0,0,0], s: [1,1,1,1,1,2,1,2,1,2,1,1,1,2,1,2,2,1,1,1,2,1,1,1,2,1,2,1,2,2,2,1,2,1,2,2] },
      { c: [1,0,0,0,0,0,0,0,2,0,1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,3,0,0,0,0,0,0,0,0,0,2], s: [2,1,1,1,1,1,1,2,2,1,2,1,1,1,1,1,1,2,1,2,1,2,2,2,1,2,2,1,1,1,1,1,1,1,2,2] },
    ],
    7: [
      { c: [2,0,0,2,0,0,0,0,0,0,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,0,0,0,0,2,0,0,3,0,0,0,0], s: [2,1,2,2,1,2,2,2,1,1,1,1,2,2,1,1,2,2,1,1,1,1,2,1,1,2,2,1,1,2,2,1,2,1,1,1,1,1,1,1,2,2,1,2,2,2,1,1,1] },
      { c: [0,0,3,0,1,0,0,0,0,0,0,0,0,0,1,0,2,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,4,0,0,0,0,4,0,0,0,0], s: [2,2,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,2,2,1,1,1,2,1,1,1,1,1,2,1,1,2,1,2,1,2,2,1,2,1,1,1,1,2,1,2,2,1] },
      { c: [4,0,0,0,0,0,0,0,0,0,0,3,0,2,0,0,0,0,0,0,0,1,0,2,0,0,0,0,0,2,0,0,0,0,1,0,0,0,0,3,0,0,0,0,0,0,0,0,0], s: [2,2,2,1,1,1,1,2,1,1,1,2,1,2,1,1,2,1,2,1,2,2,1,2,1,2,1,1,1,2,1,1,1,1,2,1,2,1,2,2,2,1,1,1,1,1,1,1,1] },
      { c: [0,0,0,0,0,0,0,0,0,0,2,0,1,0,3,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,2,0,3,0], s: [1,1,1,1,1,1,1,2,1,2,2,1,2,1,2,1,1,1,1,1,2,2,1,2,2,2,1,2,1,1,1,1,2,1,1,1,2,1,2,1,1,2,1,1,1,2,1,2,2] },
      { c: [0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,3,0,0,3,0,0,2,0,0,0,0,0,0,0,0,2,0,0,0,4,0,0,0,2,0,0,0,0,0,0,0,0,0], s: [1,1,1,1,1,1,2,1,2,1,2,1,2,1,1,1,2,2,1,2,1,2,2,1,1,1,2,1,1,1,2,2,1,1,1,2,1,1,1,2,2,1,2,2,2,1,1,1,1] },
      { c: [0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,3,0,0,0,0,0,0,0,1,0,0,4,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,3,0], s: [1,2,2,2,1,1,1,1,1,1,1,1,2,1,2,2,2,1,2,2,1,2,1,1,1,1,1,2,1,1,2,2,2,1,1,2,1,2,1,1,2,1,1,1,1,1,2,2,1] },
      { c: [0,0,2,0,0,0,4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,0,3,0,4,0,0,0,0,0,0,0,0,2], s: [1,2,2,1,2,2,2,1,1,1,1,1,1,2,2,1,2,2,2,1,1,1,1,2,1,1,1,2,1,2,1,1,2,1,1,1,2,2,1,2,1,2,1,1,1,2,2,1,2] },
      { c: [0,2,0,2,0,0,0,0,0,0,0,0,0,3,0,0,1,0,0,0,0,0,3,0,4,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0], s: [1,2,1,2,2,1,2,1,2,1,1,1,1,2,1,1,2,1,2,1,2,1,2,1,2,2,1,1,1,2,1,2,1,2,1,1,2,1,1,1,2,1,1,1,1,2,1,1,1] },
    ],
  };

  const ortho = (cols, rows, i) => {
    const r = (i / cols) | 0, c = i % cols, out = [];
    if (r > 0) out.push(i - cols);
    if (r < rows - 1) out.push(i + cols);
    if (c > 0) out.push(i - 1);
    if (c < cols - 1) out.push(i + 1);
    return out;
  };

  // Sprawdzanie stanu planszy
  // state: 0 = puste, 1 = morze (woda), 2 = ziemia (kropka lub liczba)
  function validate(cols, rows, clues, state) {
    const N = cols * rows;
    const pools2x2 = [];
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const idxs = [r * cols + c, r * cols + c + 1, (r + 1) * cols + c, (r + 1) * cols + c + 1];
        if (idxs.every((i) => state[i] === 1)) {
          idxs.forEach((i) => { if (!pools2x2.includes(i)) pools2x2.push(i); });
        }
      }
    }

    const landVis = new Uint8Array(N);
    const islands = [];
    const islandErrors = new Set();
    let completeCount = 0;

    for (let i = 0; i < N; i++) {
      if (landVis[i] || state[i] !== 2) continue;
      const comp = [];
      const q = [i];
      landVis[i] = 1;
      let clueCount = 0;
      let clueVal = 0;
      let clueCell = -1;

      while (q.length > 0) {
        const cur = q.shift();
        comp.push(cur);
        if (clues[cur] > 0) {
          clueCount++;
          clueVal = clues[cur];
          clueCell = cur;
        }
        for (const nxt of ortho(cols, rows, cur)) {
          if (state[nxt] === 2 && !landVis[nxt]) {
            landVis[nxt] = 1;
            q.push(nxt);
          }
        }
      }

      islands.push({ comp, clueCount, clueVal, clueCell });
      if (clueCount === 0) {
        comp.forEach((c) => islandErrors.add(c));
      } else if (clueCount > 1) {
        comp.forEach((c) => islandErrors.add(c));
      } else if (comp.length > clueVal) {
        comp.forEach((c) => islandErrors.add(c));
      } else if (comp.length === clueVal) {
        completeCount++;
      }
    }

    // Spójność wody
    const waterCells = [];
    for (let i = 0; i < N; i++) if (state[i] === 1) waterCells.push(i);

    let waterConnected = true;
    if (waterCells.length > 0) {
      const wVis = new Uint8Array(N);
      const q = [waterCells[0]];
      wVis[waterCells[0]] = 1;
      let count = 0;
      while (q.length > 0) {
        const cur = q.shift();
        count++;
        for (const nxt of ortho(cols, rows, cur)) {
          if (state[nxt] === 1 && !wVis[nxt]) {
            wVis[nxt] = 1;
            q.push(nxt);
          }
        }
      }
      waterConnected = count === waterCells.length;
    }

    const emptyCount = state.filter((v) => !v).length;
    const allFilled = emptyCount === 0;

    const totalClues = clues.filter((v) => v > 0).length;
    const isSolved = allFilled &&
      pools2x2.length === 0 &&
      waterConnected &&
      islandErrors.size === 0 &&
      completeCount === totalClues;

    return {
      isSolved,
      emptyCount,
      pools2x2,
      islandErrors,
      completeCount,
      totalClues,
      waterConnected,
      islands,
    };
  }

  if (typeof module !== "undefined") {
    module.exports = { PUZZLES, validate, ortho };
  }

  // --- Rejestracja gry w platformie Logigra ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "nurikabe",
    cat: "logiczne",
    name: "Nurikabe",
    author: "Gemini 3.8 Flash",
    desc: "Otocz ponumerowane wyspy morzem. Woda tworzy spójną całość bez kwadratów 2x2, a każda wyspa ma swój rozmiar.",
    color: "#0369a1",
    ink: "#ffffff",
    glyph: [
      "#####",
      "#...#",
      "#.#.#",
      "#...#",
      "#####",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, cols: 5, rows: 5 },
      { key: "medium", name: "Średni", points: 25, cols: 6, rows: 6 },
      { key: "hard", name: "Trudny", points: 50, cols: 7, rows: 7 },
    ],
    rules: [
      "Zamaluj morze wokół wysp tak, aby każde ponumerowane pole stało się częścią wyspy o podanym rozmiarze.",
      "Dwie różne wyspy nie mogą stykać się bokami (mogą stykać się rogami).",
      "Wszystkie pola morza muszą tworzyć jeden wspólny, połączony bokami obszar.",
      "Morze nie może nigdzie tworzyć pełnego kwadratu 2×2 (tzw. jeziora).",
      "Kliknij pole, aby zmienić je w morze, kropkę wyspy lub puste. Możesz też wybrać narzędzie z panelu.",
    ],
    achievements: [
      { id: "bez-bledu", name: "Czysta woda", desc: "Wygraj partię bez ani jednego cofnięcia ruchu.", points: 10 },
      { id: "szybki-nawigator", name: "Szybki nawigator", desc: "Ukończ średni lub trudny poziom w mniej niż 60 sekund.", points: 25 },
      { id: "archipelag", name: "Wielki archipelag", desc: "Rozwiąż trudny poziom 7×7.", points: 25 },
      { id: "mistrz-nurikabe", name: "Władca mórz", desc: "Ukończ trudny poziom bez cofania w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { cols, rows, key } = ctx.level;
      const list = PUZZLES[cols] || PUZZLES[5];
      const puzzle = pick(list);
      const clues = puzzle.c.slice();
      const solution = puzzle.s.slice();
      const N = cols * rows;

      // Stan gracza: 0 = puste, 1 = morze (woda), 2 = ziemia (kropka)
      // Pola z liczbą (clues[i] > 0) to zawsze ziemia (2)
      const mark = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        if (clues[i] > 0) mark[i] = 2;
      }

      const s = {
        mark,
        cursor: 0,
        tool: 0, // 0 = cykl, 1 = morze, 2 = kropka
        hinted: false,
      };

      // board bez sceny felt - czysta łamigłówka logiczna
      const btns = gridCells(board, cols, rows, "nk-grid", {
        label: (i) => clues[i] > 0 ? `Wyspa ${clues[i]}` : "Pole morza lub wyspy",
      });

      const remainEl = statBlock(ctx, "Puste pola", { meter: true });
      const statsEl = statsBlock(ctx, "Stan wód", ["Wyspy", "Błędy 2×2"]);

      const toolSeg = segmented("Narzędzie", ["Cykl", "Morze 🌊", "Ziemia ·"], (k) => {
        s.tool = k;
        toolSeg.set(k);
        Sound.tap();
      });
      toolSeg.set(0);

      const hintBtn = button("Podpowiedź", "btn-ghost wide", getHint);
      const clearWaterBtn = button("Wyczyść morze", "btn-ghost wide danger", clearSea);
      ctx.panel.append(
        panelBlock("Tryb zaznaczania", toolSeg.el),
        panelBlock("", hintBtn, clearWaterBtn)
      );

      const save = ctx.undoable((snap) => {
        s.mark.set(snap.mark);
        s.tool = snap.tool;
        toolSeg.set(s.tool);
        render();
      });

      let painting = -1; // stan nanoszony podczas przeciągania

      function applyCell(i, targetState) {
        if (clues[i] > 0 || s.mark[i] === targetState) return false;
        s.mark[i] = targetState;
        return true;
      }

      function handleCellAction(i, isRightClick = false) {
        if (ctx.done || clues[i] > 0) return;
        s.cursor = i;
        save({ mark: s.mark.slice(), tool: s.tool });

        let next;
        if (isRightClick) {
          next = s.mark[i] === 2 ? 0 : 2;
        } else if (s.tool === 1) {
          next = s.mark[i] === 1 ? 0 : 1;
        } else if (s.tool === 2) {
          next = s.mark[i] === 2 ? 0 : 2;
        } else {
          // Cykl: 0 -> 1 -> 2 -> 0
          next = s.mark[i] === 0 ? 1 : (s.mark[i] === 1 ? 2 : 0);
        }

        applyCell(i, next);
        painting = next;

        if (next === 1) Sound.place(2);
        else if (next === 2) Sound.place(4);
        else Sound.erase();

        render();
        checkWin();
      }

      function clearSea() {
        if (ctx.done) return;
        save({ mark: s.mark.slice(), tool: s.tool });
        for (let i = 0; i < N; i++) {
          if (clues[i] === 0) s.mark[i] = 0;
        }
        Sound.erase();
        render();
      }

      function getHint() {
        if (ctx.done) return;
        // Znajdź pole, które różni się od rozwiązania
        const mistakes = [];
        const empties = [];
        for (let i = 0; i < N; i++) {
          if (clues[i] > 0) continue;
          if (s.mark[i] !== 0 && s.mark[i] !== solution[i]) {
            mistakes.push(i);
          } else if (s.mark[i] === 0) {
            empties.push(i);
          }
        }

        save({ mark: s.mark.slice(), tool: s.tool });
        s.hinted = true;

        if (mistakes.length > 0) {
          // Popraw pierwszą pomyłkę
          const fixIdx = mistakes[0];
          s.mark[fixIdx] = solution[fixIdx];
          sweep([btns[fixIdx]]);
          Sound.place(3);
          ctx.toast("Poprawiono błędne pole.");
        } else if (empties.length > 0) {
          // Uzupełnij jedno puste pole
          const hintIdx = empties[0];
          s.mark[hintIdx] = solution[hintIdx];
          sweep([btns[hintIdx]]);
          Sound.place(3);
          ctx.toast("Odkryto prawidłowe pole.");
        } else {
          ctx.toast("Wszystkie pola są już uzupełnione!");
        }

        render();
        checkWin();
      }

      function checkWin() {
        if (ctx.done) return;
        const res = validate(cols, rows, clues, Array.from(s.mark));
        if (res.isSolved) {
          if (ctx.undos === 0) {
            ctx.achieve("bez-bledu");
          }
          if (key !== "easy" && ctx.time < 60) {
            ctx.achieve("szybki-nawigator");
          }
          if (key === "hard") {
            ctx.achieve("archipelag");
          }
          if (key === "hard" && ctx.undos === 0 && ctx.time < 90) {
            ctx.achieve("mistrz-nurikabe");
          }
          ctx.win("Wszystkie wyspy i morze zostały poprawnie wyznaczone.");
        }
      }

      // Obsługa myszy i dotyku
      board.addEventListener("contextmenu", (e) => e.preventDefault());

      board.addEventListener("pointerdown", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b) return;
        const i = +b.dataset.i;
        handleCellAction(i, e.button === 2);
      });

      ctx.on(document, "pointermove", (e) => {
        if (painting < 0 || ctx.done) return;
        const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-gra='nurikabe'] .gb-cell");
        if (b && b.dataset.i != null) {
          const idx = +b.dataset.i;
          if (applyCell(idx, painting)) {
            render();
            checkWin();
          }
        }
      });

      ctx.on(document, "pointerup", () => {
        painting = -1;
      });

      // Klawiatura: strzałki, spacja, Z, X, C
      cellKeys(ctx, {
        cols,
        rows,
        get: () => s.cursor,
        set: (i) => {
          s.cursor = i;
          render();
        },
        keys: {
          " ": () => handleCellAction(s.cursor, false),
          z: () => {
            if (clues[s.cursor] === 0 && !ctx.done) {
              save({ mark: s.mark.slice(), tool: s.tool });
              s.mark[s.cursor] = s.mark[s.cursor] === 1 ? 0 : 1;
              Sound.place(2);
              render();
              checkWin();
            }
          },
          x: () => {
            if (clues[s.cursor] === 0 && !ctx.done) {
              save({ mark: s.mark.slice(), tool: s.tool });
              s.mark[s.cursor] = s.mark[s.cursor] === 2 ? 0 : 2;
              Sound.place(4);
              render();
              checkWin();
            }
          },
          c: () => {
            if (clues[s.cursor] === 0 && !ctx.done) {
              save({ mark: s.mark.slice(), tool: s.tool });
              s.mark[s.cursor] = 0;
              Sound.erase();
              render();
            }
          },
        },
      });

      function render() {
        const res = validate(cols, rows, clues, Array.from(s.mark));
        const badPoolsSet = new Set(res.pools2x2);

        btns.forEach((b, i) => {
          const isClue = clues[i] > 0;
          b.classList.toggle("is-clue", isClue);
          b.classList.toggle("cursor", i === s.cursor);

          if (isClue) {
            b.textContent = String(clues[i]);
            // Stan wyspy z tą liczbą
            const island = res.islands.find((isl) => isl.clueCell === i);
            const isBad = island ? (island.comp.length > island.clueVal || island.clueCount > 1) : false;
            const isOk = island ? (island.comp.length === island.clueVal && island.clueCount === 1) : false;
            b.classList.toggle("is-bad", isBad);
            b.classList.toggle("is-ok", isOk);
          } else {
            b.textContent = "";
            const isWater = s.mark[i] === 1;
            const isDot = s.mark[i] === 2;
            b.classList.toggle("is-on", isWater);
            b.classList.toggle("is-water", isWater);
            b.classList.toggle("is-dot", isDot);
            b.classList.toggle("is-bad-pool", badPoolsSet.has(i));
          }
        });

        remainEl.set(res.emptyCount, 1 - res.emptyCount / N, `${res.emptyCount} z ${N}`);
        statsEl.set("Wyspy", `${res.completeCount} / ${res.totalClues}`);
        statsEl.set("Błędy 2×2", String(res.pools2x2.length > 0 ? (res.pools2x2.length / 4) | 0 || 1 : 0));
        ctx.progress(1 - res.emptyCount / N);
      }

      render();
    },
  });
}
