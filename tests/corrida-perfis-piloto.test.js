const test = require("node:test"), assert = require("node:assert/strict");
const Estilos = require("../corrida-estilos.js"), Pilotos = require("../public/corrida/f1-pilotos-2026.js"), Piloto = require("../corrida-piloto.js");

test("todo piloto do grid tem perfil de pilotagem completo, de 0 a 1", () => {
  for (const { id } of Pilotos.PILOTOS) {
    assert.ok(Estilos.PILOTAGEM[id], id);
    const p = Estilos.dePiloto(id);
    for (const [campo] of Estilos.CAMPOS) assert.ok(p[campo] >= 0 && p[campo] <= 1, `${id}.${campo}`);
    assert.ok(Estilos.BOXES.includes(p.box), id);
  }
});
test("o ajuste do admin vale, é validado e pode ser restaurado", () => {
  const antes = Estilos.dePiloto("norris");
  assert.equal(Estilos.limpar({ erro: 2 }), null);
  assert.equal(Estilos.limpar({ box: "nada" }), null);
  assert.deepEqual(Estilos.limpar({ erro: 0.333, invalido: 1 }), { erro: 0.33 });
  Estilos.ajustar("norris", { frenagem: 0.1 });
  assert.equal(Estilos.dePiloto("norris").frenagem, 0.1);
  assert.equal(Estilos.dePiloto("norris").ataque, antes.ataque);
  Estilos.ajustar("norris", null);
  assert.deepEqual(Estilos.dePiloto("norris"), antes);
});
test("o perfil nunca passa do limite do pneu: o máximo chega nele e os outros ficam abaixo", () => {
  const maximo = Piloto.jeitoDe({ frenagem: 1, entrada: 1, retomada: 1, zebra: 1, consistencia: 1, erro: 0 });
  const baixo = Piloto.jeitoDe({ frenagem: 0, entrada: 0, retomada: 0, zebra: 0, consistencia: 0, erro: 1 });
  assert.equal(maximo.entradaK, 1);
  assert.equal(maximo.antecipa, Piloto.PILOTO.antecipa);
  assert.equal(maximo.sigma, 0);
  assert.ok(baixo.entradaK < 1 && baixo.antecipa > maximo.antecipa && baixo.rampaGas < maximo.rampaGas && baixo.sigma > 0);
});
