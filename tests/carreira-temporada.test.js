const test = require("node:test");
const assert = require("node:assert");
const Temporada = require("../public/carreira/temporada.js");
const indice = require("../public/carreira/base/mundo-2026.js");

const bases = Object.fromEntries(["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]
  .map((id) => { const b = require(`../public/carreira/base/${id}-2026.js`); return [b.id, b]; }));

test("temporada mundial termina com campeões determinísticos", () => {
  const a = Temporada.simularMundo({ bases, indice, semente: "temporada-completa" });
  const b = Temporada.simularMundo({ bases, indice, semente: "temporada-completa" });
  assert.deepStrictEqual(a.campeoes, b.campeoes);
  assert.deepStrictEqual(Object.keys(a.campeoes).sort(), ["alemanha-2026", "brasileirao-2026", "champions", "espanha-2026", "franca-2026", "inglaterra-2026", "italia-2026", "libertadores", "mundial"].sort());
  assert.ok(Object.values(a.campeoes).every(Boolean));
});

test("Mundial recebe campeões e vices das duas copas", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "mundial-certo" }), lib = m.competicoes.libertadores, cha = m.competicoes.champions;
  assert.deepStrictEqual(m.competicoes.mundial.participantes, [lib.campeao, cha.vice, cha.campeao, lib.vice]);
  assert.deepStrictEqual(m.competicoes.mundial.jogos.slice(0, 2).map((j) => [j.casa, j.fora]), [[lib.campeao, cha.vice], [cha.campeao, lib.vice]]);
});

test("nenhum clube joga duas vezes na mesma semana", () => {
  const m = Temporada.simularMundo({ bases, indice, semente: "sem-conflito" });
  assert.strictEqual(Temporada.conflitoDeCalendario(m.jogos), null);
});

test("empate eliminatório termina nos pênaltis", () => {
  const inicial = Temporada.simularMundo({ bases, indice, semente: "penaltis" });
  const final = inicial.competicoes.libertadores.jogos.find((j) => j.fase === "final");
  const alterado = Temporada.simularMundo({ bases, indice, semente: "penaltis", resultadosFixos: { [final.id]: { placar: [1, 1] } } });
  const decidido = alterado.competicoes.libertadores.jogos.find((j) => j.id === final.id), penaltis = decidido.penaltis;
  assert.ok(penaltis);
  const repetido = Temporada.simularMundo({ bases, indice, semente: "penaltis", resultadosFixos: { [final.id]: { placar: [1, 1], penaltis } } });
  assert.deepStrictEqual(repetido.competicoes.libertadores.jogos.find((j) => j.id === final.id).penaltis, penaltis, "preserva o desempate salvo");
  assert.strictEqual(repetido.competicoes.libertadores.campeao, penaltis[0] > penaltis[1] ? final.casa : final.fora);
});

test("o calendário não revela fases futuras do mata-mata", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const { novaCarreira, estado } = require("../carreira.js").paraTestes;
  const save = novaCarreira("Sem spoiler", "flamengo", "");
  save.semente = "calendario"; save.calendarioMundo = null;
  const e = estado(save), futurosBrutos = save.calendarioMundo.filter((j) => j.mataMata && (j.casa === save.clube || j.fora === save.clube));
  assert.ok(futurosBrutos.some((j) => j.fase === "final"), "a simulação interna tem o caminho futuro para tentar vazar");
  assert.deepStrictEqual(e.meus.filter((j) => j.mataMata), [], "a visão pública esconde o chaveamento que ainda não chegou");
});

test("a final empatada salva e anuncia o vencedor dos pênaltis", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const { novaCarreira, estado, simularMinha, fecharRodada } = require("../carreira.js").paraTestes;
  const save = novaCarreira("Final visível", "flamengo", "");
  save.semente = "calendario"; save.calendarioMundo = null; estado(save);
  const final = save.competicoes.libertadores.jogos.find((j) => j.fase === "final");
  assert.ok([final.casa, final.fora].includes(save.clube), "a semente leva o clube à final");
  let r = null;
  for (let i = 0; i < 200; i++) {
    save.partida = { rodada: save.rodada, jogoId: final.id, competicao: "libertadores", fase: "final", mataMata: true,
      casa: final.casa, fora: final.fora, modo: 1, semente: `empate-final-${i}`, decisoes: {} };
    r = simularMinha(save);
    if (r.placar[0] === r.placar[1]) break;
  }
  assert.strictEqual(r.placar[0], r.placar[1], "encontrou uma final empatada");
  fecharRodada(save, r);
  const penaltis = save.ultimo.penaltis, venceuCasa = penaltis[0] > penaltis[1], campeao = venceuCasa ? final.casa : final.fora;
  assert.deepStrictEqual(save.posJogo.penaltis, penaltis);
  assert.deepStrictEqual(save.resultadosFixos[final.id].penaltis, penaltis);
  assert.strictEqual(save.competicoes.libertadores.campeao, campeao);
  assert.strictEqual(save.posJogo.resultado, campeao === save.clube ? "V" : "D");
  assert.ok(save.feed.some((p) => p.texto.includes(`Pênaltis: ${penaltis[0]} × ${penaltis[1]}.`)), "a notícia mostra o desempate");
  assert.ok(save.feed.some((p) => /CAMPEÃO NOS PÊNALTIS|vice.*nos pênaltis/.test(p.texto)), "a notícia do título explica como a final foi decidida");
});

test("a carreira em grupo atualiza o chaveamento antes de anunciar a final", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const G = require("../carreira.js").grupo;
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "A" }], { temporadas: 1 });
  save.semente = "calendario"; save.calendarioMundo = null; G.fecharRodadaGrupo(save);
  const final = save.competicoes.libertadores.jogos.find((j) => j.fase === "final");
  assert.ok([final.casa, final.fora].includes("flamengo"));
  const simulado = G.simularJogoGrupo(save, final, { modo: 1, decisoes: {} });
  const r = { ...simulado, placar: [1, 1], completo: true, eventos: simulado.eventos.map((e) => e.tipo === "fim" ? { ...e, placar: [1, 1] } : e) };
  const penaltisDoGrupo = G.fecharJogoGrupo(save, final, r, 1, {});
  const vista = G.vistaDe(save, "flamengo"), penaltis = vista.ultimo.penaltis;
  assert.ok(penaltis, "o desempate foi calculado antes de fechar a visão do técnico");
  assert.deepStrictEqual(penaltisDoGrupo, penaltis, "a rodada ao vivo também recebe o desempate");
  assert.deepStrictEqual(vista.posJogo.penaltis, penaltis);
  assert.ok(vista.feed.some((p) => p.texto.includes(`Pênaltis: ${penaltis[0]} × ${penaltis[1]}.`)));
});

test("no calendário mundial, suspensão e lesão contam os jogos e o jogador volta", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const { novaCarreira, ajudas, timeDe, fecharRodada, proximoJogoMundo, simularMinha, sementeDoJogo } = require("../carreira.js").paraTestes;
  const save = novaCarreira("T", "flamengo", "");
  const [a, b] = ajudas.elencoDe(save, "flamengo");
  save.suspensos[a.id] = 1; save.lesoes[b.id] = 2;
  const jogar = () => {
    const jogo = proximoJogoMundo(save);
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  };
  assert.ok(!timeDe(save, "flamengo").jogadores.some((j) => j.id === a.id), "o suspenso fica fora do jogo");
  jogar();
  assert.ok(!save.suspensos[a.id], "cumpriu a suspensão de 1 jogo");
  assert.strictEqual(save.lesoes[b.id], 1);
  jogar();
  assert.ok(!save.lesoes[b.id], "voltou da lesão de 2 jogos");
});

test("no calendário mundial, os eventos aleatórios também viram notícias", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const { novaCarreira, proximoJogoMundo, simularMinha, fecharRodada, sementeDoJogo } = require("../carreira.js").paraTestes;
  const save = novaCarreira("Notícias", "flamengo", "");
  for (let i = 0; i < 8 && !save.feed.some((p) => p.tipo === "evento"); i++) {
    const jogo = proximoJogoMundo(save);
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  }
  const eventos = save.feed.filter((p) => p.tipo === "evento");
  assert.ok(eventos.length > 0, "ao menos um evento do catálogo apareceu no feed");
  assert.strictEqual(new Set(eventos.map((p) => p.id)).size, eventos.length, "nenhuma notícia foi duplicada");
});

test("a notícia da fase de grupos só sai depois do sexto jogo da copa", () => {
  process.env.DB_PATH = process.env.DB_PATH || ":memory:";
  const { novaCarreira, proximoJogoMundo, simularMinha, fecharRodada, sementeDoJogo, estado } = require("../carreira.js").paraTestes;
  const preparar = (save, jogo) => {
    save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata,
      casa: jogo.casa, fora: jogo.fora, modo: 1, semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
    fecharRodada(save, simularMinha(save));
  };

  const cedo = novaCarreira("Notícia cedo", "flamengo", "");
  const jogados = [];
  while (jogados.length < 6) { const jogo = proximoJogoMundo(cedo); jogados.push(jogo); preparar(cedo, jogo); }
  assert.strictEqual(jogados.filter((j) => j.competicao === "libertadores").length, 2, "o sexto jogo geral ainda é só o segundo da Libertadores");
  assert.ok(!cedo.feed.some((p) => /fase de grupos da Libertadores/.test(p.texto)), "não anunciou o fim do grupo antes da hora");
  cedo.feed.unshift({ tipo: "eliminado", texto: "O Flamengo foi eliminado na fase de grupos da Libertadores.", rodada: 6 });
  estado(cedo);
  assert.ok(!cedo.feed.some((p) => /fase de grupos da Libertadores/.test(p.texto)), "removeu a notícia prematura de um save afetado");

  const naHora = novaCarreira("Notícia certa", "flamengo", "");
  const ultimoDoGrupo = naHora.calendarioMundo.find((j) => j.competicao === "libertadores" && j.fase.startsWith("grupo-") && j.rodada === 5 && (j.casa === naHora.clube || j.fora === naHora.clube));
  preparar(naHora, ultimoDoGrupo);
  assert.ok(naHora.feed.some((p) => /fase de grupos da Libertadores|classificado no mata-mata da Libertadores/.test(p.texto)), "anunciou o destino depois da sexta rodada real");
});
