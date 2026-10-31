// A sugestão de box do MFD (estrategia-box.js): pneu, clima, dois compostos, stop-and-go e o controle de spam.
const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/corrida/f1-regras.js");
const E = require("../public/corrida/estrategia-box.js");
const H = require("../public/corrida/hud-mfd.js");

const base = (o = {}) => ({ F, pneu: { composto: "medio", desgaste: 0.2 }, voltaAtual: 3, voltas: 20, jogos: { macio: 2, medio: 1, duro: 2, chuva: 2 }, compostosUsados: 1,
  janela: { precisa: true, abre: 9, fecha: 12, obrigatoria: true }, agua: 0, chuva: 0, mudanca: null, tempoVolta: 80, stopGo: null, pedido: null, emBox: false, ...o });

test("longe da janela e com pista seca não sugere nada", () => assert.equal(E.sugerirBox(base()), null));
test("a uma volta da janela sugere a parada e, sem 2º composto, outro composto", () => {
  const s = E.sugerirBox(base({ voltaAtual: 8 }));
  assert.equal(s.razao, "dois"); assert.notEqual(s.composto, "medio"); assert.match(s.motivo, /2º composto/);
});
test("com dois compostos já usados é só desgaste", () => {
  const s = E.sugerirBox(base({ voltaAtual: 8, compostosUsados: 2, jogos: { macio: 1, medio: 1, duro: 2, chuva: 2 }, janela: { precisa: true, abre: 9, fecha: 12, obrigatoria: false } }));
  assert.equal(s.razao, "pneu"); assert.notEqual(s.composto, "chuva");
});
test("pneu além do penhasco: sugere já, mesmo fora da janela", () => {
  const s = E.sugerirBox(base({ pneu: { composto: "medio", desgaste: F.PENHASCO + 0.05 }, janela: null }));
  assert.equal(s.razao, "pneu"); assert.equal(s.motivo, "pneu no fim");
});
test("chuva chegando com pneu seco sugere o de chuva; pista secando com o de chuva sugere seco", () => {
  assert.equal(E.sugerirBox(base({ mudanca: { tipo: "comeca", em: 30 } })).composto, "chuva");
  assert.equal(E.sugerirBox(base({ agua: 0.6, chuva: 1 })).motivo, "pista molhada");
  const s = E.sugerirBox(base({ pneu: { composto: "chuva", desgaste: 0.1 }, agua: 0.05, chuva: 0 }));
  assert.equal(s.razao, "seca"); assert.notEqual(s.composto, "chuva");
});
test("com o pneu de chuva e a pista molhada não sugere trocar", () => assert.equal(E.sugerirBox(base({ pneu: { composto: "chuva", desgaste: 0.1 }, agua: 0.7, chuva: 1 })), null));
test("sem jogo de chuva não sugere chuva; última volta, pedido e box não sugerem", () => {
  assert.equal(E.sugerirBox(base({ mudanca: { tipo: "comeca", em: 10 }, jogos: { macio: 2, medio: 1, duro: 2, chuva: 0 } })), null);
  assert.equal(E.sugerirBox(base({ voltaAtual: 19, pneu: { composto: "medio", desgaste: 0.9 } })), null);
  assert.equal(E.sugerirBox(base({ pedido: "duro", pneu: { composto: "medio", desgaste: 0.9 } })), null);
  assert.equal(E.sugerirBox(base({ emBox: true, pneu: { composto: "medio", desgaste: 0.9 } })), null);
});
test("stop-and-go no prazo: cumpre junto, com o pneu atual se ainda está bom", () => {
  const s = E.sugerirBox(base({ stopGo: { s: 8, v: 1 }, janela: null }));
  assert.equal(s.razao, "stopgo"); assert.equal(s.composto, "medio"); assert.equal(s.stopGo, true);
  assert.equal(E.sugerirBox(base({ stopGo: { s: 8, v: 3 }, janela: null })), null);
});
test("o composto escolhido aguenta as voltas que faltam", () => {
  assert.equal(E.escolherSeco({ F, jogos: { macio: 2, medio: 2, duro: 2 }, voltasRestantes: 1 }), "macio");
  assert.equal(E.escolherSeco({ F, jogos: { macio: 2, medio: 2, duro: 2 }, voltasRestantes: 30 }), "duro"); // nenhum chega: o que mais dura
  assert.equal(E.escolherSeco({ F, jogos: { macio: 0, medio: 0, duro: 0 }, voltasRestantes: 5 }), null);
});
test("a janela de box do MFD e a sugestão combinam", () => {
  const j = H.janelaDeBox({ voltaAtual: 5, voltas: 20, voltasDePneu: 2.4, compostosUsados: 1, chuva: false });
  const s = E.sugerirBox(base({ voltaAtual: 5, janela: j, pneu: { composto: "medio", desgaste: 0.5 } }));
  assert.ok(s && s.razao === "dois");
});
test("gerirSugestao: 10 s, some, e só volta depois de uma volta ou se a situação mudar", () => {
  const sug = { chave: "dois:duro", composto: "duro" };
  let r = E.gerirSugestao(null, sug, { agora: 0, volta: 8 });
  assert.equal(r.mostrar, true); assert.equal(r.restante, 10000);
  r = E.gerirSugestao(r.est, sug, { agora: 4000, volta: 8 }); assert.equal(r.mostrar, true); assert.equal(r.restante, 6000);
  r = E.gerirSugestao(r.est, sug, { agora: 10500, volta: 8 }); assert.equal(r.mostrar, false); // expirou
  r = E.gerirSugestao(r.est, sug, { agora: 11000, volta: 8 }); assert.equal(r.mostrar, false); // mesma volta: sem spam
  r = E.gerirSugestao(r.est, sug, { agora: 90000, volta: 9 }); assert.equal(r.mostrar, true); // outra volta: volta
  const outra = { chave: "chuva:chuva", composto: "chuva" };
  r = E.gerirSugestao(r.est, outra, { agora: 91000, volta: 9 }); assert.equal(r.mostrar, true); // situação nova
  r = E.gerirSugestao(r.est, null, { agora: 92000, volta: 9 }); assert.equal(r.mostrar, false);
});
