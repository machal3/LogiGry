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
      "Celowanie: przesuń celownik myszą albo strzałkami, na telefonie dotknij tarczy. Nad celownikiem widzisz wartość trafienia i ostrzeżenie przed bizem.",
      "Rzut przyciskiem Rzuć albo spacją. Trzy rzuty to runda; potem komputer rzuca trzy razy. Widzisz, jak celuje.",
      "Układy tarcz: pojedynek (osobna tarcza dla Ciebie i komputera), 3 tarcze z mnożnikami lub 1 tarcza.",
      "Wynik schodzi o trafienia: pojedyncza liczba, podwójny i potrójny pierścień, byki to 25 i 50 punktów.",
      "Przestrzał poniżej zera albo na jeden punkt to biz i runda bez zmian. Wygrywa trafienie dokładnego zera.",
    ],
    achievements: [
      { id: "byk", name: "Byk", desc: "Trafić środek tarczy.", points: 10 },
      { id: "szeryf", name: "Szeryf", desc: "Ukończ partię bez ani jednego przestrzału.", points: 25 },
      { id: "celnik", name: "Celnik", desc: "Zamknij rundę trzema rzutami co najmniej 80 punktów.", points: 50 },
      { id: "maksimum", name: "Maksimum", desc: "Zdobądź 180 punktów trzema rzutami w jednej rundzie.", points: 50 },
      { id: "wielotarczowiec", name: "Wielotarczowiec", desc: "Wygraj partię na więcej niż jedną tarczę.", points: 25 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74);
      const g = cv.g;

      // Barwy tarczy; tarcza premiowa (accent) ma bursztynowe pierścienie
      const KOL = {
        single: "#22272e", singleL: "#f2efe3",
        red: "#c8413a", green: "#2f7d3d",
        redA: "#d97706", greenA: "#a16207",
        ring: "#14181d", ringA: "#262117",
        wire: "rgba(160,169,178,0.9)", nums: "#e8edf4",
      };

      // Konfiguracje widoku tarcz:
      // duel: dwie tarcze (gracz po lewej, komputer po prawej)
      // tri: trzy tarcze z różnymi mnożnikami (x1, x2 premia, x3 precyzja)
      // single: jedna duża wyśrodkowana tarcza
      let mode = "duel"; // "duel" | "tri" | "single"
      let selectedTarget = 0; // dla trybu 3 tarcz

      const scoreEl = statBlock(ctx, "Twój wynik", {});
      const matchStats = statsBlock(ctx, "Mecz", ["Komputer", "Runda", "Za rundę"]);

      const segControl = segmented("Układ tarcz", ["2 tarcze", "3 tarcze", "1 tarcza"], (idx) => {
        const modes = ["duel", "tri", "single"];
        mode = modes[idx];
        s.aimMe = [0, 0];
        segControl.set(idx);
      });
      segControl.set(0);

      ctx.panel.append(
        panelBlock("Rozgrywka",
          segControl.el,
          button("Rzuć", "btn wide", () => throwDart(true)),
          el("p", "tac-leg", "Rzut: spacja, Enter lub kliknięcie tarczy. Strzałki przesuwają celownik. W trybie 3 tarcz przełączasz klawiszami 1–3."),
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
        aimMe: [0, 0],
        aimYou: [0, 0],
        aiTurn: false,
        roundPts: 0,
        roundYou: 0,
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
            { cx: 18, cy: 41, rr: 13.5, mult: 1, title: "KLASYK ×1", owner: "both" },
            { cx: 50, cy: 41, rr: 13.5, mult: 2, title: "PREMIA ×2", owner: "both", accent: true },
            { cx: 82, cy: 41, rr: 13.5, mult: 3, title: "MISTRZ ×3", owner: "both" },
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
          const maxR = curTarget.rr, st = curTarget.rr * 0.045; // krok celownika skala się z tarczą
          if (kx || ky) {
            s.aimMe = [
              Math.max(-maxR, Math.min(maxR, s.aimMe[0] + kx * st)),
              Math.max(-maxR, Math.min(maxR, s.aimMe[1] + ky * st)),
            ];
          }
        }
        s.wk += dt;
        s.shake = Math.max(0, s.shake - dt * 2.4);
        s.pops = s.pops.filter((p) => (p.t += dt) < 1.1);
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
        if (!s.aiTurn && !ctx.done) s.aimMe = aimFromEvent(e);
      });
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.aiTurn) return;
        s.aimMe = aimFromEvent(e);
        throwDart(true);
      });
      ctx.on(document, "keydown", (e) => {
        if ((e.key === " " || e.key === "Enter") && !ctx.done && !s.aiTurn) {
          e.preventDefault();
          throwDart(true);
        }
        if (mode === "tri" && !ctx.done && !s.aiTurn && ["1", "2", "3"].includes(e.key)) {
          selectedTarget = +e.key - 1;
          s.aimMe = [0, 0];
        }
      });

      // Nazwa trafienia do dymku i podglądu nad celownikiem
      function hitLabel(hit) {
        const x = hit.mult > 1 ? ` ×${hit.mult}` : "";
        if (hit.ring === "B50") return `BYK 50${x}`;
        if (hit.ring === "B25") return `25${x}`;
        if (hit.ring === "T") return `T${hit.seg}${x}`;
        if (hit.ring === "D") return `D${hit.seg}${x}`;
        if (hit.ring === "S") return `${hit.seg}${x}`;
        return "Obok";
      }

      function throwDart(forMe) {
        if (ctx.done || s.aiTurn !== !forMe) return;
        if ((forMe && s.darts.length >= 3) || (!forMe && s.dartsAI.length >= 3)) return;

        const target = getTargetFor(forMe);
        const aim = forMe ? s.aimMe : s.aimYou;
        const jx = (Math.random() - 0.5) * 2 * L.shake;
        const jy = (Math.random() - 0.5) * 2 * L.shake;
        const x = aim[0] + jx, y = aim[1] + jy;
        const hit = scoreAt(x, y, target.rr, target.mult);
        const darts = forMe ? s.darts : s.dartsAI;
        darts.push({
          x: target.cx + x,
          y: target.cy + y,
          land: s.wk,
          target,
        });

        const before = forMe ? s.me : s.you;
        if (isBust(before, hit.pts)) {
          Sound.error();
          s.shake = 1;
          s.pops.push({ x: target.cx + x, y: target.cy + y, text: "BIZ", t: 0 });
          if (forMe) { s.busts++; s.me = s.turnStartMe; s.roundPts = 0; }
          else { s.you = s.turnStartYou; s.roundYou = 0; }
          return endRound(forMe);
        }

        s.pops.push({ x: target.cx + x, y: target.cy + y, text: hitLabel(hit), t: 0, w: hit.pts });
        if (forMe) {
          s.me -= hit.pts;
          s.roundPts += hit.pts;
          if (hit.ring === "B50") { ctx.achieve("byk"); Sound.place(12); }
          if (s.roundPts >= 180) ctx.achieve("maksimum");
        } else {
          s.you -= hit.pts;
          s.roundYou += hit.pts;
        }

        hit.ring === "B50" || Sound.line();
        if ((forMe ? s.me : s.you) === 0) return finish(forMe);
        afterDart(forMe);
      }

      // po jednym darcie: w rundzie dorzucasz 3 rzuty, potem pełna runda komputera
      function afterDart(forMe) {
        const list = forMe ? s.darts : s.dartsAI;
        if (list.length < 3) {
          if (!forMe) aiThrow();
          return; // gracz celuje na kolejny rzut sam
        }
        endRound(forMe);
      }

      function endRound(forMe) {
        if (forMe) {
          // podsumowanie rundy gracza nad jego tarczą
          if (s.roundPts > 0) s.pops.push({ x: getTargetFor(true).cx, y: getTargetFor(true).cy + 2, text: `Runda ${s.roundPts}`, t: 0 });
          if (s.roundPts >= 80) ctx.achieve("celnik");
          s.turn++;
          s.turnStartMe = s.me;
          s.turnStartYou = s.you;
          s.darts.length = 0;
          s.roundPts = 0;
          s.aiTurn = true;
          s.dartsAI.length = 0;
          s.roundYou = 0;
          return aiThrow();
        }
        // podsumowanie: dymek nad tarczą komputera z punktami rundy
        if (s.roundYou > 0) s.pops.push({ x: getTargetFor(false).cx, y: getTargetFor(false).cy + 2, text: `Runda ${s.roundYou}`, t: 0 });
        if (!ctx.done && s.turn >= L.turns) return finish(s.me < s.you);
        s.dartsAI.length = 0;
        s.roundYou = 0;
        s.aiTurn = false;
      }

      function aiThrow() {
        if (ctx.done) return;
        setTimeout(() => {
          if (ctx.done || !s.aiTurn) return;
          const target = getTargetFor(false);
          s.aimYou = aiPick(s.you, target);
          throwDart(false);
        }, 450 + Math.random() * 280);
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
        // tło z lekkim rozbłyskiem nad tarczami, jak światło lampy
        g.fillStyle = cv.theme.bg;
        g.fillRect(0, 0, 100, 74);
        const glow = g.createRadialGradient(50, 20, 5, 50, 30, 62);
        glow.addColorStop(0, "rgba(255,255,255,0.05)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = glow;
        g.fillRect(0, 0, 100, 74);

        if (s.shake > 0) {
          g.save();
          g.translate((Math.random() - 0.5) * s.shake * 3, (Math.random() - 0.5) * s.shake * 3);
        }

        const targets = getTargets();

        // Tarcze
        targets.forEach((target, tIdx) => {
          const { cx, cy, rr, title, mult, accent } = target;
          const U = rr / 31;
          const isPlayerTarget = mode === "duel" ? target.owner === "player" : true;
          const isCurrentActive = mode === "duel"
            ? (s.aiTurn ? target.owner === "ai" : target.owner === "player")
            : (mode === "tri" ? tIdx === selectedTarget : true);

          drawBoard(target);

          // Posiadacz tarczy w trybie pojedynku: mały pionek nad tytułem
          if (mode === "duel") {
            cv.text(title, cx, cy - rr * 1.32, {
              size: 2.6, weight: 700,
              color: isPlayerTarget ? "p1" : "p2", align: "center", base: "bottom",
            });
          } else if (targets.length > 1) {
            cv.text(title, cx, cy - rr * 1.32, {
              size: 2.4, weight: 700,
              color: accent ? "gold" : "muted", align: "center", base: "bottom",
            });
            if (isCurrentActive) {
              g.strokeStyle = "gold";
              g.lineWidth = 0.5;
              g.beginPath();
              g.arc(cx, cy, rr * 1.24, 0, 7);
              g.stroke();
            }
          } else if (mult > 1) {
            cv.text(`Mnożnik ×${mult}`, cx, cy - rr * 1.32, {
              size: 2.4, weight: 700, color: "gold", align: "center", base: "bottom",
            });
          }
          if (mult > 1 && targets.length > 1) {
            cv.text(`×${mult}`, cx, cy + rr * 1.26, {
              size: 2.4, weight: 800, color: accent ? "gold" : "muted", align: "center", base: "top",
            });
          }

          // pulsująca obwódka aktywnej tarczy
          if (isCurrentActive && !ctx.done) {
            const pulse = 0.45 + 0.35 * Math.sin(s.wk * 3);
            g.strokeStyle = mode === "duel" ? (s.aiTurn ? "rgba(232,146,58," + pulse.toFixed(3) + ")" : "rgba(91,124,252," + pulse.toFixed(3) + ")") : "gold";
            g.setLineDash([1.8, 1.4]);
            g.lineWidth = 0.9;
            g.beginPath();
            g.arc(cx, cy, rr * 1.24, 0, 7);
            g.stroke();
            g.setLineDash([]);
          }
        });

        // darty siedzące w planszy (lot z doleciowania, potem kołysanie wygasa)
        drawDartSet(s.darts, cv.theme.p1);
        drawDartSet(s.dartsAI, cv.theme.p2);

        // widome celowanie komputera na jego tarczy
        if (s.aiTurn && !ctx.done) {
          const t = getTargetFor(false);
          const ax = t.cx + s.aimYou[0], ay = t.cy + s.aimYou[1];
          g.strokeStyle = "rgba(255,255,255,0.35)";
          g.lineWidth = 0.55;
          g.setLineDash([1.5, 1.3]);
          g.beginPath();
          g.arc(ax, ay, 3, 0, 7);
          g.stroke();
          g.setLineDash([]);
          g.strokeStyle = "rgba(255,255,255,0.5)";
          g.beginPath();
          g.moveTo(ax - 2, ay); g.lineTo(ax + 2, ay);
          g.moveTo(ax, ay - 2); g.lineTo(ax, ay + 2);
          g.stroke();
        }

        // dymki punktowe
        for (const p of s.pops) {
          const a = Math.max(0, 1 - p.t / 1.1);
          g.globalAlpha = a;
          cv.text(p.text, p.x, p.y - 4 - p.t * 6, {
            size: 3.4, weight: 800,
            color: p.text === "BIZ" ? "danger" : p.text.startsWith("Runda") ? "muted" : p.w >= 100 ? "gold" : "text",
            align: "center", base: "middle",
          });
          g.globalAlpha = 1;
        }

        // celownik gracza z podglądem wartości trafienia
        if (!ctx.done && !s.aiTurn) {
          const curTarget = getTargetFor(true);
          const ax = curTarget.cx + s.aimMe[0];
          const ay = curTarget.cy + s.aimMe[1];
          const r = Math.max(2.6, curTarget.rr * 0.12);
          g.strokeStyle = cv.theme.text;
          g.lineWidth = 0.6;
          g.setLineDash([1.6, 1.4]);
          g.beginPath();
          g.arc(ax, ay, r, 0, 7);
          g.stroke();
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(ax - r * 0.66, ay); g.lineTo(ax + r * 0.66, ay);
          g.moveTo(ax, ay - r * 0.66); g.lineTo(ax, ay + r * 0.66);
          g.stroke();
          // ile warte jest trafienie w tym miejscu; gdy mogłaby być biz, na czerwono.
          // Ciemnawa pastylka pod napisem, żeby był czytelny na jasnym byku i w ciemnym motywie
          const prev = scoreAt(s.aimMe[0], s.aimMe[1], curTarget.rr, curTarget.mult);
          const bust = prev.ring !== "M" && isBust(s.me, prev.pts);
          const label = `${prev.ring === "M" ? "—" : hitLabel(prev)}${prev.ring === "M" ? "" : ` = ${prev.pts}`}${bust ? " · biz" : ""}`;
          const wLab = label.length * 1.35 + 1.6;
          g.fillStyle = "rgba(10,13,18,0.72)";
          g.beginPath();
          g.roundRect(ax - wLab / 2, ay - r - 1.6 - 3.3, wLab, 3.4, 0.8);
          g.fill();
          cv.text(label, ax, ay - r - 1.6, {
            size: 2.4, weight: 700,
            color: bust ? cv.theme.gold : "#ffffff",
            align: "center", base: "bottom",
          });
        }

        // komunikat o turze
        const statusText = s.aiTurn ? "Komputer celuje…" : `Twoja runda — rzut ${s.darts.length + 1} z 3`;
        cv.text(statusText, 50, 5.5, {
          size: 3.2, weight: 600,
          color: s.aiTurn ? "p2" : "p1", align: "center", base: "middle",
        });

        scoreEl.set(String(s.me), Math.max(0, s.me / L.start));
        matchStats.set("Komputer", String(s.you));
        matchStats.set("Runda", `${s.turn} z ${L.turns}`);
        matchStats.set("Za rundę", s.roundPts ? `${s.roundPts} pkt` : "–");
        ctx.progress(Math.max(0, 1 - Math.min(s.me, s.you) / L.start));

        if (s.shake > 0) g.restore();
      }

      // tarcza: cień, ciemna otoka z numerami, kliny, druty, byki, polerowanie
      function drawBoard(t) {
        const { cx, cy, rr, accent } = t;
        const U = rr / 31;
        const red = accent ? KOL.redA : KOL.red;
        const green = accent ? KOL.greenA : KOL.green;
        const dark = KOL.single, light = KOL.singleL;

        // cień na ścianie
        g.beginPath();
        g.arc(cx + rr * 0.03, cy + rr * 0.07, rr * 1.16, 0, 7);
        g.fillStyle = "rgba(10,14,20,0.15)";
        g.fill();

        // ciemna otoka z numerami
        g.beginPath();
        g.arc(cx, cy, rr * 1.16, 0, 7);
        g.fillStyle = accent ? KOL.ringA : KOL.ring;
        g.fill();

        // kliny: pojedyncze (jasne/ciemne), potrójny i podwójny (barwne)
        for (let i = 0; i < 20; i++) {
          const a0 = -(Math.PI / 2) - Math.PI / 10 + i * Math.PI / 10;
          const dk = SEGS[i] % 2;
          wedge(cx, cy, a0, a0 + Math.PI / 10, 9 * U, 14 * U, dk ? dark : light);
          wedge(cx, cy, a0, a0 + Math.PI / 10, 23 * U, 27 * U, dk ? dark : light);
          wedge(cx, cy, a0, a0 + Math.PI / 10, 14 * U, 18.5 * U, dk ? red : green);
          wedge(cx, cy, a0, a0 + Math.PI / 10, 3 * U, 9 * U, dk ? dark : light);
        }

        // półton: światło wyżej, cień przy krawędzi — daje wypukłość
        const pol = g.createRadialGradient(cx - rr * 0.2, cy - rr * 0.3, rr * 0.1, cx, cy, rr * 1.16);
        pol.addColorStop(0, "rgba(255,255,255,0.08)");
        pol.addColorStop(0.7, "rgba(255,255,255,0)");
        pol.addColorStop(1, "rgba(6,8,12,0.4)");
        g.beginPath();
        g.arc(cx, cy, rr * 1.16, 0, 7);
        g.fillStyle = pol;
        g.fill();

        // druty (spider) i krawędzie pierścieni
        g.strokeStyle = KOL.wire;
        g.lineWidth = Math.max(0.16, U * 0.2);
        for (const rad of [3, 9, 14, 18.5, 23, 27]) {
          g.beginPath();
          g.arc(cx, cy, rad * U, 0, 7);
          g.stroke();
        }
        for (let i = 0; i < 20; i++) {
          const ang = -(Math.PI / 2) - Math.PI / 10 + i * Math.PI / 10;
          g.beginPath();
          g.moveTo(cx + Math.sin(ang) * 3 * U, cy - Math.cos(ang) * 3 * U);
          g.lineTo(cx + Math.sin(ang) * 27 * U, cy - Math.cos(ang) * 27 * U);
          g.stroke();
        }

        // byki: pierścień 25 i byk 50, z drobnym błyskiem
        circle(cx, cy, 9 * U, accent ? "#f0d78a" : "#dfd6b8");
        circle(cx, cy, 3 * U, accent ? "#c23d33" : "#d2453c");
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.beginPath();
        g.arc(cx - U, cy - U * 0.8, U * 0.5, 0, 7);
        g.fill();

        // numery segmentów otoki
        const numSize = Math.max(2.0, rr * 0.125);
        for (let i = 0; i < 20; i++) {
          const an = -(Math.PI / 2) + (i + 0.5) * Math.PI / 10;
          cv.text(String(SEGS[i]), cx + rr * 1.03 * Math.sin(an), cy - rr * 1.03 * Math.cos(an), {
            size: numSize, weight: 700, color: KOL.nums, align: "center", base: "middle",
          });
        }
      }

      // komplet dartów jednej strony: lot w 0,35 s z góry, potem wygasa kołysanie; obwódka trafiań
      function drawDartSet(list, color) {
        for (const d of list) {
          const ph = s.wk - d.land;
          const fall = Math.min(1, ph / 0.35);
          let y = -9 * (1 - fall) * (1 - fall);
          let rot = (1 - fall) * 1.1;
          let wob = fall >= 1 ? Math.max(0, 1 - (ph - 0.35) * 2.2) * Math.sin((ph - 0.35) * 26) * 0.35 : 0;
          // znacznik trafienia obok dartu, gdy już się zadomowił
          if (fall >= 1) {
            g.strokeStyle = color;
            g.lineWidth = 0.45;
            g.beginPath();
            g.arc(d.x + wob * 0.6, d.y, 0.9, 0, 7);
            g.stroke();
          }
          g.save();
          g.translate(d.x + wob * 0.6, d.y + y);
          // cień pod dartem
          g.fillStyle = "rgba(8,10,14,0.25)";
          g.beginPath();
          g.ellipse(0.6, 1.3, 1.4, 0.5, 0, 0, 7);
          g.fill();
          g.rotate(0.85 + rot);
          // grot
          g.strokeStyle = "#2b323a";
          g.lineWidth = 0.5;
          g.beginPath();
          g.moveTo(-1.4, 0); g.lineTo(-0.2, 0);
          g.stroke();
          // trzpień
          g.strokeStyle = "#e4eaf0";
          g.lineWidth = 0.6;
          g.beginPath();
          g.moveTo(-0.2, 0); g.lineTo(2.6, 0);
          g.stroke();
          // lotka: dwa skrzydła na końcu trzpienia, z białą obwódką dla kontrastu
          g.fillStyle = color;
          g.beginPath();
          g.moveTo(2.6, 0);
          g.lineTo(3.0, -1.25);
          g.lineTo(4.4, -0.9);
          g.lineTo(3.6, 0);
          g.lineTo(4.4, 0.9);
          g.lineTo(3.0, 1.25);
          g.closePath();
          g.fill();
          g.strokeStyle = "rgba(255,255,255,0.55)";
          g.lineWidth = 0.28;
          g.stroke();
          // przyćmiona połowa lotki dla plastyczności
          g.fillStyle = "rgba(8,10,14,0.3)";
          g.beginPath();
          g.moveTo(2.6, 0);
          g.lineTo(3.6, 0);
          g.lineTo(4.4, 0.9);
          g.lineTo(3.0, 1.25);
          g.closePath();
          g.fill();
          g.restore();
        }
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
