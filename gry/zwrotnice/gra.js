// Zwrotnice: po planszy biegną tory w wybranych rzędach i kolumnach. Na przecięciach są zwrotnice.
// Jasna oś zwrotnicy to tor główny: pociąg jadący nią jedzie prosto, a pociąg z boku skręca w prawo.
// Każdy pociąg ma dojechać do stacji w swoim kolorze i kształcie.
{
  const VEC = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // prawo, dół, lewo, góra
  const RIGHT = 0, DOWN = 1, LEFT = 2, UP = 3;
  const SIDES = [3, 4, 6, 4]; // trójkąt, kwadrat, sześciokąt, romb
  const ROT = [-Math.PI / 2, Math.PI / 4, 0, 0];
  const MAX_LAYOUTS = 30;

  // Przejazd pociągu: na zwrotnicy o osi zgodnej z kierunkiem jazdy pociąg jedzie prosto,
  // a na zwrotnicy o drugiej osi skręca w prawo. Stan 0 = oś pozioma, stan 1 = oś pionowa.
  function ride(n, m, idx, state, r, c, dir) {
    const path = [[r, c]];
    const seen = new Map();
    let uses = 0;
    for (;;) {
      const key = ((r * m + c) << 2) | dir;
      if (seen.has(key)) {
        const at = seen.get(key);
        return { path, exit: null, uses, dir, loop: path.slice(at) };
      }
      seen.set(key, path.length - 1);
      const s = idx[r * m + c];
      if (s >= 0) {
        uses++;
        if (state[s] !== dir % 2) dir = (dir + 1) % 4;
      }
      const [dr, dc] = VEC[dir];
      const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) return { path, exit: [r, c], uses, dir, loop: null };
      r = r2; c = c2; path.push([r, c]);
    }
  }

  function stateOf(mask, k) {
    const s = new Int8Array(k);
    for (let i = 0; i < k; i++) s[i] = (mask >> i) & 1;
    return s;
  }

  // Losuje rzędy i kolumny z torami i wypisuje wszystkie wejścia na planszę.
  function layout(n, m, nRows, nCols) {
    const rowPool = shuffle([...Array(n).keys()]).slice(0, nRows).sort((a, b) => a - b);
    const colPool = shuffle([...Array(m).keys()]).slice(0, nCols).sort((a, b) => a - b);
    const sw = [], idx = new Int8Array(n * m).fill(-1);
    for (const r of rowPool) for (const c of colPool) { idx[r * m + c] = sw.length; sw.push([r, c]); }
    const ends = [];
    for (const r of rowPool) { ends.push({ r, c: 0, dir: RIGHT }); ends.push({ r, c: m - 1, dir: LEFT }); }
    for (const c of colPool) { ends.push({ r: 0, c, dir: DOWN }); ends.push({ r: n - 1, c, dir: UP }); }
    return { rowPool, colPool, sw, idx, ends };
  }

  // Dla każdego ustawienia zwrotnic zapisuje, dokąd wyjeżdża pociąg z każdego wejścia.
  // Dzięki temu można szybko sprawdzić rozwiązanie i jego jednoznaczność.
  function exits(n, m, idx, ends, k) {
    const count = 1 << k, E = ends.length;
    const table = new Int16Array(count * E);
    for (let mask = 0; mask < count; mask++) {
      const state = stateOf(mask, k);
      for (let e = 0; e < E; e++) {
        const en = ends[e];
        const res = ride(n, m, idx, state, en.r, en.c, en.dir);
        table[mask * E + e] = res.exit ? res.exit[0] * m + res.exit[1] : -1;
      }
    }
    return table;
  }

  function allArrive(table, E, selected, mask) {
    const base = mask * E;
    for (let i = 0; i < selected.length; i++) if (table[base + selected[i].e] !== selected[i].outKey) return false;
    return true;
  }

  // Szuka dokładnie `count` pociągów o różnych wejściach i stacjach, które łącznie mijają wszystkie zwrotnice.
  function choose(candidates, count, test) {
    const picked = [], usedIn = new Set(), usedOut = new Set();
    let cover = 0;
    const suffix = new Array(candidates.length + 1).fill(0);
    for (let i = candidates.length - 1; i >= 0; i--) suffix[i] = suffix[i + 1] | candidates[i].cover;
    function walk(start) {
      if (picked.length === count) return test(picked) ? picked.slice() : null;
      if ((cover | suffix[start]) !== suffix[0]) return null;
      for (let i = start; i < candidates.length; i++) {
        const x = candidates[i];
        if (usedIn.has(x.inKey) || usedOut.has(x.outKey) || usedIn.has(x.outKey) || usedOut.has(x.inKey)) continue;
        const before = cover;
        picked.push(x); usedIn.add(x.inKey); usedOut.add(x.outKey); cover |= x.cover;
        const found = walk(i + 1);
        if (found) return found;
        cover = before; usedIn.delete(x.inKey); usedOut.delete(x.outKey); picked.pop();
      }
      return null;
    }
    return walk(0);
  }

  function build(n, m, nRows, nCols, count, unique) {
    for (let attempt = 0; attempt < MAX_LAYOUTS; attempt++) {
      const { rowPool, colPool, sw, idx, ends } = layout(n, m, nRows, nCols);
      const k = sw.length, E = ends.length;
      if (k < 1 || k > 15) continue;
      const all = (1 << k) - 1, states = 1 << k;
      const table = exits(n, m, idx, ends, k);
      const masks = shuffle([...Array(states).keys()]);
      for (const mask of masks) {
        const state = stateOf(mask, k);
        const candidates = [];
        for (let e = 0; e < E; e++) {
          const en = ends[e];
          const res = ride(n, m, idx, state, en.r, en.c, en.dir);
          if (!res.exit || res.uses === 0) continue;
          if (res.exit[0] === en.r && res.exit[1] === en.c) continue;
          let cover = 0;
          const keys = new Set();
          for (const [r, c] of res.path) {
            keys.add(r * m + c);
            const s = idx[r * m + c];
            if (s >= 0) cover |= 1 << s;
          }
          candidates.push({
            e, from: [en.r, en.c, en.dir], to: res.exit, path: res.path, uses: res.uses, cover, keys,
            inKey: en.r * m + en.c, outKey: res.exit[0] * m + res.exit[1],
          });
        }
        if (candidates.length < count) continue;
        shuffle(candidates);
        const picked = choose(candidates, count, (selected) => {
          let union = 0;
          const ins = new Set(), outs = new Set();
          for (const x of selected) {
            if (ins.has(x.inKey) || outs.has(x.outKey) || ins.has(x.outKey) || outs.has(x.inKey)) return false;
            ins.add(x.inKey); outs.add(x.outKey); union |= x.cover;
          }
          if (union !== all) return false;
          // trasa nie przechodzi przez wjazd ani stację innego pociągu
          for (let i = 0; i < selected.length; i++) {
            for (let j = 0; j < selected.length; j++) {
              if (i === j) continue;
              if (selected[i].keys.has(selected[j].inKey) || selected[i].keys.has(selected[j].outKey)) return false;
            }
          }
          // każda zwrotnica musi mieć znaczenie: jej przełączenie psuje trasę
          for (let i = 0; i < k; i++) if (allArrive(table, E, selected, mask ^ (1 << i))) return false;
          if (unique) {
            let solutions = 0;
            for (let m2 = 0; m2 < states; m2++) {
              if (allArrive(table, E, selected, m2) && ++solutions > 1) break;
            }
            if (solutions !== 1) return false;
          }
          return true;
        });
        if (!picked) continue;

        // Start: żaden pociąg nie może dojeżdżać do stacji, a układ ma być oddalony o `count + 1`
        // przełączeń od rozwiązania (łatwy poziom zaczyna się bliżej, trudny dalej).
        const target = Math.min(k, count + 1);
        let startMask = -1, startScore = count + 1, startDelta = Infinity, startDist = -1;
        for (let m2 = 0; m2 < states; m2++) {
          const base = m2 * E;
          let sc = 0;
          for (const x of picked) if (table[base + x.e] === x.outKey) sc++;
          if (sc >= count) continue; // partia nie może zaczynać się od rozwiązania
          let dist = 0;
          for (let i = 0; i < k; i++) if (((m2 ^ mask) >> i) & 1) dist++;
          const delta = Math.abs(dist - target);
          if (sc < startScore || (sc === startScore && (delta < startDelta || (delta === startDelta && dist > startDist)))) {
            startMask = m2; startScore = sc; startDelta = delta; startDist = dist;
          }
        }
        if (startMask < 0 || startScore !== 0) continue;

        return {
          n, m, rowPool, colPool, sw, idx, ends,
          state,
          start: stateOf(startMask, k),
          trains: picked.map((x) => ({ from: x.from, to: x.to, path: x.path, uses: x.uses })),
          masks: { solution: mask, start: startMask },
          unique,
        };
      }
    }
    return null;
  }

  // Najpierw próbuje ułożyć zagadkę z jednym rozwiązaniem, potem dopuszcza inne.
  function generate(n, m, nRows, nCols, count) {
    return build(n, m, nRows, nCols, count, true) || build(n, m, nRows, nCols, count, false);
  }

  function puzzle(n, m, nRows, nCols, count) {
    return generate(n, m, nRows, nCols, count);
  }

  // Ile pociągów dojedzie do stacji przy danym ustawieniu zwrotnic.
  function score(p, state) {
    return p.trains.filter((tr) => {
      const res = ride(p.n, p.m, p.idx, state, tr.from[0], tr.from[1], tr.from[2]);
      return res.exit && res.exit[0] === tr.to[0] && res.exit[1] === tr.to[1];
    }).length;
  }

  if (typeof module !== "undefined") module.exports = { generate, puzzle, ride, score, RIGHT, DOWN, LEFT, UP };

  if (typeof registerGame !== "undefined") registerGame({
    id: "zwrotnice",
    cat: "lamiglowki",
    name: "Zwrotnice",
    author: "DeepSeek V4.1 Flash",
    desc: "Przestawiaj zwrotnice na torach, aby każdy pociąg dojechał do stacji w swoim kolorze i kształcie.",
    color: "#00695c",
    ink: "#ffffff",
    glyph: ["#....", "###.#", "#.#.#", "..#.#", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, n: 5, m: 5, rowRail: 2, colRail: 2, trains: 2, tries: 5 },
      { key: "medium", name: "Średni", points: 25, n: 6, m: 6, rowRail: 2, colRail: 3, trains: 3, tries: 4 },
      { key: "hard", name: "Trudny", points: 50, n: 7, m: 7, rowRail: 3, colRail: 3, trains: 4, tries: 3 },
    ],
    rules: [
      "Po planszy biegną tory w wybranych rzędach i kolumnach, a na ich przecięciach leżą zwrotnice.",
      "Jasna oś zwrotnicy to tor główny: pociąg jadący nią jedzie prosto, a pociąg z bocznego toru skręca w prawo; przerywane łuki pokazują ten skręt.",
      "Kliknij zwrotnicę albo naciśnij jej numer, aby przełączyć oś. Kształty w panelu pokazują trasę wybranego pociągu i czy dojedzie do stacji.",
      "Każdy pociąg ma dojechać do stacji w swoim kolorze i kształcie. Pełny kształt ze strzałką to wjazd, a kształt w obwódce to stacja. Przycisk „Wypuść pociągi” sprawdza całe ustawienie.",
      "Nieudane próby są ograniczone. Gdy się skończą, partia kończy się przegraną.",
    ],
    achievements: [
      { id: "pierwsza-trasa", name: "Pierwsza trasa", desc: "Wygraj poziom łatwy bez nieudanej próby.", points: 10 },
      { id: "bez-wahania", name: "Bez wahania", desc: "Wygraj poziom łatwy w mniej niż 40 sekund.", points: 10 },
      { id: "maszynista", name: "Maszynista", desc: "Wygraj poziom średni bez nieudanej próby.", points: 25 },
      { id: "dyspozytor", name: "Dyspozytor", desc: "Wygraj poziom trudny bez nieudanej próby.", points: 50 },
      { id: "bez-podgladu", name: "Bez podglądu", desc: "Wygraj dowolny poziom, nie pokazując trasy żadnego pociągu.", points: 25 },
      { id: "bez-cofania", name: "Bez cofania", desc: "Wygraj dowolny poziom bez cofania ruchu.", points: 10 },
      { id: "ostatnia-szansa", name: "Ostatnia szansa", desc: "Wygraj w ostatniej dozwolonej próbie.", points: 25 },
    ],

    mount(board, ctx) {
      const { n, m, tries } = ctx.level;
      const p = puzzle(n, m, ctx.level.rowRail, ctx.level.colRail, ctx.level.trains);
      if (!p) return ctx.lose("Nie udało się ułożyć torów", "Spróbuj jeszcze raz.");
      const GAP = 0.06, NS = "http://www.w3.org/2000/svg";
      const state = Int8Array.from(p.start);
      const trainClass = (k) => `zw-c${(k % 4) + 1}`;
      const colorName = ["niebieski", "pomarańczowy", "fioletowy", "różowy"];
      const shapeName = ["trójkąt", "kwadrat", "sześciokąt", "romb"];
      const poly = (x, y, rad, sides, rot) => {
        const out = [];
        for (let i = 0; i < sides; i++) {
          const a = rot + (i * 2 * Math.PI) / sides;
          out.push(`${(x + rad * Math.cos(a)).toFixed(3)},${(y + rad * Math.sin(a)).toFixed(3)}`);
        }
        return out.join(" ");
      };
      let failed = 0, busy = false, raf = 0, finishTimer = 0, selected = -1, previewUsed = false, loopWarned = false;

      const cells = gridCells(board, m, n, "zw", {
        gap: GAP,
        label: (r, c) => {
          const i = p.idx[r * m + c];
          return i < 0 ? "Tor" : `Zwrotnica ${i + 1}, oś ${state[i] ? "pionowa" : "pozioma"}`;
        },
      });
      board.setAttribute("role", "group");
      board.setAttribute("aria-label", `Plansza ${n} na ${m} z ${p.sw.length} zwrotnicami`);
      cells.forEach((cell, at) => {
        const i = p.idx[at];
        if (i < 0) {
          cell.tabIndex = -1;
          cell.setAttribute("aria-hidden", "true");
          cell.setAttribute("aria-label", "Tor");
        } else {
          cell.classList.add("sw");
          cell.dataset.sw = i;
        }
      });

      const W = m + GAP * (m + 1), H = n + GAP * (n + 1);
      const cx = (c) => GAP + c * (1 + GAP) + 0.5;
      const cy = (r) => GAP + r * (1 + GAP) + 0.5;

      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.setAttribute("class", "zw-svg");
      svg.setAttribute("aria-hidden", "true");
      const group = (cls) => { const g = document.createElementNS(NS, "g"); if (cls) g.setAttribute("class", cls); svg.append(g); return g; };
      const mk = (parent, tag, attrs) => {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        parent.append(e);
        return e;
      };

      const beds = group("zw-beds"), ties = group("zw-ties"), rails = group("zw-rails");
      const trailGroup = group("zw-trails");
      const switches = group("zw-switches"), marks = group("zw-marks");
      const previewGroup = group("zw-preview-group"), trainGroup = group("zw-trains");
      previewGroup.style.display = "none";

      const PREVIEW_HINT = "Wybierz kształt, aby zobaczyć trasę pociągu.";

      // Podkład, podkłady i szyna. Przy zwrotnicach podkłady się nie nakładają na symbol.
      for (const r of p.rowPool) {
        mk(beds, "line", { x1: 0, y1: cy(r), x2: W, y2: cy(r), class: "zw-bed" });
        for (let x = 0.18; x < W - 0.1; x += 0.28) {
          if (p.colPool.some((c) => Math.abs(cx(c) - x) < 0.34)) continue;
          mk(ties, "line", { x1: x, y1: cy(r) - 0.1, x2: x, y2: cy(r) + 0.1, class: "zw-tie" });
        }
        mk(rails, "line", { x1: 0, y1: cy(r), x2: W, y2: cy(r), class: "zw-rail" });
      }
      for (const c of p.colPool) {
        mk(beds, "line", { x1: cx(c), y1: 0, x2: cx(c), y2: H, class: "zw-bed" });
        for (let y = 0.18; y < H - 0.1; y += 0.28) {
          if (p.rowPool.some((r) => Math.abs(cy(r) - y) < 0.34)) continue;
          mk(ties, "line", { x1: cx(c) - 0.1, y1: y, x2: cx(c) + 0.1, y2: y, class: "zw-tie" });
        }
        mk(rails, "line", { x1: cx(c), y1: 0, x2: cx(c), y2: H, class: "zw-rail" });
      }

      // Zwrotnica: obie osie oraz dwa łuki skrętu w prawo. Łuki zmieniają się razem z osią główną:
      // przy poziomej skręcają pociągi z góry i z dołu, przy pionowej z lewej i z prawej.
      const swTicks = p.sw.map(([r, c], i) => {
        const x = cx(c), y = cy(r);
        const g = mk(switches, "g", { class: "zw-sw", "data-sw": i });
        mk(g, "line", { x1: x - 0.47, y1: y, x2: x + 0.47, y2: y, class: "zw-cross" });
        mk(g, "line", { x1: x, y1: y - 0.47, x2: x, y2: y + 0.47, class: "zw-cross" });
        const armsH = mk(g, "g", { class: "zw-branches zw-branches-h" });
        mk(armsH, "path", { d: `M ${x} ${y - 0.47} L ${x} ${y - 0.4} Q ${x} ${y} ${x - 0.4} ${y} L ${x - 0.47} ${y}`, class: "zw-branch" });
        mk(armsH, "path", { d: `M ${x} ${y + 0.47} L ${x} ${y + 0.4} Q ${x} ${y} ${x + 0.4} ${y} L ${x + 0.47} ${y}`, class: "zw-branch" });
        const armsV = mk(g, "g", { class: "zw-branches zw-branches-v" });
        mk(armsV, "path", { d: `M ${x - 0.47} ${y} L ${x - 0.4} ${y} Q ${x} ${y} ${x} ${y + 0.4} L ${x} ${y + 0.47}`, class: "zw-branch" });
        mk(armsV, "path", { d: `M ${x + 0.47} ${y} L ${x + 0.4} ${y} Q ${x} ${y} ${x} ${y - 0.4} L ${x} ${y - 0.47}`, class: "zw-branch" });
        armsV.style.opacity = "0";
        const h = mk(g, "line", { x1: x - 0.47, y1: y, x2: x + 0.47, y2: y, class: "zw-live" });
        const v = mk(g, "line", { x1: x, y1: y - 0.47, x2: x, y2: y + 0.47, class: "zw-live" });
        const num = mk(g, "text", { x: x + 0.28, y: y - 0.28, class: "zw-num", "font-size": "0.23" });
        num.textContent = String(i + 1);
        return { h, v, g, armsH, armsV };
      });

      // Wejścia i stacje pociągów. Kształt i kolor powtarzają się po obu stronach trasy.
      const markIn = p.trains.map((tr, k) => {
        const [r, c, dir] = tr.from;
        const [dr, dc] = VEC[dir];
        const x = cx(c) - dc * 0.3, y = cy(r) - dr * 0.3;
        const g = mk(marks, "g", { class: `zw-mark zw-in ${trainClass(k)}`, "data-in": `${r},${c},${dir}` });
        const shape = mk(g, "polygon", { points: poly(x, y, 0.21, SIDES[k % 4], ROT[k % 4]), class: "zw-shape" });
        const ax = cx(c) - dc * 0.52, ay = cy(r) - dr * 0.52;
        const arrow = mk(g, "polygon", {
          points: [
            `${(ax + dc * 0.1).toFixed(3)},${(ay + dr * 0.1).toFixed(3)}`,
            `${(ax - dc * 0.03 - dr * 0.055).toFixed(3)},${(ay - dr * 0.03 + dc * 0.055).toFixed(3)}`,
            `${(ax - dc * 0.03 + dr * 0.055).toFixed(3)},${(ay - dr * 0.03 - dc * 0.055).toFixed(3)}`,
          ].join(" "),
          class: "zw-arrow",
        });
        return { g, shape, arrow };
      });

      const markOut = p.trains.map((tr, k) => {
        const [r, c] = tr.to;
        const path = tr.path;
        const [pr, pc] = path[path.length - 2] || tr.from;
        const dr = Math.sign(r - pr), dc = Math.sign(c - pc);
        const x = cx(c) + dc * 0.2, y = cy(r) + dr * 0.2;
        const g = mk(marks, "g", { class: `zw-mark zw-out ${trainClass(k)}`, "data-out": `${r},${c}` });
        mk(g, "circle", { cx: x, cy: y, r: 0.36, class: "zw-out-halo" });
        const ring = mk(g, "polygon", { points: poly(x, y, 0.27, SIDES[k % 4], ROT[k % 4]), class: "zw-out-ring" });
        const dot = mk(g, "circle", { cx: x, cy: y, r: 0.08, class: "zw-out-dot" });
        return { g, ring, dot };
      });

      const trail = p.trains.map((tr, k) => {
        const line = mk(trailGroup, "polyline", { class: `zw-trail ${trainClass(k)}` });
        line.style.display = "none";
        return line;
      });

      const previewHalo = mk(previewGroup, "polyline", { class: "zw-preview-halo" });
      const previewLine = mk(previewGroup, "polyline", { class: "zw-preview-line" });
      const previewHaloDot = mk(previewGroup, "circle", { r: 0.16, class: "zw-preview-halo-dot" });
      const previewDot = mk(previewGroup, "circle", { r: 0.11, class: "zw-preview-dot" });

      const trainDots = p.trains.map((tr, k) => {
        const dot = mk(trainGroup, "circle", { r: 0.17, class: `zw-train ${trainClass(k)}` });
        dot.setAttribute("cx", -1);
        dot.setAttribute("cy", -1);
        dot.style.display = "none";
        return dot;
      });
      board.append(svg);

      const arrEl = statBlock(ctx, "Na stacji", { meter: true });
      const leftEl = statBlock(ctx, "Nieudane próby", { small: true });
      leftEl.set(`0 z ${tries}`, null, "");

      const save = ctx.undoable((snap) => {
        if (busy || ctx.done) return;
        state.set(snap);
        clearResult();
        render();
      });

      const releaseBtn = button("Wypuść pociągi", "btn wide", release);
      const randomBtn = button("Losuj zwrotnice", "btn-ghost wide", randomize);

      const pickRow = el("div", "zw-picks");
      const pickBtns = p.trains.map((tr, k) => {
        const b = button("", `zw-pick ${trainClass(k)}`, () => selectTrain(k));
        b.setAttribute("aria-label", `Pokaż trasę pociągu ${k + 1}: ${shapeName[k % 4]} w kolorze ${colorName[k % 4]}`);
        b.setAttribute("aria-pressed", "false");
        const icon = document.createElementNS(NS, "svg");
        icon.setAttribute("viewBox", "-1 -1 2 2");
        icon.setAttribute("aria-hidden", "true");
        icon.append(mk(icon, "polygon", { points: poly(0, 0, 0.55, SIDES[k % 4], ROT[k % 4]), class: "zw-pick-shape" }));
        b.append(icon);
        pickRow.append(b);
        return b;
      });
      const previewNote = el("p", "panel-note", PREVIEW_HINT);
      previewNote.setAttribute("aria-live", "polite");
      ctx.panel.append(panelBlock("Podgląd trasy", pickRow, previewNote));
      ctx.panel.append(panelBlock("", releaseBtn, randomBtn));

      function setBusy(on) {
        releaseBtn.disabled = on;
        randomBtn.disabled = on;
        pickBtns.forEach((b) => { b.disabled = on; });
        board.classList.toggle("zw-busy", on);
      }

      function clearResult() {
        arrEl.set(`0 z ${p.trains.length}`, 0, "");
        ctx.progress(0);
        markOut.forEach((o) => {
          o.g.classList.remove("good", "bad");
        });
        trail.forEach((line) => {
          line.style.display = "none";
          line.setAttribute("points", "");
          line.classList.remove("loop");
        });
        trainDots.forEach((d) => {
          d.setAttribute("cx", -1);
          d.setAttribute("cy", -1);
          d.style.display = "none";
        });
      }

      function clearSelection() {
        selected = -1;
        pickBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
        markIn.forEach((o) => o.g.classList.remove("sel"));
        markOut.forEach((o) => o.g.classList.remove("sel"));
        previewGroup.style.display = "none";
        previewNote.textContent = PREVIEW_HINT;
      }

      function selectTrain(k) {
        if (ctx.done || busy) return;
        if (selected === k) {
          clearSelection();
          Sound.tap();
          return;
        }
        selected = k;
        previewUsed = true;
        pickBtns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === selected)));
        markIn.forEach((o, i) => o.g.classList.toggle("sel", i === selected));
        markOut.forEach((o, i) => o.g.classList.toggle("sel", i === selected));
        Sound.tap();
        drawPreview();
      }

      function drawPreview() {
        if (selected < 0) {
          previewGroup.style.display = "none";
          previewNote.textContent = PREVIEW_HINT;
          return;
        }
        const tr = p.trains[selected];
        const res = ride(n, m, p.idx, state, tr.from[0], tr.from[1], tr.from[2]);
        if (!res) {
          previewGroup.style.display = "none";
          previewNote.textContent = PREVIEW_HINT;
          return;
        }
        previewGroup.style.display = "";
        previewGroup.setAttribute("class", `zw-preview-group ${trainClass(selected)}`);
        const pts = res.path.map(([r, c]) => `${cx(c).toFixed(3)},${cy(r).toFixed(3)}`).join(" ");
        previewHalo.setAttribute("points", pts);
        previewLine.setAttribute("points", pts);
        const at = res.exit || res.path[res.path.length - 1];
        previewHaloDot.setAttribute("cx", cx(at[1]));
        previewHaloDot.setAttribute("cy", cy(at[0]));
        previewDot.setAttribute("cx", cx(at[1]));
        previewDot.setAttribute("cy", cy(at[0]));
        const good = !!res.exit && res.exit[0] === tr.to[0] && res.exit[1] === tr.to[1];
        previewLine.classList.toggle("good", good);
        previewLine.classList.toggle("loop", !!res.loop);
        previewDot.classList.toggle("good", good);
        previewDot.classList.toggle("loop", !!res.loop);
        const who = `${colorName[selected % 4]} ${shapeName[selected % 4]}`;
        const name = who.charAt(0).toUpperCase() + who.slice(1);
        if (res.loop) previewNote.textContent = `${name} krąży po torach i nie dojedzie do stacji.`;
        else if (good) previewNote.textContent = `${name} dojedzie do swojej stacji.`;
        else previewNote.textContent = `${name} nie dojedzie do stacji.`;
        if (res.loop && !loopWarned) {
          loopWarned = true;
          ctx.toast("Ten pociąg krąży po torach i nie dojedzie do stacji.");
        }
      }

      function render() {
        swTicks.forEach((s, i) => {
          const horizontal = state[i] === 0;
          s.h.classList.toggle("on", horizontal);
          s.v.classList.toggle("on", !horizontal);
          s.armsH.style.opacity = horizontal ? "1" : "0";
          s.armsV.style.opacity = horizontal ? "0" : "1";
          const cell = cells[p.sw[i][0] * m + p.sw[i][1]];
          cell.setAttribute("aria-pressed", String(!horizontal));
          cell.setAttribute("aria-label", `Zwrotnica ${i + 1}, oś ${horizontal ? "pozioma" : "pionowa"}`);
        });
        drawPreview();
      }

      function toggle(i) {
        if (ctx.done || busy || i < 0 || i >= state.length) return;
        save(Int8Array.from(state));
        state[i] ^= 1;
        Sound.place(1);
        clearResult();
        render();
      }

      function randomize() {
        if (ctx.done || busy) return;
        save(Int8Array.from(state));
        clearResult();
        let guard = 0;
        do {
          for (let i = 0; i < state.length; i++) state[i] = rnd(2);
          guard++;
        } while (guard < 40 && score(p, state) === p.trains.length);
        while (score(p, state) === p.trains.length && guard++ < 80) state[rnd(state.length)] ^= 1;
        Sound.line();
        render();
      }

      function release() {
        if (ctx.done || busy) return;
        busy = true;
        setBusy(true);
        if (selected >= 0) clearSelection();
        clearResult();
        const res = p.trains.map((tr) => ride(n, m, p.idx, state, tr.from[0], tr.from[1], tr.from[2]));
        const ok = res.map((R, k) => !!R.exit && R.exit[0] === p.trains[k].to[0] && R.exit[1] === p.trains[k].to[1]);
        const longest = Math.max(...res.map((R) => (R.exit ? R.path.length : R.loop.length)));
        const dur = Math.min(2400, 850 + longest * 70);
        const stagger = 80;
        const total = dur + stagger * (p.trains.length - 1);
        let t0 = 0;
        const frame = (now) => {
          if (!t0) t0 = now;
          const elapsed = now - t0;
          res.forEach((R, i) => {
            if (!R) return;
            const local = Math.max(0, Math.min(1, (elapsed - i * stagger) / dur));
            if (R.exit) {
              const span = R.path.length - 1;
              const at = local * span;
              const a = Math.min(span, Math.floor(at)), b = Math.min(span, a + 1), f = at - a;
              const p0 = R.path[a], p1 = R.path[b];
              const x = cx(p0[1]) + (cx(p1[1]) - cx(p0[1])) * f;
              const y = cy(p0[0]) + (cy(p1[0]) - cy(p0[0])) * f;
              trainDots[i].setAttribute("cx", x);
              trainDots[i].setAttribute("cy", y);
              trainDots[i].style.display = "";
              const points = [];
              for (let j = 0; j <= a; j++) points.push(`${cx(R.path[j][1])},${cy(R.path[j][0])}`);
              points.push(`${x},${y}`);
              trail[i].setAttribute("points", points.join(" "));
              trail[i].style.display = "";
            } else {
              const span = R.loop.length - 1;
              const at = span > 0 ? (local * 2 * span) % span : 0;
              const a = Math.floor(at), b = Math.min(span, a + 1), f = at - a;
              const p0 = R.loop[a], p1 = R.loop[b];
              const x = cx(p0[1]) + (cx(p1[1]) - cx(p0[1])) * f;
              const y = cy(p0[0]) + (cy(p1[0]) - cy(p0[0])) * f;
              trainDots[i].setAttribute("cx", x);
              trainDots[i].setAttribute("cy", y);
              trainDots[i].style.display = "";
              trail[i].setAttribute("points", R.loop.map(([rr, cc]) => `${cx(cc)},${cy(rr)}`).join(" "));
              trail[i].classList.add("loop");
              trail[i].style.display = "";
            }
          });
          if (elapsed < total) {
            raf = requestAnimationFrame(frame);
            return;
          }
          trainDots.forEach((d) => {
            d.setAttribute("cx", -1);
            d.setAttribute("cy", -1);
            d.style.display = "none";
          });
          const arrived = ok.filter(Boolean).length;
          arrEl.set(`${arrived} z ${p.trains.length}`, arrived / p.trains.length, "");
          ctx.progress(arrived / p.trains.length);
          markOut.forEach((o, i) => o.g.classList.add(ok[i] ? "good" : "bad"));
          if (arrived === p.trains.length) {
            finishTimer = setTimeout(() => { if (!ctx.done) finish(); }, 220);
            return;
          }
          busy = false;
          setBusy(false);
          failed++;
          leftEl.set(`${failed} z ${tries}`, null, "");
          if (failed >= tries) ctx.lose("Pociągi się rozjechały", `Do stacji dojechało ${arrived} z ${p.trains.length} pociągów.`);
          else {
            Sound.error();
            ctx.toast(`Do stacji dojechało ${arrived} z ${p.trains.length} pociągów. Spróbuj inaczej.`);
          }
        };
        raf = requestAnimationFrame(frame);
      }

      function finish() {
        if (ctx.done) return;
        if (failed === 0 && n === 5) ctx.achieve("pierwsza-trasa");
        if (n === 5 && ctx.time < 40) ctx.achieve("bez-wahania");
        if (failed === 0 && n === 6) ctx.achieve("maszynista");
        if (failed === 0 && n === 7) ctx.achieve("dyspozytor");
        if (!previewUsed) ctx.achieve("bez-podgladu");
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        if (failed >= tries - 1) ctx.achieve("ostatnia-szansa");
        ctx.win("Wszystkie pociągi dojechały do swoich stacji.");
      }

      p.sw.forEach(([r, c], i) => {
        const cell = cells[r * m + c];
        const tick = swTicks[i];
        const hot = () => tick.g.classList.add("hot");
        const cold = () => tick.g.classList.remove("hot");
        cell.addEventListener("pointerenter", hot);
        cell.addEventListener("pointerleave", cold);
        cell.addEventListener("focus", hot);
        cell.addEventListener("blur", cold);
      });

      board.addEventListener("click", (e) => {
        const cell = e.target.closest(".zw .gb-cell");
        if (!cell) return;
        const i = p.idx[+cell.dataset.i];
        if (!(i >= 0)) return;
        toggle(i);
      });
      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (e.target.closest?.("input, textarea, select")) return;
        if (/^[1-9]$/.test(e.key)) {
          toggle(+e.key - 1);
          e.preventDefault();
        } else if (e.key === "Escape" && selected >= 0) {
          selectTrain(selected);
          e.preventDefault();
        }
      });
      ctx.onStop(() => {
        cancelAnimationFrame(raf);
        clearTimeout(finishTimer);
      });

      clearResult();
      setBusy(false);
      render();
    },
  });
}
