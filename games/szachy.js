// Szachy: pełne zasady (roszada, bicie w przelocie, promocja, mat, pat, 50 posunięć, za mało materiału). Gracz gra białymi.
// Pozycja: b[i] dla i = r * 8 + c (r = 0 to 8. rząd), figury "PNBRQK" białe, "pnbrqk" czarne, "" puste.
const Chess = (() => {
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  // tablice pozycyjne z punktu widzenia białych (wiersz 0 = 8. rząd)
  const PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  };
  const white = (p) => p && p === p.toUpperCase();
  const side = (p) => (!p ? null : white(p) ? "w" : "b");
  function start() {
    const row = "rnbqkbnr";
    const b = Array(64).fill("");
    for (let c = 0; c < 8; c++) { b[c] = row[c]; b[8 + c] = "p"; b[48 + c] = "P"; b[56 + c] = row[c].toUpperCase(); }
    return { b, turn: "w", castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1 };
  }
  const R = (i) => (i / 8) | 0, C = (i) => i % 8;
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  // czy pole i jest atakowane przez stronę `by`
  function attacked(b, i, by) {
    const r = R(i), c = C(i), up = by === "w" ? 1 : -1;
    for (const dc of [-1, 1]) { const rr = r + up, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (by === "w" ? "P" : "p")) return true; }
    for (const [dr, dc] of KN) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (by === "w" ? "N" : "n")) return true; }
    for (const [dr, dc] of KG) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === (by === "w" ? "K" : "k")) return true; }
    for (const [dirs, kinds] of [[DIAG, "bq"], [ORTH, "rq"]]) for (const [dr, dc] of dirs) {
      for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < 8 && cc >= 0 && cc < 8; rr += dr, cc += dc) {
        const p = b[rr * 8 + cc];
        if (!p) continue;
        if (side(p) === by && kinds.includes(p.toLowerCase())) return true;
        break;
      }
    }
    return false;
  }
  // ruchy zgodne z zasadami: { from, to, promo?, ep?, castle? }
  function moves(st, onlyCaptures = false) {
    const { b, turn } = st, out = [], opp = turn === "w" ? "b" : "w";
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (side(p) !== turn) continue;
      const k = p.toLowerCase(), r = R(i), c = C(i);
      const add = (to, extra = {}) => {
        if (onlyCaptures && !b[to] && !extra.ep && !extra.promo) return;
        if (k === "p" && (R(to) === 0 || R(to) === 7)) for (const promo of "qrbn") out.push({ from: i, to, promo, ...extra });
        else out.push({ from: i, to, ...extra });
      };
      if (k === "p") {
        const dir = turn === "w" ? -1 : 1, one = i + dir * 8;
        if (r + dir >= 0 && r + dir < 8 && !b[one]) {
          add(one);
          const startRow = turn === "w" ? 6 : 1;
          if (r === startRow && !b[one + dir * 8]) add(one + dir * 8);
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc, to = (r + dir) * 8 + cc;
          if (cc < 0 || cc > 7 || r + dir < 0 || r + dir > 7) continue;
          if (side(b[to]) === opp) add(to);
          if (to === st.ep) add(to, { ep: true });
        }
      } else if (k === "n" || k === "k") {
        for (const [dr, dc] of k === "n" ? KN : KG) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7 || side(b[rr * 8 + cc]) === turn) continue;
          add(rr * 8 + cc);
        }
        if (k === "k" && !onlyCaptures && !attacked(b, i, opp)) {
          const home = turn === "w" ? 60 : 4, [ks, qs] = turn === "w" ? ["K", "Q"] : ["k", "q"];
          if (i === home && st.castle[ks] && !b[i + 1] && !b[i + 2] && !attacked(b, i + 1, opp) && !attacked(b, i + 2, opp)) out.push({ from: i, to: i + 2, castle: "k" });
          if (i === home && st.castle[qs] && !b[i - 1] && !b[i - 2] && !b[i - 3] && !attacked(b, i - 1, opp) && !attacked(b, i - 2, opp)) out.push({ from: i, to: i - 2, castle: "q" });
        }
      } else {
        const dirs = k === "b" ? DIAG : k === "r" ? ORTH : [...DIAG, ...ORTH];
        for (const [dr, dc] of dirs) for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < 8 && cc >= 0 && cc < 8; rr += dr, cc += dc) {
          const to = rr * 8 + cc;
          if (side(b[to]) === turn) break;
          add(to);
          if (b[to]) break;
        }
      }
    }
    // odrzucenie ruchów zostawiających własnego króla w szachu
    return out.filter((m) => { const n = play(st, m); return !attacked(n.b, n.b.indexOf(turn === "w" ? "K" : "k"), opp); });
  }
  function play(st, m) {
    const b = st.b.slice(), p = b[m.from], k = p.toLowerCase();
    const n = { b, turn: st.turn === "w" ? "b" : "w", castle: { ...st.castle }, ep: -1, half: st.half + 1, full: st.full + (st.turn === "b" ? 1 : 0) };
    if (k === "p" || b[m.to]) n.half = 0;
    b[m.to] = m.promo ? (st.turn === "w" ? m.promo.toUpperCase() : m.promo) : p;
    b[m.from] = "";
    if (m.ep) b[m.to + (st.turn === "w" ? 8 : -8)] = "";
    if (m.castle) {
      const [rf, rt] = m.castle === "k" ? [m.from + 3, m.from + 1] : [m.from - 4, m.from - 1];
      b[rt] = b[rf];
      b[rf] = "";
    }
    if (k === "p" && Math.abs(m.to - m.from) === 16) n.ep = (m.to + m.from) / 2;
    if (k === "k") { if (st.turn === "w") n.castle.K = n.castle.Q = false; else n.castle.k = n.castle.q = false; }
    for (const [sq, right] of [[63, "K"], [56, "Q"], [7, "k"], [0, "q"]]) if (m.from === sq || m.to === sq) n.castle[right] = false;
    return n;
  }
  const inCheck = (st) => attacked(st.b, st.b.indexOf(st.turn === "w" ? "K" : "k"), st.turn === "w" ? "b" : "w");
  function status(st) {
    const ms = moves(st);
    if (!ms.length) return inCheck(st) ? "mate" : "stalemate";
    if (st.half >= 100) return "fifty";
    const rest = st.b.filter((p) => p && p.toLowerCase() !== "k");
    if (!rest.length || (rest.length === 1 && "nbNB".includes(rest[0]))) return "material";
    return null;
  }
  function evaluate(st) {
    let s = 0;
    st.b.forEach((p, i) => {
      if (!p) return;
      const k = p.toLowerCase();
      const v = VAL[k] + PST[k][white(p) ? i : (7 - R(i)) * 8 + C(i)];
      s += white(p) ? v : -v;
    });
    return st.turn === "w" ? s : -s;
  }
  // kolejność: najpierw bicia cenniejszych figur słabszymi
  const order = (st, ms) => ms.sort((a, b) => (st.b[b.to] ? VAL[st.b[b.to].toLowerCase()] * 10 - VAL[st.b[b.from].toLowerCase()] : 0) + (b.promo ? 800 : 0) - ((st.b[a.to] ? VAL[st.b[a.to].toLowerCase()] * 10 - VAL[st.b[a.from].toLowerCase()] : 0) + (a.promo ? 800 : 0)));
  let nodes = 0;
  function quiesce(st, alpha, beta, depth = 0) {
    const stand = evaluate(st);
    if (stand >= beta || depth > 4) return stand;
    alpha = Math.max(alpha, stand);
    for (const m of order(st, moves(st, true))) {
      nodes++;
      const v = -quiesce(play(st, m), -beta, -alpha, depth + 1);
      if (v >= beta) return v;
      alpha = Math.max(alpha, v);
    }
    return alpha;
  }
  function search(st, depth, alpha, beta) {
    const ms = moves(st);
    if (!ms.length) return inCheck(st) ? -100000 - depth : 0;
    if (!depth) return quiesce(st, alpha, beta);
    let best = -Infinity;
    for (const m of order(st, ms)) {
      nodes++;
      const v = -search(play(st, m), depth - 1, -beta, -alpha);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
  function bestMove(st, depth, noise = 0) {
    nodes = 0;
    let best = null, bv = -Infinity;
    for (const m of order(st, moves(st))) {
      const v = -search(play(st, m), depth - 1, -Infinity, -bv + 1) + Math.random() * noise;
      if (v > bv) { bv = v; best = m; }
    }
    return best;
  }
  const NAMES = "abcdefgh";
  const square = (i) => `${NAMES[C(i)]}${8 - R(i)}`;
  // zapis ruchu w skrócie: figura, pole startowe, x przy biciu, pole docelowe
  function notation(st, m) {
    const p = st.b[m.from].toUpperCase();
    if (m.castle) return m.castle === "k" ? "O-O" : "O-O-O";
    const cap = st.b[m.to] || m.ep ? "x" : "–";
    const fig = { P: "", N: "S", B: "G", R: "W", Q: "H", K: "K" }[p];
    const after = play(st, m);
    const chk = status(after) === "mate" ? "#" : inCheck(after) ? "+" : "";
    return `${fig}${square(m.from)}${cap}${square(m.to)}${m.promo ? "=" + { q: "H", r: "W", b: "G", n: "S" }[m.promo] : ""}${chk}`;
  }
  const api = { start, moves, play, attacked, inCheck, status, evaluate, search, bestMove, notation, square, nodes: () => nodes, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Chess;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "szachy"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 20, depth: 1, noise: 120 },
    { key: "medium", name: "Średni", points: 50, depth: 3, noise: 25 },
    { key: "hard", name: "Trudny", points: 100, depth: 4, noise: 0 },
  ],
  rules: [
    "Grasz białymi, komputer czarnymi. Kliknij figurę, a potem jedno z podświetlonych pól. Obowiązują pełne zasady szachów.",
    "Roszada: przesuń króla o dwa pola w stronę wieży. Bicie w przelocie i promocja piona działają tak jak w turnieju; przy promocji wybierasz figurę.",
    "Wygrywasz, dając mata. Pat, powtórzenie 50 posunięć bez bicia i ruchu pionem albo zbyt mało materiału oznaczają remis.",
  ],
  achievements: [
    { id: "szybki-mat", name: "Szybki mat", desc: "Daj mata w najwyżej 40 posunięciach.", points: 10 },
    { id: "bez-cofania", name: "Bez odwrotu", desc: "Daj mata komputerowi na średnim poziomie bez cofania ruchu.", points: 25 },
    { id: "arcymistrz", name: "Arcymistrz", desc: "Daj mata komputerowi na trudnym poziomie bez cofania ruchu.", points: 50 },
  ],
  mount(board, ctx) {
    const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
    let st = Chess.start();
    Chess.last = { get st() { return st; }, set st(v) { st = v; } };
    let sel = -1, lastMove = null, thinking = false, log = [];
    const cells = gridCells(board, 8, 8, "cs", { gap: 0, label: (r, c) => `${"abcdefgh"[c]}${8 - r}` });
    board.style.setProperty("--max", "86px");
    cells.forEach((d, i) => {
      d.classList.toggle("dark", (((i / 8) | 0) + (i % 8)) % 2 === 1);
      d.append(el("span", "cs-piece"));
      if (i % 8 === 0) d.append(el("small", "cs-rank", 8 - ((i / 8) | 0)));
      if (i >= 56) d.append(el("small", "cs-file", "abcdefgh"[i % 8]));
    });
    const turnEl = el("p", "turn");
    const capEl = el("div", "cs-caps");
    const logEl = el("ol", "cs-log");
    ctx.panel.append(panelBlock("Ruch", turnEl, capEl), panelBlock("Zapis partii", logEl));
    const save = ctx.undoable(([s, l, lg]) => { st = s; lastMove = l; log = lg; sel = -1; render(); });
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

    function finish() {
      const res = Chess.status(st);
      if (!res) return false;
      if (res === "mate" && st.turn === "b") {
        if (log.length <= 40) ctx.achieve("szybki-mat");
        if (ctx.undos === 0 && ctx.level.key === "medium") ctx.achieve("bez-cofania");
        if (ctx.undos === 0 && ctx.level.key === "hard") ctx.achieve("arcymistrz");
      }
      if (res === "mate") st.turn === "b" ? ctx.win(`Mat w ${log.length} ${plural(log.length, "posunięciu", "posunięciach", "posunięciach")}.`) : ctx.lose("Mat", "Komputer dał ci mata.");
      else ctx.lose("Remis", { stalemate: "Pat: brak ruchu, ale nie ma szacha.", fifty: "50 posunięć bez bicia i ruchu pionem.", material: "Za mało figur, by dać mata." }[res]);
      return true;
    }
    function apply(m) {
      const cap = st.b[m.to] || m.ep;
      log.push(Chess.notation(st, m));
      st = Chess.play(st, m);
      lastMove = m;
      cap ? Sound.place(7) : Sound.place(3);
      if (Chess.inCheck(st)) Sound.error();
      render();
      replay(cells[m.to], "land");
    }
    function aiTurn() {
      thinking = true;
      render();
      wait(() => {
        apply(Chess.bestMove(st, ctx.level.depth, ctx.level.noise));
        thinking = false;
        render();
        finish();
      }, 260);
    }
    function askPromo(m) {
      const box = el("div", "cs-promo");
      box.append(el("p", "", "Na jaką figurę promujesz piona?"));
      for (const p of "qrbn") {
        const b = button(GLYPH[p.toUpperCase()], "cs-promo-btn", () => { box.remove(); move({ ...m, promo: p }); });
        b.setAttribute("aria-label", { q: "Hetman", r: "Wieża", b: "Goniec", n: "Skoczek" }[p]);
        box.append(b);
      }
      board.append(box);
    }
    function move(m) {
      save([st, lastMove, log.slice()]);
      apply(m);
      sel = -1;
      if (finish()) return render();
      aiTurn();
    }
    function click(i) {
      if (ctx.done || thinking || board.querySelector(".cs-promo")) return;
      const legal = Chess.moves(st);
      if (st.b[i] && st.b[i] === st.b[i].toUpperCase() && legal.some((m) => m.from === i)) { sel = i; Sound.tap(); return render(); }
      const cand = legal.filter((m) => m.from === sel && m.to === i);
      if (!cand.length) { if (sel >= 0) Sound.error(); sel = -1; return render(); }
      if (cand.length > 1) return askPromo(cand[0]);
      move(cand[0]);
    }
    board.addEventListener("click", (e) => { const d = e.target.closest(".gb-cell"); if (d) click(+d.dataset.i); });
    let cur = 52;
    cellKeys(ctx, { cols: 8, rows: 8, get: () => cur, set: (i) => { cur = i; cells[i].focus({ preventScroll: true }); }, keys: { " ": () => click(cur), enter: () => click(cur) } });

    function render() {
      const legal = thinking || ctx.done ? [] : Chess.moves(st);
      const dest = new Map(legal.filter((m) => m.from === sel).map((m) => [m.to, !!st.b[m.to] || m.ep]));
      const king = Chess.inCheck(st) ? st.b.indexOf(st.turn === "w" ? "K" : "k") : -1;
      cells.forEach((d, i) => {
        const p = st.b[i];
        const pc = d.querySelector(".cs-piece");
        pc.textContent = p ? GLYPH[p.toUpperCase()] + "︎" : "";
        pc.className = `cs-piece ${p ? (p === p.toUpperCase() ? "w" : "b") : ""}`;
        d.classList.toggle("sel", i === sel);
        d.classList.toggle("dest", dest.has(i) && !dest.get(i));
        d.classList.toggle("take", !!dest.get(i));
        d.classList.toggle("last", !!lastMove && (lastMove.from === i || lastMove.to === i));
        d.classList.toggle("check", i === king);
      });
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Komputer myśli…" : Chess.inCheck(st) && st.turn === "w" ? "Szach! Twój ruch" : "Twój ruch");
      // zbite figury: różnica względem pełnego kompletu
      const full = "PPPPPPPPNNBBRRQ";
      const left = (set) => [...set].reduce((acc, ch) => { const k = acc.indexOf(ch); if (k >= 0) acc.splice(k, 1); return acc; }, [...full]);
      const mine = st.b.filter((p) => p && p === p.toUpperCase() && p !== "K");
      const theirs = st.b.filter((p) => p && p !== p.toUpperCase() && p !== "k").map((p) => p.toUpperCase());
      capEl.replaceChildren(el("span", "cs-cap b", left(theirs).map((p) => GLYPH[p] + "︎").join("")), el("span", "cs-cap w", left(mine).map((p) => GLYPH[p] + "︎").join("")));
      const pairs = [];
      for (let k = 0; k < log.length; k += 2) pairs.push(el("li", "", `${log[k]}  ${log[k + 1] || ""}`));
      logEl.replaceChildren(...pairs.slice(-8));
      logEl.start = Math.max(1, pairs.length - 7);
      ctx.progress(Math.min(0.9, log.length / 80));
    }
    render();
  },
});
