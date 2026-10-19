// Wędkarstwo: łódka na jeziorze, wybór przynęty i głębokości, zacięcie i holowanie ryby na pasek napięcia.
{
  // Gatunki: głębokość (0 tafle … 1 dno), preferowana przynęta (0 robak, 1 wobler, 2 kukurydza; −1: bierze wszystko), wartość, wielkość do rysunku.
  const SPECIES = [
    { id: "ploc", n: "Płotka", depth: [0.05, 0.3], lure: 0, w: 6, s: 3.2 },
    { id: "okon", n: "Okoń", depth: [0.15, 0.45], lure: 1, w: 9, s: 3.8 },
    { id: "szczupak", n: "Szczupak", depth: [0.2, 0.5], lure: 1, w: 16, s: 5 },
    { id: "leszcz", n: "Leszcz", depth: [0.5, 0.8], lure: 0, w: 10, s: 4.4 },
    { id: "karp", n: "Karp", depth: [0.4, 0.72], lure: 2, w: 12, s: 4.8 },
    { id: "sum", n: "Sum", depth: [0.75, 0.98], lure: 2, w: 30, s: 6 },
    { id: "but", n: "Stary but", depth: [0.5, 0.95], lure: -1, w: 1, s: 2.6 },
  ];
  const LURES = ["Robak", "Wobler", "Kukurydza"];

  // Ryby, które mogą skubnąć przynętę na tej głębokości i z tą przynętą.
  function bitePool(depth, lure) {
    return SPECIES.filter((sp) =>
      sp.lure === lure || sp.lure === -1 ? depth >= sp.depth[0] && depth <= sp.depth[1] : false);
  }

  // Krok holowania: napięcie rośnie przy holu, ryba szarpie; zwraca zdarzenia.
  function reelStep(st, pulling, dt, strength) {
    const ev = {};
    st.pull = strength * (0.6 + 0.4 * Math.sin(st.t * 2.6));
    st.t += dt;
    if (pulling) {
      st.len -= dt * 0.16;
      st.ten += dt * 0.55 + st.pull * dt * 0.5;
    } else {
      st.ten -= dt * 0.85;
      st.len -= dt * 0.015;
    }
    st.ten = Math.max(0, Math.min(1.35, st.ten));
    if (st.ten >= 1) ev.broke = true;
    if (st.len <= 0) ev.caught = true;
    if (st.t > 14) ev.escaped = true; // ryba zmęczyła wędkarza i odpłynęła
    return ev;
  }

  if (typeof module !== "undefined") module.exports = { SPECIES, LURES, bitePool, reelStep };

  if (typeof registerGame !== "undefined") registerGame({
    id: "wedka",
    cat: "symulacje",
    name: "Wędkarstwo",
    author: "GLM 5.3 Flash",
    desc: "Rzucaj wędką z łodzi, dobieraj przynętę i głębokość, holuj ryby z wyczuciem.",
    color: "#115e59",
    ink: "#ffffff",
    glyph: [".###.", "#####", "..#..", "..#..", "..#.."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, target: 45, time: 150, depthMax: 0.6, bite: 1.35 },
      { key: "medium", name: "Średni", points: 50, target: 70, time: 170, depthMax: 0.8, bite: 1.1 },
      { key: "hard", name: "Trudny", points: 100, target: 125, time: 190, depthMax: 1, bite: 0.9 },
    ],
    rules: [
      "Wybierz przynętę i głębokość w panelu; każda ryba ma swoje smaki i swoje piętro wody.",
      "Rzuć: dwukrotne użycie przycisku Rzuć ustawia moc rzutu i miejsce zanurzenia haczyka.",
      "Gdy pływaczek zadrży, wciśnij Zacięcie w ciągu sekundy. Przy holu pilnuj napięcia żyłki: za mocno — pęknie, za słabo — ryba ucieknie.",
      "Dziennik połowów zlicza wartość ryb. Wygrywasz, gdy dzienny wynik przekroczy cel przed zachodem słońca.",
    ],
    achievements: [
      { id: "kolekcja", name: "Kolekcja", desc: "Złap trzy różne gatunki w jednej partii.", points: 10 },
      { id: "sumowie", name: "Sumowie", desc: "Wyholuj suma, najcenniejszą rybę jeziora.", points: 25 },
      { id: "rybak-roku", name: "Rybak roku", desc: "Ukończ poziom trudny przed upływem dwóch trzecich czasu.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74);
      const g = cv.g;
      const s = { phase: "idle", cast: 0, castDir: 1, x: 0, depth: 0.3, lure: 0,
        len: 1, ten: 0, t: 0, fish: null, biteT: 0, biteFish: null, wait: 2 + Math.random() * 3,
        haul: [], dayT: 0, splash: [], catchPop: null };
      const scoreEl = statBlock(ctx, "Wynik dnia", { meter: true });
      const timeEl = statBlock(ctx, "Czas", { small: true });
      const logEl = statBlock(ctx, "Dziennik", { small: true });
      const lureSeg = segmented("Przynęta", LURES, (k) => { s.lure = k; Sound.tap(); });
      const depthSeg = segmented("Głębokość", ["Tafle", "Środek", "Dno"], (k) => {
        s.depth = [0.22, 0.5, 0.85][k] * L.depthMax + 0.08;
        Sound.tap();
      });
      ctx.panel.append(panelBlock("Zanętowanie", lureSeg.el, depthSeg.el),
        panelBlock("Wędkowanie",
          button("Rzuć", "btn wide wd-main", mainAct),
          (() => { const b = button("Holuj", "btn-ghost wide wd-hold");
            ctx.on(b, "pointerdown", (e) => { e.preventDefault(); s.pull = true; b.classList.add("on"); });
            for (const ev2 of ["pointerup", "pointerleave", "pointercancel"])
              ctx.on(b, ev2, () => { s.pull = false; b.classList.remove("on"); });
            return b; })()));
      function mainAct() {
        if (ctx.done) return;
        if (s.phase === "idle") { s.phase = "power"; Sound.tap(); }
        else if (s.phase === "power") {
          s.phase = "wait";
          s.x = 12 + s.cast * 72;
          s.ten = 0;
          s.wait = (2 + Math.random() * 3.5) / L.bite;
          splashAt(s.x, 6);
          Sound.line();
        } else if (s.phase === "bite") hook();
      }
      // spacja też działa jak główny przycisk
      ctx.on(document, "keydown", (e) => {
        if (e.key === " " && !ctx.done) { e.preventDefault(); mainAct(); }
      });

      cv.loop((dt) => {
        // pluski i karta połowu żyją nawet po końcu partii
        for (const p of s.splash) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 55 * dt; p.a -= dt * 1.3;
        }
        s.splash = s.splash.filter((p) => p.a > 0);
        if (s.catchPop && (s.catchPop.t += dt) > 2.4) s.catchPop = null;
        if (!ctx.done) {
          s.dayT += dt;
          if (s.dayT >= L.time) return finish(false);
          if (s.phase === "power") {
            s.cast += s.castDir * dt * 0.9;
            if (s.cast > 1) { s.cast = 1; s.castDir = -1; }
            if (s.cast < 0) { s.cast = 0; s.castDir = 1; }
          } else if (s.phase === "wait") {
            s.wait -= dt;
            if (s.wait <= 0) {
              // kto skubnie? losowanie spośród pasujących
              const pool = bitePool(s.depth, s.lure);
              if (pool.length) {
                s.biteFish = pick(pool);
                s.biteT = 0.95;
                s.phase = "bite";
                Sound.flag();
              } else {
                s.wait = 1.5;
              }
            }
          }
          if (s.phase === "bite") {
            s.biteT -= dt;
            if (s.biteT <= 0) {
              s.phase = "wait";
              s.biteFish = null;
              s.wait = (2.5 + Math.random() * 3) / L.bite;
              ctx.toast("Uciekła z przynętą");
            }
          }
          if (s.phase === "fight") {
            const ev = reelStep(s.fishState, s.pull, dt, 0.5 + s.fish.s * 0.08);
            if (ev.broke) {
              s.fish = null;
              s.phase = "idle";
              Sound.error();
              ctx.toast("Żyłka pękła");
            } else if (ev.caught) {
              catchFish(s.fish);
              s.fish = null;
              s.phase = "idle";
            } else if (ev.escaped) {
              s.fish = null;
              s.phase = "idle";
              Sound.error();
              ctx.toast("Ryba się zmęczyła... i odpłynęła");
            }
          }
        }
        draw();
      });

      function hook() {
        if (s.phase !== "bite") return;
        s.fish = s.biteFish;
        s.biteFish = null;
        s.fishState = { len: 1, ten: 0.3, t: 0 };
        s.phase = "fight";
        Sound.tap();
      }

      function catchFish(f) {
        s.haul.push(f.id);
        splashAt(s.x, 7);
        s.catchPop = { fish: f, t: 0 };
        Sound.place(3 + (s.haul.length % 8));
        const total = s.haul.reduce((a, id) => a + (SPECIES.find((x) => x.id === id)?.w || 0), 0);
        scoreEl.set(String(total), total / L.target);
        logEl.set(`${s.haul.length} szt.`);
        if (f.id === "sum") ctx.achieve("sumowie");
        if (new Set(s.haul).size >= 3) ctx.achieve("kolekcja");
        ctx.progress(total / L.target);
        if (total >= L.target) {
          if (L.key === "hard" && s.dayT < L.time * 2 / 3) ctx.achieve("rybak-roku");
          finish(true);
        }
      }

      function finish(win) {
        const total = s.haul.reduce((a, id) => a + (SPECIES.find((x) => x.id === id)?.w || 0), 0);
        if (win) ctx.win(`Wynik dnia: ${total}. Ryb w dzienniku: ${s.haul.length}.`);
        else ctx.lose("Zachód słońca", `Wynik dnia: ${total} z celu ${L.target}.`);
      }

      // --- Rysowanie: jezioro w przekroju ---
      const SURF = 16;
      // mieszanie kolorów od świtu do zachodu
      function mix2(a, b, k) {
        const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
        const m = (u, v) => Math.round(u + (v - u) * k);
        return `rgb(${m((pa >> 16) & 255, (pb >> 16) & 255)},${m((pa >> 8) & 255, (pb >> 8) & 255)},${m(pa & 255, pb & 255)})`;
      }
      function splashAt(x, n) {
        for (let k = 0; k < n; k++)
          s.splash.push({ x, y: SURF + 1, vx: (Math.random() - 0.5) * 17, vy: -(5 + Math.random() * 15), a: 1 });
      }
      function draw() {
        timeEl.set(fmt(Math.max(0, L.time - s.dayT)));
        const dayK = Math.min(1, s.dayT / L.time); // 0 — poranek, 1 — zachód
        // niebo: od błękitu do pomarańczu
        const sg = g.createLinearGradient(0, 0, 0, SURF);
        sg.addColorStop(0, mix2("#9ed3ee", "#7a4a6e", dayK));
        sg.addColorStop(1, mix2("#cfe9f4", "#f2a25c", dayK));
        g.fillStyle = sg;
        g.fillRect(0, 0, 100, SURF);
        // słońca schodzi niżej i czerwieńsze
        g.fillStyle = mix2("#ffd97a", "#ff7a3c", dayK);
        g.beginPath(); g.arc(84, 7 + dayK * 6, 4, 0, 7); g.fill();
        // śpiące chmury
        g.globalAlpha = 0.7;
        g.fillStyle = mix2("#ffffff", "#f7d9c4", dayK);
        for (let k = 0; k < 3; k++) {
          const cx = ((k * 33 + s.dayT * 2.2) % 112) - 6;
          const cy = 4 + k * 3.6;
          for (const [dx, r] of [[-2.4, 1.7], [0, 2.2], [2.6, 1.6]]) {
            g.beginPath(); g.arc(cx + dx, cy, r, 0, 7); g.fill();
          }
        }
        g.globalAlpha = 1;
        // dwa ptaki prące się nad jeziorem
        g.strokeStyle = mix2("#3a3a3a", "#2b1a2e", dayK);
        g.lineWidth = 0.55;
        for (let k = 0; k < 2; k++) {
          const bx = ((s.dayT * (7 + k * 2.6) + k * 47) % 116) - 8;
          const by = 5 + k * 3 + Math.sin(s.dayT * 2 + k * 2) * 0.8;
          const flap = Math.sin(s.dayT * 9 + k * 3) * 1.2;
          g.beginPath();
          g.moveTo(bx - 2, by + flap);
          g.quadraticCurveTo(bx, by - 0.8, bx + 2, by + flap);
          g.stroke();
        }
        // woda: gradient głębi
        const wg = g.createLinearGradient(0, SURF, 0, 74);
        wg.addColorStop(0, mix2("#4fa3c7", "#3d6f8e", dayK));
        wg.addColorStop(1, "#123a4f");
        g.fillStyle = wg;
        g.fillRect(0, SURF, 100, 74 - SURF);
        // pluski przy trafieniu przynęty i przy połowie
        for (const p of s.splash) {
          g.fillStyle = `rgba(255,255,255,${Math.max(0, p.a) * 0.8})`;
          g.beginPath(); g.arc(p.x, p.y, 0.6, 0, 7); g.fill();
        }
        // turzyca przy brzegu
        for (let k = 0; k < 5; k++) {
          const rx = 88 + k * 2.4;
          const sway = Math.sin(s.dayT * 1.6 + k * 1.3) * 0.8;
          g.strokeStyle = "#2f6b45";
          g.lineWidth = 0.5;
          g.beginPath();
          g.moveTo(rx, 73);
          g.quadraticCurveTo(rx + sway, 68, rx + sway * 1.7, 64 - (k % 3) * 1.2);
          g.stroke();
        }
        // łódka
        const bx = 8, by = SURF - 1.5;
        g.fillStyle = "#7a4a28";
        g.beginPath();
        g.moveTo(bx - 6, by);
        g.lineTo(bx + 7, by);
        g.lineTo(bx + 5, by + 3.4);
        g.lineTo(bx - 4, by + 3.4);
        g.closePath();
        g.fill();
        // wędkarz
        g.fillStyle = "#c9563c";
        g.beginPath(); g.arc(bx + 1, by - 3.6, 2.2, 0, 7); g.fill();
        g.strokeStyle = "#5d3a1e";
        g.lineWidth = 0.7;
        // wędka
        g.beginPath();
        g.moveTo(bx + 2.6, by - 2);
        g.lineTo(bx + 12, by - 11);
        g.stroke();
        // żyłka i pływaczek
        const tipX = bx + 12, tipY = by - 11;
        const hx = s.phase === "idle" && !s.x ? bx + 6 : s.x;
        const hy = SURF + 3 + s.depth * (72 - SURF);
        if (s.phase !== "idle" && s.phase !== "power") {
          g.strokeStyle = "rgba(255,255,255,0.55)";
          g.lineWidth = 0.25;
          // żyłka ugina się tym mocniej, im górna się większe napięcie i holowana ryba
          const sag = s.phase === "fight" ? 3 + s.fishState.ten * 6 : 2;
          g.beginPath();
          g.moveTo(tipX, tipY);
          g.quadraticCurveTo((tipX + hx) / 2, (tipY + hy) / 2 + sag, hx, hy);
          g.stroke();
          // pływaczek
          g.fillStyle = "#e23b3b";
          g.beginPath(); g.arc(hx, SURF + 2.2, 1.4, 0, 7); g.fill();
          g.fillStyle = "#f5f2ea";
          g.fillRect(hx - 1.2, SURF + 1, 2.4, 1.2);
          // haczyk z przynętą
          g.fillStyle = "#d8cfc0";
          g.beginPath(); g.arc(hx, hy, 0.9, 0, 7); g.fill();
        }
        // sylwetki ryb w toni (tło)
        for (let k = 0; k < 5; k++) {
          const fx = ((k * 23 + s.dayT * (6 + k)) % 116) - 8;
          const fy = SURF + 10 + k * 11;
          g.fillStyle = "rgba(10,40,55,0.5)";
          g.beginPath();
          g.ellipse(fx, fy, 2.6, 1, 0, 0, 7);
          g.fill();
          g.beginPath();
          g.moveTo(fx - 2.6, fy);
          g.lineTo(fx - 4.2, fy - 1);
          g.lineTo(fx - 4.2, fy + 1);
          g.closePath();
          g.fill();
        }
        // szarpnięcie: wykrzyknik nad pływaczkiem
        if (s.phase === "bite") {
          g.fillStyle = "#ffd23c";
          g.font = "6px sans-serif";
          g.fillText("!", hx - 1, SURF - 2);
        }
        // holowanie: ryba przy haczyku i pasek napięcia
        if (s.phase === "fight") {
          const f = s.fish;
          const fx = hx - 3 - (1 - s.fishState.len) * 6;
          const fy = Math.min(70, hy + 2 + Math.sin(s.fishState.t * 6) * 1.5);
          g.fillStyle = "#2f4a5a";
          g.beginPath();
          g.ellipse(fx, fy, f.s * 0.9, f.s * 0.42, 0, 0, 7);
          g.fill();
          g.beginPath();
          g.moveTo(fx - f.s * 0.85, fy);
          g.lineTo(fx - f.s * 1.5, fy - f.s * 0.5);
          g.lineTo(fx - f.s * 1.5, fy + f.s * 0.5);
          g.closePath();
          g.fill();
          // pasek napięcia
          g.fillStyle = "rgba(0,0,0,0.3)";
          g.fillRect(30, 4, 40, 3);
          g.fillStyle = s.fishState.ten > 0.8 ? "#c23b32" : "#48c164";
          g.fillRect(30, 4, 40 * Math.min(1, s.fishState.ten), 3);
          g.strokeStyle = "rgba(255,255,255,0.7)";
          g.lineWidth = 0.3;
          g.beginPath(); g.moveTo(30 + 40 * 0.74, 3); g.lineTo(30 + 40 * 0.74, 7); g.stroke();
        }
        // pasek rzutu
        if (s.phase === "power") {
          g.fillStyle = "rgba(0,0,0,0.3)";
          g.fillRect(20, 6, 60, 3);
          g.fillStyle = cv.theme.c;
          g.fillRect(20, 6, 60 * s.cast, 3);
        }
        // wskaźnik głębokości hacyka przy boku
        if (["wait", "bite"].includes(s.phase)) {
          g.fillStyle = "rgba(255,255,255,0.5)";
          g.font = "2.6px sans-serif";
          g.fillText(`głębokość ${(s.depth * 100) | 0}%`, 70, 70);
        }
        // piętra wody przy lewym brzegu
        if (s.phase === "idle" || s.phase === "power") {
          g.fillStyle = "rgba(255,255,255,0.42)";
          g.font = "2.6px sans-serif";
          g.fillText("tafle", 2, SURF + 9);
          g.fillText("średnio", 2, 46);
          g.fillText("dno", 2, 70);
        }
        // karta połowu: gatunek i wartość
        if (s.catchPop) {
          const cp = s.catchPop;
          const a = cp.t < 0.2 ? cp.t / 0.2 : Math.max(0, 1 - (cp.t - 1.8) / 0.6);
          g.globalAlpha = a;
          g.fillStyle = "rgba(12,32,44,0.9)";
          g.fillRect(29, 25, 42, 14);
          g.strokeStyle = cv.theme.c;
          g.lineWidth = 0.5;
          g.strokeRect(29, 25, 42, 14);
          g.fillStyle = "#fdfdf8";
          g.font = "4px sans-serif";
          g.textAlign = "center";
          g.fillText(cp.fish.n, 50, 31);
          g.fillStyle = "#ffd97a";
          g.font = "3.2px sans-serif";
          g.fillText(`wartość ${cp.fish.w}`, 50, 36.5);
          g.textAlign = "left";
          g.globalAlpha = 1;
        }
      }
    },
  });
}
