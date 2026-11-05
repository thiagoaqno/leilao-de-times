const test = require("node:test"), assert = require("node:assert/strict");
const { simular } = require("../ferramentas/medir-monaco.js");
const Robos = require("../corrida-robos.js"), Equipes = require("../public/corrida/f1-equipes.js");

test("Mônaco: níveis em duas voltas de macio com a referência", () => {
  const anterior = process.env.NIVEL, piloto = process.env.PILOTO;
  const medias = [];
  try {
    delete process.env.PILOTO;
    for (const nivel of ["facil", "medio", "dificil"]) {
      process.env.NIVEL = nivel;
      const voltas = [951, 952].flatMap(semente => simular({ semente, voltas: 2, renovarPorVolta: false }).tempos);
      assert.equal(voltas.length, 4);
      assert.ok(voltas.every(v => !v.batidas && !v.fora && !v.recuperacoes), nivel);
      medias.push(voltas.reduce((s, v) => s + v.tempo, 0) / voltas.length);
    }
    assert.ok(medias[0] > medias[1] && medias[1] > medias[2], JSON.stringify(medias));
  } finally {
    if (anterior === undefined) delete process.env.NIVEL; else process.env.NIVEL = anterior;
    if (piloto === undefined) delete process.env.PILOTO; else process.env.PILOTO = piloto;
  }
});

test("a linha visual coincide com a referência da McLaren e é única para os bots", () => {
  Robos.usarFonte(() => []);
  const spec = Equipes.specDaEquipe("mclaren"), a = Robos.perfil("monaco", spec, 0), b = Robos.perfil("monaco", spec, 1);
  const linha = Robos.linhaF1Pronta("monaco");
  assert.ok(a.referenciaMonaco && b.referenciaMonaco && linha);
  assert.deepEqual(Array.from(a.lat), Array.from(b.lat));
  for (let i = 0; i < a.n; i++) assert.ok(Math.abs(linha.lat[i] - a.lat[(i + 2) % a.n]) < 0.011);
  const ferrari = Robos.perfil("monaco", Equipes.specDaEquipe("ferrari"));
  assert.equal(ferrari.referenciaMonaco, false);
});
