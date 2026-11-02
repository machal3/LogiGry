// Odważniki (Kakurasu): rozmieść odważniki na siatce n × n tak, aby sumy wag w wierszach i kolumnach zgadzały się z celami.
{
  // --- Logika bez DOM (test.js) ---

  // Oblicza bieżące sumy wierszy (waga pola w kolumnie c to c + 1) oraz kolumn (waga pola w wierszu r to r + 1).
  function sums(n, cells) {
    const rows = new Array(n).fill(0);
    const cols = new Array(n).fill(0);
    for (let i = 0; i < n * n; i++) {
      if (cells[i] === 1) {
        const r = (i / n) | 0, c = i % n;
        rows[r] += c + 1;
        cols[c] += r + 1;
      }
    }
    return { rows, cols };
  }

  // Liczy rozwiązania (do limit) metodą nawrotów po wierszach z odcinaniem po sumach kolumn.
  function solve(n, rows, cols, limit = 2) {
    const maxMask = 1 << n;
    const maskSum = new Int16Array(maxMask);
    for (let m = 1; m < maxMask; m++) {
      const bit = m & -m;
      const c = Math.clz32(bit) ^ 31;
      maskSum[m] = maskSum[m ^ bit] + (c + 1);
    }

    const rowMasks = Array.from({ length: n }, (_, r) => {
      const list = [];
      for (let m = 0; m < maxMask; m++) {
        if (maskSum[m] === rows[r]) list.push(m);
      }
      return list;
    });

    if (rowMasks.some((m) => !m.length)) return { found: 0, first: null };

    const order = [...Array(n).keys()].sort((a, b) => rowMasks[a].length - rowMasks[b].length);
    const colSum = new Int16Array(n);
    const chosen = new Int32Array(n);
    let remWeight = (n * (n + 1)) >> 1;
    let found = 0, first = null;

    (function rec(idx) {
      if (found >= limit) return;
      if (idx === n) {
        for (let c = 0; c < n; c++) if (colSum[c] !== cols[c]) return;
        if (!found) {
          first = new Array(n * n).fill(0);
          for (let r = 0; r < n; r++) {
            for (let c = 0; c < n; c++) if ((chosen[r] >> c) & 1) first[r * n + c] = 1;
          }
        }
        found++;
        return;
      }
      const r = order[idx], w = r + 1;
      remWeight -= w;
      const masks = rowMasks[r];
      for (let k = 0; k < masks.length; k++) {
        const m = masks[k];
        let ok = true;
        for (let c = 0; c < n; c++) {
          const next = colSum[c] + (((m >> c) & 1) ? w : 0);
          if (next > cols[c] || next + remWeight < cols[c]) { ok = false; break; }
        }
        if (!ok) continue;
        chosen[r] = m;
        for (let c = 0; c < n; c++) if ((m >> c) & 1) colSum[c] += w;
        rec(idx + 1);
        for (let c = 0; c < n; c++) if ((m >> c) & 1) colSum[c] -= w;
        if (found >= limit) break;
      }
      remWeight += w;
    })(0);

    return { found, first };
  }

  // Generuje planszę n × n z dokładnie jednym rozwiązaniem i bez pustych ani pełnych wierszy/kolumn.
  function generate(n) {
    const minW = Math.ceil(n * n * 0.34);
    const maxW = Math.floor(n * n * 0.66);
    const fullSum = (n * (n + 1)) >> 1;
    for (;;) {
      const sol = Array.from({ length: n * n }, () => (rnd(100) < 48 ? 1 : 0));
      const count = sol.reduce((a, b) => a + b, 0);
      if (count < minW || count > maxW) continue;
      const { rows, cols } = sums(n, sol);
      if (rows.some((v) => v === 0 || v === fullSum) || cols.some((v) => v === 0 || v === fullSum)) continue;
      if (solve(n, rows, cols, 2).found === 1) return { n, sol, rows, cols };
    }
  }

  function stage(k) {
    if (k < 2) return { n: 4, bonus: 35 };
    if (k < 5) return { n: 5, bonus: 50 };
    if (k < 9) return { n: 6, bonus: 75 };
    return { n: 7, bonus: Math.max(45, 110 - 5 * (k - 9)) };
  }

  function runPoints(score) {
    if (score <= 4) return 5 * score;
    if (score <= 10) return Math.round(20 + (score - 4) * 30 / 6);
    const d = score - 10;
    return Math.min(150, 50 + 6 * d + (d * (d + 1)) / 2);
  }

  if (typeof module !== "undefined") module.exports = { sums, solve, generate, stage, runPoints };

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "odwazniki",
    cat: "logiczne",
    name: "Odważniki",
    author: "Gemini 4 Argon, Gemini 3.8 Flash",
    desc: "Rozmieść odważniki na szachownicy tak, aby sumy ich wartości zgadzały się w każdym rzędzie.",
    color: "#9c4221",
    ink: "#ffffff",
    glyph: [".###.", "#.#.#", "#####", "#...#", "#####"],
    levels: [
      { key: "easy", name: "4 × 4", points: 10, n: 4 },
      { key: "medium", name: "5 × 5", points: 25, n: 5 },
      { key: "hard", name: "6 × 6", points: 50, n: 6 },
    ],
    endless: { unit: ["plansza", "plansze", "plansz"], start: 120, hintCost: 20 },
    rules: [
      "Każda kolumna i każdy wiersz ma wagę od 1 do N widoczną przy górnej oraz lewej krawędzi planszy.",
      "Postawienie odważnika na polu dodaje wagę kolumny do sumy wiersza i wagę wiersza do sumy kolumny.",
      "Kliknij pole lub naciśnij spację, by postawić odważnik; prawy przycisk, klawisz X lub tryb Puste oznacza pole krzyżykiem.",
      "Wygrywasz, gdy wszystkie sumy osiągną docelowe wartości z prawej strony i u dołu.",
    ],
    achievements: [
      { id: "bez-cofania", name: "Pewna ręka", desc: "Rozwiąż planszę bez cofania i bez podpowiedzi.", points: 10 },
      { id: "rachmistrz", name: "Rachmistrz", desc: "Rozwiąż poziom 5 × 5 w mniej niż 75 sekund bez podpowiedzi.", points: 25 },
      { id: "mistrz-wag", name: "Mistrz wag", desc: "Rozwiąż poziom 6 × 6 w mniej niż 150 sekund bez podpowiedzi.", points: 50 },
      { id: "seria", name: "Seria ważenia", desc: "W trybie bez końca rozwiąż 5 plansz w jednym biegu.", points: 25 },
      { id: "maraton", name: "Wielka waga", desc: "W trybie bez końca rozwiąż 10 plansz w jednym biegu.", points: 50 },
    ],

    mount(board, ctx) {
      const endless = !!ctx.level.endless;
      const run = { score: 0, time: ctx.level.start || 0, busy: false, timer: 0, wait: 0 };

      let n, sol, rows, cols, m, cells, rowClue, colClue, goal, s;
      let no = 0;
      let tool = "weight";

      const info = statBlock(ctx, endless ? "Czas" : "Ustawione sumy", { meter: true });
      const stats = endless ? statsBlock(ctx, "Bieg", ["Plansze", "Sumy", "Za bieg"]) : null;

      const seg = segmented("Narzędzie", ["Odważnik", "Puste ×"], (k) => {
        tool = k === 1 ? "mark" : "weight";
        seg.set(k);
      });
      seg.set(0);
      ctx.panel.append(
        panelBlock("Tryb ruchu", seg.el),
        panelBlock("", button("Podpowiedź", "btn-ghost wide", hint),
          ...(endless ? [button("Zakończ bieg", "btn-ghost wide", () => end("Bieg zakończony."))] : []))
      );

      const save = ctx.undoable((snap) => {
        if (snap.no !== no) return;
        s.cells = snap.cells;
        render();
      });

      function build(cfg) {
        ({ n, sol, rows, cols } = generate(cfg.n));
        m = n + 2;
        no++;
        ctx.clearUndo();
        s = { cells: new Array(n * n).fill(0), cursor: 0, hints: 0, undos: ctx.undos };

        board.replaceChildren();
        const all = gridCells(board, m, m, "odw-grid", { gap: 0.08, label: null });
        board.style.setProperty("--max", "68px");

        cells = [];
        rowClue = [];
        colClue = [];

        all.forEach((b, k) => {
          const r = (k / m) | 0, c = k % m;
          const isPlay = r >= 1 && r <= n && c >= 1 && c <= n;
          if (!isPlay) {
            b.disabled = true;
            b.tabIndex = -1;
            if ((r === 0 || r === n + 1) && (c === 0 || c === n + 1)) {
              b.classList.add("corner");
              if (r === 0 && c === 0) {
                b.textContent = "+";
                b.setAttribute("aria-label", "Wagi wierszy i kolumn");
              } else if (r === n + 1 && c === n + 1) {
                b.textContent = "Σ";
                b.setAttribute("aria-label", "Sumy docelowe");
              } else {
                b.setAttribute("aria-label", r === 0 ? "Kolumna sum wierszy" : "Wiersz sum kolumn");
              }
            } else if (r === 0) {
              b.classList.add("weight");
              b.textContent = c;
              b.setAttribute("aria-label", `Waga kolumny ${c}: ${c}`);
            } else if (c === 0) {
              b.classList.add("weight");
              b.textContent = r;
              b.setAttribute("aria-label", `Waga wiersza ${r}: ${r}`);
            } else if (c === n + 1) {
              b.classList.add("clue");
              const targetEl = el("span", "odw-target", String(rows[r - 1]));
              const curEl = el("span", "odw-cur", "0");
              b.replaceChildren(targetEl, curEl);
              rowClue[r - 1] = b;
            } else if (r === n + 1) {
              b.classList.add("clue");
              const targetEl = el("span", "odw-target", String(cols[c - 1]));
              const curEl = el("span", "odw-cur", "0");
              b.replaceChildren(targetEl, curEl);
              colClue[c - 1] = b;
            }
            return;
          }
          const idx = (r - 1) * n + (c - 1);
          b.dataset.i = idx;
          b.replaceChildren(el("span", "odw-puck"));
          cells[idx] = b;
        });

        goal = 2 * n;
        const mine = no;
        cellKeys(ctx, {
          cols: n,
          rows: n,
          get: () => s.cursor,
          set: (i) => { if (mine === no) { s.cursor = i; render(); } },
          keys: {
            " ": () => mine === no && act(s.cursor, tool === "mark"),
            enter: () => mine === no && act(s.cursor, tool === "mark"),
            x: () => mine === no && act(s.cursor, true),
            X: () => mine === no && act(s.cursor, true),
          },
        });
        render();
      }

      function act(i, asMark) {
        if (ctx.done || run.busy) return;
        s.cursor = i;
        const cur = s.cells[i];
        const next = asMark ? (cur === 2 ? 0 : 2) : (cur === 1 ? 0 : 1);
        save({ no, cells: s.cells.slice() });
        s.cells[i] = next;

        const r = (i / n) | 0, c = i % n;
        const have = sums(n, s.cells);
        const overloaded = next === 1 && (have.rows[r] > rows[r] || have.cols[c] > cols[c]);

        if (overloaded) {
          Sound.error();
          replay(cells[i], "shake");
        } else {
          next === 1 ? Sound.place(1 + ((r + c) % 8)) : next === 2 ? Sound.tap() : Sound.erase();
        }
        after();
      }

      function hint() {
        if (ctx.done || run.busy) return;
        // Najpierw popraw błędnie postawiony odważnik lub krzyżyk, a jeśli brak — odsłoń nieznane pole z odważnikiem.
        let idx = s.cells.findIndex((v, i) => (v === 1 && !sol[i]) || (v === 2 && sol[i]));
        if (idx < 0) idx = s.cells.findIndex((v, i) => v === 0 && sol[i]);
        if (idx < 0) idx = s.cells.findIndex((v, i) => (v === 1 ? 1 : 0) !== sol[i]);
        if (idx < 0) return;

        s.hints++;
        save({ no, cells: s.cells.slice() });
        s.cells[idx] = sol[idx] ? 1 : 2;
        s.cursor = idx;
        Sound.place(5);
        sweep([cells[idx]]);
        if (endless) {
          run.time = Math.max(1, run.time - ctx.level.hintCost);
          ctx.toast(`Odsłonięto pole, −${ctx.level.hintCost} s`);
          tick(0);
        } else {
          ctx.toast("Wskazano właściwy stan pola");
        }
        after();
      }

      function after() {
        if (!render()) return;
        if (ctx.undos === s.undos && !s.hints) ctx.achieve("bez-cofania");
        if (!endless) {
          if (ctx.level.key === "medium" && ctx.time < 75 && !s.hints) ctx.achieve("rachmistrz");
          if (ctx.level.key === "hard" && ctx.time < 150 && !s.hints) ctx.achieve("mistrz-wag");
          return ctx.win(s.hints ? `Podpowiedzi: ${s.hints}.` : "Idealna równowaga wszystkich rzędów.");
        }
        const bonus = stage(run.score).bonus;
        run.score++;
        run.time += bonus;
        if (run.score >= 5) ctx.achieve("seria");
        if (run.score >= 10) ctx.achieve("maraton");
        Sound.line();
        sweep(cells);
        const next = stage(run.score);
        ctx.toast(next.n !== n ? `Plansza ${next.n} × ${next.n}, +${bonus} s` : `Równowaga, +${bonus} s`);
        run.busy = true;
        tick(0);
        run.wait = setTimeout(() => { run.busy = false; build(next); }, 850);
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.i != null) act(+b.dataset.i, tool === "mark");
      });
      board.addEventListener("contextmenu", (e) => {
        const b = e.target.closest(".gb-cell");
        if (b?.dataset.i != null) {
          e.preventDefault();
          act(+b.dataset.i, true);
        }
      });

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

      function render() {
        const have = sums(n, s.cells);
        cells.forEach((b, i) => {
          const r = (i / n) | 0, c = i % n;
          const v = s.cells[i];
          const over = v === 1 && (have.rows[r] > rows[r] || have.cols[c] > cols[c]);
          b.classList.toggle("is-on", v === 1);
          b.classList.toggle("is-bad", over);
          b.classList.toggle("is-mark", v === 2);
          b.classList.toggle("cursor", i === s.cursor);
          const stateLabel = v === 1 ? "odważnik" : v === 2 ? "oznaczono jako puste" : "puste";
          b.setAttribute("aria-label", `Wiersz ${r + 1} (waga ${r + 1}), kolumna ${c + 1} (waga ${c + 1}), ${stateLabel}`);
        });

        let okCount = 0;
        rowClue.forEach((b, r) => {
          const h = have.rows[r], w = rows[r];
          if (h === w) okCount++;
          b.classList.toggle("ok", h === w);
          b.classList.toggle("over", h > w);
          b.lastChild.textContent = h;
          b.setAttribute("aria-label", `Suma wiersza ${r + 1}: ${h} z ${w}`);
        });
        colClue.forEach((b, c) => {
          const h = have.cols[c], w = cols[c];
          if (h === w) okCount++;
          b.classList.toggle("ok", h === w);
          b.classList.toggle("over", h > w);
          b.lastChild.textContent = h;
          b.setAttribute("aria-label", `Suma kolumny ${c + 1}: ${h} z ${w}`);
        });

        if (endless) {
          stats.set("Sumy", `${okCount} z ${goal}`);
        } else {
          info.set(`${okCount} z ${goal}`, okCount / goal);
        }
        const solved = okCount === goal;
        ctx.progress(solved ? 1 : (okCount / goal) * 0.95);
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
