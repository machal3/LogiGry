// Nurek: pływanie 2.5D wśród raf. Tlen, skarby, meduzy; powrót do łodzi.
{
  const W = 300, H = 200;

  function generate({ depth, treasures, hazards }) {
    const loot = [];
    for (let i = 0; i < treasures; i++) {
      const t = (i + 0.4) / treasures;
      loot.push({
        x: 80 + t * 620 + (Math.random() - 0.5) * 40,
        y: depth * (0.55 + Math.random() * 0.35),
        kind: Math.random() < 0.35 ? "chest" : "shell",
        taken: false,
        value: Math.random() < 0.35 ? 2 : 1,
      });
    }
    const jellies = [];
    for (let i = 0; i < hazards; i++) {
      jellies.push({
        x: 100 + Math.random() * 600,
        y: 40 + Math.random() * (depth - 50),
        phase: Math.random() * Math.PI * 2,
        r: 8 + Math.random() * 4,
        amp: 18 + Math.random() * 22,
      });
    }
    const rocks = [];
    for (let i = 0; i < 6 + hazards; i++) {
      rocks.push({
        x: 60 + Math.random() * 680,
        y: depth - 8 - Math.random() * 25,
        w: 14 + Math.random() * 18,
        h: 10 + Math.random() * 16,
      });
    }
    const corals = [];
    for (let i = 0; i < 18; i++) {
      corals.push({
        x: 40 + i * 40 + Math.random() * 20,
        y: depth,
        h: 12 + Math.random() * 28,
        hue: 280 + Math.random() * 80,
      });
    }
    const fish = [];
    for (let i = 0; i < 10; i++) {
      fish.push({
        x: Math.random() * 700,
        y: 30 + Math.random() * (depth - 40),
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 12 + Math.random() * 20,
        c: `hsl(${30 + Math.random() * 40},70%,55%)`,
      });
    }
    return { loot, jellies, rocks, corals, fish, depth, worldW: 760, boatX: 50 };
  }

  function nearBoat(diver, world) {
    return diver.y < 18 && Math.abs(diver.x - world.boatX) < 28;
  }

  function hitsRock(diver, rocks) {
    for (const r of rocks) {
      if (Math.abs(diver.x - r.x) < r.w * 0.55 && Math.abs(diver.y - (r.y - r.h * 0.4)) < r.h * 0.55) return r;
    }
    return null;
  }

  function hitsJelly(diver, j, t) {
    const jx = j.x + Math.sin(t * 0.8 + j.phase) * j.amp;
    const jy = j.y + Math.cos(t * 0.6 + j.phase) * 10;
    return Math.hypot(diver.x - jx, diver.y - jy) < j.r + 7;
  }

  if (typeof module !== "undefined") module.exports = { generate, nearBoat, hitsRock, hitsJelly, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "nurek",
    cat: "przygodowe",
    big: true,
    name: "Nurek",
    author: "Composer",
    desc: "Nurkuj wśród raf, zbieraj skarby i wróć na powierzchnię zanim skończy się tlen.",
    color: "#1d4ed8",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "#.#.#", ".###.", "..#.."],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, depth: 140, treasures: 4, hazards: 3, drain: 4.5, goal: 4 },
      { key: "medium", name: "Średni", points: 50, depth: 175, treasures: 6, hazards: 5, drain: 5.8, goal: 6 },
      { key: "hard", name: "Trudny", points: 100, depth: 210, treasures: 8, hazards: 8, drain: 7.2, goal: 8 },
    ],
    rules: [
      "Pływaj strzałkami albo WASD. Na telefonie użyj touchpada. Spacja przyspiesza wynurzenie.",
      "Zbieraj skrzynie i muszle. Pod wodą ubywa tlenu; przy powierzchni napełnia się z powrotem.",
      "Omijaj meduzy i ostre skały. Trzy uderzenia albo wyczerpanie tlenu kończy nurkowanie.",
      "Po zebraniu wymaganych skarbów wróć do łodzi na powierzchni, by wygrać.",
    ],
    achievements: [
      { id: "pierwszy-lup", name: "Pierwszy łup", desc: "Zbierz pierwszy skarb w nurkowaniu.", points: 10 },
      { id: "pelne-pluca", name: "Pełne płuca", desc: "Wygraj poziom z co najmniej 40% tlenu.", points: 25 },
      { id: "bez-parzenia", name: "Bez parzenia", desc: "Ukończ średni lub trudny poziom bez utraty życia.", points: 25 },
      { id: "gleboki-zanur", name: "Głębinowiec", desc: "Wygraj trudny poziom w mniej niż 120 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const world = generate(L);
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "arcade" });
      const { g } = cv;

      const s = {
        x: world.boatX,
        y: 12,
        vx: 0,
        vy: 0,
        o2: 100,
        lives: 3,
        loot: 0,
        inv: 0,
        flash: 0,
        t: 0,
        bubbles: [],
        sparks: [],
        firstLoot: false,
        hurt: false,
        doneAnim: 0,
        facing: 1,
      };

      const lootEl = statBlock(ctx, "Skarby", { meter: true });
      const o2El = statBlock(ctx, "Tlen", { meter: true });
      const lifeEl = statBlock(ctx, "Życia", { small: true });
      const depthEl = statBlock(ctx, "Głębokość", { small: true });

      const keys = heldKeys(ctx);
      const touch = {};
      touchPad(ctx, touch, [
        ["l", "Lewo", "i-left"],
        ["u", "W górę", "i-up"],
        ["r", "Prawo", "i-right"],
        ["d", "W dół", "i-down"],
      ], "c2");

      cv.loop((dt) => {
        s.t += dt;
        if (!ctx.done && !s.doneAnim) update(dt);
        else if (s.doneAnim) {
          s.doneAnim += dt;
          if (s.doneAnim > 0.9 && !ctx.done) endWin();
        }
        draw();
      });

      function update(dt) {
        const left = keys.arrowleft || keys.a || touch.l;
        const right = keys.arrowright || keys.d || touch.r;
        const up = keys.arrowup || keys.w || keys[" "] || touch.u;
        const down = keys.arrowdown || keys.s || touch.d;

        const ax = (right ? 1 : 0) - (left ? 1 : 0);
        const ay = (down ? 1 : 0) - (up ? 1 : 0);
        if (ax) s.facing = ax;
        s.vx += (ax * 70 - s.vx) * Math.min(1, dt * 4);
        s.vy += (ay * 55 - s.vy) * Math.min(1, dt * 4);
        // lekka wyporność
        if (!down) s.vy -= 8 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.x = Math.max(20, Math.min(world.worldW - 20, s.x));
        s.y = Math.max(6, Math.min(world.depth - 6, s.y));

        if (s.y < 16) {
          s.o2 = Math.min(100, s.o2 + 28 * dt);
        } else {
          s.o2 -= L.drain * dt * (1 + s.y / world.depth * 0.35);
          if (s.o2 <= 0) {
            s.o2 = 0;
            return ctx.lose("Brak tlenu", `Zebrano ${s.loot} z ${L.goal} skarbów.`);
          }
        }

        s.inv = Math.max(0, s.inv - dt);
        s.flash = Math.max(0, s.flash - dt);

        // skarby
        for (const item of world.loot) {
          if (item.taken) continue;
          if (Math.hypot(s.x - item.x, s.y - item.y) < 14) {
            item.taken = true;
            s.loot += item.value;
            Sound.place(1 + (s.loot % 9));
            burst(item.x, item.y, "#fbbf24", 12);
            if (!s.firstLoot) { s.firstLoot = true; ctx.achieve("pierwszy-lup"); }
          }
        }

        // meduzy
        if (s.inv <= 0) {
          for (const j of world.jellies) {
            if (hitsJelly(s, j, s.t)) { hurt("Meduza"); break; }
          }
        }
        if (s.inv <= 0) {
          const rock = hitsRock(s, world.rocks);
          if (rock) { hurt("Skała"); s.vy = -30; }
        }

        // ryby dekoracyjne
        for (const f of world.fish) {
          f.x += f.dir * f.speed * dt;
          if (f.x < 0 || f.x > world.worldW) f.dir *= -1;
        }

        if (Math.random() < dt * 8 && s.y > 20) {
          s.bubbles.push({ x: s.x + (Math.random() - 0.5) * 6, y: s.y, r: 1 + Math.random() * 2, life: 1.2 });
        }
        for (const b of s.bubbles) { b.y -= 28 * dt; b.life -= dt; b.x += Math.sin(s.t * 3 + b.y) * 6 * dt; }
        s.bubbles = s.bubbles.filter((b) => b.life > 0 && b.y > 0);
        for (const p of s.sparks) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
        s.sparks = s.sparks.filter((p) => p.life > 0);

        if (s.loot >= L.goal && nearBoat(s, world)) {
          s.doneAnim = 0.01;
          Sound.line();
        }

        renderHud();
      }

      function hurt(why) {
        s.lives--;
        s.hurt = true;
        s.inv = 1.4;
        s.flash = 0.45;
        Sound.error();
        ctx.toast(`${why} (−1)`);
        burst(s.x, s.y, "#fda4af", 10);
        if (s.lives <= 0) ctx.lose("Koniec nurkowania", `Zebrano ${s.loot} z ${L.goal} skarbów.`);
      }

      function burst(x, y, c, n) {
        for (let i = 0; i < n; i++) {
          s.sparks.push({
            x, y, c,
            vx: (Math.random() - 0.5) * 60,
            vy: (Math.random() - 0.5) * 60,
            life: 0.35 + Math.random() * 0.3,
          });
        }
      }

      function endWin() {
        if (s.o2 >= 40) ctx.achieve("pelne-pluca");
        if (!s.hurt && L.key !== "easy") ctx.achieve("bez-parzenia");
        if (L.key === "hard" && ctx.time < 120) ctx.achieve("gleboki-zanur");
        ctx.win(`Skarby: ${s.loot}. Tlen: ${Math.round(s.o2)}%.`);
      }

      function cam() {
        return {
          x: Math.max(0, Math.min(world.worldW - W, s.x - W * 0.4)),
          y: Math.max(0, Math.min(world.depth + 20 - H, s.y - H * 0.45)),
        };
      }

      function draw() {
        const c = cam();
        // woda — gradient głębokości
        const skyH = Math.max(0, 22 - c.y);
        if (skyH > 0) {
          const sg = g.createLinearGradient(0, 0, 0, skyH);
          sg.addColorStop(0, "#7dd3fc");
          sg.addColorStop(1, "#0ea5e9");
          g.fillStyle = sg;
          g.fillRect(0, 0, W, skyH);
        }
        const waterTop = Math.max(0, 22 - c.y);
        const wg = g.createLinearGradient(0, waterTop, 0, H);
        wg.addColorStop(0, "#0284c7");
        wg.addColorStop(0.35, "#0369a1");
        wg.addColorStop(0.7, "#1e3a5f");
        wg.addColorStop(1, "#0f172a");
        g.fillStyle = wg;
        g.fillRect(0, waterTop, W, H - waterTop);

        // promienie światła
        g.save();
        g.globalAlpha = 0.12;
        for (let i = 0; i < 5; i++) {
          const bx = ((i * 70 + s.t * 8) % (W + 40)) - 20;
          g.fillStyle = "#bae6fd";
          g.beginPath();
          g.moveTo(bx, waterTop);
          g.lineTo(bx + 18, waterTop);
          g.lineTo(bx + 40, H);
          g.lineTo(bx - 10, H);
          g.fill();
        }
        g.restore();

        // dno
        const floorY = world.depth - c.y;
        if (floorY < H) {
          g.fillStyle = "#78716c";
          g.fillRect(0, floorY, W, H - floorY + 4);
          g.fillStyle = "#a8a29e";
          for (let x = 0; x < W; x += 12) {
            const h = 2 + ((x + Math.floor(c.x)) % 7);
            g.fillRect(x, floorY - h, 8, h);
          }
        }

        // korale
        for (const cor of world.corals) {
          const sx = cor.x - c.x, sy = cor.y - c.y;
          if (sx < -20 || sx > W + 20) continue;
          g.strokeStyle = `hsl(${cor.hue},55%,45%)`;
          g.lineWidth = 3;
          g.beginPath();
          g.moveTo(sx, sy);
          g.quadraticCurveTo(sx + Math.sin(s.t + cor.x) * 6, sy - cor.h * 0.5, sx + 4, sy - cor.h);
          g.stroke();
          g.fillStyle = `hsl(${cor.hue + 20},60%,60%)`;
          g.beginPath(); g.arc(sx + 4, sy - cor.h, 4, 0, Math.PI * 2); g.fill();
        }

        // skały
        for (const r of world.rocks) {
          const sx = r.x - c.x, sy = r.y - c.y;
          if (sx < -40 || sx > W + 40) continue;
          g.fillStyle = "#57534e";
          g.beginPath();
          g.moveTo(sx - r.w / 2, sy);
          g.lineTo(sx - r.w * 0.2, sy - r.h);
          g.lineTo(sx + r.w * 0.3, sy - r.h * 0.7);
          g.lineTo(sx + r.w / 2, sy);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.15)";
          g.fillRect(sx - 4, sy - r.h * 0.6, 6, 4);
        }

        // skarby
        for (const item of world.loot) {
          if (item.taken) continue;
          const sx = item.x - c.x, sy = item.y - c.y + Math.sin(s.t * 3 + item.x) * 2;
          if (sx < -20 || sx > W + 20) continue;
          if (item.kind === "chest") {
            g.fillStyle = "#b45309";
            g.fillRect(sx - 8, sy - 6, 16, 12);
            g.fillStyle = "#fbbf24";
            g.fillRect(sx - 8, sy - 2, 16, 3);
            g.fillStyle = "#fde68a";
            g.beginPath(); g.arc(sx, sy - 2, 2, 0, Math.PI * 2); g.fill();
          } else {
            g.fillStyle = "#f472b6";
            g.beginPath();
            g.ellipse(sx, sy, 7, 5, 0, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = "#fff";
            g.lineWidth = 1;
            g.beginPath(); g.arc(sx - 1, sy, 3, 0.2, 2.5); g.stroke();
          }
        }

        // meduzy
        for (const j of world.jellies) {
          const jx = j.x + Math.sin(s.t * 0.8 + j.phase) * j.amp - c.x;
          const jy = j.y + Math.cos(s.t * 0.6 + j.phase) * 10 - c.y;
          if (jx < -30 || jx > W + 30) continue;
          g.fillStyle = "rgba(244,114,182,0.55)";
          g.beginPath(); g.arc(jx, jy, j.r, Math.PI, 0); g.fill();
          g.fillStyle = "rgba(251,207,232,0.5)";
          g.beginPath(); g.ellipse(jx, jy, j.r, j.r * 0.55, 0, 0, Math.PI); g.fill();
          g.strokeStyle = "rgba(244,114,182,0.7)";
          g.lineWidth = 1;
          for (let k = -2; k <= 2; k++) {
            g.beginPath();
            g.moveTo(jx + k * 3, jy);
            g.quadraticCurveTo(jx + k * 3 + Math.sin(s.t * 4 + k) * 3, jy + 10, jx + k * 3, jy + 16);
            g.stroke();
          }
        }

        // ryby
        for (const f of world.fish) {
          const sx = f.x - c.x, sy = f.y - c.y;
          if (sx < -20 || sx > W + 20) continue;
          g.fillStyle = f.c;
          g.beginPath();
          g.ellipse(sx, sy, 6, 3, 0, 0, Math.PI * 2);
          g.fill();
          g.beginPath();
          g.moveTo(sx - f.dir * 6, sy);
          g.lineTo(sx - f.dir * 11, sy - 4);
          g.lineTo(sx - f.dir * 11, sy + 4);
          g.fill();
        }

        // łódź
        const bx = world.boatX - c.x, by = 10 - c.y;
        if (bx > -40 && bx < W + 40) {
          g.fillStyle = "#92400e";
          g.beginPath();
          g.moveTo(bx - 22, by + 6);
          g.lineTo(bx + 22, by + 6);
          g.lineTo(bx + 16, by + 14);
          g.lineTo(bx - 16, by + 14);
          g.fill();
          g.fillStyle = "#fef3c7";
          g.fillRect(bx - 4, by - 16, 3, 22);
          g.fillStyle = "#dc2626";
          g.beginPath();
          g.moveTo(bx - 1, by - 16);
          g.lineTo(bx + 14, by - 10);
          g.lineTo(bx - 1, by - 4);
          g.fill();
          if (s.loot >= L.goal) {
            g.fillStyle = "#4ade80";
            g.font = "10px sans-serif";
            g.textAlign = "center";
            g.fillText("↑ łódź", bx, by - 22);
          }
        }

        // bąbelki i iskry
        g.fillStyle = "rgba(255,255,255,0.45)";
        for (const b of s.bubbles) {
          g.beginPath(); g.arc(b.x - c.x, b.y - c.y, b.r, 0, Math.PI * 2); g.fill();
        }
        for (const p of s.sparks) {
          g.globalAlpha = Math.max(0, p.life * 2);
          g.fillStyle = p.c;
          g.fillRect(p.x - c.x, p.y - c.y, 2, 2);
        }
        g.globalAlpha = 1;

        drawDiver(c);

        if (s.flash > 0) {
          g.fillStyle = `rgba(248,113,113,${s.flash * 0.45})`;
          g.fillRect(0, 0, W, H);
        }
        if (s.doneAnim) {
          g.fillStyle = `rgba(125,211,252,${Math.min(0.7, s.doneAnim)})`;
          g.fillRect(0, 0, W, H);
        }

        // pasek tlenu na canvasie
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.fillRect(10, 8, W - 20, 5);
        g.fillStyle = s.o2 < 25 ? "#f87171" : "#38bdf8";
        g.fillRect(10, 8, (W - 20) * (s.o2 / 100), 5);
      }

      function drawDiver(c) {
        if (s.inv > 0 && Math.floor(s.inv * 12) % 2) return;
        const sx = s.x - c.x, sy = s.y - c.y;
        g.save();
        g.translate(sx, sy);
        g.scale(s.facing, 1);
        // płetwy
        g.fillStyle = "#1e293b";
        g.beginPath();
        g.moveTo(-10, 4);
        g.lineTo(-18, 2 + Math.sin(s.t * 10) * 3);
        g.lineTo(-18, 8 + Math.sin(s.t * 10) * 3);
        g.fill();
        // ciało / pianka
        g.fillStyle = "#0f766e";
        g.beginPath(); g.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2); g.fill();
        // butla
        g.fillStyle = "#334155";
        g.fillRect(-4, -8, 5, 12);
        // głowa + maska
        g.fillStyle = "#fde68a";
        g.beginPath(); g.arc(6, -2, 5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#22d3ee";
        g.beginPath(); g.ellipse(8, -2, 3, 2.5, 0, 0, Math.PI * 2); g.fill();
        // skrzynia w ręku
        if (s.loot > 0 && s.loot < L.goal) {
          g.fillStyle = "#b45309";
          g.fillRect(4, 4, 7, 5);
        }
        g.restore();
      }

      function renderHud() {
        lootEl.set(`${Math.min(s.loot, L.goal)} / ${L.goal}`, Math.min(1, s.loot / L.goal));
        o2El.set(`${Math.round(s.o2)}%`, s.o2 / 100, s.y < 16 ? "Powierzchnia" : "Pod wodą");
        lifeEl.set(`${s.lives} z 3`);
        depthEl.set(`${Math.round(s.y)} m`, null, `dno ${L.depth} m`);
        ctx.progress(Math.min(1, s.loot / L.goal) * 0.85 + (s.doneAnim ? 0.15 : nearBoat(s, world) && s.loot >= L.goal ? 0.15 : 0));
      }
      renderHud();
    },
  });
}
