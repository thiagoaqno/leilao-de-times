// Ginásio, modo Pokémon: os cenários ao ar livre (public/ginasio/biomas.js). O arquivo é do navegador: aqui só as
// regras de escolha e se cada bioma tem tudo o que um tema precisa.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function carregar(S = null) {
  const ctx = { Math, Map, Object, S, fixo: (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../public/ginasio/biomas.js"), "utf8"), ctx, { filename: "biomas.js" });
  return vm.runInContext("({ BIOMAS, BIOMA_DO_TIPO, biomaDaPartida })", ctx);
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

test("biomas: o líder escolhe o lugar; sem líder, a partida sorteia o mesmo para a sala inteira", () => {
  const { biomaDaPartida, BIOMAS } = carregar();
  assert.strictEqual(biomaDaPartida({ tipo: "Fogo" }).bioma, "vulcao");
  assert.strictEqual(biomaDaPartida({ tipo: "Água" }).bioma, "lagoa");
  assert.strictEqual(biomaDaPartida({ tipo: "Gelo" }).bioma, "neve");
  assert.strictEqual(biomaDaPartida({ tipo: "Fantasma" }).bioma, "ruinas");
  assert.strictEqual(biomaDaPartida(null), BIOMAS.floresta, "na sala, antes da partida, a floresta");
  const vistos = new Set();
  for (let i = 0; i < 40; i++) {
    const um = carregar({ match: { start: 1_700_000_000_000 + i * 7919 } }), outro = carregar({ match: { start: 1_700_000_000_000 + i * 7919 } });
    const a = um.biomaDaPartida(null).bioma;
    assert.strictEqual(a, outro.biomaDaPartida(null).bioma, "o mesmo começo dá o mesmo lugar");
    vistos.add(a);
  }
  assert.ok(vistos.size >= 4, `sorteia lugares diferentes (${[...vistos]})`);
});
