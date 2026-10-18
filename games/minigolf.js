// Minigolf: odciągnij piłkę i puść, żeby uderzyć. Trzy dołki na poziom; piasek hamuje, woda dolicza uderzenie karne.
// Dołek we współrzędnych 100 × 150: tee, cup, par, ściany/piasek/woda jako [x, y, w, h], ruchome przeszkody.
const Golf = (() => {
  const HOLES = {
    easy: [
      { tee: [50, 132], cup: [50, 24], par: 2, walls: [[28, 72, 44, 6]] },
      { tee: [76, 132], cup: [76, 22], par: 3, walls: [[50, 38, 46, 76]] },
      { tee: [20, 134], cup: [80, 22], par: 3, walls: [[4, 96, 62, 6], [34, 56, 62, 6]] },
    ],
    medium: [
      { tee: [50, 136], cup: [50, 20], par: 3, walls: [[4, 42, 30, 6], [66, 42, 30, 6]], sand: [[28, 62, 44, 30]] },
      { tee: [20, 136], cup: [80, 22], par: 3, walls: [[50, 26, 6, 40]], water: [[4, 76, 40, 14], [62, 76, 34, 14]] },
      { tee: [14, 136], cup: [86, 18], par: 4, walls: [[4, 102, 72, 5], [24, 66, 72, 5], [4, 32, 72, 5]], sand: [[78, 40, 18, 22]] },
    ],
    hard: [
      { tee: [50, 136], cup: [50, 20], par: 2, walls: [[4, 64, 22, 6], [74, 64, 22, 6]], movers: [{ x: 26, y: 64, w: 18, h: 6, ax: "x", min: 26, max: 56, speed: 30 }] },
      { tee: [20, 136], cup: [24, 20], par: 3, water: [[4, 52, 66, 12], [86, 52, 10, 12]], sand: [[28, 88, 44, 18]], walls: [[40, 20, 6, 32]] },
      { tee: [14, 136], cup: [86, 20], par: 4, walls: [[30, 4, 6, 100], [64, 46, 6, 100]], movers: [{ x: 36, y: 40, w: 28, h: 6, ax: "y", min: 12, max: 120, speed: 42 }] },
    ],
  };
  const R = 2.2, CUP = 3.4;
  const inside = (x, y, [rx, ry, rw, rh]) => x > rx && x < rx + rw && y > ry && y < ry + rh;

  // Ruch piłki o dt sekund. Zwraca "cup", "water" albo null.
  function step(b, hole, dt) {
    const sand = (hole.sand || []).some((r) => inside(b.x, b.y, r));
    const k = sand ? 3.6 : 1.1;
    b.vx *= Math.exp(-k * dt);
    b.vy *= Math.exp(-k * dt);
    const n = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / 1) || 1;
    for (let i = 0; i < n; i++) {
      b.x += (b.vx * dt) / n;
      b.y += (b.vy * dt) / n;
      // ramka pola i ściany: odbicie z utratą części prędkości
      const solids = [[-10, -10, 14, 170], [96, -10, 14, 170], [-10, -10, 120, 14], [-10, 146, 120, 14], ...(hole.walls || []), ...(hole.movers || []).map((m) => [m.x, m.y, m.w, m.h])];
      for (const [rx, ry, rw, rh] of solids) {
        const cx = Math.max(rx, Math.min(b.x, rx + rw)), cy = Math.max(ry, Math.min(b.y, ry + rh));
        const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy);
        if (d >= R || d === 0) continue;
        const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
        b.x = cx + nx * R;
        b.y = cy + ny * R;
        if (dot < 0) { b.vx -= 1.75 * dot * nx; b.vy -= 1.75 * dot * ny; b.bump = true; }
      }
    }
    const sp = Math.hypot(b.vx, b.vy);
    const dc = Math.hypot(b.x - hole.cup[0], b.y - hole.cup[1]);
    if (dc < CUP && sp < 75) return "cup";
    // piłka lekko przyciągana przez dołek, gdy toczy się blisko i wolno
    if (dc < CUP * 2 && sp < 40) { b.vx += ((hole.cup[0] - b.x) / dc) * 30 * dt; b.vy += ((hole.cup[1] - b.y) / dc) * 30 * dt; }
    if ((hole.water || []).some((r) => inside(b.x, b.y, r))) return "water";
    if (sp < 1.5) { b.vx = 0; b.vy = 0; }
    return null;
  }
  const api = { HOLES, R, CUP, inside, step, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Golf;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "minigolf"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, set: "easy", maxStrokes: 9 },
    { key: "medium", name: "Średni", points: 25, set: "medium", maxStrokes: 8 },
    { key: "hard", name: "Trudny", points: 50, set: "hard", maxStrokes: 8 },
  ],
  rules: [
    "Przeciągnij od piłki w przeciwną stronę niż chcesz uderzyć, jak procą, i puść. Im dłużej przeciągniesz, tym mocniej.",
    "Piasek mocno hamuje piłkę. Wpadnięcie do wody kosztuje jedno uderzenie karne i powrót na poprzednie miejsce.",
    "Zagraj trzy dołki. Na jednym dołku możesz uderzyć najwyżej kilka razy. Klawiatura: strzałki celują i ustalają siłę, spacja uderza.",
  ],
  achievements: [
    { id: "ponizej-par", name: "Poniżej par", desc: "Skończ dołek w mniej uderzeniach, niż wynosi par.", points: 10 },
    { id: "hole-in-one", name: "Dołek jednym uderzeniem", desc: "Traf do dołka pierwszym uderzeniem.", points: 25 },
    { id: "mistrz-pola", name: "Mistrz pola", desc: "Skończ trudny poziom z wynikiem poniżej par.", points: 50 },
  ],
  mount(board, ctx) {
    const W = 100, H = 150;
    const holes = Golf.HOLES[ctx.level.set].map((h) => JSON.parse(JSON.stringify(h)));
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g } = cv;
    const s = { hole: 0, strokes: 0, total: 0, ball: null, last: null, aim: null, sinking: 0 };
    Golf.last = s;
    let kAngle = -Math.PI / 2, kPower = 0.5, keyAim = false;
    const holeEl = statBlock(ctx, "Dołek", { meter: true });
    const cardEl = el("div", "golf-card");
    ctx.panel.append(panelBlock("Karta wyników", cardEl));
    const scores = [];
    const place = () => {
      const h = holes[s.hole];
      s.ball = { x: h.tee[0], y: h.tee[1], vx: 0, vy: 0 };
      s.last = { x: h.tee[0], y: h.tee[1] };
      s.strokes = 0;
      render();
    };
    const still = () => s.ball && !s.ball.vx && !s.ball.vy && !s.sinking;
    function shoot(dx, dy) {
      if (ctx.done || !still()) return;
      const len = Math.min(42, Math.hypot(dx, dy));
      if (len < 2) return;
      s.last = { x: s.ball.x, y: s.ball.y };
      const k = (len * 4.6) / Math.hypot(dx, dy);
      s.ball.vx = dx * k;
      s.ball.vy = dy * k;
      s.strokes++;
      Sound.place(Math.min(9, 1 + Math.round(len / 6)));
      render();
    }
    let drag = null;
    ctx.on(cv.cv, "pointerdown", (e) => {
      if (!still()) return;
      e.preventDefault();
      keyAim = false;
      drag = cv.at(e);
    });
    ctx.on(document, "pointermove", (e) => { if (drag) s.aim = cv.at(e); });
    ctx.on(document, "pointerup", (e) => {
      if (!drag) return;
      const [x, y] = cv.at(e);
      const [x0, y0] = drag;
      drag = null;
      s.aim = null;
      shoot(x0 - x, y0 - y);
    });
    heldKeys(ctx, (k) => {
      if (k === "arrowleft") kAngle -= 0.1;
      else if (k === "arrowright") kAngle += 0.1;
      else if (k === "arrowup") kPower = Math.min(1, kPower + 0.1);
      else if (k === "arrowdown") kPower = Math.max(0.1, kPower - 0.1);
      else if (k === " " || k === "enter") { keyAim = false; return shoot(Math.cos(kAngle) * kPower * 42, Math.sin(kAngle) * kPower * 42); }
      else return;
      keyAim = true;
    });

    cv.loop((dt) => {
      const h = holes[s.hole];
      for (const m of h.movers || []) {
        m[m.ax] += m.speed * dt;
        if (m[m.ax] < m.min || m[m.ax] > m.max) { m.speed *= -1; m[m.ax] = Math.max(m.min, Math.min(m.max, m[m.ax])); }
      }
      if (s.ball && !ctx.done && !s.sinking) {
        const res = Golf.step(s.ball, h, dt);
        if (s.ball.bump) { Sound.tap(); s.ball.bump = false; }
        if (res === "water") {
          Sound.erase();
          ctx.toast("Plusk! Uderzenie karne");
          s.strokes++;
          Object.assign(s.ball, { x: s.last.x, y: s.last.y, vx: 0, vy: 0 });
          render();
        } else if (res === "cup") {
          s.sinking = 1;
          Sound.line();
        } else if (still() && s.strokes >= ctx.level.maxStrokes) {
          ctx.lose("Za dużo uderzeń", `Na dołku ${s.hole + 1} zabrakło uderzeń.`);
        }
      }
      if (s.sinking) {
        s.sinking -= dt * 2.2;
        if (s.sinking <= 0) {
          s.sinking = 0;
          scores.push(s.strokes);
          s.total += s.strokes;
          if (s.strokes < h.par) ctx.achieve("ponizej-par");
          if (s.strokes === 1) ctx.achieve("hole-in-one");
          const diff = s.strokes - h.par;
          ctx.toast(s.strokes === 1 ? "Hole in one!" : diff < 0 ? "Poniżej par!" : diff === 0 ? "Par" : `${diff > 0 ? "+" : ""}${diff} ponad par`);
          if (s.hole === holes.length - 1) {
            render();
            const par = holes.reduce((a, x) => a + x.par, 0);
            if (ctx.level.key === "hard" && s.total < par) ctx.achieve("mistrz-pola");
            return ctx.win(`Wynik: ${s.total} przy par ${par}.`);
          }
          s.hole++;
          place();
        }
      }
      draw(h);
    });

    function rect([x, y, w, hh], fill, r = 2) { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, hh, r); g.fill(); }
    function draw(h) {
      // trawa w pasy
      for (let y = 4; y < 146; y += 12) { g.fillStyle = (y / 12) % 2 < 1 ? "#d3f9d8" : "#c3f0ca"; g.fillRect(4, y, 92, 12); }
      for (const r of h.sand || []) rect(r, "#f3d9a4", 6);
      for (const r of h.water || []) {
        rect(r, "#4dabf7", 3);
        g.strokeStyle = "rgba(255,255,255,0.6)";
        g.lineWidth = 0.6;
        for (let x = r[0] + 3; x < r[0] + r[2] - 3; x += 7) { g.beginPath(); g.arc(x, r[1] + r[3] / 2 + Math.sin(performance.now() / 400 + x) * 1.2, 1.5, Math.PI, 0); g.stroke(); }
      }
      for (const r of h.walls || []) { rect([r[0], r[1] + 1, r[2], r[3]], "#5c3d24", 1.5); rect(r, "#8d6e63", 1.5); }
      for (const m of h.movers || []) { rect([m.x, m.y + 1, m.w, m.h], "#a61e4d", 1.5); rect([m.x, m.y, m.w, m.h], "#e64980", 1.5); }
      // ramka
      g.strokeStyle = "#5c3d24";
      g.lineWidth = 2;
      g.strokeRect(3, 3, 94, 144);
      // dołek z chorągiewką
      const [cx, cy] = h.cup;
      g.fillStyle = "#1d1f27";
      g.beginPath();
      g.arc(cx, cy, Golf.CUP, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#495057";
      g.lineWidth = 0.6;
      g.beginPath();
      g.moveTo(cx, cy); g.lineTo(cx, cy - 14);
      g.stroke();
      g.fillStyle = "#e03131";
      g.beginPath();
      g.moveTo(cx, cy - 14); g.lineTo(cx + 7, cy - 11.5); g.lineTo(cx, cy - 9);
      g.fill();
      // celowanie: przerywana linia w kierunku strzału
      const b = s.ball;
      if (b && still()) {
        let dx = 0, dy = 0;
        if (drag && s.aim) { dx = drag[0] - s.aim[0]; dy = drag[1] - s.aim[1]; }
        else if (keyAim) { dx = Math.cos(kAngle) * kPower * 42; dy = Math.sin(kAngle) * kPower * 42; }
        const len = Math.min(42, Math.hypot(dx, dy));
        if (len > 2) {
          const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
          g.strokeStyle = len > 34 ? "#e03131" : "#1d1f27";
          g.lineWidth = 0.8;
          g.setLineDash([1.6, 1.6]);
          g.beginPath();
          g.moveTo(b.x, b.y);
          g.lineTo(b.x + ux * len * 1.4, b.y + uy * len * 1.4);
          g.stroke();
          g.setLineDash([]);
        }
      }
      if (b) {
        const sc = s.sinking ? s.sinking : 1;
        g.fillStyle = "rgba(0,0,0,0.2)";
        g.beginPath();
        g.arc(b.x + 0.6, b.y + 0.8, Golf.R * sc, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(s.sinking ? cx + (b.x - cx) * sc : b.x, s.sinking ? cy + (b.y - cy) * sc : b.y, Golf.R * sc, 0, Math.PI * 2);
        g.fill();
      }
    }
    function render() {
      const h = holes[s.hole];
      holeEl.set(`${s.hole + 1} / ${holes.length}`, s.hole / holes.length, `Par ${h.par}. Uderzenia: ${s.strokes} z ${ctx.level.maxStrokes}`);
      cardEl.replaceChildren(...holes.map((x, k) => {
        const c = el("span", `golf-hole${k === s.hole && !ctx.done ? " now" : ""}`);
        c.append(el("b", "", k + 1), el("i", "", scores[k] ?? (k === s.hole ? s.strokes || "–" : "–")), el("small", "", `par ${x.par}`));
        return c;
      }));
      ctx.progress(s.hole / holes.length);
    }
    place();
  },
});
