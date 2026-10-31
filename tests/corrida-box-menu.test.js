// O menu do box (sim.js, fase "escolha"): quem pede a parada sem escolher o pneu ("decidir") para na garagem, o carro fica parado com o tempo contando,
// escolhe o pneu (ou "não trocar"), ou sai com o recomendado depois de ESCOLHA_BOX_S. Com e sem stop-and-go, pelo empacotar/desempacotar (o fio do servidor).
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const S = require("../public/corrida/sim.js");
const D = require("../public/corrida/dinamica.js");
const Equipes = require("../public/corrida/f1-equipes.js");

const spec = Equipes.specDaEquipe("mclaren");
const JOGOS = { macio: 2, medio: 1, duro: 2, chuva: 2 };
function parada({ escolheApos = null, escolha = null, stopGo = false, jogos = JOGOS, agua = 0, pedidoInicial = "decidir", fio = true }) {
  const tr = S.criarPista(T.PISTAS.interlagos, "interlagos"), c = S.novo(tr, { grid: 0, f1: true, pneu: Object.assign(F1.pneuNovo("medio"), { desgaste: 0.6, temp: 0.9 }), box: true });
  const cor = tr.corredor, ini = (cor.i0 - 40 + tr.n) % tr.n, q = tr.pts[ini];
  Object.assign(c, { x: q.x, y: q.y, z: q.h, a: Math.atan2(q.ty, q.tx), idx: ini, v: 150, marcha: 5 });
  const amb = { spec, voltas: 5, laps: 0, paradas: 0, semente: 99, id: "ana", grid: 3, f1: true, outros: [], stopGo: stopGo ? 8 : 0, jogos, agua }, ev = [], eventos = [], ent = {};
  let parado = null, vMax = 0, desloc = 0;
  for (let i = 0; i < 120 * 90; i++) {
    ev.length = 0;
    let pedido = pedidoInicial;
    if (c.box.fase === "escolha") { if (!parado) parado = { x: c.x, y: c.y }; vMax = Math.max(vMax, c.v); desloc = Math.max(desloc, Math.hypot(c.x - parado.x, c.y - parado.y)); if (escolha && c.box.t >= escolheApos) pedido = escolha; }
    let e = { gas: c.v < (c.box.fase ? 9999 : 150) ? 1 : 0, brake: 0, steer: 0, pedido };
    if (fio) e = S.desempacotar(S.empacotar(e), ent);
    S.passo(c, e, amb, tr, ev); for (const x of ev) eventos.push({ ...x, quando: i * D.PASSO });
  }
  const sai = eventos.find((x) => x.t === "box" && x.fase === "sai"), esc = eventos.find((x) => x.t === "boxEscolheu"), par = eventos.find((x) => x.t === "boxParou");
  return { sai, esc, par, pneu: c.pneu.composto, vMax, desloc, tipos: eventos.filter((x) => x.t.startsWith("box")).map((x) => x.t + (x.fase ? ":" + x.fase : "")) };
}

test("o fio leva o pedido 'decidir' e o 'manter' (5 e 6) sem confundir com os pneus", () => {
  for (const p of ["macio", "medio", "duro", "chuva", "decidir", "manter", null]) assert.equal(S.desempacotar(S.empacotar({ pedido: p })).pedido, p);
});
for (const stopGo of [false, true]) {
  const rotulo = stopGo ? "com stop-and-go" : "sem stop-and-go";
  test(`menu (${rotulo}): para na garagem, o carro fica parado e a escolha vira o pneu`, () => {
    for (const c of ["macio", "duro", "chuva"]) {
      const r = parada({ escolheApos: 2, escolha: c, stopGo });
      assert.deepEqual(r.tipos.slice(0, 3), ["box:entra", "boxParou", "boxEscolheu"], c);
      assert.equal(r.esc.composto, c); assert.equal(r.sai.composto, c); assert.equal(r.pneu, c);
      assert.equal(r.vMax, 0, "o carro não anda com o menu aberto"); assert.ok(r.desloc < 1e-6);
      assert.ok(!r.esc.auto);
    }
  });
  test(`menu (${rotulo}): o tempo no menu soma à parada`, () => {
    const curto = parada({ escolheApos: 0.5, escolha: "duro", stopGo }), longo = parada({ escolheApos: 4, escolha: "duro", stopGo });
    assert.ok(Math.abs((longo.sai.tempo - curto.sai.tempo) - 3.5) < 0.1, `${curto.sai.tempo} → ${longo.sai.tempo}`);
  });
  test(`menu (${rotulo}): sem escolha em ${F1.ESCOLHA_BOX_S} s sai com o recomendado`, () => {
    const r = parada({ stopGo });
    assert.equal(r.esc.auto, true); assert.ok(Math.abs((r.esc.quando - r.par.quando) - F1.ESCOLHA_BOX_S) < 0.05);
    assert.equal(r.esc.composto, F1.recomendarParada({ atual: "medio", jogos: JOGOS, agua: 0, voltasRestantes: 4, fator: spec.desgaste }));
    assert.equal(r.sai.composto, r.esc.composto); assert.equal(r.pneu, r.esc.composto);
  });
  test(`menu (${rotulo}): "não trocar" sai com o pneu de agora, sem trocar`, () => {
    const r = parada({ escolheApos: 1, escolha: "manter", stopGo });
    assert.equal(r.esc.manter, true); assert.equal(r.sai.manter, true); assert.equal(r.sai.composto, "medio"); assert.equal(r.pneu, "medio");
    assert.ok(!r.tipos.includes("boxTrocou"), "o pneu não é trocado");
    assert.equal(r.sai.troca, false);
  });
}
test("com stop-and-go o pedido cumpre os 8 s e troca na mesma parada", () => {
  const r = parada({ escolheApos: 1, escolha: "chuva", stopGo: true });
  assert.equal(r.sai.stopGo, true); assert.equal(r.sai.troca, true);
  assert.ok(r.sai.tempo > 8 + 1, `a parada inteira levou ${r.sai.tempo} s`);
});
test("quem pede o pneu direto não vê o menu", () => {
  for (const stopGo of [false, true]) {
    const r = parada({ pedidoInicial: "duro", stopGo });
    assert.ok(!r.tipos.includes("boxEscolheu") && r.esc === undefined && r.sai.composto === "duro" && r.vMax === 0);
  }
});
test("a recomendação: chuva com pista molhada, seco com a pista secando, e o que aguenta as voltas", () => {
  assert.equal(F1.recomendarParada({ atual: "medio", jogos: JOGOS, agua: 0.6, voltasRestantes: 4 }), "chuva");
  assert.notEqual(F1.recomendarParada({ atual: "medio", jogos: { ...JOGOS, chuva: 0 }, agua: 0.6, voltasRestantes: 4 }), "chuva");
  assert.notEqual(F1.recomendarParada({ atual: "chuva", jogos: JOGOS, agua: 0.05, voltasRestantes: 4 }), "chuva");
  assert.equal(F1.recomendarParada({ atual: "chuva", jogos: JOGOS, agua: 0.8, voltasRestantes: 4 }), "chuva");
  assert.equal(F1.recomendarParada({ atual: "medio", jogos: { macio: 2, medio: 2, duro: 2, chuva: 2 }, voltasRestantes: 1 }), "macio");
  assert.equal(F1.recomendarParada({ atual: "medio", jogos: { macio: 2, medio: 2, duro: 2, chuva: 2 }, voltasRestantes: 40 }), "duro");
  assert.equal(F1.recomendarParada({ atual: "medio", jogos: { macio: 0, medio: 2, duro: 0, chuva: 0 }, voltasRestantes: 5 }), "medio");
});
