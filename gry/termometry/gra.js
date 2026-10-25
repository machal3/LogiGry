// Termometry: napełnij termometry od bańki tak, by liczby przy wierszach i kolumnach się zgadzały.
{
  // --- Logika bez DOM (test.js) ---

  const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]]; // n, e, s, w

  // Dzieli planszę n × n na termometry (ścieżki od bańki). bend: czy mogą skręcać.
  function split(n, maxLen, bend) {
    const owner = new Array(n * n).fill(-1);
    const thermos = [];
    for (const start of shuffle([...Array(n * n).keys()])) {
      if (owner[start] >= 0) continue;
      const path = [start];
      owner[start] = thermos.length;
      const len = 2 + rnd(maxLen - 1);
      let dir = -1;
      while (path.length < len) {
        const cur = path[path.length - 1], r = (cur / n) | 0, c = cur % n;
        const free = [0, 1, 2, 3].filter((d) => {
          if (dir >= 0 && !bend && d !== dir) return false;
          const rr = r + DIRS[d][0], cc = c + DIRS[d][1];
          return rr >= 0 && rr < n && cc >= 0 && cc < n && owner[rr * n + cc] < 0;
        });
        if (!free.length) break;
        dir = dir >= 0 && free.includes(dir) && rnd(3) ? dir : pick(free);
        const next = (r + DIRS[dir][0]) * n + c + DIRS[dir][1];
        owner[next] = thermos.length;
        path.push(next);
      }
      thermos.push(path);
    }
    // samotną bańkę doklej na koniec sąsiedniego termometru (bez skrętu, jeśli skręty są wyłączone)
    const adj = (a, b) => Math.abs(a - b) === n || (Math.abs(a - b) === 1 && ((a / n) | 0) === ((b / n) | 0));
    for (const one of thermos.filter((t) => t.length === 1)) {
      const host = thermos.find((t) => {
        const end = t[t.length - 1];
        return t.length > 1 && t.length < maxLen + 1 && adj(end, one[0]) && (bend || end - t[t.length - 2] === one[0] - end);
      });
      if (host) { host.push(one[0]); one.pop(); }
    }
    return thermos.filter((t) => t.length);
  }

  const counts = (n, thermos, levels) => {
    const rows = new Array(n).fill(0), cols = new Array(n).fill(0);
    thermos.forEach((t, k) => t.slice(0, levels[k]).forEach((i) => { rows[(i / n) | 0]++; cols[i % n]++; }));
    return { rows, cols };
  };

  // Liczy rozwiązania (do limit). Termometry po kolei, odcinanie po sumach wierszy i kolumn.
  function solve(n, thermos, rows, cols, limit = 2) {
    const order = thermos.map((t, k) => k).sort((a, b) => Math.min(...thermos[a]) - Math.min(...thermos[b]));
    const rc = new Array(n).fill(0), cc = new Array(n).fill(0), rr = new Array(n).fill(n), cr = new Array(n).fill(n);
    const levels = new Array(thermos.length).fill(0);
    let found = 0, first = null;
    const ok = (t) => t.every((i) => {
      const r = (i / n) | 0, c = i % n;
      return rc[r] <= rows[r] && rc[r] + rr[r] >= rows[r] && cc[c] <= cols[c] && cc[c] + cr[c] >= cols[c];
    });
    (function rec(k) {
      if (found >= limit) return;
      if (k === order.length) { if (!found) first = levels.slice(); found++; return; }
      const t = thermos[order[k]];
      t.forEach((i) => { rr[(i / n) | 0]--; cr[i % n]--; });
      for (let l = 0; l <= t.length; l++) {
        if (l) { const i = t[l - 1]; rc[(i / n) | 0]++; cc[i % n]++; }
        levels[order[k]] = l;
        if (ok(t)) rec(k + 1);
      }
      t.forEach((i) => { rc[(i / n) | 0]--; cc[i % n]--; rr[(i / n) | 0]++; cr[i % n]++; });
    })(0);
    return { found, first };
  }

  // Losuje planszę z jednym rozwiązaniem.
  function generate(n, maxLen, bend) {
    for (;;) {
      const thermos = split(n, maxLen, bend);
      const sol = thermos.map((t) => rnd(t.length + 1));
      const { rows, cols } = counts(n, thermos, sol);
      if (rows.reduce((a, b) => a + b, 0) >= n && solve(n, thermos, rows, cols).found === 1) return { n, thermos, sol, rows, cols };
    }
  }

  // Tryb bez końca: plansza nr k (od 0) i czas dodawany za jej rozwiązanie.
  // 5 × 5 proste (jak łatwy), 5 × 5 z zakrętami, 6 × 6 (jak średni), 7 × 7, od 11. planszy 8 × 8 (jak trudny), potem dłuższe termometry i mniej czasu.
  function stage(k) {
    if (k < 2) return { n: 5, maxLen: 4, bend: false, bonus: 40 };
    if (k < 4) return { n: 5, maxLen: 5, bend: true, bonus: 50 };
    if (k < 6) return { n: 6, maxLen: 5, bend: true, bonus: 70 };
    if (k < 10) return { n: 7, maxLen: k < 8 ? 5 : 6, bend: true, bonus: 95 };
    return { n: 8, maxLen: k < 14 ? 6 : 7, bend: true, bonus: Math.max(45, 130 - 5 * (k - 10)) };
  }

  // Punkty profilu za bieg z liczby rozwiązanych plansz: 1 plansza 5, 5 plansz (pierwsza 6 × 6) 25,
  // 11 plansz (pierwsza 8 × 8) 50, dalej każda plansza o 1 pkt więcej od poprzedniej; limit 150 nakłada platforma.
  function runPoints(score) {
    if (score <= 5) return 5 * score;
    if (score <= 11) return Math.round(25 + (score - 5) * 25 / 6);
    const d = score - 11;
    return Math.min(150, 50 + 5 * d + (d * (d + 1)) / 2);
  }

  if (typeof module !== "undefined") module.exports = { split, solve, generate, counts, stage, runPoints };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "termometry",
    cat: "logiczne",
    name: "Termometry",
    author: "Claude Opus 5.5",
    desc: "Napełnij termometry od bańki tak, by liczby przy wierszach i kolumnach zgadzały się z wypełnionymi polami.",
    color: "#c0392b",
    ink: "#ffffff",
    glyph: ["#.###", "#....", "#.#..", "..#.#", "###.#"],
    levels: [
      { key: "easy", name: "5 × 5", points: 10, n: 5, maxLen: 4, bend: false },
      { key: "medium", name: "6 × 6", points: 25, n: 6, maxLen: 5, bend: true },
      { key: "hard", name: "8 × 8", points: 50, n: 8, maxLen: 6, bend: true },
    ],
    // bieg na czas: start (s) na zegarze, kara za podpowiedź (s)
    endless: { unit: ["plansza", "plansze", "plansz"], start: 150, hintCost: 20 },
    rules: [
      "Termometr napełnia się od bańki bez przerw: pole jest pełne tylko razem ze wszystkimi polami bliżej bańki.",
      "Liczba przy wierszu i kolumnie mówi, ile pól w nim jest wypełnionych.",
      "Kliknij pole, by napełnić termometr do niego. Kliknięcie ostatniego pełnego pola obniża poziom o jedno.",
      "Strzałki przesuwają kursor, spacja działa jak kliknięcie.",
      "W trybie ∞ rozwiązujesz kolejne, coraz większe plansze na czas: każda dodaje sekundy, podpowiedź je zabiera.",
    ],
    achievements: [
      { id: "bez-cofania", name: "Pewna ręka", desc: "Rozwiąż planszę bez cofania i bez podpowiedzi.", points: 10 },
      { id: "sprint", name: "Szybki pomiar", desc: "Rozwiąż poziom 6 × 6 w mniej niż 90 sekund.", points: 25 },
      { id: "goraczka", name: "Gorączka", desc: "Rozwiąż poziom 8 × 8 w mniej niż 3 minuty bez podpowiedzi.", points: 50 },
      { id: "seria", name: "Seria pomiarów", desc: "W trybie bez końca rozwiąż 6 plansz w jednym biegu.", points: 25 },
      { id: "upal", name: "Upał", desc: "W trybie bez końca rozwiąż 14 plansz w jednym biegu.", points: 50 },
    ],

    mount(board, ctx) {
      const endless = !!ctx.level.endless;
      const run = { score: 0, time: ctx.level.start, busy: false, timer: 0, wait: 0 };
      // bieżąca plansza; w trybie bez końca podmieniana po każdym rozwiązaniu
      let n, thermos, sol, rows, cols, m, owner, pos, cells, rowClue, colClue, goal, s;
      let no = 0; // numer planszy: cofanie i klawisze dotyczą tylko bieżącej

      const info = statBlock(ctx, endless ? "Czas" : "Pełne pola", { meter: true });
      const stats = endless ? statsBlock(ctx, "Bieg", ["Plansze", "Pełne pola", "Za bieg"]) : null;
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint),
        ...(endless ? [button("Zakończ bieg", "btn-ghost wide", () => end("Bieg zakończony."))] : [])));
      const save = ctx.undoable((snap) => { if (snap.no !== no) return; s.levels = snap.levels; render(); });

      function build(cfg) {
        ({ n, thermos, sol, rows, cols } = generate(cfg.n, cfg.maxLen, cfg.bend));
        m = n + 1;
        no++;
        ctx.clearUndo();
        s = { levels: thermos.map(() => 0), cursor: 0, hints: 0, undos: ctx.undos };
        owner = []; pos = [];
        thermos.forEach((t, k) => t.forEach((i, j) => { owner[i] = k; pos[i] = j; }));

        board.replaceChildren();
        const all = gridCells(board, m, m, "tm", { gap: 0.06, label: null });
        board.style.setProperty("--max", "72px");
        cells = Array.from({ length: n * n }, (_, i) => all[(((i / n) | 0) + 1) * m + (i % n) + 1]);
        rowClue = rows.map((_, r) => all[(r + 1) * m]);
        colClue = cols.map((_, c) => all[c + 1]);
        all[0].classList.add("corner");
        all[0].setAttribute("aria-label", "Liczby pełnych pól w wierszach i kolumnach");
        [all[0], ...rowClue, ...colClue].forEach((b) => { b.disabled = true; b.tabIndex = -1; });
        rowClue.forEach((b, r) => { b.classList.add("clue"); b.textContent = rows[r]; b.setAttribute("aria-label", `Wiersz ${r + 1}: ${rows[r]} pełnych`); });
        colClue.forEach((b, c) => { b.classList.add("clue"); b.textContent = cols[c]; b.setAttribute("aria-label", `Kolumna ${c + 1}: ${cols[c]} pełnych`); });

        // kierunek z pola a do sąsiada b: n, e, s, w
        const side = (a, b) => (b === a - n ? "n" : b === a + 1 ? "e" : b === a + n ? "s" : "w");
        thermos.forEach((t) => t.forEach((i, j) => {
          const b = cells[i];
          b.dataset.t = i;
          b.style.setProperty("--k", ((i / n) | 0) + (i % n));
          if (j === 0) b.classList.add("bulb");
          else b.classList.add("p-" + side(i, t[j - 1]));
          if (j < t.length - 1) b.classList.add("x-" + side(i, t[j + 1]));
        }));
        goal = rows.reduce((a, b) => a + b, 0);

        // klawisze tej planszy; po zmianie planszy stare nasłuchy nic już nie robią
        const mine = no;
        cellKeys(ctx, { cols: n, rows: n, get: () => s.cursor, set: (i) => { if (mine === no) { s.cursor = i; render(); } }, keys: { " ": () => mine === no && press(s.cursor) } });
        render();
      }

      function press(i) {
        if (ctx.done || run.busy) return;
        s.cursor = i;
        const k = owner[i], want = s.levels[k] === pos[i] + 1 ? pos[i] : pos[i] + 1;
        save({ no, levels: s.levels.slice() });
        s.levels[k] = want;
        want > pos[i] ? Sound.place(1 + pos[i]) : Sound.erase();
        after();
      }

      function hint() {
        if (ctx.done || run.busy) return;
        const k = s.levels.findIndex((l, k) => l !== sol[k]);
        if (k < 0) return;
        s.hints++;
        save({ no, levels: s.levels.slice() });
        s.levels[k] = sol[k];
        sweep(thermos[k].map((i) => cells[i]));
        if (endless) {
          run.time = Math.max(1, run.time - ctx.level.hintCost);
          ctx.toast(`Ten termometr jest już dobrze, −${ctx.level.hintCost} s`);
          tick(0);
        } else ctx.toast("Ten termometr jest już dobrze");
        after();
      }

      function after() {
        if (!render()) return;
        if (ctx.undos === s.undos && !s.hints) ctx.achieve("bez-cofania");
        if (!endless) {
          if (ctx.level.key === "medium" && ctx.time < 90) ctx.achieve("sprint");
          if (ctx.level.key === "hard" && ctx.time < 180 && !s.hints) ctx.achieve("goraczka");
          return ctx.win(s.hints ? `Podpowiedzi: ${s.hints}.` : "Bez podpowiedzi.");
        }
        // bieg: czas za planszę, chwila oddechu i następna plansza
        const bonus = stage(run.score).bonus;
        run.score++;
        run.time += bonus;
        if (run.score >= 6) ctx.achieve("seria");
        if (run.score >= 14) ctx.achieve("upal");
        Sound.line();
        sweep(cells);
        const next = stage(run.score);
        ctx.toast(next.n !== n ? `Plansza ${next.n} × ${next.n}, +${bonus} s` : `Rozwiązane, +${bonus} s`);
        run.busy = true;
        tick(0);
        run.wait = setTimeout(() => { run.busy = false; build(next); }, 900);
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.t != null) press(+b.dataset.t);
      });

      // zegar biegu: odlicza tylko podczas rozwiązywania, nie w przerwie między planszami
      function tick(dt) {
        if (ctx.done) return;
        if (!run.busy) run.time = Math.max(0, run.time - dt);
        info.set(fmt(run.time), Math.min(1, run.time / ctx.level.start), run.time <= 30 ? "Mało czasu" : "");
        stats.set("Plansze", run.score);
        stats.set("Za bieg", `${runPoints(run.score)} pkt`);
        if (dt && run.time === 30) ctx.toast("Zostało 30 sekund");
        if (run.time <= 0) end("Koniec czasu.");
      }

      function end(why) {
        if (ctx.done) return;
        clearInterval(run.timer);
        clearTimeout(run.wait);
        const k = run.score;
        ctx.over(k, runPoints(k), `${why} Rozwiązane: ${k} ${plural(k, "plansza", "plansze", "plansz")}.`);
      }

      // zwraca true, gdy wszystkie liczby się zgadzają
      function render() {
        const full = (i) => pos[i] < s.levels[owner[i]];
        const have = counts(n, thermos, s.levels);
        cells.forEach((b, i) => {
          b.classList.toggle("full", full(i));
          b.classList.toggle("cut", s.levels[owner[i]] === pos[i] + 1);
          b.classList.toggle("cursor", i === s.cursor);
          b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}${pos[i] ? "" : ", bańka"}, ${full(i) ? "pełne" : "puste"}`);
        });
        const state = (b, h, w) => { b.classList.toggle("ok", h === w); b.classList.toggle("over", h > w); };
        rowClue.forEach((b, r) => state(b, have.rows[r], rows[r]));
        colClue.forEach((b, c) => state(b, have.cols[c], cols[c]));
        const filled = have.rows.reduce((a, b) => a + b, 0);
        if (endless) stats.set("Pełne pola", `${filled} z ${goal}`);
        else info.set(`${filled} z ${goal}`, Math.min(1, filled / goal));
        const solved = have.rows.every((v, r) => v === rows[r]) && have.cols.every((v, c) => v === cols[c]);
        ctx.progress(solved ? 1 : Math.min(filled, goal) / goal * 0.95);
        return solved;
      }

      build(endless ? stage(0) : ctx.level);
      if (endless) {
        tick(0);
        run.timer = setInterval(() => tick(1), 1000);
        ctx.onStop(() => { clearInterval(run.timer); clearTimeout(run.wait); });
      }
    },
  });
}
