const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../public/corrida/f1-regras.js");
const P = require("../public/corrida/pistas.js");
const S = require("../public/corrida/sim.js");
const E = require("../public/corrida/f1-equipes.js");
const spec = E.specDaEquipe("mclaren");
function preparar(id, rel, lat, lateral = 20) {
  const tr = S.criarPista(P.PISTAS[id], id), c = S.novo(tr, { box: true, pneu: F.pneuNovo("medio") }), cor = tr.corredor;
  const idx = (cor.i0 + rel + tr.n) % tr.n, q = tr.pts[idx], v = spec.vmax * 0.8;
  Object.assign(c, { x: q.x + q.nx * lat * cor.lado, y: q.y + q.ny * lat * cor.lado, z: q.h, idx, idxAnt: idx, a: Math.atan2(q.ty, q.tx), v, vx: q.tx * v + q.nx * lateral * cor.lado, vy: q.ty * v + q.ny * lateral * cor.lado });
  return { tr, c, amb: { spec, voltas: 5, laps: 0, paradas: 0, grid: 0, id: "piloto", semente: 1, f1: true, outros: [] } };
}
for (const id of ["interlagos", "monaco"]) test(`${id}: entrada sem pedido abre escolha e limita velocidade até a saída`, () => {
  const largura = P.PISTAS[id].width, { tr, c, amb } = preparar(id, 5, largura / 2 - 7);
  const ev = [], limites = [], pos = { x: c.x, y: c.y };
  for (let k = 0; k < 120 * 100; k++) {
    const pedido = c.box.fase === "escolha" ? "chuva" : null;
    S.passo(c, { gas: 1, steer: 0, pedido }, amb, tr, ev);
    if (c.box.fase) limites.push(c.v);
    if (ev.some(e => e.t === "box" && e.fase === "sai")) break;
  }
  assert.ok(limites.length && Math.max(...limites) <= F.LIMITADOR * spec.vmax + 1e-8);
  assert.ok(ev.some(e => e.t === "box" && e.fase === "entra"));
  assert.ok(ev.some(e => e.t === "boxEscolheu" && e.composto === "chuva"));
  assert.ok(ev.some(e => e.t === "box" && e.fase === "sai" && e.composto === "chuva"));
  assert.notDeepEqual({ x: c.x, y: c.y }, pos);
});
test("passar pela reta sem apontar para a entrada não ativa o box", () => {
  const { tr, c, amb } = preparar("interlagos", 5, P.PISTAS.interlagos.width / 2 - 7, 0), ev = [];
  S.passo(c, { gas: 1 }, amb, tr, ev);
  assert.equal(c.box.fase, null);
});
test("um pedido antecipado também respeita o limite desde o primeiro passo", () => {
  const { tr, c, amb } = preparar("interlagos", 0, 0), ev = [];
  S.passo(c, { pedido: "duro" }, amb, tr, ev);
  assert.equal(c.box.fase, "entra");
  assert.ok(c.v <= F.LIMITADOR * spec.vmax);
});

test("a entrada funciona também no fim da rampa e na última volta", () => {
  const { tr, c, amb } = preparar("interlagos", F.RAMPA - 1, P.PISTAS.interlagos.width / 2 - 7);
  amb.laps = 4;
  const x = c.x, y = c.y;
  S.passo(c, { gas: 1 }, amb, tr, []);
  assert.equal(c.box.fase, "entra");
  assert.ok(Math.hypot(c.x - x, c.y - y) < 8, "não salta para a faixa dos boxes");
});

test("a entrada direta sobrevive à sincronização com o servidor", () => {
  const { tr, c, amb } = preparar("interlagos", F.RAMPA - 1, P.PISTAS.interlagos.width / 2 - 7);
  S.passo(c, { gas: 1 }, amb, tr, []);
  const copia = S.novo(tr, { box: true });
  S.aplicar(copia, S.serializar(c));
  assert.ok(Math.abs(copia.box.desvioEntrada - c.box.desvioEntrada) < 0.02);
  assert.ok(Math.abs(copia.box.uEntrada - c.box.uEntrada) < 0.002);
  S.passo(c, { gas: 1 }, amb, tr, []); S.passo(copia, { gas: 1 }, amb, tr, []);
  assert.ok(Math.hypot(c.x - copia.x, c.y - copia.y) < 0.2);
});
