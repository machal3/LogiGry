// Kręgle: drewniany tor w perspektywie, trzy mierniki rzutu i dziesięć ram kręglarskich.
{
  // Rozmiary toru w jednostkach 0–1: pozycja x w (−0.8..0.8), z = odległość od gracza.
  const BALL_R = 0.05, HOOK_MAX = 0.55;

  // Pozycje dziesięciu kręgli: świerk trójkąt, x z grubsza w metrem.
  function pinLayout() {
    const out = [];
    let n = 0;
    for (let row = 0; row < 4; row++)
      for (let k = 0; k <= row; k++) {
        const x = (k - row / 2) * 0.155;
        const z = 1 - row * 0.045;
        out.push({ x, z, up: true, fall: 0, id: n++ });
      }
    return out;
  }

  // Rozliczenie rzutu: bezpośredni dotyk i łańcuoch przewracających się kręgli.
  function resolveRoll(pins, ballX, hook, power) {
    let direct = 0;
    const fallen = new Set();
    for (const p of pins) {
      if (!p.up) continue;
      if (Math.abs(p.x - ballX) < BALL_R + 0.045 && p.z <= 1.01) {
        fallen.add(p);
        direct++;
      }
    }
    // łańcuch: trzask kręgu w krąg sąsiedzki — wzmocniony siłą i jury
    for (let round = 0; round < 3; round++) {
      for (const p of fallen) {
        for (const q of pins) {
          if (!q.up || fallen.has(q)) continue;
          const d = Math.hypot(q.x - p.x, q.z - p.z);
          const chance = 0.75 - d * 2.2 + power * 0.25 + hook * 0.15;
          if (d < 0.24 && Math.random() < Math.max(0.08, chance)) fallen.add(q);
        }
      }
    }
    for (const p of fallen) p.up = false;
    return [...fallen];
  }

  // Punkty kręglarskie: standardowe ramy ze strike i spare.
  function scoreFrames(rolls) {
    let total = 0, i = 0;
    for (let f = 0; f < 10; f++) {
      if (i >= rolls.length) break;
      if (rolls[i] === 10) {
        total += 10 + (rolls[i + 1] || 0) + (rolls[i + 2] || 0);
        i++;
      } else {
        const r1 = rolls[i], r2 = i + 1 < rolls.length ? rolls[i + 1] : 0;
        total += r1 + r2;
        if (r1 + r2 === 10) total += rolls[i + 2] || 0;
        i += Math.min(2, rolls.length - i);
      }
    }
    return total;
  }

  if (typeof module !== "undefined") module.exports = { pinLayout, resolveRoll, scoreFrames };

  if (typeof registerGame !== "undefined") registerGame({
    id: "kregle",
    cat: "zrecznosciowe",
    name: "Kręgle",
    author: "GLM 5.3 Flash",
    desc: "Tocz kulę po drewnianym torze i zbij kręgle: trzy mierniki i dobry rzut to podstawa.",
    color: "#334155",
    ink: "#ffffff",
    glyph: [".#.#.", "#...#", ".###.", "#...#", ".#.#."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, target: 60, wob: 0.5 },
      { key: "medium", name: "Średni", points: 50, target: 95, wob: 0.3 },
      { key: "hard", name: "Trudny", points: 100, target: 130, wob: 0.15 },
    ],
    rules: [
      "Trzema kolejnymi uderzeniami ustawiasz rzut (myszą albo spacją): pozycję startową kuli, kąt jej biegu i moc.",
      "Kula toczy się po torze i skręca pod wpływem kąta; kręgle przewracają się łańcuchowo od trzasku sąsiednich.",
      "Gra trwa dziesięć ram jak w kręglarstwie; strike i spare premiuje wynik, a pusta rama daje zero punktów.",
      "Wygrywa wynik powyżej celu poziomu; im trudniejsze poziomy, tym wolniej zdryga się miernik, ale cel jest wyższy.",
    ],
    achievements: [
      { id: "strike", name: "Strike", desc: "Zbij wszystkie dziesięć kręgli jednym rzutem.", points: 10 },
      { id: "spare", name: "Spare", desc: "Precyzyjnie domknij ramę drugim rzutem.", points: 25 },
      { id: "seria", name: "Seria", desc: "Zepnij trzy strike'i pod rząd.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74, { cls: "" });
      const g = cv.g;
      const pins = pinLayout();
      const s = { rolls: [], frame: 0, roll: 1, phase: "aim1", osc: 0, wk: 0,
        x: 0, hook: 0, power: 0, bz: 0, bx: 0, resolveWait: 0, strikes: 0, first: 0 };
      const scoreEl = statBlock(ctx, "Punkty", { meter: true });
      const frameEl = statBlock(ctx, "Rama", { small: true });
      const rollEl = statBlock(ctx, "Rzut", { small: true });
      ctx.panel.append(panelBlock("Rzuty", el("p", "kr-leg", "Klikaj planszę albo spacja: kolejno pozycja, kącie, moc.")));

      const hitX = (z, tx) => 50 + tx * (15 - z * 9.5); // szerokość toru zwęża się do końca
      const hitY = (z) => 68 - z * (68 - 22);

      // przejście na kolejny etap
      cv.loop((dt) => {
        if (!ctx.done) {
          const spd = 1.05 + L.wob;
          if (s.phase === "aim1") s.osc = Math.sin(s.wk = (s.wk || 0) + dt * spd) ?? 0;
          else if (s.phase === "aim2") s.osc = Math.sin(s.wk = (s.wk || 0) + dt * spd * 0.9) ?? 0;
          else if (s.phase === "aim3") s.osc = 0.5 - Math.cos(s.wk = (s.wk || 0) + dt * spd) * 0.55;
          else if (s.phase === "roll") {
            s.bz += s.power * 1.25 * dt;
            s.bx += s.hook * dt * (0.4 + s.bz) * 0.35;
            s.bx = Math.max(-0.8, Math.min(0.8, s.bx));
            if (s.bz >= 0.98) {
              s.bz = 1;
              const fallen = resolveRoll(pins, s.bx, s.hook / HOOK_MAX, s.power);
              const k = fallen.length;
              s.rolls.push(k);
              Sound.line();
              if (k === 10) {
                s.strikes = (s.strikes || 0) + 1;
                ctx.achieve("strike");
                if (s.strikes >= 3) ctx.achieve("seria");
                s.banner = { text: "STRIKE", t: 0 };
              } else if (s.roll === 2 && s.first + k === 10) {
                ctx.achieve("spare");
                s.strikes = 0;
                s.banner = { text: "SPARE", t: 0 };
              } else s.strikes = 0;
              if (s.roll === 1) s.first = k;
              s.phase = "settle";
              // strike daje więcej czasu na obejrzenie bannera
              s.resolveWait = k === 10 ? 1.7 : 1.15;
            }
          } else if (s.phase === "settle") {
            s.resolveWait -= dt;
            for (const p of pins) if (!p.up && p.fall < 1) p.fall = Math.min(1, p.fall + dt * 4);
            if (s.resolveWait <= 0) nextRoll();
          }
          // miernık pozycji: wymiar osc
          if (s.phase === "aim1") s.x = s.osc * 0.62;
          if (s.phase === "aim2") s.hook = s.osc * HOOK_MAX;
          if (s.phase === "aim3") s.power = 0.45 + Math.abs(s.osc) * 0.55;
          // banner STRIKE / SPARE gaśnie po 1.6 s
          if (s.banner && (s.banner.t += dt) > 1.6) s.banner = null;
        }
        draw();
      });
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); fire(); });
      ctx.on(document, "keydown", (e) => {
        if (e.key === " " && !ctx.done) { e.preventDefault(); fire(); }
      });

      function fire() {
        if (ctx.done) return;
        Sound.tap();
        if (s.phase === "aim1") { s.phase = "aim2"; return; }
        if (s.phase === "aim2") { s.phase = "aim3"; return; }
        if (s.phase === "aim3") { s.bz = 0; s.bx = s.x; s.phase = "roll"; }
      }

      function nextRoll() {
        // drugi rzut, gdy zostały stojące
        if (s.roll === 1) {
          if (pins.some((p) => p.up)) {
            s.roll = 2;
            resetAim();
            return;
          }
          endFrame();
          return;
        }
        endFrame();
      }

      // ustawianie krapie na stan mierników
      function resetAim() { s.phase = "aim1"; s.wk = 0; s.osc = 0; s.bz = 0; s.bx = 0; s.hook = 0; s.power = 0; }

      function endFrame() {
        // kolejna rama od pełnego zestawu kręgli
        if (s.frame >= 9) return finish();
        s.frame++;
        startFrame();
      }

      function startFrame() {
        s.roll = 1;
        s.first = 0;
        for (const p of pins) p.up = true;
        resetAim();
      }

      function finish() {
        const total = scoreFrames(s.rolls);
        if (total >= L.target) ctx.win(`Punkty: ${total} z celu ${L.target}.`);
        else ctx.lose("Koniec ram", `Punkty: ${total} z celu ${L.target}.`);
      }

      function draw() {
        g.fillStyle = cv.theme.bg;
        g.fillRect(0, 0, 100, 74);
        // rynny po bokach toru
        for (const side of [-1, 1]) {
          g.fillStyle = "#241a10";
          g.beginPath();
          g.moveTo(hitX(0, side * 0.8), hitY(0));
          g.lineTo(hitX(0, side * 0.93), hitY(0));
          g.lineTo(hitX(1, side * 0.93), hitY(1));
          g.lineTo(hitX(1, side * 0.8), hitY(1));
          g.closePath();
          g.fill();
        }
        // tor w perspektywie: pasy drewniane
        for (let i = 0; i < 9; i++) {
          const z0 = i / 9, z1 = (i + 1) / 9;
          g.fillStyle = "#8a5a33";
          g.beginPath();
          g.moveTo(hitX(z0, -0.8), hitY(z0));
          g.lineTo(hitX(z0, 0.8), hitY(z0));
          g.lineTo(hitX(z1, 0.8), hitY(z1));
          g.lineTo(hitX(z1, -0.8), hitY(z1));
          g.closePath();
          g.fill();
          g.fillStyle = i % 2 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.04)";
          g.fill();
        }
        // linie dzielące tor na pasy
        g.strokeStyle = "rgba(0,0,0,0.1)";
        g.lineWidth = 0.3;
        for (let k = -6; k <= 6; k++) {
          g.beginPath();
          g.moveTo(hitX(0, k / 6 * 0.8), hitY(0));
          g.lineTo(hitX(1, k / 6 * 0.8), hitY(1));
          g.stroke();
        }
        // strzałki nawigacyjne na torze
        for (let kk = -2; kk <= 2; kk++) {
          const ax = hitX(0.32, kk / 6 * 0.62), ay = hitY(0.32);
          g.fillStyle = "rgba(192,57,43,0.55)";
          g.beginPath();
          g.moveTo(ax, ay - 2.4);
          g.lineTo(ax - 1, ay + 0.6);
          g.lineTo(ax + 1, ay + 0.6);
          g.closePath();
          g.fill();
        }
        // kręgle najdalsze najpierw
        const sorted = [...pins].sort((a, b) => b.z - a.z);
        for (const p of sorted) {
          if (!p.up && p.fall >= 1) continue;
          const px = hitX(p.z, p.x), py = hitY(p.z);
          const hh = 6 - p.z * 1.6; // wysokość kręgu
          g.save();
          g.translate(px, py);
          if (!p.up) g.rotate((p.fall) * 1.2 * (p.id % 2 ? 1 : -1));
          // cień
          g.fillStyle = "rgba(0,0,0,0.18)";
          g.beginPath(); g.ellipse(0, 0.6, hh * 0.32, 0.7, 0, 0, 7); g.fill();
          // cisło kręgu
          g.fillStyle = "#efeae2";
          g.beginPath();
          g.ellipse(0, -hh * 0.42, hh * 0.24, hh * 0.46, 0, 0, 7);
          g.fill();
          // czerwony pas
          g.fillStyle = "#c0392b";
          g.fillRect(-hh * 0.24, -hh * 0.52, hh * 0.48, hh * 0.13);
          g.restore();
        }
        // kula
        if (s.phase !== "aim1") {
          // podgląd trajektorii podczas celowania kątem i mocą
          if (s.phase === "aim2" || s.phase === "aim3") {
            g.setLineDash([1.5, 1.7]);
            g.strokeStyle = colorMix(cv.theme.text, 0.5);
            g.lineWidth = 0.4;
            g.beginPath();
            for (let z = 0; z <= 1.01; z += 0.1) {
              const xg = Math.max(-0.8, Math.min(0.8, s.x + s.hook * z * (0.4 + z) * 0.35));
              const px = hitX(z, xg), py = hitY(z);
              z === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
            }
            g.stroke();
            g.setLineDash([]);
          }
          const px = hitX(s.bz, s.bx), py = hitY(s.bz);
          const r = 2.6 - s.bz * 1.3;
          g.fillStyle = "rgba(0,0,0,0.2)";
          g.beginPath(); g.ellipse(px, py + 0.5, r * 0.9, r * 0.35, 0, 0, 7); g.fill();
          const grad = g.createRadialGradient(px - r * 0.35, py - r * 0.4, r * 0.2, px, py, r);
          grad.addColorStop(0, cv.theme.c);
          grad.addColorStop(1, mixDark(cv.theme.c, 0.55));
          g.fillStyle = grad;
          g.beginPath(); g.arc(px, py - r * 0.35, r, 0, 7); g.fill();
        }
        // wskaźnik miernika i etykieta
        g.fillStyle = colorMix(cv.theme.text, 0.85);
        g.font = "3.4px sans-serif";
        const lbl = { aim1: "POZYCJA — klik, spacja", aim2: "KĄT — klik, spacja", aim3: "MOC — klik, spacja", roll: "", settle: "" }[s.phase] || "";
        if (lbl) g.fillText(lbl, 50 - g.measureText(lbl).width / 2, 71);
        // historia rzutów w ramie
        if (s.rolls.length) {
          g.fillStyle = colorMix(cv.theme.text, 0.55);
          g.font = "3px sans-serif";
          g.fillText(`ramy: ${s.rolls.join(" ")}`, 4, 71);
        }
        if (['aim1', 'aim2', 'aim3'].includes(s.phase)) {
          const frac = s.phase === "aim3" ? Math.abs(s.osc) : (s.osc + 1) / 2;
          barMeters(frac);
        }
        scoreEl.set(String(scoreFrames(s.rolls)), Math.min(1, scoreFrames(s.rolls) / L.target));
        frameEl.set(`${Math.min(10, s.frame + 1)} / 10`);
        rollEl.set(s.roll === 1 ? "pierwszy" : "drugi");
        ctx.progress(Math.min(1, (s.frame) / 10));
        // wielki napis STRIKE / SPARE
        if (s.banner) {
          const a = s.banner.t < 0.2 ? s.banner.t / 0.2 : Math.max(0, 1 - (s.banner.t - 1.2) / 0.4);
          g.font = "8px sans-serif";
          g.textAlign = "center";
          g.strokeStyle = `rgba(0,0,0,${a * 0.7})`;
          g.lineWidth = 1;
          g.strokeText(s.banner.text, 50, 41);
          g.fillStyle = s.banner.text === "STRIKE" ? `rgba(240,206,90,${a})` : `rgba(120,210,140,${a})`;
          g.fillText(s.banner.text, 50, 41);
          g.textAlign = "left";
        }
      }

      function barMeters(frac) {
        g.fillStyle = "rgba(0,0,0,0.25)";
        g.fillRect(26, 30, 48, 4);
        g.fillStyle = cv.theme.c;
        g.fillRect(26, 30, 48 * Math.max(0, Math.min(1, frac)), 4);
      }
      function mixDark(c, k) {
        const n = parseInt(c.slice(1), 16);
        const r = ((n >> 16) & 255) * k, gg = ((n >> 8) & 255) * k, b2 = (n & 255) * k;
        return `rgb(${r | 0},${gg | 0},${b2 | 0})`;
      }
      function colorMix(c, a) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgba(${r},${gg},${b2},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}
