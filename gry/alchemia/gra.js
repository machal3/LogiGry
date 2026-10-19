// Alchemia: rozbudowana symulacja pracowni alchemicznej.
// Mapa żywiołów, wytyczanie ścieżek składnikami, mieszanie w kotle, warzenie eliksirów i obsługa klientów.
{
  const INGREDIENTS = [
    {
      id: "ognik",
      name: "Ognisty korzeń",
      cost: 8,
      color: "#ff595e",
      // Ścieżka w górę i lekko w prawo (w stronę Ognia)
      path: [[0, -14], [4, -28], [2, -44]],
    },
    {
      id: "kropelka",
      name: "Wodny kwiat",
      cost: 8,
      color: "#1982c4",
      // Ścieżka w dół i falisto (w stronę Wody)
      path: [[-4, 14], [4, 28], [0, 44]],
    },
    {
      id: "glaz",
      name: "Kamienny grzyb",
      cost: 9,
      color: "#8ac926",
      // Ścieżka w lewo (w stronę Ziemi)
      path: [[-15, 3], [-30, -3], [-45, 0]],
    },
    {
      id: "pioro",
      name: "Wietrzne ziele",
      cost: 9,
      color: "#ffca3a",
      // Ścieżka w prawo (w stronę Powietrza)
      path: [[15, -3], [30, 3], [45, 0]],
    },
    {
      id: "krysztal",
      name: "Gwiezdny pył",
      cost: 16,
      color: "#c77dff",
      // Diagonalny skok (teleportuje przez wiry na odcinku pośrednim)
      path: [[18, -18], [36, -36]],
    },
  ];

  // Węzły eliksirów na mapie alchemicznej (środek mapy to (0, 0), promień mapy ~95)
  const POTIONS = [
    { id: "zar", name: "Eliksir Żaru", x: 6, y: -56, r: 12, basePrice: 36, color: "#ff4d6d", tier: 1 },
    { id: "mroz", name: "Kropla Mrozu", x: -4, y: 58, r: 12, basePrice: 36, color: "#00b4d8", tier: 1 },
    { id: "skala", name: "Kamienna Skóra", x: -58, y: 4, r: 12, basePrice: 38, color: "#70e000", tier: 1 },
    { id: "wiatr", name: "Oddech Zefiru", x: 58, y: -4, r: 12, basePrice: 38, color: "#ffd166", tier: 1 },
    { id: "zycie", name: "Nektar Życia", x: -46, y: -44, r: 11, basePrice: 58, color: "#ff758f", tier: 2 },
    { id: "mana", name: "Rosa Eteru", x: 46, y: 44, r: 11, basePrice: 58, color: "#4ea8de", tier: 2 },
    { id: "grom", name: "Wywar Gromu", x: 54, y: -52, r: 11, basePrice: 64, color: "#f9c74f", tier: 2 },
    { id: "kamien", name: "Kamień Filozoficzny", x: -52, y: 52, r: 10, basePrice: 88, color: "#e0aaff", tier: 3 },
  ];

  function createVortices(levelKey) {
    const base = [
      { x: -24, y: -26, r: 9 },
      { x: 26, y: 24, r: 9 },
      { x: -28, y: 26, r: 8.5 },
      { x: 26, y: -24, r: 8.5 },
    ];
    if (levelKey === "easy") return base.slice(0, 2);
    if (levelKey === "medium") return base;
    return [
      ...base,
      { x: 0, y: -32, r: 7.5 },
      { x: 0, y: 32, r: 7.5 },
      { x: -34, y: 0, r: 7.5 },
      { x: 34, y: 0, r: 7.5 },
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
    // Jakość: 3 gwiazdki w samym środku (d <= 4.2), 2 gwiazdki (d <= 8), 1 gwiazdka (d <= r)
    const stars = bestDist <= 4.2 ? 3 : bestDist <= 8.2 ? 2 : 1;
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
      // Sprawdź wejście w wir
      for (const v of vortices) {
        if (Math.hypot(cx - v.x, cy - v.y) < v.r) {
          return { x: cx, y: cy, queue: [], hitVortex: true };
        }
      }
    }
    // Ograniczenie do koła mapy
    const r = Math.hypot(cx, cy);
    if (r > 88) {
      cx = (cx / r) * 88;
      cy = (cy / r) * 88;
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
      { key: "easy", name: "Łatwy", points: 20, goalGold: 220, maxOrders: 6, startGold: 65 },
      { key: "medium", name: "Średni", points: 50, goalGold: 380, maxOrders: 8, startGold: 55 },
      { key: "hard", name: "Trudny", points: 100, goalGold: 560, maxOrders: 10, startGold: 50 },
    ],
    rules: [
      "Klikaj składniki (albo klawisze 1–5), aby wrzucać je do kotła. Każdy składnik wydłuża zaplanowaną ścieżkę esencji na mapie alchemicznej.",
      "Mieszaj wywar przyciskiem „Mieszaj w kotle” (Spacja) lub przeciągając po mapie, aby przesuwać esencję wzdłuż ścieżki. Dolej wody (W), aby cofnąć esencję ku środkowi.",
      "Gdy esencja znajdzie się wewnątrz kręgu poszukiwanego eliksiru, kliknij „Uwarz i sprzedaj” (Enter). Im bliżej środka kręgu, tym wyższa jakość (I–III) i cena.",
      "Unikaj fioletowych wirów niestabilności, które niszczą wywar, i zgromadź wymaganą liczbę sztuk złota przed końcem zamówień.",
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
      const cv = canvasGame(board, ctx, W, H, { max: 100, cls: "space" });
      const { g } = cv;

      const vortices = createVortices(key);
      const s = {
        gold: startGold,
        ordersDone: 0,
        x: 0,
        y: 0,
        trail: [[0, 0]],
        queue: [],
        stock: [3, 3, 3, 3, 1],
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

      const stirBtn = button("Mieszaj w kotle (Spacja)", "btn wide", () => stirCauldron(18));
      const waterBtn = button("Dolej wody źródlanej (W)", "btn-ghost wide", () => addWater());
      const brewBtn = button("Uwarz i sprzedaj (Enter)", "btn-ghost wide", () => finishBrew());
      ctx.panel.append(panelBlock("Pracownia", stirBtn, waterBtn, brewBtn));

      function updateUI() {
        goldEl.set(
          `${s.gold} / ${goalGold} zł`,
          s.gold / goalGold,
          `Klient ${s.ordersDone + 1} z ${maxOrders} · Odkryte: ${s.discovered.size}/${POTIONS.length}`
        );
        const brew = evaluateBrew(s.x, s.y);
        if (s.customer) {
          const w = s.customer.wanted;
          const match = brew && brew.potion.id === w.id;
          orderEl.set(
            `${w.name}`,
            null,
            match
              ? `Gotowe w kotle (jakość ${"I".repeat(brew.stars)}, cena ${Math.round(brew.value * 1.35)} zł)`
              : `${s.customer.who} płaci premię +35% za ten wywar`
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
        // Sprawdź czy gracz ma cokolwiek w zapasie lub złoto na najtańszy składnik i pusty kocioł
        const canAffordAny = s.stock.some((c) => c > 0) || s.gold >= 8 || s.queue.length > 0 || evaluateBrew(s.x, s.y);
        if (s.ordersDone >= maxOrders || !canAffordAny) {
          ctx.lose("Pracownia zamknięta", `Zebrano ${s.gold} z wymaganych ${goalGold} sztuk złota.`);
        }
      }

      function useIngredient(idx) {
        if (ctx.done) return;
        const ing = INGREDIENTS[idx];
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
        // Dokładamy punkty ścieżki względem ostatniego punktu kolejki (lub bieżącej pozycji esencji)
        const [bx, by] = s.queue.length ? s.queue[s.queue.length - 1] : [s.x, s.y];
        for (const [dx, dy] of ing.path) {
          s.queue.push([bx + dx, by + dy]);
        }
        for (let k = 0; k < 8; k++) {
          s.bubbles.push({
            x: 228 + (Math.random() - 0.5) * 26,
            y: 138 + Math.random() * 8,
            r: 2 + Math.random() * 3,
            vy: -(16 + Math.random() * 20),
            c: ing.color,
            life: 1,
          });
        }
        Sound.place(idx + 1);
        updateUI();
      }

      function stirCauldron(dist = 16) {
        if (ctx.done) return;
        if (!s.queue.length) {
          Sound.error();
          ctx.toast("Dodaj najpierw składnik do kotła");
          return;
        }
        s.stirAnim = 0.4;
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
          ctx.toast("Wir niestabilności pochłonął esencję! Wywar wraca do środka.");
        } else {
          Sound.tap();
        }
        updateUI();
        checkEndState();
      }

      function addWater() {
        if (ctx.done) return;
        const d = Math.hypot(s.x, s.y);
        if (d < 1) return;
        const move = Math.min(d, 16);
        s.x -= (s.x / d) * move;
        s.y -= (s.y / d) * move;
        s.trail.push([s.x, s.y]);
        if (s.trail.length > 50) s.trail.shift();
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
        s.cauldronHeat = 0.7;
        s.discovered.add(res.potion.id);
        ctx.achieve("pierwszy-eliksir");
        if (res.stars === 3) ctx.achieve("trzy-gwiazdki");
        if (s.discovered.size >= 5) ctx.achieve("ksiega-receptur");

        // Wybuch alchemicznych iskier nad kotłem
        for (let k = 0; k < 22; k++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 20 + Math.random() * 45;
          s.sparkles.push({
            x: 232,
            y: 145,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd - 25,
            c: res.potion.color,
            r: 1.5 + Math.random() * 2,
            life: 1.0,
          });
        }

        const isWanted = s.customer && s.customer.wanted.id === res.potion.id;
        const earned = isWanted ? Math.round(res.value * 1.35) : res.value;
        s.gold += earned;
        s.ordersDone++;
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
          stirCauldron(16);
        } else if (e.key.toLowerCase() === "w") {
          e.preventDefault();
          addWater();
        } else if (e.key === "Enter") {
          e.preventDefault();
          finishBrew();
        }
      });

      // Kliknięcie na mapie alchemicznej lub na kotle również miesza wywar
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [mx, my] = cv.at(e);
        if (Math.hypot(mx - 98, my - 98) < 88) {
          if (s.queue.length > 0) stirCauldron(14);
        } else if (mx > 195 && my > 95) {
          if (evaluateBrew(s.x, s.y)) finishBrew();
          else if (s.queue.length > 0) stirCauldron(14);
        }
      });

      updateUI();

      cv.loop((dt, now) => {
        if (s.stirAnim > 0) s.stirAnim = Math.max(0, s.stirAnim - dt);
        if (s.cauldronHeat > 0) s.cauldronHeat = Math.max(0, s.cauldronHeat - dt);

        // Tło pracowni alchemicznej
        g.fillStyle = "#120d1d";
        g.fillRect(0, 0, W, H);

        // --- LEWA CZĘŚĆ: Pergaminowa mapa żywiołów (środek w (98, 98), promień 86) ---
        const mx = 98, my = 98, mr = 86;

        // Zewnętrzna obręcz astrolabium
        g.save();
        g.translate(mx, my);
        g.fillStyle = "#1b1429";
        g.strokeStyle = "#5a3e85";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, mr, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Kręgi pomocnicze i osie żywiołów
        g.strokeStyle = "rgba(157, 78, 221, 0.18)";
        g.lineWidth = 0.8;
        for (const r of [30, 58, 82]) {
          g.beginPath();
          g.arc(0, 0, r, 0, Math.PI * 2);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(-mr, 0);
        g.lineTo(mr, 0);
        g.moveTo(0, -mr);
        g.lineTo(0, mr);
        g.stroke();

        // Podpisy czterech żywiołów
        g.fillStyle = "rgba(224, 170, 255, 0.55)";
        g.font = "bold 7px sans-serif";
        g.textAlign = "center";
        g.fillText("OGIEŃ", 0, -mr + 9);
        g.fillText("WODA", 0, mr - 4);
        g.fillText("ZIEMIA", -mr + 16, 3);
        g.fillText("POWIETRZE", mr - 22, 3);

        // Wiry niestabilności
        for (const v of vortices) {
          g.save();
          g.translate(v.x, v.y);
          g.rotate(now * 0.0025);
          g.fillStyle = "rgba(181, 23, 158, 0.25)";
          g.beginPath();
          g.arc(0, 0, v.r, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "#f72585";
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
          const pulse = isWanted ? 1 + 0.12 * Math.sin(now * 0.006) : 1;

          g.save();
          g.translate(p.x, p.y);
          g.fillStyle = isWanted ? "rgba(255, 209, 102, 0.22)" : "rgba(255, 255, 255, 0.06)";
          g.strokeStyle = p.color;
          g.lineWidth = isWanted ? 2.0 : 1.2;
          g.beginPath();
          g.arc(0, 0, p.r * pulse, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Środek idealnej jakości (III)
          g.fillStyle = p.color;
          g.beginPath();
          g.arc(0, 0, 3.2, 0, Math.PI * 2);
          g.fill();

          // Etykieta eliksiru
          g.fillStyle = isWanted ? "#ffd166" : isKnown ? "#e2e8f0" : "rgba(226, 232, 240, 0.65)";
          g.font = `${isWanted ? "bold " : ""}5.8px sans-serif`;
          g.textAlign = "center";
          g.fillText(p.name, 0, p.r + 7);
          g.restore();
        }

        // Przebyty ślad esencji na pergaminie (złota nić)
        if (s.trail && s.trail.length > 1) {
          g.strokeStyle = "rgba(250, 204, 21, 0.4)";
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(s.trail[0][0], s.trail[0][1]);
          for (let t = 1; t < s.trail.length; t++) {
            g.lineTo(s.trail[t][0], s.trail[t][1]);
          }
          g.stroke();
          g.fillStyle = "rgba(250, 204, 21, 0.55)";
          for (let t = 1; t < s.trail.length; t += 3) {
            g.beginPath();
            g.arc(s.trail[t][0], s.trail[t][1], 1.2, 0, Math.PI * 2);
            g.fill();
          }
        }

        // Zaplanowana ścieżka w kolejce
        if (s.queue.length > 0) {
          g.strokeStyle = "#e0aaff";
          g.lineWidth = 1.6;
          g.setLineDash([3, 2.5]);
          g.beginPath();
          g.moveTo(s.x, s.y);
          for (const [qx, qy] of s.queue) g.lineTo(qx, qy);
          g.stroke();
          g.setLineDash([]);

          const [lx, ly] = s.queue[s.queue.length - 1];
          g.fillStyle = "#e0aaff";
          g.beginPath();
          g.arc(lx, ly, 2.5, 0, Math.PI * 2);
          g.fill();
        }

        //Aktualny znacznik esencji (buteleczka w kotle)
        const curBrew = evaluateBrew(s.x, s.y);
        g.fillStyle = curBrew ? curBrew.potion.color : "#ffffff";
        g.strokeStyle = "#120d1d";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(s.x, s.y, 4.8, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        g.restore();

        // --- PRAWA CZĘŚĆ: Kocioł alchemiczny, klient i półka ---
        // Karta klienta na górze po prawej
        if (s.customer) {
          g.fillStyle = "#221933";
          g.strokeStyle = s.customer.wanted.color;
          g.lineWidth = 1.3;
          g.beginPath();
          g.roundRect(192, 14, 80, 58, 6);
          g.fill();
          g.stroke();

          g.fillStyle = "#cbd5e1";
          g.font = "6px sans-serif";
          g.fillText(s.customer.who, 198, 25);

          g.fillStyle = "#ffffff";
          g.font = "bold 6.8px sans-serif";
          g.fillText("Szuka:", 198, 37);
          g.fillStyle = s.customer.wanted.color;
          g.fillText(s.customer.wanted.name, 198, 47);

          // Rysunek fiolki zamówienia
          g.fillStyle = s.customer.wanted.color;
          g.beginPath();
          g.arc(258, 56, 7, 0, Math.PI * 2);
          g.fill();
          g.fillRect(256, 46, 4, 5);
          g.fillStyle = "#ffd166";
          g.font = "bold 6.5px sans-serif";
          g.fillText(`~${Math.round(s.customer.wanted.basePrice * 1.35)} zł`, 198, 62);
        }

        // Kocioł na dole po prawej (środek x=232, y=148)
        const cx = 232, cy = 148;

        // Ogień pod kotłem
        const fire = 1 + s.cauldronHeat * 0.6 + 0.12 * Math.sin(now * 0.015);
        g.fillStyle = "#ff595e";
        g.beginPath();
        g.ellipse(cx, cy + 26, 22 * fire, 6 * fire, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ffca3a";
        g.beginPath();
        g.ellipse(cx, cy + 26, 13 * fire, 3.5 * fire, 0, 0, Math.PI * 2);
        g.fill();

        // Łyżka mieszająca
        const spoonX = cx + Math.sin(now * 0.008) * (s.stirAnim > 0 ? 12 : 4);
        g.strokeStyle = "#b08968";
        g.lineWidth = 3.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(spoonX, cy - 10);
        g.lineTo(spoonX + 10, cy - 36);
        g.stroke();

        // Czasza kotła
        g.fillStyle = "#2b2d42";
        g.strokeStyle = "#8d99ae";
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(cx, cy, 26, -0.15, Math.PI + 0.15);
        g.closePath();
        g.fill();
        g.stroke();

        // Powierzchnia bulgoczącego wywaru
        const liquidCol = curBrew ? curBrew.potion.color : "#9d4edd";
        g.fillStyle = liquidCol;
        g.beginPath();
        g.ellipse(cx, cy - 4, 24, 6.5, 0, 0, Math.PI * 2);
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
            r: 1.5 + Math.random() * 2.2,
            vy: -(10 + Math.random() * 14),
            c: liquidCol,
            life: 0.9,
          });
        }

        // Alchemiczne iskry po udanym uwarzeniu eliksiru
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
        g.fillStyle = "#e2e8f0";
        g.font = "bold 6.5px sans-serif";
        g.textAlign = "center";
        g.fillText(
          curBrew ? `${curBrew.potion.name} (${"I".repeat(curBrew.stars)})` : "Szukaj receptury...",
          cx,
          cy + 39
        );
      });
    },
  });
}
