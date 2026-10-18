// Testy logiki gier: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const Sudoku = require("../games/sudoku.js");
const Nonogram = require("../games/nonogram.js");
const Bridges = require("../games/bridges.js");
const Towers = require("../games/towers.js");
const Minesweeper = require("../games/minesweeper.js");
const Queens = require("../games/queens.js");
const Takuzu = require("../games/takuzu.js");
const Lights = require("../games/lights.js");

const timed = (fn) => { const t = performance.now(); const r = fn(); return [r, performance.now() - t]; };

test("sudoku: jednoznaczne, poziom = najtrudniejsza potrzebna technika", () => {
  for (const [tier, minGivens] of [[1, 30], [2, 24], [3, 17]]) {
    for (let k = 0; k < 4; k++) {
      const [{ puzzle, solution }, ms] = timed(() => Sudoku.generate(tier, minGivens));
      assert.ok(ms < 3000, `generowanie ${ms}ms`);
      assert.equal(Sudoku.conflicts(solution).size, 0);
      puzzle.forEach((v, i) => v && assert.equal(v, solution[i]));
      assert.equal(Sudoku.count(puzzle.slice()), 1);
      assert.equal(Sudoku.grade(puzzle), tier);
      assert.ok(puzzle.filter(Boolean).length >= minGivens);
    }
  }
  const g = Sudoku.last.solution.slice();
  [g[0], g[1]] = [g[1], g[0]];
  assert.ok(Sudoku.conflicts(g).size > 0);
});

test("obrazki: każdy rysunek rozwiązywalny linia po linii, solver linii", () => {
  assert.deepEqual(Nonogram.solveLine([3], [-1, -1, -1, -1]), [-1, 1, 1, -1]);
  assert.deepEqual(Nonogram.solveLine([1, 1], [-1, -1, -1]), [1, 0, 1]);
  assert.deepEqual(Nonogram.solveLine([], [-1, -1]), [0, 0]);
  assert.equal(Nonogram.solveLine([2], [0, 1, 0]), null);
  for (const [size, set] of Object.entries(Nonogram.PICTURES)) {
    const n = +size;
    assert.ok(Object.keys(set).length >= 6, `za mało rysunków ${n}`);
    for (const [name, rows] of Object.entries(set)) {
      assert.ok(rows.length === n && rows.every((r) => r.length === n), `${name}: zły rozmiar`);
      const g = rows.join("").split("").map((ch) => (ch === "#" ? 1 : 0));
      const { rows: R, cols: C } = Nonogram.clues(g, n, n);
      assert.ok(Nonogram.solvable(R, C, n, n), `${name} (${n}) wymaga zgadywania`);
    }
  }
  // kolejne partie nie powtarzają rysunku, dopóki biblioteka się nie wyczerpie
  const seen = new Set();
  for (let k = 0; k < Object.keys(Nonogram.PICTURES[10]).length; k++) seen.add(Nonogram.generate(10).name);
  assert.equal(seen.size, Object.keys(Nonogram.PICTURES[10]).length);
  const p = Nonogram.generate(15);
  assert.ok(Nonogram.matches(p.grid, p.rows, p.cols, 15, 15));
  const wrong = p.grid.slice();
  wrong[0] ^= 1;
  assert.ok(!Nonogram.matches(wrong, p.rows, p.cols, 15, 15));
});

test("mosty: wygenerowane rozwiązanie jest poprawne", () => {
  for (const [size, target] of [[7, 9], [9, 15], [11, 24]]) {
    for (let k = 0; k < 20; k++) {
      const [p, ms] = timed(() => Bridges.generate(size, size, target, size > 7));
      assert.ok(ms < 2000, `generowanie ${ms}ms`);
      assert.ok(p.islands.length >= target * 0.8, `${p.islands.length} wysp z ${target}`);
      assert.ok(Bridges.solved(p.islands, p.bridges));
      const nb = Bridges.neighbors(p.islands, size, size);
      p.islands.forEach((isl) => assert.ok(isl.n >= 1 && isl.n <= 8));
      // każdy most łączy najbliższych sąsiadów i mosty się nie krzyżują
      const used = new Map();
      for (const [k2, n] of p.bridges) {
        assert.ok(n === 1 || n === 2);
        const [a, b] = k2.split("-").map(Number);
        const pair = nb[a].find((x) => x.j === b);
        assert.ok(pair, `most ${k2} nie łączy sąsiadów`);
        for (const c of pair.cells) {
          assert.ok(!used.has(c) || used.get(c) === pair.o, "krzyżujące się mosty");
          used.set(c, pair.o);
        }
      }
      // rozwiązanie wynika z samej logiki, a trudniejsze poziomy wymagają rozumowania o spójności
      assert.deepEqual([...Bridges.logical(p.islands, size, size)].sort(), [...p.bridges].sort());
      if (size > 7) assert.equal(Bridges.logical(p.islands, size, size, true), null);
      const without = new Map(p.bridges);
      without.delete([...without.keys()][0]);
      assert.ok(!Bridges.solved(p.islands, without));
    }
  }
});

test("wieże: jednoznaczne, rozwiązywalne logiką na swoim poziomie", () => {
  for (const [n, keep, tier] of [[4, 0.5, 1], [5, 0.4, 2], [6, 0, 2]]) {
    for (let k = 0; k < 4; k++) {
      const [p, ms] = timed(() => Towers.generate(n, keep, tier));
      assert.ok(ms < 3000, `generowanie ${n}: ${ms}ms`);
      assert.equal(Towers.grade(n, p.clues), tier);
      assert.equal(Towers.countSolutions(n, p.clues, 2, 1e9), 1);
      assert.ok(Towers.check(n, p.solution, p.clues).solved);
      const bad = p.solution.map((r) => r.slice());
      bad[0][0] = 0;
      assert.ok(!Towers.check(n, bad, p.clues).solved);
    }
  }
  assert.equal(Towers.visible([2, 1, 4, 3]), 2);
});

test("saper: pierwsze pole bezpieczne, odkrywanie pustych", () => {
  for (let k = 0; k < 50; k++) {
    const { mines, nums } = Minesweeper.layMines(9, 9, 10, 40);
    assert.equal(mines.reduce((s, v) => s + v, 0), 10);
    assert.equal(mines[40], 0);
    Minesweeper.around(40, 9, 9).forEach((j) => assert.equal(mines[j], 0));
    assert.equal(nums[40], 0);
    const open = new Uint8Array(81), flags = new Uint8Array(81);
    const got = Minesweeper.flood(40, 9, 9, nums, mines, open, flags);
    assert.ok(got.length >= 9);
    got.forEach((i) => assert.equal(mines[i], 0));
  }
  assert.equal(Minesweeper.around(0, 9, 9).length, 3);
  // każda plansza rozwiązywalna logiką od pierwszego kliknięcia
  for (const [w, h, c] of [[9, 9, 10], [12, 12, 28], [16, 16, 52]]) {
    for (let k = 0; k < 10; k++) {
      const safe = Math.floor(Math.random() * w * h);
      const [{ mines, nums }, ms] = timed(() => Minesweeper.layMines(w, h, c, safe));
      assert.ok(ms < 1000, `generowanie ${ms}ms`);
      assert.equal(mines.reduce((s, v) => s + v, 0), c);
      assert.ok(Minesweeper.logical(w, h, c, safe, mines, nums));
    }
  }
});

test("królowe: jedno rozwiązanie, spójne regiony, szybkie", () => {
  for (const [n, lo, hi] of [[6, 1, 2], [8, 2, 3], [9, 3, 3]]) {
    for (let k = 0; k < 6; k++) {
      const [{ regions, solution }, ms] = timed(() => Queens.generate(n, lo, hi));
      const tier = Queens.grade(n, regions);
      assert.ok(tier >= lo && tier <= hi, `poziom technik ${tier}`);
      assert.ok(ms < 2000, `generowanie ${n}: ${ms}ms`);
      assert.equal(Queens.count(n, regions), 1);
      assert.equal(new Set(regions).size, n);
      const q = new Set(solution.map((c, r) => r * n + c));
      assert.ok(Queens.check(n, regions, q).solved);
      // każdy region to jeden kawałek
      for (let g = 0; g < n; g++) {
        const cells = regions.flatMap((v, i) => (v === g ? [i] : []));
        const seen = new Set([cells[0]]), stack = [cells[0]];
        while (stack.length) {
          const i = stack.pop();
          for (const j of [i - n, i + n, i % n ? i - 1 : -1, (i + 1) % n ? i + 1 : -1]) {
            if (j >= 0 && j < n * n && regions[j] === g && !seen.has(j)) { seen.add(j); stack.push(j); }
          }
        }
        assert.equal(seen.size, cells.length, `region ${g} niespójny`);
      }
    }
  }
  // stykające się po skosie i w tym samym wierszu
  assert.deepEqual([...Queens.check(4, [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3], new Set([0, 5])).bad].sort(), [0, 5]);
  assert.equal(Queens.check(4, [0, 0, 1, 1, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 3, 3], new Set([0, 3])).bad.size, 2);
});

test("zero-jeden: jedno rozwiązanie zgodne z zasadami", () => {
  for (const [n, keep, tier] of [[6, 0.3, 1], [8, 0, 2], [10, 0, 2]]) {
    for (let k = 0; k < 6; k++) {
      const [{ puzzle, solution }, ms] = timed(() => Takuzu.generate(n, keep, tier));
      assert.equal(Takuzu.grade(puzzle, n), tier);
      assert.ok(ms < 2000, `generowanie ${n}: ${ms}ms`);
      assert.ok(Takuzu.check(solution, n).solved);
      puzzle.forEach((v, i) => v && assert.equal(v, solution[i]));
      assert.equal(Takuzu.solve(puzzle, n).count, 1);
      assert.deepEqual(Takuzu.solve(puzzle, n).grid, solution);
    }
  }
  assert.ok(Takuzu.check([1, 1, 1, 2], 2).bad.size > 0);
  // trzy pod rząd i powtórzone wiersze
  assert.ok(!Takuzu.okAt([1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4, 2));
  assert.ok(!Takuzu.okAt([1, 2, 1, 2, 1, 2, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0], 4, 7));
  assert.ok(Takuzu.okAt([1, 2, 1, 2, 2, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0], 4, 7));
});

test("światła: rozwiązanie gasi planszę i jest najkrótsze", () => {
  for (const [n, min] of [[5, 6], [6, 10], [7, 15]]) {
    for (let k = 0; k < 10; k++) {
      const p = Lights.generate(n, min);
      assert.ok(p.moves >= min);
      const lit = p.lit.slice();
      p.solution.forEach((v, i) => v && Lights.press(lit, n, i));
      assert.ok(!lit.some(Boolean));
    }
  }
  // jedno kliknięcie w środek 3×3 = rozwiązanie w jednym ruchu
  const lit = new Uint8Array(9);
  Lights.press(lit, 3, 4);
  assert.equal(Lights.solve(lit, 3).reduce((s, v) => s + v, 0), 1);
  // 5×5 ma plansze bez rozwiązania
  const bad = new Uint8Array(25);
  bad[0] = 1;
  assert.equal(Lights.solve(bad, 5), null);
});

const Snake = require("../games/snake.js");
const G2048 = require("../games/g2048.js");
const Memory = require("../games/memory.js");
const Breakout = require("../games/breakout.js");

test("wąż: ruch, jedzenie, kolizje, zakaz zawracania", () => {
  const s = Snake.create(10, 10, 15);
  const head = s.body[0];
  assert.equal(Snake.turn(s, "left"), false); // zawrócenie w miejscu
  s.food = head + 1;
  assert.equal(Snake.step(s), "eat");
  assert.equal(s.body.length, 4);
  assert.ok(!s.body.includes(s.food) && s.food >= 0);
  s.food = -1;
  assert.equal(Snake.step(s), "move");
  assert.equal(s.body.length, 4);
  // kolejka skrętów: dół, lewo, góra prowadzi w ogon
  const t = Snake.create(10, 10, 15);
  t.body = [55, 54, 53, 52, 51];
  t.food = -1;
  Snake.turn(t, "down"); Snake.step(t);
  Snake.turn(t, "left"); Snake.step(t);
  Snake.turn(t, "up");
  assert.equal(Snake.step(t), "self");
  // ściana
  const w = Snake.create(6, 6, 15);
  w.food = -1;
  let res;
  for (let k = 0; k < 6 && (res = Snake.step(w)) === "move"; k++);
  assert.equal(res, "wall");
  // przeszkody nie leżą w rzędzie startowym ani na wężu
  for (let k = 0; k < 20; k++) {
    const o = Snake.create(17, 17, 35, 5);
    assert.ok(o.walls.size >= 9);
    o.body.forEach((i) => assert.ok(!o.walls.has(i)));
    assert.ok(!o.walls.has(o.food));
  }
});

test("2048: łączenie kafli i punkty", () => {
  const row = (vals) => vals.map((v, c) => v && { id: c + 1, v, r: 0, c }).filter(Boolean);
  const vals = (tiles) => [0, 1, 2, 3].map((c) => tiles.find((t) => t.r === 0 && t.c === c)?.v || 0);
  let m = G2048.move(row([2, 2, 2, 2]), 4, "left");
  assert.deepEqual(vals(m.tiles), [4, 4, 0, 0]);
  assert.equal(m.score, 8);
  m = G2048.move(row([2, 2, 4, 0]), 4, "left");
  assert.deepEqual(vals(m.tiles), [4, 4, 0, 0]); // świeżo połączony kafel nie łączy się drugi raz
  m = G2048.move(row([2, 0, 2, 4]), 4, "right");
  assert.deepEqual(vals(m.tiles), [0, 0, 4, 4]);
  m = G2048.move(row([2, 4, 8, 16]), 4, "left");
  assert.equal(m.moved, false);
  assert.equal(m.gone.length, 0);
  m = G2048.move(row([4, 0, 0, 4]), 4, "left");
  assert.equal(m.gone.length, 2);
  assert.equal(m.merged[0].v, 8);
  // pełna plansza bez sąsiadów o tej samej wartości: brak ruchów
  const full = [];
  for (let i = 0; i < 16; i++) full.push({ id: i + 1, v: 2 ** (1 + ((i + ((i / 4) | 0)) % 2)), r: (i / 4) | 0, c: i % 4 });
  assert.equal(G2048.canMove(full, 4), false);
  assert.equal(G2048.create(4).tiles.length, 2);
});

test("pamięć: każda karta ma dokładnie jedną parę", () => {
  for (const pairs of [8, 10, 18]) {
    const { deck } = Memory.deal(pairs);
    assert.equal(deck.length, pairs * 2);
    for (let k = 0; k < pairs; k++) assert.equal(deck.filter((v) => v === k).length, 2);
  }
});

test("cegiełki: odbicia, rozbijanie cegieł, utrata piłki", () => {
  const s = Breakout.create({ rows: 2, speed: 60, lives: 3, tough: 1 }, ["#000"]);
  assert.equal(Breakout.left(s), 16);
  assert.ok(s.ball.stuck);
  Breakout.step(s, 0.1);
  assert.equal(s.ball.x, s.paddle.x); // przyklejona do paletki
  Breakout.launch(s);
  // lot w górę rozbija najpierw cegłę z dolnego rzędu (1 trafienie), górne wymagają dwóch
  let broke = 0, hit = 0;
  for (let t = 0; t < 600 && !broke; t++) { const ev = Breakout.step(s, 1 / 60); broke += ev.broke.length; hit += ev.hit.length; }
  assert.equal(broke, 1);
  assert.equal(Breakout.left(s), 15);
  assert.ok(s.ball.vy > 0, "po trafieniu piłka leci w dół");
  // ściana boczna odbija
  Object.assign(s.ball, { x: 2, y: 80, vx: -60, vy: 0, stuck: false });
  assert.ok(Breakout.step(s, 1 / 60).wall);
  assert.ok(s.ball.vx > 0);
  // paletka odbija w górę, brzegiem pod kątem
  Object.assign(s.ball, { x: s.paddle.x + s.paddle.w / 2 - 1, y: s.paddle.y - 2, vx: 0, vy: 60 });
  for (let t = 0; t < 10; t++) if (Breakout.step(s, 1 / 60).paddle) break;
  assert.ok(s.ball.vy < 0 && s.ball.vx > 0);
  // piłka za paletką zabiera życie i wraca na paletkę
  Object.assign(s.ball, { x: 50, y: Breakout.H - 1, vx: 0, vy: 80 });
  s.paddle.x = 10;
  let lost = false;
  for (let t = 0; t < 60 && !lost; t++) lost = Breakout.step(s, 1 / 60).lost;
  assert.ok(lost);
  assert.equal(s.lives, 2);
  assert.ok(s.ball.stuck);
});
