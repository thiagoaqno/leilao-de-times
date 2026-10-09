// Carreira de Treinador: a chave do mata-mata de cada copa (fase por fase, conforme acontece) e a artilharia com os gols de
// todos os jogos, inclusive do computador contra o computador.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const { novaCarreira, estado } = require("../carreira.js").paraTestes;
const G = require("../carreira.js").grupo;

// leva o clube até a semana W sem jogar: os jogos dele antes dela contam como jogados (o limite do que a tela mostra)
function ate(save, W) {
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube);
  save.jogosJogados = meus.filter((j) => j.semana < W).map((j) => j.id); save.rodada = save.jogosJogados.length;
  return estado(save);
}
const soma = (m) => Object.values(m).reduce((s, n) => s + n, 0);

test("a chave do mata-mata aparece fase por fase: o sorteio no começo e cada fase quando a anterior acaba", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  let e = ate(save, 1);
  assert.deepStrictEqual(e.competicoes.copadobrasil.chave.map((f) => [f.nome, f.confrontos.length]), [["preliminar", 4]], "só a fase preliminar da Copa do Brasil, já sorteada");
  assert.deepStrictEqual(e.competicoes.libertadores.chave, [], "o mata-mata da Libertadores só aparece depois dos grupos");
  assert.ok(e.competicoes.copadobrasil.chave[0].confrontos.every((c) => c.clubes.length === 2 && !c.vencedor && c.jogos.every((j) => !j.placar)), "nada de resultado antes do jogo");
  // depois da fase de grupos (semana 32): as oitavas da Libertadores com os confrontos, ainda sem resultado
  e = ate(save, 35);
  const oitavas = e.competicoes.libertadores.chave;
  assert.deepStrictEqual(oitavas.map((f) => [f.nome, f.confrontos.length]), [["oitavas", 8]]);
  assert.ok(oitavas[0].confrontos.every((c) => c.jogos.length === 2 && c.jogos.every((j) => !j.placar) && !c.vencedor && !c.agregado), "a ida e a volta ainda não aconteceram");
  // depois das oitavas (semanas 40 e 42): quem passou e as quartas montadas com quem passou
  e = ate(save, 44);
  const lib = e.competicoes.libertadores.chave;
  assert.deepStrictEqual(lib.map((f) => f.nome), ["oitavas", "quartas"]);
  const passaram = lib[0].confrontos.map((c) => c.vencedor);
  assert.ok(passaram.length === 8 && passaram.every(Boolean), "as oitavas têm os 8 classificados");
  assert.deepStrictEqual([...new Set(lib[1].confrontos.flatMap((c) => c.clubes))].sort(), [...passaram].sort(), "as quartas são só de quem passou");
  assert.ok(lib[0].confrontos.every((c) => c.agregado && c.jogos.every((j) => j.placar)), "o agregado e os dois jogos");
  assert.ok(lib[1].confrontos.every((c) => c.jogos.every((j) => !j.placar) && !c.vencedor), "as quartas ainda não aconteceram");
  assert.strictEqual(e.competicoes.libertadores.campeao, null, "o campeão só aparece no fim");
  // o vencedor de cada confronto é coerente com o agregado (ou com os pênaltis)
  for (const c of lib[0].confrontos) {
    const [a, b] = c.agregado;
    if (a !== b) assert.strictEqual(c.vencedor, a > b ? c.clubes[0] : c.clubes[1]);
    else assert.ok(c.jogos[1].penaltis, "empate no agregado só se resolve nos pênaltis");
  }
});

test("a artilharia soma os gols de todos os jogos que já aconteceram, inclusive os do computador contra o computador", () => {
  const save = novaCarreira("Teste", "flamengo", "x");
  const e = ate(save, 20); // nenhum jogo do Flamengo foi jogado de verdade: tudo o que já aconteceu é do computador
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, "flamengo").filter((j) => j.semana < 20);
  assert.ok(meus.length > 0);
  const esperado = save.calendarioMundo.filter((j) => j.semana < 20).reduce((s, j) => s + j.placar[0] + j.placar[1], 0);
  assert.strictEqual(soma(G.golsDoMundo(save, 20)), esperado, "cada gol dos jogos que já aconteceram entra uma vez");
  assert.strictEqual(e.artilharia.length, 10);
  assert.ok(e.artilharia.every((a, i, l) => i === 0 || l[i - 1].gols >= a.gols), "do maior para o menor");
  assert.ok(e.artilharia[0].gols >= 4, "depois de várias rodadas há artilheiro de verdade");
  // jogo que ainda não aconteceu não conta
  assert.strictEqual(soma(G.golsDoMundo(save, 1)), 0);
});

test("os gols de jogos de humanos não contam duas vezes (já estão em save.gols)", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }, { clube: "liverpool", nome: "B" }], { temporadas: 1, aporte: 0 });
  for (let i = 0; i < 3; i++) {
    const p = G.proximaRodadaGrupo(save); G.comecarRodadaGrupo(save);
    for (const j of p.jogos) G.jogarNaHora(save, j);
    G.fecharRodadaGrupo(save);
  }
  const limite = G.proximaRodadaGrupo(save).semana;
  const esperado = save.calendarioMundo.filter((j) => j.semana < limite).reduce((s, j) => s + j.placar[0] + j.placar[1], 0);
  assert.strictEqual(soma(G.golsDoMundo(save, limite)), esperado);
  assert.ok(soma(save.gols) > 0 && soma(save.gols) < esperado, "os jogos de humanos são só uma parte dos gols");
  const envolvidos = new Set(Object.keys(save.resultadosFixos).flatMap((id) => id.split(":").slice(-2))), v = G.vistaDe(save, "flamengo");
  assert.ok(Object.keys(G.golsDoMundo(save, limite)).some((pid) => !envolvidos.has(G.donoDe(v, pid))), "tem artilheiro de jogo só do computador");
});
