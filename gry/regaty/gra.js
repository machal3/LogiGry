// Regaty: zręcznościowa symulacja żeglarstwa sportowego.
// Halsowanie pod wiatr, trymowanie żagli, opływanie boi i rywalizacja z jachtami rywali.
{
  const RIVAL_SPEEDS = {
    easy: [0.78, 0.83],
    medium: [0.80, 0.85, 0.89],
    hard: [0.82, 0.86, 0.90, 0.94],
  };

  // Oblicza sprawność żagla w zależności od kąta jachtu względem wiatru
  // wiatr wieje w kierunku windAngle (np. windAngle = PI/2 to wiatr wiejący na południe)
  function calcSailEfficiency(boatAngle, windAngle) {
    // Kąt między wektorem łodzi a wektorem wiatru (0 = z wiatrem, PI = pod wiatr)
    const angleDiff = Math.abs(((boatAngle - windAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const diffFromHeadwind = Math.PI - angleDiff;

    // Kąt martwy: płynięcie pod wiatr (mniej niż 38 stopni / 0.66 rad od linii wiatru)
    if (diffFromHeadwind < 0.66) {
      return { eff: 0.05, zone: "martwy", diffFromHeadwind };
    }
    // Bajdewind (ostro na wiatr: 38 do 66 stopni)
    if (diffFromHeadwind < 1.15) {
      const k = (diffFromHeadwind - 0.66) / (1.15 - 0.66);
      return { eff: 0.65 + 0.3 * k, zone: "bajdewind", diffFromHeadwind };
    }
    // Półwiatr (66 do 115 stopni) - najszybszy kurs jachtu
    if (diffFromHeadwind < 2.0) {
      return { eff: 1.0, zone: "polwiatr", diffFromHeadwind };
    }
    // Baksztag (115 do 155 stopni)
    if (diffFromHeadwind < 2.7) {
      return { eff: 0.9, zone: "baksztag", diffFromHeadwind };
    }
    // Fordewind (z wiatrem: 155 do 180 stopni)
    return { eff: 0.75, zone: "fordewind", diffFromHeadwind };
  }

  function generateCourse(levelKey) {
    const W = 320, H = 220;
    const courses = {
      easy: [
        { x: 50, y: 170, type: "start" },
        { x: 80, y: 55, r: 18, name: "Boja 1 (nawietrzna)" },
        { x: 250, y: 65, r: 18, name: "Boja 2 (półwiatr)" },
        { x: 260, y: 170, r: 18, name: "Boja 3 (zawietrzna)" },
        { x: 150, y: 180, r: 20, type: "meta", name: "Linia mety" },
      ],
      medium: [
        { x: 45, y: 180, type: "start" },
        { x: 75, y: 50, r: 16, name: "Boja 1" },
        { x: 165, y: 105, r: 16, name: "Boja 2" },
        { x: 265, y: 50, r: 16, name: "Boja 3" },
        { x: 275, y: 175, r: 16, name: "Boja 4" },
        { x: 150, y: 190, r: 20, type: "meta", name: "Linia mety" },
      ],
      hard: [
        { x: 40, y: 185, type: "start" },
        { x: 65, y: 45, r: 15, name: "Boja 1" },
        { x: 135, y: 110, r: 15, name: "Boja 2" },
        { x: 195, y: 45, r: 15, name: "Boja 3" },
        { x: 280, y: 75, r: 15, name: "Boja 4" },
        { x: 265, y: 180, r: 15, name: "Boja 5" },
        { x: 150, y: 190, r: 20, type: "meta", name: "Linia mety" },
      ],
    };

    const rocks = {
      easy: [{ x: 160, y: 120, r: 13 }],
      medium: [
        { x: 120, y: 75, r: 11 },
        { x: 215, y: 140, r: 12 },
        { x: 190, y: 175, r: 10 },
      ],
      hard: [
        { x: 100, y: 80, r: 10 },
        { x: 160, y: 55, r: 11 },
        { x: 235, y: 115, r: 12 },
        { x: 150, y: 145, r: 10 },
        { x: 220, y: 175, r: 10 },
      ],
    };

    const whirlpools = {
      easy: [],
      medium: [{ x: 210, y: 85, r: 13 }],
      hard: [
        { x: 110, y: 140, r: 14 },
        { x: 245, y: 145, r: 14 },
      ],
    };

    return {
      W,
      H,
      buoys: courses[levelKey] || courses.easy,
      rocks: rocks[levelKey] || rocks.easy,
      whirlpools: whirlpools[levelKey] || whirlpools.easy,
    };
  }

  function updateBoatPhysics(boat, windAngle, windSpeed, dt) {
    const { eff, zone } = calcSailEfficiency(boat.a, windAngle);
    const targetSpeed = eff * windSpeed * boat.hullSpeed;

    // Przyspieszenie lub wyhamowanie
    if (boat.v < targetSpeed) boat.v += Math.min(targetSpeed - boat.v, 18 * dt);
    else boat.v -= Math.min(boat.v - targetSpeed, 24 * dt);

    // Dryf boczny (leeway)
    const drift = Math.sin(boat.a - windAngle) * 3.8 * dt;

    boat.x += Math.cos(boat.a) * boat.v * dt - Math.sin(boat.a) * drift;
    boat.y += Math.sin(boat.a) * boat.v * dt + Math.cos(boat.a) * drift;

    return { eff, zone, targetSpeed };
  }

  // Wspólna obsługa przeszkód wodnych (skał, wirów i granic akwenu) dla gracza oraz rywali
  function applyHazards(boat, rocks, whirlpools, dt, W = 320, H = 220) {
    let hitRock = false;
    let hitVortex = false;

    boat.x = Math.max(8, Math.min(W - 8, boat.x));
    boat.y = Math.max(8, Math.min(H - 8, boat.y));

    for (const rock of rocks) {
      const dx = boat.x - rock.x;
      const dy = boat.y - rock.y;
      const dist = Math.hypot(dx, dy);
      const minDist = rock.r + 4;
      if (dist < minDist) {
        hitRock = true;
        const nx = dist > 0.01 ? dx / dist : 1;
        const ny = dist > 0.01 ? dy / dist : 0;
        boat.x = rock.x + nx * (minDist + 0.5);
        boat.y = rock.y + ny * (minDist + 0.5);
        boat.v = Math.max(3, boat.v * 0.35);
        const awayAng = Math.atan2(ny, nx);
        const diff = ((awayAng - boat.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        boat.a += Math.sign(diff || 1) * 0.35;
      }
    }

    for (const vor of whirlpools) {
      const dV = Math.hypot(boat.x - vor.x, boat.y - vor.y);
      if (dV < vor.r + 4) {
        hitVortex = true;
        boat.a += 3.0 * dt;
        boat.v *= Math.pow(0.45, dt);
      }
    }

    return { hitRock, hitVortex };
  }

  // Sterowanie nawigacyjne jachtu (halsowanie pod wiatr i omijanie skał)
  function steerBoatAI(boat, target, windAngle, rocks, whirlpools, dt, turnRate = 1.9) {
    const tx = target.x, ty = target.y;
    const wantAngle = Math.atan2(ty - boat.y, tx - boat.x);
    const { zone } = calcSailEfficiency(wantAngle, windAngle);

    let targetCourse = wantAngle;
    if (zone === "martwy") {
      const windFrom = windAngle + Math.PI;
      const cross = Math.sin(wantAngle - windFrom);
      if (boat.tackSide == null || Math.abs(cross) > 0.34) {
        boat.tackSide = cross >= 0 ? 0.88 : -0.88;
      }
      if (boat.x < 26) boat.tackSide = 0.88;
      else if (boat.x > 294) boat.tackSide = -0.88;
      targetCourse = windFrom + boat.tackSide;
    } else {
      boat.tackSide = null;
    }

    // Omijanie pobliskich skał i wirów przed dziobem
    for (const obs of [...rocks, ...(whirlpools || [])]) {
      const dx = obs.x - boat.x;
      const dy = obs.y - boat.y;
      const d = Math.hypot(dx, dy);
      if (d < obs.r + 24) {
        const angToObs = Math.atan2(dy, dx);
        const rel = ((angToObs - targetCourse + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(rel) < 0.95) {
          const side = rel >= 0 ? 1 : -1;
          targetCourse = angToObs - side * 1.1;
        }
      }
    }

    const dAng = ((targetCourse - boat.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    boat.a += Math.sign(dAng) * Math.min(Math.abs(dAng), turnRate * dt);
  }

  if (typeof module !== "undefined") {
    module.exports = {
      calcSailEfficiency,
      generateCourse,
      updateBoatPhysics,
      applyHazards,
      steerBoatAI,
      RIVAL_SPEEDS,
    };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "regaty",
    cat: "zrecznosciowe",
    name: "Regaty",
    author: "Gemini 4 Argon",
    desc: "Żegluj po wzburzonym morzu, ustawiaj żagle pod wiatr, omijaj wiry oraz skały i opływaj boje przed rywalami.",
    color: "#0284c7",
    ink: "#ffffff",
    glyph: [
      "..#..",
      ".##..",
      "#####",
      ".....",
      ".###.",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, rivals: 2, windBase: 34, windVar: 0.12 },
      { key: "medium", name: "Średni", points: 25, rivals: 3, windBase: 38, windVar: 0.22 },
      { key: "hard", name: "Trudny", points: 50, rivals: 4, windBase: 42, windVar: 0.35 },
    ],
    rules: [
      "Steruj jachtem za pomocą klawiszy Lewo/Prawo (A/D), przycisków dotykowych lub wskazując kurs bezpośrednio na wodzie.",
      "Płynięcie prosto pod wiatr (czerwony wycinek kąta martwego) zatrzymuje jacht; halsuj zakosami w zielonych strefach wiatru.",
      "Opływaj kolejne boje regatowe w wyznaczonej kolejności (wskazuje je złoty znacznik) i dopłyń do mety na 1. miejscu.",
      "Omijaj skały oraz wiry wodne, które spowalniają zarówno Twój jacht, jak i łodzie rywali.",
    ],
    achievements: [
      { id: "pierwsza-boja", name: "Pierwsza boja", desc: "Opłyń pierwszą boję regatową.", points: 10 },
      { id: "mistrz-halsu", name: "Mistrz halsowania", desc: "Osiągnij ponad 85% prędkości w żegludze ostro na wiatr.", points: 25 },
      { id: "podium-regat", name: "Zwycięzca regat", desc: "Wygraj wyścig regatowy na pierwszym miejscu.", points: 25 },
      { id: "wilk-morski", name: "Wilk morski", desc: "Wygraj trudny poziom bez uderzenia w skałę i bez wpadnięcia w wir.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, rivals: rivalCount, windBase, windVar } = ctx.level;
      const { W, H, buoys, rocks, whirlpools } = generateCourse(key);
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const RIVAL_COLORS = ["#e11d48", "#f59e0b", "#10b981", "#8b5cf6"];
      const rivalSpeeds = RIVAL_SPEEDS[key] || RIVAL_SPEEDS.easy;

      const startPt = buoys[0];
      const s = {
        player: {
          x: startPt.x,
          y: startPt.y,
          a: -Math.PI / 2,
          v: 12,
          hullSpeed: 1.16,
          nextBuoy: 1,
          color: "#00f0ff",
          wake: [],
        },
        rivals: Array.from({ length: rivalCount }, (_, i) => ({
          id: i,
          name: `Jacht ${i + 1}`,
          x: startPt.x + (i + 1) * 14 - rivalCount * 7,
          y: startPt.y + 6,
          a: -Math.PI / 2,
          v: 10,
          hullSpeed: rivalSpeeds[i] ?? 0.85,
          nextBuoy: 1,
          tackSide: i % 2 === 0 ? 0.88 : -0.88,
          color: RIVAL_COLORS[i % RIVAL_COLORS.length],
          wake: [],
        })),
        pointer: { active: false, x: 0, y: 0 },
        windAngle: Math.PI / 2,
        windSpeed: windBase,
        hitRockEver: false,
        hitVortexEver: false,
        rockToastCooldown: 0,
        gotHalsAch: false,
        finishedPlaces: [],
        splashes: [],
      };

      const courseEl = statBlock(ctx, "Trasa regat", { meter: true });
      const speedEl = statBlock(ctx, "Prędkość i kurs", { meter: true });
      const windEl = statBlock(ctx, "Wiatr", { small: true });

      const keys = heldKeys(ctx);
      const touch = {};
      touchPad(ctx, touch, [
        ["l", "Zwrot w lewo", "i-left"],
        ["r", "Zwrot w prawo", "i-right"],
      ], "c2");

      // Sterowanie bezpośrednie kursorem lub palcem na płótnie
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        s.pointer.active = true;
        s.pointer.x = x;
        s.pointer.y = y;
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.pointer.active || ctx.done) return;
        const [x, y] = cv.at(e);
        s.pointer.x = x;
        s.pointer.y = y;
      });

      ctx.on(document, "pointerup", () => {
        s.pointer.active = false;
      });

      ctx.on(document, "pointercancel", () => {
        s.pointer.active = false;
      });

      cv.loop((dt, now) => {
        if (ctx.done) return;
        if (s.rockToastCooldown > 0) s.rockToastCooldown -= dt;

        // Dynamiczne wahania wiatru (flauta i szkwały)
        const windShift = Math.sin(now * 0.0006) * windVar;
        s.windAngle = Math.PI / 2 + windShift;
        s.windSpeed = windBase + Math.sin(now * 0.0012) * (windBase * 0.2);

        // Sterowanie graczem (klawisze, touchPad lub wskazanie na wodzie)
        const steerLeft = keys.arrowleft || keys.a || touch.l;
        const steerRight = keys.arrowright || keys.d || touch.r;
        const turnSpeed = 2.2 * Math.min(1.2, Math.max(0.45, s.player.v / 18));

        if (steerLeft) {
          s.player.a -= turnSpeed * dt;
        } else if (steerRight) {
          s.player.a += turnSpeed * dt;
        } else if (s.pointer.active) {
          const dx = s.pointer.x - s.player.x;
          const dy = s.pointer.y - s.player.y;
          if (Math.hypot(dx, dy) > 5) {
            const want = Math.atan2(dy, dx);
            const dAng = ((want - s.player.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            s.player.a += Math.sign(dAng) * Math.min(Math.abs(dAng), turnSpeed * dt);
          }
        }

        // Fizyka i przeszkody gracza
        const pPhys = updateBoatPhysics(s.player, s.windAngle, s.windSpeed, dt);
        if (!s.gotHalsAch && pPhys.zone === "bajdewind" && pPhys.eff >= 0.85) {
          s.gotHalsAch = true;
          ctx.achieve("mistrz-halsu");
        }

        const pHaz = applyHazards(s.player, rocks, whirlpools, dt, W, H);
        if (pHaz.hitRock) {
          s.hitRockEver = true;
          if (s.rockToastCooldown <= 0) {
            s.rockToastCooldown = 1.0;
            Sound.error();
            ctx.toast("Otarcie o skałę, utrata prędkości");
          }
        }
        if (pHaz.hitVortex) {
          s.hitVortexEver = true;
        }

        // Ślad torowy (kilwater) gracza
        if (Math.random() < 0.4) {
          s.player.wake.push({ x: s.player.x, y: s.player.y, life: 1.0 });
        }
        for (let i = s.player.wake.length - 1; i >= 0; i--) {
          s.player.wake[i].life -= dt * 0.7;
          if (s.player.wake[i].life <= 0) s.player.wake.splice(i, 1);
        }

        // Sprawdzanie boi gracza
        const curTarget = buoys[s.player.nextBuoy];
        if (curTarget) {
          const dBuoy = Math.hypot(s.player.x - curTarget.x, s.player.y - curTarget.y);
          if (dBuoy <= (curTarget.r || 20)) {
            if (s.player.nextBuoy === 1) ctx.achieve("pierwsza-boja");
            s.player.nextBuoy++;
            Sound.place(s.player.nextBuoy);
            ctx.toast(`Zaliczono: ${curTarget.name}`);
            if (s.player.nextBuoy >= buoys.length) {
              if (!s.finishedPlaces.includes("player")) {
                s.finishedPlaces.push("player");
                const place = s.finishedPlaces.length;
                if (place === 1) {
                  ctx.achieve("podium-regat");
                  if (key === "hard" && !s.hitRockEver && !s.hitVortexEver) {
                    ctx.achieve("wilk-morski");
                  }
                  ctx.win(`Dopłynąłeś do mety na 1. miejscu z czasem ${fmt(ctx.time)}.`);
                } else {
                  ctx.lose("Rywal był szybszy", `Dopłynąłeś do mety na ${place}. miejscu. Wygrywa tylko pierwszy jacht na mecie.`);
                }
                return;
              }
            }
          }
        }

        // SI Rywali (podlegają tym samym skałom i wirom wodnym)
        for (const riv of s.rivals) {
          const rivTarget = buoys[riv.nextBuoy];
          if (rivTarget) {
            steerBoatAI(riv, rivTarget, s.windAngle, rocks, whirlpools, dt, 1.8);
            updateBoatPhysics(riv, s.windAngle, s.windSpeed, dt);
            applyHazards(riv, rocks, whirlpools, dt, W, H);

            if (Math.hypot(riv.x - rivTarget.x, riv.y - rivTarget.y) < (rivTarget.r || 20)) {
              riv.nextBuoy++;
              if (riv.nextBuoy >= buoys.length && !s.finishedPlaces.includes(riv.id)) {
                s.finishedPlaces.push(riv.id);
              }
            }
          }
        }

        // --- RYSOWANIE SCENY MORSKIEJ ---
        g.fillStyle = "#0369a1";
        g.fillRect(0, 0, W, H);

        // Fale morskie wiatru
        g.strokeStyle = "rgba(255, 255, 255, 0.12)";
        g.lineWidth = 1.0;
        const waveStep = 32;
        for (let wy = 0; wy < H + waveStep; wy += waveStep) {
          const shift = Math.sin(wy * 0.05 + now * 0.003) * 6;
          g.beginPath();
          g.moveTo(0, wy + shift);
          for (let wx = 0; wx < W; wx += 24) {
            g.quadraticCurveTo(
              wx + 12,
              wy + shift - 4 + Math.sin(wx * 0.1 + now * 0.004) * 3,
              wx + 24,
              wy + shift
            );
          }
          g.stroke();
        }

        // Wiry morskie
        for (const vor of whirlpools) {
          g.save();
          g.translate(vor.x, vor.y);
          g.rotate(now * 0.004);
          g.strokeStyle = "rgba(14, 165, 233, 0.45)";
          g.lineWidth = 1.5;
          for (let r = 4; r < vor.r; r += 3) {
            g.beginPath();
            g.arc(0, 0, r, 0, Math.PI * 1.5);
            g.stroke();
          }
          g.restore();
        }

        // Skały / wysepki
        for (const rock of rocks) {
          g.fillStyle = "#334155";
          g.strokeStyle = "#94a3b8";
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          g.fillStyle = "#475569";
          g.beginPath();
          g.arc(rock.x - rock.r * 0.25, rock.y - rock.r * 0.25, rock.r * 0.55, 0, Math.PI * 2);
          g.fill();
        }

        // Trasa i boje regatowe
        for (let i = 1; i < buoys.length; i++) {
          const b = buoys[i];
          const isTarget = i === s.player.nextBuoy;
          const isPassed = i < s.player.nextBuoy;

          if (b.type === "meta") {
            g.save();
            g.strokeStyle = isTarget ? "#facc15" : "rgba(255,255,255,0.45)";
            g.lineWidth = 2.5;
            g.setLineDash([4, 4]);
            g.beginPath();
            g.moveTo(b.x - 25, b.y);
            g.lineTo(b.x + 25, b.y);
            g.stroke();
            g.setLineDash([]);
            g.restore();

            cv.text(
              isTarget ? "META (CEL)" : "META",
              b.x,
              b.y + 11,
              { size: 3.8, weight: 700, color: isTarget ? "#facc15" : "#e2e8f0" }
            );
          } else {
            const pulse = isTarget ? 1 + 0.15 * Math.sin(now * 0.008) : 1;
            g.fillStyle = isPassed ? "#10b981" : isTarget ? "#f59e0b" : "#ef4444";
            g.strokeStyle = "#ffffff";
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(b.x, b.y, 4.5 * pulse, 0, Math.PI * 2);
            g.fill();
            g.stroke();

            // Proporczyk kierunku wiatru na boi
            g.save();
            g.translate(b.x, b.y);
            g.rotate(s.windAngle);
            g.fillStyle = isTarget ? "#fbbf24" : "#ffffff";
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(8 + Math.sin(now * 0.01 + b.x) * 1.5, 2.5);
            g.lineTo(8 + Math.sin(now * 0.01 + b.x) * 1.5, -2.5);
            g.closePath();
            g.fill();
            g.restore();

            if (isTarget) {
              g.strokeStyle = "rgba(250, 204, 21, 0.5)";
              g.lineWidth = 1.1;
              g.setLineDash([3, 3]);
              g.beginPath();
              g.arc(b.x, b.y, b.r || 18, 0, Math.PI * 2);
              g.stroke();
              g.setLineDash([]);
            }

            const bTxt = isTarget ? `CEL ${i}` : isPassed ? `OK ${i}` : `B${i}`;
            const bTxtY = b.y < 28 ? b.y + 12 : b.y - 10;
            cv.text(
              bTxt,
              b.x,
              bTxtY,
              { size: 3.6, weight: 700, color: isTarget ? "#facc15" : isPassed ? "#86efac" : "#e2e8f0" }
            );
          }
        }

        // Znacznik sterowania dotykiem / myszką na wodzie
        if (s.pointer.active) {
          g.strokeStyle = "rgba(56, 189, 248, 0.45)";
          g.lineWidth = 1;
          g.setLineDash([2, 3]);
          g.beginPath();
          g.moveTo(s.player.x, s.player.y);
          g.lineTo(s.pointer.x, s.pointer.y);
          g.stroke();
          g.setLineDash([]);

          g.strokeStyle = "#38bdf8";
          g.lineWidth = 1.4;
          g.beginPath();
          g.arc(s.pointer.x, s.pointer.y, 5, 0, Math.PI * 2);
          g.stroke();
        }

        // Subtelny wskaźnik stref wiatru (kąt martwy i optymalny ciąg) oraz kierunku do boi wokół jachtu gracza
        {
          const px = s.player.x;
          const py = s.player.y;
          const upwind = s.windAngle + Math.PI;
          const ringR = 17;

          // Czerwony wycinek kąta martwego (pod wiatr)
          g.fillStyle = "rgba(239, 68, 68, 0.16)";
          g.strokeStyle = "rgba(248, 113, 113, 0.7)";
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(px, py);
          g.arc(px, py, ringR, upwind - 0.64, upwind + 0.64);
          g.closePath();
          g.fill();
          g.stroke();

          // Zielone łuki najlepszego ciągu żagli (bajdewind / półwiatr / baksztag) na obu halsach
          g.strokeStyle = "rgba(74, 222, 128, 0.65)";
          g.lineWidth = 2.0;
          g.beginPath();
          g.arc(px, py, ringR, upwind + 0.70, upwind + 2.35);
          g.stroke();

          g.beginPath();
          g.arc(px, py, ringR, upwind - 2.35, upwind - 0.70);
          g.stroke();

          // Złota strzałka kierunkowa do następnej boi
          if (curTarget) {
            const toTargetAng = Math.atan2(curTarget.y - py, curTarget.x - px);
            g.save();
            g.translate(px + Math.cos(toTargetAng) * 22, py + Math.sin(toTargetAng) * 22);
            g.rotate(toTargetAng);
            g.fillStyle = "#facc15";
            g.strokeStyle = "#0f172a";
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(4.5, 0);
            g.lineTo(-2.5, -3.2);
            g.lineTo(-1.0, 0);
            g.lineTo(-2.5, 3.2);
            g.closePath();
            g.fill();
            g.stroke();
            g.restore();
          }
        }

        // Cząsteczki piany morskiej i rozbryzgu
        for (let i = s.splashes.length - 1; i >= 0; i--) {
          const sp = s.splashes[i];
          sp.x += sp.vx * dt;
          sp.y += sp.vy * dt;
          sp.life -= dt * 2.2;
          if (sp.life <= 0) {
            s.splashes.splice(i, 1);
            continue;
          }
          g.fillStyle = `rgba(255, 255, 255, ${Math.max(0, sp.life * 0.5)})`;
          g.beginPath();
          g.arc(sp.x, sp.y, 1.4, 0, Math.PI * 2);
          g.fill();
        }

        // Rysowanie jachtów
        function drawBoat(b, isPl = false) {
          if (b.v > 14 && Math.random() < 0.35) {
            s.splashes.push({
              x: b.x + Math.cos(b.a) * 10,
              y: b.y + Math.sin(b.a) * 10,
              vx: (Math.random() - 0.5) * 8 + Math.cos(s.windAngle) * 6,
              vy: (Math.random() - 0.5) * 8 + Math.sin(s.windAngle) * 6,
              life: 0.5,
            });
          }

          g.save();
          g.translate(b.x, b.y);
          g.rotate(b.a);

          // Kilwater (ślad za rufą)
          g.strokeStyle = "rgba(255, 255, 255, 0.28)";
          g.lineWidth = 1.2;
          g.beginPath();
          g.moveTo(-10, -2.5);
          g.lineTo(-18, -6);
          g.moveTo(-10, 2.5);
          g.lineTo(-18, 6);
          g.stroke();

          // Kadłub jachtu
          g.fillStyle = isPl ? "#ffffff" : b.color;
          g.strokeStyle = isPl ? "#00f0ff" : "#1e293b";
          g.lineWidth = isPl ? 1.8 : 1.2;
          g.beginPath();
          g.moveTo(11, 0);
          g.quadraticCurveTo(0, 4.8, -9, 3.8);
          g.lineTo(-9, -3.8);
          g.quadraticCurveTo(0, -4.8, 11, 0);
          g.closePath();
          g.fill();
          g.stroke();

          // Żagiel
          const relWind = (s.windAngle - b.a + Math.PI * 4) % (Math.PI * 2);
          const isDeadZone = isPl && pPhys.zone === "martwy";
          const luff = isDeadZone ? Math.sin(now * 0.05) * 0.25 : 0;
          const sailAngle = Math.sin(relWind) * 0.65 + luff;

          g.strokeStyle = "#0f172a";
          g.lineWidth = 2.0;
          g.beginPath();
          g.moveTo(3, 0);
          g.lineTo(3 - Math.cos(sailAngle) * 11, Math.sin(sailAngle) * 11);
          g.stroke();

          g.fillStyle = isPl ? "rgba(255, 255, 255, 0.95)" : "rgba(241, 245, 249, 0.85)";
          g.beginPath();
          g.moveTo(3, 0);
          g.lineTo(3 - Math.cos(sailAngle) * 11, Math.sin(sailAngle) * 11);
          g.lineTo(-1, 0);
          g.closePath();
          g.fill();

          g.restore();
        }

        for (const riv of s.rivals) drawBoat(riv, false);
        drawBoat(s.player, true);

        // --- HUD NA PŁÓTNIE ---
        // Róża wiatrów w lewym górnym rogu
        g.save();
        g.translate(30, 22);
        g.fillStyle = "rgba(15, 23, 42, 0.78)";
        g.strokeStyle = "#38bdf8";
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, 14, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        g.rotate(s.windAngle);
        g.fillStyle = "#38bdf8";
        g.beginPath();
        g.moveTo(10, 0);
        g.lineTo(1, 4.5);
        g.lineTo(4, 0);
        g.lineTo(1, -4.5);
        g.closePath();
        g.fill();
        g.restore();

        const windKnots = Math.round(s.windSpeed * 0.7);
        cv.text(`Wiatr: ${windKnots} w.`, 30, 42, { size: 3.6, weight: 700, color: "#e0f2fe" });

        // Wyznaczenie aktualnej pozycji w stawce
        const zoneNames = {
          martwy: "Kąt martwy (łopot żagli)",
          bajdewind: "Bajdewind (ostro na wiatr)",
          polwiatr: "Półwiatr (pełna prędkość)",
          baksztag: "Baksztag (szybki kurs)",
          fordewind: "Fordewind (z wiatrem)",
        };
        const pZone = pPhys.zone;
        const curTargetObj = buoys[s.player.nextBuoy] || buoys[buoys.length - 1];

        const allBoats = [
          { who: "Ty", buoy: s.player.nextBuoy, dist: Math.hypot(s.player.x - curTargetObj.x, s.player.y - curTargetObj.y) },
          ...s.rivals.map((r) => ({
            who: r.name,
            buoy: r.nextBuoy,
            dist: Math.hypot(r.x - curTargetObj.x, r.y - curTargetObj.y),
          })),
        ].sort((a, b) => b.buoy - a.buoy || a.dist - b.dist);

        const myPlace = allBoats.findIndex((b) => b.who === "Ty") + 1;

        cv.text(
          `Miejsce: ${myPlace}/${allBoats.length} · ${Math.round(s.player.v * 1.8)} w.`,
          W - 8,
          12,
          { size: 3.8, weight: 700, color: "#f8fafc", align: "right" }
        );

        courseEl.set(
          `Boja ${Math.min(s.player.nextBuoy, buoys.length - 1)} z ${buoys.length - 1}`,
          (s.player.nextBuoy - 1) / (buoys.length - 1),
          `Pozycja: ${myPlace}. miejsce z ${allBoats.length}`
        );

        speedEl.set(
          `${Math.round(s.player.v * 1.8)} węzłów`,
          s.player.v / 45,
          zoneNames[pZone] || pZone
        );

        windEl.set(`${windKnots} węzłów`, null, "Trzymaj kurs w zielonym łuku wiatru");

        ctx.progress((s.player.nextBuoy - 1) / (buoys.length - 1));
      });
    },
  });
}
