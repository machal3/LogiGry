// Bąbelki (Bubble Shooter): wystrzel bąbelek; trzy lub więcej w jednym kolorze pękają, a te bez podparcia spadają.
// Siatka heksagonalna: wiersz r przesunięty o pół bąbelka, gdy (r + shift) jest nieparzyste; taki wiersz ma o jeden mniej.
const Bubbles = (() => {
  const COLS = 10, ROWS = 15, R = 5;
  const shifted = (s, r) => (r + s.shift) % 2 === 1;
  const width = (s, r) => (shifted(s, r) ? COLS - 1 : COLS);
  const pos = (s, r, c) => [R + c * 2 * R + (shifted(s, r) ? R : 0), R + r * R * 1.74];
  function nbrs(s, r, c) {
    const out = [[r, c - 1], [r, c + 1]];
    const d = shifted(s, r) ? [0, 1] : [-1, 0];
    for (const rr of [r - 1, r + 1]) for (const dc of d) out.push([rr, c + dc]);
    return out.filter(([a, b]) => a >= 0 && a < ROWS && b >= 0 && b < width(s, a));
  }
  function create(rows, kinds) {
    const s = { grid: Array.from({ length: ROWS }, () => new Array(COLS).fill(-1)), shift: 0, kinds };
    for (let r = 0; r < rows; r++) for (let c = 0; c < width(s, r); c++) s.grid[r][c] = rnd(kinds);
    return s;
  }
  // grupa tego samego koloru i bąbelki bez połączenia z sufitem
  function group(s, r, c) {
    const col = s.grid[r][c], seen = new Set([`${r},${c}`]), stack = [[r, c]];
    while (stack.length) {
      const [a, b] = stack.pop();
      for (const [x, y] of nbrs(s, a, b)) if (s.grid[x][y] === col && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); stack.push([x, y]); }
    }
    return [...seen].map((k) => k.split(",").map(Number));
  }
  function floating(s) {
    const seen = new Set(), stack = [];
    for (let c = 0; c < width(s, 0); c++) if (s.grid[0][c] >= 0) { seen.add(`0,${c}`); stack.push([0, c]); }
    while (stack.length) {
      const [a, b] = stack.pop();
      for (const [x, y] of nbrs(s, a, b)) if (s.grid[x][y] >= 0 && !seen.has(`${x},${y}`)) { seen.add(`${x},${y}`); stack.push([x, y]); }
    }
    const out = [];
    s.grid.forEach((row, r) => row.forEach((v, c) => { if (v >= 0 && c < width(s, r) && !seen.has(`${r},${c}`)) out.push([r, c]); }));
    return out;
  }
  // nowy rząd na górze, reszta zjeżdża w dół
  function pushRow(s) {
    s.shift ^= 1;
    s.grid.pop();
    s.grid.unshift(new Array(COLS).fill(-1));
    for (let c = 0; c < width(s, 0); c++) s.grid[0][c] = rnd(s.kinds);
    s.grid.forEach((row, r) => { if (width(s, r) < COLS) row[COLS - 1] = -1; });
  }
  const api = { COLS, ROWS, R, shifted, width, pos, nbrs, create, group, floating, pushRow, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Bubbles;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "babelki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, rows: 5, kinds: 4, every: 8 },
    { key: "medium", name: "Średni", points: 25, rows: 6, kinds: 5, every: 7 },
    { key: "hard", name: "Trudny", points: 50, rows: 7, kinds: 6, every: 6 },
  ],
  rules: [
    "Celuj wskaźnikiem albo palcem i kliknij, żeby wystrzelić bąbelek. Bąbelki odbijają się od ścian.",
    "Trzy albo więcej stykających się bąbelków w jednym kolorze (i z tym samym znakiem) pęka. Bąbelki, które straciły połączenie z sufitem, spadają.",
    "Co kilka strzałów z góry dochodzi nowy rząd. Wyczyść planszę, zanim bąbelki dotrą do linii na dole. Spacja zamienia bąbelek z następnym.",
  ],
  achievements: [
    { id: "lawina", name: "Lawina", desc: "Strąć jednym strzałem co najmniej 10 bąbelków.", points: 25 },
    { id: "celne-oko", name: "Celne oko", desc: "Wyczyść planszę, oddając najwyżej tyle strzałów, ile to połowa bąbelków na starcie.", points: 25 },
    { id: "blyskawiczne-pekanie", name: "Błyskawiczne pękanie", desc: "Wygraj trudny poziom w mniej niż 2 minuty.", points: 50 },
  ],
  mount(board, ctx) {
    const { COLS, R } = Bubbles;
    const W = COLS * 2 * R, H = 150, LIMIT = 124, SX = W / 2, SY = 140;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    const COLORS = ["#f03e3e", "#228be6", "#fab005", "#37b24d", "#ae3ec9", "#15aabf"];
    const SHADES = ["#a51d1d", "#124f8f", "#b35c00", "#1b6b2a", "#6a1f80", "#0b6170"];
    const s = Bubbles.create(ctx.level.rows, ctx.level.kinds);
    Bubbles.last = s;
    const total = () => s.grid.flat().filter((v) => v >= 0).length;
    const present = () => [...new Set(s.grid.flat().filter((v) => v >= 0))];
    const nextColor = () => pick(present().length ? present() : [0]);
    Object.assign(s, { cur: nextColor(), next: nextColor(), shot: null, aim: -Math.PI / 2, shots: 0, falling: [], score: 0, start: total() });
    const leftEl = statBlock(ctx, "Bąbelki", { meter: true });
    const shotsEl = statBlock(ctx, "Do nowego rzędu", { small: true });

    ctx.on(cv.cv, "pointermove", (e) => { const [x, y] = cv.at(e); s.aim = Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(y - SY, x - SX))); });
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); const [x, y] = cv.at(e); s.aim = Math.max(-Math.PI + 0.15, Math.min(-0.15, Math.atan2(y - SY, x - SX))); });
    ctx.on(cv.cv, "pointerup", () => fire());
    const keys = heldKeys(ctx, (k) => {
      if (k === "arrowup" || k === "enter") fire();
      if (k === " ") swap();
    });
    function swap() { if (s.shot || ctx.done) return; [s.cur, s.next] = [s.next, s.cur]; Sound.tap(); }
    function fire() {
      if (s.shot || ctx.done) return;
      s.shot = { x: SX, y: SY, vx: Math.cos(s.aim) * 170, vy: Math.sin(s.aim) * 170, c: s.cur };
      s.cur = s.next;
      s.next = nextColor();
      Sound.tap();
    }
    // przyklejenie: najbliższe wolne pole obok istniejących bąbelków albo przy suficie
    function stick(b) {
      let best = null, bd = 1e9;
      for (let r = 0; r < Bubbles.ROWS; r++) for (let c = 0; c < Bubbles.width(s, r); c++) {
        if (s.grid[r][c] >= 0) continue;
        if (r > 0 && !Bubbles.nbrs(s, r, c).some(([a, d]) => s.grid[a][d] >= 0)) continue;
        const [x, y] = Bubbles.pos(s, r, c), d = Math.hypot(x - b.x, y - b.y);
        if (d < bd) { bd = d; best = [r, c]; }
      }
      const [r, c] = best;
      s.grid[r][c] = b.c;
      const grp = Bubbles.group(s, r, c);
      if (grp.length >= 3) {
        grp.forEach(([a, d]) => { drop(a, d, true); s.grid[a][d] = -1; });
        const fall = Bubbles.floating(s);
        fall.forEach(([a, d]) => { drop(a, d, false); s.grid[a][d] = -1; });
        s.score += grp.length * 10 + fall.length * 20;
        if (grp.length + fall.length >= 10) ctx.achieve("lawina");
        Sound.line();
        if (fall.length) Sound.place(9);
      } else Sound.place(3);
      s.shots++;
      if (!total()) {
        if (s.shots <= s.start / 2) ctx.achieve("celne-oko");
        if (ctx.level.key === "hard" && ctx.time < 120) ctx.achieve("blyskawiczne-pekanie");
        render(); return ctx.win(`Punkty: ${s.score}.`); }
      if (s.shots % ctx.level.every === 0) { Bubbles.pushRow(s); Sound.erase(); }
      if (!present().includes(s.cur)) s.cur = nextColor();
      if (!present().includes(s.next)) s.next = nextColor();
      render();
      const low = s.grid.some((row, rr) => row.some((v, cc) => v >= 0 && cc < Bubbles.width(s, rr) && Bubbles.pos(s, rr, cc)[1] + R > LIMIT));
      if (low) ctx.lose("Za nisko", "Bąbelki dotarły do linii.");
    }
    function drop(r, c, pop) {
      const [x, y] = Bubbles.pos(s, r, c);
      s.falling.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: pop ? -20 : 0, c: s.grid[r][c], t: pop ? 0.35 : 2, pop });
      if (pop) for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.random();
        sparks.push({ x, y, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, t: 0.4, c: COLORS[s.grid[r][c]] });
      }
    }
    const sparks = [];
    // drobne bąbelki w tle unoszą się do góry
    const motes = Array.from({ length: 14 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: 0.4 + Math.random() * 1.2, v: 3 + Math.random() * 6 }));

    cv.loop((dt) => {
      if (s.shot && !ctx.done) {
        const b = s.shot;
        for (let k = 0; k < 6 && s.shot; k++) {
          b.x += (b.vx * dt) / 6;
          b.y += (b.vy * dt) / 6;
          if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx); Sound.tap(); }
          if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx); Sound.tap(); }
          const hit = b.y < R || s.grid.some((row, r) => row.some((v, c) => v >= 0 && c < Bubbles.width(s, r) && Math.hypot(...Bubbles.pos(s, r, c).map((p, i) => p - [b.x, b.y][i])) < R * 1.7));
          if (hit) { s.shot = null; stick(b); }
        }
      }
      draw(dt);
    });

    // znak w środku bąbelka: kolor nie jest jedyną informacją
    function mark(x, y, c, rr) {
      const k = rr * 0.34;
      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      if (c === 0) g.arc(x, y, k * 0.8, 0, 7);
      else if (c === 1) g.rect(x - k * 0.7, y - k * 0.7, k * 1.4, k * 1.4);
      else if (c === 2) { g.moveTo(x, y - k); g.lineTo(x + k, y + k * 0.75); g.lineTo(x - k, y + k * 0.75); }
      else if (c === 3) { g.moveTo(x, y - k); g.lineTo(x + k, y); g.lineTo(x, y + k); g.lineTo(x - k, y); }
      else if (c === 4) for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? k * 0.45 : k; g.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
      else { g.moveTo(x, y + k * 0.8); g.bezierCurveTo(x - k * 1.4, y - k * 0.2, x - k * 0.5, y - k * 1.2, x, y - k * 0.4); g.bezierCurveTo(x + k * 0.5, y - k * 1.2, x + k * 1.4, y - k * 0.2, x, y + k * 0.8); }
      g.fill();
    }
    function bubble(x, y, c, a = 1, rr = R) {
      g.globalAlpha = a;
      const gr = g.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.25, COLORS[c]);
      gr.addColorStop(1, SHADES[c]);
      g.fillStyle = gr;
      g.beginPath(); g.arc(x, y, rr - 0.3, 0, Math.PI * 2); g.fill();
      mark(x, y + rr * 0.05, c, rr);
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.beginPath(); g.ellipse(x - rr * 0.38, y - rr * 0.42, rr * 0.26, rr * 0.16, -0.6, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    function draw(dt) {
      // woda: jaśniejsza u góry, z unoszącymi się drobinkami
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "rgba(120,200,255,0.10)");
      bg.addColorStop(1, "rgba(174,62,201,0.12)");
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      for (const m of motes) {
        m.y -= m.v * dt;
        if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; }
        g.strokeStyle = "rgba(120,140,200,0.25)"; g.lineWidth = 0.25;
        g.beginPath(); g.arc(m.x + Math.sin(m.y / 6) * 1.5, m.y, m.r, 0, 7); g.stroke();
      }
      // sufit, który zjeżdża z każdym nowym rzędem
      g.fillStyle = "rgba(90,70,140,0.18)";
      g.fillRect(0, 0, W, 1.2);
      g.strokeStyle = "#e03131";
      g.globalAlpha = 0.45;
      g.setLineDash([2, 2]);
      g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(0, LIMIT); g.lineTo(W, LIMIT); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      s.grid.forEach((row, r) => row.forEach((v, c) => { if (v >= 0 && c < Bubbles.width(s, r)) bubble(...Bubbles.pos(s, r, c), v); }));
      // linia celowania z odbiciem: kropki zanikające z odległością
      if (!s.shot && !ctx.done) {
        let x = SX, y = SY, vx = Math.cos(s.aim), vy = Math.sin(s.aim);
        for (let k = 0; k < 44 && y > 0; k++) {
          x += vx * 3; y += vy * 3;
          if (x < R || x > W - R) vx = -vx;
          if (k % 2) {
            g.fillStyle = COLORS[s.cur];
            g.globalAlpha = Math.max(0.1, 0.8 - k / 55);
            g.beginPath(); g.arc(x, y, 0.65, 0, Math.PI * 2); g.fill();
          }
        }
        g.globalAlpha = 1;
      }
      s.falling = s.falling.filter((p) => (p.t -= dt) > 0);
      for (const p of s.falling) {
        if (p.pop) {
          g.strokeStyle = COLORS[p.c]; g.globalAlpha = p.t / 0.35; g.lineWidth = 0.6;
          g.beginPath(); g.arc(p.x, p.y, R * (1 + (0.35 - p.t) * 3), 0, 7); g.stroke();
          g.globalAlpha = 1;
          continue;
        }
        p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        bubble(p.x, p.y, p.c, Math.min(1, p.t));
      }
      for (const q of sparks) {
        q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt;
        g.globalAlpha = Math.max(0, q.t * 2.5); g.fillStyle = q.c;
        g.beginPath(); g.arc(q.x, q.y, 0.7, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].t <= 0) sparks.splice(i, 1);
      // wyrzutnia obraca się za celownikiem
      g.save();
      g.translate(SX, SY);
      g.rotate(s.aim + Math.PI / 2);
      const bar = g.createLinearGradient(-2.4, 0, 2.4, 0);
      bar.addColorStop(0, "#495057"); bar.addColorStop(0.5, "#adb5bd"); bar.addColorStop(1, "#343a40");
      g.fillStyle = bar;
      g.beginPath(); g.roundRect(-2.4, -11, 4.8, 9, 1.2); g.fill();
      g.restore();
      g.fillStyle = "rgba(73,80,87,0.85)";
      g.beginPath(); g.arc(SX, SY + 2, 7.5, Math.PI, 0); g.fill();
      if (s.shot) bubble(s.shot.x, s.shot.y, s.shot.c);
      else if (!ctx.done) bubble(SX, SY, s.cur);
      bubble(SX + 16, SY + 4, s.next, 0.9, R * 0.65);
      g.fillStyle = theme.muted;
      g.font = "600 4.5px Geist, system-ui, sans-serif";
      g.textAlign = "left";
      g.fillText("następny", SX + 21, SY + 5.5);
    }
    function render() {
      const n = total();
      leftEl.set(n, 1 - n / Math.max(n, s.start), `Punkty: ${s.score}`);
      shotsEl.set(ctx.level.every - (s.shots % ctx.level.every));
      ctx.progress(1 - n / Math.max(n, s.start));
    }
    render();
  },
});
