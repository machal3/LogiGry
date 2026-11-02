// Szczupak: pływasz rybą, zjadasz mniejsze od siebie i rośniesz; większe drapieżniki kończą partię, dopóki nie urośniesz ponad nie.
{
  const START = 2.2, GROW_MAX = 8.5;
  // ile rośnie metka: rybka najwięcej, krewetka najmniej, zjedzony drapieżnik bardzo dużo
  const GROWTH = { fish: 0.3, shrimp: 0.22, pred: 1 };
  const DASH_CD = 3.2, DASH_POWER = 2.4, DASH_TIME = 0.5;

  // --- Logika bez płótna ---

  function fish(size, pred) {
    return { x: 2 + Math.random() * 96, y: 6 + Math.random() * 60,
      vx: 0, vy: 0, a: Math.random() * 6.28, s: size, pred: !!pred,
      ph: Math.random() * 6.28, face: Math.random() < 0.5 ? -1 : 1, tilt: 0 };
  }

  // Ryba mniejsza o niemal dziesiątą część jest posiłkiem, wyraźnie większa — zabójczą; w połowie neutralna.
  function collide(me, other) {
    if (other.s < me.s * 0.92) return "eat";
    if (other.s > me.s * 1.08) return "die";
    return null;
  }

  // Kokpit poza płótnem (100 × 74, tafla od 4, dno od 67).
  function bounds(f) {
    f.x = Math.max(f.s, Math.min(100 - f.s, f.x));
    f.y = Math.max(4 + f.s, Math.min(66 - f.s, f.y));
  }

  // Punkty profilu w trybie bez końca: poniżej miary poziomu łatwego 0–5;
  // 12 ryb ≈ łatwy (10–20 pkt), 18 ≈ średni (22–45), 24 ≈ trudny (50), dalej rośnie coraz szybciej.
  // Platforma obcina do 150.
  function endlessPoints(n) {
    if (n < 12) return Math.floor((5 * n) / 12);
    if (n < 18) return Math.round(10 + ((n - 12) * 8) / 6);
    if (n < 24) return Math.round(22 + ((n - 18) * 23) / 6);
    const x = (n - 24) / 10;
    return Math.min(150, Math.round(50 + 25 * x + 5 * x * x));
  }

  if (typeof module !== "undefined") module.exports = { fish, collide, bounds, START, GROWTH, GROW_MAX, DASH_CD, endlessPoints };

  if (typeof registerGame !== "undefined") registerGame({
    id: "szczupak",
    cat: "akcja",
    name: "Szczupak",
    author: "GLM 5.3 Flash",
    desc: "Pływaj po morzu, jedz mniejsze ryby i rośnij. Większe od ciebie drapieżniki kończą partię.",
    color: "#155e75",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "#####", "..#..", ".###."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, target: 12, preds: 2, speed: 30, fog: 0 },
      { key: "medium", name: "Średni", points: 50, target: 18, preds: 3, speed: 34, fog: 0 },
      { key: "hard", name: "Trudny", points: 100, target: 24, preds: 4, speed: 38, fog: 1 },
    ],
    endless: { speed: 32 },
    rules: [
      "Steruj strzałkami, klawiszami W A S D albo przeciągnięciem palca. Ryba ma rozpęd i zwalnia płynnie.",
      "Ryby i krewetki mniejsze od ciebie zjadasz, a każdy kęs cię powiększa. Większe drapieżniki kończą partię.",
      "Gdy urośniesz ponad pysk, drapieżnik zaczyna od ciebie uciekać i sam staje się kęsem.",
      "Impuls: spacja albo przycisk w panelu; krótkie pchnięcie z kilkusekundowym odzyskiem.",
      "Wygrana po zjedzeniu docelowej liczby ryb. Bez końca: bieg trwa, aż cię złapią, a drapieżników przybywa.",
    ],
    achievements: [
      { id: "apetyt", name: "Apetyt", desc: "Zjedz trzy ryby w mniej niż pięć sekund.", points: 10 },
      { id: "polowanie", name: "Polowanie", desc: "Zjedz drapieżnika, gdy urośniesz ponad jego pysk.", points: 25 },
      { id: "giga", name: "Gigant", desc: "Osiągnij maksymalny rozmiar w jednej partii.", points: 25 },
      { id: "blyskawica", name: "Błyskawica", desc: "Ukończ poziom trudny w mniej niż 90 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level, E = !!L.endless;
      const cv = canvasGame(board, ctx, 100, 74, { cls: "space", max: 92 });
      const g = cv.g;
      const me = { x: 14, y: 36, vx: 0, vy: 0, s: START, ph: 0, face: 1, tilt: 0 };
      const prey = [], preds = [], pops = [], bub = [];
      let eaten = 0, chomp = 0, dashCd = 0, dashGlow = 0, t0 = 0;
      const eatTimes = [];

      // --- Panel: najpierw stan, potem narzędzia ---
      const eatenEl = statBlock(ctx, "Zjedzone", { meter: true });
      eatenEl.set(L.target ? `0 z ${L.target}` : "0", 0);
      const stats = statsBlock(ctx, "Ryba", E ? ["Rozmiar", "Impuls", "Za bieg"] : ["Rozmiar", "Impuls"]);
      stats.set("Rozmiar", me.s.toFixed(1));
      stats.set("Impuls", "gotowy");
      const dashBtn = button("Impuls", "btn wide", dash);
      ctx.panel.append(panelBlock("Umiejętności", dashBtn));
      if (E) ctx.panel.append(panelBlock("Koniec biegu", button("Zakończ bieg", "btn-ghost wide", endRun)));

      // --- Ozdoby: wodorosty, kamyki, pył wodny ---
      const weeds = [], stones = [], plank = [];
      for (let k = 0; k < 7; k++) weeds.push({ x: 2 + k * 14 + Math.random() * 6, h: 7 + Math.random() * 7, w: 1.1 + Math.random(), ph: Math.random() * 6.28 });
      for (let k = 0; k < 6; k++) stones.push({ x: 2 + Math.random() * 94, w: 2.4 + Math.random() * 2.4 });
      for (let k = 0; k < 15; k++) plank.push({ x: Math.random() * 100, y: 8 + Math.random() * 54, v: 0.4 + Math.random() * 0.8, a: 0.08 + Math.random() * 0.12 });

      // --- Kęsy i ich barwy ---
      const PALETA = [
        { top: "#7fa8c9", body: "#aecde6", belly: "#e6f1f9", fin: "#6d97bb" },
        { top: "#d9983b", body: "#f3bf6d", belly: "#fce5b2", fin: "#c98430" },
        { top: "#35947f", body: "#5cc0a7", belly: "#c8e8da", fin: "#2b7d6b" },
        { top: "#c5637c", body: "#e98da0", belly: "#f8cfd8", fin: "#ad5066" },
      ];
      const KREW = { top: "#e08a4d", body: "#f2ac70", belly: "#fbddc0", fin: "#c97238" };
      const DRAPEZ = { top: "#5f2038", body: "#93415b", belly: "#cc8798", fin: "#4a1830" };

      function spot(near) {
        // kęs jak najdalej od gracza; gdy trafi się blisko, spróbuj raz jeszcze
        const x = 2 + Math.random() * 96;
        if (near && Math.hypot(x - me.x, 30) < 14) return spot(false);
        return x;
      }
      function newFish(kind) {
        const f = fish(kind === "shrimp" ? 0.9 + Math.random() * 0.45 : 1.1 + Math.random() * 0.9, false);
        f.kind = kind;
        f.i = kind === "fish" ? Math.floor(Math.random() * PALETA.length) : -1;
        f.x = spot(true);
        f.y = kind === "shrimp" ? 55 + Math.random() * 8 : 7 + Math.random() * 54;
        return f;
      }
      for (let k = 0; k < 11; k++) prey.push(newFish("fish"));
      for (let k = 0; k < 5; k++) prey.push(newFish("shrimp"));

      function spawnPred() {
        const f = fish(me.s * (1.25 + Math.random() * 0.5), true);
        f.kind = "pred";
        f.i = -1;
        f.x = me.x < 50 ? 97 : 3;
        f.vx = f.x > 50 ? -8 : 8;
        f.y = 8 + Math.random() * 50;
        preds.push(f);
      }
      for (let k = 0; k < L.preds; k++) spawnPred();

      // w biegu bez końca rośnie liczba drapieżników i ich szybkość
      const predMax = () => Math.min(5, 2 + Math.floor(eaten / 7));
      const speedMul = () => (E ? 1 + Math.min(0.6, eaten * 0.017) : 1);
      const fogAmt = () => (E ? Math.max(0, Math.min(1, (eaten - 12) / 16)) : L.fog ? 1 : 0);

      // --- Kęs ---
      function eat(p) {
        eaten++;
        me.s = Math.min(GROW_MAX, me.s + (GROWTH[p.kind] || 0.3));
        chomp = 1;
        eatTimes.push(ctx.time);
        Sound.place(Math.min(11, 2 + eaten % 9));
        if (L.target) eatenEl.set(`${eaten} z ${L.target}`, eaten / L.target);
        else eatenEl.set(String(eaten), eaten / (eaten + 14));
        if (p.kind === "pred") ctx.achieve("polowanie");
        if (eatTimes.length >= 3 && eatTimes[eatTimes.length - 3] >= ctx.time - 5) ctx.achieve("apetyt");
        if (me.s >= GROW_MAX) ctx.achieve("giga");
        if (eaten >= L.target) {
          if (L.key === "hard" && ctx.time < 90) ctx.achieve("blyskawica");
          ctx.win(`Zjedzonych ryb: ${eaten}.`);
        }
      }

      // --- Impuls i koniec biegu ---
      function dash() {
        if (ctx.done || dashCd > 0) return;
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        let dx = kx || (drag ? drag[0] : me.vx), dy = ky || (drag ? drag[1] : me.vy);
        const d = Math.hypot(dx, dy);
        if (d > 0.05) { dx /= d; dy /= d; } else { dx = me.face; dy = 0; }
        me.vx += dx * L.speed * DASH_POWER;
        me.vy += dy * L.speed * DASH_POWER;
        dashCd = DASH_CD; dashGlow = DASH_TIME;
        for (let k = 0; k < 7; k++)
          bub.push({ x: me.x - dx * me.s * (1 + Math.random() * 1.5), y: me.y - dy * me.s + (Math.random() - 0.5) * 2, a: 0.8 + Math.random() * 0.4 });
        Sound.line();
      }

      function endRun() {
        if (ctx.done) return;
        ctx.over(eaten, endlessPoints(eaten), `Zjedzone ryby: ${eaten}.`);
      }

      const keys = heldKeys(ctx, (key) => { if (key === " ") dash(); });
      let drag = null;
      cv.loop((dt) => {
        if (!ctx.done) step(dt);
        paint(dt);
      });
      ctx.on(cv.cv, "pointerdown", (e) => { drag = dragAt(e); });
      ctx.on(cv.cv, "pointermove", (e) => { if (drag) drag = dragAt(e); });
      for (const ev2 of ["pointerup", "pointercancel", "pointerleave"]) ctx.on(cv.cv, ev2, () => { drag = null; });

      function dragAt(e) {
        const [mx, my] = cv.at(e);
        const dx = mx - me.x, dy = my - me.y, d = Math.hypot(dx, dy) || 1;
        return [dx / d, dy / d];
      }

      function step(dt) {
        dashCd = Math.max(0, dashCd - dt);
        dashGlow = Math.max(0, dashGlow - dt);

        // gracz: rozpęd; pchnięcie pozwala na chwilę przekroczyć limit
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        let ax = kx, ay = ky;
        if (drag) { ax = drag[0]; ay = drag[1]; }
        if (ax || ay) {
          const len = Math.hypot(ax, ay);
          me.vx += (ax / len) * L.speed * dt;
          me.vy += (ay / len) * L.speed * dt;
        } else {
          const dr = Math.max(0, 1 - 0.9 * dt); // lekki opór wody
          me.vx *= dr; me.vy *= dr;
        }
        const v = Math.hypot(me.vx, me.vy);
        const vcap = L.speed * (dashGlow > 0 ? 2.3 : 0.9);
        if (v > vcap) { me.vx *= vcap / v; me.vy *= vcap / v; }

        // kęsy: dryfują albo uciekają przed graczem; krewetki grzebią przy dnie
        for (const p of prey) {
          p.a += (Math.random() - 0.5) * dt * 2.4;
          const l = L.speed * (p.kind === "shrimp" ? 0.12 : 0.22);
          p.vx += (Math.cos(p.a) * l - p.vx) * dt * 1.6;
          p.vy += (Math.sin(p.a) * l - p.vy) * dt * 1.6;
          if (p.kind === "shrimp") p.vy += (56 - p.y) * dt * 0.8;
          const dx2 = p.x - me.x, dy2 = p.y - me.y, d2 = Math.hypot(dx2, dy2) || 1;
          if (d2 < 13) {
            p.vx += (dx2 / d2) * L.speed * 2.6 * dt * 3;
            p.vy += (dy2 / d2) * L.speed * 2.6 * dt * 3;
            const v2 = Math.hypot(p.vx, p.vy), vm = L.speed * 0.62;
            if (v2 > vm) { p.vx *= vm / v2; p.vy *= vm / v2; }
          }
        }

        // drapieżniki: gonią, a na kęs uciekają jak płochliwe rybki
        const mul = speedMul();
        for (const f of preds) {
          const dx = me.x - f.x, dy = me.y - f.y, d = Math.hypot(dx, dy) || 1;
          if (collide(me, f) === "eat") {
            if (d < 18) {
              f.vx -= (dx / d) * L.speed * 1.8 * dt * 2;
              f.vy -= (dy / d) * L.speed * 1.8 * dt * 2;
              const vf = Math.hypot(f.vx, f.vy), vm = L.speed * 0.55 * mul;
              if (vf > vm) { f.vx *= vm / vf; f.vy *= vm / vf; }
            }
          } else {
            const l = L.speed * (d < 26 ? 0.55 : 0.25) * mul;
            f.vx += ((dx / d) * l - f.vx) * dt * 1.5;
            f.vy += ((dy / d) * l - f.vy) * dt * 1.5;
            const vf = Math.hypot(f.vx, f.vy), vm = L.speed * 0.72 * mul;
            if (vf > vm) { f.vx *= vm / vf; f.vy *= vm / vf; }
          }
        }

        // ruch; machanie ogonem zależy od szybkości, pochylenie od kierunku pływania
        for (const f of [...prey, ...preds, me]) {
          f.x += f.vx * dt; f.y += f.vy * dt;
          bounds(f);
          const vp = Math.hypot(f.vx, f.vy);
          f.ph += dt * (3.5 + vp * 0.5);
          if (Math.abs(f.vx) > 0.3) f.face = Math.sign(f.vx) || f.face;
          f.tilt = Math.max(-0.55, Math.min(0.55, Math.atan2(f.vy, Math.abs(f.vx) + 0.35))) * 0.8;
        }

        // smuga bąbelków za szybko płynącą rybą
        if (v > L.speed * 0.55 && Math.random() < dt * 14)
          bub.push({ x: me.x - (me.vx / v) * me.s * 1.8, y: me.y, a: 0.7 });
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
            prey.push(newFish(p.kind));
            eat(p);
          }
        }
        for (let i = preds.length - 1; i >= 0; i--) {
          const f = preds[i];
          const c = collide(me, f);
          const hit = Math.hypot(me.x - f.x, me.y - f.y) < (me.s + f.s) * (c === "eat" ? 0.66 : 0.6);
          if (c === "die" && hit) {
            Sound.error();
            E ? endRun() : lose();
            return;
          }
          if (c === "eat" && hit) {
            pops.push({ x: f.x, y: f.y, t: 0 });
            preds.splice(i, 1);
            eat(f);
          }
        }
        while (preds.length < (E ? predMax() : L.preds)) spawnPred();

        // panel
        stats.set("Rozmiar", me.s.toFixed(1));
        stats.set("Impuls", dashCd > 0 ? `za ${dashCd.toFixed(1)} s` : "gotowy");
        if (E) stats.set("Za bieg", `${endlessPoints(eaten)} pkt`);
        if (!E) ctx.progress(eaten / L.target);
      }

      function lose() {
        ctx.lose("Zjedzony", `Drapieżnik Cię dogonił przy ${eaten} zjedzonych rybach.`);
      }

      // --- Rysowanie ---
      function paint(dt) {
        t0 += dt;
        scene(dt);
        for (const p of prey) (p.kind === "shrimp" ? drawShrimp(p) : drawFish(p, PALETA[p.i]));
        // pierścień ostrzegawczy wokół groźnych drapieżników w pobliżu
        for (const f of preds) {
          const d = Math.hypot(me.x - f.x, me.y - f.y);
          if (d < 22 && collide(me, f) === "die") {
            const a = Math.max(0.12, Math.min(0.75, 0.75 * (1 - d / 22)) * (0.6 + 0.4 * Math.sin(t0 * 6)));
            g.setLineDash([1.4, 1.4]);
            g.strokeStyle = `rgba(255,205,220,${a})`;
            g.lineWidth = 0.55;
            g.beginPath();
            g.arc(f.x, f.y, f.s * 2.1 + 1.5, 0, 7);
            g.stroke();
            g.setLineDash([]);
          }
        }
        for (const f of preds) drawFish(f, DRAPEZ, { teeth: true });
        for (const b2 of bub) {
          g.fillStyle = `rgba(235,250,255,${Math.max(0, b2.a) * 0.6})`;
          g.beginPath(); g.arc(b2.x, b2.y, 0.6, 0, 7); g.fill();
        }
        drawMe();
        // fala +1 nad zjedzonymi
        for (const p of pops) {
          const a = Math.max(0, 1 - p.t / 0.8);
          g.strokeStyle = `rgba(255,255,255,${a * 0.5})`;
          g.lineWidth = 0.4;
          g.beginPath(); g.arc(p.x, p.y, 1 + p.t * 4.5, 0, 7); g.stroke();
          cv.text("+1", p.x, p.y - 2.5 - p.t * 7, { size: 3.6, weight: 800, color: "#f2fbff" });
        }
        fog();
        for (let i = pops.length - 1; i >= 0; i--) {
          pops[i].t += dt;
          if (pops[i].t > 0.8) pops.splice(i, 1);
        }
        chomp = Math.max(0, chomp - dt * 2.6);
      }

      // tło: gradient wody, promienie światła, dno z wodorostami, pył, tafla
      function scene(dt) {
        const gr = g.createLinearGradient(0, 0, 0, 74);
        gr.addColorStop(0, "#1f8bb2");
        gr.addColorStop(0.45, "#12658b");
        gr.addColorStop(1, "#0a3a55");
        g.fillStyle = gr;
        g.fillRect(0, 0, 100, 74);
        for (let k = 0; k < 4; k++) {
          const x0 = 5 + k * 25 + Math.sin(t0 * 0.35 + k * 1.9) * 4;
          g.fillStyle = "rgba(255,255,255,0.05)";
          g.beginPath();
          g.moveTo(x0, 0); g.lineTo(x0 + 6, 0); g.lineTo(x0 + 17, 74); g.lineTo(x0 - 3, 74);
          g.closePath(); g.fill();
        }
        g.fillStyle = "#2b4c59";
        g.fillRect(0, 67, 100, 7);
        g.fillStyle = "#35606b";
        for (const s of stones) { g.beginPath(); g.ellipse(s.x, 67.4, s.w, s.w * 0.42, 0, 3.14, 6.3); g.fill(); }
        for (const w of weeds) {
          const sw = Math.sin(t0 * 0.85 + w.ph) * w.h * 0.24;
          g.fillStyle = "rgba(58,150,112,0.5)";
          g.beginPath();
          g.moveTo(w.x, 67);
          g.quadraticCurveTo(w.x - w.w - sw * 0.5, 67 - w.h * 0.55, w.x + sw, 67 - w.h);
          g.quadraticCurveTo(w.x + w.w - sw * 0.5, 67 - w.h * 0.45, w.x, 67);
          g.fill();
        }
        for (const p of plank) {
          g.fillStyle = `rgba(224,244,252,${p.a})`;
          g.beginPath(); g.arc(p.x, p.y, 0.32, 0, 7); g.fill();
          p.y += p.v * dt;
          if (p.y > 64) p.y = 8;
        }
        g.fillStyle = "rgba(222,244,252,0.3)";
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(100, 0);
        for (let x = 100; x >= 0; x -= 5) g.lineTo(x, 4.4 + Math.sin(x * 0.13 + t0 * 1.4) * 0.9);
        g.closePath(); g.fill();
      }

      // gracz: błękit gracza z motywu, poświata przy pchnięciu, chrupnięcie zwiększa go chwilowo
      function drawMe() {
        const p1 = cv.theme.p1;
        const C = { top: tint(p1, 0.28), body: p1, belly: tint(p1, 0.72), fin: tint(p1, 0.45) };
        if (dashGlow > 0) {
          g.strokeStyle = `rgba(255,255,255,${dashGlow * 0.9})`;
          g.lineWidth = 1.4;
          g.beginPath();
          const bx = me.face * (me.s * 2 + dashGlow * 9);
          g.moveTo(me.x - bx * 0.5, me.y);
          g.lineTo(me.x - bx, me.y);
          g.stroke();
        }
        const sc = 1 + chomp * 0.13;
        g.save();
        g.translate(me.x, me.y);
        g.scale(sc, sc);
        g.translate(-me.x, -me.y);
        drawFish(me, C, { spots: true });
        g.restore();
      }

      // ryba: korpus krzywymi, ogon macha, płetwy, oko z błyskiem; drapieżnik z zębami i brwią
      function drawFish(f, C, opt = {}) {
        const s = f.s;
        g.save();
        g.translate(f.x, f.y);
        g.scale(f.face, 1);
        g.rotate(f.tilt);
        const wag = Math.sin(f.ph) * s * 0.3;
        g.fillStyle = C.fin;
        g.beginPath();
        g.moveTo(-s * 0.9, -s * 0.14);
        g.lineTo(-s * 1.82, -s * 0.58 + wag);
        g.lineTo(-s * 1.5, wag * 0.5);
        g.lineTo(-s * 1.82, s * 0.58 + wag);
        g.lineTo(-s * 0.9, s * 0.14);
        g.closePath(); g.fill();
        const gr = g.createLinearGradient(0, -s * 0.62, 0, s * 0.62);
        gr.addColorStop(0, C.top); gr.addColorStop(0.52, C.body); gr.addColorStop(1, C.belly);
        g.fillStyle = gr;
        g.beginPath();
        g.moveTo(s * 1.35, 0);
        g.bezierCurveTo(s * 0.78, -s * 0.64, s * 0.08, -s * 0.66, -s * 1.0, -s * 0.22);
        g.lineTo(-s * 1.0, s * 0.22);
        g.bezierCurveTo(s * 0.08, s * 0.66, s * 0.78, s * 0.64, s * 1.35, 0);
        g.closePath(); g.fill();
        // płetwa grzbietowa
        g.fillStyle = rgba(C.fin, 0.95);
        g.beginPath();
        g.moveTo(s * 0.5, -s * 0.5);
        g.quadraticCurveTo(-s * 0.12, -s * 1.06, -s * 0.75, -s * 0.3);
        g.quadraticCurveTo(-s * 0.15, -s * 0.6, s * 0.5, -s * 0.5);
        g.closePath(); g.fill();
        // płetwa brzuszna
        g.fillStyle = rgba(C.fin, 0.75);
        g.beginPath();
        g.moveTo(s * 0.12, s * 0.06);
        g.quadraticCurveTo(-s * 0.08, s * 0.62, -s * 0.48, s * 0.52);
        g.quadraticCurveTo(-s * 0.26, s * 0.14, s * 0.12, s * 0.06);
        g.closePath(); g.fill();
        if (opt.spots) {
          g.fillStyle = rgba(C.belly, 0.6);
          for (const [dx, dy] of [[-0.55, -0.16], [-0.1, -0.3], [0.32, -0.06], [-0.32, 0.18]]) {
            g.beginPath(); g.arc(s * dx, s * dy, s * 0.09, 0, 7); g.fill();
          }
        }
        const er = Math.max(0.22, s * 0.15);
        g.fillStyle = "#f5fbff";
        g.beginPath(); g.arc(s * 0.84, -s * 0.2, er, 0, 7); g.fill();
        g.fillStyle = opt.teeth ? "#3a1020" : "#0d2430";
        g.beginPath(); g.arc(s * 0.87, -s * 0.2, er * 0.55, 0, 7); g.fill();
        g.fillStyle = "rgba(255,255,255,0.9)";
        g.beginPath(); g.arc(s * 0.83, -s * 0.26, er * 0.17, 0, 7); g.fill();
        if (opt.teeth) {
          // groźna brew i paszcza zębów
          g.strokeStyle = rgba(DRAPEZ.top, 0.95);
          g.lineWidth = Math.max(0.14, s * 0.13);
          g.beginPath();
          g.moveTo(s * 0.68, -s * 0.62); g.lineTo(s * 1.0, -s * 0.4);
          g.stroke();
          g.fillStyle = "#f5fbff";
          for (let k = 0; k < 3; k++) {
            const tx = s * (1.3 - k * 0.22);
            g.beginPath();
            g.moveTo(tx, -s * 0.04);
            g.lineTo(tx - s * 0.07, s * 0.2);
            g.lineTo(tx - s * 0.14, -s * 0.02);
            g.closePath(); g.fill();
          }
        }
        g.restore();
      }

      // krewetka: dwa owale, zawinięty ogonek, wąsy i nóżki
      function drawShrimp(sh) {
        const s = sh.s, C = KREW;
        g.save();
        g.translate(sh.x, sh.y);
        g.scale(sh.face, 1);
        g.rotate(Math.max(-0.3, Math.min(0.3, sh.tilt)));
        g.strokeStyle = C.fin;
        g.lineCap = "round";
        g.lineWidth = s * 0.3;
        g.beginPath();
        g.moveTo(-s * 0.4, 0);
        g.quadraticCurveTo(-s * 0.95, -s * 0.1, -s * 0.8, s * 0.55);
        g.stroke();
        g.fillStyle = C.body;
        g.beginPath(); g.ellipse(-s * 0.08, 0, s * 0.52, s * 0.28, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(s * 0.42, s * 0.02, s * 0.36, s * 0.23, 0, 0, 7); g.fill();
        g.fillStyle = C.belly;
        g.beginPath(); g.ellipse(s * 0.4, s * 0.1, s * 0.26, s * 0.12, 0, 0, 7); g.fill();
        g.strokeStyle = rgba(C.fin, 0.85);
        g.lineWidth = Math.max(0.09, s * 0.07);
        g.beginPath(); g.moveTo(s * 0.72, -s * 0.05); g.quadraticCurveTo(s * 1.05, -s * 0.4, s * 1.35, -s * 0.35); g.stroke();
        g.beginPath(); g.moveTo(s * 0.72, 0); g.quadraticCurveTo(s * 1.1, s * 0.05, s * 1.4, s * 0.02); g.stroke();
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.moveTo(-s * 0.25 + k * s * 0.3, s * 0.24);
          g.lineTo(-s * 0.32 + k * s * 0.3, s * 0.42);
          g.stroke();
        }
        g.fillStyle = "#3a2410";
        g.beginPath(); g.arc(s * 0.6, -s * 0.08, Math.max(0.08, s * 0.07), 0, 7); g.fill();
        g.restore();
      }

      // głębinowe ciemnienie im mocniejsze, im dalsze pole
      function fog() {
        const F = fogAmt();
        if (!F) return;
        g.fillStyle = `rgba(4,18,28,${0.4 * F})`;
        g.fillRect(0, 0, 100, 74);
        const rg = g.createRadialGradient(me.x, me.y, 3, me.x, me.y, 22 - 6 * F);
        rg.addColorStop(0, "rgba(4,18,28,0)");
        rg.addColorStop(1, `rgba(4,18,28,${0.62 * F})`);
        g.fillStyle = rg;
        g.fillRect(0, 0, 100, 74);
      }

      // pomocnicze: rozjaśnienie i przezroczysty odcień
      function tint(hex, f) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
        const m = (c) => Math.round(c + (255 - c) * f);
        return `rgb(${m(r)},${m(gg)},${m(b)})`;
      }
      function rgba(hex, a) {
        const n = parseInt(hex.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
        return `rgba(${r},${gg},${b},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}
