// Carreira de Treinador: a Copa do Mundo (carreira-copa.js). As 48 seleções da base, a pausa no meio da temporada (o calendário dos
// clubes anda e não se cruza com a Copa), a proposta pela campanha anterior, a convocação só com jogadores do país, os jogos da
// seleção pelo motor e a sala em grupo (cada técnico com uma seleção, o jogo da seleção na rodada ao vivo).
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Carreira = require("../carreira.js");
const Motor = require("../public/carreira/motor.js");
const Rd = require("../carreira-rodada.js");
const Base = require("../public/carreira/base/selecoes-2026.js");
const T = Carreira.paraTestes, G = Carreira.grupo, { Copa } = T;

// a confiança da diretoria fica acima do ultimato: os testes daqui não são sobre a demissão
const segurar = (v) => { if (v.gestao) { v.gestao.confianca = Math.max(v.gestao.confianca, 60); v.gestao.ultimato = null; } };
function jogar(save) {
  segurar(save); T.prepararCopa(save);
  const jogo = T.proximoJogoMundo(save); if (!jogo) return null;
  save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, agregado: [0, 0], casa: jogo.casa, fora: jogo.fora, modo: 1, semente: T.sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
  let r = T.simularMinha(save);
  for (let k = 0; !r.completo && k < 80; k++) { save.partida.decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado); r = T.simularMinha(save); }
  T.fecharRodada(save, r);
  return jogo;
}
const jogarTudo = (save) => { const jogos = []; for (let j; (j = jogar(save));) jogos.push(j); return jogos; };

test("base: as 48 seleções do formato novo, cada uma com gente para convocar (26, 3 goleiros) e a bandeira", () => {
  assert.strictEqual(Base.selecoes.length, 48);
  assert.strictEqual(new Set(Base.selecoes.map((s) => s.id)).size, 48);
  const conf = Base.selecoes.reduce((a, s) => ({ ...a, [s.conf]: (a[s.conf] || 0) + 1 }), {});
  assert.deepStrictEqual(conf, { CONCACAF: 6, CONMEBOL: 7, AFC: 8, CAF: 10, OFC: 1, UEFA: 16 });
  const save = T.completar(T.novaCarreira("Teste", "flamengo", "", 3));
  for (const s of Base.selecoes) {
    const pool = Copa.pool(save, T.cx, s.id);
    assert.ok(pool.length >= Copa.CONVOCADOS, `${s.nome}: ${pool.length} jogadores`);
    assert.ok(pool.filter((j) => j.pos === "GOL").length >= Copa.GOLEIROS, `${s.nome}: goleiros`);
    assert.ok(pool.every((j) => j.nat === s.nat), `${s.nome}: só jogadores do país`);
    assert.ok(s.bandeira && s.cores.length === 2);
  }
  assert.ok(Copa.temCopa(2) && Copa.temCopa(4) && !Copa.temCopa(1) && !Copa.temCopa(3));
});

test("a proposta: a campanha melhor leva uma seleção mais forte", () => {
  const forca = (id) => Base.selecoes.find((s) => s.id === id).forca;
  const boa = Copa.pontuacao({ posicao: 1, titulos: ["Brasileirão", "Libertadores"], vices: [], meta: { cumprida: true } }, 1);
  const ruim = Copa.pontuacao({ posicao: 18, titulos: [], vices: [], meta: { cumprida: false }, divisao: "rebaixado" }, 1);
  assert.ok(boa > 85 && ruim < 15, `${boa} ${ruim}`);
  assert.ok(forca(Copa.escolherSelecao(boa, "a")) > forca(Copa.escolherSelecao(ruim, "a")) + 8);
  const ocupadas = new Set([Copa.escolherSelecao(boa, "a")]);
  assert.ok(!ocupadas.has(Copa.escolherSelecao(boa, "a", ocupadas)), "na sala, a mesma seleção não vai para dois técnicos");
});

test("solo: a Copa na 2ª temporada, a pausa no calendário, a proposta, a convocação e os jogos da seleção", { timeout: 240000 }, () => {
  const v = T.completar(T.novaCarreira("Teste", "palmeiras", "", 3));
  assert.ok(!v.competicoes.copadomundo, "na 1ª temporada não tem Copa");
  const antes = jogarTudo(v).filter((j) => j.competicao === "brasileirao-2026").length;
  assert.strictEqual(antes, 38);
  assert.strictEqual(T.novaTemporada(v), null);
  const comp = v.competicoes.copadomundo;
  assert.ok(comp, "a Copa entrou no mundo");
  assert.strictEqual(comp.participantes.length, 48);
  assert.strictEqual(comp.grupos.length, 12);
  assert.strictEqual(comp.jogos.length, 72 + 16 + 8 + 4 + 2 + 1 + 1, "12 grupos de 4 em turno único, 16 avos, oitavas, quartas, semi, 3º lugar e final");
  const semanasCopa = new Set(comp.jogos.map((j) => j.semana));
  assert.deepStrictEqual([...semanasCopa].sort((a, b) => a - b), [39, 40, 41, 42, 43, 44, 45, 46]);
  assert.ok(!v.calendarioMundo.some((j) => j.competicao !== "copadomundo" && semanasCopa.has(j.semana)), "o futebol de clubes para na Copa");
  assert.ok(comp.jogos.filter((j) => j.fase === "dezesseis").every((j) => comp.grupos.find((g) => g.clubes.includes(j.casa)) !== comp.grupos.find((g) => g.clubes.includes(j.fora))), "nos 16 avos, ninguém do mesmo grupo");
  // a proposta
  assert.ok(v.selecao && v.selecao.status === "pendente" && Copa.ehSelecao(v.selecao.id));
  assert.ok(v.caixaEntrada.some((e) => e.tipo === "selecao"));
  const e = T.estado(v);
  assert.strictEqual(e.copa.semana, 39); assert.strictEqual(e.selecao.status, "pendente"); assert.ok(!e.selecao.convocados, "antes de aceitar, sem lista");
  assert.strictEqual(T.selecaoAcao(v, { acao: "aceitar" }), null);
  assert.match(T.selecaoAcao(v, { acao: "aceitar" }), /já é o técnico/);
  const id = v.selecao.id, sel = Base.selecoes.find((s) => s.id === id);
  // a convocação: só jogadores do país, no máximo 26
  const outro = Base.selecoes.find((s) => s.id !== id).jogadores[0];
  assert.match(T.selecaoAcao(v, { acao: "convocar", jogador: outro.id }), /não pode defender/);
  assert.match(T.selecaoAcao(v, { acao: "convocar", jogador: T.estado(v).selecao.pool.find((p) => !Copa.convocadosDe(v, id).includes(p)) }), /26 nomes/);
  const tirado = Copa.convocadosDe(v, id)[0];
  assert.strictEqual(T.selecaoAcao(v, { acao: "tirar", jogador: tirado }), null);
  assert.ok(!Copa.convocadosDe(v, id).includes(tirado));
  assert.strictEqual(T.selecaoAcao(v, { acao: "limpar" }), null);
  assert.strictEqual(Copa.convocadosDe(v, id).length, 0);
  assert.strictEqual(T.selecaoAcao(v, { acao: "escalacao", formacao: "4-4-2", tatica: { mentalidade: 1, estilo: "tikitaka" } }), null);
  assert.strictEqual(v.selecao.escalacao.tatica.estilo, "tikitaka");
  // até a pausa: a janela do meio do ano está aberta durante a Copa, e a lista vazia se completa na estreia
  let jogo;
  while ((jogo = T.proximoJogoMundo(v)) && jogo.competicao !== "copadomundo") jogar(v);
  assert.ok(jogo && jogo.semana === 39 && (jogo.casa === id || jogo.fora === id), "o próximo jogo é o da seleção, na semana 39");
  assert.strictEqual(T.rodadaDaJanela(v), 19, "a Copa é depois da rodada 19 do Brasileirão");
  assert.ok(T.estado(v).janela.aberta, "a janela do meio do ano está aberta na pausa");
  jogar(v);
  assert.strictEqual(Copa.convocadosDe(v, id).length, Copa.CONVOCADOS, "a lista vazia virou a automática na estreia");
  assert.ok(Copa.convocadosDe(v, id).every((pid) => T.ajudas.jogadorDe(v, pid).nat === sel.nat));
  assert.match(T.selecaoAcao(v, { acao: "tirar", jogador: Copa.convocadosDe(v, id)[0] }), /começou/);
  assert.strictEqual(v.ultimo.competicao, "copadomundo"); assert.ok(v.posJogo.selecao && /Copa do Mundo/.test(v.posJogo.rotulo));
  assert.ok(Object.values(v.golsComp.copadomundo || {}).length >= 0);
  const golsClube = { ...v.gols };
  // o resto da temporada: a seleção até cair ou ser campeã, e o clube volta depois da pausa
  const resto = jogarTudo(v);
  assert.ok(!resto.some((j) => j.competicao === "copadomundo" && j.semana < 39));
  const doClube = resto.filter((j) => j.competicao !== "copadomundo");
  assert.ok(doClube.every((j) => j.semana > 46), "o clube volta depois da Copa");
  assert.strictEqual(v.jogosJogados.filter((x) => x.startsWith("brasileirao-2026:")).length, 38, "a liga continua com 38 rodadas");
  for (const [pid, n] of Object.entries(golsClube)) assert.ok((v.gols[pid] || 0) >= n);
  const h = v.historico.find((x) => x.temporada === 2);
  assert.ok(h.selecao && h.selecao.id === id && h.selecao.jogos >= 3, "o histórico guarda a campanha da seleção");
  assert.ok(v.competicoes.copadomundo.campeao);
  const fim = T.estado(v);
  assert.ok(fim.competicoes.copadomundo.festa && fim.competicoes.copadomundo.festa.elenco.length === Copa.CONVOCADOS, "a festa do campeão traz os convocados");
});

test("sala: cada técnico recebe uma seleção diferente, a proposta vale na pausa e o jogo da seleção passa pela rodada ao vivo", { timeout: 240000 }, () => {
  const save = G.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const rodada = (ateCopa) => {
    for (let p; (G.prazosDaCopa(save), p = G.proximaRodadaGrupo(save));) {
      if (ateCopa && p.jogos.some((j) => j.competicao === "copadomundo")) return p;
      G.comecarRodadaGrupo(save); for (const j of p.jogos) G.jogarNaHora(save, j); G.fecharRodadaGrupo(save);
    }
    return null;
  };
  rodada();
  for (const c of ["flamengo", "palmeiras"]) { const v = G.vistaDe(save, c); segurar(v); G.guardarVista(save, v); }
  assert.strictEqual(G.novaTemporadaGrupo(save), null);
  const ofertas = ["flamengo", "palmeiras"].map((c) => save.humanos[c].estado.selecao);
  assert.ok(ofertas.every((s) => s && s.status === "pendente"));
  assert.notStrictEqual(ofertas[0].id, ofertas[1].id, "ninguém recebe a mesma seleção");
  const v = G.vistaDe(save, "flamengo"); assert.strictEqual(G.selecaoAcao(v, { acao: "aceitar" }), null); G.guardarVista(save, v);
  const p = rodada(true);
  assert.ok(p && p.semana === 39, "a rodada da semana 39 é a da Copa");
  assert.ok(["flamengo", "palmeiras"].every((c) => save.humanos[c].estado.selecao.status === "aceita"), "quem não respondeu assumiu na pausa");
  const sel = ofertas[0].id;
  assert.strictEqual(G.humanoDoTime(save, sel), "flamengo");
  // a rodada ao vivo com o jogo da seleção: o lado do técnico é o da seleção dele
  let agora = 1e6; const rod = Rd.criarRodada(save, p, agora, { vel: 200, decisaoMs: 5, espera: 0 });
  G.comecarRodadaGrupo(save);
  const visao = Rd.visao(save, rod, "flamengo", agora);
  assert.ok(visao.meu && (visao.meu.casa === sel || visao.meu.fora === sel));
  for (let i = 0; i < 400 && !Rd.tick(save, rod, agora += 250).acabou;);
  assert.ok(rod.jogos.every((j) => j.fim));
  assert.ok(G.vistaDe(save, "flamengo").jogosJogados.some((id) => id.startsWith("copadomundo:")));
  rodada();
  for (const c of ["flamengo", "palmeiras"]) assert.ok(G.vistaDe(save, c).historico.find((x) => x.temporada === 2).selecao, `${c}: a campanha da seleção no histórico`);
});
