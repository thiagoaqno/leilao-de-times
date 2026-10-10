// Carreira: a premiação do campeonato até o G6 (carreira.js: premioG6, premioDoTurno e registrarTemporada).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const { PREMIO_TITULO, premioDoTitulo, PREMIOS_G6, premioG6, novaCarreira, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo } = require("../carreira.js").paraTestes;

const jogar = (save, ate = Infinity) => {
  for (let jogo, n = 0; n < ate && (jogo = proximoJogoMundo(save)); n++) {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
};
const extrato = (save) => save.financas.flatMap((f) => f.itens);

test("a tabela de prêmios: seis posições, do maior para o menor, com o fator da liga e sem nada fora do G6", () => {
  assert.strictEqual(PREMIOS_G6.length, 6);
  assert.ok(PREMIOS_G6.every((v, i) => i === 0 || v < PREMIOS_G6[i - 1]), "cada posição paga menos que a de cima");
  const br = { clube: "flamengo" }, ing = { clube: "liverpool" }, arg = { clube: "boca-juniors" };
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6].map((p) => premioG6(br, p)), PREMIOS_G6);
  assert.strictEqual(premioG6(br, 7), 0); assert.strictEqual(premioG6(br, 0), 0); assert.strictEqual(premioG6(br, 20), 0);
  assert.ok(premioG6(ing, 1) > premioG6(br, 1), "a Premier League paga mais");
  assert.ok(premioG6(arg, 1) < premioG6(br, 1) || premioG6(arg, 1) === premioG6(br, 1), "uma liga menor não paga mais que o Brasileirão");
  assert.strictEqual(premioG6(br, 1, 0.25), Math.round(PREMIOS_G6[0] / 4 / 1e5) * 1e5, "o adiantamento do turno é 25% (arredondado a R$ 100 mil)");
});

test("na carreira: no meio da liga o G6 do momento recebe 25%, no fim quem ficou no G6 recebe o prêmio, e nenhum paga duas vezes", () => {
  const save = novaCarreira("Teste", "flamengo", "", 1);
  const ligaJogos = () => (save.jogosJogados || []).filter((id) => id.startsWith("brasileirao-2026:")).length;
  while (ligaJogos() < 19 && proximoJogoMundo(save)) jogar(save, 1);
  assert.strictEqual(ligaJogos(), 19);
  const turno = extrato(save).filter(([n]) => /Premiação do turno/.test(n));
  assert.ok(turno.length <= 1, "uma vez só");
  assert.strictEqual(save.gestao.visto.premioTurno, save.temporada, "marcou que o turno já foi conferido");
  if (turno.length) { const pos = +/(\d+)º/.exec(turno[0][0])[1]; assert.ok(pos <= 6); assert.strictEqual(turno[0][1], premioG6(save, pos, 0.25)); }
  jogar(save);
  const final = extrato(save).filter(([n]) => /Premiação do campeonato/.test(n)), h = save.historico[0];
  if (h.posicao <= 6) {
    assert.strictEqual(final.length, 1); assert.strictEqual(final[0][1], premioG6(save, h.posicao));
    assert.ok(save.caixaEntrada.some((e) => e.tipo === "premio" && /Premiação do campeonato/.test(e.titulo)));
  } else assert.strictEqual(final.length, 0, "fora do G6 não tem o prêmio do campeonato");
  assert.ok(extrato(save).filter(([n]) => /Premiação do turno/.test(n)).length <= 1, "o prêmio do turno não repete (o extrato guarda só as últimas rodadas)");
});

test("o bônus de título: R$ 60 mi na Libertadores, R$ 50 mi na Copa do Brasil, R$ 40 mi na Sul-Americana e R$ 15 mi nas outras competições", () => {
  const save = novaCarreira("Teste", "flamengo", "", 1), nome = (id) => save.competicoes[id].nome;
  assert.deepStrictEqual(PREMIO_TITULO, { libertadores: 60e6, copadobrasil: 50e6, sulamericana: 40e6 });
  assert.strictEqual(premioDoTitulo(save, nome("copadobrasil")), 50e6);
  assert.strictEqual(premioDoTitulo(save, nome("libertadores")), 60e6);
  assert.strictEqual(premioDoTitulo(save, nome("sulamericana")), 40e6);
  for (const id of ["brasileirao-2026", "champions", "supermundial", "mundial"]) assert.strictEqual(premioDoTitulo(save, nome(id)), 15e6, id);
  assert.strictEqual(premioDoTitulo(save, "Brasileirão"), 15e6, "nome que não é de competição do mundo (carreira antiga): R$ 15 mi");
});

// ---------- o vale de campeão: um jogador de até 87, de graça, para quem ganhou algum campeonato ----------
const Clube = require("../carreira-clube.js");
const { ajudas, completar } = require("../carreira.js").paraTestes;
const G = require("../carreira.js").grupo;
const novo = (clube = "flamengo") => completar(novaCarreira("Teste", clube, "", 3));
const campeao = (v, titulos = ["Libertadores"]) => { Clube.fechouTemporada(v, ajudas, { pos: 1, titulos, vices: [], cumpriuMeta: true }); v.temporada++; Clube.virada(v, ajudas); return v; };
const alvo = (v, max = 87, min = 80) => ajudas.elencoDe(v, "liverpool").filter((j) => ajudas.notaDe(v, j) <= max && ajudas.notaDe(v, j) >= min).sort((a, b) => ajudas.notaDe(v, b) - ajudas.notaDe(v, a))[0];

test("vale de campeão: um título rende um vale (um só, mesmo com vários títulos); sem título, nada", () => {
  const sem = novo(); Clube.fechouTemporada(sem, ajudas, { pos: 8, titulos: [], vices: [], cumpriuMeta: false });
  assert.strictEqual(sem.gestao.vales.length, 0);
  const v = novo(); Clube.fechouTemporada(v, ajudas, { pos: 1, titulos: ["Brasileirão", "Copa do Brasil"], vices: [], cumpriuMeta: true });
  assert.strictEqual(v.gestao.vales.length, 1, "um vale por temporada, não por título");
  assert.strictEqual(v.gestao.vales[0].max, 87);
  assert.ok(v.caixaEntrada.some((e) => e.tipo === "vale"));
});

test("vale de campeão: leva o jogador de graça, com salário, sem passar do limite, uma vez só, e ele não é vendido na temporada", () => {
  const v = campeao(novo()), j = alvo(v), caixa = v.caixa;
  assert.ok(j, "tem jogador de 80 a 87 no Liverpool");
  const forte = ajudas.elencoDe(v, "real-madrid").find((x) => ajudas.notaDe(v, x) > 87) || ajudas.elencoDe(v, "manchester-city").find((x) => ajudas.notaDe(v, x) > 87);
  if (forte) assert.match(Clube.acao(v, ajudas, { acao: "vale", jogador: forte.id }), /de até 87/);
  assert.match(Clube.acao(v, ajudas, { acao: "vale", jogador: v.gestao.capitao || ajudas.elencoDe(v, "flamengo")[0].id }), /não está disponível/, "não vale para jogador seu");
  const r = Clube.acao(v, ajudas, { acao: "vale", jogador: j.id });
  assert.ok(r.mensagem, JSON.stringify(r));
  assert.strictEqual(ajudas.donoDe(v, j.id), "flamengo");
  assert.strictEqual(v.caixa, caixa, "de graça: o caixa não muda");
  assert.ok(v.salarios[j.id] > 0, "o salário continua");
  assert.strictEqual(v.compras[j.id].valor, 0);
  assert.strictEqual(v.gestao.vales.length, 0, "o vale foi gasto");
  assert.strictEqual(v.gestao.contratos[j.id].fim, v.temporada + 2);
  assert.ok(v.transferencias[0].vale && v.transferencias[0].valor === 0);
  assert.match(Clube.acao(v, ajudas, { acao: "vale", jogador: alvo(v, 87, 78).id }), /não tem um vale/, "um vale, um jogador");
  // não vira dinheiro: nem à venda, nem na hora
  assert.match(G.venderAcao(v, { jogador: j.id, modo: "agora" }), /vale de campeão/);
  assert.match(G.venderAcao(v, { jogador: j.id, modo: "lista", pedido: 1e8 }), /vale de campeão/);
  assert.ok(Clube.estado(v, ajudas).bloqueados.includes(j.id));
});

test("vale de campeão: só com a janela aberta, e vence no fim da temporada seguinte", () => {
  const v = campeao(novo()), j = alvo(v);
  v.jogosJogados = Array.from({ length: 6 }, (_, i) => `brasileirao-2026:liga:${i}:x:y`); // rodada 6: janela fechada
  assert.match(Clube.acao(v, ajudas, { acao: "vale", jogador: j.id }), /janela/);
  v.jogosJogados = [];
  v.temporada++; Clube.virada(v, ajudas); // a temporada seguinte acabou: o vale vence
  assert.ok(v.temporada > 1);
  const velho = campeao(novo()); velho.temporada += 1; Clube.virada(velho, ajudas);
  assert.strictEqual(velho.gestao.vales.length, 0, "dois anos depois o vale não vale mais");
});

test("vale de campeão: na sala, não leva jogador de outro técnico (esse é pelo leilão) e o bloqueio vale também na troca", () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 3 });
  const v = G.vistaDe(save, "flamengo"); G.completar(v);
  campeao(v); G.guardarVista(save, v);
  const amigo = G.elencoDe(G.vistaDe(save, "palmeiras"), "palmeiras")[0];
  assert.match(Clube.acao(G.vistaDe(save, "flamengo"), ajudas, { acao: "vale", jogador: amigo.id }), /outro técnico|leilão/);
  const cpu = alvo(G.vistaDe(save, "flamengo"));
  const v2 = G.vistaDe(save, "flamengo");
  assert.ok(Clube.acao(v2, ajudas, { acao: "vale", jogador: cpu.id }).mensagem);
  G.guardarVista(save, v2);
  const erro = G.erroDeTroca(save, { de: "flamengo", para: "palmeiras", dou: [cpu.id], recebo: [], dinheiro: 0 });
  assert.match(erro, /vale de campeão/, "o jogador do vale não pode ser trocado");
});
