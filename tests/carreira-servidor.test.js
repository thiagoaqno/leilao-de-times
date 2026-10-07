// Carreira de Treinador: o canal /carreira com o servidor de verdade (banco em memória).
const test = require("node:test");
const assert = require("node:assert");
const { subirServidor, conectar, pedir } = require("./ajuda.js");
const Motor = require("../public/carreira/motor.js");
const base = require("../public/carreira/base/brasileirao-2026.js");

let srv;
test.before(async () => { srv = await subirServidor(); });
test.after(async () => { await srv.parar(); });

test("carreira: cria, joga uma rodada, volta pelo token e pelo código", async () => {
  const a = await conectar(srv.url, "/carreira");
  await assert.rejects(pedir(a, "criar", { nome: "", clube: "flamengo" }));
  const c = await pedir(a, "criar", { nome: "Thiago", clube: "flamengo" });
  assert.match(c.recuperacao, /^[A-Z2-9]{12}$/);
  assert.strictEqual(c.estado.rodada, 0);
  assert.strictEqual(c.estado.total, 38);
  assert.strictEqual(c.estado.meus.length, 38);
  const r = await pedir(a, "jogar", { modo: 1 });
  assert.strictEqual(r.estado.rodada, 1, "a rodada andou");
  assert.strictEqual(r.estado.rodadaAnterior.length, 10, "os 10 jogos da rodada");
  assert.strictEqual(r.estado.tabela.reduce((s, l) => s + l.j, 0), 20);
  assert.ok(r.estado.meus[0].placar, "o placar do seu jogo ficou guardado");
  a.close();
  // fechou o navegador: volta pelo token
  const b = await conectar(srv.url, "/carreira");
  const e = await pedir(b, "entrar", { token: c.token });
  assert.strictEqual(e.estado.rodada, 1);
  // em outro aparelho: pelo código, e o token antigo deixa de valer
  const outro = await conectar(srv.url, "/carreira");
  const rec = await pedir(outro, "recuperar", { codigo: c.recuperacao.toLowerCase() });
  assert.strictEqual(rec.estado.rodada, 1);
  await assert.rejects(pedir(b, "jogar", {}));
  b.close(); outro.close();
});

test("carreira: a partida parada fica salva, só aceita a decisão de agora e recarregar não muda nada", async () => {
  const a = await conectar(srv.url, "/carreira");
  const c = await pedir(a, "criar", { nome: "Kizzy", clube: "palmeiras" });
  let r = await pedir(a, "jogar", { modo: 3 });
  assert.ok(r.estado.partida && r.estado.partida.parado, "parou para decidir");
  const parado = r.estado.partida.parado;
  await assert.rejects(pedir(a, "decidir", { id: "nada", resposta: {} }));
  await assert.rejects(pedir(a, "escalacao", { formacao: "4-4-2" }), /andamento/);
  // recarregou: volta no mesmo ponto
  const b = await conectar(srv.url, "/carreira");
  const e = await pedir(b, "entrar", { token: c.token });
  assert.deepStrictEqual(e.estado.partida.parado, parado);
  assert.deepStrictEqual(e.estado.partida.eventos, r.estado.partida.eventos);
  // decide até o fim
  let voltas = 0;
  while (r.estado.partida && voltas++ < 40) {
    const p = r.estado.partida.parado;
    r = await pedir(b, "decidir", { id: p.id, resposta: Motor.decisaoAutomatica(p) });
  }
  assert.strictEqual(r.estado.partida, null);
  assert.strictEqual(r.estado.rodada, 1);
  a.close(); b.close();
});

test("carreira: escalação, a temporada inteira e a próxima", async () => {
  const a = await conectar(srv.url, "/carreira");
  const c = await pedir(a, "criar", { nome: "Rafa", clube: "corinthians" });
  const elenco = base.clubes.find((c) => c.id === "corinthians").jogadores;
  await assert.rejects(pedir(a, "escalacao", { titulares: [elenco[0].id] }), /11/);
  const ids = [elenco.find((j) => j.pos === "GOL"), ...elenco.filter((j) => j.pos !== "GOL").slice(0, 10)].map((j) => j.id);
  const e = await pedir(a, "escalacao", { formacao: "4-4-2", tatica: { mentalidade: 1, pressao: 2, linha: 0 }, titulares: ids });
  assert.deepStrictEqual(e.estado.escalacao.titulares, ids);
  assert.deepStrictEqual(e.estado.escalacao.tatica, { mentalidade: 1, pressao: 2, linha: 0 });
  let r;
  for (let i = 0; i < 38; i++) r = await pedir(a, "jogar", { modo: 1 });
  assert.strictEqual(r.estado.fim, true);
  assert.strictEqual(r.estado.tabela.every((l) => l.j === 38), true);
  await assert.rejects(pedir(a, "jogar", {}), /acabou/);
  const n = await pedir(a, "novaTemporada");
  assert.strictEqual(n.estado.temporada, 2);
  assert.strictEqual(n.estado.ano, 2027);
  assert.strictEqual(n.estado.rodada, 0);
  assert.strictEqual(n.estado.historico.length, 1);
  assert.ok(n.estado.historico[0].posicao >= 1 && n.estado.historico[0].posicao <= 20);
  a.close();
});
