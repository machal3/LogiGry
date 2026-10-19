// Litery: kafelkowe słowo na planszy z premiami podwajającymi i potrajającymi litery lub słowa.
// Gracz gra z komputerem: słowo podłączane jest do istniejących liter, pierwsze przechodzi przez środek.
{
  // Wartości liter jak w polskim krzyżówku literowym.
  const VAL = { A:1,E:1,I:1,N:1,O:1,S:1, K:2,L:2,M:2,P:2,R:2,T:2,U:2,Y:2, B:3,C:3,D:3,H:3,J:3,Ł:3,Ń:3,
    F:4,G:4,Ó:4,W:4, Z:5,Ś:5,Ź:5,Ż:5, Ć:6, Ą:8,Ę:8 };

  // Worek z proporcjami liter.
  const BAG = "AAAEEEIIINNNOOOSSSKKLLMMPPRRTTYYBBBDDDHHHJJJŁŁŁFFF".split("")
    .concat("GGGÓÓWWZZŻŹŚŚŚĆCCAAEEÓÓYYYUWWNNN".split(""));

  // Słownik gry: codzienne polskie wyrazy, 3–7 liter.
  const WORDS = [
"BAR","BÓL","BUS","DAR","DÓŁ","DOM","DUO","ERA","FAN","GAZ","GOL","KAT","KOT","KOC","KOS","LOT","LÓD","LUB","LAS","MUR","NOS","NÓŻ","NOC","OKO","PYŁ","POT","RAK","RAZ","RYK","SÓL","SUM","TAK","TOR","TÓR","WÓZ","ŻAR","ONA","ONI","IKS","CEL","PSY","RYM","ŁAN","DWA","SĄD","PAL","PÓŁ","PAW","BAZA","CIEŃ","CZAS","DUCH","FOKA","GÓRA","HALA","IGŁA","JAMA","KAWA","KLAN","KOLA","LATO","LAMA","MOST","MUZA","NAWA","NUDA","OWCA","PANI","PIĘĆ","PIŁA","PLON","POLE","RADA","SALA","SIŁA","SKOK","STOP","WODA","ZIMA","ZAJĄC","ŻÓŁĆ","ŻABA","LIŚĆ","ŁÓDŹ","MĄKA","MÓZG","OWOC","PIEC","RÓŻA","KOSA","ŻUBR","ZNAK","ARMIA","ATLAS","BETON","CEGŁA","DŹWIG","KOŁO","JĘZYK","KAWKA","KLAMA","KLUCZ","KÓŁKO","KOREK","LAMPA","LODKA","ŁAWKA","MASŁO","MEBLE","MEDIA","NARÓD","PIŁKA","PISMO","PRACA","PRÓBA","POTOK","POWÓZ","RÓŻKA","SŁOIK","SÓJKA","SZOSA","ŚLIMAK","SIATKA","TAPETA","TRAWA","WAFEL","WAGON","WAPNO","WINDA","WOJNA","WÓDKA","ZAWÓR","ZEGAR","ZIOŁA","BUDOWA","GRUSZA","MIASTO","NEKTAR","OGÓREK","OGRODY","SALATA","SZKOŁA","ŚCIANA","ULOTKA","WESOŁY","LUSTRO","EGZAMIN","HERBATA","MASZYNA","WIECZÓR",
  ];

  // plansza 11 × 11, środek w (5,5)
  const N = 11, C = 60;

  // Premie w zależności od pola (r, c).
  function premAt(idx) {
    const r = (idx / 11) | 0, c = idx % 11;
    if (r === 5 && c === 5) return "S";
    if ((r === 2 && (c === 3 || c === 7)) || ((r === 3 || r === 7) && (c === 2 || c === 8)) ||
        (r === 8 && (c === 3 || c === 7))) return "L2";
    if ((r === c && (r === 1 || r === 9)) || (r === 1 && c === 9) || (r === 9 && c === 1)) return "L3";
    if ((r === 0 && (c === 4 || c === 6)) || (r === 10 && (c === 4 || c === 6)) ||
        (c === 0 && (r === 4 || r === 6)) || (c === 10 && (r === 4 || r === 6))) return "W2";
    return "";
  }

  function canConstruct(word, letters, extra) {
    const pool = new Map();
    for (const ch of [...letters, ...(extra ? [extra] : [])]) pool.set(ch, (pool.get(ch) || 0) + 1);
    for (const ch of word) {
      const n = pool.get(ch) || 0;
      if (!n) return false;
      pool.set(ch, n - 1);
    }
    return true;
  }

  function drawRack(n) {
    const out = [];
    for (let k = 0; k < n; k++) out.push(pick(BAG));
    return out;
  }

  function dict(w) {
    return WORDS.includes(w);
  }

  // Ocena ruchu: tiles — Map idx -> litera; grid — tablica 121 napisów; first — czy pierwszy ruch.
  function evalMove(grid, tiles, first) {
    if (!tiles.size) return { ok: false, err: "Nie położono kafelków." };
    if (first && ![...tiles.keys()].includes(C)) return { ok: false, err: "Pierwsze słowo musi przechodzić przez środek." };
    if (tiles.size < 2) return { ok: false, err: "Potrzeba co najmniej dwóch kafelków." };
    if (!first) {
      let touch = false;
      for (const idx of tiles.keys()) {
        const r = (idx / 11) | 0, c = idx % 11;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < 11 && nc >= 0 && nc < 11 && grid[nr * 11 + nc]) touch = true;
        }
      }
      if (!touch) return { ok: false, err: "Słowo musi łączyć się z istniejącymi literami." };
    }
    const rows = new Set([...tiles.keys()].map((i) => (i / 11) | 0));
    const cols = new Set([...tiles.keys()].map((i) => i % 11));
    if (rows.size > 1 && cols.size > 1) return { ok: false, err: "Kafelki muszą leżeć w linii." };
    // ciągłość linii: między kafelkami nie może być wolnego pola (istniejące litery mogą łączyć)
    const arr = [...tiles.keys()];
    if (rows.size === 1) {
      const rr = rows.values().next().value;
      const cs = arr.map((i) => i % 11);
      for (let c = Math.min(...cs); c <= Math.max(...cs); c++) {
        const i = rr * 11 + c;
        if (!tiles.has(i) && !grid[i]) return { ok: false, err: "Kafelki muszą dotykać się w linii." };
      }
    } else {
      const cc = cols.values().next().value;
      const rs = arr.map((i) => (i / 11) | 0);
      for (let r = Math.min(...rs); r <= Math.max(...rs); r++) {
        const i = r * 11 + cc;
        if (!tiles.has(i) && !grid[i]) return { ok: false, err: "Kafelki muszą dotykać się w linii." };
      }
    }
    const scored = new Set();
    const words = [];
    let pts = 0;
    for (const idx of arr) {
      const h = hRun(idx);
      if (h.length >= 2 && !scored.has("h" + h[0])) { scored.add("h" + h[0]); const e = tally(h); if (e) return e; }
      const v = vRun(idx);
      if (v.length >= 2 && !scored.has("v" + v[0])) { scored.add("v" + v[0]); const e = tally(v); if (e) return e; }
    }
    if (!scored.size) return { ok: false, err: "Słowo za krótkie." };
    return { ok: true, pts, words };

    // ciąg z pustymi łączonymi literami: poziomo i pionowo przez pole idx
    function hRun(idx) {
      const r = (idx / 11) | 0, c = idx % 11;
      let a = c - 1;
      while (a >= 0 && (grid[r * 11 + a] || tiles.has(r * 11 + a))) a--;
      let b = c + 1;
      while (b < 11 && (grid[r * 11 + b] || tiles.has(r * 11 + b))) b++;
      const out = [];
      for (let k = a + 1; k < b; k++) out.push(r * 11 + k);
      return out;
    }
    function vRun(idx) {
      const r = (idx / 11) | 0, c = idx % 11;
      let a = r - 1;
      while (a >= 0 && (grid[a * 11 + c] || tiles.has(a * 11 + c))) a--;
      let b = r + 1;
      while (b < 11 && (grid[b * 11 + c] || tiles.has(b * 11 + c))) b++;
      const out = [];
      for (let k = a + 1; k < b; k++) out.push(k * 11 + c);
      return out;
    }

    function tally(runIdx) {
      let word = "";
      let base = 0;
      let mult = 1;
      for (const i of runIdx) {
        const isNew = tiles.has(i);
        const ch = isNew ? tiles.get(i) : grid[i];
        word += ch;
        let v = VAL[ch];
        if (isNew) {
          const p = premAt(i);
          if (p === "L2") v *= 2;
          if (p === "L3") v *= 3;
          if (p === "W2") mult *= 2;
        }
        base += v;
      }
      if (!dict(word)) return { ok: false, err: `Nie znaleziono słowa: ${word}` };
      words.push(word);
      pts += base * mult;
    }
  }

  // Ruch komputera: najlepiej punktowane podłączenie słowa do istniejących liter.
  function aiMove(grid, rack, first) {
    let best = null;
    const byLetter = new Map();
    for (const w of WORDS)
      for (const ch of new Set(w.split(""))) {
        if (!byLetter.has(ch)) byLetter.set(ch, []);
        byLetter.get(ch).push(w);
      }
    if (first) {
      for (const w of WORDS) {
        if (w.length < 2 || !canConstruct(w, rack)) continue;
        for (let k = 0; k < w.length; k++) {
          for (const v of [0, 1]) {
            const r0 = v ? 5 - k : 5, c0 = v ? 5 : 5 - k;
            const tl = new Map();
            for (let j = 0; j < w.length; j++) tl.set(v ? (r0 + j) * 11 + c0 : r0 * 11 + c0 + j, w[j]);
            const e = evalMove(grid, tl, true);
            if (e.ok && (!best || e.pts > best.pts)) best = { tl, pts: e.pts, word: w };
          }
        }
      }
      return best;
    }
    for (let idx = 0; idx < 121; idx++) {
      if (!grid[idx]) continue;
      const ch = grid[idx];
      for (const w of byLetter.get(ch) || []) {
        if (!canConstruct(w, rack, ch)) continue;
        for (let k = 0; k < w.length; k++) {
          if (w[k] !== ch) continue;
          for (const v of [0, 1]) {
            const r0 = v ? ((idx / 11) | 0) - k : (idx / 11) | 0;
            const c0 = v ? idx % 11 : (idx % 11) - k;
            if (r0 < 0 || c0 < 0) continue;
            if (v ? r0 + w.length > 11 : c0 + w.length > 11) continue;
            const tl = new Map();
            let overlap = 0, bad = false;
            for (let j = 0; j < w.length; j++) {
              const i = v ? (r0 + j) * 11 + c0 : r0 * 11 + c0 + j;
              if (grid[i]) {
                if (grid[i] !== w[j]) { bad = true; break; }
                overlap++;
              } else tl.set(i, w[j]);
            }
            // trzeba choć jedno zderzenie, bez kolizji liter
            if (bad || !overlap || !tl.size) continue;
            const e = evalMove(grid, tl, false);
            if (e.ok && (!best || e.pts > best.pts)) best = { tl, pts: e.pts, word: w };
          }
        }
      }
    }
    return best;
  }

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "litery",
    cat: "slowa",
    name: "Litery",
    author: "GLM 5.3 Flash",
    desc: "Układaj słowa z kafelków na planszy z premiami. Graj z komputerem o wyższy wynik.",
    color: "#a16207",
    ink: "#ffffff",
    glyph: [".###.", "#...#", "#.###", "#...#", ".###."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, rounds: 7 },
      { key: "medium", name: "Średni", points: 50, rounds: 10 },
      { key: "hard", name: "Trudny", points: 100, rounds: 12 },
    ],
    rules: [
      "Z siedmiu kafelków układaj słowa na planszy. Pierwsze słowo musi przechodzić przez środek, kolejne łączyć się z już położonymi literami.",
      "Premie na planszy podwajają lub potrajają literę albo całe słowo, jeśli trafi na nie nowy kafelek.",
      "Zagraj przyciskiem Zagraj, a komputer wystawi swoje słowo. Po ostatniej rundzie wygrywa większa suma punktów.",
      "Nieznane słowo nie straci kafelków: popraw je albo wyczyść. Nadmiar kafelków możesz raz na partię wymienić.",
    ],
    achievements: [
      { id: "podwojenie", name: "Podwojenie", desc: "Zagraj słowo trafiające nowym kafelkiem na premię podwajającą słowo.", points: 10 },
      { id: "wielkie", name: "Wielkie", desc: "Zagraj słowo warte co najmniej 40 punktów.", points: 25 },
      { id: "przewaga", name: "Przewaga", desc: "Ukończ partię z przewagą co najmniej 40 punktów.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const grid = new Array(121).fill("");
      let rack = drawRack(7);
      const rackAI = drawRack(7);
      let round = 0, me = 0, you = 0, swapped = false, bestWord = 0;
      const cellB = gridCells(board, 11, 11, "lt-grid");
      cellB.forEach((b) => b.classList.add("lt-sq"));
      const sel = { tile: -1, placed: new Map() };
      const scoreMe = statBlock(ctx, "Ty", {});
      const scoreEl = statBlock(ctx, "Komputer", { small: true });
      const prEl = statBlock(ctx, "Runda", { small: true });
      ctx.panel.append(panelBlock("Kafelki", rackEl()), panelBlock("Ruch",
        button("Zagraj", "btn wide", play),
        button("Podpowiedź", "btn-ghost wide", hint),
        button("Wyczyść", "btn-ghost wide", clear),
        button("Wymiana", "btn-ghost wide", swap)),
        panelBlock("Premie", (() => {
          const p = el("div", "lt-leg");
          p.append(el("span", "", "L2 — podwójna litera"), el("span", "", "L3 — potrójna litera"),
            el("span", "", "W2 — podwójne słowo"), el("span", "", "gwiazda — start na środku"));
          return p;
        })()));

      function rackEl() {
        const d = el("div", "lt-rack");
        rack.forEach((ch, i) => d.append(button(ch || "—", "btn-ghost lt-tile", () => {
          if (ctx.done) return;
          sel.tile = sel.tile === i ? -1 : i;
          raked();
        })));
        return d;
      }

      function raked() {
        board.querySelectorAll(".lt-tile").forEach((b, i) => {
          b.classList.toggle("on", i === sel.tile);
          b.textContent = rack[i] || "—";
          if (rack[i]) b.dataset.val = VAL[rack[i]] ?? 1;
          else delete b.dataset.val;
        });
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".gb-cell");
        if (!b || ctx.done) return;
        const i = +b.dataset.i;
        if (grid[i]) { Sound.tap(); return; }
        if (sel.placed.has(i)) {
          // odłożenie własnego kafelka z powrotem na stojak
          rack.push(sel.placed.get(i));
          sel.placed.delete(i);
          Sound.erase();
          render();
          return;
        }
        if (sel.tile < 0 || !rack[sel.tile]) return;
        sel.placed.set(i, rack[sel.tile]);
        rack.splice(sel.tile, 1);
        sel.tile = -1;
        Sound.tap();
        render();
      });

      function clear() {
        if (ctx.done) return;
        for (const [i, ch] of [...sel.placed]) { rack.push(ch); sel.placed.delete(i); }
        sel.tile = -1;
        Sound.erase();
        render();
      }

      function swap() {
        if (ctx.done || swapped) return;
        swapped = true;
        clear();
        for (let k = 0; k < rack.length; k++) rack[k] = pick(BAG);
        Sound.erase();
        render();
      }

      // Podpowiedź: najlepszy dostępny wyraz (trzy na partię), z derzeniami o planszę.
      let hints = 3;
      function hint() {
        if (ctx.done || hints <= 0) return;
        const cands = WORDS.filter((w) => w.length >= 3 && canConstruct(w, rack));
        for (let idx = 0; idx < 121; idx++) {
          if (!grid[idx]) continue;
          const ch = grid[idx];
          for (const w of WORDS)
            if (w.includes(ch) && canConstruct(w, rack, ch)) cands.push(w);
        }
        if (!cands.length) { ctx.toast("Brak możliwych słów — wymień kafelki."); return; }
        // sortuj po długości, podpowiadaj spośród najdłuższych
        const top = [...new Set(cands)].sort((a, b) => b.length - a.length).slice(0, 6);
        hints--;
        ctx.toast(`Podpowiedź: ${pick(top)} (zostały ${hints})`);
      }

      function play() {
        if (ctx.done) return;
        const e = evalMove(grid, new Map(sel.placed), round === 0);
        if (!e.ok) { Sound.error(); replay(board, "shake"); ctx.toast(e.err); return; }
        for (const [i, ch] of sel.placed) grid[i] = ch;
        me += e.pts;
        bestWord = Math.max(bestWord, e.pts);
        let hitW = false;
        for (const i of sel.placed.keys()) if (premAt(i) === "W2") hitW = true;
        if (hitW) ctx.achieve("podwojenie");
        if (e.pts >= 40) ctx.achieve("wielkie");
        Sound.place(1 + Math.min(9, (e.pts / 4) | 0));
        sweep([...sel.placed.keys()].map((i) => cellB[i]));
        while (rack.length < 7) rack.push(pick(BAG));
        round++;
        sel.placed = new Map();
        sel.tile = -1;
        render();
        ctx.toast(`+${e.pts} pkt`);
        setTimeout(aiTurn, 500);
      }

      function aiTurn() {
        if (ctx.done) return;
        // gracz zawsze zaczyna, więc komputer nigdy nie gra pierwszego słowa
        const mv = aiMove(grid, rackAI, false);
        if (mv) {
          for (const [i, ch] of mv.tl) grid[i] = ch;
          // komputer traci tylko kafelki, które realnie położył (zderzenia bierze z planszy)
          for (const ch of mv.tl.values()) {
            const j = rackAI.indexOf(ch);
            if (j >= 0) rackAI.splice(j, 1);
          }
          while (rackAI.length < 7) rackAI.push(pick(BAG));
          you += mv.pts;
          Sound.place(1 + Math.min(9, (mv.pts / 6) | 0));
          // fala światła przez świeżo położone kafelki komputera
          sweep([...mv.tl.keys()].map((i) => cellB[i]));
        } else ctx.toast("Komputer odpuszcza tę rundę.");
        render();
        if (round >= L.rounds) finishGame();
      }

      function finishGame() {
        const lead = me - you;
        if (lead >= 40) ctx.achieve("przewaga");
        const note = bestWord ? ` Najlepsze słowo: ${bestWord} pkt.` : "";
        if (lead > 0) ctx.win(`Wynik: Ty ${me}, komputer ${you}.${note}`);
        else ctx.lose("Porażka", `Wynik: Ty ${me}, komputer ${you}.${note}`);
      }

      function render() {
        cellB.forEach((b, i) => {
          if (grid[i]) { b.textContent = grid[i]; b.classList.add("lt-filled"); b.classList.remove("lt-placed"); }
          else if (sel.placed.has(i)) { b.textContent = sel.placed.get(i); b.classList.add("lt-placed"); b.classList.remove("lt-filled"); }
          else {
            b.textContent = "";
            b.classList.remove("lt-filled", "lt-placed");
            b.classList.toggle("lt-l2", premAt(i) === "L2");
            b.classList.toggle("lt-l3", premAt(i) === "L3");
            b.classList.toggle("lt-w2", premAt(i) === "W2");
            b.classList.toggle("lt-start", i === 60);
          }
        });
        raked();
        scoreMe.set(String(me), Math.min(1, me / 120), bestWord ? `rekord słowa: ${bestWord}` : "");
        scoreEl.set(String(you));
        prEl.set(`runda ${Math.min(round + 1, L.rounds)} z ${L.rounds}`);
        ctx.progress(Math.min(1, round / L.rounds));
      }
      render();
    },
  });

  if (typeof module !== "undefined") module.exports = { evalMove, canConstruct, aiMove, drawRack, premAt, VAL, dict, WORDS, C, N };
}
