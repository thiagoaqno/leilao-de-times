// O painel pode colocar um técnico no automático sem liberar seu clube nem sua cota de compras.
process.env.DB_PATH = ":memory:";
process.env.CARREIRA_PAUSA_MS = "0";
process.env.CARREIRA_VEL = "100";
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { Server } = require("socket.io");
const { conectar, pedir, esperarEstado } = require("./ajuda.js");

test("admin põe no automático e devolve o controle sem tirar o técnico da sala", async () => {
  const httpServer = http.createServer(), io = new Server(httpServer);
  const carreira = require("../carreira-online.js")(io);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const url = `http://localhost:${httpServer.address().port}`;
  const a = await conectar(url, "/carreira-online"), b = await conectar(url, "/carreira-online");
  try {
    const sala = await pedir(a, "create", { name: "Ana" });
    const amigo = await pedir(b, "join", { code: sala.code, name: "Beto" });
    await pedir(a, "act", { type: "clube", clube: "flamengo" });
    await pedir(b, "act", { type: "clube", clube: "palmeiras" });
    await pedir(a, "act", { type: "comecar" });
    await pedir(b, "modo", { modo: 3 });
    assert.equal(carreira.comandar(sala.code, { tipo: "automatico", pessoa: amigo.id, ativo: true }, "thiagoaqno").depois, true);
    const estado = await esperarEstado(a, (s) => s.players.some((p) => p.id === amigo.id && p.auto));
    assert.equal(estado.ocupados.palmeiras, amigo.id, "o técnico conserva o clube");
    await assert.rejects(pedir(b, "modo", { modo: 3 }), /automático/);
    await pedir(a, "act", { type: "rodada" });
    await esperarEstado(a, (s) => s.ultimaRodada?.n === 1 && !s.rodada, 15000);
    assert.equal(carreira.comandar(sala.code, { tipo: "automatico", pessoa: amigo.id, ativo: false }, "thiagoaqno").depois, false);
    await esperarEstado(a, (s) => s.players.some((p) => p.id === amigo.id && !p.auto));
    assert.equal((await pedir(b, "modo", { modo: 1 })).ok, true);
    carreira.comandar(sala.code, { tipo: "automatico", pessoa: amigo.id, ativo: true }, "thiagoaqno");
    await pedir(b, "act", { type: "retomar" });
    await esperarEstado(a, (s) => s.players.some((p) => p.id === amigo.id && !p.auto));
    carreira.comandar(sala.code, { tipo: "automatico", pessoa: sala.id, ativo: true }, "thiagoaqno");
    await esperarEstado(b, (s) => s.host === amigo.id, 5000);
  } finally {
    a.close(); b.close();
    await new Promise((resolve) => io.close(resolve));
  }
});
