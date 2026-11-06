# Tetris

- id: tetris
- opis: Klasyczna gra układanka, w której układasz spadające klocki (tetromino) i wypełniasz wiersze. Tryb klasyczny z poziomami oraz tryb bez końca z rosnącą trudnością.
- autor: Mistral Vibe
- kategoria: zrecznosciowe

## Zasady
1. **Ruch klocków**: Spadające klocki (tetromino) układasz na planszy 10×20, przesuwając je strzałkami lewo/prawo, obracając strzałką w górę (albo Z/X)
2. **Celem**: Wypełniaj wiersze, aby je usunąć i zdobywać punkty
3. **Wygrana**: W trybie klasycznym - wypełnij wymaganą liczbę wierszy (10/20/30 w zależności od poziomu)
4. **Przegrana**: Gra kończy się, gdy nowy klocek nie zmieści się na planszy
5. **Tryb bez końca**: Gra trwa bez końca, prędkość rośnie co 10 wierszy, zbieraj punkty za usunięte wiersze
6. **Soft drop**: Przytrzymanie strzałki w dół (lub S) przyspiesza opadanie klocka
7. **Hard drop**: Spacja natychmiast opuszcza klocek na dół

## Mechaniki specjalne
- **Wall kicks**: Klocki mogą przesuwać się przy ścianie podczas obrotu
- **DAS (Delayed Auto Shift)**: Przesuwanie klocków w bok powtarza się automatycznie po krótkim opóźnieniu
- **Podgląd następnego klocka**: Zawsze wiesz, jaki klocek spadnie następnie
- **Cień klocka**: Pokazuje, gdzie klocek wyląduje przy hard drop

## Poziomy trudności
- **Łatwy**: 10 wierszy do usunięcia, opadanie co 800ms
- **Średni**: 20 wierszy do usunięcia, opadanie co 500ms
- **Trudny**: 30 wierszy do usunięcia, opadanie co 300ms
- **Bez końca**: Prędkość rośnie stopniowo, cel: jak najwięcej wierszy

## Czym różni się od podobnych gier
Tetris to klasyczna układanka z 7 typami klocków (I, J, L, O, S, T, Z). Różni się od:
- **Klocków** (Breakout) - tutaj układasz, nie odbijasz piłki
- **Wieży Hanoi** - inna mechanika układania
- **Memory** - nie chodzi o zapamiętywanie, ale o szybkie myślenie przestrzenne
- **Saper** - nie ma losowego układu, gra jest deterministyczna w każdym ruchu
