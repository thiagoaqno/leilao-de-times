// Carreira de Treinador: a festa do campeão não abre antes da hora. Com o mundo andando de jogo em jogo do técnico, uma competição
// que termina numa semana sem jogo dele só ganha a festa quando o técnico já passou dessa semana.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const { novaCarreira, proximoJogoMundo, simularMinha, fecharRodada, estado } = require("../carreira.js").paraTestes;

test("festa do campeão: só aparece depois que o último jogo da competição ficou para trás", () => {
  const save = novaCarreira("Teste", "flamengo", "");
  let festas = 0, i = 0;
  while (proximoJogoMundo(save)) {
    const prox = proximoJogoMundo(save), e = estado(save), visto = (save.ultimo && save.ultimo.semana) ?? -1;
    for (const c of Object.values(e.competicoes)) if (c.festa) {
      festas++;
      assert.ok(c.jogos.every((j) => j.semana <= visto), `${c.id}: festa antes da hora (técnico na semana ${visto}, último jogo na ${Math.max(...c.jogos.map((j) => j.semana))})`);
    }
    save.partida = { rodada: save.rodada, jogoId: prox.id, competicao: prox.competicao, fase: prox.fase, mataMata: prox.mataMata, agregado: null, casa: prox.casa, fora: prox.fora, modo: 1, semente: `s${i++}`, decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
  assert.ok(festas > 0);
});
