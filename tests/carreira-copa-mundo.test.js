process.env.DB_PATH ||= ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const Temporada = require("../public/carreira/temporada.js");
const Carreira = require("../carreira.js");
const Moderacao = require("../carreira-moderacao.js");
const Selecoes = require("../carreira-selecoes.js");
const indice = require("../public/carreira/base/mundo-2026.js");
const bases = Object.fromEntries(["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => { const b = require(`../public/carreira/base/${id}-2026.js`); return [b.id, b]; }));

test("Copa tem 48 seleções, 104 jogos e pausa o calendário de clubes sem conflitos", () => {
  const a = Temporada.simularMundo({ bases, indice, semente: "copa-teste", copasNovas: true, semMundial: true, copa: Selecoes.baseDaCopa({}) });
  const b = Temporada.simularMundo({ bases, indice, semente: "copa-teste", copasNovas: true, semMundial: true, copa: Selecoes.baseDaCopa({}) });
  const copa = a.competicoes.copadomundo;
  assert.equal(copa.participantes.length, 48);
  assert.equal(copa.grupos.length, 12);
  assert.equal(copa.jogos.length, 104);
  assert.deepEqual(a.campeoes, b.campeoes);
  assert.equal(Temporada.conflitoDeCalendario(a.jogos), null);
  assert.ok(a.jogos.filter((j) => j.competicao !== "copadomundo").every((j) => j.semana < 40 || j.semana >= 48));
  assert.ok(copa.jogos.every((j) => j.semana >= 40 && j.semana <= 47));
});

test("ofertas dependem da temporada e convocação só aceita atletas da seleção", () => {
  const save = { semente: "ofertas", clube: "flamengo", temporada: 1, temporadasMax: 2, historico: [{ temporada: 1, posicao: 4, titulos: [], meta: { cumprida: true } }] };
  const ofertas = Selecoes.ofertas(save);
  assert.ok(ofertas.ofertas.length > 0 && ofertas.ofertas.length <= 3);
  assert.deepEqual(Selecoes.ofertas(save), ofertas);
  assert.match(Selecoes.aceitar(save, "seleção-inexistente"), /não ofereceu/);
  assert.equal(Selecoes.aceitar(save, ofertas.ofertas[0].id), null);
  assert.equal(save.convocadosSelecao.length, 26);
  save.temporada = 2; save.copaAtiva = true; save.jogosJogados = [];
  const candidatos = Selecoes.POR_ID.get(save.selecao).jogadores.map((j) => j.id);
  const entra = candidatos.find((id) => !save.convocadosSelecao.includes(id) && Selecoes.JOGADORES.get(id).pos !== "GOL");
  const sai = save.convocadosSelecao.find((id) => Selecoes.JOGADORES.get(id).pos !== "GOL");
  assert.ok(entra && sai);
  assert.equal(Selecoes.convocar(save, entra, sai), null);
  assert.ok(save.convocadosSelecao.includes(entra) && !save.convocadosSelecao.includes(sai));
  assert.match(Selecoes.convocar(save, Selecoes.BASE.clubes.find((c) => c.id !== save.selecao).jogadores[0].id, entra), /mesma seleção/);
  save.jogosJogados.push("copadomundo:estreia");
  assert.match(Selecoes.convocar(save, sai, entra), /fecha/);
});

test("editar atributo no painel altera o jogador usado pelo motor", () => {
  const save = Carreira.grupo.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }], { temporadas: 2 });
  const room = { code: "ABCDE", fase: "carreira", opcoes: { ligas: "brasil" }, save, players: {}, nRodada: 0 };
  const pid = Carreira.grupo.elencoDe(save, "flamengo").find((j) => j.pos !== "GOL").id;
  const antes = Carreira.paraTestes.timeDe(save, "flamengo").jogadores.find((j) => j.id === pid)?.atr?.fin;
  assert.equal(Moderacao.aplicar(room, { tipo: "atributo", clube: "flamengo", jogador: pid, atributo: "fin", valor: 99 }).depois, 99);
  const depois = Carreira.paraTestes.timeDe(save, "flamengo").jogadores.find((j) => j.id === pid)?.atr?.fin;
  assert.equal(depois, 99);
  assert.notEqual(antes, depois);
  assert.equal(Moderacao.detalhe(room, "flamengo").jogadores.find((j) => j.id === pid).atr.fin, 99);
  const base = Carreira.grupo.basesDaTemporada(save);
  assert.equal(Object.values(base).flatMap((b) => b.clubes).flatMap((c) => c.jogadores).find((j) => j.id === pid).atr.fin, 99,
    "a projeção dos próximos jogos também precisa receber o atributo salvo");
});
