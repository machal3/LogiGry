// Orbita: kosmiczna łamigłówka grawitacyjna.
// Asysty grawitacyjne, trajektorie między planetami, zbieranie pomiarów z boi i dokowanie do stacji badawczej.
{
  const G_CONST = 1600;
  const STEP_DT = 0.04;
  const MAX_STEPS = 240;

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

  function simulateTrajectory(startX, startY, vx, vy, planets, maxSteps = MAX_STEPS, dt = STEP_DT, stage = null, alreadyGot = null) {
    const pts = [[startX, startY]];
    let x = startX, y = startY;
    let curVx = vx, curVy = vy;
    const hitBeacons = new Set(alreadyGot ? [...alreadyGot] : []);
    const newlyHitBeacons = new Set();
    let hitStation = false;
    let touchedLockedStation = false;

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
          return { pts, hitPlanet: pl, hitBeacons, newlyHitBeacons, hitStation, touchedLockedStation };
        }
      }

      if (stage) {
        if (stage.beacons) {
          stage.beacons.forEach((b, idx) => {
            if (Math.hypot(x - b.x, y - b.y) < b.r + 4) {
              if (!hitBeacons.has(idx)) newlyHitBeacons.add(idx);
              hitBeacons.add(idx);
            }
          });
        }
        if (stage.station) {
          const req = stage.reqBeacons ?? (stage.beacons ? stage.beacons.length : 0);
          if (Math.hypot(x - stage.station.x, y - stage.station.y) < stage.station.r) {
            if (hitBeacons.size >= req) {
              hitStation = true;
              return { pts, hitPlanet: null, hitBeacons, newlyHitBeacons, hitStation, touchedLockedStation };
            } else {
              touchedLockedStation = true;
            }
          }
        }
      }

      if (x < -30 || x > 330 || y < -30 || y > 230) {
        break;
      }
    }
    return { pts, hitPlanet: null, hitBeacons, newlyHitBeacons, hitStation, touchedLockedStation };
  }

  // Buduje układ planetarny i rozmieszcza boje pomiarowe oraz stację na zweryfikowanej krzywej asysty grawitacyjnej
  function makeStage(spec) {
    let bestSol = spec.sol;
    let bestPts = null;

    // Funkcja oceniająca czy trajektoria mieści się na ekranie i dociera na prawą stronę układu
    const evalSol = (angle, power) => {
      const vx = Math.cos(angle) * power;
      const vy = Math.sin(angle) * power;
      const { pts, hitPlanet } = simulateTrajectory(spec.start.x, spec.start.y, vx, vy, spec.planets, MAX_STEPS, STEP_DT);
      if (hitPlanet) return null;
      const validPts = [];
      for (const p of pts) {
        if (p[0] < 15 || p[1] < 24 || p[1] > 176) return null;
        for (const pl of spec.planets) {
          if (Math.hypot(p[0] - pl.x, p[1] - pl.y) < pl.r + 5) return null;
        }
        validPts.push(p);
        if (p[0] >= 265) break;
      }
      const last = validPts[validPts.length - 1];
      if (!last || last[0] < 255) return null;
      return validPts;
    };

    bestPts = evalSol(bestSol.angle, bestSol.power);
    if (!bestPts) {
      // Znajdź najbliższą bezpieczną trajektorię asysty grawitacyjnej na siatce kroków klawiatury
      outer: for (let dp = 0; dp <= 20; dp++) {
        for (const sp of [1, -1]) {
          const p = Math.round(spec.sol.power + dp * sp);
          if (p < 22 || p > 66) continue;
          for (let da = 0; da <= 45; da++) {
            for (const sa of [1, -1]) {
              const a = Math.round((spec.sol.angle + da * sa * 0.025) * 40) / 40;
              const pts = evalSol(a, p);
              if (pts) {
                bestSol = { angle: a, power: p };
                bestPts = pts;
                break outer;
              }
            }
          }
        }
      }
    }

    const pickPt = (frac) => {
      const idx = Math.min(bestPts.length - 2, Math.max(8, Math.round((bestPts.length - 1) * frac)));
      return {
        x: Math.round(bestPts[idx][0]),
        y: Math.round(bestPts[idx][1]),
      };
    };
    const beacons = (spec.beaconFracs || [0.38, 0.68]).map((f) => ({
      ...pickPt(f),
      r: 12,
    }));
    const stPt = pickPt(0.96);
    return {
      name: spec.name,
      start: spec.start,
      planets: spec.planets,
      sol: bestSol,
      beacons,
      reqBeacons: beacons.length,
      station: { x: stPt.x, y: stPt.y, r: spec.stationR || 16 },
    };
  }

  const STAGES = {
    easy: [
      makeStage({
        name: "Błękitny Olbrzym",
        start: { x: 30, y: 150 },
        planets: [
          { x: 145, y: 110, r: 22, mass: 0.95, color: "#38bdf8", ring: true },
        ],
        sol: { angle: -0.65, power: 46 },
        beaconFracs: [0.36, 0.68],
        stationR: 16,
      }),
      makeStage({
        name: "Układ Podwójny",
        start: { x: 30, y: 60 },
        planets: [
          { x: 110, y: 135, r: 18, mass: 0.8, color: "#f59e0b" },
          { x: 205, y: 60, r: 19, mass: 0.85, color: "#10b981" },
        ],
        sol: { angle: 0.15, power: 46 },
        beaconFracs: [0.35, 0.66],
        stationR: 16,
      }),
      makeStage({
        name: "Różowa Obręcz",
        start: { x: 35, y: 160 },
        planets: [
          { x: 150, y: 115, r: 24, mass: 1.2, color: "#ec4899", ring: true },
        ],
        sol: { angle: -0.7, power: 48 },
        beaconFracs: [0.30, 0.56, 0.78],
        stationR: 16,
      }),
    ],
    medium: [
      makeStage({
        name: "Slalom Grawitacyjny",
        start: { x: 28, y: 100 },
        planets: [
          { x: 110, y: 55, r: 17, mass: 0.85, color: "#f97316" },
          { x: 195, y: 145, r: 17, mass: 0.85, color: "#6366f1" },
        ],
        sol: { angle: 0.1, power: 48 },
        beaconFracs: [0.32, 0.58, 0.78],
        stationR: 15,
      }),
      makeStage({
        name: "Korytarz Trzech Ciał",
        start: { x: 30, y: 155 },
        planets: [
          { x: 100, y: 90, r: 15, mass: 0.65, color: "#eab308" },
          { x: 165, y: 140, r: 20, mass: 1.0, color: "#06b6d4", ring: true },
          { x: 225, y: 55, r: 15, mass: 0.65, color: "#a855f7" },
        ],
        sol: { angle: -0.25, power: 50 },
        beaconFracs: [0.35, 0.68],
        stationR: 15,
      }),
      makeStage({
        name: "Horyzont Osobliwości",
        start: { x: 30, y: 50 },
        planets: [
          { x: 150, y: 110, r: 15, mass: 1.5, color: "#ffffff", singularity: true },
        ],
        sol: { angle: -0.05, power: 48 },
        beaconFracs: [0.32, 0.56, 0.78],
        stationR: 15,
      }),
    ],
    hard: [
      makeStage({
        name: "Czerwony Karzeł i Księżyc",
        start: { x: 30, y: 160 },
        planets: [
          { x: 105, y: 120, r: 18, mass: 0.95, color: "#ef4444" },
          { x: 205, y: 80, r: 19, mass: 1.05, color: "#8b5cf6", ring: true },
        ],
        sol: { angle: -0.75, power: 50 },
        beaconFracs: [0.30, 0.55, 0.77],
        stationR: 14,
      }),
      makeStage({
        name: "Studnia Grawitacyjna",
        start: { x: 28, y: 55 },
        planets: [
          { x: 110, y: 140, r: 16, mass: 0.85, color: "#14b8a6" },
          { x: 155, y: 55, r: 14, mass: 1.3, color: "#ffffff", singularity: true },
          { x: 220, y: 135, r: 16, mass: 0.85, color: "#f59e0b" },
        ],
        sol: { angle: 0.2, power: 52 },
        beaconFracs: [0.35, 0.68],
        stationR: 14,
      }),
      makeStage({
        name: "Brama Szmaragdowego Giganta",
        start: { x: 28, y: 100 },
        planets: [
          { x: 110, y: 45, r: 15, mass: 0.8, color: "#ec4899" },
          { x: 110, y: 155, r: 15, mass: 0.8, color: "#3b82f6" },
          { x: 195, y: 110, r: 22, mass: 1.35, color: "#10b981", ring: true },
        ],
        sol: { angle: -0.25, power: 50 },
        beaconFracs: [0.28, 0.54, 0.77],
        stationR: 14,
      }),
    ],
  };

  if (typeof module !== "undefined") {
    module.exports = { calculateGravity, simulateTrajectory, STAGES, STEP_DT, MAX_STEPS };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "orbita",
    cat: "lamiglowki",
    name: "Orbita",
    author: "Gemini 4 Argon",
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
      { key: "easy", name: "Łatwy", points: 10, probes: 4, probesPerStage: 4, stagesCount: 3 },
      { key: "medium", name: "Średni", points: 25, probes: 3, probesPerStage: 3, stagesCount: 3 },
      { key: "hard", name: "Trudny", points: 50, probes: 2, probesPerStage: 2, stagesCount: 3 },
    ],
    rules: [
      "Przeciągnij po planszy lub użyj strzałek (W/S/A/D), aby ustawić kąt oraz ciąg i zobaczyć podgląd trajektorii.",
      "Wystrzel sondę przyciskiem, klawiszem Enter/Spacja lub klikając wyrzutnię; w locie Spacja lub kliknięcie uruchamia impuls korekcyjny.",
      "Zbierz wymagane pomiary z boi badawczych, aby otworzyć osłonę doku i zacumować w zielonej stacji badawczej.",
      "Unikaj zderzeń z planetami i zmieść się w limicie dostępnych sond na każdy układ.",
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
        angle: -0.55,
        power: 42,
        probe: null,
        acc: 0,
        dragging: false,
        downOnLauncher: false,
        dragMoved: false,
        downPos: [0, 0],
        usedPulseInStage: false,
        usedOneProbeOnly: true,
        beaconsGot: new Set(),
        lockedToastCooldown: 0,
        stars: Array.from({ length: 65 }, () => ({
          x: Math.random() * W,
          y: Math.random() * H,
          s: 0.8 + Math.random() * 1.5,
          alpha: 0.3 + Math.random() * 0.7,
        })),
        particles: [],
      };

      const stageEl = statBlock(ctx, "Układ planetarny", { meter: true });
      const probeEl = pipsBlock(ctx, "Dostępne sondy", probesPerStage, { icon: "bolt" });
      const dataEl = statBlock(ctx, "Pomiary naukowe", { meter: true });

      const launchBtn = button("Wystrzel sondę (Enter)", "btn wide", () => launchProbe());
      const pulseBtn = button("Impuls manewrowy (Spacja)", "btn-ghost wide", () => firePulse());
      const hintBtn = button("Podpowiedź trajektorii", "btn-ghost wide", () => applyHint());
      ctx.panel.append(panelBlock("Centrum lotu", launchBtn, pulseBtn, hintBtn));

      function curStage() {
        return stageList[s.stageIdx % stageList.length];
      }

      function updatePanel() {
        const st = curStage();
        const req = st.reqBeacons ?? st.beacons.length;
        stageEl.set(
          `${s.stageIdx + 1} z ${stagesCount}`,
          (s.stageIdx + (s.beaconsGot.size / Math.max(1, req)) * 0.7) / stagesCount,
          s.probe ? `Układ: ${st.name} (w locie)` : `Układ: ${st.name}`
        );
        const deg = Math.round((-s.angle * 180) / Math.PI);
        probeEl.set(s.probesLeft, `Kąt: ${deg}° · Ciąg: ${Math.round(s.power)}`);
        dataEl.set(
          `${s.beaconsGot.size} z ${req}`,
          s.beaconsGot.size / Math.max(1, req),
          s.beaconsGot.size >= req ? "Dok stacji badawczej otwarty" : "Zbierz pomiary, aby otworzyć dok"
        );
        ctx.progress(s.stageIdx / stagesCount);
      }

      function applyHint() {
        if (ctx.done || s.probe) return;
        const st = curStage();
        if (st.sol) {
          s.angle = st.sol.angle;
          s.power = st.sol.power;
          Sound.flag();
          ctx.toast("Ustawiono optymalny wektor asysty grawitacyjnej");
          updatePanel();
        }
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
          steps: 0,
          trail: [[st.start.x, st.start.y]],
        };
        s.acc = 0;
        s.usedPulseInStage = false;
        Sound.tap();
        updatePanel();
      }

      function firePulse() {
        if (ctx.done || !s.probe) return;
        s.usedPulseInStage = true;
        const speed = Math.hypot(s.probe.vx, s.probe.vy);
        if (speed > 1) {
          s.probe.vx += (s.probe.vx / speed) * 14;
          s.probe.vy += (s.probe.vy / speed) * 14;
        }
        Sound.place(4);
        ctx.toast("Włączono silnik manewrowy RCS");
      }

      function nextStage() {
        const st = curStage();
        if (s.beaconsGot.size >= st.beacons.length) {
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
          const nextSt = curStage();
          s.angle = nextSt.sol ? nextSt.sol.angle - 0.18 : -0.55;
          s.power = nextSt.sol ? Math.max(20, nextSt.sol.power - 6) : 40;
          Sound.line();
          ctx.toast(`Rozpoczęto badanie układu ${s.stageIdx + 1}`);
          updatePanel();
        }
      }

      function aimAt(x, y) {
        const st = curStage();
        const dx = x - st.start.x;
        const dy = y - st.start.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          s.angle = Math.atan2(dy, dx);
          s.power = Math.max(15, Math.min(70, Math.round(dist * 0.45)));
          updatePanel();
        }
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest?.("input, textarea, select")) return;
        if (e.key === "Enter") {
          if (e.target.closest?.("button, a")) return;
          e.preventDefault();
          launchProbe();
        } else if (e.key === " ") {
          if (e.target.closest?.("button, a")) return;
          e.preventDefault();
          if (s.probe) firePulse();
          else launchProbe();
        } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          e.preventDefault();
          s.angle -= e.shiftKey ? 0.008 : 0.025;
          updatePanel();
        } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
          e.preventDefault();
          s.angle += e.shiftKey ? 0.008 : 0.025;
          updatePanel();
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          s.power = Math.min(70, s.power + (e.shiftKey ? 0.5 : 1));
          updatePanel();
        } else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          s.power = Math.max(15, s.power - (e.shiftKey ? 0.5 : 1));
          updatePanel();
        }
      });

      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        const st = curStage();
        if (!s.probe) {
          s.dragging = true;
          s.downPos = [x, y];
          const dStart = Math.hypot(x - st.start.x, y - st.start.y);
          if (dStart <= 14) {
            s.downOnLauncher = true;
            s.dragMoved = false;
          } else {
            s.downOnLauncher = false;
            s.dragMoved = true;
            aimAt(x, y);
          }
        } else {
          firePulse();
        }
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.dragging || s.probe) return;
        const [x, y] = cv.at(e);
        if (s.downOnLauncher && Math.hypot(x - s.downPos[0], y - s.downPos[1]) > 5) {
          s.dragMoved = true;
        }
        if (!s.downOnLauncher || s.dragMoved) {
          aimAt(x, y);
        }
      });

      ctx.on(document, "pointerup", () => {
        if (s.dragging) {
          const clickLaunch = s.downOnLauncher && !s.dragMoved;
          s.dragging = false;
          s.downOnLauncher = false;
          if (clickLaunch) {
            launchProbe();
          }
        }
      });

      function stepProbePhysics() {
        if (!s.probe || ctx.done) return;
        const st = curStage();
        const p = s.probe;
        const [ax, ay] = calculateGravity(p.x, p.y, st.planets);
        p.vx += ax * STEP_DT;
        p.vy += ay * STEP_DT;
        p.x += p.vx * STEP_DT;
        p.y += p.vy * STEP_DT;
        p.steps++;

        p.trail.push([p.x, p.y]);
        if (p.trail.length > 90) p.trail.shift();

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

        // Sprawdzanie zbierania sygnałów z boi pomiarowych
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
            const req = st.reqBeacons ?? st.beacons.length;
            if (s.beaconsGot.size >= req) {
              ctx.toast("Zebrano komplet pomiarów, dok stacji otwarty");
            } else {
              ctx.toast(`Zebrano pomiar naukowy ${s.beaconsGot.size} z ${req}`);
            }
            updatePanel();
          }
        });

        // Sprawdzanie dokowania do stacji badawczej
        const req = st.reqBeacons ?? st.beacons.length;
        if (Math.hypot(p.x - st.station.x, p.y - st.station.y) < st.station.r) {
          if (s.beaconsGot.size >= req) {
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
          } else if (s.lockedToastCooldown <= 0) {
            s.lockedToastCooldown = 1.2;
            Sound.error();
            ctx.toast(`Osłona doku zamknięta, zbierz pomiary (${s.beaconsGot.size} z ${req})`);
          }
        }

        // Sprawdzanie zderzenia z planetą
        for (const pl of st.planets) {
          if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r) {
            s.probe = null;
            Sound.error();
            ctx.toast("Sonda rozbiła się o powierzchnię planety");
            if (s.probesLeft <= 0) {
              ctx.lose("Brak sond", "Wyczerpałeś wszystkie dostępne sondy badawcze.");
            }
            updatePanel();
            return;
          }
        }

        // Ucieczka poza przestrzeń lub przekroczenie czasu lotu
        if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30 || p.steps > MAX_STEPS + 60) {
          s.probe = null;
          Sound.error();
          ctx.toast("Sonda opuściła układ grawitacyjny");
          if (s.probesLeft <= 0) {
            ctx.lose("Brak sond", "Wyczerpałeś wszystkie dostępne sondy badawcze.");
          }
          updatePanel();
          return;
        }
      }

      updatePanel();

      cv.loop((dt, now) => {
        const st = curStage();
        if (s.lockedToastCooldown > 0) s.lockedToastCooldown -= dt;

        if (s.probe) {
          s.acc += dt * 60;
          while (s.acc >= 1 && s.probe && !ctx.done) {
            s.acc -= 1;
            stepProbePhysics();
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

        // Obliczenie predykcji trajektorii z wyrzutni
        let pred = null;
        if (!s.probe && s.probesLeft > 0) {
          const vx0 = Math.cos(s.angle) * s.power;
          const vy0 = Math.sin(s.angle) * s.power;
          pred = simulateTrajectory(st.start.x, st.start.y, vx0, vy0, st.planets, MAX_STEPS, STEP_DT, st, s.beaconsGot);

          const pts = pred.pts;
          g.strokeStyle = pred.hitStation
            ? "rgba(34, 197, 94, 0.78)"
            : pred.newlyHitBeacons.size > 0
              ? "rgba(56, 189, 248, 0.65)"
              : "rgba(99, 102, 241, 0.45)";
          g.lineWidth = pred.hitStation ? 1.8 : 1.3;
          g.setLineDash([3, 3]);
          g.beginPath();
          g.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
          g.stroke();
          g.setLineDash([]);

          // Strzałki kierunkowe wzdłuż trajektorii
          g.fillStyle = pred.hitStation ? "rgba(74, 222, 128, 0.85)" : "rgba(165, 180, 252, 0.65)";
          for (let i = 14; i < pts.length - 6; i += 20) {
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

          // Uchwyt wektora celowania
          const handleDist = s.power / 0.45;
          const hx = st.start.x + Math.cos(s.angle) * Math.min(75, handleDist * 0.45);
          const hy = st.start.y + Math.sin(s.angle) * Math.min(75, handleDist * 0.45);
          g.strokeStyle = "rgba(129, 140, 248, 0.4)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(st.start.x, st.start.y);
          g.lineTo(hx, hy);
          g.stroke();
          g.fillStyle = "#818cf8";
          g.beginPath();
          g.arc(hx, hy, 2.6, 0, Math.PI * 2);
          g.fill();
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
          const willHit = pred && pred.newlyHitBeacons.has(idx);
          const pulse = isGot ? 1 : 1 + 0.16 * Math.sin(now * 0.007 + idx);

          g.fillStyle = isGot
            ? "rgba(16, 185, 129, 0.28)"
            : willHit
              ? "rgba(56, 189, 248, 0.32)"
              : "rgba(245, 158, 11, 0.24)";
          g.strokeStyle = isGot ? "#10b981" : willHit ? "#38bdf8" : "#f59e0b";
          g.lineWidth = willHit ? 1.8 : 1.2;
          g.beginPath();
          g.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Rdzeń boi
          g.fillStyle = isGot ? "#10b981" : willHit ? "#38bdf8" : "#f59e0b";
          g.beginPath();
          g.arc(b.x, b.y, 3, 0, Math.PI * 2);
          g.fill();

          const labelY = b.y < 32 ? b.y + b.r + 7 : b.y - b.r - 5;
          cv.text(
            isGot ? "OK" : willHit ? `P${idx + 1} CEL` : `P${idx + 1}`,
            b.x,
            labelY,
            { size: 3.4, weight: 700, color: isGot ? "#10b981" : willHit ? "#38bdf8" : "#fbbf24" }
          );
        });

        // Planety i pola grawitacyjne
        for (const pl of st.planets) {
          const wave = (now * 0.003) % 1;
          g.strokeStyle = pl.singularity ? "rgba(168, 85, 247, 0.25)" : "rgba(56, 189, 248, 0.22)";
          g.lineWidth = 0.8;
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r + wave * 22, 0, Math.PI * 2);
          g.stroke();

          g.fillStyle = pl.singularity ? "rgba(168, 85, 247, 0.15)" : "rgba(56, 189, 248, 0.12)";
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r * 2.1, 0, Math.PI * 2);
          g.fill();

          g.fillStyle = pl.color;
          g.beginPath();
          g.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
          g.fill();

          if (pl.ring) {
            g.strokeStyle = "rgba(255, 255, 255, 0.4)";
            g.lineWidth = 2.2;
            g.beginPath();
            g.ellipse(pl.x, pl.y, pl.r * 1.7, pl.r * 0.55, -0.3, 0, Math.PI * 2);
            g.stroke();
          }

          if (pl.singularity) {
            g.fillStyle = "#000000";
            g.beginPath();
            g.arc(pl.x, pl.y, pl.r * 0.7, 0, Math.PI * 2);
            g.fill();
          }
        }

        // Stacja badawcza docelowa
        const stn = st.station;
        const req = st.reqBeacons ?? st.beacons.length;
        const dockOpen = s.beaconsGot.size >= req;
        const predHitsStation = pred && pred.hitStation;
        const predTouchesLocked = pred && pred.touchedLockedStation && !pred.hitStation;

        g.fillStyle = dockOpen || predHitsStation
          ? "rgba(34, 197, 94, 0.26)"
          : "rgba(245, 158, 11, 0.16)";
        g.strokeStyle = dockOpen || predHitsStation
          ? "#22c55e"
          : predTouchesLocked
            ? "#ef4444"
            : "#f59e0b";
        g.lineWidth = predHitsStation ? 2.2 : 1.5;
        if (!dockOpen && !predHitsStation) g.setLineDash([3, 2]);
        g.beginPath();
        g.arc(stn.x, stn.y, stn.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.setLineDash([]);

        // Moduły orbitalne stacji
        g.fillStyle = "#ffffff";
        g.fillRect(stn.x - 7, stn.y - 2.5, 14, 5);
        g.fillStyle = dockOpen || predHitsStation ? "#22c55e" : "#38bdf8";
        g.fillRect(stn.x - 12, stn.y - 6, 4, 12);
        g.fillRect(stn.x + 8, stn.y - 6, 4, 12);

        const stLabelY = stn.y < 42 ? stn.y + stn.r + 7 : stn.y - stn.r - 6;
        const stStatus = dockOpen
          ? "DOK OTWARTY"
          : predHitsStation
            ? "DOKOWANIE OK"
            : `ZBIERZ POMIARY (${s.beaconsGot.size}/${req})`;
        cv.text(
          stStatus,
          Math.min(W - 42, Math.max(42, stn.x)),
          stLabelY,
          { size: 3.5, weight: 700, color: dockOpen || predHitsStation ? "#4ade80" : "#fbbf24" }
        );

        // Wyrzutnia startowa
        const sp = st.start;
        g.fillStyle = "#334155";
        g.strokeStyle = "#94a3b8";
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Wskaźnik lufy wyrzutni
        g.strokeStyle = "#818cf8";
        g.lineWidth = 3;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(sp.x, sp.y);
        g.lineTo(sp.x + Math.cos(s.angle) * 14, sp.y + Math.sin(s.angle) * 14);
        g.stroke();

        const deg = Math.round((-s.angle * 180) / Math.PI);
        const launchTxtY = sp.y > H - 35 ? sp.y - 15 : sp.y + 16;
        cv.text(
          `${deg}° · ciąg ${Math.round(s.power)}`,
          Math.max(32, sp.x + 6),
          launchTxtY,
          { size: 3.5, weight: 600, color: "#c7d2fe" }
        );

        // Napis informacyjny u góry płótna
        cv.text(
          `Układ ${s.stageIdx + 1}/${stagesCount}: ${st.name}`,
          8,
          10,
          { size: 4.0, weight: 700, color: "#e2e8f0", align: "left" }
        );

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
