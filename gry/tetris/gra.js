// Tetris - klasyczna gra układanka
// Wersja ulepszona: lepsza grafiką, mechaniką i doświadczeniem użytkownika
{
  // --- Typy tetromino (7 klasycznych kształtów) ---
  const SHAPES = [
    { cells: [[0,0],[1,0],[2,0],[3,0]], color: "cyan", name: "I", spawnX: 3, spawnY: -1 },   // I - pałka (pozioma)
    { cells: [[0,0],[0,1],[1,1],[2,1]], color: "blue", name: "J", spawnX: 3, spawnY: -1 },   // J
    { cells: [[2,0],[0,1],[1,1],[2,1]], color: "orange", name: "L", spawnX: 3, spawnY: -1 }, // L
    { cells: [[0,0],[1,0],[0,1],[1,1]], color: "yellow", name: "O", spawnX: 4, spawnY: -1 }, // O - kwadrat
    { cells: [[1,0],[2,0],[0,1],[1,1]], color: "green", name: "S", spawnX: 3, spawnY: -1 },  // S
    { cells: [[1,0],[0,1],[1,1],[2,1]], color: "purple", name: "T", spawnX: 3, spawnY: -1 }, // T
    { cells: [[0,0],[1,0],[1,1],[2,1]], color: "red", name: "Z", spawnX: 3, spawnY: -1 },    // Z
  ];

  // Mapowanie kolorów do palety platformy
  const COLOR_MAP = {
    cyan: "blue", blue: "blue", orange: "orange", 
    yellow: "yellow", green: "green", purple: "violet", red: "red"
  };

  // --- Funkcje pomoce dla kształtów ---

  // Normalizacja kształtu do układu (0,0)
  function normalizeShape(shape) {
    let minX = 10, minY = 10;
    shape.cells.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    });
    return {
      cells: shape.cells.map(([x, y]) => [x - minX, y - minY]),
      color: shape.color,
      name: shape.name,
      spawnX: shape.spawnX ?? 3,
      spawnY: shape.spawnY ?? -1
    };
  }

  // Obrót o 90 stopni (CW = 1, CCW = -1)
  function rotateShape(shape, dir = 1) {
    const rotated = shape.cells.map(([x, y]) => dir === 1 ? [y, -x] : [-y, x]);
    return { cells: rotated, color: shape.color, name: shape.name };
  }

  // Wall kicks - testowe przesunięcia przy kolizji po obrocie
  const WALL_KICKS = [
    [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [2, 0], [-2, 0]
  ];

  function randomShape() {
    return normalizeShape(pick(SHAPES));
  }

  // --- Funkcje kolizji i planszy ---

  function checkCollision(board, shape, offsetX, offsetY) {
    for (const [x, y] of shape.cells) {
      const bx = x + offsetX;
      const by = y + offsetY;
      if (bx < 0 || bx >= 10 || by >= 20) return true;
      if (by >= 0 && board[bx][by]) return true;
    }
    return false;
  }

  function canSpawn(board, shape, offsetX, offsetY) {
    for (const [x, y] of shape.cells) {
      const bx = x + offsetX;
      const by = y + offsetY;
      if (by >= 0 && by < 20 && board[bx][by]) return false;
    }
    return true;
  }

  function placeShape(board, shape, offsetX, offsetY, color) {
    const newBoard = JSON.parse(JSON.stringify(board));
    for (const [x, y] of shape.cells) {
      const bx = x + offsetX;
      const by = y + offsetY;
      if (bx >= 0 && bx < 10 && by >= 0 && by < 20) {
        newBoard[bx][by] = color;
      }
    }
    return newBoard;
  }

  // Usuwa wypełnione wiersze i zwraca nową planszę + liczbę usuniętych
  function clearLines(board) {
    const linesToClear = [];
    for (let y = 0; y < 20; y++) {
      if (board.every(col => col[y])) {
        linesToClear.push(y);
      }
    }
    
    if (linesToClear.length === 0) {
      return { board, lines: 0 };
    }
    
    const newBoard = Array.from({ length: 10 }, () => Array(20).fill(null));
    let targetY = 19;
    
    for (let y = 19; y >= 0; y--) {
      if (linesToClear.includes(y)) continue;
      for (let x = 0; x < 10; x++) {
        newBoard[x][targetY] = board[x][y];
      }
      targetY--;
    }
    
    return { board: newBoard, lines: linesToClear.length };
  }

  // Sprawdza czy plansza jest pusta
  function isBoardEmpty(board) {
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 20; y++) {
        if (board[x][y]) return false;
      }
    }
    return true;
  }

  // Eksport dla testów
  if (typeof module !== "undefined") {
    module.exports = { 
      SHAPES, rotateShape, checkCollision, placeShape, clearLines, 
      randomShape, normalizeShape, WALL_KICKS 
    };
  }

  // Rejestracja gry
  if (typeof registerGame !== "undefined") registerGame({
    id: "tetris",
    cat: "zrecznosciowe",
    name: "Tetris",
    author: "Mistral Vibe",
    desc: "Układaj spadające klocki i wypełniaj wiersze. Klasyczna gra z trybem bez końca.",
    color: "#00f7ff",
    ink: "#000000",
    glyph: [
      "..#..",
      "..#..",
      "#####",
      "..#..",
      "..#.."
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, linesToClear: 10, speed: 800 },
      { key: "medium", name: "Średni", points: 25, linesToClear: 20, speed: 500 },
      { key: "hard", name: "Trudny", points: 50, linesToClear: 30, speed: 300 },
    ],
    endless: { unit: "wiersz", speed: 400 },
    rules: [
      "Strzałki: lewo/prawo - przesuwanie, góra/dół - obracanie klocka.",
      "Spacja: natychmiastowe upuszczenie klocka na dół (hard drop).",
      "Shift: przytrzymanie przyspiesza opadanie (soft drop).",
      "Na telefonie użyj przycisków dotykowych.",
      "Wypełnij wiersz, aby go usunąć. W trybie bez końca gra przyspiesza.",
    ],
    achievements: [
      { id: "pierwsza-linia", name: "Pierwsza linia", desc: "Usuń pierwszą linię.", points: 10 },
      { id: "linia-4", name: "Tetris!", desc: "Usuń 4 wiersze naraz.", points: 25 },
      { id: "bez-bledu", name: "Czysta plansza", desc: "Wygraj łatwy poziom.", points: 10 },
      { id: "szybki", name: "Błyskawica", desc: "Wygraj średni poziom w mniej niż 60 sekund.", points: 25 },
      { id: "mistrz", name: "Mistrz Tetrisa", desc: "Wygraj trudny poziom.", points: 50 },
      { id: "combo-5", name: "Combo", desc: "Usuń 5 linii z rzędu.", points: 25 },
      { id: "endless-50", name: "Półmaraton", desc: "Usuń 50 wierszy w trybie bez końca.", points: 25 },
      { id: "endless-100", name: "Maratończyk", desc: "Usuń 100 wierszy w trybie bez końca.", points: 50 },
    ],

    mount(board, ctx) {
      const { linesToClear, speed: baseSpeed } = ctx.level;
      const BOARD_W = 10;  // Szerokość planszy logicznej
      const BOARD_H = 20;  // Wysokość planszy logicznej
      const W = 16;       // Szerokość płótna (plansza + miejsce na tekst)
      const H = 20;       // Wysokość płótna
      const endless = ctx.level.endless;
      
      // Stan gry
      const s = {
        board: Array.from({ length: 10 }, () => Array(20).fill(null)),
        currentShape: normalizeShape(pick(SHAPES)),
        nextShape: normalizeShape(pick(SHAPES)),
        heldShape: null,
        canHold: true,
        shapeX: 0,
        shapeY: 0,
        linesCleared: 0,
        score: 0,
        gameOver: false,
        lastDrop: 0,
        startTime: Date.now(),
        dropCounter: 0,
        // Soft drop - szybkie opadanie
        softDropActive: false,
        softDropSpeed: 50, // ms między ruchami w soft drop
        // DAS - Delayed Auto Shift
        dasLeft: { active: false, timer: 0 },
        dasRight: { active: false, timer: 0 },
        // Dla trybu endless - aktualna prędkość
        currentSpeed: baseSpeed,
        level: 1,
        // Animacja usunięcia linii
        flashLines: [],
        flashTimer: 0,
        // Czas ostatniego ruchu bocznego (dla DAS)
        lastMoveTime: 0,
      };

      // Parametry DAS
      const DAS_DELAY = 140;  // Opóźnienie przed rozpoczęciem powtarzania
      const DAS_REPEAT = 40;  // Interwał powtarzania
      const DAS_MOVE_DELAY = 16; // Minimalny czas między ruchami DAS

      const cv = canvasGame(board, ctx, W, H, { max: 100, cls: "arcade" });
      const { g, theme, loop, text } = cv;

      // Inicjalizacja pozycji startowej
      function spawnNewShape() {
        s.currentShape = s.nextShape;
        s.nextShape = normalizeShape(pick(SHAPES));
        s.shapeX = s.currentShape.spawnX;
        s.shapeY = s.currentShape.spawnY;
        s.dasLeft = { active: false, timer: 0 };
        s.dasRight = { active: false, timer: 0 };
        s.softDropActive = false;
        s.canHold = true;
        
        // Sprawdź kolizję przy spawnie
        if (!canSpawn(s.board, s.currentShape, s.shapeX, s.shapeY)) {
          if (endless) {
            ctx.over(s.linesCleared, s.score, `Usunięto ${s.linesCleared} wierszy.`);
          } else {
            ctx.lose("Koniec gry", `Punkty: ${s.score}. Usunięto ${s.linesCleared} wierszy.`);
          }
          s.gameOver = true;
          return false;
        }
        return true;
      }

      // Aktualizuj pasek postępu (wbudowany w platformę)
      function updateProgress() {
        if (!endless) {
          ctx.progress(s.linesCleared / linesToClear);
        }
      }

      // Aktualizuj prędkość w trybie endless
      function updateEndlessSpeed() {
        if (endless) {
          // Co 10 wierszy zwiększ prędkość o 10%
          s.level = Math.floor(s.linesCleared / 10) + 1;
          s.currentSpeed = Math.max(50, baseSpeed * Math.pow(0.9, s.level - 1));
        }
      }

      // Rysowanie pojedynczego klocka
      function drawShape(shape, x, y, color, alpha = 1) {
        g.globalAlpha = alpha;
        g.fillStyle = theme[COLOR_MAP[color] || color] || color;
        
        for (const [sx, sy] of shape.cells) {
          const px = sx + x;
          const py = sy + y;
          if (px >= 0 && px < BOARD_W && py >= 0 && py < BOARD_H) {
            // Cień klocka
            g.fillStyle = color === "yellow" ? theme.line : theme.line;
            g.fillRect(px + 0.02, py + 0.02, 0.98, 0.98);
            
            // Wypełnienie
            g.fillStyle = theme[COLOR_MAP[color] || color] || color;
            g.fillRect(px, py, 1, 1);
            
            // Obramowanie
            g.strokeStyle = theme.line;
            g.lineWidth = 0.02;
            g.strokeRect(px, py, 1, 1);
            
            // Lekki highlight
            if (color !== "yellow") {
              g.fillStyle = color === "cyan" ? theme.bg : theme.surface;
              g.globalAlpha = 0.3;
              g.fillRect(px + 0.02, py + 0.02, 0.3, 0.1);
              g.globalAlpha = alpha;
            }
          }
        }
        g.globalAlpha = 1;
      }

      // Rysowanie planszy
      function drawBoard() {
        // Tło całego płótna
        g.fillStyle = theme.bg;
        g.fillRect(0, 0, W, H);
        
        // Siatka - tylko na obszarze planszy (10x20)
        g.strokeStyle = theme.line;
        g.lineWidth = 0.01;
        for (let x = 0; x <= BOARD_W; x++) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, BOARD_H);
          g.stroke();
        }
        for (let y = 0; y <= BOARD_H; y++) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(BOARD_W, y);
          g.stroke();
        }
        
        // Umieszczone klocki - tylko na obszarze planszy
        for (let x = 0; x < BOARD_W; x++) {
          for (let y = 0; y < BOARD_H; y++) {
            if (s.board[x][y]) {
              drawShape(
                { cells: [[0,0]], color: s.board[x][y] },
                x, y, s.board[x][y], 1
              );
            }
          }
        }
        
        // Animacja usuwania linii (flash)
        if (s.flashLines.length > 0 && !s.gameOver) {
          const flashAlpha = Math.sin((Date.now() - s.flashTimer) / 50) * 0.5 + 0.5;
          g.fillStyle = theme.ok;
          g.globalAlpha = flashAlpha * 0.6;
          for (const line of s.flashLines) {
            g.fillRect(0, line, W, 1);
          }
          g.globalAlpha = 1;
        }
        
        // Aktualny klocek
        if (!s.gameOver) {
          drawShape(s.currentShape, s.shapeX, s.shapeY, s.currentShape.color, 1);
          
          // Cień klocka (ghost piece)
          let shadowY = s.shapeY;
          while (shadowY < BOARD_H && !checkCollision(s.board, s.currentShape, s.shapeX, shadowY + 1)) {
            shadowY++;
          }
          drawShape(s.currentShape, s.shapeX, shadowY, s.currentShape.color, 0.25);
        }
      }

      // Rysowanie podglądu następnego klocka
      function drawNext() {
        const offsetX = BOARD_W + 1.2;
        const offsetY = 1.5;
        
        // Tło podglądu
        g.fillStyle = theme.surface;
        g.fillRect(offsetX - 0.5, offsetY - 0.5, 5.5, 5.5);
        
        // Nagłówek
        text("Następny:", offsetX + 0.2, offsetY - 0.2, { size: 0.55, color: "muted" });
        
        // Klocek
        drawShape(s.nextShape, offsetX + 1, offsetY + 1, s.nextShape.color);
      }

      // Rysowanie informacji
      function drawInfo() {
        const offsetX = BOARD_W + 1.2;
        let offsetY = 7;
        
        // Wiersze i punkty
        if (endless) {
          text(`Wiersze: ${s.linesCleared}`, offsetX, offsetY, { size: 0.65, color: "text" });
          text(`Poziom: ${s.level}`, offsetX, offsetY + 1, { size: 0.65, color: "text" });
        } else {
          text(`Linie: ${s.linesCleared}/${linesToClear}`, offsetX, offsetY, { size: 0.65, color: "text" });
        }
        text(`Punkty: ${s.score}`, offsetX, offsetY + 2, { size: 0.65, color: "text" });
        
        // Czas
        const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
        text(`Czas: ${fmt(elapsed)}`, offsetX, offsetY + 3, { size: 0.65, color: "muted" });
      }

      // Główna funkcja rysowania
      function draw() {
        drawBoard();
        drawNext();
        drawInfo();
      }

      // Sprawdza czy klocek może spaść
      function canDrop() {
        return !checkCollision(s.board, s.currentShape, s.shapeX, s.shapeY + 1);
      }

      // Miękkie opuszczenie (soft drop)
      function softDrop() {
        if (s.gameOver || !canDrop()) return;
        s.shapeY++;
        s.score += 1; // Punkty za soft drop
        if (checkCollision(s.board, s.currentShape, s.shapeX, s.shapeY)) {
          s.shapeY--;
          placeAndClear();
        }
      }

      // Przesunięcie klocka
      function tryMove(dx) {
        if (s.gameOver) return false;
        const newX = s.shapeX + dx;
        if (!checkCollision(s.board, s.currentShape, newX, s.shapeY)) {
          s.shapeX = newX;
          return true;
        }
        return false;
      }

      // Obrót klocka z wall kicks
      function rotate(dir) {
        if (s.gameOver) return;
        const oldShape = s.currentShape;
        const oldX = s.shapeX;
        const oldY = s.shapeY;
        
        s.currentShape = normalizeShape(rotateShape(s.currentShape, dir));
        
        // Jeśli kolizja, próbuj wall kicks
        if (checkCollision(s.board, s.currentShape, s.shapeX, s.shapeY)) {
          for (const [kx, ky] of WALL_KICKS) {
            const newX = s.shapeX + kx;
            const newY = s.shapeY + ky;
            if (!checkCollision(s.board, s.currentShape, newX, newY)) {
              s.shapeX = newX;
              s.shapeY = newY;
              Sound.tap();
              return;
            }
          }
          // Jeśli żaden wall kick nie działa, przywróć
          s.currentShape = oldShape;
          s.shapeX = oldX;
          s.shapeY = oldY;
        } else {
          Sound.tap();
        }
      }

      // Twardy drop (natychmiastowe opuszczenie)
      function hardDrop() {
        if (s.gameOver) return;
        while (canDrop()) {
          s.shapeY++;
          s.score += 2; // Punkty za hard drop
        }
        placeAndClear();
        Sound.line();
      }

      // Umieszczenie klocka i sprawdzenie linii
      function placeAndClear() {
        s.board = placeShape(s.board, s.currentShape, s.shapeX, s.shapeY, s.currentShape.color);
        
        const { board, lines } = clearLines(s.board);
        s.board = board;
        s.linesCleared += lines;
        
        // Punkty za usunięcie linii
        const linePoints = [0, 100, 300, 500, 800];
        s.score += linePoints[lines] || 0;
        
        // Sprawdź osiągnięcia
        if (lines === 4) {
          ctx.achieve("linia-4");
        }
        if (s.linesCleared === 1) {
          ctx.achieve("pierwsza-linia");
        }
        
        // Combo - kolejne usunięcia
        s.dropCounter = lines > 0 ? s.dropCounter + 1 : 0;
        if (s.dropCounter >= 5) {
          ctx.achieve("combo-5");
        }
        
        // Animacja flash dla usuniętych linii
        if (lines > 0) {
          s.flashLines = [];
          for (let y = 0; y < H; y++) {
            if (board.every(col => !col[y])) {
              // Ta linia została usunięta, dodaj linie powyżej do animacji
              for (let dy = 0; dy < lines; dy++) {
                const lineAbove = y + dy;
                if (lineAbove < H && !s.flashLines.includes(lineAbove)) {
                  s.flashLines.push(lineAbove);
                }
              }
            }
          }
          s.flashTimer = Date.now();
        }
        
        updateProgress();
        updateEndlessSpeed();
        
        // Osiągnięcia w trybie endless
        if (endless) {
          if (s.linesCleared >= 50) ctx.achieve("endless-50");
          if (s.linesCleared >= 100) ctx.achieve("endless-100");
        }
        
        // Sprawdź zwycięstwo
        if (!endless && s.linesCleared >= linesToClear) {
          if (ctx.level.key === "easy") ctx.achieve("bez-bledu");
          if (ctx.level.key === "hard") ctx.achieve("mistrz");
          if (ctx.level.key === "medium" && (Date.now() - s.startTime) / 1000 < 60) {
            ctx.achieve("szybki");
          }
          ctx.win(`Punkty: ${s.score}. Usunięto ${s.linesCleared} wierszy.`);
          s.gameOver = true;
          return;
        }
        
        // Nowy klocek
        if (!spawnNewShape()) {
          s.gameOver = true;
        }
        
        Sound.place(1);
      }

      // --- Przyciski dotykowe i obsługa klawiatury ---
      const touch = { 
        ArrowLeft: false, ArrowRight: false, 
        ArrowUp: false, ArrowDown: false, Space: false, Shift: false 
      };
      
      touchPad(ctx, touch, [
        ["ArrowLeft", "Lewo", "i-left"],
        ["ArrowRight", "Prawo", "i-right"],
        ["ArrowUp", "Obrót +", "i-cw"],
        ["ArrowDown", "Obrót -", "i-ccw"],
        ["Space", "Drop", "i-down"],
      ]);
      
      function handleKeyDown(e) {
        if (s.gameOver) return;
        const code = e.code;
        
        if (code === "ArrowLeft") {
          e.preventDefault();
          tryMove(-1);
          s.dasLeft.timer = Date.now();
          touch.ArrowLeft = true;
        } else if (code === "ArrowRight") {
          e.preventDefault();
          tryMove(1);
          s.dasRight.timer = Date.now();
          touch.ArrowRight = true;
        } else if (code === "ArrowUp") {
          e.preventDefault();
          rotate(1);
          touch.ArrowUp = true;
        } else if (code === "ArrowDown") {
          e.preventDefault();
          rotate(-1);
          touch.ArrowDown = true;
        } else if (code === "Space") {
          e.preventDefault();
          hardDrop();
          touch.Space = true;
        }
        // Alternatywne sterowanie WASD
        else if (code === "KeyA") {
          e.preventDefault();
          tryMove(-1);
          s.dasLeft.timer = Date.now();
          touch.ArrowLeft = true;
        } else if (code === "KeyD") {
          e.preventDefault();
          tryMove(1);
          s.dasRight.timer = Date.now();
          touch.ArrowRight = true;
        } else if (code === "KeyW") {
          e.preventDefault();
          rotate(1);
          touch.ArrowUp = true;
        } else if (code === "KeyS") {
          e.preventDefault();
          rotate(-1);
          touch.ArrowDown = true;
        } else if (code === "ShiftLeft" || code === "ShiftRight") {
          e.preventDefault();
          s.softDropActive = true;
        }
      }

      function handleKeyUp(e) {
        const code = e.code;
        if (code === "ArrowLeft" || code === "KeyA") {
          touch.ArrowLeft = false;
          s.dasLeft.active = false;
        } else if (code === "ArrowRight" || code === "KeyD") {
          touch.ArrowRight = false;
          s.dasRight.active = false;
        } else if (code === "ArrowUp" || code === "KeyW") {
          touch.ArrowUp = false;
        } else if (code === "ArrowDown" || code === "KeyS") {
          touch.ArrowDown = false;
        } else if (code === "Space") {
          touch.Space = false;
        } else if (code === "ShiftLeft" || code === "ShiftRight") {
          s.softDropActive = false;
        }
      }

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("keyup", handleKeyUp);

      ctx.onStop(() => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
      });

      // Inicjalizacja
      updateProgress();
      
      let lastTime = Date.now();
      let lastSoftDrop = 0;
      
      loop(() => {
        const now = Date.now();
        
        if (!s.gameOver) {
          const dropSpeed = endless ? s.currentSpeed : (ctx.level.speed || baseSpeed);
          
          // Normalne opadanie
          if (now - s.lastDrop > dropSpeed) {
            s.lastDrop = now;
            if (canDrop()) {
              softDrop();
            } else if (s.shapeY < 0) {
              s.shapeY++;
            } else {
              placeAndClear();
            }
          }
          
          // Soft drop - szybkie opadanie przy przytrzymaniu strzałki w dół
          if (s.softDropActive && now - lastSoftDrop > s.softDropSpeed) {
            lastSoftDrop = now;
            if (canDrop()) {
              softDrop();
            }
          }
          
          // DAS - Delayed Auto Shift dla lewej
          if (touch.ArrowLeft) {
            if (!s.dasLeft.active) {
              if (now - s.dasLeft.timer > DAS_DELAY) {
                s.dasLeft.active = true;
                if (now - s.lastMoveTime > DAS_MOVE_DELAY) {
                  tryMove(-1);
                  s.lastMoveTime = now;
                }
              }
            } else {
              if (now - s.lastMoveTime > DAS_REPEAT) {
                tryMove(-1);
                s.lastMoveTime = now;
              }
            }
          }
          
          // DAS - Delayed Auto Shift dla prawej
          if (touch.ArrowRight) {
            if (!s.dasRight.active) {
              if (now - s.dasRight.timer > DAS_DELAY) {
                s.dasRight.active = true;
                if (now - s.lastMoveTime > DAS_MOVE_DELAY) {
                  tryMove(1);
                  s.lastMoveTime = now;
                }
              }
            } else {
              if (now - s.lastMoveTime > DAS_REPEAT) {
                tryMove(1);
                s.lastMoveTime = now;
              }
            }
          }
          
          // Touch: pojedyncze naciśnięcia (obroty i drop)
          if (touch.ArrowUp) {
            touch.ArrowUp = false;
            rotate(1);
          }
          if (touch.ArrowDown) {
            // Touch down - toggle soft drop
            s.softDropActive = !s.softDropActive;
            touch.ArrowDown = false;
          }
          if (touch.Space) {
            touch.Space = false;
            hardDrop();
          }
        }
        
        // Wyłącz animację flash po 300ms
        if (s.flashLines.length > 0 && now - s.flashTimer > 300) {
          s.flashLines = [];
        }
        
        draw();
      });
    },
  });
}
