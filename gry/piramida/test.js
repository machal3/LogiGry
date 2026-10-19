// Test logiki gry: node --test gry/piramida/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { neighbor, pickStep, pushTarget, step, inside, DELTA, DIRS, LAYOUT, canvasSize } = require("./gra.js");

const LEVELS = [
  { rows: 4, cols: 4 },
  { rows: 5, cols: 5 },
  { rows: 6, cols: 5 },
];

test("skok po skosie wychodzi tylko w granicach piramidy", () => {
  assert.deepStrictEqual(neighbor(4, 4, 0, 0, "down"), [1, 0]);
  assert.deepStrictEqual(neighbor(4, 4, 0, 0, "right"), [0, 1]);
  assert.strictEqual(neighbor(4, 4, 0, 0, "up"), null);
  assert.strictEqual(neighbor(4, 4, 0, 0, "left"), null);
  assert.strictEqual(neighbor(4, 4, 3, 3, "down"), null);
  assert.deepStrictEqual(neighbor(4, 4, 3, 3, "up"), [2, 3]);
  assert.deepStrictEqual(neighbor(4, 4, 3, 3, "left"), [3, 2]);
});

test("z każdego kafelka da się dojść do każdego", () => {
  for (const { rows, cols } of LEVELS) {
    const seen = new Set([0]);
    const q = [[0, 0]];
    while (q.length) {
      const [r, c] = q.shift();
      for (const d of DIRS) {
        const n = neighbor(rows, cols, r, c, d);
        if (!n) continue;
        const k = n[0] * cols + n[1];
        if (seen.has(k)) continue;
        seen.add(k);
        q.push(n);
      }
    }
    assert.strictEqual(seen.size, rows * cols, "piramida rozpadła się na wyspy");
  }
});

test("wróg wybiera skok, który nie oddala go od gracza", () => {
  const dist = (r, c, tr, tc) => Math.abs(r - tr) + Math.abs(c - tc);
  for (let k = 0; k < 60; k++) {
    const rows = 6, cols = 5;
    const r = rnd(rows), c = rnd(cols), tr = rnd(rows), tc = rnd(cols);
    if (r === tr && c === tc) continue; // na tym samym polu wróg tylko wypycha gracza
    const n = pickStep(rows, cols, r, c, tr, tc);
    assert.ok(n, "wróg nie ma gdzie skoczyć");
    assert.ok(inside(rows, cols, n[0], n[1]));
    assert.ok(
      dist(n[0], n[1], tr, tc) <= dist(r, c, tr, tc),
      "wróg odskoczył od gracza"
    );
    const d = DELTA[DIRS.find((x) => {
      const v = DELTA[x];
      return r + v[0] === n[0] && c + v[1] === n[1];
    })];
    assert.ok(d, "krok nie jest skokiem po skosie");
  }
});

test("kafelek przyjmuje najwyżej tyle wejść, ile wymaga", () => {
  assert.strictEqual(step(0, 1), 1);
  assert.strictEqual(step(1, 1), 1);
  assert.strictEqual(step(0, 2), 1);
  assert.strictEqual(step(1, 2), 2);
  assert.strictEqual(step(2, 2), 2);
});

test("wróg wypycha gracza o krok dalej, a na brzegu strąca go z piramidy", () => {
  // środek planszy: gracz ląduje na sąsiednim kafelku
  assert.deepStrictEqual(pushTarget(4, 4, 1, 1, 1, 0), [2, 1]);
  assert.deepStrictEqual(pushTarget(4, 4, 1, 1, 0, -1), [1, 0]);
  assert.strictEqual(pushTarget(6, 5, 4, 4, 0, 1), null); // poza kolumnami
  assert.strictEqual(pushTarget(6, 5, 5, 4, 1, 0), null); // poza wierszami
  // każdy krok z brzegu w stronę krawędzi kończy się upadkiem (null)
  assert.strictEqual(pushTarget(4, 4, 0, 0, -1, 0), null);
  assert.strictEqual(pushTarget(4, 4, 0, 0, 0, -1), null);
  assert.strictEqual(pushTarget(4, 4, 0, 3, -1, 0), null);
  assert.strictEqual(pushTarget(4, 4, 3, 3, 1, 0), null);
  assert.strictEqual(pushTarget(6, 5, 2, 4, 0, 1), null);
  // gdy wróg nie ruszył się z pola gracza, nic się nie dzieje
  assert.deepStrictEqual(pushTarget(4, 4, 2, 2, 0, 0), [2, 2]);
});

test("rysunek mieści się w płótnie na każdym poziomie", () => {
  const { HW, HH, TOP, TH } = LAYOUT;
  for (const { rows, cols } of LEVELS) {
    const { W, H } = canvasSize(rows, cols);
    const cx = (r, c) => rows * HW + (c - r) * HW;
    const cy = (r, c) => TOP + (r + c) * HH;
    let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        minx = Math.min(minx, cx(r, c) - HW);
        maxx = Math.max(maxx, cx(r, c) + HW);
        miny = Math.min(miny, cy(r, c) - HH);
        maxy = Math.max(maxy, cy(r, c) + HH + TH + 3.2); // cień pod kaflem
      }
    }
    assert.ok(minx >= 0 && miny >= 0, `${rows} × ${cols}: kafle wychodzą za lewą lub górną krawędź`);
    assert.ok(maxx <= W && maxy <= H, `${rows} × ${cols}: kafle wychodzą za prawą lub dolną krawędź (${maxx}, ${maxy} z ${W} × ${H})`);
    // sprite'y stoją nad kaflem i podskakują, więc muszą się zmieścić nad tylnym rzędem
    for (const [base, dir] of [[TOP, HH], [TOP + HH, -HH]]) {
      for (let k = 0; k <= 200; k++) {
        const t = k / 200;
        const y = base + dir * t;
        const arc = 7 * Math.sin(Math.PI * t);
        const heroTop = y - 6.6 - arc - 7; // tułów gracza nad środkiem kafelka
        const foeTop = y - 7 - arc - 7; // romb wroga
        assert.ok(heroTop >= 0 && foeTop >= 0, `${rows} × ${cols}: sprite ucięty górną krawędzią (${Math.min(heroTop, foeTop).toFixed(1)})`);
      }
    }
  }
});
