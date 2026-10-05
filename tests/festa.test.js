// Festa da Galera: cada minijogo, só com robôs, termina no tempo, coloca todo mundo e distribui as moedas.
const test = require("node:test");
const assert = require("node:assert");
const F = require("../public/festa/minijogos.js");

for (const id of F.LISTA) for (const n of [2, 4, 8]) {
  test(`festa: ${id} com ${n} robôs termina e coloca todo mundo`, () => {
    const ids = Array.from({ length: n }, (_, i) => "r" + i), m = F.novo(id, ids);
    let fim = false, passos = 0;
    while (!fim && passos < 60 * 200) { fim = F.passo(m, 1 / 30, ids); passos++; m.ev.length = 0; }
    assert.ok(fim, "terminou");
    assert.ok(m.t <= F.MJ[id].dur + 0.05, `no tempo (${m.t.toFixed(1)} s)`);
    const grupos = F.MJ[id].ranking(m), todos = grupos.flat();
    assert.strictEqual(todos.length, n, `todo mundo no ranking: ${JSON.stringify(grupos)}`);
    assert.strictEqual(new Set(todos).size, n);
    const pr = F.premiar(grupos);
    assert.ok(ids.every((i) => pr[i].moedas >= 1));
    JSON.stringify(F.snap(m)); // o pacote para a tela sai sem erro
  });
}

test("festa: moedas por colocação, empate leva as da melhor posição", () => {
  const p = F.premiar([["a"], ["b", "c"], ["d"]]);
  assert.deepStrictEqual([p.a.moedas, p.b.moedas, p.c.moedas, p.d.moedas], [10, 7, 7, 3]);
});
