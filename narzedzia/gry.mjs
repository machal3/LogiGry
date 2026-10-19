// Narzędzie platformy gier (opis w AGENTS.md). Bez zależności, wystarczy node 18+.
//   node narzedzia/gry.mjs lista                       wszystkie gry: gotowe, w budowie i zarezerwowane przez inne modele
//   node narzedzia/gry.mjs nowa <id> "Nazwa" "Opis"    rezerwuje grę: tworzy gry/<id>/ z szablonu i pomysl.md
//   node narzedzia/gry.mjs sprawdz <id>                sprawdza jedną grę (i odświeża listę w index.html)
//   node narzedzia/gry.mjs                             sprawdza wszystkie gry i odświeża listę w index.html
import { readFileSync, writeFileSync, existsSync, readdirSync, cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GRY = join(ROOT, "gry");
const require = createRequire(import.meta.url);
Object.assign(globalThis, require(join(ROOT, "lib.js")));
const { GAMES, gameProblems } = require(join(ROOT, "games.js"));
// "zestaw" zajmuje strona pokazowa index.html#/zestaw
const LEGACY_IDS = [...GAMES.map((g) => g.id), "zestaw"];

const folders = () => readdirSync(GRY, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith("_") && !d.name.startsWith("."))
  .map((d) => d.name).sort();

// Wczytuje gra.js tak jak przeglądarka: łapie opis przekazany do registerGame.
function load(id) {
  const found = [];
  globalThis.registerGame = (g) => found.push(g);
  const file = join(GRY, id, "gra.js");
  delete require.cache[file]; // check() bywa wołane kilka razy w jednym uruchomieniu
  try { require(file); } catch (e) { return { error: `gra.js rzuca błąd przy wczytaniu: ${e.message}` }; }
  finally { delete globalThis.registerGame; }
  return found.length === 1 ? { game: found[0] } : { error: `gra.js musi wywołać registerGame dokładnie raz (jest ${found.length})` };
}

// --- Rezerwacje: gry/<id>/pomysl.md powstaje, zanim gra ma kod, więc inne modele widzą zajęte pomysły ---

const PLACEHOLDER = /\(wpisz|\(zasada/;
function idea(id) {
  const p = join(GRY, id, "pomysl.md");
  if (!existsSync(p)) return null;
  const t = readFileSync(p, "utf8");
  // niewypełnione zaślepki „(wpisz…)” liczą się jak puste pola
  const real = (s) => (s && !PLACEHOLDER.test(s) ? s.trim() : "");
  const field = (k) => real((t.match(new RegExp(`^- ${k}: (.+)$`, "m")) || [])[1]);
  const rulesPart = (t.split(/^## Zasady\s*$/m)[1] || "").split(/^## /m)[0];
  return {
    id, name: real((t.match(/^# (.+)$/m) || [])[1]), desc: field("opis"), author: field("autor"), cat: field("kategoria"),
    rules: [...rulesPart.matchAll(/^\d+\.\s+(.+)$/gm)].map((m) => real(m[1])).filter(Boolean),
  };
}
const complete = (i) => i.rules.length >= 2 && i.author && i.cat;

// porównanie bez polskich znaków; podobieństwo opisów po wspólnych rdzeniach słów (pierwsze 4 litery, więc „słupek” = „słupkami”)
// ponytail: tylko siatka bezpieczeństwa; inną mechanikę pod innymi słowami wyłapuje model, czytając lista
const fold = (s) => s.toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "");
const words = (s) => new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 4)));
function similarity(a, b) {
  const x = words(a), y = words(b);
  const common = [...x].filter((w) => y.has(w)).length;
  return common / Math.max(1, Math.min(x.size, y.size));
}

// Wszystkie znane gry: starsze z games.js i nowe z gry/ (z pomysl.md, także te bez gotowego kodu).
function known() {
  return [
    ...GAMES.map((g) => ({ id: g.id, name: g.name, desc: g.desc, cat: g.cat, author: g.author, status: "gotowa", rules: [] })),
    ...folders().map((id) => {
      const i = idea(id) || { id, name: "", desc: "", rules: [] };
      const ready = !check(id, folders().filter((x) => x !== id)).bad.length;
      return { ...i, status: ready ? "gotowa" : complete(i) ? "w budowie" : "zarezerwowana" };
    }),
  ];
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
    if (code.includes("cells.push(d, 10 - d)")) bad.push("to wciąż kod z szablonu: napisz mechanikę swojej gry");
    bad.push(...gameProblems(game, [...LEGACY_IDS, ...others]), ...achieveCalls(game, code));
    const i = idea(id);
    if (!i) bad.push("brak pomysl.md: grę rezerwuje się przez node narzedzia/gry.mjs nowa");
    else {
      if (i.name !== game.name) bad.push(`nazwa w pomysl.md ("${i.name}") i w gra.js ("${game.name}") musi być taka sama`);
      if (!complete(i)) bad.push("pomysl.md: uzupełnij autora, kategorię i co najmniej 2 zasady");
    }
    const taken = [...GAMES.map((g) => g.name), ...others.map((o) => idea(o)?.name || "")];
    if (taken.some((n) => n && fold(n) === fold(game.name))) bad.push(`nazwa "${game.name}" jest już zajęta przez inną grę`);
    // spójny wygląd: plansza z jednej z czterech funkcji, napisy na płótnie czcionką strony
    if (!/\b(gridCells|canvasGame|fitBoard|svgBoard)\(/.test(code)) warn.push("plansza nie używa gridCells, canvasGame, fitBoard ani svgBoard, więc nie dopasuje się do ekranu (AGENTS.md, punkt 9)");
    if (/\.font\s*=\s*[`"'][^`"']*px\s+(sans-serif|serif|monospace|system-ui|Arial|Geist)/.test(code)) warn.push("płótno: napisy przez cv.text(...) albo czcionką theme.font, nie własną (\"px sans-serif\")");
  }

  const cssFile = join(dir, "gra.css");
  if (existsSync(cssFile)) {
    const css = stripComments(readFileSync(cssFile, "utf8"));
    const scope = `[data-gra="${id}"]`;
    for (const [, sel, body] of css.matchAll(/([^{}]+)\{(?=([^{}]*))/g)) {
      const s = sel.trim();
      // sam [data-gra] to cały obszar gry (plansza i panel): wolno na nim tylko definiować zmienne
      if (s === scope && body.split(";").some((d) => d.trim() && !d.trim().startsWith("--"))) bad.push(`gra.css: na samym ${scope} wolno tylko definiować zmienne (--${id}-...); układ i rozmiary ustawiaj na .board albo własnych klasach, inaczej psujesz układ planszy i panelu`);
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
      if (!m[1].startsWith("--")) warn.push(`gra.css: kolor wpisany na sztywno w "${m[1]}"; użyj palety (--red, --p1...) albo zdefiniuj --${id}-kolor i użyj var()`);
    }
    // bez warunków @media (min-width: 560px), to nie są rozmiary elementów
    for (const m of css.replace(/@media[^{]*/g, "").matchAll(/\b((?:min-|max-)?(?:width|height))\s*:\s*(\d+)px/g)) {
      if (+m[2] >= 24) warn.push(`gra.css: ${m[1]}: ${m[2]}px nie skaluje się z planszą; użyj calc(var(--s) * ...)`);
    }
  }
  return { bad: [...new Set(bad)], warn: [...new Set(warn)] };
}

// Odtwarza listę gier w index.html między znacznikami GRY-CSS i GRY-JS. Na stronę trafiają tylko gry, które przechodzą sprawdzenie.
function writeIndex(all) {
  const ids = all.filter((id) => !check(id, all.filter((x) => x !== id)).bad.length);
  const file = join(ROOT, "index.html");
  const html = readFileSync(file, "utf8");
  const block = (tag, lines) => (s) => s.replace(new RegExp(`(<!-- ${tag}: start[^>]*-->)[\\s\\S]*?(\\s*<!-- ${tag}: koniec -->)`), (_, a, b) => [a, ...lines].join("\n  ") + b);
  let out = block("GRY-CSS", ids.filter((id) => existsSync(join(GRY, id, "gra.css"))).map((id) => `<link rel="stylesheet" href="gry/${id}/gra.css">`))(html);
  out = block("GRY-JS", ids.map((id) => `<script src="gry/${id}/gra.js"></script>`))(out);
  if (out !== html) writeFileSync(file, out);
}

const args = process.argv.slice(2);
const [cmd, arg] = args;

if (cmd === "lista") {
  const all = known();
  console.log(`Wszystkie gry (${all.length}). Nowa gra musi mieć INNĄ mechanikę niż każda z nich, nie tylko inną nazwę.\n`);
  for (const g of all) {
    console.log(`[${g.status}] ${g.name || "(bez nazwy)"} (${g.id}${g.cat ? `, ${g.cat}` : ""}${g.author ? `, ${g.author}` : ""}): ${g.desc}`);
    if (g.status !== "gotowa") g.rules.forEach((r, k) => console.log(`     ${k + 1}. ${r}`));
  }
  process.exit(0);
}

if (cmd === "nowa") {
  const [, , name = "", desc = ""] = args;
  const force = args.includes("--inna");
  if (!/^[a-z0-9-]+$/.test(arg || "") || !name || name.length > 24 || desc.length < 20 || desc.length > 110) {
    console.error('Użycie: node narzedzia/gry.mjs nowa <id> "Nazwa gry" "Opis w jednym-dwóch zdaniach, 20–110 znaków"\n(id: małe litery bez polskich znaków, cyfry, myślniki; nazwa do 24 znaków)');
    process.exit(1);
  }
  const all = known();
  const same = arg === "zestaw" ? { id: arg, name: "Zestaw elementów", status: "zajęte przez platformę" } : all.find((g) => g.id === arg || (g.name && fold(g.name) === fold(name)));
  if (same) { console.error(`Zajęte: "${same.name}" (${same.id}, ${same.status}). Wybierz inną grę. Listę zobaczysz: node narzedzia/gry.mjs lista`); process.exit(1); }
  const close = all.filter((g) => similarity(`${name} ${desc}`, `${g.name} ${g.desc}`) >= 0.5);
  if (close.length && !force) {
    console.error("Ta gra wygląda podobnie do:");
    close.forEach((g) => console.error(`  - ${g.name} (${g.id}, ${g.status}): ${g.desc}`));
    console.error('Wybierz inną grę. Jeśli mechanika jest naprawdę inna, dodaj na końcu --inna i opisz różnicę w pomysl.md.');
    process.exit(1);
  }
  // mkdir bez recursive zgłasza błąd, gdy folder już jest, więc dwa modele nie zarezerwują tego samego id
  try { mkdirSync(join(GRY, arg)); } catch { console.error(`Gra "${arg}" właśnie została zarezerwowana przez kogoś innego. Wybierz inne id.`); process.exit(1); }
  cpSync(join(GRY, "_szablon"), join(GRY, arg), { recursive: true });
  for (const f of ["gra.js", "gra.css", "test.js"]) {
    const p = join(GRY, arg, f);
    writeFileSync(p, readFileSync(p, "utf8").replaceAll('"szablon"', `"${arg}"`).replaceAll("szablon-", `${arg}-`).replaceAll("gry/szablon/", `gry/${arg}/`)
      .replace('name: "Dziesiątka"', `name: ${JSON.stringify(name)}`).replace(/desc: "[^"]*"/, `desc: ${JSON.stringify(desc)}`));
  }
  writeFileSync(join(GRY, arg, "pomysl.md"), `# ${name}

- id: ${arg}
- opis: ${desc}
- autor: (wpisz swój model z wersją)
- kategoria: (wpisz klucz kategorii z games.js)

## Zasady
1. (zasada: co robi gracz)
2. (zasada: kiedy wygrywa, kiedy przegrywa)
3. (zasada: czym różnią się poziomy)

## Czym różni się od podobnych gier
(wpisz, jeśli na liście jest coś podobnego; inaczej usuń tę linię)
`);
  console.log(`Zarezerwowano: ${name} (gry/${arg}/).
TERAZ, zanim napiszesz kod: uzupełnij gry/${arg}/pomysl.md (autor, kategoria, zasady), żeby inne modele widziały Twój pomysł.
Potem przerób gra.js i gra.css i sprawdź: node narzedzia/gry.mjs sprawdz ${arg}`);
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
