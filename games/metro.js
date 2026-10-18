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
  const api = { SHAPES, distances, crosses, last: null };
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
    "Wybierz linię w panelu i przeciągnij od stacji do stacji albo klikaj je po kolei. Nowe stacje dokładasz na końce linii. Przejście przez rzekę zużywa tunel.",
    "Gdy na stacji czeka zbyt wielu pasażerów, zaczyna się odliczanie. Pełny okrąg kończy grę. Co tydzień wybierasz nagrodę: nową linię, dodatkowy pociąg albo tunel.",
    "Dowieź wymaganą liczbę pasażerów. Zatrzymaj grę spacją, żeby spokojnie przebudować sieć.",
  ],
  achievements: [
    { id: "pierwsze-kursy", name: "Pierwsze kursy", desc: "Dowieź 50 pasażerów w jednej grze.", points: 10 },
    { id: "plynny-ruch", name: "Płynny ruch", desc: "Wygraj średni poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 25 },
    { id: "dyspozytor", name: "Dyspozytor doskonały", desc: "Wygraj trudny poziom, nie dopuszczając do poważnego tłoku na żadnej stacji.", points: 50 },
  ],
  mount(board, ctx) {
    const { SHAPES } = Metro;
    const lv = ctx.level;
    const W = 160, H = 110, RX0 = 72, RX1 = 84, CAP = 6, MAXW = 7;
    const COLORS = ["#e03131", "#1c7ed6", "#f59f00", "#2f9e44", "#ae3ec9", "#0c8599", "#e8590c"];
    const cv = canvasGame(board, ctx, W, H, { max: 90 });
    const { g } = cv;
    let nextId = 1;
    const s = { stations: [], lines: [], trains: [], delivered: 0, t: 0, week: 0, tunnels: lv.tunnels, sel: 0, paused: false, spawnS: 0, spawnP: 1.5, choosing: false };
    Metro.last = s;
    const addStation = (shape) => {
      for (let t = 0; t < 200; t++) {
        const x = 10 + Math.random() * (W - 20), y = 10 + Math.random() * (H - 20);
        if (x > RX0 - 6 && x < RX1 + 6) continue;
        if (s.stations.some((o) => Math.hypot(o.x - x, o.y - y) < 18)) continue;
        s.stations.push({ id: nextId++, x, y, shape, wait: [], over: 0 });
        return;
      }
    };
    ["circle", "triangle", "square"].forEach(addStation);
    addStation("circle");
    for (let k = 0; k < 3; k++) s.lines.push({ color: COLORS[k], stops: [] });

    const deliveredEl = statBlock(ctx, "Dowiezieni", { meter: true });
    const linesEl = el("div", "mt-lines");
    const tunnelEl = el("p", "rl-small");
    const clearBtn = button("Usuń wybraną linię", "btn-ghost wide", () => clearLine(s.sel));
    ctx.panel.append(panelBlock("Linie", linesEl, tunnelEl, clearBtn));
    const pauseSeg = segmented("Czas", ["Gra", "Pauza"], (k) => { s.paused = k === 1; pauseSeg.set(k); });
    pauseSeg.set(0);
    ctx.panel.append(panelBlock("", pauseSeg.el));
    const rewardBox = el("div", "sv-levelup");
    rewardBox.hidden = true;
    board.append(rewardBox);

    const byId = (id) => s.stations.find((x) => x.id === id);
    function lineTunnels(stops) {
      let n = 0;
      for (let k = 1; k < stops.length; k++) if (Metro.crosses(byId(stops[k - 1]), byId(stops[k]), RX0, RX1)) n++;
      return n;
    }
    function usedTunnels() { return s.lines.reduce((a, l) => a + lineTunnels(l.stops), 0); }
    // dołożenie stacji do końca (albo początku) linii
    function extend(li, st) {
      const l = s.lines[li];
      if (!l || l.stops.includes(st.id)) return false;
      const stops = l.stops.length && l.stops[0] === lastTouched ? [st.id, ...l.stops] : [...l.stops, st.id];
      const need = usedTunnels() - lineTunnels(l.stops) + lineTunnels(stops);
      if (need > s.tunnels) { Sound.error(); ctx.toast("Brak tuneli pod rzeką"); return false; }
      l.stops = stops;
      if (l.stops.length === 2 && !s.trains.some((t) => t.line === li)) s.trains.push({ line: li, pos: 0, dir: 1, load: [], wait: 0 });
      Sound.place(1 + (l.stops.length % 8));
      render();
      return true;
    }
    function clearLine(li) {
      const l = s.lines[li];
      if (!l.stops.length) return;
      // pasażerowie z pociągów tej linii wracają na najbliższą stację
      s.trains.filter((t) => t.line === li).forEach((t) => { const st = byId(l.stops[Math.round(t.pos)]); st?.wait.push(...t.load.map((p) => p.shape)); });
      s.trains = s.trains.filter((t) => t.line !== li);
      l.stops = [];
      Sound.erase();
      render();
    }
    let lastTouched = null, dragging = false;
    const stationAt = (x, y) => s.stations.find((o) => Math.hypot(o.x - x, o.y - y) < 6);
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done || s.choosing) return;
      e.preventDefault();
      const st = stationAt(...cv.at(e));
      if (!st) return;
      dragging = true;
      const l = s.lines[s.sel];
      if (!l.stops.length) { l.stops = [st.id]; lastTouched = st.id; Sound.tap(); return render(); }
      // zaczynamy od końca linii: kliknięcie innej stacji dokłada ją
      if (st.id === l.stops[0] || st.id === l.stops[l.stops.length - 1]) { lastTouched = st.id; return; }
      lastTouched = l.stops[l.stops.length - 1];
      extend(s.sel, st);
      lastTouched = st.id;
    });
    ctx.on(document, "pointermove", (e) => {
      if (!dragging) return;
      const st = stationAt(...cv.at(e));
      if (st && !s.lines[s.sel].stops.includes(st.id)) { extend(s.sel, st); lastTouched = st.id; }
    });
    ctx.on(document, "pointerup", () => (dragging = false));
    heldKeys(ctx, (k) => {
      if (k === " ") { s.paused = !s.paused; pauseSeg.set(s.paused ? 1 : 0); }
      if (s.choosing) { if (/^[1-3]$/.test(k)) rewardBox.querySelectorAll(".sv-opt")[+k - 1]?.click(); return; }
      if (/^[1-7]$/.test(k) && +k <= s.lines.length) { s.sel = +k - 1; render(); }
    });

    function weekReward() {
      s.choosing = true;
      const opts = [];
      if (s.lines.length < COLORS.length) opts.push(["Nowa linia", "Dodatkowy kolor do zbudowania.", () => s.lines.push({ color: COLORS[s.lines.length], stops: [] })]);
      opts.push(["Pociąg", "Drugi pociąg na najbardziej zatłoczonej linii.", () => {
        const busy = s.lines.map((l, i) => [i, l.stops.reduce((a, id) => a + byId(id).wait.length, 0)]).filter(([i]) => s.lines[i].stops.length > 1).sort((a, b) => b[1] - a[1])[0];
        if (busy) s.trains.push({ line: busy[0], pos: 0, dir: 1, load: [], wait: 0 });
      }]);
      opts.push(["Tunel", "Jeszcze jedno przejście pod rzeką.", () => s.tunnels++]);
      rewardBox.replaceChildren(el("h3", "", `Tydzień ${s.week}. Wybierz nagrodę`));
      opts.forEach(([n, t, fn], k) => {
        const b = button("", "sv-opt", () => { fn(); rewardBox.hidden = true; s.choosing = false; Sound.line(); render(); });
        b.append(el("b", "", n), el("p", "", t), el("kbd", "", k + 1));
        rewardBox.append(b);
      });
      rewardBox.hidden = false;
      Sound.win();
    }

    // pozycja pociągu: pos to ułamkowy indeks przystanku na linii
    const trainXY = (t) => {
      const l = s.lines[t.line], k = Math.floor(t.pos), f = t.pos - k;
      const a = byId(l.stops[Math.min(k, l.stops.length - 1)]), b = byId(l.stops[Math.min(k + 1, l.stops.length - 1)]);
      return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, Math.atan2(b.y - a.y, b.x - a.x)];
    };
    function atStation(t) {
      const l = s.lines[t.line], st = byId(l.stops[Math.round(t.pos)]);
      // wysiadanie: cel osiągnięty albo przesiadka
      const stay = [];
      for (const p of t.load) {
        if (p.shape === st.shape) { s.delivered++; Sound.place(1 + (s.delivered % 8)); }
        else if (p.alight === st.id) st.wait.push(p.shape);
        else stay.push(p);
      }
      t.load = stay;
      // wsiadanie: tylko jeśli ta linia przybliża do celu
      const keep = [];
      const cache = {};
      for (const shape of st.wait) {
        if (t.load.length >= CAP) { keep.push(shape); continue; }
        const dist = (cache[shape] ||= Metro.distances(s.stations, s.lines, shape));
        const here = dist.get(st.id) ?? Infinity;
        const best = l.stops.reduce((b, id) => ((dist.get(id) ?? Infinity) < (dist.get(b) ?? Infinity) ? id : b), st.id);
        if ((dist.get(best) ?? Infinity) < here) t.load.push({ shape, alight: best });
        else keep.push(shape);
      }
      st.wait = keep;
    }
    let uiT = 0;
    cv.loop((dt) => {
      if (!ctx.done && !s.paused && !s.choosing) step(dt);
      uiT += dt;
      if (uiT > 0.3) { uiT = 0; renderStats(); }
      draw();
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
      for (const t of s.trains) {
        const l = s.lines[t.line];
        if (l.stops.length < 2) continue;
        if (t.wait > 0) { t.wait -= dt; continue; }
        const k = Math.floor(t.pos), a = byId(l.stops[k]), b = byId(l.stops[Math.min(k + 1, l.stops.length - 1)]);
        const seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const before = t.pos;
        t.pos += (t.dir * 26 * dt) / seg;
        // dojazd do przystanku: postój i wymiana pasażerów
        const crossed = t.dir > 0 ? Math.floor(t.pos) > Math.floor(before) : Math.ceil(t.pos) < Math.ceil(before);
        if (t.pos >= l.stops.length - 1) { t.pos = l.stops.length - 1; t.dir = -1; atStation(t); t.wait = 0.6; }
        else if (t.pos <= 0) { t.pos = 0; t.dir = 1; atStation(t); t.wait = 0.6; }
        else if (crossed) { t.pos = Math.round(t.pos); atStation(t); t.wait = 0.5; }
      }
      for (const st of s.stations) {
        if (st.wait.length > MAXW) {
          st.over += dt / 14;
          if (st.over > 0.5) s.crowded = true;
          if (st.over >= 1) { renderStats(); return ctx.lose("Przepełniona stacja", `Dowiezieni pasażerowie: ${s.delivered}.`); }
        } else st.over = Math.max(0, st.over - dt / 20);
      }
      if (s.t > (s.week + 1) * 45) { s.week++; weekReward(); }
      if (!s.got50 && s.delivered >= 50) { s.got50 = true; ctx.achieve("pierwsze-kursy"); }
      if (s.delivered >= lv.target && !s.crowded && ctx.level.key === "medium") ctx.achieve("plynny-ruch");
      if (s.delivered >= lv.target && !s.crowded && ctx.level.key === "hard") ctx.achieve("dyspozytor");
      if (s.delivered >= lv.target) { renderStats(); ctx.win(`Tygodnie: ${s.week + 1}, stacje: ${s.stations.length}.`); }
    }
    function shape(kind, x, y, r, fill, stroke) {
      g.beginPath();
      if (kind === "circle") g.arc(x, y, r, 0, Math.PI * 2);
      if (kind === "square") g.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8);
      if (kind === "triangle") { g.moveTo(x, y - r * 1.1); g.lineTo(x + r * 1.05, y + r * 0.75); g.lineTo(x - r * 1.05, y + r * 0.75); g.closePath(); }
      if (kind === "star") for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.5 : r * 1.15; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      if (kind === "cross") { const q = r * 0.4; g.moveTo(x - q, y - r); g.lineTo(x + q, y - r); g.lineTo(x + q, y - q); g.lineTo(x + r, y - q); g.lineTo(x + r, y + q); g.lineTo(x + q, y + q); g.lineTo(x + q, y + r); g.lineTo(x - q, y + r); g.lineTo(x - q, y + q); g.lineTo(x - r, y + q); g.lineTo(x - r, y - q); g.lineTo(x - q, y - q); }
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1; g.stroke(); }
    }
    function draw() {
      g.fillStyle = "#f8f5ee";
      g.fillRect(0, 0, W, H);
      g.fillStyle = "#c5e3f6";
      g.beginPath(); g.moveTo(RX0, 0); g.bezierCurveTo(RX0 + 8, H * 0.35, RX0 - 6, H * 0.65, RX0 + 2, H); g.lineTo(RX1 + 2, H); g.bezierCurveTo(RX1 - 6, H * 0.65, RX1 + 8, H * 0.35, RX1, 0); g.fill();
      s.lines.forEach((l, li) => {
        if (l.stops.length < 2) return;
        g.strokeStyle = l.color;
        g.globalAlpha = li === s.sel ? 1 : 0.85;
        g.lineWidth = 2.2;
        g.lineCap = "round";
        g.lineJoin = "round";
        g.beginPath();
        l.stops.forEach((id, k) => { const o = byId(id), off = (li - 1) * 0.9; g[k ? "lineTo" : "moveTo"](o.x + off, o.y + off); });
        g.stroke();
        g.globalAlpha = 1;
        // końcówki linii jak w schemacie metra
        for (const id of [l.stops[0], l.stops[l.stops.length - 1]]) { const o = byId(id); g.fillStyle = l.color; g.fillRect(o.x - 1.2 + (li - 1) * 0.9, o.y - 5 + (li - 1) * 0.9, 2.4, 2.4); }
      });
      for (const t of s.trains) {
        const l = s.lines[t.line];
        if (l.stops.length < 2) continue;
        const [x, y, a] = trainXY(t);
        g.save();
        g.translate(x, y);
        g.rotate(a);
        g.fillStyle = l.color;
        g.beginPath(); g.roundRect(-4, -2.2, 8, 4.4, 1); g.fill();
        t.load.forEach((p, k) => shape(p.shape, -2.6 + (k % 3) * 2.6, k < 3 ? -0.9 : 0.9, 0.7, "#fff"));
        g.restore();
      }
      for (const st of s.stations) {
        shape(st.shape, st.x, st.y, 3, "#fff", "#212529");
        if (st.over > 0) {
          g.strokeStyle = "#e03131";
          g.lineWidth = 1.2;
          g.beginPath(); g.arc(st.x, st.y, 5.5, -Math.PI / 2, -Math.PI / 2 + st.over * Math.PI * 2); g.stroke();
        }
        st.wait.slice(0, 12).forEach((p, k) => shape(p, st.x + 5.5 + (k % 6) * 2.4, st.y - 2.4 + ((k / 6) | 0) * 2.6, 0.9, "#495057"));
      }
      if (s.paused) { g.fillStyle = "rgba(21,22,27,0.55)"; g.font = "700 7px Geist, system-ui, sans-serif"; g.textAlign = "center"; g.fillText("Pauza", W / 2, 10); }
      g.fillStyle = "#868e96";
      g.font = "600 4.5px Geist, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText(`Tydzień ${s.week + 1}`, 4, H - 4);
    }
    let lastKey = "";
    function renderStats() {
      deliveredEl.set(`${s.delivered} / ${lv.target}`, s.delivered / lv.target);
      ctx.progress(s.delivered / lv.target);
      const key = `${s.sel}|${s.lines.map((l) => l.stops.length).join()}|${s.tunnels}|${s.trains.length}`;
      if (key === lastKey) return;
      lastKey = key;
      linesEl.replaceChildren(...s.lines.map((l, i) => {
        const b = button("", `mt-line${i === s.sel ? " on" : ""}`, () => { s.sel = i; Sound.tap(); render(); });
        b.style.setProperty("--lc", l.color);
        b.append(el("i"), el("span", "", l.stops.length ? `${l.stops.length} ${plural(l.stops.length, "stacja", "stacje", "stacji")}, ${s.trains.filter((t) => t.line === i).length} poc.` : "pusta"), el("kbd", "", i + 1));
        return b;
      }));
      tunnelEl.textContent = `Tunele: ${usedTunnels()} z ${s.tunnels} w użyciu.`;
    }
    function render() { lastKey = ""; renderStats(); }
    render();
  },
});
