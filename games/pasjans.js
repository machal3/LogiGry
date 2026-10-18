// Pasjans „Trzy szczyty”: zdejmuj odkryte karty o jeden wyższe albo niższe od karty na stosie odrzuconych.
// 28 kart w trzech szczytach (rzędy 3, 6, 9, 10), reszta w talii. Karta: 0..51, ranga = k % 13 (0 = as), kolor = k / 13.
const TriPeaks = (() => {
  const ROW = [0, 0, 0, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
  // karty, które przykrywają pole i (leżą niżej na ekranie)
  const COVER = Array.from({ length: 28 }, (_, i) => {
    if (i < 3) return [3 + 2 * i, 4 + 2 * i];
    if (i < 9) { const k = i - 3, p = (k / 2) | 0; return [9 + k + p, 10 + k + p]; }
    if (i < 18) return [i + 9, i + 10];
    return [];
  });
  const exposed = (gone, i) => !(gone & (1 << i)) && COVER[i].every((j) => gone & (1 << j));
  const fits = (a, b, wrap) => { const d = Math.abs((a % 13) - (b % 13)); return d === 1 || (wrap && d === 12); };

  // Czy rozdanie da się wygrać: przeszukiwanie stanów (zdjęte karty, pozycja w talii, wierzch stosu).
  function solve(peaks, stock, wrap, cap = 150000) {
    const seen = new Set();
    let nodes = 0;
    const path = [];
    const go = (gone, pos, top) => {
      if (gone === (1 << 28) - 1) return true;
      if (++nodes > cap) return false;
      const key = `${gone},${pos},${top % 13}`;
      if (seen.has(key)) return false;
      seen.add(key);
      for (let i = 27; i >= 0; i--) {
        if (!exposed(gone, i) || !fits(peaks[i], top, wrap)) continue;
        path.push(i);
        if (go(gone | (1 << i), pos, peaks[i])) return true;
        path.pop();
      }
      if (pos < stock.length) {
        path.push(-1);
        if (go(gone, pos + 1, stock[pos])) return true;
        path.pop();
      }
      return false;
    };
    return go(0, 1, stock[0]) ? path : null;
  }

  function generate(wrap) {
    for (;;) {
      const deck = shuffle([...Array(52).keys()]);
      const peaks = deck.slice(0, 28), stock = deck.slice(28);
      const solution = solve(peaks, stock, wrap);
      if (solution) return (api.last = { peaks, stock, solution });
    }
  }
  const api = { ROW, COVER, exposed, fits, solve, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = TriPeaks;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "pasjans"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, wrap: true, undo: true },
    { key: "medium", name: "Średni", points: 25, wrap: true, undo: false },
    { key: "hard", name: "Trudny", points: 50, wrap: false, undo: false },
  ],
  rules: [
    "Zdejmuj odkryte karty, które są o jeden wyższe albo niższe od karty na stosie, np. na 7 pasuje 6 albo 8. Kolor nie ma znaczenia.",
    "Gdy nic nie pasuje, odkryj kartę z talii. Każde rozdanie da się wygrać, ale trzeba myśleć o kolejności.",
    "Na łatwym i średnim po królu może być as i odwrotnie, na trudnym nie. Cofanie jest tylko na łatwym.",
  ],
  mount(board, ctx) {
    const { wrap } = ctx.level;
    const { peaks, stock } = TriPeaks.generate(wrap);
    const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"], SUITS = ["♠", "♥", "♦", "♣"];
    let gone = 0, pos = 1, top = stock[0], streak = 0, best = 0;
    board.classList.add("tp");
    board.style.setProperty("--cols", 11.2);
    board.style.setProperty("--rows", 6.6);
    const face = (k) => {
      const d = el("span", `tp-face${k % 52 >= 13 && k % 52 < 39 ? " red" : ""}`);
      d.append(el("b", "", RANKS[k % 13]), el("i", "", SUITS[(k / 13) | 0]), el("em", "", SUITS[(k / 13) | 0]));
      return d;
    };
    const X = (i) => {
      const r = TriPeaks.ROW[i];
      if (r === 3) return i - 18;
      if (r === 2) return i - 9 + 0.5;
      if (r === 1) { const k = i - 3, p = (k / 2) | 0; return 1 + p * 3 + (k % 2); }
      return 1.5 + i * 3;
    };
    const cards = peaks.map((k, i) => {
      const b = button("", "tp-card");
      b.style.setProperty("--x", X(i));
      b.style.setProperty("--y", TriPeaks.ROW[i] * 0.62);
      b.style.zIndex = TriPeaks.ROW[i] + 1;
      b.dataset.i = i;
      b.append(face(k), el("span", "tp-back"));
      board.append(b);
      return b;
    });
    const stockEl = button("", "tp-stock");
    stockEl.setAttribute("aria-label", "Talia");
    stockEl.append(el("span", "tp-back"), el("span", "tp-count"));
    const waste = el("div", "tp-waste");
    board.append(stockEl, waste);
    const leftEl = statBlock(ctx, "Na stole", { meter: true });
    const streakEl = statBlock(ctx, "Seria", { small: true });
    const save = ctx.level.undo ? ctx.undoable(([g, p, t, s]) => { gone = g; pos = p; top = t; streak = s; render(); }) : () => {};

    const take = (i) => {
      if (ctx.done || !TriPeaks.exposed(gone, i)) return;
      if (!TriPeaks.fits(peaks[i], top, wrap)) { replay(cards[i], "shake"); return Sound.error(); }
      save([gone, pos, top, streak]);
      gone |= 1 << i;
      top = peaks[i];
      streak++;
      best = Math.max(best, streak);
      cards[i].classList.add("fly");
      Sound.place(Math.min(9, streak));
      render();
      if (gone === (1 << 28) - 1) return ctx.win(`Najdłuższa seria: ${best}.`);
      if (i < 3) Sound.line();
      stuckCheck();
    };
    const draw = () => {
      if (ctx.done || pos >= stock.length) return;
      save([gone, pos, top, streak]);
      top = stock[pos++];
      streak = 0;
      Sound.tap();
      render();
      stuckCheck();
    };
    function stuckCheck() {
      const can = peaks.some((k, i) => TriPeaks.exposed(gone, i) && TriPeaks.fits(k, top, wrap));
      if (!can && pos >= stock.length) ctx.lose("Koniec talii", `Na stole zostało ${28 - bitCount(gone)} kart.`);
    }
    const bitCount = (m) => { let c = 0; for (; m; m &= m - 1) c++; return c; };
    board.addEventListener("click", (e) => {
      const c = e.target.closest(".tp-card");
      if (c) take(+c.dataset.i);
      else if (e.target.closest(".tp-stock")) draw();
    });
    ctx.on(document, "keydown", (e) => {
      if (e.key === " " && !e.target.closest?.("button, input")) { e.preventDefault(); draw(); }
    });

    function render() {
      cards.forEach((b, i) => {
        const out = !!(gone & (1 << i));
        if (!out) b.classList.remove("fly");
        b.classList.toggle("out", out);
        b.classList.toggle("open", TriPeaks.exposed(gone, i) || out);
        b.classList.toggle("fits", TriPeaks.exposed(gone, i) && TriPeaks.fits(peaks[i], top, wrap));
        b.disabled = out;
        b.setAttribute("aria-label", TriPeaks.exposed(gone, i) ? `${RANKS[peaks[i] % 13]} ${SUITS[(peaks[i] / 13) | 0]}` : "Zakryta karta");
      });
      waste.replaceChildren(face(top));
      waste.firstChild.classList.add("tp-top");
      stockEl.lastChild.textContent = stock.length - pos;
      stockEl.disabled = pos >= stock.length;
      const left = 28 - bitCount(gone);
      leftEl.set(left, 1 - left / 28, `Karty w talii: ${stock.length - pos}`);
      streakEl.set(streak ? `${streak} pod rząd` : "—", null, `Najlepsza: ${best}`);
      ctx.progress(1 - left / 28);
    }
    render();
  },
});
