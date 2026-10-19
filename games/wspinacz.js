// Wspinacz: postać sama odbija się od chmurek; sterujesz nią w lewo i w prawo. Wyjście za krawędź przenosi na drugą stronę.
// Niebo ciemnieje z wysokością, a na wyższych poziomach przelatują ptaki, które strącają w dół.
const Climber = { last: null };

if (typeof module !== "undefined") module.exports = Climber;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wspinacz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 1500, moving: 0.1, weak: 0, gapMax: 26, birds: 0 },
    { key: "medium", name: "Średni", points: 25, target: 2500, moving: 0.25, weak: 0.14, gapMax: 30, birds: 0.08 },
    { key: "hard", name: "Trudny", points: 50, target: 4000, moving: 0.35, weak: 0.24, gapMax: 33, birds: 0.18 },
  ],
  rules: [
    "Postać odbija się sama. Strzałki albo A i D przesuwają ją na boki; na telefonie przytrzymaj lewą albo prawą połowę planszy.",
    "Chmurki ze strzałkami są ruchome, szare kruszą się po pierwszym skoku, a sprężyna wystrzeliwuje wysoko.",
    "Na średnim i trudnym przelatują ptaki. Zderzenie z ptakiem strąca w dół.",
    "Wespnij się na wymaganą wysokość. Upadek poniżej ekranu kończy grę.",
  ],
  achievements: [
    { id: "tysiac", name: "Tysiąc w górę", desc: "Wespnij się na wysokość 1000.", points: 10 },
    { id: "chmury", name: "Ponad chmurami", desc: "Wespnij się na wysokość 2500.", points: 25 },
    { id: "unik", name: "Unik", desc: "Wygraj średni lub trudny poziom bez zderzenia z ptakiem.", points: 25 },
    { id: "szybka-wspinaczka", name: "Szybka wspinaczka", desc: "Wygraj trudny poziom w mniej niż 4 minuty.", points: 50 },
  ],
  mount(board, ctx) {
    const { target, moving, weak, gapMax, birds } = ctx.level;
    const W = 100, H = 150;
    const cv = canvasGame(board, ctx, W, H, { max: 80, cls: "sky" });
    const { g, theme } = cv;
    const s = { x: 50, y: 140, vx: 0, vy: -100, cam: 0, best: 0, plats: [], birds: [], bits: [], squash: 0, knocked: 0, hitBird: false };
    Climber.last = s;
    const hEl = statBlock(ctx, "Wysokość", { meter: true });
    // świat: y rośnie w dół jak na ekranie, wysokość = −y
    let topY = 140;
    const addPlat = (y) => {
      const roll = Math.random();
      const kind = roll < weak ? "weak" : roll < weak + moving ? "move" : "norm";
      s.plats.push({ x: 8 + Math.random() * (W - 24), y, w: 16, kind, dir: Math.random() < 0.5 ? -1 : 1, spring: kind === "norm" && Math.random() < 0.08, gone: false, press: 0, seed: Math.random() * 6 });
    };
    s.plats.push({ x: 42, y: 140, w: 16, kind: "norm", dir: 1, spring: false, gone: false, press: 0, seed: 1 });
    while (topY > -40) { topY -= 14 + Math.random() * 10; addPlat(topY); }
    // dalekie chmury tła (paralaksa)
    const far = Array.from({ length: 9 }, () => ({ x: Math.random() * W, y: Math.random() * 600, r: 5 + Math.random() * 9 }));
    const stars = Array.from({ length: 70 }, () => [Math.random() * W, Math.random() * H, Math.random()]);
    const keys = heldKeys(ctx);
    let touchDir = 0;
    ctx.on(cv.cv, "pointerdown", (e) => { const [x] = cv.at(e); touchDir = x < W / 2 ? -1 : 1; });
    ctx.on(document, "pointerup", () => (touchDir = 0));
    ctx.toast("Strzałki albo dotknięcie boków sterują postacią");

    cv.loop((dt) => {
      const dir = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0) || touchDir;
      if (!ctx.done) {
        s.vx += (dir * 220 - s.vx * 6) * dt;
        s.x = (s.x + s.vx * dt + W) % W;
        s.vy += 170 * dt;
        const prevY = s.y;
        s.y += s.vy * dt;
        s.knocked = Math.max(0, s.knocked - dt);
        for (const p of s.plats) {
          if (p.kind === "move") { p.x += p.dir * 18 * dt; if (p.x < 2 || p.x + p.w > W - 2) p.dir *= -1; }
          p.press = Math.max(0, p.press - dt * 4);
          // lądowanie tylko przy opadaniu, gdy stopy przecięły górę chmurki (strącona postać przelatuje przez chmurki)
          if (!p.gone && !s.knocked && s.vy > 0 && prevY <= p.y && s.y >= p.y && s.x > p.x - 3 && s.x < p.x + p.w + 3) {
            s.vy = p.spring ? -165 : -100;
            s.squash = 1;
            p.press = 1;
            if (p.kind === "weak") {
              p.gone = true;
              Sound.erase();
              for (let k = 0; k < 10; k++) s.bits.push({ x: p.x + Math.random() * p.w, y: p.y, vx: (Math.random() - 0.5) * 20, vy: Math.random() * 20, t: 1, c: "#adb5bd", r: 1 + Math.random() * 1.5 });
            } else Sound.place(p.spring ? 9 : 3);
          }
        }
        updateBirds(dt);
        // kamera idzie w górę, nigdy w dół
        s.cam = Math.min(s.cam, s.y - 60);
        while (topY > s.cam - 20) {
          const height = -s.cam;
          topY -= 14 + Math.random() * Math.min(gapMax - 14, 6 + height / 120);
          addPlat(topY);
        }
        s.plats = s.plats.filter((p) => p.y < s.cam + H + 10);
        s.best = Math.max(s.best, Math.floor((140 - s.y) * 2));
        render();
        if (s.best >= 1000 && !s.got1000) { s.got1000 = true; ctx.achieve("tysiac"); }
        if (s.best >= 2500 && !s.got2500) { s.got2500 = true; ctx.achieve("chmury"); }
        if (s.best >= target) {
          if (birds && !s.hitBird) ctx.achieve("unik");
          if (ctx.level.key === "hard" && ctx.time < 240) ctx.achieve("szybka-wspinaczka");
          ctx.win(`Wysokość: ${s.best}.`);
        }
        if (s.y > s.cam + H + 10) { Sound.lose(); ctx.lose("Upadek", `Wysokość: ${s.best} z ${target}.`); }
      }
      draw(dt);
    });

    function updateBirds(dt) {
      if (birds && -s.cam > 300 && Math.random() < birds * dt * 2 && s.birds.length < 2) {
        const left = Math.random() < 0.5;
        s.birds.push({ x: left ? -6 : W + 6, y: s.cam + 15 + Math.random() * 60, vx: (left ? 1 : -1) * (22 + Math.random() * 18), t: 0 });
      }
      for (const b of s.birds) {
        b.x += b.vx * dt;
        b.t += dt;
        b.y += Math.sin(b.t * 3) * 6 * dt;
        if (!s.knocked && Math.hypot(b.x - s.x, b.y - (s.y - 4.5)) < 5.5) {
          s.knocked = 0.5;
          s.vy = 60;
          s.hitBird = true;
          Sound.error();
          ctx.toast("Ptak strącił cię w dół");
          for (let k = 0; k < 8; k++) s.bits.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, t: 1, c: "#ffffff", r: 0.8 });
        }
      }
      s.birds = s.birds.filter((b) => b.x > -10 && b.x < W + 10);
    }

    // kolor nieba zależny od wysokości: dzień, zmierzch, noc
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const SKY = [[[93, 183, 240], [230, 246, 255]], [[124, 108, 214], [255, 194, 160]], [[18, 24, 60], [58, 60, 120]]];
    function sky(h) {
      const k = Math.min(2, h / 2000);
      const i = Math.min(1, Math.floor(k)), f = k - i;
      return [mix(SKY[i][0], SKY[i + 1][0], f), mix(SKY[i][1], SKY[i + 1][1], f)];
    }

    function draw(dt) {
      const h = Math.max(0, -s.cam);
      const [top, bot] = sky(h);
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, `rgb(${top})`);
      bg.addColorStop(1, `rgb(${bot})`);
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      // gwiazdy wysoko nad chmurami
      const night = Math.max(0, Math.min(1, (h - 2400) / 1200));
      if (night) for (const [x, y, b] of stars) {
        g.fillStyle = `rgba(255,255,255,${night * (0.3 + 0.6 * b)})`;
        g.fillRect(x, (y + h * 0.05) % H, 0.5, 0.5);
      }
      // dalekie wzgórza na starcie
      if (h < 200) {
        g.fillStyle = `rgba(120,190,120,${0.8 - h / 250})`;
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 5) g.lineTo(x, 145 - s.cam * 0.3 - Math.sin(x / 13) * 6 - Math.sin(x / 5) * 1.5);
        g.lineTo(W, H); g.fill();
      }
      for (const c of far) {
        const y = (((c.y - s.cam * 0.25) % 600) + 600) % 600 - 60;
        if (y > H + 20) continue;
        g.fillStyle = `rgba(255,255,255,${0.22 * (1 - night)})`;
        g.beginPath(); g.ellipse(c.x, y, c.r * 1.6, c.r * 0.5, 0, 0, 7); g.fill();
      }
      g.save();
      g.translate(0, -s.cam);
      for (const p of s.plats) if (!p.gone) cloud(p);
      for (const b of s.birds) bird(b);
      for (const q of s.bits) {
        q.vy += 80 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt * 1.5;
        g.globalAlpha = Math.max(0, q.t);
        g.fillStyle = q.c;
        g.beginPath(); g.arc(q.x, q.y, q.r, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      s.bits = s.bits.filter((q) => q.t > 0);
      hero(dt);
      g.restore();
      // wysokość
      g.fillStyle = night > 0.5 ? "#ffffff" : theme.text;
      g.font = "700 9px Geist, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText(s.best, 5, 12);
      g.font = "500 3.6px Geist, system-ui, sans-serif";
      g.globalAlpha = 0.7;
      g.fillText(`cel ${target}`, 5, 17);
      g.globalAlpha = 1;
    }

    function cloud(p) {
      const sq = p.press * 1.2;
      const y = p.y + sq;
      const weakC = p.kind === "weak";
      const top = weakC ? "#ced4da" : "#ffffff", base = weakC ? "#868e96" : p.kind === "move" ? "#c5d6ff" : "#d6e6f5";
      // cień i bryła z trzech kłębów
      g.fillStyle = "rgba(30,60,110,0.15)";
      g.beginPath(); g.ellipse(p.x + p.w / 2, y + 3.4, p.w * 0.55, 1.6, 0, 0, 7); g.fill();
      const gr = g.createLinearGradient(0, y - 3.5, 0, y + 3);
      gr.addColorStop(0, top); gr.addColorStop(1, base);
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(p.x + p.w * 0.28, y + 1.2, p.w * 0.3, 2.6, 0, 0, 7);
      g.ellipse(p.x + p.w * 0.55, y + 0.3, p.w * 0.32, 3.4, 0, 0, 7);
      g.ellipse(p.x + p.w * 0.8, y + 1.4, p.w * 0.24, 2.3, 0, 0, 7);
      g.fill();
      if (weakC) {
        g.strokeStyle = "rgba(60,60,70,0.5)"; g.lineWidth = 0.35;
        g.beginPath(); g.moveTo(p.x + p.w * 0.4, y - 2); g.lineTo(p.x + p.w * 0.48, y + 0.5); g.lineTo(p.x + p.w * 0.42, y + 2.5); g.stroke();
      }
      if (p.kind === "move") {
        // strzałki ruchu
        g.fillStyle = "rgba(76,110,245,0.7)";
        for (const d of [-1, 1]) {
          const ax = p.x + p.w / 2 + d * p.w * 0.62;
          g.beginPath(); g.moveTo(ax + d * 1.6, y + 0.5); g.lineTo(ax, y - 0.8); g.lineTo(ax, y + 1.8); g.fill();
        }
      }
      if (p.spring) {
        const ext = 5 - p.press * 2.5;
        g.strokeStyle = "#868e96"; g.lineWidth = 0.6;
        g.beginPath();
        for (let k = 0; k <= 6; k++) g.lineTo(p.x + 7 + (k % 2 ? 2 : 0), y - 0.5 - (k * ext) / 6);
        g.stroke();
        g.fillStyle = "#e03131";
        g.beginPath(); g.roundRect(p.x + 5.5, y - 1.5 - ext, 5, 1.4, 0.6); g.fill();
      }
    }

    function bird(b) {
      const flap = Math.sin(b.t * 14) * 2;
      const d = Math.sign(b.vx);
      g.save();
      g.translate(b.x, b.y);
      g.scale(d, 1);
      g.fillStyle = "#343a40";
      g.beginPath(); g.ellipse(0, 0, 3, 1.6, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-1, 0); g.quadraticCurveTo(-1, -2 - flap, -3.5, -2.5 - flap); g.lineTo(0.8, -0.3); g.fill();
      g.fillStyle = "#fab005"; g.beginPath(); g.moveTo(3, -0.3); g.lineTo(4.6, 0.2); g.lineTo(3, 0.6); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(1.8, -0.5, 0.45, 0, 7); g.fill();
      g.restore();
    }

    // postać: kulka z oczami, rozciąga się w locie i spłaszcza przy odbiciu
    function hero(dt) {
      s.squash = Math.max(0, s.squash - dt * 5);
      const stretch = Math.max(-0.25, Math.min(0.25, -s.vy / 400)) - s.squash * 0.25;
      const rx = 4.2 * (1 - stretch * 0.5), ry = 4.5 * (1 + stretch);
      const cy = s.y - ry;
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.beginPath(); g.ellipse(s.x, s.y + 0.5, rx * 0.8, 0.8, 0, 0, 7); g.fill();
      // stopy
      g.fillStyle = "#0b4f5a";
      g.beginPath(); g.ellipse(s.x - 1.8, s.y - 0.4, 1.5, 0.9, 0, 0, 7); g.ellipse(s.x + 1.8, s.y - 0.4, 1.5, 0.9, 0, 0, 7); g.fill();
      const body = g.createRadialGradient(s.x - 1.5, cy - 2, 0.5, s.x, cy, rx * 1.2);
      body.addColorStop(0, "#5fd3e0"); body.addColorStop(1, theme.c);
      g.fillStyle = s.knocked ? "#868e96" : body;
      g.beginPath(); g.ellipse(s.x, cy, rx, ry, 0, 0, 7); g.fill();
      const look = Math.sign(s.vx) * 0.8;
      g.fillStyle = "#fff";
      g.beginPath();
      g.arc(s.x - 1.4 + look, cy - 1, 1.25, 0, 7);
      g.arc(s.x + 1.4 + look, cy - 1, 1.25, 0, 7);
      g.fill();
      g.fillStyle = "#111";
      g.beginPath();
      g.arc(s.x - 1.2 + look * 1.3, cy - 0.9 + (s.vy > 0 ? 0.3 : -0.2), 0.6, 0, 7);
      g.arc(s.x + 1.6 + look * 1.3, cy - 0.9 + (s.vy > 0 ? 0.3 : -0.2), 0.6, 0, 7);
      g.fill();
      g.fillStyle = "rgba(255,130,150,0.55)";
      g.beginPath(); g.ellipse(s.x - 2.6 + look, cy + 0.8, 0.9, 0.5, 0, 0, 7); g.ellipse(s.x + 2.6 + look, cy + 0.8, 0.9, 0.5, 0, 0, 7); g.fill();
    }

    function render() {
      hEl.set(s.best, s.best / target, `Cel: ${target}`);
      ctx.progress(s.best / target);
    }
    render();
  },
});
