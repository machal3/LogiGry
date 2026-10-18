// Stos: płyta sunie nad wieżą, kliknięcie ją zatrzymuje. Wystająca część odpada, a kolejna płyta ma już tylko to, co zostało.
// Świat: płyty w płaszczyźnie (x, z), wysokość y. Widok izometryczny.
const Stack = { last: null };

if (typeof module !== "undefined") module.exports = Stack;


if (typeof GAMES !== "undefined") Object.assign(GAMES.find((g) => g.id === "stos"), {
  levels: [
    { key: "easy", name: "Łatwy", points: 10, target: 15, speed: 26, size: 34 },
    { key: "medium", name: "Średni", points: 25, target: 22, speed: 34, size: 30 },
    { key: "hard", name: "Trudny", points: 50, target: 30, speed: 42, size: 28 },
  ],
  rules: [
    "Płyta przesuwa się nad wieżą. Kliknij, dotknij albo naciśnij spację, żeby ją zatrzymać.",
    "Część, która wystaje poza płytę niżej, odpada. Idealne trafienie nic nie ucina, a trzy idealne pod rząd lekko poszerzają płytę.",
    "Zbuduj wieżę wymaganej wysokości. Każde piętro przyspiesza ruch.",
  ],
  mount(board, ctx) {
    const { target, speed, size } = ctx.level;
    const W = 100, H = 130, TH = 4.2; // grubość płyty
    const cv = canvasGame(board, ctx, W, H, { max: 86 });
    const { g } = cv;
    const base = { x: 0, z: 0, w: size, d: size };
    const s = { tower: [{ ...base }], moving: null, axis: "x", dir: 1, perfect: 0, debris: [], cam: 0, over: false };
    Stack.last = s;
    // kolor piętra k; dl przyciemnia ściany boczne
    const hue = (k, dl = 0) => `hsl(${(28 + k * 9) % 360} 78% ${58 - (k % 2) * 4 - dl}%)`;
    const heightEl = statBlock(ctx, "Piętra", { meter: true });
    ctx.toast("Kliknij albo naciśnij spację, żeby zatrzymać płytę");

    function spawn() {
      const top = s.tower[s.tower.length - 1];
      s.axis = s.tower.length % 2 ? "x" : "z";
      s.moving = { ...top, [s.axis]: -50 };
      s.dir = 1;
    }
    function drop() {
      if (ctx.done || !s.moving) return;
      const top = s.tower[s.tower.length - 1], m = s.moving;
      const ax = s.axis, len = ax === "x" ? "w" : "d";
      const delta = m[ax] - top[ax];
      const over = Math.abs(delta);
      if (over >= top[len]) {
        // całkiem obok: płyta spada
        s.debris.push({ ...m, y: s.tower.length, vy: 0, k: s.tower.length });
        s.moving = null;
        Sound.lose();
        return ctx.lose("Pudło", `Wieża ma ${s.tower.length - 1} ${plural(s.tower.length - 1, "piętro", "piętra", "pięter")}.`);
      }
      let placed;
      if (over < 1.2) {
        // idealnie: bez cięcia; po trzech z rzędu płyta rośnie
        s.perfect++;
        placed = { ...top };
        if (s.perfect >= 3) { placed[len] = Math.min(size, placed[len] + 2); }
        Sound.line();
      } else {
        s.perfect = 0;
        const keep = top[len] - over;
        placed = { ...m, [len]: keep, [ax]: top[ax] + delta / 2 };
        // odcięty kawałek leży tuż za krawędzią zostawionej płyty
        const cut = { ...m, [len]: over, [ax]: placed[ax] + Math.sign(delta) * (keep / 2 + over / 2) };
        s.debris.push({ ...cut, y: s.tower.length, vy: 0, k: s.tower.length });
        Sound.place(1 + (s.tower.length % 9));
      }
      s.tower.push(placed);
      s.moving = null;
      render();
      if (s.tower.length - 1 >= target) return ctx.win(s.perfect ? "Ostatnie trafienie idealne!" : "");
      spawn();
    }
    ctx.on(cv.cv, "pointerdown", (e) => { e.preventDefault(); drop(); });
    heldKeys(ctx, (k) => { if (k === " " || k === "enter" || k === "arrowdown") drop(); });

    // rzut izometryczny: x w prawo w dół, z w lewo w dół, y w górę
    const P = (x, y, z) => [W / 2 + (x - z) * 0.866 * 0.82, H * 0.64 + (x + z) * 0.5 * 0.82 - y * TH + s.cam];
    function box(b, y, k, alpha = 1, h = 1) {
      const { x, z, w, d } = b;
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
      const top = [P(x0, y + h, z0), P(x1, y + h, z0), P(x1, y + h, z1), P(x0, y + h, z1)];
      const poly = (pts, fill) => { g.fillStyle = fill; g.beginPath(); pts.forEach(([a, c], k) => (k ? g.lineTo(a, c) : g.moveTo(a, c))); g.closePath(); g.fill(); };
      g.globalAlpha = alpha;
      poly([P(x0, y, z1), P(x1, y, z1), P(x1, y + h, z1), P(x0, y + h, z1)], hue(k, 22));
      poly([P(x1, y, z0), P(x1, y, z1), P(x1, y + h, z1), P(x1, y + h, z0)], hue(k, 11));
      poly(top, hue(k));
      g.globalAlpha = 1;
    }
    let t0 = 0;
    cv.loop((dt) => {
      t0 += dt;
      const level = s.tower.length;
      // kamera jedzie w górę razem z wieżą
      s.cam += (Math.max(0, level - 8) * TH - s.cam) * Math.min(1, dt * 4);
      if (s.moving) {
        const v = speed * (1 + level * 0.03);
        s.moving[s.axis] += s.dir * v * dt;
        if (Math.abs(s.moving[s.axis]) > 46) { s.moving[s.axis] = Math.sign(s.moving[s.axis]) * 46; s.dir *= -1; }
      }
      // tło: delikatna poświata
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, `hsl(${(28 + level * 9) % 360} 78% 58% / 0.16)`);
      grd.addColorStop(1, "transparent");
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      const from = Math.max(0, level - 14);
      // cokół pod wieżą
      if (from === 0) box(base, -12, 0, 1, 12);
      for (let k = from; k < level; k++) box(s.tower[k], k, k);
      if (s.moving) box(s.moving, level, level);
      s.debris = s.debris.filter((p) => p.y > level - 30);
      for (const p of s.debris) {
        p.vy -= 30 * dt;
        p.y += p.vy * dt;
        box(p, p.y, p.k, Math.max(0, Math.min(1, (p.y - (level - 30)) / 10)));
      }
    });

    function render() {
      const h = s.tower.length - 1;
      heightEl.set(`${h} / ${target}`, h / target, s.perfect >= 2 ? `Idealne pod rząd: ${s.perfect}` : "");
      ctx.progress(h / target);
    }
    spawn();
    render();
  },
});
