// Futevôlei: as contas da encenação do toque (public/futevolei/encenacao.js). O arquivo é um módulo do navegador;
// aqui só as contas puras (o resto precisa de tela).
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const carregar = () => import(pathToFileURL(path.join(__dirname, "../public/futevolei/encenacao.js")).href);

test("encenação do futevôlei: o peso de cada toque", async () => {
  const E = await carregar();
  assert.strictEqual(E.pesoDoToque("peito", "passe"), 0);
  assert.strictEqual(E.pesoDoToque("cabeca", "passe"), 0);
  assert.strictEqual(E.pesoDoToque("frente", "ataque"), 1);
  assert.strictEqual(E.pesoDoToque("saque", "ataque"), 1);
  for (const g of ["shark", "bicicleta", "voleio"]) assert.strictEqual(E.pesoDoToque(g, "ataque"), 2, g);
  assert.strictEqual(E.pesoDoToque("shark", "ataque", "bicicleta"), 2);
  assert.strictEqual(E.pesoDoToque("frente", "passe", "bicicleta"), 2, "o estilo bicicleta é forte");
  // o hit-stop: o passe não para, o forte para mais e nunca passa de 60 ms (o tempo do toque é o jogo)
  assert.strictEqual(E.PAUSA[0], 0);
  assert.ok(E.PAUSA[2] > E.PAUSA[1] && E.PAUSA[2] <= 60);
});

test("encenação do futevôlei: velocidade em km/h e o jeito do número", async () => {
  const E = await carregar();
  assert.strictEqual(E.kmh(25), 90);
  assert.strictEqual(E.kmh(10), 36);
  assert.strictEqual(E.jeitoDaVelocidade(100).grito, "Bomba!");
  assert.strictEqual(E.jeitoDaVelocidade(80).grito, "Pancada!");
  assert.strictEqual(E.jeitoDaVelocidade(60).grito, "");
  assert.notStrictEqual(E.jeitoDaVelocidade(100).cor, E.jeitoDaVelocidade(40).cor);
});
