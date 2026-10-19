// Metro (w stylu Mini Metro): stacje mają kształty, pasażer chce dojechać do dowolnej stacji o swoim kształcie.
// Gracz rysuje linie; pociągi jeżdżą tam i z powrotem. Trasę pasażera wyznacza przegląd sieci (z przesiadkami).
const Metro = (() => {
  const SHAPES = ["circle", "triangle", "square", "star", "cross"];
  // odległość w przystankach od każdej stacji do najbliższej stacji kształtu `shape` po liniach
  function distances(stations, lines, shape) {
    const adj = new Map(stations.map((s) => [s.id, new Set()]));
    for (const l of lines) for (let k = 1; k < l.stops.length; k++) { adj.get(l.stops[k - 1]).add(l.stops[k]); adj.get(l.stops[k]).add(l.stops[k - 1]); }
    const dist = new Map(), queue = [];
    for (const s of stations) if (s.shape === shape) { dist.set(s.id, 0); queue.push(s.id); }
    for (let q = 0; q < queue.length; q++) for (const nb of adj.get(queue[q])) if (!dist.has(nb)) { dist.set(nb, dist.get(queue[q]) + 1); queue.push(nb); }
    return dist;
  }
  // czy odcinek przecina rzekę (pionowy pas między rx0 a rx1)
  const crosses = (a, b, rx0, rx1) => (a.x < rx0 && b.x > rx1) || (b.x < rx0 && a.x > rx1) || (a.x >= rx0 && a.x <= rx1) !== (b.x >= rx0 && b.x <= rx1);
  // odcinek jak na schemacie metra: najpierw prosto, potem pod kątem 45°
  function route(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
    const m = ax > ay ? { x: a.x + Math.sign(dx) * (ax - ay), y: a.y } : { x: a.x, y: a.y + Math.sign(dy) * (ay - ax) };
    return [a, m, b];
  }
  // przystanki przed pociągiem: od stacji `i` w kierunku `d`, z zawróceniem na końcu linii
  const ahead = (stops, i, d) => (d > 0 ? stops.slice(i + 1) : stops.slice(0, i).reverse());
  const api = { SHAPES, distances, crosses, route, ahead, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Metro;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "metro"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, target: 60, rate: 0.8, tunnels: 3 },
    { key: "medium", name: "Średni", points: 50, target: 120, rate: 1, tunnels: 2 },
    { key: "hard", name: "Trudny", points: 100, target: 200, rate: 1.25, tunnels: 2 },
  ],
  rules: [
    "Pasażer (mały kształt przy stacji) chce dojechać do dowolnej stacji o takim samym kształcie. Połącz stacje liniami, a pociągi zrobią resztę, także z przesiadkami.",
    "Przeciągnij od stacji do stacji, żeby zbudować nową linię. Przeciągnij koniec linii (znacznik w kształcie litery T) do kolejnej stacji, żeby ją przedłużyć, albo z powrotem, żeby ją skrócić. Można też klikać stacje po kolei.",
    "Przejście przez rzekę zużywa tunel. Linię wybierasz w panelu albo klawiszami 1–7, Delete usuwa wybraną linię, Esc kończy rysowanie.",
    "Gdy na stacji czeka zbyt wielu pasażerów, zaczyna się odliczanie. Pełny okrąg kończy grę. Co tydzień wybierasz nagrodę: nową linię, dodatkowy pociąg albo tunel.",
    "Dowieź wymaganą liczbę pasażerów. Zatrzymaj grę spacją, żeby spokojnie przebudować sieć.",
  ],
  achievements: [
    { id: "pierwsze-kursy", name: "Pierwsze kursy", desc: "Dowieź 50 pasażerów w jednej grze.", points: 10 },
    { id: "plynny-ruch", name: "Płynny ruch", desc: "Wygraj średni poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 25 },
    { id: "dyspozytor", name: "Dyspozytor doskonały", desc: "Wygraj trudny poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 50 },
  ],
  mount(board, ctx) {
    const { SHAPES, route, ahead } = Metro;
    const lv = ctx.level;
    const W = 160, H = 110, RX0 = 72, RX1 = 84, CAP = 6, MAXW = 7, R = 3.3, HIT = 7;
    const VMAX = 26, ACC = 32, WEEK = 45;
    const COLORS = ["#e03131", "#1c7ed6", "#f59f00", "#2f9e44", "#ae3ec9", "#0c8599", "#e8590c"];
    const NAMES = ["Czerwona", "Niebieska", "Żółta", "Zielona", "Fioletowa", "Morska", "Pomarańczowa"];
    const cv = canvasGame(board, ctx, W, H, { max: 90 });
    const { g, theme } = cv;
    let nextId = 1;
    const s = { stations: [], lines: [], trains: [], fx: [], delivered: 0, t: 0, week: 0, tunnels: lv.tunnels, sel: 0, paused: false, spawnS: 0, spawnP: 1.5, choosing: false };
    Metro.last = s;
    const addStation = (shape) => {
      for (let t = 0; t < 200; t++) {
        const x = 10 + Math.random() * (W - 20), y = 10 + Math.random() * (H - 20);
        if ((x > RX0 - 6 && x < RX1 + 6) || (x < 34 && y > H - 18)) continue;
        if (s.stations.some((o) => Math.hypot(o.x - x, o.y - y) < 18)) continue;
        s.stations.push({ id: nextId++, x, y, shape, wait: [], over: 0, born: s.t });
        return;
      }
    };
    ["circle", "triangle", "square"].forEach(addStation);
    addStation("circle");
    s.stations.forEach((st) => (st.born = -9));
    for (let k = 0; k < 3; k++) s.lines.push({ color: COLORS[k], stops: [] });

    const deliveredEl = statBlock(ctx, "Dowiezieni", { meter: true });
    const linesEl = el("div", "mt-lines");
    const tunnelEl = el("p", "rl-small");
    const clearBtn = button("Usuń linię", "btn-ghost wide danger", () => clearLine(s.sel));
    ctx.panel.append(panelBlock("Linie", linesEl, tunnelEl, clearBtn));
    const pauseSeg = segmented("Czas", ["Gra", "Pauza"], (k) => setPause(k === 1));
    pauseSeg.set(0);
    ctx.panel.append(panelBlock("", pauseSeg.el));
    const rewardBox = el("div", "sv-levelup");
    rewardBox.hidden = true;
    board.append(rewardBox);
    cv.cv.setAttribute("aria-label", "Mapa metra. Przeciągnij od stacji do stacji, żeby zbudować linię.");
    cv.cv.setAttribute("role", "img");

    function setPause(on) { s.paused = on; pauseSeg.set(on ? 1 : 0); }
    const byId = (id) => s.stations.find((x) => x.id === id);

    // --- budowa linii ---
    function lineTunnels(stops) {
      let n = 0;
      for (let k = 1; k < stops.length; k++) if (Metro.crosses(byId(stops[k - 1]), byId(stops[k]), RX0, RX1)) n++;
      return n;
    }
    function usedTunnels() { return s.lines.reduce((a, l) => a + lineTunnels(l.stops), 0); }
    // dołożenie stacji na koniec linii: end 0 = początek, 1 = koniec
    function extend(li, end, st) {
      const l = s.lines[li];
      if (l.stops.includes(st.id)) return false;
      const stops = end ? [...l.stops, st.id] : [st.id, ...l.stops];
      if (usedTunnels() - lineTunnels(l.stops) + lineTunnels(stops) > s.tunnels) {
        Sound.error();
        ctx.toast("Brak wolnych tuneli pod rzeką");
        replay(tunnelEl, "shake");
        return false;
      }
      l.stops = stops;
      if (l.stops.length === 2 && !s.trains.some((t) => t.line === li)) addTrain(li);
      Sound.place(1 + (l.stops.length % 8));
      s.fx.push({ x: st.x, y: st.y, t: 0, color: l.color });
      render();
      return true;
    }
    // zdjęcie ostatniej stacji z końca linii
    function shorten(li, end) {
      const l = s.lines[li];
      if (l.stops.length <= 2) {
        // z linii zostaje jedna stacja, a gracz dalej trzyma jej koniec
        const keep = end ? l.stops[0] : l.stops[1];
        clearLine(li);
        l.stops = [keep];
        grab = { li, end: 1 };
        return render();
      }
      const gone = end ? l.stops.pop() : l.stops.shift();
      for (const t of s.trains) if (t.line === li && (t.from === gone || t.to === gone)) {
        // pociąg z usuniętego odcinka staje na nowym końcu linii i tam wymienia pasażerów
        const id = end ? l.stops[l.stops.length - 1] : l.stops[0];
        Object.assign(t, { from: id, to: end ? l.stops[l.stops.length - 2] : l.stops[1], f: 0, v: 0 });
        t.wait = 0.4 + atStation(t) * 0.12;
      }
      Sound.erase();
      render();
    }
    function clearLine(li) {
      const l = s.lines[li];
      if (!l.stops.length) return;
      s.trains.filter((t) => t.line === li).forEach((t) => dropAt(t, t.f < 0.5 ? t.from : t.to));
      s.trains = s.trains.filter((t) => t.line !== li);
      l.stops = [];
      if (grab?.li === li) grab = null;
      Sound.erase();
      render();
    }
    // pasażerowie z usuwanego pociągu wysiadają na stacji `id`
    function dropAt(t, id) {
      const st = byId(id);
      for (const p of t.load) if (p === st.shape) s.delivered++; else st.wait.push(p);
      t.load = [];
    }
    function addTrain(li) {
      const l = s.lines[li];
      const t = { line: li, from: l.stops[0], to: l.stops[1], f: 0, v: 0, wait: 0, load: [] };
      s.trains.push(t);
      t.wait = 0.3 + atStation(t) * 0.12;
    }

    // --- sterowanie ---
    // grab: linia i koniec, za który trzyma gracz; zostaje po puszczeniu, żeby można było klikać stacje po kolei
    let grab = null, dragging = false, moved = false, ptr = null, overId = null;
    const stationAt = (x, y, hit = HIT) => {
      let best = null, bd = hit;
      for (const o of s.stations) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } }
      return best;
    };
    const endId = (gr) => { const l = s.lines[gr.li]; return gr.end ? l.stops[l.stops.length - 1] : l.stops[0]; };
    const prevId = (gr) => { const l = s.lines[gr.li]; return l.stops.length < 2 ? null : gr.end ? l.stops[l.stops.length - 2] : l.stops[1]; };
    function release() {
      if (grab && s.lines[grab.li].stops.length === 1) s.lines[grab.li].stops = [];
      grab = null;
      render();
    }
    // ruch końcem linii nad stację: przedłuża albo skraca
    function moveGrab(st) {
      if (!grab || !st || st.id === endId(grab)) return;
      if (st.id === prevId(grab)) return shorten(grab.li, grab.end);
      const l = s.lines[grab.li];
      if (!l.stops.includes(st.id)) extend(grab.li, grab.end, st);
    }
    function pickUp(st) {
      // trzymany koniec: kliknięcie kolejnej stacji przedłuża linię
      if (grab && (st.id === prevId(grab) || !s.lines[grab.li].stops.includes(st.id))) return moveGrab(st);
      if (grab && st.id === endId(grab)) return;
      release();
      const sel = s.lines[s.sel];
      const own = (li) => { const l = s.lines[li]; return l.stops.length < 2 ? -1 : l.stops[0] === st.id ? 0 : l.stops[l.stops.length - 1] === st.id ? 1 : -1; };
      let li = -1;
      if (sel.stops.length) li = own(s.sel) >= 0 ? s.sel : s.lines.findIndex((_, i) => own(i) >= 0);
      if (li >= 0) { grab = { li, end: own(li) }; s.sel = li; Sound.tap(); return render(); }
      li = sel.stops.length ? s.lines.findIndex((l) => !l.stops.length) : s.sel;
      if (li < 0) {
        Sound.error();
        ctx.toast("Wszystkie linie są zajęte. Przeciągnij koniec linii albo usuń jedną.");
        return;
      }
      s.lines[li].stops = [st.id];
      grab = { li, end: 1 };
      s.sel = li;
      Sound.tap();
      render();
    }
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done || s.choosing) return;
      e.preventDefault();
      ptr = cv.at(e);
      const st = stationAt(...ptr);
      if (!st) return release();
      cv.cv.setPointerCapture?.(e.pointerId);
      dragging = true;
      moved = false;
      overId = st.id;
      pickUp(st);
    });
    ctx.on(cv.cv, "pointermove", (e) => {
      const prev = ptr;
      ptr = cv.at(e);
      cv.cv.style.cursor = dragging ? "grabbing" : stationAt(...ptr) ? "pointer" : "";
      if (!dragging || ctx.done || s.choosing) return;
      // szybki ruch przeskakuje stacje między zdarzeniami, więc sprawdzamy całą drogę wskaźnika
      const n = prev ? Math.max(1, Math.ceil(Math.hypot(ptr[0] - prev[0], ptr[1] - prev[1]) / 2)) : 1;
      for (let k = 1; k <= n; k++) {
        const st = prev ? stationAt(prev[0] + ((ptr[0] - prev[0]) * k) / n, prev[1] + ((ptr[1] - prev[1]) * k) / n, HIT - 1.5) : stationAt(...ptr, HIT - 1.5);
        if ((st?.id ?? null) === overId) continue;
        overId = st?.id ?? null;
        if (st) moved = true;
        moveGrab(st);
      }
    });
    const up = (e) => {
      if (!dragging) return;
      dragging = false;
      overId = null;
      if (e.pointerType !== "mouse") ptr = null;
      // po przeciągnięciu rysowanie się kończy; po stuknięciu koniec zostaje w ręce i można klikać kolejne stacje
      if (moved && grab && s.lines[grab.li].stops.length > 1) { grab = null; render(); }
    };
    ctx.on(cv.cv, "pointerup", up);
    ctx.on(cv.cv, "pointercancel", up);
    ctx.on(cv.cv, "pointerleave", () => { if (!dragging) ptr = null; });
    heldKeys(ctx, (k) => {
      if (k === " ") return setPause(!s.paused);
      if (s.choosing) { if (/^[1-3]$/.test(k)) rewardBox.querySelectorAll(".sv-opt")[+k - 1]?.click(); return; }
      if (k === "escape") return release();
      if (k === "delete" || k === "backspace") return clearLine(s.sel);
      if (/^[1-7]$/.test(k) && +k <= s.lines.length) { release(); s.sel = +k - 1; Sound.tap(); render(); }
    });

    function weekReward() {
      s.choosing = true;
      release();
      const opts = [];
      if (s.lines.length < COLORS.length) opts.push(["Nowa linia", "Dodatkowy kolor do zbudowania.", COLORS[s.lines.length], () => s.lines.push({ color: COLORS[s.lines.length], stops: [] })]);
      opts.push(["Pociąg", "Drugi pociąg na najbardziej zatłoczonej linii.", "", () => {
        const busy = s.lines.map((l, i) => [i, l.stops.reduce((a, id) => a + byId(id).wait.length, 0)]).filter(([i]) => s.lines[i].stops.length > 1).sort((a, b) => b[1] - a[1])[0];
        if (busy) { addTrain(busy[0]); ctx.toast(`Nowy pociąg: linia ${NAMES[busy[0]].toLowerCase()}`); }
        else { s.spareTrain = true; ctx.toast("Pociąg czeka w zajezdni na pierwszą linię"); }
      }]);
      opts.push(["Tunel", "Jeszcze jedno przejście pod rzeką.", "", () => s.tunnels++]);
      rewardBox.replaceChildren(el("h3", "", `Tydzień ${s.week}. Wybierz nagrodę`));
      opts.forEach(([n, t, color, fn], k) => {
        const b = button("", "sv-opt", () => { fn(); rewardBox.hidden = true; s.choosing = false; Sound.line(); render(); });
        if (color) b.style.setProperty("--oc", color);
        b.append(el("b", "", n), el("p", "", t), el("kbd", "", k + 1));
        rewardBox.append(b);
      });
      rewardBox.hidden = false;
      Sound.line();
      rewardBox.querySelector(".sv-opt").focus({ preventScroll: true });
    }

    // --- geometria linii: odcinki pod kątem 45°, rozsunięte, gdy kilka linii jedzie tą samą trasą ---
    let geo = [];
    function buildGeo() {
      const shared = new Map();
      s.lines.forEach((l, li) => {
        for (let k = 1; k < l.stops.length; k++) {
          const key = Math.min(l.stops[k - 1], l.stops[k]) + "-" + Math.max(l.stops[k - 1], l.stops[k]);
          if (!shared.has(key)) shared.set(key, []);
          shared.get(key).push(li);
        }
      });
      geo = s.lines.map((l, li) => {
        const segs = [];
        for (let k = 1; k < l.stops.length; k++) {
          const a = byId(l.stops[k - 1]), b = byId(l.stops[k]);
          const key = Math.min(a.id, b.id) + "-" + Math.max(a.id, b.id), on = shared.get(key);
          // normalna liczona zawsze od stacji o mniejszym id, żeby linie rozsuwały się w tę samą stronę
          const [p, q] = a.id < b.id ? [a, b] : [b, a];
          const len0 = Math.hypot(q.x - p.x, q.y - p.y) || 1;
          const off = (on.indexOf(li) - (on.length - 1) / 2) * 1.9;
          const nx = (-(q.y - p.y) / len0) * off, ny = ((q.x - p.x) / len0) * off;
          const pts = route(a, b).map((o) => ({ x: o.x + nx, y: o.y + ny }));
          const lens = [Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y), Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y)];
          segs.push({ pts, lens, len: lens[0] + lens[1] || 1, tunnel: Metro.crosses(a, b, RX0, RX1) });
        }
        return segs;
      });
    }
    // punkt i kierunek na odcinku w ułamku f (od niższego indeksu przystanku)
    function along(seg, f) {
      let d = f * seg.len;
      const k = d <= seg.lens[0] || !seg.lens[1] ? 0 : 1;
      if (k) d -= seg.lens[0];
      const a = seg.pts[k], b = seg.pts[k + 1], u = seg.lens[k] ? d / seg.lens[k] : 0;
      return [a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, Math.atan2(b.y - a.y, b.x - a.x)];
    }
    function trainXY(t) {
      const l = s.lines[t.line], i = l.stops.indexOf(t.from), j = l.stops.indexOf(t.to);
      const seg = geo[t.line][Math.min(i, j)];
      return along(seg, i < j ? t.f : 1 - t.f);
    }

    // --- symulacja ---
    function atStation(t) {
      const l = s.lines[t.line], st = byId(t.from), i = l.stops.indexOf(t.from), d = l.stops.indexOf(t.to) - i;
      const cache = {};
      const distOf = (shape) => (cache[shape] ||= Metro.distances(s.stations, s.lines, shape));
      const front = ahead(l.stops, i, d);
      // najbliższa celowi stacja przed pociągiem
      const bestAhead = (dist) => front.reduce((m, id) => Math.min(m, dist.get(id) ?? Infinity), Infinity);
      let moved = 0, got = 0;
      // wysiadanie: cel osiągnięty albo przesiadka, gdy dalsza jazda nie przybliża
      const stay = [];
      for (const p of t.load) {
        if (p === st.shape) { s.delivered++; got++; moved++; }
        else if (bestAhead(distOf(p)) >= (distOf(p).get(st.id) ?? Infinity)) { st.wait.push(p); moved++; }
        else stay.push(p);
      }
      t.load = stay;
      if (got) { Sound.place(1 + (s.delivered % 8)); s.fx.push({ x: st.x, y: st.y, t: 0, color: l.color, n: got }); }
      // wsiadanie: tylko gdy pociąg jedzie w stronę celu
      const keep = [];
      for (const p of st.wait) {
        const dist = distOf(p);
        if (t.load.length < CAP && bestAhead(dist) < (dist.get(st.id) ?? Infinity)) { t.load.push(p); moved++; }
        else keep.push(p);
      }
      st.wait = keep;
      return moved;
    }
    function moveTrain(t, dt) {
      const l = s.lines[t.line];
      if (t.wait > 0) { t.wait -= dt; return; }
      const i = l.stops.indexOf(t.from), j = l.stops.indexOf(t.to);
      const seg = geo[t.line][Math.min(i, j)];
      // przyspieszanie i hamowanie przed przystankiem
      const rest = (1 - t.f) * seg.len;
      t.v = Math.min(t.v + ACC * dt, VMAX, Math.max(3, Math.sqrt(2 * ACC * rest)));
      t.f += (t.v * dt) / seg.len;
      if (t.f < 1) return;
      const d = j - i, next = l.stops[j + d] === undefined ? j - d : j + d;
      Object.assign(t, { from: t.to, to: l.stops[next], f: 0, v: 0 });
      t.wait = 0.3 + atStation(t) * 0.12;
    }
    let uiT = 0;
    cv.loop((dt, now) => {
      buildGeo();
      if (!ctx.done && !s.paused && !s.choosing) step(dt);
      for (const f of s.fx) f.t += dt;
      s.fx = s.fx.filter((f) => f.t < 0.8);
      uiT += dt;
      if (uiT > 0.3) { uiT = 0; renderStats(); }
      draw(now / 1000);
    });
    function step(dt) {
      s.t += dt;
      // nowe stacje i pasażerowie, coraz częściej
      s.spawnS += dt;
      if (s.spawnS > 22 / lv.rate && s.stations.length < 18) {
        s.spawnS = 0;
        const shape = Math.random() < 0.55 ? "circle" : Math.random() < 0.5 ? "triangle" : Math.random() < 0.6 ? "square" : pick(SHAPES.slice(3));
        addStation(shape);
      }
      s.spawnP -= dt * lv.rate * (1 + s.t / 120);
      if (s.spawnP <= 0) {
        s.spawnP = 1.8;
        const st = pick(s.stations);
        const shapes = [...new Set(s.stations.map((o) => o.shape))].filter((x) => x !== st.shape);
        if (shapes.length) st.wait.push(pick(shapes));
      }
      if (s.spareTrain) { const li = s.lines.findIndex((l) => l.stops.length > 1); if (li >= 0) { s.spareTrain = false; addTrain(li); } }
      for (const t of s.trains) moveTrain(t, dt);
      for (const st of s.stations) {
        if (st.wait.length > MAXW) {
          if (!st.over) { Sound.error(); ctx.toast("Tłok na stacji. Dowieź pasażerów, zanim okrąg się zamknie."); }
          st.over += dt / 14;
          if (st.over > 0.5) s.crowded = true;
          if (st.over >= 1) { renderStats(); return ctx.lose("Przepełniona stacja", `Dowiezieni pasażerowie: ${s.delivered}.`); }
        } else st.over = Math.max(0, st.over - dt / 20);
      }
      if (s.t > (s.week + 1) * WEEK) { s.week++; weekReward(); }
      if (!s.got50 && s.delivered >= 50) { s.got50 = true; ctx.achieve("pierwsze-kursy"); }
      if (s.delivered >= lv.target && !s.crowded && ctx.level.key === "medium") ctx.achieve("plynny-ruch");
      if (s.delivered >= lv.target && !s.crowded && ctx.level.key === "hard") ctx.achieve("dyspozytor");
      if (s.delivered >= lv.target) { renderStats(); ctx.win(`Tygodnie: ${s.week + 1}, stacje: ${s.stations.length}.`); }
    }

    // --- rysowanie ---
    function shape(kind, x, y, r) {
      g.beginPath();
      if (kind === "circle") g.arc(x, y, r, 0, Math.PI * 2);
      if (kind === "square") g.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
      if (kind === "triangle") { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 1.1, y + r * 0.75); g.lineTo(x - r * 1.1, y + r * 0.75); }
      if (kind === "star") for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.55 : r * 1.2; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      if (kind === "cross") { const q = r * 0.38; [[-q, -r], [q, -r], [q, -q], [r, -q], [r, q], [q, q], [q, r], [-q, r], [-q, q], [-r, q], [-r, -q], [-q, -q]].forEach(([dx, dy], k) => g[k ? "lineTo" : "moveTo"](x + dx, y + dy)); }
      g.closePath();
    }
    const fillShape = (kind, x, y, r, fill) => { shape(kind, x, y, r); g.fillStyle = fill; g.fill(); };
    function strokePath(segs, color, width) {
      g.strokeStyle = color;
      g.lineWidth = width;
      g.beginPath();
      segs.forEach((sg, k) => { if (!k) g.moveTo(sg.pts[0].x, sg.pts[0].y); g.lineTo(sg.pts[1].x, sg.pts[1].y); g.lineTo(sg.pts[2].x, sg.pts[2].y); });
      g.stroke();
    }
    // znacznik końca linii: krótka kreska i poprzeczka (litera T)
    function endCap(seg, atStart, color, hot) {
      const p = atStart ? seg.pts[0] : seg.pts[2], q = seg.pts[1];
      let dx = p.x - q.x, dy = p.y - q.y;
      if (Math.hypot(dx, dy) < 0.01) { const o = atStart ? seg.pts[2] : seg.pts[0]; dx = p.x - o.x; dy = p.y - o.y; }
      const n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, L = hot ? 7 : 5.5, w = hot ? 2.6 : 2;
      const ex = p.x + ux * L, ey = p.y + uy * L;
      g.strokeStyle = color;
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(ex, ey); g.moveTo(ex - uy * w, ey + ux * w); g.lineTo(ex + uy * w, ey - ux * w); g.stroke();
    }
    function draw(now) {
      const ink = theme.text || "#15161b", paper = theme.surface || "#fff", muted = theme.muted || "#5f6472";
      g.lineCap = "round";
      g.lineJoin = "round";
      // rzeka
      const river = () => { g.beginPath(); g.moveTo(RX0, 0); g.bezierCurveTo(RX0 + 8, H * 0.35, RX0 - 6, H * 0.65, RX0 + 2, H); g.lineTo(RX1 + 2, H); g.bezierCurveTo(RX1 - 6, H * 0.65, RX1 + 8, H * 0.35, RX1, 0); };
      g.fillStyle = "rgba(77, 163, 230, 0.26)";
      river();
      g.fill();
      // linie: najpierw wybrana na wierzchu
      const order = s.lines.map((_, i) => i).sort((a, b) => (a === s.sel) - (b === s.sel));
      for (const li of order) {
        const l = s.lines[li], segs = geo[li];
        if (!segs.length) continue;
        g.globalAlpha = grab && grab.li !== li ? 0.55 : 1;
        strokePath(segs, l.color, 2.4);
        // tunele: przerywany środek, tylko pod rzeką
        g.save();
        river();
        g.clip();
        g.setLineDash([1.6, 1.6]);
        for (const sg of segs) if (sg.tunnel) strokePath([sg], paper, 0.9);
        g.restore();
        endCap(segs[0], true, l.color, grab?.li === li && grab.end === 0);
        endCap(segs[segs.length - 1], false, l.color, grab?.li === li && grab.end === 1);
        g.globalAlpha = 1;
      }
      // trzymany koniec linii: pulsujący pierścień
      if (grab) {
        const a = byId(endId(grab));
        g.strokeStyle = s.lines[grab.li].color;
        g.lineWidth = 1;
        g.globalAlpha = 0.6 + 0.4 * Math.sin(now * 6);
        g.beginPath(); g.arc(a.x, a.y, R + 2.6, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }
      // podgląd rysowania od trzymanego końca do wskaźnika
      if (grab && ptr) {
        const l = s.lines[grab.li], a = byId(endId(grab)), over = stationAt(...ptr);
        const ok = over && !l.stops.includes(over.id);
        const b = ok ? over : { x: ptr[0], y: ptr[1] };
        if (Math.hypot(b.x - a.x, b.y - a.y) > R) {
          const pts = route(a, b);
          g.strokeStyle = l.color;
          g.globalAlpha = ok ? 0.9 : 0.5;
          g.lineWidth = 2.4;
          if (!ok) g.setLineDash([2.5, 2.5]);
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); g.lineTo(pts[1].x, pts[1].y); g.lineTo(pts[2].x, pts[2].y); g.stroke();
          g.setLineDash([]);
          g.globalAlpha = 1;
        }
      }
      // pociągi
      for (const t of s.trains) {
        const l = s.lines[t.line];
        if (l.stops.length < 2) continue;
        const [x, y, a] = trainXY(t);
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = l.color;
        g.beginPath(); g.roundRect(-4.6, -2.4, 9.2, 4.8, 1.2); g.fill();
        t.load.forEach((p, k) => fillShape(p, -3 + (k % 3) * 3, k < 3 ? -1.05 : 1.05, 0.75, "#fff"));
        g.restore();
      }
      // stacje
      const hover = ptr && stationAt(...ptr);
      for (const st of s.stations) {
        const age = Math.min(1, (s.t - st.born) / 0.5), pop = age < 1 ? 1 + Math.sin(age * Math.PI) * 0.5 : 1;
        if (st.over > 0) {
          const pulse = 0.5 + 0.5 * Math.sin(now * (4 + st.over * 8));
          g.fillStyle = `rgba(224, 49, 49, ${0.12 + 0.14 * pulse})`;
          g.beginPath(); g.arc(st.x, st.y, 7.5, 0, Math.PI * 2); g.fill();
          g.strokeStyle = "#e03131";
          g.lineWidth = 1.4;
          g.beginPath(); g.arc(st.x, st.y, 7.5, -Math.PI / 2, -Math.PI / 2 + st.over * Math.PI * 2); g.stroke();
        }
        const r = R * pop * (hover === st ? 1.18 : 1);
        shape(st.shape, st.x, st.y, r);
        g.fillStyle = paper;
        g.fill();
        g.strokeStyle = ink;
        g.lineWidth = 1.1;
        g.stroke();
        const n = st.wait.length;
        st.wait.slice(0, 12).forEach((p, k) => fillShape(p, st.x + 6 + (k % 6) * 2.6, st.y - 1.6 + ((k / 6) | 0) * 2.8, 0.95, n > MAXW ? "#e03131" : ink));
        if (n > 12) { g.fillStyle = muted; g.font = "600 3px Geist, system-ui, sans-serif"; g.textAlign = "left"; g.fillText(`+${n - 12}`, st.x + 6, st.y + 6.6); }
      }
      // efekty: kółko przy dołożeniu stacji, liczba dowiezionych
      for (const f of s.fx) {
        const k = f.t / 0.8;
        g.globalAlpha = 1 - k;
        if (f.n) {
          g.fillStyle = f.color;
          g.font = "700 4px Geist, system-ui, sans-serif";
          g.textAlign = "center";
          g.fillText(`+${f.n}`, f.x, f.y - 5 - k * 6);
        } else {
          g.strokeStyle = f.color;
          g.lineWidth = 1;
          g.beginPath(); g.arc(f.x, f.y, R + 1 + k * 5, 0, Math.PI * 2); g.stroke();
        }
        g.globalAlpha = 1;
      }
      // tydzień i postęp do nagrody
      const wk = (s.t % WEEK) / WEEK;
      g.fillStyle = muted;
      g.font = "600 4px Geist, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText(`Tydzień ${s.week + 1}`, 4, H - 6);
      g.fillStyle = theme.line || "#dcdfe6";
      g.fillRect(4, H - 4.2, 22, 1);
      g.fillStyle = muted;
      g.fillRect(4, H - 4.2, 22 * wk, 1);
      if (!s.lines.some((l) => l.stops.length > 1) && !grab) {
        g.fillStyle = muted;
        g.font = "500 4px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("Przeciągnij od stacji do stacji, żeby zbudować linię", W / 2, 7);
      }
      if (s.paused) {
        g.fillStyle = "rgba(0, 0, 0, 0.12)";
        g.fillRect(0, 0, W, H);
        g.fillStyle = ink;
        g.font = "700 6px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("Pauza", W / 2, 10);
        g.font = "500 3.4px Geist, system-ui, sans-serif";
        g.fillText("Spacja wznawia grę. Linie możesz przebudowywać.", W / 2, 15);
      }
    }

    // --- panel ---
    let lastKey = "";
    function renderStats() {
      deliveredEl.set(`${s.delivered} / ${lv.target}`, s.delivered / lv.target);
      ctx.progress(s.delivered / lv.target);
      const key = `${s.sel}|${s.lines.map((l) => l.stops.length).join()}|${s.tunnels}|${s.trains.length}`;
      if (key === lastKey) return;
      lastKey = key;
      linesEl.replaceChildren(...s.lines.map((l, i) => {
        const b = button("", `mt-line${i === s.sel ? " on" : ""}`, () => { release(); s.sel = i; Sound.tap(); render(); });
        b.style.setProperty("--lc", l.color);
        b.setAttribute("aria-pressed", i === s.sel);
        const n = s.trains.filter((t) => t.line === i).length;
        b.setAttribute("aria-label", `Linia ${NAMES[i].toLowerCase()}`);
        b.append(el("i"), el("span", "", l.stops.length > 1 ? `${l.stops.length} ${plural(l.stops.length, "stacja", "stacje", "stacji")}, ${n} ${plural(n, "pociąg", "pociągi", "pociągów")}` : "pusta"), el("kbd", "", i + 1));
        return b;
      }));
      clearBtn.disabled = !s.lines[s.sel].stops.length;
      const free = s.tunnels - usedTunnels();
      tunnelEl.textContent = `Wolne tunele: ${free} z ${s.tunnels}.`;
    }
    function render() { lastKey = ""; renderStats(); }
    render();
  },
});
