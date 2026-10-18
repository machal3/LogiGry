// Narzędzie platformy gier (opis w AGENTS.md). Bez zależności, wystarczy node 18+.
//   node narzedzia/gry.mjs              sprawdza wszystkie gry z gry/ i odświeża ich listę w index.html
//   node narzedzia/gry.mjs sprawdz <id> sprawdza jedną grę (i też odświeża listę)
//   node narzedzia/gry.mjs nowa <id>    tworzy gry/<id>/ z szablonu gry/_szablon/
import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRY = join(ROOT, "gry");
const require = createRequire(import.meta.url);
Object.assign(globalThis, require(join(ROOT, "lib.js")));
const { GAMES, gameProblems } = require(join(ROOT, "games.js"));
const LEGACY_IDS = GAMES.map((g) => g.id);

const folders = () => readdirSync(GRY, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
  .map((d) => d.name).sort();

// Wczytuje gra.js tak jak przeglądarka: łapie opis przekazany do registerGame.
function load(id) {
  const found = [];
  globalThis.registerGame = (g) => found.push(g);
  try { require(join(GRY, id, "gra.js")); } catch (e) { return { error: `gra.js rzuca błąd przy wczytaniu: ${e.message}` }; }
  finally { delete globalThis.registerGame; }
  return found.length === 1 ? { game: found[0] } : { error: `gra.js musi wywołać registerGame dokładnie raz (jest ${found.length})` };
}

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Każde własne osiągnięcie musi być gdzieś zdobywane (ctx.achieve("id")), a każde wywołanie musi mieć definicję.
function achieveCalls(game, code) {
  const defined = (game.achievements || []).map((a) => a.id);
  const called = [...code.matchAll(/ctx\.achieve\(\s*["']([\w-]+)["']/g)].map((m) => m[1]);
  return [
    ...defined.filter((a) => !called.includes(a)).map((a) => `osiągnięcie "${a}" nie ma wywołania ctx.achieve("${a}"), więc nie da się go zdobyć`),
    ...[...new Set(called)].filter((a) => !defined.includes(a)).map((a) => `ctx.achieve("${a}") wskazuje osiągnięcie, którego nie ma w achievements`),
  ];
}

// Starsze gry z games/: osiągnięcia mają ten sam format co w nowych grach.
function checkLegacy() {
  globalThis.GAMES = GAMES;
  let failed = 0;
  for (const f of readdirSync(join(ROOT, "games")).filter((f) => f.endsWith(".js"))) {
    const code = readFileSync(join(ROOT, "games", f), "utf8");
    const id = (code.match(/GAMES\.find\(\(g\) => g\.id === "([\w-]+)"\)/) || [])[1];
    if (!id) continue; // pliki pomocnicze (słownik)
    require(join(ROOT, "games", f));
    const game = GAMES.find((g) => g.id === id);
    const bad = [...gameProblems(game, []).filter((m) => m.startsWith("achievements")), ...achieveCalls(game, code)];
    if (!bad.length) continue;
    failed++;
    console.log(`BŁĄD games/${f} (${id})`);
    bad.forEach((m) => console.log(`     - ${m}`));
  }
  return failed;
}

function check(id, others) {
  const bad = [], warn = [];
  const dir = join(GRY, id);
  if (!/^[a-z0-9-]+$/.test(id)) bad.push("nazwa folderu: małe litery bez polskich znaków, cyfry, myślniki");
  if (!existsSync(join(dir, "gra.js"))) return { bad: [...bad, "brak gry/" + id + "/gra.js"], warn };

  const code = stripComments(readFileSync(join(dir, "gra.js"), "utf8")).trim();
  if (!code.startsWith("{") || !code.endsWith("}")) bad.push("gra.js: cały kod musi być w jednym bloku { ... }, żeby nazwy nie zderzały się z innymi grami");
  if (/localStorage\.(get|set|remove)Item\(\s*(?!`logigra\.|"logigra\.|'logigra\.)/.test(code)) warn.push(`localStorage: klucze zaczynaj od "logigra.${id}."`);

  const { game, error } = load(id);
  if (error) bad.push(error);
  else {
    if (game.id !== id) bad.push(`id w registerGame ("${game.id}") musi być równe nazwie folderu ("${id}")`);
    if (game.name === "Dziesiątka" && id !== "dziesiatka") bad.push("to wciąż gra z szablonu: zmień nazwę, opis, kolor, ikonę i mechanikę");
    bad.push(...gameProblems(game, [...LEGACY_IDS, ...others]), ...achieveCalls(game, code));
  }

  const cssFile = join(dir, "gra.css");
  if (existsSync(cssFile)) {
    const css = stripComments(readFileSync(cssFile, "utf8"));
    const scope = `[data-gra="${id}"]`;
    for (const [, sel] of css.matchAll(/([^{}]+)\{/g)) {
      const s = sel.trim();
      if (s.startsWith("@media") || s.startsWith("@supports") || s.startsWith("@container")) continue;
      if (s.startsWith("@keyframes")) {
        if (!s.startsWith(`@keyframes ${id}-`)) bad.push(`gra.css: nazwa animacji musi zaczynać się od "${id}-": ${s}`);
        continue;
      }
      if (/^(from|to|[\d.]+%)(\s*,\s*(from|to|[\d.]+%))*$/.test(s)) continue; // klatki animacji
      for (const part of s.split(",").map((p) => p.trim())) {
        if (!part.startsWith(scope)) bad.push(`gra.css: selektor musi zaczynać się od ${scope}: ${part}`);
        if (/\.(btn|btn-ghost|seg|panel|result|toast|linkish|tpad|has-icon|game-|nav)\b/.test(part)) bad.push(`gra.css: nie zmieniaj wyglądu wspólnych elementów (przyciski, panel, wynik): ${part}`);
      }
    }
    for (const m of css.matchAll(/([\w-]+)\s*:\s*[^;{}]*(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\()/gi)) {
      if (!m[1].startsWith("--")) warn.push(`gra.css: kolor wpisany na sztywno w "${m[1]}"; użyj zmiennej motywu albo zdefiniuj --${id}-kolor i użyj var()`);
    }
  }
  return { bad, warn };
}

// Odtwarza listę gier w index.html między znacznikami GRY-CSS i GRY-JS.
function writeIndex(ids) {
  const file = join(ROOT, "index.html");
  const html = readFileSync(file, "utf8");
  const block = (tag, lines) => (s) => s.replace(new RegExp(`(<!-- ${tag}: start[^>]*-->)[\\s\\S]*?(\\s*<!-- ${tag}: koniec -->)`), (_, a, b) => [a, ...lines].join("\n  ") + b);
  let out = block("GRY-CSS", ids.filter((id) => existsSync(join(GRY, id, "gra.css"))).map((id) => `<link rel="stylesheet" href="gry/${id}/gra.css">`))(html);
  out = block("GRY-JS", ids.map((id) => `<script src="gry/${id}/gra.js"></script>`))(out);
  if (out !== html) writeFileSync(file, out);
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === "nowa") {
  if (!/^[a-z0-9-]+$/.test(arg || "")) { console.error("Użycie: node narzedzia/gry.mjs nowa <id>   (id: małe litery, cyfry, myślniki)"); process.exit(1); }
  if (existsSync(join(GRY, arg)) || LEGACY_IDS.includes(arg)) { console.error(`Gra "${arg}" już istnieje. Wybierz inne id.`); process.exit(1); }
  cpSync(join(GRY, "_szablon"), join(GRY, arg), { recursive: true });
  for (const f of ["gra.js", "gra.css", "test.js"]) {
    const p = join(GRY, arg, f);
    writeFileSync(p, readFileSync(p, "utf8").replaceAll('"szablon"', `"${arg}"`).replaceAll("szablon-", `${arg}-`).replaceAll("gry/szablon/", `gry/${arg}/`));
  }
  console.log(`Utworzono gry/${arg}/. Przerób gra.js i gra.css, potem: node narzedzia/gry.mjs sprawdz ${arg}`);
  process.exit(0);
}

const all = folders();
const only = cmd === "sprawdz" ? [arg] : all;
if (cmd === "sprawdz" && !all.includes(arg)) { console.error(`Nie ma folderu gry/${arg}/`); process.exit(1); }
let failed = 0;
for (const id of only) {
  const { bad, warn } = check(id, all.filter((x) => x !== id));
  if (bad.length) failed++;
  console.log(`${bad.length ? "BŁĄD" : "OK  "} ${id}`);
  bad.forEach((m) => console.log(`     - ${m}`));
  warn.forEach((m) => console.log(`     ~ ${m}`));
}
// pełne sprawdzenie obejmuje też osiągnięcia starszych gier
if (cmd !== "sprawdz") failed += checkLegacy();
writeIndex(all);
console.log(`\nGier w gry/: ${all.length}. Lista w index.html odświeżona.${failed ? ` Do poprawy: ${failed}.` : ""}`);
process.exit(failed ? 1 : 0);
