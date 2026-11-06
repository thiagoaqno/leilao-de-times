const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../public/corrida/pistas.js');
const R = require('../corrida-robos.js');

for (const regras of ['classica']) test(`volta aprendida não altera os robôs em corrida (${regras})`, () => {
  R.usarFonte(() => []);
  const pista = 'luigi', room = { config: { pista, caixas: false, robos: 2, nivel: 'medio', voltas: 3, regras }, players: {}, order: [], phase: 'race', startAt: Date.now() - 10000, semente: 42 };
  let numero = 0; R.preparar(room, ['#a', '#b'], () => String(numero++));
  room.order.forEach((id, i) => { room.players[id].grid = i; });
  R.largar(room);
  const bots = room.order.map((id) => room.players[id]), perfis = bots.map((p) => p.ia.perfil);
  const pts = T.pontos(T.PISTAS[pista], 6), s = [];
  for (let i = 0; i < pts.length; i += 4) s.push([s.length * 100, pts[i].x - pts[i].ty * 25, pts[i].y + pts[i].tx * 25, pts[i].h, 0, i]);
  assert.equal(R.aprender(pista, { s, carro: 'equilibrado', tempo: s.length / 10, piloto: 'Ana' }), true);
  R.passo(room, 0.05, () => {}, () => {});
  bots.forEach((p, i) => { assert.strictEqual(p.ia.perfil, perfis[i]); assert.equal(p.ia.perfil.aprendeu, false); });
  R.largar(room);
  bots.forEach((p) => assert.equal(p.ia.perfil.aprendeu, true));
  R.usarFonte(() => []);
});
