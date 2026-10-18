// Cegiełki: odbijaj piłkę paletką i rozbij wszystkie cegły. Współrzędne w jednostkach planszy W × H.
const Breakout = (() => {
  const W = 100, H = 125;

  function create({ rows, speed, lives, paddle = 18, tough = 0 }, colors) {
    const cols = 8, gap = 1.2, side = 4, top = 12, bh = 4.4;
    const bw = (W - 2 * side - gap * (cols - 1)) / cols;
    const bricks = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      bricks.push({ x: side + c * (bw + gap), y: top + r * (bh + gap), w: bw, h: bh, hp: r < tough ? 2 : 1, color: colors[r % colors.length] });
    }
    const state = {
      bricks, lives, base: speed, speed, hits: 0,
      paddle: { x: W / 2, w: paddle, y: H - 9, h: 2.6 },
      ball: { x: W / 2, y: 0, vx: 0, vy: 0, r: 1.5, stuck: true },
    };
    stick(state);
    return (api.last = state);
  }

  const stick = (s) => Object.assign(s.ball, { x: s.paddle.x, y: s.paddle.y - s.ball.r - 0.2, vx: 0, vy: 0, stuck: true });

  function launch(s) {
    if (!s.ball.stuck) return;
    const a = (Math.random() - 0.5) * 0.6;
    Object.assign(s.ball, { vx: s.speed * Math.sin(a), vy: -s.speed * Math.cos(a), stuck: false });
  }

  // Ruch o dt sekund. Zwraca zdarzenia: { wall, paddle, broke: [cegły], hit: [cegły], lost }.
  function step(s, dt) {
    const ev = { wall: false, paddle: false, broke: [], hit: [], lost: false };
    const b = s.ball, p = s.paddle;
    p.x = Math.min(W - p.w / 2, Math.max(p.w / 2, p.x));
    if (b.stuck) { b.x = p.x; return ev; }
    // podkroki krótsze niż promień piłki, żeby nie przelatywała przez cegły
    const n = Math.ceil((Math.hypot(b.vx, b.vy) * dt) / (b.r * 0.8)) || 1;
    for (let k = 0; k < n; k++) {
      b.x += (b.vx * dt) / n;
      b.y += (b.vy * dt) / n;
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); ev.wall = true; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); ev.wall = true; }
      if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); ev.wall = true; }
      if (b.y > H + b.r * 2) {
        s.lives--;
        ev.lost = true;
        stick(s);
        return ev;
      }
      // paletka: kąt odbicia zależy od miejsca trafienia (środek prosto w górę, brzegi do 60°)
      if (b.vy > 0 && b.y + b.r >= p.y && b.y - b.r <= p.y + p.h && Math.abs(b.x - p.x) <= p.w / 2 + b.r) {
        const rel = Math.max(-1, Math.min(1, (b.x - p.x) / (p.w / 2)));
        const a = rel * (Math.PI / 3);
        b.vx = s.speed * Math.sin(a);
        b.vy = -s.speed * Math.cos(a);
        b.y = p.y - b.r;
        ev.paddle = true;
      }
      for (const br of s.bricks) {
        if (br.hp <= 0) continue;
        const cx = Math.max(br.x, Math.min(b.x, br.x + br.w)), cy = Math.max(br.y, Math.min(b.y, br.y + br.h));
        if ((b.x - cx) ** 2 + (b.y - cy) ** 2 > b.r * b.r) continue;
        // odbicie w osi mniejszego wniknięcia
        const ox = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
        const oy = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
        if (ox < oy) b.vx = b.x < br.x + br.w / 2 ? -Math.abs(b.vx) : Math.abs(b.vx);
        else b.vy = b.y < br.y + br.h / 2 ? -Math.abs(b.vy) : Math.abs(b.vy);
        br.hp--;
        (br.hp ? ev.hit : ev.broke).push(br);
        // każda rozbita cegła lekko przyspiesza piłkę, najwyżej o 30%
        if (!br.hp) {
          s.hits++;
          s.speed = s.base * Math.min(1.3, 1 + s.hits * 0.012);
          const v = Math.hypot(b.vx, b.vy);
          b.vx *= s.speed / v;
          b.vy *= s.speed / v;
        }
        break;
      }
    }
    return ev;
  }

  const left = (s) => s.bricks.filter((b) => b.hp > 0).length;

  const api = { W, H, create, launch, step, left, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Breakout;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "cegielki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, rows: 4, speed: 58, lives: 3, paddle: 20 },
    { key: "medium", name: "Średni", points: 25, rows: 6, speed: 70, lives: 3, paddle: 18 },
    { key: "hard", name: "Trudny", points: 50, rows: 7, speed: 80, lives: 3, paddle: 15, tough: 2 },
  ],
  rules: [
    "Odbijaj piłkę paletką i rozbij wszystkie cegły. Piłka, która spadnie za paletkę, zabiera życie.",
    "Miejsce trafienia w paletkę ustala kąt odbicia: brzegiem kierujesz piłkę na boki. Na trudnym górne cegły trzeba trafić dwa razy.",
    "Sterowanie: mysz albo palec, na klawiaturze strzałki. Kliknięcie lub spacja wystrzeliwuje piłkę.",
  ],
  mount(board, ctx) {
    const { W, H } = Breakout;
    const s = Breakout.create(ctx.level, GAMES.map((g) => g.color));
    const total = s.bricks.length;
    let raf = 0, last = 0, keys = { left: false, right: false }, particles = [], squash = 0, flash = 0;

    board.classList.add("bk");
    board.style.setProperty("--cols", 10);
    board.style.setProperty("--rows", (10 * H) / W);
    const cv = el("canvas", "bk-canvas");
    cv.setAttribute("role", "img");
    cv.setAttribute("aria-label", "Plansza z cegłami, paletką i piłką");
    board.append(cv);
    const g = cv.getContext("2d");
    const fit = () => {
      const dpr = devicePixelRatio || 1;
      cv.width = Math.round(cv.clientWidth * dpr);
      cv.height = Math.round(cv.clientHeight * dpr);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(cv);

    // kolory z motywu strony, odświeżane przy zmianie jasny/ciemny
    let theme = {};
    const readTheme = () => {
      const cs = getComputedStyle(board);
      theme = { text: cs.getPropertyValue("--text").trim(), line: cs.getPropertyValue("--line").trim(), c: cs.getPropertyValue("--c").trim(), muted: cs.getPropertyValue("--muted").trim() };
    };
    readTheme();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    ctx.on(mq, "change", readTheme);

    const livesEl = el("p", "bk-lives");
    const leftEl = el("p", "panel-stat");
    ctx.panel.append(panelBlock("Życia", livesEl, leftEl));
    ctx.toast("Kliknij albo naciśnij spację, żeby wystrzelić piłkę");

    const fire = () => {
      if (ctx.done || !s.ball.stuck) return;
      Breakout.launch(s);
      Sound.tap();
    };
    ctx.on(board, "pointermove", (e) => {
      const r = cv.getBoundingClientRect();
      s.paddle.x = ((e.clientX - r.left) / r.width) * W;
    });
    ctx.on(board, "pointerdown", (e) => {
      const r = cv.getBoundingClientRect();
      s.paddle.x = ((e.clientX - r.left) / r.width) * W;
      fire();
    });
    ctx.on(document, "keydown", (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { keys[e.key === "ArrowLeft" ? "left" : "right"] = true; e.preventDefault(); }
      if ((e.key === " " || e.key === "ArrowUp") && !e.target.closest?.("button, a")) { e.preventDefault(); fire(); }
    });
    ctx.on(document, "keyup", (e) => {
      if (e.key === "ArrowLeft") keys.left = false;
      if (e.key === "ArrowRight") keys.right = false;
    });

    const burst = (br) => {
      for (let k = 0; k < 12; k++) particles.push({
        x: br.x + Math.random() * br.w, y: br.y + Math.random() * br.h,
        vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 30, s: 0.8 + Math.random() * 1.2, life: 1, color: br.color,
      });
    };

    function frame(t) {
      const dt = Math.min(1 / 30, (t - (last || t)) / 1000);
      last = t;
      if (!ctx.done) {
        if (keys.left) s.paddle.x -= 110 * dt;
        if (keys.right) s.paddle.x += 110 * dt;
        const ev = Breakout.step(s, dt);
        if (ev.paddle) { squash = 1; Sound.place(5); }
        else if (ev.wall) Sound.tap();
        ev.hit.forEach(() => Sound.place(3));
        ev.broke.forEach((br) => { burst(br); Sound.place(1 + (s.hits % 9)); });
        if (ev.broke.length || ev.lost) render();
        if (ev.lost) {
          flash = 1;
          if (s.lives <= 0) ctx.lose("Koniec piłek", "Piłka spadła za paletkę.");
          else { Sound.error(); ctx.toast("Piłka stracona. Kliknij, żeby wystrzelić następną"); }
        }
        if (!Breakout.left(s)) ctx.win();
      }
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function draw(dt) {
      const k = cv.width / W;
      g.setTransform(k, 0, 0, k, 0, 0);
      g.clearRect(0, 0, W, H);
      if (flash > 0) {
        g.fillStyle = `rgba(209, 45, 75, ${flash * 0.18})`;
        g.fillRect(0, 0, W, H);
        flash = Math.max(0, flash - dt * 2.5);
      }
      for (const br of s.bricks) {
        if (br.hp <= 0) continue;
        g.fillStyle = br.color;
        g.globalAlpha = br.hp > 1 ? 1 : 0.92;
        g.beginPath();
        g.roundRect(br.x, br.y, br.w, br.h, 1.1);
        g.fill();
        // twarda cegła: jaśniejsza ramka w środku
        if (br.hp > 1) {
          g.strokeStyle = "rgba(255,255,255,0.65)";
          g.lineWidth = 0.6;
          g.beginPath();
          g.roundRect(br.x + 0.9, br.y + 0.9, br.w - 1.8, br.h - 1.8, 0.6);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      particles = particles.filter((p) => (p.life -= dt * 1.6) > 0);
      for (const p of particles) {
        p.vy += 90 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        g.globalAlpha = p.life;
        g.fillStyle = p.color;
        g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      g.globalAlpha = 1;
      // paletka spłaszcza się na chwilę po odbiciu
      const p = s.paddle, sq = squash * 0.35;
      squash = Math.max(0, squash - dt * 6);
      g.fillStyle = theme.c;
      g.beginPath();
      g.roundRect(p.x - (p.w / 2) * (1 + sq * 0.15), p.y + sq, p.w * (1 + sq * 0.15), p.h - sq, p.h / 2);
      g.fill();
      const b = s.ball;
      g.fillStyle = theme.text;
      g.beginPath();
      g.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      g.fill();
      if (b.stuck && !ctx.done) {
        // podpowiedź kierunku przed wystrzałem
        g.strokeStyle = theme.muted;
        g.lineWidth = 0.4;
        g.setLineDash([1, 1.4]);
        g.beginPath();
        g.moveTo(b.x, b.y - 3);
        g.lineTo(b.x, b.y - 14);
        g.stroke();
        g.setLineDash([]);
      }
    }

    function render() {
      livesEl.replaceChildren(...Array.from({ length: ctx.level.lives }, (_, k) => el("span", k < s.lives ? "on" : "")));
      livesEl.setAttribute("aria-label", `Życia: ${s.lives}`);
      const n = Breakout.left(s);
      leftEl.textContent = `Cegły: ${n} z ${total}`;
      ctx.progress(1 - n / total);
    }
    render();
    raf = requestAnimationFrame(frame);
    ctx.onStop(() => { cancelAnimationFrame(raf); ro.disconnect(); });
  },
});
