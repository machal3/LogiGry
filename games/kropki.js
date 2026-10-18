// Kropki (Dots and Boxes): na zmianę dorysowuje się kreski między kropkami. Kto zamknie kwadrat, dostaje go i rusza się znowu.
// Kwadraty n × n. Kreski: poziome h(r, c) = r * n + c (r ≤ n), pionowe v(r, c) = H + r * (n + 1) + c (c ≤ n), H = (n + 1) * n.
const DotsBoxes = (() => {
  const H = (n) => (n + 1) * n;
  const sides = (n, b) => {
    const r = (b / n) | 0, c = b % n;
    return [r * n + c, (r + 1) * n + c, H(n) + r * (n + 1) + c, H(n) + r * (n + 1) + c + 1];
  };
  // kwadraty przy krawędzi e
  const boxesOf = (n, e) => {
    const out = [];
    if (e < H(n)) { const r = (e / n) | 0, c = e % n; if (r > 0) out.push((r - 1) * n + c); if (r < n) out.push(r * n + c); }
    else { const k = e - H(n), r = (k / (n + 1)) | 0, c = k % (n + 1); if (c > 0) out.push(r * n + c - 1); if (c < n) out.push(r * n + c); }
    return out;
  };
  const count = (n, lines, b) => sides(n, b).filter((e) => lines[e]).length;
  // rysuje kreskę; zwraca zamknięte kwadraty
  function draw(n, lines, e) {
    lines[e] = 1;
    return boxesOf(n, e).filter((b) => count(n, lines, b) === 4);
  }
  // ile kwadratów rywal zgarnie po tym ruchu, biorąc wszystko po kolei
  function giveaway(n, lines, e) {
    const l = lines.slice();
    l[e] = 1;
    let taken = 0;
    for (let again = true; again;) {
      again = false;
      for (let b = 0; b < n * n; b++) {
        if (count(n, l, b) === 3) { const s = sides(n, b).find((x) => !l[x]); l[s] = 1; taken += 1 + boxesOf(n, s).filter((x) => x !== b && count(n, l, x) === 4).length; again = true; }
      }
    }
    return taken;
  }
  function aiMove(n, lines, level) {
    const free = [...lines.keys()].filter((e) => !lines[e]);
    const closing = free.filter((e) => boxesOf(n, e).some((b) => count(n, lines, b) === 3));
    if (closing.length && level > 0) return pick(closing);
    if (closing.length && Math.random() < 0.7) return pick(closing);
    // bezpieczne: nie zostawiają kwadratu z trzema bokami
    const safe = free.filter((e) => boxesOf(n, e).every((b) => count(n, lines, b) < 2));
    if (level === 0) return pick(Math.random() < 0.5 && safe.length ? safe : free);
    if (safe.length) return pick(safe);
    if (level === 1) return pick(free);
    // trudny: oddaje najmniej kwadratów
    let best = free[0], bv = Infinity;
    for (const e of free) { const v = giveaway(n, lines, e); if (v < bv) { bv = v; best = e; } }
    return best;
  }
  const api = { H, sides, boxesOf, count, draw, giveaway, aiMove, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = DotsBoxes;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "kropki"), {
  levels: [
    { key: "easy", name: "3 × 3", points: 10, n: 3, ai: 0 },
    { key: "medium", name: "4 × 4", points: 25, n: 4, ai: 1 },
    { key: "hard", name: "5 × 5", points: 50, n: 5, ai: 2 },
  ],
  rules: [
    "Na zmianę z komputerem dorysowujecie po jednej kresce między sąsiednimi kropkami.",
    "Kto narysuje czwarty bok kwadratu, zdobywa go i od razu rysuje kolejną kreskę.",
    "Wygrywa ten, kto zbierze więcej kwadratów. Unikaj rysowania trzeciego boku: przeciwnik zamknie kwadrat i pójdzie dalej.",
  ],
  achievements: [
    { id: "dwa-do-jednego", name: "Dwa do jednego", desc: "Wygraj, mając co najmniej dwa razy więcej kwadratów niż komputer.", points: 10 },
    { id: "strateg", name: "Strateg", desc: "Wygraj na planszy 4 × 4, oddając komputerowi najwyżej 4 kwadraty.", points: 25 },
    { id: "wladca-kropek", name: "Władca kropek", desc: "Wygraj na planszy 5 × 5, oddając komputerowi najwyżej 8 kwadratów.", points: 50 },
  ],
  mount(board, ctx) {
    const { n } = ctx.level;
    const H = DotsBoxes.H(n), E = H + n * (n + 1);
    const lines = new Array(E).fill(0), who = new Array(E).fill(0), owner = new Array(n * n).fill(0);
    DotsBoxes.last = { lines, n };
    let thinking = false;
    const S = 10, pad = 3, NS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    board.classList.add("db");
    board.style.setProperty("--cols", n + 0.8);
    board.style.setProperty("--rows", n + 0.8);
    const svg = svgEl("svg", { viewBox: `${-pad} ${-pad} ${n * S + 2 * pad} ${n * S + 2 * pad}`, class: "db-svg" });
    board.append(svg);
    const gBox = svgEl("g", {}), gLine = svgEl("g", {}), gDot = svgEl("g", {}), gHit = svgEl("g", {});
    svg.append(gBox, gLine, gDot, gHit);
    const boxEls = Array.from({ length: n * n }, (_, b) => {
      const r = svgEl("rect", { x: (b % n) * S + 1.2, y: ((b / n) | 0) * S + 1.2, width: S - 2.4, height: S - 2.4, rx: 1.5, class: "db-box" });
      gBox.append(r);
      return r;
    });
    const xy = (e) => {
      if (e < H) { const r = (e / n) | 0, c = e % n; return [c * S, r * S, (c + 1) * S, r * S]; }
      const k = e - H, r = (k / (n + 1)) | 0, c = k % (n + 1);
      return [c * S, r * S, c * S, (r + 1) * S];
    };
    const lineEls = Array.from({ length: E }, (_, e) => {
      const [x1, y1, x2, y2] = xy(e);
      const ln = svgEl("line", { x1, y1, x2, y2, class: "db-line", pathLength: 1 });
      gLine.append(ln);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, horiz = y1 === y2;
      const hit = svgEl("path", { d: horiz ? `M${x1} ${y1}L${mx} ${my - S / 2}L${x2} ${y2}L${mx} ${my + S / 2}Z` : `M${x1} ${y1}L${mx + S / 2} ${my}L${x2} ${y2}L${mx - S / 2} ${my}Z`, class: "db-hit" });
      hit.dataset.e = e;
      gHit.append(hit);
      return ln;
    });
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) gDot.append(svgEl("circle", { cx: c * S, cy: r * S, r: 1, class: "db-dot" }));
    const turnEl = el("p", "turn");
    const scoreEl = el("div", "rv-count");
    ctx.panel.append(panelBlock("Ruch", turnEl), panelBlock("Kwadraty", scoreEl));
    const wait = (fn, ms) => { const t = setTimeout(fn, ms); ctx.onStop(() => clearTimeout(t)); };

    // rysuje kreskę gracza p; true, jeśli zamknął kwadrat (rusza się dalej)
    function mark(e, p) {
      who[e] = p;
      const closed = DotsBoxes.draw(n, lines, e);
      lineEls[e].classList.remove("grow");
      void lineEls[e].getBBox();
      lineEls[e].classList.add("grow");
      closed.forEach((b) => { owner[b] = p; replay(boxEls[b], "claim"); });
      closed.length ? Sound.line() : Sound.place(p === 1 ? 5 : 2);
      render();
      return closed.length > 0;
    }
    function over() {
      if (lines.some((v) => !v)) return false;
      const me = owner.filter((v) => v === 1).length, ai = owner.filter((v) => v === 2).length;
      if (me > ai) {
        if (me >= 2 * ai) ctx.achieve("dwa-do-jednego");
        if (ctx.level.key === "medium" && ai <= 4) ctx.achieve("strateg");
        if (ctx.level.key === "hard" && ai <= 8) ctx.achieve("wladca-kropek");
      }
      if (me > ai) ctx.win(`${me} : ${ai}`);
      else ctx.lose(me === ai ? "Remis" : "Komputer wygrał", `${me} : ${ai}`);
      return true;
    }
    function aiTurn() {
      thinking = true;
      render();
      wait(() => {
        const again = mark(DotsBoxes.aiMove(n, lines, ctx.level.ai), 2);
        if (over()) return;
        if (again) return aiTurn();
        thinking = false;
        render();
      }, 420);
    }
    gHit.addEventListener("click", (ev) => {
      const t = ev.target.closest(".db-hit");
      if (!t || ctx.done || thinking) return;
      const e = +t.dataset.e;
      if (lines[e]) return;
      const again = mark(e, 1);
      if (over()) return;
      if (!again) aiTurn();
    });

    function render() {
      lineEls.forEach((ln, e) => { ln.classList.toggle("on", !!lines[e]); ln.dataset.p = who[e]; });
      boxEls.forEach((r, b) => (r.dataset.p = owner[b]));
      gHit.querySelectorAll(".db-hit").forEach((h) => h.classList.toggle("used", !!lines[+h.dataset.e]));
      const me = owner.filter((v) => v === 1).length, ai = owner.filter((v) => v === 2).length;
      turnEl.className = `turn${thinking ? " ai" : ""}`;
      turnEl.replaceChildren(el("i"), thinking ? "Ruch komputera…" : "Twój ruch");
      scoreEl.replaceChildren(el("span", "db-me", me), el("span", "db-ai", ai));
      ctx.progress(lines.filter(Boolean).length / E);
    }
    render();
  },
});
