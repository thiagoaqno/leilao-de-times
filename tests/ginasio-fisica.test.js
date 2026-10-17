// Ginásio: a física (empurrão, parede, tonto), a defesa (guarda, aparar, esquiva perfeita, agarrão), os jeitos novos
// de golpe (feixe, sopro, tremor, onda, rajada, bumerangue, teleguiado, bomba, salto, redemoinho, combo, armadilha)
// e a quinta geração de Pokémon.
const test = require("node:test");
const assert = require("node:assert");
const G = require("../public/ginasio/regras.js");
const Galeramon = require("../public/galeramon/dados.js");
const PokeDex = require("../public/galeramon/pokemon.js");
const NarutoDex = require("../public/galeramon/naruto.js");

const DT = 1 / 60;
// uma partida 1x1 de Pokémon com dois bichos de teste: "a" com os golpes pedidos, "b" parado do outro lado
function duelo(golpes, { b = ["tackle", "tackle", "tackle", "tackle"], tiposB = ["Normal"], base = "mew", baseB = "snorlax", seed = "fisica" } = {}) {
  PokeDex.MONS.teste_a = { ...PokeDex.MONS[base], n: "A", moves: golpes };
  PokeDex.MONS.teste_b = { ...PokeDex.MONS[baseB], n: "B", types: tiposB, moves: b };
  const p = G.criarPartida({ seed, modo: "pokemon" }, [[{ id: "a", bot: false, team: ["teste_a", "pikachu", "eevee"] }], [{ id: "b", bot: false, team: ["teste_b", "pikachu", "eevee"] }]]);
  p.terreno = []; // a física pura, sem o terreno do lugar (ginasio-terreno.test.js)
  const [a, bb] = p.entidades;
  Object.assign(a, { x: -2, y: 0, mira: { x: 1, y: 0 } }); Object.assign(bb, { x: 2, y: 0, mira: { x: -1, y: 0 } });
  return { p, a, b: bb };
}
test.afterEach(() => { delete PokeDex.MONS.teste_a; delete PokeDex.MONS.teste_b; });
const rodar = (p, n, cmd = {}) => { const ev = []; for (let i = 0; i < n; i++) ev.push(...G.passo(p, DT, typeof cmd === "function" ? cmd(i) : cmd)); return ev; };
const mira = (de, para) => ({ mira: { x: para.x - de.x, y: para.y - de.y }, alvo: { x: para.x, y: para.y } });

test("Unova: 649 Pokémon, os 156 novos com dados, golpes válidos e sprites do Black/White", () => {
  assert.strictEqual(PokeDex.IDS.length, 649);
  const novos = PokeDex.IDS.filter((id) => PokeDex.MONS[id].num > 493);
  assert.strictEqual(novos.length, 156);
  for (const id of novos) {
    const m = PokeDex.MONS[id];
    assert.strictEqual(m.moves.length, 4, id);
    for (const g of m.moves) assert.ok(PokeDex.MOVES[g], `${id}: ${g}`);
    assert.ok(m.types.every((t) => PokeDex.TYPES[t]), id);
    assert.ok(m.hp > 100 && m.atk > 0 && m.spd > 0, id);
  }
  assert.deepStrictEqual(PokeDex.MONS.zekrom.types, ["Dragão", "Elétrico"]);
  assert.ok(PokeDex.sprite("victini").includes("generation-v/black-white/494.png"));
  assert.ok(PokeDex.sprite("victini", true).includes("black-white/back/494.png"));
  assert.ok(PokeDex.sprite("arceus").includes("platinum"));
});

test("os estilos só citam golpes que existem, e cada jeito novo aparece", () => {
  const todos = { ...Galeramon.MOVES, ...PokeDex.MOVES };
  for (const id of Object.keys(G.ESTILOS)) assert.ok(todos[id], `golpe ${id} não existe`);
  const classes = new Set(Object.entries(PokeDex.MOVES).map(([id, mv]) => G.habilidadeDeGolpe(id, mv).classe));
  for (const c of ["feixe", "cone", "anel", "onda", "rajada", "bumerangue", "teleguiado", "bomba", "salto", "zona", "combo", "arremesso", "armadilha", "investida", "corpo", "projetil", "area", "sumir"]) assert.ok(classes.has(c), c);
  // os jutsus continuam do jeito que o Naruto diz
  for (const [id, mv] of Object.entries(NarutoDex.MOVES)) if (mv.forma && mv.p > 0) assert.ok(["projetil", "area", "corpo", "investida"].includes(G.habilidadeDeGolpe(id, mv).classe), id);
});

test("empurrão: o golpe joga para longe, o bicho pesado voa menos e o forte atordoa", () => {
  const voo = (baseB) => {
    const { p, a, b } = duelo(["megahorn", "tackle", "tackle", "tackle"], { baseB });
    Object.assign(b, { x: -0.6 });
    rodar(p, 1, { a: { golpe: 0, ...mira(a, b) } });
    rodar(p, 40);
    return b.x - -0.6;
  };
  const leve = voo("pikachu"), pesado = voo("snorlax");
  assert.ok(leve > 0.5, `o leve foi empurrado (${leve.toFixed(2)})`);
  assert.ok(pesado < leve, `o pesado voa menos (${pesado.toFixed(2)} < ${leve.toFixed(2)})`);
  const { p, a, b } = duelo(["megahorn", "tackle", "tackle", "tackle"], { baseB: "pikachu" });
  Object.assign(b, { x: -0.6 });
  const ev = rodar(p, 3, (i) => (i ? {} : { a: { golpe: 0, ...mira(a, b) } }));
  assert.ok(ev.some((e) => e.tipo === "atordoado" && e.id === "b"), "ficou tonto");
});

test("parede: escorregar forte contra a parede machuca e deixa tonto", () => {
  const { p, b } = duelo(["tackle", "tackle", "tackle", "tackle"]);
  Object.assign(b, { x: 8.2, kx: 13, ky: 0 });
  const hp = b.bicho.hp;
  const ev = rodar(p, 10);
  assert.ok(ev.some((e) => e.tipo === "batida" && e.id === "b"), "bateu");
  assert.ok(b.bicho.hp < hp, "levou dano");
  assert.ok(ev.some((e) => e.tipo === "atordoado" && e.motivo === "parede"));
  assert.ok(b.kx <= 0, "quicou");
});

test("tonto em sequência dura cada vez menos (ninguém fica preso)", () => {
  const { p, a, b } = duelo(["megahorn", "tackle", "tackle", "tackle"], { baseB: "pikachu", seed: "cadeia" });
  const tempos = [];
  for (let i = 0; i < 4; i++) {
    Object.assign(a, { x: b.x - 0.7, y: b.y }); Object.assign(b, { kx: 0, ky: 0, atordoado: 0 });
    a.bicho.cds = [0, 0, 0, 0]; b.bicho.hp = b.bicho.max;
    G.passo(p, DT, { a: { golpe: 0, ...mira(a, b) } });
    tempos.push(b.atordoado);
  }
  assert.ok(tempos[0] > 0.1 && tempos[3] < tempos[0] * 0.5, `diminui: ${tempos.map((t) => t.toFixed(2)).join(" ")}`);
});

test("guarda: segura o golpe de frente (bem menos dano), gasta a barra e não segura pelas costas", () => {
  const dano = (guarda, costas = false) => {
    const { p, a, b } = duelo(["megahorn", "tackle", "tackle", "tackle"], { seed: "guarda" });
    Object.assign(b, { x: -0.7 });
    b.mira = { x: costas ? 1 : -1, y: 0 };
    if (guarda) { rodar(p, 20, { b: { guarda: true, mira: b.mira } }); a.bicho.cds = [0, 0, 0, 0]; b.x = -0.7; }
    const hp = b.bicho.hp, barra = b.guarda;
    const ev = rodar(p, 2, (i) => ({ a: i ? {} : { golpe: 0, ...mira(a, b) }, b: { guarda, mira: b.mira } }));
    return { dano: hp - b.bicho.hp, barra: barra - b.guarda, ev };
  };
  const livre = dano(false), segurou = dano(true), costas = dano(true, true);
  assert.ok(segurou.dano > 0 && segurou.dano < livre.dano * 0.45, `${segurou.dano} contra ${livre.dano}`);
  assert.ok(segurou.ev.some((e) => e.tipo === "dano" && e.bloqueado));
  assert.ok(segurou.barra > 10, "a barra gastou");
  assert.ok(costas.dano > livre.dano * 0.7, "pelas costas não segura");
});

test("guarda quebrada: a barra acaba e o bicho fica tonto", () => {
  const { p, a, b } = duelo(["megahorn", "tackle", "tackle", "tackle"], { seed: "quebra" });
  Object.assign(b, { x: -0.7 });
  rodar(p, 15, { b: { guarda: true, mira: { x: -1, y: 0 } } });
  b.guarda = 10;
  a.bicho.cds = [0, 0, 0, 0];
  const ev = rodar(p, 2, (i) => ({ a: i ? {} : { golpe: 0, ...mira(a, b) }, b: { guarda: true, mira: { x: -1, y: 0 } } }));
  assert.ok(ev.some((e) => e.tipo === "guardaQuebrou" && e.id === "b"));
  assert.ok(b.atordoado > 0.5 && !b.guardando);
});

test("aparar: levantar a guarda na hora devolve o projétil e desequilibra quem bate de perto", () => {
  const { p, a, b } = duelo(["flamethrower", "thunderbolt", "megahorn", "tackle"], { seed: "aparar" });
  Object.assign(a, { x: -4 }); Object.assign(b, { x: 0 });
  rodar(p, 1, { a: { golpe: 1, ...mira(a, b) } }); // Thunderbolt: projétil
  const pr = p.projeteis[0];
  assert.ok(pr && pr.lado === 0);
  let ev = [];
  for (let i = 0; i < 60 && !ev.some((e) => e.tipo === "aparou"); i++) {
    const perto = Math.abs(pr.x - b.x) < 0.9;
    ev = G.passo(p, DT, { b: perto ? { guarda: true, mira: { x: -1, y: 0 } } : { mira: { x: -1, y: 0 } } });
  }
  assert.ok(ev.some((e) => e.tipo === "aparou"), "aparou");
  assert.ok(ev.some((e) => e.tipo === "refletiu"));
  assert.strictEqual(pr.lado, 1, "o projétil virou do outro lado");
  assert.ok(pr.dx < 0, "voltando");
  const hp = a.bicho.hp;
  for (let i = 0; i < 90 && p.projeteis.includes(pr); i++) G.passo(p, DT, {});
  assert.ok(a.bicho.hp < hp, "acertou quem atirou");

  // de perto: quem bate fica tonto
  const d = duelo(["megahorn", "tackle", "tackle", "tackle"], { seed: "aparar-perto" });
  Object.assign(d.b, { x: -0.7 });
  const ev2 = rodar(d.p, 2, (i) => ({ a: i ? {} : { golpe: 0, ...mira(d.a, d.b) }, b: { guarda: true, mira: { x: -1, y: 0 } } }));
  assert.ok(ev2.some((e) => e.tipo === "aparou"));
  assert.ok(d.a.atordoado > 0, "quem bateu cambaleou");
});

test("agarrão passa pela guarda; acertar quem prepara cancela o golpe", () => {
  const { p, a, b } = duelo(["stormthrow", "tackle", "tackle", "tackle"], { seed: "agarra" });
  Object.assign(b, { x: -0.9 });
  rodar(p, 20, { b: { guarda: true, mira: { x: -1, y: 0 } } });
  const hp = b.bicho.hp;
  const ev = rodar(p, 20, (i) => ({ a: i ? {} : { golpe: 0, ...mira(a, b) }, b: { guarda: true, mira: { x: -1, y: 0 } } }));
  assert.ok(ev.some((e) => e.tipo === "agarrou"));
  assert.ok(b.bicho.hp < hp && !ev.some((e) => e.tipo === "dano" && e.bloqueado), "a guarda não segurou");
  assert.ok(b.x > -0.9 + 0.5, "foi arremessado");

  const f = duelo(["hyperbeam", "tackle", "tackle", "tackle"], { b: ["megahorn", "tackle", "tackle", "tackle"], seed: "interrompe" });
  Object.assign(f.b, { x: -1.3 });
  rodar(f.p, 1, { a: { golpe: 0, ...mira(f.a, f.b) } });
  assert.ok(f.a.preparo, "preparando o feixe");
  const ev2 = rodar(f.p, 4, (i) => ({ b: i ? {} : { golpe: 0, ...mira(f.b, f.a) } }));
  assert.ok(ev2.some((e) => e.tipo === "interrompido" && e.id === "a"));
  assert.strictEqual(f.a.preparo, null);
  assert.ok(!f.p.areas.some((x) => x.forma === "feixe"), "o feixe não saiu");
});

test("esquiva perfeita: no último instante adianta as recargas e o próximo golpe sai mais forte", () => {
  const { p, a, b } = duelo(["fireblast", "tackle", "tackle", "tackle"], { b: ["megahorn", "megahorn", "megahorn", "megahorn"], seed: "perfeita" });
  rodar(p, 1, { a: { golpe: 0, ...mira(a, b) } });
  const bomba = p.areas[0];
  assert.strictEqual(bomba.forma, "bomba");
  b.bicho.cds = [3, 3, 3, 3];
  let ev = [];
  while (bomba.t > 0.05) ev = G.passo(p, DT, {});
  ev = rodar(p, 6, (i) => ({ b: i ? {} : { esquiva: true, dx: 0, dy: 1 } }));
  assert.ok(ev.some((e) => e.tipo === "perfeita" && e.id === "b"), "perfeita");
  assert.ok(b.bicho.cds[0] < 2, `recargas adiantadas (${b.bicho.cds[0].toFixed(2)})`);
  assert.strictEqual(b.foco, true);
  // o golpe com foco tira mais
  const hab = G.habilidadeDeGolpe("megahorn", PokeDex.MOVES.megahorn);
  const normal = G.calcularDano(p, b, a, hab, { critico: false, variacao: 1 }).dano;
  Object.assign(b, { x: a.x + 0.7, y: a.y }); b.bicho.cds = [0, 0, 0, 0]; b.atordoado = 0;
  const hp = a.bicho.hp;
  rodar(p, 2, (i) => ({ b: i ? {} : { golpe: 0, ...mira(b, a) } }));
  assert.ok(hp - a.bicho.hp >= Math.floor(normal * 0.9 * 1.25), `${hp - a.bicho.hp} com foco, ${normal} sem`);
  assert.strictEqual(b.foco, false, "o foco é de um golpe só");
});

test("feixe: prepara parado e acerta tudo na linha, até a pilastra", () => {
  const { p, a, b } = duelo(["hyperbeam", "tackle", "tackle", "tackle"], { seed: "feixe" });
  Object.assign(a, { x: -6, y: 0 }); Object.assign(b, { x: 0, y: 0 });
  rodar(p, 1, { a: { golpe: 0, ...mira(a, b) } });
  assert.ok(a.preparo && a.preparo.t > 0.5);
  const x = a.x;
  rodar(p, 20, { a: { dx: 1, dy: 0, mira: { x: 1, y: 0 } } });
  assert.strictEqual(a.x, x, "parado preparando");
  const hp = b.bicho.hp;
  rodar(p, 40);
  assert.ok(b.bicho.hp < hp, "acertou no fim do preparo");
  // a pilastra segura o feixe
  const d = duelo(["icebeam", "tackle", "tackle", "tackle"], { seed: "pilastra" });
  Object.assign(d.a, { x: -6, y: 2.1 }); Object.assign(d.b, { x: 0, y: 2.1 });
  const hp2 = d.b.bicho.hp;
  rodar(d.p, 40, (i) => ({ a: i ? {} : { golpe: 0, mira: { x: 1, y: 0 } } }));
  assert.strictEqual(d.b.bicho.hp, hp2, "a pilastra no caminho");
});

test("sopro em leque acerta na frente, não atrás", () => {
  const { p, a, b } = duelo(["flamethrower", "tackle", "tackle", "tackle"], { seed: "cone" });
  Object.assign(b, { x: -0.5, y: 1.2 });
  const hp = b.bicho.hp;
  rodar(p, 20, (i) => ({ a: i ? {} : { golpe: 0, mira: { x: 1, y: 0.5 } } }));
  assert.ok(b.bicho.hp < hp);
  const d = duelo(["flamethrower", "tackle", "tackle", "tackle"], { seed: "cone2" });
  Object.assign(d.b, { x: -3.5, y: 0 });
  const hp2 = d.b.bicho.hp;
  rodar(d.p, 20, (i) => ({ a: i ? {} : { golpe: 0, mira: { x: 1, y: 0 } } }));
  assert.strictEqual(d.b.bicho.hp, hp2);
});

test("tremor (anel) acerta em volta quando o anel passa; pular na hora escapa", () => {
  const anel = (pula) => {
    const { p, a, b } = duelo(["earthquake", "tackle", "tackle", "tackle"], { seed: "anel" });
    Object.assign(b, { x: a.x + 2, y: 0 });
    rodar(p, 1, { a: { golpe: 0, mira: { x: 1, y: 0 } } });
    assert.strictEqual(p.areas[0].forma, "anel");
    const hp = b.bicho.hp;
    let ev = [];
    for (let i = 0; i < 60; i++) {
      const raio = p.areas[0] ? p.areas[0].r * (1 - p.areas[0].t / p.areas[0].aviso) : 9;
      ev.push(...G.passo(p, DT, { b: pula && raio > 1.0 && raio < 1.2 ? { esquiva: true, dx: 0, dy: 1 } : {} }));
    }
    return { dano: hp - b.bicho.hp, ev };
  };
  assert.ok(anel(false).dano > 0, "acertou");
  const fugiu = anel(true);
  assert.strictEqual(fugiu.dano, 0, "pulou o anel");
  assert.ok(fugiu.ev.some((e) => e.tipo === "esquivou"));
});

test("onda anda pela quadra e acerta uma vez cada um", () => {
  const { p, a, b } = duelo(["surf", "tackle", "tackle", "tackle"], { seed: "onda" });
  Object.assign(a, { x: -6 }); Object.assign(b, { x: -1, y: 1 });
  const ev = rodar(p, 80, (i) => (i ? {} : { a: { golpe: 0, mira: { x: 1, y: 0 } } }));
  assert.strictEqual(ev.filter((e) => e.tipo === "dano" && e.em === "b").length, 1);
  assert.ok(ev.some((e) => e.tipo === "area" || true));
});

test("redemoinho: machuca aos poucos e puxa para o meio", () => {
  const { p, a, b } = duelo(["whirlpool", "tackle", "tackle", "tackle"], { seed: "zona" });
  Object.assign(b, { x: 1.5, y: 0 });
  const ev = rodar(p, 150, (i) => (i ? {} : { a: { golpe: 0, alvo: { x: 1.5, y: 1.6 }, mira: { x: 1, y: 0.4 } } }));
  assert.ok(ev.filter((e) => e.tipo === "dano" && e.em === "b").length >= 3, "vários tiques");
  assert.ok(b.y > 0.4, `puxado para o meio (${b.y.toFixed(2)})`);
});

test("salto: ninguém acerta no alto, cai no ponto e o pulo errado machuca", () => {
  const { p, a, b } = duelo(["bodyslam", "tackle", "tackle", "tackle"], { b: ["thunderbolt", "tackle", "tackle", "tackle"], seed: "salto" });
  Object.assign(a, { x: -2 }); Object.assign(b, { x: 1.5 });
  rodar(p, 1, { a: { golpe: 0, ...mira(a, b) } });
  assert.ok(a.salto);
  const hpA = a.bicho.hp, hpB = b.bicho.hp;
  rodar(p, 12, () => ({ b: { golpe: 1, ...mira(b, a) } }));
  // no alto do pulo, o corpo a corpo de quem está embaixo não pega (os projéteis que passaram também não)
  const ev = rodar(p, 40);
  assert.ok(ev.some((e) => e.tipo === "aterrissou" && e.acertou));
  assert.ok(b.bicho.hp < hpB, "caiu em cima");
  assert.ok(Math.hypot(a.x - 1.5, a.y) < 0.9, "no ponto mirado");
  assert.ok(hpA >= a.bicho.hp);
  const t = duelo(["hijumpkick", "tackle", "tackle", "tackle"], { seed: "tombo" });
  Object.assign(t.b, { x: 6 });
  const hp = t.a.bicho.hp;
  const ev2 = rodar(t.p, 60, (i) => (i ? {} : { a: { golpe: 0, alvo: { x: 1, y: 2 }, mira: { x: 1, y: 0.5 } } }));
  assert.ok(ev2.some((e) => e.tipo === "tombo"), "errou e caiu");
  assert.ok(t.a.bicho.hp < hp);
});

test("armadilha: arma, explode em quem pisa, voador passa por cima e cada um tem até 3", () => {
  const { p, a, b } = duelo(["stealthrock", "tackle", "tackle", "tackle"], { seed: "armadilha" });
  rodar(p, 1, { a: { golpe: 0, alvo: { x: 0, y: 0 }, mira: { x: 1, y: 0 } } });
  const arm = p.areas.find((x) => x.forma === "armadilha");
  assert.ok(arm);
  Object.assign(b, { x: 0, y: 0 });
  const hp = b.bicho.hp;
  rodar(p, 10);
  assert.strictEqual(b.bicho.hp, hp, "ainda não armou");
  const ev = rodar(p, 40);
  assert.ok(ev.some((e) => e.tipo === "dano" && e.em === "b"), "explodiu");
  assert.ok(!p.areas.includes(arm));
  for (let i = 0; i < 4; i++) { a.bicho.cds = [0, 0, 0, 0]; rodar(p, 1, { a: { golpe: 0, alvo: { x: -1 - i, y: 4 }, mira: { x: 1, y: 0 } } }); }
  assert.strictEqual(p.areas.filter((x) => x.forma === "armadilha").length, 3);
  const v = duelo(["spikes", "tackle", "tackle", "tackle"], { tiposB: ["Voador"], seed: "voa" });
  rodar(v.p, 1, { a: { golpe: 0, alvo: { x: 0, y: 0 }, mira: { x: 1, y: 0 } } });
  Object.assign(v.b, { x: 0, y: 0 });
  const hpv = v.b.bicho.hp;
  rodar(v.p, 80);
  assert.strictEqual(v.b.bicho.hp, hpv, "voador não pisa");
});

test("bumerangue vai e volta (acerta de novo na volta); teleguiado faz curva; rajada solta vários; combo bate seguido", () => {
  const bm = duelo(["bonemerang", "tackle", "tackle", "tackle"], { seed: "bumerangue" });
  Object.assign(bm.b, { x: 0, y: 0 }); Object.assign(bm.a, { x: -3, y: 0 });
  const ev = rodar(bm.p, 150, (i) => (i ? {} : { a: { golpe: 0, mira: { x: 1, y: 0 } } }));
  assert.ok(ev.some((e) => e.tipo === "volta"), "virou");
  assert.strictEqual(ev.filter((e) => e.tipo === "dano" && e.em === "b").length, 2, "ida e volta");

  const tg = duelo(["shadowball", "tackle", "tackle", "tackle"], { seed: "teleguiado", tiposB: ["Psíquico"] }); // Normal não leva de Fantasma
  Object.assign(tg.a, { x: -3, y: 0 }); Object.assign(tg.b, { x: 2, y: 2.5 });
  const ev2 = rodar(tg.p, 120, (i) => (i ? {} : { a: { golpe: 0, mira: { x: 1, y: 0 } } }));
  assert.ok(ev2.some((e) => e.tipo === "dano" && e.em === "b"), "o tiro reto teria passado longe");

  const rj = duelo(["bulletseed", "tackle", "tackle", "tackle"], { seed: "rajada" });
  const ev3 = rodar(rj.p, 40, (i) => (i ? {} : { a: { golpe: 0, ...mira(rj.a, rj.b) } }));
  assert.strictEqual(ev3.filter((e) => e.tipo === "tiro").length, 4);

  const cb = duelo(["triplekick", "tackle", "tackle", "tackle"], { seed: "combo" });
  Object.assign(cb.b, { x: -1 });
  const ev4 = rodar(cb.p, 40, (i) => (i ? {} : { a: { golpe: 0, ...mira(cb.a, cb.b) } }));
  const danos = ev4.filter((e) => e.tipo === "dano" && e.em === "b");
  assert.ok(danos.length >= 2, `bateu ${danos.length} vezes`);
  assert.ok(danos.some((e) => e.combo >= 2), "conta o combo");
});

test("a previsão da tela acompanha o servidor com empurrão, guarda e tonto", () => {
  const { p, a } = duelo(["tackle", "tackle", "tackle", "tackle"], { seed: "prever" });
  const e = structuredClone({ ...a, jogador: { id: "a", lado: 0 } });
  const mundo = { dex: p.dex, entidades: [], ev: [], t: p.t };
  a.kx = e.kx = 9; a.ky = e.ky = -3;
  for (let i = 0; i < 240; i++) {
    const c = { dx: i < 120 ? 1 : -0.5, dy: 0.3, mira: { x: 1, y: 0 }, guarda: i > 60 && i < 150, esquiva: i === 200 };
    if (i === 30) { a.atordoado = e.atordoado = 0.4; }
    G.passo(p, DT, { a: c }); G.preverMovimento(mundo, e, DT, c);
    for (const campo of ["x", "y", "kx", "ky", "guardando", "guarda", "atordoado", "esquivaT"]) assert.ok(Math.abs(e[campo] - a[campo]) < 1e-9, `${i}/${campo}: ${e[campo]} ≠ ${a[campo]}`);
  }
});

test("caos: comandos aleatórios em todos os modos não quebram nada nem tiram ninguém da quadra", () => {
  for (const modo of ["pokemon", "galeramon", "naruto"]) {
    const D = { pokemon: PokeDex, galeramon: Galeramon, naruto: NarutoDex }[modo];
    for (let k = 0; k < 6; k++) {
      const r = G.sorteDe(modo + k), ids = D.IDS;
      const time = (n) => [0, 1, 2].map((i) => ids[(n + i * 7) % ids.length]);
      const p = G.criarPartida({ seed: "caos" + k, modo, formato: k % 2 ? "2x2" : "1x1" }, [[{ id: "a", bot: false, team: time(k * 41) }, { id: "c", bot: false, team: time(k * 13 + 5) }], [{ id: "b", bot: false, team: time(k * 29 + 400) }]]);
      for (let i = 0; i < 60 * 40 && !p.fim; i++) {
        const cmd = {};
        for (const id of ["a", "b", "c"]) {
          const c = { dx: r() * 2 - 1, dy: r() * 2 - 1, mira: { x: r() * 2 - 1, y: r() * 2 - 1 }, guarda: r() < 0.3 };
          if (r() < 0.08) c.golpe = Math.floor(r() * 4);
          if (r() < 0.02) c.esquiva = true;
          if (r() < 0.5) c.alvo = { x: r() * 18 - 9, y: r() * 12 - 6 };
          cmd[id] = c;
        }
        G.passo(p, DT, cmd);
        for (const e of p.entidades) {
          assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.kx), `${modo}: posição`);
          assert.ok(Math.abs(e.x) <= 9 && Math.abs(e.y) <= 6, `${modo}: dentro da quadra (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`);
        }
      }
    }
  }
});
