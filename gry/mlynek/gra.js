// Młynek: klasyczna gra w młynka z komputerem. Najpierw rozstawiasz pionki, potem je przesuwasz,
// a trzy pionki w jednej linii tworzą młyn, który pozwala zdjąć pionek rywala.
{
  // --- Plansza: 24 pola w trzech współśrodkowych kwadratach ---
  // Każda linia to trzy pola; kolejność indeksów tworzy pierścienie i cztery ramiona.
  const LINES = [
    [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
    [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
    [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
    [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
  ];
  // Położenie pól na siatce 7 × 7: [wiersz, kolumna].
  const COORDS = [
    [0, 0], [0, 3], [0, 6], [3, 6], [6, 6], [6, 3], [6, 0], [3, 0],
    [1, 1], [1, 3], [1, 5], [3, 5], [5, 5], [5, 3], [5, 1], [3, 1],
    [2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [4, 2], [3, 2],
  ];
  const ADJ = Array.from({ length: 24 }, () => []);
  for (const L of LINES) for (let i = 0; i < 2; i++) {
    const a = L[i], b = L[i + 1];
    if (!ADJ[a].includes(b)) { ADJ[a].push(b); ADJ[b].push(a); }
  }

  const count = (b, p) => b.filter((v) => v === p).length;
  const millsOf = (b, p) => LINES.filter((L) => L.every((i) => b[i] === p));
  const formsMill = (b, i, p) => LINES.some((L) => L.includes(i) && L.every((k) => b[k] === p));

  // Ruchy gracza p: rozstawianie (hand > 0) albo przesuwanie, a przy trzech pionkach przeskok w dowolne miejsce.
  function moves(b, p, hand) {
    const out = [];
    if (hand > 0) { for (let i = 0; i < 24; i++) if (!b[i]) out.push({ from: -1, to: i }); return out; }
    const fly = count(b, p) === 3;
    for (let i = 0; i < 24; i++) if (b[i] === p) {
      if (fly) { for (let j = 0; j < 24; j++) if (!b[j]) out.push({ from: i, to: j }); }
      else for (const j of ADJ[i]) if (!b[j]) out.push({ from: i, to: j });
    }
    return out;
  }

  // Pionki rywala do zbicia: najpierw te spoza młyna.
  function removable(b, q) {
    const blocked = new Set();
    for (const L of millsOf(b, q)) L.forEach((i) => blocked.add(i));
    const all = [], free = [];
    for (let i = 0; i < 24; i++) if (b[i] === q) { all.push(i); if (!blocked.has(i)) free.push(i); }
    return free.length ? free : all;
  }
  // Zbicie pionka, po którym rywal ma najmniej widoków na młyn.
  function removeScore(b, q, i) {
    const nb = b.slice();
    nb[i] = 0;
    let s = 0;
    for (const L of LINES) if (L.includes(i) && L.filter((k) => nb[k] === q).length === 2 && L.filter((k) => !nb[k]).length === 1) s += 2;
    return s;
  }
  function evaluate(b, hand, p) {
    const q = 3 - p;
    let pot = 0;
    for (const L of LINES) {
      const v = L.map((i) => b[i]).filter(Boolean);
      if (v.length === 2 && v[0] === v[1]) pot += v[0] === p ? 1 : -1;
    }
    return 120 * (count(b, p) + hand[p - 1] - count(b, q) - hand[q - 1]) + 55 * (millsOf(b, p).length - millsOf(b, q).length) + 12 * pot;
  }

  let nodes = 0;
  function negamax(b, hand, turn, depth, alpha, beta) {
    const opp = 3 - turn;
    if (!hand[0] && !hand[1] && (count(b, turn) < 3 || !moves(b, turn, 0).length)) return -8000 - depth;
    if (depth === 0 || ++nodes > 90000) return evaluate(b, hand, turn);
    let best = -Infinity;
    for (const mv of moves(b, turn, hand[turn - 1])) {
      const nb = b.slice(), nh = hand.slice();
      if (mv.from < 0) nh[turn - 1]--; else nb[mv.from] = 0;
      nb[mv.to] = turn;
      if (formsMill(nb, mv.to, turn)) {
        const c = removable(nb, opp);
        if (c.length) {
          let bi = c[0], bs = -1;
          for (const x of c) { const s = removeScore(nb, opp, x); if (s > bs) { bs = s; bi = x; } }
          nb[bi] = 0;
        }
      }
      const v = -negamax(nb, nh, opp, depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Ruch komputera: poziom 0 (łatwy) gra z szumem i na płytko, poziom 2 (trudny) szuka na trzy ruchy naprzód.
  function bestMove(b, hand, turn, level) {
    const depth = [1, 2, 3][level] || 1;
    const noise = level === 0 ? 45 : level === 1 ? 8 : 0;
    const list = moves(b, turn, hand[turn - 1]);
    if (!list.length) return null;
    nodes = 0;
    let best = null, alpha = -Infinity;
    for (const mv of list) {
      const nb = b.slice(), nh = hand.slice();
      if (mv.from < 0) nh[turn - 1]--; else nb[mv.from] = 0;
      nb[mv.to] = turn;
      let rm = -1;
      if (formsMill(nb, mv.to, turn)) {
        const c = removable(nb, 3 - turn);
        if (c.length) {
          let bi = c[0], bs = -1;
          for (const x of c) { const s = removeScore(nb, 3 - turn, x); if (s > bs) { bs = s; bi = x; } }
          nb[bi] = 0;
          rm = bi;
        }
      }
      const v = -negamax(nb, nh, 3 - turn, depth - 1, -Infinity, -alpha) + (noise ? (Math.random() - 0.5) * noise : 0);
      if (!best || v > alpha) { alpha = v; best = { ...mv, rm }; }
    }
    return best;
  }

  // Nawigacja klawiaturą po polach leżących w tym samym wierszu albo kolumnie.
  const stepNav = (i, axis, sign) => {
    const [r, c] = COORDS[i];
    let best = -1, bd = Infinity;
    COORDS.forEach(([r2, c2], j) => {
      if (axis === "row" ? r2 !== r : c2 !== c) return;
      const d = (axis === "row" ? c2 - c : r2 - r) * sign;
      if (d > 0 && d < bd) { bd = d; best = j; }
    });
    return best;
  };

  if (typeof module !== "undefined") module.exports = { LINES, COORDS, ADJ, moves, millsOf, removable, bestMove, count, formsMill };

  if (typeof registerGame !== "undefined") registerGame({
    id: "mlynek",
    cat: "planszowe",
    name: "Młynek",
    author: "DeepSeek V4.1 Flash",
    desc: "Ustaw trzy pionki w linii i zbijaj pionki komputera w klasycznej grze w młynka.",
    color: "#6b4423",
    ink: "#ffffff",
    glyph: ["#####", "#...#", "#.#.#", "#...#", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, ai: 0 },
      { key: "medium", name: "Średni", points: 25, ai: 1 },
      { key: "hard", name: "Trudny", points: 50, ai: 2 },
    ],
    rules: [
      "Na zmianę z komputerem stawiacie po dziewięć pionków, a potem przesuwacie je po liniach na wolne pole.",
      "Trzy pionki w jednej linii tworzą młyn: wtedy zdejmujesz jeden pionek komputera.",
      "Gdy zostają ci trzy pionki, możesz przeskakiwać na dowolne wolne pole.",
      "Przegrywasz, mając mniej niż trzy pionki albo bez możliwego ruchu.",
      "Klikasz pole, aby postawić, wybrać i przesunąć pionek. Klawiatura: strzałki, Enter, Escape.",
    ],
    achievements: [
      { id: "podwojny-mlyn", name: "Podwójny młyn", desc: "Ułóż dwa młyny w jednej partii.", points: 10 },
      { id: "trzeci-pionek", name: "Trzeci pionek", desc: "Domknij młyn już przy trzecim postawionym pionku.", points: 25 },
      { id: "bez-straty", name: "Bez straty", desc: "Wygraj, tracąc najwyżej dwa pionki.", points: 25 },
      { id: "mistrz-mlyna", name: "Mistrz młyna", desc: "Wygraj trudny poziom, tracąc najwyżej trzy pionki.", points: 50 },
    ],

    mount(board, ctx) {
      const ai = ctx.level.ai;
      const b = new Array(24).fill(0);
      const hand = [9, 9];
      let turn = 1, sel = -1, cursor = 0, removing = false, thinking = false;
      let myMills = 0, millsAtThird = -1, myLost = 0;

      const cells = gridCells(board, 7, 7, "ml", { gap: 0, label: null });
      const isPoint = new Array(49).fill(false);
      const at = {};
      COORDS.forEach(([r, c], i) => { isPoint[r * 7 + c] = true; at[r * 7 + c] = i; });
      cells.forEach((c, k) => {
        if (!isPoint[k]) { c.classList.add("blank"); c.tabIndex = -1; c.disabled = true; c.setAttribute("aria-hidden", "true"); }
        else c.setAttribute("aria-label", `Pole ${at[k] + 1}`);
      });
      // tory planszy rysowane pod pionkami
      const NS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 7 7");
      svg.setAttribute("class", "ml-svg");
      svg.setAttribute("aria-hidden", "true");
      const lineEls = LINES.map((L) => {
        const ln = document.createElementNS(NS, "line");
        const [r1, c1] = COORDS[L[0]], [r3, c3] = COORDS[L[2]];
        ln.setAttribute("x1", c1 + 0.5); ln.setAttribute("y1", r1 + 0.5);
        ln.setAttribute("x2", c3 + 0.5); ln.setAttribute("y2", r3 + 0.5);
        ln.setAttribute("pathLength", "1");
        svg.append(ln);
        return ln;
      });
      board.append(svg);

      const meEl = statBlock(ctx, "Twoje pionki", { small: true });
      const aiEl = statBlock(ctx, "Pionki komputera", { small: true });
      const turnEl = el("p", "turn");
      ctx.panel.append(panelBlock("Ruch", turnEl));

      const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

      function act(i) {
        if (ctx.done || turn !== 1 || thinking || removing) return;
        if (b[i] === 0) {
          if (hand[0] > 0) return place(i);
          if (sel >= 0 && canReach(sel, i)) return move(sel, i);
        } else if (b[i] === 1 && hand[0] === 0) {
          sel = sel === i ? -1 : i;
          Sound.tap();
          render();
        }
      }
      const canReach = (from, to) => (count(b, 1) === 3 ? true : ADJ[from].includes(to));

      function place(i) {
        b[i] = 1;
        hand[0]--;
        cursor = i;
        Sound.place(9 - hand[0]);
        after(1, i);
      }
      function move(from, to) {
        b[from] = 0;
        b[to] = 1;
        sel = -1;
        cursor = to;
        Sound.place(7);
        after(1, to);
      }
      // Wspólne zakończenie ruchu gracza: młyn, zbicie, koniec partii albo kolej komputera.
      function after(p, to) {
        render();
        if (p === 1 && LINES.some((L) => L.includes(to) && L.every((k) => b[k] === 1))) {
          myMills++;
          if (millsAtThird < 0) millsAtThird = 9 - hand[0];
          Sound.line();
          if (removable(b, 2).length) { removing = true; render(); return; }
        }
        endTurn(p);
      }

      function endTurn(p) {
        if (checkEnd()) return;
        if (p === 1) {
          turn = 2;
          thinking = true;
          render();
          wait(aiTurn, 360);
        } else {
          turn = 1;
          thinking = false;
          render();
        }
      }

      let ghost = null; // podświetlenie ruchu komputera, zanim pionek stanie na polu
      function aiTurn() {
        const mv = bestMove(b, hand, 2, ai);
        thinking = false;
        if (ctx.done) return render();
        if (!mv) { endTurn(2); return render(); }
        ghost = mv;
        Sound.place(4);
        render();
        wait(() => {
          if (ctx.done) return;
          apply(mv, 2);
          ghost = null;
          render();
          if (mv.rm >= 0) { cells[COORDS[mv.rm][0] * 7 + COORDS[mv.rm][1]].classList.add("zap"); Sound.erase(); }
          wait(() => { if (!ctx.done) endTurn(2); }, 260);
        }, 320);
      }

      function apply(mv, p) {
        if (mv.from < 0) hand[p - 1]--; else b[mv.from] = 0;
        b[mv.to] = p;
        if (LINES.some((L) => L.includes(mv.to) && L.every((k) => b[k] === p)) && mv.rm >= 0) {
          if (p === 2) myLost++;
          b[mv.rm] = 0;
        }
      }

      function checkEnd() {
        if (hand[0] || hand[1]) return false;
        if (ctx.done) return true;
        const me = count(b, 1), him = count(b, 2);
        if (him < 3 || !moves(b, 2, 0).length) return done(true);
        if (me < 3 || !moves(b, 1, 0).length) return done(false);
        return false;
      }
      function done(won) {
        if (won) {
          if (myMills >= 2) ctx.achieve("podwojny-mlyn");
          if (millsAtThird === 3) ctx.achieve("trzeci-pionek");
          if (myLost <= 2) ctx.achieve("bez-straty");
          if (ctx.level.key === "hard" && myLost <= 3) ctx.achieve("mistrz-mlyna");
          ctx.win(myLost ? `Stracone pionki: ${myLost}.` : "Bez straty ani jednego pionka.");
        } else {
          ctx.lose("Komputer wygrał", `Twoje pionki: ${count(b, 1)}.`);
        }
        return true;
      }

      function render() {
        let myMillLines = new Set(), hisMillLines = new Set();
        LINES.forEach((L, k) => {
          if (L.every((i) => b[i] === 1)) L.forEach((i) => myMillLines.add(i));
          if (L.every((i) => b[i] === 2)) L.forEach((i) => hisMillLines.add(i));
        });
        const targets = removing ? new Set(removable(b, 2)) : null;
        cells.forEach((c, k) => {
          if (!isPoint[k]) return;
          const i = at[k];
          c.dataset.p = b[i] || "";
          c.classList.toggle("sel", i === sel);
          c.classList.toggle("cur", i === cursor);
          c.classList.toggle("mill", myMillLines.has(i));
          c.classList.toggle("foe", hisMillLines.has(i));
          c.classList.toggle("target", !!targets && targets.has(i));
          c.classList.toggle("reach", sel >= 0 && b[i] === 0 && canReach(sel, i));
          c.classList.toggle("ghost", !!ghost && (ghost.from === i || ghost.to === i));
        });
        lineEls.forEach((ln, k) => ln.classList.toggle("on", LINES[k].every((i) => b[i] === 1 || b[i] === 2)));
        meEl.set(String(count(b, 1) + hand[0]), null, hand[0] ? `w ręku: ${hand[0]}` : "na planszy");
        aiEl.set(String(count(b, 2) + hand[1]), null, hand[1] ? `w ręku: ${hand[1]}` : "na planszy");
        turnEl.className = `turn${turn === 2 ? " ai" : ""}`;
        turnEl.replaceChildren(el("i"), ctx.done ? "Koniec partii" : removing ? "Zbij pionek komputera" : thinking || turn === 2 ? "Ruch komputera…" : "Twój ruch");
        ctx.progress(1 - (hand[0] + hand[1]) / 18);
      }

      function removeFoe(i) {
        b[i] = 0;
        myLost++;
        removing = false;
        Sound.erase();
        render();
        endTurn(1);
      }
      board.addEventListener("click", (e) => {
        const c = e.target.closest(".ml .gb-cell");
        if (!c || c.classList.contains("blank") || ctx.done) return;
        const i = at[+c.dataset.i];
        if (removing) { if (removable(b, 2).includes(i)) removeFoe(i); return; }
        act(i);
      });

      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
        const nav = { arrowup: ["col", -1], arrowdown: ["col", 1], arrowleft: ["row", -1], arrowright: ["row", 1] }[e.key.toLowerCase()];
        if (nav) {
          const j = stepNav(cursor, nav[0], nav[1]);
          if (j >= 0) { cursor = j; render(); }
        } else if (e.key === "Enter" || e.key === " ") {
          if (e.target.closest?.("button, a")) return;
          if (removing) { if (removable(b, 2).includes(cursor)) removeFoe(cursor); }
          else act(cursor);
        } else if (e.key === "Escape") { sel = -1; render(); }
        else return;
        e.preventDefault();
      });

      render();
    },
  });
}
