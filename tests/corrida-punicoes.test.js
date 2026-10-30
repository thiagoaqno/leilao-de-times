// Corrida da Galera, regras de F1: a escala de punições das batidas entre carros (leve +3 s, média +6 s, grave stop-and-go de 8 s,
// reincidência, primeira volta mais rigorosa, bandeira preta), a gravidade pela velocidade de aproximação ANTES do impulso e a proteção
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

test("escala: reincidência sobe um nível, a primeira volta sobe outro, a terceira é bandeira preta", () => {
  assert.equal(F1.nivelDaPunicao("leve", 1, false).nivel, "leve");
  assert.equal(F1.nivelDaPunicao("leve", 2, false).nivel, "media");
  assert.equal(F1.nivelDaPunicao("media", 2, false).nivel, "grave");
  assert.equal(F1.nivelDaPunicao("leve", 1, true).nivel, "media");
  assert.equal(F1.nivelDaPunicao("leve", 2, true).nivel, "grave");
  assert.equal(F1.nivelDaPunicao("grave", 2, true).nivel, "grave", "o stop-and-go é o teto até a terceira");
  assert.equal(F1.nivelDaPunicao("leve", 3, false).nivel, "preta");
  assert.equal(F1.nivelDaPunicao(null, 1, false), null);
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

test("direção de prova: média +6 s; a segunda batida causada sobe; a terceira é bandeira preta", () => {
  const room = sala(), a = room.players.a, log = [];
  impacto(room, 70, "a");
  Direcao.bater(room, a, 70, "carro", 5000, (s) => log.push(s), "carro:b");
  assert.equal(a.penal, 6); assert.equal(a.dano, 2);
  a.batidaPares = {}; impacto(room, 70, "a"); // a segunda: média vira stop-and-go
  Direcao.bater(room, a, 70, "carro", 20000, (s) => log.push(s), "carro:b");
  assert.equal(a.stopGo.s, F1.STOPGO_S); assert.equal(a.stopGo.ate, 2 + F1.STOPGO_VOLTAS);
  assert.ok(log.some((s) => /Stop-and-go 8 s: cumpra em 3 voltas/.test(s)), log.join("|"));
  a.batidaPares = {}; impacto(room, 30, "a"); // a terceira
  Direcao.bater(room, a, 30, "carro", 40000, (s) => log.push(s), "carro:b");
  assert.ok(a.dsq && a.dnf, "bandeira preta: desclassificado");
  assert.ok(log.some((s) => /bandeira preta/.test(s)));
});

test("direção de prova: na primeira volta a punição sobe um nível", () => {
  const room = sala(5, 0), a = room.players.a;
  impacto(room, 30, "a");
  Direcao.bater(room, a, 30, "carro", 5000, semLog, "carro:b");
  assert.equal(a.penal, 6, "leve na primeira volta vale +6 s");
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
