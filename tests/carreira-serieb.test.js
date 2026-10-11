// Carreira: o Brasileirão Série B (public/carreira/base/serieb-2026.js), o acesso e o rebaixamento na virada de temporada.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const Carreira = require("../carreira.js");
const { novaCarreira, estado, novaTemporada, completar, trocarDivisoes, ligaDoClube } = Carreira.paraTestes;
const G = Carreira.grupo;

const serieB = require("../public/carreira/base/serieb-2026.js");
const serieA = require("../public/carreira/base/brasileirao-2026.js");
const mundo = require("../public/carreira/base/mundo-2026.js");
const mediaOnze = (c) => c.jogadores.slice().sort((a, b) => b.nota - a.nota).slice(0, 11).reduce((s, j) => s + j.nota, 0) / 11;
const media = (lista) => lista.reduce((s, c) => s + mediaOnze(c), 0) / lista.length;
// termina a temporada do clube de uma vez (os jogos dele contam como jogados, com o placar simulado do mundo)
const terminar = (save) => { save.jogosJogados = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube).map((j) => j.id); save.rodada = save.jogosJogados.length; };

test("base: os 20 clubes da Série B, com elencos para escalar e abaixo da Série A", () => {
  assert.strictEqual(serieB.clubes.length, 20);
  const ids = new Set([...serieA.clubes, ...serieB.clubes].map((c) => c.id));
  assert.strictEqual(ids.size, 40, "nenhum id repete o da Série A");
  for (const c of serieB.clubes) {
    assert.strictEqual(c.liga, "serieb-2026"); assert.strictEqual(c.pais, "Brasil"); assert.ok(c.orcamento > 0 && c.escudo, c.id);
    assert.ok(c.jogadores.filter((j) => j.pos === "GOL").length >= 3, `${c.nome}: goleiros`);
    assert.ok(c.jogadores.length >= 18 && c.jogadores.length <= 28, c.nome);
  }
  assert.ok(media(serieB.clubes) < media(serieA.clubes) - 4, `Série B ${media(serieB.clubes).toFixed(1)} x Série A ${media(serieA.clubes).toFixed(1)}`);
  const liga = mundo.ligas.find((l) => l.id === "serieb-2026");
  assert.deepStrictEqual(liga.clubes, serieB.clubes.map((c) => c.id), "o índice do mundo traz a Série B");
});

test("a Série B joga 38 rodadas nas mesmas semanas do Brasileirão (a rodada e a janela andam juntas)", () => {
  const save = novaCarreira("Teste", "sport", "x");
  const semanas = (id) => [...new Set(save.competicoes[id].jogos.map((j) => j.semana))].sort((a, b) => a - b);
  assert.deepStrictEqual(semanas("serieb-2026"), semanas("brasileirao-2026"));
  const e = estado(save);
  assert.strictEqual(e.liga, "serieb-2026"); assert.strictEqual(e.tabela.length, 20);
  assert.strictEqual(e.rodadasLiga, 38); assert.strictEqual(e.total, 38, "sem copa: só os jogos da liga");
  assert.ok(!save.competicoes.copadobrasil.participantes.includes("sport"), "a Copa do Brasil é da Série A");
});

test("a meta da diretoria na Série B é o acesso para os mais fortes", () => {
  const ordem = [...serieB.clubes].sort((a, b) => mediaOnze(b) - mediaOnze(a));
  const forte = estado(novaCarreira("Teste", ordem[0].id, "x")).meta, fraco = estado(novaCarreira("Teste", ordem[19].id, "x")).meta;
  assert.deepStrictEqual([forte.liga, forte.alvo, forte.nivel], ["serieb-2026", 4, "acesso"]);
  assert.ok(fraco.alvo > 4 && fraco.nivel !== "rebaixamento", "a Série B não tem rebaixamento");
});

test("a tabela marca o acesso na Série B e o rebaixamento só na Série A", () => {
  assert.strictEqual(Temporada.zona(3, 20, "serieb-2026"), "acesso");
  assert.strictEqual(Temporada.zona(20, 20, "serieb-2026"), "");
  assert.strictEqual(Temporada.zona(20, 20, "brasileirao-2026"), "rebaixamento");
});

test("na virada, os 4 últimos da Série A caem e os 4 primeiros da Série B sobem", () => {
  const save = novaCarreira("Teste", "fortaleza", "x", 3);
  terminar(save);
  const e = estado(save), h = e.historico[0];
  const tabA = save.competicoes["brasileirao-2026"].tabela.map((l) => l.id), tabB = save.competicoes["serieb-2026"].tabela.map((l) => l.id);
  const cairam = tabA.slice(-4), subiram = tabB.slice(0, 4);
  assert.deepStrictEqual(trocarDivisoes(save).subiram, subiram);
  if (h.posicao <= 4) {
    assert.strictEqual(h.divisao, "acesso");
    assert.ok(e.caixaEntrada.some((x) => /Acesso/.test(x.titulo)), "o aviso do acesso");
  } else assert.strictEqual(h.divisao, undefined);
  assert.strictEqual(novaTemporada(save), null);
  assert.strictEqual(save.temporada, 2);
  for (const id of subiram) assert.strictEqual(ligaDoClube(id, save), "brasileirao-2026", `${id} subiu`);
  for (const id of cairam) assert.strictEqual(ligaDoClube(id, save), "serieb-2026", `${id} caiu`);
  assert.strictEqual(save.divisoes["brasileirao-2026"].length, 20); assert.strictEqual(save.divisoes["serieb-2026"].length, 20);
  // a temporada nova já é jogada com as divisões novas: tabelas, calendário, Copa do Brasil e a meta
  const e2 = estado(save);
  assert.deepStrictEqual(new Set(e2.tabelas["brasileirao-2026"].map((l) => l.id)), new Set(save.divisoes["brasileirao-2026"]));
  assert.deepStrictEqual(new Set(save.competicoes.copadobrasil.participantes), new Set(save.divisoes["brasileirao-2026"]));
  assert.strictEqual(e2.liga, ligaDoClube("fortaleza", save)); assert.strictEqual(e2.meta.liga, e2.liga);
  assert.ok(save.calendarioMundo.filter((j) => j.competicao === e2.liga).some((j) => j.casa === "fortaleza"), "o calendário do clube é o da liga nova");
  assert.ok(e2.feed.some((p) => /Sobem para a Série A/.test(p.texto)), "a notícia de quem sobe e quem cai");
  // os clubes que caíram seguem fora das vagas estrangeiras da Libertadores (continuam brasileiros)
  const lib = save.classificados.libertadores, estrangeiros = new Set(mundo.ligas.filter((l) => ["argentina-2026", "sulamericanos-2026"].includes(l.id)).flatMap((l) => l.clubes));
  assert.strictEqual(lib.length, 32);
  assert.ok(lib.every((id) => estrangeiros.has(id) || tabA.includes(id)), "só brasileiros da Série A e estrangeiros");
});

test("quem cai na Série A recebe o aviso e joga a Série B na temporada seguinte", () => {
  // a semente de cada carreira é sorteada: tenta os mais fracos até um cair (cada um cai em boa parte das vezes)
  for (let i = 0; i < 40; i++) {
    const clube = ["remo", "chapecoense", "mirassol", "coritiba"][i % 4];
    const save = novaCarreira("Teste", clube, "x", 3);
    terminar(save);
    const h = estado(save).historico[0];
    if (h.divisao !== "rebaixado") continue;
    assert.ok(save.caixaEntrada.some((x) => /Rebaixado/.test(x.titulo)));
    novaTemporada(save);
    assert.strictEqual(estado(save).liga, "serieb-2026");
    return;
  }
  assert.fail("nenhum dos clubes mais fracos caiu em 40 carreiras");
});

test("as carreiras de antes da Série B ganham as divisões ao abrir", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  delete save.divisoes; for (const c of serieB.clubes) delete save.caixaIA[c.id];
  completar(save);
  assert.deepStrictEqual(save.divisoes["serieb-2026"], serieB.clubes.map((c) => c.id));
  assert.ok(serieB.clubes.every((c) => save.caixaIA[c.id] > 0), "a IA da Série B tem caixa para comprar");
});

test("a carreira de antes da Série B que chega à virada sem jogar depois da atualização também tem acesso e rebaixamento", () => {
  const save = novaCarreira("Teste", "flamengo", "x", 3);
  terminar(save);
  delete save.divisoes; delete save.competicoes["serieb-2026"]; for (const c of serieB.clubes) delete save.caixaIA[c.id];
  completar(save);
  assert.strictEqual(novaTemporada(save), null);
  assert.strictEqual(save.temporada, 2);
  assert.strictEqual(save.divisoes["serieb-2026"].filter((id) => serieA.clubes.some((c) => c.id === id)).length, 4, "4 da Série A caíram");
  assert.strictEqual(save.divisoes["brasileirao-2026"].filter((id) => serieB.clubes.some((c) => c.id === id)).length, 4, "4 da Série B subiram");
});

test("carreira em grupo de antes da Série B: a virada também troca as divisões", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Host" }, { clube: "palmeiras", nome: "Amigo" }], { temporadas: 2 });
  for (const c of ["flamengo", "palmeiras"]) save.humanos[c].estado.jogosJogados = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, c).map((j) => j.id);
  delete save.divisoes; delete save.competicoes["serieb-2026"];
  assert.strictEqual(G.novaTemporadaGrupo(save), null);
  assert.strictEqual(save.divisoes["brasileirao-2026"].filter((id) => serieB.clubes.some((c) => c.id === id)).length, 4);
});

test("carreira em grupo: dá para escolher clube da Série B e a virada troca as divisões para todos", () => {
  assert.ok(G.clubesEscolhiveis("brasil").some((c) => c.liga === "serieb-2026"));
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Host" }, { clube: "ceara", nome: "Amigo" }], { temporadas: 2 });
  for (const c of ["flamengo", "ceara"]) save.humanos[c].estado.jogosJogados = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, c).map((j) => j.id);
  const subiram = save.competicoes["serieb-2026"].tabela.slice(0, 4).map((l) => l.id);
  assert.strictEqual(G.novaTemporadaGrupo(save), null);
  for (const id of subiram) assert.strictEqual(ligaDoClube(id, save), "brasileirao-2026");
  assert.strictEqual(G.estado(G.vistaDe(save, "ceara")).liga, ligaDoClube("ceara", save));
});
