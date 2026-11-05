const { test } = require('node:test');
const assert = require('node:assert/strict');
const Parados = require('../corrida-parados.js');

test('fantasma continua durante sobreposição e por meio segundo após separar', () => {
  const a = { id: 'a', sim: { c: { x: 0, y: 0, a: 0 } }, fantAte: 3000 };
  const b = { id: 'b', sim: { c: { x: 0, y: 0, a: 0 } }, fantAte: 3000 };
  const room = { phase: 'race', config: { regras: 'f1' }, startAt: 1000, order: ['a', 'b'], players: { a, b } };
  Parados.passo(room, 3000);
  Parados.passo(room, 4000);
  assert.equal(a.fantAte, 4500);
  assert.equal(b.fantAte, 4500);
  b.sim.c.x = 100;
  Parados.passo(room, 4400);
  assert.equal(a.fantAte, 4900);
  Parados.passo(room, 4900);
  assert.equal(a.fantAte, 0);
  assert.equal(b.fantAte, 0);
});
