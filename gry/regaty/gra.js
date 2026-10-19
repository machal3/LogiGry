// Regaty: zręcznościowa symulacja żeglarstwa sportowego.
// Halsowanie pod wiatr, trymowanie żagli, opływanie boi i rywalizacja z jachtami rywali.
{
  // Oblicza sprawność żagla w zależności od kąta jachtu względem wiatru
  // wiatr wieje w kierunku windAngle (np. windAngle = PI/2 to wiatr wiejący na południe)
  function calcSailEfficiency(boatAngle, windAngle) {
    // Kąt między wektorem łodzi a wektorem wiatru (0 = z wiatrem, PI = pod wiatr)
    const angleDiff = Math.abs((boatAngle - windAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI);
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
        { x: 150, y: 180, type: "meta", name: "Linia mety" },
      ],
      medium: [
        { x: 45, y: 180, type: "start" },
        { x: 75, y: 50, r: 16, name: "Boja 1" },
        { x: 165, y: 105, r: 16, name: "Boja 2" },
        { x: 265, y: 50, r: 16, name: "Boja 3" },
        { x: 275, y: 175, r: 16, name: "Boja 4" },
        { x: 150, y: 190, type: "meta", name: "Linia mety" },
      ],
      hard: [
        { x: 40, y: 185, type: "start" },
        { x: 65, y: 45, r: 15, name: "Boja 1" },
        { x: 135, y: 110, r: 15, name: "Boja 2" },
        { x: 195, y: 45, r: 15, name: "Boja 3" },
        { x: 280, y: 75, r: 15, name: "Boja 4" },
        { x: 265, y: 180, r: 15, name: "Boja 5" },
        { x: 150, y: 190, type: "meta", name: "Linia mety" },
      ],
    };

    const rocks = {
      easy: [{ x: 160, y: 120, r: 14 }],
      medium: [
        { x: 120, y: 75, r: 12 },
        { x: 215, y: 140, r: 13 },
        { x: 190, y: 175, r: 10 },
      ],
      hard: [
        { x: 100, y: 80, r: 11 },
        { x: 160, y: 55, r: 12 },
        { x: 235, y: 115, r: 13 },
        { x: 150, y: 145, r: 11 },
        { x: 220, y: 175, r: 10 },
      ],
    };

    const whirlpools = {
      easy: [],
      medium: [{ x: 210, y: 85, r: 14 }],
      hard: [
        { x: 110, y: 140, r: 15 },
        { x: 245, y: 135, r: 15 },
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

  function updateBoatPhysics(boat, windAngle, windSpeed, dt, isPlayer = false) {
    const { eff, zone } = calcSailEfficiency(boat.a, windAngle);
    const targetSpeed = eff * windSpeed * boat.hullSpeed;

    // Przyspieszenie lub wyhamowanie
    if (boat.v < targetSpeed) boat.v += Math.min(targetSpeed - boat.v, 18 * dt);
    else boat.v -= Math.min(boat.v - targetSpeed, 24 * dt);

    // Dryf boczny (leeway)
    const drift = Math.sin(boat.a - windAngle) * 4.5 * dt;

    boat.x += Math.cos(boat.a) * boat.v * dt - Math.sin(boat.a) * drift;
    boat.y += Math.sin(boat.a) * boat.v * dt + Math.cos(boat.a) * drift;

    return { eff, zone, targetSpeed };
  }

  if (typeof module !== "undefined") {
    module.exports = { calcSailEfficiency, generateCourse, updateBoatPhysics };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "regaty",
    cat: "zrecznosciowe",
    name: "Regaty",
    author: "Gemini 4",
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
      "Steruj jachtem żaglowym za pomocą strzałek Lewo/Prawo lub A/D (oraz dotykowego pada na telefonie).",
      "Płynięcie prosto pod wiatr (kąt martwy) zatrzymuje jacht; halsuj zakosami (kurs bajdewind), aby piąć się w górę trasy.",
      "Opływaj kolejne boje regatowe w wyznaczonej kolejności (wskazuje je złoty kompas) i osiągnij linię mety przed rywalami.",
      "Uważaj na zdradzieckie skały wyhamowujące kadłub oraz obracające jacht wiry morskie.",
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

      const startPt = buoys[0];
      const s = {
        player: {
          x: startPt.x,
          y: startPt.y,
          a: -Math.PI / 2, // skierowany na północ (w górę ekranu)
          v: 12,
          hullSpeed: 1.15,
          nextBuoy: 1,
          color: "#00f0ff",
          wake: [],
        },
        rivals: Array.from({ length: rivalCount }, (_, i) => ({
          id: i,
          name: `Jacht ${i + 1}`,
          x: startPt.x + (i + 1) * 14 - (rivalCount * 7),
          y: startPt.y + 6,
          a: -Math.PI / 2,
          v: 10,
          hullSpeed: 0.98 + i * 0.04,
          nextBuoy: 1,
          color: RIVAL_COLORS[i % RIVAL_COLORS.length],
          wake: [],
        })),
        windAngle: -Math.PI / 2, // wieje z północy na południe
        windSpeed: windBase,
        hitRockEver: false,
        hitVortexEver: false,
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

      cv.loop((dt, now) => {
        if (ctx.done) return;

        // Dynamiczne wahania wiatru (flauta i szkwały)
        const windShift = Math.sin(now * 0.0006) * windVar;
        s.windAngle = Math.PI / 2 + windShift;
        s.windSpeed = windBase + Math.sin(now * 0.0012) * (windBase * 0.2);

        // Sterowanie graczem
        const steerLeft = keys.arrowleft || keys.a || touch.l;
        const steerRight = keys.arrowright || keys.d || touch.r;
        const turnSpeed = 2.1 * Math.min(1.2, Math.max(0.4, s.player.v / 18));
        if (steerLeft) s.player.a -= turnSpeed * dt;
        if (steerRight) s.player.a += turnSpeed * dt;

        // Fizyka gracza
        const pPhys = updateBoatPhysics(s.player, s.windAngle, s.windSpeed, dt, true);
        if (pPhys.zone === "bajdewind" && pPhys.eff >= 0.85) {
          ctx.achieve("mistrz-halsu");
        }

        // Ślad torowy (kilwater) gracza
        if (Math.random() < 0.4) {
          s.player.wake.push({ x: s.player.x, y: s.player.y, life: 1.0 });
        }
        for (let i = s.player.wake.length - 1; i >= 0; i--) {
          s.player.wake[i].life -= dt * 0.7;
          if (s.player.wake[i].life <= 0) s.player.wake.splice(i, 1);
        }

        // Granice akwenu
        s.player.x = Math.max(8, Math.min(W - 8, s.player.x));
        s.player.y = Math.max(8, Math.min(H - 8, s.player.y));

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
              // Gracz na mecie!
              if (!s.finishedPlaces.includes("player")) {
                s.finishedPlaces.push("player");
                const place = s.finishedPlaces.length;
                if (place === 1) {
                  ctx.achieve("podium-regat");
                  if (key === "hard" && !s.hitRockEver && !s.hitVortexEver) {
                    ctx.achieve("wilk-morski");
                  }
                  ctx.win(`Zwycięstwo! Dopłynąłeś do mety na 1. miejscu z czasem ${fmt(ctx.time)}.`);
                } else {
                  ctx.win(`Dopłynąłeś do mety na ${place}. miejscu.`);
                }
                return;
              }
            }
          }
        }

        // Kolizje ze skałami (gracz)
        for (const rock of rocks) {
          if (Math.hypot(s.player.x - rock.x, s.player.y - rock.y) < rock.r + 3.5) {
            s.hitRockEver = true;
            s.player.v = Math.max(2, s.player.v * 0.2);
            Sound.error();
            ctx.toast("Uderzenie w skałę! Utrata prędkości.");
          }
        }

        // Wiry morskie (gracz)
        for (const vor of whirlpools) {
          const dV = Math.hypot(s.player.x - vor.x, s.player.y - vor.y);
          if (dV < vor.r + 4) {
            s.hitVortexEver = true;
            s.player.a += 3.5 * dt; // obraca łódź w wirze
            s.player.v *= 0.85;
          }
        }

        // SI Rywali
        for (const riv of s.rivals) {
          const rivTarget = buoys[riv.nextBuoy];
          if (rivTarget) {
            const tx = rivTarget.x, ty = rivTarget.y;
            const wantAngle = Math.atan2(ty - riv.y, tx - riv.x);

            // Sprawdź czy kąt do celu nie jest w kącie martwym
            const { zone: rZone } = calcSailEfficiency(wantAngle, s.windAngle);
            let targetCourse = wantAngle;
            if (rZone === "martwy") {
              // Halsowanie pod kątem 48 stopni do wiatru
              const windFrom = (s.windAngle + Math.PI) % (Math.PI * 2);
              const tackSide = Math.sin(riv.a - windFrom) > 0 ? 0.85 : -0.85;
              targetCourse = windFrom + tackSide;
            }

            // Płynny skręt rywala
            let dAng = (targetCourse - riv.a + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            riv.a += Math.sign(dAng) * Math.min(Math.abs(dAng), 1.8 * dt);

            updateBoatPhysics(riv, s.windAngle, s.windSpeed, dt, false);

            if (Math.hypot(riv.x - tx, riv.y - ty) < (rivTarget.r || 20)) {
              riv.nextBuoy++;
              if (riv.nextBuoy >= buoys.length && !s.finishedPlaces.includes(riv.id)) {
                s.finishedPlaces.push(riv.id);
              }
            }
          }
        }

        // --- RYSOWANIE SCENY MORSKIEJ ---
        // Morze z animacją fal
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
          g.strokeStyle = "rgba(14, 165, 233, 0.4)";
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
          g.strokeStyle = "#64748b";
          g.lineWidth = 1.5;
          g.beginPath();
          g.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          // Grzbiety skały
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
            // Linia mety (szachownica)
            g.save();
            g.strokeStyle = isTarget ? "#facc15" : "rgba(255,255,255,0.4)";
            g.lineWidth = 2.5;
            g.setLineDash([4, 4]);
            g.beginPath();
            g.moveTo(b.x - 25, b.y);
            g.lineTo(b.x + 25, b.y);
            g.stroke();
            g.setLineDash([]);
            g.restore();
          } else {
            // Boja regatowa
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

            // Krąg zasięgu zaliczenia
            if (isTarget) {
              g.strokeStyle = "rgba(245, 158, 11, 0.4)";
              g.lineWidth = 1;
              g.setLineDash([3, 3]);
              g.beginPath();
              g.arc(b.x, b.y, b.r || 18, 0, Math.PI * 2);
              g.stroke();
              g.setLineDash([]);
            }
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
          // Piana dziobowa przy prędkości
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
          g.moveTo(11, 0); // dziób
          g.quadraticCurveTo(0, 4.8, -9, 3.8); // bakburta
          g.lineTo(-9, -3.8); // rufa
          g.quadraticCurveTo(0, -4.8, 11, 0); // sterburta
          g.closePath();
          g.fill();
          g.stroke();

          // Żagiel (obraca się w zależności od kierunku wiatru; łopot w kącie martwym)
          const relWind = (s.windAngle - b.a + Math.PI * 4) % (Math.PI * 2);
          const isDeadZone = isPl && pPhys.zone === "martwy";
          const luff = isDeadZone ? Math.sin(now * 0.05) * 0.25 : 0;
          const sailAngle = Math.sin(relWind) * 0.65 + luff;

          g.strokeStyle = "#0f172a";
          g.lineWidth = 2.0;
          g.beginPath();
          g.moveTo(3, 0); // maszt
          g.lineTo(3 - Math.cos(sailAngle) * 11, Math.sin(sailAngle) * 11); // bom
          g.stroke();

          // Płótno grota
          g.fillStyle = isPl ? "rgba(255, 255, 255, 0.95)" : "rgba(241, 245, 249, 0.85)";
          g.beginPath();
          g.moveTo(3, 0);
          g.lineTo(3 - Math.cos(sailAngle) * 11, Math.sin(sailAngle) * 11);
          g.lineTo(-1, 0);
          g.closePath();
          g.fill();

          g.restore();
        }

        // Rysuj rywali, a na końcu gracza
        for (const riv of s.rivals) drawBoat(riv, false);
        drawBoat(s.player, true);

        // --- HUD / PANELE ---
        // Wskaźnik wiatru (róża wiatrów w rogu ekranu)
        g.save();
        g.translate(26, 26);
        g.fillStyle = "rgba(15, 23, 42, 0.75)";
        g.strokeStyle = "#38bdf8";
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, 0, 16, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // Strzałka kierunku wiatru
        g.rotate(s.windAngle);
        g.fillStyle = "#38bdf8";
        g.beginPath();
        g.moveTo(11, 0);
        g.lineTo(2, 5);
        g.lineTo(5, 0);
        g.lineTo(2, -5);
        g.closePath();
        g.fill();
        g.restore();

        // Wskaźnik kąta martwego / strefy żeglugi
        const zoneNames = {
          martwy: "KĄT MARTWY (łopot żagli)",
          bajdewind: "BAJDEWIND (ostro na wiatr)",
          polwiatr: "PÓŁWIATR (maksymalna prędkość)",
          baksztag: "BAKSZTAG (szybki kurs)",
          fordewind: "FORDEWIND (z wiatrem)",
        };
        const pZone = pPhys.zone;
        const curTargetObj = buoys[s.player.nextBuoy] || buoys[buoys.length - 1];

        // Wyznaczenie aktualnej pozycji w stawce
        const allBoats = [
          { who: "Ty", buoy: s.player.nextBuoy, dist: Math.hypot(s.player.x - curTargetObj.x, s.player.y - curTargetObj.y) },
          ...s.rivals.map((r) => ({
            who: r.name,
            buoy: r.nextBuoy,
            dist: Math.hypot(r.x - curTargetObj.x, r.y - curTargetObj.y),
          })),
        ].sort((a, b) => b.buoy - a.buoy || a.dist - b.dist);

        const myPlace = allBoats.findIndex((b) => b.who === "Ty") + 1;

        courseEl.set(
          `Boja ${Math.min(s.player.nextBuoy, buoys.length - 1)} / ${buoys.length - 1}`,
          s.player.nextBuoy / (buoys.length - 1),
          `Pozycja: ${myPlace}. miejsce z ${allBoats.length}`
        );

        speedEl.set(
          `${Math.round(s.player.v * 1.8)} węzłów`,
          s.player.v / 45,
          zoneNames[pZone] || pZone
        );

        windEl.set(`Wiatr: ${Math.round(s.windSpeed * 0.7)} w.`, null, "Halsuj pod kątem do wiatru");

        ctx.progress(s.player.nextBuoy / (buoys.length - 1));
      });
    },
  });
}
