const test = require("node:test");
const assert = require("node:assert");
const { semanaDe, desafioDaSemana, salasAbertas } = require("../corrida-menu.js");
const T = require("../public/corrida/pistas.js");

const BRASILIA = (a, m, d, h = 0) => Date.UTC(a, m - 1, d, h + 3);

test("o desafio é o mesmo a semana inteira e vira na segunda às 00:00 de Brasília", () => {
  const seg = BRASILIA(2026, 11, 2), dom = BRASILIA(2026, 11, 8, 23);
  assert.strictEqual(new Date(seg).getUTCDay(), 1);
  assert.strictEqual(semanaDe(seg), semanaDe(dom));
  assert.deepStrictEqual(desafioDaSemana(seg), desafioDaSemana(dom));
  assert.strictEqual(semanaDe(BRASILIA(2026, 11, 9)), semanaDe(seg) + 1);
  assert.strictEqual(desafioDaSemana(seg).fim, BRASILIA(2026, 11, 9));
});

test("o desafio sempre aponta para uma pista que existe e troca de uma semana para a outra", () => {
  let antes = null;
  for (let i = 0; i < 40; i++) {
    const d = desafioDaSemana(BRASILIA(2026, 1, 5) + i * 7 * 24 * 3600 * 1000);
    assert.ok(T.PISTAS[d.pista], d.pista);
    assert.notStrictEqual(d.pista, antes);
    antes = d.pista;
  }
});

test("só as salas de Corrida abertas entram na lista do menu", () => {
  const sala = (jogo, estado, code) => ({ jogo, estado, code, max: 8, jogadores: [{ nome: "Bia", host: true }, { nome: "Rui" }] });
  const lista = salasAbertas([sala("corrida", "aberta", "AAAAA"), sala("corrida", "jogando", "BBBBB"), sala("uno", "aberta", "CCCCC")]);
  assert.deepStrictEqual(lista, [{ code: "AAAAA", jogadores: 2, max: 8, dono: "Bia" }]);
});
