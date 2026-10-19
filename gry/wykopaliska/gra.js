// Wykopaliska: rozbudowana gra górniczo-eksploracyjna.
// Drążenie tuneli wiertnicą, wydobycie cennych minerałów, ulepszenia pojazdu i poszukiwanie pradawnych skamielin.
{
  const MINERALS = {
    wegiel: { name: "Węgiel", val: 8, color: "#334155", hard: 1 },
    miedz: { name: "Ruda miedzi", val: 15, color: "#d97706", hard: 1.2 },
    zelazo: { name: "Ruda żelaza", val: 26, color: "#94a3b8", hard: 1.6 },
    zloto: { name: "Samorodek złota", val: 52, color: "#facc15", hard: 2.0 },
    rubin: { name: "Czerwony rubin", val: 95, color: "#ef4444", hard: 2.5 },
    diament: { name: "Błękitny diament", val: 160, color: "#38bdf8", hard: 3.2 },
    skamielina: { name: "Pradawna skamielina", val: 300, color: "#a855f7", hard: 2.8, fossil: true },
  };

  const UPGRADES = {
    drill: { name: "Wiertło", max: 4, baseCost: 45, mult: 2.1 },
    fuel: { name: "Zbiornik tlenu", max: 4, baseCost: 40, mult: 2.0 },
    cargo: { name: "Ładownia", max: 4, baseCost: 35, mult: 1.9 },
    engine: { name: "Dopalacz pionowy", max: 3, baseCost: 50, mult: 2.2 },
  };

  function upgradeCost(type, curTier) {
    const u = UPGRADES[type];
    if (!u || curTier >= u.max) return Infinity;
    return Math.round(u.baseCost * Math.pow(u.mult, curTier));
  }

  function calculateSellValue(cargo) {
    return cargo.reduce((sum, item) => sum + (MINERALS[item]?.val || 0), 0);
  }

  function generateMine(cols, rows, fossilsCount) {
    const grid = Array.from({ length: cols * rows }, () => null);

    // Wiersze 0 i 1 to stacja naziemna (powierzchnia)
    for (let r = 2; r < rows; r++) {
      const depthRatio = (r - 2) / (rows - 2); // 0.0 do 1.0
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const roll = Math.random();

        // Twardość i rodzaj skały w zależności od głębokości
        let blockType = "dirt";
        let hard = 1.0;
        let color = "#78350f";

        if (depthRatio > 0.65) {
          blockType = "basalt";
          hard = 2.6;
          color = "#1e1b4b";
        } else if (depthRatio > 0.35) {
          blockType = "rock";
          hard = 1.8;
          color = "#475569";
        }

        // Minerały w zależności od głębokości
        let mineral = null;
        if (roll < 0.22) {
          if (depthRatio > 0.75 && roll < 0.08) mineral = "diament";
          else if (depthRatio > 0.55 && roll < 0.12) mineral = "rubin";
          else if (depthRatio > 0.35 && roll < 0.15) mineral = "zloto";
          else if (depthRatio > 0.15 && roll < 0.18) mineral = "zelazo";
          else if (roll < 0.12) mineral = "miedz";
          else mineral = "wegiel";
        }

        grid[idx] = {
          type: blockType,
          hard,
          color,
          mineral,
          hp: hard * 10,
          maxHp: hard * 10,
        };
      }
    }

    // Ukrywanie pradawnych skamielin w najgłębszych 20% kopalni
    const bottomRows = Math.floor(rows * 0.2);
    const fossilSpots = [];
    while (fossilSpots.length < fossilsCount) {
      const r = rows - 1 - rnd(bottomRows);
      const c = rnd(cols);
      const idx = r * cols + c;
      if (grid[idx] && grid[idx].mineral !== "skamielina") {
        grid[idx].mineral = "skamielina";
        grid[idx].hard = 2.5;
        grid[idx].hp = 25;
        grid[idx].maxHp = 25;
        fossilSpots.push({ r, c, idx });
      }
    }

    return { cols, rows, grid, fossilSpots };
  }

  function digBlock(grid, cols, r, c, drillPower) {
    const idx = r * cols + c;
    const block = grid[idx];
    if (!block) return { dug: false, mineral: null };
    block.hp -= drillPower * 6;
    if (block.hp <= 0) {
      const min = block.mineral;
      grid[idx] = null; // blok usunięty (pusty tunel)
      return { dug: true, mineral: min };
    }
    return { dug: false, mineral: null, progress: 1 - block.hp / block.maxHp };
  }

  if (typeof module !== "undefined") {
    module.exports = { MINERALS, UPGRADES, upgradeCost, calculateSellValue, generateMine, digBlock };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "wykopaliska",
    cat: "przygodowe",
    big: true,
    name: "Wykopaliska",
    author: "Gemini 4",
    desc: "Drąż w głąb ziemi wiertnicą, wydobywaj cenne minerały i skamieliny, ulepszaj sprzęt i wracaj z tlenem.",
    color: "#b45309",
    ink: "#ffffff",
    glyph: [
      "##...",
      ".##..",
      "..#..",
      ".#.#.",
      "#...#",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, cols: 15, rows: 28, fossils: 2, startOxygen: 100 },
      { key: "medium", name: "Średni", points: 50, cols: 16, rows: 42, fossils: 3, startOxygen: 85 },
      { key: "hard", name: "Trudny", points: 100, cols: 17, rows: 56, fossils: 4, startOxygen: 72 },
    ],
    rules: [
      "Kieruj wiertnicą za pomocą strzałek lub WASD: wbijaj się w ziemię, aby drążyć tunele i zbierać cenne złoża minerałów.",
      "Spacja włącza dopalacz manewrowy (wznoszenie się wykopanymi szybami na powierzchnię bazy).",
      "Kontroluj zapas tlenu i pojemność ładowni: wracaj na powierzchnię, aby sprzedać urobek i bezpłatnie napełnić butle.",
      "W bazie kupuj ulepszenia wiertła, zbiornika tlenu i ładowni. Wygrywasz po wydobyciu i dostarczeniu do bazy wszystkich pradawnych skamielin.",
    ],
    achievements: [
      { id: "pierwsza-ruda", name: "Górnik", desc: "Wydobądź pierwszą rudę i sprzedaj ją w bazie.", points: 10 },
      { id: "pelna-ladownia", name: "Złoty ładunek", desc: "Wróć na powierzchnię z pełną ładownią minerałów.", points: 10 },
      { id: "maks-wiertlo", name: "Diamentowe ostrze", desc: "Wykup najwyższe ulepszenie wiertła.", points: 25 },
      { id: "wszystkie-skamieliny", name: "Wielki paleontolog", desc: "Wydobądź wszystkie pradawne skamieliny i wygraj partię.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, cols, rows, fossils, startOxygen } = ctx.level;
      const W = 280, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 100, cls: "space" });
      const { g } = cv;

      const { grid } = generateMine(cols, rows, fossils);

      const s = {
        grid,
        x: Math.floor(cols / 2),
        y: 1, // zaczyna na powierzchni
        px: Math.floor(cols / 2) * 16,
        py: 16,
        vx: 0,
        vy: 0,
        oxygen: startOxygen,
        maxOxygen: startOxygen,
        gold: 0,
        cargo: [],
        cargoCap: 6,
        fossilsCollected: 0,
        fossilsTurnedIn: 0,
        tierDrill: 0,
        tierFuel: 0,
        tierCargo: 0,
        tierEngine: 0,
        atSurface: true,
        digging: null,
        particles: [],
      };

      const goldEl = statBlock(ctx, "Złoto i ładownia", { meter: true });
      const o2El = statBlock(ctx, "Zapas tlenu", { meter: true });

      const upgBox = el("div", "wk-upgrades");
      const btnDrill = button("Wiertło (+moc)", "btn-ghost wide", () => buyUpgrade("drill"));
      const btnFuel = button("Tlen (+butla)", "btn-ghost wide", () => buyUpgrade("fuel"));
      const btnCargo = button("Ładownia (+miejsca)", "btn-ghost wide", () => buyUpgrade("cargo"));
      const btnEngine = button("Dopalacz (+ciąg)", "btn-ghost wide", () => buyUpgrade("engine"));
      upgBox.append(btnDrill, btnFuel, btnCargo, btnEngine);
      ctx.panel.append(panelBlock("Warsztat ulepszeń w bazie", upgBox));

      function updatePanel() {
        const cargoVal = calculateSellValue(s.cargo);
        goldEl.set(
          `${s.gold} zł`,
          s.fossilsTurnedIn / fossils,
          `Ładownia: ${s.cargo.length}/${s.cargoCap} (${cargoVal} zł) · Skamieliny: ${s.fossilsTurnedIn}/${fossils}`
        );
        o2El.set(
          `${Math.round(s.oxygen)} / ${s.maxOxygen}`,
          s.oxygen / s.maxOxygen,
          s.atSurface ? "Baza naziemna (napełniono tlen)" : `Głębokość: ${Math.max(0, Math.floor(s.py / 16) - 1)}m`
        );

        btnDrill.textContent = `Wiertło poz. ${s.tierDrill + 1} (${s.tierDrill < 4 ? upgradeCost("drill", s.tierDrill) + " zł" : "MAX"})`;
        btnFuel.textContent = `Zbiornik tlenu poz. ${s.tierFuel + 1} (${s.tierFuel < 4 ? upgradeCost("fuel", s.tierFuel) + " zł" : "MAX"})`;
        btnCargo.textContent = `Ładownia poz. ${s.tierCargo + 1} (${s.tierCargo < 4 ? upgradeCost("cargo", s.tierCargo) + " zł" : "MAX"})`;
        btnEngine.textContent = `Dopalacz poz. ${s.tierEngine + 1} (${s.tierEngine < 3 ? upgradeCost("engine", s.tierEngine) + " zł" : "MAX"})`;

        ctx.progress(s.fossilsTurnedIn / fossils);
      }

      function buyUpgrade(type) {
        if (ctx.done || !s.atSurface) {
          ctx.toast("Ulepszenia można kupić tylko w bazie naziemnej");
          return;
        }
        const cost = upgradeCost(type, s["tier" + type.charAt(0).toUpperCase() + type.slice(1)]);
        if (s.gold < cost) {
          Sound.error();
          ctx.toast("Za mało złota na to ulepszenie");
          return;
        }
        s.gold -= cost;
        if (type === "drill") {
          s.tierDrill++;
          if (s.tierDrill >= 4) ctx.achieve("maks-wiertlo");
        } else if (type === "fuel") {
          s.tierFuel++;
          s.maxOxygen = startOxygen + s.tierFuel * 35;
          s.oxygen = s.maxOxygen;
        } else if (type === "cargo") {
          s.tierCargo++;
          s.cargoCap = 6 + s.tierCargo * 4;
        } else if (type === "engine") {
          s.tierEngine++;
        }
        Sound.place(5);
        ctx.toast(`Kupiono ulepszenie: ${UPGRADES[type].name}`);
        updatePanel();
      }

      function sellCargoAtSurface() {
        if (s.cargo.length === 0) return;
        const val = calculateSellValue(s.cargo);
        const hadFull = s.cargo.length >= s.cargoCap;
        const hasFossil = s.cargo.some((i) => i === "skamielina");
        if (hasFossil) {
          const fc = s.cargo.filter((i) => i === "skamielina").length;
          s.fossilsTurnedIn += fc;
        }
        s.gold += val;
        s.cargo = [];
        ctx.achieve("pierwsza-ruda");
        if (hadFull) ctx.achieve("pelna-ladownia");
        Sound.line();
        ctx.toast(`Sprzedano urobek za ${val} zł!`);

        if (s.fossilsTurnedIn >= fossils) {
          ctx.achieve("wszystkie-skamieliny");
          ctx.win(`Zebrałeś wszystkie ${fossils} pradawne skamieliny i ukończyłeś wykopaliska!`);
        }
      }

      const keys = heldKeys(ctx);
      const touch = {};
      touchPad(ctx, touch, [
        ["l", "W lewo", "i-left"],
        ["u", "Dopalacz w górę", "i-up"],
        ["r", "W prawo", "i-right"],
        ["d", "Wierć w dół", "i-down"],
      ]);

      const blockSize = 16;

      cv.loop((dt, now) => {
        if (ctx.done) return;

        const left = keys.arrowleft || keys.a || touch.l;
        const right = keys.arrowright || keys.d || touch.r;
        const down = keys.arrowdown || keys.s || touch.d;
        const up = keys[" "] || keys.arrowup || keys.w || touch.u;

        const drillPower = 1.0 + s.tierDrill * 0.75;
        const enginePower = 34 + s.tierEngine * 14;

        // Ruch poziomy
        if (left) s.vx = -38;
        else if (right) s.vx = 38;
        else s.vx *= Math.pow(0.08, dt);

        // Pionowy ruch / grawitacja / dopalacz
        if (up) {
          s.vy = -enginePower;
          s.oxygen = Math.max(0, s.oxygen - 1.8 * dt);
        } else {
          s.vy = Math.min(48, s.vy + 65 * dt); // grawitacja
        }

        const nextPx = Math.max(0, Math.min((cols - 1) * blockSize, s.px + s.vx * dt));
        const nextPy = Math.max(8, s.py + s.vy * dt);

        const curC = Math.round(nextPx / blockSize);
        const curR = Math.floor(nextPy / blockSize);

        // Czy wiertnica jest na powierzchni (wiersze 0 i 1)
        if (curR <= 1) {
          s.atSurface = true;
          s.oxygen = s.maxOxygen;
          sellCargoAtSurface();
          s.px = nextPx;
          s.py = nextPy;
        } else {
          s.atSurface = false;
          // Zużycie tlenu pod ziemią
          s.oxygen = Math.max(0, s.oxygen - 1.2 * dt);
          if (s.oxygen <= 0) {
            ctx.lose("Koniec tlenu", `Skończyło się powietrze na głębokości ${curR}m. Dostarczono ${s.fossilsTurnedIn}/${fossils} skamielin.`);
            return;
          }

          // Sprawdzanie bloku pod pojazdem
          const targetR = down ? curR + 1 : curR;
          const targetIdx = targetR * cols + curC;
          const block = s.grid[targetIdx];

          if (block) {
            // Wiercenie bloku
            const res = digBlock(s.grid, cols, targetR, curC, drillPower * dt * 10);
            if (Math.random() < 0.45) {
              s.particles.push({
                x: curC * blockSize + blockSize / 2,
                y: targetR * blockSize + blockSize / 2,
                vx: (Math.random() - 0.5) * 25,
                vy: -(8 + Math.random() * 20),
                c: block.color,
                life: 0.55,
              });
            }
            if (res.dug) {
              Sound.place(3);
              if (res.mineral) {
                if (s.cargo.length < s.cargoCap) {
                  s.cargo.push(res.mineral);
                  ctx.toast(`Wydobyto: ${MINERALS[res.mineral].name}!`);
                } else {
                  ctx.toast(`Brak miejsca w ładowni na ${MINERALS[res.mineral].name}!`);
                }
              }
            } else {
              // Blok blokuje ruch
              s.vy = 0;
            }
          } else {
            s.px = nextPx;
            s.py = nextPy;
          }
        }

        // Kamera podąża za pojazdem w pionie
        const camY = Math.max(0, s.py - H * 0.45);

        // --- RYSOWANIE SCENY PODZIEMNEJ ---
        g.fillStyle = "#090d16";
        g.fillRect(0, 0, W, H);

        g.save();
        g.translate(0, -camY);

        // Niebo i baza naziemna (r = 0..1)
        g.fillStyle = "#38bdf8";
        g.fillRect(0, 0, W, blockSize * 1.5);

        // Budynki bazy naziemnej
        g.fillStyle = "#334155";
        g.fillRect(10, blockSize * 0.3, 65, blockSize * 1.2);
        g.fillStyle = "#facc15";
        g.font = "bold 6px sans-serif";
        g.fillText("SKUP RUDY", 18, blockSize * 0.9);

        g.fillStyle = "#1e293b";
        g.fillRect(W - 85, blockSize * 0.3, 75, blockSize * 1.2);
        g.fillStyle = "#38bdf8";
        g.fillText("STACJA TLENU", W - 78, blockSize * 0.9);

        // Warstwa trawy na powierzchni
        g.fillStyle = "#16a34a";
        g.fillRect(0, blockSize * 1.4, W, blockSize * 0.6);

        // Bloki kopalni
        const startR = Math.max(2, Math.floor(camY / blockSize));
        const endR = Math.min(rows - 1, Math.ceil((camY + H) / blockSize));

        for (let r = startR; r <= endR; r++) {
          for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            const block = s.grid[idx];
            const bx = c * blockSize;
            const by = r * blockSize;

            if (block) {
              g.fillStyle = block.color;
              g.fillRect(bx, by, blockSize - 1, blockSize - 1);

              // Rysunek minerału wewnątrz skały
              if (block.mineral) {
                const min = MINERALS[block.mineral];
                g.fillStyle = min.color;
                g.beginPath();
                g.arc(bx + blockSize / 2, by + blockSize / 2, min.fossil ? 4.5 : 3.2, 0, Math.PI * 2);
                g.fill();
                if (min.fossil) {
                  g.strokeStyle = "#ffffff";
                  g.lineWidth = 1;
                  g.stroke();
                }
              }

              // Pęknięcia podczas wiercenia
              if (block.hp < block.maxHp) {
                g.strokeStyle = "rgba(0, 0, 0, 0.65)";
                g.lineWidth = 1.2;
                g.beginPath();
                g.moveTo(bx + 2, by + 2);
                g.lineTo(bx + blockSize - 2, by + blockSize - 2);
                g.moveTo(bx + blockSize - 2, by + 2);
                g.lineTo(bx + 2, by + blockSize - 2);
                g.stroke();
              }
            } else {
              // Pusty wykopany tunel (podkłady drewniane w tle)
              g.fillStyle = "#1c1917";
              g.fillRect(bx, by, blockSize, blockSize);
              if ((r + c) % 6 === 0) {
                g.strokeStyle = "rgba(120, 53, 15, 0.35)";
                g.lineWidth = 1.5;
                g.strokeRect(bx + 1, by + 1, blockSize - 2, blockSize - 2);
              }
            }
          }
        }

        // Snop światła reflektora w dół kopalni
        const lightGrad = g.createRadialGradient(s.px, s.py, 4, s.px, s.py + 26, 44);
        lightGrad.addColorStop(0, "rgba(254, 240, 138, 0.35)");
        lightGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
        g.fillStyle = lightGrad;
        g.beginPath();
        g.moveTo(s.px - 6, s.py);
        g.lineTo(s.px - 26, s.py + 46);
        g.lineTo(s.px + 26, s.py + 46);
        g.lineTo(s.px + 6, s.py);
        g.closePath();
        g.fill();

        // Cząsteczki odprysków skalnych
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 65 * dt;
          pt.life -= dt * 2.0;
          if (pt.life <= 0) {
            s.particles.splice(i, 1);
            continue;
          }
          g.fillStyle = pt.c;
          g.fillRect(pt.x, pt.y, 2, 2);
        }

        // Pojazd wiertniczy gracza (z drganiem przy wierceniu)
        const jx = down ? (Math.random() - 0.5) * 1.4 : 0;
        g.save();
        g.translate(s.px + jx, s.py);

        // Płomień dopalacza
        if (up) {
          g.fillStyle = "#f97316";
          g.beginPath();
          g.moveTo(-4, 7);
          g.lineTo(4, 7);
          g.lineTo(0, 15 + Math.random() * 5);
          g.closePath();
          g.fill();
        }

        // Kadłub wiertnicy
        g.fillStyle = "#b45309";
        g.strokeStyle = "#fbbf24";
        g.lineWidth = 1.3;
        g.beginPath();
        g.roundRect(-6.5, -6.5, 13, 12, 3);
        g.fill();
        g.stroke();

        // Głowica wiertła na dole
        g.fillStyle = "#cbd5e1";
        g.beginPath();
        g.moveTo(-5, 5.5);
        g.lineTo(5, 5.5);
        g.lineTo(0, 11 + Math.sin(now * 0.04) * 1.5);
        g.closePath();
        g.fill();

        // Okno kabiny
        g.fillStyle = "#38bdf8";
        g.fillRect(-3.5, -4, 7, 4.5);

        g.restore();
        g.restore();

        updatePanel();
      });
    },
  });
}
