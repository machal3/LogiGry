// Kalaha: rozsiewanie kamieni po dołkach, magazyny, bicie z dołka naprzeciw i dodatkowe ruchy. Rywalem jest komputer (minimax).
{
  // --- Logika bez DOM ---
  // Plansza: 14 pól. 0..5 dołki gracza (od lewej), 6 jego magazyn, 7..12 dołki komputera (od prawej), 13 magazyn komputera.
  const STORE = [6, 13];
  const own = (turn, i) => (turn ? i >= 7 && i <= 12 : i >= 0 && i <= 5);
  const sideSum = (b, turn) => b.slice(turn ? 7 : 0, turn ? 13 : 6).reduce((a, x) => a + x, 0);
  const legal = (b, turn) => [0, 1, 2, 3, 4, 5].map((k) => k + (turn ? 7 : 0)).filter((i) => b[i] > 0);

  // Jeden ruch. Zwraca nową planszę, drogę kamieni, bicie, dodatkowy ruch i ewentualny koniec gry.
  function sow(board, turn, i) {
    const b = board.slice();
    let stones = b[i], pos = i;
    b[i] = 0;
    const path = [];
    while (stones) {
      pos = (pos + 1) % 14;
      if (pos === STORE[1 - turn]) continue;
      b[pos]++;
      path.push(pos);
      stones--;
    }
    const store = STORE[turn];
    const extra = pos === store;
    let captured = 0, from = -1;
    if (own(turn, pos) && b[pos] === 1 && b[12 - pos] > 0) {
      from = 12 - pos;
      captured = b[from] + 1;
      b[store] += captured;
      b[pos] = 0;
      b[from] = 0;
    }
    let over = false;
    const sweep = [];
    if (!sideSum(b, 0) || !sideSum(b, 1)) {
      over = true;
      for (let k = 0; k < 14; k++) {
        if (k === 6 || k === 13 || !b[k]) continue;
        const to = k < 6 ? 6 : 13;
        sweep.push([k, to, b[k]]);
        b[to] += b[k];
        b[k] = 0;
      }
    }
    return { b, path, last: pos, extra: extra && !over, captured, capPos: from >= 0 ? pos : -1, capFrom: from, over, sweep, next: extra && !over ? turn : 1 - turn };
  }

  // Ocena z punktu widzenia komputera (turn 1).
  const evaluate = (b, deep) => b[13] - b[6] + (deep ? (sideSum(b, 1) - sideSum(b, 0)) * 0.25 : 0);

  function search(b, turn, depth, alpha, beta, deep) {
    const moves = legal(b, turn);
    if (!depth || !moves.length) return evaluate(b, deep);
    // ruchy dające dodatkowy ruch najpierw: lepsze cięcia
    moves.sort((x, y) => ((y + b[y]) % 14 === STORE[turn]) - ((x + b[x]) % 14 === STORE[turn]));
    let best = turn ? -Infinity : Infinity;
    for (const m of moves) {
      const r = sow(b, turn, m);
      const v = r.over ? (r.b[13] - r.b[6]) * 100 : search(r.b, r.next, r.next === turn ? depth : depth - 1, alpha, beta, deep);
      if (turn) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
      else { best = Math.min(best, v); beta = Math.min(beta, v); }
      if (beta <= alpha) break;
    }
    return best;
  }

  // Najlepszy ruch dla strony `turn`; `noise` to szansa na losowy ruch (łatwy poziom).
  function bestMove(b, turn, depth, noise = 0, deep = true) {
    const moves = legal(b, turn);
    if (noise && Math.random() < noise) return pick(moves);
    let best = moves[0], bestV = turn ? -Infinity : Infinity;
    for (const m of moves) {
      const r = sow(b, turn, m);
      const v = r.over ? (r.b[13] - r.b[6]) * 100 : search(r.b, r.next, r.next === turn ? depth : depth - 1, -Infinity, Infinity, deep);
      if (turn ? v > bestV : v < bestV) { bestV = v; best = m; }
    }
    return best;
  }

  const fresh = (n) => [n, n, n, n, n, n, 0, n, n, n, n, n, n, 0];

  if (typeof module !== "undefined") module.exports = { sow, legal, bestMove, fresh, sideSum };

  if (typeof registerGame !== "undefined") registerGame({
    id: "kalaha",
    cat: "planszowe",
    name: "Kalaha",
    author: "Claude Opus 5.5",
    desc: "Afrykańska gra w kamienie: rozsiewaj je po dołkach, zbieraj do swojego magazynu i przechytrz komputer.",
    color: "#9c5a2c",
    ink: "#ffffff",
    glyph: [".....", "#.#.#", ".....", "#.#.#", "....."],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, stones: 3, depth: 1, noise: 0.35, preview: true },
      { key: "medium", name: "Średni", points: 25, stones: 4, depth: 3, noise: 0, preview: true },
      { key: "hard", name: "Trudny", points: 50, stones: 4, depth: 6, noise: 0, preview: false },
    ],
    rules: [
      "Kliknij swój dołek na dole. Kamienie rozchodzą się po jednym w prawo, do Twojego magazynu i dalej na stronę rywala.",
      "Gdy ostatni kamień trafi do Twojego magazynu, ruszasz się jeszcze raz.",
      "Gdy ostatni kamień trafi do Twojego pustego dołka, zabierasz go razem z kamieniami z dołka naprzeciw.",
      "Gra kończy się, gdy któraś strona nie ma kamieni. Wygrywa ten, kto ma więcej w magazynie.",
      "Strzałki wybierają dołek, spacja albo Enter wykonuje ruch.",
    ],
    achievements: [
      { id: "dodatkowy", name: "Jeszcze raz", desc: "Zakończ ruch w swoim magazynie i zagraj ponownie.", points: 10 },
      { id: "lancuch", name: "Łańcuch", desc: "Wykonaj trzy ruchy z rzędu dzięki dodatkowym ruchom.", points: 25 },
      { id: "lup", name: "Wielki łup", desc: "Zbierz co najmniej 8 kamieni jednym biciem.", points: 25 },
      { id: "pogrom", name: "Pogrom", desc: "Wygraj przewagą co najmniej 12 kamieni.", points: 25 },
      { id: "mistrz", name: "Mistrz dołków", desc: "Wygraj trudny poziom przewagą co najmniej 8 kamieni.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const s = { b: fresh(L.stones), turn: 0, busy: false, cursor: 0, chain: 0 };
      board.classList.add("kl-board");
      board.style.setProperty("--cols", 8.6);
      board.style.setProperty("--rows", 3.7);
      board.style.setProperty("--max", "110px");

      // środki pól w jednostkach --s
      const center = (i) => {
        if (i === 6) return [7.85, 1.85];
        if (i === 13) return [0.75, 1.85];
        if (i < 6) return [1.8 + i, 2.75];
        return [1.8 + (12 - i), 0.95];
      };
      const wood = el("div", "kl-wood");
      board.append(wood);
      const pits = [], counts = [];
      for (let i = 0; i < 14; i++) {
        const [x, y] = center(i);
        const store = i === 6 || i === 13;
        const node = store ? el("div", "kl-store") : i < 6 ? button("", "kl-pit mine", () => play(i)) : el("div", "kl-pit");
        node.style.setProperty("--x", x);
        node.style.setProperty("--y", y);
        node.dataset.i = i;
        wood.append(node);
        pits.push(node);
        const c = el("span", `kl-count${store ? " big" : ""}${i > 6 && i < 13 ? " top" : ""}`);
        c.style.setProperty("--x", x);
        c.style.setProperty("--y", store ? (i === 6 ? 3.45 : 0.25) : i < 6 ? 3.45 : 0.25);
        wood.append(c);
        counts.push(c);
      }
      const hintRing = el("span", "kl-target");
      wood.append(hintRing);

      // kamienie: każdy ma swój element, który płynie między dołkami
      const COLORS = 6;
      const stones = [];
      const spot = (i, k) => {
        const [x, y] = center(i);
        const store = i === 6 || i === 13;
        // rozsypanie: złota spirala, w magazynie rozciągnięta w pionie
        const a = k * 2.399, r = Math.sqrt(k + 0.5) * (store ? 0.11 : 0.1);
        return [x + Math.cos(a) * Math.min(store ? 0.3 : 0.3, r), y + Math.sin(a) * Math.min(store ? 1.1 : 0.3, r * (store ? 2.4 : 1))];
      };
      const place = (st, i, slot) => {
        st.pit = i;
        const [x, y] = spot(i, slot);
        st.el.style.setProperty("--x", x + st.jx);
        st.el.style.setProperty("--y", y + st.jy);
        st.el.style.zIndex = 3 + slot;
      };
      for (let i = 0; i < 14; i++) for (let k = 0; k < s.b[i]; k++) {
        const e = el("span", "kl-stone");
        e.style.setProperty("--kc", `var(--kalaha-g${1 + rnd(COLORS)})`);
        const st = { el: e, pit: i, jx: (Math.random() - 0.5) * 0.05, jy: (Math.random() - 0.5) * 0.05 };
        wood.append(e);
        stones.push(st);
        place(st, i, k);
      }
      const inPit = (i) => stones.filter((st) => st.pit === i);
      const settle = (i) => inPit(i).forEach((st, k) => place(st, i, k));

      const youEl = statBlock(ctx, "Twój magazyn", { meter: true });
      const aiEl = statBlock(ctx, "Komputer", { small: true });
      const turnEl = el("p", "kl-turn");
      const hintBtn = button("Podpowiedź", "btn-ghost wide", hint);
      ctx.panel.append(panelBlock("Ruch", turnEl, hintBtn));

      const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? ms / 4 : ms));
      let alive = true;
      ctx.onStop(() => { alive = false; });

      async function animate(turn, i, r) {
        const moving = inPit(i);
        pits[i].classList.add("lift");
        for (let k = 0; k < r.path.length; k++) {
          const to = r.path[k];
          place(moving[k], to, inPit(to).filter((st) => st !== moving[k]).length);
          Sound.place(1 + (k % 9));
          counts[to].textContent = (+counts[to].textContent || 0) + 1;
          counts[i].textContent = moving.length - k - 1 || "";
          await wait(190);
          if (!alive) return;
        }
        pits[i].classList.remove("lift");
        settle(i);
        if (r.capFrom >= 0) {
          await wait(260);
          pits[r.capFrom].classList.add("hit");
          Sound.line();
          for (const st of [...inPit(r.capPos), ...inPit(r.capFrom)]) place(st, STORE[turn], inPit(STORE[turn]).length);
          settle(STORE[turn]);
          ctx.toast(turn ? `Komputer zabiera ${r.captured}` : `Bicie: ${r.captured} ${plural(r.captured, "kamień", "kamienie", "kamieni")}`);
          await wait(420);
          pits[r.capFrom].classList.remove("hit");
        }
        if (r.sweep.length) {
          await wait(300);
          for (const [from, to] of r.sweep) for (const st of inPit(from)) place(st, to, inPit(to).length);
          settle(6);
          settle(13);
          Sound.flag();
          await wait(500);
        }
      }

      async function play(i) {
        if (ctx.done || s.busy || s.turn !== 0 || !s.b[i]) return;
        await move(0, i);
      }

      async function move(turn, i) {
        s.busy = true;
        hintRing.classList.remove("on");
        board.querySelectorAll(".kl-pit.hint").forEach((p) => p.classList.remove("hint"));
        const r = sow(s.b, turn, i);
        render();
        await animate(turn, i, r);
        if (!alive) return;
        s.b = r.b;
        if (!turn) {
          if (r.extra) {
            s.chain++;
            ctx.achieve("dodatkowy");
            if (s.chain >= 2) ctx.achieve("lancuch");
            ctx.toast("Dodatkowy ruch");
          } else s.chain = 0;
          if (r.captured >= 8) ctx.achieve("lup");
        }
        s.turn = r.next;
        s.busy = false;
        render();
        if (r.over) { finish(); return render(); }
        if (s.turn === 1) {
          s.busy = true;
          render();
          await wait(r.extra ? 450 : 650);
          if (!alive) return;
          s.busy = false;
          await move(1, bestMove(s.b, 1, L.depth, L.noise, L.key !== "easy"));
        }
      }

      function finish() {
        const me = s.b[6], ai = s.b[13];
        if (me > ai) {
          if (me - ai >= 12) ctx.achieve("pogrom");
          if (L.key === "hard" && me - ai >= 8) ctx.achieve("mistrz");
          ctx.win(`Wynik ${me} : ${ai}.`);
        } else ctx.lose(me === ai ? "Remis" : "Komputer wygrywa", `Wynik ${me} : ${ai}.`);
      }

      function hint() {
        if (ctx.done || s.busy || s.turn) return;
        const m = bestMove(s.b, 0, 5);
        pits[m].classList.add("hint");
        s.cursor = m;
        render();
        ctx.toast("Ten dołek wygląda najlepiej");
      }

      // gdzie spadnie ostatni kamień: podgląd na łatwym i średnim poziomie
      const preview = (i) => {
        if (!L.preview || s.busy || s.turn || !s.b[i] || ctx.done) return hintRing.classList.remove("on");
        const r = sow(s.b, 0, i);
        const [x, y] = center(r.last);
        hintRing.style.setProperty("--x", x);
        hintRing.style.setProperty("--y", y);
        hintRing.classList.toggle("store", r.last === 6);
        hintRing.classList.toggle("cap", r.capFrom >= 0);
        hintRing.classList.add("on");
      };
      pits.slice(0, 6).forEach((p, i) => {
        p.addEventListener("pointerenter", () => preview(i));
        p.addEventListener("pointerleave", () => hintRing.classList.remove("on"));
        p.addEventListener("focus", () => preview(i));
      });

      cellKeys(ctx, {
        cols: 6, rows: 1, get: () => s.cursor,
        set: (i) => { s.cursor = i; pits[i].focus({ preventScroll: true }); preview(i); render(); },
        keys: { " ": () => play(s.cursor), enter: () => play(s.cursor) },
      });

      function render() {
        const b = s.busy ? null : s.b;
        for (let i = 0; i < 14; i++) {
          const n = inPit(i).length;
          if (b) counts[i].textContent = n || (i === 6 || i === 13 ? "0" : "");
          if (i < 6) {
            pits[i].disabled = !s.b[i] || s.turn !== 0 || s.busy || ctx.done;
            pits[i].setAttribute("aria-label", `Twój dołek ${i + 1}, ${s.b[i]} ${plural(s.b[i], "kamień", "kamienie", "kamieni")}`);
            pits[i].classList.toggle("cursor", i === s.cursor);
          }
        }
        board.classList.toggle("ai-turn", s.turn === 1);
        turnEl.textContent = ctx.done ? "Koniec partii" : s.turn ? "Komputer myśli…" : s.busy ? "Kamienie w drodze" : "Twój ruch";
        hintBtn.disabled = s.turn !== 0 || s.busy;
        const total = L.stones * 12;
        youEl.set(s.b[6], s.b[6] / (total / 2 + 1), `Do wygranej potrzeba ${total / 2 + 1}`);
        aiEl.set(s.b[13]);
        ctx.progress((s.b[6] + s.b[13]) / total);
      }
      render();
    },
  });
}
