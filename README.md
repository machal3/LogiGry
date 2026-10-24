# Logigra

Ponad 120 gier w przeglądarce: logiczne, łamigłówki, słowne, zręcznościowe, akcja, planszowe,
strategiczne, symulacje i przygodowe. Czysty HTML, CSS i JavaScript: bez frameworków, bez budowania,
bez zależności i bez instalacji. Otwierasz `index.html` i grasz.

Gry powstają w jednym repozytorium, często równolegle, dlatego każda nowa gra mieszka we własnym
folderze `gry/<id>/` i nie dotyka plików platformy. Zasady pracy opisuje [AGENTS.md](AGENTS.md).

## Uruchomienie

```sh
# wystarczy otworzyć plik w przeglądarce
index.html
```

Strona działa z dysku (`file://`). Jeśli wolisz serwer HTTP:

```sh
npx serve .
# albo
python -m http.server 8000
```

Adresy:

- `index.html` — lista gier, wyszukiwanie, kategorie, profil i punkty
- `index.html#/gra/<id>` — bezpośredni link do gry, np. `index.html#/gra/sudoku`
- `index.html#/osiagniecia` — zdobyte osiągnięcia
- `index.html#/zestaw` — pokaz wspólnych elementów (siatki, karty, kości, pionki, kolory)

## Co jest w repozytorium

| Plik / folder | Rola |
|---|---|
| `index.html` | strona, nawigacja i lista skryptów (listę gier uzupełnia narzędzie) |
| `app.js` | silnik platformy: widok gry, panel, wynik, dźwięk, plansze i elementy |
| `games.js` | rejestr starszych gier i kategorie |
| `profile.js` | profil gracza, punkty, rekordy i osiągnięcia (`localStorage`) |
| `lib.js` | wspólne losowanie (`rnd`, `pick`, `shuffle`) |
| `zestaw.js`, `zestaw.css` | wspólny zestaw elementów: karty, kości, pionki, bloki panelu |
| `theme.css` | tokeny motywu (kolory, odstępy, kształty, ruch); jasny i ciemny |
| `style.css`, `games.css`, `games-more.css` | wygląd strony i starszych gier |
| `games/` | starsze gry w jednym pliku (`games/sudoku.js` itd.) |
| `gry/` | nowe gry, każda w swoim folderze (`gry/<id>/gra.js`) |
| `gry/_szablon/` | wzór nowej gry („Dziesiątka”) |
| `narzedzia/` | narzędzia: rezerwacja i sprawdzanie gier, podgląd w przeglądarce |
| `tests/` | testy logiki w node i testy end-to-end w przeglądarce |

## Jak dodać grę

Pełna instrukcja jest w [AGENTS.md](AGENTS.md). W skrócie:

```sh
# 1. zobacz, jakie gry już są (nowa gra musi mieć inną mechanikę, nie tylko nazwę)
node narzedzia/gry.mjs lista

# 2. zarezerwuj pomysł, zanim napiszesz kod
node narzedzia/gry.mjs nowa <id> "Nazwa gry" "Opis w jednym-dwóch zdaniach"

# 3. uzupełnij gry/<id>/pomysl.md (autor, kategoria, zasady)

# 4. napisz gry/<id>/gra.js i gra.css, potem sprawdź
node narzedzia/gry.mjs sprawdz <id>
node --test gry/<id>/test.js
node narzedzia/podglad.mjs <id>
```

Folder gry:

```
gry/<id>/
  pomysl.md   rezerwacja: nazwa, opis, autor, kategoria, zasady
  gra.js      cała logika w jednym bloku { ... }, na końcu registerGame({...})
  gra.css     style planszy, każdy selektor od [data-gra="<id>"]
  test.js     test logiki w node (zalecany)
  UWAGI.md    prośby do właściciela platformy (opcjonalny)
```

Wymagania w skrócie:

- `registerGame({ id, cat, name, author, desc, color, ink, glyph, levels, rules, achievements, mount })`
- dokładnie 3 poziomy (łatwy, średni, trudny) z różną trudnością
- jedna plansza z `gridCells`, `canvasGame`, `svgBoard` albo `fitBoard`; wymiary w `var(--s)`
- kolory wyłącznie z tokenów motywu (`--c`, `--surface`, `--text`, paleta, `--ok`/`--bad`/`--warn`)
- panel: najwyżej 4 własne bloki, przyciski przez `button(...)`, nie własne `<button>`
- mysz, dotyk i klawiatura; telefon od 360 px; pola min. 20 px
- punkty i zapis gracza robi platforma; gra tylko woła `ctx.win()`, `ctx.lose()` i `ctx.achieve(id)`

Nie edytuj plików platformy (`index.html`, `app.js`, `games.js`, `theme.css`, `games/*` itd.) ani cudzych
folderów w `gry/`. Listę gier w `index.html` narzędzie odświeża samo.

## Narzędzia

| Polecenie | Co robi |
|---|---|
| `node narzedzia/gry.mjs lista` | wszystkie gry: gotowe, w budowie i zarezerwowane |
| `node narzedzia/gry.mjs nowa <id> "Nazwa" "Opis"` | rezerwuje grę i tworzy `gry/<id>/` z szablonu |
| `node narzedzia/gry.mjs sprawdz <id>` | sprawdza jedną grę i odświeża listę w `index.html` |
| `node narzedzia/gry.mjs` | sprawdza wszystkie gry i odświeża listę w `index.html` |
| `node narzedzia/podglad.mjs <id> [<id>...]` | zrzuty ekranu i kontrola układu: poziomy, 1280 i 360 px, jasny i ciemny motyw |
| `node narzedzia/podglad.mjs zestaw` | pokaz wspólnych elementów platformy |

Wymagania: Node 18+ dla `gry.mjs`, Node 22+ dla `podglad.mjs` i testów e2e (używają wbudowanego `fetch`
i `WebSocket`). Do podglądu i e2e potrzebny jest Edge albo Chrome (ścieżkę można podać w zmiennej `BROWSER`).

## Testy

```sh
node --test tests/*.test.js   # logika starszych gier (sudoku, szachy, saper i inne)
node --test gry/<id>/test.js  # logika wybranej nowej gry
node tests/e2e.mjs            # każda gra, każdy poziom, rozwiązywana kliknięciami w przeglądarce
```

Test e2e uruchamia przeglądarkę bez okna, przechodzi wszystkie gry i zgłasza błędy konsoli.
Można podać folder na zrzuty: `node tests/e2e.mjs zrzuty`.

## Punktacja

Punkty dolicza wyłącznie platforma:

| Poziom | Zwykła gra | Gra rozbudowana (`big: true`) |
|---|---|---|
| łatwy | 10 | 20 |
| średni | 25 | 50 |
| trudny | 50 | 100 |

Każda gra ma też cztery osiągnięcia automatyczne (pierwsza wygrana, najtrudniejszy poziom, komplet
poziomów, 10 wygranych) oraz 3–8 własnych, zdobywanych przez `ctx.achieve(...)`. Profil, punkty
i rekordy zapisują się w `localStorage` przeglądarki (`logigra.profile.v1`).

## Wygląd

Wszystkie gry wyglądają jak jedna strona, bo korzystają ze wspólnych tokenów i elementów:

- kolory i odstępy z `theme.css` (`--c`, `--surface`, `--line`, `--text`, paleta, `--p1`/`--p2`)
- karty, kości, pionki, płytki liter i bloki panelu z `zestaw.js`
- sceny planszy: bez sceny, `paper`, `wood`, `felt`, `slate`, `space`, `arcade`, `neon`
- stany pól: `is-sel`, `is-on`, `is-ok`, `is-bad`, `is-hint`, `is-lock`, `is-dim`
- ciemny motyw działa sam, jeśli gra używa tokenów

Motyw zmienia się w jednym miejscu (`theme.css`), a gry dostosowują się same.

## Licencja

Brak formalnej licencji. Wszystkie teksty i grafika powstają w kodzie (CSS, SVG, `<canvas>`).
