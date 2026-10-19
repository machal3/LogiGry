// Klawisze (Piano Tiles): rzędy zjeżdżają w dół, w każdym jest jeden czarny klawisz. Stukaj je po kolei od dołu.
// Biały klawisz albo czarny, który ucieknie za dolną krawędź, kończy grę. Trafienia grają melodię.
const PianoTiles = { last: null };

if (typeof module !== "undefined") module.exports = PianoTiles;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "klawisze"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 40, speed: 1.6, accel: 0.012, double: 0 },
    { key: "medium", name: "Średni", points: 25, target: 70, speed: 2.1, accel: 0.016, double: 0.1 },
    { key: "hard", name: "Trudny", points: 50, target: 100, speed: 2.6, accel: 0.02, double: 0.2 },
  ],
  rules: [
    "Stukaj czarne klawisze od najniższego w górę, zanim zjadą poza planszę. Pierwszy stuk startuje grę.",
    "Stuknięcie białego pola kończy grę, tak samo jak czarny klawisz, który ucieknie.",
    "Na klawiaturze kolumny to D, F, J i K. Klawisze z czasem przyspieszają. Na średnim i trudnym w rzędzie bywają dwa czarne klawisze: trzeba zagrać oba.",
  ],
  achievements: [
    { id: "pierwsze-takty", name: "Pierwsze takty", desc: "Zagraj 25 klawiszy w jednej partii.", points: 10 },
    { id: "pol-utworu", name: "Pół utworu", desc: "Zagraj 60 klawiszy w jednej partii.", points: 25 },
    { id: "wirtuoz", name: "Wirtuoz", desc: "Wygraj trudny poziom w mniej niż 40 sekund.", points: 50 },
  ],
  mount(board, ctx) {
    const { target, speed, accel, double } = ctx.level;
    const W = 100, H = 150, COLS = 4, RH = H / 4;
    const cv = canvasGame(board, ctx, W, H, { max: 80 });
    const { g, theme } = cv;
    // melodia „Mary miała baranka” na skali gry (1 = C, 2 = D, 3 = E, 4 = G)
    const SONG = [3, 2, 1, 2, 3, 3, 3, 2, 2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 3, 3, 3, 2, 2, 3, 2, 1];
    const s = { rows: [], offset: 0, hit: 0, started: false, v: speed, dead: -1 };
    PianoTiles.last = s;
    // rząd 0 jest na dole; pierwszy klawisz w dolnym widocznym rzędzie
    // rząd: jeden albo dwa czarne klawisze (cols); col to pierwszy z nich
    const makeRow = (first) => {
      const col = rnd(COLS);
      const cols = !first && Math.random() < double ? [col, (col + 1 + rnd(COLS - 1)) % COLS] : [col];
      return { col, cols, done: [], tapped: false, flash: 0 };
    };
    for (let k = 0; k < 6; k++) s.rows.push(makeRow(k === 0));
    const ripples = [], notes = [];
    const hitEl = statBlock(ctx, "Klawisze", { meter: true });

    const rowY = (k) => H - RH * (k + 1) + s.offset; // górna krawędź rzędu k
    const lowest = () => s.rows.findIndex((r) => !r.tapped);
    function tap(col, y) {
      if (ctx.done) return;
      const k = lowest();
      const r = s.rows[k];
      // trafienie w kolumnę dolnego czarnego klawisza; y pomaga odrzucić stuknięcia w zupełnie inne rzędy
      const inRow = y == null || (y >= rowY(k) - RH * 0.6 && y <= rowY(k) + RH * 1.2);
      if (r.cols.includes(col) && !r.done.includes(col) && inRow) {
        r.done.push(col);
        r.tapped = r.done.length === r.cols.length;
        r.flash = 1;
        const cx = (col + 0.5) * (W / COLS);
        ripples.push({ x: cx, y: rowY(k) + RH / 2, t: 0 });
        notes.push({ x: cx, y: rowY(k) + RH / 2, t: 0, d: (s.hit % 2 ? 1 : -1) * (2 + Math.random() * 3) });
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
          s.rows.push(makeRow(false));
          if (!gone.tapped) { s.dead = gone.cols.find((c) => !gone.done.includes(c)); s.offset += RH; s.rows.unshift(gone); Sound.lose(); ctx.lose("Uciekł!", `Zagrane klawisze: ${s.hit}.`); break; }
        }
      }
      draw(dt);
    });

    const dark = () => parseInt((theme.surface || "#fff").slice(1, 3), 16) < 128;
    function draw(dt) {
      // tło kolumn: delikatny gradient i świecąca linia uderzenia na dole
      for (let c = 0; c < COLS; c++) {
        const x = (c * W) / COLS;
        const bg = g.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, c % 2 ? "rgba(92,124,250,0.03)" : "rgba(92,124,250,0.07)");
        bg.addColorStop(1, c % 2 ? "rgba(92,124,250,0.08)" : "rgba(92,124,250,0.12)");
        g.fillStyle = bg;
        g.fillRect(x, 0, W / COLS, H);
      }
      g.strokeStyle = theme.line;
      g.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) { g.beginPath(); g.moveTo((c * W) / COLS, 0); g.lineTo((c * W) / COLS, H); g.stroke(); }
      for (const rp of ripples) {
        rp.t += dt;
        g.strokeStyle = `rgba(92,124,250,${Math.max(0, 0.6 - rp.t * 1.5)})`;
        g.lineWidth = 1;
        g.beginPath(); g.arc(rp.x, rp.y, 4 + rp.t * 40, 0, 7); g.stroke();
      }
      while (ripples.length && ripples[0].t > 0.4) ripples.shift();
      s.rows.forEach((r, k) => {
        const y = rowY(k);
        if (y > H || y + RH < 0) return;
        r.flash = Math.max(0, r.flash - dt * 3);
        for (const col of r.cols) {
          const x = (col * W) / COLS;
          const played = r.done.includes(col);
          if (played) {
            g.fillStyle = `rgba(92,124,250,${0.12 + r.flash * 0.35})`;
            g.beginPath(); g.roundRect(x + 1, y + 1, W / COLS - 2, RH - 2, 3); g.fill();
            continue;
          }
          // czarny klawisz z połyskiem i jaśniejszym spodem
          // w ciemnym motywie klawisze jasne, żeby odcinały się od tła
          const kg = g.createLinearGradient(x, y, x + W / COLS, y + RH);
          if (dark()) { kg.addColorStop(0, "#ffffff"); kg.addColorStop(0.5, "#dee2e6"); kg.addColorStop(1, "#adb5bd"); }
          else { kg.addColorStop(0, "#3a3f4b"); kg.addColorStop(0.45, "#16181d"); kg.addColorStop(1, "#0b0c0f"); }
          g.fillStyle = kg;
          g.beginPath(); g.roundRect(x + 1, y + 1, W / COLS - 2, RH - 2, 3); g.fill();
          g.fillStyle = "rgba(255,255,255,0.08)";
          g.beginPath(); g.roundRect(x + 2.5, y + 2.5, W / COLS - 5, RH * 0.35, 2); g.fill();
          g.fillStyle = theme.c;
          g.beginPath(); g.roundRect(x + 4, y + RH - 6, W / COLS - 8, 2, 1); g.fill();
          if (r.cols.length > 1) {
            g.strokeStyle = "rgba(255,212,59,0.8)"; g.lineWidth = 0.6;
            g.beginPath(); g.roundRect(x + 1.6, y + 1.6, W / COLS - 3.2, RH - 3.2, 2.6); g.stroke();
          }
        }
        if (k === 0 && !s.started) {
          g.fillStyle = dark() ? "#16181d" : "#ffffff";
          g.font = "700 6px Geist, system-ui, sans-serif";
          g.textAlign = "center";
          g.fillText("Start", (r.col * W) / COLS + W / COLS / 2, y + RH / 2 + 2);
        }
        if (ctx.done && s.dead >= 0 && k === (s.deadRow ?? 0) && !r.cols.includes(s.dead)) {
          g.fillStyle = "rgba(209,45,75,0.6)";
          g.fillRect((s.dead * W) / COLS + 1, y + 1, W / COLS - 2, RH - 2);
        }
      });
      // nuty ulatują z zagranych klawiszy
      g.font = "700 6px Geist, system-ui, sans-serif";
      g.textAlign = "center";
      for (const n of notes) {
        n.t += dt;
        g.fillStyle = `rgba(92,124,250,${Math.max(0, 1 - n.t * 1.4)})`;
        g.fillText("♪", n.x + n.d * n.t * 4, n.y - n.t * 30);
      }
      while (notes.length && notes[0].t > 0.8) notes.shift();
      const glow = g.createLinearGradient(0, H - 4, 0, H);
      glow.addColorStop(0, "rgba(92,124,250,0)"); glow.addColorStop(1, "rgba(92,124,250,0.35)");
      g.fillStyle = glow;
      g.fillRect(0, H - 4, W, 4);
      g.font = "700 10px Geist, system-ui, sans-serif";
      g.lineWidth = 1.2;
      g.strokeStyle = theme.surface;
      g.fillStyle = theme.c;
      g.strokeText(s.hit, W / 2, 14);
      g.fillText(s.hit, W / 2, 14);
    }
    function render() {
      hitEl.set(`${s.hit} / ${target}`, s.hit / target);
      ctx.progress(s.hit / target);
    }
    render();
  },
});
