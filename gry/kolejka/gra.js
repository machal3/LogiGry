// Kolejka: trójwymiarowy symulator i projektant kolejki górskiej (roller coaster).
// Kształtowanie profilu wysokościowego toru, fizyka energii potencjalnej i kinetycznej, przeciążenia G oraz emocje pasażerów.
{
  const GRAVITY = 9.81;

  // Oblicza krzywiznę pionową w węźle i na podstawie zmiany nachylenia między sąsiednimi przęsłami (p_{i-1} -> p_i -> p_{i+1}).
  // Dodatnia krzywizna = dolina (dociążenie +G), ujemna krzywizna = szczyt wzniesienia (nieważkość / -G), zero = płaski tor.
  function computeNodeCurvatures(nodes) {
    const n = nodes.length;
    const curvatures = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      const pPrev = nodes[i - 1];
      const pCur = nodes[i];
      const pNext = nodes[i + 1];

      const dx1 = Math.max(8, Math.hypot(pCur.x - pPrev.x, pCur.y - pPrev.y));
      const dx2 = Math.max(8, Math.hypot(pNext.x - pCur.x, pNext.y - pCur.y));

      // Nachylenie toru (dh / dx): dodatnie pod górę, ujemne w dół
      const slope1 = (pCur.h - pPrev.h) / dx1;
      const slope2 = (pNext.h - pCur.h) / dx2;

      const angle1 = Math.atan(slope1);
      const angle2 = Math.atan(slope2);
      const dAngle = angle2 - angle1; // > 0 w dolinie, < 0 na szczycie
      const arcLen = (dx1 + dx2) * 0.55;
      curvatures[i] = dAngle / Math.max(14, arcLen);
    }
    return curvatures;
  }

  // Oblicza profil prędkości, przeciążenia pionowe i powodzenie przejazdu po węzłach toru
  function simulateCoaster(nodes, friction = 0.04) {
    if (!nodes || nodes.length < 3) return { success: false, reason: "Za mało węzłów" };

    const curvatures = computeNodeCurvatures(nodes);
    const samples = [];
    let curV = 8.0; // prędkość początkowa z napędu stacji (lift hill)
    let maxV = curV;
    let maxG = 1.0;
    let minG = 1.0;
    let totalThrill = 0;
    let airtimeSteps = 0;

    // Pierwsza próbka na stacji startowej
    samples.push({
      x: nodes[0].x,
      y: nodes[0].y,
      h: nodes[0].h,
      v: curV,
      g: 1.0,
      slope: 0,
      segIdx: 0,
    });

    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i];
      const p1 = nodes[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const horizDist = Math.max(1, Math.hypot(dx, dy));
      const dh = p0.h - p1.h; // spadek wysokości (dodatni = zjazd w dół)
      const dist = Math.hypot(dx, dy, dh);
      const slope = (p1.h - p0.h) / horizDist;
      const cosTheta = 1 / Math.sqrt(1 + slope * slope);

      const isLiftHill = i === 0 && p1.h > p0.h; // wyciąg łańcuchowy na pierwszy szczyt

      const steps = Math.max(10, Math.round(dist * 0.6));
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const h = p0.h + (p1.h - p0.h) * t;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;

        if (isLiftHill) {
          curV = 8.0;
        } else {
          // Bilans energii w pod-kroku: tarcie dzielone przez liczbę krokówsteps
          const energyV2 = curV * curV + 2 * GRAVITY * (dh / steps) - (friction * dist) / steps;
          if (energyV2 <= 1.2) {
            return {
              success: false,
              reason: `Wagonik utknął na wzniesieniu ${i + 1} z braku energii`,
              samples,
              maxV,
              maxG,
              minG,
              thrill: Math.round(totalThrill / Math.max(1, samples.length) * 35),
            };
          }
          curV = Math.sqrt(energyV2);
        }
        maxV = Math.max(maxV, curV);

        // Krzywizna pionowa skupia się wokół węzłów (gładki profil cosinusowy wokół p0 i p1)
        const w0 = Math.max(0, Math.cos(t * Math.PI * 0.5));
        const w1 = Math.max(0, Math.sin(t * Math.PI * 0.5));
        const effKappa = curvatures[i] * (w0 * w0) + curvatures[i + 1] * (w1 * w1);

        // Przeciążenie pionowe: składowa grawitacji + przyśpieszenie odśrodkowe v^2 * kappa / g
        const gForce = Number((cosTheta + (curV * curV * effKappa) / GRAVITY).toFixed(2));
        maxG = Math.max(maxG, gForce);
        minG = Math.min(minG, gForce);

        if (gForce > 5.5) {
          return {
            success: false,
            reason: `Zbyt duże przeciążenie (${gForce.toFixed(1)}G) na przęśle ${i + 1}`,
            samples,
            maxV,
            maxG,
            minG,
            thrill: Math.round((totalThrill / Math.max(1, samples.length)) * 35),
          };
        }
        if (gForce < -1.8) {
          return {
            success: false,
            reason: `Zbyt silne przeciążenie ujemne (${gForce.toFixed(1)}G) na szczycie ${i + 1}`,
            samples,
            maxV,
            maxG,
            minG,
            thrill: Math.round((totalThrill / Math.max(1, samples.length)) * 35),
          };
        }

        // Emocje pasażerów: prędkość + dociążenia w dolinach + nieważkość (airtime) na grzbietach
        const posGBonus = Math.max(0, gForce - 1.05) * 1.15;
        const airBonus = gForce < 0.75 ? (0.75 - gForce) * 1.35 : 0;
        if (gForce < 0.6) airtimeSteps++;
        const dropBonus = dh > 0 ? (dh / horizDist) * 0.45 : 0;
        totalThrill += curV * 0.065 + posGBonus + airBonus + dropBonus;

        samples.push({ x, y, h, v: curV, g: gForce, slope, segIdx: i });
      }
    }

    const avgThrill = totalThrill / Math.max(1, samples.length);
    const varietyBonus = Math.min(18, (maxG - 1.0) * 3.5 + (airtimeSteps > 4 ? 5 : 0));
    const normThrill = Math.min(100, Math.round(avgThrill * 28 + varietyBonus));
    return {
      success: true,
      samples,
      maxV,
      maxG,
      minG,
      thrill: normThrill,
    };
  }

  function getDefaultNodes(count) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = Math.round(28 + t * 244);
      const y = Math.round(118 + Math.sin(t * Math.PI * 2) * 18);
      let h = 12;
      if (i === 0) h = 12; // stacja startowa
      else if (i === count - 1) h = 8; // stacja końcowa
      else if (i === 1) h = 44; // szczyt pierwszego wyciągu
      else if (i === 2) h = 14; // pierwsza dolina
      else if (i === 3) h = 32; // drugie wzniesienie
      else if (i === 4) h = 12; // druga dolina
      else if (i === 5) h = 26; // trzeci grzbiet
      else if (i === 6) h = 12;
      else if (i === 7) h = 22;
      else h = 14;
      nodes.push({ id: i, x, y, h: Math.round(h / 2) * 2 });
    }
    return nodes;
  }

  // Wyznacza bramki pomiarowe na trasie (sugerowane strefy wysokości do zaliczenia premii emocji)
  function getGatesForNodes(nodes) {
    const gates = [];
    if (nodes.length >= 6) {
      gates.push({ nodeIdx: 1, targetH: 46, label: "Szczyt" });
      gates.push({ nodeIdx: 2, targetH: 10, label: "Dolina" });
      gates.push({ nodeIdx: 3, targetH: 34, label: "Skok" });
    }
    if (nodes.length >= 8) {
      gates.push({ nodeIdx: 5, targetH: 28, label: "Grzbiet" });
    }
    if (nodes.length >= 10) {
      gates.push({ nodeIdx: 7, targetH: 24, label: "Finał" });
    }
    return gates;
  }

  if (typeof module !== "undefined") {
    module.exports = { simulateCoaster, getDefaultNodes, computeNodeCurvatures, getGatesForNodes };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "kolejka",
    cat: "symulacje",
    big: true,
    name: "Kolejka",
    author: "Gemini 4 Argon",
    desc: "Projektuj trójwymiarowy tor kolejki górskiej z pętlami i wzniesieniami tak, by wagonik bezpiecznie dojechał.",
    color: "#db2777",
    ink: "#ffffff",
    glyph: [
      ".###.",
      "#...#",
      "..##.",
      ".#...",
      "#####",
    ],
    levels: [
      { key: "easy", name: "Łatwy", points: 20, nodeCount: 6, minThrill: 50 },
      { key: "medium", name: "Średni", points: 50, nodeCount: 8, minThrill: 65 },
      { key: "hard", name: "Trudny", points: 100, nodeCount: 10, minThrill: 76 },
    ],
    rules: [
      "Chwyć głowicę podpory myszką lub palcem i przeciągaj ją w górę lub w dół (albo użyj klawiszy Lewo/Prawo oraz W/S).",
      "Pierwszy wysoki szczyt nadaje pociągowi prędkość; w dolinach powstaje dodatnie przeciążenie G, a na grzbietach stan nieważkości.",
      "Przeprowadź tor przez bramki pomiarowe i unikaj zbyt ostrych załamań, które przekraczają 5.5G.",
      "Uruchom przejazd testowy (Spacja) i zdobądź wymaganą ocenę emocji pasażerów.",
    ],
    achievements: [
      { id: "pierwszy-zjazd", name: "Pierwszy zjazd", desc: "Zbuduj tor, który bezpiecznie dowiezie pasażerów do stacji.", points: 10 },
      { id: "przeciazenie-mistrz", name: "Zastrzyk adrenaliny", desc: "Osiągnij przeciążenie powyżej 3.5G bez wykolejenia.", points: 25 },
      { id: "pelna-ekscytacja", name: "Ekstremalna pętla", desc: "Zdobądź co najmniej 75 punktów emocji w jednym przejeździe.", points: 25 },
      { id: "inzynier-parku", name: "Główny inżynier", desc: "Wygraj trudny poziom z oceną emocji co najmniej 76 punktów.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, nodeCount, minThrill } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96 });
      const { g } = cv;

      const s = {
        nodes: getDefaultNodes(nodeCount),
        gates: [],
        selectedNode: 1,
        dragging: false,
        dragUndoSaved: false,
        simulating: false,
        cartIdx: 0,
        simRes: null,
        sparks: [],
        emotes: [],
      };
      s.gates = getGatesForNodes(s.nodes);
      s.simRes = simulateCoaster(s.nodes);

      const snapshotHeights = () => s.nodes.map((n) => n.h);
      const saveUndo = ctx.undoable((prevHeights) => {
        if (!prevHeights || prevHeights.length !== s.nodes.length) return;
        s.simulating = false;
        s.nodes.forEach((n, i) => {
          n.h = prevHeights[i];
        });
        s.simRes = simulateCoaster(s.nodes);
        Sound.erase();
        updatePanel();
      });

      const thrillEl = statBlock(ctx, "Emocje pasażerów", { meter: true });
      const gForceEl = statBlock(ctx, "Przeciążenie i pęd", { small: true });
      const statusEl = statBlock(ctx, "Wybrana podpora", { small: true });

      const rowBtns = el("div", "panel-row");
      const upBtn = button("Podnieś (W)", "btn-ghost", () => adjustNodeHeight(2));
      const downBtn = button("Obniż (S)", "btn-ghost", () => adjustNodeHeight(-2));
      rowBtns.append(upBtn, downBtn);

      const testBtn = button("Przejazd testowy (Spacja)", "btn wide", () => startSimulation());
      ctx.panel.append(panelBlock("Projektowanie toru", rowBtns, testBtn));

      function countPassedGates() {
        let passed = 0;
        for (const gt of s.gates) {
          const n = s.nodes[gt.nodeIdx];
          if (n && Math.abs(n.h - gt.targetH) <= 6) passed++;
        }
        return passed;
      }

      function getEffectiveThrill(sim) {
        if (!sim || !sim.success) return sim ? sim.thrill || 0 : 0;
        const gateBonus = countPassedGates() * 4;
        return Math.min(100, (sim.thrill || 0) + gateBonus);
      }

      function updatePanel() {
        const curSim = s.simRes || simulateCoaster(s.nodes);
        const effThrill = getEffectiveThrill(curSim);
        thrillEl.set(
          `${effThrill} / ${minThrill} pkt`,
          effThrill / minThrill,
          curSim.success ? `Bramki pomiarowe: ${countPassedGates()} z ${s.gates.length}` : curSim.reason
        );
        gForceEl.set(
          `${(curSim.maxG || 1).toFixed(1)}G · ${Math.round((curSim.maxV || 0) * 3.6)} km/h`,
          null,
          curSim.maxG > 5.0 ? "Przeciążenie bliskie granicy" : "Przeciążenia w normie"
        );
        const selN = s.nodes[s.selectedNode];
        statusEl.set(
          `Podpora ${s.selectedNode + 1} z ${s.nodes.length}`,
          null,
          `Wysokość: ${selN.h} m · ${
            s.selectedNode === 0 || s.selectedNode === s.nodes.length - 1
              ? "Stacja stała"
              : selN.h >= 40
              ? "Wysoki szczyt"
              : selN.h <= 14
              ? "Dno doliny"
              : "Pośrednie przęsło"
          }`
        );
        testBtn.textContent = s.simulating ? "Zatrzymaj przejazd (Spacja)" : "Przejazd testowy (Spacja)";
        ctx.progress(Math.min(1, effThrill / minThrill));
      }

      function adjustNodeHeight(dh) {
        if (ctx.done || s.simulating) return;
        const n = s.nodes[s.selectedNode];
        if (s.selectedNode === 0 || s.selectedNode === s.nodes.length - 1) {
          ctx.toast("Wysokość stacji początkowej i końcowej jest stała.");
          return;
        }
        const nextH = Math.max(6, Math.min(52, Math.round((n.h + dh) / 2) * 2));
        if (nextH === n.h) return;
        saveUndo(snapshotHeights());
        n.h = nextH;
        Sound.tap();
        s.simRes = simulateCoaster(s.nodes);
        updatePanel();
      }

      function startSimulation() {
        if (ctx.done) return;
        if (s.simulating) {
          s.simulating = false;
          Sound.tap();
          updatePanel();
          return;
        }
        s.simRes = simulateCoaster(s.nodes);
        s.simulating = true;
        s.cartIdx = 0;
        Sound.line();
        ctx.toast("Pociąg rusza ze stacji początkowej.");
        updatePanel();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          e.preventDefault();
          s.selectedNode = Math.max(1, s.selectedNode - 1);
          Sound.tap();
          updatePanel();
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          e.preventDefault();
          s.selectedNode = Math.min(s.nodes.length - 2, s.selectedNode + 1);
          Sound.tap();
          updatePanel();
        } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          e.preventDefault();
          adjustNodeHeight(2);
        } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
          e.preventDefault();
          adjustNodeHeight(-2);
        } else if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startSimulation();
        }
      });

      // Chwytanie i płynne przeciąganie głowicy podpory myszką lub dotykiem (co 2 m)
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done || s.simulating) return;
        const [x, y] = cv.at(e);
        let bestDist = Infinity;
        let bestIdx = -1;
        s.nodes.forEach((n, i) => {
          const sx = n.x;
          const sy = n.y - n.h * 1.5;
          const headDist = Math.hypot(x - sx, y - sy);
          const colDist = Math.abs(x - sx) < 12 && y >= sy - 10 && y <= n.y + 15 ? Math.abs(x - sx) + 6 : Infinity;
          const d = Math.min(headDist, colDist);
          if (d < 24 && d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0) {
          s.selectedNode = bestIdx;
          if (bestIdx > 0 && bestIdx < s.nodes.length - 1) {
            s.dragging = true;
            s.dragUndoSaved = false;
          } else {
            ctx.toast("Wysokość stacji początkowej i końcowej jest stała.");
          }
          Sound.tap();
          updatePanel();
        }
      });

      ctx.on(cv.cv, "pointermove", (e) => {
        if (!s.dragging || ctx.done || s.simulating) return;
        const [, y] = cv.at(e);
        const n = s.nodes[s.selectedNode];
        if (!n || s.selectedNode === 0 || s.selectedNode === s.nodes.length - 1) return;
        const rawH = (n.y - y) / 1.5;
        const snappedH = Math.max(6, Math.min(52, Math.round(rawH / 2) * 2));
        if (snappedH !== n.h) {
          if (!s.dragUndoSaved) {
            saveUndo(snapshotHeights());
            s.dragUndoSaved = true;
          }
          n.h = snappedH;
          s.simRes = simulateCoaster(s.nodes);
          Sound.tap();
          updatePanel();
        }
      });

      ctx.on(document, "pointerup", () => {
        s.dragging = false;
        s.dragUndoSaved = false;
      });

      updatePanel();

      // Pomocnicze wyliczanie pozycji na wygładzonej krzywej toru dla u in [0, nodes.length - 1]
      function evalTrackPoint(u) {
        const seg = Math.max(0, Math.min(s.nodes.length - 2, Math.floor(u)));
        const t = Math.max(0, Math.min(1, u - seg));
        const n0 = s.nodes[seg];
        const n1 = s.nodes[seg + 1];
        const x = n0.x + (n1.x - n0.x) * t;
        // Wygładzenie wysokości wielomianem Hermite'a między podporami
        const smoothT = t * t * (3 - 2 * t);
        const h = n0.h + (n1.h - n0.h) * smoothT;
        const y = n0.y + (n1.y - n0.y) * t;
        const sx = x;
        const sy = y - h * 1.5;

        const dt = 0.02;
        const t2 = Math.min(1, t + dt);
        const sm2 = t2 * t2 * (3 - 2 * t2);
        const x2 = n0.x + (n1.x - n0.x) * t2;
        const y2 = (n0.y + (n1.y - n0.y) * t2) - (n0.h + (n1.h - n0.h) * sm2) * 1.5;
        const angle = Math.atan2(y2 - sy, Math.max(0.01, x2 - sx));
        return { sx, sy, h, angle };
      }

      cv.loop((dt, now) => {
        // Logika przejazdu pociągu
        if (s.simulating && s.simRes) {
          if (s.simRes.samples && s.cartIdx < s.simRes.samples.length) {
            const curSample = s.simRes.samples[Math.floor(s.cartIdx)];
            const stepRate = curSample ? Math.max(22, curSample.v * 2.4) : 34;
            s.cartIdx += dt * stepRate;

            if (curSample && curSample.g >= 3.5 && s.simRes.success) {
              ctx.achieve("przeciazenie-mistrz");
            }

            if (s.cartIdx >= s.simRes.samples.length) {
              s.simulating = false;
              const effThrill = getEffectiveThrill(s.simRes);
              if (s.simRes.success) {
                ctx.achieve("pierwszy-zjazd");
                if (effThrill >= 75) {
                  ctx.achieve("pelna-ekscytacja");
                }
                if (effThrill >= minThrill) {
                  if (key === "hard" && effThrill >= 76) {
                    ctx.achieve("inzynier-parku");
                  }
                  ctx.win(`Zjazd ukończony. Pasażerowie ocenili przejazd na ${effThrill} punktów emocji.`);
                  return;
                } else {
                  ctx.toast(`Zjazd bezpieczny, lecz emocje (${effThrill} pkt) poniżej wymogu (${minThrill} pkt).`);
                }
              } else {
                Sound.error();
                ctx.toast(s.simRes.reason);
              }
              updatePanel();
            }
          } else {
            s.simulating = false;
          }
        }

        // --- RYSOWANIE PARKU ROZRYWKI I KOLEJKI GÓRSKIEJ ---
        const skyGrad = g.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#0f172a");
        skyGrad.addColorStop(0.58, "#1e293b");
        skyGrad.addColorStop(1, "#064e3b");
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, H);

        // Chmury na niebie
        g.fillStyle = "rgba(255, 255, 255, 0.1)";
        for (let c = 0; c < 3; c++) {
          const cx = ((now * 0.006 + c * 110) % (W + 60)) - 30;
          const cy = 28 + c * 13;
          g.beginPath();
          g.arc(cx, cy, 12, 0, Math.PI * 2);
          g.arc(cx + 9, cy - 3, 9, 0, Math.PI * 2);
          g.arc(cx + 18, cy, 11, 0, Math.PI * 2);
          g.fill();
        }

        // Diabelski młyn w tle parku rozrywki
        const fwX = 248, fwY = 92, fwR = 26;
        g.strokeStyle = "rgba(148, 163, 184, 0.25)";
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(fwX - 14, 132);
        g.lineTo(fwX, fwY);
        g.lineTo(fwX + 14, 132);
        g.stroke();

        g.strokeStyle = "rgba(244, 114, 182, 0.28)";
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(fwX, fwY, fwR, 0, Math.PI * 2);
        g.stroke();

        const wheelAng = now * 0.0004;
        for (let sp = 0; sp < 8; sp++) {
          const a = wheelAng + (sp * Math.PI) / 4;
          const gx = fwX + Math.cos(a) * fwR;
          const gy = fwY + Math.sin(a) * fwR;
          g.strokeStyle = "rgba(148, 163, 184, 0.18)";
          g.lineWidth = 0.7;
          g.beginPath();
          g.moveTo(fwX, fwY);
          g.lineTo(gx, gy);
          g.stroke();

          g.fillStyle = "rgba(251, 191, 36, 0.35)";
          g.fillRect(gx - 2, gy, 4, 3.5);
        }

        // Wzgórza i sylwetki drzew w oddali
        g.fillStyle = "#065f46";
        g.beginPath();
        g.moveTo(0, 142);
        g.quadraticCurveTo(75, 118, 155, 136);
        g.quadraticCurveTo(235, 118, W, 140);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        // Drzewa parkowe
        g.fillStyle = "#047857";
        for (const tx of [18, 52, 92, 138, 185, 222, 280]) {
          g.beginPath();
          g.moveTo(tx, 126);
          g.lineTo(tx - 5, 140);
          g.lineTo(tx + 5, 140);
          g.closePath();
          g.fill();
        }

        // Górny pasek informacyjny z oceną projektu i podpowiedzią
        g.fillStyle = "rgba(15, 23, 42, 0.72)";
        g.fillRect(0, 0, W, 19);
        const curSim = s.simRes || simulateCoaster(s.nodes);
        const effThrill = getEffectiveThrill(curSim);
        cv.text(`Emocje: ${effThrill}/${minThrill} pkt · Maks. ${(curSim.maxG || 1).toFixed(1)}G`, 8, 9.5, {
          size: 5.0,
          weight: 700,
          color: curSim.success ? "#f8fafc" : "bad",
          align: "left",
        });
        cv.text("Przeciągnij głowicę podpory w górę lub w dół", W - 8, 9.5, {
          size: 4.6,
          weight: 600,
          color: "#cbd5e1",
          align: "right",
        });

        // Bramki pomiarowe (sugerowane wysokości na trasie)
        for (const gt of s.gates) {
          const n = s.nodes[gt.nodeIdx];
          if (!n) continue;
          const gx = n.x;
          const gy = n.y - gt.targetH * 1.5;
          const reached = Math.abs(n.h - gt.targetH) <= 6;

          g.strokeStyle = reached ? "#10b981" : "rgba(251, 191, 36, 0.55)";
          g.lineWidth = 1.3;
          g.setLineDash(reached ? [] : [2.5, 2.5]);
          g.beginPath();
          g.ellipse(gx, gy, 5.5, 9.5, 0, 0, Math.PI * 2);
          g.stroke();
          g.setLineDash([]);

          const nodeTopY = n.y - n.h * 1.5;
          const gateLabelY = Math.min(gy - 13, nodeTopY - 16);
          cv.text(`${gt.label} ${gt.targetH}m`, gx, gateLabelY, {
            size: 4.3,
            weight: 700,
            color: reached ? "#34d399" : "#fcd34d",
            align: "center",
          });
        }

        // Stalowe kratownice / podpory węzłów oraz etykiety wysokości
        s.nodes.forEach((n, i) => {
          const isSel = i === s.selectedNode;
          const baseY = n.y + 15;
          const topY = n.y - n.h * 1.5;

          // Cień podpory na ziemi
          g.fillStyle = "rgba(0, 0, 0, 0.35)";
          g.beginPath();
          g.ellipse(n.x, baseY, 8.5, 3.2, 0, 0, Math.PI * 2);
          g.fill();

          // Kratownica pionowa podpory
          g.strokeStyle = isSel ? "#fbbf24" : "rgba(148, 163, 184, 0.65)";
          g.lineWidth = isSel ? 2.0 : 1.2;
          g.beginPath();
          g.moveTo(n.x - 4, baseY);
          g.lineTo(n.x - 2, topY);
          g.moveTo(n.x + 4, baseY);
          g.lineTo(n.x + 2, topY);
          for (let yStep = baseY; yStep > topY + 7; yStep -= 9) {
            g.moveTo(n.x - 3, yStep);
            g.lineTo(n.x + 3, yStep - 5);
          }
          g.stroke();

          // Etykieta wysokości nad podporą (przez cv.text)
          if (i > 0 && i < s.nodes.length - 1) {
            cv.text(`${n.h} m`, n.x, topY - 8.5, {
              size: isSel ? 5.2 : 4.4,
              weight: 700,
              color: isSel ? "#fde047" : "#e2e8f0",
              align: "center",
            });
          }
        });

        // Podkłady kolejowe i szyny (kolorowane wg przeciążenia G na danym odcinku)
        const curvatures = computeNodeCurvatures(s.nodes);
        for (let seg = 0; seg < s.nodes.length - 1; seg++) {
          const subSteps = 14;
          for (let k = 0; k < subSteps; k++) {
            const u1 = seg + k / subSteps;
            const u2 = seg + (k + 1) / subSteps;
            const pt1 = evalTrackPoint(u1);
            const pt2 = evalTrackPoint(u2);

            // Podkład kolejowy prostopadły do toru
            if (k % 2 === 0) {
              const nx = -Math.sin(pt1.angle) * 3.2;
              const ny = Math.cos(pt1.angle) * 3.2;
              g.strokeStyle = "#94a3b8";
              g.lineWidth = 1.1;
              g.beginPath();
              g.moveTo(pt1.sx - nx, pt1.sy - ny);
              g.lineTo(pt1.sx + nx, pt1.sy + ny);
              g.stroke();
            }

            // Kolor szyny sygnalizujący lokalne przeciążenie G
            const localKappa = Math.abs(
              curvatures[seg] * (1 - k / subSteps) + curvatures[seg + 1] * (k / subSteps)
            );
            let railColor = "#db2777";
            if (localKappa > 0.048) railColor = "#ef4444";
            else if (localKappa > 0.028) railColor = "#f59e0b";

            g.strokeStyle = railColor;
            g.lineWidth = 3.2;
            g.lineCap = "round";
            g.beginPath();
            g.moveTo(pt1.sx, pt1.sy);
            g.lineTo(pt2.sx, pt2.sy);
            g.stroke();

            g.strokeStyle = "#f9a8d4";
            g.lineWidth = 1.0;
            g.beginPath();
            g.moveTo(pt1.sx, pt1.sy - 0.8);
            g.lineTo(pt2.sx, pt2.sy - 0.8);
            g.stroke();
          }
        }

        // Głowice podpór (uchwyty do przeciągania)
        s.nodes.forEach((n, i) => {
          const isSel = i === s.selectedNode;
          const topY = n.y - n.h * 1.5;
          const movable = i > 0 && i < s.nodes.length - 1;
          g.fillStyle = isSel ? "#f59e0b" : movable ? "#db2777" : "#475569";
          g.strokeStyle = "#ffffff";
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(n.x, topY, isSel ? 5.6 : 4.2, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        });

        // Stacja początkowa i końcowa (napisy przez cv.text)
        const st0 = s.nodes[0];
        const st0Y = st0.y - st0.h * 1.5;
        g.fillStyle = "#2563eb";
        g.beginPath();
        g.roundRect(st0.x - 15, st0Y - 6, 30, 12, 2.5);
        g.fill();
        cv.text("START", st0.x, st0Y, { size: 4.8, weight: 700, color: "#ffffff", align: "center" });

        const stEnd = s.nodes[s.nodes.length - 1];
        const stEndY = stEnd.y - stEnd.h * 1.5;
        g.fillStyle = "#059669";
        g.beginPath();
        g.roundRect(stEnd.x - 15, stEndY - 6, 30, 12, 2.5);
        g.fill();
        cv.text("META", stEnd.x, stEndY, { size: 4.8, weight: 700, color: "#ffffff", align: "center" });

        // Pociąg 2-wagonikowy na torze
        let leadPos = null;
        let trailPos = null;
        let cartV = 0;
        let cartG = 1.0;

        if (s.simulating && s.simRes && s.simRes.samples && s.simRes.samples.length > 0) {
          const sIdx = Math.min(s.simRes.samples.length - 1, Math.floor(s.cartIdx));
          const trailIdx = Math.max(0, sIdx - 4);
          const smp = s.simRes.samples[sIdx];
          const smpTrail = s.simRes.samples[trailIdx];
          if (smp) {
            leadPos = {
              x: smp.x,
              y: smp.y - smp.h * 1.5,
              angle: Math.atan2(-smp.slope * 1.5, 1),
            };
            trailPos = {
              x: smpTrail.x,
              y: smpTrail.y - smpTrail.h * 1.5,
              angle: Math.atan2(-smpTrail.slope * 1.5, 1),
            };
            cartV = smp.v;
            cartG = smp.g;
          }
        } else {
          const ptLead = evalTrackPoint(0.18);
          const ptTrail = evalTrackPoint(0.02);
          leadPos = { x: ptLead.sx, y: ptLead.sy, angle: ptLead.angle };
          trailPos = { x: ptTrail.sx, y: ptTrail.sy, angle: ptTrail.angle };
        }

        if (leadPos && trailPos) {
          // Iskry przy dużej prędkości oraz podczas hamowania przed metą
          const brakingNearEnd = s.simulating && leadPos.x > stEnd.x - 42;
          if (s.simulating && (cartV > 15 || brakingNearEnd) && Math.random() < (brakingNearEnd ? 0.85 : 0.45)) {
            s.sparks.push({
              x: leadPos.x + (Math.random() - 0.5) * 6,
              y: leadPos.y + 1,
              vx: -(14 + Math.random() * 22),
              vy: -(4 + Math.random() * 14),
              c: brakingNearEnd ? "#fbbf24" : "#f97316",
              life: 0.35,
            });
          }

          // Okrzyki pasażerów (bez wykrzykników i bez emoji)
          if (s.simulating && (cartV > 18 || cartG > 2.6 || cartG < 0.5) && Math.random() < 0.07) {
            const emoteList = ["Ale pęd", "Super", "W górę", "Ale zjazd", "Brawo"];
            s.emotes.push({
              x: leadPos.x,
              y: leadPos.y - 14,
              text: pick(emoteList),
              vy: -16,
              life: 0.7,
            });
          }

          // Rysowanie iskier
          for (let i = s.sparks.length - 1; i >= 0; i--) {
            const sp = s.sparks[i];
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.life -= dt * 2.4;
            if (sp.life <= 0) {
              s.sparks.splice(i, 1);
              continue;
            }
            g.fillStyle = sp.c;
            g.fillRect(sp.x, sp.y, 1.8, 1.8);
          }

          // Rysowanie okrzyków pasażerów przez cv.text
          for (let i = s.emotes.length - 1; i >= 0; i--) {
            const em = s.emotes[i];
            em.y += em.vy * dt;
            em.life -= dt * 1.4;
            if (em.life <= 0) {
              s.emotes.splice(i, 1);
              continue;
            }
            g.save();
            g.globalAlpha = Math.max(0, em.life);
            cv.text(em.text, em.x, em.y, {
              size: 5.2,
              weight: 700,
              color: "#fde047",
              align: "center",
            });
            g.restore();
          }

          // Łącznik między wagonikami
          g.strokeStyle = "#cbd5e1";
          g.lineWidth = 1.4;
          g.beginPath();
          g.moveTo(trailPos.x, trailPos.y - 3);
          g.lineTo(leadPos.x, leadPos.y - 3);
          g.stroke();

          // Rysowanie dwóch wagoników z pasażerami podnoszącymi ręce na zjazdach
          const handsUp = s.simulating && (leadPos.angle > 0.15 || cartG < 0.7 || cartV > 18);
          for (const [carIdx, car] of [trailPos, leadPos].entries()) {
            g.save();
            g.translate(car.x, car.y - 4.2);
            g.rotate(car.angle);

            // Korpus wagonika
            g.fillStyle = carIdx === 1 ? "#fbbf24" : "#f59e0b";
            g.strokeStyle = "#78350f";
            g.lineWidth = 1.0;
            g.beginPath();
            g.roundRect(-6.5, -3.5, 13, 6.5, 2);
            g.fill();
            g.stroke();

            // Pasażerowie i uniesione ręce
            for (const px of [-2.4, 2.4]) {
              if (handsUp) {
                g.strokeStyle = "#fde68a";
                g.lineWidth = 1.0;
                g.beginPath();
                g.moveTo(px - 1.2, -4);
                g.lineTo(px - 2.4, -7.8);
                g.moveTo(px + 1.2, -4);
                g.lineTo(px + 2.4, -7.8);
                g.stroke();
              }
              g.fillStyle = carIdx === 1 ? "#ef4444" : "#38bdf8";
              g.beginPath();
              g.arc(px, -5.2, 1.9, 0, Math.PI * 2);
              g.fill();
            }

            // Koła wagonika
            g.fillStyle = "#1e293b";
            g.beginPath();
            g.arc(-4, 3.4, 1.7, 0, Math.PI * 2);
            g.arc(4, 3.4, 1.7, 0, Math.PI * 2);
            g.fill();

            g.restore();
          }
        }
      });
    },
  });
}
