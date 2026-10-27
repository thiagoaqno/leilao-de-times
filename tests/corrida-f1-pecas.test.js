const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../public/corrida/f1-pecas.js");
const E = require("../public/corrida/f1-equipes.js");
const R = require("../public/corrida/temporada/regras.js");
const G = require("../public/corrida/temporada/grupo-regras.js");

const media = { motor: 3, aero: 3, chassi: 3, freios: 3, suspensao: 3, confiab: 3 };

test("cada categoria tem de 3 a 4 peças com custo igual à soma dos níveis", () => {
  assert.ok(P.CATEGORIAS.length >= 7);
  for (const c of P.CATEGORIAS) {
    assert.ok(c.pecas.length >= 3 && c.pecas.length <= 4, c.id);
    assert.ok(c.pecas.some((p) => p.id === c.padrao), c.id + " tem padrão");
    for (const p of c.pecas) { assert.ok(p.nome && p.efeito, p.id); assert.equal(p.custo, Object.values(p.nivel).reduce((a, b) => a + b, 0)); assert.ok(p.custo > 0); }
  }
});

test("o carro médio (peças padrão) dá os níveis e os atributos de hoje e cabe no orçamento", () => {
  const pad = P.pecasPadrao(), m = P.montagemDePecas(pad);
  assert.deepEqual(m, media);
  assert.equal(P.custoDePecas(pad), 18);
  for (const [id, q] of Object.entries(E.EQUIPES)) assert.ok(P.validarPecas(id, pad, 0).ok === (18 <= q.orcamento), id);
  const a = E.specDaMontagem(m), b = E.specDaMontagem(media);
  assert.deepEqual(a, b);
  assert.ok(a.vmax > 290 && a.vmax < 320 && a.quebra === E.QUEBRA_PADRAO);
});

test("os atributos vêm das peças: asa de alta pressão vira mais curva e menos reta", () => {
  const base = P.pecasPadrao();
  const alta = { ...base, "asa-tras": "ar-alta" }, baixa = { ...base, "asa-tras": "ar-baixa" };
  const sa = E.specDaMontagem(P.montagemDePecas(alta)), sb = E.specDaMontagem(P.montagemDePecas(baixa));
  assert.ok(sa.grip > sb.grip && sa.vmax < sb.vmax);
  assert.ok(E.specDaMontagem(P.montagemDePecas({ ...base, cambio: "cb-titanio" })).quebra < E.QUEBRA_PADRAO);
});

test("o custo total nunca passa do orçamento: peças caras são recusadas", () => {
  const tudo = Object.fromEntries(P.CATEGORIAS.map((c) => [c.id, c.pecas[c.pecas.length - 1].id]));
  const r = P.validarPecas("mclaren", tudo);
  assert.equal(r.ok, false); assert.match(r.erro, /orçamento/);
  assert.equal(P.validarPecas("mclaren", { ...P.pecasPadrao(), unidade: "nao-existe" }).ok, false);
  assert.equal(P.validarPecas("mclaren", { ...P.pecasPadrao(), outra: "x" }).ok, false);
  assert.equal(P.validarPecas("mclaren", { ...P.pecasPadrao(), cambio: "v6-padrao" }).ok, false, "peça de outra categoria");
  assert.equal(P.validarPecas("mclaren", { unidade: "v6-padrao" }).ok, false);
  // o bônus de desenvolvimento amplia o limite
  const caro = { ...P.pecasPadrao(), unidade: "v6-turbo", freios: "fr-ventilado", suspensao: "su-adaptativa" }; // 18 + 1 + 1 + 1 = 21
  assert.equal(P.custoDePecas(caro), 21);
  assert.equal(P.validarPecas("mclaren", caro, 0).ok, false);
  assert.equal(P.validarPecas("mclaren", caro, 1).ok, true);
});

test("save antigo (só níveis): cada montagem padrão das equipes vira peças que cabem no orçamento e ficam perto", () => {
  for (const [id, q] of Object.entries(E.EQUIPES)) {
    const pecas = P.migrarMontagem(q.padrao, q.orcamento), v = P.validarPecas(id, pecas, 0);
    assert.ok(v.ok, id);
    const dist = P.NIVEIS.reduce((s, k) => s + Math.abs(v.montagem[k] - q.padrao[k]), 0);
    assert.ok(dist <= 2, `${id} ficou a ${dist} níveis do save antigo`);
  }
  assert.deepEqual(P.montagemDePecas(P.migrarMontagem(media, 18)), media, "o médio converte sem perda");
  assert.deepEqual(P.pecasDe("ferrari", E.EQUIPES.ferrari.padrao, null), P.migrarMontagem(E.EQUIPES.ferrari.padrao, 19));
  assert.deepEqual(P.migrarMontagem(null, 20), P.pecasPadrao() && P.migrarMontagem({}, 20)); // lixo não quebra
});

test("a temporada solo aceita peças e continua aceitando o formato antigo (níveis)", () => {
  const s = R.criar("Teste", "ferrari", 4, 2, 7);
  assert.equal(s.pecas, undefined, "save antigo não tem peças");
  R.aplicarMontagem(s, { montagem: { ...s.montagem, motor: 4, freios: 4 } });
  assert.equal(s.pecas, null); assert.equal(s.montagem.motor, 4);
  R.aplicarMontagem(s, { pecas: P.pecasPadrao() });
  assert.deepEqual(s.montagem, media); assert.equal(s.pecas.unidade, "v6-padrao");
  assert.throws(() => R.aplicarMontagem(s, { pecas: { ...P.pecasPadrao(), unidade: "v6-quali", ers: "ers-total", "asa-tras": "ar-maxima" } }), /orçamento/);
  assert.deepEqual(s.pecas, P.pecasPadrao(), "recusado não muda nada");
  const ui = P.pecasDe("ferrari", { motor: 5, aero: 3, chassi: 3, freios: 3, suspensao: 2, confiab: 3 }, undefined, 0);
  assert.ok(P.validarPecas("ferrari", ui).ok);
});

test("a temporada em grupo guarda as peças, aceita o formato antigo e a equipe dividida enxerga a mesma escolha", () => {
  const sala = G.criarSala("ABCD", { id: "a", nome: "Ana", tokenHash: "a" });
  G.entrar(sala, { id: "b", nome: "Beto", tokenHash: "b" });
  G.escolherEquipe(sala, "a", "ferrari"); G.escolherEquipe(sala, "b", "ferrari");
  G.definirOpcoes(sala, "a", { tamanho: 4, voltas: 2 }); G.iniciar(sala, "a", 77);
  const t = sala.equipes.ferrari;
  assert.equal(t.pecas, undefined, "a equipe nova começa com os níveis padrão (sem peças escolhidas)");
  const novas = { ...P.pecasPadrao(), unidade: "v6-cliente", ers: "ers-eficiente", "asa-diant": "af-baixa" };
  G.montar(sala, "a", { pecas: novas }, t.versao);
  assert.deepEqual(t.pecas, novas); assert.deepEqual(t.montagem, P.montagemDePecas(novas));
  assert.ok(t.historico.some((h) => /montou o carro/.test(JSON.stringify(h))));
  G.montar(sala, "b", { ...t.montagem, freios: t.montagem.freios + 1 }, t.versao); // o formato antigo ainda vale
  assert.equal(t.pecas, null);
  assert.throws(() => G.montar(sala, "a", { pecas: { ...P.pecasPadrao(), unidade: "v6-quali", cambio: "cb-titanio", "asa-tras": "ar-maxima" } }, t.versao), /orçamento/);
});
