// Tapa: japońska łamigłówka logiczna.
// Twórz ciągły mur z czarnych pól bez kwadratów 2x2.
// Liczby we wskazówkach określają długości kolejnych spójnych grup czarnych pól wśród 8 sąsiadów.
{
  // --- Baza gotowych, zweryfikowanych plansz z dokładnie jednym rozwiązaniem ---
  const PUZZLES = {
    6: [
      { c: { 0: [3], 5: [1], 8: [8], 10: [5], 20: [7], 24: [3], 28: [1, 2], 35: [1] }, s: "011110110100011110110100011000001110" },
      { c: { 1: [1], 8: [1, 1], 11: [3], 15: [2, 3], 24: [1, 2], 28: [1, 5] }, s: "000000100110110011011101001001111111" },
      { c: { 1: [2], 6: [3], 10: [8], 21: [5], 24: [2], 29: [4] }, s: "000111011101110111010010010110000011" },
      { c: { 3: [2, 2], 11: [5], 13: [4], 21: [8], 31: [3], 34: [4], 35: [2] }, s: "001011011010001111001010111111000100" },
      { c: { 2: [4], 4: [5], 13: [6], 23: [3], 27: [7], 31: [1, 2], 33: [2, 2], 35: [2] }, s: "000101011111001010111110101010001010" },
      { c: { 2: [1, 1], 5: [3], 13: [5], 22: [1, 5], 30: [1], 32: [1, 2], 34: [4] }, s: "110010100111100101111100010111000100" },
    ],
    7: [
      { c: { 2: [4], 6: [2], 7: [1], 11: [2, 3], 14: [1, 2], 18: [7], 32: [8], 34: [5], 35: [1], 36: [3], 47: [5] }, s: "0001000011101100010101111111000101000111110110101" },
      { c: { 1: [4], 2: [4], 13: [5], 22: [2, 3], 25: [1, 2], 31: [5], 32: [1, 1], 35: [1], 43: [2], 44: [3], 47: [2] }, s: "1001111111101010101111011001001000101110010000001" },
      { c: { 6: [3], 9: [1, 3], 23: [8], 27: [2], 34: [3], 35: [1, 2], 42: [1], 45: [2], 48: [2] }, s: "1100010100011111111000101010111111000100100110010" },
      { c: { 8: [2, 2], 11: [2], 13: [3], 15: [7], 24: [1, 4], 36: [7], 38: [7], 48: [2] }, s: "0000000101001010100111110110101101010101111111100" },
      { c: { 4: [2], 6: [1], 7: [4], 9: [1, 3], 20: [3], 27: [4], 29: [7], 32: [8], 44: [5], 46: [4] }, s: "1100000010011001010101111110100101111111100101000" },
      { c: { 0: [1], 5: [3], 9: [4], 13: [2], 18: [8], 20: [4], 22: [7], 36: [4], 37: [4], 41: [4], 46: [4] }, s: "0000100100111011110101001111111101010011100000011" },
    ],
    8: [
      { c: { 2: [5], 12: [7], 14: [5], 17: [5], 23: [2], 25: [5], 29: [1, 4], 44: [6], 46: [2, 4], 56: [1], 58: [1, 1], 59: [3], 62: [1, 2] }, s: "0101111011110100100101101001101011110011010101010101110100001001" },
      { c: { 0: [2], 3: [3], 4: [1, 1], 7: [1], 17: [8], 23: [1, 2], 33: [1, 3], 36: [8], 39: [2, 2], 51: [2, 4], 55: [1, 2], 56: [3] }, s: "0010000011110110101001001111111100010100001111111110010001011110" },
      { c: { 5: [5], 9: [8], 19: [6], 22: [6], 24: [3], 32: [1, 1], 45: [7], 50: [3], 56: [1], 60: [2], 61: [2], 63: [1] }, s: "1110101010111111111010010100101100111110011010110100110100000000" },
      { c: { 1: [1, 1], 2: [2], 6: [3], 15: [3], 19: [8], 34: [7], 37: [8], 51: [6], 53: [5], 55: [3], 57: [1, 2], 62: [1] }, s: "0000010010111110101010111111111001001010111111111010101000100000" },
      { c: { 5: [2], 8: [1, 1], 14: [5], 28: [1, 1, 1], 31: [1, 3], 32: [3], 38: [1, 1, 2], 48: [5], 50: [7], 61: [4] }, s: "0111000000011101011101110010001001110001110101010101111111110010" },
      { c: { 8: [1, 1], 11: [4], 13: [1, 1], 17: [7], 29: [1, 2], 33: [7], 35: [6], 46: [8], 48: [1, 2], 56: [1], 60: [1, 1], 63: [3] }, s: "0011001101100001101000111111000100100111111111010010011101110010" },
    ],
  };

  // Zwraca uporządkowaną listę sąsiadów komórki zgodnie z ruchem wskazówek zegara
  function getNeighborInfo(r, c, R, C) {
    const deltas = [[-1, 0], [-1, 1], [0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1]];
    const valid = deltas.map(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      return (nr >= 0 && nr < R && nc >= 0 && nc < C) ? nr * C + nc : null;
    });
    if (r > 0 && r < R - 1 && c > 0 && c < C - 1) {
      return { cyclic: true, coords: valid };
    }
    let startIdx = 0;
    for (let i = 0; i < 8; i++) {
      if (valid[i] === null && valid[(i + 1) % 8] !== null) {
        startIdx = (i + 1) % 8;
        break;
      }
    }
    const coords = [];
    for (let k = 0; k < 8; k++) {
      const p = (startIdx + k) % 8;
      if (valid[p] !== null) coords.push(valid[p]);
    }
    return { cyclic: false, coords };
  }

  // Oblicza długości kolejnych ciągłych bloków jedynek
  function getRuns(vals, cyclic) {
    if (vals.every((v) => v === 0)) return [];
    if (vals.every((v) => v === 1)) return [vals.length];
    const list = cyclic ? (() => {
      const z = vals.indexOf(0);
      return [...vals.slice(z), ...vals.slice(0, z)];
    })() : vals;
    const runs = [];
    let cur = 0;
    for (const v of list) {
      if (v === 1) cur++;
      else {
        if (cur > 0) runs.push(cur);
        cur = 0;
      }
    }
    if (cur > 0) runs.push(cur);
    return runs.sort((a, b) => a - b);
  }

  // Weryfikacja poprawności rozwiązania
  function validateSolution(R, C, clues, board) {
    const N = R * C;
    for (let i = 0; i < N; i++) {
      if (clues[i] !== null && board[i] !== 0) return { ok: false, reason: "clue cell is black" };
    }
    for (let r = 0; r < R - 1; r++) {
      for (let c = 0; c < C - 1; c++) {
        if (board[r * C + c] === 1 && board[r * C + c + 1] === 1 &&
            board[(r + 1) * C + c] === 1 && board[(r + 1) * C + c + 1] === 1) {
          return { ok: false, reason: "2x2 violation" };
        }
      }
    }
    const blackIndices = [];
    for (let i = 0; i < N; i++) if (board[i] === 1) blackIndices.push(i);
    if (blackIndices.length === 0) return { ok: false, reason: "no black cells" };

    const visited = new Uint8Array(N);
    const q = [blackIndices[0]];
    visited[blackIndices[0]] = 1;
    let count = 0;
    while (q.length > 0) {
      const cur = q.shift();
      count++;
      const r = (cur / C) | 0, c = cur % C;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
          const next = nr * C + nc;
          if (board[next] === 1 && !visited[next]) {
            visited[next] = 1;
            q.push(next);
          }
        }
      }
    }
    if (count !== blackIndices.length) return { ok: false, reason: "disconnected black cells" };

    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const idx = r * C + c;
        const clue = clues[idx];
        if (clue === null) continue;
        const nInfo = getNeighborInfo(r, c, R, C);
        const vals = nInfo.coords.map((pos) => board[pos]);
        const runs = getRuns(vals, nInfo.cyclic);
        const expected = clue.slice().sort((a, b) => a - b);
        if (runs.length !== expected.length || !runs.every((v, i) => v === expected[i])) {
          return { ok: false, reason: `clue failed at (${r},${c})` };
        }
      }
    }
    return { ok: true };
  }

  if (typeof module !== "undefined") {
    module.exports = { getNeighborInfo, getRuns, validateSolution, PUZZLES };
  }

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "tapa",
    cat: "logiczne",
    name: "Tapa",
    author: "Gemini 3.8 Flash",
    desc: "Twórz ciągły mur z czarnych pól. Cyfry podają długości sąsiednich zaciemnionych grup.",
    color: "#2563eb",
    ink: "#ffffff",
    glyph: [
      "#####",
      "#...#",
      "#.###",
      "#...#",
      "#####",
    ],
    levels: [
      { key: "easy", name: "6 × 6", points: 10, n: 6 },
      { key: "medium", name: "7 × 7", points: 25, n: 7 },
      { key: "hard", name: "8 × 8", points: 50, n: 8 },
    ],
    rules: [
      "Zamaluj pola na czarno, by utworzyć ciągły mur z połączonych krawędziami pól.",
      "Żaden kwadrat 2×2 nie może być w całości czarny; pola ze wskazówkami zawsze pozostają białe.",
      "Liczby we wskazówce określają długości kolejnych spójnych bloków czarnych pól wśród 8 sąsiadów.",
      "Różne bloki wokół wskazówki muszą być oddzielone co najmniej jednym białym polem.",
      "Kliknij, by przełączyć: czarne (mur), kropka (pole bezpieczne) lub puste. Prawy przycisk stawia kropkę.",
      "Strzałki przesuwają kursor, spacja zamalowuje mur, klawisze X lub D stawiają kropkę.",
    ],
    achievements: [
      { id: "bez-pomylek", name: "Bez pomyłki", desc: "Rozwiąż dowolną planszę bez ani jednego kwadratu 2×2.", points: 10 },
      { id: "szybki-mur", name: "Szybki murarz", desc: "Ukończ planszę 7 × 7 w mniej niż 90 sekund.", points: 25 },
      { id: "bez-cofania", name: "Pewna ręka", desc: "Wygraj partię bez cofania ruchów i bez podpowiedzi.", points: 25 },
      { id: "mistrz-tapy", name: "Mistrz Tapy", desc: "Ukończ trudny poziom (8 × 8) bez żadnej pomyłki i bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const n = ctx.level.n;
      const puzzleList = PUZZLES[n];
      const puzzle = pick(puzzleList);
      const clues = new Array(n * n).fill(null);
      for (const [k, v] of Object.entries(puzzle.c)) clues[+k] = v;
      const sol = puzzle.s.split("").map(Number);
      const goalBlack = sol.reduce((acc, v) => acc + v, 0);

      // grid: 0 = puste, 1 = czarne (mur), 2 = kropka (bezpieczne)
      const s = {
        grid: new Int8Array(n * n).fill(0),
        cursor: 0,
        hintsUsed: 0,
        had2x2: false,
      };

      const cells = gridCells(board, n, n, "tapa-grid", {
        gap: 0.08,
        label: (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}`,
      });
      board.style.setProperty("--max", "64px");

      // Inicjalizacja pól ze wskazówkami
      for (let i = 0; i < n * n; i++) {
        const clue = clues[i];
        const b = cells[i];
        if (clue !== null) {
          b.disabled = true;
          b.tabIndex = -1;
          b.classList.add("is-clue");
          b.setAttribute("aria-label", `Wskazówka: ${clue.join(", ")}`);
          const box = el("span", `tapa-clues m-${clue.length}`);
          for (const num of clue) box.append(el("span", "tapa-n", String(num)));
          b.append(box);
        }
      }

      // Panel boczny
      const wallStat = statBlock(ctx, "Pola muru", { meter: true });
      const clueStat = statsBlock(ctx, "Wskazówki", ["Zgodne", "Do zrobienia"]);
      ctx.panel.append(
        panelBlock("",
          button("Podpowiedź", "btn-ghost wide", hint),
          button("Wyczyść planszę", "btn-ghost wide", clearBoard),
        ),
      );

      const save = ctx.undoable((snap) => {
        s.grid = Int8Array.from(snap);
        render();
      });

      function press(i, toDot = false) {
        if (ctx.done || clues[i] !== null) return;
        s.cursor = i;
        save(Array.from(s.grid));
        const cur = s.grid[i];
        if (toDot) {
          s.grid[i] = cur === 2 ? 0 : 2;
          s.grid[i] === 2 ? Sound.flag() : Sound.erase();
        } else {
          // Cykl: 0 -> 1 -> 2 -> 0
          const next = cur === 0 ? 1 : cur === 1 ? 2 : 0;
          s.grid[i] = next;
          if (next === 1) Sound.place(1);
          else if (next === 2) Sound.flag();
          else Sound.erase();
        }
        after();
      }

      function hint() {
        if (ctx.done) return;
        // Znajdź pole różniące się od rozwiązania
        const mistakes = [];
        for (let i = 0; i < n * n; i++) {
          if (clues[i] !== null) continue;
          const want = sol[i];
          const has = s.grid[i];
          if (want === 1 && has !== 1) mistakes.push(i);
          else if (want === 0 && has === 1) mistakes.push(i);
        }
        if (!mistakes.length) return;
        s.hintsUsed++;
        save(Array.from(s.grid));
        const pickIdx = pick(mistakes);
        s.grid[pickIdx] = sol[pickIdx] === 1 ? 1 : 2;
        sweep([cells[pickIdx]]);
        ctx.toast("Odkryto pole muru");
        after();
      }

      function clearBoard() {
        if (ctx.done) return;
        save(Array.from(s.grid));
        for (let i = 0; i < n * n; i++) {
          if (clues[i] === null) s.grid[i] = 0;
        }
        Sound.erase();
        render();
      }

      function after() {
        if (!render()) return;
        if (!s.had2x2) ctx.achieve("bez-pomylek");
        if (ctx.level.key === "medium" && ctx.time < 90) ctx.achieve("szybki-mur");
        if (ctx.undos === 0 && !s.hintsUsed) ctx.achieve("bez-cofania");
        if (ctx.level.key === "hard" && !s.had2x2 && !s.hintsUsed) ctx.achieve("mistrz-tapy");
        ctx.win(s.hintsUsed ? `Podpowiedzi: ${s.hintsUsed}.` : "Bez podpowiedzi.");
      }

      // Obsługa kliknięć planszy
      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.i != null) {
          const idx = +b.dataset.i;
          if (clues[idx] === null) press(idx);
        }
      });

      board.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.i != null) {
          const idx = +b.dataset.i;
          if (clues[idx] === null) press(idx, true);
        }
      });

      cellKeys(ctx, {
        cols: n,
        rows: n,
        get: () => s.cursor,
        set: (i) => { s.cursor = i; render(); },
        keys: {
          " ": () => press(s.cursor),
          Enter: () => press(s.cursor),
          x: () => press(s.cursor, true),
          X: () => press(s.cursor, true),
          d: () => press(s.cursor, true),
          D: () => press(s.cursor, true),
          c: () => {
            if (clues[s.cursor] === null && s.grid[s.cursor] !== 0) {
              save(Array.from(s.grid));
              s.grid[s.cursor] = 0;
              Sound.erase();
              render();
            }
          },
        },
      });

      // Sprawdza stan i aktualizuje widok
      function render() {
        // Wykrywanie kwadratów 2x2 z czarnych pól
        const bad2x2 = new Set();
        for (let r = 0; r < n - 1; r++) {
          for (let c = 0; c < n - 1; c++) {
            const sq = [r * n + c, r * n + c + 1, (r + 1) * n + c, (r + 1) * n + c + 1];
            if (sq.every((idx) => s.grid[idx] === 1)) {
              sq.forEach((idx) => bad2x2.add(idx));
            }
          }
        }
        if (bad2x2.size > 0 && !s.had2x2) {
          s.had2x2 = true;
          Sound.error();
        }

        // Sprawdzanie wskazówek
        let satisfiedClues = 0;
        let totalClues = 0;
        for (let i = 0; i < n * n; i++) {
          const clue = clues[i];
          if (clue === null) continue;
          totalClues++;
          const r = (i / n) | 0, c = i % n;
          const nInfo = getNeighborInfo(r, c, n, n);
          const vals = nInfo.coords.map((pos) => (s.grid[pos] === 1 ? 1 : 0));
          const runs = getRuns(vals, nInfo.cyclic);
          const exp = clue.slice().sort((a, b) => a - b);
          const isMatch = runs.length === exp.length && runs.every((v, k) => v === exp[k]);

          const b = cells[i];
          b.classList.toggle("is-ok", isMatch);
          if (isMatch) satisfiedClues++;
        }

        // Aktualizacja klas komórek
        let blackCount = 0;
        for (let i = 0; i < n * n; i++) {
          const b = cells[i];
          const val = s.grid[i];
          const isBlack = val === 1;
          const isDot = val === 2;
          if (isBlack) blackCount++;

          b.classList.toggle("is-on", isBlack);
          b.classList.toggle("is-dot", isDot);
          b.classList.toggle("is-bad", bad2x2.has(i));
          b.classList.toggle("cursor", i === s.cursor);

          if (clues[i] === null) {
            const r = (i / n) | 0, c = i % n;
            b.setAttribute(
              "aria-label",
              `Wiersz ${r + 1}, kolumna ${c + 1}, ${isBlack ? "mur" : isDot ? "bezpieczne" : "puste"}`,
            );
          }
        }

        // Aktualizacja panelu i paska postępu
        wallStat.set(`${blackCount} z ${goalBlack}`, Math.min(1, blackCount / goalBlack));
        clueStat.set("Zgodne", satisfiedClues);
        clueStat.set("Do zrobienia", totalClues - satisfiedClues);

        // Sprawdzenie wygranej:
        // Wszystkie wskazówki zgodne, brak 2x2, liczba czarnych pól zgodna i tworzą 1 spójną całość
        let isSolved = false;
        if (bad2x2.size === 0 && satisfiedClues === totalClues && blackCount === goalBlack) {
          const boardArray = Array.from(s.grid).map((v) => (v === 1 ? 1 : 0));
          const val = validateSolution(n, n, clues, boardArray);
          isSolved = val.ok;
        }

        ctx.progress(isSolved ? 1 : Math.min(blackCount, goalBlack) / goalBlack * 0.95);
        return isSolved;
      }

      render();
    },
  });
}
