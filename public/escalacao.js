// Escalação dos times de futebol/futsal: formações, rendimento fora de posição e a melhor
// combinação jogador → vaga. Usado pelo simulador (servidor) e pelo campinho da sala (navegador),
// para os dois mostrarem exatamente a mesma escalação.
(function (root) {
const Ratings = typeof module !== "undefined" && module.exports ? require("./ratings.js") : root.Ratings;
const Quimica = typeof module !== "undefined" && module.exports ? require("./quimica.js") : root.Quimica;

const GROUP_OF = (cat) => {
  const c = String(cat || "").toLowerCase();
  if (/gol/.test(c)) return "GK";
  if (/def|zag|lat|fixo/.test(c)) return "DEF";
  if (/vol/.test(c)) return "VOL";
  if (/meia.?ata|meia ofensiv|armador/.test(c)) return "MEI";
  if (/mei|mid/.test(c)) return "MID";
  if (/ata|for|pivo|pivô|ala/.test(c)) return "ATT";
  return "MID";
};

// Rendimento fora de posição: FIT[posição de verdade][vaga em que joga]
const FIT = {
  ATT: { ATT: 1.0, MID: 0.9, DEF: 0.8, GK: 0.5 },
  MEI: { ATT: 0.95, MID: 1.0, DEF: 0.85, GK: 0.5 }, // meia-atacante
  MID: { ATT: 0.9, MID: 1.0, DEF: 0.9, GK: 0.5 },   // meia sem tipo definido
  VOL: { ATT: 0.85, MID: 1.0, DEF: 0.95, GK: 0.5 }, // volante
  DEF: { ATT: 0.8, MID: 0.9, DEF: 1.0, GK: 0.5 },
  GK:  { ATT: 0.5, MID: 0.5, DEF: 0.5, GK: 1.0 },
};
const HOME_SLOT = (pos) => (pos === "MEI" || pos === "VOL" ? "MID" : pos); // vaga natural de cada posição
// Formações: linhas de trás para a frente (defesa-meio-ataque)
const FORMATIONS = {
  futsal: {
    "2-2": { DEF: 2, MID: 0, ATT: 2 }, "3-1": { DEF: 3, MID: 0, ATT: 1 },
    "1-2-1": { DEF: 1, MID: 2, ATT: 1 }, "1-1-2": { DEF: 1, MID: 1, ATT: 2 },
  },
  futebol: {
    "4-3-3": { DEF: 4, MID: 3, ATT: 3 }, "4-4-2": { DEF: 4, MID: 4, ATT: 2 }, "3-5-2": { DEF: 3, MID: 5, ATT: 2 },
    "4-2-3-1": { DEF: 4, MID: 5, ATT: 1 }, "3-4-3": { DEF: 3, MID: 4, ATT: 3 }, "5-3-2": { DEF: 5, MID: 3, ATT: 2 },
  },
};
const EMPTY = 35; // vaga sem ninguém

// posição de verdade: a da base (listas dos temas), senão a categoria digitada
const normName = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
let TRUE_POS = null;
function truePos(name) {
  if (!TRUE_POS) {
    TRUE_POS = {};
    const fb = root.FOOTBALL || (root.window && root.window.FOOTBALL) || {};
    for (const era of Object.values(fb)) for (const [cat, list] of Object.entries(era)) for (const n of list) TRUE_POS[normName(n)] = GROUP_OF(cat);
  }
  return TRUE_POS[normName(name)];
}
function playerOf(item) {
  const { name, cat } = Ratings.parseItem(item);
  const r = Ratings.ratingOf(item);
  let pos = truePos(name) || GROUP_OF(cat);
  if (pos === "MID") pos = Ratings.meiaType(item) || "MID";
  return { name, cat, pos, grp: pos, ovr: r.ovr, est: r.est };
}

// Posições fixadas pelo participante: { "Nome": { g: "MID", k: 1 } } = segunda vaga do meio;
// { g: "BENCH" } = reserva. Quem não foi fixado é escalado sozinho nas vagas que sobram.
// Se a formação não tem aquela vaga (ex.: trocou de 4-3-3 para 4-4-2 e era o 3º atacante), o jogador volta a ser escalado sozinho.
const PIN_GROUPS = new Set(["GK", "DEF", "MID", "ATT", "BENCH"]);

// escala o time: melhor combinação jogador → vaga (programação dinâmica), respeitando as posições fixadas
function lineup(players, form, pins) {
  const S = []; for (const [g, n] of Object.entries(form)) for (let i = 0; i < n; i++) S.push({ g, k: i });
  const slots = S.map((s) => s.g);
  const P = players.slice(0, 16), n = P.length, memo = new Map();
  const fixed = slots.map(() => -1); let used0 = 0;
  if (pins) P.forEach((p, i) => {
    const pin = pins[p.name]; if (!pin) return;
    if (pin.g === "BENCH") { used0 |= 1 << i; return; }
    const si = S.findIndex((s) => s.g === pin.g && s.k === pin.k);
    if (si >= 0 && fixed[si] < 0) { fixed[si] = i; used0 |= 1 << i; }
  });
  const val = (p, g) => p.ovr * FIT[p.pos][g];
  function best(si, used) {
    if (si === slots.length) return { v: 0, pick: [] };
    const key = si * 65536 + used; if (memo.has(key)) return memo.get(key);
    let r;
    if (fixed[si] >= 0) { const sub = best(si + 1, used); r = { v: sub.v + val(P[fixed[si]], slots[si]), pick: [fixed[si], ...sub.pick] }; }
    else {
      r = best(si + 1, used); r = { v: r.v + EMPTY, pick: [-1, ...r.pick] };
      for (let i = 0; i < n; i++) if (!(used & (1 << i))) {
        const sub = best(si + 1, used | (1 << i)), v = sub.v + val(P[i], slots[si]);
        if (v > r.v) r = { v, pick: [i, ...sub.pick] };
      }
    }
    memo.set(key, r); return r;
  }
  const { pick } = best(0, used0);
  const xi = slots.map((g, k) => { const p = pick[k] >= 0 ? P[pick[k]] : null; return { slot: g, k: S[k].k, p, eff: p ? p.ovr * FIT[p.pos][g] : EMPTY, pinned: fixed[k] >= 0 }; });
  const bench = P.filter((_, i) => !pick.includes(i));
  return { xi, bench };
}

// limpa as posições fixadas vindas do navegador: só jogadores do time, vagas válidas e sem duas pessoas na mesma vaga
function cleanPins(raw, names) {
  const out = {}, taken = new Set(), valid = new Set(names);
  if (!raw || typeof raw !== "object") return out;
  for (const [name, pin] of Object.entries(raw).slice(0, 32)) {
    if (!valid.has(name) || !pin || !PIN_GROUPS.has(pin.g)) continue;
    if (pin.g === "BENCH") { out[name] = { g: "BENCH" }; continue; }
    const k = Math.floor(Number(pin.k));
    if (!(k >= 0 && k <= 10) || taken.has(pin.g + k)) continue;
    taken.add(pin.g + k); out[name] = { g: pin.g, k };
  }
  return out;
}

// Onde cada vaga fica no campinho (em % da largura/altura), na mesma ordem do xi: goleiro e depois as
// linhas da formação, de trás para a frente. row = linha (0 = goleiro).
function spotsOf(formation, kind) {
  const rows = formation.split("-").map(Number), R = rows.length;
  const [top, bottom, gkY] = kind === "futsal" ? [24, 68, 89] : [15, 73, 91];
  const spots = [{ x: 50, y: gkY, row: 0 }];
  rows.forEach((n, r) => {
    const y = R === 1 ? (top + bottom) / 2 : bottom - r * (bottom - top) / (R - 1), gap = n > 1 ? Math.min(30, 80 / (n - 1)) : 0;
    for (let j = 0; j < n; j++) spots.push({ x: 50 + (j - (n - 1) / 2) * gap, y, row: r + 1 });
  });
  return spots;
}
// Linhas de química (estilo FIFA): vizinho do lado na mesma linha e o mais perto na linha da frente e na de trás.
function linkPairs(spots) {
  const pairs = new Set(), add = (a, b) => pairs.add(a < b ? a + "-" + b : b + "-" + a);
  const rows = []; spots.forEach((s, i) => (rows[s.row] = rows[s.row] || []).push(i));
  rows.forEach((r, ri) => {
    r.slice(1).forEach((i, k) => add(r[k], i));
    const next = rows[ri + 1]; if (!next) return;
    const near = (i, other) => { const d = other.map((j) => Math.abs(spots[j].x - spots[i].x)), m = Math.min(...d); other.forEach((j, k) => { if (d[k] <= m + 0.5) add(i, j); }); };
    r.forEach((i) => near(i, next));
    if (ri > 0) next.forEach((j) => near(j, r)); // o goleiro só liga com os zagueiros do meio
  });
  return [...pairs].map((k) => k.split("-").map(Number));
}
// Química do time: cada linha entre dois titulares vale alta/média/baixa; a química de cada jogador é a média
// das linhas dele e vira um multiplicador do rendimento (x.cm). chem do time vai de 0 a 100.
function applyChem(xi, formation, kind) {
  const spots = spotsOf(formation, kind), links = [];
  for (const [a, b] of linkPairs(spots)) {
    const A = xi[a], B = xi[b];
    if (!A || !B || !A.p || !B.p) continue;
    links.push({ a, b, ...Quimica.link(A.p.name, B.p.name) });
  }
  xi.forEach((x, i) => {
    const mine = links.filter((l) => l.a === i || l.b === i);
    x.chem = mine.length ? mine.reduce((s, l) => s + Quimica.LEVEL[l.nivel], 0) / mine.length : 0.5;
    x.cm = x.p ? Quimica.mult(x.chem) : 1;
  });
  const chem = links.length ? Math.round(100 * links.reduce((s, l) => s + Quimica.LEVEL[l.nivel], 0) / links.length) : 50;
  return { links, chem, spots };
}

// força de ataque e de defesa de uma escalação (notas com o desconto de posição e a química)
function strength(xi) {
  const eff = (g) => xi.filter((x) => x.slot === g).map((x) => x.eff * (x.cm || 1));
  const wsum = (pairs) => { const s = pairs.reduce((a, [v, k]) => a + v * k, 0), m = pairs.reduce((a, [, k]) => a + k, 0); return m ? s / m : 60; };
  const w = (arr, k) => arr.map((v) => [v, k]);
  const att = wsum([...w(eff("ATT"), 1), ...w(eff("MID"), 0.7), ...w(eff("DEF"), 0.25)]);
  const gkSlot = xi.find((x) => x.slot === "GK");
  const def = wsum([[gkSlot.eff * (gkSlot.cm || 1), 1.6], ...w(eff("DEF"), 1), ...w(eff("MID"), 0.5), ...w(eff("ATT"), 0.1)]);
  return { att, def, gkSlot };
}

// escalação de um time a partir dos itens comprados; "auto" testa todas e fica com a mais forte
function escalar(items, kind, formation, pins) {
  const forms = FORMATIONS[kind];
  const auto = !forms[formation];
  let best = null;
  for (const f of auto ? Object.keys(forms) : [formation]) {
    const players = items.map(playerOf);
    const { xi, bench } = lineup(players, { GK: 1, ...forms[f] }, pins);
    const { links, chem, spots } = applyChem(xi, f, kind);
    const { att, def } = strength(xi);
    if (!best || att + def > best.att + best.def) best = { formation: f, players, xi, bench, att, def, links, chem, spots };
  }
  best.auto = auto;
  return best;
}

const api = { GROUP_OF, FIT, HOME_SLOT, FORMATIONS, EMPTY, normName, truePos, playerOf, lineup, strength, escalar, cleanPins, spotsOf, linkPairs, applyChem };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Escalacao = api;
})(typeof window !== "undefined" ? window : globalThis);
