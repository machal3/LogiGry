// Balon: lot pocztowym balonem nad górami. Wysokość przez temperaturę, dostawy do wsi.
// Krajobraz 2.5D z parallaksem i kolizjami ze szczytami.
{
  const W = 300, H = 200;

  // Generuje profil terenu i cele dostaw. Teren zawsze ma przełęcze między wsiami.
  function generate({ villages, wind, peaks }) {
    const terrain = [];
    const n = 120;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let h = 28 + Math.sin(t * Math.PI * 3.1) * 18 + Math.sin(t * Math.PI * 7.3) * 10;
      h += Math.sin(t * Math.PI * 1.2) * peaks;
      terrain.push(Math.max(12, Math.min(92, h)));
    }
    // wsi: lokalne doliny
    const drops = [];
    for (let v = 0; v < villages; v++) {
      const t = 0.12 + (v + 0.5) / villages * 0.76;
      const ix = Math.floor(t * (n - 1));
      for (let k = -3; k <= 3; k++) {
        const j = Math.max(0, Math.min(n - 1, ix + k));
        terrain[j] = Math.min(terrain[j], 22 + Math.abs(k) * 3);
      }
      drops.push({
        x: t * 1000,
        y: terrain[ix] + 2,
        done: false,
        name: ["Jawor", "Lipki", "Bór", "Skałka", "Młyn", "Zdrój", "Hala", "Potok"][v] || `Wieś ${v + 1}`,
      });
    }
    // wygładzenie
    for (let pass = 0; pass < 2; pass++) {
      const next = terrain.slice();
      for (let i = 1; i < n - 1; i++) next[i] = (terrain[i - 1] + terrain[i] * 2 + terrain[i + 1]) / 4;
      for (let i = 1; i < n - 1; i++) terrain[i] = next[i];
    }
    const birds = [];
    for (let i = 0; i < 4 + peaks; i++) {
      birds.push({
        x: 120 + Math.random() * 800,
        y: 40 + Math.random() * 50,
        phase: Math.random() * Math.PI * 2,
        dir: Math.random() < 0.5 ? -1 : 1,
      });
    }
    const storms = [];
    for (let i = 0; i < Math.floor(peaks / 8); i++) {
      storms.push({ x: 200 + Math.random() * 650, y: 25 + Math.random() * 20, r: 28 + Math.random() * 12 });
    }
    return { terrain, drops, birds, storms, worldW: 1000, wind };
  }

  function groundAt(terrain, worldX, worldW) {
    const t = Math.max(0, Math.min(1, worldX / worldW));
    const f = t * (terrain.length - 1);
    const i = Math.floor(f);
    const u = f - i;
    const a = terrain[i];
    const b = terrain[Math.min(terrain.length - 1, i + 1)];
    return a * (1 - u) + b * u;
  }

  // Czy balon (cx, cy, r) koliduje z terenem
  function hitsTerrain(terrain, worldW, cx, cy, r) {
    for (let dx = -r; dx <= r; dx += r / 2) {
      const g = groundAt(terrain, cx + dx, worldW);
      // współrzędne: y rośnie w dół na ekranie, ale w świecie y=0 to góra nieba, y większe = niżej
      // używamy: cy to wysokość od dołu świata (większa = wyżej). Przeliczenie w mount.
      if (cy - r < g) return true;
    }
    return false;
  }

  function canDrop(balloon, drop, radius) {
    return !drop.done && Math.abs(balloon.x - drop.x) < radius && Math.abs(balloon.y - drop.y) < radius * 0.9;
  }

  if (typeof module !== "undefined") module.exports = { generate, groundAt, hitsTerrain, canDrop, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "balon",
    cat: "symulacje",
    big: true,
    name: "Balon",
    author: "Composer",
    desc: "Steruj balonem ogrzewając powietrze, omijaj góry i dostarczaj paczki do wsi.",
    color: "#ea580c",
    ink: "#ffffff",
    glyph: [".###.", "#...#", "#.#.#", ".###.", "..#.."],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, villages: 3, wind: 12, peaks: 10, fuel: 100, cool: 7 },
      { key: "medium", name: "Średni", points: 50, villages: 5, wind: 20, peaks: 16, fuel: 90, cool: 9 },
      { key: "hard", name: "Trudny", points: 100, villages: 7, wind: 28, peaks: 22, fuel: 80, cool: 11 },
    ],
    rules: [
      "Strzałka w górę / W albo przycisk Ogień ogrzewa powietrze i unosi balon. W dół / S schładza i obniża lot.",
      "Wiatr niesie balon w bok. Nad wsią naciśnij Spację albo Zrzut, by dostarczyć paczkę.",
      "Unikaj szczytów gór, burz i ptaków. Każde zderzenie uszkadza kosz; trzy uszkodzenia kończą lot.",
      "Wygrywasz po dostarczeniu wszystkich paczek, zanim skończy się paliwo palnika.",
    ],
    achievements: [
      { id: "pierwsza-dostawa", name: "Listonosz", desc: "Dostarcz pierwszą paczkę do wsi.", points: 10 },
      { id: "oszczedny", name: "Oszczędny", desc: "Wygraj poziom z co najmniej 30% paliwa.", points: 25 },
      { id: "bez-dziur", name: "Cały kosz", desc: "Ukończ średni lub trudny poziom bez uszkodzeń.", points: 25 },
      { id: "szybka-poczta", name: "Szybka poczta", desc: "Dostarcz wszystkie paczki na trudnym poziomie w mniej niż 150 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const world = generate(L);
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "arcade" });
      const { g } = cv;

      // y w świecie: wysokość nad „zerem terenu” (większa = wyżej). Ekran: sy = H - y * scale...
      const s = {
        x: 40,
        y: groundAt(world.terrain, 40, world.worldW) + 35,
        vy: 0,
        heat: 0.45,
        fuel: L.fuel,
        hull: 3,
        damaged: false,
        delivered: 0,
        inv: 0,
        flash: 0,
        t: 0,
        parcels: [],
        sparks: [],
        windPhase: 0,
        firstDrop: false,
        finished: 0,
      };

      const delEl = statBlock(ctx, "Dostawy", { meter: true });
      const fuelEl = statBlock(ctx, "Paliwo", { meter: true });
      const hullEl = statBlock(ctx, "Kosz", { small: true });
      const navEl = statBlock(ctx, "Kurs", { small: true });

      const keys = heldKeys(ctx);
      let burnTouch = 0; // -1 cool, 1 heat
      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        cv.cv.setPointerCapture?.(e.pointerId);
        const [, py] = cv.at(e);
        burnTouch = py < H / 2 ? 1 : -1;
      });
      ctx.on(cv.cv, "pointermove", (e) => {
        if (burnTouch) burnTouch = cv.at(e)[1] < H / 2 ? 1 : -1;
      });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { burnTouch = 0; });

      let holdFire = false;
      const fireBtn = button("Ogień", "btn wide", () => {});
      fireBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); holdFire = true; });
      for (const ev of ["pointerup", "pointerleave", "pointercancel"]) fireBtn.addEventListener(ev, () => { holdFire = false; });
      ctx.panel.append(panelBlock("Palnik", fireBtn, button("Zrzut", "btn-ghost wide", tryDrop)));
      touchPad(ctx, keys, [
        { key: "arrowup", icon: "i-up", label: "Ogień" },
        { key: "arrowdown", icon: "i-down", label: "Chłodź" },
      ]);

      function tryDrop() {
        if (ctx.done) return;
        const drop = world.drops.find((d) => canDrop(s, d, 36));
        if (!drop) {
          const near = world.drops.find((d) => !d.done && Math.abs(s.x - d.x) < 50);
          ctx.toast(near ? "Zbliż się wysokością do wsi" : "Brak wsi w zasięgu");
          Sound.error();
          return;
        }
        drop.done = true;
        s.delivered++;
        s.parcels.push({ x: s.x, y: s.y - 8, vy: 0, target: drop, life: 1.2 });
        Sound.place(1 + (s.delivered % 9));
        if (!s.firstDrop) { s.firstDrop = true; ctx.achieve("pierwsza-dostawa"); }
        if (s.delivered >= world.drops.length) {
          s.finished = 0.01;
          Sound.line();
        }
        renderHud();
      }

      ctx.on(document, "keydown", (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          tryDrop();
        }
      });

      cv.loop((dt) => {
        s.t += dt;
        if (!ctx.done && !s.finished) update(dt);
        else if (s.finished) {
          s.finished += dt;
          if (s.finished > 1 && !ctx.done) endWin();
        }
        draw(dt);
      });

      function update(dt) {
        s.windPhase += dt;
        const wind = world.wind * (0.7 + 0.3 * Math.sin(s.windPhase * 0.4));
        s.x += wind * dt;

        let heatInput = 0;
        if (keys.arrowup || keys.w || burnTouch > 0 || holdFire) heatInput = 1;
        if (keys.arrowdown || keys.s || burnTouch < 0) heatInput = -1;

        if (heatInput > 0 && s.fuel > 0) {
          s.heat = Math.min(1, s.heat + 0.55 * dt);
          s.fuel = Math.max(0, s.fuel - L.cool * 0.55 * dt);
          // iskry palnika
          if (Math.random() < dt * 25) {
            s.sparks.push({
              x: s.x + (Math.random() - 0.5) * 4,
              y: s.y + 6,
              vx: (Math.random() - 0.5) * 10,
              vy: 20 + Math.random() * 30,
              life: 0.3 + Math.random() * 0.25,
            });
          }
        } else if (heatInput < 0) {
          s.heat = Math.max(0, s.heat - 0.7 * dt);
        } else {
          s.heat = Math.max(0, s.heat - 0.12 * dt);
        }

        // siła nośna vs grawitacja
        const lift = (s.heat - 0.38) * 55;
        s.vy += (lift - 12) * dt;
        s.vy *= 1 - Math.min(0.9, dt * 1.8);
        s.y += s.vy * dt;

        // strop nieba
        if (s.y > 175) { s.y = 175; s.vy = Math.min(0, s.vy); }

        s.inv = Math.max(0, s.inv - dt);
        s.flash = Math.max(0, s.flash - dt);

        // kolizja z terenem (y = wysokość od dołu: terrain też od dołu)
        const ground = groundAt(world.terrain, s.x, world.worldW);
        if (s.y - 14 < ground && s.inv <= 0) {
          damage("Szczyt");
          s.y = ground + 16;
          s.vy = Math.abs(s.vy) * 0.4 + 8;
        }

        // burze
        for (const st of world.storms) {
          if (Math.hypot(s.x - st.x, s.y - st.y) < st.r + 8 && s.inv <= 0) {
            damage("Burza");
            s.vy -= 15;
            s.heat = Math.max(0, s.heat - 0.2);
          }
        }

        // ptaki
        for (const b of world.birds) {
          b.x += b.dir * 18 * dt;
          b.y += Math.sin(s.t * 2 + b.phase) * 8 * dt;
          if (b.x < 0 || b.x > world.worldW) b.dir *= -1;
          if (Math.hypot(s.x - b.x, s.y - b.y) < 12 && s.inv <= 0) damage("Ptak");
        }

        // spadające paczki (y większe = wyżej)
        for (const p of s.parcels) {
          p.vy += 90 * dt;
          p.y -= p.vy * dt;
          p.life -= dt;
        }
        s.parcels = s.parcels.filter((p) => p.life > 0);

        for (const sp of s.sparks) {
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt * 0.15;
          sp.life -= dt;
        }
        s.sparks = s.sparks.filter((sp) => sp.life > 0);

        if (s.fuel <= 0 && s.delivered < world.drops.length && s.heat < 0.15) {
          const gnd = groundAt(world.terrain, s.x, world.worldW);
          if (s.y - 12 <= gnd + 4) {
            return ctx.lose("Brak paliwa", `Dostarczono ${s.delivered} z ${world.drops.length} paczek.`);
          }
        }

        // poza mapą
        if (s.x > world.worldW + 40) {
          if (s.delivered >= world.drops.length) s.finished = 0.01;
          else return ctx.lose("Poza mapą", `Dostarczono ${s.delivered} z ${world.drops.length}.`);
        }

        renderHud();
      }

      function damage(why) {
        s.hull--;
        s.damaged = true;
        s.inv = 1.5;
        s.flash = 0.5;
        Sound.error();
        ctx.toast(`${why} (−1)`);
        if (s.hull <= 0) {
          ctx.lose("Rozbity kosz", `Dostarczono ${s.delivered} z ${world.drops.length} paczek.`);
        }
      }

      function endWin() {
        if (s.fuel / L.fuel >= 0.3) ctx.achieve("oszczedny");
        if (!s.damaged && L.key !== "easy") ctx.achieve("bez-dziur");
        if (L.key === "hard" && ctx.time < 150) ctx.achieve("szybka-poczta");
        ctx.win(`Dostarczono ${s.delivered} paczek. Paliwo: ${Math.round(s.fuel)}%.`);
      }

      function worldToScreen(wx, wy) {
        // kamera śledzi balon
        const camX = s.x - W * 0.35;
        const sx = wx - camX;
        const sy = H - wy * (H / 190) - 8;
        return [sx, sy];
      }

      function draw() {
        // niebo — złota godzina
        const sky = g.createLinearGradient(0, 0, 0, H);
        const dusk = Math.min(1, s.x / world.worldW);
        sky.addColorStop(0, `rgb(${40 + dusk * 30 | 0},${60 + dusk * 20 | 0},${110 - dusk * 40 | 0})`);
        sky.addColorStop(0.45, `rgb(${180 + dusk * 40 | 0},${120 + dusk * 20 | 0},${90 | 0})`);
        sky.addColorStop(1, `rgb(${240},${180 - dusk * 40 | 0},${120 | 0})`);
        g.fillStyle = sky;
        g.fillRect(0, 0, W, H);

        // słońce
        const [sunX, sunY] = [W * 0.82, H * 0.18];
        const sg = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, 45);
        sg.addColorStop(0, "rgba(255,230,160,1)");
        sg.addColorStop(0.35, "rgba(255,140,60,0.45)");
        sg.addColorStop(1, "rgba(255,100,40,0)");
        g.fillStyle = sg;
        g.beginPath(); g.arc(sunX, sunY, 45, 0, Math.PI * 2); g.fill();

        // odległe pasma gór (parallax)
        drawMountainLayer(0.25, 0.4, "#6b4f3a", 55);
        drawMountainLayer(0.55, 0.7, "#8b6914", 40);
        drawTerrain();

        // burze
        for (const st of world.storms) {
          const [sx, sy] = worldToScreen(st.x, st.y);
          if (sx < -60 || sx > W + 60) continue;
          drawStorm(sx, sy, st.r);
        }

        // wsie
        for (const d of world.drops) {
          const [sx, sy] = worldToScreen(d.x, d.y);
          if (sx < -40 || sx > W + 40) continue;
          drawVillage(sx, sy, d);
        }

        // ptaki
        for (const b of world.birds) {
          const [sx, sy] = worldToScreen(b.x, b.y);
          if (sx < -20 || sx > W + 20) continue;
          drawBird(sx, sy, s.t + b.phase);
        }

        // paczki w powietrzu
        for (const p of s.parcels) {
          const [sx, sy] = worldToScreen(p.x, p.y);
          g.fillStyle = "#f59f00";
          g.fillRect(sx - 4, sy - 4, 8, 8);
          g.strokeStyle = "#e67700";
          g.strokeRect(sx - 4, sy - 4, 8, 8);
        }

        // iskry
        for (const sp of s.sparks) {
          const [sx, sy] = worldToScreen(sp.x, sp.y);
          g.globalAlpha = Math.max(0, sp.life * 3);
          g.fillStyle = sp.life > 0.2 ? "#ffe066" : "#ff922b";
          g.fillRect(sx, sy, 2, 2);
        }
        g.globalAlpha = 1;

        drawBalloon();

        // chmury na pierwszym planie
        drawClouds();

        if (s.flash > 0) {
          g.fillStyle = `rgba(255,80,40,${s.flash * 0.4})`;
          g.fillRect(0, 0, W, H);
        }
        if (s.finished) {
          g.fillStyle = `rgba(255,220,160,${Math.min(0.7, s.finished)})`;
          g.fillRect(0, 0, W, H);
        }

        // wskaźnik ciepła przy balonie
        const [bx] = worldToScreen(s.x, s.y);
        g.fillStyle = "rgba(0,0,0,0.35)";
        g.fillRect(bx + 22, H * 0.3, 6, 40);
        const hg = g.createLinearGradient(0, H * 0.3 + 40, 0, H * 0.3);
        hg.addColorStop(0, "#1c7ed6");
        hg.addColorStop(0.5, "#fab005");
        hg.addColorStop(1, "#fa5252");
        g.fillStyle = hg;
        const hh = 40 * s.heat;
        g.fillRect(bx + 22, H * 0.3 + 40 - hh, 6, hh);
      }

      function drawMountainLayer(parallax, amp, col, base) {
        const camX = (s.x - W * 0.35) * parallax;
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 12) {
          const wx = x + camX;
          const h = base + Math.sin(wx * 0.01) * 22 * amp + Math.sin(wx * 0.023) * 12 * amp;
          g.lineTo(x, H - h);
        }
        g.lineTo(W, H);
        g.closePath();
        g.fill();
      }

      function drawTerrain() {
        const camX = s.x - W * 0.35;
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= W; x += 4) {
          const wx = x + camX;
          const gh = groundAt(world.terrain, wx, world.worldW);
          const [, sy] = worldToScreen(wx, gh);
          x === 0 ? g.lineTo(x, sy) : g.lineTo(x, sy);
        }
        g.lineTo(W, H);
        g.closePath();
        const tg = g.createLinearGradient(0, H * 0.4, 0, H);
        tg.addColorStop(0, "#adb5bd");
        tg.addColorStop(0.35, "#868e96");
        tg.addColorStop(0.7, "#5c7c4a");
        tg.addColorStop(1, "#2f4f2f");
        g.fillStyle = tg;
        g.fill();
        // śnieg na szczytach
        g.strokeStyle = "rgba(255,255,255,0.55)";
        g.lineWidth = 2;
        g.beginPath();
        let started = false;
        for (let x = 0; x <= W; x += 4) {
          const wx = x + camX;
          const gh = groundAt(world.terrain, wx, world.worldW);
          if (gh < 55) continue;
          const [, sy] = worldToScreen(wx, gh);
          if (!started) { g.moveTo(x, sy); started = true; }
          else g.lineTo(x, sy);
        }
        g.stroke();
      }

      function drawVillage(sx, sy, d) {
        // dachy
        const mark = d.done ? "#69db7c" : "#fcc419";
        g.fillStyle = "#7950f2";
        g.fillRect(sx - 10, sy - 14, 8, 14);
        g.fillStyle = "#e03131";
        g.beginPath(); g.moveTo(sx - 12, sy - 14); g.lineTo(sx - 6, sy - 22); g.lineTo(sx, sy - 14); g.fill();
        g.fillStyle = "#343a40";
        g.fillRect(sx + 2, sy - 12, 10, 12);
        g.fillStyle = "#f08c00";
        g.beginPath(); g.moveTo(sx + 1, sy - 12); g.lineTo(sx + 7, sy - 20); g.lineTo(sx + 13, sy - 12); g.fill();
        // znacznik
        g.fillStyle = mark;
        g.beginPath();
        g.arc(sx, sy - 30 - Math.sin(s.t * 3) * 2, 4, 0, Math.PI * 2);
        g.fill();
        if (!d.done) {
          g.strokeStyle = mark;
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(sx, sy - 26);
          g.lineTo(sx, sy - 16);
          g.stroke();
        }
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.font = "9px sans-serif";
        g.textAlign = "center";
        g.fillText(d.name, sx, sy + 10);
      }

      function drawStorm(sx, sy, r) {
        g.fillStyle = "rgba(40,40,60,0.55)";
        for (let i = 0; i < 5; i++) {
          const a = s.t + i;
          g.beginPath();
          g.ellipse(sx + Math.sin(a) * 6, sy + i * 3, r * (0.5 + i * 0.08), r * 0.28, 0, 0, Math.PI * 2);
          g.fill();
        }
        if (Math.sin(s.t * 7 + sx) > 0.92) {
          g.strokeStyle = "rgba(200,220,255,0.8)";
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + 4, sy + 12);
          g.lineTo(sx - 2, sy + 14);
          g.lineTo(sx + 3, sy + 28);
          g.stroke();
        }
      }

      function drawBird(sx, sy, ph) {
        const wing = Math.sin(ph * 8) * 5;
        g.strokeStyle = "#212529";
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(sx - 6, sy - wing);
        g.lineTo(sx, sy);
        g.lineTo(sx + 6, sy - wing);
        g.stroke();
      }

      function drawBalloon() {
        if (s.inv > 0 && Math.floor(s.inv * 12) % 2) return;
        const [sx, sy] = worldToScreen(s.x, s.y);
        const lean = Math.sin(s.t * 1.2) * 0.04 + s.vy * 0.002;
        g.save();
        g.translate(sx, sy);
        g.rotate(lean);

        // envelope
        const eg = g.createRadialGradient(-8, -40, 5, 0, -28, 36);
        eg.addColorStop(0, "#fff4e6");
        eg.addColorStop(0.4, "#ff922b");
        eg.addColorStop(1, "#d9480f");
        g.fillStyle = eg;
        g.beginPath();
        g.ellipse(0, -32, 22, 28, 0, 0, Math.PI * 2);
        g.fill();
        // pasy
        g.strokeStyle = "rgba(255,255,255,0.35)";
        g.lineWidth = 2;
        for (let i = -2; i <= 2; i++) {
          g.beginPath();
          g.ellipse(0, -32, Math.abs(i) * 5 + 4, 28, 0, -1.1, 1.1);
          g.stroke();
        }
        // liny
        g.strokeStyle = "#868e96";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, -10); g.lineTo(-8, 8);
        g.moveTo(14, -10); g.lineTo(8, 8);
        g.moveTo(-6, -8); g.lineTo(-4, 8);
        g.moveTo(6, -8); g.lineTo(4, 8);
        g.stroke();
        // kosz
        g.fillStyle = "#a0794c";
        g.fillRect(-9, 8, 18, 12);
        g.strokeStyle = "#5c3d1e";
        g.strokeRect(-9, 8, 18, 12);
        g.beginPath();
        for (let i = 0; i < 4; i++) {
          g.moveTo(-9 + i * 6, 8);
          g.lineTo(-9 + i * 6, 20);
        }
        g.stroke();
        // palnik
        if (s.heat > 0.5 || keys.arrowup || keys.w || burnTouch > 0 || holdFire) {
          const fl = 6 + Math.random() * 5;
          const fg = g.createLinearGradient(0, 6, 0, 6 - fl);
          fg.addColorStop(0, "rgba(255,255,200,0.9)");
          fg.addColorStop(0.5, "rgba(255,140,0,0.75)");
          fg.addColorStop(1, "rgba(255,60,0,0)");
          g.fillStyle = fg;
          g.beginPath();
          g.moveTo(-4, 6);
          g.lineTo(0, 6 - fl);
          g.lineTo(4, 6);
          g.fill();
        }
        // paczka w koszu
        if (s.delivered < world.drops.length) {
          g.fillStyle = "#fab005";
          g.fillRect(-3, 12, 6, 5);
        }
        g.restore();
      }

      function drawClouds() {
        g.fillStyle = "rgba(255,255,255,0.15)";
        for (let i = 0; i < 5; i++) {
          const cx = ((s.t * (8 + i * 3) + i * 70) % (W + 80)) - 40;
          const cy = 20 + i * 12;
          g.beginPath();
          g.ellipse(cx, cy, 28, 10, 0, 0, Math.PI * 2);
          g.ellipse(cx + 16, cy + 2, 20, 8, 0, 0, Math.PI * 2);
          g.fill();
        }
      }

      function renderHud() {
        const goal = world.drops.length;
        delEl.set(`${s.delivered} / ${goal}`, s.delivered / goal);
        fuelEl.set(`${Math.round(s.fuel)}%`, s.fuel / L.fuel, s.heat > 0.6 ? "Gorąco" : s.heat < 0.3 ? "Chłodno" : "Stabilnie");
        hullEl.set(`${s.hull} z 3`);
        const next = world.drops.find((d) => !d.done);
        if (next) {
          const dx = next.x - s.x;
          const dir = Math.abs(dx) < 25 ? "nad wsią" : dx > 0 ? "z wiatrem →" : "← pod wiatr";
          navEl.set(next.name, null, dir);
        } else navEl.set("Gotowe");
        ctx.progress(s.delivered / goal);
      }
      renderHud();
    },
  });
}
