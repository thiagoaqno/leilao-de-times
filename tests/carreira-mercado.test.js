// Carreira de Treinador: o mercado com lucro (valor pelo momento, compra guardada, carência), comprar parcelado e com
// troca, a disputa entre clubes, os orçamentos de cada clube, o feed e o pós-jogo.
process.env.DB_PATH = process.env.DB_PATH || ":memory:";
const test = require("node:test");
const assert = require("node:assert");
const Motor = require("../public/carreira/motor.js");
const Mercado = require("../public/carreira/mercado.js");
const Eventos = require("../carreira-eventos.js");
const { novaCarreira, ajudas, timeDe, fecharRodada, propor, estado } = require("../carreira.js").paraTestes;

function jogarRodada(save, i = 0) {
  const [casa, fora] = save.calendario[save.rodada].find((m) => m.includes(save.clube));
  save.partida = { rodada: save.rodada, casa, fora, modo: 1, semente: `m:${save.rodada}:${i}`, decisoes: {} };
  fecharRodada(save, Motor.simularPartida({ casa: timeDe(save, casa), fora: timeDe(save, fora), semente: `m:${save.rodada}:${i}` }));
}
// compra um reserva barato de outro clube pagando bem (a proposta generosa sempre fecha)
function comprar(save, extra = {}) {
  const j = ajudas.elencoDe(save, "palmeiras").filter((x) => !x.base).sort((a, b) => a.nota - b.nota)[0];
  const valor = Math.round(ajudas.valorAtual(save, j) * 1.9 / 1e5) * 1e5, salario = Mercado.salarioDe(ajudas.comNota(save, j)) * 3;
  const r = propor(save, { jogador: j.id, valor, salario, ...extra });
  assert.ok(typeof r === "object" && r.resposta.resultado === "aceita", JSON.stringify(r));
  return { j, valor };
}

test("orçamentos: cada clube começa com o seu caixa e a sua situação", () => {
  const fla = novaCarreira("T", "flamengo", ""), cha = novaCarreira("T", "chapecoense", ""), cor = novaCarreira("T", "corinthians", "");
  assert.strictEqual(fla.caixa, 120e6); assert.strictEqual(fla.situacao, "rico");
  assert.strictEqual(cha.caixa, 10e6); assert.strictEqual(cha.situacao, "pequeno");
  assert.strictEqual(cor.situacao, "endividado");
  assert.ok(fla.caixaIA.palmeiras > fla.caixaIA.chapecoense, "a IA também tem caixas diferentes");
  // o endividado paga a parcela da dívida a cada rodada
  jogarRodada(cor);
  assert.ok(cor.financas.find((f) => f.rodada === 0).itens.some(([n]) => n === "Parcela da dívida"));
});

test("mercado: sem lucro em revenda na hora; com valorização de verdade, a venda dá lucro", () => {
  const save = novaCarreira("T", "flamengo", "");
  const { j, valor } = comprar(save);
  assert.deepStrictEqual(save.compras[j.id], { valor, rodada: 0, temporada: 1 });
  // logo depois da compra, ninguém paga mais do que você pagou
  assert.strictEqual(ajudas.tetoVenda(save, j.id, valor * 3), valor);
  // o jogador evolui (eventos de treino) e passam as rodadas da carência
  save.bonusNota[j.id] = (save.bonusNota[j.id] || 0) + 8;
  save.rodada += Mercado.CARENCIA;
  const agora = ajudas.valorAtual(save, j);
  assert.ok(agora > valor, `valorizou: ${agora} > ${valor}`);
  assert.strictEqual(ajudas.tetoVenda(save, j.id, agora), agora);
  const msg = ajudas.vender(save, j.id, "palmeiras", agora);
  assert.match(msg, /lucro/);
  assert.ok(save.transferencias[0].lucro > 0);
  assert.ok(!save.compras[j.id], "a compra sai do registro depois da venda");
});

test("mercado: o momento (gols e estar à venda) muda o valor", () => {
  const save = novaCarreira("T", "flamengo", "");
  const j = ajudas.elencoDe(save, "flamengo").find((x) => x.pos === "ATA" && !x.base);
  const antes = ajudas.valorAtual(save, j);
  save.gols[j.id] = 8;
  assert.ok(ajudas.valorAtual(save, j) > antes, "gols valorizam");
  save.gols[j.id] = 0; save.aVenda.push(j.id);
  assert.ok(ajudas.valorAtual(save, j) < antes, "à venda desvaloriza um pouco");
  assert.ok(Mercado.chanceDeProposta(antes * 2.4, antes) < Mercado.chanceDeProposta(antes, antes), "pedir caro diminui as propostas");
});

test("mercado: comprar parcelado cobra a entrada agora e as parcelas nas 4 rodadas seguintes", () => {
  const save = novaCarreira("T", "flamengo", ""), caixa0 = save.caixa;
  const { valor } = comprar(save, { parcelas: true });
  const entrada = Math.round(valor * Mercado.ENTRADA / 1e5) * 1e5;
  assert.strictEqual(save.caixa, caixa0 - entrada);
  assert.strictEqual(save.parcelas.length, 1);
  for (let i = 0; i < Mercado.PARCELAS; i++) jogarRodada(save, i);
  assert.strictEqual(save.parcelas.length, 0);
  const pagas = save.financas.flatMap((f) => f.itens).filter(([n]) => n.startsWith("Parcela de")).reduce((s, [, v]) => s - v, 0);
  assert.ok(pagas >= (valor - entrada) * (1 + Mercado.JUROS) - 5e4, `parcelas com juros: ${pagas}`);
});

test("mercado: um jogador seu na troca entra no pagamento e vai para o outro clube", () => {
  const save = novaCarreira("T", "flamengo", ""), caixa0 = save.caixa;
  const meu = ajudas.elencoDe(save, "flamengo").filter((x) => !x.base).sort((a, b) => a.nota - b.nota)[0];
  const credito = Math.round(ajudas.valorAtual(save, meu) * 0.9 / 1e5) * 1e5;
  const { valor } = comprar(save, { troca: meu.id });
  assert.strictEqual(ajudas.donoDe(save, meu.id), "palmeiras");
  assert.strictEqual(save.caixa, caixa0 - Math.max(0, valor - credito));
});

test("disputa: os lances sobem, a mesma semente dá os mesmos lances, e quem espera demais fica com o primeiro", () => {
  const clubes = [{ id: "a", teto: 30e6 }, { id: "b", teto: 26e6 }, { id: "c", teto: 22e6 }];
  const d1 = Mercado.disputa(clubes, 10e6, Motor.sorteDe("x")), d2 = Mercado.disputa(clubes, 10e6, Motor.sorteDe("x"));
  assert.deepStrictEqual(d1, d2);
  assert.ok(d1.lances.length >= 2);
  for (let i = 1; i < d1.lances.length; i++) { assert.ok(d1.lances[i].valor > d1.lances[i - 1].valor); assert.notStrictEqual(d1.lances[i].clube, d1.lances[i - 1].clube); }
  assert.ok(d1.limite >= 1 && d1.limite < d1.lances.length);
  // a resposta: martelo dentro do limite vende pelo lance; depois do limite, sobra o primeiro
  const save = novaCarreira("T", "flamengo", "");
  const pid = ajudas.elencoDe(save, "flamengo")[20].id;
  const lances = [{ clube: "palmeiras", valor: 10e6 }, { clube: "santos", valor: 11e6 }, { clube: "palmeiras", valor: 12e6 }];
  const ev = (id) => ({ id, tipo: "disputa", dados: { jogador: pid, lances, valor: 10e6 } });
  save.segredos = { a: 1 };
  Eventos.responder(save, ev("a"), "martelo-2", ajudas);
  assert.strictEqual(save.transferencias[0].valor, 10e6, "esfriou: vendeu pelo primeiro lance");
  const outro = ajudas.elencoDe(save, "flamengo")[20].id;
  save.segredos = { b: 2 };
  Eventos.responder(save, { ...ev("b"), dados: { ...ev("b").dados, jogador: outro } }, "martelo-1", ajudas);
  assert.strictEqual(save.transferencias[0].valor, 11e6);
});

test("feed e pós-jogo: depois das rodadas há posts com arte e o resumo da rodada", () => {
  const save = novaCarreira("T", "bahia", "");
  for (let i = 0; i < 8; i++) jogarRodada(save, i);
  assert.ok(save.feed.length >= 8 && save.feed.length <= 60);
  assert.ok(save.feed.every((p) => p.arte && p.arte.cena && p.texto && p.curtidas > 0 && Array.isArray(p.comentarios)));
  assert.ok(save.feed.some((p) => ["vitoria", "empate", "derrota"].includes(p.tipo)));
  const pj = save.posJogo;
  assert.strictEqual(pj.rodada, 7);
  assert.strictEqual(pj.moral.length, 2);
  assert.ok(Array.isArray(pj.financas) && pj.financas.some(([n]) => n.startsWith("Cota de TV")));
  const e = estado(save);
  assert.ok(e.feed.length <= 30 && e.posJogo && e.situacao === "saf");
  assert.ok(!("segredos" in e), "o limite das disputas não vai para o navegador");
});
