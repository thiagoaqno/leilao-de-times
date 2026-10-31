// A sensibilidade do volante (volante.js): só a entrada do navegador; a física e o servidor recebem o mesmo -1 a 1.
const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../public/corrida/volante.js");

test("o padrão não muda nada: teclado 1 e o analógico com a curva e a zona morta de sempre", () => {
  assert.equal(V.teclado(1), 1); assert.equal(V.teclado(-1), -1); assert.equal(V.teclado(0), 0);
  assert.equal(V.analogico(0.1), 0); // dentro da zona morta de 0,15
  assert.equal(V.analogico(1), 1);
  const meio = V.analogico(0.575); assert.ok(Math.abs(meio - 0.5 ** 1.4) < 1e-9);
});
test("a sensibilidade do teclado escala o volante e nunca passa de -1 a 1", () => {
  assert.equal(V.teclado(1, 0.5), 0.5); assert.equal(V.teclado(-1, 0.5), -0.5);
  assert.equal(V.teclado(1, 1.5), 1); assert.equal(V.teclado(-1, 1.5), -1);
});
test("o ganho e a zona morta do analógico", () => {
  assert.ok(V.analogico(0.6, 0.15, 1.5) > V.analogico(0.6, 0.15, 1));
  assert.ok(V.analogico(0.6, 0.15, 0.5) < V.analogico(0.6, 0.15, 1));
  assert.equal(V.analogico(0.3, 0.4), 0); assert.ok(V.analogico(0.3, 0) > 0);
  assert.equal(V.analogico(1, 0.15, 5), 1); assert.equal(V.analogico(-1, 0.15, 5), -1);
  assert.equal(V.analogico(-0.8, 0.15, 1) < 0, true);
});
test("os ajustes ficam dentro dos limites e um valor ruim volta ao padrão", () => {
  assert.equal(V.ajustar("k", 10), 1.5); assert.equal(V.ajustar("k", 0), 0.3); assert.equal(V.ajustar("zona", 0.9), 0.4);
  assert.equal(V.ajustar("p", "abc"), 1); assert.equal(V.ajustar("zona", undefined), 0.15);
});
