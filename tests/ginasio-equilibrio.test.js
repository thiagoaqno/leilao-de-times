// Ginásio: o equilíbrio (regras.js). A velocidade de cada Pokémon espalhada (VEL_MIN a VEL_MAX), andar de ré mais
// devagar (RE), o bote dos golpes de perto (BOTE_MAX, firme durante o bote e o combo) e o robô em três dificuldades
// (PERFIL_ROBO). No fim, duelos medidos: o de perto contra quem recua atirando e quem recua atirando contra o robô.
const test = require("node:test");
const assert = require("node:assert");
const G = require("../public/ginasio/regras.js");
const PokeDex = require("../public/galeramon/pokemon.js");

const DT = 1 / 60;
const cls = (m) => G.habilidadeDeGolpe(m, PokeDex.MOVES[m]).classe;
const MOVES = Object.keys(PokeDex.MOVES).filter((m) => PokeDex.MOVES[m].p >= 60 && PokeDex.MOVES[m].p <= 90);
const PERTO = MOVES.filter((m) => cls(m) === "corpo").slice(0, 4), LONGE = MOVES.filter((m) => cls(m) === "projetil").slice(0, 4);
// três clones de cada (o time não aceita repetido e só aceita quem está na Pokédex)
const CLONES = [1, 2, 3].flatMap((k) => [`t_perto${k}`, `t_longe${k}`]);
test.before(() => {
  for (const id of CLONES) { PokeDex.MONS[id] = { ...PokeDex.MONS.lucario, n: id, moves: id.startsWith("t_perto") ? PERTO : LONGE }; PokeDex.IDS.push(id); }
});
test.after(() => { for (const id of CLONES) { delete PokeDex.MONS[id]; PokeDex.IDS.splice(PokeDex.IDS.indexOf(id), 1); } });
const T = (id) => [`${id}1`, `${id}2`, `${id}3`];
// um time válido com o Pokémon pedido na frente
const com = (id) => [id, ...["eevee", "snorlax", "pikachu"].filter((x) => x !== id)].slice(0, 3);

function partida(timeA, timeB, extra = {}, botA = false, botB = false) {
  const p = G.criarPartida({ modo: "pokemon", seed: extra.seed || "eq", ...extra }, [[{ id: "a", bot: botA, time: timeA }], [{ id: "b", bot: botB, time: timeB }]]);
  p.terreno = [];
  return { p, a: p.entidades[0], b: p.entidades[1] };
}
const alvoDe = (p, e) => p.entidades.find((o) => o.lado !== e.lado && o.campo);
function perseguidor(p, e) {
  const a = alvoDe(p, e); if (!a) return {};
  const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy), c = { dx: dx / d, dy: dy / d, mira: { x: dx, y: dy } };
  const i = e.bicho.cds.findIndex((x) => x <= 0); if (i >= 0 && d < 3.2) c.golpe = i;
  if (d > 3.5 && e.esquivaCd <= 0) c.esquiva = true; // rola para a frente para encurtar (como quem joga)
  return c;
}
function recuador(p, e) {
  const a = alvoDe(p, e); if (!a) return {};
  const dx = a.x - e.x, dy = a.y - e.y, d = Math.hypot(dx, dy);
  let mx = -dx / d, my = -dy / d;
  if (Math.abs(e.x) > 7.6 || Math.abs(e.y) > 4.8) { mx = -dy / d; my = dx / d; }
  const c = { dx: d < 6 ? mx : 0, dy: d < 6 ? my : 0, mira: { x: dx, y: dy } };
  const i = e.bicho.cds.findIndex((x) => x <= 0); if (i >= 0) c.golpe = i;
  return c;
}
function duelo(timeA, timeB, polA, polB, config, seed) {
  const { p } = partida(timeA, timeB, { ...config, seed }, !polA, !polB);
  for (let i = 0; i < 240 * 60 && !p.fim; i++) {
    const c = {}; if (polA) c.a = { seq: i, ...polA(p, p.entidades[0]) }; if (polB) c.b = { seq: i, ...polB(p, p.entidades[1]) };
    G.passo(p, DT, c);
  }
  return p.vencedor === 0 ? 1 : p.empate ? 0.5 : 0;
}
const taxa = (n, f) => { let v = 0; for (let k = 0; k < n; k++) v += f(k); return v / n; };

test("velocidade: espalhada pelo atributo, do Shuckle ao Ninjask", () => {
  const vel = (id) => { const { p, a } = partida(com(id), com("pikachu")); return G.velocidade(p, a); };
  assert.ok(Math.abs(vel("shuckle") - G.VEL_MIN) < 0.05);
  assert.ok(Math.abs(vel("ninjask") - G.VEL_MAX) < 0.2);
  assert.ok(vel("snorlax") < 2.8 && vel("pikachu") > 3.7 && vel("jolteon") > 4.4);
  assert.ok(vel("ninjask") / vel("snorlax") > 1.8, "um é quase o dobro do outro");
});

test("ré: de frente 100%, de lado 90%, de ré 60%; a previsão da tela anda igual", () => {
  const m = { x: 1, y: 0 };
  assert.strictEqual(G.fatorDaRe({ x: 1, y: 0 }, m), 1);
  assert.ok(Math.abs(G.fatorDaRe({ x: 0, y: 1 }, m) - 0.9) < 1e-9);
  assert.ok(Math.abs(G.fatorDaRe({ x: -1, y: 0 }, m) - G.RE) < 1e-9);
  const anda = (dx) => { const { p, a } = partida(com("pikachu"), com("pikachu")); Object.assign(a, { x: 0, y: 0 }); for (let i = 0; i < 30; i++) G.passo(p, DT, { a: { seq: i, dx, dy: 0, mira: { x: 1, y: 0 } } }); return Math.abs(a.x); };
  assert.ok(Math.abs(anda(-1) / anda(1) - G.RE) < 0.02);
  const { p, a } = partida(com("pikachu"), com("pikachu"));
  Object.assign(a, { x: 0, y: 0 });
  const e = structuredClone(a), mundo = { dex: p.dex, entidades: [], ev: [], terreno: [] };
  for (let i = 0; i < 90; i++) { const c = { seq: i, dx: Math.cos(i / 9), dy: Math.sin(i / 7), mira: { x: 1, y: 0.3 } }; G.passo(p, DT, { a: c }); G.preverMovimento(mundo, e, DT, c); }
  assert.ok(Math.hypot(e.x - a.x, e.y - a.y) < 1e-6);
});

test("bote: o golpe de perto avança até o alvo, acerta e fica firme no caminho", () => {
  const { p, a, b } = partida(T("t_perto"), T("t_longe"));
  Object.assign(a, { x: -1.5, y: 0, mira: { x: 1, y: 0 } }); Object.assign(b, { x: 1, y: 0.2 });
  const ev = [...G.passo(p, DT, { a: { seq: 0, golpe: 0, dx: 0, dy: 0, mira: { x: 1, y: 0 } } })];
  assert.ok(a.bote && ev.some((e) => e.tipo === "bote"), "deu o bote");
  // um tiro no meio do bote tira vida, mas não para nem empurra
  const hp = a.bicho.hp;
  ev.push(...G.passo(p, DT, { b: { seq: 0, golpe: 0, dx: 0, dy: 0, mira: { x: -1, y: 0 } } }));
  for (let i = 0; i < 30 && !ev.some((e) => e.tipo === "dano" && e.de === "a"); i++) ev.push(...G.passo(p, DT, {}));
  assert.ok(ev.some((e) => e.tipo === "dano" && e.de === "a" && e.em === "b"), "chegou e bateu");
  assert.ok(!ev.some((e) => e.tipo === "atordoado" && e.id === "a"), "firme no bote");
  assert.ok(a.bicho.hp <= hp);
  // longe demais (ou atrás), não tem bote: o golpe sai no vazio
  const longe = partida(T("t_perto"), T("t_longe"));
  Object.assign(longe.a, { x: -6, y: 0 }); Object.assign(longe.b, { x: 4, y: 0 });
  G.passo(longe.p, DT, { a: { seq: 0, golpe: 0, dx: 0, dy: 0, mira: { x: 1, y: 0 } } });
  assert.ok(!longe.a.bote);
  const costas = partida(T("t_perto"), T("t_longe"));
  Object.assign(costas.a, { x: 0, y: 0 }); Object.assign(costas.b, { x: -2, y: 0 });
  G.passo(costas.p, DT, { a: { seq: 0, golpe: 0, dx: 0, dy: 0, mira: { x: 1, y: 0 } } });
  assert.ok(!costas.a.bote);
});

test("robô: as três dificuldades e o líder no difícil", () => {
  assert.deepStrictEqual(G.DIFICULDADES, ["facil", "normal", "dificil"]);
  assert.strictEqual(partida(com("pikachu"), com("pikachu"), { robo: "facil" }).p.nivel, 0);
  assert.strictEqual(partida(com("pikachu"), com("pikachu"), {}).p.nivel, 1);
  assert.strictEqual(partida(com("pikachu"), com("pikachu"), { robo: "facil", lider: "brasa" }).p.nivel, 2);
  const [f, n, d] = G.PERFIL_ROBO;
  assert.ok(f.reacao[0] > n.reacao[0] && n.reacao[0] > d.reacao[0], "reage mais rápido");
  assert.ok(f.foge < n.foge && n.foge < d.foge && f.erro > n.erro && n.erro > d.erro);
});

test("equilíbrio medido: o de perto tem chance contra quem recua, e o robô fica mais difícil a cada nível", () => {
  const N = 40, time = ["pikachu", "charizard", "blastoise"];
  const perto = taxa(N, (k) => duelo(T("t_perto"), T("t_longe"), perseguidor, recuador, {}, "m" + k));
  assert.ok(perto >= 0.3 && perto <= 0.75, `o de perto venceu ${Math.round(perto * 100)}%`);
  const contra = (robo) => taxa(N, (k) => duelo(time, time, recuador, null, { robo }, "r" + k));
  const [facil, normal, dificil] = ["facil", "normal", "dificil"].map(contra);
  assert.ok(facil > 0.7, `fácil: ${facil}`);
  assert.ok(normal > 0.2 && normal < facil, `normal: ${normal}`);
  assert.ok(dificil < 0.15 && dificil < normal, `difícil: ${dificil}`);
});
