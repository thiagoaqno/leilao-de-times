// A grama alta da Vila, no Parque Trianon: andando nela aparecem Pokémon selvagens, e a Pokébola é infinita.
// UMD: o servidor (vila-mato.js) sorteia e decide; a página (public/index.html) desenha a grama e a cena do encontro.
// - GRAMA: o retângulo da grama alta, em coordenadas da vila (somar OX e OY para o mapa grande);
// - RARIDADES: o peso no sorteio do encontro, a chance de o Pokémon fugir depois de escapar da Pokébola e a cor do
//   selo. A raridade de cada Pokémon sai da soma dos atributos base (os lendários e míticos à parte); o nível de quem
//   aparece, da raridade (Niveis.nivelSelvagem). A chance da Pokébola é a da PokéAPI (Niveis.chanceDeCaptura): quanto
//   menos vida, mais fácil.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../galeramon/pokemon.js"), require("../galeramon/niveis.js"));
  else root.MatoAlto = factory(root.PokeDex, root.Niveis);
})(typeof self !== "undefined" ? self : this, function (PokeDex, Niveis) {
  const GRAMA = { x: 27, y: 11, w: 16, h: 4 };
  // todo treinador já começa com os três iniciais (a sala do Ginásio com "só capturados" aceita eles sempre)
  const INICIAIS = ["bulbasaur", "charmander", "squirtle"];
  const CHANCE_ENCONTRO = 0.16; // por passo na grama
  const CHANCE_BRILHANTE = 1 / 80;
  const RARIDADES = {
    comum: { nome: "Comum", peso: 55, foge: 0.05, cor: "#9aa8a3" },
    incomum: { nome: "Incomum", peso: 28, foge: 0.1, cor: "#4fbf6a" },
    raro: { nome: "Raro", peso: 12, foge: 0.15, cor: "#3f8fe0" },
    epico: { nome: "Épico", peso: 4, foge: 0.25, cor: "#b45cf0" },
    lendario: { nome: "Lendário", peso: 1, foge: 0.35, cor: "#f0b429" },
  };
  const ORDEM = ["comum", "incomum", "raro", "epico", "lendario"];
  // lendários e míticos, pelo número da Pokédex
  const LENDARIOS = new Set([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649]);
  const totalBase = (m) => (m.base || []).reduce((a, b) => a + b, 0);
  function raridadeDe(id) {
    const m = PokeDex.MONS[id];
    if (!m) return null;
    if (LENDARIOS.has(m.num)) return "lendario";
    const t = totalBase(m);
    return t >= 520 ? "epico" : t >= 460 ? "raro" : t >= 360 ? "incomum" : "comum";
  }
  const POR_RARIDADE = {};
  for (const id of PokeDex.IDS) (POR_RARIDADE[raridadeDe(id)] = POR_RARIDADE[raridadeDe(id)] || []).push(id);
  const naGrama = (x, y) => x >= GRAMA.x && x < GRAMA.x + GRAMA.w && y >= GRAMA.y && y < GRAMA.y + GRAMA.h;
  // o encontro: a raridade pelo peso, depois um Pokémon dela; sorte() de 0 a 1
  function sortearEncontro(sorte = Math.random) {
    let n = sorte() * ORDEM.reduce((s, r) => s + RARIDADES[r].peso, 0), raridade = ORDEM[0];
    for (const r of ORDEM) { n -= RARIDADES[r].peso; if (n < 0) { raridade = r; break; } }
    const lista = POR_RARIDADE[raridade];
    const bicho = lista[Math.floor(sorte() * lista.length)], brilhante = sorte() < CHANCE_BRILHANTE, nivel = Niveis.nivelSelvagem(raridade, sorte);
    const max = Niveis.atributos(bicho, nivel).hp;
    return { bicho, raridade, brilhante, nivel, hp: max, max };
  }
  // a Pokébola na grama (fora da luta): pega pela chance da PokéAPI; escapando, o Pokémon pode fugir (pela raridade)
  function jogarPokebola(encontro, sorte = Math.random) {
    const chance = Niveis.chanceDeCaptura(encontro), j = Niveis.jogarPokebola(chance, sorte);
    const resultado = j.pegou ? "pegou" : sorte() < (RARIDADES[encontro.raridade] || RARIDADES.comum).foge ? "fugiu" : "escapou";
    return { resultado, balancos: j.balancos, chance };
  }
  return { GRAMA, INICIAIS, CHANCE_ENCONTRO, CHANCE_BRILHANTE, RARIDADES, ORDEM, LENDARIOS, POR_RARIDADE, raridadeDe, naGrama, sortearEncontro, jogarPokebola, totalBase };
});
