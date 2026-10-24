// Perły: masyu. Jedna pętla przez białe i czarne perły.
{
  const BIT = [1, 2, 4, 8], DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];
  const pop = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
  const at = (n, r, c) => (r < 0 || c < 0 || r >= n || c >= n ? -1 : r * n + c);
  const step = (n, i, d) => at(n, ((i / n) | 0) + DR[d], (i % n) + DC[d]);

  function adj(n, a, b) {
    const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  function growLoop(n) {
    const r0 = rnd(n - 1), c0 = rnd(n - 1);
    const loop = [r0 * n + c0, r0 * n + c0 + 1, (r0 + 1) * n + c0 + 1, (r0 + 1) * n + c0];
    const used = new Uint8Array(n * n);
    loop.forEach((i) => (used[i] = 1));
    const target = Math.min(n * n - n * n % 2, 6 + 2 * ((n * n * 0.32) | 0) + 2 * rnd(Math.max(1, n - 2)));
    for (let t = 0; t < n * n * 30 && loop.length < target; t++) {
      const k = rnd(loop.length);
      const a = loop[k], b = loop[(k + 1) % loop.length];
      const ar = (a / n) | 0, ac = a % n, br = (b / n) | 0, bc = b % n;
      const perps = ar === br ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
      shuffle(perps);
      for (const [pr, pc] of perps) {
        const x = at(n, ar + pr, ac + pc), y = at(n, br + pr, bc + pc);
        if (x < 0 || y < 0 || used[x] || used[y]) continue;
        loop.splice(k + 1, 0, x, y);
        used[x] = used[y] = 1;
        break;
      }
    }
    return loop;
  }

  function maskFromLoop(n, loop) {
    const m = new Int8Array(n * n);
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      const d = b === a - n ? 0 : b === a + 1 ? 1 : b === a + n ? 2 : 3;
      m[a] |= BIT[d];
      m[b] |= BIT[(d + 2) % 4];
    }
    return m;
  }

  function turnAt(loop, i) {
    const L = loop.length, p = loop[(i - 1 + L) % L], c = loop[i], q = loop[(i + 1) % L];
    return (c - p) !== (q - c);
  }

  function pearlsFrom(n, loop) {
    const pearls = new Int8Array(n * n);
    for (let i = 0; i < loop.length; i++) {
      const t = turnAt(loop, i), t0 = turnAt(loop, (i - 1 + loop.length) % loop.length), t1 = turnAt(loop, (i + 1) % loop.length);
      if (t && !t0 && !t1) pearls[loop[i]] = 2;
      else if (!t && (t0 || t1)) pearls[loop[i]] = 1;
    }
    return pearls;
  }

  function connected(n, mask) {
    const used = [];
    for (let i = 0; i < n * n; i++) if (mask[i]) used.push(i);
    if (!used.length) return false;
    for (const i of used) if (pop(mask[i]) !== 2) return false;
    const seen = new Uint8Array(n * n);
    const q = [used[0]];
    seen[used[0]] = 1;
    let k = 0;
    while (q.length) {
      const i = q.pop();
      k++;
      for (let d = 0; d < 4; d++) if (mask[i] & BIT[d]) {
        const j = step(n, i, d);
        if (j >= 0 && !seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    return k === used.length;
  }

  function rulesOk(n, pearls, mask) {
    for (let i = 0; i < n * n; i++) {
      const p = pearls[i];
      if (!p) continue;
      if (pop(mask[i]) !== 2) return false;
      if (p === 1) {
        if (mask[i] !== 5 && mask[i] !== 10) return false;
        let bent = false;
        for (let d = 0; d < 4; d++) if (mask[i] & BIT[d]) {
          const m = mask[step(n, i, d)];
          if (m !== 5 && m !== 10) bent = true;
        }
        if (!bent) return false;
      } else {
        if (mask[i] !== 3 && mask[i] !== 6 && mask[i] !== 12 && mask[i] !== 9) return false;
        for (let d = 0; d < 4; d++) if (mask[i] & BIT[d]) {
          if (mask[step(n, i, d)] !== ((d & 1) ? 10 : 5)) return false;
        }
      }
    }
    return connected(n, mask);
  }

  function pearlFit(n, pearls, i, m) {
    const p = pearls[i];
    if (p === 1 && m !== 5 && m !== 10) return false;
    if (p === 2) {
      if (m !== 3 && m !== 6 && m !== 12 && m !== 9) return false;
      const r = (i / n) | 0, c = i % n;
      for (let d = 0; d < 4; d++) if (m & BIT[d]) {
        if (at(n, r + 2 * DR[d], c + 2 * DC[d]) < 0) return false;
      }
    }
    if (p && !m) return false;
    return true;
  }

  function solve(n, pearls, limit = 2, budget = n * n * 4000) {
    const g = new Int8Array(n * n).fill(-1);
    for (let i = 0; i < n * n; i++) {
      if (pearls[i] !== 1) continue;
      const r = (i / n) | 0, c = i % n;
      if (r === 0 || r === n - 1) { if (c > 0 && c < n - 1) g[i] = 10; }
      else if (c === 0 || c === n - 1) g[i] = 5;
    }
    let found = 0, first = null, nodes = 0, overflow = false;
    const rec = (i) => {
      if (found >= limit || overflow) return;
      if (++nodes > budget) { overflow = true; return; }
      if (i === n * n) {
        if (rulesOk(n, pearls, g)) { if (!found) first = g.slice(); found++; }
        return;
      }
      const r = (i / n) | 0, c = i % n;
      let must = 0, cant = 0;
      if (r === 0) cant |= 1;
      else if (g[i - n] & 4) must |= 1; else cant |= 1;
      if (c === 0) cant |= 8;
      else if (g[i - 1] & 2) must |= 8; else cant |= 8;
      if (c === n - 1) cant |= 2;
      if (r === n - 1) cant |= 4;
      if (must & cant) return;
      const preset = g[i];
      for (const extra of [0, 2, 4, 6]) {
        const m = must | extra;
        if (preset >= 0 && m !== preset) continue;
        if ((m & cant) || (pop(m) !== 0 && pop(m) !== 2) || !pearlFit(n, pearls, i, m)) continue;
        g[i] = m;
        rec(i + 1);
      }
      g[i] = preset;
    };
    rec(0);
    return { found, first, overflow };
  }

  function generate(n, minP) {
    for (let t = 0; t < 300; t++) {
      const loop = growLoop(n);
      if (loop.length < n * 2) continue;
      const pearls = pearlsFrom(n, loop);
      const spots = [];
      pearls.forEach((p, i) => { if (p) spots.push(i); });
      if (spots.length < minP) continue;
      let r = solve(n, pearls, 2);
      if (r.overflow || r.found !== 1) continue;
      let first = r.first;
      for (const i of shuffle(spots.slice())) {
        if (pearls.reduce((a, p) => a + (p ? 1 : 0), 0) <= minP) break;
        const keep = pearls[i];
        pearls[i] = 0;
        r = solve(n, pearls, 2);
        if (r.overflow || r.found !== 1) pearls[i] = keep;
        else first = r.first;
      }
      return { n, pearls, mask: first, loop };
    }
    return null;
  }

  function cycleClose(n, mask, a, b) {
    if (!mask[a] || !mask[b]) return false;
    const seen = new Uint8Array(n * n);
    const q = [a];
    seen[a] = 1;
    while (q.length) {
      const i = q.pop();
      if (i === b) return true;
      for (let d = 0; d < 4; d++) if (mask[i] & BIT[d]) {
        const j = step(n, i, d);
        if (j >= 0 && !seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    return false;
  }

  if (typeof module !== "undefined") module.exports = { generate, solve, rulesOk, growLoop, pearlsFrom, maskFromLoop };

  if (typeof registerGame !== "undefined") registerGame({
    id: "perly",
    cat: "logiczne",
    name: "Perły",
    author: "Cursor Grok 4.6",
    desc: "Narysuj pętlę przez perły. Biała każe iść prosto, czarna skręcić.",
    color: "#a21caf",
    ink: "#ffffff",
    glyph: [".###.", "#...#", "#.#.#", "#...#", ".###."],
    levels: [
      { key: "easy", name: "5 × 5", points: 10, n: 5, minP: 7, misses: 5 },
      { key: "medium", name: "6 × 6", points: 25, n: 6, minP: 6, misses: 3 },
      { key: "hard", name: "7 × 7", points: 50, n: 7, minP: 5, misses: 2 },
    ],
    rules: [
      "Przeciągnij palcem albo myszą po sąsiednich polach, by rysować i ścierać linię. Strzałki przesuwają kursor, spacja zaznacza, kolejna strzałka dorysowuje.",
      "Jedna zamknięta pętla przechodzi przez wszystkie perły. Nie rozgałęzia się i nie musi wypełniać pustych pól.",
      "Biała perła: linia idzie prosto i skręca obok. Czarna: skręca na perle, a na obu sąsiadach idzie prosto.",
      "Trzecie ramie, pętla za wcześnie albo złamana perła to pomyłka. Sprawdź zamyka partię: zgadza się — wygrana, nie — pomyłka.",
    ],
    achievements: [
      { id: "bez-bledu", name: "Czysta nić", desc: "Rozwiąż planszę bez pomyłki.", points: 10 },
      { id: "bez-podpowiedzi", name: "Z pamięci", desc: "Wygraj średni lub trudny poziom bez podpowiedzi.", points: 25 },
      { id: "szybka-petla", name: "Szybka pętla", desc: "Wygraj poziom 7 × 7 w mniej niż 2 minuty.", points: 50 },
    ],

    mount(board, ctx) {
      const { n, minP, misses, key } = ctx.level;
      let puz = null;
      for (let k = 0; k < 3 && !puz; k++) puz = generate(n, minP);
      if (!puz) return ctx.lose("Brak planszy", "Nie udało się ułożyć łamigłówki. Spróbuj nowej gry.");
      const { pearls, mask: sol } = puz;
      const s = { mask: new Int8Array(n * n), pick: -1, cursor: 0, misses: 0, hints: 0, drag: -1, moved: false };
      const pearlN = pearls.reduce((a, v) => a + (v ? 1 : 0), 0);
      const solEdges = sol.reduce((a, m, i) => a + ((m & 2) ? 1 : 0) + ((m & 4) ? 1 : 0), 0);

      board.classList.add("paper");
      const btns = gridCells(board, n, n, "pe-grid", {
        gap: 0.1,
        label: (r, c) => {
          const i = r * n + c, p = pearls[i];
          return `Wiersz ${r + 1}, kolumna ${c + 1}${p === 1 ? ", biała perła" : p === 2 ? ", czarna perła" : ""}`;
        },
      });
      board.style.setProperty("--max", "72px");
      const ring = selectionRing(board);
      btns.forEach((b, i) => {
        b.append(el("span", "pe-e"), el("span", "pe-s"), el("span", "pe-mid"), el("span", "pe-pearl"));
        if (pearls[i] === 1) b.classList.add("white");
        if (pearls[i] === 2) b.classList.add("black");
      });

      const leftEl = statBlock(ctx, "Perły", { meter: true });
      const missEl = pipsBlock(ctx, "Pomyłki", misses, { icon: "dot" });
      const actions = el("div", "panel-row");
      actions.append(button("Sprawdź", "btn wide", check), button("Podpowiedź", "btn-ghost wide", hint));
      ctx.panel.append(panelBlock("", actions));

      const save = ctx.undoable((snap) => {
        s.mask = Int8Array.from(snap.mask);
        s.pick = snap.pick;
        s.misses = snap.misses;
        render();
      });

      function dirOf(a, b) {
        return b === a - n ? 0 : b === a + 1 ? 1 : b === a + n ? 2 : b === a - 1 ? 3 : -1;
      }

      function pearlBroken(mask, i) {
        const p = pearls[i], m = mask[i];
        if (pop(m) !== 2) return false;
        if (p === 1) return m !== 5 && m !== 10;
        if (p === 2) return m !== 3 && m !== 6 && m !== 12 && m !== 9;
        return false;
      }

      function miss(i, text) {
        s.misses++;
        Sound.error();
        if (i >= 0) replay(btns[i], "shake");
        if (text) ctx.toast(text);
        render();
        if (s.misses > misses) ctx.lose("Za dużo pomyłek", `Dozwolone: ${misses}.`);
      }

      function winIfDone() {
        if (ctx.done || !rulesOk(n, pearls, s.mask)) return false;
        Sound.line();
        render();
        finish();
        return true;
      }

      function apply(a, b) {
        if (ctx.done || a === b || !adj(n, a, b)) return;
        const d = dirOf(a, b), od = (d + 2) % 4;
        const on = !!(s.mask[a] & BIT[d]);
        save({ mask: Array.from(s.mask), pick: s.pick, misses: s.misses });
        if (on) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          Sound.erase();
          s.pick = -1;
          render();
          winIfDone();
          return;
        }
        const closed = cycleClose(n, s.mask, a, b);
        s.mask[a] |= BIT[d];
        s.mask[b] |= BIT[od];
        if (pop(s.mask[a]) > 2 || pop(s.mask[b]) > 2) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          miss(a, "Linia nie może się rozgałęziać");
          s.pick = -1;
          return;
        }
        if (pearlBroken(s.mask, a) || pearlBroken(s.mask, b)) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          miss(a, "Ta perła wymaga innego skrętu");
          s.pick = -1;
          return;
        }
        if (closed && !rulesOk(n, pearls, s.mask)) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          miss(a, "Ta pętla nie spełnia pereł");
          s.pick = -1;
          return;
        }
        Sound.place(1 + pop(s.mask[a]));
        s.pick = -1;
        render();
        winIfDone();
      }

      function choose(i) {
        if (ctx.done) return;
        s.cursor = i;
        if (s.pick < 0 || s.pick === i) {
          s.pick = s.pick === i ? -1 : i;
          Sound.tap();
          return render();
        }
        if (!adj(n, s.pick, i)) {
          s.pick = i;
          Sound.tap();
          return render();
        }
        apply(s.pick, i);
      }

      function check() {
        if (ctx.done) return;
        if (rulesOk(n, pearls, s.mask)) return winIfDone();
        if (![...s.mask].some(Boolean)) return ctx.toast("Najpierw narysuj pętlę");
        btns.forEach((b, i) => {
          if (pearls[i] && (pop(s.mask[i]) !== 2 || pearlBroken(s.mask, i))) replay(b, "shake");
        });
        miss(-1, "Pętla jeszcze nie zgadza się z perłami");
      }

      function hint() {
        if (ctx.done) return;
        for (let i = 0; i < n * n; i++) {
          const extra = s.mask[i] & ~sol[i];
          if (!extra) continue;
          for (let d = 0; d < 4; d++) if (extra & BIT[d]) {
            s.hints++;
            save({ mask: Array.from(s.mask), pick: s.pick, misses: s.misses });
            s.mask[i] &= ~BIT[d];
            s.mask[step(n, i, d)] &= ~BIT[(d + 2) % 4];
            sweep([btns[i]]);
            ctx.toast("Ten odcinek nie należy do pętli");
            s.pick = -1;
            render();
            winIfDone();
            return;
          }
        }
        for (let i = 0; i < n * n; i++) {
          const missE = sol[i] & ~s.mask[i];
          if (!missE) continue;
          for (let d = 1; d <= 2; d++) if (missE & BIT[d]) {
            s.hints++;
            save({ mask: Array.from(s.mask), pick: s.pick, misses: s.misses });
            s.mask[i] |= BIT[d];
            s.mask[step(n, i, d)] |= BIT[(d + 2) % 4];
            sweep([btns[i], btns[step(n, i, d)]]);
            ctx.toast("Ten odcinek należy do pętli");
            s.pick = -1;
            render();
            winIfDone();
            return;
          }
        }
      }

      function finish() {
        if (ctx.done) return;
        if (!s.misses) ctx.achieve("bez-bledu");
        if (!s.hints && key !== "easy") ctx.achieve("bez-podpowiedzi");
        if (key === "hard" && ctx.time < 120) ctx.achieve("szybka-petla");
        ctx.win(s.misses ? `Pomyłki: ${s.misses}.` : "Bez pomyłki.");
      }

      function cellAt(e) {
        const node = document.elementFromPoint(e.clientX, e.clientY);
        const b = node && node.closest && node.closest(".gb-cell");
        return b && board.contains(b) ? +b.dataset.i : -1;
      }
      const endDrag = (e) => {
        if (s.drag < 0) return;
        const i = s.drag, moved = s.moved;
        s.drag = -1;
        try { board.releasePointerCapture(e.pointerId); } catch {}
        if (!moved) choose(i);
      };
      board.addEventListener("pointerdown", (e) => {
        const i = cellAt(e);
        if (i < 0 || ctx.done) return;
        s.drag = i;
        s.moved = false;
        s.cursor = i;
        try { board.setPointerCapture(e.pointerId); } catch {}
        render();
      });
      board.addEventListener("pointermove", (e) => {
        if (s.drag < 0 || ctx.done) return;
        const i = cellAt(e);
        if (i < 0 || i === s.drag || !adj(n, s.drag, i)) return;
        s.moved = true;
        apply(s.drag, i);
        s.drag = i;
      });
      board.addEventListener("pointerup", endDrag);
      board.addEventListener("pointercancel", endDrag);
      cellKeys(ctx, {
        cols: n, rows: n,
        get: () => s.cursor,
        set: (i) => {
          if (s.pick >= 0 && adj(n, s.pick, i)) { s.cursor = i; apply(s.pick, i); return; }
          s.cursor = i;
          render();
        },
        keys: { " ": () => choose(s.cursor) },
      });

      function render() {
        let doneP = 0, goodE = 0, ends = 0;
        btns.forEach((b, i) => {
          const m = s.mask[i], deg = pop(m);
          b.classList.toggle("e", !!(m & 2));
          b.classList.toggle("s", !!(m & 4));
          b.classList.toggle("has", deg > 0);
          b.classList.toggle("is-sel", i === s.pick);
          b.classList.toggle("cursor", i === s.cursor);
          b.classList.toggle("is-ok", !!(pearls[i] && deg === 2 && !pearlBroken(s.mask, i)));
          b.classList.toggle("is-bad", pearlBroken(s.mask, i));
          if (pearls[i] && deg === 2 && !pearlBroken(s.mask, i)) doneP++;
          if (m & 2 && sol[i] & 2) goodE++;
          if (m & 4 && sol[i] & 4) goodE++;
          if (deg === 1) ends++;
        });
        ring(btns[s.cursor]);
        const note = ends ? `${ends} ${plural(ends, "otwarty koniec", "otwarte końce", "otwartych końców")}` : "";
        leftEl.set(`${doneP} z ${pearlN}`, pearlN ? doneP / pearlN : 0, note);
        missEl.set(Math.max(0, misses - s.misses));
        ctx.progress(solEdges ? Math.min(0.95, goodE / solEdges) * (doneP / Math.max(1, pearlN)) ** 0.5 : 0);
        if (ctx.done) ctx.progress(1);
      }
      render();
    },
  });
}
