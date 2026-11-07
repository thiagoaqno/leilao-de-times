const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/corrida/f1-regras.js");
const S = require("../public/corrida/sim.js");
const Box = require("../public/corrida/box-escolha.js");

test("intermediário: cor própria", () => {
  assert.equal(F.PNEUS.intermediario.cor, "#39c85a");
});

test("intermediário: chega ao penhasco em quatro voltas no molhado e duas no seco", () => {
  for (const [agua, voltas] of [[0, 2], [0.45, 4], [1, 4]]) {
    const pneu = F.pneuNovo("intermediario"); pneu.temp = 1;
    // Estresse normalizado para o piloto de referência: 0,7 + 0,6 × 0,1 = 0,76.
    for (let i = 0; i < voltas * 100; i++) F.gastarPneu(pneu, { dist: 1, volta: 100, slip: 6, agua, dt: 0 });
    assert.ok(Math.abs(pneu.desgaste - F.PENHASCO) < 1e-9, `${agua}: ${pneu.desgaste}`);
    assert.equal(F.vidaEmVoltas("intermediario", 1, agua), voltas);
  }
});

test("intermediário: pedido percorre o protocolo de rede e a seleção do box", () => {
  assert.equal(Box.compostoDaAcao("pneu5"), "intermediario");
  for (const pedido of ["macio", "medio", "duro", "chuva", "decidir", "manter", "intermediario"]) {
    assert.equal(S.desempacotar(S.empacotar({ pedido })).pedido, pedido);
  }
  const p = { pneu: "medio", pneuAtual: "medio", paradas: [], compostos: ["medio"] };
  assert.equal(F.jogosRestantes(p).intermediario, 2);
  assert.equal(F.compostoParaParada(p, "intermediario"), "intermediario");
  assert.equal(F.recomendarParada({ atual: "intermediario", agua: 0.45 }), "intermediario");
});


test("as recomendações consideram os pneus disponíveis no molhado", () => {
  const jogos = { macio: 2, medio: 2, duro: 2, chuva: 2, intermediario: 2 };
  assert.equal(F.recomendarParada({ atual: "medio", jogos, agua: 0.45 }), "intermediario");
  assert.equal(F.recomendarParada({ atual: "medio", jogos, agua: 1 }), "chuva");
  assert.equal(F.recomendarParada({ atual: "medio", jogos: { ...jogos, intermediario: 0 }, agua: 0.45 }), "chuva");
});


test("a estratégia recomenda o intermediário na garoa e avisa quando acaba", () => {
  const E = require("../public/corrida/estrategia-box.js");
  const jogos = { macio: 2, medio: 2, duro: 2, chuva: 2, intermediario: 2 };
  const e = { F, pneu: { composto: "medio", desgaste: 0.2 }, voltaAtual: 2, voltas: 8, jogos, agua: 0.45, chuva: 0.45 };
  assert.equal(E.sugerirBox(e).composto, "intermediario");
  assert.equal(E.sugerirBox({ ...e, pneu: { composto: "intermediario", desgaste: 0.9 } }).motivo, "pneu no fim");
  assert.equal(E.sugerirBox({ ...e, jogos: { ...jogos, chuva: 0 } }).composto, "intermediario");
});
