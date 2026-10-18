// Labirynt: dojdź z lewego górnego rogu do wyjścia w prawym dolnym. Na wyższych poziomach wyjście otwierają klucze.
// open[i]: bity otwartych przejść (1 góra, 2 prawo, 4 dół, 8 lewo) dla pola i = r * n + c.
const Maze = (() => {
  const DIRS = { up: [1, -1, 0], right: [2, 0, 1], down: [4, 1, 0], left: [8, 0, -1] };
  const OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };

  function carve(n, loops) {
    const open = new Uint8Array(n * n), seen = new Uint8Array(n * n), stack = [0];
    seen[0] = 1;
    while (stack.length) {
      const i = stack[stack.length - 1], r = (i / n) | 0, c = i % n;
      const opts = Object.values(DIRS).filter(([, dr, dc]) => r + dr >= 0 && r + dr < n && c + dc >= 0 && c + dc < n && !seen[(r + dr) * n + c + dc]);
      if (!opts.length) { stack.pop(); continue; }
      const [b, dr, dc] = pick(opts), j = (r + dr) * n + c + dc;
      open[i] |= b;
      open[j] |= OPP[b];
      seen[j] = 1;
      stack.push(j);
    }
    // kilka dodatkowych przejść, żeby istniało więcej niż jedna droga
    for (let k = 0; k < n * n * loops; k++) {
      const i = rnd(n * n), r = (i / n) | 0, c = i % n;
      const [b, dr, dc] = pick(Object.values(DIRS));
      if (r + dr < 0 || r + dr >= n || c + dc < 0 || c + dc >= n) continue;
      open[i] |= b;
      open[(r + dr) * n + c + dc] |= OPP[b];
    }
    return open;
  }

  // najkrótsza droga (lista kierunków) i odległości z pola `from`
  function route(open, n, from, to) {
    const prev = new Map([[from, null]]), queue = [from];
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      if (i === to) break;
      for (const [dir, [b, dr, dc]] of Object.entries(DIRS)) {
        if (!(open[i] & b)) continue;
        const j = i + dr * n + dc;
        if (!prev.has(j)) { prev.set(j, [i, dir]); queue.push(j); }
      }
    }
    if (!prev.has(to)) return null;
    const out = [];
    for (let i = to; prev.get(i); i = prev.get(i)[0]) out.unshift(prev.get(i)[1]);
    return out;
  }

  function generate(n, keys, loops) {
    const open = carve(n, loops);
    // klucze w miejscach daleko od startu
    const d = new Int32Array(n * n).fill(-1), queue = [0];
    d[0] = 0;
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const [b, dr, dc] of Object.values(DIRS)) {
        const j = i + dr * n + dc;
        if (open[i] & b && d[j] < 0) { d[j] = d[i] + 1; queue.push(j); }
      }
    }
    const spots = shuffle([...Array(n * n).keys()].filter((i) => i && i !== n * n - 1)).sort((a, b) => d[b] - d[a]);
    const keyCells = [];
    for (const i of spots) {
      if (keyCells.length >= keys) break;
      if (keyCells.every((k) => Math.abs(((k / n) | 0) - ((i / n) | 0)) + Math.abs((k % n) - (i % n)) > n / 2)) keyCells.push(i);
    }
    return (api.last = { n, open, keys: keyCells });
  }

  const api = { DIRS, carve, route, generate, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Maze;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "labirynt"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, n: 11, keys: 0, loops: 0.03, fog: 0 },
    { key: "medium", name: "Średni", points: 25, n: 15, keys: 3, loops: 0.05, fog: 0 },
    { key: "hard", name: "Trudny", points: 50, n: 21, keys: 3, loops: 0.06, fog: 3.2 },
  ],
  rules: [
    "Doprowadź kulkę z lewego górnego rogu do wyjścia w prawym dolnym.",
    "Na średnim i trudnym wyjście jest zamknięte, dopóki nie zbierzesz wszystkich kluczy. Na trudnym widzisz tylko najbliższą okolicę.",
    "Strzałki albo WASD idą o pole, przesunięcie palcem jedzie do najbliższego rozwidlenia, a kliknięcie w pole prowadzi tam najkrótszą drogą.",
  ],
  achievements: [
    { id: "sprinter", name: "Sprinter", desc: "Przejdź łatwy labirynt w mniej niż 30 sekund.", points: 10 },
    { id: "poszukiwacz", name: "Poszukiwacz kluczy", desc: "Przejdź średni labirynt z kluczami w mniej niż 90 sekund.", points: 25 },
    { id: "we-mgle", name: "We mgle", desc: "Przejdź trudny labirynt we mgle w mniej niż 3 minuty.", points: 50 },
  ],
  mount(board, ctx) {
    const { n, fog } = ctx.level;
    const { open, keys } = Maze.generate(n, ctx.level.keys, ctx.level.loops);
    const S = 10, W = n * S;
    const cv = canvasGame(board, ctx, W, W, { max: 80 });
    const { g, theme } = cv;
    const got = new Set(), seen = new Uint8Array(n * n), exit = n * n - 1;
    let at = 0, px = 0, py = 0, steps = 0, queue = [], next = 0;
    seen[0] = 1;
    const keysEl = statBlock(ctx, keys.length ? "Klucze" : "Kroki", { small: !keys.length });
    const pad = el("div", "dpad");
    for (const [dir, label] of [["up", "Góra"], ["left", "Lewo"], ["right", "Prawo"], ["down", "Dół"]]) {
      const b = button("", `dpad-${dir}`, () => { queue = []; go(dir); });
      b.setAttribute("aria-label", label);
      pad.append(b);
    }
    ctx.panel.append(panelBlock("", pad));

    const can = (i, dir) => !!(open[i] & Maze.DIRS[dir][0]);
    function go(dir) {
      if (ctx.done || !can(at, dir)) return false;
      const [, dr, dc] = Maze.DIRS[dir];
      at += dr * n + dc;
      steps++;
      seen[at] = 1;
      if (keys.includes(at) && !got.has(at)) {
        got.add(at);
        Sound.line();
        if (got.size === keys.length) ctx.toast("Wyjście otwarte!");
      } else Sound.tap();
      render();
      if (at === exit) {
        if (got.size === keys.length) {
          if (ctx.level.key === "easy" && ctx.time < 30) ctx.achieve("sprinter");
          if (ctx.level.key === "medium" && ctx.time < 90) ctx.achieve("poszukiwacz");
          if (ctx.level.key === "hard" && ctx.time < 180) ctx.achieve("we-mgle");
          ctx.win();
        }
        else { ctx.toast(`Wyjście zamknięte. Brakuje ${keys.length - got.size} ${plural(keys.length - got.size, "klucza", "kluczy", "kluczy")}`); Sound.error(); }
      }
      return true;
    }
    // jazda do rozwidlenia: idziemy, dopóki pole ma tylko wejście i jedno wyjście
    const glide = (dir) => {
      const path = [];
      let i = at, d = dir;
      for (let guard = 0; guard < n * n && can(i, d); guard++) {
        path.push(d);
        const [, dr, dc] = Maze.DIRS[d];
        i += dr * n + dc;
        const back = { up: "down", down: "up", left: "right", right: "left" }[d];
        const outs = Object.keys(Maze.DIRS).filter((x) => x !== back && can(i, x));
        if (outs.length !== 1 || i === exit || keys.includes(i)) break;
        d = outs[0];
      }
      return path;
    };
    // klawiatura: krok od razu, przytrzymanie powtarza
    const held = heldKeys(ctx, (key) => {
      const dir = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" }[key];
      if (dir) { queue = []; go(dir); next = performance.now() + 220; }
    });
    let swipe = null;
    ctx.on(cv.cv, "pointerdown", (e) => { swipe = [e.clientX, e.clientY, e]; });
    ctx.on(document, "pointerup", (e) => {
      if (!swipe) return;
      const dx = e.clientX - swipe[0], dy = e.clientY - swipe[1];
      const start = swipe[2];
      swipe = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) >= 24) {
        queue = glide(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
        return;
      }
      const [x, y] = cv.at(start);
      const target = Math.min(n - 1, Math.max(0, (y / S) | 0)) * n + Math.min(n - 1, Math.max(0, (x / S) | 0));
      // we mgle można wskazać tylko pole już odkryte
      if (fog && !seen[target]) return;
      queue = Maze.route(open, n, at, target) || [];
    });

    let walkT = 0;
    cv.loop((dt, t) => {
      walkT += dt;
      if (queue.length && walkT > 0.06) { walkT = 0; if (!go(queue.shift())) queue = []; }
      const dir = held.arrowup || held.w ? "up" : held.arrowdown || held.s ? "down" : held.arrowleft || held.a ? "left" : held.arrowright || held.d ? "right" : null;
      if (dir && !queue.length && t > next) { go(dir); next = t + 95; }
      const tx = (at % n) * S + S / 2, ty = ((at / n) | 0) * S + S / 2;
      const k = 1 - Math.pow(0.0001, dt * 2.2);
      px = px ? px + (tx - px) * k : tx;
      py = py ? py + (ty - py) * k : ty;
      draw(t);
    });

    function draw(t) {
      // odwiedzone pola
      g.fillStyle = theme.c;
      g.globalAlpha = 0.13;
      for (let i = 0; i < n * n; i++) if (seen[i]) g.fillRect((i % n) * S, ((i / n) | 0) * S, S, S);
      g.globalAlpha = 1;
      // wyjście
      const ex = (exit % n) * S, ey = ((exit / n) | 0) * S, unlocked = got.size === keys.length;
      g.fillStyle = unlocked ? theme.c : theme.muted;
      g.globalAlpha = unlocked ? 0.35 + 0.15 * Math.sin(t / 250) : 0.3;
      g.beginPath();
      g.roundRect(ex + 1.5, ey + 1.5, S - 3, S - 3, 2);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = unlocked ? theme.c : theme.muted;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(ex + 3.5, ey + 7.5); g.lineTo(ex + 3.5, ey + 2.5); g.lineTo(ex + 7, ey + 4); g.lineTo(ex + 3.5, ey + 5.5);
      g.stroke();
      // klucze
      for (const k of keys) {
        if (got.has(k)) continue;
        const x = (k % n) * S + S / 2, y = ((k / n) | 0) * S + S / 2 + Math.sin(t / 300 + k) * 0.6;
        g.save();
        g.translate(x, y);
        g.rotate(Math.PI / 4);
        g.fillStyle = "#fab005";
        g.fillRect(-2.2, -2.2, 4.4, 4.4);
        g.fillStyle = "rgba(255,255,255,0.6)";
        g.fillRect(-2.2, -2.2, 1.6, 1.6);
        g.restore();
      }
      // ściany
      g.strokeStyle = theme.text;
      g.lineWidth = 1.1;
      g.lineCap = "round";
      g.beginPath();
      for (let i = 0; i < n * n; i++) {
        const x = (i % n) * S, y = ((i / n) | 0) * S;
        if (!(open[i] & 1)) { g.moveTo(x, y); g.lineTo(x + S, y); }
        if (!(open[i] & 8)) { g.moveTo(x, y); g.lineTo(x, y + S); }
        if (i % n === n - 1 && !(open[i] & 2)) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
        if (i >= n * (n - 1) && !(open[i] & 4)) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
      }
      g.stroke();
      // kulka
      g.fillStyle = theme.c;
      g.beginPath();
      g.arc(px, py, S * 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.45)";
      g.beginPath();
      g.arc(px - 1, py - 1, S * 0.1, 0, Math.PI * 2);
      g.fill();
      // mgła: ciemno wszędzie poza kręgiem wokół kulki
      if (fog) {
        const r = fog * S;
        const grd = g.createRadialGradient(px, py, r * 0.55, px, py, r);
        grd.addColorStop(0, "rgba(0,0,0,0)");
        grd.addColorStop(1, theme.bg);
        g.fillStyle = grd;
        g.beginPath();
        g.rect(0, 0, W, W);
        g.arc(px, py, r * 0.55, 0, Math.PI * 2, true);
        g.fill("evenodd");
        g.fillStyle = theme.bg;
        g.beginPath();
        g.rect(0, 0, W, W);
        g.arc(px, py, r, 0, Math.PI * 2, true);
        g.fill("evenodd");
        // zapamiętane: ściany odwiedzonych pól widać słabo
        g.globalAlpha = 0.28;
        g.beginPath();
        for (let i = 0; i < n * n; i++) {
          if (!seen[i]) continue;
          const x = (i % n) * S, y = ((i / n) | 0) * S;
          if (!(open[i] & 1)) { g.moveTo(x, y); g.lineTo(x + S, y); }
          if (!(open[i] & 4)) { g.moveTo(x, y + S); g.lineTo(x + S, y + S); }
          if (!(open[i] & 8)) { g.moveTo(x, y); g.lineTo(x, y + S); }
          if (!(open[i] & 2)) { g.moveTo(x + S, y); g.lineTo(x + S, y + S); }
        }
        g.stroke();
        g.globalAlpha = 1;
      }
    }

    function render() {
      if (keys.length) keysEl.set(`${got.size} / ${keys.length}`, null, `Kroki: ${steps}`);
      else keysEl.set(steps);
      const left = Maze.route(open, n, at, exit).length, total = Maze.route(open, n, 0, exit).length;
      ctx.progress(keys.length ? (got.size / keys.length) * 0.6 + (got.size === keys.length ? 0.4 * (1 - left / total) : 0) : 1 - left / total);
    }
    render();
  },
});
