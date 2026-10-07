// Carreira de Treinador — canal "/carreira" do Socket.io (planos/carreira.md).
// Uma pessoa por carreira. O servidor manda: guarda tudo no banco (bd.js), simula as partidas (public/carreira/motor.js)
// e só aceita a decisão que a partida parada está pedindo. A partida em andamento fica salva (com a semente e as
// decisões), então recarregar a página volta exatamente no mesmo ponto e não dá para "tentar de novo".
// Além das rodadas: o dinheiro (caixa, salários, bilheteria, TV), as lesões e suspensões que passam de um jogo para o
// outro, a moral do elenco, o mercado (comprar, pôr à venda, vender na hora) e os eventos entre as rodadas
// (carreira-eventos.js). Enquanto a partida está em andamento, nada disso mexe: o jogo precisa ser refeito igual.
const bd = require("./bd.js");
const Motor = require("./public/carreira/motor.js");
const Temporada = require("./public/carreira/temporada.js");
const Mercado = require("./public/carreira/mercado.js");
const Eventos = require("./carreira-eventos.js");
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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const { dinheiro } = Mercado;

const baseDe = (save) => BASES[save.base] || BASES[BASE_PADRAO];
const clubeDe = (save, id) => baseDe(save).clubes.find((c) => c.id === id);
const idsDosClubes = (save) => baseDe(save).clubes.map((c) => c.id);
// o índice de cada base: jogador -> { jogador, clube de origem }
const indices = new Map();
function indice(save) {
  const b = baseDe(save);
  if (!indices.has(b.id)) indices.set(b.id, new Map(b.clubes.flatMap((c) => c.jogadores.map((j) => [j.id, { j, clube: c.id }]))));
  return indices.get(b.id);
}
const jogadorDe = (save, pid) => indice(save).get(pid)?.j || null;
const donoDe = (save, pid) => save.donos[pid] || indice(save).get(pid)?.clube || null;
const elencoDe = (save, clube) => [...indice(save).values()].filter(({ j }) => donoDe(save, j.id) === clube).map(({ j }) => j);
const notaDe = (save, j) => clamp(j.nota + (save.bonusNota[j.id] || 0), 40, 95);
const comNota = (save, j) => ({ ...j, nota: notaDe(save, j) });
const salarioDe = (save, j) => save.salarios[j.id] || Mercado.salarioDe(comNota(save, j));
const disponivel = (save, pid) => !save.lesoes[pid] && !save.suspensos[pid];
const folhaDe = (save) => elencoDe(save, save.clube).reduce((s, j) => s + salarioDe(save, j), 0);

// as carreiras criadas antes destas partes ganham os campos novos na primeira vez que abrem
function completar(save) {
  const c = clubeDe(save, save.clube);
  const padrao = { caixa: Mercado.CAIXA_INICIAL[c.tamanho] || 15e6, moral: 60, donos: {}, aVenda: [], lesoes: {}, suspensos: {}, amarelos: {}, bonusNota: {},
    salarios: {}, caixaEntrada: [], transferencias: [], indicacoes: {}, financas: [], tentativas: { rodada: -1, por: {} }, bonusVitoria: 0, provocado: null, efeitos: [], eventosVistos: {} };
  for (const [k, v] of Object.entries(padrao)) if (save[k] === undefined) save[k] = v;
  return save;
}
function novaCarreira(nome, clube, skin) {
  const semente = crypto.randomBytes(6).toString("hex"), base = BASES[BASE_PADRAO];
  const save = {
    v: VERSAO, base: base.id, ano: base.ano, temporada: 1, clube, tecnico: { nome, skin: String(skin || "").slice(0, 20) }, semente,
    calendario: Temporada.gerarCalendario(base.clubes.map((c) => c.id), semente + ":1"),
    rodada: 0, resultados: [], gols: {}, modo: 1,
    escalacao: { formacao: base.clubes.find((c) => c.id === clube).formacao, tatica: { mentalidade: 0, pressao: 1, linha: 1 }, titulares: null, fixo: false },
    partida: null, ultimo: null, historico: [],
  };
  completar(save);
  save.caixaEntrada.unshift({ id: "boas-vindas", rodada: 0, tipo: "boas-vindas", icone: "aperto", resolvido: true, titulo: "Bem-vindo ao clube",
    texto: `A diretoria apresentou ${nome} como novo técnico. Caixa para a temporada: ${dinheiro(save.caixa)}. A janela de transferências está aberta até a rodada 4.` });
  return save;
}

// o time que entra em campo: o elenco de agora (com as transferências), sem lesionados e suspensos, com a moral no seu
const moralBonus = (save) => Math.round((save.moral - 60) / 12);
// os efeitos dos eventos que valem na rodada (carreira-eventos.js): nota do time, de um jogador ou do próximo adversário
const efeitosAtivos = (save, rodada) => (save.efeitos || []).filter((e) => e.de <= rodada && e.ate >= rodada);
const somaEfeitos = (lista, alvo) => lista.reduce((s, e) => s + (e.alvo === alvo ? e.nota : 0), 0);
function timeDe(save, id) {
  const c = clubeDe(save, id), meu = id === save.clube, R = save.partida ? save.partida.rodada : save.rodada;
  const rival = !meu && save.partida && (save.partida.casa === id || save.partida.fora === id);
  const ativos = meu || rival ? efeitosAtivos(save, R) : [];
  const extra = meu ? moralBonus(save) + somaEfeitos(ativos, "time")
    : rival ? (save.provocado && save.provocado.rodada === R ? save.provocado.nota : 0) + somaEfeitos(ativos, "rival") : 0;
  return {
    id: c.id, nome: c.nome,
    jogadores: elencoDe(save, id).filter((j) => disponivel(save, j.id)).map((j) => ({ ...j, nota: clamp(notaDe(save, j) + extra + (meu ? somaEfeitos(ativos, j.id) : 0), 40, 97) })),
    formacao: meu ? save.escalacao.formacao : c.formacao,
    tatica: meu ? save.escalacao.tatica : { mentalidade: 0, pressao: 1, linha: 1 },
    titulares: meu && save.escalacao.titulares ? save.escalacao.titulares : undefined,
    fixo: meu && !!save.escalacao.fixo,
  };
}
const titularesDe = (save, id) => Motor.escalacaoAutomatica(timeDe(save, id));
const sementeDoJogo = (save, rodada, casa, fora) => `${save.semente}:${save.temporada}:${rodada}:${casa}-${fora}`;
function simularMinha(save) {
  const p = save.partida;
  return Motor.simularPartida({ casa: timeDe(save, p.casa), fora: timeDe(save, p.fora), semente: p.semente, modo: p.modo, controla: p.casa === save.clube ? 0 : 1, decisoes: p.decisoes });
}
function contarGols(save, r) { for (const e of r.eventos) if (e.tipo === "gol") save.gols[e.jogador] = (save.gols[e.jogador] || 0) + 1; }
function mudarMoral(save, d) { save.moral = clamp(save.moral + d, 20, 95); }
// dinheiro entrando (positivo) ou saindo (negativo), anotado no extrato da rodada
function movimentar(save, nome, valor) {
  save.caixa += valor;
  let f = save.financas[0];
  if (!f || f.rodada !== save.rodada) { f = { rodada: save.rodada, itens: [] }; save.financas.unshift(f); save.financas.length = Math.min(save.financas.length, 12); }
  f.itens.push([nome, valor]);
}
function avisar(save, e) {
  save.caixaEntrada.unshift({ id: `${save.temporada}-${save.rodada}-${e.tipo}-${save.caixaEntrada.length}`, rodada: save.rodada, resolvido: true, ...e });
  save.caixaEntrada.length = Math.min(save.caixaEntrada.length, 40);
}
function vender(save, pid, comprador, valor) {
  const j = jogadorDe(save, pid);
  save.donos[pid] = comprador; delete save.salarios[pid];
  save.aVenda = save.aVenda.filter((x) => x !== pid);
  movimentar(save, `Venda de ${j.nome}`, valor);
  save.transferencias.unshift({ rodada: save.rodada, jogador: pid, de: save.clube, para: comprador, valor });
  return `${j.nome} foi vendido ao ${clubeDe(save, comprador).nome} por ${dinheiro(valor)}.`;
}
function ultimosResultados(save, n) {
  const out = [];
  for (let i = save.rodada - 1; i >= 0 && out.length < n; i--) {
    const res = (save.resultados[i] || []).find((x) => x[0] === save.clube || x[1] === save.clube); if (!res) continue;
    const [a, b] = res[0] === save.clube ? [res[2], res[3]] : [res[3], res[2]];
    out.push(a > b ? "V" : a === b ? "E" : "D");
  }
  return out;
}
const ajudas = { elencoDe, clubeDe, idsDosClubes, jogadorDe, donoDe, notaDe, comNota, salarioDe, titularesDe, mudarMoral, movimentar, vender, ultimosResultados };

// lesões, cartões e suspensões de todos os jogos da rodada
function cartoesELesoes(save, r, semente) {
  const sorte = Motor.sorteDe("lesoes:" + semente);
  for (const e of r.eventos) {
    if (e.tipo === "lesao") save.lesoes[e.jogador] = Math.max(save.lesoes[e.jogador] || 0, 1 + Math.floor(sorte() * 3));
    else if (e.tipo === "vermelho") { save.suspensos[e.jogador] = Math.max(save.suspensos[e.jogador] || 0, 1); delete save.amarelos[e.jogador]; }
    else if (e.tipo === "amarelo") {
      save.amarelos[e.jogador] = (save.amarelos[e.jogador] || 0) + 1;
      if (save.amarelos[e.jogador] >= 3) { save.suspensos[e.jogador] = 1; delete save.amarelos[e.jogador]; } // o terceiro amarelo suspende
    }
  }
}
// a sua partida acabou: os outros jogos da rodada, a tabela, o dinheiro, a moral, as lesões e os eventos
function fecharRodada(save, r) {
  const rodada = save.partida.rodada, resultados = [], meu = save.clube, clube = clubeDe(save, meu);
  // quem cumpriu suspensão ou estava machucado nesta rodada tem uma rodada a menos para voltar
  for (const lista of [save.lesoes, save.suspensos]) for (const pid of Object.keys(lista)) if (--lista[pid] <= 0) delete lista[pid];
  for (const [c, f] of save.calendario[rodada]) {
    const semente = sementeDoJogo(save, rodada, c, f);
    if (c === save.partida.casa && f === save.partida.fora) { resultados.push([c, f, r.placar[0], r.placar[1]]); cartoesELesoes(save, r, semente); continue; }
    const outro = Motor.simularPartida({ casa: timeDe(save, c), fora: timeDe(save, f), semente });
    contarGols(save, outro); cartoesELesoes(save, outro, semente);
    resultados.push([c, f, outro.placar[0], outro.placar[1]]);
  }
  contarGols(save, r);
  save.resultados[rodada] = resultados;
  // o dinheiro e a moral do jogo
  const emCasa = save.partida.casa === meu, [nos, eles] = emCasa ? r.placar : [r.placar[1], r.placar[0]];
  if (emCasa) movimentar(save, "Bilheteria", Math.round(clube.tamanho * 6e5 * (0.7 + save.moral / 200) / 1e4) * 1e4);
  movimentar(save, "Cota de TV", clube.tamanho * 4e5);
  if (nos > eles) { movimentar(save, "Prêmio por vitória", clube.tamanho * 2e5 + (save.bonusVitoria || 0)); mudarMoral(save, 6); }
  else if (nos === eles) mudarMoral(save, 1); else mudarMoral(save, -6);
  movimentar(save, "Salários (1 semana)", -Math.round(folhaDe(save) / 4));
  save.ultimo = { rodada, casa: save.partida.casa, fora: save.partida.fora, placar: r.placar, eventos: r.eventos, modo: save.partida.modo };
  save.partida = null;
  save.provocado = null;
  save.rodada = rodada + 1;
  save.efeitos = (save.efeitos || []).filter((e) => e.ate >= save.rodada);
  // quem se machucou ou foi suspenso no seu time vira aviso
  const fora = elencoDe(save, meu).filter((j) => save.lesoes[j.id] || save.suspensos[j.id]).filter((j) => r.eventos.some((e) => e.jogador === j.id && ["lesao", "vermelho", "amarelo"].includes(e.tipo)));
  for (const j of fora) avisar(save, { tipo: "desfalque", icone: save.lesoes[j.id] ? "alerta" : "cartas", titulo: `${j.nome} desfalca o time`, texto: save.lesoes[j.id] ? `Lesão: fica fora por ${save.lesoes[j.id]} rodada${save.lesoes[j.id] > 1 ? "s" : ""}.` : "Suspenso para o próximo jogo." });
  if (save.rodada === 4) avisar(save, { tipo: "janela", icone: "cadeado", titulo: "A janela fechou", texto: "As transferências voltam na rodada 17." });
  if (save.rodada === 16) avisar(save, { tipo: "janela", icone: "maleta", titulo: "A janela do meio do ano abriu", texto: "Dá para comprar e vender até a rodada 21." });
  if (save.rodada < save.calendario.length) for (const e of Eventos.gerarEventos(save, ajudas)) { save.caixaEntrada.unshift(e); }
  save.caixaEntrada.length = Math.min(save.caixaEntrada.length, 40);
  for (const [pid, ind] of Object.entries(save.indicacoes)) if (ind.ate < save.rodada) delete save.indicacoes[pid];
}
// antes de jogar: o que ficou sem resposta vale a opção padrão
function resolverPendentes(save) {
  for (const e of save.caixaEntrada) if (!e.resolvido) Eventos.responder(save, e, e.padrao, ajudas);
}

function estado(save) {
  completar(save);
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
  const elenco = elencoDe(save, save.clube);
  return {
    base: save.base, ano: save.ano, temporada: save.temporada, clube: save.clube, tecnico: save.tecnico, modo: save.modo,
    rodada: save.rodada, total: save.calendario.length, fim: save.rodada >= save.calendario.length,
    escalacao: save.escalacao, tabela, meus, artilharia, partida, ultimo: save.ultimo, historico: save.historico,
    rodadaAnterior: save.rodada > 0 ? save.resultados[save.rodada - 1] : null,
    proximo: save.rodada < save.calendario.length ? Temporada.jogoDoClube(save.calendario, save.rodada, save.clube) : null,
    // o clube: dinheiro, moral, elenco e mercado
    caixa: save.caixa, moral: save.moral, folha: folhaDe(save), financas: save.financas.slice(0, 4),
    elenco: elenco.map((j) => j.id), donos: save.donos, aVenda: save.aVenda, lesoes: save.lesoes, suspensos: save.suspensos, amarelos: save.amarelos,
    bonusNota: save.bonusNota, salarios: Object.fromEntries(elenco.map((j) => [j.id, salarioDe(save, j)])),
    indicacoes: save.indicacoes, transferencias: save.transferencias.slice(0, 20), caixaEntrada: save.caixaEntrada.slice(0, 25),
    janela: { aberta: Mercado.janelaAberta(save.rodada), proxima: Mercado.proximaJanela(save.rodada) },
    tentativas: save.tentativas.rodada === save.rodada ? save.tentativas.por : {},
    efeitos: (save.efeitos || []).filter((e) => e.ate >= save.rodada),
  };
}

function limparEscalacao(save, d) {
  const e = save.escalacao, elenco = elencoDe(save, save.clube);
  if (d.formacao && FORMATIONS.futebol[d.formacao]) e.formacao = d.formacao;
  if (d.tatica && typeof d.tatica === "object") e.tatica = { mentalidade: inteiro(d.tatica.mentalidade, -2, 2, 0), pressao: inteiro(d.tatica.pressao, 0, 2, 1), linha: inteiro(d.tatica.linha, 0, 2, 1) };
  if (d.titulares === null) { e.titulares = null; e.fixo = false; }
  else if (Array.isArray(d.titulares)) {
    const ids = d.titulares.map(String);
    if (ids.length !== 11 || new Set(ids).size !== 11) return "Escolha 11 titulares.";
    if (!ids.every((id) => elenco.some((j) => j.id === id))) return "Algum titular não é mais do seu elenco.";
    const vagas = Motor.vagasDe(e.formacao);
    if (d.fixo && jogadorDe(save, ids[0]).pos !== "GOL") return "O primeiro da escalação (a vaga do gol) precisa ser goleiro.";
    if (!ids.some((id) => jogadorDe(save, id).pos === "GOL")) return "Falta um goleiro entre os titulares.";
    e.titulares = ids; e.fixo = !!d.fixo && vagas.length === 11;
  }
  return null;
}
// a resposta para o que a partida parada pediu: a opção do lance, ou as mudanças táticas
function limparDecisao(parado, d) {
  if (parado.tipo === "lance") {
    const id = typeof d === "string" ? d : d && d.opcao;
    return parado.opcoes.some((o) => o.id === id) ? id : null;
  }
  const out = {}, par = (l, max) => (Array.isArray(l) ? l.slice(0, max).filter((s) => Array.isArray(s) && s.length === 2).map(([a, b]) => [String(a), String(b)]) : undefined);
  if (d && typeof d === "object") {
    if (d.tatica && typeof d.tatica === "object") out.tatica = { mentalidade: inteiro(d.tatica.mentalidade, -2, 2, 0), pressao: inteiro(d.tatica.pressao, 0, 2, 1), linha: inteiro(d.tatica.linha, 0, 2, 1) };
    if (d.formacao && FORMATIONS.futebol[d.formacao]) out.formacao = d.formacao;
    if (d.subs) out.subs = par(d.subs, 5);
    if (d.trocas) out.trocas = par(d.trocas, 10);
  }
  return out;
}

// uma proposta sua por um jogador de outro clube
function propor(save, d) {
  if (save.partida) return "Termine a partida primeiro.";
  if (!Mercado.janelaAberta(save.rodada)) return "A janela de transferências está fechada.";
  const pid = String(d.jogador || ""), j = jogadorDe(save, pid), dono = j && donoDe(save, pid);
  if (!j || dono === save.clube) return "Esse jogador não está disponível.";
  if (elencoDe(save, save.clube).length >= Mercado.ELENCO_MAX) return `O elenco já tem ${Mercado.ELENCO_MAX} jogadores. Venda alguém antes.`;
  const valor = inteiro(d.valor, 0, 5e9, 0), salario = inteiro(d.salario, 0, 1e8, 0);
  if (valor > save.caixa) return `O caixa não tem ${dinheiro(valor)}.`;
  if (save.tentativas.rodada !== save.rodada) save.tentativas = { rodada: save.rodada, por: {} };
  const tentativa = save.tentativas.por[pid] || 0;
  if (tentativa >= 3) return "Esse clube não quer mais conversa nesta rodada.";
  save.tentativas.por[pid] = tentativa + 1;
  const ind = save.indicacoes[pid], vendedor = clubeDe(save, dono), comprador = clubeDe(save, save.clube);
  const resposta = Mercado.avaliarProposta({ jogador: comNota(save, j), vendedor, comprador, titular: titularesDe(save, dono).includes(pid),
    valor: ind ? valor / ind.desconto : valor, salario, semente: `${save.semente}:${save.temporada}:${save.rodada}:${pid}`, tentativa });
  if (ind && resposta.pedido) resposta.pedido = Math.ceil(resposta.pedido * ind.desconto / 1e5) * 1e5;
  if (ind && resposta.resultado === "contra") resposta.motivo = `O ${vendedor.nome} só libera por ${dinheiro(resposta.pedido)}.`;
  if (resposta.resultado === "aceita") {
    save.donos[pid] = save.clube; save.salarios[pid] = salario; delete save.indicacoes[pid];
    movimentar(save, `Compra de ${j.nome}`, -valor);
    save.transferencias.unshift({ rodada: save.rodada, jogador: pid, de: dono, para: save.clube, valor });
    avisar(save, { tipo: "contratacao", icone: "aperto", titulo: `${j.nome} chegou!`, texto: `Contratado do ${vendedor.nome} por ${dinheiro(valor)}, com salário de ${dinheiro(salario)} por mês.` });
  }
  return { resposta };
}

module.exports = function ligarCarreira(io) {
  const nsp = io.of("/carreira");
  nsp.on("connection", (socket) => {
    let token = null, criadas = 0;
    // abre a carreira desta conexão, faz a ação e salva. A ação devolve um texto (erro) ou um objeto (o que mandar junto)
    function comCarreira(cb, acao) {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      const save = c.dados;
      if (!save || save.v !== VERSAO) return falha(cb, "Essa carreira é de uma versão antiga.");
      completar(save);
      const r = acao(save);
      if (typeof r === "string") return falha(cb, r);
      bd.salvarCarreira(c.id, save);
      ok(cb, { ...(r || {}), estado: estado(save) });
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
      resolverPendentes(save);
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
    // o mercado: fazer proposta, pôr ou tirar da lista de venda, vender na hora
    socket.on("proposta", (d = {}, cb) => comCarreira(cb, (save) => propor(save, d)));
    socket.on("vender", (d = {}, cb) => comCarreira(cb, (save) => {
      if (save.partida) return "Termine a partida primeiro.";
      const pid = String(d.jogador || ""), j = jogadorDe(save, pid);
      if (!j || donoDe(save, pid) !== save.clube) return "Esse jogador não é do seu elenco.";
      if (d.modo === "lista") { save.aVenda = save.aVenda.includes(pid) ? save.aVenda.filter((x) => x !== pid) : [...save.aVenda, pid]; return null; }
      if (!Mercado.janelaAberta(save.rodada)) return "A janela de transferências está fechada.";
      if (elencoDe(save, save.clube).length <= Mercado.ELENCO_MIN) return `O elenco não pode ficar com menos de ${Mercado.ELENCO_MIN}.`;
      const r = Motor.sorteDe(`venda:${save.semente}:${save.rodada}:${pid}`), outros = idsDosClubes(save).filter((x) => x !== save.clube);
      return { mensagem: vender(save, pid, outros[Math.floor(r() * outros.length)], Mercado.vendaRapida(comNota(save, j))) };
    }));
    socket.on("evento", (d = {}, cb) => comCarreira(cb, (save) => {
      if (save.partida) return "Termine a partida primeiro.";
      const e = save.caixaEntrada.find((x) => x.id === d.id);
      if (!e || e.resolvido) return "Esse aviso já foi resolvido.";
      if (!e.opcoes.some((o) => o.id === d.opcao)) return "Escolha uma das opções.";
      return { mensagem: Eventos.responder(save, e, d.opcao, ajudas) };
    }));
    socket.on("novaTemporada", (d, cb) => comCarreira(cb, (save) => {
      if (save.rodada < save.calendario.length) return "A temporada ainda não acabou.";
      const tabela = Temporada.tabela(idsDosClubes(save), save.resultados), pos = tabela.findIndex((l) => l.id === save.clube) + 1;
      const [artilheiro] = Object.entries(save.gols).sort((a, b) => b[1] - a[1]);
      save.historico.push({ ano: save.ano, temporada: save.temporada, posicao: pos, pontos: tabela[pos - 1].p, campeao: tabela[0].id, artilheiro: artilheiro ? { id: artilheiro[0], gols: artilheiro[1] } : null });
      movimentar(save, `Premiação: ${pos}º lugar`, (21 - pos) * 1e6);
      save.temporada++; save.ano++;
      save.calendario = Temporada.gerarCalendario(idsDosClubes(save), `${save.semente}:${save.temporada}`);
      Object.assign(save, { rodada: 0, resultados: [], gols: {}, partida: null, ultimo: null, amarelos: {}, bonusVitoria: 0, provocado: null, efeitos: [] });
      avisar(save, { tipo: "temporada", icone: "taca", titulo: `Começa a temporada ${save.ano}`, texto: `A janela está aberta até a rodada 4. Caixa: ${dinheiro(save.caixa)}.` });
      return null;
    }));
    socket.on("sair", (d, cb) => { token = null; ok(cb); });
  });
};
// para os testes: montar uma carreira e mexer nela sem o socket
module.exports.paraTestes = { novaCarreira, ajudas, timeDe, fecharRodada };
