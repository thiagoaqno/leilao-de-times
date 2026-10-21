// O contato só separa as carrocerias; não dá freio ou impulso a ninguém.
const test = require("node:test");
const assert = require("node:assert/strict");

test("batida entre carros", async () => {
  const { baterNoOutro } = await import("../public/corrida/colisao.js");
  const L = 44, W = 26;
  // de longe: nada
  const longe = { x: 0, y: 0, a: 0, vx: 200, vy: 0, L, W, massa: 1 };
  assert.equal(baterNoOutro(longe, { x: 300, y: 0, a: 0, v: 0, L, W, massa: 1 }), 0);
  assert.equal(longe.vx, 200);
  // encostar na traseira separa sem mudar a velocidade
  const eu = { x: 0, y: 0, a: 0, vx: 200, vy: 0, L, W, massa: 1 };
  const forca = baterNoOutro(eu, { x: 40, y: 0, a: 0, v: 0, L, W, massa: 1 });
  assert.ok(forca > 100);
  assert.equal(eu.vx, 200);
  assert.equal(eu.vy, 0);
  assert.ok(eu.x < 0 && eu.x > -4, "separação suave");
  const lado = { x: 0, y: 0, a: 0, vx: 220, vy: 0, L, W, massa: 1 };
  baterNoOutro(lado, { x: 0, y: 20, a: 0, v: 180, L, W, massa: 1 });
  assert.equal(lado.vx, 220, "ultrapassagem lado a lado mantém a velocidade");
  // dois carros que se afastam não grudam
  const afasta = { x: 0, y: 0, a: 0, vx: 150, vy: 0, L, W, massa: 1 };
  assert.equal(baterNoOutro(afasta, { x: -40, y: 0, a: 0, v: 50, L, W, massa: 1 }), 0);
});
