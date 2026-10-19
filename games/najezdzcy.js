// Najeźdźcy (Space Invaders): formacja kosmitów schodzi w dół; zestrzel wszystkich, zanim wylądują. Osłony się kruszą.
const Invaders = { last: null };

if (typeof module !== "undefined") module.exports = Invaders;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "najezdzcy"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, waves: 1, rows: 4, step: 9, fire: 0.6 },
    { key: "medium", name: "Średni", points: 25, waves: 2, rows: 5, step: 11, fire: 0.9 },
    { key: "hard", name: "Trudny", points: 50, waves: 4, rows: 5, step: 13, fire: 1.5 },
  ],
  rules: [
    "Strzałki albo A i D przesuwają działo, spacja strzela. Na telefonie przeciągnij palcem po planszy: działo jedzie za palcem i strzela samo.",
    "Kosmici przesuwają się coraz szybciej, im mniej ich zostaje. Gdy dotrą do dołu, przegrywasz.",
    "Chowaj się za osłonami, ale pamiętaj, że pociski je kruszą. Masz trzy życia.",
  ],
  achievements: [
    { id: "ostatnie-dzialo", name: "Ostatnie działo", desc: "Wygraj, mając już tylko jedno życie.", points: 10 },
    { id: "obronca-ziemi", name: "Obrońca Ziemi", desc: "Wygraj średni poziom bez utraty życia.", points: 25 },
    { id: "as-obrony", name: "As obrony", desc: "Wygraj trudny poziom bez utraty życia.", points: 50 },
  ],
  mount(board, ctx) {
    const { waves, rows, step, fire } = ctx.level;
    const W = 100, H = 130, PY = 120;
    const cv = canvasGame(board, ctx, W, H, { max: 84, cls: "space" });
    const { g, theme } = cv;
    // sprite'y 8 × 6 w dwóch klatkach
    const SPR = [
      ["..#..#..", "...##...", "..####..", ".#.##.#.", "########", "#.#..#.#"],
      ["..#..#..", "#..##..#", "#.####.#", "##.##.##", "########", ".#....#."],
      ["...##...", "..####..", ".##..##.", "########", "..#..#..", ".#.##.#."],
      ["...##...", "..####..", ".##..##.", "########", ".#.##.#.", "#......#"],
    ];
    const ROWCOL = ["#e03131", "#f76707", "#fab005", "#40c057", "#15aabf"];
    const s = { x: 50, bullets: [], bombs: [], aliens: [], dir: 1, t: 0, frame: 0, wave: 1, lives: 3, score: 0, ufo: null, shields: [], boom: [] };
    Invaders.last = s;
    function makeWave() {
      s.aliens = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < 8; c++) s.aliens.push({ x: 12 + c * 10, y: 14 + r * 8 + (s.wave - 1) * 4, r, alive: true });
      s.dir = 1;
      s.shields = [];
      for (let k = 0; k < 4; k++) for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
        if ((y === 3 && (x === 2 || x === 3)) || (y === 0 && (x === 0 || x === 5))) continue;
        s.shields.push({ x: 10 + k * 24 + x * 1.6, y: 102 + y * 1.6, hp: 2 });
      }
    }
    makeWave();
    const scoreEl = statBlock(ctx, "Fala", { meter: true });
    const livesEl = el("p", "bk-lives");
    ctx.panel.append(panelBlock("Życia", livesEl));
    const keys = heldKeys(ctx, (k) => { if (k === " " || k === "arrowup" || k === "w") shoot(); });
    let touchX = null, autoT = 0;
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); touchX = cv.at(e)[0]; shoot(); });
    ctx.on(document, "pointermove", (e) => { if (touchX != null) touchX = cv.at(e)[0]; });
    ctx.on(document, "pointerup", () => (touchX = null));
    function shoot() {
      if (ctx.done || s.bullets.length >= 2) return;
      s.bullets.push({ x: s.x, y: PY - 4 });
      Sound.tap();
    }
    const alive = () => s.aliens.filter((a) => a.alive);
    let moveT = 0;
    cv.loop((dt) => {
      if (!ctx.done) {
        s.t += dt;
        const dx = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0);
        if (touchX != null) { s.x += Math.max(-1, Math.min(1, (touchX - s.x) / 3)) * 60 * dt; autoT -= dt; if (autoT <= 0) { shoot(); autoT = 0.45; } }
        else s.x += dx * 60 * dt;
        s.x = Math.max(5, Math.min(W - 5, s.x));
        // formacja: krok co pewien czas, szybciej, gdy jest mniej kosmitów
        const left = alive();
        moveT -= dt;
        if (moveT <= 0 && left.length) {
          moveT = Math.max(0.06, 0.55 * (left.length / (rows * 8))) / (1 + (s.wave - 1) * 0.15);
          s.frame ^= 1;
          const minX = Math.min(...left.map((a) => a.x)), maxX = Math.max(...left.map((a) => a.x));
          if ((s.dir > 0 && maxX + 5 > W - 3) || (s.dir < 0 && minX - 5 < 3)) { s.dir *= -1; left.forEach((a) => (a.y += 4)); }
          else left.forEach((a) => (a.x += s.dir * step * 0.22));
          Sound.place(s.frame ? 1 : 2);
        }
        // bomby z najniższych kosmitów w kolumnach
        if (Math.random() < fire * dt * (1 + s.wave * 0.2) && left.length) {
          const shooter = pick(left.filter((a) => !left.some((b) => Math.abs(b.x - a.x) < 3 && b.y > a.y)));
          s.bombs.push({ x: shooter.x, y: shooter.y + 4, v: 38 + s.wave * 6 });
        }
        if (!s.ufo && Math.random() < 0.06 * dt) s.ufo = { x: -8, v: 22 };
        if (s.ufo) { s.ufo.x += s.ufo.v * dt; if (s.ufo.x > W + 8) s.ufo = null; }
        for (const b of s.bullets) b.y -= 110 * dt;
        for (const b of s.bombs) b.y += b.v * dt;
        // trafienia
        for (const b of s.bullets) {
          const a = left.find((a) => Math.abs(a.x - b.x) < 4.2 && Math.abs(a.y - b.y) < 3.4);
          if (a) { a.alive = false; b.y = -9; s.score += (rows - a.r) * 10; boom(a.x, a.y, ROWCOL[a.r]); Sound.place(5 + (a.r % 4)); }
          if (s.ufo && Math.abs(s.ufo.x - b.x) < 5 && b.y < 9) { s.score += 100; boom(s.ufo.x, 6, "#e64980"); s.ufo = null; b.y = -9; Sound.line(); }
          const sh = s.shields.find((p) => p.hp > 0 && Math.abs(p.x - b.x) < 1.3 && Math.abs(p.y - b.y) < 1.3);
          if (sh) { sh.hp = 0; b.y = -9; }
        }
        for (const b of s.bombs) {
          const sh = s.shields.find((p) => p.hp > 0 && Math.abs(p.x - b.x) < 1.4 && Math.abs(p.y - b.y) < 1.4);
          if (sh) { sh.hp--; b.y = H + 9; }
          if (b.y > PY - 2 && b.y < PY + 3 && Math.abs(b.x - s.x) < 5) {
            b.y = H + 9;
            s.lives--;
            boom(s.x, PY, theme.c);
            Sound.lose();
            render();
            if (s.lives <= 0) return ctx.lose("Działo zniszczone", `Fala ${s.wave} z ${waves}.`);
            ctx.toast("Trafienie! Zostały " + s.lives);
          }
        }
        s.bullets = s.bullets.filter((b) => b.y > 0);
        s.bombs = s.bombs.filter((b) => b.y < H);
        // kosmici niszczą osłony, przez które przechodzą, a na dole kończą grę
        for (const a of alive()) {
          s.shields.forEach((p) => { if (Math.abs(p.x - a.x) < 4 && Math.abs(p.y - a.y) < 3) p.hp = 0; });
          if (a.y > PY - 6) { render(); return ctx.lose("Inwazja", "Kosmici wylądowali."); }
        }
        if (!alive().length) {
          if (s.wave >= waves) {
            if (s.lives === 1) ctx.achieve("ostatnie-dzialo");
            if (s.lives === 3 && ctx.level.key === "medium") ctx.achieve("obronca-ziemi");
            if (s.lives === 3 && ctx.level.key === "hard") ctx.achieve("as-obrony");
            render(); return ctx.win(`Punkty: ${s.score}.`); }
          s.wave++;
          s.banner = 1.6;
          Sound.line();
          makeWave();
        }
        render();
      }
      draw(dt);
    });
    function boom(x, y, color) { for (let k = 0; k < 10; k++) s.boom.push({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, t: 1, color }); }
    function sprite(rowsArr, x, y, color, px = 1) {
      g.fillStyle = color;
      rowsArr.forEach((row, r) => [...row].forEach((ch, c) => ch === "#" && g.fillRect(x - 4 * px + c * px, y - 3 * px + r * px, px, px)));
    }
    s.banner = 1.4;
    function draw(dt) {
      // powierzchnia planety na dole
      const gr = g.createLinearGradient(0, PY + 5, 0, H);
      gr.addColorStop(0, "rgba(21,170,191,0.35)"); gr.addColorStop(1, "rgba(21,170,191,0.05)");
      g.fillStyle = gr;
      g.fillRect(0, PY + 5, W, H - PY - 5);
      // kosmici z poświatą w kolorze rzędu
      for (const a of s.aliens) if (a.alive) {
        g.globalAlpha = 0.07;
        g.fillStyle = ROWCOL[a.r];
        g.beginPath(); g.arc(a.x, a.y, 4.2, 0, 7); g.fill();
        g.globalAlpha = 1;
        sprite(SPR[(a.r % 2) * 2 + s.frame], a.x, a.y, ROWCOL[a.r]);
      }
      for (const p of s.shields) if (p.hp > 0) { g.fillStyle = theme.c; g.globalAlpha = p.hp === 2 ? 1 : 0.5; g.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6); }
      g.globalAlpha = 1;
      if (s.ufo) {
        g.fillStyle = "rgba(230,73,128,0.25)"; g.beginPath(); g.ellipse(s.ufo.x, 6, 8, 4, 0, 0, 7); g.fill();
        g.fillStyle = "#a5d8ff"; g.beginPath(); g.ellipse(s.ufo.x, 4.6, 2.2, 1.6, 0, Math.PI, 0); g.fill();
        const ug = g.createLinearGradient(0, 4.5, 0, 8);
        ug.addColorStop(0, "#ff8fb5"); ug.addColorStop(1, "#a61e4d");
        g.fillStyle = ug; g.beginPath(); g.ellipse(s.ufo.x, 6, 5, 2, 0, 0, Math.PI * 2); g.fill();
        for (let k = -1; k <= 1; k++) { g.fillStyle = Math.floor(s.t * 8 + k) % 2 ? "#fff3bf" : "#ffd43b"; g.fillRect(s.ufo.x + k * 2.4 - 0.4, 5.8, 0.8, 0.8); }
      }
      for (const b of s.bullets) {
        g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(b.x - 1, b.y - 3, 2, 5);
        g.fillStyle = "#ffffff"; g.fillRect(b.x - 0.4, b.y - 2, 0.8, 3);
      }
      g.fillStyle = "#e03131";
      for (const b of s.bombs) { const w = Math.sin(b.y) > 0 ? 0.6 : -0.6; g.fillRect(b.x - 0.5 + w, b.y - 1.5, 1, 1.5); g.fillRect(b.x - 0.5 - w, b.y, 1, 1.5); }
      // działo
      if (!ctx.done || s.lives > 0) {
        const cg = g.createLinearGradient(0, PY - 4, 0, PY + 3);
        cg.addColorStop(0, "#c3fae8"); cg.addColorStop(0.5, theme.c); cg.addColorStop(1, "#087f5b");
        g.fillStyle = cg;
        g.beginPath();
        g.roundRect(s.x - 5, PY - 1, 10, 4, 1.2);
        g.roundRect(s.x - 1.2, PY - 4, 2.4, 4, 0.8);
        g.fill();
        g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(s.x - 4, PY - 0.4, 8, 0.5);
      }
      g.fillStyle = theme.line;
      g.fillRect(0, PY + 5, W, 0.6);
      s.boom = s.boom.filter((p) => (p.t -= dt * 2.4) > 0);
      for (const p of s.boom) { p.x += p.vx * dt; p.y += p.vy * dt; g.globalAlpha = p.t; g.fillStyle = p.color; g.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2); }
      g.globalAlpha = 1;
      g.fillStyle = theme.muted;
      g.font = "600 5px Geist, system-ui, sans-serif";
      g.textAlign = "right";
      g.fillText(s.score, W - 4, 8);
      if (s.banner > 0 && !ctx.done) {
        s.banner -= dt;
        g.globalAlpha = Math.min(1, s.banner);
        g.textAlign = "center";
        g.fillStyle = "#ffffff";
        g.font = "700 8px Geist, system-ui, sans-serif";
        g.fillText(`Fala ${s.wave}`, W / 2, 80);
        g.font = "500 4px Geist, system-ui, sans-serif";
        g.fillStyle = "rgba(238,241,255,0.7)";
        g.fillText(s.wave === waves ? "ostatnia" : `z ${waves}`, W / 2, 86);
        g.globalAlpha = 1;
      }
    }
    function render() {
      const total = rows * 8, gone = total - alive().length;
      scoreEl.set(`${s.wave} / ${waves}`, ((s.wave - 1) * total + gone) / (waves * total), `Punkty: ${s.score}`);
      livesEl.replaceChildren(...[0, 1, 2].map((k) => el("span", k < s.lives ? "on" : "")));
      ctx.progress(((s.wave - 1) * total + gone) / (waves * total));
    }
    render();
  },
});
