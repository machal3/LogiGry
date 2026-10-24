// Tarcza: rzuty dartami z drżeniem ręki, schodzenie z wyniku do zera i wyścig z komputerem.
// Obsługuje wiele tarcz: pojedynek na 2 tarcze (gracz i komputer), tryb 3 tarcz premiowych oraz 1 klasyczną.
{
  // Segmenty tarczy od góry, co 18 stopni, jak w prawdziwych dartach.
  const SEGS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 9, 12, 5, 14];
  const CX = 26, CY = 39; // domyślny środek tarczy gracza

  // Punkty za trafienie w (dx, dy) względem środka; rr — promień tarczy, mult — mnożnik punktów
  function scoreAt(dx, dy, rr, mult = 1) {
    const d = Math.hypot(dx, dy);
    const r = (d / rr) * 31; // proporcje pierścieni wyrażone w jednostkach 0–31
    if (r > 31) return { pts: 0, ring: "M", seg: 0, mult };
    const a = Math.atan2(dx, -dy); // 0 na górze, rośnie z ruchem wskazówek zegara
    const k = Math.round(a / (Math.PI / 10));
    const seg = SEGS[((k % 20) + 20) % 20];
    if (r <= 3) return { pts: 50 * mult, ring: "B50", seg: 0, mult };
    if (r <= 9) return { pts: 25 * mult, ring: "B25", seg: 0, mult };
    if (r <= 14) return { pts: seg * mult, ring: "S", seg, mult };
    if (r <= 18.5) return { pts: seg * 3 * mult, ring: "T", seg, mult };
    if (r <= 23) return { pts: seg * mult, ring: "S", seg, mult };
    if (r <= 27) return { pts: seg * 2 * mult, ring: "D", seg, mult };
    return { pts: 0, ring: "M", seg: 0, mult };
  }

  // Biz: wynik poniżej zera albo równy jeden kończy turę bez zmian
  function isBust(before, hit) {
    return before - hit < 0 || before - hit === 1;
  }

  if (typeof module !== "undefined") {
    module.exports = { scoreAt, isBust, SEGS, CX, CY };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "tarcza",
    cat: "zrecznosciowe",
    name: "Tarcza",
    author: "GLM 5.3 Flash, Gemini 3.8 Flash",
    desc: "Rzucaj dartami w tarczę, schodź z wyniku do zera i wyprzedzaj komputer.",
    color: "#166534",
    ink: "#ffffff",
    glyph: ["..#..", ".###.", "#####", ".###.", "..#.."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, start: 201, turns: 12, shake: 1.7 },
      { key: "medium", name: "Średni", points: 50, start: 301, turns: 15, shake: 2.6 },
      { key: "hard", name: "Trudny", points: 100, start: 501, turns: 20, shake: 3.5 },
    ],
    rules: [
      "Celowanie: przesuń celownik myszą albo strzałkami, na telefonie dotknij tarczy.",
      "Rzut przyciskiem Rzuć albo spacją. Trzy rzuty to runda; potem rzuca komputer.",
      "Układy tarcz: pojedynek (osobna tarcza dla Ciebie i komputera), 3 tarcze z mnożnikami lub 1 tarcza.",
      "Wynik schodzi o trafienia: pojedyncza liczba, podwójny i potrójny pierścień, byki to 25 i 50 punktów.",
      "Przestrzał poniżej zera albo na jeden punkt to biz i runda bez zmian. Wygrywa trafienie dokładnego zera.",
    ],
    achievements: [
      { id: "byk", name: "Byk", desc: "Trafić środek tarczy.", points: 10 },
      { id: "szeryf", name: "Szeryf", desc: "Ukończ partię bez ani jednego przestrzału.", points: 25 },
      { id: "celnik", name: "Celnik", desc: "Zamknij rundę trzema rzutami co najmniej 80 punktów.", points: 50 },
      { id: "wielotarczowiec", name: "Wielotarczowiec", desc: "Wygraj partię na więcej niż jedną tarczę.", points: 25 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74);
      const g = cv.g;

      // Konfiguracje widoku tarcz:
      // duel: dwie tarcze (gracz po lewej, komputer po prawej)
      // tri: trzy tarcze z różnymi mnożnikami (x1, x2 premia, x3 precyzja)
      // single: jedna duża wyśrodkowana tarcza
      let mode = "duel"; // "duel" | "tri" | "single"
      let selectedTarget = 0; // dla trybu 3 tarcz

      const scoreEl = statBlock(ctx, "Twój wynik", {});
      const matchStats = statsBlock(ctx, "Mecz", ["Komputer", "Runda"]);

      const segControl = segmented("Układ tarcz", ["2 tarcze", "3 tarcze", "1 tarcza"], (idx) => {
        const modes = ["duel", "tri", "single"];
        mode = modes[idx];
        s.aim = [0, 0];
      });
      segControl.set(0);

      ctx.panel.append(
        panelBlock("Rozgrywka",
          segControl.el,
          button("Rzuć", "btn wide", () => throwDart(true)),
          el("p", "tac-leg", "Rzut: spacja, Enter lub kliknięcie tarczy. Strzałki przesuwają celownik."),
        ),
      );

      const s = {
        me: L.start,
        you: L.start,
        turn: 1,
        darts: [],
        dartsAI: [],
        pops: [],
        shake: 0,
        aim: [0, 0],
        aiTurn: false,
        roundPts: 0,
        busts: 0,
        turnStartMe: L.start,
        turnStartYou: L.start,
        wk: 0,
      };

      // Zwraca listę tarcz dla bieżącego trybu
      function getTargets() {
        if (mode === "duel") {
          return [
            { cx: 25.5, cy: 40, rr: 19.5, mult: 1, title: "TWOJA TARCZA", owner: "player" },
            { cx: 74.5, cy: 40, rr: 19.5, mult: 1, title: "TARCZA KOMPUTERA", owner: "ai" },
          ];
        }
        if (mode === "tri") {
          return [
            { cx: 18, cy: 41, rr: 13.5, mult: 1, title: "KLASYK x1", owner: "both" },
            { cx: 50, cy: 41, rr: 13.5, mult: 2, title: "PREMIA x2", owner: "both", accent: true },
            { cx: 82, cy: 41, rr: 13.5, mult: 3, title: "MISTRZ x3", owner: "both" },
          ];
        }
        return [
          { cx: 50, cy: 40, rr: 26, mult: 1, title: "TARCZA GŁÓWNA", owner: "both" },
        ];
      }

      function getTargetFor(forMe) {
        const targets = getTargets();
        if (mode === "duel") return forMe ? targets[0] : targets[1];
        if (mode === "tri") return targets[selectedTarget] || targets[0];
        return targets[0];
      }

      const keys = heldKeys(ctx);
      cv.loop((dt) => {
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        if (!ctx.done && !s.aiTurn) {
          const curTarget = getTargetFor(true);
          const maxR = curTarget.rr;
          if (kx || ky) {
            s.aim = [
              Math.max(-maxR, Math.min(maxR, s.aim[0] + kx * 0.9)),
              Math.max(-maxR, Math.min(maxR, s.aim[1] + ky * 0.9)),
            ];
          }
        }
        s.wk += dt;
        s.shake = Math.max(0, s.shake - dt * 2.4);
        s.pops = s.pops.filter((p) => (p.t += dt) < 0.9);
        render();
      });

      function aimFromEvent(e) {
        const [mx, my] = cv.at(e);
        const targets = getTargets();
        if (mode === "tri") {
          let bestIdx = 0, bestDist = Infinity;
          targets.forEach((t, i) => {
            const d = Math.hypot(mx - t.cx, my - t.cy);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          });
          selectedTarget = bestIdx;
        }
        const target = getTargetFor(true);
        const dx = mx - target.cx;
        const dy = my - target.cy;
        const maxR = target.rr;
        return [Math.max(-maxR, Math.min(maxR, dx)), Math.max(-maxR, Math.min(maxR, dy))];
      }

      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.aiTurn && !ctx.done) s.aim = aimFromEvent(e);
      });
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.aiTurn) return;
        s.aim = aimFromEvent(e);
        throwDart(true);
      });
      ctx.on(document, "keydown", (e) => {
        if ((e.key === " " || e.key === "Enter") && !ctx.done && !s.aiTurn) {
          e.preventDefault();
          throwDart(true);
        }
        if (mode === "tri" && !ctx.done && !s.aiTurn) {
          if (e.key === "1") { selectedTarget = 0; s.aim = [0, 0]; }
          if (e.key === "2") { selectedTarget = 1; s.aim = [0, 0]; }
          if (e.key === "3") { selectedTarget = 2; s.aim = [0, 0]; }
        }
      });

      function throwDart(forMe) {
        if (ctx.done || s.aiTurn !== !forMe) return;
        if ((forMe && s.darts.length >= 3) || (!forMe && s.dartsAI.length >= 3)) return;

        const target = getTargetFor(forMe);
        const jx = (Math.random() - 0.5) * 2 * L.shake;
        const jy = (Math.random() - 0.5) * 2 * L.shake;
        const x = s.aim[0] + jx, y = s.aim[1] + jy;
        const hit = scoreAt(x, y, target.rr, target.mult);
        const darts = forMe ? s.darts : s.dartsAI;
        darts.push({
          x: target.cx + x,
          y: target.cy + y,
          land: s.wk,
          target,
        });

        const before = forMe ? s.me : s.you;
        const multSuffix = target.mult > 1 ? ` (x${target.mult})` : "";
        const hitName = hit.ring === "B50" ? `BYK 50${multSuffix}`
          : hit.ring === "B25" ? `25${multSuffix}`
          : hit.ring === "T" ? `T${hit.seg}${multSuffix}`
          : hit.ring === "D" ? `D${hit.seg}${multSuffix}`
          : hit.ring === "S" ? `${hit.seg}${multSuffix}`
          : "0";

        if (isBust(before, hit.pts)) {
          Sound.error();
          s.shake = 1;
          s.pops.push({ x: target.cx + x, y: target.cy + y, text: "BIZ", t: 0 });
          if (forMe) { s.busts++; s.me = s.turnStartMe; }
          else { s.you = s.turnStartYou; }
          return skip();
        }

        s.pops.push({ x: target.cx + x, y: target.cy + y, text: hitName, t: 0 });
        if (forMe) {
          s.me -= hit.pts;
          s.roundPts += hit.pts;
          if (hit.ring === "B50") ctx.achieve("byk");
        } else {
          s.you -= hit.pts;
        }

        Sound.line();
        if ((forMe ? s.me : s.you) === 0) return finish(forMe);
        skip();
      }

      function skip() {
        if (s.aiTurn) return endTurn(false);
        endTurn(true);
      }

      function endTurn() {
        if (s.aiTurn) {
          if (!ctx.done && s.turn >= L.turns) return finish(s.me < s.you);
          s.dartsAI.length = 0;
          s.roundPts = 0;
          s.aiTurn = false;
          return;
        }
        if (s.roundPts >= 80) ctx.achieve("celnik");
        s.turn++;
        s.turnStartMe = s.me;
        s.turnStartYou = s.you;
        s.darts.length = 0;
        s.aiTurn = true;
        aiThrow();
      }

      function aiThrow() {
        if (ctx.done) return;
        setTimeout(() => {
          if (ctx.done || !s.aiTurn) return;
          const target = getTargetFor(false);
          s.aim = aiPick(s.you, target);
          throwDart(false);
        }, 300 + Math.random() * 320);
      }

      function aiPick(rest, target) {
        const rr = target.rr;
        const U = rr / 31;
        const aimSeg = (k) => {
          const i = SEGS.indexOf(k);
          const a = i * Math.PI / 10;
          return [Math.sin(a) * 11 * U, -Math.cos(a) * 11 * U];
        };
        const mult = target.mult || 1;
        const rEff = rest / mult;

        if (rEff >= 60) return [0, -16.5 * U];
        if (rEff === 50) return [0, 0];
        if (rEff === 40) return [0, -25.3 * U];
        if (rEff === 25) return [0.5, -0.5];
        if (rEff > 40) return rEff === 41 ? aimSeg(20) : [0, -25.3 * U];
        if (rEff > 20) return aimSeg(Math.floor(rEff - 20));
        return aimSeg(Math.max(1, Math.floor(rEff)));
      }

      function finish(playerWin) {
        if (playerWin && !s.busts) ctx.achieve("szeryf");
        if (playerWin && mode !== "single") ctx.achieve("wielotarczowiec");
        if (playerWin) ctx.win(`Wynik: Ty 0, komputer ${s.you}.`);
        else ctx.lose("Przegrana", `Wynik: Ty ${s.me}, komputer ${s.you}.`);
      }

      function render() {
        g.fillStyle = cv.theme.bg;
        g.fillRect(0, 0, 100, 74);

        if (s.shake > 0) {
          g.save();
          g.translate((Math.random() - 0.5) * s.shake * 3, (Math.random() - 0.5) * s.shake * 3);
        }

        const targets = getTargets();

        // Rysowanie wszystkich tarcz
        targets.forEach((target, tIdx) => {
          const { cx, cy, rr, title, mult, accent } = target;
          const U = rr / 31;
          const isPlayerTarget = mode === "duel" ? target.owner === "player" : true;
          const isCurrentActive = mode === "duel"
            ? (s.aiTurn ? target.owner === "ai" : target.owner === "player")
            : (mode === "tri" ? tIdx === selectedTarget : true);

          // Tło tarczy
          g.beginPath();
          g.arc(cx, cy, rr * 1.15, 0, 7);
          g.fillStyle = accent ? "color-mix(in srgb, var(--gold) 20%, #111827)" : "#111827";
          g.fill();

          // Aktywny pierścień wokół aktywnej tarczy
          if (isCurrentActive && !ctx.done) {
            g.strokeStyle = cv.theme.c;
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(cx, cy, rr * 1.18, 0, 7);
            g.stroke();
          }

          // Segmenty pojedyncze i pierścienie
          for (let i = 0; i < 20; i++) {
            const a0 = -(Math.PI / 2) - Math.PI / 10 + i * Math.PI / 10;
            const dark = SEGS[i] % 2;
            wedge(cx, cy, a0, a0 + Math.PI / 10, 9 * U, 14 * U, dark ? "#1d232a" : "#e8e6d9");
            wedge(cx, cy, a0, a0 + Math.PI / 10, 18.5 * U, 23 * U, dark ? "#1d232a" : "#e8e6d9");

            // Pierścień potrójny i podwójny
            const redColor = accent ? "#d97706" : "#c23b32";
            const greenColor = accent ? "#ca8a04" : "#1d7a3a";
            wedge(cx, cy, a0, a0 + Math.PI / 10, 14 * U, 18.5 * U, dark ? redColor : greenColor);
            wedge(cx, cy, a0, a0 + Math.PI / 10, 23 * U, 27 * U, dark ? redColor : greenColor);

            // Numery segmentów wokół tarczy
            const an = -(Math.PI / 2) + (i + 0.5) * Math.PI / 10;
            const tx = cx + rr * 1.01 * Math.sin(an);
            const ty = cy - rr * 1.01 * Math.cos(an);
            const numSize = Math.max(2.1, rr * 0.125);
            cv.text(String(SEGS[i]), tx, ty, {
              size: numSize,
              weight: 700,
              color: "#e2e8f0",
              align: "center",
              base: "middle",
            });
          }

          // Byki (Bullseye)
          circle(cx, cy, 9 * U, accent ? "#fef08a" : "#c9d8b8");
          circle(cx, cy, 3 * U, accent ? "#e11d48" : "#c23643");

          // Tytuł i mnożnik nad tarczą
          const labelSize = mode === "tri" ? 2.5 : 3.0;
          cv.text(title, cx, cy - rr * 1.25, {
            size: labelSize,
            weight: 700,
            color: isPlayerTarget ? "p1" : "p2",
            align: "center",
            base: "bottom",
          });
          if (mult > 1) {
            cv.text(`Mnożnik x${mult}`, cx, cy + rr * 1.26, {
              size: 2.4,
              weight: 700,
              color: "gold",
              align: "center",
              base: "top",
            });
          }
        });

        // Darty siedzące w planszy
        const allDarts = [
          ...s.darts.map((d) => ({ ...d, color: cv.theme.p1 || "#3b82f6" })),
          ...s.dartsAI.map((d) => ({ ...d, color: cv.theme.p2 || "#ef4444" })),
        ];

        for (const d of allDarts) {
          const age = Math.min(1, (s.wk - d.land) / 0.4);
          const wob = (1 - age) * Math.sin(s.wk * 40) * 1.2;
          const px = d.x + wob, py = d.y + wob * 0.6;
          g.strokeStyle = d.color;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(px - 2, py - 2); g.lineTo(px + 2, py + 2);
          g.moveTo(px - 2, py + 2); g.lineTo(px + 2, py - 2);
          g.stroke();
        }

        // Dymki punktowe
        for (const p of s.pops) {
          const a = Math.max(0, 1 - p.t / 0.9);
          const px = p.x, py = p.y - 4 - p.t * 6;
          cv.text(p.text, px, py, {
            size: 3.6,
            weight: 800,
            color: p.text.startsWith("BIZ") ? "danger" : "text",
            align: "center",
            base: "middle",
          });
        }

        // Celownik gracza
        if (!ctx.done && !s.aiTurn) {
          const curTarget = getTargetFor(true);
          const ax = curTarget.cx + s.aim[0];
          const ay = curTarget.cy + s.aim[1];
          g.strokeStyle = cv.theme.text;
          g.lineWidth = 0.6;
          g.setLineDash([1.6, 1.4]);
          g.beginPath();
          g.arc(ax, ay, 3.8, 0, 7);
          g.stroke();
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(ax - 2.5, ay); g.lineTo(ax + 2.5, ay);
          g.moveTo(ax, ay - 2.5); g.lineTo(ax, ay + 2.5);
          g.stroke();
        }

        // Informacja o turze u góry
        const statusText = s.aiTurn ? "Rzut komputera..." : "Twoja runda — rzuć spacją lub kliknij";
        cv.text(statusText, 50, 4, {
          size: 3.4,
          weight: 600,
          color: s.aiTurn ? "p2" : "p1",
          align: "center",
          base: "top",
        });

        scoreEl.set(String(s.me), Math.max(0, s.me / L.start));
        matchStats.set("Komputer", String(s.you));
        matchStats.set("Runda", `${s.turn} z ${L.turns}`);
        ctx.progress(Math.max(0, 1 - Math.min(s.me, s.you) / L.start));

        if (s.shake > 0) g.restore();
      }

      function wedge(cx, cy, a0, a1, r0, r1, fill) {
        g.beginPath();
        g.arc(cx, cy, r1, a0, a1);
        g.arc(cx, cy, r0, a1, a0, true);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
      }

      function circle(cx, cy, r, fill) {
        g.beginPath();
        g.arc(cx, cy, r, 0, 7);
        g.fillStyle = fill;
        g.fill();
      }
    },
  });
}
