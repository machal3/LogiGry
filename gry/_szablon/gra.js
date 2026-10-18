// SZABLON GRY. Skopiuj: node narzedzia/gry.mjs nowa <id>, potem przerób na swoją grę. Zasady: AGENTS.md.
// Przykładowa gra „Dziesiątka”: zdejmuj z planszy pary liczb, które dają razem 10.
// Cały plik jest w klamrach { }, żeby nazwy nie zderzały się z innymi grami (wszystkie skrypty dzielą jeden zakres).
{
  // --- Logika bez DOM: da się ją sprawdzić w node (test.js) ---

  // Plansza z par dających 10, więc zawsze da się ją wyczyścić.
  function generate(n) {
    const cells = [];
    while (cells.length < n) {
      const d = 1 + rnd(9);
      cells.push(d, 10 - d);
    }
    return shuffle(cells);
  }

  const pairs = (cells) => {
    const out = [];
    cells.forEach((a, i) => cells.forEach((b, j) => { if (i < j && a && b && a + b === 10) out.push([i, j]); }));
    return out;
  };

  if (typeof module !== "undefined") module.exports = { generate, pairs };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "szablon", // = nazwa folderu gry/<id>
    cat: "slowa", // klucz z CATEGORIES w games.js
    name: "Dziesiątka",
    desc: "Zdejmuj z planszy pary liczb, które razem dają dziesięć.",
    color: "#2f9e44", // kolor gry: kafel, przycisk główny, pasek postępu
    ink: "#ffffff", // kolor tekstu na kolorze gry (kontrast!)
    glyph: ["#.#.#", ".....", "#.#.#", ".....", "#.#.#"],
    // Dokładnie trzy poziomy; punkty z tabeli w AGENTS.md (10 / 25 / 50, rozbudowane 20 / 50 / 100).
    levels: [
      { key: "easy", name: "Łatwy", points: 10, cols: 4, rows: 4, mistakes: 5 },
      { key: "medium", name: "Średni", points: 25, cols: 6, rows: 4, mistakes: 3 },
      { key: "hard", name: "Trudny", points: 50, cols: 6, rows: 6, mistakes: 1 },
    ],
    rules: [
      "Kliknij dwa pola, których liczby dają razem 10. Para znika z planszy.",
      "Wyczyść całą planszę, zanim skończą się dozwolone pomyłki.",
      "Strzałki przesuwają kursor, spacja wybiera pole.",
    ],
    // Własne osiągnięcia: 3–8 sztuk, punkty 10 (łatwe), 25 (trudne) lub 50 (mistrzowskie).
    // Zdobywa się je w mount przez ctx.achieve(id). Cztery automatyczne (pierwsza wygrana itd.) dodaje platforma.
    achievements: [
      { id: "bez-bledu", name: "Bez pudła", desc: "Wyczyść planszę bez pomyłki.", points: 10 },
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Wygraj średni lub trudny poziom bez podpowiedzi.", points: 25 },
      { id: "blyskawica", name: "Błyskawica", desc: "Wygraj trudny poziom w mniej niż 45 sekund.", points: 50 },
    ],

    // Jedna partia. board: pusta plansza, ctx: wszystko, co daje platforma (opis w AGENTS.md).
    mount(board, ctx) {
      const { cols, rows, mistakes, key } = ctx.level;
      const s = { cells: generate(cols * rows), pick: -1, cursor: 0, misses: 0, hinted: false };
      const started = performance.now();

      const btns = gridCells(board, cols, rows, "sz-grid");
      const leftEl = statBlock(ctx, "Zostało pól", { meter: true });
      const missEl = statBlock(ctx, "Pomyłki", { small: true });
      // własny przycisk w panelu: zawsze przez button(), klasa "btn" (główny) albo "btn-ghost" (poboczny)
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      // cofanie: zapisz stan przed ruchem, platforma pokaże przycisk „Cofnij” i obsłuży Ctrl+Z
      const save = ctx.undoable((snap) => { Object.assign(s, snap); render(); });

      function choose(i) {
        if (ctx.done || !s.cells[i]) return;
        s.cursor = i;
        if (s.pick < 0 || s.pick === i) { s.pick = s.pick === i ? -1 : i; Sound.tap(); return render(); }
        if (s.cells[s.pick] + s.cells[i] === 10) {
          save({ cells: s.cells.slice(), pick: s.pick, misses: s.misses });
          s.cells[s.pick] = s.cells[i] = 0;
          s.pick = -1;
          Sound.place(1 + (s.cells.filter(Boolean).length % 9));
          render();
          if (s.cells.every((v) => !v)) return finish();
        } else {
          s.misses++;
          s.pick = -1;
          Sound.error();
          replay(btns[i], "shake");
          render();
          if (s.misses > mistakes) ctx.lose("Za dużo pomyłek", `Dozwolone: ${mistakes}.`);
        }
      }

      function hint() {
        const p = pairs(s.cells)[0];
        if (!p || ctx.done) return;
        s.hinted = true;
        sweep(p.map((i) => btns[i]));
        ctx.toast("Ta para daje 10");
      }

      function finish() {
        // osiągnięcia zgłaszaj PRZED ctx.win, wtedy pojawią się na ekranie wyniku
        if (!s.misses) ctx.achieve("bez-bledu");
        if (!s.hinted && key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (key === "hard" && performance.now() - started < 45000) ctx.achieve("blyskawica");
        ctx.win(s.misses ? `Pomyłki: ${s.misses}.` : "Bez ani jednej pomyłki.");
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b) choose(+b.dataset.i);
      });
      cellKeys(ctx, { cols, rows, get: () => s.cursor, set: (i) => { s.cursor = i; render(); }, keys: { " ": () => choose(s.cursor) } });

      function render() {
        btns.forEach((b, i) => {
          b.textContent = s.cells[i] || "";
          b.classList.toggle("gone", !s.cells[i]);
          b.classList.toggle("picked", i === s.pick);
          b.classList.toggle("cursor", i === s.cursor);
        });
        const left = s.cells.filter(Boolean).length;
        leftEl.set(left, 1 - left / s.cells.length);
        missEl.set(`${s.misses} z ${mistakes}`);
        ctx.progress(1 - left / s.cells.length);
      }
      render();
    },
  });
}
