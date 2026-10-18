// Klawisze (Piano Tiles): rzędy zjeżdżają w dół, w każdym jest jeden czarny klawisz. Stukaj je po kolei od dołu.
// Biały klawisz albo czarny, który ucieknie za dolną krawędź, kończy grę. Trafienia grają melodię.
const PianoTiles = { last: null };

if (typeof module !== "undefined") module.exports = PianoTiles;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "klawisze"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 40, speed: 1.6, accel: 0.012 },
    { key: "medium", name: "Średni", points: 25, target: 70, speed: 2.1, accel: 0.016 },
    { key: "hard", name: "Trudny", points: 50, target: 100, speed: 2.6, accel: 0.02 },
  ],
  rules: [
    "Stukaj czarne klawisze od najniższego w górę, zanim zjadą poza planszę. Pierwszy stuk startuje grę.",
    "Stuknięcie białego pola kończy grę, tak samo jak czarny klawisz, który ucieknie.",
    "Na klawiaturze kolumny to D, F, J i K. Klawisze z czasem przyspieszają.",
  ],
  achievements: [
    { id: "pierwsze-takty", name: "Pierwsze takty", desc: "Zagraj 25 klawiszy w jednej partii.", points: 10 },
    { id: "pol-utworu", name: "Pół utworu", desc: "Zagraj 60 klawiszy w jednej partii.", points: 25 },
    { id: "wirtuoz", name: "Wirtuoz", desc: "Wygraj trudny poziom w mniej niż 40 sekund.", points: 50 },
  ],
  mount(board, ctx) {
    const { target, speed, accel } = ctx.level;
    const W = 100, H = 150, COLS = 4, RH = H / 4;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    // melodia „Mary miała baranka” na skali gry (1 = C, 2 = D, 3 = E, 4 = G)
    const SONG = [3, 2, 1, 2, 3, 3, 3, 2, 2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 3, 3, 3, 2, 2, 3, 2, 1];
    const s = { rows: [], offset: 0, hit: 0, started: false, v: speed, dead: -1 };
    PianoTiles.last = s;
    // rząd 0 jest na dole; pierwszy klawisz w dolnym widocznym rzędzie
    for (let k = 0; k < 6; k++) s.rows.push({ col: rnd(COLS), tapped: false, flash: 0 });
    const hitEl = statBlock(ctx, "Klawisze", { meter: true });

    const rowY = (k) => H - RH * (k + 1) + s.offset; // górna krawędź rzędu k
    const lowest = () => s.rows.findIndex((r) => !r.tapped);
    function tap(col, y) {
      if (ctx.done) return;
      const k = lowest();
      const r = s.rows[k];
      // trafienie w kolumnę dolnego czarnego klawisza; y pomaga odrzucić stuknięcia w zupełnie inne rzędy
      const inRow = y == null || (y >= rowY(k) - RH * 0.6 && y <= rowY(k) + RH * 1.2);
      if (col === r.col && inRow) {
        r.tapped = true;
        r.flash = 1;
        s.started = true;
        Sound.place(SONG[s.hit % SONG.length]);
        s.hit++;
        render();
        if (s.hit === 25) ctx.achieve("pierwsze-takty");
        if (s.hit === 60) ctx.achieve("pol-utworu");
        if (s.hit >= target && ctx.level.key === "hard" && ctx.time < 40) ctx.achieve("wirtuoz");
        if (s.hit >= target) ctx.win();
        return;
      }
      s.dead = col;
      s.deadRow = k;
      Sound.lose();
      ctx.lose("Fałszywa nuta", `Zagrane klawisze: ${s.hit}.`);
    }
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); const [x, y] = cv.at(e); tap(Math.min(COLS - 1, Math.floor(x / (W / COLS))), y); });
    heldKeys(ctx, (key) => { const c = ["d", "f", "j", "k"].indexOf(key); if (c >= 0) tap(c); });

    cv.loop((dt) => {
      if (s.started && !ctx.done) {
        s.v += accel * dt * 10;
        s.offset += s.v * RH * dt;
        // rząd wyjechał za dół: jeśli nietrafiony, koniec
        while (s.offset >= RH) {
          const gone = s.rows.shift();
          s.offset -= RH;
          s.rows.push({ col: rnd(COLS), tapped: false, flash: 0 });
          if (!gone.tapped) { s.dead = gone.col; s.offset += RH; s.rows.unshift(gone); Sound.lose(); ctx.lose("Uciekł!", `Zagrane klawisze: ${s.hit}.`); break; }
        }
      }
      draw(dt);
    });

    function draw(dt) {
      g.strokeStyle = theme.line;
      g.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) { g.beginPath(); g.moveTo((c * W) / COLS, 0); g.lineTo((c * W) / COLS, H); g.stroke(); }
      s.rows.forEach((r, k) => {
        const y = rowY(k);
        if (y > H || y + RH < 0) return;
        const x = (r.col * W) / COLS;
        r.flash = Math.max(0, r.flash - dt * 3);
        g.fillStyle = r.tapped ? `rgba(128,128,128,${0.18 + r.flash * 0.3})` : theme.text;
        g.beginPath();
        g.roundRect(x + 1, y + 1, W / COLS - 2, RH - 2, 3);
        g.fill();
        if (!r.tapped) {
          g.fillStyle = theme.c;
          g.fillRect(x + 4, y + RH - 6, W / COLS - 8, 2);
        }
        if (k === 0 && !s.started) {
          g.fillStyle = theme.bg;
          g.font = "700 6px Geist, system-ui, sans-serif";
          g.textAlign = "center";
          g.fillText("Start", x + W / COLS / 2, y + RH / 2 + 2);
        }
        if (ctx.done && s.dead >= 0 && k === (s.deadRow ?? 0) && s.dead !== r.col) {
          g.fillStyle = "rgba(209,45,75,0.6)";
          g.fillRect((s.dead * W) / COLS + 1, y + 1, W / COLS - 2, RH - 2);
        }
      });
      g.fillStyle = theme.text;
      g.font = "700 10px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      g.globalAlpha = 0.25;
      g.fillText(s.hit, W / 2, 16);
      g.globalAlpha = 1;
    }
    function render() {
      hitEl.set(`${s.hit} / ${target}`, s.hit / target);
      ctx.progress(s.hit / target);
    }
    render();
  },
});
