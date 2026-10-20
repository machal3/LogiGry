// Domino (Dominosa): połącz sąsiednie pola w dwupolowe kostki domina tak,
// aby każda możliwa para cyfr od 0–0 do N–N wystąpiła na planszy dokładnie raz.
{
  // Zwraca indeks pary {a, b} dla 0 <= a <= b <= maxN.
  function pairId(a, b) {
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    return ((hi * (hi + 1)) >> 1) + lo;
  }

  // Losowy podział prostokąta rows × cols na kostki 1×2 i 2×1 metodą losowych obrotów 2×2.
  function randomTiling(rows, cols) {
    const N = rows * cols;
    const owner = new Int16Array(N).fill(-1);
    const doms = [];
    if (cols % 2 === 0) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c += 2) {
          const u = r * cols + c, v = u + 1;
          owner[u] = owner[v] = doms.length;
          doms.push([u, v]);
        }
      }
    } else {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r += 2) {
          const u = r * cols + c, v = u + cols;
          owner[u] = owner[v] = doms.length;
          doms.push([u, v]);
        }
      }
    }

    const flips = rows * cols * 18;
    for (let t = 0; t < flips; t++) {
      const r = rnd(rows - 1), c = rnd(cols - 1);
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      if (owner[a] === owner[b] && owner[d] === owner[e] && owner[a] !== owner[d]) {
        const ia = owner[a], id = owner[d];
        owner[a] = owner[d] = ia;
        owner[b] = owner[e] = id;
        doms[ia] = [a, d];
        doms[id] = [b, e];
      } else if (owner[a] === owner[d] && owner[b] === owner[e] && owner[a] !== owner[b]) {
        const ia = owner[a], ib = owner[b];
        owner[a] = owner[b] = ia;
        owner[d] = owner[e] = ib;
        doms[ia] = [a, b];
        doms[ib] = [d, e];
      }
    }
    return { owner, doms };
  }

  // Buduje listę wszystkich krawędzi między sąsiednimi polami oraz ich powiązania.
  function buildGraph(rows, cols, nums, maxN) {
    const N = rows * cols;
    const D = ((maxN + 1) * (maxN + 2)) >> 1;
    const edges = [];
    const cellEdges = Array.from({ length: N }, () => []);
    const pairEdges = Array.from({ length: D }, () => []);
    const edgeMap = new Map();

    const addEdge = (u, v) => {
      const e = edges.length;
      const pid = pairId(nums[u], nums[v]);
      edges.push({ u, v, pid });
      cellEdges[u].push(e);
      cellEdges[v].push(e);
      pairEdges[pid].push(e);
      edgeMap.set(u * N + v, e);
      edgeMap.set(v * N + u, e);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = r * cols + c;
        if (c < cols - 1) addEdge(u, u + 1);
        if (r < rows - 1) addEdge(u, u + cols);
      }
    }
    return { edges, cellEdges, pairEdges, edgeMap, D };
  }

  // Liczy liczbę poprawnych podziałów planszy na zestaw kostek 0..maxN (do `limit`).
  function solutions(p, limit = 2) {
    const { rows, cols, nums, maxN } = p;
    const N = rows * cols;
    const { edges, cellEdges, pairEdges, D } = p.graph || buildGraph(rows, cols, nums, maxN);
    const paired = new Uint8Array(N);
    const usedPair = new Uint8Array(D);
    let placed = 0, found = 0, nodes = 0;

    function pickBranch() {
      // Najpierw szukamy pola lub pary o najmniejszej liczbie dostępnych wyborów (MRV).
      let bestType = 0, bestIdx = -1, bestCount = 99;

      for (let u = 0; u < N; u++) {
        if (paired[u]) continue;
        let cnt = 0;
        for (const e of cellEdges[u]) {
          const { u: a, v: b, pid } = edges[e];
          const other = a === u ? b : a;
          if (!paired[other] && !usedPair[pid]) cnt++;
        }
        if (cnt < bestCount) {
          bestCount = cnt;
          bestType = 1;
          bestIdx = u;
          if (cnt <= 1) return [bestType, bestIdx, bestCount];
        }
      }

      for (let pid = 0; pid < D; pid++) {
        if (usedPair[pid]) continue;
        let cnt = 0;
        for (const e of pairEdges[pid]) {
          const { u, v } = edges[e];
          if (!paired[u] && !paired[v]) cnt++;
        }
        if (cnt < bestCount) {
          bestCount = cnt;
          bestType = 2;
          bestIdx = pid;
          if (cnt <= 1) return [bestType, bestIdx, bestCount];
        }
      }
      return [bestType, bestIdx, bestCount];
    }

    function rec() {
      if (found >= limit || ++nodes > 30000) return;
      if (placed === D) {
        found++;
        return;
      }
      const [type, idx, cnt] = pickBranch();
      if (cnt === 0) return;

      const list = type === 1 ? cellEdges[idx] : pairEdges[idx];
      for (const e of list) {
        const { u, v, pid } = edges[e];
        if (paired[u] || paired[v] || usedPair[pid]) continue;
        paired[u] = paired[v] = 1;
        usedPair[pid] = 1;
        placed++;
        rec();
        placed--;
        paired[u] = paired[v] = 0;
        usedPair[pid] = 0;
        if (found >= limit) return;
      }
    }

    rec();
    return found;
  }

  // Rozwiązuje łamigłówkę czystą dedukcją:
  // zwraca 1 (podstawowa eliminacja par i sąsiadów), 2 (przecięcia i wykluczenia), lub 0 gdy wymaga zgadywania.
  function grade(p) {
    const { rows, cols, nums, maxN } = p;
    const N = rows * cols;
    const { edges, cellEdges, pairEdges, D } = p.graph || buildGraph(rows, cols, nums, maxN);
    const E = edges.length;

    // state[e]: 0 = nieznana, 1 = kostka, -1 = ścianka
    const state = new Int8Array(E);
    const paired = new Uint8Array(N);
    const usedPair = new Uint8Array(D);
    let placed = 0, tier = 1;

    function confirmEdge(e) {
      if (state[e] === 1) return true;
      if (state[e] === -1) return false;
      const { u, v, pid } = edges[e];
      if (paired[u] || paired[v] || usedPair[pid]) return false;
      state[e] = 1;
      paired[u] = paired[v] = 1;
      usedPair[pid] = 1;
      placed++;
      for (const oe of cellEdges[u]) if (oe !== e && state[oe] === 0) state[oe] = -1;
      for (const oe of cellEdges[v]) if (oe !== e && state[oe] === 0) state[oe] = -1;
      for (const oe of pairEdges[pid]) if (oe !== e && state[oe] === 0) state[oe] = -1;
      return true;
    }

    for (;;) {
      if (placed === D) return tier;
      let progress = false;

      // Odrzuć krawędzie, których końce są już sparowane lub których para została już ułożona.
      for (let e = 0; e < E; e++) {
        if (state[e] !== 0) continue;
        const { u, v, pid } = edges[e];
        if (paired[u] || paired[v] || usedPair[pid]) {
          state[e] = -1;
          progress = true;
        }
      }

      // 1a. Para cyfr pasuje już tylko w jednym miejscu na planszy.
      for (let pid = 0; pid < D; pid++) {
        if (usedPair[pid]) continue;
        const cands = pairEdges[pid].filter((e) => state[e] === 0);
        if (!cands.length) return 0;
        if (cands.length === 1) {
          if (!confirmEdge(cands[0])) return 0;
          progress = true;
        }
      }
      if (progress) continue;

      // 1b. Niesparowane pole ma już tylko jednego dostępnego sąsiada.
      for (let u = 0; u < N; u++) {
        if (paired[u]) continue;
        const cands = cellEdges[u].filter((e) => state[e] === 0);
        if (!cands.length) return 0;
        if (cands.length === 1) {
          if (!confirmEdge(cands[0])) return 0;
          progress = true;
        }
      }
      if (progress) continue;

      // 2a. Wszystkie możliwe położenia danej pary dzielą wspólne pole `w` -> inne krawędzie z `w` odpadają.
      for (let pid = 0; pid < D; pid++) {
        if (usedPair[pid]) continue;
        const cands = pairEdges[pid].filter((e) => state[e] === 0);
        if (cands.length < 2) continue;
        const { u, v } = edges[cands[0]];
        for (const shared of [u, v]) {
          if (cands.every((e) => edges[e].u === shared || edges[e].v === shared)) {
            for (const oe of cellEdges[shared]) {
              if (state[oe] === 0 && edges[oe].pid !== pid) {
                state[oe] = -1;
                progress = true;
              }
            }
          }
        }
      }
      if (progress) {
        tier = 2;
        continue;
      }

      // 2b. Wszystkie dostępne krawędzie z pola `u` tworzą tę samą parę `pid` -> inne wystąpienia `pid` odpadają.
      for (let u = 0; u < N; u++) {
        if (paired[u]) continue;
        const cands = cellEdges[u].filter((e) => state[e] === 0);
        if (cands.length < 2) continue;
        const pid = edges[cands[0]].pid;
        if (cands.every((e) => edges[e].pid === pid)) {
          for (const oe of pairEdges[pid]) {
            if (state[oe] === 0 && edges[oe].u !== u && edges[oe].v !== u) {
              state[oe] = -1;
              progress = true;
            }
          }
        }
      }
      if (progress) {
        tier = 2;
        continue;
      }

      // 2c. Wykluczenie o jeden krok: jeśli założenie kostki na krawędzi `e` od razu odcina sąsiada lub parę.
      for (let e = 0; e < E; e++) {
        if (state[e] !== 0) continue;
        const { u, v, pid } = edges[e];
        let dead = false;
        for (let w = 0; w < N && !dead; w++) {
          if (paired[w] || w === u || w === v) continue;
          let rem = 0;
          for (const oe of cellEdges[w]) {
            if (state[oe] !== 0) continue;
            const ed = edges[oe];
            if (ed.u !== u && ed.v !== u && ed.u !== v && ed.v !== v && ed.pid !== pid) rem++;
          }
          if (rem === 0) dead = true;
        }
        for (let op = 0; op < D && !dead; op++) {
          if (usedPair[op] || op === pid) continue;
          let rem = 0;
          for (const oe of pairEdges[op]) {
            if (state[oe] !== 0) continue;
            const ed = edges[oe];
            if (ed.u !== u && ed.v !== u && ed.u !== v && ed.v !== v) rem++;
          }
          if (rem === 0) dead = true;
        }
        if (dead) {
          state[e] = -1;
          progress = true;
        }
      }
      if (progress) {
        tier = 2;
        continue;
      }

      return 0;
    }
  }

  // Generuje nową łamigłówkę Domino o gwarantowanym jednym rozwiązaniu osiągalnym czystą dedukcją.
  function generate(maxN, maxTier = 2) {
    const rows = maxN + 1;
    const cols = maxN + 2;
    const N = rows * cols;
    const allPairs = [];
    for (let a = 0; a <= maxN; a++) {
      for (let b = a; b <= maxN; b++) allPairs.push([a, b]);
    }

    for (let t = 0; t < 2000; t++) {
      const { owner, doms } = randomTiling(rows, cols);
      const nums = new Int8Array(N);
      const shuffled = shuffle(allPairs.slice());
      for (let k = 0; k < doms.length; k++) {
        const [u, v] = doms[k];
        const [a, b] = shuffled[k];
        if (rnd(2)) {
          nums[u] = a;
          nums[v] = b;
        } else {
          nums[u] = b;
          nums[v] = a;
        }
      }

      const graph = buildGraph(rows, cols, nums, maxN);
      const p = { maxN, rows, cols, nums, owner, doms, graph };
      const g = grade(p);
      if (g >= 1 && g <= maxTier && solutions(p, 2) === 1) {
        const solEdge = new Uint8Array(graph.edges.length);
        for (const [u, v] of doms) {
          solEdge[graph.edgeMap.get(u * N + v)] = 1;
        }
        p.solEdge = solEdge;
        return p;
      }
    }
    return null;
  }

  // Analizuje aktualny stan ułożonych kostek: wykrywa powtórzone pary cyfr.
  function analyze(p, cellPartner) {
    const { nums, maxN } = p;
    const D = ((maxN + 1) * (maxN + 2)) >> 1;
    const pairCells = Array.from({ length: D }, () => []);
    const badCells = new Set();
    const badPairs = new Set();
    const okPairs = new Set();
    let placedCount = 0;

    for (let u = 0; u < cellPartner.length; u++) {
      const v = cellPartner[u];
      if (v > u) {
        placedCount++;
        const pid = pairId(nums[u], nums[v]);
        pairCells[pid].push(u, v);
      }
    }

    for (let pid = 0; pid < D; pid++) {
      const list = pairCells[pid];
      if (list.length === 2) {
        okPairs.add(pid);
      } else if (list.length > 2) {
        badPairs.add(pid);
        for (const u of list) badCells.add(u);
      }
    }

    return { placedCount, badCells, badPairs, okPairs, D };
  }

  const solved = (p, cellPartner) => {
    const { placedCount, badCells, D } = analyze(p, cellPartner);
    return placedCount === D && badCells.size === 0;
  };

  if (typeof module !== "undefined") {
    module.exports = { pairId, randomTiling, buildGraph, solutions, grade, generate, analyze, solved };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "domino",
    cat: "logiczne",
    name: "Domino",
    author: "Gemini 4 Argon",
    desc: "Połącz sąsiednie pola w kostki domina tak, aby każda para cyfr wystąpiła na planszy dokładnie raz.",
    color: "#0f6b58",
    ink: "#ffffff",
    glyph: [
      "#####",
      "#.#.#",
      "#####",
      "#...#",
      "#####",
    ],
    levels: [
      { key: "easy", name: "5 × 4", points: 10, maxN: 3, tier: 1, maxMistakes: 5 },
      { key: "medium", name: "6 × 5", points: 25, maxN: 4, tier: 2, maxMistakes: 4 },
      { key: "hard", name: "7 × 6", points: 50, maxN: 5, tier: 2, maxMistakes: 3 },
    ],
    rules: [
      "Na planszy ułożono pełny zestaw kostek domina z cyframi od 0 do N, ale ukryto krawędzie między nimi.",
      "Kliknij dwa sąsiednie pola (lub przeciągnij między nimi), aby połączyć je w kostkę domina. Każda para cyfr może wystąpić tylko raz.",
      "W trybie ścianek (klawisz X lub prawy przycisk myszy) możesz odgradzać pola, które na pewno nie tworzą kostki.",
      "Ułóż wszystkie kostki bez powtórzeń. Zbyt wiele zduplikowanych par kończy partię.",
    ],
    achievements: [
      { id: "bez-bledu", name: "Bez duplikatu", desc: "Ułóż wszystkie kostki, nie tworząc ani jednej powtórzonej pary.", points: 10 },
      { id: "bez-podpowiedzi", name: "Wzrok analityka", desc: "Ukończ średni lub trudny poziom bez używania podpowiedzi.", points: 25 },
      { id: "bez-cofania", name: "Czysty układ", desc: "Ukończ średni lub trudny poziom bez cofania ruchów i bez pomyłki.", points: 25 },
      { id: "mistrz-domina", name: "Mistrz domina", desc: "Rozwiąż planszę 7 × 6 w mniej niż 3 minuty bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const { maxN, tier, maxMistakes, key } = ctx.level;
      const p = generate(maxN, tier);
      const { rows, cols, nums, graph } = p;
      const N = rows * cols;
      const D = graph.D;

      // cellPartner[u]: indeks sąsiada, z którym pole `u` tworzy kostkę, lub -1.
      const cellPartner = new Int16Array(N).fill(-1);
      // walls[e]: 1 jeśli między polami krawędzi `e` postawiono ściankę ×.
      const walls = new Uint8Array(graph.edges.length);

      // Jedna startowa kostka z rozwiązania jest odsłonięta na początku jako punkt odniesienia.
      const locked = new Uint8Array(N);
      const [startU, startV] = p.doms[0];
      cellPartner[startU] = startV;
      cellPartner[startV] = startU;
      locked[startU] = locked[startV] = 1;

      let sel = cellPartner.indexOf(-1) >= 0 ? cellPartner.indexOf(-1) : 0;
      let focusPid = -1;
      let mode = "domino";
      let mistakes = 0, hinted = false;
      let dragFrom = -1;

      const cells = gridCells(board, cols, rows, "dm-grid", {
        gap: 0,
        label: (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}, cyfra ${nums[r * cols + c]}`,
      });

      cells.forEach((b, i) => {
        const r = (i / cols) | 0, c = i % cols;
        if (c === cols - 1) b.classList.add("edge-r");
        if (r === rows - 1) b.classList.add("edge-b");
      });

      const doneEl = statBlock(ctx, "Ułożone kostki", { meter: true });
      const livesEl = pipsBlock(ctx, "Szanse", maxMistakes, { icon: "heart" });

      // Wykaz wszystkich par kostek 0–0 .. N–N w panelu.
      const tray = el("div", "dm-tray");
      const pairChips = new Array(D);
      for (let a = 0; a <= maxN; a++) {
        for (let b = a; b <= maxN; b++) {
          const pid = pairId(a, b);
          const chip = el("span", "dm-chip", `${a}–${b}`);
          pairChips[pid] = chip;
          tray.append(chip);
        }
      }
      ctx.panel.append(panelBlock("Zestaw kostek", tray));

      const modeSeg = segmented("Tryb", ["Kostki", "Ścianki ×"], (k) => {
        mode = k === 0 ? "domino" : "wall";
        modeSeg.set(k);
      });
      modeSeg.set(0);

      const hintBtn = button("Podpowiedź", "btn-ghost wide", hint);
      const toolsWrap = el("div", "dm-tools");
      toolsWrap.append(modeSeg.el, hintBtn);
      ctx.panel.append(panelBlock("Narzędzia", toolsWrap));

      const save = ctx.undoable(([cp, ws, s]) => {
        cp.forEach((v, i) => { cellPartner[i] = v; });
        ws.forEach((v, i) => { walls[i] = v; });
        sel = s;
        render();
      });
      const snapshot = () => [Int16Array.from(cellPartner), Uint8Array.from(walls), sel];

      function edgeBetween(u, v) {
        const e = graph.edgeMap.get(u * N + v);
        return e !== undefined ? e : -1;
      }

      function unpairCell(u) {
        const v = cellPartner[u];
        if (v >= 0 && !locked[u] && !locked[v]) {
          cellPartner[u] = -1;
          cellPartner[v] = -1;
        }
      }

      function toggleEdge(u, v, forceMode) {
        if (ctx.done) return;
        const e = edgeBetween(u, v);
        if (e < 0) return;
        if (locked[u] || locked[v]) {
          Sound.error();
          replay(cells[locked[u] ? u : v], "shake");
          return;
        }
        const act = forceMode || mode;

        if (act === "wall") {
          save(snapshot());
          if (cellPartner[u] === v) {
            unpairCell(u);
            walls[e] = 1;
          } else {
            walls[e] = walls[e] ? 0 : 1;
          }
          Sound.flag();
          render();
          return;
        }

        // Tryb łączenia kostek:
        save(snapshot());
        if (cellPartner[u] === v) {
          unpairCell(u);
          Sound.erase();
          render();
          return;
        }

        unpairCell(u);
        unpairCell(v);
        walls[e] = 0;
        cellPartner[u] = v;
        cellPartner[v] = u;
        focusPid = pairId(nums[u], nums[v]);

        const { badCells } = analyze(p, cellPartner);
        render();

        if (badCells.has(u) || badCells.has(v)) {
          mistakes++;
          Sound.error();
          replay(cells[u], "shake");
          replay(cells[v], "shake");
          render();
          if (mistakes >= maxMistakes) {
            ctx.lose("Za dużo duplikatów", `Przekroczono limit powtórzonych kostek (${maxMistakes}).`);
          }
          return;
        }

        if (solved(p, cellPartner)) {
          finish();
          return;
        }
        Sound.place((nums[u] + nums[v]) % 6 + 1);
      }

      function hint() {
        if (ctx.done) return;
        let targetEdge = -1;
        for (let u = 0; u < N; u++) {
          const v = cellPartner[u];
          if (v > u) {
            const e = edgeBetween(u, v);
            if (!p.solEdge[e]) {
              targetEdge = e;
              break;
            }
          }
        }
        for (let e = 0; e < graph.edges.length; e++) {
          if (p.solEdge[e]) {
            const { u, v } = graph.edges[e];
            if (cellPartner[u] !== v) {
              targetEdge = e;
              break;
            }
          }
        }
        if (targetEdge < 0) return;

        hinted = true;
        save(snapshot());
        const { u, v, pid } = graph.edges[targetEdge];
        unpairCell(u);
        unpairCell(v);
        walls[targetEdge] = 0;
        cellPartner[u] = v;
        cellPartner[v] = u;
        sel = u;
        focusPid = pid;
        Sound.line();
        render();
        cells[u].classList.remove("is-hint");
        cells[v].classList.remove("is-hint");
        void cells[u].offsetWidth;
        cells[u].classList.add("is-hint");
        cells[v].classList.add("is-hint");
        if (solved(p, cellPartner)) finish();
      }

      function finish() {
        if (ctx.done) return;
        if (mistakes === 0) ctx.achieve("bez-bledu");
        if (!hinted && key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (ctx.undos === 0 && mistakes === 0 && key !== "easy") ctx.achieve("bez-cofania");
        if (!hinted && key === "hard" && ctx.time < 180) ctx.achieve("mistrz-domina");
        sweep(cells);
        ctx.win(mistakes === 0 ? "Pełny zestaw kostek ułożony bezbłędnie." : `Ułożono wszystkie kostki (duplikaty po drodze: ${mistakes}).`);
      }

      function nearBorderNeighbor(b, idx, clientX, clientY) {
        const rect = b.getBoundingClientRect();
        if (!rect.width || !rect.height) return -1;
        const rx = (clientX - rect.left) / rect.width;
        const ry = (clientY - rect.top) / rect.height;
        const r = (idx / cols) | 0, c = idx % cols;
        const margin = 0.23;
        if (rx < margin && c > 0) return idx - 1;
        if (rx > 1 - margin && c < cols - 1) return idx + 1;
        if (ry < margin && r > 0) return idx - cols;
        if (ry > 1 - margin && r < rows - 1) return idx + cols;
        return -1;
      }

      board.addEventListener("pointerdown", (e) => {
        if (e.button === 2) return;
        const b = e.target.closest(".gb-cell");
        if (!b || ctx.done) return;
        const idx = +b.dataset.i;
        dragFrom = idx;

        const borderNbr = nearBorderNeighbor(b, idx, e.clientX, e.clientY);
        if (borderNbr >= 0) {
          sel = idx;
          dragFrom = -1;
          toggleEdge(idx, borderNbr);
          return;
        }

        if (sel >= 0 && sel !== idx && edgeBetween(sel, idx) >= 0) {
          const prev = sel;
          sel = idx;
          dragFrom = -1;
          toggleEdge(prev, idx);
          return;
        }

        sel = idx;
        const partner = cellPartner[idx];
        focusPid = partner >= 0 ? pairId(nums[idx], nums[partner]) : -1;
        Sound.tap();
        render();
      });

      board.addEventListener("pointerover", (e) => {
        if (dragFrom < 0 || ctx.done) return;
        const b = e.target.closest(".gb-cell");
        if (!b) return;
        const idx = +b.dataset.i;
        if (idx !== dragFrom && edgeBetween(dragFrom, idx) >= 0) {
          const from = dragFrom;
          dragFrom = -1;
          sel = idx;
          toggleEdge(from, idx);
        }
      });

      ctx.on(window, "pointerup", () => { dragFrom = -1; });

      board.addEventListener("contextmenu", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b || ctx.done) return;
        e.preventDefault();
        const idx = +b.dataset.i;
        const borderNbr = nearBorderNeighbor(b, idx, e.clientX, e.clientY);
        if (borderNbr >= 0) {
          toggleEdge(idx, borderNbr, "wall");
        } else if (sel >= 0 && sel !== idx && edgeBetween(sel, idx) >= 0) {
          toggleEdge(sel, idx, "wall");
        }
      });

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.target.closest("input, textarea")) return;
        const r = (sel / cols) | 0, c = sel % cols;
        const dirMap = {
          ArrowUp: r > 0 ? sel - cols : -1,
          ArrowDown: r < rows - 1 ? sel + cols : -1,
          ArrowLeft: c > 0 ? sel - 1 : -1,
          ArrowRight: c < cols - 1 ? sel + 1 : -1,
          KeyW: r > 0 ? sel - cols : -1,
          KeyS: r < rows - 1 ? sel + cols : -1,
          KeyA: c > 0 ? sel - 1 : -1,
          KeyD: c < cols - 1 ? sel + 1 : -1,
        };
        if (e.code in dirMap) {
          e.preventDefault();
          const next = dirMap[e.code];
          if (next < 0) return;
          if (e.shiftKey || e.code.startsWith("Key")) {
            const from = sel;
            sel = next;
            toggleEdge(from, next);
          } else {
            sel = next;
            const partner = cellPartner[sel];
            focusPid = partner >= 0 ? pairId(nums[sel], nums[partner]) : -1;
            render();
          }
          cells[sel].focus({ preventScroll: true });
        } else if (e.key === "x" || e.key === "X") {
          e.preventDefault();
          mode = mode === "domino" ? "wall" : "domino";
          modeSeg.set(mode === "domino" ? 0 : 1);
          Sound.tap();
        } else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          if (cellPartner[sel] >= 0 && !locked[sel]) {
            save(snapshot());
            unpairCell(sel);
            Sound.erase();
            render();
          }
        }
      });

      const ring = selectionRing(board);

      function renderCell(b, i, dir, wallR, wallB) {
        const stateKey = `${nums[i]}:${dir}:${wallR ? 1 : 0}:${wallB ? 1 : 0}`;
        if (b.dataset.ck === stateKey) return;
        b.dataset.ck = stateKey;
        b.replaceChildren();
        const tile = el("span", "dm-tile");
        tile.append(el("span", "dm-num", nums[i]));
        b.append(tile);
        if (wallR) b.append(el("span", "dm-wall dm-wall-r", "×"));
        if (wallB) b.append(el("span", "dm-wall dm-wall-b", "×"));
      }

      function render() {
        if (sel >= 0) ring(cells[sel]);
        const { placedCount, badCells, badPairs, okPairs } = analyze(p, cellPartner);
        const selPartner = sel >= 0 ? cellPartner[sel] : -1;
        const activePid = selPartner >= 0 ? pairId(nums[sel], nums[selPartner]) : focusPid;

        const samePairCells = new Set();
        if (activePid >= 0) {
          for (const e of graph.pairEdges[activePid]) {
            const { u, v } = graph.edges[e];
            if (!walls[e]) {
              samePairCells.add(u);
              samePairCells.add(v);
            }
          }
        }

        cells.forEach((b, i) => {
          const partner = cellPartner[i];
          let dir = "";
          if (partner === i + 1) dir = "r";
          else if (partner === i - 1) dir = "l";
          else if (partner === i + cols) dir = "b";
          else if (partner === i - cols) dir = "t";

          const r = (i / cols) | 0, c = i % cols;
          const er = c < cols - 1 ? edgeBetween(i, i + 1) : -1;
          const eb = r < rows - 1 ? edgeBetween(i, i + cols) : -1;
          const wallR = er >= 0 && walls[er] === 1;
          const wallB = eb >= 0 && walls[eb] === 1;

          renderCell(b, i, dir, wallR, wallB);

          b.classList.toggle("dm-paired", partner >= 0);
          b.classList.toggle("is-lock", !!locked[i]);
          b.classList.toggle("dm-r", dir === "r");
          b.classList.toggle("dm-l", dir === "l");
          b.classList.toggle("dm-b", dir === "b");
          b.classList.toggle("dm-t", dir === "t");
          b.classList.toggle("is-sel", i === sel);
          b.classList.toggle("dm-partner", i === selPartner);
          b.classList.toggle("is-bad", badCells.has(i));
          b.classList.toggle("dm-same-pair", samePairCells.has(i) && i !== sel && i !== selPartner);
          b.classList.toggle("cursor", i === sel);
        });

        for (let pid = 0; pid < D; pid++) {
          const chip = pairChips[pid];
          chip.classList.toggle("is-ok", okPairs.has(pid));
          chip.classList.toggle("is-bad", badPairs.has(pid));
          chip.classList.toggle("is-sel", pid === activePid);
        }

        doneEl.set(`${placedCount} z ${D}`, placedCount / D, `Pozostało: ${Math.max(0, D - placedCount)}`);
        livesEl.set(Math.max(0, maxMistakes - mistakes));
        ctx.progress(placedCount / D);
      }

      render();
    },
  });
}
