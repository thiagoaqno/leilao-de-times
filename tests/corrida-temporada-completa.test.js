const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../public/corrida/temporada/regras.js');
const esperadas = ['melbourne', 'xangai', 'suzuka', 'bahrein', 'jeddah', 'miami', 'montreal', 'monaco', 'barcelona', 'redbullring', 'silverstone', 'spa', 'hungaroring', 'zandvoort', 'monza', 'madri', 'baku', 'singapura', 'austin', 'mexico', 'interlagos', 'lasvegas', 'catar', 'abudhabi'];

test('temporada completa reúne todas as pistas refeitas, em ordem, e mantém o formato na próxima temporada', () => {
  const s = R.criar('Ana', 'ferrari', 24, 3, 42);
  assert.deepEqual(s.calendario.map((p) => p.pista), esperadas);
  s.gp = s.tamanho; R.proximaTemporada(s);
  assert.deepEqual(s.calendario.map((p) => p.pista), esperadas);
  assert.equal(s.tamanho, 24);
});
