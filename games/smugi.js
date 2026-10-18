// Smugi (Tron): motocykle zostawiają świetlny ślad. Kto wjedzie w ścianę albo w ślad, odpada. Ostatni na torze wygrywa rundę.
// Komputer wybiera skręt z największą dostępną przestrzenią (wypełnianie od pola przed motocyklem).
const LightCycles = (() => {
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const BACK = { up: "down", down: "up", left: "right", right: "left" };
  // ile pól jest osiągalnych z (x, y), najwyżej `cap`
  function space(grid, w, h, x, y, cap) {
    if (x < 0 || y < 0 || x >= w || y >= h || grid[y * w + x]) return 0;
    const seen = new Uint8Array(w * h), stack = [y * w + x];
    seen[y * w + x] = 1;
    let n = 0;
    while (stack.length && n < cap) {
      const i = stack.pop();
      n++;
      const cx = i % w, cy = (i / w) | 0;
      for (const [dx, dy] of Object.values(DIRS)) {
        const nx = cx + dx, ny = cy + dy, j = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && !grid[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    return n;
  }
  function think(grid, w, h, bike, others, skill) {
    const opts = Object.keys(DIRS).filter((d) => d !== BACK[bike.dir]);
    if (Math.random() > skill) {
      // słabszy rywal czasem jedzie dalej prosto, o ile może
      const [dx, dy] = DIRS[bike.dir];
      if (space(grid, w, h, bike.x + dx, bike.y + dy, 1)) return bike.dir;
    }
    let best = bike.dir, score = -1;
    for (const d of opts) {
      const [dx, dy] = DIRS[d];
      const nx = bike.x + dx, ny = bike.y + dy;
      let v = space(grid, w, h, nx, ny, 400);
      // unika pól, na które za chwilę może wjechać ktoś inny
      if (others.some((o) => Math.abs(o.x - nx) + Math.abs(o.y - ny) === 1)) v *= 0.6;
      if (d === bike.dir) v += 0.5;
      if (v > score) { score = v; best = d; }
    }
    return best;
  }
  const api = { DIRS, BACK, space, think, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = LightCycles;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "smugi"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, rivals: 1, speed: 11, skill: 0.55, wins: 2 },
    { key: "medium", name: "Średni", points: 25, rivals: 2, speed: 13, skill: 0.8, wins: 2 },
    { key: "hard", name: "Trudny", points: 50, rivals: 3, speed: 15, skill: 0.95, wins: 3 },
  ],
  rules: [
    "Sterujesz motocyklem w kolorze gry: strzałki, WASD albo przesunięcie palcem. Zawrócić w miejscu się nie da.",
    "Wjechanie w ścianę albo w dowolny ślad, także własny, kończy rundę dla tego motocykla. Ostatni na torze wygrywa.",
    "Rundę wygrywasz, gdy zostaniesz sam na torze. Wygraj wymaganą liczbę rund, zanim zrobi to komputer. Odcinaj rywalom drogę i zostawiaj sobie miejsce.",
  ],
  mount(board, ctx) {
    const { DIRS, BACK, think } = LightCycles;
    const { rivals, speed, skill, wins } = ctx.level;
    const GW = 60, GH = 44, S = 2;
    const cv = canvasGame(board, ctx, GW * S, GH * S, { max: 90 });
    const { g, theme } = cv;
    const COLORS = [null, "#ff922b", "#e64980", "#fab005"];
    const s = { grid: null, bikes: [], score: [0, 0], round: 0, pause: 1.6, want: null }; // [ty, komputer]
    LightCycles.last = s;
    const scoreEl = el("div", "tr-score");
    ctx.panel.append(panelBlock("Rundy", scoreEl));
    function newRound() {
      s.round++;
      s.grid = new Uint8Array(GW * GH);
      const starts = [[10, 22, "right"], [49, 22, "left"], [30, 6, "down"], [30, 37, "up"]];
      s.bikes = starts.slice(0, rivals + 1).map(([x, y, dir], k) => ({ x, y, dir, alive: true, k, trail: [[x, y]] }));
      s.bikes.forEach((b) => (s.grid[b.y * GW + b.x] = b.k + 1));
      s.want = null;
      s.pause = 1.4;
      render();
    }
    directionInput(ctx, board, (d) => { if (s.bikes[0]?.alive) s.want = d; });
    let acc = 0;
    cv.loop((dt) => {
      if (!ctx.done) {
        if (s.pause > 0) s.pause -= dt;
        else {
          acc += dt * speed;
          while (acc >= 1) { acc -= 1; step(); if (s.pause > 0 || ctx.done) break; }
        }
      }
      draw();
    });
    function step() {
      const me = s.bikes[0];
      if (s.want && s.want !== BACK[me.dir]) me.dir = s.want;
      for (const b of s.bikes.slice(1)) if (b.alive) b.dir = think(s.grid, GW, GH, b, s.bikes.filter((o) => o !== b && o.alive), skill);
      // wszyscy ruszają naraz; zderzenie czołowe eliminuje oba motocykle
      const next = s.bikes.map((b) => (b.alive ? [b.x + DIRS[b.dir][0], b.y + DIRS[b.dir][1]] : null));
      s.bikes.forEach((b, k) => {
        if (!b.alive) return;
        const [x, y] = next[k];
        const clash = next.some((p, j) => j !== k && p && p[0] === x && p[1] === y);
        if (x < 0 || y < 0 || x >= GW || y >= GH || s.grid[y * GW + x] || clash) { b.alive = false; b.boom = 1; if (k === 0) Sound.lose(); else Sound.place(9); }
      });
      s.bikes.forEach((b, k) => {
        if (!b.alive) return;
        [b.x, b.y] = next[k];
        s.grid[b.y * GW + b.x] = b.k + 1;
        b.trail.push([b.x, b.y]);
      });
      const alive = s.bikes.filter((b) => b.alive);
      // runda kończy się, gdy odpadniesz albo zostaniesz sam; jednoczesny koniec wszystkich to remis
      if (alive.length <= 1 || !s.bikes[0].alive) {
        const winner = s.bikes[0].alive ? 0 : alive.length ? 1 : -1;
        if (winner >= 0) s.score[winner]++;
        render();
        if (s.score[0] >= wins) return ctx.win(`Wynik meczu: ${s.score.join(" : ")}.`);
        if (s.score[1] >= wins) return ctx.lose("Mecz przegrany", `Wynik: ${s.score.join(" : ")}.`);
        ctx.toast(winner === 0 ? "Runda dla ciebie!" : winner > 0 ? "Runda dla komputera" : "Remis, nikt nie przetrwał");
        winner === 0 ? Sound.line() : Sound.erase();
        s.pause = 1.2;
        setTimeout(() => !ctx.done && newRound(), 1100);
      }
    }
    function draw() {
      g.strokeStyle = theme.line;
      g.lineWidth = 0.2;
      for (let x = 0; x <= GW; x += 4) { g.beginPath(); g.moveTo(x * S, 0); g.lineTo(x * S, GH * S); g.stroke(); }
      for (let y = 0; y <= GH; y += 4) { g.beginPath(); g.moveTo(0, y * S); g.lineTo(GW * S, y * S); g.stroke(); }
      for (const b of s.bikes) {
        const col = b.k ? COLORS[b.k] : theme.c;
        g.strokeStyle = col;
        g.globalAlpha = b.alive ? 1 : 0.35;
        g.lineWidth = S * 0.7;
        g.lineCap = "round";
        g.lineJoin = "round";
        g.shadowColor = col;
        g.shadowBlur = 3;
        g.beginPath();
        b.trail.forEach(([x, y], i) => (i ? g.lineTo(x * S + S / 2, y * S + S / 2) : g.moveTo(x * S + S / 2, y * S + S / 2)));
        g.stroke();
        g.shadowBlur = 0;
        g.globalAlpha = 1;
        if (b.alive) {
          g.fillStyle = col;
          g.beginPath(); g.arc(b.x * S + S / 2, b.y * S + S / 2, S * 0.95, 0, Math.PI * 2); g.fill();
          g.fillStyle = "#fff";
          g.beginPath(); g.arc(b.x * S + S / 2, b.y * S + S / 2, S * 0.45, 0, Math.PI * 2); g.fill();
        } else if (b.boom > 0) {
          b.boom -= 0.03;
          g.strokeStyle = col;
          g.globalAlpha = b.boom;
          g.lineWidth = 0.6;
          g.beginPath(); g.arc(b.x * S + S / 2, b.y * S + S / 2, (1 - b.boom) * 10, 0, Math.PI * 2); g.stroke();
          g.globalAlpha = 1;
        }
      }
      if (s.pause > 0 && !ctx.done) {
        g.fillStyle = theme.text;
        g.font = "700 8px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(`Runda ${s.round}`, GW, GH - 4);
      }
    }
    function render() {
      scoreEl.replaceChildren(...s.score.map((v, k) => {
        const d = el("span", "tr-player");
        d.style.setProperty("--pc", k ? COLORS[1] : "var(--c)");
        d.append(el("i"), el("b", "", k ? (rivals > 1 ? `Komputer (${rivals} motocykle)` : "Komputer") : "Ty"), el("em", "", `${v} / ${wins}`));
        return d;
      }));
      ctx.progress(s.score[0] / wins);
    }
    newRound();
  },
});
