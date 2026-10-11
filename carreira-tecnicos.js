// Carreira de Treinador: o MERCADO DE TÉCNICOS. No fim de cada temporada (menos a última), outros clubes sondam o técnico pelo que
// ele fez: a reputação (carreira-clube.js), a meta cumprida, os títulos e a classificação. Ele escolhe ficar ou ir para um clube
// novo; a troca vale na virada da temporada (`aplicar`, chamada por `novaTemporada` em carreira.js, antes de a temporada virar).
// Só na carreira solo com a base mundial: na sala em grupo cada técnico tem o clube que escolheu no começo.
// `save.vagas = { temporada, ofertas: [...], escolha: id | "ficar" | null }`. Testes em tests/carreira-tecnicos.test.js.
const Motor = require("./public/carreira/motor.js");
const Clube = require("./carreira-clube.js");
const Memoria = require("./carreira-memoria.js");
const Feed = require("./carreira-feed.js");
const Temporada = require("./public/carreira/temporada.js");

const LIGAS = ["brasileirao-2026", "serieb-2026", "inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026", "argentina-2026", "sulamericanos-2026"];
const NOME_LIGA = { "brasileirao-2026": "Brasileirão", "serieb-2026": "Série B", "inglaterra-2026": "Premier League", "espanha-2026": "La Liga", "italia-2026": "Série A italiana",
  "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1", "argentina-2026": "Liga Argentina", "sulamericanos-2026": "Sul-Americanos" };
const MAX_OFERTAS = 3, REBAIXAM = 4;
const arred1 = (v) => Math.round(v * 10) / 10;

const ehGrupo = (save) => typeof save.humanoDe === "function" || !!save.humanos;
const emprego = (save) => !ehGrupo(save) && !save.demitido && !!save.calendarioMundo;
// o mercado abre em dois momentos: no fim da temporada (troca na virada) e no começo da seguinte, antes do primeiro jogo (troca na hora)
const comeco = (save, c) => (save.historico || []).length > 0 && !c.temporadaAcabou(save) && !save.partida && save.rodada === 0 && !(save.jogosJogados || []).length;
const momentoDe = (save, c) => (!emprego(save) ? null : c.temporadaAcabou(save) ? (save.temporada < save.temporadasMax ? "fim" : null) : comeco(save, c) ? "comeco" : null);
const vale = (save, c) => !!momentoDe(save, c);

// o que a diretoria nova promete cobrar, pela força do clube na liga dele (as mesmas faixas da meta da diretoria)
function projetoDe(rank, total, liga) {
  if (liga === "serieb-2026") return rank <= 4 ? "Subir para a Série A" : "Brigar pelo acesso";
  return rank <= 2 ? "Brigar pelo título" : rank <= 6 ? "Vaga em competição continental" : rank <= 12 ? "Campanha de meio de tabela" : "Fugir do rebaixamento";
}

// quanto o mercado enxerga de valor no técnico: pontos de nota que ele "empresta" ao clube que quer contratá-lo
function prestigio(save, g, res) {
  let p = g.reputacao * 0.09;
  if (res.cumpriuMeta === true) p += 1.5; else if (res.cumpriuMeta === false) p -= 1.5;
  p += (res.titulos || 0) * 2.5 + (res.pos <= 3 ? 1 : 0);
  if (res.rebaixado) p -= 3;
  return p;
}

// os clubes que o técnico pode ter em vista: todos das ligas jogáveis, menos o dele e os que vão cair da Série A (a Série B só
// para quem já está nela). Cada um com a força, a posição na liga dele e o quanto o técnico precisa de prestígio para ser aceito.
function mercadoDe(save, c) {
  const ligaMinha = c.ligaDoClube(save.clube, save), caem = new Set();
  const tabA = save.competicoes && save.competicoes["brasileirao-2026"] && save.competicoes["brasileirao-2026"].tabela;
  if (tabA && tabA.length) for (const l of tabA.slice(-REBAIXAM)) caem.add(l.id);
  const pool = [];
  for (const liga of LIGAS) {
    if (liga === "serieb-2026" && ligaMinha !== "serieb-2026") continue;
    const clubes = c.clubesDaLiga(save, liga), forcas = clubes.map((id) => [id, c.forcaDoClube(save, id)]).sort((a, b) => b[1] - a[1]);
    forcas.forEach(([id, f], i) => { if (id !== save.clube && !caem.has(id)) pool.push({ id, liga, forca: f, rank: i + 1, total: forcas.length }); });
  }
  return { pool, ligaMinha, minha: c.forcaDoClube(save, save.clube) };
}
function ofertaDe(save, c, o, minha) {
  const cl = c.clubeDe(save, o.id);
  return { id: o.id, nome: cl.nome, liga: o.liga, ligaNome: NOME_LIGA[o.liga] || o.liga, forca: arred1(o.forca), delta: arred1(o.forca - minha), tamanho: cl.tamanho || 3,
    caixa: Math.round((save.caixaIA && save.caixaIA[o.id]) ?? c.caixaInicial(save, cl)), projeto: projetoDe(o.rank, o.total, o.liga), rank: o.rank };
}
// a chance de um clube aceitar a candidatura do técnico: 90% se a força dele não passa a do seu time mais o prestígio, e cai
// 12 pontos por ponto de força acima disso (nunca abaixo de 4%)
const chanceDe = (forca, teto) => Math.round(Math.max(0.04, Math.min(0.9, 0.9 - Math.max(0, forca - teto) * 0.12)) * 100) / 100;

// as ofertas: um clube maior, um do mesmo tamanho (de preferência em outra liga) e um menor, se o técnico tem como atraí-los.
// Sempre sai pelo menos uma: se ninguém caberia, vêm os dois clubes mais próximos da força do dele (um desafio menor, mas um convite).
// `res` = { pos, titulos, cumpriuMeta, rebaixado }; `c` = as ajudas da carreira (forcaDoClube, clubesDaLiga, ligaDoClube, clubeDe, caixaInicial).
function gerar(save, c, res = {}) {
  if (!vale(save, c) || (save.vagas && save.vagas.temporada === save.temporada)) return null;
  const g = Clube.gestaoDe(save), { pool, ligaMinha, minha } = mercadoDe(save, c), teto = minha + prestigio(save, g, res);
  const sorte = Motor.sorteDe(`vagas:${save.semente}:${save.temporada}`);
  const cabem = pool.filter((x) => x.forca <= teto && x.forca >= minha - 9).sort((a, b) => a.id.localeCompare(b.id));
  const escolhe = (lista) => (lista.length ? lista.splice(Math.floor(sorte() * lista.length), 1)[0] : null);
  const maiores = cabem.filter((x) => x.forca > minha + 0.4).sort((a, b) => b.forca - a.forca).slice(0, 6);
  const iguais = cabem.filter((x) => Math.abs(x.forca - minha) <= 0.4 || (x.forca <= minha + 0.4 && x.forca > minha - 2));
  const menores = cabem.filter((x) => x.forca <= minha - 2);
  const outraLiga = iguais.filter((x) => x.liga !== ligaMinha);
  let sel = [escolhe(maiores), escolhe(outraLiga.length ? outraLiga : iguais), escolhe(menores)].filter(Boolean);
  if (!sel.length) sel = [...pool].sort((a, b) => Math.abs(a.forca - minha) - Math.abs(b.forca - minha) || a.id.localeCompare(b.id)).slice(0, 2);
  const unicas = [...new Map(sel.map((o) => [o.id, o])).values()].slice(0, MAX_OFERTAS).map((o) => ofertaDe(save, c, o, minha));
  const momento = momentoDe(save, c);
  save.vagas = { temporada: save.temporada, momento, ofertas: unicas, escolha: null, candidaturas: {} };
  if (unicas.length && momento === "fim") {
    c.avisar(save, { tipo: "mercado-tecnico", icone: "coroa", titulo: unicas.length > 1 ? "Propostas para ser o técnico de outros clubes" : "Um clube quer contratar você",
      texto: `${unicas.map((o) => `${o.nome} (${o.ligaNome})`).join(", ")} ${unicas.length > 1 ? "sondaram" : "sondou"} o seu trabalho. Veja na aba Temporada da Sede, ou procure outro clube por conta própria, e decida antes de começar a próxima temporada.` });
    const alvo = unicas[0];
    Feed.postar(save, { tipo: "mercado", perfil: "galeranews", galeranews: true, humor: "mercado", arte: { cena: "aperto", clube: alvo.id }, peso: 2,
      texto: `Mercado de técnicos: o ${alvo.nome} sonda ${save.tecnico && save.tecnico.nome ? save.tecnico.nome : "o treinador do " + c.clubeDe(save, save.clube).nome}${unicas.length > 1 ? `, e não é o único clube na fila` : ""}.` });
  }
  return save.vagas;
}

// o que o estado mostra: as propostas e os clubes para onde o técnico pode se candidatar (com a chance de ser aceito)
function visao(save, c, res = {}) {
  if (!vale(save, c)) return null;
  if (!save.vagas || save.vagas.temporada !== save.temporada) gerar(save, c, res); // saves de antes do mercado, ou que acabaram sem passar por aqui
  const v = save.vagas; if (!v || v.temporada !== save.temporada || v.aplicada) return null;
  const g = Clube.gestaoDe(save), { pool, minha } = mercadoDe(save, c), teto = minha + prestigio(save, g, res), ofertados = new Set(v.ofertas.map((o) => o.id));
  const candidatos = pool.filter((x) => !ofertados.has(x.id) && x.forca >= minha - 12).map((x) => ({ ...ofertaDe(save, c, x, minha), chance: chanceDe(x.forca, teto), tentou: v.candidaturas && v.candidaturas[x.id] === false }))
    .sort((a, b) => b.chance - a.chance || b.forca - a.forca).slice(0, 14);
  return { ofertas: v.ofertas, escolha: v.escolha, candidatos, momento: v.momento || momentoDe(save, c) };
}

// o técnico se candidata a um clube: o sorteio é sempre o mesmo para a mesma carreira (recarregar não muda), e cada clube só atende uma vez.
function candidatar(save, c, id, res = {}) {
  const v = save.vagas;
  if (!vale(save, c) || !v || v.temporada !== save.temporada || v.aplicada) return "O mercado de técnicos só abre no fim da temporada e antes do primeiro jogo da seguinte.";
  if (v.ofertas.some((o) => o.id === id)) return "Esse clube já mandou proposta.";
  if (v.candidaturas && id in v.candidaturas) return "Esse clube já respondeu à sua candidatura.";
  const g = Clube.gestaoDe(save), { pool, minha } = mercadoDe(save, c), alvo = pool.find((x) => x.id === id);
  if (!alvo) return "Esse clube não está contratando.";
  const chance = chanceDe(alvo.forca, minha + prestigio(save, g, res));
  const aceitou = Motor.sorteDe(`candidatura:${save.semente}:${save.temporada}:${id}`)() < chance;
  (v.candidaturas || (v.candidaturas = {}))[id] = aceitou;
  const nome = c.clubeDe(save, id).nome;
  if (!aceitou) { c.avisar(save, { tipo: "mercado-tecnico", icone: "sino", titulo: `${nome} recusou a candidatura`, texto: `O ${nome} preferiu outro nome. Tente outro clube ou fique no seu.` }); return { aceitou: false, mensagem: `O ${nome} preferiu outro nome.` }; }
  v.ofertas.push(ofertaDe(save, c, alvo, minha));
  v.escolha = id;
  if (momentoDe(save, c) === "comeco") { const info = trocarClube(save, c, id); noticiar(save, c, info); return { aceitou: true, mudou: true, mensagem: `O ${nome} aceitou: você já é o novo técnico.` }; }
  c.avisar(save, { tipo: "mercado-tecnico", icone: "coroa", titulo: `${nome} aceitou a candidatura`, texto: `O ${nome} quer você como técnico. A troca vale na virada da temporada; dá para mudar de ideia até lá.` });
  return { aceitou: true, mensagem: `O ${nome} aceitou: você assume na virada da temporada.` };
}

// a escolha do técnico: o id de uma oferta ou "ficar". No fim da temporada vale na virada (dá para mudar de ideia até lá); no começo
// da seguinte, antes do primeiro jogo, a troca é na hora.
function escolher(save, c, id) {
  const v = save.vagas;
  if (!v || v.temporada !== save.temporada || v.aplicada) return "Nenhum clube está esperando a sua resposta.";
  if (!vale(save, c)) return "O mercado de técnicos está fechado.";
  if (id !== "ficar" && !v.ofertas.some((o) => o.id === id)) return "Essa proposta não existe mais.";
  v.escolha = id;
  if (id !== "ficar" && momentoDe(save, c) === "comeco") { const info = trocarClube(save, c, id); noticiar(save, c, info); return { mudou: true, mensagem: `Você assumiu o ${info.nomePara}.` }; }
  return null;
}

// a mudança de clube: o caixa, o elenco, a gestão e a memória passam a ser os do clube novo; o técnico leva a reputação
function trocarClube(save, c, novo) {
  const velho = save.clube, cl = c.clubeDe(save, novo), nomeVelho = c.clubeDe(save, velho).nome;
  // o caixa: o clube velho guarda o dele; o novo traz o que tinha
  save.caixaIA = save.caixaIA || {};
  save.caixaIA[velho] = save.caixa; save.caixa = save.caixaIA[novo] ?? c.caixaInicial(save, cl); delete save.caixaIA[novo];
  save.clube = novo;
  Object.assign(save, { aVenda: [], pedidos: {}, compras: {}, valores: {}, parcelas: [], financas: [], posJogo: null, ultimo: null, provocado: null, efeitos: [], eventosVistos: {}, segredos: {},
    indicacoes: {}, meta: null, energia: {}, sequencia: {}, moral: 60, situacao: null, comprasJanela: null, janelasAnteriores: [], entrada: null });
  save.escalacao = { ...save.escalacao, formacao: cl.formacao || save.escalacao.formacao, titulares: null, fixo: false };
  save.calendario = Temporada.jogosDoClube({ jogos: save.calendarioMundo }, novo).map((j) => [[j.casa, j.fora]]); // o calendário do clube novo (na virada, carreira.js refaz)
  // o técnico leva a reputação, os pontos e as habilidades; o clube (estádio, contratos, base, diretoria) é outro
  const g = Clube.gestaoDe(save), nova = Clube.padrao();
  save.gestao = { ...nova, reputacao: g.reputacao, pontos: g.pontos, habilidades: g.habilidades, preparadores: g.preparadores, confianca: 60,
    legado: { ...nova.legado, hall: g.legado.hall, marcos: g.legado.marcos } };
  const m = Memoria.de(save);
  m.rel = { torcida: 45, imprensa: 55, vestiario: 50 }; m.laco = {}; m.ultimoJogo = null; m.ultimoEco = -9;
  Memoria.registrar(save, `Deixou o ${nomeVelho} para comandar o ${cl.nome}.`, "marco");
  save.vagas = { ...save.vagas, aplicada: { de: velho, para: novo } };
  return { mudou: true, de: velho, para: novo, nomeDe: nomeVelho, nomePara: cl.nome };
}
// o aviso e a notícia da apresentação no clube novo
function noticiar(save, c, info) {
  c.avisar(save, { tipo: "mercado-tecnico", icone: "coroa", titulo: `Novo clube: ${info.nomePara}`, texto: `Você deixou o ${info.nomeDe} e assume o ${info.nomePara}. A torcida ainda está te conhecendo, a diretoria quer ver trabalho e o elenco é outro.` });
  Feed.postar(save, { tipo: "tecnico", perfil: save.clube, arte: { cena: "apresentacao", clube: save.clube }, peso: 2, texto: `O ${info.nomePara} apresenta ${save.tecnico.nome} como novo técnico, vindo do ${info.nomeDe}. "Chego para ganhar", disse na chegada.` });
}

// na virada da temporada: quem aceitou uma proposta troca de clube. Devolve o resumo da troca, ou null se ficou.
function aplicar(save, c) {
  const v = save.vagas;
  if (!v || v.temporada !== save.temporada || v.aplicada || !v.escolha || v.escolha === "ficar" || v.momento !== "fim") return null;
  if (!v.ofertas.some((x) => x.id === v.escolha)) return null;
  return trocarClube(save, c, v.escolha);
}

module.exports = { gerar, visao, candidatar, escolher, aplicar, noticiar, momentoDe, vale, projetoDe, prestigio, NOME_LIGA, LIGAS };
