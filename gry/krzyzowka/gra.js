// Krzyżówka: generowany diagram z wyrazów, wskazówki po boku, wyróżnione wyrazy złożą hasło.
{
  // Baza wyrazów: [wyraz, wskazówka]. Polskie litery, wyrazy do 7 znaków.
  const WORDS = [
    ["KOT", "Ma wąsy i mruczy"],
    ["PIES", "Idzie na spacer na smyczy"],
    ["RYBA", "Mieszka w wodzie"],
    ["LAS", "Wiele drzew obok siebie"],
    ["OKNO", "W ścianie, ma szkło"],
    ["MIÓD", "Robią go pszczoły"],
    ["WAGA", "Pokaże, ile ważysz"],
    ["KREW", "Czerwona, płynie w żyłach"],
    ["ZIMA", "Śnieg mrozi ziemię"],
    ["LATO", "Czas wakacji i upałów"],
    ["GWIAZDA", "Świeci wieczorem na niebie"],
    ["KSIEŻYC", "Świeci nad miastem, ma własną fazę"],
    ["ZAGIEL", "Napędza żaglówkę"],
    ["PORT", "Przystań dla statków"],
    ["MAPA", "Prowadzi w podróży"],
    ["KOMPAS", "Igła wskazuje północ"],
    ["LAMPA", "Zapala światło w pokoju"],
    ["PIŁA", "Przycina gałęzie"],
    ["MOST", "Łączy brzegi rzeki"],
    ["KAWA", "Kubek z aromatem porannym"],
    ["CHLEB", "Podstawa śniadania"],
    ["SKLEP", "Kupujesz tu chleb"],
    ["BANK", "Trzyma pieniądze"],
    ["MAKARON", "Podstawa spaghetti"],
    ["BURZA", "Grzmoty i pioruny"],
    ["CIASTO", "Na deser z kawą"],
    ["KACZKA", "Kwaczka przy stawie"],
    ["KOGUT", "Budzi podwórko o poranku"],
    ["ŚLIMAK", "Dom na plecach, zwalnia marsz"],
    ["MOTYL", "Kreśli w powietrzu fale skrzydłami"],
    ["KAPUSTA", "Warzywo w bigosie"],
    ["GŁOWA", "Nosi myśli"],
    ["DŁON", "Podaje i pisze"],
    ["KOŁO", "Okrągłe, samochód nie ruszy bez"],
    ["WODA", "Pije się ją codziennie"],
    ["BUTY", "Noszą je na stopach"],
    ["SWETER", "Ciepły na ramiona i poty"],
    ["KWIAT", "Rozkwita wiosną"],
    ["DZIECI", "Małe osoby w domu"],
    ["STAW", "Mała woda bez fal"],
    ["GRUSZKA", "Owoc z ogrodu"],
    ["WIATR", "Rozdmuchuje liście"],
    ["MASA", "Ile ma kg"],
    ["PORTFEL", "W nim karty i gotówka"],
    ["PIASEK", "Pod stopami nad rzeką"],
  ];

  // --- Generator diagramu ---

  // Sprawdza, czy wyraz można położyć: granice, puste otoczenie, zgodne krzyżowania.
  function fits(w, dir, row, col, cols, rows, placed) {
    const L = w.length;
    if (dir === 0 ? col + L > cols : row + L > rows) return false;
    const occ = new Map();
    for (const p of placed)
      for (let k = 0; k < p.w.length; k++) {
        const c = p.dir === 0 ? p.col + k : p.col;
        const r = p.dir === 0 ? p.row : p.row + k;
        occ.set(r * cols + c, { ch: p.w[k], dir: p.dir });
      }
    const before = dir === 0 ? [row, col - 1] : [row - 1, col];
    const after = dir === 0 ? [row, col + L] : [row + L, col];
    if (occ.has(before[0] * cols + before[1]) || occ.has(after[0] * cols + after[1])) return false;
    for (let k = 0; k < L; k++) {
      const c = dir === 0 ? col + k : col;
      const r = dir === 0 ? row : row + k;
      const o = occ.get(r * cols + c);
      if (o) {
        if (o.ch !== w[k] || o.dir === dir) return false;
      } else {
        const nb = dir === 0 ? [[r - 1, c], [r + 1, c]] : [[r, c - 1], [r, c + 1]];
        for (const [nr, nc] of nb) {
          if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) continue;
          if (occ.has(nr * cols + nc)) return false;
        }
      }
    }
    return true;
  }

  // Jedna próba budowy: pierwszy wyraz w środku, potem doklejane krzyżujące się wyrazy.
  function buildOnce(cols, rows, pool, maxWords) {
    const placed = [];
    let first = pool.find((w) => w[0].length <= cols);
    if (!first) return null;
    const frow = rows >> 1, fcol = Math.max(0, ((cols - first[0].length) / 2) | 0);
    if (!fits(first[0], 0, frow, fcol, cols, rows, placed)) return null;
    placed.push({ w: first[0], dir: 0, row: frow, col: fcol });
    const left = pool.filter((p) => p !== first);
    let noMore = false;
    while (placed.length < maxWords && !noMore) {
      noMore = true;
      for (const cand of left) {
        if (placed.length >= maxWords) break;
        if (placed.some((p) => p.w === cand[0])) continue;
        let done = false;
        for (const p of placed) {
          if (done) break;
          for (let i = 0; i < cand[0].length && !done; i++)
            for (let j = 0; j < p.w.length && !done; j++) {
              if (cand[0][i] !== p.w[j]) continue;
              const dir = 1 - p.dir;
              const baseRow = p.dir === 0 ? p.row : p.row + j;
              const baseCol = p.dir === 0 ? p.col + j : p.col;
              const row = dir === 0 ? baseRow : baseRow - i;
              const col = dir === 0 ? baseCol - i : baseCol;
              if (row < 0 || col < 0) continue;
              if (fits(cand[0], dir, row, col, cols, rows, placed)) {
                placed.push({ w: cand[0], dir, row, col });
                done = true;
                noMore = false;
              }
            }
        }
      }
    }
    if (placed.length < 2) return null;
    return placed;
  }

  // Ułożenie poziomu: wiele prób, przyjmowany jest diagram z co najmniej minWords wyrazami.
  function buildLevel(cols, rows, minWords, maxWords) {
    let best = null;
    const pool = [...WORDS];
    for (let t = 0; t < 160; t++) {
      shuffle(pool);
      const p = buildOnce(cols, rows, pool, maxWords);
      if (!p) continue;
      if (!best || p.length > best.length) best = p;
      if (best.length >= minWords) break;
    }
    return best;
  }

  // --- Interfejs: diagram, wskazówki, klawiatura ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "krzyzowka",
    cat: "slowa",
    name: "Krzyżówka",
    author: "GLM 5.3 Flash",
    desc: "Uzupełnij diagram hasłami ze wskazań. Wyróżnione wyrazy składają się w ukryte hasło.",
    color: "#4a148c",
    ink: "#ffffff",
    glyph: [".#.#.", "#####", "..#..", "#####", ".#.#."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, cols: 7, rows: 7, min: 6, max: 12, mistakes: 8 },
      { key: "medium", name: "Średni", points: 50, cols: 9, rows: 9, min: 10, max: 18, mistakes: 6 },
      { key: "hard", name: "Trudny", points: 100, cols: 11, rows: 11, min: 15, max: 24, mistakes: 5 },
    ],
    rules: [
      "Wybierz wyraz na liście wskazówek albo kliknij pole w diagramie, a potem pisz litery na klawiaturze lub z padu na dole panelu.",
      "Backspace cofa kursor o jedno pole, a po zapełnieniu wyrazu kursor skacze do następnego niezapełnionego.",
      "Zła litera nie wchodzi do diagramu, tylko liczy się jako pomyłka. Po wyczerpaniu limitu partia się kończy.",
      "Diagram wypełniony w całości jest wygrana; litery wyróżnione na złoto to ukryte hasło, wypisane w bloku Hasło.",
    ],
    achievements: [
      { id: "literowiec", name: "Literowiec", desc: "Wpisz poprawnie pięć liter z rzędu bez pomyłki.", points: 10 },
      { id: "bez-felera", name: "Bez felera", desc: "Wypełnij cały diagram bez pomyłki.", points: 25 },
      { id: "genialny", name: "Genialny", desc: "Ukończ poziom trudny w mniej niż cztery minuty.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const diagram = buildLevel(L.cols, L.rows, L.min, L.max) || [];
      const cells = gridCells(board, L.cols, L.rows, "kz-grid", { label: (r, c) => `Rząd ${r + 1}, kolumna ${c + 1}` });
      cells.forEach((b, i) => b.classList.add("kz-nonblock"));
      const typed = new Map();
      let sel = null, pos = 0, mistakes = 0, streak = 0;
      const cellIdx = (p, k) => (p.dir === 0 ? p.row * L.cols + p.col + k : (p.row + k) * L.cols + p.col);
      const occ = new Map();
      diagram.forEach((p) => {
        for (let k = 0; k < p.w.length; k++) {
          const idx = cellIdx(p, k);
          if (!occ.has(idx)) occ.set(idx, { ch: p.w[k], words: [] });
          occ.get(idx).words.push(p);
        }
      });
      // wyróżnione hasło: najdłuższy wyraz poziomy
      const gold = diagram.filter((p) => p.dir === 0).sort((a, b) => b.w.length - a.w.length)[0];
      const goldCells = new Set(gold ? [...Array(gold.w.length)].map((_, k) => cellIdx(gold, k)) : []);
      cells.forEach((b, i) => b.classList.toggle("kz-nope", !occ.has(i)));
      // numeracja: rosnąco po polach od góry
      let num = 0;
      for (let r = 0; r < L.rows; r++)
        for (let c = 0; c < L.cols; c++) {
          const o = occ.get(r * L.cols + c);
          if (!o) continue;
          const starters = o.words.filter((p) => cellIdx(p, 0) === r * L.cols + c);
          if (starters.length) { num++; starters.forEach((p) => { p.num = num; }); }
        }

      const progEl = statBlock(ctx, "Postęp", { meter: true });
      const missEl = statBlock(ctx, "Pomyłki", { small: true });
      const passEl = statBlock(ctx, "Hasło", { small: true });
      const hBlock = panelBlock("Poziome"), vBlock = panelBlock("Pionowe");
      diagram.forEach((p) => {
        const clue = (WORDS.find((w) => w[0] === p.w) || [])[1] || "";
        const b = button(`${p.num}. ${clue}`, "btn-ghost kz-clue", () => pick(p));
        p.btn = b;
        (p.dir === 0 ? hBlock : vBlock).append(b);
      });
      ctx.panel.append(hBlock, vBlock, padBlk());

      function padBlk() {
        const pad = el("div", "kz-pad");
        "AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ".split("").forEach((ch) =>
          pad.append(button(ch, "", () => key(ch))));
        pad.append(button("Usuń", "kz-bksp", () => key("Backspace")));
        return panelBlock("Klawiatura", pad);
      }

      function pick(p) {
        sel = p;
        pos = 0;
        while (pos < p.w.length && typed.has(cellIdx(p, pos))) pos++;
        render();
      }

      function key(ch) {
        if (!sel || ctx.done) return;
        if (ch === "Backspace") {
          if (pos === 0) return;
          pos--;
          typed.delete(cellIdx(sel, pos));
          Sound.erase();
          render();
          return;
        }
        if (!/^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(ch)) return;
        const idx = cellIdx(sel, pos);
        if (occ.get(idx).ch === ch) {
          typed.set(idx, ch);
          streak++;
          if (streak >= 5) ctx.achieve("literowiec");
          Sound.place(1 + (pos % 9));
          pos++;
          if (pos === sel.w.length) jumpNext();
        } else {
          mistakes++;
          streak = 0;
          Sound.error();
          replay(cells[idx], "shake");
          missEl.set(String(mistakes));
          if (mistakes > L.mistakes) return ctx.lose("Za dużo pomyłek", `Dozwolone było ${L.mistakes}.`);
        }
        render();
      }

      function jumpNext() {
        const rest = diagram
          .filter((p) => !p.w.every((_, k) => typed.has(cellIdx(p, k))))
          .sort((a, b) => cellIdx(a, 0) - cellIdx(b, 0));
        if (rest.length) pick(rest[0]);
        else sel = null;
      }

      function render() {
        cells.forEach((b, i) => {
          const o = occ.get(i);
          if (!o) return;
          b.textContent = typed.get(i) || "";
          b.classList.toggle("kz-sel-word", !!(sel && o.words.includes(sel)));
          const cur = sel ? cellIdx(sel, pos) : -1;
          b.classList.toggle("kz-cur", i === cur);
          b.classList.toggle("kz-gold", goldCells.has(i));
          // numer pozycji w narożniku pola startowego wyrazu
          const starter = o.words.find((p) => cellIdx(p, 0) === i);
          if (starter && !typed.has(i)) b.dataset.num = starter.num;
          else delete b.dataset.num;
        });
        diagram.forEach((p) => {
          p.btn.classList.toggle("on", p === sel);
          // rozwiązane wskazówki przekreślone
          p.btn.classList.toggle("done", p.w.every((_, k) => typed.has(cellIdx(p, k))));
        });
        passEl.set(gold ? typed.size === occ.size ? gold.w : gold.w.split("").map((_, k) => {
          const idx = cellIdx(gold, k);
          return typed.get(idx) || "·";
        }).join("") : "");
        progEl.set(`${typed.size} z ${occ.size}`, occ.size ? typed.size / occ.size : 0);
        ctx.progress(occ.size ? typed.size / occ.size : 0);
        if (occ.size && [...occ.keys()].every((k) => typed.get(k) === occ.get(k).ch)) finish();
      }

      function finish() {
        if (!mistakes) ctx.achieve("bez-felera");
        if (L.key === "hard" && ctx.time < 240) ctx.achieve("genialny");
        // fala światła przez pola ukrytego hasła
        if (gold) sweep(gold.w.split("").map((_, k) => cells[cellIdx(gold, k)]));
        ctx.win(`Hasło: ${gold ? gold.w : ""}.`);
      }

      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest?.("button")) return;
        if (e.key === "Backspace") { e.preventDefault(); return key("Backspace"); }
        const up = e.key.toUpperCase();
        if (/^[A-ZĄĆĘŁŃÓŚŹŻ]$/.test(up)) { e.preventDefault(); key(up); }
      });
      ctx.on(board, "click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b || ctx.done) return;
        const idx = +b.dataset.i;
        const o = occ.get(idx);
        if (!o) return;
        const w = o.words.find((p) => p.dir === 0) || o.words[0];
        pick(w);
        pos = wordPos(w, idx);
        Sound.tap();
        render();
      });
      const wordPos = (p, idx) => {
        for (let k = 0; k < p.w.length; k++) if (cellIdx(p, k) === idx) return k;
        return 0;
      };
      pick(diagram[0]);
      render();
    },
  });

  if (typeof module !== "undefined") module.exports = { buildLevel, fits, WORDS };
}

