{
  const W = 320, H = 200;
  const HIVE = { x: 54, y: 132 };
  const SLOTS = [
    [128, 148], [164, 140], [202, 152], [240, 144],
    [142, 176], [182, 180], [222, 172], [262, 166],
  ];
  const KINDS = [
    { pal: "violet", yld: 1.2, name: "Lawenda" },
    { pal: "pink", yld: 1, name: "Facelia" },
    { pal: "yellow", yld: 0.9, name: "Gryka" },
    { pal: "blue", yld: 1.1, name: "Chaber" },
  ];
  const WX = {
    slonce: { forage: 1, regen: 1.1, eat: 0.65, label: "Słońce", hint: "Słońce: pszczoły zbierają nektar" },
    deszcz: { forage: 0.06, regen: 0.35, eat: 1.15, label: "Deszcz", hint: "Deszcz: pszczoły siedzą w ulu" },
    upal: { forage: 0.5, regen: 0.18, eat: 1.4, label: "Upał", hint: "Upał: kwiaty szybko schną" },
    mroz: { forage: 0, regen: 0, eat: 1.7, label: "Przymrozek", hint: "Przymrozek: pożytek zamarł" },
  };
  const COST = { kwiat: 8, ramka: 10, lecz: 9, syrop: 6 };
  const swarmCap = (frames) => frames * 22;
  const swarmWarn = (frames) => frames * 17;
  const honeyCap = (frames) => frames * 14;
  const honeyKeep = (frames) => 3 + frames;

  function miteLabel(n) {
    if (n < 4) return "spokój";
    if (n < 8) return "uwaga";
    return "groźba";
  }

  function hiveNote(s) {
    const stores = s.nectar + s.honey;
    const cap = swarmCap(s.frames);
    if (stores < 1.2) return "Głód: rodzina je resztki. Nakarm syropem.";
    if (s.bees > swarmWarn(s.frames)) return `Ul ciasny (${Math.round(s.bees)}/${cap}). Dołóż ramkę, zanim się wyroją.`;
    if (s.mites >= 8) return "Roztocza groźne. Podaj leczenie, zanim padną pszczoły.";
    if (s.honey >= honeyCap(s.frames) - 0.5) return "Plastry pełne. Wydobądź miód, zanim nowy się zmarnuje.";
    if (s.treatT > 1) return "Leczenie działa. Roztocza padają.";
    if ((s.weather === "deszcz" || s.weather === "mroz") && stores < 8) {
      return `${WX[s.weather].label}: brak zbiórki. Nakarm, jeśli zapas spada.`;
    }
    if ((s.price || 0) >= 2) return `Dobra cena: ${s.price.toFixed(1)} zł/kg. Warto wydobyć miód.`;
    const next = s.nextWx ? WX[s.nextWx].label : "—";
    return `${WX[s.weather].hint}. Jutro: ${next}.`;
  }

  function startState(lv) {
    const flowers = [];
    for (let i = 0; i < lv.flowers; i++) flowers.push(makeFlower(i, i % KINDS.length));
    return {
      bees: lv.bees, frames: lv.frames, coins: lv.coins,
      nectar: 8, honey: 6, harvested: 0, mites: 1.2,
      day: 1, t: 0, weather: "slonce", treatT: 0, swarmed: 0,
      flowers, maxMites: 1.2, fed: false,
      price: 1.55, nextWx: null, lastKind: "", bloomed: false,
    };
  }

  function makeFlower(slot, kind) {
    return { slot, kind, nectar: 7 + (slot % 3), sway: slot * 0.7 };
  }

  function weatherFor(day, lv, rng) {
    if (day / lv.days >= 0.84) return "mroz";
    const r = rng();
    if (r < lv.rain) return "deszcz";
    if (r < lv.rain + lv.heat) return "upal";
    return "slonce";
  }

  function avgYield(flowers) {
    if (!flowers.length) return 0;
    let s = 0;
    for (const f of flowers) s += KINDS[f.kind].yld * (0.25 + f.nectar / 12);
    return s / flowers.length;
  }

  function tickHive(s, dt, lv) {
    const wx = WX[s.weather];
    const stocked = s.flowers.filter((f) => f.nectar > 0.4);
    const forage = s.bees * 0.16 * wx.forage * avgYield(stocked) * dt;
    let left = forage;
    for (const f of s.flowers) {
      if (left <= 0) break;
      const take = Math.min(f.nectar, left / Math.max(1, stocked.length));
      f.nectar -= take;
      left -= take;
    }
    s.nectar += forage - Math.max(0, left);
    for (const f of s.flowers) f.nectar = Math.min(10, f.nectar + 0.9 * wx.regen * dt);

    const conv = Math.min(s.nectar, s.frames * 2.6 * dt);
    s.nectar -= conv;
    s.honey += conv * 0.72;
    const cap = s.frames * 14;
    if (s.honey > cap) s.honey = cap;

    const eat = s.bees * 0.028 * wx.eat * dt;
    const fromN = Math.min(s.nectar, eat);
    s.nectar -= fromN;
    s.honey = Math.max(0, s.honey - (eat - fromN));

    s.treatT = Math.max(0, s.treatT - dt);
    const treating = s.treatT > 0;
    s.mites += treating ? -5.2 * dt : (0.32 * lv.mite + s.bees * 0.007 * lv.mite) * dt;
    s.mites = Math.max(0, Math.min(s.bees * 0.85, s.mites));
    s.maxMites = Math.max(s.maxMites, s.mites);

    const ratio = s.mites / Math.max(1, s.bees);
    const starved = s.nectar + s.honey < 0.5;
    const kill = (starved ? s.bees * 0.11 : 0) * dt + (ratio > 0.22 ? (ratio - 0.22) * 9 * dt : 0);
    const birth = !starved && ratio < 0.14 && wx.forage > 0.4 ? s.bees * 0.034 * dt : 0;
    s.bees = Math.max(0, s.bees + birth - kill);

    if (s.bees > swarmCap(s.frames)) {
      s.bees *= 0.55;
      s.swarmed++;
      return "roj";
    }
    return null;
  }

  function beginDay(s, lv, rng) {
    s.weather = s.nextWx || weatherFor(s.day, lv, rng);
    s.nextWx = weatherFor(Math.min(lv.days, s.day + 1), lv, rng);
    const ev = [];
    if (rng() < 0.42) {
      s.price = Math.round((1.15 + rng() * 1.25) * 10) / 10;
      ev.push("cena");
    }
    if (s.weather === "slonce" && rng() < 0.24 && s.flowers.length) {
      for (const f of s.flowers) f.nectar = 10;
      s.bloomed = true;
      ev.push("pozytek");
    }
    return ev;
  }

  function extractHoney(s) {
    const keep = honeyKeep(s.frames);
    const take = Math.max(0, s.honey - keep);
    s.honey -= take;
    s.harvested += take;
    s.coins += Math.floor(take * (s.price || 1.55));
    return take;
  }

  function plantFlower(s) {
    if (s.coins < COST.kwiat || s.flowers.length >= SLOTS.length) return false;
    const used = new Set(s.flowers.map((f) => f.slot));
    const slot = SLOTS.findIndex((_, i) => !used.has(i));
    if (slot < 0) return false;
    s.coins -= COST.kwiat;
    const kind = slot % KINDS.length;
    s.flowers.push(makeFlower(slot, kind));
    s.lastKind = KINDS[kind].name;
    return true;
  }

  function addFrame(s) {
    if (s.coins < COST.ramka || s.frames >= 8) return false;
    s.coins -= COST.ramka;
    s.frames++;
    return true;
  }

  function treatMites(s) {
    if (s.coins < COST.lecz) return false;
    s.coins -= COST.lecz;
    s.treatT = 7;
    return true;
  }

  function feedSyrup(s) {
    if (s.coins < COST.syrop) return false;
    s.coins -= COST.syrop;
    s.nectar += 9;
    s.fed = true;
    return true;
  }

  function botDay(s, lv) {
    if (s.mites > 3 && s.coins >= COST.lecz) treatMites(s);
    while (s.flowers.length < 8 && s.coins >= COST.kwiat) plantFlower(s);
    if (s.bees > s.frames * 15 && s.coins >= COST.ramka) addFrame(s);
    const keep = honeyKeep(s.frames);
    const full = s.honey > honeyCap(s.frames) * 0.72;
    if (s.honey > keep && (full || (s.price || 0) >= 1.7)) extractHoney(s);
    const badWx = s.weather === "deszcz" || s.weather === "mroz" || s.nextWx === "deszcz" || s.nextWx === "mroz";
    if (badWx && s.nectar + s.honey < 8 && s.coins >= COST.syrop) feedSyrup(s);
    tickHive(s, lv.dayLen, lv);
  }

  function playSeason(lv, rng) {
    const s = startState(lv);
    for (let d = 1; d <= lv.days; d++) {
      s.day = d;
      beginDay(s, lv, rng);
      botDay(s, lv);
      if (s.harvested >= lv.goal || s.bees < 2) break;
    }
    return s;
  }

  if (typeof module !== "undefined") {
    module.exports = {
      startState, tickHive, extractHoney, plantFlower, addFrame, treatMites, feedSyrup, playSeason, weatherFor, beginDay, hiveNote, miteLabel, COST,
    };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "pasieka",
    cat: "symulacje",
    big: true,
    name: "Pasieka",
    author: "Cursor Grok 4.6",
    desc: "Prowadź ul na łące: zbieraj nektar, warz miód i chroń pszczoły.",
    color: "#9a3412",
    ink: "#ffffff",
    glyph: [".###.", "#.#.#", "#####", "#.#.#", ".###."],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, days: 26, goal: 32, mite: 0.45, rain: 0.12, heat: 0.08, dayLen: 2.8, bees: 24, flowers: 4, frames: 3, coins: 14 },
      { key: "medium", name: "Średni", points: 50, days: 24, goal: 52, mite: 0.75, rain: 0.2, heat: 0.12, dayLen: 2.8, bees: 20, flowers: 3, frames: 2, coins: 12 },
      { key: "hard", name: "Trudny", points: 100, days: 22, goal: 62, mite: 1, rain: 0.24, heat: 0.16, dayLen: 2.8, bees: 20, flowers: 4, frames: 3, coins: 14 },
    ],
    rules: [
      "Pszczoły same zbierają w słońcu. Deszcz i mróz zatrzymują zbiór, upał suszy kwiaty. Pod paskiem widać, co się dzieje i jaka pogoda będzie jutro.",
      "Kliknij ul albo „Wydobądź miód”, by zebrać nadmiar (pszczołom zostaje zapas). Cena miodu zmienia się z dnia na dzień.",
      "Kliknij łąkę, by sadzić kwiaty; kliknij kępę, by zobaczyć gatunek i nektar. Dołóż ramkę, zanim ul się zapełni i rodzina się wyroi.",
      "Roztocza osłabiają pszczoły. Leczenie je zbija. W złą pogodę karm syropem, inaczej rodzina pada z głodu.",
      "Sezon kończy się zimą. Wygraj, zbierając wymagany miód. Łatwy sezon jest łagodny, trudny ma droższe błędy i wcześniejszy mróz.",
      "Klawisze: 1 sadź, 2 wydobądź, 3 ramka, 4 leczenie, 5 karmienie.",
    ],
    achievements: [
      { id: "pierwszy-sloik", name: "Pierwszy słoik", desc: "Wydobądź miód z ula po raz pierwszy.", points: 10 },
      { id: "lawendowy-dywan", name: "Pełna łąka", desc: "Miej na łące wszystkie osiem kęp kwiatów naraz.", points: 10 },
      { id: "czysty-ul", name: "Czysty ul", desc: "Wygraj partię, nie pozwalając roztoczom przekroczyć 12.", points: 25 },
      { id: "bez-roju", name: "Spokojna rodzina", desc: "Wygraj partię bez nawet jednego roju.", points: 25 },
      { id: "syropnik", name: "Syropnik", desc: "Nakarm ul syropem i wygraj sezon.", points: 25 },
      { id: "dobra-cena", name: "Kupiec", desc: "Wydobądź miód, gdy cena wynosi co najmniej 2 zł za kilogram.", points: 25 },
      { id: "szybki-zbior", name: "Szybki zbiór", desc: "Zbierz cel sezonu w mniej niż 85 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const lv = ctx.level;
      const cv = canvasGame(board, ctx, W, H, { max: 96 });
      const { g, theme } = cv;
      cv.cv.setAttribute("aria-label", "Łąka z ulem. Kliknij ul, by wydobyć miód, łąkę, by sadzić kwiaty.");
      const s = startState(lv);
      s.sprites = [];
      s.clock = 0;
      s.cloud = [
        { x: 48, y: 24, r: 16, v: 5.5, n: 0 },
        { x: 132, y: 18, r: 20, v: 3.8, n: 1 },
        { x: 210, y: 28, r: 14, v: 4.6, n: 2 },
        { x: 278, y: 16, r: 18, v: 3.2, n: 0 },
      ];
      s.blades = Array.from({ length: 90 }, (_, i) => ({
        x: 3 + (i * 37 + i * 3) % (W - 6),
        y: 122 + (i * 19 + i) % 72,
        h: 5 + (i % 6),
        lean: ((i * 3) % 9) - 4,
      }));
      s.wild = Array.from({ length: 16 }, (_, i) => ({
        x: 98 + (i * 53) % 210,
        y: 128 + (i * 17) % 54,
        pal: ["pink", "yellow", "violet", "blue"][i % 4],
        sc: 0.42 + (i % 4) * 0.08,
        ph: i * 0.7,
      }));
      s.drops = Array.from({ length: 42 }, (_, i) => ({
        x: (i * 43) % W, y: (i * 29) % H, len: 6 + i % 6, spd: 95 + (i % 50),
      }));
      s.gotSloik = false;
      s.gotLaka = false;
      s.flash = 0;
      s.ended = false;

      const nSpr = Math.min(16, Math.round(s.bees / 2));
      for (let i = 0; i < nSpr; i++) {
        s.sprites.push({
          x: HIVE.x + rnd(20) - 10, y: HIVE.y - 18 - rnd(20),
          a: Math.random() * 6, go: 1, fi: i % Math.max(1, s.flowers.length),
        });
      }

      const honeyEl = statBlock(ctx, "Miód", { meter: true });
      const hiveEl = statsBlock(ctx, "Ul", ["Pszczoły", "Zapas", "Roztocza", "Złotówki"]);
      const log = logBlock(ctx, "Sezon", { max: 5 });
      const btnExtract = button("Wydobądź miód", "btn wide", doExtract);
      const btnPlant = button("Sadź kwiaty", "btn-ghost");
      const btnFrame = button("Dołóż ramkę", "btn-ghost");
      const btnTreat = button("Leczenie", "btn-ghost");
      const btnFeed = button("Nakarm", "btn-ghost");
      btnPlant.onclick = doPlant;
      btnFrame.onclick = doFrame;
      btnTreat.onclick = doTreat;
      btnFeed.onclick = doFeed;
      const rowA = el("div", "panel-row");
      rowA.append(btnPlant, btnFrame);
      const rowB = el("div", "panel-row");
      rowB.append(btnTreat, btnFeed);
      ctx.panel.append(panelBlock("Prace", btnExtract, rowA, rowB));
      log.add("Sezon start. Zbieraj miód, zanim przyjdzie zima.", "ok");
      beginDay(s, lv, Math.random);
      log.add(`Dzień 1: ${WX[s.weather].label}. Jutro ${WX[s.nextWx].label}.`);
      s.warn = {};

      function note(key, text, kind) {
        if (s.warn[key]) return;
        s.warn[key] = true;
        ctx.toast(text);
        log.add(text, kind || "warn");
      }

      function panel() {
        honeyEl.set(
          `${s.harvested.toFixed(0)} / ${lv.goal} kg`,
          Math.min(1, s.harvested / lv.goal),
          hiveNote(s)
        );
        hiveEl.set("Pszczoły", `${Math.round(s.bees)}/${swarmCap(s.frames)}`);
        hiveEl.set("Zapas", `${s.honey.toFixed(0)} kg`);
        hiveEl.set("Roztocza", `${s.mites.toFixed(0)} ${miteLabel(s.mites)}`);
        hiveEl.set("Złotówki", `${s.coins} · ${s.price.toFixed(1)} zł/kg`);
        ctx.progress(Math.min(1, s.harvested / lv.goal));
      }

      function finishWin() {
        if (s.ended || ctx.done) return;
        s.ended = true;
        if (s.maxMites < 12) ctx.achieve("czysty-ul");
        if (s.swarmed === 0) ctx.achieve("bez-roju");
        if (s.fed) ctx.achieve("syropnik");
        if (ctx.time < 85) ctx.achieve("szybki-zbior");
        ctx.win(`Zebrano ${s.harvested.toFixed(0)} kg miodu w ${s.day} ${plural(s.day, "dzień", "dni", "dni")}.`);
      }

      function finishLose(title, text) {
        if (s.ended || ctx.done) return;
        s.ended = true;
        ctx.lose(title, text);
      }

      function doExtract() {
        if (ctx.done) return;
        const take = extractHoney(s);
        if (take < 0.4) {
          Sound.error();
          ctx.toast(`Za mało. Zostawiasz pszczołom ${honeyKeep(s.frames)} kg zapasu`);
          return;
        }
        Sound.line();
        if (!s.gotSloik) { s.gotSloik = true; ctx.achieve("pierwszy-sloik"); }
        if (s.price >= 2) ctx.achieve("dobra-cena");
        s.flash = 0.35;
        s.warn.full = false;
        const gold = Math.floor(take * s.price);
        ctx.toast(`Zebrano ${take.toFixed(0)} kg za ${gold} zł`);
        log.add(`Zbiór ${take.toFixed(0)} kg po ${s.price.toFixed(1)} zł/kg.`, "ok");
        if (s.harvested >= lv.goal) finishWin();
        panel();
      }

      function doPlant() {
        if (ctx.done) return;
        if (!plantFlower(s)) {
          Sound.error();
          ctx.toast(s.flowers.length >= SLOTS.length ? "Łąka jest pełna" : `Kwiaty kosztują ${COST.kwiat} zł`);
          return;
        }
        Sound.place(2);
        log.add(`Posadzono: ${s.lastKind}. Łąka ${s.flowers.length} z 8.`, "ok");
        ctx.toast(`${s.lastKind} na łące`);
        if (!s.gotLaka && s.flowers.length >= 8) { s.gotLaka = true; ctx.achieve("lawendowy-dywan"); }
        panel();
      }

      function doFrame() {
        if (ctx.done) return;
        if (!addFrame(s)) { Sound.error(); ctx.toast(s.frames >= 8 ? "Ul jest pełen ramek" : `Ramka kosztuje ${COST.ramka} zł`); return; }
        Sound.place(4);
        s.warn.swarm = false;
        ctx.toast(`Więcej miejsca. Rój grozi od ${swarmCap(s.frames)} pszczół`);
        log.add(`Dołożono ramkę. Miejsce na ${swarmCap(s.frames)} pszczół.`, "ok");
        panel();
      }

      function doTreat() {
        if (ctx.done) return;
        if (!treatMites(s)) { Sound.error(); ctx.toast(`Leczenie kosztuje ${COST.lecz} zł`); return; }
        Sound.flag();
        s.warn.mites = false;
        ctx.toast("Kwas w ulu, roztocza padają przez kilka dni");
        log.add("Podano leczenie na roztocza.", "ok");
        panel();
      }

      function doFeed() {
        if (ctx.done) return;
        if (!feedSyrup(s)) { Sound.error(); ctx.toast(`Syrop kosztuje ${COST.syrop} zł`); return; }
        Sound.place(1);
        s.warn.hunger = false;
        ctx.toast("Syrop uzupełnił zapas w ulu");
        log.add("Nakarmiono syropem.", "ok");
        panel();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea")) return;
        const map = { "1": doPlant, "2": doExtract, "3": doFrame, "4": doTreat, "5": doFeed, e: doExtract };
        const fn = map[e.key.toLowerCase()];
        if (fn) { e.preventDefault(); fn(); }
      });

      cv.cv.addEventListener("pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        if (x > HIVE.x - 34 && x < HIVE.x + 34 && y > HIVE.y - 70 && y < HIVE.y + 26) return doExtract();
        let near = null, best = 16;
        for (const f of s.flowers) {
          const [fx, fy] = SLOTS[f.slot];
          const d = Math.hypot(x - fx, y - (fy - 10));
          if (d < best) { best = d; near = f; }
        }
        if (near) {
          const k = KINDS[near.kind];
          ctx.toast(`${k.name}: nektar ${near.nectar.toFixed(0)} z 10`);
          Sound.tap();
          return;
        }
        if (y > 108 && x > 100) doPlant();
      });

      panel();

      cv.loop((dt) => {
        if (!ctx.done) {
          s.t += dt;
          if (s.t >= lv.dayLen) {
            s.t = 0;
            s.day++;
            if (s.day > lv.days) {
              finishLose("Zima", `Zebrano ${s.harvested.toFixed(0)} z ${lv.goal} kg. Zabrakło ${(lv.goal - s.harvested).toFixed(0)} kg.`);
            } else {
              const prevWx = s.weather;
              const evs = beginDay(s, lv, Math.random);
              log.add(`Dzień ${s.day}: ${WX[s.weather].label}. Jutro ${WX[s.nextWx].label}.`);
              if (s.weather !== prevWx) ctx.toast(`${WX[s.weather].hint}. Jutro ${WX[s.nextWx].label}`);
              if (evs.includes("cena")) log.add(`Cena miodu: ${s.price.toFixed(1)} zł/kg.`, s.price >= 2 ? "ok" : "");
              if (evs.includes("pozytek")) {
                log.add("Obfity pożytek: kwiaty pełne nektaru.", "ok");
                ctx.toast("Obfity pożytek na łące");
              }
            }
          }
          const ev = tickHive(s, dt, lv);
          if (ev === "roj") {
            Sound.error();
            s.warn.swarm = false;
            ctx.toast("Rój odleciał z połową rodziny. Zabrakło ramek");
            log.add("Rój. Ul był za ciasny.", "bad");
          }
          if (s.bees < 2) {
            const why = s.nectar + s.honey < 1
              ? "Padły z głodu. Zostawiaj zapas albo karm syropem w deszcz i mróz."
              : s.mites >= 6
                ? "Roztocza zdziesiątkowały rodzinę. Trzeba było leczyć wcześniej."
                : "Zostało zbyt mało pszczół.";
            finishLose("Rodzina padła", why);
          }
          if (s.nectar + s.honey < 1.2) note("hunger", "Głód w ulu. Nakarm syropem", "bad");
          else s.warn.hunger = false;
          if (s.bees > swarmWarn(s.frames)) note("swarm", "Ul ciasny. Dołóż ramkę, zanim się wyroją");
          else s.warn.swarm = false;
          if (s.mites >= 8) note("mites", "Roztocza groźne. Podaj leczenie", "bad");
          else if (s.mites < 5) s.warn.mites = false;
          if (s.honey >= honeyCap(s.frames) - 0.5) note("full", "Plastry pełne. Wydobądź miód");
          else s.warn.full = false;
          if (s.harvested >= lv.goal) finishWin();
          s.flash = Math.max(0, s.flash - dt);
          panel();
        }
        if (!ctx.done) s.clock += dt;
        drawWorld(g, theme, s, dt, ctx.done);
      });
    },
  });

  function drawWorld(g, theme, s, dt, paused) {
    const wx = s.weather;
    const t = s.clock;
    drawSky(g, theme, wx);
    drawSun(g, theme, wx, t);
    drawClouds(g, theme, s, dt, wx, paused);
    drawHills(g, theme);
    drawTree(g, theme, 12, 70, 0.48);
    drawTree(g, theme, 292, 78, 1);
    drawTree(g, theme, 268, 92, 0.62);
    drawGrass(g, theme, s, t);
    for (const w of s.wild) drawWild(g, theme, w, t);
    drawHive(g, theme, s, t);
    for (const f of s.flowers) drawFlower(g, theme, f, s.t);
    drawBees(g, theme, s, dt, paused, wx);
    if (wx === "deszcz") drawRain(g, theme, s, dt, paused);
    if (wx === "mroz") drawFrost(g, theme, t);
    if (s.flash > 0) {
      const glow = g.createRadialGradient(HIVE.x, HIVE.y - 16, 4, HIVE.x, HIVE.y - 16, 42);
      glow.addColorStop(0, theme.gold);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = s.flash * 0.7;
      g.fillStyle = glow;
      g.fillRect(HIVE.x - 44, HIVE.y - 58, 88, 80);
      g.globalAlpha = 1;
    }
  }

  function drawSky(g, theme, wx) {
    const sky = g.createLinearGradient(0, 0, 0, 128);
    if (wx === "deszcz") {
      sky.addColorStop(0, theme.gray);
      sky.addColorStop(0.55, theme.blue);
      sky.addColorStop(1, theme.teal);
    } else if (wx === "upal") {
      sky.addColorStop(0, theme.orange);
      sky.addColorStop(0.45, theme.yellow);
      sky.addColorStop(1, theme.gold);
    } else if (wx === "mroz") {
      sky.addColorStop(0, theme.violet);
      sky.addColorStop(0.5, theme.blue);
      sky.addColorStop(1, theme.teal);
    } else {
      sky.addColorStop(0, theme.blue);
      sky.addColorStop(0.55, theme.teal);
      sky.addColorStop(1, theme.green);
    }
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
  }

  function drawSun(g, theme, wx, t) {
    if (wx !== "slonce" && wx !== "upal") return;
    const sx = wx === "upal" ? 286 : 42;
    const sy = wx === "upal" ? 32 : 30;
    const r = wx === "upal" ? 20 : 15;
    const glow = g.createRadialGradient(sx, sy, r * 0.3, sx, sy, r * 2.6);
    glow.addColorStop(0, theme.gold);
    glow.addColorStop(0.35, theme.yellow);
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = wx === "upal" ? 0.55 : 0.4;
    g.fillStyle = glow;
    g.beginPath();
    g.arc(sx, sy, r * 2.6, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = theme.gold;
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.yellow;
    g.beginPath();
    g.arc(sx - r * 0.22, sy - r * 0.22, r * 0.55, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = theme.gold;
    g.globalAlpha = 0.35;
    g.lineWidth = 1.1;
    for (let i = 0; i < 10; i++) {
      const a = t * 0.15 + i * Math.PI / 5;
      g.beginPath();
      g.moveTo(sx + Math.cos(a) * (r + 4), sy + Math.sin(a) * (r + 4));
      g.lineTo(sx + Math.cos(a) * (r + 11), sy + Math.sin(a) * (r + 11));
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawClouds(g, theme, s, dt, wx, paused) {
    const dense = wx === "deszcz" ? 0.72 : wx === "mroz" ? 0.5 : 0.38;
    const spd = wx === "deszcz" ? 1.7 : wx === "upal" ? 0.4 : 0.75;
    for (const c of s.cloud) {
      if (!paused) c.x = (c.x + c.v * dt * spd + W + 50) % (W + 50) - 25;
      g.fillStyle = theme.surface;
      g.globalAlpha = dense;
      puff(g, c.x, c.y, c.r);
      g.globalAlpha = dense * 0.55;
      g.fillStyle = theme.bg;
      puff(g, c.x + 3, c.y + 3, c.r * 0.72);
      g.globalAlpha = 1;
    }
  }

  function puff(g, x, y, r) {
    g.beginPath();
    g.ellipse(x, y, r * 1.7, r * 0.72, 0, 0, Math.PI * 2);
    g.ellipse(x - r * 0.9, y + 2, r * 1.05, r * 0.58, 0, 0, Math.PI * 2);
    g.ellipse(x + r * 1.05, y + 1.5, r * 1.15, r * 0.62, 0, 0, Math.PI * 2);
    g.ellipse(x + r * 0.15, y - r * 0.45, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
    g.fill();
  }

  function drawHills(g, theme) {
    g.fillStyle = theme.teal;
    g.globalAlpha = 0.45;
    g.beginPath();
    g.moveTo(0, 124);
    g.bezierCurveTo(60, 102, 130, 118, 200, 100);
    g.quadraticCurveTo(260, 90, W, 108);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    g.globalAlpha = 1;
    const mid = g.createLinearGradient(0, 96, 0, H);
    mid.addColorStop(0, theme.green);
    mid.addColorStop(1, theme.teal);
    g.fillStyle = mid;
    g.beginPath();
    g.moveTo(0, 118);
    g.bezierCurveTo(70, 96, 150, 126, 230, 108);
    g.quadraticCurveTo(280, 100, W, 114);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    g.fillStyle = theme.brown;
    g.globalAlpha = 0.22;
    g.beginPath();
    g.moveTo(0, 152);
    g.quadraticCurveTo(140, 138, W, 156);
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.fill();
    g.globalAlpha = 1;
  }

  function drawGrass(g, theme, s, t) {
    g.lineCap = "round";
    for (const b of s.blades) {
      const sway = Math.sin(t * 1.6 + b.x * 0.04) * 1.4;
      g.strokeStyle = theme.green;
      g.globalAlpha = 0.55 + (b.h % 3) * 0.12;
      g.lineWidth = 1.05;
      g.beginPath();
      g.moveTo(b.x, b.y);
      g.quadraticCurveTo(b.x + b.lean * 0.3, b.y - b.h * 0.45, b.x + b.lean + sway, b.y - b.h);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawWild(g, theme, w, t) {
    const sway = Math.sin(t * 1.3 + w.ph) * 1.1;
    g.strokeStyle = theme.green;
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(w.x, w.y + 4);
    g.lineTo(w.x + sway, w.y - 3);
    g.stroke();
    g.fillStyle = theme[w.pal];
    g.beginPath();
    g.arc(w.x + sway, w.y - 4, 2.1 * w.sc * 2.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.gold;
    g.beginPath();
    g.arc(w.x + sway, w.y - 4, 0.9 * w.sc * 2, 0, Math.PI * 2);
    g.fill();
  }

  function drawHive(g, theme, s) {
    const x = HIVE.x, y = HIVE.y;
    g.fillStyle = theme.text;
    g.globalAlpha = 0.18;
    g.beginPath();
    g.ellipse(x + 2, y + 24, 30, 6.5, 0, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = theme.brown;
    g.fillRect(x - 18, y + 10, 4.5, 14);
    g.fillRect(x + 13.5, y + 10, 4.5, 14);
    g.fillRect(x - 20, y + 22, 40, 3.2);
    for (let i = 0; i < 3; i++) {
      const by = y - 6 - i * 15;
      round(g, x - 26, by, 52, 16, 2.4);
      g.fillStyle = theme.brown;
      g.fill();
      g.fillStyle = theme.gold;
      g.globalAlpha = 0.22;
      g.fillRect(x - 24, by + 1.2, 48, 2.4);
      g.globalAlpha = 0.12;
      g.fillStyle = theme.text;
      for (let k = 0; k < 3; k++) g.fillRect(x - 22, by + 5 + k * 3.2, 44, 0.55);
      g.globalAlpha = 1;
      g.strokeStyle = theme.text;
      g.globalAlpha = 0.2;
      g.lineWidth = 0.6;
      round(g, x - 26, by, 52, 16, 2.4);
      g.stroke();
      g.globalAlpha = 1;
    }
    const fill = Math.min(1, s.honey / Math.max(1, s.frames * 14));
    g.save();
    round(g, x - 15, y - 20, 30, 16, 2);
    g.clip();
    g.fillStyle = theme.bg;
    g.fillRect(x - 15, y - 20, 30, 16);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const hx = x - 10 + c * 7.2 + (r % 2) * 3.6;
        const hy = y - 16 + r * 6.2;
        const on = (r * 4 + c) / 12 < fill;
        g.fillStyle = on ? theme.gold : theme.surface;
        hex(g, hx, hy, 3.6);
        g.fill();
        g.strokeStyle = theme.line;
        g.lineWidth = 0.35;
        hex(g, hx, hy, 3.6);
        g.stroke();
      }
    }
    g.restore();
    g.strokeStyle = theme.text;
    g.globalAlpha = 0.35;
    g.lineWidth = 0.7;
    round(g, x - 15, y - 20, 30, 16, 2);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = theme.text;
    round(g, x - 8, y + 3, 16, 5.5, 2);
    g.fill();
    g.fillStyle = theme.gold;
    g.beginPath();
    g.moveTo(x - 32, y - 50);
    g.lineTo(x, y - 66);
    g.lineTo(x + 32, y - 50);
    g.closePath();
    g.fill();
    g.fillStyle = theme.brown;
    round(g, x - 30, y - 52, 60, 6, 2);
    g.fill();
    g.fillStyle = theme.yellow;
    g.globalAlpha = 0.35;
    g.beginPath();
    g.moveTo(x - 18, y - 54);
    g.lineTo(x, y - 64);
    g.lineTo(x - 4, y - 52);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  }

  function drawTree(g, theme, x, y, sc) {
    g.save();
    g.translate(x, y);
    g.scale(sc, sc);
    g.fillStyle = theme.brown;
    g.beginPath();
    g.moveTo(-4, 48);
    g.lineTo(-2.2, 8);
    g.lineTo(2.4, 8);
    g.lineTo(4.6, 48);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(1, 22);
    g.quadraticCurveTo(14, 10, 16, 4);
    g.lineTo(14, 8);
    g.quadraticCurveTo(8, 16, 1, 26);
    g.fill();
    const leaf = (ox, oy, rx, ry) => {
      g.beginPath();
      g.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    };
    g.fillStyle = theme.green;
    leaf(0, 2, 22, 16);
    leaf(-16, 12, 15, 12);
    leaf(16, 12, 15, 12);
    leaf(-8, -8, 13, 11);
    leaf(9, -7, 12, 10);
    g.fillStyle = theme.teal;
    g.globalAlpha = 0.35;
    leaf(-6, 0, 12, 9);
    leaf(10, 6, 11, 8);
    g.globalAlpha = 1;
    g.restore();
  }

  function drawFlower(g, theme, f, t) {
    const [bx, by] = SLOTS[f.slot];
    const k = KINDS[f.kind];
    const sway = Math.sin(t * 1.35 + f.sway) * 2.4;
    g.fillStyle = theme.green;
    g.beginPath();
    g.ellipse(bx - 5.5, by + 3, 6.2, 2.4, -0.7, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(bx + 4.2, by + 5, 5.2, 2.1, 0.5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = theme.green;
    g.lineWidth = 1.7;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(bx, by + 11);
    g.quadraticCurveTo(bx + sway * 0.35, by + 2, bx + sway, by - 8);
    g.stroke();
    const hx = bx + sway, hy = by - 11;
    if (k.pal === "violet") {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = theme.violet;
        g.beginPath();
        g.arc(hx + Math.sin(i * 1.4) * 2.1, hy - i * 2.5, 2.3 - i * 0.12, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(hx - Math.cos(i) * 2.0, hy - i * 2.5 + 0.8, 2.0 - i * 0.1, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = theme.pink;
      g.globalAlpha = 0.45;
      g.beginPath();
      g.arc(hx, hy - 18, 1.6, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      return;
    }
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.12;
      g.fillStyle = theme[k.pal];
      g.beginPath();
      g.ellipse(hx + Math.cos(a) * 5.6, hy + Math.sin(a) * 5.0, 4.0, 2.15, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = theme.gold;
    g.beginPath();
    g.arc(hx, hy, 3.1 + f.nectar * 0.07, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.orange;
    g.globalAlpha = 0.55;
    g.beginPath();
    g.arc(hx, hy, 1.5, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  function drawBees(g, theme, s, dt, paused, wx) {
    const want = Math.min(16, Math.max(3, Math.round(s.bees / 2)));
    while (s.sprites.length < want) {
      s.sprites.push({ x: HIVE.x, y: HIVE.y - 20, a: Math.random() * 6, go: 1, fi: rnd(Math.max(1, s.flowers.length)), face: 1 });
    }
    s.sprites.length = want;
    const fly = WX[wx].forage > 0.2 && s.flowers.length;
    for (let i = 0; i < s.sprites.length; i++) {
      const b = s.sprites[i];
      b.a += dt * 8;
      const fl = s.flowers[b.fi % Math.max(1, s.flowers.length)];
      const [tx, ty] = fl ? SLOTS[fl.slot] : [HIVE.x, HIVE.y - 22];
      const hx = HIVE.x + 4, hy = HIVE.y - 28;
      const dest = b.go > 0 && fly ? [tx, ty - 14] : [hx, hy];
      if (!paused) {
        const nx = b.x + (dest[0] - b.x) * Math.min(1, dt * 1.8);
        b.face = nx >= b.x ? 1 : -1;
        b.x = nx;
        b.y += (dest[1] - b.y) * Math.min(1, dt * 1.8) + Math.sin(b.a) * 9 * dt;
        if (Math.hypot(b.x - dest[0], b.y - dest[1]) < 8) {
          b.go *= -1;
          if (s.flowers.length) b.fi = rnd(s.flowers.length);
        }
      }
      drawBee(g, theme, b.x, b.y + Math.sin(b.a) * 1.5, b.a, b.face || 1);
    }
  }

  function drawBee(g, theme, x, y, a, face) {
    g.save();
    g.translate(x, y);
    g.scale(face < 0 ? -1 : 1, 1);
    const flap = 0.25 + Math.sin(a * 2.6) * 0.55;
    g.fillStyle = theme.surface;
    g.globalAlpha = 0.45;
    g.beginPath();
    g.ellipse(-0.2, -2.4, 3.4, 1.9, -0.55 - flap * 0.35, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(1.6, -2.1, 2.8, 1.6, 0.45 + flap * 0.3, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.fillStyle = theme.gold;
    g.beginPath();
    g.ellipse(-1.4, 0.35, 3.8, 2.35, 0.12, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = theme.text;
    g.lineWidth = 0.95;
    g.lineCap = "round";
    [[-2.6, -1.7, -2.2, 1.9], [-0.9, -1.85, -0.5, 2.05], [0.7, -1.6, 1.0, 1.7]].forEach(([x1, y1, x2, y2]) => {
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
    });
    g.fillStyle = theme.gold;
    g.beginPath();
    g.arc(2.2, 0.05, 2.05, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.text;
    g.beginPath();
    g.arc(3.85, -0.25, 1.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = theme.surface;
    g.beginPath();
    g.arc(4.35, -0.65, 0.42, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = theme.text;
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(4.6, -1.3);
    g.quadraticCurveTo(5.5, -3.3, 6.3, -2.7);
    g.moveTo(4.4, -1.5);
    g.quadraticCurveTo(4.8, -3.5, 5.6, -3.4);
    g.stroke();
    g.restore();
  }

  function drawRain(g, theme, s, dt, paused) {
    g.strokeStyle = theme.blue;
    g.lineWidth = 0.85;
    g.lineCap = "round";
    g.globalAlpha = 0.55;
    for (const d of s.drops) {
      if (!paused) {
        d.y += d.spd * dt;
        d.x += 18 * dt;
        if (d.y > H) { d.y = -8; d.x = (d.x + 40) % W; }
      }
      g.beginPath();
      g.moveTo(d.x, d.y);
      g.lineTo(d.x + 1.6, d.y + d.len);
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function drawFrost(g, theme, t) {
    g.fillStyle = theme.surface;
    for (let i = 0; i < 22; i++) {
      const x = (i * 51 + Math.sin(t + i) * 8) % W;
      const y = 8 + (i * 37) % 110;
      g.globalAlpha = 0.25 + (Math.sin(t * 2 + i) + 1) * 0.15;
      g.beginPath();
      g.arc(x, y, 0.9 + (i % 3) * 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.12;
    g.fillStyle = theme.surface;
    g.fillRect(0, 0, W, H);
    g.globalAlpha = 1;
  }

  function hex(g, x, y, r) {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + i * Math.PI / 3;
      g[i ? "lineTo" : "moveTo"](x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
  }

  function round(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
}
