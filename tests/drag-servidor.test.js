// Drag: o racha de até 4 pessoas no canal /drag (drag.js). Sala, carros, largada sincronizada, o repasse das
// posições, as chegadas e o resultado igual para todo mundo. As regras da corrida (criarCorridaMulti) ficam em
// corrida-drag.test.mjs.
const test = require("node:test");
const assert = require("node:assert/strict");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

let srv;
test.before(async () => { srv = await subirServidor(); });
test.after(async () => { await srv.parar(); });

async function racha(n = 2) {
  const nomes = ["Ana", "Bia", "Caio", "Duda", "Edu"], carros = ["supra", "bmw-m4", "porsche-911", "skyline-r33", "supra"];
  const s = [await conectar(srv.url, "/drag")];
  const r = await pedir(s[0], "create", { name: nomes[0], carro: carros[0] });
  for (let i = 1; i < n; i++) { s.push(await conectar(srv.url, "/drag")); await pedir(s[i], "join", { code: r.code, name: nomes[i], carro: carros[i] }); }
  await esperarEstado(s[0], (st) => st.players.length === n);
  return { s, code: r.code };
}
const fechar = (lista) => lista.forEach((x) => x.close());

test("drag: a sala tem 4 vagas e só o organizador escolhe a pista e larga", async () => {
  const { s, code } = await racha(4);
  const quinto = await conectar(srv.url, "/drag");
  await assert.rejects(pedir(quinto, "join", { code, name: "Edu" }), /4 pilotos/);
  await assert.rejects(pedir(s[1], "act", { type: "pista", pista: 2 }), /organizador/);
  await assert.rejects(pedir(s[1], "act", { type: "start" }), /organizador/);
  await pedir(s[0], "act", { type: "pista", pista: 2 });
  await pedir(s[1], "act", { type: "carro", carro: "porsche-718" });
  const st = await esperarEstado(s[1], (x) => x.config.pista === 2 && x.players[1].carro === "porsche-718");
  assert.equal(st.players.length, 4);
  fechar([...s, quinto]);
});

test("drag: largada para todos no mesmo instante, robôs nas faixas que sobram, posições repassadas e o mesmo resultado", async () => {
  const { s } = await racha(2);
  await pedir(s[0], "act", { type: "start" });
  const carregando = await esperarEstado(s[1], (x) => x.phase === "carregando");
  const part = carregando.corrida.participantes;
  assert.equal(part.length, 4);
  assert.deepEqual(part.map((p) => p.lane).sort(), [0, 1, 2, 3]);
  assert.equal(part.filter((p) => p.robo).length, 2);
  assert.ok(Number.isInteger(carregando.corrida.semente));
  // com todo mundo pronto, o servidor marca a largada (o mesmo instante para os dois)
  await pedir(s[0], "act", { type: "pronto" }); await pedir(s[1], "act", { type: "pronto" });
  const [a, b] = await Promise.all(s.map((x) => esperarEstado(x, (st) => st.phase === "corrida")));
  assert.ok(a.corrida.inicio > Date.now() - 5000 && a.corrida.inicio === b.corrida.inicio);
  // a posição de um vai para o outro; ninguém manda pelo carro dos outros
  const ana = part.find((p) => p.nome === "Ana"), bia = part.find((p) => p.nome === "Bia"), robos = part.filter((p) => p.robo);
  const chegou = new Promise((ok) => s[1].once("st", ok));
  s[0].emit("st", { c: [[ana.lane, 120.5, 1.85, 180, 0.9, 4, 1, 0, -1], [bia.lane, 999, 0, 0, 0, 1, 0, 0, -1]] });
  const pacote = await chegou;
  assert.deepEqual(pacote.c.map((x) => x[0]), [ana.lane]);
  // as chegadas: o organizador manda a dos robôs; o resultado fecha quando todos terminam
  for (const r of robos) s[0].emit("fim", { lane: r.lane, tempo: 30 + r.lane, motivo: "chegada", estimado: true });
  s[1].emit("fim", { lane: ana.lane, tempo: 10, motivo: "chegada" }); // a Bia não manda pela Ana
  s[0].emit("fim", { lane: ana.lane, motivo: "perda-total" });
  s[1].emit("fim", { lane: bia.lane, tempo: 28.5, motivo: "chegada" });
  const [ra, rb] = await Promise.all(s.map((x) => esperarEstado(x, (st) => st.phase === "resultado")));
  assert.deepEqual(ra.corrida.resultado, rb.corrida.resultado);
  assert.deepEqual(ra.corrida.resultado.map((o) => o.nome), ["Bia", robos[0].nome, robos[1].nome, "Ana"]);
  assert.equal(ra.corrida.resultado.at(-1).fora, "perda total");
  // e dá para largar de novo
  await pedir(s[0], "act", { type: "start" });
  await esperarEstado(s[1], (x) => x.phase === "carregando" && x.corrida.semente !== carregando.corrida.semente);
  fechar(s);
});

test("drag: quem bate cedo não fecha o racha de quem ainda está correndo", async () => {
  const { s } = await racha(2);
  await pedir(s[0], "act", { type: "start" });
  const { corrida } = await esperarEstado(s[0], (x) => x.phase === "carregando");
  await pedir(s[0], "act", { type: "pronto" }); await pedir(s[1], "act", { type: "pronto" });
  await esperarEstado(s[0], (x) => x.phase === "corrida");
  const ana = corrida.participantes.find((p) => p.nome === "Ana");
  s[0].emit("fim", { lane: ana.lane, motivo: "perda-total" });
  await new Promise((ok) => setTimeout(ok, 400));
  assert.equal(s[1].ultimo.phase, "corrida");
  fechar(s);
});

test("drag: quem sai passa a vez de organizar", async () => {
  const { s } = await racha(2);
  await pedir(s[0], "act", { type: "sair" });
  const st = await esperarEstado(s[1], (x) => x.players.length === 1);
  assert.equal(st.host, st.players[0].id);
  fechar(s);
});
