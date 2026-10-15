// A grama alta da Vila: as regras (public/vila/mato.js), o servidor (vila-mato.js, com um socket de mentira) e o
// banco (bd.js: guardarCaptura, capturasDe, rankingCapturas).
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Mato = require("../public/vila/mato.js");
const PokeDex = require("../public/galeramon/pokemon.js");
const bd = require("../bd.js");
const ligarMato = require("../vila-mato.js");
const Niveis = require("../public/galeramon/niveis.js");

const OX = 131, OY = 100;
const fila = (...n) => { const l = [...n]; return () => (l.length ? l.shift() : 0.5); };
function socketDeMentira() {
  const ouvintes = {};
  return { on: (ev, f) => { ouvintes[ev] = f; }, pedir: (ev, d) => new Promise((ok) => (ev === "fugir" ? ouvintes[ev](ok) : ouvintes[ev](d, ok))) };
}
function jogador(x = Mato.GRAMA.x + 1, y = Mato.GRAMA.y + 1) {
  const s = socketDeMentira(), eu = { name: "Ash", x: x + OX, y: y + OY }, noticias = [];
  ligarMato(s, { eu: () => eu, noticia: (t) => noticias.push(t), OX, OY });
  return { s, eu, noticias };
}
const CODIGO = "0123456789abcdef0123456789abcdef";
test.afterEach(() => ligarMato.trocarSorte(null));

test("mato: todo Pokémon tem raridade, os lendários são lendários e o peso soma 100", () => {
  for (const id of PokeDex.IDS) assert.ok(Mato.ORDEM.includes(Mato.raridadeDe(id)), id);
  for (const id of ["mewtwo", "mew", "lugia", "rayquaza", "arceus", "victini", "zekrom"]) assert.strictEqual(Mato.raridadeDe(id), "lendario", id);
  assert.strictEqual(Mato.raridadeDe("caterpie"), "comum");
  assert.strictEqual(Mato.raridadeDe("dragonite"), "epico");
  assert.strictEqual(Mato.ORDEM.reduce((s, r) => s + Mato.RARIDADES[r].peso, 0), 100);
  // quanto mais raro, menos aparece, mais fácil de fugir e com nível mais alto
  for (let i = 1; i < Mato.ORDEM.length; i++) {
    const a = Mato.RARIDADES[Mato.ORDEM[i - 1]], b = Mato.RARIDADES[Mato.ORDEM[i]];
    assert.ok(b.foge > a.foge && b.peso < a.peso);
    assert.ok(Niveis.NIVEL_SELVAGEM[Mato.ORDEM[i]][0] > Niveis.NIVEL_SELVAGEM[Mato.ORDEM[i - 1]][0]);
  }
});

test("mato: o sorteio segue o peso de cada raridade", () => {
  let n = 0;
  const sorte = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const conta = {};
  for (let i = 0; i < 20000; i++) { const e = Mato.sortearEncontro(sorte); conta[e.raridade] = (conta[e.raridade] || 0) + 1; assert.strictEqual(Mato.raridadeDe(e.bicho), e.raridade); }
  for (const r of Mato.ORDEM) assert.ok(Math.abs(conta[r] / 20000 - Mato.RARIDADES[r].peso / 100) < 0.02, `${r}: ${conta[r]}`);
});

test("mato: o encontro vem com nível e vida cheia; a Pokébola usa a chance da PokéAPI e, escapando, ele pode fugir", () => {
  const e = Mato.sortearEncontro(fila(0.2, 0, 0.9, 0.5));
  assert.strictEqual(e.raridade, "comum"); assert.ok(e.nivel >= 3 && e.nivel <= 12);
  assert.strictEqual(e.hp, e.max); assert.strictEqual(e.max, Niveis.atributos(e.bicho, e.nivel).hp);
  assert.strictEqual(Mato.jogarPokebola(e, fila(0, 0, 0, 0)).resultado, "pegou");
  const escapou = Mato.jogarPokebola(e, fila(0.999, 0.9));
  assert.deepStrictEqual([escapou.resultado, escapou.balancos], ["escapou", 0]);
  assert.strictEqual(Mato.jogarPokebola(e, fila(0.999, 0.01)).resultado, "fugiu");
  assert.ok(Math.abs(Mato.jogarPokebola(e, fila(0.999, 0.9)).chance - Niveis.chanceDeCaptura(e)) < 1e-12);
});

test("mato: o encontro só sai na grama e com o passo; a Pokébola é infinita e a captura vai para o banco", async () => {
  bd.abrir(":memory:");
  const fora = jogador(Mato.GRAMA.x - 3, Mato.GRAMA.y);
  ligarMato.trocarSorte(() => 0);
  assert.strictEqual((await fora.s.pedir("mato", { codigo: CODIGO })).encontro, undefined, "fora da grama, nada");
  const { s, noticias } = jogador();
  assert.strictEqual((await s.pedir("mato", {})).ok, false, "sem treinador, nada");
  // passo sem encontro, depois um encontro (o servidor espera o tempo de um passo)
  ligarMato.trocarSorte(fila(0.99));
  assert.strictEqual((await s.pedir("mato", { codigo: CODIGO })).encontro, undefined);
  await new Promise((ok) => setTimeout(ok, 200));
  ligarMato.trocarSorte(fila(0.01, 0.999, 0, 0.5, 0)); // encontro; raridade: lendário; o primeiro da lista; não brilhante; nível 45
  const { encontro } = await s.pedir("mato", { codigo: CODIGO });
  assert.strictEqual(encontro.raridade, "lendario");
  assert.strictEqual(encontro.nivel, 45); assert.ok(encontro.chance > 0 && encontro.chance < 0.05, "lendário com vida cheia: quase impossível");
  assert.strictEqual(encontro.bicho, Mato.POR_RARIDADE.lendario[0]);
  assert.deepStrictEqual((await s.pedir("mato", { codigo: CODIGO })).encontro.bicho, encontro.bicho, "o mesmo encontro até acabar");
  // escapa duas vezes (a bola não acaba) e pega na terceira
  for (let i = 0; i < 2; i++) { ligarMato.trocarSorte(fila(0.99, 0.9)); assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).resultado, "escapou"); }
  ligarMato.trocarSorte(fila(0, 0, 0, 0));
  const r = await s.pedir("pokebola", { codigo: CODIGO });
  assert.strictEqual(r.resultado, "pegou"); assert.strictEqual(r.encontro.bolas, 3);
  assert.ok(noticias.some((t) => t.includes("Ash") && t.includes("lendário")), "o lendário vira notícia na vila");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false, "acabou o encontro");
  const dex = await s.pedir("pokedex", { codigo: CODIGO });
  assert.strictEqual(dex.total, PokeDex.IDS.length);
  // os iniciais vêm de graça, no nível 5; o capturado, com o nível do encontro
  const meus = dex.pokemons.map((p) => [p.bicho, p.nivel, p.origem]);
  assert.deepStrictEqual(meus.filter((p) => p[2] === "inicial").map((p) => p[0]).sort(), Mato.INICIAIS.slice().sort());
  assert.deepStrictEqual(meus.find((p) => p[0] === encontro.bicho), [encontro.bicho, 45, "captura"]);
  assert.ok(dex.pokemons.find((p) => p.bicho === "charmander").evolui, "a próxima evolução vai junto");
  assert.strictEqual(dex.especies.length, 4);
  assert.deepStrictEqual(dex.ranking, [{ nome: "Ash", especies: 4, total: 1 }]);
  // outro treinador não vê a coleção de ninguém: só os iniciais dele
  assert.deepStrictEqual((await s.pedir("pokedex", { codigo: "f".repeat(32) })).pokemons.map((c) => c.bicho).sort(), Mato.INICIAIS.slice().sort());
  assert.deepStrictEqual([...ligarMato.colecaoDe(null).keys()].sort(), Mato.INICIAIS.slice().sort());
});

test("mato: o Pokémon pode fugir, e fugir fecha o encontro", async () => {
  bd.abrir(":memory:");
  const { s } = jogador();
  ligarMato.trocarSorte(fila(0.01, 0.01, 0, 0.5));
  assert.ok((await s.pedir("mato", { codigo: CODIGO })).encontro);
  ligarMato.trocarSorte(fila(0.999, 0.01));
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).resultado, "fugiu");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false);
  await new Promise((ok) => setTimeout(ok, 200));
  ligarMato.trocarSorte(fila(0.01, 0.01, 0, 0.5));
  assert.ok((await s.pedir("mato", { codigo: CODIGO })).encontro);
  await s.pedir("fugir");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false);
});

test("bd: os Pokémon sobem de nível e evoluem no banco; a Pokédex guarda toda espécie que já teve", () => {
  bd.abrir(":memory:");
  bd.garantirIniciais("t9", "Red", ligarMato.INICIAIS());
  assert.strictEqual(bd.garantirIniciais("t9", "Red", ligarMato.INICIAIS()), false, "uma vez só");
  const c = ligarMato.colecaoDe("t9").get("charmander");
  const r = ligarMato.darXp("t9", c, 200000);
  assert.strictEqual(r.bicho, "charizard");
  const agora = bd.pokemonsDe("t9").find((p) => p.id === c.id);
  assert.deepStrictEqual([agora.bicho, agora.nivel], ["charizard", r.nivel]);
  assert.ok(["charmander", "charmeleon", "charizard"].every((b) => bd.pokedexDe("t9").includes(b)));
  assert.ok(!ligarMato.colecaoDe("t9").has("charmander"), "evoluiu: não tem mais o Charmander");
  assert.deepStrictEqual(bd.rankingCapturas().filter((x) => x.nome === "Red"), [], "só com os iniciais não entra no ranking");
});

test("bd: as capturas ficam por treinador, agrupadas por espécie, com o brilhante guardado", () => {
  bd.abrir(":memory:");
  bd.guardarCaptura("t1", "Misty", "staryu", "incomum", false);
  bd.guardarCaptura("t1", "Misty", "staryu", "incomum", true);
  bd.guardarCaptura("t1", "Misty", "psyduck", "comum", false);
  bd.guardarCaptura("t2", "Brock", "onix", "incomum", false);
  const c = bd.capturasDe("t1");
  assert.deepStrictEqual(c.map((x) => [x.bicho, x.vezes, x.brilhante]).sort(), [["psyduck", 1, false], ["staryu", 2, true]]);
  const rank = bd.rankingCapturas();
  assert.strictEqual(rank.find((x) => x.nome === "Misty").especies, 2);
});
