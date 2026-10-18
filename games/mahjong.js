// Mahjong (pasjans): zdejmuj pary jednakowych wolnych kamieni. Kamień jest wolny, gdy nic na nim nie leży
// i ma wolny lewy albo prawy bok. Pozycje { x, y, z } w półpolach: kamień zajmuje 2 × 2 półpola.
const Mahjong = (() => {
  // warstwy: [szerokość, wysokość, przesunięcie x, przesunięcie y] w całych kamieniach
  const LAYOUTS = {
    small: [[6, 4, 0, 0], [4, 2, 1, 1], [2, 1, 2, 1.5]],
    medium: [[8, 5, 0, 0], [6, 3, 1, 1], [4, 2, 2, 1.5], [2, 1, 3, 2]],
    big: [[10, 6, 1, 0], [8, 4, 2, 1], [6, 2, 3, 2], [4, 2, 4, 2], [2, 1, 5, 2.5], [1, 1, 0, 2.5], [1, 1, 11, 2.5]],
  };
  function positions(name) {
    const out = [];
    LAYOUTS[name].forEach(([w, h, ox, oy], k) => {
      // dwie ostatnie warstwy dużego układu to skrzydła na poziomie stołu
      const z = name === "big" && k >= 5 ? 0 : k;
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: (ox + i) * 2, y: (oy + j) * 2, z });
    });
    return out;
  }
  // wolny: nic nie leży wyżej na zakładkę i jeden z boków jest pusty
  function isFree(t, live) {
    let left = false, right = false;
    for (const u of live) {
      if (u === t) continue;
      if (u.z === t.z + 1 && Math.abs(u.x - t.x) < 2 && Math.abs(u.y - t.y) < 2) return false;
      if (u.z === t.z && Math.abs(u.y - t.y) < 2) {
        if (u.x === t.x - 2) left = true;
        if (u.x === t.x + 2) right = true;
      }
    }
    return !left || !right;
  }
  // Rozdanie z gwarancją rozwiązania: zdejmujemy losowe pary wolnych pozycji i dajemy im ten sam symbol.
  function deal(tiles, symbols) {
    for (;;) {
      const live = new Set(tiles), order = [];
      while (live.size) {
        const free = [...live].filter((t) => isFree(t, live));
        if (free.length < 2) break;
        const a = free.splice(rnd(free.length), 1)[0], b = free[rnd(free.length)];
        live.delete(a);
        live.delete(b);
        order.push([a, b]);
      }
      if (live.size) continue;
      const pool = shuffle(symbols.slice());
      order.forEach(([a, b], k) => { a.s = b.s = pool[k]; });
      return order;
    }
  }
  function generate(name, kinds) {
    const tiles = positions(name);
    // każdy symbol w dwóch parach (cztery kamienie), jak w prawdziwym mahjongu
    const pairs = tiles.length / 2;
    const symbols = Array.from({ length: pairs }, (_, k) => ((k / 2) | 0) % kinds);
    const order = deal(tiles, symbols);
    return (api.last = { tiles, order });
  }
  const moves = (live) => {
    const free = [...live].filter((t) => isFree(t, live));
    const out = [];
    for (let a = 0; a < free.length; a++) for (let b = a + 1; b < free.length; b++) if (free[a].s === free[b].s) out.push([free[a], free[b]]);
    return out;
  };
  const api = { LAYOUTS, positions, isFree, deal, generate, moves, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Mahjong;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "mahjong"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, layout: "small", kinds: 9, shuffles: 3, helper: true },
    { key: "medium", name: "Średni", points: 25, layout: "medium", kinds: 16, shuffles: 2, helper: true },
    { key: "hard", name: "Trudny", points: 50, layout: "big", kinds: 28, shuffles: 1, helper: false },
  ],
  rules: [
    "Zdejmuj pary jednakowych kamieni, aż opróżnisz stół.",
    "Zdjąć można tylko kamień wolny: nic na nim nie leży, a jego lewy albo prawy bok jest odsłonięty.",
    "Gdy zabraknie par, możesz potasować pozostałe kamienie. Liczba tasowań jest ograniczona.",
  ],
  achievements: [
    { id: "bez-tasowania", name: "Bez tasowania", desc: "Wyczyść stół bez tasowania kamieni.", points: 10 },
    { id: "czyste-rece", name: "Czyste ręce", desc: "Wygraj średni poziom bez tasowania i bez cofania.", points: 25 },
    { id: "mistrz-mahjonga", name: "Mistrz mahjonga", desc: "Wygraj trudny poziom bez tasowania.", points: 50 },
  ],
  mount(board, ctx) {
    const { tiles } = Mahjong.generate(ctx.level.layout, ctx.level.kinds);
    const motifs = GAMES.filter((g) => g.id !== "mahjong");
    let live = new Set(tiles), sel = null, shuffles = ctx.level.shuffles;
    const maxX = Math.max(...tiles.map((t) => t.x)) / 2 + 1, maxY = Math.max(...tiles.map((t) => t.y)) / 2 + 1;
    const maxZ = Math.max(...tiles.map((t) => t.z));
    board.classList.add("mj");
    board.classList.toggle("helper", ctx.level.helper);
    board.style.setProperty("--cols", maxX + 0.4);
    board.style.setProperty("--rows", maxY * 1.28 + 0.4 + maxZ * 0.12);
    board.style.setProperty("--zx", maxZ);
    const els = new Map();
    tiles.forEach((t, k) => {
      const b = button("", "mj-tile");
      b.style.setProperty("--x", t.x / 2);
      b.style.setProperty("--y", t.y / 2);
      b.style.setProperty("--z", t.z);
      b.style.zIndex = t.z * 1000 + t.y * 20 + t.x;
      b.dataset.k = k;
      const face = el("span", "mj-face");
      b.append(face);
      board.append(b);
      els.set(t, b);
    });
    const paintTile = (t) => {
      const face = els.get(t).firstChild;
      const m = motifs[t.s % motifs.length];
      paint(face, m);
      face.replaceChildren(glyph(m.glyph));
      els.get(t).setAttribute("aria-label", m.name);
    };
    tiles.forEach(paintTile);
    const leftEl = statBlock(ctx, "Pozostało", { meter: true });
    const hintBtn = button("Podpowiedź", "btn-ghost", () => hint());
    const shuffleBtn = button("", "btn-ghost", () => reshuffle());
    const row = el("div", "panel-row");
    row.append(hintBtn, shuffleBtn);
    ctx.panel.append(panelBlock("", row));
    const save = ctx.undoable(([l, s, sym]) => { live = l; shuffles = s; tiles.forEach((t, k) => (t.s = sym[k])); tiles.forEach(paintTile); sel = null; render(); });

    const pickTile = (t) => {
      if (ctx.done || !live.has(t)) return;
      if (!Mahjong.isFree(t, live)) { replay(els.get(t), "shake"); return Sound.error(); }
      if (!sel || sel === t) { sel = sel === t ? null : t; Sound.tap(); return render(); }
      if (sel.s !== t.s) { replay(els.get(t), "shake"); Sound.error(); sel = t; return render(); }
      save([new Set(live), shuffles, tiles.map((x) => x.s)]);
      for (const x of [sel, t]) { live.delete(x); replay(els.get(x), "gone"); }
      sel = null;
      Sound.line();
      render();
      if (!live.size) {
        const clean = shuffles === ctx.level.shuffles;
        if (clean) ctx.achieve("bez-tasowania");
        if (clean && ctx.undos === 0 && ctx.level.key === "medium") ctx.achieve("czyste-rece");
        if (clean && ctx.level.key === "hard") ctx.achieve("mistrz-mahjonga");
      }
      if (!live.size) return ctx.win(shuffles === ctx.level.shuffles ? "Bez tasowania." : "");
      if (!Mahjong.moves(live).length) {
        if (shuffles > 0) ctx.toast("Brak par. Potasuj kamienie albo cofnij ruch");
        else ctx.lose("Brak par", "Na stole nie ma już wolnych par, a tasowania się skończyły.");
      }
    };
    board.addEventListener("click", (e) => {
      const b = e.target.closest(".mj-tile");
      if (b) pickTile(tiles[+b.dataset.k]);
    });
    function hint() {
      const m = Mahjong.moves(live);
      if (!m.length) return ctx.toast(shuffles ? "Brak par. Potasuj kamienie" : "Brak par");
      m[0].forEach((t) => replay(els.get(t), "hint"));
      Sound.tap();
    }
    function reshuffle() {
      if (ctx.done || !shuffles) return;
      save([new Set(live), shuffles, tiles.map((x) => x.s)]);
      shuffles--;
      // nowe rozdanie tych samych symboli na pozostałych miejscach, znowu z gwarancją rozwiązania
      const rest = [...live];
      const symbols = [];
      const counts = new Map();
      rest.forEach((t) => counts.set(t.s, (counts.get(t.s) || 0) + 1));
      counts.forEach((c, s) => { for (let k = 0; k < c / 2; k++) symbols.push(s); });
      Mahjong.deal(rest, symbols);
      rest.forEach((t) => { paintTile(t); replay(els.get(t), "flip"); });
      sel = null;
      Sound.place(5);
      render();
    }

    function render() {
      const freeSet = new Set([...live].filter((t) => Mahjong.isFree(t, live)));
      tiles.forEach((t) => {
        const b = els.get(t);
        b.classList.toggle("out", !live.has(t));
        b.classList.toggle("free", freeSet.has(t));
        b.classList.toggle("sel", t === sel);
        b.disabled = !live.has(t);
      });
      const pairsLeft = Mahjong.moves(live).length;
      leftEl.set(`${live.size} / ${tiles.length}`, 1 - live.size / tiles.length, `Wolne pary: ${pairsLeft}`);
      shuffleBtn.textContent = `Tasuj (${shuffles})`;
      shuffleBtn.disabled = !shuffles;
      ctx.progress(1 - live.size / tiles.length);
    }
    render();
  },
});
