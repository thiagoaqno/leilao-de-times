// Carreira em grupo: o resultado de um jogo que um amigo ainda não jogou não aparece para quem já passou daquela semana
// (a final da Libertadores e da Champions, por exemplo, era mostrada com o resultado da simulação).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const G = require("../carreira.js").grupo;

const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
const jogos = (clube, antesDe) => save.calendarioMundo.filter((j) => (j.casa === clube || j.fora === clube) && j.semana < antesDe).map((j) => j.id);
const veja = (clube) => G.estado(G.vistaDe(save, clube));

test("a Ana passou da final, mas a Bia ainda não jogou: a Ana não vê o campeão nem o pop-up da festa", () => {
  const lib = save.competicoes.libertadores, final = lib.jogos.find((j) => j.fase === "final");
  assert.ok(final && final.semana >= 50);
  save.humanos.flamengo.estado.jogosJogados = jogos("flamengo", 100); // a Ana está lá na frente
  save.humanos.palmeiras.estado.jogosJogados = jogos("palmeiras", 40); // a Bia ainda está nas oitavas
  const e = veja("flamengo");
  assert.strictEqual(e.competicoes.libertadores.campeao, null, "campeão escondido");
  assert.strictEqual(e.competicoes.champions.campeao, null);
  assert.strictEqual(e.competicoes.libertadores.festa, undefined, "sem pop-up da festa");
  assert.ok(!e.competicoes.libertadores.jogos.some((j) => j.semana >= 40 && !save.humanos.flamengo.estado.jogosJogados.includes(j.id)), "os jogos de outros depois da semana da Bia não aparecem");
  assert.strictEqual(e.competicoes.libertadores.fase !== "encerrada", true);
});

test("quando todos os técnicos passam da semana da final, o resultado aparece", () => {
  save.humanos.palmeiras.estado.jogosJogados = jogos("palmeiras", 100);
  const e = veja("flamengo");
  assert.ok(e.competicoes.libertadores.campeao, "a final já passou para todo mundo");
  assert.ok(e.competicoes.champions.campeao);
});

test("a carreira solo continua igual: vale a semana do próprio clube", () => {
  const solo = G.vistaDe(save, "flamengo");
  assert.strictEqual(typeof solo.semanaDosHumanos, "function");
  assert.ok(!Object.keys(solo).includes("semanaDosHumanos"), "não é copiado de volta para o save");
});
