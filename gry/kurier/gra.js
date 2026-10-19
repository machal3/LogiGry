// Kurier: trójwymiarowa gra akcji z perspektywą 3D.
// Dostarczaj paczki czterośmigłowym dronem nad wieżowcami, omijaj budynki i zarządzaj energią baterii.
{
  function generateCity(levelKey) {
    const gridN = levelKey === "easy" ? 4 : levelKey === "medium" ? 5 : 6;
    const spacing = 46;
    const buildings = [];
    const offset = ((gridN - 1) * spacing) / 2;

    for (let r = 0; r < gridN; r++) {
      for (let c = 0; c < gridN; c++) {
        const x = c * spacing - offset;
        const z = r * spacing - offset;
        // Środek miasta to stacja bazowa / energetyczna
        const isCenter = r === Math.floor(gridN / 2) && c === Math.floor(gridN / 2);
        const h = isCenter
          ? 24
          : 14 + ((r * 17 + c * 31) % (levelKey === "hard" ? 46 : levelKey === "medium" ? 36 : 28));
        const w = 13;
        buildings.push({
          id: r * gridN + c,
          r,
          c,
          x,
          z,
          w,
          h,
          isStation: isCenter || (r === 0 && c === gridN - 1),
          color: isCenter ? "#00b4d8" : `hsl(${210 + ((r * 13 + c * 7) % 35)}, 32%, ${18 + ((r + c) % 4) * 3}%)`,
        });
      }
    }
    return { buildings, worldRadius: offset + 35 };
  }

  // Projekcja punktu 3D (wx, wy, wz) do ekranu 2D przy kamerze (cx, cy, cz, yaw, pitch)
  function project3D(wx, wy, wz, cam, W, H, fov = 175) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const dz = wz - cam.z;

    // Obrót wokół osi Y (yaw)
    const cosY = Math.cos(-cam.yaw), sinY = Math.sin(-cam.yaw);
    const rx = dx * cosY - dz * sinY;
    const rz1 = dx * sinY + dz * cosY;

    // Obrót wokół osi X (pitch)
    const cosP = Math.cos(-cam.pitch), sinP = Math.sin(-cam.pitch);
    const ry = dy * cosP - rz1 * sinP;
    const rz = dy * sinP + rz1 * cosP;

    if (rz < 2.5) return null;
    const scale = fov / rz;
    return [W / 2 + rx * scale, H / 2 - ry * scale, rz, scale];
  }

  // Sprawdza kolizję drona z budynkami i lądowanie na dachu
  function checkDroneBuilding(drone, buildings) {
    for (const b of buildings) {
      if (Math.abs(drone.x - b.x) < b.w + 2.2 && Math.abs(drone.z - b.z) < b.w + 2.2) {
        if (drone.y >= b.h - 1.8 && drone.y <= b.h + 3.2 && drone.vy <= 4) {
          // Bezpieczne lądowanie na dachu budynku
          return { state: "roof", building: b };
        }
        if (drone.y < b.h - 1.2) {
          // Uderzenie w bok wieżowca
          return { state: "hit", building: b };
        }
      }
    }
    return { state: "air", building: null };
  }

  if (typeof module !== "undefined") {
    module.exports = { generateCity, project3D, checkDroneBuilding };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "kurier",
    cat: "akcja",
    big: true,
    name: "Kurier",
    author: "Gemini 4",
    desc: "Dostarczaj paczki dronem nad trójwymiarowym miastem, omijaj wieżowce i zarządzaj energią baterii.",
    color: "#ff6d00",
    ink: "#1f0b00",
    glyph: ["#...#", ".###.", "#####", ".###.", "#...#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, goal: 4, wind: 2.5, drain: 1.8 },
      { key: "medium", name: "Średni", points: 50, goal: 6, wind: 5.5, drain: 2.4 },
      { key: "hard", name: "Trudny", points: 100, goal: 8, wind: 8.5, drain: 3.0 },
    ],
    rules: [
      "Steruj dronem w 3D: strzałki lub WASD odpowiadają za lot do przodu, do tyłu i obrót, a Spacja / E (w górę) oraz Q / Shift (w dół) za wysokość.",
      "Leć do zielonego znacznika odbioru na dachu wieżowca, osiądź łagodnie, aby zabrać paczkę, a potem dostarcz ją na złote lądowisko docelowe.",
      "Kontroluj poziom baterii: lądowanie na błękitnych stacjach energetycznych błyskawicznie doładowuje akumulator.",
      "Uważaj na boczne porywy wiatru między wieżowcami; rozbicie kadłuba lub wyczerpanie baterii w locie kończy zmianę.",
    ],
    achievements: [
      { id: "pierwsza-paczka", name: "Pierwszy zrzut", desc: "Dostarcz pierwszą przesyłkę na dach docelowy.", points: 10 },
      { id: "ekspres", name: "Kurier ekspresowy", desc: "Dostarcz przesyłkę w mniej niż 18 sekund od jej odebrania.", points: 25 },
      { id: "bez-drasniecia", name: "Precyzyjny pilot", desc: "Ukończ zmianę bez ani jednego uszkodzenia kadłuba.", points: 25 },
      { id: "as-przestworzy", name: "As przestworzy", desc: "Wygraj trudny poziom bez uszkodzeń kadłuba.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, goal, wind, drain } = ctx.level;
      const W = 260, H = 185;
      const cv = canvasGame(board, ctx, W, H, { max: 98, cls: "space" });
      const { g } = cv;

      const { buildings, worldRadius } = generateCity(key);
      const station0 = buildings.find((b) => b.isStation) || buildings[0];

      const s = {
        x: station0.x,
        y: station0.h + 1.5,
        z: station0.z,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: 0,
        roll: 0,
        battery: 100,
        hull: 3,
        maxHull: 3,
        damagedEver: false,
        delivered: 0,
        carrying: false,
        pickupB: null,
        dropB: null,
        pickupTime: 0,
        windX: wind,
        windZ: 0,
        hitCooldown: 0,
        smoke: [],
      };

      function pickNewOrder() {
        const candidates = buildings.filter((b) => b.id !== s.dropB?.id);
        s.pickupB = pick(candidates);
        const dropCandidates = buildings.filter((b) => b.id !== s.pickupB.id);
        s.dropB = pick(dropCandidates);
        s.carrying = false;
      }
      pickNewOrder();

      const delivEl = statBlock(ctx, "Dostarczone paczki", { meter: true });
      const batEl = statBlock(ctx, "Bateria i kadłub", { meter: true });
      const statusEl = statBlock(ctx, "Nawigacja", { small: true });

      const keys = heldKeys(ctx);
      const touch = {};
      touchPad(ctx, touch, [
        ["l", "Obrót w lewo", "i-left"],
        ["u", "Do przodu", "i-up"],
        ["r", "Obrót w prawo", "i-right"],
        ["d", "Do tyłu", "i-down"],
        ["up", "W górę", "i-cw"],
        ["dn", "W dół", "i-ccw"],
      ], "c3");

      function drawPoly(pts, fill, stroke, lw = 0.8) {
        if (pts.some((p) => !p)) return;
        g.fillStyle = fill;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
        g.closePath();
        g.fill();
        if (stroke) {
          g.strokeStyle = stroke;
          g.lineWidth = lw;
          g.stroke();
        }
      }

      cv.loop((dt, now) => {
        if (ctx.done) return;
        if (s.hitCooldown > 0) s.hitCooldown = Math.max(0, s.hitCooldown - dt);

        // Zmienny wiatr
        const wAngle = now * 0.0004;
        s.windX = Math.cos(wAngle) * wind;
        s.windZ = Math.sin(wAngle) * wind;

        // Sterowanie dronem
        const turnLeft = keys.arrowleft || keys.a || touch.l;
        const turnRight = keys.arrowright || keys.d || touch.r;
        const fwd = keys.arrowup || keys.w || touch.u;
        const back = keys.arrowdown || keys.s || touch.d;
        const climb = keys[" "] || keys.e || touch.up;
        const descend = keys.q || keys.shift || touch.dn;

        if (turnLeft) s.yaw -= 2.1 * dt;
        if (turnRight) s.yaw += 2.1 * dt;
        const targetRoll = (turnRight ? 0.28 : 0) - (turnLeft ? 0.28 : 0);
        s.roll += (targetRoll - s.roll) * Math.min(1, 10 * dt);

        const thrust = (fwd ? 52 : 0) - (back ? 36 : 0);
        const sinY = Math.sin(s.yaw), cosY = Math.cos(s.yaw);
        s.vx += (sinY * thrust + s.windX * 0.45) * dt;
        s.vz += (cosY * thrust + s.windZ * 0.45) * dt;

        if (climb) s.vy += 45 * dt;
        else if (descend) s.vy -= 40 * dt;
        else s.vy -= 14 * dt; // łagodne opadanie

        // Tłumienie powietrza
        s.vx *= Math.pow(0.18, dt);
        s.vz *= Math.pow(0.18, dt);
        s.vy *= Math.pow(0.22, dt);

        const nextX = Math.max(-worldRadius, Math.min(worldRadius, s.x + s.vx * dt));
        const nextZ = Math.max(-worldRadius, Math.min(worldRadius, s.z + s.vz * dt));
        const nextY = Math.max(2, Math.min(95, s.y + s.vy * dt));

        s.x = nextX;
        s.z = nextZ;
        s.y = nextY;

        // Kolizje z budynkami i lądowanie
        const col = checkDroneBuilding(s, buildings);
        let onRoof = false;
        if (col.state === "roof") {
          onRoof = true;
          const b = col.building;
          s.y = b.h + 1.2;
          s.vy = Math.max(0, s.vy);
          s.vx *= 0.7;
          s.vz *= 0.7;

          // Stacja ładowania
          if (b.isStation && s.battery < 100) {
            s.battery = Math.min(100, s.battery + 45 * dt);
          }

          // Odbiór paczki
          if (!s.carrying && s.pickupB && b.id === s.pickupB.id) {
            s.carrying = true;
            s.pickupTime = ctx.time;
            Sound.place(3);
            ctx.toast("Paczka podjęta! Leć do złotego lądowiska.");
          }
          // Dostarczenie paczki
          else if (s.carrying && s.dropB && b.id === s.dropB.id) {
            s.carrying = false;
            s.delivered++;
            ctx.achieve("pierwsza-paczka");
            if (ctx.time - s.pickupTime < 18) ctx.achieve("ekspres");
            s.battery = Math.min(100, s.battery + 30);
            Sound.line();
            ctx.toast(`Przesyłka ${s.delivered}/${goal} dostarczona (+30% baterii)`);
            if (s.delivered >= goal) {
              if (!s.damagedEver) {
                ctx.achieve("bez-drasniecia");
                if (key === "hard") ctx.achieve("as-przestworzy");
              }
              ctx.win(`Dostarczyłeś komplet ${goal} przesyłek dronem kurierskim.`);
              return;
            }
            pickNewOrder();
          }
        } else if (col.state === "hit") {
          const b = col.building;
          // Odepchnięcie od ściany budynku
          const dx = s.x - b.x, dz = s.z - b.z;
          if (Math.abs(dx) > Math.abs(dz)) {
            s.x = b.x + Math.sign(dx || 1) * (b.w + 2.6);
            s.vx = -s.vx * 0.5;
          } else {
            s.z = b.z + Math.sign(dz || 1) * (b.w + 2.6);
            s.vz = -s.vz * 0.5;
          }
          if (s.hitCooldown <= 0) {
            s.hitCooldown = 1.1;
            s.hull--;
            s.damagedEver = true;
            Sound.error();
            ctx.toast("Kolizja z wieżowcem! Uszkodzono poszycie drona.");
            if (s.hull <= 0) {
              ctx.lose("Dron rozbity", `Dostarczono ${s.delivered} z ${goal} przesyłek.`);
              return;
            }
          }
        }

        // Zużycie baterii
        if (!onRoof) {
          const speed = Math.hypot(s.vx, s.vz, s.vy);
          const loadFactor = s.carrying ? 1.25 : 1.0;
          s.battery = Math.max(0, s.battery - (drain + speed * 0.03) * loadFactor * dt);
          if (s.battery <= 0) {
            ctx.lose("Wyczerpana bateria", `Zabrakło energii w locie po dostarczeniu ${s.delivered} z ${goal} paczek.`);
            return;
          }
        }

        // Kamera podążająca za dronem
        const camDist = 28;
        const cam = {
          x: s.x - Math.sin(s.yaw) * camDist,
          y: s.y + 13,
          z: s.z - Math.cos(s.yaw) * camDist,
          yaw: s.yaw,
          pitch: -0.26,
        };

        // --- RYSOWANIE SCENY 3D ---
        // Niebo nocnego miasta i horyzont
        const skyGrad = g.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#070b19");
        skyGrad.addColorStop(0.55, "#141e38");
        skyGrad.addColorStop(1, "#0b1120");
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, H);

        // Siatka ulic na poziomie y=0
        g.strokeStyle = "rgba(56, 189, 248, 0.14)";
        g.lineWidth = 0.7;
        for (let gx = -worldRadius; gx <= worldRadius; gx += 23) {
          const p0 = project3D(gx, 0, -worldRadius, cam, W, H);
          const p1 = project3D(gx, 0, worldRadius, cam, W, H);
          if (p0 && p1) {
            g.beginPath();
            g.moveTo(p0[0], p0[1]);
            g.lineTo(p1[0], p1[1]);
            g.stroke();
          }
        }

        // Sortowanie wieżowców od najdalszych do najbliższych (algorytm malarza)
        const sortedB = buildings
          .map((b) => ({
            b,
            dist2: (b.x - cam.x) ** 2 + (b.z - cam.z) ** 2,
          }))
          .sort((a, b) => b.dist2 - a.dist2);

        const targetB = s.carrying ? s.dropB : s.pickupB;

        for (const { b } of sortedB) {
          const w = b.w, h = b.h;
          // 8 wierzchołków prostopadłościanu
          const top = [
            project3D(b.x - w, h, b.z - w, cam, W, H),
            project3D(b.x + w, h, b.z - w, cam, W, H),
            project3D(b.x + w, h, b.z + w, cam, W, H),
            project3D(b.x - w, h, b.z + w, cam, W, H),
          ];
          const bot = [
            project3D(b.x - w, 0, b.z - w, cam, W, H),
            project3D(b.x + w, 0, b.z - w, cam, W, H),
            project3D(b.x + w, 0, b.z + w, cam, W, H),
            project3D(b.x - w, 0, b.z + w, cam, W, H),
          ];
          if (top.some((p) => !p) && bot.some((p) => !p)) continue;

          // Ściany boczne (rysujemy te zwrócone w stronę kamery)
          const walls = [
            { idx: [0, 1], normalZ: -1, check: cam.z < b.z - w },
            { idx: [1, 2], normalX: 1, check: cam.x > b.x + w },
            { idx: [2, 3], normalZ: 1, check: cam.z > b.z + w },
            { idx: [3, 0], normalX: -1, check: cam.x < b.x - w },
          ];
          for (const wl of walls) {
            if (!wl.check) continue;
            const [i0, i1] = wl.idx;
            drawPoly([bot[i0], bot[i1], top[i1], top[i0]], b.color, "rgba(148, 163, 184, 0.25)", 0.7);
          }

          // Dach budynku
          const isTarget = targetB && b.id === targetB.id;
          const roofFill = isTarget
            ? s.carrying
              ? "rgba(250, 204, 21, 0.48)"
              : "rgba(46, 230, 107, 0.45)"
            : b.isStation
            ? "rgba(0, 180, 216, 0.42)"
            : "#1e293b";
          const roofStroke = isTarget
            ? s.carrying
              ? "#facc15"
              : "#2ee66b"
            : b.isStation
            ? "#00e5ff"
            : "#475569";
          drawPoly(top, roofFill, roofStroke, isTarget ? 1.6 : 0.9);

          // Oznaczenie lądowiska na dachu docelowym
          if (isTarget) {
            const pRoofC = project3D(b.x, h + 0.1, b.z, cam, W, H);
            if (pRoofC) {
              g.save();
              g.strokeStyle = roofStroke;
              g.lineWidth = Math.max(1.2, pRoofC[3] * 1.5);
              g.beginPath();
              g.ellipse(pRoofC[0], pRoofC[1], pRoofC[3] * 4.5, pRoofC[3] * 2.2, 0, 0, Math.PI * 2);
              g.stroke();
              g.fillStyle = roofStroke;
              g.font = `bold ${Math.max(6, Math.round(pRoofC[3] * 4))}px sans-serif`;
              g.textAlign = "center";
              g.textBaseline = "middle";
              g.fillText(s.carrying ? "⌖" : "H", pRoofC[0], pRoofC[1]);
              g.restore();
            }
          }

          // Słup świetlny nad celem lub stacją
          if (isTarget || b.isStation) {
            const pRoof = project3D(b.x, h, b.z, cam, W, H);
            const pBeam = project3D(b.x, h + (isTarget ? 28 : 12), b.z, cam, W, H);
            if (pRoof && pBeam) {
              g.save();
              g.strokeStyle = roofStroke;
              g.globalAlpha = isTarget ? 0.55 + 0.25 * Math.sin(now * 0.006) : 0.35;
              g.lineWidth = Math.max(1.5, pRoof[3] * 3);
              g.beginPath();
              g.moveTo(pRoof[0], pRoof[1]);
              g.lineTo(pBeam[0], pBeam[1]);
              g.stroke();
              g.restore();
            }
          }
        }

        // Cząsteczki ciągu z wirników drona
        if (!onRoof && Math.random() < 0.45) {
          s.smoke.push({
            x: s.x + (Math.random() - 0.5) * 3,
            y: s.y - 0.8,
            z: s.z + (Math.random() - 0.5) * 3,
            vy: -14,
            life: 0.55,
          });
        }
        for (let i = s.smoke.length - 1; i >= 0; i--) {
          const sm = s.smoke[i];
          sm.y += sm.vy * dt;
          sm.life -= dt * 1.8;
          if (sm.life <= 0) {
            s.smoke.splice(i, 1);
            continue;
          }
          const pSm = project3D(sm.x, sm.y, sm.z, cam, W, H);
          if (pSm) {
            g.fillStyle = `rgba(224, 242, 254, ${Math.max(0, sm.life * 0.35)})`;
            g.beginPath();
            g.arc(pSm[0], pSm[1], Math.max(1, pSm[3] * 1.2), 0, Math.PI * 2);
            g.fill();
          }
        }

        // Cień drona pod nim
        let groundY = 0;
        for (const b of buildings) {
          if (Math.abs(s.x - b.x) < b.w && Math.abs(s.z - b.z) < b.w) groundY = b.h;
        }
        const pShadow = project3D(s.x, groundY + 0.2, s.z, cam, W, H);
        if (pShadow) {
          g.fillStyle = "rgba(0, 0, 0, 0.45)";
          g.beginPath();
          g.ellipse(pShadow[0], pShadow[1], Math.max(2, pShadow[3] * 2.5), Math.max(1, pShadow[3] * 1.2), 0, 0, Math.PI * 2);
          g.fill();
        }

        // Rysowanie drona 3D (w centrum widoku kamery)
        const pDrone = project3D(s.x, s.y, s.z, cam, W, H);
        if (pDrone) {
          const [dx, dy, , sc] = pDrone;
          g.save();
          g.translate(dx, dy);
          g.rotate(s.roll);

          // Ramiona czterośmigłowca
          const arm = sc * 2.8;
          g.strokeStyle = s.hitCooldown > 0 ? "#ef4444" : "#e2e8f0";
          g.lineWidth = 2.0;
          g.beginPath();
          g.moveTo(-arm, -arm * 0.45);
          g.lineTo(arm, arm * 0.45);
          g.moveTo(-arm, arm * 0.45);
          g.lineTo(arm, -arm * 0.45);
          g.stroke();

          // Cztery wirujące rotory
          const rotSpin = Math.sin(now * 0.04) * arm * 0.45;
          g.strokeStyle = "#38bdf8";
          g.lineWidth = 1.4;
          for (const [rx, ry] of [
            [-arm, -arm * 0.45],
            [arm, -arm * 0.45],
            [-arm, arm * 0.45],
            [arm, arm * 0.45],
          ]) {
            g.beginPath();
            g.ellipse(rx, ry, Math.abs(rotSpin) + 3, 2.2, 0, 0, Math.PI * 2);
            g.stroke();
          }

          // Podwieszona paczka
          if (s.carrying) {
            g.fillStyle = "#facc15";
            g.strokeStyle = "#92400e";
            g.lineWidth = 1;
            g.fillRect(-4, 2, 8, 6.5);
            g.strokeRect(-4, 2, 8, 6.5);
          }

          // Korpus drona
          g.fillStyle = "#ff6d00";
          g.beginPath();
          g.ellipse(0, 0, 6.5, 3.8, 0, 0, Math.PI * 2);
          g.fill();
          g.restore();
        }

        // Kompas / radar u góry ekranu wskazujący kierunek do celu
        if (targetB) {
          const angToTarget = Math.atan2(targetB.x - s.x, targetB.z - s.z) - s.yaw;
          const distToTarget = Math.round(Math.hypot(targetB.x - s.x, targetB.z - s.z));

          g.save();
          g.translate(W / 2, 18);
          g.fillStyle = "rgba(15, 23, 42, 0.78)";
          g.strokeStyle = s.carrying ? "#facc15" : "#2ee66b";
          g.lineWidth = 1.2;
          g.beginPath();
          g.roundRect(-42, -10, 84, 20, 10);
          g.fill();
          g.stroke();

          // Strzałka kierunkowa
          g.save();
          g.translate(-24, 0);
          g.rotate(angToTarget);
          g.fillStyle = s.carrying ? "#facc15" : "#2ee66b";
          g.beginPath();
          g.moveTo(0, -6);
          g.lineTo(4.5, 5);
          g.lineTo(0, 2.5);
          g.lineTo(-4.5, 5);
          g.closePath();
          g.fill();
          g.restore();

          g.fillStyle = "#f8fafc";
          g.font = "bold 7.5px sans-serif";
          g.textAlign = "left";
          g.textBaseline = "middle";
          g.fillText(`${s.carrying ? "DOSTAWA" : "ODBIÓR"} ${distToTarget}m`, -12, 0.5);
          g.restore();
        }

        // Aktualizacja panelu
        delivEl.set(`${s.delivered} / ${goal}`, s.delivered / goal, s.carrying ? "Transport przesyłki w toku" : "Leć po paczkę (zielony dach)");
        batEl.set(`${Math.round(s.battery)}%`, s.battery / 100, `Poszycie: ${"●".repeat(s.hull)}${"○".repeat(s.maxHull - s.hull)} · Wysokość: ${Math.round(s.y)}m`);
        statusEl.set(
          onRoof ? "Na dachu" : `Wiatr ${Math.round(wind)} m/s`,
          null,
          "Błękitne dachy doładowują baterię"
        );
        ctx.progress(s.delivered / goal);
      });
    },
  });
}
