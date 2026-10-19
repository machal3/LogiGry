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
        // Środek miasta oraz narożnik to stacje bazowe / energetyczne
        const isCenter = r === Math.floor(gridN / 2) && c === Math.floor(gridN / 2);
        const isCornerStation = (r === 0 && c === gridN - 1) || (r === gridN - 1 && c === 0);
        const isStation = isCenter || isCornerStation;
        const h = isCenter
          ? 22
          : 15 + ((r * 17 + c * 31) % (levelKey === "hard" ? 44 : levelKey === "medium" ? 34 : 26));
        const w = 13;
        const hue = 208 + ((r * 13 + c * 7) % 32);
        const lum = 19 + ((r + c) % 4) * 3;
        buildings.push({
          id: r * gridN + c,
          r,
          c,
          x,
          z,
          w,
          h,
          isStation,
          color: isStation ? "#163b5c" : `hsl(${hue}, 34%, ${lum}%)`,
          sideColor: isStation ? "#102c46" : `hsl(${hue}, 34%, ${lum - 4}%)`,
          winSeed: (r * 37 + c * 53) + 11,
        });
      }
    }
    return { buildings, worldRadius: offset + 35, spacing, gridN };
  }

  // Transformacja punktu świata (wx, wy, wz) do przestrzeni kamery (rx, ry, rz)
  function toCam3D(wx, wy, wz, cam) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const dz = wz - cam.z;

    // Obrót wokół osi Y (yaw)
    const cosY = Math.cos(-cam.yaw), sinY = Math.sin(-cam.yaw);
    const rx = dx * cosY - dz * sinY;
    const rz1 = dx * sinY + dz * cosY;

    // Obrót wokół osi X (pitch: dodatni pochyla kamerę w dół na panoramę miasta)
    const cosP = Math.cos(-cam.pitch), sinP = Math.sin(-cam.pitch);
    const ry = dy * cosP - rz1 * sinP;
    const rz = dy * sinP + rz1 * cosP;
    return [rx, ry, rz];
  }

  // Projekcja punktu 3D (wx, wy, wz) do ekranu 2D przy kamerze (cx, cy, cz, yaw, pitch)
  function project3D(wx, wy, wz, cam, W, H, fov = 175) {
    const [rx, ry, rz] = toCam3D(wx, wy, wz, cam);
    if (rz < 2.5) return null;
    const scale = fov / rz;
    return [W / 2 + rx * scale, H / 2 - ry * scale, rz, scale];
  }

  // Rzutowanie wielokąta 3D z przycięciem do bliskiej płaszczyzny kamery (rz >= 2.5)
  function projectPoly3D(worldPts, cam, W, H, fov = 175) {
    const near = 2.5;
    const camPts = worldPts.map((p) => toCam3D(p[0], p[1], p[2], cam));
    const clipped = [];
    for (let i = 0; i < camPts.length; i++) {
      const a = camPts[i];
      const b = camPts[(i + 1) % camPts.length];
      const aIn = a[2] >= near;
      const bIn = b[2] >= near;
      if (aIn) clipped.push(a);
      if (aIn !== bIn) {
        const t = (near - a[2]) / (b[2] - a[2]);
        clipped.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
          near,
        ]);
      }
    }
    if (clipped.length < 3) return null;
    return clipped.map(([rx, ry, rz]) => {
      const sc = fov / rz;
      return [W / 2 + rx * sc, H / 2 - ry * sc, rz, sc];
    });
  }

  // Rzutowanie odcinka 3D z przycięciem do bliskiej płaszczyzny kamery
  function projectLine3D(p0, p1, cam, W, H, fov = 175) {
    const near = 2.5;
    let a = toCam3D(p0[0], p0[1], p0[2], cam);
    let b = toCam3D(p1[0], p1[1], p1[2], cam);
    if (a[2] < near && b[2] < near) return null;
    if (a[2] < near) {
      const t = (near - a[2]) / (b[2] - a[2]);
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, near];
    } else if (b[2] < near) {
      const t = (near - b[2]) / (a[2] - b[2]);
      b = [b[0] + (a[0] - b[0]) * t, b[1] + (a[1] - b[1]) * t, near];
    }
    const scA = fov / a[2], scB = fov / b[2];
    return [
      [W / 2 + a[0] * scA, H / 2 - a[1] * scA, a[2], scA],
      [W / 2 + b[0] * scB, H / 2 - b[1] * scB, b[2], scB],
    ];
  }

  // Sprawdza kolizję drona z budynkami i lądowanie na dachu
  function checkDroneBuilding(drone, buildings) {
    for (const b of buildings) {
      if (Math.abs(drone.x - b.x) < b.w + 2.2 && Math.abs(drone.z - b.z) < b.w + 2.2) {
        if (drone.y >= b.h - 2.2 && drone.y <= b.h + 3.6 && drone.vy <= 6) {
          // Bezpieczne lądowanie na dachu budynku
          return { state: "roof", building: b };
        }
        if (drone.y < b.h - 1.5) {
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
      { key: "easy", name: "Łatwy", points: 20, goal: 4, wind: 2.2, drain: 1.6 },
      { key: "medium", name: "Średni", points: 50, goal: 6, wind: 4.8, drain: 2.2 },
      { key: "hard", name: "Trudny", points: 100, goal: 8, wind: 7.5, drain: 2.8 },
    ],
    rules: [
      "Steruj dronem w 3D: strzałki lub WASD odpowiadają za lot i obrót, Spacja / E (w górę) oraz Q / Shift (w dół) za wysokość, albo przeciągaj wskaźnikiem na ekranie.",
      "Leć do zielonego znacznika odbioru na dachu wieżowca, osiądź w kręgu hologramu, aby zabrać paczkę, a potem dostarcz ją na złote lądowisko docelowe.",
      "Kontroluj poziom baterii: lądowanie na błękitnych stacjach energetycznych z literą E szybko doładowuje akumulator.",
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

      const { buildings, worldRadius, spacing } = generateCity(key);
      const station0 = buildings.find((b) => b.isStation && b.x === 0 && b.z === 0) || buildings.find((b) => b.isStation) || buildings[0];

      // Latarnie uliczne wzdłuż alejek między budynkami
      const lamps = [];
      for (const b of buildings) {
        lamps.push({ x: b.x + b.w + 4.5, z: b.z + b.w + 4.5 });
        lamps.push({ x: b.x - b.w - 4.5, z: b.z - b.w - 4.5 });
      }

      const s = {
        x: station0.x,
        y: station0.h + 1.4,
        z: station0.z,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: 0.32,
        roll: 0,
        pitchAnim: 0,
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
        pointerActive: false,
        pointerX: W / 2,
        pointerY: H * 0.6,
      };

      function pickNewOrder() {
        const candidates = buildings.filter((b) => b.id !== s.dropB?.id && b.id !== station0.id);
        s.pickupB = pick(candidates.length ? candidates : buildings);
        const dropCandidates = buildings.filter((b) => b.id !== s.pickupB.id);
        s.dropB = pick(dropCandidates);
        s.carrying = false;
      }
      pickNewOrder();

      // Maksymalnie 4 własne bloki w panelu bocznym
      const delivEl = statBlock(ctx, "Dostarczone paczki", { meter: true });
      const batEl = statBlock(ctx, "Bateria", { meter: true });
      const hullEl = pipsBlock(ctx, "Poszycie kadłuba", 3, { icon: "heart" });

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

      // Sterowanie wskaźnikiem (mysz / dotyk) bezpośrednio na płótnie
      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        cv.cv.setPointerCapture?.(e.pointerId);
        const [px, py] = cv.at(e);
        s.pointerActive = true;
        s.pointerX = px;
        s.pointerY = py;
      });
      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.pointerActive) return;
        const [px, py] = cv.at(e);
        s.pointerX = px;
        s.pointerY = py;
      });
      const stopPointer = () => { s.pointerActive = false; };
      ctx.on(cv.cv, "pointerup", stopPointer);
      ctx.on(cv.cv, "pointercancel", stopPointer);
      ctx.on(cv.cv, "pointerleave", stopPointer);

      function drawPoly(pts, fill, stroke, lw = 0.8) {
        if (!pts || pts.length < 3) return;
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
        const wAngle = now * 0.00035;
        s.windX = Math.cos(wAngle) * wind;
        s.windZ = Math.sin(wAngle) * wind;

        // Sterowanie klawiaturą, touchPadem lub przeciąganiem na płótnie
        const turnLeft = keys.arrowleft || keys.a || touch.l;
        const turnRight = keys.arrowright || keys.d || touch.r;
        const fwd = keys.arrowup || keys.w || touch.u;
        const back = keys.arrowdown || keys.s || touch.d;
        const climb = keys[" "] || keys.e || touch.up;
        const descend = keys.q || keys.shift || touch.dn;

        let yawRate = (turnRight ? 2.0 : 0) - (turnLeft ? 2.0 : 0);
        let thrust = (fwd ? 54 : 0) - (back ? 36 : 0);
        let vertAcc = climb ? 44 : descend ? -38 : -11;

        if (s.pointerActive) {
          const dxNorm = (s.pointerX - W / 2) / (W * 0.42);
          if (Math.abs(dxNorm) > 0.08) {
            yawRate += Math.max(-2.2, Math.min(2.2, dxNorm * 2.1));
          }
          // Górna i środkowa część ekranu daje ciąg naprzód, sam dół cofa/hamuje
          if (s.pointerY < H * 0.82) {
            thrust = Math.max(thrust, 48);
          } else {
            thrust = -28;
          }
          // Wysokość regulowana położeniem kursora w pionie
          if (s.pointerY < H * 0.46) vertAcc = 42;
          else if (s.pointerY > H * 0.72) vertAcc = -34;
          else vertAcc = 2;
        }

        s.yaw += yawRate * dt;
        const targetRoll = Math.max(-0.32, Math.min(0.32, yawRate * 0.14));
        s.roll += (targetRoll - s.roll) * Math.min(1, 10 * dt);
        const targetPitchAnim = thrust > 10 ? 0.12 : thrust < -10 ? -0.1 : 0;
        s.pitchAnim += (targetPitchAnim - s.pitchAnim) * Math.min(1, 8 * dt);

        const sinY = Math.sin(s.yaw), cosY = Math.cos(s.yaw);
        s.vx += (sinY * thrust + s.windX * 0.42) * dt;
        s.vz += (cosY * thrust + s.windZ * 0.42) * dt;
        s.vy += vertAcc * dt;

        // Łagodne przyciąganie magnetyczne do lądowiska, gdy dron wlatuje w krąg hologramu nad celem lub stacją
        const targetB = s.carrying ? s.dropB : s.pickupB;
        for (const b of buildings) {
          if (b === targetB || b.isStation) {
            const distH = Math.hypot(s.x - b.x, s.z - b.z);
            if (distH < b.w + 5.5 && s.y >= b.h - 1.5 && s.y <= b.h + 13) {
              const pull = b === targetB ? 3.2 : 2.0;
              s.vx += (b.x - s.x) * pull * dt;
              s.vz += (b.z - s.z) * pull * dt;
              if (s.vy < -6) s.vy += 18 * dt;
            }
          }
        }

        // Tłumienie ośrodka
        s.vx *= Math.pow(0.18, dt);
        s.vz *= Math.pow(0.18, dt);
        s.vy *= Math.pow(0.22, dt);

        s.x = Math.max(-worldRadius, Math.min(worldRadius, s.x + s.vx * dt));
        s.z = Math.max(-worldRadius, Math.min(worldRadius, s.z + s.vz * dt));
        s.y = Math.max(2, Math.min(92, s.y + s.vy * dt));

        // Kolizje z budynkami i lądowanie
        const col = checkDroneBuilding(s, buildings);
        let onRoof = false;
        if (col.state === "roof") {
          onRoof = true;
          const b = col.building;
          s.y = b.h + 1.3;
          s.vy = Math.max(0, s.vy);
          s.vx *= 0.65;
          s.vz *= 0.65;

          // Stacja ładowania
          if (b.isStation && s.battery < 100) {
            s.battery = Math.min(100, s.battery + 48 * dt);
          }

          // Odbiór paczki
          if (!s.carrying && s.pickupB && b.id === s.pickupB.id) {
            s.carrying = true;
            s.pickupTime = ctx.time;
            Sound.place(3);
            ctx.toast("Paczka podjęta. Leć do złotego lądowiska.");
          }
          // Dostarczenie paczki
          else if (s.carrying && s.dropB && b.id === s.dropB.id) {
            s.carrying = false;
            s.delivered++;
            ctx.achieve("pierwsza-paczka");
            if (ctx.time - s.pickupTime < 18) ctx.achieve("ekspres");
            s.battery = Math.min(100, s.battery + 32);
            Sound.line();
            ctx.toast(`Przesyłka ${s.delivered} z ${goal} dostarczona (+32% baterii).`);
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
            ctx.toast("Kolizja z wieżowcem, uszkodzono poszycie drona.");
            if (s.hull <= 0) {
              hullEl.set(0, "Poszycie zniszczone");
              ctx.lose("Dron rozbity", `Dostarczono ${s.delivered} z ${goal} przesyłek.`);
              return;
            }
          }
        }

        // Zużycie baterii
        const speed = Math.hypot(s.vx, s.vz, s.vy);
        if (!onRoof) {
          const loadFactor = s.carrying ? 1.22 : 1.0;
          s.battery = Math.max(0, s.battery - (drain + speed * 0.025) * loadFactor * dt);
          if (s.battery <= 0) {
            ctx.lose("Wyczerpana bateria", `Zabrakło energii w locie po dostarczeniu ${s.delivered} z ${goal} paczek.`);
            return;
          }
        }

        // Kamera 3D za i nad dronem, pochylona w dół (pitch > 0), dzięki czemu dron jest na ~68% wysokości ekranu,
        // a przed nim widać rozległą panoramę miasta 3D
        const camDist = 25;
        const cam = {
          x: s.x - Math.sin(s.yaw) * camDist,
          y: s.y + 11.5,
          z: s.z - Math.cos(s.yaw) * camDist,
          yaw: s.yaw,
          pitch: 0.24,
        };
        const fov = 175;
        const horizonY = Math.max(24, Math.min(H * 0.45, H / 2 - fov * Math.tan(cam.pitch)));

        // --- RYSOWANIE SCENY 3D ---
        // Niebo nad horyzontem
        const skyGrad = g.createLinearGradient(0, 0, 0, horizonY + 18);
        skyGrad.addColorStop(0, "#050914");
        skyGrad.addColorStop(0.7, "#0f1c36");
        skyGrad.addColorStop(1, "#1e3a5f");
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, horizonY + 2);

        // Płaszczyzna ziemi i ulic poniżej horyzontu
        const groundGrad = g.createLinearGradient(0, horizonY, 0, H);
        groundGrad.addColorStop(0, "#0f172a");
        groundGrad.addColorStop(0.35, "#0b1324");
        groundGrad.addColorStop(1, "#070c18");
        g.fillStyle = groundGrad;
        g.fillRect(0, horizonY, W, H - horizonY);

        // Łuna świetlna na linii horyzontu
        g.strokeStyle = "rgba(56, 189, 248, 0.35)";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, horizonY);
        g.lineTo(W, horizonY);
        g.stroke();

        // Płyta miejska i siatka ulic na poziomie y = 0
        const cityPlate = projectPoly3D([
          [-worldRadius, 0, -worldRadius],
          [worldRadius, 0, -worldRadius],
          [worldRadius, 0, worldRadius],
          [-worldRadius, 0, worldRadius],
        ], cam, W, H, fov);
        if (cityPlate) {
          drawPoly(cityPlate, "rgba(15, 23, 42, 0.9)", "rgba(56, 189, 248, 0.28)", 0.9);
        }

        // Ulice i pasy ruchu między kwartałami budynków
        g.strokeStyle = "rgba(56, 189, 248, 0.18)";
        g.lineWidth = 0.8;
        const halfSpan = spacing * 0.5;
        for (let gx = -worldRadius; gx <= worldRadius; gx += halfSpan) {
          const segX = projectLine3D([gx, 0.05, -worldRadius], [gx, 0.05, worldRadius], cam, W, H, fov);
          if (segX) {
            g.beginPath();
            g.moveTo(segX[0][0], segX[0][1]);
            g.lineTo(segX[1][0], segX[1][1]);
            g.stroke();
          }
          const segZ = projectLine3D([-worldRadius, 0.05, gx], [worldRadius, 0.05, gx], cam, W, H, fov);
          if (segZ) {
            g.beginPath();
            g.moveTo(segZ[0][0], segZ[0][1]);
            g.lineTo(segZ[1][0], segZ[1][1]);
            g.stroke();
          }
        }

        // Latarnie uliczne na poziomie dróg
        for (const lp of lamps) {
          const pBase = project3D(lp.x, 0, lp.z, cam, W, H, fov);
          const pTop = project3D(lp.x, 4.2, lp.z, cam, W, H, fov);
          if (pBase && pTop && pTop[2] < 130) {
            g.strokeStyle = "rgba(148, 163, 184, 0.55)";
            g.lineWidth = Math.max(0.6, pTop[3] * 0.35);
            g.beginPath();
            g.moveTo(pBase[0], pBase[1]);
            g.lineTo(pTop[0], pTop[1]);
            g.stroke();

            g.fillStyle = "rgba(253, 224, 71, 0.85)";
            g.beginPath();
            g.arc(pTop[0], pTop[1], Math.max(0.9, pTop[3] * 0.65), 0, Math.PI * 2);
            g.fill();
          }
        }

        // Sortowanie wieżowców od najdalszych do najbliższych (algorytm malarza)
        const sortedB = buildings
          .map((b) => ({
            b,
            dist2: (b.x - cam.x) ** 2 + (b.z - cam.z) ** 2,
          }))
          .sort((a, b) => b.dist2 - a.dist2);

        const activeTarget = s.carrying ? s.dropB : s.pickupB;

        for (const { b } of sortedB) {
          const w = b.w, h = b.h;
          const topWorld = [
            [b.x - w, h, b.z - w],
            [b.x + w, h, b.z - w],
            [b.x + w, h, b.z + w],
            [b.x - w, h, b.z + w],
          ];
          const botWorld = [
            [b.x - w, 0, b.z - w],
            [b.x + w, 0, b.z - w],
            [b.x + w, 0, b.z + w],
            [b.x - w, 0, b.z + w],
          ];

          // Ściany boczne zwrócone w stronę kamery wraz z oknami wieżowca
          const walls = [
            { idx: [0, 1], check: cam.z < b.z - w, shade: b.color },
            { idx: [1, 2], check: cam.x > b.x + w, shade: b.sideColor },
            { idx: [2, 3], check: cam.z > b.z + w, shade: b.color },
            { idx: [3, 0], check: cam.x < b.x - w, shade: b.sideColor },
          ];

          for (const wl of walls) {
            if (!wl.check) continue;
            const [i0, i1] = wl.idx;
            const wallPoly = projectPoly3D(
              [botWorld[i0], botWorld[i1], topWorld[i1], topWorld[i0]],
              cam, W, H, fov
            );
            if (!wallPoly) continue;
            drawPoly(wallPoly, wl.shade, "rgba(148, 163, 184, 0.28)", 0.7);

            // Świecące okna na ścianie wieżowca
            const pCenter = project3D(b.x, h * 0.5, b.z, cam, W, H, fov);
            if (pCenter && pCenter[2] < 145) {
              const pA0 = botWorld[i0], pA1 = botWorld[i1];
              const floors = Math.max(2, Math.floor(h / 5.5));
              for (let fl = 1; fl < floors; fl++) {
                const wy0 = fl * 5.2 - 1.2;
                const wy1 = wy0 + 2.2;
                for (let wc = 0; wc < 3; wc++) {
                  if (((b.winSeed + fl * 7 + wc * 13 + i0 * 5) % 5) === 0) continue;
                  const u0 = 0.16 + wc * 0.26;
                  const u1 = u0 + 0.16;
                  const wx0 = pA0[0] + (pA1[0] - pA0[0]) * u0;
                  const wz0 = pA0[2] + (pA1[2] - pA0[2]) * u0;
                  const wx1 = pA0[0] + (pA1[0] - pA0[0]) * u1;
                  const wz1 = pA0[2] + (pA1[2] - pA0[2]) * u1;
                  const winQuad = projectPoly3D([
                    [wx0, wy0, wz0],
                    [wx1, wy0, wz1],
                    [wx1, wy1, wz1],
                    [wx0, wy1, wz0],
                  ], cam, W, H, fov);
                  if (winQuad) {
                    const warm = ((b.winSeed + fl + wc) % 3) === 0;
                    drawPoly(
                      winQuad,
                      b.isStation
                        ? "rgba(56, 189, 248, 0.55)"
                        : warm
                        ? "rgba(253, 224, 71, 0.48)"
                        : "rgba(186, 230, 253, 0.38)",
                      null
                    );
                  }
                }
              }
            }
          }

          // Dach budynku (widoczny, gdy kamera jest powyżej dachu lub blisko niego)
          const roofPoly = projectPoly3D(topWorld, cam, W, H, fov);
          const isTarget = activeTarget && b.id === activeTarget.id;
          const roofFill = isTarget
            ? s.carrying
              ? "rgba(250, 204, 21, 0.52)"
              : "rgba(46, 230, 107, 0.5)"
            : b.isStation
            ? "rgba(0, 180, 216, 0.45)"
            : "#1e293b";
          const roofStroke = isTarget
            ? s.carrying
              ? "#facc15"
              : "#2ee66b"
            : b.isStation
            ? "#00e5ff"
            : "#64748b";

          if (roofPoly) {
            drawPoly(roofPoly, roofFill, roofStroke, isTarget ? 1.6 : 0.9);
          }

          // Oznaczenie lądowiska H / E na dachu oraz pierścienie hologramowe nad celem
          const pRoofC = project3D(b.x, h + 0.15, b.z, cam, W, H, fov);
          if (pRoofC && (isTarget || b.isStation || pRoofC[2] < 95)) {
            g.save();
            g.strokeStyle = roofStroke;
            g.lineWidth = Math.max(0.9, pRoofC[3] * 0.45);
            g.beginPath();
            g.ellipse(
              pRoofC[0],
              pRoofC[1],
              Math.max(2.5, pRoofC[3] * 5.2),
              Math.max(1.4, pRoofC[3] * 2.5),
              0, 0, Math.PI * 2
            );
            g.stroke();
            g.restore();

            const padLetter = isTarget ? "H" : b.isStation ? "E" : "H";
            const fontSize = Math.max(3.2, Math.min(11, pRoofC[3] * 3.8));
            cv.text(padLetter, pRoofC[0], pRoofC[1], {
              size: fontSize,
              weight: 700,
              color: roofStroke,
            });
          }

          // Pulsujące pierścienie hologramowe i słup świetlny nad celem lub stacją
          if (isTarget || b.isStation) {
            const beamTopH = isTarget ? h + 26 : h + 11;
            const beamSeg = projectLine3D([b.x, h, b.z], [b.x, beamTopH, b.z], cam, W, H, fov);
            if (beamSeg) {
              g.save();
              g.strokeStyle = roofStroke;
              g.globalAlpha = isTarget ? 0.45 + 0.25 * Math.sin(now * 0.006) : 0.28;
              g.lineWidth = Math.max(1.5, beamSeg[0][3] * 2.6);
              g.beginPath();
              g.moveTo(beamSeg[0][0], beamSeg[0][1]);
              g.lineTo(beamSeg[1][0], beamSeg[1][1]);
              g.stroke();
              g.restore();
            }

            // 3 poziome pierścienie hologramu unoszące się nad dachem
            const ringCount = isTarget ? 3 : 1;
            for (let rk = 0; rk < ringCount; rk++) {
              const phase = ((now * 0.0015 + rk / ringCount) % 1);
              const ryWorld = h + 1.5 + phase * (isTarget ? 11 : 5);
              const pRing = project3D(b.x, ryWorld, b.z, cam, W, H, fov);
              if (pRing) {
                const rxRad = Math.max(3, pRing[3] * (7.5 - phase * 2.2));
                const ryRad = Math.max(1.5, rxRad * 0.44);
                g.save();
                g.strokeStyle = roofStroke;
                g.globalAlpha = (1 - phase * 0.75) * (isTarget ? 0.85 : 0.55);
                g.lineWidth = Math.max(1.0, pRing[3] * 0.55);
                g.beginPath();
                g.ellipse(pRing[0], pRing[1], rxRad, ryRad, 0, 0, Math.PI * 2);
                g.stroke();
                g.restore();
              }
            }
          }
        }

        // Cząsteczki ciągu z wirników drona
        if (!onRoof && Math.random() < 0.5) {
          s.smoke.push({
            x: s.x + (Math.random() - 0.5) * 3.2,
            y: s.y - 0.7,
            z: s.z + (Math.random() - 0.5) * 3.2,
            vy: -13,
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
          const pSm = project3D(sm.x, sm.y, sm.z, cam, W, H, fov);
          if (pSm) {
            g.fillStyle = `rgba(186, 230, 253, ${Math.max(0, sm.life * 0.4)})`;
            g.beginPath();
            g.arc(pSm[0], pSm[1], Math.max(1, pSm[3] * 0.45), 0, Math.PI * 2);
            g.fill();
          }
        }

        // Pionowy wskaźnik laserowy i cień pod dronem ułatwiający precyzyjne lądowanie
        let groundY = 0;
        for (const b of buildings) {
          if (Math.abs(s.x - b.x) < b.w && Math.abs(s.z - b.z) < b.w) groundY = b.h;
        }
        const pShadow = project3D(s.x, groundY + 0.2, s.z, cam, W, H, fov);
        const pDrone = project3D(s.x, s.y, s.z, cam, W, H, fov);
        if (pShadow && pDrone) {
          g.save();
          g.strokeStyle = "rgba(56, 189, 248, 0.35)";
          g.setLineDash([2, 2]);
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(pDrone[0], pDrone[1] + 4);
          g.lineTo(pShadow[0], pShadow[1]);
          g.stroke();
          g.setLineDash([]);

          g.fillStyle = "rgba(0, 0, 0, 0.5)";
          g.beginPath();
          g.ellipse(
            pShadow[0],
            pShadow[1],
            Math.max(2.5, pShadow[3] * 1.8),
            Math.max(1.2, pShadow[3] * 0.85),
            0, 0, Math.PI * 2
          );
          g.fill();
          g.restore();
        }

        // Rysowanie drona 3D (dobrze widoczny na ~68% wysokości ekranu)
        if (pDrone) {
          const [dx, dy, , sc] = pDrone;
          g.save();
          g.translate(dx, dy);
          g.rotate(s.roll);

          const arm = Math.max(12, sc * 2.5);
          const armY = arm * (0.42 + s.pitchAnim * 0.25);

          // Płozy podwozia
          g.strokeStyle = "#64748b";
          g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(-arm * 0.45, 3.5);
          g.lineTo(-arm * 0.45, 7.5);
          g.moveTo(arm * 0.45, 3.5);
          g.lineTo(arm * 0.45, 7.5);
          g.moveTo(-arm * 0.6, 7.5);
          g.lineTo(arm * 0.6, 7.5);
          g.stroke();

          // Podwieszona paczka kurierska
          if (s.carrying) {
            g.fillStyle = "#facc15";
            g.strokeStyle = "#92400e";
            g.lineWidth = 1.1;
            g.beginPath();
            g.roundRect(-5.5, 4.2, 11, 7.5, 1.5);
            g.fill();
            g.stroke();
            // Taśma na paczce
            g.strokeStyle = "#b45309";
            g.beginPath();
            g.moveTo(0, 4.2);
            g.lineTo(0, 11.7);
            g.stroke();
          }

          // Ramiona czterośmigłowca
          g.strokeStyle = s.hitCooldown > 0 ? "#ef4444" : "#cbd5e1";
          g.lineWidth = 2.4;
          g.beginPath();
          g.moveTo(-arm, -armY);
          g.lineTo(arm, armY);
          g.moveTo(-arm, armY);
          g.lineTo(arm, -armY);
          g.stroke();

          // Cztery wirujące rotory z tarczą rozmycia
          const rotSpin = Math.sin(now * 0.045) * arm * 0.38;
          for (const [rx, ry, isFront] of [
            [-arm, -armY, true],
            [arm, -armY, true],
            [-arm, armY, false],
            [arm, armY, false],
          ]) {
            g.fillStyle = "rgba(56, 189, 248, 0.22)";
            g.strokeStyle = isFront ? "#38bdf8" : "#fb923c";
            g.lineWidth = 1.3;
            g.beginPath();
            g.ellipse(rx, ry, Math.abs(rotSpin) + 4.5, 2.5, 0, 0, Math.PI * 2);
            g.fill();
            g.stroke();

            // Głowica silnika
            g.fillStyle = "#1e293b";
            g.beginPath();
            g.arc(rx, ry, 1.8, 0, Math.PI * 2);
            g.fill();
          }

          // Centralny korpus drona z kopułką i diodą stanu
          g.fillStyle = s.hitCooldown > 0 ? "#ef4444" : "#ff6d00";
          g.strokeStyle = "#fff7ed";
          g.lineWidth = 1.0;
          g.beginPath();
          g.ellipse(0, 0, 8.2, 4.6, 0, 0, Math.PI * 2);
          g.fill();
          g.stroke();

          g.fillStyle = s.carrying ? "#facc15" : "#2ee66b";
          g.beginPath();
          g.arc(0, -1.2, 2.1, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }

        // Wizualny wskaźnik sterowania dotykiem/myszą na płótnie
        if (s.pointerActive) {
          g.save();
          g.strokeStyle = "rgba(255, 109, 0, 0.7)";
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(s.pointerX, s.pointerY, 6, 0, Math.PI * 2);
          g.stroke();
          g.restore();
        }

        // --- HUD NA PŁÓTNIE (wyłącznie cv.text) ---
        // 1. Mini-mapa / radar w lewym górnym rogu
        const mapX = 6, mapY = 6, mapS = 46;
        g.save();
        g.fillStyle = "rgba(10, 17, 32, 0.82)";
        g.strokeStyle = "rgba(56, 189, 248, 0.45)";
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(mapX, mapY, mapS, mapS, 5);
        g.fill();
        g.stroke();

        const mapCx = mapX + mapS / 2;
        const mapCy = mapY + mapS / 2 + 2;
        const mapScale = (mapS * 0.4) / worldRadius;

        for (const b of buildings) {
          const bx = mapCx + b.x * mapScale;
          const bz = mapCy - b.z * mapScale;
          const bw = Math.max(2.2, b.w * mapScale * 1.4);
          const isT = activeTarget && b.id === activeTarget.id;
          g.fillStyle = isT
            ? s.carrying
              ? "#facc15"
              : "#2ee66b"
            : b.isStation
            ? "#00e5ff"
            : "rgba(148, 163, 184, 0.45)";
          g.fillRect(bx - bw / 2, bz - bw / 2, bw, bw);
          if (isT) {
            g.strokeStyle = s.carrying ? "#facc15" : "#2ee66b";
            g.lineWidth = 0.9;
            g.beginPath();
            g.arc(bx, bz, bw * 0.95 + Math.sin(now * 0.008) * 1.2, 0, Math.PI * 2);
            g.stroke();
          }
        }

        // Pozycja i kierunek drona na radarze
        const dMx = mapCx + s.x * mapScale;
        const dMy = mapCy - s.z * mapScale;
        g.save();
        g.translate(dMx, dMy);
        g.rotate(s.yaw);
        g.fillStyle = "#ff6d00";
        g.beginPath();
        g.moveTo(0, -3.5);
        g.lineTo(2.6, 2.8);
        g.lineTo(-2.6, 2.8);
        g.closePath();
        g.fill();
        g.restore();

        cv.text("RADAR", mapCx, mapY + 5.5, { size: 4.2, weight: 700, color: "#94a3b8" });
        g.restore();

        // 2. Kompas i odległość do celu u góry na środku
        if (activeTarget) {
          const angToTarget = Math.atan2(activeTarget.x - s.x, activeTarget.z - s.z) - s.yaw;
          const distToTarget = Math.round(Math.hypot(activeTarget.x - s.x, activeTarget.z - s.z));
          const accent = s.carrying ? "#facc15" : "#2ee66b";

          g.save();
          g.translate(W / 2, 16);
          g.fillStyle = "rgba(10, 17, 32, 0.82)";
          g.strokeStyle = accent;
          g.lineWidth = 1.1;
          g.beginPath();
          g.roundRect(-46, -10, 92, 20, 10);
          g.fill();
          g.stroke();

          g.save();
          g.translate(-30, 0);
          g.rotate(angToTarget);
          g.fillStyle = accent;
          g.beginPath();
          g.moveTo(0, -5.5);
          g.lineTo(4.2, 4.5);
          g.lineTo(0, 2.2);
          g.lineTo(-4.2, 4.5);
          g.closePath();
          g.fill();
          g.restore();

          cv.text(
            `${s.carrying ? "DOSTAWA" : "ODBIÓR"} ${distToTarget} m`,
            6,
            0.5,
            { size: 5.8, weight: 700, color: "#f8fafc" }
          );
          g.restore();
        }

        // 3. Telemetria wysokości, prędkości i wskaźnik wiatru w prawym górnym rogu
        const telX = W - 66, telY = 6, telW = 60, telH = 44;
        g.save();
        g.fillStyle = "rgba(10, 17, 32, 0.82)";
        g.strokeStyle = "rgba(56, 189, 248, 0.45)";
        g.lineWidth = 1;
        g.beginPath();
        g.roundRect(telX, telY, telW, telH, 5);
        g.fill();
        g.stroke();

        cv.text(`WYS. ${Math.round(s.y)} m`, telX + 5, telY + 9, {
          size: 4.8,
          weight: 700,
          color: "#f8fafc",
          align: "left",
        });
        cv.text(`PRĘDK. ${Math.round(speed)} m/s`, telX + 5, telY + 19, {
          size: 4.5,
          weight: 600,
          color: "#cbd5e1",
          align: "left",
        });
        cv.text(`WIATR ${Math.round(wind)} m/s`, telX + 5, telY + 31, {
          size: 4.4,
          weight: 600,
          color: "#38bdf8",
          align: "left",
        });

        // Strzałka kierunku wiatru względem drona
        const windRelAngle = Math.atan2(s.windX, s.windZ) - s.yaw;
        g.save();
        g.translate(telX + telW - 9, telY + 31);
        g.rotate(windRelAngle);
        g.strokeStyle = "#38bdf8";
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, 4);
        g.lineTo(0, -4);
        g.lineTo(-2.2, -1.5);
        g.moveTo(0, -4);
        g.lineTo(2.2, -1.5);
        g.stroke();
        g.restore();
        g.restore();

        // Aktualizacja bloków panelu
        delivEl.set(
          `${s.delivered} z ${goal}`,
          s.delivered / goal,
          s.carrying ? "Leć do złotego dachu (H)" : "Odbierz z zielonego dachu (H)"
        );
        batEl.set(
          `${Math.round(s.battery)}%`,
          s.battery / 100,
          `Wysokość: ${Math.round(s.y)} m · Błękitne dachy (E) ładują`
        );
        hullEl.set(
          s.hull,
          onRoof ? "Na dachu lądowiska" : `Wiatr boczny ${Math.round(wind)} m/s`
        );
        ctx.progress(s.delivered / goal);
      });
    },
  });
}
