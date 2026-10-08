// Naruto Shippuden — elenco e jutsus das batalhas (por turnos na Vila e em tempo real no Ginásio).
// Os números do jogo (vida, ataque, golpes...) são daqui; a vila, o clã e os jutsus de cada ninja vêm da base de dados
// (naruto-base.js, gerada por ferramentas/base-naruto.js a partir da Dattebayo API).
// Imagens: prévias dos sprites de Naruto Shippuden: Naruto vs. Sasuke (DS),
// preservados pelo The Spriters Resource. Créditos: public/galeramon/NARUTO-ASSETS.md.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./naruto-base.js"));
  else root.NarutoDex = factory(root.NarutoBase || {});
})(typeof self !== "undefined" ? self : this, function (BASE_DADOS) {
  const TYPES = {
    Taijutsu: "#a76542", Vento: "#458e76", Fogo: "#c95137", Raio: "#c49a24",
    "Água": "#4384ad", Terra: "#806b57", Sombra: "#685b96", Medicina: "#b45c86",
  };
  const CHART = {
    Vento: { Raio: 1.5, Fogo: 0.75 }, Fogo: { Vento: 1.5, "Água": 0.75 },
    Raio: { Terra: 1.5, Vento: 0.75 }, Terra: { "Água": 1.5, Raio: 0.75 },
    "Água": { Fogo: 1.5, Terra: 0.75 },
  };
  const effect = (tipo, tipos) => tipos.reduce((m, t) => m * (CHART[tipo]?.[t] ?? 1), 1);
  // custo é chakra; as técnicas sem custo mantêm a luta ativa quando o chakra acaba.
  // `forma` é como o golpe sai no Ginásio em tempo real: "corpo" (na frente do ninja), "projetil" (voa até acertar),
  // "area" (cai num ponto, com aviso) ou "investida" (o ninja avança com ele; `giro` faz ele rodar). Sem `forma`, vale o
  // jeito de sempre da regra (regras.js). `fx` é o desenho do golpe na arena (golpes-naruto.js).
  const MOVES = {
    shuriken: { n: "Shuriken", t: "Taijutsu", p: 48, a: 100, custo: 0, forma: "projetil", fx: "shuriken" },
    kunai: { n: "Kunai", t: "Taijutsu", p: 55, a: 100, custo: 0, forma: "corpo", fx: "kunai" },
    rasengan: { n: "Rasengan", t: "Vento", p: 95, a: 95, custo: 30, forma: "corpo", alcance: 1.5, fx: "rasengan" },
    clones: { n: "Clones das Sombras", t: "Sombra", p: 0, a: 100, custo: 20, self: { spd: 1, def: 1 }, d: "Aumenta velocidade e defesa.", fx: "clones" },
    odama: { n: "Ōdama Rasengan", t: "Vento", p: 125, a: 85, custo: 45, forma: "investida", fx: "odama" },
    chidori: { n: "Chidori", t: "Raio", p: 105, a: 90, custo: 35, forma: "investida", fx: "chidori" },
    katon: { n: "Bola de Fogo", t: "Fogo", p: 80, a: 100, custo: 20, forma: "projetil", fx: "katon" },
    sharingan: { n: "Sharingan", t: "Sombra", p: 0, a: 100, custo: 20, self: { atk: 1, spd: 1 }, d: "Aumenta ataque e velocidade.", fx: "sharingan" },
    kirin: { n: "Kirin", t: "Raio", p: 130, a: 80, custo: 50, forma: "area", fx: "kirin" },
    soco: { n: "Soco Concentrado", t: "Taijutsu", p: 88, a: 95, custo: 18, forma: "corpo", fx: "soco" },
    cura: { n: "Ninjutsu Médico", t: "Medicina", p: 0, a: 100, custo: 30, heal: 0.4, max: 2, d: "Recupera 40% da vida; duas vezes por luta.", fx: "cura" },
    impacto: { n: "Impacto da Cerejeira", t: "Taijutsu", p: 115, a: 85, custo: 35, forma: "area", raio: 1.7, fx: "impacto" },
    raikiri: { n: "Raikiri", t: "Raio", p: 108, a: 90, custo: 38, forma: "investida", fx: "raikiri" },
    parede: { n: "Parede de Terra", t: "Terra", p: 0, a: 100, custo: 20, self: { def: 2 }, d: "Aumenta muito a defesa.", fx: "parede" },
    cachorrada: { n: "Invocação Ninja", t: "Taijutsu", p: 75, a: 100, custo: 20, foe: { spd: -1 }, chance: 60, forma: "projetil", fx: "ninken" },
    sombra: { n: "Possessão da Sombra", t: "Sombra", p: 65, a: 95, custo: 25, foe: { spd: -1 }, chance: 100, forma: "projetil", fx: "sombra" },
    estrangular: { n: "Estrangulamento", t: "Sombra", p: 100, a: 90, custo: 35, forma: "area", raio: 1.2, fx: "estrangular" },
    estrategia: { n: "Estratégia", t: "Sombra", p: 0, a: 100, custo: 15, self: { atk: 1, def: 1 }, fx: "estrategia" },
    corvos: { n: "Genjutsu dos Corvos", t: "Sombra", p: 65, a: 100, custo: 25, foe: { atk: -1 }, chance: 100, forma: "projetil", fx: "corvos" },
    amaterasu: { n: "Amaterasu", t: "Fogo", p: 120, a: 85, custo: 45, forma: "area", raio: 1.4, fx: "amaterasu" },
    shurikenfogo: { n: "Shuriken Flamejante", t: "Fogo", p: 75, a: 100, custo: 20, forma: "projetil", fx: "shurikenfogo" },
    suiton: { n: "Tubarão de Água", t: "Água", p: 95, a: 95, custo: 30, forma: "projetil", fx: "tubarao" },
    samehada: { n: "Samehada", t: "Taijutsu", p: 75, a: 100, custo: 15, drain: 0.35, d: "Recupera parte do dano causado.", forma: "corpo", alcance: 1.6, fx: "samehada" },
    onda: { n: "Grande Onda", t: "Água", p: 115, a: 85, custo: 40, forma: "area", raio: 1.9, fx: "onda" },
    argila: { n: "Aranha de Argila", t: "Terra", p: 75, a: 100, custo: 20, forma: "projetil", fx: "argila" },
    c2: { n: "Dragão C2", t: "Terra", p: 110, a: 90, custo: 35, forma: "projetil", fx: "dragaoargila" },
    c3: { n: "Explosão C3", t: "Terra", p: 130, a: 75, custo: 50, forma: "area", raio: 2.1, fx: "c3" },
    lotus: { n: "Lótus Frontal", t: "Taijutsu", p: 100, a: 90, custo: 30, forma: "investida", fx: "lotus" },
    portoes: { n: "Portões Internos", t: "Taijutsu", p: 0, a: 100, custo: 25, self: { atk: 2, spd: 1 }, d: "Aumenta muito o ataque e a velocidade.", fx: "portoes" },
    tornado: { n: "Tornado da Folha", t: "Taijutsu", p: 72, a: 100, custo: 15, pri: 1, fx: "tornado" },
    tinta: { n: "Feras de Tinta", t: "Sombra", p: 82, a: 100, custo: 25, forma: "projetil", fx: "tinta" },
    passaro: { n: "Pássaro de Tinta", t: "Sombra", p: 70, a: 100, custo: 18, foe: { spd: -1 }, chance: 60, forma: "projetil", fx: "passaro" },
    pergaminho: { n: "Pergaminho", t: "Sombra", p: 0, a: 100, custo: 15, self: { def: 1, spd: 1 }, fx: "pergaminho" },
    marionete: { n: "Marionete", t: "Sombra", p: 85, a: 100, custo: 25, forma: "projetil", fx: "marionete" },
    veneno: { n: "Agulhas Venenosas", t: "Taijutsu", p: 70, a: 100, custo: 18, foe: { def: -1 }, chance: 100, forma: "projetil", fx: "agulhas" },
    ferro: { n: "Areia de Ferro", t: "Terra", p: 110, a: 85, custo: 38, forma: "area", raio: 1.8, fx: "areiaferro" },
    mokuton: { n: "Liberação de Madeira", t: "Terra", p: 90, a: 95, custo: 28, forma: "area", raio: 1.3, fx: "mokuton" },
    prisao: { n: "Prisão de Madeira", t: "Terra", p: 65, a: 100, custo: 22, foe: { spd: -1 }, chance: 100, forma: "area", raio: 1.2, fx: "prisao" },
    // os que chegaram com a base nova
    jizo: { n: "Agulha de Jizō", t: "Terra", p: 70, a: 100, custo: 18, foe: { def: -1 }, chance: 100, forma: "projetil", fx: "agulhas" },
    oleo: { n: "Bala de Óleo Flamejante", t: "Fogo", p: 88, a: 95, custo: 24, forma: "projetil", fx: "oleo" },
    gama: { n: "Invocação: Gamabunta", t: "Água", p: 125, a: 85, custo: 48, forma: "area", raio: 2, fx: "sapo" },
    bisturi: { n: "Bisturi de Chakra", t: "Medicina", p: 80, a: 100, custo: 16, forma: "corpo", fx: "bisturi" },
    cobras: { n: "Cobras Fantasmas", t: "Sombra", p: 75, a: 100, custo: 20, foe: { spd: -1 }, chance: 60, forma: "projetil", fx: "cobras" },
    palma: { n: "Palma Divina", t: "Taijutsu", p: 85, a: 100, custo: 18, forma: "corpo", fx: "palma" },
    kaiten: { n: "Rotação Celestial", t: "Taijutsu", p: 0, a: 100, custo: 20, self: { def: 2 }, d: "Aumenta muito a defesa.", fx: "kaiten" },
    hakke: { n: "64 Palmas", t: "Taijutsu", p: 120, a: 85, custo: 40, forma: "area", raio: 1.7, fx: "hakke" },
    byakugan: { n: "Byakugan", t: "Taijutsu", p: 0, a: 100, custo: 20, self: { atk: 1, spd: 1 }, d: "Aumenta ataque e velocidade.", fx: "byakugan" },
    kusanagi: { n: "Espada Kusanagi", t: "Taijutsu", p: 95, a: 95, custo: 25, forma: "corpo", alcance: 1.7, fx: "espada" },
    muda: { n: "Troca de Pele", t: "Sombra", p: 0, a: 100, custo: 30, heal: 0.35, max: 2, d: "Recupera 35% da vida; duas vezes por luta.", fx: "muda" },
    manda: { n: "Invocação: Manda", t: "Sombra", p: 130, a: 80, custo: 50, forma: "area", raio: 2, fx: "cobragigante" },
    calcanhar: { n: "Calcanhar da Dor", t: "Taijutsu", p: 105, a: 88, custo: 32, forma: "area", raio: 1.6, fx: "calcanhar" },
    leque: { n: "Golpe de Leque", t: "Taijutsu", p: 60, a: 100, custo: 0, forma: "corpo", alcance: 1.5, fx: "leque" },
    foice: { n: "Foice de Vento", t: "Vento", p: 80, a: 100, custo: 18, forma: "projetil", fx: "ventolamina" },
    danca: { n: "Dança das Lâminas", t: "Vento", p: 105, a: 90, custo: 35, forma: "area", raio: 1.8, fx: "ciclone" },
    dragaovento: { n: "Dragão de Vento", t: "Vento", p: 125, a: 85, custo: 45, forma: "projetil", fx: "dragaovento" },
    sansho: { n: "Sanshōuo", t: "Sombra", p: 95, a: 95, custo: 28, forma: "area", raio: 1.7, fx: "sansho" },
    tigre: { n: "Tigre Diurno", t: "Taijutsu", p: 130, a: 80, custo: 50, forma: "projetil", fx: "tigre" },
    chuva: { n: "Chuva de Armas", t: "Taijutsu", p: 85, a: 95, custo: 22, forma: "projetil", fx: "chuvarmas" },
    dragaoarmas: { n: "Dragão Ascendente", t: "Taijutsu", p: 120, a: 85, custo: 42, forma: "area", raio: 1.6, fx: "dragaoarmas" },
    escudoareia: { n: "Escudo de Areia", t: "Terra", p: 0, a: 100, custo: 18, self: { def: 2 }, d: "Aumenta muito a defesa.", fx: "escudoareia" },
    maoareia: { n: "Mão de Areia", t: "Terra", p: 80, a: 100, custo: 22, forma: "projetil", fx: "maoareia" },
    caixao: { n: "Caixão de Areia", t: "Terra", p: 105, a: 90, custo: 35, forma: "area", raio: 1.4, fx: "caixaoareia" },
    funeral: { n: "Funeral do Deserto", t: "Terra", p: 135, a: 80, custo: 52, forma: "area", raio: 2.2, fx: "funeral" },
    mente: { n: "Troca de Mentes", t: "Sombra", p: 65, a: 100, custo: 22, foe: { atk: -1 }, chance: 100, forma: "projetil", fx: "mente" },
    destruicao: { n: "Destruição Mental", t: "Sombra", p: 95, a: 95, custo: 30, forma: "projetil", fx: "mente" },
    kikai: { n: "Insetos Destruidores", t: "Sombra", p: 70, a: 100, custo: 15, drain: 0.3, d: "Recupera parte do dano causado.", forma: "projetil", fx: "insetos" },
    muralhainsetos: { n: "Muralha de Insetos", t: "Sombra", p: 0, a: 100, custo: 20, self: { def: 2 }, d: "Aumenta muito a defesa.", fx: "muralhainsetos" },
    enxame: { n: "Enxame Parasita", t: "Sombra", p: 105, a: 90, custo: 35, forma: "area", raio: 1.8, fx: "enxame" },
    presa: { n: "Presa Sobre Presa", t: "Taijutsu", p: 100, a: 90, custo: 30, forma: "investida", giro: true, fx: "gatsuuga" },
    uivo: { n: "Uivo de Akamaru", t: "Taijutsu", p: 0, a: 100, custo: 15, self: { atk: 1, spd: 1 }, d: "Aumenta ataque e velocidade.", fx: "uivo" },
    garouga: { n: "Presa Dupla", t: "Taijutsu", p: 120, a: 85, custo: 38, forma: "investida", giro: true, fx: "garouga" },
  };
  // Ícones locais: o site original oscila e não serve como CDN para o jogo.
  // `imagem` é o nome do arquivo em naruto-sprites/: <imagem>.png (parado) e <imagem>-idle.png (a tira com os `quadros`
  // quadros do "parado"). Eles saem de ferramentas/sprites-naruto.py.
  const BASE = "/galeramon/naruto-sprites/";
  const MONS = {
    naruto: { n: "Naruto", types: ["Vento"], hp: 215, atk: 112, def: 95, spd: 105, moves: ["shuriken", "rasengan", "clones", "odama"], imagem: "98901", quadros: 6, bio: "Clones e Rasengan: pressão constante, mas gasta chakra rápido." },
    sasuke: { n: "Sasuke", types: ["Raio", "Fogo"], hp: 190, atk: 120, def: 85, spd: 120, moves: ["kunai", "chidori", "katon", "sharingan"], imagem: "98908", quadros: 6, bio: "Atacante veloz que combina fogo, raio e Sharingan." },
    sakura: { n: "Sakura", types: ["Medicina", "Taijutsu"], hp: 200, atk: 110, def: 105, spd: 85, moves: ["kunai", "soco", "cura", "impacto"], imagem: "98904", quadros: 6, bio: "Golpes pesados e cura limitada para aguentar a batalha." },
    kakashi: { n: "Kakashi", types: ["Raio", "Terra"], hp: 195, atk: 110, def: 100, spd: 110, moves: ["kunai", "raikiri", "parede", "cachorrada"], imagem: "98897", quadros: 8, bio: "Versátil: ataca com Raikiri e se protege com terra." },
    shikamaru: { n: "Shikamaru", types: ["Sombra"], hp: 185, atk: 90, def: 100, spd: 100, moves: ["shuriken", "sombra", "estrangular", "estrategia"], imagem: "98906", quadros: 7, bio: "Controla a velocidade do rival e prepara o próximo ataque." },
    itachi: { n: "Itachi", types: ["Fogo", "Sombra"], hp: 185, atk: 115, def: 90, spd: 115, moves: ["shuriken", "corvos", "shurikenfogo", "amaterasu"], imagem: "98894", quadros: 4, bio: "Genjutsu enfraquece o rival antes do Amaterasu." },
    kisame: { n: "Kisame", types: ["Água"], hp: 225, atk: 108, def: 110, spd: 75, moves: ["kunai", "suiton", "samehada", "onda"], imagem: "98898", quadros: 4, bio: "Muita vida e Samehada para recuperar energia." },
    deidara: { n: "Deidara", types: ["Terra"], hp: 185, atk: 118, def: 85, spd: 105, moves: ["shuriken", "argila", "c2", "c3"], imagem: "98893", quadros: 8, bio: "Explosões fortes com alto custo de chakra." },
    lee: { n: "Rock Lee", types: ["Taijutsu"], hp: 205, atk: 115, def: 90, spd: 125, moves: ["kunai", "tornado", "lotus", "portoes"], imagem: "98902", quadros: 5, bio: "Taijutsu rápido; abre os portões para atacar ainda mais forte." },
    sai: { n: "Sai", types: ["Sombra"], hp: 190, atk: 98, def: 95, spd: 110, moves: ["kunai", "tinta", "passaro", "pergaminho"], imagem: "98903", quadros: 6, bio: "Desenhos de tinta que pressionam e atrapalham o rival." },
    sasori: { n: "Sasori", types: ["Sombra", "Terra"], hp: 195, atk: 108, def: 105, spd: 80, moves: ["shuriken", "marionete", "veneno", "ferro"], imagem: "98905", quadros: 8, bio: "Marionetes e areia de ferro para desgastar a defesa inimiga." },
    yamato: { n: "Yamato", types: ["Terra"], hp: 205, atk: 100, def: 115, spd: 85, moves: ["kunai", "mokuton", "prisao", "parede"], imagem: "98907", quadros: 6, bio: "Madeira e proteção: segura o avanço do adversário." },
    // a base nova: mais ninjas de Naruto vs. Sasuke, de Ninja Council 4 e dos figurantes do jogo
    jiraiya: { n: "Jiraiya", types: ["Fogo", "Sombra"], hp: 215, atk: 112, def: 98, spd: 90, moves: ["jizo", "oleo", "rasengan", "gama"], imagem: "jiraiya", quadros: 4, bio: "Sábio dos Sapos: óleo em chamas e o sapo gigante para fechar a luta." },
    kabuto: { n: "Kabuto", types: ["Medicina", "Sombra"], hp: 190, atk: 100, def: 95, spd: 108, moves: ["kunai", "bisturi", "cobras", "cura"], imagem: "kabuto", quadros: 8, bio: "Bisturi de chakra e cura: desgasta o rival e se recupera." },
    neji: { n: "Neji", types: ["Taijutsu"], hp: 195, atk: 112, def: 98, spd: 116, moves: ["palma", "kaiten", "byakugan", "hakke"], imagem: "neji", quadros: 6, bio: "Punho Gentil: a Rotação Celestial protege e as 64 Palmas fecham a luta." },
    orochimaru: { n: "Orochimaru", types: ["Sombra"], hp: 205, atk: 110, def: 100, spd: 96, moves: ["cobras", "kusanagi", "muda", "manda"], imagem: "orochimaru", quadros: 4, bio: "Cobras, espada e troca de pele; chama Manda quando precisa decidir." },
    tsunade: { n: "Tsunade", types: ["Medicina", "Taijutsu"], hp: 220, atk: 120, def: 105, spd: 80, moves: ["kunai", "calcanhar", "cura", "impacto"], imagem: "tsunade", quadros: 6, bio: "Força bruta e cura: cada golpe racha o chão." },
    temari: { n: "Temari", types: ["Vento"], hp: 185, atk: 112, def: 90, spd: 108, moves: ["leque", "foice", "danca", "dragaovento"], imagem: "temari", quadros: 8, bio: "O leque gigante domina o campo com lâminas de vento." },
    kankuro: { n: "Kankurō", types: ["Sombra"], hp: 195, atk: 100, def: 102, spd: 92, moves: ["kunai", "marionete", "veneno", "sansho"], imagem: "kankuro", quadros: 6, bio: "Marionetes e veneno para enfraquecer o inimigo de longe." },
    guy: { n: "Might Guy", types: ["Taijutsu"], hp: 225, atk: 122, def: 98, spd: 120, moves: ["kunai", "tornado", "portoes", "tigre"], imagem: "guy", quadros: 6, bio: "Mestre do taijutsu: abre os portões e solta o Tigre Diurno." },
    tenten: { n: "Tenten", types: ["Taijutsu"], hp: 185, atk: 106, def: 88, spd: 106, moves: ["shuriken", "chuva", "dragaoarmas", "pergaminho"], imagem: "tenten", quadros: 6, bio: "Arsenal de pergaminhos: chuva de armas e o Dragão Ascendente." },
    gaara: { n: "Gaara", types: ["Terra"], hp: 215, atk: 108, def: 118, spd: 80, moves: ["escudoareia", "maoareia", "caixao", "funeral"], imagem: "gaara", quadros: 6, bio: "A areia protege e prende; o Funeral do Deserto termina a luta." },
    ino: { n: "Ino", types: ["Sombra"], hp: 180, atk: 92, def: 88, spd: 100, moves: ["kunai", "mente", "destruicao", "cura"], imagem: "ino", quadros: 8, bio: "Ataca a mente do rival e ainda cura a si mesma." },
    shino: { n: "Shino", types: ["Terra", "Sombra"], hp: 195, atk: 96, def: 108, spd: 92, moves: ["kunai", "kikai", "muralhainsetos", "enxame"], imagem: "shino", quadros: 8, bio: "Insetos que sugam chakra e fazem uma muralha viva." },
    kiba: { n: "Kiba", types: ["Taijutsu"], hp: 195, atk: 108, def: 92, spd: 114, moves: ["kunai", "presa", "uivo", "garouga"], imagem: "kiba", quadros: 7, bio: "Ao lado de Akamaru, gira em investidas rápidas." },
  };
  const IDS = Object.keys(MONS);
  const TEAM_SIZE = 3, DEFAULT_TEAM = ["naruto", "sakura", "kakashi"];
  function cleanTeam(t) {
    const out = [];
    for (const id of Array.isArray(t) ? t : []) if (Object.hasOwn(MONS, id) && !out.includes(id)) out.push(id);
    return out.length === TEAM_SIZE ? out : DEFAULT_TEAM.slice();
  }
  const sprite = (id) => Object.hasOwn(MONS, id) ? `${BASE}${MONS[id].imagem}.png` : "";
  // a tira com os quadros do "parado" (um ao lado do outro); vazio se o ninja não tiver
  const animacao = (id) => Object.hasOwn(MONS, id) && MONS[id].quadros > 1 ? `${BASE}${MONS[id].imagem}-idle.png` : "";
  // os dados da base (vila, clã, patente, jutsus) e uma linha pronta para mostrar na escolha do ninja
  const perfil = (id) => (Object.hasOwn(BASE_DADOS, id) ? BASE_DADOS[id] : null);
  function ficha(id) {
    const b = perfil(id);
    if (!b) return "";
    return [b.afiliacoes.slice(0, 2).join(" / "), b.cla && `Clã ${b.cla}`, b.patente].filter(Boolean).join(" · ");
  }
  const stageMult = (s) => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  const STAT_NAMES = { atk: "ataque", def: "defesa", spd: "velocidade" };
  return { TYPES, CHART, MOVES, MONS, IDS, TEAM_SIZE, DEFAULT_TEAM, STAT_NAMES, effect, cleanTeam, stageMult, sprite, animacao, perfil, ficha, CHAKRA_MAX: 100, CHAKRA_START: 60 };
});
