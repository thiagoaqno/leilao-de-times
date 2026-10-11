// Carreira de Treinador: a PRESSÃO em volta do time. A coletiva depois do jogo, a torcida cobrando (ou abraçando) e o clima do
// estádio, que mexe na nota de quem joga. Os eventos têm a mesma forma do catálogo (carreira-catalogo.js) e das ecos
// (carreira-memoria.js): `quando(x, m)` diz se cabem agora, `opcoes` mexem no jogo pelas mesmas ajudas de `x`.
// `m.ultimoJogo` (gravado por Memoria.aposJogo) diz como foi o último jogo: { res: V|E|D, nos, eles, emCasa, classico, adv, rodada }.
const Rivais = require("./public/carreira/rivais.js");

const r5 = (v) => Math.round(v / 5e4) * 5e4;

// ---------- as coletivas: a pergunta nasce do que acabou de acontecer ----------
const COLETIVAS = [
  { id: "coletiva-goleada", grupo: "imprensa", icone: "microfone", quando: (x, m) => m.ultimoJogo && m.ultimoJogo.eles - m.ultimoJogo.nos >= 3,
    titulo: "Coletiva depois da goleada", texto: (x) => `${x.m.ultimoJogo.nos} × ${x.m.ultimoJogo.eles} para o ${x.m.ultimoJogo.adv}. A sala de imprensa está lotada e a primeira pergunta é se você continua no cargo.`,
    opcoes: [["assumir", "Assumir a culpa", (x) => { x.imprensa(4); x.vestiario(4); x.torcida(1); x.confianca(-1); return "Você pegou o erro para si. O elenco agradeceu, a imprensa respeitou a postura."; }],
      ["cobrar", "Cobrar o elenco em público", (x) => { x.imprensa(2); x.vestiario(-6); x.time(2, 2); x.moral(-2); return "A cobrança pública virou manchete. O grupo sentiu, mas entrou mais ligado."; }],
      ["arbitragem", "Reclamar da arbitragem", (x) => { x.imprensa(-4); x.torcida(1); x.vestiario(2); x.caixa("Multa por declaração", -r5(60e3 * x.T)); return "Ninguém acreditou na desculpa: o jogo foi 'arbitrado' pelo placar. Multa pela declaração."; }]], padrao: "assumir" },
  { id: "coletiva-derrota", grupo: "imprensa", icone: "microfone", quando: (x, m) => m.ultimoJogo && m.ultimoJogo.res === "D" && m.ultimoJogo.eles - m.ultimoJogo.nos < 3,
    titulo: "Coletiva depois da derrota", texto: (x) => `Derrota por ${x.m.ultimoJogo.nos} × ${x.m.ultimoJogo.eles} para o ${x.m.ultimoJogo.adv}. Os repórteres querem saber o que deu errado.`,
    opcoes: [["analise", "Explicar o que faltou, com calma", (x) => { x.imprensa(3); x.torcida(1); return "Análise serena. Os jornais registraram a postura de quem sabe o que está fazendo."; }],
      ["elogiar", "Elogiar o adversário", (x) => { x.imprensa(2); x.vestiario(2); x.moral(1); return "Você reconheceu a vitória do rival sem esconder os erros do time."; }],
      ["cobrar", "Dizer que faltou vontade", (x) => { x.time(2, 1); x.vestiario(-4); x.torcida(2); x.moral(-1); return "A torcida adorou a cobrança, o vestiário nem tanto. O time promete reagir."; }],
      ["fugir", "Responder só o essencial", (x) => { x.imprensa(-3); return "Respostas curtas e cara fechada. A imprensa estranhou o silêncio."; }]], padrao: "analise" },
  { id: "coletiva-classico", grupo: "imprensa", icone: "espadas", quando: (x, m) => m.ultimoJogo && m.ultimoJogo.classico && m.ultimoJogo.res === "V",
    titulo: "Vitória no clássico: o que dizer?", texto: (x) => `O ${x.m.ultimoJogo.adv} ficou para trás e a torcida está em festa. O microfone está aberto.`,
    opcoes: [["provocar", "Provocar o rival", (x) => { x.torcida(4); x.imprensa(1); x.moral(3); x.rival(1); return "A torcida foi à loucura. O rival vai lembrar disso no próximo encontro."; }],
      ["respeito", "Respeitar o rival", (x) => { x.imprensa(3); x.torcida(1); x.confianca(1); return "Classe de campeão. Bom para a imagem, menos para a festa."; }],
      ["torcida", "Dedicar à torcida", (x) => { x.torcida(5); x.vestiario(2); return "A dedicatória viralizou. A arquibancada está com você."; }]], padrao: "respeito" },
  { id: "coletiva-sequencia", grupo: "imprensa", icone: "microfone", quando: (x, m) => x.vitorias >= 3,
    titulo: "O time embalou: vai sonhar alto?", texto: () => "Três vitórias seguidas. Perguntam se o título já é meta do clube.",
    opcoes: [["pes", "Pés no chão: um jogo de cada vez", (x) => { x.imprensa(2); x.vestiario(3); x.confianca(1); return "Discurso de quem não deixa o sucesso subir à cabeça."; }],
      ["sonhar", "Sim, vamos brigar pelo título!", (x) => { x.torcida(4); x.moral(3); x.confianca(-2); x.imprensa(-1); return "A torcida sonhou junto. Agora a cobrança também aumentou."; }]], padrao: "pes" },
  { id: "coletiva-emprego", grupo: "imprensa", icone: "microfone", quando: (x, m) => x.save.gestao && x.save.gestao.confianca <= 45 && x.derrotas >= 2,
    titulo: "Perguntam sobre o seu emprego", texto: () => "Com a diretoria desconfiada e os resultados ruins, a pergunta é direta: você segue como técnico?",
    opcoes: [["confiar", "Dizer que tem a confiança da diretoria", (x) => { x.confianca(-2); x.imprensa(2); return "A diretoria não gostou de ser usada no discurso, mas a imprensa registrou a firmeza."; }],
      ["trabalho", "Falar só do trabalho", (x) => { x.imprensa(1); x.vestiario(2); return "Você desviou da pergunta e voltou ao campo."; }],
      ["recado", "Mandar um recado para a diretoria", (x) => { x.confianca(-4); x.imprensa(3); x.vestiario(3); return "O recado foi lido nos dois lados. O vestiário gostou, a diretoria nem tanto."; }]], padrao: "trabalho" },
  { id: "coletiva-craque", grupo: "imprensa", icone: "microfone", alvo: "craque", quando: (x, m) => m.ultimoJogo && m.ultimoJogo.res !== "D" && x.save.rodada >= 4,
    titulo: (x) => `Perguntam se ${x.n} vai sair`, texto: (x) => `Um repórter garante que há clubes na fila por ${x.n}. A pergunta veio na frente de todo mundo.`,
    opcoes: [["fica", "Garantir que ele fica", (x) => { x.jogador(2, 3); x.torcida(2); x.imprensa(1); return `${x.n} ouviu a declaração e jogou mais solto. Agora vai ter que cumprir o que disse.`; }],
      ["cabe", "Dizer que tudo depende do clube", (x) => { x.imprensa(2); x.jogador(-1, 2); return `Resposta diplomática. ${x.n} achou que você não bancou o suficiente.`; }],
      ["nada", "Cortar: não falo de mercado", (x) => { x.imprensa(-2); return "Resposta seca. O assunto morreu, mas a imprensa ficou de cara fechada."; }]], padrao: "cabe" },
];

// ---------- a torcida: cobra quando o time vai mal, abraça quando vai bem ----------
const TORCIDA = [
  { id: "torcida-reuniao", grupo: "torcida", icone: "alerta", quando: (x, m) => m.rel.torcida <= 38 && x.derrotas >= 2,
    titulo: "A organizada pede uma reunião", texto: () => "Representantes das torcidas organizadas esperam no portão do CT. Dizem que a paciência acabou.",
    opcoes: [["receber", "Receber e ouvir a torcida", (x) => { x.torcida(5); x.vestiario(-2); x.moral(1); return "A conversa foi dura, mas a torcida saiu sabendo que você escuta."; }],
      ["blindar", "Blindar o elenco e não receber", (x) => { x.vestiario(4); x.torcida(-4); x.moral(-1); return "Você protegeu o grupo, e a torcida tomou isso como desprezo."; }],
      ["jogadores", "Mandar um capitão conversar", (x) => { x.torcida(2); x.vestiario(1); x.time(1, 2); return "O capitão assumiu o discurso. A pressão diminuiu e o time sentiu a responsabilidade."; }]], padrao: "jogadores" },
  { id: "torcida-faixas", grupo: "torcida", icone: "alerta", quando: (x, m) => m.rel.torcida <= 30 && m.ultimoJogo && m.ultimoJogo.emCasa && m.ultimoJogo.res === "D",
    titulo: "Faixas contra você no estádio", texto: () => "Depois da derrota em casa, a arquibancada abriu faixas pedindo a sua saída.",
    opcoes: [["resposta", "Responder com trabalho", (x) => { x.confianca(-1); x.vestiario(3); x.time(1, 3); return "Você não respondeu a ninguém e puxou o time para dentro. O grupo gostou."; }],
      ["diretoria", "Pedir apoio público da diretoria", (x) => { x.confianca(-2); x.imprensa(2); x.torcida(-2); return "O apoio saiu, mas a diretoria passou a te cobrar mais."; }],
      ["ignorar", "Fingir que não viu", (x) => { x.torcida(-3); x.moral(-2); return "Ignorar não funcionou: as faixas viraram assunto no vestiário."; }]], padrao: "resposta" },
  { id: "torcida-festa", grupo: "torcida", icone: "palmas", quando: (x, m) => m.rel.torcida >= 75 && x.vitorias >= 2,
    titulo: "A torcida faz festa no CT", texto: () => "Com a fase boa, a torcida lotou a saída do treino com bandeiras e cantos.",
    opcoes: [["abracar", "Descer e agradecer", (x) => { x.torcida(3); x.moral(4); x.vestiario(2); return "Selfies e abraços. O elenco treinou no clima de final."; }],
      ["foco", "Pedir foco: ainda não ganhou nada", (x) => { x.vestiario(3); x.confianca(1); return "Você segurou a euforia. O elenco entendeu o recado."; }]], padrao: "abracar" },
];

const TODAS = [...COLETIVAS, ...TORCIDA];

// qual (se algum) cabe agora: no máximo um a cada 2 rodadas, e cada um uma vez por temporada
function escolher(save, x, m, r) {
  if (!m.ultimoJogo || m.ultimoJogo.rodada < save.rodada - 1) return null; // só logo depois do jogo
  if (save.rodada < (m.ultimaPressao || -9) + 2) return null;
  const vistos = save.eventosVistos || {};
  m.rodadaAtual = save.rodada;
  const possiveis = TODAS.filter((d) => vistos[d.id] !== save.temporada && d.quando(x, m));
  if (!possiveis.length) return null;
  // a torcida e o emprego em jogo pesam mais que a coletiva de rotina
  possiveis.sort((a, b) => (TORCIDA.includes(b) ? 1 : 0) - (TORCIDA.includes(a) ? 1 : 0));
  const grave = m.ultimoJogo.res === "D" || m.ultimoJogo.classico || possiveis.some((d) => TORCIDA.includes(d));
  if (!grave && r() > 0.35) return null;
  return possiveis[0];
}

// o clima do estádio no jogo: a torcida empolga ou vaia quem joga em casa, e fora o time enfrenta o ambiente do rival.
// Devolve { nota, texto } (nota: -1, 0 ou 1, somada à nota do time no jogo).
function climaDoJogo(save, c, casa, fora) {
  const m = save.memoria && save.memoria.rel ? save.memoria : null, tor = m ? m.rel.torcida : 50;
  if (casa === save.clube) {
    if (tor >= 75) return { nota: 1, texto: "O estádio vai lotar e empurrar o time: +1 na nota." };
    if (tor <= 30) return { nota: -1, texto: "A torcida está de cara fechada e pode vaiar: -1 na nota." };
    return { nota: 0, texto: "" };
  }
  const adv = c.clubeDe(save, casa), classico = !!Rivais.classico(save.clube, casa);
  if (!adv || !(classico || adv.tamanho >= 4)) return { nota: 0, texto: "" };
  if (tor >= 70) return { nota: 0, texto: `Ambiente quente no ${adv.estadio}, mas a sua torcida vai junto e segura o clima.` };
  return { nota: -1, texto: `A torcida do ${adv.nome} vai pressionar no ${adv.estadio}: -1 na nota.` };
}

module.exports = { COLETIVAS, TORCIDA, TODAS, escolher, climaDoJogo };
