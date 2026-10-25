// Podgląd gry w prawdziwej przeglądarce: zrzuty ekranu i sprawdzenie, czy plansza dobrze się skaluje i wyświetla.
//   node narzedzia/podglad.mjs <id> [<id>...]     (id "zestaw" pokazuje wspólne elementy z zestaw.js)
// Dla każdego poziomu: szeroki ekran (1280 × 800) i telefon (360 × 740), do tego ciemny motyw na pierwszym poziomie.
// Zrzuty trafiają do folderu tymczasowego (ścieżka na końcu); obejrzyj je, jeśli umiesz czytać obrazy.
// Wymaga Edge albo Chrome (ścieżka w zmiennej BROWSER albo domyślna instalacja). Bez zależności, node 22+.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ids = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!ids.length) { console.error("Użycie: node narzedzia/podglad.mjs <id> [<id>...]"); process.exit(1); }
const BROWSER = process.env.BROWSER || [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);
if (!BROWSER) { console.error("Nie znaleziono Edge ani Chrome. Podaj ścieżkę w zmiennej BROWSER."); process.exit(1); }

const OUT = join(tmpdir(), "logigra-podglad");
const PORT = 9500 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), "logigra-podglad-profil-"));
const browser = spawn(BROWSER, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const quit = (code) => { browser.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); };

let page;
for (let t = 0; t < 50 && !page; t++) {
  await sleep(200);
  try { page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
}
if (!page) { console.error("Nie udało się połączyć z przeglądarką."); quit(1); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let seq = 0;
const pending = new Map();
const errors = [];
ws.addEventListener("message", ({ data }) => {
  const m = JSON.parse(data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
});
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const run = async (js) => (await send("Runtime.evaluate", { expression: js, returnByValue: true })).result?.result?.value;
await send("Runtime.enable");
const url = pathToFileURL(join(ROOT, "index.html")).href;

// Pomiary układu w przeglądarce. Zwraca listę problemów: [poziom, tekst], poziom "BŁĄD" albo "UWAGA".
const MEASURE = `(() => {
  const out = [];
  const area = document.querySelector(".board-area"), board = document.querySelector(".board");
  if (!board) return [["BŁĄD", "brak planszy"]];
  const a = area.getBoundingClientRect(), b = board.getBoundingClientRect();
  if (b.width < 40 || b.height < 40) out.push(["BŁĄD", \`plansza ma rozmiar \${b.width | 0} × \${b.height | 0} px: użyj gridCells, canvasGame, fitBoard albo svgBoard\`]);
  else if (b.width * b.height < 0.2 * a.width * a.height && innerWidth > 900) out.push(["UWAGA", \`plansza zajmuje tylko \${Math.round((100 * b.width * b.height) / (a.width * a.height))}% miejsca: zwiększ max albo zmniejsz cols/rows\`]);
  // prostokąt planszy, nie scrollHeight: ukryty dymek pod planszą też daje przewijanie, a nie jest winą gry
  if (b.right > a.right + 2 || b.bottom > a.bottom + 2 || b.left < a.left - 2 || b.top < a.top - 2) out.push(["BŁĄD", \`plansza (\${b.width | 0} × \${b.height | 0}) nie mieści się w obszarze gry (\${a.width | 0} × \${a.height | 0}) i trzeba ją przewijać\`]);
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(["BŁĄD", "strona przewija się w bok"]);
  let over = 0;
  for (const n of board.querySelectorAll("*")) {
    const r = n.getBoundingClientRect();
    if (!r.width || getComputedStyle(n).position === "fixed") continue;
    if (r.right > b.right + 3 || r.bottom > b.bottom + 3 || r.left < b.left - 3 || r.top < b.top - 3) over++;
  }
  if (over) out.push(["UWAGA", \`\${over} elementów wystaje poza planszę: rozmiary w środku podawaj w var(--s), nie w px\`]);
  const unnamed = [...board.querySelectorAll("button")].filter((x) => !x.textContent.trim() && !x.getAttribute("aria-label")).length;
  if (unnamed) out.push(["UWAGA", \`\${unnamed} przycisków na planszy bez tekstu i bez aria-label\`]);
  const tiny = [...board.querySelectorAll("button")].filter((x) => { const r = x.getBoundingClientRect(); return r.width && (r.width < 20 || r.height < 20); }).length;
  if (tiny) out.push(["UWAGA", \`\${tiny} przycisków mniejszych niż 20 px: trudno w nie trafić palcem\`]);
  const own = [...document.querySelectorAll(".panel > .panel-block")].filter((x) => !x.classList.contains("ach-box") && x.querySelector(".panel-title")?.textContent !== "Zasady").length;
  if (own > 4) out.push(["UWAGA", \`\${own} własnych bloków panelu (najwyżej 4): połącz małe wartości w statsBlock\`]);
  return out;
})()`;

const VIEWS = [["szeroki", 1280, 800], ["telefon", 360, 740]];
let failed = 0;
for (const id of ids) {
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const exists = await (async () => {
    await send("Page.navigate", { url: `${url}#/` });
    await sleep(600);
    return run(`!!GAMES.find((g) => g.id === ${JSON.stringify(id)}) || ${JSON.stringify(id)} === "zestaw"`);
  })();
  if (!exists) { console.log(`BŁĄD ${id}: gry nie ma na stronie (najpierw node narzedzia/gry.mjs sprawdz ${id} musi pokazać OK)`); failed++; continue; }
  const levels = id === "zestaw" ? 3 : await run(`((g) => g.levels.length + (g.endless ? 1 : 0))(GAMES.find((g) => g.id === ${JSON.stringify(id)}))`);
  const found = new Map();
  const note = (lvl, what, where) => { const k = `${lvl} ${what}`; found.set(k, [...(found.get(k) || []), where]); };
  for (const [view, w, h] of VIEWS) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
    for (const dark of [false, true]) {
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
      for (let k = 0; k < (dark ? 1 : levels); k++) {
        errors.length = 0;
        await send("Page.navigate", { url: "about:blank" });
        await send("Page.navigate", { url: `${url}#/${id === "zestaw" ? "zestaw" : `gra/${id}`}` });
        await sleep(900);
        await run(`document.querySelector(".help .btn")?.click()`);
        if (k) { await run(`document.querySelectorAll(".game-tools .seg button")[${k}].click()`); await sleep(300); await run(`document.querySelector(".help .btn")?.click()`); }
        await sleep(1500);
        const where = `${view}${dark ? ", ciemny" : ""}, poziom ${k + 1}`;
        const shot = await send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(dir, `${view}-${dark ? "ciemny" : "jasny"}-poziom${k + 1}.png`), Buffer.from(shot.result.data, "base64"));
        for (const [lvl, what] of (await run(MEASURE)) || []) note(lvl, what, where);
        // wyjście z gry: nic nie może dalej działać ani rzucać błędów
        await send("Page.navigate", { url: `${url}#/` });
        await sleep(700);
        for (const e of errors) note("BŁĄD", `błąd w konsoli: ${String(e).split("\n")[0].slice(0, 160)}`, where);
      }
    }
  }
  const bad = [...found.keys()].some((k) => k.startsWith("BŁĄD"));
  if (bad) failed++;
  console.log(`${bad ? "BŁĄD" : found.size ? "UWAGI" : "OK  "} ${id}`);
  for (const [k, where] of found) console.log(`     ${k.startsWith("BŁĄD") ? "-" : "~"} ${k.replace(/^\S+ /, "")} (${[...new Set(where)].join("; ")})`);
  console.log(`     zrzuty: ${dir}`);
}
quit(failed ? 1 : 0);
