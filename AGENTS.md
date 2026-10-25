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
| `zestaw.js`, `zestaw.css` | wspólny zestaw elementów gier (punkt 9 i 10) |
| `theme.css`, `style.css`, `games.css`, `games-more.css` | motyw i wspólne style |
| `games/*` | starsze gry |
| `gry/<cudze-id>/`, `gry/_szablon/` | gry innych modeli i szablon |
| `AGENTS.md`, `narzedzia/*` | ta instrukcja i narzędzie |

Jeśli do Twojej gry potrzebna jest zmiana platformy (nowa funkcja pomocnicza, nowa ikona, nowy dźwięk), **nie rób jej**.
Obejdź to w swoim folderze, a prośbę opisz w `gry/<id>/UWAGI.md`; właściciel zdecyduje.
Jeżeli funkcja przyda się tylko Tobie, po prostu napisz ją w swoim `gra.js`.

## 2. Kroki

Gry nie mogą się powtarzać. Kilka modeli dodaje gry równocześnie, więc **najpierw rezerwujesz pomysł, dopiero potem piszesz kod**.

**Krok 1. Przejrzyj wszystkie gry** (gotowe, w budowie u innych modeli i zarezerwowane):
```sh
node narzedzia/gry.mjs lista
```
Wybierz grę, której mechaniki jeszcze nie ma. Inna nazwa albo inna grafika to nie jest inna gra: „Spadające bloki” to wciąż Klocki,
„Krążki” to wciąż Wieża Hanoi. Jeśli Twój pomysł jest podobny do czegoś z listy, wybierz inny.

**Krok 2. Zarezerwuj grę, od razu, przed pisaniem kodu:**
```sh
node narzedzia/gry.mjs nowa <id> "Nazwa gry" "Opis w jednym-dwóch zdaniach: co robi gracz"
```
Narzędzie tworzy `gry/<id>/` z szablonu i plik `pomysl.md`. Odrzuca zajęte id, zajętą nazwę i opis zbyt podobny do istniejącej gry.
Ostrzeżenie o podobieństwie omijasz flagą `--inna` tylko wtedy, gdy mechanika jest naprawdę inna; różnicę opisz wtedy w `pomysl.md`.
Gdy rezerwacja się nie uda, wróć do kroku 1 i wybierz inny pomysł. Nie zmieniaj ani nie usuwaj cudzych rezerwacji.

**Krok 3. Od razu uzupełnij `gry/<id>/pomysl.md`:** autor (Twój model z wersją), kategoria i 2–6 zasad gry (co robi gracz,
kiedy wygrywa i przegrywa, czym różnią się poziomy). Dopiero wtedy inne modele widzą w `lista`, na czym polega Twoja gra.
Napisz w odpowiedzi jedno zdanie: „Zarezerwowano: <Nazwa> (<id>)”. Po nim właściciel może uruchomić kolejny model.

**Krok 4. Napisz grę i sprawdź ją:**
```sh
# ... przerabiasz gry/<id>/gra.js i gry/<id>/gra.css na swoją grę ...
node narzedzia/gry.mjs sprawdz <id>     # musi pokazać "OK"; dopiero wtedy gra pojawia się na stronie
node --test gry/<id>/test.js            # test logiki gry (jeśli gra coś generuje albo liczy)
node narzedzia/podglad.mjs <id>         # zrzuty ekranu i sprawdzenie wyświetlania (musi być bez "BŁĄD")
```
`podglad` otwiera grę w Edge/Chrome bez okna, na każdym poziomie, na szerokim ekranie i telefonie (360 px), w jasnym i ciemnym motywie.
Zgłasza planszę bez rozmiaru albo wystającą poza ekran, przewijanie strony w bok, elementy wystające poza planszę, przyciski bez opisu,
za małe pola, za dużo bloków panelu i błędy w konsoli (także po wyjściu z gry). Wypisuje folder ze zrzutami: **obejrzyj je**,
jeśli umiesz czytać obrazy, i porównaj z pokazem zestawu (`node narzedzia/podglad.mjs zestaw`). Uwagi (`~`) popraw, chyba że masz dobry powód.
Nazwa w `gra.js` musi być taka sama jak w `pomysl.md`. Jeśli w trakcie zmienisz zasady, popraw je też w `pomysl.md`.

Potem otwórz `index.html#/gra/<id>` w przeglądarce, zagraj na każdym poziomie do wygranej i do przegranej, sprawdź konsolę (zero błędów),
wąski ekran (360 px) i ciemny motyw systemu. Gra jest gotowa dopiero, gdy `sprawdz` pokazuje `OK` i da się ją wygrać na każdym poziomie.

Narzędzie odświeża listę gier w `index.html` na podstawie folderów w `gry/`, więc kilka modeli może je uruchamiać jednocześnie:
każde uruchomienie zapisuje pełną listę. Na stronę trafiają tylko gry, które przechodzą sprawdzenie, więc cudze niedokończone
gry nie przeszkadzają. Nie dopisuj gry do `index.html` ręcznie.

## 3. Folder gry

```
gry/<id>/
  pomysl.md  wymagany: rezerwacja (nazwa, opis, autor, kategoria, zasady); tworzy go narzędzie
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
| `endless` | opcjonalny tryb bez końca (punkt 5): obiekt z parametrami trybu, np. `{ unit: "m", speed: 12 }`; pomiń, jeśli gra się do niego nie nadaje |
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

### Tryb bez końca (opcjonalny)

Gra, w której da się grać bez końca przy rosnącej trudności (zręcznościowe, kolejne plansze, fale przeciwników), może dodać pole `endless`.
Przełącznik poziomów dostaje wtedy czwartą pozycję „∞”. W tym trybie `ctx.level` to `{ key: "endless", name: "Bez końca", points: 0, endless: true, ...endless }`.

- Trudność rośnie płynnie od poziomu łatwego do wyraźnie trudniejszego niż trzeci, tak by dobry gracz kończył bieg po kilku–kilkunastu minutach.
- Bieg kończysz **tylko** przez `ctx.over(wynik, punkty, tekst)`, nie przez `ctx.win` ani `ctx.lose`. `wynik` to liczba gry (metry, poziomy, punkty stołu;
  większa = lepsza; jednostka w `endless.unit`: `"m"` albo odmiana `["plansza", "plansze", "plansz"]`), z niej platforma zapisuje rekord. `punkty` to punkty profilu za bieg, liczone przez grę z wyniku.
- Punkty mają odpowiadać temu, ile gracz zdobyłby w tym czasie na poziomach: bieg na miarę łatwego poziomu ≈ 10, średniego ≈ 25, trudnego ≈ 50,
  dalej rosną z każdym etapem coraz szybciej. Platforma obcina punkty do `ENDLESS_CAP` × punkty trudnego poziomu (150, w grach `big` 300).
  Za bieg krótszy niż łatwy poziom daj 0–5. Pokazuj w panelu, ile punktów bieg jest już wart (np. `statsBlock` z wierszem „Za bieg”).
- Gdy bieg może trwać bez ryzyka (łamigłówki), daj limit (czas, ruchy, życia uzupełniane za etapy) albo przycisk „Zakończ bieg” (`btn-ghost`).
- Osiągnięcia trybu bez końca zgłaszasz jak zwykle przez `ctx.achieve` (przed `ctx.over`, żeby były na ekranie wyniku).

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
| `ctx.over(wynik, punkty, tekst?)` | koniec biegu w trybie bez końca (punkt 5); tylko gdy `ctx.level.endless` |
| `ctx.done` | `true` po wygranej/przegranej; wtedy ignoruj ruchy gracza |
| `ctx.achieve(id)` | zdobycie własnego osiągnięcia; `id` zawsze jako dosłowny napis, np. `ctx.achieve("bez-bledu")` |
| `ctx.time` | sekundy od początku partii (do osiągnięć „w mniej niż…”) |
| `ctx.undos` | ile razy gracz cofnął ruch w tej partii (do osiągnięć „bez cofania”) |
| `ctx.progress(0..1)` | postęp partii na pasku pod nagłówkiem |
| `ctx.toast(tekst)` | krótki dymek na dole planszy |
| `ctx.undoable(przywróć)` | włącza „Cofnij”; zwraca `zapisz(stan)`, które wołasz przed każdym ruchem |
| `ctx.clearUndo()` | czyści historię „Cofnij”, np. przy nowej planszy w trybie bez końca |
| `ctx.on(cel, zdarzenie, fn)` | nasłuch, który platforma sama zdejmie po partii. Do `document` i `window` używaj tylko tego |
| `ctx.onStop(fn)` | sprzątanie po partii (`cancelAnimationFrame`, `clearInterval`) |

Nasłuchy na elementach wewnątrz `board` możesz dodawać zwykłym `addEventListener`, bo plansza znika z partią.

## 8. Gotowe funkcje (z `app.js`, `zestaw.js` i `lib.js`)

Najpierw szukaj tutaj. Gra zbudowana z tych samych klocków wygląda i działa jak reszta strony; własną wersję piszesz tylko wtedy,
gdy niczego tu nie ma (i wtedy z tokenów z punktu 10).

### Podstawy
| Funkcja | Do czego |
|---|---|
| `el(tag, klasa, tekst)` | tworzy element |
| `button(tekst, klasa, onClick)`, `iconButton(tekst, svgPath, klasa, onClick)` | przyciski |
| `segmented(etykieta, opcje, onPick)` | przełącznik; zwraca `{ el, set(k) }` |
| `replay(node, klasa)` | odtwarza animację od nowa: `"shake"` (błąd), `"tick"`, `"flash"`, `"ui-pop"`, `"ui-flip"`, `"ui-roll"`, `"ui-drop"` |
| `sweep(pola)` | fala światła przez pola (podpowiedź, ułożona linia) |
| `Sound.tap() .place(n) .erase() .flag() .line() .error()` | dźwięki (wygrana i przegrana grają same) |
| `rnd(n)`, `pick(tablica)`, `shuffle(tablica)`, `plural(n, "ruch", "ruchy", "ruchów")`, `fmt(sekundy)` | losowanie, odmiana, czas |

### Plansze (dokładnie jedna na grę, szczegóły w punkcie 9)
| Funkcja | Do czego |
|---|---|
| `gridCells(board, kol, wier, klasa, { gap, label })` | siatka pól-przycisków; zwraca tablicę pól |
| `canvasGame(board, ctx, W, H, { max, cls })` | płótno: `{ g, theme, text(...), at(e), loop(frame) }` |
| `svgBoard(board, W, H, { max, cls })` | rysunek SVG: `{ svg, add(tag, atrybuty, rodzic), at(e) }`; `svgEl(tag, atrybuty, rodzic)` tworzy element SVG |
| `fitBoard(board, kol, wier, { max, cls })` | własny układ z elementów HTML (karty, kości, pionki), mierzony w `var(--s)` |
| `selectionRing(board)` | płynna ramka zaznaczenia; zwraca `place(pole)` |

### Panel
| Funkcja | Do czego |
|---|---|
| `panelBlock(tytuł, ...dzieci)` | blok panelu z dowolną treścią (przyciski, przełącznik) |
| `statBlock(ctx, tytuł, { meter, small })` | jedna wartość: duża (najważniejsza liczba gry) albo `small`; `.set(tekst, ułamekPaska, dopisek)` |
| `statsBlock(ctx, tytuł, ["Punkty", "Ruchy"])` | 2–4 małe wartości w jednym bloku; `.set("Punkty", 12)` |
| `pipsBlock(ctx, tytuł, max, { icon })` | życia, rundy, ładunki jako znaczki: `icon` `"dot"`, `"heart"`, `"star"`, `"bolt"`; `.set(n, dopisek)` |
| `logBlock(ctx, tytuł, { max })` | dziennik zdarzeń (ruch komputera, wynik rundy); `.add(tekst, "ok" \| "bad" \| "warn")`, `.clear()` |
| `legendBlock(ctx, tytuł, [[kształt, barwa, opis]])` | legenda znaków planszy; kształt `circle`, `square`, `diamond`, `ring`, `line`; barwa z palety (`"p1"`, `"red"`) |
| `digitControls(ctx, max, { put, remaining })` | klawiatura cyfr z notatkami (jak w sudoku) |
| `touchPad(ctx, keys, lista)` | przyciski dotykowe trzymane jak klawisze (ikony `i-left`, `i-right`, `i-up`, `i-down`, `i-cw`, `i-ccw`) |

### Elementy planszy (wymiar z `var(--s)`, kolory z palety, działają w obu motywach)
| Funkcja | Element |
|---|---|
| `playingCard(ranga, kolor, { down, tag })`, `drawCard(karta, ranga, kolor, down)` | karta: ranga 1–13 (1 = as, 11 W, 12 D, 13 K), kolor `"s"` pik, `"h"` kier, `"d"` karo, `"c"` trefl; szerokość `--card-w` (domyślnie bok pola) |
| `die(wartość, { tag })`, `drawDie(kość, wartość, rzut)` | kość 1–6; `rzut = true` animuje; szerokość `--die-w` |
| `piece(kto, { mark, label })` | pionek: `1` gracz (`--p1`), `2` przeciwnik (`--p2`, z pierścieniem), albo barwa palety `"green"`; `mark` np. `"K"` dla damki; szerokość `--piece-w` (domyślnie 0,8 pola) |
| `letterTile(litera, punkty, { tag })` | płytka z literą; szerokość `--tile-w` |
| `letterKeys(ctx, onKey, { enter, back, rows })` | klawiatura liter z polskimi znakami, działa też fizyczna; `{ el, set(litera, "ok" \| "near" \| "miss") }`; `el` wstawiasz sam |

### Sterowanie
| Funkcja | Do czego |
|---|---|
| `cellKeys(ctx, { cols, rows, get, set, max, onDigit, keys })` | strzałki po siatce, cyfry, własne klawisze |
| `heldKeys(ctx, onDown)` | klawisze trzymane (gry zręcznościowe) |
| `directionInput(ctx, obszar, onDir)` | kierunek z klawiatury i przesunięcia palcem |

Wszystkie elementy zobaczysz na żywo pod adresem `index.html#/zestaw` (trzy karty: Elementy, Siatka, Paleta) i na zrzutach
`node narzedzia/podglad.mjs zestaw`. Przykłady gier: `games/*.js` (np. `kret.js`: siatka i zręczność, `breakout.js`: płótno,
`sudoku.js`: cyfry). Czytaj, nie zmieniaj.

## 9. Plansza: jak ma się skalować

Plansza ma wypełniać dostępne miejsce na każdym ekranie, od telefonu 360 × 740 do monitora, bez przewijania. Platforma liczy bok pola
`--s` z miejsca na ekranie i z liczby pól planszy. Ty wybierasz **jedną** z czterech funkcji i mierzysz wszystko w `var(--s)`.

| Twoja plansza | Funkcja | Przykład |
|---|---|---|
| kratki, pola do klikania | `gridCells(board, kol, wier, "xx-grid")` | łamigłówki, saper, memory |
| ruch, fizyka, dużo obiektów | `canvasGame(board, ctx, W, H, { max, cls })` | zręcznościowe, akcja, symulacje |
| linie, okręgi, plansza z punktami i połączeniami | `svgBoard(board, W, H, { max, cls })` | młynek, sieci, mapy, zegary |
| karty, kości, pionki, własny układ HTML | `fitBoard(board, kol, wier, { max, cls })` | gry karciane, kościane, mankala |

- **`fitBoard`**: plansza to prostokąt `kol × wier` pól o boku `var(--s)`. Wszystko w środku (szerokość, wysokość, odstęp, czcionka,
  zaokrąglenie, cień) podajesz jako `calc(var(--s) * 0.8)`. Licz pola z marginesem: 5 kart po 1 polu z odstępem 0,2 to `fitBoard(board, 6.2, ...)`.
- **`canvasGame` i `svgBoard`**: rysujesz we własnych jednostkach `W × H` (np. 100 × 70); proporcja `W : H` to kształt planszy.
  `max` to największy bok jednej z 10 kolumn w px, więc plansza ma najwyżej `10 × max` px szerokości. Dobre proporcje: 4 : 3, 16 : 10, 1 : 1,
  pionowe 3 : 4 dla gier, w których coś spada. Przy grubszych liniach i napisach nie zmniejszaj ich poniżej 2,5 jednostki na 100.
- `max` (px na pole): łamigłówki 56–72, plansze i karty 80–96, płótno 80–100. Za mały `max` daje malutką planszę na monitorze.
- **Nie wolno**: `width`/`height` w px ani w `%` na planszy i jej elementach, `vw`/`vh`, własne `ResizeObserver` do skalowania,
  styl na samym `[data-gra="<id>"]` poza zmiennymi (to obszar planszy *i* panelu; narzędzie to odrzuca). Wyjątek: obramowania i cienie 1–3 px.
- Na telefonie panel jest pod planszą i zajmuje najwyżej 40% ekranu, bloki `statBlock(..., { small: true })` i `pipsBlock` stają po dwa w rzędzie.
  Nie ukrywaj niczego ważnego tylko w panelu, jeśli gracz musi to widzieć podczas ruchu: pokaż to na planszy.
- Pola do klikania mają co najmniej 20 px na telefonie (siatka 15 × 15 to granica). Większą planszę podziel albo przybliżaj.

## 10. Styl: jeden wygląd dla wszystkich gier

Wszystkie gry mają wyglądać jak jedna strona, nawet gdy pisze je wiele różnych modeli. Wygląd strony jest w `theme.css` (tokeny)
i `zestaw.css` (elementy). Właściciel zmienia motyw w jednym miejscu, a Twoja gra dostosowuje się sama, jeśli używa tokenów.

### Tokeny: używaj tylko ich
| Grupa | Zmienne |
|---|---|
| interfejs | `--text`, `--muted` (tekst drugorzędny), `--line` (linie, obramowania), `--surface` (pola, karty), `--bg` (tło, puste miejsca), `--shadow` |
| kolor gry | `--c` (Twój `color`) i `--on` (tekst na nim, Twój `ink`): zaznaczenie, główny akcent, Twoje pionki w grach jednoosobowych |
| paleta | `--red`, `--orange`, `--yellow`, `--green`, `--teal`, `--blue`, `--violet`, `--pink`, `--brown`, `--gray` (w ciemnym motywie same jaśnieją) |
| znaczenia | `--ok` (dobrze), `--bad` (błąd), `--warn` (uwaga), `--gold` (nagroda, gwiazdka), `--danger` (strata) |
| gracze | `--p1` gracz (niebieski), `--p2` przeciwnik (pomarańczowy); para, którą rozróżnia też daltonista |
| czcionka | `--font`; rozmiary w panelu `--fs-xs`, `--fs-sm`, `--fs`, `--fs-lg`, `--fs-xl`; na planszy `calc(var(--s) * 0.45)` |
| odstępy | `--sp-1` 4 px, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 24 (w panelu); na planszy ułamki `var(--s)` |
| kształt | `--radius` (duże bloki), `--radius-sm`; pole: `calc(var(--s) * 0.2)` |
| cień | `--elev-1` (leży), `--elev-2` (uniesione, zaznaczone), `--elev-3` (cała plansza) |
| ruch | `--ease`, `--ease-pop` (z lekkim odbiciem), `--dur` (180 ms) |

Odcienie: `color-mix(in srgb, var(--c) 30%, var(--surface))`. Własne barwy (np. 6 rodzajów klejnotów) bierz z palety;
dopiero gdy jej nie starcza, zdefiniuj `--<id>-...` na `[data-gra="<id>"]`, także w wersji ciemnej (`@media (prefers-color-scheme: dark)`).

### Sceny: tło planszy
Klasa w `cls` funkcji planszy (albo `board.classList.add(...)`). Sceny ustawiają też czytelne `--text`, `--line` i `--surface` na sobie.
| Klasa | Kiedy |
|---|---|
| (brak) | domyślnie: pola `--surface` na tle strony; łamigłówki, gry logiczne |
| `paper` | kratka jak w zeszycie: gry na papierze, rysowanie, kropki |
| `wood` | drewniana plansza: gry planszowe, mankala, tryktrak, młynek |
| `felt` | zielony stół: gry karciane i kościane |
| `slate` | ciemna tablica: gry ze szkicami, kredą, schematami |
| `space`, `arcade`, `neon` | ciemne sceny płótna: kosmos, automaty, neon |

### Stany pól: to samo znaczenie w każdej grze
Dodawaj te klasy do pól z `gridCells` i do elementów z zestawu, zamiast wymyślać własne kolory:
`is-sel` zaznaczone, `is-on` włączone/zamalowane (kolor gry), `is-ok` dobrze, `is-bad` błąd (paski, nie sam kolor), `is-hint` podpowiedź
(pulsuje dwa razy), `is-lock` dane od początku (nie do zmiany), `is-dim` nieaktywne. Kursor klawiatury: `cursor`. Zobacz kartę „Siatka” w `#/zestaw`.

### Płótno (`canvasGame`)
- Kolory tylko z `theme`: `theme.text`, `theme.muted`, `theme.line`, `theme.surface`, `theme.bg`, `theme.c`, `theme.on`, cała paleta
  (`theme.red` ... `theme.gray`), `theme.ok`, `theme.bad`, `theme.warn`, `theme.gold`, `theme.p1`, `theme.p2`. Czytaj je w każdej klatce
  (zmieniają się z motywem), nie kopiuj do stałych na starcie.
- Napisy przez `cv.text("12", x, y, { size: 5, weight: 700, color: "muted", align: "left" })` (czcionka strony). Nie ustawiaj `g.font` sam.
- Wynik, życia i czas pokazuj w panelu (`statsBlock`, `pipsBlock`), nie rysuj ich na płótnie. Na płótnie tylko to, co należy do świata gry.
- Scena: `cls: "space" | "arcade" | "neon"` dla ciemnych światów, `"paper" | "wood" | "felt" | "slate"` dla stołu; bez sceny płótno ma tło `--surface`.

### Panel
- Kolejność: stan (najważniejsza liczba w `statBlock` z dużą wartością, potem `statsBlock`/`pipsBlock`), potem narzędzia i przyciski.
- Najwyżej 4 własne bloki. Kilka małych liczb łącz w jeden `statsBlock` zamiast osobnych bloków.
- Jeden przycisk `btn` (główna akcja), reszta `btn-ghost`; wszystkie z `wide`, gdy stoją same w bloku. Rząd przycisków: `el("div", "panel-row")`.
- Tytuły bloków: rzeczownik, 1–2 słowa („Ruchy”, „Twoja ręka”), bez dwukropka.

### `gra.css`
- Każdy selektor zaczyna się od `[data-gra="<id>"]`. Nazwy klas z krótkim prefiksem gry, np. `.dz-pole`.
- Kolory tylko z tokenów. Rozmiary na planszy tylko z `var(--s)`. Czcionka `var(--font)`.
- **Nie zmieniaj wyglądu** `.btn`, `.btn-ghost`, `.seg`, `.panel-*`, `.result-*`, `.toast`, nagłówka, nawigacji ani elementów zestawu (`.ui-*`).
  Elementy zestawu możesz ustawiać (położenie) i zmieniać im rozmiar przez `--card-w`, `--die-w`, `--piece-w`, `--tile-w`.
- Animacje: nazwy `@keyframes <id>-...`, czas 150–400 ms, krzywe `var(--ease)` albo `var(--ease-pop)`; wyłącz je
  w `@media (prefers-reduced-motion: reduce)`.
- Ciemny motyw działa sam, jeśli używasz tokenów. Sprawdź go na zrzutach z `podglad`.

### Tekst
- Po polsku, spokojnie, bez wykrzykników i emoji. Liczby z jednostką: „3 z 5”, „12 pkt”, „0:45”.
- `ctx.toast` na krótkie zdarzenia (1 zdanie, do 50 znaków), `logBlock` na historię, `ctx.lose(tytuł, tekst)` z konkretnym powodem.

## 11. Jakość

- **Sterowanie**: mysz, dotyk i klawiatura. Gra musi dać się przejść na telefonie (360 px szerokości).
- **Dostępność**: pola i przyciski bez tekstu mają `aria-label`; nie przekazuj informacji samym kolorem (dodaj kształt, znak albo tekst).
- **Uczciwość**: każda wygenerowana plansza musi być do rozwiązania (sprawdź w `test.js`); losowość nie może dać partii nie do wygrania.
- **Wydajność**: pętle animacji tylko przez `canvasGame().loop` albo `requestAnimationFrame` z `ctx.onStop`; nic nie może działać po wyjściu z gry.
- **Bez zależności**: bez bibliotek, CDN, `fetch`, `import`. Jeden plik `gra.js`.
- **Komentarze** po polsku, krótko, tylko gdy kod nie mówi sam za siebie.

## 12. Lista kontrolna przed zakończeniem

- [ ] gra była zarezerwowana przez `nowa`, zanim powstał kod, a `pomysl.md` ma aktualne zasady
- [ ] `node narzedzia/gry.mjs sprawdz <id>` pokazuje `OK` (bez uwag `~`, chyba że masz dobry powód)
- [ ] `node narzedzia/podglad.mjs <id>` nie pokazuje `BŁĄD`, a zrzuty wyglądają jak reszta strony (porównaj z `podglad zestaw`)
- [ ] plansza z `gridCells`, `canvasGame`, `svgBoard` albo `fitBoard`; wymiary w `var(--s)`; kolory z tokenów i palety
- [ ] użyłeś gotowych elementów z punktu 8 wszędzie, gdzie pasują (karty, kości, pionki, bloki panelu, stany `is-*`)
- [ ] `author` zawiera nazwę Twojego modelu z wersją
- [ ] `node --test gry/<id>/test.js` przechodzi (jeśli gra coś generuje)
- [ ] każdy poziom da się wygrać i przegrać; ekran wyniku pokazuje się raz
- [ ] każde własne osiągnięcie da się zdobyć i jest zgłaszane przed `ctx.win()`
- [ ] zmieniłeś tylko pliki w `gry/<id>/`
---

## Dla właściciela

- **Motyw**: zmień wartości w `theme.css` (kolory, `--radius-btn`, `--btn-h`, `--font`). Przyciski, przełączniki i panele we wszystkich grach biorą je ze zmiennych.
- **Sprawdzenie wszystkich nowych gier**: `node narzedzia/gry.mjs` (pokazuje błędy i odświeża listę w `index.html`).
- **Wygląd gier**: `node narzedzia/podglad.mjs <id> [<id>...]` (zrzuty i usterki wyświetlania); pokaz zestawu: `index.html#/zestaw`.
- **Nowy element wspólny**: funkcja w `zestaw.js`, wygląd w `zestaw.css` (z tokenów), wpis w punkcie 8 i przykład w pokazie (`KIT_DEMO`).
- **Usunięcie gry albo porzuconej rezerwacji**: usuń folder `gry/<id>/` i uruchom `node narzedzia/gry.mjs`.
- **Kilka modeli naraz**: uruchom pierwszy, a następny dopiero wtedy, gdy poprzedni napisze „Zarezerwowano: …”
  (albo gdy `node narzedzia/gry.mjs lista` pokazuje jego grę z zasadami). Wtedy kolejny model widzi zajęty pomysł i wybierze inny.
- **Co jest w budowie**: `node narzedzia/gry.mjs lista` (statusy: gotowa, w budowie, zarezerwowana).
- **Zasady punktacji** są w `games.js` (`LEVEL_POINTS`, `ACHIEVEMENT_POINTS`, sprawdza je `gameProblems`), osiągnięcia automatyczne w `profile.js` (`AUTO`).
