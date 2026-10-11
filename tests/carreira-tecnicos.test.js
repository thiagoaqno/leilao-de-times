// O mercado de técnicos: propostas de outros clubes no fim da temporada e a troca de clube na virada.
const test = require("node:test");
const assert = require("node:assert");

process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const { novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo, novaTemporada, estado, completar, ajudas, forcaDoClube, caixaInicial, temporadaAcabou } = require("../carreira.js").paraTestes;
const Tecnicos = require("../carreira-tecnicos.js");
const ctx = () => ({ ...ajudas, forcaDoClube, caixaInicial, temporadaAcabou });

// joga todos os jogos do seu clube até o fim da temporada, no modo "só o resultado"
function jogarTemporada(save) {
  for (let jogo; (jogo = proximoJogoMundo(save));) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
}
function jogarUm(save) {
  const jogo = proximoJogoMundo(save);
  save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
  fecharRodada(save, simularMinha(save));
}
let pronta = null;
function noFim() {
  if (!pronta) { const save = novaCarreira("Teste", "palmeiras", "", 3); jogarTemporada(save); delete save.demitido; save.gestao.confianca = 70; save.gestao.ultimato = null; completar(save); pronta = JSON.stringify(save); }
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
  assert.match(Tecnicos.escolher(a, ctx(), "inexistente"), /não existe/);
  assert.equal(Tecnicos.escolher(a, ctx(), "ficar"), null);
});

test("aceitar uma proposta troca de clube na virada, com elenco, caixa e diretoria do clube novo", () => {
  const save = noFim(); if (!save.vagas.ofertas.length) return;
  const oferta = save.vagas.ofertas[0], velho = save.clube, rep = save.gestao.reputacao;
  assert.equal(Tecnicos.escolher(save, ctx(), oferta.id), null);
  assert.equal(novaTemporada(save), null);
  assert.equal(save.clube, oferta.id);
  assert.ok(save.caixaIA[velho] != null && !(oferta.id in save.caixaIA), "o caixa do clube velho fica guardado");
  assert.ok(save.gestao.reputacao >= rep - 1, "o técnico leva a reputação");
  assert.equal(save.gestao.infra.estadio, 0, "o estádio é do clube novo");
  assert.ok(save.calendario.length > 0 && save.calendario.every((r) => r[0].includes(oferta.id)), "o calendário é do clube novo");
  assert.ok(save.caixaEntrada.some((x) => x.tipo === "mercado-tecnico" && /Novo clube/.test(x.titulo)));
  const nova = estado(save).vagas; assert.ok(!nova || (nova.momento === "comeco" && !nova.ofertas.some((o) => o.id === oferta.id)), "as propostas velhas não voltam: só as do começo da temporada nova");
});

test("ficar mantém o clube", () => {
  const save = noFim(), velho = save.clube;
  Tecnicos.escolher(save, ctx(), "ficar");
  assert.equal(novaTemporada(save), null);
  assert.equal(save.clube, velho);
});

test("na última temporada e na sala em grupo não há mercado", () => {
  const save = noFim(); save.temporada = save.temporadasMax; save.vagas = null;
  assert.equal(Tecnicos.gerar(save, ctx(), {}), null);
  const sala = noFim(); sala.humanos = {}; sala.vagas = null;
  assert.equal(Tecnicos.gerar(sala, ctx(), {}), null);
});

test("sempre sai pelo menos uma proposta, mesmo para um técnico sem prestígio, e o save sem mercado ganha as propostas ao abrir", () => {
  const save = noFim(); save.vagas = null; save.gestao.reputacao = 0; save.historico = save.historico.map((x) => ({ ...x, meta: { ...(x.meta || {}), cumprida: false } }));
  completar(save);
  assert.ok(save.vagas && save.vagas.ofertas.length >= 1, "uma carreira de antes do mercado recebe propostas ao abrir");
  assert.ok(estado(save).vagas.ofertas.length >= 1);
});

test("candidatura: o estado lista clubes com a chance, o resultado é sempre o mesmo e quem aceita vira a escolha", () => {
  const a = noFim(), b = noFim();
  const cand = estado(a).vagas.candidatos; assert.ok(cand.length >= 5);
  for (const o of cand) assert.ok(o.chance >= 0.04 && o.chance <= 0.9 && o.nome && o.projeto);
  const idsAceitos = (save) => estado(save).vagas.candidatos.map((o) => { const r = Tecnicos.candidatar(save, ctx(), o.id, {}); return typeof r === "string" ? r : r.aceitou; });
  assert.deepEqual(idsAceitos(a), idsAceitos(b));
  const outra = noFim(); const c = estado(outra).vagas.candidatos[0];
  assert.match(Tecnicos.candidatar(outra, ctx(), "palmeiras-nao-existe", {}), /não está contratando/);
  const r = Tecnicos.candidatar(outra, ctx(), c.id, {});
  assert.ok(typeof r === "object");
  assert.match(Tecnicos.candidatar(outra, ctx(), c.id, {}), /já (respondeu|mandou)/, "cada clube responde uma vez");
  if (r.aceitou) { assert.equal(outra.vagas.escolha, c.id); assert.equal(novaTemporada(outra), null); assert.equal(outra.clube, c.id); }
});

test("no começo da temporada seguinte, antes do primeiro jogo, o técnico troca de clube na hora (mesmo sem ter tido o mercado no fim)", () => {
  const save = noFim(); save.vagas = null;
  assert.equal(novaTemporada(save), null); // virou sem proposta: é o caso da carreira que já estava rodando
  assert.equal(save.rodada, 0);
  const e = estado(save);
  assert.ok(e.vagas && e.vagas.momento === "comeco" && e.vagas.ofertas.length >= 1, "o mercado abre no começo da temporada");
  const velho = save.clube, oferta = e.vagas.ofertas[0];
  const r = Tecnicos.escolher(save, ctx(), oferta.id);
  assert.ok(r && r.mudou, "a troca é na hora");
  assert.equal(save.clube, oferta.id); assert.notEqual(save.clube, velho);
  assert.ok(save.calendario.length > 0 && save.calendario.every((x) => x[0].includes(oferta.id)), "o calendário já é do clube novo");
  assert.equal(estado(save).vagas, null, "depois da troca o mercado fecha");
  assert.ok(estado(save).proximo.includes(oferta.id));
});

test("depois do primeiro jogo o mercado de técnicos fecha até o fim da temporada", () => {
  const save = noFim(); novaTemporada(save);
  jogarUm(save);
  assert.equal(estado(save).vagas, null);
  assert.match(Tecnicos.candidatar(save, ctx(), "flamengo", {}), /só abre/);
});
