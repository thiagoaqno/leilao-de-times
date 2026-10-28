const test = require('node:test');
const assert = require('node:assert/strict');
const F1 = require('../public/corrida/f1-regras.js');
const T = require('../public/corrida/pistas.js');
const Direcao = require('../corrida-f1-direcao.js');

test('pneu frio e no penhasco piora largada, freio, curva e reta', () => {
  const macio = F1.pneuNovo('macio'), duro = F1.pneuNovo('duro');
  macio.temp = duro.temp = 1;
  const novo = F1.aderencia(macio), duroNovo = F1.aderencia(duro);
  const gasto = F1.aderencia({ ...macio, desgaste: 0.98 });
  const frio = F1.aderencia(F1.pneuNovo('macio'));
  assert.ok(novo.grip > duroNovo.grip && duroNovo.grip > gasto.grip);
  assert.ok(novo.freio > gasto.freio && novo.tracao > gasto.tracao && novo.final > gasto.final);
  assert.ok(frio.tracao < novo.tracao && frio.freio < novo.freio);
});

test('DRS exige menos de um segundo, volta 3 e pista verde; só abre na zona', () => {
  assert.equal(F1.drsHabilitado({ volta: 2, intervalo: 0.7 }), true);
  for (const dados of [{ volta: 1, intervalo: 0.5 }, { volta: 2, intervalo: 1.01 },
    { volta: 2, intervalo: 0.5, safety: true }, { volta: 2, intervalo: 0.5, amarela: true }])
    assert.equal(F1.drsHabilitado(dados), false);
  const z = T.PISTAS.interlagos.drs;
  assert.equal(F1.zonaDRS(2.98, z), 0);
  assert.equal(F1.zonaDRS(3.03, z), 0);
  assert.equal(F1.zonaDRS(3.16, z), -1);
});

test('ERS recarrega por volta, fica entre zero e um e só gasta quando ativo', () => {
  const e = F1.ersNovo();
  for (let i = 0; i < 100; i++) F1.carregarErs(e, 0.1, true, false, 0);
  assert.ok(e.recarga <= F1.ERS_MAX_RECARGA + 1e-8 && e.carga <= 1);
  const recarga = e.recarga;
  F1.carregarErs(e, 1, true, false, 0); assert.equal(e.recarga, recarga);
  F1.carregarErs(e, 0.1, true, false, 1); assert.ok(e.recarga < recarga);
  for (let i = 0; i < 100; i++) F1.gastarErs(e, 0.1, true);
  assert.equal(e.carga, 0); assert.equal(F1.gastarErs(e, 1, true), false);
});

test('direção de prova concede DRS na detecção, sorteia amarela e safety car e pune quatro limites', () => {
  const pts = T.pontos(T.PISTAS.interlagos, 6), n = pts.length, logs = [], log = (s) => logs.push(s);
  const a = { id: 'a', name: 'Ana', finish: null }, b = { id: 'b', name: 'Beto', finish: null };
  const room = { config: { pista: 'interlagos', voltas: 5 }, semente: 42, startAt: 0,
    order: ['a', 'b'], players: { a, b } };
  Direcao.iniciar(room);
  const pos = (pr, lat = 0) => { const p = pts[Math.floor(((pr % 1 + 1) % 1) * n)];
    return { x: p.x - p.ty * lat, y: p.y + p.tx * lat, prog: pr * n, v: 200 }; };
  Direcao.registrar(room, a, pos(2.90), 10000, log);
  Direcao.registrar(room, b, pos(2.89), 10100, log);
  Direcao.registrar(room, a, pos(2.92), 10500, log);
  Direcao.registrar(room, b, pos(2.91), 10900, log);
  assert.equal(b.drsZona, 0);
  a.pos = pos(1.2); b.pos = pos(1.1);
  Direcao.passo(room, 20000, log); assert.ok(room.direcao.amarelo);
  assert.ok(logs.some((s) => s.includes('Bandeira amarela')));
  Direcao.passo(room, 30000, log); assert.equal(room.direcao.amarelo, null);
  assert.ok(room.direcao.scEm > 1.25);
  a.pos = pos(room.direcao.scEm + 0.01); b.pos = pos(room.direcao.scEm - 0.01);
  Direcao.passo(room, 31000, log); assert.ok(room.direcao.safety);
  assert.equal(Direcao.publico(room).limite, 0.54);
  for (let i = 0; i < 4; i++) {
    Direcao.registrar(room, b, pos(2.32 + i * 0.01, 0), 32000 + i * 1000, log);
    Direcao.registrar(room, b, pos(2.325 + i * 0.01, T.PISTAS.interlagos.width / 2 + 35), 32500 + i * 1000, log);
  }
  assert.equal(b.avisosLimite, 4); assert.equal(b.penal, 5);
  Direcao.passo(room, 50000, log); assert.equal(room.direcao.safety, null);
});

test('safety car pode não aparecer em corrida curta', () => {
  const p = { id: 'a', name: 'Ana', finish: null };
  const room = { config: { pista: 'interlagos', voltas: 5 }, semente: 99, startAt: 0,
    order: ['a'], players: { a: p } };
  Direcao.iniciar(room);
  assert.equal(room.direcao.scEm, null);
  p.pos = { prog: room.direcao.pista.length * 4.8 };
  Direcao.passo(room, 10000, () => {});
  assert.equal(room.direcao.safety, null);
});
