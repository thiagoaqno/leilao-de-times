const test = require("node:test"), assert = require("node:assert/strict");
const Sim = require("../public/corrida/sim.js");
const { simular } = require("../ferramentas/medir-monaco.js");

test("o volante muda de forma mais gradual em duas voltas lançadas", () => {
  const anterior = Sim.passo, nivel = process.env.NIVEL, piloto = process.env.PILOTO;
  let ultimo = null, soma = 0, maximo = 0, amostras = 0;
  process.env.NIVEL = "dificil"; delete process.env.PILOTO;
  Sim.passo = (carro, comandos, ...resto) => {
    if (ultimo !== null) { const delta = Math.abs(comandos.steer - ultimo); soma += delta; maximo = Math.max(maximo, delta); amostras++; }
    ultimo = comandos.steer;
    return anterior(carro, comandos, ...resto);
  };
  try {
    const r = simular({ semente: 951, voltas: 2, renovarPorVolta: false });
    assert.equal(r.tempos.length, 2);
    assert.ok(r.tempos.every(v => v.tempo < 64 && v.fora === 0));
    assert.ok(amostras > 1000);
    assert.ok(soma / amostras < 0.018, `mudança média ${soma / amostras}`);
    assert.ok(maximo < 0.55, `salto máximo ${maximo}`);
  } finally {
    Sim.passo = anterior;
    if (nivel === undefined) delete process.env.NIVEL; else process.env.NIVEL = nivel;
    if (piloto === undefined) delete process.env.PILOTO; else process.env.PILOTO = piloto;
  }
});
