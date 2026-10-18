// Słowo: odgadnij ukryte słowo. Po próbie litery barwią się: trafiona na miejscu, jest w słowie gdzie indziej, nie ma jej.
const Wordle = (() => {
  // ocena próby z poprawną obsługą powtórzonych liter: 2 = na miejscu, 1 = gdzie indziej, 0 = brak
  function score(answer, guess) {
    const a = [...answer], g = [...guess], out = g.map(() => 0), left = new Map();
    a.forEach((ch, i) => { if (g[i] === ch) out[i] = 2; else left.set(ch, (left.get(ch) || 0) + 1); });
    g.forEach((ch, i) => {
      if (out[i] || !left.get(ch)) return;
      out[i] = 1;
      left.set(ch, left.get(ch) - 1);
    });
    return out;
  }
  function words(len, source) {
    return [...new Set(Object.values(source).flatMap((s) => s.split(" ")))].filter((w) => [...w].length === len);
  }
  const api = { score, words, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Wordle;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "slowo"), {
  levels: [
    { key: "easy", name: "4 litery", points: 10, len: 4, tries: 7 },
    { key: "medium", name: "5 liter", points: 25, len: 5, tries: 6 },
    { key: "hard", name: "6 liter", points: 50, len: 6, tries: 6 },
  ],
  rules: [
    "Odgadnij ukryte słowo: rzeczownik w mianowniku, np. nazwę zwierzęcia, rzeczy albo miejsca.",
    "Po każdej próbie kafel w kolorze gry oznacza literę na właściwym miejscu, żółty literę, która jest w słowie gdzie indziej, a szary literę, której nie ma.",
    "Polskie litery są osobnymi literami: ó to nie o, a ł to nie l. Pisz na klawiaturze albo klikaj na ekranie.",
  ],
  achievements: [
    { id: "w-trzech", name: "Bystre oko", desc: "Odgadnij słowo w najwyżej trzech próbach.", points: 10 },
    { id: "w-dwoch", name: "Jasnowidz", desc: "Odgadnij słowo w najwyżej dwóch próbach.", points: 25 },
    { id: "mistrz-slow", name: "Mistrz słów", desc: "Odgadnij słowo z 6 liter w najwyżej trzech próbach.", points: 50 },
  ],
  mount(board, ctx) {
    const { len, tries } = ctx.level;
    const answer = pick(Wordle.words(len, WORDS_PL));
    Wordle.last = { answer };
    const rows = [];
    let cur = "", done = [];
    const known = new Map(); // litera → najlepsza ocena
    board.classList.add("wd");
    board.style.setProperty("--len", len);
    board.style.setProperty("--cols", len * 1.12);
    board.style.setProperty("--rows", tries * 1.12);
    for (let t = 0; t < tries; t++) {
      const row = el("div", "wd-row");
      const tiles = Array.from({ length: len }, () => { const d = el("span", "wd-tile"); row.append(d); return d; });
      board.append(row);
      rows.push({ row, tiles });
    }
    const LAYOUT = ["ąćęłńóśźż", "qwertyuiop", "asdfghjkl", "⏎zxcvbnm⌫"];
    const kb = el("div", "wd-kb");
    const keyEls = new Map();
    LAYOUT.forEach((line) => {
      const r = el("div", "wd-kbrow");
      [...line].forEach((ch) => {
        const b = button(ch === "⏎" ? "Sprawdź" : ch === "⌫" ? "" : ch, `wd-key${ch === "⏎" ? " wide" : ch === "⌫" ? " back" : ""}`, () => press(ch === "⏎" ? "Enter" : ch === "⌫" ? "Backspace" : ch));
        if (ch === "⌫") b.setAttribute("aria-label", "Usuń literę");
        r.append(b);
        keyEls.set(ch, b);
      });
      kb.append(r);
    });
    ctx.panel.append(panelBlock("", kb));
    const info = statBlock(ctx, "Próby", { small: true });

    function press(k) {
      if (ctx.done) return;
      if (k === "Enter") return submit();
      if (k === "Backspace") { cur = [...cur].slice(0, -1).join(""); Sound.erase(); return render(); }
      if (!/^[a-ząćęłńóśźż]$/.test(k) || [...cur].length >= len) return;
      cur += k;
      Sound.tap();
      render();
      replay(rows[done.length].tiles[[...cur].length - 1], "pop");
    }
    function submit() {
      const r = rows[done.length];
      if ([...cur].length < len) { replay(r.row, "shake"); ctx.toast(`Słowo ma ${len} liter`); return Sound.error(); }
      const sc = Wordle.score(answer, cur);
      done.push([cur, sc]);
      [...cur].forEach((ch, i) => {
        r.tiles[i].style.setProperty("--d", `${i * 120}ms`);
        r.tiles[i].classList.add("flip");
        known.set(ch, Math.max(known.get(ch) ?? -1, sc[i]));
      });
      const won = sc.every((v) => v === 2);
      cur = "";
      render();
      setTimeout(() => { if (!ctx.done) renderKeys(); }, len * 120 + 200);
      if (won) {
        if (done.length <= 3) ctx.achieve("w-trzech");
        if (done.length <= 2) ctx.achieve("w-dwoch");
        if (done.length <= 3 && ctx.level.key === "hard") ctx.achieve("mistrz-slow");
      }
      if (won) { Sound.line(); return setTimeout(() => ctx.win(`Odgadnięte w ${done.length}. próbie.`), len * 120 + 300); }
      Sound.place(1 + sc.filter((v) => v === 2).length * 2);
      if (done.length >= tries) setTimeout(() => ctx.lose("Nie tym razem", `Szukane słowo: ${answer.toUpperCase()}.`), len * 120 + 300);
    }
    ctx.on(document, "keydown", (e) => {
      // AltGr (polskie litery) zgłasza się jako Ctrl+Alt, więc te znaki przepuszczamy
      if (((e.ctrlKey || e.metaKey) && !/^[ąćęłńóśźż]$/i.test(e.key)) || e.target.closest?.("input, textarea, select")) return;
      const k = e.key === "Enter" || e.key === "Backspace" ? e.key : e.key.toLowerCase();
      if (k === "Enter" && e.target.closest?.("button")) return;
      if (k === "Enter" || k === "Backspace" || /^[a-ząćęłńóśźż]$/.test(k)) { e.preventDefault(); press(k); }
    });

    function renderKeys() {
      keyEls.forEach((b, ch) => { const v = known.get(ch); b.dataset.v = v == null ? "" : v; });
    }
    function render() {
      rows.forEach(({ tiles }, t) => {
        const word = t < done.length ? done[t][0] : t === done.length ? cur : "";
        tiles.forEach((d, i) => {
          d.textContent = [...word][i] || "";
          d.classList.toggle("typed", !!d.textContent && t >= done.length);
          d.dataset.v = t < done.length ? done[t][1][i] : "";
        });
      });
      info.set(`${done.length} / ${tries}`);
      const best = Math.max(0, ...done.map(([, sc]) => sc.reduce((a, v) => a + v, 0)));
      ctx.progress((best / (2 * len)) * 0.9);
    }
    render();
  },
});
