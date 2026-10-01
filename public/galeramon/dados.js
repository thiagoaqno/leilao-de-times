// Galeramon — bichos, tipos e golpes. Usado pelo servidor (batalha) e pela página (telas).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Galeramon = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // cor de cada tipo (para os selos e os botões de golpe)
  const TYPES = {
    Fogo: "#ee6a2c", "Água": "#3f86e0", Grama: "#4cb04a", Raio: "#e9b914",
    Pedra: "#a08a56", "Psíquico": "#e0529c", Normal: "#a8a077",
  };
  // multiplicador de dano: CHART[golpe][defensor]; o que não está aqui vale 1 (Normal é neutro, só apanha igual de todo mundo)
  //   Fogo    > Grama               · fraco contra Água e Pedra
  //   Água    > Fogo, Pedra         · fraco contra Grama e Raio
  //   Grama   > Água, Pedra         · fraco contra Fogo
  //   Raio    > Água, Psíquico      · fraco contra Pedra
  //   Pedra   > Fogo, Raio          · fraco contra Água, Grama e Psíquico
  //   Psíquico > Pedra              · fraco contra Raio
  const CHART = {
    Fogo: { Grama: 2, Fogo: 0.5, "Água": 0.5, Pedra: 0.5 },
    "Água": { Fogo: 2, Pedra: 2, "Água": 0.5, Grama: 0.5 },
    Grama: { "Água": 2, Pedra: 2, Fogo: 0.5, Grama: 0.5 },
    Raio: { "Água": 2, "Psíquico": 2, Raio: 0.5, Grama: 0.5, Pedra: 0.5 },
    Pedra: { Fogo: 2, Raio: 2, Pedra: 0.5 },
    "Psíquico": { Pedra: 2, "Psíquico": 0.5 },
    Normal: { Pedra: 0.5 },
  };
  function effect(moveType, defTypes) {
    return defTypes.reduce((m, t) => m * ((CHART[moveType] || {})[t] ?? 1), 1);
  }

  // golpes: p = poder (0 = golpe de status), a = precisão, pri = prioridade (vai antes),
  // self/foe = muda atributos (+1/-1 = um nível), chance = % de o efeito no alvo acontecer,
  // heal = cura % da vida máxima, drain = recupera % do dano, recoil = perde % do dano, crit = acerto crítico mais fácil
  const MOVES = {
    espetinho: { n: "Espetinho Flamejante", t: "Fogo", p: 80, a: 100 },
    picanha: { n: "Picanha na Brasa", t: "Fogo", p: 110, a: 80 },
    tempero: { n: "Tempero Secreto", t: "Normal", p: 0, a: 100, self: { atk: 2 }, d: "Aumenta muito o próprio ataque." },
    linguica: { n: "Linguiçada Rápida", t: "Normal", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },

    mare: { n: "Jato de Maré", t: "Água", p: 80, a: 100 },
    ressaca: { n: "Onda de Ressaca", t: "Água", p: 105, a: 85 },
    beliscao: { n: "Beliscão", t: "Normal", p: 65, a: 100, foe: { def: -1 }, chance: 40, d: "Pode baixar a defesa do alvo." },
    carapaca: { n: "Carapaça", t: "Normal", p: 0, a: 100, self: { def: 2 }, d: "Aumenta muito a própria defesa." },

    limao: { n: "Chuva de Limão", t: "Grama", p: 80, a: 100 },
    gelo: { n: "Gelo no Copo", t: "Água", p: 70, a: 100 },
    acucar: { n: "Açúcar no Copo", t: "Normal", p: 0, a: 100, heal: 0.5, max: 3, d: "Recupera metade da vida (3 vezes por batalha)." },
    azedou: { n: "Azedou!", t: "Grama", p: 0, a: 100, foe: { atk: -1, def: -1 }, d: "Baixa o ataque e a defesa do alvo." },

    feira: { n: "Choque de Feira", t: "Raio", p: 80, a: 100 },
    oleo: { n: "Óleo Quente", t: "Fogo", p: 70, a: 95 },
    vento: { n: "Pastel de Vento", t: "Normal", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },
    curto: { n: "Curto-Circuito", t: "Raio", p: 125, a: 90, recoil: 0.33, d: "Muito forte, mas machuca quem usa." },

    parale: { n: "Paralelepipedada", t: "Pedra", p: 95, a: 90 },
    desliza: { n: "Deslizamento", t: "Pedra", p: 60, a: 100, foe: { spd: -1 }, chance: 100, d: "Baixa a velocidade do alvo." },
    endurece: { n: "Endurecer", t: "Normal", p: 0, a: 100, self: { def: 1, atk: 1 }, d: "Aumenta o próprio ataque e a defesa." },
    britadeira: { n: "Britadeira", t: "Normal", p: 80, a: 100, crit: true, d: "Acerta crítico com facilidade." },

    assombra: { n: "Mandinga", t: "Psíquico", p: 90, a: 100 },
    susto: { n: "Susto", t: "Psíquico", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },
    cachimbo: { n: "Cachimbada", t: "Fogo", p: 65, a: 100, foe: { atk: -1 }, chance: 30, d: "Pode baixar o ataque do alvo." },
    redemoinho: { n: "Redemoinho", t: "Normal", p: 0, a: 100, self: { spd: 1, atk: 1 }, d: "Aumenta a velocidade e o ataque." },

    deitada: { n: "Deitada Estratégica", t: "Normal", p: 0, a: 100, heal: 0.5, max: 3, d: "Recupera metade da vida (3 vezes por batalha)." },
    pancada: { n: "Pancada Tranquila", t: "Normal", p: 85, a: 100 },
    mergulho: { n: "Mergulho no Rio", t: "Água", p: 75, a: 100 },
    paz: { n: "Paz Interior", t: "Normal", p: 0, a: 100, self: { atk: 1, def: 1 }, d: "Aumenta o próprio ataque e a defesa." },

    olho: { n: "Olho de Fogo", t: "Fogo", p: 85, a: 100 },
    serpente: { n: "Serpente Assombrada", t: "Psíquico", p: 85, a: 100 },
    rastro: { n: "Rastro em Chamas", t: "Fogo", p: 60, a: 100, drain: 0.5, d: "Recupera metade do dano causado." },
    // --- bichos novos ---
    neon: { n: "Bicada Neon", t: "Raio", p: 80, a: 100 },
    acai: { n: "Chuva de Açaí", t: "Grama", p: 80, a: 100 },
    revoada: { n: "Revoada", t: "Normal", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },
    exibido: { n: "Exibido", t: "Normal", p: 0, a: 100, self: { atk: 1, spd: 1 }, d: "Aumenta o ataque e a velocidade." },

    pantano: { n: "Mordida do Pântano", t: "Água", p: 85, a: 100 },
    rabada: { n: "Rabada", t: "Pedra", p: 80, a: 100 },
    couro: { n: "Couro Grosso", t: "Normal", p: 0, a: 100, self: { def: 2 }, d: "Aumenta muito a própria defesa." },
    emboscada: { n: "Emboscada", t: "Água", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },

    patada: { n: "Patada Pintada", t: "Normal", p: 85, a: 100 },
    bote: { n: "Bote", t: "Normal", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },
    rugido: { n: "Rugido", t: "Normal", p: 0, a: 100, foe: { atk: -2 }, d: "Baixa muito o ataque do alvo." },
    mata: { n: "Salto na Mata", t: "Grama", p: 75, a: 100 },

    encanto: { n: "Encanto do Boto", t: "Psíquico", p: 80, a: 100, foe: { atk: -1 }, chance: 30, d: "Pode baixar o ataque do alvo." },
    rosado: { n: "Jato Rosado", t: "Água", p: 80, a: 100 },
    chapeu: { n: "Chapéu Branco", t: "Normal", p: 0, a: 100, heal: 0.5, max: 3, d: "Recupera metade da vida (3 vezes por batalha)." },
    rio: { n: "Onda do Rio", t: "Água", p: 60, a: 100, drain: 0.5, d: "Recupera metade do dano causado." },

    juba: { n: "Juba Dourada", t: "Fogo", p: 85, a: 100 },
    galho: { n: "Galho em Chamas", t: "Fogo", p: 110, a: 85 },
    cambalhota: { n: "Cambalhota", t: "Normal", p: 70, a: 100 },
    grito: { n: "Grito do Mico", t: "Normal", p: 0, a: 100, foe: { def: -2 }, d: "Baixa muito a defesa do alvo." },

    rolamento: { n: "Rolamento", t: "Pedra", p: 75, a: 100, self: { spd: 1 }, d: "Ganha velocidade a cada rolada." },
    escavar: { n: "Escavar", t: "Pedra", p: 100, a: 90 },
    enrolar: { n: "Enrolar", t: "Normal", p: 0, a: 100, self: { def: 2 }, d: "Aumenta muito a própria defesa." },
    unhada: { n: "Unhada", t: "Normal", p: 70, a: 100, crit: true, d: "Acerta crítico com facilidade." },

    fofoca: { n: "Fofoca", t: "Psíquico", p: 95, a: 100 },
    papagaiada: { n: "Papagaiada", t: "Normal", p: 70, a: 100, foe: { def: -1 }, chance: 40, d: "Pode baixar a defesa do alvo." },
    dissemedisse: { n: "Disse-Me-Disse", t: "Psíquico", p: 0, a: 100, foe: { atk: -1, spd: -1 }, d: "Baixa o ataque e a velocidade do alvo." },
    bicada: { n: "Bico Afiado", t: "Normal", p: 45, a: 100, pri: 1, d: "Sempre ataca primeiro." },

    abraco: { n: "Abraço Apertado", t: "Grama", p: 80, a: 100, foe: { spd: -1 }, chance: 100, d: "Baixa a velocidade do alvo." },
    botemata: { n: "Bote da Mata", t: "Grama", p: 105, a: 85 },
    pele: { n: "Troca de Pele", t: "Normal", p: 0, a: 100, heal: 0.5, max: 3, d: "Recupera metade da vida (3 vezes por batalha)." },
    chicote: { n: "Rabo Chicote", t: "Normal", p: 75, a: 100 },

    soneca: { n: "Soneca", t: "Normal", p: 0, a: 100, heal: 0.5, max: 3, d: "Recupera metade da vida (3 vezes por batalha)." },
    garra: { n: "Garra Lenta", t: "Grama", p: 80, a: 100 },
    mascada: { n: "Folha Mascada", t: "Grama", p: 60, a: 100, drain: 0.5, d: "Recupera metade do dano causado." },
    espreguica: { n: "Espreguiçada", t: "Normal", p: 0, a: 100, self: { atk: 1, def: 1 }, d: "Aumenta o próprio ataque e a defesa." },

    guarana: { n: "Choque de Guaraná", t: "Raio", p: 85, a: 100 },
    uivo: { n: "Uivo Energético", t: "Raio", p: 0, a: 100, self: { atk: 1, spd: 1 }, d: "Aumenta o ataque e a velocidade." },
    mordida: { n: "Mordida", t: "Normal", p: 75, a: 100 },
    duzentos: { n: "Nota de Duzentos", t: "Normal", p: 90, a: 90, crit: true, d: "Acerta crítico com facilidade." },

    sibilo: { n: "Sibilo Sinistro", t: "Psíquico", p: 0, a: 100, foe: { def: -2 }, d: "Baixa muito a defesa do alvo." },
  };

  const MONS = {
    churrasquilo: { n: "Churrasquilo", types: ["Fogo"], hp: 190, atk: 125, def: 90, spd: 90, moves: ["espetinho", "picanha", "linguica", "tempero"],
      bio: "Leitãozinho que vive em churrasco de domingo. Quando fica bravo, o topete pega fogo." },
    sirizao: { n: "Sirizão", types: ["Água"], hp: 195, atk: 90, def: 110, spd: 55, moves: ["mare", "ressaca", "beliscao", "carapaca"],
      bio: "Siri de praia que rouba o petisco da mesa. A carapaça aguenta até cadeira de plástico." },
    caipirito: { n: "Caipirito", types: ["Grama"], hp: 190, atk: 100, def: 90, spd: 85, moves: ["limao", "gelo", "acucar", "azedou"],
      bio: "Limão que sonhava em ser caipirinha. Anda sempre com o próprio canudinho." },
    pasteletrico: { n: "Pastelétrico", types: ["Raio"], hp: 195, atk: 130, def: 80, spd: 125, moves: ["feira", "curto", "vento", "oleo"],
      bio: "Pastel de feira que caiu na tomada. O de vento é o mais perigoso." },
    pedrolho: { n: "Pedrolho", types: ["Pedra"], hp: 200, atk: 105, def: 115, spd: 40, moves: ["parale", "britadeira", "desliza", "endurece"],
      bio: "Paralelepípedo que se soltou da calçada. Lento, teimoso e duríssimo." },
    saci: { n: "Saci", types: ["Psíquico"], hp: 185, atk: 130, def: 85, spd: 135, moves: ["assombra", "susto", "cachimbo", "redemoinho"],
      bio: "Dá nó na crina dos cavalos e some num redemoinho. Ninguém é mais rápido." },
    capivarao: { n: "Capivarão", types: ["Normal"], hp: 215, atk: 90, def: 95, spd: 60, moves: ["pancada", "mergulho", "deitada", "paz"],
      bio: "Nada tira a paz dele. Anda com uma laranja na cabeça e vive às margens do rio." },
    boitata: { n: "Boitatá", types: ["Fogo", "Psíquico"], hp: 170, atk: 120, def: 80, spd: 110, moves: ["olho", "serpente", "rastro", "sibilo"],
      bio: "Cobra de fogo das lendas que protege as matas. Os olhos enxergam no escuro." },
    tucanudo: { n: "Tucanudo", types: ["Grama", "Raio"], hp: 190, atk: 120, def: 85, spd: 120, moves: ["neon", "acai", "revoada", "exibido"],
      bio: "O bico é maior que o corpo e brilha no escuro. Só come açaí com granola." },
    jacareu: { n: "Jacaréu", types: ["Água", "Pedra"], hp: 195, atk: 110, def: 115, spd: 50, moves: ["pantano", "rabada", "emboscada", "couro"],
      bio: "Fica parado no pântano fingindo que é pedra. Quando você chega perto… nhac!" },
    oncarada: { n: "Onçarada", types: ["Normal"], hp: 185, atk: 135, def: 85, spd: 125, moves: ["patada", "bote", "mata", "rugido"],
      bio: "A rainha da mata. Cada pinta dela é uma briga que ela ganhou." },
    botoso: { n: "Botoso", types: ["Água", "Psíquico"], hp: 195, atk: 105, def: 95, spd: 95, moves: ["encanto", "rosado", "rio", "chapeu"],
      bio: "Boto-cor-de-rosa que vira galã de chapéu branco nas festas juninas." },
    micoleao: { n: "Micoleão", types: ["Fogo"], hp: 180, atk: 125, def: 80, spd: 120, moves: ["juba", "galho", "cambalhota", "grito"],
      bio: "A juba dourada é tão quente que acende os galhos por onde ele passa." },
    tatubala: { n: "Tatu-Bala", types: ["Pedra"], hp: 190, atk: 115, def: 125, spd: 60, moves: ["rolamento", "escavar", "unhada", "enrolar"],
      bio: "Tatu-bola que treinou demais. Enrola, rola e sai que nem bala de canhão." },
    fofocaio: { n: "Fofocaio", types: ["Psíquico"], hp: 190, atk: 130, def: 90, spd: 115, moves: ["fofoca", "papagaiada", "bicada", "dissemedisse"],
      bio: "Papagaio que sabe da vida de todo mundo da vila. E conta tudo." },
    sucurri: { n: "Sucurrí", types: ["Grama"], hp: 200, atk: 110, def: 95, spd: 70, moves: ["abraco", "botemata", "chicote", "pele"],
      bio: "Sucuri de 8 metros que dá abraço apertado demais. Vive rindo à toa." },
    preguicudo: { n: "Preguiçudo", types: ["Grama"], hp: 185, atk: 95, def: 95, spd: 30, moves: ["garra", "mascada", "soneca", "espreguica"],
      bio: "Dorme 20 horas por dia. Nas outras 4, cochila. Mas a garra é pesada." },
    loboguarana: { n: "Lobo-Guaraná", types: ["Raio"], hp: 190, atk: 130, def: 85, spd: 115, moves: ["guarana", "mordida", "duzentos", "uivo"],
      bio: "Lobo-guará que bebeu guaraná demais. Estampa a nota de duzentos e não para quieto." },
  };
  const IDS = Object.keys(MONS);
  const TEAM_SIZE = 3;
  const DEFAULT_TEAM = ["churrasquilo", "sirizao", "caipirito"];
  function cleanTeam(t) {
    const out = [];
    for (const id of Array.isArray(t) ? t : []) if (MONS[id] && !out.includes(id)) out.push(id);
    return out.length === TEAM_SIZE ? out : DEFAULT_TEAM.slice();
  }
  const STAT_NAMES = { atk: "ataque", def: "defesa", spd: "velocidade" };
  const stageMult = (s) => (s >= 0 ? (2 + s) / 2 : 2 / (2 - s));

  return { TYPES, CHART, MOVES, MONS, IDS, TEAM_SIZE, DEFAULT_TEAM, STAT_NAMES, effect, cleanTeam, stageMult };
});
