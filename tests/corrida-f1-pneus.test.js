// Corrida: os pneus das regras de F1 (public/corrida/f1-regras.js), nos robôs e na sala do servidor.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

// uma corrida de mentira: anda `total` em passos de 1/60 s a 200 por segundo, escorregando `slip`, e devolve o
// desgaste e a aderência a cada fração da corrida
function rodar(composto, { total = 13000 * 5, slip = 0, ate = 1 } = {}) {
  const pn = F1.pneuNovo(composto), dt = 1 / 60, passo = 200 * dt, marcas = [];
  for (let andou = 0; andou < total * ate; andou += passo) {
    F1.gastarPneu(pn, { dist: passo, total, slip, v: 200, vmax: 295, dt });
    marcas.push({ f: andou / total, desgaste: pn.desgaste, grip: F1.aderencia(pn).grip });
  }
  return { pn, marcas };
}
const naFracao = (marcas, f) => marcas.find((m) => m.f >= f) || marcas[marcas.length - 1];

test("pneus: o macio é o mais rápido no começo e chega ao penhasco antes do médio e do duro", () => {
  const macio = rodar("macio", { ate: 1.3 }).marcas, medio = rodar("medio", { ate: 1.3 }).marcas, duro = rodar("duro", { ate: 1.3 }).marcas; // um pouco além da chegada: o duro só chega ao penhasco depois dela
  const cedo = 0.1; // já quente, ainda novo
  assert.ok(naFracao(macio, cedo).grip > naFracao(medio, cedo).grip && naFracao(medio, cedo).grip > naFracao(duro, cedo).grip);
  const penhasco = (m) => m.find((x) => x.desgaste >= F1.PENHASCO)?.f ?? Infinity;
  assert.ok(penhasco(macio) < penhasco(medio) && penhasco(medio) < penhasco(duro), `${penhasco(macio)} ${penhasco(medio)} ${penhasco(duro)}`);
  // limpo, cada composto chega ao penhasco um pouco depois da vida dele (andar limpo gasta menos que o normal)
  for (const [id, m] of [["macio", macio], ["medio", medio], ["duro", duro]]) {
    const f = penhasco(m), vida = F1.PNEUS[id].vida;
    assert.ok(f >= vida && f < vida * 1.25, `${id}: penhasco em ${f.toFixed(2)} da corrida (vida ${vida})`);
  }
  // depois do penhasco, o macio despenca e fica atrás do duro
  assert.ok(naFracao(macio, 0.6).grip < naFracao(duro, 0.6).grip);
});

test("pneus: 3 ou 8 voltas gastam a mesma fração do pneu", () => {
  const volta = 13000, curta = rodar("medio", { total: volta * 3, ate: 0.5 }).pn, longa = rodar("medio", { total: volta * 8, ate: 0.5 }).pn;
  assert.ok(Math.abs(curta.desgaste - longa.desgaste) < 0.01, `${curta.desgaste} ${longa.desgaste}`);
});

test("pneus: escorregar gasta mais que andar limpo", () => {
  const limpo = rodar("medio", { ate: 0.3 }).pn, sujo = rodar("medio", { ate: 0.3, slip: 80 }).pn;
  assert.ok(sujo.desgaste > limpo.desgaste * 1.4, `${limpo.desgaste} ${sujo.desgaste}`);
});

test("pneus: frio na largada, esquenta andando; a aderência fica sempre entre 0,4 e 1,6", () => {
  const pn = F1.pneuNovo("duro");
  assert.ok(F1.frio(pn));
  const frio = F1.aderencia(pn).grip;
  for (let i = 0; i < 60 * 40; i++) F1.gastarPneu(pn, { dist: 0, total: 1, slip: 0, v: 250, vmax: 295, dt: 1 / 60 });
  assert.ok(!F1.frio(pn) && F1.aderencia(pn).grip > frio);
  for (const composto of Object.keys(F1.PNEUS)) for (let d = 0; d <= 1; d += 0.05) for (let t = 0; t <= 1; t += 0.1) {
    const a = F1.aderencia({ composto, desgaste: d, temp: t });
    assert.ok(a.grip >= 0.4 && a.grip <= 1.6 && a.kin >= 0.55 && a.kin <= 1.1 && a.solta >= 0 && a.solta <= 1 && a.agil >= 0.8 && a.agil <= 1.1, `${composto} ${d} ${t}`);
  }
  assert.equal(F1.pneuNovo("nada").composto, F1.COMPOSTO_PADRAO); // composto que não existe vira o padrão
});

test("pneus: os números de cada composto (aderência lateral, frio e gasto) são os documentados e fazem diferença entre eles", () => {
  const grip = (composto, desgaste, temp) => F1.aderencia({ composto, desgaste, temp }).grip;
  // novo e quente (o multiplicador do `grip` do carro): macio 1,22, médio 1,06, duro 0,92
  assert.deepEqual(["macio", "medio", "duro"].map((c) => +grip(c, 0, 1).toFixed(2)), [1.22, 1.06, 0.92]);
  // frio (saindo do box ou na largada): 80% do grip, e o macio frio ainda segura mais que o duro quente
  for (const c of ["macio", "medio", "duro"]) assert.ok(Math.abs(grip(c, 0, F1.TEMP_SAIDA) / grip(c, 0, 1) - 0.8) < 1e-9, c);
  assert.ok(grip("macio", 0, F1.TEMP_SAIDA) > grip("duro", 0, 1) * 1.04);
  // no penhasco (desgaste 0,8) o macio já perdeu mais que o duro, e com o pneu acabado cai abaixo dele
  assert.ok(grip("macio", 0.8, 1) / grip("macio", 0, 1) > 0.9 && grip("duro", 0.8, 1) / grip("duro", 0, 1) > 0.9);
  assert.deepEqual(["macio", "medio", "duro"].map((c) => +grip(c, 1, 1).toFixed(2)), [0.4, 0.55, 0.68]);
  assert.ok(grip("macio", 1, 1) < grip("duro", 1, 1) * 0.65, "o macio acabado fica bem atrás do duro acabado");
  // o frio e o penhasco soltam o carro (frente e traseira); quente e inteiro, nada
  assert.equal(F1.aderencia({ composto: "medio", desgaste: 0, temp: 1 }).solta, 0);
  assert.ok(F1.aderencia({ composto: "medio", desgaste: 0, temp: F1.TEMP_SAIDA }).solta >= 0.6);
  assert.ok(F1.aderencia({ composto: "macio", desgaste: 1, temp: 1 }).solta >= 0.9);
  // o macio vira mais (agilidade), segura mais depois de saturar (kin) e arranca/freia melhor
  const q = (c) => F1.aderencia({ composto: c, desgaste: 0, temp: 1 });
  assert.ok(q("macio").agil > q("medio").agil && q("medio").agil > q("duro").agil);
  assert.ok(q("macio").kin > q("medio").kin && q("medio").kin > q("duro").kin);
  assert.ok(q("macio").tracao > q("medio").tracao && q("medio").tracao > q("duro").tracao && q("macio").freio > q("duro").freio);
  // o pneu aquece mais devagar que a corrida: na largada o duro leva uns 10 s para ficar bom e o macio uns 4
  const aquecer = (composto) => { const pn = F1.pneuNovo(composto); let t = 0; while (F1.frio(pn) && t < 60) { F1.gastarPneu(pn, { dist: 0, total: 1, slip: 0, v: 220, vmax: 295, dt: 1 / 60 }); t += 1 / 60; } return t; };
  const [m, e, d] = ["macio", "medio", "duro"].map(aquecer);
  assert.ok(m < e && e < d && m > 2 && d > 6 && d < 25, `aquecer: macio ${m.toFixed(1)} s, médio ${e.toFixed(1)} s, duro ${d.toFixed(1)} s`);
});

// os robôs numa volta só, no tempo de mentira (como em corrida-robos.test.js)
function voltaDosRobos(regras, pneu) {
  const agora = Date.now; let relogio = agora();
  Date.now = () => relogio;
  try {
    const room = { config: { pista: "interlagos", caixas: false, robos: 3, nivel: "medio", voltas: 1, regras }, players: {}, order: [], phase: "race", startAt: relogio };
    let k = 0; Robos.preparar(room, ["#a", "#b", "#c", "#d"], () => "x" + k++);
    room.order.forEach((id, i) => Object.assign(room.players[id], { grid: i, laps: 0, sector: T.SECTORS - 1, started: false, finish: null, pneu }));
    Itens.start(room); Robos.largar(room);
    const setor = (p, s) => { p.sector = s; if (s === 0) { if (!p.started) p.started = true; else p.laps++; } };
    for (let t = 0; t < 240 && room.order.some((id) => !room.players[id].laps); t += 0.05) { relogio += 50; Robos.passo(room, 0.05, setor, () => {}); }
    return room.order.map((id) => room.players[id]);
  } finally { Date.now = agora; }
}

test("robôs: nas regras de F1 usam o mesmo pneu, que gasta pela volta; sem elas, nada muda", () => {
  for (const r of voltaDosRobos("galera")) { assert.equal(r.ia.pneu, null); assert.equal(r.laps, 1); }
  // (desde o pit stop, cada robô sai com o composto da estratégia dele, e não com o do jogador)
  for (const r of voltaDosRobos("f1", "medio")) {
    assert.equal(r.laps, 1, "fecha a volta"); assert.ok(!F1.frio(r.ia.pneu), "o pneu esquentou");
    assert.equal(r.ia.pneu.composto, r.ia.plano.largada);
    // a corrida de uma volta inteira gasta o pneu: perto do penhasco no médio, bem antes dele no duro
    const vida = F1.PNEUS[r.ia.pneu.composto].vida;
    assert.ok(r.ia.pneu.desgaste > Math.min(0.7, F1.PENHASCO / vida * 0.8) && r.ia.pneu.desgaste < 1, `${r.ia.pneu.composto}: ${r.ia.pneu.desgaste}`);
  }
});

test("sala: as regras de F1 desligam caixas e ajuda do pelotão, e cada piloto escolhe o pneu da largada", { timeout: 30000 }, async () => {
  bd.fechar(); bd.abrir(":memory:");
  const srv = await subirServidor();
  const a = await conectar(srv.url, "/corrida");
  try {
    await pedir(a, "create", { name: "Ana", config: { pista: "interlagos", caixas: true } });
    let st = await esperarEstado(a, (s) => s.config);
    assert.equal(st.config.regras, "galera"); assert.equal(st.config.caixas, true); assert.equal(st.players[0].pneu, "medio");
    await pedir(a, "act", { type: "config", config: { ...st.config, regras: "f1", caixas: true, equilibrio: true } });
    st = await esperarEstado(a, (s) => s.config.regras === "f1");
    assert.equal(st.config.caixas, false); assert.equal(st.config.equilibrio, false);
    await assert.rejects(pedir(a, "act", { type: "pneu", pneu: "chuva" }), /Pneu inválido/);
    await pedir(a, "act", { type: "pneu", pneu: "macio" });
    st = await esperarEstado(a, (s) => s.players[0].pneu === "macio");
    await pedir(a, "act", { type: "start" });
    await esperarEstado(a, (s) => s.phase === "race");
    await assert.rejects(pedir(a, "act", { type: "pneu", pneu: "duro" }), /fora da corrida/);
  } finally { a.close(); await srv.parar(); bd.fechar(); }
});
