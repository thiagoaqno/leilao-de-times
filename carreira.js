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
const Feed = require("./carreira-feed.js");
const Orcamentos = require("./public/carreira/orcamentos.js");
const Evolucao = require("./public/carreira/evolucao.js");
const { FORMATIONS } = require("./public/escalacao.js");
const crypto = require("crypto");

// As carreiras antigas continuam na base em que nasceram; as novas enxergam o mundo inteiro.
const BASES = { teste: require("./public/carreira/base/teste.js") };
for (const id of ["brasileirao", "inglaterra", "espanha", "italia", "alemanha", "franca", "argentina", "sulamericanos"]) {
  const b = require(`./public/carreira/base/${id}-2026.js`); BASES[b.id] = b;
}
const INDICE_MUNDO = require("./public/carreira/base/mundo-2026.js");
BASES[INDICE_MUNDO.id] = { id: INDICE_MUNDO.id, ano: INDICE_MUNDO.ano, clubes: INDICE_MUNDO.ligas.flatMap((l) => BASES[l.id].clubes) };
const BASE_PADRAO = "mundo-2026";
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
// os jovens que subiram da base nas viradas de temporada ficam no save (save.jovens), e quem se aposentou tem o dono
// APOSENTADO (sai de todos os elencos)
const APOSENTADO = "aposentado";
const jogadorDe = (save, pid) => indice(save).get(pid)?.j || (save.jovens && save.jovens[pid]) || null;
const donoDe = (save, pid) => save.donos[pid] || indice(save).get(pid)?.clube || null;
function todosJogadores(save) {
  const base = [...indice(save).values()].map(({ j }) => j);
  return save.jovens && Object.keys(save.jovens).length ? base.concat(Object.values(save.jovens)) : base;
}
const elencoDe = (save, clube) => todosJogadores(save).filter((j) => donoDe(save, j.id) === clube);
const notaDe = (save, j) => clamp(j.nota + (save.bonusNota[j.id] || 0), 40, 95);
const comNota = (save, j) => ({ ...j, nota: notaDe(save, j), idade: Evolucao.idadeNa(j, save.temporada) });
const FATOR_LIGA = { "inglaterra-2026": 1.35, "espanha-2026": 1.18, "italia-2026": 1.12, "alemanha-2026": 1.1, "franca-2026": 1.05, "brasileirao-2026": 1, "argentina-2026": 0.82, "sulamericanos-2026": 0.75 };
const ligaDoClube = (id) => INDICE_MUNDO.ligas.find((l) => l.clubes.includes(id))?.id || "brasileirao-2026";
const salarioDe = (save, j) => save.salarios[j.id] || Math.round(Mercado.salarioDe(comNota(save, j)) * (FATOR_LIGA[ligaDoClube(donoDe(save, j.id))] || 1) / 1e3) * 1e3;
const disponivel = (save, pid) => !save.lesoes[pid] && !save.suspensos[pid];
const folhaDe = (save) => elencoDe(save, save.clube).reduce((s, j) => s + salarioDe(save, j), 0);
// o momento de um jogador (Mercado.fatorForma): gols na temporada, efeitos dos eventos valendo agora e estar à venda
function fatorDe(save, pid) {
  const j = jogadorDe(save, pid); if (!j) return 1;
  const efeito = (save.efeitos || []).filter((e) => e.alvo === pid && e.de <= save.rodada && e.ate >= save.rodada).reduce((s, e) => s + e.nota, 0);
  return Mercado.fatorForma({ gols: save.gols[pid] || 0, pos: j.pos, efeito, aVenda: save.aVenda.includes(pid) });
}
const valorAtual = (save, j) => Mercado.valorDe(comNota(save, j), fatorDe(save, j.id));
// sem lucro em revenda na hora: nas primeiras rodadas depois da compra, ninguém paga mais do que você pagou
function tetoVenda(save, pid, valor) {
  const c = save.compras && save.compras[pid];
  return c && c.temporada === save.temporada && save.rodada - c.rodada < Mercado.CARENCIA ? Math.min(valor, c.valor) : valor;
}

// as carreiras criadas antes destas partes ganham os campos novos na primeira vez que abrem
function completar(save) {
  const c = clubeDe(save, save.clube);
  const padrao = { caixa: Orcamentos.de(c).caixa, moral: 60, compras: {}, valores: {}, pedidos: {}, parcelas: [], caixaIA: null, situacao: null, feed: [], posJogo: null, segredos: {}, donos: {}, aVenda: [], lesoes: {}, suspensos: {}, amarelos: {}, bonusNota: {},
    salarios: {}, caixaEntrada: [], transferencias: [], indicacoes: {}, financas: [], tentativas: { rodada: -1, por: {} }, bonusVitoria: 0, provocado: null, efeitos: [], eventosVistos: {} };
  for (const [k, v] of Object.entries(padrao)) if (save[k] === undefined) save[k] = v;
  // o caixa dos outros clubes (as compras da IA dependem dele)
  if (!save.caixaIA) save.caixaIA = Object.fromEntries(idsDosClubes(save).filter((id) => id !== save.clube).map((id) => { const c2 = clubeDe(save, id); return [id, c2.orcamento || Orcamentos.de(c2).caixa]; }));
  // Saves anteriores ao mundo mantêm somente o Brasileirão, sem serem promovidos silenciosamente.
  if (!save.competicoes && save.base !== BASE_PADRAO) save.competicoes = { [save.base]: { tipo: "liga", fase: "liga", grupos: [], jogos: save.calendario, resultados: save.resultados } };
  // as várias temporadas: o desempenho de cada um (para a evolução), o que já mudou nas viradas e o limite de temporadas
  // (as carreiras de antes do limite ficam com o máximo, para ninguém ser cortado no meio)
  const temporadas = { desempenho: {}, jogosTemporada: 0, evolucao: {}, jovens: {}, aposentados: {}, donosInicio: null, classificados: null,
    temporadasMax: Math.max(Evolucao.TEMPORADAS.max, save.temporada || 1) };
  for (const [k, v] of Object.entries(temporadas)) if (save[k] === undefined) save[k] = v;
  registrarTemporada(save);
  return save;
}
// os clubes como estavam no começo da temporada (a evolução, os jovens, os aposentados e as transferências até a
// virada), para os jogos sem você. Só muda na virada de temporada: os resultados já jogados nunca mudam.
const basesCache = new Map();
function basesDaTemporada(save) {
  if (!save.donosInicio) return BASES;
  const chave = `${save.semente}:${save.temporada}`;
  if (basesCache.has(chave)) return basesCache.get(chave);
  const clubes = {}, bases = {};
  for (const l of INDICE_MUNDO.ligas) bases[l.id] = { ...BASES[l.id], clubes: BASES[l.id].clubes.map((c) => (clubes[c.id] = { ...c, jogadores: [] })) };
  for (const j of todosJogadores(save)) {
    const dono = save.donosInicio[j.id] || indice(save).get(j.id)?.clube;
    if (clubes[dono]) clubes[dono].jogadores.push({ ...j, nota: clamp(j.nota + (save.evolucao[j.id] || 0), 40, 95) });
  }
  if (basesCache.size > 20) basesCache.delete(basesCache.keys().next().value);
  basesCache.set(chave, bases);
  return bases;
}
function recalcularMundo(save) {
  const mundo = Temporada.simularMundo({ bases: basesDaTemporada(save), indice: INDICE_MUNDO, semente: `${save.semente}:${save.temporada}`, resultadosFixos: save.resultadosFixos || {}, classificados: save.classificados });
  save.competicoes = mundo.competicoes; save.calendarioMundo = mundo.jogos;
  return mundo;
}
const proximoJogoMundo = (save) => (save.calendarioMundo || []).find((j) => (j.casa === save.clube || j.fora === save.clube) && !(save.jogosJogados || []).includes(j.id)) || null;
// o mundo de uma carreira nova, ainda sem técnico: a carreira solo assume um clube, e a carreira em grupo, um por pessoa
function mundoNovo(temporadas = Evolucao.TEMPORADAS.padrao) {
  const base = BASES[BASE_PADRAO];
  const save = { v: VERSAO, base: base.id, ano: base.ano, temporada: 1, semente: crypto.randomBytes(6).toString("hex"),
    temporadasMax: inteiro(temporadas, Evolucao.TEMPORADAS.min, Evolucao.TEMPORADAS.max, Evolucao.TEMPORADAS.padrao), resultadosFixos: {}, resultados: [], gols: {} };
  recalcularMundo(save);
  return save;
}
function novaCarreira(nome, clube, skin, temporadas = Evolucao.TEMPORADAS.padrao) { return assumirClube(mundoNovo(temporadas), clube, nome, skin); }
// o técnico assume o clube: o calendário dele, o caixa, a situação, a escalação, o aviso de boas-vindas e o post no feed
function assumirClube(save, clube, nome, skin) {
  Object.assign(save, { clube, tecnico: { nome, skin: String(skin || "").slice(0, 20) }, calendario: [], jogosJogados: [], rodada: 0, modo: 1,
    escalacao: { formacao: clubeDe(save, clube).formacao, tatica: { mentalidade: 0, pressao: 1, linha: 1 }, titulares: null, fixo: false },
    partida: null, ultimo: null, historico: [] });
  save.calendario = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, clube).map((j) => [[j.casa, j.fora]]);
  completar(save);
  save.caixa = clubeDe(save, clube).orcamento || save.caixa;
  save.situacao = Orcamentos.de(clubeDe(save, clube)).situacao; // só as carreiras novas: as antigas seguem sem os efeitos da situação
  const sit = Orcamentos.SITUACOES[save.situacao];
  save.caixaEntrada.unshift({ id: "boas-vindas", rodada: 0, tipo: "boas-vindas", icone: "aperto", resolvido: true, titulo: "Bem-vindo ao clube",
    texto: `A diretoria apresentou ${nome} como novo técnico, com contrato de ${save.temporadasMax} temporada${save.temporadasMax > 1 ? "s" : ""}. Caixa para a temporada: ${dinheiro(save.caixa)}. Situação do clube: ${sit.nome}. ${sit.texto} A janela de transferências está aberta até a rodada 4.` });
  Feed.postar(save, { tipo: "tecnico", perfil: clube, arte: { cena: "apresentacao", clube }, texto: `O ${clubeDe(save, clube).nome} apresenta ${nome} como novo técnico. "Vamos brigar por tudo", disse na chegada.` });
  return save;
}

// ---------- a carreira em grupo (carreira-online.js) ----------
// Um mundo só, com vários clubes humanos. O que é de cada clube (o caixa, a moral, a escalação, a caixa de entrada, o
// feed, o calendário dele...) fica em save.humanos[clube].estado; o resto (os donos, as notas, as competições, as
// lesões...) é de todos. Para usar as funções da carreira solo com um clube, monta-se a visão daquele clube
// (vistaDe: o save com os campos dele por cima, e save.clube = ele) e, depois, guarda-se de volta (guardarVista).
const CAMPOS_CLUBE = ["clube", "tecnico", "caixa", "moral", "situacao", "escalacao", "caixaEntrada", "financas", "feed", "posJogo", "compras", "valores", "pedidos",
  "parcelas", "aVenda", "indicacoes", "tentativas", "bonusVitoria", "provocado", "efeitos", "eventosVistos", "segredos", "jogosJogados", "calendario", "rodada",
  "partida", "ultimo", "modo", "historico", "jogosTemporada"];
function vistaDe(save, clube) {
  const v = { ...save, ...save.humanos[clube].estado };
  delete v.humanos;
  return v;
}
function guardarVista(save, v) {
  const h = save.humanos[v.clube];
  h.estado = Object.fromEntries(CAMPOS_CLUBE.map((k) => [k, v[k]]));
  for (const [k, valor] of Object.entries(v)) if (!CAMPOS_CLUBE.includes(k)) save[k] = valor;
}
// o mundo da sala: cada humano assume o seu clube; o aporte do investidor entra no caixa de cada um. Os clubes humanos
// saem da lista dos clubes do computador (caixaIA).
function novaCarreiraGrupo(humanos, { temporadas, aporte = 0 } = {}) {
  const save = mundoNovo(temporadas);
  save.humanos = {};
  for (const hm of humanos) {
    const v = { ...save };
    for (const k of CAMPOS_CLUBE) delete v[k];
    delete v.humanos;
    assumirClube(v, hm.clube, hm.nome, hm.skin);
    if (aporte > 0) {
      movimentar(v, "Aporte do investidor", aporte);
      avisar(v, { tipo: "aporte", icone: "maleta", titulo: "Aporte do investidor", texto: `O investidor da galera pôs ${dinheiro(aporte)} no caixa. Caixa agora: ${dinheiro(v.caixa)}.` });
    }
    save.humanos[hm.clube] = { nome: hm.nome, skin: String(hm.skin || "").slice(0, 20) };
    guardarVista(save, v);
  }
  for (const id of Object.keys(save.humanos)) delete save.caixaIA[id];
  return save;
}
// os clubes que dá para escolher: só o Brasileirão, ou o Brasileirão e as cinco grandes ligas
const LIGAS_GRUPO = { brasil: ["brasileirao-2026"], mundo: ["brasileirao-2026", ...Temporada.EUROPA] };
const clubesEscolhiveis = (ligas) => BASES[BASE_PADRAO].clubes.filter((c) => (LIGAS_GRUPO[ligas] || LIGAS_GRUPO.mundo).includes(c.liga));

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
// a nota de cada um no seu jogo (dos dois times): save.desempenho[pid] = [jogos, soma das notas], para a evolução
function anotarDesempenho(save, r) {
  for (const [pid, nota] of Object.entries(Evolucao.notasDaPartida(r))) {
    const d = save.desempenho[pid] || (save.desempenho[pid] = [0, 0]);
    d[0]++; d[1] = Math.round((d[1] + nota) * 10) / 10;
  }
  save.jogosTemporada++;
}
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
  const j = jogadorDe(save, pid), compra = save.compras[pid];
  save.donos[pid] = comprador; delete save.salarios[pid]; delete save.pedidos[pid]; delete save.compras[pid]; delete save.valores[pid];
  save.aVenda = save.aVenda.filter((x) => x !== pid);
  movimentar(save, `Venda de ${j.nome}`, valor);
  if (save.caixaIA && comprador in save.caixaIA) save.caixaIA[comprador] -= valor;
  const lucro = compra ? valor - compra.valor : null;
  save.transferencias.unshift({ rodada: save.rodada, temporada: save.temporada, jogador: pid, de: save.clube, para: comprador, valor, ...(lucro != null && { lucro }) });
  Feed.transferencia(save, save.transferencias[0], ajudas);
  return `${j.nome} foi vendido ao ${clubeDe(save, comprador).nome} por ${dinheiro(valor)}${lucro != null ? ` (${lucro >= 0 ? "lucro" : "prejuízo"} de ${dinheiro(Math.abs(lucro))})` : ""}.`;
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
const ajudas = { elencoDe, clubeDe, idsDosClubes, jogadorDe, donoDe, notaDe, comNota, salarioDe, titularesDe, mudarMoral, movimentar, vender, ultimosResultados, fatorDe, valorAtual, tetoVenda };

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
  if (save.base === BASE_PADRAO && save.partida.jogoId) return fecharJogoMundo(save, r);
  const rodada = save.partida.rodada, resultados = [], meu = save.clube, clube = clubeDe(save, meu);
  const moralAntes = save.moral, caixaAntes = save.caixa, entradaAntes = new Set(save.caixaEntrada.map((e) => e.id)), transfAntes = save.transferencias.length;
  const amarelosAntes = { ...save.amarelos }, efeitosAntes = new Set((save.efeitos || []).map((e) => JSON.stringify(e)));
  // quem cumpriu suspensão ou estava machucado nesta rodada tem uma rodada a menos para voltar
  for (const lista of [save.lesoes, save.suspensos]) for (const pid of Object.keys(lista)) if (--lista[pid] <= 0) delete lista[pid];
  for (const [c, f] of save.calendario[rodada]) {
    const semente = sementeDoJogo(save, rodada, c, f);
    if (c === save.partida.casa && f === save.partida.fora) { resultados.push([c, f, r.placar[0], r.placar[1]]); cartoesELesoes(save, r, semente); continue; }
    const outro = Motor.simularPartida({ casa: timeDe(save, c), fora: timeDe(save, f), semente });
    contarGols(save, outro); cartoesELesoes(save, outro, semente);
    resultados.push([c, f, outro.placar[0], outro.placar[1]]);
  }
  contarGols(save, r); anotarDesempenho(save, r);
  save.resultados[rodada] = resultados;
  // o dinheiro e a moral do jogo
  const emCasa = save.partida.casa === meu, [nos, eles] = emCasa ? r.placar : [r.placar[1], r.placar[0]];
  if (emCasa) movimentar(save, "Bilheteria", Math.round(clube.tamanho * 6e5 * (0.7 + save.moral / 200) / 1e4) * 1e4);
  const rico = save.situacao === "rico";
  movimentar(save, rico ? "Cota de TV (contrato de clube rico)" : "Cota de TV", Math.round(clube.tamanho * 4e5 * (rico ? 1.3 : 1)));
  if (save.situacao === "endividado") movimentar(save, "Parcela da dívida", -Orcamentos.parcelaDivida(clube));
  // as parcelas das compras parceladas
  for (const p of save.parcelas) { movimentar(save, `Parcela de ${p.nome} (${Mercado.PARCELAS - p.restantes + 1}/${Mercado.PARCELAS})`, -p.valor); p.restantes--; }
  save.parcelas = save.parcelas.filter((p) => p.restantes > 0);
  if (nos > eles) { movimentar(save, "Prêmio por vitória", clube.tamanho * 2e5 + (save.bonusVitoria || 0)); mudarMoral(save, 6); }
  else if (nos === eles) mudarMoral(save, 1); else mudarMoral(save, -6);
  movimentar(save, "Salários (1 semana)", -Math.round(folhaDe(save) / 4));
  save.ultimo = { rodada, casa: save.partida.casa, fora: save.partida.fora, placar: r.placar, eventos: r.eventos, modo: save.partida.modo };
  save.partida = null;
  save.provocado = null;
  save.rodada = rodada + 1;
  save.efeitos = (save.efeitos || []).filter((e) => e.ate >= save.rodada);
  // os outros clubes também recebem (TV e bilheteria, de um jeito simples)
  for (const id of Object.keys(save.caixaIA)) save.caixaIA[id] += clubeDe(save, id).tamanho * 5e5;
  // o dono da SAF põe dinheiro na janela do meio do ano se o time está no G6
  if (save.situacao === "saf" && save.rodada === 16) {
    const pos = Temporada.tabela(idsDosClubes(save), save.resultados.filter(Boolean)).findIndex((l) => l.id === meu) + 1;
    if (pos <= 6) { movimentar(save, "Aporte do dono da SAF", Orcamentos.aporteDono(clube)); avisar(save, { tipo: "aporte", icone: "maleta", titulo: "O dono abriu o cofre", texto: `Com o time em ${pos}º, o dono da SAF pôs ${dinheiro(Orcamentos.aporteDono(clube))} para a janela.` }); }
  }
  // o histórico curto do valor de cada um do seu elenco (o gráfico da ficha)
  for (const j of elencoDe(save, meu)) { const h = save.valores[j.id] || (save.valores[j.id] = []); h.push(valorAtual(save, j)); if (h.length > 10) h.shift(); }
  // quem se machucou ou foi suspenso no seu time vira aviso
  const fora = elencoDe(save, meu).filter((j) => save.lesoes[j.id] || save.suspensos[j.id]).filter((j) => r.eventos.some((e) => e.jogador === j.id && ["lesao", "vermelho", "amarelo"].includes(e.tipo)));
  for (const j of fora) avisar(save, { tipo: "desfalque", icone: save.lesoes[j.id] ? "alerta" : "cartas", titulo: `${j.nome} desfalca o time`, texto: save.lesoes[j.id] ? `Lesão: fica fora por ${save.lesoes[j.id]} rodada${save.lesoes[j.id] > 1 ? "s" : ""}.` : "Suspenso para o próximo jogo." });
  if (save.rodada === 4) avisar(save, { tipo: "janela", icone: "cadeado", titulo: "A janela fechou", texto: "As transferências voltam na rodada 17." });
  if (save.rodada === 16) avisar(save, { tipo: "janela", icone: "maleta", titulo: "A janela do meio do ano abriu", texto: "Dá para comprar e vender até a rodada 21." });
  if (save.rodada < save.calendario.length) for (const e of Eventos.gerarEventos(save, ajudas)) { save.caixaEntrada.unshift(e); }
  save.caixaEntrada.length = Math.min(save.caixaEntrada.length, 40);
  for (const [pid, ind] of Object.entries(save.indicacoes)) if (ind.ate < save.rodada) delete save.indicacoes[pid];
  // o pós-jogo: tudo o que mexeu no seu time nesta rodada, para o pop-up
  const novos = save.caixaEntrada.filter((e) => !entradaAntes.has(e.id));
  const f = save.financas[0] && save.financas[0].rodada === rodada ? save.financas[0].itens : [];
  save.posJogo = {
    rodada, casa: save.ultimo.casa, fora: save.ultimo.fora, placar: r.placar, resultado: nos > eles ? "V" : nos === eles ? "E" : "D",
    moral: [moralAntes, save.moral], caixa: [caixaAntes, save.caixa], financas: f,
    lesoes: elencoDe(save, meu).filter((j) => save.lesoes[j.id] && r.eventos.some((e) => e.tipo === "lesao" && e.jogador === j.id)).map((j) => [j.id, save.lesoes[j.id]]),
    suspensos: elencoDe(save, meu).filter((j) => save.suspensos[j.id] && r.eventos.some((e) => ["vermelho", "amarelo"].includes(e.tipo) && e.jogador === j.id)).map((j) => j.id),
    pendurados: elencoDe(save, meu).filter((j) => save.amarelos[j.id] === 2 && amarelosAntes[j.id] !== 2).map((j) => j.id),
    efeitos: save.efeitos.filter((e) => !efeitosAntes.has(JSON.stringify(e))),
    eventos: novos.filter((e) => !e.resolvido).map((e) => e.id),
    avisos: novos.filter((e) => e.resolvido && e.tipo !== "ia").map((e) => e.id),
  };
  // o feed: os posts da rodada (o seu jogo, a artilharia, a tabela, os eventos e o mercado)
  Feed.daRodada(save, { rodada, r, novos, transferencias: save.transferencias.slice(0, save.transferencias.length - transfAntes), ajudas });
  registrarTemporada(save);
}
function fecharJogoMundo(save, r) {
  const p = save.partida, clube = clubeDe(save, save.clube), emCasa = p.casa === save.clube;
  const moralAntes = save.moral, caixaAntes = save.caixa;
  const [nos, eles] = emCasa ? r.placar : [r.placar[1], r.placar[0]];
  // quem cumpriu suspensão ou estava machucado neste jogo tem um jogo a menos para voltar (antes dos cartões novos)
  for (const lista of [save.lesoes, save.suspensos]) for (const pid of Object.keys(lista)) if (--lista[pid] <= 0) delete lista[pid];
  contarGols(save, r); cartoesELesoes(save, r, p.semente); anotarDesempenho(save, r);
  save.resultadosFixos[p.jogoId] = { placar: [...r.placar] };
  save.jogosJogados.push(p.jogoId);
  if (emCasa) movimentar(save, "Bilheteria", Math.round(clube.tamanho * 6e5 * (0.7 + save.moral / 200) / 1e4) * 1e4);
  movimentar(save, "Cota de TV", Math.round(clube.tamanho * 4e5 * (FATOR_LIGA[ligaDoClube(clube.id)] || 1)));
  if (nos > eles) { movimentar(save, "Prêmio por vitória", clube.tamanho * 2e5); mudarMoral(save, 6); }
  else if (nos === eles) mudarMoral(save, 1); else mudarMoral(save, -6);
  movimentar(save, "Salários (1 semana)", -Math.round(folhaDe(save) / 4));
  save.ultimo = { rodada: save.rodada, jogoId: p.jogoId, competicao: p.competicao, fase: p.fase, casa: p.casa, fora: p.fora, placar: r.placar, eventos: r.eventos, modo: p.modo };
  save.partida = null; save.rodada++; recalcularMundo(save);
  save.efeitos = (save.efeitos || []).filter((e) => e.ate >= save.rodada);
  for (const [pid, ind] of Object.entries(save.indicacoes)) if (ind.ate < save.rodada) delete save.indicacoes[pid];
  const comp = save.competicoes[p.competicao], da = comp.id === "mundial" ? "do" : "da";
  Feed.postar(save, { tipo: nos > eles ? "vitoria" : nos === eles ? "empate" : "derrota", perfil: save.clube, humor: nos > eles ? "bom" : nos < eles ? "ruim" : "neutro", arte: { cena: nos > eles ? "vitoria" : nos === eles ? "empate" : "derrota", casa: p.casa, fora: p.fora, placar: r.placar }, texto: `${comp.nome} · ${clubeDe(save, p.casa).nome} ${r.placar[0]} × ${r.placar[1]} ${clubeDe(save, p.fora).nome}.` });
  if (p.fase === "final") Feed.postar(save, { tipo: comp.campeao === save.clube ? "campeao" : "eliminado", perfil: "galeranews", galeranews: true, humor: comp.campeao === save.clube ? "bom" : "ruim", arte: { cena: "trofeu", clube: comp.campeao }, texto: comp.campeao === save.clube ? `CAMPEÃO! O ${clube.nome} conquista ${comp.id === "mundial" ? "o" : "a"} ${comp.nome}.` : `O ${clube.nome} fica com o vice ${da} ${comp.nome}.` });
  else if (p.mataMata) {
    const ainda = comp.jogos.some((j) => !save.jogosJogados.includes(j.id) && (j.casa === save.clube || j.fora === save.clube));
    if (!ainda) Feed.postar(save, { tipo: "eliminado", perfil: "galeranews", galeranews: true, humor: "ruim", arte: { cena: "derrota", clube: save.clube }, texto: `O ${clube.nome} foi eliminado ${da} ${comp.nome}.` });
  }
  else if (p.fase.startsWith("grupo-") && p.rodada === 5) {
    const passou = comp.jogos.some((j) => j.mataMata && (j.casa === save.clube || j.fora === save.clube));
    Feed.postar(save, { tipo: passou ? "classificado" : "eliminado", perfil: "galeranews", galeranews: true, humor: passou ? "bom" : "ruim", arte: { cena: passou ? "festa" : "derrota", clube: save.clube }, texto: passou ? `O ${clube.nome} está classificado no mata-mata ${da} ${comp.nome}!` : `O ${clube.nome} foi eliminado na fase de grupos ${da} ${comp.nome}.` });
  }
  if (proximoJogoMundo(save)) for (const e of Eventos.gerarEventos(save, ajudas)) save.caixaEntrada.unshift(e);
  save.caixaEntrada.length = Math.min(save.caixaEntrada.length, 40);
  const f = save.financas[0] && save.financas[0].rodada === save.rodada - 1 ? save.financas[0].itens : [];
  save.posJogo = { rodada: save.rodada - 1, casa: p.casa, fora: p.fora, placar: r.placar, resultado: nos > eles ? "V" : nos === eles ? "E" : "D", moral: [moralAntes, save.moral], caixa: [caixaAntes, save.caixa], financas: f, lesoes: [], suspensos: [], pendurados: [], efeitos: [], eventos: [], avisos: [] };
  registrarTemporada(save);
}

// ---------- o fim da temporada e a virada para a próxima ----------
const temporadaAcabou = (save) => !save.partida && (save.base === BASE_PADRAO ? !!save.calendarioMundo && !proximoJogoMundo(save) : save.rodada >= save.calendario.length);
const forcaDoElenco = (save) => { const n = elencoDe(save, save.clube).map((j) => notaDe(save, j)).sort((a, b) => b - a).slice(0, 11); return Math.round(n.reduce((s, x) => s + x, 0) / Math.max(1, n.length) * 10) / 10; };
// a temporada acabou: guarda o resumo no histórico (posição, títulos, artilheiro do time, melhor negócio, força do
// elenco) e paga a premiação. Uma vez só por temporada.
function registrarTemporada(save) {
  if (!save.historico || save.historico.some((x) => x.temporada === save.temporada) || !temporadaAcabou(save)) return;
  let tabela, nomeLiga, titulos = [], vices = [];
  if (save.base === BASE_PADRAO) {
    const liga = save.competicoes[ligaDoClube(save.clube)];
    tabela = liga.tabela; nomeLiga = liga.nome;
    for (const c of Object.values(save.competicoes)) { if (c.campeao === save.clube) titulos.push(c.nome); else if (c.vice === save.clube) vices.push(c.nome); }
  } else {
    tabela = Temporada.tabela(idsDosClubes(save), save.resultados); nomeLiga = "Brasileirão";
    if (tabela[0].id === save.clube) titulos.push(nomeLiga); else if (tabela[1].id === save.clube) vices.push(nomeLiga);
  }
  const pos = tabela.findIndex((l) => l.id === save.clube) + 1;
  const [artilheiro] = Object.entries(save.gols).filter(([pid]) => donoDe(save, pid) === save.clube).sort((a, b) => b[1] - a[1]);
  const negocios = save.transferencias.filter((t) => t.de === save.clube && t.lucro != null && (t.temporada || save.temporada) === save.temporada).sort((a, b) => b.lucro - a.lucro);
  save.historico.push({ ano: save.ano, temporada: save.temporada, posicao: pos, pontos: tabela[pos - 1].p, liga: nomeLiga, campeao: tabela[0].id, titulos, vices,
    artilheiro: artilheiro ? { id: artilheiro[0], gols: artilheiro[1] } : null, negocio: negocios[0] ? { jogador: negocios[0].jogador, lucro: negocios[0].lucro, para: negocios[0].para } : null,
    forca: forcaDoElenco(save) });
  movimentar(save, `Premiação: ${pos}º lugar`, (tabela.length + 1 - pos) * 1e6);
  for (const t of titulos) movimentar(save, `Premiação: campeão da ${t}`, 15e6);
}
// a virada: cada jogador evolui (de -2 a +3), os veteranos podem se aposentar e cada clube ganha 1 ou 2 jovens da base.
// Devolve o que mudou no seu time, para o aviso da pré-temporada.
function virarTemporada(save) {
  const T = save.temporada, meu = save.clube, semente = `${save.semente}:${T}`;
  const porClube = new Map(), meus = { subiram: [], cairam: [], aposentados: [], jovens: [] };
  for (const j of todosJogadores(save)) {
    const dono = donoDe(save, j.id); if (dono === APOSENTADO) continue;
    const idade = Evolucao.idadeNa(j, T);
    // a aposentadoria
    if (Evolucao.seAposenta(idade, `${semente}:${j.id}`)) {
      save.donos[j.id] = APOSENTADO; save.aposentados[j.id] = { temporada: T, clube: dono, idade };
      for (const lista of [save.salarios, save.pedidos, save.compras, save.valores, save.lesoes, save.suspensos, save.amarelos]) delete lista[j.id];
      save.aVenda = save.aVenda.filter((x) => x !== j.id);
      if (dono === meu) meus.aposentados.push(j.id);
      if (dono === meu || notaDe(save, j) >= 82) Feed.postar(save, { tipo: "aposentadoria", perfil: dono, humor: "neutro", arte: { cena: "trofeu", clube: dono },
        texto: `${j.nome} pendura as chuteiras aos ${idade} anos. Obrigado por tudo, ${j.nome.split(" ").pop()}!` });
      continue;
    }
    // a evolução: dentro do limite da temporada e sem passar de 40 a 95
    const d = save.desempenho[j.id], nota = notaDe(save, j);
    const delta = clamp(Evolucao.evolucaoDe({ idade, nota, jogos: d ? d[0] : 0, jogosTime: dono === meu ? save.jogosTemporada : 0, media: d ? d[1] / d[0] : null, semente: `${semente}:${j.id}` }), 40 - nota, 95 - nota);
    if (delta) { save.bonusNota[j.id] = (save.bonusNota[j.id] || 0) + delta; save.evolucao[j.id] = (save.evolucao[j.id] || 0) + delta; }
    if (dono === meu && delta) (delta > 0 ? meus.subiram : meus.cairam).push([j.id, delta]);
    if (!porClube.has(dono)) porClube.set(dono, []);
    porClube.get(dono).push(j);
  }
  // os jovens da base: 1 ou 2 por clube (o seu sempre fica com o mínimo do elenco; os outros param em 30)
  const sorte = Motor.sorteDe(`base:${semente}`);
  for (const id of idsDosClubes(save)) {
    const c = clubeDe(save, id), elenco = porClube.get(id) || [];
    let n = 1 + (sorte() < 0.5 ? 1 : 0);
    if (id === meu) n = Math.max(n, Mercado.ELENCO_MIN - elenco.length);
    n = Math.min(n, (id === meu ? Mercado.ELENCO_MAX : 30) - elenco.length);
    for (let i = 0; i < n; i++) {
      const pos = Evolucao.posicaoCarente(elenco, `${semente}:${id}:${i}`);
      const j = Evolucao.criarJovem({ clube: c, temporada: T + 1, n: i + 1, pos, semente: save.semente });
      save.jovens[j.id] = j; save.donos[j.id] = id; elenco.push(j);
      if (id === meu) meus.jovens.push(j.id);
    }
  }
  meus.subiram.sort((a, b) => b[1] - a[1]); meus.cairam.sort((a, b) => a[1] - b[1]);
  return meus;
}
// os classificados para as copas da próxima temporada: os 4 primeiros de cada liga europeia (Champions) e os 6
// primeiros do Brasileirão, mais um sorteado do 7º ao 12º (o campeão da Copa do Brasil), no lugar dos brasileiros
function classificadosDe(save) {
  const tab = (id) => save.competicoes[id].tabela.map((l) => l.id);
  const europa = Object.fromEntries(Temporada.EUROPA.map((id) => [id, tab(id).slice(0, 4)]));
  const br = tab("brasileirao-2026"), copa = br[6 + Math.floor(Motor.sorteDe(`copa-do-brasil:${save.semente}:${save.temporada}`)() * 6)];
  const brasileiros = new Set(INDICE_MUNDO.ligas.find((l) => l.id === "brasileirao-2026").clubes);
  const anterior = (save.classificados && save.classificados.libertadores) || INDICE_MUNDO.libertadores;
  return { europa, libertadores: [...br.slice(0, 6), copa, ...anterior.filter((id) => !brasileiros.has(id))] };
}
// antes de jogar: o que ficou sem resposta vale a opção padrão
function resolverPendentes(save) {
  for (const e of save.caixaEntrada) if (!e.resolvido) Eventos.responder(save, e, e.padrao, ajudas);
}

// o momento de quem não está no normal (fator diferente de 1): o navegador calcula o mesmo valor que o servidor
function formaDe(save) {
  const ids = new Set([...Object.keys(save.gols), ...save.aVenda, ...(save.efeitos || []).map((e) => e.alvo).filter((a) => a !== "time" && a !== "rival")]);
  const out = {};
  for (const pid of ids) { const f = fatorDe(save, pid); if (f !== 1) out[pid] = f; }
  return out;
}
// os jovens da base que o navegador precisa conhecer (eles não estão nos arquivos da base): os do seu time, os dos
// times do seu jogo e os que aparecem no que vai junto (artilharia, mercado, feed, histórico)
const RE_JOVEM = /"([a-z0-9-]+-t\d+b\d+)"/g;
function jovensDoEstado(save, e) {
  const todos = save.jovens || {}; if (!Object.keys(todos).length) return {};
  const clubes = new Set([save.clube, ...(e.proximo || []), ...(e.partida ? [e.partida.casa, e.partida.fora] : []), ...(e.ultimo ? [e.ultimo.casa, e.ultimo.fora] : [])]);
  const ids = new Set(Object.keys(todos).filter((id) => clubes.has(donoDe(save, id))));
  for (const m of JSON.stringify([e.artilharia, e.transferencias, e.feed, e.historico, e.caixaEntrada]).matchAll(RE_JOVEM)) if (todos[m[1]]) ids.add(m[1]);
  return Object.fromEntries([...ids].map((id) => [id, todos[id]]));
}
function estado(save) {
  completar(save);
  const e = save.base === BASE_PADRAO ? estadoMundo(save) : estadoBrasileirao(save);
  e.temporadasMax = save.temporadasMax;
  e.encerrada = e.fim && save.temporada >= save.temporadasMax;
  e.jovens = jovensDoEstado(save, e);
  return e;
}
function estadoBrasileirao(save) {
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
    // o orçamento, o mercado (momento de cada um, compras, preço pedido, parcelas), o feed e o pós-jogo
    situacao: save.situacao, forma: formaDe(save), compras: save.compras, valores: save.valores, pedidos: save.pedidos, parcelas: save.parcelas,
    feed: save.feed.slice(0, 30), posJogo: save.posJogo,
  };
}
function estadoMundo(save) {
  if (!save.calendarioMundo) recalcularMundo(save);
  const proximo = proximoJogoMundo(save), limite = proximo ? proximo.semana : Infinity;
  const competicoes = Object.fromEntries(Object.entries(save.competicoes).map(([id, c]) => {
    const jogos = c.jogos.filter((j) => j.semana < limite || save.jogosJogados.includes(j.id));
    const resultados = c.tipo === "liga" ? jogos.reduce((a, j) => { (a[j.rodada] ||= []).push([j.casa, j.fora, ...j.placar]); return a; }, []) : jogos.map((j) => [j.casa, j.fora, ...j.placar]);
    const ids = c.tipo === "liga" ? INDICE_MUNDO.ligas.find((l) => l.id === id).clubes : c.participantes;
    const grupos = c.grupos.map((g) => { const r = jogos.filter((j) => j.fase === `grupo-${g.id}`).reduce((a, j) => { (a[j.rodada] ||= []).push([j.casa, j.fora, ...j.placar]); return a; }, []); return { id: g.id, clubes: g.clubes, tabela: Temporada.tabela(g.clubes, r) }; });
    const futuro = c.jogos.find((j) => !jogos.some((x) => x.id === j.id));
    return [id, { ...c, fase: futuro ? futuro.fase : "encerrada", grupos, jogos, resultados, tabela: c.tipo === "liga" ? Temporada.tabela(ids, resultados) : undefined, campeao: futuro ? null : c.campeao, vice: futuro ? null : c.vice }];
  }));
  const liga = ligaDoClube(save.clube), tabela = competicoes[liga].tabela;
  const meus = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube).map((j) => ({ ...j, placar: save.jogosJogados.includes(j.id) ? j.placar : null }));
  let partida = null;
  if (save.partida) { const r = simularMinha(save); partida = { ...save.partida, placar: r.placar, eventos: r.eventos, parado: r.parado, completo: r.completo, times: r.times }; }
  const elenco = elencoDe(save, save.clube), artilharia = Object.entries(save.gols).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, gols]) => ({ id, gols }));
  return { base: save.base, ano: save.ano, temporada: save.temporada, clube: save.clube, tecnico: save.tecnico, modo: save.modo, rodada: save.rodada, total: meus.length, fim: !proximo, escalacao: save.escalacao, tabela, tabelas: Object.fromEntries(Object.entries(competicoes).filter(([, c]) => c.tabela).map(([id, c]) => [id, c.tabela])), competicoes, meus, artilharia, partida, ultimo: save.ultimo, historico: save.historico, rodadaAnterior: save.ultimo ? [[save.ultimo.casa, save.ultimo.fora, ...save.ultimo.placar]] : null, proximo: proximo ? [proximo.casa, proximo.fora] : null, proximoJogo: proximo,
    caixa: save.caixa, moral: save.moral, folha: folhaDe(save), financas: save.financas.slice(0, 4), elenco: elenco.map((j) => j.id), donos: save.donos, aVenda: save.aVenda, lesoes: save.lesoes, suspensos: save.suspensos, amarelos: save.amarelos, bonusNota: save.bonusNota, salarios: Object.fromEntries(elenco.map((j) => [j.id, salarioDe(save, j)])), indicacoes: save.indicacoes, transferencias: save.transferencias.slice(0, 20), caixaEntrada: save.caixaEntrada.slice(0, 25), janela: { aberta: Mercado.janelaAberta(save.rodada), proxima: Mercado.proximaJanela(save.rodada) }, tentativas: save.tentativas.rodada === save.rodada ? save.tentativas.por : {}, efeitos: [], situacao: save.situacao, forma: formaDe(save), compras: save.compras, valores: save.valores, pedidos: save.pedidos, parcelas: save.parcelas, feed: save.feed.slice(0, 30), posJogo: save.posJogo };
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
  if (!j || dono === save.clube || dono === APOSENTADO) return "Esse jogador não está disponível.";
  if (elencoDe(save, save.clube).length >= Mercado.ELENCO_MAX) return `O elenco já tem ${Mercado.ELENCO_MAX} jogadores. Venda alguém antes.`;
  const valor = inteiro(d.valor, 0, 5e9, 0), salario = inteiro(d.salario, 0, 1e8, 0);
  // um jogador seu na troca: entra no pagamento pelo valor de mercado com 10% de desconto
  const trocaId = d.troca ? String(d.troca) : null, troca = trocaId && jogadorDe(save, trocaId);
  if (trocaId && (!troca || donoDe(save, trocaId) !== save.clube)) return "O jogador da troca não é do seu elenco.";
  if (troca && elencoDe(save, save.clube).length <= Mercado.ELENCO_MIN) return `O elenco não pode ficar com menos de ${Mercado.ELENCO_MIN}.`;
  const credito = troca ? Math.round(valorAtual(save, troca) * 0.9 / 1e5) * 1e5 : 0;
  const dinheiroDaCompra = Math.max(0, valor - credito), parcelado = !!d.parcelas && dinheiroDaCompra > 0;
  const agora = parcelado ? Math.round(dinheiroDaCompra * Mercado.ENTRADA / 1e5) * 1e5 : dinheiroDaCompra;
  if (agora > save.caixa) return `O caixa não tem ${dinheiro(agora)}${parcelado ? " para a entrada" : ""}.`;
  if (save.tentativas.rodada !== save.rodada) save.tentativas = { rodada: save.rodada, por: {} };
  const tentativa = save.tentativas.por[pid] || 0;
  if (tentativa >= 3) return "Esse clube não quer mais conversa nesta rodada.";
  save.tentativas.por[pid] = tentativa + 1;
  const ind = save.indicacoes[pid], vendedor = clubeDe(save, dono), comprador = clubeDe(save, save.clube);
  const resposta = Mercado.avaliarProposta({ jogador: comNota(save, j), vendedor, comprador, titular: titularesDe(save, dono).includes(pid),
    valor: ind ? valor / ind.desconto : valor, salario, semente: `${save.semente}:${save.temporada}:${save.rodada}:${pid}`, tentativa, fator: fatorDe(save, pid) });
  if (ind && resposta.pedido) resposta.pedido = Math.ceil(resposta.pedido * ind.desconto / 1e5) * 1e5;
  if (ind && resposta.resultado === "contra") resposta.motivo = `O ${vendedor.nome} só libera por ${dinheiro(resposta.pedido)}.`;
  if (resposta.resultado === "aceita") {
    save.donos[pid] = save.clube; save.salarios[pid] = salario; delete save.indicacoes[pid];
    save.compras[pid] = { valor, rodada: save.rodada, temporada: save.temporada };
    save.valores[pid] = [valorAtual(save, j)];
    if (agora) movimentar(save, parcelado ? `Entrada da compra de ${j.nome}` : `Compra de ${j.nome}`, -agora);
    if (parcelado) {
      const resto = Math.round((dinheiroDaCompra - agora) * (1 + Mercado.JUROS)), parcela = Math.ceil(resto / Mercado.PARCELAS / 1e4) * 1e4;
      save.parcelas.push({ jogador: pid, nome: j.nome, valor: parcela, restantes: Mercado.PARCELAS });
    }
    if (troca) {
      save.donos[trocaId] = dono; delete save.salarios[trocaId]; delete save.compras[trocaId]; delete save.pedidos[trocaId]; delete save.valores[trocaId];
      save.aVenda = save.aVenda.filter((x) => x !== trocaId);
      save.transferencias.unshift({ rodada: save.rodada, jogador: trocaId, de: save.clube, para: dono, valor: credito, troca: true });
    }
    if (save.caixaIA[dono] != null) save.caixaIA[dono] += dinheiroDaCompra;
    save.transferencias.unshift({ rodada: save.rodada, temporada: save.temporada, jogador: pid, de: dono, para: save.clube, valor, ...(troca && { troca: trocaId }), ...(parcelado && { parcelado: true }) });
    Feed.transferencia(save, save.transferencias[0], ajudas);
    const como = [parcelado ? `entrada de ${dinheiro(agora)} e ${Mercado.PARCELAS} parcelas` : "", troca ? `${troca.nome} na troca` : ""].filter(Boolean).join(", ");
    avisar(save, { tipo: "contratacao", icone: "aperto", titulo: `${j.nome} chegou!`, texto: `Contratado do ${vendedor.nome} por ${dinheiro(valor)}${como ? ` (${como})` : ""}, com salário de ${dinheiro(salario)} por mês.` });
  }
  return { resposta };
}

// a próxima temporada: só com a atual encerrada e dentro do limite de temporadas da carreira
function novaTemporada(save) {
  if (save.partida) return "Termine a partida primeiro.";
  if (!temporadaAcabou(save)) return "A temporada ainda não acabou.";
  if (save.temporada >= save.temporadasMax) return `A carreira terminou: foram ${save.temporadasMax} temporada${save.temporadasMax > 1 ? "s" : ""}.`;
  registrarTemporada(save);
  resolverPendentes(save); // o que ficou sem resposta vale a opção padrão, como antes de um jogo
  const mundo = save.base === BASE_PADRAO, classificados = mundo ? classificadosDe(save) : null;
  const meus = virarTemporada(save);
  save.temporada++; save.ano++;
  Object.assign(save, { rodada: 0, resultados: [], gols: {}, partida: null, ultimo: null, amarelos: {}, lesoes: {}, suspensos: {}, bonusVitoria: 0, provocado: null, efeitos: [], posJogo: null,
    desempenho: {}, jogosTemporada: 0, tentativas: { rodada: -1, por: {} }, indicacoes: {} });
  // a escalação salva com alguém que se aposentou volta para a automática
  const elenco = new Set(elencoDe(save, save.clube).map((j) => j.id));
  if (save.escalacao.titulares && !save.escalacao.titulares.every((id) => elenco.has(id))) Object.assign(save.escalacao, { titulares: null, fixo: false });
  if (mundo) {
    Object.assign(save, { classificados, resultadosFixos: {}, jogosJogados: [], donosInicio: { ...save.donos } });
    recalcularMundo(save);
    save.calendario = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, save.clube).map((j) => [[j.casa, j.fora]]);
  } else save.calendario = Temporada.gerarCalendario(idsDosClubes(save), `${save.semente}:${save.temporada}`);
  const nomes = (lista) => lista.slice(0, 4).map(([pid, d]) => `${jogadorDe(save, pid).nome} (${d > 0 ? "+" : ""}${d})`).join(", ");
  const partes = [meus.subiram.length && `Subiram: ${nomes(meus.subiram)}.`, meus.cairam.length && `Caíram: ${nomes(meus.cairam)}.`,
    meus.aposentados.length && `Se aposentaram: ${meus.aposentados.map((pid) => jogadorDe(save, pid).nome).join(", ")}.`,
    meus.jovens.length && `Subiram da base: ${meus.jovens.map((pid) => `${jogadorDe(save, pid).nome} (${jogadorDe(save, pid).pos}, ${jogadorDe(save, pid).nota})`).join(", ")}.`].filter(Boolean);
  avisar(save, { tipo: "temporada", icone: "taca", titulo: `Começa a temporada ${save.ano} (${save.temporada} de ${save.temporadasMax})`, texto: `A janela está aberta até a rodada 4. Caixa: ${dinheiro(save.caixa)}. ${partes.join(" ")}`.trim() });
  if (meus.jovens.length) Feed.postar(save, { tipo: "base", perfil: save.clube, humor: "bom", arte: { cena: "treino", clube: save.clube, jogador: meus.jovens[0] },
    texto: `Da base para o profissional: ${meus.jovens.map((pid) => jogadorDe(save, pid).nome).join(" e ")} sobe${meus.jovens.length > 1 ? "m" : ""} para o time principal do ${clubeDe(save, save.clube).nome}.` });
  return null;
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
        const save = novaCarreira(nome, d.clube, d.skin, d.temporadas), c = bd.criarCarreira(nome, save);
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
      if (save.base === BASE_PADRAO) {
        const jogo = proximoJogoMundo(save); if (!jogo) return "A temporada acabou.";
        resolverPendentes(save);
        save.partida = { rodada: save.rodada, jogoId: jogo.id, competicao: jogo.competicao, fase: jogo.fase, mataMata: jogo.mataMata, casa: jogo.casa, fora: jogo.fora, modo: inteiro(d.modo ?? save.modo, 1, 3, 1), semente: sementeDoJogo(save, jogo.semana, jogo.casa, jogo.fora), decisoes: {} };
        const r = simularMinha(save); if (r.completo) fecharRodada(save, r); return null;
      }
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
      // a lista de venda: com pedido, entra (ou muda o preço); sem pedido, sai da lista (ou entra pelo valor, como antes)
      if (d.modo === "lista") {
        const listado = save.aVenda.includes(pid);
        if (d.pedido == null && listado) { save.aVenda = save.aVenda.filter((x) => x !== pid); delete save.pedidos[pid]; return null; }
        const v = valorAtual(save, j);
        save.pedidos[pid] = inteiro(d.pedido ?? v, Math.round(v * Mercado.PEDIDO_MIN), Math.round(v * Mercado.PEDIDO_MAX), v);
        if (!listado) save.aVenda = [...save.aVenda, pid];
        return null;
      }
      if (!Mercado.janelaAberta(save.rodada)) return "A janela de transferências está fechada.";
      if (elencoDe(save, save.clube).length <= Mercado.ELENCO_MIN) return `O elenco não pode ficar com menos de ${Mercado.ELENCO_MIN}.`;
      const r = Motor.sorteDe(`venda:${save.semente}:${save.rodada}:${pid}`), outros = idsDosClubes(save).filter((x) => x !== save.clube);
      return { mensagem: vender(save, pid, outros[Math.floor(r() * outros.length)], tetoVenda(save, pid, Mercado.vendaRapida(comNota(save, j), fatorDe(save, pid)))) };
    }));
    socket.on("evento", (d = {}, cb) => comCarreira(cb, (save) => {
      if (save.partida) return "Termine a partida primeiro.";
      const e = save.caixaEntrada.find((x) => x.id === d.id);
      if (!e || e.resolvido) return "Esse aviso já foi resolvido.";
      if (!e.opcoes.some((o) => o.id === d.opcao)) return "Escolha uma das opções.";
      return { mensagem: Eventos.responder(save, e, d.opcao, ajudas) };
    }));
    socket.on("novaTemporada", (d, cb) => comCarreira(cb, (save) => novaTemporada(save)));
    // o código de recuperação de novo (nasce outro: o banco só guarda o hash) e apagar a carreira de vez
    socket.on("codigo", (d, cb) => {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      const recuperacao = bd.novoCodigoDe(c.id);
      return recuperacao ? ok(cb, { recuperacao }) : falha(cb, "O banco de dados não respondeu. Tente de novo.");
    });
    socket.on("excluir", (d, cb) => {
      const c = token && bd.carreiraPorToken(token);
      if (!c) return falha(cb, "Carreira não encontrada. Entre de novo.");
      bd.excluirCarreira(c.id); token = null;
      ok(cb);
    });
    socket.on("sair", (d, cb) => { token = null; ok(cb); });
  });
};
// para os testes: montar uma carreira e mexer nela sem o socket
module.exports.paraTestes = { novaCarreira, ajudas, timeDe, fecharRodada, propor, estado, proximoJogoMundo, simularMinha, sementeDoJogo, novaTemporada, completar, APOSENTADO };
// para a carreira em grupo (carreira-online.js): o mundo com vários clubes humanos e as funções que ela usa
module.exports.grupo = { novaCarreiraGrupo, vistaDe, guardarVista, estado, limparEscalacao, completar, clubesEscolhiveis, clubeDe: (id) => BASES[BASE_PADRAO].clubes.find((c) => c.id === id), Orcamentos, VERSAO, CAMPOS_CLUBE, BASE_PADRAO };
