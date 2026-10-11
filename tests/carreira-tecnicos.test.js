// O mercado de técnicos: propostas de outros clubes no fim da temporada e a troca de clube na virada.
const test = require("node:test");
const assert = require("node:assert");

process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const { novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo, novaTemporada, estado, completar } = require("../carreira.js").paraTestes;
const Tecnicos = require("../carreira-tecnicos.js");

// joga todos os jogos do seu clube até o fim da temporada, no modo "só o resultado"
function jogarTemporada(save) {
  for (let jogo; (jogo = proximoJogoMundo(save));) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
}
let pronta = null;
function noFim() {
  if (!pronta) { const save = novaCarreira("Teste", "palmeiras", "", 3); jogarTemporada(save); completar(save); pronta = JSON.stringify(save); }
  return JSON.parse(pronta);
}

test("no fim da temporada o mercado manda propostas de clubes que não são o seu e não vão cair", () => {
  const save = noFim(), e = estado(save);
  assert.ok(e.vagas, "o estado traz as propostas");
  assert.ok(e.vagas.ofertas.length <= 3);
  for (const o of e.vagas.ofertas) { assert.notEqual(o.id, save.clube); assert.ok(o.nome && o.ligaNome && o.projeto); }
  const caem = new Set(save.competicoes["brasileirao-2026"].tabela.slice(-4).map((l) => l.id));
  for (const o of e.vagas.ofertas) assert.ok(!caem.has(o.id), "quem vai cair não convida");
});

test("o mesmo save gera as mesmas propostas e escolher valida a oferta", () => {
  const a = noFim(), b = noFim();
  assert.deepEqual(a.vagas.ofertas.map((o) => o.id), b.vagas.ofertas.map((o) => o.id));
  assert.match(Tecnicos.escolher(a, "inexistente"), /não existe/);
  assert.equal(Tecnicos.escolher(a, "ficar"), null);
});

test("aceitar uma proposta troca de clube na virada, com elenco, caixa e diretoria do clube novo", () => {
  const save = noFim(); if (!save.vagas.ofertas.length) return;
  const oferta = save.vagas.ofertas[0], velho = save.clube, rep = save.gestao.reputacao;
  assert.equal(Tecnicos.escolher(save, oferta.id), null);
  assert.equal(novaTemporada(save), null);
  assert.equal(save.clube, oferta.id);
  assert.ok(save.caixaIA[velho] != null && !(oferta.id in save.caixaIA), "o caixa do clube velho fica guardado");
  assert.ok(save.gestao.reputacao >= rep - 1, "o técnico leva a reputação");
  assert.equal(save.gestao.infra.estadio, 0, "o estádio é do clube novo");
  assert.ok(save.calendario.length > 0 && save.calendario.every((r) => r[0].includes(oferta.id)), "o calendário é do clube novo");
  assert.ok(save.caixaEntrada.some((x) => x.tipo === "mercado-tecnico" && /Novo clube/.test(x.titulo)));
  assert.equal(estado(save).vagas, null, "a temporada nova não repete as propostas velhas");
});

test("ficar mantém o clube", () => {
  const save = noFim(), velho = save.clube;
  Tecnicos.escolher(save, "ficar");
  assert.equal(novaTemporada(save), null);
  assert.equal(save.clube, velho);
});

test("na última temporada e na sala em grupo não há mercado", () => {
  const save = noFim(); save.temporada = save.temporadasMax; save.vagas = null;
  assert.equal(Tecnicos.gerar(save, {}, {}), null);
  const sala = noFim(); sala.humanos = {}; sala.vagas = null;
  assert.equal(Tecnicos.gerar(sala, {}, {}), null);
});
