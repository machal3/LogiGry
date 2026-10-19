// Orbita: kosmiczna łamigłówka grawitacyjna.
// Asysty grawitacyjne, trajektorie między planetami, zbieranie próbek danych i dokowanie do stacji badawczej.
{
  const G_CONST = 1600;

  function calculateGravity(px, py, planets) {
    let ax = 0, ay = 0;
    for (const pl of planets) {
      const dx = pl.x - px;
      const dy = pl.y - py;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist > pl.r * 0.8) {
        const force = (G_CONST * pl.mass) / Math.max(120, distSq);
        ax += (dx / dist) * force;
        ay += (dy / dist) * force;
      }
    }
    return [ax, ay];
  }

  function simulateTrajectory(startX, startY, vx, vy, planets, maxSteps = 180, dt = 0.05) {
    const pts = [[startX, startY]];
    let x = startX, y = startY;
    let curVx = vx, curVy = vy;

    for (let i = 0; i < maxSteps; i++) {
      const [ax, ay] = calculateGravity(x, y, planets);
      curVx += ax * dt;
      curVy += ay * dt;
      x += curVx * dt;
      y += curVy * dt;
      pts.push([x, y]);

      // Sprawdź uderzenie w planetę
      for (const pl of planets) {
        if (Math.hypot(x - pl.x, y - pl.y) < pl.r) {
          return { pts, hitPlanet: pl };
        }
      }
    }
    return { pts, hitPlanet: null };
  }

  const STAGES = {
    easy: [
      {
        start: { x: 30, y: 150 },
        station: { x: 260, y: 50, r: 16 },
        planets: [
          { x: 145, y: 100, r: 24, mass: 1.0, color: "#38bdf8", ring: true },
        ],
        beacons: [
          { x: 145, y: 48, r: 12 },
          { x: 195, y: 125, r: 12 },
        ],
      },
      {
        start: { x: 30, y: 60 },
        station: { x: 270, y: 150, r: 16 },
        planets: [
          { x: 110, y: 130, r: 18, mass: 0.8, color: "#f59e0b" },
          { x: 200, y: 70, r: 20, mass: 0.9, color: "#10b981" },
        ],
        beacons: [
          { x: 110, y: 75, r: 12 },
          { x: 200, y: 135, r: 12 },
        ],
      },
      {
        start: { x: 35, y: 170 },
        station: { x: 265, y: 40, r: 16 },
        planets: [
          { x: 150, y: 110, r: 28, mass: 1.4, color: "#ec4899", ring: true },
        ],
        beacons: [
          { x: 95, y: 110, r: 12 },
          { x: 205, y: 110, r: 12 },
          { x: 150, y: 45, r: 12 },
        ],
      },
    ],
    medium: [
      {
        start: { x: 25, y: 100 },
        station: { x: 275, y: 100, r: 15 },
        planets: [
          { x: 110, y: 65, r: 19, mass: 0.95, color: "#f97316" },
          { x: 190, y: 135, r: 19, mass: 0.95, color: "#6366f1" },
        ],
        beacons: [
          { x: 110, y: 125, r: 12 },
          { x: 190, y: 75, r: 12 },
          { x: 150, y: 100, r: 12 },
        ],
      },
      {
        start: { x: 30, y: 165 },
        station: { x: 260, y: 55, r: 15 },
        planets: [
          { x: 100, y: 100, r: 16, mass: 0.75, color: "#eab308" },
          { x: 160, y: 120, r: 24, mass: 1.3, color: "#06b6d4", ring: true },
          { x: 220, y: 65, r: 16, mass: 0.75, color: "#a855f7" },
        ],
        beacons: [
          { x: 100, y: 45, r: 12 },
          { x: 220, y: 130, r: 12 },
        ],
      },
      {
        start: { x: 30, y: 45 },
        station: { x: 270, y: 160, r: 15 },
        planets: [
          { x: 150, y: 100, r: 15, mass: 1.8, color: "#ffffff", singularity: true },
        ],
        beacons: [
          { x: 150, y: 40, r: 12 },
          { x: 150, y: 160, r: 12 },
          { x: 85, y: 100, r: 12 },
        ],
      },
    ],
    hard: [
      {
        start: { x: 30, y: 170 },
        station: { x: 270, y: 35, r: 14 },
        planets: [
          { x: 100, y: 110, r: 20, mass: 1.1, color: "#ef4444" },
          { x: 200, y: 90, r: 22, mass: 1.25, color: "#8b5cf6", ring: true },
        ],
        beacons: [
          { x: 100, y: 45, r: 12 },
          { x: 200, y: 155, r: 12 },
          { x: 150, y: 100, r: 12 },
        ],
      },
      {
        start: { x: 25, y: 50 },
        station: { x: 275, y: 150, r: 14 },
        planets: [
          { x: 110, y: 130, r: 18, mass: 1.0, color: "#14b8a6" },
          { x: 150, y: 65, r: 14, mass: 1.6, color: "#ffffff", singularity: true },
          { x: 215, y: 125, r: 18, mass: 1.0, color: "#f59e0b" },
        ],
        beacons: [
          { x: 80, y: 80, r: 12 },
          { x: 245, y: 80, r: 12 },
        ],
      },
      {
        start: { x: 30, y: 100 },
        station: { x: 270, y: 100, r: 14 },
        planets: [
          { x: 110, y: 55, r: 16, mass: 0.9, color: "#ec4899" },
          { x: 110, y: 145, r: 16, mass: 0.9, color: "#3b82f6" },
          { x: 190, y: 100, r: 26, mass: 1.7, color: "#10b981", ring: true },
        ],
        beacons: [
          { x: 110, y: 100, r: 12 },
          { x: 190, y: 35, r: 12 },
          { x: 190, y: 165, r: 12 },
        ],
      },
    ],
  };

  if (typeof module !== "undefined") {
    module.exports = { calculateGravity, simulateTrajectory, STAGES };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "orbita",
    cat: "lamiglowki",
    name: "Orbita",
    author: "Gemini 4",
    desc: "Wystrzeliwuj sondy między planetami, wykorzystuj ich przyciąganie grawitacyjne i dotrzyj do stacji badawczych.",
    color: "#4f46e5",
    ink: "#ffffff",
    glyph: [
      "...#.",
      ".###.",
      ".###.",
      ".###.",
      "#....",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, probesPerStage: 4, stagesCount: 3 },
      { key: "medium", name: "Średni", points: 25, probesPerStage: 3, stagesCount: 3 },
      { key: "hard", name: "Trudny", points: 50, probesPerStage: 2, stagesCount: 3 },
    ],
    rules: [
      "Przeciągnij myszą od wyrzutni (albo użyj strzałek i Spacji), aby ustalić kąt i siłę wystrzału sondy badawczej.",
      "Masa planet zakrzywia tor lotu sondy; w locie możesz nacisnąć Spację, aby uruchomić krótki impuls manewrowy (RCS).",
      "Zbierz punkty badawcze (żółte sygnały) i wprowadź sondę w zieloną orbitę stacji badawczej bez uderzenia w powierzchnię planet.",
      "Zmieść się w limicie dostępnych sond na każdy układ planetarny.",
    ],
    achievements: [
      { id: "pierwszy-przelot", name: "Grawitacyjna proca", desc: "Wykorzystaj asystę grawitacyjną planety i dotrzyj do stacji.", points: 10 },
      { id: "komplet-danych", name: "Badacz kosmosu", desc: "Zbierz wszystkie sondy danych w danym układzie.", points: 25 },
      { id: "bez-korekty", name: "Lot balistyczny", desc: "Ukończ średni lub trudny układ bez użycia silnika korekcyjnego.", points: 25 },
      { id: "astronawigator", name: "Astronawigator", desc: "Ukończ trudny poziom, zużywając tylko jedną sondę na każdy układ.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, probesPerStage, stagesCount } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const stageList = STAGES[key] || STAGES.easy;
      const s = {
        stageIdx: 0,
        probesLeft: probesPerStage,
        angle: -0.65,
        power: 42,
        probe: null,
        dragging: false,
        usedPulseInStage: false,
        usedOneProbeOnly: true,
        beaconsGot: new Set(),
        stars: Array.from({ length: 65 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          s: 0.8 + Math.random() * 1.5,
          alpha: 0.3 + Math.random() * 0.7,
        })),
        particles: [],
      };

      const stageEl = statBlock(ctx, "Układ planetarny", { meter: true });
      const probeEl = statBlock(ctx, "Dostępne sondy", { small: true });
      const dataEl = statBlock(ctx, "Pomiary naukowe", { meter: true });

      const launchBtn = button("Wystrzel sondę (Enter)", "btn wide", () => launchProbe());
      const pulseBtn = button("Impuls manewrowy (Spacja)", "btn-ghost wide", () => firePulse());
      ctx.panel.append(panelBlock("Centrum lotu", launchBtn, pulseBtn));

      function curStage() {
        return stageList[s.stageIdx % stageList.length];
      }

      function updatePanel() {
        const st = curStage();
        stageEl.set(
          `${s.stageIdx + 1} / ${stagesCount}`,
          (s.stageIdx + s.beaconsGot.size / Math.max(1, st.beacons.length) * 0.7) / stagesCount,
          s.probe ? "Sonda w locie balistycznym" : "Ustaw kąt i siłę wystrzału"
        );
        probeEl.set(`${s.probesLeft} szt.`, null, `Kąt: ${Math.round((-s.angle * 180) / Math.PI)}° · Ciąg: ${Math.round(s.power)}`);
        dataEl.set(
          `${s.beaconsGot.size} / ${st.beacons.length}`,
          s.beaconsGot.size / Math.max(1, st.beacons.length),
          s.beaconsGot.size === st.beacons.length ? "Komplet danych zebrany!" : "Zbieraj próbki przy planetach"
        );
        ctx.progress(s.stageIdx / stagesCount);
      }

      function launchProbe() {
        if (ctx.done || s.probe || s.probesLeft <= 0) return;
        const st = curStage();
        s.probesLeft--;
        if (s.probesLeft < probesPerStage - 1) {
          s.usedOneProbeOnly = false;
        }
        const vx = Math.cos(s.angle) * s.power;
        const vy = Math.sin(s.angle) * s.power;
        s.probe = {
          x: st.start.x,
          y: st.start.y,
          vx,
          vy,
          trail: [],
        };
        s.usedPulseInStage = false;
        Sound.tap();
        updatePanel();
      }

      function firePulse() {
        if (ctx.done || !s.probe) return;
        s.usedPulseInStage = true;
        // Dodatkowy impuls w kierunku lotu
        const speed = Math.hypot(s.probe.vx, s.probe.vy);
        if (speed > 1) {
          s.probe.vx += (s.probe.vx / speed) * 16;
          s.probe.vy += (s.probe.vy / speed) * 16;
        }
        Sound.place(4);
        ctx.toast("Włączono silnik manewrowy RCS");
      }

      function nextStage() {
        const st = curStage();
        if (s.beaconsGot.size === st.beacons.length) {
          ctx.achieve("komplet-danych");
        }
        if (!s.usedPulseInStage && key !== "easy") {
          ctx.achieve("bez-korekty");
        }
        ctx.achieve("pierwszy-przelot");

        if (s.stageIdx + 1 >= stagesCount) {
          if (key === "hard" && s.usedOneProbeOnly) {
            ctx.achieve("astronawigator");
          }
          ctx.win(`Wszystkie ${stagesCount} układy planetarne pomyślnie zbadane.`);
        } else {
          s.stageIdx++;
          s.probe = null;
          s.probesLeft = probesPerStage;
          s.beaconsGot.clear();
          Sound.line();
          ctx.toast(`Układ ${s.stageIdx + 1} osiągnięty!`);
          updatePanel();
        }
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "Enter") {
          e.preventDefault();
          launchProbe();
        } else if (e.key === " ") {
          e.preventDefault();
          if (s.probe) firePulse();
          else launchProbe();
        } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          s.angle -= 0.08;
          updatePanel();
        } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
          s.angle += 0.08;
          updatePanel();
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          s.power = Math.min(65, s.power + 2);
          updatePanel();
        } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          s.power = Math.max(15, s.power - 2);
          updatePanel();
        }
      });

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        const st = curStage();
        if (!s.probe) {
          s.dragging = true;
          const dx = x - st.start.x, dy = y - st.start.y;
          s.angle = Math.atan2(dy, dx);
          s.power = Math.max(15, Math.min(65, Math.hypot(dx, dy) * 0.8));
          updatePanel();
        } else {
          firePulse();
        }
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.dragging || s.probe) return;
        const [x, y] = cv.at(e);
        const st = curStage();
        const dx = x - st.start.x, dy = y - st.start.y;
        s.angle = Math.atan2(dy, dx);
        s.power = Math.max(15, Math.min(65, Math.hypot(dx, dy) * 0.8));
        updatePanel();
      });

      ctx.on(document, "pointerup", () => {
        if (s.dragging) {
          s.dragging = false;
          launchProbe();
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        const st = curStage();

        // Fizyka sondy w locie
        if (s.probe) {
          const p = s.probe;
          const [ax, ay] = calculateGravity(p.x, p.y, st.planets);
          p.vx += ax * dt;
          p.vy += ay * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          p.trail.push([p.x, p.y]);
          if (p.trail.length > 70) p.trail.shift();

          // Płomień silnika sondy
          if (Math.random() < 0.55) {
            const flightAng = Math.atan2(p.vy, p.vx) + Math.PI;
            s.particles.push({
              x: p.x + Math.cos(flightAng) * 4,
              y: p.y + Math.sin(flightAng) * 4,
              vx: Math.cos(flightAng + (Math.random() - 0.5) * 0.4) * (20 + Math.random() * 20),
              vy: Math.sin(flightAng + (Math.random() - 0.5) * 0.4) * (20 + Math.random() * 20),
              c: Math.random() > 0.4 ? "#f97316" : "#38bdf8",
              r: 1.2 + Math.random() * 1.5,
              life: 0.45,
            });
          }

          // Sprawdzanie zbierania sygnałów z boi
          st.beacons.forEach((b, idx) => {
            if (!s.beaconsGot.has(idx) && Math.hypot(p.x - b.x, p.y - b.y) < b.r + 4) {
              s.beaconsGot.add(idx);
              for (let k = 0; k < 10; k++) {
                const a = (k * Math.PI * 2) / 10;
                s.particles.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(a) * 30,
                  vy: Math.sin(a) * 30,
                  c: "#10b981",
                  r: 1.5,
                  life: 0.55,
                });
              }
              Sound.place(idx + 1);
              ctx.toast(`Zebrano dane z punktu pomiarowego ${idx + 1}`);
              updatePanel();
            }
          });

          // Sprawdzanie dokowania do stacji badawczej
          if (Math.hypot(p.x - st.station.x, p.y - st.station.y) < st.station.r) {
            for (let k = 0; k < 18; k++) {
              const a = (k * Math.PI * 2) / 18;
              s.particles.push({
                x: st.station.x,
                y: st.station.y,
                vx: Math.cos(a) * 35,
                vy: Math.sin(a) * 35,
                c: "#22c55e",
                r: 1.8,
                life: 0.65,
              });
            }
            nextStage();
            return;
          }

          // Sprawdzanie zderzenia z planetą
          for (const pl of st.planets) {
            if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r) {
              s.probe = null;
              Sound.error();
              ctx.toast("Sonda rozbiła się o powierzchnię planety!");
              if (s.probesLeft <= 0) {
                ctx.lose("Brak sond", "Wyczerpałeś wszystkie dostępne sondy badawcze.");
              }
              updatePanel();
              return;
            }
          }

          // Ucieczka poza przestrzeń (wylecenie poza ekran)
          if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) {
            s.probe = null;
            Sound.error();
            ctx.toast("Sonda opuściła układ grawitacyjny!");
            if (s.probesLeft <= 0) {
              ctx.lose("Brak sond", "Wyczerpałeś wszystkie dostępne sondy badawcze.");
            }
            updatePanel();
            return;
          }
        }

        // --- RYSOWANIE KOSMOSU ---
        g.fillStyle = "#030712";
        g.fillRect(0, 0, W, H);

        // Gwiazdy w tle
        for (const star of s.stars) {
          g.fillStyle = "#ffffff";
          g.globalAlpha = star.alpha * (0.8 + 0.2 * Math.sin(now * 0.003 + star.x));
          g.beginPath();
          g.arc(star.x, star.y, star.s, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;

        // Podgląd trajektorii z wyrzutni (jeśli sonda nie leci)
        if (!s.probe && s.probesLeft > 0) {
          const vx0 = Math.cos(s.angle) * s.power;
          const vy0 = Math.sin(s.angle) * s.power;
          const { pts } = simulateTrajectory(st.start.x, st.start.y, vx0, vy0, st.planets);

          g.strokeStyle = "rgba(99, 102, 241, 0.45)";
          g.lineWidth = 1.2;
          g.setLineDash([3, 3]);
          g.beginPath();
          g.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
          g.stroke();
          g.setLineDash([]);

          // Strzałki kierunkowe wzdłuż trajektorii
          g.fillStyle = "rgba(165, 180, 252, 0.65)";
          for (let i = 12; i < pts.length - 6; i += 16) {
            const [p1x, p1y] = pts[i];
            const [p2x, p2y] = pts[i + 1];
            const arrAng = Math.atan2(p2y - p1y, p2x - p1x);
            g.save();
            g.translate(p1x, p1y);
            g.rotate(arrAng);
            g.beginPath();
            g.moveTo(2.5, 0);
            g.lineTo(-2.5, -2);
            g.lineTo(-1.2, 0);
            g.lineTo(-2.5, 2);
            g.closePath();
            g.fill();
            g.restore();
          }
        }

        // Ślad lotu lecącej sondy
        if (s.probe && s.probe.trail.length > 1) {
          g.strokeStyle = "#38bdf8";
          g.lineWidth = 1.6;
          g.beginPath();
          g.moveTo(s.probe.trail[0][0], s.probe.trail[0][1]);
          for (let i = 1; i < s.probe.trail.length; i++) {
            g.lineTo(s.probe.trail[i][0], s.probe.trail[i][1]);
          }
          g.stroke();
        }

        // Boje pomiarowe
        st.beacons.forEach((b, idx) => {
          const isGot = s.beaconsGot.has(idx);
          const pulse = isGot ? 1 : 1 + 0.18 * Math.sin(now * 0.007 + idx);

          g.fillStyle = isGot ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)";
          g.strokeStyle = isGot ? "#10b981" : "#f59e0b";
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Rdzeń boi
          g.fillStyle = isGot ? "#10b981" : "#f59e0b";
          g.beginPath();
          g.arc(b.x, b.y, 3, 0, Math.PI * 2);
          g.fill();
        });

        // Planety i pola grawitacyjne
        for (const pl of st.planets) {
          // Pulsujące fale zakrzywienia czasoprzestrzeni wokół planety
          const wave = (now * 0.003) % 1;
          g.strokeStyle = pl.singularity ? "rgba(168, 85, 247, 0.25)" : "rgba(56, 189, 248, 0.22)";
          g.lineWidth = 0.8;
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r + wave * 22, 0, Math.PI * 2);
          g.stroke();

          // Poświata grawitacyjna
          g.fillStyle = pl.singularity ? "rgba(168, 85, 247, 0.15)" : "rgba(56, 189, 248, 0.12)";
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r * 2.1, 0, Math.PI * 2);
          g.fill();

          // Ciało planety
          g.fillStyle = pl.color;
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
          g.fill();

          // Pierścień planetarny
          if (pl.ring) {
            g.strokeStyle = "rgba(255, 255, 255, 0.4)";
            g.lineWidth = 2.2;
            g.beginPath();
            g.ellipse(pl.x, pl.y, pl.r * 1.7, pl.r * 0.55, -0.3, 0, Math.PI * 2);
            g.stroke();
          }

          // Efekt czarnej dziury
          if (pl.singularity) {
            g.fillStyle = "#000000";
            g.beginPath();
            g.arc(pl.x, pl.y, pl.r * 0.7, 0, Math.PI * 2);
            g.fill();
          }
        }

        // Stacja badawcza docelowa (zielony cel dokowania)
        const stn = st.station;
        g.fillStyle = "rgba(34, 197, 94, 0.22)";
        g.strokeStyle = "#22c55e";
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(stn.x, stn.y, stn.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Moduły orbitalne stacji
        g.fillStyle = "#ffffff";
        g.fillRect(stn.x - 7, stn.y - 2.5, 14, 5);
        g.fillStyle = "#38bdf8";
        g.fillRect(stn.x - 12, stn.y - 6, 4, 12);
        g.fillRect(stn.x + 8, stn.y - 6, 4, 12);

        // Wyrzutnia startowa
        const sp = st.start;
        g.fillStyle = "#475569";
        g.beginPath();
        g.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
        g.fill();

        // Wskaźnik lufy wyrzutni
        g.strokeStyle = "#818cf8";
        g.lineWidth = 3;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(sp.x + Math.cos(s.angle) * 14, sp.y + Math.sin(s.angle) * 14);
        g.stroke();

        // Cząsteczki silnika i rozbłysków
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const pt = s.particles[i];
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.life -= dt * 1.8;
          if (pt.life <= 0) {
            s.particles.splice(i, 1);
            continue;
          }
          g.fillStyle = pt.c;
          g.globalAlpha = Math.max(0, pt.life);
          g.beginPath();
          g.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 1;
        }

        // Sonda badawcza w locie
        if (s.probe) {
          g.save();
          g.translate(s.probe.x, s.probe.y);
          const flightAng = Math.atan2(s.probe.vy, s.probe.vx);
          g.rotate(flightAng);

          g.fillStyle = "#ffffff";
          g.strokeStyle = "#38bdf8";
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(5, 0);
          g.lineTo(-4, 3.5);
          g.lineTo(-2, 0);
          g.lineTo(-4, -3.5);
          g.closePath();
          g.fill();
          g.stroke();
          g.restore();
        }
      });
    },
  });
}
