const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

test("só o anfitrião libera os carros do Drag; escolhas válidas aparecem para todos e saem ao desligar", async () => {
  const srv = await subirServidor();
  const anfitriao = await conectar(srv.url, "/corrida"), piloto = await conectar(srv.url, "/corrida");
  try {
    const sala = await pedir(anfitriao, "create", { name: "Ana" });
    const bia = await pedir(piloto, "join", { code: sala.code, name: "Bia" });
    await pedir(piloto, "act", { type: "car", car: "foguete" });
    const config = anfitriao.ultimo.config;
    await assert.rejects(pedir(piloto, "act", { type: "config", config: { ...config, carrosDrag: true } }), /Só o organizador/);
    await pedir(anfitriao, "act", { type: "config", config: { ...config, carrosDrag: true, robos: 1 } });
    await esperarEstado(piloto, (s) => s.config.carrosDrag);
    await assert.rejects(pedir(piloto, "act", { type: "car", car: "tanque" }), /Drag/);
    await assert.rejects(pedir(piloto, "act", { type: "carDrag", carDrag: "outro" }), /inválido/);
    await pedir(piloto, "act", { type: "carDrag", carDrag: "porsche-911" });
    const escolhido = await esperarEstado(anfitriao, (s) => s.players.find((p) => p.id === bia.id)?.carDrag === "porsche-911");
    assert.equal(escolhido.players.find((p) => p.id === sala.id).carDrag, "supra");
    assert.equal(escolhido.players.find((p) => p.id === bia.id).car, "equilibrado");
    await pedir(anfitriao, "act", { type: "config", config: { ...config, carrosDrag: false } });
    const desligado = await esperarEstado(piloto, (s) => !s.config.carrosDrag);
    assert.ok(desligado.players.every((p) => p.carDrag === null));
    assert.equal(desligado.players.find((p) => p.id === bia.id).car, "foguete");
    await pedir(anfitriao, "act", { type: "config", config: { ...config, carrosDrag: true, robos: 1 } });
    await pedir(anfitriao, "act", { type: "start" });
    const corrida = await esperarEstado(piloto, (s) => s.phase === "race");
    assert.equal(corrida.players.find((p) => p.id === bia.id).carDrag, "porsche-911");
    assert.ok(corrida.players.some((p) => p.bot && p.carDrag === "supra" && p.car === "equilibrado"));
  } finally { anfitriao.close(); piloto.close(); await srv.parar(); }
});
