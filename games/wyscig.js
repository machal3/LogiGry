// Wyścig: widok z góry. Tor to zamknięta krzywa (punkty kontrolne wygładzone Catmull-Romem), szerokość stała.
// Auto: prędkość wzdłuż kierunku + poślizg boczny (drift). Rywale jadą po linii idealnej z lekkim błędem.
const Race = (() => {
  const TRACKS = [
    [[40, 40], [120, 30], [200, 40], [230, 90], [200, 140], [150, 120], [110, 160], [50, 150], [25, 100]],
    [[40, 30], [140, 25], [220, 35], [235, 80], [180, 95], [215, 135], [160, 165], [90, 150], [100, 100], [40, 120], [20, 75]],
    [[30, 30], [90, 20], [130, 55], [170, 20], [230, 35], [225, 100], [175, 110], [215, 160], [120, 165], [75, 120], [40, 160], [15, 100]],
  ];
  // gęsta lista punktów środka toru
  function path(pts, per = 14) {
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    return out;
  }
  // najbliższy punkt toru (indeks i odległość), szukany lokalnie wokół podpowiedzi
  function nearest(P, x, y, hint = -1) {
    let best = 0, bd = Infinity;
    const range = hint < 0 ? P.length : 30;
    for (let k = -range; k <= range; k++) {
      const i = hint < 0 ? k + range : (hint + k + P.length) % P.length;
      if (i < 0 || i >= P.length) continue;
      const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return [best, Math.sqrt(bd)];
  }
  const api = { TRACKS, path, nearest, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Race;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wyscig"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, track: 0, rivals: 3, ai: 0.82, laps: 3 },
    { key: "medium", name: "Średni", points: 50, track: 1, rivals: 4, ai: 0.92, laps: 3 },
    { key: "hard", name: "Trudny", points: 100, track: 2, rivals: 5, ai: 1, laps: 3 },
  ],
  rules: [
    "Wygraj wyścig: przejedź trzy okrążenia jako pierwszy. Strzałki albo WASD: gaz, hamulec i skręt.",
    "Spacja to ręczny hamulec do driftu. Driftowanie ładuje nitro, które odpalasz klawiszem Shift albo N.",
    "Żółte strzałki na torze przyspieszają, plamy oleju wpychają w poślizg, a jazda po trawie mocno spowalnia. Pozycję liczymy po pokonanym dystansie.",
  ],
  achievements: [
    { id: "podium", name: "Podium", desc: "Ukończ wyścig na jednym z trzech pierwszych miejsc.", points: 10 },
    { id: "czysta-jazda", name: "Czysta jazda", desc: "Wygraj wyścig, ani razu nie wyjeżdżając na trawę.", points: 25 },
    { id: "mistrz-kierownicy", name: "Mistrz kierownicy", desc: "Wygraj trudny wyścig, ani razu nie wyjeżdżając na trawę.", points: 50 },
  ],
  mount(board, ctx) {
    const lv = ctx.level;
    const W = 250, H = 180, TW = 17;
    const P = Race.path(Race.TRACKS[lv.track]);
    const N = P.length;
    const cv = canvasGame(board, ctx, W, H, { max: 100 });
    const { g, theme } = cv;
    const COLORS = ["#e03131", "#f59f00", "#2f9e44", "#7048e8", "#0c8599"];
    const dirAt = (i) => { const a = P[i], b = P[(i + 2) % N]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    // boosty i olej rozłożone wzdłuż toru
    const pads = [Math.floor(N * 0.2), Math.floor(N * 0.55), Math.floor(N * 0.8)].map((i) => ({ i, x: P[i][0], y: P[i][1], a: dirAt(i) }));
    const oils = [Math.floor(N * 0.38), Math.floor(N * 0.68)].map((i, k) => { const a = dirAt(i) + Math.PI / 2, o = (k ? -1 : 1) * 4; return { x: P[i][0] + Math.cos(a) * o, y: P[i][1] + Math.sin(a) * o }; });
    const mkCar = (k, color) => {
      const i = (N - 3 - Math.floor(k / 2) * 3 + N) % N, a = dirAt(i), side = (k % 2 ? 1 : -1) * 4;
      return { x: P[i][0] + Math.cos(a + Math.PI / 2) * side, y: P[i][1] + Math.sin(a + Math.PI / 2) * side, a, v: 0, vs: 0, idx: i, lap: -1, prog: i - N, color, nitro: 0, boost: 0, slip: 0, off: (Math.random() - 0.5) * 6, finished: false };
    };
    const me = mkCar(lv.rivals, theme.c);
    const rivals = Array.from({ length: lv.rivals }, (_, k) => Object.assign(mkCar(k, COLORS[k]), { skill: lv.ai * (0.94 + Math.random() * 0.08) }));
    const cars = [me, ...rivals];
    const s = { me, cars, t: -3, finishedOrder: [], skid: [] };
    Race.last = s;
    const posEl = statBlock(ctx, "Pozycja", { meter: false });
    const lapEl = el("div", "td-stats");
    const nitroBar = el("div", "rl-bar xp");
    const nitroFill = el("i");
    nitroBar.append(nitroFill);
    ctx.panel.append(panelBlock("", lapEl, el("p", "rl-small", "Nitro"), nitroBar));
    const keys = heldKeys(ctx, (k) => { if ((k === "shift" || k === "n") && me.nitro >= 0.3 && !me.boost) fireNitro(); });
    const touch = {};
    touchPad(ctx, touch, [["l", "W lewo", "i-left"], ["u", "Gaz", "i-up"], ["r", "W prawo", "i-right"], ["d", "Hamulec", "i-down"]]);
    function fireNitro() { me.boost = me.nitro * 2.2; me.nitro = 0; Sound.line(); }

    function drive(c, thr, steer, hand, dt) {
      const [i, dist] = Race.nearest(P, c.x, c.y, c.idx);
      // postęp liczony po indeksie środka toru; przejście przez metę zwiększa okrążenie
      if (c.idx > N * 0.8 && i < N * 0.2) c.lap++;
      if (c.idx < N * 0.2 && i > N * 0.8) c.lap--;
      c.idx = i;
      c.prog = c.lap * N + i;
      const grass = dist > TW / 2;
      if (grass && c === me) s.grass = true;
      let max = grass ? 34 : 78;
      if (c.boost > 0) { c.boost -= dt; max += 40; thr = 1; }
      c.v += (thr > 0 ? thr * 70 : thr * 120) * dt;
      c.v -= c.v * (grass ? 2.4 : 0.35) * dt;
      c.v = Math.max(-20, Math.min(max, c.v));
      // skręt zależny od prędkości; ręczny wprowadza w poślizg
      const turn = steer * dt * (2.6 + (hand ? 1.6 : 0)) * Math.min(1, Math.abs(c.v) / 30) * Math.sign(c.v || 1);
      c.a += turn;
      c.vs += -turn * c.v * (hand || c.slip > 0 ? 0.9 : 0.35);
      c.vs *= Math.pow(hand || c.slip > 0 ? 0.25 : 0.0005, dt);
      if (hand) c.v *= Math.pow(0.6, dt);
      c.slip = Math.max(0, c.slip - dt);
      c.x += (Math.cos(c.a) * c.v - Math.sin(c.a) * c.vs) * dt;
      c.y += (Math.sin(c.a) * c.v + Math.cos(c.a) * c.vs) * dt;
      c.x = Math.max(3, Math.min(W - 3, c.x));
      c.y = Math.max(3, Math.min(H - 3, c.y));
      for (const p of pads) if (Math.hypot(p.x - c.x, p.y - c.y) < 6 && c.boost <= 0) { c.boost = 0.7; if (c === me) Sound.place(9); }
      for (const o of oils) if (Math.hypot(o.x - c.x, o.y - c.y) < 4.5 && !c.slip) { c.slip = 0.9; c.vs += (Math.random() - 0.5) * 40; if (c === me) Sound.error(); }
      if (Math.abs(c.vs) > 9 && Math.random() < 0.5) s.skid.push([c.x, c.y, 1]);
      return Math.abs(c.vs);
    }
    function ai(c, dt) {
      // cel kilkanaście punktów przed autem, z indywidualnym przesunięciem w poprzek toru
      const ahead = Math.round(5 + c.v / 9), tgt = P[(c.idx + ahead) % N], a = dirAt((c.idx + ahead) % N) + Math.PI / 2;
      const tx = tgt[0] + Math.cos(a) * c.off, ty = tgt[1] + Math.sin(a) * c.off;
      let d = Math.atan2(ty - c.y, tx - c.x) - c.a;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const curve = Math.abs(Math.atan2(Math.sin(dirAt((c.idx + 10) % N) - dirAt(c.idx)), Math.cos(dirAt((c.idx + 10) % N) - dirAt(c.idx))));
      const want = 78 * c.skill * (1 - Math.min(0.45, curve * 0.6));
      drive(c, c.v < want ? 1 : -0.3, Math.max(-1, Math.min(1, d * 3)), false, dt);
    }
    // proste odpychanie aut
    function collide() {
      for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
        const A = cars[a], B = cars[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy);
        if (d < 5.5 && d > 0) { const push = (5.5 - d) / 2, ux = dx / d, uy = dy / d; A.x -= ux * push; A.y -= uy * push; B.x += ux * push; B.y += uy * push; A.v *= 0.97; B.v *= 0.97; }
      }
    }
    const place = () => 1 + cars.filter((c) => c !== me && (c.finished ? !me.finished || c.finT < me.finT : c.prog > me.prog && !me.finished)).length;
    let uiT = 0;
    cv.loop((dt) => {
      dt = Math.min(dt, 0.04);
      if (!ctx.done) {
        s.t += dt;
        if (s.t > 0) {
          const thr = (keys.arrowup || keys.w || touch.u ? 1 : 0) - (keys.arrowdown || keys.s || touch.d ? 1 : 0);
          const steer = (keys.arrowright || keys.d || touch.r ? 1 : 0) - (keys.arrowleft || keys.a || touch.l ? 1 : 0);
          const hand = !!keys[" "];
          const drift = drive(me, thr, steer, hand, dt);
          if (drift > 8 && me.v > 30 && !me.boost) me.nitro = Math.min(1, me.nitro + dt * 0.35);
          rivals.forEach((c) => { if (!c.finished) ai(c, dt); else c.v *= 0.95; });
          collide();
          for (const c of cars) if (!c.finished && c.lap >= lv.laps) { c.finished = true; c.finT = s.t; s.finishedOrder.push(c); }
          if (me.finished) {
            const pl = s.finishedOrder.indexOf(me) + 1;
            if (pl <= 3) ctx.achieve("podium");
            if (pl === 1 && !s.grass) ctx.achieve("czysta-jazda");
            if (pl === 1 && !s.grass && ctx.level.key === "hard") ctx.achieve("mistrz-kierownicy");
            if (pl === 1) ctx.win(`Pierwsze miejsce, czas ${s.t.toFixed(1)} s.`);
            else ctx.lose(`Miejsce ${pl}`, `Zwycięzca był szybszy o ${(s.t - s.finishedOrder[0].finT).toFixed(1)} s.`);
          }
        }
      }
      s.skid = s.skid.filter((m) => (m[2] -= dt * 0.25) > 0).slice(-400);
      uiT += dt;
      if (uiT > 0.15) { uiT = 0; render(); }
      draw();
    });

    // statyczna warstwa toru rysowana raz
    const bg = document.createElement("canvas");
    bg.width = W * 4;
    bg.height = H * 4;
    const b = bg.getContext("2d");
    b.scale(4, 4);
    b.fillStyle = "#8fbf5a";
    b.fillRect(0, 0, W, H);
    for (let k = 0; k < 120; k++) { b.fillStyle = k % 2 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"; b.beginPath(); b.arc((k * 97) % W, (k * 53) % H, 4 + (k % 5), 0, Math.PI * 2); b.fill(); }
    const stroke = (w, c, dash) => { b.strokeStyle = c; b.lineWidth = w; b.lineJoin = "round"; b.setLineDash(dash || []); b.beginPath(); P.forEach((p, k) => b[k ? "lineTo" : "moveTo"](p[0], p[1])); b.closePath(); b.stroke(); };
    stroke(TW + 3, "#e9ecef", [4, 4]);
    stroke(TW + 3, "#e03131", [0, 4, 4, 0]);
    stroke(TW, "#5c5f66");
    stroke(0.6, "rgba(255,255,255,0.5)", [3, 4]);
    b.setLineDash([]);
    {
      const a = dirAt(0) + Math.PI / 2;
      for (let k = -4; k < 4; k++) for (let r = 0; r < 2; r++) {
        b.fillStyle = (k + r) % 2 ? "#fff" : "#212529";
        b.save(); b.translate(P[0][0], P[0][1]); b.rotate(a); b.fillRect(k * 2.1, r * 2.1 - 2.1, 2.1, 2.1); b.restore();
      }
    }
    for (const p of pads) { b.save(); b.translate(p.x, p.y); b.rotate(p.a); b.fillStyle = "#ffd43b"; for (const o of [-3, 1]) { b.beginPath(); b.moveTo(o, -3); b.lineTo(o + 3, 0); b.lineTo(o, 3); b.lineTo(o + 1.2, 0); b.fill(); } b.restore(); }
    for (const o of oils) { b.fillStyle = "rgba(21,22,27,0.75)"; b.beginPath(); b.ellipse(o.x, o.y, 4, 2.8, 0.4, 0, Math.PI * 2); b.fill(); }

    function drawCar(c) {
      g.save();
      g.translate(c.x, c.y);
      g.rotate(c.a);
      if (c.boost > 0) { g.fillStyle = "#ffa94d"; g.beginPath(); g.moveTo(-4, -1.2); g.lineTo(-7 - Math.random() * 3, 0); g.lineTo(-4, 1.2); g.fill(); }
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(-3.6, -1.8, 8, 4.4);
      g.fillStyle = "#212529";
      for (const [x, y] of [[-2.6, -2.4], [1.8, -2.4], [-2.6, 1.7], [1.8, 1.7]]) g.fillRect(x, y, 1.6, 0.8);
      g.fillStyle = c.color;
      g.beginPath(); g.roundRect(-4, -2, 8, 4, 1.2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.75)";
      g.fillRect(0.6, -1.4, 1.6, 2.8);
      g.restore();
    }
    function draw() {
      g.drawImage(bg, 0, 0, W, H);
      for (const [x, y, a] of s.skid) { g.fillStyle = `rgba(30,30,30,${a * 0.35})`; g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); }
      for (const c of cars) if (c !== me) drawCar(c);
      drawCar(me);
      if (s.t < 0.6) {
        g.fillStyle = "rgba(21,22,27,0.6)";
        g.beginPath(); g.roundRect(W / 2 - 22, H / 2 - 12, 44, 24, 6); g.fill();
        g.fillStyle = "#fff";
        g.font = "700 14px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(s.t < 0 ? Math.ceil(-s.t) : "Start!", W / 2, H / 2 + 5);
      }
    }
    function render() {
      const pl = place();
      posEl.set(`${pl} / ${cars.length}`);
      lapEl.replaceChildren(...[["Okrążenie", `${Math.min(lv.laps, Math.max(1, me.lap + 1))} / ${lv.laps}`, ""], ["Czas", `${Math.max(0, s.t).toFixed(1)} s`, "gold"], ["Prędkość", Math.round(Math.abs(me.v) * 3), "lives"]].map(([k, v, c]) => { const d = el("span", `td-stat ${c}`); d.append(el("small", "", k), el("b", "", v)); return d; }));
      nitroFill.style.width = `${(me.boost > 0 ? 1 : me.nitro) * 100}%`;
      ctx.progress(Math.max(0, me.prog) / (lv.laps * N));
    }
    render();
  },
});
