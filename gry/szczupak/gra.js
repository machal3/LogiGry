// Szczupak: pływasz małą rybą, zjadasz mniejsze od siebie i rośniesz; większe drapieżniki kończą partię.
{
  const START = 2.2, GROW = 0.3, GROW_MAX = 8.5;

  function fish(size, pred) {
    return { x: 2 + Math.random() * 96, y: 6 + Math.random() * 60,
      vx: 0, vy: 0, a: Math.random() * 6.28, s: size, pred: !!pred };
  }

  // Ryba mniejsza o dziesiątą część jest posiłkiem, większa o dziesiątą — zabójczą.
  function collide(me, other) {
    if (other.s < me.s * 0.92) return "eat";
    if (other.s > me.s * 1.1) return "die";
    return null;
  }

  // Kokpit poza płótnem (100 × 74, tafla od 4 do 70).
  function bounds(f) {
    f.x = Math.max(f.s, Math.min(100 - f.s, f.x));
    f.y = Math.max(4 + f.s, Math.min(70 - f.s, f.y));
  }

  if (typeof module !== "undefined") module.exports = { fish, collide, bounds, START, GROW, GROW_MAX };

  if (typeof registerGame !== "undefined") registerGame({
    id: "szczupak",
    cat: "akcja",
    name: "Szczupak",
    author: "GLM 5.3 Flash",
    desc: "Pływaj po morzu, jedz mniejsze ryby i rośnij. Większe drapieżniki kończą partię.",
    color: "#155e75",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "#####", "..#..", ".###."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, target: 12, preds: 2, speed: 30, fog: 0 },
      { key: "medium", name: "Średni", points: 50, target: 18, preds: 3, speed: 34, fog: 0 },
      { key: "hard", name: "Trudny", points: 100, target: 24, preds: 4, speed: 38, fog: 1 },
    ],
    rules: [
      "Steruj strzałkami, klawiszami W A S D albo przesunięciem palca. Ryba ma rozpęd i w wodzie nie zatrzymuje się od razu.",
      "Ryby mniejsze od ciebie można zjeść, a każdy kęs lekko cię powiększa. Kontakt z większą rybą kończy partię.",
      "Drapieżniki są zawsze trochę większe od ciebie i podpływają, więc trzeba się szybko wyrosnąć i uciekać.",
      "Wygrana po zjedzeniu docelowej liczby ryb. Na trudnym poziomie ciemna mgła zasłania dalsze pole.",
    ],
    achievements: [
      { id: "apetyt", name: "Apetyt", desc: "Zjedz trzy ryby w mniej niż pięć sekund.", points: 10 },
      { id: "giga", name: "Gigant", desc: "Osiągnij maksymalny rozmiar w jednej partii.", points: 25 },
      { id: "blyskawica", name: "Błyskawica", desc: "Ukończ poziom trudny w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74, { cls: "space" });
      const g = cv.g;
      const me = { x: 12, y: 37, vx: 0, vy: 0, s: START };
      const prey = [], preds = [];
      let eaten = 0, t0 = 0;
      const eatenEl = statBlock(ctx, "Zjedzone", { meter: true });
      const sizeEl = statBlock(ctx, "Rozmiar", { small: true });
      ctx.panel.append(panelBlock("Sterowanie",
        el("p", "sz-leg", "Strzałki, W A S D albo przeciągnięcie palca po planszy.")));

      for (let k = 0; k < 10; k++) prey.push(fish(1.2 + Math.random() * 1.2, false));
      const spawnPred = () => {
        const f = fish(me.s * (1.25 + Math.random() * 0.5), true);
        f.x = Math.random() < 0.5 ? 2 : 98;
        f.vx = f.x < 50 ? 8 : -8;
        preds.push(f);
      };
      for (let k = 0; k < L.preds; k++) spawnPred();

      const eatTimes = [];
      let hits = 0, chomp = 0;
      const pops = [], bub = [];

      function eat() {
        eaten++;
        me.s = Math.min(GROW_MAX, me.s + GROW);
        chomp = 1;
        eatTimes.push(ctx.time);
        Sound.place(2 + eaten % 9);
        eatenEl.set(`${eaten} z ${L.target}`, eaten / L.target);
        sizeEl.set(me.s.toFixed(1), me.s / GROW_MAX);
        if (eatTimes.length >= 3 && eatTimes[eatTimes.length - 3] >= ctx.time - 5) ctx.achieve("apetyt");
        if (me.s >= GROW_MAX) ctx.achieve("giga");
        if (eaten >= L.target) {
          if (L.key === "hard" && ctx.time < 90) ctx.achieve("blyskawica");
          ctx.win(`Zjedzonych ryb: ${eaten}.`);
        }
      }

      const keys = heldKeys(ctx);
      let drag = null;
      cv.loop((dt) => {
        if (!ctx.done) {
          const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
          const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
          let ax = kx, ay = ky;
          if (drag) { ax = drag[0]; ay = drag[1]; }
          const len = Math.hypot(ax, ay);
          if (len > 1) { ax /= len; ay /= len; }
          me.vx += ax * L.speed * dt;
          me.vy += ay * L.speed * dt;
          const v = Math.hypot(me.vx, me.vy), vmax = L.speed * 0.9;
          if (v > vmax) { me.vx *= vmax / v; me.vy *= vmax / v; }
          // małych prądy rozmnóż i dryfują; blisko gracza rybki uciekają
          for (const p of prey) {
            p.a += (Math.random() - 0.5) * dt * 2.4;
            const l = L.speed * 0.22;
            p.vx += (Math.cos(p.a) * l - p.vx) * dt * 1.6;
            p.vy += (Math.sin(p.a) * l - p.vy) * dt * 1.6;
            const dx2 = p.x - me.x, dy2 = p.y - me.y, d2 = Math.hypot(dx2, dy2) || 1;
            if (d2 < 13) {
              // pęd przestraszonej rybki od gracza
              p.vx += (dx2 / d2) * L.speed * 2.4 * dt * 3;
              p.vy += (dy2 / d2) * L.speed * 2.4 * dt * 3;
              const v2 = Math.hypot(p.vx, p.vy), vm = L.speed * 0.62;
              if (v2 > vm) { p.vx *= vm / v2; p.vy *= vm / v2; }
            }
          }
          for (const f of preds) {
            const dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy) || 1;
            const l = L.speed * 0.5;
            f.vx += ((dx / d) * l - f.vx) * dt * 1.5;
            f.vy += ((dy / d) * l - f.vy) * dt * 1.5;
          }
          for (const f of [...prey, ...preds]) {
            f.x += f.vx * dt; f.y += f.vy * dt;
            bounds(f);
          }
          me.x += me.vx * dt; me.y += me.vy * dt;
          bounds(me);
          // smuga bąbelków za szybko płynącą kulą
          const mv = Math.hypot(me.vx, me.vy);
          if (mv > L.speed * 0.55 && Math.random() < dt * 14)
            bub.push({ x: me.x - me.vx / mv * me.s * 1.8, y: me.y - me.vy / mv * 2, a: 0.7 });
          for (let i = bub.length - 1; i >= 0; i--) {
            const b2 = bub[i];
            b2.y -= dt * 7; b2.a -= dt * 1.1;
            if (b2.a <= 0) bub.splice(i, 1);
          }
          // kolizje
          for (let i = prey.length - 1; i >= 0; i--) {
            const p = prey[i];
            if (Math.hypot(me.x - p.x, me.y - p.y) < (me.s + p.s) * 0.7) {
              pops.push({ x: p.x, y: p.y, t: 0 });
              prey.splice(i, 1);
              prey.push(fish(1.2 + Math.random() * 1.2, false));
              eat();
            }
          }
          for (const f of preds) {
            if (Math.hypot(me.x - f.x, me.y - f.y) < (me.s + f.s) * 0.62) {
              Sound.error();
              return lose();
            }
          }
        }
        chomp = Math.max(0, chomp - dt * 3);
        for (const p of pops) p.t += dt;
        for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 0.8) pops.splice(i, 1);
        draw(dt);
      });
      ctx.on(cv.cv, "pointerdown", (e) => { drag = dragAt(e); });
      ctx.on(cv.cv, "pointermove", (e) => { if (drag) drag = dragAt(e); });
      for (const ev2 of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev2, () => { drag = null; });

      function dragAt(e) {
        const [mx, my] = cv.at(e);
        const dx = mx - me.x, dy = my - me.y, d = Math.hypot(dx, dy) || 1;
        return [dx / d, dy / d];
      }

      function lose() {
        ctx.lose("Zjedzony", `Drapieżnik Cię dogonił przy ${eaten} zjedzonych rybach.`);
      }

      // --- Rysowanie: woda, książę fale, ryby ---
      function draw(dt) {
        t0 += dt;
        g.fillStyle = "#083d55";
        g.fillRect(0, 0, 100, 74);
        g.fillStyle = "#0a5a7d";
        g.fillRect(0, 0, 100, 5);
        for (let i = 0; i < 4; i++) {
          const yy = 9 + i * 15;
          g.strokeStyle = colorMix("#54c8e5", 0.07);
          g.lineWidth = 0.6;
          g.beginPath();
          for (let x = 0; x <= 100; x += 5) {
            const yy2 = yy + Math.sin(x * 0.14 + t0 * 1.2 + i * 2) * 2.5;
            x === 0 ? g.moveTo(x, yy2) : g.lineTo(x, yy2);
          }
          g.stroke();
        }
        for (let k = 0; k < 7; k++) {
          const bx = (k * 15 + t0 * 4) % 100;
          const by = 68 - ((t0 * 7 + k * 21) % 62);
          g.fillStyle = colorMix("#9fdcf2", 0.22);
          g.beginPath(); g.arc(bx, by, 0.7, 0, 7); g.fill();
        }
        // dymki "+1" nad zjedzonymi rybkami
        for (const p of pops) {
          const a = Math.max(0, 1 - p.t / 0.8);
          g.fillStyle = `rgba(255,255,255,${a})`;
          g.font = "3.6px sans-serif";
          g.textAlign = "center";
          g.fillText("+1", p.x, p.y - 2 - p.t * 7);
          g.textAlign = "left";
        }
        for (const p of prey) drawFish(p, "#b8d9a0", "#eef7dc");
        // pierścień ostrzegawczy wokół podpływających drapieżników
        for (const f of preds) {
          const d = Math.hypot(me.x - f.x, me.y - f.y);
          if (d < 20) {
            const lg = Math.min(0.7, 0.7 * (1 - d / 20));
            g.strokeStyle = `rgba(230,90,110,${lg})`;
            g.lineWidth = 0.5;
            g.beginPath();
            g.arc(f.x, f.y, f.s * 2 + 2 + (20 - d) * 0.15, 0, 7);
            g.stroke();
          }
        }
        for (const f of preds) drawFish(f, "#d1566a", "#f6b9c2");
        // bąbelki smugi
        for (const b2 of bub) {
          g.fillStyle = `rgba(255,255,255,${Math.max(0, b2.a) * 0.6})`;
          g.beginPath(); g.arc(b2.x, b2.y, 0.55, 0, 7); g.fill();
        }
        // chwilowe powiększenie przy kęsie — widać chrupnięcie
        const sc = 1 + chomp * 0.14;
        g.save();
        g.translate(me.x, me.y);
        g.scale(sc, sc);
        g.translate(-me.x, -me.y);
        drawFish(me, cv.theme.c, mixLite(cv.theme.c, 1.28));
        g.restore();
        if (L.fog) {
          const d = Math.min(1, Math.max(Math.abs(me.x - 50) / 50, Math.abs(me.y - 37) / 35));
          g.fillStyle = `rgba(3,22,34,${Math.min(0.72, 0.32 + d * 0.55)})`;
          g.fillRect(0, 0, 100, 74);
          // przy graczu mgła cieńsza: światło własne
          const rg = g.createRadialGradient(me.x, me.y, 3, me.x, me.y, 22);
          rg.addColorStop(0, "rgba(3,22,34,0)");
          rg.addColorStop(1, "rgba(3,22,34,0.55)");
          g.fillStyle = rg;
          g.fillRect(0, 0, 100, 74);
        }
        ctx.progress(eaten / L.target);
      }

      function drawFish(f, fill, lite) {
        const dir = f.vx >= 0 ? 1 : -1;
        const ang = Math.atan2(f.vy * dir, f.vx) * 0.35;
        g.save();
        g.translate(f.x, f.y);
        g.scale(dir, 1);
        g.rotate(ang * dir);
        const s = f.s;
        g.fillStyle = fill;
        g.beginPath();
        g.ellipse(0, 0, s * 1.15, s * 0.55, 0, 0, 7);
        g.fill();
        g.beginPath();
        g.moveTo(-s * 1.05, 0);
        g.lineTo(-s * 1.85, -s * 0.66);
        g.lineTo(-s * 1.85, s * 0.66);
        g.closePath();
        g.fill();
        g.fillStyle = lite;
        g.beginPath();
        g.arc(s * 0.7, -s * 0.16, Math.max(0.24, s * 0.13), 0, 7);
        g.fill();
        g.fillStyle = "#08232f";
        g.beginPath();
        g.arc(s * 0.74, -s * 0.16, Math.max(0.1, s * 0.06), 0, 7);
        g.fill();
        g.restore();
      }
      function mixLite(c, k) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgb(${Math.min(255, r * k)},${Math.min(255, gg * k)},${Math.min(255, b2 * k)})`;
      }
      function colorMix(c, a) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgba(${r},${gg},${b2},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}
