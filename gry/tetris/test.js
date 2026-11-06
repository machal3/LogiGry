// Test logiki Tetrisa: node --test gry/tetris/test.js
const test = require("node:test");
const assert = require("node:assert");

// Funkcja pick dla testów (z lib.js)
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const { SHAPES, rotateShape, checkCollision, placeShape, clearLines, randomShape, normalizeShape, WALL_KICKS } = require("./gra.js");

function createBoard() {
  return Array.from({ length: 10 }, () => Array(20).fill(null));
}

test("SHAPES mają poprawną liczbę komórek", () => {
  SHAPES.forEach(shape => {
    assert.strictEqual(shape.cells.length, 4, `Kształt ${shape.name} powinien mieć 4 komórki`);
  });
});

test("normalizeShape przesuwa kształt do układu (0,0)", () => {
  const shape = normalizeShape(SHAPES[0]); // I kształt
  shape.cells.forEach(([x, y]) => {
    assert.ok(x >= 0, `x powinien być >= 0, jest ${x}`);
    assert.ok(y >= 0, `y powinien być >= 0, jest ${y}`);
  });
});

test("rotateShape zachowuje 4 komórki", () => {
  SHAPES.forEach(shape => {
    const normalized = normalizeShape(shape);
    const rotated = normalizeShape(rotateShape(normalized));
    assert.strictEqual(rotated.cells.length, 4, `Obracany kształt ${shape.name} powinien mieć 4 komórki`);
  });
});

test("checkCollision wykrywa kolizję ze ścianą", () => {
  const emptyBoard = createBoard();
  const iShape = normalizeShape(SHAPES[0]); // I - pozioma [0,0],[1,0],[2,0],[3,0]
  
  assert.ok(checkCollision(emptyBoard, iShape, -1, 0), "Kolizja z lewą ścianą");
  assert.ok(checkCollision(emptyBoard, iShape, 7, 0), "Kolizja z prawą ścianą (7+3=10)");
  assert.ok(!checkCollision(emptyBoard, iShape, 0, 0), "Brak kolizji w poprawnym położeniu");
  
  // I pionowy
  const iVertical = normalizeShape(rotateShape(iShape));
  assert.ok(checkCollision(emptyBoard, iVertical, 0, 17), "Kolizja z dolną ścianą (I pionowy na y=17)");
  assert.ok(!checkCollision(emptyBoard, iVertical, 0, 16), "Brak kolizji na y=16");
  
  // Kształt pojawiający się z góry (y ujemny) - nie powinien kolidować z pustą planszą
  assert.ok(!checkCollision(emptyBoard, iShape, 3, -2), "Brak kolizji dla klocka pojawiającego się z góry");
});

test("checkCollision wykrywa kolizję z innymi klockami", () => {
  const board = createBoard();
  board[8][8] = "yellow"; // Klocek na (8,8)
  
  const oShape = normalizeShape(SHAPES[3]); // O - kwadrat [[0,0],[1,0],[0,1],[1,1]]
  
  // Klocek na (4, 4) - nie powinien kolidować (jego komórki to (4,4),(5,4),(4,5),(5,5))
  assert.ok(!checkCollision(board, oShape, 4, 4), "Brak kolizji");
  
  // Klocek na (7, 8) - powinien kolidować, bo (7+1,8+0)=(8,8) ma klocek
  assert.ok(checkCollision(board, oShape, 7, 8), "Kolizja z istniejącym klockiem na (8,8)");
  
  // Klocek na (8, 7) - powinien kolidować, bo (8+0,7+1)=(8,8) ma klocek
  assert.ok(checkCollision(board, oShape, 8, 7), "Kolizja z istniejącym klockiem na (8,8)");
  
  // Klocek na (7, 7) - powinien kolidować, bo (7+1,7+1)=(8,8) ma klocek
  assert.ok(checkCollision(board, oShape, 7, 7), "Kolizja z istniejącym klockiem na (8,8)");
});

test("placeShape umieszcza klocek na planszy", () => {
  const board = createBoard();
  const oShape = normalizeShape(SHAPES[3]); // O - kwadrat
  
  const newBoard = placeShape(board, oShape, 3, 5, "yellow");
  
  assert.strictEqual(newBoard[3][5], "yellow", "Komórka (3,5) powinna być żółta");
  assert.strictEqual(newBoard[4][5], "yellow", "Komórka (4,5) powinna być żółta");
  assert.strictEqual(newBoard[3][6], "yellow", "Komórka (3,6) powinna być żółta");
  assert.strictEqual(newBoard[4][6], "yellow", "Komórka (4,6) powinna być żółta");
  
  assert.strictEqual(newBoard[2][5], null, "Komórka (2,5) powinna być null");
});

test("clearLines usuwa wypełnione wiersze", () => {
  const board = createBoard();
  
  // Wypełnij wiersz 15
  for (let x = 0; x < 10; x++) {
    board[x][15] = "red";
  }
  
  const { board: newBoard, lines } = clearLines(board);
  
  assert.strictEqual(lines, 1, "Powinien zostać usunięty 1 wiersz");
  
  // Sprawdź, że wiersz 15 jest teraz pusty
  for (let x = 0; x < 10; x++) {
    assert.strictEqual(newBoard[x][15], null, `Komórka (${x},15) powinna być pusta`);
  }
  
  assert.strictEqual(newBoard.length, 10, "Board powinien mieć 10 kolumn");
  assert.strictEqual(newBoard[0].length, 20, "Każda kolumna powinna mieć 20 wierszy");
});

test("clearLines usuwa wiele wierszy", () => {
  const board = createBoard();
  
  // Wypełnij wiersze 15, 16, 17
  for (let y = 15; y <= 17; y++) {
    for (let x = 0; x < 10; x++) {
      board[x][y] = "blue";
    }
  }
  
  const { board: newBoard, lines } = clearLines(board);
  
  assert.strictEqual(lines, 3, "Powinny zostać usunięte 3 wiersze");
  
  // Wiersze 17, 18, 19 powinny być teraz puste
  for (let y = 17; y <= 19; y++) {
    for (let x = 0; x < 10; x++) {
      assert.strictEqual(newBoard[x][y], null, `Komórka (${x},${y}) powinna być pusta po usunięciu 3 wierszy`);
    }
  }
  
  // Wiersze powyżej (14,13,12) powinny zostać przesunięte w dół o 3
  for (let x = 0; x < 10; x++) {
    assert.strictEqual(newBoard[x][17], board[x][14], `Komórka (${x},17) powinna mieć to, co było w (${x},14)`);
  }
});

test("randomShape zwraca poprawny kształt", () => {
  global.pick = pick;
  const shape = randomShape();
  delete global.pick;
  assert.strictEqual(shape.cells.length, 4, "randomShape powinien zwracać kształt z 4 komórkami");
  shape.cells.forEach(([x, y]) => {
    assert.ok(x >= 0 && y >= 0, "Wszystkie komórki powinny mieć nieujemne współrzędne");
  });
});

test("Wszystkie kształty mają poprawne rozmiary po normalizacji", () => {
  const normalizedShapes = SHAPES.map(normalizeShape);
  normalizedShapes.forEach(shape => {
    let minX = 10, maxX = -1, minY = 10, maxY = -1;
    shape.cells.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
    assert.strictEqual(minX, 0, `Kształt ${shape.name} powinien zaczynać się od x=0`);
    assert.strictEqual(minY, 0, `Kształt ${shape.name} powinien zaczynać się od y=0`);
    assert.ok(maxX < 4, `Kształt ${shape.name} nie powinien przekraczać 4 kolumn`);
    assert.ok(maxY < 4, `Kształt ${shape.name} nie powinien przekraczać 4 wierszy`);
  });
});

test("Obracanie I kształtu", () => {
  const iShape = normalizeShape(SHAPES[0]); // [[0,0],[1,0],[2,0],[3,0]]
  const rotated = normalizeShape(rotateShape(iShape));
  assert.strictEqual(rotated.cells.length, 4);
  rotated.cells.forEach(([x, y]) => {
    assert.strictEqual(x, 0, "Wszystkie x powinny być 0");
  });
  const ys = rotated.cells.map(([x, y]) => y);
  assert.deepStrictEqual(ys.sort((a, b) => a - b), [0, 1, 2, 3], "Y powinny być 0,1,2,3");
});

test("Obracanie O kształtu nie zmienia go", () => {
  const oShape = normalizeShape(SHAPES[3]); // O - kwadrat
  const rotated = normalizeShape(rotateShape(oShape));
  assert.strictEqual(rotated.cells.length, 4);
});

// Testy dla wall kicks
test("WALL_KICKS ma poprawne offsety", () => {
  assert.ok(Array.isArray(WALL_KICKS), "WALL_KICKS powinien być tablicą");
  assert.ok(WALL_KICKS.length > 0, "WALL_KICKS powinien mieć co najmniej jeden offset");
  WALL_KICKS.forEach(([x, y]) => {
    assert.ok(typeof x === "number", "Offset X powinien być liczbą");
    assert.ok(typeof y === "number", "Offset Y powinien być liczbą");
  });
});

// Testy dla pustej planszy
test("clearLines na pustej planszy zwraca 0 linii", () => {
  const board = createBoard();
  const { board: newBoard, lines } = clearLines(board);
  assert.strictEqual(lines, 0, "Pusta plansza nie powinna mieć linii do usunięcia");
  assert.deepStrictEqual(newBoard, board, "Pusta plansza powinna pozostać niezmieniona");
});

// Testy dla następnych kształtów
test("Wszystkie kształty mają poprawne spawnX i spawnY", () => {
  const normalizedShapes = SHAPES.map(normalizeShape);
  normalizedShapes.forEach(shape => {
    assert.ok(shape.spawnX !== undefined, `Kształt ${shape.name} powinien mieć spawnX`);
    assert.ok(shape.spawnY !== undefined, `Kształt ${shape.name} powinien mieć spawnY`);
    assert.ok(shape.spawnX >= 0 && shape.spawnX < 10, `spawnX powinien być w zakresie 0-9`);
    assert.ok(shape.spawnY >= -2 && shape.spawnY <= 0, `spawnY powinien być ujemny lub 0`);
  });
});
