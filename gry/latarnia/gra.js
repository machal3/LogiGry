// Latarnia: nocny port. Obracasz wiązką — statki w świetle płyną do portu.
{
  const W = 300, H = 200;

  function generate({ ships, rocks, beam }) {
    const reef = [];
    for (let i = 0; i < rocks; i++) {
      const ang = (i / rocks) * Math.PI * 0.9 + 0.2;
      const dist = 55 + (i % 3) * 28 + Math.random() * 18;
      reef.push({
        x: W / 2 + Math.cos(ang) * dist * (i % 2 ? 1 : -0.7),
        y: 30 + Math.sin(ang) * dist * 0.55 + Math.random() * 20,
        r: 7 + Math.random() * 6,
      });
    }
    // mielizna przy brzegu poza portem
    for (let i = 0; i < 4; i++) {
      reef.push({ x: 20 + i * 18, y: H - 36 - (i % 2) * 8, r: 6 + i % 3 });
      reef.push({ x: W - 20 - i * 18, y: H - 36 - (i % 2) * 8, r: 6 + i % 3 });
    }
    return {
      reef,
      beamHalf: beam,
      harbor: { x: W / 2, y: H - 18, w: 36 },
      light: { x: W / 2, y: H - 42 },
      goal: ships,
    };
  }

  function angleDiff(a, b) {
    let d = ((a - b + Math.PI) % (Math.PI * 2));
    if (d < 0) d += Math.PI * 2;
    return d - Math.PI;
  }

  function inBeam(ship, light, angle, half) {
    const dx = ship.x - light.x;
    const dy = ship.y - light.y;
    const ang = Math.atan2(dy, dx);
    return Math.abs(angleDiff(ang, angle)) < half;
  }

  function hitRock(ship, reef) {
    for (const r of reef) {
      if (Math.hypot(ship.x - r.x, ship.y - r.y) < r.r + 5) return r;
    }
    return null;
  }

  function inHarbor(ship, harbor) {
    return Math.abs(ship.x - harbor.x) < harbor.w * 0.55 && ship.y > harbor.y - 10;
  }

  if (typeof module !== "undefined") module.exports = { generate, angleDiff, inBeam, hitRock, inHarbor, W, H };

  if (typeof registerGame !== "undefined") registerGame({
    id: "latarnia",
    cat: "symulacje",
    big: true,
    name: "Latarnia",
    author: "Composer",
    desc: "Obracaj światłem latarni, prowadź statki do portu i chroń je przed skałami.",
    color: "#9f1239",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "..#..", ".###.", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, ships: 5, rocks: 5, beam: 0.42, loseAt: 3, spawn: 3.2, speed: 22 },
      { key: "medium", name: "Średni", points: 50, ships: 8, rocks: 8, beam: 0.34, loseAt: 3, spawn: 2.6, speed: 28 },
      { key: "hard", name: "Trudny", points: 100, ships: 12, rocks: 11, beam: 0.28, loseAt: 2, spawn: 2.1, speed: 34 },
    ],
    rules: [
      "Obracaj wiązką światła w lewo i prawo (strzałki, A/D albo przyciski w panelu).",
      "Statek oświetlony skręca ku portowi u dołu ekranu. Poza światłem płynie prosto.",
      "Skały toną jednostki. Przegrywasz po utracie zbyt wielu statków; wygrywasz po wprowadzeniu wymaganej floty.",
      "Mgła ogranicza widoczność — ufaj wiązce i planuj obrót z wyprzedzeniem.",
    ],
    achievements: [
      { id: "pierwszy-port", name: "Pierwszy port", desc: "Wprowadź pierwszy statek do portu.", points: 10 },
      { id: "bez-strat", name: "Bez strat", desc: "Wygraj poziom bez zatopienia żadnego statku.", points: 25 },
      { id: "watski-promien", name: "Wąski promień", desc: "Ukończ średni lub trudny poziom bez strat.", points: 25 },
      { id: "nocny-as", name: "Nocny as", desc: "Wygraj trudny poziom w mniej niż 100 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const world = generate(L);
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "arcade" });
      const { g } = cv;

      const s = {
        angle: -Math.PI / 2,
        ships: [],
        saved: 0,
        lost: 0,
        spawned: 0,
        spawnT: 0.8,
        t: 0,
        waves: [],
        foam: [],
        first: false,
        flash: 0,
        winT: 0,
      };

      for (let i = 0; i < 24; i++) {
        s.waves.push({ x: Math.random() * W, y: 20 + Math.random() * (H - 50), p: Math.random() * Math.PI * 2 });
      }

      const saveEl = statBlock(ctx, "W porcie", { meter: true });
      const lostEl = statBlock(ctx, "Straty", { small: true });
      const beamEl = statBlock(ctx, "Kurs wiązki", { small: true });

      const keys = heldKeys(ctx);
      const touch = {};
      touchPad(ctx, touch, [
        ["l", "W lewo", "i-left"],
        ["r", "W prawo", "i-right"],
      ]);

      cv.loop((dt) => {
        s.t += dt;
        if (!ctx.done && !s.winT) update(dt);
        else if (s.winT) {
          s.winT += dt;
          if (s.winT > 0.9 && !ctx.done) endWin();
        }
        draw();
      });

      function spawnShip() {
        if (s.spawned >= L.ships) return;
        const side = Math.random() < 0.5 ? 0 : 1;
        const x = side ? Math.random() * W : (Math.random() < 0.5 ? -10 : W + 10);
        const y = side ? -10 : 20 + Math.random() * 70;
        const targetX = W / 2 + (Math.random() - 0.5) * 40;
        const ang = Math.atan2(H * 0.45 - y, targetX - x);
        s.ships.push({
          x, y,
          ang,
          speed: L.speed * (0.85 + Math.random() * 0.3),
          lit: false,
          alive: true,
          saved: false,
          bob: Math.random() * Math.PI * 2,
        });
        s.spawned++;
      }

      function update(dt) {
        const turn = ((keys.arrowright || keys.d || touch.r) ? 1 : 0) - ((keys.arrowleft || keys.a || touch.l) ? 1 : 0);
        s.angle += turn * 1.7 * dt;
        s.flash = Math.max(0, s.flash - dt);

        s.spawnT -= dt;
        if (s.spawnT <= 0) {
          spawnShip();
          s.spawnT = L.spawn * (0.85 + Math.random() * 0.3);
        }

        for (const ship of s.ships) {
          if (!ship.alive || ship.saved) continue;
          ship.bob += dt * 3;
          ship.lit = inBeam(ship, world.light, s.angle, world.beamHalf);
          if (ship.lit) {
            const toPort = Math.atan2(world.harbor.y - ship.y, world.harbor.x - ship.x);
            ship.ang += angleDiff(toPort, ship.ang) * Math.min(1, dt * 2.4);
            ship.speed = Math.min(ship.speed + 8 * dt, L.speed * 1.15);
          } else {
            ship.speed = Math.max(L.speed * 0.7, ship.speed - 6 * dt);
          }
          ship.x += Math.cos(ship.ang) * ship.speed * dt;
          ship.y += Math.sin(ship.ang) * ship.speed * dt;

          if (inHarbor(ship, world.harbor)) {
            ship.saved = true;
            ship.alive = false;
            s.saved++;
            Sound.place(1 + (s.saved % 9));
            foam(ship.x, ship.y, "#86efac", 10);
            if (!s.first) { s.first = true; ctx.achieve("pierwszy-port"); }
            if (s.saved >= world.goal) {
              s.winT = 0.01;
              Sound.line();
            }
            continue;
          }

          if (hitRock(ship, world.reef) || ship.y > H + 20 || ship.x < -40 || ship.x > W + 40) {
            ship.alive = false;
            s.lost++;
            s.flash = 0.4;
            Sound.error();
            foam(ship.x, ship.y, "#94a3b8", 14);
            ctx.toast("Statek zatonął");
            if (s.lost >= L.loseAt) {
              return ctx.lose("Za dużo strat", `W porcie: ${s.saved} z ${world.goal}.`);
            }
          }
        }

        for (const f of s.foam) { f.life -= dt; f.r += 12 * dt; }
        s.foam = s.foam.filter((f) => f.life > 0);
        renderHud();
      }

      function foam(x, y, c, n) {
        for (let i = 0; i < n; i++) {
          s.foam.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            r: 2,
            life: 0.4 + Math.random() * 0.35,
            c,
          });
        }
      }

      function endWin() {
        if (s.lost === 0) ctx.achieve("bez-strat");
        if (s.lost === 0 && L.key !== "easy") ctx.achieve("watski-promien");
        if (L.key === "hard" && ctx.time < 100) ctx.achieve("nocny-as");
        ctx.win(`W porcie ${s.saved} statków. Straty: ${s.lost}.`);
      }

      function draw() {
        // nocne niebo i morze
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#020617");
        sky.addColorStop(0.35, "#0f172a");
        sky.addColorStop(0.55, "#1e3a5f");
        sky.addColorStop(1, "#0c4a6e");
        g.fillStyle = sky;
        g.fillRect(0, 0, W, H);

        // gwiazdy
        g.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 40; i++) {
          const sx = (i * 47 + 13) % W;
          const sy = (i * 31 + 7) % (H * 0.4);
          if (Math.sin(s.t * 2 + i) > -0.2) g.fillRect(sx, sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        }

        // księżyc
        g.fillStyle = "#e2e8f0";
        g.beginPath(); g.arc(W * 0.82, 28, 12, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#020617";
        g.beginPath(); g.arc(W * 0.82 + 5, 26, 10, 0, Math.PI * 2); g.fill();

        // fale
        g.strokeStyle = "rgba(148,163,184,0.2)";
        g.lineWidth = 1;
        for (const w of s.waves) {
          const yy = w.y + Math.sin(s.t * 1.5 + w.p) * 2;
          g.beginPath();
          g.moveTo(w.x - 10, yy);
          g.quadraticCurveTo(w.x, yy - 3, w.x + 10, yy);
          g.stroke();
        }

        // wiązka światła
        drawBeam();

        // skały
        for (const r of world.reef) {
          g.fillStyle = "#334155";
          g.beginPath();
          g.moveTo(r.x - r.r, r.y + r.r * 0.3);
          g.lineTo(r.x - r.r * 0.3, r.y - r.r);
          g.lineTo(r.x + r.r * 0.5, r.y - r.r * 0.6);
          g.lineTo(r.x + r.r, r.y + r.r * 0.3);
          g.fill();
          g.fillStyle = "rgba(255,255,255,0.12)";
          g.beginPath(); g.arc(r.x - 2, r.y - r.r * 0.3, 2, 0, Math.PI * 2); g.fill();
        }

        // brzeg / port
        g.fillStyle = "#1c1917";
        g.fillRect(0, H - 22, W, 22);
        g.fillStyle = "#44403c";
        g.fillRect(world.harbor.x - world.harbor.w, H - 28, world.harbor.w * 2, 10);
        // falochrony
        g.fillStyle = "#57534e";
        g.fillRect(world.harbor.x - world.harbor.w - 8, H - 40, 8, 22);
        g.fillRect(world.harbor.x + world.harbor.w, H - 40, 8, 22);
        g.fillStyle = "#fbbf24";
        g.globalAlpha = 0.5 + Math.sin(s.t * 4) * 0.2;
        g.beginPath(); g.arc(world.harbor.x, H - 30, 4, 0, Math.PI * 2); g.fill();
        g.globalAlpha = 1;

        // latarnia
        drawLighthouse();

        // statki
        for (const ship of s.ships) {
          if (!ship.alive && !ship.saved) continue;
          if (ship.saved) continue;
          drawShip(ship);
        }

        for (const f of s.foam) {
          g.globalAlpha = Math.max(0, f.life * 2);
          g.strokeStyle = f.c;
          g.lineWidth = 1.5;
          g.beginPath(); g.arc(f.x, f.y, f.r, 0, Math.PI * 2); g.stroke();
        }
        g.globalAlpha = 1;

        // mgła
        g.fillStyle = "rgba(148,163,184,0.08)";
        for (let i = 0; i < 3; i++) {
          const fx = ((s.t * 8 + i * 90) % (W + 60)) - 30;
          g.beginPath();
          g.ellipse(fx, 50 + i * 25, 50, 14, 0, 0, Math.PI * 2);
          g.fill();
        }

        if (s.flash > 0) {
          g.fillStyle = `rgba(248,113,113,${s.flash * 0.4})`;
          g.fillRect(0, 0, W, H);
        }
        if (s.winT) {
          g.fillStyle = `rgba(253,224,71,${Math.min(0.55, s.winT)})`;
          g.fillRect(0, 0, W, H);
        }
      }

      function drawBeam() {
        const { x, y } = world.light;
        const half = world.beamHalf;
        const reach = 220;
        g.save();
        const grad = g.createRadialGradient(x, y, 4, x, y, reach);
        grad.addColorStop(0, "rgba(254,243,199,0.55)");
        grad.addColorStop(0.45, "rgba(253,224,71,0.18)");
        grad.addColorStop(1, "rgba(253,224,71,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, reach, s.angle - half, s.angle + half);
        g.closePath();
        g.fill();
        // ostra krawędź
        g.strokeStyle = "rgba(254,249,195,0.35)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(s.angle - half) * reach, y + Math.sin(s.angle - half) * reach);
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(s.angle + half) * reach, y + Math.sin(s.angle + half) * reach);
        g.stroke();
        g.restore();
      }

      function drawLighthouse() {
        const { x, y } = world.light;
        // wieża
        g.fillStyle = "#e7e5e4";
        g.beginPath();
        g.moveTo(x - 8, H - 22);
        g.lineTo(x - 6, y + 8);
        g.lineTo(x + 6, y + 8);
        g.lineTo(x + 8, H - 22);
        g.fill();
        g.fillStyle = "#9f1239";
        g.fillRect(x - 6, y + 14, 12, 5);
        g.fillRect(x - 6, y + 26, 12, 5);
        // latarnia
        g.fillStyle = "#fef08a";
        g.beginPath(); g.arc(x, y, 5 + Math.sin(s.t * 6) * 0.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#44403c";
        g.fillRect(x - 7, y + 4, 14, 4);
        g.fillStyle = "#9f1239";
        g.beginPath();
        g.moveTo(x - 8, y + 4);
        g.lineTo(x, y - 6);
        g.lineTo(x + 8, y + 4);
        g.fill();
      }

      function drawShip(ship) {
        const bob = Math.sin(ship.bob) * 1.5;
        g.save();
        g.translate(ship.x, ship.y + bob);
        g.rotate(ship.ang);
        g.fillStyle = ship.lit ? "#fef3c7" : "#78716c";
        g.beginPath();
        g.moveTo(8, 0);
        g.lineTo(-6, -5);
        g.lineTo(-4, 0);
        g.lineTo(-6, 5);
        g.closePath();
        g.fill();
        g.fillStyle = ship.lit ? "#fde68a" : "#a8a29e";
        g.fillRect(-2, -6, 2, 8);
        if (ship.lit) {
          g.fillStyle = "rgba(254,243,199,0.5)";
          g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }

      function renderHud() {
        saveEl.set(`${s.saved} / ${world.goal}`, s.saved / world.goal, `w drodze: ${s.ships.filter((x) => x.alive).length}`);
        lostEl.set(`${s.lost} / ${L.loseAt}`);
        const deg = Math.round(((s.angle * 180) / Math.PI + 360) % 360);
        beamEl.set(`${deg}°`, null, "obrót wiązki");
        ctx.progress(s.saved / world.goal);
      }
      renderHud();
    },
  });
}
