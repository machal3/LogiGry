// Trzy widoki: budujesz bryłę z klocków w sześcianie tak, aby jej rzut z przodu,
// z góry i z boku zgadzał się z rysunkami w panelu. Bryłę można obracać i oglądać
// z każdej strony; klocek pasuje tam, gdzie wszystkie trzy rysunki mają pole.
{
  // ---------- logika bez DOM (sprawdza ją test.js) ----------
  // Osie: x w prawo, y w górę, z do widza. Indeks komórki: (y * n + z) * n + x.
  const NEIGH = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const idx = (n, x, y, z) => (y * n + z) * n + x;
  const inside = (n, x, y, z) => x >= 0 && y >= 0 && z >= 0 && x < n && y < n && z < n;
  const blank = (n) => new Uint8Array(n * n * n);

  function sum(arr) {
    let s = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i]) s++;
    return s;
  }

  // Trzy rzuty bryły: przód (x, y), góra (x, z) i bok (z, y).
  function projections(n, solid) {
    const front = new Uint8Array(n * n), top = new Uint8Array(n * n), side = new Uint8Array(n * n);
    for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      if (!solid[idx(n, x, y, z)]) continue;
      front[y * n + x] = 1;
      top[z * n + x] = 1;
      side[y * n + z] = 1;
    }
    return { front, top, side };
  }

  // Największa bryła o danych rzutach: klocek pasuje tam, gdzie wszystkie trzy rysunki
  // mają pole. Każde rozwiązanie jest jej podzbiorem, więc zawsze da się je zbudować.
  function maximal(n, views) {
    const out = blank(n);
    for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      if (views.front[y * n + x] && views.top[z * n + x] && views.side[y * n + z]) out[idx(n, x, y, z)] = 1;
    }
    return out;
  }

  // Czy rzuty bryły są dokładnie takie jak rysunki (warunek wygranej).
  function fits(n, solid, views) {
    const p = projections(n, solid);
    for (let i = 0; i < n * n; i++) {
      if (p.front[i] !== views.front[i] || p.top[i] !== views.top[i] || p.side[i] !== views.side[i]) return false;
    }
    return true;
  }

  // Ile pól rysunków pokrywa bryła i ile pól dokłada ponad rysunki.
  function score(n, solid, views) {
    const p = projections(n, solid);
    let covered = 0, extra = 0;
    for (const [got, want] of [[p.front, views.front], [p.top, views.top], [p.side, views.side]]) {
      for (let i = 0; i < got.length; i++) {
        if (got[i] && want[i]) covered++;
        else if (got[i] && !want[i]) extra++;
      }
    }
    return { covered, extra };
  }

  // Bryła bez klocków zbędnych: żadnego nie da się usunąć bez zmiany rzutów.
  function minimal(n, solid, views) {
    const out = Uint8Array.from(solid);
    for (let i = 0; i < out.length; i++) {
      if (!out[i]) continue;
      out[i] = 0;
      if (!fits(n, out, views)) out[i] = 1;
    }
    return out;
  }

  // Losowa bryła: rośnie od jednego klocka, więc trzyma się razem.
  function growSolid(n, want, rand = Math.random) {
    const solid = blank(n);
    solid[idx(n, (rand() * n) | 0, (rand() * n) | 0, (rand() * n) | 0)] = 1;
    let have = 1;
    for (let guard = 0; have < want && guard < want * 80 + 400; guard++) {
      const filled = [];
      for (let i = 0; i < solid.length; i++) if (solid[i]) filled.push(i);
      const at = filled[(rand() * filled.length) | 0];
      const x = at % n, z = ((at / n) | 0) % n, y = (at / (n * n)) | 0;
      const d = NEIGH[(rand() * 6) | 0];
      const nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (!inside(n, nx, ny, nz)) continue;
      const j = idx(n, nx, ny, nz);
      if (solid[j]) continue;
      solid[j] = 1;
      have++;
    }
    return solid;
  }

  // Plansza: losowa bryła i jej rzuty. Rysunki nie mogą być ani puste, ani pełne,
  // a liczba klocków rozwiązania musi się mieścić w widełkach poziomu.
  function puzzle(n, cfg, rand = Math.random) {
    const vmin = Math.max(3, Math.round(n * n * 0.28));
    const vmax = Math.round(n * n * 0.85);
    const off = (v) => v < vmin || v > vmax;
    let best = null, bestCost = Infinity;
    for (let attempt = 0; attempt < 160; attempt++) {
      const want = cfg.cubes[0] + ((rand() * (cfg.cubes[1] - cfg.cubes[0] + 1)) | 0);
      const views = projections(n, growSolid(n, want, rand));
      const size = sum(maximal(n, views));
      const f = sum(views.front), t = sum(views.top), s = sum(views.side);
      const cost = Math.max(0, cfg.maximal[0] - size) * 3 + Math.max(0, size - cfg.maximal[1]) * 3
        + Math.max(0, vmin - f) + Math.max(0, f - vmax)
        + Math.max(0, vmin - t) + Math.max(0, t - vmax)
        + Math.max(0, vmin - s) + Math.max(0, s - vmax);
      if (cost === 0 && !off(f) && !off(t) && !off(s) && size >= cfg.maximal[0] && size <= cfg.maximal[1]) {
        return { views, size };
      }
      if (cost < bestCost) { bestCost = cost; best = { views, size }; }
    }
    return best;
  }

  // Promień przez sześcian bryły (przechodzenie po komórkach): pierwszy trafiony klocek,
  // komórka przed nim (na jego ścianie) i komórka wejścia. Bez trafienia: cell = null.
  function castRay(n, solid, o, d) {
    const half = n / 2;
    let t0 = -Infinity, t1 = Infinity;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) {
        if (o[a] < -half || o[a] > half) return null;
        continue;
      }
      let ta = (-half - o[a]) / d[a], tb = (half - o[a]) / d[a];
      if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta;
      if (tb < t1) t1 = tb;
    }
    if (t1 < t0 || t1 < 0) return null;
    let t = Math.max(t0, 0) + 1e-6;
    const p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    const cell = [0, 0, 0], step = [0, 0, 0];
    const tMax = [Infinity, Infinity, Infinity], tDelta = [Infinity, Infinity, Infinity];
    for (let a = 0; a < 3; a++) {
      cell[a] = Math.min(n - 1, Math.max(0, Math.floor(p[a] + half)));
      if (d[a] > 0) {
        step[a] = 1;
        tDelta[a] = 1 / d[a];
        tMax[a] = t + (cell[a] + 1 - half - p[a]) / d[a];
      } else if (d[a] < 0) {
        step[a] = -1;
        tDelta[a] = -1 / d[a];
        tMax[a] = t + (cell[a] - half - p[a]) / d[a];
      }
    }
    let prev = null, entry = null;
    for (let guard = 0; guard < 4 * n + 8; guard++) {
      if (solid[idx(n, cell[0], cell[1], cell[2])]) {
        return { cell: cell.slice(), prev: prev ? prev.slice() : null, entry: entry ? entry.slice() : null };
      }
      if (!entry) entry = cell.slice();
      let a = 0;
      if (tMax[1] < tMax[0]) a = 1;
      if (tMax[2] < tMax[a]) a = 2;
      if (tMax[a] > t1) return { cell: null, prev, entry };
      prev = cell.slice();
      cell[a] += step[a];
      if (cell[a] < 0 || cell[a] >= n) return { cell: null, prev, entry };
      t = tMax[a];
      tMax[a] += tDelta[a];
    }
    return { cell: null, prev, entry };
  }

  if (typeof module !== "undefined") {
    module.exports = { idx, inside, blank, sum, projections, maximal, fits, score, minimal, growSolid, puzzle, castRay };
  }

  // ---------- gra ----------
  if (typeof registerGame !== "undefined") registerGame({
    id: "widoki",
    cat: "lamiglowki",
    name: "Trzy widoki",
    author: "DeepSeek V4.1 Flash",
    desc: "Buduj bryłę z klocków w sześcianie tak, aby jej trzy widoki zgadzały się z rysunkami.",
    color: "#3b5bdb",
    ink: "#ffffff",
    glyph: ["..#..", ".#.#.", "#.#.#", ".#.#.", "..#.."],
    levels: [
      { key: "easy", name: "3 × 3 × 3", points: 10, n: 3, cubes: [7, 12], maximal: [6, 16], slack: 12 },
      { key: "medium", name: "4 × 4 × 4", points: 25, n: 4, cubes: [13, 20], maximal: [9, 24], slack: 10 },
      { key: "hard", name: "5 × 5 × 5", points: 50, n: 5, cubes: [20, 30], maximal: [14, 32], slack: 9 },
    ],
    rules: [
      "Ustaw klocki w sześcianie tak, aby rzut bryły z przodu, z góry i z boku zgadzał się z trzema rysunkami w panelu.",
      "Klocek pasuje tam, gdzie wszystkie trzy rysunki mają zamalowane pole; klocek poza nimi zapala w rysunku czerwone pole nadmiaru.",
      "Kliknięcie stawia klocek przed trafioną ścianą albo zabiera trafiony klocek. Przeciągnięcie po planszy obraca bryłę.",
      "Strzałki przesuwają kursor po warstwie, spacja stawia lub zabiera klocek pod kursorem, klawisze Q i E zmieniają warstwę.",
      "Każde postawienie zużywa jeden klocek z zapasu; gdy zapas się skończy, partia jest przegrana.",
    ],
    achievements: [
      { id: "bez-zabierania", name: "Ręka bez poprawki", desc: "Ukończ bryłę, ani razu nie zabierając klocka.", points: 10 },
      { id: "pod-minute", name: "W minutę", desc: "Ukończ planszę 3 × 3 × 3 w mniej niż minutę.", points: 10 },
      { id: "oszczedny", name: "Oszczędny", desc: "Ukończ bryłę, z której żadnego klocka nie da się już usunąć.", points: 25 },
      { id: "bez-podpowiedzi", name: "Bez podpowiedzi", desc: "Ukończ planszę 4 × 4 × 4 albo 5 × 5 × 5 bez podpowiedzi.", points: 25 },
      { id: "mistrz-widokow", name: "Mistrz rzutów", desc: "Ukończ planszę 5 × 5 × 5 bez podpowiedzi i bez zabierania klocka.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level, n = L.n, half = n / 2;
      const puz = puzzle(n, L);
      const views = puz.views;
      const spots = sum(views.front) + sum(views.top) + sum(views.side);

      const W = 300, H = 292;
      const cv = canvasGame(board, ctx, W, H, { max: 70, cls: "space" });
      const g = cv.g;
      const CX = W / 2, CY = H * 0.46;
      let tNow = 0, drag = null, tool = 0; // narzędzie: 0 = dodaj klocek, 1 = zabierz klocek

      const S = {
        solid: blank(n),
        z: n - 1, kx: 0, ky: 0,
        places: 0,
        budget: puz.size + L.slack,
        hover: null,
        pops: new Map(),
        removed: false, hinted: false, done: false, wave: -1,
      };
      const cam = { yaw: 0.63, pitch: 0.5, tyaw: 0.63, tpitch: 0.5, idle: 9 };

      // ---------- kamera i rzut ----------
      let eye = [0, 0, 1], dirv = [0, 0, 1], Rv = [1, 0, 0], Uv = [0, 1, 0], Fv = [0, 0, -1], FOC = 120;
      function updateCam() {
        const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
        const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
        dirv = [cp * sy, sp, cp * cy];
        const dist = 4.1 * n;
        eye = [dirv[0] * dist, dirv[1] * dist, dirv[2] * dist];
        Fv = [-dirv[0], -dirv[1], -dirv[2]];
        const r = [-Fv[2], 0, Fv[0]];
        const rl = Math.hypot(r[0], r[1], r[2]) || 1;
        Rv = [r[0] / rl, r[1] / rl, r[2] / rl];
        Uv = [Rv[1] * Fv[2] - Rv[2] * Fv[1], Rv[2] * Fv[0] - Rv[0] * Fv[2], Rv[0] * Fv[1] - Rv[1] * Fv[0]];
      }
      function camXYZ(p) {
        const dx = p[0] - eye[0], dy = p[1] - eye[1], dz = p[2] - eye[2];
        return [dx * Rv[0] + dy * Rv[1] + dz * Rv[2], dx * Uv[0] + dy * Uv[1] + dz * Uv[2], dx * Fv[0] + dy * Fv[1] + dz * Fv[2]];
      }
      function proj(p) {
        const c = camXYZ(p);
        const k = FOC / c[2];
        return [CX + c[0] * k, CY - c[1] * k, c[2]];
      }
      // Ogniskowa raz na partię: bryła mieści się w płótnie z każdej zwykłej strony.
      function fitCam() {
        const yaw = cam.yaw, pitch = cam.pitch;
        let foc = Infinity;
        for (const [y2, p2] of [[0.63, 0.5], [0.79, 0.5], [0.79, 0.1], [0.79, 0.9], [0.2, 0.5], [1.4, 0.55], [2.4, 0.5], [3.9, 0.6]]) {
          cam.yaw = y2;
          cam.pitch = p2;
          updateCam();
          let ma = 1e-6, mb = 1e-6;
          for (let i = 0; i < 8; i++) {
            const c = camXYZ([i & 1 ? half : -half, i & 2 ? half : -half, i & 4 ? half : -half]);
            if (c[2] <= 0.001) continue;
            ma = Math.max(ma, Math.abs(c[0] / c[2]));
            mb = Math.max(mb, Math.abs(c[1] / c[2]));
          }
          foc = Math.min(foc, Math.min(W / 2 / ma, H / 2 / mb) * 0.85);
        }
        cam.yaw = yaw;
        cam.pitch = pitch;
        updateCam();
        FOC = foc;
      }
      fitCam();

      // ---------- kolory z motywu ----------
      function parseColor(s, fallback) {
        let m = /^#([0-9a-f]{3})$/i.exec(s || "");
        if (m) return [0, 1, 2].map((i) => parseInt(m[1][i], 16) * 17);
        m = /^#([0-9a-f]{6})$/i.exec(s || "");
        if (m) { const v = parseInt(m[1], 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
        m = /^rgba?\(([^)]+)\)$/i.exec(s || "");
        if (m) { const p = m[1].split(/[,\s/]+/).map(Number); return [p[0] | 0, p[1] | 0, p[2] | 0]; }
        return fallback;
      }
      const tint = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
      const alpha = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

      // ---------- sześcian: ściany i cieniowanie ----------
      const FACES = [
        { nrm: [1, 0, 0], pts: [1, 3, 7, 5] },
        { nrm: [-1, 0, 0], pts: [0, 2, 6, 4] },
        { nrm: [0, 1, 0], pts: [2, 3, 7, 6] },
        { nrm: [0, -1, 0], pts: [0, 1, 5, 4] },
        { nrm: [0, 0, 1], pts: [4, 5, 7, 6] },
        { nrm: [0, 0, -1], pts: [0, 1, 3, 2] },
      ];
      const LIGHT = (() => { const v = [0.38, 0.86, 0.34]; const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; })();
      const faceK = FACES.map((f) => 0.55 + 0.55 * Math.max(0, f.nrm[0] * LIGHT[0] + f.nrm[1] * LIGHT[1] + f.nrm[2] * LIGHT[2]));
      const STEPS = 24;
      const palIdx = (k) => Math.max(0, Math.min(STEPS - 1, Math.round((k - 0.4) / 0.04)));

      // ---------- panel: stan ----------
      const zapasEl = statBlock(ctx, "Zapas klocków", { meter: true });
      const zgodneEl = statBlock(ctx, "Zgodne pola", { meter: true });

      // ---------- panel: trzy rysunki ----------
      // Rysunek z przodu: wiersz to wysokość (y), kolumna to x.
      // Rysunek z góry: wiersz to głębokość (z), kolumna to x.
      // Rysunek z boku: wiersz to y, kolumna to z.
      const VIEWMAP = {
        front: (r, c) => (n - 1 - r) * n + c,
        top: (r, c) => r * n + c,
        side: (r, c) => (n - 1 - r) * n + c,
      };
      const viewsBox = el("div", "wd-views");
      const viewRows = [["front", "z przodu"], ["top", "z góry"], ["side", "z boku"]].map(([kind, cap]) => {
        const box = el("div", "wd-view");
        const gridEl = el("div", "wd-grid");
        gridEl.style.setProperty("--n", n);
        const cells = [];
        for (let i = 0; i < n * n; i++) {
          const cell = el("span", "wd-cell");
          cells.push(cell);
          gridEl.append(cell);
        }
        box.append(el("b", "wd-cap", cap), gridEl);
        viewsBox.append(box);
        return { kind, cells };
      });
      ctx.panel.append(panelBlock("Rysunki", viewsBox,
        el("p", "wd-note", "Pola podświetlone czekają na klocek, czerwone są nadmiarowe.")));

      // ---------- panel: narzędzia ----------
      let layerSeg = null;
      function setLayer(z, sound) {
        S.z = Math.max(0, Math.min(n - 1, z));
        if (layerSeg) layerSeg.set(S.z);
        if (sound) Sound.tap();
      }
      layerSeg = segmented("Warstwa", Array.from({ length: n }, (_, i) => String(i + 1)), (k) => setLayer(k, true));
      layerSeg.set(S.z);
      const actionSeg = segmented("Narzędzie", ["Dodaj klocek", "Zabierz klocek"], (k) => {
        tool = k;
        S.hover = null;
        actionSeg.set(k);
        Sound.tap();
      });
      actionSeg.set(0);
      ctx.panel.append(panelBlock(
        "Narzędzia",
        actionSeg.el,
        layerSeg.el,
        button("Podpowiedź", "btn-ghost wide", hint),
        button("Wyczyść bryłę", "btn-ghost wide danger", clearAll),
        button("Wyśrodkuj widok", "linkish", () => { cam.tyaw = 0.63; cam.tpitch = 0.5; cam.idle = 0; }),
      ));

      // ---------- klawiatura: kursor po warstwie ----------
      cellKeys(ctx, {
        cols: n,
        rows: n,
        get: () => (n - 1 - S.ky) * n + S.kx,
        set: (i) => { S.ky = n - 1 - ((i / n) | 0); S.kx = i % n; },
        keys: {
          q: () => setLayer(S.z - 1, true),
          e: () => setLayer(S.z + 1, true),
          " ": toggleCursor,
          enter: toggleCursor,
        },
      });

      // ---------- wskazywanie myszą i dotykiem ----------
      // Gdzie trafi kliknięcie: dodajemy przed trafioną ścianą, zabieramy trafiony klocek.
      function aim(sx, sy) {
        const A = (sx - CX) / FOC, B = (CY - sy) / FOC;
        const d = [
          Fv[0] + A * Rv[0] + B * Uv[0],
          Fv[1] + A * Rv[1] + B * Uv[1],
          Fv[2] + A * Rv[2] + B * Uv[2],
        ];
        const hit = castRay(n, S.solid, eye, d);
        if (!hit) return null;
        if (tool === 0) return hit.cell ? hit.prev : hit.entry;
        return hit.cell;
      }
      function tryAct(sx, sy) {
        if (ctx.done || S.done) return;
        const t = aim(sx, sy);
        if (!t) { Sound.error(); return; }
        const i = idx(n, t[0], t[1], t[2]);
        if (tool === 0 && !S.solid[i]) place(i);
        else if (tool === 1 && S.solid[i]) take(i, false);
        else Sound.error();
      }
      ctx.on(cv.cv, "pointerdown", (e) => {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0 };
        cam.idle = 0;
        cv.cv.setPointerCapture?.(e.pointerId);
      });
      ctx.on(cv.cv, "pointermove", (e) => {
        if (drag && drag.id === e.pointerId) {
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          drag.x = e.clientX;
          drag.y = e.clientY;
          drag.moved += Math.abs(dx) + Math.abs(dy);
          if (drag.moved > 10) {
            cam.tyaw += dx * 0.009;
            cam.tpitch = Math.max(-1.35, Math.min(1.35, cam.tpitch + dy * 0.008));
            S.hover = null;
          }
          return;
        }
        const [sx, sy] = cv.at(e);
        S.hover = aim(sx, sy);
      });
      ctx.on(cv.cv, "pointerup", (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const moved = drag.moved;
        drag = null;
        if (moved > 10) return;
        const [sx, sy] = cv.at(e);
        tryAct(sx, sy);
      });
      ctx.on(cv.cv, "pointercancel", () => { drag = null; });
      ctx.on(cv.cv, "pointerleave", () => { S.hover = null; });

      // ---------- ruchy ----------
      const save = ctx.undoable((snap) => {
        S.solid = Uint8Array.from(snap.solid);
        S.places = snap.places;
        S.removed = snap.removed;
        S.hinted = snap.hinted;
        S.kx = snap.kx;
        S.ky = snap.ky;
        S.pops.clear();
        setLayer(snap.z, false);
        refresh();
      });
      const snapshot = () => save({
        solid: Uint8Array.from(S.solid), places: S.places, removed: S.removed,
        hinted: S.hinted, kx: S.kx, ky: S.ky, z: S.z,
      });

      // Kursor wędruje na komórkę, na której właśnie coś się stało.
      function focus(i) {
        S.kx = i % n;
        S.ky = (i / (n * n)) | 0;
        setLayer(((i / n) | 0) % n, false);
      }
      function place(i) {
        if (S.solid[i] || S.places >= S.budget) return;
        snapshot();
        S.solid[i] = 1;
        S.places++;
        S.pops.set(i, tNow);
        focus(i);
        Sound.place(1 + (sum(S.solid) % 5));
        after();
      }
      function take(i, byHint) {
        if (!S.solid[i]) return;
        snapshot();
        S.solid[i] = 0;
        if (!byHint) S.removed = true;
        S.pops.set(i, tNow);
        focus(i);
        Sound.erase();
        after();
      }
      function toggleCursor() {
        if (ctx.done || S.done) return;
        const i = idx(n, S.kx, S.ky, S.z);
        if (S.solid[i]) take(i, false);
        else place(i);
      }
      // Podpowiedź zawsze przybliża rozwiązanie: zdejmuje klocek spoza rysunków
      // albo dostawia klocek brakujący w największej bryle.
      function hint() {
        if (ctx.done || S.done) return;
        S.hinted = true;
        const want = maximal(n, views);
        if (score(n, S.solid, views).extra > 0) {
          for (let i = 0; i < S.solid.length; i++) if (S.solid[i] && !want[i]) {
            Sound.line();
            take(i, true);
            ctx.toast("Zdjęty klocek spoza rysunków");
            return;
          }
        }
        for (let i = 0; i < want.length; i++) if (want[i] && !S.solid[i]) {
          Sound.line();
          place(i);
          ctx.toast("Podpowiedź: tu pasuje klocek");
          return;
        }
      }
      function clearAll() {
        if (ctx.done || S.done || !sum(S.solid)) return;
        snapshot();
        S.solid = blank(n);
        S.removed = true;
        S.pops.clear();
        Sound.erase();
        after();
      }
      function after() {
        refresh();
        if (fits(n, S.solid, views)) return finish();
        if (S.places >= S.budget) {
          S.done = true;
          const sc = score(n, S.solid, views);
          ctx.lose("Skończył się zapas", `Postawień: ${S.places} z ${S.budget}. Zgodnych pól: ${sc.covered} z ${spots}.`);
        }
      }
      function finish() {
        const klocki = sum(S.solid);
        if (!S.removed) ctx.achieve("bez-zabierania");
        if (L.key === "easy" && ctx.time < 60) ctx.achieve("pod-minute");
        if (!S.hinted && L.key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (L.key === "hard" && !S.hinted && !S.removed) ctx.achieve("mistrz-widokow");
        if (sum(minimal(n, S.solid, views)) === klocki) ctx.achieve("oszczedny");
        S.done = true;
        S.wave = tNow;
        S.hover = null;
        ctx.win(`Bryła gotowa. Klocków: ${klocki}, postawień: ${S.places} z ${S.budget}.`);
      }
      function refresh() {
        const p = projections(n, S.solid);
        const sc = score(n, S.solid, views);
        const want = { front: views.front, top: views.top, side: views.side };
        for (const row of viewRows) {
          const w = want[row.kind], got = p[row.kind];
          for (let k = 0; k < row.cells.length; k++) {
            const i = VIEWMAP[row.kind]((k / n) | 0, k % n);
            const cls = got[i] ? (w[i] ? "on" : "extra") : (w[i] ? "miss" : "off");
            const cell = row.cells[k];
            if (cell.dataset.s !== cls) {
              cell.dataset.s = cls;
              cell.className = `wd-cell ${cls}`;
            }
          }
        }
        zgodneEl.set(`${sc.covered} z ${spots}`, spots ? sc.covered / spots : 0,
          sc.extra ? `Nadmiarowe pola: ${sc.extra}` : "Wszystkie pola zgodne z rysunkami");
        zapasEl.set(`${S.budget - S.places}`, (S.budget - S.places) / S.budget,
          `Klocków na planszy: ${sum(S.solid)} z ${S.budget}`);
        ctx.progress(spots ? sc.covered / spots : 0);
      }

      // ---------- rysowanie ----------
      const cornersOf = (x, y, z, s) => {
        const x0 = x - half, y0 = y - half, z0 = z - half;
        const out = [];
        for (let i = 0; i < 8; i++) {
          out.push(proj([
            x0 + 0.5 + ((i & 1) - 0.5) * s,
            y0 + 0.5 + (((i >> 1) & 1) - 0.5) * s,
            z0 + 0.5 + (((i >> 2) & 1) - 0.5) * s,
          ]));
        }
        return out;
      };
      function traced(cs) {
        g.beginPath();
        for (const f of FACES) {
          g.moveTo(cs[f.pts[0]][0], cs[f.pts[0]][1]);
          for (let i = 1; i < 4; i++) g.lineTo(cs[f.pts[i]][0], cs[f.pts[i]][1]);
          g.closePath();
        }
      }
      const outline = (x, y, z, s, color, width) => {
        g.strokeStyle = color;
        g.lineWidth = width;
        traced(cornersOf(x, y, z, s));
        g.stroke();
      };
      function drawFloor(line) {
        g.strokeStyle = alpha(line, 0.5);
        g.lineWidth = 0.6;
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const t = -half + i;
          let a = proj([-half, -half, t]), b = proj([half, -half, t]);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          a = proj([t, -half, -half]);
          b = proj([t, -half, half]);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
      }
      // Cień bryły na podłodze: jedno pole na każdą zajętą kolumnę.
      function drawShadow() {
        const seen = new Uint8Array(n * n);
        const y0 = -half + 0.02;
        g.fillStyle = "rgba(6, 8, 20, 0.45)";
        g.beginPath();
        for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
          if (!S.solid[idx(n, x, y, z)]) continue;
          const i = z * n + x;
          if (seen[i]) continue;
          seen[i] = 1;
          const q = [
            proj([x - half, y0, z - half]), proj([x + 1 - half, y0, z - half]),
            proj([x + 1 - half, y0, z + 1 - half]), proj([x - half, y0, z + 1 - half]),
          ];
          g.moveTo(q[0][0], q[0][1]);
          for (let k = 1; k < 4; k++) g.lineTo(q[k][0], q[k][1]);
          g.closePath();
        }
        g.fill();
      }
      // Klatka sześcianu budowy: cztery krawędzie pionowe i dwie podstawy.
      function drawBox(line) {
        g.strokeStyle = alpha(line, 0.34);
        g.lineWidth = 0.7;
        g.beginPath();
        for (const x of [-half, half]) for (const z of [-half, half]) {
          const a = proj([x, -half, z]), b = proj([x, half, z]);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        for (const y of [-half, half]) for (const [p, q] of [
          [[-half, y, -half], [half, y, -half]], [[half, y, -half], [half, y, half]],
          [[half, y, half], [-half, y, half]], [[-half, y, half], [-half, y, -half]],
        ]) {
          const a = proj(p), b = proj(q);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
      }
      function drawSlice(base) {
        const zp = S.z + 0.5 - half;
        const q = [proj([-half, -half, zp]), proj([half, -half, zp]), proj([half, half, zp]), proj([-half, half, zp])];
        g.beginPath();
        g.moveTo(q[0][0], q[0][1]);
        for (let i = 1; i < 4; i++) g.lineTo(q[i][0], q[i][1]);
        g.closePath();
        g.fillStyle = alpha(base, 0.07);
        g.fill();
        g.strokeStyle = alpha(base, 0.38);
        g.lineWidth = 0.9;
        g.stroke();
        g.strokeStyle = alpha(base, 0.18);
        g.lineWidth = 0.5;
        g.beginPath();
        for (let i = 1; i < n; i++) {
          const t = -half + i;
          let a = proj([t, -half, zp]), b = proj([t, half, zp]);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          a = proj([-half, t, zp]);
          b = proj([half, t, zp]);
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
        }
        g.stroke();
      }
      const order = [];
      function buildOrder() {
        order.length = 0;
        for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
          const i = idx(n, x, y, z);
          if (!S.solid[i]) continue;
          order.push({ i, x, y, z, d: camXYZ([x + 0.5 - half, y + 0.5 - half, z + 0.5 - half])[2] });
        }
        order.sort((a, b) => b.d - a.d);
      }
      function drawScene() {
        const base = parseColor(cv.theme.c, [59, 91, 219]);
        const line = parseColor(cv.theme.line, [42, 50, 84]);
        const star = parseColor(cv.theme.text, [238, 241, 255]);
        updateCam();

        // gwiazdy prześwitują z tła płótna; dokładamy tylko łunę od bryły
        const halo = g.createRadialGradient(CX, CY, 6, CX, CY, W * 0.62);
        halo.addColorStop(0, alpha(base, 0.2));
        halo.addColorStop(1, alpha(base, 0));
        g.fillStyle = halo;
        g.fillRect(0, 0, W, H);

        drawFloor(line);
        drawShadow();
        drawBox(line);

        const vis = FACES.map((f) => f.nrm[0] * dirv[0] + f.nrm[1] * dirv[1] + f.nrm[2] * dirv[2] > 0);
        const pal = [];
        for (let i = 0; i < STEPS; i++) pal.push(tint(base, 0.4 + i * 0.04));
        const edge = tint(base, 0.32);
        const wave = S.wave >= 0 ? tNow - S.wave : -1;

        buildOrder();
        for (const c of order) {
          let s = 1;
          const p0 = S.pops.get(c.i);
          if (p0 !== undefined) {
            const k = Math.min(1, (tNow - p0) / 0.2);
            if (k >= 1) S.pops.delete(c.i);
            else s = 0.55 + 0.45 * (1 - (1 - k) ** 2);
          }
          const bonus = (c.z === S.z ? 0.08 : 0)
            + (wave >= 0 ? 0.4 * Math.max(0, Math.sin((c.x + c.y + c.z) * 0.6 - wave * 2.4)) : 0);
          const cs = cornersOf(c.x, c.y, c.z, s);
          for (let f = 0; f < FACES.length; f++) {
            if (!vis[f]) continue;
            const pts = FACES[f].pts;
            g.fillStyle = pal[palIdx(faceK[f] + bonus)];
            g.beginPath();
            g.moveTo(cs[pts[0]][0], cs[pts[0]][1]);
            for (let i = 1; i < 4; i++) g.lineTo(cs[pts[i]][0], cs[pts[i]][1]);
            g.closePath();
            g.fill();
            g.strokeStyle = edge;
            g.lineWidth = 0.55;
            g.stroke();
          }
        }

        drawSlice(base);

        if (S.hover && !S.done) {
          const h = S.hover;
          if (S.solid[idx(n, h[0], h[1], h[2])]) outline(h[0], h[1], h[2], 1.04, "rgba(255,107,107,0.95)", 1.6);
          else outline(h[0], h[1], h[2], 0.94, tint(base, 1.6), 1.5);
        }
        if (!ctx.done) {
          const on = S.solid[idx(n, S.kx, S.ky, S.z)];
          outline(S.kx, S.ky, S.z, 1 + 0.05 * Math.sin(tNow * 6), on ? "rgba(255,209,102,0.95)" : alpha(star, 0.85), 1.5);
        }
      }

      cv.loop((dt, t) => {
        tNow = t / 1000;
        cam.idle += dt;
        const k = Math.min(1, dt * 14);
        cam.yaw += (cam.tyaw - cam.yaw) * k;
        cam.pitch += (cam.tpitch - cam.pitch) * k;
        if (cam.idle > 6 && !reduced()) cam.tyaw += dt * 0.12; // bryła obraca się sama, gdy gracz odpoczywa
        drawScene();
      });

      refresh();
    },
  });

  function reduced() {
    return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
}
