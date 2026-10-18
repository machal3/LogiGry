// 24: połącz cztery liczby działaniami + − × ÷ (każda liczba raz), by wyszło 24. Liczby jako ułamki [licznik, mianownik].
const Make24 = (() => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  const norm = ([n, d]) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return [n / g, d / g]; };
  const OPS = {
    "+": (a, b) => norm([a[0] * b[1] + b[0] * a[1], a[1] * b[1]]),
    "−": (a, b) => norm([a[0] * b[1] - b[0] * a[1], a[1] * b[1]]),
    "×": (a, b) => norm([a[0] * b[0], a[1] * b[1]]),
    "÷": (a, b) => (b[0] === 0 ? null : norm([a[0] * b[1], a[1] * b[0]])),
  };
  const show = ([n, d]) => (d === 1 ? String(n) : `${n}/${d}`);
  // przegląd wszystkich rozwiązań; zwraca jedno wyrażenie oraz cechy: czy da się bez dzielenia, czy bez ułamków po drodze
  function analyze(nums) {
    let any = null, noDiv = false, intOnly = false;
    const go = (items, usedDiv, frac) => {
      if (items.length === 1) {
        const [v, e] = items[0];
        if (v[0] === 24 && v[1] === 1) { any ||= e; if (!usedDiv) noDiv = true; if (!frac) intOnly = true; }
        return;
      }
      for (let i = 0; i < items.length; i++) for (let j = 0; j < items.length; j++) {
        if (i === j) continue;
        const rest = items.filter((_, k) => k !== i && k !== j);
        for (const [op, f] of Object.entries(OPS)) {
          if ((op === "+" || op === "×") && i > j) continue;
          const v = f(items[i][0], items[j][0]);
          if (!v) continue;
          go([...rest, [v, `(${items[i][1]} ${op} ${items[j][1]})`]], usedDiv || op === "÷", frac || v[1] !== 1 || v[0] < 0);
        }
      }
    };
    go(nums.map((n) => [[n, 1], String(n)]), false, false);
    return { any: any && any.slice(1, -1), noDiv, intOnly };
  }
  function generate(kind) {
    for (;;) {
      const nums = Array.from({ length: 4 }, () => 1 + rnd(kind === "easy" ? 9 : 13));
      const a = analyze(nums);
      if (!a.any) continue;
      if (kind === "easy" && !a.noDiv) continue;
      if (kind === "medium" && a.noDiv && Math.random() < 0.6) continue;
      if (kind === "hard" && a.intOnly) continue;
      return (api.last = { nums, solution: a.any });
    }
  }
  const api = { OPS, norm, show, analyze, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Make24;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "24"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, kind: "easy", rounds: 3 },
    { key: "medium", name: "Średni", points: 25, kind: "medium", rounds: 4 },
    { key: "hard", name: "Trudny", points: 50, kind: "hard", rounds: 4 },
  ],
  rules: [
    "Połącz cztery liczby dodawaniem, odejmowaniem, mnożeniem i dzieleniem tak, żeby wyszło 24. Każdej liczby użyj dokładnie raz.",
    "Kliknij liczbę, potem działanie, potem drugą liczbę: obie zastąpi wynik. Cofnij zwraca poprzedni krok.",
    "Rozwiąż kilka zagadek pod rząd. Na trudnym nie obejdzie się bez ułamków po drodze, np. 8 ÷ (3 − 8 ÷ 3).",
  ],
  achievements: [
    { id: "bez-pomijania", name: "Bez pomijania", desc: "Wygraj, nie pomijając żadnego układu.", points: 10 },
    { id: "rachmistrz", name: "Szybki rachmistrz", desc: "Wygraj średni poziom w mniej niż 2 minuty.", points: 25 },
    { id: "mistrz-24", name: "Mistrz dwudziestki czwórki", desc: "Wygraj trudny poziom bez pomijania i bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { rounds, kind } = ctx.level;
    let round = 0, skips = 2, puzzle, items, sel = -1, op = null;
    board.classList.add("t24");
    board.style.setProperty("--cols", 8);
    board.style.setProperty("--rows", 7);
    const goal = el("p", "t24-goal", "24");
    const row = el("div", "t24-row");
    const opsRow = el("div", "t24-ops");
    const opBtns = Object.keys(Make24.OPS).map((o) => {
      const b = button(o, "t24-op", () => pickOp(o));
      b.setAttribute("aria-label", { "+": "Dodaj", "−": "Odejmij", "×": "Pomnóż", "÷": "Podziel" }[o]);
      opsRow.append(b);
      return b;
    });
    board.append(goal, row, opsRow);
    const roundEl = statBlock(ctx, "Zagadki", { meter: true });
    const reset = button("Od nowa", "btn-ghost", () => { if (!ctx.done) { save(snap()); start(true); } });
    const skip = button("", "btn-ghost", () => doSkip());
    const actions = el("div", "panel-row");
    actions.append(reset, skip);
    ctx.panel.append(panelBlock("", actions));
    const snap = () => [items.map((x) => x.slice()), round, skips, puzzle];
    const save = ctx.undoable(([it, r, s, p]) => { items = it; round = r; skips = s; puzzle = p; sel = -1; op = null; render(); });

    function start(same = false) {
      if (!same) puzzle = Make24.generate(kind);
      items = puzzle.nums.map((n) => [n, 1]);
      sel = -1;
      op = null;
      render(true);
    }
    function pickOp(o) {
      if (ctx.done || sel < 0) { Sound.error(); return ctx.toast("Najpierw wybierz liczbę"); }
      op = op === o ? null : o;
      Sound.tap();
      render();
    }
    function pickNum(i) {
      if (ctx.done) return;
      if (sel < 0 || !op || i === sel) { sel = sel === i ? -1 : i; op = null; Sound.tap(); return render(); }
      const v = Make24.OPS[op](items[sel], items[i]);
      if (!v) { Sound.error(); return ctx.toast("Przez zero nie dzielimy"); }
      save(snap());
      const next = items.filter((_, k) => k !== sel && k !== i);
      next.splice(Math.min(i, next.length), 0, v);
      items = next;
      sel = items.indexOf(v);
      op = null;
      Sound.place(items.length === 1 ? 9 : 4);
      render();
      if (items.length > 1) return;
      if (v[0] === 24 && v[1] === 1) {
        round++;
        Sound.line();
        replay(goal, "flash");
        if (round >= rounds) {
          if (skips === 2) ctx.achieve("bez-pomijania");
          if (ctx.level.key === "medium" && ctx.time < 120) ctx.achieve("rachmistrz");
          if (ctx.level.key === "hard" && skips === 2 && ctx.undos === 0) ctx.achieve("mistrz-24");
        }
        if (round >= rounds) return render(), ctx.win(skips === 2 ? "Bez pomijania." : "");
        setTimeout(() => !ctx.done && start(), 650);
      } else {
        Sound.error();
        replay(row, "shake");
        ctx.toast(`Wyszło ${Make24.show(v)}. Cofnij albo zacznij od nowa`);
      }
    }
    function doSkip() {
      if (ctx.done || !skips) return;
      skips--;
      ctx.toast(`Można było tak: ${puzzle.solution.replace(/\//g, " ÷ ")}`);
      start();
    }
    row.addEventListener("click", (e) => {
      const b = e.target.closest(".t24-num");
      if (b) pickNum(+b.dataset.k);
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select") || e.ctrlKey || e.metaKey) return;
      const map = { "+": "+", "-": "−", "*": "×", x: "×", "/": "÷", ":": "÷" };
      if (map[e.key]) { e.preventDefault(); pickOp(map[e.key]); }
      else if (/^[1-4]$/.test(e.key) && +e.key <= items.length) { e.preventDefault(); pickNum(+e.key - 1); }
    });

    function render(fresh = false) {
      row.replaceChildren(...items.map((v, k) => {
        const b = button("", `t24-num${k === sel ? " sel" : ""}${fresh ? " deal" : ""}`);
        b.dataset.k = k;
        b.style.setProperty("--k", k);
        if (v[1] === 1) b.append(el("span", "", v[0]));
        else { const f = el("span", "frac"); f.append(el("i", "", v[0]), el("i", "", v[1])); b.append(f); }
        b.setAttribute("aria-label", `Liczba ${Make24.show(v)}`);
        return b;
      }));
      opBtns.forEach((b) => b.classList.toggle("sel", b.textContent === op));
      roundEl.set(`${round} / ${rounds}`, round / rounds);
      skip.textContent = `Pomiń (${skips})`;
      skip.disabled = !skips;
      ctx.progress(round / rounds);
    }
    start();
  },
});
