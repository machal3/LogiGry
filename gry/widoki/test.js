// Test logiki gry: node --test gry/widoki/test.js
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { idx, blank, sum, projections, maximal, fits, score, minimal, growSolid, puzzle, castRay } = require("./gra.js");

// Losowa bryła do prób.
function randomSolid(n, k) {
  const solid = blank(n);
  let left = k;
  while (left-- > 0) solid[(Math.random() * solid.length) | 0] = 1;
  return solid;
}

test("rzuty bryły trafiają w jedyne pola, które powinny", () => {
  const n = 3;
  const one = blank(n);
  one[idx(n, 0, 0, 0)] = 1;
  const p = projections(n, one);
  assert.deepStrictEqual([...p.front], [1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepStrictEqual([...p.top], [1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepStrictEqual([...p.side], [1, 0, 0, 0, 0, 0, 0, 0, 0]);

  // klocki w rzędzie wzdłuż x: przód i góra pokazują trzy pola, bok jedno
  const row = blank(n);
  for (let x = 0; x < n; x++) row[idx(n, x, 1, 2)] = 1;
  const q = projections(n, row);
  assert.strictEqual(sum(q.front), 3);
  assert.strictEqual(sum(q.top), 3);
  assert.strictEqual(sum(q.side), 1);
  assert.strictEqual(q.side[1 * n + 2], 1);
});

test("największa bryła pasuje do rzutów i zawiera każdy klocek oryginału", () => {
  for (let n = 3; n <= 5; n++) {
    for (let k = 0; k < 120; k++) {
      const solid = randomSolid(n, 1 + ((Math.random() * n * n) | 0));
      const views = projections(n, solid);
      const big = maximal(n, views);
      assert.ok(fits(n, big, views), "największa bryła nie odtwarza rzutów");
      for (let i = 0; i < solid.length; i++) {
        if (solid[i]) assert.strictEqual(big[i], 1, "klocek oryginału wypadł z największej bryły");
      }
      // pusty rysunek = pusta bryła (gra nigdy nie daje pustych rysunków)
      const empty = blank(n);
      assert.ok(fits(n, empty, projections(n, empty)));
    }
  }
});

test("bryła minimalna pasuje do rzutów i nie da się jej już zmniejszyć", () => {
  for (let n = 3; n <= 5; n++) {
    for (let k = 0; k < 60; k++) {
      const views = projections(n, randomSolid(n, 2 + ((Math.random() * n * n) | 0)));
      const big = maximal(n, views);
      const slim = minimal(n, big, views);
      assert.ok(fits(n, slim, views), "bryła minimalna nie odtwarza rzutów");
      assert.ok(sum(slim) <= sum(big));
      for (let i = 0; i < slim.length; i++) {
        if (!slim[i]) continue;
        const less = Uint8Array.from(slim);
        less[i] = 0;
        assert.ok(!fits(n, less, views), "z minimalnej bryły dało się jeszcze coś usunąć");
      }
    }
  }
});

test("punktacja pól mówi, ile pokryto i ile jest nadmiaru", () => {
  const n = 2;
  const solid = blank(n);
  solid[idx(n, 0, 0, 0)] = 1;
  const views = projections(n, solid);
  assert.deepStrictEqual(score(n, solid, views), { covered: 3, extra: 0 });
  assert.deepStrictEqual(score(n, blank(n), views), { covered: 0, extra: 0 });
  const wrong = blank(n);
  wrong[idx(n, 0, 0, 0)] = 1;
  wrong[idx(n, 1, 1, 1)] = 1;
  assert.deepStrictEqual(score(n, wrong, views), { covered: 3, extra: 3 });
  assert.ok(!fits(n, wrong, views));
});

test("każdy poziom daje planszę z rozwiązaniem i z sensownymi rysunkami", () => {
  const levels = [
    { n: 3, cubes: [7, 12], maximal: [6, 16] },
    { n: 4, cubes: [13, 20], maximal: [9, 24] },
    { n: 5, cubes: [20, 30], maximal: [14, 32] },
  ];
  for (const L of levels) {
    const all = L.n * L.n;
    for (let k = 0; k < 40; k++) {
      const p = puzzle(L.n, L);
      const f = sum(p.views.front), t = sum(p.views.top), s = sum(p.views.side);
      for (const v of [f, t, s]) {
        assert.ok(v >= 3, "rysunek jest zbyt ubogi");
        assert.ok(v <= all - 1, "rysunek jest pełny, więc niczego nie podpowiada");
      }
      const big = maximal(L.n, p.views);
      assert.ok(fits(L.n, big, p.views), "rozwiązanie nie odtwarza rzutów");
      assert.strictEqual(sum(big), p.size, "podana liczba klocków nie zgadza się z rozwiązaniem");
      assert.ok(p.size >= L.maximal[0] && p.size <= L.maximal[1], "rozwiązanie poza widełkami poziomu");
      // podpowiedź = dokładanie klocków największej bryły: nigdy nie dokłada
      // nadmiarowego pola, a na końcu daje wygraną
      const step = blank(L.n);
      for (let i = 0; i < big.length; i++) {
        if (!big[i]) continue;
        step[i] = 1;
        assert.strictEqual(score(L.n, step, p.views).extra, 0, "klocek z największej bryły dokłada pole spoza rysunków");
      }
      assert.ok(fits(L.n, step, p.views), "złożenie całej bryły nie daje wygranej");
    }
  }
});

test("bryła rośnie w klockach, które się stykają", () => {
  const n = 4, solid = growSolid(n, 12);
  assert.strictEqual(sum(solid), 12);
  const seen = new Set();
  const start = solid.indexOf(1);
  seen.add(start);
  const queue = [start];
  while (queue.length) {
    const i = queue.pop();
    const x = i % n, z = ((i / n) | 0) % n, y = (i / (n * n)) | 0;
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + d[0], ny = y + d[1], nz = z + d[2];
      if (nx < 0 || ny < 0 || nz < 0 || nx >= n || ny >= n || nz >= n) continue;
      const j = idx(n, nx, ny, nz);
      if (solid[j] && !seen.has(j)) { seen.add(j); queue.push(j); }
    }
  }
  assert.strictEqual(seen.size, 12, "bryła rozpadła się na kawałki");
});

test("promień wskazuje pierwszy klocek, jego ścianę i wejście", () => {
  const n = 3;
  const solid = blank(n);
  solid[idx(n, 1, 1, 1)] = 1;
  const hit = castRay(n, solid, [0, 0, 10], [0, 0, -1]);
  assert.deepStrictEqual(hit.cell, [1, 1, 1]);
  assert.deepStrictEqual(hit.prev, [1, 1, 2]);
  assert.deepStrictEqual(hit.entry, [1, 1, 2]);

  // pusty środek: promień przechodzi przez sześcian, ale nic nie trafia
  const miss = castRay(n, blank(n), [0, 0, 10], [0, 0, -1]);
  assert.strictEqual(miss.cell, null);
  assert.deepStrictEqual(miss.entry, [1, 1, 2]);

  // promień obok sześcianu
  assert.strictEqual(castRay(n, solid, [9, 9, 10], [0, 0, -1]), null);

  // klocek na samej ścianie: nie ma gdzie dołożyć przed nim
  const edge = blank(n);
  edge[idx(n, 1, 1, 2)] = 1;
  const wall = castRay(n, edge, [0, 0, 10], [0, 0, -1]);
  assert.deepStrictEqual(wall.cell, [1, 1, 2]);
  assert.strictEqual(wall.prev, null);

  // ukośne promienie nigdy nie trafiają poza sześcian
  for (let k = 0; k < 400; k++) {
    const d = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
    const o = [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10];
    const r = castRay(n, randomSolid(n, 14), o, d);
    assert.ok(r === null || r.cell === null || r.cell.every((v) => v >= 0 && v < n));
  }
});
