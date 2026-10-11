// Carreira de Treinador: o MERCADO DE TÉCNICOS. No fim de cada temporada (menos a última), outros clubes sondam o técnico pelo que
// ele fez: a reputação (carreira-clube.js), a meta cumprida, os títulos e a classificação. Ele escolhe ficar ou ir para um clube
// novo; a troca vale na virada da temporada (`aplicar`, chamada por `novaTemporada` em carreira.js, antes de a temporada virar).
// Só na carreira solo com a base mundial: na sala em grupo cada técnico tem o clube que escolheu no começo.
// `save.vagas = { temporada, ofertas: [...], escolha: id | "ficar" | null }`. Testes em tests/carreira-tecnicos.test.js.
const Motor = require("./public/carreira/motor.js");
const Clube = require("./carreira-clube.js");
const Memoria = require("./carreira-memoria.js");
const Feed = require("./carreira-feed.js");

const LIGAS = ["brasileirao-2026", "serieb-2026", "inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026", "argentina-2026", "sulamericanos-2026"];
const NOME_LIGA = { "brasileirao-2026": "Brasileirão", "serieb-2026": "Série B", "inglaterra-2026": "Premier League", "espanha-2026": "La Liga", "italia-2026": "Série A italiana",
  "alemanha-2026": "Bundesliga", "franca-2026": "Ligue 1", "argentina-2026": "Liga Argentina", "sulamericanos-2026": "Sul-Americanos" };
const MAX_OFERTAS = 3, REBAIXAM = 4;
const arred1 = (v) => Math.round(v * 10) / 10;

const ehGrupo = (save) => typeof save.humanoDe === "function" || !!save.humanos;
const vale = (save) => !ehGrupo(save) && !save.demitido && save.temporada < save.temporadasMax && !!save.calendarioMundo;

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

// as ofertas: um clube maior, um do mesmo tamanho (de preferência em outra liga) e um menor, se o técnico tem como atraí-los.
// `res` = { pos, titulos, cumpriuMeta, rebaixado }; `c` = as ajudas da carreira (forcaDoClube, clubesDaLiga, ligaDoClube, clubeDe, caixaInicial).
function gerar(save, c, res = {}) {
  if (!vale(save) || (save.vagas && save.vagas.temporada === save.temporada)) return null;
  const g = Clube.gestaoDe(save), minha = c.forcaDoClube(save, save.clube), ligaMinha = c.ligaDoClube(save.clube, save);
  const teto = minha + prestigio(save, g, res);
  const caem = new Set();
  const tabA = save.competicoes && save.competicoes["brasileirao-2026"] && save.competicoes["brasileirao-2026"].tabela;
  if (tabA && tabA.length) for (const l of tabA.slice(-REBAIXAM)) caem.add(l.id); // quem vai cair não é convite
  const pool = [];
  for (const liga of LIGAS) {
    if (liga === "serieb-2026" && ligaMinha !== "serieb-2026") continue;
    const clubes = c.clubesDaLiga(save, liga), forcas = clubes.map((id) => [id, c.forcaDoClube(save, id)]).sort((a, b) => b[1] - a[1]);
    forcas.forEach(([id, f], i) => { if (id !== save.clube && !caem.has(id)) pool.push({ id, liga, forca: f, rank: i + 1, total: forcas.length }); });
  }
  const sorte = Motor.sorteDe(`vagas:${save.semente}:${save.temporada}`);
  const cabem = pool.filter((x) => x.forca <= teto && x.forca >= minha - 9).sort((a, b) => a.id.localeCompare(b.id));
  const escolhe = (lista) => (lista.length ? lista.splice(Math.floor(sorte() * lista.length), 1)[0] : null);
  const maiores = cabem.filter((x) => x.forca > minha + 0.4).sort((a, b) => b.forca - a.forca).slice(0, 6);
  const iguais = cabem.filter((x) => Math.abs(x.forca - minha) <= 0.4 || (x.forca <= minha + 0.4 && x.forca > minha - 2));
  const menores = cabem.filter((x) => x.forca <= minha - 2);
  const outraLiga = iguais.filter((x) => x.liga !== ligaMinha);
  const ofertas = [escolhe(maiores), escolhe(outraLiga.length ? outraLiga : iguais), escolhe(menores)].filter(Boolean);
  const unicas = [...new Map(ofertas.map((o) => [o.id, o])).values()].slice(0, MAX_OFERTAS).map((o) => {
    const cl = c.clubeDe(save, o.id);
    return { id: o.id, nome: cl.nome, liga: o.liga, ligaNome: NOME_LIGA[o.liga] || o.liga, forca: arred1(o.forca), delta: arred1(o.forca - minha), tamanho: cl.tamanho || 3,
      caixa: Math.round((save.caixaIA && save.caixaIA[o.id]) ?? c.caixaInicial(save, cl)), projeto: projetoDe(o.rank, o.total, o.liga), rank: o.rank };
  });
  save.vagas = { temporada: save.temporada, ofertas: unicas, escolha: null };
  if (unicas.length) {
    c.avisar(save, { tipo: "mercado-tecnico", icone: "coroa", titulo: unicas.length > 1 ? "Propostas para ser o técnico de outros clubes" : "Um clube quer contratar você",
      texto: `${unicas.map((o) => `${o.nome} (${o.ligaNome})`).join(", ")} ${unicas.length > 1 ? "sondaram" : "sondou"} o seu trabalho. Veja na Sede e decida antes de começar a próxima temporada.` });
    const alvo = unicas[0];
    Feed.postar(save, { tipo: "mercado", perfil: "galeranews", galeranews: true, humor: "mercado", arte: { cena: "aperto", clube: alvo.id }, peso: 2,
      texto: `Mercado de técnicos: o ${alvo.nome} sonda ${save.tecnico && save.tecnico.nome ? save.tecnico.nome : "o treinador do " + c.clubeDe(save, save.clube).nome}${unicas.length > 1 ? `, e não é o único clube na fila` : ""}.` });
  } else {
    c.avisar(save, { tipo: "mercado-tecnico", icone: "sino", titulo: "O telefone não tocou", texto: "Nenhum clube procurou você neste fim de ano. Entregar resultados e mostrar força deixa o mercado mais interessado." });
  }
  return save.vagas;
}

// a escolha do técnico: o id de uma oferta ou "ficar" (pode mudar de ideia até a temporada começar)
function escolher(save, id) {
  const v = save.vagas;
  if (!v || v.temporada !== save.temporada) return "Nenhum clube está esperando a sua resposta.";
  if (!vale(save)) return "A temporada ainda não acabou.";
  if (id !== "ficar" && !v.ofertas.some((o) => o.id === id)) return "Essa proposta não existe mais.";
  v.escolha = id;
  return null;
}

// a mudança de clube, na virada da temporada. Devolve o aviso para a caixa de entrada, ou null se ele ficou.
function aplicar(save, c) {
  const v = save.vagas;
  if (!v || v.temporada !== save.temporada || !v.escolha || v.escolha === "ficar") { if (v && v.temporada === save.temporada && v.ofertas.length && v.escolha === "ficar") return { ficou: true }; return null; }
  const o = v.ofertas.find((x) => x.id === v.escolha); if (!o) return null;
  const velho = save.clube, novo = o.id, cl = c.clubeDe(save, novo), nomeVelho = c.clubeDe(save, velho).nome;
  // o caixa: o clube velho guarda o dele; o novo traz o que tinha
  save.caixaIA = save.caixaIA || {};
  save.caixaIA[velho] = save.caixa; save.caixa = save.caixaIA[novo] ?? c.caixaInicial(save, cl); delete save.caixaIA[novo];
  save.clube = novo;
  Object.assign(save, { aVenda: [], pedidos: {}, compras: {}, valores: {}, parcelas: [], financas: [], posJogo: null, ultimo: null, provocado: null, efeitos: [], eventosVistos: {}, segredos: {},
    indicacoes: {}, meta: null, energia: {}, sequencia: {}, moral: 60, situacao: null, comprasJanela: null, janelasAnteriores: [], entrada: null });
  save.escalacao = { ...save.escalacao, formacao: cl.formacao || save.escalacao.formacao, titulares: null, fixo: false };
  // o técnico leva a reputação, os pontos e as habilidades; o clube (estádio, contratos, base, diretoria) é outro
  const g = Clube.gestaoDe(save), nova = Clube.padrao();
  save.gestao = { ...nova, reputacao: g.reputacao, pontos: g.pontos, habilidades: g.habilidades, preparadores: g.preparadores, confianca: 60,
    legado: { ...nova.legado, hall: g.legado.hall, marcos: g.legado.marcos } };
  const m = Memoria.de(save);
  m.rel = { torcida: 45, imprensa: 55, vestiario: 50 }; m.laco = {}; m.ultimoJogo = null; m.ultimoEco = -9;
  Memoria.registrar(save, `Deixou o ${nomeVelho} para comandar o ${cl.nome}.`, "marco");
  save.vagas = { ...v, aplicada: { de: velho, para: novo } };
  return { mudou: true, de: velho, para: novo, nomeDe: nomeVelho, nomePara: cl.nome };
}

module.exports = { gerar, escolher, aplicar, vale, projetoDe, prestigio, NOME_LIGA, LIGAS };
