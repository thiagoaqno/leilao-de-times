import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { podePreverContato } from '../public/corrida/contato-cliente.js';
const require = createRequire(import.meta.url), Sim = require('../public/corrida/sim.js');

test('após contato ou entrada no box o navegador deixa de prever novas batidas', () => {
  const carro = { id: 'b', x: 25, y: 0, z: 0, a: 0, vx: 0, vy: 0, r: 0, L: 44, W: 26, massa: 800, finish: null };
  const bater = (outro, eu = {}) => {
    const c = { x: 0, y: 0, x0: -1, y0: 0, z: 0, a: 0, a0: 0, vx: 100, vy: 0, r: 0, tick: 0 };
    const eventos = [];
    if (podePreverContato(eu)) Sim.contatoPasso(c, { L: 44, W: 26, massa: 800 }, podePreverContato(outro) ? [outro] : [], eventos);
    return eventos.length;
  };
  assert.equal(bater(carro), 1);
  assert.equal(bater({ ...carro, fantasma: true }), 0);
  assert.equal(bater({ ...carro, fantBox: true }), 0);
  assert.equal(bater(carro, { fantasma: true }), 0);
  assert.equal(bater(carro, { fantBox: true }), 0);
  assert.equal(bater(carro), 1, 'ao voltar ao normal, o contato volta a valer');
});
