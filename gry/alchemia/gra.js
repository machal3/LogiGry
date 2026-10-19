// Alchemia: rozbudowana symulacja pracowni alchemicznej.
// Mapa żywiołów, wytyczanie ścieżek składnikami, mieszanie w kotle, warzenie eliksirów i obsługa klientów.
{
  const INGREDIENTS = [
    {
      id: "ognik",
      name: "Ognisty korzeń",
      cost: 7,
      color: "#ff595e",
      // Ścieżka w górę (w stronę Ognia)
      path: [[0, -14], [3, -28], [0, -42]],
    },
    {
      id: "kropelka",
      name: "Wodny kwiat",
      cost: 7,
      color: "#1982c4",
      // Ścieżka w dół (w stronę Wody)
      path: [[-3, 14], [3, 28], [0, 42]],
    },
    {
      id: "glaz",
      name: "Kamienny grzyb",
      cost: 8,
      color: "#8ac926",
      // Ścieżka w lewo (w stronę Ziemi)
      path: [[-14, 2], [-28, -2], [-42, 0]],
    },
    {
      id: "pioro",
      name: "Wietrzne ziele",
      cost: 8,
      color: "#ffca3a",
      // Ścieżka w prawo (w stronę Powietrza)
      path: [[14, -2], [28, 2], [42, 0]],
    },
    {
      id: "krysztal",
      name: "Gwiezdny pył",
      cost: 14,
      color: "#c77dff",
      // Diagonalny skok ku północnemu wschodowi
      path: [[16, -16], [34, -34]],
    },
  ];

  // Węzły eliksirów na mapie alchemicznej (środek mapy to (0, 0), promień koła 72)
  const POTIONS = [
    { id: "zar", name: "Eliksir Żaru", short: "Żar", x: 0, y: -50, lx: 0, ly: -62, r: 10.5, basePrice: 42, color: "#ff4d6d", tier: 1 },
    { id: "mroz", name: "Kropla Mrozu", short: "Mróz", x: 0, y: 50, lx: 0, ly: 62, r: 10.5, basePrice: 42, color: "#00b4d8", tier: 1 },
    { id: "skala", name: "Kamienna Skóra", short: "Skała", x: -50, y: 0, lx: -50, ly: 13, r: 10.5, basePrice: 44, color: "#70e000", tier: 1 },
    { id: "wiatr", name: "Oddech Zefiru", short: "Zefir", x: 50, y: 0, lx: 50, ly: 13, r: 10.5, basePrice: 44, color: "#ffd166", tier: 1 },
    { id: "zycie", name: "Nektar Życia", short: "Życie", x: -37, y: -37, lx: -37, ly: -49, r: 10, basePrice: 64, color: "#ff758f", tier: 2 },
    { id: "mana", name: "Rosa Eteru", short: "Eter", x: 37, y: 37, lx: 37, ly: 49, r: 10, basePrice: 64, color: "#4ea8de", tier: 2 },
    { id: "grom", name: "Wywar Gromu", short: "Grom", x: 37, y: -37, lx: 37, ly: -49, r: 10, basePrice: 68, color: "#f9c74f", tier: 2 },
    { id: "kamien", name: "Kamień Filozoficzny", short: "Kamień", x: -37, y: 37, lx: -37, ly: 49, r: 9.5, basePrice: 95, color: "#e0aaff", tier: 3 },
  ];

  function createVortices(levelKey) {
    const base = [
      { x: -20, y: -21, r: 7.5 },
      { x: 21, y: 20, r: 7.5 },
      { x: -21, y: 20, r: 7.0 },
      { x: 20, y: -21, r: 7.0 },
    ];
    if (levelKey === "easy") return base.slice(0, 2);
    if (levelKey === "medium") return base;
    return [
      ...base,
      { x: 0, y: -27, r: 6.2 },
      { x: 0, y: 27, r: 6.2 },
      { x: -27, y: 0, r: 6.2 },
      { x: 27, y: 0, r: 6.2 },
    ];
  }

  // Oblicza jakość uwarzonego eliksiru w punkcie (px, py)
  function evaluateBrew(px, py) {
    let best = null;
    let bestDist = Infinity;
    for (const p of POTIONS) {
      const d = Math.hypot(px - p.x, py - p.y);
      if (d <= p.r && d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    if (!best) return null;
    const stars = bestDist <= 3.8 ? 3 : bestDist <= 7.4 ? 2 : 1;
    const mult = stars === 3 ? 1.5 : stars === 2 ? 1.15 : 0.85;
    return {
      potion: best,
      stars,
      value: Math.round(best.basePrice * mult),
      dist: bestDist,
    };
  }

  // Przesuwa esencję po kolejce punktów o odcinek `stepLen`
  function stepAlongQueue(x, y, queue, stepLen, vortices) {
    let rem = stepLen;
    let cx = x, cy = y;
    const nextQ = queue.map((p) => [...p]);
    while (rem > 0 && nextQ.length > 0) {
      const [tx, ty] = nextQ[0];
      const dx = tx - cx, dy = ty - cy;
      const d = Math.hypot(dx, dy);
      if (d <= rem) {
        cx = tx;
        cy = ty;
        rem -= d;
        nextQ.shift();
      } else {
        cx += (dx / d) * rem;
        cy += (dy / d) * rem;
        rem = 0;
      }
      for (const v of vortices) {
        if (Math.hypot(cx - v.x, cy - v.y) < v.r) {
          return { x: cx, y: cy, queue: [], hitVortex: true };
        }
      }
    }
    const r = Math.hypot(cx, cy);
    if (r > 68) {
      cx = (cx / r) * 68;
      cy = (cy / r) * 68;
    }
    return { x: cx, y: cy, queue: nextQ, hitVortex: false };
  }

  if (typeof module !== "undefined") {
    module.exports = { INGREDIENTS, POTIONS, createVortices, evaluateBrew, stepAlongQueue };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "alchemia",
    cat: "symulacje",
    big: true,
    name: "Alchemia",
    author: "Gemini 4",
    desc: "Warz eliksiry w pracowni, łącz składniki w kotle, odkrywaj receptury i realizuj zamówienia klientów.",
    color: "#9d4edd",
    ink: "#ffffff",
    glyph: [".###.", "..#..", ".###.", "#####", ".###."],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, goalGold: 210, maxOrders: 7, startGold: 70 },
      { key: "medium", name: "Średni", points: 50, goalGold: 360, maxOrders: 9, startGold: 65 },
      { key: "hard", name: "Trudny", points: 100, goalGold: 520, maxOrders: 11, startGold: 60 },
    ],
    rules: [
      "Wybieraj składniki (lub klawisze 1–5), aby wrzucać je do kotła i wytyczać ścieżkę esencji na kole żywiołów.",
      "Mieszaj wywar przyciskiem „Mieszaj w kotle” (Spacja) lub klikając w kocioł na planszy. Rozcieńcz wodą (Backspace), aby cofnąć esencję ku środkowi.",
      "Gdy esencja wejdzie w krąg receptury, kliknij „Uwarz i sprzedaj” (Enter) lub kartę klienta. Środek kręgu daje najwyższą jakość (III).",
      "Unikaj wirów niestabilności i zgromadź wymaganą kwotę złota przed obsłużeniem wszystkich klientów.",
    ],
    achievements: [
      { id: "pierwszy-eliksir", name: "Czeladnik", desc: "Uwarz i sprzedaj swój pierwszy eliksir.", points: 10 },
      { id: "trzy-gwiazdki", name: "Czysta esencja", desc: "Uwarz eliksir najwyższej jakości (III stopnia).", points: 25 },
      { id: "ksiega-receptur", name: "Wielki zielarz", desc: "Odkryj co najmniej 5 różnych eliksirów w jednej grze.", points: 25 },
      { id: "kamien-mistrza", name: "Kamień Filozoficzny", desc: "Uwarz Kamień Filozoficzny i wygraj bez zepsucia żadnego wywaru.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, goalGold, maxOrders, startGold } = ctx.level;
      const W = 280, H = 195;
      const MAP_CX = 92, MAP_CY = 98, MAP_R = 72;
      const cv = canvasGame(board, ctx, W, H, { max: 100, cls: "space" });
      const { g, theme } = cv;

      const vortices = createVortices(key);
      const s = {
        gold: startGold,
        ordersDone: 0,
        x: 0,
        y: 0,
        trail: [[0, 0]],
        queue: [],
        stock: [4, 4, 4, 4, 2],
        discovered: new Set(),
        ruined: 0,
        customer: null,
        bubbles: [],
        sparkles: [],
        cauldronHeat: 0,
        stirAnim: 0,
      };

      function nextCustomer() {
        const maxTier = s.ordersDone < 2 ? 1 : s.ordersDone < 5 ? 2 : 3;
        const pool = POTIONS.filter((p) => p.tier <= maxTier);
        const wanted = pick(pool);
        const titles = [
          "Wędrowny rycerz",
          "Zielarka z lasu",
          "Strażnik miejski",
          "Kupiec korzenny",
          "Uczony z akademii",
          "Kapitan żeglugi",
        ];
        s.customer = {
          who: pick(titles),
          wanted,
        };
      }
      nextCustomer();

      const goldEl = statBlock(ctx, "Złoto pracowni", { meter: true });
      const orderEl = statBlock(ctx, "Zamówienie klienta", { small: true });

      const ingBox = el("div", "al-ings");
      const ingBtns = INGREDIENTS.map((ing, i) => {
        const b = button("", "btn-ghost al-ing-btn", () => useIngredient(i));
        ingBox.append(b);
        return b;
      });
      ctx.panel.append(panelBlock("Składniki (1–5)", ingBox));

      const brewBtn = button("Uwarz i sprzedaj (Enter)", "btn wide", () => finishBrew());
      const stirBtn = button("Mieszaj w kotle (Spacja)", "btn-ghost wide", () => stirCauldron(15));
      const dumpBtn = button("Rozcieńcz wodą (Backspace)", "btn-ghost wide", () => addWater());
      ctx.panel.append(panelBlock("Pracownia", brewBtn, stirBtn, dumpBtn));

      function updateUI() {
        goldEl.set(
          `${s.gold} / ${goalGold} zł`,
          s.gold / goalGold,
          `Klient ${Math.min(maxOrders, s.ordersDone + 1)} z ${maxOrders} · Odkryte: ${s.discovered.size}/${POTIONS.length}`
        );
        const brew = evaluateBrew(s.x, s.y);
        if (s.customer) {
          const w = s.customer.wanted;
          const match = brew && brew.potion.id === w.id;
          orderEl.set(
            `${w.name}`,
            null,
            match
              ? `Gotowe w kotle (jakość ${"I".repeat(brew.stars)}, cena ${Math.round(brew.value * 1.4)} zł)`
              : `${s.customer.who} płaci premię +40% za ten wywar`
          );
        }
        INGREDIENTS.forEach((ing, i) => {
          const cnt = s.stock[i];
          ingBtns[i].textContent = `${i + 1}. ${ing.name} (${cnt > 0 ? `${cnt} szt.` : `${ing.cost} zł`})`;
        });
        ctx.progress(Math.min(1, s.gold / goalGold));
      }

      function checkEndState() {
        if (ctx.done) return;
        if (s.gold >= goalGold) {
          if (s.discovered.has("kamien") && s.ruined === 0) ctx.achieve("kamien-mistrza");
          ctx.win(`Zebrałeś ${s.gold} sztuk złota i odkryłeś ${s.discovered.size} receptur.`);
          return;
        }
        const canBrewNow = Boolean(evaluateBrew(s.x, s.y));
        const canPullToRecipe = Math.hypot(s.x, s.y) > 10;
        const canAffordAny = s.stock.some((c) => c > 0) || s.gold >= 7 || s.queue.length > 0 || canBrewNow || canPullToRecipe;
        if (s.ordersDone >= maxOrders || !canAffordAny) {
          ctx.lose("Pracownia zamknięta", `Zebrano ${s.gold} z wymaganych ${goalGold} sztuk złota.`);
        }
      }

      function useIngredient(idx) {
        if (ctx.done) return;
        const ing = INGREDIENTS[idx];
        if (!ing) return;
        if (s.stock[idx] <= 0) {
          if (s.gold < ing.cost) {
            Sound.error();
            ctx.toast("Za mało złota na zakup tego składnika");
            return;
          }
          s.gold -= ing.cost;
          s.stock[idx]++;
        }
        s.stock[idx]--;
        const [bx, by] = s.queue.length ? s.queue[s.queue.length - 1] : [s.x, s.y];
        for (const [dx, dy] of ing.path) {
          s.queue.push([bx + dx, by + dy]);
        }
        for (let k = 0; k < 8; k++) {
          s.bubbles.push({
            x: 226 + (Math.random() - 0.5) * 26,
            y: 138 + Math.random() * 8,
            r: 2 + Math.random() * 2.8,
            vy: -(16 + Math.random() * 18),
            c: ing.color,
            life: 1,
          });
        }
        Sound.place(idx + 1);
        updateUI();
      }

      function stirCauldron(dist = 15) {
        if (ctx.done) return;
        if (!s.queue.length) {
          Sound.error();
          ctx.toast("Dodaj najpierw składnik do kotła");
          return;
        }
        s.stirAnim = 0.45;
        const res = stepAlongQueue(s.x, s.y, s.queue, dist, vortices);
        s.x = res.x;
        s.y = res.y;
        s.queue = res.queue;
        s.trail.push([s.x, s.y]);
        if (s.trail.length > 50) s.trail.shift();
        if (res.hitVortex) {
          s.ruined++;
          s.x = 0;
          s.y = 0;
          s.trail = [[0, 0]];
          s.queue = [];
          Sound.error();
          ctx.toast("Wir niestabilności pochłonął esencję, wywar wraca do środka");
        } else {
          Sound.tap();
        }
        updateUI();
        checkEndState();
      }

      function addWater() {
        if (ctx.done) return;
        const d = Math.hypot(s.x, s.y);
        if (d < 1 && s.queue.length === 0) {
          ctx.toast("Esencja jest już w samym środku koła");
          return;
        }
        if (d >= 1) {
          const move = Math.min(d, 15);
          s.x -= (s.x / d) * move;
          s.y -= (s.y / d) * move;
          s.trail.push([s.x, s.y]);
          if (s.trail.length > 50) s.trail.shift();
        } else {
          s.queue = [];
        }
        Sound.erase();
        updateUI();
      }

      function finishBrew() {
        if (ctx.done) return;
        const res = evaluateBrew(s.x, s.y);
        if (!res) {
          Sound.error();
          ctx.toast("Esencja nie znajduje się w żadnym kręgu receptury");
          return;
        }
        s.cauldronHeat = 0.75;
        s.discovered.add(res.potion.id);
        ctx.achieve("pierwszy-eliksir");
        if (res.stars === 3) ctx.achieve("trzy-gwiazdki");
        if (s.discovered.size >= 5) ctx.achieve("ksiega-receptur");

        for (let k = 0; k < 20; k++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 18 + Math.random() * 42;
          s.sparkles.push({
            x: 226,
            y: 140,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd - 24,
            c: res.potion.color,
            r: 1.5 + Math.random() * 2,
            life: 1.0,
          });
        }

        const isWanted = s.customer && s.customer.wanted.id === res.potion.id;
        const earned = isWanted ? Math.round(res.value * 1.4) : res.value;
        s.gold += earned;
        s.ordersDone++;

        // Dostawa świeżych ziół z ogrodu po każdym zrealizowanym zamówieniu
        s.stock[s.ordersDone % 4]++;

        s.x = 0;
        s.y = 0;
        s.trail = [[0, 0]];
        s.queue = [];
        Sound.line();
        ctx.toast(
          `${res.potion.name} (${"I".repeat(res.stars)}): +${earned} zł${isWanted ? " (premia klienta)" : ""}`
        );
        nextCustomer();
        updateUI();
        checkEndState();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key >= "1" && e.key <= "5") {
          e.preventDefault();
          useIngredient(+e.key - 1);
        } else if (e.key === " ") {
          e.preventDefault();
          stirCauldron(15);
        } else if (e.key.toLowerCase() === "w" || e.key === "Backspace") {
          e.preventDefault();
          addWater();
        } else if (e.key === "Enter") {
          e.preventDefault();
          finishBrew();
        }
      });

      // Kliknięcie na kole alchemicznym, w kartę klienta lub bezpośrednio w kocioł
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [mx, my] = cv.at(e);
        // Karta zamówienia klienta (prawa góra)
        if (mx >= 178 && mx <= 274 && my >= 10 && my <= 82) {
          if (evaluateBrew(s.x, s.y)) {
            finishBrew();
          } else {
            ctx.toast(`Zamówienie: ${s.customer ? s.customer.wanted.name : "brak"}`);
          }
          return;
        }
        // Kocioł alchemiczny (prawy dół)
        if (mx >= 182 && my >= 95) {
          if (s.queue.length > 0) {
            stirCauldron(15);
          } else if (evaluateBrew(s.x, s.y)) {
            finishBrew();
          } else {
            addWater();
          }
          return;
        }
        // Koło alchemiczne po lewej
        if (Math.hypot(mx - MAP_CX, my - MAP_CY) <= MAP_R + 8) {
          if (s.queue.length > 0) {
            stirCauldron(15);
          } else if (evaluateBrew(s.x, s.y)) {
            finishBrew();
          }
        }
      });

      updateUI();

      cv.loop((dt, now) => {
        if (s.stirAnim > 0) s.stirAnim = Math.max(0, s.stirAnim - dt);
        if (s.cauldronHeat > 0) s.cauldronHeat = Math.max(0, s.cauldronHeat - dt);

        // Tło pracowni alchemicznej
        g.fillStyle = "#120d1d";
        g.fillRect(0, 0, W, H);

        // --- LEWA CZĘŚĆ: Koło żywiołów (środek MAP_CX = 92, MAP_CY = 98, promień MAP_R = 72) ---
        g.save();
        g.translate(MAP_CX, MAP_CY);

        // Zewnętrzna obręcz astrolabium
        g.fillStyle = "#1b1429";
        g.strokeStyle = "#5a3e85";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, MAP_R, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Kręgi pomocnicze i osie żywiołów
        g.strokeStyle = "rgba(157, 78, 221, 0.2)";
        g.lineWidth = 0.8;
        for (const r of [25, 50, 68]) {
          g.beginPath();
          g.arc(0, 0, r, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-MAP_R, 0);
        g.lineTo(MAP_R, 0);
        g.moveTo(0, -MAP_R);
        g.lineTo(0, MAP_R);
        g.stroke();

        // Podpisy czterech żywiołów poza obrębem węzłów, żeby nic na siebie nie nachodziło
        cv.text("OGIEŃ", 0, -MAP_R - 7, { size: 5.2, weight: 700, color: "orange" });
        cv.text("WODA", 0, MAP_R + 8, { size: 5.2, weight: 700, color: "blue" });
        cv.text("ZIEMIA", -MAP_R + 18, -MAP_R - 6, { size: 4.8, weight: 700, color: "green" });
        cv.text("POWIETRZE", MAP_R - 22, -MAP_R - 6, { size: 4.8, weight: 700, color: "gold" });

        // Wiry niestabilności
        for (const v of vortices) {
          g.save();
          g.translate(v.x, v.y);
          g.rotate(now * 0.0025);
          g.fillStyle = "rgba(181, 23, 158, 0.25)";
          g.beginPath();
          g.arc(0, 0, v.r, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = theme.pink;
          g.lineWidth = 1.2;
          for (let a = 0; a < 3; a++) {
            const ang = (a * Math.PI * 2) / 3;
            g.beginPath();
            g.arc(0, 0, v.r * 0.65, ang, ang + 1.3);
            g.stroke();
          }
          g.restore();
        }

        // Węzły eliksirów na mapie
        for (const p of POTIONS) {
          const isWanted = s.customer && s.customer.wanted.id === p.id;
          const isKnown = s.discovered.has(p.id);
          const pulse = isWanted ? 1 + 0.1 * Math.sin(now * 0.006) : 1;

          g.save();
          g.translate(p.x, p.y);
          g.fillStyle = isWanted ? "rgba(255, 209, 102, 0.24)" : "rgba(255, 255, 255, 0.06)";
          g.strokeStyle = p.color;
          g.lineWidth = isWanted ? 2.0 : 1.2;
          g.beginPath();
          g.arc(0, 0, p.r * pulse, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Środek idealnej jakości (III)
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(0, 0, 2.8, 0, Math.PI * 2);
          g.fill();
          g.restore();

          // Czytelna etykieta z podkładem odsunięta od środka i wirów
          const labelW = p.short.length * 3.1 + 7;
          g.fillStyle = "rgba(18, 13, 29, 0.86)";
          g.beginPath();
          g.roundRect(p.lx - labelW / 2, p.ly - 4, labelW, 8, 2.5);
          g.fill();

          cv.text(p.short, p.lx, p.ly, {
            size: 4.8,
            weight: isWanted ? 700 : 600,
            color: isWanted ? "gold" : isKnown ? "on" : "muted",
          });
        }

        // Przebyty ślad esencji na pergaminie
        if (s.trail && s.trail.length > 1) {
          g.strokeStyle = "rgba(250, 204, 21, 0.42)";
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(s.trail[0][0], s.trail[0][1]);
          for (let t = 1; t < s.trail.length; t++) {
            g.lineTo(s.trail[t][0], s.trail[t][1]);
          }
          g.stroke();
        }

        // Zaplanowana ścieżka w kolejce
        if (s.queue.length > 0) {
          g.strokeStyle = "#e0aaff";
          g.lineWidth = 1.5;
          g.setLineDash([3, 2.5]);
          g.beginPath();
          g.moveTo(s.x, s.y);
          for (const [qx, qy] of s.queue) g.lineTo(qx, qy);
          g.stroke();
          g.setLineDash([]);

          const [lx, ly] = s.queue[s.queue.length - 1];
          g.fillStyle = "#e0aaff";
          g.beginPath();
          g.arc(lx, ly, 2.4, 0, Math.PI * 2);
          g.fill();
        }

        // Aktualny znacznik esencji
        const curBrew = evaluateBrew(s.x, s.y);
        g.fillStyle = curBrew ? curBrew.potion.color : "#ffffff";
        g.strokeStyle = "#120d1d";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(s.x, s.y, 4.6, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        g.restore();

        // --- PRAWA CZĘŚĆ: Karta zamówienia klienta i kocioł alchemiczny ---
        if (s.customer) {
          const w = s.customer.wanted;
          const isReady = curBrew && curBrew.potion.id === w.id;
          g.fillStyle = "#221933";
          g.strokeStyle = isReady ? theme.gold : w.color;
          g.lineWidth = isReady ? 2.0 : 1.3;
          g.beginPath();
          g.roundRect(180, 12, 92, 66, 6);
          g.fill();
          g.stroke();

          cv.text(`Klient ${Math.min(maxOrders, s.ordersDone + 1)}/${maxOrders}`, 186, 21, {
            size: 4.5,
            weight: 600,
            color: "muted",
            align: "left",
          });
          cv.text(s.customer.who, 186, 30, {
            size: 5.0,
            weight: 700,
            color: "on",
            align: "left",
          });
          cv.text(w.name, 186, 42, {
            size: 5.2,
            weight: 700,
            color: w.color,
            align: "left",
          });
          cv.text(`Premia: ~${Math.round(w.basePrice * 1.4)} zł`, 186, 53, {
            size: 4.8,
            weight: 600,
            color: "gold",
            align: "left",
          });
          cv.text(
            curBrew ? "Kliknij: sprzedaj wywar" : "Doprowadź esencję do kręgu",
            186,
            66,
            {
              size: 4.3,
              weight: 600,
              color: curBrew ? "ok" : "muted",
              align: "left",
            }
          );

          // Fiolka eliksiru na karcie zamówienia
          const vx = 258, vy = 38;
          g.fillStyle = "rgba(255, 255, 255, 0.14)";
          g.beginPath();
          g.roundRect(vx - 3, vy - 12, 6, 5, 1);
          g.fill();
          g.fillStyle = w.color;
          g.strokeStyle = "#ffffff";
          g.lineWidth = 1;
          g.beginPath();
          g.arc(vx, vy - 1, 7.5, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        }

        // Kocioł na dole po prawej (środek cx = 226, cy = 140)
        const cx = 226, cy = 140;

        // Płomień pod kotłem
        const fire = 1 + s.cauldronHeat * 0.55 + 0.12 * Math.sin(now * 0.015);
        g.fillStyle = theme.red;
        g.beginPath();
        g.ellipse(cx, cy + 25, 22 * fire, 5.5 * fire, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = theme.gold;
        g.beginPath();
        g.ellipse(cx, cy + 25, 13 * fire, 3.2 * fire, 0, 0, Math.PI * 2);
        g.fill();

        // Drewniana łyżka mieszająca
        const spoonX = cx + Math.sin(now * 0.009) * (s.stirAnim > 0 ? 12 : 4);
        g.strokeStyle = "#b08968";
        g.lineWidth = 3.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(spoonX, cy - 8);
        g.lineTo(spoonX + 10, cy - 34);
        g.stroke();

        // Żeliwna czasza kotła
        g.fillStyle = "#2b2d42";
        g.strokeStyle = "#8d99ae";
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(cx, cy, 26, -0.15, Math.PI + 0.15);
        g.closePath();
        g.fill();
        g.stroke();

        // Powierzchnia bulgoczącej cieczy
        const liquidCol = curBrew ? curBrew.potion.color : "#9d4edd";
        g.fillStyle = liquidCol;
        g.beginPath();
        g.ellipse(cx, cy - 4, 24, 6.2, 0, 0, Math.PI * 2);
        g.fill();

        // Bąbelki nad kotłem
        for (let i = s.bubbles.length - 1; i >= 0; i--) {
          const b = s.bubbles[i];
          b.y += b.vy * dt;
          b.life -= dt * 1.1;
          if (b.life <= 0) {
            s.bubbles.splice(i, 1);
            continue;
          }
          g.fillStyle = b.c;
          g.globalAlpha = Math.max(0, b.life);
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }
        if (Math.random() < 0.25) {
          s.bubbles.push({
            x: cx + (Math.random() - 0.5) * 32,
            y: cy - 5,
            r: 1.4 + Math.random() * 2.1,
            vy: -(10 + Math.random() * 14),
            c: liquidCol,
            life: 0.9,
          });
        }

        // Iskry po uwarzeniu eliksiru
        for (let i = s.sparkles.length - 1; i >= 0; i--) {
          const sp = s.sparkles[i];
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.vy += 45 * dt;
          sp.life -= dt * 1.4;
          if (sp.life <= 0) {
            s.sparkles.splice(i, 1);
            continue;
          }
          g.fillStyle = sp.c;
          g.globalAlpha = Math.max(0, sp.life);
          g.beginPath();
          g.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }

        // Podpis stanu kotła
        cv.text(
          curBrew
            ? `${curBrew.potion.name} (${"I".repeat(curBrew.stars)})`
            : s.queue.length > 0
              ? "Kliknij kocioł: mieszaj"
              : "Dodaj składniki (1–5)",
          cx,
          cy + 40,
          { size: 5.0, weight: 700, color: curBrew ? "gold" : "on" }
        );
      });
    },
  });
}
