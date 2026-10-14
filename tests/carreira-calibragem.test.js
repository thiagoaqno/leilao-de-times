const test = require('node:test');
const assert = require('node:assert/strict');
const Motor = require('../public/carreira/motor.js');
const serieB = require('../public/carreira/base/serieb-2026.js');
const inglaterra = require('../public/carreira/base/inglaterra-2026.js');

const sport = serieB.clubes.find(c => c.id === 'sport');
const city = inglaterra.clubes.find(c => c.id === 'manchester-city');

function amostra(casa, fora, n, calibrada) {
  let gols = 0, goleadas = 0, vitoriasCasa = 0, maximo = 0;
  for (let i = 0; i < n; i++) {
    const placar = Motor.simularPartida({ casa, fora, semente: `calibragem:${i}`, ...(calibrada ? { carreira: true } : {}) }).placar;
    gols += placar[0] + placar[1];
    goleadas += Number(Math.max(...placar) >= 7);
    vitoriasCasa += Number(placar[0] > placar[1]);
    maximo = Math.max(maximo, ...placar);
  }
  return { media: gols / n, goleadas: goleadas / n, vitoriasCasa: vitoriasCasa / n, maximo };
}

test('calibragem da Carreira reduz placares extremos e zebras com elencos reais', () => {
  const antiga = amostra(sport, city, 2500, false);
  const carreira = amostra(sport, city, 2500, true);
  assert.ok(carreira.goleadas < antiga.goleadas / 4, JSON.stringify({ antiga, carreira }));
  assert.ok(carreira.goleadas < 0.005, JSON.stringify(carreira));
  assert.ok(carreira.maximo < 10, JSON.stringify(carreira));
  assert.ok(carreira.vitoriasCasa < antiga.vitoriasCasa, JSON.stringify({ antiga, carreira }));
  assert.ok(carreira.media >= 2 && carreira.media <= 3, JSON.stringify(carreira));
});

test('opção é explícita, determinística e preserva o motor padrão do Road', () => {
  const cfg = { casa: sport, fora: city, semente: 'carreira:replay:42' };
  const padrao = Motor.simularPartida(cfg);
  assert.deepStrictEqual(Motor.simularPartida({ ...cfg, carreira: false }), padrao);
  const carreira = Motor.simularPartida({ ...cfg, carreira: true });
  assert.deepStrictEqual(Motor.simularPartida({ ...cfg, carreira: true }), carreira);
  assert.notDeepStrictEqual(carreira.eventos, padrao.eventos);
  assert.deepStrictEqual(carreira.eventos.filter(e => e.tipo === 'gol').map(e => e.placar).at(-1) || [0, 0], carreira.placar);
});

test('replay da Carreira mantém os lances já vistos após uma decisão', () => {
  const cfg = { casa: sport, fora: city, semente: 'carreira:decisoes:7', carreira: true, modo: 3, controla: 0, decisoes: {} };
  let r = Motor.simularPartida(cfg);
  let paradas = 0;
  while (!r.completo && paradas++ < 40) {
    const anteriores = r.eventos;
    cfg.decisoes[r.parado.id] = Motor.decisaoAutomatica(r.parado);
    r = Motor.simularPartida(cfg);
    assert.deepStrictEqual(r.eventos.slice(0, anteriores.length), anteriores);
  }
  assert.ok(r.completo);
  assert.ok(paradas > 0);
  assert.deepStrictEqual(Motor.simularPartida(cfg), r);
});
