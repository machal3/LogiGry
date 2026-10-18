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
    "Trzy albo więcej stykających się bąbelków w jednym kolorze pęka. Bąbelki, które straciły połączenie z sufitem, spadają.",
    "Co kilka strzałów z góry dochodzi nowy rząd. Wyczyść planszę, zanim bąbelki dotrą do linii na dole. Spacja zamienia bąbelek z następnym.",
  ],
  mount(board, ctx) {
    const { COLS, R } = Bubbles;
    const W = COLS * 2 * R, H = 150, LIMIT = 124, SX = W / 2, SY = 140;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#15aabf"];
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
        Sound.line();
        if (fall.length) Sound.place(9);
      } else Sound.place(3);
      s.shots++;
      if (!total()) { render(); return ctx.win(`Punkty: ${s.score}.`); }
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
    }

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

    function bubble(x, y, c, a = 1, rr = R) {
      g.globalAlpha = a;
      g.fillStyle = COLORS[c];
      g.beginPath(); g.arc(x, y, rr - 0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.28, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
    }
    function draw(dt) {
      g.strokeStyle = "#e03131";
      g.globalAlpha = 0.35;
      g.setLineDash([2, 2]);
      g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(0, LIMIT); g.lineTo(W, LIMIT); g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;
      s.grid.forEach((row, r) => row.forEach((v, c) => { if (v >= 0 && c < Bubbles.width(s, r)) bubble(...Bubbles.pos(s, r, c), v); }));
      // linia celowania z jednym odbiciem
      if (!s.shot && !ctx.done) {
        let x = SX, y = SY, vx = Math.cos(s.aim), vy = Math.sin(s.aim);
        g.fillStyle = theme.muted;
        for (let k = 0; k < 40 && y > 0; k++) {
          x += vx * 3.2; y += vy * 3.2;
          if (x < R || x > W - R) vx = -vx;
          if (k % 2) { g.beginPath(); g.arc(x, y, 0.5, 0, Math.PI * 2); g.fill(); }
        }
      }
      s.falling = s.falling.filter((p) => (p.t -= dt) > 0);
      for (const p of s.falling) {
        if (p.pop) { bubble(p.x, p.y, p.c, p.t / 0.35, R * (1 + (0.35 - p.t) * 2)); continue; }
        p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        bubble(p.x, p.y, p.c, Math.min(1, p.t));
      }
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
