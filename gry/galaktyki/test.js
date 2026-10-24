// Test logiki gry: node --test gry/galaktyki/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { grow, puzzle, bands, buildable, seedCells, colorRegions, makeRng } = require("./gra.js");

const STEPS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

// Sprawdza pełne pokrycie, symetrię, spójność, pola gwiazd i odstępy między gwiazdami.
function check(n, m, stars, reg) {
  assert.equal(reg.length, stars.length, "zła liczba regionów");
  const owner = new Int16Array(n * m).fill(-1);
  reg.forEach((cells, k) => cells.forEach((i) => {
    assert.equal(owner[i], -1, "pole należy do dwóch regionów");
    owner[i] = k;
  }));
  assert.ok(!owner.includes(-1), "nie wszystkie pola są zajęte");
  const centres = new Set(stars.map((s) => `${s.R},${s.C}`));
  assert.equal(centres.size, stars.length, "dwie gwiazdy w tym samym punkcie");
  stars.forEach((s, k) => {
    const cells = reg[k];
    assert.ok(cells.length > 0, "pusty region");
    for (const i of seedCells(n, m, s.R, s.C)) assert.ok(cells.includes(i), "pole gwiazdy poza regionem");
    const inK = new Set(cells);
    for (const i of cells) {
      const r = (i / m) | 0, c = i % m;
      const r2 = s.R - r, c2 = s.C - c;
      assert.ok(r2 >= 0 && r2 < n && c2 >= 0 && c2 < m, "odbicie poza planszą");
      assert.ok(inK.has(r2 * m + c2), "region nie jest symetryczny");
    }
    const seen = new Set([cells[0]]), q = [cells[0]];
    while (q.length) {
      const i = q.pop(), r = (i / m) | 0, c = i % m;
      for (const [dr, dc] of STEPS) {
        const r2 = r + dr, c2 = c + dc;
        if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) continue;
        const j = r2 * m + c2;
        if (inK.has(j) && !seen.has(j)) { seen.add(j); q.push(j); }
      }
    }
    assert.equal(seen.size, cells.length, "region jest nieciągły");
  });
  for (let a = 0; a < stars.length; a++) for (let b = a + 1; b < stars.length; b++) {
    assert.ok(Math.abs(stars[a].R - stars[b].R) > 1 || Math.abs(stars[a].C - stars[b].C) > 1, "gwiazdy stoją zbyt blisko siebie");
  }
}

test("generator zawsze dzieli planszę na poprawne regiony", () => {
  for (const [n, m] of [[7, 7], [9, 9], [11, 11]]) {
    const rng = makeRng(1234 + n * 31 + m * 7);
    for (let k = 0; k < 25; k++) {
      const g = grow(n, m, rng);
      assert.ok(g, "nie udało się wylosować podziału");
      check(n, m, g.stars, g.reg);
    }
  }
});

test("każdy region da się zbudować parami pól ze swojej gwiazdy", () => {
  for (const [n, m] of [[7, 7], [9, 9], [11, 11]]) {
    const rng = makeRng(77 + n + m);
    for (let k = 0; k < 20; k++) {
      const g = grow(n, m, rng);
      assert.ok(g, "nie udało się wylosować podziału");
      assert.ok(buildable(n, m, g.stars, g.reg), "regionu nie da się zbudować parami pól");
    }
  }
});

test("plansza do gry trafia w żądaną liczbę gwiazd", () => {
  for (const [n, m, target] of [[7, 7, 8], [9, 9, 12], [11, 11, 18]]) {
    const rng = makeRng(2024 + n * 13 + m);
    for (let k = 0; k < 8; k++) {
      const g = puzzle(n, m, target, rng);
      assert.ok(Math.abs(g.count - target) <= 3, `zbyt wiele gwiazd: ${g.count} zamiast ${target}`);
      check(n, m, g.stars, g.reg);
      assert.ok(buildable(n, m, g.stars, g.reg), "planszy nie da się zbudować parami pól");
    }
  }
});

test("regiony są różnorodne, a część nie jest prostokątami", () => {
  const rng = makeRng(20240);
  const sigs = new Set();
  let nonRect = 0, total = 0;
  for (let k = 0; k < 12; k++) {
    const g = puzzle(9, 9, 12, rng);
    sigs.add(g.reg.map((r) => r.join(".")).sort().join("|"));
    for (const cells of g.reg) {
      let minR = 9, maxR = -1, minC = 9, maxC = -1;
      for (const i of cells) { const r = (i / 9) | 0, c = i % 9; minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
      total++;
      if ((maxR - minR + 1) * (maxC - minC + 1) !== cells.length) nonRect++;
    }
  }
  assert.ok(sigs.size >= 10, `plansze są zbyt podobne (${sigs.size})`);
  assert.ok(nonRect >= 12, `zbyt mało nietypowych regionów (${nonRect} z ${total})`);
});

test("sąsiadujące regiony mają różne kolory", () => {
  const rng = makeRng(5);
  const n = 11, m = 11;
  for (let k = 0; k < 10; k++) {
    const g = puzzle(n, m, 17, rng);
    const color = colorRegions(n, m, g.reg, g.owner);
    for (let a = 0; a < g.reg.length; a++) for (let b = a + 1; b < g.reg.length; b++) {
      const near = g.reg[a].some((i) => {
        const r = (i / m) | 0, c = i % m;
        return STEPS.some(([dr, dc]) => {
          const r2 = r + dr, c2 = c + dc;
          if (r2 < 0 || r2 >= n || c2 < 0 || c2 >= m) return false;
          return g.reg[b].includes(r2 * m + c2);
        });
      });
      if (near) assert.notEqual(color[a], color[b], "sąsiednie regiony mają ten sam kolor");
    }
  }
});

test("awaryjny podział zawsze daje poprawną i budowalną planszę", () => {
  const rng = makeRng(9);
  for (const [n, m, count] of [[7, 7, 9], [9, 9, 13], [11, 11, 19]]) {
    for (let k = 0; k < 8; k++) {
      const g = bands(n, m, count, rng);
      assert.equal(g.reg.length, count, "zła liczba regionów");
      check(n, m, g.stars, g.reg);
      assert.ok(buildable(n, m, g.stars, g.reg), "podziału awaryjnego nie da się zbudować");
    }
  }
});
