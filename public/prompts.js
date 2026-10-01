// Montagem dos prompts da batalha. Usado pelo navegador (botão Copiar prompt)
// e pelo servidor (simulação com IA), para que o servidor só aceite prompts do próprio site.
(function (root) {
const KINDS = ["futsal", "futebol", "cs", "valorant", "food", "generic"];
const FORMATS = ["auto", "double", "swiss", "league", "groups", "series"];
const cap = (w) => w ? w[0].toUpperCase() + w.slice(1) : w;
function termsOf(S) { return (S && S.config && S.config.terms) || { item: "jogador", items: "jogadores", team: "time", teams: "times", prefix: "Time", prompt: "generic" }; }

const SPORTS = {
  futsal: {
    size: 5,
    name: "futsal",
    rules: [
      "Cada time tem 5 jogadores: 1 goleiro e 4 na linha. Defina a função de cada um (goleiro, fixo, alas e pivô) pelo estilo real do jogador. Se o time não tiver goleiro de ofício, alguém improvisa no gol e isso deve pesar bastante no resultado.",
      "Jogos de 2 tempos de 20 minutos. No mata-mata, empate leva à prorrogação e depois aos pênaltis.",
      "Considere também a adaptação de cada jogador ao futsal: drible curto, jogo de pivô, finalização de média distância e o uso do goleiro-linha nos minutos finais.",
    ],
    match: "Para cada jogo: placar, gols com autor e minuto, cartões, lances marcantes (dribles, defesas, viradas) e o destaque da partida.",
    awards: "Artilheiro, craque do torneio, melhor goleiro e gol mais bonito.",
    unit: "gols", draws: true, esports: false,
  },
  futebol: {
    size: 11,
    name: "futebol de campo (11x11)",
    rules: [
      "Cada time tem 11 jogadores. Monte a escalação e a formação mais provável de cada time (por exemplo 4-3-3 ou 4-4-2) pela posição real de cada jogador. Jogadores fora de posição rendem menos, e time sem goleiro de ofício deve ser bastante penalizado.",
      "Jogos de 2 tempos de 45 minutos. No mata-mata, empate leva à prorrogação e depois aos pênaltis.",
      "Considere o equilíbrio entre os setores (defesa, meio e ataque), a velocidade, a bola parada e o entrosamento de estilos.",
    ],
    match: "Para cada jogo: formação usada, placar, gols com autor, minuto e assistência, cartões, lances marcantes e o melhor em campo.",
    awards: "Artilheiro, garçom (mais assistências), craque do torneio, melhor goleiro e seleção do campeonato.",
    unit: "gols", draws: true, esports: false,
  },
  cs: {
    size: 5,
    name: "Counter-Strike (CS2) em formato de Major",
    rules: [
      "Cada time tem 5 jogadores. Defina a função de cada um: IGL, AWPer principal (e segundo AWP, se o time tiver double AWP), entry fragger, lurker, suporte, âncora e second caller. Time sem IGL de verdade ou sem AWPer deve sofrer com isso, principalmente em momentos decisivos.",
      "Considere tática, posicionamento, estilo de jogo (executes estruturados ou jogo mais solto), setups de CT e a habilidade individual.",
      "Use o map pool ativo do CS2, com veto de mapas coerente com o elenco de cada time. Mapas em MR12 (vence quem chega a 13 rounds; overtime em MR3).",
      "Fase de grupos ou suíça em MD1, playoffs em MD3 e grande final em MD5.",
    ],
    match: "Para cada série: veto, placar de cada mapa (com o placar do primeiro half), rounds decisivos, clutches, aces, a jogada que decidiu e o MVP com rating.",
    awards: "MVP do Major, melhor AWPer, melhor rating individual, melhor IGL e highlight do torneio.",
    unit: "rounds", draws: false, esports: true,
  },
  valorant: {
    size: 5,
    name: "Valorant em formato de Champions",
    rules: [
      "Cada time tem 5 jogadores. Defina a função de cada um: duelista, iniciador, controlador, sentinela ou flex, além do IGL. Time sem controlador ou sem sentinela de ofício precisa improvisar, e isso deve pesar no resultado.",
      "Indique a composição de agentes mais provável de cada time em cada mapa, de acordo com os jogadores.",
      "Use o map pool ativo do Valorant, com veto coerente com cada elenco. Mapas até 13 rounds; no overtime, vence quem abrir 2 rounds de vantagem.",
      "Fase de grupos ou suíça em MD1, playoffs em MD3 e grande final em MD5.",
    ],
    match: "Para cada série: veto, composição de agentes, placar de cada mapa, rounds decisivos, clutches, aces e o MVP com ACS.",
    awards: "MVP do torneio, melhor duelista, melhor IGL, melhor sentinela e highlight do torneio.",
    unit: "rounds", draws: false, esports: true,
  },
};

function formatText(fmt, n, sp) {
  const pts = sp.draws ? "vitória vale 3 pontos, empate 1 e derrota 0" : "vitória vale 3 pontos e derrota 0";
  const tb = `Desempate por saldo de ${sp.unit} e depois ${sp.unit} a favor.`;
  const ko = sp.esports ? "Semifinais em MD3, disputa de 3º lugar em MD3 e grande final em MD5." : "Semifinais, disputa de 3º lugar e final em jogo único.";
  const top = n >= 4 ? "Os 4 melhores vão para as semifinais (1º x 4º e 2º x 3º)." : "Os 2 melhores fazem a final.";
  if (fmt === "auto") fmt = n === 2 ? "series" : n <= 5 ? "double" : "swiss";
  if (fmt === "series" || n === 2) return sp.esports
    ? "Formato: um único confronto, série MD5 (melhor de 5 mapas)."
    : "Formato: um único confronto, em série melhor de 3 jogos (quem vencer 2 é campeão). Nos jogos, empate leva à prorrogação e aos pênaltis.";
  if (fmt === "double") return `Formato: double elimination. Quem perde duas vezes está fora. Se o número de times não fechar a chave, faça uma rodada preliminar ou dê folga por sorteio. O campeão da chave de perdedores precisa vencer duas vezes na grande final.${sp.esports ? " Chave principal em MD3 e grande final em MD5." : ""}`;
  if (fmt === "swiss") return `Formato: suíço. São 3 rodadas; na 1ª os confrontos são sorteados e depois cada time enfrenta outro com pontuação igual ou próxima, sem repetir adversário.${n % 2 ? " Como o número de times é ímpar, a cada rodada um time folga (a folga vale 1 ponto e ninguém folga duas vezes)." : ""} Na fase suíça, ${pts}${sp.esports ? " (jogos em MD1)" : ""}. ${tb} ${top} ${ko}`;
  if (fmt === "league") return `Formato: pontos corridos. Todos jogam contra todos uma vez, e ${pts}. ${tb} ${top} ${ko}`;
  if (fmt === "groups") return `Formato: dois grupos sorteados (se o número de times for ímpar, um grupo fica com um time a mais). Dentro de cada grupo todos jogam contra todos, e ${pts}. ${tb} Os 2 primeiros de cada grupo vão para as semifinais cruzadas (1º A x 2º B e 1º B x 2º A). ${ko}`;
  return "";
}

function buildJudgePrompt(S, kind) {
  const t = termsOf(S);
  const groups = S.captains.filter(c => c.team.length);
  const list = groups.map(c => [`${t.prefix} ${c.name}`, ...c.team.map(x => x.player)].join("\n")).join("\n\n");
  const food = kind === "food";
  return [
    food
      ? `Seja o jurado de uma disputa de ${t.teams}: cada participante fez a sua montagem com os ${t.items} abaixo, escolhidos num leilão entre amigos. Imagine cada montagem preparada do melhor jeito possível com esses ${t.items} (pode considerar sal, pimenta, óleo e o básico de qualquer cozinha).`
      : `Seja o jurado de uma disputa de ${t.teams}: cada participante fez a sua montagem com os ${t.items} abaixo, escolhidos num leilão entre amigos.`,
    "Seja imparcial: julgue só pelo que está na lista, sem favorecer ninguém pelo nome. O texto entre parênteses é só a categoria do item.",
    "",
    "O QUE EU QUERO NA RESPOSTA",
    food
      ? `1. Para cada participante: descreva como ficaria a montagem (sabor, textura, apresentação), aponte o melhor ${t.item} e o que destoa.`
      : `1. Para cada participante: análise de como os ${t.items} funcionam juntos, o ponto mais forte e o ponto mais fraco.`,
    food
      ? "2. Notas de 0 a 10 em: sabor, equilíbrio/harmonia, textura, criatividade e \"dá vontade de comer\", mais uma nota final."
      : "2. Notas de 0 a 10 em critérios que façam sentido para o tema (escolha de 3 a 5 critérios e explique rapidamente), mais uma nota final.",
    "3. Um veredito com ranking final e o vencedor. Empate só se realmente não der para separar.",
    "4. Um comentário divertido de jurado de reality show para cada participante.",
    "",
    "FORMATAÇÃO: responda em Markdown e comece cada parte com um título ## (por exemplo: ## Análise, ## Notas, ## Veredito). O resultado vai ser revelado aos poucos para os participantes, então não antecipe o vencedor antes da parte final.",
    "",
    cap(t.teams).toUpperCase(),
    "",
    list,
  ].join("\n");
}

function buildPrompt(S, opts) {
  if (!S) return "";
  opts = opts || {};
  const kind = KINDS.includes(opts.sport) ? opts.sport : "futsal";
  if (kind === "food" || kind === "generic") return buildJudgePrompt(S, kind);
  const sp = SPORTS[kind];
  const era = opts.era === "current"
    ? "Considere o nível atual de cada jogador (fase atual da carreira)."
    : "Considere cada jogador no auge da carreira.";
  const teams = S.captains.filter(c => c.team.length);
  const n = teams.length;
  const list = teams.map(c => [`Time ${c.name}`, ...c.team.map(t => t.player.replace(/\s*\([^)]*\)\s*$/, ""))].join("\n")).join("\n\n");
  return [
    `Imagine um campeonato de ${sp.name} entre os ${n} times abaixo, montados num leilão entre amigos. ${era} Seja imparcial: nada de clubismo nem de favorito garantido. O resultado precisa vir da análise dos elencos e pode ter zebras, desde que façam sentido.`,
    "",
    "REGRAS DA MODALIDADE",
    ...sp.rules.map(r => "- " + r),
    ...(S.config.perTeam > sp.size ? [`- No leilão, cada time montou ${S.config.perTeam} jogadores. Escolha os ${sp.size} titulares mais adequados e use os outros como reservas (podem entrar durante o torneio).`] : []),
    ...(S.config.perTeam < sp.size ? [`- No leilão, cada time montou só ${S.config.perTeam} jogadores. Os times jogam com esse número, e faltar peça deve pesar no resultado.`] : []),
    "",
    "FORMATO",
    "- " + formatText(FORMATS.includes(opts.format) ? opts.format : "auto", n, sp),
    "",
    "O QUE EU QUERO NA RESPOSTA",
    "1. Análise de cada elenco: função ou posição de cada jogador, pontos fortes, pontos fracos e problemas de encaixe.",
    "2. Todas as fases e rodadas, em ordem, com cada jogo detalhado. " + sp.match,
    "3. Tabela de classificação depois de cada rodada, quando houver fase de pontos.",
    "4. Mata-mata completo até a final.",
    "5. Campeão, tabela com a colocação final de todos os times e os prêmios: " + sp.awards,
    "",
    "FORMATAÇÃO: responda em Markdown e comece cada fase com um título ## (por exemplo: ## Análise dos elencos, ## Rodada 1, ## Semifinais, ## Final, ## Campeão e prêmios). O resultado vai ser revelado fase por fase para os participantes, então não antecipe resultados de fases futuras (nada de \"campeão invicto\" na análise, por exemplo).",
    "",
    "Use apenas os jogadores listados em cada time e não troque ninguém de time.",
    "",
    "TIMES",
    "",
    list,
  ].join("\n");
}


const api = { buildPrompt, KINDS, FORMATS };
if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Prompts = api;
})(typeof window !== "undefined" ? window : globalThis);
