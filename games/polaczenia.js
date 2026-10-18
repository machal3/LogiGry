// Połączenia (Flow): połącz pary kropek w tym samym kolorze ścieżkami po polach; ścieżki nie krzyżują się i wypełniają planszę.
// Zagadka powstaje z losowej ścieżki przez wszystkie pola (ruchy „backbite”) pociętej na odcinki.
const Flow = (() => {
  const nb = (n, i) => {
    const r = (i / n) | 0, c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  };
  const adjacent = (n, a, b) => nb(n, a).includes(b);

  function hamilton(n) {
    let path = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) path.push(r * n + (r % 2 ? n - 1 - c : c));
    for (let t = 0; t < n * n * 30; t++) {
      if (Math.random() < 0.5) path.reverse();
      // głowa łączy się z losowym sąsiadem; pętla rozcina się tuż przed nim
      const head = path[0];
      const opts = nb(n, head).filter((x) => x !== path[1]);
      const x = pick(opts);
      const j = path.indexOf(x);
      path = [...path.slice(0, j).reverse(), ...path.slice(j)];
    }
    return path;
  }

  function generate(n, colors) {
    for (;;) {
      const path = hamilton(n);
      // cięcia: odcinki co najmniej 3-polowe, końce nie sąsiadują ze sobą
      const cuts = [];
      let ok = true, start = 0;
      const avg = (n * n) / colors;
      for (let k = 0; k < colors - 1; k++) {
        const left = colors - 1 - k, rest = n * n - start;
        const len = Math.max(3, Math.min(rest - 3 * left, Math.round(avg * (0.6 + Math.random() * 0.8))));
        if (len < 3 || rest - len < 3 * left) { ok = false; break; }
        cuts.push(start + len);
        start += len;
      }
      if (!ok) continue;
      const bounds = [0, ...cuts, n * n];
      const pairs = bounds.slice(0, -1).map((a, k) => path.slice(a, bounds[k + 1]));
      if (pairs.some((p) => p.length < 3 || adjacent(n, p[0], p[p.length - 1]))) continue;
      const dots = new Map();
      pairs.forEach((p, k) => { dots.set(p[0], k); dots.set(p[p.length - 1], k); });
      return (api.last = { n, pairs, dots, ends: pairs.map((p) => [p[0], p[p.length - 1]]) });
    }
  }

  // paths[k]: lista pól od jednej z kropek koloru k; zwraca, które kolory są połączone i czy plansza jest pełna
  function check(n, ends, paths) {
    const linked = paths.map((p, k) => p.length > 1 && ends[k].includes(p[0]) && ends[k].includes(p[p.length - 1]) && p[0] !== p[p.length - 1]);
    const covered = new Set(paths.flat());
    return { linked, full: covered.size === n * n, solved: linked.every(Boolean) && covered.size === n * n };
  }

  const api = { nb, hamilton, generate, check, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Flow;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "polaczenia"), {
  levels: [
    { key: "easy", name: "5 × 5", points: 10, n: 5, colors: 4 },
    { key: "medium", name: "7 × 7", points: 25, n: 7, colors: 6 },
    { key: "hard", name: "9 × 9", points: 50, n: 9, colors: 8 },
  ],
  rules: [
    "Połącz każdą parę kropek w tym samym kolorze. Prowadź rurę palcem albo myszą od kropki po sąsiednich polach.",
    "Rury nie mogą się krzyżować. Wejście na cudzą rurę przecina ją w tym miejscu.",
    "Wygrywasz, gdy wszystkie pary są połączone, a rury wypełniają całą planszę.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Pewna linia", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybki monter", desc: "Rozwiąż średni poziom w mniej niż 3 min.", points: 25 },
    { id: "mistrz", name: "Mistrz połączeń", desc: "Rozwiąż trudny poziom w mniej niż 6 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, dots, ends } = Flow.generate(ctx.level.n, ctx.level.colors);
    const COLORS = ["#e03131", "#1c7ed6", "#2f9e44", "#f59f00", "#ae3ec9", "#0c8599", "#e8590c", "#f06595", "#5c940d", "#7048e8"];
    const K = ends.length;
    let paths = Array.from({ length: K }, () => []);
    const cells = gridCells(board, n, n, "fl", { gap: 0, label: (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}`, tag: "div" });
    board.style.setProperty("--max", "84px");
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${n} ${n}`);
    svg.setAttribute("class", "fl-svg");
    svg.setAttribute("aria-hidden", "true");
    board.append(svg);
    const lines = ends.map((_, k) => {
      const pl = document.createElementNS(NS, "polyline");
      pl.setAttribute("class", "fl-line");
      pl.style.setProperty("--fc", COLORS[k]);
      svg.append(pl);
      return pl;
    });
    dots.forEach((k, i) => {
      const d = el("span", "fl-dot");
      d.style.setProperty("--fc", COLORS[k]);
      cells[i].append(d);
      cells[i].classList.add("has-dot");
    });
    const save = ctx.undoable((s) => { paths = s.map((p) => p.slice()); render(); });
    const info = statBlock(ctx, "Połączone", { meter: true });
    const fillEl = el("p", "panel-note");
    info.block.append(fillEl);

    const owner = () => {
      const o = new Int8Array(n * n).fill(-1);
      paths.forEach((p, k) => p.forEach((i) => (o[i] = k)));
      return o;
    };
    let drawing = -1, last = -1;
    const cellAt = (e) => {
      const r = board.getBoundingClientRect();
      const c = Math.floor(((e.clientX - r.left) / r.width) * n), w = Math.floor(((e.clientY - r.top) / r.height) * n);
      return c >= 0 && c < n && w >= 0 && w < n ? w * n + c : -1;
    };
    board.addEventListener("pointerdown", (e) => {
      if (ctx.done) return;
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      const o = owner();
      if (dots.has(i)) {
        drawing = dots.get(i);
        save(paths.map((p) => p.slice()));
        paths[drawing] = [i];
      } else if (o[i] >= 0) {
        drawing = o[i];
        save(paths.map((p) => p.slice()));
        const p = paths[drawing];
        p.length = p.indexOf(i) + 1;
      } else return;
      last = i;
      Sound.tap();
      render();
    });
    ctx.on(document, "pointermove", (e) => {
      if (drawing < 0) return;
      const target = cellAt(e);
      if (target < 0 || target === last) return;
      // szybki ruch: idziemy pole po polu w stronę wskaźnika
      for (let guard = 0; guard < n * 2 && last !== target; guard++) {
        const lr = (last / n) | 0, lc = last % n, tr = (target / n) | 0, tc = target % n;
        const step = Math.abs(tr - lr) >= Math.abs(tc - lc) ? last + Math.sign(tr - lr) * n : last + Math.sign(tc - lc);
        if (!enter(step)) break;
      }
      render();
    });
    ctx.on(document, "pointerup", () => {
      if (drawing < 0) return;
      const k = drawing;
      drawing = -1;
      const res = render();
      if (res.solved) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 180) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 360 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      if (res.linked[k]) { Sound.line(); return replay(lines[k], "fl-done"); }
      if (res.linked.every(Boolean) && !res.full) ctx.toast("Wszystko połączone, ale rury muszą wypełnić całą planszę");
    });

    function enter(i) {
      const p = paths[drawing];
      const end = p[p.length - 1];
      // ścieżka już dotarła do drugiej kropki: można się tylko cofać
      const closed = p.length > 1 && dots.get(end) === drawing;
      const back = p.indexOf(i);
      if (back >= 0) { p.length = back + 1; last = i; return true; }
      if (closed) return false;
      if (dots.has(i) && dots.get(i) !== drawing) return false;
      const o = owner();
      if (o[i] >= 0 && o[i] !== drawing) {
        const q = paths[o[i]];
        q.length = q.indexOf(i); // przecięta rura kończy się tuż przed polem
      }
      p.push(i);
      last = i;
      Sound.place(1 + (p.length % 9));
      return true;
    }

    function render() {
      const o = owner();
      cells.forEach((b, i) => {
        b.style.setProperty("--fc", o[i] >= 0 ? COLORS[o[i]] : "transparent");
        b.classList.toggle("filled", o[i] >= 0);
      });
      lines.forEach((pl, k) => {
        pl.setAttribute("points", paths[k].map((i) => `${(i % n) + 0.5},${((i / n) | 0) + 0.5}`).join(" "));
      });
      const res = Flow.check(n, ends, paths);
      const linkedCount = res.linked.filter(Boolean).length;
      const covered = new Set(paths.flat()).size;
      dots.forEach((k, i) => cells[i].classList.toggle("linked", res.linked[k]));
      info.set(`${linkedCount} / ${K}`, linkedCount / K);
      fillEl.textContent = `Wypełnienie: ${Math.round((covered / (n * n)) * 100)}%`;
      ctx.progress((linkedCount / K) * 0.5 + (covered / (n * n)) * 0.5);
      return res;
    }
    render();
  },
});
