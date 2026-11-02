// Zasłony: łamigłówka o widoczności (kuromasu). Czarne pola zasłaniają widok,
// a liczba w białym polu mówi, ile białych pól widać z niego w rzędzie i kolumnie.
// Cały plik jest w klamrach, żeby nazwy nie zderzały się z innymi grami.
{
  // --- Logika bez DOM: testy w node ---

  const neighbours = (n, m, i) => {
    const r = (i / m) | 0, c = i % m, out = [];
    if (c > 0) out.push(i - 1);
    if (c < m - 1) out.push(i + 1);
    if (r > 0) out.push(i - m);
    if (r < n - 1) out.push(i + m);
    return out;
  };

  // Czy wszystkie białe pola (black[i] === 0) tworzą jeden obszar.
  function whiteConnected(black, n, m) {
    const N = n * m;
    let start = -1, white = 0;
    for (let i = 0; i < N; i++) if (!black[i]) { white++; if (start < 0) start = i; }
    if (!white) return false;
    if (white === 1) return true;
    const seen = new Uint8Array(N);
    const q = [start];
    seen[start] = 1;
    let count = 1;
    for (let h = 0; h < q.length; h++) {
      for (const k of neighbours(n, m, q[h])) {
        if (!black[k] && !seen[k]) { seen[k] = 1; count++; q.push(k); }
      }
    }
    return count === white;
  }

  // Liczba połączonych obszarów białych pól (do panelu).
  function whiteAreas(black, n, m) {
    const N = n * m;
    const seen = new Uint8Array(N);
    let areas = 0;
    for (let i = 0; i < N; i++) {
      if (black[i] || seen[i]) continue;
      areas++;
      const q = [i];
      seen[i] = 1;
      for (let h = 0; h < q.length; h++) {
        for (const k of neighbours(n, m, q[h])) {
          if (!black[k] && !seen[k]) { seen[k] = 1; q.push(k); }
        }
      }
    }
    return areas;
  }

  // Losowe poprawne rozwiązanie: czarne pola nie stykają się, białe tworzą całość.
  function makeSolution(n, m) {
    const N = n * m;
    for (let attempt = 0; attempt < 40; attempt++) {
      const black = new Uint8Array(N);
      const order = shuffle([...Array(N).keys()]);
      const p = attempt < 30 ? 0.33 : 0.22;
      for (const i of order) {
        if (rnd(100) / 100 > p) continue;
        let ok = true;
        for (const k of neighbours(n, m, i)) if (black[k]) { ok = false; break; }
        if (!ok) continue;
        black[i] = 1;
        if (!whiteConnected(black, n, m)) black[i] = 0;
      }
      const count = black.reduce((a, b) => a + b, 0);
      if (count < Math.max(2, Math.round(N * 0.09))) continue;
      if (count > N * 0.42) continue;
      return black;
    }
    return null;
  }

  // Liczby widoczności dla wszystkich białych pól; 0 = pole nie jest liczbą.
  function cluesFrom(black, n, m) {
    const N = n * m;
    const clue = new Int16Array(N);
    for (let i = 0; i < N; i++) {
      if (black[i]) continue;
      const r = (i / m) | 0, c = i % m;
      let count = 1;
      for (let k = c - 1; k >= 0 && !black[r * m + k]; k--) count++;
      for (let k = c + 1; k < m && !black[r * m + k]; k++) count++;
      for (let k = r - 1; k >= 0 && !black[k * m + c]; k--) count++;
      for (let k = r + 1; k < n && !black[k * m + c]; k++) count++;
      clue[i] = count;
    }
    return clue;
  }

  // Ile białych pól widać z pola i (łącznie z nim); czarne pole zasłania.
  function visibleCount(black, n, m, i) {
    if (black[i]) return 0;
    const r = (i / m) | 0, c = i % m;
    let count = 1;
    for (let k = c - 1; k >= 0 && !black[r * m + k]; k--) count++;
    for (let k = c + 1; k < m && !black[r * m + k]; k++) count++;
    for (let k = r - 1; k >= 0 && !black[k * m + c]; k--) count++;
    for (let k = r + 1; k < n && !black[k * m + c]; k++) count++;
    return count;
  }

  // Liczy rozwiązania (do `limit`) metodą przeszukiwania z prostymi wnioskami.
  // Stan w solverze: 1 = białe, 0 = czarne, -1 = jeszcze nie wiadomo.
  function countSolutions(clue, n, m, limit = 2, deadline = Infinity, onSolution = null) {
    const N = n * m;
    const st = new Int8Array(N).fill(-1);
    for (let i = 0; i < N; i++) if (clue[i] > 0) st[i] = 1;
    let found = 0, nodes = 0, stopped = false;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    function propagate(trail) {
      let changed = true;
      while (changed) {
        changed = false;
        if ((nodes & 511) === 0 && Date.now() > deadline) { stopped = true; return false; }

        // czarne pole zmusza sąsiadów do bieli; dwa czarne obok siebie są błędem
        for (let i = 0; i < N; i++) {
          if (st[i] !== 0) continue;
          for (const k of neighbours(n, m, i)) {
            if (st[k] === 0) return false;
            if (st[k] === -1) { st[k] = 1; trail.push(k); changed = true; }
          }
        }

        for (let i = 0; i < N; i++) {
          const c = clue[i];
          if (!c) continue;
          if (st[i] === 0) return false;
          if (st[i] === -1) { st[i] = 1; trail.push(i); changed = true; }
          const r = (i / m) | 0, cc = i % m;
          let min = 1, max = 1;
          for (const [dr, dc] of dirs) {
            let rr = r + dr, ccc = cc + dc, blocked = false;
            while (rr >= 0 && rr < n && ccc >= 0 && ccc < m) {
              const k = rr * m + ccc;
              if (st[k] === 0) break;
              if (st[k] === 1) {
                if (!blocked) min++;
                max++;
              } else {
                max++;
                blocked = true;
              }
              rr += dr;
              ccc += dc;
            }
          }
          if (max < c || min > c) return false;

          // jeśli nawet wszystkie nieznane byłyby białe, widok jest za mały
          if (max === c) {
            for (const [dr, dc] of dirs) {
              let rr = r + dr, ccc = cc + dc;
              while (rr >= 0 && rr < n && ccc >= 0 && ccc < m) {
                const k = rr * m + ccc;
                if (st[k] === 0) break;
                if (st[k] === -1) { st[k] = 1; trail.push(k); changed = true; }
                rr += dr;
                ccc += dc;
              }
            }
          }

          // pierwsze nieznane pole w każdym kierunku musi być czarne,
          // inaczej widok byłby większy od liczby
          if (min === c) {
            for (const [dr, dc] of dirs) {
              let rr = r + dr, ccc = cc + dc;
              while (rr >= 0 && rr < n && ccc >= 0 && ccc < m) {
                const k = rr * m + ccc;
                if (st[k] === 0) break;
                if (st[k] === 1) { rr += dr; ccc += dc; continue; }
                st[k] = 0;
                trail.push(k);
                changed = true;
                break;
              }
            }
          }
        }
      }
      return true;
    }

    function validFull() {
      for (let i = 0; i < N; i++) {
        if (st[i] === -1) return false;
        if (st[i] === 0) {
          const r = (i / m) | 0, c = i % m;
          if (c < m - 1 && st[i + 1] === 0) return false;
          if (r < n - 1 && st[i + m] === 0) return false;
        }
      }
      const black = new Uint8Array(N);
      for (let i = 0; i < N; i++) black[i] = st[i] === 0 ? 1 : 0;
      if (!whiteConnected(black, n, m)) return false;
      for (let i = 0; i < N; i++) {
        if (!clue[i]) continue;
        const r = (i / m) | 0, c = i % m;
        let count = 1;
        for (let k = c - 1; k >= 0 && st[r * m + k] === 1; k--) count++;
        for (let k = c + 1; k < m && st[r * m + k] === 1; k++) count++;
        for (let k = r - 1; k >= 0 && st[k * m + c] === 1; k--) count++;
        for (let k = r + 1; k < n && st[k * m + c] === 1; k++) count++;
        if (count !== clue[i]) return false;
      }
      return true;
    }

    function rec() {
      if (stopped) return;
      if (++nodes > 2500000) { stopped = true; return; }
      const trail = [];
      if (!propagate(trail)) {
        for (const k of trail) st[k] = -1;
        return;
      }
      let pick = -1, best = -1;
      for (let i = 0; i < N; i++) {
        if (st[i] !== -1) continue;
        let score = 0;
        for (const k of neighbours(n, m, i)) {
          if (st[k] === 0) score += 2;
          else if (st[k] === 1) score++;
        }
        if (score > best) { best = score; pick = i; }
      }
      if (pick < 0) {
        if (validFull()) {
          found++;
          if (onSolution) {
            const black = new Uint8Array(N);
            for (let i = 0; i < N; i++) black[i] = st[i] === 0 ? 1 : 0;
            onSolution(black);
          }
        }
        for (const k of trail) st[k] = -1;
        return;
      }
      for (const v of [0, 1]) {
        st[pick] = v;
        rec();
        st[pick] = -1;
        if (stopped || found >= limit) break;
      }
      for (const k of trail) st[k] = -1;
    }

    rec();
    return { found, nodes, stopped };
  }

  // Zwraca jedno rozwiązanie (dla testów i sprawdzeń); null, gdy go nie ma.
  function solve(clue, n, m, deadline = Infinity) {
    let out = null;
    countSolutions(clue, n, m, 1, deadline, (black) => { out = black; });
    return out;
  }

  // Nowa łamigłówka: losowe rozwiązanie, potem ukrywanie liczb tak długo,
  // jak rozwiązanie pozostaje jednoznaczne.
  function build(n, m, target, budget = 700) {
    const started = Date.now();
    let best = null;
    for (let attempt = 0; attempt < 12; attempt++) {
      if (Date.now() - started > budget * 3) break;
      const black = makeSolution(n, m);
      if (!black) continue;
      const clue = cluesFrom(black, n, m);
      const N = n * m;
      const full = countSolutions(clue, n, m, 2, Date.now() + Math.max(180, budget));
      if (full.stopped || full.found !== 1) continue;

      const whiteCells = [];
      for (let i = 0; i < N; i++) if (!black[i]) whiteCells.push(i);
      const order = shuffle(whiteCells);
      let hidden = 0;
      const deadline = Date.now() + budget;
      for (const i of order) {
        if (hidden >= target || Date.now() > deadline) break;
        const old = clue[i];
        clue[i] = 0;
        const r = countSolutions(clue, n, m, 2, deadline);
        if (r.found === 1 && !r.stopped) hidden++;
        else clue[i] = old;
      }
      if (!best || hidden > best.hidden) {
        best = { n, m, clue, solution: black, hidden, clueCount: whiteCells.length };
      }
      if (hidden >= target) break;
    }

    if (!best) {
      // Awaryjnie: plansza z wszystkimi liczbami, zawsze poprawna.
      const black = makeSolution(n, m) || (() => {
        const b = new Uint8Array(n * m);
        b[0] = 1;
        return b;
      })();
      const clue = cluesFrom(black, n, m);
      best = { n, m, clue, solution: black, hidden: 0, clueCount: clue.filter((v) => v > 0).length };
    }
    return best;
  }

  // Błędy widoczne od razu: za mały widok, widok nie do zmniejszenia, czarne obok siebie.
  function conflicts(p, black) {
    const { n, m, clue } = p;
    const N = n * m;
    const bad = new Set();
    const counts = new Int16Array(N);
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

    for (let i = 0; i < N; i++) {
      const target = clue[i];
      if (!target) continue;
      if (black[i]) { bad.add(i); continue; }
      const c = visibleCount(black, n, m, i);
      counts[i] = c;
      if (c < target) { bad.add(i); continue; }
      if (c === target) continue;

      // Widok jest za duży, ale da się go zmniejszyć tylko przez zasłonięcie
      // widocznego pola bez liczby.
      const r = (i / m) | 0, cc = i % m;
      let canReduce = false;
      for (const [dr, dc] of dirs) {
        let rr = r + dr, ccc = cc + dc;
        while (rr >= 0 && rr < n && ccc >= 0 && ccc < m) {
          const k = rr * m + ccc;
          if (black[k]) break;
          if (!clue[k]) { canReduce = true; break; }
          rr += dr;
          ccc += dc;
        }
        if (canReduce) break;
      }
      if (!canReduce) bad.add(i);
    }

    for (let i = 0; i < N; i++) {
      if (!black[i]) continue;
      for (const k of neighbours(n, m, i)) {
        if (black[k]) { bad.add(i); bad.add(k); }
      }
    }
    return { bad, counts };
  }

  function solved(p, black) {
    const { n, m, clue } = p;
    const N = n * m;
    for (let i = 0; i < N; i++) {
      if (!clue[i]) continue;
      if (black[i] || visibleCount(black, n, m, i) !== clue[i]) return false;
    }
    for (let i = 0; i < N; i++) {
      if (!black[i]) continue;
      for (const k of neighbours(n, m, i)) if (black[k]) return false;
    }
    return whiteConnected(black, n, m);
  }

  if (typeof module !== "undefined") {
    module.exports = {
      build, cluesFrom, conflicts, countSolutions, makeSolution, neighbours,
      solve, solved, visibleCount, whiteAreas, whiteConnected,
    };
  }

  // --- Rejestracja gry ---
  if (typeof registerGame !== "undefined") registerGame({
    id: "zaslony",
    cat: "logiczne",
    name: "Zasłony",
    author: "DeepSeek V4.1 Flash",
    desc: "Zamaluj pola, które zasłaniają widok. Liczba mówi, ile białych pól widać z danego miejsca.",
    color: "#3f6212",
    ink: "#ffffff",
    glyph: [".###.", ".#.#.", "#...#", ".#.#.", ".###."],
    levels: [
      { key: "easy", name: "5 × 5", points: 10, n: 5, m: 5, hide: 7, budget: 260 },
      { key: "medium", name: "7 × 7", points: 25, n: 7, m: 7, hide: 16, budget: 520 },
      { key: "hard", name: "9 × 9", points: 50, n: 9, m: 9, hide: 30, budget: 950 },
    ],
    rules: [
      "Czarne pola zasłaniają widok. Liczba w białym polu mówi, ile białych pól widać z niego w rzędzie i kolumnie, razem z nim samym.",
      "Czarne pola nie mogą stykać się bokami, a wszystkie białe pola muszą tworzyć jedną połączoną całość.",
      "Pola z liczbami zostają białe. Kliknij inne pole, aby je zasłonić lub odsłonić.",
      "Strzałki wybierają pole, spacja lub Enter przełącza je. Podpowiedź odsłania jedną pewną zasłonę.",
    ],
    achievements: [
      { id: "bez-podpowiedzi", name: "Samodzielnie", desc: "Wygraj dowolny poziom bez podpowiedzi.", points: 10 },
      { id: "bystre-oko", name: "Bystre oko", desc: "Rozwiąż planszę 5 × 5 w mniej niż minutę.", points: 10 },
      { id: "czyste-pole", name: "Czyste pole", desc: "Wygraj średni lub trudny poziom bez błędnego zamalowania.", points: 25 },
      { id: "bez-cofania", name: "Pewna ręka", desc: "Wygraj średni lub trudny poziom bez cofania ruchu.", points: 25 },
      { id: "mistrz-zaslon", name: "Mistrz zasłon", desc: "Wygraj planszę 9 × 9 bez podpowiedzi i cofania.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, m, key } = ctx.level;
      const p = build(n, m, ctx.level.hide, ctx.level.budget);
      const N = n * m;
      const blacks = new Uint8Array(N);
      let cursor = 0;
      while (cursor < N && p.clue[cursor] > 0) cursor++;
      let hinted = false, wrong = 0, warnedClue = false, warnedArea = false;

      const cells = gridCells(board, m, n, "zs-grid", {
        gap: 0.055,
        label: (r, c) => `Wiersz ${r + 1}, kolumna ${c + 1}`,
      });

      const clueEl = statBlock(ctx, "Liczby", { meter: true });
      const stats = statsBlock(ctx, "Plansza", ["Czarne", "Obszary"]);
      ctx.panel.append(panelBlock("", button("Podpowiedź", "btn-ghost wide", hint)));

      const save = ctx.undoable((snap) => {
        blacks.set(snap.blacks);
        cursor = snap.cursor;
        render();
      });

      function toggle(i) {
        if (ctx.done) return;
        if (p.clue[i] > 0) {
          if (!warnedClue) {
            warnedClue = true;
            ctx.toast("Pola z liczbami zostają białe.");
          }
          Sound.tap();
          return;
        }
        save({ blacks: blacks.slice(), cursor });
        cursor = i;
        if (blacks[i]) {
          blacks[i] = 0;
          Sound.erase();
        } else {
          blacks[i] = 1;
          if (!p.solution[i]) wrong++;
          Sound.place(2 + (i % 7));
        }
        render();
      }

      function hint() {
        if (ctx.done) return;
        hinted = true;
        let i = -1;
        for (let k = 0; k < N; k++) if (blacks[k] && !p.solution[k]) { i = k; break; }
        if (i >= 0) {
          blacks[i] = 0;
          Sound.erase();
          ctx.toast("To pole nie jest zasłoną.");
        } else {
          for (let k = 0; k < N; k++) if (p.solution[k] && !blacks[k]) { i = k; break; }
          if (i < 0) return;
          blacks[i] = 1;
          Sound.place(5);
          ctx.toast("Ta zasłona jest pewna.");
        }
        cursor = i;
        render();
        replay(cells[i], "ui-pop");
      }

      function finish() {
        if (ctx.done) return;
        if (!hinted) ctx.achieve("bez-podpowiedzi");
        if (key === "easy" && ctx.time < 60) ctx.achieve("bystre-oko");
        if (key !== "easy" && wrong === 0) ctx.achieve("czyste-pole");
        if (key !== "easy" && ctx.undos === 0) ctx.achieve("bez-cofania");
        if (key === "hard" && !hinted && ctx.undos === 0) ctx.achieve("mistrz-zaslon");
        ctx.win("Wszystkie liczby się zgadzają, a białe pola tworzą jedną całość.");
      }

      function render() {
        const { bad, counts } = conflicts(p, blacks);
        let ok = 0, clueTotal = 0;
        for (let i = 0; i < N; i++) {
          const b = cells[i];
          const c = p.clue[i];
          const good = c > 0 && counts[i] === c;
          if (c > 0) {
            clueTotal++;
            if (good) ok++;
            if (b.dataset.n !== String(c)) {
              b.dataset.n = String(c);
              b.textContent = c;
            }
          } else if (b.dataset.n) {
            b.dataset.n = "";
            b.textContent = "";
          }
          b.classList.toggle("is-clue", c > 0);
          b.classList.toggle("is-lock", c > 0);
          b.classList.toggle("is-on", blacks[i] === 1);
          b.classList.toggle("is-ok", good);
          b.classList.toggle("is-bad", bad.has(i));
          b.classList.toggle("cursor", i === cursor);
          if (c > 0) {
            b.setAttribute("aria-label", `Wiersz ${((i / m) | 0) + 1}, kolumna ${(i % m) + 1}, liczba ${c}${good ? ", zgodna" : ""}`);
            b.removeAttribute("aria-pressed");
          } else {
            b.setAttribute("aria-label", `Wiersz ${((i / m) | 0) + 1}, kolumna ${(i % m) + 1}, ${blacks[i] ? "zasłonięte" : "białe"}`);
            b.setAttribute("aria-pressed", blacks[i] ? "true" : "false");
          }
        }

        const blackCount = blacks.reduce((a, v) => a + v, 0);
        const areas = whiteAreas(blacks, n, m);
        clueEl.set(`${ok} z ${clueTotal}`, clueTotal ? ok / clueTotal : 0, ok === clueTotal ? "Wszystkie zgodne" : "");
        stats.set("Czarne", blackCount);
        stats.set("Obszary", areas);
        ctx.progress(clueTotal ? ok / clueTotal : 0);

        if (areas > 1 && !warnedArea) {
          warnedArea = true;
          ctx.toast("Białe pola muszą tworzyć jedną całość.");
        }
        if (solved(p, blacks)) finish();
      }

      board.addEventListener("click", (e) => {
        const b = e.target.closest(".zs-grid .gb-cell");
        if (b) toggle(+b.dataset.i);
      });
      cellKeys(ctx, {
        cols: m,
        rows: n,
        get: () => cursor,
        set: (i) => { cursor = i; render(); },
        keys: { " ": () => toggle(cursor), enter: () => toggle(cursor) },
      });

      render();
    },
  });
}
