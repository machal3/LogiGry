// Żaba (Frogger): przeskocz przez jezdnię pełną aut i rzekę po pniach, do wolnego liścia na górze.
// Plansza 13 × 13 pól: wiersz 0 liście, 1–5 rzeka, 6 pobocze, 7–11 jezdnia, 12 start.
const Frogger = { last: null };

if (typeof module !== "undefined") module.exports = Frogger;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "zaba"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, homes: 3, pace: 0.8 },
    { key: "medium", name: "Średni", points: 25, homes: 4, pace: 1 },
    { key: "hard", name: "Trudny", points: 50, homes: 5, pace: 1.25 },
  ],
  rules: [
    "Strzałki, WASD albo przesunięcie palcem: żaba skacze o jedno pole.",
    "Na jezdni unikaj aut. Rzeki nie da się przepłynąć: skacz po pniach i żółwiach, które cię niosą. Wypadnięcie za brzeg kończy skok.",
    "Doprowadź żaby do wymaganej liczby wolnych liści na górze. Na każdą żabę masz 30 sekund i trzy życia na całą grę.",
  ],
  achievements: [
    { id: "ostatnia-zaba", name: "Ostatnia żaba", desc: "Wygraj, mając już tylko jedno życie.", points: 10 },
    { id: "suche-lapki", name: "Suche łapki", desc: "Wygraj średni poziom bez utraty życia.", points: 25 },
    { id: "krolowa-stawu", name: "Królowa stawu", desc: "Wygraj trudny poziom bez utraty życia.", points: 50 },
  ],
  mount(board, ctx) {
    const { homes, pace } = ctx.level;
    const N = 13, S = 10, W = N * S;
    const cv = canvasGame(board, ctx, W, W, { max: 80 });
    const { g, theme } = cv;
    // pasy: [wiersz, prędkość w polach/s, długość obiektu, odstęp, rodzaj]
    const LANES = [
      [1, 1.2, 3, 3, "log"], [2, -1.6, 2, 3, "turtle"], [3, 0.9, 5, 4, "log"], [4, -1.4, 3, 3, "turtle"], [5, 1.8, 3, 4, "log"],
      [7, -1.5, 1, 4, "car"], [8, 1.1, 2, 4, "truck"], [9, -2.2, 1, 5, "car"], [10, 1.6, 1, 3, "car"], [11, -1, 2, 5, "truck"],
    ];
    const CARS = ["#e03131", "#1c7ed6", "#f76707", "#ae3ec9", "#0ca678"];
    const lanes = LANES.map(([row, v, len, gap, kind], k) => ({ row, v: v * pace, len, gap, kind, off: Math.random() * (len + gap), color: CARS[k % CARS.length] }));
    const slots = [1, 4, 6, 8, 11].slice(0, 5);
    const s = { y: 12, fx: 6, homes: new Set(), lives: 3, time: 30, hop: 0, dir: "up", dead: 0 };
    Frogger.last = s;
    const homeEl = statBlock(ctx, "Liście", { meter: true });
    const livesEl = el("p", "bk-lives");
    const timeEl = el("div", "meter");
    const tf = el("span");
    timeEl.append(tf);
    ctx.panel.append(panelBlock("Życia i czas", livesEl, timeEl));

    // obiekty pasa: lista przedziałów [od, do) w polach
    // pierścień o długości będącej wielokrotnością okresu, żeby odstępy były równe
    const pieces = (L) => {
      const period = L.len + L.gap, R = period * Math.ceil((N + period) / period);
      return Array.from({ length: R / period }, (_, k) => {
        const a = (((L.off + k * period) % R) + R) % R - period;
        return [a, a + L.len];
      });
    };
    const reset = () => { Object.assign(s, { fx: 6, y: 12, time: 30, dir: "up" }); render(); };
    function die(why) {
      if (s.dead) return;
      s.dead = 0.9;
      s.lives--;
      Sound.lose();
      render();
      if (s.lives <= 0) ctx.lose(why, `Uratowane żaby: ${s.homes.size} z ${homes}.`);
      else ctx.toast(why);
    }
    function hop(d) {
      if (ctx.done || s.dead) return;
      const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
      const nx = Math.round(s.fx) + dx, ny = s.y + dy;
      if (nx < 0 || nx >= N || ny > 12 || ny < 0) return;
      s.dir = d;
      s.fx = nx;
      s.y = ny;
      s.hop = 1;
      Sound.tap();
      render();
      if (ny === 0) {
        const slot = slots.slice(0, homes).find((x) => Math.abs(x - nx) < 0.6);
        if (slot == null || s.homes.has(slot)) return die(slot == null ? "Plusk! To nie liść" : "Ten liść jest zajęty");
        s.homes.add(slot);
        Sound.line();
        render();
        if (s.homes.size >= homes) {
          if (s.lives === 1) ctx.achieve("ostatnia-zaba");
          if (s.lives === 3 && ctx.level.key === "medium") ctx.achieve("suche-lapki");
          if (s.lives === 3 && ctx.level.key === "hard") ctx.achieve("krolowa-stawu");
        }
        if (s.homes.size >= homes) return ctx.win(`Zostało ${s.lives} ${plural(s.lives, "życie", "życia", "żyć")}.`);
        reset();
      }
    }
    directionInput(ctx, board, hop);

    cv.loop((dt) => {
      for (const L of lanes) L.off += L.v * dt;
      if (!ctx.done) {
        if (s.dead) { s.dead -= dt; if (s.dead <= 0) { s.dead = 0; reset(); } }
        else {
          s.time -= dt;
          if (s.time <= 0) die("Czas minął");
          s.hop = Math.max(0, s.hop - dt * 7);
          const lane = lanes.find((L) => L.row === s.y);
          if (lane && lane.row <= 5) {
            const under = pieces(lane).some(([a, b]) => s.fx + 0.5 > a + 0.15 && s.fx + 0.5 < b - 0.15);
            if (!under) die("Plusk! Żaba wpadła do wody");
            else { s.fx += lane.v * dt; if (s.fx < -0.4 || s.fx > N - 0.6) die("Żaba odpłynęła za brzeg"); }
          } else if (lane) {
            if (pieces(lane).some(([a, b]) => s.fx + 0.8 > a && s.fx + 0.2 < b)) die("Potrącenie!");
          }
        }
        tf.style.width = `${Math.max(0, s.time / 30) * 100}%`;
      }
      draw();
    });

    function draw() {
      // tło pasów
      g.fillStyle = "#4dabf7";
      g.fillRect(0, S, W, S * 5);
      g.fillStyle = theme.line;
      g.fillRect(0, 7 * S, W, S * 5);
      g.fillStyle = "#8ce99a";
      g.fillRect(0, 6 * S, W, S);
      g.fillRect(0, 12 * S, W, S);
      g.fillStyle = "#2f9e44";
      g.fillRect(0, 0, W, S);
      g.strokeStyle = theme.surface;
      g.lineWidth = 0.6;
      g.setLineDash([3, 3]);
      for (let r = 8; r <= 11; r++) { g.beginPath(); g.moveTo(0, r * S); g.lineTo(W, r * S); g.stroke(); }
      g.setLineDash([]);
      // liście (cele)
      slots.slice(0, homes).forEach((x) => {
        g.fillStyle = "#4dabf7";
        g.fillRect(x * S - 1, 1, S + 2, S - 1);
        g.fillStyle = "#69db7c";
        g.beginPath();
        g.arc(x * S + S / 2, S / 2, 4, 0.3, Math.PI * 2 - 0.3);
        g.lineTo(x * S + S / 2, S / 2);
        g.fill();
        if (s.homes.has(x)) frog(x * S + S / 2, S / 2, "up", 0);
      });
      for (const L of lanes) {
        for (const [a, b] of pieces(L)) {
          const x = a * S, w = (b - a) * S, y = L.row * S;
          if (L.kind === "log") {
            g.fillStyle = "#8d5a3b";
            g.beginPath(); g.roundRect(x + 0.5, y + 1.6, w - 1, S - 3.2, 3); g.fill();
            g.fillStyle = "#a9734f";
            for (let k = 1; k < b - a; k++) g.fillRect(x + k * S - 0.4, y + 2.6, 0.8, S - 5.2);
          } else if (L.kind === "turtle") {
            for (let k = 0; k < b - a; k++) {
              g.fillStyle = "#2b8a3e";
              g.beginPath(); g.ellipse(x + k * S + S / 2, y + S / 2, 3.8, 3.2, 0, 0, Math.PI * 2); g.fill();
              g.fillStyle = "#51cf66";
              g.beginPath(); g.ellipse(x + k * S + S / 2, y + S / 2, 2.4, 2, 0, 0, Math.PI * 2); g.fill();
            }
          } else {
            g.fillStyle = L.color;
            g.beginPath(); g.roundRect(x + 0.8, y + 1.8, w - 1.6, S - 3.6, 2); g.fill();
            g.fillStyle = "rgba(255,255,255,0.65)";
            const front = L.v > 0 ? x + w - 3.2 : x + 1.6;
            g.fillRect(front, y + 2.8, 1.6, S - 5.6);
          }
        }
      }
      if (!ctx.done || s.lives > 0) frog(s.fx * S + S / 2, s.y * S + S / 2, s.dir, s.hop, s.dead);
      g.fillStyle = theme.text;
    }
    function frog(x, y, dir, hopT, dead = 0) {
      g.save();
      g.translate(x, y);
      g.rotate({ up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[dir]);
      const sc = 1 + hopT * 0.2;
      g.scale(sc, sc);
      g.globalAlpha = dead ? Math.max(0, dead) : 1;
      g.fillStyle = dead ? "#d12d4b" : theme.c;
      g.beginPath(); g.ellipse(0, 0.4, 3, 3.5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(-3, 2.6, 1.4, 1, -0.5, 0, Math.PI * 2); g.ellipse(3, 2.6, 1.4, 1, 0.5, 0, Math.PI * 2); g.ellipse(-2.6, -2, 1.2, 0.9, 0.5, 0, Math.PI * 2); g.ellipse(2.6, -2, 1.2, 0.9, -0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff";
      g.beginPath(); g.arc(-1.4, -2.4, 1, 0, Math.PI * 2); g.arc(1.4, -2.4, 1, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#111";
      g.beginPath(); g.arc(-1.4, -2.6, 0.5, 0, Math.PI * 2); g.arc(1.4, -2.6, 0.5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    function render() {
      homeEl.set(`${s.homes.size} / ${homes}`, s.homes.size / homes);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress((s.homes.size + (12 - s.y) / 12 * 0.9) / homes);
    }
    render();
  },
});
