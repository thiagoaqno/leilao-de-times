// Leitura do jogo: o cansaço tira nota, o confronto de formação/estilo mexe nos lances e a situação do lance muda a chance de verdade.
const test = require("node:test");
const assert = require("node:assert");
const Taticas = require("../public/carreira/taticas.js");
const Motor = require("../public/carreira/motor.js");

const elenco = (nota, prefixo) => {
  const pos = ["GOL", "LE", "ZAG", "ZAG", "LD", "VOL", "MC", "MC", "PE", "ATA", "PD", "GOL", "ZAG", "MC", "ATA", "LE"];
  return pos.map((p, i) => ({ id: `${prefixo}${i}`, nome: `${prefixo}${i}`, pos: p, nota }));
};

test("o cansaço tira 1 ponto de nota a cada 10 de energia abaixo de 90", () => {
  assert.equal(Taticas.penalidadeEnergia(100), 0);
  assert.equal(Taticas.penalidadeEnergia(90), 0);
  assert.equal(Taticas.penalidadeEnergia(80), 1);
  assert.equal(Taticas.penalidadeEnergia(60), 3);
  assert.equal(Taticas.penalidadeEnergia(20), 6);
});

test("o time cansado perde de verdade para o descansado, com o mesmo elenco", () => {
  let pontosCansado = 0, pontosDescansado = 0, jogos = 400;
  const cansaco = Object.fromEntries(elenco(75, "a").map((j) => [j.id, 55]));
  for (let i = 0; i < jogos; i++) {
    const r = Motor.simularPartida({ casa: { id: "a", jogadores: elenco(75, "a"), formacao: "4-3-3", energia: cansaco }, fora: { id: "b", jogadores: elenco(75, "b"), formacao: "4-3-3" }, semente: `cansaco${i}`, modo: 1 });
    pontosCansado += r.placar[0] > r.placar[1] ? 3 : r.placar[0] === r.placar[1] ? 1 : 0;
    pontosDescansado += r.placar[1] > r.placar[0] ? 3 : r.placar[0] === r.placar[1] ? 1 : 0;
  }
  assert.ok(pontosDescansado > pontosCansado * 1.15, `cansado ${pontosCansado} × descansado ${pontosDescansado}`);
});

test("o confronto é simétrico no que importa e tem resposta melhor que a pior escolha", () => {
  const rival = { formacao: "5-4-1", estilo: "catenaccio" };
  const r = Taticas.respostas(rival, "equilibrado");
  assert.ok(r[0].saldo > r.at(-1).saldo + 5, "a melhor resposta vale bem mais que a pior");
  // pontas contra a linha de 5 batem na parede
  const c = Taticas.confronto({ formacao: "4-3-3", estilo: "equilibrado" }, rival);
  assert.ok(c.razoes.some((x) => /linha de 5/.test(x.texto) && x.valor < 0));
  // nenhum confronto passa do teto
  for (const f of Taticas.NOMES_FORMACOES) for (const g of Taticas.NOMES_FORMACOES) {
    const x = Taticas.confronto({ formacao: f, estilo: "tikitaka" }, { formacao: g, estilo: "contra" });
    assert.ok(Math.abs(x.criar) <= 0.12 && Math.abs(x.finalizar) <= 0.08);
  }
});

test("a formação certa contra o rival ganha pontos do mesmo elenco", () => {
  const rival = { formacao: "5-4-1", estilo: "equilibrado" };
  const [melhor] = Taticas.respostas(rival, "equilibrado"), pior = Taticas.respostas(rival, "equilibrado").at(-1);
  let pm = 0, pp = 0;
  for (let i = 0; i < 300; i++) {
    const fora = { id: "b", jogadores: elenco(75, "b"), formacao: rival.formacao, tatica: { estilo: "equilibrado" } };
    const a = Motor.simularPartida({ casa: { id: "a", jogadores: elenco(75, "a"), formacao: melhor.formacao }, fora, semente: `conf${i}`, modo: 1 });
    const b = Motor.simularPartida({ casa: { id: "a", jogadores: elenco(75, "a"), formacao: pior.formacao }, fora, semente: `conf${i}`, modo: 1 });
    pm += a.placar[0] - a.placar[1]; pp += b.placar[0] - b.placar[1];
  }
  assert.ok(pm > pp, `melhor ${pm} × pior ${pp}`);
});

test("o lance decisivo traz a situação e a chance real não é a mostrada", () => {
  // acha um jogo com lance decisivo cuja situação mexe nas opções
  let achou = null;
  for (let i = 0; i < 200 && !achou; i++) {
    const cfg = { casa: { id: "a", jogadores: elenco(78, "a"), formacao: "4-3-3" }, fora: { id: "b", jogadores: elenco(72, "b"), formacao: "4-4-2", tatica: { linha: 2 } }, semente: `sit${i}`, modo: 3, controla: 0, decisoes: {} };
    for (let n = 0; n < 12; n++) {
      const r = Motor.simularPartida(cfg);
      if (!r.parado || r.parado.tipo !== "lance") break;
      if (r.parado.situacao && r.parado.opcoes.some((o) => o.marca)) { achou = r.parado; break; }
      cfg.decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado);
    }
  }
  assert.ok(achou, "alguma situação aparece");
  assert.ok(typeof achou.situacao === "string" && achou.situacao.length > 10);
  assert.ok(achou.opcoes.every((o) => o.real === undefined), "a chance real não vai para a tela");
});
