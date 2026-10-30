// As posições do grid são compartilhadas pela física e pelas marcas na pista.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const S = require("../public/corrida/sim.js");

test("grid de F1: 20 carros com mais espaço entre filas, dentro da pista", () => {
  for (const [id, t] of Object.entries(T.PISTAS)) {
    const pts = T.pontos(t, 6), n = pts.length;
    const vagas = Array.from({ length: 20 }, (_, g) => S.vagaDoGrid(pts, g, t.width, true));
    for (let g = 0; g < vagas.length; g++) {
      const v = vagas[g], p = pts[v.idx];
      assert.equal(v.idx, (n - 6 - Math.floor(g / 2) * 18 + n * 2) % n, `${id}: vaga ${g + 1}`);
      assert.ok(Math.hypot(v.x - p.x, v.y - p.y) + S.dimensoes("tanque")[1] / 2 < t.width / 2, `${id}: vaga dentro da pista`);
      for (let j = 0; j < g; j++) assert.ok(Math.hypot(v.x - vagas[j].x, v.y - vagas[j].y) > 35, `${id}: vagas ${j + 1} e ${g + 1} próximas demais`);
    }
  }
});

test("grid do modo comum mantém o espaçamento anterior", () => {
  const t = T.PISTAS.interlagos, pts = T.pontos(t, 6), n = pts.length;
  assert.equal(S.vagaDoGrid(pts, 2, t.width, false).idx, (n - 19 + n) % n);
});
