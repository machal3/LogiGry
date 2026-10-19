// Piramida: skaczesz po izometrycznej piramidzie w czterech kierunkach i zamalowujesz kafelki,
// na które staniesz. Kule i wróg odbierają życia.
{
  // Płótno: połówki boków kafla, wysokość ścianek oraz zapas nad kaflem i pod nim
  // (sprite'y stoją nad kaflami, a cień schodzi poniżej przedniego rzędu).
  const HW = 12, HH = 6, TH = 5, TOP = 19, BOT = 16;
  const LAYOUT = { HW, HH, TH, TOP, BOT };
  // W rzucie izometrycznym kafel ma czterech sąsiadów stykających się bokiem;
  // na ekranie każdy skok idzie po skosie, więc klawisze kierują na skos.
  const DELTA = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  const DIRS = ["up", "down", "left", "right"];
  const KEYDIR = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };

  const inside = (rows, cols, r, c) => r >= 0 && r < rows && c >= 0 && c < cols;

  // Sąsiad po skosie albo null, gdy za krawędzią piramidy.
  function neighbor(rows, cols, r, c, dir) {
    const [dr, dc] = DELTA[dir];
    return inside(rows, cols, r + dr, c + dc) ? [r + dr, c + dc] : null;
  }

  // Krok wroga: ten sąsiad, który zbliża go do gracza. Null, gdy wróg nie ma gdzie iść.
  function pickStep(rows, cols, r, c, tr, tc) {
    let best = null, bestD = Infinity;
    for (const d of DIRS) {
      const n = neighbor(rows, cols, r, c, d);
      if (!n) continue;
      const dist = Math.abs(n[0] - tr) + Math.abs(n[1] - tc);
      if (dist < bestD) { bestD = dist; best = n; }
    }
    return best;
  }

  // Wejście na kafelek: zwraca nową liczbę wejść, nie więcej niż wymagana.
  const step = (hits, need) => Math.min(need, hits + 1);

  // Dokąd wróg wypycha gracza: o krok dalej w swoim kierunku. Null, gdy tam nie ma kafelka.
  function pushTarget(rows, cols, r, c, dr, dc) {
    return inside(rows, cols, r + dr, c + dc) ? [r + dr, c + dc] : null;
  }

  // Rozmiar płótna dla siatki rows × cols, z zapasem na sprite'y i cień.
  const canvasSize = (rows, cols) => ({
    W: (rows + cols) * HW,
    H: TOP + (rows + cols - 2) * HH + BOT,
  });

  // Pola wymagające dwóch wejść: co czwarty kafelek, jeśli poziom tego chce.
  function needs(rows, cols, chance) {
    const out = [];
    let k = 0;
    for (let i = 0; i < rows * cols; i++) out.push(k++ % 4 === 1 && rnd(100) < chance * 100 ? 2 : 1);
    return out;
  }

  if (typeof module !== "undefined") module.exports = { neighbor, pickStep, pushTarget, step, needs, inside, DELTA, DIRS, LAYOUT, canvasSize };

  if (typeof registerGame !== "undefined") registerGame({
    id: "piramida",
    cat: "zrecznosciowe",
    name: "Piramida",
    author: "DeepSeek V4.1 Flash",
    desc: "Skacz po izometrycznej piramidzie i zamaluj każdy kafelek, zanim dopadną cię kule i wróg.",
    color: "#b45f06",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "#####", ".#.#.", "#...#"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, rows: 4, cols: 4, lives: 3, double: 0, ball: 2.6, foe: 6, foeSpeed: 0.62 },
      { key: "medium", name: "Średni", points: 25, rows: 5, cols: 5, lives: 2, double: 0.3, ball: 2.2, foe: 5, foeSpeed: 0.6 },
      { key: "hard", name: "Trudny", points: 50, rows: 6, cols: 5, lives: 1, double: 0.4, ball: 1.8, foe: 4, foeSpeed: 0.7 },
    ],
    rules: [
      "Skaczesz po kafelkach piramidy w cztery strony. Kafelki leżą w rzucie izometrycznym, więc każdy skok idzie po skosie.",
      "Sterowanie: strzałki lub WASD, na telefonie przyciski w panelu albo przesunięcie palcem po planszy.",
      "Kafelek, na którym staniesz, zamalowuje się. Kafelki z obwódką trzeba odwiedzić dwa razy.",
      "Kula spadająca po skosie zabiera życie.",
      "Fioletowy wróg idzie w twoją stronę. Gdy cię dopadnie, wypycha cię o krok, a na krawędzi piramidy spadasz i tracisz życie.",
      "Zamaluj wszystkie kafelki, zanim skończą się życia.",
    ],
    achievements: [
      { id: "bez-straty", name: "Bez straty", desc: "Wygraj poziom łatwy bez utraty życia.", points: 10 },
      { id: "szybki-skoczek", name: "Szybki skoczek", desc: "Wygraj poziom łatwy w mniej niż 45 sekund.", points: 10 },
      { id: "pewny-krok", name: "Pewny krok", desc: "Wygraj poziom średni bez utraty życia.", points: 25 },
      { id: "mistrz-piramidy", name: "Mistrz piramidy", desc: "Wygraj poziom trudny bez utraty życia.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const rows = L.rows, cols = L.cols, N = rows * cols;
      const { W, H } = canvasSize(rows, cols);
      const cv = canvasGame(board, ctx, W, H, { max: 84, cls: "arcade" });
      const g = cv.g;
      const cx = (r, c) => rows * HW + (c - r) * HW;
      const cy = (r, c) => TOP + (r + c) * HH;

      const need = needs(rows, cols, L.double);
      const total = need.reduce((a, b) => a + b, 0);
      const hits = new Int16Array(N);
      const P = { r: 0, c: 0, fr: 0, fc: 0, t: 1, queued: null };
      // Gracz zaczyna na kafelku (0,0), więc jest on od razu zamalowany.
      hits[0] = step(0, need[0]);
      const S = { lives: L.lives, balls: [], ballT: L.ball, foe: null, foeT: L.foe, dying: 0, cause: "", done: false, colored: hits[0] };

      const leftEl = statBlock(ctx, "Zamalowane", { meter: true });
      const liveEl = statBlock(ctx, "Życia", { small: true });
      if (need.some((n) => n > 1)) {
        ctx.panel.append(panelBlock("", el("p", "pi-note", "Kafelek z obwódką trzeba odwiedzić dwa razy.")));
      }
      const tkeys = { onTap: (k) => hop(KEYDIR[k]) };
      touchPad(ctx, tkeys, [
        ["arrowleft", "W lewo", "i-left"],
        ["arrowup", "W górę", "i-up"],
        ["arrowdown", "W dół", "i-down"],
        ["arrowright", "W prawo", "i-right"],
      ]);

      ctx.on(document, "keydown", (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
        if (e.target.closest?.("input, textarea, select")) return;
        const dir = KEYDIR[e.key.toLowerCase()];
        if (!dir) return;
        e.preventDefault();
        hop(dir);
      });
      let from = null;
      ctx.on(cv.cv, "pointerdown", (e) => { from = [e.clientX, e.clientY]; });
      ctx.on(document, "pointerup", (e) => {
        if (!from) return;
        const dx = e.clientX - from[0], dy = e.clientY - from[1];
        from = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        hop(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      });

      function hop(dir) {
        if (ctx.done || S.done || S.dying) return;
        if (P.t < 1) { P.queued = dir; return; }
        const n = neighbor(rows, cols, P.r, P.c, dir);
        if (!n) { Sound.error(); return; }
        P.fr = P.r; P.fc = P.c; P.r = n[0]; P.c = n[1]; P.t = 0;
        Sound.tap();
      }

      function arrive() {
        const i = P.r * cols + P.c;
        if (hits[i] < need[i]) {
          const before = hits[i];
          hits[i] = step(hits[i], need[i]);
          S.colored += hits[i] - before;
          if (hits[i] >= need[i]) Sound.place(1 + (S.colored % 5));
          else Sound.tap();
        }
        leftEl.set(`${S.colored} z ${total}`, S.colored / total, "");
        ctx.progress(S.colored / total);
        if (S.colored >= total) return finish();
        if (S.balls.some((b) => b.r === P.r && b.c === P.c)) return hurt("Kula trafiła cię");
        const jump = P.queued;
        P.queued = null;
        if (jump) hop(jump);
      }

      function hurt(cause) {
        if (S.dying > 0) return;
        S.lives -= 1;
        S.dying = 0.9;
        S.cause = cause;
        Sound.error();
        liveEl.set(`${S.lives} z ${L.lives}`, null, "");
        ctx.toast(cause);
      }

      function respawn() {
        P.r = P.fr = 0; P.c = P.fc = 0; P.t = 1; P.queued = null;
        S.dying = 0;
        S.balls.length = 0;
        S.ballT = L.ball;
        S.foe = null;
        S.foeT = L.foe;
      }

      function spawnBall() {
        const c = rnd(cols);
        const dc = c === 0 ? 1 : c === cols - 1 ? -1 : (rnd(2) ? 1 : -1);
        S.balls.push({ r: 0, c, fr: 0, fc: c, dir: [1, dc], t: 1, dur: 0.34 });
      }

      function moveBall(b) {
        b.fr = b.r; b.fc = b.c;
        b.r += b.dir[0]; b.c += b.dir[1];
        b.t = 0;
        if (!inside(rows, cols, b.r, b.c)) { b.dead = true; return; }
        if (b.r === P.r && b.c === P.c) hurt("Kula trafiła cię");
      }

      function spawnFoe() {
        S.foe = { r: rows - 1, c: cols - 1, fr: rows - 1, fc: cols - 1, t: 1, timer: L.foeSpeed };
      }

      // Wróg rusza się raz na L.foeSpeed sekund; skoku nie przerywamy w połowie.
      function stepFoe(dt) {
        const f = S.foe;
        f.timer -= dt;
        if (f.timer > 0) return;
        f.timer = L.foeSpeed;
        if (f.t < 1) return;
        const n = pickStep(rows, cols, f.r, f.c, P.r, P.c);
        if (!n) return;
        f.fr = f.r; f.fc = f.c; f.r = n[0]; f.c = n[1]; f.t = 0;
      }

      // Wróg wchodzi na pole gracza i wypycha go przed siebie. Gdy przed graczem
      // nie ma już kafelka, gracz spada z piramidy i traci życie.
      function foeArrive() {
        const f = S.foe;
        if (!f || S.dying) return;
        if (f.r !== P.r || f.c !== P.c) return;
        const dr = f.r - f.fr, dc = f.c - f.fc;
        if (!dr && !dc) return;
        const t = pushTarget(rows, cols, P.r, P.c, dr, dc);
        if (!t) return hurt("Wróg zepchnął cię z piramidy");
        P.fr = P.r; P.fc = P.c;
        P.r = t[0]; P.c = t[1];
        P.t = 0; P.queued = null;
        Sound.tap();
        ctx.toast("Wróg cię popchnął");
      }

      function finish() {
        if (S.lives === L.lives && L.key === "easy") ctx.achieve("bez-straty");
        if (S.lives === L.lives && L.key === "medium") ctx.achieve("pewny-krok");
        if (S.lives === L.lives && L.key === "hard") ctx.achieve("mistrz-piramidy");
        if (L.key === "easy" && ctx.time < 45) ctx.achieve("szybki-skoczek");
        S.done = true;
        ctx.win(`Zamalowane kafelki: ${total}. Życia: ${S.lives} z ${L.lives}.`);
      }

      cv.loop((dt) => {
        if (!ctx.done && !S.done) {
          if (S.dying > 0) {
            S.dying -= dt;
            if (S.dying <= 0) {
              if (S.lives <= 0) { S.done = true; ctx.lose("Koniec życia", `${S.cause}. Zamalowane kafelki: ${S.colored} z ${total}.`); }
              else respawn();
            }
          } else {
            if (P.t < 1) { P.t = Math.min(1, P.t + dt / 0.17); if (P.t >= 1) arrive(); }
            S.ballT -= dt;
            if (S.ballT <= 0) { S.ballT = L.ball; spawnBall(); }
            for (const b of S.balls) { b.t = Math.min(1, b.t + dt / b.dur); if (b.t >= 1 && !b.dead) moveBall(b); }
            S.balls = S.balls.filter((b) => !b.dead);
            if (!S.foe) {
              S.foeT -= dt;
              if (S.foeT <= 0) spawnFoe();
            } else {
              stepFoe(dt);
            }
            if (S.foe && S.foe.t < 1) {
              S.foe.t = Math.min(1, S.foe.t + dt / 0.3);
              if (S.foe.t >= 1) foeArrive();
            }
          }
        }
        draw();
      });

      const PX = (a) => cx(a.fr + (a.r - a.fr) * Math.min(1, a.t), a.fc + (a.c - a.fc) * Math.min(1, a.t));
      const PY = (a) => cy(a.fr + (a.r - a.fr) * Math.min(1, a.t), a.fc + (a.c - a.fc) * Math.min(1, a.t));

      function face(x, y, top, left, right, ring) {
        // cień rzucany pod kaflem, żeby piramida miała grunt
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.beginPath();
        g.moveTo(x - HW, y + TH);
        g.lineTo(x, y + HH + TH);
        g.lineTo(x + HW, y + TH);
        g.lineTo(x + HW, y + TH + 3.2);
        g.lineTo(x, y + HH + TH + 3.2);
        g.lineTo(x - HW, y + TH + 3.2);
        g.closePath();
        g.fill();
        // ścianki boczne
        g.fillStyle = left;
        g.beginPath(); g.moveTo(x - HW, y); g.lineTo(x, y + HH); g.lineTo(x, y + HH + TH); g.lineTo(x - HW, y + TH); g.closePath(); g.fill();
        g.fillStyle = right;
        g.beginPath(); g.moveTo(x + HW, y); g.lineTo(x, y + HH); g.lineTo(x, y + HH + TH); g.lineTo(x + HW, y + TH); g.closePath(); g.fill();
        // górna płaszczyzna
        g.fillStyle = top;
        g.beginPath(); g.moveTo(x, y - HH); g.lineTo(x + HW, y); g.lineTo(x, y + HH); g.lineTo(x - HW, y); g.closePath(); g.fill();
        // połysk na górze i delikatny kontur całości
        const shine = g.createLinearGradient(x, y - HH, x, y + HH);
        shine.addColorStop(0, "rgba(255,255,255,0.20)");
        shine.addColorStop(0.55, "rgba(255,255,255,0)");
        g.fillStyle = shine;
        g.beginPath(); g.moveTo(x, y - HH); g.lineTo(x + HW, y); g.lineTo(x, y + HH); g.lineTo(x - HW, y); g.closePath(); g.fill();
        g.strokeStyle = "rgba(0,0,0,0.24)";
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(x, y - HH); g.lineTo(x + HW, y); g.lineTo(x, y + HH); g.lineTo(x - HW, y); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(x - HW, y); g.lineTo(x, y + HH); g.lineTo(x + HW, y); g.stroke();
        if (ring) {
          g.strokeStyle = "rgba(255,255,255,0.6)";
          g.lineWidth = 0.9;
          g.beginPath();
          g.moveTo(x - HW * 0.5, y);
          g.lineTo(x, y + HH * 0.5);
          g.lineTo(x + HW * 0.5, y);
          g.lineTo(x, y - HH * 0.5);
          g.closePath();
          g.stroke();
        }
      }

      function draw() {
        const dying = S.dying > 0 ? 1 - S.dying / 0.9 : 0;
        // tło: chłodna noc i łuna bijąca od piramidy
        const sky = g.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, "#0a0e1c");
        sky.addColorStop(0.55, "#121a36");
        sky.addColorStop(1, "#0a0e1c");
        g.fillStyle = sky;
        g.fillRect(0, 0, W, H);
        const halo = g.createRadialGradient(W / 2, H * 0.6, 4, W / 2, H * 0.6, W * 0.56);
        halo.addColorStop(0, "rgba(120,160,255,0.16)");
        halo.addColorStop(1, "rgba(120,160,255,0)");
        g.fillStyle = halo;
        g.fillRect(0, 0, W, H);
        // kafelki malowane od tyłu do przodu, więc przednie zasłaniają tylne
        for (let sum = 0; sum <= rows + cols - 2; sum++) {
          for (let r = Math.max(0, sum - cols + 1); r <= Math.min(rows - 1, sum); r++) {
            const c = sum - r;
            const i = r * cols + c;
            const done = hits[i] >= need[i];
            const hue = (r * 34 + c * 21) % 360;
            const top = done ? `hsl(${hue},72%,57%)` : hits[i] > 0 ? "#6d7799" : "#39415a";
            const left = done ? `hsl(${hue},72%,42%)` : hits[i] > 0 ? "#535c7c" : "#2b3247";
            const right = done ? `hsl(${hue},72%,32%)` : hits[i] > 0 ? "#3f4763" : "#202535";
            face(cx(r, c), cy(r, c), top, left, right, !done && need[i] === 2);
          }
        }
        // postacie w kolejności głębi, żeby przednie kafelki zasłaniały tylne
        const ents = [];
        for (const b of S.balls) ents.push({ d: b.r + b.c, k: 0, a: b });
        if (S.foe) ents.push({ d: S.foe.r + S.foe.c, k: 1, a: S.foe });
        if (!S.done) ents.push({ d: P.r + P.c, k: 2, a: P });
        ents.sort((a, b) => a.d - b.d || a.k - b.k);
        for (const e of ents) {
          const k = Math.sin(Math.PI * Math.min(1, e.a.t));
          if (e.k === 0) ball(PX(e.a), PY(e.a), k);
          else if (e.k === 1) foe(PX(e.a), PY(e.a), k);
          else player(PX(e.a), PY(e.a) + (dying ? dying * 20 : 0), k);
        }
        // czerwony błysk tuż po stracie życia
        const flash = S.dying > 0 ? Math.max(0, 1 - dying) : 0;
        if (flash) {
          g.fillStyle = `rgba(200,40,60,${0.3 * flash})`;
          g.fillRect(0, 0, W, H);
        }
      }

      function ball(x, y, k) {
        const yoff = -k * 8;
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.beginPath(); g.ellipse(x, y + 2, 5, 2.6, 0, 0, Math.PI * 2); g.fill();
        const grd = g.createRadialGradient(x - 1.8, y - 8.6 + yoff, 0.6, x, y - 6 + yoff, 6.4);
        grd.addColorStop(0, "#ff9aa0");
        grd.addColorStop(1, "#c1272d");
        g.save();
        g.shadowColor = "rgba(229,56,59,0.6)";
        g.shadowBlur = 7;
        g.fillStyle = grd;
        g.beginPath(); g.ellipse(x, y - 6 + yoff, 5, 6, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        g.strokeStyle = "#7d1b1e"; g.lineWidth = 1; g.stroke();
        g.fillStyle = "rgba(255,255,255,0.8)";
        g.beginPath(); g.ellipse(x - 1.6, y - 8.4 + yoff, 1.5, 1.9, -0.4, 0, Math.PI * 2); g.fill();
      }

      function foe(x, y, k) {
        const yoff = -k * 7;
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.beginPath(); g.ellipse(x, y + 2, 6, 3, 0, 0, Math.PI * 2); g.fill();
        const py = y - 7 + yoff;
        g.save();
        g.shadowColor = "rgba(157,78,221,0.55)";
        g.shadowBlur = 8;
        g.fillStyle = "#9d4edd";
        g.beginPath();
        g.moveTo(x, py - 7); g.lineTo(x + 6.5, py); g.lineTo(x, py + 7); g.lineTo(x - 6.5, py);
        g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = "#4c1d95"; g.lineWidth = 1; g.stroke();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x - 2.2, py - 1.2, 1.7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 2.2, py - 1.2, 1.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2b0b45";
        g.beginPath(); g.arc(x - 2, py - 1, 0.9, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 2, py - 1, 0.9, 0, Math.PI * 2); g.fill();
      }

      function player(x, y, k) {
        const yoff = -k * 7;
        // po stracie życia gracz spada i blednie, więc nie ucina go krawędź płótna
        const fade = S.dying > 0 ? Math.max(0, S.dying / 0.9) : 1;
        g.save();
        g.globalAlpha = fade;
        if (S.dying <= 0) {
          g.fillStyle = "rgba(0,0,0,0.32)";
          g.beginPath(); g.ellipse(x, y + 2, 6, 3, 0, 0, Math.PI * 2); g.fill();
        }
        const py = y - 7 + yoff;
        const body = g.createRadialGradient(x - 2, py - 2.4, 0.8, x, py, 7.2);
        body.addColorStop(0, "#ffd166");
        body.addColorStop(1, "#e08a00");
        g.save();
        if (S.dying <= 0) { g.shadowColor = "rgba(255,183,3,0.5)"; g.shadowBlur = 8; }
        g.fillStyle = body;
        g.beginPath(); g.ellipse(x, py, 6, 6.6, 0, 0, Math.PI * 2); g.fill();
        g.restore();
        g.strokeStyle = "#8a5200"; g.lineWidth = 1; g.stroke();
        g.fillStyle = "#fff";
        g.beginPath(); g.arc(x - 2.2, py - 1.8, 1.7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 2.2, py - 1.8, 1.7, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#1a1206";
        g.beginPath(); g.arc(x - 2.1, py - 1.6, 0.85, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 2.3, py - 1.6, 0.85, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#e07a00";
        g.beginPath(); g.moveTo(x, py + 1.4); g.lineTo(x + 2.6, py + 3.6); g.lineTo(x - 2.6, py + 3.6); g.closePath(); g.fill();
        g.restore();
      }

      liveEl.set(`${S.lives} z ${L.lives}`, null, "");
      leftEl.set(`${S.colored} z ${total}`, S.colored / total, "");
      ctx.progress(S.colored / total);
    },
  });
}
