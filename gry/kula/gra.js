// Kula: toczona kulka po przechyłanym drewnianym labiryncie widzianym w perspektywie.
// Plansza jest generowana, ale zawsze ma wolną od dziur drogę do wyjścia (odstęp 3 pól od trasy).
{
  // Kierunki w labiryncie: 0 góra, 1 prawo, 2 dół, 3 lewo.
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

  // Fizyka: promień kuli w polach, przyspieszenie od przechyłu, tłumienie, odbicie od ściany.
  const R = 0.28, G = 30, DAMP = 1.1, REST = 0.32, VMAX = 7, FALL = 0.2, GEM = 0.5, EXIT = 0.45;

  // --- Generacja poziomu: labirynt, trasa, dziury, kryształy ---
  function build({ cols, rows, holes: holeN, gems: gemN }) {
    const N = cols * rows;
    const cells = [];
    for (let i = 0; i < N; i++) cells.push([1, 1, 1, 1]);
    // labirynt metodą losowego przejścia w głąb
    const seen = new Array(N).fill(false);
    const stack = [0];
    seen[0] = true;
    while (stack.length) {
      const i = stack[stack.length - 1], c = i % cols, r = (i / cols) | 0;
      const opts = [];
      for (let d = 0; d < 4; d++) {
        const nc = c + DX[d], nr = r + DY[d];
        if (nc >= 0 && nr >= 0 && nc < cols && nr < rows && !seen[nr * cols + nc]) opts.push(d);
      }
      if (!opts.length) { stack.pop(); continue; }
      const d = pick(opts), j = (r + DY[d]) * cols + c + DX[d];
      cells[i][d] = 0;
      cells[j][(d + 2) % 4] = 0;
      seen[j] = true;
      stack.push(j);
    }
    // odległości od startu i trasa do najdalszego pola
    const dist = new Array(N).fill(-1), prev = new Array(N).fill(-1);
    dist[0] = 0;
    const q = [0];
    for (let k = 0; k < q.length; k++) {
      const i = q[k], c = i % cols, r = (i / cols) | 0;
      for (let d = 0; d < 4; d++) {
        if (cells[i][d]) continue;
        const j = (r + DY[d]) * cols + c + DX[d];
        if (dist[j] === -1) { dist[j] = dist[i] + 1; prev[j] = i; q.push(j); }
      }
    }
    let exit = 0;
    for (let i = 0; i < N; i++) if (dist[i] > dist[exit]) exit = i;
    const path = [];
    for (let i = exit; i !== -1; i = prev[i]) path.push(i);
    path.reverse();
    // dziury w bezpiecznej odległości od trasy (co najmniej 3 pola po labiryncie)
    const dPath = new Array(N).fill(99);
    const q2 = path.map((i) => [i, 0]);
    for (const [i, d0] of q2) dPath[i] = 0;
    for (let k = 0; k < q2.length; k++) {
      const [i, d0] = q2[k], c = i % cols, r = (i / cols) | 0;
      if (d0 >= 3) continue;
      for (let d = 0; d < 4; d++) {
        if (cells[i][d]) continue;
        const j = (r + DY[d]) * cols + c + DX[d];
        if (dPath[j] > d0 + 1) { dPath[j] = d0 + 1; q2.push([j, d0 + 1]); }
      }
    }
    const safe3 = [], safe2 = [];
    for (let i = 0; i < N; i++) {
      if (i === exit || dPath[i] === 0) continue;
      (dPath[i] >= 3 ? safe3 : safe2).push(i);
    }
    shuffle(safe3);
    shuffle(safe2);
    const safe = [...safe3, ...safe2];
    const holes = safe.slice(0, Math.min(holeN, safe.length)).map((i) => ({ c: i % cols, r: (i / cols) | 0 }));
    // kryształy w równych odstępach wzdłuż trasy, nigdy na starcie ani wyjściu
    const gems = [];
    const step = Math.max(2, Math.floor((path.length - 2) / (gemN + 1)));
    for (let k = 1; k <= gemN; k++) {
      const idx = Math.min(path.length - 2, k * step);
      const i = path[idx];
      gems.push({ c: i % cols, r: (i / cols) | 0 });
    }
    return { cols, rows, cells, exit, path, holes, gems };
  }

  // Odległość punktu od odcinka (plus wektor od najbliższego punktu).
  function segHit(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy;
    let t = L2 ? ((px - x1) * dx + (py - y1) * dy) / L2 : 0;
    t = Math.max(0, Math.min(1, t));
    const qx = x1 + t * dx, qy = y1 + t * dy;
    return [px - qx, py - qy, Math.hypot(px - qx, py - qy)];
  }

  // Ściany w sąsiedztwie kuli (segmenty w jednostkach planszy).
  function nearWalls(cells, cols, rows, cx, cy) {
    const out = [];
    for (let r = Math.max(0, cy - 1); r <= Math.min(rows - 1, cy + 1); r++)
      for (let c = Math.max(0, cx - 1); c <= Math.min(cols - 1, cx + 1); c++) {
        const w = cells[r * cols + c];
        if (w[0]) out.push([c, r, c + 1, r]);
        if (w[1]) out.push([c + 1, r, c + 1, r + 1]);
        if (w[2]) out.push([c, r + 1, c + 1, r + 1]);
        if (w[3]) out.push([c, r, c, r + 1]);
      }
    return out;
  }

  // Krok fizyki: przechył, rozpęd, tłumienie, odbicia od ścian. Zwraca zdarzenia.
  // x, y, vx, vy w jednostkach planszy; tilt w klasach [-0.5, 0.5].
  function physics(st, tiltX, tiltY, dt, L) {
    const ev = { hole: false, gem: false, hit: false, exit: false };
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = dt / steps;
    for (let k = 0; k < steps; k++) {
      st.vx += tiltX * G * h;
      st.vy += tiltY * G * h;
      const v = Math.hypot(st.vx, st.vy);
      if (v > VMAX) { st.vx *= VMAX / v; st.vy *= VMAX / v; }
      const damp = Math.max(0, 1 - DAMP * h);
      st.vx *= damp;
      st.vy *= damp;
      st.x += st.vx * h;
      st.y += st.vy * h;
      const cx = Math.min(L.cols - 1, Math.max(0, st.x | 0)), cy = Math.min(L.rows - 1, Math.max(0, st.y | 0));
      for (const [x1, y1, x2, y2] of nearWalls(L.cells, L.cols, L.rows, cx, cy)) {
        const [px, py, d] = segHit(st.x, st.y, x1, y1, x2, y2);
        if (d >= R) continue;
        const n = d < 1e-6 ? [1, 0] : [px / d, py / d];
        st.x += n[0] * (R - d);
        st.y += n[1] * (R - d);
        const vn = st.vx * n[0] + st.vy * n[1];
        if (vn < 0) {
          st.vx -= (1 + REST) * vn * n[0];
          st.vy -= (1 + REST) * vn * n[1];
          ev.hit = true;
        }
      }
      for (const hole of L.holes)
        if (Math.hypot(st.x - hole.c - 0.5, st.y - hole.r - 0.5) < FALL) ev.hole = true;
      for (const gem of L.gems) {
        if (gem.got) continue;
        if (Math.hypot(st.x - gem.c - 0.5, st.y - gem.r - 0.5) < GEM) { gem.got = true; ev.gem = true; }
      }
      if (Math.hypot(st.x - (L.exit % L.cols) - 0.5, st.y - ((L.exit / L.cols) | 0) - 0.5) < EXIT) ev.exit = true;
    }
    return ev;
  }

  if (typeof module !== "undefined") module.exports = { build, physics, R, G, FALL, GEM, EXIT };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "kula",
    cat: "lamiglowki",
    name: "Kula",
    author: "GLM 5.3 Flash",
    desc: "Przechylaj drewnianą planszę i tocz kulę do wyjścia, omijając dziury i zbierając kryształy.",
    color: "#5b21b6",
    ink: "#ffffff",
    glyph: ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, cols: 8, rows: 8, holes: 4, gems: 3, wind: 0 },
      { key: "medium", name: "Średni", points: 50, cols: 10, rows: 10, holes: 6, gems: 4, wind: 0.05 },
      { key: "hard", name: "Trudny", points: 100, cols: 12, rows: 12, holes: 10, gems: 5, wind: 0.12 },
    ],
    rules: [
      "Przechylaj planszę strzałkami albo klawiszami W A S D. Na dotyku przeciągnij palec po planszy, a kula potoczy się tą samą drogą.",
      "Kula ma rozpęd, więc wyprzedzaj zakręty i hamuj wcześnie. Popieranie o ścianę jest bezpieczne.",
      "Wpadnięcie w dziurę kończy partię. Ściany stoją na granicach pól, a dziury są z daleka od drogi do wyjścia.",
      "Kryształy wzdłuż drogi zbierz albo zostaw. Wyjście jest otwarte, a na trudnym poziomie plus wieje słaby wiatr.",
    ],
    achievements: [
      { id: "komplet", name: "Komplet", desc: "Zbierz wszystkie kryształy w jednej partii.", points: 10 },
      { id: "czysta-jazda", name: "Czysta jazda", desc: "Ukończ średni lub trudny poziom bez zderzenia ze ścianą.", points: 25 },
      { id: "zwinna", name: "Zwinna", desc: "Ukończ trudny poziom w mniej niż 75 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const lv = build(L);
      for (const gem of lv.gems) gem.got = false;
      const st = { x: 0.5, y: 0.5, vx: 0, vy: 0, hits: 0, sparks: [], trail: [] };
      const cv = canvasGame(board, ctx, 100, 74);
      const { g } = cv;
      const cs = getComputedStyle(board);
      const wood1 = cs.getPropertyValue("--ku-wood").trim();
      const wood2 = cs.getPropertyValue("--ku-wood2").trim();
      const woodSide = cs.getPropertyValue("--ku-side").trim();
      const wallTop = cs.getPropertyValue("--ku-wall").trim();
      const wallSide = cs.getPropertyValue("--ku-wall2").trim();
      const col = cv.theme.c;
      const onCol = cs.getPropertyValue("--ku-on").trim();
      const textCol = cv.theme.text;
      const bg = cv.theme.bg;

      // HUD
      const gemEl = statBlock(ctx, "Kryształy", { small: true });
      const hitEl = statBlock(ctx, "Zderzenia", { small: true });
      ctx.panel.append(panelBlock("Sterowanie", button("Wypoziomuj", "btn-ghost wide", () => { tiltFlat = true; })));

      // Sterowanie: klawiatura oraz przeciąganie palca po planszy
      const keys = heldKeys(ctx);
      let drag = null, tiltFlat = false;
      const onMove = (e) => {
        const [mx, my] = cv.at(e);
        drag = [(mx - 50) / 50, (my - 37) / 37];
      };
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); onMove(e); });
      ctx.on(cv.cv, "pointermove", (e) => { if (drag) onMove(e); });
      for (const evv of ["pointerup", "pointercancel"]) ctx.on(cv.cv, evv, () => { drag = null; });

      const HOLD = 0.55;
      let windT = 0;
      cv.loop((dt) => {
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        let tiltX = 0, tiltY = 0;
        if (drag) {
          tiltX = Math.max(-1, Math.min(1, drag[0])) * HOLD;
          tiltY = Math.max(-1, Math.min(1, drag[1])) * HOLD;
        } else {
          tiltX = Math.max(-HOLD, Math.min(HOLD, kx * HOLD));
          tiltY = Math.max(-HOLD, Math.min(HOLD, ky * HOLD));
        }
        if (tiltFlat) { tiltX = 0; tiltY = 0; tiltFlat = false; drag = null; }
        if (L.wind && !ctx.done) {
          windT += dt;
          const w = L.wind * Math.sin(windT * 0.9);
          tiltX += w;
          tiltY += w * 0.7;
        }
        if (!ctx.done) {
          curTilt = [tiltX, tiltY];
          const ev = physics(st, tiltX, tiltY, dt, lv);
          st.t += dt;
          st.sparks = st.sparks.filter((p) => (p.a -= dt * 2.4) > 0);
          for (const p of st.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += dt; }
          if (ev.hit) { st.hits++; Sound.tap(); }
          if (ev.gem) {
            Sound.place(1 + lv.gems.filter((x) => x.got).length);
            // iskra przy zebraniu kryształu
            for (let k = 0; k < 7; k++) {
              const a = (k / 7) * 6.28;
              st.sparks.push({ x: st.x, y: st.y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 1.6, z: 0.3, a: 1 });
            }
            renderHud();
            if (lv.gems.every((x) => x.got)) ctx.achieve("komplet");
          }
          if (ev.hole) { lose(); return render(dt); }
          if (ev.exit) { win(); return render(dt); }
          // smuga: ślad kulki, gdy się toczy
          if (Math.hypot(st.vx, st.vy) > 0.9) {
            st.trail.push({ x: st.x, y: st.y, a: 1 });
            if (st.trail.length > 24) st.trail.shift();
          }
          for (const t2 of st.trail) t2.a -= dt * 1.5;
          st.trail = st.trail.filter((t2) => t2.a > 0);
        } else {
          physics(st, tiltX * 0.2, tiltY * 0.2, Math.min(dt, 1 / 30), lv);
          st.t += dt;
        }
        render(dt);
        renderHud();
      });

      function renderHud() {
        const got = lv.gems.filter((x) => x.got).length;
        gemEl.set(`${got} z ${lv.gems.length}`, lv.gems.length ? got / lv.gems.length : 0);
        hitEl.set(String(st.hits));
        const dc = (lv.exit % L.cols) + 0.5 - st.x, dr = ((lv.exit / L.cols) | 0) + 0.5 - st.y;
        ctx.progress(Math.max(0, Math.min(1, 1 - Math.hypot(dc, dr) / (L.cols + L.rows))));
      }

      function win() {
        const got = lv.gems.filter((x) => x.got).length;
        if (!st.hits && L.key !== "easy") ctx.achieve("czysta-jazda");
        if (L.key === "hard" && ctx.time < 75) ctx.achieve("zwinna");
        ctx.win(`Kryształy: ${got} z ${lv.gems.length}. Zderzenia ze ścianą: ${st.hits}.`);
      }

      function lose() {
        ctx.lose("Wpadnięcie w dziurę", "Kula zniknęła pod planszą.");
      }

      // --- Rysowanie: perspektywiczny rzut przechyłanej planszy ---
      const KY = 0.5, KP = 0.45, BASEP = 1.02, CAM = 26, FS = 36;
      // rzut punktu świata (x, y, z) na ekran; y rośnie w głąb, z to wysokość
      function proj(x, y, z, yaw, pit) {
        const cyw = Math.cos(yaw), syw = Math.sin(yaw), cph = Math.cos(pit), sph = Math.sin(pit);
        const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
        const y2 = y * cph - z1 * sph, z2 = y * sph + z1 * cph;
        const d = CAM + z2;
        const s = FS / d;
        return [50 + x1 * s, 33 - y2 * s, d, s];
      }

      let curYaw = 0, curPit = 0, curTilt = [0, 0];
      const WALL_H = 0.55, TX = 0.07;

      // Wszystkie ściany planszy naraz: wewnętrzne i graniczne.
      const allWalls = [];
      for (let r = 0; r < L.rows; r++)
        for (let c = 0; c < L.cols; c++) {
          const w = lv.cells[r * L.cols + c];
          if (w[0]) allWalls.push([c, r, c + 1, r]);
          if (w[1]) allWalls.push([c + 1, r, c + 1, r + 1]);
          if (w[2]) allWalls.push([c, r + 1, c + 1, r + 1]);
          if (w[3]) allWalls.push([c, r, c, r + 1]);
        }

      const W0 = L.cols / 2, R0 = L.rows / 2;
      function P(x, y, z) { return proj(x - W0, y - R0, z, curYaw, curPit); }

      function poly(pts, fill) {
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        if (fill) { g.fillStyle = fill; g.fill(); }
      }

      function render(dt) {
        curYaw = -curTilt[0] * KY;
        curPit = -(BASEP + curTilt[1] * KP);
        g.fillStyle = bg;
        g.fillRect(0, 0, 100, 74);

        // podstawka pod planszą: krawędzie boczne, ciemniejsze
        poly([P(0, 0, 0), P(L.cols, 0, 0), P(L.cols, 0, -0.6), P(0, 0, -0.6)], woodSide);
        poly([P(0, L.rows, 0), P(L.cols, L.rows, 0), P(L.cols, L.rows, -0.6), P(0, L.rows, -0.6)], woodSide);
        poly([P(0, 0, 0), P(0, L.rows, 0), P(0, L.rows, -0.6), P(0, 0, -0.6)], woodSide);
        poly([P(L.cols, 0, 0), P(L.cols, L.rows, 0), P(L.cols, L.rows, -0.6), P(L.cols, 0, -0.6)], woodSide);

        // pola w szachownicę dwóch odcieni drewna
        for (let r = 0; r < L.rows; r++)
          for (let c = 0; c < L.cols; c++)
            poly([P(c, r, 0), P(c + 1, r, 0), P(c + 1, r + 1, 0), P(c, r + 1, 0)], (r + c) % 2 ? wood1 : wood2);

        // wyjście: pulsujące podświetlenie pola
        const ex = lv.exit % L.cols, ey = (lv.exit / L.cols) | 0;
        const pulse = 0.2 + 0.12 * Math.sin(st.t * 4);
        poly([P(ex, ey, 0.02), P(ex + 1, ey, 0.02), P(ex + 1, ey + 1, 0.02), P(ex, ey + 1, 0.02)],
          colorMix(col, pulse));
        // maszt z chorągiewką nad wyjściem
        const [fx, fyf, , fs2] = P(ex + 0.5, ey + 0.5, WALL_H);
        g.strokeStyle = colorMix("#ffffff", 0.75);
        g.lineWidth = 0.4;
        g.beginPath();
        g.moveTo(fx, fyf);
        g.lineTo(fx, fyf - 4.6 * fs2);
        g.stroke();
        const wave = Math.sin(st.t * 5.3) * 0.4;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(fx, fyf - 4.6 * fs2);
        g.lineTo(fx + 2.3 * fs2, fyf - (3.9 - wave * 0.4) * fs2);
        g.lineTo(fx, fyf - 3.1 * fs2);
        g.closePath();
        g.fill();

        // dziury
        for (const hole of lv.holes) {
          const [hx, hy, , s] = P(hole.c + 0.5, hole.r + 0.5, 0);
          g.fillStyle = colorMix(bg, 0.9);
          g.beginPath();
          g.ellipse(hx, hy, 0.3 * s, 0.3 * s * Math.abs(Math.cos(curPit)), 0, 0, 7);
          g.fill();
          g.fillStyle = "#000000";
          g.beginPath();
          g.ellipse(hx, hy, 0.2 * s, 0.2 * s * Math.abs(Math.cos(curPit)), 0, 0, 7);
          g.fill();
        }

        // ściany: malowane od najdalszej
        const wallsSorted = allWalls
          .map((w) => {
            const a = P(w[0], w[1], WALL_H), b = P(w[2], w[3], WALL_H);
            return { w, d: a[2] + b[2] };
          })
          .sort((a, b) => b.d - a.d);
        for (const { w } of wallsSorted) {
          const [x1, y1, x2, y2] = w;
          const ew = x1 === x2; // ściana biegnąca z północy na południe
          if (ew) {
            const fin = x1 > W0 ? x1 - TX : x1 + TX; // widoczna dłuższa ściana boczna
            poly([P(fin, y1, WALL_H), P(fin, y2, WALL_H), P(fin, y2, 0), P(fin, y1, 0)], wallSide);
          } else {
            poly([P(x1, y2 + TX, WALL_H), P(x2, y2 + TX, WALL_H), P(x2, y2 + TX, 0), P(x1, y2 + TX, 0)], wallSide);
          }
          poly([P(x1, y1, WALL_H), P(x2, y2, WALL_H), P(x2 - TX, y2, WALL_H), P(x1 + (ew ? 0 : TX), y1 + (ew ? TX : 0), WALL_H)], wallTop);
        }

        // kryształy
        lv.gems.forEach((gem, i) => {
          if (gem.got) return;
          const bob = 0.26 + 0.05 * Math.sin(st.t * 3 + i * 2);
          const [gx, gy, , s] = P(gem.c + 0.5, gem.r + 0.5, bob);
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(gx, gy - 0.22 * s);
          g.lineTo(gx + 0.14 * s, gy);
          g.lineTo(gx, gy + 0.22 * s);
          g.lineTo(gx - 0.14 * s, gy);
          g.closePath();
          g.fill();
          g.fillStyle = "#ffffff";
          g.globalAlpha = 0.85;
          g.beginPath();
          g.arc(gx - 0.04 * s, gy - 0.07 * s, 0.03 * s, 0, 7);
          g.fill();
          g.globalAlpha = 1;
        });

        // ślad toczenia: zanikające kropki w barwach kuli
        for (const t2 of st.trail) {
          const [tx, ty, , ts] = P(t2.x, t2.y, 0.05);
          g.fillStyle = colorMix(col, t2.a * 0.35);
          g.beginPath();
          g.arc(tx, ty, R * ts * 0.3, 0, 7);
          g.fill();
        }

        // cień kuli i kula
        const [shx, shy, , ss] = P(st.x - curTilt[0] * 0.25, st.y - curTilt[1] * 0.25, 0.01);
        g.fillStyle = colorMix("#000000", 0.22);
        g.beginPath();
        g.ellipse(shx, shy, R * ss * 0.5, R * ss * 0.24, 0, 0, 7);
        g.fill();
        const [bx, by, bd, bs] = P(st.x, st.y, R);
        const br = R * bs;
        const grad = g.createRadialGradient(bx - br * 0.35, by - br * 0.35, br * 0.1, bx, by, br);
        grad.addColorStop(0, onCol);
        grad.addColorStop(0.5, col);
        grad.addColorStop(1, colorMix(col, 1));
        g.fillStyle = grad;
        g.beginPath();
        g.arc(bx, by, br, 0, 7);
        g.fill();

        // iskry po zebraniu kryształu
        for (const p of st.sparks) {
          const [sx, sy, , sp] = P(p.x, p.y, p.z);
          g.fillStyle = `rgba(255,255,255,${Math.max(0, p.a) * 0.9})`;
          g.beginPath();
          g.arc(sx, sy, 0.32 * sp, 0, 7);
          g.fill();
        }

        // strzałka przechyłu przy kuli
        if (!ctx.done && (Math.abs(curTilt[0]) + Math.abs(curTilt[1])) > 0.05) {
          const [ax, ay] = P(st.x + curTilt[0] * 1.6, st.y + curTilt[1] * 1.6, WALL_H);
          g.strokeStyle = colorMix("#ffffff", 0.6);
          g.lineWidth = 0.25;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(ax, ay);
          g.stroke();
          const ang = Math.atan2(ay - by, ax - bx);
          g.beginPath();
          g.moveTo(ax, ay);
          g.lineTo(ax - Math.cos(ang - 0.5) * 1.1, ay - Math.sin(ang - 0.5) * 1.1);
          g.lineTo(ax - Math.cos(ang + 0.5) * 1.1, ay - Math.sin(ang + 0.5) * 1.1);
          g.closePath();
          g.fillStyle = colorMix("#ffffff", 0.6);
          g.fill();
        }

        // wiatr w rogu na trudnym poziomie
        if (L.wind) {
          g.fillStyle = colorMix(textCol, 0.65);
          g.font = "3px sans-serif";
          g.fillText("wiatr", 3, 6);
          const wDir = Math.sin(windT * 0.9);
          g.strokeStyle = colorMix(textCol, 0.65);
          g.lineWidth = 0.35;
          g.beginPath();
          g.moveTo(3 + wDir * 2, 9);
          g.lineTo(9 + wDir * 2, 9);
          g.stroke();
          g.beginPath();
          g.moveTo(9 + wDir * 2, 9);
          g.lineTo(7.4 + wDir * 2, 7.7);
          g.lineTo(7.4 + wDir * 2, 10.3);
          g.closePath();
          g.fillStyle = colorMix(textCol, 0.65);
          g.fill();
        }
      }

      // Kolor z przezroczystością, dla rgba() z hexa.
      function colorMix(c, a) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgba(${r},${gg},${b2},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}

