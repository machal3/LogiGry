// Cegiełki: odbijaj piłkę paletką i rozbij wszystkie cegły. Współrzędne w jednostkach planszy W × H.
// Każdy poziom ma własny układ cegieł; z rozbitych cegieł czasem wypadają kapsuły z premiami.
const Breakout = (() => {
  const W = 100, H = 125;
  const PALETTE = ["#ff6b6b", "#ff922b", "#fcc419", "#51cf66", "#22b8cf", "#5c7cfa", "#cc5de8", "#f06595"];
  // układy: czy w wierszu r, kolumnie c (z 8) jest cegła
  const SHAPES = {
    full: () => true,
    diamond: (r, c, rows) => Math.abs(c - 3.5) + Math.abs(r - (rows - 1) / 2) * 1.2 <= 4.6,
    fortress: (r, c) => !(r >= 2 && r <= 4 && (c === 1 || c === 6)),
  };

  function create({ rows, speed, lives, paddle = 18, tough = 0, shape = "full", steel = 0 }) {
    const cols = 8, gap = 1.2, side = 4, top = 12, bh = 4.4;
    const bw = (W - 2 * side - gap * (cols - 1)) / cols;
    const bricks = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!SHAPES[shape](r, c, rows)) continue;
      // twarde cegły w górnych wierszach, najtwardsze (3 uderzenia) w środku twierdzy
      const hp = steel && r === 1 && c > 1 && c < 6 ? 3 : r < tough ? 2 : 1;
      bricks.push({ x: side + c * (bw + gap), y: top + r * (bh + gap), w: bw, h: bh, hp, max: hp, color: PALETTE[r % PALETTE.length] });
    }
    const state = {
      bricks, lives, base: speed, speed, hits: 0, slow: 1,
      paddle: { x: W / 2, w: paddle, base: paddle, y: H - 9, h: 2.6 },
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
  // prędkość piłki: rośnie z rozbitymi cegłami (do 30%), premia „wolniej” ją obniża
  function retune(s) {
    s.speed = s.base * Math.min(1.3, 1 + s.hits * 0.012) * s.slow;
    const b = s.ball, v = Math.hypot(b.vx, b.vy);
    if (v) { b.vx *= s.speed / v; b.vy *= s.speed / v; }
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
        br.flash = 1;
        (br.hp ? ev.hit : ev.broke).push(br);
        if (!br.hp) { s.hits++; retune(s); }
        break;
      }
    }
    return ev;
  }

  const left = (s) => s.bricks.filter((b) => b.hp > 0).length;

  const api = { W, H, create, launch, step, left, retune, last: null };
  return api;
})();

if (typeof module !== "undefined") module.exports = Breakout;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "cegielki"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, rows: 4, speed: 58, lives: 3, paddle: 20, shape: "full", drops: 0.22 },
    { key: "medium", name: "Średni", points: 25, rows: 7, speed: 70, lives: 3, paddle: 17, tough: 1, shape: "diamond", drops: 0.15 },
    { key: "hard", name: "Trudny", points: 50, rows: 8, speed: 84, lives: 3, paddle: 14, tough: 3, steel: 1, shape: "fortress", drops: 0.08 },
  ],
  rules: [
    "Odbijaj piłkę paletką i rozbij wszystkie cegły. Piłka, która spadnie za paletkę, zabiera życie.",
    "Miejsce trafienia w paletkę ustala kąt odbicia: brzegiem kierujesz piłkę na boki. Cegły z ramką trzeba trafić kilka razy.",
    "Z rozbitych cegieł wypadają kapsuły: szersza paletka, wolniejsza piłka i dodatkowe życie. Złap je paletką.",
    "Sterowanie: mysz albo palec, na klawiaturze strzałki. Kliknięcie lub spacja wystrzeliwuje piłkę.",
  ],
  achievements: [
    { id: "na-wlosku", name: "Na włosku", desc: "Rozbij wszystkie cegły na ostatniej piłce.", points: 10 },
    { id: "seria", name: "Seria", desc: "Rozbij 8 cegieł, zanim piłka wróci na paletkę.", points: 25 },
    { id: "czysta-gra", name: "Czysta gra", desc: "Wygraj średni poziom bez straty piłki.", points: 25 },
    { id: "mistrz-paletki", name: "Mistrz paletki", desc: "Wygraj trudny poziom bez straty piłki.", points: 50 },
  ],
  mount(board, ctx) {
    const { W, H } = Breakout;
    const L = ctx.level;
    const s = Breakout.create(L);
    const total = s.bricks.length;
    let raf = 0, last = 0, keys = { left: false, right: false }, particles = [], caps = [], trail = [], squash = 0, flash = 0, chain = 0, wide = 0, slowT = 0, banner = 0;

    board.classList.add("bk", "arcade");
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
    const bonusEl = el("p", "panel-note");
    ctx.panel.append(panelBlock("Życia", livesEl, leftEl, bonusEl));
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
      for (let k = 0; k < 16; k++) particles.push({
        x: br.x + Math.random() * br.w, y: br.y + Math.random() * br.h,
        vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 35, s: 0.7 + Math.random() * 1.3, life: 1, color: br.color, rot: Math.random() * 6,
      });
    };
    const KINDS = { wide: ["Szerzej", "#5c7cfa"], slow: ["Wolniej", "#22b8cf"], life: ["Życie", "#ff6b6b"] };
    function drop(br) {
      if (Math.random() > L.drops) return;
      const kind = s.lives < L.lives + 1 && Math.random() < 0.2 ? "life" : Math.random() < 0.55 ? "wide" : "slow";
      caps.push({ x: br.x + br.w / 2, y: br.y + br.h / 2, kind, t: 0 });
    }
    function catchCap(c) {
      Sound.line();
      if (c.kind === "wide") { wide = 12; ctx.toast("Szersza paletka"); }
      else if (c.kind === "slow") { slowT = 10; s.slow = 0.78; Breakout.retune(s); ctx.toast("Wolniejsza piłka"); }
      else { s.lives++; ctx.toast("Dodatkowe życie"); render(); }
    }

    function frame(t) {
      const dt = Math.min(1 / 30, (t - (last || t)) / 1000);
      last = t;
      if (!ctx.done) {
        if (keys.left) s.paddle.x -= 110 * dt;
        if (keys.right) s.paddle.x += 110 * dt;
        // premie wygasają
        wide = Math.max(0, wide - dt);
        s.paddle.w += ((wide ? s.paddle.base * 1.45 : s.paddle.base) - s.paddle.w) * Math.min(1, dt * 8);
        if (slowT > 0 && (slowT -= dt) <= 0) { s.slow = 1; Breakout.retune(s); }
        const ev = Breakout.step(s, dt);
        if (ev.paddle) { squash = 1; chain = 0; Sound.place(5); }
        else if (ev.wall) Sound.tap();
        ev.hit.forEach(() => Sound.place(3));
        ev.broke.forEach((br) => {
          burst(br);
          drop(br);
          chain++;
          if (chain >= 8) ctx.achieve("seria");
          if (chain >= 3) banner = 1;
          Sound.place(1 + (s.hits % 9));
        });
        // kapsuły spadają; złapane paletką działają od razu
        for (const c of caps) {
          c.y += 26 * dt;
          c.t += dt;
          const p = s.paddle;
          if (!c.gone && c.y + 2 >= p.y && c.y - 2 <= p.y + p.h && Math.abs(c.x - p.x) <= p.w / 2 + 3) { c.gone = true; catchCap(c); }
        }
        caps = caps.filter((c) => !c.gone && c.y < H + 4);
        if (ev.broke.length || ev.lost) render();
        if (ev.lost) {
          flash = 1;
          chain = 0;
          caps = [];
          wide = 0;
          if (s.lives <= 0) ctx.lose("Koniec piłek", `Zostało cegieł: ${Breakout.left(s)}.`);
          else { Sound.error(); ctx.toast("Piłka stracona. Kliknij, żeby wystrzelić następną"); }
        }
        if (!Breakout.left(s)) {
          if (s.lives === 1) ctx.achieve("na-wlosku");
          if (s.lives >= L.lives && L.key === "medium") ctx.achieve("czysta-gra");
          if (s.lives >= L.lives && L.key === "hard") ctx.achieve("mistrz-paletki");
          ctx.win();
        }
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
        brick(br, dt);
      }
      particles = particles.filter((p) => (p.life -= dt * 1.6) > 0);
      for (const p of particles) {
        p.vy += 90 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += dt * 6;
        g.save();
        g.globalAlpha = p.life;
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = p.color;
        g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
        g.restore();
      }
      g.globalAlpha = 1;
      for (const c of caps) capsule(c);
      // paletka spłaszcza się na chwilę po odbiciu
      const p = s.paddle, sq = squash * 0.35;
      squash = Math.max(0, squash - dt * 6);
      const px = p.x - (p.w / 2) * (1 + sq * 0.15), pw = p.w * (1 + sq * 0.15), py = p.y + sq, ph = p.h - sq;
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath(); g.roundRect(px + 0.5, py + 1, pw, ph, ph / 2); g.fill();
      const pg = g.createLinearGradient(0, py, 0, py + ph);
      pg.addColorStop(0, "#ffffff");
      pg.addColorStop(0.35, theme.c);
      pg.addColorStop(1, theme.c);
      g.fillStyle = pg;
      g.beginPath(); g.roundRect(px, py, pw, ph, ph / 2); g.fill();
      if (wide) { g.strokeStyle = `rgba(92,124,250,${0.4 + 0.3 * Math.sin(performance.now() / 120)})`; g.lineWidth = 0.4; g.stroke(); }
      // piłka ze smugą
      const b = s.ball;
      trail.push([b.x, b.y]);
      if (trail.length > 8 || b.stuck) trail.shift();
      trail.forEach(([x, y], i) => {
        g.globalAlpha = (i / trail.length) * 0.35;
        g.fillStyle = theme.c;
        g.beginPath(); g.arc(x, y, b.r * (0.4 + (i / trail.length) * 0.5), 0, 7); g.fill();
      });
      g.globalAlpha = 1;
      const bg = g.createRadialGradient(b.x - 0.5, b.y - 0.5, 0.2, b.x, b.y, b.r * 2.6);
      bg.addColorStop(0, "rgba(255,255,255,1)");
      bg.addColorStop(0.35, "rgba(255,255,255,0.9)");
      bg.addColorStop(0.45, "rgba(255,255,255,0.18)");
      bg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = bg;
      g.beginPath(); g.arc(b.x, b.y, b.r * 2.6, 0, 7); g.fill();
      if (b.stuck && !ctx.done) {
        // podpowiedź kierunku przed wystrzałem
        g.strokeStyle = "rgba(255,255,255,0.4)";
        g.lineWidth = 0.4;
        g.setLineDash([1, 1.4]);
        g.beginPath();
        g.moveTo(b.x, b.y - 3);
        g.lineTo(b.x, b.y - 14);
        g.stroke();
        g.setLineDash([]);
      }
      // seria rozbitych cegieł
      if (banner > 0 && chain >= 3 && !ctx.done) {
        banner = Math.max(0, banner - dt * 0.8);
        g.globalAlpha = banner;
        g.fillStyle = "#ffffff";
        g.font = "700 4.5px Geist, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(`Seria ×${chain}`, W / 2, H * 0.62);
        g.globalAlpha = 1;
      }
    }

    // cegła z fazą: jasna krawędź u góry, ciemna u dołu, rysy po trafieniu
    function brick(br, dt) {
      const { x, y, w, h } = br;
      g.fillStyle = br.color;
      g.beginPath(); g.roundRect(x, y, w, h, 1); g.fill();
      const sh = g.createLinearGradient(0, y, 0, y + h);
      sh.addColorStop(0, "rgba(255,255,255,0.45)");
      sh.addColorStop(0.45, "rgba(255,255,255,0.05)");
      sh.addColorStop(1, "rgba(0,0,0,0.28)");
      g.fillStyle = sh;
      g.beginPath(); g.roundRect(x, y, w, h, 1); g.fill();
      if (br.max > 1) {
        // twarda cegła: metalowa ramka, rysy pokazują utracone uderzenia
        g.strokeStyle = br.max > 2 ? "rgba(230,235,245,0.95)" : "rgba(255,255,255,0.7)";
        g.lineWidth = br.max > 2 ? 0.8 : 0.55;
        g.beginPath(); g.roundRect(x + 0.7, y + 0.7, w - 1.4, h - 1.4, 0.6); g.stroke();
        g.strokeStyle = "rgba(20,20,40,0.55)"; g.lineWidth = 0.35;
        for (let k = 0; k < br.max - br.hp; k++) {
          g.beginPath();
          g.moveTo(x + w * (0.25 + k * 0.3), y + 0.4);
          g.lineTo(x + w * (0.35 + k * 0.3), y + h * 0.55);
          g.lineTo(x + w * (0.28 + k * 0.3), y + h - 0.4);
          g.stroke();
        }
      }
      if (br.flash > 0) {
        br.flash = Math.max(0, br.flash - dt * 5);
        g.fillStyle = `rgba(255,255,255,${br.flash * 0.7})`;
        g.beginPath(); g.roundRect(x, y, w, h, 1); g.fill();
      }
    }
    function capsule(c) {
      const [label, col] = KINDS[c.kind];
      g.save();
      g.translate(c.x, c.y);
      const pulse = 1 + Math.sin(c.t * 8) * 0.06;
      g.scale(pulse, pulse);
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.beginPath(); g.roundRect(-5.5, -1.4, 11, 3.6, 1.8); g.fill();
      const cg = g.createLinearGradient(0, -1.8, 0, 1.8);
      cg.addColorStop(0, "#ffffff"); cg.addColorStop(0.4, col); cg.addColorStop(1, col);
      g.fillStyle = cg;
      g.beginPath(); g.roundRect(-5.5, -1.8, 11, 3.6, 1.8); g.fill();
      g.fillStyle = "#ffffff";
      g.font = "700 2.2px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, 0, 0.15);
      g.restore();
    }

    function render() {
      livesEl.replaceChildren(...Array.from({ length: Math.max(L.lives, s.lives) }, (_, k) => el("span", k < s.lives ? "on" : "")));
      livesEl.setAttribute("aria-label", `Życia: ${s.lives}`);
      const n = Breakout.left(s);
      leftEl.textContent = `Cegły: ${n} z ${total}`;
      bonusEl.textContent = wide || slowT > 0 ? [wide ? "szersza paletka" : "", slowT > 0 ? "wolniejsza piłka" : ""].filter(Boolean).join(", ").replace(/^./, (m) => m.toUpperCase()) : "Złap kapsuły z premiami.";
      ctx.progress(1 - n / total);
    }
    render();
    raf = requestAnimationFrame(frame);
    ctx.onStop(() => { cancelAnimationFrame(raf); ro.disconnect(); });
  },
});
