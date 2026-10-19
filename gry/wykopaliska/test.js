const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateMine,
  digCell,
  blastDynamite,
  stepRoverVertical,
  findNearestFossil
} = require("./gra.js");

test("Wykopaliska - generowanie kopalni rozstawia skamieliny, geody i wolną powierzchnię", () => {
  const grid = generateMine(14, 28, 5, 42);
  assert.equal(grid.length, 28);
  assert.equal(grid[0].length, 14);

  for (let c = 0; c < 14; c++) {
    assert.equal(grid[0][c], 0, "Wiersz powierzchni musi być pusty");
  }

  let fossils = 0;
  for (let r = 0; r < 28; r++) {
    for (let c = 0; c < 14; c++) {
      if (grid[r][c] === 10) fossils++;
    }
  }
  assert.equal(fossils, 5, "Kopalnia musi zawierać dokładną liczbę skamielin");

  const nearest = findNearestFossil(grid, 0, 7);
  assert.ok(nearest, "Sonar musi wskazywać najbliższą skamielinę");
  assert.ok(nearest.dist > 0);
});

test("Wykopaliska - wiercenie uwzględnia twardość skał i zbiera skamieliny oraz geody", () => {
  const grid = [
    [0, 0, 0],
    [1, 9, 10],
    [11, 8, 12]
  ];

  const hardRes = digCell(grid, 1, 1, 1);
  assert.equal(hardRes.ok, false, "Bazalt wymaga świdra poziomu 2");
  assert.equal(hardRes.reason, "hard");

  const hardOk = digCell(grid, 1, 1, 2);
  assert.equal(hardOk.ok, true, "Świder poziomu 2 kruszy bazalt");
  assert.equal(grid[1][1], 0);

  const fossilRes = digCell(grid, 1, 2, 1);
  assert.equal(fossilRes.ok, true);
  assert.equal(fossilRes.isFossil, true);

  const geodeRes = digCell(grid, 2, 0, 1);
  assert.equal(geodeRes.ok, true);
  assert.equal(geodeRes.isGeode, true);
});

test("Wykopaliska - dynamit kruszy skały 3x3 włącznie z bazaltem i odsłania skamieliny", () => {
  const grid = [
    [0, 0, 0, 0],
    [9, 9, 10, 1],
    [9, 0, 8, 1],
    [1, 6, 9, 1]
  ];
  const dug = blastDynamite(grid, 2, 1);
  assert.ok(dug.length >= 6, "Dynamit powinien rozbić sąsiednie bloki w promieniu 3x3");
  assert.equal(grid[1][1], 0, "Bazalt nad łazikiem powinien zostać skruszony");
  assert.equal(grid[1][2], 0, "Skamielina w zasięgu powinna zostać wydobyta");
  assert.ok(dug.some((d) => d.isFossil), "Lista urobku po wybuchu musi zawierać skamielinę");
});

test("Wykopaliska - ruch w górę nie cofa łazika w dół przy kontakcie z sufitem", () => {
  const blockSize = 20;
  // Sufit w wierszu r = 1 (y: 20..40), łazik w wierszu r = 2 (y: 40..60)
  const collidesAt = (x, y) => {
    const half = blockSize * 0.34;
    if (y - half < 40) return { r: 1, c: 3, type: 1 };
    return null;
  };

  const state = { px: 70, py: 47.2, vy: -80, onGround: false };
  stepRoverVertical(state, 0.05, blockSize, collidesAt);

  // Łazik powinien zatrzymać się tuż pod sufitem (ok. 46.84), a NIE zostać cofnięty do środka klatki (50)!
  assert.ok(state.py < 47.2, "Łazik przy kontakcie z sufitem nie może być cofany w dół");
  assert.equal(state.vy, 0, "Prędkość pionowa po dotknięciu sufitu powinna wyzerować się");
});
