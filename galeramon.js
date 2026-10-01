// Galeramon — motor da batalha (roda só no servidor, ninguém consegue trapacear pelo navegador).
// Batalha 1x1 por turnos, 3 bichos para cada lado. Os dois escolhem ao mesmo tempo; depois o turno é resolvido:
// trocas primeiro, depois os golpes por prioridade e velocidade.
// dois "modos" com as mesmas regras: os bichos da galera e os Pokémon de Kanto
const DEX = { galeramon: require("./public/galeramon/dados.js"), pokemon: require("./public/galeramon/pokemon.js") };

const LEVEL_K = (2 * 50) / 5 + 2; // nível 50 para todo mundo
const MAX_TURNS = 60; // depois disso ganha quem tiver mais vida (para ninguém ficar só se curando para sempre)
const rnd = () => Math.random();

function makeMon(D, id) {
  const m = D.MONS[id];
  return { id, hp: m.hp, max: m.hp, st: { atk: 0, def: 0, spd: 0 }, uses: {} };
}
function createBattle(a, b, mode) {
  if (!DEX[mode]) mode = "galeramon";
  const D = DEX[mode];
  const side = (p) => ({ pid: p.id, name: p.name, team: D.cleanTeam(p.team).map((id) => makeMon(D, id)), active: 0, choice: null });
  return { mode, dex: D, sides: [side(a), side(b)], turn: 1, phase: "choose", winner: null, events: [] };
}
const active = (b, s) => b.sides[s].team[b.sides[s].active];
// a "espécie" que vale agora: o Ditto transformado usa tipo, atributos e golpes de quem ele copiou
const spec = (b, m) => b.dex.MONS[m.as || m.id];
const alive = (side) => side.team.some((m) => m.hp > 0);
// quem precisa escolher agora: no turno normal, os dois; na troca forçada, só quem teve o bicho derrotado
function needs(b, s) {
  if (b.winner != null) return false;
  if (b.phase === "choose") return true;
  return b.phase === "replace" && active(b, s).hp <= 0;
}
function validChoice(b, s, c) {
  const side = b.sides[s];
  if (!c || typeof c !== "object") return null;
  if (c.switch != null) {
    const i = parseInt(c.switch);
    const m = side.team[i];
    if (!m || m.hp <= 0 || i === side.active) return null;
    return { switch: i };
  }
  if (b.phase !== "choose") return null;
  const i = parseInt(c.move);
  if (!(i >= 0 && i < spec(b, active(b, s)).moves.length)) return null;
  return { move: i };
}
function autoChoice(b, s) {
  const side = b.sides[s];
  if (b.phase === "replace") return { switch: side.team.findIndex((m, i) => m.hp > 0 && i !== side.active) };
  return { move: Math.floor(rnd() * spec(b, active(b, s)).moves.length) };
}

function doSwitch(b, s, i, ev) {
  const side = b.sides[s];
  const old = active(b, s);
  old.st = { atk: 0, def: 0, spd: 0 };
  old.as = null; // sai de campo e desfaz o Transform
  old.loaf = false;
  side.active = i;
  ev.push({ t: "switch", s, i, from: old.hp > 0 ? old.id : null, id: side.team[i].id });
}
function changeStats(b, s, delta, ev) {
  const m = active(b, s);
  for (const [k, d] of Object.entries(delta)) {
    const before = m.st[k];
    m.st[k] = Math.max(-3, Math.min(3, before + d));
    ev.push({ t: "stat", s, stat: k, d: m.st[k] - before, want: d });
  }
}
function useMove(b, s, mi, ev) {
  const D = b.dex, me = active(b, s), foe = active(b, 1 - s);
  if (spec(b, me).abil === "truant") { // Truant (Slaking): age num turno, faz corpo mole no outro
    if (me.loaf) { me.loaf = false; ev.push({ t: "msg", text: `${D.MONS[me.id].n} está fazendo corpo mole…` }); return; }
    me.loaf = true;
  }
  const key = spec(b, me).moves[mi];
  let mv = D.MOVES[key];
  ev.push({ t: "use", s, id: me.id, move: mv.n, type: mv.t });
  if (mv.max) {
    me.uses[key] = (me.uses[key] || 0) + 1;
    if (me.uses[key] > mv.max) { ev.push({ t: "msg", text: "Mas cansou! Esse golpe já foi usado demais." }); return; }
  }
  if (mv.none) { ev.push({ t: "msg", text: "Mas nada aconteceu!" }); return; }
  if (mv.metronome) { // sorteia um golpe de ataque qualquer
    const opts = Object.values(D.MOVES).filter((x) => x.p > 0);
    mv = opts[Math.floor(rnd() * opts.length)];
    ev.push({ t: "msg", text: `O Metronome virou ${mv.n}!` });
  }
  if (mv.randtype) { // Hidden Power: o tipo é sorteado a cada uso
    const types = Array.isArray(mv.randtype) ? mv.randtype : Object.keys(D.TYPES).filter((t) => t !== "Normal");
    mv = { ...mv, t: types[Math.floor(rnd() * types.length)] };
    ev.push({ t: "msg", text: `O ${mv.n} saiu do tipo ${mv.t}!` });
  }
  if (mv.bellydrum) { // Belly Drum: paga metade da vida e o ataque vai ao máximo
    if (me.hp <= Math.floor(me.max / 2) || me.st.atk >= 3) { ev.push({ t: "msg", text: "Mas falhou!" }); return; }
    me.hp -= Math.floor(me.max / 2);
    ev.push({ t: "recoil", s, hp: me.hp });
    const before = me.st.atk; me.st.atk = 3;
    ev.push({ t: "stat", s, stat: "atk", d: 3 - before, want: 6 });
    return;
  }
  if (mv.counter) { // Counter / Mirror Coat: devolve o dobro do dano (físico ou especial) levado neste turno
    const h = me.hit;
    if (!h || h.turn !== b.turn || h.sp !== (mv.counter === "s") || foe.hp <= 0) { ev.push({ t: "msg", text: "Mas falhou!" }); return; }
    if (D.effect(mv.t, spec(b, foe).types) === 0) { ev.push({ t: "immune", s: 1 - s }); return; }
    if (spec(b, foe).abil === "wonderguard") { ev.push({ t: "msg", text: "O Wonder Guard bloqueou o golpe!" }); return; }
    const dmg = Math.min(foe.hp, h.dmg * 2);
    foe.hp -= dmg;
    ev.push({ t: "hit", s: 1 - s, hp: foe.hp, dmg, eff: 1, crit: false });
    if (foe.hp <= 0) ev.push({ t: "faint", s: 1 - s, id: foe.id });
    return;
  }
  if (mv.halve) { // Super Fang: tira metade da vida que o alvo tem
    if (foe.hp <= 0) { ev.push({ t: "msg", text: "Mas não tinha ninguém para acertar!" }); return; }
    if (rnd() * 100 >= mv.a) { ev.push({ t: "miss", s }); return; }
    if (D.effect(mv.t, spec(b, foe).types) === 0) { ev.push({ t: "immune", s: 1 - s }); return; }
    if (spec(b, foe).abil === "wonderguard") { ev.push({ t: "msg", text: "O Wonder Guard bloqueou o golpe!" }); return; }
    const dmg = Math.max(1, Math.floor(foe.hp / 2));
    foe.hp -= dmg;
    ev.push({ t: "hit", s: 1 - s, hp: foe.hp, dmg, eff: 1, crit: false });
    if (foe.hp <= 0) ev.push({ t: "faint", s: 1 - s, id: foe.id });
    return;
  }
  if (mv.transform) {
    if (foe.hp <= 0 || me.as) { ev.push({ t: "msg", text: "Mas não funcionou!" }); return; }
    me.as = foe.as || foe.id; me.st = { ...foe.st };
    ev.push({ t: "transform", s, into: me.as });
    return;
  }
  if (mv.p > 0 || mv.foe) {
    if (foe.hp <= 0) { ev.push({ t: "msg", text: "Mas não tinha ninguém para acertar!" }); return; }
    if (rnd() * 100 >= mv.a) { ev.push({ t: "miss", s }); return; }
  }
  if (mv.p > 0) {
    const eff = D.effect(mv.t, spec(b, foe).types);
    if (eff === 0) { ev.push({ t: "immune", s: 1 - s }); return; }
    if (spec(b, foe).abil === "wonderguard" && eff <= 1) { ev.push({ t: "msg", text: "O Wonder Guard bloqueou o golpe!" }); return; }
    const sp = mv.c === "s" && spec(b, me).sat != null; // golpe especial usa ataque/defesa especial (modo Pokémon)
    const power = mv.hpscale ? Math.max(1, Math.floor((mv.p * me.hp) / me.max)) : mv.p; // Water Spout: perde força com a vida
    const huge = !sp && spec(b, me).abil === "hugepower" ? 2 : 1; // Huge Power: ataque físico em dobro
    const A = spec(b, me)[sp ? "sat" : "atk"] * huge * D.stageMult(me.st.atk), Df = spec(b, foe)[sp ? "sdf" : "def"] * D.stageMult(foe.st.def);
    const crit = rnd() < (mv.crit ? 1 / 4 : 1 / 16);
    const stab = spec(b, me).types.includes(mv.t) ? 1.5 : 1;
    let dmg = ((LEVEL_K * power * (A / Df)) / 50 + 2) * stab * eff * (crit ? 1.5 : 1) * (0.85 + rnd() * 0.15);
    dmg = Math.max(1, Math.floor(dmg));
    dmg = Math.min(dmg, foe.hp);
    foe.hp -= dmg;
    foe.hit = { turn: b.turn, dmg, sp }; // para o Counter / Mirror Coat do alvo
    ev.push({ t: "hit", s: 1 - s, hp: foe.hp, dmg, eff, crit });
    if (mv.drain && me.hp > 0) { const h = Math.min(me.max - me.hp, Math.max(1, Math.floor(dmg * mv.drain))); if (h > 0) { me.hp += h; ev.push({ t: "heal", s, hp: me.hp, why: "drain" }); } }
    if (mv.recoil) { const r = Math.min(me.hp, Math.max(1, Math.floor(dmg * mv.recoil))); me.hp -= r; ev.push({ t: "recoil", s, hp: me.hp }); }
    if (foe.hp <= 0) ev.push({ t: "faint", s: 1 - s, id: foe.id });
    if (me.hp <= 0) ev.push({ t: "faint", s, id: me.id });
    if (mv.foe && foe.hp > 0 && rnd() * 100 < (mv.chance ?? 100)) changeStats(b, 1 - s, mv.foe, ev);
  } else if (mv.foe) changeStats(b, 1 - s, mv.foe, ev);
  if (mv.self && me.hp > 0) changeStats(b, s, mv.self, ev);
  if (mv.heal && me.hp > 0) {
    const h = Math.min(me.max - me.hp, Math.floor(me.max * mv.heal));
    if (h > 0) { me.hp += h; ev.push({ t: "heal", s, hp: me.hp }); } else ev.push({ t: "msg", text: "Mas a vida já estava cheia!" });
  }
}

// resolve o turno quando todo mundo que precisava já escolheu. Devolve a lista de acontecimentos.
function resolve(b) {
  const D = b.dex, ev = [];
  const acts = [0, 1].filter((s) => needs(b, s)).map((s) => ({ s, ...b.sides[s].choice }));
  b.sides.forEach((x) => (x.choice = null));
  for (const a of acts) if (a.switch != null) doSwitch(b, a.s, a.switch, ev);
  if (b.phase === "choose") {
    const spd = (s) => spec(b, active(b, s)).spd * D.stageMult(active(b, s).st.spd);
    const order = acts.filter((a) => a.move != null).map((a) => ({ ...a, pri: D.MOVES[spec(b, active(b, a.s)).moves[a.move]].pri || 0, sp: spd(a.s), r: rnd() }));
    order.sort((x, y) => y.pri - x.pri || y.sp - x.sp || x.r - y.r);
    for (const a of order) {
      if (active(b, a.s).hp <= 0) continue;
      useMove(b, a.s, a.move, ev);
    }
  }
  // fim de jogo?
  const out = [0, 1].filter((s) => !alive(b.sides[s]));
  if (!out.length && b.phase === "choose" && b.turn >= MAX_TURNS) { // tempo esgotado: quem tem mais vida (em %) ganha
    const pct = (s) => b.sides[s].team.reduce((a, m) => a + m.hp / m.max, 0);
    ev.push({ t: "msg", text: `Chegou no turno ${MAX_TURNS}! Ganha quem tem mais vida.` });
    out.push(pct(0) < pct(1) ? 0 : pct(1) < pct(0) ? 1 : 0, ...(pct(0) === pct(1) ? [1] : []));
  }
  if (out.length) {
    b.winner = out.length === 2 ? -1 : 1 - out[0];
    b.phase = "over";
    ev.push({ t: "end", winner: b.winner });
  } else if ([0, 1].some((s) => active(b, s).hp <= 0)) b.phase = "replace";
  else { b.phase = "choose"; b.turn++; }
  b.events = ev;
  return ev;
}

function forfeit(b, s) {
  b.winner = 1 - s; b.phase = "over";
  b.events = [{ t: "forfeit", s }, { t: "end", winner: b.winner }];
}

// o que cada lado recebe (o time do adversário aparece inteiro, com vida)
function view(b, s) {
  return {
    me: s, mode: b.mode, turn: b.turn, phase: b.phase, winner: b.winner,
    need: needs(b, s), chosen: !!b.sides[s].choice,
    sides: b.sides.map((x) => ({ name: x.name, active: x.active, team: x.team.map((m) => ({ id: m.id, as: m.as || null, hp: m.hp, max: m.max, st: m.st, uses: m.uses })) })),
  };
}

module.exports = { createBattle, needs, validChoice, autoChoice, resolve, forfeit, view };
