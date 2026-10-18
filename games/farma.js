// Farma: symulacja w dniach. Każda akcja kosztuje energię; sen kończy dzień, podlane rośliny rosną, ceny na targu się zmieniają.
// Pole: { soil: 0 trawa | 1 zaorane, crop, age, water, ready }. Cel: zebrać wymaganą kwotę przed końcem sezonu.
const Farm = (() => {
  const CROPS = {
    radish: { name: "Rzodkiewka", seed: 10, price: 26, days: 2, color: "#e64980" },
    carrot: { name: "Marchew", seed: 16, price: 42, days: 3, color: "#fd7e14" },
    berry: { name: "Truskawka", seed: 45, price: 30, days: 4, regrow: 1, color: "#e03131" },
    tomato: { name: "Pomidor", seed: 34, price: 52, days: 5, regrow: 2, color: "#fa5252" },
    corn: { name: "Kukurydza", seed: 40, price: 70, days: 6, regrow: 3, color: "#fab005" },
    pumpkin: { name: "Dynia", seed: 70, price: 260, days: 7, color: "#f76707" },
  };
  // jeden dzień wzrostu: podlane rośną, wrony zjadają niechronione, deszcz podlewa wszystko na następny dzień
  function grow(s, n, rng = Math.random) {
    const events = [];
    const protectedSet = new Set();
    s.items.forEach((it, i) => {
      if (it !== "scare") return;
      for (let k = 0; k < s.plots.length; k++) if (Math.abs((k % n) - (i % n)) <= 2 && Math.abs(((k / n) | 0) - ((i / n) | 0)) <= 2) protectedSet.add(k);
    });
    s.plots.forEach((p, i) => {
      if (!p.crop || p.ready) { p.water = false; return; }
      if (p.water) { p.age++; if (p.age >= CROPS[p.crop].days) p.ready = true; }
      p.water = false;
    });
    const crops = s.plots.map((p, i) => i).filter((i) => s.plots[i].crop && !protectedSet.has(i));
    if (crops.length && rng() < 0.3) {
      const i = crops[(rng() * crops.length) | 0];
      Object.assign(s.plots[i], { crop: null, age: 0, ready: false });
      events.push("Wrony zjadły jedną roślinę. Strach na wróble chroniłby to pole.");
    }
    s.rain = rng() < 0.22;
    if (s.rain) { s.plots.forEach((p) => (p.water = true)); events.push("Pada deszcz: wszystkie pola są podlane."); }
    // zraszacz podlewa sąsiednie pola każdego ranka
    s.items.forEach((it, i) => { if (it === "sprinkler") [i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1, i].forEach((k) => { if (k >= 0 && k < s.plots.length) s.plots[k].water = true; }); });
    // kury dają jajka, jeśli mają karmę
    const fed = Math.min(s.chickens, s.feed);
    s.feed -= fed;
    s.stock.egg = (s.stock.egg || 0) + fed;
    if (s.chickens > fed) events.push("Część kur nie dostała karmy i nie zniosła jajek.");
    // ceny: losowe wahania wokół ceny bazowej
    for (const k in CROPS) s.prices[k] = Math.round(CROPS[k].price * (0.75 + rng() * 0.55));
    s.prices.egg = Math.round(30 * (0.8 + rng() * 0.4));
    return events;
  }
  const api = { CROPS, grow, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Farm;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "farma"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, cols: 6, rows: 5, days: 20, goal: 2500 },
    { key: "medium", name: "Średni", points: 50, cols: 7, rows: 5, days: 24, goal: 5000 },
    { key: "hard", name: "Trudny", points: 100, cols: 8, rows: 6, days: 28, goal: 9000 },
  ],
  rules: [
    "Zbierz wymaganą sumę pieniędzy przed końcem sezonu. Wybierz narzędzie w panelu i klikaj pola.",
    "Motyka zaorze trawę, potem siejesz nasiona i podlewasz konewką. Podlana roślina rośnie o jeden dzień, gdy idziesz spać. Gotowe zbierasz sierpem i sprzedajesz na targu.",
    "Każda akcja kosztuje energię, która wraca po nocy. Truskawki, pomidory i kukurydza owocują wielokrotnie. Ceny zmieniają się codziennie, więc warto czekać na dobry dzień.",
    "Wrony zjadają rośliny, chyba że stoi przy nich strach na wróble. Zraszacz sam podlewa sąsiednie pola. Kury dają jajka, jeśli mają karmę.",
  ],
  achievements: [
    { id: "pierwszy-tysiac", name: "Pierwszy tysiąc", desc: "Zarób na targu 1000 zł w jednym sezonie.", points: 10 },
    { id: "przed-czasem", name: "Przed czasem", desc: "Uzbieraj cel, gdy do końca sezonu zostało co najmniej 5 dni.", points: 25 },
    { id: "magnat", name: "Magnat rolny", desc: "Wygraj trudny poziom w najwyżej 20 dni.", points: 50 },
  ],
  mount(board, ctx) {
    const { CROPS } = Farm;
    const lv = ctx.level, n = lv.cols;
    const s = {
      day: 1, money: 120, energy: 40, maxEnergy: 40, plots: Array.from({ length: n * lv.rows }, () => ({ soil: 0, crop: null, age: 0, water: false, ready: false })),
      items: new Array(n * lv.rows).fill(null), stock: {}, seeds: { radish: 6, carrot: 3 }, prices: {}, chickens: 0, feed: 0, can: 1, tool: "hoe", seed: "radish", rain: false, earned: 0,
    };
    Farm.last = s;
    for (const k in CROPS) s.prices[k] = CROPS[k].price;
    s.prices.egg = 30;
    // kilka pól zaoranych na start
    [0, 1, n, n + 1].forEach((i) => (s.plots[i].soil = 1));
    board.classList.add("fm");
    board.style.setProperty("--n", n);
    board.style.setProperty("--cols", n * 1.08 + 0.3);
    board.style.setProperty("--rows", lv.rows * 1.08 + 1.6);
    const sky = el("div", "fm-sky");
    const grid = el("div", "fm-grid");
    const cells = s.plots.map((_, i) => { const b = button("", "fm-plot"); b.dataset.i = i; b.append(el("span", "fm-crop"), el("span", "fm-item")); grid.append(b); return b; });
    board.append(sky, grid);
    const statEl = el("div", "td-stats");
    const sleepBtn = button("Idź spać (koniec dnia)", "btn wide", () => sleep());
    ctx.panel.append(panelBlock("", statEl, sleepBtn));
    const toolsEl = el("div", "fm-tools");
    ctx.panel.append(panelBlock("Narzędzia", toolsEl));
    const tabs = segmented("Sklep", ["Nasiona", "Targ", "Zakupy"], (k) => { tab = k; tabs.set(k); renderShop(); });
    let tab = 0;
    tabs.set(0);
    const shopEl = el("div", "fm-shop");
    ctx.panel.append(panelBlock("", tabs.el, shopEl));
    const msg = (t) => ctx.toast(t);

    const TOOLS = [["hoe", "Motyka", 1], ["seed", "Siew", 1], ["can", "Konewka", 1], ["sickle", "Sierp", 1], ["sprinkler", "Zraszacz", 0], ["scare", "Strach", 0]];
    function spend(e) {
      if (s.energy < e) { Sound.error(); msg("Brak energii. Idź spać"); return false; }
      s.energy -= e;
      return true;
    }
    function useAt(i) {
      if (ctx.done) return;
      const p = s.plots[i], t = s.tool;
      if (t === "hoe") {
        if (s.items[i]) { s.items[i] = null; Sound.erase(); return render(); }
        if (p.soil) return Sound.tap();
        if (!spend(2)) return;
        p.soil = 1;
        Sound.place(2);
      } else if (t === "seed") {
        if (!p.soil || p.crop || s.items[i]) return Sound.error();
        if (!(s.seeds[s.seed] > 0)) { msg(`Brak nasion: ${CROPS[s.seed].name}. Kup je w sklepie`); return Sound.error(); }
        if (!spend(1)) return;
        s.seeds[s.seed]--;
        Object.assign(p, { crop: s.seed, age: 0, ready: false });
        Sound.place(4);
      } else if (t === "can") {
        // ulepszona konewka podlewa krzyż pól
        const area = s.can > 1 ? [i, i - n, i + n, i % n ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1] : [i];
        const targets = area.filter((k) => k >= 0 && k < s.plots.length && s.plots[k].crop && !s.plots[k].water && !s.plots[k].ready);
        if (!targets.length) return Sound.tap();
        if (!spend(1)) return;
        targets.forEach((k) => { s.plots[k].water = true; replay(cells[k], "splash"); });
        Sound.place(6);
      } else if (t === "sickle") {
        if (!p.ready) return Sound.tap();
        if (!spend(1)) return;
        const c = CROPS[p.crop];
        s.stock[p.crop] = (s.stock[p.crop] || 0) + (p.crop === "corn" ? 2 : 1);
        if (c.regrow) Object.assign(p, { age: c.days - c.regrow, ready: false });
        else Object.assign(p, { crop: null, age: 0, ready: false });
        replay(cells[i], "harvest");
        Sound.line();
      } else if (t === "sprinkler" || t === "scare") {
        if (s.items[i] || p.crop) return Sound.error();
        if (!(s.stock[t] > 0)) { msg("Najpierw kup to w sklepie (zakładka Zakupy)"); return Sound.error(); }
        s.stock[t]--;
        s.items[i] = t;
        Sound.flag();
      }
      render();
    }
    let painting = false;
    grid.addEventListener("pointerdown", (e) => { const b = e.target.closest(".fm-plot"); if (!b) return; painting = true; useAt(+b.dataset.i); });
    grid.addEventListener("pointerover", (e) => { if (!painting || !["can", "seed", "hoe", "sickle"].includes(s.tool)) return; const b = e.target.closest(".fm-plot"); if (b) useAt(+b.dataset.i); });
    ctx.on(document, "pointerup", () => (painting = false));
    heldKeys(ctx, (k) => { const t = TOOLS[+k - 1]; if (t) { s.tool = t[0]; render(); } if (k === "enter") sleep(); });

    function farmAch(days) {
      if (days <= lv.days - 5) ctx.achieve("przed-czasem");
      if (ctx.level.key === "hard" && days <= 20) ctx.achieve("magnat");
    }
    function sleep() {
      if (ctx.done) return;
      const events = Farm.grow(s, n);
      s.day++;
      s.energy = s.maxEnergy;
      board.classList.add("night");
      setTimeout(() => board.classList.remove("night"), 600);
      Sound.place(1);
      if (events.length) msg(events[0]);
      render();
      if (s.money >= lv.goal) return farmAch(s.day - 1), ctx.win(`Uzbierane ${s.money} zł w ${s.day - 1} ${plural(s.day - 1, "dzień", "dni", "dni")}.`);
      if (s.day > lv.days) ctx.lose("Koniec sezonu", `Zebrane ${s.money} z ${lv.goal} zł.`);
    }
    function sell(k, all) {
      const have = s.stock[k] || 0;
      if (!have) return;
      const cnt = all ? have : 1;
      s.stock[k] -= cnt;
      s.money += cnt * s.prices[k];
      s.earned += cnt * s.prices[k];
      if (s.earned >= 1000) ctx.achieve("pierwszy-tysiac");
      Sound.place(9);
      render();
      if (s.money >= lv.goal) farmAch(s.day), ctx.win(`Uzbierane ${s.money} zł w ${s.day} ${plural(s.day, "dzień", "dni", "dni")}.`);
    }
    function buy(price, fn) {
      if (s.money < price) { Sound.error(); return msg("Za mało pieniędzy"); }
      s.money -= price;
      fn();
      Sound.place(5);
      render();
    }
    function renderShop() {
      const rows = [];
      if (tab === 0) for (const [k, c] of Object.entries(CROPS)) {
        const r = el("div", "fm-row");
        r.style.setProperty("--cc", c.color);
        r.append(el("i"), el("span", "", `${c.name} · ${c.days} dni${c.regrow ? `, potem co ${c.regrow}` : ""}`), el("small", "", `masz ${s.seeds[k] || 0}`));
        const b1 = button(`${c.seed} zł`, "btn-ghost", () => buy(c.seed, () => (s.seeds[k] = (s.seeds[k] || 0) + 1)));
        const b5 = button(`×5`, "btn-ghost", () => buy(c.seed * 5, () => (s.seeds[k] = (s.seeds[k] || 0) + 5)));
        r.append(b1, b5);
        rows.push(r);
      }
      if (tab === 1) {
        for (const k of [...Object.keys(CROPS), "egg"]) {
          const name = k === "egg" ? "Jajka" : CROPS[k].name, base = k === "egg" ? 30 : CROPS[k].price, price = s.prices[k];
          const r = el("div", "fm-row");
          r.style.setProperty("--cc", k === "egg" ? "#f1f3f5" : CROPS[k].color);
          const trend = price > base * 1.1 ? "up" : price < base * 0.9 ? "down" : "";
          r.append(el("i"), el("span", "", `${name} · ${s.stock[k] || 0} szt.`), el("small", `fm-price ${trend}`, `${price} zł`));
          const b1 = button("Sprzedaj", "btn-ghost", () => sell(k, false)), ba = button("Wszystko", "btn-ghost", () => sell(k, true));
          b1.disabled = ba.disabled = !s.stock[k];
          r.append(b1, ba);
          rows.push(r);
        }
      }
      if (tab === 2) {
        const offers = [
          ["Zraszacz", "Codziennie podlewa sąsiednie pola.", 160, () => (s.stock.sprinkler = (s.stock.sprinkler || 0) + 1), `masz ${s.stock.sprinkler || 0}`],
          ["Strach na wróble", "Odstrasza wrony w promieniu 2 pól.", 90, () => (s.stock.scare = (s.stock.scare || 0) + 1), `masz ${s.stock.scare || 0}`],
          ["Duża konewka", "Podlewa pole i 4 sąsiednie.", 350, () => (s.can = 2), s.can > 1 ? "kupiona" : ""],
          ["Kura", "Znosi jajko dziennie, je 1 karmę.", 140, () => s.chickens++, `masz ${s.chickens}`],
          ["Karma ×10", "Dla kur, na 10 dni dla jednej.", 40, () => (s.feed += 10), `zapas ${s.feed}`],
          ["Kawa", "Na stałe +8 energii dziennie.", 300, () => { s.maxEnergy += 8; s.energy += 8; }, `energia ${s.maxEnergy}`],
        ];
        for (const [name, text, price, fn, note] of offers) {
          const r = el("div", "fm-row tall");
          const t = el("span", "");
          t.append(el("b", "", name), el("small", "", ` ${text} ${note}`));
          const b = button(`${price} zł`, "btn-ghost", () => buy(price, fn));
          if (name === "Duża konewka" && s.can > 1) b.disabled = true;
          r.append(t, b);
          rows.push(r);
        }
      }
      shopEl.replaceChildren(...rows);
    }
    function render() {
      statEl.replaceChildren(...[["Dzień", `${Math.min(s.day, lv.days)} / ${lv.days}`, ""], ["Pieniądze", `${s.money} zł`, "gold"], ["Energia", `${s.energy}`, "lives"]].map(([k, v, c]) => { const d = el("span", `td-stat ${c}`); d.append(el("small", "", k), el("b", "", v)); return d; }));
      const goal = el("div", "rl-bar xp"); const f = el("i"); f.style.width = `${Math.min(1, s.money / lv.goal) * 100}%`; goal.append(f);
      statEl.append(el("p", "rl-small fm-goal", `Cel: ${lv.goal} zł`), goal);
      toolsEl.replaceChildren(...TOOLS.map(([id, name], k) => {
        const b = button("", `fm-tool${s.tool === id ? " on" : ""}`, () => { s.tool = id; Sound.tap(); render(); });
        b.append(el("i", `ic-${id}`), el("span", "", name), el("kbd", "", k + 1));
        return b;
      }));
      if (s.tool === "seed") {
        const pickSeed = el("div", "fm-seeds");
        for (const [k, c] of Object.entries(CROPS)) {
          const b = button(`${c.name} ${s.seeds[k] || 0}`, `chip${s.seed === k ? " on" : ""}`, () => { s.seed = k; render(); });
          b.style.setProperty("--cc", c.color);
          pickSeed.append(b);
        }
        toolsEl.append(pickSeed);
      }
      s.plots.forEach((p, i) => {
        const c = cells[i];
        c.className = `fm-plot${p.soil ? " soil" : ""}${p.water ? " wet" : ""}${p.ready ? " ready" : ""}`;
        const crop = c.firstChild;
        crop.dataset.stage = p.crop ? (p.ready ? 3 : Math.min(2, Math.floor((p.age / CROPS[p.crop].days) * 3))) : "";
        crop.style.setProperty("--cc", p.crop ? CROPS[p.crop].color : "transparent");
        c.lastChild.dataset.item = s.items[i] || "";
        c.setAttribute("aria-label", p.crop ? `${CROPS[p.crop].name}${p.ready ? ", gotowe" : `, dzień ${p.age}`}` : p.soil ? "Zaorane" : "Trawa");
      });
      sky.className = `fm-sky${s.rain ? " rain" : ""}`;
      sky.textContent = `${s.rain ? "Deszczowy" : "Słoneczny"} dzień ${Math.min(s.day, lv.days)}`;
      renderShop();
      ctx.progress(Math.min(1, s.money / lv.goal));
    }
    render();
  },
});
