// Rozwiązania nowych gier dla tests/e2e.mjs: kod wykonywany w stronie po otwarciu gry (dostępne: LVL, sleep, press, hit, drag, until, click).
export default {
  kakuro: `
    const { solution, given, white } = Kakuro.last;
    const cells = [...document.querySelectorAll(".kk-cell")];
    const pad = [...document.querySelectorAll(".pad-digit")];
    // zła cyfra (powtórka w ciągu) musi zostać oznaczona
    const free = cells.filter((b) => !given[+b.dataset.i]);
    const a = free[0], i = +a.dataset.i;
    const twin = free.find((b) => b !== a && (((+b.dataset.i / Kakuro.last.n) | 0) === ((i / Kakuro.last.n) | 0)) && Math.abs(+b.dataset.i - i) === 1);
    if (twin) { a.click(); pad[0].click(); twin.click(); pad[0].click(); if (!document.querySelector(".kk-cell.bad")) throw new Error("brak oznaczenia powtórki"); }
    for (const b of free) { b.click(); pad[solution[+b.dataset.i] - 1].click(); }
  `,
  hitori: `
    const { solution } = Hitori.last;
    const cells = [...document.querySelectorAll(".ht .gb-cell")];
    // dwa sąsiednie zamalowane pola to błąd
    press(cells[0]); press(cells[1]);
    if (!cells[0].classList.contains("bad")) throw new Error("brak oznaczenia sąsiadów");
    press(cells[0]); press(cells[0]); press(cells[1]); press(cells[1]);
    solution.forEach((v, i) => v && press(cells[i]));
  `,
  kalkudoku: `
    const { solution } = Kalkudoku.last;
    const cells = [...document.querySelectorAll(".kd-cell")];
    const pad = [...document.querySelectorAll(".pad-digit")];
    cells.forEach((b, i) => { b.click(); hit(String(solution[i])); });
  `,
  petla: `
    const hits = [...document.querySelectorAll(".lp-hit")];
    const edges = [...Loop.last.edges];
    // krzyżyk prawym przyciskiem i rysowanie przeciąganiem po pierwszych krawędziach
    const off = hits.findIndex((_, e) => !Loop.last.edges.has(e));
    press(hits[off], 2);
    if (!document.querySelectorAll(".lp-x.on").length) throw new Error("brak krzyżyka");
    edges.forEach((e) => press(hits[e]));
  `,
  lampy: `
    const cells = [...document.querySelectorAll(".ak .gb-cell")];
    const { solution, wall } = Akari.last;
    // dwie żarówki w jednym rzędzie bez ściany między nimi świecą na siebie
    const n = Akari.last.n;
    const a = wall.findIndex((w, i) => w === -1 && i % n < n - 1 && wall[i + 1] === -1);
    press(cells[a]); press(cells[a + 1]);
    if (!cells[a].classList.contains("bad")) throw new Error("brak konfliktu żarówek");
    press(cells[a]); press(cells[a]); press(cells[a + 1]); press(cells[a + 1]);
    solution.forEach((i) => press(cells[i]));
  `,
  namioty: `
    const { solution } = Tents.last;
    const cells = [...document.querySelectorAll(".tn .gb-cell")].filter((b) => b.dataset.t != null);
    solution.forEach((i) => press(cells[i]));
  `,
  statki: `
    const { ship, hint } = Ships.last;
    const cells = [...document.querySelectorAll(".sh .gb-cell")].filter((b) => b.dataset.t != null);
    ship.forEach((v, i) => v && !hint[i] && press(cells[i]));
  `,
  prostokaty: `
    const { rects, n } = Shikaku.last;
    const cells = [...document.querySelectorAll(".sk .gb-cell")];
    for (const q of rects) drag([cells[q.r * n + q.c], cells[(q.r + q.h - 1) * n + q.c + q.w - 1]]);
  `,
  polaczenia: `
    const { pairs, n } = Flow.last;
    const cells = [...document.querySelectorAll(".fl .gb-cell")];
    for (const p of pairs) drag(p.map((i) => cells[i]));
  `,
  hydraulik: `
    const { turns } = Pipes.last;
    const cells = [...document.querySelectorAll(".pp .gb-cell")];
    turns.forEach((t, i) => { for (let k = 0; k < (4 - (t % 4)) % 4; k++) press(cells[i]); });
  `,
  pietnastka: `
    const tiles = () => [...document.querySelectorAll(".ft-tile")];
    const { solution } = Fifteen.last;
    // kafel stojący na danym polu: jego --r/--c0
    const n = Fifteen.last.n;
    for (const i of solution) {
      const t = tiles().find((b) => +b.style.getPropertyValue("--r") === ((i / n) | 0) && +b.style.getPropertyValue("--c0") === i % n);
      t.click();
    }
  `,
  magazynier: `
    const arrow = (d) => { hit("Arrow" + d[0].toUpperCase() + d.slice(1)); hit("Arrow" + d[0].toUpperCase() + d.slice(1), "keyup"); };
    for (const d of Sokoban.last.solution) { if (document.querySelector(".board-area.won")) break; arrow(d); }
  `,
  korek: `
    const cars = () => [...document.querySelectorAll(".rh-car")];
    let pos = RushHour.last.cars.map((v) => (v.h ? v.c : v.r));
    for (const [k, p] of RushHour.last.solution) {
      const car = cars()[k];
      car.focus();
      const v = RushHour.last.cars[k];
      const d = p > pos[k] ? (v.h ? "ArrowRight" : "ArrowDown") : v.h ? "ArrowLeft" : "ArrowUp";
      for (let t = 0; t < Math.abs(p - pos[k]); t++) hit(d);
      pos[k] = p;
    }
    await until(() => document.querySelector(".board-area.won"));
  `,
  probowki: `
    const t = [...document.querySelectorAll(".ws-tube")];
    WaterSort.last.solution.forEach(([i, j]) => { t[i].click(); t[j].click(); });
  `,
  samotnik: `
    const c = [...document.querySelectorAll(".pg .gb-cell")];
    PegSolitaire.last.solution.forEach(([f, , t]) => { c[f].click(); c[t].click(); });
  `,
  zalewanie: `
    const s = [...document.querySelectorAll(".fd-swatch")];
    Flood.last.plan.forEach((k) => s[k].click());
  `,
  skoczek: `
    const n = [5, 6, 8][LVL];
    const c = [...document.querySelectorAll(".kn .gb-cell")];
    // ruch nie-skoczkowy jest odrzucany
    c[0].click(); c[1].click();
    if (c[1].classList.contains("seen")) throw new Error("zły ruch przyjęty");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
    Knight.tour(n, 0).forEach((i) => c[i].click());
  `,
  mahjong: `
    const t = [...document.querySelectorAll(".mj-tile")];
    const { order, tiles } = Mahjong.last;
    order.forEach(([a, b]) => { t[tiles.indexOf(a)].click(); t[tiles.indexOf(b)].click(); });
  `,
  szyfr: `
    Codebreaker.last.code.forEach((k) => hit(String(k + 1)));
    hit("Enter");
  `,
  labirynt: `
    const { n, keys } = Maze.last;
    const arrow = (d) => { hit("Arrow" + d[0].toUpperCase() + d.slice(1)); hit("Arrow" + d[0].toUpperCase() + d.slice(1), "keyup"); };
    let at = 0;
    for (const k of [...keys, n * n - 1]) { Maze.route(Maze.last.open, n, at, k).forEach(arrow); at = k; }
  `,
  // gry na punkty: stan ustawiony tuż przed celem, potem prawdziwy ruch
  klejnoty: `
    const s = Gems.last, target = [2500, 3500, 4000][LVL];
    s.score = target - 1;
    const b = document.querySelector(".gm"), r = b.getBoundingClientRect();
    const pt = (i) => ({ clientX: r.x + ((i % 8) + 0.5) * r.width / 8, clientY: r.y + (((i / 8) | 0) + 0.5) * r.height / 8, bubbles: true });
    const [a, c] = Gems.findMove(s.g);
    b.dispatchEvent(new PointerEvent("pointerdown", pt(a))); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    b.dispatchEvent(new PointerEvent("pointerdown", pt(c))); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await until(() => document.querySelector(".board-area.won"), 5000);
  `,
  kulki: `
    const s = Lines.last, target = [60, 110, 160][LVL];
    s.g.fill(-1);
    [0, 1, 2, 3, 40].forEach((i) => (s.g[i] = 0));
    s.score = target - 10;
    const c = [...document.querySelectorAll(".ln .gb-cell")];
    c[40].click(); c[4].click();
    await until(() => document.querySelector(".board-area.won"));
  `,
  ukladanka: `
    const s = BlockPuzzle.last, target = [250, 500, 900][LVL];
    s.score = target - 1;
    const k = s.tray.findIndex(Boolean);
    const piece = [...document.querySelectorAll(".bp-piece")].find((b) => +b.dataset.k === k);
    piece.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    [...document.querySelectorAll(".bp-cell")][BlockPuzzle.anyFit(s.g, s.tray[k].shape)].click();
  `,
  pasjans: `
    const c = [...document.querySelectorAll(".tp-card")], st = document.querySelector(".tp-stock");
    TriPeaks.last.solution.forEach((i) => (i < 0 ? st.click() : c[i].click()));
  `,
  slowo: `
    [...Wordle.last.answer].forEach((ch) => hit(ch));
    hit("Enter");
    await until(() => document.querySelector(".board-area.won"));
  `,
  wisielec: `
    // jedna pomyłka, potem całe słowo
    const miss = Hangman.ALPHABET.find((ch) => !Hangman.last.word.includes(ch));
    hit(miss);
    if (!document.querySelector(".hm-key.miss")) throw new Error("brak oznaczenia pomyłki");
    [...new Set(Hangman.last.word)].forEach((ch) => hit(ch));
  `,
  wykreslanka: `
    const c = [...document.querySelectorAll(".wsr .gb-cell")];
    for (const w of WordSearch.last.words) drag([c[w.cells[0]], c[w.cells[w.cells.length - 1]]]);
  `,
  "24": `
    // szukamy kolejności kliknięć na tych samych zasadach scalania co gra
    const find = (items) => {
      if (items.length === 1) return items[0][0] === 24 && items[0][1] === 1 ? [] : null;
      for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        for (const op of Object.keys(Make24.OPS)) {
          const v = Make24.OPS[op](items[i], items[j]);
          if (!v) continue;
          const next = items.filter((_, k) => k !== i && k !== j);
          next.splice(Math.min(j, next.length), 0, v);
          const rest = find(next);
          if (rest) return [[i, op, j], ...rest];
        }
      }
      return null;
    };
    const rounds = [3, 4, 4][LVL];
    for (let r = 0; r < rounds; r++) {
      const steps = find(Make24.last.nums.map((x) => [x, 1]));
      for (const [i, op, j] of steps) {
        const num = () => document.querySelectorAll(".t24-num")[i];
        if (!num().classList.contains("sel")) num().click();
        [...document.querySelectorAll(".t24-op")].find((b) => b.textContent === op).click();
        document.querySelectorAll(".t24-num")[j].click();
      }
      if (r < rounds - 1) await sleep(900);
    }
  `,
  echo: `
    const s = Simon.last;
    s.target = 1;
    await until(() => s.seq.length && !s.playing, 4000);
    document.querySelectorAll(".sm .gb-cell")[s.seq[0]].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await until(() => document.querySelector(".board-area.won"));
  `,
  kret: `
    const s = Moles.last;
    s.hits = [20, 30, 40][LVL] - 1;
    const mole = () => [...document.querySelectorAll(".wm .gb-cell.up")].find((b) => b.dataset.kind !== "bomb" && !b.classList.contains("hit"));
    await until(() => mole(), 4000);
    mole().dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  `,
  stos: `
    const s = Stack.last, target = [15, 22, 30][LVL];
    while (s.tower.length < target) s.tower.push({ ...s.tower[0] });
    await until(() => s.moving && Math.abs(s.moving[s.axis] - s.tower[s.tower.length - 1][s.axis]) < 0.8, 6000);
    hit(" "); hit(" ", "keyup");
  `,
  ptak: `
    const s = Flappy.last;
    s.passed = [10, 20, 30][LVL] - 1;
    hit(" "); hit(" ", "keyup");
    // autopilot: rury mają szczelinę na wysokości lotu, a ptak machnie, gdy opadnie
    for (let t = 0; t < 400 && !document.querySelector(".board-area.won, .board-area.lost"); t++) {
      s.pipes.forEach((p) => (p.gy = 52 - [44, 38, 33][LVL] / 2));
      if (s.y > 56 && s.vy > 0) { hit(" "); hit(" ", "keyup"); }
      await sleep(16);
    }
  `,
  biegacz: `
    hit(" "); hit(" ", "keyup");
    await sleep(50);
    Runner.last.dist = [600, 1000, 1500][LVL];
    await until(() => document.querySelector(".board-area.won"));
  `,
  wspinacz: `
    Climber.last.best = [1500, 2500, 3500][LVL];
    await until(() => document.querySelector(".board-area.won"));
  `,
  klawisze: `
    const s = PianoTiles.last;
    s.hit = [40, 70, 100][LVL] - 1;
    const r = s.rows.find((x) => !x.tapped);
    hit(["d", "f", "j", "k"][r.col]);
  `,
  minigolf: `
    const s = Golf.last;
    for (let h = 0; h < 3; h++) {
      const hole = Golf.HOLES[["easy", "medium", "hard"][LVL]][h];
      Object.assign(s.ball, { x: hole.cup[0], y: hole.cup[1], vx: 0, vy: 0 });
      await until(() => s.hole > h || document.querySelector(".board-area.won"), 3000);
    }
  `,
  klocki: `
    const s = Tetris.last;
    s.lines = [10, 20, 30][LVL] - 1;
    // dolny wiersz pełny poza polami, w które wpadnie bieżący klocek
    const ghost = Tetris.drop(s.grid, s.cur);
    const hole = new Set(Tetris.cells(ghost.k, ghost.r).map(([x, y]) => (ghost.y + y) * 10 + ghost.x + x));
    for (let x = 0; x < 10; x++) if (!hole.has(190 + x)) s.grid[190 + x] = "O";
    if (![...hole].some((i) => i >= 190)) throw new Error("klocek nie sięga dna");
    hit(" ");
    await until(() => document.querySelector(".board-area.won"));
  `,
  najezdzcy: `
    const s = Invaders.last;
    s.wave = [1, 2, 3][LVL];
    s.aliens.forEach((a) => (a.alive = false));
    await until(() => document.querySelector(".board-area.won"));
  `,
  asteroidy: `
    const s = Asteroids.last;
    s.wave = [2, 3, 4][LVL];
    s.rocks = [];
    await until(() => document.querySelector(".board-area.won"));
  `,
  zjadacz: `
    const s = PacMan.last;
    s.dots.clear(); s.power.clear();
    s.dots.add(15 * PacMan.W + 8);
    await until(() => document.querySelector(".board-area.won"), 5000);
  `,
  zaba: `
    const s = Frogger.last;
    const slots = [1, 4, 6, 8, 11].slice(0, [3, 4, 5][LVL]);
    slots.slice(1).forEach((x) => s.homes.add(x));
    s.fx = slots[0]; s.y = 1;
    hit("ArrowUp");
  `,
  babelki: `
    const s = Bubbles.last;
    s.grid.forEach((row) => row.fill(-1));
    s.shift = 0;
    s.grid[0][4] = 0; s.grid[0][5] = 0;
    s.cur = 0;
    const c = document.querySelector(".cvb-canvas"), r = c.getBoundingClientRect();
    const pt = { clientX: r.x + r.width / 2, clientY: r.y + r.height * 0.3, bubbles: true };
    c.dispatchEvent(new PointerEvent("pointerdown", pt));
    c.dispatchEvent(new PointerEvent("pointerup", pt));
    await until(() => document.querySelector(".board-area.won"));
  `,
  smugi: `
    const s = LightCycles.last;
    s.score[0] = [2, 2, 3][LVL] - 1;
    s.bikes.slice(1).forEach((b) => (b.alive = false));
    await until(() => document.querySelector(".board-area.won"), 4000);
  `,
  obrona: `
    const s = Defense.last;
    s.wave = [2, 3, 4][LVL];
    s.queue = 0; s.missiles = [];
    await until(() => document.querySelector(".board-area.won"));
  `,
  "ping-pong": `
    const s = Pong.last;
    s.score[0] = [5, 7, 7][LVL] - 1;
    await until(() => s.b, 3000);
    s.cpu = 10;
    Object.assign(s.b, { x: 90, y: 20, vx: 0, vy: -200 });
    await until(() => document.querySelector(".board-area.won"));
  `,
  // gry z komputerem: plansza ustawiona tuż przed wygranym ruchem, potem prawdziwy ruch gracza
  czworki: `
    const { b } = Connect4.last;
    b.fill(0);
    [35, 36, 37].forEach((i) => (b[i] = 1));
    [28, 29].forEach((i) => (b[i] = 2));
    hit("4");
  `,
  reversi: `
    const { b } = Reversi.last;
    b.fill(1); b[0] = 0; b[1] = 2;
    document.querySelectorAll(".rv .gb-cell")[0].click();
  `,
  warcaby: `
    const { b } = Checkers.last;
    b.fill(0); b[42] = 1; b[35] = -1;
    const c = document.querySelectorAll(".ck .gb-cell");
    c[42].click(); c[28].click();
    await until(() => document.querySelector(".board-area.won"));
  `,
  gomoku: `
    const { b } = Gomoku.last;
    [0, 1, 2, 3].forEach((i) => (b[i] = 1));
    document.querySelectorAll(".gk .gb-cell")[4].click();
  `,
  kropki: `
    const { lines } = DotsBoxes.last;
    lines.fill(1); lines[0] = 0;
    document.querySelectorAll(".db-hit")[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
  `,

  // --- rozbudowane gry: stan ustawiany tuż przed wygraną ---
  twierdza: `
    const s = TowerDefense.last, lv = GAMES.find((g) => g.id === "twierdza").levels[LVL];
    Object.assign(s, { wave: lv.waves, queue: [], enemies: [], waveDone: false });
    await until(() => document.querySelector(".board-area.won"), 6000);
  `,
  lochy: `
    const s = Dungeon.last, MW = 44;
    s.map.monsters = [];
    const dirs = [["arrowright", 1], ["arrowleft", -1], ["arrowdown", MW], ["arrowup", -MW]];
    const [k, d] = dirs.find(([, d]) => s.map.t[s.pos + d]);
    s.map.items.push({ kind: "amulet", i: s.pos + d });
    hit(k); hit(k, "keyup");
  `,
  talia: `
    document.querySelector(".dk-node:not(:disabled)").click();
    const f = Deck.last.fight;
    f.enemies = [Object.assign(f.enemies[0], { hp: 1, block: 0, boss: true })];
    f.hand[0] = "strike"; f.energy = 3;
    hit("1"); hit("1", "keyup");
    await until(() => document.querySelector(".board-area.won"));
  `,
  przetrwanie: `
    Survivors.last.t = GAMES.find((g) => g.id === "przetrwanie").levels[LVL].time;
    await until(() => document.querySelector(".board-area.won"), 6000);
  `,
  szachy: `
    // mat na ostatniej linii: Wa1-a8
    const b = Array(64).fill(""); b[7] = "k"; b[14] = "p"; b[15] = "p"; b[56] = "R"; b[62] = "K";
    Chess.last.st = { b, turn: "w", castle: { K: false, Q: false, k: false, q: false }, ep: -1, half: 0, full: 1 };
    const c = document.querySelectorAll(".cs .gb-cell");
    c[56].click(); c[0].click();
  `,
  farma: `
    Farm.last.money = GAMES.find((g) => g.id === "farma").levels[LVL].goal;
    [...document.querySelectorAll(".panel button")].find((x) => x.textContent.startsWith("Idź spać")).click();
  `,
  metro: `
    Metro.last.delivered = GAMES.find((g) => g.id === "metro").levels[LVL].target;
    await until(() => document.querySelector(".board-area.won"), 6000);
  `,
  podboj: `
    const { map, s } = Conquest.last, R = map.regions;
    const a = R[0], d = R[[...a.adj][0]];
    R.forEach((r) => (r.owner = 0));
    d.owner = 1; d.armies = 1; a.armies = 200;
    Object.assign(s, { phase: "attack", pool: 0, sel: -1 });
    const cv = document.querySelector(".cvb-canvas"), r = cv.getBoundingClientRect();
    const at = (g) => ({ clientX: r.x + (g.cx * 5 * r.width) / 160, clientY: r.y + (g.cy * 5 * r.height) / 100, bubbles: true });
    for (let k = 0; k < 40 && !document.querySelector(".board-area.won"); k++) {
      cv.dispatchEvent(new PointerEvent("pointerdown", at(a)));
      cv.dispatchEvent(new PointerEvent("pointerdown", at(d)));
    }
  `,
  przygoda: `
    for (let k = 0; k < 6 && !document.querySelector(".board-area.won"); k++) {
      const s = Platformer.last, goal = s.level.things.find((t) => t.kind === "goal");
      Object.assign(s.p, { x: goal.x - 3.5, y: goal.y - 4.5, vx: 0, vy: 0 });
      s.dead = 0;
      await until(() => Platformer.last.level !== s.level || document.querySelector(".board-area.won"), 4000);
    }
  `,
  wyscig: `
    const s = Race.last;
    s.t = 1; s.me.lap = GAMES.find((g) => g.id === "wyscig").levels[LVL].laps;
    await until(() => document.querySelector(".board-area.won"), 6000);
  `,
};
