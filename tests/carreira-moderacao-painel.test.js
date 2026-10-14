// O painel de moderação: os comandos do anfitrião numa sala carregada do banco e a edição das carreiras particulares.
process.env.DB_PATH = ":memory:";
process.env.CARREIRA_PAUSA_MS = "0";
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
const C = require("../carreira.js");
const Carreira = C.grupo;
const Moderacao = require("../carreira-moderacao.js");
const Solo = require("../carreira-solo-moderacao.js");

// o módulo da sala tem relógios próprios: aqui eles não seguram o processo do teste
function carregarSalas() {
  const orig = global.setInterval;
  global.setInterval = (f, t) => { const h = orig(f, t); if (h.unref) h.unref(); return h; };
  const ns = { on() {}, to: () => ({ emit() {} }), sockets: new Map() };
  try { return require("../carreira-online.js")({ of: () => ns }); } finally { global.setInterval = orig; }
}

test("carreira solo: as mesmas edições da sala, bloqueadas durante a partida", () => {
  const save = C.paraTestes.novaCarreira("Ana", "flamengo", "", 2, 0);
  C.paraTestes.completar(save);
  const pid = Carreira.elencoDe(save, "flamengo")[0].id;
  assert.equal(Moderacao.aplicarSolo(save, { tipo: "caixa", clube: "flamengo", valor: 5e6 }).depois, 5e6);
  assert.equal(save.caixa, 5e6);
  assert.equal(Moderacao.aplicarSolo(save, { tipo: "energia", clube: "flamengo", jogador: pid, valor: 40 }).depois, 40);
  assert.equal(save.energia[pid], 40);
  assert.ok(Moderacao.aplicarSolo(save, { tipo: "energia", clube: "palmeiras", jogador: Carreira.elencoDe(save, "palmeiras")[0].id, valor: 40 }).erro, "energia só do clube do técnico");
  assert.equal(Moderacao.aplicarSolo(save, { tipo: "caixa", clube: "palmeiras", valor: 7e6 }).depois, 7e6);
  assert.equal(save.caixaIA.palmeiras, 7e6);
  assert.equal(Moderacao.aplicarSolo(save, { tipo: "transferir", clube: "flamengo", jogador: pid, destino: "palmeiras" }).depois, "palmeiras");
  assert.equal(Carreira.donoDe(save, pid), "palmeiras");
  assert.equal(Moderacao.aplicarSolo(save, { tipo: "desfazer_transferencia", clube: "flamengo", jogador: pid }).depois.clube, "flamengo");
  assert.equal(Carreira.donoDe(save, pid), "flamengo");
  const d = Moderacao.detalheSolo(save);
  assert.equal(d.clube, "flamengo");
  assert.ok(d.clubes.find((c) => c.id === "flamengo").humano);
  save.partida = { rodada: 0 };
  assert.match(Moderacao.aplicarSolo(save, { tipo: "caixa", clube: "flamengo", valor: 1 }).erro, /partida/);
});

test("carreira solo pelo banco: lista, detalhe, edição registrada e código novo", () => {
  const save = C.paraTestes.novaCarreira("Bia", "palmeiras", "", 1, 0);
  const { id } = bd.criarCarreira("Bia", save);
  const item = Solo.listar().find((c) => c.id === id);
  assert.equal(item.nomeClube, "Palmeiras");
  assert.equal(item.modo, "Treinador");
  const d = Solo.detalhar(id);
  assert.equal(d.carreira.tecnico, "Bia");
  assert.ok(d.jogadores.length > 15);
  const pid = d.jogadores[0].id;
  assert.equal(Solo.editar(id, { tipo: "overall", clube: "palmeiras", jogador: pid, valor: 93 }, "thiagoaqno").depois, 93);
  const salvo = bd.carreiraPorId(id).dados;
  assert.equal(Carreira.jogadorDe(salvo, pid).nota + salvo.bonusNota[pid], 93);
  const r = Solo.novoCodigo(id, "thiagoaqno");
  assert.match(r.recuperacao, /^[A-Z0-9]{12}$/);
  assert.equal(bd.recuperarCarreira(r.recuperacao).id, id, "o código novo abre a carreira");
  const hist = Solo.detalhar(id).historico;
  assert.deepEqual(hist.map((h) => h.tipo), ["codigo", "overall"]);
  assert.ok(Solo.detalhar(999999).erro);
});

test("sala em grupo: comandos do anfitrião pelo painel", () => {
  const save = Carreira.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  bd.salvarSalaCarreira("QWERT", { code: "QWERT", host: "a", fase: "carreira", opcoes: { ligas: "brasil", ritmo: "normal" }, order: ["a", "b"], save, t: Date.now(),
    nRodada: 0, prontos: {}, liberaEm: Date.now() + 60e3, rodada: null, leilao: null, trocas: [],
    players: { a: { id: "a", name: "Ana", clube: "flamengo", tokenHash: "x" }, b: { id: "b", name: "Bia", clube: "palmeiras", tokenHash: "y" } } });
  const salas = carregarSalas();
  let d = salas.detalhar("QWERT");
  assert.equal(d.sala.tecnicos.length, 2);
  assert.ok(d.sala.pausa > 0);
  assert.ok(salas.comandar("QWERT", { tipo: "dispensar", pessoa: "a" }).erro, "o anfitrião não pode ser dispensado sem passar o cargo");
  assert.equal(salas.comandar("QWERT", { tipo: "anfitriao", pessoa: "b" }).depois, "Bia");
  assert.match(salas.comandar("QWERT", { tipo: "rodada" }).erro, /Espere mais/);
  assert.ok(!salas.comandar("QWERT", { tipo: "rodada", semPausa: true }).erro);
  d = salas.detalhar("QWERT");
  assert.equal(d.sala.rodada.velocidade, 1);
  assert.ok(d.jogoAoVivo);
  assert.equal(salas.comandar("QWERT", { tipo: "velocidade", velocidade: 3 }).depois, 3);
  assert.equal(salas.detalhar("QWERT").sala.rodada.velocidade, 3);
  assert.ok(salas.comandar("QWERT", { tipo: "novaTemporada" }).erro, "não começa temporada com a rodada rolando");
  assert.ok(salas.comandar("QWERT", { tipo: "inventado" }).erro);
  assert.equal(salas.comandar("QWERT", { tipo: "dispensar", pessoa: "a" }).depois.noFimDaRodada, true);
  const hist = bd.historicoModeracao("QWERT").map((h) => h.tipo);
  assert.deepEqual(hist, ["sala:dispensar", "sala:velocidade", "sala:rodada", "sala:anfitriao"]);
});
