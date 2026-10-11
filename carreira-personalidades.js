// Carreira de Treinador: os eventos da PERSONALIDADE dos jogadores (public/carreira/personalidade.js). Cada evento mira um tipo
// (`alvo: "p:lider"`...), no formato do catálogo, e a resposta mexe no jogo pelas mesmas ajudas de `x` (carreira-eventos.js).
// Sorteados em `gerarEventos`: no máximo um a cada 3 rodadas, cada um uma vez por temporada.
const r5 = (v) => Math.round(v / 5e4) * 5e4;
const mil = 1e3;

const PERSONALIDADES = [
  // ---------------- líder ----------------
  { id: "pers-lider-conversa", grupo: "vestiario", icone: "coroa", alvo: "p:lider", quando: (x) => x.derrotas >= 1,
    titulo: (x) => `${x.n} quer falar com o grupo`, texto: (x) => `Depois do tropeço, ${x.n} pediu a palavra no vestiário antes do treino. O elenco o respeita.`,
    opcoes: [["palavra", "Dar a palavra a ele", (x) => { x.moral(5); x.vestiario(4); x.retribuir(); return `${x.n} fez um discurso que arrepiou o grupo. A moral subiu.`; }],
      ["voce", "Falar você mesmo", (x) => { x.moral(2); x.vestiario(-2); return `O grupo ouviu, mas ${x.n} saiu se sentindo desautorizado.`; }]], padrao: "palavra" },
  { id: "pers-lider-diretoria", grupo: "vestiario", icone: "coroa", alvo: "p:lider", quando: (x) => x.m.rel.vestiario >= 50,
    titulo: (x) => `${x.n} cobra a diretoria`, texto: (x) => `${x.n} falou à imprensa que o elenco precisa de reforços. A diretoria não gostou da exposição.`,
    opcoes: [["apoiar", "Apoiar o capitão do vestiário", (x) => { x.vestiario(5); x.confianca(-4); x.torcida(2); return "O grupo fechou com você, mas a diretoria anotou."; }],
      ["segurar", "Pedir cautela a ele", (x) => { x.confianca(2); x.vestiario(-3); return `${x.n} engoliu a frase, mas o vestiário ouviu o seu recado.`; }]], padrao: "segurar" },

  // ---------------- profissional ----------------
  { id: "pers-profissional-base", grupo: "vestiario", icone: "prancheta", alvo: "p:profissional", quando: (x) => true,
    titulo: (x) => `${x.n} quer apadrinhar a base`, texto: (x) => `${x.n} se ofereceu para treinar com os garotos depois do treino e ensinar a rotina de um profissional.`,
    opcoes: [["aceitar", "Aceitar a ideia", (x) => { x.evoluirReserva(1); x.jogador(-1, 1); x.vestiario(2); return `Um reserva evoluiu com a mentoria. ${x.n} chegou um pouco mais cansado ao jogo seguinte.`; }],
      ["poupar", "Pedir que se poupe", (x) => { x.jogador(2, 3); return `${x.n} cuidou do corpo e rende mais nos próximos jogos.`; }]], padrao: "aceitar" },
  { id: "pers-profissional-contrato", grupo: "vestiario", icone: "moeda", alvo: "p:profissional", quando: (x) => true,
    titulo: (x) => `${x.n} oferece abrir mão de luvas`, texto: (x) => `Num papo sincero, ${x.n} disse que topa renovar sem pedir nada a mais: só quer ser tratado como parte do projeto.`,
    opcoes: [["valorizar", "Reconhecer com um aumento mesmo assim", (x) => { x.salario(1.08); x.moral(3); x.retribuir(); return `${x.n} ficou tocado com o gesto. O vestiário viu.`; }],
      ["economizar", "Agradecer e economizar", (x) => { x.caixa(`Economia na renovação de ${x.n}`, r5(120 * mil * x.T)); return "O caixa agradece, e ele nem reclamou."; }]], padrao: "economizar" },

  // ---------------- pavio curto ----------------
  { id: "pers-pavio-expulsao", grupo: "vestiario", icone: "explosao", alvo: "p:pavio", quando: (x) => x.derrotas >= 1,
    titulo: (x) => `${x.n} perdeu a cabeça`, texto: (x) => `Depois da derrota, ${x.n} discutiu com o árbitro no túnel e provocou o rival na saída de campo. O vídeo está circulando.`,
    opcoes: [["multar", "Multar e dar uma bronca", (x) => { x.caixa(`Multa de ${x.n}`, -r5(x.salarioAtual * 0.3)); x.imprensa(1); x.moral(-1); return "A multa foi paga, e a imprensa viu a postura firme."; }],
      ["psicologo", "Mandar ao psicólogo do clube", (x) => { x.caixa("Acompanhamento psicológico", -r5(60 * mil * x.T)); x.jogador(3, 4); return `${x.n} ficou mais calmo e rende melhor nos próximos jogos.`; }],
      ["passar", "Defender o jogador em público", (x) => { x.vestiario(3); x.imprensa(-3); if (x.sorte(0.5)) x.suspender(1); return "O grupo gostou do apoio, a imprensa criticou, e ele pode levar a punição."; }]], padrao: "multar" },
  { id: "pers-pavio-briga", grupo: "vestiario", icone: "explosao", alvo: "p:pavio", quando: (x) => true,
    titulo: (x) => `${x.n} se desentende no rachão`, texto: (x) => `${x.n} acertou um companheiro numa dividida mais forte e a coisa esquentou no treino.`,
    opcoes: [["separar", "Separar e conversar com os dois", (x) => { x.moral(1); x.vestiario(1); return "Passou. O clima voltou ao normal."; }],
      ["afastar", "Afastá-lo por uma rodada", (x) => { x.suspender(1); x.vestiario(3); x.moral(1); return `${x.n} fica fora de um jogo e o grupo entendeu o limite.`; }],
      ["deixar", "Deixar o time resolver", (x) => { x.time(-1, 2); return "A tensão ficou no ar e o time rende menos por 2 jogos."; }]], padrao: "separar" },

  // ---------------- vaidoso ----------------
  { id: "pers-vaidoso-status", grupo: "vestiario", icone: "estrela", alvo: "p:vaidoso", quando: (x) => true,
    titulo: (x) => `${x.n} quer ser a estrela`, texto: (x) => `${x.n} reclamou que a imprensa dá mais espaço aos outros e pediu cobranças de falta e pênalti.`,
    opcoes: [["dar", "Dar o status que ele pede", (x) => { x.jogador(4, 4); x.vestiario(-3); return `${x.n} vai jogar com a bola nos pés, mas o grupo estranhou.`; }],
      ["coletivo", "Lembrar que o time vem antes", (x) => { x.vestiario(3); x.jogador(-2, 2); return "O grupo gostou. Ele fechou a cara por uns dias."; }],
      ["ego", "Cuidar do ego com um camarote para a família", (x) => { x.caixa("Camarote para a família", -r5(90 * mil * x.T)); x.jogador(2, 3); return `${x.n} se sentiu valorizado e rende mais.`; }]], padrao: "coletivo" },
  { id: "pers-vaidoso-banco", grupo: "vestiario", icone: "estrela", alvo: "p:vaidoso", quando: (x) => true,
    titulo: (x) => `${x.n} publicou um desabafo`, texto: (x) => `${x.n} postou nas redes que "merece mais respeito" e marcou o treinador. A torcida está dividida.`,
    opcoes: [["responder", "Responder em coletiva", (x) => { x.imprensa(2); x.vestiario(-2); x.jogador(-2, 2); return "A coletiva rendeu manchete, mas o clima com ele azedou."; }],
      ["conversa", "Chamar para uma conversa reservada", (x) => { x.jogador(3, 3); x.retribuir(); return `${x.n} baixou a bola e voltou aos treinos com outro ânimo.`; }],
      ["ignorar", "Ignorar", (x) => { x.torcida(-2); x.vestiario(-1); return "O assunto ficou esquentando o fim de semana."; }]], padrao: "conversa" },

  // ---------------- festeiro ----------------
  { id: "pers-festeiro-aniversario", grupo: "vestiario", icone: "drink", alvo: "p:festeiro", quando: (x) => true,
    titulo: (x) => `Aniversário de ${x.n}`, texto: (x) => `${x.n} convidou o elenco inteiro para a festa dele na véspera de folga. A casa vai ser pequena.`,
    opcoes: [["ir", "Ir junto, com hora para acabar", (x) => { x.vestiario(5); x.moral(3); x.retribuir(); return "A festa uniu o grupo, e o técnico foi o primeiro a ir embora."; }],
      ["pagar", "Pagar o churrasco no CT", (x) => { x.caixa("Churrasco de aniversário", -r5(70 * mil * x.T)); x.moral(4); return "Churrasco no CT, sem sair de casa. O elenco adorou."; }],
      ["proibir", "Pedir que adie", (x) => { x.moral(-3); x.vestiario(-2); return "O grupo achou exagero. Festa adiada, ânimo também."; }]], padrao: "pagar" },
  { id: "pers-festeiro-flagra", grupo: "vestiario", icone: "drink", alvo: "p:festeiro", quando: (x) => x.derrotas >= 1,
    titulo: (x) => `${x.n} aparece na balada`, texto: (x) => `Fotos de ${x.n} numa casa noturna dois dias depois da derrota viraram assunto na torcida.`,
    opcoes: [["multar", "Multar e cobrar", (x) => { x.caixa(`Multa de ${x.n}`, -r5(x.salarioAtual * 0.35)); x.torcida(2); x.moral(-1); return "A torcida aprovou a multa."; }],
      ["conversa", "Conversar e combinar regras", (x) => { x.jogador(2, 3); return `${x.n} prometeu maneirar e voltou concentrado.`; }],
      ["relevar", "Relevar: ele sempre foi assim", (x) => { x.torcida(-3); x.moral(1); return "A torcida cobrou postura, e o grupo ficou aliviado."; }]], padrao: "conversa" },

  // ---------------- guerreiro ----------------
  { id: "pers-guerreiro-dor", grupo: "vestiario", icone: "escudo", alvo: "p:guerreiro", quando: (x) => true,
    titulo: (x) => `${x.n} quer jogar com dor`, texto: (x) => `${x.n} sentiu a coxa no treino, mas jura que está bem e pede para entrar no próximo jogo.`,
    opcoes: [["jogar", "Deixar jogar", (x) => { x.jogador(3, 1); if (x.sorte(0.35)) { x.lesao(3); return `${x.n} se machucou de verdade e vai ficar 3 jogos fora.`; } return `${x.n} jogou no sacrifício e foi bem.`; }],
      ["poupar", "Poupar por precaução", (x) => { x.suspender(1); x.moral(1); return `${x.n} ficou irritado por não jogar, mas voltou inteiro.`; }]], padrao: "poupar" },
  { id: "pers-guerreiro-exemplo", grupo: "vestiario", icone: "escudo", alvo: "p:guerreiro", quando: (x) => x.derrotas >= 1,
    titulo: (x) => `${x.n} chega primeiro ao CT`, texto: (x) => `Depois da derrota, ${x.n} foi o primeiro a chegar e o último a sair. O grupo percebeu.`,
    opcoes: [["destacar", "Citar o exemplo ao grupo", (x) => { x.moral(4); x.vestiario(3); x.evoluir(1); return `${x.n} cresceu com o reconhecimento. O grupo reagiu.`; }],
      ["descanso", "Mandar descansar", (x) => { x.jogador(2, 2); return "Ele obedeceu a contragosto, mas volta mais inteiro."; }]], padrao: "destacar" },

  // ---------------- reservado ----------------
  { id: "pers-reservado-sumido", grupo: "vestiario", icone: "silencio", alvo: "p:reservado", quando: (x) => true,
    titulo: (x) => `${x.n} está calado demais`, texto: (x) => `${x.n} quase não fala com ninguém no CT, e o preparador acha que ele não está à vontade.`,
    opcoes: [["conversa", "Conversar a sós", (x) => { x.jogador(3, 4); x.retribuir(); return `${x.n} se abriu. Está mais solto e rende melhor.`; }],
      ["dupla", "Juntar com um veterano", (x) => { x.jogador(2, 3); x.vestiario(2); return "A dupla funcionou, e ele ganhou um amigo no grupo."; }],
      ["ignorar", "Deixar ele no tempo dele", (x) => { x.jogador(-2, 3); return `${x.n} se isolou ainda mais e rende abaixo.`; }]], padrao: "conversa" },
  { id: "pers-reservado-surpresa", grupo: "vestiario", icone: "silencio", alvo: "p:reservado", quando: (x) => true,
    titulo: (x) => `${x.n} pede uma conversa`, texto: (x) => `Quase sem falar, ${x.n} pediu para ter uma conversa com você: acha que merece mais minutos.`,
    opcoes: [["promessa", "Prometer mais chances", (x) => { x.jogador(3, 3); return `${x.n} saiu da sala diferente: sorriu pela primeira vez em semanas.`; }],
      ["sincero", "Ser sincero sobre o momento dele", (x) => { x.evoluir(1); return `${x.n} entendeu e promete trabalhar mais: evoluiu um ponto.`; }]], padrao: "sincero" },
];

// qual (se algum) cabe agora: no máximo um a cada 3 rodadas, cada um uma vez por temporada
function escolher(save, x, m, r) {
  if (save.rodada < (m.ultimaPers ?? -9) + 3) return null;
  const vistos = save.eventosVistos || {};
  const possiveis = PERSONALIDADES.filter((d) => vistos[d.id] !== save.temporada && (!d.quando || d.quando(x)));
  if (!possiveis.length || r() > 0.35) return null;
  return possiveis[Math.floor(r() * possiveis.length)];
}

module.exports = { PERSONALIDADES, escolher };
