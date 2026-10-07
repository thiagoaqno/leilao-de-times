// Carreira de Treinador: a base do Brasileirão 2026 (public/carreira/base/brasileirao-2026.js) e os escudos.
const test = require("node:test");
const assert = require("node:assert");
const base = require("../public/carreira/base/brasileirao-2026.js");
const Escudos = require("../public/carreira/escudos.js");
const { grupoDe } = require("../public/carreira/motor.js");

test("base: os 20 clubes da Série A 2026", () => {
  assert.strictEqual(base.clubes.length, 20);
  assert.strictEqual(new Set(base.clubes.map((c) => c.id)).size, 20);
  for (const id of ["flamengo", "palmeiras", "corinthians", "saopaulo", "remo", "chapecoense", "coritiba", "athletico"]) assert.ok(base.clubes.some((c) => c.id === id), id);
});

test("base: cada elenco tem goleiros, defesa, meio e ataque para escalar", () => {
  const ids = new Set();
  for (const c of base.clubes) {
    const n = (gs) => c.jogadores.filter((j) => gs.includes(grupoDe(j.pos))).length;
    assert.ok(n(["GK"]) >= 3, `${c.nome}: ${n(["GK"])} goleiros`);
    assert.ok(n(["DEF"]) >= 8, `${c.nome}: ${n(["DEF"])} defensores`);
    assert.ok(n(["VOL", "MID", "MEI"]) >= 7, `${c.nome}: ${n(["VOL", "MID", "MEI"])} meias`);
    assert.ok(n(["ATT"]) >= 5, `${c.nome}: ${n(["ATT"])} atacantes`);
    assert.strictEqual(new Set(c.jogadores.map((j) => j.nome)).size, c.jogadores.length, `${c.nome}: nome repetido`);
    for (const j of c.jogadores) {
      assert.ok(j.nota >= 50 && j.nota <= 92, `${j.nome}: nota ${j.nota}`);
      assert.ok(!ids.has(j.id), `id repetido ${j.id}`); ids.add(j.id);
      for (const k of ["rit", "fin", "pas", "dri", "def", "fis", "gol"]) assert.ok(j.atr[k] >= 20 && j.atr[k] <= 95, `${j.nome}: ${k}`);
    }
  }
});

test("escudos: todo clube tem um escudo de 16x18 com contorno", () => {
  for (const c of base.clubes) {
    const g = Escudos.grade(c);
    assert.strictEqual(g.length, Escudos.H); assert.strictEqual(g[0].length, Escudos.W);
    const cores = new Set(g.flat().filter(Boolean));
    assert.ok(cores.has("#0b1510") && cores.size >= 3, `${c.nome}: ${cores.size} cores`);
    assert.match(Escudos.svg(c), /^<svg viewBox="0 0 16 18"/);
  }
});
