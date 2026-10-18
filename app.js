const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const paint = (node, game) => {
  node.style.setProperty("--c", game.color);
  node.style.setProperty("--on", game.ink);
};

const fmt = (s) => `${(s / 60) | 0}:${String(s % 60).padStart(2, "0")}`;

function glyph(rows) {
  const g = el("span", "glyph");
  g.setAttribute("aria-hidden", "true");
  rows.join("").split("").forEach((ch) => g.append(el("i", ch === "#" ? "on" : "")));
  return g;
}

function button(text, cls, onClick) {
  const b = el("button", cls, text);
  b.type = "button";
  if (onClick) b.onclick = onClick;
  return b;
}

const ICONS = {
  undo: "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10.5a5.5 5.5 0 0 1 0 11H11\"/>",
  restart: "<path d=\"M20.5 12a8.5 8.5 0 1 1-2.5-6\"/><path d=\"M20.5 3.5V9H15\"/>",
  sound: "<path d=\"M4 9.5h3.5L12 5v14l-4.5-4.5H4z\"/><path d=\"M16 9a4 4 0 0 1 0 6\"/><path d=\"M18.5 6.5a7.5 7.5 0 0 1 0 11\"/>",
  mute: "<path d=\"M4 9.5h3.5L12 5v14l-4.5-4.5H4z\"/><path d=\"m16.5 9.5 5 5\"/><path d=\"m21.5 9.5-5 5\"/>",
  help: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.4\"/><path d=\"M12 17.2v.1\"/>",
};

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Krótkie syntetyczne dźwięki (bez plików). Włączenie zapamiętane w przeglądarce.
const Sound = (() => {
  let ac = null;
  let on = true;
  try { on = localStorage.getItem("logigra.sound") !== "off"; } catch {}
  function tone(freq, dur, { type = "sine", vol = 0.05, at = 0, to } = {}) {
    if (!on) return;
    try {
      ac ||= new (window.AudioContext || window.webkitAudioContext)();
      // uśpiony kontekst (brak gestu użytkownika) nie odtwarza i nie zwalnia węzłów, więc ich nie tworzymy
      if (ac.state !== "running") { ac.resume?.(); return; }
      const t = ac.currentTime + at;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.03);
    } catch {}
  }
  const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568]; // pentatonika, każda cyfra brzmi inaczej
  return {
    get on() { return on; },
    toggle() {
      on = !on;
      try { localStorage.setItem("logigra.sound", on ? "on" : "off"); } catch {}
      return on;
    },
    tap: () => tone(880, 0.05, { type: "triangle", vol: 0.025 }),
    place: (d = 1) => tone(SCALE[(d - 1) % SCALE.length], 0.12, { vol: 0.045 }),
    erase: () => tone(330, 0.08, { vol: 0.03, to: 220 }),
    flag: () => tone(660, 0.08, { type: "triangle", vol: 0.035, to: 990 }),
    line: () => { tone(784, 0.14, { vol: 0.04 }); tone(1175, 0.2, { vol: 0.035, at: 0.07 }); },
    error: () => tone(196, 0.16, { type: "square", vol: 0.018, to: 150 }),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, { vol: 0.045, at: i * 0.08 })),
    lose: () => { tone(160, 0.5, { type: "sawtooth", vol: 0.03, to: 50 }); tone(90, 0.35, { type: "square", vol: 0.02 }); },
  };
})();

// Ponownie uruchamia animację CSS z klasy `cls` (np. drżenie przy błędzie).
function replay(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
  node.addEventListener("animationend", () => node.classList.remove(cls), { once: true });
}

// Błysk przechodzący przez ukończoną linię pól.
function sweep(cells) {
  cells.forEach((c, i) => {
    c.style.setProperty("--si", i);
    replay(c, "sweep");
  });
}

// Liczy wartość w górę, np. punkty na ekranie wyniku.
// `alive`: animację można przerwać, gdy wartość zmieniła się w inny sposób.
function countUp(node, to, show, delay = 0, ms = 700, alive = () => true) {
  if (reducedMotion()) { node.textContent = show(to); return; }
  if (delay === 0) node.textContent = show(0);
  setTimeout(() => {
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      if (!alive()) return;
      node.textContent = show(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, delay);
}

// Wygrana: wybuch kwadratowych kafelków w kolorach gier.
function confetti(area, colors) {
  if (reducedMotion()) return;
  const cv = el("canvas", "confetti");
  area.append(cv);
  const { width: w, height: h } = area.getBoundingClientRect();
  const dpr = devicePixelRatio || 1;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const g = cv.getContext("2d");
  g.scale(dpr, dpr);
  const parts = Array.from({ length: 150 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.7,
    y: h * (0.55 + Math.random() * 0.3),
    vx: (Math.random() - 0.5) * 22,
    vy: -(8 + Math.random() * 13),
    s: 6 + Math.random() * 8,
    a: Math.random() * 6,
    va: (Math.random() - 0.5) * 0.35,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let last = performance.now();
  const t0 = last;
  const frame = (t) => {
    const dt = Math.min(2, (t - last) / 16.7); // niezależne od liczby klatek na sekundę
    last = t;
    const life = (t - t0) / 2400;
    g.clearRect(0, 0, w, h);
    g.globalAlpha = Math.max(0, 1 - life * life);
    for (const p of parts) {
      p.vy += 0.42 * dt;
      p.vx *= Math.pow(0.985, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += p.va * dt;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.a);
      g.fillStyle = p.c;
      g.beginPath();
      g.roundRect(-p.s / 2, -p.s / 2, p.s, p.s, p.s * 0.22);
      g.fill();
      g.restore();
    }
    if (life < 1) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}

// Ramka zaznaczenia, która płynnie przesuwa się między polami.
function selectionRing(board) {
  const ring = el("span", "sel-ring");
  board.append(ring);
  let target = null;
  const place = () => {
    if (!target) return;
    ring.style.width = `${target.offsetWidth}px`;
    ring.style.height = `${target.offsetHeight}px`;
    ring.style.transform = `translate(${target.offsetLeft}px, ${target.offsetTop}px)`;
  };
  new ResizeObserver(place).observe(board);
  return (cell) => {
    if (!target) ring.classList.add("init");
    target = cell;
    place();
    requestAnimationFrame(() => ring.classList.remove("init"));
  };
}

// Przycisk z ikoną; na wąskim ekranie widać samą ikonę, nazwa zostaje dla czytników ekranu.
function iconButton(text, icon, cls, onClick) {
  const b = button("", `${cls} has-icon`, onClick);
  b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`;
  b.append(el("span", "lbl", text));
  b.setAttribute("aria-label", text);
  return b;
}

// Przełącznik kilku opcji (poziom, narzędzie, tryb). Zwraca element i funkcję ustawiającą wybór.
function segmented(label, options, onPick) {
  const seg = el("div", "seg");
  seg.setAttribute("role", "group");
  seg.setAttribute("aria-label", label);
  // wskaźnik wyboru przesuwa się pod przyciskami zamiast skakać
  const thumb = el("span", "seg-thumb");
  seg.append(thumb);
  const btns = options.map((text, k) => {
    const b = button(text, "", () => onPick(k));
    seg.append(b);
    return b;
  });
  let cur = -1;
  const place = () => {
    const b = btns[cur];
    if (!b || !b.offsetWidth) return;
    const first = !thumb.style.width;
    if (first) thumb.style.transition = "none";
    thumb.style.width = `${b.offsetWidth}px`;
    thumb.style.transform = `translateX(${b.offsetLeft}px)`;
    if (first) { void thumb.offsetWidth; thumb.style.transition = ""; }
  };
  new ResizeObserver(place).observe(seg);
  const set = (k) => {
    cur = k;
    btns.forEach((b, j) => b.setAttribute("aria-pressed", String(j === k)));
    place();
  };
  return { el: seg, set };
}

function panelBlock(title, ...children) {
  const box = el("section", "panel-block");
  if (title) box.append(el("h2", "panel-title", title));
  box.append(...children);
  return box;
}

// --- Wspólne elementy gier ---

// Strzałki przesuwają zaznaczenie, cyfry wpisują wartość. `scope`: klawisze działają tylko, gdy ten element ma fokus.
function cellKeys(ctx, { cols, rows, get, set, max = 0, onDigit, keys = {}, scope }) {
  const moves = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
  ctx.on(document, "keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
    if (scope && !scope.contains(document.activeElement)) return;
    if ((e.key === " " || e.key === "Enter") && e.target.closest?.("button, a")) return;
    const i = get();
    if (moves[e.key]) {
      const [dr, dc] = moves[e.key];
      const r = Math.min(rows - 1, Math.max(0, ((i / cols) | 0) + dr));
      const c = Math.min(cols - 1, Math.max(0, (i % cols) + dc));
      set(r * cols + c);
    } else if (max && /^[0-9]$/.test(e.key) && +e.key <= max) onDigit(+e.key);
    else if (max && (e.key === "Backspace" || e.key === "Delete")) onDigit(0);
    else if (keys[e.key.toLowerCase()]) keys[e.key.toLowerCase()]();
    else return;
    e.preventDefault();
  });
}

// Kierunek ze strzałek, WASD albo przesunięcia palcem po `area`. onDir dostaje "up" | "down" | "left" | "right".
function directionInput(ctx, area, onDir) {
  const keys = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
  ctx.on(document, "keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
    const dir = keys[e.key.toLowerCase()];
    if (!dir) return;
    e.preventDefault();
    onDir(dir);
  });
  let from = null;
  ctx.on(area, "pointerdown", (e) => { from = [e.clientX, e.clientY]; });
  ctx.on(document, "pointerup", (e) => {
    if (!from) return;
    const dx = e.clientX - from[0], dy = e.clientY - from[1];
    from = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    onDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  });
}

// Panel cyfr dla sudoku i wież: klawiatura ekranowa z licznikiem, notatki, czyszczenie pola.
function digitControls(ctx, max, { put, remaining }) {
  let notes = false;
  const pad = el("div", "pad");
  pad.style.setProperty("--pad-cols", max > 4 ? 3 : max);
  pad.style.setProperty("--pad-n", max);
  const digits = [];
  for (let d = 1; d <= max; d++) {
    const b = button("", "pad-digit", () => put(d, notes));
    b.append(el("span", "pad-num", d), el("span", "pad-left"));
    b.setAttribute("aria-label", `Wpisz ${d}`);
    pad.append(b);
    digits.push(b);
  }
  const mode = segmented("Tryb wpisywania", ["Cyfry", "Notatki"], (k) => { notes = k === 1; mode.set(k); });
  mode.set(0);
  const erase = button("Wyczyść pole", "btn-ghost wide", () => put(0, false));
  const keys = { n: () => { notes = !notes; mode.set(notes ? 1 : 0); } };
  const update = () => {
    const left = remaining?.();
    if (!left) return; // gra bez limitu cyfr (np. Kakuro)
    digits.forEach((b, k) => {
      b.lastChild.textContent = left[k + 1] > 0 ? left[k + 1] : "";
      b.classList.toggle("spent", left[k + 1] <= 0);
    });
  };
  ctx.panel.append(panelBlock("", mode.el, pad, erase));
  return { update, keys, isNotes: () => notes };
}

// Rysuje pole z cyfrą albo z notatkami; animuje tylko zmiany.
function drawDigit(b, value, mask, max) {
  const key = value ? `v${value}` : `n${mask}`;
  if (b.dataset.key === key) return;
  b.dataset.key = key;
  b.replaceChildren();
  if (value) b.append(el("span", "val", value));
  else if (mask) {
    const m = el("span", "notes");
    m.style.setProperty("--nc", max > 4 ? 3 : 2);
    for (let d = 1; d <= max; d++) m.append(el("i", "", mask & (1 << d) ? d : ""));
    b.append(m);
  }
}

// Blok panelu z dużą wartością, opcjonalnym paskiem i dopiskiem. set(tekst, ułamek paska, dopisek).
function statBlock(ctx, title, { meter = false, small = false } = {}) {
  const v = el("p", small ? "panel-stat" : "panel-big");
  const note = el("p", "panel-note");
  const kids = [v];
  let fill = null;
  if (meter) {
    const m = el("div", "meter");
    fill = el("span");
    m.append(fill);
    kids.push(m);
  }
  kids.push(note);
  const block = panelBlock(title, ...kids);
  ctx.panel.append(block);
  return {
    el: v,
    block,
    set(text, f, sub) {
      if (text != null && v.textContent !== String(text)) v.textContent = text;
      if (fill && f != null) fill.style.width = `${Math.max(0, Math.min(1, f)) * 100}%`;
      if (sub != null) note.textContent = sub;
    },
  };
}

// Siatka pól-przycisków `cols × rows`; `cls` nadaje planszy wygląd, `gap` to odstęp jako ułamek pola.
function gridCells(board, cols, rows, cls, { gap = 0.08, tag = "button", label = (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}` } = {}) {
  board.classList.add("gb", cls);
  board.style.setProperty("--gc", cols);
  board.style.setProperty("--gr", gap);
  board.style.setProperty("--cols", cols + gap * (cols + 1));
  board.style.setProperty("--rows", rows + gap * (rows + 1));
  return Array.from({ length: cols * rows }, (_, i) => {
    const r = (i / cols) | 0, c = i % cols;
    const b = el(tag, "cell gb-cell");
    if (tag === "button") b.type = "button";
    b.dataset.i = i;
    b.style.setProperty("--k", r + c);
    if (label) b.setAttribute("aria-label", label(r, c));
    board.append(b);
    return b;
  });
}

// Płótno gry zręcznościowej we współrzędnych W × H: dopasowanie do ekranu, kolory motywu, pętla klatek.
function canvasGame(board, ctx, W, H, { max = 80, cls = "" } = {}) {
  board.classList.add("cvb");
  if (cls) board.classList.add(cls);
  board.style.setProperty("--cols", 10);
  board.style.setProperty("--rows", (10 * H) / W);
  board.style.setProperty("--max", `${max}px`);
  const cv = el("canvas", "cvb-canvas");
  board.append(cv);
  const g = cv.getContext("2d");
  const fit = () => {
    const dpr = devicePixelRatio || 1;
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
  };
  const ro = new ResizeObserver(fit);
  ro.observe(cv);
  const theme = {};
  const readTheme = () => {
    const cs = getComputedStyle(board);
    for (const k of ["text", "muted", "line", "surface", "bg", "c", "on"]) theme[k] = cs.getPropertyValue(`--${k}`).trim();
  };
  readTheme();
  ctx.on(matchMedia("(prefers-color-scheme: dark)"), "change", readTheme);
  let raf = 0, last = 0;
  ctx.onStop(() => { cancelAnimationFrame(raf); ro.disconnect(); });
  return {
    cv, g, theme, W, H,
    // położenie wskaźnika w jednostkach planszy
    at(e) {
      const r = cv.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
    },
    // frame(dt w sekundach, czas) dostaje czyste płótno w jednostkach planszy
    loop(frame) {
      const tick = (t) => {
        const dt = Math.min(1 / 30, (t - (last || t)) / 1000);
        last = t;
        const k = cv.width / W;
        g.setTransform(k, 0, 0, k, 0, 0);
        g.clearRect(0, 0, W, H);
        frame(dt, t);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
  };
}

// Wciśnięte klawisze (małe litery, np. "arrowleft", " "). Strzałki i spacja nie przewijają strony.
function heldKeys(ctx, onDown) {
  const k = {};
  ctx.on(document, "keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.("input, textarea, select")) return;
    const key = e.key.toLowerCase();
    if ((key === " " || key === "enter") && e.target.closest?.("button, a")) return;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) e.preventDefault();
    if (!k[key] && onDown) onDown(key, e);
    k[key] = true;
  });
  ctx.on(document, "keyup", (e) => { k[e.key.toLowerCase()] = false; });
  ctx.on(window, "blur", () => { for (const key in k) k[key] = false; });
  return k;
}

// Przyciski dotykowe w panelu, trzymane jak klawisze: [[klucz, etykieta, klasa ikony]].
function touchPad(ctx, keys, list, cls = "") {
  const pad = el("div", `tpad ${cls}`);
  for (const [key, label, icon] of list) {
    const b = button("", `tpad-btn ${icon || ""}`);
    b.setAttribute("aria-label", label);
    if (!icon) b.textContent = label;
    const set = (v) => (e) => { e.preventDefault(); keys[key] = v; if (v) keys.onTap?.(key); };
    b.addEventListener("pointerdown", set(true));
    b.addEventListener("pointerup", set(false));
    b.addEventListener("pointerleave", set(false));
    b.addEventListener("pointercancel", set(false));
    pad.append(b);
  }
  ctx.panel.append(panelBlock("", pad));
  return pad;
}

// Liczebnik po polsku: plural(5, "ruch", "ruchy", "ruchów").
const plural = (n, one, few, many) => {
  if (n === 1) return one;
  const d = n % 10, h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many;
};

// Rama gry: nagłówek z poziomem, czasem, cofaniem i nową grą; plansza; panel; ekran wyniku.
function playGame(game, tools, root) {
  const levelSeg = segmented("Poziom trudności", game.levels.map((l) => l.name), (k) => { game.levelIdx = k; start(); });
  const clock = el("span", "clock", "0:00");
  clock.setAttribute("aria-label", "Czas gry");
  const undoBtn = iconButton("Cofnij", ICONS.undo, "btn-ghost t-undo", () => undo());
  undoBtn.title = "Cofnij ruch (Ctrl+Z)";
  const again = iconButton("Nowa gra", ICONS.restart, "btn t-new", () => start());
  const soundBtn = iconButton("Dźwięk", Sound.on ? ICONS.sound : ICONS.mute, "btn-ghost icon-only t-sound", () => {
    const on = Sound.toggle();
    soundBtn.querySelector("svg").innerHTML = on ? ICONS.sound : ICONS.mute;
    soundBtn.setAttribute("aria-pressed", String(on));
    if (on) Sound.tap();
  });
  soundBtn.setAttribute("aria-pressed", String(Sound.on));
  soundBtn.title = "Dźwięk";
  const helpBtn = iconButton("Jak grać", ICONS.help, "btn-ghost icon-only t-help", () => showHelp());
  helpBtn.title = "Jak grać";
  tools.replaceChildren(levelSeg.el, clock, ...(game.big ? [helpBtn] : []), soundBtn, undoBtn, again);

  const area = el("div", "board-area");
  const panel = el("aside", "panel");
  const arena = el("div", `arena${game.big ? " big" : ""}`);
  const progress = el("div", "game-progress");
  const progressFill = el("span");
  progress.append(progressFill);
  arena.append(area, panel);
  root.replaceChildren(progress, arena);

  let cleanups = [], timer = 0, history = [], restore = null;
  const stop = () => {
    clearInterval(timer);
    cleanups.forEach((f) => f());
    cleanups = [];
  };
  const undo = () => {
    if (!history.length || !restore || current?.done) return;
    restore(history.pop());
    undoBtn.disabled = !history.length;
  };
  let current = null;
  // Zasady rozbudowanych gier: okno nad planszą zamiast długiego bloku w panelu.
  const helpKey = `logigra.help.${game.id}`;
  function showHelp(onPlay) {
    area.querySelector(".result.help")?.remove();
    const card = el("div", "result-card help-card");
    const list = el("ol", "help-steps");
    game.rules.forEach((t) => list.append(el("li", "", t)));
    const close = () => { overlay.remove(); try { localStorage.setItem(helpKey, "1"); } catch {} onPlay?.(); };
    const go = button(onPlay ? "Graj" : "Wróć do gry", "btn", close);
    const acts = el("div", "result-actions");
    acts.append(go);
    card.append(el("span", "help-icon", "?"), el("p", "help-kicker", game.name), el("h2", "result-title", "Jak grać"), list, acts);
    const overlay = el("div", "result help");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Jak grać");
    overlay.append(card);
    overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    area.append(overlay);
    setTimeout(() => go.focus({ preventScroll: true }), 50);
  }

  function start() {
    stop();
    const idx = game.levelIdx || 0;
    const level = game.levels[idx];
    levelSeg.set(idx);
    let seconds = 0;
    clock.textContent = fmt(0);
    history = [];
    restore = null;
    undoBtn.disabled = true;
    undoBtn.hidden = true;
    area.className = "board-area intro";
    area.replaceChildren();
    panel.replaceChildren();
    progressFill.style.transform = "scaleX(0)";
    const toast = el("p", "toast");
    toast.setAttribute("aria-live", "polite");
    let toastTimer = 0;
    setTimeout(() => area.classList.remove("intro"), 1200);

    const finish = (won, title, lines, actions, message) => {
      ctx.done = true;
      clearInterval(timer);
      area.classList.add(won ? "won" : "lost");
      const card = el("div", "result-card");
      card.append(el("h2", "result-title", title));
      if (message) card.append(el("p", "result-msg", message));
      const stats = el("dl", "result-stats");
      // [etykieta, tekst, opcjonalnie: liczba do odliczenia, format, klasa]
      lines.forEach(([k, v, n, show, cls]) => {
        const dd = el("dd", cls || "", v);
        stats.append(el("dt", "", k), dd);
        if (n != null) countUp(dd, n, show, won ? 950 : 300);
      });
      const acts = el("div", "result-actions");
      acts.append(...actions, button("Pokaż planszę", "linkish", () => overlay.remove()));
      card.append(stats, acts);
      const overlay = el("div", "result");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-label", title);
      overlay.append(card);
      area.append(overlay);
      setTimeout(() => acts.firstChild.focus({ preventScroll: true }), won ? 900 : 500);
    };

    const ctx = {
      level,
      done: false,
      panel,
      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        cleanups.push(() => target.removeEventListener(type, fn, opts));
      },
      // sprzątanie przy wyjściu z partii (pętle animacji, zegary gry)
      onStop(fn) {
        cleanups.push(fn);
      },
      toast(text) {
        toast.textContent = text;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
      },
      // Gra podaje, jak przywrócić stan; dostaje funkcję zapisującą stan przed ruchem.
      undoable(fn) {
        restore = fn;
        undoBtn.hidden = false;
        return (snapshot) => {
          history.push(snapshot);
          if (history.length > 300) history.shift();
          undoBtn.disabled = false;
        };
      },
      // Postęp partii od 0 do 1, pokazywany cienkim paskiem pod nagłówkiem.
      progress(f) {
        progressFill.style.transform = `scaleX(${Math.max(0, Math.min(1, f))})`;
      },
      // message: opcjonalny tekst pod tytułem ekranu wyniku
      win(message) {
        if (ctx.done) return;
        const prev = Profile.load();
        const before = prev.games[game.id]?.best?.[level.key];
        Profile.award(game.id, level.key, level.points, seconds);
        ctx.progress(1);
        Sound.win();
        confetti(area, [game.color, game.color, game.color, ...GAMES.map((g) => g.color)]);
        // punkty w nawigacji doliczają się po chwili, z podskokiem
        const pill = document.querySelector(".nav-points");
        const anim = ++navAnim;
        countUp(document.getElementById("nav-points"), level.points, (v) => `${prev.points + v} pkt`, 1000, 900, () => anim === navAnim);
        setTimeout(() => replay(pill, "bump"), 1000);
        const record = before == null || seconds < before;
        const next = game.levels[idx + 1];
        finish(true, "Rozwiązane", [
          ["Czas", fmt(seconds), seconds, fmt],
          ["Punkty", `+${level.points}`, level.points, (v) => `+${v}`],
          ["Rekord", record ? "Nowy" : fmt(before), null, null, record ? "record" : ""],
        ], [
          next ? button(`Następny poziom: ${next.name}`, "btn", () => { game.levelIdx = idx + 1; start(); }) : button("Zagraj jeszcze raz", "btn", () => start()),
          ...(next ? [button("Jeszcze raz", "btn-ghost", () => start())] : []),
        ], message);
      },
      lose(title, text) {
        if (ctx.done) return;
        Sound.lose();
        finish(false, title, [["Czas", fmt(seconds)], ["Punkty", "0"]], [button("Spróbuj ponownie", "btn", () => start())], text);
      },
    };
    current = ctx;
    ctx.on(document, "keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    });

    const board = el("div", "board");
    area.append(board, toast);
    const launch = () => {
      if (current !== ctx) return;
      timer = setInterval(() => (clock.textContent = fmt(++seconds)), 1000);
      game.mount(board, ctx);
      if (game.rules && !game.big) panel.append(panelBlock("Zasady", ...game.rules.map((t) => el("p", "", t))));
    };
    let seen = true;
    try { seen = !!localStorage.getItem(helpKey); } catch {}
    // pierwsza partia rozbudowanej gry zaczyna się od zasad; gra rusza po „Graj”
    if (game.big && !seen) showHelp(launch);
    else launch();
  }
  start();
  return stop;
}

// --- Strona główna ---

const SLOTS = [1, 4, 6, 11, 14, 3, 9, 12, 7, 8, 15, 2];
const HEIGHTS = [70, 44, 96, 58, 34, 52, 82, 40, 64, 30, 76, 46];

function buildStage() {
  const iso = document.getElementById("iso");
  for (let i = 0; i < 16; i++) {
    const k = SLOTS.indexOf(i);
    const game = GAMES[k];
    if (!game) {
      iso.append(el("span", "tile"));
      continue;
    }
    const a = el("a", "tile game");
    a.href = `#/gra/${game.id}`;
    a.tabIndex = -1; // te same linki są dostępne na liście gier
    paint(a, game);
    a.style.setProperty("--z", `${HEIGHTS[k]}px`);
    a.style.setProperty("--d", `${120 + k * 90}ms`);
    a.append(glyph(game.glyph));
    iso.append(a);
  }

  const stage = document.getElementById("stage");
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add("up")));

  // Lekkie przechylenie planszy za kursorem.
  const hero = stage.closest(".hero");
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    stage.style.setProperty("--tx", `${((e.clientY - r.top) / r.height - 0.5) * -8}deg`);
    stage.style.setProperty("--tz", `${((e.clientX - r.left) / r.width - 0.5) * 10}deg`);
  });
  hero.addEventListener("pointerleave", () => {
    stage.style.setProperty("--tx", "0deg");
    stage.style.setProperty("--tz", "0deg");
  });
}

// Wybór na liście gier zostaje po powrocie z gry.
const listView = { q: "", cat: "", sort: "" };
const catName = Object.fromEntries(CATEGORIES);
// porównanie bez polskich znaków i wielkości liter: "zaba" znajduje „Żabę”
const fold = (s) => s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");

function buildList() {
  const p = Profile.load();
  const list = document.getElementById("game-list");
  const q = fold(listView.q.trim());
  const inCat = (g) => !listView.cat || (listView.cat === "big" ? g.big : g.cat === listView.cat);
  let shown = GAMES.filter((g) => inCat(g) && (!q || fold(`${g.name} ${g.desc} ${catName[g.cat]}`).includes(q)));
  const pts = (g) => p.games[g.id]?.points || 0;
  if (listView.sort === "az") shown = shown.slice().sort((a, b) => a.name.localeCompare(b.name, "pl"));
  if (listView.sort === "pts") shown = shown.slice().sort((a, b) => pts(b) - pts(a));
  if (listView.sort === "new") shown = shown.slice().sort((a, b) => !!p.games[a.id] - !!p.games[b.id]);
  list.replaceChildren();
  // duży pierwszy kafel tylko w pełnym, domyślnym widoku
  list.classList.toggle("flat", shown.length !== GAMES.length || !!listView.sort);
  shown.forEach((game) => {
    const a = el("a", "card");
    a.href = `#/gra/${game.id}`;
    paint(a, game);
    const body = el("span", "card-body");
    body.append(el("span", "card-cat", game.big ? `${catName[game.cat]} · rozbudowana` : catName[game.cat]), el("span", "card-name", game.name), el("span", "card-desc", game.desc));
    a.append(glyph(game.glyph), body, el("span", "pill", !game.mount ? "Wkrótce" : pts(game) ? `${pts(game)} pkt` : "Graj"));
    const li = el("li");
    li.append(a);
    list.append(li);
  });
  document.getElementById("games-empty").hidden = shown.length > 0;
  const n = GAMES.length;
  document.getElementById("games-count").textContent = shown.length === n
    ? `${n} ${plural(n, "gra", "gry", "gier")}, każda w trzech poziomach trudności`
    : `${shown.length} z ${n}`;
  document.querySelectorAll("#game-cats button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === listView.cat)));
}

function buildFilters() {
  const cats = document.getElementById("game-cats");
  for (const [key, label] of [["", "Wszystkie"], ["big", "Rozbudowane"], ...CATEGORIES]) {
    const b = button("", "cat-chip", () => { listView.cat = key; buildList(); });
    b.dataset.cat = key;
    b.append(label, el("span", "", key ? GAMES.filter((g) => (key === "big" ? g.big : g.cat === key)).length : GAMES.length));
    cats.append(b);
  }
  const search = document.getElementById("game-search");
  const sort = document.getElementById("game-sort");
  search.addEventListener("input", () => { listView.q = search.value; buildList(); });
  sort.addEventListener("change", () => { listView.sort = sort.value; buildList(); });
  document.getElementById("games-reset").onclick = () => {
    Object.assign(listView, { q: "", cat: "" });
    search.value = "";
    buildList();
  };
  // "/" przenosi do wyszukiwarki
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || document.body.dataset.view !== "home" || e.target.closest?.("input, textarea, select")) return;
    e.preventDefault();
    search.focus();
    search.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  });
}

let navAnim = 0;
function updatePoints() {
  navAnim++; // przerywa trwające doliczanie punktów
  document.getElementById("nav-points").textContent = `${Profile.load().points} pkt`;
}

// --- Profil ---

function renderProfile() {
  const p = Profile.load();
  const rank = Profile.rank(p.points);
  const root = document.getElementById("profile");
  root.replaceChildren();

  const head = el("header", "pf-head");
  const name = el("input", "pf-name");
  name.value = p.name;
  name.maxLength = 40;
  name.setAttribute("aria-label", "Nazwa gracza");
  name.addEventListener("change", () => (name.value = Profile.rename(name.value).name));
  const pts = el("p", "pf-points");
  pts.append(el("strong", "", p.points), " pkt");
  head.append(name, el("p", "pf-rank", rank.name), pts);

  if (rank.next) {
    const [min, label] = rank.next;
    const bar = el("div", "pf-bar");
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuemin", rank.from);
    bar.setAttribute("aria-valuemax", min);
    bar.setAttribute("aria-valuenow", p.points);
    bar.setAttribute("aria-label", `Postęp do rangi ${label}`);
    const fill = el("span");
    fill.style.width = `${((p.points - rank.from) / (min - rank.from)) * 100}%`;
    bar.append(fill);
    head.append(bar, el("p", "pf-next", `${min - p.points} pkt do rangi ${label}`));
  }

  const list = el("ul", "pf-games");
  // rozegrane gry na górze, najwięcej punktów najpierw
  GAMES.slice().sort((a, b) => (p.games[b.id]?.points || 0) - (p.games[a.id]?.points || 0)).forEach((game) => {
    const g = p.games[game.id] || { solved: 0, points: 0, best: {} };
    const li = el("li");
    const icon = el("span", "pf-icon");
    paint(icon, game);
    icon.append(glyph(game.glyph));
    const info = el("div", "pf-info");
    info.append(el("a", "pf-game", game.name), el("span", "pf-meta", g.solved ? `Rozwiązane: ${g.solved}` : "Jeszcze nie rozwiązana"));
    info.firstChild.href = `#/gra/${game.id}`;
    const best = el("dl", "pf-best");
    (game.levels || []).forEach((lv) => {
      if (g.best[lv.key] == null) return;
      best.append(el("dt", "", lv.name), el("dd", "", fmt(g.best[lv.key])));
    });
    li.append(icon, info, best, el("span", "pf-pts", `${g.points} pkt`));
    list.append(li);
  });

  const reset = button("Wyzeruj profil", "btn-ghost danger", () => {
    if (!confirm("Usunąć wszystkie punkty i wyniki z tej przeglądarki?")) return;
    Profile.reset();
    updatePoints();
    renderProfile();
  });

  root.append(head, el("h2", "pf-sub", "Wyniki w grach"), list,
    el("p", "pf-note", "Profil jest zapisany tylko w tej przeglądarce."), reset);
}

// --- Nawigacja ---

let teardown = null;

function route() {
  teardown?.();
  teardown = null;
  const hash = location.hash;
  const id = (hash.match(/^#\/gra\/([\w-]+)$/) || [])[1];
  const game = GAMES.find((g) => g.id === id);
  const view = game ? "game" : hash === "#/profil" ? "profile" : "home";
  for (const v of ["home", "game", "profile"]) document.getElementById(v).hidden = v !== view;
  document.body.dataset.view = view;
  updatePoints();
  document.title = game ? `${game.name} | Logigra` : view === "profile" ? "Profil | Logigra" : "Logigra";

  if (view === "home") {
    buildList();
    const target = hash.length > 1 && document.getElementById(hash.slice(1));
    target ? target.scrollIntoView() : window.scrollTo(0, 0);
    return;
  }
  window.scrollTo(0, 0);
  if (view === "profile") return renderProfile();

  paint(document.getElementById("game"), game);
  document.getElementById("game-icon").replaceChildren(glyph(game.glyph));
  document.getElementById("game-title").textContent = game.name;
  const tools = document.getElementById("game-tools");
  const root = document.getElementById("game-root");
  if (game.mount) teardown = playGame(game, tools, root);
  else {
    tools.replaceChildren();
    root.replaceChildren(el("p", "soon", `${game.desc} Gra jest w przygotowaniu, wróć tu wkrótce.`));
  }
}

buildStage();
buildFilters();
updatePoints();
window.addEventListener("hashchange", route);
route();
