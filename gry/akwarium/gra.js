// Akwarium: rozbudowana symulacja ekosystemu rafy koralowej.
// Hodowla morskich okazów, karmienie, zbieranie pereł z małża, filtry tlenowe i obrona przed drapieżnikiem.
{
  const FISH_TYPES = {
    blazenek: { name: "Błazenek", cost: 35, coinVal: 10, coinRate: 7.5, speed: 28, color: "#f97316", palette: "orange" },
    pokolec: { name: "Pokolec", cost: 75, coinVal: 22, coinRate: 8.5, speed: 34, color: "#3b82f6", palette: "blue" },
    skalar: { name: "Skalar", cost: 130, coinVal: 38, coinRate: 9.5, speed: 25, color: "#ec4899", palette: "pink" },
    zolw: { name: "Żółw morski", cost: 200, coinVal: 65, coinRate: 10.5, speed: 20, color: "#10b981", palette: "teal" },
  };

  function spawnFish(type, x, y) {
    const key = FISH_TYPES[type] ? type : "blazenek";
    const t = FISH_TYPES[key];
    return {
      type: key,
      name: t.name,
      x,
      y,
      vx: (Math.random() > 0.5 ? 1 : -1) * (t.speed * (0.8 + Math.random() * 0.4)),
      vy: (Math.random() - 0.5) * 14,
      size: 1, // 1 = młody okaz, 2 = podrostek, 3 = dorosły
      meals: 0,
      hunger: 100, // 100 = syty, < 45 = głodny
      coinTimer: t.coinRate * (0.7 + Math.random() * 0.4),
      color: t.color,
      palette: t.palette,
      tailPhase: Math.random() * Math.PI * 2,
    };
  }

  function updateFishGrowth(fish, ateFood = false) {
    if (ateFood) {
      fish.hunger = Math.min(100, fish.hunger + 48);
      fish.meals = (fish.meals || 0) + 1;
      if (fish.size < 3) {
        fish.size++;
      }
    }
    return fish.size;
  }

  function calculateAquariumHealth(fishCount, filterLevel, oxygen) {
    const pollution = Math.max(0, fishCount * 1.6 - filterLevel * 3.6);
    const newOxygen = Math.max(0, Math.min(100, oxygen - pollution * 0.14 + filterLevel * 0.42));
    return { pollution, oxygen: newOxygen };
  }

  if (typeof module !== "undefined") {
    module.exports = { FISH_TYPES, spawnFish, updateFishGrowth, calculateAquariumHealth };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "akwarium",
    cat: "symulacje",
    big: true,
    name: "Akwarium",
    author: "Gemini 4",
    desc: "Hoduj kolorowe ryby w rafie koralowej, dbaj o czystość wody, karm ławice i chroń je przed drapieżnikami.",
    color: "#0d9488",
    ink: "#ffffff",
    glyph: [
      ".....",
      ".#.#.",
      "#####",
      ".###.",
      "#...#",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, goalCost: 450, predatorInterval: 44, filterCost: 50 },
      { key: "medium", name: "Średni", points: 50, goalCost: 750, predatorInterval: 33, filterCost: 70 },
      { key: "hard", name: "Trudny", points: 100, goalCost: 1100, predatorInterval: 24, filterCost: 90 },
    ],
    rules: [
      "Klikaj w toń wodną (albo Spacja), aby sypać pokarm dla głodnych rybek. Rosnące okazy wytwarzają muszelki, dukaty i perły.",
      "Klikaj skarby oraz otwierającego się na dnie perłopława, aby zbierać złoto na nowe gatunki (klawisze 1–4).",
      "Rozbudowuj filtr z automatycznym karmnikiem i perłopławem (klawisz 5), aby utrzymać czystą wodę.",
      "Gdy wpłynie drapieżna murena, klikaj w nią kilkukrotnie, aby ją odpędzić. Kup Koronę Rafy, by wygrać.",
    ],
    achievements: [
      { id: "pelna-obsada", name: "Pełna obsada", desc: "Zgromadź w akwarium wszystkie 4 gatunki okazów naraz.", points: 10 },
      { id: "pogromca", name: "Strażnik rafy", desc: "Odpędź 3 drapieżne mureny w trakcie jednej partii.", points: 25 },
      { id: "czysta-woda", name: "Krystaliczna toń", desc: "Wygraj partię, nie pozwalając natlenieniu spaść poniżej 60%.", points: 25 },
      { id: "krezus", name: "Morski skarbnik", desc: "Zbierz perłę z perłopława i zarób łącznie co najmniej 700 zł.", points: 25 },
      { id: "ekspres", name: "Szybka rafa", desc: "Zdobywaj Koronę Rafy w mniej niż 120 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { goalCost, predatorInterval, filterCost } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g, theme } = cv;

      const s = {
        gold: 85,
        totalEarned: 85,
        oxygen: 100,
        minOxygen: 100,
        filterLevel: 1,
        clamLevel: 1,
        clamOpen: false,
        clamPearlTimer: 9,
        clamCollectable: false,
        gotClamPearl: false,
        autoFeedTimer: 5,
        fishes: [
          spawnFish("blazenek", 85, 85),
          spawnFish("blazenek", 185, 115),
        ],
        foods: [],
        coins: [],
        predator: null,
        predatorTimer: predatorInterval,
        predatorsRepelled: 0,
        bubbles: Array.from({ length: 22 }, () => ({
          x: 16 + Math.random() * (W - 32),
          y: Math.random() * (H - 24),
          vy: -(14 + Math.random() * 22),
          r: 1.0 + Math.random() * 2.1,
        })),
        pebbles: Array.from({ length: 18 }, (_, i) => ({
          x: 14 + i * 16 + (i % 3) * 3,
          y: H - 10 + (i % 2) * 3,
          rx: 3 + (i % 3) * 1.5,
          ry: 1.6 + (i % 2) * 0.8,
          shade: i % 2 === 0 ? 0.22 : 0.35,
        })),
        popups: [],
        gotObsada: false,
        gotPogromca: false,
        gotKrezus: false,
      };

      const goldEl = statBlock(ctx, "Skarbiec rafy", { meter: true });
      const ecoEl = statsBlock(ctx, "Ekosystem", ["Natlenienie", "Obsada", "Systemy"]);

      const row1 = el("div", "panel-row");
      const buy1 = button("1. Błazenek (35)", "btn-ghost", () => buyFish("blazenek"));
      const buy2 = button("2. Pokolec (75)", "btn-ghost", () => buyFish("pokolec"));
      row1.append(buy1, buy2);

      const row2 = el("div", "panel-row");
      const buy3 = button("3. Skalar (130)", "btn-ghost", () => buyFish("skalar"));
      const buy4 = button("4. Żółw (200)", "btn-ghost", () => buyFish("zolw"));
      row2.append(buy3, buy4);

      const buyTech = button(`5. Filtr i perłopław (${filterCost} zł)`, "btn-ghost wide", () => upgradeSystems());
      const buyCrown = button(`Kup Koronę Rafy (${goalCost} zł)`, "btn wide", () => buyVictoryCrown());
      ctx.panel.append(panelBlock("Sklep akwarystyczny", row1, row2, buyTech, buyCrown));

      function getUpgradeCost() {
        return filterCost + (s.filterLevel - 1) * 25;
      }

      function checkAchievements() {
        if (!s.gotObsada) {
          const types = new Set(s.fishes.map((f) => f.type));
          if (types.has("blazenek") && types.has("pokolec") && types.has("skalar") && types.has("zolw")) {
            s.gotObsada = true;
            ctx.achieve("pelna-obsada");
          }
        }
        if (!s.gotPogromca && s.predatorsRepelled >= 3) {
          s.gotPogromca = true;
          ctx.achieve("pogromca");
        }
        if (!s.gotKrezus && s.gotClamPearl && s.totalEarned >= 700) {
          s.gotKrezus = true;
          ctx.achieve("krezus");
        }
      }

      function updatePanel() {
        const upCost = getUpgradeCost();
        buyTech.textContent = `5. Filtr i perłopław (${upCost} zł)`;
        goldEl.set(
          `${s.gold} zł`,
          s.gold / goalCost,
          s.predator
            ? "Uwaga: murena w akwarium, klikaj w drapieżnika"
            : `Cel: ${goalCost} zł na Koronę Rafy`
        );
        const adults = s.fishes.filter((f) => f.size >= 3).length;
        ecoEl.set("Natlenienie", `${Math.round(s.oxygen)}%`);
        ecoEl.set("Obsada", `${s.fishes.length} (${adults} dor.)`);
        ecoEl.set("Systemy", `Poz. ${s.filterLevel}`);
        ctx.progress(Math.min(1, s.gold / goalCost));
      }

      function buyFish(type) {
        if (ctx.done) return;
        const t = FISH_TYPES[type];
        if (!t) return;
        if (s.gold < t.cost) {
          Sound.error();
          ctx.toast(`Potrzebujesz ${t.cost} zł na ten okaz`);
          return;
        }
        s.gold -= t.cost;
        s.fishes.push(spawnFish(type, 55 + rnd(W - 110), 45 + rnd(H - 95)));
        Sound.place(2);
        ctx.toast(`Wpuszczono okaz: ${t.name}`);
        checkAchievements();
        updatePanel();
      }

      function upgradeSystems() {
        if (ctx.done) return;
        const cost = getUpgradeCost();
        if (s.gold < cost) {
          Sound.error();
          ctx.toast(`Potrzebujesz ${cost} zł na rozbudowę systemów`);
          return;
        }
        s.gold -= cost;
        s.filterLevel++;
        s.clamLevel++;
        s.oxygen = Math.min(100, s.oxygen + 35);
        Sound.place(5);
        ctx.toast(`Rozbudowano filtr, karmnik i perłopław do poz. ${s.filterLevel}`);
        updatePanel();
      }

      function buyVictoryCrown() {
        if (ctx.done) return;
        if (s.gold < goalCost) {
          Sound.error();
          ctx.toast(`Potrzebujesz ${goalCost} zł na Koronę Rafy`);
          return;
        }
        s.gold -= goalCost;
        checkAchievements();
        if (s.minOxygen >= 60) {
          ctx.achieve("czysta-woda");
        }
        if (ctx.time < 120) {
          ctx.achieve("ekspres");
        }
        Sound.line();
        ctx.win(`Rafa rozkwitła. Zdobyto Koronę Rafy przy obsadzie ${s.fishes.length} okazów.`);
      }

      function dropFood(x, y, auto = false) {
        if (ctx.done || s.foods.length > 18) return;
        s.foods.push({
          x: Math.max(18, Math.min(W - 18, x)),
          y: Math.max(20, Math.min(H - 35, y)),
          vy: 13 + Math.random() * 7,
          rich: s.filterLevel >= 2,
        });
        if (!auto) Sound.tap();
      }

      function collectClamPearl() {
        const val = 35 + s.clamLevel * 20;
        s.clamCollectable = false;
        s.clamOpen = false;
        s.clamPearlTimer = Math.max(5.5, 11 - s.clamLevel * 1.4);
        s.gold += val;
        s.totalEarned += val;
        s.gotClamPearl = true;
        s.popups.push({
          x: 252,
          y: H - 28,
          text: `+${val} zł`,
          color: "teal",
          vy: -22,
          life: 0.9,
        });
        Sound.line();
        ctx.toast(`Zebrano lśniącą perłę z perłopława (+${val} zł)`);
        checkAchievements();
        updatePanel();
      }

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);

        // 1. Kliknięcie w drapieżnika
        if (s.predator && Math.hypot(x - s.predator.x, y - s.predator.y) < s.predator.r + 18) {
          s.predator.hp--;
          s.predator.hitFlash = 0.2;
          Sound.tap();
          if (s.predator.hp <= 0) {
            const bounty = 25;
            s.gold += bounty;
            s.totalEarned += bounty;
            s.popups.push({
              x: s.predator.x,
              y: s.predator.y,
              text: `+${bounty} zł`,
              color: "gold",
              vy: -22,
              life: 0.9,
            });
            s.predator = null;
            s.predatorsRepelled++;
            checkAchievements();
            Sound.line();
            ctx.toast("Drapieżna murena została odpędzona");
          } else {
            ctx.toast(`Trafienie w murenę, pozostało uderzeń: ${s.predator.hp}`);
          }
          updatePanel();
          return;
        }

        // 2. Kliknięcie w otwartego perłopława na dnie
        if (s.clamCollectable && Math.hypot(x - 252, y - (H - 22)) < 20) {
          collectClamPearl();
          return;
        }

        // 3. Kliknięcie w monety, dukaty lub perły
        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          if (Math.hypot(x - c.x, y - c.y) < 16) {
            s.gold += c.val;
            s.totalEarned += c.val;
            if (c.kind === "pearl") s.gotClamPearl = true;
            s.popups.push({
              x: c.x,
              y: c.y,
              text: `+${c.val} zł`,
              color: c.kind === "pearl" ? "teal" : "gold",
              vy: -22,
              life: 0.85,
            });
            s.coins.splice(i, 1);
            Sound.place(4);
            checkAchievements();
            updatePanel();
            return;
          }
        }

        // 4. Sypanie pokarmu w miejscu kliknięcia
        dropFood(x, y, false);
      });

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === " ") {
          e.preventDefault();
          if (s.clamCollectable) {
            collectClamPearl();
          } else {
            dropFood(60 + Math.random() * (W - 120), 28, false);
          }
        } else if (e.key === "1") {
          buyFish("blazenek");
        } else if (e.key === "2") {
          buyFish("pokolec");
        } else if (e.key === "3") {
          buyFish("skalar");
        } else if (e.key === "4") {
          buyFish("zolw");
        } else if (e.key === "5") {
          upgradeSystems();
        } else if (e.key === "Enter") {
          buyVictoryCrown();
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        if (ctx.done) return;

        // Natlenienie wody
        const health = calculateAquariumHealth(s.fishes.length, s.filterLevel, s.oxygen);
        s.oxygen = Math.max(0, Math.min(100, s.oxygen + (health.oxygen - s.oxygen) * dt * 1.8));
        if (s.oxygen < s.minOxygen) s.minOxygen = s.oxygen;

        if (s.oxygen <= 2 && s.fishes.length > 0) {
          s.fishes.pop();
          s.oxygen = 28;
          Sound.error();
          ctx.toast("Ryba osłabła z braku tlenu, ulepsz filtr");
          if (s.fishes.length === 0) {
            ctx.lose("Zatruta woda", "Wszystkie okazy w akwarium wyginęły z braku tlenu.");
            return;
          }
        }

        // Automatyczny karmnik przy ulepszonym systemie (od poz. 2)
        if (s.filterLevel >= 2) {
          s.autoFeedTimer -= dt;
          if (s.autoFeedTimer <= 0) {
            s.autoFeedTimer = Math.max(2.5, 6.5 - s.filterLevel * 0.8);
            const hungryFish = s.fishes.find((f) => f.hunger < 65);
            if (hungryFish && s.foods.length < 8) {
              dropFood(hungryFish.x + (Math.random() - 0.5) * 20, 22, true);
            }
          }
        }

        // Perłopław na dnie wytwarzający perłę
        if (!s.clamCollectable) {
          s.clamPearlTimer -= dt;
          if (s.clamPearlTimer <= 0) {
            s.clamOpen = true;
            s.clamCollectable = true;
          }
        }

        // Ruch bąbelków powietrza
        for (const b of s.bubbles) {
          b.y += b.vy * dt;
          if (b.y < 14) {
            b.y = H - 24;
            b.x = 18 + Math.random() * (W - 36);
          }
        }

        // Opadanie pokarmu
        for (let i = s.foods.length - 1; i >= 0; i--) {
          const fd = s.foods[i];
          fd.y += fd.vy * dt;
          if (fd.y > H - 20) {
            s.foods.splice(i, 1);
          }
        }

        // Opadanie monet i pereł na dno (oraz automatyczne zbieranie po chwili na dnie, by nic nie przepadło)
        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          if (c.y < H - 19) {
            c.y += c.vy * dt;
          } else {
            c.restTime = (c.restTime || 0) + dt;
            if (c.restTime > 8) {
              s.coins.splice(i, 1);
            }
          }
        }

        // Ruch ryb, szukanie pokarmu i wytwarzanie skarbów
        for (const f of s.fishes) {
          f.hunger = Math.max(8, f.hunger - 3.6 * dt);
          const spd = Math.hypot(f.vx, f.vy);
          f.tailPhase += dt * (6 + spd * 0.22);

          // Wytwarzanie skarbów przez podrostki i dorosłe okazy
          f.coinTimer -= dt;
          if (f.coinTimer <= 0) {
            const t = FISH_TYPES[f.type];
            f.coinTimer = t.coinRate * (0.85 + Math.random() * 0.3);
            const sizeMult = f.size === 1 ? 0.7 : f.size === 2 ? 1.0 : 1.45;
            const isPearl = f.type === "zolw" || (f.size === 3 && Math.random() < 0.3);
            const kind = isPearl ? "pearl" : f.size >= 2 ? "ducat" : "shell";
            const val = Math.round(t.coinVal * sizeMult * (isPearl ? 1.35 : 1));
            s.coins.push({
              x: f.x,
              y: f.y + 4,
              vy: 15,
              val,
              kind,
              phase: Math.random() * 6,
            });
          }

          // Szukanie najbliższego pokarmu
          let targetFood = null;
          let bestD = Infinity;
          if (f.hunger < 82 && s.foods.length > 0) {
            for (const fd of s.foods) {
              const d = Math.hypot(fd.x - f.x, fd.y - f.y);
              if (d < bestD) {
                bestD = d;
                targetFood = fd;
              }
            }
          }

          if (targetFood) {
            const dx = targetFood.x - f.x;
            const dy = targetFood.y - f.y;
            const d = Math.max(1, Math.hypot(dx, dy));
            const maxSpd = FISH_TYPES[f.type].speed * 1.55;
            f.vx += ((dx / d) * maxSpd - f.vx) * dt * 4.5;
            f.vy += ((dy / d) * maxSpd - f.vy) * dt * 4.5;
            if (bestD < 13) {
              const idx = s.foods.indexOf(targetFood);
              if (idx >= 0) s.foods.splice(idx, 1);
              updateFishGrowth(f, true);
              if (targetFood.rich && f.size < 3) updateFishGrowth(f, true);
              Sound.place(3);
            }
          } else {
            if (Math.random() < 0.025) {
              f.vx = (Math.random() > 0.5 ? 1 : -1) * FISH_TYPES[f.type].speed * (0.75 + Math.random() * 0.45);
            }
            if (Math.random() < 0.03) {
              f.vy = (Math.random() - 0.5) * 16;
            }
          }

          f.x += f.vx * dt;
          f.y += f.vy * dt;

          if (f.x < 22) { f.x = 22; f.vx = Math.abs(f.vx); }
          if (f.x > W - 22) { f.x = W - 22; f.vx = -Math.abs(f.vx); }
          if (f.y < 26) { f.y = 26; f.vy = Math.abs(f.vy); }
          if (f.y > H - 30) { f.y = H - 30; f.vy = -Math.abs(f.vy); }
        }

        // Zjawienie się drapieżnej mureny
        s.predatorTimer -= dt;
        if (s.predatorTimer <= 0 && !s.predator) {
          s.predatorTimer = predatorInterval;
          const maxHp = ctx.level.key === "hard" ? 4 : 3;
          s.predator = {
            x: Math.random() > 0.5 ? -20 : W + 20,
            y: 44 + rnd(H - 90),
            vx: 0,
            vy: 0,
            r: 16,
            hp: maxHp,
            maxHp,
            hitFlash: 0,
          };
          Sound.error();
          ctx.toast("Murena wpłynęła do akwarium, kliknij ją kilkukrotnie");
        }

        if (s.predator) {
          if (s.predator.hitFlash > 0) s.predator.hitFlash = Math.max(0, s.predator.hitFlash - dt);
          let targetFish = null;
          let minD = Infinity;
          for (const f of s.fishes) {
            const d = Math.hypot(f.x - s.predator.x, f.y - s.predator.y);
            if (d < minD) {
              minD = d;
              targetFish = f;
            }
          }
          if (targetFish) {
            const dx = targetFish.x - s.predator.x;
            const dy = targetFish.y - s.predator.y;
            const dist = Math.max(1, Math.hypot(dx, dy));
            s.predator.vx = (dx / dist) * 32;
            s.predator.vy = (dy / dist) * 24;
            s.predator.x += s.predator.vx * dt;
            s.predator.y += s.predator.vy * dt;

            if (dist < 14) {
              const idx = s.fishes.indexOf(targetFish);
              if (idx >= 0) s.fishes.splice(idx, 1);
              s.predator = null;
              Sound.error();
              ctx.toast("Murena porwała rybę i odpłynęła w głębiny");
              if (s.fishes.length === 0) {
                ctx.lose("Pusta rafa", "Drapieżnik pożarł ostatnią rybę w akwarium.");
                return;
              }
            }
          }
        }

        // --- RYSOWANIE AKWARIUM ---
        // 1. Głębia oceaniczna
        const waterGrad = g.createLinearGradient(0, 0, 0, H);
        waterGrad.addColorStop(0, "#0b4f6c");
        waterGrad.addColorStop(0.55, "#073b54");
        waterGrad.addColorStop(1, "#042436");
        g.fillStyle = waterGrad;
        g.fillRect(0, 0, W, H);

        // Tafla wody u góry
        g.fillStyle = "rgba(186, 230, 253, 0.16)";
        g.fillRect(0, 0, W, 14);

        // 2. Ukośne promienie światła słonecznego wpadające z góry
        g.save();
        for (let i = 0; i < 5; i++) {
          const rx = 28 + i * 62 + Math.sin(now * 0.0012 + i) * 10;
          const rayGrad = g.createLinearGradient(rx, 0, rx + 24, H - 24);
          rayGrad.addColorStop(0, "rgba(186, 230, 253, 0.15)");
          rayGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
          g.fillStyle = rayGrad;
          g.beginPath();
          g.moveTo(rx - 10, 0);
          g.lineTo(rx + 14, 0);
          g.lineTo(rx + 42, H - 20);
          g.lineTo(rx + 6, H - 20);
          g.closePath();
          g.fill();
        }
        g.restore();

        // 3. Dalekie skały rafowe w tle
        g.fillStyle = "rgba(15, 23, 42, 0.35)";
        g.beginPath();
        g.moveTo(0, H - 18);
        g.quadraticCurveTo(45, H - 62, 95, H - 22);
        g.quadraticCurveTo(155, H - 70, 215, H - 24);
        g.quadraticCurveTo(260, H - 54, W, H - 20);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        // 4. Koralowce i ukwiały za wodorostami
        const corals = [
          { x: 52, col: theme.pink, h: 22 },
          { x: 128, col: theme.violet, h: 26 },
          { x: 198, col: theme.orange, h: 20 },
        ];
        for (const cr of corals) {
          g.strokeStyle = cr.col;
          g.lineCap = "round";
          g.lineWidth = 3.2;
          for (const branch of [-1, 0, 1]) {
            const sway = Math.sin(now * 0.0025 + cr.x + branch) * 2.5;
            g.beginPath();
            g.moveTo(cr.x, H - 16);
            g.quadraticCurveTo(
              cr.x + branch * 7,
              H - 16 - cr.h * 0.55,
              cr.x + branch * 12 + sway,
              H - 16 - cr.h
            );
            g.stroke();
          }
        }

        // 5. Falujące wodorosty (wielosegmentowe krzywe)
        g.strokeStyle = theme.green;
        g.lineWidth = 2.4;
        g.lineCap = "round";
        for (let gx = 28; gx < W - 25; gx += 34) {
          const sway1 = Math.sin(now * 0.003 + gx * 0.2) * 5;
          const sway2 = Math.cos(now * 0.0025 + gx * 0.15) * 7;
          g.beginPath();
          g.moveTo(gx, H - 15);
          g.quadraticCurveTo(gx + sway1, H - 30, gx + sway2, H - 46);
          g.stroke();
        }

        // 6. Piaszczyste wydmy na dnie z kamykami
        g.fillStyle = "#d97706";
        g.beginPath();
        g.moveTo(0, H - 16);
        g.quadraticCurveTo(75, H - 24, 150, H - 17);
        g.quadraticCurveTo(225, H - 11, W, H - 19);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        g.fillStyle = "#b45309";
        g.fillRect(0, H - 10, W, 10);

        for (const pb of s.pebbles) {
          g.fillStyle = `rgba(30, 41, 59, ${pb.shade})`;
          g.beginPath();
          g.ellipse(pb.x, pb.y, pb.rx, pb.ry, 0, 0, Math.PI * 2);
          g.fill();
        }

        // 7. Filtr biologiczny po lewej z kolumną bąbelków
        g.fillStyle = theme.surface;
        g.strokeStyle = theme.teal;
        g.lineWidth = 1.2;
        g.beginPath();
        g.roundRect(6, H - 44, 14, 28, 3);
        g.fill();
        g.stroke();
        cv.text(`F${s.filterLevel}`, 13, H - 30, { size: 5, weight: 700, color: "teal" });

        if (Math.random() < 0.35) {
          s.bubbles.push({
            x: 13 + (Math.random() - 0.5) * 5,
            y: H - 46,
            vy: -(22 + Math.random() * 16),
            r: 0.9 + Math.random() * 1.4,
          });
        }

        // Automatyczny karmnik u góry (gdy ulepszono systemy)
        if (s.filterLevel >= 2) {
          g.fillStyle = theme.surface;
          g.strokeStyle = theme.gold;
          g.lineWidth = 1;
          g.beginPath();
          g.roundRect(W / 2 - 22, 2, 44, 10, 3);
          g.fill();
          g.stroke();
          cv.text("KARMNIK", W / 2, 7.5, { size: 4.5, weight: 700, color: "gold" });
        }

        // 8. Perłopław na dnie po prawej (x = 252)
        const mx = 252, my = H - 17;
        const openAngle = s.clamCollectable ? 0.55 + Math.sin(now * 0.005) * 0.08 : 0.08;
        g.fillStyle = "#334155";
        g.strokeStyle = theme.violet;
        g.lineWidth = 1.2;
        g.beginPath();
        g.ellipse(mx, my, 13, 6, 0, 0, Math.PI);
        g.fill();
        g.stroke();

        if (s.clamCollectable) {
          // Świecąca perła wewnątrz muszli do kliknięcia
          g.fillStyle = "rgba(45, 212, 191, 0.28)";
          g.beginPath();
          g.arc(mx, my - 4, 8, 0, Math.PI * 2);
          g.fill();

          g.fillStyle = "#f8fafc";
          g.strokeStyle = theme.teal;
          g.lineWidth = 1;
          g.beginPath();
          g.arc(mx, my - 4, 4.2, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          cv.text("PERŁA", mx, my - 15, { size: 4.6, weight: 700, color: "gold" });
        }

        g.fillStyle = "#475569";
        g.strokeStyle = theme.violet;
        g.beginPath();
        g.ellipse(mx - 2, my - 2 - openAngle * 7, 13, 5.5, -openAngle * 0.5, Math.PI, Math.PI * 2);
        g.fill();
        g.stroke();

        // 9. Bąbelki powietrza
        g.strokeStyle = "rgba(224, 242, 254, 0.55)";
        g.lineWidth = 0.8;
        for (const b of s.bubbles) {
          if (s.bubbles.length > 48) { s.bubbles.shift(); break; }
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          g.stroke();
        }

        // 10. Płatki pokarmu
        for (const fd of s.foods) {
          g.fillStyle = fd.rich ? theme.gold : theme.orange;
          g.beginPath();
          g.ellipse(fd.x, fd.y, 2.6, 1.5, 0.3, 0, Math.PI * 2);
          g.fill();
        }

        // 11. Połyskujące muszelki, dukaty i perły
        for (const c of s.coins) {
          const shine = 0.85 + 0.15 * Math.sin(now * 0.008 + c.phase);
          g.save();
          g.translate(c.x, c.y);
          g.scale(shine, shine);
          if (c.kind === "pearl") {
            g.fillStyle = "#f8fafc";
            g.strokeStyle = theme.teal;
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(0, 0, 5.2, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          } else if (c.kind === "ducat") {
            g.fillStyle = theme.gold;
            g.strokeStyle = "#b45309";
            g.lineWidth = 1.1;
            g.beginPath();
            g.arc(0, 0, 4.8, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          } else {
            // Muszelka
            g.fillStyle = theme.pink;
            g.strokeStyle = "#ffffff";
            g.lineWidth = 0.8;
            g.beginPath();
            g.arc(0, 1, 4.5, Math.PI, 0);
            g.lineTo(0, 4);
            g.closePath();
            g.fill();
            g.stroke();
          }
          g.restore();
        }

        // 12. Ryby i żółwie morskie
        for (const f of s.fishes) {
          g.save();
          g.translate(f.x, f.y);
          const dir = f.vx >= 0 ? 1 : -1;
          const sc = 0.72 + f.size * 0.28;
          const tailSwing = Math.sin(f.tailPhase) * 3.5;
          const col = theme[f.palette] || f.color;

          g.save();
          g.scale(dir * sc, sc);

          if (f.type === "zolw") {
            // Żółw morski: wiosłujące płetwy i wzorzysta skorupa
            g.fillStyle = "#047857";
            g.beginPath();
            g.ellipse(4, 5 + tailSwing * 0.4, 4, 2, 0.5, 0, Math.PI * 2);
            g.ellipse(-5, 4 - tailSwing * 0.3, 3.2, 1.6, -0.4, 0, Math.PI * 2);
            g.ellipse(10, 0, 3.8, 2.6, 0, 0, Math.PI * 2);
            g.fill();

            g.fillStyle = col;
            g.strokeStyle = "#064e3b";
            g.lineWidth = 1;
            g.beginPath();
            g.ellipse(-1, 0, 9.5, 6.2, 0, 0, Math.PI * 2);
            g.fill();
            g.stroke();

            // Wzór na skorupie
            g.strokeStyle = "rgba(255, 255, 255, 0.35)";
            g.beginPath();
            g.moveTo(-6, 0);
            g.lineTo(4, 0);
            g.moveTo(-2, -5);
            g.lineTo(-2, 5);
            g.stroke();
          } else if (f.type === "skalar") {
            // Skalar: wysokie płetwy grzbietowa i brzuszna
            g.fillStyle = col;
            g.beginPath();
            g.moveTo(-4, 0);
            g.lineTo(-12, -5 + tailSwing * 0.5);
            g.lineTo(-10, 0);
            g.lineTo(-12, 5 + tailSwing * 0.5);
            g.closePath();
            g.fill();

            g.beginPath();
            g.moveTo(7, 0);
            g.lineTo(-2, -11);
            g.lineTo(-6, 0);
            g.lineTo(-2, 11);
            g.closePath();
            g.fill();

            g.fillStyle = "rgba(255, 255, 255, 0.65)";
            g.fillRect(-1, -7, 1.8, 14);
          } else {
            // Błazenek i Pokolec: płetwa grzbietowa, ogonowa i korpus
            g.fillStyle = f.type === "pokolec" ? theme.gold : col;
            g.beginPath();
            g.moveTo(-7, 0);
            g.lineTo(-14, -5.5 + tailSwing * 0.6);
            g.lineTo(-11.5, 0);
            g.lineTo(-14, 5.5 + tailSwing * 0.6);
            g.closePath();
            g.fill();

            // Płetwa grzbietowa
            g.fillStyle = col;
            g.beginPath();
            g.moveTo(-4, -4);
            g.quadraticCurveTo(0, -9, 4, -4);
            g.closePath();
            g.fill();

            // Korpus
            g.beginPath();
            g.ellipse(0, 0, 9, 5.5, 0, 0, Math.PI * 2);
            g.fill();

            if (f.type === "blazenek") {
              g.fillStyle = "#ffffff";
              g.fillRect(-3.5, -5, 2.2, 10);
              g.fillRect(1.5, -4.5, 2.0, 9);
            } else {
              // Ciemny pas pokolca
              g.strokeStyle = "#1e293b";
              g.lineWidth = 1.4;
              g.beginPath();
              g.moveTo(-4, -2);
              g.quadraticCurveTo(1, -4, 5, -1);
              g.stroke();
            }
          }

          // Oko
          g.fillStyle = "#0f172a";
          g.beginPath();
          g.arc(f.type === "zolw" ? 11 : 5, -1.6, 1.3, 0, Math.PI * 2);
          g.fill();
          g.restore();

          // Pasek głodu nad rybą, gdy potrzebuje karmienia
          if (f.hunger < 55) {
            const bw = 14;
            g.fillStyle = "rgba(15, 23, 42, 0.7)";
            g.fillRect(-bw / 2, -13, bw, 2.6);
            g.fillStyle = f.hunger < 28 ? theme.bad : theme.warn;
            g.fillRect(-bw / 2, -13, bw * (f.hunger / 100), 2.6);
          }
          g.restore();
        }

        // 13. Drapieżnik (Murena) z paskiem HP
        if (s.predator) {
          const p = s.predator;
          g.save();
          g.translate(p.x, p.y);
          const pDir = p.vx >= 0 ? 1 : -1;
          g.save();
          g.scale(pDir, 1);

          const wave = Math.sin(now * 0.012) * 3;
          g.fillStyle = p.hitFlash > 0 ? theme.bad : "#334155";
          g.strokeStyle = theme.bad;
          g.lineWidth = 1.4;
          g.beginPath();
          g.ellipse(0, wave * 0.3, 19, 7.5, 0, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Grzbiet i szczęki
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.moveTo(12, -3);
          g.lineTo(18, 0);
          g.lineTo(12, 3);
          g.closePath();
          g.fill();

          g.fillStyle = theme.bad;
          g.beginPath();
          g.arc(10, -2.5, 2, 0, Math.PI * 2);
          g.fill();
          g.restore();

          // Pasek HP nad drapieżnikiem
          const hpw = 24;
          g.fillStyle = "rgba(15, 23, 42, 0.8)";
          g.fillRect(-hpw / 2, -15, hpw, 3.2);
          g.fillStyle = theme.bad;
          g.fillRect(-hpw / 2, -15, hpw * (p.hp / p.maxHp), 3.2);
          cv.text("MURENA", 0, -20, { size: 4.8, weight: 700, color: "bad" });
          g.restore();
        }

        // 14. Wyskakujące napisy przy zbieraniu monet i pereł (wyłącznie cv.text)
        for (let i = s.popups.length - 1; i >= 0; i--) {
          const pop = s.popups[i];
          pop.y += pop.vy * dt;
          pop.life -= dt * 1.35;
          if (pop.life <= 0) {
            s.popups.splice(i, 1);
            continue;
          }
          g.save();
          g.globalAlpha = Math.max(0, pop.life);
          cv.text(pop.text, pop.x, pop.y, { size: 6.2, weight: 700, color: pop.color || "gold" });
          g.restore();
        }

        // 15. Dyskretny pasek stanu u góry płótna
        cv.text(
          `Skarbiec: ${s.gold}/${goalCost} zł · Tlen: ${Math.round(s.oxygen)}%`,
          10,
          8,
          { size: 4.8, weight: 600, color: "on", align: "left" }
        );

        updatePanel();
      });
    },
  });
}
