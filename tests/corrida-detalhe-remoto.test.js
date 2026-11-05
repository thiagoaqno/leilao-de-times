const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const arquivo = fs.readFileSync(path.join(__dirname, "../public/corrida/detalhe-remoto.js"), "utf8");
const modulo = import("data:text/javascript;base64," + Buffer.from(arquivo).toString("base64"));

test("carros distantes reutilizam terreno por 160 ms e os próximos atualizam a cada quadro", async () => {
  const { detalheRemoto } = await modulo, carro = {}; let chamadas = 0;
  const calcular = () => ({ gz: ++chamadas });
  assert.equal(detalheRemoto(carro, 1500, 1000, calcular).gz, 1);
  assert.equal(detalheRemoto(carro, 1500, 1159, calcular).gz, 1);
  assert.equal(detalheRemoto(carro, 1500, 1160, calcular).gz, 2);
  assert.equal(detalheRemoto(carro, 500, 1161, calcular).gz, 3);
  assert.equal(detalheRemoto(carro, 500, 1162, calcular).gz, 4);
  assert.equal(detalheRemoto(carro, 1500, 10, calcular).gz, 5);
});
