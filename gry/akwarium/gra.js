// Akwarium: rozbudowana symulacja ekosystemu rafy koralowej.
// Hodowla kolorowych ryb, karmienie, zbieranie pereł, filtry biologiczne i odpieranie drapieżników.
{
  const FISH_TYPES = {
    blazenek: { name: "Błazenek", cost: 35, coinVal: 8, coinRate: 9, speed: 28, color: "#f97316" },
    pokolec: { name: "Pokolec", cost: 80, coinVal: 22, coinRate: 11, speed: 34, color: "#3b82f6" },
    arowana: { name: "Złota arowana", cost: 160, coinVal: 55, coinRate: 13, speed: 24, color: "#eab308" },
  };

  function spawnFish(type, x, y) {
    const t = FISH_TYPES[type] || FISH_TYPES.blazenek;
    return {
      type,
      name: t.name,
      x,
      y,
      vx: (Math.random() > 0.5 ? 1 : -1) * (t.speed * (0.8 + Math.random() * 0.4)),
      vy: (Math.random() - 0.5) * 14,
      size: 1, // 1 = mała, 2 = średnia, 3 = dorosła
      hunger: 100, // 100 = najedzona, < 35 = głodna
      coinTimer: t.coinRate,
      color: t.color,
      tailPhase: Math.random() * Math.PI * 2,
    };
  }

  function updateFishGrowth(fish, ateFood = false) {
    if (ateFood) {
      fish.hunger = Math.min(100, fish.hunger + 45);
      if (fish.size < 3) {
        fish.size++;
      }
    }
    return fish.size;
  }

  function calculateAquariumHealth(fishCount, filterLevel, oxygen) {
    const pollution = Math.max(0, fishCount * 1.8 - filterLevel * 3.5);
    const newOxygen = Math.max(0, Math.min(100, oxygen - pollution * 0.15 + filterLevel * 0.4));
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
      { key: "easy", name: "Łatwy", points: 20, goalCost: 500, predatorInterval: 48, filterCost: 50 },
      { key: "medium", name: "Średni", points: 50, goalCost: 800, predatorInterval: 34, filterCost: 75 },
      { key: "hard", name: "Trudny", points: 100, goalCost: 1150, predatorInterval: 24, filterCost: 95 },
    ],
    rules: [
      "Klikaj w toń wodną (albo Spacja), aby sypać płatki pokarmu dla głodnych rybek. Dorosłe ryby wytwarzają monety i perły opadające na dno.",
      "Klikaj monety i perły, aby zbierać fundusze na powiększanie ławicy, lepszy pokarm i ulepszenia filtrów biologicznych.",
      "Utrzymuj natlenienie wody; gdy pojawi się drapieżna murena, klikaj w nią szybko, aby ją odpędzić, zanim zaatakuje ławicę.",
      "Zgromadź fundusze i zakup Koronę Rafy Koralowej w sklepie akwarystycznym, aby wygrać partię.",
    ],
    achievements: [
      { id: "pierwsza-perla", name: "Morskie skarby", desc: "Zbierz swoją pierwszą perłę z dna akwarium.", points: 10 },
      { id: "wielka-lawica", name: "Bujna rafa", desc: "Zgromadź w akwarium co najmniej 7 dorosłych ryb naraz.", points: 25 },
      { id: "obronca-rafy", name: "Strażnik rafy", desc: "Odpędź 3 drapieżniki, nie tracąc ani jednej rybki.", points: 25 },
      { id: "korona-rafy", name: "Władca głębin", desc: "Wygraj trudny poziom i zdobądź Koronę Rafy Koralowej.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, goalCost, predatorInterval, filterCost } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const s = {
        gold: 70,
        oxygen: 100,
        filterLevel: 1,
        foodQuality: 1,
        clam: false,
        clamPearlTimer: 14,
        fishes: [
          spawnFish("blazenek", 80, 80),
          spawnFish("blazenek", 180, 110),
        ],
        foods: [],
        coins: [],
        predator: null,
        predatorTimer: predatorInterval,
        predatorsRepelled: 0,
        lostFishEver: false,
        bubbles: Array.from({ length: 24 }, () => ({
          x: 20 + Math.random() * (W - 40),
          y: Math.random() * H,
          vy: -(15 + Math.random() * 25),
          r: 1.2 + Math.random() * 2.4,
        })),
        popups: [],
      };

      const goldEl = statBlock(ctx, "Skarbiec rafy", { meter: true });
      const oxygenEl = statBlock(ctx, "Natlenienie wody", { meter: true });
      const reefEl = statBlock(ctx, "Stan ławicy", { small: true });

      const buyGuppy = button("Błazenek (35 zł)", "btn-ghost wide", () => buyFish("blazenek"));
      const buyTang = button("Pokolec (80 zł)", "btn-ghost wide", () => buyFish("pokolec"));
      const buyArowana = button("Arowana (160 zł)", "btn-ghost wide", () => buyFish("arowana"));
      const buyFilter = button(`Filtr biolo. (${filterCost} zł)`, "btn-ghost wide", () => upgradeFilter());
      const buyCrown = button(`Korona Rafy (${goalCost} zł)`, "btn wide", () => buyVictoryCrown());
      ctx.panel.append(panelBlock("Sklep akwarystyczny", buyGuppy, buyTang, buyArowana, buyFilter, buyCrown));

      function updatePanel() {
        goldEl.set(
          `${s.gold} zł`,
          s.gold / goalCost,
          `Cel: ${goalCost} zł (Korona Rafy)`
        );
        oxygenEl.set(
          `${Math.round(s.oxygen)}%`,
          s.oxygen / 100,
          `Filtr poz. ${s.filterLevel} · ${s.oxygen < 30 ? "UWAGA: brak tlenu!" : "Woda czysta i natleniona"}`
        );
        const adultCount = s.fishes.filter((f) => f.size >= 3).length;
        reefEl.set(
          `${s.fishes.length} ryb (dorosłe: ${adultCount})`,
          null,
          s.predator ? "ALARM: Murena atakuje! Klikaj w drapieżnika" : "Klikaj w toń wodną, by karmić ryby"
        );
        ctx.progress(s.gold / goalCost);
      }

      function buyFish(type) {
        if (ctx.done) return;
        const cost = FISH_TYPES[type].cost;
        if (s.gold < cost) {
          Sound.error();
          ctx.toast("Za mało złota na zakup tej ryby");
          return;
        }
        s.gold -= cost;
        s.fishes.push(spawnFish(type, 50 + rnd(W - 100), 50 + rnd(H - 100)));
        Sound.place(2);
        ctx.toast(`Kupiono: ${FISH_TYPES[type].name}`);
        updatePanel();
      }

      function upgradeFilter() {
        if (ctx.done) return;
        if (s.gold < filterCost) {
          Sound.error();
          ctx.toast("Za mało złota na filtr biologiczny");
          return;
        }
        s.gold -= filterCost;
        s.filterLevel++;
        s.oxygen = Math.min(100, s.oxygen + 35);
        Sound.place(5);
        ctx.toast(`Filtr biologiczny ulepszony do poz. ${s.filterLevel}`);
        updatePanel();
      }

      function buyVictoryCrown() {
        if (ctx.done) return;
        if (s.gold < goalCost) {
          Sound.error();
          ctx.toast(`Potrzebujesz ${goalCost} zł na Koronę Rafy Koralowej`);
          return;
        }
        s.gold -= goalCost;
        if (key === "hard") {
          ctx.achieve("korona-rafy");
        }
        Sound.line();
        ctx.win(`Rafa Koralowa ocalona! Zdobyłeś Koronę Rafy i skompletowałeś wspaniałe akwarium.`);
      }

      function dropFood(x, y) {
        if (ctx.done || s.foods.length > 15) return;
        s.foods.push({ x, y, vy: 14 + Math.random() * 8 });
        Sound.tap();
      }

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);

        // 1. Sprawdź kliknięcie w drapieżnika
        if (s.predator && Math.hypot(x - s.predator.x, y - s.predator.y) < s.predator.r + 14) {
          s.predator.hp--;
          Sound.error();
          if (s.predator.hp <= 0) {
            s.predator = null;
            s.predatorsRepelled++;
            if (s.predatorsRepelled >= 3 && !s.lostFishEver) {
              ctx.achieve("obronca-rafy");
            }
            Sound.line();
            ctx.toast("Drapieżna murena została odpędzona!");
          } else {
            ctx.toast(`Trafienie w drapieżnika! (pozostało ${s.predator.hp} uderzeń)`);
          }
          updatePanel();
          return;
        }

        // 2. Sprawdź kliknięcie w monety lub perły
        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          if (Math.hypot(x - c.x, y - c.y) < 14) {
            s.gold += c.val;
            if (c.pearl) {
              ctx.achieve("pierwsza-perla");
            }
            s.popups.push({
              x: c.x,
              y: c.y,
              text: `+${c.val} zł`,
              c: c.pearl ? "#38bdf8" : "#facc15",
              vy: -24,
              life: 0.8,
            });
            s.coins.splice(i, 1);
            Sound.place(4);
            updatePanel();
            return;
          }
        }

        // 3. Karmienie w miejscu kliknięcia
        dropFood(x, y);
      });

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === " ") {
          e.preventDefault();
          dropFood(W / 2 + (Math.random() - 0.5) * 80, 25);
        } else if (e.key === "1") {
          buyFish("blazenek");
        } else if (e.key === "2") {
          buyFish("pokolec");
        } else if (e.key === "3") {
          buyFish("arowana");
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        if (ctx.done) return;

        // Natlenienie wody
        const health = calculateAquariumHealth(s.fishes.length, s.filterLevel, s.oxygen);
        s.oxygen = health.oxygen;
        if (s.oxygen <= 0 && s.fishes.length > 0) {
          s.fishes.pop();
          s.lostFishEver = true;
          Sound.error();
          ctx.toast("Ryba padła z braku tlenu! Ulepsz filtr biologiczny.");
          if (s.fishes.length === 0) {
            ctx.lose("Martwa rafa", "Wszystkie ryby wyginęły z powodu zatrutej wody.");
            return;
          }
        }

        // Sprawdzanie osiągnięcia ławicy
        const adults = s.fishes.filter((f) => f.size >= 3).length;
        if (adults >= 7) {
          ctx.achieve("wielka-lawica");
        }

        // Bąbelki powietrza
        for (const b of s.bubbles) {
          b.y += b.vy * dt;
          if (b.y < -5) {
            b.y = H + 5;
            b.x = 20 + Math.random() * (W - 40);
          }
        }

        // Ruch pokarmu opadającego na dno
        for (let i = s.foods.length - 1; i >= 0; i--) {
          const fd = s.foods[i];
          fd.y += fd.vy * dt;
          if (fd.y > H - 12) {
            s.foods.splice(i, 1);
          }
        }

        // Ruch monet opadających na dno
        for (let i = s.coins.length - 1; i >= 0; i--) {
          const c = s.coins[i];
          if (c.y < H - 14) {
            c.y += c.vy * dt;
          }
        }

        // Płynięcie ryb i szukanie pokarmu
        for (const f of s.fishes) {
          f.hunger = Math.max(0, f.hunger - 4.5 * dt);
          f.tailPhase += dt * 10;

          // Wytwarzanie monet przez dorosłe ryby
          if (f.size >= 2) {
            f.coinTimer -= dt;
            if (f.coinTimer <= 0) {
              const t = FISH_TYPES[f.type];
              f.coinTimer = t.coinRate + (Math.random() - 0.5) * 4;
              const isPearl = f.size === 3 && Math.random() < 0.28;
              s.coins.push({
                x: f.x,
                y: f.y,
                vy: 18,
                val: isPearl ? t.coinVal * 2.2 : t.coinVal,
                pearl: isPearl,
              });
              Sound.tap();
            }
          }

          // Szukanie najbliższego pokarmu gdy ryba jest głodna
          let targetFood = null;
          let bestD = Infinity;
          if (f.hunger < 75 && s.foods.length > 0) {
            for (const fd of s.foods) {
              const d = Math.hypot(fd.x - f.x, fd.y - f.y);
              if (d < bestD) {
                bestD = d;
                targetFood = fd;
              }
            }
          }

          if (targetFood) {
            const dx = targetFood.x - f.x, dy = targetFood.y - f.y;
            f.vx += Math.sign(dx) * 45 * dt;
            f.vy += Math.sign(dy) * 35 * dt;
            if (bestD < 12) {
              const idx = s.foods.indexOf(targetFood);
              if (idx >= 0) s.foods.splice(idx, 1);
              updateFishGrowth(f, true);
              Sound.place(3);
            }
          } else {
            // Płynny losowy ruch
            if (Math.random() < 0.02) f.vx = (Math.random() > 0.5 ? 1 : -1) * (FISH_TYPES[f.type].speed * 0.9);
            if (Math.random() < 0.03) f.vy = (Math.random() - 0.5) * 16;
          }

          f.x += f.vx * dt;
          f.y += f.vy * dt;

          // Odbicie od ścian akwarium
          if (f.x < 18) { f.x = 18; f.vx = Math.abs(f.vx); }
          if (f.x > W - 18) { f.x = W - 18; f.vx = -Math.abs(f.vx); }
          if (f.y < 28) { f.y = 28; f.vy = Math.abs(f.vy); }
          if (f.y > H - 24) { f.y = H - 24; f.vy = -Math.abs(f.vy); }
        }

        // Atak drapieżnika
        s.predatorTimer -= dt;
        if (s.predatorTimer <= 0 && !s.predator) {
          s.predatorTimer = predatorInterval;
          s.predator = {
            x: Math.random() > 0.5 ? -25 : W + 25,
            y: 40 + rnd(H - 80),
            vx: 0,
            vy: 0,
            r: 16,
            hp: 4,
          };
          Sound.error();
          ctx.toast("MURENA WPŁYNĘŁA DO AKWARIUM! Klikaj w drapieżnika!");
        }

        if (s.predator) {
          // Drapieżnik poluje na najbliższą rybę
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
            const dx = targetFish.x - s.predator.x, dy = targetFish.y - s.predator.y;
            const dist = Math.hypot(dx, dy);
            s.predator.vx = (dx / dist) * 36;
            s.predator.vy = (dy / dist) * 25;
            s.predator.x += s.predator.vx * dt;
            s.predator.y += s.predator.vy * dt;

            // Pożarcie ryby
            if (dist < 15) {
              const idx = s.fishes.indexOf(targetFish);
              if (idx >= 0) s.fishes.splice(idx, 1);
              s.lostFishEver = true;
              Sound.error();
              ctx.toast("Drapieżnik pożarł rybę!");
              if (s.fishes.length === 0) {
                ctx.lose("Koniec ławicy", "Murena pożarła wszystkie ryby w akwarium.");
                return;
              }
            }
          }
        }

        // --- RYSOWANIE AKWARIUM ---
        // Głębia lazurowej wody
        const waterGrad = g.createLinearGradient(0, 0, 0, H);
        waterGrad.addColorStop(0, "#0891b2");
        waterGrad.addColorStop(0.5, "#0e7490");
        waterGrad.addColorStop(1, "#155e75");
        g.fillStyle = waterGrad;
        g.fillRect(0, 0, W, H);

        // Refleksy promieni słonecznych w wodzie (kaustyka)
        g.strokeStyle = "rgba(255, 255, 255, 0.08)";
        g.lineWidth = 2.0;
        for (let lx = 15; lx < W; lx += 35) {
          const shift = Math.sin(now * 0.002 + lx * 0.1) * 8;
          g.beginPath();
          g.moveTo(lx + shift, 0);
          g.quadraticCurveTo(lx - shift * 0.5, H * 0.45, lx + shift * 1.2, H - 16);
          g.stroke();
        }

        // Piaszczyste dno rafy
        g.fillStyle = "#eab308";
        g.fillRect(0, H - 16, W, 16);
        g.fillStyle = "#ca8a04";
        g.fillRect(0, H - 14, W, 14);

        // Falujące wodorosty na dnie morskim
        g.strokeStyle = "#15803d";
        g.lineWidth = 2.2;
        g.lineCap = "round";
        for (let gx = 10; gx < W; gx += 26) {
          const sway = Math.sin(now * 0.003 + gx) * 7;
          g.beginPath();
          g.moveTo(gx, H - 14);
          g.quadraticCurveTo(gx + sway * 0.5, H - 28, gx + sway, H - 38);
          g.stroke();
        }

        // Koralowce i ukwiały na dnie
        g.fillStyle = "#ec4899";
        for (let k = 22; k < W; k += 48) {
          g.beginPath();
          g.arc(k, H - 14, 10, Math.PI, 0);
          g.fill();
        }
        g.fillStyle = "#a855f7";
        for (let k = 42; k < W; k += 54) {
          g.beginPath();
          g.ellipse(k, H - 14, 7, 13, 0, 0, Math.PI * 2);
          g.fill();
        }

        // Filtr biologiczny z bąbelkami w lewym rogu
        g.fillStyle = "#334155";
        g.strokeStyle = "#64748b";
        g.lineWidth = 1;
        g.fillRect(6, H - 26, 12, 14);
        g.strokeRect(6, H - 26, 12, 14);
        if (Math.random() < 0.4) {
          s.bubbles.push({
            x: 12 + (Math.random() - 0.5) * 5,
            y: H - 28,
            vy: -(22 + Math.random() * 18),
            r: 0.9 + Math.random() * 1.3,
          });
        }

        // Małż z perłą na dnie (jeśli kupiono małża w sklepie)
        if (s.clam) {
          const mx = 245, my = H - 16;
          const openA = Math.sin(now * 0.002) * 0.35 + 0.35;
          g.fillStyle = "#e0e7ff";
          g.strokeStyle = "#6366f1";
          g.lineWidth = 1.2;
          g.beginPath();
          g.ellipse(mx, my, 11, 5.5, 0, 0, Math.PI);
          g.fill();
          g.stroke();
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.arc(mx, my - 2, 3.2, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.ellipse(mx, my - 3 - openA * 5, 11, 5.5, -openA * 0.35, Math.PI, 0);
          g.fill();
          g.stroke();
        }

        // Bąbelki
        g.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (const b of s.bubbles) {
          g.beginPath();
          g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          g.fill();
        }

        // Pokarm (płatki)
        g.fillStyle = "#f97316";
        for (const fd of s.foods) {
          g.beginPath();
          g.ellipse(fd.x, fd.y, 2.5, 1.5, 0.4, 0, Math.PI * 2);
          g.fill();
        }

        // Monety i perły
        for (const c of s.coins) {
          if (c.pearl) {
            g.fillStyle = "#f8fafc";
            g.strokeStyle = "#38bdf8";
            g.lineWidth = 1;
            g.beginPath();
            g.arc(c.x, c.y, 5, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          } else {
            g.fillStyle = "#facc15";
            g.strokeStyle = "#ca8a04";
            g.lineWidth = 1;
            g.beginPath();
            g.arc(c.x, c.y, 4.5, 0, Math.PI * 2);
            g.fill();
            g.stroke();
          }
        }

        // Ryby
        for (const f of s.fishes) {
          g.save();
          g.translate(f.x, f.y);
          const dir = Math.sign(f.vx) || 1;
          g.scale(dir, 1);

          const scale = 0.75 + f.size * 0.35;
          g.scale(scale, scale);

          // Płetwa ogonowa (animowana fala)
          const tailAngle = Math.sin(f.tailPhase) * 0.35;
          g.fillStyle = f.color;
          g.beginPath();
          g.moveTo(-7, 0);
          g.lineTo(-15, -6 + tailAngle * 5);
          g.lineTo(-12, 0);
          g.lineTo(-15, 6 + tailAngle * 5);
          g.closePath();
          g.fill();

          // Korpus ryby
          const hungerFade = f.hunger < 35 ? "rgba(253, 224, 71, 0.7)" : f.color;
          g.fillStyle = hungerFade;
          g.beginPath();
          g.ellipse(0, 0, 9, 5.5, 0, 0, Math.PI * 2);
          g.fill();

          // Paski ozdobne (np. błazenek białe paski)
          g.fillStyle = "#ffffff";
          g.fillRect(-2, -5, 3, 10);

          // Oko
          g.fillStyle = "#0f172a";
          g.beginPath();
          g.arc(5, -2, 1.4, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }

        // Drapieżnik (Murena)
        if (s.predator) {
          g.save();
          g.translate(s.predator.x, s.predator.y);
          const pDir = Math.sign(s.predator.vx) || 1;
          g.scale(pDir, 1);

          // Wężowaty tułów drapieżnika
          g.fillStyle = "#475569";
          g.strokeStyle = "#ef4444";
          g.lineWidth = 1.4;
          g.beginPath();
          g.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Szczęki i zęby
          g.fillStyle = "#ffffff";
          g.beginPath();
          g.moveTo(12, -3);
          g.lineTo(19, 0);
          g.lineTo(12, 3);
          g.closePath();
          g.fill();

          // Czerwone oko drapieżnika
          g.fillStyle = "#ef4444";
          g.beginPath();
          g.arc(10, -3, 2.2, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }

        // Wyskakujące napisy zebranych monet i pereł
        for (let i = s.popups.length - 1; i >= 0; i--) {
          const pop = s.popups[i];
          pop.y += pop.vy * dt;
          pop.life -= dt * 1.5;
          if (pop.life <= 0) {
            s.popups.splice(i, 1);
            continue;
          }
          g.fillStyle = pop.c;
          g.globalAlpha = Math.max(0, pop.life);
          g.font = "bold 6.8px sans-serif";
          g.textAlign = "center";
          g.fillText(pop.text, pop.x, pop.y);
          g.globalAlpha = 1;
        }

        updatePanel();
      });
    },
  });
}
