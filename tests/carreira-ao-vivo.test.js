// Carreira de Treinador: o painel ao vivo da partida. Os outros jogos da semana chegam com os gols minuto a minuto
// (paralelos), no solo e na rodada da turma, e os confrontos de ida e volta sabem qual perna é.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const indice = require("../public/carreira/base/mundo-2026.js");
const { novaCarreira, estado, proximoJogoMundo, sementeDoJogo } = require("../carreira.js").paraTestes;
const G = require("../carreira.js").grupo;
const Rd = require("../carreira-rodada.js");
const { subirServidor, conectar, pedir } = require("./ajuda.js");

const bases = Object.fromEntries(["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => { const b = require(`../public/carreira/base/${id}-2026.js`); return [b.id, b]; }));

function comPartida(save) {
  const jogo = proximoJogoMundo(save);
  save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: false, casa: jogo.casa, fora: jogo.fora, modo: 2,
    semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
  return jogo;
}

test("a partida em andamento leva os outros jogos da semana, com os gols que batem com o placar de cada um", () => {
  const save = novaCarreira("Teste", "flamengo", "x"), jogo = comPartida(save);
  const e = estado(save), par = e.partida.paralelos;
  assert.ok(par.length > 20, "os jogos das outras ligas e copas da semana");
  assert.ok(!par.some((x) => x.id === jogo.id), "o seu jogo não entra");
  assert.ok(par.every((x) => x.gols.length === x.placar[0] + x.placar[1]), "os gols somam o placar final");
  assert.ok(par.every((x) => x.gols.every((g) => g.min >= 1 && g.min <= 100 && (g.lado === 0 || g.lado === 1))));
  const mesma = par.filter((x) => x.competicao === jogo.competicao);
  assert.strictEqual(mesma.length, 9, "os outros 9 jogos do Brasileirão");
  // o mesmo placar da tabela depois (não é um jogo inventado para a tela)
  const mundo = save.calendarioMundo;
  for (const x of par.slice(0, 15)) assert.deepStrictEqual(x.placar, mundo.find((j) => j.id === x.id).placar);
  // sempre o mesmo para o mesmo jogo
  assert.deepStrictEqual(estado(save).partida.paralelos, par);
});

test("sem partida em andamento o estado não carrega os jogos (a tela pede à parte, só do jogo dela)", async () => {
  const srv = await subirServidor();
  try {
    const s = await conectar(srv.url, "/carreira");
    const c = await pedir(s, "criar", { nome: "Duda", clube: "flamengo" });
    assert.ok(!c.estado.partida);
    const r = await pedir(s, "jogar", { modo: 1 }); // só o resultado: acaba na hora
    assert.ok(!r.estado.partida && r.estado.ultimo);
    const p = await pedir(s, "paralelos", { jogoId: r.estado.ultimo.jogoId });
    assert.ok(p.paralelos.length > 20 && p.paralelos.every((x) => x.id !== r.estado.ultimo.jogoId));
    await assert.rejects(pedir(s, "paralelos", { jogoId: "brasileirao-2026:liga:30:flamengo:santos" }), /seu jogo/);
    s.close();
  } finally { await srv.parar(); }
});

test("na rodada da turma, os jogos de humanos ficam de fora e os outros chegam na visão de cada um", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }, { clube: "liverpool", nome: "B" }], { temporadas: 1 });
  const p = G.proximaRodadaGrupo(save), rod = Rd.criarRodada(save, p, 0, { vel: 1, decisaoMs: 5000, espera: 0 });
  assert.ok(rod.paralelos.length > 20);
  assert.strictEqual(rod.inicio, 0); assert.strictEqual(rod.vel, 1); assert.strictEqual(rod.decisaoMs, 5000); // o relógio da rodada continua inteiro
  const humanos = new Set(["flamengo", "liverpool"]);
  assert.ok(rod.paralelos.every((x) => !humanos.has(x.casa) && !humanos.has(x.fora) && !p.jogos.some((j) => j.id === x.id)));
  const v = Rd.visao(save, rod, "flamengo", 1000);
  assert.deepStrictEqual(v.paralelos, rod.paralelos);
  assert.ok(v.outros.some((o) => o.casa === "liverpool" || o.fora === "liverpool"), "o jogo do outro técnico segue na faixa dele");
});

test("os confrontos de ida e volta sabem qual perna é", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "pernas", copasNovas: true });
  for (const id of ["libertadores", "champions", "copadobrasil", "sulamericana"]) {
    const duplos = m.competicoes[id].jogos.filter((j) => j.perna);
    assert.ok(duplos.length > 0, id);
    for (const ida of duplos.filter((j) => j.perna === "ida")) {
      const volta = duplos.find((j) => j.perna === "volta" && j.fase === ida.fase && j.rodada === ida.rodada);
      assert.ok(volta && volta.casa === ida.fora && volta.fora === ida.casa && volta.semana > ida.semana, `${id} ${ida.fase}`);
    }
    assert.ok(m.competicoes[id].jogos.filter((j) => j.fase === "final").every((j) => !j.perna), "a final é jogo único");
  }
  assert.ok(m.competicoes.supermundial.jogos.every((j) => !j.perna), "o Super Mundial é todo em jogo único");
});
