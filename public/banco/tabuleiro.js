// Banco da Galera — tabuleiro, cartas, eventos e contas de aluguel.
// Usado pelo servidor (banco.js) e pelo navegador (public/banco/index.html), para os dois
// fazerem exatamente a mesma conta.
(function (root) {

// Grupos de cor: nome, cor, cor do texto por cima e custo de cada casa.
const GROUPS = {
  marrom:   { name: "Centro Velho",       color: "#8a5a3b", ink: "#fff", house: 50 },
  celeste:  { name: "Zona Leste",         color: "#7cc7e8", ink: "#0d2b3a", house: 50 },
  rosa:     { name: "Região Central",     color: "#d9468f", ink: "#fff", house: 100 },
  laranja:  { name: "Zona Norte e Oeste", color: "#f08a24", ink: "#2b1600", house: 100 },
  vermelho: { name: "Boemia",             color: "#e0352b", ink: "#fff", house: 150 },
  amarelo:  { name: "Zona Sul",           color: "#f3c623", ink: "#2b2200", house: 150 },
  verde:    { name: "Centro Financeiro",  color: "#1f9d55", ink: "#fff", house: 200 },
  azul:     { name: "Endereços Nobres",   color: "#1c4fb8", ink: "#fff", house: 200 },
};

// type: go | prop | air (aeroporto) | util (companhia) | tax | card | jail | free | gojail
// rent (prop): [sem casa, 1, 2, 3, 4 casas, hotel]. Valores em milhares de reais.
const P = (name, group, price, rent) => ({ type: "prop", name, group, price, rent });
const A = (name) => ({ type: "air", name, price: 200 });
const U = (name, icon) => ({ type: "util", name, icon, price: 150 });
const CARD = { type: "card", name: "Sorte ou Revés" };

// Tabuleiro normal: 40 casas (10 por lado), para até 6 jogadores.
const NORMAL = [
  { type: "go", name: "Início" },
  P("Rua 25 de Março", "marrom", 60, [2, 10, 30, 90, 160, 250]),
  CARD,
  P("Brás", "marrom", 60, [4, 20, 60, 180, 320, 450]),
  { type: "tax", name: "Imposto de Renda", amount: 200 },
  A("Aeroporto de Congonhas"),
  P("Mooca", "celeste", 100, [6, 30, 90, 270, 400, 550]),
  CARD,
  P("Penha", "celeste", 100, [6, 30, 90, 270, 400, 550]),
  P("Tatuapé", "celeste", 120, [8, 40, 100, 300, 450, 600]),
  { type: "jail", name: "Prisão" },
  P("Liberdade", "rosa", 140, [10, 50, 150, 450, 625, 750]),
  U("Companhia de Luz", "💡"),
  P("Bela Vista", "rosa", 140, [10, 50, 150, 450, 625, 750]),
  P("Consolação", "rosa", 160, [12, 60, 180, 500, 700, 900]),
  A("Aeroporto de Guarulhos"),
  P("Santana", "laranja", 180, [14, 70, 200, 550, 750, 950]),
  CARD,
  P("Lapa", "laranja", 180, [14, 70, 200, 550, 750, 950]),
  P("Pompeia", "laranja", 200, [16, 80, 220, 600, 800, 1000]),
  { type: "free", name: "Férias" },
  P("Vila Madalena", "vermelho", 220, [18, 90, 250, 700, 875, 1050]),
  CARD,
  P("Pinheiros", "vermelho", 220, [18, 90, 250, 700, 875, 1050]),
  P("Rua Augusta", "vermelho", 240, [20, 100, 300, 750, 925, 1100]),
  A("Aeroporto de Viracopos"),
  P("Vila Mariana", "amarelo", 260, [22, 110, 330, 800, 975, 1150]),
  P("Moema", "amarelo", 260, [22, 110, 330, 800, 975, 1150]),
  U("Companhia de Água", "🚰"),
  P("Ibirapuera", "amarelo", 280, [24, 120, 360, 850, 1025, 1200]),
  { type: "gojail", name: "Vá para a prisão" },
  P("Itaim Bibi", "verde", 300, [26, 130, 390, 900, 1100, 1275]),
  P("Vila Olímpia", "verde", 300, [26, 130, 390, 900, 1100, 1275]),
  CARD,
  P("Avenida Faria Lima", "verde", 320, [28, 150, 450, 1000, 1200, 1400]),
  A("Aeroporto Campo de Marte"),
  CARD,
  P("Rua Oscar Freire", "azul", 350, [35, 175, 500, 1100, 1300, 1500]),
  { type: "tax", name: "Taxa de Luxo", amount: 100 },
  P("Avenida Paulista", "azul", 400, [50, 200, 600, 1400, 1700, 2000]),
];

// Tabuleiro grande: 52 casas (13 por lado), mais bairros e cores com 4 cidades, para até 8 jogadores.
const GRANDE = [
  { type: "go", name: "Início" },
  P("Rua 25 de Março", "marrom", 60, [2, 10, 30, 90, 160, 250]),
  CARD,
  P("Brás", "marrom", 60, [4, 20, 60, 180, 320, 450]),
  P("Bom Retiro", "marrom", 80, [6, 30, 90, 270, 400, 550]),
  { type: "tax", name: "Imposto de Renda", amount: 200 },
  A("Aeroporto de Congonhas"),
  P("Mooca", "celeste", 100, [6, 30, 90, 270, 400, 550]),
  CARD,
  P("Penha", "celeste", 100, [6, 30, 90, 270, 400, 550]),
  P("Tatuapé", "celeste", 120, [8, 40, 100, 300, 450, 600]),
  P("Jardim Anália Franco", "celeste", 120, [8, 40, 100, 300, 450, 600]),
  U("Companhia de Luz", "💡"),
  { type: "jail", name: "Prisão" },
  P("Liberdade", "rosa", 140, [10, 50, 150, 450, 625, 750]),
  P("Bela Vista", "rosa", 140, [10, 50, 150, 450, 625, 750]),
  CARD,
  P("Consolação", "rosa", 160, [12, 60, 180, 500, 700, 900]),
  P("Higienópolis", "rosa", 160, [12, 60, 180, 500, 700, 900]),
  A("Aeroporto de Guarulhos"),
  P("Santana", "laranja", 180, [14, 70, 200, 550, 750, 950]),
  P("Lapa", "laranja", 180, [14, 70, 200, 550, 750, 950]),
  { type: "tax", name: "IPVA", amount: 150 },
  P("Pompeia", "laranja", 200, [16, 80, 220, 600, 800, 1000]),
  P("Perdizes", "laranja", 200, [16, 80, 220, 600, 800, 1000]),
  CARD,
  { type: "free", name: "Férias" },
  P("Vila Madalena", "vermelho", 220, [18, 90, 250, 700, 875, 1050]),
  P("Pinheiros", "vermelho", 220, [18, 90, 250, 700, 875, 1050]),
  CARD,
  P("Rua Augusta", "vermelho", 240, [20, 100, 300, 750, 925, 1100]),
  P("Barra Funda", "vermelho", 240, [20, 100, 300, 750, 925, 1100]),
  A("Aeroporto de Viracopos"),
  P("Vila Mariana", "amarelo", 260, [22, 110, 330, 800, 975, 1150]),
  P("Moema", "amarelo", 260, [22, 110, 330, 800, 975, 1150]),
  U("Companhia de Água", "🚰"),
  P("Ibirapuera", "amarelo", 280, [24, 120, 360, 850, 1025, 1200]),
  P("Brooklin", "amarelo", 280, [24, 120, 360, 850, 1025, 1200]),
  CARD,
  { type: "gojail", name: "Vá para a prisão" },
  P("Itaim Bibi", "verde", 300, [26, 130, 390, 900, 1100, 1275]),
  P("Vila Olímpia", "verde", 300, [26, 130, 390, 900, 1100, 1275]),
  CARD,
  P("Avenida Faria Lima", "verde", 320, [28, 150, 450, 1000, 1200, 1400]),
  P("Morumbi", "verde", 320, [28, 150, 450, 1000, 1200, 1400]),
  A("Aeroporto Campo de Marte"),
  U("Companhia de Gás", "🔥"),
  P("Rua Oscar Freire", "azul", 350, [35, 175, 500, 1100, 1300, 1500]),
  CARD,
  P("Jardim Europa", "azul", 380, [42, 190, 550, 1250, 1500, 1750]),
  { type: "tax", name: "Taxa de Luxo", amount: 100 },
  P("Avenida Paulista", "azul", 400, [50, 200, 600, 1400, 1700, 2000]),
];

// Tamanhos de tabuleiro que a mesa pode escolher.
const KINDS = {
  normal: { squares: NORMAL, name: "Normal", desc: "40 casas · até 6 jogadores", maxPlayers: 6, houses: 32, hotels: 12 },
  grande: { squares: GRANDE, name: "Grande", desc: "52 casas · até 8 jogadores", maxPlayers: 8, houses: 44, hotels: 16 },
};
const JAIL_FINE = 50;

// Sorte ou Revés
// t: cash (v>0 recebe, v<0 paga) | goto (to) | back (n) | jail | jailfree
//    | nearest (kind air/util: paga o dobro / 10x os dados) | each (v>0 cada um te paga, v<0 você paga a cada um)
//    | repairs (house, hotel)
//    | power (kind: demolish | steal | donate | shield) — cartas especiais, em que o jogador escolhe o alvo
// Em "goto", `to` é o nome da casa (ou 0 para o Início), para valer nos dois tamanhos de tabuleiro.
const CARD_DEFS = [
  { t: "goto", to: 0, text: "Avance até o Início e receba o salário." },
  { t: "goto", to: "Avenida Paulista", text: "Foi promovido! Avance até a Avenida Paulista." },
  { t: "goto", to: "Vila Madalena", text: "Sextou! Avance até a Vila Madalena." },
  { t: "goto", to: "Liberdade", text: "Deu vontade de lámen. Avance até a Liberdade." },
  { t: "goto", to: "Rua Augusta", text: "Rolê na Rua Augusta. Avance até lá." },
  { t: "goto", to: "Aeroporto de Congonhas", text: "Pegue um voo em Congonhas. Avance até lá." },
  { t: "nearest", kind: "air", text: "Corra para o aeroporto mais próximo. Se tiver dono, pague o dobro do aluguel." },
  { t: "nearest", kind: "air", text: "Voo remarcado! Vá para o aeroporto mais próximo. Se tiver dono, pague o dobro." },
  { t: "nearest", kind: "util", text: "Conta atrasada: vá até a companhia mais próxima. Se tiver dono, jogue os dados e pague 10x o resultado." },
  { t: "back", n: 3, text: "Esqueceu a carteira. Volte 3 casas." },
  { t: "jail", text: "Pego no radar sem CNH. Vá direto para a prisão, sem passar pelo Início." },
  { t: "jailfree", text: "Habeas corpus! Guarde esta carta para sair da prisão de graça." },
  { t: "cash", v: 200, text: "Erro do banco a seu favor. Receba R$ 200 mil." },
  { t: "cash", v: 150, text: "Seu bolão da Mega-Sena acertou a quadra. Receba R$ 150 mil." },
  { t: "cash", v: 100, text: "Restituição do Imposto de Renda. Receba R$ 100 mil." },
  { t: "cash", v: 100, text: "Vendeu o carro velho na OLX pelo dobro. Receba R$ 100 mil." },
  { t: "cash", v: 100, text: "Herança de uma tia que você nem conhecia. Receba R$ 100 mil." },
  { t: "cash", v: 50, text: "Suas ações pagaram dividendos. Receba R$ 50 mil." },
  { t: "cash", v: 50, text: "Ganhou o amigo secreto da firma. Receba R$ 50 mil." },
  { t: "cash", v: 25, text: "Achou dinheiro no bolso da calça. Receba R$ 25 mil." },
  { t: "cash", v: -15, text: "Multa por estacionar na vaga do idoso. Pague R$ 15 mil." },
  { t: "cash", v: -50, text: "Caiu no golpe do Pix do \"filho com número novo\". Pague R$ 50 mil." },
  { t: "cash", v: -50, text: "Consulta no dentista sem convênio. Pague R$ 50 mil." },
  { t: "cash", v: -100, text: "Pediu pizza de madrugada com taxa de entrega absurda. Pague R$ 100 mil." },
  { t: "cash", v: -100, text: "Bateu o carro na Marginal. Pague R$ 100 mil." },
  { t: "cash", v: -150, text: "Mensalidade da faculdade atrasada. Pague R$ 150 mil." },
  { t: "each", v: 10, text: "É seu aniversário! Cada jogador te dá R$ 10 mil." },
  { t: "each", v: 25, text: "Você organizou o churrasco. Cada jogador te paga R$ 25 mil." },
  { t: "each", v: -50, text: "Eleito síndico do prédio. Pague R$ 50 mil a cada jogador." },
  { t: "repairs", house: 25, hotel: 100, text: "Reforma geral: pague R$ 25 mil por casa e R$ 100 mil por hotel." },
  { t: "repairs", house: 40, hotel: 115, text: "Vistoria da prefeitura: pague R$ 40 mil por casa e R$ 115 mil por hotel." },
  // descontraídas
  { t: "cash", v: 300, text: "Arrumou um Daddy. Receba R$ 300 mil." },
  { t: "cash", v: 250, text: "Herdou o apê da vó na praia e alugou no feriado. Receba R$ 250 mil." },
  { t: "cash", v: 200, text: "Sua cripto subiu 300% e você vendeu na hora certa (milagre). Receba R$ 200 mil." },
  { t: "cash", v: 180, text: "Ganhou o bolão da Copa acertando 7 x 1. Receba R$ 180 mil." },
  { t: "cash", v: 150, text: "Viralizou no TikTok e fechou publi. Receba R$ 150 mil." },
  { t: "cash", v: 120, text: "Revendeu o ingresso do show pelo triplo. Receba R$ 120 mil." },
  { t: "cash", v: 80, text: "Achou um Pix esquecido de 2021 na conta. Receba R$ 80 mil." },
  { t: "cash", v: 40, text: "O cashback do cartão finalmente caiu. Receba R$ 40 mil." },
  { t: "cash", v: 30, text: "Vendeu o bolo de pote no escritório. Receba R$ 30 mil." },
  { t: "cash", v: -200, text: "Perdeu R$ 200 mil no tigrinho." },
  { t: "cash", v: -200, text: "Bancou o sextou em Noronha. Pague R$ 200 mil." },
  { t: "cash", v: -150, text: "Comprou curso de day trade de um coach de Lamborghini alugada. Pague R$ 150 mil." },
  { t: "cash", v: -120, text: "Apostou tudo no time errado no clássico. Pague R$ 120 mil." },
  { t: "cash", v: -90, text: "O iPhone caiu na privada. Pague R$ 90 mil." },
  { t: "cash", v: -70, text: "Ficou na fila virtual do show e pagou a taxa de conveniência. Pague R$ 70 mil." },
  { t: "cash", v: -60, text: "Rodízio de carne, e a conta veio \"dividida por igual\". Pague R$ 60 mil." },
  { t: "cash", v: -40, text: "Uber dinâmico na chuva da Marginal. Pague R$ 40 mil." },
  { t: "cash", v: -30, text: "Assinou todos os streamings e esqueceu de cancelar. Pague R$ 30 mil." },
  { t: "cash", v: -25, text: "Multa do rodízio de placa. Pague R$ 25 mil." },
  { t: "each", v: 30, text: "Vaquinha pro seu casamento no Pix. Cada jogador te dá R$ 30 mil." },
  { t: "each", v: 20, text: "Fez rifa do seu carro velho e todo mundo comprou por pena. Cada jogador te dá R$ 20 mil." },
  { t: "each", v: -20, text: "Perdeu no truco e paga a rodada. Pague R$ 20 mil a cada jogador." },
  { t: "each", v: -30, text: "Sumiu sem pagar o Pix do rolê e foi exposto no grupo. Pague R$ 30 mil a cada jogador." },
  { t: "goto", to: "Avenida Faria Lima", text: "Arrumou emprego na Faria Lima (de colete). Avance até a Avenida Faria Lima." },
  { t: "goto", to: "Ibirapuera", text: "Decidiu virar corredor de parque. Avance até o Ibirapuera." },
  { t: "goto", to: "Rua 25 de Março", text: "Foi comprar enfeite de Natal em julho. Avance até a Rua 25 de Março." },
  { t: "back", n: 2, text: "Esqueceu o carregador no bar. Volte 2 casas." },
  { t: "jail", text: "Pego na blitz da Lei Seca. Vá direto para a prisão, sem passar pelo Início." },
  { t: "repairs", house: 30, hotel: 110, text: "Enchente em São Paulo: pague R$ 30 mil por casa e R$ 110 mil por hotel." },
  // cartas de poder
  { t: "power", kind: "demolish", text: "Demolição! Escolha uma casa ou hotel de outro jogador para derrubar." },
  { t: "power", kind: "demolish", text: "Fiscalização da prefeitura! Escolha uma construção irregular de outro jogador para derrubar." },
  { t: "power", kind: "steal", text: "Usucapião! Tome um imóvel sem construções de outro jogador." },
  { t: "power", kind: "donate", text: "Crise de consciência. Doe um dos seus imóveis para outro jogador." },
  { t: "power", kind: "shield", text: "Escritura blindada! Escolha um imóvel seu para ficar protegido de demolição e usucapião para sempre." },
  { t: "power", kind: "shield", text: "Contratou um bom advogado. Proteja um dos seus imóveis de demolição e usucapião." },
];
const POWER = {
  demolish: { icon: "💥", title: "Demolição", ask: "Escolha uma construção de outro jogador para derrubar." },
  steal: { icon: "🦹", title: "Usucapião", ask: "Escolha um imóvel de outro jogador para tomar." },
  donate: { icon: "🎁", title: "Doação", ask: "Escolha um imóvel seu para doar.", ask2: "Para quem você vai doar?" },
  shield: { icon: "🛡️", title: "Escritura blindada", ask: "Escolha um imóvel seu para proteger." },
};

// Eventos: um por rodada (quando ligados), valem até a rodada seguinte.
const EVENTS = [
  { id: "blackfriday", icon: "🛍️", name: "Black Friday", text: "Casas e hotéis pela metade do preço nesta rodada.", build: 0.5 },
  { id: "aluguel", icon: "📈", name: "Aluguel nas alturas", text: "Todos os aluguéis dobram nesta rodada.", rent: 2 },
  { id: "greve", icon: "✈️", name: "Greve nos aeroportos", text: "Os aeroportos não cobram aluguel nesta rodada.", air: 0 },
  { id: "apagao", icon: "🔌", name: "Apagão", text: "As companhias não cobram nesta rodada.", util: 0 },
  { id: "feriadao", icon: "🏖️", name: "Feriadão", text: "Quem passar pelo Início nesta rodada recebe salário em dobro.", salary: 2 },
  { id: "liquidacao", icon: "🏷️", name: "Liquidação do banco", text: "Imóveis à venda custam 30% menos nesta rodada.", buy: 0.7 },
  { id: "iptu", icon: "🧾", name: "Chegou o IPTU", text: "Cada jogador paga R$ 10 mil por imóvel que tem.", iptu: 10 },
  { id: "bolsa", icon: "💹", name: "Bolsa em alta", text: "O banco dá R$ 50 mil para cada jogador.", bonus: 50 },
];
function mods(ev) {
  const e = EVENTS.find((x) => x.id === ev) || {};
  return { rent: e.rent || 1, air: e.air ?? 1, util: e.util ?? 1, build: e.build || 1, salary: e.salary || 1, buy: e.buy || 1 };
}

const PAWNS = ["🚗", "🛵", "🐶", "🐱", "🎩", "⚽", "🍕", "🎸", "🚀", "🦖", "👟", "🦜"];
const COLORS = ["#ff4d6d", "#3a86ff", "#ffbe0b", "#2ec27e", "#a259ff", "#ff8c42", "#14c2c7", "#8d6e63"];
const REACTIONS = ["😂", "💸", "🤡", "😭", "🔥", "👏"];
// Modo equipes: cada jogador tem o próprio dinheiro; aluguel entre colegas é grátis e o grupo de cor
// (e os aeroportos e companhias) conta o que a equipe inteira tem.
const TEAMS = [
  { name: "Time Coxinha", icon: "🍗", color: "#f08a24" },
  { name: "Time Pastel", icon: "🥟", color: "#3a86ff" },
  { name: "Time Pão de Queijo", icon: "🧀", color: "#2ec27e" },
  { name: "Time Brigadeiro", icon: "🍫", color: "#d63384" },
];

// ---------- contas ----------
// props: { [i]: { owner, houses (0-4, 5 = hotel), mortgaged, shield } }
// teams (opcional): { [idDoJogador]: número da equipe } — no modo equipes, colegas contam como um dono só.
const sameSide = (a, b, teams) => a === b || !!(teams && teams[a] != null && teams[a] === teams[b]);

// Monta o tabuleiro escolhido ("normal" ou "grande") com as contas que dependem dele.
function makeBoard(kind) {
  const def = KINDS[kind] || KINDS.normal;
  const BOARD = def.squares.map((sq, i) => ({ ...sq, i }));
  const N = BOARD.length, SIDE = N / 4;
  const find = (t) => BOARD.findIndex((sq) => sq.type === t);
  const JAIL = find("jail"), GO_TO_JAIL = find("gojail"), FREE = find("free");
  const AIRPORTS = BOARD.filter((sq) => sq.type === "air").map((sq) => sq.i);
  const UTILS = BOARD.filter((sq) => sq.type === "util").map((sq) => sq.i);
  const GROUP_SQUARES = {};
  BOARD.forEach((sq) => { if (sq.type === "prop") (GROUP_SQUARES[sq.group] = GROUP_SQUARES[sq.group] || []).push(sq.i); });
  const OWNABLE = BOARD.filter((sq) => sq.price).map((sq) => sq.i);
  const byName = (name) => { const i = BOARD.findIndex((sq) => sq.name === name); if (i < 0) throw new Error("Casa não existe no tabuleiro: " + name); return i; };
  const CARDS = CARD_DEFS.map((c) => (c.t === "goto" && typeof c.to === "string" ? { ...c, to: byName(c.to) } : c));

  function ownsGroup(props, owner, group, teams) {
    return GROUP_SQUARES[group].every((i) => props[i] && sameSide(props[i].owner, owner, teams));
  }
  function countOwned(props, owner, list, teams) {
    return list.filter((i) => props[i] && sameSide(props[i].owner, owner, teams)).length;
  }
  // Aluguel ao cair na casa i. dice = soma dos dados.
  // opts: double (carta do aeroporto), tenX (carta da companhia), event (evento da rodada), teams (modo equipes)
  function rentOf(props, i, dice, opts = {}) {
    const sq = BOARD[i], p = props[i], m = mods(opts.event);
    if (!p || p.owner == null || p.mortgaged) return 0;
    if (sq.type === "prop") {
      const base = p.houses > 0 ? sq.rent[p.houses] : sq.rent[0] * (ownsGroup(props, p.owner, sq.group, opts.teams) ? 2 : 1);
      return base * m.rent;
    }
    if (sq.type === "air") {
      const n = countOwned(props, p.owner, AIRPORTS, opts.teams);
      return 25 * Math.pow(2, n - 1) * (opts.double ? 2 : 1) * m.rent * m.air;
    }
    if (sq.type === "util") {
      // 1 companhia: 4x os dados; 2: 10x; 3 (tabuleiro grande): 20x
      const k = opts.tenX ? 10 : UTIL_MULT[countOwned(props, p.owner, UTILS, opts.teams)] || 4;
      return dice * k * m.rent * m.util;
    }
    return 0;
  }
  const mortgageValue = (i) => Math.floor(BOARD[i].price / 2);
  const unmortgageCost = (i) => Math.ceil(mortgageValue(i) * 1.1);
  const houseCost = (i) => (BOARD[i].type === "prop" ? GROUPS[BOARD[i].group].house : 0);
  const priceOf = (i, ev) => Math.round(BOARD[i].price * mods(ev).buy);
  const buildCost = (i, ev) => Math.round(houseCost(i) * mods(ev).build);
  // Patrimônio: dinheiro + imóveis (hipotecado vale metade) + construções pelo preço de custo
  function netWorth(props, pl) {
    let v = pl.cash;
    for (const [i, p] of Object.entries(props)) {
      if (p.owner !== pl.id) continue;
      v += p.mortgaged ? BOARD[i].price - mortgageValue(i) : BOARD[i].price;
      v += (p.houses || 0) * houseCost(i);
    }
    return v;
  }
  return {
    kind: KINDS[kind] ? kind : "normal", N, SIDE, maxPlayers: def.maxPlayers, HOUSES: def.houses, HOTELS: def.hotels,
    BOARD, CARDS, JAIL, GO_TO_JAIL, FREE, AIRPORTS, UTILS, GROUP_SQUARES, OWNABLE,
    ownsGroup, countOwned, rentOf, mortgageValue, unmortgageCost, houseCost, priceOf, buildCost, netWorth, ...shared(),
  };
}
const UTIL_MULT = { 1: 4, 2: 10, 3: 20 };

// Os valores do jogo são guardados em milhares: 200 aparece como "R$ 200 mil" e 1500 como "R$ 1,5 mi".
function short(v) {
  const n = Math.round(v), a = Math.abs(n);
  if (a >= 1000) return (n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: a >= 10000 ? 1 : 2 }) + " mi";
  return n.toLocaleString("pt-BR") + (n ? " mil" : "");
}
const money = (v) => "R$ " + short(v);

// O que não depende do tamanho do tabuleiro
function shared() {
  return { GROUPS, POWER, EVENTS, mods, JAIL_FINE, PAWNS, COLORS, REACTIONS, TEAMS, KINDS, UTIL_MULT, sameSide, money, short, makeBoard };
}
// Por padrão, o módulo já vem com o tabuleiro normal montado.
const api = makeBoard("normal");
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Tabuleiro = api;
})(typeof window !== "undefined" ? window : globalThis);
