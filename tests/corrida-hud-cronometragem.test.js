// Intervalos da torre e do MFD pela cronometragem (hud-torre.js, hud-mfd.js): o tempo medido entre dois carros, não distância / velocidade.
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/hud-torre.js");
const H = require("../public/corrida/hud-mfd.js");

test("o atraso é o tempo que o de trás levou para chegar onde o da frente estava", () => {
  const c = T.criarCronometragem(), n = 1000;
  for (let i = 0; i <= 100; i++) { const t = i * 0.1; c.registrar("A", 100 + 50 * t, t, n); } // A anda 50 u/s
  // B está em 100 + 50*7 (ponto em que A passou aos 7,0 s) e agora são 10,0 s: atraso 3,0 s
  assert.ok(Math.abs(c.atraso("A", 100 + 50 * 7, 10) - 3) < 0.15);
});
test("o atraso medido segue o tempo mesmo quando o de trás está parado (a conta antiga cairia em metros)", () => {
  const c = T.criarCronometragem(), n = 1000;
  for (let i = 0; i <= 100; i++) c.registrar("A", 100 + 50 * i * 0.1, i * 0.1, n);
  // o de trás está em 300 (A passou ali aos 4,0 s) e vale "parado": a velocidade dele não entra na conta
  assert.ok(Math.abs(c.atraso("A", 300, 10) - 6) < 0.15);
  const antigo = T.diferenca({ lider: false, dist: 100, v: 0, voltas: 0 }); assert.equal(antigo.tipo, "m");
});
test("sem histórico alcançando o ponto devolve null (cai na conta antiga)", () => {
  const c = T.criarCronometragem();
  assert.equal(c.atraso("X", 10, 5), null);
  c.registrar("A", 100, 0, 1000); c.registrar("A", 120, 0.2, 1000);
  assert.equal(c.atraso("A", 50, 1), null); // o ponto é anterior ao histórico
  assert.equal(c.atraso("A", 500, 1), null); // e este ainda não foi alcançado
});
test("carro recolocado (progresso volta) zera o histórico em vez de embaralhar", () => {
  const c = T.criarCronometragem();
  for (let i = 0; i <= 20; i++) c.registrar("A", 100 + i * 10, i * 0.1, 1000);
  c.registrar("A", 20, 2.2, 1000); // recolocado lá atrás
  assert.equal(c.atraso("A", 150, 3), null);
});
test("carro sem notícia (progresso -1e9) não vira +999999 V na torre", () => {
  const lin = T.torre([{ id: 1, prog: 100, v: 80, sigla: "AAA" }, { id: 2, prog: -1e9, v: 0, sigla: "BBB" }], { n: 1000, meuId: 1, esc: 1 });
  assert.equal(lin[1].dif.texto, "—");
});
test("a torre usa o tempo medido quando a cronometragem tem o dado", () => {
  const c = T.criarCronometragem(), n = 1000;
  for (let i = 0; i <= 100; i++) c.registrar(1, 100 + 50 * i * 0.1, i * 0.1, n);
  const cors = [{ id: 1, prog: 600, v: 50, sigla: "AAA" }, { id: 2, prog: 450, v: 50, sigla: "BBB" }];
  const lin = T.torre(cors, { n, meuId: 2, esc: 1, atraso: (x, lid) => c.atraso(lid.id, x.prog, 10) });
  assert.equal(lin[1].dif.texto, "+3.0"); // 150 u / 50 u/s = 3 s (e o histórico confirma)
  const sem = T.torre(cors, { n, meuId: 2, esc: 1 });
  assert.equal(sem[1].dif.texto, "+3.0");
});
test("intervalos do MFD: medido quando há histórico, antigo quando não, e sem carro desconhecido", () => {
  const c = T.criarCronometragem(), n = 1000;
  for (let i = 0; i <= 100; i++) { c.registrar("f", 200 + 40 * i * 0.1, i * 0.1, n); c.registrar("eu", 100 + 40 * i * 0.1, i * 0.1, n); }
  const carros = [{ id: "f", prog: 600, v: 40 }, { id: "eu", prog: 500, v: 40 }, { id: "t", prog: 440, v: 40 }];
  const r = H.intervalos(carros, "eu", 1, 22, c, 10);
  assert.ok(Math.abs(r.frente.seg - 2.5) < 0.2, "a frente a ~2,5 s: " + r.frente.seg);
  assert.ok(r.tras.seg > 1 && r.tras.seg < 2, "atrás pelo histórico de eu: " + r.tras.seg);
  const sem = H.intervalos([{ id: "f", prog: 600, v: 40 }, { id: "eu", prog: 500, v: 40 }, { id: "t", prog: -1e9, v: 0 }], "eu", 1);
  assert.equal(sem.tras, null);
  assert.equal(sem.frente.seg, 2.5);
});
