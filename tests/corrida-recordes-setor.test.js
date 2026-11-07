// O melhor tempo de cada setor de cada pista: só troca quando o tempo novo é menor.
const test = require("node:test");
const assert = require("node:assert");
process.env.DB_PATH = ":memory:";
const bd = require("../bd.js");

test("o setor só troca de dono com um tempo menor, e cada pista e setor é separado", () => {
  assert.equal(bd.registrarSetorCorrida("spa", 0, 30.5, "Ana"), true);
  assert.equal(bd.registrarSetorCorrida("spa", 0, 31, "Bia"), false);
  assert.equal(bd.registrarSetorCorrida("spa", 0, 30.1, "Bia"), true);
  assert.equal(bd.registrarSetorCorrida("spa", 2, 40, "Ana"), true);
  assert.equal(bd.registrarSetorCorrida("monza", 0, Number.NaN, "Ana"), false);
  const s = bd.setoresCorrida();
  assert.deepEqual(s.spa, [{ piloto: "Bia", tempo: 30.1 }, null, { piloto: "Ana", tempo: 40 }]);
  assert.equal(s.monza, undefined);
});
