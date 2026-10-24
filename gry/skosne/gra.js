// Skośne: ukośniki w polach, cyfry w węzłach, bez pętli (Gokigen Naname).
{
  const SL = 1, SR = 2; // \  /

  function ends(n, r, c, t) {
    const V = n + 1;
    return t === SL ? [r * V + c, (r + 1) * V + c + 1] : [r * V + c + 1, (r + 1) * V + c];
  }

  function degrees(n, grid) {
    const deg = new Int8Array((n + 1) * (n + 1));
    for (let k = 0; k < n * n; k++) {
      if (!grid[k]) continue;
      const [a, b] = ends(n, (k / n) | 0, k % n, grid[k]);
      deg[a]++; deg[b]++;
    }
    return deg;
  }

  function hasLoop(n, grid) {
    const V = (n + 1) * (n + 1);
    const p = Uint16Array.from({ length: V }, (_, i) => i);
    const find = (a) => { while (p[a] !== a) a = p[a]; return a; };
    for (let k = 0; k < n * n; k++) {
      if (!grid[k]) continue;
      const [a, b] = ends(n, (k / n) | 0, k % n, grid[k]);
      const fa = find(a), fb = find(b);
      if (fa === fb) return true;
      p[fb] = fa;
    }
    return false;
  }

  function cyclic(n, grid) {
    const out = [];
    for (let k = 0; k < n * n; k++) {
      if (!grid[k]) continue;
      const copy = grid.slice();
      copy[k] = 0;
      const [a, b] = ends(n, (k / n) | 0, k % n, grid[k]);
      const V = (n + 1) * (n + 1);
      const p = Uint16Array.from({ length: V }, (_, i) => i);
      const find = (x) => { while (p[x] !== x) x = p[x]; return x; };
      for (let j = 0; j < n * n; j++) {
        if (!copy[j]) continue;
        const [u, v] = ends(n, (j / n) | 0, j % n, copy[j]);
        const fu = find(u), fv = find(v);
        if (fu !== fv) p[fv] = fu;
      }
      if (find(a) === find(b)) out.push(k);
    }
    return out;
  }

  function touches(n, vr, vc) {
    const list = [];
    if (vr > 0 && vc > 0) list.push([(vr - 1) * n + (vc - 1), SL]);
    if (vr > 0 && vc < n) list.push([(vr - 1) * n + vc, SR]);
    if (vr < n && vc > 0) list.push([vr * n + (vc - 1), SR]);
    if (vr < n && vc < n) list.push([vr * n + vc, SL]);
    return list;
  }

  function remaining(n, grid, vr, vc) {
    let r = 0;
    for (const [k] of touches(n, vr, vc)) if (!grid[k]) r++;
    return r;
  }

  function okPartial(n, clues, grid, deg) {
    const V = n + 1;
    for (let i = 0; i < V * V; i++) {
      if (clues[i] < 0) continue;
      if (deg[i] > clues[i]) return false;
      if (deg[i] + remaining(n, grid, (i / V) | 0, i % V) < clues[i]) return false;
    }
    return true;
  }

  function faults(n, clues, grid) {
    const deg = degrees(n, grid), V = n + 1, loop = cyclic(n, grid);
    let over = 0, under = 0, ok = 0, total = 0;
    for (let i = 0; i < V * V; i++) {
      if (clues[i] < 0) continue;
      total++;
      const rem = remaining(n, grid, (i / V) | 0, i % V);
      if (deg[i] > clues[i]) over++;
      else if (deg[i] + rem < clues[i]) under++;
      else if (deg[i] === clues[i] && rem === 0) ok++;
    }
    return { loop, over, under, ok, total };
  }

  function solutions(n, clues, limit = 2, budget = 200000) {
    const cells = n * n, V = n + 1, Nv = V * V;
    const grid = new Int8Array(cells);
    const deg = new Int8Array(Nv);
    const parent = Uint16Array.from({ length: Nv }, (_, i) => i);
    let found = 0, first = null, nodes = 0;
    const find = (a) => { while (parent[a] !== a) a = parent[a]; return a; };
    function rec(k) {
      if (found >= limit || nodes > budget) return;
      nodes++;
      if (k === cells) {
        for (let i = 0; i < Nv; i++) if (clues[i] >= 0 && deg[i] !== clues[i]) return;
        if (!found) first = grid.slice();
        found++;
        return;
      }
      const r = (k / n) | 0, c = k % n;
      for (const t of [SL, SR]) {
        const [a, b] = ends(n, r, c, t);
        const fa = find(a), fb = find(b);
        if (fa === fb) continue;
        grid[k] = t;
        deg[a]++; deg[b]++;
        parent[fb] = fa;
        if (okPartial(n, clues, grid, deg)) rec(k + 1);
        parent[fb] = fb;
        deg[a]--; deg[b]--;
        grid[k] = 0;
        if (found >= limit || nodes > budget) return;
      }
    }
    rec(0);
    return { found: nodes > budget && found < 1 ? 2 : found, first };
  }

  function randomFill(n) {
    const grid = new Int8Array(n * n);
    const Nv = (n + 1) * (n + 1);
    const parent = Uint16Array.from({ length: Nv }, (_, i) => i);
    const find = (a) => { while (parent[a] !== a) a = parent[a]; return a; };
    for (const k of shuffle([...Array(n * n).keys()])) {
      const r = (k / n) | 0, c = k % n;
      const opts = [];
      for (const t of [SL, SR]) {
        const [a, b] = ends(n, r, c, t);
        if (find(a) !== find(b)) opts.push(t);
      }
      if (!opts.length) return null;
      const t = pick(opts);
      grid[k] = t;
      const [a, b] = ends(n, r, c, t);
      parent[find(b)] = find(a);
    }
    return grid;
  }

  function generate(n, hide) {
    for (let t = 0; t < 80; t++) {
      const sol = randomFill(n);
      if (!sol) continue;
      const full = degrees(n, sol);
      const clues = Int8Array.from(full);
      if (solutions(n, clues, 2).found !== 1) continue;
      let hid = 0;
      for (const i of shuffle([...Array((n + 1) * (n + 1)).keys()])) {
        if (hid >= hide) break;
        const keep = clues[i];
        clues[i] = -1;
        if (solutions(n, clues, 2).found === 1) hid++;
        else clues[i] = keep;
      }
      return { n, clues, sol };
    }
    return null;
  }

  function solved(n, clues, grid) {
    if (grid.some((v) => !v) || hasLoop(n, grid)) return false;
    const deg = degrees(n, grid);
    for (let i = 0; i < clues.length; i++) if (clues[i] >= 0 && deg[i] !== clues[i]) return false;
    return true;
  }

  if (typeof module !== "undefined") module.exports = { ends, degrees, hasLoop, cyclic, solutions, generate, solved, randomFill, faults };

  if (typeof registerGame !== "undefined") registerGame({
    id: "skosne",
    cat: "logiczne",
    name: "Skośne",
    author: "Cursor Grok 4.6",
    desc: "Wstaw ukośnik w każde pole. Cyfra w węźle mówi, ile linii się w nim styka. Zamkniętych pętli nie wolno.",
    color: "#7e22ce",
    ink: "#ffffff",
    glyph: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    levels: [
      { key: "easy", name: "4 × 4", points: 10, n: 4, hide: 6, lock: 3 },
      { key: "medium", name: "5 × 5", points: 25, n: 5, hide: 14, lock: 1 },
      { key: "hard", name: "6 × 6", points: 50, n: 6, hide: 22, lock: 0 },
    ],
    rules: [
      "Kliknij pole, aby wstawić albo obrócić ukośnik \\ / . Backspace albo „Wyczyść pole” je usuwa.",
      "Cyfra w węźle mówi, ile linii się w nim styka. Zielony węzeł jest już domknięty.",
      "Pętli nie wolno, a węzeł nie może mieć więcej linii niż jego cyfra. Złe ułożenie widać na czerwono.",
      "Wygrywasz, gdy cała siatka zgadza się z cyframi. Strzałki przesuwają kursor, spacja obraca ukośnik.",
    ],
    achievements: [
      { id: "szybki-start", name: "Szybki start", desc: "Rozwiąż planszę 4 × 4 w mniej niż 40 sekund.", points: 10 },
      { id: "bez-cofania", name: "Bez cofania", desc: "Wygraj bez użycia cofania.", points: 10 },
      { id: "bez-petli", name: "Bez pętli", desc: "Wygraj, ani razu nie zamykając pętli.", points: 25 },
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Wygraj średni lub trudny poziom bez podpowiedzi.", points: 25 },
      { id: "blyskawica", name: "Błyskawica", desc: "Wygraj trudny poziom w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, hide, key, lock } = ctx.level;
      const p = generate(n, hide) || generate(n, Math.max(0, hide - 6));
      const clues = p.clues, sol = p.sol;
      const grid = new Int8Array(n * n);
      const locked = new Uint8Array(n * n);
      for (const i of shuffle([...Array(n * n).keys()]).slice(0, lock || 0)) {
        grid[i] = sol[i];
        locked[i] = 1;
      }
      const s = { grid, cursor: grid.findIndex((v, i) => !locked[i]), hinted: false, looped: false };
      if (s.cursor < 0) s.cursor = 0;

      const cell = 10, m = 6.4, W = n * cell + 2 * m;
      const cv = svgBoard(board, W, W, { max: 84, cls: "paper sk-board" });
      cv.svg.setAttribute("aria-label", "Plansza ukośników");
      const gGrid = cv.add("g", { class: "sk-grid" });
      const gGhost = cv.add("g", { class: "sk-ghosts" });
      const gSlash = cv.add("g", { class: "sk-slash" });
      const gHit = cv.add("g", { class: "sk-hit" });
      const gNode = cv.add("g", { class: "sk-nodes" });

      for (let i = 0; i <= n; i++) {
        const o = m + i * cell;
        cv.add("line", { x1: m, y1: o, x2: m + n * cell, y2: o }, gGrid);
        cv.add("line", { x1: o, y1: m, x2: o, y2: m + n * cell }, gGrid);
      }

      const pad = 1.7;
      const slashes = [], hits = [], ghosts = [];
      for (let k = 0; k < n * n; k++) {
        const r = (k / n) | 0, c = k % n;
        const x = m + c * cell, y = m + r * cell;
        const gh = cv.add("g", { class: "sk-ghost" }, gGhost);
        cv.add("line", { x1: x + pad, y1: y + pad, x2: x + cell - pad, y2: y + cell - pad }, gh);
        cv.add("line", { x1: x + cell - pad, y1: y + pad, x2: x + pad, y2: y + cell - pad }, gh);
        ghosts.push(gh);
        slashes.push(cv.add("line", { class: "sk-ln" }, gSlash));
        const hit = cv.add("rect", {
          class: "sk-cell", x, y, width: cell, height: cell, rx: 0.8,
          "aria-label": `Pole ${r + 1}, ${c + 1}`, role: "button",
        }, gHit);
        hit.addEventListener("click", () => set(k, s.grid[k] === SL ? SR : SL));
        hits.push(hit);
      }

      const V = n + 1;
      const nodes = [];
      for (let i = 0; i < V * V; i++) {
        const vr = (i / V) | 0, vc = i % V;
        const x = m + vc * cell, y = m + vr * cell;
        const g = cv.add("g", { class: "sk-node", transform: `translate(${x} ${y})` }, gNode);
        cv.add("circle", { r: clues[i] < 0 ? 0.5 : 2.55, class: "sk-dot" }, g);
        const tx = cv.add("text", { class: "sk-num", "text-anchor": "middle", "dominant-baseline": "central" }, g);
        nodes.push({ g, tx, i });
      }

      const nodeEl = statBlock(ctx, "Węzły", { meter: true });
      ctx.panel.append(panelBlock("Narzędzia",
        button("Wyczyść pole", "btn-ghost wide", () => set(s.cursor, 0)),
        button("Podpowiedź", "btn-ghost wide", hint),
      ));

      const save = ctx.undoable((snap) => {
        s.grid = Int8Array.from(snap.grid);
        s.cursor = snap.cursor;
        render();
      });

      function set(k, t) {
        if (ctx.done || locked[k] || s.grid[k] === t) { s.cursor = k; return render(); }
        save({ grid: Array.from(s.grid), cursor: s.cursor });
        s.cursor = k;
        s.grid[k] = t;
        if (cyclic(n, s.grid).length) s.looped = true;
        t ? Sound.place(t) : Sound.erase();
        render();
        if (solved(n, clues, s.grid)) finish();
      }

      function hint() {
        if (ctx.done) return;
        let i = !locked[s.cursor] && s.grid[s.cursor] !== sol[s.cursor] ? s.cursor : s.grid.findIndex((v, k) => !locked[k] && v !== sol[k]);
        if (i < 0) return;
        s.hinted = true;
        set(i, sol[i]);
        if (!ctx.done) ctx.toast("Ten ukośnik pasuje");
      }

      function finish() {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
        if (!s.looped) ctx.achieve("bez-petli");
        if (!s.hinted && key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (key === "easy" && ctx.time < 40) ctx.achieve("szybki-start");
        if (key === "hard" && ctx.time < 90) ctx.achieve("blyskawica");
        const f = faults(n, clues, s.grid);
        nodeEl.set(`${f.ok} z ${f.total}`, 1);
        ctx.progress(1);
        ctx.win("Siatka zgadza się z cyframi.");
      }

      cellKeys(ctx, {
        cols: n, rows: n, get: () => s.cursor,
        set: (i) => { s.cursor = i; render(); },
        keys: {
          " ": () => set(s.cursor, s.grid[s.cursor] === SL ? SR : SL),
          enter: () => set(s.cursor, s.grid[s.cursor] === SL ? SR : SL),
          backspace: () => set(s.cursor, 0),
          delete: () => set(s.cursor, 0),
          "\\": () => set(s.cursor, SL),
          "/": () => set(s.cursor, SR),
        },
      });
      ctx.on(cv.svg, "contextmenu", (e) => {
        e.preventDefault();
        const [x, y] = cv.at(e);
        const c = Math.floor((x - m) / cell), r = Math.floor((y - m) / cell);
        if (r >= 0 && c >= 0 && r < n && c < n) set(r * n + c, 0);
      });

      function render() {
        const f = faults(n, clues, s.grid);
        const loop = new Set(f.loop);
        slashes.forEach((ln, k) => {
          const r = (k / n) | 0, c = k % n;
          const x = m + c * cell, y = m + r * cell;
          ln.classList.toggle("is-on", !!s.grid[k]);
          ln.classList.toggle("is-bad", loop.has(k));
          ln.classList.toggle("is-lock", !!locked[k]);
          ghosts[k].classList.toggle("is-hid", !!s.grid[k]);
          if (s.grid[k] === SL) {
            ln.setAttribute("x1", x + pad); ln.setAttribute("y1", y + pad);
            ln.setAttribute("x2", x + cell - pad); ln.setAttribute("y2", y + cell - pad);
          } else if (s.grid[k] === SR) {
            ln.setAttribute("x1", x + cell - pad); ln.setAttribute("y1", y + pad);
            ln.setAttribute("x2", x + pad); ln.setAttribute("y2", y + cell - pad);
          }
          hits[k].classList.toggle("cursor", k === s.cursor);
          hits[k].classList.toggle("is-lock", !!locked[k]);
          hits[k].setAttribute("aria-label", `Pole ${r + 1}, ${c + 1}${locked[k] ? ", dane" : ""}${s.grid[k] === SL ? ", ukośnik w dół" : s.grid[k] === SR ? ", ukośnik w górę" : ", puste"}`);
        });
        const deg = degrees(n, s.grid);
        nodes.forEach(({ g, tx, i }) => {
          const clue = clues[i];
          g.classList.toggle("is-empty", clue < 0);
          tx.textContent = clue < 0 ? "" : clue;
          if (clue < 0) return g.classList.remove("is-ok", "is-bad");
          const rem = remaining(n, s.grid, (i / V) | 0, i % V);
          g.classList.toggle("is-ok", deg[i] === clue && rem === 0);
          g.classList.toggle("is-bad", deg[i] > clue || deg[i] + rem < clue);
        });
        nodeEl.set(`${f.ok} z ${f.total}`, f.total ? f.ok / f.total : 0, `${s.grid.filter((v) => !v).length} pustych`);
        ctx.progress(f.total ? f.ok / f.total : 0);
      }
      render();
    },
  });
}
