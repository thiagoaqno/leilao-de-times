// A batida entre carros da Corrida: empurra os dois lados, respeita a massa e não faz nada de longe.
const test = require("node:test");
const assert = require("node:assert/strict");

test("batida entre carros", async () => {
  const { baterNoOutro, MASSA } = await import("../public/corrida/colisao.js");
  const L = 44, W = 26;
  // de longe: nada
  const longe = { x: 0, y: 0, a: 0, vx: 200, vy: 0, L, W, massa: 1 };
  assert.equal(baterNoOutro(longe, { x: 300, y: 0, a: 0, v: 0, L, W, massa: 1 }), 0);
  assert.equal(longe.vx, 200);
  // batendo na traseira de um carro parado: perde velocidade e sai de dentro
  const eu = { x: 0, y: 0, a: 0, vx: 200, vy: 0, L, W, massa: 1 };
  const forca = baterNoOutro(eu, { x: 40, y: 0, a: 0, v: 0, L, W, massa: 1 });
  assert.ok(forca > 100);
  assert.ok(eu.vx < 200 * 0.5, "perdeu velocidade: " + eu.vx);
  assert.ok(eu.x < 0, "foi empurrado para trás");
  // o tanque (pesado) sofre menos do que a formiga na mesma batida
  const bate = (massa) => { const e = { x: 0, y: 0, a: 0, vx: 200, vy: 0, L, W, massa }; baterNoOutro(e, { x: 40, y: 0, a: 0, v: 0, L, W, massa: 1 }); return e.vx; };
  assert.ok(bate(MASSA.tanque) > bate(MASSA.formiga));
  // dois carros que se afastam não grudam
  const afasta = { x: 0, y: 0, a: 0, vx: 150, vy: 0, L, W, massa: 1 };
  assert.equal(baterNoOutro(afasta, { x: -40, y: 0, a: 0, v: 50, L, W, massa: 1 }), 0);
});
