// Carreira de Treinador: várias temporadas (public/carreira/evolucao.js e a virada no carreira.js).
const test = require("node:test");
const assert = require("node:assert");
const Evolucao = require("../public/carreira/evolucao.js");
const Motor = require("../public/carreira/motor.js");

process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const { novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo, novaTemporada, estado, ajudas, completar, APOSENTADO } = require("../carreira.js").paraTestes;

// joga todos os jogos do seu clube até o fim da temporada, no modo "só o resultado"
function jogarTemporada(save) {
  for (let jogo; (jogo = proximoJogoMundo(save));) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
}
// uma carreira com a primeira temporada jogada (a mesma para os testes que só olham a virada)
let pronta = null;
function carreiraNoFim() {
  if (!pronta) { const save = novaCarreira("Teste", "palmeiras", "", 2); jogarTemporada(save); pronta = JSON.stringify(save); }
  return JSON.parse(pronta);
}

test("evolução: nunca passa de +3 nem de -2", () => {
  for (let i = 0; i < 4000; i++) {
    const r = Motor.sorteDe(`limites:${i}`);
    const d = Evolucao.evolucaoDe({ idade: 16 + Math.floor(r() * 25), nota: 40 + Math.floor(r() * 56), jogos: Math.floor(r() * 60), jogosTime: 50, media: 3 + r() * 7, semente: `s${i}` });
    assert.ok(Number.isInteger(d) && d <= 3 && d >= -2, `evolução fora do limite: ${d}`);
  }
});

test("evolução: os jovens sobem em média e os veteranos caem", () => {
  const media = (idade) => { let s = 0; for (let i = 0; i < 2000; i++) s += Evolucao.evolucaoDe({ idade, nota: 72, semente: `media:${idade}:${i}` }); return s / 2000; };
  assert.ok(media(19) > 1, `jovem: ${media(19)}`);
  assert.ok(Math.abs(media(27)) < 0.4, `meio da carreira: ${media(27)}`);
  assert.ok(media(33) < -0.6, `veterano: ${media(33)}`);
  // quem joga muito e bem sobe mais do que quem fica no banco
  const com = (jogos, nota) => { let s = 0; for (let i = 0; i < 2000; i++) s += Evolucao.evolucaoDe({ idade: 25, nota: 72, jogos, jogosTime: 40, media: nota, semente: `minutos:${i}` }); return s / 2000; };
  assert.ok(com(35, 7.5) > com(2, 6) + 0.5);
});

test("aposentadoria: só a partir dos 35, e quanto mais velho, mais chance", () => {
  const conta = (idade) => Array.from({ length: 1000 }, (_, i) => Evolucao.seAposenta(idade, `ap:${i}`)).filter(Boolean).length;
  assert.strictEqual(conta(34), 0);
  assert.ok(conta(35) > 150 && conta(35) < conta(37) && conta(37) < conta(39));
});

test("a nota de cada jogo: o autor do gol vai bem, o expulso vai mal", () => {
  const r = { placar: [1, 0], times: [{ titulares: ["a", "b"] }, { titulares: ["c", "d"] }],
    eventos: [{ tipo: "gol", lado: 0, jogador: "a", assist: "b" }, { tipo: "vermelho", lado: 1, jogador: "c" }, { tipo: "sub", lado: 1, sai: "d", entra: "e" }] };
  const n = Evolucao.notasDaPartida(r);
  assert.deepStrictEqual(Object.keys(n).sort(), ["a", "b", "c", "d", "e"]);
  assert.ok(n.a > n.b && n.b > 6 && n.c < 5);
});

test("a idade sobe uma por temporada; a base brasileira (sem data) tem idade estimada sempre igual", () => {
  assert.strictEqual(Evolucao.idadeNa({ id: "x", idade: 24 }, 3), 26);
  assert.strictEqual(Evolucao.idadeNa({ id: "x", idade: 18, desde: 2 }, 4), 20);
  const sem = Evolucao.idadeBase({ id: "flamengo-10", idade: null });
  assert.ok(sem >= 20 && sem <= 32 && sem === Evolucao.idadeBase({ id: "flamengo-10" }));
});

test("fim da temporada: o histórico guarda posição, títulos, artilheiro do time e força, uma vez só", () => {
  const save = carreiraNoFim();
  assert.strictEqual(proximoJogoMundo(save), null);
  assert.strictEqual(save.historico.length, 1);
  const h = save.historico[0];
  assert.strictEqual(h.temporada, 1);
  assert.ok(h.posicao >= 1 && h.posicao <= 20 && Array.isArray(h.titulos) && h.forca > 60);
  if (h.artilheiro) assert.strictEqual(ajudas.donoDe(save, h.artilheiro.id), "palmeiras");
  completar(save); completar(save);
  assert.strictEqual(save.historico.length, 1, "não registra de novo");
  assert.ok(save.desempenho && Object.keys(save.desempenho).length > 11 && save.jogosTemporada > 38);
});

test("virada de temporada: a mesma carreira evolui sempre igual, dentro dos limites", () => {
  const a = carreiraNoFim(), b = carreiraNoFim();
  // o aviso sem resposta vale a opção padrão na virada e pode mexer na nota de alguém: aqui só a evolução conta
  for (const x of [a, b]) for (const e of x.caixaEntrada) e.resolvido = true;
  const antes = { ...a.bonusNota };
  assert.strictEqual(novaTemporada(a), null);
  assert.strictEqual(novaTemporada(b), null);
  assert.deepStrictEqual(a.bonusNota, b.bonusNota);
  assert.deepStrictEqual(a.jovens, b.jovens);
  assert.deepStrictEqual(a.aposentados, b.aposentados);
  assert.deepStrictEqual(a.classificados, b.classificados);
  for (const [pid, d] of Object.entries(a.evolucao)) {
    assert.ok(d <= 3 && d >= -2, `${pid} mudou ${d}`);
    assert.strictEqual((a.bonusNota[pid] || 0) - (antes[pid] || 0), d);
  }
  assert.strictEqual(a.temporada, 2); assert.strictEqual(a.ano, 2027); assert.strictEqual(a.rodada, 0);
  assert.deepStrictEqual(a.jogosJogados, []); assert.deepStrictEqual(a.desempenho, {});
  assert.ok(proximoJogoMundo(a), "o calendário novo tem jogos");
});

test("virada de temporada: aposentados saem dos elencos, a base manda jovens e as copas usam a tabela do ano", () => {
  const save = carreiraNoFim(), tabelaBR = save.competicoes["brasileirao-2026"].tabela.map((l) => l.id), premier = save.competicoes["inglaterra-2026"].tabela.map((l) => l.id);
  novaTemporada(save);
  const aposentados = Object.keys(save.aposentados);
  assert.ok(aposentados.length > 0);
  for (const pid of aposentados) {
    assert.strictEqual(ajudas.donoDe(save, pid), APOSENTADO);
    assert.ok(save.aposentados[pid].idade >= 35);
  }
  const elenco = ajudas.elencoDe(save, "palmeiras");
  assert.ok(!elenco.some((j) => aposentados.includes(j.id)));
  assert.ok(elenco.length >= 18);
  const jovens = Object.values(save.jovens);
  assert.ok(jovens.length >= 100);
  for (const j of jovens) assert.ok(j.idade <= 18 && j.base && j.desde === 2 && ajudas.donoDe(save, j.id));
  // o seu clube não ganha mais jovens de graça: os garotos vão para a categoria de base, e quem sobe é decisão sua
  assert.ok(estado(save).gestao.base.length >= 2, "o seu clube recebe garotos na categoria de base");
  assert.deepStrictEqual(save.competicoes.champions.participantes.slice(0, 4), premier.slice(0, 4));
  assert.deepStrictEqual(save.competicoes.libertadores.participantes.slice(0, 6), tabelaBR.slice(0, 6));
  assert.strictEqual(new Set(save.competicoes.libertadores.participantes).size, 32);
  // o navegador recebe os jovens do seu time (eles não estão nos arquivos da base)
  const e = estado(save);
  for (const j of elenco.filter((x) => save.jovens[x.id])) assert.ok(e.jovens[j.id]);
  // ninguém compra aposentado
  save.rodada = 0;
  assert.match(require("../carreira.js").paraTestes.propor(save, { jogador: aposentados[0], valor: 1e6, salario: 1e5 }), /disponível/);
});

test("limite de temporadas: depois da última, novaTemporada recusa e o estado diz que acabou", () => {
  const save = carreiraNoFim();
  save.temporadasMax = 1;
  assert.strictEqual(estado(save).encerrada, true);
  assert.match(novaTemporada(save), /terminou/);
  assert.strictEqual(save.temporada, 1);
  // com mais de uma temporada, só depois de acabar
  const nova = novaCarreira("Outro", "flamengo", "", 3);
  assert.strictEqual(nova.temporadasMax, 3);
  assert.match(novaTemporada(nova), /não acabou/);
  assert.strictEqual(novaCarreira("X", "flamengo", "", 99).temporadasMax, 5);
  assert.strictEqual(novaCarreira("X", "flamengo", "").temporadasMax, 2);
});
