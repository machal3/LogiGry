# Logigra: jak dodać grę (instrukcja dla modeli AI)

Logigra to strona z grami w przeglądarce: czysty HTML, CSS i JavaScript, bez frameworków, bez budowania, bez zależności.
Otwierasz `index.html` i działa. Każdy model AI może dodać własną grę. Kilka modeli pracuje **na tych samych plikach jednocześnie**,
dlatego najważniejsza jest zasada nr 1.

## 1. Zasada nadrzędna: pracujesz tylko w swoim folderze

Twoja gra to jeden folder: `gry/<id>/`. Tworzysz i zmieniasz **wyłącznie** pliki w nim.

**Nie wolno Ci edytować** (inne modele i właściciel pracują na nich w tym samym czasie):

| Plik | Co to jest |
|---|---|
| `index.html` | lista skryptów; Twoją grę dopisuje do niej narzędzie, nie Ty |
| `app.js`, `games.js`, `profile.js`, `lib.js` | silnik platformy, rejestr, profil i punkty |
| `theme.css`, `style.css`, `games.css`, `games-more.css` | motyw i wspólne style |
| `games/*` | starsze gry |
| `gry/<cudze-id>/`, `gry/_szablon/` | gry innych modeli i szablon |
| `AGENTS.md`, `narzedzia/*` | ta instrukcja i narzędzie |

Jeśli do Twojej gry potrzebna jest zmiana platformy (nowa funkcja pomocnicza, nowa ikona, nowy dźwięk), **nie rób jej**.
Obejdź to w swoim folderze, a prośbę opisz w `gry/<id>/UWAGI.md`; właściciel zdecyduje.
Jeżeli funkcja przyda się tylko Tobie, po prostu napisz ją w swoim `gra.js`.

## 2. Kroki

```sh
node narzedzia/gry.mjs nowa <id>        # kopiuje szablon do gry/<id>/ (id: małe litery bez polskich znaków, cyfry, myślniki)
# ... przerabiasz gry/<id>/gra.js i gry/<id>/gra.css na swoją grę ...
node narzedzia/gry.mjs sprawdz <id>     # sprawdza grę i dopisuje ją do index.html; musi pokazać "OK"
node --test gry/<id>/test.js            # test logiki gry (jeśli gra coś generuje albo liczy)
```

Potem otwórz `index.html#/gra/<id>` w przeglądarce, zagraj na każdym poziomie do wygranej i do przegranej, sprawdź konsolę (zero błędów),
wąski ekran (360 px) i ciemny motyw systemu. Gra jest gotowa dopiero, gdy `sprawdz` pokazuje `OK` i da się ją wygrać na każdym poziomie.

Narzędzie odświeża listę gier w `index.html` na podstawie folderów w `gry/`, więc kilka modeli może je uruchamiać jednocześnie:
każde uruchomienie zapisuje pełną listę. Nie dopisuj gry do `index.html` ręcznie.

## 3. Folder gry

```
gry/<id>/
  gra.js     wymagany: opis gry i cała logika, w jednym bloku { ... }
  gra.css    opcjonalny: style planszy, każdy selektor od [data-gra="<id>"]
  test.js    zalecany: test logiki w node (bez przeglądarki)
  UWAGI.md   opcjonalny: prośby do właściciela platformy
```

Inne pliki (obrazki, dźwięki, dane) nie są potrzebne: grafika powstaje z CSS, SVG w kodzie albo na `<canvas>`, dźwięki daje `Sound`.
Wzór do skopiowania: `gry/_szablon/` (gra „Dziesiątka”). Przeczytaj go w całości przed pisaniem.

### Dlaczego blok `{ ... }`
Wszystkie skrypty strony dzielą jeden zakres nazw. Jeśli dwie gry zadeklarują `const board` na najwyższym poziomie, druga przestanie działać.
Dlatego cały `gra.js` (oprócz komentarzy) jest w jednej parze klamer, a nazwy w środku są prywatne. Narzędzie to sprawdza.
Z tego samego powodu klucze `localStorage` zaczynaj od `logigra.<id>.`, a nazwy animacji CSS od `<id>-`.

## 4. Opis gry: `registerGame({...})`

| Pole | Wymagania |
|---|---|
| `id` | równe nazwie folderu; unikalne; `[a-z0-9-]` |
| `cat` | jedna z: `logiczne`, `lamiglowki`, `slowa`, `zrecznosciowe`, `akcja`, `planszowe`, `strategia`, `symulacje`, `przygodowe` |
| `name` | nazwa po polsku, do 24 znaków |
| `author` | **podpis: jaki model stworzył grę**, z wersją, tak jak sam się nazywasz, np. `"Claude Opus 5.5"`, `"GPT-5"`, `"Gemini 2.5 Pro"`. Widać go na karcie gry i w panelu. Gdy poprawiasz cudzą grę (tylko na prośbę właściciela), dopisz się: `"Claude Opus 5.5, GPT-5"` |
| `desc` | 20–110 znaków, jedno-dwa zdania: co robi gracz. Bez wykrzykników i reklamy |
| `color` | kolor gry `#rrggbb`: kafel na liście, przycisk główny, pasek postępu. Wybierz taki, którego jeszcze nie ma |
| `ink` | kolor tekstu na `color`, `#rrggbb`; kontrast co najmniej 4.5:1 (zwykle `#ffffff` albo bardzo ciemny) |
| `glyph` | ikona: 5 napisów po 5 znaków, `#` = zamalowane pole, `.` = puste |
| `big` | `true` tylko dla gier rozbudowanych (wiele mechanik, partia ponad 10 minut); zmienia punkty i pokazuje zasady w oknie |
| `levels` | dokładnie 3 poziomy: łatwy, średni, trudny (patrz punkty niżej). Oprócz `key`, `name`, `points` możesz dodać własne parametry poziomu (rozmiar, czas itd.), dostaniesz je w `ctx.level` |
| `rules` | 2–6 krótkich zdań zasad, w tym sterowanie (mysz, klawiatura, dotyk) |
| `achievements` | 3–8 własnych osiągnięć (patrz niżej) |
| `mount(board, ctx)` | uruchamia jedną partię; wywoływana od nowa przy każdej nowej grze i zmianie poziomu |

`name` poziomów: „Łatwy”, „Średni”, „Trudny” albo rozmiar planszy („5 × 5”, „8 × 8”).

## 5. Punkty i osiągnięcia

Punkty dolicza **wyłącznie platforma**. Nigdy nie zapisuj punktów sam i nie ruszaj `Profile`.

### Za wygraną (raz za każdą wygraną partię)

| Poziom | Zwykła gra | Gra rozbudowana (`big: true`) |
|---|---|---|
| 1. łatwy | 10 | 20 |
| 2. średni | 25 | 50 |
| 3. trudny | 50 | 100 |

Punkty dostaje się tylko za `ctx.win()`. Przegrana (`ctx.lose()`) daje 0. Poziomy mają się różnić trudnością naprawdę:
łatwy do wygrania przez nowego gracza w 1–3 minuty, trudny wymagający wprawy.

### Za osiągnięcia (jednorazowo, przy pierwszym zdobyciu)

Każda gra automatycznie ma cztery osiągnięcia (nie definiujesz ich i nie wywołujesz):

| id | Nazwa | Warunek | Punkty |
|---|---|---|---|
| `auto-pierwsza` | Pierwsza wygrana | wygraj dowolny poziom | 10 |
| `auto-trudny` | Twardziel | wygraj trzeci poziom | 25 |
| `auto-komplet` | Komplet | wygraj każdy poziom | 25 |
| `auto-dziesiec` | Stały bywalec | wygraj 10 razy | 50 |

Dodajesz 3–8 **własnych**, związanych z mechaniką Twojej gry:

```js
achievements: [
  { id: "bez-bledu", name: "Bez pudła", desc: "Wyczyść planszę bez pomyłki.", points: 10 },
],
```

- `points`: **10** (łatwe, zdobędzie je większość grających), **25** (wymaga umiejętności), **50** (mistrzowskie, dla nielicznych).
- `id`: `[a-z0-9-]`, nie zaczyna się od `auto-`. `name`: 1–3 słowa. `desc`: jedno zdanie z mierzalnym warunkiem („w mniej niż 45 sekund”, „bez cofania”).
- Zdobywasz je w `mount` przez `ctx.achieve("id")`. Wywołaj **przed** `ctx.win()`, wtedy pojawi się na ekranie wyniku.
  Można też w trakcie partii (np. „zbierz 3 bonusy naraz”), gracz zobaczy dymek. Ponowne wywołanie nic nie robi.
- Nie powielaj osiągnięć automatycznych („wygraj trudny poziom”). Warunek musi dać się sprawdzić w kodzie gry.
- Każde osiągnięcie musi mieć w kodzie wywołanie `ctx.achieve("jego-id")` z dosłownym id (nie `ctx.achieve(zmienna)`); narzędzie to sprawdza w obie strony.
- Sprawdzenie w pętli animacji wołaj raz, np. z flagą: `if (!s.got && s.dist >= 300) { s.got = true; ctx.achieve("rozbieg"); }`.
- Dobre wzory: bez cofania (`ctx.undos === 0`), czas (`ctx.level.key === "hard" && ctx.time < 300`), bez utraty życia, rekordowa seria, najkrótsze rozwiązanie. Przykłady w `games/*.js` (szukaj `achievements:`).

Gracz widzi wszystkie osiągnięcia na stronie `#/osiagniecia` (link „Osiągnięcia” w nawigacji) i w panelu gry.

Rangi gracza zależą od sumy punktów ze wszystkich gier; nie zmieniasz ich.

## 6. Interfejs: co daje platforma, a co robisz Ty

### Platforma robi sama (nie twórz tego w grze)
- **Nagłówek gry**: powrót do listy, ikona, nazwa, przełącznik poziomów, zegar, dźwięk, „Jak grać” (gry `big`), „Cofnij” (gdy użyjesz `ctx.undoable`), „Nowa gra”.
- **Pasek postępu** pod nagłówkiem (ustawiasz go przez `ctx.progress`).
- **Ekran wyniku** po `ctx.win` / `ctx.lose`: czas, punkty, rekord, osiągnięcia, przyciski „Następny poziom”, „Jeszcze raz”, „Spróbuj ponownie”, „Pokaż planszę”.
- **Bloki panelu**: „Zasady” (z `rules`) i „Osiągnięcia” na końcu panelu.
- **Konfetti, dźwięk wygranej i przegranej**, doliczanie punktów, zapis rekordów.

Nie dodawaj więc własnych przycisków „Nowa gra”, „Restart”, „Cofnij”, „Wycisz”, „Pomoc”, wyboru poziomu, zegara ani okien z wynikiem.

### Ty robisz
1. **Planszę** w `board` (siatka, płótno, karty...).
2. **Panel** po prawej (na telefonie pod planszą): bloki z wartościami i akcjami Twojej gry, w kolejności:
   najpierw stan (wynik, życia, ruchy), potem narzędzia i przyciski akcji. Najwyżej 4 własne bloki.

### Przyciski
Każdy przycisk tworzysz funkcją `button(tekst, klasa, onClick)` albo `iconButton(...)`. Nigdy `<button>` ze własnymi stylami.

| Klasa | Kiedy |
|---|---|
| `btn` | główna akcja w panelu (np. „Sprawdź”, „Rzuć kośćmi”); najwyżej jeden widoczny naraz |
| `btn-ghost` | akcje poboczne („Podpowiedź”, „Wyczyść pole”, „Pas”) |
| `wide` | dopisz do `btn`/`btn-ghost` w panelu, przycisk na całą szerokość |
| `linkish` | mało ważna akcja tekstowa |
| `danger` | dopisz do akcji niszczącej postęp |
| `segmented(...)` | wybór jednej z kilku opcji (tryb, narzędzie), zamiast rzędu przycisków |
| `touchPad(...)` | przyciski dotykowe trzymane jak klawisze w grach zręcznościowych |

Tekst przycisku: czasownik po polsku, 1–3 słowa, bez kropki („Podpowiedź”, „Zakończ turę”).
Pola planszy to przyciski z `gridCells` (mają `aria-label`), nie `div` z `onclick`.

## 7. `ctx`: co dostaje `mount(board, ctx)`

| | |
|---|---|
| `ctx.level` | obiekt bieżącego poziomu z `levels` (z Twoimi parametrami) |
| `ctx.panel` | panel; dodawaj do niego `panelBlock(...)` albo użyj `statBlock(ctx, ...)` |
| `ctx.win(tekst?)` | wygrana: punkty, osiągnięcia automatyczne, ekran wyniku. Tekst = jedno zdanie podsumowania |
| `ctx.lose(tytuł, tekst)` | przegrana, np. `ctx.lose("Koniec czasu", "Trafienia: 12 z 20.")` |
| `ctx.done` | `true` po wygranej/przegranej; wtedy ignoruj ruchy gracza |
| `ctx.achieve(id)` | zdobycie własnego osiągnięcia; `id` zawsze jako dosłowny napis, np. `ctx.achieve("bez-bledu")` |
| `ctx.time` | sekundy od początku partii (do osiągnięć „w mniej niż…”) |
| `ctx.undos` | ile razy gracz cofnął ruch w tej partii (do osiągnięć „bez cofania”) |
| `ctx.progress(0..1)` | postęp partii na pasku pod nagłówkiem |
| `ctx.toast(tekst)` | krótki dymek na dole planszy |
| `ctx.undoable(przywróć)` | włącza „Cofnij”; zwraca `zapisz(stan)`, które wołasz przed każdym ruchem |
| `ctx.on(cel, zdarzenie, fn)` | nasłuch, który platforma sama zdejmie po partii. Do `document` i `window` używaj tylko tego |
| `ctx.onStop(fn)` | sprzątanie po partii (`cancelAnimationFrame`, `clearInterval`) |

Nasłuchy na elementach wewnątrz `board` możesz dodawać zwykłym `addEventListener`, bo plansza znika z partią.

## 8. Gotowe funkcje (z `app.js` i `lib.js`)

| Funkcja | Do czego |
|---|---|
| `el(tag, klasa, tekst)` | tworzy element |
| `button(tekst, klasa, onClick)`, `iconButton(tekst, svgPath, klasa, onClick)` | przyciski |
| `panelBlock(tytuł, ...dzieci)` | blok panelu |
| `statBlock(ctx, tytuł, { meter, small })` | blok z dużą wartością; `.set(tekst, ułamekPaska, dopisek)` |
| `segmented(etykieta, opcje, onPick)` | przełącznik; zwraca `{ el, set(k) }` |
| `gridCells(board, kol, wier, klasa, { gap, label })` | siatka pól-przycisków dopasowana do ekranu; zwraca tablicę pól |
| `selectionRing(board)` | płynna ramka zaznaczenia; zwraca `place(pole)` |
| `cellKeys(ctx, { cols, rows, get, set, max, onDigit, keys })` | strzałki po siatce, cyfry, własne klawisze |
| `digitControls(ctx, max, { put, remaining })` | klawiatura cyfr z notatkami (jak w sudoku) |
| `canvasGame(board, ctx, W, H, { max, cls })` | płótno gry zręcznościowej: `{ g, theme, at(e), loop(frame) }`; `theme` ma kolory motywu |
| `heldKeys(ctx, onDown)`, `directionInput(ctx, obszar, onDir)`, `touchPad(ctx, keys, lista)` | sterowanie: klawisze trzymane, kierunki z klawiatury i przesunięć palcem, przyciski dotykowe (ikony `i-left`, `i-right`, `i-up`, `i-down`, `i-cw`, `i-ccw`) |
| `replay(node, "shake")`, `sweep(pola)` | drżenie przy błędzie, fala światła przez pola |
| `Sound.tap() .place(n) .erase() .flag() .line() .error()` | dźwięki (wygrana i przegrana grają same) |
| `rnd(n)`, `pick(tablica)`, `shuffle(tablica)`, `plural(n, "ruch", "ruchy", "ruchów")`, `fmt(sekundy)` | losowanie, odmiana, czas |

Gotowe sceny dla płótna: klasa `space`, `arcade` albo `neon` na `board` (ciemna paleta niezależna od motywu).
Przykłady użycia znajdziesz w `games/*.js` (np. `kret.js`: siatka i zręczność, `breakout.js`: płótno, `sudoku.js`: cyfry). Czytaj, nie zmieniaj.

## 9. Wygląd i motyw

Cały wygląd strony (kolory, zaokrąglenia, wysokość przycisków, czcionka) jest w `theme.css`.
Właściciel zmienia motyw w jednym miejscu, a Twoja gra ma się dostosować sama. Dlatego w `gra.css`:

- Każdy selektor zaczyna się od `[data-gra="<id>"]` (platforma ustawia ten atrybut na obszarze gry). Nazwy klas z krótkim prefiksem gry, np. `.dz-pole`.
- Kolory tylko ze zmiennych: `--text`, `--muted`, `--line`, `--surface`, `--bg`, `--danger`, `--gold`, kolor gry `--c` i tekst na nim `--on`.
  Odcienie robisz przez `color-mix(in srgb, var(--c) 30%, transparent)`.
  Gdy gra naprawdę potrzebuje własnych barw (np. kolory klejnotów), zdefiniuj je raz jako zmienne `--<id>-...` na `[data-gra="<id>"]`, także w wersji ciemnej.
- Zaokrąglenia przez `var(--radius)` albo względem pola (`calc(var(--s) * 0.2)`), czcionka `var(--font)`.
- **Nie zmieniaj wyglądu** `.btn`, `.btn-ghost`, `.seg`, `.panel-*`, `.result-*`, `.toast`, nagłówka ani nawigacji. Narzędzie to odrzuci.
- Ciemny motyw ma działać bez dodatkowej pracy: jeśli używasz zmiennych, działa.
- Animacje: nazwy `@keyframes <id>-...`; szanuj `@media (prefers-reduced-motion: reduce)`.

## 10. Jakość

- **Język**: cały tekst dla gracza po polsku, spokojnym tonem, bez wykrzykników i emoji. Komentarze w kodzie też po polsku, krótko, tylko gdy kod nie mówi sam za siebie.
- **Sterowanie**: mysz, dotyk i klawiatura. Gra musi dać się przejść na telefonie (360 px szerokości).
- **Dostępność**: pola i przyciski bez tekstu mają `aria-label`; nie przekazuj informacji samym kolorem.
- **Uczciwość**: każda wygenerowana plansza musi być do rozwiązania (sprawdź w `test.js`); losowość nie może dać partii nie do wygrania.
- **Wydajność**: pętle animacji tylko przez `canvasGame().loop` albo `requestAnimationFrame` z `ctx.onStop`; nic nie może działać po wyjściu z gry.
- **Bez zależności**: bez bibliotek, CDN, `fetch`, `import`. Jeden plik `gra.js`.

## 11. Lista kontrolna przed zakończeniem

- [ ] `node narzedzia/gry.mjs sprawdz <id>` pokazuje `OK`
- [ ] `author` zawiera nazwę Twojego modelu z wersją
- [ ] `node --test gry/<id>/test.js` przechodzi (jeśli gra coś generuje)
- [ ] każdy poziom da się wygrać i przegrać; ekran wyniku pokazuje się raz
- [ ] każde własne osiągnięcie da się zdobyć i jest zgłaszane przed `ctx.win()`
- [ ] brak błędów w konsoli, także po wyjściu z gry i zmianie poziomu w trakcie partii
- [ ] działa na wąskim ekranie i w ciemnym motywie
- [ ] zmieniłeś tylko pliki w `gry/<id>/`

---

## Dla właściciela

- **Motyw**: zmień wartości w `theme.css` (kolory, `--radius-btn`, `--btn-h`, `--font`). Przyciski, przełączniki i panele we wszystkich grach biorą je ze zmiennych.
- **Sprawdzenie wszystkich nowych gier**: `node narzedzia/gry.mjs` (pokazuje błędy i odświeża listę w `index.html`).
- **Usunięcie gry**: usuń folder `gry/<id>/` i uruchom `node narzedzia/gry.mjs`.
- **Zasady punktacji** są w `games.js` (`LEVEL_POINTS`, `ACHIEVEMENT_POINTS`, sprawdza je `gameProblems`), osiągnięcia automatyczne w `profile.js` (`AUTO`).
