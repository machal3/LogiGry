// Klejnoty (match-3): zamień dwa sąsiednie klejnoty, żeby ułożyć co najmniej trzy w linii.
// Czwórka zostawia klejnot-linię (czyści cały rząd albo kolumnę), piątka lub kształt L/T zostawia bombę (czyści 3 × 3).
// Pole: { t: rodzaj 0..kinds-1, sp: "" | "row" | "col" | "bomb", id }. Plansza N × N wierszami.
const Gems = (() => {
  const N = 8;
  let nextId = 1;
  const gem = (t, sp = "") => ({ t, sp, id: nextId++ });

  // grupy do zbicia: poziome i pionowe ciągi ≥ 3 tego samego rodzaju
  function matches(g) {
    const runs = [];
    for (const horiz of [true, false]) {
      for (let a = 0; a < N; a++) {
        let start = 0;
        for (let b = 1; b <= N; b++) {
          const at = (k) => (horiz ? a * N + k : k * N + a);
          if (b < N && g[at(b)] && g[at(start)] && g[at(b)].t === g[at(start)].t) continue;
          if (b - start >= 3 && g[at(start)]) runs.push({ cells: Array.from({ length: b - start }, (_, k) => at(start + k)), horiz });
          start = b;
        }
      }
    }
    return runs;
  }

  function fill(kinds) {
    for (;;) {
      const g = [];
      for (let i = 0; i < N * N; i++) {
        let t;
        do t = rnd(kinds);
        while ((i % N >= 2 && g[i - 1].t === t && g[i - 2].t === t) || (i >= 2 * N && g[i - N].t === t && g[i - 2 * N].t === t));
        g.push(gem(t));
      }
      if (findMove(g)) return g;
    }
  }

  const swap = (g, a, b) => { [g[a], g[b]] = [g[b], g[a]]; };
  const adjacent = (a, b) => (Math.abs(a - b) === 1 && ((a / N) | 0) === ((b / N) | 0)) || Math.abs(a - b) === N;
  // pierwszy ruch, który coś zbija (do podpowiedzi i wykrywania braku ruchów)
  function findMove(g) {
    for (let i = 0; i < N * N; i++) {
      for (const j of [i + 1, i + N]) {
        if (j >= N * N || !adjacent(i, j)) continue;
        swap(g, i, j);
        const ok = matches(g).length > 0;
        swap(g, i, j);
        if (ok) return [i, j];
      }
    }
    return null;
  }

  // Jeden krok kaskady: zbija grupy, odpala specjalne klejnoty, tworzy nowe. Zwraca { cleared, created } albo null.
  function crush(g, focus) {
    const runs = matches(g);
    if (!runs.length) return null;
    const clear = new Set(), created = [];
    const count = new Map();
    runs.forEach((r) => r.cells.forEach((i) => { clear.add(i); count.set(i, (count.get(i) || 0) + 1); }));
    for (const r of runs) {
      // nowy specjalny klejnot powstaje na polu ruchu albo w środku grupy
      const at = r.cells.find((i) => focus.includes(i)) ?? r.cells[(r.cells.length / 2) | 0];
      const cross = r.cells.find((i) => count.get(i) > 1);
      if (r.cells.length >= 5 || cross != null) created.push([cross ?? at, gem(g[at].t, "bomb")]);
      else if (r.cells.length === 4) created.push([at, gem(g[at].t, r.horiz ? "col" : "row")]);
    }
    // specjalne klejnoty w zbitej grupie odpalają się łańcuchowo
    const queue = [...clear];
    while (queue.length) {
      const i = queue.pop(), p = g[i];
      if (!p || !p.sp) continue;
      const r = (i / N) | 0, c = i % N;
      const hit = p.sp === "row" ? [...Array(N).keys()].map((k) => r * N + k)
        : p.sp === "col" ? [...Array(N).keys()].map((k) => k * N + c)
        : [-1, 0, 1].flatMap((dr) => [-1, 0, 1].map((dc) => [r + dr, c + dc])).filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N).map(([a, b]) => a * N + b);
      p.sp = "";
      for (const j of hit) if (!clear.has(j)) { clear.add(j); queue.push(j); }
    }
    const cleared = [...clear].map((i) => [i, g[i]]);
    clear.forEach((i) => (g[i] = null));
    created.forEach(([i, p]) => { if (!g[i]) g[i] = p; });
    return { cleared, created: created.map(([, p]) => p) };
  }

  // grawitacja: klejnoty opadają, z góry wpadają nowe
  function drop(g, kinds) {
    for (let c = 0; c < N; c++) {
      const col = [];
      for (let r = N - 1; r >= 0; r--) if (g[r * N + c]) col.push(g[r * N + c]);
      for (let r = N - 1, k = 0; r >= 0; r--, k++) g[r * N + c] = col[k] || gem(rnd(kinds));
    }
  }

  const api = { N, matches, fill, swap, adjacent, findMove, crush, drop, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Gems;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "klejnoty"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, kinds: 5, target: 2500, moves: 25 },
    { key: "medium", name: "Średni", points: 25, kinds: 6, target: 3500, moves: 25 },
    { key: "hard", name: "Trudny", points: 50, kinds: 7, target: 4000, moves: 22 },
  ],
  rules: [
    "Zamień miejscami dwa sąsiednie klejnoty, żeby ułożyć trzy albo więcej takich samych w linii.",
    "Cztery w linii zostawiają klejnot z paskami, który zbija cały rząd albo kolumnę. Pięć w linii albo kształt L czy T zostawia bombę, która zbija pola wokół.",
    "Zdobądź wymaganą liczbę punktów, zanim skończą się ruchy. Kaskady mnożą punkty.",
  ],
  achievements: [
    { id: "zapas", name: "Z zapasem", desc: "Wygraj, mając w zapasie co najmniej 5 ruchów.", points: 10 },
    { id: "oszczedny-jubiler", name: "Oszczędny jubiler", desc: "Wygraj średni poziom, mając w zapasie co najmniej 10 ruchów.", points: 25 },
    { id: "krolewski-skarbiec", name: "Królewski skarbiec", desc: "Wygraj trudny poziom, mając w zapasie co najmniej 5 ruchów.", points: 50 },
  ],
  mount(board, ctx) {
    const { N } = Gems;
    const { kinds, target } = ctx.level;
    const s = { g: Gems.fill(kinds), score: 0, moves: ctx.level.moves };
    Gems.last = s;
    let busy = false, sel = -1, idle = 0, cur = 0;
    const COLORS = ["#e03131", "#1c7ed6", "#fab005", "#2f9e44", "#ae3ec9", "#f76707", "#15aabf"];
    board.classList.add("gm");
    board.style.setProperty("--cols", N);
    board.style.setProperty("--rows", N);
    const els = new Map();
    const scoreEl = statBlock(ctx, "Punkty", { meter: true });
    const movesEl = statBlock(ctx, "Ruchy", { small: true });
    const wait = (ms) => new Promise((r) => { const t = setTimeout(r, ms); ctx.onStop(() => clearTimeout(t)); });

    // synchronizacja klejnotów na ekranie ze stanem; nowe wpadają z góry
    function sync(fresh = false) {
      const alive = new Set();
      s.g.forEach((p, i) => {
        if (!p) return; // puste pole między zbiciem a opadaniem
        alive.add(p.id);
        let d = els.get(p.id);
        if (!d) {
          d = el("span", "gm-gem");
          d.style.setProperty("--gc", COLORS[p.t]);
          d.dataset.t = p.t;
          d.style.setProperty("--y", fresh ? (i / N) | 0 : -1 - (N - 1 - ((i / N) | 0)));
          d.style.setProperty("--x", i % N);
          board.append(d);
          els.set(p.id, d);
          void d.offsetWidth;
        }
        d.dataset.sp = p.sp;
        d.style.setProperty("--x", i % N);
        d.style.setProperty("--y", (i / N) | 0);
        d.dataset.i = i;
        d.classList.toggle("sel", i === sel);
        d.classList.toggle("cursor", i === cur && board.matches(":focus-within, :focus"));
      });
      for (const [id, d] of els) if (!alive.has(id) && !d.classList.contains("pop")) { els.delete(id); d.remove(); }
    }

    async function trySwap(a, b) {
      if (busy || ctx.done || !Gems.adjacent(a, b)) return;
      busy = true;
      sel = -1;
      Gems.swap(s.g, a, b);
      sync();
      Sound.tap();
      await wait(180);
      if (!Gems.matches(s.g).length) {
        Gems.swap(s.g, a, b);
        sync();
        Sound.error();
        await wait(180);
        busy = false;
        return;
      }
      s.moves--;
      let combo = 0;
      for (let step = Gems.crush(s.g, [a, b]); step; step = Gems.crush(s.g, [])) {
        combo++;
        const pts = step.cleared.length * 10 * combo;
        s.score += pts;
        step.cleared.forEach(([, p]) => {
          const d = els.get(p.id);
          if (!d) return;
          d.classList.add("pop");
          setTimeout(() => { d.remove(); els.delete(p.id); }, 260);
        });
        floatScore(step.cleared, pts);
        Sound.place(Math.min(9, combo * 2));
        if (step.cleared.length > 5) Sound.line();
        render();
        sync();
        await wait(230);
        Gems.drop(s.g, kinds);
        sync();
        await wait(260);
      }
      if (!Gems.findMove(s.g)) {
        ctx.toast("Brak ruchów, tasuję planszę");
        s.g = Gems.fill(kinds);
        els.forEach((d) => d.remove());
        els.clear();
        sync(true);
      }
      busy = false;
      render();
      if (s.score >= target) {
        if (s.moves >= 5) ctx.achieve("zapas");
        if (ctx.level.key === "medium" && s.moves >= 10) ctx.achieve("oszczedny-jubiler");
        if (ctx.level.key === "hard" && s.moves >= 5) ctx.achieve("krolewski-skarbiec");
      }
      if (s.score >= target) return ctx.win(`${s.score} punktów, zostało ${s.moves} ${plural(s.moves, "ruch", "ruchy", "ruchów")}.`);
      if (s.moves <= 0) ctx.lose("Koniec ruchów", `Zabrakło ${target - s.score} punktów.`);
    }
    function floatScore(cleared, pts) {
      const avg = cleared.reduce((a, [i]) => [a[0] + (i % N), a[1] + ((i / N) | 0)], [0, 0]).map((v) => v / cleared.length);
      const f = el("span", "gm-float", `+${pts}`);
      f.style.setProperty("--x", avg[0]);
      f.style.setProperty("--y", avg[1]);
      board.append(f);
      setTimeout(() => f.remove(), 800);
    }

    // przeciągnięcie albo dwa kliknięcia
    let from = null;
    const cellAt = (e) => {
      const r = board.getBoundingClientRect();
      const c = Math.floor(((e.clientX - r.left) / r.width) * N), w = Math.floor(((e.clientY - r.top) / r.height) * N);
      return c >= 0 && c < N && w >= 0 && w < N ? w * N + c : -1;
    };
    board.addEventListener("pointerdown", (e) => {
      const i = cellAt(e);
      if (i < 0 || busy) return;
      e.preventDefault();
      idle = 0;
      if (sel >= 0 && Gems.adjacent(sel, i)) { trySwap(sel, i); from = null; return; }
      sel = i;
      from = [i, e.clientX, e.clientY];
      sync();
    });
    ctx.on(document, "pointermove", (e) => {
      if (!from) return;
      const dx = e.clientX - from[1], dy = e.clientY - from[2];
      const cell = board.getBoundingClientRect().width / N;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.4) return;
      const [i] = from;
      from = null;
      const j = Math.abs(dx) > Math.abs(dy) ? i + Math.sign(dx) : i + Math.sign(dy) * N;
      if (j >= 0 && j < N * N && Gems.adjacent(i, j)) trySwap(i, j);
    });
    ctx.on(document, "pointerup", () => { from = null; });
    board.tabIndex = 0;
    cellKeys(ctx, {
      cols: N, rows: N, scope: board,
      get: () => cur,
      set: (i) => { cur = i; sync(); },
      keys: { " ": () => { if (sel >= 0 && Gems.adjacent(sel, cur)) trySwap(sel, cur); else { sel = cur; sync(); } }, enter: () => { if (sel >= 0 && Gems.adjacent(sel, cur)) trySwap(sel, cur); else { sel = cur; sync(); } } },
    });
    board.addEventListener("focus", () => sync());

    // podpowiedź po kilku sekundach bezczynności
    const timer = setInterval(() => {
      if (busy || ctx.done) return;
      if (++idle === 6) {
        const m = Gems.findMove(s.g);
        if (m) m.forEach((i) => { const d = els.get(s.g[i].id); if (d) replay(d, "hint"); });
      }
    }, 1000);
    ctx.onStop(() => clearInterval(timer));

    function render() {
      scoreEl.set(s.score, s.score / target, `Cel: ${target}`);
      movesEl.set(s.moves);
      ctx.progress(s.score / target);
    }
    sync(true);
    render();
  },
});
