// Corrida da Galera, regras de F1: o carro fica parado no grid até as luzes apagarem (servidor e previsão do navegador), acelerar
// com as luzes acesas é queima de largada (+5 s da direção de prova), e a chance de quebra é de 0,5% por carro por corrida.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../public/corrida/sim.js");
const T = require("../public/corrida/pistas.js");
const F1 = require("../public/corrida/f1-regras.js");
const Equipes = require("../public/corrida/f1-equipes.js");
const Humanos = require("../corrida-humanos.js");
const Direcao = require("../corrida-f1-direcao.js");

const tr = S.criarPista(T.PISTAS.interlagos, "interlagos");
const mclaren = Equipes.specDaEquipe("mclaren");

const salaDeLargada = (esperaMs = 3000) => {
  const p = { id: "a", name: "Ana", grid: 0, laps: 0, car: "equilibrado", pneu: "medio", sockets: new Set(), finish: null, dano: 0, paradas: [], bot: false };
  const agora = Date.now();
  const room = { phase: "race", startAt: agora + esperaMs, luzes: { espera: 1 }, config: { pista: "interlagos", regras: "f1", voltas: 3, cambio: "auto", ers: "auto" }, players: { a: p }, order: ["a"], semente: 7, direcao: null };
  Direcao.iniciar(room);
  const logs = [], h = { registrar: (r, q, pos, quando) => { Direcao.registrar(r, q, pos, quando, (s) => logs.push(s)); return false; }, aoSetor: () => true, aoBater: () => false, aoParada: () => {}, mandarAck: () => {}, mudou: () => {} };
  return { room, p, h, logs, agora };
};
// as entradas até `ate` (em passos): o pé fica fora do acelerador até o passo `de` e depois acelera
const enviar = (room, p, agora, de, ate) => {
  const cod = S.empacotar({ gas: 1, steer: 0 }), solto = S.empacotar({ gas: 0, steer: 0 });
  const k = []; for (let i = 0; i < ate; i++) k.push(i >= de ? cod : solto);
  for (let i = 0; i < k.length; i += 240) Humanos.entrada(room, p, { s: room.startAt, t0: i, k: k.slice(i, i + 240) }, agora);
};

test("servidor: o acelerador antes das luzes apagarem não move o carro (ele fica no grid)", () => {
  const { room, p, h, agora } = salaDeLargada(3000);
  enviar(room, p, agora, 0, 300); // 2,5 s de pé no fundo, com as luzes acesas
  Humanos.andar(room, agora + 2600, h);
  const c = p.sim.c, x0 = c.x, y0 = c.y;
  assert.ok(c.tick >= 250, `anda os passos: ${c.tick}`);
  assert.equal(c.v, 0); assert.equal(c.vx, 0); assert.equal(c.vy, 0);
  const g = S.novo(tr, { grid: 0, f1: true });
  assert.ok(Math.hypot(c.x - g.x, c.y - g.y) < 1e-6, "no mesmo lugar do grid");
  Humanos.andar(room, agora + 2800, h);
  assert.equal(p.sim.c.x, x0); assert.equal(p.sim.c.y, y0);
});

test("servidor: apagaram as luzes, o carro sai; quem acelerou antes queimou a largada (+5 s, uma vez)", () => {
  const { room, p, h, logs, agora } = salaDeLargada(3000);
  enviar(room, p, agora, 0, 600); // gás desde o começo: queimou
  Humanos.andar(room, agora + 2000, h);
  assert.equal(p.sim.c.v, 0, "ainda parado com as luzes acesas");
  assert.ok(p.penal >= 5 && p.acrescimo === 5, `queimou: penal ${p.penal}, acréscimo ${p.acrescimo}`);
  Humanos.andar(room, agora + 5000, h);
  assert.ok(p.sim.c.v > 20, `depois do go o carro anda (${p.sim.c.v})`);
  assert.equal(p.acrescimo, 5, "uma punição só");
  assert.equal(logs.filter((s) => s.includes("queimou a largada")).length, 1);
});

test("servidor: acelerar só depois do go (ou nos últimos 150 ms de folga do relógio) não é queimar a largada", () => {
  const limpo = salaDeLargada(3000);
  enviar(limpo.room, limpo.p, limpo.agora, 390, 600); // gás a partir de 3,25 s: depois do go (3 s)
  Humanos.andar(limpo.room, limpo.agora + 5000, limpo.h);
  assert.equal(limpo.p.penal, 0); assert.ok(limpo.p.sim.c.v > 20);
  const folga = salaDeLargada(3000);
  enviar(folga.room, folga.p, folga.agora, 346, 600); // gás a partir de 2,88 s: dentro da folga de 150 ms antes do go
  Humanos.andar(folga.room, folga.agora + 5000, folga.h);
  assert.equal(folga.p.penal, 0, "dentro da folga");
});

test("direção de prova: acelerar com as luzes acesas queima a largada; sem luzes não", () => {
  const room = { config: { pista: "monaco", voltas: 3 }, semente: 1, startAt: 20000, luzes: { espera: 1 }, order: ["a"], players: { a: { id: "a", name: "Ana", finish: null } } };
  Direcao.iniciar(room);
  const a = room.players.a, pts = T.pontos(T.PISTAS.monaco, 6), pos = { x: pts[0].x, y: pts[0].y, prog: -5, v: 0 }, log = () => {};
  a.gasNasLuzes = Direcao.GAS_QUEIMA_MS - 10; Direcao.registrar(room, a, pos, 18000, log); assert.equal(a.penal, 0, "pouco tempo de pé: ainda não");
  a.gasNasLuzes = Direcao.GAS_QUEIMA_MS; Direcao.registrar(room, a, pos, 18100, log); assert.equal(a.penal, 5);
  assert.equal(a.queimou, true);
  room.luzes = null; Direcao.iniciar(room); const b = room.players.a; b.gasNasLuzes = 9999;
  Direcao.registrar(room, b, pos, 18100, log);
  assert.equal(b.penal, 0, "sem luzes (classificação, arcade): sem queima pelo pé");
});

test("previsão do navegador: com as luzes acesas o acelerador não move o carro; soltou, sai sem salto", () => {
  const amb = { spec: mclaren, segurar: true, outros: [], voltas: 3, f1: true, grid: 0 };
  const c = S.novo(tr, { grid: 0, f1: true }), x0 = c.x, y0 = c.y, a0 = c.a;
  for (let i = 0; i < 360; i++) S.passo(c, { gas: 1, brake: 0, steer: 0 }, amb, tr, null);
  assert.equal(c.v, 0); assert.equal(c.x, x0); assert.equal(c.y, y0); assert.equal(c.a, a0);
  amb.segurar = false;
  S.passo(c, { gas: 1, brake: 0, steer: 0 }, amb, tr, null);
  assert.ok(Math.hypot(c.x - x0, c.y - y0) < 0.2, "o primeiro passo depois do go não pula");
  for (let i = 0; i < 240; i++) S.passo(c, { gas: 1, brake: 0, steer: 0 }, amb, tr, null);
  assert.ok(c.v > 20, "e então acelera");
});

test("o navegador só solta o carro no go: a previsão segura pelo relógio, não pelo acelerador", () => {
  const fonte = fs.readFileSync(path.join(__dirname, "../public/corrida/fisica.js"), "utf8");
  const linhas = fonte.split(/\r?\n/).filter((l) => l.includes("AMB.segurar ="));
  assert.ok(linhas.length >= 2);
  for (const l of linhas) assert.ok(!/ent\.gas|luzes/.test(l), `a previsão não pode liberar o carro pelo acelerador: ${l.trim()}`);
  assert.ok(!/!!race\.luzes/.test(fonte), "physics não pode andar antes do go");
  const servidor = fs.readFileSync(path.join(__dirname, "../corrida-humanos.js"), "utf8");
  assert.ok(/amb\.segurar = t < room\.startAt;/.test(servidor), "o servidor segura o carro até o go");
});

test("quebra: o padrão é 0,5% por carro por corrida, e a confiabilidade mexe de 0,25% a 1%", () => {
  assert.equal(Equipes.QUEBRA_PADRAO, 0.005);
  const base = { motor: 4, aero: 4, chassi: 3, freios: 3, suspensao: 3 };
  assert.equal(Equipes.specDaMontagem({ ...base, confiab: Equipes.CONFIAB_PADRAO }).quebra, 0.005);
  assert.equal(Equipes.specDaMontagem({ ...base, confiab: 0 }).quebra, 0.01);
  assert.equal(Equipes.specDaMontagem({ ...base, confiab: 8 }).quebra, 0.0025);
  let ant = Infinity;
  for (let c = 0; c <= 8; c++) { const q = Equipes.quebraDaConfiab(c); assert.ok(q >= 0.0025 && q <= 0.01 && q < ant, `confiab ${c}: ${q}`); ant = q; }
  for (const id of Object.keys(Equipes.EQUIPES)) { const q = Equipes.specDaEquipe(id).quebra; assert.ok(q >= 0.0025 && q <= 0.01, `${id}: ${q}`); }
  assert.equal(Equipes.specDaMontagem({ ...base, motor: 8, aero: 0, confiab: 3 }).quebra, 0.005, "o motor não muda a chance");
});

test("quebra: em muitas corridas simuladas com a semente, a taxa fica perto de 0,5%", () => {
  const sorteios = 60000, base = { motor: 4, aero: 4, chassi: 3, freios: 3, suspensao: 3 };
  const taxa = (spec) => { let q = 0; for (let k = 0; k < sorteios; k++) if (Equipes.sortearFalha(F1.sorteio(`quebra:${k}:carro-${k % 20}`), spec) != null) q++; return q / sorteios; };
  const padrao = taxa(Equipes.specDaMontagem({ ...base, confiab: 3 }));
  assert.ok(padrao > 0.0035 && padrao < 0.0065, `taxa ${padrao}`);
  const pior = taxa(Equipes.specDaMontagem({ ...base, confiab: 0 })), melhor = taxa(Equipes.specDaMontagem({ ...base, confiab: 8 }));
  assert.ok(pior > 0.0075 && pior < 0.0125, `sem confiabilidade ${pior}`);
  assert.ok(melhor > 0.0015 && melhor < 0.0035, `confiabilidade máxima ${melhor}`);
  const spec = Equipes.specDaEquipe("mclaren");
  assert.equal(Equipes.sortearFalha(F1.sorteio("quebra:9:a"), spec), Equipes.sortearFalha(F1.sorteio("quebra:9:a"), spec), "a mesma semente dá a mesma falha");
});
