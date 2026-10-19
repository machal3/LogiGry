// Tryktak: backgammon przeciw komputerowi. Logika oddzielona od planszy, by dała się testować w node.
{
  // Kierunek gracza (biały): z punktu 24 do 1, dom to pola 1–6. Komputer (czarny) biegnie w drugą stronę.
  const PIP_MAX = 167;

  // Position startowa: { pts[i] = {n, o} } plus bar i off liczby zdjętych.
  function initial() {
    const pts = [];
    for (let i = 0; i < 24; i++) pts.push({ n: 0, o: 0 });
    pts[23] = { n: 2, o: 1 }; pts[12] = { n: 5, o: 1 }; pts[7] = { n: 3, o: 1 }; pts[5] = { n: 5, o: 1 };
    pts[0] = { n: 2, o: 2 }; pts[11] = { n: 5, o: 2 }; pts[16] = { n: 3, o: 2 }; pts[18] = { n: 5, o: 2 };
    return { pts, bar: { 1: 0, 2: 0 }, off: { 1: 0, 2: 0 } };
  }

  const cloneS = (s) => ({
    pts: s.pts.map((p) => ({ n: p.n, o: p.o })),
    bar: { 1: s.bar[1], 2: s.bar[2] },
    off: { 1: s.off[1], 2: s.off[2] },
  });

  const canLand = (p, opp) => p.o !== opp || p.n < 2;

  // Czy wszystkie bierki gracza są w jego domu (więc można je zdejmować)?
  function homeReady(s, o) {
    if (s.bar[o]) return false;
    if (o === 1) return s.pts.slice(6).every((p) => p.o !== 1 || !p.n);
    return s.pts.slice(0, 18).every((p) => p.o !== 2 || !p.n);
  }

  // Legalne ruchy jedną kostką: { from: "bar" | indeks, to: indeks | "off" }.
  function moves(s, o, die) {
    const out = [], opp = 3 - o, P = s.pts;
    if (s.bar[o]) {
      const to = o === 1 ? 24 - die : die - 1;
      if (canLand(P[to], opp)) out.push({ from: "bar", to });
      return out;
    }
    const ready = homeReady(s, o);
    for (let i = 0; i < 24; i++) {
      if (P[i].o !== o || !P[i].n) continue;
      const to = o === 1 ? i - die : i + die;
      if (to >= 0 && to <= 23) {
        if (canLand(P[to], opp)) out.push({ from: i, to });
      } else if (ready) {
        const need = o === 1 ? i + 1 : 24 - i;
        let ok = die === need;
        if (!ok && die > need) {
          // większą kostką można zdjąć tylko z najdalszego od domu pola
          if (o === 1) ok = !P.slice(i + 1).some((p) => p.o === 1 && p.n);
          else ok = !P.slice(0, i).some((p) => p.o === 2 && p.n);
        }
        if (ok) out.push({ from: i, to: "off" });
      }
    }
    return out;
  }

  function apply(s, mv, o) {
    const P = s.pts, opp = 3 - o;
    let hit = false;
    if (mv.from === "bar") s.bar[o]--;
    else {
      P[mv.from].n--;
      if (!P[mv.from].n) P[mv.from].o = 0;
    }
    if (mv.to === "off") { s.off[o]++; return { hit: false }; }
    const t = P[mv.to];
    if (t.o === opp && t.n === 1) {
      s.bar[opp]++;
      t.n = 0;
      t.o = 0;
      hit = true;
    }
    if (!t.n) t.o = o;
    t.n++;
    return { hit };
  }

  // Liczba dojść: ile pól do odjęcia jeszcze brakuje. Bar liczy się jako 25.
  function pip(s, o) {
    let n = s.bar[o] * 25;
    for (let i = 0; i < 24; i++) {
      const p = s.pts[i];
      if (p.o === o && p.n) n += p.n * (o === 1 ? i + 1 : 24 - i);
    }
    return n;
  }

  // Czy dana strona ma legalny ruch jakimkolwiek oczkiem? { d1, d2 } albo cztery te same.
  function anyMoves(s, o, dice) {
    for (const d of dice) if (moves(s, o, d).length) return true;
    return false;
  }

  // Ocena pozycji z punktu widzenia gracza o. Im więcej, tym lepiej.
  function evalS(s, o) {
    const opp = 3 - o, P = s.pts;
    // mniejsza własna liczba dojść to lepsza pozycja; u przeciwnika odwrotnie
    let sc = (PIP_MAX - pip(s, o)) - (PIP_MAX - pip(s, opp));
    // bierko na barze przeciwnika jest wygraną tempem, własny pojedynczy bierko jest ryzykiem
    sc += s.bar[opp] * 3.5;
    const dir = o === 1 ? -1 : 1;
    for (let i = 0; i < 24; i++) {
      const p = P[i];
      if (p.o !== o || !p.n) continue;
      if (p.n >= 2) sc += p.n >= 3 ? 1.4 : 1.1; // twarde punkty
      else {
        sc -= 0.55; // pojedynczy bierko
        let threat = false;
        for (let d = 1; d <= 6 && !threat; d++) {
          const j = i - dir * d; // przeciwnik biegnie naprzeciw gracza
          if (j < 0 || j > 23) continue;
          const q = P[j];
          if (q.o === opp && q.n) threat = true;
        }
        if (threat) sc -= 1.3;
      }
      if (p.n && (o === 1 ? i < 6 : i >= 18)) sc += 0.6; // zajmowanie domu
    }
    sc += s.off[o] * 2.2; // zdjęte bierki
    return sc;
  }

  // Najlepsza sekwencja ruchów dla wylosowanych kostek. Pełne przeglądanie dla 2 kostek,
  // zachłannie dla podwójnych. `noise` rozmywa ocenę – słabsze poziomy komputera grają luźniej.
  function bestSeq(s, o, dice, noise = 0) {
    const results = [];
    const jitter = () => (noise ? (Math.random() * 2 - 1) * noise : 0);
    const rec = (state, left, seq) => {
      if (!left.length) {
        results.push({ seq, score: evalS(state, o) + jitter() });
        return;
      }
      const seen = new Set();
      let anyStep = false;
      for (let k = 0; k < left.length; k++) {
        const d = left[k];
        if (seen.has(d)) continue;
        seen.add(d);
        const ms = moves(state, o, d);
        if (!ms.length) continue;
        anyStep = true;
        for (const mv of ms) {
          const ns = cloneS(state);
          apply(ns, mv, o);
          rec(ns, left.filter((_, j) => j !== k), [...seq, mv]);
        }
      }
      if (!anyStep) rec(state, [], seq); // kostka, którą nie ma jak zagrać
    };
    if (dice.length > 2) {
      // podwójne oczka: cztery ruchy wybierane zachłannie
      const t = cloneS(s);
      const left = dice.slice();
      let guard = 0;
      while (left.length && guard++ < 6) {
        const d = left[0];
        const ms = moves(t, o, d);
        if (!ms.length) break;
        const scored = ms.map((mv) => {
          const ns = cloneS(t);
          apply(ns, mv, o);
          return { mv, sc: peekBest(ns, o, left.slice(1)) + jitter() };
        });
        scored.sort((a, b) => b.sc - a.sc);
        // słabszy poziom: czasami mniej idealny wybór
        const chosen = noise >= 5 && Math.random() < 0.4 && scored.length > 1 ? scored[1] : scored[0];
        apply(t, chosen.mv, o);
        left.shift();
      }
      return { seq: [], state: t }; // stan po zachłannym podejściu
    }
    rec(cloneS(s), dice.slice(), []);
    if (!results.length) return { seq: [], state: null };
    let best = results[0];
    for (const r of results) if (r.score > best.score) best = r;
    return { seq: best.seq, state: null };
  }

  // Jednokrokowy podgląd dla zachłannego rozgrywania podwójnych.
  function peekBest(state, o, rest) {
    const d = rest[0];
    const ms = moves(state, o, d);
    if (!ms.length) return evalS(state, o);
    let sc = -Infinity;
    for (const mv of ms) {
      const ns = cloneS(state);
      apply(ns, mv, o);
      const rest2 = rest.slice(1);
      const v = rest2.length ? peekBest(ns, o, rest2) : evalS(ns, o);
      if (v > sc) sc = v;
    }
    return sc;
  }

  if (typeof module !== "undefined") module.exports = { initial, moves, apply, evalS, bestSeq, homeReady, pip, anyMoves };

  // --- Rejestracja gry: plansza, klikanie i tury komputera ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "tryktak",
    cat: "planszowe",
    name: "Tryktak",
    author: "GLM 5.3 Flash",
    desc: "Rzucaj kostkami, pokonuj bary przez planszę i schodź do domu przed komputerem.",
    color: "#6f4518",
    ink: "#ffffff",
    glyph: [".#.#.", "#.#.#", ".#.#.", "#.#.#", ".#.#."],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, ai: 0 },
      { key: "medium", name: "Średni", points: 50, ai: 1 },
      { key: "hard", name: "Trudny", points: 100, ai: 2 },
    ],
    rules: [
      "Kostki mówią, o ile pól przesuwasz swoje bary w stronę domu, czyli pól od jedynki do szóstki. Podwójne oczka dają cztery ruchy.",
      "Kliknij swoje bierko, a potem pole docelowe albo talerz do zdjęcia. Toast pokazuje legalne pola.",
      "Na polu z dwoma i więcej bierkami przeciwnika zabrania się lądować. Pojedyncze bierko można zbić, ale wraca ono na bar i musi wejść od nowa.",
      "Gdy wszystkie twoje bary są w domu, możesz je zdejmować na talerz po prawej. Wygrywa ten, kto zdejmie piętnaście pierwszy.",
    ],
    achievements: [
      { id: "gammon", name: "Gammon", desc: "Wygraj partię, w której przeciwnik nie zdjął żadnego bierka.", points: 10 },
      { id: "justa", name: "Żywy duch", desc: "Wygraj partię w mniej niż dwa minuty.", points: 25 },
      { id: "nietkniety", name: "Nietknięty", desc: "Wygraj partię, nie tracąc żadnego bierka na bar.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      let s = initial();
      let turn = 0; // 0 gracz, 1 komputer
      let dice = [], rolled = []; // rolled: kostki do pokazania, dice: wartości do zagrania
      let sel = null, hitCount = 0;
      const ui = { pts: [], barWhite: null, barBlack: null, offP: null, offA: null };

      const diceEl = statBlock(ctx, "Kostki", { small: true });
      // ręcznie rysowane kostki: ust w zwykłych blokach (zostaje też wersja tekstowa)
      const dieBlk = panelBlock("Kostki do zagrania", (() => {
        const d = el("div", "tk-dice");
        d.setAttribute("role", "img");
        return d;
      })());
      const dieBox = dieBlk.querySelector(".tk-dice");
      ctx.panel.append(dieBlk);
      const offEl = statBlock(ctx, "Zdjęte", { meter: true });
      const turnEl = statBlock(ctx, "Tura", { small: true });
      const rollBtn = button("Rzuć kostki", "btn wide", playerRoll);
      const autoBtn = button("Wszystko", "btn-ghost wide", autoPlay);
      ctx.panel.append(panelBlock("", rollBtn, autoBtn));

      // plansza: górny rząd to pola 13–24, dolny 12–1; bar w środku, talerze do zdjęć po bokach
      const TOP = [12, 13, 14, 15, 16, 17, null, 18, 19, 20, 21, 22, 23, "offA"];
      const BOT = [11, 10, 9, 8, 7, 6, null, 5, 4, 3, 2, 1, 0, "off"];
      const frame = el("div", "tk-frame");
      board.append(frame);
      const rowT = el("div", "tk-row"), rowB = el("div", "tk-row");
      frame.append(rowT, rowB);
      TOP.forEach((p) => rowT.append(pointEl(p, "t")));
      BOT.forEach((p) => rowB.append(pointEl(p, "b")));

      function pointEl(p, row) {
        if (p === null) {
          const b = el("button", `tk-pt tk-bar ${row === "b" ? "tk-bar-white" : ""}`);
          b.type = "button";
          b.setAttribute("aria-label", row === "b" ? "Twój bar" : "Bar komputera");
          b.dataset.p = "bar";
          if (row === "b") ui.barWhite = b;
          else ui.barBlack = b;
          return b;
        }
        if (p === "offA" || p === "off") {
          const b = el("button", "tk-pt tk-off-tray");
          b.type = "button";
          b.setAttribute("aria-label", p === "off" ? "Talerz: zdjęte bary" : "Talerz komputera");
          b.dataset.p = "off";
          if (p === "off") ui.offP = b;
          else ui.offA = b;
          return b;
        }
        const b = el("button", `tk-pt ${p >= 12 ? "tk-invert" : ""}`);
        b.type = "button";
        b.setAttribute("aria-label", `Punkt ${p + 1}`);
        b.dataset.p = String(p);
        ui.pts[p] = b;
        return b;
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".tk-pt");
        if (!b || ctx.done || turn !== 0 || !dice.length) return;
        const key = b.dataset.p; // "bar", "off" albo numer pola
        Sound.tap();
        if (sel !== null && legalTargets(sel).includes(key)) {
          doPlayerMove(sel, key);
          return;
        }
        if (key === "bar") {
          const ownBar = b.classList.contains("tk-bar-white");
          if (ownBar && s.bar[1]) sel = "bar";
          else sel = null;
        } else if (key === "off") {
          sel = null;
        } else if (s.pts[key].o === 1 && s.pts[key].n) {
          sel = sel === key ? null : key;
        } else sel = null;
        render();
      });

      // Czy wybrana pozycja może być źródłem ruchu, a gdzie legalnie wyląduje?
      function legalTargets(from) {
        if (from === null) return [];
        const out = new Set();
        for (const d of dice)
          for (const mv of moves(s, 1, d)) if (String(mv.from) === String(from)) out.add(String(mv.to));
        return [...out];
      }

      // Ruch gracza: zapis stanu do „Cofnij", zużycie kostki i sprzątanie tury
      function doPlayerMove(from, toKey) {
        const dIdx = dice.findIndex((d) => moves(s, 1, d).some((m) => String(m.from) === String(from) && String(m.to) === String(toKey)));
        if (dIdx < 0) return;
        const die = dice[dIdx];
        const mv = { from: from === "bar" ? "bar" : from, to: toKey === "off" ? "off" : +toKey };
        save({ s: cloneS(s), dice: dice.slice(), rolled: rolled.slice() });
        apply(s, mv, 1);
        Sound.place(1 + (s.off[1] % 9));
        dice.splice(dIdx, 1);
        sel = null;
        render();
        endTurnIfNeeded();
      }

      function endTurnIfNeeded() {
        if (ctx.done) return;
        if (s.off[1] === 15) return win();
        if (s.off[2] === 15) return lose();
        const canMove = dice.length && anyMoves(s, 1, dice);
        if (dice.length && canMove) { renderPanel(); return; }
        if (dice.length && !canMove) ctx.toast("Brak możliwości ruchu");
        turn = 1;
        dice = [], rolled = [];
        renderPanel();
        schedule(aiRoll, 800);
      }

      function playerRoll() {
        if (ctx.done || turn !== 0 || dice.length) return;
        roll();
        turnEl.set("Ty");
        // wymuszona zmiana tury, gdy nic nie ma jak zagrać
        schedule(() => endTurnIfNeeded(), 120);
        renderPanel();
      }

      function roll() {
        const a = 1 + rnd(6), b = 1 + rnd(6);
        rolled = a === b ? [a, a, a, a] : [a, b];
        dice = rolled.slice();
        Sound.flag();
      }

      // Komputera tura: rzut, wybór sekwencji i krok co krok
      function aiRoll() {
        if (ctx.done) return;
        roll();
        const noise = L.ai === 0 ? 7 : L.ai === 1 ? 2 : 0;
        let plan = [];
        const direct = bestSeq(s, 2, dice, noise);
        if (direct.state) {
          s = direct.state; // podwójne rozegrane zachłannie całym stanem
        } else {
          plan = direct.seq;
        }
        if (!plan.length && !direct.state) {
          ctx.toast("Komputer nie może ruszyć");
          turn = 0;
          dice = [], rolled = [];
          renderPanel();
          return;
        }
        stepAI(plan, 0);
      }

      function stepAI(plan, k) {
        if (ctx.done) return;
        if (k >= plan.length) {
          turn = 0;
          dice = [], rolled = [];
          renderPanel();
          return;
        }
        const { hit } = apply(s, plan[k], 2);
        if (hit) { hitCount++; Sound.error(); ctx.toast("Twój bierko zostało zbite"); }
        else Sound.place(2);
        renderPanel();
        // zbiór? Wygrana może nastąpić w środku sekwencji
        if (s.off[2] === 15) return lose();
        schedule(() => stepAI(plan, k + 1), 480);
      }

      // autoPlay: rozgrywa najlepszą sekwencję za gracza, krok po kroku
      function autoPlay() {
        if (ctx.done || turn !== 0 || !dice.length) return;
        const direct = bestSeq(s, 1, dice, 0);
        const plan = direct.state ? planFromGreedy(direct.state) : direct.seq;
        if (!plan.length) { ctx.toast("Brak możliwości ruchu"); return; }
        stepPlayer(plan, 0);
      }

      // podwójne z bestSeq zwracają tylko wynikowy stan: odtwarzamy ruchy porównując stany
      function planFromGreedy(target) {
        const plan = [];
        const probe = cloneS(s);
        let left = dice.slice();
        let guard = 0;
        while (left.length && guard++ < 8) {
          const d = left[0];
          const ms = moves(probe, 1, d);
          if (!ms.length) break;
          let chosen = null;
          for (const mv of ms) {
            const test = cloneS(probe);
            apply(test, mv, 1);
            if (sameState(test, target)) { chosen = mv; break; }
          }
          // nie wolno zatrzymać się w nieskończonej pętli, jeśli stan się nie zgadza: podejmij dowolny
          if (!chosen) chosen = ms[0];
          apply(probe, chosen, 1);
          plan.push(chosen);
          left.shift();
        }
        return plan;
      }

      function sameState(a, b) {
        return a.pts.every((p, i) => p.n === b.pts[i].n && p.o === b.pts[i].o)
          && a.bar[1] === b.bar[1] && a.bar[2] === b.bar[2]
          && a.off[1] === b.off[1] && a.off[2] === b.off[2];
      }

      function stepPlayer(plan, k) {
        if (ctx.done || k >= plan.length) { dice = []; endTurnIfNeeded(); return; }
        const mv = plan[k];
        save({ s: cloneS(s), dice: dice.slice(), rolled: rolled.slice() });
        const dIdx = dice.findIndex((d) =>
          moves(s, 1, d).some((m) => String(m.from) === String(mv.from) && String(m.to) === String(mv.to)));
        if (dIdx >= 0) dice.splice(dIdx, 1);
        apply(s, mv, 1);
        Sound.place(1 + Math.min(8, s.off[1]));
        renderPanel();
        schedule(() => stepPlayer(plan, k + 1), 440);
      }

      function win() {
        if (s.off[2] === 0) ctx.achieve("gammon");
        if (ctx.time < 120) ctx.achieve("justa");
        if (!hitCount) ctx.achieve("nietkniety");
        ctx.win(`Zdjęte bary: ${s.off[1]} : ${s.off[2]}.`);
      }

      function lose() {
        ctx.lose("Komputer zdejmował szybciej", `Zdjęte bary: ${s.off[1]} : ${s.off[2]}.`);
      }

      // --- Wygląd planszy ---
      function renderCompiled() {
        // 24 pola, bar i talerze
        for (let i = 0; i < 24; i++) {
          const b = ui.pts[i], p = s.pts[i];
          if (!b) continue;
          b.replaceChildren();
          b.classList.toggle("tk-sel", sel === i);
          const targets = sel !== null && legalTargets(sel).includes(String(i));
          b.classList.toggle("tk-targ", targets);
          // pole, z którego obecnie można ruszyć — delikatna ramka podpowiedzi
          b.classList.toggle("tk-src", turn === 0 && !ctx.done && sel === null && dice.length
            && dice.some((d) => moves(s, 1, d).some((m) => m.from === i)));
          b.setAttribute("aria-label", `Punkt ${i + 1}: ${p.n ? (p.o === 1 ? "twoje" : "komputera") + " ×" + p.n : "puste"}`);
          for (let k = 0; k < Math.min(p.n, 6); k++) b.append(el("span", `tk-chk ${p.o === 1 ? "tk-white" : "tk-black"}`));
          if (p.n > 6) b.append(el("span", "tk-more", "+" + (p.n - 6)));
        }
        ui.barWhite.replaceChildren();
        for (let k = 0; k < s.bar[1]; k++) ui.barWhite.append(el("span", "tk-chk tk-white"));
        ui.barWhite.classList.toggle("tk-sel", sel === "bar");
        ui.barWhite.classList.toggle("tk-src", turn === 0 && !ctx.done && sel === null && s.bar[1] > 0
          && dice.length && dice.some((d) => moves(s, 1, d).some((m) => m.from === "bar")));
        const barTargets = sel !== null && legalTargets("bar").length;
        // wejścia na bar? bar jest zawsze źródłem, nie celem
        ui.barWhite.classList.toggle("tk-has", s.bar[1] > 0);
        ui.barBlack.replaceChildren();
        for (let k = 0; k < s.bar[2]; k++) ui.barBlack.append(el("span", "tk-chk tk-black"));
        ui.offP.replaceChildren(el("span", "tk-num", String(s.off[1] ? s.off[1] : "")));
        ui.offP.classList.toggle("tk-targ", sel !== null && legalTargets(sel).includes("off"));
        ui.offA.replaceChildren(el("span", "tk-num", String(s.off[2] ? s.off[2] : "")));
      }
      const render = renderCompiled;

      function renderPanel() {
        diceEl.set(rolled.length ? "kostki: " + rolled.join(" · ") + (rolled.length > 2 ? " (podwójne)" : "") : "—");
        // kostki do zagrania jako oczy
        dieBox.replaceChildren();
        if (!dice.length) dieBox.append(el("span", "tk-diempty", turn === 0 && !ctx.done ? "rzuć" : "—"));
        else dice.forEach((d) => dieBox.append(dieFace(d)));
        offEl.set(`${s.off[1]} : ${s.off[2]}`, s.off[1] / 15);
        turnEl.set(turn === 0 ? "Ty" : "Komputer");
        rollBtn.style.display = turn === 0 && !dice.length ? "" : "none";
        autoBtn.style.display = turn === 0 && dice.length ? "" : "none";
        ctx.progress(Math.max(0, Math.min(1, 0.35 * s.off[1] / 15)));
      }

      // kość z oczkami: kwadrat z kropkami (pozycje procentowe dla 1–6)
      function dieFace(v) {
        const PTS = {
          1: [[50, 50]],
          2: [[24, 24], [76, 76]],
          3: [[24, 24], [50, 50], [76, 76]],
          4: [[24, 24], [24, 76], [76, 24], [76, 76]],
          5: [[24, 24], [24, 76], [50, 50], [76, 24], [76, 76]],
          6: [[24, 24], [24, 50], [24, 76], [76, 24], [76, 50], [76, 76]],
        };
        const d = el("span", "tk-die");
        d.setAttribute("aria-label", `kostka ${v}`);
        for (const [px, py] of PTS[v] || PTS[1]) {
          const dot = el("span", "tk-pip");
          dot.style.left = `${px}%`;
          dot.style.top = `${py}%`;
          d.append(dot);
        }
        return d;
      }

      // zapisywanie stanu do wycofywania
      const save = ctx.undoable((snap) => {        s = cloneS(snap.s);
        dice = snap.dice.slice();
        rolled = snap.rolled.slice();
        sel = null;
        turn = 0;
        renderCompiled();
        renderPanel();
      });

      // zegar dla tur komputera
      const timers = [];
      function schedule(fn, ms) {
        const id = setTimeout(fn, ms);
        timers.push(id);
      }
      ctx.onStop(() => timers.forEach(clearTimeout));

      // pierwsza tura gracza (kostki dopóki nie rzuci)
      renderCompiled();
      renderPanel();
    },
  });
}
