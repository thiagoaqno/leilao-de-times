const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const Robos = require("../corrida-robos.js");

const piloto = (largada, ...compostos) => { const p = { pneu: largada, pneuAtual: largada, compostos: [largada], paradas: [] }; compostos.forEach((c, i) => F1.registrarParada(p, { volta: i + 1, tempo: 2.5, composto: c })); return p; };

test("conta a largada e cada parada", () => {
  assert.deepEqual(F1.jogosRestantes(piloto("macio")), { macio: 1, medio: 2, duro: 2 });
  assert.deepEqual(F1.jogosRestantes(piloto("macio", "duro", "macio")), { macio: 0, medio: 2, duro: 1 });
});

test("recusa o terceiro macio e troca por outro composto com jogo", () => {
  const p = piloto("macio", "medio", "macio");
  assert.equal(F1.podeUsar(p, "macio"), false);
  assert.equal(F1.compostoParaParada(p, "macio"), "duro"); // diferente do atual, com jogo
  assert.equal(F1.compostoParaParada(p, "duro"), "duro"); // o pedido com jogo vale
});

test("tudo esgotado: nunca fica sem opção", () => {
  const p = piloto("macio", "medio", "duro", "macio", "medio", "duro");
  assert.ok(F1.PNEUS[F1.compostoParaParada(p, "macio")]);
});

test("a regra dos dois compostos continua: quem só usou um recebe outro", () => {
  const p = piloto("duro", "duro"); // esgotou o duro, só usou ele
  const c = F1.compostoParaParada(p, "duro");
  assert.notEqual(c, "duro");
  assert.equal(new Set([...p.compostos, c]).size, 2);
});

test("o robô não escolhe composto esgotado", () => {
  const p = piloto("duro", "macio", "macio"); // macio esgotado
  for (const restam of [1, 2, 5, 12]) {
    const c = Robos.escolherComposto(restam, new Set(p.compostos), 1, p);
    assert.notEqual(c, "macio", `restam ${restam}`);
  }
});
