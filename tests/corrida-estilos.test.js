const test = require("node:test");
const assert = require("node:assert/strict");
const Estilos = require("../corrida-estilos.js");
const Pilotos = require("../public/corrida/f1-pilotos-2026.js");
const Robos = require("../corrida-robos.js");
const F1 = require("../public/corrida/f1-regras.js");

const medio = { margem: 44, antec: 1, defende: 0.5 };
test("cada piloto tem um perfil próprio e limitado, independente da equipe", () => {
  for (const p of Pilotos.PILOTOS) {
    assert.ok(Estilos.PERFIS[p.id], p.nome);
    const e = Estilos.dePiloto(p.id);
    for (const k of ["ataque", "defesa", "frenagem", "paciencia", "pneus"]) assert.ok(e[k] >= 0 && e[k] <= 1, `${p.nome}: ${k}`);
    assert.ok(["plano", "undercut", "overcut", "oportunista"].includes(e.box));
  }
  const room = { config: { voltas: 5 } };
  const max = Estilos.parametros(room, { piloto: { id: "verstappen" }, equipe: "red-bull" }, medio);
  const maxTransferido = Estilos.parametros(room, { piloto: { id: "verstappen" }, equipe: "ferrari" }, medio);
  const perez = Estilos.parametros(room, { piloto: { id: "perez" } }, medio);
  assert.deepEqual(max, maxTransferido);
  assert.ok(max.ataque > perez.ataque && max.antec > perez.antec);
  assert.ok(perez.desgaste < max.desgaste);
  assert.equal(Estilos.parametros(room, {}, { ...medio, defende: 0 }).defende, 0);
});

test("na decisão do campeonato só o fim de uma etapa decisiva altera a disposição", () => {
  const room = { config: { voltas: 10 }, campeonatoPilotos: { restam: 0, pilotos: [{ id: "verstappen", pontos: 200 }, { id: "norris", pontos: 190 }, { id: "perez", pontos: 100 }] } };
  const max = { piloto: { id: "verstappen" }, laps: 8 }, nor = { piloto: { id: "norris" }, laps: 8 };
  assert.ok(Estilos.pressao(room, max) < 0);
  assert.ok(Estilos.pressao(room, nor) > 0);
  assert.equal(Estilos.pressao(room, { ...nor, laps: 5 }), 0);
  assert.equal(Estilos.pressao(room, { piloto: { id: "perez" }, laps: 8 }), 0);
  assert.equal(Estilos.pressao({ config: room.config }, nor), 0);
  assert.equal(Estilos.pressao({ ...room, campeonatoPilotos: { ...room.campeonatoPilotos, restam: 2 } }, nor), 0);
});

// Reta livre e carro da frente apenas 7 u/s mais lento: o atacante mais disposto tenta,
// o cauteloso espera. A verificação de bandeira amarela e os limites da pista continuam valendo.
function tentativa(id, amarela = false) {
  const n = 1000, pts = Array.from({ length: n }, (_, i) => ({ x: i * 6, y: 0, h: 0, tx: 1, ty: 0 }));
  const pf = { pts, n, c: { vmax: 300 }, kf: new Float32Array(n), linha: { sinal: new Int8Array(n) } };
  const p = { id: "eu", piloto: { id }, pos: { x: 0, y: 0, z: 0 }, laps: 1 };
  const outro = { id: "outro", pos: { x: 108, y: 0, z: 0, v: 93, prog: 18 } };
  const ia = { s: 0, v: 100, lat: 0 };
  const room = { config: { pista: "interlagos", nivel: "medio", voltas: 5 }, order: ["eu", "outro"], players: { eu: p, outro }, direcao: amarela ? { amarelo: {} } : {} };
  Robos.transito(room, p, ia, pf, 0, 0, 40, 100, {});
  return ia.ult;
}
test("os perfis mudam a tentativa de ultrapassagem e respeitam bandeira amarela", () => {
  assert.ok(tentativa("verstappen"));
  assert.equal(tentativa("bottas"), undefined);
  assert.equal(tentativa("verstappen", true), null);
});

test("o fator do piloto altera o desgaste na física sem mudar a entrada do humano", () => {
  const Sim = require("../public/corrida/sim.js"), T = require("../public/corrida/pistas.js");
  const Eq = require("../public/corrida/f1-equipes.js"), tr = Sim.criarPista(T.PISTAS.interlagos, "interlagos");
  const spec = Eq.specDaEquipe("mclaren"), criar = () => {
    const c = Sim.novo(tr, { grid: 0, f1: true, pneu: F1.pneuNovo("medio") });
    c.v = 120; c.vx = Math.cos(c.a) * 120; c.vy = Math.sin(c.a) * 120; return c;
  };
  const humano = criar(), cuidadoso = criar(), amb = { spec, voltas: 5, laps: 0, f1: true, outros: [] };
  Sim.passo(humano, { gas: 1 }, amb, tr, []);
  Sim.passo(cuidadoso, { gas: 1 }, { ...amb, fatorDesgastePneu: 0.96 }, tr, []);
  assert.ok(humano.pneu.desgaste > 0);
  assert.ok(Math.abs(cuidadoso.pneu.desgaste / humano.pneu.desgaste - 0.96) < 1e-8);
});

test("a largada usa a identidade do piloto e a sua estratégia de box", () => {
  const max = { ...Pilotos.PILOTOS.find((p) => p.id === "verstappen"), equipe: "ferrari" };
  const perez = Pilotos.PILOTOS.find((p) => p.id === "perez");
  const room = { config: { pista: "interlagos", regras: "f1", robos: 2, nivel: "medio", voltas: 5 }, players: {}, order: [], phase: "race", startAt: Date.now(), semente: 123, pilotosTemporada: [max, perez] };
  Robos.preparar(room, ["#aaa", "#bbb"], () => "x");
  room.order.forEach((id, i) => { room.players[id].grid = i; });
  Robos.largar(room);
  const a = room.players[room.order[0]], b = room.players[room.order[1]];
  assert.equal(a.piloto.id, "verstappen"); assert.equal(a.equipe, "ferrari");
  assert.equal(a.ia.estiloBox, "undercut"); assert.equal(b.ia.estiloBox, "overcut");
  assert.ok(a.ia.estilo.look < b.ia.estilo.look);
});
