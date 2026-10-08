const test = require("node:test");
const assert = require("node:assert/strict");

global.window = global;
require("../public/carreira/animacoes.js");

test("a prancheta tem 40 falas diferentes, dez para cada situação", () => {
  const { FALAS, TODAS_AS_FALAS } = AnimacoesCarreira;
  assert.deepEqual(Object.keys(FALAS), ["campo", "banco", "troca", "formacao"]);
  for (const grupo of Object.values(FALAS)) assert.equal(grupo.length, 10);
  assert.equal(TODAS_AS_FALAS.length, 40);
  assert.equal(new Set(TODAS_AS_FALAS).size, 40);
});

test("a fala de um jogador é estável dentro da mesma situação", () => {
  const { falaDe } = AnimacoesCarreira;
  assert.equal(falaDe("flamengo-1", "campo"), falaDe("flamengo-1", "campo"));
  assert.ok(AnimacoesCarreira.FALAS.banco.includes(falaDe("flamengo-2", "banco")));
});
