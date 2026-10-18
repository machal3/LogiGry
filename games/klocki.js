// Klocki (Tetris): plansza 10 × 20, losowanie z „worka” siedmiu klocków, obrót z odbiciem od ścian, cień, schowek.
const Tetris = (() => {
  const COLS = 10, ROWS = 20;
  const SHAPES = {
    I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
  };
  const SIZE = { I: 4, O: 4, T: 3, S: 3, Z: 3, J: 3, L: 3 };
  // komórki klocka po r obrotach w prawo (w ramce SIZE × SIZE)
  const cells = (k, r) => SHAPES[k].map(([x, y]) => {
    let a = x, b = y;
    for (let t = 0; t < ((r % 4) + 4) % 4; t++) [a, b] = [SIZE[k] - 1 - b, a];
    return [a, b];
  });
  const fits = (grid, p) => cells(p.k, p.r).every(([x, y]) => {
    const cx = p.x + x, cy = p.y + y;
    return cx >= 0 && cx < COLS && cy < ROWS && (cy < 0 || !grid[cy * COLS + cx]);
  });
  const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, 1]];
  function rotate(grid, p, dir) {
    for (const [dx, dy] of KICKS) {
      const q = { ...p, r: p.r + dir, x: p.x + dx, y: p.y + dy };
      if (fits(grid, q)) return q;
    }
    return p;
  }
  function bag() { return shuffle(Object.keys(SHAPES)); }
  // wtapia klocek i usuwa pełne wiersze; zwraca numery usuniętych wierszy
  function lock(grid, p) {
    cells(p.k, p.r).forEach(([x, y]) => { if (p.y + y >= 0) grid[(p.y + y) * COLS + p.x + x] = p.k; });
    const full = [];
    for (let y = 0; y < ROWS; y++) if (grid.slice(y * COLS, y * COLS + COLS).every(Boolean)) full.push(y);
    for (const y of full) { grid.splice(y * COLS, COLS); grid.unshift(...new Array(COLS).fill("")); }
    return full;
  }
  const drop = (grid, p) => { let q = p; while (fits(grid, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 }; return q; };
  const api = { COLS, ROWS, SHAPES, SIZE, cells, fits, rotate, bag, lock, drop, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Tetris;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "klocki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 10, fall: 800 },
    { key: "medium", name: "Średni", points: 25, target: 20, fall: 560 },
    { key: "hard", name: "Trudny", points: 50, target: 30, fall: 380 },
  ],
  rules: [
    "Układaj spadające klocki tak, by tworzyły pełne linie. Pełna linia znika. Usuń wymaganą liczbę linii.",
    "Strzałki w bok przesuwają, w górę albo X obraca, Z obraca w drugą stronę, w dół przyspiesza, spacja zrzuca od razu, C odkłada klocek do schowka.",
    "Na telefonie: dotknięcie obraca, przesunięcie w bok przesuwa, w dół zrzuca. Co 10 linii klocki spadają szybciej.",
  ],
  achievements: [
    { id: "dublet", name: "Dublet", desc: "Usuń dwie linie jednym klockiem.", points: 10 },
    { id: "tetris", name: "Czwórka", desc: "Usuń cztery linie jednym klockiem.", points: 25 },
    { id: "blyskawica", name: "Błyskawica", desc: "Wygraj trudny poziom w mniej niż 3 minuty.", points: 50 },
  ],
  mount(board, ctx) {
    const { COLS, ROWS } = Tetris;
    const COLORS = { I: "#15aabf", O: "#fab005", T: "#ae3ec9", S: "#40c057", Z: "#e03131", J: "#1c7ed6", L: "#f76707" };
    const S = 10, W = COLS * S, H = ROWS * S;
    const cv = canvasGame(board, ctx, W, H, { max: 60, cls: "arcade" });
    const { g, theme } = cv;
    const s = { grid: new Array(COLS * ROWS).fill(""), queue: [...Tetris.bag(), ...Tetris.bag()], cur: null, hold: "", held: false, lines: 0, score: 0, flash: [] };
    Tetris.last = s;
    const linesEl = statBlock(ctx, "Linie", { meter: true });
    const nextEl = el("div", "tt-next"), holdEl = el("div", "tt-next");
    const row = el("div", "tt-side");
    const a = el("div"), b = el("div");
    a.append(el("p", "panel-note", "Następne"), nextEl);
    b.append(el("p", "panel-note", "Schowek"), holdEl);
    row.append(a, b);
    ctx.panel.append(panelBlock("", row));
    const keys = {};
    touchPad(ctx, keys, [["l", "W lewo", "i-left"], ["cw", "Obróć", "i-cw"], ["r", "W prawo", "i-right"], ["d", "Zrzuć", "i-down"]]);

    const spawn = (k) => {
      s.cur = { k, r: 0, x: 3, y: k === "I" ? -1 : 0 };
      if (s.queue.length < 7) s.queue.push(...Tetris.bag());
      if (!Tetris.fits(s.grid, s.cur)) { Sound.lose(); ctx.lose("Sufit", `Usunięte linie: ${s.lines}.`); }
    };
    const next = () => { spawn(s.queue.shift()); s.held = false; renderSide(); };
    const speed = () => ctx.level.fall * Math.pow(0.85, Math.floor(s.lines / 10));
    let fallT = 0, lockT = 0;
    function place() {
      const full = Tetris.lock(s.grid, s.cur);
      if (full.length) {
        s.lines += full.length;
        s.score += [0, 100, 300, 500, 800][full.length];
        s.flash = full.map((y) => ({ y, t: 1 }));
        full.length >= 4 ? (Sound.win(), ctx.toast("Tetris!")) : Sound.line();
        if (full.length >= 2) ctx.achieve("dublet");
        if (full.length >= 4) ctx.achieve("tetris");
      } else Sound.place(2);
      render();
      if (s.lines >= ctx.level.target) {
        if (ctx.level.key === "hard" && ctx.time < 180) ctx.achieve("blyskawica");
        s.cur = null; return ctx.win(`Punkty: ${s.score}.`); }
      next();
    }
    const move = (dx) => { if (!s.cur || ctx.done) return; const q = { ...s.cur, x: s.cur.x + dx }; if (Tetris.fits(s.grid, q)) { s.cur = q; lockT = 0; Sound.tap(); } };
    const turn = (dir) => { if (!s.cur || ctx.done) return; const q = Tetris.rotate(s.grid, s.cur, dir); if (q !== s.cur) { s.cur = q; lockT = 0; Sound.tap(); } };
    const hard = () => { if (!s.cur || ctx.done) return; const q = Tetris.drop(s.grid, s.cur); s.score += (q.y - s.cur.y) * 2; s.cur = q; place(); };
    const soft = () => { if (!s.cur || ctx.done) return false; const q = { ...s.cur, y: s.cur.y + 1 }; if (Tetris.fits(s.grid, q)) { s.cur = q; s.score++; return true; } return false; };
    const hold = () => {
      if (!s.cur || ctx.done || s.held) return;
      const k = s.cur.k;
      if (s.hold) spawn(s.hold); else spawn(s.queue.shift());
      s.hold = k;
      s.held = true;
      Sound.flag();
      renderSide();
    };
    // klawiatura z autopowtarzaniem ruchu w bok
    const held = heldKeys(ctx, (k) => {
      if (k === "arrowleft" || k === "a") { move(-1); das = performance.now() + 170; }
      else if (k === "arrowright" || k === "d") { move(1); das = performance.now() + 170; }
      else if (k === "arrowup" || k === "x" || k === "w") turn(1);
      else if (k === "z") turn(-1);
      else if (k === " ") hard();
      else if (k === "c" || k === "shift") hold();
    });
    let das = 0, rep = 0;
    keys.onTap = (k) => { if (k === "l") move(-1); if (k === "r") move(1); if (k === "cw") turn(1); if (k === "d") hard(); };
    let touch = null;
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); touch = { x: e.clientX, y: e.clientY, moved: false }; });
    ctx.on(document, "pointermove", (e) => {
      if (!touch) return;
      const cell = cv.cv.getBoundingClientRect().width / COLS;
      const dx = e.clientX - touch.x;
      if (Math.abs(dx) > cell) { move(Math.sign(dx)); touch.x += Math.sign(dx) * cell; touch.moved = true; }
      if (e.clientY - touch.y > cell * 3 && !touch.moved) { touch.moved = true; hard(); }
    });
    ctx.on(document, "pointerup", () => { if (touch && !touch.moved) turn(1); touch = null; });

    cv.loop((dt, t) => {
      if (s.cur && !ctx.done) {
        const dir = (held.arrowleft || held.a ? -1 : 0) + (held.arrowright || held.d ? 1 : 0);
        if (dir && t > das && t > rep) { move(dir); rep = t + 45; }
        fallT += dt * 1000;
        const step = held.arrowdown || held.s ? Math.min(45, speed()) : speed();
        while (fallT >= step && s.cur) {
          fallT -= step;
          if (!soft()) {
            // krótka chwila na przesunięcie po dotknięciu dna
            lockT += step;
            if (lockT > 400) { lockT = 0; place(); }
          } else lockT = 0;
        }
      }
      draw(dt);
    });

    function cell(x, y, color, alpha = 1) {
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.beginPath();
      g.roundRect(x * S + 0.6, y * S + 0.6, S - 1.2, S - 1.2, 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.fillRect(x * S + 1.5, y * S + 1.5, S - 3, 1.6);
      g.fillStyle = "rgba(0,0,0,0.16)";
      g.fillRect(x * S + 1.5, y * S + S - 2.6, S - 3, 1.4);
      g.globalAlpha = 1;
    }
    function draw(dt) {
      g.strokeStyle = theme.line;
      g.lineWidth = 0.3;
      for (let x = 1; x < COLS; x++) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, H); g.stroke(); }
      for (let y = 1; y < ROWS; y++) { g.beginPath(); g.moveTo(0, y * S); g.lineTo(W, y * S); g.stroke(); }
      s.grid.forEach((k, i) => k && cell(i % COLS, (i / COLS) | 0, COLORS[k]));
      s.flash = s.flash.filter((f) => (f.t -= dt * 3) > 0);
      for (const f of s.flash) { g.fillStyle = `rgba(255,255,255,${f.t * 0.8})`; g.fillRect(0, f.y * S, W, S); }
      if (s.cur && !ctx.done) {
        const ghost = Tetris.drop(s.grid, s.cur);
        Tetris.cells(ghost.k, ghost.r).forEach(([x, y]) => {
          g.strokeStyle = COLORS[ghost.k];
          g.lineWidth = 0.8;
          g.globalAlpha = 0.55;
          g.beginPath();
          g.roundRect((ghost.x + x) * S + 1, (ghost.y + y) * S + 1, S - 2, S - 2, 2);
          g.stroke();
          g.globalAlpha = 1;
        });
        Tetris.cells(s.cur.k, s.cur.r).forEach(([x, y]) => s.cur.y + y >= 0 && cell(s.cur.x + x, s.cur.y + y, COLORS[s.cur.k]));
      }
    }
    const mini = (k) => {
      const d = el("div", "tt-mini");
      if (!k) return d;
      Tetris.cells(k, 0).forEach(([x, y]) => { const q = el("i"); q.style.gridArea = `${y + 1} / ${x + 1}`; q.style.background = COLORS[k]; d.append(q); });
      return d;
    };
    function renderSide() {
      nextEl.replaceChildren(...s.queue.slice(0, 3).map(mini));
      holdEl.replaceChildren(mini(s.hold));
    }
    function render() {
      linesEl.set(`${s.lines} / ${ctx.level.target}`, s.lines / ctx.level.target, `Punkty: ${s.score}`);
      ctx.progress(s.lines / ctx.level.target);
    }
    next();
    render();
  },
});
