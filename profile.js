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

  return { load, award, rename, reset, rank };
})();

if (typeof module !== "undefined") module.exports = Profile;
