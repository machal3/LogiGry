// Test w prawdziwej przeglądarce: każda gra na każdym poziomie rozwiązywana kliknięciami.
// Użycie: node tests/e2e.mjs [katalog-na-zrzuty]
// Wymaga Edge lub Chrome (ścieżka w zmiennej BROWSER albo domyślna instalacja Edge).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import MORE from "./e2e-solvers.mjs";

const BROWSER = process.env.BROWSER ||
  ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Google/Chrome/Application/chrome.exe"].find(existsSync);
const PORT = +process.env.PORT || 9333;
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const url = pathToFileURL(resolve(import.meta.dirname, "../index.html")).href;
const profileDir = mkdtempSync(join(tmpdir(), "logigra-e2e-"));

const browser = spawn(BROWSER, ["--headless=new", "--disable-gpu", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDir}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let t = 0; t < 50 && !target; t++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page"); } catch {}
}
if (!target) throw new Error("Nie udało się połączyć z przeglądarką");

let ws, seq = 0;
const pending = new Map();
const errors = [];
// połączenie z kartą; `fresh` zamyka starą i otwiera nową na tej samej stronie
async function connect(t) {
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push(m.params.args.map((a) => a.value).join(" "));
  });
  await send("Runtime.enable");
  await send("Page.enable");
  // karta musi uchodzić za widoczną, inaczej przeglądarka wstrzymuje requestAnimationFrame (Cegiełki)
  await send("Page.bringToFront");
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
}
const send = (method, params = {}) => new Promise((r) => {
  const id = ++seq;
  pending.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});
async function fresh() {
  const old = target;
  target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: "PUT" })).json();
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${old.id}`).catch(() => {});
  await connect(target);
  for (let t = 0; t < 100 && !(await run(`return typeof GAMES !== "undefined" && document.readyState === "complete";`).catch(() => false)); t++) await sleep(100);
}
await connect(target);
const run = async (expr) => {
  const res = await send("Runtime.evaluate", { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (res.result.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description || "błąd w stronie");
  return res.result.result.value;
};
const shot = async (name, width, height, mobile = false) => {
  if (!shots) return;
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await sleep(400);
  const { result } = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(shots, `${name}.png`), Buffer.from(result.data, "base64"));
};

await send("Page.navigate", { url });
await sleep(800);
await run(`localStorage.clear(); location.reload();`).catch(() => {});
await sleep(800);

for (let t = 0; t < 100 && !(await run(`return typeof GAMES !== "undefined" && document.readyState !== "loading";`)); t++) await sleep(200);
// Wspólne funkcje w stronie: otwarcie gry na danym poziomie i odczyt wyniku.
const prelude = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const open = async (id, lvl) => {
    localStorage.setItem("logigra.help." + id, "1");
    location.hash = "#/gra/" + id; await sleep(60);
    document.querySelectorAll("#game-tools .seg button")[lvl].click(); await sleep(30);
  };
  const result = () => { const a = document.querySelector(".board-area"); return a.className + " | " + (a.querySelector(".result")?.textContent || ""); };
  const click = (n) => { n.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); };
  const press = (n, button = 0) => { n.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button })); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); };
  const hit = (k, type = "keydown") => document.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));
  const center = (n) => { const r = n.getBoundingClientRect(); return { clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, bubbles: true }; };
  // przeciągnięcie wskaźnika przez kolejne elementy
  const drag = (nodes) => {
    nodes[0].dispatchEvent(new PointerEvent("pointerdown", center(nodes[0])));
    nodes.slice(1).forEach((x) => document.dispatchEvent(new PointerEvent("pointermove", center(x))));
    document.dispatchEvent(new PointerEvent("pointerup", center(nodes[nodes.length - 1])));
  };
  const until = async (cond, ms = 3000) => { for (let t = 0; t < ms / 20 && !cond(); t++) await sleep(20); };
`;

const SOLVERS = {
  sudoku: `
    const cells = [...document.querySelectorAll(".sd-cell")];
    const pad = [...document.querySelectorAll(".pad button")];
    const g = cells.map((b) => +b.textContent || 0);
    const s = Sudoku.solve(g);
    const empty = cells.map((_, i) => i).filter((i) => !g[i]);
    // zły wpis musi zostać oznaczony
    const wrongIdx = empty[0], given = g.findIndex((v, i) => v && (((i / 9) | 0) === ((wrongIdx / 9) | 0) || i % 9 === wrongIdx % 9));
    cells[wrongIdx].click(); pad[g[given] - 1].click();
    if (!document.querySelector(".sd-cell.bad")) throw new Error("brak oznaczenia konfliktu");
    // pierwsze pole klawiaturą, reszta klawiaturą ekranową
    cells[empty[0]].click();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: String(s[empty[0]]), bubbles: true }));
    for (const i of empty.slice(1)) { cells[i].click(); pad[s[i] - 1].click(); }
  `,
  obrazki: `
    const cells = [...document.querySelectorAll(".ng-cell")];
    const down = (c, button = 0) => {
      c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    };
    const { grid } = Nonogram.last;
    const blank = grid.indexOf(0);
    if (blank >= 0) { down(cells[blank], 2); if (!cells[blank].classList.contains("x")) throw new Error("brak krzyżyka"); }
    grid.forEach((v, i) => v && down(cells[i]));
  `,
  mosty: `
    const isl = [...document.querySelectorAll(".br-island")];
    for (const [k, n] of Bridges.last.bridges) {
      const [a, b] = k.split("-").map(Number);
      for (let t = 0; t < n; t++) { click(isl[a]); click(isl[b]); }
    }
  `,
  wieze: `
    const cells = [...document.querySelectorAll(".tw-cell")];
    const pad = [...document.querySelectorAll(".pad button")];
    const { n, solution } = Towers.last;
    cells.forEach((b, i) => { b.click(); pad[solution[(i / n) | 0][i % n] - 1].click(); });
  `,
  saper: `
    const cells = [...document.querySelectorAll(".ms-cell")];
    cells[(cells.length / 2) | 0].click();
    if (document.querySelector(".board-area.lost")) throw new Error("pierwszy ruch trafił minę");
    const { mines } = Minesweeper.last;
    cells.forEach((b, i) => { if (!mines[i] && !b.classList.contains("open")) b.click(); });
  `,
  krolowe: `
    const cells = [...document.querySelectorAll(".qn-cell")];
    const { n, solution } = Queens.last;
    const down = (c, button = 0) => {
      c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button }));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    };
    // prawy przycisk stawia krzyżyk na polu bez królowej
    const empty = cells.findIndex((_, i) => solution[(i / n) | 0] !== i % n);
    down(cells[empty], 2);
    if (!cells[empty].classList.contains("x")) throw new Error("brak krzyżyka");
    // dwie królowe obok siebie to konflikt
    const to = (c, cls) => { for (let t = 0; t < 3 && !(cls ? c.classList.contains(cls) : !c.matches(".x, .queen")); t++) down(c); };
    const a = solution[0], b = a < n - 1 ? a + 1 : a - 1;
    to(cells[b], "queen"); to(cells[n + a], "queen");
    if (!cells[b].classList.contains("bad")) throw new Error("brak oznaczenia konfliktu");
    to(cells[b]); to(cells[n + a]);
    solution.forEach((c, r) => to(cells[r * n + c], "queen"));
  `,
  "zero-jeden": `
    const cells = [...document.querySelectorAll(".tz-cell")];
    const down = (c) => c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    const { solution, puzzle } = Takuzu.last;
    puzzle.forEach((v, i) => { if (!v) for (let t = 0; t < solution[i]; t++) down(cells[i]); });
  `,
  swiatla: `
    const cells = [...document.querySelectorAll(".lo-cell")];
    const { solution, moves } = Lights.last;
    solution.forEach((v, i) => v && cells[i].click());
    if (!document.querySelector(".panel-big").textContent.startsWith(moves + " / ")) throw new Error("zły licznik ruchów");
  `,
  // gry zręcznościowe: prawdziwe wejście i pętla gry, stan ustawiony tuż przed wygraną
  waz: `
    const key = (k) => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));
    key("ArrowRight");
    const s = Snake.last;
    s.target = s.body.length + 1;
    s.food = s.body[0] + 1;
    await sleep(400);
  `,
  "2048": `
    const goal = [256, 512, 1024][LVL];
    const s = G2048.last;
    s.tiles = [{ id: 90001, v: goal / 2, r: 0, c: 0 }, { id: 90002, v: goal / 2, r: 0, c: 1 }];
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await sleep(300);
  `,
  pamiec: `
    await sleep([2600, 1600, 0][LVL] + 100);
    const cards = [...document.querySelectorAll(".mm-card")];
    const { deck } = Memory.last;
    // najpierw pomyłka: karty muszą się zakryć
    const a = 0, b = deck.findIndex((v, i) => i > 0 && v !== deck[0]);
    cards[a].click(); cards[b].click();
    await sleep(950);
    if (cards[a].classList.contains("up")) throw new Error("nietrafiona para się nie zakryła");
    const seen = new Set();
    deck.forEach((v, i) => { if (seen.has(v)) return; seen.add(v); cards[i].click(); cards[deck.indexOf(v, i + 1)].click(); });
  `,
  cegielki: `
    const s = Breakout.last;
    s.bricks.forEach((b, i) => (b.hp = i ? 0 : 1));
    const b0 = s.bricks[0];
    Object.assign(s.ball, { x: b0.x + b0.w / 2, y: b0.y + b0.h + 3, vx: 0, vy: -60, stuck: false });
    let frames = 0;
    const count = () => { frames++; if (frames < 400) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    for (let t = 0; t < 40 && !document.querySelector(".board-area.won"); t++) await sleep(50);
    if (!document.querySelector(".board-area.won")) throw new Error(\`klatki \${frames}, piłka \${s.ball.x.toFixed(1)},\${s.ball.y.toFixed(1)} \${s.ball.stuck}, cegły \${Breakout.left(s)}, widoczność: \${document.visibilityState}\`);
  `,
  ...MORE,
};

let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? "✔" : "✖"} ${msg}`); if (!cond) failed++; };

const picked = Object.entries(SOLVERS).filter(([id]) => !process.env.ONLY || process.env.ONLY.split(",").includes(id));
for (const [k, [id, solve]] of picked.entries()) {
  // przeglądarka bez okna po kilku sekundach zmian adresu dławi klatki (nawet na pustej stronie), więc co kilka gier nowa karta
  if (k && k % 3 === 0) await fresh();
  for (const lvl of [0, 1, 2]) {
    const t = Date.now();
    const res = await run(`${prelude} const LVL = ${lvl}; await open("${id}", ${lvl}); ${solve} await sleep(20); return result();`).catch((e) => `błąd: ${e.message}`);
    ok(res.includes(" won"), `${id} poziom ${lvl + 1} (${Date.now() - t} ms): ${res}`);
  }
}

// Każda gra z rejestru jest gotowa i ma rozwiązanie w teście.
const coverage = await run(`return JSON.stringify({ noMount: GAMES.filter((g) => !g.mount || !g.levels || g.levels.length !== 3).map((g) => g.id), ids: GAMES.map((g) => g.id) });`).then(JSON.parse);
const untested = coverage.ids.filter((id) => !SOLVERS[id]);
ok(!coverage.noMount.length && !untested.length, `wszystkie ${coverage.ids.length} gier gotowe i sprawdzane (bez mount: ${coverage.noMount.join(", ") || "brak"}, bez testu: ${untested.join(", ") || "brak"})`);

// Przegrana w saperze: nie daje punktów.
const lost = await run(`${prelude} await open("saper", 0);
  const cells = [...document.querySelectorAll(".ms-cell")];
  cells[0].click();
  cells[Minesweeper.last.mines.indexOf(1)].click();
  return result();`);
ok(lost.includes(" lost"), `saper: mina kończy grę (${lost})`);

// Notatki, cofanie i przejście do następnego poziomu z ekranu wyniku.
const extras = await run(`${prelude} await open("sudoku", 0);
  const out = [];
  const cells = [...document.querySelectorAll(".sd-cell")];
  const pad = [...document.querySelectorAll(".pad-digit")];
  const i = cells.findIndex((b) => !b.textContent);
  cells[i].click(); pad[4].click();
  out.push(cells[i].textContent === "5");
  [...document.querySelectorAll("#game-tools button")].find((b) => b.textContent === "Cofnij").click();
  out.push(cells[i].textContent === "");
  [...document.querySelectorAll(".panel .seg button")].find((b) => b.textContent === "Notatki").click();
  pad[2].click(); pad[6].click();
  out.push(cells[i].querySelector(".notes")?.textContent === "37");
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  out.push(cells[i].querySelector(".notes")?.textContent === "3");
  await open("wieze", 0);
  const { n, solution } = Towers.last;
  const tc = [...document.querySelectorAll(".tw-cell")], tp = [...document.querySelectorAll(".pad-digit")];
  tc.forEach((b, k) => { b.click(); tp[solution[(k / n) | 0][k % n] - 1].click(); });
  await sleep(1000);
  const next = document.querySelector(".result .btn");
  out.push(next?.textContent.startsWith("Następny poziom"));
  next.click(); await sleep(50);
  out.push(document.querySelectorAll("#game-tools .seg button")[1].getAttribute("aria-pressed") === "true");
  out.push(document.querySelectorAll(".tw-cell").length === 25);
  return out.join(",");`);
ok(extras === "true,true,true,true,true,true,true", `cyfra, cofnij, notatki, Ctrl+Z, ekran wyniku, następny poziom: ${extras}`);

// Wąż: ściana kończy grę bez punktów.
const crash = await run(`${prelude} await open("waz", 0);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
  for (let t = 0; t < 60 && !document.querySelector(".board-area.lost"); t++) await sleep(50);
  return result();`);
ok(crash.includes(" lost") && crash.includes("ścianę"), `wąż: zderzenie ze ścianą (${crash.slice(0, 80)})`);

// 2048: ruch bez zmian nic nie dokłada, ruch ze zmianą dokłada kafel.
const slide = await run(`${prelude} await open("2048", 0);
  const s = G2048.last;
  const before = s.tiles.length;
  const dirs = ["ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown"];
  const d = dirs.find((k) => G2048.move(s.tiles, 4, k.slice(5).toLowerCase()).moved);
  const merges = G2048.move(s.tiles, 4, d.slice(5).toLowerCase()).merged.length;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: d, bubbles: true }));
  await sleep(250);
  return [s.tiles.length === before - merges + 1, document.querySelectorAll(".tf-tile").length === s.tiles.length].join(",");`);
ok(slide === "true,true", `2048: ruch dokłada kafel, kafle na ekranie zgodne ze stanem (${slide})`);

// Światła: po wyczerpaniu limitu kliknięcie nic nie zmienia, cofnięcie zwalnia ruch.
const limit = await run(`${prelude} await open("swiatla", 2);
  const cells = [...document.querySelectorAll(".lo-cell")];
  const moves = () => document.querySelector(".panel-big").textContent;
  const max = +moves().split(" / ")[1];
  for (let k = 0; k < max; k++) cells[k % 2].click();
  const full = moves();
  const lit = cells.map((b) => b.classList.contains("on")).join();
  cells[5].click();
  const blocked = moves() === full && cells.map((b) => b.classList.contains("on")).join() === lit;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
  return [full === max + " / " + max, blocked, moves() === (max - 1) + " / " + max].join(",");`);
ok(limit === "true,true,true", `światła: limit ruchów i cofanie (${limit})`);

const profile = await run(`return JSON.parse(localStorage.getItem("logigra.profile.v1"));`);
const expected = await run(`return GAMES.filter((g) => ${JSON.stringify(picked.map(([id]) => id))}.includes(g.id)).reduce((a, g) => a + g.levels.reduce((x, l) => x + l.points, 0), 0) + 10;`);
ok(profile?.points === expected, `profil: ${profile?.points} pkt (oczekiwane ${expected})`);
ok(Object.values(profile?.games || {}).every((g) => g.solved >= 3 && Object.keys(g.best).length === 3), "profil: 3 rozwiązania i 3 rekordy w każdej grze");

const nav = await run(`location.hash = "#/profil"; await new Promise((r) => setTimeout(r, 100)); return document.getElementById("nav-points").textContent + " | " + document.querySelector(".pf-rank").textContent;`);
const rankName = await run(`return Profile.rank(${expected}).name;`);
ok(nav === `${expected} pkt | ${rankName}`, `profil i nawigacja: ${nav}`);

const kept = await run(`location.reload(); return 1;`).then(() => sleep(800)).then(() => run(`return document.getElementById("nav-points").textContent;`));
ok(kept === `${expected} pkt`, `punkty po przeładowaniu strony: ${kept}`);

ok(errors.length === 0, `błędy JS w konsoli: ${errors.length ? errors.join("; ") : "brak"}`);

if (shots) {
  for (const id of ["sudoku", "obrazki", "mosty", "wieze", "saper", "krolowe", "zero-jeden", "swiatla", "waz", "2048", "pamiec", "cegielki"]) {
    await run(`location.hash = "#/gra/${id}";`);
    await sleep(300);
    if (id === "obrazki") await run(`document.querySelectorAll("#game-tools .seg button")[1].click(); const c = [...document.querySelectorAll(".ng-cell")]; Nonogram.last.grid.forEach((v, i) => i < 40 && v && (c[i].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })), document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))));`);
    if (id === "saper") await run(`document.querySelectorAll(".ms-cell")[40].click();`);
    if (id === "mosty") await run(`${prelude} const i = [...document.querySelectorAll(".br-island")]; const ks = [...Bridges.last.bridges.keys()]; for (const k of ks.slice(0, 3)) { const [a, b] = k.split("-"); click(i[a]); click(i[b]); } click(i[ks[4].split("-")[0]]);`);
    if (id === "sudoku") await run(`const c = [...document.querySelectorAll(".sd-cell")]; const p = [...document.querySelectorAll(".pad-digit")]; const e = c.filter((b) => !b.textContent); e[0].click(); p[3].click(); [...document.querySelectorAll(".panel .seg button")][1].click(); e[1].click(); p[0].click(); p[4].click(); p[8].click(); e[2].click();`);
    if (id === "wieze") await run(`const c = [...document.querySelectorAll(".tw-cell")]; const p = [...document.querySelectorAll(".pad-digit")]; const { n, solution } = Towers.last; c.slice(0, n + 2).forEach((b, k) => { b.click(); p[solution[(k / n) | 0][k % n] - 1].click(); });`);
    if (id === "krolowe") await run(`${prelude} const c = [...document.querySelectorAll(".qn-cell")]; const { n, solution } = Queens.last; const d = (e, b = 0) => { e.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: b })); document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })); }; solution.slice(0, 3).forEach((col, r) => { d(c[r * n + col]); d(c[r * n + col]); }); [1, 2, n + 3].forEach((i) => solution[(i / n) | 0] !== i % n && d(c[i], 2));`);
    if (id === "zero-jeden") await run(`const c = [...document.querySelectorAll(".tz-cell")]; const { solution, puzzle } = Takuzu.last; puzzle.forEach((v, i) => { if (!v && i < 20) for (let t = 0; t < solution[i]; t++) c[i].dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); });`);
    if (id === "waz") await run(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); Snake.last.grow = 6; await new Promise((r) => setTimeout(r, 1200)); document.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));`);
    if (id === "2048") await run(`for (const k of ["ArrowLeft", "ArrowDown", "ArrowLeft", "ArrowDown", "ArrowRight", "ArrowDown"]) { document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); await new Promise((r) => setTimeout(r, 200)); }`);
    if (id === "pamiec") await run(`await new Promise((r) => setTimeout(r, 2800)); const c = [...document.querySelectorAll(".mm-card")]; const { deck } = Memory.last; c[0].click(); c[deck.indexOf(deck[0], 1)].click(); c[1].click();`);
    if (id === "cegielki") await run(`const s = Breakout.last; s.bricks.slice(0, 5).forEach((b) => (b.hp = 0)); Breakout.launch(s); await new Promise((r) => setTimeout(r, 500));`);
    if (id === "swiatla") await run(`const c = [...document.querySelectorAll(".lo-cell")]; c[7].click(); c[12].dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));`);
    await shot(`${id}-desktop`, 1280, 1000);
    await shot(`${id}-mobile`, 390, 900, true);
    await send("Emulation.clearDeviceMetricsOverride");
  }
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  for (const id of ["sudoku", "saper", "obrazki", "krolowe", "zero-jeden", "swiatla", "2048", "cegielki", "pamiec"]) {
    await run(`location.hash = "#/gra/${id}";`);
    await sleep(300);
    if (id === "saper") await run(`const c = document.querySelectorAll(".ms-cell"); c[40].click(); c[Minesweeper.last.mines.indexOf(1)].click();`);
    await shot(`${id}-ciemny`, 1280, 900);
  }
  await send("Emulation.setEmulatedMedia", { features: [] });
  await send("Emulation.clearDeviceMetricsOverride");
  await run(`${prelude} await open("wieze", 0); ${SOLVERS.wieze}`);
  await sleep(350);
  await shot("konfetti-desktop", 1280, 1000);
  await sleep(1100);
  await shot("wynik-desktop", 1280, 1000);
  await send("Emulation.clearDeviceMetricsOverride");
  await run(`location.hash = "#/profil";`);
  await shot("profil-desktop", 1280, 900);
  await shot("profil-mobile", 390, 900, true);
  await run(`location.hash = "";`);
  await shot("home-mobile", 390, 1400, true);
}

ws.close();
browser.kill();
await sleep(300);
try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
console.log(failed ? `\n${failed} nieudanych sprawdzeń` : "\nWszystko działa.");
process.exit(failed ? 1 : 0);
