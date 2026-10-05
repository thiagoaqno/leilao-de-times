// Simulador de campeonatos de futebol/futsal baseado nas notas do FC 27.
// Gera o campeonato em partes (Markdown) para o modo suspense: cada parte é revelada de uma vez.
const Ratings = require("./public/ratings.js");
const BORDOES = require("./public/bordoes.js");

const rnd = () => Math.random();
const pick = (a) => a[Math.floor(rnd() * a.length)];
function poisson(l) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return k - 1; }
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const { GROUP_OF, FIT, HOME_SLOT, FORMATIONS, EMPTY, lineup, strength, playerOf, applyChem } = require("./public/escalacao.js");
const POS_NAME = { MEI: "meia-atacante", VOL: "volante" };
const CHEM_ICON = (c) => (c >= 65 ? "🟢" : c >= 35 ? "🟡" : "🔴");
const SLOT_NAME = { GK: "no gol", DEF: "na defesa", MID: "no meio", ATT: "no ataque" };

// a posição de verdade vem das listas dos temas (presets.js)
if (typeof globalThis.window === "undefined") globalThis.window = {};
require("./public/presets.js");

function buildTeam(cap, kind) {
  const forms = FORMATIONS[kind];
  const chosen = forms[cap.formation] ? [cap.formation] : Object.keys(forms); // "auto": testa todas
  let best = null;
  for (const f of chosen) {
    const t = buildWith(cap, kind, f);
    if (!best || t.att + t.def > best.att + best.def) best = t;
  }
  best.auto = !forms[cap.formation];
  return best;
}
function buildWith(cap, kind, fname) {
  const players = cap.team.map((t) => ({ ...playerOf(t.player), goals: 0, slot: null, eff: 0 }));
  const { xi, bench } = lineup(players, { GK: 1, ...FORMATIONS[kind][fname] }, cap.pins);
  const { links, chem } = applyChem(xi, fname, kind);
  xi.forEach((x) => { if (x.p) { x.p.slot = x.slot; x.p.eff = x.eff * x.cm; } });
  const { att, def, gkSlot } = strength(xi);
  const keeper = gkSlot.p, improvised = !keeper || keeper.pos !== "GK";
  const ovr = Math.round(avg(players.map((p) => p.ovr)));
  const offPos = xi.filter((x) => x.p && HOME_SLOT(x.p.pos) !== x.slot);
  const holes = xi.filter((x) => !x.p).length;
  return { id: cap.id, name: cap.name, formation: fname, players, xi, bench, links, chem, keeper, gkEff: gkSlot.eff * gkSlot.cm, improvised, offPos, holes, att, def, ovr, stats: { p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0 } };
}

// ---------- narração ----------
function makeNarrator() {
  const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const galera = BORDOES.galera || {}; // piadas por apelido (hoje não há nenhuma)
  const keyOf = (name) => { const n = norm(name); return Object.keys(galera).find((k) => n.includes(k)); };
  const show = (name) => name;
  const fill = (s, t, o) => s.replace(/\{t\}/g, `**${show(t)}**`).replace(/\{o\}/g, `**${show(o)}**`);
  const line = (name, kind, opp) => { const k = keyOf(name); const l = k && galera[k][kind]; return l && l.length ? fill(pick(l), name, opp) : null; };
  const used = new Set(); let lastPerola = null;
  const perola = (kind, who, team, where = "na saída de campo") => {
    const all = (BORDOES.perolas || {})[kind] || [];
    let list = all.filter(([f]) => !used.has(f));
    if (!list.length) list = all; // já usou todas desse grupo: pode repetir
    if (!list.length || !who) return null;
    const [f, src] = pick(list); used.add(f);
    const credit = !src ? "" : src === "meme" ? " _(meme)_" : ` _(à la ${src})_`;
    lastPerola = { frase: f, quem: who, origem: src };
    return `🎤 **${who}** (${show(team)}), ${where}: "${f}"${credit}`;
  };
  return { keyOf, show, fill, line, perola, get lastPerola() { return lastPerola; } };
}

// ---------- partida ----------
function playMatch(A, B, cfg, opts = {}) {
  const futsal = cfg.futsal;
  const mins = futsal ? 40 : 90, base = futsal ? 2.6 : 1.3, k = futsal ? 0.05 : 0.06;
  const lam = (X, Y) => clamp(base * Math.exp(k * (X.att - Y.def)), 0.2, futsal ? 6 : 4);
  const goals = [];
  const addGoals = (T, O, n, from, to) => {
    for (let i = 0; i < n; i++) {
      let min, tries = 0;
      do { min = from + 1 + Math.floor(rnd() * (to - from)); } while (goals.some((g) => g.min === min) && ++tries < 20);
      goals.push({ team: T, scorer: pickScorer(T), min });
    }
  };
  addGoals(A, B, poisson(lam(A, B)), 0, mins);
  addGoals(B, A, poisson(lam(B, A)), 0, mins);
  let gA = goals.filter((g) => g.team === A).length, gB = goals.length - gA, et = false, pens = null;
  if (opts.knockout && gA === gB) {
    et = true;
    const extra = futsal ? 10 : 30, f = extra / mins;
    const eA = poisson(lam(A, B) * f), eB = poisson(lam(B, A) * f);
    addGoals(A, B, eA, mins, mins + extra); addGoals(B, A, eB, mins, mins + extra);
    gA += eA; gB += eB;
    if (gA === gB) pens = penalties(A, B);
  }
  goals.sort((x, y) => x.min - y.min);
  goals.forEach((g) => g.scorer.goals++);
  const winner = gA > gB ? A : gB > gA ? B : pens ? (pens.a > pens.b ? A : B) : null;
  return { A, B, gA, gB, goals, et, pens, winner, mins };
}
function pickScorer(T) {
  const W = { ATT: 6, MID: 3, DEF: 1, GK: 0.03 };
  const pool = T.xi.filter((x) => x.p).map((x) => [x.p, (W[x.slot] || 2) * Math.pow(Math.max(1, x.eff - 30), 1.5)]);
  let r = rnd() * pool.reduce((a, [, w]) => a + w, 0);
  for (const [p, w] of pool) { if ((r -= w) <= 0) return p; }
  return pool[0][0];
}
function penalties(A, B) {
  const takers = (T) => { const t = T.xi.filter((x) => x.p && x.slot !== "GK").map((x) => x.p).sort((a, b) => b.ovr - a.ovr); return t.length ? t : [{ name: "?", ovr: 50 }]; };
  const gk = (T) => T.gkEff;
  const shot = (p, O) => rnd() < clamp(0.75 + (p.ovr - gk(O)) * 0.012, 0.45, 0.93);
  const ta = takers(A), tb = takers(B); let a = 0, b = 0, i = 0;
  const kicks = [];
  for (; i < 5; i++) {
    const pa = ta[i % ta.length], pb = tb[i % tb.length];
    const ha = shot(pa, B); a += ha; kicks.push([pa, ha, "A"]);
    if (a > b + (5 - i) || b > a + (5 - i - 1)) break;
    const hb = shot(pb, A); b += hb; kicks.push([pb, hb, "B"]);
    if (a > b + (5 - i - 1) || b > a + (5 - i - 1)) break;
  }
  while (a === b) {
    const pa = ta[i % ta.length], pb = tb[i % tb.length]; i++;
    const ha = shot(pa, B), hb = shot(pb, A); a += ha; b += hb; kicks.push([pa, ha, "A"], [pb, hb, "B"]);
  }
  const missA = kicks.filter(([, h, s]) => s === "A" && !h).map(([p]) => p.name), missB = kicks.filter(([, h, s]) => s === "B" && !h).map(([p]) => p.name);
  return { a, b, missA, missB, kicks };
}

// ---------- texto da partida ----------
function matchMd(m, N, title) {
  const { A, B } = m;
  const minTxt = (g) => (g.min > m.mins ? `${g.min}' (prorr.)` : `${g.min}'`);
  const scorers = (T) => {
    const gl = m.goals.filter((g) => g.team === T); if (!gl.length) return null;
    const byP = new Map(); gl.forEach((g) => { if (!byP.has(g.scorer)) byP.set(g.scorer, []); byP.get(g.scorer).push(minTxt(g)); });
    return [...byP].map(([p, ms]) => `${p.name} ${ms.join(", ")}${ms.length >= 3 ? " 🎩" : ""}`).join(" · ");
  };
  let head = `### ${title ? title + " — " : ""}${A.name} ${m.gA} x ${m.gB} ${B.name}`;
  if (m.pens) head += ` (${m.pens.a} x ${m.pens.b} nos pênaltis)`;
  else if (m.et) head += " (na prorrogação)";
  const out = [head];
  const sA = scorers(A), sB = scorers(B);
  if (sA) out.push(`- ⚽ **${A.name}:** ${sA}`);
  if (sB) out.push(`- ⚽ **${B.name}:** ${sB}`);
  if (m.pens) {
    const miss = [...m.pens.missA.map((n) => `${n} (${A.name})`), ...m.pens.missB.map((n) => `${n} (${B.name})`)];
    if (miss.length) out.push(`- 🧤 Perderam o pênalti: ${miss.join(", ")}`);
  }
  // narração
  const lines = [];
  const W = m.winner, L = W === A ? B : W === B ? A : null, diff = Math.abs(m.gA - m.gB);
  const hat = m.goals.reduce((acc, g) => { acc.set(g.scorer, (acc.get(g.scorer) || 0) + 1); return acc; }, new Map());
  if (m.pens) lines.push(N.fill(pick(BORDOES.narrador.penaltis), W.name, L.name));
  else if (!W && m.gA === 0) lines.push(pick(BORDOES.narrador.zerado));
  else if (!W) lines.push(pick(BORDOES.narrador.empate));
  else if (diff >= 3) {
    lines.push(`🗣️ **${N.show(W.name)}:** "${pick(BORDOES.lavada)}"`);
    lines.push(N.fill(pick(BORDOES.narrador.lavada), W.name, L.name));
  } else if (diff === 1) lines.push(pick(BORDOES.narrador.apertado));
  if ([...hat.values()].some((v) => v >= 3)) lines.push(pick(BORDOES.narrador.hattrick));
  if (W) {
    const lw = N.line(W.name, "vitoria", L.name), ll = N.line(L.name, "derrota", W.name);
    const opts = [lw, ll].filter(Boolean);
    if (opts.length) lines.push(diff >= 3 && ll ? ll : pick(opts));
  } else {
    const s = [N.line(A.name, "sempre", B.name), N.line(B.name, "sempre", A.name)].filter(Boolean);
    if (s.length) lines.push(pick(s));
  }
  // pérola da entrevista
  if (rnd() < (BORDOES.chancePerola ?? 0.6)) {
    const topOf = (T) => { const g = m.goals.filter((x) => x.team === T).map((x) => x.scorer); return g.length ? pick(g).name : pick(T.xi.filter((x) => x.p)).p.name; };
    const zebra = W && L && (L.att + L.def) - (W.att + W.def) >= 4;
    let pr = null;
    if (m.pens && (m.pens.missA.length || m.pens.missB.length)) {
      const side = m.pens.missA.length ? [m.pens.missA, A] : [m.pens.missB, B];
      pr = N.perola("penaltiPerdido", pick(side[0]), side[1].name);
    }
    if (!pr && zebra) pr = N.perola("zebra", topOf(W), W.name);
    if (!pr && W && diff >= 3) pr = rnd() < 0.5 ? N.perola("lavada", topOf(W), W.name) : N.perola("derrota", topOf(L), L.name);
    if (!pr && W && diff === 1 && rnd() < 0.4) pr = N.perola("apertado", topOf(W), W.name);
    if (!pr && W) pr = rnd() < 0.6 ? N.perola("vitoria", topOf(W), W.name) : N.perola("derrota", topOf(L), L.name);
    if (!pr && m.goals.length) { const g = pick(m.goals); pr = N.perola("gol", g.scorer.name, g.team.name); }
    if (pr) lines.push(pr);
  }
  lines.slice(0, 4).forEach((l) => out.push(/^(🗣️|🎤)/.test(l) ? `- ${l}` : `- 🎙️ ${l}`));
  return out.join("\n");
}

// ---------- jogo ao vivo ----------
// Os dados de cada partida para o placar ao vivo do navegador: minuto e autor de cada gol, prorrogação e cada
// cobrança de pênalti. O texto (Markdown) continua igual; isto vai junto, parte por parte.
let jogoSeq = 0;
function liveOf(m, titulo, mataMata) {
  const lado = (T) => (T === m.A ? "A" : "B");
  return {
    id: "j" + ++jogoSeq, titulo: titulo || "", mataMata: !!mataMata, mins: m.mins, extra: m.et ? (m.mins === 40 ? 10 : 30) : 0,
    A: { id: m.A.id, nome: m.A.name }, B: { id: m.B.id, nome: m.B.name }, gA: m.gA, gB: m.gB,
    gols: m.goals.map((g) => ({ min: g.min, lado: lado(g.team), nome: g.scorer.name, ovr: g.scorer.ovr, pos: g.scorer.pos })),
    pens: m.pens ? { a: m.pens.a, b: m.pens.b, cob: m.pens.kicks.map(([p, ok, s]) => ({ lado: s, nome: p.name, ok: !!ok })) } : null,
    vencedor: m.winner === m.A ? "A" : m.winner === m.B ? "B" : null,
  };
}
// a classificação como lista (para a tabela animada entre as rodadas)
const tabelaSnap = (teams) => sortTable(teams).map((t) => ({ id: t.id, nome: t.name, ...t.stats }));

// ---------- tabela ----------
function applyStats(m) {
  const { A, B } = m;
  for (const [T, gf, ga] of [[A, m.gA, m.gB], [B, m.gB, m.gA]]) {
    T.stats.j++; T.stats.gp += gf; T.stats.gc += ga;
    if (gf > ga) { T.stats.v++; T.stats.p += 3; } else if (gf === ga) { T.stats.e++; T.stats.p += 1; } else T.stats.d++;
  }
}
const sortTable = (teams) => [...teams].sort((a, b) => b.stats.p - a.stats.p || (b.stats.gp - b.stats.gc) - (a.stats.gp - a.stats.gc) || b.stats.gp - a.stats.gp || rnd() - 0.5);
function tableMd(teams) {
  const rows = sortTable(teams).map((t, i) => { const s = t.stats, sg = s.gp - s.gc; return `| ${i + 1} | ${t.name} | **${s.p}** | ${s.j} | ${s.v}-${s.e}-${s.d} | ${s.gp}:${s.gc} | ${sg > 0 ? "+" : ""}${sg} |`; });
  return ["| # | Time | Pts | J | V-E-D | Gols | SG |", "|---|---|---|---|---|---|---|", ...rows].join("\n");
}
function roundRobin(teams) { // método do círculo
  const t = [...teams]; if (t.length % 2) t.push(null);
  const n = t.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const games = [];
    for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) games.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(games);
    t.splice(1, 0, t.pop());
  }
  return rounds;
}

// ---------- campeonato ----------
function simulate(room, opts = {}) {
  const kind = opts.sport === "futebol" ? "futebol" : "futsal";
  const cfg = { futsal: kind === "futsal" };
  const N = makeNarrator();
  const caps = room.order.map((id) => ({ id, ...room.captains[id] })).filter((c) => c.team.length);
  if (caps.length < 2) throw new Error("Precisa de pelo menos 2 times com jogadores.");
  const teams = caps.map((c) => buildTeam(c, kind)).sort(() => rnd() - 0.5);
  const n = teams.length;
  let format = opts.format || "auto";
  if (n === 2) format = "series";
  else if (!["league", "knockout"].includes(format)) format = "league";
  const sections = [], lives = []; // lives[i]: os jogos da parte i (ou null), para o placar ao vivo
  const put = (md, live = null) => { sections.push(md); lives.push(live); };
  const allMatches = [];
  const ctx = {};
  const fim = () => ({ sections, lives, campeao: ctx.campeao || null, summary: ctx.summary ? { ...ctx.summary, torneio: title, modalidade: kind, data: new Date().toISOString() } : null });

  // 1) elencos
  const title = kind === "futsal" ? "Copa de Futsal da Galera" : "Copa da Galera (futebol de campo)";
  const fmtName = format === "series" ? "melhor de 3 jogos" : format === "knockout" ? "mata-mata direto" : n >= 6 ? "pontos corridos + semifinais e final" : "pontos corridos + final";
  const ests = teams.flatMap((t) => t.players.filter((p) => p.est)).length;
  let s = [`# 🏆 ${title}`, `**Formato:** ${fmtName}${format === "series" ? " (todo jogo tem vencedor: empate vai para prorrogação e pênaltis)" : ""} · notas do **EA FC 27**`, "", "## 📋 Os elencos", "",
    "| Time | Formação | Força | Ataque | Defesa | Média das notas | Química | Goleiro |", "|---|---|---|---|---|---|---|---|",
    ...[...teams].sort((a, b) => b.att + b.def - a.att - a.def).map((t) => `| ${t.name} | ${t.formation}${t.auto ? " (auto)" : ""} | **${Math.round((t.att + t.def) / 2)}** | ${Math.round(t.att)} | ${Math.round(t.def)} | ${t.ovr} | ${CHEM_ICON(t.chem)} ${t.chem} | ${t.keeper ? t.keeper.name + (t.improvised ? ` ⚠️ improvisado (${Math.round(t.gkEff)})` : ` (${t.keeper.ovr})`) : "⚠️ ninguém"} |`)];
  const fav = [...teams].sort((a, b) => b.att + b.def - a.att - a.def)[0];
  s.push("", `🎙️ Favorito no papel: **${fav.name}**. Mas papel não entra em campo!`);
  { const t = pick(teams), p = pick(t.xi.filter((x) => x.p)); const pr = p && N.perola("abertura", p.p.name, t.name, "na coletiva de apresentação"); if (pr) s.push(`- ${pr}`); }
  teams.forEach((t) => { const l = N.line(t.name, "sempre", fav.name); if (l) s.push(`- ${l}`); });
  teams.filter((t) => t.improvised).forEach((t) => s.push(t.keeper ? `- 🚨 O **${t.name}** não tem goleiro! **${t.keeper.name}** vai pro gol improvisado e rende só ${Math.round(t.gkEff)}.` : `- 🚨 O **${t.name}** está sem ninguém no gol!`));
  // química: o entrosamento que mais chama atenção e o time mais desentrosado
  {
    const byChem = [...teams].sort((a, b) => b.chem - a.chem), top = byChem[0], low = byChem[byChem.length - 1];
    const duo = top.links.filter((l) => l.nivel === "alta")[0];
    if (duo) s.push(`- 🔗 **${top.name}** é o time mais entrosado (química ${top.chem}): ${top.xi[duo.a].p.name} e ${top.xi[duo.b].p.name} já jogaram juntos no ${duo.clubes[0]}.`);
    else if (top.chem > low.chem) s.push(`- 🔗 **${top.name}** é o time mais entrosado (química ${top.chem}).`);
    if (low !== top && low.chem < 35) s.push(`- 🧩 **${low.name}** é o mais desentrosado (química ${low.chem}): quase ninguém se conhece e o time rende menos.`);
  }
  teams.forEach((t) => {
    const off = t.offPos.filter((x) => x.slot !== "GK");
    if (off.length) s.push(`- ⚠️ **${t.name}** tem gente fora de posição: ${off.map((x) => `${x.p.name}${POS_NAME[x.p.pos] ? ` (${POS_NAME[x.p.pos]})` : ""} ${SLOT_NAME[x.slot]} (${x.p.ovr} → ${Math.round(x.eff)})`).join(", ")}`);
    if (t.holes) s.push(`- 🕳️ **${t.name}** entra com ${t.holes} vaga(s) sem ninguém na escalação.`);
  });
  if (ests) s.push("", `_Obs.: ${ests} jogador(es) sem nota oficial do FC 27 entraram com nota estimada._`);
  put(s.join("\n"));

  const play = (a, b, o) => { const m = playMatch(a, b, cfg, o); allMatches.push(m); return m; };

  if (format === "series") {
    const [A, B] = teams; let wa = 0, wb = 0, g = 1;
    while (wa < 2 && wb < 2) {
      const decisive = wa === 1 && wb === 1;
      const m = play(g % 2 ? A : B, g % 2 ? B : A, { knockout: true }); // todo jogo da série tem vencedor
      if (m.winner === A) wa++; else if (m.winner === B) wb++;
      put(`## ⚽ Jogo ${g}${decisive ? " — o decisivo" : ""}\n\n${matchMd(m, N)}\n\n**Série: ${A.name} ${wa} x ${wb} ${B.name}**`, { jogos: [liveOf(m, `Jogo ${g}`, true)] });
      g++;
      if (g > 7) break;
    }
    const champ = wa > wb ? A : B, vice = champ === A ? B : A;
    put(finalSection(champ, vice, null, teams, allMatches, N, ctx, `Série melhor de 3: ${A.name} ${wa} x ${wb} ${B.name}`));
    return fim();
  }

  if (format === "knockout") {
    let alive = [...teams], roundN = 0; const byesTo = 1 << Math.ceil(Math.log2(n));
    let semiLosers = [];
    while (alive.length > 1) {
      roundN++;
      const size = alive.length, byes = roundN === 1 ? byesTo - size : 0;
      const name = size <= 2 ? "Final" : size <= 4 ? "Semifinais" : size <= 8 ? "Quartas de final" : `Rodada ${roundN}`;
      const next = [], lines = [], jogos = [];
      const bye = alive.slice(0, byes), playing = alive.slice(byes);
      if (bye.length) lines.push(`- 😴 Passaram direto (folga): **${bye.map((t) => t.name).join("**, **")}**`);
      const losers = [];
      for (let i = 0; i < playing.length; i += 2) {
        const m = play(playing[i], playing[i + 1], { knockout: true });
        lines.push(matchMd(m, N)); jogos.push(liveOf(m, name === "Final" ? "Final" : "", true)); next.push(m.winner); losers.push(m.winner === m.A ? m.B : m.A);
      }
      if (name === "Final") {
        const m = allMatches[allMatches.length - 1];
        const third = semiLosers.length === 2 ? play(semiLosers[0], semiLosers[1], { knockout: true }) : null;
        if (third) put(`## 🥉 Disputa de 3º lugar\n\n${matchMd(third, N)}`, { jogos: [liveOf(third, "3º lugar", true)] });
        put(`## 🏟️ A GRANDE FINAL\n\n${lines.join("\n\n")}`, { jogos });
        put(finalSection(m.winner, m.winner === m.A ? m.B : m.A, third ? third.winner : null, teams, allMatches, N, ctx, `Final: ${scoreTxt(m)}`));
        return fim();
      }
      if (name === "Semifinais") semiLosers = losers;
      put(`## ⚔️ ${name}\n\n${lines.join("\n\n")}`, { jogos });
      alive = [...bye, ...next];
    }
  }

  // pontos corridos
  const rounds = roundRobin(teams);
  rounds.forEach((games, i) => {
    const played = teams.filter((t) => games.some(([a, b]) => a === t || b === t));
    const off = teams.filter((t) => !played.includes(t));
    const antes = tabelaSnap(teams), jogos = [];
    const parts = games.map(([a, b]) => { const m = play(a, b); applyStats(m); jogos.push(liveOf(m, "", false)); return matchMd(m, N); });
    if (off.length) parts.push(`- 😴 Folga: **${off.map((t) => t.name).join(", ")}**`);
    put(`## ⚽ Rodada ${i + 1}\n\n${parts.join("\n\n")}\n\n#### 📊 Classificação\n\n${tableMd(teams)}`, { jogos, tabela: { antes, depois: tabelaSnap(teams) } });
  });
  const table = sortTable(teams);
  if (n >= 6) {
    const [t1, t2, t3, t4] = table;
    const s1 = play(t1, t4, { knockout: true }), s2 = play(t2, t3, { knockout: true });
    put(`## ⚔️ Semifinais\n\n${matchMd(s1, N, "1º x 4º")}\n\n${matchMd(s2, N, "2º x 3º")}`, { jogos: [liveOf(s1, "1º x 4º", true), liveOf(s2, "2º x 3º", true)] });
    const lose = (m) => (m.winner === m.A ? m.B : m.A);
    const third = play(lose(s1), lose(s2), { knockout: true });
    put(`## 🥉 Disputa de 3º lugar\n\n${matchMd(third, N)}`, { jogos: [liveOf(third, "3º lugar", true)] });
    const f = play(s1.winner, s2.winner, { knockout: true });
    put(`## 🏟️ A GRANDE FINAL\n\n${matchMd(f, N)}`, { jogos: [liveOf(f, "Final", true)] });
    put(finalSection(f.winner, lose(f), third.winner, teams, allMatches, N, ctx, `Final: ${scoreTxt(f)}`));
  } else {
    const f = play(table[0], table[1], { knockout: true });
    put(`## 🏟️ A GRANDE FINAL — 1º x 2º\n\n${matchMd(f, N)}`, { jogos: [liveOf(f, "Final", true)] });
    put(finalSection(f.winner, f.winner === f.A ? f.B : f.A, table[2] || null, teams, allMatches, N, ctx, `Final: ${scoreTxt(f)}`));
  }
  return fim();
}

const scoreTxt = (m) => `${m.A.name} ${m.gA} x ${m.gB} ${m.B.name}` + (m.pens ? ` (${m.pens.a} x ${m.pens.b} pên.)` : m.et ? " (prorr.)" : "");
function finalSection(champ, vice, third, teams, matches, N, ctx, decider) {
  const players = teams.flatMap((t) => t.players.map((p) => ({ ...p, team: t.name })));
  const top = [...players].sort((a, b) => b.goals - a.goals || b.ovr - a.ovr);
  const art = top[0];
  const conceded = new Map(teams.map((t) => [t, 0]));
  matches.forEach((m) => { conceded.set(m.A, conceded.get(m.A) + m.gB); conceded.set(m.B, conceded.get(m.B) + m.gA); });
  const games = new Map(teams.map((t) => [t, matches.filter((m) => m.A === t || m.B === t).length]));
  const bestGk = [...teams].filter((t) => t.keeper && !t.improvised).sort((a, b) => conceded.get(a) / games.get(a) - conceded.get(b) / games.get(b))[0];
  const craque = [...champ.players].sort((a, b) => b.goals * 3 + b.ovr / 10 - (a.goals * 3 + a.ovr / 10))[0];
  const big = [...matches].sort((a, b) => Math.abs(b.gA - b.gB) - Math.abs(a.gA - a.gB) || (b.gA + b.gB) - (a.gA + a.gB))[0];
  ctx.campeao = champ.id; // o capitão campeão (para o placar da Noite da Galera)
  const out = [`## 🏆 CAMPEÃO: ${champ.name.toUpperCase()}!`, ""];
  const grito = pick(BORDOES.lavada);
  out.push(`🗣️ **${N.show(champ.name)}:** "${grito}"`);
  const lw = N.line(champ.name, "vitoria", vice.name), ll = N.line(vice.name, "derrota", champ.name);
  const prT = N.perola("titulo", art.team === champ.name ? art.name : craque.name, champ.name, "na festa do título");
  const perolaTitulo = prT ? N.lastPerola : null;
  if (prT) out.push(`- ${prT}`);
  if (lw) out.push(`- 🎙️ ${lw}`);
  if (ll) out.push(`- 🎙️ ${ll}`);
  out.push("", "| Posição | Time |", "|---|---|", `| 🥇 1º | **${champ.name}** |`, `| 🥈 2º | ${vice.name} |`);
  if (third) out.push(`| 🥉 3º | ${third.name} |`);
  out.push("", `- 👟 **Artilheiro:** ${art.name} (${art.team}) — ${art.goals} gol${art.goals === 1 ? "" : "s"}`);
  const vice2 = top.slice(1, 4).filter((p) => p.goals).map((p) => `${p.name} ${p.goals}`).join(" · ");
  if (vice2) out.push(`  - Na cola: ${vice2}`);
  out.push(`- ⭐ **Craque do campeão:** ${craque.name} (${craque.goals} gol${craque.goals === 1 ? "" : "s"})`);
  if (bestGk) out.push(`- 🧤 **Melhor goleiro:** ${bestGk.keeper.name} (${bestGk.name}) — ${(conceded.get(bestGk) / games.get(bestGk)).toFixed(1)} gols sofridos por jogo`);
  if (big) out.push(`- 💥 **Maior placar:** ${big.A.name} ${big.gA} x ${big.gB} ${big.B.name}`);
  // resumo para o card do campeão
  const mine = matches.filter((m) => m.A === champ || m.B === champ);
  const rec = { v: 0, e: 0, d: 0, gp: 0, gc: 0 };
  mine.forEach((m) => { const gf = m.A === champ ? m.gA : m.gB, ga = m.A === champ ? m.gB : m.gA; rec.gp += gf; rec.gc += ga; if (m.winner === champ) rec.v++; else if (m.winner) rec.d++; else if (gf > ga) rec.v++; else if (gf < ga) rec.d++; else rec.e++; });
  ctx.summary = {
    campeao: champ.name, vice: vice.name, terceiro: third ? third.name : null, formacao: champ.formation,
    time: champ.xi.filter((x) => x.p).map((x) => ({ nome: x.p.name, vaga: x.slot, nota: x.p.ovr, rende: Math.round(x.eff), gols: x.p.goals })),
    reservas: champ.bench.map((p) => ({ nome: p.name, nota: p.ovr, gols: p.goals })),
    decisao: decider, campanha: rec, jogos: mine.length,
    artilheiro: { nome: art.name, time: art.team, gols: art.goals }, craque: { nome: craque.name, gols: craque.goals },
    grito, perola: perolaTitulo, participantes: teams.length,
  };
  return out.join("\n");
}

module.exports = { simulate, FORMATIONS, FIT };
