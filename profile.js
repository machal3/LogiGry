// Profil gracza zapisany w localStorage tej przeglądarki.
const Profile = (() => {
  const KEY = "logigra.profile.v1";
  const fresh = () => ({ name: "Gracz", points: 0, games: {} });

  function load() {
    try {
      const p = JSON.parse(localStorage.getItem(KEY));
      if (p && Number.isFinite(p.points) && p.games && typeof p.games === "object") return { ...fresh(), ...p };
    } catch {}
    return fresh();
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
  }

  function award(gameId, level, points, seconds) {
    const p = load();
    const g = (p.games[gameId] ||= { solved: 0, points: 0, best: {} });
    g.solved++;
    g.points += points;
    p.points += points;
    if (!(g.best[level] <= seconds)) g.best[level] = seconds;
    save(p);
    return p;
  }

  // Bieg w trybie bez końca: dolicza punkty i zapisuje najlepszy wynik. Zwraca poprzedni rekord (albo undefined).
  function run(gameId, score, points) {
    const p = load();
    const g = (p.games[gameId] ||= { solved: 0, points: 0, best: {} });
    const e = (g.endless ||= { best: 0, runs: 0 });
    const before = e.runs ? e.best : undefined;
    e.runs++;
    if (score > e.best) e.best = score;
    g.points += points;
    p.points += points;
    save(p);
    return before;
  }

  // Osiągnięcia: automatyczne (każda gra, liczone z wyników) i własne gry (game.achievements, zdobywane przez ctx.achieve).
  const AUTO = [
    { id: "auto-pierwsza", name: "Pierwsza wygrana", desc: "Wygraj dowolny poziom.", points: 10, done: (g) => g.solved >= 1 },
    { id: "auto-trudny", name: "Twardziel", desc: "Wygraj najtrudniejszy poziom.", points: 25, done: (g, game) => g.best[game.levels.at(-1).key] != null },
    { id: "auto-komplet", name: "Komplet", desc: "Wygraj każdy poziom.", points: 25, done: (g, game) => game.levels.every((l) => g.best[l.key] != null) },
    { id: "auto-dziesiec", name: "Stały bywalec", desc: "Wygraj 10 razy.", points: 50, done: (g) => g.solved >= 10 },
  ];
  const achievements = (game) => (game.levels ? [...AUTO, ...(game.achievements || [])] : []);

  // Zapisuje osiągnięcie i dolicza jego punkty. Zwraca osiągnięcie albo null, gdy już było zdobyte lub nie istnieje.
  function unlock(game, id) {
    const a = achievements(game).find((x) => x.id === id);
    const p = load();
    const g = (p.games[game.id] ||= { solved: 0, points: 0, best: {} });
    g.ach ||= {};
    if (!a || g.ach[id]) return null;
    g.ach[id] = Date.now();
    g.points += a.points;
    p.points += a.points;
    save(p);
    return a;
  }

  // Odblokowuje spełnione osiągnięcia automatyczne; zwraca nowo zdobyte.
  function checkAuto(game) {
    const g = load().games[game.id];
    if (!g || !game.levels) return [];
    return AUTO.filter((a) => a.done(g, game)).map((a) => unlock(game, a.id)).filter(Boolean);
  }

  function rename(name) {
    const p = load();
    p.name = name.trim().slice(0, 40) || "Gracz";
    save(p);
    return p;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch {}
  }

  const RANKS = [[0, "Nowicjusz"], [100, "Łamigłowiarz"], [400, "Strateg"], [1000, "Mistrz logiki"], [2500, "Arcymistrz"]];
  function rank(points) {
    const k = RANKS.findLastIndex(([min]) => points >= min);
    return { name: RANKS[k][1], from: RANKS[k][0], next: RANKS[k + 1] || null };
  }

  return { load, award, run, rename, reset, rank, achievements, unlock, checkAuto };
})();

if (typeof module !== "undefined") module.exports = Profile;
