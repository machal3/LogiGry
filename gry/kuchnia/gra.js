// Kuchnia: serwowanie zamówień — zbierz składniki na patelni, usmaż w oknie czasu i podaj gościowi.
{
  // Składniki wspólne dla poziomów.
  const ING = [
    { id: "jajko", n: "Jajko", col: "#fff4d6" },
    { id: "kotlet", n: "Kotlet", col: "#b5793a" },
    { id: "ser", n: "Ser", col: "#f5c244" },
    { id: "bulka", n: "Bułka", col: "#e0a45a" },
    { id: "salata", n: "Sałata", col: "#7cb753" },
  ];

  // Czy zawartość patelni odpowiada zamówieniu (zbiór składników niezależny od kolejności).
  function matches(order, pan) {
    if (pan.add.length !== order.req.length) return false;
    return [...pan.add].sort().join(",") === [...order.req].sort().join(",");
  }

  // Ocena stopnia usmażenia: surowe, dobre albo przypalone.
  function assess(t, target) {
    if (t < target[0]) return "raw";
    if (t <= target[1]) return "ok";
    return "burnt";
  }

  if (typeof module !== "undefined") module.exports = { ING, matches, assess };

  if (typeof registerGame !== "undefined") registerGame({
    id: "kuchnia",
    cat: "symulacje",
    name: "Kuchnia",
    author: "GLM 5.3 Flash",
    desc: "Zbieraj składniki na patelni, usmaż w prawym momencie i podaj gościom danie na czas.",
    color: "#b91c1c",
    ink: "#ffffff",
    glyph: ["#.#.#", ".....", "#####", ".....", "#.#.#"],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, target: 6, pans: 1, patience: 24, dishIngr: 1, arrival: 7, window: [2.4, 4.2] },
      { key: "medium", name: "Średni", points: 50, target: 8, pans: 2, patience: 20, dishIngr: 2, arrival: 6, window: [3, 4.8] },
      { key: "hard", name: "Trudny", points: 100, target: 10, pans: 3, patience: 16, dishIngr: 3, arrival: 5, window: [3.4, 5.2] },
    ],
    rules: [
      "Kliknij patelnię, a potem składniki z panelu, by złożyć danie zgodne z zamówieniem gościa.",
      "Smaż przyciskiem Smaż, a w dobrym oknie czasu zdejmij Zdejmij. Zbyt długo na ogniu znaczenia ma przypal.",
      "Przypaloną patelnię możesz wyczyścić Wyczyść. Surowe danie nadal smaży się do dobrego momentu.",
      "Podaj gotową patelnię na najstarsze, pasujące zamówienie. Trzech obrażonych gości kończy dzień.",
    ],
    achievements: [
      { id: "szybka-reczka", name: "Szybka rękawka", desc: "Podaj zamówienie w mniej niż 10 sekund.", points: 10 },
      { id: "seria", name: "Kolejka", desc: "Podaj pięć dań pod rząd bez obrazy gościa.", points: 25 },
      { id: "szef", name: "Szef kuchni", desc: "Ukończ dzień bez ani jednej obrazy.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74);
      const g = cv.g;
      const s = { t: 0, served: 0, misses: 0, streak: 0, custs: [], nextArr: 1.5, steam: [], pops: [] };
      const pans = [];
      for (let k = 0; k < L.pans; k++) pans.push({ add: [], cooking: false, t: 0, done: null });
      let selPan = 0;
      const progEl = statBlock(ctx, "Dzień", { meter: true });
      const missEl = statBlock(ctx, "Obrazy", { small: true });
      const panEl = statBlock(ctx, "Patelnia", {});
      missEl.set(`0 z 3`);
      ctx.panel.append(panelBlock("Patelnie", (() => {
        const d = el("div", "ks-pans");
        pans.forEach((p, i) => d.append(button(`Patelnia ${i + 1}`, "btn-ghost ks-panbtn", () => {
          selPan = i;
          Sound.tap();
          panBtns.forEach((b, k) => b.classList.toggle("on", k === i));
        })));
        const panBtns = [...d.children];
        if (panBtns[0]) panBtns[0].classList.add("on");
        return d;
      })()));
      ctx.panel.append(panelBlock("Akcje",
        button("Smaż", "btn wide", startCook),
        button("Zdejmij", "btn-ghost wide", takeOff),
        button("Podaj", "btn-ghost wide", serve)));
      const ingBlk = panelBlock("Składniki", (() => {
        const d = el("div", "ks-ing");
        for (const i of ING) d.append(button(i.n, "btn-ghost wide ks-ingbtn", () => addTo(i.id)));
        return d;
      })());
      ctx.panel.append(ingBlk, panelBlock("Higiena", button("Wyczyść patelnię", "btn-ghost wide danger", clear)));

      // zamówienie: losowy zestaw składników o wielkości poziomu
      function recipe() {
        const ids = ING.map((i) => i.id);
        shuffle(ids);
        return ids.slice(0, L.dishIngr);
      }
      function arrive() {
        s.custs.push({ req: recipe(), pat: 1, born: ctx.time, angry: false });
      }

      cv.loop((dt) => {
        s.t += dt;
        // para nad smażącymi patelniami i dymki "+1" nad obsłużonymi
        for (let i = 0; i < pans.length; i++)
          if (pans[i].cooking && Math.random() < dt * 7)
            s.steam.push({ x: 100 / (L.pans + 1) * (i + 1) + (Math.random() - 0.5) * 4, y: 46, a: 0.5 });
        s.steam = s.steam.filter((p) => (p.y -= dt * 5, p.a -= dt * 0.55, p.a > 0));
        s.pops = s.pops.filter((p) => (p.y -= dt * 4, p.t += dt, p.t < 1));
        if (!ctx.done) {
          s.nextArr -= dt;
          if (s.custs.length < 3 && s.nextArr <= 0) {
            arrive();
            s.nextArr = L.arrival * (0.7 + Math.random() * 0.6);
          }
          for (const p of pans) {
            if (p.cooking) {
              p.t += dt;
              if (assess(p.t, L.window) === "burnt") {
                p.cooking = false;
                p.done = "burnt";
                // kłąb dymu nad przypaloną patelnią
                const bi = pans.indexOf(p);
                for (let k = 0; k < 6; k++)
                  s.steam.push({ x: 100 / (L.pans + 1) * (bi + 1) + (Math.random() - 0.5) * 5, y: 44, a: 0.7, dark: true });
                Sound.error();
              }
            }
          }
          // goście nadchodzą od lewej
          for (const c of s.custs) c.arr = Math.min(1, (c.arr ?? 0) + dt * 2.2);
          for (let i = s.custs.length - 1; i >= 0; i--) {
            const c = s.custs[i];
            c.pat -= dt / L.patience;
            if (c.pat <= 0) {
              s.custs.splice(i, 1);
              s.misses++;
              s.streak = 0;
              s.pops.push({ x: 16 + i * 34, y: 8, text: "grr", t: 0 });
              missEl.set(`${s.misses} z 3`);
              Sound.error();
              if (s.misses >= 3) return finish(false);
            }
          }
        }
        draw();
        progEl.set(String(s.served), s.served / L.target);
        ctx.progress(s.served / L.target);
      });

      function activePan() { return pans[selPan]; }
      function label(p) {
        if (p.done === "ok") return "gotowe";
        if (p.done === "burnt") return "przypalone";
        if (p.cooking) return p.t < L.window[0] ? "smaży się" : "gotowe do zdjęcia";
        return p.add.length ? `czeka: ${p.add.length}/${L.dishIngr}` : "pusta";
      }
      function lblPan() {
        panEl.set(`${selPan + 1}: ${label(pans[selPan])}`);
      }

      function addTo(id) {
        if (ctx.done) return;
        const p = activePan();
        if (p.cooking || p.done) { ctx.toast("Patelnia zajęta"); return Sound.error(); }
        if (p.add.includes(id)) { ctx.toast("Składnik już jest"); return Sound.error(); }
        if (p.add.length >= L.dishIngr) { ctx.toast("Tyle wystarczy"); return Sound.error(); }
        p.add.push(id);
        lblPan();
        Sound.place(1 + p.add.length);
      }

      function startCook() {
        if (ctx.done) return;
        const p = activePan();
        if (p.cooking) { ctx.toast("Już smaży się"); return Sound.tap(); }
        if (p.done) { ctx.toast("Najpierw Wyczyść"); return Sound.error(); }
        if (!p.add.length) { ctx.toast("Patelnia pusta"); return Sound.error(); }
        p.cooking = true;
        p.t = 0;
        lblPan();
        Sound.tap();
      }

      function takeOff() {
        if (ctx.done) return;
        const p = activePan();
        if (!p.cooking) { ctx.toast("Nie smaży się"); return Sound.error(); }
        if (assess(p.t, L.window) === "raw") { ctx.toast("Jeszcze surowe"); return Sound.error(); }
        p.cooking = false;
        p.done = assess(p.t, L.window);
        if (p.done === "ok") Sound.place(6);
        lblPan();
      }

      function clear() {
        if (ctx.done) return;
        const p = activePan();
        p.cooking = false;
        p.done = null;
        p.add = [];
        lblPan();
        Sound.erase();
      }

      function serve() {
        if (ctx.done) return;
        const p = activePan();
        if (p.done !== "ok") { ctx.toast("Nie ma gotowego dania"); return Sound.error(); }
        // najstarszy pasujący gość: c.match: matches(c, p)
        let pick = -1;
        for (let i = 0; i < s.custs.length; i++) {
          if (matches(s.custs[i], p)) { pick = i; break; }
        }
        if (pick < 0) { ctx.toast("Nikt tego nie zamówił"); return Sound.error(); }
        const c = s.custs[pick];
        s.custs.splice(pick, 1);
        s.served++;
        s.streak++;
        s.pops.push({ x: 16 + pick * 34, y: 8, text: "+1", t: 0 });
        p.done = null;
        p.add = [];
        lblPan();
        Sound.place(8);
        if (ctx.time - c.born < 10) ctx.achieve("szybka-reczka");
        if (s.streak >= 5) ctx.achieve("seria");
        if (s.served >= L.target) return finish(true);
      }

      function finish(win) {
        if (!s.misses) ctx.achieve("szef");
        if (win) ctx.win(`Obsłużonych: ${s.served}. Obraz: ${s.misses}.`);
        else ctx.lose("Trzech obrazonych", `Obsłużonych dań: ${s.served}.`);
      }

      // --- Rysowanie: goście u góry, blat z patelniami w dole ---
      // miniatura składnika zamiast zwykłego kółka
      function drawIng(id, x, y, r) {
        const ing = ING.find((n) => n.id === id);
        g.fillStyle = ing.col;
        if (id === "jajko") {
          g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
          g.fillStyle = "#f5b32e";
          g.beginPath(); g.arc(x, y, r * 0.45, 0, 7); g.fill();
        } else if (id === "kotlet") {
          g.beginPath(); g.ellipse(x, y, r * 1.15, r * 0.7, 0, 0, 7); g.fill();
          g.strokeStyle = colorMix("#7a4a1e", 0.9); g.lineWidth = 0.4; g.stroke();
        } else if (id === "ser") {
          g.beginPath();
          g.moveTo(x - r, y + r * 0.6); g.lineTo(x + r, y + r * 0.6); g.lineTo(x, y - r * 0.8);
          g.closePath(); g.fill();
        } else if (id === "bulka") {
          g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.closePath(); g.fill();
          g.fillStyle = colorMix("#a8763c", 0.65);
          g.fillRect(x - r, y, 2 * r, r * 0.42);
        } else { // salata: trzy nachodzące listki
          for (const [dx, dy] of [[-0.5, 0.25], [0.5, 0.25], [0, -0.3]]) {
            g.beginPath(); g.arc(x + dx * r, y + dy * r, r * 0.68, 0, 7); g.fill();
          }
        }
      }

      // buźka gościa zależy od cierpliwości
      function face(x, y, pat) {
        g.strokeStyle = "rgba(0,0,0,0.55)";
        g.lineWidth = 0.5;
        g.fillStyle = "rgba(0,0,0,0.55)";
        g.beginPath(); g.arc(x - 1.7, y - 0.6, 0.45, 0, 7); g.fill();
        g.beginPath(); g.arc(x + 1.7, y - 0.6, 0.45, 0, 7); g.fill();
        g.beginPath();
        if (pat > 0.55) g.arc(x, y + 0.8, 1.6, 0.2, Math.PI - 0.2);
        else if (pat > 0.35) { g.moveTo(x - 1.4, y + 1.5); g.lineTo(x + 1.4, y + 1.5); }
        else g.arc(x, y + 2.6, 1.6, Math.PI + 0.2, -0.2);
        g.stroke();
      }

      function draw() {
        g.fillStyle = cv.theme.bg;
        g.fillRect(0, 0, 100, 74);
        // pas gości
        g.fillStyle = colorMix(cv.theme.text, 0.05);
        g.fillRect(0, 0, 100, 27);
        for (let i = 0; i < s.custs.length; i++) {
          const c = s.custs[i];
          const x = 16 + i * 34 - (1 - (c.arr ?? 1)) * 20, y = 13;
          g.fillStyle = c.pat < 0.35 ? colorMix("#e8a07b", 0.85) : "#e8b07b";
          g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
          g.fillStyle = "#5b4530";
          g.beginPath(); g.arc(x, y - 2.2, 4.8, Math.PI, 0); g.fill();
          face(x, y, c.pat);
          c.req.forEach((id, k) => drawIng(id, x - (c.req.length - 1) * 2.4 + k * 4.8, y + 7.6, 1.9));
          g.fillStyle = "rgba(0,0,0,0.25)";
          g.fillRect(x - 7, y + 10.4, 14, 1.6);
          g.fillStyle = c.pat < 0.35 ? "#c23b32" : cv.theme.c;
          g.fillRect(x - 7, y + 10.4, 14 * Math.max(0, c.pat), 1.6);
        }
        // blat z patelniami
        g.fillStyle = colorMix(cv.theme.text, 0.1);
        g.fillRect(0, 32, 100, 42);
        for (let i = 0; i < L.pans; i++) {
          const p = pans[i];
          const x = 100 / (L.pans + 1) * (i + 1), y = 54;
          g.fillStyle = colorMix(cv.theme.text, 0.15);
          g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
          g.fillStyle = "#2b2f36";
          g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill();
          g.fillStyle = "#3a2a1c";
          g.fillRect(x + 8, y - 1.1, 8, 2.2);
          g.strokeStyle = i === selPan ? cv.theme.c : colorMix(cv.theme.c, 0.4);
          g.lineWidth = i === selPan ? 1.1 : 0.5;
          g.beginPath(); g.arc(x, y, 7.7, 0, 7); g.stroke();
          p.add.forEach((id, k) => drawIng(id, x - (p.add.length - 1) * 2.2 + k * 4.4, y - 0.4, 1.8));
          if (p.cooking) {
            // chmurki pary nad patelnią
            for (const st of s.steam) {
              g.fillStyle = st.dark ? `rgba(44,44,50,${st.a * 0.85})` : `rgba(255,255,255,${st.a * 0.75})`;
              g.beginPath(); g.arc(st.x, st.y, 1.6 + (46 - st.y) * 0.12, 0, 7); g.fill();
            }
            const fr = Math.min(1, p.t / L.window[1]);
            g.fillStyle = "rgba(0,0,0,0.32)";
            g.fillRect(x - 7, y + 9.6, 14, 2);
            g.fillStyle = assess(p.t, L.window) === "ok" ? "#48c164" : "#e0a437";
            g.fillRect(x - 7, y + 9.6, 14 * fr, 2);
          }
          if (p.done === "ok") {
            g.strokeStyle = "#48c164";
            g.lineWidth = 1.2;
            g.beginPath(); g.arc(x, y, 7, 0, 7); g.stroke();
          }
          if (p.done === "burnt") {
            g.fillStyle = colorMix("#20140c", 0.85);
            g.beginPath(); g.arc(x, y, 6.5, 0, 7); g.fill();
            g.fillStyle = "#e8e6d9";
            g.font = "2.6px sans-serif";
            g.fillText("spalone", x - 4.2, y + 2.4);
          }
        }
        g.fillStyle = colorMix(cv.theme.text, 0.7);
        g.font = "3.2px sans-serif";
        g.fillText(`Patelnia ${selPan + 1} — ${label(pans[selPan])}`, 4, 41);
        // dymki "+1" i "grr" nad gośćmi
        for (const p of s.pops) {
          const a = Math.max(0, 1 - p.t);
          g.font = "4px sans-serif";
          g.textAlign = "center";
          g.fillStyle = p.text === "+1" ? `rgba(88,190,110,${a})` : `rgba(214,56,52,${a})`;
          g.strokeStyle = `rgba(0,0,0,${a * 0.5})`;
          g.lineWidth = 0.3;
          g.strokeText(p.text, p.x, p.y);
          g.fillText(p.text, p.x, p.y);
          g.textAlign = "left";
        }
      }
      function colorMix(c, a) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgba(${r},${gg},${b2},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}
