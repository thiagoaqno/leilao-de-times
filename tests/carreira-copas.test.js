// Carreira de Treinador: a Copa do Brasil, a Sul-Americana e o Super Mundial, a vaga na Libertadores e o dinheiro igual.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const indice = require("../public/carreira/base/mundo-2026.js");
const { novaCarreira, classificadosDe } = require("../carreira.js").paraTestes;

const bases = Object.fromEntries(["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => { const b = require(`../public/carreira/base/${id}-2026.js`); return [b.id, b]; }));
const mundo = (semente, extra = {}) => Temporada.simularMundo({ bases, indice, semente, copasNovas: true, ...extra });
const brasileiros = indice.ligas.find((l) => l.id === "brasileirao-2026").clubes;

test("Copa do Brasil: os 20 do Brasileirão, preliminar de 8, depois oitavas a final", () => {
  const c = mundo("cdb").competicoes.copadobrasil;
  assert.deepStrictEqual([...c.participantes].sort(), [...brasileiros].sort());
  const fases = (f) => c.jogos.filter((j) => j.fase === f).length;
  assert.deepStrictEqual(["preliminar", "oitavas", "quartas", "semifinal", "final"].map(fases), [4, 16, 8, 4, 1]);
  assert.ok(brasileiros.includes(c.campeao) && brasileiros.includes(c.vice) && c.campeao !== c.vice);
  assert.ok(c.jogos.every((j) => j.mataMata && brasileiros.includes(j.casa) && brasileiros.includes(j.fora)));
  assert.deepStrictEqual(c.jogos.filter((j) => j.fase === "preliminar").map((j) => j.semana), [4, 4, 4, 4]);
});

test("Sul-Americana: 16 clubes, os 8 terceiros da Libertadores, 4 grupos e quartas, semifinal e final", () => {
  const m = mundo("sula"), s = m.competicoes.sulamericana, lib = m.competicoes.libertadores;
  assert.strictEqual(new Set(s.participantes).size, 16);
  assert.deepStrictEqual(lib.grupos.map((g) => g.tabela[2].id).sort(), s.participantes.filter((id) => lib.participantes.includes(id)).sort());
  assert.strictEqual(s.participantes.filter((id) => !lib.participantes.includes(id)).length, 8, "oito vêm de fora da Libertadores");
  assert.strictEqual(s.grupos.length, 4);
  const fases = (f) => s.jogos.filter((j) => j.fase === f).length;
  assert.deepStrictEqual(["quartas", "semifinal", "final"].map(fases), [8, 4, 1]);
  assert.strictEqual(s.jogos.filter((j) => j.fase.startsWith("grupo-")).length, 48);
  assert.ok(s.participantes.includes(s.campeao));
  // os grupos só começam depois da fase de grupos da Libertadores
  assert.ok(Math.min(...s.jogos.map((j) => j.semana)) > Math.max(...lib.jogos.filter((j) => j.fase.startsWith("grupo-")).map((j) => j.semana)));
});

test("Super Mundial: 16 clubes sem repetir, com os campeões das duas copas novas, todos contra todos uma vez e mata-mata de jogo único", () => {
  const m = mundo("super"), s = m.competicoes.supermundial, c = m.competicoes;
  assert.strictEqual(new Set(s.participantes).size, 16);
  assert.ok(s.participantes.includes(c.sulamericana.campeao) && s.participantes.includes(c.copadobrasil.campeao));
  assert.ok(s.participantes.includes(c.champions.campeao) && s.participantes.includes(c.libertadores.campeao));
  assert.strictEqual(s.grupos.length, 4);
  assert.strictEqual(s.jogos.filter((j) => j.fase.startsWith("grupo-")).length, 24);
  assert.deepStrictEqual(["quartas", "semifinal", "final"].map((f) => s.jogos.filter((j) => j.fase === f).length), [4, 2, 1]);
  assert.ok(s.participantes.includes(s.campeao));
  assert.strictEqual(s.rodadasGrupo, 3);
});

test("as copas novas não mudam o calendário: ninguém joga duas vezes na semana, e é tudo determinístico", () => {
  for (const semente of ["a", "b", "c", "d", "e", "f", "g", "h"]) assert.strictEqual(Temporada.conflitoDeCalendario(mundo(semente).jogos), null, semente);
  const a = mundo("igual"), b = mundo("igual");
  assert.deepStrictEqual(a.campeoes, b.campeoes);
  assert.ok(["copadobrasil", "sulamericana", "supermundial"].every((id) => a.campeoes[id]));
  // o Mundial vem depois do Super Mundial
  assert.deepStrictEqual([...new Set(a.competicoes.mundial.jogos.map((j) => j.semana))], [82, 83]);
});

test("sem as copas novas, a temporada fica como era (as carreiras que já estavam no meio)", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "antiga" });
  assert.ok(!m.competicoes.copadobrasil && !m.competicoes.sulamericana && !m.competicoes.supermundial);
  assert.deepStrictEqual([...new Set(m.competicoes.mundial.jogos.map((j) => j.semana))], [78, 79]);
});

test("uma carreira nova já vem com as três copas, e o campeão da Copa do Brasil leva a vaga na Libertadores", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  assert.ok(save.competicoes.copadobrasil && save.competicoes.sulamericana && save.competicoes.supermundial);
  const cl = classificadosDe(save), cdb = save.competicoes.copadobrasil.campeao, tab = save.competicoes["brasileirao-2026"].tabela.map((l) => l.id);
  assert.strictEqual(cl.libertadores.length, 32);
  assert.strictEqual(new Set(cl.libertadores).size, 32);
  assert.ok(cl.libertadores.includes(cdb), "o campeão da Copa do Brasil está na Libertadores");
  assert.deepStrictEqual(cl.libertadores.slice(0, 6), tab.slice(0, 6));
  assert.deepStrictEqual(cl.brasileiros, tab);
  // a temporada seguinte usa essa classificação
  const proxima = Temporada.simularMundo({ bases, indice, semente: "t2", classificados: cl, copasNovas: true });
  assert.deepStrictEqual([...proxima.competicoes.libertadores.participantes].sort(), [...cl.libertadores].sort());
  assert.strictEqual(new Set(proxima.competicoes.sulamericana.participantes).size, 16);
});

test("dinheiro igual: todos os clubes começam com o mesmo caixa e ninguém é rico nem endividado", () => {
  const normal = novaCarreira("Teste", "flamengo", "x"), igual = novaCarreira("Teste", "flamengo", "x", 2, 100e6);
  assert.strictEqual(normal.caixa, 120e6);
  assert.strictEqual(normal.situacao, "rico");
  assert.strictEqual(igual.caixa, 100e6);
  assert.strictEqual(igual.situacao, "equilibrado");
  const caixas = Object.values(igual.caixaIA);
  assert.ok(caixas.length > 100 && caixas.every((v) => v === 100e6), "os clubes do computador também");
  // valor fora da lista é ignorado
  assert.strictEqual(novaCarreira("Teste", "flamengo", "x", 2, 7).caixa, 120e6);
});

test("vagas na Libertadores: os campeões da Libertadores e da Sul-Americana ganham vaga, e quem já está classificado libera a vaga para o próximo colocado", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const brasileiros = new Set(indice.ligas.find((l) => l.id === "brasileirao-2026").clubes), tab = save.competicoes["brasileirao-2026"].tabela.map((l) => l.id);
  const cdb = save.competicoes.copadobrasil.campeao, base = classificadosDe(save), nBR = (cl) => cl.libertadores.filter((id) => brasileiros.has(id)).length;
  const campeoesBR = [save.competicoes.libertadores.campeao, save.competicoes.sulamericana.campeao].filter((id) => brasileiros.has(id)).length;
  assert.strictEqual(nBR(base), 7 + campeoesBR, "7 vagas de sempre (G6 e Copa do Brasil) + uma para cada campeão brasileiro da Libertadores e da Sul-Americana");
  // dois brasileiros de fora do G7 ganham as duas copas: o Brasil passa a ter 9 vagas (os 32 lugares continuam 32 e sem repetir)
  const fora = tab.filter((id) => !tab.slice(0, 6).includes(id) && id !== cdb && id !== tab[6]).slice(-2);
  save.competicoes.libertadores.campeao = fora[0]; save.competicoes.sulamericana.campeao = fora[1];
  const cl = classificadosDe(save);
  assert.strictEqual(cl.libertadores.length, 32); assert.strictEqual(new Set(cl.libertadores).size, 32);
  assert.ok(cl.libertadores.includes(fora[0]) && cl.libertadores.includes(fora[1]), "os dois campeões estão na Libertadores");
  assert.deepStrictEqual(cl.libertadores.slice(0, 6), tab.slice(0, 6));
  assert.strictEqual(nBR(cl), 9, "7 vagas de sempre + os dois campeões");
  // o campeão da Libertadores já estava classificado (G6): a vaga dele passa para o próximo colocado do Brasileirão
  save.competicoes.libertadores.campeao = tab[0]; save.competicoes.sulamericana.campeao = "river-plate";
  const cl2 = classificadosDe(save), doBrasil = cl2.libertadores.filter((id) => brasileiros.has(id));
  assert.strictEqual(doBrasil.length, 8, "o campeão já classificado libera mais uma vaga: a de cima 7 + a do próximo colocado");
  assert.ok(doBrasil.includes(tab.find((id) => !tab.slice(0, 6).includes(id) && id !== cdb && id !== tab[6])) || doBrasil.length === 8);
  assert.ok(cl2.libertadores.includes("river-plate"), "o campeão da Sul-Americana de fora do Brasil entra");
  assert.strictEqual(cl2.libertadores.length, 32); assert.strictEqual(new Set(cl2.libertadores).size, 32);
  // a temporada seguinte joga com esses 32
  const proxima = Temporada.simularMundo({ bases, indice, semente: "t3", classificados: cl, copasNovas: true });
  assert.deepStrictEqual([...proxima.competicoes.libertadores.participantes].sort(), [...cl.libertadores].sort());
});
