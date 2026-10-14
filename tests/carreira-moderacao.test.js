const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const Carreira = require("../carreira.js").grupo;
const Moderacao = require("../carreira-moderacao.js");
const Api = require("../moderacao-api.js");

test("moderação altera a sala viva, desfaz transferência e bloqueia edição durante jogo", () => {
  const save = Carreira.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const room = { code: "ABCDE", fase: "carreira", opcoes: { ligas: "brasil" }, save, players: {}, nRodada: 0 };
  const pid = Carreira.elencoDe(save, "flamengo")[0].id;
  const nota = Carreira.jogadorDe(save, pid).nota;
  assert.ok(Moderacao.aplicar(room, { tipo: "caixa", clube: "flamengo", valor: "" }).erro);
  assert.equal(Moderacao.aplicar(room, { tipo: "caixa", clube: "flamengo", valor: 123456 }).depois, 123456);
  assert.equal(save.humanos.flamengo.estado.caixa, 123456);
  assert.equal(Moderacao.aplicar(room, { tipo: "energia", clube: "flamengo", jogador: pid, valor: 37 }).depois, 37);
  assert.equal(Moderacao.aplicar(room, { tipo: "overall", clube: "flamengo", jogador: pid, valor: 90 }).depois, 90);
  assert.equal(save.bonusNota[pid], 90 - nota);
  assert.equal(Moderacao.aplicar(room, { tipo: "atributo", clube: "flamengo", jogador: pid, atributo: "rit", valor: 91 }).depois, 91);
  assert.equal(Carreira.jogadorDe(save, pid).atr.rit, 91);
  assert.ok(Moderacao.aplicar(room, { tipo: "atributo", clube: "flamengo", jogador: pid, atributo: "gol", valor: -5 }).erro);
  assert.equal(Moderacao.aplicar(room, { tipo: "transferir", clube: "flamengo", jogador: pid, destino: "palmeiras" }).depois, "palmeiras");
  assert.equal(Carreira.donoDe(save, pid), "palmeiras");
  assert.ok(save.transferencias[0].moderacao);
  assert.equal(Carreira.estado(Carreira.vistaDe(save, "flamengo")).transferencias.length, 0, "a moderação não aparece no histórico do jogo");
  assert.ok(Moderacao.aplicar(room, { tipo: "desfazer_transferencia", clube: "flamengo" }).erro);
  assert.equal(Moderacao.aplicar(room, { tipo: "desfazer_transferencia", clube: "flamengo", jogador: pid }).depois.clube, "flamengo");
  assert.equal(Carreira.donoDe(save, pid), "flamengo");
  assert.ok(save.transferencias[0].revertida);
  const caixaFlamengo = save.humanos.flamengo.estado.caixa, caixaPalmeiras = save.humanos.palmeiras.estado.caixa;
  save.donos[pid] = "palmeiras";
  save.humanos.flamengo.estado.caixa += 1e6;
  save.humanos.palmeiras.estado.caixa -= 1e6;
  save.transferencias.unshift({ jogador: pid, de: "flamengo", para: "palmeiras", valor: 1e6 });
  assert.equal(Moderacao.aplicar(room, { tipo: "desfazer_transferencia", clube: "palmeiras", jogador: pid }).depois.estorno, 1e6);
  assert.equal(Carreira.donoDe(save, pid), "flamengo");
  assert.equal(save.humanos.flamengo.estado.caixa, caixaFlamengo);
  assert.equal(save.humanos.palmeiras.estado.caixa, caixaPalmeiras);
  assert.equal(Carreira.estado(Carreira.vistaDe(save, "flamengo")).transferencias.length, 0);
  room.rodada = { n: 1 };
  assert.match(Moderacao.aplicar(room, { tipo: "caixa", clube: "flamengo", valor: 999 }).erro, /jogo ao vivo/);
  assert.equal(save.humanos.flamengo.estado.caixa, 123456);
});

test("API da moderação exige identidade do workflow e não revela salas sem ela", async () => {
  const app = express();
  Api.attach(app, { listar: () => [{ codigo: "ABCDE" }], detalhar: () => null, editar: () => ({ ok: true }) }, async (token) => {
    if (token !== "identidade-de-teste") throw new Error("Sem autorização.");
    return "thiagoaqno";
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/moderacao/carreira`;
  try {
    const enviar = (token) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) }, body: JSON.stringify({ tipo: "listar" }) });
    assert.equal((await enviar()).status, 401);
    assert.equal((await enviar("errado")).status, 401);
    assert.deepEqual(await (await enviar("identidade-de-teste")).json(), { salas: [{ codigo: "ABCDE" }] });
  } finally {
    server.close();
  }
});
