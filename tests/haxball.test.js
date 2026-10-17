const test = require("node:test");
const assert = require("node:assert/strict");
const H = require("../public/haxball/regras.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("haxball: movimento, chute, gol e fim da partida são calculados no servidor", () => {
  const m = H.nova([{ id: "a", name: "A", team: 0 }, { id: "b", name: "B", team: 1 }], { size: 1, minutes: 3, goals: 3 }, 0);
  H.step(m, 1 / 60, 2300);
  assert.equal(m.phase, "play");
  const a = m.discs[0], start = a.x;
  a.input = { x: 1, y: 0 };
  for (let i = 0; i < 40; i++) H.step(m, 1 / 60, 2400 + i * 17);
  assert.ok(a.x > start + 25);
  a.x = 450; a.y = 270; m.ball.x = 478; m.ball.y = 270; m.ball.vx = 0; m.ball.vy = 0;
  a.kick = true; H.step(m, 1 / 60, 4000);
  assert.ok(m.ball.vx > 500);
  m.ball.x = H.RIGHT + H.BR + 1; m.ball.y = 270;
  assert.equal(H.step(m, 1 / 60, 4100), "goal");
  assert.deepEqual(m.score, [1, 0]);
  m.remaining = 0.001; H.step(m, 1 / 60, 6500); H.step(m, 1 / 60, 6520);
  assert.equal(m.phase, "over"); assert.equal(m.winner, 0);
});

test("haxball: sala real suporta 1x1 e 5x5, limita times e protege início", async (t) => {
  const server = await subirServidor();
  t.after(() => server.parar());
  const clients = [];
  t.after(() => clients.forEach((c) => c.disconnect()));
  for (let i = 0; i < 10; i++) clients.push(await conectar(server.url, "/haxball"));
  const created = await pedir(clients[0], "create", { name: "P0", config: { size: 1, minutes: 3, goals: 3 } });
  await pedir(clients[1], "join", { code: created.code, name: "P1" });
  await esperarEstado(clients[0], (s) => s.players.length === 2);
  await pedir(clients[0], "act", { type: "start" });
  await esperarEstado(clients[1], (s) => s.phase === "play" && s.match.discs.length === 2);
  await pedir(clients[0], "act", { type: "lobby" });
  await pedir(clients[0], "act", { type: "config", config: { size: 5, minutes: 5, goals: 5 } });
  for (let i = 2; i < 10; i++) await pedir(clients[i], "join", { code: created.code, name: `P${i}` });
  const full = await esperarEstado(clients[0], (s) => s.players.length === 10);
  assert.equal(full.players.filter((p) => p.team === 0).length, 5);
  assert.equal(full.players.filter((p) => p.team === 1).length, 5);
  await pedir(clients[0], "act", { type: "start" });
  const match = await esperarEstado(clients[9], (s) => s.phase === "play" && s.match.discs.length === 10);
  assert.equal(match.match.discs.length, 10);
  await assert.rejects(pedir(clients[1], "act", { type: "lobby" }), /Só o anfitrião/);
});
