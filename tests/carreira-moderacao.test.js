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
  // o painel grava na escala do jogo: a figurinha soma a evolução da nota (bonusNota) a cada atributo
  assert.equal(Carreira.jogadorDe(save, pid).atr.rit + save.bonusNota[pid], 91);
  assert.equal(Moderacao.detalhe(room, "flamengo").jogadores.find((j) => j.id === pid).atr.rit, 91, "o painel mostra o número da figurinha");
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

test("moderação aceita nomes de clubes e jogadores sem escolher nomes ambíguos", () => {
  const save = Carreira.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }, { clube: "palmeiras", nome: "Bia" }], { temporadas: 2 });
  const room = { code: "ABCDE", fase: "carreira", opcoes: { ligas: "brasil" }, save,
    players: { a: { name: "Ana", clube: "flamengo" } }, nRodada: 0 };
  const arrascaeta = Carreira.elencoDe(save, "flamengo").find((j) => j.nome.includes("Arrascaeta"));
  assert.equal(Moderacao.lista(new Map([[room.code, room]]))[0].tecnicos[0].nomeClube, "Flamengo");
  assert.equal(Moderacao.detalhe(room, " FLAMENGO ").nomeClube, "Flamengo");
  assert.match(Moderacao.detalhe(room, "clube inexistente").erro, /não encontrado/);
  assert.equal(Moderacao.aplicar(room, { tipo: "caixa", clube: "FLAMENGO", valor: 4321 }).depois, 4321);
  assert.equal(Moderacao.aplicar(room, { tipo: "energia", clube: "Flamengo", jogador: "arrascaeta", valor: 52 }).jogador, arrascaeta.id);
  assert.equal(save.humanos.flamengo.estado.energia[arrascaeta.id], 52);
  assert.match(Moderacao.aplicar(room, { tipo: "energia", clube: "Flamengo", jogador: "léo", valor: 1 }).erro, /ambíguo/);
  assert.equal(save.humanos.flamengo.estado.energia[Carreira.elencoDe(save, "flamengo").find((j) => j.nome === "Léo Ortiz").id], undefined);
  assert.equal(Moderacao.aplicar(room, { tipo: "transferir", clube: "Flamengo", jogador: "Giorgian de Arrascaeta", destino: "PALMEIRAS" }).depois, "palmeiras");
  assert.equal(Moderacao.detalhe(room, "Palmeiras").transferencias[0].deNome, "Flamengo");
  assert.equal(Moderacao.aplicar(room, { tipo: "desfazer_transferencia", clube: "Palmeiras", jogador: "Arrascaeta" }).depois.clube, "flamengo");
  assert.equal(Carreira.donoDe(save, arrascaeta.id), "flamengo");
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

test("moderação: o atributo de quem mora no save (jovem da base, atleta do Rumo ao Estrelato) muda nele mesmo", () => {
  const save = Carreira.novaCarreiraGrupo([{ clube: "flamengo", nome: "Ana" }], { temporadas: 2 });
  const room = { code: "ABCDE", fase: "carreira", opcoes: { ligas: "brasil" }, save, players: {}, nRodada: 0 };
  save.jovens = { ...(save.jovens || {}), "flamengo-t1b9": { id: "flamengo-t1b9", nome: "Garoto Teste", pos: "ATA", nat: "Brasil", idade: 17, desde: 1, nota: 60, base: true, atr: { rit: 60, fin: 61, pas: 55, dri: 58, def: 30, fis: 50, gol: 10 } } };
  save.donos["flamengo-t1b9"] = "flamengo";
  assert.equal(Moderacao.aplicar(room, { tipo: "atributo", clube: "flamengo", jogador: "flamengo-t1b9", atributo: "fin", valor: 80 }).depois, 80);
  assert.equal(save.jovens["flamengo-t1b9"].atr.fin, 80);
  assert.ok(!(save.atributosModerados || {})["flamengo-t1b9"], "sem camada por cima: a evolução continua do valor novo");
});
