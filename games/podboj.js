// Podbój (w stylu Ryzyka): mapa regionów pogrupowanych w krainy. Tura: posiłki, ataki rzutami kośćmi, jedno umocnienie.
// Mapa na siatce GW × GH: cell[i] = numer regionu. Region: { owner, armies, land, cx, cy, adj:Set }.
const Conquest = (() => {
  const GW = 32, GH = 20;
  // najbliższy zarodek z lekkim szumem, żeby granice były nieregularne; działa dla dowolnego punktu, nie tylko środków pól
  function nearest(seeds, x, y) {
    let best = 0, bd = Infinity;
    for (let k = 0; k < seeds.length; k++) {
      const s = seeds[k], d = Math.hypot(s.x - x, s.y - y) + Math.sin(x * 1.7 + k) * 0.35 + Math.cos(y * 1.3 + k) * 0.35;
      if (d < bd) { bd = d; best = k; }
    }
    return best;
  }
  function generate(nRegions, players) {
    for (;;) {
      const seeds = [];
      for (let t = 0; t < 2000 && seeds.length < nRegions; t++) {
        const x = 1 + Math.random() * (GW - 2), y = 1 + Math.random() * (GH - 2);
        if (seeds.every((s) => Math.hypot(s.x - x, s.y - y) > 3.6)) seeds.push({ x, y });
      }
      if (seeds.length < nRegions) continue;
      // przypisanie pól do najbliższego zarodka, z lekkim szumem dla nieregularnych granic
      const cell = new Int16Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) {
        cell[i] = nearest(seeds, i % GW + 0.5, ((i / GW) | 0) + 0.5);
      }
      const regions = seeds.map((s, k) => ({ id: k, owner: -1, armies: 3, adj: new Set(), cx: 0, cy: 0, n: 0 }));
      for (let i = 0; i < GW * GH; i++) {
        const r = regions[cell[i]], x = i % GW, y = (i / GW) | 0;
        r.cx += x + 0.5; r.cy += y + 0.5; r.n++;
        if (x < GW - 1 && cell[i + 1] !== cell[i]) { r.adj.add(cell[i + 1]); regions[cell[i + 1]].adj.add(cell[i]); }
        if (y < GH - 1 && cell[i + GW] !== cell[i]) { r.adj.add(cell[i + GW]); regions[cell[i + GW]].adj.add(cell[i]); }
      }
      if (regions.some((r) => r.n < 5)) continue;
      regions.forEach((r) => { r.cx /= r.n; r.cy /= r.n; });
      // krainy: podział mapy na ćwiartki
      regions.forEach((r) => (r.land = (r.cx > GW / 2 ? 1 : 0) + (r.cy > GH / 2 ? 2 : 0)));
      const lands = [0, 1, 2, 3].map((l) => ({ id: l, regions: regions.filter((r) => r.land === l).map((r) => r.id) }));
      lands.forEach((l) => (l.bonus = Math.max(2, Math.round(l.regions.length / 2))));
      // losowy, równy przydział regionów
      shuffle(regions.map((r) => r.id)).forEach((id, k) => (regions[id].owner = k % players));
      return { cell, regions, lands, seeds };
    }
  }
  // posiłki: co najmniej 3, jeden na trzy regiony, plus premie za całe krainy
  function reinforcements(map, p) {
    const own = map.regions.filter((r) => r.owner === p).length;
    let n = Math.max(3, Math.floor(own / 3));
    for (const l of map.lands) if (l.regions.every((id) => map.regions[id].owner === p)) n += l.bonus;
    return n;
  }
  // jeden rzut: atakujący do 3 kości, obrońca do 2; porównanie od najwyższych
  function battle(att, def, rng = Math.random) {
    const roll = (n) => Array.from({ length: n }, () => 1 + Math.floor(rng() * 6)).sort((a, b) => b - a);
    const a = roll(Math.min(3, att - 1)), d = roll(Math.min(2, def));
    let la = 0, ld = 0;
    for (let k = 0; k < Math.min(a.length, d.length); k++) (a[k] > d[k] ? ld++ : la++);
    return { a, d, la, ld };
  }
  const api = { GW, GH, nearest, generate, reinforcements, battle, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Conquest;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "podboj"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, regions: 16, players: 3, aggr: 0.6 },
    { key: "medium", name: "Średni", points: 50, regions: 20, players: 3, aggr: 0.85 },
    { key: "hard", name: "Trudny", points: 100, regions: 24, players: 4, aggr: 1 },
  ],
  rules: [
    "Zdobądź wszystkie regiony. Każda tura ma trzy fazy: posiłki, ataki i jedno umocnienie.",
    "Posiłki: dostajesz co najmniej 3 armie, jedną na każde trzy regiony i premię za każdą całą krainę (lista krain i premii jest w panelu). Klikaj swoje regiony, żeby je rozstawić.",
    "Atak: kliknij swój region z co najmniej dwiema armiami, a potem sąsiedni region wroga. Atakujący rzuca do trzech kości, obrońca do dwóch, wyższe oczko wygrywa, remis broni obrońca. Zdobyty region zajmują armie atakujące.",
    "Umocnienie: raz na turę przenieś armie między dwoma sąsiednimi własnymi regionami. Potem zakończ turę.",
  ],
  achievements: [
    { id: "blitz", name: "Blitzkrieg", desc: "Podbij całą mapę na łatwym poziomie w najwyżej 12 turach.", points: 10 },
    { id: "zdobywca", name: "Zdobywca", desc: "Podbij całą mapę na średnim poziomie w najwyżej 18 turach.", points: 25 },
    { id: "imperator", name: "Imperator", desc: "Podbij całą mapę na trudnym poziomie w najwyżej 25 turach.", points: 50 },
  ],
  mount(board, ctx) {
    const { GW, GH } = Conquest;
    const lv = ctx.level;
    const map = Conquest.generate(lv.regions, lv.players);
    const R = map.regions;
    const COLORS = ["var(--c)", "#e03131", "#f59f00", "#2f9e44"];
    const RAW = ["#1982c4", "#e03131", "#f59f00", "#2f9e44"];
    const NAMES = ["Ty", "Czerwoni", "Żółci", "Zieloni"];
    const s = { hover: -1, phase: "reinforce", pool: Conquest.reinforcements(map, 0), sel: -1, turn: 1, busy: false, dice: null, fortified: false, alive: [true, true, true, true].slice(0, lv.players) };
    Conquest.last = { map, s };
    const S = 5, W = GW * S, H = GH * S;
    const cv = canvasGame(board, ctx, W, H, { max: 100 });
    const { g, theme } = cv;
    const LANDS = ["Wyżyna", "Puszcza", "Stepy", "Góry"];
    const stepsEl = el("div", "cq-steps");
    const phaseEl = el("div", "cq-phase");
    const diceEl = el("div", "cq-dice");
    const playersEl = el("div", "cq-players");
    const landsEl = el("div", "cq-lands");
    const actBtn = button("", "btn wide", () => nextPhase());
    const allBtn = button("Atakuj do skutku", "btn-ghost wide", () => attackAll());
    ctx.panel.append(panelBlock("", stepsEl, phaseEl, actBtn, allBtn, diceEl), panelBlock("Gracze", playersEl), panelBlock("Krainy", landsEl));
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };
    const own = (p) => R.filter((r) => r.owner === p);

    function regionAt(e) {
      const [x, y] = cv.at(e);
      const cx = Math.min(GW - 1, Math.max(0, (x / S) | 0)), cy = Math.min(GH - 1, Math.max(0, (y / S) | 0));
      return R[map.cell[cy * GW + cx]];
    }
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done || s.busy) return;
      e.preventDefault();
      const r = regionAt(e);
      if (s.phase === "reinforce") {
        if (r.owner !== 0 || s.pool <= 0) return Sound.error();
        const n = e.shiftKey ? Math.min(5, s.pool) : 1;
        r.armies += n;
        s.pool -= n;
        Sound.place(4);
        if (!s.pool) s.phase = "attack";
        return render();
      }
      if (s.phase === "attack") {
        if (r.owner === 0 && r.armies > 1) { s.sel = r.id; Sound.tap(); return render(); }
        if (s.sel >= 0 && r.owner !== 0 && R[s.sel].adj.has(r.id)) return attack(R[s.sel], r);
        s.sel = -1;
        return render();
      }
      if (s.phase === "fortify") {
        if (s.fortified) return;
        if (r.owner === 0 && s.sel < 0 && r.armies > 1) { s.sel = r.id; return render(); }
        if (s.sel >= 0 && r.owner === 0 && R[s.sel].adj.has(r.id)) {
          const moved = Math.ceil((R[s.sel].armies - 1) / (e.shiftKey ? 2 : 1));
          R[s.sel].armies -= moved;
          r.armies += moved;
          s.fortified = true;
          s.sel = -1;
          Sound.line();
          return render();
        }
        s.sel = -1;
        render();
      }
    });
    function attack(a, d, quiet = false) {
      if (a.armies < 2 || a.owner === d.owner) return false;
      const res = Conquest.battle(a.armies, d.armies);
      a.armies -= res.la;
      d.armies -= res.ld;
      s.dice = { ...res, who: a.owner };
      s.fx?.push({ kind: "hit", x: d.lx, y: d.ly, t: 0, life: 0.35 });
      if (!quiet) Sound.place(res.ld > res.la ? 7 : 2);
      if (d.armies <= 0) {
        const loser = d.owner;
        d.owner = a.owner;
        s.fx?.push({ kind: "ring", x: d.lx, y: d.ly, t: 0, life: 0.7, color: RAW[a.owner] });
        const move = Math.max(res.a.length, Math.min(a.armies - 1, Math.ceil(a.armies / 2) + 1));
        d.armies = move;
        a.armies -= move;
        if (a.owner === 0) s.sel = a.armies > 1 ? a.id : -1;
        Sound.line();
        if (!own(loser).length) { s.alive[loser] = false; ctx.toast(`${NAMES[loser]} zostali pokonani`); }
        checkEnd();
      }
      render();
      return true;
    }
    function attackAll() {
      if (s.phase !== "attack" || s.sel < 0) return;
      const a = R[s.sel];
      const targets = [...a.adj].map((i) => R[i]).filter((r) => r.owner !== 0);
      const d = targets.sort((x, y) => x.armies - y.armies)[0];
      if (!d) return;
      while (a.armies > 1 && d.owner !== 0 && !ctx.done) attack(a, d, true);
      Sound.place(7);
      render();
    }
    function checkEnd() {
      if (own(0).length === R.length) {
        const k = ctx.level.key;
        if (k === "easy" && s.turn <= 12) ctx.achieve("blitz");
        if (k === "medium" && s.turn <= 18) ctx.achieve("zdobywca");
        if (k === "hard" && s.turn <= 25) ctx.achieve("imperator");
      }
      if (own(0).length === R.length) { ctx.win(`Cała mapa w ${s.turn} ${plural(s.turn, "turę", "tury", "tur")}.`); return true; }
      if (!own(0).length) { ctx.lose("Podbity", "Straciłeś ostatni region."); return true; }
      return false;
    }
    function nextPhase() {
      if (ctx.done || s.busy) return;
      if (s.phase === "reinforce") {
        // nierozdane posiłki trafiają na najbardziej zagrożony region
        if (s.pool) { const f = frontier(0)[0] || own(0)[0]; f.armies += s.pool; s.pool = 0; }
        s.phase = "attack";
      } else if (s.phase === "attack") s.phase = "fortify";
      else return aiTurns();
      s.sel = -1;
      Sound.tap();
      render();
    }
    // regiony gracza p graniczące z wrogiem, od najbardziej zagrożonego
    const threat = (r) => [...r.adj].reduce((t, i) => t + (R[i].owner !== r.owner ? R[i].armies : 0), 0);
    const frontier = (p) => own(p).filter((r) => threat(r) > 0).sort((a, b) => threat(b) - r0(b) - (threat(a) - r0(a)));
    const r0 = (r) => r.armies;
    function aiPlay(p) {
      let pool = Conquest.reinforcements(map, p);
      const front = frontier(p);
      // posiłki: na granicę, gdzie najbliżej do zdobycia słabego sąsiada
      while (pool > 0 && front.length) {
        const r = front.reduce((b, x) => (Math.min(...[...x.adj].filter((i) => R[i].owner !== p).map((i) => R[i].armies)) - x.armies < Math.min(...[...b.adj].filter((i) => R[i].owner !== p).map((i) => R[i].armies)) - b.armies ? x : b));
        r.armies++;
        pool--;
      }
      // ataki z przewagą; gracz jest preferowanym celem na wyższych poziomach
      for (let guard = 0; guard < 40; guard++) {
        const moves = [];
        for (const a of own(p)) for (const i of a.adj) {
          const d = R[i];
          if (d.owner === p || a.armies < 3) continue;
          const edge = a.armies - d.armies + (d.owner === 0 ? 1 : 0) * lv.aggr;
          if (edge >= 2 - lv.aggr) moves.push([edge, a, d]);
        }
        if (!moves.length) break;
        moves.sort((x, y) => y[0] - x[0]);
        const [, a, d] = moves[0];
        while (a.armies > 2 && d.owner !== p) attack(a, d, true);
        if (ctx.done) return;
      }
      // umocnienie: z najsilniejszego regionu wewnętrznego na granicę
      const inner = own(p).filter((r) => threat(r) === 0 && r.armies > 1).sort((a, b) => b.armies - a.armies)[0];
      if (inner) {
        const to = [...inner.adj].map((i) => R[i]).find((r) => r.owner === p && threat(r) > 0);
        if (to) { to.armies += inner.armies - 1; inner.armies = 1; }
      }
    }
    function aiTurns() {
      s.busy = true;
      s.phase = "ai";
      s.sel = -1;
      render();
      let delay = 200;
      for (let p = 1; p < lv.players; p++) {
        wait(() => {
          if (ctx.done || !s.alive[p]) return;
          s.aiNow = p;
          aiPlay(p);
          Sound.place(2);
          render();
        }, delay);
        delay += 650;
      }
      wait(() => {
        if (ctx.done) return;
        s.aiNow = -1;
        s.turn++;
        s.busy = false;
        s.fortified = false;
        s.phase = "reinforce";
        s.pool = Conquest.reinforcements(map, 0);
        if (!checkEnd()) { ctx.toast(`Tura ${s.turn}: ${s.pool} ${plural(s.pool, "nowa armia", "nowe armie", "nowych armii")}`); render(); }
      }, delay);
    }

    // --- mapa rysowana co piksel: płynne granice, morze wokół, cień przy krawędziach; liczona raz, przemalowywana przy zmianie stanu ---
    const PX = 5, MW = W * PX, MH = H * PX, U = PX * S;
    const lab = new Int16Array(MW * MH);
    // to samo co Conquest.nearest, ale szybciej: sin(a + k) = sin a·cos k + cos a·sin k, więc sinusy liczone raz na kolumnę i wiersz
    const sd = map.seeds, ck = sd.map((_, k) => Math.cos(k)), sk = sd.map((_, k) => Math.sin(k));
    const colS = new Float32Array(MW), colC = new Float32Array(MW), rowS = new Float32Array(MH), rowC = new Float32Array(MH);
    for (let x = 0; x < MW; x++) { const ux = (x + 0.5) / U; colS[x] = Math.sin(ux * 1.7); colC[x] = Math.cos(ux * 1.7); }
    for (let y = 0; y < MH; y++) { const uy = (y + 0.5) / U; rowS[y] = Math.sin(uy * 1.3); rowC[y] = Math.cos(uy * 1.3); }
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const ux = (x + 0.5) / U, uy = (y + 0.5) / U;
      const edge = Math.min(ux, uy, GW - ux, GH - uy) + Math.sin(ux * 0.9 + uy * 0.4) * 0.3 + Math.sin(uy * 1.3 - ux * 0.7) * 0.25;
      if (edge < 0.7) { lab[y * MW + x] = -1; continue; }
      let best = 0, bd = Infinity;
      for (let k = 0; k < sd.length; k++) {
        const dx = sd[k].x - ux, dy = sd[k].y - uy;
        const d = Math.sqrt(dx * dx + dy * dy) + (colS[x] * ck[k] + colC[x] * sk[k]) * 0.35 + (rowC[y] * ck[k] - rowS[y] * sk[k]) * 0.35;
        if (d < bd) { bd = d; best = k; }
      }
      lab[y * MW + x] = best;
    }
    // odległość piksela od najbliższej granicy (BFS od pikseli granicznych), rodzaj granicy:
    // 1 między regionami, 2 między krainami, 3 brzeg od strony lądu, 4 brzeg od strony morza, 5 pogrubienie granicy krain
    const NB = [0, 0, 0, 0];
    // sąsiedzi piksela w NB; zwraca ich liczbę
    const N4 = (i) => { const x = i % MW; let n = 0; if (x > 0) NB[n++] = i - 1; if (x < MW - 1) NB[n++] = i + 1; if (i >= MW) NB[n++] = i - MW; if (i < MW * MH - MW) NB[n++] = i + MW; return n; };
    const dist = new Uint8Array(MW * MH).fill(255), kind = new Uint8Array(MW * MH), queue = new Int32Array(MW * MH);
    let qn = 0;
    for (let i = 0; i < MW * MH; i++) {
      const l = lab[i];
      for (let q = 0, n = N4(i); q < n; q++) {
        const j = NB[q], m = lab[j];
        if (m === l) continue;
        const k = l < 0 ? 4 : m < 0 ? 3 : R[m].land !== R[l].land ? 2 : 1;
        if (k > kind[i]) kind[i] = k;
        if (dist[i]) { dist[i] = 0; queue[qn++] = i; }
      }
    }
    for (let q = 0; q < qn; q++) {
      const i = queue[q], d = dist[i] + 1;
      if (d > 250) continue;
      for (let q2 = 0, n = N4(i); q2 < n; q2++) { const j = NB[q2]; if (dist[j] > d && lab[j] === lab[i]) { dist[j] = d; queue[qn++] = j; } }
    }
    for (let i = 0; i < MW * MH; i++) if (kind[i] === 2) for (let q = 0, n = N4(i); q < n; q++) { const j = NB[q]; if (lab[j] >= 0 && !kind[j]) kind[j] = 5; }
    // znacznik armii w punkcie najdalszym od granic regionu
    R.forEach((r) => { r.best = -1; r.lx = r.cx * S; r.ly = r.cy * S; });
    for (let i = 0; i < MW * MH; i++) { const l = lab[i]; if (l >= 0 && dist[i] > R[l].best) { R[l].best = dist[i]; R[l].lx = (i % MW + 0.5) / PX; R[l].ly = ((i / MW) | 0) / PX; } }
    const off = document.createElement("canvas");
    off.width = MW;
    off.height = MH;
    const og = off.getContext("2d");
    const img = og.createImageData(MW, MH);
    const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
    const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
    const WHITE = [255, 255, 255];
    // drobne ziarno i łagodne falowanie jasności, żeby ląd nie był płaski
    const noise = new Float32Array(MW * MH);
    for (let i = 0; i < MW * MH; i++) { const x = i % MW, y = (i / MW) | 0; noise[i] = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 * 0.05 + Math.sin(x * 0.045) * Math.sin(y * 0.06 + x * 0.01) * 0.035; }
    const actionable = (r) => (s.phase === "reinforce" && r.owner === 0) || ((s.phase === "attack" || s.phase === "fortify") && r.owner === 0 && r.armies > 1);
    const target = (r) => s.sel >= 0 && R[s.sel].adj.has(r.id) && ((s.phase === "attack" && r.owner !== 0) || (s.phase === "fortify" && r.owner === 0 && !s.fortified));
    let paintedKey = "";
    function paint() {
      const cols = R.map((r) => {
        let t = 0.42;
        if (r.id === s.sel) t = 0.06;
        else if (target(r)) t = r.id === s.hover ? 0.12 : 0.24;
        else if (r.id === s.hover && !s.busy && actionable(r)) t = 0.28;
        return mix(rgb(RAW[r.owner]), WHITE, t);
      });
      const d = img.data;
      const SEA = [134, 196, 232], DEEP = [92, 156, 208], FOAM = [228, 244, 252];
      for (let i = 0; i < MW * MH; i++) {
        const l = lab[i], k = kind[i], n = noise[i];
        let c;
        if (l < 0) {
          const dd = dist[i];
          c = dd < 3 ? FOAM : mix(SEA, DEEP, Math.min(1, dd / 45));
          if (dd >= 3 && dd % 16 === 8 && dd < 50) c = mix(c, WHITE, 0.22);
        } else {
          const base = cols[l];
          if (k === 2 || k === 5) c = [44, 48, 60];
          else if (k === 3) c = mix(base, [0, 0, 0], 0.42);
          else if (k === 1) c = mix(base, WHITE, 0.6);
          else c = mix(base, [20, 24, 40], (Math.max(0, 8 - dist[i]) / 8) * 0.16);
        }
        const o = i * 4;
        d[o] = c[0] * (1 - n); d[o + 1] = c[1] * (1 - n); d[o + 2] = c[2] * (1 - n); d[o + 3] = 255;
      }
      og.putImageData(img, 0, 0);
    }
    ctx.on(cv.cv, "pointermove", (e) => {
      const r = regionAt(e);
      if (r.id === s.hover) return;
      s.hover = r.id;
      cv.cv.style.cursor = !s.busy && (actionable(r) || target(r)) ? "pointer" : "default";
    });
    ctx.on(cv.cv, "pointerleave", () => (s.hover = -1));
    s.fx = [];
    let tNow = 0;
    cv.loop((dt) => { tNow += dt; draw(dt); });
    // zakrzywiona strzałka od regionu a do b
    function arrow(a, b, color, w) {
      const ax = a.lx, ay = a.ly, bx = b.lx, by = b.ly, mx = (ax + bx) / 2 - (by - ay) * 0.18, my = (ay + by) / 2 + (bx - ax) * 0.18;
      const ang = Math.atan2(by - my, bx - mx), ex = bx - Math.cos(ang) * 6, ey = by - Math.sin(ang) * 6;
      g.strokeStyle = color;
      g.fillStyle = color;
      g.lineWidth = w;
      g.lineCap = "round";
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
      g.beginPath(); g.moveTo(ex + Math.cos(ang) * 2.4, ey + Math.sin(ang) * 2.4); g.lineTo(ex + Math.cos(ang + 2.4) * 2.2, ey + Math.sin(ang + 2.4) * 2.2); g.lineTo(ex + Math.cos(ang - 2.4) * 2.2, ey + Math.sin(ang - 2.4) * 2.2); g.fill();
    }
    function draw(dt) {
      const key = `${R.map((r) => r.owner).join()}|${s.sel}|${s.phase}|${s.hover}|${s.fortified}|${s.busy}`;
      if (key !== paintedKey) { paintedKey = key; paint(); }
      g.drawImage(off, 0, 0, W, H);
      if (s.sel >= 0) for (const i of R[s.sel].adj) {
        const r = R[i];
        if (s.phase === "attack" && r.owner !== 0) arrow(R[s.sel], r, i === s.hover ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)", i === s.hover ? 1 : 0.7);
        if (s.phase === "fortify" && r.owner === 0 && !s.fortified) arrow(R[s.sel], r, "rgba(255,212,59,0.9)", 0.8);
      }
      // efekty: błysk trafienia i fala po zdobyciu regionu
      s.fx = s.fx.filter((f) => (f.t += dt) < f.life);
      for (const f of s.fx) {
        const k = f.t / f.life;
        g.globalAlpha = 1 - k;
        if (f.kind === "ring") { g.strokeStyle = f.color; g.lineWidth = 1.6 * (1 - k) + 0.3; g.beginPath(); g.arc(f.x, f.y, 4 + k * 16, 0, Math.PI * 2); g.stroke(); }
        if (f.kind === "hit") { g.fillStyle = "#fff"; g.beginPath(); g.arc(f.x, f.y, 3 + k * 6, 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;
      }
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (const r of R) {
        const x = r.lx, y = r.ly, sel = r.id === s.sel;
        const rad = (sel ? 4.5 + Math.sin(tNow * 6) * 0.25 : 3.9) + Math.min(1.2, r.armies / 40);
        g.fillStyle = "rgba(20,24,40,0.3)";
        g.beginPath(); g.ellipse(x, y + 1.1, rad, rad * 0.92, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = RAW[r.owner];
        g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x, y, rad - 1, 0, Math.PI * 2); g.fill();
        if (sel) { g.strokeStyle = "#fff"; g.lineWidth = 0.7; g.beginPath(); g.arc(x, y, rad + 1.3, 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = "#1d1f27";
        g.font = `700 ${r.armies > 99 ? 3.4 : 4.4}px Geist, system-ui, sans-serif`;
        g.fillText(r.armies, x, y + 0.35);
      }
      g.textBaseline = "alphabetic";
    }
    const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    const die = (v, cls) => { const d = el("span", `cq-die ${cls}`); for (let k = 0; k < 9; k++) d.append(el("i", PIPS[v].includes(k) ? "on" : "")); return d; };
    function render() {
      const PH = {
        reinforce: ["Posiłki", s.pool ? `Kliknij swój region, żeby dołożyć armię. Shift: pięć naraz.` : "Wszystkie armie rozstawione."],
        attack: ["Atak", s.sel >= 0 ? "Kliknij sąsiedni region wroga. Strzałki pokazują możliwe cele." : "Wybierz swój region z co najmniej dwiema armiami."],
        fortify: ["Umocnienie", s.fortified ? "Gotowe. Zakończ turę." : "Kliknij swój region, a potem sąsiedni własny: przeniesiesz tam armie (Shift: połowę)."],
        ai: ["Ruch rywali", s.aiNow > 0 ? `Ruszają ${NAMES[s.aiNow].toLowerCase()}…` : "Rywale planują…"],
      }[s.phase];
      stepsEl.replaceChildren(...["reinforce", "attack", "fortify"].map((k, i) => el("span", `cq-step${s.phase === k ? " on" : ""}${["reinforce", "attack", "fortify", "ai"].indexOf(s.phase) > i ? " done" : ""}`, ["Posiłki", "Atak", "Umocnienie"][i])));
      phaseEl.replaceChildren(el("p", "cq-turn", s.phase === "reinforce" && s.pool ? `+${s.pool}` : `Tura ${s.turn}`), el("p", "rl-small", PH[1]));
      phaseEl.firstChild.classList.toggle("pool", s.phase === "reinforce" && s.pool > 0);
      actBtn.textContent = { reinforce: "Przejdź do ataku", attack: "Przejdź do umocnienia", fortify: "Zakończ turę", ai: "Ruch rywali…" }[s.phase];
      actBtn.disabled = s.busy;
      allBtn.hidden = s.phase !== "attack";
      allBtn.disabled = s.sel < 0;
      diceEl.replaceChildren();
      if (s.dice) {
        const row = el("div", "cq-roll");
        const a = el("div", "cq-side"), d = el("div", "cq-side");
        a.style.setProperty("--pc", RAW[s.dice.who]);
        s.dice.a.forEach((v) => a.append(die(v, "att")));
        s.dice.d.forEach((v) => d.append(die(v, "def")));
        row.append(a, el("b", "", "vs"), d);
        diceEl.append(row, el("p", "rl-small", `Straty: atakujący ${s.dice.la}, obrońca ${s.dice.ld}.`));
      }
      playersEl.replaceChildren(...s.alive.map((alive, p) => {
        const d = el("div", `cq-player${alive ? "" : " out"}${s.aiNow === p ? " now" : ""}`);
        d.style.setProperty("--pc", RAW[p]);
        const regs = own(p), arm = regs.reduce((a, r) => a + r.armies, 0);
        const bar = el("span", "cq-share");
        bar.style.setProperty("--f", regs.length / R.length);
        d.append(el("i"), el("b", "", NAMES[p]), el("em", "", alive ? `${regs.length} reg. · ${arm} arm.` : "pokonani"), bar);
        return d;
      }));
      landsEl.replaceChildren(...map.lands.map((l) => {
        const d = el("div", "cq-land");
        const dots = el("span", "cq-dots");
        l.regions.forEach((id) => { const i = el("i"); i.style.background = RAW[R[id].owner]; dots.append(i); });
        const mine = l.regions.every((id) => R[id].owner === 0);
        d.classList.toggle("mine", mine);
        d.append(el("b", "", LANDS[l.id]), dots, el("em", "", `+${l.bonus}`));
        return d;
      }));
      ctx.progress(own(0).length / R.length);
    }
    render();
  },
});
