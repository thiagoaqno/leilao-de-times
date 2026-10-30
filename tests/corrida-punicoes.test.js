// Corrida da Galera, regras de F1: a escala de punições das batidas entre carros (leve +3 s, média +6 s, grave stop-and-go de 8 s,
// reincidência e bandeira preta na sexta batida causada), a gravidade pela velocidade de aproximação ANTES do impulso e a proteção
// de quem foi batido.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const Contato = require("../corrida-contato.js");
const Direcao = require("../corrida-f1-direcao.js");

const sala = (voltas = 5, laps = 2) => {
  const room = { phase: "race", startAt: 1000, config: { pista: "interlagos", regras: "f1", voltas, robos: 0 }, semente: 7, order: ["a", "b"], players: {
    a: { id: "a", name: "Ana", pos: {}, penal: 0, acrescimo: 0, dano: 0, laps }, b: { id: "b", name: "Beto", pos: {}, penal: 0, acrescimo: 0, dano: 0, laps } } };
  room.direcao = { pista: [] };
  return room;
};
// o impacto como o contato do servidor guarda: `a` (o de trás) acertou `b`
const impacto = (room, forca, culpado) => Contato.estado(room).impactos.set("a|b", { t: 5000, forca, culpado, de: "a", pre: {} });
const semLog = () => {};

test("gravidade pela velocidade de aproximação: ~80 km/h a mais na traseira é grave", () => {
  const kmh = (f) => f * 0.75;
  assert.equal(F1.gravidadeDaBatida(F1.COLISAO_LEVE - 1), null);
  assert.equal(F1.gravidadeDaBatida(F1.COLISAO_LEVE), "leve");
  assert.equal(F1.gravidadeDaBatida(54), "leve");
  assert.equal(F1.gravidadeDaBatida(F1.COLISAO_MEDIA), "media");
  assert.equal(F1.gravidadeDaBatida(80 / 0.75), "grave", "80 km/h de diferença");
  assert.ok(kmh(F1.COLISAO_GRAVE) <= 80 && kmh(F1.COLISAO_GRAVE) > 75);
});

test("escala: reincidência até a quinta e bandeira preta na sexta, inclusive na largada", () => {
  assert.equal(F1.nivelDaPunicao("leve", 1, true).nivel, "leve");
  for (let n = 2; n <= 5; n++) assert.equal(F1.nivelDaPunicao("leve", n, true).nivel, "media");
  assert.equal(F1.nivelDaPunicao("grave", 5).nivel, "grave");
  assert.equal(F1.nivelDaPunicao("leve", 6).nivel, "preta");
  assert.equal(F1.nivelDaPunicao(null, 1), null);
});

test("direção de prova: o causador leva +3 s e o dano, o batido não leva punição nem dano", () => {
  const room = sala(), a = room.players.a, b = room.players.b, log = [];
  impacto(room, 30, "a");
  Direcao.bater(room, a, 30, "carro", 5000, (s) => log.push(s), "carro:b");
  Direcao.bater(room, b, 30, "carro", 5000, (s) => log.push(s), "carro:a");
  assert.equal(a.penal, 3); assert.equal(a.acrescimo, 3); assert.equal(a.dano, 1);
  assert.equal(b.penal, 0); assert.equal(b.dano, 0);
  assert.ok(log.some((s) => /Ana: causou uma batida leve, \+3 s/.test(s)), log.join("|"));
  assert.ok(log.some((s) => /Beto.*atingido: sem punição/.test(s)));
});

test("direção de prova: média +6 s; a segunda batida causada sobe; a sexta é bandeira preta", () => {
  const room = sala(), a = room.players.a, log = [];
  impacto(room, 70, "a");
  Direcao.bater(room, a, 70, "carro", 5000, (s) => log.push(s), "carro:b");
  assert.equal(a.penal, 6); assert.equal(a.dano, 2);
  a.batidaPares = {}; impacto(room, 70, "a"); // a segunda: média vira stop-and-go
  Direcao.bater(room, a, 70, "carro", 20000, (s) => log.push(s), "carro:b");
  assert.equal(a.stopGo.s, F1.STOPGO_S); assert.equal(a.stopGo.ate, 2 + F1.STOPGO_VOLTAS);
  assert.ok(log.some((s) => /Stop-and-go 8 s: cumpra em 3 voltas/.test(s)), log.join("|"));
  for (let n = 3; n <= 6; n++) {
    a.batidaPares = {}; impacto(room, 30, "a");
    Direcao.bater(room, a, 30, "carro", n * 20000, (s) => log.push(s), "carro:b");
    if (n < 6) assert.ok(!a.dnf);
  }
  assert.ok(a.dsq && a.dnf, "bandeira preta: desclassificado");
  assert.ok(log.some((s) => /bandeira preta/.test(s)));
});

test("direção de prova: na primeira volta a punição é igual às demais", () => {
  const room = sala(5, 0), a = room.players.a;
  impacto(room, 30, "a");
  Direcao.bater(room, a, 30, "carro", 5000, semLog, "carro:b");
  assert.equal(a.penal, 3, "leve na primeira volta vale +3 s");
});

test("direção de prova: sem culpado claro (lado a lado) ninguém é punido e o dano é o de sempre", () => {
  const room = sala(), a = room.players.a;
  impacto(room, 200, null);
  Direcao.bater(room, a, 200, "carro", 5000, semLog, "carro:b");
  assert.equal(a.penal, 0); assert.equal(a.stopGo, undefined); assert.equal(a.dano, 1);
});

test("stop-and-go: cumprido some; sem voltas vira +20 s; passou de 3 voltas é bandeira preta", () => {
  let room = sala(8, 1), a = room.players.a;
  impacto(room, 200, "a");
  Direcao.bater(room, a, 200, "carro", 5000, semLog, "carro:b");
  assert.equal(a.stopGo.ate, 4);
  a.laps = 3; assert.equal(Direcao.voltaFechada(room, a, semLog), false, "ainda dá tempo");
  a.laps = 4; assert.equal(Direcao.voltaFechada(room, a, semLog), true); assert.ok(a.dsq, "três voltas sem cumprir");
  room = sala(8, 1); a = room.players.a; impacto(room, 200, "a");
  Direcao.bater(room, a, 200, "carro", 5000, semLog, "carro:b");
  assert.equal(Direcao.cumprirStopGo(room, a, semLog), true); assert.equal(a.stopGo, null); assert.equal(a.penal, 0);
  // na última volta, ou sem volta com o box aberto até o fim: +20 s no tempo final
  room = sala(5, 4); a = room.players.a; impacto(room, 200, "a");
  Direcao.bater(room, a, 200, "carro", 5000, semLog, "carro:b");
  assert.equal(a.stopGo, undefined); assert.equal(a.penal, F1.STOPGO_CONVERSAO_S);
  room = sala(4, 1); a = room.players.a; impacto(room, 200, "a");
  Direcao.bater(room, a, 200, "carro", 5000, semLog, "carro:b"); assert.ok(a.stopGo);
  a.laps = 3; Direcao.voltaFechada(room, a, semLog);
  assert.equal(a.stopGo, null); assert.equal(a.penal, 20); assert.ok(!a.dsq);
});

test("stop-and-go pendente mantém 8 segundos quando há outra punição", () => {
  const room = sala(8, 1), a = room.players.a;
  Direcao.aplicarStopGo(room, a, "primeira", semLog);
  Direcao.aplicarStopGo(room, a, "segunda", semLog);
  assert.equal(a.stopGo.s, 8);
  assert.equal(a.stopGo.ate, 4);
});

test("bandeira azul exige líder próximo e não repete ao oscilar no limite", () => {
  const room = sala(), a = room.players.a, b = room.players.b, logs = [];
  room.direcao.pista = Array.from({ length: 1000 }, () => ({ x: 0, y: 0, tx: 1, ty: 0 }));
  a.pos = { x: 0, y: 0, prog: 1990, v: 200 };
  b.avisosAzul = 0; b.pos = { x: 500, y: 0, prog: 1000, v: 100 };
  const registrar = (x, agora) => Direcao.registrar(room, b, { ...b.pos, x }, agora, t => logs.push(t));
  registrar(500, 5000); assert.equal(b.azul, false);
  registrar(80, 6000); assert.equal(b.azul, true);
  registrar(95, 7000); registrar(80, 8000);
  assert.equal(b.avisosAzul, 1);
  registrar(160, 9000); registrar(80, 10000);
  assert.equal(b.avisosAzul, 2);
});

test("bater num carro que derrapa é infração leve mesmo em baixa velocidade (e num que não derrapa, não)", () => {
  const room = sala(), a = room.players.a;
  Contato.estado(room).impactos.set("a|b", { t: 5000, forca: 6, culpado: null, de: "a", pre: { vx: 100, vy: 0, ovx: 95, ovy: 0, a: 0, oa: 0, r: 0, orr: 3 } });
  Direcao.bater(room, a, 6, "carro", 5000, semLog, "carro:b");
  assert.equal(a.penal, F1.PUNICAO_LEVE_S, "o outro girava a 3 rad/s");
  const room2 = sala(), a2 = room2.players.a;
  Contato.estado(room2).impactos.set("a|b", { t: 5000, forca: 6, culpado: null, de: "a", pre: { vx: 100, vy: 0, ovx: 95, ovy: 0, a: 0, oa: 0, r: 0, orr: 0 } });
  Direcao.bater(room2, a2, 6, "carro", 5000, semLog, "carro:b");
  assert.equal(a2.penal, 0);
});

test("stop-and-go com troca na mesma parada: B.troca = { parada, t } e a fase vai de stopgo a troca", () => {
  const Sim = require("../public/corrida/sim.js"), T = require("../public/corrida/pistas.js"), Eq = require("../public/corrida/f1-equipes.js");
  const tr = Sim.criarPista(T.PISTAS.interlagos, "interlagos"), cor = tr.corredor, q = tr.pts[(cor.i0 - 3 + tr.n) % tr.n], a0 = Math.atan2(q.ty, q.tx);
  const c = Sim.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio"), box: true });
  Object.assign(c, { x: q.x, y: q.y, idx: (cor.i0 - 3 + tr.n) % tr.n, a: a0, v: 60, vx: Math.cos(a0) * 60, vy: Math.sin(a0) * 60, z: q.h });
  const amb = { spec: Eq.specDaEquipe("mclaren"), voltas: 5, laps: 1, paradas: 0, semente: 7, id: "a", grid: 0, f1: true, outros: [], stopGo: 8 }, fases = new Set(), ev = [];
  for (let i = 0; i < 120 * 60 && !ev.some((e) => e.fase === "sai"); i++) {
    const e = []; Sim.passo(c, { gas: 1, pedido: "duro" }, amb, tr, e); ev.push(...e);
    const f = Sim.faseDoBox(c.box); if (f) fases.add(f.fase);
    if (c.box.fase === "parada") { assert.ok(c.box.troca && c.box.troca.parada > 0 && c.box.parada === 8); }
  }
  assert.deepEqual([...fases], ["stopgo", "troca"]);
  assert.equal(c.pneu.composto, "duro");
  const sai = ev.find((e) => e.fase === "sai"); assert.ok(sai.stopGo && sai.troca && sai.sg === 8);
});

test("pneus na água: o macio sofre até na garoa, o de chuva é só um pouco melhor na garoa e claramente melhor na pista encharcada", () => {
  const g = (composto, agua) => F1.aderencia({ composto, desgaste: 0.1, temp: 0.75 }, agua).grip;
  for (const c of ["medio", "duro"]) assert.ok(g("macio", 0.45) / g("macio", 0) < g(c, 0.45) / g(c, 0), "o macio perde mais que os outros secos");
  assert.ok(g("chuva", 0.45) > g("medio", 0.45) && g("chuva", 0.45) < 1.15 * Math.max(g("macio", 0.45), g("medio", 0.45), g("duro", 0.45)), "garoa: de chuva meio ruim");
  assert.ok(g("chuva", 1) > 1.8 * Math.max(g("macio", 1), g("medio", 1), g("duro", 1)), "encharcada: de chuva muito melhor");
});

test("ERS: a bateria enche na frenagem, o automático gasta suave com orçamento por volta e o overtake gasta forte", () => {
  const e = F1.ersNovo(); e.carga = 0.5;
  F1.gastarErs(e, 1, true, false); assert.ok(Math.abs(e.carga - (0.5 - F1.ERS_GASTO_SUAVE)) < 1e-9);
  const f = F1.ersNovo(); f.carga = 0.9; F1.gastarErs(f, 1, true, true); assert.ok(Math.abs(f.carga - (0.9 - F1.ERS_GASTO)) < 1e-9);
  const g = F1.ersNovo(); g.carga = 1; let gasto = 0;
  for (let i = 0; i < 100; i++) { const antes = g.carga; F1.gastarErs(g, 0.1, true, false); gasto += antes - g.carga; }
  assert.ok(gasto <= 0.75 + 1e-9, "o gasto suave tem teto por volta");
});
