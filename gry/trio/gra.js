// Trio: na stole leży dwanaście kart, a każda ma trzy lub cztery cechy.
// Trzy karty tworzą trójkę, gdy w każdej cesze są wszystkie takie same albo wszystkie różne.
{
  // --- Logika bez DOM: da się ją sprawdzić w node (test.js) ---
  //
  // Karta to jedna liczba: cyfra jedności to liczba kształtów, dalej (po 3 wartości) kształt,
  // kolor i wypełnienie. Wartości cech to 0, 1, 2.
  const VALS = 3;

  const cardId = (count, shape, color, fill) => count + VALS * (shape + VALS * (color + VALS * fill));
  const feature = (id, k) => Math.floor(id / VALS ** k) % VALS;
  const allCards = (nf) => Array.from({ length: VALS ** nf }, (_, i) => i);

  // Trójka: w każdej cesze trzy wartości są w jednej wersji albo w trzech różnych.
  // Równoważnie: suma wartości każdej cechy dzieli się przez 3 (test.js sprawdza oba warunki).
  function isSet(a, b, c, nf) {
    for (let k = 0; k < nf; k++) {
      const x = feature(a, k), y = feature(b, k), z = feature(c, k);
      const same = x === y && y === z;
      const diff = x !== y && y !== z && x !== z;
      if (!same && !diff) return false;
    }
    return true;
  }

  // Ile cech jest wspólnych dla trzech kart (przy zgodnej trójce: 0 znaczy „wszystkie różne”).
  function sameFeatures(a, b, c, nf) {
    let n = 0;
    for (let k = 0; k < nf; k++) if (feature(a, k) === feature(b, k) && feature(b, k) === feature(c, k)) n++;
    return n;
  }

  // Pierwsza zgodna trójka na stole jako indeksy pól (albo null, gdy stołu nie da się już użyć).
  function findSet(cards, nf) {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        for (let k = j + 1; k < cards.length; k++) {
          if (isSet(cards[i], cards[j], cards[k], nf)) return [i, j, k];
        }
      }
    }
    return null;
  }

  const hasSet = (cards, nf) => !!findSet(cards, nf);

  // Trzy karty, które zawsze tworzą trójkę; awaryjny rdzeń nowego stołu.
  const setSeed = () => [cardId(0, 0, 0, 0), cardId(1, 0, 0, 0), cardId(2, 0, 0, 0)];

  // Losowe karty bez powtórzeń.
  function deal(nf, count) {
    return shuffle(allCards(nf).slice()).slice(0, count);
  }

  // Stół, na którym zawsze jest co najmniej jedna trójka.
  function dealWithSet(nf, count) {
    for (let t = 0; t < 60; t++) {
      const cards = deal(nf, count);
      if (cards.length === count && hasSet(cards, nf)) return cards;
    }
    const seed = setSeed();
    const rest = deal(nf, count + seed.length).filter((c) => !seed.includes(c));
    return shuffle([...seed, ...rest.slice(0, count - seed.length)]);
  }

  // Uzupełnia puste pola (null) nowymi kartami. Gdy na stole nie zostaje żadna trójka,
  // rozdaje cały stół od nowa, żeby partii nie dało się zablokować.
  function refill(cards, nf) {
    const used = new Set(cards.filter((c) => c != null));
    const out = cards.slice();
    for (let i = 0; i < out.length; i++) {
      if (out[i] != null) continue;
      const free = allCards(nf).filter((c) => !used.has(c));
      const c = free.length ? pick(free) : pick(allCards(nf)); // pula 27 kart nigdy się nie kończy, to tylko zabezpieczenie
      used.add(c);
      out[i] = c;
    }
    return hasSet(out, nf) ? out : dealWithSet(nf, out.length);
  }

  if (typeof module !== "undefined") module.exports = { cardId, feature, allCards, isSet, sameFeatures, findSet, hasSet, setSeed, deal, dealWithSet, refill, VALS };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "trio",
    cat: "logiczne",
    name: "Trio",
    author: "DeepSeek V4.1 Flash",
    desc: "Zbieraj z planszy trójki kart, w których każda cecha jest u wszystkich taka sama albo u wszystkich inna.",
    color: "#2b6cb0",
    ink: "#ffffff",
    glyph: [".###.", "#...#", "#.#.#", "#...#", ".###."],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, nf: 3, slots: 12, target: 8, secs: 180, slips: 6 },
      { key: "medium", name: "Średni", points: 25, nf: 4, slots: 12, target: 12, secs: 240, slips: 5 },
      { key: "hard", name: "Trudny", points: 50, nf: 4, slots: 12, target: 16, secs: 240, slips: 4 },
    ],
    rules: [
      "Każda karta ma liczbę kształtów (1, 2 lub 3), kształt (koło, kwadrat, romb), kolor (czerwony, zielony, niebieski) i wypełnienie (pełne, w paski, puste).",
      "Na poziomie łatwym karty mają trzy cechy: wypełnienie nie występuje.",
      "Trzy karty tworzą trójkę, gdy w każdej cesze są wszystkie takie same albo wszystkie różne. Trójka znika, a na jej miejsce wchodzą nowe karty.",
      "Zbierz wymaganą liczbę trójek, zanim skończy się czas. Każdy błędny wybór to pomyłka, a limit pomyłek zależy od poziomu.",
      "Sterowanie: klikasz karty myszą albo palcem, strzałki przesuwają kursor, spacja zaznacza kartę, Escape czyści wybór.",
    ],
    achievements: [
      { id: "szybki-start", name: "Szybki start", desc: "Zbierz trzy trójki w pierwszych 30 sekundach partii.", points: 10 },
      { id: "rozniaca", name: "Wszystko różne", desc: "Zbierz trójkę, w której żadna cecha nie jest wspólna.", points: 10 },
      { id: "blizniaki", name: "Prawie bliźniaki", desc: "Zbierz trójkę, której karty różnią się tylko jedną cechą.", points: 10 },
      { id: "bez-bledu", name: "Bez pomyłki", desc: "Wygraj partię, nie wybierając ani jednej błędnej trójki.", points: 25 },
      { id: "seria", name: "Seria szóstek", desc: "Zbierz sześć trójek z rzędu, bez pomyłki.", points: 25 },
      { id: "mistrz", name: "Mistrz tria", desc: "Wygraj trudny poziom bez pomyłki i bez podpowiedzi.", points: 50 },
    ],

    mount(board, ctx) {
      const { nf, slots, target, slips, key } = ctx.level;
      const COUNT_TEXT = ["1 kształt", "2 kształty", "3 kształty"];
      const SHAPE_TEXT = ["koło", "kwadrat", "romb"];
      const COLOR_TEXT = ["czerwony", "zielony", "niebieski"];
      const FILL_TEXT = ["pełne", "w paski", "puste"];
      // Rozmiar kształtu na karcie zależy od tego, ile ich jest w rzędzie.
      const SHAPE_SIZE = [0.5, 0.33, 0.23];

      const s = { cards: dealWithSet(nf, slots), sel: [], found: 0, slips: 0, streak: 0, hinted: false, cursor: 0 };
      // czas bierzemy z zegara platformy, więc „Zostało” zgadza się z zegarem w nagłówku
      const left = () => Math.max(0, ctx.level.secs - ctx.time);

      const cols = 4, rows = slots / cols;
      const cards = gridCells(board, cols, rows, "tr", { gap: 0.14, label: (r, c) => `Karta ${r * cols + c + 1}` });

      // wnętrze karty: rząd kształtów w swojej liczbie, kształcie, kolorze i wypełnieniu
      function paint(btn, id) {
        const n = feature(id, 0), shape = feature(id, 1), color = feature(id, 2), fill = feature(id, 3);
        const row = el("span", "tr-row");
        for (let i = 0; i < n + 1; i++) {
          const sh = el("span", "tr-shape");
          sh.style.setProperty("--sh", SHAPE_SIZE[n]);
          sh.dataset.sh = shape;
          sh.dataset.co = color;
          if (nf > 3) sh.dataset.fi = fill;
          row.append(sh);
        }
        btn.replaceChildren(row);
        const opis = [COUNT_TEXT[n], SHAPE_TEXT[shape], COLOR_TEXT[color], nf > 3 ? FILL_TEXT[fill] : ""].filter(Boolean);
        btn.dataset.card = String(id);
        btn.setAttribute("aria-label", `${opis.join(", ")}`);
        btn.setAttribute("title", opis.join(", "));
      }

      const foundEl = statBlock(ctx, "Trójki", { meter: true });
      const partEl = statsBlock(ctx, "Partia", ["Pomyłki", "Seria"]);
      const clearBtn = button("Wyczyść wybór", "btn-ghost wide", clear);
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint), clearBtn));

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b) choose(+b.dataset.i);
      });
      cellKeys(ctx, {
        cols, rows,
        get: () => s.cursor,
        set: (i) => { s.cursor = i; render(); },
        keys: { " ": () => choose(s.cursor), escape: clear },
      });

      // Zaznaczanie: trzy karty sprawdzamy od razu, czwartej dołożyć nie można.
      function choose(i) {
        if (ctx.done) return;
        const k = s.sel.indexOf(i);
        if (k >= 0) {
          s.sel.splice(k, 1);
          Sound.tap();
          return render();
        }
        if (s.sel.length >= 3) return;
        s.cursor = i;
        s.sel.push(i);
        Sound.tap();
        if (s.sel.length === 3) check();
        else render();
      }

      function check() {
        const [a, b, c] = s.sel;
        if (isSet(s.cards[a], s.cards[b], s.cards[c], nf)) {
          const same = sameFeatures(s.cards[a], s.cards[b], s.cards[c], nf);
          if (!same) ctx.achieve("rozniaca");
          if (same === nf - 1) ctx.achieve("blizniaki");
          s.found++;
          s.streak++;
          if (s.streak >= 6) ctx.achieve("seria");
          if (s.found >= 3 && ctx.time < 30) ctx.achieve("szybki-start");
          Sound.line();
          // zgodne karty znikają, a na ich miejsce wchodzą nowe
          const before = s.cards.slice();
          const next = before.map((card, i) => (s.sel.includes(i) ? null : card));
          s.cards = refill(next, nf);
          const fresh = s.cards.map((card, i) => (card !== before[i] ? i : -1)).filter((i) => i >= 0);
          s.sel = [];
          if (s.found % 5 === 0) ctx.toast(`Trójki: ${s.found} z ${target}`);
          render(fresh);
          if (s.found >= target) return finish();
        } else {
          s.slips++;
          s.streak = 0;
          Sound.error();
          s.sel.forEach((i) => replay(cards[i], "shake"));
          s.sel = [];
          render();
          if (s.slips >= slips) return ctx.lose("Za dużo pomyłek", `Zebrane trójki: ${s.found} z ${target}.`);
        }
      }

      function hint() {
        if (ctx.done) return;
        const found = findSet(s.cards, nf);
        if (!found) return;
        s.hinted = true;
        s.sel = [];
        clearBtn.disabled = true;
        sweep(found.map((i) => cards[i]));
        ctx.toast("Ta trójka się zgadza");
        render();
      }

      function clear() {
        if (ctx.done || !s.sel.length) return;
        s.sel = [];
        Sound.erase();
        render();
      }

      function finish() {
        if (!s.slips) ctx.achieve("bez-bledu");
        if (key === "hard" && !s.slips && !s.hinted) ctx.achieve("mistrz");
        ctx.win(s.slips ? `Pomyłki: ${s.slips}.` : "Bez ani jednej pomyłki.");
      }

      // odliczanie tylko pilnuje czasu i odświeża panel: sekundy liczy platforma
      const timer = setInterval(() => {
        if (ctx.done) return clearInterval(timer);
        render();
        if (left() <= 0) {
          clearInterval(timer);
          ctx.lose("Koniec czasu", `Zebrane trójki: ${s.found} z ${target}.`);
        }
      }, 500);
      ctx.onStop(() => clearInterval(timer));

      function render(fresh = []) {
        s.cards.forEach((id, i) => {
          const btn = cards[i];
          if (btn.dataset.card !== String(id)) paint(btn, id);
          btn.classList.toggle("is-sel", s.sel.includes(i));
          btn.classList.toggle("cursor", i === s.cursor);
        });
        fresh.forEach((i) => replay(cards[i], "trio-pop"));
        clearBtn.disabled = !s.sel.length;
        foundEl.set(`${s.found} z ${target}`, s.found / target, `Zostało ${fmt(left())}`);
        partEl.set("Pomyłki", `${s.slips} z ${slips}`);
        partEl.set("Seria", s.streak);
        ctx.progress(s.found / target);
      }
      render();
    },
  });
}
