const test = require("node:test"), assert = require("node:assert/strict");
const Robos = require("../corrida-robos.js"), Sim = require("../public/corrida/sim.js");

test("os robôs de F1 andam o tempo real que passou, em passos inteiros da física", () => {
  const room = { relogioRobos: 1000 }, ms = Sim.PASSO * 1000;
  assert.equal(Robos.tempoDoPasso(room, 1000 + ms / 2), 0);
  const dt = Robos.tempoDoPasso(room, 1062);
  assert.equal(dt, 7 * Sim.PASSO);
  assert.ok(Math.abs(room.relogioRobos - (1000 + 7 * ms)) < 1e-6);
  let total = 0, relogio = room.relogioRobos, agora = relogio;
  for (const salto of [46, 62, 47, 63, 50]) { agora += salto; total += Robos.tempoDoPasso(room, agora); }
  assert.ok(Math.abs(total * 1000 - (agora - relogio)) < ms, "o que os robôs andam acompanha o relógio");
});
test("depois de um engasgo longo, os robôs não tentam recuperar de uma vez", () => {
  const room = { relogioRobos: 1000 };
  assert.ok(Robos.tempoDoPasso(room, 5000) <= Sim.PASSO);
  const novo = {};
  assert.ok(Robos.tempoDoPasso(novo, 2000) <= Sim.PASSO);
  assert.ok(novo.relogioRobos <= 2000);
});
