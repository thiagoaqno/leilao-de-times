const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const indice = require("../public/carreira/base/mundo-2026.js");

const bases = Object.fromEntries(["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => { const b = require(`../public/carreira/base/${id}-2026.js`); return [b.id, b]; }));

test("temporada mundial termina com campeões determinísticos", () => {
  const a = Temporada.simularMundo({ bases, indice, semente: "temporada-completa" });
  const b = Temporada.simularMundo({ bases, indice, semente: "temporada-completa" });
  assert.deepStrictEqual(a.campeoes, b.campeoes);
  assert.deepStrictEqual(Object.keys(a.campeoes).sort(), ["alemanha-2026", "brasileirao-2026", "champions", "espanha-2026", "franca-2026", "inglaterra-2026", "italia-2026", "libertadores", "mundial"].sort());
  assert.ok(Object.values(a.campeoes).every(Boolean));
});

test("Mundial recebe campeões e vices das duas copas", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "mundial-certo" }), lib = m.competicoes.libertadores, cha = m.competicoes.champions;
  assert.deepStrictEqual(m.competicoes.mundial.participantes, [lib.campeao, cha.vice, cha.campeao, lib.vice]);
  assert.deepStrictEqual(m.competicoes.mundial.jogos.slice(0, 2).map((j) => [j.casa, j.fora]), [[lib.campeao, cha.vice], [cha.campeao, lib.vice]]);
});

test("nenhum clube joga duas vezes na mesma semana", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "sem-conflito" });
  assert.strictEqual(Temporada.conflitoDeCalendario(m.jogos), null);
});

test("empate eliminatório termina nos pênaltis", () => {
  const inicial = Temporada.simularMundo({ bases, indice, semente: "penaltis" });
  const final = inicial.competicoes.libertadores.jogos.find((j) => j.fase === "final");
  const alterado = Temporada.simularMundo({ bases, indice, semente: "penaltis", resultadosFixos: { [final.id]: { placar: [1, 1] } } });
  assert.ok(alterado.competicoes.libertadores.jogos.find((j) => j.id === final.id).penaltis);
  assert.ok(alterado.competicoes.libertadores.campeao);
});
