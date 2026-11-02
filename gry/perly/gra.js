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

  const straight = (m) => m === 5 || m === 10;
  const corner = (m) => m === 3 || m === 6 || m === 9 || m === 12;

  // "" za wcześnie, "wait" kształt dobry lecz sąsiad niedokończony, "ok" / "bad" gdy da się rozstrzygnąć.
  function pearlStatus(n, pearls, mask, i) {
    const p = pearls[i], m = mask[i];
    if (!p || pop(m) !== 2) return "";
    const nbr = (d) => mask[step(n, i, d)];
    if (p === 1) {
      if (!straight(m)) return "bad";
      let bent = false, open = false;
      for (let d = 0; d < 4; d++) if (m & BIT[d]) {
        const q = nbr(d), deg = pop(q);
        if (deg < 2) open = true;
        else if (!straight(q)) bent = true;
      }
      if (bent) return "ok";
      return open ? "wait" : "bad";
    }
    if (!corner(m)) return "bad";
    let open = false;
    for (let d = 0; d < 4; d++) if (m & BIT[d]) {
      const q = nbr(d), deg = pop(q);
      if (deg < 2) open = true;
      else if (q !== ((d & 1) ? 10 : 5)) return "bad";
    }
    return open ? "wait" : "ok";
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

  // Jedna łamana na fragment: prosta bez koralików, narożnik łukiem, pętla domknięta Z.
  function traceD(n, mask, gap = 0.08) {
    const seen = new Set();
    const ek = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
    const nbrs = (i, skip) => {
      const o = [];
      for (let d = 0; d < 4; d++) {
        if (!(mask[i] & BIT[d])) continue;
        const j = step(n, i, d);
        if (j >= 0 && j !== skip) o.push(j);
      }
      return o;
    };
    const walk = (from, prev) => {
      const out = [];
      let cur = from, before = prev;
      for (let g = 0; g < n * n; g++) {
        const o = nbrs(cur, before);
        if (o.length !== 1) break;
        const nxt = o[0];
        const k = ek(cur, nxt);
        if (seen.has(k)) break;
        seen.add(k);
        out.push(nxt);
        before = cur;
        cur = nxt;
      }
      return out;
    };
    const pitch = 1 + gap;
    const xy = (i) => {
      const r = (i / n) | 0, c = i % n;
      return [gap + c * pitch + 0.5, gap + r * pitch + 0.5];
    };
    let d = "";
    for (let i = 0; i < n * n; i++) {
      for (let dir = 0; dir < 4; dir++) {
        if (!(mask[i] & BIT[dir])) continue;
        const j = step(n, i, dir);
        if (j < 0) continue;
        const k = ek(i, j);
        if (seen.has(k)) continue;
        seen.add(k);
        const cells = [...walk(i, j).reverse(), i, j, ...walk(j, i)];
        const loop = cells.length > 3 && cells[0] === cells[cells.length - 1];
        const pts = loop ? cells.slice(0, -1) : cells;
        d += pts.map((id, idx) => {
          const [x, y] = xy(id);
          return `${idx ? "L" : "M"}${x} ${y}`;
        }).join("") + (loop ? "Z" : "");
      }
    }
    return d;
  }

  if (typeof module !== "undefined") module.exports = { generate, solve, rulesOk, growLoop, pearlsFrom, maskFromLoop, pearlStatus, traceD };

  if (typeof registerGame !== "undefined") registerGame({
    id: "perly",
    cat: "logiczne",
    name: "Perły",
    author: "Cursor Grok 4.6, Grok 4.7",
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
      "Przeciągnij po sąsiednich polach, by ciągnąć linię. Cofnięcie po własnym śladzie ściera ostatni odcinek. Strzałki przesuwają kursor, spacja zaznacza, kolejna strzałka dorysowuje.",
      "Jedna zamknięta pętla przechodzi przez wszystkie perły. Nie rozgałęzia się i nie musi wchodzić w puste pola.",
      "Biała perła: linia idzie prosto i skręca na sąsiednim polu. Czarna: skręca na perle, a na obu sąsiadach idzie prosto.",
      "Krzyżyk albo klawisz X odrzuca puste pole. Na komputerze działa też prawy przycisk. Zła kreska się nie zapisuje.",
      "Sprawdź zamyka partię: dobra pętla wygrywa, zła zabiera życie. Zielona ramka znaczy perłę spełnioną, przerywana — że sąsiad jeszcze nie gotowy.",
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
      const s = {
        mask: new Int8Array(n * n), cross: new Uint8Array(n * n),
        pick: -1, cursor: 0, misses: 0, hints: 0, tool: 0, told: 0,
      };
      const pearlN = pearls.reduce((a, v) => a + (v ? 1 : 0), 0);

      const GAP = 0.06;
      const btns = gridCells(board, n, n, "pe-grid", { gap: GAP, label: () => "Pole" });
      board.style.setProperty("--max", "72px");
      const pitch = 1 + GAP;
      const units = n * pitch + GAP;
      const xy = (i) => {
        const r = (i / n) | 0, c = i % n;
        return [GAP + c * pitch + 0.5, GAP + r * pitch + 0.5];
      };
      const svg = svgEl("svg", { class: "pe-path", viewBox: `0 0 ${units} ${units}`, "aria-hidden": "true" }, board);
      const rope = svgEl("path", {}, svg);
      const ink = svgEl("g", {}, svg);
      const gems = svgEl("g", {}, svg);
      const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ring = selectionRing(board);
      btns.forEach((b, i) => {
        b.tabIndex = -1;
        b.append(el("span", "pe-x"));
        if (pearls[i] === 1) b.classList.add("white");
        if (pearls[i] === 2) b.classList.add("black");
      });

      const leftEl = statBlock(ctx, "Perły", { meter: true });
      const missEl = pipsBlock(ctx, "Życia", misses, { icon: "heart" });
      const tool = segmented("Narzędzie", ["Linia", "Krzyżyk"], (k) => {
        s.tool = k;
        s.pick = -1;
        Sound.tap();
        render();
      });
      tool.set(0);
      const actions = el("div", "panel-row");
      actions.append(button("Sprawdź", "btn wide", check), button("Podpowiedź", "btn-ghost wide", hint));
      ctx.panel.append(panelBlock("Rysowanie", tool.el, actions));

      const save = ctx.undoable((snap) => {
        s.mask = Int8Array.from(snap.mask);
        s.cross = Uint8Array.from(snap.cross);
        s.pick = snap.pick;
        s.misses = snap.misses;
        render();
      });
      const shot = () => ({ mask: Array.from(s.mask), cross: Array.from(s.cross), pick: s.pick, misses: s.misses });

      function dirOf(a, b) {
        return b === a - n ? 0 : b === a + 1 ? 1 : b === a + n ? 2 : b === a - 1 ? 3 : -1;
      }

      function reject(i, text, quiet) {
        if (!quiet) {
          Sound.error();
          if (i >= 0) replay(btns[i], "shake");
        }
        const now = performance.now();
        if (text && now - s.told > 850) {
          s.told = now;
          ctx.toast(text);
        }
      }

      function winIfDone() {
        if (ctx.done || !rulesOk(n, pearls, s.mask)) return false;
        Sound.line();
        render();
        finish();
        return true;
      }

      function badShape(i, m) {
        if (pearls[i] === 1) return !straight(m);
        if (pearls[i] === 2) return !corner(m);
        return false;
      }

      function blackFits(i, m) {
        if (pearls[i] !== 2 || pop(m) !== 2 || !corner(m)) return true;
        const r = (i / n) | 0, c = i % n;
        for (let d = 0; d < 4; d++) if (m & BIT[d]) {
          if (at(n, r + 2 * DR[d], c + 2 * DC[d]) < 0) return false;
        }
        return true;
      }

      function edgeOn(a, b) {
        const d = dirOf(a, b);
        return d >= 0 && !!(s.mask[a] & BIT[d]);
      }

      // record: jeden wpis cofania. quiet: przeciąganie nie trzęsie planszy przy każdej odmowie.
      function setEdge(a, b, on, record, quiet) {
        if (ctx.done || a === b || !adj(n, a, b)) return false;
        const d = dirOf(a, b), od = (d + 2) % 4;
        const has = !!(s.mask[a] & BIT[d]);
        if (on === has) return false;
        const before = shot();
        if (!on) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          if (record) save(before);
          Sound.erase();
          s.pick = -1;
          render();
          return true;
        }
        if (s.cross[a] || s.cross[b]) { reject(a, "To pole jest odrzucone", quiet); return false; }
        const ma = s.mask[a] | BIT[d], mb = s.mask[b] | BIT[od];
        if (pop(ma) > 2 || pop(mb) > 2) { reject(a, "Linia nie może się rozgałęziać", quiet); return false; }
        if ((pop(ma) === 2 && badShape(a, ma)) || (pop(mb) === 2 && badShape(b, mb))) {
          reject(a, "Ta perła chce innego skrętu", quiet);
          return false;
        }
        if (!blackFits(a, ma) || !blackFits(b, mb)) {
          reject(a, "Czarna perła nie mieści się przy brzegu", quiet);
          return false;
        }
        const closed = cycleClose(n, s.mask, a, b);
        s.mask[a] = ma;
        s.mask[b] = mb;
        if (closed && !rulesOk(n, pearls, s.mask)) {
          s.mask[a] &= ~BIT[d];
          s.mask[b] &= ~BIT[od];
          const bad = pearlStatus(n, pearls, s.mask, a) === "bad" || pearlStatus(n, pearls, s.mask, b) === "bad";
          reject(a, bad ? "Perła nie zgadza się z linią" : "Ta pętla nie obejmuje wszystkich pereł", quiet);
          return false;
        }
        if (record) save(before);
        Sound.place(1);
        s.pick = -1;
        render();
        winIfDone();
        return true;
      }

      function putCross(i, on, quiet) {
        if (pearls[i]) { reject(i, "Perła musi leżeć na pętli", quiet); return false; }
        if (on && pop(s.mask[i])) { reject(i, "Najpierw zetrzyj linię", quiet); return false; }
        if (!!s.cross[i] === !!on) return false;
        s.cross[i] = on ? 1 : 0;
        return true;
      }

      function toggleCross(i) {
        if (ctx.done) return;
        const before = shot();
        if (!putCross(i, !s.cross[i], false)) return;
        save(before);
        Sound.tap();
        s.cursor = i;
        s.pick = -1;
        render();
      }

      function choose(i) {
        if (ctx.done) return;
        s.cursor = i;
        if (s.tool === 1) return toggleCross(i);
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
        setEdge(s.pick, i, !edgeOn(s.pick, i), true, false);
      }

      function check() {
        if (ctx.done) return;
        if (rulesOk(n, pearls, s.mask)) return winIfDone();
        if (![...s.mask].some(Boolean)) return ctx.toast("Najpierw narysuj pętlę");
        const before = shot();
        let ends = 0, bad = 0;
        btns.forEach((b, i) => {
          const deg = pop(s.mask[i]);
          const st = pearlStatus(n, pearls, s.mask, i);
          if (deg === 1) { ends++; replay(b, "shake"); }
          if (pearls[i] && st !== "ok") { bad++; replay(b, "shake"); }
        });
        s.misses++;
        save(before);
        Sound.error();
        render();
        ctx.toast(ends ? "Domknij otwarte końce" : bad ? "Perła nie spełnia reguły" : "Pętla ma być jedna");
        if (s.misses >= misses) ctx.lose("Za dużo pomyłek", `Dozwolone pomyłki: ${misses}.`);
      }

      function hint() {
        if (ctx.done) return;
        for (let i = 0; i < n * n; i++) {
          const extra = s.mask[i] & ~sol[i];
          if (!extra) continue;
          for (let d = 0; d < 4; d++) if (extra & BIT[d]) {
            s.hints++;
            save(shot());
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
            const j = step(n, i, d);
            s.hints++;
            save(shot());
            s.mask[i] |= BIT[d];
            s.mask[j] |= BIT[(d + 2) % 4];
            s.cross[i] = s.cross[j] = 0;
            sweep([btns[i], btns[j]]);
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
        const list = document.elementsFromPoint
          ? document.elementsFromPoint(e.clientX, e.clientY)
          : [document.elementFromPoint(e.clientX, e.clientY)];
        for (const node of list) {
          const b = node && node.closest && node.closest(".gb-cell");
          if (b && board.contains(b)) return +b.dataset.i;
        }
        return -1;
      }

      let gesture = null;
      function endGesture(e) {
        const g = gesture;
        if (!g || (e && g.id !== e.pointerId)) return;
        gesture = null;
        try { board.releasePointerCapture(g.id); } catch {}
        if (!g.moved) return choose(g.i);
        const same = g.before.mask.every((v, i) => v === s.mask[i]) && g.before.cross.every((v, i) => v === s.cross[i]);
        if (g.dirty && !same) save(g.before);
        if (s.tool === 1 && g.dirty && !same) Sound.tap();
        s.pick = -1;
        render();
      }
      board.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || ctx.done) return;
        const i = cellAt(e);
        if (i < 0) return;
        e.preventDefault();
        gesture = { id: e.pointerId, i, moved: false, stroke: 0, path: [i], before: shot(), dirty: false, primed: false };
        s.cursor = i;
        try { board.setPointerCapture(e.pointerId); } catch {}
        render();
      });
      board.addEventListener("pointermove", (e) => {
        const g = gesture;
        if (!g || e.pointerId !== g.id || ctx.done) return;
        const j = cellAt(e);
        if (j < 0 || j === g.i || !adj(n, g.i, j)) return;
        g.moved = true;
        if (s.tool === 1) {
          if (!g.stroke) g.stroke = s.cross[g.i] ? -1 : 1;
          const want = g.stroke === 1;
          for (const c of (g.primed ? [j] : [g.i, j])) if (putCross(c, want, true)) g.dirty = true;
          g.primed = true;
          g.i = j;
          s.cursor = j;
          render();
          return;
        }
        const on = edgeOn(g.i, j);
        if (!g.stroke) g.stroke = on ? -1 : 1;
        const path = g.path;
        const back = path.length >= 2 && j === path[path.length - 2];
        const ok = back
          ? setEdge(path[path.length - 1], j, g.stroke === -1, false, true)
          : g.stroke === 1 && !on
            ? setEdge(g.i, j, true, false, true)
            : g.stroke === -1 && on
              ? setEdge(g.i, j, false, false, true)
              : false;
        if (!ok) return;
        if (back) path.pop();
        else path.push(j);
        g.dirty = true;
        g.i = j;
        s.cursor = j;
        render();
      });
      board.addEventListener("pointerup", endGesture);
      board.addEventListener("pointercancel", endGesture);
      board.addEventListener("contextmenu", (e) => {
        const i = cellAt(e);
        if (i < 0) return;
        e.preventDefault();
        if (!ctx.done) toggleCross(i);
      });
      cellKeys(ctx, {
        cols: n, rows: n,
        get: () => s.cursor,
        set: (i) => {
          if (s.pick >= 0 && adj(n, s.pick, i)) {
            s.cursor = i;
            setEdge(s.pick, i, !edgeOn(s.pick, i), true, false);
            return;
          }
          s.cursor = i;
          render();
        },
        keys: {
          " ": () => choose(s.cursor),
          x: () => toggleCross(s.cursor),
        },
      });

      const pending = new Map();
      const gemEl = new Map();
      const gemSt = new Map();
      let prevEdges = null;

      function edgeSet(mask) {
        const set = new Set();
        for (let i = 0; i < n * n; i++) {
          if (mask[i] & 2) set.add(`${i},${i + 1}`);
          if (mask[i] & 4) set.add(`${i},${i + n}`);
        }
        return set;
      }

      function cutEdge(mask, a, b) {
        const d = dirOf(a, b);
        mask[a] &= ~BIT[d];
        mask[b] &= ~BIT[(d + 2) % 4];
      }

      // Odcinki jeszcze rysowane nie wchodzą do wspólnej łamanej, żeby nie mignąć pełną kreską.
      function shownMask() {
        const m = Int8Array.from(s.mask);
        for (const p of pending.values()) if (p.kind === "in") cutEdge(m, p.a, p.b);
        return m;
      }

      function paintRope() {
        rope.setAttribute("d", traceD(n, shownMask(), GAP));
      }

      function orient(a, b, kind) {
        let from = a, to = b;
        if (kind === "in") {
          if (pop(s.mask[a]) === 1 && pop(s.mask[b]) !== 1) { from = b; to = a; }
        } else if (pop(s.mask[a]) === 0 && pop(s.mask[b]) > 0) { from = b; to = a; }
        else if (pop(s.mask[b]) === 0 && pop(s.mask[a]) > 0) { from = a; to = b; }
        const [x1, y1] = xy(from);
        const [x2, y2] = xy(to);
        return [x1, y1, x2, y2];
      }

      function queueEdge(key, kind) {
        const old = pending.get(key);
        if (old) { old.line.remove(); pending.delete(key); }
        const [a, b] = key.split(",").map(Number);
        const [x1, y1, x2, y2] = orient(a, b, kind);
        const line = svgEl("line", {
          x1, y1, x2, y2, pathLength: 1, class: kind === "in" ? "pe-in" : "pe-out",
        }, ink);
        const rec = { kind, a, b, line };
        pending.set(key, rec);
        line.addEventListener("animationend", (e) => {
          if (e.target !== line || pending.get(key) !== rec) return;
          pending.delete(key);
          line.remove();
          paintRope();
        });
      }

      function render() {
        let through = 0, doneP = 0, ends = 0, bad = 0;
        const curEdges = edgeSet(s.mask);
        if (!reduceMotion && prevEdges) {
          for (const k of curEdges) if (!prevEdges.has(k)) queueEdge(k, "in");
          for (const k of prevEdges) if (!curEdges.has(k)) queueEdge(k, "out");
        }
        prevEdges = curEdges;
        paintRope();
        btns.forEach((b, i) => {
          const m = s.mask[i], deg = pop(m);
          const st = pearlStatus(n, pearls, s.mask, i);
          b.classList.toggle("cross", !!s.cross[i]);
          b.classList.toggle("is-sel", i === s.pick);
          b.classList.toggle("pe-ok", st === "ok");
          b.classList.toggle("pe-wait", st === "wait");
          b.classList.toggle("pe-bad", st === "bad");
          const r = (i / n) | 0, c = i % n;
          const kind = pearls[i] === 1 ? ", biała perła" : pearls[i] === 2 ? ", czarna perła" : "";
          b.setAttribute("aria-label", `Wiersz ${r + 1}, kolumna ${c + 1}${kind}${s.cross[i] ? ", odrzucone" : ""}`);
          if (pearls[i]) {
            let gem = gemEl.get(i);
            if (!gem) {
              const [x, y] = xy(i);
              gem = svgEl("circle", { class: "pe-gem", cx: x, cy: y, r: 0.22, "stroke-width": 0.04 }, gems);
              gemEl.set(i, gem);
            }
            const white = pearls[i] === 1;
            gem.style.fill = white ? "var(--perly-white)" : "var(--perly-black)";
            gem.style.stroke = white ? "var(--perly-black)" : "var(--perly-white)";
            const prev = gemSt.get(i);
            if (prev !== undefined && prev !== st && (st === "ok" || st === "bad" || (st === "wait" && prev === ""))) {
              gem.classList.remove("pe-pop", "pe-no");
              void gem.getBoundingClientRect();
              gem.classList.add(st === "bad" ? "pe-no" : "pe-pop");
            }
            gemSt.set(i, st || "");
          }
          if (pearls[i] && deg === 2) through++;
          if (st === "ok") doneP++;
          if (st === "bad") bad++;
          if (deg === 1) ends++;
        });
        board.classList.toggle("pe-mark", s.tool === 1);
        ring(btns[s.cursor]);
        const sub = ends
          ? `${ends} ${plural(ends, "otwarty koniec", "otwarte końce", "otwartych końców")}`
          : bad
            ? "jest sprzeczność"
            : through === pearlN && doneP === pearlN && !rulesOk(n, pearls, s.mask)
              ? "pętla nie jest jedna"
              : "";
        leftEl.set(`${through} z ${pearlN}`, pearlN ? through / pearlN : 0, sub);
        missEl.set(Math.max(0, misses - s.misses));
        ctx.progress(ctx.done ? 1 : Math.min(0.95, pearlN ? through / pearlN : 0));
      }
      render();
    },
  });
}
