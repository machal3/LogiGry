// Pięć kart: pięciokartowy poker w rozdzielności z komputerem — żetony, wymiana i zamknięcie rozdania.
{
  // Dwud go dwuarc routines. karty: { r: 2..14, s: 0..3 } (kiery, karo, trefl, pik)
  const RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const SUITS = ["♠", "♥", "♦", "♣"]; // kier (czerwony), karo (czerwony), trefl, pik
  const CATS = ["wysoka karta", "para", "dwie pary", "trójka", "strit", "kolor", "ful", "kareta", "poker"];

  function newDeck() {
    const d = [];
    for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s });
    return shuffle(d);
  }

  function deal() {
    const d = newDeck();
    return [d.slice(0, 5), d.slice(5, 10), d.slice(10)];
  }

  function viewpoint(h) { return h.map((c) => `${RANKS[c.r - 2]}${SUITS[c.s]}`).join(" "); }

  // Ocena 5 kart: kategoria 0–8 i kola porównawcze wysokia→niska.
  function hand(h) {
    const rs = h.map((c) => c.r).sort((a, b) => b - a);
    const flush = h.every((c) => c.s === h[0].s);
    let straight = true;
    for (let k = 0; k < 4; k++) if (rs[k] !== rs[k + 1] + 1) straight = false;
    const cnt = new Map();
    for (const r of rs) cnt.set(r, (cnt.get(r) || 0) + 1);
    const distinct = [...cnt.keys()].sort((a, b) => b - a);
    const quads = distinct.filter((r) => cnt.get(r) === 4);
    const trips = distinct.filter((r) => cnt.get(r) === 3);
    const pairs = distinct.filter((r) => cnt.get(r) === 2);
    const kickers = (ex) => distinct.filter((r) => !ex.includes(r));
    if (quads.length) return { cat: 7, tie: [quads[0], ...kickers(quads)] };
    if (trips.length && pairs.length) return { cat: 6, tie: [trips[0], pairs[0]] };
    if (flush && straight) return { cat: 8, tie: [rs[0]] };
    if (straight) return { cat: 5, tie: [rs[0]] };
    if (flush) return { cat: 4, tie: rs };
    if (trips.length) return { cat: 3, tie: [trips[0], ...kickers(trips)] };
    if (pairs.length > 1) return { cat: 2, tie: [...pairs, ...kickers(pairs)] };
    if (pairs.length) return { cat: 1, tie: [pairs[0], ...kickers(pairs)] };
    return { cat: 0, tie: rs };
  }

  // uzupełnia wynik wymagany
  function beats(a, b) {
    if (a.cat !== b.cat) return a.cat > b.cat;
    const la = [...a.tie], lb = [...b.tie];
    for (let k = 0; k < Math.max(la.length, lb.length); k++) {
      const va = la[k] || 0, vb = lb[k] || 0;
      if (va !== vb) return va > vb;
    }
    return false; // remis bez rozstrzygnięcia
  }

  // Wymiana komputera: odrzuca pojedyncze karty, zostając przy grupach i mocnych kartach.
  function aiDiscard(h) {
    const rank = hand(h);
    if (rank.cat >= 4) return []; // strit, kolor i lepsze nie wymagają wymiany
    const cnt = new Map();
    for (const c of h) cnt.set(c.r, (cnt.get(c.r) || 0) + 1);
    const groups = [...cnt.keys()].filter((r) => cnt.get(r) >= 2);
    const singles = h.map((c, i) => ({ c, i }))
      .filter((x) => !groups.includes(x.c.r))
      .sort((a, b) => a.c.r - b.c.r);
    return singles.slice(0, 3).map((x) => x.i);
  }

  if (typeof module !== "undefined") module.exports = { newDeck, deal, hand, beats, aiDiscard, RANKS, SUITS, CATS, viewpoint };

  if (typeof registerGame !== "undefined") registerGame({
    id: "piec-kart",
    cat: "planszowe",
    name: "Pięć kart",
    author: "GLM 5.3 Flash",
    desc: "Rozdaj, wymień i obstawiaj: pięciokartowy poker uzalga z komputerem do końca żetonów.",
    color: "#7f1d1d",
    ink: "#ffffff",
    glyph: ["#.#.#", "#####", "#.#.#", "#####", "#.#.#"],
    big: true,
    levels: [
      { key: "easy", name: "Łatwy", points: 20, me: 140, ai: 60, bold: 0.25 },
      { key: "medium", name: "Średni", points: 50, me: 140, ai: 100, bold: 0.45 },
      { key: "hard", name: "Trudny", points: 100, me: 120, ai: 140, bold: 0.65 },
    ],
    rules: [
      "Każde rozdanie: po pięć kart, obowiązkowa wnieśka i pierwszy zakład — Równaj albo Pas.",
      "Klikaj karty do wymiany i wymień je raz na nowe. Układy rosną: para, dwie pary, trójka, strit, kolor, ful, kareta i poker.",
      "Po wymianie następuje drugi zakład i odsłonięcie; wygrywa lepszy układ, remis dzieli pot.",
      "Partia kończy się wyzerowaniem żetonów jednej strony; odwaga komputera zależy od poziomu.",
    ],
    achievements: [
      { id: "para-asow", name: "Para asów", desc: "Wygraj rozdanie z parą asów.", points: 10 },
      { id: "ful" , name: "Full", desc: "Wygraj rozdanie z fulowym zestawem.", points: 25 },
      { id: "poker", name: "Poker", desc: "Wygraj rozdanie nieprawdopodobnym pokerem.", points: 50 },
    ],

    mount(board, ctx) {
      const L = ctx.level;
      const handEl = el("div", "pk-hands");
      const compRow = el("div", "pk-row pk-comp");
      const potRow = el("div", "pk-potrow");
      const myRow = el("div", "pk-row pk-mine");
      handEl.append(compRow, potRow, myRow);
      board.append(handEl);
      const chipsMe = statBlock(ctx, "Żetony Ty", {});
      const chipsAI = statBlock(ctx, "Żetony CPU", { small: true });
      const msgEl = statBlock(ctx, "Komentarz", { small: true });
      const actBlk = panelBlock("Akcje");
      ctx.panel.append(actBlk);

      const s = { meChips: L.me, aiChips: L.ai, pot: 0, myHand: [], aiHand: [], deck: [],
        phase: "idle", hold: new Set(), handNo: 0, raised: false };

      // —= nowe rozdanie ===
      function newHand() {
        s.handNo++;
        s.hold.clear();
        s.raised = false;
        s.pot = 0;
        const [mine, ai, deck] = deal();
        s.myHand = mine; s.aiHand = ai; s.deck = deck;
        // wnieśka: odpowiednio po 5
        s.meChips -= 5; s.aiChips -= 5; s.pot += 10;
        s.phase = "bet1";
        message("Twoje karty. Równaj albo pasuj; przy wymianie klikasz karty.");
        drawCards(false, true);
        stripButtons();
        actBlk.append(button("Równaj", "btn wide", bet1Call), button("Pas", "btn-ghost wide", () => foldState(true)));
      }

      function bet1Call() {
        // kładzie call: podnosi do stałej 10
        s.meChips -= 10; s.pot += 10;
        // decyzja komputera z mocy ręki
        const strength = hand(s.aiHand).cat;
        const aiActs = strength >= 2 ? true : Math.random() < 0.35 + L.bold * 0.4;
        if (aiActs) { s.aiChips -= 10; s.pot += 10; return exchange(); }
        message("Komputer pasuje; pot przechodzi na twój oddział.");
        foldAI();
      }

      function foldState(me) {
        if (me) { s.aiChips += s.pot; s.pot = 0; message("Pasujesz: pot leci do komputera."); }
        else { s.meChips += s.pot; s.pot = 0; message("Komputer pasuje: pot twój."); }
        Sound.erase();
        s.phase = "idle";
        drawCards();
        stripButtons();
        afterHand(me ? "ai" : "me");
      }
      function foldAI() { foldState(false); }

      function exchange() {
        s.phase = "wymiana";
        message("Wymień słabe karty — klikaj karty albo od razu Zostaw rękę.");
        drawCards();
        stripButtons();
        actBlk.append(button("Wymień zaznaczone", "btn wide", doExchange),
             button("Zostaw rękę", "btn-ghost wide", () => { s.hold.clear(); doExchange(); }));
      }

      function doExchange() {
        // wymiana gracza
        const keep = s.myHand.filter((_, i) => s.hold.has(i));
        const drop = s.myHand.filter((_, i) => !s.hold.has(i));
        const na = [...keep, ...s.deck.slice(0, drop.length)];
        s.deck = s.deck.slice(drop.length);
        s.myHand = na;
        // komputer wymienia cicho
        const dis = aiDiscard(s.aiHand);
        const mine2 = [...s.aiHand];
        const keep2 = mine2.filter((_, i) => !dis.includes(i));
        const done = mine2.filter((_, i) => dis.includes(i));
        s.aiHand = [...keep2, ...s.deck.slice(0, done.length)];
        s.deck = s.deck.slice(done.length);
        s.hold.clear();
        bet2();
      }

      function bet2() {
        s.phase = "bet2";
        message("Po wymianie: finałowy zakład.");
        drawCards();
        stripButtons();
        actBlk.append(button("Sprawdzam 20", "btn wide", bet2Call), button("Pas", "btn-ghost wide", () => foldState(true)));
      }

      function bet2Call() {
        s.meChips -= 20; s.pot += 20;
        const h = hand(s.aiHand);
        const aiActs = h.cat >= 1 || Math.random() < 0.3 + L.bold * 0.35;
        if (aiActs) { s.aiChips -= 20; s.pot += 20; return showdown(); }
        message("Komputer miserre: pasuje po wymianie.");
        foldState(false);
      }

      function showdown() {
        const hMe = hand(s.myHand), hAi = hand(s.aiHand);
        const mine = viewpoint(s.myHand), ai = viewpoint(s.aiHand);
        let w = 0;
        if (beats(hMe, hAi)) w = 1;
        else if (beats(hAi, hMe)) w = -1;
        // remis: pot dzielony po połowie
        s.phase = "show";
        message(`Układy: przykład masz ${CATS[hMe.cat]} (${mine}), komputer ${CATS[hAi.cat]} (${ai}).`);
        drawCards(true);
        Sound.place(4);
        if (hMe.cat === 1 && hMe.tie[0] === 14 && w > 0) ctx.achieve("para-asow");
        if (hMe.cat === 6 && w > 0) ctx.achieve("ful");
        if (hMe.cat === 8 && w > 0) ctx.achieve("poker");
        if (w > 0) { s.meChips += s.pot; Sound.win(); }
        else if (w < 0) { s.aiChips += s.pot; Sound.error(); }
        else { s.meChips += s.pot / 2; s.aiChips += s.pot / 2; }
        s.pot = 0;
        stripButtons();
        afterHand(w > 0 ? "me" : w < 0 ? "ai" : null);
      }

      function afterHand(winner) {
        if (s.meChips <= 0) return ctx.lose("Pustka żetonów", `Rozdań: ${s.handNo}.`);
        if (s.aiChips <= 0) {
          return ctx.win(`Wygrałeś wszystkie żetony komputera w ${s.handNo} rozdaniach.`);
        }
        stripButtons();
        actBlk.append(button(`Rozdanie ${s.handNo + 1}`, "btn wide", () => newHand()));
      }

      function drawCards(showAI, deal) {
        compRow.textContent = "";
        myRow.textContent = "";
        s.aiHand.forEach((c, i) => {
          const card = cardEl(c, showAI, i);
          if (showAI) { card.classList.add("pk-flip"); card.style.animationDelay = `${i * 0.14}s`; }
          compRow.append(card);
        });
        s.myHand.forEach((c, i) => {
          const card = cardEl(c, true, i, true);
          if (deal) { card.classList.add("pk-dealin"); card.style.animationDelay = `${i * 0.09}s`; }
          myRow.append(card);
        });
        potRow.textContent = "";
        potRow.append(el("span", "pk-pot", `pot: ${s.pot}`));
        // co masz w ręce, widać od razu na środku
        if (s.myHand.length === 5)
          potRow.append(el("span", "pk-cat", CATS[hand(s.myHand).cat]));
        chipsMe.set(String(s.meChips), Math.min(1, s.meChips / (L.me + L.ai)));
        chipsAI.set(String(s.aiChips));
        ctx.progress(Math.min(1, s.handNo / 12));
      }

      function cardEl(c, faceUp, i, mine) {
        const d = el("button", "pk-card" + (faceUp ? "" : " pk-back"));
        if (faceUp) {
          const red = c.s === 1 || c.s === 2;
          d.append(el("span", "pk-rank" + (red ? " pk-red" : ""), RANKS[c.r - 2]));
          d.append(el("span", "pk-suit" + (red ? " pk-red" : ""), SUITS[c.s]));
        }
        if (mine) d.setAttribute("aria-label", faceUp ? "Karta " + viewpoint([c]) : "Zakryta karta");
        if (mine) {
          d.addEventListener("click", () => {
            if (s.phase !== "wymiana") return;
            if (s.hold.has(i)) s.hold.delete(i); else s.hold.add(i);
            d.classList.toggle("pk-hold", s.hold.has(i));
            Sound.tap();
          });
          if (s.hold.has(i)) d.classList.add("pk-hold");
        }
        return d;
      }

      function stripButtons() {
        actBlk.textContent = "";
      }
      function message(t) { msgEl.set(t); }

      newHand();
    },
  });
}
