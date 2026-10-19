// Zestaw wspólnych elementów gier: plansze, bloki panelu, karty, kości, pionki, płytki, klawiatura liter.
// Opis i przykłady: AGENTS.md, punkty „Plansza” i „Zestaw”. Wygląd: zestaw.css. Pokaz wszystkich elementów: index.html#/zestaw.
// Używa el(), button(), panelBlock() i replay() z app.js (wołane dopiero w mount, gdy app.js jest już wczytany).

// --- Plansze, które same dopasowują się do ekranu ---

// Plansza o własnym układzie: cols × rows pól o boku var(--s). Elementy w środku mierz w var(--s), nie w px.
function fitBoard(board, cols, rows, { max = 88, cls = "" } = {}) {
  board.classList.add("fit", ...cls.split(" ").filter(Boolean));
  board.style.setProperty("--cols", cols);
  board.style.setProperty("--rows", rows);
  board.style.setProperty("--max", `${max}px`);
  return board;
}

const SVG_NS = "http://www.w3.org/2000/svg";
// Element SVG z atrybutami; z `parent` od razu do niego dopisany.
function svgEl(tag, attrs = {}, parent) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.append(n);
  return n;
}

// Plansza SVG we współrzędnych W × H (jak canvasGame): linie, łuki, plansze do gier planszowych.
// max: największa szerokość planszy to 10 × max px. Kolory w SVG przez klasy z gra.css albo fill="var(--p1)".
function svgBoard(board, W, H, { max = 80, cls = "" } = {}) {
  fitBoard(board, 10, (10 * H) / W, { max, cls: `svgb ${cls}` });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "svgb-svg" }, board);
  return {
    svg, W, H,
    add: (tag, attrs, parent = svg) => svgEl(tag, attrs, parent),
    // położenie wskaźnika w jednostkach planszy
    at(e) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      return [p.x, p.y];
    },
  };
}

// --- Bloki panelu ---

// Kilka małych wartości w jednym bloku (2–4): statsBlock(ctx, "Partia", ["Punkty", "Ruchy"]).set("Punkty", 12).
function statsBlock(ctx, title, names) {
  const dl = el("dl", "ui-stats");
  const vals = {};
  for (const n of names) {
    const row = el("div");
    vals[n] = el("dd", "", "–");
    row.append(el("dt", "", n), vals[n]);
    dl.append(row);
  }
  const block = panelBlock(title, dl);
  ctx.panel.append(block);
  return {
    block,
    set(name, v) {
      const dd = vals[name];
      if (dd.textContent === String(v)) return;
      dd.textContent = v;
      // wartości zmieniane co klatkę nie podskakują
      const now = performance.now();
      if (now - (dd.at || 0) > 400 && dd.at) replay(dd, "tick");
      dd.at = now;
    },
  };
}

// Życia, rundy, ładunki: `max` znaków, set(n) zapełnia n. icon: "dot" | "heart" | "star" | "bolt".
function pipsBlock(ctx, title, max, { icon = "dot" } = {}) {
  const row = el("div", `ui-pips ui-pips-${icon}`);
  row.setAttribute("role", "img");
  const pips = Array.from({ length: max }, () => row.appendChild(el("i")));
  const note = el("p", "panel-note");
  const block = panelBlock(title, row, note);
  ctx.panel.append(block);
  let cur = -1;
  return {
    block,
    set(n, sub) {
      if (n < cur) replay(pips[n] || row, "shake");
      cur = n;
      pips.forEach((p, k) => p.classList.toggle("on", k < n));
      row.setAttribute("aria-label", `${title}: ${n} z ${max}`);
      if (sub != null) note.textContent = sub;
    },
  };
}

// Dziennik zdarzeń (ruch komputera, wynik rundy). Najnowszy wpis na górze. tone: "ok" | "bad" | "warn" | "".
function logBlock(ctx, title, { max = 4 } = {}) {
  const list = el("ol", "ui-log");
  list.setAttribute("aria-live", "polite");
  const block = panelBlock(title, list);
  ctx.panel.append(block);
  return {
    block,
    add(text, tone = "") {
      const li = el("li", "", text);
      if (tone) li.dataset.tone = tone;
      list.prepend(li);
      while (list.children.length > max) list.lastChild.remove();
    },
    clear: () => list.replaceChildren(),
  };
}

// Legenda znaków planszy: [[kształt, barwa, opis]]; kształt: circle | square | diamond | ring | line; barwa: klucz palety ("p1", "red") albo kolor.
function legendBlock(ctx, title, items) {
  const ul = el("ul", "ui-legend");
  for (const [shape, color, text] of items) {
    const sw = el("i", `ui-sw ui-sw-${shape}`);
    sw.style.setProperty("--sw", /^[a-z0-9]+$/.test(color) ? `var(--${color})` : color);
    const li = el("li");
    li.append(sw, text);
    ul.append(li);
  }
  const block = panelBlock(title, ul);
  ctx.panel.append(block);
  return block;
}

// --- Elementy planszy (rozmiar z var(--s), kolory z palety) ---

const SUITS = { s: ["♠", "pik"], h: ["♥", "kier"], d: ["♦", "karo"], c: ["♣", "trefl"] };
const RANKS = { 1: ["A", "as"], 11: ["W", "walet"], 12: ["D", "dama"], 13: ["K", "król"] };

// Karta do gry: rank 1–13 (1 = as), suit "s" | "h" | "d" | "c". drawCard zmienia istniejącą kartę.
function playingCard(rank, suit, { down = false, tag = "button" } = {}) {
  const c = el(tag, "ui-card");
  if (tag === "button") c.type = "button";
  return drawCard(c, rank, suit, down);
}
function drawCard(c, rank, suit, down = false) {
  const [sym, sname] = SUITS[suit];
  const [r, rname] = RANKS[rank] || [String(rank), String(rank)];
  c.dataset.suit = suit;
  c.classList.toggle("down", down);
  c.classList.toggle("red", suit === "h" || suit === "d");
  c.setAttribute("aria-label", down ? "Karta zakryta" : `${rname} ${sname}`);
  c.replaceChildren();
  if (!down) {
    const corner = el("span", "ui-card-corner");
    corner.append(el("b", "", r), el("i", "", sym));
    c.append(corner, el("span", "ui-card-pip", sym));
  }
  return c;
}

const DIE_PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
// Kość 1–6 (0 = pusta). drawDie(k, v, true) zmienia wynik z animacją rzutu.
function die(value, { tag = "span" } = {}) {
  const d = el(tag, "ui-die");
  if (tag === "button") d.type = "button";
  for (let k = 0; k < 9; k++) d.append(el("i"));
  return drawDie(d, value);
}
function drawDie(d, value, roll = false) {
  [...d.children].forEach((p, k) => p.classList.toggle("on", !!DIE_PIPS[value]?.includes(k)));
  d.dataset.v = value;
  d.setAttribute("aria-label", value ? `Kość: ${value}` : "Kość");
  if (roll) replay(d, "ui-roll");
  return d;
}

// Pionek: who = 1 | 2 (gracz, przeciwnik) albo barwa palety ("red"). mark: znak w środku, np. "K" dla damki.
function piece(who, { mark = "", label = "" } = {}) {
  const p = el("span", "ui-piece", mark);
  if (who === 1 || who === 2) p.dataset.p = who;
  else p.style.setProperty("--pc", `var(--${who})`);
  if (label) {
    p.setAttribute("role", "img");
    p.setAttribute("aria-label", label);
  }
  return p;
}

// Płytka z literą i punktami (gry słowne).
function letterTile(letter, points, { tag = "button" } = {}) {
  const t = el(tag, "ui-tile", letter);
  if (tag === "button") t.type = "button";
  if (points != null) t.append(el("sub", "", points));
  t.setAttribute("aria-label", points != null ? `${letter}, ${points} pkt` : letter);
  return t;
}

// Klawiatura liter z polskimi znakami; działa też fizyczna klawiatura. onKey dostaje literę, "enter" albo "back".
// Zwraca { el, set(litera, stan) }; stan: "ok" | "near" | "miss" | "" (kolor i znak, nie sam kolor). Element wstaw sam (pod planszę albo do panelu).
function letterKeys(ctx, onKey, { enter = "Sprawdź", back = true, rows = ["ĄĆĘŁŃÓŚŹŻ", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] } = {}) {
  const box = el("div", "ui-keys");
  const keys = {};
  rows.forEach((row, k) => {
    const r = el("div", "ui-keys-row");
    if (k === rows.length - 1 && enter) r.append(button(enter, "ui-key wide-key", () => onKey("enter")));
    for (const ch of row) {
      keys[ch] = button(ch, "ui-key", () => onKey(ch));
      r.append(keys[ch]);
    }
    if (k === rows.length - 1 && back) {
      const b = button("⌫", "ui-key wide-key", () => onKey("back"));
      b.setAttribute("aria-label", "Usuń literę");
      r.append(b);
    }
    box.append(r);
  });
  ctx.on(document, "keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.target.closest?.("input, textarea, select")) return;
    const ch = e.key.toUpperCase();
    if (keys[ch]) onKey(ch);
    else if (e.key === "Enter" && enter && !e.target.closest?.("button, a")) onKey("enter");
    else if (e.key === "Backspace" && back) onKey("back");
    else return;
    e.preventDefault();
  });
  return {
    el: box,
    set(ch, state) {
      const b = keys[ch.toUpperCase()];
      if (!b) return;
      if (state) b.dataset.state = state;
      else delete b.dataset.state;
    },
  };
}

// --- Pokaz zestawu: index.html#/zestaw (nie jest grą, nie ma go na liście) ---
// Trzy „poziomy” to trzy karty pokazu; zrzuty z narzedzia/podglad.mjs pokazują elementy w obu motywach.
const KIT_DEMO = {
  id: "zestaw", name: "Zestaw elementów", author: "platforma", color: "#3b5bdb", ink: "#ffffff",
  glyph: ["#.#.#", ".....", "#.#.#", ".....", "#.#.#"], achievements: [],
  levels: [{ key: "a", name: "Elementy" }, { key: "b", name: "Siatka" }, { key: "c", name: "Paleta" }],
  rules: ["Strona pokazowa wspólnych elementów gier. Opis: AGENTS.md."],
  mount(board, ctx) {
    const k = ctx.level.key;
    if (k === "a") {
      const scenes = ["", "felt", "wood", "paper", "slate"];
      fitBoard(board, 8, 6.4, { max: 96 });
      const row = (...kids) => { const r = el("div", "ui-demo-row"); r.append(...kids); board.append(r); };
      const sel = playingCard(12, "h");
      sel.classList.add("is-sel");
      row(playingCard(1, "s"), sel, playingCard(10, "d"), playingCard(13, "c"), playingCard(1, "s", { down: true }));
      const dice = [1, 2, 3, 4, 5, 6].map((v) => die(v, { tag: "button" }));
      dice.forEach((d) => d.addEventListener("click", () => drawDie(d, 1 + rnd(6), true)));
      row(...dice);
      row(piece(1), piece(2), piece(1, { mark: "K" }), piece("green"), piece("violet"), piece("gray"));
      row(...[["Ż", 5], ["Ó", 3], ["L", 2], ["W", 1], ["I", 1]].map(([l, p]) => letterTile(l, p)));
      const names = ["bez sceny", "felt (stół)", "wood (drewno)", "paper (kratka)", "slate (tablica)"];
      const scene = statBlock(ctx, "Scena planszy", { small: true });
      let cur = 0;
      scene.set(names[0]);
      scene.block.append(button("Następna scena", "btn-ghost wide", () => {
        board.classList.remove(...scenes.filter(Boolean));
        cur = (cur + 1) % scenes.length;
        if (scenes[cur]) board.classList.add(scenes[cur]);
        scene.set(names[cur]);
      }));
      legendBlock(ctx, "Legenda", [["circle", "p1", "Gracz"], ["ring", "p2", "Przeciwnik"], ["square", "red", "Pułapka"], ["diamond", "gold", "Skarb"], ["line", "teal", "Droga"]]);
    } else if (k === "b") {
      const states = ["is-sel", "is-ok", "is-bad", "is-hint", "is-lock", "is-dim", "is-on", ""];
      const cells = gridCells(board, 4, 4, "ui-demo-grid", { gap: 0.1 });
      cells.forEach((c, i) => {
        const st = states[i % states.length];
        if (st) c.classList.add(st);
        c.textContent = st ? st.slice(3) : i + 1;
      });
      statsBlock(ctx, "Partia", ["Punkty", "Ruchy", "Seria"]).set("Punkty", 120);
      pipsBlock(ctx, "Życia", 3, { icon: "heart" }).set(2);
      pipsBlock(ctx, "Gwiazdki", 3, { icon: "star" }).set(3);
      const log = logBlock(ctx, "Dziennik");
      log.add("Komputer zagrał 7 kier.");
      log.add("Zdobywasz lewę.", "ok");
      log.add("Tracisz życie.", "bad");
    } else {
      const names = ["red", "orange", "yellow", "green", "teal", "blue", "violet", "pink", "brown", "gray", "ok", "bad", "warn", "p1", "p2", "gold"];
      const s = svgBoard(board, 100, 60, { max: 70, cls: "paper" });
      names.forEach((n, i) => {
        const x = 8 + (i % 8) * 12, y = 14 + ((i / 8) | 0) * 28;
        s.add("circle", { cx: x, cy: y, r: 5, fill: `var(--${n})` });
        s.add("text", { x, y: y + 11, "text-anchor": "middle", "font-size": 3.4, fill: "var(--text)" }).textContent = n;
      });
      const keys = letterKeys(ctx, (ch) => ctx.toast(`Klawisz: ${ch}`));
      keys.set("A", "ok");
      keys.set("Ł", "near");
      keys.set("Q", "miss");
      ctx.panel.append(panelBlock("Klawiatura liter", keys.el));
    }
  },
};
