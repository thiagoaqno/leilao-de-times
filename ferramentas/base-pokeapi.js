// Gera public/galeramon/pokeapi-dados.js com o que a PokéAPI sabe de cada Pokémon da nossa Pokédex (até o nº 649):
// - cresc: o ritmo de crescimento (a tabela de experiência de cada nível, CRESCIMENTO);
// - xp: a experiência base, que dá a experiência de quem vence esse Pokémon;
// - taxa: a taxa de captura (3 a 255), da fórmula da Pokébola;
// - evolui: [{ para, nivel, como }]. "como" diz o jeito no jogo original (nível, pedra, troca, amizade...); quem não
//   evolui por nível ganha um nível de reserva (NIVEL_RESERVA), senão nunca evoluiria aqui.
// Os dados vêm dos CSV oficiais do repositório da PokéAPI no GitHub (a mesma base da API).
// Rodar: node ferramentas/base-pokeapi.js
const fs = require("fs");
const path = require("path");
const PokeDex = require("../public/galeramon/pokemon.js");

const BASE = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/";
const ULTIMO = 649;
const RITMOS = { 1: "lento", 2: "medio", 3: "rapido", 4: "medio-lento", 5: "erratico", 6: "flutuante" };
// quem não evolui por nível no jogo original evolui aqui num nível de reserva (sempre depois da evolução anterior)
const NIVEL_RESERVA = { pedra: 30, troca: 36, amizade: 22, outro: 32 };
const PEDRAS = {
  "fire-stone": "Pedra do Fogo", "water-stone": "Pedra da Água", "thunder-stone": "Pedra do Trovão", "leaf-stone": "Pedra da Folha",
  "moon-stone": "Pedra da Lua", "sun-stone": "Pedra do Sol", "shiny-stone": "Pedra Brilhante", "dusk-stone": "Pedra do Crepúsculo",
  "dawn-stone": "Pedra da Alvorada", "oval-stone": "Pedra Oval", "ice-stone": "Pedra do Gelo",
};

function lerCsv(texto) {
  const linhas = [];
  let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) { if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c; continue; }
    if (c === '"') aspas = true;
    else if (c === ",") { linha.push(campo); campo = ""; }
    else if (c === "\n") { linha.push(campo); linhas.push(linha); linha = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
  const [cab, ...resto] = linhas;
  return resto.filter((l) => l.length > 1).map((l) => Object.fromEntries(cab.map((k, i) => [k, l[i]])));
}
async function baixar(nome) {
  const r = await fetch(BASE + nome + ".csv");
  if (!r.ok) throw new Error(`${nome}: ${r.status}`);
  return lerCsv(await r.text());
}

(async () => {
  const [especies, evolucoes, experiencia, pokemons, itens] = await Promise.all(["pokemon_species", "pokemon_evolution", "experience", "pokemon", "items"].map(baixar));
  const idPorNum = new Map(PokeDex.IDS.map((id) => [PokeDex.MONS[id].num, id]));
  const item = new Map(itens.map((i) => [i.id, i.identifier]));
  const xpBase = new Map(pokemons.filter((p) => p.is_default === "1").map((p) => [p.species_id, +p.base_experience || 0]));
  const especie = new Map(especies.map((e) => [e.id, e]));
  // o jeito de cada evolução: prefere a linha com nível mínimo (quando a espécie tem várias)
  const regraDe = new Map();
  for (const ev of evolucoes) {
    const atual = regraDe.get(ev.evolved_species_id);
    if (!atual || (!atual.minimum_level && ev.minimum_level)) regraDe.set(ev.evolved_species_id, ev);
  }
  const como = (ev) => {
    if (!ev) return { tipo: "outro", texto: "outro jeito" };
    if (ev.minimum_level) return { tipo: "nivel", texto: "nível", nivel: +ev.minimum_level };
    if (ev.evolution_trigger_id === "3") { const p = item.get(ev.trigger_item_id); return { tipo: "pedra", texto: PEDRAS[p] || p || "item" }; }
    if (ev.evolution_trigger_id === "2") return { tipo: "troca", texto: "troca" };
    if (ev.minimum_happiness) return { tipo: "amizade", texto: "amizade" };
    return { tipo: "outro", texto: "outro jeito" };
  };
  const dados = {};
  // primeiro o nível de cada evolução (a reserva precisa do nível da evolução anterior)
  const nivelDe = new Map();
  const calcular = (sid) => {
    if (nivelDe.has(sid)) return nivelDe.get(sid);
    const e = especie.get(sid), c = como(regraDe.get(sid));
    const antes = e.evolves_from_species_id && especie.get(e.evolves_from_species_id).evolves_from_species_id ? calcular(e.evolves_from_species_id) : 0;
    const n = c.nivel || Math.max(NIVEL_RESERVA[c.tipo] || NIVEL_RESERVA.outro, antes + 6);
    nivelDe.set(sid, n);
    return n;
  };
  for (let num = 1; num <= ULTIMO; num++) {
    const id = idPorNum.get(num); if (!id) continue;
    const e = especie.get(String(num));
    dados[id] = { cresc: +e.growth_rate_id, xp: xpBase.get(String(num)) || 60, taxa: +e.capture_rate, evolui: [] };
  }
  for (const e of especies) {
    if (!e.evolves_from_species_id || +e.id > ULTIMO || +e.evolves_from_species_id > ULTIMO) continue;
    const de = idPorNum.get(+e.evolves_from_species_id), para = idPorNum.get(+e.id);
    if (!de || !para) continue;
    const c = como(regraDe.get(e.id));
    dados[de].evolui.push({ para, nivel: calcular(e.id), como: c.texto });
  }
  for (const d of Object.values(dados)) if (!d.evolui.length) delete d.evolui;
  // a experiência total de cada nível (1 a 100), por ritmo
  const tabelas = {};
  for (const x of experiencia) (tabelas[RITMOS[x.growth_rate_id]] ||= [])[+x.level - 1] = +x.experience;
  for (const d of Object.values(dados)) d.cresc = RITMOS[d.cresc];
  const saida = `// GERADO por ferramentas/base-pokeapi.js a partir dos CSV da PokéAPI (github.com/PokeAPI/pokeapi). Não editar à mão.
// Por Pokémon: cresc (ritmo de crescimento), xp (experiência base), taxa (taxa de captura) e evolui ([{ para, nivel, como }]).
// CRESCIMENTO: a experiência total de cada nível (índice 0 = nível 1), por ritmo.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PokeApiDados = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const CRESCIMENTO = ${JSON.stringify(tabelas)};
  const POKEMON = ${JSON.stringify(dados)};
  return { CRESCIMENTO, POKEMON };
});
`;
  fs.writeFileSync(path.join(__dirname, "..", "public", "galeramon", "pokeapi-dados.js"), saida);
  console.log(`pokeapi-dados.js: ${Object.keys(dados).length} Pokémon, ${Object.values(dados).filter((d) => d.evolui).length} evoluem`);
})().catch((e) => { console.error(e); process.exit(1); });
