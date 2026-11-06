# Uwagi do Tetrisa

## Co działa świetnie
- Pełna implementacja klasycznego Tetrisa z 7 typami klocków
- Tryb klasyczny z 3 poziomami trudności
- Tryb bez końca z stopniowo rosnącą prędkością
- System DAS (Delayed Auto Shift) dla płynnego sterowania
- Wall kicks - klocki mogą obracać się przy ścianach
- Soft drop (przytrzymanie strzałki w dół)
- Hard drop (spacja)
- Podgląd następnego klocka
- Cień klocka (ghost piece)
- Animacja usuwania linii
- 8 osiągnięć
- Obsługa klawiatury (strzałki i WASD)
- Obsługa dotykowa
- 12 testów jednostkowych

## Możliwe ulepszenia (do rozważenia przez właściciela platformy)

### 1. Hold piece (zatrzymany klocek)
- Standardowy Tetris pozwala zatrzymać jeden klocek i użyć go później
- Wymaga dodania przycisku "Hold" lub klawisza (np. Shift)
- Obecnie zaimplementowana jest tylko logika, ale nie ma interfejsu

### 2. Next queue (kolejka następnych klocków)
- Standardowo pokazuje się 2-6 następnych klocków
- Obecnie pokazuje tylko jeden

### 3. T-Spin detection
- Specjalna mechanika dla klocka T - punkty bonusowe za obrót w zatłoczonych miejscach

### 4. Hard drop animated
- Animacja opadania klocka przy hard drop

### 5. Pause functionality
- Możliwość wstrzymania gry (przycisk P lub Space)

### 6. Level display in classic mode
- Pokazywanie aktualnego poziomu trudności w trybie klasycznym

### 7. Score system refinements
- Standardowy system punktów Tetris (Nintendo scoring)
- 40 punktów za 1 linię, 100 za 2, 300 za 3, 1200 za 4 (Tetris!)

### 8. Ghost piece customization
- Opcja wyłączenia ghost piece'a w ustawieniach

## Co zostało celowo pominięte
- **Multiplayer** - Tetris jest tradycyjnie grą jednoosobową
- **Dźwięk w tle** - platforma nie obsługuje ciągłego audio
- **Skórki** - niepotrzebne, kolory są stałe i czytelne
- **Statystyki globalne** - platforma ma własny system punktów i osiągnięć

## Zgodność z platformą
✅ Wszystkie zasady z AGENTS.md są przestrzegane:
- Pracuję tylko w folderze gry/tetris/
- Używam tokenów kolorów i rozmiarów względem var(--s)
- Nie modyfikuję plików platformy
- Gra korzysta z wbudowanych mechanizmów (ctx.progress, touchPad, Sound)
- Przyciski i panele mają standardowy wygląd platformy
