// Statki: ukryta flota na planszy n × n. Statki są proste, nie stykają się nawet rogami.
// Liczby przy brzegach = ile pól statków jest w wierszu / kolumnie. Odsłonięte pola (hints) pomagają zacząć.
const Ships = (() => {
  const ring = (n, i) => {
    const r = (i / n) | 0, c = i % n, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const a = r + dr, b = c + dc;
      if ((dr || dc) && a >= 0 && a < n && b >= 0 && b < n) out.push(a * n + b);
    }
    return out;
  };
  // wszystkie położenia statku długości len: listy pól
  const spots = (n, len) => {
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (c + len <= n) out.push(Array.from({ length: len }, (_, k) => r * n + c + k));
      if (len > 1 && r + len <= n) out.push(Array.from({ length: len }, (_, k) => (r + k) * n + c));
    }
    return out;
  };

  function place(n, fleet) {
    for (;;) {
      const ship = new Uint8Array(n * n), block = new Uint8Array(n * n);
      let ok = true;
      for (const len of fleet) {
        const free = spots(n, len).filter((s) => s.every((i) => !block[i]));
        if (!free.length) { ok = false; break; }
        const s = pick(free);
        s.forEach((i) => { ship[i] = 1; block[i] = 1; ring(n, i).forEach((j) => (block[j] = 1)); });
      }
      if (ok) return ship;
    }
  }

  // Liczba rozwiązań (do 2) przy danych liczbach i odsłoniętych polach; hint[i]: 0 nieznane, 1 woda, 2 statek.
  function solve(n, fleet, rows, cols, hint, limit = 2) {
    const ship = new Uint8Array(n * n), block = new Uint8Array(n * n);
    const rc = new Uint8Array(n), cc = new Uint8Array(n);
    const lists = new Map(fleet.map((len) => [len, spots(n, len).filter((s) => s.every((i) => hint[i] !== 1))]));
    const found = [];
    let nodes = 0;
    // każdy wiersz i kolumna ma jeszcze dość wolnych pól na brakujące fragmenty
    const roomy = () => {
      for (let x = 0; x < n; x++) {
        let fr = 0, fc = 0;
        for (let y = 0; y < n; y++) { fr += !block[x * n + y]; fc += !block[y * n + x]; }
        if (rows[x] - rc[x] > fr || cols[x] - cc[x] > fc) return false;
      }
      return true;
    };
    const go = (k, from) => {
      if (found.length >= limit || ++nodes > 150000) return;
      if (k === fleet.length) {
        if (rc.every((v, r) => v === rows[r]) && cc.every((v, c) => v === cols[c]) && hint.every((h, i) => h !== 2 || ship[i])) found.push(ship.slice());
        return;
      }
      const len = fleet[k];
      const list = lists.get(len);
      // statki tej samej długości w rosnącej kolejności położeń, żeby nie liczyć zamian
      const start = k > 0 && fleet[k - 1] === len ? from + 1 : 0;
      for (let p = start; p < list.length; p++) {
        const s = list[p];
        if (s.some((i) => block[i])) continue;
        const r0 = (s[0] / n) | 0, c0 = s[0] % n, vertical = len > 1 && s[1] !== s[0] + 1;
        if (vertical ? cc[c0] + len > cols[c0] || s.some((i) => rc[(i / n) | 0] + 1 > rows[(i / n) | 0])
          : rc[r0] + len > rows[r0] || s.some((i) => cc[i % n] + 1 > cols[i % n])) continue;
        const prevBlock = block.slice();
        s.forEach((i) => { ship[i] = 1; rc[(i / n) | 0]++; cc[i % n]++; block[i] = 1; ring(n, i).forEach((j) => (block[j] = 1)); });
        if (roomy()) go(k + 1, p);
        s.forEach((i) => { ship[i] = 0; rc[(i / n) | 0]--; cc[i % n]--; });
        block.set(prevBlock);
        if (found.length >= limit) return;
      }
    };
    go(0, -1);
    return { found, complete: nodes <= 150000 };
  }

  function generate(n, fleet, hints) {
    for (;;) {
      const ship = place(n, fleet);
      const rows = Array.from({ length: n }, (_, r) => ship.slice(r * n, r * n + n).reduce((a, b) => a + b, 0));
      const cols = Array.from({ length: n }, (_, c) => rows.reduce((a, _, r) => a + ship[r * n + c], 0));
      const hint = new Uint8Array(n * n);
      // na start kilka pól statków
      shuffle([...ship.keys()].filter((i) => ship[i])).slice(0, hints).forEach((i) => (hint[i] = 2));
      let ok = false;
      for (let t = 0; t < 20; t++) {
        const { found, complete } = solve(n, fleet, rows, cols, hint);
        if (!complete) break;
        if (found.length === 1) { ok = true; break; }
        const other = found.find((f) => f.some((v, i) => v !== ship[i]));
        const diff = [...ship.keys()].filter((i) => other[i] !== ship[i]);
        const i = pick(diff);
        hint[i] = ship[i] ? 2 : 1;
      }
      if (ok) return (api.last = { n, fleet, ship, rows, cols, hint });
    }
  }

  // Statki ułożone przez gracza: proste odcinki pól statku. Zwraca długości i pola stykające się po przekątnej.
  function segments(n, mark) {
    const seen = new Uint8Array(n * n), lens = [], bad = new Set();
    for (let i = 0; i < n * n; i++) {
      if (mark[i] !== 2 || seen[i]) continue;
      const stack = [i], part = [];
      seen[i] = 1;
      while (stack.length) {
        const a = stack.pop();
        part.push(a);
        for (const j of ring(n, a)) {
          if (mark[j] !== 2) continue;
          const diag = ((j / n) | 0) !== ((a / n) | 0) && j % n !== a % n;
          if (diag) { bad.add(a); bad.add(j); continue; }
          if (!seen[j]) { seen[j] = 1; stack.push(j); }
        }
      }
      const rs = new Set(part.map((x) => (x / n) | 0)), cs = new Set(part.map((x) => x % n));
      if (rs.size > 1 && cs.size > 1) part.forEach((x) => bad.add(x));
      // statek jest kompletny, gdy dookoła (w pionie i poziomie) ma tylko wodę albo brzeg
      const done = part.every((x) => ring(n, x).every((j) => part.includes(j) || mark[j] === 1 || (((j / n) | 0) !== ((x / n) | 0) && j % n !== x % n)));
      lens.push({ len: part.length, cells: part, done });
    }
    return { lens, bad };
  }

  const api = { ring, spots, place, solve, generate, segments, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Ships;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "statki"), {
  levels: [
    { key: "easy", name: "6 × 6", points: 10, n: 6, fleet: [3, 2, 2, 1, 1, 1], hints: 2 },
    { key: "medium", name: "8 × 8", points: 25, n: 8, fleet: [4, 3, 2, 2, 1, 1, 1], hints: 2 },
    { key: "hard", name: "10 × 10", points: 50, n: 10, fleet: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], hints: 1 },
  ],
  rules: [
    "Na planszy ukryta jest cała flota z panelu. Statki leżą poziomo albo pionowo i nie stykają się, nawet rogami.",
    "Liczby przy wierszach i kolumnach mówią, ile pól statków w nich leży.",
    "Kliknięcie stawia fragment statku, drugie wodę, trzecie czyści. Prawy przycisk i przeciąganie rozlewają wodę. Kliknięcie liczby zalewa resztę spełnionego wiersza lub kolumny.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Pewny celownik", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Szybki zwiad", desc: "Rozwiąż średni poziom w mniej niż 4 min.", points: 25 },
    { id: "mistrz", name: "Admirał", desc: "Rozwiąż trudny poziom w mniej niż 8 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, fleet, ship, rows, cols, hint } = Ships.generate(ctx.level.n, ctx.level.fleet, ctx.level.hints);
    const m = n + 1;
    const mark = Array.from(hint); // 0 nic, 1 woda, 2 statek
    const all = gridCells(board, m, m, "sh", { gap: 0.05, label: null });
    board.style.setProperty("--max", "70px");
    const cells = Array.from({ length: n * n }, (_, i) => all[(((i / n) | 0) + 1) * m + (i % n) + 1]);
    const rowClue = rows.map((_, r) => all[(r + 1) * m]);
    const colClue = cols.map((_, c) => all[c + 1]);
    all[0].classList.add("corner");
    all[0].disabled = true;
    rowClue.forEach((b, r) => { b.classList.add("clue"); b.textContent = rows[r]; b.setAttribute("aria-label", `Wiersz ${r + 1}: ${rows[r]}`); });
    colClue.forEach((b, c) => { b.classList.add("clue"); b.textContent = cols[c]; b.setAttribute("aria-label", `Kolumna ${c + 1}: ${cols[c]}`); });
    cells.forEach((b, i) => {
      b.dataset.t = i;
      b.style.setProperty("--k", ((i / n) | 0) + (i % n));
      b.setAttribute("aria-label", `Wiersz ${((i / n) | 0) + 1}, kolumna ${(i % n) + 1}`);
      if (hint[i]) { b.classList.add("given"); b.disabled = true; }
    });
    const fleetEl = el("div", "sh-fleet");
    ctx.panel.append(panelBlock("Flota", fleetEl));
    const save = ctx.undoable((s) => { s.forEach((v, i) => (mark[i] = v)); render(); });

    let paint = -1;
    const apply = (i, v) => {
      if (hint[i] || mark[i] === v) return false;
      mark[i] = v;
      if (v === 2) replay(cells[i], "pop");
      return true;
    };
    const after = (placed) => {
      const res = render();
      if (ship.every((v, i) => !!v === (mark[i] === 2))) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 240) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 480 && ctx.undos === 0) ctx.achieve("mistrz");
      return ctx.win();
      }
      if (placed >= 0 && res.bad.has(placed)) return Sound.error();
      placed >= 0 ? Sound.place(3) : Sound.tap();
    };
    board.addEventListener("contextmenu", (e) => e.preventDefault());
    board.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".gb-cell");
      if (!b || b.disabled || ctx.done) return;
      if (b.classList.contains("clue")) return fillLine(b);
      const i = +b.dataset.t;
      save(mark.slice());
      paint = e.button === 2 ? (mark[i] === 1 ? 0 : 1) : [2, 1, 0][mark[i]];
      apply(i, paint);
      after(paint === 2 ? i : -1);
    });
    ctx.on(document, "pointermove", (e) => {
      if (paint < 0 || paint === 2) return;
      const b = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".sh .gb-cell");
      if (b?.dataset.t != null && apply(+b.dataset.t, paint)) after(-1);
    });
    ctx.on(document, "pointerup", () => { paint = -1; });

    function fillLine(b) {
      const r = rowClue.indexOf(b), c = colClue.indexOf(b);
      const line = r >= 0 ? [...Array(n).keys()].map((k) => r * n + k) : [...Array(n).keys()].map((k) => k * n + c);
      const empty = line.filter((i) => !mark[i]);
      if (!empty.length) return;
      save(mark.slice());
      empty.forEach((i) => apply(i, 1));
      after(-1);
    }

    function render() {
      const res = Ships.segments(n, mark);
      const isShip = (r, c) => r >= 0 && r < n && c >= 0 && c < n && mark[r * n + c] === 2;
      cells.forEach((b, i) => {
        const r = (i / n) | 0, c = i % n;
        b.classList.toggle("water", mark[i] === 1);
        b.classList.toggle("ship", mark[i] === 2);
        b.classList.toggle("bad", res.bad.has(i));
        // kształt fragmentu z sąsiadów: dziób, rufa, środek, pojedynczy
        const shape = mark[i] !== 2 ? "" : ["t", "b", "l", "r"].filter((d, k) => isShip(...[[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]][k])).join("");
        b.dataset.shape = shape;
      });
      const rowCount = rows.map((_, r) => mark.slice(r * n, r * n + n).filter((v) => v === 2).length);
      const colCount = cols.map((_, c) => rows.reduce((a, _, r) => a + (mark[r * n + c] === 2), 0));
      const state = (b, have, want) => { b.classList.toggle("ok", have === want); b.classList.toggle("over", have > want); };
      rowClue.forEach((b, r) => state(b, rowCount[r], rows[r]));
      colClue.forEach((b, c) => state(b, colCount[c], cols[c]));
      // flota: odhaczamy statki, które gracz już zamknął wodą
      const doneLens = res.lens.filter((s) => s.done).map((s) => s.len);
      fleetEl.replaceChildren(...fleet.map((len) => {
        const k = doneLens.indexOf(len);
        if (k >= 0) doneLens.splice(k, 1);
        const s = el("span", `sh-boat${k >= 0 ? " found" : ""}`);
        for (let t = 0; t < len; t++) s.append(el("i"));
        return s;
      }));
      const placed = mark.filter((v) => v === 2).length, total = ship.reduce((a, b) => a + b, 0);
      ctx.progress(Math.min(placed, total) / total * 0.95);
      return res;
    }
    render();
  },
});
