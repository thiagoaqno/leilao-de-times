// Carreira em grupo: trocas entre técnicos (sem limites de nota, janela ou cota) e o arquivo das temporadas.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const G = require("../carreira.js").grupo;
const { novaCarreira, estado } = require("../carreira.js").paraTestes;

const CLUBES = ["flamengo", "palmeiras", "corinthians"];
const sala = () => G.novaCarreiraGrupo(CLUBES.map((c, i) => ({ clube: c, nome: `T${i}` })), { temporadas: 2, aporte: 0 });
const elenco = (save, c) => G.elencoDe(G.vistaDe(save, c), c).sort((a, b) => b.nota - a.nota);
const estadoDe = (save, c) => save.humanos[c].estado;

test("a troca entre técnicos vale com qualquer nota e janela fechada, sem gastar a cota de compras", () => {
  const save = sala();
  const a = elenco(save, "flamengo"), b = elenco(save, "palmeiras");
  const craque = a[0], reserva = b[b.length - 1];
  assert.ok(craque.nota >= 80 && reserva.nota < craque.nota - 10, "uma troca muito desigual");
  const cota = JSON.stringify(estadoDe(save, "flamengo").comprasJanela), caixaA = G.vistaDe(save, "flamengo").caixa, caixaB = G.vistaDe(save, "palmeiras").caixa;
  const t = { de: "flamengo", para: "palmeiras", dou: [craque.id], recebo: [reserva.id], dinheiro: 5e6 };
  assert.strictEqual(G.erroDeTroca(save, t), null);
  G.executarTroca(save, t);
  assert.strictEqual(G.donoDe(save, craque.id), "palmeiras");
  assert.strictEqual(G.donoDe(save, reserva.id), "flamengo");
  assert.strictEqual(G.vistaDe(save, "flamengo").caixa, caixaA - 5e6);
  assert.strictEqual(G.vistaDe(save, "palmeiras").caixa, caixaB + 5e6);
  assert.strictEqual(JSON.stringify(estadoDe(save, "flamengo").comprasJanela), cota, "a cota de compras da turma não muda");
  // a notícia é a mesma no feed dos três técnicos (inclusive de quem ficou de fora) e o aviso chega aos dois lados
  const posts = CLUBES.map((c) => estadoDe(save, c).feed.filter((p) => p.tipo === "troca"));
  assert.ok(posts.every((l) => l.length === 1));
  assert.ok(posts.every((l) => l[0].texto === posts[0][0].texto && l[0].perfil === "galeranews"));
  assert.ok(posts[0][0].texto.includes("TROCA FECHADA") && posts[0][0].texto.includes(craque.nome));
  for (const c of ["flamengo", "palmeiras"]) assert.ok(estadoDe(save, c).caixaEntrada.some((e) => e.tipo === "troca"));
  assert.ok(!estadoDe(save, "corinthians").caixaEntrada.some((e) => e.tipo === "troca"));
});

test("a troca confere donos, elencos e caixa", () => {
  const save = sala();
  const a = elenco(save, "flamengo"), b = elenco(save, "palmeiras");
  const erro = (t) => G.erroDeTroca(save, { de: "flamengo", para: "palmeiras", dou: [], recebo: [], dinheiro: 0, ...t });
  assert.ok(erro({ para: "flamengo", dou: [a[0].id] }), "contra si mesmo");
  assert.ok(erro({ para: "gremio", dou: [a[0].id] }), "só técnicos da sala");
  assert.ok(erro({}), "proposta sem jogador");
  assert.ok(erro({ dou: [b[0].id] }), "oferecer jogador que não é seu");
  assert.ok(erro({ recebo: [a[0].id] }), "pedir jogador que não é do outro");
  assert.ok(erro({ dou: [a[0].id], dinheiro: 1e12 }), "dinheiro que não existe");
  assert.ok(erro({ dou: [a[0].id], recebo: [b[0].id], dinheiro: -1e12 }), "o outro não tem esse dinheiro");
  assert.ok(erro({ dou: a.slice(0, a.length - 17).map((j) => j.id) }), "elenco abaixo do mínimo");
  assert.strictEqual(erro({ dou: [a[0].id], recebo: [b[0].id] }), null);
});

test("o arquivo guarda a temporada que acabou: campeões, tabelas, chaves, prêmios e os técnicos", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube);
  assert.deepStrictEqual(estado(save).arquivo, [], "no começo não há nada guardado");
  save.jogosJogados = meus.map((j) => j.id); save.rodada = save.jogosJogados.length;
  const e = estado(save), a = e.arquivo[0];
  assert.strictEqual(e.arquivo.length, 1);
  assert.strictEqual(a.temporada, save.temporada);
  for (const id of ["brasileirao-2026", "libertadores", "copadobrasil", "mundial"]) assert.ok(a.competicoes[id] && a.competicoes[id].campeao && a.competicoes[id].vice, id);
  assert.ok(a.competicoes["brasileirao-2026"].tabela.length === 20 && !a.competicoes["brasileirao-2026"].tabela[0].ultimos);
  assert.ok(a.competicoes.libertadores.chave.length >= 3 && a.competicoes.libertadores.grupos.length >= 4);
  assert.ok(a.competicoes.copadobrasil.festa.final && a.competicoes.copadobrasil.festa.elenco.length > 10);
  assert.ok(a.artilharia.length === 10 && a.artilharia[0].nome && a.artilharia[0].gols >= a.artilharia[9].gols);
  assert.ok(a.premios.artilheiro && a.premios.goleada && a.premios.goleada.placar.length === 2);
  assert.strictEqual(a.tecnicos.length, 1);
  assert.strictEqual(a.tecnicos[0].clube, "flamengo");
  assert.strictEqual(typeof a.tecnicos[0].tecnico, "string");
  assert.ok(a.tecnicos[0].pontos >= 0 && Array.isArray(a.tecnicos[0].titulos));
  estado(save); assert.strictEqual(estado(save).arquivo.length, 1, "uma vez só por temporada");
});
