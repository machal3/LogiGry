// Enklawy (Suguru / Tectonic): podzielona na regiony plansza, w której każda enklawa
// o rozmiarze N zawiera cyfry 1..N, a jednakowe cyfry nie mogą stykać się nawet rogiem.
{
  const MAX_GROUP = 5;
  const PALETTE = ["blue", "teal", "green", "orange", "violet", "pink", "yellow", "red"];

  const ortho = (n, i) => {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  };

  const around = (n, i) => {
    const r = (i / n) | 0, c = i % n, out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) out.push(nr * n + nc);
      }
    }
    return out;
  };

  const bits = (m) => {
    let k = 0;
    for (; m; m &= m - 1) k++;
    return k;
  };

  // Losowy podział planszy n × n na spójne enklawy o rozmiarze od 2 do 5 pól.
  function partition(n) {
    const N = n * n;
    for (let attempt = 0; attempt < 150; attempt++) {
      const owner = new Int16Array(N).fill(-1);
      const regions = [];
      const order = shuffle([...Array(N).keys()]);

      for (const seed of order) {
        if (owner[seed] < 0) {
          const k = regions.length;
          const target = 4 + rnd(2); // 4 lub 5 (mniejsze powstają naturalnie na stykach)
          const reg = [seed];
          owner[seed] = k;

          while (reg.length < target) {
            const cands = [];
            for (const u of reg) {
              for (const v of ortho(n, u)) {
                if (owner[v] < 0 && !cands.includes(v)) cands.push(v);
              }
            }
            if (!cands.length) break;
            cands.sort((a, b) => {
              const fa = ortho(n, a).filter((x) => owner[x] < 0).length;
              const fb = ortho(n, b).filter((x) => owner[x] < 0).length;
              return fa - fb + (Math.random() - 0.5);
            });
            const next = cands[0];
            owner[next] = k;
            reg.push(next);
          }
          regions.push(reg);
        }
      }

      // Dołącz pojedyncze pola (rozmiar 1) do najmniejszej sąsiedniej enklawy o rozmiarze < 5.
      let ok = true;
      for (let k = 0; k < regions.length; k++) {
        if (regions[k].length !== 1) continue;
        const u = regions[k][0];
        const nbrs = ortho(n, u)
          .map((v) => owner[v])
          .filter((rk) => rk !== k && regions[rk].length < MAX_GROUP);
        if (!nbrs.length) {
          ok = false;
          break;
        }
        nbrs.sort((a, b) => regions[a].length - regions[b].length);
        const targetK = nbrs[0];
        owner[u] = targetK;
        regions[targetK].push(u);
        regions[k] = [];
      }
      if (!ok) continue;

      const cleanRegs = regions.filter((r) => r.length >= 2).map((r) => r.slice().sort((a, b) => a - b));
      const cleanOwner = new Int16Array(N);
      cleanRegs.forEach((r, idx) => r.forEach((cell) => { cleanOwner[cell] = idx; }));

      // Każdy kwadrat 2×2 ma wszystkie 4 pola wzajemnie sąsiadujące, więc musi mieścić 4 różne cyfry.
      for (let r = 0; r < n - 1 && ok; r++) {
        for (let c = 0; c < n - 1; c++) {
          const i = r * n + c;
          const sizes = [
            cleanRegs[cleanOwner[i]].length,
            cleanRegs[cleanOwner[i + 1]].length,
            cleanRegs[cleanOwner[i + n]].length,
            cleanRegs[cleanOwner[i + n + 1]].length,
          ].sort((a, b) => a - b);
          if (sizes[0] < 1 || sizes[1] < 2 || sizes[2] < 3 || sizes[3] < 4) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;

      return { n, owner: cleanOwner, regions: cleanRegs };
    }
    return null;
  }

  // Buduje strukturę sąsiedztwa: każde pole ma listę pól wykluczających (ta sama enklawa + 8 sąsiadów).
  function buildPeers(n, owner, regions) {
    const N = n * n;
    return Array.from({ length: N }, (_, i) => {
      const set = new Set([...regions[owner[i]], ...around(n, i)]);
      set.delete(i);
      return [...set];
    });
  }

  // Dobiera kolory enklaw z palety tak, aby sąsiadujące enklawy miały dobrze odróżnialne odcienie.
  function colorRegions(n, owner, regions) {
    const R = regions.length;
    const adj = Array.from({ length: R }, () => new Set());
    for (let i = 0; i < n * n; i++) {
      for (const j of ortho(n, i)) {
        if (owner[i] !== owner[j]) adj[owner[i]].add(owner[j]);
      }
    }
    const colors = new Int8Array(R).fill(-1);
    for (let k = 0; k < R; k++) {
      const used = new Set([...adj[k]].map((m) => colors[m]).filter((c) => c >= 0));
      for (let step = 0; step < PALETTE.length; step++) {
        const c = (k * 3 + step) % PALETTE.length;
        if (!used.has(c)) {
          colors[k] = c;
          break;
        }
      }
      if (colors[k] < 0) colors[k] = k % PALETTE.length;
    }
    return colors;
  }

  function allowedMask(peers, maxVal, grid, i) {
    let used = 0;
    for (const j of peers[i]) used |= 1 << grid[j];
    const full = ((1 << maxVal[i]) - 1) << 1;
    return full & ~used;
  }

  function pickEmpty(peers, maxVal, grid) {
    let best = -1, bestMask = 0, bestCount = 99;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const m = allowedMask(peers, maxVal, grid, i);
      const c = bits(m);
      if (c < bestCount) {
        best = i;
        bestMask = m;
        bestCount = c;
        if (c <= 1) break;
      }
    }
    return [best, bestMask];
  }

  // Losowo wypełnia całą planszę poprawnymi cyframi.
  function fillGrid(peers, maxVal, grid) {
    let steps = 0;
    function rec() {
      if (++steps > 300) return false;
      const [i, mask] = pickEmpty(peers, maxVal, grid);
      if (i < 0) return true;
      if (!mask) return false;
      const ds = [];
      for (let d = 1; d <= maxVal[i]; d++) if (mask & (1 << d)) ds.push(d);
      shuffle(ds);
      for (const d of ds) {
        grid[i] = d;
        if (rec()) return true;
      }
      grid[i] = 0;
      return false;
    }
    return rec();
  }

  // Liczy liczbę rozwiązań łamigłówki (do `limit`), aby zagwarantować jednoznaczność.
  function solutions(p, limit = 2) {
    const { n, owner, regions } = p;
    const peers = p.peers || buildPeers(n, owner, regions);
    const maxVal = p.maxVal || Int8Array.from({ length: n * n }, (_, i) => regions[owner[i]].length);
    const grid = Int8Array.from(p.given);

    for (let i = 0; i < grid.length; i++) {
      const v = grid[i];
      if (!v) continue;
      if (v < 1 || v > maxVal[i]) return 0;
      for (const j of peers[i]) if (grid[j] === v) return 0;
    }

    let found = 0, nodes = 0;
    function rec() {
      if (found >= limit || ++nodes > 40000) return;
      const [i, mask] = pickEmpty(peers, maxVal, grid);
      if (i < 0) {
        found++;
        return;
      }
      if (!mask) return;
      for (let d = 1; d <= maxVal[i] && found < limit; d++) {
        if (mask & (1 << d)) {
          grid[i] = d;
          rec();
        }
      }
      grid[i] = 0;
    }
    rec();
    return found;
  }

  // Rozwiązuje łamigłówkę czystą dedukcją (bez zgadywania):
  // zwraca 1 (pojedyncze miejsca i kandydaci), 2 (wykluczanie sąsiedztwa i pary), albo 0 gdy wymaga zgadywania.
  function grade(p) {
    const { n, owner, regions } = p;
    const N = n * n;
    const peers = p.peers || buildPeers(n, owner, regions);
    const maxVal = p.maxVal || Int8Array.from({ length: N }, (_, i) => regions[owner[i]].length);
    const g = Int8Array.from(p.given);
    const cand = new Int16Array(N);
    for (let i = 0; i < N; i++) cand[i] = g[i] ? 0 : allowedMask(peers, maxVal, g, i);

    let tier = 1;
    const place = (i, d) => {
      g[i] = d;
      cand[i] = 0;
      for (const j of peers[i]) cand[j] &= ~(1 << d);
    };

    for (;;) {
      if (!g.includes(0)) return tier;
      for (let i = 0; i < N; i++) if (!g[i] && !cand[i]) return 0;

      // 1a. Pole z dokładnie jednym kandydatem.
      let progress = false;
      for (let i = 0; i < N; i++) {
        if (!g[i] && bits(cand[i]) === 1) {
          place(i, Math.log2(cand[i]) | 0);
          progress = true;
        }
      }
      if (progress) continue;

      // 1b. Cyfra mająca tylko jedno możliwe pole w obrębie enklawy.
      for (const reg of regions) {
        for (let d = 1; d <= reg.length; d++) {
          if (reg.some((i) => g[i] === d)) continue;
          const where = reg.filter((i) => !g[i] && (cand[i] & (1 << d)));
          if (!where.length) return 0;
          if (where.length === 1) {
            place(where[0], d);
            progress = true;
          }
        }
      }
      if (progress) continue;

      // 2a. Zablokowany kandydat: wszystkie możliwe miejsca cyfry d w enklawie widzą pole zewnętrzne x.
      for (const reg of regions) {
        for (let d = 1; d <= reg.length; d++) {
          const where = reg.filter((i) => !g[i] && (cand[i] & (1 << d)));
          if (where.length < 2) continue;
          for (const x of peers[where[0]]) {
            if (g[x] || !(cand[x] & (1 << d)) || reg.includes(x)) continue;
            if (where.every((w) => peers[x].includes(w))) {
              cand[x] &= ~(1 << d);
              progress = true;
            }
          }
        }
      }
      if (progress) {
        tier = 2;
        continue;
      }

      // 2b. Odkryta para w enklawie: dwa pola mają tych samych dwóch kandydatów.
      for (const reg of regions) {
        const pairs = reg.filter((i) => !g[i] && bits(cand[i]) === 2);
        for (let a = 0; a < pairs.length; a++) {
          for (let b = a + 1; b < pairs.length; b++) {
            const u = pairs[a], v = pairs[b];
            if (cand[u] !== cand[v]) continue;
            const m = cand[u];
            for (let x = 0; x < N; x++) {
              if (x === u || x === v || g[x]) continue;
              if (peers[u].includes(x) && peers[v].includes(x) && (cand[x] & m)) {
                cand[x] &= ~m;
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

      return 0;
    }
  }

  // Generuje pełną łamigłówkę z jednym rozwiązaniem, rozwiązywalną czystą dedukcją.
  function generate(n, maxTier = 2, minGivens = 8) {
    const N = n * n;
    for (let t = 0; t < 1500; t++) {
      const part = partition(n);
      if (!part) continue;
      const { owner, regions } = part;
      const peers = buildPeers(n, owner, regions);
      const maxVal = Int8Array.from({ length: N }, (_, i) => regions[owner[i]].length);
      const sol = new Int8Array(N);
      if (!fillGrid(peers, maxVal, sol)) continue;

      const given = Int8Array.from(sol);
      const p = { n, owner, regions, peers, maxVal, given, solution: sol, colors: colorRegions(n, owner, regions) };
      let left = N;
      for (const i of shuffle([...Array(N).keys()])) {
        if (left <= minGivens) break;
        const keep = given[i];
        given[i] = 0;
        const g = grade(p);
        if (g >= 1 && g <= maxTier && solutions(p, 2) === 1) left--;
        else given[i] = keep;
      }
      if (solutions(p, 2) === 1 && grade(p) >= 1) return p;
    }
    return null;
  }

  // Zwraca zbiór indeksów pól naruszających zasady (powtórka w enklawie, styk takich samych cyfr lub za duża cyfra).
  function conflicts(p, grid) {
    const { n, owner, regions } = p;
    const peers = p.peers || buildPeers(n, owner, regions);
    const bad = new Set();
    for (let i = 0; i < n * n; i++) {
      const v = grid[i];
      if (!v) continue;
      if (v > regions[owner[i]].length) bad.add(i);
      for (const j of peers[i]) {
        if (grid[j] === v) {
          bad.add(i);
          bad.add(j);
        }
      }
    }
    return bad;
  }

  const solved = (p, grid) => {
    for (let i = 0; i < p.n * p.n; i++) if (!grid[i]) return false;
    return conflicts(p, grid).size === 0;
  };

  if (typeof module !== "undefined") {
    module.exports = { partition, buildPeers, solutions, grade, generate, conflicts, solved };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "enklawy",
    cat: "logiczne",
    name: "Enklawy",
    author: "Gemini 4 Argon",
    desc: "Wpisz w każdą enklawę cyfry od 1 do jej rozmiaru. Takie same cyfry nie mogą stykać się nawet rogiem.",
    color: "#1d5bd6",
    ink: "#ffffff",
    glyph: [
      "###.#",
      "#...#",
      "###..",
      "..###",
      "#.###",
    ],
    levels: [
      { key: "easy", name: "5 × 5", points: 10, n: 5, tier: 1, minGivens: 9, maxMistakes: 5 },
      { key: "medium", name: "6 × 6", points: 25, n: 6, tier: 2, minGivens: 11, maxMistakes: 4 },
      { key: "hard", name: "7 × 7", points: 50, n: 7, tier: 2, minGivens: 13, maxMistakes: 3 },
    ],
    rules: [
      "Plansza jest podzielona na kolorowe enklawy liczące od 2 do 5 pól. Mała liczba w rogu enklawy wskazuje jej rozmiar N.",
      "W każdą enklawę wpisz cyfry od 1 do N tak, aby każda wystąpiła w niej dokładnie raz.",
      "Dwa pola z tą samą cyfrą nie mogą stykać się ze sobą bokiem ani rogiem. Zbyt wiele błędnych wpisów kończy partię.",
      "Kliknij pole lub wybierz je strzałkami i wpisz cyfrę. Klawisz N przełącza tryb notatek, a Backspace czyści pole.",
    ],
    achievements: [
      { id: "bez-bledu", name: "Czysta dedukcja", desc: "Rozwiąż planszę, nie wpisując ani jednej błędnej cyfry.", points: 10 },
      { id: "bez-podpowiedzi", name: "Samodzielny", desc: "Rozwiąż średni lub trudny poziom bez użycia podpowiedzi.", points: 25 },
      { id: "bez-cofania", name: "Pewna ręka", desc: "Rozwiąż średni lub trudny poziom bez cofania ruchów i bez pomyłki.", points: 25 },
      { id: "architekt-enklaw", name: "Architekt enklaw", desc: "Rozwiąż planszę 7 × 7 w mniej niż 4 minuty bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, tier, minGivens, maxMistakes, key } = ctx.level;
      const N = n * n;
      const p = generate(n, tier, minGivens);
      const grid = Int8Array.from(p.given);
      const notes = new Int16Array(N);
      let sel = grid.indexOf(0) >= 0 ? grid.indexOf(0) : 0;
      let mistakes = 0, hinted = false;

      // Pierwsze (lewe górne) pole każdej enklawy dostaje etykietę rozmiaru.
      const headOf = new Map();
      p.regions.forEach((reg, k) => headOf.set(reg[0], reg.length));

      const cells = gridCells(board, n, n, "en-grid", {
        gap: 0,
        label: (r, c) => {
          const idx = r * n + c;
          const k = p.owner[idx];
          return `Wiersz ${r + 1}, kolumna ${c + 1}, enklawa ${k + 1} (${p.regions[k].length}-polowa)`;
        },
      });

      // Krawędzie enklaw rysujemy pojedynczo (prawa i dolna ściana), jak w Kalkudoku.
      cells.forEach((b, i) => {
        const r = (i / n) | 0, c = i % n, k = p.owner[i];
        b.style.setProperty("--en-c", `var(--${PALETTE[p.colors[k]]})`);
        if (c === n - 1) b.classList.add("edge-r");
        else if (p.owner[i + 1] !== k) b.classList.add("cb-r");
        if (r === n - 1) b.classList.add("edge-b");
        else if (p.owner[i + n] !== k) b.classList.add("cb-b");
      });

      const doneEl = statBlock(ctx, "Uzupełnione", { meter: true });
      const livesEl = pipsBlock(ctx, "Szanse", maxMistakes, { icon: "heart" });

      const totalByDigit = new Int8Array(MAX_GROUP + 1);
      for (const reg of p.regions) {
        for (let d = 1; d <= reg.length; d++) totalByDigit[d]++;
      }

      const controls = digitControls(ctx, MAX_GROUP, {
        put,
        remaining: () => Array.from({ length: MAX_GROUP + 1 }, (_, d) => {
          if (!d) return 0;
          let cnt = 0;
          for (let i = 0; i < N; i++) if (grid[i] === d) cnt++;
          return Math.max(0, totalByDigit[d] - cnt);
        }),
      });

      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      const save = ctx.undoable(([gs, ns, s]) => {
        gs.forEach((v, i) => { grid[i] = v; });
        ns.forEach((v, i) => { notes[i] = v; });
        sel = s;
        render();
      });
      const snapshot = () => [Int8Array.from(grid), Int16Array.from(notes), sel];

      function isRegionDone(k, bad) {
        return p.regions[k].every((i) => grid[i] > 0 && !bad.has(i));
      }

      function put(d, asNote) {
        if (ctx.done || sel < 0) return;
        if (p.given[sel]) {
          Sound.error();
          replay(cells[sel], "shake");
          return;
        }
        const maxD = p.maxVal[sel];
        if (d > maxD) {
          Sound.error();
          replay(cells[sel], "shake");
          ctx.toast(`Ta enklawa ma rozmiar ${maxD}`);
          return;
        }
        if (asNote && d) {
          if (grid[sel]) return;
          save(snapshot());
          notes[sel] ^= 1 << d;
          Sound.tap();
          render();
          return;
        }
        if (grid[sel] === d && !notes[sel]) return;
        const wasDone = isRegionDone(p.owner[sel], conflicts(p, grid));
        save(snapshot());
        grid[sel] = d;
        notes[sel] = 0;
        if (d) {
          for (const j of p.peers[sel]) notes[j] &= ~(1 << d);
        }
        render();

        if (!d) {
          Sound.erase();
          return;
        }
        const bad = conflicts(p, grid);
        if (bad.has(sel)) {
          mistakes++;
          Sound.error();
          replay(cells[sel], "shake");
          render();
          if (mistakes >= maxMistakes) {
            ctx.lose("Za dużo pomyłek", `Przekroczono limit błędów (${maxMistakes}).`);
          }
          return;
        }
        if (solved(p, grid)) {
          finish();
          return;
        }
        if (!wasDone && isRegionDone(p.owner[sel], bad)) {
          Sound.line();
          sweep(p.regions[p.owner[sel]].map((j) => cells[j]));
        } else {
          Sound.place(d);
        }
      }

      function hint() {
        if (ctx.done) return;
        let target = -1;
        for (let i = 0; i < N; i++) {
          if (grid[i] && grid[i] !== p.solution[i]) { target = i; break; }
        }
        if (target < 0) {
          for (let i = 0; i < N; i++) {
            if (!grid[i] && bits(allowedMask(p.peers, p.maxVal, grid, i)) === 1) { target = i; break; }
          }
        }
        if (target < 0) target = grid.findIndex((v, i) => v !== p.solution[i]);
        if (target < 0) return;

        hinted = true;
        save(snapshot());
        sel = target;
        grid[target] = p.solution[target];
        notes[target] = 0;
        for (const j of p.peers[target]) notes[j] &= ~(1 << grid[target]);
        Sound.place(grid[target]);
        render();
        cells[target].classList.remove("is-hint");
        void cells[target].offsetWidth;
        cells[target].classList.add("is-hint");
        if (solved(p, grid)) finish();
      }

      function finish() {
        if (ctx.done) return;
        if (mistakes === 0) ctx.achieve("bez-bledu");
        if (!hinted && key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (ctx.undos === 0 && mistakes === 0 && key !== "easy") ctx.achieve("bez-cofania");
        if (!hinted && key === "hard" && ctx.time < 240) ctx.achieve("architekt-enklaw");
        ctx.win(mistakes === 0 ? "Wszystkie enklawy wypełnione bezbłędnie." : `Pomyłki: ${mistakes}.`);
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b) return;
        sel = +b.dataset.i;
        render();
      });

      cellKeys(ctx, {
        cols: n,
        rows: n,
        max: MAX_GROUP,
        get: () => sel,
        set: (i) => {
          sel = i;
          render();
          cells[i].focus({ preventScroll: true });
        },
        onDigit: (d) => put(d, controls.isNotes()),
        keys: controls.keys,
      });

      const ring = selectionRing(board);

      function renderCell(b, i, val, mask, regDone) {
        const head = headOf.get(i) || 0;
        const stateKey = `${val}:${mask}:${head}:${regDone ? 1 : 0}`;
        if (b.dataset.ck === stateKey) return;
        b.dataset.ck = stateKey;
        b.replaceChildren();
        if (head) {
          const lab = el("span", "en-lab", head);
          if (regDone) lab.classList.add("ok");
          b.append(lab);
        }
        if (val) {
          b.append(el("span", "val", val));
        } else if (mask) {
          const m = el("span", "notes");
          m.style.setProperty("--nc", 3);
          for (let d = 1; d <= p.maxVal[i]; d++) {
            m.append(el("i", "", mask & (1 << d) ? d : ""));
          }
          b.append(m);
        }
      }

      function render() {
        if (sel >= 0) ring(cells[sel]);
        const bad = conflicts(p, grid);
        const sameReg = sel >= 0 ? p.owner[sel] : -1;
        const selVal = sel >= 0 ? grid[sel] : 0;
        const regDone = p.regions.map((_, k) => isRegionDone(k, bad));

        cells.forEach((b, i) => {
          const k = p.owner[i];
          renderCell(b, i, grid[i], notes[i], regDone[k]);
          b.classList.toggle("is-lock", !!p.given[i]);
          b.classList.toggle("is-sel", i === sel);
          b.classList.toggle("is-bad", bad.has(i));
          b.classList.toggle("en-reg", k === sameReg && i !== sel);
          b.classList.toggle("en-same", i !== sel && selVal > 0 && grid[i] === selVal);
          b.classList.toggle("en-done", regDone[k]);
          b.classList.toggle("cursor", i === sel);
        });

        const filled = grid.filter((v) => v > 0).length;
        const doneRegs = regDone.filter(Boolean).length;
        doneEl.set(`${filled} z ${N}`, filled / N, `Enklawy: ${doneRegs} z ${p.regions.length}`);
        livesEl.set(Math.max(0, maxMistakes - mistakes));
        ctx.progress(filled / N);
        controls.update();
      }

      render();
    },
  });
}
