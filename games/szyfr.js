// Szyfr (Mastermind): odgadnij ukryty ciąg kolorów. Po każdej próbie: czarne kołeczki = dobry kolor na dobrym miejscu,
// białe = dobry kolor na złym miejscu.
const Codebreaker = (() => {
  function score(code, guess) {
    let black = 0;
    const a = new Map(), b = new Map();
    code.forEach((c, i) => {
      if (c === guess[i]) black++;
      else { a.set(c, (a.get(c) || 0) + 1); b.set(guess[i], (b.get(guess[i]) || 0) + 1); }
    });
    let white = 0;
    a.forEach((k, c) => (white += Math.min(k, b.get(c) || 0)));
    return { black, white };
  }
  function generate(len, colors, repeats) {
    const pool = shuffle([...Array(colors).keys()]);
    const code = repeats ? Array.from({ length: len }, () => rnd(colors)) : pool.slice(0, len);
    return (api.last = { code });
  }
  const api = { score, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Codebreaker;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "szyfr"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, len: 4, colors: 6, tries: 10, repeats: false },
    { key: "medium", name: "Średni", points: 25, len: 4, colors: 8, tries: 9, repeats: true },
    { key: "hard", name: "Trudny", points: 50, len: 5, colors: 8, tries: 9, repeats: true },
  ],
  rules: [
    "Komputer ukrył ciąg kolorów. Ułóż próbę i sprawdź ją.",
    "Ciemny kołeczek: kolor jest w szyfrze i stoi na dobrym miejscu. Jasny: kolor jest w szyfrze, ale gdzie indziej. Kołeczki nie mówią, którego koloru dotyczą.",
    "Na łatwym kolory się nie powtarzają, na średnim i trudnym mogą. Klawisze 1–8 wstawiają kolory, Backspace usuwa, Enter sprawdza.",
  ],
  mount(board, ctx) {
    const { len, colors, tries } = ctx.level;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#f76707", "#15aabf", "#f06595"];
    const { code } = Codebreaker.generate(len, colors, ctx.level.repeats);
    const rows = [];
    let guess = [];
    board.classList.add("mmd");
    board.style.setProperty("--len", len);
    board.style.setProperty("--cols", len + 2.6);
    board.style.setProperty("--rows", tries * 1.12 + 1.4);
    const secret = el("div", "mmd-row secret");
    const secretPegs = code.map(() => { const p = el("span", "mmd-peg hidden"); secret.append(p); return p; });
    secret.append(el("span", "mmd-lock"));
    board.append(secret);
    for (let t = 0; t < tries; t++) {
      const row = el("div", "mmd-row");
      const pegs = Array.from({ length: len }, (_, k) => {
        const p = button("", "mmd-peg");
        p.dataset.k = k;
        p.setAttribute("aria-label", `Pole ${k + 1}`);
        row.append(p);
        return p;
      });
      const keys = el("span", "mmd-keys");
      keys.style.setProperty("--kc", Math.ceil(len / 2));
      const pins = Array.from({ length: len }, () => { const s = el("i"); keys.append(s); return s; });
      row.append(keys);
      row.style.setProperty("--t", t);
      board.append(row);
      rows.push({ row, pegs, pins });
    }
    const pal = el("div", "mmd-pal");
    const swatches = COLORS.slice(0, colors).map((c, k) => {
      const b = button("", "mmd-swatch", () => add(k));
      b.style.setProperty("--pc", c);
      b.setAttribute("aria-label", `Kolor ${k + 1}`);
      b.append(el("span", "", k + 1));
      pal.append(b);
      return b;
    });
    const checkBtn = button("Sprawdź", "btn wide", () => check());
    const delBtn = button("Usuń", "btn-ghost", () => del());
    const actions = el("div", "panel-row");
    actions.append(delBtn, checkBtn);
    ctx.panel.append(panelBlock("Kolory", pal, actions));
    const triesEl = statBlock(ctx, "Próby", { meter: true, small: true });
    const history = [];

    const current = () => rows[history.length];
    function add(k) {
      if (ctx.done || guess.length >= len) return;
      if (!ctx.level.repeats && guess.includes(k)) { ctx.toast("Na tym poziomie kolory się nie powtarzają"); return Sound.error(); }
      guess.push(k);
      Sound.place(1 + k);
      render();
      replay(current().pegs[guess.length - 1], "pop");
    }
    function del() {
      if (ctx.done || !guess.length) return;
      guess.pop();
      Sound.erase();
      render();
    }
    function check() {
      if (ctx.done) return;
      if (guess.length < len) { ctx.toast(`Wybierz ${len} kolory`); replay(current().row, "shake"); return Sound.error(); }
      const res = Codebreaker.score(code, guess);
      history.push({ guess, ...res });
      const r = rows[history.length - 1];
      r.pins.forEach((p, k) => {
        p.className = k < res.black ? "b" : k < res.black + res.white ? "w" : "";
        p.style.setProperty("--pd", `${k * 90}ms`);
      });
      guess = [];
      render();
      if (res.black === len) { reveal(); return ctx.win(`Złamane w ${history.length} ${plural(history.length, "próbie", "próbach", "próbach")}.`); }
      if (history.length >= tries) { reveal(); return ctx.lose("Szyfr nie złamany", "Tak wyglądał ukryty kod."); }
      res.black || res.white ? Sound.line() : Sound.erase();
    }
    function reveal() {
      secretPegs.forEach((p, k) => {
        p.classList.remove("hidden");
        p.style.setProperty("--pc", COLORS[code[k]]);
        p.style.setProperty("--pd", `${k * 120}ms`);
        p.classList.add("show");
      });
      secret.classList.add("open");
    }
    board.addEventListener("click", (e) => {
      const p = e.target.closest(".mmd-peg");
      if (!p || ctx.done || p.closest(".mmd-row") !== current()?.row) return;
      // kliknięcie wstawionego koloru usuwa go z próby
      const k = +p.dataset.k;
      if (k < guess.length) { guess.splice(k, 1); Sound.erase(); render(); }
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      if (/^[1-8]$/.test(e.key) && +e.key <= colors) { e.preventDefault(); add(+e.key - 1); }
      else if (e.key === "Backspace") { e.preventDefault(); del(); }
      else if (e.key === "Enter" && !e.target.closest?.("button")) { e.preventDefault(); check(); }
    });

    function render() {
      rows.forEach(({ row, pegs }, t) => {
        const h = history[t];
        const g = h ? h.guess : t === history.length ? guess : [];
        pegs.forEach((p, k) => {
          p.style.setProperty("--pc", g[k] != null ? COLORS[g[k]] : "");
          p.classList.toggle("set", g[k] != null);
          p.disabled = t !== history.length;
        });
        row.classList.toggle("now", t === history.length && !ctx.done);
        row.classList.toggle("past", t < history.length);
      });
      swatches.forEach((b, k) => b.classList.toggle("used", !ctx.level.repeats && guess.includes(k)));
      checkBtn.disabled = guess.length < len;
      triesEl.set(`${history.length} / ${tries}`, history.length / tries);
      const best = Math.max(0, ...history.map((h) => h.black + h.white * 0.5));
      ctx.progress(best / len * 0.9);
    }
    render();
  },
});
