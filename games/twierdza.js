// Twierdza (tower defense): wrogowie idą drogą do bramy; wieże stawiane obok drogi strzelają do nich same.
// Mapa: siatka 16 × 11 pól po 10 jednostek, drogi jako listy punktów zwrotnych (pola). Latający lecą prosto do bramy.
// Logika (create, step, build, upgrade, cast) nie zależy od przeglądarki: testy i symulacja balansu działają w node.
const TowerDefense = (() => {
  const COLS = 16, ROWS = 11, S = 10;
  // każda droga kończy się przy bramie na prawej krawędzi; na trudnym poziomie dwie drogi łączą się w jedną
  const MAPS = {
    easy: [[[0, 2], [6, 2], [6, 8], [11, 8], [11, 3], [15, 3]]],
    medium: [[[0, 1], [3, 1], [3, 8], [7, 8], [7, 2], [12, 2], [12, 8], [15, 8]]],
    hard: [
      [[0, 1], [5, 1], [5, 5], [9, 5], [9, 2], [13, 2], [13, 8], [15, 8]],
      [[0, 9], [3, 9], [3, 5], [5, 5], [9, 5], [9, 2], [13, 2], [13, 8], [15, 8]],
    ],
  };
  const TOWERS = {
    archer: {
      name: "Łucznik", cost: 50, range: 30, dmg: 7, rate: 0.65, air: true, speed: 140, color: "green",
      desc: "Szybkie strzały, trafia też latających.",
      specs: [
        { key: "grad", name: "Grad strzał", desc: "Strzela do trzech wrogów naraz.", multi: 3, dmg: 0.9 },
        { key: "kusza", name: "Kusznik", desc: "Ciężkie bełty, co czwarty trafia podwójnie.", dmg: 1.7, range: 1.15, crit: 0.25 },
      ],
    },
    cannon: {
      name: "Armata", cost: 90, range: 26, dmg: 20, rate: 1.5, splash: 12, speed: 62, color: "brown",
      desc: "Pociski z rozpryskiem. Nie sięga latających.",
      specs: [
        { key: "mozdzierz", name: "Moździerz", desc: "Dalej i szerzej, ciężkie pociski.", dmg: 1.35, range: 1.45, splash: 1.4, rate: 1.15 },
        { key: "ogien", name: "Ogień", desc: "Podpala trafionych; ogień omija pancerz.", burn: 0.7 },
      ],
    },
    frost: {
      name: "Mróz", cost: 70, range: 24, dmg: 4, rate: 1, slow: 0.45, splash: 9, air: true, speed: 95, color: "blue",
      desc: "Spowalnia wrogów wokół celu.",
      specs: [
        { key: "zamiec", name: "Zamieć", desc: "Bez przerwy mrozi i rani wszystkich w zasięgu.", aura: true },
        { key: "szron", name: "Szron", desc: "Zamraża na chwilę i kruszy pancerz.", freeze: 0.7, dmg: 2 },
      ],
    },
    tesla: {
      name: "Tesla", cost: 110, range: 24, dmg: 13, rate: 1, chain: 3, air: true, color: "violet",
      desc: "Piorun przeskakuje na kilku wrogów.",
      specs: [
        { key: "burza", name: "Burza", desc: "Piorun skacze dalej i na trzy cele więcej.", chain: 3, jump: 1.5 },
        { key: "przeciazenie", name: "Przeciążenie", desc: "Silniejszy wstrząs ogłusza pierwszy cel.", dmg: 1.7, stun: 0.6 },
      ],
    },
    sniper: {
      name: "Snajper", cost: 140, range: 70, dmg: 60, rate: 2.2, air: true, color: "orange",
      desc: "Daleki zasięg, celuje w najsilniejszych.",
      specs: [
        { key: "zabojca", name: "Zabójca", desc: "Dobija wrogów poniżej 30% zdrowia (oprócz ogrów i bossa).", execute: 0.3 },
        { key: "przebicie", name: "Przebicie", desc: "Mocniejszy strzał, który omija pancerz.", dmg: 1.5, pierce: true },
      ],
    },
  };
  const ENEMIES = {
    grunt: { name: "Piechur", hp: 34, sp: 12, gold: 4, r: 3, color: "red" },
    fast: { name: "Zwiadowca", hp: 20, sp: 24, gold: 3, r: 2.6, color: "yellow" },
    tank: { name: "Rycerz", hp: 110, sp: 8, gold: 9, armor: 5, r: 4, color: "gray" },
    flyer: { name: "Nietoperz", hp: 32, sp: 15, gold: 6, fly: true, r: 3, color: "teal" },
    healer: { name: "Szaman", hp: 60, sp: 11, gold: 8, heal: 7, r: 3.2, color: "green" },
    slime: { name: "Śluz", hp: 56, sp: 10, gold: 3, split: "slimelet", r: 3.4, color: "pink" },
    slimelet: { name: "Śluzik", hp: 16, sp: 18, gold: 2, r: 2.2, color: "pink" },
    ogre: { name: "Ogr", hp: 320, sp: 7, gold: 35, armor: 3, lives: 3, big: true, r: 5, color: "brown" },
    boss: { name: "Władca", hp: 1700, sp: 6, gold: 150, armor: 4, lives: 10, big: true, summon: 7, r: 6.5, color: "violet" },
  };
  const SPELLS = {
    meteor: { name: "Ostrzał", cd: 30, r: 15, desc: "Kliknij miejsce na mapie: spadają kamienie, rani wszystkich w kręgu." },
    freeze: { name: "Zamrożenie", cd: 55, time: 3, desc: "Wszyscy wrogowie stają na 3 sekundy (boss na 1)." },
  };
  const TIER = { dmg: [1, 1.6, 2.4], range: [1, 1.12, 1.22], rate: [1, 0.88, 0.78] };

  const center = (i) => [(i % COLS) * S + S / 2, ((i / COLS) | 0) * S + S / 2];
  // droga w jednostkach planszy: punkty, długości odcinków, punkt w odległości d
  function makePath(cells) {
    const pts = cells.map(([x, y]) => [x * S + S / 2, y * S + S / 2]);
    pts[0][0] -= S / 2; // wejście od krawędzi
    pts[pts.length - 1][0] += S / 2; // brama na krawędzi
    const seg = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]));
    const len = seg.reduce((a, b) => a + b, 0);
    const at = (d) => {
      for (let k = 0; k < seg.length; k++) {
        if (d <= seg[k]) { const f = d / seg[k]; return [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f, Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0])]; }
        d -= seg[k];
      }
      const p = pts[pts.length - 1];
      return [p[0], p[1], 0];
    };
    return { cells, pts, seg, len, at };
  }
  // pola drogi (tam nie wolno budować)
  function pathCells(paths) {
    const cells = new Set();
    for (const map of paths) for (let k = 1; k < map.length; k++) {
      const [x0, y0] = map[k - 1], [x1, y1] = map[k];
      for (let t = 0; t <= Math.abs(x1 - x0) + Math.abs(y1 - y0); t++) {
        const x = x0 + Math.sign(x1 - x0) * Math.min(t, Math.abs(x1 - x0)), y = y0 + Math.sign(y1 - y0) * Math.max(0, t - Math.abs(x1 - x0));
        cells.add(y * COLS + x);
      }
    }
    return cells;
  }
  // skład fali: coraz więcej i coraz silniejszych wrogów; gap to odstęp przed następnym
  function wave(w, total, nPaths = 1) {
    const list = [];
    const add = (type, gap, path = list.length % nPaths) => list.push({ type, path, gap });
    const n = 5 + Math.floor(w * 1.4);
    for (let k = 0; k < n; k++) {
      let type = "grunt";
      if (w >= 2 && k % 4 === 1) type = "fast";
      if (w >= 3 && k % 5 === 2) type = "tank";
      if (w >= 4 && k % 6 === 3) type = "flyer";
      if (w >= 5 && k % 8 === 6) type = "slime";
      if (w >= 6 && k % 7 === 4) type = "healer";
      add(type, type === "fast" ? 0.55 : 0.95);
    }
    if (w === 4) for (let k = 0; k < 5; k++) add("flyer", 0.45);
    if (w >= 8 && w % 4 === 0) for (let k = 0; k < 6; k++) add("fast", 0.3);
    if (w % 5 === 0 && w < total) for (let k = 0; k < w / 5; k++) add("ogre", 1.6, k % nPaths);
    if (w === total) add("boss", 1, 0);
    return list;
  }
  // liczebność fali według rodzaju (podgląd w panelu)
  function waveSummary(list) {
    const m = new Map();
    for (const q of list) m.set(q.type, (m.get(q.type) || 0) + 1);
    return [...m];
  }
  const spec = (t) => (t.spec == null ? null : TOWERS[t.type].specs[t.spec]);
  function stat(t, key) {
    const base = TOWERS[t.type][key] || 0, sp = spec(t);
    return base * (TIER[key] ? TIER[key][t.tier] : 1) * ((sp && sp[key] && key !== "chain") ? sp[key] : 1) + (key === "chain" && sp && sp.chain ? sp.chain : 0);
  }
  const upgradeCost = (t) => Math.round(TOWERS[t.type].cost * [0.75, 1.25][t.tier]);
  const sellValue = (t) => Math.round(t.spent * 0.7);
  const meteorDmg = (s) => 50 + s.wave * 12;

  function create(lv, { events = true } = {}) {
    const paths = MAPS[lv.map].map(makePath);
    // pola drogi i murów zamku przy bramie
    const road = pathCells(MAPS[lv.map]), gy = MAPS[lv.map][0].at(-1)[1];
    for (const y of [gy - 1, gy + 1]) if (y >= 0 && y < ROWS) road.add(y * COLS + COLS - 1);
    return {
      lv, paths, road, gold: lv.gold, lives: lv.lives, wave: 0, towers: [], enemies: [], shots: [], queue: [], pending: [],
      spawnT: 0, kills: 0, waveDone: true, t: 0, cd: { meteor: 0, freeze: 0 }, early: 0, maxTowers: 0, killTimes: [], over: null, uid: 1,
      ev: events ? [] : null,
    };
  }
  const emit = (s, e) => s.ev && s.ev.push(e);
  const canBuild = (s, i) => i >= 0 && i < COLS * ROWS && !s.road.has(i) && !s.towers.some((t) => t.i === i);
  function build(s, type, i) {
    const T = TOWERS[type];
    if (!canBuild(s, i) || s.gold < T.cost) return null;
    s.gold -= T.cost;
    const [x, y] = center(i);
    const t = { id: s.uid++, i, x, y, type, tier: 0, spec: null, cd: 0, aim: -Math.PI / 2, mode: type === "sniper" ? "strong" : "first", spent: T.cost, kills: 0, dmg: 0 };
    s.towers.push(t);
    s.maxTowers = Math.max(s.maxTowers, s.towers.length);
    emit(s, { k: "build", t });
    return t;
  }
  // ulepszenie: dwa poziomy, na trzecim wybór specjalizacji (pick: 0 albo 1)
  function upgrade(s, t, pick = 0) {
    if (t.tier >= 2 || s.gold < upgradeCost(t)) return false;
    const c = upgradeCost(t);
    s.gold -= c;
    t.spent += c;
    t.tier++;
    if (t.tier === 2) t.spec = pick;
    emit(s, { k: "upgrade", t });
    return true;
  }
  function sell(s, t) {
    s.gold += sellValue(t);
    s.towers = s.towers.filter((x) => x !== t);
    emit(s, { k: "sell", t });
  }
  // nowa fala; wezwana, zanim poprzednia się skończy, daje premię
  function callWave(s) {
    if (s.over || s.wave >= s.lv.waves) return null;
    const early = !s.waveDone;
    const bonus = early ? 10 + s.queue.length * 2 : 0;
    s.gold += bonus;
    if (early) s.early++;
    s.wave++;
    s.queue.push(...wave(s.wave, s.lv.waves, s.paths.length));
    if (!early) s.spawnT = 0.4;
    s.waveDone = false;
    emit(s, { k: "wave", n: s.wave, boss: s.wave === s.lv.waves, ogre: s.wave % 5 === 0 && s.wave < s.lv.waves });
    return { early, bonus };
  }
  function cast(s, key, x, y) {
    if (s.over || s.cd[key] > 0) return false;
    s.cd[key] = SPELLS[key].cd;
    if (key === "meteor") {
      s.pending.push({ k: "meteor", t: 0.55, x, y, dmg: meteorDmg(s) });
      emit(s, { k: "meteor", x, y, t: 0.55 });
    } else {
      for (const e of s.enemies) e.stun = Math.max(e.stun, e.type === "boss" ? 1 : SPELLS.freeze.time), e.frozen = e.stun;
      emit(s, { k: "freeze" });
    }
    return true;
  }

  function spawn(s, q, at) {
    const E = ENEMIES[q.type], p = s.paths[q.path] || s.paths[0];
    const hp = E.hp * s.lv.hp * Math.pow(s.lv.grow || 1.1, Math.max(0, s.wave - 1));
    const e = {
      id: s.uid++, type: q.type, path: p, d: 0, x: p.pts[0][0], y: p.pts[0][1], dir: 0, hp, max: hp, sp: E.sp, armor: E.armor || 0,
      gold: E.gold, r: E.r, fly: !!E.fly, slow: 0, slowK: 0, stun: 0, frozen: 0, burn: 0, burnT: 0, brittle: 0, hitT: 0, summonT: E.summon || 0, prog: 0,
    };
    if (e.fly) { const g = p.pts[p.pts.length - 1]; e.flyLen = Math.hypot(g[0] - e.x, g[1] - e.y); e.fx = e.x; e.fy = e.y; }
    if (at) { e.d = at.d; e.hp = e.max = hp * (at.hp || 1); }
    move(e, 0);
    s.enemies.push(e);
    emit(s, { k: "spawn", e });
    return e;
  }
  function move(e, dist) {
    e.d += dist;
    if (e.fly) {
      const g = e.path.pts[e.path.pts.length - 1], f = Math.min(1, e.d / e.flyLen);
      e.x = e.fx + (g[0] - e.fx) * f;
      e.y = e.fy + (g[1] - e.fy) * f;
      e.dir = Math.atan2(g[1] - e.fy, g[0] - e.fx);
      e.prog = f;
    } else {
      [e.x, e.y, e.dir] = e.path.at(e.d);
      e.prog = e.d / e.path.len;
    }
  }
  function hurt(s, e, dmg, src, { pierce = false, burn = false } = {}) {
    if (e.dead) return;
    if (e.brittle > 0) dmg *= 1.25;
    const armor = pierce || burn || e.brittle > 0 ? 0 : e.armor;
    const real = Math.max(dmg * 0.25, dmg - armor);
    e.hp -= real;
    if (!burn) e.hitT = 0.12;
    if (src) src.dmg += real;
    if (e.hp <= 0) kill(s, e, src);
  }
  function kill(s, e, src) {
    e.dead = true;
    s.gold += e.gold;
    s.kills++;
    if (src) src.kills++;
    s.killTimes.push(s.t);
    while (s.killTimes.length && s.killTimes[0] < s.t - 1) s.killTimes.shift();
    if (s.killTimes.length >= 8) emit(s, { k: "pogrom" });
    emit(s, { k: "die", e });
    const E = ENEMIES[e.type];
    if (E.split) for (const off of [-2, 2]) {
      spawn(s, { type: E.split, path: s.paths.indexOf(e.path) }, { d: Math.max(0, e.d + off) });
    }
  }
  // cel wieży według trybu: pierwszy na drodze, najsilniejszy, najbliższy
  function target(s, t, range, skip) {
    const T = TOWERS[t.type];
    let best = null, bv = -Infinity;
    for (const e of s.enemies) {
      if (e.dead || (e.fly && !T.air) || (skip && skip.includes(e))) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d > range) continue;
      const v = t.mode === "strong" ? e.hp : t.mode === "near" ? -d : e.prog;
      if (v > bv) { bv = v; best = e; }
    }
    return best;
  }
  function fire(s, t, e) {
    const T = TOWERS[t.type], sp = spec(t) || {}, dmg = stat(t, "dmg");
    if (t.type === "tesla") {
      const hit = [e], n = stat(t, "chain") + t.tier, jump = 16 * (sp.jump || 1);
      while (hit.length < n) {
        const last = hit[hit.length - 1];
        let nx = null, nd = jump;
        for (const q of s.enemies) { const d = Math.hypot(q.x - last.x, q.y - last.y); if (!q.dead && !hit.includes(q) && d < nd) { nd = d; nx = q; } }
        if (!nx) break;
        hit.push(nx);
      }
      emit(s, { k: "bolt", t, pts: [[t.x, t.y - 4], ...hit.map((q) => [q.x, q.y])] });
      if (sp.stun) e.stun = Math.max(e.stun, ENEMIES[e.type].big ? 0.15 : sp.stun);
      hit.forEach((q, k) => hurt(s, q, dmg * Math.pow(0.8, k), t));
    } else if (t.type === "sniper") {
      emit(s, { k: "snipe", t, x: e.x, y: e.y });
      hurt(s, e, dmg, t, { pierce: sp.pierce });
      if (sp.execute && !e.dead && !ENEMIES[e.type].big && e.hp < e.max * sp.execute) { emit(s, { k: "execute", e }); hurt(s, e, e.hp + 1e6, t, { pierce: true }); }
    } else {
      const targets = [e];
      if (sp.multi) while (targets.length < sp.multi) { const q = target(s, t, stat(t, "range"), targets); if (!q) break; targets.push(q); }
      for (const q of targets) {
        const crit = sp.crit && Math.random() < sp.crit;
        s.shots.push({ x: t.x, y: t.y - 3, x0: t.x, y0: t.y - 3, d0: Math.max(1, Math.hypot(q.x - t.x, q.y - t.y)), tgt: q, tx: q.x, ty: q.y, v: T.speed, dmg: dmg * (crit ? 2 : 1), crit, type: t.type, src: t });
      }
      emit(s, { k: "fire", t });
    }
    t.recoil = 1;
  }
  function land(s, p) {
    const T = TOWERS[p.type], sp = spec(p.src) || {};
    if (T.splash) {
      const r = T.splash * (sp.splash || 1);
      for (const q of s.enemies) {
        if (q.dead || (q.fly && !T.air) || Math.hypot(q.x - p.tx, q.y - p.ty) > r) continue;
        hurt(s, q, p.dmg, p.src);
        if (T.slow) { q.slow = 1.6; q.slowK = T.slow + p.src.tier * 0.08; }
        if (sp.freeze) { q.stun = Math.max(q.stun, ENEMIES[q.type].big ? 0.2 : sp.freeze); q.frozen = q.stun; q.brittle = 2; }
        if (sp.burn) { q.burn = Math.max(q.burn, p.dmg * sp.burn); q.burnT = 3; }
      }
      emit(s, { k: "blast", type: p.type, x: p.tx, y: p.ty, r, spec: sp.key });
    } else if (!p.tgt.dead) {
      hurt(s, p.tgt, p.dmg, p.src);
      emit(s, { k: "hit", type: p.type, x: p.tx, y: p.ty, crit: p.crit, e: p.tgt });
    }
  }

  function step(s, dt) {
    if (s.over) return;
    s.t += dt;
    for (const k in s.cd) s.cd[k] = Math.max(0, s.cd[k] - dt);
    // opóźnione efekty czarów
    for (const p of s.pending) {
      if ((p.t -= dt) > 0) continue;
      p.done = true;
      for (const e of s.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) <= SPELLS.meteor.r) hurt(s, e, p.dmg, null, { pierce: true });
      emit(s, { k: "impact", x: p.x, y: p.y, r: SPELLS.meteor.r });
    }
    s.pending = s.pending.filter((p) => !p.done);
    s.spawnT -= dt;
    if (s.queue.length && s.spawnT <= 0) {
      const q = s.queue.shift();
      spawn(s, q);
      s.spawnT = q.gap * Math.max(0.55, 1 - s.wave * 0.02);
    }
    for (const e of s.enemies) {
      if (e.dead) continue;
      e.hitT = Math.max(0, e.hitT - dt);
      e.slow = Math.max(0, e.slow - dt);
      e.brittle = Math.max(0, e.brittle - dt);
      e.frozen = Math.max(0, e.frozen - dt);
      if (e.burnT > 0) { e.burnT -= dt; hurt(s, e, e.burn * dt, null, { burn: true }); if (e.dead) continue; }
      const E = ENEMIES[e.type];
      if (E.heal) for (const q of s.enemies) if (!q.dead && Math.hypot(q.x - e.x, q.y - e.y) < 14) q.hp = Math.min(q.max, q.hp + E.heal * dt * s.lv.hp);
      if (E.summon && (e.summonT -= dt) <= 0) {
        e.summonT = E.summon;
        for (const off of [-4, 4]) spawn(s, { type: "grunt", path: s.paths.indexOf(e.path) }, { d: Math.max(0, e.d + off), hp: 1.5 });
        emit(s, { k: "summon", e });
      }
      if (e.stun > 0) { e.stun -= dt; continue; }
      move(e, e.sp * (e.slow > 0 ? 1 - e.slowK : 1) * dt);
      if ((e.fly ? e.d >= e.flyLen : e.d >= e.path.len) && !e.dead) {
        e.dead = true;
        e.escaped = true;
        s.lives -= ENEMIES[e.type].lives || 1;
        emit(s, { k: "gate", e, lost: ENEMIES[e.type].lives || 1 });
      }
    }
    for (const t of s.towers) {
      t.cd -= dt;
      t.recoil = Math.max(0, (t.recoil || 0) - dt * 5);
      const range = stat(t, "range"), sp = spec(t) || {};
      if (sp.aura) {
        // zamieć: ciągłe mrożenie i obrażenia w całym zasięgu
        let any = false;
        for (const e of s.enemies) if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) <= range) {
          any = true;
          e.slow = Math.max(e.slow, 0.25);
          e.slowK = Math.max(e.slowK, 0.55);
          hurt(s, e, stat(t, "dmg") * 2.5 * dt, t, { burn: true });
        }
        t.active = any;
        continue;
      }
      const e = target(s, t, range);
      if (!e) continue;
      t.aimTo = Math.atan2(e.y - t.y, e.x - t.x);
      if (t.cd > 0) continue;
      t.cd = stat(t, "rate");
      fire(s, t, e);
    }
    for (const p of s.shots) {
      if (!p.tgt.dead) { p.tx = p.tgt.x; p.ty = p.tgt.y; }
      const d = Math.hypot(p.tx - p.x, p.ty - p.y);
      if (d < 2) { p.done = true; land(s, p); continue; }
      const k = Math.min(1, (p.v * dt) / d);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    }
    s.shots = s.shots.filter((p) => !p.done);
    s.enemies = s.enemies.filter((e) => !e.dead);
    if (s.lives <= 0) { s.lives = 0; s.over = "lose"; return; }
    if (!s.queue.length && !s.enemies.length && !s.waveDone) {
      s.waveDone = true;
      const bonus = 15 + s.wave * 2;
      s.gold += bonus;
      if (s.wave >= s.lv.waves) s.over = "win";
      else emit(s, { k: "cleared", n: s.wave, bonus });
    }
  }

  const api = {
    COLS, ROWS, S, MAPS, TOWERS, ENEMIES, SPELLS, center, makePath, pathCells, wave, waveSummary, stat, spec, upgradeCost, sellValue, meteorDmg,
    create, canBuild, build, upgrade, sell, callWave, cast, step, last: null,
  };
  return api;
})();

if (typeof module !== "undefined") module.exports = TowerDefense;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "twierdza"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, map: "easy", waves: 10, gold: 230, lives: 20, hp: 0.75, grow: 1.09 },
    { key: "medium", name: "Średni", points: 50, map: "medium", waves: 15, gold: 220, lives: 15, hp: 0.95, grow: 1.1 },
    { key: "hard", name: "Trudny", points: 100, map: "hard", waves: 20, gold: 260, lives: 10, hp: 0.95, grow: 1.105 },
  ],
  rules: [
    "Wybierz wieżę w panelu (klawisze 1–5) i kliknij wolne pole obok drogi. Na telefonie pierwsze dotknięcie pokazuje zasięg, drugie stawia wieżę.",
    "Kliknij wieżę, żeby ją ulepszyć, zmienić cel albo sprzedać. Na trzecim poziomie wybierasz jedną z dwóch specjalizacji.",
    "Armata nie sięga latających, mróz spowalnia, tesla razi kilku wrogów naraz, a snajper sięga daleko. Pancerz odejmuje część obrażeń każdego trafienia, więc pancernych bij mocnymi strzałami.",
    "Szaman leczy sąsiadów, śluz rozpada się na dwa mniejsze, a ogr przy bramie zabiera 3 życia. Nietoperze lecą prosto do bramy po przerywanej linii.",
    "Czary: Ostrzał (Q) rani wszystkich w wybranym kręgu, Zamrożenie (W) zatrzymuje całą falę. Po użyciu muszą się naładować.",
    "Falę wzywasz przyciskiem albo spacją; wcześniejsze wezwanie daje premię złota. Ostatnia fala przyprowadza Władcę. Wróg u bramy zabiera życia.",
  ],
  achievements: [
    { id: "ostatnia-linia", name: "Ostatnia linia", desc: "Obroń bramę, mając najwyżej 3 życia.", points: 10 },
    { id: "mistrz", name: "Mistrz rzemiosła", desc: "Wybierz specjalizację dla dowolnej wieży.", points: 10 },
    { id: "pospiech", name: "Pośpiech", desc: "Wezwij w jednej partii 5 fal przed czasem.", points: 10 },
    { id: "pogrom", name: "Pogrom", desc: "Pokonaj 8 wrogów w ciągu jednej sekundy.", points: 25 },
    { id: "oszczedny", name: "Oszczędny", desc: "Wygraj, nie mając nigdy więcej niż 6 wież naraz.", points: 25 },
    { id: "mur", name: "Żelazny mur", desc: "Wygraj średni poziom bez utraty życia.", points: 25 },
    { id: "niezdobyta", name: "Twierdza niezdobyta", desc: "Wygraj trudny poziom bez utraty życia.", points: 50 },
  ],
  mount(board, ctx) {
    const TD = TowerDefense, { COLS, ROWS, S, TOWERS, ENEMIES, SPELLS } = TD;
    const lv = ctx.level;
    const s = TD.create(lv);
    TD.last = s;
    const W = COLS * S, H = ROWS * S, TAU = Math.PI * 2;
    const cv = canvasGame(board, ctx, W, H, { max: 92, cls: "td-board" });
    const { g, theme } = cv;
    const calm = reducedMotion();
    // stan widoku: wybór, efekty, cząsteczki
    const v = { build: null, sel: null, hover: -1, mouse: [0, 0], aim: null, arm: -1, speed: 1, shake: 0, now: 0, parts: [], decals: [], bolts: [], tracers: [], meteors: [], banners: [], flash: null, gateHit: 0, spawnPulse: [0, 0], sndT: 0 };
    const towerAt = (i) => s.towers.find((t) => t.i === i);
    const cellAt = (x, y) => Math.max(0, Math.min(ROWS - 1, (y / S) | 0)) * COLS + Math.max(0, Math.min(COLS - 1, (x / S) | 0));
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const back = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
    const rand = (a, b) => a + Math.random() * (b - a);

    // --- kolory świata: dzień w jasnym motywie, noc w ciemnym ---
    function rgb(hex) { const n = parseInt((hex || "#000000").slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const alpha = (hex, a) => { const [r, gg, b] = rgb(hex); return `rgba(${r},${gg},${b},${a})`; };
    const night = () => { const [r, gg, b] = rgb(theme.bg); return (0.299 * r + 0.587 * gg + 0.114 * b) / 255 < 0.4; };
    let P = null;
    const pal = () => night() ? {
      night: true, grass: "#284331", grass2: "#2b4734", blobD: "#213a29", blobL: "#33573c", tuft: "#4b7a50", road: "#6a5944", roadEdge: "#463a2b", road2: "#7b6950", pebble: "#8d7c63",
      stone: "#7c838e", stoneTop: "#98a0ab", stoneSide: "#59606a", stoneLine: "rgba(0,0,0,0.28)", wood: "#8b5f3c", woodDark: "#5d3f28", iron: "#25282e", shadow: "rgba(0,0,0,0.38)", hi: "rgba(255,255,255,0.14)", sky: "rgba(170,190,255,0.35)",
    } : {
      night: false, grass: "#9cd07c", grass2: "#a3d584", blobD: "#8bc46c", blobL: "#b4de94", tuft: "#76b457", road: "#e2c48f", roadEdge: "#c09660", road2: "#ecd5a8", pebble: "#c7a571",
      stone: "#cbc6bc", stoneTop: "#e4e0d8", stoneSide: "#a49d92", stoneLine: "rgba(80,70,60,0.25)", wood: "#a8743f", woodDark: "#7a5230", iron: "#33363d", shadow: "rgba(30,45,20,0.25)", hi: "rgba(255,255,255,0.45)", sky: "rgba(40,60,120,0.25)",
    };
    P = pal();

    // --- tło: trawa, droga, linie lotu; rysowane raz do bufora o rozdzielczości płótna ---
    let bg = null, bgKey = "";
    function seeded(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function renderBg() {
      const can = document.createElement("canvas");
      can.width = cv.cv.width;
      can.height = cv.cv.height;
      const c = can.getContext("2d"), k = can.width / W;
      c.scale(k, k);
      const r = seeded(lv.map.length * 977 + 13);
      c.fillStyle = P.grass;
      c.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) { c.fillStyle = P.grass2; c.fillRect(x * S, y * S, S, S); }
      for (let n = 0; n < 70; n++) {
        c.fillStyle = r() < 0.5 ? P.blobD : P.blobL;
        c.globalAlpha = 0.35 + r() * 0.3;
        c.beginPath(); c.ellipse(r() * W, r() * H, 2 + r() * 7, 1.5 + r() * 4, r() * 3, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      c.strokeStyle = P.tuft;
      c.lineWidth = 0.35;
      c.lineCap = "round";
      for (let n = 0; n < 170; n++) {
        const x = r() * W, y = r() * H;
        if (s.road.has(cellAt(x, y))) continue;
        c.beginPath();
        for (const dx of [-0.6, 0, 0.6]) { c.moveTo(x + dx * 0.6, y); c.lineTo(x + dx * 1.3, y - 1 - r() * 0.8); }
        c.stroke();
      }
      const petals = [theme.yellow, theme.pink, "#ffffff", theme.violet];
      for (let n = 0; n < 34; n++) {
        const x = r() * W, y = r() * H;
        if (s.road.has(cellAt(x, y))) continue;
        c.fillStyle = petals[n % petals.length];
        c.globalAlpha = P.night ? 0.55 : 0.9;
        for (let a = 0; a < 5; a++) { c.beginPath(); c.arc(x + Math.cos(a * 1.26) * 0.45, y + Math.sin(a * 1.26) * 0.45, 0.32, 0, TAU); c.fill(); }
        c.fillStyle = theme.gold;
        c.beginPath(); c.arc(x, y, 0.25, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      // droga: brzeg, ubita ziemia, jaśniejszy środek, kamyki
      const stroke = (w, col, a = 1) => {
        c.strokeStyle = col; c.globalAlpha = a; c.lineWidth = w; c.lineJoin = "round"; c.lineCap = "square";
        for (const p of s.paths) { c.beginPath(); p.pts.forEach(([x, y], k2) => (k2 ? c.lineTo(x, y) : c.moveTo(x - 2, y))); c.stroke(); }
        c.globalAlpha = 1;
      };
      stroke(S * 0.94, P.roadEdge);
      stroke(S * 0.78, P.road);
      stroke(S * 0.36, P.road2, 0.55);
      for (const p of s.paths) for (let d = 0; d < p.len; d += 1.3) {
        const [x, y, dir] = p.at(d), off = (r() - 0.5) * S * 0.7;
        if (r() < 0.55) continue;
        c.fillStyle = r() < 0.5 ? P.pebble : P.roadEdge;
        c.globalAlpha = 0.5 + r() * 0.4;
        c.beginPath(); c.ellipse(x - Math.sin(dir) * off, y + Math.cos(dir) * off, 0.25 + r() * 0.35, 0.2 + r() * 0.25, r() * 3, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
      // trasa latających: przerywana linia z grotami
      c.strokeStyle = P.sky;
      c.fillStyle = P.sky;
      c.lineWidth = 0.45;
      for (const p of s.paths) {
        const a = p.pts[0], b = p.pts[p.pts.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        c.setLineDash([1.6, 2.2]);
        c.beginPath(); c.moveTo(a[0] + 4 * ux, a[1] + 4 * uy); c.lineTo(b[0] - 10 * ux, b[1] - 10 * uy); c.stroke();
        c.setLineDash([]);
        for (let d = 24; d < L - 14; d += 26) {
          const x = a[0] + ux * d, y = a[1] + uy * d;
          c.beginPath(); c.moveTo(x + ux * 1.4, y + uy * 1.4); c.lineTo(x - uy * 1 - ux * 0.6, y + ux * 1 - uy * 0.6); c.lineTo(x + uy * 1 - ux * 0.6, y - ux * 1 - uy * 0.6); c.fill();
        }
      }
      return can;
    }
    function drawBg() {
      const key = `${cv.cv.width}|${theme.bg}`;
      if (key !== bgKey && cv.cv.width > 0) { bgKey = key; P = pal(); bg = renderBg(); refreshIcons(); }
      if (bg) g.drawImage(bg, 0, 0, W, H);
    }

    // --- wieże ---
    function drawTower(c, t, now, ghost) {
      const T = TOWERS[t.type], col = theme[T.color];
      const grow = t.grow == null ? 1 : back(Math.min(1, t.grow));
      const pulse = t.pulse ? 1 + Math.sin((1 - t.pulse) * Math.PI) * 0.12 : 1;
      c.save();
      c.translate(t.x, t.y);
      c.scale(grow * pulse, grow * pulse);
      if (!ghost) { c.fillStyle = P.shadow; c.beginPath(); c.ellipse(0.8, 3, 4.6, 2, 0, 0, TAU); c.fill(); }
      // kamienna podstawa: bok i wierzch
      c.fillStyle = P.stoneSide;
      c.beginPath(); c.roundRect(-4.2, -2.4, 8.4, 6, 1.6); c.fill();
      c.fillStyle = P.stone;
      c.beginPath(); c.roundRect(-4.2, -3.8, 8.4, 5.6, 1.6); c.fill();
      c.fillStyle = P.stoneTop;
      c.beginPath(); c.roundRect(-3.4, -3.3, 6.8, 4.4, 1.2); c.fill();
      c.strokeStyle = P.stoneLine;
      c.lineWidth = 0.22;
      c.beginPath(); c.moveTo(-4.2, 2.3); c.lineTo(4.2, 2.3); c.moveTo(-1.6, 1.8); c.lineTo(-1.6, 3.6); c.moveTo(1.8, 2.3); c.lineTo(1.8, 3.6); c.stroke();
      if (t.tier >= 1) { c.fillStyle = col; c.fillRect(-4.2, 2.35, 8.4, 0.75); }
      if (t.tier >= 2) { c.strokeStyle = theme.gold; c.lineWidth = 0.4; c.beginPath(); c.roundRect(-4.2, -3.8, 8.4, 5.6, 1.6); c.stroke(); }
      const aim = t.aimS ?? -Math.PI / 2, rec = t.recoil || 0;
      c.translate(0, -1.2);
      if (t.type === "archer") {
        c.fillStyle = P.woodDark; c.beginPath(); c.arc(0, 0, 3.1, 0, TAU); c.fill();
        c.fillStyle = P.wood; c.beginPath(); c.arc(0, -0.2, 2.8, 0, TAU); c.fill();
        c.strokeStyle = P.woodDark; c.lineWidth = 0.18;
        for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-2.6, k * 1.1 - 0.2); c.lineTo(2.6, k * 1.1 - 0.2); c.stroke(); }
        c.rotate(aim);
        const spread = t.spec === 0 ? [-0.5, 0, 0.5] : [0];
        // łuk i cięciwa odciągnięta przy strzale
        c.strokeStyle = t.spec === 1 ? P.iron : P.woodDark; c.lineWidth = 0.55; c.lineCap = "round";
        c.beginPath(); c.arc(0.4, 0, 2.6, -1, 1); c.stroke();
        c.strokeStyle = P.hi; c.lineWidth = 0.18;
        const sx = 0.4 + Math.cos(1) * 2.6, sy = Math.sin(1) * 2.6, pull = 1.2 - rec * 1.6;
        c.beginPath(); c.moveTo(sx, -sy); c.lineTo(pull, 0); c.lineTo(sx, sy); c.stroke();
        if (rec < 0.3) { c.strokeStyle = P.woodDark; c.lineWidth = 0.3; for (const a of spread) { c.beginPath(); c.moveTo(pull, a); c.lineTo(3.4, a * 0.4); c.stroke(); } }
        c.fillStyle = col; c.beginPath(); c.arc(-0.6, 0, 1.35, 0, TAU); c.fill();
        c.fillStyle = P.hi; c.beginPath(); c.arc(-0.9, -0.4, 0.5, 0, TAU); c.fill();
      } else if (t.type === "cannon") {
        c.fillStyle = P.woodDark; c.beginPath(); c.arc(0, 0.3, 3, 0, TAU); c.fill();
        c.fillStyle = P.wood; c.beginPath(); c.arc(0, 0, 2.7, 0, TAU); c.fill();
        c.rotate(aim);
        const big = t.spec === 0 ? 1.25 : 1, back0 = -1.4 - rec * 1.3;
        c.fillStyle = P.iron;
        c.beginPath(); c.roundRect(back0, -1.25 * big, 6.4, 2.5 * big, 1.1); c.fill();
        c.fillStyle = t.spec === 1 ? theme.orange : col;
        c.fillRect(back0 + 4.6, -1.35 * big, 0.8, 2.7 * big);
        c.fillStyle = P.hi; c.fillRect(back0 + 0.6, -0.95 * big, 3.6, 0.4);
        c.fillStyle = "#000000"; c.globalAlpha = 0.6; c.beginPath(); c.arc(back0 + 6.4, 0, 0.7 * big, 0, TAU); c.fill(); c.globalAlpha = 1;
        c.fillStyle = P.iron; c.beginPath(); c.arc(0, 0, 1.3, 0, TAU); c.fill();
      } else if (t.type === "frost") {
        const bob = Math.sin(now * 2.2 + t.id) * 0.5, glow = 0.35 + Math.sin(now * 3 + t.id) * 0.12 + rec * 0.3;
        const gr = c.createRadialGradient(0, -2 + bob, 0, 0, -2 + bob, 5.5);
        gr.addColorStop(0, alpha(col, glow)); gr.addColorStop(1, alpha(col, 0));
        c.fillStyle = gr; c.beginPath(); c.arc(0, -2 + bob, 5.5, 0, TAU); c.fill();
        c.fillStyle = alpha(col, 0.5);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.3; c.beginPath(); c.moveTo(Math.cos(a) * 2.6, Math.sin(a) * 1.4 + 0.6); c.lineTo(Math.cos(a) * 3.3, Math.sin(a) * 1.7 - 0.6); c.lineTo(Math.cos(a + 0.4) * 2.6, Math.sin(a + 0.4) * 1.4 + 0.6); c.fill(); }
        c.translate(0, bob - 1.6);
        c.rotate(Math.sin(now * 0.8 + t.id) * 0.12);
        c.fillStyle = "#e8f6ff";
        c.strokeStyle = col; c.lineWidth = 0.35; c.lineJoin = "round";
        const k2 = t.spec === 0 ? 1.15 : 1;
        c.beginPath(); c.moveTo(0, -3.6 * k2); c.lineTo(1.7 * k2, -1); c.lineTo(1.1 * k2, 1.4); c.lineTo(0, 2.1); c.lineTo(-1.1 * k2, 1.4); c.lineTo(-1.7 * k2, -1); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = alpha(col, 0.6); c.lineWidth = 0.2;
        c.beginPath(); c.moveTo(0, -3.6 * k2); c.lineTo(0, 2.1); c.moveTo(-1.7 * k2, -1); c.lineTo(0, -0.2); c.lineTo(1.7 * k2, -1); c.stroke();
        if (t.spec === 1) { c.fillStyle = col; c.beginPath(); c.arc(0, -0.4, 0.6, 0, TAU); c.fill(); }
      } else if (t.type === "tesla") {
        const copper = P.night ? "#b47440" : "#c98a4b";
        c.fillStyle = P.iron; c.beginPath(); c.ellipse(0, 0.6, 2.6, 1.4, 0, 0, TAU); c.fill();
        for (let k = 0; k < 4; k++) {
          c.fillStyle = k % 2 ? copper : "#e3b07a";
          c.beginPath(); c.ellipse(0, -k * 1.05, 2.1 - k * 0.32, 0.75 - k * 0.08, 0, 0, TAU); c.fill();
        }
        c.fillStyle = P.iron; c.fillRect(-0.3, -5.2, 0.6, 1.8);
        const charge = Math.max(0, 1 - Math.max(0, t.cd || 0) / TD.stat(t, "rate"));
        const orb = 1.3 + charge * 0.35 + (t.spec === 1 ? 0.25 : 0);
        const gr = c.createRadialGradient(0, -5.6, 0, 0, -5.6, 4.2);
        gr.addColorStop(0, alpha(col, 0.35 + charge * 0.35)); gr.addColorStop(1, alpha(col, 0));
        c.fillStyle = gr; c.beginPath(); c.arc(0, -5.6, 4.2, 0, TAU); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, -5.6, orb, 0, TAU); c.fill();
        c.fillStyle = "#ffffff"; c.globalAlpha = 0.75; c.beginPath(); c.arc(-0.4, -6, orb * 0.4, 0, TAU); c.fill(); c.globalAlpha = 1;
        if (!ghost && charge > 0.85 && Math.random() < 0.5) {
          c.strokeStyle = alpha("#ffffff", 0.8); c.lineWidth = 0.18; c.beginPath();
          const a = Math.random() * TAU; c.moveTo(Math.cos(a) * orb, -5.6 + Math.sin(a) * orb);
          c.lineTo(Math.cos(a + 0.3) * (orb + 1.2), -5.6 + Math.sin(a + 0.3) * (orb + 1.2)); c.lineTo(Math.cos(a - 0.1) * (orb + 2), -5.6 + Math.sin(a - 0.1) * (orb + 2)); c.stroke();
        }
      } else {
        c.fillStyle = P.stoneSide; c.beginPath(); c.arc(0, 0.2, 2.8, 0, TAU); c.fill();
        c.fillStyle = P.night ? "#4d5560" : "#68707c"; c.beginPath(); c.arc(0, 0, 2.6, 0, TAU); c.fill();
        c.rotate(aim);
        const b0 = -0.8 - rec * 1.4, len = t.spec === 1 ? 8.2 : 7.4;
        c.fillStyle = P.iron;
        c.fillRect(b0, -0.42, len, 0.84);
        c.fillRect(b0 + len - 0.9, -0.62, 0.9, 1.24);
        c.fillStyle = col; c.fillRect(b0 + 1.2, -1.15, 2.4, 0.7);
        c.fillStyle = P.hi; c.fillRect(b0 + 1.4, -1.05, 0.7, 0.3);
        c.fillStyle = col; c.beginPath(); c.arc(-0.6, 0, 1.25, 0, TAU); c.fill();
        if (t.spec === 0) { c.fillStyle = theme.red; c.beginPath(); c.arc(b0 + len, 0, 0.35, 0, TAU); c.fill(); }
      }
      c.restore();
      // gwiazdki poziomu pod wieżą
      if (t.tier && !ghost) for (let k = 0; k < t.tier; k++) star(c, t.x - (t.tier - 1) * 1.1 + k * 2.2, t.y + 4.15, 0.85, theme.gold);
    }
    function star(c, x, y, r, col) {
      c.fillStyle = col;
      c.strokeStyle = P.shadow; c.lineWidth = 0.15;
      c.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.stroke();
    }

    // --- wrogowie ---
    function drawEnemy(c, e, now) {
      const E = ENEMIES[e.type], col = theme[E.color], r = e.r;
      const ph = (e.d || 0) * 0.9 + e.id;
      const bob = e.fly ? Math.sin(now * 5 + e.id) * 0.6 : Math.abs(Math.sin(ph)) * r * 0.12;
      const lift = e.fly ? 4 : 0;
      if (Math.abs(Math.cos(e.dir)) > 0.3) e.face = Math.cos(e.dir) >= 0 ? 1 : -1;
      const f = e.face || 1;
      c.fillStyle = P.shadow;
      c.beginPath(); c.ellipse(e.x, e.y + r * 0.8, r * (e.fly ? 0.7 : 0.95), r * 0.38, 0, 0, TAU); c.fill();
      c.save();
      c.translate(e.x, e.y - bob - lift);
      if (e.spawnT != null && e.spawnT < 1) { const k = back(e.spawnT); c.scale(k, k); }
      c.scale(f, 1);
      const legs = (w, len, colL) => {
        const sw = Math.sin(ph * 2) * len;
        c.fillStyle = colL;
        c.beginPath(); c.ellipse(-w + sw, r * 0.78, r * 0.26, r * 0.17, 0, 0, TAU); c.fill();
        c.beginPath(); c.ellipse(w - sw, r * 0.78, r * 0.26, r * 0.17, 0, 0, TAU); c.fill();
      };
      const eyes = (x, y, k = 1, glow) => {
        for (const dx of [0, r * 0.32]) {
          c.fillStyle = glow || "#ffffff"; c.beginPath(); c.arc(x + dx, y, r * 0.15 * k, 0, TAU); c.fill();
          if (!glow) { c.fillStyle = "#1b1b22"; c.beginPath(); c.arc(x + dx + r * 0.05, y + Math.sin(e.dir) * r * 0.04, r * 0.08 * k, 0, TAU); c.fill(); }
        }
      };
      const dark = alpha("#000000", 0.25);
      if (e.type === "grunt") {
        legs(r * 0.35, r * 0.25, P.iron);
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.85, 0, TAU); c.fill();
        c.fillStyle = dark; c.beginPath(); c.arc(0, r * 0.15, r * 0.85, 0.2, Math.PI - 0.2); c.fill();
        c.fillStyle = P.night ? "#8d96a3" : "#a6aeb8"; c.beginPath(); c.arc(0, -r * 0.15, r * 0.82, Math.PI, TAU); c.fill();
        c.fillRect(-r * 0.95, -r * 0.2, r * 1.9, r * 0.18);
        eyes(r * 0.12, r * 0.12);
        c.strokeStyle = P.stoneTop; c.lineWidth = r * 0.14; c.lineCap = "round";
        c.beginPath(); c.moveTo(r * 0.95, r * 0.35); c.lineTo(r * 1.25, -r * 0.55); c.stroke();
      } else if (e.type === "fast") {
        c.strokeStyle = alpha(col, 0.5); c.lineWidth = r * 0.12; c.lineCap = "round";
        for (const y of [-0.3, 0.1, 0.45]) { c.beginPath(); c.moveTo(-r * 1.1, y * r); c.lineTo(-r * (1.6 + Math.random() * 0.5), y * r); c.stroke(); }
        legs(r * 0.3, r * 0.45, P.iron);
        c.rotate(0.18);
        c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r * 0.95, r * 0.75, 0, 0, TAU); c.fill();
        c.fillStyle = dark; c.beginPath(); c.moveTo(-r * 0.6, -r * 0.55); c.lineTo(-r * 1.25, -r * 0.95); c.lineTo(-r * 0.2, -r * 0.7); c.fill();
        eyes(r * 0.2, -r * 0.05);
      } else if (e.type === "tank") {
        legs(r * 0.4, r * 0.18, P.iron);
        c.fillStyle = col; c.beginPath(); c.roundRect(-r * 0.85, -r * 0.8, r * 1.7, r * 1.55, r * 0.35); c.fill();
        c.fillStyle = P.hi; c.fillRect(-r * 0.7, -r * 0.65, r * 1.4, r * 0.18);
        c.fillStyle = P.iron; c.fillRect(-r * 0.1, -r * 0.35, r * 0.85, r * 0.18);
        c.fillStyle = P.night ? "#9aa3ae" : "#d5dae0"; c.strokeStyle = P.iron; c.lineWidth = r * 0.07;
        c.beginPath(); c.roundRect(r * 0.55, -r * 0.55, r * 0.55, r * 1.25, r * 0.25); c.fill(); c.stroke();
        c.fillStyle = theme.red; c.fillRect(r * 0.73, -r * 0.2, r * 0.2, r * 0.55);
      } else if (e.type === "flyer") {
        const fl = Math.sin(now * 16 + e.id) * 0.7;
        c.fillStyle = alpha(col, 0.85);
        for (const sgn of [-1, 1]) {
          c.save(); c.scale(1, sgn); c.rotate(-fl * 0.5);
          c.beginPath(); c.moveTo(0, -r * 0.2); c.quadraticCurveTo(-r * 0.6, -r * 1.9, -r * 1.9, -r * 1.2 - fl);
          c.quadraticCurveTo(-r * 1.3, -r * 0.8, -r * 1.1, -r * 0.55); c.quadraticCurveTo(-r * 0.8, -r * 0.6, -r * 0.6, -r * 0.3); c.fill();
          c.restore();
        }
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.68, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(r * 0.1, -r * 0.5); c.lineTo(r * 0.3, -r * 0.95); c.lineTo(r * 0.5, -r * 0.4); c.fill();
        eyes(r * 0.05, -r * 0.05, 0.9);
      } else if (e.type === "healer") {
        c.fillStyle = alpha(col, 0.85); c.beginPath(); c.moveTo(-r * 0.75, r * 0.85); c.lineTo(-r * 0.45, -r * 0.4); c.lineTo(r * 0.45, -r * 0.4); c.lineTo(r * 0.75, r * 0.85); c.fill();
        c.fillStyle = col; c.beginPath(); c.arc(0, -r * 0.35, r * 0.62, 0, TAU); c.fill();
        c.fillStyle = dark; c.beginPath(); c.arc(0, -r * 0.35, r * 0.62, Math.PI * 1.05, Math.PI * 1.95); c.fill();
        eyes(r * 0.02, -r * 0.3);
        c.strokeStyle = P.woodDark; c.lineWidth = r * 0.12;
        c.beginPath(); c.moveTo(r * 0.9, r * 0.9); c.lineTo(r * 0.9, -r * 1.1); c.stroke();
        const gl = 0.6 + Math.sin(now * 5 + e.id) * 0.3;
        c.fillStyle = alpha(theme.green, gl); c.beginPath(); c.arc(r * 0.9, -r * 1.25, r * 0.32, 0, TAU); c.fill();
      } else if (e.type === "slime" || e.type === "slimelet") {
        const sq = Math.sin(now * 7 + e.id) * 0.12;
        c.scale(1 + sq, 1 - sq);
        c.fillStyle = col; c.beginPath(); c.moveTo(-r, r * 0.75); c.bezierCurveTo(-r * 1.1, -r * 1.1, r * 1.1, -r * 1.1, r, r * 0.75); c.closePath(); c.fill();
        c.fillStyle = dark; c.fillRect(-r * 0.95, r * 0.55, r * 1.9, r * 0.2);
        c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.ellipse(-r * 0.35, -r * 0.35, r * 0.22, r * 0.14, -0.6, 0, TAU); c.fill();
        eyes(r * 0.05, -r * 0.05);
      } else if (e.type === "ogre") {
        legs(r * 0.4, r * 0.2, P.woodDark);
        c.fillStyle = col; c.beginPath(); c.ellipse(0, 0, r * 0.95, r * 0.9, 0, 0, TAU); c.fill();
        c.fillStyle = P.hi; c.beginPath(); c.ellipse(-r * 0.1, r * 0.25, r * 0.5, r * 0.4, 0, 0, TAU); c.fill();
        eyes(r * 0.15, -r * 0.3, 0.8);
        c.fillStyle = "#fffaf0";
        for (const x of [r * 0.2, r * 0.6]) { c.beginPath(); c.moveTo(x - r * 0.08, r * 0.05); c.lineTo(x, -r * 0.18); c.lineTo(x + r * 0.08, r * 0.05); c.fill(); }
        c.save(); c.translate(r * 0.75, r * 0.1); c.rotate(-0.6 + Math.sin(ph * 2) * 0.35);
        c.fillStyle = P.woodDark; c.beginPath(); c.roundRect(-r * 0.12, -r * 1.35, r * 0.3, r * 1.4, r * 0.12); c.fill();
        c.beginPath(); c.ellipse(0.03, -r * 1.3, r * 0.3, r * 0.4, 0, 0, TAU); c.fill();
        c.restore();
      } else if (e.type === "boss") {
        c.fillStyle = alpha(theme.violet, 0.5);
        c.beginPath(); c.moveTo(-r * 0.6, -r * 0.5); c.quadraticCurveTo(-r * 1.6, r * 0.2 + Math.sin(now * 3) * r * 0.1, -r * 1.1, r * 0.95); c.lineTo(r * 0.3, r * 0.6); c.fill();
        legs(r * 0.35, r * 0.15, P.iron);
        c.fillStyle = col; c.beginPath(); c.arc(0, 0, r * 0.9, 0, TAU); c.fill();
        c.fillStyle = dark; c.beginPath(); c.arc(0, 0, r * 0.9, 0.3, Math.PI - 0.3); c.fill();
        eyes(r * 0.12, -r * 0.15, 1, theme.gold);
        c.fillStyle = theme.gold;
        c.beginPath(); c.moveTo(-r * 0.6, -r * 0.65); c.lineTo(-r * 0.6, -r * 1.3); c.lineTo(-r * 0.3, -r * 0.95); c.lineTo(0, -r * 1.4); c.lineTo(r * 0.3, -r * 0.95); c.lineTo(r * 0.6, -r * 1.3); c.lineTo(r * 0.6, -r * 0.65); c.fill();
        c.fillStyle = theme.red; c.beginPath(); c.arc(0, -r * 0.85, r * 0.1, 0, TAU); c.fill();
      }
      c.restore();
      if (c !== g) return;
      // stany: trafienie, spowolnienie, lód, ogłuszenie
      const cy = e.y - bob - lift;
      if (e.frozen > 0) {
        c.fillStyle = "rgba(200,236,255,0.55)"; c.strokeStyle = "rgba(255,255,255,0.9)"; c.lineWidth = 0.3;
        c.beginPath(); c.roundRect(e.x - r * 1.2, cy - r * 1.15, r * 2.4, r * 2.2, r * 0.4); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(e.x - r * 0.7, cy - r * 0.8); c.lineTo(e.x - r * 0.2, cy - r * 0.3); c.stroke();
      } else if (e.slow > 0) {
        c.fillStyle = alpha(theme.blue, 0.22); c.beginPath(); c.arc(e.x, cy, r * 1.05, 0, TAU); c.fill();
      } else if (e.stun > 0) {
        for (let k = 0; k < 3; k++) { const a = now * 6 + (k * TAU) / 3; star(c, e.x + Math.cos(a) * r * 0.9, cy - r * 1.3 + Math.sin(a) * r * 0.3, 0.6, theme.yellow); }
      }
      if (e.hitT > 0) { c.fillStyle = `rgba(255,255,255,${(e.hitT / 0.12) * 0.55})`; c.beginPath(); c.arc(e.x, cy, r * 0.95, 0, TAU); c.fill(); }
      // pasek zdrowia (z tarczą dla pancernych)
      if (e.hp < e.max && e.type !== "boss") {
        const w = Math.max(7, r * 2.4), x = e.x - w / 2, y = cy - r - 2.8, fr = Math.max(0, e.hp / e.max);
        c.fillStyle = "rgba(0,0,0,0.5)"; c.beginPath(); c.roundRect(x - 0.25, y - 0.25, w + 0.5, 1.6, 0.8); c.fill();
        c.fillStyle = fr > 0.5 ? theme.ok : fr > 0.25 ? theme.warn : theme.bad;
        c.beginPath(); c.roundRect(x, y, w * fr, 1.1, 0.55); c.fill();
        if (e.armor && !(e.brittle > 0)) {
          c.fillStyle = P.stoneTop; c.strokeStyle = P.iron; c.lineWidth = 0.2;
          c.beginPath(); c.moveTo(x - 2.4, y - 0.6); c.lineTo(x - 0.8, y - 0.6); c.lineTo(x - 0.8, y + 0.8); c.lineTo(x - 1.6, y + 1.6); c.lineTo(x - 2.4, y + 0.8); c.closePath(); c.fill(); c.stroke();
        }
      }
    }

    // --- zamek z bramą i portale wejściowe ---
    function drawCastle(now) {
      const [gx, gy] = s.paths[0].pts[s.paths[0].pts.length - 1];
      const hit = v.gateHit;
      g.fillStyle = P.shadow; g.beginPath(); g.ellipse(gx - 4, gy + 14, 7, 2.2, 0, 0, TAU); g.fill();
      g.fillStyle = P.stoneSide; g.fillRect(gx - 8, gy - 11, 8, 24);
      g.fillStyle = P.stone; g.fillRect(gx - 8, gy - 12, 7, 23);
      for (let k = 0; k < 5; k++) { g.fillStyle = P.stone; g.fillRect(gx - 9.4, gy - 11 + k * 4.6, 1.6, 2.6); }
      g.strokeStyle = P.stoneLine; g.lineWidth = 0.2;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(gx - 8, gy - 8 + k * 4.2); g.lineTo(gx - 1, gy - 8 + k * 4.2); g.stroke(); }
      // brama: łuk, krata, błysk przy trafieniu
      g.fillStyle = hit > 0 ? alpha(theme.red, 0.5 + hit) : "#2a1d14";
      g.beginPath(); g.moveTo(gx - 8.2, gy + 4); g.lineTo(gx - 8.2, gy - 1.5); g.arc(gx - 4.6, gy - 1.5, 3.6, Math.PI, TAU); g.lineTo(gx - 1, gy + 4); g.fill();
      g.strokeStyle = P.night ? "#6f6a63" : "#4a4038"; g.lineWidth = 0.35;
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(gx - 7.4 + k * 1.9, gy - 4); g.lineTo(gx - 7.4 + k * 1.9, gy + 4); g.stroke(); }
      for (const ty of [gy - 12, gy + 13]) {
        g.fillStyle = P.stoneSide; g.beginPath(); g.ellipse(gx - 4.5, ty + 3.2, 4, 1.6, 0, 0, TAU); g.fill();
        g.fillStyle = P.stone; g.fillRect(gx - 8.5, ty - 2, 8, 5.2);
        g.fillStyle = theme.c; g.beginPath(); g.moveTo(gx - 9.4, ty - 2); g.lineTo(gx - 4.5, ty - 7.5); g.lineTo(gx + 0.4, ty - 2); g.fill();
        g.fillStyle = alpha("#000000", 0.18); g.beginPath(); g.moveTo(gx - 4.5, ty - 7.5); g.lineTo(gx + 0.4, ty - 2); g.lineTo(gx - 4.5, ty - 2); g.fill();
        g.strokeStyle = P.iron; g.lineWidth = 0.25; g.beginPath(); g.moveTo(gx - 4.5, ty - 7.5); g.lineTo(gx - 4.5, ty - 10.5); g.stroke();
        const wv = Math.sin(now * 5 + ty) * 0.6;
        g.fillStyle = theme.gold; g.beginPath(); g.moveTo(gx - 4.5, ty - 10.5); g.quadraticCurveTo(gx - 6.5, ty - 10.1 + wv, gx - 8.4, ty - 9.7 + wv * 1.4); g.lineTo(gx - 4.5, ty - 8.7); g.fill();
        if (P.night) {
          const fl = 0.5 + Math.sin(now * 13 + ty) * 0.1 + Math.random() * 0.08, gr = g.createRadialGradient(gx - 4.5, ty + 0.5, 0, gx - 4.5, ty + 0.5, 6);
          gr.addColorStop(0, alpha(theme.gold, fl)); gr.addColorStop(1, alpha(theme.gold, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(gx - 4.5, ty + 0.5, 6, 0, TAU); g.fill();
        }
        g.fillStyle = P.night ? theme.gold : "#2a1d14"; g.fillRect(gx - 5.1, ty - 0.6, 1.2, 1.8);
      }
    }
    function drawPortals(now) {
      s.paths.forEach((p, k) => {
        if (k && p.pts[0][1] === s.paths[0].pts[0][1]) return;
        const [x, y] = p.pts[0], pu = v.spawnPulse[k] || 0;
        const gr = g.createRadialGradient(x, y, 0, x, y, 7 + pu * 3);
        gr.addColorStop(0, alpha(theme.violet, 0.55 + pu * 0.3)); gr.addColorStop(1, alpha(theme.violet, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 7 + pu * 3, 0, TAU); g.fill();
        g.fillStyle = "#1d1426"; g.beginPath(); g.ellipse(x, y, 2.4, 4.4, 0, 0, TAU); g.fill();
        g.strokeStyle = alpha(theme.violet, 0.9); g.lineWidth = 0.4;
        for (let a = 0; a < 3; a++) { g.beginPath(); g.ellipse(x, y, 1.9 - a * 0.5, 3.8 - a * 1, 0, now * (2 + a) + a, now * (2 + a) + a + 2.6); g.stroke(); }
      });
    }

    // --- pociski ---
    function drawShot(p) {
      const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
      if (p.type === "archer") {
        g.save(); g.translate(p.x, p.y); g.rotate(ang);
        if (p.crit) { g.fillStyle = alpha(theme.gold, 0.45); g.beginPath(); g.ellipse(-1, 0, 3, 0.9, 0, 0, TAU); g.fill(); }
        g.strokeStyle = p.crit ? theme.gold : P.woodDark; g.lineWidth = 0.32;
        g.beginPath(); g.moveTo(-2.8, 0); g.lineTo(1, 0); g.stroke();
        g.fillStyle = P.iron; g.beginPath(); g.moveTo(1.6, 0); g.lineTo(0.7, -0.45); g.lineTo(0.7, 0.45); g.fill();
        g.fillStyle = theme.red; g.beginPath(); g.moveTo(-2.8, 0); g.lineTo(-2.2, -0.5); g.lineTo(-1.9, 0); g.lineTo(-2.2, 0.5); g.fill();
        g.restore();
      } else if (p.type === "cannon") {
        const left = Math.hypot(p.tx - p.x, p.ty - p.y), f = Math.max(0, Math.min(1, 1 - left / p.d0));
        const h = Math.sin(f * Math.PI) * Math.min(9, p.d0 * 0.32), sp = TD.spec(p.src) || {}, rr = sp.splash ? 1.7 : 1.3;
        g.fillStyle = P.shadow; g.beginPath(); g.ellipse(p.x, p.y + 0.6, rr * 0.9, rr * 0.45, 0, 0, TAU); g.fill();
        if (sp.burn) { const gr = g.createRadialGradient(p.x, p.y - h, 0, p.x, p.y - h, 3); gr.addColorStop(0, alpha(theme.orange, 0.8)); gr.addColorStop(1, alpha(theme.orange, 0)); g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y - h, 3, 0, TAU); g.fill(); }
        g.fillStyle = P.iron; g.beginPath(); g.arc(p.x, p.y - h, rr, 0, TAU); g.fill();
        g.fillStyle = P.hi; g.beginPath(); g.arc(p.x - rr * 0.35, p.y - h - rr * 0.35, rr * 0.35, 0, TAU); g.fill();
        p.hy = h;
      } else {
        g.save(); g.translate(p.x, p.y); g.rotate(ang);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 2.6);
        gr.addColorStop(0, alpha(theme.blue, 0.6)); gr.addColorStop(1, alpha(theme.blue, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill();
        g.fillStyle = "#eef9ff"; g.beginPath(); g.moveTo(1.6, 0); g.lineTo(0, -0.7); g.lineTo(-1.4, 0); g.lineTo(0, 0.7); g.fill();
        g.restore();
      }
    }

    // --- cząsteczki ---
    function part(o) {
      if (v.parts.length > (calm ? 140 : 600)) return;
      const q = { vx: 0, vy: 0, life: 0.6, size: 1, grav: 0, drag: 0, kind: "dot", rot: Math.random() * TAU, spin: rand(-6, 6), ...o };
      q.max = q.life;
      v.parts.push(q);
    }
    function burst(x, y, n, color, { speed = 20, life = 0.5, size = 0.8, grav = 0, kind = "dot", up = 0, drag = 2.5 } = {}) {
      for (let k = 0; k < (calm ? Math.ceil(n / 3) : n); k++) {
        const a = Math.random() * TAU, sp = speed * rand(0.35, 1);
        part({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - up, life: life * rand(0.6, 1.2), size: size * rand(0.6, 1.3), color, grav, kind, drag });
      }
    }
    const smoke = (x, y, n, size = 1.4, col) => burst(x, y, n, col || (P.night ? "#9aa0a8" : "#d8d4cc"), { speed: 6, life: 0.9, size, kind: "smoke", up: 4, drag: 1.5 });
    const floatText = (x, y, text, color, size = 3.4) => part({ x, y, vy: -9, drag: 1.8, life: 0.95, kind: "text", text, color, size });
    function drawParts(dt) {
      for (const q of v.parts) {
        q.life -= dt;
        q.vx *= Math.max(0, 1 - q.drag * dt);
        q.vy = q.vy * Math.max(0, 1 - q.drag * dt) + q.grav * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.rot += q.spin * dt;
      }
      v.parts = v.parts.filter((q) => q.life > 0);
      for (const q of v.parts) {
        const f = q.life / q.max;
        g.globalAlpha = Math.min(1, f * 1.6);
        if (q.kind === "dot") { g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size * (0.4 + f * 0.6), 0, TAU); g.fill(); }
        else if (q.kind === "smoke") { g.globalAlpha = f * 0.45; g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size * (1 + (1 - f) * 1.6), 0, TAU); g.fill(); }
        else if (q.kind === "spark") { g.strokeStyle = q.color; g.lineWidth = q.size * 0.35; g.lineCap = "round"; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); g.stroke(); }
        else if (q.kind === "chip") { g.save(); g.translate(q.x, q.y); g.rotate(q.rot); g.fillStyle = q.color; g.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * 0.7); g.restore(); }
        else if (q.kind === "flake") { g.strokeStyle = q.color; g.lineWidth = 0.18; g.save(); g.translate(q.x, q.y); g.rotate(q.rot); for (let k = 0; k < 3; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-q.size, 0); g.lineTo(q.size, 0); g.stroke(); } g.restore(); }
        else if (q.kind === "plus") { g.fillStyle = q.color; g.fillRect(q.x - q.size, q.y - q.size * 0.3, q.size * 2, q.size * 0.6); g.fillRect(q.x - q.size * 0.3, q.y - q.size, q.size * 0.6, q.size * 2); }
        else if (q.kind === "ring") { g.strokeStyle = q.color; g.lineWidth = 0.5 * f + 0.1; g.beginPath(); g.arc(q.x, q.y, q.size * (1 - f) + 0.5, 0, TAU); g.stroke(); }
        else if (q.kind === "text") {
          const pop = f > 0.85 ? 1 + (f - 0.85) * 3 : 1;
          g.shadowColor = "rgba(0,0,0,0.45)"; g.shadowBlur = 3;
          cv.text(q.text, q.x, q.y, { size: q.size * pop, weight: 750, color: q.color });
          g.shadowBlur = 0;
        }
      }
      g.globalAlpha = 1;
    }
    function drawBolts(dt) {
      for (const b of v.bolts) b.t -= dt;
      v.bolts = v.bolts.filter((b) => b.t > 0);
      for (const b of v.bolts) {
        const f = b.t / b.max;
        const path = [];
        b.pts.forEach(([x, y], k) => {
          if (k) { const [px, py] = b.pts[k - 1]; for (let j = 1; j < 4; j++) { const u = j / 4, n = (Math.random() - 0.5) * 3; path.push([px + (x - px) * u - ((y - py) / 10) * n, py + (y - py) * u + ((x - px) / 10) * n]); } }
          path.push([x, y]);
        });
        for (const [w, col, a] of [[2.2, b.col, 0.3], [0.9, b.col, 0.9], [0.35, "#ffffff", 1]]) {
          g.globalAlpha = a * f; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round";
          g.beginPath(); path.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
        }
      }
      for (const t of v.tracers) t.t -= dt;
      v.tracers = v.tracers.filter((t) => t.t > 0);
      for (const t of v.tracers) {
        const f = t.t / t.max;
        g.globalAlpha = f; g.strokeStyle = t.col; g.lineWidth = 0.9 * f + 0.2;
        g.beginPath(); g.moveTo(t.x1, t.y1); g.lineTo(t.x2, t.y2); g.stroke();
        g.strokeStyle = "#ffffff"; g.lineWidth = 0.25; g.stroke();
      }
      g.globalAlpha = 1;
    }
    function drawDecals(dt) {
      for (const d of v.decals) d.t -= dt;
      v.decals = v.decals.filter((d) => d.t > 0);
      for (const d of v.decals) {
        const gr = g.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        gr.addColorStop(0, alpha(d.col, 0.4 * Math.min(1, d.t))); gr.addColorStop(1, alpha(d.col, 0));
        g.fillStyle = gr; g.beginPath(); g.ellipse(d.x, d.y, d.r, d.r * 0.75, 0, 0, TAU); g.fill();
      }
    }
    function drawMeteors(dt) {
      for (const m of v.meteors) {
        m.t -= dt;
        const f = Math.max(0, 1 - m.t / m.max), e2 = f * f;
        g.strokeStyle = alpha(theme.red, 0.5 + Math.sin(v.now * 18) * 0.25); g.lineWidth = 0.5; g.setLineDash([1.5, 1]);
        g.beginPath(); g.arc(m.x, m.y, SPELLS.meteor.r * (1.15 - f * 0.15), 0, TAU); g.stroke(); g.setLineDash([]);
        for (const [ox, oy, d] of m.rocks) {
          const x = m.x + ox + (35 - ox) * (1 - e2), y = m.y + oy - 80 * (1 - e2) * (1 + d);
          if (y > m.y + oy) continue;
          part({ x, y, vx: rand(-3, 3), vy: rand(-3, 3), life: 0.35, size: 1.2, color: theme.orange, kind: "dot", drag: 3 });
          const gr = g.createRadialGradient(x, y, 0, x, y, 4);
          gr.addColorStop(0, alpha(theme.gold, 0.9)); gr.addColorStop(1, alpha(theme.orange, 0));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill();
          g.fillStyle = P.woodDark; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
        }
      }
      v.meteors = v.meteors.filter((m) => m.t > 0);
    }
    function drawBanners(dt) {
      for (const b of v.banners) b.t += dt;
      v.banners = v.banners.filter((b) => b.t < b.max);
      const b = v.banners[0];
      if (!b) return;
      const inn = ease(Math.min(1, b.t / 0.35)), out = Math.min(1, (b.max - b.t) / 0.4);
      const y = 4 + inn * 6 - (1 - out) * 4, w = b.w || 70;
      g.globalAlpha = Math.min(inn, out);
      g.shadowColor = "rgba(0,0,0,0.25)"; g.shadowBlur = 8;
      g.fillStyle = theme.surface; g.beginPath(); g.roundRect(W / 2 - w / 2, y, w, b.sub ? 13 : 8.5, 4.2); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = b.col; g.beginPath(); g.roundRect(W / 2 - w / 2, y, 2.2, b.sub ? 13 : 8.5, [4.2, 0, 0, 4.2]); g.fill();
      cv.text(b.text, W / 2 + 1, y + 4.4, { size: 4.2, weight: 750, color: b.col });
      if (b.sub) cv.text(b.sub, W / 2 + 1, y + 9.4, { size: 2.8, weight: 550, color: "muted" });
      g.globalAlpha = 1;
    }
    const banner = (text, sub, col, max = 2.2) => { v.banners = v.banners.filter((b) => b.t < 0.3 || b.max - b.t > 0.4).slice(-1); v.banners.push({ text, sub, col, t: 0, max, w: Math.max(54, text.length * 2.6 + 18, (sub || "").length * 1.6 + 16) }); };

    // --- zdarzenia logiki: efekty i dźwięki ---
    const sndOk = () => { if (v.now - v.sndT < 0.07) return false; v.sndT = v.now; return true; };
    function onEvent(ev) {
      const k = ev.k;
      if (k === "build") { const t = ev.t; t.grow = 0; t.aimS = -Math.PI / 2; smoke(t.x, t.y + 2, 8, 1.2); part({ x: t.x, y: t.y, kind: "ring", size: 7, life: 0.45, color: theme.c }); Sound.place(4); }
      else if (k === "upgrade") { const t = ev.t; t.pulse = 1; burst(t.x, t.y, 18, theme.gold, { speed: 14, up: 10, life: 0.8, size: 0.6, kind: "spark", drag: 3 }); part({ x: t.x, y: t.y, kind: "ring", size: 9, life: 0.5, color: theme.gold }); Sound.line(); if (t.tier === 2) ctx.achieve("mistrz"); }
      else if (k === "sell") { const t = ev.t; smoke(t.x, t.y, 12, 1.6); burst(t.x, t.y, 10, P.stone, { speed: 14, grav: 40, kind: "chip", size: 0.9 }); floatText(t.x, t.y - 4, `+${TD.sellValue(t)}`, "gold"); Sound.erase(); }
      else if (k === "fire") {
        const t = ev.t, a = t.aimS ?? 0;
        if (t.type === "cannon") { const mx = t.x + Math.cos(a) * 5, my = t.y - 1.2 + Math.sin(a) * 5; burst(mx, my, 5, theme.gold, { speed: 18, life: 0.18, size: 0.9, kind: "spark" }); smoke(mx, my, 3, 1); if (sndOk()) Sound.tap(); }
        else if (t.type === "frost") burst(t.x, t.y - 3, 4, "#ffffff", { speed: 8, life: 0.5, size: 0.7, kind: "flake" });
      }
      else if (k === "blast") {
        if (ev.type === "frost") { burst(ev.x, ev.y, 14, "#ffffff", { speed: 22, life: 0.6, size: 0.8, kind: "flake" }); part({ x: ev.x, y: ev.y, kind: "ring", size: ev.r, life: 0.4, color: theme.blue }); }
        else {
          const fire = ev.spec === "ogien";
          part({ x: ev.x, y: ev.y, kind: "ring", size: ev.r, life: 0.35, color: fire ? theme.orange : "#ffffff" });
          burst(ev.x, ev.y, 10, fire ? theme.orange : theme.gold, { speed: 26, life: 0.3, size: 1, kind: "spark" });
          smoke(ev.x, ev.y, 6, 1.6);
          burst(ev.x, ev.y, 5, P.roadEdge, { speed: 18, grav: 50, up: 14, kind: "chip", size: 0.8 });
          v.decals.push({ x: ev.x, y: ev.y, r: ev.r * 0.6, t: 2.5, col: fire ? theme.orange : "#000000" });
          if (ev.spec === "mozdzierz") v.shake = Math.max(v.shake, 0.6);
        }
      }
      else if (k === "hit") { burst(ev.x, ev.y, ev.crit ? 8 : 3, ev.crit ? theme.gold : P.stoneTop, { speed: 16, life: 0.25, size: 0.7, kind: "spark" }); if (ev.crit) floatText(ev.x, ev.y - 4, "×2", "gold", 3); }
      else if (k === "bolt") { v.bolts.push({ pts: ev.pts, t: 0.22, max: 0.22, col: theme[TOWERS.tesla.color] }); ev.pts.slice(1).forEach(([x, y]) => burst(x, y, 4, "#ffffff", { speed: 18, life: 0.2, size: 0.6, kind: "spark" })); if (sndOk()) Sound.tap(); }
      else if (k === "snipe") { const t = ev.t, a = Math.atan2(ev.y - t.y, ev.x - t.x); v.tracers.push({ x1: t.x + Math.cos(a) * 6, y1: t.y - 1.2 + Math.sin(a) * 6, x2: ev.x, y2: ev.y, t: 0.2, max: 0.2, col: theme.orange }); burst(ev.x, ev.y, 6, theme.orange, { speed: 20, life: 0.3, size: 0.8, kind: "spark" }); smoke(t.x + Math.cos(a) * 6, t.y - 1.2 + Math.sin(a) * 6, 2, 0.8); }
      else if (k === "execute") floatText(ev.e.x, ev.e.y - 6, "Dobity", "orange", 3);
      else if (k === "die") {
        const e = ev.e, col = theme[ENEMIES[e.type].color], big = ENEMIES[e.type].big;
        burst(e.x, e.y, big ? 30 : 12, col, { speed: big ? 30 : 20, life: 0.55, size: big ? 1.3 : 0.9, grav: 20 });
        burst(e.x, e.y, big ? 10 : 4, "#ffffff", { speed: 14, life: 0.3, size: 0.6, kind: "spark" });
        if (e.type === "slime") burst(e.x, e.y, 8, col, { speed: 12, grav: 40, up: 10, size: 1.1 });
        floatText(e.x, e.y - e.r - 2, `+${e.gold}`, "gold", big ? 4.2 : 3);
        if (big) { v.shake = Math.max(v.shake, e.type === "boss" ? 2 : 1); part({ x: e.x, y: e.y, kind: "ring", size: 14, life: 0.6, color: col }); }
        if (sndOk()) Sound.place(1 + (s.kills % 6));
      }
      else if (k === "gate") {
        v.gateHit = 0.5; v.shake = Math.max(v.shake, ev.lost > 1 ? 2.2 : 1.2); v.flash = { col: theme.red, t: 0.35, max: 0.35 };
        const [gx, gy] = s.paths[0].pts[s.paths[0].pts.length - 1];
        burst(gx - 6, gy, 12, P.stone, { speed: 20, grav: 50, kind: "chip", size: 0.9 });
        floatText(gx - 9, gy - 8, `−${ev.lost}`, "red", 4.4);
        Sound.error();
      }
      else if (k === "spawn") { const idx = s.paths.indexOf(ev.e.path); v.spawnPulse[idx] = 1; ev.e.spawnT = 0; }
      else if (k === "wave") {
        if (ev.boss) banner("Nadciąga Władca", `Fala ${ev.n} z ${lv.waves}, ostatnia`, theme.violet, 3);
        else banner(`Fala ${ev.n} z ${lv.waves}`, ev.ogre ? "Uwaga: idzie ogr" : null, ev.ogre ? theme.orange : theme.c);
        Sound.flag();
      }
      else if (k === "cleared") { banner("Fala odparta", `Nagroda: ${ev.bonus} zł`, theme.ok, 1.8); Sound.line(); }
      else if (k === "meteor") { const rocks = [[0, 0, 0], [rand(-6, 6), rand(-5, 5), 0.15], [rand(-6, 6), rand(-5, 5), 0.3]]; v.meteors.push({ x: ev.x, y: ev.y, t: ev.t, max: ev.t, rocks }); Sound.flag(); }
      else if (k === "impact") {
        v.shake = Math.max(v.shake, 2.4); v.flash = { col: theme.orange, t: 0.25, max: 0.25 };
        part({ x: ev.x, y: ev.y, kind: "ring", size: ev.r * 1.4, life: 0.5, color: theme.gold });
        burst(ev.x, ev.y, 30, theme.orange, { speed: 40, life: 0.5, size: 1.2, kind: "spark" });
        burst(ev.x, ev.y, 14, P.woodDark, { speed: 30, grav: 60, up: 20, kind: "chip", size: 1.2 });
        smoke(ev.x, ev.y, 14, 2.4);
        v.decals.push({ x: ev.x, y: ev.y, r: ev.r, t: 4, col: "#000000" });
        Sound.place(1);
      }
      else if (k === "freeze") {
        v.flash = { col: theme.blue, t: 0.5, max: 0.5 };
        for (let n = 0; n < (calm ? 15 : 60); n++) part({ x: rand(0, W), y: rand(-10, H), vx: rand(-4, 4), vy: rand(6, 14), life: rand(1, 2), size: rand(0.5, 1), color: "#ffffff", kind: "flake" });
        for (const e of s.enemies) burst(e.x, e.y, 5, "#ffffff", { speed: 10, life: 0.6, kind: "flake", size: 0.7 });
        Sound.flag();
      }
      else if (k === "summon") { part({ x: ev.e.x, y: ev.e.y, kind: "ring", size: 12, life: 0.6, color: theme.violet }); burst(ev.e.x, ev.e.y, 12, theme.violet, { speed: 20, life: 0.5 }); }
      else if (k === "pogrom") ctx.achieve("pogrom");
    }

    // --- rysowanie klatki ---
    function frame(dt) {
      v.now += dt;
      const now = v.now;
      P.night !== night() && (bgKey = "");
      g.save();
      if (v.shake > 0 && !calm) { g.translate((Math.random() - 0.5) * v.shake, (Math.random() - 0.5) * v.shake); }
      v.shake = Math.max(0, v.shake - dt * 6);
      drawBg();
      drawDecals(dt);
      drawPortals(now);
      for (let k = 0; k < v.spawnPulse.length; k++) v.spawnPulse[k] = Math.max(0, v.spawnPulse[k] - dt * 2);
      // siatka wolnych pól w trybie budowy
      if (v.build) {
        g.strokeStyle = P.night ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.5)"; g.lineWidth = 0.25;
        for (let i = 0; i < COLS * ROWS; i++) if (TD.canBuild(s, i)) { g.beginPath(); g.roundRect((i % COLS) * S + 0.8, ((i / COLS) | 0) * S + 0.8, S - 1.6, S - 1.6, 1.6); g.stroke(); }
      }
      // aura szamanów i zamieci
      for (const e of s.enemies) if (ENEMIES[e.type].heal) {
        g.fillStyle = alpha(theme.green, 0.07 + Math.sin(now * 4 + e.id) * 0.03); g.strokeStyle = alpha(theme.green, 0.3); g.lineWidth = 0.25;
        g.beginPath(); g.arc(e.x, e.y, 14, 0, TAU); g.fill(); g.stroke();
      }
      for (const t of s.towers) if (t.spec === 0 && t.type === "frost") {
        const r = TD.stat(t, "range");
        g.fillStyle = alpha(theme.blue, t.active ? 0.1 : 0.04); g.beginPath(); g.arc(t.x, t.y, r, 0, TAU); g.fill();
        if (t.active && Math.random() < dt * 25) { const a = Math.random() * TAU, d = Math.random() * r; part({ x: t.x + Math.cos(a) * d, y: t.y + Math.sin(a) * d, vx: -Math.sin(a) * 10, vy: Math.cos(a) * 10, life: 0.8, size: 0.6, color: "#ffffff", kind: "flake" }); }
      }
      // zasięg wybranej wieży
      const ringAt = (x, y, r, col, fill) => {
        g.fillStyle = alpha(col, fill); g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = alpha(col, 0.85); g.lineWidth = 0.4; g.setLineDash([2, 1.4]); g.lineDashOffset = -now * 3;
        g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      };
      if (v.sel) { ringAt(v.sel.x, v.sel.y, TD.stat(v.sel, "range"), "#ffffff", 0.16); g.strokeStyle = theme.c; g.lineWidth = 0.5; g.beginPath(); g.roundRect(v.sel.x - S / 2 + 0.3, v.sel.y - S / 2 + 0.3, S - 0.6, S - 0.6, 2); g.stroke(); }
      // wieże i wrogowie od góry do dołu, żeby się poprawnie zasłaniały
      for (const t of s.towers) {
        if (t.grow != null && t.grow < 1) t.grow = Math.min(1, t.grow + dt * 2.6);
        if (t.pulse) t.pulse = Math.max(0, t.pulse - dt * 2.5);
        if (t.aimTo != null) { let d = t.aimTo - t.aimS; d = Math.atan2(Math.sin(d), Math.cos(d)); t.aimS += d * Math.min(1, dt * 14); }
      }
      for (const e of s.enemies) {
        if (e.spawnT != null && e.spawnT < 1) e.spawnT = Math.min(1, e.spawnT + dt * 3);
        if (e.burnT > 0 && Math.random() < dt * 30) part({ x: e.x + rand(-e.r, e.r) * 0.6, y: e.y - e.r * 0.3, vy: -10, vx: rand(-2, 2), life: 0.45, size: 0.8, color: Math.random() < 0.5 ? theme.orange : theme.gold, drag: 1 });
        if (ENEMIES[e.type].heal && Math.random() < dt * 3) { const q = s.enemies[(Math.random() * s.enemies.length) | 0]; if (q && q.hp < q.max && Math.hypot(q.x - e.x, q.y - e.y) < 14) part({ x: q.x, y: q.y - q.r, vy: -8, life: 0.7, size: 0.7, color: theme.green, kind: "plus", drag: 1 }); }
      }
      const ground = [...s.towers.map((t) => [t.y, 0, t]), ...s.enemies.filter((e) => !e.fly).map((e) => [e.y, 1, e])].sort((a, b) => a[0] - b[0]);
      for (const [, kind, o] of ground) kind ? drawEnemy(g, o, now) : drawTower(g, o, now);
      for (const p of s.shots) {
        drawShot(p);
        if (p.type === "cannon" && Math.random() < dt * 20) part({ x: p.x, y: p.y - (p.hy || 0), life: 0.4, size: 0.6, color: P.night ? "#9aa0a8" : "#bdb8ae", kind: "smoke", up: 0 });
        if (p.type === "frost" && Math.random() < dt * 25) part({ x: p.x, y: p.y, life: 0.35, size: 0.4, color: "#ffffff" });
      }
      for (const e of s.enemies) if (e.fly) drawEnemy(g, e, now);
      drawCastle(now);
      v.gateHit = Math.max(0, v.gateHit - dt);
      drawBolts(dt);
      drawMeteors(dt);
      drawParts(dt);
      // podgląd budowy albo celowania czarem
      if (v.hover >= 0 && !ctx.done) {
        const [hx, hy] = TD.center(v.hover);
        if (v.aim) ringAt(v.mouse[0], v.mouse[1], SPELLS.meteor.r, theme.red, 0.15);
        else if (v.build && !towerAt(v.hover)) {
          const ok = TD.canBuild(s, v.hover) && s.gold >= TOWERS[v.build].cost;
          ringAt(hx, hy, TOWERS[v.build].range, ok ? "#ffffff" : theme.red, ok ? 0.14 : 0.1);
          g.globalAlpha = ok ? 0.75 : 0.4;
          drawTower(g, { x: hx, y: hy, type: v.build, tier: 0, id: 0, aimS: -Math.PI / 4 }, now, true);
          g.globalAlpha = 1;
          if (!ok) { g.strokeStyle = theme.red; g.lineWidth = 0.7; g.beginPath(); g.moveTo(hx - 2.5, hy - 2.5); g.lineTo(hx + 2.5, hy + 2.5); g.moveTo(hx + 2.5, hy - 2.5); g.lineTo(hx - 2.5, hy + 2.5); g.stroke(); }
        } else if (towerAt(v.hover) && towerAt(v.hover) !== v.sel) { g.strokeStyle = alpha("#ffffff", 0.8); g.lineWidth = 0.35; g.beginPath(); g.roundRect(hx - S / 2 + 0.4, hy - S / 2 + 0.4, S - 0.8, S - 0.8, 2); g.stroke(); }
      }
      g.restore();
      // błysk całego ekranu (trafienie bramy, czar)
      if (v.flash) {
        v.flash.t -= dt;
        if (v.flash.t <= 0) v.flash = null;
        else {
          const f = v.flash.t / v.flash.max, gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.7);
          gr.addColorStop(0, alpha(v.flash.col, 0)); gr.addColorStop(1, alpha(v.flash.col, 0.45 * f));
          g.fillStyle = gr; g.fillRect(0, 0, W, H);
        }
      }
      // pasek zdrowia bossa
      const boss = s.enemies.find((e) => e.type === "boss");
      if (boss) {
        const w = 70, x = W / 2 - w / 2, y = H - 8, fr = Math.max(0, boss.hp / boss.max);
        g.fillStyle = alpha("#000000", 0.55); g.beginPath(); g.roundRect(x - 1, y - 1, w + 2, 4.2, 2); g.fill();
        g.fillStyle = theme.violet; g.beginPath(); g.roundRect(x, y, w * fr, 2.2, 1.1); g.fill();
        g.shadowColor = "rgba(0,0,0,0.5)"; g.shadowBlur = 3;
        cv.text(`Władca  ${Math.ceil(boss.hp)}`, W / 2, y - 3, { size: 3, weight: 700, color: "#ffffff" });
        g.shadowBlur = 0;
      }
      drawBanners(dt);
      if (!s.wave && !ctx.done && !v.banners.length) {
        const msg = v.build ? "Kliknij wolne pole, żeby postawić wieżę" : "Wybierz wieżę w panelu, potem wezwij falę";
        g.globalAlpha = 0.85 + Math.sin(now * 3) * 0.1;
        g.fillStyle = theme.surface; g.beginPath(); g.roundRect(W / 2 - 46, H - 13, 92, 8, 4); g.fill();
        cv.text(msg, W / 2, H - 9, { size: 3.3, weight: 600, color: "text" });
        g.globalAlpha = 1;
      }
      if (v.speed === 0 && !ctx.done) {
        g.fillStyle = alpha("#000000", 0.25); g.fillRect(0, 0, W, H);
        g.fillStyle = "#ffffff"; g.fillRect(W / 2 - 4, H / 2 - 5, 2.6, 10); g.fillRect(W / 2 + 1.4, H / 2 - 5, 2.6, 10);
        cv.text("Pauza", W / 2, H / 2 + 10, { size: 4, weight: 700, color: "#ffffff" });
      }
    }

    // --- panel ---
    const statsEl = el("div", "td-stats");
    const tiles = {};
    for (const [key, label] of [["gold", "Złoto"], ["lives", "Życia"], ["wave", "Fala"]]) {
      const d = el("div", `td-stat td-${key}`), b = el("b");
      const ic = svgEl("svg", { viewBox: "0 0 16 16", class: "td-ic", "aria-hidden": "true" }, d);
      svgEl("path", { d: { gold: "M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2zm0 2.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z", lives: "M8 14S2 10 2 5.8A3.3 3.3 0 0 1 8 4a3.3 3.3 0 0 1 6 1.8C14 10 8 14 8 14z", wave: "M3 14V2m0 1h9l-2 3 2 3H3" }[key] }, ic);
      d.append(el("small", "", label), b);
      statsEl.append(d);
      tiles[key] = b;
    }
    ctx.panel.append(panelBlock("", statsEl));

    // ikony wież i wrogów rysowane tą samą funkcją co na planszy
    let icons = [];
    function iconCanvas(draw, size = 34) {
      const c = el("canvas", "td-icon");
      c.setAttribute("aria-hidden", "true");
      c.style.width = c.style.height = `${size}px`;
      icons.push([c, draw, size]);
      paintIcon(c, draw, size);
      return c;
    }
    function paintIcon(c, draw, size) {
      const dpr = devicePixelRatio || 1;
      c.width = c.height = Math.round(size * dpr);
      const x = c.getContext("2d");
      x.setTransform((size * dpr) / 12, 0, 0, (size * dpr) / 12, 0, 0);
      draw(x);
    }
    function refreshIcons() { icons = icons.filter(([c]) => c.isConnected); for (const [c, draw, size] of icons) paintIcon(c, draw, size); }
    const towerIcon = (type, tier = 0, spec = null) => (x) => drawTower(x, { x: 6, y: type === "tesla" ? 7.4 : 6.6, type, tier, spec, id: 1, aimS: -Math.PI / 4 }, 0.5, true);
    const enemyIcon = (type) => (x) => { const E = ENEMIES[type], k = Math.min(1, 3.6 / E.r); x.translate(6, 6.6); x.scale(k, k); x.translate(-6, -6.6); drawEnemy(x, { type, id: 1, x: 6, y: 6.6, r: E.r, d: 0, dir: 0, face: 1, fly: !!E.fly, hp: 1, max: 1 }, 0.3); };

    const shop = el("div", "td-shop");
    const selBox = el("div", "td-sel");
    const block2 = panelBlock("Wieże", shop, selBox);
    const title2 = block2.querySelector(".panel-title");
    const shopGrid = el("div", "td-shop-grid"), shopNote = el("p", "panel-note td-shop-note");
    const shopBtns = Object.entries(TOWERS).map(([type, T], k) => {
      const b = button("", "td-buy", () => pickBuild(type));
      b.append(iconCanvas(towerIcon(type), 38), el("b", "", T.name), el("span", "td-cost", String(T.cost)), el("kbd", "td-key", String(k + 1)));
      b.setAttribute("aria-label", `${T.name}, ${T.cost} złota. ${T.desc}`);
      b.title = T.desc;
      shopGrid.append(b);
      return [type, b];
    });
    shop.append(shopGrid, shopNote);
    ctx.panel.append(block2);

    const spellBox = el("div", "td-spells");
    const spellBtns = Object.entries(SPELLS).map(([key, sp], k) => {
      const b = button("", "td-spell", () => useSpell(key));
      const ic = svgEl("svg", { viewBox: "0 0 16 16", class: "td-ic", "aria-hidden": "true" }, b);
      svgEl("path", { d: key === "meteor" ? "M10 6 14 2M7 5l4-4M11 9l4-4M6.5 9.5a3 3 0 1 1-.01 0z" : "M8 1v14M2 4.5l12 7M2 11.5l12-7M6 2.5l2 2 2-2M6 13.5l2-2 2 2" }, ic);
      const txt = el("span", "td-spell-txt");
      txt.append(el("b", "", sp.name), el("small", "", ""));
      b.append(txt);
      b.title = `${sp.desc} Klawisz ${k ? "W" : "Q"}.`;
      b.setAttribute("aria-label", `${sp.name}. ${sp.desc}`);
      spellBox.append(b);
      return [key, b, txt.lastChild];
    });
    ctx.panel.append(panelBlock("Czary", spellBox));

    const nextBox = el("div", "td-next");
    const waveBtn = button("", "btn wide td-wave", () => callWave());
    const speedSeg = segmented("Prędkość", ["Pauza", "×1", "×2", "×3"], (k) => setSpeed(k));
    speedSeg.set(1);
    // fala zaraz pod stanem: na telefonie przycisk jest widoczny bez przewijania panelu
    ctx.panel.insertBefore(panelBlock("Następna fala", nextBox, waveBtn, speedSeg.el), block2);

    function setSpeed(k) { v.speed = k; speedSeg.set(k); Sound.tap(); }
    function pickBuild(type) {
      if (ctx.done) return;
      v.build = v.build === type ? null : type;
      v.sel = null; v.aim = null; v.arm = -1;
      Sound.tap();
      render();
    }
    function useSpell(key) {
      if (ctx.done) return;
      if (s.cd[key] > 0) { Sound.error(); ctx.toast(`${SPELLS[key].name} jeszcze się ładuje`); return; }
      if (key === "meteor") { v.aim = v.aim ? null : "meteor"; v.build = null; v.sel = null; v.arm = -1; if (v.aim) ctx.toast("Wskaż miejsce ostrzału na mapie"); Sound.tap(); render(); return; }
      if (!s.enemies.length) { ctx.toast("Nie ma kogo zamrozić"); return; }
      TD.cast(s, key);
      render();
    }
    function callWave() {
      if (ctx.done) return;
      const r = TD.callWave(s);
      if (!r) return;
      if (r.early) { floatText(W / 2, H / 2, `Premia +${r.bonus} zł`, "gold", 4.4); if (s.early >= 5) ctx.achieve("pospiech"); }
      render();
    }
    function select(t) { v.sel = t; v.build = null; v.aim = null; Sound.tap(); render(); }

    ctx.on(cv.cv, "pointermove", (e) => { const [x, y] = cv.at(e); v.mouse = [x, y]; if (e.pointerType === "mouse") v.hover = cellAt(x, y); });
    ctx.on(cv.cv, "pointerleave", (e) => { if (e.pointerType === "mouse") v.hover = -1; });
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (ctx.done) return;
      const [x, y] = cv.at(e), i = cellAt(x, y), touch = e.pointerType !== "mouse";
      v.mouse = [x, y];
      // dotyk: pierwsze dotknięcie pokazuje podgląd, drugie w tym samym miejscu zatwierdza
      if (touch && (v.build || v.aim) && v.arm !== i) { v.arm = i; v.hover = i; return; }
      v.hover = i;
      if (v.aim) {
        TD.cast(s, "meteor", x, y);
        v.aim = null; v.arm = -1;
        return render();
      }
      const t = towerAt(i);
      if (t) return select(t);
      if (v.build) {
        const T = TOWERS[v.build];
        if (!TD.canBuild(s, i)) { Sound.error(); ctx.toast("Tu nie można budować"); return; }
        if (s.gold < T.cost) { Sound.error(); ctx.toast(`Brakuje ${T.cost - s.gold} zł`); return; }
        TD.build(s, v.build, i);
        v.arm = -1;
        if (s.gold < T.cost) v.build = null;
        return render();
      }
      v.sel = null;
      render();
    });
    heldKeys(ctx, (k) => {
      if (ctx.done) return;
      const types = Object.keys(TOWERS);
      if (k === "escape") { v.build = null; v.sel = null; v.aim = null; render(); }
      else if (/^[1-5]$/.test(k)) pickBuild(types[+k - 1]);
      else if (k === "q") useSpell("meteor");
      else if (k === "w") useSpell("freeze");
      else if (k === "p") setSpeed(v.speed ? 0 : 1);
      else if (k === "u" && v.sel && v.sel.tier === 0) doUpgrade(v.sel, 0);
      else if (k === " " || k === "enter") callWave();
    });

    function doUpgrade(t, pick) {
      if (s.gold < TD.upgradeCost(t)) { Sound.error(); ctx.toast(`Brakuje ${TD.upgradeCost(t) - s.gold} zł`); return; }
      TD.upgrade(s, t, pick);
      render();
    }
    let selKey = "";
    const selLive = { kills: null, ups: [] };
    function renderSel() {
      const t = v.sel;
      shop.hidden = !!t;
      selBox.hidden = !t;
      title2.textContent = t ? TOWERS[t.type].name : "Wieże";
      if (!t) { selKey = ""; return; }
      const cost = TD.upgradeCost(t);
      const key = `${t.id}|${t.tier}|${t.spec}`;
      if (key === selKey) {
        // bez przebudowy: tylko licznik i dostępność ulepszeń
        if (selLive.kills.textContent !== String(t.kills)) selLive.kills.textContent = t.kills;
        for (const b of selLive.ups) b.disabled = s.gold < cost;
        return;
      }
      selKey = key;
      selLive.ups = [];
      const T = TOWERS[t.type], sp = TD.spec(t);
      const head = el("div", "td-sel-head");
      const hTxt = el("span", "td-sel-name");
      hTxt.append(el("b", "", sp ? sp.name : `Poziom ${t.tier + 1} z 3`), el("small", "", sp ? sp.desc : T.desc));
      head.append(iconCanvas(towerIcon(t.type, t.tier, t.spec), 40), hTxt);
      const dl = el("dl", "td-sel-stats");
      const row = (k2, val, next) => { const d = el("div"); const dd = el("dd", "", String(val)); if (next) dd.append(el("ins", "", ` → ${next}`)); d.append(el("dt", "", k2), dd); dl.append(d); return dd; };
      const nx = t.tier === 0 ? { ...t, tier: 1 } : null;
      const per = (x) => (1 / TD.stat(x, "rate")).toFixed(1).replace(".", ",");
      row("Obrażenia", Math.round(TD.stat(t, "dmg")), nx && Math.round(TD.stat(nx, "dmg")));
      row("Zasięg", Math.round(TD.stat(t, "range")), nx && Math.round(TD.stat(nx, "range")));
      row(sp && sp.aura ? "Mrozi" : "Strzały/s", sp && sp.aura ? "stale" : per(t), nx && !(sp && sp.aura) && per(nx));
      selLive.kills = row("Pokonani", t.kills);
      const kids = [head, dl];
      if (t.tier === 0) {
        const up = button(`Ulepsz za ${cost} zł`, "btn-ghost wide td-up", () => doUpgrade(t, 0));
        up.disabled = s.gold < cost;
        selLive.ups.push(up);
        kids.push(up);
      } else if (t.tier === 1) {
        const specs = el("div", "td-specs");
        T.specs.forEach((o, k) => {
          const b = button("", "td-spec", () => doUpgrade(t, k));
          const nm = el("b", "", o.name);
          b.append(iconCanvas(towerIcon(t.type, 2, k), 28), nm, el("small", "", o.desc), el("span", "td-cost", String(cost)));
          b.disabled = s.gold < cost;
          selLive.ups.push(b);
          b.setAttribute("aria-label", `Specjalizacja ${o.name} za ${cost} złota. ${o.desc}`);
          specs.append(b);
        });
        kids.push(el("p", "panel-note", "Wybierz specjalizację"), specs);
      }
      if (!(sp && sp.aura)) {
        const modes = ["first", "strong", "near"];
        const mode = segmented("Cel", ["Pierwszy", "Najsilniejszy", "Najbliższy"], (k) => { t.mode = modes[k]; mode.set(k); Sound.tap(); });
        mode.set(modes.indexOf(t.mode));
        kids.push(mode.el);
      }
      const r2 = el("div", "panel-row");
      r2.append(button(`Sprzedaj: ${TD.sellValue(t)} zł`, "btn-ghost danger", () => { TD.sell(s, t); v.sel = null; render(); }), button("Gotowe", "btn-ghost", () => { v.sel = null; render(); }));
      kids.push(r2);
      selBox.replaceChildren(...kids);
      replay(selBox, "td-in");
    }
    let nextKey = "";
    function renderNext() {
      const n = s.wave + 1, key = `${n}|${s.wave >= lv.waves}`;
      if (key === nextKey) return;
      nextKey = key;
      if (s.wave >= lv.waves) { nextBox.replaceChildren(el("p", "panel-note", "To była ostatnia fala")); return; }
      const chips = TD.waveSummary(TD.wave(n, lv.waves, s.paths.length)).map(([type, cnt]) => {
        const c = el("span", "td-chip");
        c.title = ENEMIES[type].name;
        c.append(iconCanvas(enemyIcon(type), 26), el("b", "", `${cnt}`));
        c.setAttribute("aria-label", `${ENEMIES[type].name}: ${cnt}`);
        c.setAttribute("role", "img");
        return c;
      });
      nextBox.replaceChildren(...chips);
      replay(nextBox, "td-in");
    }
    let last = {};
    function renderStats() {
      const vals = { gold: s.gold, lives: s.lives, wave: `${s.wave} z ${lv.waves}` };
      for (const k in vals) if (last[k] !== vals[k]) {
        if (last[k] != null) replay(tiles[k].parentNode, k === "lives" && vals[k] < last[k] ? "shake" : "td-bump");
        tiles[k].textContent = vals[k];
        last[k] = vals[k];
      }
      tiles.lives.parentNode.classList.toggle("is-low", s.lives <= Math.ceil(lv.lives * 0.3));
      shopBtns.forEach(([type, b]) => { b.classList.toggle("is-on", v.build === type); b.disabled = s.gold < TOWERS[type].cost && v.build !== type; });
      const note = v.build ? `${TOWERS[v.build].name}: ${TOWERS[v.build].desc.toLowerCase()}` : "Wybierz wieżę, potem wolne pole na mapie.";
      if (shopNote.textContent !== note) shopNote.textContent = note;
      for (const [key, b, sub] of spellBtns) {
        const cd = s.cd[key], ready = cd <= 0;
        b.style.setProperty("--cd", (cd / SPELLS[key].cd).toFixed(3));
        b.classList.toggle("is-ready", ready);
        b.classList.toggle("is-on", v.aim === key);
        const txt = ready ? `${key === "meteor" ? "Gotowy" : "Gotowe"} · ${key === "meteor" ? "Q" : "W"}` : `Ładuje się ${Math.ceil(cd)} s`;
        if (sub.textContent !== txt) sub.textContent = txt;
      }
      waveBtn.textContent = s.wave >= lv.waves ? "Ostatnia fala w drodze" : s.waveDone ? (s.wave ? `Wezwij falę ${s.wave + 1}` : "Wezwij pierwszą falę") : `Wezwij wcześniej (+${10 + s.queue.length * 2} zł)`;
      waveBtn.disabled = s.wave >= lv.waves || !!ctx.done;
      waveBtn.classList.toggle("td-ready", s.waveDone && s.wave < lv.waves);
      ctx.progress((s.wave - (s.waveDone ? 0 : 0.5)) / lv.waves);
      renderSel();
      renderNext();
      if (icons.length > 40) icons = icons.filter(([c]) => c.isConnected);
    }
    function render() { renderStats(); }

    let uiT = 0;
    cv.loop((dt) => {
      if (!ctx.done) for (let k = 0; k < v.speed; k++) {
        TD.step(s, dt);
        if (s.over) break;
      }
      for (const ev of s.ev) onEvent(ev);
      s.ev.length = 0;
      if (v.sel && !s.towers.includes(v.sel)) v.sel = null;
      frame(dt);
      uiT += dt;
      if (uiT > 0.1) { uiT = 0; renderStats(); }
      if (s.over && !ctx.done) {
        renderStats();
        if (s.over === "win") {
          if (s.lives <= 3) ctx.achieve("ostatnia-linia");
          if (s.maxTowers <= 6) ctx.achieve("oszczedny");
          if (s.lives === lv.lives && lv.key === "medium") ctx.achieve("mur");
          if (s.lives === lv.lives && lv.key === "hard") ctx.achieve("niezdobyta");
          ctx.win(`Zostało ${s.lives} ${plural(s.lives, "życie", "życia", "żyć")}, pokonani wrogowie: ${s.kills}.`);
        } else ctx.lose("Brama padła", `Przetrwane fale: ${Math.max(0, s.wave - 1)} z ${lv.waves}. Pokonani wrogowie: ${s.kills}.`);
      }
    });
    render();
  },
});
