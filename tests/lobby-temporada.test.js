// A temporada de F1 em grupo aparece na lista da Vila e o código dela leva até a sede.
const test = require("node:test");
const assert = require("node:assert");
const lobby = require("../lobby.js");

test("a temporada entra na lista com o endereço da sede e o código é reconhecido", () => {
  const sala = { code: "ABCDE", phase: "lobby", t: 1, sala: { gente: [{ nome: "Ana", online: true, host: true }] } };
  lobby.registrar("temporada-f1", new Map([["ABCDE", sala]]), { jogadores: (r) => r.sala.gente });
  const item = lobby.listar().find((s) => s.jogo === "temporada-f1");
  assert.equal(item.url, "/corrida/temporada/?sala=ABCDE");
  assert.equal(item.estado, "aberta");
  assert.equal(item.nome, "Temporada de F1");
  assert.equal(lobby.enderecoDaTemporada(" abcde "), "/corrida/temporada/?sala=ABCDE");
  assert.equal(lobby.enderecoDaTemporada("ZZZZZ"), null);
});
