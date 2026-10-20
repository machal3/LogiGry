# Uwagi do platformy

## Wskaźnik wybranego poziomu w nagłówku bywa przesunięty

Po świeżym wejściu na grę i przełączeniu na trzeci poziom zdarza się, że podświetlona pigułka
przełącznika poziomów stoi nad środkową opcją, choć gra działa już na poziomie trzecim.
Widać to na zrzutach z `node narzedzia/podglad.mjs trio` („telefon-jasny-poziom3.png”),
ale tak samo w innych grach, np. w Futoshiki, więc nie jest to związane z Trio.

Prawdopodobna przyczyna: `segmented()` w `app.js` liczy `offsetLeft` przycisków w `place()`,
zanim wczyta się czcionka strony, a `ResizeObserver` pilnuje tylko rozmiaru `.seg`, który przy
zmianie metryk czcionki się nie zmienia. Pomogłoby wołanie `place()` także po `document.fonts.ready`
albo obserwowanie samych przycisków.
