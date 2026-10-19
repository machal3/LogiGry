// Tarcza: rzuty dartami z drżeniem ręki, schodzenie z wyniku do zera i wyścig z komputerem.
{
  // Segmenty tarczy od góry, co 18 stopni, jak w prawdziwym dartach.
  const SEGS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 9, 12, 5, 14];
  const CX = 32, CY = 37; // środek tarczy na płótnie 100 × 74

  // Punkty za trafienie w (dx, dy) względem środka; rr — promień tarczy w pikselach.
  function scoreAt(dx, dy, rr) {
    const d = Math.hypot(dx, dy);
    const r = (d / rr) * 31; // proporcje pierścieni wyrażone w jednostkach 0–31
    if (r > 31) return { pts: 0, ring: "M", seg: 0 };
    const a = Math.atan2(dx, -dy); // 0 na górze, rośnie z zegarem
    const k = Math.round(a / (Math.PI / 10));
    const seg = SEGS[((k % 20) + 20) % 20];
    if (r <= 3) return { pts: 50, ring: "B50", seg: 0 };
    if (r <= 9) return { pts: 25, ring: "B25", seg: 0 };
    if (r <= 14) return { pts: seg, ring: "S", seg };
    if (r <= 18.5) return { pts: seg * 3, ring: "T", seg };
    if (r <= 23) return { pts: seg, ring: "S", seg };
    if (r <= 27) return { pts: seg * 2, ring: "D", seg };
    return { pts: 0, ring: "M", seg: 0 };
  }

  // Biz: wynik poniżej zera albo równy jeden kończy turę bez zmian.
  function isBust(before, hit) {
    return before - hit < 0 || before - hit === 1;
  }

  if (typeof module !== "undefined") module.exports = { scoreAt, isBust, SEGS, CX, CY };

  if (typeof registerGame !== "undefined") registerGame({
    id: "tarcza",
    cat: "zrecznosciowe",
    name: "Tarcza",
    author: "GLM 5.3 Flash",
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
      "Rzut przyciskiem Rzuć albo spacją. Trzy rzuty to runda; potem grywa komputer.",
      "Wynik schodzi o trafienia: pojedyncza liczba, podwójny i potrójny pierścień, byki to 25 i 50 punktów.",
      "Przestrzał poniżej zera albo na jeden punkt kończy rundę bez zmian. Wygrywa trafienie dokładnego zera.",
    ],
    achievements: [
      { id: "byk", name: "Byk", desc: "Trafic środek tarczy.", points: 10 },
      { id: "szeryf", name: "Szeryf", desc: "Ukończ part bez ani jednego przestrzału.", points: 25 },
      { id: "celnik", name: "Celnik", desc: "Zamknij rundę trzyma rzutami co najmniej 80 punktów.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const cv = canvasGame(board, ctx, 100, 74);
      const g = cv.g;
      const scoreEl = statBlock(ctx, "Ty", {});
      const scoreAI = statBlock(ctx, "Komputer", { small: true });
      const turnEl = statBlock(ctx, "Runda", { small: true });
      ctx.panel.append(panelBlock("Rzuty", button("Rzuć", "btn wide", () => throwDart(true)),

        el("p", "tac-leg", "Rzucić można też spacją albo kliknięciem tarczy.")));

      const s = { me: L.start, you: L.start, turn: 1, darts: [], dartsAI: [], pops: [], shake: 0,
        aim: [0, 0], aiTurn: false, roundPts: 0, busts: 0, turnStartMe: L.start, turnStartYou: L.start, wk: 0 };

      const keys = heldKeys(ctx);
      cv.loop((dt) => {
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        const ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        if (!ctx.done && !s.aiTurn) {
          if (kx || ky) s.aim = [clamp(s.aim[0] + kx * 0.9), clamp(s.aim[1] + ky * 0.9)];
        }
        s.wk += dt;
        s.shake = Math.max(0, s.shake - dt * 2.4);
        s.pops = s.pops.filter((p) => (p.t += dt) < 0.9);
        render();
      });
      ctx.on(cv.cv, "pointermove", (e) => { if (!s.aiTurn && !ctx.done) s.aim = aimAt(e); });
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.aiTurn) return;
        s.aim = aimAt(e);
        throwDart(true);
      });
      ctx.on(document, "keydown", (e) => {
        if (e.key === " " && !ctx.done && !s.aiTurn) { e.preventDefault(); throwDart(true); }
      });

      function aimAt(e) {
        const [mx, my] = cv.at(e);
        return [clamp(mx - CX), clamp(my - CY)];
      }
      const clamp = (v) => Math.max(-30, Math.min(30, v));

      function throwDart(forMe) {
        if (ctx.done || s.aiTurn !== !forMe) return;
        if ((forMe && s.darts.length >= 3) || (!forMe && s.dartsAI.length >= 3)) return;
        const jx = (Math.random() - 0.5) * 2 * L.shake;
        const jy = (Math.random() - 0.5) * 2 * L.shake;
        const x = s.aim[0] + jx, y = s.aim[1] + jy;
        const hit = scoreAt(x, y, 30);
        const darts = forMe ? s.darts : s.dartsAI;
        darts.push({ x, y, land: s.wk }); // land — moment wbicia, do animacji
        const before = forMe ? s.me : s.you;
        const hitName = hit.ring === "B50" ? "BYK 50" : hit.ring === "B25" ? "25"
          : hit.ring === "T" ? `T${hit.seg}` : hit.ring === "D" ? `D${hit.seg}`
          : hit.ring === "S" ? String(hit.seg) : "0";
        if (isBust(before, hit.pts)) {
          Sound.error();
          s.shake = 1;
          s.pops.push({ x, y, text: "BIZ", t: 0 });
          if (forMe) { s.busts++; s.me = s.turnStartMe; }
          else { s.you = s.turnStartYou; }
          return skip();
        }
        s.pops.push({ x, y, text: hitName, t: 0 });
        if (forMe) { s.me -= hit.pts; s.roundPts += hit.pts; if (hit.ring === "B50") ctx.achieve("byk"); }
        else s.you -= hit.pts;
        Sound.line();
        if ((forMe ? s.me : s.you) === 0) return finish(forMe);
        skip();
      }

      function skip() {
        if (s.aiTurn) return endTurn(false);
        endTurn(true);
      }

      function endTurn(closing) {
        if (s.aiTurn) {
          // turę zamyka komputer
          if (!ctx.done && s.turn >= L.turns) return finish(s.me < s.you);
          s.dartsAI.length = 0;
          s.roundPts = 0;
          s.aiTurn = false;
          return;
        }
        // turę zamyka gracz
        if (s.roundPts >= 80) ctx.achieve("celnik");
        s.turn++;
        s.turnStartMe = s.me;
        s.turnStartYou = s.you;
        s.darts.length = 0;
        s.aiTurn = true;
        aiThrow();
      }

      // Prosty komputer: celuje w najwyższe bezpieczne trafienie dla swojego wyniku.
      function aiThrow() {
        if (ctx.done) return;
        setTimeout(() => {
          if (ctx.done || !s.aiTurn) return;
          s.aim = aiPick(s.you);
          throwDart(false);
        }, 320 + Math.random() * 350);
      }

      function aiPick(rest) {
        // komputer nie może zostawić jedynki ani zejść pod zero, więc wybiera bezpieczne cele
        const aimSeg = (k) => {
          const i = SEGS.indexOf(k);
          const a = i * Math.PI / 10;
          return [Math.sin(a) * 11, -Math.cos(a) * 11];
        };
        if (rest >= 60) return [0, -16.5]; // potrójne 20
        if (rest === 50) return [0, 0]; // byk 50
        if (rest === 40) return [0, -25.3]; // podwójne 20
        if (rest === 25) return [0.5, -0.5]; // byk 25
        if (rest > 40) return rest === 41 ? aimSeg(20) : [0, -25.3]; // D20 zostawia 2–19
        if (rest > 20) return aimSeg(rest - 20); // pojedyncze zostawia 20 na ostatni rzut
        return aimSeg(rest);
      }

      function finish(playerWin) {
        if (playerWin && !s.busts) ctx.achieve("szeryf");
        if (playerWin) ctx.win(`Wynik: Ty 0, komputer ${s.you}.`);
        else ctx.lose("Przegrana", `Wynik: Ty ${s.me}, komputer ${s.you}.`);
      }

      function render() {
        g.fillStyle = cv.theme.bg;
        g.fillRect(0, 0, 100, 74);
        // wstrząs tarczy po bizie
        if (s.shake > 0) {
          g.save();
          g.translate((Math.random() - 0.5) * s.shake * 3, (Math.random() - 0.5) * s.shake * 3);
        }
        const rr = 30; // promień tarczy w pikselach
        const U = rr / 31; // środka jednostki pierścieni
        // segmenty pojedyncze
        for (let i = 0; i < 20; i++) {
          const a0 = -(Math.PI / 2) - Math.PI / 10 + i * Math.PI / 10;
          const dark = SEGS[i] % 2;
          wedge(a0, a0 + Math.PI / 10, 9 * U, 14 * U, dark ? darkFill() : lightFill());
          wedge(a0, a0 + Math.PI / 10, 18.5 * U, 23 * U, dark ? darkFill() : lightFill());
          // pierścień potrójny i podwójny: czerwony na ciemnych, zielony na jasnych
          wedge(a0, a0 + Math.PI / 10, 14 * U, 18.5 * U, dark ? "#c23b32" : "#1d7a3a");
          wedge(a0, a0 + Math.PI / 10, 23 * U, 27 * U, dark ? "#c23b32" : "#1d7a3a");
          // numery segmentów wokół tarczy
          const an = -(Math.PI / 2) + (i + 0.5) * Math.PI / 10;
          g.fillStyle = colorMix(cv.theme.text, 0.8);
          g.font = "3px sans-serif";
          g.textAlign = "center";
          g.fillText(String(SEGS[i]), CX + 33 * Math.sin(an), CY - 33 * Math.cos(an) + 1);
          g.textAlign = "left";
        }
        // byki
        circle(9 * U, "#c9d8b8");
        circle(3 * U, "#c23643");

        // darty siedzące w planszy: drganie przez 0.4 s po wbiciu
        for (const dset of [[s.darts, "#2b1d12"], [s.dartsAI, "#7a2020"]])
          for (const d of dset[0]) {
            const age = Math.min(1, (s.wk - d.land) / 0.4);
            const wob = (1 - age) * Math.sin(s.wk * 40) * 1.6;
            const px = CX + d.x + wob, py = CY + d.y + wob * 0.6;
            g.strokeStyle = dset[1];
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(px - 2, py - 2); g.lineTo(px + 2, py + 2);
            g.moveTo(px - 2, py + 2); g.lineTo(px + 2, py - 2);
            g.stroke();
          }
        // dymki punktowe: unoszą się i blakną
        for (const p of s.pops) {
          const a = Math.max(0, 1 - p.t / 0.9);
          g.fillStyle = p.text === "BIZ" ? `rgba(214,56,52,${a})` : `rgba(255,255,255,${a * 0.95})`;
          g.strokeStyle = `rgba(0,0,0,${a * 0.6})`;
          g.lineWidth = 0.3;
          g.font = "4px sans-serif";
          g.textAlign = "center";
          const px = CX + p.x, py = CY + p.y - 4 - p.t * 6;
          g.strokeText(p.text, px, py);
          g.fillText(p.text, px, py);
          g.textAlign = "left";
        }
        // celownik gracza
        if (!ctx.done && !s.aiTurn) {
          const [ax, ay] = s.aim;
          g.strokeStyle = cv.theme.text;
          g.lineWidth = 0.5;
          g.setLineDash([1.6, 1.4]);
          g.beginPath(); g.arc(CX + ax, CY + ay, 4, 0, 7); g.stroke();
          g.setLineDash([]);
          g.beginPath();
          g.moveTo(CX + ax - 2.6, CY + ay); g.lineTo(CX + ax + 2.6, CY + ay);
          g.moveTo(CX + ax, CY + ay - 2.6); g.lineTo(CX + ax, CY + ay + 2.6);
          g.stroke();
        }
        scoreEl.set(String(s.me), Math.max(0, s.me / L.start));
        scoreAI.set(String(s.you));
        turnEl.set(`${s.turn} z ${L.turns}`);
        ctx.progress(Math.max(0, 1 - Math.min(s.me, s.you) / L.start));
        // info: czyja runda
        g.fillStyle = colorMix(cv.theme.text, 0.7);
        g.font = "3.5px sans-serif";
        g.fillText(s.aiTurn ? "tura komputera" : "twoja runda", 66, 8);
        if (s.shake > 0) g.restore();
      }

      function wedge(a0, a1, r0, r1, fill) {
        g.beginPath();
        g.arc(CX, CY, r1, a0, a1);
        g.arc(CX, CY, r0, a1, a0, true);
        g.closePath();
        g.fillStyle = fill;
        g.fill();
      }
      function circle(r, fill) {
        g.beginPath();
        g.arc(CX, CY, r, 0, 7);
        g.fillStyle = fill;
        g.fill();
      }
      const darkFill = () => "#1d232a";
      const lightFill = () => "#e8e6d9";
      function colorMix(c, a) {
        const n = parseInt(c.slice(1), 16);
        const r = (n >> 16) & 255, gg = (n >> 8) & 255, b2 = n & 255;
        return `rgba(${r},${gg},${b2},${Math.max(0, Math.min(1, a))})`;
      }
    },
  });
}
