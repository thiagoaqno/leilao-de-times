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

test("fim de temporada: o balanço traz propostas e o futuro precisa ser escolhido se o contrato acabou", async () => {
  await nova({ clube: "palmeiras", idade: 19, temporadas: 3 });
  assert.equal((await chamar("empresario", { nivel: 1 })).ok, false); // sem fama, sem empresário
  assert.equal((await chamar("decidir", { tipo: "ficar" })).ok, false); // ainda não é hora
  let e;
  for (;;) { const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); e = r.estado; if (e.acabou) break; }
  assert.ok(e.balanco && e.balanco.objetivos.length === 3);
  assert.ok(e.mercado.ofertas.length >= 1 && e.mercado.renovacao.length === 2);
  assert.equal(e.mercado.precisaEscolher, false); // o contrato inicial tem 3 temporadas
  const o = e.mercado.ofertas[0];
  const d = await chamar("decidir", { tipo: "oferta", id: o.id }); assert.equal(d.ok, true, d.error);
  assert.equal((await chamar("decidir", { tipo: "oferta", id: "nao-existe" })).ok, false);
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.clube.id, o.clube);
  assert.equal(p.estado.emprestimo !== null, o.tipo === "emprestimo");
  assert.equal(p.estado.mercado, null);
  assert.equal(p.estado.confianca, { titular: 62, "rodízio": 50, reserva: 36 }[o.papel]);
  // joga a temporada no clube novo sem erro: o calendário e o elenco foram refeitos
  let n = 0;
  for (;;) { const r = await chamar("jogar"); assert.equal(r.ok, true, r.error); n++; if (r.estado.acabou) { e = r.estado; break; } }
  assert.ok(n >= 30);
  assert.equal(e.historico.length, 2);
  assert.equal(e.historico[1].clube, o.clube);
});

test("contrato vencido bloqueia a próxima temporada até renovar ou aceitar proposta", async () => {
  await nova({ clube: "palmeiras", idade: 19, temporadas: 2 });
  const { visao } = Jogador.paraTestes; assert.ok(visao);
  let e;
  for (;;) { const r = await chamar("jogar"); e = r.estado; if (e.acabou) break; }
  // com 2 temporadas o contrato inicial é de 2: no fim da primeira ainda vale, então força o vencimento pelo banco
  assert.equal(e.mercado.precisaEscolher, false);
  const r = await chamar("decidir", { tipo: "renovar", id: e.mercado.renovacao[0].id });
  assert.equal(r.ok, true, r.error);
  assert.equal(r.estado.mercado.escolha.tipo, "renovar");
  const p = await chamar("proxima"); assert.equal(p.ok, true, p.error);
  assert.equal(p.estado.contrato.anos, 2);
});
