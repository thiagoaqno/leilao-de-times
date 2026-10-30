const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/corrida/pistas.js');
const S = require('../public/corrida/sim.js');
const F1 = require('../public/corrida/f1-regras.js');
const H = require('../corrida-humanos.js');

for (const comRelogio of [true, false]) test(`chegada após travada respeita o tempo real ${comRelogio ? 'com' : 'sem'} relógio do cliente`, () => {
  const inicio = 1000000, p = { id: 'humano', grid: 0, laps: 2, car: 'equilibrado', pneu: 'medio', finish: null, paradas: [] };
  const room = { phase: 'race', startAt: inicio, config: { pista: 'monaco', regras: 'f1', voltas: 3 }, players: { humano: p }, order: ['humano'] };
  const cod = S.empacotar({ gas: 1 });
  H.entrada(room, p, { s: inicio, t0: 0, k: [cod] }, inicio + 20000);
  const c = p.sim.c, tr = p.sim.tr, q = tr.pts[0], x = q.x - q.tx * 0.3, y = q.y - q.ty * 0.3;
  Object.assign(c, { x, y, z: q.h, idx: tr.n - 1, idxAnt: tr.n - 1, sector: 11, sp: { x, y }, a: Math.atan2(q.ty, q.tx), v: 100, vx: q.tx * 100, vy: q.ty * 100, air: false });
  const chegada = inicio + 80000;
  H.entrada(room, p, { s: inicio, t0: 0, k: [cod], ...(comRelogio ? { tt: chegada } : {}) }, chegada);
  let evento = null;
  H.andar(room, chegada, { aoSetor: (r, piloto, s, t) => { if (s === 0) evento = t; return true; }, aoBater: () => false, aoParada() {}, registrar: () => false, mandarAck() {}, mudou() {} });
  assert.notEqual(evento, null, 'cruzou o checkpoint da chegada');
  assert.ok(evento >= chegada - 1500 && evento <= chegada, `tempo ${evento - inicio} ms`);
  const resultado = F1.classificacaoFinal([{ id: 'bot', laps: 3, finish: 55 }, { id: 'humano', laps: 3, finish: (evento - inicio) / 1000 }], 3);
  assert.deepEqual(resultado.map(x => x.id), ['bot', 'humano']);
});
