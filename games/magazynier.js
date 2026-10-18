// Magazynier (Sokoban): pchaj skrzynie na pola docelowe. Skrzyń nie da się ciągnąć.
// Poziom powstaje od końca: skrzynie stoją na celach, a magazynier je ciągnie (odwrotność pchnięcia), więc rozwiązanie istnieje.
// Plansza w × h: wall[i] = 1 dla ściany. Pola numerowane wierszami.
const Sokoban = (() => {
  const D = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

  // Wnętrze składane z obróconych szablonów 3 × 3 (korytarze, zakręty, wnęki); w − 2 i h − 2 to wielokrotności 3.
  const TEMPLATES = [
    ".........", "#........", "##.##....", "###......", "####..#..", "#.......#", "....#....",
    "#.#...#.#", "###...###", "#.##.##.#", "...##....", "#..#.....", "##...#...", ".#.......",
  ];
  const turn = (t) => [6, 3, 0, 7, 4, 1, 8, 5, 2].map((k) => t[k]).join("");
  function room(w, h, density) {
    for (;;) {
      const wall = new Uint8Array(w * h).fill(1);
      for (let by = 0; by < (h - 2) / 3; by++) for (let bx = 0; bx < (w - 2) / 3; bx++) {
        let t = Math.random() < density ? pick(TEMPLATES.slice(1)) : TEMPLATES[rnd(3)];
        for (let k = rnd(4); k > 0; k--) t = turn(t);
        for (let k = 0; k < 9; k++) wall[(1 + by * 3 + ((k / 3) | 0)) * w + 1 + bx * 3 + (k % 3)] = t[k] === "#" ? 1 : 0;
      }
      // wolne pola muszą być spójne
      const floor = [...wall.keys()].filter((i) => !wall[i]);
      const seen = new Set([floor[0]]), stack = [floor[0]];
      while (stack.length) {
        const i = stack.pop();
        for (const j of [i - 1, i + 1, i - w, i + w]) if (!wall[j] && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
      if (seen.size === floor.length && floor.length > (w - 2) * (h - 2) * 0.55) return wall;
    }
  }

  function generate(w, h, boxes, density) {
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const wall = room(w, h, density);
      const floor = [...wall.keys()].filter((i) => !wall[i]);
      // cele z dala od rogów, w których skrzynia utknęłaby na zawsze
      const open = floor.filter((i) => [i - 1, i + 1, i - w, i + w].filter((j) => !wall[j]).length >= 3);
      if (open.length < boxes + 2) continue;
      const goals = shuffle(open.slice()).slice(0, boxes);
      const box = new Set(goals);
      let player = pick(floor.filter((i) => !box.has(i)));
      let pulls = 0;
      const back = []; // ruchy od końca; odwrócone dają rozwiązanie
      for (let k = 0; k < 600; k++) {
        const dir = pick(Object.keys(D)), [dr, dc] = D[dir];
        const step = dr * w + dc, to = player + step, behind = player - step;
        if (wall[to] || box.has(to)) continue;
        // ciągnięcie: skrzynia za plecami idzie na miejsce magazyniera
        if (box.has(behind) && Math.random() < 0.65) {
          box.delete(behind);
          box.add(player);
          pulls++;
        }
        back.push(dir);
        player = to;
      }
      if ([...box].some((b) => goals.includes(b))) continue;
      // ocena: liczba pchnięć i odległość skrzyń od celów
      const spread = [...box].reduce((s, b) => s + Math.min(...goals.map((g) => Math.abs(((g / w) | 0) - ((b / w) | 0)) + Math.abs((g % w) - (b % w)))), 0);
      const score = spread * 3 + Math.min(pulls, 60);
      const OPP = { up: "down", down: "up", left: "right", right: "left" };
      if (!best || score > best.score) best = { score, w, h, wall, goals, boxes: [...box], player, solution: back.reverse().map((d) => OPP[d]) };
      if (attempt > 10 && best) break;
    }
    return best ? (api.last = best) : generate(w, h, boxes, density * 0.8);
  }

  // Ruch magazyniera; zwraca null, gdy niemożliwy, albo { pushed: indeks skrzyni | -1 }.
  function move(s, dir) {
    const [dr, dc] = D[dir];
    const step = dr * s.w + dc, to = s.player + step;
    if (s.wall[to]) return null;
    const k = s.boxes.indexOf(to);
    if (k >= 0) {
      const beyond = to + step;
      if (s.wall[beyond] || s.boxes.includes(beyond)) return null;
      s.boxes[k] = beyond;
    }
    s.player = to;
    return { pushed: k };
  }

  // droga bez pchania skrzyń (BFS), jako lista kierunków
  function path(s, target) {
    const prev = new Map([[s.player, null]]), queue = [s.player];
    while (queue.length) {
      const i = queue.shift();
      if (i === target) break;
      for (const [dir, [dr, dc]] of Object.entries(D)) {
        const j = i + dr * s.w + dc;
        if (s.wall[j] || s.boxes.includes(j) || prev.has(j)) continue;
        prev.set(j, [i, dir]);
        queue.push(j);
      }
    }
    if (!prev.has(target)) return null;
    const out = [];
    for (let i = target; prev.get(i); i = prev.get(i)[0]) out.unshift(prev.get(i)[1]);
    return out;
  }

  const solved = (s) => s.boxes.every((b) => s.goals.includes(b));
  const api = { D, room, generate, move, path, solved, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Sokoban;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "magazynier"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, w: 8, h: 8, boxes: 2, density: 0.7 },
    { key: "medium", name: "Średni", points: 25, w: 11, h: 8, boxes: 3, density: 0.8 },
    { key: "hard", name: "Trudny", points: 50, w: 11, h: 11, boxes: 4, density: 0.85 },
  ],
  rules: [
    "Wepchnij wszystkie skrzynie na pola oznaczone kółkiem.",
    "Skrzynię można tylko pchać, nigdy ciągnąć, i to pojedynczo. Skrzynia wepchnięta w róg zostaje tam na zawsze, wtedy pomoże cofnięcie.",
    "Sterowanie: strzałki, WASD albo przesunięcie palcem. Kliknięcie wolnego pola prowadzi tam magazyniera najkrótszą drogą.",
  ],
  achievements: [
    { id: "bez-cofania", name: "Bez wycofywania", desc: "Rozwiąż dowolną planszę bez cofania ruchu.", points: 10 },
    { id: "sprint", name: "Sprawny magazynier", desc: "Rozwiąż średni poziom w mniej niż 3 min.", points: 25 },
    { id: "mistrz", name: "Mistrz magazynu", desc: "Rozwiąż trudny poziom w mniej niż 6 min, bez cofania.", points: 50 },
  ],
  mount(board, ctx) {
    const { w, h, wall, goals } = Sokoban.generate(ctx.level.w, ctx.level.h, ctx.level.boxes, ctx.level.density);
    const s = { w, h, wall, goals, boxes: Sokoban.last.boxes.slice(), player: Sokoban.last.player };
    let moves = 0, pushes = 0, facing = "down", walking = 0;
    const cells = gridCells(board, w, h, "sb", { gap: 0, tag: "div", label: null });
    board.style.setProperty("--max", "64px");
    cells.forEach((d, i) => {
      if (wall[i]) {
        d.classList.add("wall");
        const c = i % w;
        // ściany, które nie sąsiadują z podłogą, są niewidoczne
        const near = [-w - 1, -w, -w + 1, -1, 1, w - 1, w, w + 1].some((k) => { const j = i + k; return j >= 0 && j < w * h && Math.abs((j % w) - c) <= 1 && !wall[j]; });
        if (!near) d.classList.add("void");
      }
      if (goals.includes(i)) d.classList.add("goal");
    });
    const layer = el("div", "sb-layer");
    board.append(layer);
    const boxEls = s.boxes.map(() => { const b = el("div", "sb-box"); layer.append(b); return b; });
    const man = el("div", "sb-man");
    layer.append(man);
    const movesEl = statBlock(ctx, "Ruchy", { small: true });
    const pushEl = statBlock(ctx, "Skrzynie na miejscu", { meter: true });
    const save = ctx.undoable(([b, p, m, q]) => { s.boxes = b; s.player = p; moves = m; pushes = q; render(); });

    const step = (dir) => {
      if (ctx.done) return false;
      const snap = [s.boxes.slice(), s.player, moves, pushes];
      const res = Sokoban.move(s, dir);
      facing = dir;
      if (!res) { replay(man, "bump"); return false; }
      save(snap);
      moves++;
      if (res.pushed >= 0) {
        pushes++;
        const onGoal = goals.includes(s.boxes[res.pushed]);
        onGoal ? Sound.line() : Sound.place(2);
        if (onGoal) replay(boxEls[res.pushed], "pop");
      } else Sound.tap();
      render();
      if (Sokoban.solved(s)) {
        if (ctx.undos === 0) ctx.achieve("bez-cofania");
      if (ctx.level.key === "medium" && ctx.time < 180) ctx.achieve("sprint");
      if (ctx.level.key === "hard" && ctx.time < 360 && ctx.undos === 0) ctx.achieve("mistrz");
      ctx.win();
      }
      return true;
    };
    directionInput(ctx, board, (dir) => { clearInterval(walking); step(dir); });
    board.addEventListener("click", (e) => {
      const r = board.getBoundingClientRect();
      const c = Math.floor(((e.clientX - r.left) / r.width) * w), row = Math.floor(((e.clientY - r.top) / r.height) * h);
      const target = row * w + c;
      if (wall[target] || s.boxes.includes(target) || target === s.player) return;
      const route = Sokoban.path(s, target);
      if (!route) return;
      clearInterval(walking);
      walking = setInterval(() => { if (!route.length || !step(route.shift())) clearInterval(walking); }, 70);
    });
    ctx.onStop(() => clearInterval(walking));

    function render() {
      const pos = (node, i) => { node.style.setProperty("--r", (i / w) | 0); node.style.setProperty("--c0", i % w); };
      s.boxes.forEach((b, k) => { pos(boxEls[k], b); boxEls[k].classList.toggle("home", goals.includes(b)); });
      pos(man, s.player);
      man.dataset.dir = facing;
      const home = s.boxes.filter((b) => goals.includes(b)).length;
      movesEl.set(`${moves} ${plural(moves, "krok", "kroki", "kroków")}, ${pushes} ${plural(pushes, "pchnięcie", "pchnięcia", "pchnięć")}`);
      pushEl.set(`${home} / ${goals.length}`, home / goals.length);
      ctx.progress(home / goals.length);
    }
    render();
  },
});
