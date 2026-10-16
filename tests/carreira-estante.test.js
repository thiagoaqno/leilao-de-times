const { test } = require('node:test');
const assert = require('node:assert/strict');
const { conquistas } = require('../public/carreira/estante');

test('a estante inclui títulos de todos os clubes e não conta duas vezes a temporada arquivada', () => {
  const arquivo = [{ temporada: 1, competicoes: {
    liga: { nome: 'Liga', campeao: 'a' },
    copa: { nome: 'Copa', campeao: 'b' },
  }, tecnicos: [{ clube: 'a' }] }];
  const atual = { liga: { nome: 'Liga', campeao: 'a' }, copa: { nome: 'Copa', campeao: 'b' } };
  const resultado = conquistas(arquivo, atual, 1);
  assert.equal(resultado.get('a').total, 1);
  assert.equal(resultado.get('b').total, 1);
  assert.deepEqual(resultado.get('b').tacas.get('copa').anos, [1]);
});

test('a estante mostra a competição encerrada na temporada atual sem revelar campeões futuros', () => {
  const arquivo = [{ temporada: 1, competicoes: { copa: { nome: 'Copa', campeao: 'a' } } }];
  const atual = {
    copa: { nome: 'Copa', campeao: 'a' },
    liga: { nome: 'Liga', campeao: null },
    mundial: { nome: 'Mundial' },
  };
  const resultado = conquistas(arquivo, atual, 2);
  assert.equal(resultado.get('a').total, 2);
  assert.deepEqual(resultado.get('a').tacas.get('copa').anos, [1, 2]);
  assert.equal(resultado.has(null), false);
  assert.equal(resultado.get('a').tacas.has('liga'), false);
});
