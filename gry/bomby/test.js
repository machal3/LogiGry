// Test logiki gry: node --test gry/bomby/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { makeMaze, freeCells, blast, solid, slide, foeStep, R } = require("./gra.js");

const LEVELS = [
  { cols: 11, rows: 9, crates: 62 },
  { cols: 13, rows: 11, crates: 72 },
  { cols: 13, rows: 11, crates: 82 },
];

test("labirynt ma szczelny brzeg i słupki w co drugim polu", () => {
  for (const { cols, rows, crates } of LEVELS) {
    const g = makeMaze(cols, rows, crates);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = g[r * cols + c];
        const edge = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
        if (edge) assert.strictEqual(v, 1, `brzeg (${r},${c}) nie jest murem`);
        else if (r % 2 === 0 && c % 2 === 0) assert.strictEqual(v, 1, `słupek (${r},${c}) nie jest murem`);
        else assert.ok(v !== 1, `korytarz (${r},${c}) zamurowany`);
      }
    }
  }
});

test("start jest wolny, a żadna skrzynia nie stoi na murze", () => {
  for (const { cols, rows, crates } of LEVELS) {
    const g = makeMaze(cols, rows, crates);
    for (const [r, c] of [[1, 1], [1, 2], [2, 1]]) {
      assert.strictEqual(g[r * cols + c], 0, `pole startowe (${r},${c}) jest zajęte`);
    }
    for (let i = 0; i < g.length; i++) if (g[i] === 2) assert.ok(g[i] === 2);
    assert.ok(g.filter((v) => v === 2).length > 0, "brak skrzyń do rozsadzenia");
  }
});

test("korytarze tworzą jeden spójny ciąg", () => {
  for (const { cols, rows, crates } of LEVELS) {
    const g = makeMaze(cols, rows, crates);
    const walkable = [];
    for (let i = 0; i < g.length; i++) if (g[i] !== 1) walkable.push(i);
    const seen = new Set([walkable[0]]);
    const q = [walkable[0]];
    while (q.length) {
      const i = q.shift();
      const r = (i / cols) | 0, c = i % cols;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= rows || cc >= cols) continue;
        const k = rr * cols + cc;
        if (g[k] === 1 || seen.has(k)) continue;
        seen.add(k);
        q.push(k);
      }
    }
    assert.strictEqual(seen.size, walkable.length, "labirynt rozpadł się na wyspy");
  }
});

test("wybuch leci w cztery strony, mur go zatrzymuje, skrzynia płonie i kończy zasięg", () => {
  const cols = 5, rows = 5;
  const g = new Uint8Array(cols * rows);
  g[2 * cols + 1] = 2;   // skrzynia po lewej
  g[2 * cols + 3] = 1;   // mur po prawej
  const cells = blast(g, cols, rows, 2, 2, 3);
  const has = (r, c) => cells.some(([rr, cc]) => rr === r && cc === c);
  assert.ok(has(2, 2), "brak pola bomby");
  assert.ok(has(2, 1), "wybuch nie ogarnął skrzyni");
  assert.ok(!has(2, 0), "wybuch przeszedł za skrzynię");
  assert.ok(!has(2, 3), "wybuch przeszedł przez mur");
  assert.ok(has(0, 2) && has(4, 2) && !has(2, 0), "zasięg w pionie jest zły");
  assert.strictEqual(cells.length, 6, "zły kształt wybuchu");
});

test("mur i skrzynia są nieprzenikliwe, a wolne pole nie", () => {
  const cols = 5, rows = 5;
  const g = new Uint8Array(cols * rows);
  g[2 * cols + 2] = 1;
  g[3 * cols + 2] = 2;
  assert.ok(solid(g, cols, rows, 2.5, 2.5, R), "mur nie jest ciałem stałym");
  assert.ok(solid(g, cols, rows, 2.5, 3.5, R), "skrzynia nie jest ciałem stałym");
  assert.ok(!solid(g, cols, rows, 0.5, 0.5, R), "wolne pole blokuje ruch");
  assert.ok(solid(g, cols, rows, -0.2, 0.5, R), "wyjście za planszę nie jest blokowane");
});

test("ślizg zatrzymuje się przed murem i nie wchodzi w niego", () => {
  const cols = 6, rows = 5;
  const g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) g[r * cols + 3] = 1;
  const p = { x: 1.5, y: 2.5 };
  slide(g, cols, rows, p, 5, 0);
  assert.ok(p.x > 1.5, "gracz nie ruszył się wcale");
  assert.ok(p.x <= 3 - R + 1e-9, "gracz wszedł w mur");
  assert.ok(!solid(g, cols, rows, p.x, p.y, R), "gracz utknął w ścianie");
});

test("wróg wybiera kierunek, w którym się zmieści", () => {
  const cols = 5, rows = 5;
  const g = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) { g[r * cols + 2] = 1; }
  g[2 * cols + 2] = 0; // przejście na wprost
  const e = { x: 1.5, y: 2.5 };
  for (let k = 0; k < 40; k++) {
    const s = foeStep(g, cols, rows, e, 4.5, 2.5, 0.9);
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => a === s[0] && b === s[1]), "wróg wybrał kierunek po skosie");
    assert.ok(!solid(g, cols, rows, e.x + s[0] * 0.55, e.y + s[1] * 0.55, R), "wróg wchodzi w ścianę");
  }
  const s = foeStep(g, cols, rows, e, 4.5, 2.5, 0.9);
  assert.deepStrictEqual(s, [1, 0], "wróg nie ruszył w stronę gracza");
});

test("lista wolnych pól to dokładnie korytarz bez skrzyń", () => {
  const cols = 5, rows = 5;
  const g = new Uint8Array(cols * rows);
  g[1] = 1;
  g[2] = 2;
  const free = freeCells(g);
  assert.deepStrictEqual(free, [0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]);
  assert.ok(free.every((i) => g[i] === 0));
});
