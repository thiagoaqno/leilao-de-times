// Carreira: a premiação do campeonato até o G6 (carreira.js: premioG6, premioDoTurno e registrarTemporada).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const { PREMIO_TITULO, premioDoTitulo, PREMIOS_G6, premioG6, novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo } = require("../carreira.js").paraTestes;

const jogar = (save, ate = Infinity) => {
  for (let jogo, n = 0; n < ate && (jogo = proximoJogoMundo(save)); n++) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
};
const extrato = (save) => save.financas.flatMap((f) => f.itens);

test("a tabela de prêmios: seis posições, do maior para o menor, com o fator da liga e sem nada fora do G6", () => {
  assert.strictEqual(PREMIOS_G6.length, 6);
  assert.ok(PREMIOS_G6.every((v, i) => i === 0 || v < PREMIOS_G6[i - 1]), "cada posição paga menos que a de cima");
  const br = { clube: "flamengo" }, ing = { clube: "liverpool" }, arg = { clube: "boca-juniors" };
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6].map((p) => premioG6(br, p)), PREMIOS_G6);
  assert.strictEqual(premioG6(br, 7), 0); assert.strictEqual(premioG6(br, 0), 0); assert.strictEqual(premioG6(br, 20), 0);
  assert.ok(premioG6(ing, 1) > premioG6(br, 1), "a Premier League paga mais");
  assert.ok(premioG6(arg, 1) < premioG6(br, 1) || premioG6(arg, 1) === premioG6(br, 1), "uma liga menor não paga mais que o Brasileirão");
  assert.strictEqual(premioG6(br, 1, 0.25), Math.round(PREMIOS_G6[0] / 4 / 1e5) * 1e5, "o adiantamento do turno é 25% (arredondado a R$ 100 mil)");
});

test("na carreira: no meio da liga o G6 do momento recebe 25%, no fim quem ficou no G6 recebe o prêmio, e nenhum paga duas vezes", () => {
  const save = novaCarreira("Teste", "flamengo", "", 1);
  const ligaJogos = () => (save.jogosJogados || []).filter((id) => id.startsWith("brasileirao-2026:")).length;
  while (ligaJogos() < 19 && proximoJogoMundo(save)) jogar(save, 1);
  assert.strictEqual(ligaJogos(), 19);
  const turno = extrato(save).filter(([n]) => /Premiação do turno/.test(n));
  assert.ok(turno.length <= 1, "uma vez só");
  assert.strictEqual(save.gestao.visto.premioTurno, save.temporada, "marcou que o turno já foi conferido");
  if (turno.length) { const pos = +/(\d+)º/.exec(turno[0][0])[1]; assert.ok(pos <= 6); assert.strictEqual(turno[0][1], premioG6(save, pos, 0.25)); }
  jogar(save);
  const final = extrato(save).filter(([n]) => /Premiação do campeonato/.test(n)), h = save.historico[0];
  if (h.posicao <= 6) {
    assert.strictEqual(final.length, 1); assert.strictEqual(final[0][1], premioG6(save, h.posicao));
    assert.ok(save.caixaEntrada.some((e) => e.tipo === "premio" && /Premiação do campeonato/.test(e.titulo)));
  } else assert.strictEqual(final.length, 0, "fora do G6 não tem o prêmio do campeonato");
  assert.ok(extrato(save).filter(([n]) => /Premiação do turno/.test(n)).length <= 1, "o prêmio do turno não repete (o extrato guarda só as últimas rodadas)");
});

test("o bônus de título: R$ 60 mi na Libertadores, R$ 50 mi na Copa do Brasil, R$ 40 mi na Sul-Americana e R$ 15 mi nas outras competições", () => {
  const save = novaCarreira("Teste", "flamengo", "", 1), nome = (id) => save.competicoes[id].nome;
  assert.deepStrictEqual(PREMIO_TITULO, { libertadores: 60e6, copadobrasil: 50e6, sulamericana: 40e6 });
  assert.strictEqual(premioDoTitulo(save, nome("copadobrasil")), 50e6);
  assert.strictEqual(premioDoTitulo(save, nome("libertadores")), 60e6);
  assert.strictEqual(premioDoTitulo(save, nome("sulamericana")), 40e6);
  for (const id of ["brasileirao-2026", "champions", "supermundial", "mundial"]) assert.strictEqual(premioDoTitulo(save, nome(id)), 15e6, id);
  assert.strictEqual(premioDoTitulo(save, "Brasileirão"), 15e6, "nome que não é de competição do mundo (carreira antiga): R$ 15 mi");
});
