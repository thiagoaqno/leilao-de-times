// Modo Jogador (jogador.js): criar, jogar uma temporada inteira, confiança, objetivos e a virada
process.env.DB_PATH = ":memory:";
const test = require("node:test");
const assert = require("node:assert/strict");
const bd = require("../bd.js");
bd.abrir();
const Jogador = require("../jogador.js");
const handlers = {};
Jogador({ of: () => ({ on: (e, f) => f({ on: (n, h) => { handlers[n] = h; } }) }) });
const chamar = (n, d) => new Promise((res) => handlers[n](d, res));
const nova = (extra = {}) => chamar("criar", { nome: "Gabi Gol", pos: "ATA", clube: "remo", idade: 20, temporadas: 2, ...extra });

test("criar valida nome, posição e clube", async () => {
  assert.equal((await chamar("criar", { nome: "", pos: "ATA", clube: "remo" })).ok, false);
  assert.equal((await chamar("criar", { nome: "A", pos: "XXX", clube: "remo" })).ok, false);
  assert.equal((await chamar("criar", { nome: "A", pos: "ATA", clube: "nao-existe" })).ok, false);
});

test("o jogador nasce no elenco do clube, com nota pela idade e papel de reserva ou titular", async () => {
  const r = await nova();
  assert.equal(r.ok, true, r.error);
  const e = r.estado;
  assert.equal(e.eu.nota, 63); assert.equal(e.eu.pos, "ATA"); assert.equal(e.clube.id, "remo");
  assert.ok(["titular", "banco"].includes(e.papel));
  assert.equal(e.objetivos.length, 3);
});

test("uma temporada: jogos, confiança entre 5 e 100, notas e fim com histórico; a próxima começa zerada", async () => {
  const r0 = await nova();
  let e = r0.estado, n = 0;
  while (!e.acabou) {
    const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); e = r.estado; n++;
    assert.ok(e.confianca >= 5 && e.confianca <= 100);
    if (e.relatorio.jogou) assert.ok(e.relatorio.nota >= 3 && e.relatorio.nota <= 10);
  }
  assert.ok(n >= 30 && n <= e.totalJogos); // quem cai numa copa joga menos que o calendário inteiro
  assert.equal(e.historico.length, 1);
  assert.equal(e.temp.jogos, e.carreira.jogos);
  assert.equal((await chamar("jogar")).ok, false);
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.temporada, 2); assert.equal(p.estado.temp.jogos, 0); assert.equal(p.estado.eu.idade, 21);
});

test("o treino só aceita foco da posição e a última temporada fecha a carreira", async () => {
  await nova({ pos: "GOL", temporadas: 1 });
  assert.equal((await chamar("foco", { foco: "ataque" })).ok, false);
  assert.equal((await chamar("foco", { foco: "goleiro" })).ok, true);
  assert.equal((await chamar("proxima")).ok, false);
  let e;
  for (;;) { const r = await chamar("jogar"); if (!r.ok) break; e = r.estado; if (e.acabou) break; }
  assert.equal(e.fim, true);
  assert.equal((await chamar("proxima")).ok, false);
  assert.equal(e.historico.length, 1);
});
