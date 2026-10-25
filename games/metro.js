// Metro (w stylu Mini Metro): stacje mają kształty, pasażer chce dojechać do dowolnej stacji o swoim kształcie.
// Gracz rysuje linie (także pętle); pociągi jeżdżą po nich, a trasę pasażera wyznacza przegląd sieci (z przesiadkami).
const Metro = (() => {
  const SHAPES = ["circle", "triangle", "square", "star", "cross", "diamond"];
  // odległość w przystankach od każdej stacji do najbliższej stacji kształtu `shape`, jadąc pociągami.
  // Zwykła linia działa w obie strony; w pętli tylko w kierunkach, w których jeżdżą jej pociągi (l.dirs),
  // żeby pasażer nie czekał na pociąg w stronę, w którą nic nie jedzie.
  function distances(stations, lines, shape) {
    const rev = new Map(stations.map((s) => [s.id, []]));
    const edge = (u, v) => { if (rev.has(u) && rev.has(v)) rev.get(v).push(u); };
    for (const l of lines) {
      const n = l.stops.length, loop = l.loop && n > 2, any = !loop || !l.dirs?.size;
      const fw = any || l.dirs.has(1), bw = any || l.dirs.has(-1);
      for (let k = 1; k < n; k++) { if (fw) edge(l.stops[k - 1], l.stops[k]); if (bw) edge(l.stops[k], l.stops[k - 1]); }
      if (loop) { if (fw) edge(l.stops[n - 1], l.stops[0]); if (bw) edge(l.stops[0], l.stops[n - 1]); }
    }
    const dist = new Map(), queue = [];
    for (const s of stations) if (s.shape === shape) { dist.set(s.id, 0); queue.push(s.id); }
    for (let q = 0; q < queue.length; q++) for (const nb of rev.get(queue[q])) if (!dist.has(nb)) { dist.set(nb, dist.get(queue[q]) + 1); queue.push(nb); }
    return dist;
  }
  // pasażer jedzie dalej (albo wsiada), gdy następny przystanek leży na najkrótszej drodze do celu
  const rides = (dist, here, next) => { const d = dist.get(here); return d !== undefined && d > 0 && dist.get(next) === d - 1; };
  // czy odcinek przecina rzekę (pionowy pas między rx0 a rx1)
  const crosses = (a, b, rx0, rx1) => (a.x < rx0 && b.x > rx1) || (b.x < rx0 && a.x > rx1) || (a.x >= rx0 && a.x <= rx1) !== (b.x >= rx0 && b.x <= rx1);
  // odcinek jak na schemacie metra: mode 0 najpierw prosto, potem pod kątem 45°; mode 1 najpierw skos, potem prosto
  function route(a, b, mode = 0) {
    const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy), d = Math.abs(ax - ay);
    const sx = ax > ay ? Math.sign(dx) * d : 0, sy = ax > ay ? 0 : Math.sign(dy) * d;
    const m = mode ? { x: b.x - sx, y: b.y - sy } : { x: a.x + sx, y: a.y + sy };
    return [a, m, b];
  }
  const unit = (x, y) => { const L = Math.hypot(x, y) || 1; return { x: x / L, y: y / L }; };
  // łamana p–m–q przesunięta o `off` w bok (linie biegnące obok siebie), z łukiem w miejscu załamania;
  // łuki linii obok siebie są współśrodkowe, więc wiązka linii skręca równo
  function bend(p, m, q, off = 0, radius = 6) {
    const l1 = Math.hypot(m.x - p.x, m.y - p.y), l2 = Math.hypot(q.x - m.x, q.y - m.y);
    if (l1 < 0.01 || l2 < 0.01) {
      const d = unit(q.x - p.x, q.y - p.y);
      return [{ x: p.x - d.y * off, y: p.y + d.x * off }, { x: q.x - d.y * off, y: q.y + d.x * off }];
    }
    const d1 = unit(m.x - p.x, m.y - p.y), d2 = unit(q.x - m.x, q.y - m.y);
    const n1 = { x: -d1.y, y: d1.x }, n2 = { x: -d2.y, y: d2.x }, k = off / (1 + n1.x * n2.x + n1.y * n2.y);
    const a = { x: p.x + n1.x * off, y: p.y + n1.y * off }, b = { x: q.x + n2.x * off, y: q.y + n2.y * off };
    const c = { x: m.x + (n1.x + n2.x) * k, y: m.y + (n1.y + n2.y) * k };
    const side = Math.sign(n1.x * d2.x + n1.y * d2.y);
    const L1 = Math.hypot(c.x - a.x, c.y - a.y), L2 = Math.hypot(b.x - c.x, b.y - c.y);
    const r = Math.max(0.5, Math.min(radius - off * side, L1 * 0.5, L2 * 0.5));
    const u = { x: c.x - d1.x * r, y: c.y - d1.y * r }, v = { x: c.x + d2.x * r, y: c.y + d2.y * r };
    const out = [a, u];
    for (let i = 1; i < 8; i++) {
      const t = i / 8, w = 1 - t;
      out.push({ x: w * w * u.x + 2 * t * w * c.x + t * t * v.x, y: w * w * u.y + 2 * t * w * c.y + t * t * v.y });
    }
    out.push(v, b);
    return out;
  }
  // ta sama trasa jako łamana z łukiem (od a do b)
  const curve = (a, b, mode = 0) => { const [p, m, q] = route(a, b, mode); return bend(p, m, q); };

  // --- układ sieci: kształt każdego odcinka wybrany tak, żeby całość była czytelna ---
  const key = (a, b) => Math.min(a, b) + "-" + Math.max(a, b);
  const pairsOf = (l) => {
    const out = [];
    for (let k = 1; k < l.stops.length; k++) out.push([l.stops[k - 1], l.stops[k]]);
    if (l.loop && l.stops.length > 2) out.push([l.stops[l.stops.length - 1], l.stops[0]]);
    return out;
  };
  // odcinek zawsze liczony od stacji o mniejszym id, więc wszystkie linie na tej samej parze stacji mają ten sam kształt
  const canon = (a, b) => (a.id < b.id ? [a, b] : [b, a]);
  function distSeg(o, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
    const u = Math.max(0, Math.min(1, ((o.x - a.x) * dx + (o.y - a.y) * dy) / L));
    return Math.hypot(a.x + dx * u - o.x, a.y + dy * u - o.y);
  }
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  // właściwe przecięcie dwóch odcinków (bez dotykania końcami)
  function hits(a, b, c, d) {
    const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
    return d1 * d2 < -1e-6 && d3 * d4 < -1e-6;
  }
  // dwa odcinki leżące na sobie (równoległe, blisko i zachodzące na długości ponad 1)
  function overlap(a, b, c, d) {
    const u = unit(b.x - a.x, b.y - a.y), v = unit(d.x - c.x, d.y - c.y);
    if (Math.abs(u.x * v.y - u.y * v.x) > 0.02 || Math.hypot(b.x - a.x, b.y - a.y) < 0.5 || Math.hypot(d.x - c.x, d.y - c.y) < 0.5) return false;
    if (Math.abs((c.x - a.x) * u.y - (c.y - a.y) * u.x) > 1.2) return false;
    const t = (o) => (o.x - a.x) * u.x + (o.y - a.y) * u.y, L = Math.hypot(b.x - a.x, b.y - a.y);
    const lo = Math.max(0, Math.min(t(c), t(d))), hi = Math.min(L, Math.max(t(c), t(d)));
    return hi - lo > 1;
  }
  // kara za skręt o kąt między kierunkiem wjazdu a wyjazdu: prosto 0, 45° mało, 90° średnio, ostre zawracanie bardzo dużo
  const TURN = [0, 1, 3.5, 12, 30];
  function layout(stations, lines, prev = new Map(), extra = []) {
    const byId = new Map(stations.map((o) => [o.id, o]));
    const segs = new Map(), turns = [];
    for (const l of [...lines, ...extra]) {
      const pr = pairsOf(l).filter(([a, b]) => byId.has(a) && byId.has(b));
      pr.forEach(([a, b]) => {
        const k = key(a, b);
        if (!segs.has(k)) {
          const [p, q] = canon(byId.get(a), byId.get(b));
          segs.set(k, { k, p, q, mode: prev.get(k) ?? 0, turns: [], near: [] });
        }
      });
      const link = (x, y, v) => { const t = { a: segs.get(key(...x)), b: segs.get(key(...y)), v }; turns.push(t); t.a.turns.push(t); t.b.turns.push(t); };
      for (let k = 1; k < pr.length; k++) link(pr[k - 1], pr[k], pr[k][0]);
      if (l.loop && pr.length > 2) link(pr[pr.length - 1], pr[0], pr[0][0]);
    }
    const list = [...segs.values()];
    const pts = (sg) => route(sg.p, sg.q, sg.mode);
    // kierunek odcinka przy stacji v, na zewnątrz od niej
    const outDir = (sg, v) => {
      const [p, m, q] = pts(sg), [s0, far] = v === sg.p.id ? [p, q] : [q, p];
      const o = Math.hypot(m.x - s0.x, m.y - s0.y) > 0.01 ? m : far;
      return unit(o.x - s0.x, o.y - s0.y);
    };
    const turnCost = (t) => {
      const u = outDir(t.a, t.v), w = outDir(t.b, t.v);
      // wjazd to odwrócony kierunek u; kąt odchylenia od jazdy na wprost
      const ang = Math.acos(Math.max(-1, Math.min(1, -(u.x * w.x + u.y * w.y))));
      return TURN[Math.round(ang / (Math.PI / 4))];
    };
    const stationCost = (sg) => {
      const [p, m, q] = pts(sg);
      let c = 0;
      for (const o of stations) {
        if (o === sg.p || o === sg.q) continue;
        const d = Math.min(distSeg(o, p, m), distSeg(o, m, q));
        if (d < 6) c += 40 * (6 - d);
      }
      return c;
    };
    const pairCost = (A, B) => {
      const [a0, a1, a2] = pts(A), [b0, b1, b2] = pts(B), PA = [[a0, a1], [a1, a2]], PB = [[b0, b1], [b1, b2]];
      let c = 0;
      for (const [x, y] of PA) for (const [z, w] of PB) {
        if (hits(x, y, z, w)) c += 2;
        if (overlap(x, y, z, w)) c += 8;
      }
      return c;
    };
    const costOf = (sg) => stationCost(sg) + sg.turns.reduce((a, t) => a + turnCost(t), 0) + list.reduce((a, o) => a + (o === sg ? 0 : pairCost(sg, o)), 0);
    // poprawki po kolei: odcinek zmienia kształt, gdy cała sieć na tym zyskuje
    for (let pass = 0; pass < 6; pass++) {
      let better = false;
      for (const sg of list) {
        const straight = Math.abs(Math.abs(sg.q.x - sg.p.x) - Math.abs(sg.q.y - sg.p.y)) < 0.01 || sg.q.x === sg.p.x || sg.q.y === sg.p.y;
        if (straight) continue;
        const c0 = costOf(sg);
        sg.mode ^= 1;
        if (costOf(sg) < c0 - 0.01) better = true;
        else sg.mode ^= 1;
      }
      if (!better) break;
    }
    return new Map(list.map((sg) => [sg.k, sg.mode]));
  }
  // przystanki przed pociągiem: od stacji `i` w kierunku `d`; na zwykłej linii z zawróceniem na końcu, w pętli dookoła
  function ahead(stops, i, d, loop = false) {
    if (!loop) return d > 0 ? stops.slice(i + 1) : stops.slice(0, i).reverse();
    const n = stops.length;
    return Array.from({ length: n - 1 }, (_, k) => stops[(((i + d * (k + 1)) % n) + n) % n]);
  }
  return { SHAPES, distances, rides, crosses, route, bend, curve, layout, ahead, last: null };
})();

if (typeof module !== "undefined") module.exports = Metro;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "metro"), {
  levels: [
    // rate: pasażerowie na sekundę na starcie; ramp: po ilu sekundach tempo się podwaja; peak: najwyższy mnożnik;
    // grace: ile sekund nowa stacja nie ma pasażerów; mercy: jak mocno losowanie omija zatłoczone stacje;
    // demand: jak często pasażerowie chcą jechać do rzadkich kształtów; rush: dni godzin szczytu (0 = Pn) od tygodnia rushFrom
    { key: "easy", name: "Łatwy", points: 20, target: 50, rate: 0.36, ramp: 170, peak: 2.1, tunnels: 3, maxw: 7, crowd: 20, every: 26, cap: 13, rare: 0.05, grace: 12, mercy: 0.3, demand: 0.5, rush: [4], rushFrom: 2 },
    { key: "medium", name: "Średni", points: 50, target: 120, rate: 0.5, ramp: 140, peak: 2.6, tunnels: 2, maxw: 6, crowd: 15, every: 20, cap: 16, rare: 0.12, grace: 8, mercy: 0.12, demand: 0.8, rush: [1, 4], rushFrom: 1 },
    { key: "hard", name: "Trudny", points: 100, target: 220, rate: 0.6, ramp: 115, peak: 3, tunnels: 2, maxw: 6, crowd: 12, every: 17, cap: 19, rare: 0.2, grace: 5, mercy: 0, demand: 1, rush: [0, 2, 4], rushFrom: 1 },
  ],
  rules: [
    "Pasażer (mały kształt przy stacji) chce dojechać do dowolnej stacji o takim samym kształcie. Połącz stacje liniami, a pociągi zrobią resztę, także z przesiadkami.",
    "Przeciągnij od stacji do stacji, żeby zbudować linię. Przeciągnij koniec linii (znacznik T) do kolejnej stacji, żeby ją przedłużyć, z powrotem, żeby skrócić, albo na drugi koniec, żeby zamknąć pętlę. Przeciągnij odcinek między stacjami na inną stację, żeby wstawić ją pośrodku.",
    "Przejście pod rzeką zużywa tunel. Linię wybierasz w panelu albo klawiszami 1–7, Delete usuwa wybraną linię, Esc kończy rysowanie.",
    "Gdy na stacji czeka zbyt wielu pasażerów, wokół niej rośnie czerwony okrąg. Pełny okrąg kończy grę.",
    "Co tydzień wybierasz nagrodę: nową linię, pociąg, wagon (więcej miejsc), tunel albo węzeł przesiadkowy (stacja mieści dwa razy więcej osób). W dni szczytu (wyróżnione w panelu) pasażerów przybywa szybciej.",
    "Dowieź wymaganą liczbę pasażerów. Spacja zatrzymuje grę, a F przełącza szybszy czas.",
  ],
  achievements: [
    { id: "pierwsze-kursy", name: "Pierwsze kursy", desc: "Dowieź 50 pasażerów w jednej grze.", points: 10 },
    { id: "petla", name: "Linia okrężna", desc: "Zamknij linię w pętlę przez co najmniej 3 stacje.", points: 10 },
    { id: "dlugi-sklad", name: "Długi skład", desc: "Doczep dwa wagony do jednego pociągu.", points: 10 },
    { id: "pelny-kurs", name: "Pełny kurs", desc: "Wysadź naraz u celu co najmniej 6 pasażerów z jednego pociągu.", points: 25 },
    { id: "bez-tuneli", name: "Suchą stopą", desc: "Dowieź 60 pasażerów, nie budując ani jednego tunelu.", points: 25 },
    { id: "plynny-ruch", name: "Płynny ruch", desc: "Wygraj średni poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 25 },
    { id: "dyspozytor", name: "Dyspozytor doskonały", desc: "Wygraj trudny poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 50 },
  ],
  mount(board, ctx) {
    const { SHAPES, curve } = Metro;
    const modes = new Map(), mids = new Map(), offs = new Map();
    const lv = ctx.level;
    const W = 160, H = 110, RX0 = 72, RX1 = 84, CAP = 6, R = 3.3, HIT = 7, WEEK = 42, MAXC = 3;
    const VMAX = 24, VPASS = 13, ACC = 30, CAR = 7.4, GAP = 0.9;
    const KEYS = ["red", "blue", "green", "yellow", "violet", "teal", "brown"];
    const NAMES = ["Czerwona", "Niebieska", "Zielona", "Żółta", "Fioletowa", "Morska", "Brązowa"];
    const DAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
    const cv = canvasGame(board, ctx, W, H, { max: 96 });
    const { g, theme } = cv;
    const col = (k) => theme[k] || "#888";
    let nextId = 1;
    const s = {
      stations: [], lines: [], trains: [], fx: [], delivered: 0, t: 0, clock: 0, week: 0, tunnels: lv.tunnels,
      sel: 0, speed: 1, spawnS: 0, spawnP: 1.5, nextStation: lv.every, choosing: false, placing: false, veil: 0,
    };
    Metro.last = s;

    // tło: kilka parków z dala od rzeki, losowanych raz na partię
    const parks = [];
    for (let k = 0; k < 4; k++) {
      const left = k % 2 === 0, w = 10 + Math.random() * 12, h = 7 + Math.random() * 9;
      parks.push({ x: left ? 6 + Math.random() * (RX0 - 20 - w) : RX1 + 12 + Math.random() * (W - RX1 - 18 - w), y: 6 + Math.random() * (H - 12 - h), w, h });
    }

    // nowa stacja: miasto rośnie od środka, blisko istniejących stacji, z dala od linii, po mniej zajętej stronie rzeki
    const addStation = (shape) => {
      const left = s.stations.filter((o) => o.x < RX0).length, right = s.stations.length - left;
      let best = null;
      for (let t = 0; t < 400; t++) {
        const x = 9 + Math.random() * (W - 18), y = 9 + Math.random() * (H - 18);
        if (x > RX0 - 7 && x < RX1 + 7) continue;
        const near = s.stations.reduce((m, o) => Math.min(m, Math.hypot(o.x - x, o.y - y)), Infinity);
        if (near < 16) continue;
        let score = s.stations.length ? Math.abs(near - 22) : 0;
        score += (x < RX0 ? left - right : right - left) * 3;
        if (segmentAt(x, y, 5)) score += 12;
        score += Math.random() * 6;
        if (!best || score < best.score) best = { x, y, score };
      }
      if (!best) return;
      const { x, y } = best;
      const st = { id: nextId++, x, y, shape, wait: [], over: 0, born: s.clock, bornT: s.t, hs: 1, hub: false };
      s.stations.push(st);
      s.fx.push({ kind: "ring", x, y, t: 0, dur: 0.9, color: "text", r0: R, r1: R + 10 });
      return st;
    };
    // start: po obu stronach rzeki, żeby od razu było co łączyć
    for (const shape of ["circle", "triangle", "square", "circle"]) addStation(shape);
    s.stations.forEach((st) => Object.assign(st, { born: -9, bornT: -99 }));
    s.fx = [];
    for (let k = 0; k < 3; k++) s.lines.push({ key: KEYS[k], stops: [], loop: false, grow: {} });

    // --- panel ---
    const deliveredEl = statBlock(ctx, "Dowiezieni", { meter: true });
    const weekEl = statsBlock(ctx, "Tydzień 1", ["Tunele", "Pociągi", "Wagony"]);
    const weekTitle = weekEl.block.querySelector(".panel-title");
    const days = el("div", "mt-days");
    days.setAttribute("role", "img");
    const dayEls = DAYS.map((d) => { const b = el("span"); b.append(el("i"), d); days.append(b); return b; });
    weekTitle.after(days);
    const linesEl = el("div", "mt-lines");
    const clearBtn = button("Usuń linię", "btn-ghost wide danger", () => clearLine(s.sel));
    ctx.panel.append(panelBlock("Linie", linesEl, clearBtn));
    const speedSeg = segmented("Tempo", ["Pauza", "×1", "×2"], (k) => setSpeed(k));
    speedSeg.set(1);
    ctx.panel.append(panelBlock("Tempo", speedSeg.el));
    const rewardBox = el("div", "mt-reward");
    rewardBox.hidden = true;
    board.append(rewardBox);
    cv.cv.setAttribute("aria-label", "Mapa metra. Przeciągnij od stacji do stacji, żeby zbudować linię.");
    cv.cv.setAttribute("role", "img");

    function setSpeed(k) { s.speed = k; speedSeg.set(k); Sound.tap(); }
    const byId = (id) => s.stations.find((x) => x.id === id);
    const segKey = (a, b) => Math.min(a, b) + "-" + Math.max(a, b);
    // kształt odcinka od a do b według układu sieci (albo podanego trybu)
    function shapeOf(a, b, mode = modes.get(segKey(a.id, b.id)) ?? 0) {
      const [p, q] = a.id < b.id ? [a, b] : [b, a], pts = Metro.bend(...Metro.route(p, q, mode));
      return p === a ? pts : pts.reverse();
    }
    // układ sieci po planowanej zmianie jednej linii (do podglądu rysowania)
    let pv = { k: "", m: modes };
    function previewModes(li, stops, loop) {
      const k = `${li}:${stops.join()}:${loop}`;
      if (pv.k !== k) pv = { k, m: Metro.layout(s.stations, s.lines.map((l, i) => (i === li ? { stops, loop } : l)), modes) };
      return pv.m;
    }
    const maxWait = (st) => lv.maxw * (st.hub ? 2 : 1);

    // --- budowa linii ---
    function lineTunnels(stops, loop) {
      let n = 0;
      for (let k = 1; k < stops.length; k++) if (Metro.crosses(byId(stops[k - 1]), byId(stops[k]), RX0, RX1)) n++;
      if (loop && stops.length > 2 && Metro.crosses(byId(stops[stops.length - 1]), byId(stops[0]), RX0, RX1)) n++;
      return n;
    }
    const usedTunnels = () => s.lines.reduce((a, l) => a + lineTunnels(l.stops, l.loop), 0);
    function noTunnel() {
      Sound.error();
      ctx.toast("Brak wolnych tuneli pod rzeką");
      replay(weekEl.block, "shake");
    }
    function afterChange() {
      if (usedTunnels() > 0) s.everTunnel = true;
      render();
    }
    // dołożenie stacji na koniec linii: end 0 = początek, 1 = koniec
    function extend(li, end, st) {
      const l = s.lines[li];
      if (l.stops.includes(st.id)) return false;
      const stops = end ? [...l.stops, st.id] : [st.id, ...l.stops];
      if (usedTunnels() - lineTunnels(l.stops, false) + lineTunnels(stops, false) > s.tunnels) return noTunnel(), false;
      const other = end ? l.stops[l.stops.length - 1] : l.stops[0];
      l.stops = stops;
      if (l.stops.length > 1) l.grow[segKey(other, st.id)] = { t0: s.clock, back: !end };
      if (l.stops.length === 2 && !s.trains.some((t) => t.line === li)) {
        // pociągi odstawione przy usuwaniu linii wracają na nią; pierwsza budowa daje jeden pociąg
        if (l.parked?.length) l.parked.splice(0).forEach((cars) => addTrain(li, cars));
        else if (!l.based) { l.based = true; addTrain(li); }
      }
      Sound.place(1 + (l.stops.length % 8));
      s.fx.push({ kind: "ring", x: st.x, y: st.y, t: 0, dur: 0.6, color: l.key, r0: R + 1, r1: R + 7 });
      afterChange();
      return true;
    }
    function closeLoop(li) {
      const l = s.lines[li];
      if (usedTunnels() - lineTunnels(l.stops, false) + lineTunnels(l.stops, true) > s.tunnels) return noTunnel();
      l.loop = true;
      l.grow[segKey(l.stops[l.stops.length - 1], l.stops[0])] = { t0: s.clock, back: false };
      grab = null;
      ctx.achieve("petla");
      Sound.line();
      for (const id of l.stops) { const st = byId(id); s.fx.push({ kind: "ring", x: st.x, y: st.y, t: 0, dur: 0.7, color: l.key, r0: R + 1, r1: R + 6 }); }
      ctx.toast(`Linia ${NAMES[li].toLowerCase()} jest teraz pętlą`);
      afterChange();
    }
    // otwarcie pętli na jej pierwszej stacji: znika odcinek zamykający
    function openLoop(li) {
      const l = s.lines[li], n = l.stops.length, first = l.stops[0], last = l.stops[n - 1];
      ghost(byId(last), byId(first), l.key);
      l.loop = false;
      for (const t of s.trains) if (t.line === li && ((t.from === first && t.to === last) || (t.from === last && t.to === first))) {
        Object.assign(t, t.from === first ? { to: l.stops[1], dir: 1 } : { to: l.stops[n - 2], dir: -1 }, { f: 0, v: 0 });
      }
      Sound.erase();
      afterChange();
    }
    // wstawienie stacji pośrodku odcinka k (między stops[k] a następnym przystankiem)
    function insertStop(li, k, st) {
      const l = s.lines[li], n = l.stops.length, ia = l.stops[k], ib = l.stops[(k + 1) % n];
      if (l.stops.includes(st.id)) return false;
      const stops = [...l.stops];
      stops.splice(k + 1, 0, st.id);
      if (usedTunnels() - lineTunnels(l.stops, l.loop) + lineTunnels(stops, l.loop) > s.tunnels) return noTunnel(), false;
      const a = byId(ia), b = byId(ib);
      const len = (p, q) => shapeOf(p, q).reduce((sum, o, i, arr) => (i ? sum + Math.hypot(o.x - arr[i - 1].x, o.y - arr[i - 1].y) : 0), 0);
      // pociąg na przebudowanym odcinku jedzie dalej z tego samego miejsca, tylko nową trasą
      for (const t of s.trains) if (t.line === li && ((t.from === ia && t.to === ib) || (t.from === ib && t.to === ia))) {
        const p = byId(t.from), q = byId(t.to), d = t.f * len(p, q), L1 = len(p, st), L2 = len(st, q);
        Object.assign(t, d < L1 ? { to: st.id, f: d / L1 } : { from: st.id, f: Math.min(0.99, (d - L1) / L2) });
      }
      ghost(a, b, l.key);
      l.stops = stops;
      Sound.place(1 + (l.stops.length % 8));
      s.fx.push({ kind: "ring", x: st.x, y: st.y, t: 0, dur: 0.6, color: l.key, r0: R + 1, r1: R + 7 });
      afterChange();
      return true;
    }
    function ghost(a, b, key) { s.fx.push({ kind: "ghost", pts: shapeOf(a, b), color: key, t: 0, dur: 0.45 }); }
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
      ghost(byId(gone), byId(end ? l.stops[l.stops.length - 1] : l.stops[0]), l.key);
      for (const t of s.trains) if (t.line === li && (t.from === gone || t.to === gone)) {
        // pociąg z usuniętego odcinka staje na nowym końcu linii i tam wymienia pasażerów
        const n = l.stops.length;
        Object.assign(t, end ? { from: l.stops[n - 1], to: l.stops[n - 2], dir: -1 } : { from: l.stops[0], to: l.stops[1], dir: 1 }, { f: 0, v: 0 });
        t.wait = 0.4 + atStation(t) * 0.12;
      }
      Sound.erase();
      afterChange();
    }
    function clearLine(li) {
      const l = s.lines[li];
      if (!l.stops.length) return;
      for (let k = 1; k < l.stops.length; k++) ghost(byId(l.stops[k - 1]), byId(l.stops[k]), l.key);
      if (l.loop) ghost(byId(l.stops[l.stops.length - 1]), byId(l.stops[0]), l.key);
      // pociągi z wagonami czekają, aż linia znów połączy dwie stacje
      for (const t of s.trains.filter((t) => t.line === li)) {
        dropAt(t, t.f < 0.5 ? t.from : t.to);
        (l.parked ||= []).push(t.cars);
      }
      s.trains = s.trains.filter((t) => t.line !== li);
      l.stops = [];
      l.loop = false;
      if (grab?.li === li) grab = null;
      Sound.erase();
      render();
    }
    // pasażerowie z usuwanego pociągu wysiadają na stacji `id`
    function dropAt(t, id) {
      const st = byId(id);
      for (const p of t.load) if (p.k === st.shape) s.delivered++; else st.wait.push({ k: p.k, b: s.clock });
      t.load = [];
    }
    function addTrain(li, cars = 1) {
      const l = s.lines[li];
      const t = { line: li, from: l.stops[0], to: l.stops[1], dir: 1, f: 0, v: 0, wait: 0, load: [], cars, born: s.clock };
      // kolejne pociągi na tej samej linii startują z drugiego końca, żeby się rozłożyć
      if (s.trains.some((o) => o.line === li) && !l.loop) Object.assign(t, { from: l.stops[l.stops.length - 1], to: l.stops[l.stops.length - 2], dir: -1 });
      s.trains.push(t);
      t.wait = 0.3 + atStation(t) * 0.12;
      return t;
    }

    // --- sterowanie ---
    // grab: linia i koniec, za który trzyma gracz; zostaje po puszczeniu, żeby można było klikać stacje po kolei
    // bend: chwycony odcinek linii (linia i numer odcinka), który można przeciągnąć na stację
    let grab = null, bend = null, dragging = false, moved = false, ptr = null, overId = null;
    const stationAt = (x, y, hit = HIT) => {
      let best = null, bd = hit;
      for (const o of s.stations) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } }
      return best;
    };
    // najbliższy odcinek linii pod wskaźnikiem; wybrana linia ma pierwszeństwo
    function segmentAt(x, y, hit = 3.2) {
      let best = null, bd = hit;
      const near = (G, sg) => {
        const pts = span(G, sg.s, sg.e);
        let m = Infinity;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
          const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / L));
          m = Math.min(m, Math.hypot(a.x + dx * u - x, a.y + dy * u - y));
        }
        return m;
      };
      const order = s.lines.map((_, i) => i).sort((a, b) => (b === s.sel) - (a === s.sel));
      for (const li of order) geo[li]?.seg.forEach((sg, k) => {
        const d = near(geo[li], sg) - (li === s.sel ? 0.5 : 0);
        if (d < bd) { bd = d; best = { li, k }; }
      });
      return best;
    }
    const endId = (gr) => { const l = s.lines[gr.li]; return gr.end ? l.stops[l.stops.length - 1] : l.stops[0]; };
    const otherId = (gr) => { const l = s.lines[gr.li]; return gr.end ? l.stops[0] : l.stops[l.stops.length - 1]; };
    const prevId = (gr) => { const l = s.lines[gr.li]; return l.stops.length < 2 ? null : gr.end ? l.stops[l.stops.length - 2] : l.stops[1]; };
    const canLoop = (gr, st) => s.lines[gr.li].stops.length >= 3 && st.id === otherId(gr);
    function release() {
      if (grab && s.lines[grab.li].stops.length === 1) s.lines[grab.li].stops = [];
      grab = null;
      render();
    }
    // ruch końcem linii nad stację: przedłuża, skraca albo zamyka pętlę
    function moveGrab(st) {
      if (!grab || !st || st.id === endId(grab)) return;
      if (st.id === prevId(grab)) return shorten(grab.li, grab.end);
      if (canLoop(grab, st)) return closeLoop(grab.li);
      if (!s.lines[grab.li].stops.includes(st.id)) extend(grab.li, grab.end, st);
    }
    function pickUp(st) {
      if (s.placing) return placeHub(st);
      // trzymany koniec: kliknięcie kolejnej stacji przedłuża linię
      if (grab && (st.id === prevId(grab) || canLoop(grab, st) || !s.lines[grab.li].stops.includes(st.id))) return moveGrab(st);
      if (grab && st.id === endId(grab)) return;
      release();
      const sel = s.lines[s.sel];
      const own = (li) => {
        const l = s.lines[li];
        if (l.stops.length < 2) return -1;
        if (l.loop) return l.stops[0] === st.id ? 0 : -1;
        return l.stops[0] === st.id ? 0 : l.stops[l.stops.length - 1] === st.id ? 1 : -1;
      };
      let li = -1;
      if (sel.stops.length) li = own(s.sel) >= 0 ? s.sel : s.lines.findIndex((_, i) => own(i) >= 0);
      if (li >= 0) {
        if (s.lines[li].loop) openLoop(li);
        grab = { li, end: own(li) };
        s.sel = li;
        Sound.tap();
        return render();
      }
      li = sel.stops.length ? s.lines.findIndex((l) => !l.stops.length) : s.sel;
      if (li < 0) {
        Sound.error();
        ctx.toast("Wszystkie linie są zajęte. Przedłuż którąś albo usuń.");
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
      if (!st) {
        release();
        bend = s.placing ? null : segmentAt(...ptr);
        if (!bend) return;
        cv.cv.setPointerCapture?.(e.pointerId);
        dragging = true;
        overId = null;
        s.sel = bend.li;
        Sound.tap();
        return render();
      }
      cv.cv.setPointerCapture?.(e.pointerId);
      dragging = !s.placing;
      moved = false;
      overId = st.id;
      pickUp(st);
    });
    ctx.on(cv.cv, "pointermove", (e) => {
      const prev = ptr;
      ptr = cv.at(e);
      cv.cv.style.cursor = dragging ? "grabbing" : stationAt(...ptr) ? "pointer" : !s.placing && segmentAt(...ptr) ? "grab" : "";
      if (!dragging || ctx.done || s.choosing) return;
      if (bend) {
        // odcinek upuszczony nad stacją spoza linii wstawia ją pośrodku
        const st = stationAt(...ptr, HIT - 1.5), l = s.lines[bend.li];
        if (st && !l.stops.includes(st.id) && insertStop(bend.li, bend.k, st)) bend = null;
        return;
      }
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
      bend = null;
      overId = null;
      if (e.pointerType !== "mouse") ptr = null;
      // po przeciągnięciu rysowanie się kończy; po stuknięciu koniec zostaje w ręce i można klikać kolejne stacje
      if (moved && grab && s.lines[grab.li].stops.length > 1) { grab = null; render(); }
    };
    ctx.on(cv.cv, "pointerup", up);
    ctx.on(cv.cv, "pointercancel", up);
    ctx.on(cv.cv, "pointerleave", () => { if (!dragging) ptr = null; });
    heldKeys(ctx, (k) => {
      if (s.choosing) { if (/^[1-3]$/.test(k)) rewardBox.querySelectorAll(".mt-opt")[+k - 1]?.click(); return; }
      if (k === " ") return setSpeed(s.speed ? 0 : 1);
      if (k === "f") return setSpeed(s.speed === 2 ? 1 : 2);
      if (k === "escape") return release();
      if (k === "delete" || k === "backspace") return clearLine(s.sel);
      if (/^[1-7]$/.test(k) && +k <= s.lines.length) { release(); s.sel = +k - 1; Sound.tap(); render(); }
    });

    // --- nagrody tygodniowe ---
    const ICONS = {
      line: '<path d="M3 17h5l8-10h5"/><circle cx="3" cy="17" r="2"/><circle cx="21" cy="7" r="2"/>',
      train: '<rect x="3" y="8" width="18" height="8" rx="3"/><path d="M7 12h1M11 12h1M15 12h1"/>',
      wagon: '<rect x="2" y="8" width="9" height="8" rx="2.5"/><rect x="13" y="8" width="9" height="8" rx="2.5"/>',
      tunnel: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 19c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0"/>',
      hub: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    };
    const busiest = (pred) => s.lines
      .map((l, i) => [i, l.stops.reduce((a, id) => a + byId(id).wait.length, 0)])
      .filter(([i]) => s.lines[i].stops.length > 1 && pred(i))
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    function weekReward() {
      s.choosing = true;
      release();
      const R_LINE = ["Nowa linia", `Linia ${NAMES[s.lines.length]?.toLowerCase()} do zbudowania.`, "+1 linia", "line", KEYS[s.lines.length], () => s.lines.push({ key: KEYS[s.lines.length], stops: [], loop: false, grow: {} })];
      const R_TRAIN = ["Pociąg", "Dodatkowy pociąg na najbardziej zatłoczonej linii.", "+1 pociąg", "train", "c", () => {
        const li = busiest(() => true);
        if (li != null) { addTrain(li); ctx.toast(`Nowy pociąg: linia ${NAMES[li].toLowerCase()}`); }
        else { (s.depot ||= []).push(1); ctx.toast("Pociąg czeka w zajezdni na pierwszą linię"); }
      }];
      const R_WAGON = ["Wagon", "Sześć miejsc więcej w pociągu na zatłoczonej linii.", "+6 miejsc", "wagon", "c", () => {
        const li = busiest((i) => s.trains.some((t) => t.line === i && t.cars < MAXC));
        const t = s.trains.filter((o) => o.line === li && o.cars < MAXC).sort((a, b) => a.cars - b.cars)[0];
        if (!t) return;
        t.cars++;
        t.grew = s.clock;
        if (t.cars >= 3) ctx.achieve("dlugi-sklad");
        ctx.toast(`Wagon doczepiony: linia ${NAMES[li].toLowerCase()}`);
      }];
      const R_TUNNEL = ["Tunel", "Jeszcze jedno przejście pod rzeką.", "+1 tunel", "tunnel", "blue", () => s.tunnels++];
      const R_HUB = ["Węzeł przesiadkowy", "Wybrana stacja mieści dwa razy więcej osób i szybciej obsługuje pociągi.", "Stacja ×2", "hub", "gold", () => { s.placing = true; }];
      const pool = [R_TRAIN, R_TUNNEL];
      if (s.trains.some((t) => t.cars < MAXC)) pool.push(R_WAGON);
      if (s.stations.some((st) => !st.hub)) pool.push(R_HUB);
      // co drugi tydzień na pewno nowa linia (póki są kolory), w pozostałe na pewno pociąg
      const first = s.lines.length < KEYS.length && s.week % 2 === 1 ? R_LINE : R_TRAIN;
      const opts = [first, ...shuffle(pool.filter((o) => o !== first)).slice(0, 2)];
      if (first === R_TRAIN && s.lines.length < KEYS.length && s.week > 2 && Math.random() < 0.5) opts[2] = R_LINE;
      const head = el("div", "mt-reward-head");
      head.append(el("small", "", `Koniec tygodnia ${s.week}`), el("h3", "", "Wybierz nagrodę"));
      const list = el("div", "mt-reward-list");
      rewardBox.replaceChildren(head, list);
      opts.forEach(([name, text, short, icon, color, fn], k) => {
        const b = button("", "mt-opt", () => {
          fn();
          rewardBox.classList.add("out");
          setTimeout(() => { rewardBox.hidden = true; rewardBox.classList.remove("out"); }, 180);
          s.choosing = false;
          Sound.line();
          render();
        });
        b.style.setProperty("--oc", `var(--${color === "c" ? "c" : color})`);
        b.style.setProperty("--d", `${k * 70}ms`);
        const ico = el("span", "mt-ico");
        ico.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[icon]}</svg>`;
        const txt = el("span", "mt-opt-text");
        txt.append(el("b", "", name), el("span", "", text), el("small", "", short));
        b.append(ico, txt, el("kbd", "", k + 1));
        list.append(b);
      });
      rewardBox.hidden = false;
      Sound.line();
      list.querySelector(".mt-opt").focus({ preventScroll: true });
    }
    function placeHub(st) {
      if (st.hub) { Sound.error(); return ctx.toast("Ta stacja jest już węzłem"); }
      st.hub = true;
      st.hubT = s.clock;
      s.placing = false;
      s.fx.push({ kind: "ring", x: st.x, y: st.y, t: 0, dur: 0.8, color: "gold", r0: R + 1, r1: R + 12 });
      Sound.line();
      render();
    }

    // --- geometria: łamane z łukami, rozsunięte, gdy kilka linii jedzie tą samą trasą ---
    // Kształty odcinków wybiera układ całej sieci (Metro.layout) przy każdej zmianie linii albo stacji.
    // Zmiana kształtu i rozsunięcia nie skacze: punkt załamania i przesunięcie dochodzą do celu płynnie.
    let geo = [], topo = "";
    function buildGeo(dt = 1) {
      const now = s.lines.map((l) => l.stops.join(".") + (l.loop ? "o" : "")).join("|") + "#" + s.stations.length;
      if (now !== topo) {
        topo = now;
        const next = Metro.layout(s.stations, s.lines, modes);
        modes.clear();
        next.forEach((v, k) => modes.set(k, v));
      }
      const shared = new Map();
      const pairs = (l) => {
        const out = [];
        for (let k = 1; k < l.stops.length; k++) out.push([l.stops[k - 1], l.stops[k]]);
        if (l.loop && l.stops.length > 2) out.push([l.stops[l.stops.length - 1], l.stops[0]]);
        return out;
      };
      s.lines.forEach((l, li) => pairs(l).forEach(([a, b]) => {
        const key = segKey(a, b);
        if (!shared.has(key)) shared.set(key, []);
        shared.get(key).push(li);
      }));
      const ease = Math.min(1, dt * 9), base = new Map();
      for (const key of shared.keys()) {
        const [p, q] = key.split("-").map((id) => byId(+id));
        const target = Metro.route(p, q, modes.get(key) ?? 0)[1];
        let m = mids.get(key);
        if (!m) mids.set(key, (m = { ...target }));
        m.x += (target.x - m.x) * ease;
        m.y += (target.y - m.y) * ease;
        if (Math.hypot(target.x - m.x, target.y - m.y) < 0.02) Object.assign(m, target);
        base.set(key, [p, m, q]);
      }
      geo = s.lines.map((l, li) => {
        const G = { pts: [], cum: [], seg: [], total: 0, loop: l.loop && l.stops.length > 2 };
        const push = (p) => {
          const q = G.pts[G.pts.length - 1];
          if (q && Math.hypot(p.x - q.x, p.y - q.y) < 1e-6) return;
          G.cum.push(q ? G.cum[G.cum.length - 1] + Math.hypot(p.x - q.x, p.y - q.y) : 0);
          G.pts.push(p);
        };
        for (const [ia, ib] of pairs(l)) {
          const key = segKey(ia, ib), on = shared.get(key), [p, m, q] = base.get(key);
          // przesunięcie liczone zawsze od stacji o mniejszym id, żeby linie rozsuwały się w tę samą stronę
          const target = (on.indexOf(li) - (on.length - 1) / 2) * 2.8, ok = li + "|" + key;
          let off = offs.get(ok) ?? target;
          off += (target - off) * ease;
          offs.set(ok, off);
          const pts = Metro.bend(p, m, q, off);
          if (p.id !== ia) pts.reverse();
          push(pts[0]);
          const s0 = G.cum[G.cum.length - 1];
          pts.slice(1).forEach(push);
          G.seg.push({ s: s0, e: G.cum[G.cum.length - 1], key, tunnel: Metro.crosses(p, q, RX0, RX1) });
        }
        G.total = G.cum[G.cum.length - 1] || 0;
        return G;
      });
    }
    // punkt i kąt na łamanej w odległości d; poza końcami zwykłej linii przedłużenie w linii prostej
    function at(G, d) {
      const { pts, cum } = G, n = pts.length;
      if (G.loop) d = ((d % G.total) + G.total) % G.total;
      let k;
      if (d <= 0) k = 0;
      else if (d >= G.total) k = n - 2;
      else { let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; } k = lo; }
      const a = pts[k], b = pts[k + 1], L = cum[k + 1] - cum[k] || 1, u = (d - cum[k]) / L;
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    // punkty łamanej między odległościami d0 < d1
    function span(G, d0, d1) {
      const mids = [];
      for (const o of G.loop ? [-G.total, 0, G.total] : [0]) for (const c of G.cum) if (c + o > d0 && c + o < d1) mids.push(c + o);
      mids.sort((a, b) => a - b);
      return [at(G, d0), ...mids.map((d) => at(G, d)), at(G, d1)];
    }
    // położenie pociągu: odcinek, odległość środka składu i zwrot jazdy wzdłuż łamanej
    function segOf(t) {
      const l = s.lines[t.line], n = l.stops.length, i = l.stops.indexOf(t.from), j = l.stops.indexOf(t.to);
      const loop = l.loop && n > 2;
      if (j === i + 1 || (loop && j === (i + 1) % n)) return { k: i, fw: true };
      return { k: j, fw: false };
    }
    function trainArc(t) {
      const G = geo[t.line], { k, fw } = segOf(t), sg = G.seg[k];
      if (!sg) return null;
      return { d: sg.s + (fw ? t.f : 1 - t.f) * (sg.e - sg.s), dir: fw ? 1 : -1 };
    }

    // --- symulacja ---
    // odległości do kształtów; liczone od nowa tylko po zmianie sieci (linie, pętle i kierunki ich pociągów, stacje)
    let netKey = "", distCache = new Map();
    function distOf(shape) {
      const key = s.lines.map((l, i) => l.stops.join(".") + (l.loop ? "o" + [...new Set(s.trains.filter((t) => t.line === i).map((t) => t.dir))].sort().join("") : "")).join("|") + "#" + s.stations.length;
      if (key !== netKey) { netKey = key; distCache = new Map(); }
      if (!distCache.has(shape)) {
        const net = s.lines.map((l, i) => ({ stops: l.stops, loop: l.loop, dirs: new Set(s.trains.filter((t) => t.line === i).map((t) => t.dir)) }));
        distCache.set(shape, Metro.distances(s.stations, net, shape));
      }
      return distCache.get(shape);
    }
    // indeks i kierunek po przystanku j: w pętli dookoła, na zwykłej linii zawrócenie na końcu
    function after(l, j, dir) {
      const n = l.stops.length;
      let nx = j + dir;
      if (l.loop && n > 2) return [(nx + n) % n, dir];
      if (nx < 0 || nx >= n) { dir = -dir; nx = j + dir; }
      return [nx, dir];
    }
    // czy pociąg musi stanąć na stacji `t.to`: ktoś wysiada, ktoś wsiada albo to koniec linii
    function needStop(t) {
      const l = s.lines[t.line], j = l.stops.indexOf(t.to), [nx, dir] = after(l, j, t.dir);
      if (dir !== t.dir) return true;
      const st = byId(t.to), next = l.stops[nx];
      let left = 0;
      for (const p of t.load) if (p.k === st.shape || !Metro.rides(distOf(p.k), st.id, next)) return true; else left++;
      return left < CAP * t.cars && st.wait.some((p) => Metro.rides(distOf(p.k), st.id, next));
    }
    function atStation(t) {
      const l = s.lines[t.line], st = byId(t.from);
      let moved = 0, got = 0;
      const stay = [];
      // wysiadanie: cel osiągnięty albo przesiadka, gdy dalsza jazda nie prowadzi najkrótszą drogą
      t.load.forEach((p, k) => {
        if (p.k === st.shape) {
          s.delivered++; got++; moved++;
          s.fx.push({ kind: "fly", shape: p.k, from: { train: t, slot: k }, to: { x: st.x, y: st.y - 3 }, t: 0, dur: 0.4, fade: true, delay: got * 0.04 });
        } else if (!Metro.rides(distOf(p.k), st.id, t.to)) {
          st.wait.push({ k: p.k, b: s.clock + 0.35 });
          moved++;
          s.fx.push({ kind: "fly", shape: p.k, from: { train: t, slot: k }, to: { st, slot: st.wait.length - 1 }, t: 0, dur: 0.35 });
        } else stay.push(p);
      });
      t.load = stay;
      if (got) {
        Sound.place(1 + (s.delivered % 8));
        s.fx.push({ kind: "score", x: st.x, y: st.y, n: got, color: l.key, t: 0, dur: 1.1 });
        s.fx.push({ kind: "ring", x: st.x, y: st.y, t: 0, dur: 0.6, color: l.key, r0: R + 1, r1: R + 6 + got });
        if (got >= 6) ctx.achieve("pelny-kurs");
      }
      // wsiadanie: najpierw ci, którzy czekają najdłużej
      const keep = [];
      st.wait.forEach((p, k) => {
        if (t.load.length < CAP * t.cars && Metro.rides(distOf(p.k), st.id, t.to)) {
          t.load.push({ k: p.k });
          moved++;
          s.fx.push({ kind: "fly", shape: p.k, from: { st, slot: k }, to: { train: t, slot: t.load.length - 1 }, t: 0, dur: 0.32, delay: moved * 0.03 });
        } else keep.push(p);
      });
      st.wait = keep;
      return st.hub ? moved * 0.5 : moved;
    }
    function moveTrain(t, dt) {
      const l = s.lines[t.line];
      if (t.wait > 0) { t.wait -= dt; return; }
      const G = geo[t.line], sg = G.seg[segOf(t).k];
      if (!sg) return;
      const len = sg.e - sg.s || 1, rest = (1 - t.f) * len;
      // przed stacją: hamowanie do zera albo, gdy nie ma po co stawać, przejazd z mniejszą prędkością
      if (rest < 14) t.pass = !needStop(t);
      const vEnd = t.pass ? VPASS : 0;
      const brake = Math.max(2.5, Math.sqrt(vEnd * vEnd + 2 * ACC * rest));
      t.v = Math.max(t.v - 2.2 * ACC * dt, Math.min(t.v + ACC * dt, VMAX, brake));
      t.f += (t.v * dt) / len;
      if (t.f < 1) return;
      const [nx, dir] = after(l, l.stops.indexOf(t.to), t.dir);
      Object.assign(t, { from: t.to, to: l.stops[nx], dir, f: 0 });
      const moved = atStation(t);
      if (t.pass && !moved) { t.v = Math.min(t.v, VPASS); t.wait = 0; }
      else { t.v = 0; t.wait = 0.35 + moved * 0.12; }
      t.pass = false;
    }
    // dzień tygodnia 0–6 i godzina szczytu
    const dayNow = () => Math.min(6, (((s.t % WEEK) / WEEK) * 7) | 0);
    const rushNow = () => s.week >= lv.rushFrom && lv.rush.includes(dayNow());
    // nowy pasażer: stacja losowana z wagą (nowa stacja ma chwilę spokoju, zatłoczone rzadziej na łatwiejszych poziomach),
    // cel losowany spośród innych kształtów, rzadkie kształty według poziomu
    function spawnPassenger() {
      const pool = s.stations.map((st) => [st, s.t - st.bornT < lv.grace ? 0 : 1 / (1 + st.wait.length * lv.mercy)]).filter(([, w]) => w > 0);
      if (!pool.length) return;
      let r = Math.random() * pool.reduce((a, [, w]) => a + w, 0), st = pool[0][0];
      for (const [o, w] of pool) { r -= w; if (r <= 0) { st = o; break; } }
      const shapes = [...new Set(s.stations.map((o) => o.shape))].filter((x) => x !== st.shape).map((x) => [x, SHAPES.indexOf(x) < 3 ? 1 : lv.demand]);
      if (!shapes.length) return;
      let q = Math.random() * shapes.reduce((a, [, w]) => a + w, 0), k = shapes[0][0];
      for (const [x, w] of shapes) { q -= w; if (q <= 0) { k = x; break; } }
      st.wait.push({ k, b: s.clock });
    }
    function step(dt) {
      s.t += dt;
      // nowe stacje: coraz rzadsze kształty pojawiają się później
      s.spawnS += dt;
      if (s.spawnS > s.nextStation && s.stations.length < lv.cap) {
        s.spawnS = 0;
        s.nextStation = lv.every * (0.8 + Math.random() * 0.4);
        const have = new Set(s.stations.map((o) => o.shape));
        const rare = SHAPES.slice(3).filter((x) => !have.has(x));
        const r = Math.random();
        const shape = s.t > WEEK * 0.8 && rare.length && r < lv.rare ? pick(rare) : r < 0.5 ? "circle" : r < 0.78 ? "triangle" : r < 0.93 ? "square" : pick(SHAPES.slice(3, have.size > 4 ? 6 : 4));
        addStation(shape);
      }
      // pasażerowie: tempo rośnie z czasem i liczbą stacji, w godzinach szczytu szybciej
      const rush = rushNow();
      if (rush && !s.rushOn) { ctx.toast("Godzina szczytu: pasażerów przybywa szybciej"); Sound.flag(); }
      s.rushOn = rush;
      const mul = Math.min(lv.peak, 1 + s.t / lv.ramp) * (0.75 + 0.04 * s.stations.length) * (rush ? 1.7 : 1);
      s.spawnP -= dt * lv.rate * mul;
      if (s.spawnP <= 0) { s.spawnP += 0.6 + Math.random() * 0.8; spawnPassenger(); }
      if (s.depot?.length) {
        const li = s.lines.findIndex((l) => l.stops.length > 1);
        if (li >= 0) addTrain(li, s.depot.shift());
      }
      for (const t of s.trains) moveTrain(t, dt);
      for (const st of s.stations) {
        if (st.wait.length > maxWait(st)) {
          if (!st.over) { Sound.error(); ctx.toast("Tłok na stacji. Dowieź pasażerów, zanim okrąg się zamknie."); }
          st.over += dt / lv.crowd;
          if (st.over > 0.5) s.crowded = true;
          if (st.over >= 1) {
            s.failed = st;
            renderStats();
            return ctx.lose("Przepełniona stacja", `Dowiezieni pasażerowie: ${s.delivered} z ${lv.target}, tydzień ${s.week + 1}.`);
          }
        } else st.over = Math.max(0, st.over - dt / 20);
      }
      if (s.t > (s.week + 1) * WEEK) { s.week++; weekReward(); }
      if (!s.got50 && s.delivered >= 50) { s.got50 = true; ctx.achieve("pierwsze-kursy"); }
      if (!s.everTunnel && !s.dry && s.delivered >= 60) { s.dry = true; ctx.achieve("bez-tuneli"); }
      if (s.delivered >= lv.target) {
        if (!s.crowded && lv.key === "medium") ctx.achieve("plynny-ruch");
        if (!s.crowded && lv.key === "hard") ctx.achieve("dyspozytor");
        renderStats();
        ctx.win(`Tygodnie: ${s.week + 1}, stacje: ${s.stations.length}, pociągi: ${s.trains.length}.`);
      }
    }
    let uiT = 0;
    cv.loop((dt, now) => {
      s.clock += dt;
      buildGeo(dt);
      const run = !ctx.done && !s.choosing && !s.placing && s.speed > 0;
      if (run) for (let k = 0; k < s.speed && !ctx.done && !s.choosing && !s.placing; k++) step(dt);
      for (const f of s.fx) f.t += dt;
      s.fx = s.fx.filter((f) => f.t < f.dur + (f.delay || 0));
      s.veil += ((!ctx.done && (s.speed === 0 || s.placing) ? 1 : 0) - s.veil) * Math.min(1, dt * 10);
      uiT += dt;
      if (uiT > 0.25) { uiT = 0; renderStats(); }
      draw(dt);
    });

    // --- rysowanie ---
    const easeOut = (u) => 1 - Math.pow(1 - u, 3);
    const easeBack = (u) => 1 + 2.4 * Math.pow(u - 1, 3) + 1.4 * Math.pow(u - 1, 2);
    function shape(kind, x, y, r) {
      g.beginPath();
      if (kind === "circle") g.arc(x, y, r, 0, Math.PI * 2);
      if (kind === "square") g.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76);
      if (kind === "triangle") { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 1.1, y + r * 0.75); g.lineTo(x - r * 1.1, y + r * 0.75); }
      if (kind === "diamond") { g.moveTo(x, y - r * 1.25); g.lineTo(x + r * 1.05, y); g.lineTo(x, y + r * 1.25); g.lineTo(x - r * 1.05, y); }
      if (kind === "star") for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.55 : r * 1.2; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      if (kind === "cross") { const q = r * 0.38; [[-q, -r], [q, -r], [q, -q], [r, -q], [r, q], [q, q], [q, r], [-q, r], [-q, q], [-r, q], [-r, -q], [-q, -q]].forEach(([dx, dy], k) => g[k ? "lineTo" : "moveTo"](x + dx, y + dy)); }
      g.closePath();
    }
    const fillShape = (kind, x, y, r, fill) => { shape(kind, x, y, r); g.fillStyle = fill; g.fill(); };
    const poly = (pts) => { g.beginPath(); pts.forEach((p, k) => g[k ? "lineTo" : "moveTo"](p.x, p.y)); };
    // miejsce k-tego czekającego pasażera; przy prawym brzegu stają po lewej stronie stacji
    function slotXY(st, k) {
      const side = st.x > W - 24 ? -1 : 1;
      return { x: st.x + side * (5.8 + (k % 6) * 2.6), y: st.y - 1.4 + ((k / 6) | 0) * 2.7 };
    }
    // miejsce k-tego pasażera w pociągu (rzędy po trzy w każdym wagonie)
    function seatXY(t, k) {
      const A = trainArc(t);
      if (!A) return null;
      const G = geo[t.line], len = t.cars * CAR + (t.cars - 1) * GAP, front = A.d + (A.dir * len) / 2;
      const car = (k / CAP) | 0, inCar = k % CAP, c = inCar % 3, row = inCar < 3 ? -1 : 1;
      const p = at(G, front - A.dir * (car * (CAR + GAP) + 1.7 + c * 2));
      return { x: p.x - Math.sin(p.a) * row * 1.15, y: p.y + Math.cos(p.a) * row * 1.15, a: p.a };
    }
    const riverX = (bank, u) => {
      // brzeg rzeki: krzywa Béziera od góry do dołu, u = y / H
      const x0 = bank ? RX1 : RX0, v = 1 - u;
      return v * v * v * x0 + 3 * v * v * u * (x0 + 8) + 3 * v * u * u * (x0 - 6) + u * u * u * (x0 + 2);
    };
    function river() {
      g.beginPath();
      g.moveTo(RX0, 0); g.bezierCurveTo(RX0 + 8, H * 0.35, RX0 - 6, H * 0.65, RX0 + 2, H);
      g.lineTo(RX1 + 2, H); g.bezierCurveTo(RX1 - 6, H * 0.65, RX1 + 8, H * 0.35, RX1, 0);
      g.closePath();
    }
    const bank = (x0) => { g.beginPath(); g.moveTo(x0, 0); g.bezierCurveTo(x0 + 8, H * 0.35, x0 - 6, H * 0.65, x0 + 2, H); g.stroke(); };
    function drawBackground() {
      // delikatna siatka ulic i parki
      g.strokeStyle = col("line");
      g.lineWidth = 0.25;
      g.globalAlpha = 0.4;
      g.beginPath();
      for (let x = 10; x < W; x += 10) { g.moveTo(x, 0); g.lineTo(x, H); }
      for (let y = 10; y < H; y += 10) { g.moveTo(0, y); g.lineTo(W, y); }
      g.stroke();
      g.globalAlpha = 0.09;
      g.fillStyle = col("green");
      for (const p of parks) { g.beginPath(); g.roundRect(p.x, p.y, p.w, p.h, 3); g.fill(); }
      g.globalAlpha = 1;
      // rzeka z brzegami
      g.fillStyle = col("blue");
      g.globalAlpha = 0.1;
      river(); g.fill();
      g.globalAlpha = 0.3;
      g.strokeStyle = col("blue");
      g.lineWidth = 0.4;
      bank(RX0);
      bank(RX1);
      g.globalAlpha = 1;
    }
    function drawWater() {
      // woda nad tunelami i płynące smugi
      g.fillStyle = col("blue");
      g.globalAlpha = 0.1;
      river(); g.fill();
      g.strokeStyle = col("surface");
      g.lineWidth = 0.5;
      for (let k = 0; k < 9; k++) {
        const y = ((k * 17.3 + s.clock * 5) % (H + 16)) - 8, u = Math.max(0, Math.min(1, y / H));
        const x = (riverX(0, u) + riverX(1, u)) / 2 + Math.sin(k * 2.1) * 2.6;
        g.globalAlpha = 0.5 * Math.sin(Math.PI * Math.max(0, Math.min(1, (y + 8) / (H + 16))));
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 0.8, y + 2, x, y + 4); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // widoczny fragment linii: odcinek przy końcu dopiero wyrasta
    function visible(li) {
      const l = s.lines[li], G = geo[li];
      let d0 = 0, d1 = G.total;
      const growth = (sg) => { const gr = sg && l.grow[sg.key]; return gr ? [easeOut(Math.min(1, (s.clock - gr.t0) / 0.32)), gr.back] : null; };
      const first = growth(G.seg[0]), last = growth(G.seg[G.seg.length - 1]);
      if (first && first[1]) d0 = G.seg[0].e - first[0] * (G.seg[0].e - G.seg[0].s);
      if (last && !last[1]) { const sg = G.seg[G.seg.length - 1]; d1 = sg.s + last[0] * (sg.e - sg.s); }
      return [d0, d1];
    }
    // znacznik końca linii: krótka kreska i poprzeczka (litera T)
    function endCap(p, a, color, hot) {
      const ux = Math.cos(a), uy = Math.sin(a), L = hot ? 6.5 : 5, w = hot ? 2.4 : 1.9;
      const ex = p.x + ux * L, ey = p.y + uy * L;
      g.strokeStyle = color;
      g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(ex, ey); g.moveTo(ex - uy * w, ey + ux * w); g.lineTo(ex + uy * w, ey - ux * w); g.stroke();
    }
    function drawLines() {
      const order = s.lines.map((_, i) => i).sort((a, b) => (a === s.sel) - (b === s.sel));
      const paper = col("surface");
      for (const li of order) {
        const l = s.lines[li], G = geo[li];
        if (G.pts.length < 2) continue;
        const color = col(l.key), [d0, d1] = visible(li), pts = span(G, d0, d1);
        g.globalAlpha = grab && grab.li !== li ? 0.4 : 1;
        // obwódka w kolorze tła oddziela krzyżujące się linie
        poly(pts); g.strokeStyle = paper; g.lineWidth = 3.8; g.stroke();
        poly(pts); g.strokeStyle = color; g.lineWidth = 2.4; g.stroke();
        if (!G.loop) {
          const a = at(G, d0), b = at(G, d1);
          endCap(a, a.a + Math.PI, color, grab?.li === li && grab.end === 0);
          endCap(b, b.a, color, grab?.li === li && grab.end === 1);
        } else if (li === s.sel) {
          // początek pętli: tu można ją otworzyć
          const p = byId(l.stops[0]);
          g.strokeStyle = color;
          g.lineWidth = 0.7;
          g.setLineDash([1.2, 1]);
          g.beginPath(); g.arc(p.x, p.y, R + 3.2, 0, Math.PI * 2); g.stroke();
          g.setLineDash([]);
        }
        g.globalAlpha = 1;
      }
    }
    function drawTunnels() {
      // tunel pod wodą: przerywany środek linii
      g.save();
      river(); g.clip();
      g.setLineDash([1.4, 1.4]);
      g.lineDashOffset = -s.clock * 3;
      g.strokeStyle = col("surface");
      g.lineWidth = 0.8;
      geo.forEach((G) => G.seg.forEach((sg) => { if (sg.tunnel) { poly(span(G, sg.s, sg.e)); g.stroke(); } }));
      g.restore();
    }
    function drawGhosts() {
      for (const f of s.fx) if (f.kind === "ghost") {
        const u = f.t / f.dur;
        g.globalAlpha = 0.7 * (1 - u);
        poly(f.pts); g.strokeStyle = col(f.color); g.lineWidth = 2.4 * (1 - u * 0.7); g.stroke();
        g.globalAlpha = 1;
      }
    }
    function drawBend() {
      const l = s.lines[bend.li], n = l.stops.length, a = byId(l.stops[bend.k]), b = byId(l.stops[(bend.k + 1) % n]);
      if (!a || !b) return (bend = null);
      const over = stationAt(...ptr), ok = over && !l.stops.includes(over.id);
      const mid = ok ? over : { x: ptr[0], y: ptr[1] };
      const stops = ok ? [...l.stops.slice(0, bend.k + 1), over.id, ...l.stops.slice(bend.k + 1)] : l.stops;
      const blocked = ok && usedTunnels() - lineTunnels(l.stops, l.loop) + lineTunnels(stops, l.loop) > s.tunnels;
      // dotychczasowy odcinek przygasa, nowa trasa idzie przez wskaźnik
      const G = geo[bend.li], sg = G.seg[bend.k];
      if (sg) { g.globalAlpha = 0.5; poly(span(G, sg.s, sg.e)); g.strokeStyle = col("surface"); g.lineWidth = 1.4; g.stroke(); }
      g.strokeStyle = col(blocked ? "bad" : l.key);
      g.globalAlpha = ok ? 0.85 : 0.55;
      g.lineWidth = 2.4;
      if (!ok || blocked) { g.setLineDash([2.4, 2]); g.lineDashOffset = -s.clock * 8; }
      const pm = ok ? previewModes(bend.li, stops, l.loop) : null;
      const part = (x, y) => (pm ? shapeOf(x, y, pm.get(segKey(x.id, y.id)) ?? 0) : curve(x, y));
      poly([...part(a, mid), ...part(mid, b).slice(1)]); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      const pulse = 0.5 + 0.5 * Math.sin(s.clock * 8);
      g.lineWidth = 0.8;
      g.beginPath(); g.arc(mid.x, mid.y, ok ? R + 2.2 + pulse * 0.8 : 1.6 + pulse * 0.4, 0, Math.PI * 2); g.stroke();
    }
    function drawPreview() {
      if (bend && ptr) return drawBend();
      if (!grab || !ptr) return;
      const l = s.lines[grab.li], a = byId(endId(grab)), over = stationAt(...ptr);
      if (!a) return;
      const loopOk = over && canLoop(grab, over), ok = over && (loopOk || !l.stops.includes(over.id));
      const b = ok ? over : { x: ptr[0], y: ptr[1] };
      if (Math.hypot(b.x - a.x, b.y - a.y) < R) return;
      const stops = ok && !loopOk ? (grab.end ? [...l.stops, over.id] : [over.id, ...l.stops]) : l.stops;
      // podgląd ma już kształt, jaki dostanie odcinek w nowym układzie sieci
      const pts = ok ? shapeOf(a, b, previewModes(grab.li, stops, loopOk || l.loop).get(segKey(a.id, b.id)) ?? 0) : curve(a, b);
      const blocked = ok && usedTunnels() - lineTunnels(l.stops, false) + lineTunnels(stops, loopOk) > s.tunnels;
      g.strokeStyle = col(blocked ? "bad" : l.key);
      g.globalAlpha = ok ? 0.85 : 0.45;
      g.lineWidth = 2.4;
      if (!ok || blocked) { g.setLineDash([2.4, 2]); g.lineDashOffset = -s.clock * 8; }
      poly(pts); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      if (ok) {
        const pulse = 0.5 + 0.5 * Math.sin(s.clock * 8);
        g.strokeStyle = col(blocked ? "bad" : l.key);
        g.lineWidth = 0.8;
        g.beginPath(); g.arc(over.x, over.y, R + 2.2 + pulse * 0.8, 0, Math.PI * 2); g.stroke();
      }
    }
    function drawTrains() {
      const paper = col("surface");
      for (const t of s.trains) {
        const l = s.lines[t.line], G = geo[t.line];
        if (l.stops.length < 2 || !G.seg.length) continue;
        const A = trainArc(t);
        if (!A) continue;
        const len = t.cars * CAR + (t.cars - 1) * GAP, front = A.d + (A.dir * len) / 2;
        const born = Math.min(1, (s.clock - t.born) / 0.4), sc = easeBack(born);
        const color = col(l.key);
        for (let c = 0; c < t.cars; c++) {
          const a0 = front - A.dir * c * (CAR + GAP), a1 = a0 - A.dir * CAR;
          const pts = span(G, Math.min(a0, a1) + 2.5, Math.max(a0, a1) - 2.5);
          // cień i wagon (okrągłe zakończenia łamanej dają zaokrąglony kształt)
          g.globalAlpha = 0.18 * born;
          g.save(); g.translate(0.35, 0.6); poly(pts); g.strokeStyle = col("text"); g.lineWidth = 5 * sc; g.stroke(); g.restore();
          g.globalAlpha = born;
          // obwódka odcina wagon od linii, po której jedzie
          poly(pts); g.strokeStyle = paper; g.lineWidth = 6 * sc; g.stroke();
          poly(pts); g.strokeStyle = color; g.lineWidth = 5 * sc; g.stroke();
          if (t.grew && c === t.cars - 1) {
            const u = Math.min(1, (s.clock - t.grew) / 0.5);
            if (u < 1) { g.globalAlpha = 1 - u; poly(pts); g.strokeStyle = col("gold"); g.lineWidth = 5 + 3 * u; g.stroke(); }
          }
          g.globalAlpha = 1;
        }
        // przód składu: jaśniejsze okno
        const nose = at(G, front - A.dir * 1.2);
        g.globalAlpha = 0.45 * born;
        g.fillStyle = paper;
        g.beginPath(); g.arc(nose.x, nose.y, 0.75, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
        t.load.forEach((p, k) => {
          if (s.fx.some((f) => f.kind === "fly" && f.to.train === t && f.to.slot === k && f.t < f.dur + (f.delay || 0))) return;
          const q = seatXY(t, k);
          if (q) fillShape(p.k, q.x, q.y, 0.72, paper);
        });
      }
    }
    function drawStations() {
      const hover = ptr && !dragging ? stationAt(...ptr) : null;
      const ink = col("text"), paper = col("surface");
      for (const st of s.stations) {
        st.hs += ((hover === st || (grab && ptr && stationAt(...ptr) === st) ? 1.2 : 1) - st.hs) * 0.25;
        const age = (s.clock - st.born) / 0.55, pop = age < 1 ? Math.max(0.01, easeBack(Math.max(0, age))) : 1;
        let { x, y } = st;
        // tłok: pulsująca poświata i rosnący łuk odliczania
        if (st.over > 0 || s.failed === st) {
          const o = s.failed === st ? 1 : st.over, pulse = 0.5 + 0.5 * Math.sin(s.clock * (4 + o * 10));
          if (o > 0.6 && !ctx.done) { x += Math.sin(s.clock * 47) * 0.25 * o; y += Math.cos(s.clock * 41) * 0.2 * o; }
          g.fillStyle = col("bad");
          g.globalAlpha = 0.1 + 0.16 * pulse * o;
          g.beginPath(); g.arc(x, y, 8 + pulse * 0.8, 0, Math.PI * 2); g.fill();
          g.globalAlpha = 0.25;
          g.strokeStyle = col("bad");
          g.lineWidth = 1.4;
          g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.stroke();
          g.globalAlpha = 1;
          g.beginPath(); g.arc(x, y, 8, -Math.PI / 2, -Math.PI / 2 + o * Math.PI * 2); g.stroke();
        }
        // wybór węzła: pulsujące stacje do wyboru
        if (s.placing && !st.hub) {
          const pulse = 0.5 + 0.5 * Math.sin(s.clock * 6 + st.id);
          g.strokeStyle = col("gold");
          g.lineWidth = 0.9;
          g.globalAlpha = 0.5 + 0.5 * pulse;
          g.beginPath(); g.arc(x, y, R + 3 + pulse * 1.4, 0, Math.PI * 2); g.stroke();
          g.globalAlpha = 1;
        }
        const r = R * pop * st.hs * (st.hub ? 1.15 : 1);
        g.globalAlpha = 0.14;
        shape(st.shape, x + 0.3, y + 0.55, r); g.fillStyle = ink; g.fill();
        g.globalAlpha = 1;
        if (st.hub) {
          const u = Math.min(1, (s.clock - (st.hubT || 0)) / 0.5);
          shape(st.shape, x, y, r + 1.6 * easeBack(u));
          g.fillStyle = paper; g.fill();
          g.strokeStyle = ink; g.lineWidth = 0.6; g.stroke();
        }
        shape(st.shape, x, y, r);
        g.fillStyle = paper; g.fill();
        g.strokeStyle = ink; g.lineWidth = st.hub ? 1.3 : 1.1; g.stroke();
        // czekający pasażerowie wyskakują po kolei
        const n = st.wait.length, full = n > maxWait(st), near = n >= maxWait(st) - 1;
        st.wait.slice(0, 12).forEach((p, k) => {
          const u = (s.clock - p.b) / 0.3;
          if (u < 0) return;
          const q = slotXY(st, k), sc = u < 1 ? easeBack(u) : 1;
          fillShape(p.k, q.x, q.y, 0.95 * sc, full ? col("bad") : near ? col("warn") : ink);
        });
        if (n > 12) { const q = slotXY(st, 12); cv.text(`+${n - 12}`, q.x - 1, q.y + 0.2, { size: 2.6, weight: 700, color: full ? "bad" : "muted", align: st.x > W - 24 ? "right" : "left" }); }
      }
    }
    function fxPoint(end) {
      if (end.train) return seatXY(end.train, end.slot);
      if (end.st) return slotXY(end.st, end.slot);
      return end;
    }
    function drawFx() {
      for (const f of s.fx) {
        const u = Math.max(0, f.t - (f.delay || 0)) / f.dur;
        if (f.kind === "ring") {
          g.strokeStyle = col(f.color);
          g.globalAlpha = 0.8 * (1 - u);
          g.lineWidth = 1.1 * (1 - u) + 0.2;
          g.beginPath(); g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * easeOut(u), 0, Math.PI * 2); g.stroke();
        } else if (f.kind === "score") {
          g.globalAlpha = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.55) / 0.45);
          cv.text(`+${f.n}`, f.x, f.y - 6 - easeOut(u) * 6, { size: 4.2, weight: 800, color: f.color });
        } else if (f.kind === "fly") {
          const a = fxPoint(f.from), b = fxPoint(f.to);
          if (!a || !b) continue;
          const e = easeOut(Math.min(1, u)), lift = Math.sin(Math.PI * e) * 2.5;
          g.globalAlpha = f.fade ? 1 - Math.max(0, (e - 0.5) * 2) : 1;
          fillShape(f.shape, a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e - lift, 0.9 * (f.fade ? 1 + e * 0.4 : 1), col("text"));
        }
        g.globalAlpha = 1;
      }
    }
    // podpowiedź na płótnie: zaokrąglona plakietka
    function pill(text, y, color = "muted") {
      g.font = `600 3.4px ${theme.font}`;
      const w = g.measureText(text).width + 7;
      g.globalAlpha = 0.94;
      g.fillStyle = col("surface");
      g.beginPath(); g.roundRect(W / 2 - w / 2, y - 3.3, w, 6.6, 3.3); g.fill();
      g.strokeStyle = col("line"); g.lineWidth = 0.3; g.stroke();
      g.globalAlpha = 1;
      cv.text(text, W / 2, y + 0.2, { size: 3.4, weight: 600, color });
    }
    function drawTutorial() {
      if (grab || s.lines.some((l) => l.stops.length > 1)) return;
      const a = s.stations[0], b = s.stations.filter((o) => o.shape !== a.shape).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
      if (b) {
        // duch linii: palec przeciąga od stacji do stacji
        const pts = curve(a, b), G = { pts, cum: [0], loop: false };
        for (let k = 1; k < pts.length; k++) G.cum.push(G.cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
        G.total = G.cum[G.cum.length - 1];
        const cyc = s.clock % 2.6, u = easeOut(Math.max(0, Math.min(1, (cyc - 0.3) / 1.4))), fade = cyc > 2.1 ? 1 - (cyc - 2.1) / 0.5 : 1;
        g.globalAlpha = 0.45 * fade;
        g.setLineDash([2, 1.6]);
        poly(span(G, 0, Math.max(0.01, u * G.total))); g.strokeStyle = col(s.lines[s.sel].key); g.lineWidth = 2.2; g.stroke();
        g.setLineDash([]);
        const p = at(G, u * G.total);
        g.globalAlpha = 0.5 * fade;
        g.fillStyle = col("text");
        g.beginPath(); g.arc(p.x + 1.2, p.y + 1.6, 1.6, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;
      }
      pill("Przeciągnij od stacji do stacji, żeby zbudować linię", 6);
    }
    function draw() {
      g.lineCap = "round";
      g.lineJoin = "round";
      drawBackground();
      drawLines();
      drawGhosts();
      drawTrains();
      drawWater();
      drawTunnels();
      drawPreview();
      drawStations();
      drawFx();
      drawTutorial();
      if (s.veil > 0.01) {
        g.globalAlpha = 0.28 * s.veil;
        g.fillStyle = col("bg");
        g.fillRect(0, 0, W, H);
        g.globalAlpha = s.veil;
        if (s.placing) pill("Wybierz stację na węzeł przesiadkowy", 6, "text");
        else pill("Pauza. Spacja wznawia, linie możesz przebudowywać.", 6, "text");
        g.globalAlpha = 1;
      }
    }

    // --- panel ---
    let lastKey = "";
    function renderStats() {
      deliveredEl.set(`${s.delivered} / ${lv.target}`, s.delivered / lv.target, `Do celu: ${Math.max(0, lv.target - s.delivered)}`);
      ctx.progress(s.delivered / lv.target);
      const wk = (s.t % WEEK) / WEEK, day = Math.min(6, (wk * 7) | 0);
      weekTitle.textContent = `Tydzień ${s.week + 1}`;
      dayEls.forEach((d, k) => {
        d.classList.toggle("rush", s.week >= lv.rushFrom && lv.rush.includes(k));
        d.classList.toggle("done", k < day);
        d.classList.toggle("now", k === day);
        d.style.setProperty("--f", k < day ? 1 : k === day ? (wk * 7 - day).toFixed(2) : 0);
      });
      days.setAttribute("aria-label", `Dzień ${day + 1} z 7${rushNow() ? ", godzina szczytu" : ""}, nagroda na koniec tygodnia`);
      const free = s.tunnels - usedTunnels();
      weekEl.set("Tunele", `${free} z ${s.tunnels}`);
      weekEl.set("Pociągi", s.trains.length + (s.depot?.length || 0) + s.lines.reduce((a, l) => a + (l.parked?.length || 0), 0));
      weekEl.set("Wagony", s.trains.reduce((a, t) => a + t.cars - 1, 0) + s.lines.reduce((a, l) => a + (l.parked || []).reduce((b, c) => b + c - 1, 0), 0));
      const key = `${s.sel}|${s.lines.map((l) => `${l.stops.length}${l.loop ? "o" : ""}`).join()}|${s.trains.map((t) => t.line + ":" + t.cars).join()}`;
      if (key === lastKey) return;
      lastKey = key;
      linesEl.replaceChildren(...s.lines.map((l, i) => {
        const b = button("", `mt-line${i === s.sel ? " on" : ""}${l.stops.length > 1 ? "" : " empty"}`, () => { release(); s.sel = i; Sound.tap(); render(); });
        b.style.setProperty("--lc", `var(--${l.key})`);
        b.setAttribute("aria-pressed", i === s.sel);
        const tr = s.trains.filter((t) => t.line === i), cars = tr.reduce((a, t) => a + t.cars, 0);
        const name = el("span", "mt-line-name");
        const sub = l.stops.length > 1
          ? `${l.stops.length} ${plural(l.stops.length, "stacja", "stacje", "stacji")}${l.loop ? ", pętla" : ""}, ${tr.length} ${plural(tr.length, "pociąg", "pociągi", "pociągów")}${cars > tr.length ? `, ${cars - tr.length} ${plural(cars - tr.length, "wagon", "wagony", "wagonów")}` : ""}`
          : "Pusta, zbuduj ją na mapie";
        name.append(el("b", "", NAMES[i]), el("small", "", sub));
        b.setAttribute("aria-label", `Linia ${NAMES[i].toLowerCase()}: ${sub}`);
        const sw = el("i", `mt-sw${l.loop ? " loop" : ""}`);
        b.append(sw, name, el("kbd", "", i + 1));
        return b;
      }));
      clearBtn.disabled = !s.lines[s.sel].stops.length;
    }
    function render() { lastKey = ""; renderStats(); }
    render();
  },
});
