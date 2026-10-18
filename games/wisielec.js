// Wisielec: zgaduj litery ukrytego słowa z podanej kategorii. Każda chybiona litera dorysowuje kawałek szubienicy.
const Hangman = (() => {
  const ALPHABET = [..."aąbcćdeęfghijklłmnńoóprsśtuwyzźż"];
  function generate(source, minLen, maxLen) {
    const pool = Object.entries(source).flatMap(([cat, s]) => s.split(" ").filter((w) => [...w].length >= minLen && [...w].length <= maxLen).map((w) => [cat, w]));
    const [category, word] = pick(pool);
    return (api.last = { category, word });
  }
  const solved = (word, guessed) => [...word].every((ch) => guessed.has(ch));
  const api = { ALPHABET, generate, solved, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Hangman;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "wisielec"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, min: 4, max: 6, lives: 9 },
    { key: "medium", name: "Średni", points: 25, min: 6, max: 9, lives: 7 },
    { key: "hard", name: "Trudny", points: 50, min: 8, max: 14, lives: 6 },
  ],
  rules: [
    "Odgadnij słowo z podanej kategorii, zgadując po jednej literze.",
    "Trafiona litera pojawia się we wszystkich miejscach słowa. Chybiona dorysowuje fragment szubienicy, a gdy rysunek będzie gotowy, przegrywasz.",
    "Polskie znaki to osobne litery. Możesz pisać na klawiaturze albo klikać litery na ekranie.",
  ],
  achievements: [
    { id: "bez-pomylki", name: "Czysta karta", desc: "Odgadnij słowo bez żadnej pomyłki.", points: 10 },
    { id: "prawie-bez", name: "Uważny", desc: "Odgadnij słowo na średnim poziomie z najwyżej jedną pomyłką.", points: 25 },
    { id: "mistrz-slow", name: "Mistrz słownika", desc: "Odgadnij długie słowo na trudnym poziomie bez żadnej pomyłki.", points: 50 },
  ],
  mount(board, ctx) {
    const { lives } = ctx.level;
    const { category, word } = Hangman.generate(WORDS_PL, ctx.level.min, ctx.level.max);
    const guessed = new Set();
    let misses = 0;
    board.classList.add("hm");
    board.style.setProperty("--cols", 10);
    board.style.setProperty("--rows", 9.5);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 110");
    svg.setAttribute("class", "hm-svg");
    svg.setAttribute("aria-hidden", "true");
    // kolejne fragmenty rysunku
    const PARTS = [
      ["path", { d: "M10 104H70" }], ["path", { d: "M28 104V8" }], ["path", { d: "M28 8H82" }], ["path", { d: "M28 26L46 8" }],
      ["path", { d: "M82 8V22" }], ["circle", { cx: 82, cy: 31, r: 9 }], ["path", { d: "M82 40V68" }],
      ["path", { d: "M82 48L70 60" }], ["path", { d: "M82 48L94 60" }], ["path", { d: "M82 68L72 86M82 68L92 86" }],
    ].map(([tag, attrs]) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      e.setAttribute("pathLength", 1);
      e.setAttribute("class", "hm-part");
      svg.append(e);
      return e;
    });
    const cat = el("p", "hm-cat", category);
    const slots = el("div", "hm-word");
    const letters = [...word].map((ch) => { const s = el("span", "hm-slot"); s.dataset.ch = ch; slots.append(s); return s; });
    board.append(svg, cat, slots);
    const kb = el("div", "hm-kb");
    const keys = new Map(Hangman.ALPHABET.map((ch) => {
      const b = button(ch, "hm-key", () => guess(ch));
      kb.append(b);
      return [ch, b];
    }));
    ctx.panel.append(panelBlock("Litery", kb));
    const livesEl = statBlock(ctx, "Pomyłki", { meter: true, small: true });

    function guess(ch) {
      if (ctx.done || guessed.has(ch)) return;
      guessed.add(ch);
      const hit = word.includes(ch);
      keys.get(ch).classList.add(hit ? "hit" : "miss");
      keys.get(ch).disabled = true;
      if (hit) {
        letters.forEach((s, i) => { if (s.dataset.ch === ch) { s.style.setProperty("--d", `${i * 50}ms`); replay(s, "show"); } });
        Sound.place(5);
      } else {
        misses++;
        Sound.error();
        replay(board, "shake");
      }
      render();
      if (Hangman.solved(word, guessed)) {
        if (!misses) ctx.achieve("bez-pomylki");
        if (ctx.level.key === "medium" && misses <= 1) ctx.achieve("prawie-bez");
        if (ctx.level.key === "hard" && !misses) ctx.achieve("mistrz-slow");
      }
      if (Hangman.solved(word, guessed)) return ctx.win(misses ? `Pomyłki: ${misses}.` : "Bez ani jednej pomyłki!");
      if (misses >= lives) {
        letters.forEach((s) => s.classList.add("reveal"));
        render(true);
        ctx.lose("Powieszony", `Szukane słowo: ${word.toUpperCase()}.`);
      }
    }
    ctx.on(document, "keydown", (e) => {
      // AltGr (polskie litery) zgłasza się jako Ctrl+Alt, więc te znaki przepuszczamy
      if (((e.ctrlKey || e.metaKey) && !/^[ąćęłńóśźż]$/i.test(e.key)) || e.target.closest?.("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (keys.has(k)) { e.preventDefault(); guess(k); }
    });

    function render(all = false) {
      letters.forEach((s) => { s.textContent = guessed.has(s.dataset.ch) || all ? s.dataset.ch : ""; s.classList.toggle("on", guessed.has(s.dataset.ch)); });
      // ile fragmentów rysunku pokazać przy tej liczbie pomyłek
      const shown = Math.ceil((misses / lives) * PARTS.length);
      PARTS.forEach((p, k) => p.classList.toggle("on", k < shown));
      livesEl.set(`${misses} / ${lives}`, misses / lives);
      const known = letters.filter((s) => guessed.has(s.dataset.ch)).length;
      ctx.progress(known / letters.length);
    }
    render();
  },
});
