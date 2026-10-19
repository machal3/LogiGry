// Tunel: lot przez rurę w perspektywie. Gracz siedzi na dole, a świat obraca się wokół niego.
// Rzędy przeszkód zostawiają przejście; kolejne przejście jest zawsze osiągalne przy maksymalnej prędkości.
{
  // --- Logika bez DOM ---
  const N = 10, LANE = (Math.PI * 2) / N, TURN = 5.2, NEAR = 2;
  const wrap = (k) => ((k % N) + N) % N;

  // Rzędy: z (pozycja w tunelu), blocked (tablica N wartości), crystals (pasy). Bezpieczna ścieżka przechodzi przez wszystkie.
  function generate({ length, spacing, gap, maxSpeed, extra }) {
    const rows = [];
    let safe = rnd(N);
    for (let z = 30; z < length - 10; ) {
      const prog = z / length;
      const sp = spacing * (1 - 0.3 * prog);
      // zasięg skrętu między rzędami przy najwyższej prędkości, z zapasem
      const reach = Math.max(1, Math.floor(((TURN * sp) / maxSpeed / LANE) * 0.6));
      safe = wrap(safe + rnd(reach * 2 + 1) - reach);
      const blocked = new Array(N).fill(1);
      const gw = Math.max(1, gap - (prog > 0.6 ? 1 : 0));
      for (let k = 0; k < gw; k++) blocked[wrap(safe + k - Math.floor(gw / 2))] = 0;
      // dodatkowe dziury, żeby rzędy wyglądały różnie
      for (let k = 0; k < N; k++) if (Math.random() < extra) blocked[k] = 0;
      // rząd w kształcie pojedynczych bloków zamiast pełnej ściany
      if (Math.random() < 0.3) for (let k = 0; k < N; k++) if (k % 2 && blocked[k] && wrap(k - safe) > 1 && wrap(safe - k) > 1) blocked[k] = 0;
      const crystals = Math.random() < 0.6 ? [safe] : [];
      rows.push({ z, blocked, crystals, safe });
      z += sp;
    }
    return rows;
  }
  // Czy statek o szerokości kątowej hw na kącie a zahacza zablokowany pas.
  function hits(row, a, hw) {
    for (let k = 0; k < N; k++) {
      if (!row.blocked[k]) continue;
      const c = (k + 0.5) * LANE;
      let d = Math.abs(((a - c) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      if (d < LANE / 2 + hw) return true;
    }
    return false;
  }

  if (typeof module !== "undefined") module.exports = { generate, hits, N, LANE, TURN, wrap };

  if (typeof registerGame !== "undefined") registerGame({
    id: "tunel",
    cat: "akcja",
    name: "Tunel",
    author: "Claude Opus 5.5",
    desc: "Pędź przez trójwymiarowy tunel, obracając się wokół jego ścian, by omijać przeszkody i zbierać kryształy.",
    color: "#0ca5b5",
    ink: "#ffffff",
    glyph: ["#####", "#...#", "#.#.#", "#...#", "#####"],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, length: 800, spacing: 8, gap: 4, speed: 10, maxSpeed: 17, accel: 0.18, extra: 0.15, shields: 3 },
      { key: "medium", name: "Średni", points: 25, length: 1200, spacing: 7, gap: 3, speed: 12, maxSpeed: 21, accel: 0.2, extra: 0.1, shields: 3 },
      { key: "hard", name: "Trudny", points: 50, length: 1600, spacing: 6.2, gap: 2, speed: 14, maxSpeed: 25, accel: 0.22, extra: 0.06, shields: 2 },
    ],
    rules: [
      "Strzałki w lewo i w prawo (albo A i D) obracają cię wokół ścian tunelu. Na ekranie dotykowym trzymaj lewą lub prawą połowę planszy.",
      "Omijaj ściany i bloki. Zderzenie zabiera osłonę, a bez osłon lot się kończy.",
      "Zbieraj kryształy. Każde 10 kryształów odnawia jedną osłonę.",
      "Wygrywasz, gdy dolecisz do końca tunelu. Prędkość rośnie z każdą sekundą.",
    ],
    achievements: [
      { id: "zbieracz", name: "Zbieracz", desc: "Zbierz 20 kryształów w jednym locie.", points: 10 },
      { id: "seria", name: "Kryształowa ścieżka", desc: "Zbierz 12 kryształów z rzędu, nie omijając żadnego.", points: 25 },
      { id: "czysto", name: "Bez zadrapania", desc: "Ukończ średni lub trudny poziom bez utraty osłony.", points: 25 },
      { id: "hiper", name: "Hiperprędkość", desc: "Ukończ trudny poziom bez utraty osłony.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 100, { max: 80, cls: "neon" });
      const { g } = cv;
      const rows = generate(L);
      // gracz zaczyna nad bezpiecznym pasem pierwszego rzędu
      const s = { a: (rows[0].safe + 0.5) * LANE, pos: 0, speed: L.speed, shields: L.shields, lost: 0, crystals: 0, streak: 0, inv: 0, flash: 0, t: 0, parts: [], finished: 0, next: 0 };
      const HW = 0.12;

      const distEl = statBlock(ctx, "Dystans", { meter: true });
      const shieldEl = statBlock(ctx, "Osłony", { small: true });
      const crystalEl = statBlock(ctx, "Kryształy", { small: true });
      const keys = heldKeys(ctx);
      let touch = 0;
      ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); cv.cv.setPointerCapture?.(e.pointerId); touch = cv.at(e)[0] < 50 ? -1 : 1; });
      ctx.on(cv.cv, "pointermove", (e) => { if (touch) touch = cv.at(e)[0] < 50 ? -1 : 1; });
      for (const ev of ["pointerup", "pointercancel"]) ctx.on(cv.cv, ev, () => { touch = 0; });

      cv.loop((dt) => {
        s.t += dt;
        if (!ctx.done && !s.finished) update(dt);
        else if (s.finished) { s.finished += dt; s.pos += s.speed * 2 * dt; if (s.finished > 1.2 && !ctx.done) win(); }
        draw(dt);
      });

      function update(dt) {
        const dir = (keys.arrowleft || keys.a ? -1 : 0) + (keys.arrowright || keys.d ? 1 : 0) || touch;
        s.vel = (s.vel || 0) + (dir * TURN - (s.vel || 0)) * Math.min(1, dt * 14);
        s.a += s.vel * dt;
        s.speed = Math.min(L.maxSpeed, s.speed + L.accel * dt);
        const before = s.pos;
        s.pos += s.speed * dt;
        s.inv = Math.max(0, s.inv - dt);
        // rzędy, które właśnie mijają statek
        while (s.next < rows.length && rows[s.next].z - NEAR <= s.pos) {
          const r = rows[s.next++];
          if (r.z - NEAR <= before) continue;
          const lane = Math.floor((((s.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / LANE);
          if (r.crystals.length) {
            if (r.crystals.includes(lane)) {
              r.crystals = [];
              s.crystals++;
              s.streak++;
              Sound.place(1 + (s.crystals % 9));
              burst("#7df9ff", 10);
              if (s.crystals % 10 === 0 && s.shields < L.shields) { s.shields++; ctx.toast("Osłona odnowiona"); Sound.line(); }
              if (s.crystals >= 20) ctx.achieve("zbieracz");
              if (s.streak >= 12) ctx.achieve("seria");
            } else s.streak = 0;
          }
          if (!s.inv && hits(r, s.a, HW)) {
            s.shields--;
            s.lost++;
            s.inv = 1.2;
            s.flash = 0.4;
            s.speed = Math.max(L.speed, s.speed * 0.8);
            Sound.error();
            burst("#ff4fd8", 26);
            if (s.shields <= 0) return ctx.lose("Rozbity statek", `Przeleciano ${Math.round((s.pos / L.length) * 100)}% tunelu.`);
          }
        }
        if (s.pos >= L.length) { s.finished = 0.01; Sound.line(); }
        render();
      }
      function win() {
        if (!s.lost && L.key !== "easy") ctx.achieve("czysto");
        if (!s.lost && L.key === "hard") ctx.achieve("hiper");
        ctx.win(`Kryształy: ${s.crystals}. Utracone osłony: ${s.lost}.`);
      }
      function burst(c, n) {
        for (let k = 0; k < n; k++) {
          const an = Math.random() * Math.PI * 2, v = 10 + Math.random() * 30;
          s.parts.push({ x: 50, y: 82, vx: Math.cos(an) * v, vy: Math.sin(an) * v, life: 0.5 + Math.random() * 0.4, c });
        }
      }

      // --- Rysowanie: rzut perspektywiczny pierścieni ---
      const F = 62;
      // łagodne zakręty: przesunięcie rośnie z kwadratem odległości
      const curve = (z) => [Math.sin(s.pos * 0.013 + 1) * 0.006 * z * z, Math.sin(s.pos * 0.009) * 0.004 * z * z - 0.003 * z * z];
      function proj(ang, r, z) {
        const rel = ang - s.a;
        const x = Math.sin(rel) * r, y = Math.cos(rel) * r;
        const [ox, oy] = curve(z);
        return [50 + ((x + ox) * F) / z, 50 + ((y + oy - 0.25) * F) / z];
      }
      function quad(pts, fill) {
        g.fillStyle = fill;
        g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      }
      function draw(dt) {
        const far = 34;
        // tło: poświata w głębi
        const [vx, vy] = proj(s.a + Math.PI, 0, far);
        const bg = g.createRadialGradient(vx, vy, 0, vx, vy, 60);
        bg.addColorStop(0, "rgba(120,255,250,0.25)"); bg.addColorStop(0.3, "rgba(60,40,140,0.15)"); bg.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = bg; g.fillRect(0, 0, 100, 100);
        // ściany tunelu w paskach, od dalekich do bliskich
        const step = 1, z0 = Math.ceil((s.pos + 0.01) / step) * step;
        for (let zz = z0 + far; zz >= z0 - step; zz -= step) {
          const za = zz - s.pos, zb = za + step;
          if (zb <= 0.6) continue;
          const na = Math.max(0.6, za);
          const fog = Math.max(0, 1 - zb / far);
          for (let k = 0; k < N; k++) {
            const a0 = k * LANE, a1 = (k + 1) * LANE;
            const stripe = (Math.round(zz / step) + k) % 2;
            const lane = k % 2 ? 1 : 0.82;
            const lit = (0.45 + 0.55 * Math.cos((k + 0.5) * LANE - s.a)) * (0.25 + 0.75 * fog) * lane * (stripe ? 1 : 0.86);
            quad([proj(a0, 1, na), proj(a1, 1, na), proj(a1, 1, zb), proj(a0, 1, zb)], `rgb(${14 + 40 * lit | 0},${10 + 34 * lit | 0},${34 + 110 * lit | 0})`);
          }
          // świecące linie pierścieni
          if (Math.round(zz) % 4) continue;
          g.strokeStyle = `rgba(80,240,255,${0.1 + 0.6 * fog})`;
          g.lineWidth = Math.max(0.15, 1.6 / zb);
          g.beginPath();
          for (let k = 0; k <= N; k++) { const [x, y] = proj(k * LANE, 1, zb); k ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
        // linie pasów wzdłuż tunelu
        g.strokeStyle = "rgba(120,220,255,0.3)";
        g.lineWidth = 0.35;
        for (let k = 0; k < N; k++) {
          g.beginPath();
          for (let z = far; z >= 0.8; z -= 2) { const [x, y] = proj(k * LANE, 1, z); z === far ? g.moveTo(x, y) : g.lineTo(x, y); }
          g.stroke();
        }
        // przeszkody i kryształy od dalekich
        for (let i = rows.length - 1; i >= s.next - 1 && i >= 0; i--) {
          const r = rows[i], z = r.z - s.pos;
          if (z > far || z < 0.7) continue;
          const fog = Math.max(0.15, 1 - z / far);
          for (let k = 0; k < N; k++) {
            if (!r.blocked[k]) continue;
            const a0 = k * LANE + 0.02, a1 = (k + 1) * LANE - 0.02, d = 0.6, hgt = 0.42;
            const zf = Math.max(0.7, z), zb = z + d;
            // bok wewnętrzny (wierzch bloku), potem czoło
            quad([proj(a0, 1 - hgt, zf), proj(a1, 1 - hgt, zf), proj(a1, 1 - hgt, zb), proj(a0, 1 - hgt, zb)], `rgba(${120 * fog | 0},${30 * fog | 0},${130 * fog | 0},1)`);
            const front = [proj(a0, 1, zf), proj(a1, 1, zf), proj(a1, 1 - hgt, zf), proj(a0, 1 - hgt, zf)];
            const gr = g.createLinearGradient(front[0][0], front[0][1], front[2][0], front[2][1]);
            gr.addColorStop(0, `rgba(255,${80 + 60 * fog | 0},230,${0.5 + 0.5 * fog})`); gr.addColorStop(1, `rgba(170,40,200,${0.5 + 0.5 * fog})`);
            quad(front, gr);
            g.strokeStyle = `rgba(255,190,250,${fog})`; g.lineWidth = Math.max(0.2, 1.2 / zf);
            g.beginPath(); front.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
          }
          for (const k of r.crystals) {
            const [x, y] = proj((k + 0.5) * LANE, 0.8, Math.max(0.7, z));
            const sz = 5 / Math.max(0.7, z), sp = Math.sin(s.t * 6 + i);
            g.fillStyle = `rgba(125,249,255,${fog})`;
            g.beginPath(); g.moveTo(x, y - sz * 1.3); g.lineTo(x + sz * (0.6 + 0.3 * sp), y); g.lineTo(x, y + sz * 1.3); g.lineTo(x - sz * (0.6 + 0.3 * sp), y); g.closePath(); g.fill();
            g.fillStyle = `rgba(255,255,255,${0.7 * fog})`;
            g.beginPath(); g.moveTo(x, y - sz * 1.1); g.lineTo(x + sz * 0.25, y); g.lineTo(x, y + sz * 0.2); g.fill();
          }
        }
        // meta
        const zEnd = L.length - s.pos;
        if (zEnd < far && zEnd > 0.7) {
          g.strokeStyle = `rgba(255,255,255,${1 - zEnd / far})`; g.lineWidth = Math.max(0.5, 3 / zEnd);
          g.beginPath(); for (let k = 0; k <= 40; k++) { const [x, y] = proj((k / 40) * Math.PI * 2, 1, zEnd); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        }
        // smugi prędkości
        g.strokeStyle = "rgba(200,255,255,0.25)"; g.lineWidth = 0.25;
        for (let k = 0; k < 14; k++) {
          const an = k * 2.7 + s.t, z1 = 6 - ((s.pos * 0.6 + k * 3.1) % 6);
          const [x1, y1] = proj(an, 0.85, Math.max(0.8, z1 + 1.2)), [x2, y2] = proj(an, 0.85, Math.max(0.8, z1));
          g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        }
        ship(dt);
        for (const p of s.parts) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
          g.globalAlpha = Math.max(0, p.life * 1.5); g.fillStyle = p.c; g.fillRect(p.x, p.y, 0.8, 0.8);
        }
        g.globalAlpha = 1;
        s.parts = s.parts.filter((p) => p.life > 0);
        if (s.flash > 0) { s.flash -= dt; g.fillStyle = `rgba(255,60,160,${s.flash})`; g.fillRect(0, 0, 100, 100); }
        if (s.finished) { g.fillStyle = `rgba(255,255,255,${Math.min(1, s.finished)})`; g.fillRect(0, 0, 100, 100); }
      }
      function ship(dt) {
        if (s.inv > 0 && Math.floor(s.inv * 12) % 2) return;
        const [x, y] = proj(s.a, 0.92, NEAR);
        const tilt = (s.vel || 0) * 0.04;
        g.save();
        g.translate(x, y - 2);
        g.rotate(tilt);
        // płomień
        const fl = 3 + Math.random() * 2;
        const fg = g.createLinearGradient(0, 2, 0, 2 + fl);
        fg.addColorStop(0, "rgba(255,255,255,0.95)"); fg.addColorStop(0.4, "rgba(80,240,255,0.8)"); fg.addColorStop(1, "rgba(80,240,255,0)");
        g.fillStyle = fg;
        g.beginPath(); g.moveTo(-2, 1.5); g.lineTo(0, 2 + fl); g.lineTo(2, 1.5); g.fill();
        // kadłub
        const hg = g.createLinearGradient(0, -6, 0, 2);
        hg.addColorStop(0, "#e9fbff"); hg.addColorStop(1, "#3bb7c9");
        g.fillStyle = hg;
        g.beginPath(); g.moveTo(0, -6); g.lineTo(6, 2); g.lineTo(2, 1); g.lineTo(0, 2.2); g.lineTo(-2, 1); g.lineTo(-6, 2); g.closePath(); g.fill();
        g.fillStyle = "#123b52";
        g.beginPath(); g.moveTo(0, -3.6); g.lineTo(1.2, -0.5); g.lineTo(-1.2, -0.5); g.fill();
        g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 0.3;
        g.beginPath(); g.moveTo(0, -6); g.lineTo(6, 2); g.moveTo(0, -6); g.lineTo(-6, 2); g.stroke();
        g.restore();
      }

      function render() {
        const f = Math.min(1, s.pos / L.length);
        distEl.set(`${Math.round(f * 100)}%`, f, `Prędkość ${Math.round(s.speed * 10)}`);
        shieldEl.set(`${s.shields} z ${L.shields}`);
        crystalEl.set(s.crystals, null, s.streak > 2 ? `Seria: ${s.streak}` : "");
        ctx.progress(f);
      }
      render();
    },
  });
}
