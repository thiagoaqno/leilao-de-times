// Os líderes de ginásio e os treinadores da Vila: cada um com o seu tipo e o time de 3 nos três
// modos. Os líderes ficam nos ginásios perto dos estacionamentos de saída da Vila; os treinadores ficam pelas ruas e
// pela praça. Desafiar qualquer um abre o Ginásio em tempo real contra o time dele. Vencer um líder dá a insígnia.
// Usado pelo servidor do Ginásio (os robôs), pela página do Ginásio e pela Vila (os prédios e os treinadores no mapa).
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Lideres = factory();
})(typeof self !== "undefined" ? self : this, function () {
  // id, nome, tipo, cor, frase, times { galeramon, pokemon, naruto }, onde (ginasio ou rua), look (a roupa do boneco na Vila)
  const LISTA = [
    { id: "brasa", nome: "Líder Brasa", tipo: "Fogo", cor: "#ee6a2c", cor2: "#ffd34d", simbolo: "fogo", onde: "ginasio", look: 3,
      frase: "Aqui dentro faz 40 graus. Aguenta?", times: { galeramon: ["churrasquilo", "micoleao", "boitata"], pokemon: ["arcanine", "typhlosion", "charizard"] } },
    { id: "mare", nome: "Líder Maré", tipo: "Água", cor: "#3f86e0", cor2: "#bfe4ff", simbolo: "torneira", onde: "ginasio", look: 1,
      frase: "Quem não sabe nadar, afunda.", times: { galeramon: ["sirizao", "jacareu", "botoso"], pokemon: ["gyarados", "lapras", "starmie"] } },
    { id: "mata", nome: "Líder Mata", tipo: "Grama", cor: "#4cb04a", cor2: "#d8f5a2", simbolo: "estrela", onde: "ginasio", look: 2,
      frase: "Minhas plantas crescem com cada golpe que você erra.", times: { galeramon: ["caipirito", "sucurri", "preguicudo"], pokemon: ["sceptile", "roserade", "venusaur"] } },
    { id: "faisca", nome: "Líder Faísca", tipo: "Elétrico", cor: "#e9b914", cor2: "#fff5b0", simbolo: "raio", onde: "ginasio", look: 4,
      frase: "Rápido demais para você piscar.", times: { galeramon: ["pasteletrico", "loboguarana", "tucanudo"], pokemon: ["jolteon", "magnezone", "raichu"] } },
    { id: "rochedo", nome: "Treinador Rochedo", tipo: "Pedra", cor: "#a08a56", onde: "rua", look: 5, x: 6, y: 25,
      frase: "Daqui eu não saio. Passa por mim, se for capaz.", times: { galeramon: ["pedrolho", "tatubala", "jacareu"], pokemon: ["golem", "tyranitar", "aerodactyl"] } },
    { id: "mistica", nome: "Treinadora Mística", tipo: "Psíquico", cor: "#e0529c", onde: "rua", look: 0, x: 12, y: 19,
      frase: "Eu já sei o golpe que você vai usar.", times: { galeramon: ["saci", "fofocaio", "botoso"], pokemon: ["alakazam", "espeon", "gardevoir"] } },
    { id: "assombra", nome: "Treinador Assombração", tipo: "Fantasma", cor: "#705898", onde: "rua", look: 2, x: 36, y: 23,
      frase: "Uuuuh... ninguém volta da praça depois de escurecer.", times: { galeramon: ["boitata", "saci", "sucurri"], pokemon: ["gengar", "mismagius", "dusknoir"] } },
    { id: "escama", nome: "Treinadora Escama", tipo: "Dragão", cor: "#7038f8", onde: "rua", look: 4, x: 17, y: 24,
      frase: "Dragões não pedem licença.", times: { galeramon: ["jacareu", "boitata", "micoleao"], pokemon: ["dragonite", "salamence", "garchomp"] } },
    { id: "punho", nome: "Treinador Punho", tipo: "Lutador", cor: "#c03028", onde: "rua", look: 3, x: 30, y: 25,
      frase: "Treino desde as cinco da manhã. E você?", times: { galeramon: ["oncarada", "capivarao", "tatubala"], pokemon: ["machamp", "lucario", "hitmonlee"] } },
    { id: "geada", nome: "Treinadora Geada", tipo: "Gelo", cor: "#78c8c8", onde: "rua", look: 1, x: 29, y: 9,
      frase: "Vou congelar esse seu sorriso.", times: { galeramon: ["sirizao", "caipirito", "botoso"], pokemon: ["glaceon", "mamoswine", "lapras"] } },
  ];
  const TIMES_NARUTO = {
    brasa: ["sasuke", "itachi", "kakashi"], mare: ["kisame", "yamato", "sai"],
    mata: ["yamato", "sakura", "naruto"], faisca: ["kakashi", "sasuke", "lee"],
    rochedo: ["deidara", "sasori", "yamato"], mistica: ["itachi", "shikamaru", "sai"],
    assombra: ["itachi", "shikamaru", "sasori"], escama: ["naruto", "sasuke", "deidara"],
    punho: ["lee", "sakura", "kakashi"], geada: ["kisame", "sai", "sakura"],
  };
  for (const lider of LISTA) lider.times.naruto = TIMES_NARUTO[lider.id];
  const POR_ID = Object.fromEntries(LISTA.map((l) => [l.id, l]));
  const de = (id) => POR_ID[id] || null;
  // o time de um robô qualquer (sem líder): um dos times temáticos, sorteado (antes era sempre o de fogo)
  const timeDeRobo = (modo, sorte) => LISTA[Math.floor(sorte() * LISTA.length)].times[modo].slice();
  return { LISTA, de, timeDeRobo, GINASIOS: LISTA.filter((l) => l.onde === "ginasio"), TREINADORES: LISTA.filter((l) => l.onde === "rua") };
});
