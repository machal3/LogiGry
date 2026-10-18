// Echo (Simon): komputer pokazuje sekwencję świateł, gracz ją powtarza. Każda runda dokłada jeden krok.
const Simon = { last: null };

if (typeof module !== "undefined") module.exports = Simon;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "echo"), {
  levels: [
    { key: "easy", name: "4 pola", points: 10, pads: 4, cols: 2, target: 8, speed: 520, lives: 2 },
    { key: "medium", name: "6 pól", points: 25, pads: 6, cols: 3, target: 11, speed: 430, lives: 1 },
    { key: "hard", name: "9 pól", points: 50, pads: 9, cols: 3, target: 14, speed: 340, lives: 1 },
  ],
  rules: [
    "Patrz i słuchaj: pola zapalają się po kolei. Potem powtórz tę samą kolejność.",
    "Każda runda dokłada jeden krok na końcu. Dojdź do sekwencji o wymaganej długości.",
    "Klikaj pola albo naciskaj klawisze z numerami pól. Na łatwym jedna pomyłka jest wybaczona: sekwencja zostanie pokazana jeszcze raz.",
  ],
  mount(board, ctx) {
    const { pads, cols, speed } = ctx.level;
    const COLORS = ["#2f9e44", "#e03131", "#fab005", "#1c7ed6", "#ae3ec9", "#f76707", "#15aabf", "#f06595", "#5c940d"];
    const NOTES = [1, 3, 5, 6, 8, 2, 4, 7, 9];
    const s = { seq: [], at: 0, playing: false, target: ctx.level.target, lives: ctx.level.lives };
    Simon.last = s;
    const rows = Math.ceil(pads / cols);
    const cells = gridCells(board, cols, rows, "sm", { gap: 0.12 });
    board.style.setProperty("--max", "200px");
    cells.forEach((b, i) => {
      b.style.setProperty("--pc", COLORS[i]);
      b.append(el("span", "sm-key", i + 1));
      b.setAttribute("aria-label", `Pole ${i + 1}`);
    });
    const lenEl = statBlock(ctx, "Długość", { meter: true });
    const status = el("p", "sm-status");
    lenEl.block.append(status);
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    ctx.onStop(() => timers.forEach(clearTimeout));

    const flash = (i, ms) => {
      cells[i].classList.add("lit");
      Sound.place(NOTES[i]);
      later(() => cells[i].classList.remove("lit"), ms);
    };
    function play() {
      s.playing = true;
      s.at = 0;
      board.classList.add("watch");
      render("Patrz…");
      s.seq.forEach((p, k) => later(() => flash(p, speed * 0.7), 500 + k * speed));
      later(() => { s.playing = false; board.classList.remove("watch"); render("Twoja kolej"); }, 500 + s.seq.length * speed);
    }
    function nextRound() {
      s.seq.push(rnd(pads));
      render();
      play();
    }
    function press(i) {
      if (ctx.done || s.playing || i >= pads) return;
      if (s.seq[s.at] !== i) {
        Sound.error();
        replay(cells[i], "shake");
        if (--s.lives > 0) { ctx.toast("Pomyłka. Popatrz jeszcze raz"); return later(play, 700); }
        cells[s.seq[s.at]].classList.add("lit");
        return ctx.lose("Pomyłka", `Udało się powtórzyć ${s.seq.length - 1} ${plural(s.seq.length - 1, "krok", "kroki", "kroków")}.`);
      }
      flash(i, 180);
      s.at++;
      render();
      if (s.at < s.seq.length) return;
      if (s.seq.length >= s.target) return later(() => ctx.win(), 250);
      s.playing = true;
      later(nextRound, 650);
    }
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) press(+b.dataset.i);
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      if (/^[1-9]$/.test(e.key)) { e.preventDefault(); press(+e.key - 1); }
    });

    function render(msg) {
      if (msg) status.textContent = msg;
      lenEl.set(`${Math.max(0, s.seq.length - (s.at < s.seq.length ? 1 : 0))} / ${s.target}`, (s.seq.length - 1 + s.at / Math.max(1, s.seq.length)) / s.target);
      ctx.progress((s.seq.length - 1) / s.target);
    }
    later(nextRound, 600);
    render("Przygotuj się");
  },
});
