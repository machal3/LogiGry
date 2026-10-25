// Kostka: kostka Rubika w 3D na płótnie 2D (własna projekcja perspektywiczna, malowanie od tyłu).
// Przeciągnięcie po naklejce obraca warstwę, po tle obraca widok. Ruch = { axis 0|1|2, layer, dir ±1 }.
{
  // --- Logika bez DOM ---
  const COLORS = { "0,1,0": "#f8f9fa", "0,-1,0": "#ffd43b", "0,0,1": "#2fb344", "0,0,-1": "#1c7ed6", "1,0,0": "#e03131", "-1,0,0": "#fd7e14" };
  function makeCube(n) {
    const h = (n - 1) / 2, cubies = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) {
      const p = [x - h, y - h, z - h], stickers = [];
      for (const key of Object.keys(COLORS)) {
        const nv = key.split(",").map(Number), a = nv.findIndex((v) => v);
        if (p[a] === h * nv[a] && h) stickers.push({ n: nv, c: COLORS[key] });
      }
      if (stickers.length) cubies.push({ p, stickers });
    }
    return { n, cubies };
  }
  // obrót wektora o 90° (dir = +1 przeciwnie do wskazówek zegara, patrząc z dodatniego końca osi)
  function rot90(v, axis, dir) {
    const [x, y, z] = v;
    if (axis === 0) return dir > 0 ? [x, -z, y] : [x, z, -y];
    if (axis === 1) return dir > 0 ? [z, y, -x] : [-z, y, x];
    return dir > 0 ? [-y, x, z] : [y, -x, z];
  }
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  function applyMove(cube, m) {
    for (const c of cube.cubies) {
      if (!near(c.p[m.axis], m.layer)) continue;
      c.p = rot90(c.p, m.axis, m.dir).map((v) => Math.round(v * 2) / 2);
      for (const s of c.stickers) s.n = rot90(s.n, m.axis, m.dir).map(Math.round);
    }
  }
  function solved(cube) {
    const seen = {};
    for (const c of cube.cubies) for (const s of c.stickers) {
      const k = s.n.join(",");
      if (seen[k] && seen[k] !== s.c) return false;
      seen[k] = s.c;
    }
    return true;
  }
  const inverse = (m) => ({ ...m, dir: -m.dir });
  const same = (a, b) => a.axis === b.axis && near(a.layer, b.layer);
  // Stos ruchów z redukcją: ruch i jego odwrotność znikają, trzy takie same to jeden odwrotny.
  function pushMove(stack, m) {
    const top = stack[stack.length - 1];
    if (top && same(top, m) && top.dir === -m.dir) return stack.pop();
    const prev = stack[stack.length - 2];
    if (top && prev && same(top, m) && same(prev, m) && top.dir === m.dir && prev.dir === m.dir) { stack.pop(); stack.pop(); stack.push(inverse(m)); return; }
    stack.push({ ...m });
  }
  function scramble(cube, count) {
    const h = (cube.n - 1) / 2, layers = cube.n === 3 ? [-1, 0, 1] : [-h, h];
    const moves = [];
    while (moves.length < count) {
      const m = { axis: rnd(3), layer: pick(layers), dir: pick([1, -1]) };
      const last = moves[moves.length - 1];
      if (last && last.axis === m.axis) continue; // bez ruchów, które się znoszą lub łączą
      moves.push(m);
    }
    for (const m of moves) applyMove(cube, m);
    if (solved(cube)) return scramble(cube, count);
    return moves;
  }

  // --- Tryb bez końca ---
  // Kostka nr i (od 0): trzy małe (2–4 ruchy mieszania), trzy duże (3–5), potem coraz głębiej, do pełnego mieszania (20).
  function cubeSpec(i) {
    if (i < 3) return { size: 2, mix: 2 + i };
    if (i < 6) return { size: 3, mix: i };
    return { size: 3, mix: Math.min(20, 5 + 2 * (i - 5)) };
  }
  // Sekundy dopisywane za ułożoną kostkę nr i: rosną z mieszaniem, przy pełnym powoli maleją (najmniej 120 s).
  function cubeBonus(i) {
    const b = Math.min(180, 30 + 8 * cubeSpec(i).mix);
    return i < 13 ? b : Math.max(120, 180 - 5 * (i - 13));
  }
  // Punkty za bieg z liczby ułożonych kostek: 3 ≈ łatwy (10), 6 ≈ średni (25), 10 ≈ trudny (50), dalej coraz szybciej.
  const RUN_POINTS = [0, 2, 5, 10, 15, 20, 25, 31, 37, 43, 50];
  function runPoints(n) {
    if (n <= 10) return RUN_POINTS[Math.max(0, n)];
    let p = 50;
    for (let k = 1; k <= n - 10; k++) p += 6 + k;
    return Math.min(150, p);
  }
  const END = { start: 120, hintCost: 15 };

  if (typeof module !== "undefined") module.exports = { makeCube, applyMove, solved, scramble, pushMove, inverse, rot90, cubeSpec, cubeBonus, runPoints, END };

  if (typeof registerGame !== "undefined") registerGame({
    id: "kostka",
    cat: "lamiglowki",
    name: "Kostka",
    author: "Claude Opus 5.5",
    desc: "Obracaj warstwy trójwymiarowej kostki, aż każda ściana będzie w jednym kolorze.",
    color: "#e03a3e",
    ink: "#ffffff",
    glyph: ["#####", "#.#.#", "#####", "#.#.#", "#####"],
    levels: [
      { key: "easy", name: "2 × 2", points: 10, size: 2, mix: 3, hints: true },
      { key: "medium", name: "3 × 3", points: 25, size: 3, mix: 5, hints: true },
      { key: "hard", name: "Pełna", points: 50, size: 3, mix: 24, hints: false },
    ],
    endless: { unit: ["kostka", "kostki", "kostek"] },
    rules: [
      "Przeciągnij po naklejce w stronę, w którą ma się obrócić jej warstwa. Przeciągnięcie po tle obraca całą kostkę.",
      "Ułóż kostkę tak, żeby każda ściana miała jeden kolor.",
      "Łatwy: mała kostka pomieszana trzema ruchami. Średni: duża kostka, pięć ruchów. Trudny: duża kostka pomieszana całkowicie.",
      "Klawiatura: U, D, L, R, F, B obracają ściany (z Shift w drugą stronę), strzałki obracają widok.",
      "Tryb ∞: kolejne, coraz mocniej pomieszane kostki na czas; ułożona kostka dodaje sekundy, podpowiedź zabiera 15 s.",
    ],
    achievements: [
      { id: "samodzielnie", name: "Samodzielnie", desc: "Ułóż kostkę 3 × 3 bez podpowiedzi i bez cofania.", points: 10 },
      { id: "najkrotsza", name: "Najkrótsza droga", desc: "Ułóż kostkę w tylu ruchach, ile było mieszania.", points: 25 },
      { id: "sprinter", name: "Sprinter", desc: "Ułóż kostkę 3 × 3 pomieszaną pięcioma ruchami w mniej niż minutę.", points: 25 },
      { id: "speedcuber", name: "Speedcuber", desc: "Ułóż całkowicie pomieszaną kostkę w mniej niż 10 minut.", points: 50 },
      { id: "seria", name: "Seria", desc: "Ułóż 6 kostek w jednym biegu trybu bez końca.", points: 25 },
      { id: "maraton", name: "Maraton", desc: "Ułóż 12 kostek w jednym biegu trybu bez końca.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level, E = !!L.endless;
      const cv = canvasGame(board, ctx, 100, 100, { max: 64 });
      const { g } = cv;
      const s = { yaw: -0.62, pitch: 0.5, anim: null, queue: [], moves: 0, hinted: false, done: false, glow: 0 };
      const D = 9;
      // bieżąca kostka; w trybie bez końca zmienia się co etap
      let cube, stack, mix, scale, h, FACES;
      function setup(size, m) {
        cube = makeCube(size);
        stack = [];
        mix = m;
        for (const mv of scramble(cube, m)) pushMove(stack, mv);
        scale = 40 / size;
        h = (size - 1) / 2;
        FACES = { u: [1, h, -1], d: [1, -h, 1], r: [0, h, -1], l: [0, -h, 1], f: [2, h, -1], b: [2, -h, 1] };
        Object.assign(s, { moves: 0, hinted: false, hintMove: null, queue: [], anim: null });
      }
      // stan biegu: ułożone kostki, sekundy do końca, przerwa między kostkami
      const run = { n: 0, left: END.start, pause: 0, warned: false };

      let movesEl, faceEl, timeEl, runEl;
      if (E) {
        timeEl = statBlock(ctx, "Pozostały czas", { meter: true });
        runEl = statsBlock(ctx, "Bieg", ["Kostki", "Mieszanie", "Za bieg"]);
      } else {
        movesEl = statBlock(ctx, "Ruchy", { small: true });
        faceEl = statBlock(ctx, "Ułożone ściany", { meter: true });
      }
      const hintBtn = L.hints || E ? button(E ? `Podpowiedź −${END.hintCost} s` : "Podpowiedź", "btn-ghost wide", hint) : null;
      const resetView = button("Ustaw widok", "btn-ghost wide", () => { s.yaw = -0.62; s.pitch = 0.5; });
      const endBtn = E ? button("Zakończ bieg", "btn-ghost wide", () => endRun("Bieg zakończony")) : null;
      ctx.panel.append(panelBlock("", ...(hintBtn ? [hintBtn] : []), resetView, ...(endBtn ? [endBtn] : [])));
      // w biegu bez cofania: historia platformy nie zna granic między kostkami
      const save = E ? () => {} : ctx.undoable((m) => { if (!s.anim && !ctx.done && !run.pause) queue(inverse(m), true); });
      if (E) setup(cubeSpec(0).size, cubeSpec(0).mix);
      else setup(L.size, L.mix);

      // --- Rzutowanie ---
      function view(v) {
        const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
        const x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
        const y2 = v[1] * cp - z1 * sp, z2 = v[1] * sp + z1 * cp;
        return [x1, y2, z2];
      }
      const project = (w) => { const f = D / (D - w[2]); return [50 + w[0] * f * scale, 52 - w[1] * f * scale, w[2]]; };
      // obrót w trakcie animacji warstwy o dowolny kąt
      function rotA(v, axis, ang) {
        const c = Math.cos(ang), sn = Math.sin(ang), [x, y, z] = v;
        if (axis === 0) return [x, y * c - z * sn, y * sn + z * c];
        if (axis === 1) return [x * c + z * sn, y, -x * sn + z * c];
        return [x * c - y * sn, x * sn + y * c, z];
      }

      let polys = [];
      function build() {
        polys = [];
        const a = s.anim, ang = a ? a.dir * (Math.PI / 2) * ease(a.t) : 0;
        const list = cube.cubies.map((c) => {
          const moving = a && near(c.p[a.axis], a.layer);
          const tf = (v) => view(moving ? rotA(v, a.axis, ang) : v);
          const center = tf(c.p);
          return { c, tf, depth: center[2] };
        });
        list.sort((p, q) => p.depth - q.depth);
        for (const { c, tf } of list) {
          // korpus kostki: ściany zwrócone do widza
          for (let ax = 0; ax < 3; ax++) for (const sg of [-1, 1]) {
            const nv = [0, 0, 0];
            nv[ax] = sg;
            const nw = tf(nv).map((v, i) => v - tf([0, 0, 0])[i]);
            const fc = c.p.map((v, i) => v + nv[i] * 0.5);
            const fw = tf(fc);
            if (nw[0] * -fw[0] + nw[1] * -fw[1] + nw[2] * (D - fw[2]) <= 0) continue;
            const st = c.stickers.find((x) => x.n[ax] === sg);
            const u = [0, 0, 0], v = [0, 0, 0];
            u[(ax + 1) % 3] = 1; v[(ax + 2) % 3] = 1;
            const quad = (k) => [[-k, -k], [k, -k], [k, k], [-k, k]].map(([a1, b1]) => project(tf(fc.map((q, i) => q + u[i] * a1 + v[i] * b1)))).map(([x, y]) => [x, y]);
            const light = Math.max(0, (nw[2] * 0.8 + nw[1] * 0.45 - nw[0] * 0.1) / Math.hypot(...nw));
            polys.push({ pts: quad(0.5), fill: "#16181d", light, cubie: c });
            if (st) polys.push({ pts: quad(0.42), fill: st.c, light, sticker: st, cubie: c });
          }
        }
      }
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

      // --- Ruchy ---
      function queue(m, undo = false) {
        if (ctx.done || run.pause) return;
        s.queue.push({ ...m, undo });
      }
      function startNext() {
        const m = s.queue.shift();
        if (!m) return;
        if (!m.undo) save({ axis: m.axis, layer: m.layer, dir: m.dir });
        s.anim = { ...m, t: 0 };
        Sound.place(1 + ((m.axis * 3 + Math.round(m.layer + 1)) % 9));
      }
      function finishAnim() {
        const m = s.anim;
        s.anim = null;
        applyMove(cube, m);
        pushMove(stack, m);
        s.moves += m.undo ? -1 : 1;
        render();
        if (solved(cube)) (E ? cubeDone() : win());
      }
      // tryb bez końca: kostka ułożona, dopisz czas, po krótkiej przerwie (zegar stoi) następna
      function cubeDone() {
        const bonus = cubeBonus(run.n);
        run.n++;
        run.left += bonus;
        run.pause = 1.6;
        run.warned = false;
        s.glow = 1;
        s.queue = [];
        if (run.n >= 6) ctx.achieve("seria");
        if (run.n >= 12) ctx.achieve("maraton");
        const next = cubeSpec(run.n);
        ctx.toast(`+${bonus} s. Kostka ${run.n + 1}: ${next.size} × ${next.size}, ${next.mix} ${plural(next.mix, "ruch", "ruchy", "ruchów")}`);
        render();
      }
      function endRun(title) {
        if (ctx.done) return;
        ctx.over(run.n, runPoints(run.n), `${title}. Ułożone kostki: ${run.n}.`);
      }
      function win() {
        s.glow = 1;
        const mixedHard = L.key === "hard";
        if (L.size === 3 && !s.hinted && !ctx.undos) ctx.achieve("samodzielnie");
        if (s.moves <= L.mix && !s.hinted) ctx.achieve("najkrotsza");
        if (L.key === "medium" && ctx.time < 60) ctx.achieve("sprinter");
        if (mixedHard && ctx.time < 600) ctx.achieve("speedcuber");
        ctx.win(`Ruchy: ${s.moves}.`);
      }
      function hint() {
        if (ctx.done || s.anim || s.queue.length || run.pause) return;
        const m = stack[stack.length - 1];
        if (!m) return;
        if (E) { run.left = Math.max(1, run.left - END.hintCost); render(); }
        s.hinted = true;
        const inv = inverse(m);
        s.hintMove = { ...inv, t: 1.6 };
        ctx.toast("Strzałka pokazuje kolejny ruch");
      }

      // --- Wskaźnik: naklejka obraca warstwę, tło obraca widok ---
      let drag = null;
      const inside = (pt, poly) => {
        let c = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i], [xj, yj] = poly[j];
          if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
        }
        return c;
      };
      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        cv.cv.setPointerCapture?.(e.pointerId);
        const pt = cv.at(e);
        let hit = null;
        for (let i = polys.length - 1; i >= 0; i--) if (inside(pt, polys[i].pts)) { hit = polys[i]; break; }
        drag = { start: pt, last: pt, hit: hit && hit.sticker ? hit : null, view: !hit, used: false };
      });
      ctx.on(cv.cv, "pointermove", (e) => {
        if (!drag) return;
        const pt = cv.at(e);
        if (drag.view) {
          s.yaw += (pt[0] - drag.last[0]) * 0.03;
          s.pitch = Math.max(-1.3, Math.min(1.3, s.pitch + (pt[1] - drag.last[1]) * 0.03));
          drag.last = pt;
          return;
        }
        const d = [pt[0] - drag.start[0], pt[1] - drag.start[1]];
        if (drag.used || !drag.hit || Math.hypot(...d) < 4) return;
        drag.used = true;
        layerFromDrag(drag.hit, d);
      });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { drag = null; });

      function layerFromDrag(hit, d) {
        const { cubie, sticker } = hit;
        const pos = cubie.p.map((v, i) => v + sticker.n[i] * 0.5);
        const p0 = project(view(pos));
        let best = null;
        for (let ax = 0; ax < 3; ax++) {
          if (sticker.n[ax]) continue;
          const e = [0, 0, 0];
          e[ax] = 1;
          // ruch punktu przy obrocie wokół osi: e × pos
          const vel = [e[1] * pos[2] - e[2] * pos[1], e[2] * pos[0] - e[0] * pos[2], e[0] * pos[1] - e[1] * pos[0]];
          const p1 = project(view(pos.map((v, i) => v + vel[i] * 0.15)));
          const sv = [p1[0] - p0[0], p1[1] - p0[1]], len = Math.hypot(...sv) || 1;
          const score = (sv[0] * d[0] + sv[1] * d[1]) / len / Math.hypot(...d);
          if (!best || Math.abs(score) > Math.abs(best.score)) best = { ax, score };
        }
        if (!best || Math.abs(best.score) < 0.35) return;
        queue({ axis: best.ax, layer: cubie.p[best.ax], dir: best.score > 0 ? 1 : -1 });
      }

      // klawisze ścian: U D L R F B (Shift: w drugą stronę)
      const keys = heldKeys(ctx, (k, e) => {
        const f = FACES[k];
        if (f) queue({ axis: f[0], layer: f[1], dir: f[2] * (e.shiftKey ? -1 : 1) });
      });

      cv.loop((dt) => {
        if (keys.arrowleft) s.yaw -= dt * 2;
        if (keys.arrowright) s.yaw += dt * 2;
        if (keys.arrowup) s.pitch = Math.max(-1.3, s.pitch - dt * 2);
        if (keys.arrowdown) s.pitch = Math.min(1.3, s.pitch + dt * 2);
        if (E && !ctx.done) tickRun(dt);
        if (!s.anim && s.queue.length && !ctx.done) startNext();
        if (s.anim) {
          s.anim.t += dt * (s.queue.length ? 9 : 5.5);
          if (s.anim.t >= 1) finishAnim();
        }
        if (ctx.done) s.yaw += dt * 0.4;
        build();
        draw(dt);
      });

      function draw(dt) {
        // cień pod kostką
        const sh = g.createRadialGradient(50, 92, 1, 50, 92, 34);
        sh.addColorStop(0, "rgba(0,0,0,0.28)"); sh.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = sh;
        g.beginPath(); g.ellipse(50, 92, 34, 6, 0, 0, 7); g.fill();
        if (s.glow > 0) {
          s.glow = Math.max(0.35, s.glow - dt * 0.3);
          const gl = g.createRadialGradient(50, 52, 5, 50, 52, 48);
          gl.addColorStop(0, `rgba(255,236,170,${0.5 * s.glow})`); gl.addColorStop(1, "rgba(255,236,170,0)");
          g.fillStyle = gl; g.fillRect(0, 0, 100, 100);
        }
        g.lineJoin = "round";
        for (const p of polys) {
          g.beginPath();
          p.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
          g.closePath();
          g.fillStyle = p.fill;
          g.fill();
          if (p.sticker) {
            g.lineWidth = 0.9;
            g.strokeStyle = p.fill;
            g.stroke();
            // cieniowanie i połysk naklejki zależne od kąta
            g.fillStyle = `rgba(0,0,0,${0.32 * (1 - p.light)})`;
            g.fill();
            const [a, b, c] = p.pts;
            const gr = g.createLinearGradient(a[0], a[1], c[0], c[1]);
            gr.addColorStop(0, `rgba(255,255,255,${0.28 * p.light})`); gr.addColorStop(0.5, "rgba(255,255,255,0)");
            g.fillStyle = gr;
            g.fill();
          } else {
            g.lineWidth = 0.25;
            g.strokeStyle = "#0b0c0f";
            g.stroke();
          }
        }
        // podpowiedź: strzałka na warstwie
        if (s.hintMove && s.hintMove.t > 0) {
          s.hintMove.t -= dt;
          const m = s.hintMove, e = [0, 0, 0];
          e[m.axis] = 1;
          const pts = [];
          for (let k = 0; k <= 16; k++) {
            const ang = (m.dir * k * Math.PI) / 2 / 16 * 1.6;
            const r = h + 0.75;
            const base = [0, 0, 0];
            base[(m.axis + 1) % 3] = r;
            base[m.axis] = m.layer;
            const w = rotA(base, m.axis, ang - 0.4 * m.dir);
            pts.push(project(view(w)));
          }
          g.strokeStyle = `rgba(255,212,59,${Math.min(1, m.t)})`;
          g.lineWidth = 1.6; g.lineCap = "round";
          g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
          const [x2, y2] = pts[pts.length - 1], [x1, y1] = pts[pts.length - 3];
          const an = Math.atan2(y2 - y1, x2 - x1);
          g.fillStyle = g.strokeStyle;
          g.beginPath(); g.moveTo(x2 + Math.cos(an) * 3, y2 + Math.sin(an) * 3); g.lineTo(x2 + Math.cos(an + 2.3) * 3, y2 + Math.sin(an + 2.3) * 3); g.lineTo(x2 + Math.cos(an - 2.3) * 3, y2 + Math.sin(an - 2.3) * 3); g.fill();
        }
      }

      // zegar biegu; w przerwie między kostkami stoi
      function tickRun(dt) {
        if (run.pause) {
          run.pause = Math.max(0, run.pause - dt);
          if (!run.pause) { const sp = cubeSpec(run.n); setup(sp.size, sp.mix); s.glow = 0; render(); }
          return;
        }
        const before = Math.ceil(run.left);
        run.left = Math.max(0, run.left - dt);
        if (!run.warned && run.left <= 15) { run.warned = true; ctx.toast("Zostało 15 sekund"); Sound.error(); }
        if (Math.ceil(run.left) !== before) render();
        if (!run.left) endRun("Koniec czasu");
      }

      function render() {
        // ściany w jednym kolorze
        const faces = {};
        for (const c of cube.cubies) for (const st of c.stickers) (faces[st.n.join(",")] ||= new Set()).add(st.c);
        const done = Object.values(faces).filter((x) => x.size === 1).length;
        ctx.progress(run.pause ? 1 : done / 6);
        if (!E) {
          movesEl.set(s.moves);
          faceEl.set(`${done} z 6`, done / 6);
          return;
        }
        const t = Math.ceil(run.left);
        timeEl.set(fmt(t), Math.min(1, t / 180), `ściany: ${done} z 6`);
        runEl.set("Kostki", run.n);
        runEl.set("Mieszanie", `${mix} ${plural(mix, "ruch", "ruchy", "ruchów")}`);
        runEl.set("Za bieg", `${runPoints(run.n)} pkt`);
      }
      render();
    },
  });
}
