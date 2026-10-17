// Ginásio, modo Pokémon: os cenários ao ar livre (public/ginasio/biomas.js). O arquivo é do navegador: aqui só as
// regras de escolha e se cada bioma tem tudo o que um tema precisa.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const Ginasio = require("../public/ginasio/regras.js");

function carregar(S = null, configLocal = {}) {
  const ctx = { Math, Map, Object, S, Ginasio, configLocal, fixo: (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/ginasio/biomas.js"), "utf8"), ctx, { filename: "biomas.js" });
  return vm.runInContext("({ BIOMAS, biomaDaPartida })", ctx);
}
const COR = /^#[0-9a-f]{6}$/i;

test("biomas: cada lugar tem os campos de um tema e as cores certas", () => {
  const { BIOMAS } = carregar();
  assert.deepStrictEqual(Object.keys(BIOMAS).sort(), ["floresta", "lagoa", "neve", "ruinas", "vulcao"]);
  for (const [id, B] of Object.entries(BIOMAS)) {
    assert.strictEqual(B.bioma, id);
    for (const k of ["fundo", "piso", "grama", "trilha", "fora", "pilar", "torcida"]) {
      assert.ok(Array.isArray(B[k]) && B[k].length >= 2, `${id}.${k}`);
      for (const c of B[k]) assert.match(c, COR, `${id}.${k}: ${c}`);
    }
    assert.strictEqual(B.pilar.length, 4, `${id}: a pilastra do desenho reto usa 4 cores`);
    assert.strictEqual(B.trilha.length >= 4, true, `${id}: a borda da trilha usa a 4ª cor`);
    for (const k of ["borda", "ceu", "linha"]) assert.match(B[k], COR, `${id}.${k}`);
    assert.ok(B.nome && B.clima && B.sol.length === 3);
  }
});

test("biomas: a tela usa o lugar da partida; antes dela, o da sala, o do líder ou a floresta", () => {
  assert.strictEqual(carregar({ match: { bioma: "neve" }, config: { arena: "vulcao" } }).biomaDaPartida({ tipo: "Fogo" }).bioma, "neve", "na partida, o que o servidor escolheu");
  assert.strictEqual(carregar({ config: { arena: "lagoa" } }).biomaDaPartida(null).bioma, "lagoa", "na sala, o escolhido");
  assert.strictEqual(carregar(null, { arena: "ruinas" }).biomaDaPartida(null).bioma, "ruinas", "sem sala, o guardado");
  assert.strictEqual(carregar({ config: { arena: "sortear" } }).biomaDaPartida({ tipo: "Fogo" }).bioma, "vulcao", "o do líder");
  assert.strictEqual(carregar({ config: { arena: "sortear" } }).biomaDaPartida(null).bioma, "floresta");
});

test("biomas: todo lugar do motor tem desenho e todo tipo de líder cai num lugar que existe", () => {
  const { BIOMAS } = carregar();
  assert.deepStrictEqual([...Ginasio.BIOMAS].sort(), Object.keys(BIOMAS).sort());
  for (const b of Object.values(Ginasio.BIOMA_DO_TIPO)) assert.ok(BIOMAS[b], b);
});
