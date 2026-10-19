// Kolejka: trójwymiarowy symulator i projektant kolejki górskiej (roller coaster).
// Kształtowanie profilu wysokościowego toru, fizyka energii potencjalnej i kinetycznej, przeciążenia G oraz emocje pasażerów.
{
  const GRAVITY = 9.81;

  // Oblicza profil prędkości, przeciążenia i powodzenie przejazdu po węzłach toru
  function simulateCoaster(nodes, friction = 0.04) {
    if (!nodes || nodes.length < 3) return { success: false, reason: "Za mało węzłów" };

    const samples = [];
    let curV = 8.0; // prędkość początkowa z napędu stacji (lift hill)
    let maxV = curV;
    let maxG = 1.0;
    let totalThrill = 0;
    let derailed = false;
    let stalled = false;

    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i];
      const p1 = nodes[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const dh = p0.h - p1.h; // spadek wysokości (dodatni = zjazd w dół)
      const dist = Math.hypot(dx, dy, dh);

      const isLiftHill = i === 0 && p1.h > p0.h; // wyciąg łańcuchowy na pierwszy szczyt

      const steps = Math.max(8, Math.round(dist * 0.8));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const h = p0.h + (p1.h - p0.h) * t;
        const x = p0.x + dx * t;
        const y = p0.y + dy * t;

        if (isLiftHill) {
          curV = 8.0; // wyciąg łańcuchowy wciąga wagonik na szczyt
        } else {
          // Bilans energii
          const energyV2 = curV * curV + 2 * GRAVITY * (dh / steps) - friction * dist;
          if (energyV2 <= 1.0) {
            stalled = true;
            return {
              success: false,
              reason: `Wagonik utknął na wzniesieniu ${i + 1} (brak energii)`,
              samples,
              maxV,
              maxG,
              thrill: Math.round(totalThrill),
            };
          }
          curV = Math.sqrt(energyV2);
        }
        maxV = Math.max(maxV, curV);

        // Promień łuku pionowego i przeciążenie pionowe
        const curveR = Math.max(22, dist * 0.65);
        const gForce = 1.0 + (curV * curV) / (curveR * GRAVITY);
        maxG = Math.max(maxG, gForce);

        if (gForce > 5.5) {
          derailed = true;
          return {
            success: false,
            reason: `Przeciążenie ${gForce.toFixed(1)}G wykoleiło wagonik na zakręcie ${i + 1}`,
            samples,
            maxV,
            maxG,
            thrill: Math.round(totalThrill),
          };
        }

        // Emocje pasażerów: rosną przy dużej prędkości i bezpiecznych przeciążeniach
        const thrillDelta = (curV * 0.08 + Math.max(0, gForce - 1) * 1.4);
        totalThrill += thrillDelta;

        samples.push({ x, y, h, v: curV, g: gForce });
      }
    }

    const normThrill = Math.min(100, Math.round((totalThrill / samples.length) * 45));
    return {
      success: true,
      samples,
      maxV,
      maxG,
      thrill: normThrill,
    };
  }

  function getDefaultNodes(count) {
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = 30 + t * 240;
      const y = 100 + Math.sin(t * Math.PI * 2) * 24;
      let h = 10;
      if (i === 0) h = 12; // stacja startowa
      else if (i === count - 1) h = 8; // stacja końcowa
      else if (i === 1) h = 46; // szczyt pierwszego zjazdu
      else if (i === 2) h = 12; // dno pierwszego zjazdu
      else if (i === 3) h = 32; // drugie wzniesienie
      else if (i === 4) h = 12;
      else if (i === 5) h = 24;
      else h = Math.max(8, 20 - (i - 5) * 3);
      nodes.push({ id: i, x, y, h: Math.round(h) });
    }
    return nodes;
  }

  if (typeof module !== "undefined") {
    module.exports = { simulateCoaster, getDefaultNodes };
  }

  if (typeof registerGame !== "undefined") registerGame({
    id: "kolejka",
    cat: "symulacje",
    big: true,
    name: "Kolejka",
    author: "Gemini 4",
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
      { key: "medium", name: "Średni", points: 50, nodeCount: 8, minThrill: 68 },
      { key: "hard", name: "Trudny", points: 100, nodeCount: 10, minThrill: 82 },
    ],
    rules: [
      "Wybieraj podpory toru kliknięciem (albo strzałkami Lewo/Prawo) i zmieniaj ich wysokość za pomocą przycisków W górę / W dół (oraz klawiszy W/S).",
      "Pierwszy wysoki szczyt nadaje wagonikowi prędkość; pamiętaj, że tarcie pochłania energię i kolejne wzniesienia muszą być odpowiednio niższe.",
      "Uruchom przejazd testowy (Spacja lub Enter): wagonik nie może utknąć z braku pędu ani wykoleić się z powodu zbyt dużych przeciążeń G.",
      "Zbuduj emocjonujący tor osiągający wymaganą ocenę ekscytacji pasażerów i doprowadź skład do stacji końcowej.",
    ],
    achievements: [
      { id: "pierwszy-zjazd", name: "Pierwszy zjazd", desc: "Zbuduj tor, który bezpiecznie dowiezie pasażerów do stacji.", points: 10 },
      { id: "przeciazenie-mistrz", name: "Zastrzyk adrenaliny", desc: "Osiągnij przeciążenie powyżej 3.5G bez wykolejenia.", points: 25 },
      { id: "pelna-ekscytacja", name: "Ekstremalna pętla", desc: "Zdobądź co najmniej 75 punktów emocji w jednym przejeździe.", points: 25 },
      { id: "inzynier-parku", name: "Główny inżynier", desc: "Wygraj trudny poziom z oceną emocji co najmniej 82 punkty.", points: 50 },
    ],

    mount(board, ctx) {
      const { key, nodeCount, minThrill } = ctx.level;
      const W = 300, H = 200;
      const cv = canvasGame(board, ctx, W, H, { max: 96, cls: "space" });
      const { g } = cv;

      const s = {
        nodes: getDefaultNodes(nodeCount),
        selectedNode: 1,
        simulating: false,
        cartIdx: 0,
        simRes: null,
        camRot: 0.15,
        testSpeed: 1.0,
        sparks: [],
        emotes: [],
      };

      const thrillEl = statBlock(ctx, "Emocje pasażerów", { meter: true });
      const gForceEl = statBlock(ctx, "Przeciążenie i prędkość", { small: true });
      const statusEl = statBlock(ctx, "Profil toru", { small: true });

      const upBtn = button("Podnieś podporę (W)", "btn wide", () => adjustNodeHeight(3));
      const downBtn = button("Obniż podporę (S)", "btn-ghost wide", () => adjustNodeHeight(-3));
      const testBtn = button("Przejazd testowy (Spacja)", "btn wide", () => startSimulation());
      ctx.panel.append(panelBlock("Projektowanie przęseł", upBtn, downBtn, testBtn));

      function updatePanel() {
        const curSim = s.simRes || simulateCoaster(s.nodes);
        thrillEl.set(
          `${curSim.thrill || 0} / ${minThrill} pkt`,
          (curSim.thrill || 0) / minThrill,
          curSim.success ? "Wagonik bezpiecznie dociera do stacji" : curSim.reason
        );
        gForceEl.set(
          `${(curSim.maxG || 1).toFixed(1)}G · ${Math.round((curSim.maxV || 0) * 3.6)} km/h`,
          null,
          curSim.maxG > 4.8 ? "Niebezpieczne przeciążenie!" : "Przeciążenia w normie"
        );
        const selN = s.nodes[s.selectedNode];
        statusEl.set(
          `Podpora ${s.selectedNode + 1} z ${s.nodes.length}`,
          null,
          `Wysokość: ${selN.h}m · ${selN.h > 42 ? "Wysokie wzniesienie" : selN.h < 12 ? "Dno zjazdu" : "Średnia wysokość"}`
        );
        ctx.progress(Math.min(1, (curSim.thrill || 0) / minThrill));
      }

      function adjustNodeHeight(dh) {
        if (ctx.done || s.simulating) return;
        const n = s.nodes[s.selectedNode];
        if (s.selectedNode === 0 || s.selectedNode === s.nodes.length - 1) {
          ctx.toast("Wysokość stacji początkowej i końcowej jest stała");
          return;
        }
        n.h = Math.max(6, Math.min(50, n.h + dh));
        Sound.tap();
        s.simRes = simulateCoaster(s.nodes);
        updatePanel();
      }

      function startSimulation() {
        if (ctx.done) return;
        s.simRes = simulateCoaster(s.nodes);
        s.simulating = true;
        s.cartIdx = 0;
        Sound.line();
        ctx.toast("Wagonik rusza ze stacji!");
        updatePanel();
      }

      ctx.on(document, "keydown", (e) => {
        if (ctx.done || e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          s.selectedNode = Math.max(0, s.selectedNode - 1);
          Sound.tap();
          updatePanel();
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          s.selectedNode = Math.min(s.nodes.length - 1, s.selectedNode + 1);
          Sound.tap();
          updatePanel();
        } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
          adjustNodeHeight(3);
        } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
          adjustNodeHeight(-3);
        } else if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          startSimulation();
        }
      });

      // Wybór podpory kliknięciem na ekranie
      ctx.on(cv.cv, "pointerdown", (e) => {
        if (ctx.done) return;
        const [x, y] = cv.at(e);
        let bestDist = Infinity;
        let bestIdx = -1;
        s.nodes.forEach((n, i) => {
          // Rzut izometryczny podpory: sx = n.x, sy = n.y - n.h * 1.6
          const sx = n.x;
          const sy = n.y - n.h * 1.5;
          const d = Math.hypot(x - sx, y - sy);
          if (d < 22 && d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        });
        if (bestIdx >= 0) {
          s.selectedNode = bestIdx;
          Sound.tap();
          updatePanel();
        }
      });

      updatePanel();

      cv.loop((dt, now) => {
        // Logika przejazdu wagonika
        if (s.simulating && s.simRes) {
          if (s.simRes.samples && s.cartIdx < s.simRes.samples.length) {
            const curSample = s.simRes.samples[Math.floor(s.cartIdx)];
            s.cartIdx += dt * 38;

            if (curSample && curSample.g >= 3.5) {
              ctx.achieve("przeciazenie-mistrz");
            }

            if (s.cartIdx >= s.simRes.samples.length) {
              s.simulating = false;
              if (s.simRes.success) {
                ctx.achieve("pierwszy-zjazd");
                if (s.simRes.thrill >= 75) {
                  ctx.achieve("pelna-ekscytacja");
                }
                if (s.simRes.thrill >= minThrill) {
                  if (key === "hard" && s.simRes.thrill >= 82) {
                    ctx.achieve("inzynier-parku");
                  }
                  ctx.win(`Znakomity przejazd! Zdobyłeś ${s.simRes.thrill} punktów emocji pasażerów.`);
                  return;
                } else {
                  ctx.toast(`Zjazd ukończony, lecz emocje (${s.simRes.thrill}) poniżej wymogu (${minThrill})`);
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

        // --- RYSOWANIE PARKU I KOLEJKI GÓRSKIEJ ---
        // Tło nieba i wzgórz parku rozrywki
        const skyGrad = g.createLinearGradient(0, 0, 0, H);
        skyGrad.addColorStop(0, "#0f172a");
        skyGrad.addColorStop(0.55, "#1e293b");
        skyGrad.addColorStop(1, "#064e3b");
        g.fillStyle = skyGrad;
        g.fillRect(0, 0, W, H);

        // Chmury na niebie
        g.fillStyle = "rgba(255, 255, 255, 0.12)";
        for (let c = 0; c < 3; c++) {
          const cx = ((now * 0.008 + c * 110) % (W + 60)) - 30;
          const cy = 25 + c * 15;
          g.beginPath();
          g.arc(cx, cy, 14, 0, Math.PI * 2);
          g.arc(cx + 10, cy - 4, 11, 0, Math.PI * 2);
          g.arc(cx + 20, cy, 13, 0, Math.PI * 2);
          g.fill();
        }

        // Zielone wzgórza w tle
        g.fillStyle = "#064e3b";
        g.beginPath();
        g.moveTo(0, 140);
        g.quadraticCurveTo(80, 110, 160, 135);
        g.quadraticCurveTo(240, 115, W, 140);
        g.lineTo(W, H);
        g.lineTo(0, H);
        g.closePath();
        g.fill();

        // Siatka terenu parku
        g.strokeStyle = "rgba(16, 185, 129, 0.12)";
        g.lineWidth = 0.8;
        for (let gx = 10; gx <= W - 10; gx += 20) {
          g.beginPath();
          g.moveTo(gx, 70);
          g.lineTo(gx, 180);
          g.stroke();
        }

        // Stalowe kratownice / podpory węzłów
        s.nodes.forEach((n, i) => {
          const isSel = i === s.selectedNode;
          const baseY = n.y + 15;
          const topY = n.y - n.h * 1.5;

          // Cień podpory na ziemi
          g.fillStyle = "rgba(0, 0, 0, 0.35)";
          g.beginPath();
          g.ellipse(n.x, baseY, 9, 3.5, 0, 0, Math.PI * 2);
          g.fill();

          // Kratownica pionowa podpory
          g.strokeStyle = isSel ? "#fbbf24" : "rgba(148, 163, 184, 0.65)";
          g.lineWidth = isSel ? 2.2 : 1.2;
          g.beginPath();
          g.moveTo(n.x - 4, baseY);
          g.lineTo(n.x - 2, topY);
          g.moveTo(n.x + 4, baseY);
          g.lineTo(n.x + 2, topY);
          // Ukośne wzmocnienia
          for (let yStep = baseY; yStep > topY + 8; yStep -= 10) {
            g.moveTo(n.x - 3, yStep);
            g.lineTo(n.x + 3, yStep - 6);
          }
          g.stroke();

          // Głowica podpory (węzeł toru)
          g.fillStyle = isSel ? "#f59e0b" : "#db2777";
          g.strokeStyle = "#ffffff";
          g.lineWidth = 1;
          g.beginPath();
          g.arc(n.x, topY, isSel ? 5.5 : 4, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        });

        // Szyny kolejki (podwójna rura stalowa połączona podkładami)
        g.save();
        const railPoints = [];
        for (let i = 0; i < s.nodes.length; i++) {
          const n = s.nodes[i];
          railPoints.push([n.x, n.y - n.h * 1.5]);
        }

        // Rysowanie toru z wygładzeniem
        g.strokeStyle = "#db2777";
        g.lineWidth = 3.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(railPoints[0][0], railPoints[0][1]);
        for (let i = 1; i < railPoints.length; i++) {
          const prev = railPoints[i - 1];
          const cur = railPoints[i];
          const midX = (prev[0] + cur[0]) / 2;
          const midY = (prev[1] + cur[1]) / 2;
          g.quadraticCurveTo(prev[0], prev[1], midX, midY);
        }
        const last = railPoints[railPoints.length - 1];
        g.lineTo(last[0], last[1]);
        g.stroke();

        // Górna lśniąca krawędź szyny
        g.strokeStyle = "#f472b6";
        g.lineWidth = 1.2;
        g.stroke();
        g.restore();

        // Stacja początkowa i końcowa
        const st0 = s.nodes[0];
        g.fillStyle = "#3b82f6";
        g.fillRect(st0.x - 14, st0.y - st0.h * 1.5 - 6, 28, 12);
        g.fillStyle = "#ffffff";
        g.font = "bold 5.5px sans-serif";
        g.fillText("START", st0.x - 8, st0.y - st0.h * 1.5 + 2);

        const stEnd = s.nodes[s.nodes.length - 1];
        g.fillStyle = "#10b981";
        g.fillRect(stEnd.x - 14, stEnd.y - stEnd.h * 1.5 - 6, 28, 12);
        g.fillStyle = "#ffffff";
        g.fillText("META", stEnd.x - 6, stEnd.y - stEnd.h * 1.5 + 2);

        // Wagonik na torze (w spoczynku lub w przejeździe testowym)
        let cartPos = null;
        let cartV = 0;
        let cartG = 1.0;

        if (s.simulating && s.simRes && s.simRes.samples) {
          const sIdx = Math.min(s.simRes.samples.length - 1, Math.floor(s.cartIdx));
          const smp = s.simRes.samples[sIdx];
          if (smp) {
            cartPos = [smp.x, smp.y - smp.h * 1.5];
            cartV = smp.v;
            cartG = smp.g;
          }
        } else {
          // Wagonik stoi na stacji startowej
          cartPos = [st0.x, st0.y - st0.h * 1.5];
        }

        if (cartPos) {
          // Iskry z kół przy dużej prędkości
          if (s.simulating && cartV > 16 && Math.random() < 0.6) {
            s.sparks.push({
              x: cartPos[0] + (Math.random() - 0.5) * 6,
              y: cartPos[1] + 2,
              vx: -(12 + Math.random() * 20),
              vy: (Math.random() - 0.5) * 12,
              c: Math.random() > 0.3 ? "#f59e0b" : "#ef4444",
              life: 0.35,
            });
          }

          // Okrzyki ekscytacji pasażerów przy przeciążeniach i prędkości
          if (s.simulating && (cartV > 20 || cartG > 2.8) && Math.random() < 0.08) {
            const emoteList = ["WOO!", "AA!", "★", "!", "WOW!"];
            s.emotes.push({
              x: cartPos[0],
              y: cartPos[1] - 14,
              text: pick(emoteList),
              vy: -18,
              life: 0.65,
            });
          }

          // Rysowanie iskier
          for (let i = s.sparks.length - 1; i >= 0; i--) {
            const sp = s.sparks[i];
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            sp.life -= dt * 2.5;
            if (sp.life <= 0) {
              s.sparks.splice(i, 1);
              continue;
            }
            g.fillStyle = sp.c;
            g.fillRect(sp.x, sp.y, 1.8, 1.8);
          }

          // Rysowanie okrzyków pasażerów
          for (let i = s.emotes.length - 1; i >= 0; i--) {
            const em = s.emotes[i];
            em.y += em.vy * dt;
            em.life -= dt * 1.5;
            if (em.life <= 0) {
              s.emotes.splice(i, 1);
              continue;
            }
            g.fillStyle = "#facc15";
            g.globalAlpha = Math.max(0, em.life);
            g.font = "bold 6.5px sans-serif";
            g.textAlign = "center";
            g.fillText(em.text, em.x, em.y);
            g.globalAlpha = 1;
          }

          g.save();
          g.translate(cartPos[0], cartPos[1] - 5);

          // Korpus wagonika
          g.fillStyle = "#fbbf24";
          g.strokeStyle = "#b45309";
          g.lineWidth = 1.2;
          g.beginPath();
          g.roundRect(-8, -4, 16, 8, 2);
          g.fill();
          g.stroke();

          // Pasażerowie (głowy)
          g.fillStyle = "#ef4444";
          g.beginPath();
          g.arc(-3, -6, 2.2, 0, Math.PI * 2);
          g.arc(3, -6, 2.2, 0, Math.PI * 2);
          g.fill();

          // Koła wagonika
          g.fillStyle = "#334155";
          g.beginPath();
          g.arc(-5, 4.5, 2, 0, Math.PI * 2);
          g.arc(5, 4.5, 2, 0, Math.PI * 2);
          g.fill();

          g.restore();
        }
      });
    },
  });
}
