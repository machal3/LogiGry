// Podbój (w stylu Ryzyka): mapa regionów w czterech krainach. Tura: posiłki, ataki rzutami kośćmi, jedno umocnienie.
// Stolice mają mury, góry bronią się trzema kośćmi, zdobycze dają medale wymieniane na armie.
// Logika (mapa, bitwy, szanse, ruchy komputera) działa też w node: testy w tests/big.test.js.
const Conquest = (() => {
  const TERRAIN = ["Wyżyna", "Puszcza", "Stepy", "Góry"];
  const MOUNTAINS = 3, CAPITAL_BONUS = 2, MAX_MEDALS = 5, TRADE = [4, 6, 8, 10, 12, 15];
  const tradeValue = (k) => (k < TRADE.length ? TRADE[k] : 15 + (k - TRADE.length + 1) * 3);

  // Mapa rastrowa: GW × GH kratek po RP pikseli. lab[i] = region piksela (−1 morze), dist = odległość od granicy,
  // kind = rodzaj najbliższej granicy: 1 między regionami, 2 między krainami, 3 brzeg od lądu, 4 brzeg od morza.
  function generate(nRegions, players, { GW = 32, GH = 20, RP = 28, rng = Math.random } = {}) {
    const MW = GW * RP, MH = GH * RP, N = MW * MH;
    const lab = new Int16Array(N), dist = new Uint8Array(N), kind = new Uint8Array(N), queue = new Int32Array(N);
    // sin(a + k) = sin a·cos k + cos a·sin k: sinusy szumu granic liczone raz na kolumnę i wiersz
    const colU = new Float32Array(MW), colS = new Float32Array(MW), colC = new Float32Array(MW);
    const rowU = new Float32Array(MH), rowS = new Float32Array(MH), rowC = new Float32Array(MH);
    for (let x = 0; x < MW; x++) { const u = (x + 0.5) / RP; colU[x] = u; colS[x] = Math.sin(u * 1.7); colC[x] = Math.cos(u * 1.7); }
    for (let y = 0; y < MH; y++) { const u = (y + 0.5) / RP; rowU[y] = u; rowS[y] = Math.sin(u * 1.3); rowC[y] = Math.cos(u * 1.3); }
    for (;;) {
      const seeds = [];
      for (let t = 0; t < 3000 && seeds.length < nRegions; t++) {
        const x = 1.2 + rng() * (GW - 2.4), y = 1.2 + rng() * (GH - 2.4);
        if (seeds.every((p) => Math.hypot(p.x - x, p.y - y) > 3.6)) seeds.push({ x, y });
      }
      if (seeds.length < nRegions) continue;
      const K = seeds.length, sx = seeds.map((p) => p.x), sy = seeds.map((p) => p.y);
      const ck = seeds.map((_, k) => Math.cos(k)), sk = seeds.map((_, k) => Math.sin(k));
      // najbliższy zarodek z szumem (nieregularne granice); sinusy szumu podane z zewnątrz
      const nearest = (ux, uy, cand, n, s1, c1, s2, c2) => {
        let best = 0, bd = Infinity;
        for (let q = 0; q < n; q++) {
          const k = cand[q], dx = sx[k] - ux, dy = sy[k] - uy;
          const d = Math.sqrt(dx * dx + dy * dy) + (s1 * ck[k] + c1 * sk[k]) * 0.35 + (c2 * ck[k] - s2 * sk[k]) * 0.35;
          if (d < bd) { bd = d; best = k; }
        }
        return best;
      };
      // najpierw zgrubnie (4 piksele na kratkę), potem każdy piksel sprawdza tylko regiony z sąsiedztwa swojego zgrubnego piksela
      const CR = 4, CW = GW * CR, CH = GH * CR, all = seeds.map((_, k) => k), coarse = new Int16Array(CW * CH);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const ux = (x + 0.5) / CR, uy = (y + 0.5) / CR;
        coarse[y * CW + x] = nearest(ux, uy, all, K, Math.sin(ux * 1.7), Math.cos(ux * 1.7), Math.sin(uy * 1.3), Math.cos(uy * 1.3));
      }
      const cand = new Int16Array(CW * CH * 9), candN = new Uint8Array(CW * CH);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const c = y * CW + x;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= CW || yy >= CH) continue;
          const l = coarse[yy * CW + xx];
          let seenL = false;
          for (let q = 0; q < candN[c]; q++) if (cand[c * 9 + q] === l) seenL = true;
          if (!seenL) cand[c * 9 + candN[c]++] = l;
        }
      }
      const one = new Int16Array(9);
      for (let y = 0; y < MH; y++) {
        const uy = rowU[y], cy = ((uy * CR) | 0) * CW;
        for (let x = 0; x < MW; x++) {
          const ux = colU[x], i = y * MW + x;
          const rim = Math.min(ux, uy, GW - ux, GH - uy);
          if (rim < 1.3 && rim + Math.sin(ux * 0.9 + uy * 0.4) * 0.3 + Math.sin(uy * 1.3 - ux * 0.7) * 0.25 < 0.7) { lab[i] = -1; continue; }
          const c = cy + ((ux * CR) | 0), n = candN[c];
          if (n === 1) { lab[i] = cand[c * 9]; continue; }
          for (let q = 0; q < n; q++) one[q] = cand[c * 9 + q];
          lab[i] = nearest(ux, uy, one, n, colS[x], colC[x], rowS[y], rowC[y]);
        }
      }
      const regions = seeds.map((_, k) => ({ id: k, owner: -1, armies: 3, adj: new Set(), n: 0, cx: 0, cy: 0, land: 0, capital: false, lx: 0, ly: 0 }));
      // sąsiedzi: regiony, które stykają się granicą długą na co najmniej pół kratki
      const touch = new Map();
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        const i = y * MW + x, l = lab[i];
        if (l < 0) continue;
        const r = regions[l];
        r.n++; r.cx += x; r.cy += y;
        const mr = x < MW - 1 ? lab[i + 1] : -1, md = y < MH - 1 ? lab[i + MW] : -1;
        if (mr >= 0 && mr !== l) { const key = Math.min(l, mr) * 256 + Math.max(l, mr); touch.set(key, (touch.get(key) || 0) + 1); }
        if (md >= 0 && md !== l) { const key = Math.min(l, md) * 256 + Math.max(l, md); touch.set(key, (touch.get(key) || 0) + 1); }
      }
      for (const [key, n] of touch) if (n >= RP * 0.6) { const a = (key / 256) | 0, b = key % 256; regions[a].adj.add(b); regions[b].adj.add(a); }
      if (regions.some((r) => r.n < 5 * RP * RP)) continue;
      const seen = new Set([0]), q0 = [0];
      for (let q = 0; q < q0.length; q++) for (const a of regions[q0[q]].adj) if (!seen.has(a)) { seen.add(a); q0.push(a); }
      if (seen.size < K) continue;
      // krainy: ćwiartki mapy, każda z innym krajobrazem
      regions.forEach((r) => { r.cx = (r.cx / r.n + 0.5) / RP; r.cy = (r.cy / r.n + 0.5) / RP; r.land = (r.cx > GW / 2 ? 1 : 0) + (r.cy > GH / 2 ? 2 : 0); });
      const kinds = [0, 1, 2, 3].map((k) => [rng(), k]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      const lands = [0, 1, 2, 3].map((l) => ({ id: l, kind: kinds[l], name: TERRAIN[kinds[l]], regions: regions.filter((r) => r.land === l).map((r) => r.id) }));
      if (lands.some((l) => l.regions.length < 2)) continue;
      lands.forEach((l) => (l.bonus = Math.max(2, Math.round(l.regions.length / 2)) + (l.kind === MOUNTAINS ? 1 : 0)));
      // odległość od granic (BFS od pikseli granicznych) i rodzaj najbliższej granicy
      dist.fill(255);
      kind.fill(0);
      let qn = 0;
      const landOf = Int8Array.from(regions, (r) => r.land);
      for (let y = 0, i = 0; y < MH; y++) for (let x = 0; x < MW; x++, i++) {
        const l = lab[i];
        let k = 0;
        // rodzaj granicy z sąsiadem m (0, gdy ten sam region)
        const see = (m) => { if (m !== l) { const kk = l < 0 ? 4 : m < 0 ? 3 : landOf[m] !== landOf[l] ? 2 : 1; if (kk > k) k = kk; } };
        if (x > 0) see(lab[i - 1]);
        if (x < MW - 1) see(lab[i + 1]);
        if (y > 0) see(lab[i - MW]);
        if (y < MH - 1) see(lab[i + MW]);
        if (k) { dist[i] = 0; kind[i] = k; queue[qn++] = i; }
      }
      for (let q = 0; q < qn; q++) {
        const i = queue[q], d = dist[i] + 1, l = lab[i], x = i % MW;
        if (d > 254) continue;
        const go = (j) => { if (lab[j] === l && dist[j] > d) { dist[j] = d; kind[j] = kind[i]; queue[qn++] = j; } };
        if (x > 0) go(i - 1);
        if (x < MW - 1) go(i + 1);
        if (i >= MW) go(i - MW);
        if (i < N - MW) go(i + MW);
      }
      // znacznik armii w punkcie najdalszym od granic (jednostki płótna: 5 na kratkę)
      const far = regions.map(() => -1);
      for (let i = 0; i < N; i++) {
        const l = lab[i];
        if (l >= 0 && dist[i] > far[l]) { far[l] = dist[i]; regions[l].lx = ((i % MW) + 0.5) / RP * 5; regions[l].ly = (((i / MW) | 0) + 0.5) / RP * 5; }
      }
      // równy, losowy przydział regionów i stolice jak najdalej od siebie
      regions.map((r) => [rng(), r]).sort((a, b) => a[0] - b[0]).forEach(([, r], k) => (r.owner = k % players));
      const caps = [];
      for (let p = 0; p < players; p++) {
        let best = null, bs = -1;
        for (const r of regions) {
          if (r.owner !== p) continue;
          const sc = caps.length ? Math.min(...caps.map((c) => Math.hypot(c.cx - r.cx, c.cy - r.cy))) + rng() : rng();
          if (sc > bs) { bs = sc; best = r; }
        }
        best.capital = true;
        best.armies += 2;
        caps.push(best);
      }
      return { GW, GH, RP, MW, MH, lab, dist, kind, regions, lands, seeds };
    }
  }

  function newGame(lv, opts) {
    const map = generate(lv.regions, lv.players, opts), zero = () => Array(lv.players).fill(0);
    return { map, R: map.regions, players: lv.players, alive: Array(lv.players).fill(true), medals: zero(), trades: zero(), conq: zero(), lost: 0 };
  }
  const owned = (G, p) => G.R.filter((r) => r.owner === p);
  const enemies = (G, r) => [...r.adj].map((i) => G.R[i]).filter((e) => e.owner !== r.owner);
  // modyfikatory obrony regionu: góry rzucają do 3 kości, stolica dodaje 1 do najwyższej kości obrońcy
  const mods = (G, r) => ({ def3: G.map.lands[r.land].kind === MOUNTAINS, wall: r.capital });

  // posiłki: co najmniej 3, jeden na trzy regiony, premie za całe krainy i za każdą stolicę
  function reinforcements(G, p, extra = 0) {
    const own = owned(G, p), base = Math.max(3, Math.floor(own.length / 3));
    const lands = G.map.lands.filter((l) => l.regions.every((id) => G.R[id].owner === p));
    const caps = own.filter((r) => r.capital).length;
    const total = Math.max(1, base + lands.reduce((s, l) => s + l.bonus, 0) + caps * CAPITAL_BONUS + extra);
    return { base, lands, caps, capBonus: caps * CAPITAL_BONUS, total };
  }

  // porównanie kości od najwyższych; remis broni obrońca, mur stolicy dodaje 1 do jego najwyższej kości
  function compare(a, d, wall) {
    let la = 0, ld = 0;
    for (let k = 0; k < Math.min(a.length, d.length); k++) (a[k] > d[k] + (k === 0 && wall ? 1 : 0) ? ld++ : la++);
    return [la, ld];
  }
  // jeden rzut: atakujący do 3 kości, obrońca do 2 (w górach do 3)
  function battle(att, def, rng = Math.random, m = {}) {
    const roll = (n) => Array.from({ length: n }, () => 1 + Math.floor(rng() * 6)).sort((a, b) => b - a);
    const a = roll(Math.min(3, att - 1)), d = roll(Math.min(m.def3 ? 3 : 2, def));
    const [la, ld] = compare(a, d, m.wall);
    return { a, d, la, ld, wall: !!m.wall };
  }
  // rozkład strat w jednym rzucie: [[la, ld, prawdopodobieństwo]]
  const OUT = new Map();
  function outcomes(na, nd, wall) {
    const key = na * 10 + nd + (wall ? 100 : 0);
    if (OUT.has(key)) return OUT.get(key);
    const tally = new Map(), n = na + nd, total = 6 ** n, v = new Array(n);
    for (let c = 0; c < total; c++) {
      let x = c;
      for (let k = 0; k < n; k++) { v[k] = 1 + (x % 6); x = (x / 6) | 0; }
      const [la, ld] = compare(v.slice(0, na).sort((p, q) => q - p), v.slice(na).sort((p, q) => q - p), wall);
      tally.set(la * 4 + ld, (tally.get(la * 4 + ld) || 0) + 1);
    }
    const out = [...tally].map(([k, c]) => [(k / 4) | 0, k % 4, c / total]);
    OUT.set(key, out);
    return out;
  }
  // dokładna szansa zdobycia regionu, gdy atakuje się do skutku (aż zostanie jedna armia)
  const MEMO = new Map();
  function odds(att, def, m = {}) {
    const maxD = m.def3 ? 3 : 2, wall = !!m.wall, mk = maxD * 2 + (wall ? 1 : 0);
    if (!MEMO.has(mk)) MEMO.set(mk, new Map());
    const memo = MEMO.get(mk);
    const P = (a, d) => {
      if (d <= 0) return 1;
      if (a <= 1) return 0;
      const key = a * 100000 + d;
      let p = memo.get(key);
      if (p !== undefined) return p;
      p = 0;
      for (const [la, ld, q] of outcomes(Math.min(3, a - 1), Math.min(maxD, d), wall)) p += q * P(a - la, d - ld);
      memo.set(key, p);
      return p;
    };
    return P(Math.min(att, 400), Math.min(def, 400));
  }

  // jeden rzut ataku z regionu a na d; po zdobyciu armie wkraczają (wszystkie, gdy za plecami nie ma już wroga)
  function attack(G, a, d, rng = Math.random) {
    const res = battle(a.armies, d.armies, rng, mods(G, d));
    a.armies -= res.la;
    d.armies -= res.ld;
    if (d.armies > 0) return res;
    const p = a.owner, loser = d.owner;
    d.owner = p;
    const left = enemies(G, a).length > 0;
    const want = left ? Math.max(res.a.length, Math.ceil(a.armies / 2) + 1) : a.armies - 1;
    d.armies = Math.max(1, Math.min(a.armies - 1, want));
    a.armies -= d.armies;
    G.conq[p]++;
    if (loser === 0) G.lost++;
    Object.assign(res, { captured: true, loser, capital: d.capital });
    if (!owned(G, loser).length) {
      G.alive[loser] = false;
      G.medals[p] = Math.min(MAX_MEDALS, G.medals[p] + G.medals[loser]);
      G.medals[loser] = 0;
      res.eliminated = loser;
    }
    return res;
  }
  function trade(G, p) {
    if (G.medals[p] < 3) return 0;
    G.medals[p] -= 3;
    return tradeValue(G.trades[p]++);
  }
  // koniec tury: medal za co najmniej jeden zdobyty region
  function endTurn(G, p) {
    const got = G.conq[p] > 0 && G.medals[p] < MAX_MEDALS;
    if (got) G.medals[p]++;
    G.conq[p] = 0;
    return got;
  }
  // własne regiony osiągalne z r przez własne terytorium
  function reachable(G, r) {
    const seen = new Set([r.id]), q = [r];
    for (let k = 0; k < q.length; k++) for (const i of q[k].adj) if (!seen.has(i) && G.R[i].owner === r.owner) { seen.add(i); q.push(G.R[i]); }
    seen.delete(r.id);
    return [...seen].map((i) => G.R[i]);
  }
  const threat = (G, r) => enemies(G, r).reduce((t, e) => t + e.armies, 0);

  // Tura komputera jako generator: każdy krok zmienia stan i oddaje zdarzenie do pokazania.
  // lv: aggr (0..1, chęć ataku), smart (krainy i stolice w planie), focus (premia za atak na gracza), extra (posiłki), maxAttacks
  function* aiTurn(G, p, lv, rng = Math.random) {
    const R = G.R;
    const value = (e) => {
      const land = G.map.lands[e.land], n = land.regions.length;
      const mine = land.regions.filter((id) => R[id].owner === p).length;
      let v = 1 + (e.capital ? 2 : 0) + (e.owner === 0 ? lv.focus || 0 : 0);
      if (lv.smart) {
        v += ((mine + 1) / n) * 1.5;
        if (mine + 1 === n) v += land.bonus;
        if (land.regions.every((id) => R[id].owner === e.owner)) v += 1.5; // rozbicie cudzej krainy
      }
      return v;
    };
    let pool = reinforcements(G, p, lv.extra || 0).total;
    if (G.medals[p] >= 3 && (lv.smart || G.medals[p] >= MAX_MEDALS)) {
      const n = trade(G, p);
      pool += n;
      yield { t: "trade", p, n };
    }
    const placed = new Map();
    const put = (r, n) => { r.armies += n; placed.set(r, (placed.get(r) || 0) + n); };
    const front = owned(G, p).filter((r) => enemies(G, r).length);
    if (!front.length) return;
    if (lv.smart) {
      const cap = front.find((r) => r.capital && threat(G, r) > r.armies);
      if (cap && pool > 2) { const n = Math.ceil(pool / 3); put(cap, n); pool -= n; }
      let best = front[0], bs = -Infinity;
      for (const r of front) for (const e of enemies(G, r)) {
        const sc = value(e) * 3 - e.armies + r.armies * 0.5;
        if (sc > bs) { bs = sc; best = r; }
      }
      put(best, pool);
    } else {
      for (; pool > 0; pool--) put(front[Math.floor(rng() * front.length)], 1);
    }
    for (const [r, n] of placed) yield { t: "place", p, r, n };
    const thr = 0.8 - 0.32 * lv.aggr;
    for (let k = 0; k < (lv.maxAttacks || 40); k++) {
      let best = null, bs = 0;
      for (const a of owned(G, p)) {
        if (a.armies < 2) continue;
        for (const e of enemies(G, a)) {
          const ch = odds(a.armies, e.armies, mods(G, e));
          if (ch < thr) continue;
          const sc = ch * value(e) + rng() * (lv.smart ? 0.2 : 1);
          if (sc > bs) { bs = sc; best = [a, e]; }
        }
      }
      if (!best) break;
      const [a, d] = best, from = d.owner, rolls = [];
      yield { t: "aim", p, a, d };
      while (a.armies >= 2 && d.owner !== p) {
        rolls.push(attack(G, a, d, rng));
        if (d.owner !== p && odds(a.armies, d.armies, mods(G, d)) < thr * 0.5) break;
      }
      yield { t: "attack", p, a, d, from, rolls, captured: d.owner === p };
      if (!G.alive[0] || G.alive.filter(Boolean).length < 2) return;
    }
    // umocnienie: z najsilniejszego regionu na tyłach do najbardziej zagrożonej granicy
    const inner = owned(G, p).filter((r) => !enemies(G, r).length && r.armies > 1).sort((x, y) => y.armies - x.armies)[0];
    if (inner) {
      const to = reachable(G, inner).filter((r) => enemies(G, r).length).sort((x, y) => threat(G, y) - y.armies - (threat(G, x) - x.armies))[0];
      if (to) { const n = inner.armies - 1; inner.armies = 1; to.armies += n; yield { t: "move", p, from: inner, to, n }; }
    }
  }

  return { TERRAIN, MOUNTAINS, MAX_MEDALS, tradeValue, generate, newGame, owned, enemies, mods, reinforcements, battle, outcomes, odds, attack, trade, endTurn, reachable, threat, aiTurn, last: null };
})();

if (typeof module !== "undefined") module.exports = Conquest;

if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "podboj"), {
  // aggr: chęć ataku komputera, smart: plan krain i stolic, focus: premia za atak na gracza, extra: posiłki komputera
  levels: [
    { key: "easy", name: "Łatwy", points: 20, regions: 16, players: 3, aggr: 0.45, smart: false, focus: 0, extra: -1, maxAttacks: 5 },
    { key: "medium", name: "Średni", points: 50, regions: 20, players: 3, aggr: 0.6, smart: true, focus: 0, extra: 0, maxAttacks: 8 },
    { key: "hard", name: "Trudny", points: 100, regions: 24, players: 4, aggr: 0.9, smart: true, focus: 0.2, extra: 0, maxAttacks: 30 },
  ],
  rules: [
    "Zdobądź wszystkie regiony. Tura ma trzy fazy: posiłki, atak i jedno umocnienie, potem ruszają rywale.",
    "Posiłki: co najmniej 3 armie, jedna na trzy regiony, premia za każdą całą krainę i 2 za każdą stolicę z koroną. Klikaj swoje regiony.",
    "Atak: kliknij swój region z co najmniej dwiema armiami, potem sąsiedni region wroga. Atakujący rzuca do 3 kości, obrońca do 2, remis wygrywa obrońca. Przy celach widać szansę zdobycia.",
    "Góry bronią się trzema kośćmi, a mury stolicy dodają 1 do najwyższej kości obrońcy.",
    "Tura z co najmniej jednym zdobytym regionem daje medal. Trzy medale wymienisz na armie (4, 6, 8 i więcej), a pokonany rywal oddaje swoje medale.",
    "Umocnienie: przenieś armie między połączonymi własnymi regionami. Klawisze: Enter kończy fazę, Esc odznacza, A atakuje do skutku, W wymienia medale.",
  ],
  achievements: [
    { id: "blitz", name: "Blitzkrieg", desc: "Podbij całą mapę na łatwym poziomie w najwyżej 9 turach.", points: 10 },
    { id: "zdobywca", name: "Zdobywca", desc: "Podbij całą mapę na średnim poziomie w najwyżej 13 turach.", points: 25 },
    { id: "imperator", name: "Imperator", desc: "Podbij całą mapę na trudnym poziomie w najwyżej 18 turach.", points: 50 },
    { id: "stolica", name: "Upadek stolicy", desc: "Zdobądź stolicę rywala.", points: 10 },
    { id: "szarza", name: "Szarża", desc: "Zdobądź pięć regionów w jednej turze.", points: 25 },
    { id: "kwatermistrz", name: "Kwatermistrz", desc: "Wymień medale na armie trzy razy w jednej partii.", points: 25 },
    { id: "krainy", name: "Władca krain", desc: "Miej jednocześnie trzy całe krainy.", points: 25 },
    { id: "nietykalny", name: "Nietykalny", desc: "Wygraj partię, nie tracąc ani jednego regionu.", points: 50 },
  ],
  mount(board, ctx) {
    const lv = ctx.level, C = Conquest;
    // na wąskim ekranie mapa kwadratowa: większe regiony pod palcem
    const tall = matchMedia("(max-width: 640px)").matches;
    const GW = tall ? 24 : 32, GH = tall ? 24 : 20, W = GW * 5, H = GH * 5;
    const G = C.newGame(lv, { GW, GH });
    const { map, R } = G, { RP, MW, MH, lab, dist, kind } = map, PU = RP / 5;
    const P = lv.players, own = (p) => C.owned(G, p);
    const KEYS = ["c", "red", "yellow", "green"], NAMES = ["Ty", "Czerwoni", "Żółci", "Zieloni"];
    const s = {
      phase: "reinforce", income: null, pool: 0, placed: new Map(), amt: 0, half: false, sel: -1, hover: -1, target: -1, targets: [],
      turn: 1, busy: false, fortified: false, aiNow: -1, fast: false, landHover: -1, conqTurn: 0, battles: 0,
      dice: null, banner: null, fx: [], shots: [], moves: [], mouse: false,
    };
    Conquest.last = { G, map, s, W, H };
    const cv = canvasGame(board, ctx, W, H, { max: 100 });
    const { g, theme } = cv;
    const col = (p) => theme[KEYS[p]];
    const motion = !reducedMotion();
    const TAU = Math.PI * 2;
    const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const isDark = () => { const m = /^#?([0-9a-f]{6})$/i.exec(theme.bg || ""); return m ? parseInt(m[1].slice(0, 2), 16) < 90 : false; };

    // --- zadania odkładane na czas animacji; sprzątane po partii ---
    let T = 0;
    const timers = new Set();
    const later = (sec, fn) => { const t = setTimeout(() => { timers.delete(t); fn(); }, sec * 1000); timers.add(t); };
    ctx.onStop(() => timers.forEach(clearTimeout));
    const spd = () => (s.fast ? 0.3 : 1) * (motion ? 1 : 0.5);

    // --- warstwy mapy liczone raz: maski regionów, obwódki, cienie, granice, krajobraz ---
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    const box = R.map(() => [MW, MH, 0, 0]);
    for (let i = 0; i < MW * MH; i++) {
      const l = lab[i];
      if (l < 0) continue;
      const b = box[l], x = i % MW, y = (i / MW) | 0;
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    }
    const EW = RP * 0.17;
    // piksele zapisywane jako 32-bitowe RGBA (kolejność bajtów little-endian: A B G R)
    const rgba = (r, gg, b, a) => ((a << 24) | (b << 16) | (gg << 8) | r) >>> 0;
    const land = mk(MW, MH), ld = new ImageData(MW, MH), L32 = new Uint32Array(ld.data.buffer);
    for (let i = 0; i < MW * MH; i++) if (lab[i] >= 0) L32[i] = 0xffffffff;
    land.getContext("2d").putImageData(ld, 0, 0);
    R.forEach((r) => {
      const [x0, y0, x1, y1] = box[r.id], w = x1 - x0 + 1, h = y1 - y0 + 1;
      const m = mk(w, h), e = mk(w, h), mi = new ImageData(w, h), ei = new ImageData(w, h), M32 = new Uint32Array(mi.data.buffer), E32 = new Uint32Array(ei.data.buffer);
      for (let y = 0; y < h; y++) for (let x = 0, i = (y + y0) * MW + x0, o = y * w; x < w; x++, i++, o++) {
        if (lab[i] !== r.id) continue;
        M32[o] = 0xffffffff;
        if (dist[i] < EW) E32[o] = rgba(255, 255, 255, (255 * (1 - dist[i] / EW)) | 0);
      }
      m.getContext("2d").putImageData(mi, 0, 0);
      e.getContext("2d").putImageData(ei, 0, 0);
      const vx = x0 / PU, vy = y0 / PU, vw = w / PU, vh = h / PU;
      r.vis = { mask: m, edge: e, x: vx, y: vy, w: vw, h: vh, owner: r.owner, from: r.owner, tt: 1, ox: 0, oy: 0, og: false, rad: 1, hl: 0, sel: 0, pop: 0, shown: r.armies };
    });
    // cienie i granice: czarne albo białe piksele z przezroczystością, więc pasują do każdego koloru właściciela
    const over = mk(MW, MH), od = new ImageData(MW, MH), O32 = new Uint32Array(od.data.buffer);
    const BW = [0, RP * 0.045, RP * 0.085, RP * 0.06, 0];
    const wave = Math.max(4, (RP * 0.42) | 0);
    // łagodne falowanie jasności lądu: sin(x·0,04)·sin(y·0,055 + x·0,01), sinusy z tablic
    const sx4 = new Float32Array(MW), sx1 = new Float32Array(MW), cx1 = new Float32Array(MW), sy5 = new Float32Array(MH), cy5 = new Float32Array(MH);
    for (let x = 0; x < MW; x++) { sx4[x] = Math.sin(x * 0.04); sx1[x] = Math.sin(x * 0.01); cx1[x] = Math.cos(x * 0.01); }
    for (let y = 0; y < MH; y++) { sy5[y] = Math.sin(y * 0.055); cy5[y] = Math.cos(y * 0.055); }
    for (let y = 0, i = 0; y < MH; y++) for (let x = 0; x < MW; x++, i++) {
      const l = lab[i], k = kind[i], d = dist[i];
      let px;
      if (l < 0) {
        if (d > RP * 0.4 && d < RP * 1.5 && d % wave === 0) px = rgba(255, 255, 255, 41);
        else if (d < RP * 0.07) px = rgba(255, 255, 255, 217);
        else if (d < RP * 0.4) px = rgba(255, 255, 255, (82 * (1 - d / (RP * 0.4))) | 0);
        else px = rgba(0, 0, 0, (Math.min(0.3, ((d - RP * 0.4) / (RP * 2.4)) * 0.3) * 255) | 0);
      } else if (d <= BW[k]) {
        px = k === 2 ? rgba(20, 24, 42, 209) : k === 3 ? rgba(0, 0, 0, 115) : rgba(255, 255, 255, 184);
      } else if (k === 1 && d <= BW[k] + 1.5) px = rgba(255, 255, 255, 46); // jasny brzeg pod białą granicą: wypukły region
      else {
        const t = Math.max(0, 1 - (d - BW[k]) / (RP * 0.4));
        const n = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000 * 0.05 + (sx4[x] * (sy5[y] * cx1[x] + cy5[y] * sx1[x]) + 1) * 0.025;
        px = rgba(10, 14, 32, ((t * t * 0.24 + n) * 255) | 0);
      }
      O32[i] = px;
    }
    const oc = over.getContext("2d");
    oc.putImageData(od, 0, 0);
    // krajobraz: wzgórza, drzewa, trawy i góry rysowane półprzezroczyście w regionach danej krainy
    oc.lineCap = "round";
    oc.lineJoin = "round";
    const DARK = "rgba(14,18,34,", LIGHT = "rgba(255,255,255,";
    function deco(k, x, y, u) {
      if (k === 0) {
        oc.strokeStyle = DARK + "0.3)";
        oc.lineWidth = u * 0.2;
        oc.beginPath(); oc.arc(x - u * 0.35, y + u * 0.55, u * 0.75, Math.PI * 1.15, Math.PI * 1.85); oc.stroke();
        oc.beginPath(); oc.arc(x + u * 0.6, y + u * 0.7, u * 0.55, Math.PI * 1.15, Math.PI * 1.85); oc.stroke();
      } else if (k === 1) {
        for (const [dx, dy, q] of [[-0.45, 0.15, 0.85], [0.4, -0.1, 1], [0.05, 0.45, 0.75]]) {
          const tx = x + dx * u, ty = y + dy * u, rr = u * 0.42 * q;
          oc.strokeStyle = DARK + "0.35)"; oc.lineWidth = u * 0.14;
          oc.beginPath(); oc.moveTo(tx, ty + rr * 0.6); oc.lineTo(tx, ty + rr * 1.6); oc.stroke();
          oc.fillStyle = DARK + "0.24)"; oc.beginPath(); oc.arc(tx, ty, rr, 0, TAU); oc.fill();
          oc.fillStyle = LIGHT + "0.2)"; oc.beginPath(); oc.arc(tx - rr * 0.3, ty - rr * 0.3, rr * 0.45, 0, TAU); oc.fill();
        }
      } else if (k === 2) {
        oc.strokeStyle = DARK + "0.32)"; oc.lineWidth = u * 0.12;
        for (const dx of [-0.3, 0, 0.3]) { oc.beginPath(); oc.moveTo(x, y + u * 0.4); oc.quadraticCurveTo(x + dx * u * 0.6, y, x + dx * u * 1.4, y - u * 0.25 + Math.abs(dx) * u * 0.4); oc.stroke(); }
      } else {
        const tri = (cx, h, w) => {
          oc.fillStyle = DARK + "0.26)";
          oc.beginPath(); oc.moveTo(cx - w, y + u * 0.55); oc.lineTo(cx, y + u * 0.55 - h); oc.lineTo(cx + w, y + u * 0.55); oc.closePath(); oc.fill();
          oc.fillStyle = LIGHT + "0.6)";
          oc.beginPath(); oc.moveTo(cx - w * 0.33, y + u * 0.55 - h * 0.67); oc.lineTo(cx, y + u * 0.55 - h); oc.lineTo(cx + w * 0.33, y + u * 0.55 - h * 0.67); oc.closePath(); oc.fill();
        };
        tri(x - u * 0.35, u * 1.05, u * 0.6);
        tri(x + u * 0.4, u * 1.3, u * 0.7);
      }
    }
    const step = RP * 0.72;
    for (let y = step / 2; y < MH; y += step) for (let x = step / 2; x < MW; x += step) {
      const jx = Math.min(MW - 1, x + (Math.random() - 0.5) * step * 0.6), jy = Math.min(MH - 1, y + (Math.random() - 0.5) * step * 0.6), i = (jy | 0) * MW + (jx | 0), l = lab[i];
      if (l < 0 || dist[i] < RP * 0.36 || Math.random() < 0.3) continue;
      if (Math.hypot(jx - R[l].lx * PU, jy - R[l].ly * PU) < RP * 1.15) continue;
      deco(map.lands[R[l].land].kind, jx, jy, RP * 0.24);
    }

    // kolorowanie masek: płótna w kolorze właściciela, trzymane w pamięci podręcznej
    const cache = new Map();
    function tint(r, layer, color, light = 0) {
      const key = `${r.id}|${layer}|${color}|${light}`;
      let c = cache.get(key);
      if (!c) {
        const src = r.vis[layer];
        c = mk(src.width, src.height);
        const x = c.getContext("2d");
        x.drawImage(src, 0, 0);
        x.globalCompositeOperation = "source-in";
        x.fillStyle = color;
        x.fillRect(0, 0, c.width, c.height);
        if (light) { x.globalCompositeOperation = "source-atop"; x.fillStyle = `rgba(255,255,255,${light})`; x.fillRect(0, 0, c.width, c.height); }
        if (cache.size > 500) cache.clear();
        cache.set(key, c);
      }
      return c;
    }
    const blit = (r, c) => g.drawImage(c, r.vis.x, r.vis.y, r.vis.w, r.vis.h);

    // --- panel ---
    const stepsEl = el("div", "cq-steps");
    const STEPS = ["Posiłki", "Atak", "Umocnienie"].map((t) => stepsEl.appendChild(el("span", "cq-step", t)));
    const headEl = el("div", "cq-head"), bigEl = el("p", "cq-big"), subEl = el("p", "cq-sub");
    headEl.append(bigEl, subEl);
    const incomeEl = el("div", "cq-income");
    const hintEl = el("p", "panel-note cq-hint");
    const amtSeg = segmented("Ile armii na kliknięcie", ["+1", "+5", "Wszystkie"], (k) => { s.amt = k; amtSeg.set(k); });
    amtSeg.set(0);
    const moveSeg = segmented("Ile armii przenieść", ["Wszystkie", "Połowę"], (k) => { s.half = k === 1; moveSeg.set(k); });
    moveSeg.set(0);
    const actBtn = button("", "btn wide", () => nextPhase());
    const allBtn = button("Atakuj do skutku", "btn-ghost wide", () => attackAll());
    const resetBtn = button("Rozstaw od nowa", "btn-ghost wide", () => resetPlacement());
    ctx.panel.append(panelBlock("", stepsEl, headEl, incomeEl, hintEl, amtSeg.el, moveSeg.el, actBtn, allBtn, resetBtn));
    const medals = pipsBlock(ctx, "Medale", C.MAX_MEDALS, { icon: "star" });
    const tradeBtn = button("Wymień medale", "btn-ghost wide", () => tradeMedals());
    medals.block.append(tradeBtn);
    const SHAPES = ["M0-8a8 8 0 1 1 0 16a8 8 0 1 1 0-16z", "M-5.5-7h11a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5v-11a1.5 1.5 0 0 1 1.5-1.5z", "M0-9.2L9.2 0L0 9.2L-9.2 0z", "M0-8.8L7.6-4.4V4.4L0 8.8L-7.6 4.4V-4.4z"];
    const icon = (d) => { const sv = svgEl("svg", { viewBox: "-10 -10 20 20", class: "cq-ico", "aria-hidden": "true" }); svgEl("path", { d }, sv); return sv; };
    const playersEl = el("div", "cq-players");
    const prow = Array.from({ length: P }, (_, p) => {
      const d = el("div", "cq-player"), info = el("em"), bar = el("span", "cq-share");
      d.style.setProperty("--pc", `var(--${KEYS[p]})`);
      d.append(icon(SHAPES[p]), el("b", "", NAMES[p]), info, bar);
      playersEl.append(d);
      return { d, info, bar };
    });
    ctx.panel.append(panelBlock("Gracze", playersEl));
    const TICONS = [
      "M-9 5a6 6 0 0 1 11-3a5 5 0 0 1 7 3z",
      "M0-9l6 8h-3l5 6h-16l5-6h-3z",
      "M-8 7c1-5 2-8 3-11M-2 7c0-5 1-9 2-13M4 7c1-4 2-7 4-10",
      "M-9 7l6-11l3 5l3-7l6 13z",
    ];
    const landsEl = el("div", "cq-lands");
    const lrow = map.lands.map((l) => {
      const b = button("", "cq-land", () => { s.landHover = s.landHover === l.id ? -1 : l.id; render(); });
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { s.landHover = l.id; render(); } });
      b.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { s.landHover = -1; render(); } });
      const ic = icon(TICONS[l.kind]);
      ic.classList.add(`cq-t${l.kind}`);
      const dots = el("span", "cq-dots"), ds = l.regions.map(() => dots.appendChild(el("i")));
      const name = el("span", "cq-lname");
      name.append(el("b", "", l.name), el("small", "", l.kind === C.MOUNTAINS ? "obrona 3 kośćmi" : `${l.regions.length} ${plural(l.regions.length, "region", "regiony", "regionów")}`));
      b.append(ic, name, dots, el("em", "", `+${l.bonus}`));
      landsEl.append(b);
      return { b, ds };
    });
    ctx.panel.append(panelBlock("Krainy", landsEl));

    // --- efekty ---
    const curve = (a, b, bend = 0.16) => [a.lx, a.ly, (a.lx + b.lx) / 2 - (b.ly - a.ly) * bend, (a.ly + b.ly) / 2 + (b.lx - a.lx) * bend, b.lx, b.ly];
    const onCurve = (c, t) => [(1 - t) * (1 - t) * c[0] + 2 * (1 - t) * t * c[2] + t * t * c[4], (1 - t) * (1 - t) * c[1] + 2 * (1 - t) * t * c[3] + t * t * c[5]];
    function sparks(x, y, color, n, speed = 18) {
      if (!motion) return;
      for (let k = 0; k < n; k++) {
        const a = Math.random() * TAU, v = speed * (0.35 + Math.random() * 0.75);
        s.fx.push({ kind: "spark", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, t: 0, life: 0.45 + Math.random() * 0.4, color, size: 0.45 + Math.random() * 0.55 });
      }
    }
    const ring = (x, y, color, r0, r1, life, w = 0.9, delay = 0) => s.fx.push({ kind: "ring", x, y, color, r0, r1, t: -delay, life, w });
    function banner(title, sub, p = -1) { s.banner = { title, sub, p, t: 0 }; }
    function launch(a, b, p, life = 0.26) { s.shots.push({ c: curve(a, b), t: 0, life: life * spd(), p }); }

    // --- logika tury gracza ---
    function regionAt(e) {
      const [x, y] = cv.at(e);
      const px = Math.floor(x * PU), py = Math.floor(y * PU);
      if (px < 0 || py < 0 || px >= MW || py >= MH) return null;
      const l = lab[py * MW + px];
      return l < 0 ? null : R[l];
    }
    const canAct = (r) => !s.busy && !ctx.done && r.owner === 0 && (s.phase === "reinforce" ? s.pool > 0 : (s.phase === "attack" || (s.phase === "fortify" && !s.fortified)) && r.armies > 1);
    function targets() {
      if (s.sel < 0 || ctx.done) return [];
      const a = R[s.sel];
      if (s.phase === "attack") return C.enemies(G, a);
      if (s.phase === "fortify" && !s.fortified) return C.reachable(G, a);
      return [];
    }
    function startTurn() {
      s.income = C.reinforcements(G, 0);
      s.pool = s.income.total;
      s.phase = "reinforce";
      s.placed.clear();
      s.fortified = false;
      s.conqTurn = 0;
      banner(`Tura ${s.turn}`, `${s.pool} ${plural(s.pool, "nowa armia", "nowe armie", "nowych armii")} do rozstawienia`, 0);
      render();
    }
    ctx.on(cv.cv, "pointermove", (e) => {
      s.mouse = e.pointerType === "mouse";
      const r = regionAt(e), id = r ? r.id : -1;
      if (id === s.hover) return;
      s.hover = id;
      cv.cv.style.cursor = r && (canAct(r) || s.targets.includes(r)) ? "pointer" : s.phase === "ai" ? "progress" : "default";
    });
    ctx.on(cv.cv, "pointerleave", () => (s.hover = -1));
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done) return;
      e.preventDefault();
      if (s.phase === "ai") {
        if (!s.fast) { s.fast = true; ctx.toast("Przyspieszono ruch rywali"); render(); }
        return;
      }
      if (s.busy) return;
      const r = regionAt(e);
      s.hover = r ? r.id : -1;
      if (!r) { s.sel = -1; return render(); }
      if (s.phase === "reinforce") {
        if (r.owner !== 0) { Sound.error(); return ctx.toast("Posiłki stawiasz tylko na swoich regionach"); }
        if (!s.pool) return;
        const n = Math.min(s.pool, e.shiftKey ? 5 : [1, 5, Infinity][s.amt]);
        r.armies += n;
        s.pool -= n;
        s.placed.set(r, (s.placed.get(r) || 0) + n);
        Sound.place(Math.min(9, 1 + (r.armies % 9)));
        if (!s.pool) toAttack();
        return render();
      }
      if (s.phase === "attack") {
        if (r.owner === 0) {
          if (r.armies > 1) { s.sel = r.id === s.sel ? -1 : r.id; Sound.tap(); }
          else { s.sel = -1; Sound.error(); ctx.toast("Atak wymaga co najmniej dwóch armii"); }
          return render();
        }
        if (s.sel >= 0 && R[s.sel].adj.has(r.id)) return playerAttack(R[s.sel], r);
        // klik w region wroga bez wybranego źródła: wybiera najsilniejszego własnego sąsiada
        const from = [...r.adj].map((i) => R[i]).filter((x) => x.owner === 0 && x.armies > 1).sort((x, y) => y.armies - x.armies)[0];
        if (from) { s.sel = from.id; s.target = r.id; Sound.tap(); }
        else { Sound.error(); ctx.toast("Ten region nie graniczy z Twoją armią"); }
        return render();
      }
      if (s.phase === "fortify") {
        if (s.fortified) return ctx.toast("Umocnienie wykonane, zakończ turę");
        if (r.owner !== 0) { s.sel = -1; return render(); }
        if (s.sel >= 0 && r.id !== s.sel && s.targets.includes(r)) {
          const a = R[s.sel], n = Math.max(1, s.half || e.shiftKey ? Math.floor(a.armies / 2) : a.armies - 1);
          a.armies -= n;
          r.armies += n;
          s.fortified = true;
          s.moves.push({ c: curve(a, r), t: 0, life: 0.7, p: 0 });
          s.sel = -1;
          Sound.line();
          return render();
        }
        if (r.armies > 1) { s.sel = r.id === s.sel ? -1 : r.id; Sound.tap(); } else s.sel = -1;
        return render();
      }
    });
    ctx.on(document, "keydown", (e) => {
      if (ctx.done || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (k === "enter" && !e.target.closest?.("button, a")) { e.preventDefault(); nextPhase(); }
      else if (k === "escape" && s.sel >= 0) { s.sel = -1; render(); }
      else if (k === "a") attackAll();
      else if (k === "w") tradeMedals();
    });

    function toAttack() {
      s.phase = "attack";
      s.sel = -1;
      banner("Atak", "Wybierz swój region, potem cel", 0);
    }
    function resetPlacement() {
      if (s.phase !== "reinforce" || s.busy) return;
      for (const [r, n] of s.placed) { r.armies -= n; s.pool += n; }
      s.placed.clear();
      Sound.erase();
      render();
    }
    function tradeMedals() {
      if (s.phase !== "reinforce" || s.busy || ctx.done || G.medals[0] < 3) return;
      const n = C.trade(G, 0);
      s.pool += n;
      s.traded = (s.traded || 0) + 1;
      if (s.traded >= 3) ctx.achieve("kwatermistrz");
      banner("Medale wymienione", `+${n} ${plural(n, "armia", "armie", "armii")}`, 0);
      Sound.line();
      render();
    }
    function nextPhase() {
      if (ctx.done) return;
      if (s.phase === "ai") { s.fast = true; return render(); }
      if (s.busy) return;
      if (s.phase === "reinforce") {
        // nierozdane posiłki trafiają na najbardziej zagrożony region
        if (s.pool) {
          const f = own(0).sort((a, b) => C.threat(G, b) - b.armies - (C.threat(G, a) - a.armies))[0];
          f.armies += s.pool;
          ctx.toast(`Pozostałe armie (${s.pool}) trafiły na zagrożoną granicę`);
          s.pool = 0;
        }
        toAttack();
      } else if (s.phase === "attack") {
        s.phase = "fortify";
        s.sel = -1;
      } else if (s.phase === "fortify") return aiPhase();
      Sound.tap();
      render();
    }
    function attackAll() {
      if (s.phase !== "attack" || s.busy || ctx.done || s.sel < 0) return;
      const a = R[s.sel];
      let d = s.target >= 0 && R[s.target].owner !== 0 && a.adj.has(s.target) ? R[s.target] : null;
      if (!d) d = C.enemies(G, a).sort((x, y) => C.odds(a.armies, y.armies, C.mods(G, y)) - C.odds(a.armies, x.armies, C.mods(G, x)))[0];
      if (!d) return;
      const go = () => {
        if (ctx.done) return;
        if (a.owner !== 0 || a.armies < 2 || d.owner === 0) { s.busy = false; return render(); }
        playerAttack(a, d, go);
      };
      go();
    }
    // jeden rzut gracza: pocisk leci, po trafieniu rozstrzyga się bitwa
    function playerAttack(a, d, then) {
      s.busy = true;
      s.target = d.id;
      const fly = then ? 0.17 : 0.24;
      launch(a, d, 0, fly);
      render();
      later(fly * spd(), () => {
        if (ctx.done) return;
        const res = C.attack(G, a, d);
        s.battles++;
        afterRoll(a, d, res, 0);
        s.busy = !!then && !ctx.done;
        if (res.captured && !ctx.done) {
          if (d.armies > 1 && C.enemies(G, d).length) s.sel = d.id;
          else if (a.armies > 1 && C.enemies(G, a).length) s.sel = a.id;
          else s.sel = -1;
          s.target = -1;
        } else if (a.armies < 2) s.sel = -1;
        render();
        if (then && !ctx.done) later((res.captured ? 0.35 : 0.12) * spd(), then);
      });
    }
    function afterRoll(a, d, res, p) {
      s.dice = { a: res.a, d: res.d, wall: res.wall, who: p, def: res.captured ? res.loser : d.owner, x: d.lx, y: d.ly, t: 0 };
      s.fx.push({ kind: "flash", x: d.lx, y: d.ly, t: 0, life: 0.3 });
      sparks(d.lx, d.ly, col(p), res.ld ? 8 : 4, 14);
      if (res.ld > res.la) Sound.place(7); else if (res.la > res.ld) Sound.erase(); else Sound.place(4);
      if (res.captured) capture(a, d, res, p);
    }
    function capture(a, d, res, p) {
      const v = d.vis;
      v.ox = a.lx; v.oy = a.ly; v.og = true;
      v.rad = Math.max(...[[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h]].map(([x, y]) => Math.hypot(x - a.lx, y - a.ly)));
      ring(d.lx, d.ly, col(p), 3, 18, 0.7, 1.2);
      ring(d.lx, d.ly, "#fff", 2, 11, 0.5, 0.6, 0.08);
      sparks(d.lx, d.ly, col(p), 18, 22);
      Sound.line();
      const L = map.lands[d.land], full = L.regions.every((id) => R[id].owner === p);
      if (p === 0) {
        s.conqTurn++;
        if (s.conqTurn >= 5) ctx.achieve("szarza");
        if (res.capital) { ctx.achieve("stolica"); banner("Stolica zdobyta", `${NAMES[res.loser]} tracą premię za stolicę`, 0); }
        else if (full) banner(`Kraina ${L.name}`, `+${L.bonus} ${plural(L.bonus, "armia", "armie", "armii")} na turę`, 0);
        if (map.lands.filter((l) => l.regions.every((id) => R[id].owner === 0)).length >= 3) ctx.achieve("krainy");
      } else if (res.loser === 0) {
        Sound.error();
        if (res.capital) banner("Twoja stolica padła", `Zajęli ją ${NAMES[p].toLowerCase()}`, p);
      }
      if (res.eliminated != null) {
        const n = res.eliminated;
        if (n !== 0) banner(`${NAMES[n]} pokonani`, p === 0 ? "Przejmujesz ich medale" : `Pokonali ich ${NAMES[p].toLowerCase()}`, p);
      }
      checkEnd();
    }
    function checkEnd() {
      if (ctx.done) return true;
      if (own(0).length === R.length) {
        const k = lv.key;
        if (k === "easy" && s.turn <= 9) ctx.achieve("blitz");
        if (k === "medium" && s.turn <= 13) ctx.achieve("zdobywca");
        if (k === "hard" && s.turn <= 18) ctx.achieve("imperator");
        if (!G.lost) ctx.achieve("nietykalny");
        s.sel = -1;
        ctx.win(`Cała mapa w ${s.turn} ${plural(s.turn, "turę", "tury", "tur")}, stoczone bitwy: ${s.battles}.`);
        return true;
      }
      if (!own(0).length) {
        s.sel = -1;
        ctx.lose("Podbity", `Rywale zajęli Twój ostatni region w turze ${s.turn}.`);
        return true;
      }
      return false;
    }

    // --- tura rywali: każdy krok komputera pokazany po kolei ---
    function aiPhase() {
      s.phase = "ai";
      s.busy = true;
      s.sel = -1;
      s.fast = false;
      if (C.endTurn(G, 0)) ctx.toast("Medal za zdobycze w tej turze");
      Sound.tap();
      render();
      const order = Array.from({ length: P - 1 }, (_, k) => k + 1);
      const nextPlayer = () => {
        if (ctx.done) return;
        const p = order.shift();
        if (p === undefined) { s.turn++; s.aiNow = -1; s.busy = false; return startTurn(); }
        if (!G.alive[p]) return nextPlayer();
        s.aiNow = p;
        banner(`Ruch: ${NAMES[p]}`, s.fast ? "" : "Kliknij mapę, żeby przyspieszyć", p);
        render();
        const gen = C.aiTurn(G, p, lv);
        let steps = 0;
        // długa tura rywala stopniowo przyspiesza
        const stepAi = () => {
          if (ctx.done) return;
          const { value: ev, done } = gen.next();
          if (done) { s.aim = null; C.endTurn(G, p); render(); return later(0.3 * spd(), nextPlayer); }
          const sec = show(ev) * Math.max(0.4, 1 - steps++ * 0.06);
          render();
          if (!ctx.done) later(sec * spd(), stepAi);
        };
        later(0.6 * spd(), stepAi);
      };
      later(0.25, nextPlayer);
    }
    function show(ev) {
      const p = ev.p;
      if (ev.t === "trade") { ctx.toast(`${NAMES[p]} wymieniają medale: +${ev.n}`); Sound.flag(); return 0.55; }
      if (ev.t === "place") { Sound.place(2); ring(ev.r.lx, ev.r.ly, col(p), 2, 8, 0.4, 0.6); return 0.2; }
      if (ev.t === "aim") { s.aim = { c: curve(ev.a, ev.d), p }; launch(ev.a, ev.d, p, 0.3); return 0.3; }
      s.aim = null;
      if (ev.t === "attack") {
        const res = ev.rolls[ev.rolls.length - 1];
        if (res) afterRoll(ev.a, ev.d, res, p);
        return ev.captured ? 0.7 : 0.5;
      }
      if (ev.t === "move") { s.moves.push({ c: curve(ev.from, ev.to), t: 0, life: 0.6, p }); Sound.tap(); return 0.55; }
      return 0.1;
    }

    // --- rysowanie ---
    function shape(o, x, y, r) {
      g.beginPath();
      if (o === 0) g.arc(x, y, r, 0, TAU);
      else if (o === 1) g.roundRect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76, r * 0.3);
      else if (o === 2) { const q = r * 1.2; g.moveTo(x, y - q); g.lineTo(x + q, y); g.lineTo(x, y + q); g.lineTo(x - q, y); g.closePath(); }
      else for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k * TAU) / 6; g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r * 1.07, y + Math.sin(a) * r * 1.07); }
      g.closePath();
    }
    function crown(x, y, w) {
      g.beginPath();
      g.moveTo(x - w, y + w * 0.55);
      g.lineTo(x - w * 1.05, y - w * 0.45);
      g.lineTo(x - w * 0.5, y + w * 0.05);
      g.lineTo(x, y - w * 0.7);
      g.lineTo(x + w * 0.5, y + w * 0.05);
      g.lineTo(x + w * 1.05, y - w * 0.45);
      g.lineTo(x + w, y + w * 0.55);
      g.closePath();
      g.fillStyle = theme.gold;
      g.strokeStyle = "rgba(14,18,34,0.55)";
      g.lineWidth = 0.3;
      g.fill();
      g.stroke();
    }
    function pill(text, x, y, bg, fg, size = 2.6) {
      const w = text.length * size * 0.56 + size * 1.3, h = size * 1.55;
      g.fillStyle = "rgba(14,18,34,0.25)";
      g.beginPath(); g.roundRect(x - w / 2, y - h / 2 + 0.3, w, h, h / 2); g.fill();
      g.fillStyle = bg;
      g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
      cv.text(text, x, y + size * 0.05, { size, weight: 700, color: fg });
    }
    function arrow(c, color, w, alpha = 1, dashed = true) {
      let [ax, ay, mx, my, bx, by] = c;
      const e = Math.atan2(by - my, bx - mx), st = Math.atan2(my - ay, mx - ax);
      bx -= Math.cos(e) * 5.4 * Z; by -= Math.sin(e) * 5.4 * Z;
      ax += Math.cos(st) * 4.2 * Z; ay += Math.sin(st) * 4.2 * Z;
      g.globalAlpha = alpha;
      g.lineCap = "round";
      const path = () => { g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(mx, my, bx, by); };
      g.strokeStyle = "rgba(14,18,34,0.35)"; g.lineWidth = w + 0.7; path(); g.stroke();
      g.strokeStyle = color; g.lineWidth = w;
      if (dashed && motion) { g.setLineDash([w * 2.2, w * 1.6]); g.lineDashOffset = -T * 9; }
      path(); g.stroke();
      g.setLineDash([]);
      const hs = w * 2.4 + 1.1;
      g.beginPath();
      g.moveTo(bx + Math.cos(e) * hs, by + Math.sin(e) * hs);
      g.lineTo(bx + Math.cos(e + 2.5) * hs, by + Math.sin(e + 2.5) * hs);
      g.lineTo(bx + Math.cos(e - 2.5) * hs, by + Math.sin(e - 2.5) * hs);
      g.closePath();
      g.fillStyle = color; g.strokeStyle = "rgba(14,18,34,0.4)"; g.lineWidth = 0.3; g.fill(); g.stroke();
      g.globalAlpha = 1;
    }
    const PIP = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
    function die(x, y, sz, v, fill, alpha, rot) {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.globalAlpha = alpha;
      g.fillStyle = "rgba(14,18,34,0.3)";
      g.beginPath(); g.roundRect(-sz / 2, -sz / 2 + sz * 0.1, sz, sz, sz * 0.24); g.fill();
      g.fillStyle = fill;
      g.beginPath(); g.roundRect(-sz / 2, -sz / 2, sz, sz, sz * 0.24); g.fill();
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.beginPath(); g.roundRect(-sz / 2, -sz / 2, sz, sz * 0.45, [sz * 0.24, sz * 0.24, 0, 0]); g.fill();
      g.fillStyle = "#fff";
      for (const k of PIP[v]) { g.beginPath(); g.arc(((k % 3) - 1) * sz * 0.27, (((k / 3) | 0) - 1) * sz * 0.27, sz * 0.095, 0, TAU); g.fill(); }
      g.restore();
    }
    function drawDice(b) {
      const life = 2.2, sz = 4.4 * Z, gap = 1.1 * Z, na = b.a.length, nd = b.d.length, mid = 4.2 * Z;
      const w = (na + nd) * sz + (na + nd - 2) * gap + mid;
      const x0 = Math.max(2, Math.min(W - w - 2, b.x - w / 2));
      let y = b.y - 11 * Z;
      if (y < sz) y = b.y + 11 * Z;
      const fade = b.t > life - 0.4 ? (life - b.t) / 0.4 : Math.min(1, b.t / 0.12);
      const rolling = motion && b.t < 0.3;
      g.globalAlpha = fade;
      g.fillStyle = "rgba(14,18,34,0.22)";
      g.beginPath(); g.roundRect(x0 - 1.6 * Z, y - sz / 2 - 1.6 * Z + 0.5, w + 3.2 * Z, sz + 3.2 * Z, 2.6 * Z); g.fill();
      g.fillStyle = theme.surface;
      g.beginPath(); g.roundRect(x0 - 1.6 * Z, y - sz / 2 - 1.6 * Z, w + 3.2 * Z, sz + 3.2 * Z, 2.6 * Z); g.fill();
      const pairs = Math.min(na, nd), aw = (k) => b.a[k] > b.d[k] + (k === 0 && b.wall ? 1 : 0);
      const settle = rolling ? 1 : 1 + Math.sin(Math.min(1, (b.t - 0.3) / 0.25) * Math.PI) * 0.14;
      const put = (vals, k, x, fill, lost) => {
        const v = rolling ? 1 + ((T * 18 + k * 2.3) | 0) % 6 : vals[k];
        die(x, y, sz * (rolling ? 0.92 : settle), v, fill, fade * (lost ? 0.32 : 1), rolling ? Math.sin(T * 26 + k) * 0.35 : 0);
      };
      let x = x0 + sz / 2;
      for (let k = 0; k < na; k++, x += sz + gap) put(b.a, k, x, col(b.who), !rolling && k < pairs && !aw(k));
      x += mid - gap;
      cv.text("vs", x - mid / 2 - sz / 2 + gap / 2, y + 0.2, { size: 2 * Z, weight: 700, color: "muted" });
      for (let k = 0; k < nd; k++, x += sz + gap) {
        put(b.d, k, x, col(b.def), !rolling && k < pairs && aw(k));
        if (k === 0 && b.wall && !rolling) { g.globalAlpha = fade; pill("+1", x + sz * 0.45, y - sz * 0.55, theme.gold, "#1d1f27", 1.7 * Z); }
      }
      g.globalAlpha = 1;
    }
    function drawBanner(b) {
      const life = 1.7, k = ease(b.t / 0.35), out = b.t > life - 0.4 ? (life - b.t) / 0.4 : 1;
      const tw = Math.min(W - 4, (Math.max(b.title.length * 2.5, b.sub.length * 1.45) + 12) * Z), th = (b.sub ? 11.5 : 8) * Z;
      const x = W / 2 - tw / 2, y = 3 - (1 - k) * 6;
      g.globalAlpha = Math.max(0, Math.min(k, out));
      g.fillStyle = "rgba(14,18,34,0.25)";
      g.beginPath(); g.roundRect(x, y + 0.7, tw, th, 3); g.fill();
      g.fillStyle = theme.surface;
      g.beginPath(); g.roundRect(x, y, tw, th, 3); g.fill();
      if (b.p >= 0) { g.fillStyle = col(b.p); g.beginPath(); g.roundRect(x, y, 1.6, th, [3, 0, 0, 3]); g.fill(); }
      cv.text(b.title, W / 2 + 0.8, y + (b.sub ? 4.1 * Z : th / 2 + 0.2), { size: 4 * Z, weight: 700 });
      if (b.sub) cv.text(b.sub, W / 2 + 0.8, y + 8.6 * Z, { size: 2.4 * Z, weight: 500, color: "muted" });
      g.globalAlpha = 1;
    }
    function tick(dt) {
      T += dt;
      const sp = 1 / Math.max(0.3, spd());
      for (const r of R) {
        const v = r.vis;
        const want = r.id === s.hover && !s.busy && (canAct(r) || s.targets.includes(r)) ? 1 : 0;
        v.hl += (want - v.hl) * Math.min(1, dt * 14);
        v.sel += ((r.id === s.sel ? 1 : 0) - v.sel) * Math.min(1, dt * 12);
        if (v.owner !== r.owner) {
          v.from = v.owner;
          v.owner = r.owner;
          v.tt = motion ? 0 : 1;
          if (!v.og) { v.ox = r.lx; v.oy = r.ly; v.rad = Math.hypot(v.w, v.h); }
          v.og = false;
        }
        if (v.tt < 1) v.tt = Math.min(1, v.tt + (dt / 0.6) * sp);
        if (r.armies !== v.shown) {
          const n = r.armies - v.shown, f = s.fx.find((x) => x.kind === "num" && x.r === r && x.t < 0.35);
          if (f) { f.n += n; f.t = 0; } else s.fx.push({ kind: "num", r, n, t: 0, life: 1.1 });
          v.shown = r.armies;
          v.pop = 1;
        }
        v.pop = Math.max(0, v.pop - dt * 4);
      }
      for (const list of [s.fx, s.shots, s.moves]) for (let k = 0; k < list.length; k++) if ((list[k].t += dt) >= list[k].life) list.splice(k--, 1);
      for (const f of s.fx) if (f.kind === "spark") { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 1 - dt * 3; f.vy = f.vy * (1 - dt * 3) + dt * 20; }
      if (s.dice && (s.dice.t += dt) > 2.2) s.dice = null;
      if (s.banner && (s.banner.t += dt) > 1.7) s.banner = null;
    }
    let Z = 1; // powiększenie znaczników na małym płótnie (telefon)
    function draw() {
      const dark = isDark(), light = dark ? 0.12 : 0.34;
      Z = Math.min(1.7 * Math.sqrt(16 / R.length), Math.max(1, 4.4 / ((cv.cv.clientWidth || W * 5) / W)));
      // morze z falami
      const gr = g.createLinearGradient(0, 0, W, H);
      gr.addColorStop(0, theme.teal);
      gr.addColorStop(1, theme.blue);
      g.fillStyle = gr;
      g.fillRect(0, 0, W, H);
      g.fillStyle = dark ? "rgba(12,16,30,0.62)" : "rgba(255,255,255,0.55)";
      g.fillRect(0, 0, W, H);
      g.strokeStyle = dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.55)";
      g.lineWidth = 0.35;
      g.lineCap = "round";
      g.setLineDash([2.5, 6]);
      for (let y = 2.5, row = 0; y < H; y += 4.5, row++) {
        g.lineDashOffset = motion ? -T * (row % 2 ? 1.6 : 2.4) + row * 3 : row * 3;
        g.beginPath();
        for (let x = -4; x <= W + 4; x += 2) { const yy = y + Math.sin(x * 0.11 + row + (motion ? T * 0.8 : 0)) * 0.7; x === -4 ? g.moveTo(x, yy) : g.lineTo(x, yy); }
        g.stroke();
      }
      g.setLineDash([]);
      // ląd: kolory właścicieli; zdobyty region zalewa się kolorem od strony atakującego
      g.drawImage(land, 0, 0, W, H);
      for (const r of R) {
        const v = r.vis;
        if (v.tt < 1) {
          blit(r, tint(r, "mask", col(v.from), light));
          g.save();
          g.beginPath();
          g.arc(v.ox, v.oy, Math.max(0.01, ease(v.tt) * v.rad), 0, TAU);
          g.clip();
          blit(r, tint(r, "mask", col(r.owner), light));
          g.restore();
        } else blit(r, tint(r, "mask", col(r.owner), light));
        const glow = v.hl * 0.22 + v.sel * 0.2 + (s.landHover === r.land ? 0.16 + 0.08 * Math.sin(T * 4) : 0);
        if (glow > 0.01) { g.globalAlpha = glow; blit(r, tint(r, "mask", "#fff")); g.globalAlpha = 1; }
        if (s.landHover >= 0 && s.landHover !== r.land) { g.globalAlpha = 0.3; blit(r, tint(r, "mask", "#0e1222")); g.globalAlpha = 1; }
      }
      g.drawImage(over, 0, 0, W, H);
      // obwódki: wybrany region i możliwe cele
      const pulse = 0.5 + 0.5 * Math.sin(T * 5);
      for (const r of s.targets) { g.globalAlpha = r.id === s.hover ? 1 : 0.45 + 0.4 * pulse; blit(r, tint(r, "edge", "#fff")); }
      if (s.sel >= 0) { g.globalAlpha = 1; const e = tint(R[s.sel], "edge", "#fff"); blit(R[s.sel], e); blit(R[s.sel], e); }
      g.globalAlpha = 1;
      // strzałki ataku i umocnienia
      if (s.sel >= 0 && !s.busy) {
        const a = R[s.sel];
        for (const r of s.targets) {
          const hot = r.id === s.hover || r.id === s.target;
          if (s.phase === "attack") arrow(curve(a, r), "#fff", hot ? 0.95 : 0.6, hot ? 1 : 0.75);
          else if (r.id === s.hover || a.adj.has(r.id)) arrow(curve(a, r), theme.gold, hot ? 0.9 : 0.55, hot ? 1 : 0.55);
        }
      }
      if (s.aim) arrow(s.aim.c, col(s.aim.p), 0.8, 0.9);
      for (const m of s.moves) {
        const k = ease(m.t / (m.life * 0.6)), out = m.t > m.life * 0.7 ? (m.life - m.t) / (m.life * 0.3) : 1;
        arrow(m.c, theme.gold, 0.9, out, false);
        const [x, y] = onCurve(m.c, k);
        g.fillStyle = col(m.p);
        g.globalAlpha = out;
        g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill();
        g.globalAlpha = 1;
      }
      // pociski: kometa po łuku od atakującego do celu
      for (const sh of s.shots) {
        const k = Math.min(1, sh.t / sh.life);
        for (let q = 5; q >= 0; q--) {
          const [x, y] = onCurve(sh.c, Math.max(0, k - q * 0.045));
          g.globalAlpha = (1 - q / 6) * 0.9;
          g.fillStyle = q ? col(sh.p) : "#fff";
          g.beginPath(); g.arc(x, y, (q ? 1.25 - q * 0.13 : 0.8) * Z, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
      }
      for (const f of s.fx) {
        const k = f.t / f.life;
        if (f.kind === "spark") { g.globalAlpha = 1 - k; g.fillStyle = f.color; g.beginPath(); g.arc(f.x, f.y, f.size * (1 - k * 0.5), 0, TAU); g.fill(); }
        else if (f.kind === "ring" && f.t > 0) { g.globalAlpha = (1 - k) * 0.9; g.strokeStyle = f.color; g.lineWidth = f.w * (1 - k) + 0.15; g.beginPath(); g.arc(f.x, f.y, f.r0 + (f.r1 - f.r0) * ease(k), 0, TAU); g.stroke(); }
        else if (f.kind === "flash") { g.globalAlpha = (1 - k) * 0.8; g.fillStyle = "#fff"; g.beginPath(); g.arc(f.x, f.y, 3 + k * 6, 0, TAU); g.fill(); }
      }
      g.globalAlpha = 1;
      // znaczniki armii: kształt i kolor właściciela, korona stolicy, obrót przy zmianie właściciela
      for (const r of R) {
        const v = r.vis, base = (3.4 + Math.min(1.4, r.armies / 30)) * Z;
        const rad = base * (1 + Math.sin(v.pop * Math.PI) * 0.16) * (r.id === s.sel ? 1 + 0.05 * Math.sin(T * 6) : 1);
        const fk = Math.min(1, v.tt * 1.7), flip = v.tt < 1 ? Math.max(0.06, Math.abs(Math.cos(Math.PI * fk))) : 1, o = fk < 0.5 ? v.from : r.owner;
        g.fillStyle = "rgba(14,18,34,0.32)";
        g.beginPath(); g.ellipse(r.lx, r.ly + rad * 0.3 + 0.6 * Z, (rad + 0.9 * Z) * flip, rad * 0.75, 0, 0, TAU); g.fill();
        g.save();
        g.translate(r.lx, r.ly);
        g.scale(flip, 1);
        shape(o, 0, 0, rad + 1.05 * Z);
        g.fillStyle = col(o);
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.85)";
        g.lineWidth = 0.35 * Z;
        g.stroke();
        shape(o, 0, 0, rad - 0.1 * Z);
        g.fillStyle = theme.surface;
        g.fill();
        cv.text(String(r.armies), 0, 0.3, { size: rad * (r.armies > 99 ? 0.78 : 1.05), weight: 700 });
        g.restore();
        if (r.capital) crown(r.lx, r.ly - rad - 1.9 * Z, 1.5 * Z);
      }
      // szanse zdobycia przy celach ataku i opis regionu pod kursorem
      if (s.phase === "attack" && s.sel >= 0 && !s.busy) {
        const a = R[s.sel];
        for (const r of s.targets) {
          const ch = C.odds(a.armies, r.armies, C.mods(G, r));
          pill(`${Math.round(ch * 100)}%`, r.lx, r.ly + 6.6 * Z, ch >= 0.7 ? theme.ok : ch >= 0.4 ? theme.warn : theme.bad, theme.surface, 2.6 * Z);
        }
      }
      if (s.mouse && s.hover >= 0 && !s.busy) {
        const r = R[s.hover], m = C.mods(G, r), info = [m.def3 && "góry: obrona 3 kośćmi", m.wall && "stolica: mury +1"].filter(Boolean).join(" · ");
        if (info) pill(info, Math.max(18, Math.min(W - 18, r.lx)), r.ly + (s.targets.includes(r) && s.phase === "attack" ? 10.6 : 6.6) * Z, theme.text, theme.surface, 2.2 * Z);
      }
      for (const f of s.fx) if (f.kind === "num" && f.n) {
        const k = f.t / f.life, y = f.r.ly - (6 + ease(k) * 5) * Z;
        g.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : Math.min(1, k * 8);
        pill(`${f.n > 0 ? "+" : "−"}${Math.abs(f.n)}`, f.r.lx + 5 * Z, y, f.n > 0 ? theme.ok : theme.bad, theme.surface, 2.6 * Z);
        g.globalAlpha = 1;
      }
      if (s.dice) drawDice(s.dice);
      if (s.banner) drawBanner(s.banner);
    }
    cv.loop((dt) => { tick(dt); draw(); });

    // --- panel: stan tury ---
    function render() {
      s.targets = targets();
      const ph = s.phase, idx = ["reinforce", "attack", "fortify"].indexOf(ph);
      STEPS.forEach((e, k) => { e.classList.toggle("on", k === idx); e.classList.toggle("done", idx < 0 || k < idx); });
      const reinforce = ph === "reinforce";
      if (reinforce) { bigEl.textContent = `+${s.pool}`; subEl.textContent = s.pool ? `${plural(s.pool, "armia", "armie", "armii")} do rozstawienia · tura ${s.turn}` : `wszystko rozstawione · tura ${s.turn}`; }
      else if (ph === "ai") { bigEl.textContent = s.aiNow > 0 ? NAMES[s.aiNow] : "Rywale"; subEl.textContent = `ruch rywali · tura ${s.turn}`; }
      else { bigEl.textContent = `Tura ${s.turn}`; subEl.textContent = ph === "attack" ? `zdobyte w tej turze: ${s.conqTurn}` : s.fortified ? "umocnienie wykonane" : "jedno przeniesienie armii"; }
      bigEl.classList.toggle("pool", reinforce && s.pool > 0);
      headEl.style.setProperty("--pc", `var(--${KEYS[ph === "ai" && s.aiNow > 0 ? s.aiNow : 0]})`);
      incomeEl.hidden = !reinforce || !s.income;
      if (reinforce && s.income) {
        const inc = s.income, chips = [[`Regiony`, inc.base]];
        if (inc.caps) chips.push([plural(inc.caps, "Stolica", "Stolice", "Stolic"), inc.capBonus]);
        for (const l of inc.lands) chips.push([l.name, l.bonus]);
        incomeEl.replaceChildren(...chips.map(([t, n]) => { const c = el("span", "cq-chip"); c.append(t, el("b", "", `+${n}`)); return c; }));
      }
      const sel = s.sel >= 0 ? R[s.sel] : null;
      hintEl.textContent = {
        reinforce: s.pool ? "Kliknij swój region, żeby dołożyć armie. Shift: pięć naraz." : "Gotowe.",
        attack: sel ? "Kliknij sąsiedni region wroga. Procent to szansa zdobycia przy ataku do skutku." : "Wybierz swój region z co najmniej dwiema armiami albo od razu kliknij cel.",
        fortify: s.fortified ? "Armie przeniesione. Zakończ turę." : sel ? "Kliknij własny region połączony z wybranym, żeby przenieść tam armie." : "Wybierz region, z którego przeniesiesz armie, albo zakończ turę.",
        ai: s.fast ? "Rywale ruszają się szybciej." : "Rywale wykonują ruchy. Kliknięcie mapy też przyspiesza.",
      }[ph];
      amtSeg.el.hidden = !reinforce;
      moveSeg.el.hidden = ph !== "fortify" || s.fortified;
      actBtn.textContent = { reinforce: "Przejdź do ataku", attack: "Przejdź do umocnienia", fortify: "Zakończ turę", ai: "Przyspiesz" }[ph];
      actBtn.disabled = ctx.done || (ph === "ai" ? s.fast : s.busy);
      actBtn.hidden = ctx.done;
      allBtn.hidden = ph !== "attack";
      allBtn.disabled = !sel || s.busy;
      resetBtn.hidden = !reinforce;
      resetBtn.disabled = !s.placed.size;
      const m = G.medals[0];
      medals.set(m, m >= 3 ? `Wymiana: +${C.tradeValue(G.trades[0])} ${plural(C.tradeValue(G.trades[0]), "armia", "armie", "armii")}.` : "Medal za turę z co najmniej jednym zdobytym regionem.");
      tradeBtn.hidden = m < 3;
      tradeBtn.disabled = !reinforce || s.busy;
      tradeBtn.textContent = reinforce ? `Wymień na +${C.tradeValue(G.trades[0])}` : "Wymiana w fazie posiłków";
      prow.forEach((row, p) => {
        const regs = own(p), arm = regs.reduce((a, r) => a + r.armies, 0), caps = regs.filter((r) => r.capital).length;
        row.d.classList.toggle("out", !G.alive[p]);
        row.d.classList.toggle("now", (ph === "ai" ? s.aiNow : 0) === p);
        row.info.textContent = G.alive[p] ? `${regs.length} reg. · ${arm} arm. · ${G.medals[p]}★` : "pokonani";
        row.d.title = `${NAMES[p]}: stolice ${caps}, medale ${G.medals[p]}`;
        row.bar.style.setProperty("--f", regs.length / R.length);
      });
      map.lands.forEach((l, k) => {
        const mine = l.regions.filter((id) => R[id].owner === 0).length;
        lrow[k].ds.forEach((d, j) => { const o = R[l.regions[j]].owner; d.style.background = `var(--${KEYS[o]})`; d.className = `cq-o${o}`; });
        lrow[k].b.classList.toggle("mine", mine === l.regions.length);
        lrow[k].b.classList.toggle("on", s.landHover === l.id);
        lrow[k].b.setAttribute("aria-pressed", String(s.landHover === l.id));
        lrow[k].b.setAttribute("aria-label", `${l.name}: premia ${l.bonus}, masz ${mine} z ${l.regions.length} regionów`);
      });
      cv.cv.setAttribute("aria-label", `Mapa: masz ${own(0).length} z ${R.length} regionów`);
      ctx.progress(own(0).length / R.length);
    }
    startTurn();
  },
});
