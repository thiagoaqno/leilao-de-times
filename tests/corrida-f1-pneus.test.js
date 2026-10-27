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

test("pneus: frio na largada, esquenta andando; a aderência fica sempre entre 0,7 e 2,0", () => {
  const pn = F1.pneuNovo("duro");
  assert.ok(F1.frio(pn));
  const frio = F1.aderencia(pn).grip;
  for (let i = 0; i < 60 * 30; i++) F1.gastarPneu(pn, { dist: 0, total: 1, slip: 0, v: 250, vmax: 295, dt: 1 / 60 });
  assert.ok(!F1.frio(pn) && F1.aderencia(pn).grip > frio);
  for (const composto of Object.keys(F1.PNEUS)) for (let d = 0; d <= 1; d += 0.05) for (let t = 0; t <= 1; t += 0.1) {
    const a = F1.aderencia({ composto, desgaste: d, temp: t });
    assert.ok(a.grip >= 0.7 && a.grip <= 2.0 && a.kin >= 0.85 && a.kin <= 1, `${composto} ${d} ${t}`);
  }
  assert.equal(F1.pneuNovo("nada").composto, F1.COMPOSTO_PADRAO); // composto que não existe vira o padrão
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
