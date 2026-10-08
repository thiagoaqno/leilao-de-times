// Naruto Shippuden — elenco e jutsus da batalha por turnos na Vila.
// Imagens: prévias dos sprites de Naruto Shippuden: Naruto vs. Sasuke (DS),
// preservados pelo The Spriters Resource. Créditos: public/galeramon/NARUTO-ASSETS.md.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NarutoDex = factory();
})(typeof self !== "undefined" ? self : this, function () {
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
  const MOVES = {
    shuriken: { n: "Shuriken", t: "Taijutsu", p: 48, a: 100, custo: 0 },
    kunai: { n: "Kunai", t: "Taijutsu", p: 55, a: 100, custo: 0 },
    rasengan: { n: "Rasengan", t: "Vento", p: 95, a: 95, custo: 30 },
    clones: { n: "Clones das Sombras", t: "Sombra", p: 0, a: 100, custo: 20, self: { spd: 1, def: 1 }, d: "Aumenta velocidade e defesa." },
    odama: { n: "Ōdama Rasengan", t: "Vento", p: 125, a: 85, custo: 45 },
    chidori: { n: "Chidori", t: "Raio", p: 105, a: 90, custo: 35 },
    katon: { n: "Bola de Fogo", t: "Fogo", p: 80, a: 100, custo: 20 },
    sharingan: { n: "Sharingan", t: "Sombra", p: 0, a: 100, custo: 20, self: { atk: 1, spd: 1 }, d: "Aumenta ataque e velocidade." },
    kirin: { n: "Kirin", t: "Raio", p: 130, a: 80, custo: 50 },
    soco: { n: "Soco Concentrado", t: "Taijutsu", p: 88, a: 95, custo: 18 },
    cura: { n: "Ninjutsu Médico", t: "Medicina", p: 0, a: 100, custo: 30, heal: 0.4, max: 2, d: "Recupera 40% da vida; duas vezes por luta." },
    impacto: { n: "Impacto da Cerejeira", t: "Taijutsu", p: 115, a: 85, custo: 35 },
    raikiri: { n: "Raikiri", t: "Raio", p: 108, a: 90, custo: 38 },
    parede: { n: "Parede de Terra", t: "Terra", p: 0, a: 100, custo: 20, self: { def: 2 }, d: "Aumenta muito a defesa." },
    cachorrada: { n: "Invocação Ninja", t: "Taijutsu", p: 75, a: 100, custo: 20, foe: { spd: -1 }, chance: 60 },
    sombra: { n: "Possessão da Sombra", t: "Sombra", p: 65, a: 95, custo: 25, foe: { spd: -1 }, chance: 100 },
    estrangular: { n: "Estrangulamento", t: "Sombra", p: 100, a: 90, custo: 35 },
    estrategia: { n: "Estratégia", t: "Sombra", p: 0, a: 100, custo: 15, self: { atk: 1, def: 1 } },
    corvos: { n: "Genjutsu dos Corvos", t: "Sombra", p: 65, a: 100, custo: 25, foe: { atk: -1 }, chance: 100 },
    amaterasu: { n: "Amaterasu", t: "Fogo", p: 120, a: 85, custo: 45 },
    shurikenfogo: { n: "Shuriken Flamejante", t: "Fogo", p: 75, a: 100, custo: 20 },
    suiton: { n: "Tubarão de Água", t: "Água", p: 95, a: 95, custo: 30 },
    samehada: { n: "Samehada", t: "Taijutsu", p: 75, a: 100, custo: 15, drain: 0.35, d: "Recupera parte do dano causado." },
    onda: { n: "Grande Onda", t: "Água", p: 115, a: 85, custo: 40 },
    argila: { n: "Aranha de Argila", t: "Terra", p: 75, a: 100, custo: 20 },
    c2: { n: "Dragão C2", t: "Terra", p: 110, a: 90, custo: 35 },
    c3: { n: "Explosão C3", t: "Terra", p: 130, a: 75, custo: 50 },
    lotus: { n: "Lótus Frontal", t: "Taijutsu", p: 100, a: 90, custo: 30 },
    portoes: { n: "Portões Internos", t: "Taijutsu", p: 0, a: 100, custo: 25, self: { atk: 2, spd: 1 }, d: "Aumenta muito o ataque e a velocidade." },
    tornado: { n: "Tornado da Folha", t: "Taijutsu", p: 72, a: 100, custo: 15, pri: 1 },
    tinta: { n: "Feras de Tinta", t: "Sombra", p: 82, a: 100, custo: 25 },
    passaro: { n: "Pássaro de Tinta", t: "Sombra", p: 70, a: 100, custo: 18, foe: { spd: -1 }, chance: 60 },
    pergaminho: { n: "Pergaminho", t: "Sombra", p: 0, a: 100, custo: 15, self: { def: 1, spd: 1 } },
    marionete: { n: "Marionete", t: "Sombra", p: 85, a: 100, custo: 25 },
    veneno: { n: "Agulhas Venenosas", t: "Taijutsu", p: 70, a: 100, custo: 18, foe: { def: -1 }, chance: 100 },
    ferro: { n: "Areia de Ferro", t: "Terra", p: 110, a: 85, custo: 38 },
    mokuton: { n: "Liberação de Madeira", t: "Terra", p: 90, a: 95, custo: 28 },
    prisao: { n: "Prisão de Madeira", t: "Terra", p: 65, a: 100, custo: 22, foe: { spd: -1 }, chance: 100 },
  };
  // Ícones locais: o site original oscila e não serve como CDN para o jogo.
  const BASE = "/galeramon/naruto-sprites/";
  const MONS = {
    naruto: { n: "Naruto", types: ["Vento"], hp: 215, atk: 112, def: 95, spd: 105, moves: ["shuriken", "rasengan", "clones", "odama"], imagem: 98901, bio: "Clones e Rasengan: pressão constante, mas gasta chakra rápido." },
    sasuke: { n: "Sasuke", types: ["Raio", "Fogo"], hp: 190, atk: 120, def: 85, spd: 120, moves: ["kunai", "chidori", "katon", "sharingan"], imagem: 98908, bio: "Atacante veloz que combina fogo, raio e Sharingan." },
    sakura: { n: "Sakura", types: ["Medicina", "Taijutsu"], hp: 200, atk: 110, def: 105, spd: 85, moves: ["kunai", "soco", "cura", "impacto"], imagem: 98904, bio: "Golpes pesados e cura limitada para aguentar a batalha." },
    kakashi: { n: "Kakashi", types: ["Raio", "Terra"], hp: 195, atk: 110, def: 100, spd: 110, moves: ["kunai", "raikiri", "parede", "cachorrada"], imagem: 98897, bio: "Versátil: ataca com Raikiri e se protege com terra." },
    shikamaru: { n: "Shikamaru", types: ["Sombra"], hp: 185, atk: 90, def: 100, spd: 100, moves: ["shuriken", "sombra", "estrangular", "estrategia"], imagem: 98906, bio: "Controla a velocidade do rival e prepara o próximo ataque." },
    itachi: { n: "Itachi", types: ["Fogo", "Sombra"], hp: 185, atk: 115, def: 90, spd: 115, moves: ["shuriken", "corvos", "shurikenfogo", "amaterasu"], imagem: 98894, bio: "Genjutsu enfraquece o rival antes do Amaterasu." },
    kisame: { n: "Kisame", types: ["Água"], hp: 225, atk: 108, def: 110, spd: 75, moves: ["kunai", "suiton", "samehada", "onda"], imagem: 98898, bio: "Muita vida e Samehada para recuperar energia." },
    deidara: { n: "Deidara", types: ["Terra"], hp: 185, atk: 118, def: 85, spd: 105, moves: ["shuriken", "argila", "c2", "c3"], imagem: 98893, bio: "Explosões fortes com alto custo de chakra." },
    lee: { n: "Rock Lee", types: ["Taijutsu"], hp: 205, atk: 115, def: 90, spd: 125, moves: ["kunai", "tornado", "lotus", "portoes"], imagem: 98902, bio: "Taijutsu rápido; abre os portões para atacar ainda mais forte." },
    sai: { n: "Sai", types: ["Sombra"], hp: 190, atk: 98, def: 95, spd: 110, moves: ["kunai", "tinta", "passaro", "pergaminho"], imagem: 98903, bio: "Desenhos de tinta que pressionam e atrapalham o rival." },
    sasori: { n: "Sasori", types: ["Sombra", "Terra"], hp: 195, atk: 108, def: 105, spd: 80, moves: ["shuriken", "marionete", "veneno", "ferro"], imagem: 98905, bio: "Marionetes e areia de ferro para desgastar a defesa inimiga." },
    yamato: { n: "Yamato", types: ["Terra"], hp: 205, atk: 100, def: 115, spd: 85, moves: ["kunai", "mokuton", "prisao", "parede"], imagem: 98907, bio: "Madeira e proteção: segura o avanço do adversário." },
  };
  const IDS = Object.keys(MONS);
  const TEAM_SIZE = 3, DEFAULT_TEAM = ["naruto", "sakura", "kakashi"];
  function cleanTeam(t) {
    const out = [];
    for (const id of Array.isArray(t) ? t : []) if (Object.hasOwn(MONS, id) && !out.includes(id)) out.push(id);
    return out.length === TEAM_SIZE ? out : DEFAULT_TEAM.slice();
  }
  const sprite = (id) => Object.hasOwn(MONS, id) ? `${BASE}${MONS[id].imagem}.png` : "";
  const stageMult = (s) => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  const STAT_NAMES = { atk: "ataque", def: "defesa", spd: "velocidade" };
  return { TYPES, CHART, MOVES, MONS, IDS, TEAM_SIZE, DEFAULT_TEAM, STAT_NAMES, effect, cleanTeam, stageMult, sprite, CHAKRA_MAX: 100, CHAKRA_START: 60 };
});
