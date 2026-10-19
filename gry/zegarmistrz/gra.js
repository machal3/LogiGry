{
  function mod(n) { return (n % 12 + 12) % 12; }

  function move(state, index, direction, links) {
    const next = state.slice();
    next[index] = mod(next[index] + direction);
    next[(index + 1) % state.length] = mod(next[(index + 1) % state.length] + direction * links);
    return next;
  }

  function same(a, b) { return a.every((v, i) => v === b[i]); }

  function createPuzzle(count, links, scramble) {
    const target = Array.from({ length: count }, (_, i) => (i * 3 + 2) % 12);
    let start = target.slice();
    const moves = [];
    for (let i = 0; i < scramble; i++) {
      const index = (i * 7 + count) % count;
      const direction = i % 3 === 0 ? -1 : 1;
      start = move(start, index, direction, links);
      moves.push({ index, direction });
    }
    return { start, target, moves };
  }

  function solve(state, target, links) {
    const queue = [state];
    const seen = new Set([state.join(",")]);
    const previous = new Map();
    while (queue.length) {
      const current = queue.shift();
      if (same(current, target)) {
        const path = [];
        let key = current.join(",");
        while (previous.has(key)) {
          const step = previous.get(key);
          path.push(step.move);
          key = step.from;
        }
        return path.reverse();
      }
      for (let index = 0; index < state.length; index++) {
        for (const direction of [-1, 1]) {
          const next = move(current, index, direction, links);
          const key = next.join(",");
          if (!seen.has(key)) {
            seen.add(key);
            previous.set(key, { from: current.join(","), move: { index, direction } });
            queue.push(next);
          }
        }
      }
    }
    return [];
  }

  if (typeof module !== "undefined") module.exports = { createPuzzle, move, solve };

  if (typeof registerGame !== "undefined") registerGame({
    id: "zegarmistrz",
    cat: "lamiglowki",
    name: "Zegarmistrz",
    author: "GitHub Copilot CLI 1.0.98",
    desc: "Ustaw wskazówki kilku zegarów na właściwy czas, wykorzystując przekładnie i ograniczoną liczbę ruchów.",
    color: "#b85c38",
    ink: "#ffffff",
    glyph: [".###.", "#...#", "#.#.#", "#...#", ".###."],
    levels: [
      { key: "easy", name: "Łatwy", points: 10, count: 3, links: 1, scramble: 7 },
      { key: "medium", name: "Średni", points: 25, count: 4, links: 2, scramble: 11 },
      { key: "hard", name: "Trudny", points: 50, count: 5, links: 3, scramble: 15 },
    ],
    rules: [
      "Kliknij plus lub minus przy zegarze. Wskazówka przesunie się o pięć minut, a sąsiedni zegar obróci się przez przekładnię.",
      "Doprowadź wszystkie zegary do pokazanych czasów. Nie ma limitu ruchów, ale mniej ruchów daje lepszy wynik.",
      "Klawisze strzałek wybierają zegar, a A i D obracają go w lewo lub w prawo.",
    ],
    achievements: [
      { id: "pierwszy-mechanizm", name: "Pierwszy mechanizm", desc: "Ustaw wszystkie zegary bez podpowiedzi.", points: 10 },
      { id: "precyzyjny", name: "Precyzyjny", desc: "Wygraj poziom, wykonując nie więcej ruchów niż podpowiada rozwiązanie.", points: 25 },
      { id: "mistrz-koronki", name: "Mistrz koronki", desc: "Wygraj trudny poziom w mniej niż 80 sekund.", points: 50 },
    ],

    mount(board, ctx) {
      const { count, links, scramble, key } = ctx.level;
      const puzzle = createPuzzle(count, links, scramble);
      const s = { values: puzzle.start.slice(), cursor: 0, moves: 0, hinted: false, hint: null };
      const clocks = [];
      const moveCount = statBlock(ctx, "Ruchy", { small: true });
      const selected = statBlock(ctx, "Wybrany zegar", { small: true });
      ctx.panel.append(panelBlock("Narzędzia", button("Podpowiedź", "btn-ghost wide", hint)));
      const save = ctx.undoable((snap) => { Object.assign(s, snap); render(); });

      for (let i = 0; i < count; i++) {
        const card = el("section", "zg-clock-card");
        const title = el("h3", "zg-clock-title", `Zegar ${i + 1}`);
        const face = el("div", "zg-face");
        const target = el("div", "zg-target", `Cel ${timeText(puzzle.target[i])}`);
        const minus = button("−", "btn-ghost zg-turn", () => turn(i, -1));
        const plus = button("+", "btn-ghost zg-turn", () => turn(i, 1));
        const controls = el("div", "zg-controls");
        controls.append(minus, plus);
        for (let n = 1; n <= 12; n++) {
          const mark = el("span", "zg-mark", String(n));
          const angle = (n * 30) - 90;
          mark.style.setProperty("--zg-angle", `${angle}deg`);
          face.append(mark);
        }
        const hour = el("i", "zg-hand zg-hour");
        const minute = el("i", "zg-hand zg-minute");
        const pin = el("b", "zg-pin");
        face.append(hour, minute, pin);
        card.append(title, face, target, controls);
        board.append(card);
        clocks.push({ face, hour, minute, card });
      }

      function hint() {
        if (ctx.done) return;
        const path = solve(s.values, puzzle.target, links);
        if (!path.length) return;
        s.hinted = true;
        s.hint = path[0];
        sweep([clocks[path[0].index].card]);
        ctx.toast(`Zegar ${path[0].index + 1}: ${path[0].direction > 0 ? "plus" : "minus"}`);
        render();
      }

      function turn(index, direction) {
        if (ctx.done) return;
        save({ values: s.values.slice(), cursor: s.cursor, moves: s.moves, hinted: s.hinted, hint: s.hint });
        s.cursor = index;
        s.values = move(s.values, index, direction, links);
        s.moves++;
        s.hint = null;
        Sound.tap();
        render();
        if (same(s.values, puzzle.target)) finish();
      }

      function finish() {
        const ideal = puzzle.moves.length;
        if (!s.hinted) ctx.achieve("pierwszy-mechanizm");
        if (s.moves <= ideal) ctx.achieve("precyzyjny");
        if (key === "hard" && ctx.time < 80) ctx.achieve("mistrz-koronki");
        ctx.win(`Ustawiono wszystkie tarcze w ${s.moves} ruchach.`);
      }

      cellKeys(ctx, {
        cols: count, rows: 1, get: () => s.cursor,
        set: (i) => { s.cursor = i; render(); },
        keys: { a: () => turn(s.cursor, -1), d: () => turn(s.cursor, 1), ArrowLeft: () => turn(s.cursor, -1), ArrowRight: () => turn(s.cursor, 1) },
      });

      function render() {
        clocks.forEach((clock, i) => {
          const value = s.values[i];
          clock.hour.style.transform = `rotate(${value * 30 + 10}deg)`;
          clock.minute.style.transform = `rotate(${value * 30}deg)`;
          clock.card.classList.toggle("zg-selected", i === s.cursor);
          clock.card.classList.toggle("zg-correct", value === puzzle.target[i]);
        });
        moveCount.set(String(s.moves));
        selected.set(`Zegar ${s.cursor + 1}`);
        const correct = s.values.filter((v, i) => v === puzzle.target[i]).length;
        ctx.progress(correct / count);
      }

      function timeText(value) {
        const hour = value === 0 ? 12 : value;
        return `${hour}:00`;
      }

      render();
    },
  });
}
