/**
 * Wykopaliska (id: wykopaliska)
 * Autor: Gemini 4
 * Kategoria: przygodowe (big: true)
 * Rozbudowana gra górniczo-eksploracyjna: warstwy geologiczne, 4-kierunkowy świder,
 * dynamit, wyciągarka ratunkowa, sonar sejsmiczny, geody tlenowe i skamieliny.
 */

{
  // Typy bloków w siatce kopalni:
  // 0: pusty (wykopany tunel lub grota)
  // 1: ziemia / glina (płytka warstwa)
  // 2: węgiel (częsty surowiec energetyczny)
  // 3: bursztyn (skamieniała żywica w płytkich warstwach)
  // 4: malachit / miedź (zielonkawa ruda)
  // 5: srebro (żyły kruszcu na średniej głębokości)
  // 6: złoto (cenne samorodki głęboko pod ziemią)
  // 7: rubin (kryształy w głębokim granicie)
  // 8: diament (najcenniejszy kryształ w bazalcie)
  // 9: lita skała bazaltowa (wymaga świdra poz. 2 lub dynamitu)
  // 10: skamielina (główny cel wyprawy paleontologicznej)
  // 11: geoda tlenowa (naturalna kieszeń sprężonego gazu +38% O2)
  // 12: skrzynia ekspedycyjna (porzucony zasobnik z kredytami i dynamitem)

  const BLOCK_INFO = {
    0: { name: "Tunel", hp: 0, val: 0, weight: 0, minDrill: 1 },
    1: { name: "Glina", hp: 0.42, val: 0, weight: 0, minDrill: 1 },
    2: { name: "Węgiel", hp: 0.65, val: 12, weight: 1, minDrill: 1 },
    3: { name: "Bursztyn", hp: 0.78, val: 24, weight: 1, minDrill: 1 },
    4: { name: "Malachit", hp: 0.95, val: 38, weight: 1, minDrill: 1 },
    5: { name: "Srebro", hp: 1.25, val: 58, weight: 1, minDrill: 1 },
    6: { name: "Złoto", hp: 1.65, val: 105, weight: 1, minDrill: 1 },
    7: { name: "Rubin", hp: 2.05, val: 165, weight: 1, minDrill: 2 },
    8: { name: "Diament", hp: 2.55, val: 250, weight: 1, minDrill: 3 },
    9: { name: "Bazalt", hp: 2.9, val: 15, weight: 0, minDrill: 2 },
    10: { name: "Skamielina", hp: 1.45, val: 95, weight: 1, minDrill: 1 },
    11: { name: "Geoda O2", hp: 0.7, val: 18, weight: 0, minDrill: 1 },
    12: { name: "Skrzynia", hp: 1.0, val: 85, weight: 0, minDrill: 1 }
  };

  function generateMine(cols, rows, targetFossils, seed = 1) {
    let s = seed >>> 0;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      const depthRatio = r / rows;
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          row.push(0); // powierzchnia
          continue;
        }
        if (r === 1 && c >= 5 && c <= 8) {
          row.push(1); // miękkie wejście pod bazą
          continue;
        }
        const p = rand();
        if (r >= 4 && p < 0.045) {
          row.push(0); // naturalna szczelina jaskiniowa
        } else if (depthRatio > 0.22 && p < 0.12 + depthRatio * 0.14) {
          row.push(9); // lita skała bazaltowa
        } else if (depthRatio > 0.65 && p < 0.18) {
          row.push(8); // diament
        } else if (depthRatio > 0.42 && p < 0.22) {
          row.push(7); // rubin
        } else if (depthRatio > 0.28 && p < 0.26) {
          row.push(6); // złoto
        } else if (depthRatio > 0.14 && p < 0.31) {
          row.push(5); // srebro
        } else if (depthRatio > 0.08 && p < 0.36) {
          row.push(4); // malachit
        } else if (p < 0.42) {
          row.push(3); // bursztyn
        } else if (p < 0.49) {
          row.push(2); // węgiel
        } else if (r >= 5 && p > 0.968) {
          row.push(11); // geoda tlenowa
        } else if (r >= 6 && p > 0.952 && p <= 0.968) {
          row.push(12); // skrzynia ekspedycyjna
        } else {
          row.push(1); // zwykła warstwa geologiczna
        }
      }
      grid.push(row);
    }

    // Wygeneruj 3-4 podziemne groty (małe komory 2x2 lub 3x2)
    const cavesCount = 3 + Math.floor(rows / 14);
    for (let i = 0; i < cavesCount; i++) {
      const cr = 5 + Math.floor(rand() * (rows - 8));
      const cc = 2 + Math.floor(rand() * (cols - 5));
      grid[cr][cc] = 0;
      grid[cr][cc + 1] = 0;
      if (rand() < 0.65 && cc + 2 < cols - 1) grid[cr][cc + 2] = 0;
      if (rand() < 0.5 && cr + 1 < rows - 2) {
        grid[cr + 1][cc] = 0;
        grid[cr + 1][cc + 1] = 11; // geoda tlenowa na dnie groty
      }
    }

    // Rozmieść skamieliny równomiernie w przedziałach głębokości
    let placed = 0;
    let attempts = 0;
    while (placed < targetFossils && attempts < 600) {
      attempts++;
      const bandMin = Math.max(3, Math.floor(3 + (placed / targetFossils) * (rows - 5)));
      const bandMax = Math.min(rows - 2, Math.floor(4 + ((placed + 1) / targetFossils) * (rows - 4)));
      const r = bandMin + Math.floor(rand() * Math.max(1, bandMax - bandMin + 1));
      const c = 1 + Math.floor(rand() * (cols - 2));
      if (grid[r] && grid[r][c] !== 10) {
        grid[r][c] = 10;
        if (r < rows * 0.45) {
          if (r > 1 && grid[r - 1][c] === 9) grid[r - 1][c] = 1;
          if (c > 1 && grid[r][c - 1] === 9) grid[r][c - 1] = 4;
          if (c < cols - 2 && grid[r][c + 1] === 9) grid[r][c + 1] = 3;
        }
        placed++;
      }
    }

    return grid;
  }

  function digCell(grid, r, c, drillLevel) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) {
      return { ok: false, reason: "out" };
    }
    const type = grid[r][c];
    if (type === 0) return { ok: false, reason: "empty" };
    const info = BLOCK_INFO[type] || BLOCK_INFO[1];
    if (drillLevel < info.minDrill) {
      return { ok: false, reason: "hard", minDrill: info.minDrill };
    }
    grid[r][c] = 0;
    return {
      ok: true,
      type,
      value: info.val,
      weight: info.weight,
      isFossil: type === 10,
      isGeode: type === 11,
      isChest: type === 12
    };
  }

  function blastDynamite(grid, centerR, centerC) {
    const dug = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = centerR + dr;
        const nc = centerC + dc;
        if (nr <= 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) continue;
        const type = grid[nr][nc];
        if (type === 0) continue;
        const info = BLOCK_INFO[type] || BLOCK_INFO[1];
        grid[nr][nc] = 0;
        dug.push({
          r: nr,
          c: nc,
          type,
          value: info.val,
          weight: info.weight,
          isFossil: type === 10,
          isGeode: type === 11,
          isChest: type === 12
        });
      }
    }
    return dug;
  }

  function stepRoverVertical(state, dt, blockSize, collidesAt) {
    const half = blockSize * 0.34;
    const candY = state.py + state.vy * dt;
    const hit = collidesAt(state.px, candY);
    if (!hit) {
      state.py = Math.max(blockSize * 0.5, candY);
      state.onGround = false;
      return;
    }
    if (state.vy > 0) {
      // Lądowanie na górnej krawędzi bloku pod łazikiem
      state.py = hit.r * blockSize - half - 0.04;
      state.vy = 0;
      state.onGround = true;
    } else if (state.vy < 0) {
      // Dotknięcie sufitu nad łazikiem — zatrzymaj tuż pod sufitem (bez teleportowania w dół!)
      state.py = (hit.r + 1) * blockSize + half + 0.04;
      state.vy = 0;
    }
  }

  function findNearestFossil(grid, curR, curC) {
    let best = null;
    let bestDist = Infinity;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[0].length; c++) {
        if (grid[r][c] === 10) {
          const d = Math.hypot(r - curR, c - curC);
          if (d < bestDist) {
            bestDist = d;
            best = { r, c, dist: d };
          }
        }
      }
    }
    return best;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      BLOCK_INFO,
      generateMine,
      digCell,
      blastDynamite,
      stepRoverVertical,
      findNearestFossil
    };
  }

  if (typeof registerGame === "function") {
    registerGame({
      id: "wykopaliska",
      cat: "przygodowe",
      name: "Wykopaliska",
      author: "Gemini 4",
      desc: "Kieruj łazikiem górniczym, wierć tunele w czterech kierunkach, wysadzaj skały dynamitem i wydobądź skamieliny.",
      color: "#b45309",
      ink: "#ffffff",
      big: true,
      glyph: [
        ".###.",
        "#####",
        "..#..",
        ".###.",
        "#.#.#"
      ],
      levels: [
        { key: "easy", name: "Łatwy", points: 20, rows: 24, fossils: 4, o2Rate: 1.45, startDynamite: 2, startMoney: 25 },
        { key: "medium", name: "Średni", points: 50, rows: 34, fossils: 6, o2Rate: 1.95, startDynamite: 2, startMoney: 20 },
        { key: "hard", name: "Trudny", points: 100, rows: 46, fossils: 8, o2Rate: 2.45, startDynamite: 3, startMoney: 15 }
      ],
      rules: [
        "Poruszaj łazikiem strzałkami, klawiszami WASD, przeciąganiem na planszy lub przyciskami dotykowymi.",
        "Napieraj na ścianę w dół, w boki lub w górę, aby włączyć świder plazmowy i wydobywać rudy, geody tlenowe oraz skamieliny.",
        "Używaj dynamitu (klawisz X), aby kruszyć twardy bazalt w promieniu 3x3, oraz wyciągarki (klawisz T), by awaryjnie wrócić do bazy.",
        "Wracaj na powierzchnię przed wyczerpaniem tlenu: sprzedawaj urobek w Skupie Rudy, uzupełniaj tlen i ulepszaj podzespoły łazika.",
        "Wydobądź wszystkie skamieliny wskazane przez sonar sejsmiczny i bezpiecznie dostarcz je do bazy na powierzchni, aby wygrać."
      ],
      achievements: [
        { id: "glebinowy", name: "Speleolog", desc: "Zejdź łazikiem na głębokość co najmniej 20 metrów.", points: 10 },
        { id: "pelna-ladownia", name: "Bogaty urobek", desc: "Sprzedaj jednorazowo ładunek minerałów o wartości co najmniej 200 kredytów.", points: 25 },
        { id: "pelen-tuning", name: "Ciężki sprzęt", desc: "Ulepsz świder, butle tlenowe i ładownię przynajmniej do 3 poziomu.", points: 25 },
        { id: "na-oparach", name: "Na oparach", desc: "Wróć na powierzchnię mając mniej niż 12% zapasu tlenu.", points: 25 },
        { id: "geolog-mistrz", name: "Mistrz geologii", desc: "Ukończ wykopaliska na trudnym poziomie w mniej niż 4 minuty.", points: 50 }
      ],

      mount(board, ctx) {
        const W = 280;
        const H = 195;
        const cols = 14;
        const blockSize = 20; // 14 * 20 = 280 (pełna szerokość płótna)
        const level = ctx.level;
        const rows = level.rows;

        const cv = canvasGame(board, ctx, W, H, { max: 92, cls: "slate" });
        const { g, theme } = cv;

        const s = {
          grid: generateMine(cols, rows, level.fossils, Date.now() & 0xffff),
          px: 7 * blockSize + blockSize * 0.5,
          py: blockSize * 0.5,
          vy: 0,
          vx: 0,
          facing: "right",
          drillDir: "down",
          onGround: true,
          o2: 100,
          maxO2: 100,
          cargo: [],
          maxCargo: 7,
          money: level.startMoney || 20,
          dynamite: level.startDynamite || 2,
          winches: 1,
          fossilsFound: 0,
          fossilsDelivered: 0,
          drillLvl: 1,
          tankLvl: 1,
          cargoLvl: 1,
          drilling: null, // { r, c, progress, total, dir }
          stepTarget: null, // { x, y }
          particles: [],
          floatingTexts: [],
          shockwaves: [],
          camY: 0,
          deepAch: false,
          lowO2Underground: false,
          pointerActive: false,
          pointerPos: { x: 0, y: 0 },
          animTime: 0,
          treadPhase: 0,
          baseFlash: 0
        };

        // --- PANEL BOCZNY (dokładnie 4 własne bloki: statBlock, statsBlock, panelBlock, touchPad) ---
        const fossilStat = statBlock(ctx, "Skamieliny", { meter: true });
        const stats = statsBlock(ctx, "Telemetria łazika", ["Tlen O2", "Kredyty", "Ładownia", "Głębokość"]);

        const shopGrid = el("div", "wykopaliska-shop");
        const drillBtn = button("Świder 2 (50 kr.)", "btn-ghost", () => buyUpgrade("drill"));
        const tankBtn = button("Butle 2 (45 kr.)", "btn-ghost", () => buyUpgrade("tank"));
        const cargoBtn = button("Ładownia 2 (45 kr.)", "btn-ghost", () => buyUpgrade("cargo"));
        const dynBtn = button("Dynamit +1 (30 kr.)", "btn-ghost", () => buyUpgrade("dynamite"));
        const dynamiteUseBtn = button("Odpal dynamit (X)", "btn wide", () => triggerDynamite());
        const winchUseBtn = button("Wyciągarka do bazy (T)", "btn-ghost wide", () => triggerWinch());

        shopGrid.append(drillBtn, tankBtn, cargoBtn, dynBtn);
        ctx.panel.append(panelBlock("Warsztat i sprzęt", shopGrid, dynamiteUseBtn, winchUseBtn));

        const keys = heldKeys(ctx);
        touchPad(ctx, keys, [
          ["left", "Lewo", "i-left"],
          ["up", "Dopalacz / Góra", "i-up"],
          ["down", "Wierć w dół", "i-down"],
          ["right", "Prawo", "i-right"]
        ]);

        // Klawisze skrótów dla warsztatu, dynamitu i wyciągarki
        ctx.on(window, "keydown", (e) => {
          if (ctx.done) return;
          if (e.key === "1") buyUpgrade("drill");
          else if (e.key === "2") buyUpgrade("tank");
          else if (e.key === "3") buyUpgrade("cargo");
          else if (e.key === "4") buyUpgrade("dynamite");
          else if (e.key === "x" || e.key === "X" || e.key === " ") {
            if (e.key === " ") e.preventDefault();
            triggerDynamite();
          } else if (e.key === "t" || e.key === "T" || e.key === "r" || e.key === "R") {
            triggerWinch();
          }
        });

        // Sterowanie kursorem / dotykiem na płótnie + kliknięcie w budynki bazy na powierzchni
        const canvasEl = cv.cv;
        if (canvasEl) {
          canvasEl.addEventListener("pointerdown", (e) => {
            if (ctx.done) return;
            const [posX, posY] = cv.at(e);
            const worldY = posY + s.camY - 38;
            const curR = Math.floor(s.py / blockSize);
            if (curR === 0 && worldY < blockSize * 1.1) {
              if (posX >= 8 && posX <= 86) {
                s.px = 45;
                checkSurfaceService();
                return;
              }
              if (posX >= 194 && posX <= 272) {
                s.px = 232;
                checkSurfaceService();
                return;
              }
            }
            s.pointerActive = true;
            s.pointerPos = { x: posX, y: posY };
          });
          canvasEl.addEventListener("pointermove", (e) => {
            if (!s.pointerActive) return;
            const [posX, posY] = cv.at(e);
            s.pointerPos = { x: posX, y: posY };
          });
          ctx.on(window, "pointerup", () => {
            s.pointerActive = false;
          });
          ctx.on(window, "pointercancel", () => {
            s.pointerActive = false;
          });
        }

        function addFloatingText(txt, x, y, color = "gold") {
          s.floatingTexts.push({ txt, x, y, vy: -18, life: 1.15, maxLife: 1.15, color });
        }

        function spawnParticles(x, y, color, count = 10, speed = 42) {
          for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = (0.25 + Math.random() * 0.85) * speed;
            s.particles.push({
              x,
              y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd - 12,
              size: 1.3 + Math.random() * 2.2,
              life: 0.25 + Math.random() * 0.45,
              color
            });
          }
        }

        function updateUI() {
          fossilStat.set(
            `${s.fossilsDelivered} / ${level.fossils}`,
            s.fossilsDelivered / level.fossils,
            s.fossilsFound > s.fossilsDelivered
              ? `W ładowni: ${s.fossilsFound - s.fossilsDelivered} szt. Wróć do bazy`
              : "Wierć w poszukiwaniu skamielin"
          );
          const o2Pct = Math.max(0, Math.round((s.o2 / s.maxO2) * 100));
          const depth = Math.max(0, Math.floor(s.py / blockSize));
          stats.set("Tlen O2", `${o2Pct}%`);
          stats.set("Kredyty", `${s.money} kr.`);
          stats.set("Ładownia", `${s.cargo.length}/${s.maxCargo}`);
          stats.set("Głębokość", `${depth} m`);

          const drillCost = s.drillLvl * 50;
          drillBtn.textContent = s.drillLvl >= 4 ? "Świder MAX" : `Świder ${s.drillLvl + 1} (${drillCost} kr.)`;
          drillBtn.disabled = s.drillLvl >= 4 || s.money < drillCost;

          const tankCost = s.tankLvl * 45;
          tankBtn.textContent = s.tankLvl >= 4 ? "Butle MAX" : `Butle ${s.tankLvl + 1} (${tankCost} kr.)`;
          tankBtn.disabled = s.tankLvl >= 4 || s.money < tankCost;

          const cargoCost = s.cargoLvl * 45;
          cargoBtn.textContent = s.cargoLvl >= 4 ? "Ładownia MAX" : `Ładownia ${s.cargoLvl + 1} (${cargoCost} kr.)`;
          cargoBtn.disabled = s.cargoLvl >= 4 || s.money < cargoCost;

          dynBtn.textContent = `Dynamit +1 (30 kr.)`;
          dynBtn.disabled = s.dynamite >= 6 || s.money < 30;

          dynamiteUseBtn.textContent = `Odpal dynamit (${s.dynamite} szt.) [X]`;
          dynamiteUseBtn.disabled = s.dynamite <= 0;

          const winchCost = s.winches > 0 ? "darmowa" : "35 kr.";
          winchUseBtn.textContent = `Wyciągarka do bazy (${winchCost}) [T]`;
          winchUseBtn.disabled = depth <= 1 || (s.winches <= 0 && s.money < 35);
        }

        function buyUpgrade(type) {
          if (ctx.done) return;
          if (type === "drill") {
            const cost = s.drillLvl * 50;
            if (s.drillLvl >= 4 || s.money < cost) {
              Sound.error();
              return;
            }
            s.money -= cost;
            s.drillLvl++;
            Sound.place(2);
            ctx.toast(`Ulepszono świder plazmowy do poziomu ${s.drillLvl}.`);
          } else if (type === "tank") {
            const cost = s.tankLvl * 45;
            if (s.tankLvl >= 4 || s.money < cost) {
              Sound.error();
              return;
            }
            s.money -= cost;
            s.tankLvl++;
            s.maxO2 = 100 + (s.tankLvl - 1) * 45;
            s.o2 = s.maxO2;
            Sound.place(2);
            ctx.toast(`Powiększono zbiorniki tlenu i napełniono do 100%.`);
          } else if (type === "cargo") {
            const cost = s.cargoLvl * 45;
            if (s.cargoLvl >= 4 || s.money < cost) {
              Sound.error();
              return;
            }
            s.money -= cost;
            s.cargoLvl++;
            s.maxCargo = 7 + (s.cargoLvl - 1) * 4;
            Sound.place(2);
            ctx.toast(`Rozbudowano ładownię do ${s.maxCargo} miejsc.`);
          } else if (type === "dynamite") {
            if (s.dynamite >= 6 || s.money < 30) {
              Sound.error();
              return;
            }
            s.money -= 30;
            s.dynamite++;
            Sound.place(1);
            ctx.toast(`Dokupiono ładunek sejsmiczny (${s.dynamite} szt.).`);
          }

          if (s.drillLvl >= 3 && s.tankLvl >= 3 && s.cargoLvl >= 3) {
            ctx.achieve("pelen-tuning");
          }
          updateUI();
        }

        function collectDugBlock(res, bx, by) {
          if (res.isGeode) {
            const gain = s.maxO2 * 0.38;
            s.o2 = Math.min(s.maxO2, s.o2 + gain);
            s.money += res.value;
            Sound.line();
            addFloatingText("+38% O2", bx, by, "teal");
            ctx.toast("Przebito geodę tlenową: uzupełniono zapas tlenu.");
            return;
          }
          if (res.isChest) {
            s.money += res.value;
            s.dynamite = Math.min(6, s.dynamite + 1);
            Sound.line();
            addFloatingText(`+${res.value} kr. +Dynamit`, bx, by, "gold");
            ctx.toast(`Odnaleziono skrzynię ekspedycyjną: +${res.value} kr. i ładunek dynamitu.`);
            return;
          }
          if (res.isFossil) {
            s.fossilsFound++;
            s.cargo.push({ type: 10, val: res.value, isFossil: true });
            Sound.line();
            addFloatingText("SKAMIELINA", bx, by, "gold");
            ctx.toast(`Wydobyto skamielinę (${s.fossilsFound}/${level.fossils}). Dostarcz ją na powierzchnię.`);
            return;
          }
          if (res.value > 0) {
            if (s.cargo.length < s.maxCargo) {
              s.cargo.push({ type: res.type, val: res.value, isFossil: false });
              Sound.place(1);
              addFloatingText(`+${BLOCK_INFO[res.type].name}`, bx, by, "ok");
            } else {
              Sound.error();
              addFloatingText("Pełna ładownia", bx, by, "warn");
              ctx.toast("Ładownia pełna. Wróć do Skupu Rudy na powierzchni.");
            }
          } else {
            Sound.tap();
          }
        }

        function triggerDynamite() {
          if (ctx.done) return;
          if (s.dynamite <= 0) {
            Sound.error();
            ctx.toast("Brak ładunków dynamitu. Kup zapas w warsztacie (30 kr.).");
            return;
          }
          const curR = Math.floor(s.py / blockSize);
          const curC = Math.floor(s.px / blockSize);
          if (curR === 0) {
            Sound.error();
            ctx.toast("Dynamitu można używać wyłącznie pod powierzchnią ziemi.");
            return;
          }
          s.dynamite--;
          s.drilling = null;
          s.stepTarget = null;
          const dugList = blastDynamite(s.grid, curR, curC);
          s.shockwaves.push({ x: s.px, y: s.py, r: 4, maxR: blockSize * 2.2, alpha: 1 });
          spawnParticles(s.px, s.py, theme.orange, 26, 75);
          spawnParticles(s.px, s.py, theme.gold, 14, 55);
          Sound.line();

          for (const item of dugList) {
            const bx = (item.c + 0.5) * blockSize;
            const by = (item.r + 0.5) * blockSize;
            spawnParticles(bx, by, getBlockColor(item.type), 6, 40);
            collectDugBlock(item, bx, by);
          }
          updateUI();
        }

        function triggerWinch() {
          if (ctx.done) return;
          const depth = Math.floor(s.py / blockSize);
          if (depth <= 1) {
            ctx.toast("Łazik znajduje się już przy powierzchni.");
            return;
          }
          if (s.winches > 0) {
            s.winches--;
          } else if (s.money >= 35) {
            s.money -= 35;
          } else {
            Sound.error();
            ctx.toast("Wyciągarka awaryjna kosztuje 35 kr.");
            return;
          }
          s.drilling = null;
          s.stepTarget = null;
          s.vx = 0;
          s.vy = 0;
          spawnParticles(s.px, s.py, theme.teal, 18, 60);
          s.px = 7 * blockSize + blockSize * 0.5;
          s.py = blockSize * 0.5;
          s.o2 = s.maxO2;
          Sound.line();
          addFloatingText("EWAKUACJA DO BAZY", s.px, s.py, "teal");
          ctx.toast("Wyciągarka dostarczyła łazik na powierzchnię i uzupełniła tlen.");
          checkSurfaceService();
          updateUI();
        }

        function checkSurfaceService() {
          // Osiągnięcie "Na oparach"
          if (s.lowO2Underground && (s.o2 / s.maxO2) < 0.12) {
            ctx.achieve("na-oparach");
          }
          s.lowO2Underground = false;

          const refilled = s.o2 < s.maxO2 * 0.96;
          s.o2 = s.maxO2;

          if (s.cargo.length > 0) {
            let earned = 0;
            let deliveredNow = 0;
            for (const item of s.cargo) {
              earned += item.val;
              if (item.isFossil) deliveredNow++;
            }
            s.money += earned;
            s.fossilsDelivered += deliveredNow;
            s.cargo = [];
            s.baseFlash = 1.0;
            Sound.line();
            addFloatingText(`+${earned} kr.`, s.px, s.py - 6, "gold");

            if (earned >= 200) {
              ctx.achieve("pelna-ladownia");
            }
            ctx.progress(s.fossilsDelivered / level.fossils);
            ctx.toast(`Rozładowano urobek w bazie: +${earned} kr.`);

            if (s.fossilsDelivered >= level.fossils) {
              updateUI();
              if (level.key === "hard" && ctx.time < 240) {
                ctx.achieve("geolog-mistrz");
              }
              ctx.win(`Wydobyto wszystkie ${level.fossils} skamieliny. Zgromadzony kapitał: ${s.money} kr.`);
              return;
            }
          } else if (refilled) {
            Sound.place(1);
            addFloatingText("Tlen 100%", s.px, s.py - 6, "teal");
          }
          updateUI();
        }

        function getBlockColor(type) {
          if (type === 1) return theme.brown;
          if (type === 2) return "#334155";
          if (type === 3) return theme.orange;
          if (type === 4) return theme.green;
          if (type === 5) return theme.teal;
          if (type === 6) return theme.gold;
          if (type === 7) return theme.pink;
          if (type === 8) return theme.blue;
          if (type === 9) return theme.gray;
          if (type === 10) return theme.violet;
          if (type === 11) return theme.teal;
          if (type === 12) return theme.gold;
          return theme.brown;
        }

        function collidesAt(x, y) {
          const half = blockSize * 0.34;
          const pts = [
            [x - half, y - half],
            [x + half, y - half],
            [x - half, y + half],
            [x + half, y + half]
          ];
          for (const [px, py] of pts) {
            const c = Math.floor(px / blockSize);
            const r = Math.floor(py / blockSize);
            if (c < 0 || c >= cols || r < 0 || r >= rows) return { r, c, wall: true };
            if (s.grid[r][c] !== 0) return { r, c, type: s.grid[r][c] };
          }
          return null;
        }

        function startDrillingTarget(targetR, targetC, dirName) {
          if (targetR <= 0 || targetR >= rows || targetC < 0 || targetC >= cols) return false;
          const targetType = s.grid[targetR][targetC];
          if (targetType <= 0) return false;
          const info = BLOCK_INFO[targetType] || BLOCK_INFO[1];
          if (s.drillLvl < info.minDrill) {
            if (!s.drilling || s.drilling.r !== targetR || s.drilling.c !== targetC) {
              Sound.error();
              ctx.toast(`${info.name} wymaga świdra poz. ${info.minDrill} lub dynamitu [X].`);
              s.drilling = { r: targetR, c: targetC, progress: 0, total: 999, blocked: true, dir: dirName };
            }
            return true;
          }
          if (!s.drilling || s.drilling.r !== targetR || s.drilling.c !== targetC) {
            const drillSpeed = 1 + (s.drillLvl - 1) * 0.52;
            s.drilling = {
              r: targetR,
              c: targetC,
              progress: 0,
              total: info.hp / drillSpeed,
              blocked: false,
              dir: dirName
            };
          }
          return true;
        }

        function stepPhysics(dt) {
          if (ctx.done) return;
          s.animTime += dt;
          if (s.baseFlash > 0) s.baseFlash = Math.max(0, s.baseFlash - dt * 1.8);

          const curC = Math.max(0, Math.min(cols - 1, Math.floor(s.px / blockSize)));
          const curR = Math.max(0, Math.min(rows - 1, Math.floor(s.py / blockSize)));

          // Zużycie tlenu pod ziemią
          if (curR > 0) {
            s.o2 -= level.o2Rate * dt;
            if (s.o2 / s.maxO2 < 0.12) {
              s.lowO2Underground = true;
            }
            if (s.o2 <= 0) {
              s.o2 = 0;
              updateUI();
              ctx.lose("Brak tlenu pod ziemią", `Łazik utknął na głębokości ${curR} m. Dostarczono ${s.fossilsDelivered} z ${level.fossils} skamielin.`);
              return;
            }
            if (curR >= 20 && !s.deepAch) {
              s.deepAch = true;
              ctx.achieve("glebinowy");
            }
          } else {
            if (s.o2 < s.maxO2 || s.cargo.length > 0) {
              checkSurfaceService();
            }
          }

          // Odczyt intencji gracza (klawiatura Arrow*/WASD / touchPad / przeciąganie na płótnie)
          let wantLeft = !!(keys.arrowleft || keys.a || keys.left);
          let wantRight = !!(keys.arrowright || keys.d || keys.right);
          let wantUp = !!(keys.arrowup || keys.w || keys.up);
          let wantDown = !!(keys.arrowdown || keys.s || keys.down);

          if (s.pointerActive) {
            const worldY = s.pointerPos.y + s.camY - 38;
            const dx = s.pointerPos.x - s.px;
            const dy = worldY - s.py;
            if (Math.hypot(dx, dy) > 5) {
              if (Math.abs(dx) > Math.abs(dy) * 0.85) {
                if (dx < -4) wantLeft = true;
                else if (dx > 4) wantRight = true;
              } else {
                if (dy < -4) wantUp = true;
                else if (dy > 4) wantDown = true;
              }
            }
          }

          // Jeśli gracz naciska górę lub kierunek przeciwny, natychmiast anuluj automatyczny krok po przewierceniu!
          if (s.stepTarget) {
            if (wantUp || (wantLeft && s.stepTarget.x > s.px) || (wantRight && s.stepTarget.x < s.px)) {
              s.stepTarget = null;
            }
          }

          // Płynne dokończenie wjazdu w świeżo wywiercone pole
          if (s.stepTarget) {
            const dx = s.stepTarget.x - s.px;
            const dy = s.stepTarget.y - s.py;
            const dist = Math.hypot(dx, dy);
            const stepSpd = 88 * dt;
            s.treadPhase += dt * 12;
            if (dist <= stepSpd) {
              s.px = s.stepTarget.x;
              s.py = s.stepTarget.y;
              s.stepTarget = null;
            } else {
              s.px += (dx / dist) * stepSpd;
              s.py += (dy / dist) * stepSpd;
            }
          } else {
            let wantDrillDir = null;

            // 1. Ruch poziomy
            const moveSpeed = 76;
            if (wantLeft) {
              s.facing = "left";
              s.treadPhase -= dt * 10;
              const candX = s.px - moveSpeed * dt;
              const hit = collidesAt(candX, s.py);
              if (!hit) {
                s.px = candX;
                s.drillDir = "left";
              } else if (!hit.wall && hit.c < curC) {
                wantDrillDir = "left";
                s.drillDir = "left";
              }
            } else if (wantRight) {
              s.facing = "right";
              s.treadPhase += dt * 10;
              const candX = s.px + moveSpeed * dt;
              const hit = collidesAt(candX, s.py);
              if (!hit) {
                s.px = candX;
                s.drillDir = "right";
              } else if (!hit.wall && hit.c > curC) {
                wantDrillDir = "right";
                s.drillDir = "right";
              }
            }

            // 2. Ruch pionowy (dopalacz w górę + wiercenie sufitu / grawitacja w dół)
            if (wantUp) {
              s.drillDir = "up";
              // Jeśli nad łazikiem jest otwarty szyb (lub powierzchnia), wyrównaj delikatnie X do środka szybu,
              // żeby rogi łazika nigdy nie zahaczały o krawędzie ścian bocznych!
              const cellCenterX = (curC + 0.5) * blockSize;
              const aboveOpen = curR > 0 && s.grid[curR - 1][curC] === 0;
              if (aboveOpen && !wantLeft && !wantRight) {
                const diffX = cellCenterX - s.px;
                if (Math.abs(diffX) > 0.2) {
                  const alignStep = Math.sign(diffX) * Math.min(Math.abs(diffX), 95 * dt);
                  if (!collidesAt(s.px + alignStep, s.py)) {
                    s.px += alignStep;
                  }
                }
              }

              s.vy = Math.max(-92, s.vy - 240 * dt);
              if (Math.random() < 0.75) {
                s.particles.push({
                  x: s.px + (Math.random() - 0.5) * 7,
                  y: s.py + 7,
                  vx: (Math.random() - 0.5) * 18,
                  vy: 38 + Math.random() * 25,
                  size: 2.0 + Math.random() * 1.5,
                  life: 0.22,
                  color: Math.random() < 0.5 ? theme.orange : theme.gold
                });
              }

              // Jeśli nad nami w tej samej kolumnie jest blok i dotykamy go od dołu — wierć w górę!
              if (curR > 1 && s.grid[curR - 1][curC] > 0) {
                const topDist = s.py - curR * blockSize;
                if (topDist <= blockSize * 0.55 && !wantLeft && !wantRight) {
                  wantDrillDir = "up";
                }
              }
            } else {
              // Grawitacja
              s.vy = Math.min(115, s.vy + 185 * dt);
            }

            if (wantDown && !wantLeft && !wantRight && !wantUp) {
              wantDrillDir = "down";
              s.drillDir = "down";
            }

            // Zastosuj ruch pionowy bez błędu odbicia od sufitu
            stepRoverVertical(s, dt, blockSize, collidesAt);

            // 3. Wiercenie w 4 kierunkach (dół, lewo, prawo, góra)
            if (wantDrillDir) {
              let targetR = curR;
              let targetC = curC;
              if (wantDrillDir === "down") targetR = curR + 1;
              else if (wantDrillDir === "up") targetR = curR - 1;
              else if (wantDrillDir === "left") targetC = curC - 1;
              else if (wantDrillDir === "right") targetC = curC + 1;

              const active = startDrillingTarget(targetR, targetC, wantDrillDir);
              if (active && s.drilling && !s.drilling.blocked) {
                const centerX = (curC + 0.5) * blockSize;
                const centerY = (curR + 0.5) * blockSize;
                if (wantDrillDir === "down" || wantDrillDir === "up") {
                  s.px += (centerX - s.px) * Math.min(1, 12 * dt);
                } else {
                  s.py += (centerY - s.py) * Math.min(1, 12 * dt);
                }

                s.drilling.progress += dt;
                const bx = (targetC + 0.5) * blockSize;
                const by = (targetR + 0.5) * blockSize;
                const targetType = s.grid[targetR][targetC];
                if (Math.random() < 0.75) {
                  spawnParticles(
                    (s.px + bx) * 0.5,
                    (s.py + by) * 0.5,
                    getBlockColor(targetType),
                    2,
                    34
                  );
                }

                if (s.drilling.progress >= s.drilling.total) {
                  const res = digCell(s.grid, targetR, targetC, s.drillLvl);
                  s.drilling = null;
                  if (res.ok) {
                    spawnParticles(bx, by, getBlockColor(res.type), 14, 52);
                    s.stepTarget = { x: bx, y: by };
                    collectDugBlock(res, bx, by);
                  }
                }
              }
            } else {
              s.drilling = null;
            }
          }

          // Płynna kamera śledząca łazik w pionie
          const targetCamY = Math.max(0, Math.min(rows * blockSize - H + 46, s.py - H * 0.42));
          s.camY += (targetCamY - s.camY) * Math.min(1, 9 * dt);

          // Aktualizacja cząsteczek, fal uderzeniowych i napisów
          for (let i = s.particles.length - 1; i >= 0; i--) {
            const p = s.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 65 * dt;
            p.life -= dt;
            if (p.life <= 0) s.particles.splice(i, 1);
          }
          for (let i = s.shockwaves.length - 1; i >= 0; i--) {
            const sw = s.shockwaves[i];
            sw.r += 160 * dt;
            sw.alpha -= dt * 2.4;
            if (sw.alpha <= 0) s.shockwaves.splice(i, 1);
          }
          for (let i = s.floatingTexts.length - 1; i >= 0; i--) {
            const ft = s.floatingTexts[i];
            ft.y += ft.vy * dt;
            ft.life -= dt;
            if (ft.life <= 0) s.floatingTexts.splice(i, 1);
          }

          updateUI();
        }

        function getStrataBaseColor(r) {
          const ratio = r / rows;
          if (r === 1) return "#4d3826";
          if (ratio < 0.25) return "#5c3d24";
          if (ratio < 0.50) return "#4a3b39";
          if (ratio < 0.76) return "#363945";
          return "#27232f";
        }

        function getStrataCrustColor(r) {
          const ratio = r / rows;
          if (r === 1) return "#6b4f35";
          if (ratio < 0.25) return "#785132";
          if (ratio < 0.50) return "#63504d";
          if (ratio < 0.76) return "#4b4f5e";
          return "#3c3447";
        }

        function drawSurfaceWorld() {
          // Niebo o zmierzchu ekspedycyjnym z gwiazdami i górami w tle
          const skyGrad = g.createLinearGradient(0, -45, 0, blockSize);
          skyGrad.addColorStop(0, "#0c192c");
          skyGrad.addColorStop(0.55, "#1b3352");
          skyGrad.addColorStop(1, "#334e68");
          g.fillStyle = skyGrad;
          g.fillRect(0, -45, W, 45 + blockSize);

          // Odległe pasmo górskie na horyzoncie
          g.fillStyle = "#162942";
          g.beginPath();
          g.moveTo(0, blockSize);
          g.lineTo(0, -6);
          g.lineTo(38, -22);
          g.lineTo(75, -8);
          g.lineTo(122, -28);
          g.lineTo(168, -10);
          g.lineTo(215, -25);
          g.lineTo(255, -12);
          g.lineTo(W, -18);
          g.lineTo(W, blockSize);
          g.closePath();
          g.fill();

          // Pas zieleni i podkład kolejowy bazy na styku z ziemią
          g.fillStyle = "#2d4a2b";
          g.fillRect(0, blockSize - 3, W, 3);
          g.fillStyle = "#475569";
          g.fillRect(8, blockSize - 2, 264, 2);

          // --- LEWY BUDYNEK: SKUP RUDY I LABORATORIUM PALEONTOLOGICZNE ---
          g.fillStyle = "#334155";
          g.fillRect(10, -14, 18, 32);
          g.fillStyle = "#475569";
          g.fillRect(26, -8, 58, 26);
          // Dach trapezowy z szyldem
          g.fillStyle = "#1e293b";
          g.fillRect(27, -15, 56, 7);
          g.strokeStyle = theme.gold;
          g.lineWidth = 1;
          g.strokeRect(27, -15, 56, 7);
          cv.text("SKUP RUDY", 55, -11.2, { size: 4.3, weight: 800, color: "gold" });

          // Świecące okna i brama wyładowcza
          g.fillStyle = s.baseFlash > 0 ? theme.ok : "#fde047";
          g.fillRect(32, -3, 10, 7);
          g.fillRect(46, -3, 10, 7);
          g.fillRect(62, -3, 15, 11);
          g.fillStyle = "#1e293b";
          g.fillRect(12, 8, 14, 10);

          // --- ŚRODKOWA WIEŻA SZYBOWA (WINDA GÓRNICZA) ---
          g.strokeStyle = "#64748b";
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(128, blockSize - 2);
          g.lineTo(135, -16);
          g.lineTo(145, -16);
          g.lineTo(152, blockSize - 2);
          g.moveTo(131, 4);
          g.lineTo(149, 4);
          g.moveTo(133, -6);
          g.lineTo(147, -6);
          g.stroke();
          g.fillStyle = theme.orange;
          g.beginPath();
          g.arc(140, -16, 4.0, 0, Math.PI * 2);
          g.fill();

          // --- PRAWY BUDYNEK: STACJA TLENU I WARSZTAT ---
          g.fillStyle = "#0e7490";
          g.beginPath();
          g.roundRect(194, -12, 13, 30, 5);
          g.roundRect(209, -12, 13, 30, 5);
          g.fill();
          g.fillStyle = "#38bdf8";
          g.fillRect(196, -4, 9, 3);
          g.fillRect(211, -4, 9, 3);
          // Budynek stacji z szyldem na dachu
          g.fillStyle = "#334155";
          g.fillRect(224, -8, 48, 26);
          g.fillStyle = "#0f172a";
          g.fillRect(224, -15, 48, 7);
          g.strokeStyle = theme.teal;
          g.lineWidth = 1;
          g.strokeRect(224, -15, 48, 7);
          cv.text("TLEN O2", 248, -11.2, { size: 4.3, weight: 800, color: "teal" });

          g.fillStyle = "#e0f2fe";
          g.fillRect(231, -2, 12, 8);
          g.fillRect(249, -2, 12, 8);
        }

        function drawMineBackgroundAndBlocks() {
          const minR = Math.max(1, Math.floor((s.camY - 42) / blockSize));
          const maxR = Math.min(rows - 1, Math.ceil((s.camY + H) / blockSize));

          // 1. Tło wykopanych korytarzy (ciemna skała w głębi ze stemplami górniczymi)
          for (let r = minR; r <= maxR; r++) {
            const by = r * blockSize;
            for (let c = 0; c < cols; c++) {
              if (s.grid[r][c] !== 0) continue;
              const bx = c * blockSize;
              g.fillStyle = r < rows * 0.4 ? "#1c1917" : "#11131c";
              g.fillRect(bx, by, blockSize + 0.4, blockSize + 0.4);

              const hash = (r * 31 + c * 17) % 7;
              g.fillStyle = "rgba(255,255,255,0.03)";
              g.fillRect(bx + 3 + hash, by + 4, 6, 4);

              if ((r + c) % 4 === 0 && r > 1) {
                g.fillStyle = "#452715";
                g.fillRect(bx + 1, by, 2.2, blockSize);
                g.fillRect(bx + blockSize - 3.2, by, 2.2, blockSize);
                g.fillRect(bx + 1, by, blockSize - 2, 2.2);
                const glow = g.createRadialGradient(bx + 10, by + 4, 1, bx + 10, by + 4, 12);
                glow.addColorStop(0, "rgba(251, 191, 36, 0.35)");
                glow.addColorStop(1, "rgba(251, 191, 36, 0)");
                g.fillStyle = glow;
                g.beginPath();
                g.arc(bx + 10, by + 4, 12, 0, Math.PI * 2);
                g.fill();
                g.fillStyle = "#fde047";
                g.fillRect(bx + 9, by + 2.2, 2, 2);
              }
            }
          }

          // 2. Lite bloki geologiczne z zaokrąglonymi rogami jaskiń i organiczną fakturą
          for (let r = minR; r <= maxR; r++) {
            const by = r * blockSize;
            const baseCol = getStrataBaseColor(r);
            const crustCol = getStrataCrustColor(r);

            for (let c = 0; c < cols; c++) {
              const type = s.grid[r][c];
              if (type === 0) continue;
              const bx = c * blockSize;
              const seed = (r * 53 + c * 97) & 255;

              const openTop = r > 0 && s.grid[r - 1][c] === 0;
              const openBot = r < rows - 1 && s.grid[r + 1][c] === 0;
              const openLeft = c > 0 && s.grid[r][c - 1] === 0;
              const openRight = c < cols - 1 && s.grid[r][c + 1] === 0;

              // Jeśli blok ma odsłonięte narożniki od strony tunelu, najpierw podmaluj tło tunelu i zaokrąglij narożniki skały
              const hasExposedCorner =
                (openTop && openLeft) || (openTop && openRight) || (openBot && openLeft) || (openBot && openRight);
              if (hasExposedCorner) {
                g.fillStyle = r < rows * 0.4 ? "#1c1917" : "#11131c";
                g.fillRect(bx, by, blockSize + 0.5, blockSize + 0.5);
                g.fillStyle = type === 9 ? "#262936" : baseCol;
                const radTL = openTop && openLeft ? 5 : 0;
                const radTR = openTop && openRight ? 5 : 0;
                const radBR = openBot && openRight ? 5 : 0;
                const radBL = openBot && openLeft ? 5 : 0;
                g.beginPath();
                g.roundRect(bx, by, blockSize + 0.5, blockSize + 0.5, [radTL, radTR, radBR, radBL]);
                g.fill();
              } else {
                g.fillStyle = type === 9 ? "#262936" : baseCol;
                g.fillRect(bx, by, blockSize + 0.5, blockSize + 0.5);
              }

              // Subtelne poziome prążki osadowe i drobne ziarenka skalne
              g.fillStyle = type === 9 ? "#1b1d29" : "rgba(0, 0, 0, 0.14)";
              g.fillRect(bx + (seed % 5), by + 5 + (seed % 4), blockSize - (seed % 6), 1.4);
              g.fillStyle = type === 9 ? "#3b4254" : "rgba(255, 255, 255, 0.05)";
              g.fillRect(bx + 2 + ((seed >> 2) % 5), by + 13 + (seed % 3), blockSize - 6, 1.2);

              // Auto-tiling: oświetlone krawędzie stropu i cienie spągu
              if (openTop) {
                if (r === 1) {
                  g.fillStyle = "#3f6212";
                  g.fillRect(bx, by, blockSize + 0.5, 3.2);
                } else {
                  g.fillStyle = crustCol;
                  g.fillRect(bx + (openLeft ? 3 : 0), by, blockSize - (openLeft ? 3 : 0) - (openRight ? 3 : 0), 2.3);
                }
              }
              if (openBot) {
                g.fillStyle = "rgba(0,0,0,0.34)";
                g.fillRect(bx + (openLeft ? 3 : 0), by + blockSize - 2.3, blockSize - (openLeft ? 3 : 0) - (openRight ? 3 : 0), 2.3);
              }
              if (openLeft) {
                g.fillStyle = crustCol;
                g.fillRect(bx, by + (openTop ? 3 : 0), 2.0, blockSize - (openTop ? 3 : 0) - (openBot ? 3 : 0));
              }
              if (openRight) {
                g.fillStyle = "rgba(0,0,0,0.28)";
                g.fillRect(bx + blockSize - 2.0, by + (openTop ? 3 : 0), 2.0, blockSize - (openTop ? 3 : 0) - (openBot ? 3 : 0));
              }

              // Rysowanie konkretnych minerałów i obiektów w skale
              drawMineralInBlock(type, bx, by, r, c);

              // Pęknięcia podczas wiercenia bloku
              if (s.drilling && s.drilling.r === r && s.drilling.c === c && !s.drilling.blocked) {
                const ratio = Math.min(1, s.drilling.progress / s.drilling.total);
                g.strokeStyle = "#ffffff";
                g.lineWidth = 1.3;
                g.beginPath();
                g.moveTo(bx + 10, by + 10);
                g.lineTo(bx + 10 - ratio * 7, by + 10 - ratio * 6);
                g.moveTo(bx + 10, by + 10);
                g.lineTo(bx + 10 + ratio * 7, by + 10 - ratio * 5);
                g.moveTo(bx + 10, by + 10);
                g.lineTo(bx + 10 - ratio * 5, by + 10 + ratio * 7);
                g.moveTo(bx + 10, by + 10);
                g.lineTo(bx + 10 + ratio * 6, by + 10 + ratio * 6);
                g.stroke();

                g.fillStyle = "rgba(0,0,0,0.75)";
                g.fillRect(bx + 2, by + blockSize - 4.5, blockSize - 4, 3);
                g.fillStyle = theme.gold;
                g.fillRect(bx + 2, by + blockSize - 4.5, (blockSize - 4) * ratio, 3);
              }
            }
          }
        }

        function drawMineralInBlock(type, bx, by, r, c) {
          const cx = bx + blockSize * 0.5;
          const cy = by + blockSize * 0.5;

          if (type === 2) {
            // Węgiel antracytowy: kanciaste czarne bryłki z grafitowym połyskiem
            g.fillStyle = "#0f172a";
            g.beginPath();
            g.moveTo(cx - 5, cy - 1);
            g.lineTo(cx - 1, cy - 5);
            g.lineTo(cx + 4, cy - 2);
            g.lineTo(cx + 5, cy + 3);
            g.lineTo(cx - 1, cy + 5);
            g.closePath();
            g.fill();
            g.fillStyle = "#475569";
            g.beginPath();
            g.moveTo(cx - 4, cy - 1);
            g.lineTo(cx - 1, cy - 4);
            g.lineTo(cx + 2, cy - 1);
            g.closePath();
            g.fill();
          } else if (type === 3) {
            // Bursztyn: szlifowany sześciokątny klejnot żywiczny
            g.fillStyle = "#d97706";
            g.beginPath();
            g.moveTo(cx - 4.5, cy - 2);
            g.lineTo(cx, cy - 5);
            g.lineTo(cx + 4.5, cy - 2);
            g.lineTo(cx + 3.5, cy + 3.5);
            g.lineTo(cx - 1, cy + 4.5);
            g.closePath();
            g.fill();
            g.fillStyle = "#fde047";
            g.beginPath();
            g.moveTo(cx - 2.5, cy - 1.5);
            g.lineTo(cx, cy - 3.5);
            g.lineTo(cx + 2, cy - 1);
            g.closePath();
            g.fill();
          } else if (type === 4) {
            // Malachit: szmaragdowa druza kryształów w skale
            g.fillStyle = "#059669";
            g.beginPath();
            g.moveTo(cx - 4, cy + 4);
            g.lineTo(cx - 5, cy - 2);
            g.lineTo(cx - 1, cy - 5);
            g.lineTo(cx + 1, cy + 2);
            g.closePath();
            g.fill();

            g.fillStyle = "#34d399";
            g.beginPath();
            g.moveTo(cx - 1, cy + 4);
            g.lineTo(cx + 1, cy - 4);
            g.lineTo(cx + 5, cy - 1);
            g.lineTo(cx + 3, cy + 4);
            g.closePath();
            g.fill();
          } else if (type === 5) {
            // Srebro: lśniące srebrzyste samorodki w ciemnej otoczce
            g.fillStyle = "#475569";
            g.beginPath();
            g.arc(cx, cy, 5.2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#e2e8f0";
            g.beginPath();
            g.moveTo(cx - 4, cy);
            g.lineTo(cx - 1, cy - 4);
            g.lineTo(cx + 4, cy - 2);
            g.lineTo(cx + 3, cy + 3);
            g.lineTo(cx - 2, cy + 4);
            g.closePath();
            g.fill();
            g.fillStyle = "#ffffff";
            g.fillRect(cx - 2, cy - 2.5, 2.2, 2.2);
          } else if (type === 6) {
            // Złoto: bogate samorodki kruszcu
            g.fillStyle = "#92400e";
            g.beginPath();
            g.arc(cx, cy, 5.5, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = theme.gold;
            g.beginPath();
            g.arc(cx - 2, cy - 1.5, 3.2, 0, Math.PI * 2);
            g.arc(cx + 2.2, cy + 1.5, 3.4, 0, Math.PI * 2);
            g.arc(cx + 1.5, cy - 2.5, 2.2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#fef9c3";
            g.fillRect(cx - 3, cy - 2.8, 1.8, 1.8);
          } else if (type === 7) {
            // Rubin: fasetowany kryształ z poświatą
            const glow = g.createRadialGradient(cx, cy, 1, cx, cy, 8);
            glow.addColorStop(0, "rgba(244, 63, 94, 0.45)");
            glow.addColorStop(1, "rgba(244, 63, 94, 0)");
            g.fillStyle = glow;
            g.beginPath();
            g.arc(cx, cy, 8, 0, Math.PI * 2);
            g.fill();

            g.fillStyle = "#f43f5e";
            g.beginPath();
            g.moveTo(cx, cy - 5.8);
            g.lineTo(cx + 5.2, cy);
            g.lineTo(cx, cy + 5.8);
            g.lineTo(cx - 5.2, cy);
            g.closePath();
            g.fill();
            g.fillStyle = "#fda4af";
            g.beginPath();
            g.moveTo(cx, cy - 5.8);
            g.lineTo(cx + 2.4, cy);
            g.lineTo(cx, cy + 1.8);
            g.lineTo(cx - 2.4, cy);
            g.closePath();
            g.fill();
          } else if (type === 8) {
            // Diament: błękitny kryształ o wysokim połysku
            const glow = g.createRadialGradient(cx, cy, 1, cx, cy, 9);
            glow.addColorStop(0, "rgba(56, 189, 248, 0.55)");
            glow.addColorStop(1, "rgba(56, 189, 248, 0)");
            g.fillStyle = glow;
            g.beginPath();
            g.arc(cx, cy, 9, 0, Math.PI * 2);
            g.fill();

            g.fillStyle = "#38bdf8";
            g.beginPath();
            g.moveTo(cx, cy - 6.2);
            g.lineTo(cx + 5.8, cy - 1);
            g.lineTo(cx, cy + 6.2);
            g.lineTo(cx - 5.8, cy - 1);
            g.closePath();
            g.fill();
            g.fillStyle = "#e0f2fe";
            g.beginPath();
            g.moveTo(cx, cy - 6.2);
            g.lineTo(cx + 2.8, cy - 1);
            g.lineTo(cx, cy + 1.8);
            g.lineTo(cx - 2.8, cy - 1);
            g.closePath();
            g.fill();
          } else if (type === 9) {
            // Lita skała bazaltowa: ciemny pancerny blok ze spękaniami
            g.strokeStyle = "#475569";
            g.lineWidth = 1.3;
            g.beginPath();
            g.moveTo(bx + 3, by + 5);
            g.lineTo(bx + 9, by + 3);
            g.lineTo(bx + 17, by + 8);
            g.moveTo(bx + 4, by + 15);
            g.lineTo(bx + 12, by + 17);
            g.lineTo(bx + 16, by + 12);
            g.stroke();
          } else if (type === 10) {
            // Skamielina paleontologiczna: złota poświata + muszla amonitu
            const pulse = 6.5 + Math.sin(s.animTime * 4 + c) * 2;
            const glow = g.createRadialGradient(cx, cy, 1, cx, cy, pulse + 3);
            glow.addColorStop(0, "rgba(250, 204, 21, 0.45)");
            glow.addColorStop(1, "rgba(250, 204, 21, 0)");
            g.fillStyle = glow;
            g.beginPath();
            g.arc(cx, cy, pulse + 3, 0, Math.PI * 2);
            g.fill();

            g.fillStyle = "#fde68a";
            g.beginPath();
            g.arc(cx, cy, 5.5, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#78350f";
            g.lineWidth = 1.4;
            g.beginPath();
            g.arc(cx, cy, 4.4, 0, Math.PI * 1.55);
            g.arc(cx + 0.6, cy, 2.2, Math.PI * 1.55, Math.PI * 3.0);
            g.stroke();
          } else if (type === 11) {
            // Geoda tlenowa: turkusowa kieszeń gazowa z bąbelkami O2
            g.fillStyle = "#0891b2";
            g.beginPath();
            g.arc(cx, cy, 6.2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "#67e8f9";
            g.beginPath();
            g.arc(cx - 1.8, cy - 1.5, 2.4, 0, Math.PI * 2);
            g.arc(cx + 2.2, cy + 1.8, 1.7, 0, Math.PI * 2);
            g.fill();
            cv.text("O2", cx, cy + 0.5, { size: 4.5, weight: 800, color: "#083344" });
          } else if (type === 12) {
            // Skrzynia ekspedycyjna
            g.fillStyle = "#92400e";
            g.beginPath();
            g.roundRect(bx + 4, by + 5, 12, 10, 2);
            g.fill();
            g.strokeStyle = theme.gold;
            g.lineWidth = 1.3;
            g.strokeRect(bx + 4, by + 5, 12, 10);
            g.fillStyle = theme.gold;
            g.fillRect(cx - 1.5, cy - 1, 3, 2.5);
          }
        }

        function drawRover() {
          g.save();
          g.translate(s.px, s.py);

          // 1. Stożek światła reflektora halogenowego pod ziemią
          const depth = Math.floor(s.py / blockSize);
          if (depth >= 1) {
            let lightAng = s.facing === "left" ? Math.PI : 0;
            if (s.drillDir === "down") lightAng = Math.PI * 0.5;
            else if (s.drillDir === "up") lightAng = -Math.PI * 0.5;

            g.save();
            g.rotate(lightAng);
            const coneGrad = g.createLinearGradient(4, 0, 56, 0);
            coneGrad.addColorStop(0, "rgba(254, 240, 138, 0.28)");
            coneGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
            g.fillStyle = coneGrad;
            g.beginPath();
            g.moveTo(4, -3);
            g.lineTo(56, -24);
            g.lineTo(56, 24);
            g.lineTo(4, 3);
            g.closePath();
            g.fill();
            g.restore();
          }

          // 2. Obracający się świder plazmowy (ustawiany w kierunku wiercenia: dół, góra, lewo, prawo)
          const drillColor =
            s.drillLvl >= 4 ? "#38bdf8" : s.drillLvl === 3 ? "#f43f5e" : s.drillLvl === 2 ? theme.gold : "#cbd5e1";
          const spin = s.drilling ? Math.sin(s.animTime * 42) * 1.5 : 0;

          g.save();
          let dAngle = 0;
          if (s.drillDir === "down") dAngle = Math.PI * 0.5;
          else if (s.drillDir === "up") dAngle = -Math.PI * 0.5;
          else if (s.drillDir === "left") dAngle = Math.PI;
          else dAngle = 0;
          g.rotate(dAngle);

          g.fillStyle = "#475569";
          g.fillRect(5, -3.2, 2.5, 6.4);
          g.fillStyle = drillColor;
          g.beginPath();
          g.moveTo(7.5, -3.6);
          g.lineTo(13.8 + Math.abs(spin) * 0.6, spin * 0.35);
          g.lineTo(7.5, 3.6);
          g.closePath();
          g.fill();
          g.strokeStyle = "#1e293b";
          g.lineWidth = 1.0;
          g.beginPath();
          g.moveTo(8.2, -2.5);
          g.lineTo(10.5, 2.2);
          g.moveTo(10.2, -1.8);
          g.lineTo(12.0, 1.2);
          g.stroke();
          g.restore();

          // 3. Gąsienice i zawieszenie z kołami jezdnymi
          g.fillStyle = "#1e293b";
          g.beginPath();
          g.roundRect(-7.5, 2.5, 15, 5.2, 2.5);
          g.fill();
          g.strokeStyle = "#64748b";
          g.lineWidth = 0.9;
          g.strokeRect(-7.2, 2.7, 14.4, 4.8);

          g.fillStyle = "#94a3b8";
          for (const wx of [-4.5, 0, 4.5]) {
            g.beginPath();
            g.arc(wx, 5.1, 1.7, 0, Math.PI * 2);
            g.fill();
          }

          // 4. Korpus pancerny łazika i butle tlenowe na grzbiecie
          const dirSign = s.facing === "left" ? -1 : 1;
          g.fillStyle = "#0284c7";
          g.beginPath();
          g.roundRect(-dirSign * 6.5 - 2, -5.8, 4, 7.5, 1.5);
          g.fill();

          const bodyGrad = g.createLinearGradient(0, -6.5, 0, 3);
          bodyGrad.addColorStop(0, "#f59e0b");
          bodyGrad.addColorStop(1, "#b45309");
          g.fillStyle = bodyGrad;
          g.beginPath();
          g.roundRect(-6.5, -5.8, 13, 8.8, 2.8);
          g.fill();
          g.strokeStyle = "#78350f";
          g.lineWidth = 1;
          g.stroke();

          // Przeszklona kabina pilota z odbiciem światła
          g.fillStyle = "#38bdf8";
          g.beginPath();
          g.roundRect(dirSign * 1.2 - 3, -4.6, 6, 4.5, 1.5);
          g.fill();
          g.fillStyle = "#e0f2fe";
          g.fillRect(dirSign * 1.8 - 1.5, -4.0, 2.5, 1.4);

          // Reflektor czołowy
          g.fillStyle = "#fef08a";
          g.beginPath();
          g.arc(dirSign * 6.2, -1.5, 1.4, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }

        function drawSonarAndHUD() {
          const curR = Math.max(0, Math.floor(s.py / blockSize));
          const curC = Math.max(0, Math.floor(s.px / blockSize));
          const nearest = findNearestFossil(s.grid, curR, curC);

          // Górny pasek HUD na płótnie (status tlenu, ładowni, dynamitu i sonaru skamielin)
          g.fillStyle = "rgba(15, 23, 42, 0.86)";
          g.beginPath();
          g.roundRect(4, 3, W - 8, 15.5, 4);
          g.fill();
          g.strokeStyle = "rgba(148, 163, 184, 0.28)";
          g.lineWidth = 0.8;
          g.stroke();

          // Mini-pasek O2 na płótnie
          const o2Ratio = Math.max(0, Math.min(1, s.o2 / s.maxO2));
          g.fillStyle = "#1e293b";
          g.fillRect(26, 7.5, 40, 6.5);
          g.fillStyle = o2Ratio < 0.25 ? theme.bad : theme.teal;
          g.fillRect(26, 7.5, 40 * o2Ratio, 6.5);
          cv.text("O2", 14, 11, { size: 5.0, weight: 800, color: o2Ratio < 0.25 ? "bad" : "teal" });

          cv.text(`Ruda: ${s.cargo.length}/${s.maxCargo}`, 98, 11, {
            size: 4.8,
            weight: 700,
            color: s.cargo.length >= s.maxCargo ? "warn" : "text"
          });
          cv.text(`Dyn.: ${s.dynamite}`, 154, 11, { size: 4.8, weight: 700, color: "orange" });

          // Sonar sejsmiczny wskazujący najbliższą skamielinę
          if (nearest) {
            const distM = Math.max(1, Math.round(nearest.dist));
            cv.text(`Sonar: ${distM}m`, 222, 11, { size: 4.8, weight: 700, color: "gold" });

            const ang = Math.atan2(nearest.r - curR, nearest.c - curC);
            g.save();
            g.translate(263, 10.8);
            g.rotate(ang);
            g.fillStyle = theme.gold;
            g.beginPath();
            g.moveTo(4.5, 0);
            g.lineTo(-3, -3);
            g.lineTo(-1.5, 0);
            g.lineTo(-3, 3);
            g.closePath();
            g.fill();
            g.restore();
          } else {
            cv.text("Wróć do bazy", 232, 11, { size: 4.8, weight: 800, color: "ok" });
          }
        }

        updateUI();

        cv.loop((dt) => {
          stepPhysics(Math.min(dt, 0.05));

          g.clearRect(0, 0, W, H);
          g.save();
          g.translate(0, -s.camY + 38);

          drawSurfaceWorld();
          drawMineBackgroundAndBlocks();

          // Fale uderzeniowe po wybuchu dynamitu
          for (const sw of s.shockwaves) {
            g.strokeStyle = `rgba(251, 146, 60, ${sw.alpha.toFixed(2)})`;
            g.lineWidth = 2.5;
            g.beginPath();
            g.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
            g.stroke();
          }

          // Cząsteczki odłamków i płomieni
          for (const p of s.particles) {
            g.fillStyle = p.color;
            g.beginPath();
            g.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            g.fill();
          }

          drawRover();

          // Unoszące się powiadomienia na planszy
          for (const ft of s.floatingTexts) {
            cv.text(ft.txt, ft.x, ft.y, { size: 5.5, weight: 800, color: ft.color });
          }

          g.restore();

          drawSonarAndHUD();
        });
      }
    });
  }
}
