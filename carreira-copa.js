// Carreira de Treinador: a Copa do Mundo (de 2 em 2 temporadas: na 2ª, na 4ª...). O mundo da carreira para no meio da
// temporada (as semanas da Copa entram no calendário, Temporada.simularMundo com `copa`) e as 48 seleções disputam o formato
// novo: 12 grupos de 4, os 16 avos com os 8 melhores terceiros e tudo em jogo único, em campo neutro.
//
// O técnico não escolhe a seleção: no começo da temporada da Copa chega UMA proposta, pela campanha da temporada anterior
// (ofertar / pontuacao). Aceitando, ele treina o clube e a seleção (o calendário intercala: a seleção joga na pausa). A
// convocação é o "mercado" da seleção: só os jogadores daquele país (os da carreira, com a nota de agora, mais os de fora da
// carreira que estão no EA FC 27: public/carreira/base/selecoes-2026.js). As partidas usam o motor e as decisões da carreira.
//
// O que é de todos (na sala, o mundo) fica em save.copa: a edição, a convocação de cada seleção (as do computador e as dos
// técnicos), os cartões. O que é do técnico fica em save.selecao (na sala, um por clube: CAMPOS_CLUBE): a proposta, se aceitou,
// a escalação e o cansaço dos convocados.
const BASE = require("./public/carreira/base/selecoes-2026.js");
const Motor = require("./public/carreira/motor.js");
const Taticas = require("./public/carreira/taticas.js");
const Temporada = require("./public/carreira/temporada.js");

const ID = Temporada.COPA, SEMANA = 39, CONVOCADOS = 26, MINIMO = 23, GOLEIROS = 3;
const SELECOES = BASE.selecoes;
const POR_ID = new Map(SELECOES.map((s) => [s.id, s]));
const EXTRAS = new Map(SELECOES.flatMap((s) => s.jogadores.map((j) => [j.id, j])));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const ehSelecao = (id) => typeof id === "string" && POR_ID.has(id);
const temCopa = (temporada) => temporada >= 2 && temporada % 2 === 0;
const extra = (pid) => EXTRAS.get(pid) || null;
// a seleção como "clube" (o que clubeDe devolve): nome, sigla, cores, a bandeira e a formação
const METAS = new Map(SELECOES.map((s) => [s.id, { id: s.id, nome: s.nome, curto: s.sigla, sigla: s.sigla, cores: s.cores, bandeira: s.bandeira, formacao: s.formacao, conf: s.conf, nat: s.nat,
  estadio: "Estádio da Copa", tamanho: 5, liga: ID, pais: s.nome, selecao: true, forca: s.forca }]));
const meta = (id) => METAS.get(id) || null;
const nomeDe = (id) => (POR_ID.get(id) || { nome: id }).nome;

// a edição da Copa nesta temporada (ou nada)
const edicao = (save) => (save.copa && save.copa.temporada === save.temporada ? save.copa : null);
// a seleção que o técnico treina nesta temporada (aceitou a proposta), ou nada
const ativa = (save) => { const s = save.selecao; return s && edicao(save) && s.temporada === save.temporada && s.status === "aceita" ? s.id : null; };
// a seleção que um técnico da sala treina (na sala, o "dono" humano de um time pode ser o clube ou a seleção dele)
function humanoDaSelecao(save, id) {
  if (!save.humanos || !ehSelecao(id)) return null;
  for (const [clube, h] of Object.entries(save.humanos)) { const s = h.estado && h.estado.selecao; if (s && s.id === id && s.status === "aceita" && s.temporada === save.temporada) return clube; }
  return null;
}

// os jogadores que podem ser convocados: os da carreira com o país da seleção (a nota de agora, os jovens também) e os de fora
// (do EA FC 27). Sem os aposentados. c: as ajudas da carreira (todosJogadores, notaDe, donoDe, APOSENTADO)
function pool(save, c, id) {
  const s = POR_ID.get(id); if (!s) return [];
  const daCarreira = c.todosJogadores(save).filter((j) => j.nat === s.nat && c.donoDe(save, j.id) !== c.APOSENTADO).map((j) => ({ ...j, nota: c.notaDe(save, j), clube: c.donoDe(save, j.id) }));
  return [...daCarreira, ...s.jogadores.map((j) => ({ ...j, clube: null }))].sort((a, b) => b.nota - a.nota || String(a.id).localeCompare(String(b.id)));
}
// a convocação automática: 3 goleiros e as posições do time, os melhores de cada; o resto, os melhores que sobraram
const VAGAS = { GOL: 3, ZAG: 4, LD: 2, LE: 2, VOL: 2, MC: 3, MEI: 2, PE: 2, PD: 2, ATA: 3 };
function convocarAuto(lista, fixos = []) {
  const ids = new Set(fixos), out = fixos.map((id) => lista.find((j) => j.id === id)).filter(Boolean);
  const conta = (pos) => out.filter((j) => j.pos === pos).length;
  for (const [pos, n] of Object.entries(VAGAS)) for (const j of lista) { if (conta(pos) >= n || out.length >= CONVOCADOS) break; if (j.pos === pos && !ids.has(j.id)) { out.push(j); ids.add(j.id); } }
  for (const j of lista) { if (out.length >= CONVOCADOS) break; if (!ids.has(j.id) && (j.pos !== "GOL" || conta("GOL") < 4)) { out.push(j); ids.add(j.id); } }
  return out.map((j) => j.id);
}
// a lista de convocados de uma seleção (a do técnico, ou a do computador, feita na abertura da Copa)
const convocadosDe = (save, id) => ((edicao(save) || save.copa || {}).convocacoes || {})[id] || [];
// a lista que entra em campo: a convocação, ou, se o técnico ainda não fechou a dele (falta gente ou goleiro), completada com a
// automática (sem mudar o que ele escolheu)
function listaEmCampo(save, c, id) {
  const atual = convocadosDe(save, id), gols = atual.filter((pid) => (c.jogadorDe(save, pid) || {}).pos === "GOL").length;
  return atual.length >= MINIMO && gols >= GOLEIROS ? atual : convocarAuto(pool(save, c, id), atual.slice(0, CONVOCADOS - Math.max(0, GOLEIROS - gols)));
}
// o jogador convocado, como o motor quer: da carreira (com a nota de agora) ou de fora
function jogador(save, c, pid) {
  const j = c.jogadorDe(save, pid); if (!j) return null;
  return EXTRAS.has(pid) ? { ...j } : { ...j, nota: c.notaDe(save, j) };
}

// abre a Copa da temporada (no começo de uma temporada par): o sorteio sai da simulação do mundo; aqui ficam a edição e as
// convocações do computador (a lista das seleções dos técnicos começa igual e eles mexem depois)
function abrir(save, c) {
  if (save.base !== c.BASE_PADRAO || !temCopa(save.temporada)) return null;
  const sedes = BASE.sedes || [], n = Math.floor(save.temporada / 2);
  save.copa = { temporada: save.temporada, ano: save.ano, edicao: n, sede: sedes[(n - 1) % sedes.length] || "", semana: SEMANA, convocacoes: {}, cartoes: {}, suspensos: {} };
  for (const s of SELECOES) save.copa.convocacoes[s.id] = convocarAuto(pool(save, c, s.id));
  return save.copa;
}
// as seleções para a simulação do mundo: a convocação com a nota do começo da temporada (como os clubes: basesDaTemporada), para
// os jogos do computador não mudarem no meio do caminho
function timesDoMundo(save, c) {
  const e = edicao(save); if (!e) return null;
  return SELECOES.map((s) => ({ ...meta(s.id), jogadores: listaEmCampo(save, c, s.id).map((pid) => {
    const j = c.jogadorDe(save, pid); if (!j) return null;
    return EXTRAS.has(pid) ? { ...j } : { ...j, nota: clamp(j.nota + ((save.evolucao || {})[pid] || 0), 40, 95) };
  }).filter(Boolean) }));
}
const opcaoDoMundo = (save, c) => { const e = edicao(save), times = e && timesDoMundo(save, c); return times ? { semana: e.semana, selecoes: times, nome: `Copa do Mundo ${e.ano}` } : null; };

// ---------- a proposta ----------
// a campanha da temporada anterior vira pontos (0 a 100): a posição na liga (pesada pela força da liga), os títulos, a meta
const pontuacao = (h, fatorLiga = 1) => {
  if (!h) return 35;
  const total = 20, pos = clamp(h.posicao || total, 1, total);
  let p = 55 * (1 - (pos - 1) / (total - 1)) * clamp(fatorLiga, 0.45, 1.35) + 15 * (h.titulos || []).length + 5 * (h.vices || []).length;
  if (h.meta) p += h.meta.cumprida ? 10 : -6;
  if (h.divisao === "rebaixado") p -= 15; else if (h.divisao === "acesso") p += 8;
  return Math.round(clamp(p, 0, 100));
};
// as seleções da mais forte para a mais fraca; a nota da campanha escolhe a faixa, e a semente, uma da faixa que ainda está livre
const PORFORCA = [...SELECOES].sort((a, b) => b.forca - a.forca || a.id.localeCompare(b.id)).map((s) => s.id);
function escolherSelecao(pontos, semente, ocupadas = new Set()) {
  const alvo = Math.round((100 - pontos) / 100 * (PORFORCA.length - 1));
  const r = Motor.sorteDe(`copa:oferta:${semente}`), livres = PORFORCA.map((id, i) => [id, i]).filter(([id]) => !ocupadas.has(id));
  if (!livres.length) return null;
  const perto = livres.sort((a, b) => Math.abs(a[1] - alvo) - Math.abs(b[1] - alvo) || a[1] - b[1]).slice(0, 3);
  return perto[Math.floor(r() * perto.length)][0];
}
const motivoDe = (h, pontos) => {
  if (!h) return "A federação quer um técnico com fome de títulos.";
  const partes = [`${h.posicao}º lugar na ${h.liga}`];
  if ((h.titulos || []).length) partes.push(`${h.titulos.length === 1 ? "o título" : `${h.titulos.length} títulos`} (${h.titulos.join(", ")})`);
  if (h.meta) partes.push(h.meta.cumprida ? "a meta da diretoria cumprida" : "mesmo sem cumprir a meta da diretoria");
  return `${pontos >= 70 ? "Depois de uma temporada brilhante" : pontos >= 45 ? "Pela boa temporada" : "Apostando no seu trabalho"}: ${partes.join(", ")}.`;
};
// a proposta para o técnico (visão de um clube). h: a temporada anterior do histórico; ocupadas: as seleções já oferecidas na sala
function ofertar(save, c, h, fatorLiga, ocupadas) {
  if (!edicao(save) || save.jogador) return null;
  const pontos = pontuacao(h, fatorLiga), id = escolherSelecao(pontos, `${save.semente}:${save.temporada}:${save.clube}`, ocupadas);
  if (!id) return null;
  const s = POR_ID.get(id);
  save.selecao = { temporada: save.temporada, id, status: "pendente", pontos, motivo: motivoDe(h, pontos), escalacao: { formacao: s.formacao, tatica: { mentalidade: 0, pressao: 1, linha: 1, estilo: "auto" }, titulares: null, fixo: false }, energia: {} };
  c.avisar(save, { tipo: "selecao", icone: "taca", titulo: `Proposta da seleção: ${s.nome}`, texto: `A federação de ${s.nome} quer você no comando para a Copa do Mundo ${save.copa.ano}${save.copa.sede ? ` (${save.copa.sede})` : ""}. ${save.selecao.motivo} Você continua no clube: a seleção joga na pausa do meio da temporada. Responda no painel da Sede.` });
  return id;
}
function responder(save, c, aceitar) {
  const s = save.selecao;
  if (!s || !edicao(save) || s.temporada !== save.temporada) return "Não há proposta de seleção nesta temporada.";
  if (s.status !== "pendente") return s.status === "aceita" ? "Você já é o técnico da seleção." : "Você já recusou a proposta.";
  s.status = aceitar ? "aceita" : "recusada";
  const nome = nomeDe(s.id);
  if (aceitar) {
    c.avisar(save, { tipo: "selecao", icone: "aperto", titulo: `Você é o técnico da seleção: ${nome}`, texto: `A convocação está aberta até a estreia na Copa (${CONVOCADOS} nomes, pelo menos ${GOLEIROS} goleiros). A lista do computador já vem pronta: mexa à vontade na tela da Seleção.` });
    c.postar(save, { tipo: "tecnico", perfil: s.id, humor: "bom", peso: 2, arte: { cena: "apresentacao", clube: s.id }, texto: `${nome} anuncia ${(save.tecnico && save.tecnico.nome) || "o novo técnico"} para a Copa do Mundo. Ele segue no comando do ${c.clubeDe(save, save.clube).nome}.` });
  }
  return null;
}
// o prazo: a proposta sem resposta é aceita quando a Copa chega (o próximo jogo do clube já é depois da pausa)
function prazo(save, c) {
  const s = save.selecao, e = edicao(save);
  if (!s || !e || s.temporada !== save.temporada || s.status !== "pendente") return false;
  const prox = (save.calendarioMundo || []).find((j) => (j.casa === save.clube || j.fora === save.clube) && !(save.jogosJogados || []).includes(j.id));
  if (prox && prox.semana < e.semana) return false;
  responder(save, c, true);
  s.automatica = true;
  return true;
}

// ---------- a convocação e a escalação ----------
const comecou = (save) => (save.jogosJogados || []).some((id) => id.startsWith(`${ID}:`)) || !!(save.partida && save.partida.competicao === ID);
function convocar(save, c, d) {
  const id = ativa(save); if (!id) return "Você não treina uma seleção nesta temporada.";
  if (comecou(save)) return "A Copa já começou: a lista está fechada.";
  const lista = pool(save, c, id), validos = new Set(lista.map((j) => j.id));
  let atual = [...convocadosDe(save, id)];
  if (d.acao === "auto") atual = convocarAuto(lista);
  else if (d.acao === "limpar") atual = [];
  else {
    const pid = String(d.jogador || "");
    if (!validos.has(pid)) return `Esse jogador não pode defender ${nomeDe(id)}.`;
    if (d.acao === "tirar") atual = atual.filter((x) => x !== pid);
    else if (atual.includes(pid)) return null;
    else if (atual.length >= CONVOCADOS) return `A lista já tem ${CONVOCADOS} nomes: tire alguém antes.`;
    else atual.push(pid);
  }
  save.copa.convocacoes[id] = atual;
  const esc = save.selecao.escalacao;
  if (esc.titulares && !esc.titulares.every((p) => atual.includes(p))) Object.assign(esc, { titulares: null, fixo: false });
  return null;
}
// a lista pronta para jogar: falta gente (ou goleiro), completa com a automática
function garantirLista(save, c) {
  const id = ativa(save); if (!id) return;
  const atual = convocadosDe(save, id), lista = pool(save, c, id);
  const gols = atual.filter((pid) => (lista.find((j) => j.id === pid) || {}).pos === "GOL").length;
  if (atual.length >= MINIMO && gols >= GOLEIROS) return;
  save.copa.convocacoes[id] = convocarAuto(lista, atual.slice(0, CONVOCADOS - Math.max(0, GOLEIROS - gols)));
}
function escalacao(save, c, d) {
  const id = ativa(save); if (!id) return "Você não treina uma seleção nesta temporada.";
  if (save.partida) return "Não dá para mexer na escalação com a partida em andamento.";
  const e = save.selecao.escalacao, convocados = convocadosDe(save, id);
  if (d.formacao && Taticas.FORMACOES[d.formacao]) e.formacao = d.formacao;
  if (d.tatica && typeof d.tatica === "object") e.tatica = { mentalidade: clamp(Math.round(Number(d.tatica.mentalidade) || 0), -2, 2), pressao: clamp(Math.round(Number(d.tatica.pressao ?? 1)), 0, 2), linha: clamp(Math.round(Number(d.tatica.linha ?? 1)), 0, 2), estilo: Taticas.estiloValido(d.tatica.estilo) };
  if (d.titulares === null) Object.assign(e, { titulares: null, fixo: false });
  else if (Array.isArray(d.titulares)) {
    const ids = d.titulares.map(String);
    if (ids.length !== 11 || new Set(ids).size !== 11) return "Escolha 11 titulares.";
    if (!ids.every((x) => convocados.includes(x))) return "Algum titular não está convocado.";
    if (!ids.some((x) => (c.jogadorDe(save, x) || {}).pos === "GOL")) return "Falta um goleiro entre os titulares.";
    Object.assign(e, { titulares: ids, fixo: !!d.fixo });
  }
  return null;
}
// quem não joga a próxima: machucado (no clube ou na Copa) ou suspenso na Copa
const fora = (save, pid) => (save.lesoes && save.lesoes[pid] ? "lesao" : (((edicao(save) || {}).suspensos) || {})[pid] ? "suspenso" : null);
// o time da seleção para o motor. A do técnico usa a escalação dele e o cansaço da Copa; a do computador, a automática
function timeDaSelecao(save, c, id) {
  const m = meta(id), meu = id === ativa(save), esc = meu ? save.selecao.escalacao : null;
  const jogadores = listaEmCampo(save, c, id).filter((pid) => !fora(save, pid)).map((pid) => jogador(save, c, pid)).filter(Boolean).map((j) => ({ ...j, notaBase: (c.jogadorDe(save, j.id) || j).nota, nota: clamp(j.nota, 40, 97) }));
  const titulares = esc && esc.titulares && esc.titulares.every((pid) => jogadores.some((j) => j.id === pid)) ? esc.titulares : undefined;
  return { id, nome: m.nome, jogadores, formacao: meu ? esc.formacao : m.formacao, tatica: meu ? esc.tatica : { mentalidade: 0, pressao: 1, linha: 1, estilo: "auto" },
    titulares, fixo: !!(titulares && esc.fixo), energia: meu ? save.selecao.energia : undefined };
}
// o cansaço na Copa: quem jogou perde um pouco, quem descansou volta a 100 (os jogos são de semana em semana)
function cansaco(save, r) {
  const id = ativa(save); if (!id) return;
  const e = save.selecao.energia || (save.selecao.energia = {}), jogaram = new Set((r.jogaram && r.jogaram[id]) || []);
  for (const pid of convocadosDe(save, id)) e[pid] = jogaram.has(pid) ? clamp(Math.round((r.energia && r.energia[pid] != null ? r.energia[pid] : 80) + 30), 55, 100) : 100;
}
// os cartões da Copa (2 amarelos ou 1 vermelho: um jogo fora; os amarelos zeram depois das quartas) e as lesões (valem no clube)
function cartoes(save, c, r, jogo) {
  const e = edicao(save); if (!e) return;
  // quem estava suspenso cumpriu neste jogo (só os dos dois times que jogaram)
  const jogaram = new Set([...convocadosDe(save, jogo.casa), ...convocadosDe(save, jogo.fora)]);
  for (const pid of Object.keys(e.suspensos)) if (jogaram.has(pid) && --e.suspensos[pid] <= 0) delete e.suspensos[pid];
  const sorte = Motor.sorteDe(`copa:lesoes:${jogo.id}`);
  for (const ev of r.eventos) {
    if (ev.tipo === "vermelho") { e.suspensos[ev.jogador] = 1; delete e.cartoes[ev.jogador]; }
    else if (ev.tipo === "amarelo") { e.cartoes[ev.jogador] = (e.cartoes[ev.jogador] || 0) + 1; if (e.cartoes[ev.jogador] >= 2) { e.suspensos[ev.jogador] = 1; delete e.cartoes[ev.jogador]; } }
    else if (ev.tipo === "lesao" && !EXTRAS.has(ev.jogador)) save.lesoes[ev.jogador] = Math.max(save.lesoes[ev.jogador] || 0, 1 + Math.floor(sorte() * 3));
  }
  if (jogo.fase === "quartas") e.cartoes = {};
}

// ---------- o que a tela recebe ----------
const FASES = { dezesseis: "16 avos de final", oitavas: "Oitavas de final", quartas: "Quartas de final", semifinal: "Semifinal", terceiro: "Disputa do 3º lugar", final: "Final" };
const rotulo = (j) => (String(j.fase).startsWith("grupo-") ? `Grupo ${String(j.fase).slice(6)}, rodada ${(j.rodada || 0) + 1}` : FASES[j.fase] || j.fase);
// até onde a Copa da seleção foi (para o histórico do técnico): campeão, vice, 3º, a fase em que caiu
function campanha(save, id) {
  const comp = save.competicoes && save.competicoes[ID]; if (!comp || !id) return null;
  const jogos = comp.jogos.filter((j) => (j.casa === id || j.fora === id) && (save.jogosJogados || []).includes(j.id));
  if (!jogos.length) return null;
  const ultimo = jogos[jogos.length - 1], fase = ultimo.fase;
  const res = { v: 0, e: 0, d: 0, gp: 0, gc: 0 };
  for (const j of jogos) { const [a, b] = j.casa === id ? j.placar : [j.placar[1], j.placar[0]]; res.gp += a; res.gc += b; if (a > b) res.v++; else if (a === b) res.e++; else res.d++; }
  const acabou = !comp.jogos.some((j) => (j.casa === id || j.fora === id) && !(save.jogosJogados || []).includes(j.id));
  const lugar = acabou && comp.campeao === id ? "Campeã" : acabou && comp.vice === id ? "Vice-campeã" : acabou && comp.terceiro === id ? "3º lugar" : acabou && fase === "terceiro" ? "4º lugar" : acabou ? `Caiu: ${String(fase).startsWith("grupo-") ? "fase de grupos" : (FASES[fase] || fase).toLowerCase()}` : "Em disputa";
  return { id, nome: nomeDe(id), jogos: jogos.length, ...res, lugar, campeao: acabou && comp.campeao === id };
}
function estado(save, c) {
  const e = edicao(save), s = save.selecao && save.selecao.temporada === save.temporada ? save.selecao : null;
  if (!e) return { copa: null, selecao: null };
  const id = s && s.id, minha = id && s.status === "aceita";
  const lista = minha ? pool(save, c, id) : [];
  return {
    copa: { temporada: e.temporada, ano: e.ano, sede: e.sede, semana: e.semana, edicao: e.edicao, nome: `Copa do Mundo ${e.ano}` },
    selecao: s ? { id, nome: nomeDe(id), status: s.status, motivo: s.motivo, pontos: s.pontos, automatica: !!s.automatica,
      ...(minha && { convocados: convocadosDe(save, id), pool: lista.slice(0, 70).map((j) => j.id), clubes: Object.fromEntries(lista.slice(0, 70).map((j) => [j.id, j.clube || null])),
        fechada: comecou(save), escalacao: s.escalacao, energia: s.energia || {}, fora: Object.fromEntries(convocadosDe(save, id).map((pid) => [pid, fora(save, pid)]).filter(([, f]) => f)),
        cartoes: e.cartoes, campanha: campanha(save, id), limite: CONVOCADOS, minimo: MINIMO, goleiros: GOLEIROS }) } : null,
  };
}
module.exports = { ID, SEMANA, CONVOCADOS, MINIMO, GOLEIROS, SELECOES, FASES, ehSelecao, temCopa, extra, meta, nomeDe, edicao, ativa, humanoDaSelecao, pool, convocarAuto, convocadosDe,
  abrir, timesDoMundo, opcaoDoMundo, pontuacao, escolherSelecao, ofertar, responder, prazo, comecou, convocar, garantirLista, escalacao, fora, timeDaSelecao, cansaco, cartoes, rotulo, campanha, estado };
