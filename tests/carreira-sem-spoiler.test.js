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

test("transferências: a rodada mostrada é a da liga (não a pessoal, que conta as copas) e quem está atrás não vê o que ainda não aconteceu", () => {
  const s = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const lista = (clube, n) => s.calendarioMundo.filter((j) => (j.casa === clube || j.fora === clube) && j.semana < n).map((j) => j.id);
  // a Ana jogou 16 jogos de liga e 11 de copa: a rodada pessoal é 27 e a da liga, 16 (semana 31)
  const ana = s.humanos.flamengo.estado;
  ana.jogosJogados = lista("flamengo", 32); ana.rodada = 27; ana.ultimo = { semana: 31, placar: [0, 0], casa: "flamengo", fora: "palmeiras", eventos: [] };
  s.humanos.palmeiras.estado.jogosJogados = lista("palmeiras", 20); s.humanos.palmeiras.estado.rodada = 12; // a Bia está lá atrás
  const alvo = G.elencoDe(G.vistaDe(s, "flamengo"), "liverpool")[0];
  G.concluirLeilao(s, { jogador: alvo.id, dono: "liverpool", comprador: "flamengo", valor: 1e6 });
  const da = G.estado(G.vistaDe(s, "flamengo")), dabia = G.estado(G.vistaDe(s, "palmeiras"));
  const t = da.transferencias.find((x) => x.jogador === alvo.id);
  assert.ok(t, "a Ana vê a própria compra na hora");
  assert.strictEqual(t.semana, 31); assert.strictEqual(t.rodada, 27, "a rodada pessoal continua guardada");
  assert.ok(t.rl >= 15 && t.rl <= 16, `a rodada da liga é a que a tela mostra (${t.rl}), não ${t.rodada}`);
  assert.ok(!dabia.transferencias.some((x) => x.jogador === alvo.id), "a Bia ainda não chegou na semana 31: a transferência e a notícia não aparecem para ela");
  assert.ok(!(dabia.feed || []).some((f) => f.texto && f.texto.includes(alvo.nome) && f.tipo === "contratacao"));
  s.humanos.palmeiras.estado.jogosJogados = lista("palmeiras", 40);
  const depois = G.estado(G.vistaDe(s, "palmeiras"));
  assert.ok(depois.transferencias.some((x) => x.jogador === alvo.id), "quando a Bia passa da semana 31, a transferência aparece");
});
