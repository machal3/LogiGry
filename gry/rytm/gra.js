// Rytm: cztery tory, spadające nuty i pole trafienia. Klawisz trzeba wcisnąć w takt.
{
  const LANES = 4;
  const WIN = { perfect: 0.085, good: 0.17 };   // okno trafienia w sekundach
  const COLORS = ["#ff5c8a", "#ffd166", "#4cc9f0", "#b388ff"];
  const KEY_NAMES = ["D", "F", "J", "K"];
  const KEY_LANE = { d: 0, f: 1, j: 2, k: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };

  // Ocena uderzenia: różnica czasu między klawiszem a nutą.
  function judgeDelta(d) {
    const a = Math.abs(d);
    if (a <= WIN.perfect) return { kind: "perfect", points: 300 };
    if (a <= WIN.good) return { kind: "good", points: 150 };
    return null;
  }

  // Następny tor nie może być tym samym, po którym szła poprzednia nuta.
  function nextLane(prev) { return (prev + 1 + rnd(3)) % LANES; }

  // Rozkład nut na siatce taktów: równy rytm, gęstość i akordy według poziomu.
  function makeChart(level) {
    const beat = 60 / level.bpm;
    const step = beat / level.stepDiv;
    const notes = [];
    let lane = rnd(LANES);
    for (let t = beat * 2; t < level.duration; t += step) {
      if (rnd(100) >= level.density) continue;
      lane = nextLane(lane);
      notes.push({ t, lane });
      if (level.chord && rnd(100) < level.chord) notes.push({ t, lane: (lane + 2) % LANES });
    }
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    return notes;
  }

  // Najbliższa nieoceniona nuta na danym torze w oknie trafienia.
  function findHit(notes, lane, time) {
    let best = null;
    for (const n of notes) {
      if (n.done || n.lane !== lane) continue;
      const d = Math.abs(n.t - time);
      if (d > WIN.good) continue;
      if (!best || d < Math.abs(best.t - time)) best = n;
    }
    return best;
  }

  if (typeof module !== "undefined") module.exports = { judgeDelta, makeChart, findHit, nextLane, WIN, LANES, KEY_LANE };

  if (typeof registerGame !== "undefined") registerGame({
    id: "rytm",
    cat: "zrecznosciowe",
    name: "Rytm",
    author: "DeepSeek V4.1 Flash",
    desc: "Wystukuj klawiszami nuty spadające po czterech torach. Liczy się moment uderzenia, nie samo trafienie.",
    color: "#c2185b",
    ink: "#ffffff",
    glyph: ["#...#", ".#.#.", "..#..", "#...#", "....."],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, bpm: 96, stepDiv: 1, density: 80, chord: 0, duration: 36, approach: 1.5 },
      { key: "medium", name: "Średni", points: 25, bpm: 116, stepDiv: 2, density: 48, chord: 0, duration: 42, approach: 1.15 },
      { key: "hard", name: "Trudny", points: 50, bpm: 138, stepDiv: 2, density: 52, chord: 18, duration: 44, approach: 0.9 },
    ],
    rules: [
      "Nuty zjeżdżają po czterech torach do paska na dole. Wciskasz klawisz toru, gdy nuta dotknie paska.",
      "Trafienie w sam środek daje więcej punktów. Pudło, czyli nuta minięta, odbiera jedno serce.",
      "Wciśnięcie klawisza bez nuty w pobliżu przerywa serię. Im dłuższa seria, tym wyższy wynik.",
      "D, F, J, K lub strzałki na klawiaturze; na telefonie cztery przyciski torów w panelu.",
    ],
    achievements: [
      { id: "bez-falstartu", name: "Bez falstartu", desc: "Wygraj poziom bez jednego pustego wciśnięcia.", points: 10 },
      { id: "dluga-seria", name: "Seria 50", desc: "Uderz 50 nut z rzędu bez pomyłki.", points: 25 },
      { id: "bez-pudla", name: "Bez pudła", desc: "Wygraj poziom, nie tracąc ani jednego serca.", points: 25 },
      { id: "wirtuoz", name: "Wirtuoz", desc: "Wygraj trudny poziom z co najmniej 90% uderzeń w sam środek.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const W = 420, H = 620;
      const LW = W / LANES;
      const HY = H - 116;             // linia trafienia
      const PH = 54;                  // wysokość pól trafienia
      const SPEED = (HY + 40) / L.approach;
      const beat = 60 / L.bpm;
      const cv = canvasGame(board, ctx, W, H, { max: 74, cls: "neon" });
      const g = cv.g;

      const notes = makeChart(L);
      const S = {
        song: 0, hearts: 3, combo: 0, best: 0, hits: 0, perfect: 0, misses: 0, empty: 0,
        score: 0, press: [0, 0, 0, 0], pops: [], nextBeat: 0, beats: 0, pulse: 0,
        gotSeria: false, done: false,
      };

      const hitEl = statBlock(ctx, "Trafienia", { meter: true });
      const runEl = statBlock(ctx, "Seria", { small: true });
      ctx.panel.append(panelBlock("Klawisze", keysLegend()));
      const keys = heldKeys(ctx, (key) => press(KEY_LANE[key]));
      keys.onTap = (key) => press(KEY_LANE[key]);
      touchPad(ctx, keys, [["d", "Tor 1"], ["f", "Tor 2"], ["j", "Tor 3"], ["k", "Tor 4"]]);

      // Podpisy klawiszy w panelu; na płótnie każdy tor ma je nad sobą.
      function keysLegend() {
        const row = el("p", "ry-keys");
        KEY_NAMES.forEach((k, i) => {
          if (i) row.append(el("span", "ry-plus", "lub"));
          row.append(el("span", "ry-key", k));
        });
        return row;
      }

      function pop(lane, text, color) {
        S.pops.push({ lane, text, color, y: HY + 20, life: 0.7 });
      }

      function press(lane) {
        if (lane == null || ctx.done || S.done) return;
        S.press[lane] = 0.14;
        const n = findHit(notes, lane, S.song);
        if (!n) {
          // Puste wciśnięcie nie kosztuje serca, ale przerywa serię.
          if (S.song > 0.15) {
            S.empty += 1;
            S.combo = 0;
            pop(lane, "pusto", "#8a93bb");
            refresh();
          }
          return;
        }
        const j = judgeDelta(n.t - S.song);
        n.done = true;
        S.hits += 1;
        if (j.kind === "perfect") S.perfect += 1;
        S.score += j.points + Math.floor(S.combo / 10) * 10;
        S.combo += 1;
        S.best = Math.max(S.best, S.combo);
        if (!S.gotSeria && S.combo >= 50) { S.gotSeria = true; ctx.achieve("dluga-seria"); }
        pop(lane, j.kind === "perfect" ? "Perfekcja" : "Dobrze", j.kind === "perfect" ? "#ffd166" : "#7bdff2");
        Sound.place(lane + 1);
        refresh();
      }

      function refresh() {
        const per = S.hits ? Math.round((S.perfect / S.hits) * 100) : 0;
        hitEl.set(`${S.hits} z ${notes.length}`, S.hits / notes.length, `w sam środek: ${per}%`);
        runEl.set(`${S.combo}`, null, `serca: ${S.hearts} z 3, wynik ${S.score}`);
      }

      function finish() {
        S.done = true;
        if (S.misses === 0) ctx.achieve("bez-pudla");
        if (S.empty === 0) ctx.achieve("bez-falstartu");
        if (L.key === "hard" && S.perfect >= Math.ceil(notes.length * 0.9)) ctx.achieve("wirtuoz");
        ctx.win(`Trafienia: ${S.hits} z ${notes.length}, najdłuższa seria: ${S.best}.`);
      }

      cv.loop((dt) => {
        if (!ctx.done && !S.done) {
          S.song += dt;
          // Metronom wyznacza rytm; mocniejszy dźwięk co cztery uderzenia.
          while (S.song >= S.nextBeat) {
            S.beats += 1;
            S.nextBeat += beat;
            S.pulse = 1;
            if (S.beats % 4 === 1 && S.beats > 1) Sound.flag(); else Sound.tap();
          }
          for (const n of notes) {
            if (n.done || S.song - n.t <= WIN.good) continue;
            n.done = true;
            n.missed = true;
            S.misses += 1;
            S.combo = 0;
            S.hearts -= 1;
            pop(n.lane, "Pudło", "#ff6b6b");
            Sound.error();
            refresh();
            if (S.hearts <= 0) {
              S.done = true;
              ctx.lose("Serca na wyczerpaniu", `Trafienia: ${S.hits} z ${notes.length}.`);
              break;
            }
          }
          if (!S.done && S.song >= L.duration + 0.8) finish();
          ctx.progress(Math.min(1, S.song / L.duration));
        }
        for (let i = 0; i < LANES; i++) S.press[i] = Math.max(0, S.press[i] - dt);
        S.pulse = Math.max(0, S.pulse - dt * 3);
        for (const p of S.pops) { p.life -= dt; p.y -= dt * 34; }
        S.pops = S.pops.filter((p) => p.life > 0);
        draw();
      });

      function pad(x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }

      function heart(x, y, s, filled) {
        g.beginPath();
        g.moveTo(x, y + s * 0.42);
        g.bezierCurveTo(x - s, y - s * 0.5, x - s * 0.4, y - s * 1.05, x, y - s * 0.42);
        g.bezierCurveTo(x + s * 0.4, y - s * 1.05, x + s, y - s * 0.5, x, y + s * 0.42);
        g.closePath();
        if (filled) {
          g.save();
          g.shadowColor = "#ff6b8a";
          g.shadowBlur = 10;
          g.fillStyle = "#ff6b8a";
          g.fill();
          g.restore();
        } else {
          g.strokeStyle = "rgba(255,255,255,0.32)";
          g.lineWidth = 1.4;
          g.stroke();
        }
      }

      function draw() {
        // tory: delikatne przejście barwy i jaśniejsza linia trafienia
        for (let i = 0; i < LANES; i++) {
          const x = i * LW;
          const grad = g.createLinearGradient(0, 0, 0, HY + 20);
          grad.addColorStop(0, "rgba(255,255,255,0.015)");
          grad.addColorStop(0.72, `rgba(255,255,255,${i % 2 ? 0.05 : 0.085})`);
          grad.addColorStop(1, "rgba(255,255,255,0.02)");
          g.fillStyle = grad;
          g.fillRect(x, 0, LW, HY + 20);
          g.strokeStyle = "rgba(255,255,255,0.09)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + 0.5, 0);
          g.lineTo(x + 0.5, HY + 20);
          g.stroke();
        }
        // takt: cienkie linie przesuwają się razem z nutami
        g.strokeStyle = "rgba(255,255,255,0.055)";
        for (let b = Math.floor(S.song / beat); b * beat < S.song + L.approach; b++) {
          const y = HY - (b * beat - S.song) * SPEED;
          if (y < -6 || y > HY) continue;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(W, y);
          g.stroke();
        }
        // pas trafienia: miękka łuna, która pulsuje w takt
        const band = g.createLinearGradient(0, HY - 26, 0, HY + 26);
        band.addColorStop(0, "rgba(255,255,255,0)");
        band.addColorStop(0.5, `rgba(255,255,255,${0.08 + S.pulse * 0.16})`);
        band.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = band;
        g.fillRect(0, HY - 26, W, 52);
        // pole trafienia
        for (let i = 0; i < LANES; i++) {
          const x = i * LW + 6, y = HY + 4;
          const lit = S.press[i] > 0 ? 0.6 : 0.12 + S.pulse * 0.1;
          g.fillStyle = COLORS[i];
          g.globalAlpha = lit;
          pad(x, y, LW - 12, PH, 12);
          g.fill();
          g.globalAlpha = 1;
          if (S.press[i] > 0) {
            g.save();
            g.shadowColor = COLORS[i];
            g.shadowBlur = 18;
            pad(x, y, LW - 12, PH, 12);
            g.fill();
            g.restore();
          }
          g.lineWidth = 2;
          g.strokeStyle = COLORS[i];
          pad(x + 1, y + 1, LW - 14, PH - 2, 11);
          g.stroke();
          g.fillStyle = "rgba(255,255,255,0.78)";
          g.font = "600 15px system-ui, sans-serif";
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText(KEY_NAMES[i], x + (LW - 12) / 2, y + PH + 17);
        }
        // nuty z łagodną poświatą
        for (const n of notes) {
          if (n.done) continue;
          const y = HY - (n.t - S.song) * SPEED;
          if (y < -44 || y > HY + PH) continue;
          const x = n.lane * LW + 7;
          g.save();
          g.shadowColor = COLORS[n.lane];
          g.shadowBlur = 16;
          g.globalAlpha = 0.3;
          g.fillStyle = COLORS[n.lane];
          pad(x - 4, y - 4, LW - 6, 30, 15);
          g.fill();
          g.globalAlpha = 1;
          pad(x, y, LW - 14, 22, 11);
          g.fill();
          g.restore();
          g.fillStyle = "rgba(255,255,255,0.88)";
          pad(x + 5, y + 4, LW - 24, 7, 3.5);
          g.fill();
        }
        // podsumowania uderzeń
        g.textAlign = "center";
        g.textBaseline = "middle";
        for (const p of S.pops) {
          g.globalAlpha = Math.min(1, p.life * 2);
          g.fillStyle = p.color;
          g.font = "700 15px system-ui, sans-serif";
          g.fillText(p.text, p.lane * LW + LW / 2, p.y);
          g.globalAlpha = 1;
        }
        // seria rośnie w rytm uderzeń
        if (S.combo >= 3) {
          const k = 1 + S.pulse * 0.14;
          g.save();
          g.translate(W / 2, HY * 0.42);
          g.scale(k, k);
          g.fillStyle = "rgba(255,255,255,0.92)";
          g.font = "700 40px system-ui, sans-serif";
          g.fillText(`${S.combo}`, 0, 0);
          g.fillStyle = "rgba(255,255,255,0.5)";
          g.font = "600 13px system-ui, sans-serif";
          g.fillText("seria", 0, 28);
          g.restore();
        }
        // górna winieta, żeby serca były czytelne
        const top = g.createLinearGradient(0, 0, 0, 72);
        top.addColorStop(0, "rgba(0,0,0,0.38)");
        top.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = top;
        g.fillRect(0, 0, W, 72);
        // serca
        for (let i = 0; i < 3; i++) heart(24 + i * 26, 24, 11, i < S.hearts);
        // start
        if (S.song < Math.max(1.2, beat * 2 - 0.6)) {
          g.fillStyle = "rgba(255,255,255,0.85)";
          g.font = "600 20px system-ui, sans-serif";
          g.fillText("Do startu", W / 2, HY * 0.66);
        }
      }

      refresh();
      ctx.progress(0);
    },
  });
}
