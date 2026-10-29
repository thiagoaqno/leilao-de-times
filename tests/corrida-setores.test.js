// A volta não trava por um setor perdido: um aviso à frente do esperado vale quando o carro está mesmo ali (corrida-setores.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../public/corrida/pistas.js");
const { setoresDoAviso, MAX_PULO } = require("../corrida-setores.js");

const n = T.pontos(T.PISTAS.monaco, 6).length;
const ao = (atual, s, idx) => setoresDoAviso(atual, s, idx, n, T.SECTORS, T.checkpoint);
const no = (k, mais = 5) => (T.checkpoint(k, n) + mais) % n; // o carro um pouco depois do portão k

test("o próximo setor vale sempre, com ou sem posição", () => {
  assert.deepEqual(ao(3, 4, no(4)), [4]);
  assert.deepEqual(ao(11, 0, NaN), [0]);
  assert.deepEqual(setoresDoAviso(5, 6, undefined, n, T.SECTORS, T.checkpoint), [6]);
});

test("um setor perdido: o aviso seguinte fecha os dois, se o carro está ali", () => {
  assert.deepEqual(ao(3, 5, no(5)), [4, 5]);
  assert.deepEqual(ao(10, 0, no(0)), [11, 0]); // o 11 se perdeu e a linha de chegada chegou: a volta fecha
  assert.deepEqual(ao(11, 1, no(1)), [0, 1]); // o 0 (a largada) se perdeu: não vira a largada só na volta seguinte
  assert.equal(ao(0, 3, no(3)).length, 3);
});

test("não vale: carro longe do setor, salto grande, setor repetido ou lixo", () => {
  assert.deepEqual(ao(3, 5, no(9)), []); // o carro está do outro lado da pista
  assert.deepEqual(ao(2, 2 + MAX_PULO + 2, no(2 + MAX_PULO + 2)), []); // faltou setor demais
  assert.deepEqual(ao(5, 5, no(5)), []); // o mesmo setor de novo
  assert.deepEqual(ao(5, 4, no(4)), []); // para trás
  assert.deepEqual(ao(5, 99, no(5)), []);
  assert.deepEqual(ao(5, 7, NaN), []); // sem posição não dá para conferir
});

test("a volta de 1 volta em Mônaco fecha mesmo com a largada perdida (o caso da volta que não contava)", () => {
  let sector = 11, started = false, laps = 0;
  const aviso = (s, idx) => { for (const x of ao(sector, s, idx)) { sector = x; if (x === 0) { if (!started) started = true; else laps++; } } };
  // o aviso do setor 0 (a largada) se perdeu; o carro segue: 1 .. 11 e a linha de chegada de novo
  for (let s = 1; s < T.SECTORS; s++) aviso(s, no(s));
  assert.equal(started, true, "o 0 perdido foi fechado pelo 1");
  aviso(0, no(0));
  assert.equal(laps, 1);
});
