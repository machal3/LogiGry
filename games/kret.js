// Kret: krety wychylają się z nor na chwilę; trafiaj je, zanim się schowają. Złoty kret liczy się za trzy, bomba odbiera życie.
const Moles = { last: null };

if (typeof module !== "undefined") module.exports = Moles;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "kret"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, cols: 3, rows: 3, target: 20, up: 1150, every: 700, bombs: 0, time: 45 },
    { key: "medium", name: "Średni", points: 25, cols: 4, rows: 3, target: 30, up: 900, every: 520, bombs: 0.15, time: 45 },
    { key: "hard", name: "Trudny", points: 50, cols: 4, rows: 4, target: 40, up: 700, every: 400, bombs: 0.22, time: 45 },
  ],
  rules: [
    "Klikaj krety, gdy wychylą się z nor. Złoty kret jest wart trzy trafienia.",
    "Na średnim i trudnym z nor wyskakują też bomby: trafiona bomba zabiera jedno z trzech żyć.",
    "Zdobądź wymaganą liczbę trafień, zanim minie czas. Krety z czasem wychylają się coraz krócej.",
  ],
  mount(board, ctx) {
    const { cols, rows, target, up, every, bombs, time } = ctx.level;
    const s = { hits: 0, lives: 3, left: time, misses: 0 };
    Moles.last = s;
    const holes = gridCells(board, cols, rows, "wm", { gap: 0.18, label: (r, c) => `Nora ${r * cols + c + 1}` });
    board.style.setProperty("--max", "150px");
    const state = holes.map(() => ({ kind: "", until: 0 }));
    holes.forEach((b) => {
      const m = el("span", "wm-mole");
      m.append(el("i", "wm-eyes"), el("i", "wm-nose"));
      b.append(m, el("span", "wm-dirt"));
    });
    const hitsEl = statBlock(ctx, "Trafienia", { meter: true });
    const livesEl = el("p", "bk-lives");
    const timeEl = statBlock(ctx, "Czas", { small: true });
    if (bombs) ctx.panel.append(panelBlock("Życia", livesEl));

    const show = (i, kind, ms) => {
      state[i] = { kind, until: performance.now() + ms };
      holes[i].dataset.kind = kind;
      holes[i].classList.add("up");
      holes[i].classList.remove("hit");
    };
    const hide = (i) => { state[i].kind = ""; holes[i].classList.remove("up"); };
    let last = performance.now(), spawnIn = 600, raf = 0;
    const tick = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (!ctx.done) {
        s.left -= dt;
        // krety coraz szybsze: czas wychylenia skraca się do 60%
        const pace = 1 - 0.4 * Math.min(1, (time - s.left) / time);
        spawnIn -= dt * 1000;
        if (spawnIn <= 0) {
          spawnIn = every * pace * (0.7 + Math.random() * 0.6);
          const free = state.map((x, i) => (x.kind ? -1 : i)).filter((i) => i >= 0);
          if (free.length) {
            const roll = Math.random();
            show(pick(free), roll < bombs ? "bomb" : roll < bombs + 0.08 ? "gold" : "mole", up * pace);
          }
        }
        state.forEach((x, i) => { if (x.kind && t > x.until) hide(i); });
        if (s.left <= 0) { s.left = 0; render(); return ctx.lose("Koniec czasu", `Trafienia: ${s.hits} z ${target}.`); }
        render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    ctx.onStop(() => cancelAnimationFrame(raf));

    const whack = (i) => {
      if (ctx.done) return;
      const k = state[i].kind;
      if (!k || holes[i].classList.contains("hit")) { s.misses++; return Sound.tap(); }
      holes[i].classList.add("hit");
      state[i].until = performance.now() + 220;
      if (k === "bomb") {
        s.lives--;
        Sound.lose();
        replay(board, "shake");
        if (s.lives <= 0) { render(); return ctx.lose("Bum!", "Trzy bomby to o trzy za dużo."); }
      } else {
        s.hits += k === "gold" ? 3 : 1;
        Sound.place(k === "gold" ? 9 : 1 + (s.hits % 7));
        const f = el("span", "wm-pow", k === "gold" ? "+3" : "+1");
        holes[i].append(f);
        setTimeout(() => f.remove(), 600);
      }
      render();
      if (s.hits >= target) ctx.win(`Zostało ${Math.ceil(s.left)} s.`);
    };
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (b) { e.preventDefault(); whack(+b.dataset.i); }
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      if (/^[1-9]$/.test(e.key) && +e.key <= holes.length) { e.preventDefault(); whack(+e.key - 1); }
    });

    function render() {
      hitsEl.set(`${s.hits} / ${target}`, s.hits / target);
      timeEl.set(`${Math.ceil(s.left)} s`);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress(s.hits / target);
    }
    render();
  },
});
