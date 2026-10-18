// Zjadacz (Pac-Man): zjedz wszystkie kropki w labiryncie. Duża kropka pozwala na chwilę zjadać duchy.
// Labirynt jako tekst: # ściana, . kropka, o duża kropka, - drzwi domku duchów, P start gracza, G start duchów.
const PacMan = (() => {
  const MAP = [
    "###################",
    "#........#........#",
    "#o##.###.#.###.##o#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.### # ###.####",
    "   #.#       #.#   ",
    "####.# ##-## #.####",
    "    .  #GGG#  .    ",
    "####.# ##### #.####",
    "   #.#       #.#   ",
    "####.# ##### #.####",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#o.#.....P.....#.o#",
    "##.#.#.#####.#.#.##",
    "#....#...#...#....#",
    "#.######.#.######.#",
    "#.................#",
    "###################",
  ];
  const W = MAP[0].length, H = MAP.length;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const BACK = { up: "down", down: "up", left: "right", right: "left" };
  const at = (x, y) => MAP[y]?.[(x + W) % W] ?? "#";
  // czy z pola (x, y) da się wejść w kierunku d; drzwi tylko dla duchów
  const open = (x, y, d, ghost = false) => {
    const [dx, dy] = DIRS[d], c = at(x + dx, y + dy);
    return c !== "#" && (c !== "-" || ghost);
  };
  const api = { MAP, W, H, DIRS, BACK, at, open, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = PacMan;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "zjadacz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, ghosts: 2, gspeed: 4.6, fright: 8 },
    { key: "medium", name: "Średni", points: 25, ghosts: 3, gspeed: 5.4, fright: 6 },
    { key: "hard", name: "Trudny", points: 50, ghosts: 4, gspeed: 6.1, fright: 4.5 },
  ],
  rules: [
    "Zjedz wszystkie kropki w labiryncie. Strzałki, WASD albo przesunięcie palcem zmieniają kierunek; skręt możesz wcisnąć wcześniej.",
    "Duch, który cię dogoni, zabiera życie. Po zjedzeniu dużej kropki duchy na chwilę uciekają i można je zjeść.",
    "Tunel po bokach przenosi na drugą stronę labiryntu. Masz trzy życia.",
  ],
  mount(board, ctx) {
    const { MAP, W, H, DIRS, BACK, at, open } = PacMan;
    const { gspeed, fright } = ctx.level;
    const S = 6, CW = W * S, CH = H * S;
    const cv = canvasGame(board, ctx, CW, CH, { max: 70 });
    const { g, theme } = cv;
    const find = (ch) => { const out = []; MAP.forEach((row, y) => [...row].forEach((c, x) => c === ch && out.push([x, y]))); return out; };
    const [pStart] = find("P"), homes = find("G");
    const dots = new Set(), power = new Set();
    MAP.forEach((row, y) => [...row].forEach((c, x) => { if (c === "." || c === "P") dots.add(y * W + x); if (c === "o") power.add(y * W + x); }));
    dots.delete(pStart[1] * W + pStart[0]);
    const total = dots.size + power.size;
    const GC = ["#e03131", "#f783ac", "#22b8cf", "#fd7e14"];
    const mk = (x, y, dir, sp) => ({ x, y, dir, t: 0, sp, sx: x, sy: y });
    const s = { pac: mk(...pStart, "left", 6.2), want: "left", ghosts: [], dots, power, lives: 3, fright: 0, score: 0, mouth: 0, eaten: 0, dying: 0, ready: 1.8 };
    PacMan.last = s;
    const spawnGhosts = () => {
      // pierwszy duch wychodzi po sekundzie, kolejne co kilka sekund
      s.ghosts = homes.slice(0, 3).concat([[9, 9]]).slice(0, ctx.level.ghosts).map(([x, y], k) => ({ ...mk(x, y, x < 9 ? "right" : x > 9 ? "left" : "up", gspeed), k, wait: 1 + k * 3.5, eaten: false }));
      s.ready = 1.8;
    };
    spawnGhosts();
    const dotsEl = statBlock(ctx, "Kropki", { meter: true });
    const livesEl = el("p", "bk-lives");
    ctx.panel.append(panelBlock("Życia", livesEl));
    directionInput(ctx, board, (d) => { s.want = d; });

    // krok jednostki po siatce: postęp t od środka pola do następnego
    function advance(e, dt, choose) {
      e.t += e.sp * dt;
      while (e.t >= 1) {
        e.t -= 1;
        const [dx, dy] = DIRS[e.dir];
        e.x = (e.x + dx + W) % W;
        e.y += dy;
        e.dir = choose(e);
        if (!e.dir) { e.t = 0; e.dir = e.last; e.stuck = true; break; }
        e.stuck = false;
        e.last = e.dir;
      }
    }
    const pacChoose = (e) => {
      eat(e.x, e.y);
      if (open(e.x, e.y, s.want)) return s.want;
      return open(e.x, e.y, e.dir) ? e.dir : null;
    };
    function ghostChoose(e) {
      const opts = Object.keys(DIRS).filter((d) => d !== BACK[e.dir] && open(e.x, e.y, d, e.leaving || e.eaten));
      if (!opts.length) return BACK[e.dir];
      if (s.fright && !e.eaten) return pick(opts);
      // cele: pierwszy goni gracza, drugi miejsce przed nim, trzeci krąży, czwarty raz goni, raz ucieka
      const p = s.pac, [fx, fy] = DIRS[s.pac.dir];
      const targets = [[p.x, p.y], [p.x + fx * 4, p.y + fy * 4], [W - 1 - p.x, H - 1 - p.y], Math.hypot(e.x - p.x, e.y - p.y) > 7 ? [p.x, p.y] : [1, H - 2]];
      let [tx, ty] = e.eaten ? [9, 9] : e.leaving ? [9, 7] : targets[e.k];
      if (e.eaten && e.x === 9 && e.y === 9) { e.eaten = false; e.leaving = true; }
      if (e.leaving && e.y <= 7) e.leaving = false;
      return opts.sort((a, b) => {
        const d = (q) => Math.hypot(e.x + DIRS[q][0] - tx, e.y + DIRS[q][1] - ty);
        return d(a) - d(b);
      })[0];
    }
    function eat(x, y) {
      const i = y * W + x;
      if (s.dots.delete(i)) { s.score += 10; s.eaten++; if (s.eaten % 2) Sound.tap(); }
      if (s.power.delete(i)) { s.score += 50; s.fright = fright; s.combo = 0; s.ghosts.forEach((gh) => { if (!gh.eaten) gh.dir = BACK[gh.dir]; }); Sound.line(); }
      render();
      if (!s.dots.size && !s.power.size) ctx.win(`Punkty: ${s.score}.`);
    }
    const pos = (e) => { const [dx, dy] = DIRS[e.dir]; return [(e.x + dx * e.t) * S + S / 2, (e.y + dy * e.t) * S + S / 2]; };

    cv.loop((dt) => {
      if (s.ready > 0) s.ready -= dt;
      else if (!ctx.done && !s.dying) {
        const p = s.pac;
        // natychmiastowe zawrócenie w połowie korytarza
        if (s.want === BACK[p.dir] && !p.stuck) {
          const [dx, dy] = DIRS[p.dir];
          p.x = (p.x + dx + W) % W; p.y += dy; p.t = 1 - p.t; p.dir = s.want;
        }
        if (p.stuck && open(p.x, p.y, s.want)) { p.dir = s.want; p.stuck = false; }
        if (!p.stuck) advance(p, dt, pacChoose);
        s.mouth += dt * 14;
        s.fright = Math.max(0, s.fright - dt);
        for (const e of s.ghosts) {
          if (e.wait > 0) { e.wait -= dt; if (e.wait <= 0) { e.leaving = true; } continue; }
          e.sp = e.eaten ? 11 : s.fright ? 3.6 : gspeed * (1 + 0.15 * (1 - s.dots.size / total));
          advance(e, dt, ghostChoose);
          const [ax, ay] = pos(e), [bx, by] = pos(p);
          if (!e.eaten && Math.hypot(ax - bx, ay - by) < S * 0.75) {
            if (s.fright) { e.eaten = true; s.combo = (s.combo || 0) + 1; s.score += 200 * s.combo; Sound.place(9); }
            else { s.dying = 1.2; s.lives--; Sound.lose(); render(); }
          }
        }
      } else if (s.dying) {
        s.dying -= dt;
        if (s.dying <= 0) {
          s.dying = 0;
          if (s.lives <= 0) ctx.lose("Złapany", `Zostało ${s.dots.size + s.power.size} kropek.`);
          else { Object.assign(s.pac, mk(...pStart, "left", 6.2)); s.want = "left"; spawnGhosts(); ctx.toast(`Zostały ${s.lives} życia`); }
        }
      }
      draw();
    });

    function draw() {
      // ściany: połączone zaokrąglone bloki
      g.fillStyle = "#3b5bdb";
      MAP.forEach((row, y) => [...row].forEach((c, x) => {
        if (c !== "#") return;
        g.beginPath();
        g.roundRect(x * S + 0.6, y * S + 0.6, S - 1.2, S - 1.2, 1.6);
        g.fill();
        if (at(x + 1, y) === "#" && x < W - 1) g.fillRect(x * S + S / 2, y * S + 0.6, S, S - 1.2);
        if (y < H - 1 && at(x, y + 1) === "#") g.fillRect(x * S + 0.6, y * S + S / 2, S - 1.2, S);
      }));
      g.fillStyle = "#f783ac";
      g.fillRect(9 * S, 8 * S + S / 2 - 0.5, S, 1);
      g.fillStyle = theme.text;
      for (const i of s.dots) { g.beginPath(); g.arc((i % W) * S + S / 2, ((i / W) | 0) * S + S / 2, 0.75, 0, Math.PI * 2); g.fill(); }
      const pulse = 1.6 + Math.sin(performance.now() / 150) * 0.4;
      for (const i of s.power) { g.beginPath(); g.arc((i % W) * S + S / 2, ((i / W) | 0) * S + S / 2, pulse, 0, Math.PI * 2); g.fill(); }
      for (const e of s.ghosts) {
        const [x, y] = pos(e);
        const blink = s.fright < 1.5 && Math.floor(s.fright * 6) % 2;
        if (!e.eaten) {
          g.fillStyle = s.fright ? (blink ? "#fff" : "#364fc7") : GC[e.k];
          g.beginPath();
          g.arc(x, y - 0.4, 2.6, Math.PI, 0);
          g.lineTo(x + 2.6, y + 2.4);
          for (let k = 0; k < 3; k++) g.lineTo(x + 2.6 - (k + 0.5) * 1.73, y + 2.4 - (k % 2 ? 0 : 1)), g.lineTo(x + 2.6 - (k + 1) * 1.73, y + 2.4);
          g.closePath();
          g.fill();
        }
        // oczy patrzą w stronę ruchu
        const [dx, dy] = DIRS[e.dir];
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x - 1, y - 0.6, 0.9, 0, Math.PI * 2); g.arc(x + 1, y - 0.6, 0.9, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1c2a6b";
        g.beginPath(); g.arc(x - 1 + dx * 0.4, y - 0.6 + dy * 0.4, 0.45, 0, Math.PI * 2); g.arc(x + 1 + dx * 0.4, y - 0.6 + dy * 0.4, 0.45, 0, Math.PI * 2); g.fill();
      }
      if (s.ready > 0 && !ctx.done) {
        g.fillStyle = theme.c;
        g.font = "700 6px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText("Gotowy!", CW / 2, 11 * S + 4.5);
      }
      const [px, py] = pos(s.pac);
      const ang = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[s.pac.dir];
      const m = s.dying ? Math.min(Math.PI, (1.2 - s.dying) * 3) : Math.abs(Math.sin(s.mouth)) * 0.7;
      g.fillStyle = theme.c;
      g.beginPath();
      g.moveTo(px, py);
      g.arc(px, py, 2.7, ang + m, ang + Math.PI * 2 - m);
      g.closePath();
      g.fill();
    }
    function render() {
      const left = s.dots.size + s.power.size;
      dotsEl.set(`${total - left} / ${total}`, 1 - left / total, `Punkty: ${s.score}`);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress(1 - left / total);
    }
    render();
  },
});
