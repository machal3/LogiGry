// Wąż: zjadaj owoce i rośnij do długości docelowej. Ściana, przeszkoda albo własny ogon kończą grę.
// Pola numerowane wierszami (i = r * w + c); body[0] to głowa.
const Snake = (() => {
  const DIRS = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
  const rnd = (n) => Math.floor(Math.random() * n);

  // Przeszkody to krótkie belki z dala od brzegów i od rzędu startowego.
  function create(w, h, target, bars = 0) {
    const r0 = (h / 2) | 0;
    const body = [r0 * w + 4, r0 * w + 3, r0 * w + 2];
    const walls = new Set();
    for (let t = 0; walls.size < bars * 3 && t < 500; t++) {
      const vertical = Math.random() < 0.5;
      const r = 2 + rnd(h - 4 - (vertical ? 2 : 0)), c = 2 + rnd(w - 4 - (vertical ? 0 : 2));
      const cells = [0, 1, 2].map((k) => (vertical ? (r + k) * w + c : r * w + c + k));
      // belka nie dotyka rzędu startowego ani innej belki
      const near = (i) => [-w - 1, -w, -w + 1, -1, 0, 1, w - 1, w, w + 1].some((d) => walls.has(i + d));
      if (cells.some((i) => Math.abs(((i / w) | 0) - r0) < 2 || near(i))) continue;
      cells.forEach((i) => walls.add(i));
    }
    const state = { w, h, target, body, walls, dir: "right", queue: [], food: -1, grow: 0 };
    placeFood(state);
    return (api.last = state);
  }

  function placeFood(s) {
    const taken = new Set([...s.body, ...s.walls]);
    const free = [...Array(s.w * s.h).keys()].filter((i) => !taken.has(i));
    s.food = free.length ? free[rnd(free.length)] : -1;
  }

  // Kolejka do dwóch skrętów, żeby szybkie „góra, lewo” nie przepadło; zawracanie w miejscu jest ignorowane.
  function turn(s, dir) {
    const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
    if (dir === last || dir === OPPOSITE[last] || s.queue.length >= 2) return false;
    s.queue.push(dir);
    return true;
  }

  // Jeden krok. Zwraca "move", "eat" albo przyczynę porażki: "wall", "self", "block".
  function step(s) {
    if (s.queue.length) s.dir = s.queue.shift();
    const [dr, dc] = DIRS[s.dir];
    const head = s.body[0], r = ((head / s.w) | 0) + dr, c = (head % s.w) + dc;
    if (r < 0 || r >= s.h || c < 0 || c >= s.w) return "wall";
    const next = r * s.w + c;
    if (s.walls.has(next)) return "block";
    const eat = next === s.food;
    // ogon zwalnia pole w tym samym kroku, więc można wejść tuż za nim
    const tailMoves = !eat && !s.grow;
    if (s.body.includes(next) && !(tailMoves && next === s.body[s.body.length - 1])) return "self";
    s.body.unshift(next);
    if (eat) placeFood(s);
    else if (s.grow) s.grow--;
    else s.body.pop();
    return eat ? "eat" : "move";
  }

  const api = { DIRS, create, turn, step, placeFood, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Snake;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "waz"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, size: 12, target: 15, speed: 170, bars: 0 },
    { key: "medium", name: "Średni", points: 25, size: 15, target: 25, speed: 130, bars: 0 },
    { key: "hard", name: "Trudny", points: 50, size: 17, target: 35, speed: 105, bars: 5 },
  ],
  rules: [
    "Prowadź węża do owoców. Każdy owoc wydłuża go o jedno pole i odrobinę przyspiesza.",
    "Ściana, przeszkoda albo własny ogon kończą partię. Wygrywasz, gdy wąż osiągnie docelową długość.",
    "Sterowanie: strzałki albo WASD, na telefonie przesunięcie palcem. Spacja wstrzymuje grę.",
  ],
  mount(board, ctx) {
    const { size, target, speed, bars } = ctx.level;
    const s = Snake.create(size, size, target, bars);
    let timer = 0, running = false, paused = false, eaten = 0;

    board.classList.add("sn");
    board.style.setProperty("--cols", size);
    board.style.setProperty("--rows", size);
    const cells = Array.from({ length: size * size }, (_, i) => {
      const d = el("div", "sn-cell");
      d.style.setProperty("--k", ((i / size) | 0) + (i % size));
      if (s.walls.has(i)) d.classList.add("wall");
      if ((((i / size) | 0) + (i % size)) % 2) d.classList.add("alt");
      board.append(d);
      return d;
    });

    const len = el("p", "panel-big");
    const meter = el("div", "meter");
    const fill = el("span");
    meter.append(fill);
    const pad = el("div", "dpad");
    for (const [dir, label] of [["up", "Góra"], ["left", "Lewo"], ["right", "Prawo"], ["down", "Dół"]]) {
      const b = button("", `dpad-${dir}`, () => input(dir));
      b.setAttribute("aria-label", label);
      pad.append(b);
    }
    ctx.panel.append(panelBlock("Długość", len, meter), panelBlock("", pad));
    ctx.toast("Strzałka albo przesunięcie palcem rusza węża");

    const tick = () => {
      const res = Snake.step(s);
      if (res === "eat") {
        eaten++;
        Sound.place(1 + (eaten % 9));
        replay(cells[s.body[0]], "gulp");
      }
      if (res !== "move" && res !== "eat") {
        running = false;
        cells[s.body[0]].classList.add("crash");
        render();
        const why = { wall: "Wąż uderzył w ścianę.", self: "Wąż ugryzł własny ogon.", block: "Wąż wpadł na przeszkodę." }[res];
        return ctx.lose("Zderzenie", why);
      }
      render();
      if (s.body.length >= s.target) { running = false; return ctx.win(); }
      // każdy owoc przyspiesza o 1,5%, najwyżej do 55% początkowego czasu kroku
      timer = setTimeout(tick, Math.max(speed * 0.55, speed * Math.pow(0.985, eaten)));
    };
    const pause = (on) => {
      if (!running || paused === on) return;
      paused = on;
      clearTimeout(timer);
      board.classList.toggle("paused", on);
      if (on) ctx.toast("Pauza. Spacja albo kierunek wznawia grę");
      else timer = setTimeout(tick, speed);
    };
    function input(dir) {
      if (ctx.done) return;
      if (paused) pause(false);
      if (!running) {
        if (dir === "left") return; // start w prawo; zawrócenie na starcie byłoby zderzeniem
        running = true;
        Snake.turn(s, dir);
        timer = setTimeout(tick, 0);
        return;
      }
      if (Snake.turn(s, dir)) Sound.tap();
    }

    directionInput(ctx, board, input);
    ctx.on(document, "keydown", (e) => {
      if (e.key === " " && !e.target.closest?.("button, a, input")) { e.preventDefault(); pause(!paused); }
    });
    ctx.on(document, "visibilitychange", () => document.hidden && pause(true));
    ctx.onStop(() => clearTimeout(timer));

    function render() {
      const pos = new Map(s.body.map((i, k) => [i, k]));
      cells.forEach((d, i) => {
        const k = pos.get(i);
        d.classList.toggle("body", k != null);
        d.classList.toggle("head", k === 0);
        d.classList.toggle("food", i === s.food);
        if (k != null) d.style.setProperty("--t", k / Math.max(1, s.body.length - 1));
      });
      cells[s.body[0]].dataset.dir = s.dir;
      len.textContent = `${s.body.length} / ${s.target}`;
      fill.style.width = `${(s.body.length / s.target) * 100}%`;
      ctx.progress((s.body.length - 3) / (s.target - 3));
    }
    render();
  },
});
