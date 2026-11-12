// Yin-Yang: wypełnij planszę białymi (1) i czarnymi (2) kamieniami.
// Oba kolory muszą być spójne (ortogonalnie) i nie mogą tworzyć kwadratów 2x2.
{
  function nbrs(i, n) {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  // Sprawdza, czy wszystkie pola o wartości === color tworzą jedną spójną składową.
  // Gdy allowEmpty = true, pola 0 (puste) mogą pośredniczyć w połączeniu.
  function isConnected(grid, n, color, allowEmpty = false) {
    let start = -1, total = 0;
    for (let i = 0; i < n * n; i++) {
      if (grid[i] === color) {
        if (start < 0) start = i;
        total++;
      }
    }
    if (total <= 1) return true;
    const seen = new Uint8Array(n * n);
    const stack = [start];
    seen[start] = 1;
    let found = 1;
    while (stack.length) {
      const cur = stack.pop();
      for (const j of nbrs(cur, n)) {
        if (seen[j]) continue;
        const v = grid[j];
        if (v === color || (allowEmpty && v === 0)) {
          seen[j] = 1;
          if (v === color) found++;
          stack.push(j);
        }
      }
    }
    return found === total;
  }

  // Sprawdza wszystkie 4 kwadraty 2x2 zawierające pole i.
  // Zwraca true, jeśli w żadnym nie ma 2x2 jednorodnego ani 2x2 szachownicy.
  function valid2x2At(grid, n, i, forbidChecker = true) {
    const r0 = (i / n) | 0, c0 = i % n;
    for (let dr = -1; dr <= 0; dr++) {
      for (let dc = -1; dc <= 0; dc++) {
        const r = r0 + dr, c = c0 + dc;
        if (r < 0 || c < 0 || r >= n - 1 || c >= n - 1) continue;
        const a = grid[r * n + c];
        const b = grid[r * n + c + 1];
        const d = grid[(r + 1) * n + c];
        const e = grid[(r + 1) * n + c + 1];
        if (!a || !b || !d || !e) continue;
        if (a === b && b === d && d === e) return false;
        if (forbidChecker && a === e && b === d && a !== b) return false;
      }
    }
    return true;
  }

  // Znajduje pola tworzące nielegalny kwadrat 2x2 tego samego koloru.
  function findBad2x2(grid, n) {
    const bad = new Set();
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const idx = [r * n + c, r * n + c + 1, (r + 1) * n + c, (r + 1) * n + c + 1];
        const v = grid[idx[0]];
        if (v && grid[idx[1]] === v && grid[idx[2]] === v && grid[idx[3]] === v) {
          idx.forEach((k) => bad.add(k));
        }
      }
    }
    return bad;
  }

  // Pełne sprawdzenie stanu gry gracza.
  function checkBoard(grid, n) {
    const bad = findBad2x2(grid, n);
    let filled = 0;
    for (let i = 0; i < n * n; i++) if (grid[i]) filled++;
    const connW = isConnected(grid, n, 1, false);
    const connB = isConnected(grid, n, 2, false);
    const full = filled === n * n;
    const solved = full && bad.size === 0 && connW && connB;
    return { bad, filled, full, connW, connB, solved };
  }

  // Solver z propagacją więzów: liczy rozwiązania do limit (domyślnie 2).
  function countSolutions(puzzle, n, limit = 2, maxNodes = 8000) {
    const s = new Int8Array(puzzle);
    let sols = 0;
    let nodes = 0;

    // Propaguje wymuszenia w kwadratach 2x2; zwraca false przy sprzeczności.
    function propagate(trail) {
      let changed = true;
      while (changed) {
        changed = false;
        for (let r = 0; r < n - 1; r++) {
          for (let c = 0; c < n - 1; c++) {
            const idx = [r * n + c, r * n + c + 1, (r + 1) * n + c, (r + 1) * n + c + 1];
            const vals = [s[idx[0]], s[idx[1]], s[idx[2]], s[idx[3]]];
            let zeros = 0, zPos = -1, c1 = 0, c2 = 0;
            for (let k = 0; k < 4; k++) {
              if (vals[k] === 0) { zeros++; zPos = k; }
              else if (vals[k] === 1) c1++;
              else c2++;
            }
            if (zeros === 0) {
              if (c1 === 4 || c2 === 4) return false;
              if (vals[0] === vals[3] && vals[1] === vals[2] && vals[0] !== vals[1]) return false;
            } else if (zeros === 1) {
              let force = 0;
              if (c1 === 3) force = 2;
              else if (c2 === 3) force = 1;
              else if (c1 === 2 && c2 === 1) {
                // szachownica: przekątna [0,3] vs [1,2]
                const diag = (zPos === 0 || zPos === 3) ? vals[1] : vals[0];
                const sameDiag = vals[zPos === 0 ? 3 : zPos === 3 ? 0 : zPos === 1 ? 2 : 1];
                if (sameDiag !== diag) force = sameDiag; // inaczej powstałaby szachownica
              } else if (c2 === 2 && c1 === 1) {
                const diag = (zPos === 0 || zPos === 3) ? vals[1] : vals[0];
                const sameDiag = vals[zPos === 0 ? 3 : zPos === 3 ? 0 : zPos === 1 ? 2 : 1];
                if (sameDiag !== diag) force = sameDiag;
              }
              if (force) {
                const cell = idx[zPos];
                s[cell] = force;
                trail.push(cell);
                changed = true;
              }
            }
          }
        }
      }
      return true;
    }

    function pickNext() {
      let best = -1, bestScore = -1;
      for (let i = 0; i < n * n; i++) {
        if (s[i] !== 0) continue;
        let score = 0;
        for (const j of nbrs(i, n)) if (s[j] !== 0) score++;
        if (score > bestScore) { bestScore = score; best = i; if (score === 4) break; }
      }
      return best;
    }

    function dfs() {
      if (sols >= limit || nodes >= maxNodes) return;
      nodes++;
      const trail = [];
      if (!propagate(trail) || !isConnected(s, n, 1, true) || !isConnected(s, n, 2, true)) {
        for (const k of trail) s[k] = 0;
        return;
      }
      const next = pickNext();
      if (next < 0) {
        if (isConnected(s, n, 1, false) && isConnected(s, n, 2, false)) sols++;
        for (const k of trail) s[k] = 0;
        return;
      }
      for (const v of [1, 2]) {
        s[next] = v;
        if (valid2x2At(s, n, next, true)) dfs();
        s[next] = 0;
        if (sols >= limit || nodes >= maxNodes) break;
      }
      for (const k of trail) s[k] = 0;
    }

    dfs();
    return nodes >= maxNodes && sols < limit ? 2 : sols;
  }

  // Generuje pełną, poprawną planszę Yin-Yang metodą mutacji meandra.
  function generateFull(n) {
    const grid = new Int8Array(n * n);
    // Startowy wzór grzebieniowy: zawsze spójny, bez 2x2 jednorodnych i bez 2x2 szachownicy
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (r === 0) grid[r * n + c] = 1;
        else if (r === n - 1) grid[r * n + c] = 2;
        else if (r % 2 === 0) grid[r * n + c] = c === n - 1 ? 2 : 1;
        else grid[r * n + c] = c === 0 ? 1 : 2;
      }
    }

    const steps = n * n * 24;
    for (let step = 0; step < steps; step++) {
      const i = rnd(n * n);
      const old = grid[i];
      const opp = 3 - old;
      // Mutujemy tylko pola graniczne, żeby nie robić oderwanych wysp
      if (!nbrs(i, n).some((j) => grid[j] === opp)) continue;
      grid[i] = opp;
      if (valid2x2At(grid, n, i, true) && isConnected(grid, n, 1, false) && isConnected(grid, n, 2, false)) {
        continue;
      }
      grid[i] = old;
    }

    // Losowa symetria (obrót / odbicie / zamiana kolorów)
    const flipH = rnd(2), flipV = rnd(2), swap = rnd(2), rot = rnd(2);
    const out = new Array(n * n);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const rr = flipV ? n - 1 - r : r;
        const cc = flipH ? n - 1 - c : c;
        const src = rot ? cc * n + rr : rr * n + cc;
        out[r * n + c] = swap ? 3 - grid[src] : grid[src];
      }
    }
    return out;
  }

  // Tworzy zagadkę z unikalnym rozwiązaniem, usuwając pola aż do docelowej liczby wskazówek.
  function generate(n, targetClues) {
    const solution = generateFull(n);
    const puzzle = solution.slice();
    const order = shuffle([...Array(n * n).keys()]);
    let left = n * n;

    for (const i of order) {
      if (left <= targetClues) break;
      const prev = puzzle[i];
      puzzle[i] = 0;
      if (countSolutions(puzzle, n, 2) === 1) {
        left--;
      } else {
        puzzle[i] = prev;
      }
    }
    return { n, puzzle, solution };
  }

  if (typeof module !== "undefined") {
    module.exports = { generate, generateFull, checkBoard, countSolutions, isConnected };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "yinyang",
    cat: "logiczne",
    name: "Yin-Yang",
    author: "Gemini 4 Hydrogen",
    desc: "Wypełnij planszę białymi i czarnymi kamieniami. Oba kolory muszą być spójne i bez kwadratów 2×2.",
    color: "#364fc7",
    ink: "#ffffff",
    glyph: ["..###", ".#..#", "#.#.#", "#..#.", "###.."],
    levels: [
      { key: "easy", name: "6 × 6", points: 10, n: 6, clues: 14, checks: 5 },
      { key: "medium", name: "8 × 8", points: 25, n: 8, clues: 22, checks: 3 },
      { key: "hard", name: "10 × 10", points: 50, n: 10, clues: 34, checks: 2 },
    ],
    rules: [
      "Wypełnij puste pola białymi lub czarnymi kamieniami (prawy przycisk stawia czarny).",
      "Wszystkie białe kamienie muszą tworzyć jeden spójny obszar i wszystkie czarne drugi.",
      "Nigdzie nie może powstać kwadrat 2×2 w jednym kolorze. Klawiatura: strzałki, spacja, B, C, Backspace.",
    ],
    achievements: [
      { id: "bez-sprawdzania", name: "Bez podglądania", desc: "Ukończ planszę bez użycia Sprawdź ani Podpowiedzi.", points: 10 },
      { id: "bez-cofania", name: "Pewna ręka", desc: "Ukończ średni lub trudny poziom bez cofania ruchu.", points: 25 },
      { id: "blyskawica", name: "Mistrz harmonii", desc: "Ukończ trudny poziom w mniej niż 5 minut bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, clues, checks, key } = ctx.level;
      const { puzzle, solution } = generate(n, clues);
      const grid = puzzle.slice();
      const locked = puzzle.map((v) => v !== 0);

      const s = {
        cursor: locked.indexOf(false) >= 0 ? locked.indexOf(false) : 0,
        tool: "auto", // "auto" | "1" | "2"
        checkCount: 0,
        usedCheckOrHint: false,
        usedHint: false,
      };

      const cells = gridCells(board, n, n, "yy-grid", { gap: 0.06 });
      cells.forEach((b, i) => {
        b.append(el("span", "yy-stone"));
        if (locked[i]) b.classList.add("is-lock");
      });

      const statusEl = statsBlock(ctx, "Stan", ["Pozostało", "Spójność", "Sprawdzenia"]);
      const tools = ["auto", "1", "2"];
      const seg = segmented("Tryb kliknięcia", ["Przełącz", "Biały", "Czarny"], (k) => {
        s.tool = tools[k];
        seg.set(k);
        Sound.tap();
      });
      seg.set(0);
      ctx.panel.append(panelBlock("Tryb", seg.el));
      ctx.panel.append(panelBlock("", el("div", "panel-row",
        button("Sprawdź", "btn", verify),
        button("Podpowiedź", "btn-ghost", hint)
      )));

      const save = ctx.undoable((snap) => {
        for (let i = 0; i < grid.length; i++) grid[i] = snap[i];
        render();
      });

      function put(i, val) {
        if (ctx.done || locked[i] || grid[i] === val) return;
        save(grid.slice());
        grid[i] = val;
        s.cursor = i;
        replay(cells[i], val ? "ui-pop" : "tick");
        const res = render();
        if (res.solved) return win();
        if (res.bad.has(i)) Sound.error();
        else val ? Sound.place(val * 3) : Sound.erase();
      }

      function tapCell(i, forceBlack = false) {
        if (ctx.done || locked[i]) return;
        if (forceBlack) {
          put(i, grid[i] === 2 ? 0 : 2);
          return;
        }
        if (s.tool === "1") put(i, grid[i] === 1 ? 0 : 1);
        else if (s.tool === "2") put(i, grid[i] === 2 ? 0 : 2);
        else put(i, (grid[i] + 1) % 3);
      }

      function verify() {
        if (ctx.done) return;
        s.usedCheckOrHint = true;
        const wrong = [];
        for (let i = 0; i < grid.length; i++) {
          if (grid[i] !== 0 && grid[i] !== solution[i]) wrong.push(i);
        }
        if (wrong.length === 0) {
          const res = checkBoard(grid, n);
          if (res.solved) return win();
          Sound.tap();
          ctx.toast("Wszystkie ustawione kamienie są na dobrych miejscach");
          return;
        }
        s.checkCount++;
        Sound.error();
        wrong.forEach((i) => {
          cells[i].classList.add("is-bad");
          replay(cells[i], "shake");
        });
        render();
        if (s.checkCount >= checks) {
          ctx.lose("Przekroczono limit sprawdzeń", `Błędnych pól: ${wrong.length}.`);
        } else {
          ctx.toast(`Błędne kamienie: ${wrong.length} (próba ${s.checkCount} z ${checks})`);
        }
      }

      function hint() {
        if (ctx.done) return;
        const candidates = [];
        for (let i = 0; i < grid.length; i++) {
          if (!locked[i] && grid[i] !== solution[i]) candidates.push(i);
        }
        if (!candidates.length) return;
        s.usedCheckOrHint = true;
        s.usedHint = true;
        const pickIdx = pick(candidates);
        save(grid.slice());
        grid[pickIdx] = solution[pickIdx];
        s.cursor = pickIdx;
        Sound.place(5);
        sweep([cells[pickIdx]]);
        const res = render();
        ctx.toast(`Podpowiedź: ${solution[pickIdx] === 1 ? "biały" : "czarny"} kamień`);
        if (res.solved) win();
      }

      function win() {
        if (!s.usedCheckOrHint) ctx.achieve("bez-sprawdzania");
        if (key !== "easy" && ctx.undos === 0) ctx.achieve("bez-cofania");
        if (key === "hard" && ctx.time < 300 && !s.usedHint) ctx.achieve("blyskawica");
        ctx.win(`Plansza ${n} × ${n} ułożona w ${fmt(ctx.time)}.`);
      }

      board.addEventListener("contextmenu", (e) => e.preventDefault());
      board.addEventListener("pointerdown", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b) return;
        const i = +b.dataset.i;
        s.cursor = i;
        tapCell(i, e.button === 2);
      });

      cellKeys(ctx, {
        cols: n,
        rows: n,
        get: () => s.cursor,
        set: (i) => { s.cursor = i; render(); },
        keys: {
          " ": () => tapCell(s.cursor, false),
          enter: () => tapCell(s.cursor, false),
          b: () => put(s.cursor, 1),
          "1": () => put(s.cursor, 1),
          c: () => put(s.cursor, 2),
          "2": () => put(s.cursor, 2),
          backspace: () => put(s.cursor, 0),
          delete: () => put(s.cursor, 0),
          "0": () => put(s.cursor, 0),
        },
      });

      function render() {
        const res = checkBoard(grid, n);
        const totalFree = n * n - locked.filter(Boolean).length;
        let filledFree = 0;

        cells.forEach((b, i) => {
          const v = grid[i];
          if (!locked[i] && v !== 0) filledFree++;
          b.classList.toggle("yy-w", v === 1);
          b.classList.toggle("yy-b", v === 2);
          b.classList.toggle("is-bad", res.bad.has(i));
          b.classList.toggle("cursor", i === s.cursor);
          const r = ((i / n) | 0) + 1, col = (i % n) + 1;
          const stateText = v === 1 ? "biały kamień" : v === 2 ? "czarny kamień" : "puste";
          b.setAttribute("aria-label", `Wiersz ${r}, kolumna ${col}, ${stateText}${locked[i] ? ", stałe" : ""}`);
        });

        const left = totalFree - filledFree;
        const ratio = totalFree ? filledFree / totalFree : 1;
        statusEl.set("Pozostało", `${left} ${plural(left, "pole", "pola", "pól")}`);
        const connLabel = res.connW && res.connB ? "OK" : (!res.connW && !res.connB ? "Rozłączne" : !res.connW ? "Białe rozł." : "Czarne rozł.");
        statusEl.set("Spójność", connLabel);
        statusEl.set("Sprawdzenia", `${s.checkCount} z ${checks}`);
        ctx.progress(ratio * 0.95);
        return res;
      }

      render();
    },
  });
}
