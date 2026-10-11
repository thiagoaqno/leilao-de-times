// Modo Jogador: o que acontece no fim de cada temporada fora de campo. Prêmios, seleção, empresário, contrato e as
// propostas de outros clubes (compra e empréstimo). Tudo com semente, para a mesma carreira dar sempre os mesmos resultados.
const C = require("./carreira.js").jogador;
const { Motor } = C;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ID = "eu";
const LIGAS_JOGAVEIS = ["brasileirao-2026", "serieb-2026", "inglaterra-2026", "espanha-2026", "italia-2026", "alemanha-2026", "franca-2026"];
const VAGAS = { GOL: 1, ZAG: 2, LD: 1, LE: 1, VOL: 1, MC: 2, MEI: 1, PE: 1, PD: 1, ATA: 1 };

// ---------- o empresário ----------
// nível: nome, comissão sobre o salário, aumento nas propostas, propostas a mais e a fama de que precisa
const EMPRESARIOS = [
  { nome: "Sem empresário", comissao: 0, salario: 0, extras: 0, fama: 0 },
  { nome: "Agente local", comissao: 0.05, salario: 0.1, extras: 1, fama: 10 },
  { nome: "Empresário experiente", comissao: 0.08, salario: 0.2, extras: 2, fama: 30 },
  { nome: "Superagente", comissao: 0.12, salario: 0.35, extras: 3, fama: 55 },
];

// ---------- o contrato ----------
// salário mensal pela nota e pelo tamanho do clube (clube grande paga mais), com o aumento do empresário
function salarioPara(save, nota, clubeId, nivel) {
  const eu = { ...C.jogadorDe(save, ID), nota };
  const base = require("./public/carreira/mercado.js").salarioDe(eu);
  const c = C.clubeDe(save, clubeId);
  return Math.max(5e3, Math.round(base * (0.55 + 0.17 * c.tamanho) * (1 + EMPRESARIOS[nivel].salario) / 5e3) * 5e3);
}
function contratoInicial(save, clubeId, anos = 2) {
  return { clube: clubeId, fim: Math.min(save.temporadasMax + 3, save.temporada + anos - 1), salario: salarioPara(save, C.notaDe(save, C.jogadorDe(save, ID)), clubeId, 0) };
}

// ---------- a fama ----------
const ganharFama = (j, v) => { j.fama = clamp(Math.round((j.fama || 0) + v), 0, 100); };

// ---------- os prêmios ----------
function premiosDaTemporada(save) {
  const j = save.jogador, t = j.temp, e = C.jogadorDe(save, ID), nota = C.notaDe(save, e), idade = C.Evolucao.idadeNa(e, save.temporada);
  const media = t.jogos ? t.soma / t.jogos : 0, lista = [];
  const clube = C.clubeDe(save, save.clube);
  if (t.jogos >= 20 && media >= 7.2) lista.push({ id: "selecao-liga", nome: "Seleção do campeonato", texto: `Nota média ${media.toFixed(1).replace(".", ",")} em ${t.jogos} jogos.` });
  if (idade <= 21 && t.jogos >= 15 && media >= 6.8) lista.push({ id: "revelacao", nome: "Revelação da temporada", texto: `${idade} anos e ${t.jogos} jogos como protagonista.` });
  const ligaId = C.clubeDeLiga(save.clube, save), gols = C.golsDoMundo(save, Infinity, ligaId);
  const outros = Object.entries(gols).filter(([pid]) => pid !== ID).map(([, n]) => n), maior = outros.length ? Math.max(...outros) : 0;
  if (j.pos !== "GOL" && t.gols >= 8 && t.gols >= maior) lista.push({ id: "artilheiro", nome: "Artilheiro do campeonato", texto: `${t.gols} gols, ${t.gols > maior ? "o maior número" : "empatado no topo"} da liga.` });
  if (nota >= 86 && media >= 7.4 && t.jogos >= 25) lista.push({ id: "bola-ouro", nome: "Bola de Ouro", texto: `O melhor do mundo: nota ${nota}, média ${media.toFixed(1).replace(".", ",")}.` });
  else if (nota >= 82 && media >= 7.2 && t.jogos >= 25) lista.push({ id: "bola-ouro-top3", nome: "Pódio da Bola de Ouro", texto: `Entre os três melhores do mundo: nota ${nota}.` });
  // os títulos do clube nesta temporada (só quem jogou pelo menos 10 jogos conta como campeão)
  if (t.jogos >= 10) for (const c of Object.values(save.competicoes || {})) {
    if (c.campeao === save.clube && c.nome) lista.push({ id: `titulo-${c.nome}`, nome: `Campeão: ${c.nome}`, texto: `Título com o ${clube.nome}.` });
  }
  return lista;
}

// ---------- a seleção ----------
const FORCA_SELECAO = { Brasil: 5, Argentina: 5, França: 5, Inglaterra: 4, Espanha: 5, Alemanha: 4, Itália: 4, Portugal: 4 };
const FASES = ["Fase de grupos", "Oitavas de final", "Quartas de final", "Semifinal", "Vice-campeão", "Campeão"];
// ano par tem torneio: a Copa do Mundo (a cada 4 anos, de 2026) ou a Copa das Nações do ano (Eurocopa/Copa América)
const torneioDe = (ano) => (ano % 2 === 0 ? (ano % 4 === 2 ? "Copa do Mundo" : "Eurocopa e Copa América") : null);
function chamadaDaSelecao(save) {
  const j = save.jogador, t = j.temp, e = C.jogadorDe(save, ID), nota = C.notaDe(save, e), media = t.jogos ? t.soma / t.jogos : 0;
  const forca = FORCA_SELECAO[j.nat] || 3, limiar = 70 + forca * 1.6;
  const score = nota + (t.jogos >= 5 ? (media - 6.5) * 3 : -3) + (t.jogos >= 15 ? 0 : -3) + (j.fama || 0) / 25;
  const r = Motor.sorteDe(`selecao:${save.semente}:${save.temporada}`);
  const convocado = score >= limiar;
  const sel = j.selecao || (j.selecao = { jogos: 0, gols: 0, titulos: 0, historico: [] });
  const info = { ano: save.ano, convocado, torneio: null, fase: null, jogos: 0, gols: 0, limiar: Math.round(limiar), score: Math.round(score) };
  if (!convocado) { sel.historico.push(info); return info; }
  const amistosos = 2 + Math.floor(r() * 4);
  info.jogos = amistosos; info.gols = j.pos === "GOL" ? 0 : Math.floor(r() * (1 + (nota - 60) / 25) * (j.pos === "ATA" ? 1.6 : j.pos === "ZAG" ? 0.3 : 0.8));
  const torneio = torneioDe(save.ano);
  if (torneio) {
    // a força da seleção (e o craque, se for estrela) decide até onde ela vai
    const sorte = r() * 5 + forca * 0.55 + Math.max(0, nota - 75) / 12;
    const fase = clamp(Math.floor((sorte - 2.2) / 1.1), 0, 5);
    info.torneio = torneio; info.fase = FASES[fase];
    const jogosTorneio = [3, 4, 5, 6, 7, 7][fase];
    info.jogos += jogosTorneio; info.gols += j.pos === "GOL" ? 0 : Math.floor(r() * (1 + jogosTorneio / 3) * (j.pos === "ATA" ? 1.3 : 0.7));
    if (fase === 5) sel.titulos++;
  }
  sel.jogos += info.jogos; sel.gols += info.gols; sel.historico.push(info);
  return info;
}

// ---------- as propostas ----------
// quantos titulares o clube escala na posição e a nota do último deles: o "corte" para ser titular
function corteDoClube(save, clubeId, pos) {
  const notas = C.elencoDe(save, clubeId).filter((x) => x.id !== ID && x.pos === pos).map((x) => C.notaDe(save, x)).sort((a, b) => b - a);
  return notas[(VAGAS[pos] || 1) - 1] || 55;
}
const papelPara = (nota, corte) => (nota - corte >= 1 ? "titular" : nota - corte >= -3 ? "rodízio" : "reserva");

function propostasDe(save) {
  const j = save.jogador, e = C.jogadorDe(save, ID), nota = C.notaDe(save, e), nivel = j.empresario || 0, atual = save.clube;
  const r = Motor.sorteDe(`propostas:${save.semente}:${save.temporada}`);
  const pai = j.emprestimo ? j.emprestimo.de : atual;
  const teto = clamp(1 + (nota - 58) / 5 + (j.fama || 0) / 35 + nivel * 0.5, 1, 5.4);
  const candidatos = [];
  for (const liga of LIGAS_JOGAVEIS) for (const id of C.clubesDaLiga(save, liga)) {
    if (id === atual) continue;
    const c = C.clubeDe(save, id), corte = corteDoClube(save, id, j.pos), papel = papelPara(nota, corte);
    if (c.tamanho > teto) continue;
    // clube grande só chama quem dá para ser reserva de luxo; o resto chama para jogar
    const interesse = (papel === "titular" ? 3 : papel === "rodízio" ? 1.5 : 0) + c.tamanho * 0.8 + r() * 2;
    candidatos.push({ id, c, corte, papel, interesse });
  }
  candidatos.sort((a, b) => b.interesse - a.interesse);
  const quantas = 2 + EMPRESARIOS[nivel].extras;
  const escolhidos = [];
  const usados = new Set();
  // garante pelo menos um clube onde dá para jogar (a saída para quem está preso no banco)
  const jogar = candidatos.filter((x) => x.papel !== "reserva").sort((a, b) => b.c.tamanho - a.c.tamanho)[0];
  if (jogar) { escolhidos.push(jogar); usados.add(jogar.id); }
  for (const x of candidatos) { if (escolhidos.length >= quantas) break; if (!usados.has(x.id)) { escolhidos.push(x); usados.add(x.id); } }
  // sem nenhuma proposta (nota baixa), um clube pequeno sempre aceita
  if (!escolhidos.length) for (const x of Object.values(candidatos).slice(-2)) escolhidos.push(x);
  const tamAtual = C.clubeDe(save, atual).tamanho;
  return escolhidos.map((x, i) => {
    // o jogador "preso" no banco do clube de origem pode ser emprestado; quem está bem é comprado
    const emprestimo = x.papel !== "reserva" && x.c.tamanho <= tamAtual && j.papelFinal === "banco";
    const anos = emprestimo ? 1 : 2 + Math.floor(r() * 3);
    return { id: `${x.id}:${i}`, clube: x.id, tipo: emprestimo ? "emprestimo" : "compra", papel: x.papel, corte: x.corte, anos,
      salario: emprestimo ? ((j.contrato && j.contrato.salario) || salarioPara(save, nota, pai, nivel)) : salarioPara(save, nota, x.id, nivel) };
  });
}
function renovacaoDe(save) {
  const j = save.jogador, e = C.jogadorDe(save, ID), nota = C.notaDe(save, e), nivel = j.empresario || 0;
  const pai = j.emprestimo ? j.emprestimo.de : save.clube;
  return [2, 3].map((anos) => ({ id: `renovar:${anos}`, clube: pai, anos, salario: Math.round(salarioPara(save, nota, pai, nivel) * (anos === 2 ? 1.1 : 1.0) / 5e3) * 5e3 }));
}

// o que o clube que está de saída diz do jogador: volta a ser usado no resumo da temporada
function mercadoDoFim(save) {
  const j = save.jogador, c = j.contrato;
  const venceu = !c || c.fim <= save.temporada;
  const noEmprestimo = !!j.emprestimo;
  const pai = noEmprestimo ? j.emprestimo.de : save.clube;
  // o contrato do clube de origem ainda vale?
  const origemValida = noEmprestimo ? c && c.fim > save.temporada : !venceu;
  return { precisaEscolher: !origemValida, noEmprestimo, pai, ofertas: propostasDe(save), renovacao: renovacaoDe(save), escolha: null };
}

module.exports = { EMPRESARIOS, FASES, salarioPara, contratoInicial, ganharFama, premiosDaTemporada, chamadaDaSelecao, mercadoDoFim, propostasDe, renovacaoDe, torneioDe };
