const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../public/corrida/temporada/regras.js');
const G = require('../public/corrida/temporada/grupo-regras.js');
const esperadas = ['melbourne', 'suzuka', 'bahrein', 'jeddah', 'montreal', 'monaco', 'barcelona', 'silverstone', 'spa', 'zandvoort', 'monza', 'baku', 'singapura', 'interlagos', 'lasvegas'];

test('temporada completa reúne todas as pistas refeitas, em ordem, e mantém o formato na próxima temporada', () => {
  const s = R.criar('Ana', 'ferrari', 15, 3, 42);
  assert.deepEqual(s.calendario.map((p) => p.pista), esperadas);
  s.gp = s.tamanho; R.proximaTemporada(s);
  assert.deepEqual(s.calendario.map((p) => p.pista), esperadas);
  assert.equal(s.tamanho, 15);
});

test('temporada em grupo aceita o calendário completo e compartilha as mesmas pistas no ano seguinte', () => {
  const sala = G.criarSala('ABCDE', { id: 'a', nome: 'Ana', tokenHash: 'x' });
  G.escolherEquipe(sala, 'a', 'ferrari'); G.definirOpcoes(sala, 'a', { tamanho: 15 }); G.iniciar(sala, 'a', 42);
  assert.deepEqual(sala.calendario.map((p) => p.pista), esperadas);
  sala.gp = 15; G.proximaTemporada(sala, 'a');
  assert.deepEqual(sala.calendario.map((p) => p.pista), esperadas);
});
