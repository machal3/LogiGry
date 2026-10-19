// Galaktyki: cała plansza dzieli się na regiony, a każda gwiazda jest środkiem
// swojego regionu — obrót regionu o 180 stopni wokół gwiazdy daje ten sam
// kształt. Plansze powstają przez wzrost regionów, a gdy para pól nie mieści się
// w dotychczasowym kształcie, środek regionu przesuwa się do środka ciężkości
// figury. Dlatego każda wylosowana plansza ma rozwiązanie i zwykle nie jest
// złożona z samych prostokątów.
{
  const STEPS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const shuffleRng = (a, rng) => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  // Pola, które region ma od początku; wynikają z położenia gwiazdy.
  // (R, C) to podwojone współrzędne: parzysta = środek pola, nieparzysta = krawędź.
  function seedCells(n, m, R, C) {
    if (R % 2 === 0 && C % 2 === 0) return [(R / 2) * m + C / 2];
    if (R % 2 === 1 && C % 2 === 0) { const c = C / 2; return [((R - 1) / 2) * m + c, ((R + 1) / 2) * m + c]; }
    if (R % 2 === 0 && C % 2 === 1) { const r = R / 2; return [r * m + (C - 1) / 2, r * m + (C + 1) / 2]; }
    const r = (R - 1) / 2, c = (C - 1) / 2;
    return [r * m + c, r * m + c + 1, (r + 1) * m + c, (r + 1) * m + c + 1];
  }

  // Jedno losowanie podziału planszy na regiony obrotowo symetryczne.
  // Siatka jest podwojona: pole wypada na (nieparzyste, nieparzyste), a gwiazda —
  // na dowolnym punkcie siatki, więc może stać w polu, na krawędzi albo w narożniku.
  // Kolejne pozycje są odwiedzane w losowej kolejności: pole albo trafia do
  // sąsiedniego regionu (razem ze swoim odbiciem), albo zakłada nową gwiazdę.
  function grow(n, m, rng) {
    const X = 2 * n + 1, Y = 2 * m + 1;
    const N = n * m;
    const inGrid = (x, y) => x > 0 && y > 0 && x < X - 1 && y < Y - 1;
    const isCell = (x, y) => x % 2 === 1 && y % 2 === 1;
    const isCorner = (x, y) => x % 2 === 0 && y % 2 === 0;
    const idx = (x, y) => ((y - 1) / 2) * m + (x - 1) / 2;
    const colOf = (i) => 2 * (i % m) + 1;
    const rowOf = (i) => 2 * ((i / m) | 0) + 1;
    const maxSize = 2 * Math.ceil(Math.sqrt(N));

    const owner = new Int16Array(N).fill(-1);
    const size = [];
    const gx = [], gy = [];
    const starAt = new Int16Array(X * Y).fill(-1);

    const addOwner = (i, k) => { const o = owner[i]; if (o >= 0) size[o]--; owner[i] = k; size[k]++; };
    const mirror = (k, x, y) => { const mx = 2 * gx[k] - x, my = 2 * gy[k] - y; return inGrid(mx, my) ? idx(mx, my) : -1; };

    // Nowa gwiazda od razu zabiera pola, na których stoi.
    function claimSeeds(k) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const x = gx[k] + dx, y = gy[k] + dy;
        if (!inGrid(x, y) || !isCell(x, y)) continue;
        const t = idx(x, y), o = mirror(k, x, y);
        if (o < 0 || (owner[o] >= 0 && owner[o] !== k)) return false;
        addOwner(t, k); addOwner(o, k);
      }
      return true;
    }

    // Czy na tej pozycji może stanąć gwiazda: wokół musi być pusto i bez innych gwiazd.
    function canPlace(x, y) {
      if (!inGrid(x, y)) return false;
      let bx = 1, by = 1;
      if (!isCell(x, y)) {
        if (isCorner(x, y)) { bx = by = 2; }
        else if (x % 2 === 0) { bx = 2; }
        else { by = 2; }
      }
      for (let dx = -bx; dx <= bx; dx++) for (let dy = -by; dy <= by; dy++) {
        const ax = x + dx, ay = y + dy;
        if (!inGrid(ax, ay)) continue;
        if (isCell(ax, ay) && owner[idx(ax, ay)] >= 0) return false;
        if ((dx !== 0 || dy !== 0) && starAt[ay * X + ax] >= 0) return false;
      }
      return true;
    }

    // Dołączenie bloku pól do regionu: najpierw próba rozszerzenia, potem przesunięcie środka.
    function absorb(k, block) {
      let ok = true;
      const opp = [];
      for (const [x, y] of block) {
        const o = mirror(k, x, y);
        if (o < 0 || owner[o] >= 0) { ok = false; break; }
        opp.push(o);
      }
      if (ok) {
        for (let i = 0; i < block.length; i++) { addOwner(idx(block[i][0], block[i][1]), k); addOwner(opp[i], k); }
        return true;
      }
      const total = size[k] + block.length;
      let cx = gx[k] * size[k], cy = gy[k] * size[k];
      for (const [x, y] of block) { cx += x; cy += y; }
      if (cx % total || cy % total) return false;
      cx /= total; cy /= total;
      const freeWrt = (x, y) => { const o = idx(x, y); return owner[o] < 0 || owner[o] === k; };
      for (let i = 0; i < N; i++) {
        if (owner[i] !== k) continue;
        const x = 2 * cx - colOf(i), y = 2 * cy - rowOf(i);
        if (!inGrid(x, y) || !freeWrt(x, y)) return false;
      }
      for (const [x, y] of block) {
        const mx = 2 * cx - x, my = 2 * cy - y;
        if (!inGrid(mx, my) || !freeWrt(mx, my)) return false;
      }
      for (const [x, y] of block) addOwner(idx(x, y), k);
      const mine = [];
      for (let i = 0; i < N; i++) if (owner[i] === k) mine.push(i);
      starAt[gy[k] * X + gx[k]] = -1;
      gx[k] = cx; gy[k] = cy;
      starAt[cy * X + cx] = k;
      for (const i of mine) addOwner(idx(2 * cx - colOf(i), 2 * cy - rowOf(i)), k);
      let cnt = 0;
      for (let i = 0; i < N; i++) if (owner[i] === k) cnt++;
      size[k] = cnt;
      return true;
    }

    // Pole albo dwa pola po bokach krawędzi trafiają do sąsiedniego regionu.
    function takeBlock(x1, y1, x2, y2) {
      if (!inGrid(x1, y1) || !inGrid(x2, y2)) return false;
      const block = [];
      for (let x = x1; x <= x2; x += 2) for (let y = y1; y <= y2; y += 2) {
        if (owner[idx(x, y)] >= 0) return false;
        block.push([x, y]);
      }
      const around = [];
      const add = (x, y) => { if (inGrid(x, y) && isCell(x, y)) around.push([x, y]); };
      for (let x = x1; x <= x2; x += 2) { add(x, y1 - 2); add(x, y2 + 2); }
      for (let y = y1; y <= y2; y += 2) { add(x1 - 2, y); add(x2 + 2, y); }
      shuffleRng(around, rng);
      for (const [x, y] of around) {
        const k = owner[idx(x, y)];
        if (k < 0 || size[k] >= maxSize) continue;
        if (absorb(k, block)) return true;
      }
      return false;
    }

    const spots = [];
    for (let x = 0; x < X; x++) for (let y = 0; y < Y; y++) spots.push([x, y]);
    shuffleRng(spots, rng);
    for (let s = 0; s < spots.length; s++) {
      const [x, y] = spots[s];
      let x1 = x, y1 = y, x2 = x, y2 = y;
      if (!isCell(x, y) && !isCorner(x, y)) {
        if (x % 2 === 0) { x1 -= 1; x2 += 1; } else { y1 -= 1; y2 += 1; }
      }
      if (!isCorner(x, y) && takeBlock(x1, y1, x2, y2)) continue;
      if (!isCell(x, y) && !isCorner(x, y) && s % 2) continue;
      if (!canPlace(x, y)) continue;
      const k = gx.length;
      gx.push(x); gy.push(y); size.push(0);
      starAt[y * X + x] = k;
      if (!claimSeeds(k)) return null;
    }

    const reg = gx.map(() => []);
    for (let i = 0; i < N; i++) { if (owner[i] < 0) return null; reg[owner[i]].push(i); }
    if (!reg.length || reg.some((c) => !c.length)) return null;
    // region musi być domknięty na obrót wokół gwiazdy i spójny
    for (let k = 0; k < reg.length; k++) {
      const mine = new Set(reg[k]);
      for (const i of reg[k]) {
        const o = mirror(k, colOf(i), rowOf(i));
        if (o < 0 || !mine.has(o)) return null;
      }
      const seen = new Set([reg[k][0]]), q = [reg[k][0]];
      while (q.length) {
        const i = q.pop(), r = (i / m) | 0, c = i % m;
        for (const [dr, dc] of STEPS) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) continue;
          const t = r2 * m + c2;
          if (mine.has(t) && !seen.has(t)) { seen.add(t); q.push(t); }
        }
      }
      if (seen.size !== reg[k].length) return null;
    }
    for (let a = 0; a < reg.length; a++) for (let b = a + 1; b < reg.length; b++) {
      if (Math.abs(gx[a] - gx[b]) <= 1 && Math.abs(gy[a] - gy[b]) <= 1) return null;
    }
    reg.forEach((c) => c.sort((a, b) => a - b));
    // (R, C) gra widzi jako wiersz i kolumnę, a w siatce podwojonej x to kolumna.
    return { n, m, stars: gx.map((x, k) => ({ R: gy[k] - 1, C: x - 1 })), reg, owner, count: reg.length };
  }

  // Czy da się odtworzyć podział: region startuje z pól gwiazdy, a każda dokładana
  // para pól musi dotykać regionu. Sprawdzenie po kolei dla każdego regionu.
  function buildable(n, m, stars, reg) {
    for (let k = 0; k < stars.length; k++) {
      const R = stars[k].R, C = stars[k].C;
      const inK = new Set(reg[k]);
      const mine = new Set();
      for (const i of seedCells(n, m, R, C)) { if (!inK.has(i)) return false; mine.add(i); }
      const touches = (r, c) => {
        for (const [dr, dc] of STEPS) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < m && mine.has(r2 * m + c2)) return true;
        }
        return false;
      };
      let progress = true;
      while (progress && mine.size < inK.size) {
        progress = false;
        for (const i of reg[k]) {
          if (mine.has(i)) continue;
          const r = (i / m) | 0, c = i % m;
          const r2 = R - r, c2 = C - c;
          if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) return false;
          const j = r2 * m + c2;
          if (!inK.has(j) || mine.has(j)) continue;
          if (!touches(r, c) && !touches(r2, c2)) continue;
          mine.add(i); mine.add(j); progress = true;
        }
      }
      if (mine.size !== inK.size) return false;
    }
    return true;
  }

  // Udział regionów, które nie są prostokątami, i udział pól-gwiazd. Wyższy wynik =
  // ciekawsza plansza.
  function shapeScore(n, m, reg) {
    let nonRect = 0, single = 0;
    for (const cells of reg) {
      let r0 = n, r1 = -1, c0 = m, c1 = -1;
      for (const i of cells) {
        const r = (i / m) | 0, c = i % m;
        if (r < r0) r0 = r; if (r > r1) r1 = r;
        if (c < c0) c0 = c; if (c > c1) c1 = c;
      }
      if ((r1 - r0 + 1) * (c1 - c0 + 1) !== cells.length) nonRect++;
      if (cells.length === 1) single++;
    }
    return (nonRect / reg.length) * 6 - (single / reg.length) * 3;
  }

  // Awaryjny podział: prostokąty z losowego cięcia. Zawsze poprawny, bo prostokąt
  // jest symetryczny względem swojego środka, a rozłączne prostokąty mają różne środki.
  function bands(n, m, count, rng) {
    const rects = [{ r0: 0, c0: 0, r1: n - 1, c1: m - 1 }];
    while (rects.length < count) {
      let bi = -1, bs = 1;
      for (let i = 0; i < rects.length; i++) {
        const R = rects[i];
        if ((R.r1 - R.r0 + 1) * (R.c1 - R.c0 + 1) < 2) continue;
        const s = (R.r1 - R.r0 + 1) * (R.c1 - R.c0 + 1) * (0.7 + rng() * 0.6);
        if (s > bs) { bs = s; bi = i; }
      }
      if (bi < 0) break;
      const R = rects[bi], h = R.r1 - R.r0 + 1, w = R.c1 - R.c0 + 1;
      if (h > 1 && (w === 1 || rng() < 0.5)) {
        const k = R.r0 + Math.floor(rng() * (h - 1));
        rects.splice(bi, 1, { r0: R.r0, c0: R.c0, r1: k, c1: R.c1 }, { r0: k + 1, c0: R.c0, r1: R.r1, c1: R.c1 });
      } else {
        const k = R.c0 + Math.floor(rng() * (w - 1));
        rects.splice(bi, 1, { r0: R.r0, c0: R.c0, r1: R.r1, c1: k }, { r0: R.r0, c0: k + 1, r1: R.r1, c1: R.c1 });
      }
    }
    const owner = new Int16Array(n * m).fill(-1);
    const stars = [], reg = [];
    rects.forEach((R, k) => {
      const cs = [];
      for (let r = R.r0; r <= R.r1; r++) for (let c = R.c0; c <= R.c1; c++) { cs.push(r * m + c); owner[r * m + c] = k; }
      reg.push(cs);
      stars.push({ R: R.r0 + R.r1, C: R.c0 + R.c1 });
    });
    return { n, m, stars, reg, owner, count: reg.length };
  }

  // Plansza do gry: losujemy wiele podziałów i bierzemy ten, który ma najlepszą
  // liczbę gwiazd i najciekawszy kształt regionów.
  function puzzle(n, m, target, rng) {
    let best = null, bestScore = -Infinity;
    for (let t = 0; t < 240; t++) {
      const g = grow(n, m, rng);
      if (!g) continue;
      const dev = Math.abs(g.count - target);
      const sc = shapeScore(n, m, g.reg) - dev * 12;
      if (best && sc <= bestScore) continue;
      if (!buildable(n, m, g.stars, g.reg)) continue;
      bestScore = sc;
      best = g;
      if (dev === 0 && sc >= 1.5) break;
    }
    return best || bands(n, m, target + 2, rng);
  }

  // Kolory regionów tak, aby sąsiadujące nie miały tej samej barwy (paleta ma 8 kolorów).
  function colorRegions(n, m, reg, owner) {
    const PAL = 8;
    const out = new Array(reg.length).fill(0);
    for (let k = 0; k < reg.length; k++) {
      const used = new Set();
      for (const i of reg[k]) {
        const r = (i / m) | 0, c = i % m;
        for (const [dr, dc] of STEPS) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) continue;
          const t = owner[r2 * m + c2];
          if (t >= 0 && t !== k) used.add(out[t]);
        }
      }
      let c = 0;
      while (used.has(c)) c++;
      out[k] = c % PAL;
    }
    return out;
  }

  // Mały generator liczb losowych, żeby partia była inna za każdym razem.
  function makeRng(seed) {
    let s = (seed >>> 0) || 1;
    return () => {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  if (typeof module !== "undefined") module.exports = { grow, puzzle, bands, buildable, seedCells, colorRegions, shapeScore, makeRng };

  if (typeof registerGame !== "undefined") registerGame({
    id: "galaktyki",
    cat: "logiczne",
    name: "Galaktyki",
    author: "DeepSeek V4.1 Flash",
    desc: "Podziel planszę na regiony wokół gwiazd: każdy obraca się o 180 stopni w swój własny kształt.",
    color: "#3a0ca3",
    ink: "#ffffff",
    glyph: ["..#..", "#####", "..#..", ".###.", "..#.."],
    levels: [
      { key: "easy", name: "6 × 6", points: 10, n: 6, m: 6, target: 7 },
      { key: "medium", name: "8 × 8", points: 25, n: 8, m: 8, target: 11 },
      { key: "hard", name: "10 × 10", points: 50, n: 10, m: 10, target: 17 },
    ],
    rules: [
      "Każda gwiazda jest środkiem jednego regionu: obrót regionu o 180 stopni wokół gwiazdy daje ten sam kształt.",
      "Region startuje z pól, na których stoi jego gwiazda, i rośnie parami pól będących swoimi odbiciami.",
      "Wybierz gwiazdę i kliknij wolne pole — jego odbicie trafia do tego samego regionu razem z nim.",
      "Para pól musi dotykać regionu. Regiony dzielą planszę bez luk i bez nakładania się.",
      "Wygrywasz, gdy każde pole ma swoją gwiazdę. Strzałki przesuwają kursor, spacja stawia pole.",
    ],
    achievements: [
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Rozwiąż planszę 6 × 6 bez podpowiedzi.", points: 10 },
      { id: "szybka-reka", name: "Szybka ręka", desc: "Rozwiąż planszę 6 × 6 w mniej niż minutę.", points: 10 },
      { id: "bez-cofniecia", name: "Bez cofnięcia", desc: "Rozwiąż planszę 8 × 8 bez użycia cofania.", points: 25 },
      { id: "wprawna-reka", name: "Wprawna ręka", desc: "Rozwiąż planszę 8 × 8 w mniej niż dwie minuty.", points: 25 },
      { id: "pelny-obraz", name: "Pełny obraz", desc: "Rozwiąż planszę 10 × 10 bez użycia cofania.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, m, target } = ctx.level;
      const GAP = 0.06;
      const p = puzzle(n, m, target, makeRng((Date.now() ^ (Math.random() * 4294967296)) >>> 0));
      const stars = p.stars, reg = p.reg;
      const color = colorRegions(n, m, reg, p.owner);
      let owner = new Int16Array(n * m).fill(-1);
      stars.forEach((s, k) => { for (const i of seedCells(n, m, s.R, s.C)) owner[i] = k; });
      let active = 0, cursor = 0, hinted = false, hoverEl = null;

      const cells = gridCells(board, m, n, "gal", { gap: GAP });
      const layer = el("div", "gal-stars");
      board.append(layer);
      const W = m + GAP * (m + 1), H = n + GAP * (n + 1);
      // gwiazda stoi dokładnie w środku swojej pozycji, także na krawędzi czy narożniku
      const at = (v) => GAP + v + Math.floor(v) * GAP;
      const starEls = stars.map((s, k) => {
        const b = button("★", "gal-star", () => { if (!ctx.done) { active = k; cursor = 0; Sound.tap(); render(); } });
        b.setAttribute("aria-label", `Gwiazda regionu ${k + 1}`);
        b.style.setProperty("--gos", `var(--gal-${color[k] + 1})`);
        b.style.left = `${(at((s.C + 1) / 2) / W) * 100}%`;
        b.style.top = `${(at((s.R + 1) / 2) / H) * 100}%`;
        layer.append(b);
        return b;
      });

      const doneEl = statBlock(ctx, "Zapełnione", { meter: true });
      const next = button("Następny region", "btn-ghost wide", () => { if (!ctx.done) { active = (active + 1) % reg.length; cursor = 0; Sound.tap(); render(); } });
      const help = button("Podpowiedź", "btn-ghost wide", hint);
      ctx.panel.append(panelBlock("", next, help));

      const save = ctx.undoable((snap) => { owner = Int16Array.from(snap.owner); active = snap.active; render(); });
      let count = 0;
      for (let i = 0; i < owner.length; i++) if (owner[i] >= 0) count++;

      const idxMirror = (k, i) => {
        const r = (i / m) | 0, c = i % m;
        const r2 = stars[k].R - r, c2 = stars[k].C - c;
        if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) return -1;
        return r2 * m + c2;
      };
      const touches = (k, i) => {
        const r = (i / m) | 0, c = i % m;
        for (const [dr, dc] of STEPS) {
          const r2 = r + dr, c2 = c + dc;
          if (r2 >= 0 && r2 < n && c2 >= 0 && c2 < m && owner[r2 * m + c2] === k) return true;
        }
        return false;
      };
      // Pole razem ze swoim odbiciem pasuje do regionu k? Zwraca odbicie albo -1.
      function fit(k, i) {
        if (owner[i] >= 0) return -1;
        const j = idxMirror(k, i);
        if (j < 0 || owner[j] >= 0) return -1;
        if (j !== i && !touches(k, i) && !touches(k, j)) return -1;
        return j;
      }

      function paint(k, i) {
        const j = idxMirror(k, i);
        save({ owner: owner.slice(), active });
        owner[i] = k;
        if (j !== i) owner[j] = k;
        count += j === i ? 1 : 2;
        cursor = i;
        Sound.place(color[k] + 1);
        replay(cells[i], "new");
        if (j !== i) replay(cells[j], "new");
        render();
        if (count === n * m) finish();
      }

      function place(i) {
        if (ctx.done) return;
        let k = active;
        if (fit(k, i) < 0) {
          const cand = [];
          for (let t = 0; t < reg.length; t++) if (t !== k && fit(t, i) >= 0) cand.push(t);
          if (cand.length === 1) { active = k = cand[0]; }
          else if (cand.length === 0) {
            if (owner[i] >= 0) { Sound.error(); replay(cells[i], "shake"); ctx.toast("To pole należy już do innego regionu"); }
            else ctx.toast("Para pól nie dotyka tego regionu albo odbicie jest zajęte");
            return;
          } else {
            Sound.error(); replay(cells[i], "shake");
            ctx.toast("To pole pasuje do kilku regionów — najpierw wybierz gwiazdę");
            return;
          }
        }
        paint(k, i);
      }

      // Podpowiedź podaje parę z rozwiązania, więc nigdy nie prowadzi w ślepy zaułek.
      function hint() {
        if (ctx.done) return;
        for (let k = 0; k < reg.length; k++) {
          for (const i of reg[k]) {
            if (owner[i] >= 0) continue;
            const j = idxMirror(k, i);
            if (j < 0 || owner[j] >= 0) continue;
            if (j !== i && !touches(k, i) && !touches(k, j)) continue;
            hinted = true;
            active = k; cursor = i;
            render();
            sweep(j === i ? [cells[i]] : [cells[i], cells[j]]);
            return;
          }
        }
        ctx.toast("Nie ma już pary z rozwiązania — cofnij ruch");
      }

      function finish() {
        if (ctx.done) return;
        if (n === 6 && !hinted) ctx.achieve("bez-podpowiedzi");
        if (n === 6 && ctx.time < 60) ctx.achieve("szybka-reka");
        if (n === 8 && ctx.undos === 0) ctx.achieve("bez-cofniecia");
        if (n === 8 && ctx.time < 120) ctx.achieve("wprawna-reka");
        if (n === 10 && ctx.undos === 0) ctx.achieve("pelny-obraz");
        ctx.win("Każde pole ma swoją gwiazdę.");
      }

      board.addEventListener("click", (e) => {
        const c = e.target.closest(".gal .gb-cell");
        if (c) place(+c.dataset.i);
      });
      const hover = (i) => {
        if (hoverEl) { hoverEl.classList.remove("mate"); hoverEl = null; }
        if (i < 0 || owner[i] >= 0) return;
        const j = idxMirror(active, i);
        if (j >= 0 && j !== i && owner[j] < 0) { hoverEl = cells[j]; hoverEl.classList.add("mate"); }
      };
      cells.forEach((c, i) => c.addEventListener("pointerenter", () => hover(i)));
      board.addEventListener("pointerleave", () => hover(-1));
      cellKeys(ctx, {
        cols: m, rows: n,
        get: () => cursor,
        set: (i) => { cursor = i; render(); },
        keys: { " ": () => place(cursor), enter: () => place(cursor), n: () => next.click() },
      });

      function render() {
        hover(-1);
        cells.forEach((c, i) => {
          const k = owner[i];
          c.style.setProperty("--gk", k >= 0 ? `var(--gal-${color[k] + 1})` : "transparent");
          c.classList.toggle("free", k < 0);
          c.classList.toggle("own", k === active && k >= 0);
          c.classList.toggle("open", k < 0 && fit(active, i) >= 0);
          c.classList.toggle("cursor", i === cursor);
        });
        starEls.forEach((s, k) => {
          const done = reg[k].every((i) => owner[i] === k);
          s.classList.toggle("on", k === active);
          s.classList.toggle("done", done);
          const mark = done ? "✓" : "★";
          if (s.textContent !== mark) s.textContent = mark;
          s.setAttribute("aria-label", done ? `Region ${k + 1} gotowy` : `Gwiazda regionu ${k + 1}`);
        });
        doneEl.set(`${count} / ${n * m}`, count / (n * m), `Region ${active + 1} z ${reg.length}`);
        ctx.progress(count / (n * m));
      }
      render();
    },
  });
}
