// Corrida: os pneus das regras de F1 (public/corrida/f1-regras.js), nos robôs e na sala do servidor.
const test = require("node:test");
const assert = require("node:assert/strict");
const F1 = require("../public/corrida/f1-regras.js");
const T = require("../public/corrida/pistas.js");
const Robos = require("../corrida-robos.js");
const Itens = require("../corrida-itens.js");
const bd = require("../bd.js");
const { subirServidor, conectar, pedir, esperarEstado } = require("./ajuda.js");

// uma corrida de mentira: anda `voltas` voltas de `volta` unidades a 200 por segundo, escorregando `slip`, e devolve a cada passo
// quantas voltas andou, o desgaste e a aderência
function rodar(composto, { volta = 13000, voltas = 8, slip = 0, travada = 0, patina = 0 } = {}) {
  const pn = F1.pneuNovo(composto), dt = 1 / 60, passo = 200 * dt, marcas = [];
  for (let andou = 0; andou < volta * voltas; andou += passo) {
    F1.gastarPneu(pn, { dist: passo, volta, slip, travada, patina, v: 200, vmax: 295, dt });
    marcas.push({ v: andou / volta, desgaste: pn.desgaste, grip: F1.aderencia(pn).grip });
  }
  return { pn, marcas };
}
const voltasAtePenhasco = (marcas) => marcas.find((m) => m.desgaste >= F1.PENHASCO)?.v ?? Infinity;

test("pneus: a vida é em voltas (macio ~1,5, médio 3 a 4, duro 6 ou mais) e o macio é o mais rápido novo", () => {
  const vida = Object.fromEntries(Object.keys(F1.PNEUS).map((c) => [c, voltasAtePenhasco(rodar(c, { slip: 15, voltas: 10 }).marcas)]));
  assert.ok(vida.macio > 1.2 && vida.macio < 1.8, `macio ${vida.macio}`);
  assert.ok(vida.medio > 3 && vida.medio < 4.5, `médio ${vida.medio}`);
  assert.ok(vida.duro >= 6 && vida.duro < 9, `duro ${vida.duro}`);
  const g = (c) => F1.aderencia({ composto: c, desgaste: 0, temp: 1 });
  assert.ok(g("macio").grip > g("medio").grip && g("medio").grip > g("duro").grip);
  assert.ok(g("macio").freio > g("medio").freio && g("medio").tracao > g("duro").tracao);
  assert.equal(g("medio").freio, 1.08); // o médio é a base da dirigibilidade
  assert.ok(F1.vidaRestante({ desgaste: 0 }) === 1 && F1.vidaRestante({ desgaste: F1.PENHASCO }) === 0);
});

test("pneus: a vida é em voltas, não na fração da corrida nem na distância", () => {
  const um = (volta) => rodar("medio", { volta, voltas: 1 }).pn.desgaste;
  assert.ok(Math.abs(um(13000) - um(17500)) < 0.01, `${um(13000)} ${um(17500)}`); // uma volta gasta o mesmo em qualquer pista
});

test("pneus: escorregar, travar a roda e patinar gastam mais que andar limpo", () => {
  const d = (o) => rodar("medio", { voltas: 1, ...o }).pn.desgaste, limpo = d({});
  assert.ok(d({ slip: 80 }) > limpo * 1.4 && d({ travada: 1 }) > limpo * 1.5 && d({ patina: 1 }) > limpo * 1.2);
});

test("pneus: depois do penhasco o carro fica muito ruim; frio na largada, esquenta em alguns segundos", () => {
  for (const c of Object.keys(F1.PNEUS)) {
    const novo = F1.aderencia({ composto: c, desgaste: 0, temp: 1 }), fim = F1.aderencia({ composto: c, desgaste: 1, temp: 1 }), cliff = F1.aderencia({ composto: c, desgaste: F1.PENHASCO, temp: 1 });
    assert.ok(cliff.grip > novo.grip * 0.9, `${c}: até o penhasco perde pouco`);
    assert.ok(fim.grip < novo.grip * 0.65 && fim.tracao < novo.tracao * 0.7 && fim.freio < novo.freio * 0.7 && fim.final < 0.95 && fim.final > 0.85, `${c}: depois dele despenca`);
  }
  const quanto = (c) => { const pn = F1.pneuNovo(c); for (let t = 0; t < 60 * 30; t++) { if (!F1.frio(pn)) return t / 60; F1.gastarPneu(pn, { dist: 0, volta: 1, v: 250, vmax: 295, dt: 1 / 60 }); } return Infinity; };
  assert.ok(F1.frio(F1.pneuNovo("duro")));
  assert.ok(quanto("macio") < quanto("medio") && quanto("medio") < quanto("duro") && quanto("macio") > 1.5 && quanto("duro") < 12, `${quanto("macio")} ${quanto("medio")} ${quanto("duro")}`);
  for (const composto of Object.keys(F1.PNEUS)) for (let d = 0; d <= 1; d += 0.05) for (let t = 0; t <= 1; t += 0.1) {
    const a = F1.aderencia({ composto, desgaste: d, temp: t });
    assert.ok(a.grip >= 0.4 && a.grip <= 2.0 && a.kin >= 0.85 && a.kin <= 1, `${composto} ${d} ${t}`);
  }
  assert.equal(F1.pneuNovo("nada").composto, F1.COMPOSTO_PADRAO);
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
    assert.ok(r.ia.pneu.desgaste > F1.PENHASCO / vida * 0.6 && r.ia.pneu.desgaste <= 1, `${r.ia.pneu.composto}: ${r.ia.pneu.desgaste}`);
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
