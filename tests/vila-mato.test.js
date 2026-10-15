// A grama alta da Vila: as regras (public/vila/mato.js), o servidor (vila-mato.js, com um socket de mentira) e o
// banco (bd.js: guardarCaptura, capturasDe, rankingCapturas).
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Mato = require("../public/vila/mato.js");
const PokeDex = require("../public/galeramon/pokemon.js");
const bd = require("../bd.js");
const ligarMato = require("../vila-mato.js");

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
  // quanto mais raro, mais difícil de pegar e mais fácil de fugir
  for (let i = 1; i < Mato.ORDEM.length; i++) {
    const a = Mato.RARIDADES[Mato.ORDEM[i - 1]], b = Mato.RARIDADES[Mato.ORDEM[i]];
    assert.ok(b.pega < a.pega && b.foge > a.foge && b.peso < a.peso);
  }
});

test("mato: o sorteio segue o peso de cada raridade", () => {
  let n = 0;
  const sorte = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const conta = {};
  for (let i = 0; i < 20000; i++) { const e = Mato.sortearEncontro(sorte); conta[e.raridade] = (conta[e.raridade] || 0) + 1; assert.strictEqual(Mato.raridadeDe(e.bicho), e.raridade); }
  for (const r of Mato.ORDEM) assert.ok(Math.abs(conta[r] / 20000 - Mato.RARIDADES[r].peso / 100) < 0.02, `${r}: ${conta[r]}`);
});

test("mato: a Pokébola pega pela chance da raridade; escapando, balança mais quando foi por pouco", () => {
  assert.deepStrictEqual(Mato.jogarPokebola("comum", fila(0.1)), { resultado: "pegou", balancos: 3 });
  assert.strictEqual(Mato.jogarPokebola("lendario", fila(0.11, 0.9)).resultado, "escapou");
  assert.strictEqual(Mato.jogarPokebola("lendario", fila(0.11, 0.1)).resultado, "fugiu");
  assert.strictEqual(Mato.jogarPokebola("comum", fila(0.76, 0.9)).balancos, 3);
  assert.strictEqual(Mato.jogarPokebola("comum", fila(0.99, 0.9)).balancos, 1);
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
  ligarMato.trocarSorte(fila(0.01, 0.999, 0, 0.5)); // encontro; raridade: lendário; o primeiro da lista; não brilhante
  const { encontro } = await s.pedir("mato", { codigo: CODIGO });
  assert.strictEqual(encontro.raridade, "lendario");
  assert.strictEqual(encontro.bicho, Mato.POR_RARIDADE.lendario[0]);
  assert.deepStrictEqual((await s.pedir("mato", { codigo: CODIGO })).encontro.bicho, encontro.bicho, "o mesmo encontro até acabar");
  // escapa duas vezes (a bola não acaba) e pega na terceira
  for (let i = 0; i < 2; i++) { ligarMato.trocarSorte(fila(0.5, 0.9)); assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).resultado, "escapou"); }
  ligarMato.trocarSorte(fila(0.01));
  const r = await s.pedir("pokebola", { codigo: CODIGO });
  assert.strictEqual(r.resultado, "pegou"); assert.strictEqual(r.encontro.bolas, 3);
  assert.deepStrictEqual(r.colecao.map((c) => [c.bicho, c.vezes]), [[encontro.bicho, 1]]);
  assert.ok(noticias.some((t) => t.includes("Ash") && t.includes("lendário")), "o lendário vira notícia na vila");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false, "acabou o encontro");
  const dex = await s.pedir("pokedex", { codigo: CODIGO });
  assert.strictEqual(dex.total, PokeDex.IDS.length);
  assert.deepStrictEqual(dex.ranking, [{ nome: "Ash", especies: 1, total: 1 }]);
  // outro treinador não vê a coleção de ninguém
  assert.deepStrictEqual((await s.pedir("pokedex", { codigo: "f".repeat(32) })).colecao, []);
});

test("mato: o Pokémon pode fugir, e fugir fecha o encontro", async () => {
  bd.abrir(":memory:");
  const { s } = jogador();
  ligarMato.trocarSorte(fila(0.01, 0.01, 0, 0.5));
  assert.ok((await s.pedir("mato", { codigo: CODIGO })).encontro);
  ligarMato.trocarSorte(fila(0.9, 0.01));
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).resultado, "fugiu");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false);
  await new Promise((ok) => setTimeout(ok, 200));
  ligarMato.trocarSorte(fila(0.01, 0.01, 0, 0.5));
  assert.ok((await s.pedir("mato", { codigo: CODIGO })).encontro);
  await s.pedir("fugir");
  assert.strictEqual((await s.pedir("pokebola", { codigo: CODIGO })).ok, false);
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
  assert.strictEqual(rank[0].nome, "Misty"); assert.strictEqual(rank[0].especies, 2);
});
