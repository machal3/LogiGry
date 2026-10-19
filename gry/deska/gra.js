// Deska: perspektywiczny zjazd snowboardem po stoku (pseudo-3D).
// Generowany tor z bramkami, drzewami i skałami; skok pozwala przelecieć nad przeszkodami.
{
  const W = 280, H = 180, CAM_H = 1.15, FOV = 210, NEAR = 2.2, FAR = 95;

  function generate({ length, dens, gates }) {
    const objs = [];
    let safeX = 0;
    let z = 28;
    let gateCount = 0;
    while (z < length - 40) {
      const prog = z / length;
      const spread = 0.55 + prog * 0.25;
      // bramka slalomu — przesunięta, ale osiągalna
      const gateAt = 30 + (gateCount + 0.5) * ((length - 80) / gates);
      if (gateCount < gates && z >= gateAt) {
        const gx = Math.max(-0.65, Math.min(0.65, safeX + (Math.random() - 0.5) * 0.45));
        safeX = gx;
        objs.push({ type: "gate", z, x: gx, w: 0.32 + (1 - prog) * 0.06, hit: false });
        gateCount++;
        z += 10 + rnd(5);
        continue;
      }
      // przeszkody poza bezpieczną ścieżką
      const side = Math.random() < 0.5 ? -1 : 1;
      const ox = safeX + side * (0.22 + Math.random() * spread);
      const kind = Math.random();
      if (kind < 0.42 * dens) objs.push({ type: "tree", z, x: Math.max(-0.95, Math.min(0.95, ox)), hit: false });
      else if (kind < 0.72 * dens) objs.push({ type: "rock", z, x: Math.max(-0.9, Math.min(0.9, ox * 0.7 + (Math.random() - 0.5) * 0.2)), hit: false });
      else if (kind < 0.9) objs.push({ type: "crystal", z, x: safeX + (Math.random() - 0.5) * 0.35, hit: false });
      // dekoracyjne drzewa na brzegach
      if (Math.random() < 0.55) {
        objs.push({ type: "tree", z: z + Math.random() * 3, x: -0.85 - Math.random() * 0.2, hit: false, decor: true });
        objs.push({ type: "tree", z: z + Math.random() * 3, x: 0.85 + Math.random() * 0.2, hit: false, decor: true });
      }
      safeX += (Math.random() - 0.5) * 0.18;
      safeX = Math.max(-0.55, Math.min(0.55, safeX));
      z += 4 + rnd(5) * (1.15 - dens * 0.2);
    }
    objs.push({ type: "finish", z: length - 8, x: 0, hit: false });
    objs.sort((a, b) => a.z - b.z);
    return { objs, length, firstSafe: 0 };
  }

  function project(x, y, z, camX) {
    const rz = z;
    if (rz < 0.4) return null;
    const scale = FOV / rz;
    return {
      sx: W / 2 + (x - camX) * scale * 78,
      sy: H * 0.42 + (CAM_H - y) * scale * 52,
      sc: scale,
      z: rz,
    };
  }

  function hitsPlayer(obj, px, airborne) {
    if (obj.decor || obj.hit) return null;
    const dx = Math.abs(obj.x - px);
    if (obj.type === "gate") {
      if (dx < obj.w) return "gate";
      return null;
    }
    if (obj.type === "crystal") {
      if (dx < 0.12) return "crystal";
      return null;
    }
    if (obj.type === "finish") {
      if (dx < 0.9) return "finish";
      return null;
    }
    // drzewo / skała
    const r = obj.type === "tree" ? 0.11 : 0.13;
    if (dx < r) {
      if (airborne && obj.type === "rock") return null; // skok nad skałą
      if (airborne && obj.type === "tree" && airborne > 0.35) return null;
      return "crash";
    }
    return null;
  }

  if (typeof module !== "undefined") module.exports = { generate, project, hitsPlayer, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "deska",
    cat: "zrecznosciowe",
    big: true,
    name: "Deska",
    author: "Composer",
    desc: "Zjeżdżaj na desce po stoku, mijaj bramki i skacz przez przeszkody do mety.",
    color: "#3d8bfd",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "##.##", ".###.", "#...#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, length: 520, dens: 0.75, gates: 8, speed: 28, maxSpeed: 42, lives: 4, time: 95 },
      { key: "medium", name: "Średni", points: 50, length: 720, dens: 1.05, gates: 12, speed: 32, maxSpeed: 52, lives: 3, time: 85 },
      { key: "hard", name: "Trudny", points: 100, length: 920, dens: 1.35, gates: 16, speed: 36, maxSpeed: 62, lives: 3, time: 78 },
    ],
    rules: [
      "Strzałki albo A/D przechylają deskę. Na telefonie przechyl palcem w lewo lub prawo po stoku.",
      "Spacja albo stuknięcie w górną część planszy to skok — przelecisz nad skałami i niskimi drzewami.",
      "Mijaj bramki z flagami i zbieraj płatki śniegu. Zderzenie z przeszkodą zabiera życie.",
      "Dojechanie do mety przed końcem czasu wygrywa zjazd. Utrata wszystkich żyć albo czas kończy partię.",
    ],
    achievements: [
      { id: "bramkarz", name: "Slalomista", desc: "Zalicz wszystkie bramki w jednym zjeździe.", points: 10 },
      { id: "platki", name: "Śnieżynka", desc: "Zbierz 15 płatków śniegu w jednym zjeździe.", points: 10 },
      { id: "czysty-stok", name: "Czysty stok", desc: "Ukończ średni lub trudny poziom bez utraty życia.", points: 25 },
      { id: "skoczek", name: "Lotnik", desc: "Wykonaj 8 skoków w jednym zjeździe.", points: 25 },
      { id: "mistrz-stoku", name: "Mistrz stoku", desc: "Wygraj trudny poziom bez utraty życia i z wszystkimi bramkami.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const course = generate(L);
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "arcade" });
      const { g } = cv;

      const s = {
        z: 0, x: 0, vx: 0, speed: L.speed,
        lives: L.lives, lost: 0,
        gates: 0, gateTotal: course.objs.filter((o) => o.type === "gate").length,
        crystals: 0, jumps: 0,
        air: 0, airT: 0, inv: 0, flash: 0,
        t: 0, timeLeft: L.time,
        powder: [], flakes: [], finished: 0,
        lean: 0, nextIdx: 0,
        allGates: true, clean: true,
      };

      // śnieg w powietrzu
      for (let i = 0; i < 40; i++) s.flakes.push({ x: Math.random() * W, y: Math.random() * H, v: 20 + Math.random() * 40, s: 0.6 + Math.random() });

      const distEl = statBlock(ctx, "Dystans", { meter: true });
      const lifeEl = statBlock(ctx, "Życia", { small: true });
      const gateEl = statBlock(ctx, "Bramki", { small: true });
      const timeEl = statBlock(ctx, "Czas", { small: true });

      const keys = heldKeys(ctx);
      let touchX = null, jumpTap = false;
      ctx.on(cv.cv, "pointerdown", (e) => {
        e.preventDefault();
        cv.cv.setPointerCapture?.(e.pointerId);
        const [px, py] = cv.at(e);
        if (py < H * 0.35) jumpTap = true;
        else touchX = px;
      });
      ctx.on(cv.cv, "pointermove", (e) => { if (touchX != null) touchX = cv.at(e)[0]; });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { touchX = null; });

      touchPad(ctx, keys, [
        { key: "arrowleft", icon: "i-left" },
        { key: " ", icon: "i-up", label: "Skok" },
        { key: "arrowright", icon: "i-right" },
      ]);

      cv.loop((dt) => {
        s.t += dt;
        if (!ctx.done && !s.finished) update(dt);
        else if (s.finished) {
          s.finished += dt;
          s.z += s.speed * dt;
          if (s.finished > 1.1 && !ctx.done) endWin();
        }
        draw(dt);
      });

      function wantJump() {
        return keys[" "] || keys.arrowup || keys.w || jumpTap;
      }

      function update(dt) {
        s.timeLeft -= dt;
        if (s.timeLeft <= 0) {
          s.timeLeft = 0;
          return ctx.lose("Koniec czasu", `Dystans: ${Math.round((s.z / course.length) * 100)}%. Bramki: ${s.gates}/${s.gateTotal}.`);
        }

        let dir = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
        if (touchX != null) dir = touchX < W / 2 - 8 ? -1 : touchX > W / 2 + 8 ? 1 : 0;

        s.vx += (dir * 1.55 - s.vx) * Math.min(1, dt * 10);
        s.x += s.vx * dt;
        s.x = Math.max(-0.92, Math.min(0.92, s.x));
        s.lean += (dir - s.lean) * Math.min(1, dt * 8);

        if (s.air > 0) {
          s.airT += dt;
          s.air -= dt;
          if (s.air < 0) s.air = 0;
        } else if (wantJump()) {
          jumpTap = false;
          s.air = 0.72;
          s.airT = 0;
          s.jumps++;
          Sound.tap();
          if (s.jumps >= 8) ctx.achieve("skoczek");
          for (let i = 0; i < 8; i++) {
            s.powder.push({ x: s.x + (Math.random() - 0.5) * 0.1, z: 0, life: 0.4 + Math.random() * 0.3, vx: (Math.random() - 0.5) * 0.4 });
          }
        }
        jumpTap = false;

        s.speed = Math.min(L.maxSpeed, s.speed + 1.8 * dt);
        const before = s.z;
        s.z += s.speed * dt;
        s.inv = Math.max(0, s.inv - dt);
        s.flash = Math.max(0, s.flash - dt);

        // proszek przy skręcie
        if (Math.abs(s.vx) > 0.4 && s.air <= 0 && Math.random() < dt * 18) {
          s.powder.push({ x: s.x - Math.sign(s.vx) * 0.08, z: 0, life: 0.25 + Math.random() * 0.2, vx: -s.vx * 0.15 });
        }

        // kolizje z obiektami mijanymi
        while (s.nextIdx < course.objs.length && course.objs[s.nextIdx].z - NEAR <= s.z) {
          const o = course.objs[s.nextIdx++];
          if (o.z - NEAR <= before) continue;
          const airH = s.air > 0 ? Math.sin(Math.min(1, s.airT / 0.36) * Math.PI) : 0;
          const res = hitsPlayer(o, s.x, airH);
          if (!res) {
            if (o.type === "gate") { s.allGates = false; }
            continue;
          }
          if (res === "gate") {
            o.hit = true;
            s.gates++;
            Sound.place(1 + (s.gates % 9));
            burst(0.2, "#ff6b6b", 6);
            burst(-0.2, "#4dabf7", 6);
          } else if (res === "crystal") {
            o.hit = true;
            s.crystals++;
            Sound.line();
            burst(0, "#e7f5ff", 10);
            if (s.crystals >= 15) ctx.achieve("platki");
          } else if (res === "finish") {
            o.hit = true;
            s.finished = 0.01;
            Sound.line();
          } else if (res === "crash" && s.inv <= 0) {
            o.hit = true;
            s.lives--;
            s.lost++;
            s.clean = false;
            s.inv = 1.4;
            s.flash = 0.45;
            s.speed = Math.max(L.speed * 0.85, s.speed * 0.65);
            Sound.error();
            burst(0, "#fff", 18);
            if (s.lives <= 0) {
              return ctx.lose("Upadek", `Bramki: ${s.gates}/${s.gateTotal}. Płatki: ${s.crystals}.`);
            }
            ctx.toast("Upadek (−1 życie)");
          }
        }

        for (const p of s.powder) {
          p.life -= dt;
          p.x += (p.vx || 0) * dt;
          p.z += s.speed * 0.3 * dt;
        }
        s.powder = s.powder.filter((p) => p.life > 0);

        for (const f of s.flakes) {
          f.y += f.v * dt;
          f.x += Math.sin(s.t * 2 + f.y * 0.05) * 12 * dt;
          if (f.y > H) { f.y = -4; f.x = Math.random() * W; }
        }

        renderHud();
      }

      function burst(ox, c, n) {
        for (let i = 0; i < n; i++) {
          s.powder.push({
            x: s.x + ox + (Math.random() - 0.5) * 0.15,
            z: 0.5,
            life: 0.35 + Math.random() * 0.4,
            vx: (Math.random() - 0.5) * 0.8,
            c,
          });
        }
      }

      function endWin() {
        if (s.gates >= s.gateTotal) ctx.achieve("bramkarz");
        if (s.clean && L.key !== "easy") ctx.achieve("czysty-stok");
        if (s.clean && s.allGates && s.gates >= s.gateTotal && L.key === "hard") ctx.achieve("mistrz-stoku");
        ctx.win(`Bramki ${s.gates}/${s.gateTotal}, płatki ${s.crystals}, skoki ${s.jumps}.`);
      }

      function draw(dt) {
        // niebo alpejskie
        const sky = g.createLinearGradient(0, 0, 0, H * 0.55);
        sky.addColorStop(0, "#1a3a6b");
        sky.addColorStop(0.45, "#5b8ec9");
        sky.addColorStop(1, "#c8ddf5");
        g.fillStyle = sky;
        g.fillRect(0, 0, W, H);

        // słońce
        const sunX = W * 0.78, sunY = H * 0.16;
        const sg = g.createRadialGradient(sunX, sunY, 2, sunX, sunY, 38);
        sg.addColorStop(0, "rgba(255,240,200,0.95)");
        sg.addColorStop(0.4, "rgba(255,200,120,0.35)");
        sg.addColorStop(1, "rgba(255,180,80,0)");
        g.fillStyle = sg;
        g.beginPath(); g.arc(sunX, sunY, 38, 0, Math.PI * 2); g.fill();

        // dalekie szczyty
        drawPeaks(H * 0.38, 0.35, "#6a8ab0");
        drawPeaks(H * 0.42, 0.55, "#8aa8c8");

        // stok — paski perspektywy
        const horizon = H * 0.42;
        g.fillStyle = "#e8f1fa";
        g.beginPath();
        g.moveTo(0, horizon);
        g.lineTo(W, horizon);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        const camX = s.x * 0.35;
        // siatka stoku
        for (let i = 0; i < 28; i++) {
          const z = ((s.z * 0.35 + i * 4) % (FAR - 4)) + 4;
          const pL = project(-1.15, 0, z, camX);
          const pR = project(1.15, 0, z, camX);
          if (!pL || !pR) continue;
          const fog = Math.max(0.08, 1 - z / FAR);
          g.strokeStyle = `rgba(160,190,220,${0.15 + 0.35 * fog})`;
          g.lineWidth = Math.max(0.4, 2.2 * fog);
          g.beginPath(); g.moveTo(pL.sx, pL.sy); g.lineTo(pR.sx, pR.sy); g.stroke();
        }
        // krawędzie stoku (śnieżne wały)
        for (let side of [-1, 1]) {
          g.beginPath();
          let started = false;
          for (let z = FAR; z > 2; z -= 2.5) {
            const p = project(side * 1.05, 0.02, z, camX);
            if (!p) continue;
            if (!started) { g.moveTo(p.sx, p.sy); started = true; }
            else g.lineTo(p.sx, p.sy);
          }
          g.strokeStyle = "rgba(255,255,255,0.55)";
          g.lineWidth = 3;
          g.stroke();
        }

        // obiekty od dalekich
        const visible = course.objs.filter((o) => {
          const dz = o.z - s.z;
          return dz > 1.5 && dz < FAR && !o.hit;
        });
        visible.sort((a, b) => b.z - a.z);
        for (const o of visible) {
          const dz = o.z - s.z;
          const fog = Math.max(0.2, 1 - dz / FAR);
          if (o.type === "tree") drawTree(o.x, dz, camX, fog, !!o.decor);
          else if (o.type === "rock") drawRock(o.x, dz, camX, fog);
          else if (o.type === "gate") drawGate(o, dz, camX, fog);
          else if (o.type === "crystal") drawCrystal(o.x, dz, camX, fog);
          else if (o.type === "finish") drawFinish(dz, camX, fog);
        }

        // proszek
        for (const p of s.powder) {
          const pz = NEAR + (p.z || 0);
          const pp = project(p.x, 0.05, Math.max(1.2, pz), camX);
          if (!pp) continue;
          g.globalAlpha = Math.max(0, p.life * 2);
          g.fillStyle = p.c || "#fff";
          const sz = Math.max(1, pp.sc * 0.04);
          g.beginPath(); g.arc(pp.sx, pp.sy, sz, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;

        // płatki śniegu na pierwszym planie
        g.fillStyle = "rgba(255,255,255,0.7)";
        for (const f of s.flakes) {
          g.beginPath(); g.arc(f.x, f.y, f.s, 0, Math.PI * 2); g.fill();
        }

        drawRider(camX);

        if (s.flash > 0) {
          g.fillStyle = `rgba(255,80,80,${s.flash * 0.55})`;
          g.fillRect(0, 0, W, H);
        }
        if (s.finished) {
          g.fillStyle = `rgba(255,255,255,${Math.min(0.85, s.finished)})`;
          g.fillRect(0, 0, W, H);
        }

        // HUD na canvasie: lekki pasek czasu
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(10, 8, W - 20, 5);
        g.fillStyle = s.timeLeft < 15 ? "#ff6b6b" : "#74c0fc";
        g.fillRect(10, 8, (W - 20) * (s.timeLeft / L.time), 5);
      }

      function drawPeaks(baseY, amp, col) {
        g.fillStyle = col;
        g.beginPath();
        g.moveTo(0, baseY + 20);
        for (let x = 0; x <= W; x += 18) {
          const h = Math.sin(x * 0.04 + s.z * 0.002) * 18 * amp + Math.sin(x * 0.09) * 10 * amp;
          g.lineTo(x, baseY - h);
        }
        g.lineTo(W, baseY + 30);
        g.closePath();
        g.fill();
        // śnieg na graniach
        g.strokeStyle = "rgba(255,255,255,0.45)";
        g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x <= W; x += 18) {
          const h = Math.sin(x * 0.04 + s.z * 0.002) * 18 * amp + Math.sin(x * 0.09) * 10 * amp;
          x === 0 ? g.moveTo(x, baseY - h) : g.lineTo(x, baseY - h);
        }
        g.stroke();
      }

      function drawTree(x, z, camX, fog, decor) {
        const base = project(x, 0, z, camX);
        const top = project(x, decor ? 1.4 : 1.8, z, camX);
        if (!base || !top) return;
        const w = base.sc * (decor ? 0.09 : 0.12);
        // pień
        g.fillStyle = `rgba(90,55,30,${fog})`;
        g.fillRect(base.sx - w * 0.15, top.sy + (base.sy - top.sy) * 0.7, w * 0.3, (base.sy - top.sy) * 0.35);
        // korona
        const cg = g.createLinearGradient(base.sx, top.sy, base.sx, base.sy);
        cg.addColorStop(0, `rgba(40,120,70,${fog})`);
        cg.addColorStop(1, `rgba(20,70,40,${fog})`);
        g.fillStyle = cg;
        g.beginPath();
        g.moveTo(base.sx, top.sy);
        g.lineTo(base.sx + w, base.sy - (base.sy - top.sy) * 0.15);
        g.lineTo(base.sx - w, base.sy - (base.sy - top.sy) * 0.15);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(base.sx, top.sy + (base.sy - top.sy) * 0.25);
        g.lineTo(base.sx + w * 0.85, base.sy);
        g.lineTo(base.sx - w * 0.85, base.sy);
        g.closePath();
        g.fill();
        // śnieg na czubku
        g.fillStyle = `rgba(255,255,255,${0.7 * fog})`;
        g.beginPath();
        g.moveTo(base.sx, top.sy);
        g.lineTo(base.sx + w * 0.35, top.sy + (base.sy - top.sy) * 0.2);
        g.lineTo(base.sx - w * 0.35, top.sy + (base.sy - top.sy) * 0.2);
        g.fill();
      }

      function drawRock(x, z, camX, fog) {
        const p = project(x, 0, z, camX);
        if (!p) return;
        const w = p.sc * 0.1, h = p.sc * 0.07;
        g.fillStyle = `rgba(90,100,120,${fog})`;
        g.beginPath();
        g.moveTo(p.sx - w, p.sy);
        g.lineTo(p.sx - w * 0.5, p.sy - h);
        g.lineTo(p.sx + w * 0.3, p.sy - h * 1.15);
        g.lineTo(p.sx + w, p.sy);
        g.closePath();
        g.fill();
        g.fillStyle = `rgba(200,210,220,${0.5 * fog})`;
        g.beginPath();
        g.moveTo(p.sx - w * 0.4, p.sy - h * 0.3);
        g.lineTo(p.sx - w * 0.2, p.sy - h);
        g.lineTo(p.sx + w * 0.1, p.sy - h * 0.5);
        g.fill();
      }

      function drawGate(o, z, camX, fog) {
        for (const side of [-1, 1]) {
          const px = o.x + side * o.w;
          const base = project(px, 0, z, camX);
          const top = project(px, 1.1, z, camX);
          if (!base || !top) continue;
          g.strokeStyle = `rgba(220,220,230,${fog})`;
          g.lineWidth = Math.max(1, top.sc * 0.025);
          g.beginPath(); g.moveTo(base.sx, base.sy); g.lineTo(top.sx, top.sy); g.stroke();
          // flaga
          const col = side < 0 ? `rgba(255,70,70,${fog})` : `rgba(70,140,255,${fog})`;
          g.fillStyle = col;
          const fw = top.sc * 0.08, fh = top.sc * 0.06;
          g.beginPath();
          g.moveTo(top.sx, top.sy);
          g.lineTo(top.sx + side * fw, top.sy + fh * 0.4);
          g.lineTo(top.sx, top.sy + fh);
          g.closePath();
          g.fill();
        }
        // linia bramki
        const a = project(o.x - o.w, 0.05, z, camX);
        const b = project(o.x + o.w, 0.05, z, camX);
        if (a && b) {
          g.strokeStyle = `rgba(255,255,255,${0.35 * fog})`;
          g.setLineDash([4, 4]);
          g.lineWidth = 1;
          g.beginPath(); g.moveTo(a.sx, a.sy); g.lineTo(b.sx, b.sy); g.stroke();
          g.setLineDash([]);
        }
      }

      function drawCrystal(x, z, camX, fog) {
        const y = 0.35 + Math.sin(s.t * 5 + z) * 0.08;
        const p = project(x, y, z, camX);
        if (!p) return;
        const sz = p.sc * 0.055;
        g.fillStyle = `rgba(180,230,255,${fog})`;
        g.beginPath();
        g.moveTo(p.sx, p.sy - sz);
        g.lineTo(p.sx + sz * 0.7, p.sy);
        g.lineTo(p.sx, p.sy + sz);
        g.lineTo(p.sx - sz * 0.7, p.sy);
        g.closePath();
        g.fill();
        g.fillStyle = `rgba(255,255,255,${0.8 * fog})`;
        g.beginPath();
        g.moveTo(p.sx, p.sy - sz * 0.7);
        g.lineTo(p.sx + sz * 0.25, p.sy);
        g.lineTo(p.sx, p.sy + sz * 0.15);
        g.fill();
      }

      function drawFinish(z, camX, fog) {
        const Lft = project(-0.7, 0, z, camX);
        const Rgt = project(0.7, 0, z, camX);
        const Lt = project(-0.7, 1.6, z, camX);
        const Rt = project(0.7, 1.6, z, camX);
        if (!Lft || !Rgt || !Lt || !Rt) return;
        g.strokeStyle = `rgba(255,255,255,${fog})`;
        g.lineWidth = Math.max(1.5, Lt.sc * 0.03);
        g.beginPath(); g.moveTo(Lft.sx, Lft.sy); g.lineTo(Lt.sx, Lt.sy); g.stroke();
        g.beginPath(); g.moveTo(Rgt.sx, Rgt.sy); g.lineTo(Rt.sx, Rt.sy); g.stroke();
        // baner w kratkę
        const cols = 8;
        for (let i = 0; i < cols; i++) {
          const t0 = i / cols, t1 = (i + 1) / cols;
          const x0 = Lt.sx + (Rt.sx - Lt.sx) * t0;
          const x1 = Lt.sx + (Rt.sx - Lt.sx) * t1;
          const y0 = Lt.sy + (Rt.sy - Lt.sy) * t0;
          const y1 = Lt.sy + (Rt.sy - Lt.sy) * t1;
          g.fillStyle = i % 2 ? `rgba(20,20,20,${fog})` : `rgba(255,255,255,${fog})`;
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.lineTo(x1, y1 + Lt.sc * 0.12);
          g.lineTo(x0, y0 + Lt.sc * 0.12);
          g.fill();
        }
      }

      function drawRider(camX) {
        if (s.inv > 0 && Math.floor(s.inv * 14) % 2) return;
        const airH = s.air > 0 ? Math.sin(Math.min(1, s.airT / 0.36) * Math.PI) * 0.55 : 0;
        const p = project(s.x * 0.15, airH, NEAR + 0.3, camX);
        if (!p) return;
        const lean = s.lean * 0.35;
        g.save();
        g.translate(p.sx, p.sy);
        g.rotate(lean);
        const sc = 1.15;
        // cień
        g.fillStyle = "rgba(80,100,130,0.25)";
        g.beginPath(); g.ellipse(0, 8 * sc, 14 * sc, 4 * sc, 0, 0, Math.PI * 2); g.fill();
        // deska
        const boardG = g.createLinearGradient(-16, 0, 16, 0);
        boardG.addColorStop(0, "#1c7ed6");
        boardG.addColorStop(0.5, "#74c0fc");
        boardG.addColorStop(1, "#1c7ed6");
        g.fillStyle = boardG;
        g.beginPath();
        g.moveTo(-18 * sc, 4 * sc);
        g.quadraticCurveTo(0, 7 * sc, 18 * sc, 4 * sc);
        g.quadraticCurveTo(0, 1 * sc, -18 * sc, 4 * sc);
        g.fill();
        g.strokeStyle = "rgba(255,255,255,0.7)";
        g.lineWidth = 1;
        g.stroke();
        // nogi / ciało
        g.fillStyle = "#212529";
        g.fillRect(-5 * sc, -6 * sc, 4 * sc, 10 * sc);
        g.fillRect(1 * sc, -6 * sc, 4 * sc, 10 * sc);
        g.fillStyle = "#e8590c";
        g.beginPath();
        g.moveTo(-8 * sc, -8 * sc);
        g.lineTo(8 * sc, -8 * sc);
        g.lineTo(6 * sc, -18 * sc);
        g.lineTo(-6 * sc, -18 * sc);
        g.closePath();
        g.fill();
        // głowa + kask
        g.fillStyle = "#ffd8a8";
        g.beginPath(); g.arc(0, -22 * sc, 5 * sc, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#339af0";
        g.beginPath(); g.arc(0, -23 * sc, 5.5 * sc, Math.PI, 0); g.fill();
        // ręce z kijkami (styl snowboard — bez, ale lekkie ramiona)
        g.strokeStyle = "#495057";
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-6 * sc, -14 * sc); g.lineTo(-14 * sc - lean * 8, -6 * sc);
        g.moveTo(6 * sc, -14 * sc); g.lineTo(14 * sc - lean * 8, -6 * sc);
        g.stroke();
        g.restore();
      }

      function renderHud() {
        const f = Math.min(1, s.z / course.length);
        distEl.set(`${Math.round(f * 100)}%`, f, `${Math.round(s.speed)} km/h`);
        lifeEl.set(`${s.lives} z ${L.lives}`);
        gateEl.set(`${s.gates} / ${s.gateTotal}`, null, `Płatki: ${s.crystals}`);
        timeEl.set(fmt(Math.ceil(s.timeLeft)));
        ctx.progress(f);
      }
      renderHud();
    },
  });
}
