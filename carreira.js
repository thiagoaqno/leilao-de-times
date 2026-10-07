// Carreira de Treinador — canal "/carreira" do Socket.io (planos/carreira.md, fase 3: a temporada jogável por menus).
// Uma pessoa por carreira. O servidor manda: guarda tudo no banco (bd.js), simula as partidas (public/carreira/motor.js)
// e só aceita a decisão que a partida parada está pedindo. A partida em andamento fica salva (com a semente e as
// decisões), então recarregar a página volta exatamente no mesmo ponto e não dá para "tentar de novo".
const bd = require("./bd.js");
const Motor = require("./public/carreira/motor.js");
const Temporada = require("./public/carreira/temporada.js");
const { FORMATIONS } = require("./public/escalacao.js");
const crypto = require("crypto");

// as carreiras antigas continuam na base em que nasceram; as novas começam no Brasileirão
const BASES = { teste: require("./public/carreira/base/teste.js"), "brasileirao-2026": require("./public/carreira/base/brasileirao-2026.js") };
const BASE_PADRAO = "brasileirao-2026";
const VERSAO = 1;

const ok = (cb, extra = {}) => typeof cb === "function" && cb({ ok: true, ...extra });
const falha = (cb, error) => typeof cb === "function" && cb({ ok: false, error });
const limparNome = (n) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 24);
const inteiro = (v, a, b, d) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };

const baseDe = (save) => BASES[save.base] || BASES[BASE_PADRAO];
const clubeDe = (save, id) => baseDe(save).clubes.find((c) => c.id === id);
const idsDosClubes = (save) => baseDe(save).clubes.map((c) => c.id);

function novaCarreira(nome, clube, skin) {
  const semente = crypto.randomBytes(6).toString("hex"), base = BASES[BASE_PADRAO];
  return {
    v: VERSAO, base: base.id, ano: base.ano, temporada: 1, clube, tecnico: { nome, skin: String(skin || "").slice(0, 20) }, semente,
    calendario: Temporada.gerarCalendario(base.clubes.map((c) => c.id), semente + ":1"),
    rodada: 0, resultados: [], gols: {}, modo: 1,
    escalacao: { formacao: base.clubes.find((c) => c.id === clube).formacao, tatica: { mentalidade: 0, pressao: 1, linha: 1 }, titulares: null },
    partida: null, ultimo: null, historico: [],
  };
}

// o time que entra em campo: o da base; o seu com a formação, a tática e os titulares que você escolheu
function timeDe(save, id) {
  const c = clubeDe(save, id), meu = id === save.clube;
  return {
    id: c.id, nome: c.nome, jogadores: c.jogadores,
    formacao: meu ? save.escalacao.formacao : c.formacao,
    tatica: meu ? save.escalacao.tatica : { mentalidade: 0, pressao: 1, linha: 1 },
    titulares: meu && save.escalacao.titulares ? save.escalacao.titulares : undefined,
  };
}
const sementeDoJogo = (save, rodada, casa, fora) => `${save.semente}:${save.temporada}:${rodada}:${casa}-${fora}`;
function simularMinha(save) {
  const p = save.partida;
  return Motor.simularPartida({ casa: timeDe(save, p.casa), fora: timeDe(save, p.fora), semente: p.semente, modo: p.modo, controla: p.casa === save.clube ? 0 : 1, decisoes: p.decisoes });
}
function contarGols(save, r) { for (const e of r.eventos) if (e.tipo === "gol") save.gols[e.jogador] = (save.gols[e.jogador] || 0) + 1; }
// a sua partida acabou: os outros jogos da rodada, a tabela e a próxima rodada
function fecharRodada(save, r) {
  const rodada = save.partida.rodada, resultados = [];
  for (const [c, f] of save.calendario[rodada]) {
    if (c === save.partida.casa && f === save.partida.fora) { resultados.push([c, f, r.placar[0], r.placar[1]]); continue; }
    const outro = Motor.simularPartida({ casa: timeDe(save, c), fora: timeDe(save, f), semente: sementeDoJogo(save, rodada, c, f) });
    contarGols(save, outro);
    resultados.push([c, f, outro.placar[0], outro.placar[1]]);
  }
  contarGols(save, r);
  save.resultados[rodada] = resultados;
  save.ultimo = {
    rodada, casa: save.partida.casa, fora: save.partida.fora, placar: r.placar,
    eventos: r.eventos, modo: save.partida.modo, // a narração inteira, para a tela mostrar o jogo que acabou de terminar
  };
  save.partida = null;
  save.rodada = rodada + 1;
}

function estado(save) {
  const ids = idsDosClubes(save), tabela = Temporada.tabela(ids, save.resultados.filter(Boolean));
  const meus = save.calendario.map((jogos, i) => {
    const j = Temporada.jogoDoClube(save.calendario, i, save.clube), res = (save.resultados[i] || []).find((x) => x[0] === j[0] && x[1] === j[1]);
    return { rodada: i, casa: j[0], fora: j[1], placar: res ? [res[2], res[3]] : null };
  });
  let partida = null;
  if (save.partida) {
    const r = simularMinha(save);
    partida = { ...save.partida, placar: r.placar, eventos: r.eventos, parado: r.parado, completo: r.completo, times: r.times };
  }
  const artilharia = Object.entries(save.gols).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, gols]) => ({ id, gols }));
  return {
    base: save.base, ano: save.ano, temporada: save.temporada, clube: save.clube, tecnico: save.tecnico, modo: save.modo,
    rodada: save.rodada, total: save.calendario.length, fim: save.rodada >= save.calendario.length,
    escalacao: save.escalacao, tabela, meus, artilharia, partida, ultimo: save.ultimo, historico: save.historico,
    rodadaAnterior: save.rodada > 0 ? save.resultados[save.rodada - 1] : null,
    proximo: save.rodada < save.calendario.length ? Temporada.jogoDoClube(save.calendario, save.rodada, save.clube) : null,
  };
}

function limparEscalacao(save, d) {
  const c = clubeDe(save, save.clube), e = save.escalacao;
  if (d.formacao && FORMATIONS.futebol[d.formacao]) e.formacao = d.formacao;
  if (d.tatica && typeof d.tatica === "object") e.tatica = { mentalidade: inteiro(d.tatica.mentalidade, -2, 2, 0), pressao: inteiro(d.tatica.pressao, 0, 2, 1), linha: inteiro(d.tatica.linha, 0, 2, 1) };
  if (d.titulares === null) e.titulares = null;
  else if (Array.isArray(d.titulares)) {
    const ids = [...new Set(d.titulares.map(String))].filter((id) => c.jogadores.some((j) => j.id === id));
    if (ids.length !== 11) return "Escolha 11 titulares.";
    if (!ids.some((id) => c.jogadores.find((j) => j.id === id).pos === "GOL")) return "Falta um goleiro entre os titulares.";
    e.titulares = ids;
  }
  return null;
}
// a resposta para o que a partida parada pediu: a opção do lance, ou as mudanças táticas
function limparDecisao(parado, d) {
  if (parado.tipo === "lance") {
    const id = typeof d === "string" ? d : d && d.opcao;
    return parado.opcoes.some((o) => o.id === id) ? id : null;
  }
  const out = {};
  if (d && typeof d === "object") {
    if (d.tatica && typeof d.tatica === "object") out.tatica = { mentalidade: inteiro(d.tatica.mentalidade, -2, 2, 0), pressao: inteiro(d.tatica.pressao, 0, 2, 1), linha: inteiro(d.tatica.linha, 0, 2, 1) };
    if (d.formacao && FORMATIONS.futebol[d.formacao]) out.formacao = d.formacao;
    if (Array.isArray(d.subs)) out.subs = d.subs.slice(0, 5).filter((s) => Array.isArray(s) && s.length === 2).map(([a, b]) => [String(a), String(b)]);
  }
  return out;
}

module.exports = function ligarCarreira(io) {
  const nsp = io.of("/carreira");
  nsp.on("connection", (socket) => {
    let token = null, criadas = 0;
    // abre a carreira desta conexão, faz a ação e salva
    function comCarreira(cb, acao) {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      const save = c.dados;
      if (!save || save.v !== VERSAO) return falha(cb, "Essa carreira é de uma versão antiga.");
      const erro = acao(save);
      if (erro) return falha(cb, erro);
      bd.salvarCarreira(c.id, save);
      ok(cb, { estado: estado(save) });
    }
    socket.on("criar", (d = {}, cb) => {
      const nome = limparNome(d.nome), base = BASES[BASE_PADRAO];
      if (!nome) return falha(cb, "Coloque o seu nome.");
      if (!base.clubes.some((c) => c.id === d.clube)) return falha(cb, "Escolha um clube.");
      if (++criadas > 5) return falha(cb, "Calma: já foram várias carreiras criadas daqui.");
      try {
        const save = novaCarreira(nome, d.clube, d.skin), c = bd.criarCarreira(nome, save);
        token = c.token;
        ok(cb, { token: c.token, recuperacao: c.recuperacao, estado: estado(save) });
      } catch (e) { falha(cb, "O banco de dados não respondeu. Tente de novo daqui a pouco."); }
    });
    socket.on("entrar", (d = {}, cb) => {
      let c = null;
      try { c = bd.carreiraPorToken(d.token); } catch {}
      if (!c) return falha(cb, "Carreira não encontrada.");
      token = d.token;
      ok(cb, { estado: estado(c.dados), nome: c.nome });
    });
    socket.on("recuperar", (d = {}, cb) => {
      let c = null;
      try { c = bd.recuperarCarreira(d.codigo); } catch {}
      if (!c) return falha(cb, "Código não encontrado. Confira as 12 letras.");
      token = c.token;
      ok(cb, { token: c.token, estado: estado(c.dados) });
    });
    socket.on("escalacao", (d = {}, cb) => comCarreira(cb, (save) => (save.partida ? "Não dá para mexer na escalação com a partida em andamento." : limparEscalacao(save, d))));
    socket.on("modo", (d = {}, cb) => comCarreira(cb, (save) => { save.modo = inteiro(d.modo, 1, 3, 1); }));
    // começa a partida da rodada (ou devolve a que já estava em andamento)
    socket.on("jogar", (d = {}, cb) => comCarreira(cb, (save) => {
      if (save.partida) return null;
      if (save.rodada >= save.calendario.length) return "A temporada acabou.";
      const [casa, fora] = Temporada.jogoDoClube(save.calendario, save.rodada, save.clube);
      save.partida = { rodada: save.rodada, casa, fora, modo: inteiro(d.modo ?? save.modo, 1, 3, 1), semente: sementeDoJogo(save, save.rodada, casa, fora), decisoes: {} };
      const r = simularMinha(save);
      if (r.completo) fecharRodada(save, r);
      return null;
    }));
    socket.on("decidir", (d = {}, cb) => comCarreira(cb, (save) => {
      if (!save.partida) return "Nenhuma partida em andamento.";
      const r = simularMinha(save);
      if (!r.parado || r.parado.id !== d.id) return "Essa decisão não é a de agora.";
      const resposta = limparDecisao(r.parado, d.resposta);
      if (resposta == null) return "Escolha uma das opções.";
      save.partida.decisoes[d.id] = resposta;
      const depois = simularMinha(save);
      if (depois.completo) fecharRodada(save, depois);
      return null;
    }));
    socket.on("novaTemporada", (d, cb) => comCarreira(cb, (save) => {
      if (save.rodada < save.calendario.length) return "A temporada ainda não acabou.";
      const tabela = Temporada.tabela(idsDosClubes(save), save.resultados), pos = tabela.findIndex((l) => l.id === save.clube) + 1;
      const [artilheiro] = Object.entries(save.gols).sort((a, b) => b[1] - a[1]);
      save.historico.push({ ano: save.ano, temporada: save.temporada, posicao: pos, pontos: tabela[pos - 1].p, campeao: tabela[0].id, artilheiro: artilheiro ? { id: artilheiro[0], gols: artilheiro[1] } : null });
      save.temporada++; save.ano++;
      save.calendario = Temporada.gerarCalendario(idsDosClubes(save), `${save.semente}:${save.temporada}`);
      Object.assign(save, { rodada: 0, resultados: [], gols: {}, partida: null, ultimo: null });
      return null;
    }));
    socket.on("sair", (d, cb) => { token = null; ok(cb); });
  });
};
