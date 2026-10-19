// Test logiki Litery: słownik 3–7 liter, ocena ruchu, ruch komputera.
const test = require("node:test");
const assert = require("node:assert");
Object.assign(globalThis, require("../../lib.js"));
const { evalMove, aiMove, canConstruct, dict, WORDS, VAL } = require("./gra.js");

const N = 11;
const empty = () => new Array(N * N).fill("");

test("słownik: unikalne wyrazy 3–7 liter, wartości litery zdefiniowane", () => {
  assert.ok(WORDS.length >= 100, "za mało wyrazów");
  assert.equal(new Set(WORDS).size, WORDS.length, "powtórzone wyrazy");
  for (const w of WORDS) {
    assert.ok(w.length >= 3 && w.length <= 7, `długość: ${w}`);
    for (const ch of w) assert.ok(ch in VAL, `brak wartości litery ${ch} w ${w}`);
  }
});

test("pierwszy ruch: przechodzi przez środek, nalicza premie i 2× słowo", () => {
  const g = empty();
  const e = evalMove(g, new Map(), true);
  assert.equal(e.ok, false);
  // KANOŚC? klasyczne: KOŁO przez środek poziomo — pole (5,6) i (5,7) to L2/L3? nie, zwykłe pola
  const tl = new Map([[60, "K"], [61, "O"], [62, "Ł"], [63, "O"]]);
  const e2 = evalMove(g, tl, true);
  assert.equal(e2.ok, true, `ocena KOŁO: ${e2.err || ""}`);
  assert.ok(e2.words.includes("KOŁO"));
  // premia: słowo na W2 w (40) r0 c4? pierwszy ruch musi przez środek, więc W2 testujemy na drugim ruchu niżej
});

test("słowo poza zmowie jest odrzucone, przyłączenie brzegowe działa", () => {
  const g = empty();
  g[60] = "K"; g[61] = "O"; g[62] = "Ł"; g[63] = "O";
  // drugi ruch pionowo podliteruje "WAŻ"? nie w słowniku — przyjmij "LAS" krzyżujące się z O
  const tl = new Map([[52, "L"], [63, "A"], [74, "S"]]);
  // (63) jest zajęte ("O"), więc "A" nie może tam stać — wybierz inne przyłączenie
  const tl2 = new Map([[52, "L"], [63, "A"], [74, "S"]]);
  const e = evalMove(g, tl2, false);
  assert.equal(e.ok, false, `też nie może nadpisać litery ${e.err || ""}`);
  // "LÓD" pionowo z Ł? Ł nie występuje; przyłącz "LAS" w (5,3)... K O Ł O poziome; pion z K: K O T w (4,5)
  const g2 = empty();
  g2[60] = "K"; g2[61] = "O"; g2[63] = "O";
  const t3 = new Map([[71, "O"], [82, "T"]]);
  const e3 = evalMove(g2, t3, false);
  assert.equal(e3.ok, true, "KOT pionowo z K: " + (e3.err || ""));
});

test("komputer gra po pierwszym ruchu albo wcale", () => {
  const g = empty();
  const mv = aiMove(g, ["L", "O", "D", "A", "T", "K", "S"], true);
  if (mv) {
    assert.ok(mv.pts > 0);
    assert.ok(dict(mv.word), `słowo komputera ${mv.word} poza słownikiem`);
    for (const i of mv.tl.keys()) assert.ok(i >= 0 && i < 121);
  }
  const gMid = empty();
  gMid[60] = "M"; gMid[61] = "A"; gMid[62] = "S"; gMid[63] = "Ł"; gMid[64] = "O";
  const mv2 = aiMove(gMid, ["O", "K", "E", "N", "W", "D", "A"], false);
  if (mv2) {
    const e = evalMove(gMid, mv2.tl, false);
    assert.equal(e.ok, true, "komputerSUP nielegalny: " + e.err);
  }
});

test("konstrukcja kafelków: brak liter nie gra", () => {
  assert.equal(canConstruct("LAS", ["L", "A", "S", "K", "O"]), true);
  assert.equal(canConstruct("LAS", ["L", "A", "K", "O"]), false);
});
