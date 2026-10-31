// O pedido de box pelo teclado (box-escolha.js) e o pneu que o carro realmente leva: B e depois 1, 2, 3 ou 4, com e sem stop-and-go pendente.
// Regressão do relato "apertei B e depois 4 e saiu o macio/médio": o B de confirmação cancelava o pedido e o padrão do stop-and-go era o pneu atual.
const test = require("node:test");
const assert = require("node:assert/strict");
const BE = require("../public/corrida/box-escolha.js");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const S = require("../public/corrida/sim.js");
const Equipes = require("../public/corrida/f1-equipes.js");

const JOGOS = { macio: 2, medio: 2, duro: 2, chuva: 2 };
test("as ações de tecla 1 a 4 são macio, médio, duro e chuva, na ordem", () => {
  assert.deepEqual(["pneu1", "pneu2", "pneu3", "pneu4"].map(BE.compostoDaAcao), ["macio", "medio", "duro", "chuva"]);
  assert.equal(BE.compostoDaAcao("box"), null);
});
test("o número escolhe e pede na hora (com ou sem stop-and-go, com ou sem chuva)", () => {
  for (const stopGo of [false, true]) for (const atual of ["macio", "medio", "duro"]) for (const c of BE.ORDEM) {
    if (c === atual && !stopGo) continue; // (o mesmo pneu sem stop-and-go não é uma escolha útil, mas também não quebra)
    const r = BE.acaoDoDigito({ composto: c, pedido: null, jogos: JOGOS, atual, stopGo });
    assert.deepEqual(r, { acao: "pedir", composto: c }, `${stopGo ? "com" : "sem"} stop-and-go, em ${atual}, tecla de ${c}`);
  }
});
test("o mesmo número do pedido já feito é só confirmação e esgotado avisa", () => {
  assert.equal(BE.acaoDoDigito({ composto: "chuva", pedido: "chuva", jogos: JOGOS, atual: "medio", stopGo: true }).acao, "manter");
  assert.equal(BE.acaoDoDigito({ composto: "chuva", pedido: null, jogos: { ...JOGOS, chuva: 0 }, atual: "medio", stopGo: false }).acao, "esgotado");
  assert.equal(BE.acaoDoDigito({ composto: "medio", pedido: null, jogos: { ...JOGOS, medio: 0 }, atual: "medio", stopGo: true }).acao, "pedir"); // só cumpre o stop-and-go
});
test("o B abre, depois pede e, com o pedido feito, NUNCA cancela nem troca o pneu", () => {
  assert.equal(BE.acaoDoB({ naPaginaBox: false, pedido: null }), "abrir");
  assert.equal(BE.acaoDoB({ naPaginaBox: false, pedido: "chuva" }), "abrir");
  assert.equal(BE.acaoDoB({ naPaginaBox: true, pedido: null }), "pedir");
  assert.equal(BE.acaoDoB({ naPaginaBox: true, pedido: "chuva" }), "manter");
});
test("o padrão de B, B: o seguinte ao atual; com stop-and-go e pneu bom, só cumpre; pneu gasto, troca; a seleção vale", () => {
  assert.equal(BE.padraoDoB({ atual: "medio", jogos: JOGOS, stopGo: false }), "duro");
  assert.equal(BE.padraoDoB({ atual: "duro", jogos: JOGOS, stopGo: false }), "chuva");
  assert.equal(BE.padraoDoB({ atual: "medio", jogos: JOGOS, stopGo: true, desgaste: 0.1 }), "medio");
  assert.equal(BE.padraoDoB({ atual: "medio", jogos: JOGOS, stopGo: true, desgaste: 0.7 }), "duro");
  assert.equal(BE.padraoDoB({ atual: "medio", jogos: JOGOS, stopGo: true, desgaste: 0.1, selecionado: "chuva" }), "chuva");
  assert.equal(BE.padraoDoB({ atual: "medio", jogos: { ...JOGOS, duro: 0 }, stopGo: false }), "chuva");
});

// ---- o pedido chega ao carro: a física (o mesmo código do servidor), pelo fio (empacotar/desempacotar), com e sem stop-and-go ----
const spec = Equipes.specDaEquipe("mclaren");
function pitStop(pedido, stopGo) {
  const tr = S.criarPista(T.PISTAS.interlagos, "interlagos"), c = S.novo(tr, { grid: 0, f1: true, pneu: Object.assign(F1.pneuNovo("medio"), { desgaste: 0.6, temp: 0.9 }), box: true });
  const cor = tr.corredor, ini = (cor.i0 - 40 + tr.n) % tr.n, q = tr.pts[ini];
  Object.assign(c, { x: q.x, y: q.y, z: q.h, a: Math.atan2(q.ty, q.tx), idx: ini, v: 150, marcha: 5 });
  const amb = { spec, voltas: 5, laps: 0, paradas: 0, semente: 99, id: "ana", grid: 3, f1: true, outros: [], stopGo: stopGo ? 8 : 0 }, ev = [], eventos = [], ent = {};
  for (let i = 0; i < 120 * 60; i++) {
    ev.length = 0;
    const e = S.desempacotar(S.empacotar({ gas: c.v < (c.box.fase ? 9999 : 150) ? 1 : 0, brake: 0, steer: 0, pedido }), ent);
    S.passo(c, e, amb, tr, ev); for (const x of ev) eventos.push({ ...x });
  }
  return { sai: eventos.find((e) => e.t === "box" && e.fase === "sai"), pneuFinal: c.pneu.composto };
}
test("o carro sai com o composto pedido: macio, médio, duro e chuva, com e sem stop-and-go", () => {
  for (const stopGo of [false, true]) for (const c of BE.ORDEM) {
    const r = pitStop(c, stopGo);
    assert.ok(r.sai, `${c}: terminou a parada`);
    assert.equal(r.sai.composto, c, `${stopGo ? "com" : "sem"} stop-and-go: o evento de saída leva ${c}`);
    assert.equal(r.pneuFinal, c, `${stopGo ? "com" : "sem"} stop-and-go: o carro sai com ${c}`);
  }
});
test("o servidor mantém o pedido de chuva quando há jogo (e só troca o esgotado)", () => {
  const p = { pneu: "medio", pneuAtual: "medio", paradas: [], compostos: ["medio"] };
  for (const c of BE.ORDEM) assert.equal(F1.compostoParaParada(p, c), c);
  const gasto = { pneu: "chuva", pneuAtual: "chuva", paradas: [{ composto: "chuva" }], compostos: ["chuva"] };
  const c = F1.compostoParaParada(gasto, "chuva");
  assert.notEqual(c, "chuva"); assert.ok(F1.jogosRestantes(gasto)[c] > 0, "só um esgotado é trocado, por um composto que ainda tem jogo");
});
